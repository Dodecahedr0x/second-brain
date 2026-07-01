# Skill: Decompose Question

**Used in**: `specs/research.md` — session start.

Turn a driving research question into a bounded checklist of sub-questions and the initial leads that would answer them.

## Input

`driving_question` (string) + its `topic` (for context).

## Step 1: Decompose

Break the question into **at most 5** concrete sub-questions that together fully answer it. Each must be independently checkable ("has a source-backed answer or not"). Cover the obvious angles: what it is, how it works / compares, when/why to use it, limits/failure modes, evidence/examples. Merge overlaps; drop any beyond 5 (keep the 5 most load-bearing).

## Step 2: Seed leads

For each sub-question emit a `question`-lead (the sub-question itself). Add any obvious `source`-lead (a specific paper/site the question names) or `entity`-lead (a named concept in the question) as starting points.

## Output

```
CHECKLIST:
- <sub-question 1>
- <sub-question 2>
INITIAL_LEADS:
- type: question  ref: <sub-question 1>
- type: entity    ref: <named concept>
```

## Guardrails

- Never exceed 5 sub-questions.
- Sub-questions must be answerable by fetched sources, not opinion.
