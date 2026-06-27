# Skill: Search Web

**Used in**: `specs/discovery.md` Step 3 — recent news, blog posts, and analysis articles.

Returns recent web articles for a topic via `WebSearch`. Conforms to the uniform search contract.

## Input

`{topic, search_phrases, source_concepts, since_date}`.

## Step 1: Search

Run `WebSearch` on the first search phrase with a recency bias — append the current year and "news OR analysis" (e.g. `<phrase> 2026 news OR analysis`). One WebSearch per topic (budget).

## Step 2: Filter

From results, collect candidates:
- Prefer a visible publication date ≥ `since_date`; if no date is visible, keep only if the result snippet implies recency.
- Exclude paywalled sites, social media, including YouTube (skip any youtube.com URL — it is handled by `skills/search-youtube.md`), arxiv (handled by search-arxiv), and Hacker News (handled by search-hackernews).
- **Relevance gate**: keep only if title/snippet shares ≥1 term with `source_concepts`.

## Step 3: Select

Keep up to 3, most-recent first. `why` = one clause on why it connects to the topic.

## Output

```
CANDIDATES (source=web):
- url: <url>
  title: <title>
  published: YYYY-MM-DD | unknown
  source: web
  why: <clause>
```
Empty list if none pass. The article is later extracted by the existing `skills/fetch-url.md`.

## Guardrails

- ≤1 WebSearch per topic per pass.
- Never emit a URL not present in this session's search results.
