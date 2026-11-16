from __future__ import annotations

import asyncio
import importlib.util
import sys
from pathlib import Path

import httpx
from fastapi.testclient import TestClient


APP_DIR = Path(__file__).resolve().parents[1]


def _load_module():
    spec = importlib.util.spec_from_file_location(
        "minimal_platform_app_ws",
        APP_DIR / "app.py",
    )
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


platform_app = _load_module()


class FakeUpstream:
    def __init__(self) -> None:
        self.queue: asyncio.Queue = asyncio.Queue()
        self.sent = []
        self.closed = False

    async def send(self, message) -> None:
        self.sent.append(message)
        await self.queue.put(message)

    def __aiter__(self):
        return self

    async def __anext__(self):
        item = await self.queue.get()
        if item is None:
            raise StopAsyncIteration
        return item

    async def close(self) -> None:
        self.closed = True
        await self.queue.put(None)


def test_websocket_proxy_preserves_text_and_binary(monkeypatch) -> None:
    upstream = FakeUpstream()
    captured = {}

    async def fake_connect(url, **kwargs):
        captured["url"] = url
        captured["kwargs"] = kwargs
        return upstream

    monkeypatch.setattr(platform_app.websockets, "connect", fake_connect)
    settings = platform_app.Settings(
        avatar_api_base_url="https://avatar.internal:8006",
        avatar_api_key="secret",
    )
    app = platform_app.create_app(
        settings,
        transport=httpx.MockTransport(lambda request: httpx.Response(500)),
    )

    with TestClient(app) as client:
        with client.websocket_connect(
            "/api/avatar/sessions/avs_test123/stream?token=session-token"
        ) as websocket:
            websocket.send_text('{"type":"session.start"}')
            assert websocket.receive_text() == '{"type":"session.start"}'
            websocket.send_bytes(b"\x00\x01\x02")
            assert websocket.receive_bytes() == b"\x00\x01\x02"

    assert captured["url"] == (
        "wss://avatar.internal:8006/v1/avatar/sessions/"
        "avs_test123/stream?token=session-token"
    )
    assert captured["kwargs"]["compression"] is None
    assert upstream.closed is True


def test_websocket_proxy_requires_token() -> None:
    app = platform_app.create_app(
        platform_app.Settings(
            avatar_api_base_url="https://avatar.internal:8006",
        )
    )
    with TestClient(app) as client:
        with client.websocket_connect(
            "/api/avatar/sessions/avs_test123/stream"
        ) as websocket:
            message = websocket.receive_json()
            assert message["code"] == "missing_session_token"
