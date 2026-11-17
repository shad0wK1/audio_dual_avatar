"""CPU control plane for a disposable MuseTalk CUDA renderer."""
import asyncio
from contextlib import asynccontextmanager
import os
from pathlib import Path
import socket
import sys
import tempfile
import logging
import math
import threading
import time

import httpx
import uvicorn
import websockets
from fastapi import FastAPI, WebSocket
from fastapi.responses import JSONResponse, Response

from .api.app import create_app
from .api.routes import AvatarSelectRequest, status as native_status
from .avatar_registry import AvatarError, inspect_avatar_cache, validate_avatar_id
from .models import cache_dir_for
from .config import configure_state, load_config
from .lifecycle import initialize
from .models import model_paths
from .state import AppState


def configured(path):
    state = AppState()
    configure_state(state, load_config(path))
    return state


class Renderer:
    def __init__(self, config, state):
        self.config = config
        self.state = state
        self.lock = asyncio.Lock()
        self.child_env = os.environ.copy()
        self.child = None
        self.ready = False
        self.users = 0
        self.idle_deadline = 0.0
        self.idle = float(os.getenv("AVATAR_GPU_IDLE_SECONDS", "300"))
        if not math.isfinite(self.idle) or self.idle <= 0:
            raise ValueError("AVATAR_GPU_IDLE_SECONDS must be finite and positive")
        self.warmup_idle = min(60.0, self.idle)

    async def stop(self):
        self.ready = False
        child = self.child
        if child is not None and child.returncode is None:
            try:
                child.terminate()
            except ProcessLookupError:
                pass
            try:
                await asyncio.wait_for(child.wait(), 8)
            except asyncio.TimeoutError:
                child.kill()
                await child.wait()
        self.child = None
        self.idle_deadline = 0.0
        self.state.service.status = "standby"

    async def reap_idle(self):
        while True:
            await asyncio.sleep(1)
            async with self.lock:
                if self.child and (self.child.returncode is not None or
                        (not self.users and time.monotonic() >= self.idle_deadline)):
                    await self.stop()

    async def start(self, avatar):
        # Cold start constructs the UNet and loads its checkpoint before
        # releasing the CPU copies. Avoid starting in known host-RAM starvation.
        available = next(int(line.split()[1]) * 1024 for line in
                         Path("/proc/meminfo").read_text().splitlines() if line.startswith("MemAvailable:"))
        checkpoint = Path(model_paths(self.state.args)[0])
        if available < 2 * checkpoint.stat().st_size:
            raise RuntimeError("服务器可用内存不足以加载数字人模型，请稍后重新开始对话")
        with socket.socket() as sock:
            sock.bind(("127.0.0.1", 0))
            sock.listen(128)
            port = sock.getsockname()[1]
            self.http = f"http://127.0.0.1:{port}"
            self.ws = f"ws://127.0.0.1:{port}"
            self.child = await asyncio.create_subprocess_exec(
                sys.executable, "-m", __spec__.name, self.config, str(sock.fileno()), avatar,
                pass_fds=(sock.fileno(),), env=self.child_env)
        self.state.service.status = "loading_models"
        try:
            deadline = time.monotonic() + 145
            while self.child.returncode is None and time.monotonic() < deadline:
                try:
                    response = await self.client.get(self.http + "/api/status", timeout=1)
                    result = response.raise_for_status().json()
                    if result.get("error"):
                        raise RuntimeError(result["error"])
                    if result.get("ready"):
                        self.ready = True
                        self.state.model.avatar_id = avatar
                        return
                except httpx.TransportError:
                    pass
                await asyncio.sleep(0.35)
            raise RuntimeError("GPU renderer exited or timed out during loading")
        except BaseException:
            await self.stop()
            raise

    @asynccontextmanager
    async def hold(self, avatar=None, *, warmup=False):
        async with self.lock:
            target = validate_avatar_id(avatar or self.state.model.avatar_id)
            if self.child and self.child.returncode is not None:
                await self.stop()
            if not self.ready:
                await self.start(target)
            elif target != self.state.model.avatar_id:
                if self.users:
                    raise RuntimeError("Another avatar is in use")
                reply = await self.client.post(self.http + "/api/avatar/select", json={"avatar_id":target})
                reply.raise_for_status()
                self.state.model.avatar_id = target
            self.users += 1
        try:
            yield
        finally:
            self.users -= 1
            timeout = self.warmup_idle if warmup else self.idle
            # A page warmup must not shorten a previous conversation's grace period.
            self.idle_deadline = max(self.idle_deadline, time.monotonic() + timeout)


