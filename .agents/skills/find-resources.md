# Skill: Find Resources

**Used in**: `specs/daily-suggestions.md` Step 2

Finds 1–2 high-quality external resources for a given concept or topic cluster, using web search.

## Input

- `concept`: the concept name or topic cluster (e.g., "Syncthing", "device synchronization")
- `existing_refs`: URLs already present in vault notes for this concept (to avoid duplicates)

## Step 1: Build Search Queries

Generate 2 search queries from the concept:
1. `<concept> guide OR tutorial OR explained`
2. `<concept> <related_concept> best practices` (use the most closely linked concept from the vault)

## Step 2: Search

Run each query via WebSearch. From the results, collect candidates:
- Prefer: official documentation, well-known publications, recent articles (< 2 years old)
- Prefer: YouTube videos for procedural/visual topics; written articles for conceptual topics
- Exclude: results already in `existing_refs`
- Exclude: paywalled sites, social media (except YouTube), results without a clear title

## Step 3: Select

Pick at most 2 candidates total. For each, record:
- `title`: the page/video title
- `url`: the URL
- `type`: article | video | docs | book
- `reason`: one clause on why it's relevant (e.g., "covers Syncthing's relay protocol, mentioned in your notes")

## Step 4: Verify (lightweight)

For each selected candidate, fetch the first 200 characters via WebFetch to confirm the page exists and the title matches. If it returns an error, discard and pick the next candidate.

## Output

```
RESOURCES for <concept>:
- title: <string>
  url: <url>
  type: article | video | docs
  reason: <clause>
```

Return empty list if no suitable resources found — do not fabricate results.

## Guardrails

- Never return a URL you have not verified exists in this session
- Do not return the same URL twice across different concept lookups in the same session
- Limit to 2 WebSearch calls and 2 WebFetch verifications per concept to stay within session budget
