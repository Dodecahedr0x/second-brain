# Statistical Steering Model — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the vault steer its autonomous work from unstructured writing — infer focus + interests statistically, hold them in a co-owned `Agent Interest Model` table, correct via positive-confirmation check-ins, and route effort into fetching/connecting/enhancing by weight and graph-state.

**Architecture:** A persistent, user-editable `Agent Interest Model.md` table is the single source of truth. Each loop run: an updater parses the table (honoring user edits/`pin`/`mute`) and applies decay + fresh statistical signal + check-in ticks; an action-router turns the weighted portfolio into per-topic work; discovery and daily/weekly/monthly notes consume the model. All logic lives in `.agents/` markdown read by the LLM agent at runtime.

**Tech Stack:** Markdown instruction files under `.agents/`. No new runtime deps. Builds on the existing loop (`loop.md`), discovery (`specs/discovery.md`), `derive-topics`, daily/weekly/monthly specs, and the agent-managed-note convention.

## Global Constraints

- **Pure instruction authoring.** Deliverables are `.agents/*.md` files read by the LLM agent; there is no compiler/unit-test layer. Verification is structural (file exists, format matches existing skills/specs, cross-references resolve) plus read-review.
- **Brevity is a repo law** (`AGENTS.md`): terse, lists over prose, one concern per file. Match existing skill/spec terseness.
- **Skill file format:** start with `# Skill: <Name>` then `**Used in**: …`. **Spec format:** `# Spec: <Name>` then `**Trigger**: …`.
- **Steering is purely statistical** — recency + repetition + volume; no intent-parsing of prose (the only structured user affordances are check-in ticks and the table's `pin`/`mute`/weight edits).
- **`Agent Interest Model.md` is the single source of truth** for topic weights; discovery and the action-router read it.
- **Co-ownership rule:** the updater must (a) start from the user's edited weights, (b) never change a `pin`ned row, (c) hold `mute`d rows at weight 0 and never re-add them, (d) adopt user-added rows as `established`.
- **Check-ins are positive-confirmation only:** checked = keep/promote/focus; unchecked = neutral; explicit `drop` = retire (`mute`). A skipped check-in changes nothing.
- **Interest Model table schema (exact, used by every task):**
  `| Topic | Status | Weight | Focus | Last seen | Flags |`
  — `Status` ∈ {`probationary`,`established`}; `Weight` two-decimal 0.00–1.00; `Focus` ∈ {`★`,`–`}; `Last seen` `YYYY-MM-DD`; `Flags` space-separated subset of {`pin`,`mute`} or empty.
- **Concrete lifecycle defaults** (the spec's "open parameters", fixed here so the build is deterministic; keep them together so they can be tuned in one place — state them in `update-interest-model.md`):
  - novelty boost: first-seen concept enters `probationary` at `Weight 0.20`.
  - promotion: a `probationary` topic seen on ≥2 distinct days (or in ≥2 notes) → `established`.
  - probationary decay: ×0.80 per idle day; drop the row when `Weight` < 0.05.
  - established decay: ×0.97 per idle day, floored at `Weight 0.10` (never removed).
  - focus: a topic whose signal appeared ≥2× in the last 3 days, or whose weight rose in the last 3 days → `Focus ★`; focus applies a ×1.5 allocation multiplier.
  - faded = `established` with `Last seen` 7–21 days ago; dormant = `established` with `Last seen` > 21 days ago.

## Reusable Verification Command

**VERIFY-REFS** — confirms no instruction file references a non-existent skill/spec/context file:
```bash
cd /home/openclaw/second-brain/.agents && \
grep -rhoE '\b(skills|specs|context)/[A-Za-z0-9_-]+(/[A-Za-z0-9_-]+)*\.md' . | sort -u | \
while read -r f; do [ -f "$f" ] || echo "DANGLING: $f"; done; echo "VERIFY-REFS done"
```
Expected: only `VERIFY-REFS done`. During the plan, references to files created by *later* tasks are expected to dangle until those tasks land; the final task's verify must be fully clean.

---

### Task 1: Register `Agent Interest Model` (sixth agent-managed note)

The steering state store — lands first because everything reads/writes it.

**Files:**
- Modify: `.agents/context/agent-notes.md` (Standard Notes table row)
- Modify: `.agents/skills/agent-notes.md` (template + "five" → "six")
- Modify: `.agents/AGENTS.md` (Phase 0 step 3: "five" → "six")
- Modify: `.agents/context/boundaries.md` (Scope Creep list: "five" → "six")

**Interfaces:**
- Produces: the agent-managed note **`Agent Interest Model`** with the exact schema from Global Constraints and a `pin`/`mute` command legend. Consumed by every later task.

- [ ] **Step 1: Add the note to the Standard Notes table** — in `.agents/context/agent-notes.md`, add after the `Agent Discovery Log` row:
```markdown
| `Agent Interest Model` | Co-owned topic table (weights, status, focus) steering autonomous effort |
```

- [ ] **Step 2: Add the template + update the count** in `.agents/skills/agent-notes.md`.
  - Change `…the five agent-managed vault notes.` → `…the six agent-managed vault notes.`
  - Change `…check that all five notes exist…` → `…check that all six notes exist…`
  - Append this section:
```markdown

---

## Agent Interest Model

**Purpose**: Single source of truth for what the vault is into. Co-owned: the agent rewrites it each run (`skills/update-interest-model.md`); the user edits it to override. Read by `specs/discovery.md` and `skills/action-router.md`.

### Template

```markdown
---
agent_managed: true
---

# Agent Interest Model
<!-- Edit freely. Commands (Flags column):
       pin  = freeze this row; the agent won't change its weight/status.
       mute = force weight 0 and never re-add, even if you keep writing about it.
     Adjust a Weight directly and the agent starts its update from your number.
     Add a row to inject an interest; the agent adopts it as established. -->

| Topic | Status | Weight | Focus | Last seen | Flags |
|-------|--------|--------|-------|-----------|-------|

---
*Agent-maintained, user-editable.* #agent-system
```

### Update

Written only by `skills/update-interest-model.md` (parse-then-update). Never overwrite a `pin`ned row; hold `mute`d rows at `Weight 0.00`; adopt user-added rows as `established`.
```

- [ ] **Step 3: Update Phase 0 count** in `.agents/AGENTS.md` — `Verify all five agent-managed notes exist…` → `Verify all six agent-managed notes exist…`.

- [ ] **Step 4: Update boundaries** in `.agents/context/boundaries.md` — `3. One of the five agent-managed notes, OR` → `3. One of the six agent-managed notes, OR`.

- [ ] **Step 5: Verify**
```bash
cd /home/openclaw/second-brain && \
grep -rn "five agent-managed\|all five notes\|five agent-managed vault" .agents && echo "--- should be empty above ---"; \
grep -rln "Agent Interest Model" .agents
```
Expected: no "five agent-managed" matches remain; `Agent Interest Model` appears in `context/agent-notes.md` and `skills/agent-notes.md`. Then run **VERIFY-REFS** (expect clean).

- [ ] **Step 6: Read-review** — the new section matches the other agent-note sections (frontmatter `agent_managed: true`, `#agent-system` footer, terse) and the table schema matches Global Constraints exactly.

- [ ] **Step 7: Commit**
```bash
cd /home/openclaw/second-brain && git add .agents/ && \
git commit -m "Register Agent Interest Model (sixth agent-managed note)"
```

---

### Task 2: `skills/update-interest-model.md` (the steering engine)

**Files:**
- Create: `.agents/skills/update-interest-model.md`

**Interfaces:**
- Consumes: recent daily notes + new notes (raw concept signal); the current `Agent Interest Model` table; optional check-in ticks passed by the caller as `{promote:[…], focus:[…], refresh:[…], drop:[…]}`.
- Produces: the rewritten `Agent Interest Model` table; defines the **tick → state mapping** reused by `skills/check-in.md`.

- [ ] **Step 1: Write the file** `.agents/skills/update-interest-model.md`:
```markdown
# Skill: Update Interest Model

**Used in**: Loop OBSERVE/ORIENT — refresh `Agent Interest Model` each run from writing + check-in ticks.

Parse-then-update the co-owned `Agent Interest Model` table. Purely statistical; the only structured inputs are the user's table edits and check-in ticks.

## Parameters (tune here)

- novelty boost: first-seen concept → `probationary`, `Weight 0.20`.
- promotion: `probationary` seen on ≥2 distinct days or in ≥2 notes → `established`.
- probationary decay: ×0.80 per idle day; drop row when `Weight` < 0.05.
- established decay: ×0.97 per idle day, floor `Weight 0.10` (never removed).
- focus: signal ≥2× in last 3 days, or weight rose in last 3 days → `Focus ★` (×1.5 allocation multiplier, applied by the action-router).

## Step 1: Parse (honor the user)

Read `Agent Interest Model`. For each row capture `Topic, Status, Weight, Focus, Last seen, Flags`. Treat the parsed `Weight` as the **starting value** for this run (user edits win). Note `pin` and `mute` rows and any user-added rows (adopt as `established`).

## Step 2: Extract fresh signal

From recent daily notes (user zone only) + new notes since `last_run_timestamp`, extract concepts (as in `skills/derive-topics.md`: `[[wikilinks]]`, `**bold**`, capitalised proper nouns, recurring noun phrases; skip tasks/URLs/agent zones). Count per-concept appearances and distinct days.

## Step 3: Update each topic

- **Existing, unpinned, unmuted**: if it got fresh signal, bump weight toward 1.0 and set `Last seen` = today; else decay per its status. Apply promotion if criteria met. Set `Focus` per the focus rule.
- **Muted**: hold `Weight 0.00`; do not re-add signal.
- **Pinned**: leave `Weight`, `Status`, `Flags` exactly as the user set; only `Last seen`/`Focus` may update.
- **New concept (never in the table)**: add a `probationary` row at `Weight 0.20`, `Last seen` today.

## Step 4: Apply check-in ticks

If the caller passed ticks `{promote, focus, refresh, drop}` (from `skills/check-in.md` read-back), apply:

| Tick | Effect |
|------|--------|
| `promote` (daily "Keep tracking") | `probationary` → `established` |
| `focus` (daily "Focus?") | set `Focus ★` + weight boost |
| `refresh` (weekly "Still into") | set `Last seen` = today; restore weight toward its pre-decay level |
| `drop` (any "drop") | set `Flags += mute`, `Weight 0.00` |

## Step 5: Write back

Rewrite the table sorted by `Weight` desc. Keep `pin`/`mute` rows. Never remove an `established` row (floor 0.10); drop only decayed `probationary` rows (< 0.05, unpinned).

## Guardrails

- Purely statistical extraction; never infer intent from prose.
- The user's parsed weights and `pin`/`mute` always take precedence over the statistical update.
```

- [ ] **Step 2: Verify** — run **VERIFY-REFS** (expect only `DANGLING: skills/check-in.md`, `skills/action-router.md` — created later; note them). Confirm header:
```bash
head -3 /home/openclaw/second-brain/.agents/skills/update-interest-model.md
```
Expected: `# Skill: Update Interest Model`, blank, `**Used in**: …`.

- [ ] **Step 3: Read-review** — the tick→state table matches the spec's Section 3 mapping; the co-ownership rules (pin/mute/user-weight-wins/adopt-added) are all present; parameters are concrete.

- [ ] **Step 4: Commit**
```bash
cd /home/openclaw/second-brain && git add .agents/skills/update-interest-model.md && \
git commit -m "Add update-interest-model steering engine"
```

---

### Task 3: `skills/check-in.md` (generate + read-back)

**Files:**
- Create: `.agents/skills/check-in.md`

**Interfaces:**
- Consumes: `Agent Interest Model` + a `tier` ∈ {`daily`,`weekly`,`monthly`}.
- Produces: (a) a `## Check-in` markdown block (positive-confirmation checkboxes) for that tier; (b) a read-back that parses ticks from an existing check-in and returns `{promote, focus, refresh, drop}` for `skills/update-interest-model.md`.

- [ ] **Step 1: Write the file** `.agents/skills/check-in.md`:
```markdown
# Skill: Check-in

**Used in**: daily-note pre-generation + `specs/weekly-review.md` / `specs/monthly-review.md` (generate); loop OBSERVE (read-back).

Generate positive-confirmation check-in questions from `Agent Interest Model`, and read the user's ticks back into steering updates. Which topics get asked depends on the `tier`.

## Tiers (which topics to ask about)

| tier | topics asked | questions |
|------|--------------|-----------|
| daily | `Focus ★` topics + `probationary` topics | "Focus this week?" (focus), "Keep tracking?" (probationary) |
| weekly | faded (`established`, `Last seen` 7–21d) | "Still into these?" (refresh) |
| monthly | dormant (`established`, `Last seen` > 21d) | "Revisit? / Drop?" (refresh / drop) |

Ask at most 4 items per check-in (highest-weight first). Omit the section if none qualify.

## Generate

Emit:
```markdown
## Check-in
Focus this week?   - [ ] Topic A   - [ ] Topic B
Keep tracking?     - [ ] Topic C (new)
                   - [ ] drop Topic E
```
Only render the rows relevant to the tier. Every box is **positive-confirmation** (checked = yes); `drop` boxes are the only negative. Leave an HTML comment `<!-- steering: unprocessed -->` at the end of the section.

## Read-back

Given a `## Check-in` section not yet marked processed:
- Collect checked boxes; map each to `{promote | focus | refresh | drop}` by its question label (see the daily/weekly/monthly rows above).
- Return the four lists for `skills/update-interest-model.md` Step 4.
- Mark the section processed by replacing `<!-- steering: unprocessed -->` with `<!-- steering: processed YYYY-MM-DD -->`. **Do not un-tick the user's boxes** — their marks stay visible; the processed marker prevents re-applying.

## Guardrails

- Unchecked = neutral; never treat a skipped box as a negative.
- Read-back applies a section at most once (guard on the processed marker).
```

- [ ] **Step 2: Verify** — **VERIFY-REFS** (expect only the later-task danglers). Confirm the tier table names all three tiers and the four tick types match `update-interest-model.md` Step 4 exactly (`promote/focus/refresh/drop`).

- [ ] **Step 3: Read-review** — positive-confirmation is explicit; the processed-marker (not un-ticking) is present; ≤4 items rule present.

- [ ] **Step 4: Commit**
```bash
cd /home/openclaw/second-brain && git add .agents/skills/check-in.md && \
git commit -m "Add check-in skill (generate + read-back)"
```

---

### Task 4: `skills/action-router.md` (portfolio → work)

**Files:**
- Create: `.agents/skills/action-router.md`

**Interfaces:**
- Consumes: `Agent Interest Model` (weighted portfolio).
- Produces: a per-cycle action plan — a list of `{topic, action}` where `action` ∈ {`FETCH`,`ATOMIZE`,`CONNECT`,`ENHANCE`,`EXPLORE`} — plus a reserved baseline-maintenance slice. Consumed by `loop.md` Phase 3 (DECIDE).

- [ ] **Step 1: Write the file** `.agents/skills/action-router.md`:
```markdown
# Skill: Action Router

**Used in**: Loop Phase 3 (DECIDE) — turn the Interest Model portfolio into per-topic work.

Rule: **weight decides how much, graph-state decides what kind.**

## Step 1: Split the cycle budget

Given the run's total action budget (from `loop.md` Phase 3, ≤20 as today):
- **Baseline maintenance**: reserve ~20% (min 1 action) for whole-graph tidying not tied to a hot topic — orphan-linking, dangling-gap fills, stub cleanup.
- **Topic work**: the rest, allocated across live topics **proportional to `Weight` × focus multiplier** (`Focus ★` → ×1.5). Skip `mute`d (weight 0) topics. Low-weight topics may get 0 actions this cycle (touched a later cycle) — never cut off.

## Step 2: Per topic, pick the action by graph-state

For each topic receiving effort, inspect its notes in the vault:

| Topic state | Action |
|-------------|--------|
| Thin/new — 0–1 notes, or an open `Agent Concept Gaps` row | `FETCH` (discovery on the topic) then `ATOMIZE` |
| Disconnected — notes exist but < 2 outbound wikilinks, or absent from any MOC | `CONNECT` (add wikilinks / MOC placement) |
| Stale/shallow — youngest note > 30 days old, or `## References` has < 2 entries | `ENHANCE` (enrich, add sources, deepen) |
| Mature/well-woven — none of the above | light touch, or `EXPLORE` (open questions) — reserved for the exploration subsystem |

## Output

```
ACTION_PLAN:
- topic: <T>  action: FETCH|ATOMIZE|CONNECT|ENHANCE|EXPLORE
maintenance: <N reserved actions>
```

## Guardrails

- Respect the Phase 3 cap (≤20 actions / oldest-first). Never exceed the split budget.
- `FETCH` delegates to `specs/discovery.md`; `CONNECT`/`ENHANCE`/`ATOMIZE` use the existing `skills/link-notes.md` / `skills/create-atomic.md` / `skills/update-moc.md`.
```

- [ ] **Step 2: Verify** — **VERIFY-REFS** (the referenced `skills/link-notes.md`, `skills/create-atomic.md`, `skills/update-moc.md`, `specs/discovery.md`, `Agent Concept Gaps` all exist; expect only later-task danglers). Confirm header format.

- [ ] **Step 3: Read-review** — the graph-state table's four categories are unambiguous with concrete thresholds; the budget split and focus multiplier match the spec.

- [ ] **Step 4: Commit**
```bash
cd /home/openclaw/second-brain && git add .agents/skills/action-router.md && \
git commit -m "Add action-router skill (portfolio + graph-state -> work)"
```

---

### Task 5: Daily-note three-zone structure + check-in wiring

**Files:**
- Modify: `.agents/context/vault-structure.md` (document the three zones + Check-in)
- Modify: `.agents/specs/daily-suggestions.md` (place the Check-in as zone ②; generate via `skills/check-in.md`)

**Interfaces:**
- Consumes: `skills/check-in.md` (daily tier).
- Produces: the daily note's zone-② `## Check-in`.

- [ ] **Step 1: Document the three zones** — in `.agents/context/vault-structure.md`, replace the daily-note "two zones" description with three, adding the Check-in between user input and the agent zone:
```markdown
Daily notes have three zones. The user writes freely in the **input zone** (top); the agent owns the **Check-in** (positive-confirmation steering questions) and the **agent zone** (replaced each run).

```markdown
YYYY-MM-DD

- User bullet 1
- User bullet 2 with a [[wikilink]]

## Check-in
Focus this week?   - [ ] Topic A
Keep tracking?     - [ ] Topic C (new)
<!-- steering: unprocessed -->

---
## Agent — YYYY-MM-DD HH:MM
### What's New
...
```
```

- [ ] **Step 2: Wire Check-in generation** — in `.agents/specs/daily-suggestions.md`, add a step (before the agent-zone assembly) that generates/refreshes the daily `## Check-in` via `skills/check-in.md` (tier=daily) from `Agent Interest Model`, placed between the user input zone and the `---`/agent zone. Note: on today's live note this only (re)generates if the section is still `unprocessed` and untouched (see Task 6 non-clobber rule).

- [ ] **Step 3: Verify** — **VERIFY-REFS**. Confirm:
```bash
grep -n "Check-in\|check-in.md" /home/openclaw/second-brain/.agents/specs/daily-suggestions.md /home/openclaw/second-brain/.agents/context/vault-structure.md
```
Expected: matches in both.

- [ ] **Step 4: Read-review** — the three-zone order (input → Check-in → agent zone) is consistent across both files; the Check-in sits above the `---` agent-zone separator.

- [ ] **Step 5: Commit**
```bash
cd /home/openclaw/second-brain && \
git add .agents/context/vault-structure.md .agents/specs/daily-suggestions.md && \
git commit -m "Daily note: three zones with agent-authored Check-in"
```

---

### Task 6: Weekly/monthly check-ins + daily wikilinks

**Files:**
- Modify: `.agents/specs/weekly-review.md` (faded check-in)
- Modify: `.agents/specs/monthly-review.md` (dormant check-in)

**Interfaces:**
- Consumes: `skills/check-in.md` (weekly/monthly tiers).
- Produces: a `## Check-in` in each review note + a note that the day's daily note wikilinks to the review note.

- [ ] **Step 1: Weekly faded check-in** — in `.agents/specs/weekly-review.md`, add to the Output Template a `## Check-in` section and a step generating it via `skills/check-in.md` (tier=weekly). Add a step: "The day's daily note gets a `[[Weekly Review — YYYY-W##]]` wikilink in its agent zone."

- [ ] **Step 2: Monthly dormant check-in** — in `.agents/specs/monthly-review.md`, add a `## Check-in` section + generation step via `skills/check-in.md` (tier=monthly), and the `[[Monthly Review — YYYY-MM]]` daily-note wikilink step.

- [ ] **Step 3: Verify** — **VERIFY-REFS**. Confirm both reference `skills/check-in.md`:
```bash
grep -n "check-in.md\|Check-in" /home/openclaw/second-brain/.agents/specs/weekly-review.md /home/openclaw/second-brain/.agents/specs/monthly-review.md
```

- [ ] **Step 4: Read-review** — weekly asks faded, monthly asks dormant (matching `check-in.md` tiers); positive-confirmation preserved.

- [ ] **Step 5: Commit**
```bash
cd /home/openclaw/second-brain && \
git add .agents/specs/weekly-review.md .agents/specs/monthly-review.md && \
git commit -m "Weekly/monthly review: tiered check-ins + daily wikilink"
```

---

### Task 7: Discovery + derive-topics read the Interest Model

**Files:**
- Modify: `.agents/specs/discovery.md` (weight-allocate from the Interest Model)
- Modify: `.agents/skills/derive-topics.md` (feed / defer to the Interest Model)

**Interfaces:**
- Consumes: `Agent Interest Model` weights.
- Produces: discovery topic selection + per-topic budget driven by `Weight × focus`.

- [ ] **Step 1: Discovery reads the model** — in `.agents/specs/discovery.md` Step 1 (Derive Topics) and Step 2 (Pick Topics), replace the ad-hoc `derive-topics(mode)` selection with: "Read `Agent Interest Model`; the candidate topics are its rows; allocate the discovery cap across them **proportional to `Weight` × focus multiplier** (`Focus ★` → ×1.5), skipping `mute`d rows. `pass` still sets the `since_date` window (active/faded/dormant map to the Interest Model's focus/faded/dormant topics)."

- [ ] **Step 2: derive-topics defers to the model** — in `.agents/skills/derive-topics.md`, add a note at top: "Concept extraction here feeds `skills/update-interest-model.md`, which owns the persistent `Agent Interest Model`. Callers that need current topics/weights read `Agent Interest Model`, not this skill's ephemeral output." Keep the extraction rules (they're reused by the updater).

- [ ] **Step 3: Verify** — **VERIFY-REFS**. Confirm:
```bash
grep -n "Agent Interest Model\|Weight" /home/openclaw/second-brain/.agents/specs/discovery.md
```
Expected: discovery now references the Interest Model + weight allocation.

- [ ] **Step 4: Read-review** — discovery's caps still hold (the weight allocation distributes *within* the existing per-pass cap, not on top of it); no contradiction with the discovery cap table.

- [ ] **Step 5: Commit**
```bash
cd /home/openclaw/second-brain && \
git add .agents/specs/discovery.md .agents/skills/derive-topics.md && \
git commit -m "Discovery + derive-topics driven by Agent Interest Model weights"
```

---

### Task 8: Loop integration (update → route → pre-generate)

Ties the skills into the loop and resolves the remaining forward references. VERIFY-REFS must be fully clean after this task.

**Files:**
- Modify: `.agents/loop.md` (OBSERVE/ORIENT: update model + read-back; DECIDE: action-router; Phase 6: pre-generate tomorrow's note)

**Interfaces:**
- Consumes: `skills/update-interest-model.md`, `skills/check-in.md`, `skills/action-router.md`.

- [ ] **Step 1: Steering update in ORIENT** — in `.agents/loop.md` Phase 2 (ORIENT), add a step: "Read back today's daily-note `## Check-in` ticks via `skills/check-in.md`, then run `skills/update-interest-model.md` (fresh signal + ticks) to refresh `Agent Interest Model` before planning."

- [ ] **Step 2: Action routing in DECIDE** — in Phase 3 (DECIDE), add: "Build the action plan with `skills/action-router.md` over the current `Agent Interest Model` portfolio (topic work by weight × focus + the reserved baseline-maintenance slice); the resulting `{topic, action}` items become the numbered contract, subject to the existing ≤20 cap / oldest-first rule."

- [ ] **Step 3: Pre-generate tomorrow's note in Phase 6** — in Phase 6 (CLEANUP), add (near the daily-rollup step, but running **every** cycle): "Ensure **tomorrow's** daily note exists with an empty input zone and a `## Check-in` (via `skills/check-in.md`, tier=daily) from the current `Agent Interest Model`. Idempotent & non-clobbering: create if missing; if it exists but is untouched (empty input, no ticked boxes, `steering: unprocessed`) refresh its Check-in; once the user has written or ticked anything, leave it. On weekly/monthly creation days the review note carries its own tier check-in and the daily note wikilinks to it."

- [ ] **Step 4: Verify** — run **VERIFY-REFS**; expected **fully clean** (all of `update-interest-model.md`, `check-in.md`, `action-router.md` now exist). Confirm wiring:
```bash
grep -n "update-interest-model.md\|action-router.md\|check-in.md" /home/openclaw/second-brain/.agents/loop.md
```
Expected: all three referenced across ORIENT / DECIDE / Phase 6.

- [ ] **Step 5: Read-review** — the loop reads coherently end to end: ORIENT refreshes the model (incl. read-back) → DECIDE routes it → ACT executes → Phase 6 pre-generates tomorrow's Check-in; Phase numbering stays sequential; no contradiction with the existing discovery step (Phase 1) or daily-rollup (Phase 6).

- [ ] **Step 6: Final whole-feature check**
```bash
cd /home/openclaw/second-brain && for f in \
  .agents/skills/update-interest-model.md .agents/skills/check-in.md \
  .agents/skills/action-router.md; do [ -f "$f" ] && echo "OK $f" || echo "MISSING $f"; done
```
Expected: three `OK` lines. Then **VERIFY-REFS** fully clean.

- [ ] **Step 7: Commit + push**
```bash
cd /home/openclaw/second-brain && git add .agents/loop.md && \
git commit -m "Wire steering model into the loop (update -> route -> pre-generate)" && \
git push
```

---

## Self-Review (completed by plan author)

**Spec coverage:** steering engine + lifecycle/decay params → T2; steering note schema + co-ownership → T1/T2; portfolio weight×focus allocation → T4/T7; three-zone daily note → T5; positive-confirmation tiered check-ins → T3/T5/T6; pre-generation (idempotent, non-clobbering) → T8; read-back (processed marker, no un-tick) → T3/T8; action router (weight×graph-state, baseline slice, #2/#3 sockets) → T4; discovery weight-allocation + derive-topics refactor → T7; sixth agent-managed note registration → T1; loop integration → T8. Deferred subsystems (#2 deep maintenance, #3 exploration) are sockets only — no tasks, per spec.

**Placeholder scan:** no TBD/TODO; lifecycle values are concrete (Global Constraints + T2); every new skill has full content; modifications give exact insert/replace text; every command has an expected result.

**Consistency:** table schema `Topic|Status|Weight|Focus|Last seen|Flags` identical in T1/T2/T4/T7; tick types `promote/focus/refresh/drop` identical in T2 (Step 4) and T3; focus multiplier ×1.5 identical in T2/T4/T7; the `steering: unprocessed`/`processed` marker defined in T3 and used in T5/T8; `pin`/`mute` semantics identical across T1/T2/T4/T7.
