import asyncio
from types import SimpleNamespace

from muse_stream.api.websocket import LiveStreamSession
from muse_stream.protocol import pack_frame
from muse_stream.state import AppState


def test_replay_keeps_keyframe_order_and_does_not_advance_playback_ack():
    async def scenario():
        packets = []
        controls = []
        async def send_bytes(packet):
            packets.append(packet)
        async def send_json(message):
            controls.append(message)
        state = AppState()
        socket = SimpleNamespace(query_params={}, send_bytes=send_bytes, send_json=send_json)
        session = LiveStreamSession(state, socket)
        key = pack_frame(1, 1, 0, 0, b"H264\x01key")
        delta = pack_frame(1, 1, 41667, 1, b"H264\x00delta")
        session._remember_video_packet(key)
        session._remember_video_packet(delta)
        session.resync_requested = True
        await session._send_controls()
        assert packets == [key, delta]
        assert controls == [{"type": "video_resync", "replayed": 2}]
        assert session.acked_frame == -1
        assert session.last_sent_frame == -1
        assert state.pipeline.flush_seq == 0
        assert not session.resync_requested
    asyncio.run(scenario())


def test_flush_cannot_replay_a_previous_conversation():
    async def scenario():
        packets = []
        async def send_bytes(packet):
            packets.append(packet)
        async def send_json(message):
            pass
        state = AppState()
        socket = SimpleNamespace(query_params={}, send_bytes=send_bytes, send_json=send_json)
        session = LiveStreamSession(state, socket)
        session._remember_video_packet(pack_frame(1, 1, 0, 0, b"H264\x01old-key"))
        session.resync_requested = True
        state.pipeline.flush_seq = 1
        state.pipeline.flush_frame = -1
        await session._send_controls()
        assert not packets
        assert not session.replay_packets
    asyncio.run(scenario())


def test_future_keyframe_does_not_evict_unplayed_video_history():
    state = AppState()
    session = LiveStreamSession(state, SimpleNamespace(query_params={}))
    session.acked_frame = 4
    packets = []
    for index in range(8):
        payload = b"H264" + bytes([int(index in (0, 6))]) + b"video"
        packet = pack_frame(1, 1, index * 41667, index, payload)
        packets.append(packet)
        session._remember_video_packet(packet)
    assert session.replay_packets == packets

    session.acked_frame = 7
    tail = pack_frame(1, 1, 8 * 41667, 8, b"H264\x00video")
    session._remember_video_packet(tail)
    assert session.replay_packets == packets[6:] + [tail]


def test_mth1_keyframe_flag_is_supported_by_replay_cache():
    state = AppState()
    session = LiveStreamSession(state, SimpleNamespace(query_params={}))
    packet = bytearray(pack_frame(1, 1, 0, 0, b"annex-b-video"))
    packet[:4] = b"MTH1"
    packet[5] = 1
    packet[6] = 1
    session._remember_video_packet(bytes(packet))
    assert session.replay_packets == [bytes(packet)]
