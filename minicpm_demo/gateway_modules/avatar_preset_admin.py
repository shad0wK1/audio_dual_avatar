"""Delete avatar presets and their unshared runtime resources."""

from __future__ import annotations

import argparse
import fcntl
import hashlib
import json
import logging
import os
import shutil
import sys
import tempfile
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, Optional
from urllib.request import urlopen

import yaml

from .avatar_presets import (
    AvatarPresetError,
    AvatarPresetRegistry,
    AvatarPresetSpec,
)


logger = logging.getLogger("gateway.avatar_preset_admin")

_RESOURCE_ROLES = (
    "voice_ref",
    "prompt_file",
    "avatar_cache",
    "source_video",
)


class AvatarPresetDeleteError(RuntimeError):
    def __init__(
        self,
        message: str,
        *,
        status_code: int = 400,
        code: str = "avatar_preset_delete_error",
    ) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code


@dataclass
class DeletePlan:
    preset: AvatarPresetSpec
    config_path: Path
    config_kind: str
    base_raw: Dict[str, Any]
    runtime_raw: Dict[str, Any]
    original_config: bytes
    new_default_id: Optional[str]
    files_to_delete: Dict[str, Path] = field(default_factory=dict)
    files_retained: Dict[str, list[str]] = field(default_factory=dict)
    files_missing: list[str] = field(default_factory=list)


