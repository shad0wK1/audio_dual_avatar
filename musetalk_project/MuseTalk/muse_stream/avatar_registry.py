"""Discover, validate and activate preprocessed local avatar caches."""

from __future__ import annotations

import ctypes
import gc
import json
import pickle
import queue
import re
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

from .config import ROOT
from .log import log
from .models import cache_dir_for, load_cached_avatar, warmup_speech_features
from .state import AppState


_AVATAR_ID_RE = re.compile(r"^[A-Za-z0-9_-]{1,128}$")
_REQUIRED_FILES = (
    "latents.pt",
    "coords.pkl",
    "mask_coords.pkl",
    "avator_info.json",
)


class AvatarError(RuntimeError):
    status_code = 400
    code = "avatar_error"


class AvatarNotFoundError(AvatarError):
    status_code = 404
    code = "avatar_not_found"


class AvatarInvalidError(AvatarError):
    status_code = 422
    code = "avatar_invalid"


class AvatarBusyError(AvatarError):
    status_code = 409
    code = "avatar_busy"


class AvatarUnavailableError(AvatarError):
    status_code = 503
    code = "avatar_unavailable"


class AvatarActivationError(AvatarError):
    status_code = 500
    code = "avatar_activation_failed"


class AvatarSwitchingError(AvatarError):
    status_code = 409
    code = "avatar_switching"


@dataclass(frozen=True)
class AvatarCacheInfo:
    id: str
    valid: bool
    width: int = 0
    height: int = 0
    frame_count: int = 0
    source_frame_count: int = 0
    error: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def validate_avatar_id(avatar_id: str) -> str:
    value = str(avatar_id or "").strip()
    if not value or not _AVATAR_ID_RE.fullmatch(value):
        raise AvatarNotFoundError(f"Invalid avatar id: {avatar_id!r}")
    return value


def avatar_cache_root(version: str) -> Path:
    if version == "v15":
        return ROOT / "results" / "v15" / "avatars"
    return ROOT / "results" / "avatars"


def _numbered_files(directory: Path) -> list[Path]:
    files = [
        path
        for path in directory.iterdir()
        if path.is_file() and path.suffix.lower() in {".png", ".jpg", ".jpeg"}
    ]
    try:
        files.sort(key=lambda path: int(path.stem))
    except ValueError as exc:
        raise AvatarInvalidError(
            f"Non-numeric frame filename in {directory.name}"
        ) from exc
    indices = [int(path.stem) for path in files]
    if indices != list(range(len(indices))):
        raise AvatarInvalidError(
            f"Avatar frame sequence in {directory.name} is not contiguous"
        )
    return files


def _load_sequence_length(path: Path, loader):
    try:
        with open(path, "rb") as stream:
            value = loader(stream)
    except Exception as exc:
        raise AvatarInvalidError(f"Failed to read {path.name}: {exc}") from exc
    if not isinstance(value, (list, tuple)):
        raise AvatarInvalidError(f"{path.name} is not a sequence")
    return len(value)


