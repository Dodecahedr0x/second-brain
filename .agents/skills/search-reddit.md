# Skill: Search Reddit

**Used in**: `specs/discovery.md` Step 3 — recent community discussion, practitioner Q&A, and opinion. Conforms to the uniform search contract.

Surfaces relevant Reddit threads for a topic via `WebSearch` targeted at reddit.com. (Reddit's `search.json` API is not used — it now blocks non-OAuth requests with an HTML block page.)

## Input

`{topic, search_phrases, source_concepts, since_date}`.

## Step 1: Search

Run `WebSearch` on the first search phrase scoped to Reddit, with a recency bias:
`<phrase> site:reddit.com <current year>`. One `WebSearch` per topic (budget).

## Step 2: Filter

From results, keep only `reddit.com` thread URLs (`/r/<subreddit>/comments/...`):
- Prefer a visible date ≥ `since_date`; if no date is visible, keep only if the snippet implies recent discussion.
- **Relevance gate**: keep only if title/snippet shares ≥1 term with `source_concepts`.
- Note the `subreddit` from the URL for the `why` clause.

## Step 3: Select

Keep up to 3, most-relevant/recent first. `why` = "Reddit r/<subreddit> discussion".

## Output

```
CANDIDATES (source=reddit):
- url: <reddit thread url>
  title: <title>
  published: YYYY-MM-DD | unknown
  source: reddit
  why: <clause>
```
Empty list if none pass. The thread is fetched by the existing `skills/fetch-url.md` — Reddit often blocks plain fetches, so the fetch chain may fall through to its stealth tier (`scripts/webtools/crawlee-fetch.mjs`); if it still fails, the item is tagged `#needs-review` like any other blocked URL.

## Guardrails

- ≤1 `WebSearch` per topic per pass.
- Only emit `reddit.com/r/.../comments/` thread URLs present in this session's results.
- Never emit a hit that failed the relevance gate.
