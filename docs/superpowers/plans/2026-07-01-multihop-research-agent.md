# Multi-Hop Research Agent — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a question-anchored, incremental multi-hop research agent that fills the `EXPLORE` action socket — one hop per loop cycle over a mixed frontier of leads — until a driving question's sub-question checklist is satisfied, producing a synthesized research note.

**Architecture:** A stateful `Agent Research Log` note holds one active session (driving question, ≤5-item checklist, frontier of leads, findings, budgets) plus a seed queue and completed index. `specs/research.md` orchestrates start / advance-one-hop / finalize, reusing the discovery search skills, the fetch chain, and the source/atomic/link/MOC skills. The action-router's `EXPLORE` action (today a no-op) advances the active session by one hop.

**Tech Stack:** Markdown instruction files under `.agents/`, read by the LLM agent at runtime. No new runtime deps. Builds on the steering model (`Agent Interest Model`, `action-router.md`), discovery (`search-*`, `specs/discovery.md`), the fetch chain, and the daily/loop specs.

## Global Constraints

- **Pure instruction authoring.** Deliverables are `.agents/*.md` files read by the LLM agent; there is no compiler/unit-test layer. Verification is structural (file exists, format matches existing skills/specs, cross-references resolve) plus read-review.
- **Brevity is a repo law** (`AGENTS.md`): terse, lists over prose, one concern per file.
- **Skill format:** start with `# Skill: <Name>` then `**Used in**: …`. **Spec format:** `# Spec: <Name>` then `**Trigger**: …`.
- **This is subsystem #3** filling the `EXPLORE` socket. It adds **no new fetching primitives** — it orchestrates the existing `search-*` skills, the fetch chain (`fetch-url.md` + extractors), and `source-note.md` / `create-atomic.md` / `link-notes.md` / `update-moc.md`.
- **Question-anchored:** exactly ONE active session at a time; tangential questions become queued future seeds, never chased mid-session.
- **Incremental:** `EXPLORE` = advance the active session by exactly ONE hop, then stop.
- **Concrete bounds (fixed here for determinism; tunable later — keep them together in `specs/research.md`):**
  - checklist size ≤ **5** sub-questions.
  - `hop_budget` = **12** hops/session.
  - saturation guard = **3** consecutive no-progress hops.
  - frontier cap = top **20** leads by score (drop the tail).
  - **1** primary fetch per hop.
  - lead score = primarily "fills an OPEN checklist item?", then source authority/recency, minus a hop-distance penalty.
  - termination priority: **answered** (all `[x]`) → **budget** (≥12) → **saturation** (≥3).
- **`Agent Research Log` schema (exact, used across tasks):** an agent-managed note with sections `## Active Session` (with `### Checklist`, `### Frontier`, `### Explored`, `### Findings`), `## Queue`, `## Completed`. Frontier row: `| Lead | Type | Score | Status |` where `Type` ∈ {`question`,`source`,`entity`}. Completed row: `| Date | Question | Research Note |`.

## Reusable Verification Command

**VERIFY-REFS** — no instruction file references a non-existent skill/spec/context file:
```bash
cd /home/openclaw/second-brain/.agents && \
grep -rhoE '\b(skills|specs|context)/[A-Za-z0-9_-]+(/[A-Za-z0-9_-]+)*\.md' . | sort -u | \
while read -r f; do [ -f "$f" ] || echo "DANGLING: $f"; done; echo "VERIFY-REFS done"
```
Expected: only `VERIFY-REFS done`. During the plan, references to files created by *later* tasks are expected to dangle until those tasks land; the final task's verify must be fully clean.

---

### Task 1: Register `Agent Research Log` (seventh agent-managed note)

The session state store — lands first.

**Files:**
- Modify: `.agents/context/agent-notes.md` (Standard Notes table row)
- Modify: `.agents/skills/agent-notes.md` (template + "six" → "seven")
- Modify: `.agents/AGENTS.md` (Phase 0 step 3: "six" → "seven")
- Modify: `.agents/context/boundaries.md` (Scope Creep list: "six" → "seven")

