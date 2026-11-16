from __future__ import annotations

import asyncio
import struct
import threading
import time
from argparse import Namespace
from types import SimpleNamespace

import numpy as np
import pytest

from muse_stream.domain import LiveSegment
from muse_stream.api.websocket import LiveStreamSession
from muse_stream.inference import workers
from muse_stream.protocol import (
    FRAME_HEADER,
    FRAME_SILENT,
    H264_FRAME_HEADER,
    H264_FRAME_MAGIC,
    VIDEO_FLAG_KEYFRAME,
)
from muse_stream.state import AppState


class EventLoopThread:
    def __init__(self) -> None:
        self.loop = asyncio.new_event_loop()
        self.thread = threading.Thread(target=self._run, daemon=True)
        self.thread.start()

    def _run(self) -> None:
        asyncio.set_event_loop(self.loop)
        self.loop.run_forever()
        self.loop.close()

    def submit(self, coroutine):
        return asyncio.run_coroutine_threadsafe(coroutine, self.loop)

    def close(self) -> None:
        self.loop.call_soon_threadsafe(self.loop.stop)
        self.thread.join(timeout=2)


async def _new_queue(maxsize: int) -> asyncio.Queue:
    return asyncio.Queue(maxsize=maxsize)


def test_parallel_encoding_preserves_frame_and_control_order(monkeypatch) -> None:
    monkeypatch.setenv("AVATAR_ENCODE_THREADS", "4")
    monkeypatch.setenv("AVATAR_STREAM_FORMAT", "webp")
    monkeypatch.setenv("AVATAR_STREAM_MAX_WIDTH", "0")

    active = 0
    max_active = 0
    active_lock = threading.Lock()

    def fake_imencode(extension, frame, params):
        nonlocal active, max_active
        with active_lock:
            active += 1
            max_active = max(max_active, active)
        try:
            # Different completion times force the thread pool to finish out
            # of submission order.
            time.sleep(0.02 - int(frame[0, 0, 0]) * 0.001)
            marker = struct.pack(">I", int(frame[0, 0, 0]))
            return True, np.frombuffer(marker, dtype=np.uint8)
        finally:
            with active_lock:
                active -= 1

    monkeypatch.setattr(workers.cv2, "imencode", fake_imencode)

    loop_thread = EventLoopThread()
    raw_queue = loop_thread.submit(_new_queue(64)).result(timeout=2)
    network_queue = loop_thread.submit(_new_queue(64)).result(timeout=2)
    stop = threading.Event()
    state = AppState(
        args=Namespace(jpeg_quality=88),
    )
    segment = LiveSegment(
        id=7,
        source_path=None,
        wav_path=None,
        duration=0.5,
        total_frames=12,
        global_start_frame=0,
        speech_frames=12,
    )
    encoder_thread = threading.Thread(
        target=workers.live_encode_worker,
        args=(
            state,
            raw_queue,
            network_queue,
            loop_thread.loop,
            stop,
        ),
        daemon=True,
    )

    try:
        encoder_thread.start()
        loop_thread.submit(raw_queue.put(("segment", segment))).result(timeout=2)
        frame_indices = list(range(100, 112))
        for index in frame_indices:
            frame = np.full((8, 8, 3), index - 100, dtype=np.uint8)
            loop_thread.submit(
                raw_queue.put(
                    (
                        "raw",
                        FRAME_SILENT,
                        segment.id,
                        index * 1000,
                        index,
                        frame,
                    )
                )
            ).result(timeout=2)
        loop_thread.submit(
            raw_queue.put(("segment_end", segment.id))
        ).result(timeout=2)

        received = []
        while True:
            item = loop_thread.submit(network_queue.get()).result(timeout=5)
            received.append(item)
            if item[0] == "segment_end":
                break
            if item[0] == "error":
                pytest.fail(item[1])

        assert received[0][0] == "segment"
        assert received[-1] == ("segment_end", segment.id)
        frames = received[1:-1]
        assert len(frames) == len(frame_indices)
        assert [item[4] for item in frames] == frame_indices
        assert [
            FRAME_HEADER.unpack_from(item[5])[4]
            for item in frames
        ] == frame_indices
        assert all(item[6] == state.pipeline.flush_seq for item in frames)
        assert max_active >= 2
    finally:
        stop.set()
        encoder_thread.join(timeout=5)
        loop_thread.close()

    assert not encoder_thread.is_alive()


