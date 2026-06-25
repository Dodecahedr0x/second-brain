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

# Pre-flight: cast a wide net for items that may need retry.
# Three sources:
#   1. Any note tagged #needs-review
#   2. Source notes with source_type: youtube or twitter (may be stubs without the tag)
#   3. Daily notes (YYYY-MM-DD.md) containing a bare URL line with no [[wikilink]] on it
_find_candidates() {
    local vault="$1"
    # 1. #needs-review
    grep -rl '#needs-review' "$vault" --include="*.md" 2>/dev/null || true
    # 2. YouTube / Twitter source notes
    grep -rl 'source_type: youtube\|source_type: twitter' "$vault" --include="*.md" 2>/dev/null || true
    # 3. Daily notes with bare URL bullets (http but no [[ on same line)
    grep -rl 'https\?://' "$vault" --include="[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9].md" 2>/dev/null \
        | while IFS= read -r f; do
            # BSD-grep compatible (macOS): a bullet with a URL but no [[wikilink]].
            # Take URL bullets, then keep the file if any such line lacks [[.
            grep -E '^- .*https?://' "$f" 2>/dev/null | grep -vq '\[\[' && echo "$f" || true
        done || true
}

CANDIDATE_COUNT=$(_find_candidates "$VAULT_PATH" \
    | grep -v 'agent_managed: true' \
    | sort -u | grep -c . 2>/dev/null) || CANDIDATE_COUNT=0

if [[ "$CANDIDATE_COUNT" -eq 0 ]]; then
    echo "No items to retry found in vault (no #needs-review, stub sources, or bare URLs). Nothing to do."
    exit 0
fi

echo "Found $CANDIDATE_COUNT candidate file(s). Starting retry agent..."

{
    echo ""
    echo "=== $(date -Iseconds) ==="
    echo "Vault: $VAULT_PATH"
    echo "Candidates: $CANDIDATE_COUNT file(s)"
    echo ""
} >> "$LOG_FILE"

"${CLAUDE_BIN:-claude}" --dangerously-skip-permissions ${CLAUDE_EXTRA_ARGS:-} -p \
    "You are a second-brain retry agent. Your repo is at $REPO_ROOT and the vault is at $VAULT_PATH.

Complete the Phase 0 initialization checklist in \`.agents/AGENTS.md\`, then execute \`.agents/specs/retry-failed.md\` through all six loop phases.

When retrying YouTube items, run yt-dlp with \`--cookies-from-browser chrome\` for both metadata and subtitle/transcript commands so browser cookies are available before declaring YouTube bot detection still blocked.

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
