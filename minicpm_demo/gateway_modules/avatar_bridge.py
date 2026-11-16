"""Side channel that feeds full-duplex output audio to the MuseTalk avatar.

Enabled by ``AVATAR_BRIDGE_URL`` (e.g. ``ws://127.0.0.1:8000/ws/minicpm``).
The bridge never blocks or breaks the client relay: frames go through a
bounded queue to a separate task, and any MuseTalk failure only disables
the bridge for that session.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
from typing import Any, Dict, Optional

logger = logging.getLogger("gateway.avatar_bridge")

_QUEUE_SIZE = 256
_DOWN_KINDS = {"audio", "listen"}
_STOP = object()


def bridge_url() -> Optional[str]:
    url = os.environ.get("AVATAR_BRIDGE_URL", "").strip()
    return url or None


def http_url() -> Optional[str]:
    """MuseTalk HTTP base (e.g. ``http://127.0.0.1:8000``) for the /avatar page proxy."""
    url = os.environ.get("AVATAR_HTTP_URL", "").strip().rstrip("/")
    return url or None


class AvatarBridge:
    """Forward one MiniCPM-o duplex session to MuseTalk ``/ws/minicpm``."""

    def __init__(self, url: str, label: str = "") -> None:
        self.url = url
        self.label = label
        self.queue: asyncio.Queue = asyncio.Queue(maxsize=_QUEUE_SIZE)
        self.task: Optional[asyncio.Task] = None
        self.ready = asyncio.Event()
        self.force_listen = False
        self.dropped = 0
        self.failed = False

    def start(self) -> None:
        self.task = asyncio.create_task(self._run())

    def offer_down(self, msg: Optional[Dict[str, Any]], raw: str) -> None:
        """Queue audio/listen deltas and session.closed from the worker."""
        if not isinstance(msg, dict) or self.failed:
            return
        msg_type = msg.get("type")
        if msg_type == "response.output.delta":
            if msg.get("kind") not in _DOWN_KINDS:
                return
        elif msg_type != "session.closed":
            return
        self._put(raw)

    def offer_up(self, raw: str) -> None:
        """Turn the client's force_listen rising edge into a flush."""
        if self.failed:
            return
        try:
            msg = json.loads(raw)
        except Exception:
            return
        if not isinstance(msg, dict) or msg.get("type") != "input.append":
            return
        payload = msg.get("input") or {}
        force_listen = bool(payload.get("force_listen"))
        if force_listen and not self.force_listen:
            self._put(json.dumps({"type": "bridge.flush", "reason": "force_listen"}))
        self.force_listen = force_listen

    def flush(self, reason: str = "client_interrupt") -> None:
        """Request an immediate MuseTalk barge-in without waiting for audio."""
        if self.failed:
            return
        # The next client audio chunk is expected to carry force_listen=true.
        # Remember that state so offer_up does not enqueue a duplicate flush.
        self.force_listen = True
        self._put(json.dumps({"type": "bridge.flush", "reason": reason}))

    async def wait_ready(self, timeout: float = 5.0) -> bool:
        """Wait for the bridge WebSocket to connect."""
        try:
            await asyncio.wait_for(self.ready.wait(), timeout=timeout)
        except asyncio.TimeoutError:
            return False
        return not self.failed

    async def close(self) -> None:
        if self.task is None:
            return
        try:
            self.queue.put_nowait(_STOP)
        except asyncio.QueueFull:
            self.task.cancel()
        try:
            await asyncio.wait_for(self.task, timeout=5)
        except (asyncio.TimeoutError, asyncio.CancelledError):
            self.task.cancel()
        except Exception:
            pass
        if self.dropped:
            logger.warning("avatar bridge %s dropped %d frames", self.label, self.dropped)

    def _put(self, item: Any) -> None:
        try:
            self.queue.put_nowait(item)
        except asyncio.QueueFull:
            self.dropped += 1

    async def _run(self) -> None:
        import websockets

        try:
            conn = await websockets.connect(self.url, open_timeout=3, max_size=None)
        except Exception as exc:
            self.failed = True
            self.ready.set()
            logger.warning("avatar bridge %s: connect %s failed: %s", self.label, self.url, exc)
            return
        reader = None
        try:
            # A WebSocket upgrade alone also succeeds on a busy input. Wait
            # for MuseTalk to grant its single audio lease before going live.
            hello = json.loads(await asyncio.wait_for(conn.recv(), timeout=4))
            if hello.get("type") != "bridge_meta":
                raise RuntimeError(hello.get("message") or "MuseTalk did not accept audio input")
            reader = asyncio.create_task(self._read(conn))
            self.ready.set()
            logger.info("avatar bridge %s connected: %s", self.label, self.url)
            while True:
                item = await self.queue.get()
                if item is _STOP:
                    await conn.send(json.dumps({"type": "bridge.reset"}))
                    break
                await conn.send(item)
        except Exception as exc:
            self.failed = True
            logger.warning("avatar bridge %s stopped: %s", self.label, exc)
        finally:
            self.ready.set()
            if reader is not None:
                reader.cancel()
                await asyncio.gather(reader, return_exceptions=True)
            try:
                await conn.close()
            except Exception:
                pass

    async def _read(self, conn) -> None:
        try:
            async for raw in conn:
                try:
                    msg = json.loads(raw)
                except Exception:
                    continue
                if msg.get("type") == "error":
                    logger.warning("avatar bridge %s: MuseTalk error %s", self.label, msg)
                    if msg.get("code") in ("stream_busy", "not_ready", "stream_disabled"):
                        self.failed = True
                elif msg.get("type") == "bridge_meta":
                    logger.info("avatar bridge %s: %s", self.label, msg)
        except Exception:
            pass
