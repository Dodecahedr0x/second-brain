# Skill: Search Twitter/X

**Used in**: `specs/discovery.md` Step 3 — recent tweets by topic. **GATED**: a no-op unless the Agent-Reach Twitter backend + cookies are configured.

Uses Agent-Reach's cookie-based Twitter backend (unauthenticated Twitter search is not possible, which is why discovery excluded Twitter by default). Conforms to the uniform search contract.

## Step 0: Availability Gate

Check the Twitter channel is ready:
```bash
agent-reach doctor --json
```
If the Twitter/X channel is not `available` (backend not installed, or no cookies) → return empty `CANDIDATES` immediately. Do **not** attempt a search, do not error.

To enable (one-time, on a machine with a logged-in account): install the backend (`agent-reach` "install twitter") and set cookies with `agent-reach configure twitter-cookies "<cookie string>"`.

## Step 1: Search

For the first search phrase (one search per topic, budget):
```bash
twitter search "<phrase>" -n 20
```

## Step 2: Parse + Filter

Per tweet extract: `text`, author `handle`, status `url`, `created` date, engagement (likes/retweets).
- Drop tweets older than `since_date`.
- **Relevance gate**: keep only if `text` shares ≥1 term with `source_concepts`.
- Prefer higher-engagement tweets.

## Step 3: Select

Keep up to 3, newest/highest-engagement first. `why` = "@<handle>, <date>".

## Output

```
CANDIDATES (source=twitter):
- url: https://x.com/<handle>/status/<id>
  title: @<handle> — <first 8 words of text>
  published: YYYY-MM-DD
  source: twitter
  why: <clause>
```
Empty list if none pass or the backend is unavailable. The tweet is later extracted by `skills/extract-twitter.md` (FxTwitter, no auth needed for a known tweet URL).

## Guardrails

- ≤1 search per topic per pass.
- If the backend is unavailable or errors → empty list, log once, never abort the loop.
