#!/usr/bin/env bash
set -euo pipefail
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PYTHON="${PLATFORM_PYTHON:-${APP_DIR}/.venv/bin/python}"
if [[ ! -x "$PYTHON" ]]; then
    echo '先创建 Python 3.10+ 虚拟环境并安装 requirements.txt，或设置 PLATFORM_PYTHON。' >&2
    exit 1
fi
cd "$APP_DIR"
exec "$PYTHON" app.py "$@"
