"""Low-latency H.264 Annex-B encoding through an ffmpeg subprocess."""

from __future__ import annotations

import concurrent.futures
import os
import select
import shutil
import subprocess
import threading
from dataclasses import dataclass
from typing import Callable

import numpy as np

from ..config import ROOT
from ..log import log


@dataclass(frozen=True)
class EncodedH264Frame:
    data: bytes
    keyframe: bool


class AnnexBAccessUnitParser:
    """Split an Annex-B byte stream into access units using AUD NAL units."""

    _AUD = 9
    _IDR = 5

    def __init__(self) -> None:
        self.buffer = bytearray()

    @staticmethod
    def _start_codes(data: bytes | bytearray) -> list[tuple[int, int]]:
        codes: list[tuple[int, int]] = []
        index = 0
        size = len(data)
        while index + 3 <= size:
            if data[index:index + 4] == b"\x00\x00\x00\x01":
                codes.append((index, 4))
                index += 4
            elif data[index:index + 3] == b"\x00\x00\x01":
                codes.append((index, 3))
                index += 3
            else:
                index += 1
        return codes

    def feed(self, data: bytes) -> list[EncodedH264Frame]:
        self.buffer.extend(data)
        frames: list[EncodedH264Frame] = []
        while True:
            codes = self._start_codes(self.buffer)
            aud_offsets = [
                offset
                for offset, prefix in codes
                if offset + prefix < len(self.buffer)
                and self.buffer[offset + prefix] & 0x1F == self._AUD
            ]
            if len(aud_offsets) < 2:
                break
            cut = aud_offsets[1]
            unit = bytes(self.buffer[:cut])
            del self.buffer[:cut]
            frames.append(
                EncodedH264Frame(
                    data=unit,
                    keyframe=self._has_idr(unit),
                )
            )
        return frames

    def flush(self) -> EncodedH264Frame | None:
        if not self.buffer:
            return None
        unit = bytes(self.buffer)
        self.buffer.clear()
        return EncodedH264Frame(data=unit, keyframe=self._has_idr(unit))

    def _has_idr(self, unit: bytes) -> bool:
        return any(
            offset + prefix < len(unit)
            and unit[offset + prefix] & 0x1F == self._IDR
            for offset, prefix in self._start_codes(unit)
        )


def _ffmpeg_binary() -> str:
    configured = os.environ.get("AVATAR_FFMPEG_BIN", "").strip()
    if configured:
        return configured
    found = shutil.which("ffmpeg")
    if found:
        return found
    bundled = ROOT / "ffmpeg-4.4-amd64-static" / "ffmpeg"
    if bundled.exists():
        return str(bundled)
    raise FileNotFoundError("ffmpeg executable not found for H.264 encoder")