def inspect_avatar_cache(avatar_id: str, version: str) -> AvatarCacheInfo:
    """Return bounded metadata for a local cache without loading full frames."""
    try:
        avatar_id = validate_avatar_id(avatar_id)
    except AvatarError as exc:
        return AvatarCacheInfo(id=str(avatar_id), valid=False, error=str(exc))

    cache_dir = cache_dir_for(avatar_id, version)
    if not cache_dir.is_dir():
        return AvatarCacheInfo(
            id=avatar_id,
            valid=False,
            error=f"Avatar cache not found: {avatar_id}",
        )

    try:
        for name in _REQUIRED_FILES:
            path = cache_dir / name
            if not path.is_file() or path.stat().st_size == 0:
                raise AvatarInvalidError(f"Missing or empty cache file: {name}")

        with open(cache_dir / "avator_info.json", "r", encoding="utf-8") as stream:
            info = json.load(stream)
        if str(info.get("version", version)) != version:
            raise AvatarInvalidError(
                f"Cache version {info.get('version')!r} does not match {version}"
            )
        expected_bbox = 0 if version == "v15" else int(info.get("bbox_shift", 0))
        if int(info.get("bbox_shift", 0)) != expected_bbox:
            raise AvatarInvalidError(
                f"Cache bbox_shift {info.get('bbox_shift')} is incompatible"
            )

        frame_files = _numbered_files(cache_dir / "full_imgs")
        mask_files = _numbered_files(cache_dir / "mask")
        if not frame_files:
            raise AvatarInvalidError("Avatar cache contains no source frames")
        if len(mask_files) != len(frame_files):
            raise AvatarInvalidError(
                f"Frame/mask count mismatch: {len(frame_files)}/{len(mask_files)}"
            )

        from .inference.restoration import gpen_enabled, load_alignment_cache
        if gpen_enabled():
            load_alignment_cache(cache_dir, len(frame_files))

        import cv2
        import torch

        first_frame = cv2.imread(str(frame_files[0]))
        first_mask = cv2.imread(str(mask_files[0]), cv2.IMREAD_GRAYSCALE)
        if first_frame is None or first_mask is None:
            raise AvatarInvalidError("First frame or mask cannot be decoded")
        height, width = first_frame.shape[:2]

        latent_count = _load_sequence_length(
            cache_dir / "latents.pt",
            lambda stream: torch.load(
                stream,
                map_location="cpu",
                weights_only=True,
            ),
        )
        coord_count = _load_sequence_length(
            cache_dir / "coords.pkl",
            pickle.load,
        )
        mask_coord_count = _load_sequence_length(
            cache_dir / "mask_coords.pkl",
            pickle.load,
        )
        expected = len(frame_files)
        if {latent_count, coord_count, mask_coord_count} != {expected}:
            raise AvatarInvalidError(
                "Frame sequence count mismatch: "
                f"frames={expected}, latents={latent_count}, "
                f"coords={coord_count}, mask_coords={mask_coord_count}"
            )

        source_count = expected // 2 if expected % 2 == 0 else expected
        return AvatarCacheInfo(
            id=avatar_id,
            valid=True,
            width=width,
            height=height,
            frame_count=expected,
            source_frame_count=source_count,
        )
    except AvatarError as exc:
        return AvatarCacheInfo(id=avatar_id, valid=False, error=str(exc))
    except Exception as exc:
        return AvatarCacheInfo(
            id=avatar_id,
            valid=False,
            error=f"{type(exc).__name__}: {exc}",
        )


def list_avatar_caches(
    version: str,
    default_avatar_id: str,
) -> list[AvatarCacheInfo]:
    root = avatar_cache_root(version)
    if not root.is_dir():
        return []
    caches = [
        inspect_avatar_cache(path.name, version)
        for path in root.iterdir()
        if path.is_dir() and _AVATAR_ID_RE.fullmatch(path.name)
    ]
    caches.sort(
        key=lambda item: (
            item.id != default_avatar_id,
            not item.valid,
            item.id,
        )
    )
    return caches


def _busy_reason(state: AppState) -> str | None:
    if not state.service.ready or state.model.runtime is None:
        return "服务尚未就绪"
    if state.model.avatar_leases > 0:
        return "已有数字人会话占用当前 avatar"
    if state.viewer.connected or state.viewer.stream_lock.locked():
        return "已有数字人 viewer 连接"
    if state.stream_input.connected or state.stream_input.lock.locked():
        return "已有音频上游连接"
    with state.pipeline.lock:
        if state.pipeline.generating > 0:
            return "仍有帧正在生成"
    return None


def _drain_std_queue(value: Any) -> None:
    while True:
        try:
            value.get_nowait()
        except queue.Empty:
            return


def _reset_pipeline_after_switch(state: AppState) -> None:
    with state.pipeline.lock:
        _drain_std_queue(state.pipeline.answer_queue)
        _drain_std_queue(state.pipeline.resume_queue)
        _drain_std_queue(state.pipeline.normal_queue)
        state.pipeline.segments.clear()
        state.pipeline.canceled_ids.clear()
        state.pipeline.cancel_segment_id = None
        state.pipeline.global_frames = 0
        state.pipeline.next_id = 0
        state.pipeline.ack_frame = -1
        state.pipeline.media_ack_frame = -1
        state.pipeline.generated_frames = 0
        state.pipeline.silent_frames = 0
        state.pipeline.idle_frames = 0
        state.pipeline.hold_frames = 0
        state.pipeline.generating = 0
        state.pipeline.latest_media_segment_id = -1
        state.pipeline.latest_media_end_frame = -1
        state.pipeline.flush_seq += 1
        state.pipeline.flush_frame = -1
    state.interrupt.active = False
    state.interrupt.deadline = 0.0
    state.interrupt.source = None
    state.interrupt.source_frame = 0
    state.interrupt.reset_frame = -1
    state.interrupt.resume_segments.clear()


