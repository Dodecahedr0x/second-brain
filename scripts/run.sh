#!/usr/bin/env bash
set -euo pipefail

# Ensure user-local bin is on PATH (required when invoked from cron)
export PATH="$HOME/.local/bin:/usr/local/bin:$PATH"

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$REPO_ROOT/.env.local"
LOG_DIR="$REPO_ROOT/logs"
ARCHIVE_DIR="$LOG_DIR/archive"

if [[ ! -f "$ENV_FILE" ]]; then
    echo "Error: .env.local not found. Run scripts/setup.sh first." >&2
    exit 1
fi

source "$ENV_FILE"

mkdir -p "$ARCHIVE_DIR"

SPEC_PATH="${1:-}"
TYPE="daily"
SPEC_INSTRUCTION="Then execute the six-phase loop in \`.agents/loop.md\`."
if [[ -n "$SPEC_PATH" ]]; then
    SPEC_PATH="${SPEC_PATH#.agents/}"
    SPEC_INSTRUCTION="Execute the entry spec \`.agents/$SPEC_PATH\` through the six-phase loop in \`.agents/loop.md\`."
    case "$SPEC_PATH" in
        *weekly*)  TYPE="weekly"  ;;
        *monthly*) TYPE="monthly" ;;
        *)         TYPE="$(basename "${SPEC_PATH%.md}")" ;;
    esac
fi

LOG_FILE="$ARCHIVE_DIR/$(date +%Y-%m-%d_%H-%M-%S)_${TYPE}.log"

echo "=== $(date -Iseconds) ===" >> "$LOG_FILE"

claude --dangerously-skip-permissions -p \
    "You are a second-brain processing agent. Your repo is at $REPO_ROOT and the vault is at $VAULT_PATH.

Read \`.agents/AGENTS.md\` and complete the initialization checklist in order. $SPEC_INSTRUCTION Stop only after Phase 6 cleanup is complete and all agent-managed vault notes are updated." \
    >> "$LOG_FILE" 2>&1

echo "Done: $(date -Iseconds)" >> "$LOG_FILE"