def test_h264_encoding_preserves_packets_and_keyframe_flags(monkeypatch) -> None:
    monkeypatch.setenv("AVATAR_STREAM_FORMAT", "h264")
    monkeypatch.setenv("AVATAR_H264_GOP", "6")

    loop_thread = EventLoopThread()
    raw_queue = loop_thread.submit(_new_queue(64)).result(timeout=2)
    network_queue = loop_thread.submit(_new_queue(64)).result(timeout=2)
    stop = threading.Event()
    state = AppState(
        args=Namespace(jpeg_quality=88, fps=24),
    )
    state.model.width = 128
    state.model.height = 128
    segment = LiveSegment(
        id=9,
        source_path=None,
        wav_path=None,
        duration=0.5,
        total_frames=12,
        global_start_frame=0,
        speech_frames=12,
    )
    encoder_thread = threading.Thread(
        target=workers.live_encode_worker,
        args=(
            state,
            raw_queue,
            network_queue,
            loop_thread.loop,
            stop,
        ),
        kwargs={"stream_format": "h264"},
        daemon=True,
    )

    try:
        encoder_thread.start()
        loop_thread.submit(raw_queue.put(("segment", segment))).result(timeout=2)
        frame_indices = list(range(12))
        for index in frame_indices:
            frame = np.full((128, 128, 3), index * 15, dtype=np.uint8)
            loop_thread.submit(
                raw_queue.put(
                    (
                        "raw",
                        FRAME_SILENT,
                        segment.id,
                        index * 41667,
                        index,
                        frame,
                    )
                )
            ).result(timeout=2)
        loop_thread.submit(
            raw_queue.put(("segment_end", segment.id))
        ).result(timeout=2)

        received = []
        while True:
            item = loop_thread.submit(network_queue.get()).result(timeout=10)
            received.append(item)
            if item[0] == "segment_end":
                break
            if item[0] == "error":
                pytest.fail(item[1])

        packets = received[1:-1]
        assert len(packets) == len(frame_indices)
        assert [item[4] for item in packets] == frame_indices
        decoded_headers = [
            H264_FRAME_HEADER.unpack_from(item[5])
            for item in packets
        ]
        assert all(header[0] == H264_FRAME_MAGIC for header in decoded_headers)
        assert decoded_headers[0][3] & VIDEO_FLAG_KEYFRAME
        assert decoded_headers[6][3] & VIDEO_FLAG_KEYFRAME
        assert all(item[6] == state.pipeline.flush_seq for item in packets)
    finally:
        stop.set()
        encoder_thread.join(timeout=10)
        loop_thread.close()

    assert not encoder_thread.is_alive()


def test_h264_flush_barrier_skips_canceled_frame_before_new_idr(
    monkeypatch,
) -> None:
    monkeypatch.setenv("AVATAR_STREAM_FORMAT", "h264")
    monkeypatch.setenv("AVATAR_H264_GOP", "6")

    loop_thread = EventLoopThread()
    raw_queue = loop_thread.submit(_new_queue(64)).result(timeout=2)
    network_queue = loop_thread.submit(_new_queue(64)).result(timeout=2)
    stop = threading.Event()
    state = AppState(
        args=Namespace(jpeg_quality=88, fps=24),
    )
    state.model.width = 128
    state.model.height = 128
    old_segment = LiveSegment(
        id=20,
        source_path=None,
        wav_path=None,
        duration=0.5,
        total_frames=12,
        global_start_frame=0,
        speech_frames=12,
    )
    new_segment = LiveSegment(
        id=21,
        source_path=None,
        wav_path=None,
        duration=0.5,
        total_frames=12,
        global_start_frame=0,
        speech_frames=12,
    )
    encoder_thread = threading.Thread(
        target=workers.live_encode_worker,
        args=(
            state,
            raw_queue,
            network_queue,
            loop_thread.loop,
            stop,
        ),
        kwargs={"stream_format": "h264"},
        daemon=True,
    )

    def put(item) -> None:
        loop_thread.submit(raw_queue.put(item)).result(timeout=2)

    def get(timeout: float = 10):
        return loop_thread.submit(network_queue.get()).result(timeout=timeout)

    try:
        encoder_thread.start()
        put(("segment", old_segment))
        put(
            (
                "raw",
                FRAME_SILENT,
                old_segment.id,
                0,
                0,
                np.zeros((128, 128, 3), dtype=np.uint8),
            )
        )
        assert get()[0] == "segment"
        initial_frame = get()
        assert H264_FRAME_HEADER.unpack_from(initial_frame[5])[3] & VIDEO_FLAG_KEYFRAME

        with state.pipeline.lock:
            state.pipeline.flush_seq = 1
            state.pipeline.canceled_ids.add(old_segment.id)

        # This frame was queued before the flush. The encoder must not consume
        # the new encoder's IDR while encoding it.
        put(
            (
                "raw",
                FRAME_SILENT,
                old_segment.id,
                1000,
                1,
                np.full((128, 128, 3), 20, dtype=np.uint8),
            )
        )
        put(("segment", new_segment))
        for index in range(2, 8):
            put(
                (
                    "raw",
                    FRAME_SILENT,
                    new_segment.id,
                    index * 41667,
                    index,
                    np.full((128, 128, 3), index * 20, dtype=np.uint8),
                )
            )
        put(("segment_end", new_segment.id))

        # The worker must not restart the H.264 encoder until the transport
        # has sent the matching flush control message.
        time.sleep(0.15)
        assert network_queue.qsize() == 0

        with state.pipeline.lock:
            state.pipeline.flush_sent_seq = 1

        received = []
        while True:
            item = get()
            received.append(item)
            if item[0] == "segment_end":
                break
            if item[0] == "error":
                pytest.fail(item[1])

        frames = [item for item in received if item[0] == "frame"]
        assert frames
        assert all(item[2] == new_segment.id for item in frames)
        assert all(item[6] == 1 for item in frames)
        first_header = H264_FRAME_HEADER.unpack_from(frames[0][5])
        assert first_header[3] & VIDEO_FLAG_KEYFRAME
    finally:
        stop.set()
        encoder_thread.join(timeout=10)
        loop_thread.close()

    assert not encoder_thread.is_alive()


def test_live_session_selects_codec_from_viewer_query() -> None:
    state = AppState()
    session = LiveStreamSession(
        state,
        SimpleNamespace(query_params={"video_codec": "webp"}),
    )
    assert session.stream_format == "webp"

    session = LiveStreamSession(
        state,
        SimpleNamespace(query_params={"video_codec": "h264"}),
    )
    assert session.stream_format == "h264"