**Interfaces:**
- Produces: the agent-managed note **`Agent Research Log`** with the exact schema from Global Constraints. Consumed by `specs/research.md`.

- [ ] **Step 1: Add the Standard Notes row** in `.agents/context/agent-notes.md`, after the `Agent Interest Model` row:
```markdown
| `Agent Research Log` | Active research session (driving question, checklist, frontier, findings) + seed queue + completed index |
```

- [ ] **Step 2: Add the template + bump the count** in `.agents/skills/agent-notes.md`.
  - Change `…the six agent-managed vault notes.` → `…the seven agent-managed vault notes.`
  - Change `…check that all six notes exist…` → `…check that all seven notes exist…`
  - Append:
```markdown

---

## Agent Research Log

**Purpose**: State for the multi-hop research agent (subsystem #3). Holds one active session, the pending question queue, and the completed index. Written only by `specs/research.md`; advanced one hop per `EXPLORE` action.

### Template

```markdown
---
agent_managed: true
---

# Agent Research Log

## Active Session

*(none)*
<!-- when active, replace the line above with:
**Driving question**: <q> · **Topic**: [[Topic]] · **Status**: active
**Hops**: 0/12 · **Saturation**: 0/3

### Checklist
- [ ] <sub-question>

### Frontier
| Lead | Type | Score | Status |
|------|------|-------|--------|

### Explored

### Findings
-->

## Queue

| Question | Topic | Priority |
|----------|-------|----------|

## Completed

| Date | Question | Research Note |
|------|----------|---------------|

---
*Machine-maintained, readable.* #agent-system
```

### Update

Written only by `specs/research.md` (start / advance / finalize). Exactly one `## Active Session`; `Type` ∈ {`question`,`source`,`entity`}; a checklist item flips to `[x]` only when a source-backed finding supports it.
```

- [ ] **Step 3: Update Phase 0 count** in `.agents/AGENTS.md` — `Verify all six agent-managed notes exist…` → `Verify all seven agent-managed notes exist…`.

- [ ] **Step 4: Update boundaries** in `.agents/context/boundaries.md` — `3. One of the six agent-managed notes, OR` → `3. One of the seven agent-managed notes, OR`.

- [ ] **Step 5: Verify**
```bash
cd /home/openclaw/second-brain && \
grep -rn "six agent-managed\|all six notes\|six agent-managed vault" .agents && echo "--- should be empty above ---"; \
grep -rln "Agent Research Log" .agents
```
Expected: no "six agent-managed" matches remain; `Agent Research Log` in `context/agent-notes.md` + `skills/agent-notes.md`. Then **VERIFY-REFS** (expect only `DANGLING: specs/research.md` — created in Task 4).

- [ ] **Step 6: Read-review** — the section matches the other agent-note sections (frontmatter `agent_managed: true`, `#agent-system` footer, terse); the schema matches Global Constraints.

- [ ] **Step 7: Commit**
```bash
cd /home/openclaw/second-brain && git add .agents/ && \
git commit -m "Register Agent Research Log (seventh agent-managed note)"
```

---

### Task 2: `skills/decompose-question.md`

**Files:**
- Create: `.agents/skills/decompose-question.md`

**Interfaces:**
- Consumes: a `driving_question` string.
- Produces: `CHECKLIST` (≤5 sub-questions) + `INITIAL_LEADS` (question/source/entity leads) — consumed by `specs/research.md` at session start.

- [ ] **Step 1: Write the file** `.agents/skills/decompose-question.md`:
```markdown
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
```

- [ ] **Step 2: Verify** — **VERIFY-REFS** (expect only later-task danglers, incl. `specs/research.md`). Confirm header:
```bash
head -3 /home/openclaw/second-brain/.agents/skills/decompose-question.md
```
Expected: `# Skill: Decompose Question`, blank, `**Used in**: …`.

