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

# Prevent concurrent runs (e.g. hourly cron firing while a previous run is still live)
LOCK_FILE="$REPO_ROOT/.agent.lock"
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
    echo "$(date -Iseconds) Agent already running — skipping." >> "$ARCHIVE_DIR/$(date +%Y-%m-%d)_skipped.log"
    exit 0
fi

SPEC_PATH="${1:-}"
EXTRA_CONTEXT="${2:-}"
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

# --- Vault change detection: snapshot before the run (diffed after; see end) ---
CHANGES_LOG="$LOG_DIR/changes.log"
list_vault_md() {
    # Content notes only: all markdown except the agent's own state/scratch under Agent/
    # (Operation Log, Vault Index, this Change Log, Temp — they churn every run).
    [[ -d "$VAULT_PATH" ]] || return 0
    find "$VAULT_PATH" -type f -name '*.md' -not -path "$VAULT_PATH/Agent/*" 2>/dev/null \
        | sed "s#^$VAULT_PATH/##" | sort
}
VAULT_BEFORE="$(mktemp "${TMPDIR:-/tmp}/sb-before.XXXXXX")"
RUN_REF="$(mktemp "${TMPDIR:-/tmp}/sb-ref.XXXXXX")"
list_vault_md > "$VAULT_BEFORE"
touch "$RUN_REF"   # marks run start; files newer than this were written during the run

PROMPT="You are a second-brain processing agent. Your repo is at $REPO_ROOT and the vault is at $VAULT_PATH.

Read \`.agents/AGENTS.md\` and complete the initialization checklist in order. $SPEC_INSTRUCTION Stop only after Phase 6 cleanup is complete and all agent-managed vault notes are updated."

if [[ -n "$EXTRA_CONTEXT" ]]; then
    PROMPT="$PROMPT

Additional context for this run: $EXTRA_CONTEXT"
fi

# CLAUDE_BIN lets callers (e.g. the Obsidian plugin) point at a claude binary
# that isn't on the GUI PATH. CLAUDE_EXTRA_ARGS passes through extra flags.
set +e
"${CLAUDE_BIN:-claude}" --dangerously-skip-permissions ${CLAUDE_EXTRA_ARGS:-} -p \
    "$PROMPT" \
    >> "$LOG_FILE" 2>&1
AGENT_RC=$?
set -e

# --- Vault change detection: diff after the run, log what changed ---
VAULT_AFTER="$(mktemp "${TMPDIR:-/tmp}/sb-after.XXXXXX")"
CREATED_F="$(mktemp "${TMPDIR:-/tmp}/sb-c.XXXXXX")"
DELETED_F="$(mktemp "${TMPDIR:-/tmp}/sb-d.XXXXXX")"
NEWER_F="$(mktemp "${TMPDIR:-/tmp}/sb-n.XXXXXX")"
MODIFIED_F="$(mktemp "${TMPDIR:-/tmp}/sb-m.XXXXXX")"
list_vault_md > "$VAULT_AFTER"
comm -13 "$VAULT_BEFORE" "$VAULT_AFTER" > "$CREATED_F"   # in after, not before
comm -23 "$VAULT_BEFORE" "$VAULT_AFTER" > "$DELETED_F"   # in before, not after
if [[ -d "$VAULT_PATH" ]]; then
    find "$VAULT_PATH" -type f -name '*.md' -not -path "$VAULT_PATH/Agent/*" -newer "$RUN_REF" 2>/dev/null \
        | sed "s#^$VAULT_PATH/##" | sort > "$NEWER_F"
fi
comm -23 "$NEWER_F" "$CREATED_F" > "$MODIFIED_F"         # touched during the run, minus newly created

n_created=$(wc -l < "$CREATED_F" | tr -d '[:space:]')
n_modified=$(wc -l < "$MODIFIED_F" | tr -d '[:space:]')
n_deleted=$(wc -l < "$DELETED_F" | tr -d '[:space:]')

# The change summary block (one entry; starts with the `=== Vault changes:` header).
BLOCK_F="$(mktemp "${TMPDIR:-/tmp}/sb-block.XXXXXX")"
{
    echo "=== Vault changes: ${TYPE} run $(date -Iseconds) (agent exit ${AGENT_RC}) ==="
    sed 's/^/  + created  /' "$CREATED_F"
    sed 's/^/  ~ modified /' "$MODIFIED_F"
    sed 's/^/  - deleted  /' "$DELETED_F"
    echo "  total: ${n_created} created, ${n_modified} modified, ${n_deleted} deleted"
} > "$BLOCK_F"

# 1) Repo logs: the per-run archive log + the cumulative changes.log.
{ echo ""; cat "$BLOCK_F"; } | tee -a "$LOG_FILE" >> "$CHANGES_LOG"

# 2) Vault-visible agent note (so the change record shows up in Obsidian), script-owned,
#    newest-first, bounded to the most recent 50 runs. Written by the script, not the agent.
if [[ -d "$VAULT_PATH" ]]; then
    mkdir -p "$VAULT_PATH/Agent"
    CHANGE_NOTE="$VAULT_PATH/Agent/Agent Change Log.md"
    NOTE_TMP="$(mktemp "${TMPDIR:-/tmp}/sb-note.XXXXXX")"
    {
        printf -- '---\nagent_managed: true\n---\n\n'
        printf '# Agent Change Log\n\n'
        printf 'Filesystem change record written by `scripts/run.sh` after each run (newest first, most recent 50). Machine-maintained; full history in the repo `logs/changes.log`.\n\n'
        cat "$BLOCK_F"
        # carry over the most recent prior entries (up to 49 old blocks)
        [[ -f "$CHANGE_NOTE" ]] && awk '/^=== Vault changes:/{c++} c>=1 && c<=49 { print ($0 ~ /^=== Vault changes:/ ? "\n" $0 : $0) }' "$CHANGE_NOTE"
    } > "$NOTE_TMP"
    mv "$NOTE_TMP" "$CHANGE_NOTE"
fi

rm -f "$VAULT_BEFORE" "$VAULT_AFTER" "$RUN_REF" "$CREATED_F" "$DELETED_F" "$NEWER_F" "$MODIFIED_F" "$BLOCK_F"

echo "Done: $(date -Iseconds) (agent exit ${AGENT_RC})" >> "$LOG_FILE"
exit "$AGENT_RC"
