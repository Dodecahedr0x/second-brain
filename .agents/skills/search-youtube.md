# Skill: Search YouTube

**Used in**: `specs/discovery.md` Step 3 — recent videos (talks, explainers, analysis).

Returns recent YouTube videos for a topic via `yt-dlp` search. Conforms to the uniform search contract.

## Input

`{topic, search_phrases, source_concepts, since_date}`.

`$YT_COOKIES` below is the optional cookie args loaded from `.env.local` in Phase 0 (e.g. `--cookies-from-browser chrome`). `$YT_PROXY` is an optional proxy URL; when set, include `--proxy "$YT_PROXY"` on every `yt-dlp` command. Cookie presence decides the metadata mode. (`ytsearchdate` is unsupported in current yt-dlp builds, so recency is enforced by date-filtering, not a date-sorted search.)

## Step 1: Search

For the first search phrase, one search per topic (budget):

**Cookies configured** (`YT_COOKIES` non-empty) — full extraction yields `upload_date`:
```bash
yt-dlp "ytsearch20:<phrase>" $YT_COOKIES ${YT_PROXY:+--proxy "$YT_PROXY"} --dump-json --dateafter <since_date as YYYYMMDD> --no-warnings
```

**No cookies** — fast flat search (no per-video metadata; YouTube bot-gates full extraction unauthenticated):
```bash
yt-dlp "ytsearch20:<phrase>" ${YT_PROXY:+--proxy "$YT_PROXY"} --dump-json --flat-playlist --no-warnings
```

## Step 2: Parse + Filter

Each JSON line is a video. Extract `id`, `title`, `duration`, `channel`, and `upload_date` (YYYYMMDD; **null in the no-cookies flat path**).
- Drop `duration` < 60s (Shorts).
- **Relevance gate**: keep only if `title` shares ≥1 term with `source_concepts`.
- **Recency**:
  - *Cookies path*: drop `upload_date` < `since_date` (compare as YYYYMMDD — strip dashes from `since_date`).
  - *No-cookies path*: `upload_date` is unavailable, so do not date-filter; recency is best-effort and the `Agent Discovery Log` dedup guard ensures each relevance-matched video is surfaced at most once.

## Step 3: Select

Keep up to 3 (newest first when dated, else relevance order). `why` = "video by <channel>".

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

- ≤1 search per topic per pass (a cookie-path retry after a fallback does not count against new topics).
- If the cookies-path command errors (e.g. misconfigured cookies / no browser profile), retry once with the no-cookies flat command, then proceed.
- If `yt-dlp` still errors, return an empty list and log the failure — never abort the loop.
