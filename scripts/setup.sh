#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$REPO_ROOT/.env.local"
RUN_SCRIPT="$REPO_ROOT/scripts/run.sh"
CRON_ERR_LOG="$REPO_ROOT/logs/cron-errors.log"
LOG_DIR="$REPO_ROOT/logs"

echo "Second-Brain Setup"
echo "=================="

# --- Dependencies ---
echo ""
echo "Checking dependencies..."

MISSING_TOOLS=()

check_ok()      { printf '  [OK]      %s\n' "$1"; }
check_install() { printf '  [INSTALL] %s\n' "$1"; }
check_missing() { printf '  [MISSING] %s — %s\n' "$1" "$2"; MISSING_TOOLS+=("$1"); }

# claude CLI (required to run the agent loop)
if command -v claude &>/dev/null; then
    check_ok "claude"
else
    check_missing "claude" "install from https://claude.ai/download"
fi

# node + npm (required for defuddle)
if command -v npm &>/dev/null; then
    check_ok "npm ($(npm --version))"
    # defuddle — auto-install; do not abort if install fails
    if command -v defuddle &>/dev/null; then
        check_ok "defuddle"
    else
        check_install "defuddle"
        if npm install -g defuddle 2>/dev/null; then
            check_ok "defuddle (installed)"
        else
            check_missing "defuddle" "npm install failed — try: sudo npm install -g defuddle"
        fi
    fi
else
    check_missing "node/npm" "install from https://nodejs.org — needed for defuddle"
    check_missing "defuddle" "install after node: npm install -g defuddle"
fi

# yt-dlp — auto-install via pip3 or brew, fallback to warn
if command -v yt-dlp &>/dev/null; then
    check_ok "yt-dlp"
elif command -v pip3 &>/dev/null; then
    check_install "yt-dlp"
    if pip3 install -q --user yt-dlp 2>/dev/null; then
        check_ok "yt-dlp (installed via pip3)"
    else
        check_missing "yt-dlp" "pip3 install failed — try: pip3 install yt-dlp"
    fi
elif command -v brew &>/dev/null; then
    check_install "yt-dlp"
    if brew install yt-dlp 2>/dev/null; then
        check_ok "yt-dlp (installed via brew)"
    else
        check_missing "yt-dlp" "brew install failed — try: brew install yt-dlp"
    fi
else
    check_missing "yt-dlp" "pip3 install yt-dlp  OR  brew install yt-dlp"
fi

# youtube-transcript-api — cookieless transcript fallback (used by skills/extract-youtube.md)
if python3 -c 'import youtube_transcript_api' &>/dev/null; then
    check_ok "youtube-transcript-api"
elif command -v pip3 &>/dev/null; then
    check_install "youtube-transcript-api"
    if pip3 install -q --user youtube-transcript-api 2>/dev/null \
       || pip3 install -q --user --break-system-packages youtube-transcript-api 2>/dev/null; then
        check_ok "youtube-transcript-api (installed via pip3)"
    else
        check_missing "youtube-transcript-api" "pip3 install youtube-transcript-api"
    fi
else
    check_missing "youtube-transcript-api" "pip3 install youtube-transcript-api"
fi

# feedparser — RSS/Atom discovery source (used by skills/search-rss.md)
if python3 -c 'import feedparser' &>/dev/null; then
    check_ok "feedparser"
elif command -v pip3 &>/dev/null; then
    check_install "feedparser"
    if pip3 install -q --user feedparser 2>/dev/null \
       || pip3 install -q --user --break-system-packages feedparser 2>/dev/null; then
        check_ok "feedparser (installed via pip3)"
    else
        check_missing "feedparser" "pip3 install feedparser"
    fi
else
    check_missing "feedparser" "pip3 install feedparser"
fi

if [[ ${#MISSING_TOOLS[@]} -gt 0 ]]; then
    echo ""
    echo "Warning: ${#MISSING_TOOLS[@]} tool(s) missing — install them before running the agent."
    echo "         Setup will continue; the agent will fail without them."
fi

echo ""

# --- Vault path ---
current_vault=$(grep -E '^VAULT_PATH=' "$ENV_FILE" 2>/dev/null | cut -d= -f2- || true)
prompt="Vault path (absolute path to your Obsidian vault)"
[[ -n "$current_vault" ]] && prompt="Vault path (leave blank to keep: $current_vault)"

read -rp "$prompt: " input
VAULT_PATH="${input:-$current_vault}"

if [[ -z "$VAULT_PATH" ]]; then
    echo "Error: vault path cannot be empty." >&2
    exit 1
fi

VAULT_PATH="${VAULT_PATH%/}"

if [[ ! -d "$VAULT_PATH" ]]; then
    echo "Warning: '$VAULT_PATH' does not exist or is not a directory."
    read -rp "Continue anyway? [y/N] " confirm
    [[ "${confirm,,}" == "y" ]] || exit 1
fi

printf 'VAULT_PATH=%s\n' "$VAULT_PATH" > "$ENV_FILE"
echo "Written: $ENV_FILE"

# --- Cron job ---
echo ""
mkdir -p "$LOG_DIR"
touch "$LOG_DIR/.gitkeep"

# Weekly/monthly reviews run at a fixed hour; daily loop runs every hour
current_hour=$(crontab -l 2>/dev/null | grep -F "weekly-review" | head -1 | awk '{print $2}' || true)
default_hour="${current_hour:-8}"
prompt="Hour for weekly/monthly reviews (0-23, leave blank to keep: $default_hour)"

read -rp "$prompt: " input_hour
HOUR="${input_hour:-$default_hour}"

if ! [[ "$HOUR" =~ ^[0-9]+$ ]] || (( HOUR < 0 || HOUR > 23 )); then
    echo "Invalid hour '$HOUR'. Using 8." >&2
    HOUR="8"
fi

DAILY_CRON_JOB="0 * * * * $RUN_SCRIPT >> $CRON_ERR_LOG 2>&1"
WEEKLY_CRON_JOB="0 $HOUR * * 1 $RUN_SCRIPT specs/weekly-review.md >> $CRON_ERR_LOG 2>&1"
MONTHLY_CRON_JOB="0 $HOUR 1 * * $RUN_SCRIPT specs/monthly-review.md >> $CRON_ERR_LOG 2>&1"
existing_crontab=$(crontab -l 2>/dev/null | grep -vF "$RUN_SCRIPT" || true)
{
    [[ -n "$existing_crontab" ]] && printf '%s\n' "$existing_crontab"
    printf '%s\n' "$DAILY_CRON_JOB"
    printf '%s\n' "$WEEKLY_CRON_JOB"
    printf '%s\n' "$MONTHLY_CRON_JOB"
} | crontab -
echo "Cron jobs set:"
echo "  Daily loop:     every hour"
echo "  Weekly review:  Mondays at ${HOUR}:00"
echo "  Monthly review: 1st of month at ${HOUR}:00"
echo "  Run logs:       $LOG_DIR/archive/YYYY-MM-DD_HH-MM-SS_<type>.log"
echo "  Shell errors:   $CRON_ERR_LOG"
