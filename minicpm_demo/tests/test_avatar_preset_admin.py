from __future__ import annotations

import hashlib
import json
import wave
from pathlib import Path

import pytest
import yaml
from fastapi.testclient import TestClient

import gateway_modules.avatar_preset_admin as preset_admin_module
from gateway_modules.avatar_preset_admin import (
    AvatarPresetAdminService,
    AvatarPresetDeleteError,
)
from gateway_modules.avatar_presets import AvatarPresetRegistry


def _write_yaml(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        yaml.safe_dump(
            payload,
            allow_unicode=True,
            sort_keys=False,
        ),
        encoding="utf-8",
    )


def _preset(
    *,
    source: str,
    avatar_id: str,
    voice_ref: str,
    prompt_file: str,
    owner_id: str | None = None,
) -> dict:
    value = {
        "name": avatar_id,
        "description": "",
        "source": source,
        "avatar_id": avatar_id,
        "voice_ref": voice_ref,
        "prompt_file": prompt_file,
        "order": 10,
        "enabled": True,
    }
    if owner_id:
        value["owner_id"] = owner_id
        value["visibility"] = "private"
    return value


def _resource(root: Path, relative: str, data: bytes = b"x") -> Path:
    path = root / relative
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    return path


def _wav_resource(root: Path, relative: str) -> Path:
    path = root / relative
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as stream:
        stream.setnchannels(1)
        stream.setsampwidth(2)
        stream.setframerate(16000)
        stream.writeframes(b"\x00\x00" * 1600)
    return path


def _cache(root: Path, avatar_id: str, video_relative: str) -> Path:
    path = root / "musetalk_project/MuseTalk/results/v15/avatars" / avatar_id
    path.mkdir(parents=True)
    (path / "full_imgs").mkdir()
    (path / "full_imgs/00000000.png").write_bytes(b"frame")
    (path / "avator_info.json").write_text(
        json.dumps(
            {
                "avatar_id": avatar_id,
                "video_path": video_relative,
                "bbox_shift": 0,
                "version": "v15",
            }
        ),
        encoding="utf-8",
    )
    return path


def _manifest(root: Path, paths: list[str]) -> Path:
    manifest = root / "minicpm_demo/MANIFEST.sha256"
    lines = []
    for relative in paths:
        path = root / relative
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        lines.append(f"{digest}  ./{path.relative_to(root / 'minicpm_demo').as_posix()}")
    manifest.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return manifest


def _minimal_project(tmp_path: Path) -> AvatarPresetAdminService:
    base = _preset(
        source="system",
        avatar_id="system_avatar",
        voice_ref="assets/ref_audio/system.wav",
        prompt_file="assets/prompts/avatar/system.txt",
    )
    _wav_resource(tmp_path, "minicpm_demo/assets/ref_audio/system.wav")
    _resource(tmp_path, "minicpm_demo/assets/prompts/avatar/system.txt")
    _resource(tmp_path, "musetalk_project/MuseTalk/data/video/system_avatar.mp4")
    _cache(
        tmp_path,
        "system_avatar",
        "data/video/system_avatar.mp4",
    )
    _write_yaml(
        tmp_path / "minicpm_demo/assets/avatar_presets.yaml",
        {
            "version": 1,
            "default_preset": "system_avatar",
            "presets": {"system_avatar": base},
        },
    )
    _manifest(
        tmp_path,
        [
            "minicpm_demo/assets/avatar_presets.yaml",
            "minicpm_demo/assets/ref_audio/system.wav",
            "minicpm_demo/assets/prompts/avatar/system.txt",
        ],
    )
    return AvatarPresetAdminService(
        project_root=tmp_path,
        avatar_http_url="",
    )


def _gateway_registry(
    manager: AvatarPresetAdminService,
) -> AvatarPresetRegistry:
    return AvatarPresetRegistry(
        manager.minicpm_root,
        runtime_config_path=manager.runtime_config_path,
    )


def _avatar_status(active_avatar_id: str) -> dict:
    return {
        "active_avatar_id": active_avatar_id,
        "avatars": [
            {
                "id": "system_avatar",
                "valid": True,
                "width": 768,
                "height": 1344,
                "frame_count": 690,
            },
            {
                "id": "user_avatar",
                "valid": True,
                "width": 1088,
                "height": 1920,
                "frame_count": 690,
            },
        ],
    }


