"""WebSocket input for MiniCPM-o full-duplex output deltas.

The MiniCPM-o gateway forwards its downlink JSON frames here unchanged.
Audio deltas (base64 float32, 24 kHz mono, ~1 s each) are resampled to
16 kHz PCM16 and cut into frame-aligned windows by ``StreamAudioSession``.
MiniCPM-o drives the turn state:

- a new ``response_id`` starts a turn (first window 20 frames, then 24);
- a ``listen`` delta ends the turn: the tail is flushed and marked final,
  and a following reply queues behind it instead of cutting it off;
- ``bridge.flush`` (client force_listen), or a reply switch without a
  ``listen`` in between, cancels everything without resume.
"""

from __future__ import annotations

import base64
import json
from typing import Any

import numpy as np
from fastapi import WebSocketDisconnect

from ..log import log
from .stream import StreamAudioSession


SOURCE_RATE = 24000
# Leading zeros per turn that cover the soxr HQ stream delay (measured at
# most ~600 samples), so every 1 s input chunk yields at least 16000 output
# samples and each window is cut as soon as its chunk arrives.
RESAMPLE_PAD = 640


class MiniCPMBridgeSession(StreamAudioSession):
    """Translate MiniCPM-o duplex deltas into MuseTalk audio windows."""

    send_acks = False

    def __init__(self, state, websocket) -> None:
        super().__init__(state, websocket)
        self.response_id: str | None = None
        self.last_response_id: str | None = None
        self.flushed_response_id: str | None = None
        self.turn_open = False
        self.resampler = None
        self.turns = 0
        self.flushes = 0

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
                        "type": "bridge_meta",
                        "source_rate": SOURCE_RATE,
                        "sample_rate": self.sample_rate,
                        "first_window_frames": self.first_window_frames,
                        "window_frames": self.window_frames,
                        "context_right_frames": self.context_right_frames,
                    }
                )
                log(
                    "minicpm bridge connected: window_frames="
                    f"{self.first_window_frames}/{self.window_frames} "
                    f"context_frames={self.context_left_frames}/"
                    f"{self.context_right_frames}"
                )
                try:
                    await self._receive_json_loop()
                except WebSocketDisconnect:
                    pass
                finally:
                    # Discard a disconnected conversation instead of replaying its tail.
                    self._barge_in("disconnect")
                    state.stream_input.connected = False
                    log(
                        "minicpm bridge disconnected: "
                        f"turns={self.turns} flushes={self.flushes} "
                        f"windows={state.stream_input.windows_submitted}"
                    )
        finally:
            self._release_avatar_lease()

    async def _receive_json_loop(self) -> None:
        while not self.state.service.exit_requested:
            message = await self.websocket.receive()
            if message.get("type") == "websocket.disconnect":
                raise WebSocketDisconnect()
            text = message.get("text")
            if text is None:
                continue
            try:
                payload = json.loads(text)
            except json.JSONDecodeError:
                await self._send_error("桥接消息不是合法 JSON", code="bad_json")
                continue
            if isinstance(payload, dict):
                await self._handle_message(payload)

    async def _handle_message(self, message: dict[str, Any]) -> None:
        kind = message.get("type")
        if kind == "response.output.delta":
            delta = message.get("kind")
            if delta == "audio":
                await self._on_audio(
                    message.get("response_id"),
                    message.get("audio"),
                )
            elif delta == "listen" and self.turn_open:
                await self._end_turn("listen")
        elif kind == "bridge.flush":
            self._barge_in(str(message.get("reason") or "force_listen"))
        elif kind in ("session.closed", "bridge.reset"):
            await self._end_turn(kind)
        elif kind == "ping":
            await self.websocket.send_json({"type": "pong"})

    async def _on_audio(self, response_id: Any, audio_b64: Any) -> None:
        if not audio_b64:
            return
        if response_id is not None and response_id == self.flushed_response_id:
            # Late chunk of a reply that was already cut off.
            return
        try:
            samples = np.frombuffer(base64.b64decode(audio_b64), dtype="<f4")
        except (ValueError, TypeError):
            await self._send_error("音频增量无法解码", code="bad_audio")
            return
        if not self.turn_open or response_id != self.response_id:
            if self.turn_open:
                # MiniCPM-o switched replies without a listen in between:
                # treat it as a barge-in and drop the unfinished one.
                self._barge_in("new_response")
            self._start_turn(response_id)
        assert self.resampler is not None
        resampled = self.resampler.resample_chunk(samples)
        await self._handle_pcm(self._to_pcm16(resampled))

    def _start_turn(self, response_id: Any) -> None:
        import soxr

        self._reset_windowing()
        self.resampler = soxr.ResampleStream(
            SOURCE_RATE,
            self.sample_rate,
            1,
            dtype="float32",
            quality="HQ",
        )
        self.buffer.extend(bytes(RESAMPLE_PAD * 2))
        self.response_id = response_id
        self.last_response_id = response_id
        self.turn_open = True
        self.turns += 1
        log(f"minicpm turn start: response_id={response_id}")

    async def _end_turn(self, reason: str) -> None:
        if not self.turn_open:
            return
        if self.resampler is not None:
            tail = self.resampler.resample_chunk(
                np.zeros(0, dtype=np.float32),
                last=True,
            )
            if tail.size:
                await self._handle_pcm(self._to_pcm16(tail))
        await self._flush(final=True)
        # The worker stops holding frames after the final window.
        if self.last_segment is not None:
            self.last_segment.is_final = True
        log(
            f"minicpm turn end ({reason}): response_id={self.response_id} "
            f"frames={self.frames_submitted}"
        )
        self.turn_open = False
        self.response_id = None
        self.resampler = None

    def _barge_in(self, reason: str) -> None:
        self.flushed_response_id = self.response_id or self.last_response_id
        self._reset_windowing()
        self.turn_open = False
        self.response_id = None
        self.resampler = None
        self.flushes += 1
        self.segments.flush_all(reason)

    def _reset_windowing(self) -> None:
        self.buffer.clear()
        self.left_context = bytearray(self.context_left_bytes)
        self.frames_submitted = 0
        self.samples_submitted = 0
        self.last_segment = None

    @staticmethod
    def _to_pcm16(samples: np.ndarray) -> bytes:
        clipped = np.clip(samples, -1.0, 1.0)
        return (clipped * 32767.0).astype("<i2").tobytes()
