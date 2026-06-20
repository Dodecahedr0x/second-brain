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
