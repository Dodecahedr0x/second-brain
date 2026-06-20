#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$REPO_ROOT/.env.local"
RUN_SCRIPT="$REPO_ROOT/scripts/run.sh"
LOG_FILE="$REPO_ROOT/logs/run.log"
LOG_DIR="$REPO_ROOT/logs"

echo "Second-Brain Setup"
echo "=================="

# --- Vault path ---
current_vault=$(grep -E '^VAULT_PATH=' "$ENV_FILE" 2>/dev/null | cut -d= -f2- || true)
prompt="Vault path (absolute path to your Obsidian vault)"
[[ -n "$current_vault" ]] && prompt="Vault path (leave blank to keep: $current_vault)"

read -rp "$prompt: " input
VAULT_PATH="${input:-$current_vault}"

if [[ -z "$VAULT_PATH" ]]; then
    echo "Error: vault path cannot be empty." >&2
    exit 1
fi

VAULT_PATH="${VAULT_PATH%/}"

if [[ ! -d "$VAULT_PATH" ]]; then
    echo "Warning: '$VAULT_PATH' does not exist or is not a directory."
    read -rp "Continue anyway? [y/N] " confirm
    [[ "${confirm,,}" == "y" ]] || exit 1
fi

printf 'VAULT_PATH=%s\n' "$VAULT_PATH" > "$ENV_FILE"
echo "Written: $ENV_FILE"

# --- Cron job ---
echo ""
mkdir -p "$LOG_DIR"
touch "$LOG_DIR/.gitkeep"
current_hour=$(crontab -l 2>/dev/null | grep -F "$RUN_SCRIPT" | awk '{print $2}' || true)
default_hour="${current_hour:-8}"
prompt="Hour to run daily loop (0-23, leave blank to keep: $default_hour)"

read -rp "$prompt: " input_hour
HOUR="${input_hour:-$default_hour}"

if ! [[ "$HOUR" =~ ^[0-9]+$ ]] || (( HOUR < 0 || HOUR > 23 )); then
    echo "Invalid hour '$HOUR'. Using $default_hour." >&2
    HOUR="$default_hour"
fi

CRON_JOB="0 $HOUR * * * $RUN_SCRIPT >> $LOG_FILE 2>&1"
existing_crontab=$(crontab -l 2>/dev/null | grep -vF "$RUN_SCRIPT" || true)
{ [[ -n "$existing_crontab" ]] && printf '%s\n' "$existing_crontab"; echo "$CRON_JOB"; } | crontab -
echo "Cron job set: daily at ${HOUR}:00"
echo "  Log: $LOG_FILE"
