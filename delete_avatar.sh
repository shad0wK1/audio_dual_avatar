#!/usr/bin/env bash
# Delete an avatar preset and any runtime files not shared by another preset.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MINICPM_DIR="${ROOT}/minicpm_demo"
VENV_DIR="${AVATAR_VENV:-${ROOT}/.venv}"
PYTHON="${VENV_DIR}/bin/python"

usage() {
    cat <<'EOF'
Usage:
  ./delete_avatar.sh [options] PRESET_ID

Options:
  --dry-run              Print the deletion plan without changing files.
  --json                 Print a machine-readable result.
  --new-default ID       Replacement when deleting the current default preset.
  --avatar-http-url URL  MuseTalk base URL used for active-avatar checks.
  -h, --help             Show this help.

The shell command may delete both system and user-created presets. Resources
shared by any remaining preset are always retained.
EOF
}

if [[ ! -x "${PYTHON}" ]]; then
    echo "Missing shared venv: ${PYTHON}" >&2
    exit 1
fi

for arg in "$@"; do
    case "${arg}" in
        -h|--help)
            usage
            exit 0
            ;;
    esac
done

PYTHONPATH="${MINICPM_DIR}${PYTHONPATH:+:${PYTHONPATH}}" \
    "${PYTHON}" -m gateway_modules.avatar_preset_admin "$@"
