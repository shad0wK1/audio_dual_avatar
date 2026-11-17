"""Public single-session API for the complete digital-human pipeline.

This module is intentionally a Gateway-side orchestration layer.  The
MiniCPM-o worker and MuseTalk protocols remain internal; callers use one
REST resource and one WebSocket stream.
"""

from __future__ import annotations

import asyncio
import base64
import json
import logging
import os
import secrets
import struct
import time
import uuid
from contextlib import asynccontextmanager
from dataclasses import dataclass
from typing import Any, Dict, Optional
from urllib.parse import urlencode

import httpx
import numpy as np
import websockets
from fastapi import WebSocket, WebSocketDisconnect

from .avatar_bridge import AvatarBridge
from .avatar_presets import AvatarPresetError, AvatarPresetRegistry
from .worker_pool import WorkerConnection, WorkerPool


logger = logging.getLogger("gateway.avatar_session")

_AUDIO_MAGIC = b"MTA1"
_AUDIO_HEADER = struct.Struct(">4sI")
_MAX_PROMPT_BYTES = 64 * 1024
_MAX_METADATA_BYTES = 8 * 1024
_VALID_CODECS = {"auto", "h264", "webp"}
_VALID_INPUT_FORMATS = {"pcm_f32le_16000"}
_MAX_AUDIO_BASE64_BYTES = 2 * 1024 * 1024


class AvatarSessionError(RuntimeError):
    def __init__(
        self,
        message: str,
        *,
        status_code: int = 400,
        code: str = "avatar_session_error",
    ) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code


@dataclass
class AvatarPublicSession:
    id: str
    token: str
    preset_id: str
    avatar_id: str
    preset_name: str
    init_payload: Dict[str, Any]
    requested_codec: str
    metadata: Dict[str, Any]
    created_at: float
    expires_at: float
    attached: bool = False
    closed: bool = False


