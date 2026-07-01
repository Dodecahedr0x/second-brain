# Skill: Synthesize Research Note

**Used in**: `specs/research.md` — finalize.

Turn a finished session's checklist + findings into one research note answering the driving question.

## Input

The active session's `driving_question`, `checklist` (each item with its source-backed findings), and `findings` list.

## Step 1: Assemble

Title: the driving question (as a statement, Title Case). Body structured **by the checklist** — one `##` section per sub-question, each summarising its findings and citing the `[[Source Note]]`s that back them. Lead with a 2–4 sentence answer to the driving question.

## Step 2: Honesty

Any checklist item still `[ ]` at finalize (budget/saturation) → list it under `## Open` as unanswered. Never fabricate coverage.

## Output template

```markdown
---
source_type: research
captured: YYYY-MM-DD
agent_processed: true
---

# <Driving question as a statement>

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

Save as `$VAULT_PATH/<Title>.md`.

## Guardrails

- Every claim cites a `[[Source Note]]` created during the session — no uncited assertions.
- `## Open` omitted only if all sub-questions were covered.
