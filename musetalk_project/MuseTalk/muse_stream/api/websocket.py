"""WebSocket transport for live video frames and control messages."""

from __future__ import annotations

import asyncio
import os
import threading
import time
import traceback
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from ..audio.segments import InterruptManager
from ..inference.workers import live_encode_worker, live_infer_worker
from ..log import log
from ..protocol import FRAME_HEADER, frame_pts_us
from ..state import AppState


router = APIRouter()


class LiveStreamSession:
    """Own all per-viewer queues, ACK state and worker threads."""

    def __init__(self, state: AppState, websocket: WebSocket) -> None:
        self.state = state
        self.websocket = websocket
        self.args = state.args
        self.network_queue: asyncio.Queue | None = None
        self.raw_queue: asyncio.Queue | None = None
        self.stop = threading.Event()
        self.encoder: threading.Thread | None = None
        self.inference: threading.Thread | None = None
        self.acked_frame = -1
        self.last_sent_frame = -1
        self.credit_event = asyncio.Event()
        self.ack_stop = asyncio.Event()
        self.viewer_gone = asyncio.Event()
        self.control_messages: list[dict[str, Any]] = []
        self.max_prefetch_frames = 0
        self.flush_seq = state.pipeline.flush_seq
        default_format = os.environ.get("AVATAR_STREAM_FORMAT", "h264").lower()
        requested_format = (
            websocket.query_params.get("video_codec", "")
            or websocket.query_params.get("codec", "")
            or default_format
        ).lower()
        self.stream_format = (
            requested_format
            if requested_format in ("h264", "h264_annexb", "webp", "jpeg")
            else default_format
        )

    async def run(self) -> None:
        state = self.state
        await self.websocket.accept()
        if (
            not state.service.ready
            or not state.model.avatar_ready
            or state.model.avatar is None
            or state.model.runtime is None
        ):
            await self.websocket.send_json(
                {
                    "type": "error",
                    "message": "服务尚未就绪",
                    "status": state.service.status,
                    "detail": state.service.error,
                    "code": (
                        "avatar_switching"
                        if state.model.avatar_switching
                        else "avatar_unavailable"
                    ),
                }
            )
            await self.websocket.close(code=1013)
            return
        if (
            not state.service.accepting_streams
            or state.service.exit_requested
        ):
            await self.websocket.send_json(
                {"type": "error", "message": "直播已结束，服务正在自动关闭"}
            )
            await self.websocket.close(code=1013)
            return
        if (
            state.viewer.stream_lock.locked()
            or state.viewer.connected
        ):
            await self.websocket.send_json(
                {
                    "type": "error",
                    "message": "已有直播观众连接，当前仅支持单观众",
                }
            )
            await self.websocket.close(code=1013)
            return

        with state.model.avatar_admission_lock:
            avatar_available = (
                state.model.avatar_ready
                and not state.model.avatar_switching
            )
            if avatar_available:
                state.model.avatar_leases += 1
        if not avatar_available:
            await self.websocket.send_json(
                {
                    "type": "error",
                    "code": "avatar_switching",
                    "message": "数字人形象正在切换，请稍后重试",
                }
            )
            await self.websocket.close(code=1013)
            return

        try:
            async with state.viewer.stream_lock:
                await self._run_session()
        finally:
            with state.model.avatar_admission_lock:
                state.model.avatar_leases = max(
                    0,
                    state.model.avatar_leases - 1,
                )

    async def _run_session(self) -> None:
        state = self.state
        args = self.args
        assert args is not None
        loop = asyncio.get_running_loop()
        self.network_queue = asyncio.Queue(maxsize=state.model.queue_size)
        self.raw_queue = asyncio.Queue(
            maxsize=max(16, args.batch_size * 2)
        )
        self.encoder = threading.Thread(
            target=live_encode_worker,
            args=(
                state,
                self.raw_queue,
                self.network_queue,
                loop,
                self.stop,
                self.stream_format,
            ),
            daemon=True,
        )
        self.inference = threading.Thread(
            target=live_infer_worker,
            args=(state, self.raw_queue, loop, self.stop),
            daemon=True,
        )

        state.viewer.connected = True
        state.viewer.connect_time = time.monotonic()
        state.viewer.playback_started = False
        state.viewer.last_ack_time = time.monotonic()
        state.pipeline.ack_frame = -1
        state.pipeline.media_ack_frame = -1
        self.max_prefetch_frames = max(
            state.model.prebuffer,
            int(state.model.fps * args.max_prefetch_seconds),
        )

        ack_task = asyncio.create_task(self._ack_reader())
        log("live viewer connected")

        try:
            await self.websocket.send_json(
                {
                    "type": "meta",
                    "fps": state.model.fps,
                    "codec": "h264" if self.stream_format in ("h264", "h264_annexb") else self.stream_format,
                    "prebuffer": state.model.prebuffer,
                    "max_prefetch_seconds": args.max_prefetch_seconds,
                    "idle_timeout_seconds": args.idle_timeout_seconds,
                    "interrupt_wait_seconds": args.interrupt_wait_seconds,
                    "interrupt_resume_mode": args.interrupt_resume_mode,
                    "input_mode": args.input_mode,
                    "audio_dir": args.audio_dir,
                    "frame_header_bytes": FRAME_HEADER.size,
                    "clock": "audio-samples",
                    "width": state.model.width,
                    "height": state.model.height,
                    "video_codec": (
                        "h264"
                        if self.stream_format in ("h264", "h264_annexb")
                        else self.stream_format
                    ),
                    "codec_string": os.environ.get(
                        "AVATAR_H264_CODEC_STRING",
                        "avc1.640028" if os.environ.get("AVATAR_H264_BACKEND", "pyav") != "ffmpeg" else "avc1.4D4028",
                    ),
                }
            )
            assert self.encoder is not None and self.inference is not None
            assert self.network_queue is not None
            self.encoder.start()
            self.inference.start()

            while True:
                if self.viewer_gone.is_set():
                    # The ACK reader saw the socket close; an idle stream
                    # may never send again to notice it here.
                    log("client disconnected")
                    break
                await self._send_controls()
                if state.service.exit_requested:
                    await self.websocket.send_json(
                        {
                            "type": "live_end",
                            "reason": "idle_timeout",
                            "message": state.service.exit_reason,
                        }
                    )
                    break
                try:
                    item = await asyncio.wait_for(
                        self.network_queue.get(),
                        timeout=0.2,
                    )
                except asyncio.TimeoutError:
                    continue

                # A flush may occur while awaiting the queue. Send its
                # control before the first IDR from the new generation.
                await self._send_controls()
                kind = item[0]
                if kind == "error":
                    await self.websocket.send_json(
                        {
                            "type": "error",
                            "message": "数字人推理或编码线程异常",
                            "detail": item[1],
                        }
                    )
                    break
                if kind == "segment":
                    segment = item[1]
                    if segment.id in state.pipeline.canceled_ids:
                        continue
                    await self.websocket.send_json(
                        {
                            "type": "segment",
                            "id": segment.id,
                            "duration": round(segment.duration, 3),
                            "total_frames": segment.total_frames,
                            "start_frame": segment.global_start_frame,
                            "start_pts_us": frame_pts_us(
                                segment.global_start_frame,
                                state.model.fps,
                            ),
                            "sample_count": segment.sample_count,
                            "sample_rate": segment.sample_rate,
                            "speech_frames": segment.speech_frames,
                            "silent_frames": (
                                segment.total_frames - segment.speech_frames
                            ),
                            "analysis_frames": segment.analysis_frames,
                            "frame_offset": segment.frame_offset,
                            "extra_frames": segment.extra_frames,
                            "pause_boundary": segment.pause_boundary,
                            "audio_url": f"/api/live/audio/{segment.id}",
                            "source": segment.source_path.name,
                            "priority": segment.priority == 0,
                            "resume": segment.is_resume,
                            "origin_id": segment.origin_id,
                        }
                    )
                    continue
                if kind == "segment_end":
                    if item[1] in state.pipeline.canceled_ids:
                        continue
                    await self.websocket.send_json(
                        {"type": "segment_end", "segment_id": item[1]}
                    )
                    continue
                if kind != "frame":
                    continue

                (
                    _,
                    frame_kind,
                    segment_id,
                    pts_us,
                    frame_index,
                    packet,
                    *generation,
                ) = item
                if segment_id in state.pipeline.canceled_ids or (
                    generation and generation[0] != state.pipeline.flush_seq
                ):
                    continue
                while (
                    self.last_sent_frame - self.acked_frame
                    >= self.max_prefetch_frames
                ):
                    await self._send_controls()
                    self.credit_event.clear()
                    if (
                        self.last_sent_frame - self.acked_frame
                        < self.max_prefetch_frames
                    ):
                        break
                    try:
                        await asyncio.wait_for(
                            self.credit_event.wait(),
                            timeout=0.5,
                        )
                    except asyncio.TimeoutError:
                        pass
                    if state.service.exit_requested or self.viewer_gone.is_set():
                        break
                if (
                    state.service.exit_requested
                    or self.viewer_gone.is_set()
                    or segment_id in state.pipeline.canceled_ids
                    or (generation and generation[0] != state.pipeline.flush_seq)
                ):
                    continue
                await self.websocket.send_bytes(packet)
                self.last_sent_frame = max(
                    self.last_sent_frame,
                    frame_index,
                )
                if (frame_index + 1) % 500 == 0:
                    log(
                        f"sent frame_index={frame_index} pts={pts_us}us "
                        f"kind={frame_kind} acked={self.acked_frame} "
                        f"queue={self.network_queue.qsize()}"
                    )
        except WebSocketDisconnect:
            log("client disconnected")
        except Exception:
            log(traceback.format_exc())
        finally:
            self.ack_stop.set()
            self.stop.set()
            ack_task.cancel()
            try:
                await ack_task
            except asyncio.CancelledError:
                pass
            for frame_queue in (self.raw_queue, self.network_queue):
                if frame_queue is None:
                    continue
                try:
                    while True:
                        frame_queue.get_nowait()
                except asyncio.QueueEmpty:
                    pass
            if self.inference is not None:
                self.inference.join(timeout=3)
            if self.encoder is not None:
                self.encoder.join(timeout=3)
            state.viewer.connected = False
            state.viewer.playback_started = False
            log("live viewer disconnected")

    def _drop_queued_frames(self) -> None:
        for frame_queue in (self.raw_queue, self.network_queue):
            if frame_queue is None:
                continue
            kept = []
            try:
                while True:
                    item = frame_queue.get_nowait()
                    if item[0] in ("raw", "frame"):
                        if len(item) > 6 and item[-1] == self.state.pipeline.flush_seq:
                            kept.append(item)
                    elif item[0] == "segment":
                        if item[1].id not in self.state.pipeline.canceled_ids:
                            kept.append(item)
                    elif item[0] == "segment_end":
                        if item[1] not in self.state.pipeline.canceled_ids:
                            kept.append(item)
                    elif item[0] == "error":
                        kept.append(item)
            except asyncio.QueueEmpty:
                pass
            # New-generation IDRs may already be queued when the control
            # loop notices a flush. Keep them so decoder/credit cannot deadlock.
            for item in kept:
                frame_queue.put_nowait(item)

    async def _send_controls(self) -> None:
        state = self.state
        if state.pipeline.flush_seq != self.flush_seq:
            self.flush_seq = state.pipeline.flush_seq
            flush_frame = state.pipeline.flush_frame
            self._drop_queued_frames()
            self.acked_frame = flush_frame
            self.last_sent_frame = flush_frame
            self.control_messages.append(
                {"type": "flush", "frame_index": flush_frame}
            )
            self.credit_event.set()
        while self.control_messages:
            await self.websocket.send_json(self.control_messages.pop(0))

    async def _ack_reader(self) -> None:
        state = self.state
        interrupts = InterruptManager(state)
        while not self.ack_stop.is_set():
            try:
                message = await self.websocket.receive_json()
            except WebSocketDisconnect:
                self.viewer_gone.set()
                return
            except Exception:
                self.viewer_gone.set()
                return
            kind = message.get("type")
            if kind == "ready":
                state.viewer.playback_started = True
                state.viewer.last_ack_time = time.monotonic()
                self.credit_event.set()
                log("viewer entered the live room")
            elif kind == "ack":
                try:
                    frame_index = int(message.get("frame_index"))
                except (TypeError, ValueError):
                    continue
                if frame_index >= 0:
                    self.acked_frame = max(self.acked_frame, frame_index)
                    state.pipeline.ack_frame = max(
                        state.pipeline.ack_frame,
                        frame_index,
                    )
                    if message.get("kind") != "idle":
                        state.pipeline.media_ack_frame = max(
                            state.pipeline.media_ack_frame,
                            frame_index,
                        )
                    state.viewer.playback_started = True
                    if message.get("kind") != "idle":
                        state.viewer.last_ack_time = time.monotonic()
                    self.credit_event.set()
            elif kind == "interrupt":
                try:
                    segment_id = int(message.get("segment_id"))
                    global_frame = int(message.get("frame_index"))
                except (TypeError, ValueError):
                    continue
                info = interrupts.begin(segment_id, global_frame)
                if info is None:
                    self.control_messages.append(
                        {
                            "type": "interrupt_ack",
                            "ok": False,
                            "message": "没有找到可打断的语音段",
                        }
                    )
                elif not info.get("ok"):
                    self.control_messages.append(
                        {
                            "type": "interrupt_ack",
                            "ok": False,
                            "message": info.get("message", "打断失败"),
                        }
                    )
                else:
                    self.acked_frame = global_frame
                    self.last_sent_frame = global_frame
                    state.pipeline.ack_frame = global_frame
                    state.pipeline.media_ack_frame = global_frame
                    self._drop_queued_frames()
                    self.control_messages.append(
                        {
                            "type": "interrupt_ack",
                            "ok": True,
                            "segment_id": info["segment_id"],
                            "frame": info["frame"],
                            "local_frame": info["local_frame"],
                            "wait_seconds": info["wait_seconds"],
                            "mode": info["mode"],
                        }
                    )
                    state.viewer.last_ack_time = time.monotonic()
                    self.credit_event.set()


@router.websocket("/ws/live")
async def live_stream(websocket: WebSocket) -> None:
    session = LiveStreamSession(
        websocket.app.state.stream_state,
        websocket,
    )
    await session.run()
