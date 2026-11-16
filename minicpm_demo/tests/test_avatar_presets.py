from __future__ import annotations

import os
import sys
from pathlib import Path

import pytest
import yaml

DEMO_ROOT = Path(__file__).resolve().parents[1]
if str(DEMO_ROOT) not in sys.path:
    sys.path.insert(0, str(DEMO_ROOT))

from gateway_modules.avatar_presets import (
    AvatarPresetError,
    AvatarPresetRegistry,
)


def _avatar_status() -> dict:
    return {
        "active_avatar_id": "knowledge_host_720p_stable_v1",
        "avatar_revision": 3,
        "avatars": [
            {
                "id": "knowledge_host_720p_stable_v1",
                "valid": True,
                "width": 768,
                "height": 1344,
                "frame_count": 690,
            },
            {
                "id": "musetalk_test_avatar",
                "valid": True,
                "width": 480,
                "height": 864,
                "frame_count": 690,
            },
            {
                "id": "gril_v2",
                "valid": True,
                "width": 768,
                "height": 1344,
                "frame_count": 690,
            },
        ],
    }


def test_repository_avatar_presets_are_config_driven() -> None:
    registry = AvatarPresetRegistry(DEMO_ROOT)
    config = registry.load()

    assert config.default_preset_id == "gril_v2"
    assert [preset.id for preset in config.presets] == [
        "gril_v2",
        "knowledge_host_720p",
        "musetalk_test_avatar",
    ]

    payload = registry.public_list(_avatar_status())
    presets = {item["id"]: item for item in payload["presets"]}
    current = presets["knowledge_host_720p"]
    classic = presets["musetalk_test_avatar"]
    gril_v2 = presets["gril_v2"]

    assert current["available"]
    assert current["cache"]["width"] == 768
    assert current["voice"]["name"] == "ref_avatar_default.wav"
    assert "中文知识传播助手" in current["prompt"]["text"]
    assert current["prompt"]["sha256"]
    assert current["source"] == "system"
    assert current["deletable"] is False
    assert current["active"] is True

    assert classic["available"]
    assert classic["cache"]["width"] == 480
    assert classic["voice"]["name"] == "ref_minicpm_signature.wav"
    assert classic["prompt"]["text"]

    assert gril_v2["available"]
    assert gril_v2["cache"]["width"] == 768
    assert gril_v2["voice"]["name"] == "ref_minicpm_signature.wav"
    for preset, name in [(gril_v2, "小鹿"), (current, "阿萍"), (classic, "小美")]:
        assert preset["name"] == name
        assert preset["prompt"]["text"].startswith(f"你叫{name}，")


def test_missing_cache_keeps_preset_visible_but_unavailable() -> None:
    registry = AvatarPresetRegistry(DEMO_ROOT)
    status = _avatar_status()
    status["avatars"] = [
        item for item in status["avatars"]
        if item["id"] != "musetalk_test_avatar"
    ]

    presets = {
        item["id"]: item
        for item in registry.public_list(status)["presets"]
    }
    classic = presets["musetalk_test_avatar"]
    assert not classic["available"]
    assert "not found" in classic["error"].lower()


def test_preset_voice_audio_is_loaded_by_preset_id() -> None:
    registry = AvatarPresetRegistry(DEMO_ROOT)
    current = registry.voice_audio("knowledge_host_720p")
    classic = registry.voice_audio("musetalk_test_avatar")

    assert current["name"] == "ref_avatar_default.wav"
    assert current["duration"] == 16.6
    assert current["base64"]
    assert classic["name"] == "ref_minicpm_signature.wav"
    assert classic["duration"] == 6.0
    assert current["base64"] != classic["base64"]


def test_unknown_preset_returns_404_error() -> None:
    registry = AvatarPresetRegistry(DEMO_ROOT)
    with pytest.raises(AvatarPresetError) as exc:
        registry.get("missing")
    assert exc.value.status_code == 404


