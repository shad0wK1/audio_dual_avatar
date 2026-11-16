from __future__ import annotations

from argparse import Namespace
from types import SimpleNamespace

import numpy as np
import pytest
from fastapi.testclient import TestClient

from muse_stream.api.app import create_app
from muse_stream.avatar_registry import (
    AvatarBusyError,
    AvatarActivationError,
    AvatarCacheInfo,
    activate_avatar,
    inspect_avatar_cache,
    list_avatar_caches,
)
from muse_stream.models import cache_dir_for
from muse_stream.state import AppState


def _require_cache(avatar_id: str) -> None:
    if not cache_dir_for(avatar_id, "v15").is_dir():
        pytest.skip(f"local avatar cache is unavailable: {avatar_id}")


def _state() -> AppState:
    state = AppState(
        args=Namespace(version="v15", batch_size=28),
    )
    state.service.ready = True
    state.model.runtime = SimpleNamespace()
    state.model.default_avatar_id = "gril_v2"
    return state


def test_existing_local_avatar_caches_are_discoverable() -> None:
    _require_cache("gril_v2")
    _require_cache("musetalk_test_avatar")

    caches = list_avatar_caches("v15", "gril_v2")
    by_id = {cache.id: cache for cache in caches}

    assert by_id["gril_v2"].valid
    assert by_id["gril_v2"].width == 768
    assert by_id["gril_v2"].height == 1344
    assert by_id["gril_v2"].frame_count == 690

    assert by_id["musetalk_test_avatar"].valid
    assert by_id["musetalk_test_avatar"].width == 480
    assert by_id["musetalk_test_avatar"].height == 864
    assert by_id["musetalk_test_avatar"].frame_count == 690
    assert caches[0].id == "gril_v2"


def test_unknown_cache_is_reported_invalid() -> None:
    info = inspect_avatar_cache("does-not-exist", "v15")
    assert not info.valid
    assert "not found" in (info.error or "").lower()


def test_activation_uses_named_cache_and_default_fallback(monkeypatch) -> None:
    _require_cache("gril_v2")
    _require_cache("musetalk_test_avatar")
    state = _state()
    loaded: list[str] = []

    def fake_load(args, runtime, avatar_id):
        loaded.append(avatar_id)
        size = (864, 480, 3) if avatar_id == "musetalk_test_avatar" else (1344, 768, 3)
        return SimpleNamespace(frame_list_cycle=[np.zeros(size, dtype=np.uint8)])

    monkeypatch.setattr(
        "muse_stream.avatar_registry.load_cached_avatar",
        fake_load,
    )

    selected = activate_avatar(state, "musetalk_test_avatar")
    assert selected.id == "musetalk_test_avatar"
    assert state.model.avatar_id == "musetalk_test_avatar"
    assert state.model.avatar_revision == 1
    assert (state.model.width, state.model.height) == (480, 864)

    selected = activate_avatar(state, None)
    assert selected.id == "gril_v2"
    assert state.model.avatar_id == "gril_v2"
    assert state.model.avatar_revision == 2
    assert (state.model.width, state.model.height) == (768, 1344)
    assert loaded == ["musetalk_test_avatar", "gril_v2"]


def test_activation_rejects_switch_while_viewer_is_connected(monkeypatch) -> None:
    _require_cache("gril_v2")
    _require_cache("musetalk_test_avatar")
    state = _state()
    state.model.avatar_id = "gril_v2"
    state.model.avatar = SimpleNamespace(
        frame_list_cycle=[np.zeros((1344, 768, 3), dtype=np.uint8)]
    )
    state.model.avatar_ready = True
    state.viewer.connected = True

    monkeypatch.setattr(
        "muse_stream.avatar_registry.load_cached_avatar",
        lambda *args: pytest.fail("must not load while viewer is connected"),
    )

    with pytest.raises(AvatarBusyError):
        activate_avatar(state, "musetalk_test_avatar")

    assert state.model.avatar_id == "gril_v2"


