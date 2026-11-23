"""Resident GPEN worker in a separate Python interpreter.

Only model inputs/outputs cross the private socket. Frame identity and cancellation
metadata stay in the existing bounded queues in the MuseTalk process.
"""
from __future__ import annotations

import argparse
import math
import os
from pathlib import Path
import pickle
import select
import socket
import struct
import subprocess
import sys
import threading
import time
import traceback

import numpy as np

from .restoration import GPENFaceProcessor, ROOT
from ..log import log

_HEADER = struct.Struct('!Q')
_MAX_MESSAGE = 8 * 1024 * 1024


def _set_deadline(connection: socket.socket, deadline: float) -> None:
    remaining = deadline - time.monotonic()
    if remaining <= 0:
        raise TimeoutError('GPEN IPC timed out')
    connection.settimeout(remaining)


def _send_message(connection: socket.socket, message, deadline: float) -> None:
    payload = pickle.dumps(message, protocol=5)
    if len(payload) > _MAX_MESSAGE:
        raise ValueError('GPEN IPC message too large')
    _set_deadline(connection, deadline)
    connection.sendall(_HEADER.pack(len(payload)))
    _set_deadline(connection, deadline)
    connection.sendall(payload)


def _read_exact(connection: socket.socket, size: int, deadline: float) -> bytearray:
    buffer = bytearray(size)
    view = memoryview(buffer)
    offset = 0
    while offset < size:
        _set_deadline(connection, deadline)
        count = connection.recv_into(view[offset:])
        if not count:
            raise EOFError('GPEN worker connection closed')
        offset += count
    return buffer


def _receive_message(connection: socket.socket, deadline: float):
    size, = _HEADER.unpack(_read_exact(connection, _HEADER.size, deadline))
    if size > _MAX_MESSAGE:
        raise ValueError('GPEN IPC message too large')
    # This FD is private to the parent/child; pickle is never read from a client.
    return pickle.loads(_read_exact(connection, size, deadline))


class _WorkerClient:
    """One in-flight request, with deadlines covering send and receive."""

    def __init__(self, command: list[str], *, startup_timeout: float,
                 request_timeout: float):
        self.request_timeout = request_timeout
        self._rpc_lock = threading.Lock()
        self._close_lock = threading.Lock()
        self._closed = threading.Event()
        self._error = ''
        self._sequence = 0
        self._process = None
        self._connection, child_connection = socket.socketpair()
        try:
            self._process = subprocess.Popen(
                [*command, '--fd', str(child_connection.fileno()),
                 '--parent-pid', str(os.getpid())],
                cwd=ROOT, pass_fds=(child_connection.fileno(),),
            )
            child_connection.close()
            message = _receive_message(
                self._connection, time.monotonic() + startup_timeout)
            if message.get('type') != 'ready':
                raise RuntimeError(message.get('error', 'invalid GPEN startup response'))
            self.worker_status = message['status']
        except Exception as exc:
            self._error = f'GPEN worker startup failed: {type(exc).__name__}: {exc}'
            self.close()
            raise RuntimeError(self._error) from exc
        finally:
            child_connection.close()

    @property
    def pid(self) -> int | None:
        return self._process.pid if self._process is not None else None

    @property
    def alive(self) -> bool:
        return self._process is not None and self._process.poll() is None

    @property
    def error(self) -> str:
        if not self._error and not self._closed.is_set() and not self.alive:
            return f'GPEN worker exited (code={self._process.returncode})'
        return self._error

    def infer(self, aligned: np.ndarray) -> dict:
        started = time.monotonic()
        deadline = started + self.request_timeout
        if not self._rpc_lock.acquire(timeout=self.request_timeout):
            raise RuntimeError('GPEN request lock timed out')
        try:
            if self._closed.is_set():
                raise RuntimeError(self._error or 'GPEN worker is closed')
            if not self.alive:
                raise RuntimeError(self.error)
            self._sequence += 1
            request_id = self._sequence
            _send_message(self._connection,
                          {'type': 'infer', 'id': request_id, 'image': aligned}, deadline)
            response = _receive_message(self._connection, deadline)
            if response.get('type') == 'error':
                raise RuntimeError(response['error'])
            if response.get('type') != 'result' or response.get('id') != request_id:
                raise RuntimeError('GPEN worker response sequence mismatch')
            image = response.get('image')
            if not isinstance(image, np.ndarray) or image.shape != (512, 512, 3) or image.dtype != np.uint8:
                raise RuntimeError('GPEN worker returned invalid image')
            response['rpc_ms'] = (time.monotonic() - started) * 1000
            return response
        except Exception as exc:
            if not self._error:
                self._error = f'GPEN request failed: {type(exc).__name__}: {exc}'
            self.close()
            raise RuntimeError(self._error) from exc
        finally:
            self._rpc_lock.release()

    def close(self) -> None:
        # Shutdown the socket before waiting: this also wakes a concurrent recv.
        with self._close_lock:
            if self._closed.is_set():
                return
            self._closed.set()
            try:
                self._connection.shutdown(socket.SHUT_RDWR)
            except OSError:
                pass
            self._connection.close()
            process = self._process
            if process is None:
                return
            try:
                process.wait(timeout=1)
            except subprocess.TimeoutExpired:
                process.terminate()
                try:
                    process.wait(timeout=2)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait(timeout=2)


