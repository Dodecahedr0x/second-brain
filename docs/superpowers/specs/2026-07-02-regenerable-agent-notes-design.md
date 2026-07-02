# Design: Regenerable Agent Notes

*Date: 2026-07-02*
*Status: Approved — ready for implementation planning*

## Problem / Vision

Rework how the agent creates notes so that its output is a **derived, regenerable
projection** of ground truth (the user's writing + the external world) and
**minimally affects user notes**. The guarantee: **delete every agent-generated
note and the loop rebuilds the same structure over time** — content may differ,
the structural classes and function do not. This completes the read-only-user-zone
work: the agent owns a clearly-marked, disposable layer over the user's untouched
notes.

## Decisions (locked in brainstorming)

| Decision | Choice |
|----------|--------|
| Boundary | **Marker-based**, not folder-based. Three ownership classes by frontmatter tag. |
| Structure | **Flat.** Folders only for `Agent/` (state) and `Agent/Temp/` (scratch). Knowledge notes live flat at the root. |
| User-edit escape hatch | **`agent_augmented`** — a user-edited agent note is preserved (additive-only, never regenerated). |
| Daily output | Moves out of the daily note into a derived **recap note**; the daily note keeps only a `[[Recap]]` link. |
| Recap lifecycle | **Today's recap = working note; past recaps freeze** (regenerate-once-if-missing, then never edited). |
| Reconcile | **Continuous + need-driven** in the loop; regular notes stay improvable; only missing/in-progress notes are touched. |
| Bootstrap | An **idempotent full-backfill** pass (setup's first pass) catches a vault up from ground truth. |

## Section 1 — Ownership model + flat structure

Three classes, distinguished by frontmatter marker, laid out flat:

| Class | Marker | Location | Edits | Regenerable? |
|-------|--------|----------|-------|--------------|
| **User note** | *(none)* | flat / root | user only — agent **read-only** | No — ground truth |
| **Agent-generated** (source / atomic / MOC / research / recap) | `agent_generated: true` + `agent_last_touched: <ISO ts>` | flat / root | **both** | Yes — derived |
| **Agent-owned state** | `agent_managed: true` | `Agent/` | agent (user shouldn't) | Yes — re-derived by scan |

- **`agent_augmented: true`** — every agent write to an `agent_generated` note stamps
  `agent_last_touched`. On reconcile, if the note's real mtime is newer than that
  stamp, a human edited it: flip the tag to `agent_augmented` and switch to
  **preserve/additive** mode — never overwrite or regenerate it.
- **Folders only** for `Agent/` (state notes) and `Agent/Temp/` (scratch). All
  knowledge notes — including recaps — are **flat at the root**, distinguished by
  tag, so the graph stays interleaved and browsable.
- **Migration — two distinct parts:**
  1. **Instruction files:** correct the just-written specs/skills/context that route
     new notes into `Sources/ Atomic/ MOCs/ Research/` so **new** agent notes are
     created **flat at the root** instead.
  2. **Existing vault notes** already sitting in those folders: keep a **legacy-path
     read fallback** so they're still found, and **never auto-move** them
     (renames/moves break wikilinks — see `context/boundaries.md`). Flat is the rule
     for *new* notes only.

## Section 2 — The recap note

- **`Recap YYYY-MM-DD`** — an `agent_generated` note, flat at the root, that is the
  day's exploration home. It **absorbs the entire former daily agent zone**: the
  steering **Check-in** (top), then **What's New**, **Explore**, **Routines**,
  **Question for Today**, and pointers to the day's new notes.
- **The daily note** keeps only user content; its agent zone shrinks to a single
  `[[Recap YYYY-MM-DD]]` link — the *only* thing the agent writes into a daily note.
  The link (and the recap) are **created if missing**.
- **Steering moves with it:** the Check-in is generated in the recap, ticked there,
  and ORIENT read-back reads **today's recap** Check-in. Pre-generation ensures
  **tomorrow's recap** exists with a fresh Check-in.
- **Weekly/monthly** recaps follow the same shape (their tiered Check-ins live in
  the weekly/monthly recap, linked from that day's daily note).
- **Lifecycle:** **today's recap is the agent's working note**, built across the
  day's runs. Once the day passes (dated `< today`), the recap is **finalized and
  frozen** — never edited again. A deleted *past* recap is rebuilt **once** from its
  daily note, then frozen again.
- **Regenerable:** derived from its daily note + the day's agent state (Interest
  Model, discovery/research completions, new notes) — all themselves regenerable.

## Section 3 — Continuous reconcile + per-class processing

`specs/reconcile.md` is the engine. Each loop run it is **need-driven, not a
sweep**: it touches a note only when the note *needs* it —
- **missing but its ground-truth seed still exists** → regenerate it once, or
- it is a **current working note** (today's recap, the active research session), or
- it is a regular agent note with a **concrete available improvement**.

A note that is present and complete (a non-stub source note, a finalized `#research`
note, a frozen past recap) is **left alone**. Work is proportional to what's
missing or in-progress, not to vault size.

**Ground-truth seed rule** (decides existence): a source note should exist iff its
URL is still in a note; an atomic note iff its concept still recurs; a research note
iff its question is open; a recap iff its daily note exists. **Seed gone → not
regenerated.**

**Processing by class:**
- **Daily note (read-only):** ensure/update `[[Recap YYYY-MM-DD]]`; extract
  concepts / URLs / questions to seed the agent's derived structures (concept gaps,
  source fetches, research queue). Nothing else is written into it.
- **Agent-generated / `agent_augmented`** (continuously improvable, need-driven):
  - **enrich** → add `[[links]]` to existing notes for context
  - **atomize / clean** → isolate a whole concept into a new dedicated note, edit
    the origin to link to it
  - **fetch / source_create** → pull an external link into a dedicated summary note,
    link back with context
  - **explore** → ask & answer questions inline
  - *(`agent_augmented` → additive only; never overwrite user edits)*
- **Agent-owned state (`Agent/`):** dedicated per-note update; Phase 0 recreates any
  missing note from its template.
- **User non-daily note:** read-only — extract → derived agent notes (same as a
  daily note minus the recap).

**Two-phase creation (temp scratch):** for synthesized notes (research, source
summaries, MOCs) the agent first **collects raw facts into `Agent/Temp/`** to build
context, **synthesizes the real note** from it, then **discards the scratch**. Temp
files are agent-owned, disposable, and never linked from real notes.

## Section 4 — Full backfill (bootstrap) + idempotency

A **full-backfill mode** of `specs/reconcile.md` runs a full-loop pass over the
whole vault: regenerate every missing derived note from ground truth, then stop.
This is what **`setup.sh`'s first pass** runs (`run.sh specs/reconcile.md
mode=full-backfill`).

**It must be idempotent** — rerunning setup on an existing vault:
- creates **only** what's missing (never a duplicate),
- never clobbers an `agent_augmented` (user-edited) note,
- never re-freezes or re-edits a complete past recap,
- leaves complete notes untouched.

So "re-run setup anytime" is always safe. After the one-time backfill, the loop's
continuous reconcile takes over: improve regular notes, keep today's recap live,
heal deletions on demand.

## Components / files

**New:**
- `specs/reconcile.md` — the reconcile engine (continuous + `mode=full-backfill`),
  seed rules, per-class routing, need-driven gating.
- `skills/classify-note.md` — classify a note by ownership marker + detect user
  edits (mtime vs `agent_last_touched`) → `user | agent_generated | agent_augmented
  | agent_managed`.
- `skills/recap.md` — generate/update `Recap YYYY-MM-DD` from a daily note + day
  state; write the `[[Recap]]` link into the daily note's agent zone; freeze past
  recaps.

**Changed:**
- `loop.md` — reconcile drives Phase 2–4 (classify change-set + working notes +
  missing-seed regeneration); Phase 6 pre-generates tomorrow's recap.
- `specs/daily-note.md`, `specs/daily-pipeline.md`, `specs/daily-suggestions.md`,
  `skills/check-in.md` — the agent daily output → the recap note; daily note gets
  only the recap link; Check-in lives/reads-back in the recap.
- `specs/source-note.md`, `skills/parse-content.md`, `skills/create-atomic.md`,
  `skills/update-moc.md`, `specs/research.md`, `skills/synthesize-research-note.md`
  — flat placement + `agent_generated`/`agent_last_touched` stamps; reconcile the
  folder-based drafts back to flat with legacy read fallback.
- `skills/action-router.md` — actions route by note class (per Section 3).
- `skills/agent-notes.md`, `context/agent-notes.md`, `context/vault-structure.md`,
  `context/boundaries.md` — codify the 3-class marker model, `agent_augmented`,
  flat layout, `Agent/` + `Agent/Temp/`.
- `scripts/setup.sh` — first pass runs `specs/reconcile.md mode=full-backfill`
  (already wired).

## Interfaces

- **Ownership marker** is the single classification key: `classify-note.md` →
  `{user, agent_generated, agent_augmented, agent_managed}` gates all writes.
- **`agent_last_touched`** (stamped on every agent write) vs the file's real mtime
  is the user-edit detector that drives `agent_augmented` promotion.
- **Seed rule** is the single existence test for regeneration.
- **`specs/reconcile.md`** is the sole entry point for both continuous reconcile
  (loop) and full backfill (setup); `mode=full-backfill` selects the one-shot pass.

## Regenerability invariant (the guarantee)

Delete any subset of agent-generated / agent-owned notes → subsequent runs
regenerate the same **structural classes** (recaps, source notes, atomic notes,
MOCs, research notes, the seven state notes) from ground truth, honoring
`agent_augmented` preservation and past-recap freezing. Content may differ; the
folder/function boundaries and note classes do not. No agent note is *required* for
a user note to make sense (user notes carry no agent wikilinks).

## Open parameters (tune during implementation)

Reconcile per-run budget (how many missing/working notes per cycle), the "concrete
improvement available" threshold for re-touching a regular note, recap section
order, `Agent/Temp/` retention (discard immediately vs end-of-session), and how far
back full-backfill scans.

## Non-goals / out of scope

- Auto-moving/renaming existing notes (migration is read-fallback only).
- Modifying user unstructured content (already read-only).
- Changing the discovery sources, fetch chain, steering statistics, or research
  hop mechanics — only their *placement/ownership/surfacing* changes.
- Guaranteeing byte-identical regeneration (content may differ; structure is the
  invariant).
