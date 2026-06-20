# Skill: Extract Twitter/X

**Used in**: `skills/parse-content.md` external content routing (Phase 4 ACT)

Produces a source note (see `specs/source-note.md`) from a Twitter/X post URL using the FxTwitter API — no authentication required.

## Step 1: Extract Tweet ID

Parse the tweet ID from the URL:

| URL pattern | Tweet ID |
|-------------|----------|
| `twitter.com/<user>/status/<id>` | `<id>` |
| `www.twitter.com/<user>/status/<id>` | `<id>` |
| `mobile.twitter.com/<user>/status/<id>` | `<id>` |
| `x.com/<user>/status/<id>` | `<id>` |
| `x.com/i/status/<id>` | `<id>` |

Ignore query strings after the numeric ID.

If no numeric ID can be extracted → status `FAILED`.

## Step 2: Fetch via FxTwitter API

```
WebFetch https://api.fxtwitter.com/status/<tweet_id>
```

The response is JSON. On success (`"code": 200`) extract from `tweet`:

| Field | JSON path |
|-------|-----------|
| Author handle | `tweet.author.screen_name` |
| Author name | `tweet.author.name` |
| Date | `tweet.created_at` |
| Text | `tweet.text` |
| Thread replies | `tweet.replies[].text` (if present) |
| Embedded URLs | any `https://` in `tweet.text` → return as `references`, not `concepts` |

On non-200 response → status `FAILED`.

## Step 3: Create Source Note

Fill `specs/source-note.md` template:
- `source_type: twitter`
- Title: `@<handle> - <first 6 words of text> - <YYYY-MM-DD>`
- `## Raw Notes`: full tweet text (and thread replies if any) as a blockquote
- `## Summary`: 1–2 sentences on what the post says or argues
- `## Key Points`: only if thread with 3+ substantive replies; otherwise omit
- `## Concepts`: concepts named by the tweet, not raw URLs
- `## References`: any embedded URLs → candidates for later extraction

Save as `$VAULT_PATH/<Title>.md`.

## Step 4: Return

```
EXTRACT_RESULT:
  status: OK | FAILED
  note: <filename>
  concepts: [A, B, C]
  references: [url1, url2]
```