def _positive_timeout(name: str, default: float) -> float:
    value = float(os.environ.get(name, default))
    if not math.isfinite(value) or value <= 0:
        raise ValueError(f'{name} must be finite and positive')
    return value


class GPENProcessRestorer(GPENFaceProcessor):
    def __init__(self, path: Path, device: str):
        super().__init__()
        self.device = str(device)
        startup = _positive_timeout('MUSETALK_GPEN_STARTUP_TIMEOUT_SECONDS', 180)
        timeout = _positive_timeout('MUSETALK_GPEN_REQUEST_TIMEOUT_SECONDS', 30)
        self._metrics_lock = threading.Lock()
        self._metrics = dict(frames=0, total_ms=0., last_ms=0.,
                             rpc_total_ms=0., rpc_last_ms=0.)
        self._client = _WorkerClient(
            [sys.executable, '-m', 'muse_stream.inference.gpen_process',
             '--weights', str(path), '--device', self.device],
            startup_timeout=startup, request_timeout=timeout,
        )
        self.operators = self._client.worker_status['operators']
        log(f'GPEN process ready: pid={self._client.pid}, device={self.device}, '
            f'{self.operators} ops; one in-flight request')

    def infer_aligned(self, aligned: np.ndarray) -> np.ndarray:
        if aligned.shape != (512, 512, 3) or aligned.dtype != np.uint8:
            raise ValueError(f'GPEN expects uint8 BGR 512x512, got {aligned.shape}/{aligned.dtype}')
        response = self._client.infer(aligned)
        with self._metrics_lock:
            metrics = self._metrics
            metrics['frames'] += 1
            metrics['last_ms'] = response['model_ms']
            metrics['total_ms'] += response['model_ms']
            metrics['rpc_last_ms'] = response['rpc_ms']
            metrics['rpc_total_ms'] += response['rpc_ms']
            frames = metrics['frames']
            if frames % 120 == 0:
                log(f'GPEN process restored {frames} frames: '
                    f'model={metrics["total_ms"]/frames:.1f}ms '
                    f'rpc={metrics["rpc_total_ms"]/frames:.1f}ms')
        return response['image']

    def status(self) -> dict:
        with self._metrics_lock:
            metrics = self._metrics.copy()
        n = max(1, metrics['frames'])
        return dict(
            mode='gpen', execution='process', device=self.device,
            operators=self.operators, pid=self._client.pid, alive=self._client.alive,
            error=self._client.error, frames=metrics['frames'],
            mean_ms=round(metrics['total_ms']/n, 2), last_ms=round(metrics['last_ms'], 2),
            rpc_mean_ms=round(metrics['rpc_total_ms']/n, 2),
            rpc_last_ms=round(metrics['rpc_last_ms'], 2),
            ipc_mean_ms=round((metrics['rpc_total_ms']-metrics['total_ms'])/n, 2),
            ipc_last_ms=round(metrics['rpc_last_ms']-metrics['last_ms'], 2),
            last_finalize_ms=round(self.last_finalize_ms, 2),
        )

    def close(self) -> None:
        self._client.close()


def _watch_parent(parent_pid: int) -> None:
    # Covers SIGKILL/os._exit of the parent, including during CUDA initialization.
    while True:
        time.sleep(.5)
        if os.getppid() != parent_pid:
            os._exit(0)


def _serve_worker(connection, path, device, factory, parent_pid: int) -> None:
    threading.Thread(target=_watch_parent, args=(parent_pid,), daemon=True).start()
    try:
        restorer = factory(path, device)
        _send_message(connection, {'type': 'ready', 'status': restorer.status()},
                      time.monotonic() + 30)
        while True:
            # Wait without an idle deadline, but bound a request once bytes arrive.
            select.select([connection], [], [])
            request = _receive_message(connection, time.monotonic() + 30)
            started = time.perf_counter()
            image = restorer.infer_aligned(request['image'])
            model_ms = (time.perf_counter() - started) * 1000
            _send_message(connection,
                          dict(type='result', id=request['id'], image=image,
                               model_ms=model_ms, status=restorer.status()),
                          time.monotonic() + 30)
    except (EOFError, BrokenPipeError, ConnectionResetError):
        pass
    except Exception:
        error = traceback.format_exc()
        log(f'GPEN worker failed:\n{error}')
        try:
            _send_message(connection, {'type': 'error', 'error': error},
                          time.monotonic() + 2)
        except (OSError, TimeoutError):
            pass
    finally:
        connection.close()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--fd', type=int, required=True)
    parser.add_argument('--parent-pid', type=int, required=True)
    parser.add_argument('--weights', type=Path, required=True)
    parser.add_argument('--device', required=True)
    args = parser.parse_args()
    from .restoration import GPENRestorer
    _serve_worker(socket.socket(fileno=args.fd), args.weights, args.device,
                  GPENRestorer, args.parent_pid)
    # CUDA/TensorFlow dependencies can retain non-daemon threads.
    sys.stdout.flush()
    sys.stderr.flush()
    os._exit(0)


if __name__ == '__main__':
    main()