- [ ] **Step 3: Read-review** — the ≤5 cap is explicit; output names `CHECKLIST` + `INITIAL_LEADS` with `type` ∈ {question,source,entity} matching the frontier schema.

- [ ] **Step 4: Commit**
```bash
cd /home/openclaw/second-brain && git add .agents/skills/decompose-question.md && \
git commit -m "Add decompose-question skill (driving question -> checklist + leads)"
```

---

### Task 3: `skills/synthesize-research-note.md`

**Files:**
- Create: `.agents/skills/synthesize-research-note.md`

**Interfaces:**
- Consumes: the finalized session's `checklist` (with coverage + source notes) and `findings`.
- Produces: a `#research` note answering the driving question; consumed by `specs/research.md` finalize.

- [ ] **Step 1: Write the file** `.agents/skills/synthesize-research-note.md`:
```markdown
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
```

- [ ] **Step 2: Verify** — **VERIFY-REFS**. Confirm header format (`# Skill: Synthesize Research Note` + `**Used in**:`).

- [ ] **Step 3: Read-review** — the note is checklist-structured, cites source notes, tags `#research`, and has the honest `## Open` rule.

- [ ] **Step 4: Commit**
```bash
cd /home/openclaw/second-brain && git add .agents/skills/synthesize-research-note.md && \
git commit -m "Add synthesize-research-note skill (checklist + findings -> research note)"
```

---

### Task 4: `specs/research.md` (the session orchestrator)

The keystone — start / advance-one-hop / terminate / finalize, plus the seed queue.

**Files:**
- Create: `.agents/specs/research.md`

**Interfaces:**
- Consumes: `Agent Research Log`, `skills/decompose-question.md`, `skills/synthesize-research-note.md`, the `search-*` skills, the fetch chain (`skills/fetch-url.md` + extractors via `skills/parse-content.md`), `specs/source-note.md`, `skills/create-atomic.md`, `skills/link-notes.md`, `skills/update-moc.md`, `Agent Interest Model`, and the question sources (`specs/daily-suggestions.md` questions, `Agent Concept Gaps`, `skills/unresolved-threads.md`, `#stub` notes).
- Produces: one advanced hop (or a started/finalized session) per call; consumed by `skills/action-router.md` `EXPLORE`.

- [ ] **Step 1: Write the file** `.agents/specs/research.md`:
```markdown
# Spec: Research (Multi-Hop)

**Trigger**: The `EXPLORE` action from `skills/action-router.md` (Phase 4 ACT). One call = one hop. Subsystem #3; fills the `EXPLORE` socket.

Question-anchored, incremental. Exactly ONE active session at a time (in `Agent Research Log`). Adds no new fetching primitives — orchestrates existing skills. Bounds: checklist ≤5, hop_budget 12, saturation 3, frontier cap 20, 1 primary fetch/hop.

## On call

Read `Agent Research Log`. If there is an **active session** → do "Advance one hop". Else → do "Start a session".

## Start a session

1. **Fill the queue** (if empty): harvest open questions — `## Question for Today` (daily notes), High-priority `Agent Concept Gaps` (as "What is X?"), `skills/unresolved-threads.md`, `#stub` notes. Weight each by its topic's `Weight` in `Agent Interest Model`, then priority/age → `## Queue` (highest first). If `EXPLORE` named a focus topic, prefer the top queue question tied to it.
2. Pop the top queued question → `## Active Session` (`Status: active`, `Hops: 0/12`, `Saturation: 0/3`).
3. `skills/decompose-question.md` → `### Checklist` (≤5, all `[ ]`) + `### Frontier` (the `INITIAL_LEADS`, `Status: open`).
4. Stop (that was the hop).

## Advance one hop

