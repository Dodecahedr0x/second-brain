# Skill: Extract YouTube

**Used in**: `skills/parse-content.md` external content routing (Phase 4 ACT)

Produces a source note (see `specs/source-note.md`) from a YouTube video URL.

On a datacenter/server IP, YouTube bot-gates yt-dlp's player API ("Sign in to confirm you're not a bot") regardless of player client or JS runtime. So prefer the cookieless endpoints below (oEmbed for metadata, `youtube-transcript-api` for the transcript) and use yt-dlp only as a cookie-backed fallback. `$YT_COOKIES` is the optional cookie args loaded from `.env.local` in Phase 0 (e.g. `--cookies-from-browser chrome` or `--cookies file.txt`); omit when empty. `$YT_PROXY` is an optional proxy URL loaded from `.env.local`; when set, pass it to `youtube-transcript-api` as `--http-proxy "$YT_PROXY" --https-proxy "$YT_PROXY"` and to yt-dlp as `--proxy "$YT_PROXY"`.

## Step 0: Video ID

Extract the 11-char id from the URL (`youtube.com/watch?v=<id>`, `youtu.be/<id>`, `youtube.com/shorts/<id>`, `youtube.com/embed/<id>`). If none → status `FAILED`.

## Step 1: Get Metadata (oEmbed — cookieless, reliable)

```bash
curl -sL "https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=<id>&format=json"
```
JSON → `title`, `author_name` (= `channel`). `upload_date` and `description` are not available here → set them `unknown`.
Only if `$YT_COOKIES` is set, enrich via `yt-dlp $YT_COOKIES --dump-json --no-download "<url>"` to add `upload_date` + `description` (first 500 chars); if that errors (bot-gated), keep the oEmbed title/channel and continue.
If oEmbed itself fails → status `FAILED`.

## Step 2: Get Transcript (youtube-transcript-api first — cookieless)

```bash
python3 -m youtube_transcript_api <id> ${YT_PROXY:+--http-proxy "$YT_PROXY" --https-proxy "$YT_PROXY"} --languages en --format text
```
On success the stdout **is** the transcript (plain text, no timestamps to strip). If it errors with "blocking requests from your IP", retry up to 2× — the block is intermittent. Try `--languages en en-US`, then drop `--languages` for any available language.

**Fallback** (only helps when cookies are set, since the gated IP blocks yt-dlp):
```bash
yt-dlp $YT_COOKIES ${YT_PROXY:+--proxy "$YT_PROXY"} --write-auto-sub --sub-lang en --sub-format vtt \
        --skip-download --output "/tmp/yt-%(id)s" "<url>"
```
Parse the `.vtt`: strip timestamps and `<c>` tags, collapse whitespace.

If **both** the transcript-api and yt-dlp paths fail → status `NO_TRANSCRIPT`: skip Step 3, leave `## Raw Notes` empty, tag the note `#needs-review`. Still create the note from the oEmbed title/channel so it is a usable stub, not a dead end.

## Step 3: Summarise

From the transcript:
1. **Summary**: 3–5 sentence synthesis of the video's main argument
2. **Key Points**: up to 8 bullet points (one per major idea)
3. **Concepts**: named entities and technical terms → candidate wikilinks

Limit processing to first 10 000 transcript words if the video is very long.

## Step 4: Create Source Note

Fill `specs/source-note.md` template:
- `source_type: youtube`
- `## Raw Notes`: first 300 words of transcript verbatim (as a blockquote), then `[transcript truncated]`

Save as `$VAULT_PATH/<Title>.md`.

## Step 5: Update Caller

Return:
```
EXTRACT_RESULT:
  status: OK | NO_TRANSCRIPT | FAILED
  note: <filename>
  concepts: [A, B, C]
```

The caller (daily pipeline) replaces the raw URL bullet in the daily note with `[[<Title>]]`.