def test_asset_paths_must_stay_inside_project(tmp_path: Path) -> None:
    (tmp_path / "assets/prompts/avatar").mkdir(parents=True)
    (tmp_path / "assets/ref_audio").mkdir(parents=True)
    (tmp_path / "assets/prompts/avatar/prompt.txt").write_text("prompt")
    (tmp_path / "assets/ref_audio/voice.wav").write_bytes(b"not-a-wav")
    (tmp_path / "outside.txt").write_text("outside")
    config = {
        "version": 1,
        "default_preset": "bad",
        "presets": {
            "bad": {
                "name": "Bad",
                "avatar_id": "avatar",
                "voice_ref": "assets/ref_audio/voice.wav",
                "prompt_file": "../outside.txt",
            },
        },
    }
    (tmp_path / "assets/avatar_presets.yaml").write_text(yaml.safe_dump(config))

    registry = AvatarPresetRegistry(tmp_path)
    preset = registry.get("bad")
    with pytest.raises(AvatarPresetError, match="escapes project root"):
        registry._read_prompt(preset)


def test_preset_config_hot_reloads_after_file_change(tmp_path: Path) -> None:
    (tmp_path / "assets").mkdir()
    config_path = tmp_path / "assets/avatar_presets.yaml"

    def write_preset(preset_id: str, order: int) -> None:
        config = {
            "version": 1,
            "default_preset": preset_id,
            "presets": {
                preset_id: {
                    "name": preset_id,
                    "avatar_id": preset_id,
                    "voice_ref": f"assets/{preset_id}.wav",
                    "prompt_file": f"assets/{preset_id}.txt",
                    "order": order,
                },
            },
        }
        config_path.write_text(yaml.safe_dump(config))

    write_preset("first", 10)
    registry = AvatarPresetRegistry(tmp_path)
    assert [preset.id for preset in registry.load().presets] == ["first"]

    write_preset("second", 20)
    stat = config_path.stat()
    os.utime(config_path, ns=(stat.st_atime_ns, stat.st_mtime_ns + 1_000_000))
    assert [preset.id for preset in registry.load().presets] == ["second"]


def test_runtime_private_presets_are_merged_and_owner_scoped(tmp_path: Path) -> None:
    builtin = tmp_path / "avatar_presets.yaml"
    runtime = tmp_path / "avatar_presets.user.yaml"
    builtin.write_text(
        """
version: 1
default_preset: public
presets:
  public:
    name: Public
    avatar_id: public_avatar
    voice_ref: voice.wav
    prompt_file: prompt.txt
    order: 10
    enabled: true
""".strip(),
        encoding="utf-8",
    )
    runtime.write_text(
        """
version: 1
presets:
  private:
    name: Private
    avatar_id: private_avatar
    voice_ref: private.wav
    prompt_file: private.txt
    owner_id: user-a
    visibility: private
    order: 20
    enabled: true
""".strip(),
        encoding="utf-8",
    )
    registry = AvatarPresetRegistry(
        tmp_path,
        config_path="avatar_presets.yaml",
        runtime_config_path="avatar_presets.user.yaml",
    )
    config = registry.load()
    assert [preset.id for preset in config.presets] == ["public", "private"]
    assert registry.get("public").id == "public"
    with pytest.raises(AvatarPresetError):
        registry.get("private")
    private = registry.get("private", owner_id="user-a")
    assert private.id == "private"
    assert private.source == "user"
    payload = registry.public_list(_avatar_status(), owner_id="user-a")
    private_item = next(
        item for item in payload["presets"]
        if item["id"] == "private"
    )
    assert private_item["deletable"] is True


def test_invalid_preset_source_is_rejected(tmp_path: Path) -> None:
    config_path = tmp_path / "avatar_presets.yaml"
    config_path.write_text(
        """
version: 1
default_preset: bad
presets:
  bad:
    name: Bad
    source: external
    avatar_id: bad
    voice_ref: voice.wav
    prompt_file: prompt.txt
""".strip(),
        encoding="utf-8",
    )
    registry = AvatarPresetRegistry(
        tmp_path,
        config_path="avatar_presets.yaml",
    )
    with pytest.raises(AvatarPresetError, match="source must be system or user"):
        registry.load()
