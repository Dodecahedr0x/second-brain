#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT

PROJECT="$TMPDIR/project"
mkdir -p "$PROJECT/scripts" "$PROJECT/.agents" "$TMPDIR/bin" "$TMPDIR/vault"
cp "$ROOT/scripts/run.sh" "$PROJECT/scripts/run.sh"
chmod +x "$PROJECT/scripts/run.sh"
printf 'VAULT_PATH=%s\n' "$TMPDIR/vault" > "$PROJECT/.env.local"
cat > "$PROJECT/.agents/AGENTS.md" <<'EOF'
# test harness
EOF

cat > "$TMPDIR/bin/claude" <<'STUB'
#!/usr/bin/env bash
set -euo pipefail
printf '%s\n' "$*" > "${FAKE_CLAUDE_ARGS:?}"
STUB
chmod +x "$TMPDIR/bin/claude"
export PATH="$TMPDIR/bin:$PATH"
export FAKE_CLAUDE_ARGS="$TMPDIR/claude_args"

"$PROJECT/scripts/run.sh" specs/weekly-review.md >/tmp/run_test.out

grep -F "Execute the entry spec \`.agents/specs/weekly-review.md\`" "$FAKE_CLAUDE_ARGS" >/dev/null

grep -F "Done:" "$PROJECT/logs/run.log" >/dev/null