def test_api_deletes_owner_created_preset_and_unique_files(tmp_path: Path) -> None:
    manager = _minimal_project(tmp_path)
    runtime = tmp_path / "minicpm_demo/data/avatar_customizations/avatar_presets.user.yaml"
    _write_yaml(
        runtime,
        {
            "version": 1,
            "presets": {
                "user_avatar": _preset(
                    source="user",
                    avatar_id="user_avatar",
                    voice_ref="data/avatar_customizations/assets/ref_audio/user.wav",
                    prompt_file="data/avatar_customizations/assets/prompts/avatar/user.txt",
                    owner_id="user-a",
                ),
            },
        },
    )
    voice = _resource(
        tmp_path,
        "minicpm_demo/data/avatar_customizations/assets/ref_audio/user.wav",
    )
    prompt = _resource(
        tmp_path,
        "minicpm_demo/data/avatar_customizations/assets/prompts/avatar/user.txt",
    )
    video = _resource(
        tmp_path,
        "musetalk_project/MuseTalk/data/video/user_avatar.mp4",
    )
    cache = _cache(
        tmp_path,
        "user_avatar",
        "data/video/user_avatar.mp4",
    )

    result = manager.delete(
        "user_avatar",
        owner_id="user-a",
        api_mode=True,
        check_active=False,
    )

    assert result["deleted"] is True
    assert not voice.exists()
    assert not prompt.exists()
    assert not video.exists()
    assert not cache.exists()
    config = yaml.safe_load(runtime.read_text(encoding="utf-8"))
    assert config["presets"] == {}


def test_shared_audio_cache_and_video_are_retained(tmp_path: Path) -> None:
    manager = _minimal_project(tmp_path)
    runtime = tmp_path / "minicpm_demo/data/avatar_customizations/avatar_presets.user.yaml"
    _write_yaml(
        runtime,
        {
            "version": 1,
            "presets": {
                "user_avatar": _preset(
                    source="user",
                    avatar_id="system_avatar",
                    voice_ref="assets/ref_audio/system.wav",
                    prompt_file="data/avatar_customizations/assets/prompts/avatar/user.txt",
                    owner_id="user-a",
                ),
                "prompt_owner": _preset(
                    source="user",
                    avatar_id="prompt_owner",
                    voice_ref="data/avatar_customizations/assets/ref_audio/other.wav",
                    prompt_file="data/avatar_customizations/assets/prompts/avatar/user.txt",
                    owner_id="user-b",
                ),
            },
        },
    )
    prompt = _resource(
        tmp_path,
        "minicpm_demo/data/avatar_customizations/assets/prompts/avatar/user.txt",
    )

    result = manager.delete(
        "user_avatar",
        owner_id="user-a",
        api_mode=True,
        check_active=False,
    )

    retained = {item["resource"] for item in result["files_retained"]}
    assert retained >= {
        "voice_ref",
        "prompt_file",
        "avatar_cache",
        "source_video",
    }
    assert prompt.exists()
    assert (
        tmp_path
        / "minicpm_demo/assets/ref_audio/system.wav"
    ).exists()
    assert (
        tmp_path
        / "musetalk_project/MuseTalk/results/v15/avatars/system_avatar"
    ).is_dir()
    assert (
        tmp_path
        / "musetalk_project/MuseTalk/data/video/system_avatar.mp4"
    ).exists()


def test_api_cannot_delete_system_preset(tmp_path: Path) -> None:
    manager = _minimal_project(tmp_path)
    voice = tmp_path / "minicpm_demo/assets/ref_audio/system.wav"
    cache = (
        tmp_path
        / "musetalk_project/MuseTalk/results/v15/avatars/system_avatar"
    )
    with pytest.raises(AvatarPresetDeleteError) as exc:
        manager.delete(
            "system_avatar",
            owner_id="user-a",
            api_mode=True,
            check_active=False,
        )
    assert exc.value.code == "system_preset_protected"
    assert voice.exists()
    assert cache.is_dir()


