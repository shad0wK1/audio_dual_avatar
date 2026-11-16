#!/usr/bin/env bash
# One-click launcher for the full-duplex digital human:
#   MuseTalk streaming server (lip-sync video, :8000)
#   MiniCPM-o demo: backend :22500, worker :22400, gateway + web UI :8006
# Both share ./.venv. GPU placement comes from .avatar-env or defaults to GPU 0.
#
# Usage: ./start_avatar.sh [start|stop|status]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
# Optional project-local overrides. Keep the checked-in example portable and
# do not commit machine-specific GPU UUIDs.
AVATAR_ENV_FILE="${AVATAR_ENV_FILE:-${ROOT}/.avatar-env}"
if [[ "${AVATAR_ENV_FILE}" != /* ]]; then
    AVATAR_ENV_FILE="${ROOT}/${AVATAR_ENV_FILE}"
fi
if [[ -f "${AVATAR_ENV_FILE}" ]]; then
    # shellcheck disable=SC1090
    source "${AVATAR_ENV_FILE}"
fi

# MiniCPM-o and MuseTalk may run on different physical GPUs. Falling back to
# CUDA_VISIBLE_DEVICES preserves the original single-GPU deployment.
MINICPM_CUDA_VISIBLE_DEVICES="${MINICPM_CUDA_VISIBLE_DEVICES:-${CUDA_VISIBLE_DEVICES:-0}}"
MUSETALK_CUDA_VISIBLE_DEVICES="${MUSETALK_CUDA_VISIBLE_DEVICES:-${MINICPM_CUDA_VISIBLE_DEVICES}}"
export CUDA_VISIBLE_DEVICES="${MINICPM_CUDA_VISIBLE_DEVICES}"
export AVATAR_STREAM_FORMAT="${AVATAR_STREAM_FORMAT:-h264}"
export AVATAR_STREAM_MAX_WIDTH="${AVATAR_STREAM_MAX_WIDTH:-0}"
export AVATAR_H264_BITRATE="${AVATAR_H264_BITRATE:-2M}"
export AVATAR_H264_MAXRATE="${AVATAR_H264_MAXRATE:-3M}"
export AVATAR_H264_BUFSIZE="${AVATAR_H264_BUFSIZE:-2M}"
export AVATAR_H264_GOP="${AVATAR_H264_GOP:-48}"
export AVATAR_H264_PRESET="${AVATAR_H264_PRESET:-veryfast}"
export AVATAR_H264_PROFILE="${AVATAR_H264_PROFILE:-high}"
export AVATAR_H264_LEVEL="${AVATAR_H264_LEVEL:-4.0}"
export AVATAR_H264_CODEC_STRING="${AVATAR_H264_CODEC_STRING:-avc1.640028}"

VENV_DIR="${AVATAR_VENV:-${ROOT}/.venv}"
PYTHON="${VENV_DIR}/bin/python"
MINICPM_DIR="${ROOT}/minicpm_demo"
MUSETALK_PROJECT="${ROOT}/musetalk_project"
MUSETALK_DIR="${MUSETALK_PROJECT}/MuseTalk"
# The 720p knowledge-sharing avatar is the default. Set MUSETALK_CONFIG to
# configs/streaming_duplex.yaml to run the original avatar cache as fallback.
MUSETALK_CONFIG="${MUSETALK_CONFIG:-configs/streaming_duplex_knowledge.yaml}"
MUSETALK_PORT=8000
GATEWAY_PORT="${DEMO_PORT:-8006}"
RUN_DIR="${ROOT}/.run"
LOG_DIR="${RUN_DIR}/logs"
PID_DIR="${RUN_DIR}/pids"
MUSETALK_PID="${PID_DIR}/musetalk.pid"

mkdir -p "${LOG_DIR}" "${PID_DIR}"

is_running() {
    local pid_file="$1"
    [[ -s "${pid_file}" ]] && kill -0 "$(cat "${pid_file}")" 2>/dev/null
}

wait_musetalk() {
    local attempts="${1:-150}"
    for ((i = 1; i <= attempts; i++)); do
        if ! is_running "${MUSETALK_PID}"; then
            echo "MuseTalk exited during startup, see ${LOG_DIR}/musetalk.log" >&2
            return 1
        fi
        if curl -sf "http://127.0.0.1:${MUSETALK_PORT}/api/status" 2>/dev/null \
            | grep -q '"ready":true'; then
            echo "MuseTalk ready: http://127.0.0.1:${MUSETALK_PORT}/"
            return 0
        fi
        sleep 2
    done
    echo "MuseTalk did not become ready, see ${LOG_DIR}/musetalk.log" >&2
    return 1
}

start_musetalk() {
    if is_running "${MUSETALK_PID}"; then
        echo "MuseTalk is already running (pid $(cat "${MUSETALK_PID}"))."
        return 0
    fi
    rm -f "${MUSETALK_PID}"
    # Same environment as musetalk_project/activate.sh, but with the shared venv.
    setsid -f env \
        CUDA_VISIBLE_DEVICES="${MUSETALK_CUDA_VISIBLE_DEVICES}" \
        VIRTUAL_ENV="${VENV_DIR}" \
        PATH="${VENV_DIR}/bin:${MUSETALK_DIR}/ffmpeg-4.4-amd64-static:${PATH}" \
        XDG_CACHE_HOME="${MUSETALK_PROJECT}/.cache" \
        HF_HOME="${MUSETALK_PROJECT}/.cache/huggingface" \
        TORCH_HOME="${MUSETALK_PROJECT}/.cache/torch" \
        MPLCONFIGDIR="${MUSETALK_PROJECT}/.cache/matplotlib" \
        FFMPEG_PATH="${MUSETALK_DIR}/ffmpeg-4.4-amd64-static" \
        PYTHONUNBUFFERED=1 \
        bash -c 'echo "$$" > "$1"; cd "$2"; shift 2; exec "$@"' \
        _ "${MUSETALK_PID}" "${MUSETALK_DIR}" \
        "${PYTHON}" stream_server.py --config "${MUSETALK_CONFIG}" \
        >"${LOG_DIR}/musetalk.log" 2>&1
    for _ in $(seq 1 50); do
        [[ -s "${MUSETALK_PID}" ]] && break
        sleep 0.1
    done
    echo "Started MuseTalk: pid $(cat "${MUSETALK_PID}") config=${MUSETALK_CONFIG}"
    wait_musetalk
}

start_minicpm() {
    # The gateway forwards duplex output audio to MuseTalk over this socket,
    # and proxies MuseTalk's viewer endpoints for the /avatar page.
    MINICPM_CUDA_VISIBLE_DEVICES="${MINICPM_CUDA_VISIBLE_DEVICES}" \
    CUDA_VISIBLE_DEVICES="${MINICPM_CUDA_VISIBLE_DEVICES}" \
    AVATAR_BRIDGE_URL="${AVATAR_BRIDGE_URL-ws://127.0.0.1:${MUSETALK_PORT}/ws/minicpm}" \
    AVATAR_HTTP_URL="${AVATAR_HTTP_URL-http://127.0.0.1:${MUSETALK_PORT}}" \
    DEMO_VENV="${VENV_DIR}" DEMO_PORT="${GATEWAY_PORT}" "${ROOT}/deploy/platform-start/start_all.sh"
}

stop_all() {
    "${MINICPM_DIR}/stop_all.sh" || true
    if is_running "${MUSETALK_PID}"; then
        local pid
        pid="$(cat "${MUSETALK_PID}")"
        kill "${pid}"
        # Wait for the port to be released before a restart can bind it.
        for _ in $(seq 1 30); do
            kill -0 "${pid}" 2>/dev/null || break
            sleep 1
        done
        kill -0 "${pid}" 2>/dev/null && kill -9 "${pid}"
        echo "Stopped MuseTalk: pid ${pid}"
    fi
    rm -f "${MUSETALK_PID}"
}

show_status() {
    if is_running "${MUSETALK_PID}"; then
        echo "MuseTalk: running (pid $(cat "${MUSETALK_PID}"))"
    else
        echo "MuseTalk: stopped"
    fi
    for name in gateway backend worker; do
        if is_running "${MINICPM_DIR}/tmp/pids/${name}.pid"; then
            echo "MiniCPM ${name}: running (pid $(cat "${MINICPM_DIR}/tmp/pids/${name}.pid"))"
        else
            echo "MiniCPM ${name}: stopped"
        fi
    done
}

case "${1:-start}" in
    start)
        if [[ ! -x "${PYTHON}" ]]; then
            echo "Missing shared venv: ${PYTHON}" >&2
            exit 1
        fi
        start_musetalk
        start_minicpm
        echo
        echo "Digital human services started"
        echo "  Digital human page:        https://127.0.0.1:${GATEWAY_PORT}/avatar"
        echo "  MiniCPM-o only (no avatar): https://127.0.0.1:${GATEWAY_PORT}/omni"
        echo "  MuseTalk debug viewer:     http://127.0.0.1:${MUSETALK_PORT}/  (one viewer at a time)"
        echo "  Avatar bridge:             gateway -> ws://127.0.0.1:${MUSETALK_PORT}/ws/minicpm"
        echo "  MuseTalk log:              ${LOG_DIR}/musetalk.log"
        echo "  MiniCPM-o logs:            ${MINICPM_DIR}/.run-logs"
        echo "  MiniCPM GPU:               ${MINICPM_CUDA_VISIBLE_DEVICES}"
        echo "  MuseTalk GPU:              ${MUSETALK_CUDA_VISIBLE_DEVICES}"
        echo "  Avatar frame format:       ${AVATAR_STREAM_FORMAT}"
        echo "  Stop:                      $0 stop"
        ;;
    stop)
        stop_all
        ;;
    status)
        show_status
        ;;
    *)
        echo "Usage: $0 [start|stop|status]" >&2
        exit 2
        ;;
esac