class FFmpegH264Encoder:
    """Stateful ffmpeg/libx264 encoder with ordered access-unit completion."""

    def __init__(
        self,
        *,
        width: int,
        height: int,
        fps: int,
        on_error: Callable[[str], None],
    ) -> None:
        if width % 2 or height % 2:
            raise ValueError(
                f"H.264 yuv420p requires even dimensions, got {width}x{height}"
            )
        self.width = width
        self.height = height
        self.fps = fps
        self.on_error = on_error
        self.parser = AnnexBAccessUnitParser()
        self.pending: list[concurrent.futures.Future[EncodedH264Frame]] = []
        self.pending_lock = threading.Lock()
        self.stdin_lock = threading.Lock()
        self.closed = False
        self.error_reported = False

        bitrate = os.environ.get("AVATAR_H264_BITRATE", "2M")
        maxrate = os.environ.get("AVATAR_H264_MAXRATE", "3M")
        bufsize = os.environ.get("AVATAR_H264_BUFSIZE", "2M")
        preset = os.environ.get("AVATAR_H264_PRESET", "ultrafast")
        gop = max(1, int(os.environ.get("AVATAR_H264_GOP", "120")))
        profile = os.environ.get("AVATAR_H264_PROFILE", "main")
        level = os.environ.get("AVATAR_H264_LEVEL", "4.0")

        command = [
            _ffmpeg_binary(),
            "-hide_banner",
            "-loglevel",
            "error",
            "-f",
            "rawvideo",
            "-pix_fmt",
            "bgr24",
            "-s",
            f"{width}x{height}",
            "-r",
            str(fps),
            "-i",
            "pipe:0",
            "-an",
            "-c:v",
            "libx264",
            "-preset",
            preset,
            "-tune",
            "zerolatency",
            "-profile:v",
            profile,
            "-level:v",
            level,
            "-g",
            str(gop),
            "-keyint_min",
            str(gop),
            "-sc_threshold",
            "0",
            "-x264-params",
            "repeat-headers=1:sliced-threads=1:sync-lookahead=0",
            "-b:v",
            bitrate,
            "-maxrate",
            maxrate,
            "-bufsize",
            bufsize,
            "-pix_fmt",
            "yuv420p",
            "-bsf:v",
            "h264_metadata=aud=insert",
            "-flush_packets",
            "1",
            "-f",
            "h264",
            "pipe:1",
        ]
        self.process = subprocess.Popen(
            command,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            bufsize=0,
        )
        self.reader = threading.Thread(
            target=self._read_output,
            name="avatar-h264-reader",
            daemon=True,
        )
        self.stderr_reader = threading.Thread(
            target=self._read_stderr,
            name="avatar-h264-stderr",
            daemon=True,
        )
        self.reader.start()
        self.stderr_reader.start()
        log(
            f"H.264 encoder started: {width}x{height}@{fps} "
            f"bitrate={bitrate} maxrate={maxrate} gop={gop} "
            f"preset={preset} profile={profile} level={level}"
        )

    def submit(self, frame: np.ndarray) -> concurrent.futures.Future[EncodedH264Frame]:
        future: concurrent.futures.Future[EncodedH264Frame] = (
            concurrent.futures.Future()
        )
        if frame.shape[0] != self.height or frame.shape[1] != self.width:
            raise ValueError(
                f"frame shape {frame.shape[:2]} does not match "
                f"{self.height}x{self.width}"
            )
        contiguous = np.ascontiguousarray(frame, dtype=np.uint8)
        with self.pending_lock:
            if self.closed:
                raise RuntimeError("H.264 encoder is closed")
            self.pending.append(future)
        try:
            with self.stdin_lock:
                assert self.process.stdin is not None
                self.process.stdin.write(contiguous.tobytes())
                self.process.stdin.flush()
        except Exception:
            with self.pending_lock:
                try:
                    self.pending.remove(future)
                except ValueError:
                    pass
            raise
        return future

    def close(self) -> None:
        with self.pending_lock:
            if self.closed:
                return
            self.closed = True
        try:
            if self.process.stdin is not None:
                self.process.stdin.close()
        except OSError:
            pass
        self.reader.join(timeout=5)
        try:
            self.process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            self.process.kill()
            self.process.wait(timeout=2)
        self.stderr_reader.join(timeout=2)

    def _complete(self, unit: EncodedH264Frame) -> None:
        with self.pending_lock:
            future = self.pending.pop(0) if self.pending else None
        if future is not None and not future.done():
            future.set_result(unit)

    def _read_output(self) -> None:
        try:
            assert self.process.stdout is not None
            output_fd = self.process.stdout.fileno()
            while True:
                readable, _, _ = select.select([output_fd], [], [], 0.03)
                if not readable:
                    quiet_unit = self.parser.flush()
                    if quiet_unit is not None:
                        self._complete(quiet_unit)
                    continue
                chunk = os.read(output_fd, 8192)
                if not chunk:
                    break
                for unit in self.parser.feed(chunk):
                    self._complete(unit)
            final = self.parser.flush()
            if final is not None:
                self._complete(final)
            with self.pending_lock:
                pending = len(self.pending)
            if pending:
                self._fail(
                    f"H.264 encoder ended with {pending} incomplete frame(s)"
                )
        except Exception as exc:
            self._fail(f"H.264 output reader failed: {exc}")

    def _read_stderr(self) -> None:
        try:
            assert self.process.stderr is not None
            for raw in self.process.stderr:
                line = raw.decode("utf-8", errors="replace").strip()
                if line:
                    log(f"ffmpeg h264: {line}")
        except Exception:
            pass

    def _fail(self, message: str) -> None:
        if self.error_reported:
            return
        self.error_reported = True
        with self.pending_lock:
            pending = list(self.pending)
            self.pending.clear()
        for future in pending:
            if not future.done():
                future.set_exception(RuntimeError(message))
        self.on_error(message)


"""One H.264 access unit per frame, with no delayed/B frames."""

from fractions import Fraction
import os

import av


H264_PREFIX = b"H264"


class H264Encoder:
    def __init__(self, width: int, height: int, fps: int):
        self.width, self.height, self.fps = width, height, fps
        self.codec = None
        self.last_index = None
        self.last_segment = None
        self.last_flush = None

    def encode(self, image, *, index: int, segment: int, flush: int):
        # A fresh IDR includes SPS/PPS. Never reference a canceled frame or a
        # prior timeline after an interrupt or reconnect. Normal segments share references.
        reset = (
            self.codec is None
            or flush != self.last_flush
            or index != self.last_index + 1
        )
        if reset:
            codec = av.CodecContext.create("libx264", "w")
            codec.width, codec.height = self.width, self.height
            codec.pix_fmt = "yuv420p"
            codec.time_base = Fraction(1, self.fps)
            codec.framerate = Fraction(self.fps, 1)
            codec.thread_count = 4
            codec.options = {
                "preset": os.environ.get("AVATAR_H264_PRESET", "veryfast"),
                "tune": "zerolatency",
                "crf": os.environ.get("AVATAR_H264_CRF", "20"),
                "profile": "high",
                "level": "4.0",
                "x264-params": (
                    f"keyint={max(1, int(os.environ.get('AVATAR_H264_GOP', self.fps * 2)))}:min-keyint=1:scenecut=0:bframes=0:"
                    "repeat-headers=1:aud=1:vbv-maxrate=3000:vbv-bufsize=1500"
                ),
            }
            codec.open()
            self.codec = codec
        frame = av.VideoFrame.from_ndarray(image, format="bgr24")
        frame.pts = index
        packets = self.codec.encode(frame)
        if len(packets) != 1:
            raise RuntimeError(f"Low-latency H.264 must output one packet per frame: {len(packets)}")
        packet = packets[0]
        self.last_index, self.last_segment, self.last_flush = index, segment, flush
        return H264_PREFIX + bytes([int(packet.is_keyframe)]) + bytes(packet)
