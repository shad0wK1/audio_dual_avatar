"""Process entrypoint for the streaming application."""

from __future__ import annotations

import os
import sys
import threading

from .config import build_parser, configure_state, load_config
from .lifecycle import initialize, shutdown
from .log import log
from .state import AppState


def run(state: AppState, app) -> None:
    import uvicorn

    parser = build_parser()
    args = parser.parse_args()
    configure_state(state, load_config(args.config))
    threading.Thread(target=initialize, args=(state,), daemon=True).start()
    config = uvicorn.Config(
        app,
        host=state.args.host,
        port=state.args.port,
        log_level="info",
    )
    server = uvicorn.Server(config)
    state.service.uvicorn_server = server
    try:
        server.run()
    finally:
        shutdown(state)
    log("uvicorn stopped; forcing process exit")
    try:
        sys.stdout.flush()
        sys.stderr.flush()
    except Exception:
        pass
    # TensorFlow/CUDA may leave non-daemon threads behind. os._exit avoids
    # requiring a manual Ctrl+C after uvicorn has already shut down.
    os._exit(0)
