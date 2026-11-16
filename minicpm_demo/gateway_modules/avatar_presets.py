"""Configuration-backed avatar presets for the /avatar page."""

from __future__ import annotations

import base64
import hashlib
import os
import re
import threading
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Optional

import yaml


_PRESET_ID_RE = re.compile(r"^[A-Za-z0-9_-]{1,64}$")
_MAX_PROMPT_BYTES = 64 * 1024


class AvatarPresetError(RuntimeError):
    def __init__(self, message: str, *, status_code: int = 500):
        super().__init__(message)
        self.status_code = status_code


@dataclass(frozen=True)
class AvatarPresetSpec:
    id: str
    name: str
    description: str
    avatar_id: str
    voice_ref: str
    prompt_file: str
    order: int
    enabled: bool
    owner_id: Optional[str] = None
    visibility: str = "public"
    source: str = "system"


@dataclass(frozen=True)
class AvatarPresetConfig:
    version: int
    default_preset_id: str
    presets: tuple[AvatarPresetSpec, ...]


class AvatarPresetRegistry:
    """Load the preset YAML with mtime-based hot reload."""

    def __init__(
        self,
        project_root: str | Path,
        config_path: str = "assets/avatar_presets.yaml",
        runtime_config_path: Optional[str] = None,
    ) -> None:
        self.project_root = Path(project_root).resolve()
        self.config_path = (self.project_root / config_path).resolve()
        self.runtime_config_path = (
            (self.project_root / runtime_config_path).resolve()
            if runtime_config_path
            else None
        )
        self._lock = threading.RLock()
        self._mtime_signature: tuple[Any, ...] = ()
        self._config: Optional[AvatarPresetConfig] = None
        self._voice_cache: Dict[tuple[str, int, int], Dict[str, Any]] = {}

    def load(self) -> AvatarPresetConfig:
        with self._lock:
            if not self.config_path.is_file():
                raise AvatarPresetError(
                    f"Avatar preset config not found: {self.config_path}"
                )
            signature = (
                self._file_signature(self.config_path),
                self._file_signature(self.runtime_config_path),
            )
            if self._config is not None and signature == self._mtime_signature:
                return self._config

            try:
                raw = yaml.safe_load(self.config_path.read_text(encoding="utf-8"))
            except Exception as exc:
                raise AvatarPresetError(
                    f"Failed to parse avatar preset config: {exc}"
                ) from exc
            presets = self._parse_presets(
                raw,
                self.config_path,
                default_source="system",
            )
            runtime_default = ""
            if self.runtime_config_path and self.runtime_config_path.is_file():
                try:
                    runtime_raw = yaml.safe_load(
                        self.runtime_config_path.read_text(encoding="utf-8")
                    )
                except Exception as exc:
                    raise AvatarPresetError(
                        f"Failed to parse runtime avatar presets: {exc}"
                    ) from exc
                runtime_presets = self._parse_presets(
                    runtime_raw,
                    self.runtime_config_path,
                    allow_empty=True,
                    default_source="user",
                )
                existing_ids = {preset.id for preset in presets}
                for preset in runtime_presets:
                    if preset.id in existing_ids:
                        raise AvatarPresetError(
                            f"Duplicate avatar preset id: {preset.id}"
                        )
                    presets.append(preset)
                    existing_ids.add(preset.id)
                runtime_default = str(
                    runtime_raw.get("default_preset") or ""
                ).strip()
            if len(presets) > 64:
                raise AvatarPresetError("Too many avatar presets (maximum 64)")

            presets.sort(key=lambda preset: (preset.order, preset.name, preset.id))
            default_id = runtime_default or str(
                raw.get("default_preset") or ""
            ).strip()
            enabled_ids = {preset.id for preset in presets if preset.enabled}
            if default_id and default_id not in enabled_ids:
                raise AvatarPresetError(
                    f"Default preset is missing or disabled: {default_id}"
                )
            if not default_id:
                default_id = next(
                    (preset.id for preset in presets if preset.enabled),
                    "",
                )
            if not default_id:
                raise AvatarPresetError("Avatar preset config has no enabled presets")

            self._config = AvatarPresetConfig(
                version=1,
                default_preset_id=default_id,
                presets=tuple(presets),
            )
            self._mtime_signature = signature
            return self._config

    def invalidate(self) -> None:
        """Force the next access to reload both preset files."""
        with self._lock:
            self._config = None
            self._mtime_signature = ()
            self._voice_cache.clear()

    @staticmethod
    def _file_signature(path: Optional[Path]) -> tuple[int, int]:
        if path is None or not path.is_file():
            return (0, 0)
        stat = path.stat()
        return (stat.st_mtime_ns, stat.st_size)

    @staticmethod
    def _parse_presets(
        raw: Any,
        source: Path,
        *,
        allow_empty: bool = False,
        default_source: str = "system",
    ) -> list[AvatarPresetSpec]:
        if not isinstance(raw, dict):
            raise AvatarPresetError(
                f"Avatar preset config must be a YAML object: {source}"
            )
        if int(raw.get("version", 1)) != 1:
            raise AvatarPresetError(
                f"Unsupported avatar preset config version: {raw.get('version')}"
            )
        raw_presets = raw.get("presets")
        if not isinstance(raw_presets, dict):
            raise AvatarPresetError(
                f"avatar presets must be a map in {source}"
            )
        if not raw_presets and not allow_empty:
            raise AvatarPresetError("avatar_presets.presets must be a non-empty map")

        presets: list[AvatarPresetSpec] = []
        for preset_id, item in raw_presets.items():
            preset_id = str(preset_id).strip()
            if not _PRESET_ID_RE.fullmatch(preset_id):
                raise AvatarPresetError(f"Invalid preset id: {preset_id!r}")
            if not isinstance(item, dict):
                raise AvatarPresetError(f"Preset {preset_id} must be a map")
            avatar_id = str(item.get("avatar_id", "")).strip()
            voice_ref = str(item.get("voice_ref", "")).strip()
            prompt_file = str(item.get("prompt_file", "")).strip()
            if not avatar_id:
                raise AvatarPresetError(f"Preset {preset_id}: avatar_id is required")
            if not voice_ref:
                raise AvatarPresetError(f"Preset {preset_id}: voice_ref is required")
            if not prompt_file:
                raise AvatarPresetError(f"Preset {preset_id}: prompt_file is required")
            try:
                order = int(item.get("order", 999))
            except (TypeError, ValueError) as exc:
                raise AvatarPresetError(
                    f"Preset {preset_id}: order must be an integer"
                ) from exc
            enabled = item.get("enabled", True)
            if not isinstance(enabled, bool):
                raise AvatarPresetError(
                    f"Preset {preset_id}: enabled must be true or false"
                )
            owner_id = str(item.get("owner_id") or "").strip() or None
            preset_source = str(
                item.get("source") or default_source
            ).lower()
            if preset_source not in {"system", "user"}:
                raise AvatarPresetError(
                    f"Preset {preset_id}: source must be system or user"
                )
            if preset_source == "user" and not owner_id:
                owner_id = "anonymous"
            visibility = str(
                item.get("visibility")
                or (
                    "private"
                    if preset_source == "user" or owner_id
                    else "public"
                )
            ).lower()
            if visibility not in {"public", "private"}:
                raise AvatarPresetError(
                    f"Preset {preset_id}: visibility must be public or private"
                )
            presets.append(
                AvatarPresetSpec(
                    id=preset_id,
                    name=str(item.get("name") or preset_id).strip(),
                    description=str(item.get("description") or "").strip(),
                    avatar_id=avatar_id,
                    voice_ref=voice_ref,
                    prompt_file=prompt_file,
                    order=order,
                    enabled=enabled,
                    owner_id=owner_id,
                    visibility=visibility,
                    source=preset_source,
                )
            )
        return presets

    def get(
        self,
        preset_id: str,
        owner_id: Optional[str] = None,
    ) -> AvatarPresetSpec:
        for preset in self.load().presets:
            if (
                preset.id == preset_id
                and preset.enabled
                and (
                    preset.visibility == "public"
                    or (owner_id and preset.owner_id == owner_id)
                )
            ):
                return preset
        raise AvatarPresetError(
            f"Avatar preset not found: {preset_id}",
            status_code=404,
        )

    def public_list(
        self,
        avatar_status: Dict[str, Any],
        owner_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        config = self.load()
        cache_by_id = {
            str(item.get("id")): item
            for item in avatar_status.get("avatars", [])
        }
        items = [
            self._public_item(
                preset,
                cache_by_id.get(preset.avatar_id),
                owner_id,
                avatar_status.get("active_avatar_id"),
            )
            for preset in config.presets
            if preset.enabled
            and (
                preset.visibility == "public"
                or (owner_id and preset.owner_id == owner_id)
            )
        ]
        return {
            "default_preset_id": config.default_preset_id,
            "active_avatar_id": avatar_status.get("active_avatar_id"),
            "avatar_revision": avatar_status.get("avatar_revision"),
            "presets": items,
        }

    def public_item(
        self,
        preset_id: str,
        avatar_status: Dict[str, Any],
        owner_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        preset = self.get(preset_id, owner_id)
        cache_by_id = {
            str(item.get("id")): item
            for item in avatar_status.get("avatars", [])
        }
        item = self._public_item(
            preset,
            cache_by_id.get(preset.avatar_id),
            owner_id,
            avatar_status.get("active_avatar_id"),
        )
        if not item["available"]:
            raise AvatarPresetError(
                item["error"] or f"Avatar preset is unavailable: {preset_id}",
                status_code=422,
            )
        return item

    def voice_audio(
        self,
        preset_id: str,
        owner_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        preset = self.get(preset_id, owner_id)
        path = self._resolve_path(preset.voice_ref)
        if not path.is_file():
            raise AvatarPresetError(
                f"Voice reference not found: {preset.voice_ref}",
                status_code=404,
            )
        stat = path.stat()
        cache_key = (str(path), stat.st_mtime_ns, stat.st_size)
        with self._lock:
            cached = self._voice_cache.get(cache_key)
        if cached is not None:
            return cached

        import librosa
        import numpy as np

        try:
            audio, _ = librosa.load(str(path), sr=16000, mono=True)
        except Exception as exc:
            raise AvatarPresetError(
                f"Failed to decode voice reference {preset.voice_ref}: {exc}"
            ) from exc
        payload = {
            "name": path.name,
            "duration": round(len(audio) / 16000, 1),
            "sample_rate": 16000,
            "samples": len(audio),
            "base64": base64.b64encode(
                audio.astype(np.float32).tobytes()
            ).decode("ascii"),
        }
        with self._lock:
            self._voice_cache[cache_key] = payload
            while len(self._voice_cache) > 8:
                self._voice_cache.pop(next(iter(self._voice_cache)))
        return payload

    def _public_item(
        self,
        preset: AvatarPresetSpec,
        cache: Optional[Dict[str, Any]],
        owner_id: Optional[str] = None,
        active_avatar_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        errors: list[str] = []
        prompt_payload: Optional[Dict[str, Any]] = None
        voice_payload: Optional[Dict[str, Any]] = None

        try:
            prompt_payload = self._read_prompt(preset)
        except AvatarPresetError as exc:
            errors.append(str(exc))

        try:
            voice_payload = self._voice_metadata(preset)
        except AvatarPresetError as exc:
            errors.append(str(exc))

        cache_payload = None
        if cache is None:
            errors.append(f"Avatar cache not found: {preset.avatar_id}")
        elif not cache.get("valid"):
            errors.append(str(cache.get("error") or "Avatar cache is invalid"))
        else:
            cache_payload = {
                "valid": True,
                "width": cache.get("width", 0),
                "height": cache.get("height", 0),
                "frame_count": cache.get("frame_count", 0),
            }

        return {
            "id": preset.id,
            "name": preset.name,
            "description": preset.description,
            "avatar_id": preset.avatar_id,
            "order": preset.order,
            "available": not errors,
            "error": "; ".join(errors) if errors else None,
            "cache": cache_payload,
            "prompt": prompt_payload,
            "voice": voice_payload,
            "visibility": preset.visibility,
            "source": preset.source,
            "custom": preset.source == "user",
            "active": preset.avatar_id == active_avatar_id,
            "deletable": (
                preset.source == "user"
                and bool(owner_id)
                and preset.owner_id == owner_id
            ),
        }

    def _read_prompt(self, preset: AvatarPresetSpec) -> Dict[str, Any]:
        path = self._resolve_path(preset.prompt_file)
        if not path.is_file():
            raise AvatarPresetError(
                f"Prompt file not found: {preset.prompt_file}"
            )
        if path.stat().st_size > _MAX_PROMPT_BYTES:
            raise AvatarPresetError(
                f"Prompt file is too large: {preset.prompt_file}"
            )
        try:
            text = path.read_text(encoding="utf-8").strip()
        except Exception as exc:
            raise AvatarPresetError(
                f"Failed to read prompt file {preset.prompt_file}: {exc}"
            ) from exc
        if not text:
            raise AvatarPresetError(f"Prompt file is empty: {preset.prompt_file}")
        return {
            "name": path.name,
            "sha256": hashlib.sha256(text.encode("utf-8")).hexdigest(),
            "text": text,
        }

    def _voice_metadata(self, preset: AvatarPresetSpec) -> Dict[str, Any]:
        path = self._resolve_path(preset.voice_ref)
        if not path.is_file():
            raise AvatarPresetError(
                f"Voice reference not found: {preset.voice_ref}"
            )
        try:
            import soundfile as sf

            info = sf.info(str(path))
            duration = round(float(info.frames) / float(info.samplerate), 1)
        except Exception as exc:
            raise AvatarPresetError(
                f"Failed to read voice reference {preset.voice_ref}: {exc}"
            ) from exc
        return {
            "name": path.name,
            "duration": duration,
            "audio_url": (
                f"/avatar-live/api/avatar-presets/{preset.id}/ref-audio"
            ),
        }

    def _resolve_path(self, value: str) -> Path:
        candidate = (self.project_root / value).resolve()
        try:
            candidate.relative_to(self.project_root)
        except ValueError as exc:
            raise AvatarPresetError(
                f"Asset path escapes project root: {value}"
            ) from exc
        return candidate
