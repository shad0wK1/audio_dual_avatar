#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$(realpath "$0")")"
root="$PWD"
py="$root/.venv/bin/python"
export OMP_NUM_THREADS=4 MKL_NUM_THREADS=4 HF_HUB_OFFLINE=1 TRANSFORMERS_OFFLINE=1 PYTHONUNBUFFERED=1
case "$1" in
muse)
    set -a; source "$root/.avatar-env"; set +a
    export CUDA_VISIBLE_DEVICES="$MUSETALK_CUDA_VISIBLE_DEVICES"
    export XDG_CACHE_HOME="$root/musetalk_project/.cache" HF_HOME="$root/musetalk_project/.cache/huggingface" TORCH_HOME="$root/musetalk_project/.cache/torch"
    export MPLCONFIGDIR="$root/.run/matplotlib" VIRTUAL_ENV="$root/.venv"
    cd "$root/musetalk_project/MuseTalk"
    export FFMPEG_PATH="$PWD/ffmpeg-4.4-amd64-static" PATH="$root/.venv/bin:$PWD/ffmpeg-4.4-amd64-static:$PATH"
    exec "$py" stream_server.py --config "$root/musetalk.yaml" ;;
worker)
    exec "$py" -m uvicorn cloud.worker:app --host 127.0.0.1 --port 22410 --no-access-log ;;
gateway)
    source "$root/.avatar-env"
    export AVATAR_BRIDGE_URL=ws://127.0.0.1:8100/ws/minicpm AVATAR_HTTP_URL=http://127.0.0.1:8100
    export ENABLE_PUBLIC_ADMIN=0 AVATAR_CUSTOMIZATION_ENABLED=false
    cd "$root/minicpm_demo"
    export PYTHONPATH="$root:$PWD"
    exec "$py" -m uvicorn cloud.gateway_entry:app --host 127.0.0.1 --port 8106 --no-access-log --ssl-keyfile certs/key.pem --ssl-certfile certs/cert.pem ;;
*) exit 2 ;;
esac
