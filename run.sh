#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$(realpath "$0")")"
root="$PWD"
py="$root/.venv/bin/python"
unit() { printf 'avatar-api-%s.service' "$1"; }
parts=(muse worker gateway)
check() { "$py" -m cloud.providers; }
stop() {
    for part in gateway worker muse; do
        name=$(unit "$part")
        if systemctl --user show "$name" -p LoadState --value | grep -qv '^not-found$'; then
            systemctl --user disable --now "$name"
        fi
    done
}
case "${1:-status}" in
check) check ;;
status)
    for part in "${parts[@]}"; do
        name=$(unit "$part")
        printf '%s %s\n' "$name" "$(systemctl --user is-active "$name" || true)"
    done ;;
stop) stop ;;
start)
    check
    mkdir -p .run
    exec 9>".run/start.lock"
    flock -n 9 || { echo "另一个启动操作正在进行"; exit 1; }
    unit_dir="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
    mkdir -p "$unit_dir"
    for part in "${parts[@]}"; do
        name=$(unit "$part")
        ln -sfn "$root/deploy/$name" "$unit_dir/$name"
    done
    systemctl --user daemon-reload
    started=()
    rollback() {
        for ((i=${#started[@]}-1; i>=0; i--)); do systemctl --user stop "${started[i]}" || true; done
    }
    trap rollback ERR
    for part in "${parts[@]}"; do
        name=$(unit "$part")
        case "$part" in
            muse) port=8100; health="http://127.0.0.1:8100/api/status" ;;
            worker) port=22410; health="http://127.0.0.1:22410/health" ;;
            gateway) port=8106; health="https://127.0.0.1:8106/health" ;;
        esac
        if ! systemctl --user is-active --quiet "$name"; then
            if ss -Hltn "sport = :$port" | grep -q .; then echo "端口 $port 已占用"; rollback; exit 1; fi
            systemctl --user start "$name"
            started+=("$name")
        fi
        ready=false
        for i in $(seq 1 180); do
            systemctl --user is-active --quiet "$name" || break
            if data=$(curl -kfsS --max-time 2 "$health" 2>/dev/null); then
                if [[ "$part" != muse ]] || "$py" -c 'import json,sys;s=json.load(sys.stdin);sys.exit(not (s.get("ready") or s.get("status")=="standby"))' <<<"$data"; then ready=true; break; fi
            fi
            sleep 1
        done
        if [[ "$ready" != true ]]; then echo "启动失败，请查看 journalctl --user -u $name"; rollback; exit 1; fi
    done
    for part in "${parts[@]}"; do systemctl --user enable "$(unit "$part")"; done
    echo 'API gateway ready: https://127.0.0.1:8106/avatar-v2' ;;
*) echo "Usage: $0 {check|start|status|stop}"; exit 2 ;;
esac
