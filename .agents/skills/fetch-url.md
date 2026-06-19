# Skill: Fetch URL

**Used in**: `specs/daily-pipeline.md` §Content Fetching (Phase 4 ACT)

## Purpose

Retrieve the text content of a URL and return a structured parse suitable for note enrichment. Handles web pages, articles, and documentation. Does not handle PDFs or video content directly.

## Decision Tree

```
Is the URL a YouTube link?
  → Yes: extract video ID, note as VIDEO type, skip fetch, return stub
  → No: continue

Is the URL a GitHub repo root? (github.com/<user>/<repo> with no path)
  → Yes: use WebFetch to read the README directly at <url>/raw/main/README.md
  → No: continue

Is the URL a .md file?
  → Yes: use WebFetch directly (already markdown)
  → No: use defuddle CLI to strip page chrome and extract article text
```

## Fetch Steps

### Step 1: Fetch

For standard web pages:
```
defuddle <url>
```
This returns clean markdown, stripping navigation, ads, and boilerplate.

For raw markdown (e.g., GitHub raw, docs sites):
Use WebFetch with the URL directly.

### Step 2: Parse the Result

Apply `skills/parse-content.md` to the fetched text. Extract:

| Field | Source |
|-------|--------|
| `title` | `<h1>` or page title |
| `summary` | First substantive paragraph or lede |
| `concepts` | Named entities, technical terms, headings |
| `facts` | Key claims, data points, numbered items |
| `pub_date` | Publication date if visible |
| `author` | Byline if present |

### Step 3: Return Structured Result

Output in this format so the caller can act on it without re-reading:

```
FETCH_RESULT:
  url: <url>
  status: OK | FAILED | EMPTY | BLOCKED
  title: <string>
  summary: <2-4 sentences>
  concepts: [A, B, C]
  facts:
    - Fact 1
    - Fact 2
  pub_date: <YYYY-MM-DD or "unknown">
  author: <string or "unknown">
```

## Guardrails

- Do NOT store the full fetched text in memory or any vault file — only the structured parse result
- Do NOT follow redirect chains more than 2 hops
- If the fetched content is longer than ~5000 words, summarise the first 2000 words and the conclusion/summary section; skip the middle
- Treat any URL under `localhost`, `127.0.0.1`, or `192.168.*` as BLOCKED (do not fetch internal resources)
- If defuddle is unavailable, fall back to WebFetch; log the fallback

## Video Stub Format

For YouTube/video URLs that cannot be fetched:

```
FETCH_RESULT:
  url: <url>
  status: VIDEO
  title: <url>  (human will fill in)
  summary: "Video content — manual summary required"
  concepts: []
  facts: []
```

Tag the corresponding daily note bullet with `#needs-review` so the user knows to summarise it manually.
