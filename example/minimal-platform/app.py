"""Minimal HTTPS BFF for calling a remote Avatar Session API.

The browser talks only to this service.  This service owns the upstream API
key and trusts the optional custom CA used by the digital-human deployment.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import os
import re
import ssl
from contextlib import asynccontextmanager
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Optional
from urllib.parse import urlencode, urlsplit, urlunsplit

import httpx
import websockets
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles


BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
load_dotenv(BASE_DIR / ".env")

logger = logging.getLogger("minimal_platform")
_SESSION_ID_RE = re.compile(r"^avs_[A-Za-z0-9_-]{1,80}$")
_PRESET_ID_RE = re.compile(r"^[A-Za-z0-9_-]{1,64}$")


@dataclass(frozen=True)
class Settings:
    avatar_api_base_url: str
    avatar_api_key: str = ""
    avatar_ca_bundle: Optional[str] = None
    avatar_owner_id: str = "platform-demo"
    upstream_timeout_seconds: float = 60.0
    max_request_body_bytes: int = 64 * 1024
    websocket_max_message_bytes: int = 16 * 1024 * 1024
    customization_max_upload_bytes: int = 230 * 1024 * 1024
    allowed_origins: tuple[str, ...] = ()

    @classmethod
    def from_env(cls) -> "Settings":
        base_url = os.getenv("AVATAR_API_BASE_URL", "").strip().rstrip("/")
        ca_bundle = os.getenv("AVATAR_CA_BUNDLE", "").strip() or None
        origins = tuple(
            value.strip()
            for value in os.getenv(
                "PLATFORM_ALLOWED_ORIGINS",
                os.getenv("PLATFORM_PUBLIC_ORIGIN", ""),
            ).split(",")
            if value.strip()
        )
        return cls(
            avatar_api_base_url=base_url,
            avatar_api_key=os.getenv("AVATAR_API_KEY", "").strip(),
            avatar_ca_bundle=ca_bundle,
            avatar_owner_id=os.getenv(
                "PLATFORM_AVATAR_OWNER_ID",
                "platform-demo",
            ).strip() or "platform-demo",
            upstream_timeout_seconds=float(
                os.getenv("UPSTREAM_TIMEOUT_SECONDS", "60")
            ),
            max_request_body_bytes=int(
                os.getenv("MAX_REQUEST_BODY_BYTES", str(64 * 1024))
            ),
            websocket_max_message_bytes=int(
                os.getenv(
                    "WEBSOCKET_MAX_MESSAGE_BYTES",
                    str(16 * 1024 * 1024),
                )
            ),
            customization_max_upload_bytes=int(
                os.getenv(
                    "CUSTOMIZATION_MAX_UPLOAD_BYTES",
                    str(230 * 1024 * 1024),
                )
            ),
            allowed_origins=origins,
        )

    def validate(self) -> None:
        if not self.avatar_api_base_url:
            raise ValueError("AVATAR_API_BASE_URL is required")
        parsed = urlsplit(self.avatar_api_base_url)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise ValueError(
                "AVATAR_API_BASE_URL must be an http:// or https:// URL"
            )
        if self.avatar_ca_bundle:
            ca_path = Path(self.avatar_ca_bundle)
            if not ca_path.is_file():
                raise ValueError(f"AVATAR_CA_BUNDLE not found: {ca_path}")
        if self.upstream_timeout_seconds <= 0:
            raise ValueError("UPSTREAM_TIMEOUT_SECONDS must be > 0")
        if self.max_request_body_bytes <= 0:
            raise ValueError("MAX_REQUEST_BODY_BYTES must be > 0")
        if self.websocket_max_message_bytes <= 0:
            raise ValueError("WEBSOCKET_MAX_MESSAGE_BYTES must be > 0")
        if self.customization_max_upload_bytes <= 0:
            raise ValueError("CUSTOMIZATION_MAX_UPLOAD_BYTES must be > 0")


def create_app(
    settings: Optional[Settings] = None,
    *,
    transport: Optional[httpx.AsyncBaseTransport] = None,
) -> FastAPI:
    configured = settings or Settings.from_env()
    config_error: Optional[str] = None
    try:
        configured.validate()
    except ValueError as exc:
        config_error = str(exc)
        logger.warning("avatar BFF configuration incomplete: %s", exc)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        app.state.http_client = httpx.AsyncClient(
            timeout=configured.upstream_timeout_seconds,
            verify=configured.avatar_ca_bundle or True,
            transport=transport,
        )
        try:
            yield
        finally:
            await app.state.http_client.aclose()

    app = FastAPI(
        title="Minimal Avatar Platform BFF",
        version="1.0.0",
        lifespan=lifespan,
    )
    app.state.settings = configured
    app.state.config_error = config_error

    if configured.allowed_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=list(configured.allowed_origins),
            allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
            allow_headers=["Content-Type"],
            allow_credentials=False,
        )

    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

    @app.get("/", include_in_schema=False)
    async def index() -> FileResponse:
        return FileResponse(
            STATIC_DIR / "index.html",
            headers={"Cache-Control": "no-cache"},
        )

    @app.get("/healthz")
    async def healthz() -> JSONResponse:
        if config_error:
            return JSONResponse(
                {
                    "status": "error",
                    "configured": False,
                    "message": config_error,
                },
                status_code=503,
            )
        return JSONResponse({"status": "ok", "configured": True})

    @app.get("/readyz")
    async def readyz(request: Request) -> JSONResponse:
        _require_configured(request)
        try:
            response = await request.app.state.http_client.get(
                _upstream_url(configured, "/health")
            )
            response.raise_for_status()
        except Exception as exc:
            return _upstream_error(exc)
        return JSONResponse({"status": "ready", "upstream_status": 200})

    @app.get("/api/avatar/presets")
    async def avatar_presets(request: Request) -> Response:
        _require_configured(request)
        try:
            response = await request.app.state.http_client.get(
                _upstream_url(configured, "/v1/avatar/presets"),
                headers=_upstream_headers(configured),
            )
        except Exception as exc:
            return _upstream_error(exc)
        return _pass_through(response)

    @app.delete("/api/avatar/presets/{preset_id}")
    async def delete_avatar_preset(preset_id: str, request: Request) -> Response:
        _require_configured(request)
        if not _PRESET_ID_RE.fullmatch(preset_id):
            return _local_error(400, "invalid_preset_id", "Invalid preset id")
        switch_to_default = request.query_params.get(
            "switch_to_default",
            "",
        ).lower() in {"1", "true", "yes", "on"}
        params = (
            {"switch_to_default": "true"}
            if switch_to_default
            else None
        )
        try:
            response = await request.app.state.http_client.delete(
                _upstream_url(
                    configured,
                    f"/v1/avatar/presets/{preset_id}",
                ),
                headers=_upstream_headers(configured),
                params=params,
            )
        except Exception as exc:
            return _upstream_error(exc)
        return _pass_through(response)

    @app.post("/api/avatar/sessions")
    async def create_avatar_session(request: Request) -> Response:
        _require_configured(request)
        body = await request.body()
        if len(body) > configured.max_request_body_bytes:
            return _local_error(
                413,
                "request_too_large",
                "Request body is too large",
            )
        try:
            payload = json.loads(body)
        except (UnicodeDecodeError, json.JSONDecodeError):
            return _local_error(400, "invalid_json", "Request is not valid JSON")
        if not isinstance(payload, dict):
            return _local_error(400, "invalid_json", "JSON object required")

        headers = _upstream_headers(configured)
        headers["Content-Type"] = "application/json"
        try:
            response = await request.app.state.http_client.post(
                _upstream_url(configured, "/v1/avatar/sessions"),
                headers=headers,
                json=payload,
            )
        except Exception as exc:
            return _upstream_error(exc)
        if response.status_code not in {200, 201}:
            return _pass_through(response)
        try:
            created = response.json()
        except Exception:
            return _local_error(
                502,
                "invalid_upstream_response",
                "Upstream session response is not valid JSON",
            )
        if not isinstance(created, dict):
            return _local_error(
                502,
                "invalid_upstream_response",
                "Upstream session response must be an object",
            )

        session_id = str(created.get("session_id") or "")
        if not _SESSION_ID_RE.fullmatch(session_id):
            return _local_error(
                502,
                "invalid_upstream_response",
                "Upstream returned an invalid session_id",
            )
        upstream_stream_url = str(created.get("stream_url") or "")
        if not upstream_stream_url:
            return _local_error(
                502,
                "invalid_upstream_response",
                "Upstream response has no stream_url",
            )
        parsed_stream = urlsplit(upstream_stream_url)
        local_stream = f"/api/avatar/sessions/{session_id}/stream"
        if parsed_stream.query:
            local_stream = f"{local_stream}?{parsed_stream.query}"
        created["stream_url"] = local_stream
        return JSONResponse(created, status_code=response.status_code)

    @app.post("/api/avatar/customizations", status_code=202)
    async def proxy_create_customization(request: Request) -> Response:
        _require_configured(request)
        content_length = request.headers.get("content-length")
        if content_length:
            try:
                length = int(content_length)
            except ValueError:
                return _local_error(
                    400,
                    "invalid_content_length",
                    "Invalid Content-Length",
                )
            if length > configured.customization_max_upload_bytes:
                return _local_error(
                    413,
                    "upload_too_large",
                    "Customization upload is too large",
                )
        headers = _upstream_headers(configured)
        content_type = request.headers.get("content-type")
        if content_type:
            headers["Content-Type"] = content_type
        if content_length:
            headers["Content-Length"] = content_length
        try:
            upstream_request = request.app.state.http_client.build_request(
                "POST",
                _upstream_url(configured, "/v1/avatar/customizations"),
                headers=headers,
                content=request.stream(),
            )
            response = await request.app.state.http_client.send(
                upstream_request,
                stream=True,
            )
            try:
                body = await response.aread()
            finally:
                await response.aclose()
        except Exception as exc:
            return _upstream_error(exc)
        return Response(
            content=body,
            status_code=response.status_code,
            headers={
                "Content-Type": response.headers.get(
                    "content-type",
                    "application/json",
                ),
                "Cache-Control": "no-store",
            },
        )

    @app.get("/api/avatar/customizations/{job_id}")
    async def proxy_get_customization(job_id: str, request: Request) -> Response:
        _require_configured(request)
        try:
            response = await request.app.state.http_client.get(
                _upstream_url(
                    configured,
                    f"/v1/avatar/customizations/{job_id}",
                ),
                headers=_upstream_headers(configured),
            )
        except Exception as exc:
            return _upstream_error(exc)
        return _pass_through(response)

    @app.delete("/api/avatar/customizations/{job_id}")
    async def proxy_cancel_customization(
        job_id: str,
        request: Request,
    ) -> Response:
        _require_configured(request)
        try:
            response = await request.app.state.http_client.delete(
                _upstream_url(
                    configured,
                    f"/v1/avatar/customizations/{job_id}",
                ),
                headers=_upstream_headers(configured),
            )
        except Exception as exc:
            return _upstream_error(exc)
        return _pass_through(response)

    @app.websocket("/api/avatar/sessions/{session_id}/stream")
    async def avatar_stream_proxy(websocket: WebSocket, session_id: str) -> None:
        if config_error:
            await websocket.accept()
            await websocket.send_json(
                {
                    "type": "error",
                    "code": "platform_not_configured",
                    "message": config_error,
                }
            )
            await websocket.close(code=1013)
            return
        if not _SESSION_ID_RE.fullmatch(session_id):
            await websocket.accept()
            await websocket.send_json(
                {
                    "type": "error",
                    "code": "invalid_session_id",
                    "message": "Invalid session id",
                }
            )
            await websocket.close(code=1008)
            return
        stream_query = dict(websocket.query_params)
        token = stream_query.get("token", "")
        if not token:
            await websocket.accept()
            await websocket.send_json(
                {
                    "type": "error",
                    "code": "missing_session_token",
                    "message": "Missing session token",
                }
            )
            await websocket.close(code=1008)
            return

        await websocket.accept()
        upstream_url = _upstream_ws_url(
            configured,
            f"/v1/avatar/sessions/{session_id}/stream",
            stream_query,
        )
        try:
            upstream = await websockets.connect(
                upstream_url,
                ssl=_upstream_ssl_context(configured),
                open_timeout=10,
                max_size=configured.websocket_max_message_bytes,
                compression=None,
            )
        except Exception as exc:
            await _send_ws_error(websocket, exc)
            await websocket.close(code=1013)
            return

        async def client_to_upstream() -> None:
            while True:
                message = await websocket.receive()
                if message.get("type") == "websocket.disconnect":
                    return
                text = message.get("text")
                data = message.get("bytes")
                if text is not None:
                    await upstream.send(text)
                elif data is not None:
                    await upstream.send(data)

        async def upstream_to_client() -> None:
            async for message in upstream:
                if isinstance(message, bytes):
                    await websocket.send_bytes(message)
                else:
                    await websocket.send_text(message)

        tasks = {
            asyncio.create_task(client_to_upstream()),
            asyncio.create_task(upstream_to_client()),
        }
        done, pending = await asyncio.wait(
            tasks,
            return_when=asyncio.FIRST_COMPLETED,
        )
        for task in pending:
            task.cancel()
        for task in pending:
            try:
                await task
            except (asyncio.CancelledError, Exception):
                pass
        for task in done:
            try:
                task.result()
            except (WebSocketDisconnect, Exception):
                pass
        try:
            await upstream.close()
        except Exception:
            pass
        try:
            await websocket.close()
        except Exception:
            pass

    return app


def _require_configured(request: Request) -> None:
    if request.app.state.config_error:
        raise HTTPException(
            status_code=503,
            detail={
                "code": "platform_not_configured",
                "message": request.app.state.config_error,
            },
        )


def _upstream_headers(settings: Settings) -> dict[str, str]:
    headers = {
        "Accept": "application/json",
        "X-Avatar-Owner-ID": settings.avatar_owner_id,
    }
    if settings.avatar_api_key:
        headers["Authorization"] = f"Bearer {settings.avatar_api_key}"
    return headers


def _upstream_url(settings: Settings, path: str) -> str:
    return f"{settings.avatar_api_base_url.rstrip('/')}/{path.lstrip('/')}"


def _upstream_ws_url(
    settings: Settings,
    path: str,
    query: dict[str, str],
) -> str:
    parsed = urlsplit(settings.avatar_api_base_url)
    scheme = "wss" if parsed.scheme == "https" else "ws"
    base_path = parsed.path.rstrip("/")
    full_path = f"{base_path}/{path.lstrip('/')}"
    return urlunsplit(
        (scheme, parsed.netloc, full_path, urlencode(query), "")
    )


def _upstream_ssl_context(settings: Settings) -> Optional[ssl.SSLContext]:
    if urlsplit(settings.avatar_api_base_url).scheme != "https":
        return None
    return ssl.create_default_context(cafile=settings.avatar_ca_bundle)


def _pass_through(response: httpx.Response) -> Response:
    return Response(
        content=response.content,
        status_code=response.status_code,
        headers={
            "Content-Type": response.headers.get(
                "content-type",
                "application/json",
            ),
            "Cache-Control": "no-store",
        },
    )


def _local_error(status_code: int, code: str, message: str) -> JSONResponse:
    return JSONResponse(
        {"detail": {"code": code, "message": message}},
        status_code=status_code,
    )


def _upstream_error(exc: Exception) -> JSONResponse:
    if isinstance(exc, httpx.TimeoutException):
        return _local_error(504, "upstream_timeout", "Upstream request timed out")
    if _is_tls_error(exc):
        logger.warning("upstream TLS validation failed: %s", exc)
        return _local_error(
            502,
            "upstream_tls_error",
            "Platform could not verify the digital-human server certificate",
        )
    logger.warning("upstream request failed: %s", exc)
    return _local_error(502, "upstream_unavailable", "Upstream is unavailable")


def _is_tls_error(exc: BaseException) -> bool:
    current: Optional[BaseException] = exc
    seen: set[int] = set()
    while current is not None and id(current) not in seen:
        seen.add(id(current))
        if isinstance(current, ssl.SSLError):
            return True
        current = current.__cause__ or current.__context__
    return False


async def _send_ws_error(websocket: WebSocket, exc: Exception) -> None:
    if _is_tls_error(exc):
        logger.warning("upstream WebSocket TLS validation failed: %s", exc)
        code = "upstream_tls_error"
        message = "Platform could not verify the digital-human server certificate"
    elif isinstance(exc, asyncio.TimeoutError):
        code = "upstream_timeout"
        message = "Upstream WebSocket connection timed out"
    else:
        logger.warning("upstream WebSocket connection failed: %s", exc)
        code = "upstream_unavailable"
        message = "Upstream WebSocket is unavailable"
    try:
        await websocket.send_json(
            {"type": "error", "code": code, "message": message}
        )
    except Exception:
        pass


app = create_app()


def main() -> None:
    import uvicorn

    parser = argparse.ArgumentParser(description="Minimal avatar platform BFF")
    parser.add_argument(
        "--host",
        default=os.getenv("PLATFORM_HOST", "127.0.0.1"),
    )
    parser.add_argument(
        "--port",
        type=int,
        default=int(os.getenv("PLATFORM_PORT", "8080")),
    )
    parser.add_argument(
        "--ssl-certfile",
        default=os.getenv("PLATFORM_TLS_CERT") or None,
    )
    parser.add_argument(
        "--ssl-keyfile",
        default=os.getenv("PLATFORM_TLS_KEY") or None,
    )
    args = parser.parse_args()
    uvicorn.run(
        app,
        host=args.host,
        port=args.port,
        ssl_certfile=args.ssl_certfile,
        ssl_keyfile=args.ssl_keyfile,
        ws_max_size=app.state.settings.websocket_max_message_bytes,
        ws_per_message_deflate=False,
    )


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )
    main()
