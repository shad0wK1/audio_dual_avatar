"""WebSocket PCM input and fixed-frame window aggregation."""

from __future__ import annotations

import asyncio
import json
import math
import time
from typing import Any

import numpy as np
from fastapi import WebSocket, WebSocketDisconnect

from ..domain import LiveSegment
from ..log import log
from ..state import AppState
from .segments import SegmentManager


class StreamAudioSession:
    """Receive 16 kHz mono PCM16 and submit frame-aligned audio windows."""

    # Reply with audio_ack after every submitted window.
    send_acks = True

    def __init__(self, state: AppState, websocket: WebSocket) -> None:
        self.state = state
        self.websocket = websocket
        self.args = state.args
        self.sample_rate = state.stream_input.sample_rate
        self.window_frames = int(
            getattr(self.args, "stream_window_frames", state.model.batch_size)
        )
        self.first_window_frames = int(
            getattr(self.args, "stream_first_window_frames", self.window_frames)
        )
        # Core windows end on frame boundaries counted from the stream start,
        # so window lengths never drift from the video frame clock.
        self.response_id: str | None = None
        self.leading_pad_samples = 0
        self.frames_submitted = 0
        self.samples_submitted = 0
        self.window_samples = max(1, self._frame_sample(self.window_frames))
        self.window_bytes = self.window_samples * 2
        self.context_left_ms = float(
            getattr(self.args, "stream_context_left_ms", 0.0)
        )
        self.context_right_ms = float(
            getattr(self.args, "stream_context_right_ms", 0.0)
        )
        self.context_left_frames = int(
            round(self.context_left_ms * state.model.fps / 1000.0)
        )
        self.context_right_frames = int(
            round(self.context_right_ms * state.model.fps / 1000.0)
        )
        # Round context up so left + core + right never floors to one frame
        # fewer than requested in audio analysis.
        self.context_left_samples = math.ceil(
            self.context_left_frames * self.sample_rate / state.model.fps
        )
        self.context_right_samples = math.ceil(
            self.context_right_frames * self.sample_rate / state.model.fps
        )
        self.context_left_bytes = self.context_left_samples * 2
        self.context_right_bytes = self.context_right_samples * 2
        self.left_context = bytearray(self.context_left_bytes)
        self.overlap_frames = int(
            getattr(self.args, "stream_overlap_frames", 0)
        )
        self.pause_overlap_frames = int(
            getattr(self.args, "stream_pause_overlap_frames", 0)
        )
        self.max_buffer_bytes = int(
            self.sample_rate
            * 2
            * float(getattr(self.args, "stream_max_buffer_seconds", 5.0))
        )
        self.buffer = bytearray()
        self.window_index = 0
        self.started = False
        self.cancelled = False
        self.last_segment: LiveSegment | None = None
        self.segments = SegmentManager(state)

    def _frame_sample(self, frame: int) -> int:
        """Sample index of a frame boundary on the stream timeline."""
        return int(round(frame * self.sample_rate / self.state.model.fps))

    def _reserve_avatar_lease(self) -> bool:
        model = self.state.model
        with model.avatar_admission_lock:
            if not model.avatar_ready or model.avatar_switching:
                return False
            model.avatar_leases += 1
            return True

    def _release_avatar_lease(self) -> None:
        model = self.state.model
        with model.avatar_admission_lock:
            model.avatar_leases = max(0, model.avatar_leases - 1)

    def _next_window(self) -> tuple[int, int]:
        """Return (core_frames, core_bytes) of the next full window."""
        core_frames = (
            self.first_window_frames
            if self.frames_submitted == 0
            else self.window_frames
        )
        core_samples = (
            self._frame_sample(self.frames_submitted + core_frames)
            - self.samples_submitted
        )
        return core_frames, max(1, core_samples) * 2

    async def _admit(self) -> bool:
        """Accept the socket; reject it unless this upstream may stream now."""
        state = self.state
        await self.websocket.accept()
        if state.args is None:
            await self._send_error(
                "服务尚未配置",
                code="not_configured",
                status=state.service.status,
            )
            await self.websocket.close(code=1013)
            return False
        if state.args.input_mode not in ("stream", "hybrid"):
            await self._send_error(
                "当前配置未启用流式音频输入",
                code="stream_disabled",
            )
            await self.websocket.close(code=1008)
            return False
        if not state.service.ready or not state.service.accepting_streams:
            await self._send_error(
                "服务尚未就绪",
                code="not_ready",
                status=state.service.status,
            )
            await self.websocket.close(code=1013)
            return False
        if not state.model.avatar_ready:
            await self._send_error(
                "数字人形象正在切换，请稍后重试",
                code=(
                    "avatar_switching"
                    if state.model.avatar_switching
                    else "avatar_unavailable"
                ),
                status=state.service.status,
            )
            await self.websocket.close(code=1013)
            return False
        if state.stream_input.lock.locked() or state.stream_input.connected:
            await self._send_error(
                "已有音频上行连接",
                code="stream_busy",
            )
            await self.websocket.close(code=1013)
            return False
        return True

    async def run(self) -> None:
        state = self.state
        if not await self._admit():
            return
        if not self._reserve_avatar_lease():
            await self._send_error(
                "数字人形象正在切换，请稍后重试",
                code="avatar_switching",
            )
            await self.websocket.close(code=1013)
            return

        try:
            async with state.stream_input.lock:
                state.stream_input.connected = True
                state.stream_input.samples_received = 0
                state.stream_input.windows_submitted = 0
                state.stream_input.dropped_samples = 0
                await self.websocket.send_json(
                    {
                        "type": "audio_meta",
                        "sample_rate": self.sample_rate,
                        "channels": 1,
                        "format": "s16le",
                        "window_frames": self.window_frames,
                        "first_window_frames": self.first_window_frames,
                        "window_samples": self.window_samples,
                        "window_ms": round(
                            self.window_samples * 1000 / self.sample_rate,
                            3,
                        ),
                        "context_left_ms": self.context_left_ms,
                        "context_right_ms": self.context_right_ms,
                        "context_left_frames": self.context_left_frames,
                        "context_right_frames": self.context_right_frames,
                        "overlap_frames": self.overlap_frames,
                        "pause_overlap_frames": self.pause_overlap_frames,
                        "pause_boundary_frames": int(
                            getattr(
                                self.args,
                                "stream_pause_boundary_frames",
                                0,
                            )
                        ),
                        "max_pending_windows": (
                            self.args.stream_max_pending_windows
                        ),
                    }
                )
                log(
                    f"audio stream connected: window_frames="
                    f"{self.first_window_frames}/{self.window_frames} "
                    f"window_samples={self.window_samples} "
                    f"context_frames={self.context_left_frames}/"
                    f"{self.context_right_frames} "
                    f"overlap={self.overlap_frames}/"
                    f"{self.pause_overlap_frames}"
                )
                try:
                    await self._receive_loop()
                finally:
                    if self.cancelled:
                        dropped = len(self.buffer) // 2
                        self.state.stream_input.dropped_samples += dropped
                        self.buffer.clear()
                        log(
                            "audio stream cancelled: "
                            f"dropped_buffered_samples={dropped}"
                        )
                    else:
                        await self._flush(final=True)
                    # Whatever ended this upstream, its last window closes the
                    # answer: the inference worker stops holding frames after it.
                    if self.last_segment is not None:
                        self.last_segment.is_final = True
                    state.stream_input.connected = False
                    log(
                        "audio stream disconnected: "
                        f"samples={state.stream_input.samples_received} "
                        f"windows={state.stream_input.windows_submitted} "
                        f"dropped={state.stream_input.dropped_samples}"
                    )
        finally:
            self._release_avatar_lease()

    async def _receive_loop(self) -> None:
        while not self.state.service.exit_requested:
            message = await self.websocket.receive()
            message_type = message.get("type")
            if message_type == "websocket.disconnect":
                raise WebSocketDisconnect()
            text = message.get("text")
            if text is not None:
                if await self._handle_control(text):
                    return
                continue
            data = message.get("bytes")
            if data:
                await self._handle_pcm(data)

    async def _handle_control(self, text: str) -> bool:
        try:
            message = json.loads(text)
        except json.JSONDecodeError:
            await self._send_error("音频控制消息不是合法 JSON", code="bad_json")
            return False
        kind = message.get("type")
        if kind == "audio_start":
            sample_rate = int(message.get("sample_rate", self.sample_rate))
            channels = int(message.get("channels", 1))
            audio_format = str(message.get("format", "s16le")).lower()
            if (
                sample_rate != self.sample_rate
                or channels != 1
                or audio_format != "s16le"
            ):
                await self._send_error(
                    "音频格式必须为 16000 Hz、单声道、s16le",
                    code="unsupported_audio_format",
                )
                return True
            self.started = True
            await self.websocket.send_json(
                {"type": "audio_started", "sample_rate": self.sample_rate}
            )
            return False
        if kind == "audio_end":
            await self._flush(final=True)
            await self.websocket.send_json(
                {
                    "type": "audio_done",
                    "samples": self.state.stream_input.samples_received,
                    "windows": self.state.stream_input.windows_submitted,
                }
            )
            return True
        if kind in ("audio_cancel", "audio_abort"):
            # The upstream aborted this answer (for example after an
            # interrupt). Do not submit a partial window: doing so would look
            # like new audio and cancel the interrupt/resume timer.
            self.cancelled = True
            dropped = len(self.buffer) // 2
            self.buffer.clear()
            self.state.stream_input.dropped_samples += dropped
            await self.websocket.send_json(
                {
                    "type": "audio_cancelled",
                    "samples": self.state.stream_input.samples_received,
                    "windows": self.state.stream_input.windows_submitted,
                    "dropped_samples": dropped,
                }
            )
            return True
        if kind == "ping":
            await self.websocket.send_json({"type": "pong"})
            return False
        await self._send_error(
            f"未知音频控制消息: {kind}",
            code="unknown_message",
        )
        return False

    async def _handle_pcm(self, data: bytes) -> None:
        if not data:
            return
        if len(data) % 2:
            data = data[:-1]
        if not data:
            return
        self.started = True
        self.state.ingest.last_audio_seen = time.monotonic()
        self.state.stream_input.last_chunk_at = time.monotonic()
        self.state.stream_input.samples_received += len(data) // 2
        self.buffer.extend(data)
        if len(self.buffer) > self.max_buffer_bytes:
            drop_bytes = len(self.buffer) - self.max_buffer_bytes
            drop_bytes -= drop_bytes % 2
            del self.buffer[:drop_bytes]
            self.state.stream_input.dropped_samples += drop_bytes // 2
        while True:
            core_frames, core_bytes = self._next_window()
            if len(self.buffer) < core_bytes + self.context_right_bytes:
                break
            core_raw = bytes(self.buffer[:core_bytes])
            right_raw = bytes(
                self.buffer[core_bytes : core_bytes + self.context_right_bytes]
            )
            del self.buffer[:core_bytes]
            await self._submit_window(core_raw, right_raw, core_frames)
            self._advance_left_context(core_raw)

    def _advance_left_context(self, core_raw: bytes) -> None:
        if self.context_left_bytes <= 0:
            self.left_context.clear()
            return
        combined = bytes(self.left_context) + core_raw
        self.left_context = bytearray(
            combined[-self.context_left_bytes :]
        )

    async def _submit_window(
        self,
        core_raw: bytes,
        right_raw: bytes = b"",
        core_frames: int | None = None,
    ) -> None:
        state = self.state
        max_pending = int(self.args.stream_max_pending_windows)
        next_status = time.monotonic() + 1
        while (
            self.segments.queued_count() >= max_pending
            and not state.interrupt.active
            and not state.service.exit_requested
        ):
            # The MiniCPM bridge normally receives no window ACKs. While a
            # full queue blocks receive(), a write also detects a closed peer
            # and lets the session release the input lock and discard its tail.
            if not self.send_acks and time.monotonic() >= next_status:
                await self.websocket.send_json({"type": "queue_status", "queued_windows": max_pending})
                next_status = time.monotonic() + 1
            await asyncio.sleep(0.05)
        if state.service.exit_requested:
            return

        context_raw = bytes(self.left_context) + core_raw + right_raw
        samples = (
            np.frombuffer(context_raw, dtype="<i2").astype(np.float32)
            / 32768.0
        )
        core_sample_count = len(core_raw) // 2
        if core_frames is None:
            core_frames = max(
                1,
                int(
                    math.floor(
                        core_sample_count
                        * self.state.model.fps
                        / self.sample_rate
                    )
                ),
            )
        self.frames_submitted += core_frames
        self.samples_submitted += core_sample_count
        source_name = f"stream_{self.window_index:06d}.wav"
        segment = await asyncio.to_thread(
            self.segments.register_samples,
            samples,
            self.sample_rate,
            source_name,
            len(self.left_context) // 2,
            core_sample_count,
            self.context_left_frames,
            core_frames,
            self.overlap_frames,
            self.pause_overlap_frames,
            self.response_id,
            self.samples_submitted - core_sample_count - self.leading_pad_samples,
        )
        self.window_index += 1
        if segment is None:
            await self._send_error(
                "音频窗口处理失败",
                code="window_failed",
            )
            return
        self.last_segment = segment
        state.stream_input.windows_submitted += 1
        if not self.send_acks:
            return
        await self.websocket.send_json(
            {
                "type": "audio_ack",
                "samples": state.stream_input.samples_received,
                "windows": state.stream_input.windows_submitted,
                "buffered_samples": len(self.buffer) // 2,
                "queued_windows": self.segments.queued_count(),
            }
        )

    async def _flush(self, final: bool = False, *, phrase_end: bool = False) -> None:
        if len(self.buffer) < 2:
            return
        frame_samples = math.ceil(self.sample_rate / self.state.model.fps)

        # At end-of-stream there is no full right context left. Flush complete
        # core windows with whatever tail audio is available.
        while True:
            core_frames, core_bytes = self._next_window()
            if len(self.buffer) < core_bytes:
                break
            core_raw = bytes(self.buffer[:core_bytes])
            right_raw = bytes(
                self.buffer[core_bytes : core_bytes + self.context_right_bytes]
            )
            del self.buffer[:core_bytes]
            await self._submit_window(core_raw, right_raw, core_frames)
            self._advance_left_context(core_raw)

        remaining_samples = len(self.buffer) // 2
        if phrase_end and remaining_samples:
            # Send every real sample now, including a sub-frame tail. Round the
            # cumulative video clock, then let _next_window realign the next
            # full window. The zeros supply analysis context only, never audio.
            end_frame = round((self.samples_submitted + remaining_samples)
                              * self.state.model.fps / self.sample_rate)
            frames = max(1, end_frame - self.frames_submitted)
            core_raw = bytes(self.buffer)
            self.buffer.clear()
            await self._submit_window(core_raw, bytes(frame_samples * 2), frames)
            self._advance_left_context(core_raw)
            return
        if remaining_samples < frame_samples:
            self.state.stream_input.dropped_samples += remaining_samples
            self.buffer.clear()
            return
        core_frames = max(
            1,
            int(
                math.floor(
                    remaining_samples
                    * self.state.model.fps
                    / self.sample_rate
                )
            ),
        )
        sample_count = min(
            remaining_samples,
            math.ceil(
                core_frames * self.sample_rate / self.state.model.fps
            ),
        )
        byte_count = sample_count * 2
        if byte_count <= 0:
            return
        core_raw = bytes(self.buffer[:byte_count])
        del self.buffer[:byte_count]
        await self._submit_window(core_raw, b"", core_frames)
        self._advance_left_context(core_raw)
        if final and len(self.buffer) // 2 < frame_samples:
            self.state.stream_input.dropped_samples += len(self.buffer) // 2
            self.buffer.clear()

    async def _send_error(
        self,
        message: str,
        code: str,
        **extra: Any,
    ) -> None:
        payload = {"type": "error", "code": code, "message": message}
        payload.update(extra)
        try:
            await self.websocket.send_json(payload)
        except Exception:
            pass