class AvatarPresetAdminService:
    """Own destructive preset operations for both CLI and Gateway API."""

    def __init__(
        self,
        *,
        project_root: str | Path,
        runtime_config_path: Optional[str | Path] = None,
        version: str = "v15",
        avatar_http_url: str = "http://127.0.0.1:8000",
        lock_path: Optional[str | Path] = None,
    ) -> None:
        self.project_root = Path(project_root).resolve()
        self.minicpm_root = self.project_root / "minicpm_demo"
        self.musetalk_root = (
            self.project_root / "musetalk_project" / "MuseTalk"
        )
        self.base_config_path = (
            self.minicpm_root / "assets" / "avatar_presets.yaml"
        )
        runtime = (
            Path(runtime_config_path)
            if runtime_config_path is not None
            else self.minicpm_root
            / "data"
            / "avatar_customizations"
            / "avatar_presets.user.yaml"
        )
        self.runtime_config_path = (
            runtime
            if runtime.is_absolute()
            else self.minicpm_root / runtime
        ).resolve()
        self.manifest_path = self.minicpm_root / "MANIFEST.sha256"
        self.avatar_cache_root = (
            self.musetalk_root / "results" / version / "avatars"
        )
        self.video_root = self.musetalk_root / "data" / "video"
        self.avatar_http_url = str(avatar_http_url or "").rstrip("/")
        self.lock_path = Path(
            lock_path or self.project_root / ".run" / "add_avatar.lock"
        ).resolve()

    def delete(
        self,
        preset_id: str,
        *,
        owner_id: Optional[str] = None,
        api_mode: bool = False,
        new_default_id: Optional[str] = None,
        dry_run: bool = False,
        check_active: bool = True,
    ) -> Dict[str, Any]:
        preset_id = str(preset_id or "").strip()
        if not preset_id:
            raise AvatarPresetDeleteError(
                "preset_id is required",
                code="invalid_preset_id",
            )
        self.lock_path.parent.mkdir(parents=True, exist_ok=True)
        with self.lock_path.open("a+", encoding="utf-8") as lock:
            try:
                fcntl.flock(lock.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
            except BlockingIOError as exc:
                raise AvatarPresetDeleteError(
                    "Another avatar operation is already running",
                    status_code=409,
                    code="avatar_operation_in_progress",
                ) from exc
            try:
                plan, warnings = self._build_plan(
                    preset_id,
                    owner_id=owner_id,
                    api_mode=api_mode,
                    new_default_id=new_default_id,
                    check_active=check_active,
                )
                result = self._plan_result(plan, dry_run=dry_run)
                result["warnings"] = warnings
                if dry_run:
                    return result
                self._apply_plan(plan)
                result["deleted"] = True
                result["resource_cleanup"] = self._delete_files(plan)
                return result
            finally:
                fcntl.flock(lock.fileno(), fcntl.LOCK_UN)

    def _build_plan(
        self,
        preset_id: str,
        *,
        owner_id: Optional[str],
        api_mode: bool,
        new_default_id: Optional[str],
        check_active: bool,
    ) -> tuple[DeletePlan, list[str]]:
        if not self.base_config_path.is_file():
            raise AvatarPresetDeleteError(
                f"Avatar preset config not found: {self.base_config_path}",
                status_code=500,
                code="avatar_preset_config_error",
            )
        original_config = self.base_config_path.read_bytes()
        try:
            base_raw = yaml.safe_load(original_config) or {}
        except Exception as exc:
            raise AvatarPresetDeleteError(
                f"Failed to parse system avatar presets: {exc}",
                status_code=500,
                code="avatar_preset_config_error",
            ) from exc
        if not isinstance(base_raw, dict):
            raise AvatarPresetDeleteError(
                "System avatar preset config must be a map",
                status_code=500,
                code="avatar_preset_config_error",
            )

        runtime_raw: Dict[str, Any] = {"version": 1, "presets": {}}
        runtime_config = b""
        if self.runtime_config_path.is_file():
            runtime_config = self.runtime_config_path.read_bytes()
            try:
                loaded = yaml.safe_load(runtime_config) or {}
            except Exception as exc:
                raise AvatarPresetDeleteError(
                    f"Failed to parse runtime avatar presets: {exc}",
                    status_code=500,
                    code="avatar_preset_config_error",
                ) from exc
            if not isinstance(loaded, dict):
                raise AvatarPresetDeleteError(
                    "Runtime avatar preset config must be a map",
                    status_code=500,
                    code="avatar_preset_config_error",
                )
            runtime_raw = loaded

        try:
            base_presets = AvatarPresetRegistry._parse_presets(
                base_raw,
                self.base_config_path,
                default_source="system",
            )
            runtime_presets = AvatarPresetRegistry._parse_presets(
                runtime_raw,
                self.runtime_config_path,
                allow_empty=True,
                default_source="user",
            )
        except AvatarPresetError as exc:
            raise AvatarPresetDeleteError(
                str(exc),
                status_code=500,
                code="avatar_preset_config_error",
            ) from exc

        by_id: Dict[str, tuple[AvatarPresetSpec, Path, str, bytes]] = {}
        for preset in base_presets:
            if preset.id in by_id:
                raise AvatarPresetDeleteError(
                    f"Duplicate avatar preset id: {preset.id}",
                    status_code=500,
                    code="avatar_preset_config_error",
                )
            by_id[preset.id] = (
                preset,
                self.base_config_path,
                "system",
                original_config,
            )
        for preset in runtime_presets:
            if preset.id in by_id:
                raise AvatarPresetDeleteError(
                    f"Duplicate avatar preset id: {preset.id}",
                    status_code=500,
                    code="avatar_preset_config_error",
                )
            by_id[preset.id] = (
                preset,
                self.runtime_config_path,
                "runtime",
                runtime_config,
            )
        located = by_id.get(preset_id)
        if located is None:
            raise AvatarPresetDeleteError(
                "Avatar preset not found",
                status_code=404,
                code="preset_not_found",
            )
        preset, config_path, config_kind, original = located

        if api_mode:
            if preset.source != "user":
                raise AvatarPresetDeleteError(
                    "System avatar presets cannot be deleted through the API",
                    status_code=403,
                    code="system_preset_protected",
                )
            if not owner_id or preset.owner_id != owner_id:
                raise AvatarPresetDeleteError(
                    "Avatar preset not found",
                    status_code=404,
                    code="preset_not_found",
                )

        remaining = [
            item for item in [*base_presets, *runtime_presets]
            if item.id != preset.id
        ]
        if not any(item.enabled for item in remaining):
            raise AvatarPresetDeleteError(
                "Cannot delete the last enabled avatar preset",
                status_code=409,
                code="last_enabled_preset",
            )

        base_default = str(base_raw.get("default_preset") or "").strip()
        runtime_default = str(
            runtime_raw.get("default_preset") or ""
        ).strip()
        effective_default = runtime_default or base_default
        if preset.id == effective_default:
            if not new_default_id:
                raise AvatarPresetDeleteError(
                    "Deleting the current default preset requires a new default",
                    status_code=409,
                    code="default_preset_requires_reassignment",
                )
            new_default = next(
                (
                    item for item in remaining
                    if item.id == new_default_id and item.enabled
                ),
                None,
            )
            if new_default is None:
                raise AvatarPresetDeleteError(
                    "The replacement default preset is missing or disabled",
                    code="invalid_default_preset",
                )
            if config_kind == "system" and new_default.source != "system":
                raise AvatarPresetDeleteError(
                    "A system preset must be replaced by another system preset",
                    code="invalid_default_preset",
                )
        elif new_default_id:
            raise AvatarPresetDeleteError(
                "new_default_id is only valid when deleting the default preset",
                code="invalid_default_preset",
            )

        warnings: list[str] = []
        if check_active and self.avatar_http_url:
            warnings.extend(self._check_active(preset))

        other_refs: Dict[str, Dict[Path, set[str]]] = {
            role: {} for role in _RESOURCE_ROLES
        }
        for item in remaining:
            for role, path in self._resources_for(item).items():
                other_refs[role].setdefault(path, set()).add(item.id)

        files_to_delete: Dict[str, Path] = {}
        files_retained: Dict[str, list[str]] = {}
        files_missing: list[str] = []
        for role, path in self._resources_for(preset).items():
            users = sorted(other_refs[role].get(path, set()))
            if users:
                files_retained[role] = users
            elif path.exists():
                files_to_delete[role] = path
            else:
                files_missing.append(role)

        if config_kind == "system":
            try:
                presets_map = base_raw.setdefault("presets", {})
                presets_map.pop(preset.id, None)
                if preset.id == effective_default:
                    base_raw["default_preset"] = new_default_id
            except Exception as exc:
                raise AvatarPresetDeleteError(
                    f"Failed to update system preset config: {exc}",
                    status_code=500,
                    code="avatar_preset_config_error",
                ) from exc
        else:
            try:
                presets_map = runtime_raw.setdefault("presets", {})
                presets_map.pop(preset.id, None)
                if runtime_default == preset.id:
                    runtime_raw["default_preset"] = new_default_id
            except Exception as exc:
                raise AvatarPresetDeleteError(
                    f"Failed to update runtime preset config: {exc}",
                    status_code=500,
                    code="avatar_preset_config_error",
                ) from exc

        plan = DeletePlan(
            preset=preset,
            config_path=config_path,
            config_kind=config_kind,
            base_raw=base_raw,
            runtime_raw=runtime_raw,
            original_config=original,
            new_default_id=new_default_id,
            files_to_delete=files_to_delete,
            files_retained=files_retained,
            files_missing=files_missing,
        )
        return plan, warnings

    def _resources_for(self, preset: AvatarPresetSpec) -> Dict[str, Path]:
        voice = self._safe_path(
            self.minicpm_root / preset.voice_ref,
            self.minicpm_root,
            f"voice_ref for {preset.id}",
        )
        prompt = self._safe_path(
            self.minicpm_root / preset.prompt_file,
            self.minicpm_root,
            f"prompt_file for {preset.id}",
        )
        cache = self._safe_path(
            self.avatar_cache_root / preset.avatar_id,
            self.musetalk_root,
            f"avatar cache for {preset.id}",
        )
        video = self._source_video(preset, cache)
        return {
            "voice_ref": voice,
            "prompt_file": prompt,
            "avatar_cache": cache,
            "source_video": video,
        }

    def _source_video(
        self,
        preset: AvatarPresetSpec,
        cache_dir: Path,
    ) -> Path:
        info_path = cache_dir / "avator_info.json"
        if info_path.is_file():
            try:
                info = json.loads(info_path.read_text(encoding="utf-8"))
            except Exception as exc:
                raise AvatarPresetDeleteError(
                    f"Failed to read {info_path}: {exc}",
                    status_code=500,
                    code="avatar_cache_invalid",
                ) from exc
            raw_video = str(info.get("video_path") or "").strip()
            if raw_video:
                candidate = Path(raw_video)
                if not candidate.is_absolute():
                    candidate = self.musetalk_root / candidate
                return self._safe_path(
                    candidate,
                    self.musetalk_root,
                    f"source video for {preset.id}",
                )
        return self._safe_path(
            self.video_root / f"{preset.avatar_id}.mp4",
            self.musetalk_root,
            f"source video for {preset.id}",
        )

    @staticmethod
    def _safe_path(candidate: Path, root: Path, label: str) -> Path:
        resolved = candidate.resolve(strict=False)
        root = root.resolve()
        try:
            resolved.relative_to(root)
        except ValueError as exc:
            raise AvatarPresetDeleteError(
                f"{label} escapes its managed root",
                status_code=500,
                code="unsafe_avatar_resource_path",
            ) from exc
        if resolved == root:
            raise AvatarPresetDeleteError(
                f"{label} resolves to a managed root",
                status_code=500,
                code="unsafe_avatar_resource_path",
            )
        return resolved

    def _check_active(self, preset: AvatarPresetSpec) -> list[str]:
        try:
            with urlopen(
                f"{self.avatar_http_url}/api/status",
                timeout=5,
            ) as response:
                status = json.loads(response.read().decode("utf-8"))
        except Exception as exc:
            return [f"Could not verify active avatar state: {exc}"]
        active_id = str(
            status.get("active_avatar_id")
            or status.get("avatar_id")
            or ""
        )
        if active_id == preset.avatar_id:
            raise AvatarPresetDeleteError(
                "Avatar preset is currently active",
                status_code=409,
                code="avatar_in_use",
            )
        return []

    @staticmethod
    def _plan_result(plan: DeletePlan, *, dry_run: bool) -> Dict[str, Any]:
        return {
            "deleted": False,
            "dry_run": dry_run,
            "preset_id": plan.preset.id,
            "source": plan.preset.source,
            "config_kind": plan.config_kind,
            "files_to_delete": [
                {"resource": role, "path": str(path)}
                for role, path in sorted(plan.files_to_delete.items())
            ],
            "files_retained": [
                {
                    "resource": role,
                    "used_by": users,
                }
                for role, users in sorted(plan.files_retained.items())
            ],
            "files_missing": sorted(plan.files_missing),
        }

    def _apply_plan(self, plan: DeletePlan) -> None:
        raw = plan.base_raw if plan.config_kind == "system" else plan.runtime_raw
        config_bytes = yaml.safe_dump(
            raw,
            allow_unicode=True,
            sort_keys=False,
            default_flow_style=False,
        ).encode("utf-8")
        plan.config_path.parent.mkdir(parents=True, exist_ok=True)
        self._atomic_write(plan.config_path, config_bytes)
        if plan.config_kind != "system":
            return
        try:
            self._update_manifest(
                config_path=plan.config_path,
                deleted_files=[
                    path for path in plan.files_to_delete.values()
                    if self._is_relative_to(path, self.minicpm_root)
                ],
            )
        except Exception:
            self._atomic_write(plan.config_path, plan.original_config)
            raise

    def _update_manifest(
        self,
        *,
        config_path: Path,
        deleted_files: list[Path],
    ) -> None:
        lines = self.manifest_path.read_text(encoding="utf-8").splitlines()
        config_entry = self._manifest_entry(config_path)
        updates = {config_entry: self._sha256(config_path)}
        removed = {self._manifest_entry(path) for path in deleted_files}
        new_lines: list[str] = []
        seen: set[str] = set()
        for line in lines:
            path = self._entry_path(line)
            if path in removed:
                continue
            if path in updates:
                line = f"{updates[path]}  {path}"
                seen.add(path)
            new_lines.append(line)
        for path, digest in updates.items():
            if path in seen:
                continue
            group = path.rsplit("/", 1)[0] + "/"
            insert_at = len(new_lines)
            for index, line in enumerate(new_lines):
                existing = self._entry_path(line)
                if existing is not None and existing.startswith(group):
                    insert_at = index + 1
            new_lines.insert(insert_at, f"{digest}  {path}")
        self._atomic_write(
            self.manifest_path,
            ("\n".join(new_lines) + "\n").encode("utf-8"),
        )

    def _delete_files(self, plan: DeletePlan) -> Dict[str, list[Dict[str, str]]]:
        deleted: list[Dict[str, str]] = []
        failed: list[Dict[str, str]] = []
        for role, path in sorted(plan.files_to_delete.items()):
            try:
                if path.is_dir():
                    shutil.rmtree(path)
                elif path.exists():
                    path.unlink()
                else:
                    continue
                deleted.append({"resource": role, "path": str(path)})
            except Exception as exc:
                logger.exception(
                    "failed to delete avatar resource %s: %s",
                    path,
                    exc,
                )
                failed.append(
                    {
                        "resource": role,
                        "path": str(path),
                        "error": str(exc),
                    }
                )
        return {"deleted": deleted, "failed": failed}

    def _manifest_entry(self, path: Path) -> str:
        relative = path.resolve().relative_to(self.minicpm_root.resolve())
        return f"./{relative.as_posix()}"

    @staticmethod
    def _entry_path(line: str) -> Optional[str]:
        parts = line.split(maxsplit=1)
        if len(parts) != 2 or len(parts[0]) != 64:
            return None
        return parts[1]

    @staticmethod
    def _sha256(path: Path) -> str:
        digest = hashlib.sha256()
        with path.open("rb") as stream:
            for chunk in iter(lambda: stream.read(1024 * 1024), b""):
                digest.update(chunk)
        return digest.hexdigest()

    @staticmethod
    def _atomic_write(path: Path, data: bytes) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        mode = path.stat().st_mode if path.exists() else 0o644
        fd, temporary = tempfile.mkstemp(
            prefix=f".{path.name}.",
            dir=path.parent,
        )
        try:
            with os.fdopen(fd, "wb") as stream:
                stream.write(data)
                stream.flush()
                os.fsync(stream.fileno())
            os.chmod(temporary, mode)
            os.replace(temporary, path)
        finally:
            try:
                os.unlink(temporary)
            except FileNotFoundError:
                pass

    @staticmethod
    def _is_relative_to(path: Path, root: Path) -> bool:
        try:
            path.resolve().relative_to(root.resolve())
            return True
        except ValueError:
            return False


def main(argv: Optional[list[str]] = None) -> int:
    parser = argparse.ArgumentParser(
        description="Delete an avatar preset and its unshared resources",
    )
    parser.add_argument("preset_id")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--json", action="store_true")
    parser.add_argument("--new-default")
    parser.add_argument("--avatar-http-url", default="http://127.0.0.1:8000")
    args = parser.parse_args(argv)

    manager = AvatarPresetAdminService(
        project_root=Path(__file__).resolve().parents[2],
        avatar_http_url=args.avatar_http_url,
    )
    try:
        result = manager.delete(
            args.preset_id,
            new_default_id=args.new_default,
            dry_run=args.dry_run,
        )
    except AvatarPresetDeleteError as exc:
        if args.json:
            print(json.dumps({
                "deleted": False,
                "code": exc.code,
                "message": str(exc),
            }, ensure_ascii=False))
        else:
            print(f"ERROR: {exc}", file=sys.stderr)
        return 1

    if args.json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 0

    if result["dry_run"]:
        print("Dry run: no files will be written or deleted.")
    print(
        f"Preset {'would be' if result['dry_run'] else ''} deleted: "
        f"{result['preset_id']} (source={result['source']})"
    )
    for item in result["files_to_delete"]:
        print(f"  delete {item['resource']}: {item['path']}")
    for item in result["files_retained"]:
        print(
            f"  keep   {item['resource']}: shared by "
            f"{', '.join(item['used_by'])}"
        )
    for role in result["files_missing"]:
        print(f"  missing {role}")
    cleanup = result.get("resource_cleanup", {})
    for item in cleanup.get("failed", []):
        print(
            f"  warning: failed to delete {item['resource']}: "
            f"{item['error']}",
            file=sys.stderr,
        )
    return 0


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    raise SystemExit(main())
