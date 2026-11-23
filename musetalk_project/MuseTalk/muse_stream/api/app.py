"""FastAPI application composition."""

from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from ..config import WEB_DIR
from ..state import AppState
from . import audio_websocket, routes, websocket


def create_app(state: AppState) -> FastAPI:
    @asynccontextmanager
    async def lifespan(app):
        try:
            yield
        finally:
            from ..lifecycle import shutdown
            await asyncio.to_thread(shutdown, state)

    app = FastAPI(title="MuseTalk Streaming Preview", lifespan=lifespan)
    app.state.stream_state = state
    app.mount("/static", StaticFiles(directory=str(WEB_DIR)), name="static")

    @app.middleware("http")
    async def no_cache_ui(request, call_next):
        response = await call_next(request)
        path = request.url.path
        if (
            path == "/"
            or path.startswith("/static/")
            or path.startswith("/api/")
        ):
            response.headers["Cache-Control"] = (
                "no-store, no-cache, must-revalidate, max-age=0"
            )
            response.headers["Pragma"] = "no-cache"
        return response

    app.include_router(routes.router)
    app.include_router(audio_websocket.router)
    app.include_router(websocket.router)
    return app
