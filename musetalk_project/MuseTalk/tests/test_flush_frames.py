import asyncio
from types import SimpleNamespace

from muse_stream.api.websocket import LiveStreamSession
from muse_stream.state import AppState


def test_flush_keeps_new_idr_and_segment_while_discarding_stale_idle_frames():
    async def scenario():
        messages = []
        async def send_json(message):
            messages.append(message)
        state = AppState()
        socket = SimpleNamespace(query_params={}, send_json=send_json)
        session = LiveStreamSession(state, socket)
        session.raw_queue = asyncio.Queue()
        session.network_queue = asyncio.Queue()
        stale = ("frame", 0, 0xffffffff, 0, 0, b"old-idr", 0)
        current = ("frame", 0, 0xffffffff, 0, 0, b"new-idr", 1)
        raw = ("raw", 0, 0xffffffff, 0, 0, None, 1)
        segment = ("segment", SimpleNamespace(id=4))
        for item in (stale, current, segment):
            session.network_queue.put_nowait(item)
        session.raw_queue.put_nowait(raw)
        state.pipeline.flush_seq = 1
        state.pipeline.flush_frame = -1

        await session._send_controls()

        assert messages == [{"type": "flush", "frame_index": -1}]
        assert session.network_queue.get_nowait() == current
        assert session.network_queue.get_nowait() == segment
        assert session.network_queue.empty()
        assert session.raw_queue.get_nowait() == raw
    asyncio.run(scenario())
