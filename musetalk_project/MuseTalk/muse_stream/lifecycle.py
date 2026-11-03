"""Application lifecycle and model initialization."""

from __future__ import annotations

import threading
import time
import traceback

from .audio.ingest import DirectoryAudioIngestor
from .log import log
from .models import build_avatar, build_runtime, warmup
from .state import AppState


def request_live_exit(state: AppState, reason: str) -> None:
    if state.service.exit_requested:
        return
    state.service.exit_requested = True
    state.service.exit_reason = reason
    state.service.accepting_streams = False
    state.service.status = "exiting"
    log(f"live exit requested: {reason}")

    def _shutdown() -> None:
        time.sleep(1.0)
        if state.service.uvicorn_server is not None:
            state.service.uvicorn_server.should_exit = True

    threading.Thread(target=_shutdown, daemon=True).start()


def initialize(state: AppState) -> None:
    try:
        args = state.args
        assert args is not None
        state.service.status = "loading_models"
        runtime = build_runtime(args)
        state.model.runtime = runtime

        state.service.status = "loading_avatar"
        state.model.avatar = build_avatar(
            args,
            runtime,
            state.model.avatar_id,
        )
        # Face detection enables autotuning during preparation. Restore the
        # inference policy and warm up again after all preparation imports.
        import torch
        torch.backends.cudnn.benchmark = False
        warmup(runtime, args.batch_size)
        if state.model.avatar.frame_list_cycle:
            frame = state.model.avatar.frame_list_cycle[0]
            state.model.height, state.model.width = frame.shape[:2]
        state.model.avatar_ready = True
        state.model.avatar_revision = 1

        state.service.status = "ready"
        state.service.ready = True
        state.service.ready_time = time.monotonic()
        state.ingest.last_audio_seen = state.service.ready_time
        state.viewer.last_ack_time = state.service.ready_time
        if args.input_mode in ("file", "hybrid"):
            ingestor = DirectoryAudioIngestor(
                state,
                on_idle_exit=lambda reason: request_live_exit(state, reason),
            )
            threading.Thread(target=ingestor.run, daemon=True).start()
        else:
            # Stream mode still needs the shared idle-exit monitor.
            from .audio.idle import IdleExitMonitor

            monitor = IdleExitMonitor(
                state,
                on_idle_exit=lambda reason: request_live_exit(state, reason),
            )
            threading.Thread(target=monitor.run, daemon=True).start()
        log("ready")
    except Exception as exc:  # pragma: no cover - surfaced through /api/status
        state.model.avatar_ready = False
        state.model.avatar_switching = False
        state.service.status = "error"
        state.service.error = f"{type(exc).__name__}: {exc}"
        log(traceback.format_exc())
