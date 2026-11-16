#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")" && pwd)"
backend="$HOME/audio_dual_avatar_api/run.sh"
target=avatar-cloud-platform.target
mkdir -p "$root/.run"
exec 9>"$root/.run/platform.lock"
flock 9
wait_for() {
    for ((i=0;i<60;i++)); do
        if curl -fsS --max-time 3 "$1" -o /dev/null 2>/dev/null; then return 0; fi
        sleep 1
    done
    echo "未就绪: $1" >&2
    return 1
}
case "${1:-status}" in
    start)
        "$backend" start
        systemctl --user start "$target"
        wait_for http://127.0.0.1:13100/digital-human/readyz
        wait_for 'http://127.0.0.1:13100/chat?experience=live'
        wait_for http://127.0.0.1:13100/v1/auth/registration
        echo '新版平台已就绪 http://127.0.0.1:13100/chat?experience=live' ;;
    stop)
        systemctl --user stop "$target" avatar-cloud-{proxy,bff,web}.service
        "$backend" stop ;;
    status)
        "$backend" status
        for name in avatar-cloud-{proxy,bff,web}.service; do
            echo "$name $(systemctl --user is-active "$name" || true)"
        done ;;
    *) echo "用法: $0 {start|stop|status}" >&2; exit 2 ;;
esac
