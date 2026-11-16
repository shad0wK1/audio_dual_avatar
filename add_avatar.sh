#!/usr/bin/env bash
# Add a MuseTalk avatar from a source video and bind it to a voice and prompt.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MINICPM_DIR="${ROOT}/minicpm_demo"
MUSETALK_PROJECT="${ROOT}/musetalk_project"
MUSETALK_DIR="${MUSETALK_PROJECT}/MuseTalk"
SHARED_VENV="${AVATAR_VENV:-${ROOT}/.venv}"
if [[ "${SHARED_VENV}" != /* ]]; then
    SHARED_VENV="${ROOT}/${SHARED_VENV}"
fi
MUSETALK_VENV="${ROOT}/.venv-preprocess"
PROJECT_PY="${SHARED_VENV}/bin/python"
MUSETALK_PY="${MUSETALK_VENV}/bin/python"
SHARED_ACTIVATE="${SHARED_VENV}/bin/activate"
CACHE_BUILDER="${MUSETALK_DIR}/scripts/prepare_command_avatar.py"
VOICE_DIR="${MINICPM_DIR}/assets/ref_audio"
PROMPT_DIR="${MINICPM_DIR}/assets/prompts/avatar"
PRESET_FILE="${MINICPM_DIR}/assets/avatar_presets.yaml"
MANIFEST_FILE="${MINICPM_DIR}/MANIFEST.sha256"
AVATAR_ROOT="${MUSETALK_DIR}/results/v15/avatars"

GPU_ARG=""
PRESET_ID=""
PRESET_NAME=""
PRESET_DESCRIPTION="由 add_avatar.sh 添加的数字人形象"
OWNER_ID=""
VISIBILITY=""
RUNTIME_MODE=0
DRY_RUN=0
POSITIONAL=()

usage() {
    cat <<'EOF'
Usage:
  ./add_avatar.sh [options] VIDEO AVATAR_ID VOICE PROMPT

Required arguments:
  VIDEO       Reference video. It is normalized to 24 fps, H.264/yuv420p.
  AVATAR_ID   New cache/preset ID. Letters, digits, '_' and '-' only.
  VOICE       Voice reference path, or an existing filename under
              minicpm_demo/assets/ref_audio/. "default" is also accepted.
  PROMPT      Prompt file path, or an existing filename under
              minicpm_demo/assets/prompts/avatar/. "knowledge_host" and
              "classic" may omit the .txt suffix.

Options:
  --gpu N               Physical GPU index. Default: GPU with most free VRAM.
  --preset-id ID        Preset ID. Default: AVATAR_ID.
  --name NAME           Display name on the avatar card. Default: AVATAR_ID.
  --description TEXT    Card description.
  --owner-id ID         Owner for a runtime-created private preset.
  --visibility MODE     public or private. Default: private in runtime mode.
  --runtime             Write runtime user data instead of repository files.
  --dry-run             Validate and print the plan without writing files.
  -h, --help            Show this help.

Environment:
  ADD_AVATAR_GPU          Same as --gpu; --gpu takes precedence.
  ADD_AVATAR_MIN_FREE_MB  Minimum free VRAM for automatic GPU selection
                          (default: 12000).
  AVATAR_VENV             Shared project venv (default: ./.venv).

The script activates the shared venv automatically. Video preprocessing runs
in .venv-preprocess for CPU landmarks and in .venv for GPU cache encoding.

Examples:
  ./add_avatar.sh data/video/alice.mp4 alice_avatar data/alice.wav data/alice.txt
  ./add_avatar.sh --gpu 1 video.mp4 alice default knowledge_host
  ./add_avatar.sh --runtime --owner-id user-a video.mp4 alice voice.wav prompt.txt
  ./add_avatar.sh --name "讲解员小艾" --dry-run video.mp4 alice voice.wav prompt.txt
EOF
}

die() {
    echo "ERROR: $*" >&2
    exit 1
}

step() {
    echo
    echo "==> $*"
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --gpu)
            [[ $# -ge 2 ]] || die "--gpu requires a value"
            GPU_ARG="$2"
            shift 2
            ;;
        --preset-id)
            [[ $# -ge 2 ]] || die "--preset-id requires a value"
            PRESET_ID="$2"
            shift 2
            ;;
        --name)
            [[ $# -ge 2 ]] || die "--name requires a value"
            PRESET_NAME="$2"
            shift 2
            ;;
        --description)
            [[ $# -ge 2 ]] || die "--description requires a value"
            PRESET_DESCRIPTION="$2"
            shift 2
            ;;
        --owner-id)
            [[ $# -ge 2 ]] || die "--owner-id requires a value"
            OWNER_ID="$2"
            shift 2
            ;;
        --visibility)
            [[ $# -ge 2 ]] || die "--visibility requires a value"
            VISIBILITY="$2"
            shift 2
            ;;
        --runtime)
            RUNTIME_MODE=1
            shift
            ;;
        --dry-run)
            DRY_RUN=1
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        --)
            shift
            POSITIONAL+=("$@")
            break
            ;;
        -*)
            die "unknown option: $1 (use -- before paths that start with '-')"
            ;;
        *)
            POSITIONAL+=("$1")
            shift
            ;;
    esac
done

if [[ ${#POSITIONAL[@]} -ne 4 ]]; then
    usage >&2
    exit 2
fi

VIDEO_ARG="${POSITIONAL[0]}"
AVATAR_ID="${POSITIONAL[1]}"
VOICE_ARG="${POSITIONAL[2]}"
PROMPT_ARG="${POSITIONAL[3]}"
PRESET_ID="${PRESET_ID:-${AVATAR_ID}}"
PRESET_NAME="${PRESET_NAME:-${AVATAR_ID}}"
if [[ "${RUNTIME_MODE}" -eq 1 ]]; then
    VISIBILITY="${VISIBILITY:-private}"
    OWNER_ID="${OWNER_ID:-anonymous}"
else
    VISIBILITY="${VISIBILITY:-public}"
    [[ -z "${OWNER_ID}" ]] \
        || die "--owner-id is only valid together with --runtime"
fi
PRESET_SOURCE="system"
[[ "${RUNTIME_MODE}" -eq 1 ]] && PRESET_SOURCE="user"
REQUESTED_GPU="${GPU_ARG:-${ADD_AVATAR_GPU:-}}"
MIN_FREE_MB="${ADD_AVATAR_MIN_FREE_MB:-12000}"

[[ "${AVATAR_ID}" =~ ^[A-Za-z0-9_-]{1,128}$ ]] \
    || die "invalid AVATAR_ID: '${AVATAR_ID}'; use letters, digits, '_' or '-'"
[[ "${PRESET_ID}" =~ ^[A-Za-z0-9_-]{1,64}$ ]] \
    || die "invalid preset ID: '${PRESET_ID}'; use 1-64 letters, digits, '_' or '-'"
[[ -z "${OWNER_ID}" || "${OWNER_ID}" =~ ^[A-Za-z0-9_.:@-]{1,128}$ ]] \
    || die "invalid OWNER_ID"
[[ "${VISIBILITY}" == "public" || "${VISIBILITY}" == "private" ]] \
    || die "VISIBILITY must be public or private"
[[ -z "${REQUESTED_GPU}" || "${REQUESTED_GPU}" =~ ^[0-9]+$ ]] \
    || die "--gpu/ADD_AVATAR_GPU must be a numeric GPU index"
[[ "${MIN_FREE_MB}" =~ ^[0-9]+$ ]] \
    || die "ADD_AVATAR_MIN_FREE_MB must be a positive integer"



if [[ "${RUNTIME_MODE}" -eq 1 ]]; then
    RUNTIME_DATA_ROOT="${AVATAR_RUNTIME_ROOT:-${MINICPM_DIR}/data/avatar_customizations}"
    RUNTIME_DATA_ROOT="$(realpath --canonicalize-missing -- "${RUNTIME_DATA_ROOT}")"
    case "${RUNTIME_DATA_ROOT}/" in
        "${MINICPM_DIR}/"*) ;;
        *) die "runtime data root must be under ${MINICPM_DIR}" ;;
    esac
    VOICE_DIR="${RUNTIME_DATA_ROOT}/assets/ref_audio"
    PROMPT_DIR="${RUNTIME_DATA_ROOT}/assets/prompts/avatar"
    PRESET_FILE="${RUNTIME_DATA_ROOT}/avatar_presets.user.yaml"
    if [[ "${DRY_RUN}" -eq 0 ]]; then
        mkdir -p "${VOICE_DIR}" "${PROMPT_DIR}" "${RUNTIME_DATA_ROOT}"
        if [[ ! -f "${PRESET_FILE}" ]]; then
            printf 'version: 1\npresets: {}\n' >"${PRESET_FILE}"
        fi
    fi
fi

[[ -f "${SHARED_ACTIVATE}" ]] \
    || die "missing shared venv activation script: ${SHARED_ACTIVATE}; run ./install.sh first"
[[ -f "${CACHE_BUILDER}" ]] || die "missing cache builder: ${CACHE_BUILDER}"
# shellcheck source=/dev/null
source "${SHARED_ACTIVATE}"
echo "Activated shared venv: ${SHARED_VENV}"

resolve_asset() {
    local raw="$1"
    local directory="$2"
    local default_suffix="$3"
    local candidate

    if [[ -f "${raw}" ]]; then
        realpath -e -- "${raw}"
        return 0
    fi
    for candidate in "${directory}/${raw}" "${directory}/${raw}${default_suffix}"; do
        if [[ -f "${candidate}" ]]; then
            realpath -e -- "${candidate}"
            return 0
        fi
    done
    return 1
}

[[ -f "${VIDEO_ARG}" ]] || die "reference video not found: ${VIDEO_ARG}"
VIDEO_SOURCE="$(realpath -e -- "${VIDEO_ARG}")"

if [[ "${VOICE_ARG}" == "default" ]]; then
    VOICE_ARG="ref_avatar_default.wav"
fi
VOICE_SOURCE="$(resolve_asset "${VOICE_ARG}" "${VOICE_DIR}" ".wav")" \
    || die "voice reference not found: ${VOICE_ARG}"
PROMPT_SOURCE="$(resolve_asset "${PROMPT_ARG}" "${PROMPT_DIR}" ".txt")" \
    || die "prompt file not found: ${PROMPT_ARG}"

[[ -s "${VOICE_SOURCE}" ]] || die "voice reference is empty: ${VOICE_SOURCE}"
[[ -s "${PROMPT_SOURCE}" ]] || die "prompt file is empty: ${PROMPT_SOURCE}"
[[ -x "${MUSETALK_PY}" ]] \
    || die "missing mmpose-capable Python: ${MUSETALK_PY}; run ./install.sh first"
[[ -x "${PROJECT_PY}" ]] \
    || die "missing shared Python: ${PROJECT_PY}; run ./install.sh first"
ALLOW_MISSING_PRESET=0
if [[ ! -f "${PRESET_FILE}" ]]; then
    if [[ "${RUNTIME_MODE}" -eq 1 && "${DRY_RUN}" -eq 1 ]]; then
        ALLOW_MISSING_PRESET=1
    else
        die "avatar preset config not found: ${PRESET_FILE}"
    fi
fi
if [[ "${RUNTIME_MODE}" -eq 0 ]]; then
    [[ -f "${MANIFEST_FILE}" ]] || die "manifest not found: ${MANIFEST_FILE}"
fi

if [[ "${DRY_RUN}" -eq 0 ]]; then
    mkdir -p "${ROOT}/.run"
    exec 9>"${ROOT}/.run/add_avatar.lock"
    flock -n 9 || die "another add_avatar.sh process is already running"
fi

PATH="${MINICPM_DIR}/.bin:${PATH}" "${PROJECT_PY}" - \
    "${PRESET_FILE}" \
    "${PRESET_ID}" \
    "${VOICE_SOURCE}" \
    "${PROMPT_SOURCE}" \
    "${ALLOW_MISSING_PRESET}" <<'PY'
import sys
from pathlib import Path

import librosa
import yaml

preset_path, preset_id, voice_path, prompt_path, allow_missing = sys.argv[1:]
if allow_missing == "1" and not Path(preset_path).is_file():
    config = {"version": 1, "presets": {}}
else:
    config = yaml.safe_load(Path(preset_path).read_text(encoding="utf-8"))
if not isinstance(config, dict) or not isinstance(config.get("presets"), dict):
    raise SystemExit(f"invalid avatar preset config: {preset_path}")
if preset_id in config["presets"]:
    raise SystemExit(f"avatar preset already exists: {preset_id}")

audio, _ = librosa.load(voice_path, sr=16000, mono=True)
if audio.size == 0:
    raise SystemExit(f"voice reference has no audio samples: {voice_path}")
prompt_text = Path(prompt_path).read_text(encoding="utf-8").strip()
if not prompt_text:
    raise SystemExit(f"prompt file is empty: {prompt_path}")
if len(prompt_text.encode("utf-8")) > 64 * 1024:
    raise SystemExit("prompt file exceeds the 64 KiB preset limit")
print(f"Preflight assets OK: voice={audio.size / 16000:.1f}s, prompt={len(prompt_text)} chars")
PY

UNET_CONFIG="${MUSETALK_DIR}/models/musetalkV15/musetalk.json"
UNET_MODEL="${MUSETALK_DIR}/models/musetalkV15/unet.pth"
WHISPER_DIR="${MUSETALK_DIR}/models/whisper"
[[ -s "${UNET_CONFIG}" ]] || die "missing MuseTalk config: ${UNET_CONFIG}"
[[ -s "${UNET_MODEL}" ]] || die "missing MuseTalk model: ${UNET_MODEL}"
[[ -d "${WHISPER_DIR}" ]] || die "missing Whisper model directory: ${WHISPER_DIR}"

CACHE_DIR="${AVATAR_ROOT}/${AVATAR_ID}"
VIDEO_DEST="${MUSETALK_DIR}/data/video/${AVATAR_ID}.mp4"
VIDEO_TMP="${MUSETALK_DIR}/data/video/.${AVATAR_ID}.part.$$.mp4"
POSTER_REL="static/avatar/portraits/${AVATAR_ID}.jpg"
POSTER_DEST="${MINICPM_DIR}/${POSTER_REL}"
if [[ "${RUNTIME_MODE}" -eq 1 ]]; then POSTER_DEST="${CACHE_DIR}/portrait.jpg"; fi
[[ ! -e "${POSTER_DEST}" ]] || die "portrait already exists: ${POSTER_DEST}"
[[ ! -e "${CACHE_DIR}" ]] \
    || die "avatar cache already exists: ${CACHE_DIR}; choose a new AVATAR_ID"
[[ ! -e "${VIDEO_DEST}" ]] \
    || die "normalized video already exists: ${VIDEO_DEST}; choose a new AVATAR_ID"

voice_extension="${VOICE_SOURCE##*.}"
if [[ "${voice_extension}" == "${VOICE_SOURCE}" ]] \
    || [[ ! "${voice_extension}" =~ ^[A-Za-z0-9]{1,8}$ ]]; then
    voice_extension="wav"
fi

if [[ "${VOICE_SOURCE}" == "${VOICE_DIR}/"* ]]; then
    VOICE_DEST="${VOICE_SOURCE}"
    VOICE_REL="$(realpath --relative-to="${MINICPM_DIR}" -- "${VOICE_DEST}")"
    CREATE_VOICE=0
else
    VOICE_DEST="${VOICE_DIR}/${AVATAR_ID}_voice.${voice_extension}"
    VOICE_REL="$(realpath --canonicalize-missing --relative-to="${MINICPM_DIR}" -- "${VOICE_DEST}")"
    CREATE_VOICE=1
    [[ ! -e "${VOICE_DEST}" ]] \
        || die "voice destination already exists: ${VOICE_DEST}; choose a new AVATAR_ID"
fi

if [[ "${PROMPT_SOURCE}" == "${PROMPT_DIR}/"* ]]; then
    PROMPT_DEST="${PROMPT_SOURCE}"
    PROMPT_REL="$(realpath --relative-to="${MINICPM_DIR}" -- "${PROMPT_DEST}")"
    CREATE_PROMPT=0
else
    PROMPT_DEST="${PROMPT_DIR}/${AVATAR_ID}.txt"
    PROMPT_REL="$(realpath --canonicalize-missing --relative-to="${MINICPM_DIR}" -- "${PROMPT_DEST}")"
    CREATE_PROMPT=1
    [[ ! -e "${PROMPT_DEST}" ]] \
        || die "prompt destination already exists: ${PROMPT_DEST}; choose a new AVATAR_ID"
fi

if [[ "${DRY_RUN}" -eq 1 ]]; then
    echo "Dry run: no files will be written."
    echo "  Video source:  ${VIDEO_SOURCE}"
    echo "  Video target:  ${VIDEO_DEST}"
    echo "  Avatar ID:     ${AVATAR_ID}"
    echo "  Preset ID:     ${PRESET_ID}"
    echo "  Preset name:   ${PRESET_NAME}"
    echo "  Cache target:  ${CACHE_DIR}"
    echo "  Voice target:  ${VOICE_DEST} (${VOICE_REL})"
    echo "  Prompt target: ${PROMPT_DEST} (${PROMPT_REL})"
    echo "  GPU:           ${REQUESTED_GPU:-auto (most free VRAM)}"
    echo "  Shared venv:   ${SHARED_VENV}"
    echo "  MuseTalk venv: ${MUSETALK_VENV}"
    exit 0
fi

SUCCESS=0
CREATED_VIDEO=0
CREATED_CACHE=0
CREATED_VOICE=0
CREATED_PROMPT=0
CREATED_POSTER=0
WORK_DIR="$(mktemp -d "${ROOT}/.run/add-avatar.XXXXXXXX")"

cleanup() {
    local status=$?
    rm -f -- "${VIDEO_TMP}"
    rm -rf -- "${WORK_DIR}"
    if [[ "${status}" -ne 0 && "${SUCCESS}" -eq 0 ]]; then
        if [[ "${CREATED_CACHE}" -eq 1 && -d "${CACHE_DIR}" ]]; then
            rm -rf -- "${CACHE_DIR}"
            echo "Rolled back incomplete avatar cache: ${CACHE_DIR}" >&2
        fi
        if [[ "${CREATED_VOICE}" -eq 1 ]]; then
            rm -f -- "${VOICE_DEST}"
        fi
        if [[ "${CREATED_PROMPT}" -eq 1 ]]; then
            rm -f -- "${PROMPT_DEST}"
        fi
        if [[ "${CREATED_POSTER}" -eq 1 ]]; then
            rm -f -- "${POSTER_DEST}"
        fi
        if [[ "${CREATED_VIDEO}" -eq 1 ]]; then
            rm -f -- "${VIDEO_DEST}"
        fi
    fi
}
trap cleanup EXIT

select_gpu() {
    local candidate="${REQUESTED_GPU}"
    local minimum="${MIN_FREE_MB}"
    local best_gpu best_free

    if [[ -n "${candidate}" ]]; then
        [[ "${candidate}" =~ ^[0-9]+$ ]] || die "--gpu must be a numeric GPU index"
        nvidia-smi -i "${candidate}" >/dev/null 2>&1 \
            || die "GPU ${candidate} is not available"
        echo "${candidate}"
        return 0
    fi

    command -v nvidia-smi >/dev/null 2>&1 || die "nvidia-smi is required"
    read -r best_free best_gpu < <(
        nvidia-smi --query-gpu=index,memory.free --format=csv,noheader,nounits \
            | awk -F, '{gsub(/[[:space:]]/, "", $1); gsub(/[[:space:]]/, "", $2); print $2, $1}' \
            | sort -k1,1nr \
            | head -n 1
    )
    [[ -n "${best_gpu:-}" ]] || die "failed to query NVIDIA GPUs"
    if (( best_free < minimum )); then
        die "no GPU has ${minimum} MiB free VRAM (best: GPU ${best_gpu}, ${best_free} MiB)"
    fi
    echo "${best_gpu}"
}

find_ffmpeg() {
    if [[ -x "${MINICPM_DIR}/.bin/ffmpeg" ]]; then
        echo "${MINICPM_DIR}/.bin/ffmpeg"
    elif command -v ffmpeg >/dev/null 2>&1; then
        command -v ffmpeg
    else
        return 1
    fi
}

step "[1/6] Preparing input video"
FFMPEG="$(find_ffmpeg)" || die "ffmpeg not found; run ./install.sh first"
FFMPEG_ENCODERS="$("${FFMPEG}" -hide_banner -encoders 2>/dev/null)" \
    || die "failed to inspect ffmpeg encoders"
[[ "${FFMPEG_ENCODERS}" == *libx264* ]] \
    || die "ffmpeg does not provide libx264"
mkdir -p "${MUSETALK_DIR}/data/video"
CREATED_VIDEO=1
"${FFMPEG}" -hide_banner -loglevel error -nostdin -y \
    -i "${VIDEO_SOURCE}" \
    -map 0:v:0 -an \
    -vf "fps=24,scale=trunc(iw/2)*2:trunc(ih/2)*2" \
    -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p \
    -movflags +faststart \
    -f mp4 \
    "${VIDEO_TMP}" \
    || die "failed to normalize the input video"
mv -- "${VIDEO_TMP}" "${VIDEO_DEST}"
echo "Normalized video: ${VIDEO_DEST}"

step "[2/6] Extracting frames and CPU face landmarks"
STAGING="${WORK_DIR}/cache"
mkdir -p "${STAGING}"/{full_imgs,mask,vid_output}
"${FFMPEG}" -hide_banner -loglevel error -nostdin -i "${VIDEO_DEST}" \
    -map 0:v:0 -start_number 0 "${STAGING}/full_imgs/%08d.png"
export TORCH_HOME="${MUSETALK_PROJECT}/.cache/torch"
export MPLCONFIGDIR="${MUSETALK_PROJECT}/.cache/matplotlib"
export OMP_NUM_THREADS=8 MKL_NUM_THREADS=8 OPENBLAS_NUM_THREADS=2
CUDA_VISIBLE_DEVICES="" "${MUSETALK_PY}" "${CACHE_BUILDER}" landmarks "${STAGING}" "${AVATAR_ID}"

step "[3/6] Encoding the MuseTalk avatar on GPU"
GPU_ID="$(select_gpu)"
echo "Using GPU ${GPU_ID}"
CUDA_DEVICE_ORDER=PCI_BUS_ID CUDA_VISIBLE_DEVICES="$(nvidia-smi -i "${GPU_ID}" --query-gpu=uuid --format=csv,noheader)" \
    "${PROJECT_PY}" "${CACHE_BUILDER}" encode "${STAGING}" "${AVATAR_ID}"
"${FFMPEG}" -hide_banner -loglevel error -nostdin -i "${STAGING}/full_imgs/00000000.png" \
    -frames:v 1 -q:v 3 "${WORK_DIR}/portrait.jpg"
mkdir -p "${AVATAR_ROOT}"
if [[ "${RUNTIME_MODE}" -eq 0 ]]; then mkdir -p "$(dirname "${POSTER_DEST}")"; fi
mv -T -- "${STAGING}" "${CACHE_DIR}"
CREATED_CACHE=1

step "[4/6] Validating the generated cache"
"${PROJECT_PY}" - "${MUSETALK_DIR}" "${AVATAR_ID}" <<'PY'
import sys
from pathlib import Path

musetalk_dir = Path(sys.argv[1])
avatar_id = sys.argv[2]
sys.path.insert(0, str(musetalk_dir))

from muse_stream.avatar_registry import inspect_avatar_cache

info = inspect_avatar_cache(avatar_id, "v15")
if not info.valid:
    raise SystemExit(f"invalid avatar cache: {info.error}")
print(
    f"Cache OK: {info.id}, {info.width}x{info.height}, "
    f"{info.source_frame_count} source frames, {info.frame_count} loop frames"
)
PY

step "[5/6] Installing voice, prompt and preset metadata"
mv -- "${WORK_DIR}/portrait.jpg" "${POSTER_DEST}"
CREATED_POSTER=1
mkdir -p "${VOICE_DIR}" "${PROMPT_DIR}"
if [[ "${CREATE_VOICE}" -eq 1 ]]; then
    cp -- "${VOICE_SOURCE}" "${VOICE_DEST}"
    CREATED_VOICE=1
fi
if [[ "${CREATE_PROMPT}" -eq 1 ]]; then
    cp -- "${PROMPT_SOURCE}" "${PROMPT_DEST}"
    CREATED_PROMPT=1
fi

PATH="${MINICPM_DIR}/.bin:${PATH}" "${PROJECT_PY}" - \
    "${MINICPM_DIR}" \
    "${PRESET_FILE}" \
    "${MANIFEST_FILE}" \
    "${RUNTIME_MODE}" \
    "${AVATAR_ID}" \
    "${PRESET_ID}" \
    "${PRESET_NAME}" \
    "${PRESET_DESCRIPTION}" \
    "${OWNER_ID}" \
    "${VISIBILITY}" \
    "${PRESET_SOURCE}" \
    "${VOICE_DEST}" \
    "${PROMPT_DEST}" \
    "${VOICE_REL}" \
    "${PROMPT_REL}" <<'PY'
import hashlib
import os
import sys
import tempfile
from pathlib import Path

import librosa
import yaml

(
    minicpm_dir,
    preset_path,
    manifest_path,
    runtime_mode,
    avatar_id,
    preset_id,
    preset_name,
    description,
    owner_id,
    visibility,
    preset_source,
    voice_path,
    prompt_path,
    voice_rel,
    prompt_rel,
) = sys.argv[1:]

minicpm_dir = Path(minicpm_dir)
preset_path = Path(preset_path)
manifest_path = Path(manifest_path)
runtime_mode = runtime_mode == "1"
voice_path = Path(voice_path)
prompt_path = Path(prompt_path)


def atomic_write(path: Path, data: bytes) -> None:
    mode = path.stat().st_mode if path.exists() else 0o644
    fd, temporary = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
    try:
        with os.fdopen(fd, "wb") as stream:
            stream.write(data)
            stream.flush()
            os.fsync(stream.fileno())
        os.chmod(temporary, mode)
        os.replace(temporary, path)
    finally:
        try:
            os.unlink(temporary)
        except FileNotFoundError:
            pass


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


audio, _ = librosa.load(str(voice_path), sr=16000, mono=True)
if audio.size == 0:
    raise SystemExit(f"voice reference has no audio samples: {voice_path}")
print(f"Voice OK: {voice_path.name}, {audio.size / 16000:.1f}s")

prompt_text = prompt_path.read_text(encoding="utf-8").strip()
if not prompt_text:
    raise SystemExit(f"prompt file is empty: {prompt_path}")
if len(prompt_text.encode("utf-8")) > 64 * 1024:
    raise SystemExit("prompt file exceeds the 64 KiB preset limit")

original_preset = preset_path.read_bytes()
try:
    config = yaml.safe_load(original_preset)
except yaml.YAMLError as exc:
    raise SystemExit(f"invalid avatar preset YAML: {exc}") from exc
if not isinstance(config, dict) or int(config.get("version", 1)) != 1:
    raise SystemExit("avatar preset YAML must be a version 1 object")
presets = config.get("presets")
if not isinstance(presets, dict):
    raise SystemExit("avatar preset YAML has no presets map")
if preset_id in presets:
    raise SystemExit(f"avatar preset already exists: {preset_id}")

orders = []
for item in presets.values():
    if isinstance(item, dict):
        try:
            orders.append(int(item.get("order", 0)))
        except (TypeError, ValueError):
            pass
next_order = (max(orders) if orders else 0) + 10
presets[preset_id] = {
    "name": preset_name,
    "description": description,
    "avatar_id": avatar_id,
    "voice_ref": voice_rel,
    "prompt_file": prompt_rel,
    "order": next_order,
    "enabled": True,
    "visibility": visibility,
    "source": preset_source,
}
if owner_id:
    presets[preset_id]["owner_id"] = owner_id

yaml_text = yaml.safe_dump(
    config,
    allow_unicode=True,
    sort_keys=False,
    default_flow_style=False,
)
preset_bytes = yaml_text.encode("utf-8")
atomic_write(preset_path, preset_bytes)

if not runtime_mode:
    updates = {
        "./assets/avatar_presets.yaml": hashlib.sha256(preset_bytes).hexdigest(),
        f"./{voice_rel}": sha256(voice_path),
        f"./{prompt_rel}": sha256(prompt_path),
        f"./static/avatar/portraits/{avatar_id}.jpg": sha256(
            minicpm_dir / "static" / "avatar" / "portraits" / f"{avatar_id}.jpg"
        ),
    }
    try:
        lines = manifest_path.read_text(encoding="utf-8").splitlines()

        def entry_path(line):
            parts = line.split(maxsplit=1)
            if len(parts) != 2 or len(parts[0]) != 64:
                return None
            return parts[1]

        seen = set()
        for index, line in enumerate(lines):
            path = entry_path(line)
            if path in updates:
                lines[index] = f"{updates[path]}  {path}"
                seen.add(path)

        for path, digest in updates.items():
            if path in seen:
                continue
            group = path.rsplit("/", 1)[0] + "/"
            insert_at = None
            for index, line in enumerate(lines):
                existing = entry_path(line)
                if existing is not None and existing.startswith(group):
                    insert_at = index + 1
            if insert_at is None:
                lines.append(f"{digest}  {path}")
            else:
                lines.insert(insert_at, f"{digest}  {path}")

        atomic_write(manifest_path, ("\n".join(lines) + "\n").encode("utf-8"))
    except Exception:
        atomic_write(preset_path, original_preset)
        raise

print(f"Preset OK: {preset_id} -> avatar={avatar_id}, order={next_order}")
PY

SUCCESS=1
step "[6/6] Avatar added"
echo "Avatar cache: ${CACHE_DIR}"
echo "Preset:       ${PRESET_ID}"
echo "Voice:        ${VOICE_REL}"
echo "Prompt:       ${PROMPT_REL}"
echo
echo "Refresh /avatar and select the new card before starting a session."
echo "API check:"
echo "  curl -k https://127.0.0.1:8006/avatar-live/api/avatar-presets"
echo "API activate:"
echo "  curl -k -X POST https://127.0.0.1:8006/avatar-live/api/avatar-presets/${PRESET_ID}/activate"
