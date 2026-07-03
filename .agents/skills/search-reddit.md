# Skill: Search Reddit

**Used in**: `specs/discovery.md` Step 3 — recent community discussion, practitioner Q&A, and opinion. Conforms to the uniform search contract.

Returns recent Reddit posts for a topic via Reddit's public JSON search.

## Input

`{topic, search_phrases, source_concepts, since_date}`.

## Step 1: Query

For the first search phrase (URL-encoded):
```bash
curl -sL -H 'User-Agent: second-brain/1.0 (discovery)' \
  "https://www.reddit.com/search.json?q=<phrase>&sort=new&limit=25&t=month"
```
Reddit rejects the default curl user-agent — the `User-Agent` header is **required**. One call per topic (budget). To target a community, use `https://www.reddit.com/r/<subreddit>/search.json?q=<phrase>&restrict_sr=1&sort=new&limit=25`.

## Step 2: Parse + Filter

Response is JSON. Per `data.children[].data` extract: `title`, `url` (linked article; equals the reddit permalink for self/text posts), `permalink` (→ discussion `https://www.reddit.com<permalink>`), `created_utc` (epoch → date), `subreddit`, `score`, `num_comments`.
- Drop posts whose `created_utc` date < `since_date`.
- If `url` is a reddit.com / redd.it link (self post), use the discussion permalink as the primary `url` and omit `references`; otherwise the linked article is the `url` and the permalink goes in `references`.
- **Relevance gate**: keep only if `title` shares ≥1 term with `source_concepts`.

## Step 3: Select

Keep up to 3, highest `score` first. `why` = "Reddit r/<subreddit>, <score> pts / <num_comments> comments, <date>".

## Output

```
CANDIDATES (source=reddit):
- url: <article url or discussion permalink>
  title: <title>
  published: YYYY-MM-DD
  source: reddit
  why: <clause>
  references: [https://www.reddit.com<permalink>]
```
Empty list if none pass. The `url` is fetched by the existing `skills/fetch-url.md`; `references` carries the discussion link so the source note records it.

## Guardrails

- ≤1 API call per topic per pass; always send the `User-Agent` header.
- Never emit a hit that failed the relevance gate.