def control_app(path, state):
    app = FastAPI()
    app.state.stream_state = state
    render = Renderer(path, state)
    state.service.status = "standby"

    @asynccontextmanager
    async def lifespan(app):
        async with httpx.AsyncClient(trust_env=False, timeout=120) as render.client:
            monitor = asyncio.create_task(render.reap_idle())
            folder = None
            preload = None
            stop = threading.Event()
            try:
                catalog = os.getenv("AVATAR_SYSTEM_PRESETS")
                if catalog and Path("/dev/shm").is_dir():
                    import yaml
                    from .frame_cache import prepare
                    try:
                        entries = yaml.safe_load(Path(catalog).read_text())["presets"]
                        ids = [validate_avatar_id(p["avatar_id"]) for p in entries.values()
                               if p.get("enabled", True) and p.get("source", "system") == "system"]
                        folder = tempfile.TemporaryDirectory(prefix="avatar-frames-", dir="/dev/shm")
                        render.child_env["AVATAR_DECODED_CACHE"] = folder.name
                        root = cache_dir_for(state.model.avatar_id, state.args.version).parent
                        preload = asyncio.create_task(asyncio.to_thread(
                            prepare, Path(folder.name), root, ids, stop))
                    except (OSError, ValueError, KeyError) as exc:
                        logging.getLogger("uvicorn.error").warning("frame preload unavailable: %s", exc)
                yield
            finally:
                stop.set()
                if preload is not None:
                    await asyncio.gather(preload, return_exceptions=True)
                if folder is not None:
                    folder.cleanup()
                monitor.cancel()
                await asyncio.gather(monitor, return_exceptions=True)
                await render.stop()
    app.router.lifespan_context = lifespan

    @app.middleware("http")
    async def control(request, next_handler):
        path = request.url.path
        if not path.startswith("/api/"):
            return await next_handler(request)
        def render_status(data):
            return JSONResponse(dict(data, gpu_resident=render.ready,
                                     gpu_idle_seconds=render.idle, gpu_warmup_idle_seconds=render.warmup_idle,
                                     active_render_leases=render.users))

        if path == "/api/status" and not render.ready:
            return render_status(await native_status(request))
        if not render.ready and path in ("/api/avatars", "/api/avatar"):
            return await next_handler(request)
        if path == "/api/avatar/select" and request.method == "POST" and request.query_params.get("warmup") == "1":
            selection = AvatarSelectRequest(**(await request.json() or {}))
            target = validate_avatar_id(selection.avatar_id or state.model.default_avatar_id)
            if render.users:
                return JSONResponse({"detail": "Avatar in use"}, status_code=409)
            try:
                # A visible page may warm one renderer. It does not reserve a
                # conversation and only needs a short idle grace period.
                async with render.hold(target, warmup=True):
                    pass
            except (RuntimeError, OSError, httpx.HTTPError) as exc:
                logging.getLogger("uvicorn.error").warning("optional GPU warmup failed: %s", exc)
        if path == "/api/avatar/select" and state.service.status == "loading_models" and not render.ready:
            return JSONResponse({"detail":"Model is loading"}, status_code=409)
        async with render.lock:
            if render.ready and render.child.returncode is None:
                if path == "/api/avatar/select" and request.method == "POST":
                    payload = await request.json()
                    target = (payload or {}).get("avatar_id") or state.model.default_avatar_id
                    if render.users and target != state.model.avatar_id:
                        return JSONResponse({"detail":"Avatar in use"}, status_code=409)
                result = await render.client.request(request.method, render.http + request.url.path,
                    params=request.query_params, content=await request.body(),
                    headers={"content-type":request.headers.get("content-type","application/json")})
                if path == "/api/status" and result.is_success:
                    return render_status(result.json())
                if path == "/api/avatar/select" and result.is_success:
                    state.model.avatar_id = result.json()["active_avatar_id"]
                return Response(result.content, status_code=result.status_code,
                                media_type=result.headers.get("content-type"))
            if path == "/api/avatar/select" and request.method == "POST":
                try:
                    selection = AvatarSelectRequest(**(await request.json() or {}))
                    target = validate_avatar_id(selection.avatar_id or state.model.default_avatar_id)
                    info = await asyncio.to_thread(inspect_avatar_cache, target, state.args.version)
                except (ValueError, AvatarError) as exc:
                    return JSONResponse({"detail":str(exc)}, status_code=422)
                if not info.valid:
                    return JSONResponse({"detail":info.error}, status_code=422)
                if state.model.avatar_id != target:
                    state.model.avatar_revision += 1
                state.model.avatar_id = target
                state.model.width, state.model.height = info.width, info.height
                return JSONResponse(dict(success=True, **info.to_dict(),
                    default_avatar_id=state.model.default_avatar_id,
                    active_avatar_id=target, avatar_revision=state.model.avatar_revision))
        return await next_handler(request)

    @app.websocket("/ws/runtime")
    async def runtime(ws: WebSocket):
        await ws.accept()
        try:
            async with render.hold(ws.query_params.get("avatar_id")):
                await ws.send_json({"ready":True,"http":render.http})
                while (await ws.receive())["type"] != "websocket.disconnect":
                    pass
        except Exception as exc:
            if ws.client_state.name == "CONNECTED":
                await ws.send_json({"ready": False, "error": str(exc)})
                await ws.close(code=1011)

    # Compatibility with the original local viewer and PCM WebSocket clients.
    async def media(ws: WebSocket):
        await ws.accept()
        async with render.hold():
            query = "?" + ws.url.query if ws.url.query else ""
            async with websockets.connect(render.ws + ws.url.path + query, max_size=None,
                                          compression=None) as upstream:
                async def send():
                    while True:
                        msg = await ws.receive()
                        if msg["type"] == "websocket.disconnect":
                            return
                        await upstream.send(msg["bytes"] if "bytes" in msg and msg["bytes"] is not None else msg["text"])
                async def receive():
                    async for msg in upstream:
                        if isinstance(msg, bytes):
                            await ws.send_bytes(msg)
                        else:
                            await ws.send_text(msg)
                tasks = [asyncio.create_task(send()), asyncio.create_task(receive())]
                try:
                    await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
                finally:
                    for task in tasks:
                        task.cancel()
                    await asyncio.gather(*tasks, return_exceptions=True)
                if ws.client_state.name == "CONNECTED":
                    await ws.close()
    for path in ("/ws/minicpm", "/ws/audio", "/ws/live"):
        app.add_api_websocket_route(path, media)
    app.mount("/", create_app(state))
    return app


if __name__ == "__main__":
    config = sys.argv[1]
    state = configured(config)
    if len(sys.argv) == 4:
        sock = socket.socket(fileno=int(sys.argv[2]))
        state.model.avatar_id = sys.argv[3]
        threading.Thread(target=initialize, args=(state,), daemon=True).start()
        server = uvicorn.Server(uvicorn.Config(create_app(state), log_level="warning"))
        state.service.uvicorn_server = server
        server.run(sockets=[sock])
        os._exit(0)
    else:
        uvicorn.run(control_app(config, state), host=state.args.host, port=state.args.port,
                    access_log=False)