1. **Pick the best lead**: from open `### Frontier` leads, highest `Score` (primarily fills an OPEN checklist item; then source authority/recency; minus hop-distance). If no open lead → treat as saturation.
2. **Expand by `Type`**:
   - `question` → call the `search-*` skills for the sub-question; fetch the top candidate via `skills/parse-content.md` Part B / `skills/fetch-url.md`.
   - `source` → fetch it; harvest its citations/outbound links as new `source`-leads.
   - `entity` → search/fetch the entity; harvest co-occurring named concepts + the source's own references as new `entity`-leads (from the fetched content only — no new external KB).
3. **Source note**: create one for the fetched doc (`specs/source-note.md`); dedup — skip any lead whose normalized URL is in `### Explored` or already has a non-stub source note (same guard as `loop.md` Phase 4 FETCH). Add the lead to `### Explored`, set its Frontier `Status: done`.
4. **Extract**: (a) findings answering OPEN checklist items → `### Findings` (each `— [[Source Note]] (sub-q N)`); flip a checklist item to `[x]` when it gains a source-backed finding. (b) new leads → `### Frontier` (scored, `open`), deduped; keep only the top 20 by Score.
5. **Update counters**: `Hops` +1; `Saturation` +1 if no new answer-relevant finding this hop, else reset to 0.
6. **Check termination** (in order): all checklist `[x]` → `Status: answered`; `Hops ≥ 12` → `Status: budget`; `Saturation ≥ 3` → `Status: saturated`. If terminated → **Finalize**. Else stop.

## Finalize

