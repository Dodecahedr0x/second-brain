#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT

PROJECT="$TMPDIR/project"
mkdir -p "$PROJECT/scripts" "$PROJECT/.agents" "$TMPDIR/bin" "$TMPDIR/home/.local/bin" "$TMPDIR/vault"
cp "$ROOT/scripts/run.sh" "$PROJECT/scripts/run.sh"
cp "$ROOT/.gitignore" "$PROJECT/.gitignore"
chmod +x "$PROJECT/scripts/run.sh"
git -C "$PROJECT" init -q
printf 'VAULT_PATH=%s\n' "$TMPDIR/vault" > "$PROJECT/.env.local"
cat > "$PROJECT/.agents/AGENTS.md" <<'EOF'
# test harness
EOF

cat > "$TMPDIR/bin/claude" <<'STUB'
#!/usr/bin/env bash
set -euo pipefail
printf '%s\n' "$*" > "${FAKE_CLAUDE_ARGS:?}"
# Simulate the agent creating a vault note, so change detection has something to log.
if [[ -n "${FAKE_VAULT_NOTE:-}" ]]; then printf 'content\n' > "$FAKE_VAULT_NOTE"; fi
STUB
chmod +x "$TMPDIR/bin/claude"
cp "$TMPDIR/bin/claude" "$TMPDIR/home/.local/bin/claude"
export HOME="$TMPDIR/home"
export PATH="$TMPDIR/bin:$PATH"
export FAKE_CLAUDE_ARGS="$TMPDIR/claude_args"
export FAKE_VAULT_NOTE="$TMPDIR/vault/New Note.md"

"$PROJECT/scripts/run.sh" specs/weekly-review.md >/tmp/run_test.out

grep -F "Execute the entry spec \`.agents/specs/weekly-review.md\`" "$FAKE_CLAUDE_ARGS" >/dev/null

LOG_FILE=$(find "$PROJECT/logs/archive" -type f -name '*_weekly.log' -print -quit)
[[ -n "$LOG_FILE" ]] || { echo "weekly archive log should be written" >&2; exit 1; }
grep -F "Done:" "$LOG_FILE" >/dev/null

# The run should log what changed in the vault, both in the run log and a cumulative changes.log
grep -F "Vault changes" "$LOG_FILE" >/dev/null || { echo "run log should include the vault-changes summary" >&2; exit 1; }
CHANGES_LOG="$PROJECT/logs/changes.log"
[[ -f "$CHANGES_LOG" ]] || { echo "logs/changes.log should be written each run" >&2; exit 1; }
grep -F "New Note.md" "$CHANGES_LOG" >/dev/null || { echo "changes.log should list the note the run created" >&2; exit 1; }
grep -F "+ created" "$CHANGES_LOG" >/dev/null || { echo "changes.log should mark new notes as created" >&2; exit 1; }

# The run should also surface the change summary as a vault-visible agent note.
CHANGE_NOTE="$TMPDIR/vault/Agent/Agent Change Log.md"
[[ -f "$CHANGE_NOTE" ]] || { echo "run should write the vault-visible Agent Change Log note" >&2; exit 1; }
grep -F "New Note.md" "$CHANGE_NOTE" >/dev/null || { echo "Agent Change Log should list the created note" >&2; exit 1; }
grep -F "agent_managed: true" "$CHANGE_NOTE" >/dev/null || { echo "Agent Change Log should be marked agent_managed" >&2; exit 1; }

git -C "$PROJECT" check-ignore -q .agent.lock || {
    echo ".agent.lock should be ignored; run.sh creates it for flock coordination" >&2
    exit 1
}
