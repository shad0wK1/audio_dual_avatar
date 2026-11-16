"""Manage only this isolated Linux deployment; never stop unrelated processes."""
import argparse
import os
from pathlib import Path
import signal
import socket
import subprocess

root = Path(__file__).resolve().parent
app = root / 'example/minimal-platform'
run = root / '.run'
python = root / '.runtime/bin/python'
parser = argparse.ArgumentParser()
parser.add_argument('action', choices=['start', 'stop', 'status'])
parser.add_argument('--test', action='store_true', help='manage mock BFF and mock Gateway only')
args = parser.parse_args()
services = [('platform-bff', 18080, None, None)]
if args.test:
    services = [('mock-gateway', 18086, 'tests.mock_gateway:app', None),
                ('mock-bff', 18081, None, 'http://127.0.0.1:18086')]
run.mkdir(exist_ok=True)
for name, port, module, upstream in services:
    pid_path = run / f'{name}.pid'
    pid = int(pid_path.read_text()) if pid_path.exists() else None
    owned = False
    if pid:
        proc = Path('/proc') / str(pid)
        try:
            command = (proc / 'cmdline').read_bytes()
            owned = str(python).encode() in command and (proc / 'cwd').resolve() == app
        except (OSError, ValueError):
            pass
    if args.action == 'status':
        print(f'{name}: {"running" if owned else "stopped"}, pid={pid}, 127.0.0.1:{port}')
    elif args.action == 'stop':
        if owned:
            os.kill(pid, signal.SIGTERM)
            print(f'{name}: stopping pid={pid}')
        elif pid:
            print(f'{name}: recorded PID does not belong to this service; no signal sent')
    elif not owned:
        with socket.socket() as probe:
            if probe.connect_ex(('127.0.0.1', port)) == 0:
                raise SystemExit(f'Port {port} is occupied; refusing to replace the listener')
        env = dict(os.environ, PYTHONDONTWRITEBYTECODE='1')
        if upstream:
            env.update(AVATAR_API_BASE_URL=upstream, AVATAR_API_KEY='', AVATAR_CA_BUNDLE='')
        if module:
            command = [str(python), '-m', 'uvicorn', module, '--host', '127.0.0.1', '--port', str(port), '--no-access-log']
        else:
            command = [str(python), str(app / 'app.py'), '--port', str(port)]
        with (run / f'{name}.log').open('ab') as log:
            process = subprocess.Popen(command, cwd=app, env=env, stdin=subprocess.DEVNULL,
                                       stdout=log, stderr=log, start_new_session=True)
        pid_path.write_text(str(process.pid))
        print(f'{name}: started pid={process.pid}, 127.0.0.1:{port}')
    else:
        print(f'{name}: already running pid={pid}')
