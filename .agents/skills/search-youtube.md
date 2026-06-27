# Skill: Search YouTube

**Used in**: `specs/discovery.md` Step 3 — recent videos (talks, explainers, analysis).

Returns recent YouTube videos for a topic via `yt-dlp` search. Conforms to the uniform search contract.

## Input

`{topic, search_phrases, source_concepts, since_date}`.

## Step 1: Search

For the first search phrase:
```bash
yt-dlp "ytsearch20:<phrase>" --dump-json --flat-playlist --no-warnings
```
`ytsearch` returns by relevance. (The `ytsearchdate` scheme is unsupported in current yt-dlp builds, and full per-video extraction — which would yield `upload_date` — is bot-gated by YouTube without browser cookies. So this skill uses the fast unauthenticated flat search.) One search per topic (budget).

## Step 2: Parse + Filter

Each JSON line is a video. Extract `id`, `title`, `duration`, `channel`. `upload_date` is **not available** in flat-playlist output (it comes back null).
- Drop `duration` < 60s (Shorts).
- **Relevance gate**: keep only if `title` shares ≥1 term with `source_concepts`.
- **Recency is best-effort**: because `upload_date` is unavailable unauthenticated, do not date-filter YouTube. The `Agent Discovery Log` dedup guard ensures each video is surfaced at most once, so a relevance-matched video is offered a single time rather than re-surfaced. (If `upload_date` is ever present — e.g. cookies configured — drop entries older than `since_date`.)

## Step 3: Select

Keep up to 3 by relevance order. `why` = "video by <channel>".

## Output

```
CANDIDATES (source=youtube):
- url: https://www.youtube.com/watch?v=<id>
  title: <title>
  published: YYYY-MM-DD | unknown
  source: youtube
  why: <clause>
```
Empty list if none pass. The video is later extracted by the existing `skills/extract-youtube.md`.

## Guardrails

- ≤1 search per topic per pass.
- If `yt-dlp` errors, return an empty list and log the failure — never abort the loop.
