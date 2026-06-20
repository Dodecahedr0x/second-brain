# Skill: On This Day

**Used in**: `specs/daily-suggestions.md` Step 3b

Surfaces 1–2 bullets from prior daily notes on (approximately) the same calendar date, creating a memory hook.

## Input

`today`: the current date in `YYYY-MM-DD` format.

## Step 1: Find Candidate Files

Look for daily notes at these offsets from `today`:

| Offset | Label |
|--------|-------|
| −7 days | 1 week ago |
| −30 days | 1 month ago |
| −90 days | 3 months ago |
| −365 days | 1 year ago |

For each offset, try the exact date first. If the file doesn't exist, try ±1 day. If still absent, skip that offset.

## Step 2: Extract the Best Bullet

For each found file:
1. Skip all agent-managed sections: `## Suggestions`, `## Knowledge Digest`, `## Knowledge Digest —`, `## Suggestions —`
2. From the remaining bullets, prefer bullets that:
   - Contain at least one `[[wikilink]]`
   - Are descriptive (> 6 words) rather than bare tasks (`- [ ]`)
3. Pick the single highest-scoring bullet per file

## Step 3: Select Final Items

Pick at most 2 items total. Prefer older offsets (−365 over −7) — distant memories are more surprising. If the two best candidates come from similar dates, drop the more recent one.

## Output

```
ON_THIS_DAY:
- date: YYYY-MM-DD
  label: N days ago
  text: <bullet text with [[wikilinks]] preserved>
```

Return an empty list if no suitable bullets found — do not fabricate.

## Guardrails

- Never include bullets from agent-managed sections
- Never invent or paraphrase — use the exact bullet text
- If the same concept appears in two candidate bullets, pick only one