def test_owner_mismatch_does_not_reveal_preset(tmp_path: Path) -> None:
    manager = _minimal_project(tmp_path)
    runtime = tmp_path / "minicpm_demo/data/avatar_customizations/avatar_presets.user.yaml"
    _write_yaml(
        runtime,
        {
            "version": 1,
            "presets": {
                "user_avatar": _preset(
                    source="user",
                    avatar_id="user_avatar",
                    voice_ref="data/avatar_customizations/assets/ref_audio/user.wav",
                    prompt_file="data/avatar_customizations/assets/prompts/avatar/user.txt",
                    owner_id="user-a",
                ),
            },
        },
    )
    with pytest.raises(AvatarPresetDeleteError) as exc:
        manager.delete(
            "user_avatar",
            owner_id="user-b",
            api_mode=True,
            check_active=False,
        )
    assert exc.value.status_code == 404
    assert exc.value.code == "preset_not_found"


def test_shell_can_delete_system_preset_and_update_manifest(
    tmp_path: Path,
) -> None:
    manager = _minimal_project(tmp_path)
    base_path = tmp_path / "minicpm_demo/assets/avatar_presets.yaml"
    config = yaml.safe_load(base_path.read_text(encoding="utf-8"))
    config["presets"]["second_system"] = _preset(
        source="system",
        avatar_id="second_system",
        voice_ref="assets/ref_audio/system.wav",
        prompt_file="assets/prompts/avatar/second.txt",
    )
    _write_yaml(base_path, config)
    prompt = _resource(
        tmp_path,
        "minicpm_demo/assets/prompts/avatar/second.txt",
    )
    video = _resource(
        tmp_path,
        "musetalk_project/MuseTalk/data/video/second_system.mp4",
    )
    cache = _cache(
        tmp_path,
        "second_system",
        "data/video/second_system.mp4",
    )
    _manifest(
        tmp_path,
        [
            "minicpm_demo/assets/avatar_presets.yaml",
            "minicpm_demo/assets/ref_audio/system.wav",
            "minicpm_demo/assets/prompts/avatar/system.txt",
            "minicpm_demo/assets/prompts/avatar/second.txt",
        ],
    )

    result = manager.delete(
        "second_system",
        check_active=False,
    )

    assert result["deleted"] is True
    assert not prompt.exists()
    assert not video.exists()
    assert not cache.exists()
    assert (
        tmp_path / "minicpm_demo/assets/ref_audio/system.wav"
    ).exists()
    updated = yaml.safe_load(base_path.read_text(encoding="utf-8"))
    assert "second_system" not in updated["presets"]
    manifest = (
        tmp_path / "minicpm_demo/MANIFEST.sha256"
    ).read_text(encoding="utf-8")
    config_digest = hashlib.sha256(base_path.read_bytes()).hexdigest()
    assert (
        f"{config_digest}  ./assets/avatar_presets.yaml"
        in manifest
    )
    assert "second.txt" not in manifest
    assert "system.wav" in manifest


def test_deleting_default_requires_replacement(tmp_path: Path) -> None:
    manager = _minimal_project(tmp_path)
    base_path = tmp_path / "minicpm_demo/assets/avatar_presets.yaml"
    config = yaml.safe_load(base_path.read_text(encoding="utf-8"))
    config["presets"]["replacement"] = _preset(
        source="system",
        avatar_id="replacement",
        voice_ref="assets/ref_audio/replacement.wav",
        prompt_file="assets/prompts/avatar/replacement.txt",
    )
    _write_yaml(base_path, config)
    with pytest.raises(AvatarPresetDeleteError) as exc:
        manager.delete(
            "system_avatar",
            check_active=False,
        )
    assert exc.value.code == "default_preset_requires_reassignment"