1. `skills/synthesize-research-note.md` → write the research note (checklist-structured, cites the session's source notes, `#research`; `## Open` lists any `[ ]` items).
2. Spin-offs: key concepts → `skills/create-atomic.md`; wire the research note + atomics into the graph via `skills/link-notes.md` / `skills/update-moc.md`.
3. **Mark the origin answered**: resolve the `Agent Concept Gaps` row / annotate the daily-note question with `[[<research note>]]` / fill the stub.
4. **Tangential questions** uncovered during the session → append to `## Queue` as future seeds.
5. Move the session to `## Completed` (`| Date | Question | [[Research Note]] |`); clear `## Active Session` to `*(none)*`.

## Constraints

- One active session; never start a second.
- ≤1 primary fetch per hop; ≤12 hops/session; frontier ≤20 leads.
- No uncited findings; honest `## Open` on partial finalize.
- If a search/fetch errors, drop that lead and stop the hop — never abort the loop.
```

- [ ] **Step 2: Verify** — **VERIFY-REFS**. `specs/research.md`'s references (decompose-question, synthesize-research-note, search-*, parse-content, fetch-url, source-note, create-atomic, link-notes, update-moc) must all resolve (only `skills/action-router.md`/`loop.md` back-refs are unaffected). Expect **only** any not-yet-created danglers = none (all referenced files exist). Confirm header:
```bash
head -3 /home/openclaw/second-brain/.agents/specs/research.md
grep -c "Active Session\|Advance one hop\|Finalize\|hop_budget 12\|≤5" /home/openclaw/second-brain/.agents/specs/research.md
```

- [ ] **Step 3: Read-review** — start/advance/finalize are unambiguous; the bounds (≤5, 12, 3, 20, 1) match Global Constraints; termination order is answered→budget→saturation; frontier `Type` values match the Research Log schema; dedup reuses the FETCH guard.

- [ ] **Step 4: Commit**
```bash
cd /home/openclaw/second-brain && git add .agents/specs/research.md && \
git commit -m "Add research spec (multi-hop question-anchored session orchestrator)"
```

---

### Task 5: Wire `EXPLORE` into the loop + surface research notes

Resolves the remaining references. VERIFY-REFS must be fully clean after this task.

**Files:**
- Modify: `.agents/skills/action-router.md` (`EXPLORE` delegates to `specs/research.md`)
- Modify: `.agents/loop.md` (Phase 4 ACT executes an `EXPLORE` item as one research hop)
- Modify: `.agents/specs/daily-suggestions.md` (surface newly-finalized research notes)

**Interfaces:**
- Consumes: `specs/research.md`.

- [ ] **Step 1: action-router `EXPLORE` delegates** — in `.agents/skills/action-router.md`, change the `EXPLORE` entry (currently "light touch / EXPLORE — reserved for the exploration subsystem" and "`EXPLORE` → no-op") to: "`EXPLORE` → run `specs/research.md` (advance the active research session by one hop, or start one for a top open question tied to this topic)." Remove the "no-op / deferred" wording.

- [ ] **Step 2: loop executes the hop** — in `.agents/loop.md` Phase 4 (ACT), add to the action list handling: "**EXPLORE**: run `specs/research.md` for exactly one hop (start/advance/finalize the active session)." Keep the ≤20 cap (an `EXPLORE` counts as one action).

- [ ] **Step 3: surface research notes** — in `.agents/specs/daily-suggestions.md`, in the `### What's New` step, add: "Include any research notes finalized today (from `Agent Research Log` `## Completed`, dated today) as `- [[Research Note]] · research — answers: <driving question>`."

- [ ] **Step 4: Verify**
```bash
grep -n "research.md" /home/openclaw/second-brain/.agents/skills/action-router.md /home/openclaw/second-brain/.agents/loop.md
cd /home/openclaw/second-brain/.agents && grep -rhoE '\b(skills|specs|context)/[A-Za-z0-9_-]+(/[A-Za-z0-9_-]+)*\.md' . | sort -u | while read -r f; do [ -f "$f" ] || echo "DANGLING: $f"; done; echo "VERIFY-REFS done"
```
Expected: `research.md` referenced in action-router + loop; **VERIFY-REFS fully clean** (zero DANGLING). Also confirm no "no-op"/"deferred" remains on EXPLORE:
```bash
grep -ni "explore.*no-op\|explore.*deferred\|reserved for the exploration" /home/openclaw/second-brain/.agents/skills/action-router.md || echo "(clean)"
```

- [ ] **Step 5: Read-review** — the loop reads coherently: action-router emits `EXPLORE` for a mature topic → Phase 4 runs one research hop → finalized notes surface in *What's New*. `EXPLORE` still counts as one action against the ≤20 cap; no contradiction with the existing action vocabulary.

- [ ] **Step 6: Commit + push**
```bash
cd /home/openclaw/second-brain && \
git add .agents/skills/action-router.md .agents/loop.md .agents/specs/daily-suggestions.md && \
git commit -m "Wire EXPLORE to the research agent + surface research notes" && \
git push
```

---

## Self-Review (completed by plan author)

**Spec coverage:** session model + `Agent Research Log` schema → T1; decompose/checklist → T2; synthesize/output note → T3; hop cycle + termination + seeding/queue + finalize/spin-offs/mark-answered/tangential → T4; `EXPLORE` socket wiring + loop execution + surfacing → T5. All-three hop types (question/source/entity) → T4 Advance step 2. Interest-weighted seed prioritization → T4 Start step 1. Bounds (≤5/12/3/20/1) → Global Constraints + T4. Non-goals (one session, no new primitives, only drains existing questions) honored — no tasks violate them.

**Placeholder scan:** no TBD/TODO; every new file has complete content; modifications give exact old→new text; every command has an expected result.

**Consistency:** the `Agent Research Log` schema (`## Active Session`/`### Checklist`/`### Frontier`/`### Explored`/`### Findings`/`## Queue`/`## Completed`; Frontier `Type` ∈ {question,source,entity}) is identical in T1 and T4; `CHECKLIST`/`INITIAL_LEADS` names + `type` values match between T2 and T4; the bounds (5/12/3/20/1) and termination order (answered→budget→saturation) are identical in Global Constraints and T4; `#research` tag + checklist-structured note consistent between T3 and T4; `EXPLORE` is the sole entry point (T4 Trigger, T5 wiring).
