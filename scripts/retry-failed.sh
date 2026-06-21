#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$REPO_ROOT/.env.local"
LOG_DIR="$REPO_ROOT/logs"
LOG_FILE="$LOG_DIR/retry-failed.log"

if [[ ! -f "$ENV_FILE" ]]; then
    echo "Error: .env.local not found. Run scripts/setup.sh first." >&2
    exit 1
fi

source "$ENV_FILE"
mkdir -p "$LOG_DIR"

# Quick pre-flight: count #needs-review items so the user knows what's queued
NEEDS_REVIEW_COUNT=$(grep -rl '#needs-review' "$VAULT_PATH" --include="*.md" 2>/dev/null \
    | xargs grep -lv 'agent_managed: true' 2>/dev/null \
    | wc -l | tr -d ' ') || NEEDS_REVIEW_COUNT=0

if [[ "$NEEDS_REVIEW_COUNT" -eq 0 ]]; then
    echo "No #needs-review items found in vault. Nothing to do."
    exit 0
fi

echo "Found $NEEDS_REVIEW_COUNT file(s) with #needs-review items. Starting retry agent..."

{
    echo ""
    echo "=== $(date -Iseconds) ==="
    echo "Vault: $VAULT_PATH"
    echo "Items: $NEEDS_REVIEW_COUNT file(s) with #needs-review"
    echo ""
} >> "$LOG_FILE"

claude --dangerously-skip-permissions -p \
    "You are a second-brain retry agent. Your repo is at $REPO_ROOT and the vault is at $VAULT_PATH.

Complete the Phase 0 initialization checklist in \`.agents/AGENTS.md\`, then execute \`.agents/specs/retry-failed.md\` through all six loop phases.

Stop only after Phase 6 cleanup is complete, the Agent Operation Log is updated, and the RETRY SUMMARY block has been printed." \
    >> "$LOG_FILE" 2>&1

EXIT_CODE=$?

echo "Done: $(date -Iseconds)" >> "$LOG_FILE"

if [[ $EXIT_CODE -ne 0 ]]; then
    echo "Retry agent exited with code $EXIT_CODE. Check $LOG_FILE for details." >&2
    exit $EXIT_CODE
fi

# Print the RETRY SUMMARY block from the log to stdout so the caller sees it
echo ""
awk '/=== RETRY SUMMARY ===/,/=+$/' "$LOG_FILE" | tail -n +1 | head -20 || true
echo ""
echo "Full log: $LOG_FILE"
