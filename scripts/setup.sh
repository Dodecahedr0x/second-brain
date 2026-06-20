#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$REPO_ROOT/.env.local"

echo "Second-Brain Setup"
echo "=================="

# Vault path
if [[ -f "$ENV_FILE" ]]; then
    existing=$(grep -E '^VAULT_PATH=' "$ENV_FILE" | cut -d= -f2-)
    echo "Existing VAULT_PATH: $existing"
    read -rp "New vault path (leave blank to keep): " input
    VAULT_PATH="${input:-$existing}"
else
    read -rp "Vault path (absolute path to your Obsidian vault): " VAULT_PATH
fi

if [[ -z "$VAULT_PATH" ]]; then
    echo "Error: vault path cannot be empty." >&2
    exit 1
fi

VAULT_PATH="${VAULT_PATH%/}"  # strip trailing slash

if [[ ! -d "$VAULT_PATH" ]]; then
    echo "Warning: '$VAULT_PATH' does not exist or is not a directory."
    read -rp "Continue anyway? [y/N] " confirm
    [[ "${confirm,,}" == "y" ]] || exit 1
fi

# Write .env.local
printf 'VAULT_PATH=%s\n' "$VAULT_PATH" > "$ENV_FILE"
echo "Written: $ENV_FILE"

# Cron job
echo ""
RUN_SCRIPT="$REPO_ROOT/scripts/run.sh"
LOG_FILE="$REPO_ROOT/logs/run.log"

existing_hour=$(crontab -l 2>/dev/null | grep -oP "^\d+ \K\d+" | head -1 || true)
if [[ -n "$existing_hour" ]]; then
    echo "Existing cron job runs at ${existing_hour}:00."
fi

read -rp "Hour to run daily loop (0-23, default 8): " input_hour
HOUR="${input_hour:-8}"

if ! [[ "$HOUR" =~ ^[0-9]+$ ]] || (( HOUR < 0 || HOUR > 23 )); then
    echo "Invalid hour. Using 8." >&2
    HOUR=8
fi

CRON_JOB="0 $HOUR * * * $RUN_SCRIPT >> $LOG_FILE 2>&1"

( crontab -l 2>/dev/null | grep -v "$RUN_SCRIPT" ; echo "$CRON_JOB" ) | crontab -
echo "Cron job set: daily at ${HOUR}:00"
echo "  Log: $LOG_FILE"