def test_local_delete_endpoint_protects_system_preset(
    tmp_path: Path,
    monkeypatch,
) -> None:
    import gateway

    manager = _minimal_project(tmp_path)
    monkeypatch.setattr(
        gateway,
        "avatar_preset_admin_service",
        manager,
    )
    monkeypatch.setattr(
        gateway,
        "avatar_preset_registry",
        _gateway_registry(manager),
    )

    async def avatar_status(_base):
        return _avatar_status("system_avatar")

    monkeypatch.setattr(gateway, "_fetch_avatar_status", avatar_status)
    client = TestClient(gateway.app)
    try:
        response = client.delete(
            "/avatar-live/api/avatar-presets/system_avatar",
            headers={"X-Avatar-Owner-ID": "user-a"},
        )
    finally:
        client.close()
    assert response.status_code == 403
    assert response.json()["detail"]["code"] == "system_preset_protected"


def test_public_delete_endpoint_deletes_owned_user_preset(
    tmp_path: Path,
    monkeypatch,
) -> None:
    import gateway

    manager = _minimal_project(tmp_path)
    runtime = tmp_path / "minicpm_demo/data/avatar_customizations/avatar_presets.user.yaml"
    _write_yaml(
        runtime,
        {
            "version": 1,
            "presets": {
                "user_avatar": _preset(
                    source="user",
                    avatar_id="user_avatar",
                    voice_ref="data/avatar_customizations/assets/ref_audio/user.wav",
                    prompt_file="data/avatar_customizations/assets/prompts/avatar/user.txt",
                    owner_id="user-a",
                ),
            },
        },
    )
    _resource(
        tmp_path,
        "minicpm_demo/data/avatar_customizations/assets/ref_audio/user.wav",
    )
    _resource(
        tmp_path,
        "minicpm_demo/data/avatar_customizations/assets/prompts/avatar/user.txt",
    )
    _cache(
        tmp_path,
        "user_avatar",
        "data/video/user_avatar.mp4",
    )
    _resource(
        tmp_path,
        "musetalk_project/MuseTalk/data/video/user_avatar.mp4",
    )

    class SessionService:
        def require_api_key(self, supplied):
            assert supplied == "secret"

        async def is_preset_in_use(self, preset_id):
            return False

    monkeypatch.setattr(
        gateway,
        "avatar_preset_admin_service",
        manager,
    )
    monkeypatch.setattr(
        gateway,
        "avatar_session_service",
        SessionService(),
    )
    monkeypatch.setattr(
        gateway,
        "avatar_preset_registry",
        _gateway_registry(manager),
    )

    async def avatar_status(_base):
        return _avatar_status("system_avatar")

    monkeypatch.setattr(gateway, "_fetch_avatar_status", avatar_status)
    client = TestClient(gateway.app)
    try:
        response = client.delete(
            "/v1/avatar/presets/user_avatar",
            headers={
                "Authorization": "Bearer secret",
                "X-Avatar-Owner-ID": "user-a",
            },
        )
    finally:
        client.close()
    assert response.status_code == 200
    assert response.json()["deleted"] is True
    assert response.json()["source"] == "user"


def test_public_delete_active_preset_switches_to_default(
    tmp_path: Path,
    monkeypatch,
) -> None:
    import gateway

    manager = _minimal_project(tmp_path)
    runtime = tmp_path / "minicpm_demo/data/avatar_customizations/avatar_presets.user.yaml"
    _write_yaml(
        runtime,
        {
            "version": 1,
            "presets": {
                "user_avatar": _preset(
                    source="user",
                    avatar_id="user_avatar",
                    voice_ref="data/avatar_customizations/assets/ref_audio/user.wav",
                    prompt_file="data/avatar_customizations/assets/prompts/avatar/user.txt",
                    owner_id="user-a",
                ),
            },
        },
    )
    _resource(
        tmp_path,
        "minicpm_demo/data/avatar_customizations/assets/ref_audio/user.wav",
    )
    _resource(
        tmp_path,
        "minicpm_demo/data/avatar_customizations/assets/prompts/avatar/user.txt",
    )
    _cache(
        tmp_path,
        "user_avatar",
        "data/video/user_avatar.mp4",
    )
    _resource(
        tmp_path,
        "musetalk_project/MuseTalk/data/video/user_avatar.mp4",
    )

    class SessionService:
        def require_api_key(self, supplied):
            assert supplied == "secret"

        async def is_preset_in_use(self, preset_id):
            return False

    state = {"active": "user_avatar"}
    switched = []

    async def avatar_status(_base):
        return _avatar_status(state["active"])

    async def switch_avatar(avatar_id):
        switched.append(avatar_id)
        state["active"] = avatar_id

    monkeypatch.setattr(
        gateway,
        "avatar_preset_admin_service",
        manager,
    )
    monkeypatch.setattr(
        gateway,
        "avatar_session_service",
        SessionService(),
    )
    monkeypatch.setattr(
        gateway,
        "avatar_preset_registry",
        _gateway_registry(manager),
    )
    monkeypatch.setattr(gateway, "_fetch_avatar_status", avatar_status)
    monkeypatch.setattr(gateway, "_switch_avatar_for_delete", switch_avatar)
    client = TestClient(gateway.app)
    headers = {
        "Authorization": "Bearer secret",
        "X-Avatar-Owner-ID": "user-a",
    }
    try:
        rejected = client.delete(
            "/v1/avatar/presets/user_avatar",
            headers=headers,
        )
        accepted = client.delete(
            "/v1/avatar/presets/user_avatar?switch_to_default=true",
            headers=headers,
        )
    finally:
        client.close()

    assert rejected.status_code == 409
    assert rejected.json()["detail"]["code"] == "avatar_active"
    assert rejected.json()["detail"]["can_switch_to_default"] is True
    assert accepted.status_code == 200, accepted.json()
    assert accepted.json()["switched_to_preset_id"] == "system_avatar"
    assert accepted.json()["active_avatar_id"] == "system_avatar"
    assert switched == ["system_avatar"]


