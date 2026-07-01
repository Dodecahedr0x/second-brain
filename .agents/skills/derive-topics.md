# Skill: Derive Topics

**Used in**: `specs/discovery.md` (all passes); selects which topics to discover content for.

Infers the user's topics of interest from recent daily notes. No user-maintained list — fully automatic.

> **Note**: Concept extraction here feeds `skills/update-interest-model.md`, which owns the persistent `Agent Interest Model`. Callers that need current topics/weights read `Agent Interest Model`, not this skill's ephemeral output.

## Input

- `mode`: `active` | `faded` | `dormant` — selects the time window and ranking (see Step 3).

## Step 1: Collect Daily Notes

Read recent daily notes covering the mode's window, newest first: `active` → last ~14 days, `faded` → last ~21 days, `dormant` → last ~90 days. **User zone only** — stop at the `---`/`## Agent` separator; never read agent-zone bullets. Skip `agent_managed: true` notes.

## Step 2: Extract Concepts

From user bullets, extract concept candidates:
- `[[wikilinks]]` (strongest signal)
- `**bold**` terms
- Capitalised mid-sentence proper nouns
- Recurring multi-word noun phrases

Skip tasks (`- [ ]`), pure-URL bullets, and dates/amounts. Group near-synonyms under one canonical label (e.g. "LLMs", "language models" → `Large Language Models`).

## Step 3: Score by Mode

Per concept, build the sorted list of dates it appeared. Then:

| Mode | Window | Keep concepts that… | Weight |
|------|--------|---------------------|--------|
| `active` | last 14d | appeared in the last ~5d | recency-weighted (linear decay; today highest) |
| `faded` | 7–21d ago | had ≥2 appearances in 7–21d band but **none** in the last ~5d | total appearances in band |
| `dormant` | 30–90d ago | had real past signal (≥2 appearances) and untouched recently | total appearances in band |

A concept qualifies only if it appeared in ≥2 notes **or** once as an explicit `[[wikilink]]` — filters one-off noise.

## Step 4: Build Search Phrases

For each surviving topic, emit 1–2 search phrases:
1. the topic label itself
2. topic label + its most frequently co-occurring concept (most-linked neighbour), if any

## Output

```
TOPICS (mode=<mode>):
- topic: <label>
  weight: <number>
  last_seen: YYYY-MM-DD
  source_concepts: [A, B]
  search_phrases: ["<label>", "<label> <neighbour>"]
```

Return at most 5 topics, ranked by weight desc. Empty list if none qualify — do not fabricate.

## Guardrails

- Report only concepts actually present in the notes — no inference of unstated interests.
- Never read or score agent-zone content.
