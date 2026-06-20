# Skill: Extract YouTube

**Used in**: `skills/parse-content.md` external content routing (Phase 4 ACT)

Produces a source note (see `specs/source-note.md`) from a YouTube video URL.

## Step 1: Get Metadata

```bash
yt-dlp --dump-json --no-download "<url>"
```

Extract: `title`, `channel`, `upload_date`, `description` (first 500 chars).

## Step 2: Get Transcript

```bash
yt-dlp --write-auto-sub --sub-lang en --sub-format vtt \
        --skip-download --output "/tmp/yt-%(id)s" "<url>"
```

Parse the `.vtt` file: strip timestamps and `<c>` tags, collapse whitespace. If no English auto-sub exists, try `--sub-lang en-US` then any available language. If no transcript at all → set `status: NO_TRANSCRIPT`, skip Step 3, leave `## Raw Notes` empty and tag note `#needs-review`.

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
