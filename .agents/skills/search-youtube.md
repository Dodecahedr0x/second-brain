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
`ytsearch` returns by relevance (the `ytsearchdate` scheme is unsupported in current yt-dlp builds); recency is enforced by the `upload_date` filter in Step 2. One search per topic (budget).

## Step 2: Parse + Filter

Each JSON line is a video. Extract `id`, `title`, `upload_date` (YYYYMMDD), `duration`, `channel`.
- Drop `upload_date` < `since_date` (compare as YYYYMMDD — strip the dashes from `since_date` first).
- Drop `duration` < 60s (Shorts).
- **Relevance gate**: keep only if `title` shares ≥1 term with `source_concepts`.

## Step 3: Select

Keep up to 3, newest first. `why` = "video by <channel>, <date>".

## Output

```
CANDIDATES (source=youtube):
- url: https://www.youtube.com/watch?v=<id>
  title: <title>
  published: YYYY-MM-DD
  source: youtube
  why: <clause>
```
Empty list if none pass. The video is later extracted by the existing `skills/extract-youtube.md`.

## Guardrails

- ≤1 search per topic per pass.
- If `yt-dlp` errors, return an empty list and log the failure — never abort the loop.
