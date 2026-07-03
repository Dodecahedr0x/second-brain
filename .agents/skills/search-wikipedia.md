# Skill: Search Wikipedia

**Used in**: `specs/discovery.md` Step 3 and `specs/research.md` — foundational, encyclopedic grounding for a concept. Conforms to the uniform search contract.

**Evergreen**: Wikipedia is not recency-based, so it ignores `since_date` — use it to *define and deepen* a concept, not to find news. Pair it with a recent source (paper / blog / video) for a well-rounded note.

## Input

`{topic, search_phrases, source_concepts, since_date}` (`since_date` ignored — evergreen).

## Step 1: Query

For the first search phrase or the concept being defined (URL-encoded):
```bash
curl -sL "https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=<phrase>&format=json&srlimit=5"
```
One call per topic/concept.

## Step 2: Parse + Filter

Response is JSON. Per `query.search[]` extract `title` and `snippet` (strip HTML tags). The article URL is `https://en.wikipedia.org/wiki/<Title>` (spaces → underscores).
- **Relevance gate**: keep only if `title` / `snippet` shares ≥1 term with `source_concepts`, or the title matches the concept being defined.

## Step 3: Select

Keep the single best match (top relevance). `why` = "Wikipedia — foundational definition".

## Output

```
CANDIDATES (source=wikipedia):
- url: https://en.wikipedia.org/wiki/<Title>
  title: <Title>
  published: evergreen
  source: wikipedia
  why: foundational definition
```
Empty list if none pass. The article is fetched by the existing `skills/fetch-url.md`. Use Wikipedia to anchor an atomic note's definition, then layer specific/recent sources on top for depth.

## Guardrails

- ≤1 API call per topic/concept per pass.
- Prefer Wikipedia for *defining* a concept, not for recency.
