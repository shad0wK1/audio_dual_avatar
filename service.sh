#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$(realpath "$0")")"
root="$PWD"
py="$root/.venv/bin/python"
export OMP_NUM_THREADS=4 MKL_NUM_THREADS=4 HF_HUB_OFFLINE=1 TRANSFORMERS_OFFLINE=1 PYTHONUNBUFFERED=1
case "$1" in
muse)
    set -a; source "$root/.avatar-env"; set +a
    source "$root/.gpen-env"
    export CUDA_VISIBLE_DEVICES="$MUSETALK_CUDA_VISIBLE_DEVICES"
    if [[ "${MUSETALK_FACE_RESTORATION,,}" == gpen && -n "${MUSETALK_GPEN_CUDA_VISIBLE_DEVICE:-}" ]]; then
        export CUDA_VISIBLE_DEVICES="$CUDA_VISIBLE_DEVICES,$MUSETALK_GPEN_CUDA_VISIBLE_DEVICE"
        export MUSETALK_GPEN_DEVICE=cuda:1
    fi
    export AVATAR_GPU_IDLE_SECONDS=300
    export XDG_CACHE_HOME="$root/musetalk_project/.cache" HF_HOME="$root/musetalk_project/.cache/huggingface" TORCH_HOME="$root/musetalk_project/.cache/torch"
    export MPLCONFIGDIR="$root/.run/matplotlib" VIRTUAL_ENV="$root/.venv"
    cd "$root/musetalk_project/MuseTalk"
    export FFMPEG_PATH="$PWD/ffmpeg-4.4-amd64-static" PATH="$root/.venv/bin:$PWD/ffmpeg-4.4-amd64-static:$PATH"
    "$py" -m muse_stream.frame_bank --warm results/v15/avatars/{gril_v2,knowledge_host_720p_stable_v1,musetalk_test_avatar} || echo "Decoded frame RAM cache unavailable" >&2
    exec "$py" -m muse_stream.on_demand "$root/musetalk.yaml" ;;
worker)
    exec "$py" -m uvicorn cloud.worker:app --host 127.0.0.1 --port 22410 --no-access-log ;;
gateway)
    source "$root/.avatar-env"
    export AVATAR_BRIDGE_URL=ws://127.0.0.1:8100/ws/minicpm AVATAR_HTTP_URL=http://127.0.0.1:8100
    export AVATAR_GPU_ON_DEMAND=1
    export ENABLE_PUBLIC_ADMIN=0 AVATAR_CUSTOMIZATION_ENABLED=false
    cd "$root/minicpm_demo"
    export PYTHONPATH="$root:$PWD"
    exec "$py" -m uvicorn cloud.gateway_entry:app --host 127.0.0.1 --port 8106 --no-access-log --ssl-keyfile certs/key.pem --ssl-certfile certs/cert.pem ;;
*) exit 2 ;;
esac
