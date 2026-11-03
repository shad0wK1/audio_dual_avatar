"""HTTP routes for the streaming preview."""

from __future__ import annotations

import asyncio
import time
from typing import Any

from fastapi import APIRouter, Body, HTTPException, Request
from fastapi.responses import FileResponse
from pydantic import BaseModel

from ..avatar_registry import (
    AvatarError,
    activate_avatar,
    list_avatar_caches,
)
from ..audio.segments import SegmentManager
from ..config import WEB_DIR
from ..state import AppState


router = APIRouter()


class AvatarSelectRequest(BaseModel):
    avatar_id: str | None = None


def _state(request: Request) -> AppState:
    return request.app.state.stream_state


@router.get("/")
async def index() -> FileResponse:
    return FileResponse(WEB_DIR / "index.html")


@router.get("/api/status")
async def status(request: Request) -> dict[str, Any]:
    state = _state(request)
    now = time.monotonic()
    with state.pipeline.lock:
        generating_segments = state.pipeline.generating
        total_segments = len(state.pipeline.segments)
        latest_media_segment_id = state.pipeline.latest_media_segment_id
        latest_media_end_frame = state.pipeline.latest_media_end_frame
        interrupt_active = state.interrupt.active
        interrupt_source = (
            state.interrupt.source.id
            if state.interrupt.source is not None
            else None
        )
        interrupt_remaining = (
            max(0.0, state.interrupt.deadline - now)
            if state.interrupt.active
            else 0.0
        )
        interrupt_count = state.interrupt.interrupt_count
        resume_count = state.interrupt.resume_count
    queued_segments = SegmentManager(state).queued_count()
    playback_complete = (
        state.viewer.connected
        and state.viewer.playback_started
        and not interrupt_active
        and queued_segments == 0
        and generating_segments == 0
        and latest_media_end_frame >= 0
        and state.pipeline.media_ack_frame >= latest_media_end_frame
    )
    args = state.args
    return {
        "status": state.service.status,
        "ready": state.service.ready,
        "error": state.service.error,
        "accepting_streams": state.service.accepting_streams,
        "avatar_id": state.model.avatar_id,
        "default_avatar_id": state.model.default_avatar_id,
        "avatar_revision": state.model.avatar_revision,
        "avatar_ready": state.model.avatar_ready,
        "avatar_switching": state.model.avatar_switching,
        "fps": state.model.fps,
        "batch_size": args.batch_size if args else state.model.batch_size,
        "prebuffer": state.model.prebuffer,
        "width": state.model.width,
        "height": state.model.height,
        "audio_dir": args.audio_dir if args else "",
        "idle_timeout_seconds": args.idle_timeout_seconds if args else 30,
        "interrupt_wait_seconds": (
            args.interrupt_wait_seconds if args else 10
        ),
        "interrupt_resume_mode": (
            args.interrupt_resume_mode if args else "restart"
        ),
        "max_prefetch_seconds": args.max_prefetch_seconds if args else 6,
        "idle_prebuffer_frames": getattr(args, "idle_prebuffer_frames", 8),
        "input_mode": args.input_mode if args else "file",
        "context_left_ms": (
            args.stream_context_left_ms if args else 0
        ),
        "context_right_ms": (
            args.stream_context_right_ms if args else 0
        ),
        "overlap_frames": args.stream_overlap_frames if args else 0,
        "pause_overlap_frames": (
            args.stream_pause_overlap_frames if args else 0
        ),
        "pause_boundary_frames": (
            args.stream_pause_boundary_frames if args else 0
        ),
        "feature_window_mode": (
            args.feature_window_mode if args else "legacy"
        ),
        "face_stability_strength": getattr(args, "face_stability_strength", 0.0),
        "feature_window_left": args.feature_window_left if args else 4,
        "feature_window_right": args.feature_window_right if args else 6,
        "stream_connected": state.stream_input.connected,
        "stream_samples_received": state.stream_input.samples_received,
        "stream_windows_submitted": state.stream_input.windows_submitted,
        "stream_dropped_samples": state.stream_input.dropped_samples,
        "viewer_connected": state.viewer.connected,
        "playback_started": state.viewer.playback_started,
        "interrupt_active": interrupt_active,
        "interrupt_source": interrupt_source,
        "interrupt_remaining_seconds": round(interrupt_remaining, 1),
        "interrupt_count": interrupt_count,
        "resume_count": resume_count,
        "queued_segments": queued_segments,
        "generating_segments": generating_segments,
        "total_segments": total_segments,
        "latest_media_segment_id": latest_media_segment_id,
        "latest_media_end_frame": latest_media_end_frame,
        "playback_complete": playback_complete,
        "ack_frame": state.pipeline.ack_frame,
        "media_ack_frame": state.pipeline.media_ack_frame,
        "generated_frames": state.pipeline.generated_frames,
        "silent_frames": state.pipeline.silent_frames,
        "idle_frames": state.pipeline.idle_frames,
        "hold_frames": state.pipeline.hold_frames,
        "last_audio_age": (
            round(now - state.ingest.last_audio_seen, 1)
            if state.ingest.last_audio_seen
            else None
        ),
        "exit_reason": state.service.exit_reason or None,
    }


@router.get("/api/avatars")
async def avatars(request: Request) -> dict[str, Any]:
    state = _state(request)
    if state.args is None:
        raise HTTPException(status_code=503, detail="Service not configured")
    caches = await asyncio.to_thread(
        list_avatar_caches,
        state.args.version,
        state.model.default_avatar_id,
    )
    return {
        "default_avatar_id": state.model.default_avatar_id,
        "active_avatar_id": state.model.avatar_id,
        "avatar_revision": state.model.avatar_revision,
        "avatar_ready": state.model.avatar_ready,
        "avatar_switching": state.model.avatar_switching,
        "avatars": [cache.to_dict() for cache in caches],
    }


@router.get("/api/avatar")
async def current_avatar(request: Request) -> dict[str, Any]:
    state = _state(request)
    return {
        "avatar_id": state.model.avatar_id,
        "default_avatar_id": state.model.default_avatar_id,
        "avatar_revision": state.model.avatar_revision,
        "avatar_ready": state.model.avatar_ready,
        "avatar_switching": state.model.avatar_switching,
        "width": state.model.width,
        "height": state.model.height,
    }


@router.post("/api/avatar/select")
async def select_avatar(
    request: Request,
    payload: AvatarSelectRequest | None = Body(default=None),
) -> dict[str, Any]:
    state = _state(request)
    try:
        info = await asyncio.to_thread(
            activate_avatar,
            state,
            payload.avatar_id if payload is not None else None,
        )
    except AvatarError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail={"code": exc.code, "message": str(exc)},
        ) from exc
    return {
        "success": True,
        **info.to_dict(),
        "default_avatar_id": state.model.default_avatar_id,
        "active_avatar_id": state.model.avatar_id,
        "avatar_revision": state.model.avatar_revision,
    }


@router.get("/api/live/audio/{segment_id}")
async def live_audio(segment_id: int, request: Request) -> FileResponse:
    state = _state(request)
    segment = state.pipeline.segments.get(segment_id)
    if segment is None:
        raise HTTPException(status_code=404, detail="Unknown live segment")
    return FileResponse(
        segment.playback_wav_path or segment.wav_path,
        media_type="audio/wav",
        headers={"Cache-Control": "no-store"},
    )
