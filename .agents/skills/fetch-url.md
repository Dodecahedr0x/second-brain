# Skill: Fetch URL (Web Article)

**Used in**: `skills/parse-content.md` Part B — external content routing, for non-YouTube, non-Twitter URLs

Fetches a web page and creates a source note (see `specs/source-note.md`). For YouTube use `skills/extract-youtube.md`; for Twitter use `skills/extract-twitter.md`.

## Step 1: Fetch

```
Is the URL a GitHub repo root? (github.com/<user>/<repo> with no further path)
  → WebFetch <url>/raw/main/README.md

Is the URL a .md file?
  → WebFetch directly

Otherwise (try in order, stop at first that yields substantive content; log which one succeeded):
  → defuddle <url>                       (local; strips nav, ads, boilerplate → clean markdown)
  → curl -sL "https://r.jina.ai/<url>"   (Jina Reader → clean markdown; keyless, remote; good when defuddle is unavailable/empty or the site is JS-heavy)
  → WebFetch <url>                       (harness fetch)
  → node <repo>/scripts/webtools/crawlee-fetch.mjs "<url>"   (Crawlee stealth HTTP; LAST RESORT for bot-blocked static pages)
```

Notes:
- Jina Reader (`r.jina.ai`) is remote and rate-limited on the keyless tier — use it as a fallback, not the default; defuddle stays primary (local, no limit).
- The Jina response is already markdown with a `Title:` / `URL Source:` / `Markdown Content:` preamble — parse `title` from the `Title:` line and the body after `Markdown Content:`.
- **Crawlee stealth fetch** (`scripts/webtools/crawlee-fetch.mjs`, `<repo>` = the repo root from the run prompt) uses anti-bot headers/TLS fingerprints to fetch pages that block the others on bot-detection. It renders **no JS** (HTTP only) and its output is coarser (some nav text may remain), so it is the **last** tier — only after WebFetch returns BLOCKED/EMPTY. Output format is `Title: …` / `URL: …` / blank line / readable text; exit 0 = got content, exit 1 = failed. Needs `npm install` in `scripts/webtools/` (done by `setup.sh`).

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
