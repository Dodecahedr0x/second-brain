# Skill: Unresolved Threads

**Used in**: `specs/daily-suggestions.md` Step 3c

Finds open questions and follow-up intentions from recent daily notes that have not been addressed in subsequent notes.

## Input

The last 7 daily notes, sorted newest first (excluding today's note).

## Step 1: Extract Thread Candidates

For each note, scan all non-agent bullets (skip `## Suggestions`, `## Knowledge Digest` sections and their children). Flag a bullet as a candidate if it contains any of:

- A `?` character
- The phrases: "follow up", "look into", "need to", "wondering", "TODO", "check if", "explore", "revisit", "not sure", "figure out"

## Step 2: Filter Already-Resolved Threads

For each candidate bullet, extract its key concepts (wikilinks, proper nouns, or the main verb phrase). Then check all daily notes *after* the candidate's date for:
- A bullet referencing the same concept
- A completed task (`- [x]`) mentioning the same concept

If found → the thread was followed up → **skip**.

## Step 3: Select Final Items

From the remaining unresolved candidates:
- Prefer candidates from **older** notes (a thread from 5 days ago is more at-risk than one from yesterday)
- Prefer candidates with a wikilink (more specific = more actionable)
- Return at most **3** items

## Output

```
UNRESOLVED_THREADS:
- date: YYYY-MM-DD
  text: <original bullet text with [[wikilinks]] preserved>
```

Return an empty list if no unresolved threads found.

## Guardrails

- Use exact bullet text — do not summarise or rephrase
- Do not flag agent-written bullets (from `## Suggestions` or `## Knowledge Digest`)
- A thread from today is not yet unresolved — always exclude today's note
