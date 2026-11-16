import asyncio
from pathlib import Path

import pytest

from gateway_modules.avatar_session_api import (
    AvatarSessionError,
    AvatarSessionService,
    _AvatarSessionRuntime,
    _AUDIO_HEADER,
    _AUDIO_MAGIC,
)
from gateway_modules.avatar_bridge import AvatarBridge


DEMO_ROOT = Path(__file__).resolve().parents[1]


class _PresetConfig:
    default_preset_id = "knowledge_host_720p"


class _PresetRegistry:
    def load(self):
        return _PresetConfig()

    def public_item(self, preset_id, avatar_status, owner_id=None):
        assert preset_id == "knowledge_host_720p"
        assert avatar_status["active_avatar_id"] == "knowledge_host_720p"
        return {
            "id": preset_id,
            "name": "知识分享",
            "avatar_id": "knowledge_host_720p",
            "available": True,
            "prompt": {"text": "你是一名知识传播助手"},
        }

    def voice_audio(self, preset_id, owner_id=None):
        assert preset_id == "knowledge_host_720p"
        return {"base64": "AAAA", "name": "voice.wav"}


class _WorkerPool:
    request_timeout = 30


def _service(*, api_key=""):
    service = AvatarSessionService(
        worker_pool=_WorkerPool(),
        preset_registry=_PresetRegistry(),
        bridge_url="ws://127.0.0.1:8000/ws/minicpm",
        avatar_http_url="http://127.0.0.1:8000",
        api_key=api_key,
        ttl_seconds=60,
    )

    async def avatar_status():
        return {"active_avatar_id": "knowledge_host_720p", "avatars": []}

    async def activate(avatar_id):
        assert avatar_id == "knowledge_host_720p"

    service._fetch_avatar_status = avatar_status
    service._activate_avatar = activate
    return service


def test_create_session_resolves_preset_voice_and_prompt() -> None:
    service = _service()

    result = asyncio.run(service.create_session({
        "preset_id": "knowledge_host_720p",
        "metadata": {"tenant_id": "demo"},
    }))

    assert result["session_id"].startswith("avs_")
    assert result["stream_url"].startswith(
        f"/v1/avatar/sessions/{result['session_id']}/stream?token="
    )
    assert result["preset"]["avatar_id"] == "knowledge_host_720p"
    session = service._sessions[result["session_id"]]
    assert session.init_payload["system_prompt"].startswith(
        "Streaming Audio Conversation."
    )
    assert session.init_payload["ref_audio_base64"] == "AAAA"
    assert session.init_payload["config"]["length_penalty"] == 1.1


def test_session_capacity_rejects_second_active_session() -> None:
    service = _service()

    async def scenario():
        first = await service.create_session({})
        session = service._sessions[first["session_id"]]
        session.attached = True
        with pytest.raises(AvatarSessionError) as exc:
            await service.create_session({})
        assert exc.value.status_code == 429
        assert exc.value.code == "session_capacity_exhausted"

    asyncio.run(scenario())


def test_unattached_session_can_be_replaced() -> None:
    service = _service()

    async def scenario():
        first = await service.create_session({})
        second = await service.create_session({})
        assert first["session_id"] != second["session_id"]
        assert list(service._sessions) == [second["session_id"]]

    asyncio.run(scenario())


def test_preset_in_use_tracks_active_sessions() -> None:
    service = _service()

    async def scenario():
        created = await service.create_session({})
        assert await service.is_preset_in_use("knowledge_host_720p")
        service._sessions[created["session_id"]].closed = True
        assert not await service.is_preset_in_use("knowledge_host_720p")

    asyncio.run(scenario())


def test_api_key_is_optional_unless_configured() -> None:
    open_service = _service()
    open_service.require_api_key(None)

    protected = _service(api_key="secret")
    with pytest.raises(AvatarSessionError) as exc:
        protected.require_api_key(None)
    assert exc.value.status_code == 401
    protected.require_api_key("secret")


def test_audio_transport_has_stable_header() -> None:
    packet = _AUDIO_HEADER.pack(_AUDIO_MAGIC, 42) + b"RIFF"
    assert packet[:4] == b"MTA1"
    assert int.from_bytes(packet[4:8], "big") == 42
    assert packet[8:] == b"RIFF"


def test_public_websocket_defaults_to_h264() -> None:
    runtime = _AvatarSessionRuntime.__new__(_AvatarSessionRuntime)
    runtime.session = type("Session", (), {"requested_codec": "auto"})()
    assert runtime._choose_codec(None) == "h264"
    assert runtime._choose_codec([]) == "h264"
    assert runtime._choose_codec(["h264", "webp"]) == "h264"
    assert runtime._choose_codec(["webp"]) == "webp"

    runtime.session.requested_codec = "webp"
    assert runtime._choose_codec(["h264", "webp"]) == "webp"

    runtime.session.requested_codec = "h264"
    assert runtime._choose_codec(["webp"]) == "h264"


def test_bridge_immediate_flush_is_not_duplicated_on_next_force_chunk() -> None:
    bridge = AvatarBridge("ws://127.0.0.1:1/ws/minicpm", label="test")
    bridge.flush("client_interrupt")
    assert bridge.queue.get_nowait() == (
        '{"type": "bridge.flush", "reason": "client_interrupt"}'
    )
    bridge.offer_up(
        '{"type":"input.append","input":{"audio":"x","force_listen":true}}'
    )
    assert bridge.queue.empty()


def test_avatar_v2_page_and_sdk_assets_exist() -> None:
    assert (DEMO_ROOT / "static" / "avatar-v2" / "index.html").is_file()
    assert (DEMO_ROOT / "static" / "avatar-v2" / "app.js").is_file()
    sdk = (DEMO_ROOT / "static" / "sdk" / "avatar-session-client.js").read_text()
    assert "AvatarSessionClient" in sdk
    assert "apiPrefix = '/v1/avatar'" in sdk
    assert "${this.apiPrefix}/sessions" in sdk
    assert "static async deletePreset" in sdk
    assert "input.audio.append" in sdk
    assert "media.ack" in sdk
