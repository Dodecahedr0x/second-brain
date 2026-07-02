# Skill: Synthesize Research Note

**Used in**: `specs/research.md` — finalize.

Turn a finished session's checklist + findings into one research note answering the driving question.

## Input

The active session's `short_form` (its research-note title), `driving_question`, `checklist` (each item with its source-backed findings), and `findings` list.

## Step 1: Assemble

The note already exists as a stub titled by `short_form` (created by `specs/research.md` at session start). **Update it in place — do not create a new note; the title stays `short_form`.** Keep the full driving question as the `> [!question]` callout near the top. Body structured **by the checklist** — one `##` section per sub-question, each summarising its findings and citing the `[[Source Note]]`s that back them. Lead with a 2–4 sentence answer to the driving question. Drop the `#stub` tag and the in-progress marker.

## Step 2: Honesty

Any checklist item still `[ ]` at finalize (budget/saturation) → list it under `## Open` as unanswered. Never fabricate coverage.

## Output template

```markdown
---
source_type: research
captured: YYYY-MM-DD
agent_processed: true
---

# <short_form>

> [!question] <full driving question>

> [!info] Research note — <N>/<M> sub-questions answered in <hops> hops

## Answer

<2–4 sentence synthesis.>

## <Sub-question 1>

<findings> — [[Source Note A]], [[Source Note B]]

## Concepts

- [[Concept A]]

## Open

- <uncovered sub-question, if any>

---
Tags: #research
```

Update `$VAULT_PATH/<short_form>.md` (the stub created at session start) — do not create a new note.

## Guardrails

- Every claim cites a `[[Source Note]]` created during the session — no uncited assertions.
- `## Open` omitted only if all sub-questions were covered.
