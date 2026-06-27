# Skill: Search arxiv

**Used in**: `specs/discovery.md` Step 3 — recency-first paper discovery.

Returns recent arxiv papers for a topic. Conforms to the uniform search contract (see Output).

## Input

`{topic, search_phrases, source_concepts, since_date}`.

## Step 1: Query

For the first search phrase:
```bash
curl -sL "https://export.arxiv.org/api/query?search_query=all:<phrase>&sortBy=submittedDate&sortOrder=descending&max_results=10"
```
URL-encode the phrase (spaces → `+`). One call per topic (budget).

## Step 2: Parse + Filter

The response is Atom XML. Per `<entry>` extract: `title`, `published`, `id` (the `arxiv.org/abs/<id>` URL), `summary` (abstract), `category`.
- Drop entries with `published` < `since_date`.
- **Relevance gate**: keep only if `title`+`summary` shares ≥1 term with `source_concepts`.

## Step 3: Select

Keep up to 3, newest first. For each: `why` = one clause (e.g. "new paper on <topic>, submitted <date>").

## Output

```
CANDIDATES (source=arxiv):
- url: https://arxiv.org/abs/<id>
  title: <title>
  published: YYYY-MM-DD
  source: arxiv
  why: <clause>
```
Empty list if none pass. Never fabricate an id.

## Guardrails

- ≤1 API call per topic per pass.
- Return abstract-page URLs (`/abs/`), not `/pdf/` — the extractor handles either but `/abs/` is canonical.