def test_same_avatar_is_idempotent_even_with_viewer(monkeypatch) -> None:
    _require_cache("gril_v2")
    state = _state()
    state.model.avatar_id = "gril_v2"
    state.model.avatar = SimpleNamespace(
        frame_list_cycle=[np.zeros((1344, 768, 3), dtype=np.uint8)]
    )
    state.model.avatar_ready = True
    state.model.avatar_revision = 7
    state.viewer.connected = True

    monkeypatch.setattr(
        "muse_stream.avatar_registry.load_cached_avatar",
        lambda *args: pytest.fail("same avatar must not be reloaded"),
    )

    info = activate_avatar(state, "gril_v2")
    assert info.valid
    assert state.model.avatar_revision == 7


def test_avatar_http_api_lists_and_selects_cache(monkeypatch) -> None:
    _require_cache("gril_v2")
    _require_cache("musetalk_test_avatar")
    state = _state()
    state.model.avatar_id = "gril_v2"
    state.model.avatar = SimpleNamespace(
        frame_list_cycle=[np.zeros((1344, 768, 3), dtype=np.uint8)]
    )
    state.model.avatar_ready = True
    state.model.avatar_revision = 1

    monkeypatch.setattr(
        "muse_stream.avatar_registry.load_cached_avatar",
        lambda args, runtime, avatar_id: SimpleNamespace(
            frame_list_cycle=[
                np.zeros(
                    (864, 480, 3)
                    if avatar_id == "musetalk_test_avatar"
                    else (1344, 768, 3),
                    dtype=np.uint8,
                )
            ]
        ),
    )
    client = TestClient(create_app(state))

    listed = client.get("/api/avatars")
    assert listed.status_code == 200
    payload = listed.json()
    assert payload["default_avatar_id"] == "gril_v2"
    assert {item["id"] for item in payload["avatars"]} >= {
        "gril_v2",
        "musetalk_test_avatar",
    }

    selected = client.post(
        "/api/avatar/select",
        json={"avatar_id": "musetalk_test_avatar"},
    )
    assert selected.status_code == 200
    assert selected.json()["active_avatar_id"] == "musetalk_test_avatar"
    assert selected.json()["width"] == 480
    assert selected.json()["height"] == 864

    restored = client.post("/api/avatar/select")
    assert restored.status_code == 200
    assert restored.json()["active_avatar_id"] == "gril_v2"
    assert restored.json()["width"] == 768

    missing = client.post(
        "/api/avatar/select",
        json={"avatar_id": "missing_avatar"},
    )
    assert missing.status_code == 404
    assert missing.json()["detail"]["code"] == "avatar_not_found"


def test_failed_activation_rolls_back_previous_avatar(monkeypatch) -> None:
    state = _state()
    state.model.avatar_id = "gril_v2"
    state.model.avatar = SimpleNamespace(
        frame_list_cycle=[np.zeros((1344, 768, 3), dtype=np.uint8)]
    )
    state.model.avatar_ready = True
    state.model.avatar_revision = 3

    def fake_inspect(avatar_id, version):
        return AvatarCacheInfo(
            id=avatar_id,
            valid=True,
            width=480,
            height=864,
            frame_count=690,
            source_frame_count=345,
        )

    def fake_load(args, runtime, avatar_id):
        if avatar_id == "broken_avatar":
            raise RuntimeError("synthetic cache failure")
        return SimpleNamespace(
            frame_list_cycle=[np.zeros((1344, 768, 3), dtype=np.uint8)]
        )

    monkeypatch.setattr(
        "muse_stream.avatar_registry.inspect_avatar_cache",
        fake_inspect,
    )
    monkeypatch.setattr(
        "muse_stream.avatar_registry.load_cached_avatar",
        fake_load,
    )

    with pytest.raises(AvatarActivationError):
        activate_avatar(state, "broken_avatar")

    assert state.model.avatar_id == "gril_v2"
    assert state.model.avatar_ready
    assert state.model.avatar_revision == 3
