# Regenerable Agent Notes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every agent-created note a marked, flat, regenerable projection of ground truth — so deleting any agent notes lets the loop rebuild the same structure — while the daily note keeps only user content plus a single recap link.

**Architecture:** Instruction-file rework of an LLM agent harness (`.agents/*.md`, read at runtime — no compiled code). A three-class ownership marker (`user` / `agent_generated` / `agent_managed`, plus `agent_augmented` for user-edited agent notes) gates every write. The daily note's agent output moves into a derived `Recap YYYY-MM-DD` note; a single `specs/reconcile.md` engine (continuous in the loop, `mode=full-backfill` at setup) regenerates missing notes from ground-truth seeds, need-driven and idempotent.

**Tech Stack:** Markdown instruction files under `.agents/`; Bash (`scripts/setup.sh`, `scripts/run.sh`); the three existing harness tests (`tests/setup_test.sh`, `tests/run_test.sh`, `tests/retry_failed_test.sh`). No unit-test framework — verification is **structural**: VERIFY-REFS (no dangling skill/spec refs), targeted `grep` assertions on the instruction text, and the three bash tests.

## Global Constraints

Copied verbatim from `docs/superpowers/specs/2026-07-02-regenerable-agent-notes-design.md`. Every task implicitly includes these.

- **Ownership markers (frontmatter):** user note → *no* ownership tag; agent-generated (source/atomic/MOC/research/recap) → `agent_generated: true` + `agent_last_touched: <ISO ts>`; agent-owned state → `agent_managed: true` (in `Agent/`).
- **`agent_augmented: true`** — if an `agent_generated` note's real mtime is newer than its `agent_last_touched`, a human edited it: flip the tag, then **preserve/additive only** (never overwrite or regenerate).
- **Flat structure.** New agent notes are created flat at the vault root. Folders exist **only** for `Agent/` (state notes) and `Agent/Temp/` (scratch).
- **Recap note:** `Recap YYYY-MM-DD` (`agent_generated`, flat) absorbs the entire former daily agent zone — sections in order: **Check-in, What's New, Explore, Routines, Question for Today, New Notes**. The daily note's agent zone shrinks to a single `[[Recap YYYY-MM-DD]]` link; the recap (and link) are created if missing.
- **Recap lifecycle:** today's recap = working note (refreshed each run); a recap dated `< today` is **frozen** (never edited); a missing past recap whose daily note exists is regenerated **once**, then frozen; missing past daily note → log `RECAP_SKIPPED`, invent nothing.
- **Seed rule (existence test):** a source note should exist iff its URL is still in a note; an atomic note iff its concept still recurs; a research note iff its question is open; a recap iff its daily note exists. **Seed gone → not regenerated.**
- **Reconcile is need-driven:** touch a note only if missing-with-seed (regenerate once), a current working note, or a regular agent note with a *concrete available improvement*. Present-and-complete notes are left alone. Beyond the change set, at most **5** need-driven repairs per continuous run.
- **Two-phase creation:** synthesized notes collect raw facts into `Agent/Temp/` first, synthesize the real note, then discard the scratch; temp files are never linked from real notes.
- **Full-backfill idempotency:** fill gaps only; never duplicate a note; never clobber an `agent_augmented` note; never re-edit a complete past recap; never auto-move/rename/delete notes.
- **Migration:** new notes go flat; existing notes in legacy `Sources/ Atomic/ MOCs/ Research/` folders are still *read* (legacy-path fallback) but **never auto-moved**.
- **User content is read-only** (never annotate/append/rewrite user notes — the agent writes only its own notes and the daily note's single recap link).

### Standing verification (run at the end of every task)

```bash
cd /home/openclaw/second-brain
# 1. VERIFY-REFS — no dangling skill/spec/context references
( cd .agents && grep -rhoE '\b(skills|specs|context)/[A-Za-z0-9_-]+(/[A-Za-z0-9_-]+)*\.md' . \
  | sort -u | while read -r f; do [ -f "$f" ] || echo "DANGLING: $f"; done; echo "VERIFY-REFS done" )
# 2. Harness tests
for t in tests/setup_test.sh tests/run_test.sh tests/retry_failed_test.sh; do
  bash "$t" >/dev/null 2>&1 && echo "PASS $t" || echo "FAIL $t"; done
```
Expected every task: only `VERIFY-REFS done` (no `DANGLING:` lines) and `PASS` for all three tests.

---

## File Structure

**New files:**
- `.agents/skills/classify-note.md` — classify a note by ownership marker + detect user edits (mtime vs `agent_last_touched`); the single gate before any write.
- `.agents/skills/recap.md` — generate/update `Recap YYYY-MM-DD`; write the `[[Recap]]` link into the daily note; freeze past recaps.

**Modified files:**
- `.agents/context/vault-structure.md`, `.agents/context/boundaries.md`, `.agents/context/agent-notes.md` — codify the 3-class marker model, `agent_augmented`, flat layout, `Agent/` + `Agent/Temp/`.
- `.agents/skills/source-note.md`* / `parse-content.md` / `create-atomic.md` / `update-moc.md` / `research.md`* / `synthesize-research-note.md`* — flat placement + `agent_generated`/`agent_last_touched` stamps + legacy read fallback + duplicate guard + `classify-note` before rewrite. *(`source-note.md`, `research.md`, `synthesize-research-note.md` partially edited already — reconcile them.)*
- `.agents/skills/recap.md` consumers: `.agents/specs/daily-note.md`, `daily-pipeline.md`, `daily-suggestions.md`, `.agents/skills/check-in.md` — agent daily output → recap; daily note gets only the recap link; Check-in generated in and read back from the recap.
- `.agents/specs/reconcile.md` — reconcile draft revised to the recap model, `classify-note` integration, `Agent/Temp/` naming, per-class routing.
- `.agents/loop.md` — reconcile drives Phase 2–4; Phase 6 pre-generates tomorrow's recap.
- `.agents/skills/action-router.md` — actions route by note class.
- `scripts/setup.sh` — first-pass full-backfill call (already wired; verify only).

> Note: `.agents/specs/reconcile.md`, `.agents/specs/source-note.md`, `.agents/specs/research.md`, `.agents/skills/synthesize-research-note.md`, `.agents/context/vault-structure.md`, `.agents/context/boundaries.md`, `.agents/skills/agent-notes.md`, and `scripts/setup.sh` were edited mid-brainstorm toward a **folder-based** model. Where a task touches them, **reconcile to the flat/marker model** — do not assume a blank slate; read the current file first.

---

### Task 1: Ownership model in the context files

Establish the authoritative reference the rest of the plan builds on: the 3-class marker lattice, `agent_augmented`, flat layout, and the `Agent/` + `Agent/Temp/` folders. Reconcile the half-written folder-based content.

**Files:**
- Modify: `.agents/context/vault-structure.md`
- Modify: `.agents/context/boundaries.md`
- Modify: `.agents/context/agent-notes.md`

**Interfaces:**
- Produces (referenced by all later tasks): the ownership vocabulary — markers `agent_generated: true`, `agent_last_touched: <ISO ts>`, `agent_augmented: true`, `agent_managed: true`; the folders `Agent/` and `Agent/Temp/`; the rule "new agent knowledge notes are flat at root; legacy folder notes are read but never moved."

- [ ] **Step 1: Read the three files** to see the current (partly folder-based) content.

Run: `cd /home/openclaw/second-brain && sed -n '1,120p' .agents/context/vault-structure.md; echo ---; sed -n '1,40p' .agents/context/boundaries.md; echo ---; sed -n '1,30p' .agents/context/agent-notes.md`

- [ ] **Step 2: In `vault-structure.md`, make flat the rule and folders the exception.** Ensure an `## Ownership Markers` section states the 3-class lattice verbatim from Global Constraints, and that the structure section shows knowledge notes (source/atomic/MOC/research/recap) **flat at the root** with only `Agent/` and `Agent/Temp/` as folders. Remove any statement that *new* source/atomic/MOC/research notes must live in `Sources/ Atomic/ MOCs/ Research/`; replace with: those folders are **legacy read-only fallbacks** (existing notes there are still found, never auto-moved). Standardize scratch to `Agent/Temp/` (not `Agent/Temp/`). Add a one-line **Regenerability invariant** statement.

- [ ] **Step 3: In `boundaries.md`, align the forbidden/agent-owned rows to flat.** Keep the "user zone read-only" and "no auto-move/rename/delete" rows. Change any row that lists `Sources/ Atomic/ MOCs/ Research/` as agent-owned *folders* so it reads: agent-owned generated notes are identified by the `agent_generated`/`agent_managed` **markers** (flat at root), not by folder; `Agent/` (+`Agent/Temp/`) is the only agent-owned folder territory. Add a row: never modify a note that carries `agent_augmented: true` beyond additive edits.

- [ ] **Step 4: In `agent-notes.md` (context), confirm state notes live under `Agent/`** with `agent_managed: true`, and add one line that `Agent/Temp/` holds disposable scratch (never linked from real notes; safe to delete). Keep the legacy-root fallback note.

- [ ] **Step 5: Assert the marker vocabulary and flat rule are present, folder-mandate gone.**

Run:
```bash
cd /home/openclaw/second-brain
grep -l 'agent_generated' .agents/context/vault-structure.md .agents/context/boundaries.md
grep -c 'agent_augmented' .agents/context/vault-structure.md
grep -c 'Agent/tmp' .agents/context/vault-structure.md .agents/context/agent-notes.md
echo "--- must be empty (no mandate to create NEW notes in type folders): ---"
grep -niE 'new .*notes? (must|should) (live|be created) in .*(Sources|Atomic|MOCs|Research)/' .agents/context/vault-structure.md || echo "(clean)"
grep -ni 'Agent/Temp' .agents/context/*.md || echo "(no Agent/Temp remnants)"
```
Expected: both files listed for `agent_generated`; `agent_augmented` count ≥1; `Agent/tmp` present; `(clean)` and `(no Agent/Temp remnants)`.

- [ ] **Step 6: Run standing verification** (VERIFY-REFS + 3 harness tests). Expected: `VERIFY-REFS done`, all `PASS`.

- [ ] **Step 7: Commit**

```bash
cd /home/openclaw/second-brain
git add .agents/context/vault-structure.md .agents/context/boundaries.md .agents/context/agent-notes.md
git commit -m "Ownership model: 3-class markers + flat layout in context files

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: `skills/classify-note.md` — the write gate

The single classification skill every write consults: given a note, return its class and, for agent notes, detect user edits and drive `agent_augmented` promotion + `agent_last_touched` stamping.

**Files:**
- Create: `.agents/skills/classify-note.md`

**Interfaces:**
- Consumes: the marker vocabulary from Task 1.
- Produces: a skill callable as "classify `<note>`" returning one of `user | agent_generated | agent_augmented | agent_managed`, plus two named procedures other tasks invoke by name: **"stamp `agent_last_touched`"** (write `agent_last_touched: <current ISO 8601 UTC>` into an agent note on every agent edit) and **"augment-check"** (before rewriting an `agent_generated` note, if the file's real mtime is newer than its `agent_last_touched`, add `agent_augmented: true` and switch to additive-only).

- [ ] **Step 1: Write the skill.** Create `.agents/skills/classify-note.md` with: purpose; a **Classify** procedure (read frontmatter → `agent_managed:true`→`agent_managed`; `agent_augmented:true`→`agent_augmented`; `agent_generated:true`→run augment-check, then `agent_generated` or `agent_augmented`; no ownership tag→`user`); the **augment-check** procedure (compare real mtime to `agent_last_touched`; if newer, add `agent_augmented: true`); the **stamp `agent_last_touched`** procedure (set to current ISO 8601 UTC on every agent edit); and a **Write-gate** table: `user`→read-only, never write; `agent_generated`→both may edit, stamp on edit; `agent_augmented`→additive only, preserve user sections, still stamp; `agent_managed`→agent writes per its dedicated spec. Keep it terse (repo style — see neighboring skills).

- [ ] **Step 2: Assert structure and the four classes are present.**

Run:
```bash
cd /home/openclaw/second-brain
test -f .agents/skills/classify-note.md && echo "created"
grep -c -E 'agent_managed|agent_generated|agent_augmented|user' .agents/skills/classify-note.md
grep -qi 'augment-check' .agents/skills/classify-note.md && echo "augment-check present"
grep -qi 'agent_last_touched' .agents/skills/classify-note.md && echo "stamp present"
grep -qiE 'read-only|never write' .agents/skills/classify-note.md && echo "user read-only present"
```
Expected: `created`; count ≥4; `augment-check present`; `stamp present`; `user read-only present`.

- [ ] **Step 3: Run standing verification.** Expected: `VERIFY-REFS done`, all `PASS`.

- [ ] **Step 4: Commit**

```bash
cd /home/openclaw/second-brain
git add .agents/skills/classify-note.md
git commit -m "Add skills/classify-note.md — ownership classification + augment promotion gate

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Flat placement + markers on knowledge-note creators

Make every knowledge-note creator (a) create flat at root, (b) stamp `agent_generated` + `agent_last_touched`, (c) use the legacy-path read fallback + duplicate guard, (d) run `classify-note` augment-check before rewriting an existing note.

**Files:**
- Modify: `.agents/specs/source-note.md`
- Modify: `.agents/skills/parse-content.md`
- Modify: `.agents/skills/create-atomic.md`
- Modify: `.agents/skills/update-moc.md`
- Modify: `.agents/specs/research.md`
- Modify: `.agents/skills/synthesize-research-note.md`

**Interfaces:**
- Consumes: markers (Task 1); `classify-note.md` augment-check + stamp (Task 2).
- Produces: all agent knowledge notes carry `agent_generated: true` + `agent_last_touched`, are created at `$VAULT_PATH/<Title>.md` (flat), and are guarded against duplicating a legacy `Sources|Atomic|MOCs|Research/<Title>.md`.

- [ ] **Step 1: Read the six files' creation/frontmatter sections.**

Run: `cd /home/openclaw/second-brain && for f in specs/source-note.md skills/parse-content.md skills/create-atomic.md skills/update-moc.md specs/research.md skills/synthesize-research-note.md; do echo "=== $f ==="; grep -nE 'VAULT_PATH|Sources/|Atomic/|MOCs/|Research/|agent_generated|source_type|Save as|Update ' .agents/$f; done`

- [ ] **Step 2: In each creator, set flat placement + markers.** For source-note, create-atomic, update-moc, research, synthesize: the created/updated note path is `$VAULT_PATH/<Title>.md` (flat), and its frontmatter includes `agent_generated: true` and `agent_last_touched: <ISO ts>` (stamped via `skills/classify-note.md`). Where a folder path (`Sources/…`, `Atomic/…`, `MOCs/…`, `Research/…`) is currently written for *new* notes, change it to the flat root path. (`research.md`/`synthesize-research-note.md` already stamp markers under `Research/` — flatten the path, keep the stamps.)

- [ ] **Step 3: Add the duplicate/legacy-fallback guard to each creator.** Before creating `<Title>.md`, check for an existing note at the flat root **and** at the legacy folder path for its type (`Sources|Atomic|MOCs|Research/<Title>.md`); if one exists, update/link it instead of creating a duplicate (reuse the guard wording already in `specs/reconcile.md` "Duplicate / Missing-Note Guard"). Reference `specs/reconcile.md` for the shared guard rather than restating the full algorithm.

- [ ] **Step 4: Gate rewrites through classify-note.** In each spot that *edits an existing* agent note, add: run `skills/classify-note.md` augment-check first; if the note is `agent_augmented`, make additive edits only; always stamp `agent_last_touched` after editing.

- [ ] **Step 5: Assert flat + markers + guard across all six.**

Run:
```bash
cd /home/openclaw/second-brain
echo "--- must be empty: NEW-note creation still hardcoded to a type folder ---"
grep -nE '(Save as|Create|Update|Write).*(Sources|Atomic|MOCs|Research)/' \
  .agents/specs/source-note.md .agents/skills/create-atomic.md .agents/skills/update-moc.md \
  .agents/specs/research.md .agents/skills/synthesize-research-note.md \
  | grep -viE 'legacy|fallback|duplicate|existing' || echo "(clean)"
echo "--- markers present ---"
grep -l 'agent_generated' .agents/specs/source-note.md .agents/skills/create-atomic.md .agents/skills/update-moc.md .agents/specs/research.md .agents/skills/synthesize-research-note.md
echo "--- classify-note referenced by rewriters ---"
grep -l 'classify-note' .agents/specs/source-note.md .agents/skills/create-atomic.md .agents/skills/update-moc.md
```
Expected: `(clean)`; all five files listed as containing `agent_generated`; the rewriters referencing `classify-note`.

- [ ] **Step 6: Run standing verification.** Expected: `VERIFY-REFS done`, all `PASS`.

- [ ] **Step 7: Commit**

```bash
cd /home/openclaw/second-brain
git add .agents/specs/source-note.md .agents/skills/parse-content.md .agents/skills/create-atomic.md .agents/skills/update-moc.md .agents/specs/research.md .agents/skills/synthesize-research-note.md
git commit -m "Knowledge notes: flat placement + agent_generated markers + duplicate/augment guards

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: `skills/recap.md` + the recap-note daily model

Move the agent's daily output out of the daily note into `Recap YYYY-MM-DD`. The daily note keeps only a recap link. Check-in generated in and read back from the recap. Freeze past recaps.

**Files:**
- Create: `.agents/skills/recap.md`
- Modify: `.agents/specs/daily-note.md`
- Modify: `.agents/specs/daily-pipeline.md`
- Modify: `.agents/specs/daily-suggestions.md`
- Modify: `.agents/skills/check-in.md`

**Interfaces:**
- Consumes: markers (Task 1); `classify-note.md` (Task 2); flat creation (Task 3).
- Produces: a skill callable as "build/refresh the recap for `<date>`" that writes `$VAULT_PATH/Recap <date>.md` (`agent_generated`, sections **Check-in, What's New, Explore, Routines, Question for Today, New Notes**) and ensures the daily note's agent zone contains exactly `[[Recap <date>]]`; and the rule that a recap dated `< today` is frozen.

- [ ] **Step 1: Write `recap.md`.** Purpose; **Build/refresh** procedure (assemble the six sections from day state — reuse `daily-suggestions.md` for What's New/Explore/Routines/Question and `check-in.md` for the Check-in — into `Recap <date>.md`, flat, `agent_generated` + `agent_last_touched`); **Link** procedure (write/ensure `[[Recap <date>]]` in the daily note's agent zone — the *only* agent write into a daily note; create the recap if missing); **Freeze** rule (if `<date> < today`, do not edit an existing recap; regenerate a missing one **once** from its daily note then freeze; missing daily note → log `RECAP_SKIPPED`). Checkbox lists one per line (Obsidian rule).

- [ ] **Step 2: Point the daily specs at the recap.** In `daily-note.md` and `daily-pipeline.md`: the agent zone of a daily note is a single `[[Recap YYYY-MM-DD]]` link (via `skills/recap.md`); all former agent-zone sections are produced *in the recap*, not the daily note. In `daily-suggestions.md`: its sections are assembled into the recap (keep the section builders; change the write target to the recap). Preserve the user-zone-read-only rule.

- [ ] **Step 3: Move the Check-in into the recap.** In `check-in.md`: generation target is the recap's `## Check-in` (top section); ORIENT read-back reads **today's recap** Check-in (not the daily note); pre-generation ensures **tomorrow's recap** exists with a fresh Check-in. Keep one-checkbox-per-line.

- [ ] **Step 4: Assert the recap model.**

Run:
```bash
cd /home/openclaw/second-brain
test -f .agents/skills/recap.md && echo "recap skill created"
grep -qiE 'Recap <?date|Recap YYYY-MM-DD' .agents/skills/recap.md && echo "recap title present"
grep -qi 'freeze' .agents/skills/recap.md && echo "freeze rule present"
echo "--- daily specs reference the recap ---"
grep -l 'recap' .agents/specs/daily-note.md .agents/specs/daily-pipeline.md .agents/specs/daily-suggestions.md .agents/skills/check-in.md
echo "--- check-in read-back targets the recap ---"
grep -qiE 'recap' .agents/skills/check-in.md && echo "check-in -> recap"
```
Expected: `recap skill created`; `recap title present`; `freeze rule present`; all four daily files listed; `check-in -> recap`.

- [ ] **Step 5: Run standing verification.** Expected: `VERIFY-REFS done`, all `PASS`.

- [ ] **Step 6: Commit**

```bash
cd /home/openclaw/second-brain
git add .agents/skills/recap.md .agents/specs/daily-note.md .agents/specs/daily-pipeline.md .agents/specs/daily-suggestions.md .agents/skills/check-in.md
git commit -m "Recap notes: daily agent output -> Recap YYYY-MM-DD; daily note keeps only the link

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Revise `reconcile.md` + wire the loop and router

Reconcile the draft `reconcile.md` to the recap model and the new skills, then wire the loop (Phase 2–4 reconcile, Phase 6 pre-generate tomorrow's recap) and route `action-router.md` by note class.

**Files:**
- Modify: `.agents/specs/reconcile.md`
- Modify: `.agents/loop.md`
- Modify: `.agents/skills/action-router.md`

**Interfaces:**
- Consumes: `classify-note.md` (Task 2), knowledge-note guards (Task 3), `recap.md` (Task 4).
- Produces: `specs/reconcile.md` as the sole reconcile entry point (`mode=continuous` from the loop, `mode=full-backfill` from setup); the loop invoking reconcile in ORIENT/DECIDE/ACT and pre-generating tomorrow's recap in CLEANUP.

- [ ] **Step 1: Read the current draft + loop + router.**

Run: `cd /home/openclaw/second-brain && sed -n '1,130p' .agents/specs/reconcile.md; echo ===LOOP===; sed -n '23,78p' .agents/loop.md; echo ===ROUTER===; grep -nE 'EXPLORE|ENRICH|ATOMIZE|CONNECT|FETCH|SOURCE_CREATE|CLEAN' .agents/skills/action-router.md`

- [ ] **Step 2: Fix the "Daily Note as Entry Point" section of `reconcile.md` to the recap model.** Replace the instruction that the daily agent zone is "replaced" with the What's New/Resources/Explore/Open sections. New wording: the agent writes into a daily note **only** the `[[Recap YYYY-MM-DD]]` link (via `skills/recap.md`); all sections live in the recap; the user input zone is preserved exactly. Standardize `Agent/Temp/` → `Agent/Temp/` throughout. Have the per-class routing and augment-check **reference `skills/classify-note.md`** rather than restating it.

- [ ] **Step 3: Add explicit per-class routing to `reconcile.md`.** A short table/section: `user` (daily) → ensure recap link + extract seeds, else read-only; `agent_generated`/`agent_augmented` → enrich / atomize / clean / fetch·source_create / explore, need-driven, augment-preserving; `agent_managed` → dedicated update (Phase 0 recreates missing). Cap continuous need-driven repairs at 5/run beyond the change set. Confirm the seed rule and backfill idempotency block match Global Constraints.

- [ ] **Step 4: Wire `loop.md`.** In Phase 1/2, invoke `specs/reconcile.md mode=continuous` and classify the change set + working notes via `skills/classify-note.md`. In Phase 4 ACT, actions honor note class (per `reconcile.md`). In Phase 6 CLEANUP, pre-generate **tomorrow's recap** (stub with a fresh Check-in) via `skills/recap.md`, replacing any old "pre-generate tomorrow's daily note" step. Keep the ≤20-action cap.

- [ ] **Step 5: Route `action-router.md` by class.** Each action targets an agent note or the recap — never user content: `ENRICH`/`ATOMIZE`/`CONNECT`/`CLEAN` operate on `agent_generated`/`agent_augmented` notes (per Task 3/Section 3); the daily-note action is "ensure recap link + seed extraction." Add a one-line note that `classify-note` gates the target.

- [ ] **Step 6: Assert the wiring.**

Run:
```bash
cd /home/openclaw/second-brain
echo "--- reconcile uses recap + classify, not the old daily agent-zone sections ---"
grep -qi 'recap' .agents/specs/reconcile.md && echo "reconcile->recap"
grep -qi 'classify-note' .agents/specs/reconcile.md && echo "reconcile->classify"
grep -ni 'Agent/Temp' .agents/specs/reconcile.md || echo "(no Agent/Temp remnants)"
echo "--- loop wires reconcile + tomorrow's recap ---"
grep -qi 'reconcile' .agents/loop.md && echo "loop->reconcile"
grep -qiE "tomorrow'?s recap|Recap .*tomorrow|pre-generate.*recap" .agents/loop.md && echo "loop->tomorrow recap"
echo "--- router references classify-note ---"
grep -qi 'classify-note' .agents/skills/action-router.md && echo "router->classify"
```
Expected: `reconcile->recap`, `reconcile->classify`, `(no Agent/Temp remnants)`, `loop->reconcile`, `loop->tomorrow recap`, `router->classify`.

- [ ] **Step 7: Run standing verification.** Expected: `VERIFY-REFS done`, all `PASS`.

- [ ] **Step 8: Commit**

```bash
cd /home/openclaw/second-brain
git add .agents/specs/reconcile.md .agents/loop.md .agents/skills/action-router.md
git commit -m "Reconcile engine to recap model; wire loop Phase 2-6 + class-routed actions

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: setup full-backfill + AGENTS.md + whole-system consistency sweep

Confirm setup's first pass runs the idempotent full-backfill, register the two new skills in the harness index, and sweep the whole `.agents/` tree for any surviving folder-mandate or daily-agent-zone contradictions.

**Files:**
- Modify: `.agents/AGENTS.md`
- Modify: `scripts/setup.sh` (verify/adjust only)
- Modify: any file the sweep flags

**Interfaces:**
- Consumes: everything from Tasks 1–5.
- Produces: a self-consistent tree — `setup.sh` first pass calls `run.sh specs/reconcile.md mode=full-backfill`; `AGENTS.md` lists `classify-note.md` and `recap.md`; no file still mandates new notes into type folders or a full daily agent zone.

- [ ] **Step 1: Verify the setup first-pass call.**

Run: `cd /home/openclaw/second-brain && grep -nE 'reconcile|full-backfill|first pass' scripts/setup.sh`
Expected: the interactive first-pass block invokes `"$RUN_SCRIPT" specs/reconcile.md ... mode=full-backfill`. If it references a non-existent spec or the wrong mode string, fix it to `specs/reconcile.md` + `mode=full-backfill` and keep the TTY guard.

- [ ] **Step 2: Register the new skills in `AGENTS.md`.** Add `skills/classify-note.md` and `skills/recap.md` to the initialization/skill inventory wherever skills are enumerated, and update any "N agent-managed notes"/skill-count phrasing if present. Read `AGENTS.md` first to match its format.

- [ ] **Step 3: Whole-tree contradiction sweep.**

Run:
```bash
cd /home/openclaw/second-brain
echo "--- A: any file still mandating NEW notes into type folders (should be empty) ---"
grep -rniE '(create|save|write|new).{0,30}(Sources|Atomic|MOCs|Research)/' .agents \
  | grep -viE 'legacy|fallback|duplicate|existing|read' || echo "(clean A)"
echo "--- B: any daily-note agent zone still holding full sections instead of just the recap link ---"
grep -rniE "daily note.*(What's New|agent zone).*(replace|section)" .agents/specs/daily-note.md .agents/specs/daily-pipeline.md || echo "(clean B)"
echo "--- C: Agent/Temp remnants anywhere ---"
grep -rni 'Agent/Temp' .agents || echo "(clean C)"
```
Fix any hit so it conforms (flat for new notes; daily note → recap link only; `Agent/Temp/`). Re-run until A, B, C are all clean.

- [ ] **Step 4: Idempotency assertion for full-backfill wording.**

Run: `cd /home/openclaw/second-brain && grep -niE 'never duplicate|fill gaps only|never clobber|agent_augmented|never rewrite a complete past recap|never (move|rename|delete)' .agents/specs/reconcile.md`
Expected: the four idempotency guarantees from Global Constraints are all present in `reconcile.md`.

- [ ] **Step 5: Run standing verification.** Expected: `VERIFY-REFS done`, all `PASS`.

- [ ] **Step 6: Commit**

```bash
cd /home/openclaw/second-brain
git add .agents/AGENTS.md scripts/setup.sh
# plus any files the sweep fixed:
git add -A .agents
git commit -m "Register classify-note/recap skills; verify full-backfill; whole-tree flat/recap sweep

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:**
- Section 1 (ownership + flat) → Task 1 (context), enforced by Task 2 (classify-note), applied by Task 3 (creators). ✅
- Section 2 (recap note) → Task 4 (recap skill + daily specs), pre-gen in Task 5 (loop Phase 6). ✅
- Section 3 (continuous reconcile, seed rule, per-class processing, temp scratch) → Task 5 (reconcile revise + loop + router); temp `Agent/Temp/` in Tasks 1 & 3. ✅
- Section 4 (full-backfill, idempotency) → Task 5 (backfill block) + Task 6 (setup call + idempotency assertion). ✅
- `agent_augmented` preservation → Task 2 (augment-check) used in Tasks 3–5. ✅
- Migration (flat new, legacy read, no auto-move) → Tasks 1, 3, 6 sweep. ✅
- Components/files list → every listed file appears in a task. ✅

**Placeholder scan:** No TBD/TODO; every edit step names the exact file and the concrete change; verification steps give exact commands + expected output. Instruction-file edits are described by their required content + asserted by grep (this repo has no unit-test framework — structural verification is the established pattern). ✅

**Type consistency:** Marker names (`agent_generated`, `agent_last_touched`, `agent_augmented`, `agent_managed`), folder names (`Agent/`, `Agent/Temp/`), recap title (`Recap YYYY-MM-DD`), recap section order, mode strings (`mode=continuous`, `mode=full-backfill`), and the two skill names (`classify-note.md`, `recap.md`) are used identically across all tasks and match the spec. ✅
