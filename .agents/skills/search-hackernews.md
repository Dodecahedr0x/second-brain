# Skill: Search Hacker News

**Used in**: `specs/discovery.md` Step 3 — recent high-signal tech/science discussion.

Returns recent HN stories for a topic via the Algolia API. Conforms to the uniform search contract.

## Input

`{topic, search_phrases, source_concepts, since_date}`.

## Step 1: Query

For the first search phrase:
```bash
curl -sL "https://hn.algolia.com/api/v1/search_by_date?query=<phrase>&tags=story&numericFilters=points>20&hitsPerPage=15"
```
URL-encode the phrase. One call per topic (budget).

## Step 2: Parse + Filter

The response is JSON. Per `hits[]` extract: `title`, `url` (the linked article; may be null for Ask/Show HN text posts), `created_at`, `points`, `objectID` (→ discussion permalink `https://news.ycombinator.com/item?id=<objectID>`).
- Drop hits with `created_at` < `since_date`.
- If `url` is null (text post), use the discussion permalink as the primary `url` and omit `references`.
- **Relevance gate**: keep only if `title` shares ≥1 term with `source_concepts`.

## Step 3: Select

Keep up to 3, highest `points` first. `why` = "HN, <points> points, <date>".

## Output

```
CANDIDATES (source=hn):
- url: <article url or discussion permalink>
  title: <title>
  published: YYYY-MM-DD
  source: hn
  why: <clause>
  references: [https://news.ycombinator.com/item?id=<objectID>]
```
Empty list if none pass. `references` carries the discussion link so the source note records it. No new extractor — the article `url` is fetched by the existing `skills/fetch-url.md`.

## Guardrails

- ≤1 API call per topic per pass.
- Never emit a hit that failed the relevance gate.
