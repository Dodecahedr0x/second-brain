# Skill: Fetch URL (Web Article)

**Used in**: `skills/parse-content.md` Part B — external content routing, for non-YouTube, non-Twitter URLs

Fetches a web page and creates a source note (see `specs/source-note.md`). For YouTube use `skills/extract-youtube.md`; for Twitter use `skills/extract-twitter.md`.

## Step 1: Fetch

```
Is the URL a GitHub repo root? (github.com/<user>/<repo> with no further path)
  → WebFetch <url>/raw/main/README.md

Is the URL a .md file?
  → WebFetch directly

Otherwise:
  → defuddle <url>   (strips nav, ads, boilerplate → clean markdown)
  → fallback: WebFetch if defuddle unavailable (log fallback)
```

Failures:
| Condition | Status |
|-----------|--------|
| Network error | FAILED |
| No parseable content | EMPTY |
| Robots / paywall | BLOCKED |
| `localhost`, `127.*`, `192.168.*` | BLOCKED |

On any failure: return status, do not create a note, do not retry this session.

## Step 2: Parse

From the fetched text extract:

| Field | Source |
|-------|--------|
| `title` | `<h1>` or page `<title>` |
| `summary` | First substantive paragraph / lede |
| `key_points` | Headings, numbered lists, bold claims (max 8) |
| `concepts` | Named entities, technical terms |
| `pub_date` | Visible date or "unknown" |
| `author` | Byline or "unknown" |

If content > 5 000 words: summarise first 2 000 words + conclusion section; skip the middle.

## Step 3: Create Source Note

Fill `specs/source-note.md` template:
- `source_type: article`
- `## Raw Notes`: omit (full text not stored in vault)

Save as `$VAULT_PATH/<Title>.md`.

Do NOT follow redirect chains more than 2 hops.

## Step 4: Return

```
EXTRACT_RESULT:
  status: OK | FAILED | EMPTY | BLOCKED
  note: <filename or blank>
  concepts: [A, B, C]
```