def test_unsafe_resource_path_is_rejected(tmp_path: Path) -> None:
    manager = _minimal_project(tmp_path)
    runtime = tmp_path / "minicpm_demo/data/avatar_customizations/avatar_presets.user.yaml"
    _write_yaml(
        runtime,
        {
            "version": 1,
            "presets": {
                "user_avatar": _preset(
                    source="user",
                    avatar_id="user_avatar",
                    voice_ref="../../outside.wav",
                    prompt_file="data/avatar_customizations/assets/prompts/avatar/user.txt",
                    owner_id="user-a",
                ),
            },
        },
    )
    with pytest.raises(AvatarPresetDeleteError) as exc:
        manager.delete(
            "user_avatar",
            owner_id="user-a",
            api_mode=True,
            check_active=False,
        )
    assert exc.value.code == "unsafe_avatar_resource_path"


def test_active_avatar_cannot_be_deleted(tmp_path: Path) -> None:
    manager = _minimal_project(tmp_path)
    runtime = tmp_path / "minicpm_demo/data/avatar_customizations/avatar_presets.user.yaml"
    _write_yaml(
        runtime,
        {
            "version": 1,
            "presets": {
                "user_avatar": _preset(
                    source="user",
                    avatar_id="user_avatar",
                    voice_ref="data/avatar_customizations/assets/ref_audio/user.wav",
                    prompt_file="data/avatar_customizations/assets/prompts/avatar/user.txt",
                    owner_id="user-a",
                ),
            },
        },
    )

    def active(preset):
        raise AvatarPresetDeleteError(
            "Avatar preset is currently active",
            status_code=409,
            code="avatar_in_use",
        )

    manager.avatar_http_url = "http://127.0.0.1:8000"
    manager._check_active = active
    with pytest.raises(AvatarPresetDeleteError) as exc:
        manager.delete(
            "user_avatar",
            owner_id="user-a",
            api_mode=True,
        )
    assert exc.value.code == "avatar_in_use"


def test_active_check_accepts_status_avatar_id(
    tmp_path: Path,
    monkeypatch,
) -> None:
    manager = _minimal_project(tmp_path)
    manager.avatar_http_url = "http://127.0.0.1:8000"
    preset = AvatarPresetRegistry(manager.minicpm_root).get(
        "system_avatar"
    )

    class Response:
        def read(self):
            return json.dumps(
                {"avatar_id": "system_avatar"}
            ).encode("utf-8")

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

    monkeypatch.setattr(
        preset_admin_module,
        "urlopen",
        lambda *args, **kwargs: Response(),
    )
    with pytest.raises(AvatarPresetDeleteError) as exc:
        manager._check_active(preset)
    assert exc.value.code == "avatar_in_use"
