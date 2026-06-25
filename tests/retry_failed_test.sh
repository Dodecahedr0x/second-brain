#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT

PROJECT="$TMPDIR/project"
mkdir -p "$PROJECT/scripts" "$PROJECT/.agents/specs" "$TMPDIR/bin" "$TMPDIR/vault"
cp "$ROOT/scripts/retry-failed.sh" "$PROJECT/scripts/retry-failed.sh"
chmod +x "$PROJECT/scripts/retry-failed.sh"
printf 'VAULT_PATH=%s\n' "$TMPDIR/vault" > "$PROJECT/.env.local"
printf '# needs review\n#needs-review\n' > "$TMPDIR/vault/youtube-stub.md"

cat > "$TMPDIR/bin/claude" <<'STUB'
#!/usr/bin/env bash
set -euo pipefail
printf '%s\n' "$*" > "${FAKE_CLAUDE_ARGS:?}"
printf '%s\n' '=== RETRY SUMMARY ==='
printf '%s\n' 'Succeeded: 0'
printf '%s\n' '====================='
STUB
chmod +x "$TMPDIR/bin/claude"
export PATH="$TMPDIR/bin:$PATH"
export FAKE_CLAUDE_ARGS="$TMPDIR/claude_args"

"$PROJECT/scripts/retry-failed.sh" >/tmp/retry_failed_test.out

grep -F -- "--cookies-from-browser chrome" "$FAKE_CLAUDE_ARGS" >/dev/null

grep -F "Full log:" /tmp/retry_failed_test.out >/dev/null