def _release_avatar(state: AppState) -> None:
    state.model.avatar = None
    gc.collect()
    # OpenCV/NumPy allocate the decoded frame cache through glibc. Python's
    # gc releases the objects but glibc may retain the large arenas, so ask
    # it to return free pages before loading the next multi-hundred-MB cache.
    try:
        ctypes.CDLL("libc.so.6").malloc_trim(0)
    except (OSError, AttributeError):
        pass


def _install_avatar(
    state: AppState,
    avatar_id: str,
    avatar: Any,
    *,
    increment_revision: bool = True,
) -> tuple[int, int]:
    frames = getattr(avatar, "frame_list_cycle", None)
    if not frames:
        raise AvatarInvalidError("Loaded avatar contains no frames")
    height, width = frames[0].shape[:2]
    state.model.avatar = avatar
    state.model.avatar_id = avatar_id
    state.model.width = int(width)
    state.model.height = int(height)
    if increment_revision:
        state.model.avatar_revision += 1
    return int(width), int(height)


def activate_avatar(
    state: AppState,
    avatar_id: str | None = None,
) -> AvatarCacheInfo:
    """Activate one local cache, or the configured default when omitted."""
    args = state.args
    runtime = state.model.runtime
    if args is None or runtime is None:
        raise AvatarUnavailableError("Avatar runtime is not initialized")

    target_id = (
        str(avatar_id).strip()
        if avatar_id is not None and str(avatar_id).strip()
        else state.model.default_avatar_id
    )
    target_id = validate_avatar_id(target_id)
    info = inspect_avatar_cache(target_id, args.version)
    if not info.valid:
        if not cache_dir_for(target_id, args.version).is_dir():
            raise AvatarNotFoundError(info.error or f"Unknown avatar: {target_id}")
        raise AvatarInvalidError(info.error or f"Invalid avatar: {target_id}")

    with state.model.avatar_lock:
        if state.model.avatar_switching:
            raise AvatarSwitchingError("Avatar is already being switched")
        if (
            state.model.avatar_ready
            and state.model.avatar_id == target_id
            and state.model.avatar is not None
        ):
            # Native /avatar activates its selection before opening the microphone,
            # including when it reuses the current avatar after a long idle period.
            if not state.model.avatar_leases and not state.viewer.connected and not state.stream_input.connected:
                warmup_speech_features(runtime, args)
            return info

        previous_id = state.model.avatar_id
        with state.model.avatar_admission_lock:
            reason = _busy_reason(state)
            if reason:
                raise AvatarBusyError(reason)
            state.model.avatar_switching = True
            state.model.avatar_ready = False
        try:
            _release_avatar(state)
            _reset_pipeline_after_switch(state)
            avatar = load_cached_avatar(args, runtime, target_id)
            width, height = _install_avatar(state, target_id, avatar)
            with state.model.avatar_admission_lock:
                state.model.avatar_ready = True
                state.model.avatar_switching = False
            log(
                f"avatar activated: id={target_id} "
                f"size={width}x{height} "
                f"revision={state.model.avatar_revision}"
            )
            return AvatarCacheInfo(
                id=target_id,
                valid=True,
                width=width,
                height=height,
                frame_count=info.frame_count,
                source_frame_count=info.source_frame_count,
            )
        except Exception as exc:
            log(
                f"avatar activation failed: id={target_id} "
                f"error={type(exc).__name__}: {exc}"
            )
            _release_avatar(state)
            if previous_id:
                try:
                    previous = load_cached_avatar(args, runtime, previous_id)
                    _install_avatar(
                        state,
                        previous_id,
                        previous,
                        increment_revision=False,
                    )
                    with state.model.avatar_admission_lock:
                        state.model.avatar_ready = True
                    log(f"avatar rollback succeeded: id={previous_id}")
                except Exception as rollback_exc:
                    with state.model.avatar_admission_lock:
                        state.model.avatar_ready = False
                    log(
                        f"avatar rollback failed: id={previous_id} "
                        f"error={type(rollback_exc).__name__}: {rollback_exc}"
                    )
            raise AvatarActivationError(
                f"Failed to activate avatar {target_id}: {exc}"
            ) from exc
        finally:
            with state.model.avatar_admission_lock:
                state.model.avatar_switching = False
