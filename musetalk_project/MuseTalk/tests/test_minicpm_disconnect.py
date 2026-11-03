import asyncio
from argparse import Namespace
from types import SimpleNamespace

from muse_stream.audio.minicpm import MiniCPMBridgeSession
from muse_stream.state import AppState


class DisconnectedSocket:
    async def accept(self):
        pass

    async def send_json(self, message):
        pass

    async def receive(self):
        return {"type": "websocket.disconnect"}


def test_disconnected_conversation_cannot_replay_queued_tail():
    state = AppState(args=Namespace(input_mode="stream"))
    state.service.ready = True
    state.model.avatar_ready = True
    state.model.avatar = object()
    state.model.runtime = object()
    queued = SimpleNamespace(id=7, is_final=False)
    state.pipeline.segments[7] = queued
    state.pipeline.normal_queue.put(queued)
    session = MiniCPMBridgeSession(state, DisconnectedSocket())
    session.turn_open = True
    session.response_id = "old-reply"
    session.buffer.extend(b"\x01\x00" * 200)

    asyncio.run(session.run())

    assert state.pipeline.normal_queue.empty()
    assert 7 in state.pipeline.canceled_ids
    assert state.pipeline.flush_seq == 1
    assert not state.stream_input.connected
    assert session.buffer == b""
    assert session.flushed_response_id == "old-reply"