class AvatarSessionService:
    """Own the one public avatar session supported by this deployment."""

    def __init__(
        self,
        *,
        worker_pool: WorkerPool,
        preset_registry: AvatarPresetRegistry,
        bridge_url: str,
        avatar_http_url: str,
        api_key: str = "",
        ttl_seconds: float = 180.0,
        max_session_seconds: float = 600.0,
    ) -> None:
        self.worker_pool = worker_pool
        self.preset_registry = preset_registry
        self.bridge_url = bridge_url.rstrip("/")
        self.avatar_http_url = avatar_http_url.rstrip("/")
        self.api_key = api_key.strip()
        self.ttl_seconds = max(30.0, float(ttl_seconds))
        self.max_session_seconds = max(30.0, float(max_session_seconds))
        self._sessions: Dict[str, AvatarPublicSession] = {}
        self._lock = asyncio.Lock()

    def require_api_key(self, supplied: Optional[str]) -> None:
        if not self.api_key:
            return
        if not supplied or not secrets.compare_digest(supplied, self.api_key):
            raise AvatarSessionError(
                "Invalid API key",
                status_code=401,
                code="invalid_api_key",
            )

    async def is_preset_in_use(self, preset_id: str) -> bool:
        async with self._lock:
            return any(
                session.preset_id == preset_id and not session.closed
                for session in self._sessions.values()
            )

    async def list_presets(
        self,
        owner_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        avatar_status = await self._fetch_avatar_status()
        try:
            return await asyncio.to_thread(
                self.preset_registry.public_list,
                avatar_status,
                owner_id,
            )
        except AvatarPresetError as exc:
            raise AvatarSessionError(
                str(exc),
                status_code=exc.status_code,
                code="avatar_preset_config_error",
            ) from exc

    async def create_session(
        self,
        payload: Dict[str, Any],
        owner_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        if not isinstance(payload, dict):
            raise AvatarSessionError("JSON object required")

        try:
            default_preset_id = (
                self.preset_registry.load().default_preset_id
            )
        except AvatarPresetError as exc:
            raise AvatarSessionError(
                str(exc),
                status_code=exc.status_code,
                code="avatar_preset_config_error",
            ) from exc
        preset_id = str(
            payload.get("preset_id") or default_preset_id
        ).strip()
        if not preset_id:
            raise AvatarSessionError(
                "preset_id is required",
                code="invalid_preset",
            )

        requested_codec = str(payload.get("video_codec") or "auto").lower()
        if requested_codec not in _VALID_CODECS:
            raise AvatarSessionError(
                f"Unsupported video_codec: {requested_codec}",
                code="invalid_video_codec",
            )
        input_format = str(
            payload.get("input_format") or "pcm_f32le_16000"
        ).lower()
        if input_format not in _VALID_INPUT_FORMATS:
            raise AvatarSessionError(
                f"Unsupported input_format: {input_format}",
                code="invalid_input_format",
            )

        metadata = payload.get("metadata") or {}
        if not isinstance(metadata, dict):
            raise AvatarSessionError("metadata must be an object")
        try:
            metadata_size = len(
                json.dumps(metadata, ensure_ascii=False).encode("utf-8")
            )
        except (TypeError, ValueError) as exc:
            raise AvatarSessionError("metadata must be JSON serializable") from exc
        if metadata_size > _MAX_METADATA_BYTES:
            raise AvatarSessionError(
                f"metadata exceeds {_MAX_METADATA_BYTES} bytes"
            )

        async with self._lock:
            self._purge_expired_locked()
            existing = next(iter(self._sessions.values()), None)
            if existing is not None:
                if existing.attached:
                    raise AvatarSessionError(
                        "An avatar session is already active",
                        status_code=429,
                        code="session_capacity_exhausted",
                    )
                self._sessions.pop(existing.id, None)

            avatar_status = await self._fetch_avatar_status()
            try:
                item = await asyncio.to_thread(
                    self.preset_registry.public_item,
                    preset_id,
                    avatar_status,
                    owner_id,
                )
            except AvatarPresetError as exc:
                raise AvatarSessionError(
                    str(exc),
                    status_code=exc.status_code,
                    code="avatar_preset_unavailable",
                ) from exc

            await self._activate_avatar(item["avatar_id"])
            prompt = str(
                payload.get("system_prompt")
                or item.get("prompt", {}).get("text")
                or ""
            ).strip()
            if not prompt:
                raise AvatarSessionError("system_prompt is empty")
            if len(prompt.encode("utf-8")) > _MAX_PROMPT_BYTES:
                raise AvatarSessionError(
                    f"system_prompt exceeds {_MAX_PROMPT_BYTES} bytes"
                )

            config = payload.get("config") or {}
            if not isinstance(config, dict):
                raise AvatarSessionError("config must be an object")
            try:
                length_penalty = float(config.get("length_penalty", 1.1))
            except (TypeError, ValueError) as exc:
                raise AvatarSessionError("length_penalty must be numeric") from exc
            if not 0.5 <= length_penalty <= 2.0:
                raise AvatarSessionError(
                    "length_penalty must be between 0.5 and 2.0"
                )

            now = time.time()
            session_id = f"avs_{uuid.uuid4().hex[:20]}"
            session = AvatarPublicSession(
                id=session_id,
                token=secrets.token_urlsafe(32),
                preset_id=preset_id,
                avatar_id=item["avatar_id"],
                preset_name=item["name"],
                init_payload={
                    "system_prompt": prompt,
                    "preset_id": preset_id,
                },
                requested_codec=requested_codec,
                metadata=metadata,
                created_at=now,
                expires_at=now + self.ttl_seconds,
            )
            self._sessions[session_id] = session
            logger.info(
                "avatar session created: %s preset=%s avatar=%s",
                session_id,
                preset_id,
                item["avatar_id"],
            )
            return {
                "session_id": session_id,
                "stream_url": (
                    f"/v1/avatar/sessions/{session_id}/stream"
                    f"?token={session.token}"
                ),
                "expires_at": time.strftime(
                    "%Y-%m-%dT%H:%M:%SZ",
                    time.gmtime(session.expires_at),
                ),
                "preset": {
                    "id": preset_id,
                    "name": item["name"],
                    "avatar_id": item["avatar_id"],
                },
                "input_format": input_format,
                "audio_transport": "websocket_mta1",
                "video_transport": "websocket_muse_frame",
            }

    async def run_stream(
        self,
        websocket: WebSocket,
        session_id: str,
        token: str,
    ) -> None:
        session = await self._attach(session_id, token)
        if session is None:
            await websocket.accept()
            await websocket.send_json(
                {
                    "type": "error",
                    "code": "invalid_session",
                    "message": "Invalid or expired avatar session",
                }
            )
            await websocket.close(code=1008)
            return

        runtime = _AvatarSessionRuntime(
            service=self,
            session=session,
            websocket=websocket,
        )
        try:
            await runtime.run()
        finally:
            await self._remove(session.id)

    async def _attach(
        self,
        session_id: str,
        token: str,
    ) -> Optional[AvatarPublicSession]:
        async with self._lock:
            self._purge_expired_locked()
            session = self._sessions.get(session_id)
            if session is None or session.closed or session.attached:
                return None
            if not secrets.compare_digest(session.token, token):
                return None
            session.attached = True
            return session

    async def _remove(self, session_id: str) -> None:
        async with self._lock:
            self._sessions.pop(session_id, None)

    def _purge_expired_locked(self) -> None:
        now = time.time()
        expired = [
            session_id
            for session_id, session in self._sessions.items()
            if not session.attached and session.expires_at <= now
        ]
        for session_id in expired:
            self._sessions.pop(session_id, None)
            logger.info("avatar session expired: %s", session_id)

    async def _fetch_avatar_status(self) -> Dict[str, Any]:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(f"{self.avatar_http_url}/api/avatars")
        except httpx.HTTPError as exc:
            raise AvatarSessionError(
                f"avatar service unavailable: {exc}",
                status_code=502,
                code="avatar_unavailable",
            ) from exc
        if response.status_code != 200:
            raise AvatarSessionError(
                f"avatar service returned HTTP {response.status_code}",
                status_code=502,
                code="avatar_unavailable",
            )
        try:
            data = response.json()
        except Exception as exc:
            raise AvatarSessionError(
                f"avatar service returned invalid JSON: {exc}",
                status_code=502,
                code="avatar_unavailable",
            ) from exc
        if not isinstance(data, dict):
            raise AvatarSessionError(
                "avatar service returned invalid data",
                status_code=502,
                code="avatar_unavailable",
            )
        return data

    async def _activate_avatar(self, avatar_id: str) -> None:
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{self.avatar_http_url}/api/avatar/select",
                    json={"avatar_id": avatar_id},
                )
        except httpx.HTTPError as exc:
            raise AvatarSessionError(
                f"avatar activation failed: {exc}",
                status_code=502,
                code="avatar_activation_failed",
            ) from exc
        if response.status_code != 200:
            try:
                detail = response.json().get("detail")
            except Exception:
                detail = response.text[:300]
            raise AvatarSessionError(
                f"avatar activation failed: {detail or response.status_code}",
                status_code=response.status_code
                if 400 <= response.status_code < 500
                else 502,
                code="avatar_activation_failed",
            )


class _AvatarSessionRuntime:
    """Bridge one public client to MiniCPM and MuseTalk."""

    def __init__(
        self,
        *,
        service: AvatarSessionService,
        session: AvatarPublicSession,
        websocket: WebSocket,
    ) -> None:
        self.service = service
        self.session = session
        self.websocket = websocket
        self.render_http = service.avatar_http_url
        self.render_bridge = service.bridge_url
        self.worker_ws: Any = None
        self.viewer_ws: Any = None
        self.bridge: Optional[AvatarBridge] = None
        self.worker: Optional[WorkerConnection] = None
        self.ticket_id: Optional[str] = None
        self.request_type = "audio_duplex"
        self.started_at = 0.0
        self.send_lock = asyncio.Lock()
        self.audio_tasks: set[asyncio.Task] = set()
        self.media_generation = 0
        self.input_generation = 0
        self.http_client = httpx.AsyncClient(timeout=10.0)
        self.pending_force_listen = False
        self.codec_string = "avc1.4D4028"
        self.video_codec = "webp"
        self.meta: Dict[str, Any] = {}
        self.video_meta: Dict[str, Any] = {}
        self.sequence = 0
        self.graceful_close = False
        self.sent_session_closed = False
        self.active_response_id: Optional[str] = None

    async def run(self) -> None:
        await self.websocket.accept()
        await self._send_json(
            {
                "type": "session.connecting",
                "session_id": self.session.id,
                "preset": {
                    "id": self.session.preset_id,
                    "name": self.session.preset_name,
                    "avatar_id": self.session.avatar_id,
                },
            }
        )

        try:
            start = await asyncio.wait_for(
                self.websocket.receive_json(),
                timeout=15.0,
            )
            if start.get("type") != "session.start":
                raise AvatarSessionError(
                    "First message must be session.start",
                    code="invalid_start",
                )
            self.video_codec = self._choose_codec(
                start.get("capabilities", {}).get("video_codecs")
            )
            async with self._hold_renderer():
                await self._connect_pipeline()
                await self._run_relays()
        except AvatarSessionError as exc:
            await self._send_error(exc.code, str(exc))
        except WebSocketDisconnect:
            pass
        except asyncio.TimeoutError:
            await self._send_error(
                "avatar_session_timeout",
                "Timed out while preparing the avatar session",
            )
        except Exception as exc:
            logger.exception("avatar session failed: %s", self.session.id)
            await self._send_error("avatar_session_failed", str(exc))
        finally:
            await self._cleanup()

    @asynccontextmanager
    async def _hold_renderer(self):
        if os.getenv("AVATAR_GPU_ON_DEMAND") != "1":
            yield
            return

        url = _ws_url(self.service.avatar_http_url, "/ws/runtime?") + urlencode(
            {"avatar_id": self.session.avatar_id})
        async with websockets.connect(url, open_timeout=10, ping_timeout=60) as lease:
            result = json.loads(await asyncio.wait_for(lease.recv(), timeout=150))
            if not result.get("ready"):
                raise AvatarSessionError(result.get("error") or "数字人渲染器未就绪",
                                         status_code=503, code="renderer_unavailable")
            self.render_http = result["http"]
            self.render_bridge = _ws_url(self.render_http, "/ws/minicpm")
            yield

    def _choose_codec(self, supported: Any) -> str:
        values = {
            str(item).lower()
            for item in (supported or [])
            if isinstance(item, str)
        }
        requested = self.session.requested_codec
        if requested == "webp":
            return "webp"
        if requested == "h264":
            return "h264"
        if "h264" in values:
            return "h264"
        if "webp" in values:
            return "webp"
        return "h264"

    async def _connect_pipeline(self) -> None:
        self.worker, self.ticket_id = await self._reserve_worker()
        self.started_at = time.monotonic()

        self.bridge = AvatarBridge(
            self.render_bridge,
            label=f"public:{self.session.id}",
        )
        self.bridge.start()
        if not await self.bridge.wait_ready(timeout=5.0):
            raise AvatarSessionError(
                "MuseTalk audio bridge is unavailable",
                status_code=503,
                code="avatar_bridge_unavailable",
            )

        identity_qs = urlencode(
            {
                "client_id": self.session.metadata.get("user_id")
                or self.session.metadata.get("client_id")
                or "",
                "page_session_id": self.session.id,
                "source_channel": "avatar_session_api",
                "source_mode": "avatar",
                "page_route": "/avatar-v2",
            }
        )
        worker_url = (
            f"ws://{self.worker.host}:{self.worker.port}"
            f"/v1/worker/duplex?{identity_qs}"
        )
        self.worker_ws = await websockets.connect(
            worker_url,
            open_timeout=5.0,
            max_size=128 * 1024 * 1024,
            compression=None,
        )
        await self.worker_ws.send(
            json.dumps(
                {
                    "type": "session.init",
                    "payload": self.session.init_payload,
                },
                ensure_ascii=False,
            )
        )
        created = await self._receive_until(
            self.worker_ws,
            expected_type="session.created",
            timeout=120.0,
        )
        self.meta = created

        viewer_url = _ws_url(
            self.render_http,
            f"/ws/live?video_codec={self.video_codec}",
        )
        self.viewer_ws = await websockets.connect(
            viewer_url,
            open_timeout=5.0,
            max_size=None,
            compression=None,
        )
        first = json.loads(
            await asyncio.wait_for(self.viewer_ws.recv(), timeout=8.0)
        )
        if first.get("type") == "error":
            raise AvatarSessionError(
                str(first.get("message") or "MuseTalk viewer rejected the session"),
                status_code=503,
                code=str(first.get("code") or "avatar_viewer_unavailable"),
            )
        if first.get("type") != "meta":
            raise AvatarSessionError(
                f"Unexpected MuseTalk viewer event: {first.get('type')}",
                status_code=502,
                code="invalid_avatar_viewer",
            )
        self.video_meta = first
        self.video_codec = str(first.get("video_codec") or self.video_codec)
        self.codec_string = str(
            first.get("codec_string") or self.codec_string
        )
        await self.viewer_ws.send(json.dumps({"type": "ready"}))

        await self._send_json(
            {
                "type": "session.ready",
                "session_id": self.session.id,
                "backend_session_id": created.get("session_id"),
                "video_codec": self.video_codec,
                "codec_string": self.codec_string,
                "width": int(first.get("width") or 0),
                "height": int(first.get("height") or 0),
                "fps": int(first.get("fps") or 24),
                "prebuffer": int(first.get("prebuffer") or 0),
                "input_format": "pcm_f32le_16000",
                "video_resync": bool(first.get("video_resync")),
                "audio_transport": "websocket_mta1",
                "video_transport": "websocket_muse_frame",
            }
        )
        logger.info(
            "avatar session ready: %s backend=%s codec=%s",
            self.session.id,
            created.get("session_id"),
            self.video_codec,
        )

    async def _reserve_worker(
        self,
    ) -> tuple[WorkerConnection, str]:
        try:
            ticket, future = self.service.worker_pool.enqueue(self.request_type)
        except WorkerPool.QueueFullError as exc:
            raise AvatarSessionError(
                str(exc),
                status_code=429,
                code="session_queue_full",
            ) from exc

        if not future.done():
            await self._send_json(
                {
                    "type": "session.queued",
                    "position": ticket.position,
                    "estimated_wait_s": ticket.estimated_wait_s,
                    "ticket_id": ticket.ticket_id,
                }
            )

        deadline = time.monotonic() + float(
            self.service.worker_pool.request_timeout
        )
        while not future.done():
            if time.monotonic() >= deadline:
                self.service.worker_pool.cancel(ticket.ticket_id)
                raise AvatarSessionError(
                    "Timed out waiting for a worker",
                    status_code=503,
                    code="worker_timeout",
                )
            try:
                await asyncio.wait_for(
                    asyncio.shield(future),
                    timeout=3.0,
                )
            except asyncio.TimeoutError:
                current = self.service.worker_pool.get_ticket(
                    ticket.ticket_id
                )
                if current is not None:
                    await self._send_json(
                        {
                            "type": "session.queue_update",
                            "position": current.position,
                            "estimated_wait_s": current.estimated_wait_s,
                        }
                    )
            except asyncio.CancelledError:
                self.service.worker_pool.cancel(ticket.ticket_id)
                raise

        worker = future.result()
        if worker is None:
            raise AvatarSessionError(
                "No worker available",
                status_code=503,
                code="worker_unavailable",
            )
        await self._send_json({"type": "session.queue_done"})
        return worker, ticket.ticket_id

    async def _receive_until(
        self,
        connection: Any,
        *,
        expected_type: str,
        timeout: float,
    ) -> Dict[str, Any]:
        deadline = time.monotonic() + timeout
        while True:
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                raise asyncio.TimeoutError()
            raw = await asyncio.wait_for(connection.recv(), timeout=remaining)
            if isinstance(raw, bytes):
                continue
            message = json.loads(raw)
            message_type = message.get("type")
            if message_type == "error":
                raise AvatarSessionError(
                    str(message.get("message") or "Worker session failed"),
                    status_code=503,
                    code=str(message.get("code") or "worker_error"),
                )
            if message_type == expected_type:
                return message

    async def _run_relays(self) -> None:
        tasks = {
            asyncio.create_task(self._client_to_internal()),
            asyncio.create_task(self._worker_to_client()),
            asyncio.create_task(self._viewer_to_client()),
            asyncio.create_task(self._session_watchdog()),
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
            except WebSocketDisconnect:
                pass
            except asyncio.CancelledError:
                pass
            except Exception:
                logger.exception(
                    "avatar session relay stopped: %s",
                    self.session.id,
                )

    async def _session_watchdog(self) -> None:
        await asyncio.sleep(self.service.max_session_seconds)
        await self._send_session_closed("session_timeout")

    async def _client_to_internal(self) -> None:
        while True:
            message = await self.websocket.receive()
            if message.get("type") == "websocket.disconnect":
                raise WebSocketDisconnect()
            raw = message.get("text")
            if raw is None:
                continue
            try:
                payload = json.loads(raw)
            except json.JSONDecodeError:
                await self._send_error("bad_json", "Message is not valid JSON")
                continue
            kind = payload.get("type")

            if kind == "input.audio.append":
                audio = payload.get("audio")
                if not isinstance(audio, str) or not audio:
                    await self._send_error(
                        "invalid_audio",
                        "input.audio.append requires base64 audio",
                    )
                    continue
                if len(audio) > _MAX_AUDIO_BASE64_BYTES:
                    await self._send_error(
                        "audio_too_large",
                        "Input audio chunk is too large",
                    )
                    continue
                try:
                    raw_audio = base64.b64decode(audio)
                    samples = np.frombuffer(raw_audio, dtype="<f4")
                    rms = (
                        float(np.sqrt(np.mean(np.square(samples))))
                        if samples.size
                        else 0.0
                    )
                except Exception:
                    await self._send_error(
                        "invalid_audio",
                        "Input audio must be base64 float32 PCM",
                    )
                    continue
                force_listen = bool(payload.get("force_listen"))
                force_listen = force_listen or self.pending_force_listen
                self.pending_force_listen = False
                if self.sequence < 3:
                    logger.info(
                        "avatar session input: %s seq=%d samples=%d "
                        "rms=%.6f force_listen=%s",
                        self.session.id,
                        self.sequence,
                        samples.size,
                        rms,
                        force_listen,
                    )
                wire = {
                    "type": "input.append",
                    "input": {
                        "audio": audio,
                        "input_id": f"{self.input_generation}:{self.sequence}",
                        "force_listen": force_listen,
                    },
                }
                wire_raw = json.dumps(wire, ensure_ascii=False)
                await self.worker_ws.send(wire_raw)
                if self.bridge is not None:
                    self.bridge.offer_up(wire_raw)
                await self._send_json(
                    {
                        "type": "input.audio_ack",
                        "sequence": self.sequence,
                        "samples": int(samples.size),
                        "rms": round(rms, 6),
                    }
                )
                self.sequence += 1
                continue

            if kind == "input.interrupt":
                self.input_generation += 1
                self.active_response_id = None
                await self.worker_ws.send(json.dumps({
                    "type": "input.interrupt", "playback": payload.get("playback"),
                }))
                self.pending_force_listen = True
                if self.bridge is not None:
                    self.bridge.flush("client_interrupt")
                await self._send_json(
                    {
                        "type": "response.interrupted",
                        "reason": "client_interrupt",
                    }
                )
                continue

            if kind == "media.video_resync":
                segment_id, index = payload.get("segment_id"), payload.get("frame_index")
                if (self.video_meta.get("video_resync") and type(index) is int
                        and type(segment_id) is int and min(index, segment_id) >= 0):
                    await self.viewer_ws.send(json.dumps({
                        "type": "video_resync", "segment_id": segment_id, "frame_index": index,
                    }))
                continue

            if kind == "media.ack":
                try:
                    ack = {
                        "type": "ack",
                        "frame_index": int(payload.get("frame_index", -1)),
                        "pts_us": int(payload.get("pts_us", 0)),
                        "kind": str(payload.get("kind") or "unknown"),
                    }
                except (TypeError, ValueError):
                    await self._send_error(
                        "invalid_media_ack",
                        "media.ack contains invalid numeric fields",
                    )
                    continue
                await self.viewer_ws.send(json.dumps(ack))
                continue

            if kind == "session.close":
                self.graceful_close = True
                try:
                    await self.worker_ws.send(
                        json.dumps(
                            {
                                "type": "session.close",
                                "reason": str(
                                    payload.get("reason") or "client_closed"
                                ),
                            }
                        )
                    )
                except Exception:
                    pass
                return

            await self._send_error(
                "unsupported_message",
                f"Unsupported message type: {kind}",
            )

    async def _worker_to_client(self) -> None:
        while True:
            raw = await self.worker_ws.recv()
            if isinstance(raw, bytes):
                continue
            try:
                message = json.loads(raw)
            except json.JSONDecodeError:
                continue
            kind = message.get("type")
            if kind == "response.output.delta":
                # A GPU step already underway can finish after the bridge flush.
                # Only forward deltas produced from post-interrupt mic input.
                generation = self.input_generation
                if generation and not str(message.get("input_id") or "").startswith(f"{generation}:"):
                    continue
                delta_kind = message.get("kind")
                response_id = message.get("response_id")
                if response_id and response_id != self.active_response_id:
                    self.active_response_id = response_id
                    await self._send_json(
                        {
                            "type": "response.started",
                            "response_id": response_id,
                        }
                    )
                if generation != self.input_generation:
                    continue
                if delta_kind == "text":
                    text = str(message.get("text") or "")
                    if text:
                        await self._send_json(
                            {
                                "type": "transcript.delta",
                                "response_id": response_id,
                                "text": text,
                            }
                        )
                elif delta_kind == "audio":
                    if self.bridge is not None:
                        self.bridge.offer_down(message, raw)
                elif delta_kind == "listen":
                    if self.bridge is not None:
                        self.bridge.offer_down(message, raw)
                    await self._send_json(
                        {
                            "type": "response.ended",
                            "response_id": response_id,
                        }
                    )
                    self.active_response_id = None
                continue

            if kind == "session.closed":
                if self.bridge is not None:
                    self.bridge.offer_down(message, raw)
                await self._send_session_closed(
                    str(message.get("reason") or "backend_closed")
                )
                return

            if kind == "error":
                await self._send_error(
                    str(message.get("code") or "model_error"),
                    str(message.get("message") or "Model session failed"),
                )
                return

    async def _viewer_to_client(self) -> None:
        while True:
            message = await self.viewer_ws.recv()
            if isinstance(message, bytes):
                await self._send_bytes(message)
                continue
            try:
                control = json.loads(message)
            except json.JSONDecodeError:
                continue
            kind = control.get("type")
            if kind == "segment":
                segment = dict(control)
                segment.pop("audio_url", None)
                segment["type"] = "media.segment"
                await self._send_json(segment)
                segment_id = int(control.get("id", -1))
                if segment_id >= 0:
                    generation = self.media_generation
                    task = asyncio.create_task(
                        self._send_segment_audio(segment_id, generation)
                    )
                    self.audio_tasks.add(task)
                    task.add_done_callback(self.audio_tasks.discard)
                continue
            if kind == "segment_end":
                await self._send_json(
                    {
                        "type": "media.segment_end",
                        "segment_id": int(control.get("segment_id", -1)),
                    }
                )
                continue
            if kind == "flush":
                self.media_generation += 1
                for task in list(self.audio_tasks):
                    task.cancel()
                self.audio_tasks.clear()
                await self._send_json(
                    {
                        "type": "media.flush",
                        "frame_index": int(control.get("frame_index", -1)),
                    }
                )
                continue
            if kind == "interrupt_ack":
                await self._send_json(
                    {**control, "type": "media.interrupt_ack"}
                )
                continue
            if kind == "error":
                await self._send_error(
                    str(control.get("code") or "avatar_stream_error"),
                    str(control.get("message") or "Avatar stream failed"),
                )
                return

    async def _send_segment_audio(
        self,
        segment_id: int,
        generation: int,
    ) -> None:
        try:
            response = await self.http_client.get(
                f"{self.render_http}"
                f"/api/live/audio/{segment_id}"
            )
            response.raise_for_status()
            if generation != self.media_generation:
                return
            packet = _AUDIO_HEADER.pack(_AUDIO_MAGIC, segment_id)
            await self._send_bytes(packet + response.content)
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            logger.warning(
                "avatar session audio fetch failed: %s segment=%s: %s",
                self.session.id,
                segment_id,
                exc,
            )
            await self._send_json(
                {
                    "type": "media.audio_error",
                    "segment_id": segment_id,
                    "message": str(exc),
                }
            )

    async def _send_json(self, payload: Dict[str, Any]) -> None:
        async with self.send_lock:
            await self.websocket.send_json(payload)

    async def _send_bytes(self, payload: bytes) -> None:
        async with self.send_lock:
            await self.websocket.send_bytes(payload)

    async def _send_error(self, code: str, message: str) -> None:
        try:
            await self._send_json(
                {
                    "type": "error",
                    "code": code,
                    "message": message,
                }
            )
        except Exception:
            pass

    async def _send_session_closed(self, reason: str) -> None:
        if self.sent_session_closed:
            return
        self.sent_session_closed = True
        try:
            await self._send_json(
                {
                    "type": "session.closed",
                    "session_id": self.session.id,
                    "reason": reason,
                }
            )
        except Exception:
            pass

    async def _cleanup(self) -> None:
        for task in list(self.audio_tasks):
            task.cancel()
        if self.audio_tasks:
            await asyncio.gather(*self.audio_tasks, return_exceptions=True)
        await self.http_client.aclose()

        if self.bridge is not None:
            try:
                await self.bridge.close()
            except Exception:
                logger.debug("avatar bridge close failed", exc_info=True)

        if self.viewer_ws is not None:
            try:
                await self.viewer_ws.close()
            except Exception:
                pass

        if self.worker_ws is not None:
            try:
                await self.worker_ws.close()
            except Exception:
                pass

        if self.worker is not None:
            duration = (
                time.monotonic() - self.started_at
                if self.started_at
                else 0.0
            )
            self.service.worker_pool.release_worker(
                self.worker,
                request_type=self.request_type,
                duration_s=duration,
            )
        elif self.ticket_id:
            self.service.worker_pool.cancel(self.ticket_id)

        if not self.graceful_close:
            await self._send_session_closed("disconnected")
        else:
            await self._send_session_closed("client_closed")
        try:
            await self.websocket.close()
        except Exception:
            pass
        logger.info("avatar session closed: %s", self.session.id)


def _ws_url(http_url: str, path: str) -> str:
    if http_url.startswith("https://"):
        base = "wss://" + http_url[len("https://") :]
    elif http_url.startswith("http://"):
        base = "ws://" + http_url[len("http://") :]
    elif http_url.startswith(("ws://", "wss://")):
        base = http_url
    else:
        raise AvatarSessionError(
            f"Invalid avatar HTTP URL: {http_url}",
            code="invalid_configuration",
        )
    return base.rstrip("/") + path
