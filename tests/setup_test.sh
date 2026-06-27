#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT

PROJECT="$TMPDIR/project"
mkdir -p "$PROJECT/scripts" "$TMPDIR/bin" "$TMPDIR/vault"
cp "$ROOT/scripts/setup.sh" "$PROJECT/scripts/setup.sh"
cp "$ROOT/.gitignore" "$PROJECT/.gitignore"
chmod +x "$PROJECT/scripts/setup.sh"
git -C "$PROJECT" init -q

cat > "$TMPDIR/bin/crontab" <<'STUB'
#!/usr/bin/env bash
set -euo pipefail
STORE="${FAKE_CRONTAB_STORE:?}"
if [[ "${1:-}" == "-l" ]]; then
    [[ -f "$STORE" ]] && cat "$STORE"
    exit 0
fi
if [[ "${1:-}" == "-" ]]; then
    cat > "$STORE"
    exit 0
fi
echo "unsupported crontab args: $*" >&2
exit 2
STUB
chmod +x "$TMPDIR/bin/crontab"
export PATH="$TMPDIR/bin:$PATH"
export FAKE_CRONTAB_STORE="$TMPDIR/crontab"

printf '%s\n%s\n' "$TMPDIR/vault" "8" | "$PROJECT/scripts/setup.sh" >/tmp/setup_test.out

[[ -d "$PROJECT/logs" ]] || { echo "setup.sh should create logs/ before installing cron redirection" >&2; exit 1; }
[[ -f "$PROJECT/logs/.gitkeep" ]] || { echo "logs/.gitkeep should be present so fresh clones keep the cron log directory" >&2; exit 1; }

if git -C "$PROJECT" check-ignore -q logs/.gitkeep; then
    echo "logs/.gitkeep should not be ignored" >&2
    exit 1
fi

grep -F "0 * * * * $PROJECT/scripts/run.sh >> $PROJECT/logs/cron-errors.log 2>&1" "$FAKE_CRONTAB_STORE" >/dev/null
grep -F "0 8 * * 1 $PROJECT/scripts/run.sh specs/weekly-review.md >> $PROJECT/logs/cron-errors.log 2>&1" "$FAKE_CRONTAB_STORE" >/dev/null
grep -F "0 8 1 * * $PROJECT/scripts/run.sh specs/monthly-review.md >> $PROJECT/logs/cron-errors.log 2>&1" "$FAKE_CRONTAB_STORE" >/dev/null
