#!/usr/bin/env bash
set -euo pipefail

DEMO_DIR="$(cd "$(dirname "$0")/../../minicpm_demo" && pwd)"
MODEL_DIR="${DEMO_DIR}/model"
VENV_DIR="${DEMO_VENV:-${DEMO_DIR}/.venv/base}"
PYTHON="${VENV_DIR}/bin/python"
LOG_DIR="${DEMO_DIR}/.run-logs"
PID_DIR="${DEMO_DIR}/tmp/pids"
DATA_DIR="${DEMO_DIR}/data"
REF_AUDIO="${DEMO_DIR}/assets/ref_audio/ref_minicpm_signature.wav"
GATEWAY_PORT="${DEMO_PORT:-8006}"

mkdir -p "${LOG_DIR}" "${PID_DIR}" "${DATA_DIR}"
cd "${DEMO_DIR}"

if [[ ! -x "${PYTHON}" ]]; then
    echo "Missing demo Python environment: ${PYTHON}" >&2
    exit 1
fi

if [[ -f "${PID_DIR}/gateway.pid" ]]; then
    gateway_pid="$(cat "${PID_DIR}/gateway.pid")"
    if kill -0 "${gateway_pid}" 2>/dev/null; then
        echo "MiniCPM-o demo is already running (gateway pid ${gateway_pid})."
        echo "Use ./stop_all.sh first to restart."
        exit 0
    fi
fi

if [[ ! -f "${MODEL_DIR}/config.json" ]]; then
    echo "Missing model config: ${MODEL_DIR}/config.json" >&2
    exit 1
fi

if [[ ! -f "${DEMO_DIR}/certs/cert.pem" || ! -f "${DEMO_DIR}/certs/key.pem" ]]; then
    echo "Missing TLS certificate in ${DEMO_DIR}/certs" >&2
    exit 1
fi

wait_http() {
    local url="$1"
    local label="$2"
    local attempts="${3:-180}"
    local curl_args=(-sf)
    if [[ "${url}" == https://* ]]; then
        curl_args+=(-k)
    fi
    for ((i = 1; i <= attempts; i++)); do
        if curl "${curl_args[@]}" "${url}" >/dev/null 2>&1; then
            echo "${label} ready: ${url}"
            return 0
        fi
        sleep 2
    done
    echo "${label} did not become ready: ${url}" >&2
    return 1
}

start_process() {
    local name="$1"
    shift
    local pid_file="${PID_DIR}/${name}.pid"
    rm -f "${pid_file}"
    if command -v setsid >/dev/null 2>&1; then
        setsid -f bash -c 'echo "$$" > "$1"; shift; exec "$@"' \
            _ "${pid_file}" "$@" >"${LOG_DIR}/${name}.log" 2>&1
    else
        nohup bash -c 'echo "$$" > "$1"; shift; exec "$@"' \
            _ "${pid_file}" "$@" >"${LOG_DIR}/${name}.log" 2>&1 &
    fi
    for _ in $(seq 1 50); do
        [[ -s "${pid_file}" ]] && break
        sleep 0.1
    done
    if [[ ! -s "${pid_file}" ]]; then
        echo "Failed to start ${name}" >&2
        return 1
    fi
    echo "Started ${name}: pid $(cat "${pid_file}")"
}

export PYTHONPATH="${DEMO_DIR}"
export PYTHONUNBUFFERED=1
# install.sh places a platform-compatible ffmpeg wrapper here.
export PATH="${DEMO_DIR}/.bin:${PATH}"

start_process gateway \
    env ENABLE_PUBLIC_ADMIN=0 \
    "${PYTHON}" gateway.py \
    --host 127.0.0.1 \
    --port "${GATEWAY_PORT}" \
    --internal-port 8007 \
    --https \
    --ssl-certfile "${DEMO_DIR}/certs/cert.pem" \
    --ssl-keyfile "${DEMO_DIR}/certs/key.pem" \
    --lang zh
wait_http "https://127.0.0.1:${GATEWAY_PORT}/health" "gateway" 60
wait_http "http://127.0.0.1:8007/health" "gateway internal" 60

start_process backend env \
    CUDA_VISIBLE_DEVICES="${MINICPM_CUDA_VISIBLE_DEVICES:-${CUDA_VISIBLE_DEVICES:-0}}" \
    "${PYTHON}" -m py_backend.server \
    --host 127.0.0.1 \
    --port 22500 \
    --gpu-id 0 \
    --model-path "${MODEL_DIR}" \
    --ref-audio-path "${REF_AUDIO}"
wait_http "http://127.0.0.1:22500/health" "backend" 300

start_process worker \
    "${PYTHON}" worker.py \
    --host 127.0.0.1 \
    --port 22400 \
    --gpu-id 0 \
    --worker-index 0 \
    --backend-server-url "http://127.0.0.1:22500" \
    --ref-audio-path "${REF_AUDIO}"
wait_http "http://127.0.0.1:22400/health" "worker" 60

for ((i = 1; i <= 60; i++)); do
    if curl -sf -X PUT \
        -H 'content-type: application/json' \
        --data '{"endpoint":"127.0.0.1:22400","gpu_group":"gpu-0"}' \
        "http://127.0.0.1:8007/internal/workers/worker-0" >/dev/null; then
        echo "Worker registered: worker-0 -> 127.0.0.1:22400"
        break
    fi
    sleep 2
    if [[ "${i}" -eq 60 ]]; then
        echo "Worker registration failed" >&2
        exit 1
    fi
done

echo
echo "MiniCPM-o demo started"
echo "  UI:       https://127.0.0.1:${GATEWAY_PORT}/"
echo "  Health:   https://127.0.0.1:${GATEWAY_PORT}/health"
echo "  Workers:  https://127.0.0.1:${GATEWAY_PORT}/workers"
echo "  Admin:    https://127.0.0.1:${GATEWAY_PORT}/admin"
echo "  Logs:     ${LOG_DIR}"
echo "  PIDs:     ${PID_DIR}"

