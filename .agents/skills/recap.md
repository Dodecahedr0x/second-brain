# Skill: Recap

**Used in**: Loop Phase 4 (ACT); `specs/daily-pipeline.md`; `specs/reconcile.md` (backfill + Phase 6 CLEANUP).

## Purpose

`YYYY-MM-DD Recap` is the agent's primary daily output note. All sections formerly written into the daily agent zone (Check-in, What's New, Explore, Routines, Question for Today, New Notes) live here instead. The daily note's agent zone holds only `[[YYYY-MM-DD Recap]]` — the **only** agent write into a daily note.

Recap notes are `agent_generated` (flat at vault root), not `agent_managed`. They do not live under `Agent/`.

---

## Build / Refresh

Called when `<date>` is today. Assembles `$VAULT_PATH/<date> Recap.md` from current day state.

1. Run `skills/classify-note.md` augment-check if the file already exists.
2. Collect section content — call **every** provider and **fully regenerate** the recap (a build is a complete rewrite, not a partial patch of a few sections; never drop a section that has material). Omit a section only when it genuinely has no entries — but **Synthesis and Explore are REQUIRED on any run that created/updated a note or has an active or queued research session** (i.e. essentially every run). If `EXPLORE` ran this session, the Explore section MUST report it.
   - **Check-in** — call `skills/check-in.md` (tier=daily); always first.
   - **Synthesis** — a concise, **bulleted** synthesis of the notes created or substantially updated this session: **2–4 bullets, each a distinct thread**, leading with a bold thread label, then 1–2 tight sentences on *why* it matters and *how* the day's notes connect to each other and to existing notes, ending on the open question it raises. Wikilink concepts so the connections are navigable; organize by thread so the structure reads at a glance. **Be concise** — cut throat-clearing and anything already stated in the notes. **Required** whenever any note was created or updated this session (nearly every run — see the loop's Content guard); omit only on a genuine no-op run.
   - **What's New** — from `specs/daily-suggestions.md` Step 3e.
   - **Explore** — from `specs/daily-suggestions.md` Step 2: open questions raised by today's new notes, Check-in ticks, and interests (each queued for research), plus the exploration currently running on them. **Required** whenever a research session is active or queued, or any question can be raised from new notes / Check-in / interests — essentially every run. Never omit it while research is active; it must state the questions **and** report the running exploration.
   - **Routines** — from `specs/daily-suggestions.md` Step 3.
   - **On This Day** *(optional)* — from `specs/daily-suggestions.md` Step 3b; omit if empty.
   - **Loose Ends** *(optional)* — from `specs/daily-suggestions.md` Step 3c; omit if empty.
   - **This Week's Theme** *(optional)* — from `specs/daily-suggestions.md` Step 4; omit if empty.
   - **Question for Today** — from `specs/daily-suggestions.md` Step 3d; omit if empty.
   - **New Notes** — a **succinct index** (one line per note: `[[Note]] — ≤6-word descriptor`) of notes created or substantially updated this session **that are not already surfaced in What's New** (typically atomic notes, MOCs, enriched notes). The *reasoning* lives in Synthesis, so keep this list terse. **Omit if empty**; never repeat a note already in What's New. Always last.
3. Assemble in this canonical order:
   1. Check-in
   2. Synthesis
   3. What's New
   4. Explore
   5. Routines
   6. On This Day *(if any)*
   7. Loose Ends *(if any)*
   8. This Week's Theme *(if any)*
   9. Question for Today
   10. New Notes
4. Write (or fully rewrite if `agent_generated`) `$VAULT_PATH/<date> Recap.md`:

```markdown
---
agent_generated: true
agent_last_touched: YYYY-MM-DDThh:mm:ssZ
---

# YYYY-MM-DD Recap

## Check-in
Focus this week?
- [ ] Topic A

<!-- steering: unprocessed -->

## Synthesis

- **<Thread 1>** — [[Note A]] fills the mechanism [[Existing Note]] left open; <why it matters in one clause>. Open: <the question it raises>?
- **<Thread 2>** — [[Note B]] shows where [[Other Concept]] breaks down, tying it back to [[Related Note]].

## What's New
- [[Source Title]] · <source> · YYYY-MM-DD — abstract → [[Concept]]

## Explore

**Questions raised today**
- *New notes* — <question a note created today opens up>?
- *Check-in* — <question tied to a topic you ticked>?
- *Interests* — <question on a top focus topic>?

**Now exploring** — *<active driving question>* · hop N/12 · M/5 answered → [[Research Note]]

## Routines
- **Activity** · N-day streak · Next: action
- **Fading activity** · last seen YYYY-MM-DD · Pick back up — fading

## On This Day
- *N days ago* — bullet text with [[wikilinks]]

## Loose Ends
- *YYYY-MM-DD* — bullet text with [[wikilinks]]

## This Week's Theme
One sentence + optional [[MOC suggestion]]

## Question for Today
> Specific open question derived from this week's theme or a stub note.

## New Notes
<!-- terse index only — the reasoning is in Synthesis; omit if empty; skip anything already in What's New -->
- [[Note A]] — 4–6 word descriptor
- [[Note B]] — 4–6 word descriptor
```

5. Stamp `agent_last_touched` (see `skills/classify-note.md`).

**Checkbox rule**: one `- [ ]` per line — Obsidian renders a checkbox only when the box is alone on its own line; never put two boxes on one line or text before a box.

---

## Link

Ensure the daily note's agent zone contains exactly `[[<date> Recap]]`:

1. Open `$VAULT_PATH/<date>.md`. If it does not exist, skip (log `RECAP_SKIPPED: missing daily note <date>`).
2. Locate the agent zone boundary (`\n---\n## Agent`). If absent, append the boundary after all user content.
3. Replace everything from the boundary onward with:

```
---
## Agent — YYYY-MM-DD HH:MM

[[YYYY-MM-DD Recap]]
```

The user zone above the boundary is **never touched**. This replacement is the sole agent write into any daily note. Sibling agent links (weekly/monthly review notes) surface in the recap's `## New Notes`, not in the daily note's agent zone.

---

## Freeze

A recap dated `< today` is frozen:

| State | Action |
|-------|--------|
| Recap exists (past date) | Do not edit — log `PAST_RECAP_FROZEN: <date>` |
| Recap missing, daily note exists | Regenerate once (Build/Refresh cold run using that day's state), then freeze — log `REGENERATED: <date> Recap` |
| Recap missing, daily note also missing | Log `RECAP_SKIPPED: missing daily note <date>`; invent nothing |

---

## Pre-generate tomorrow

Ensure `$VAULT_PATH/<tomorrow> Recap.md` exists with a fresh `## Check-in` before the session ends. **Idempotent** — skip silently if the file already exists.

1. Compute tomorrow's date (today + 1 day, ISO 8601: `YYYY-MM-DD`).
2. Check whether `$VAULT_PATH/<tomorrow> Recap.md` exists.
   - If it exists: log `PRE_GEN_SKIPPED: <tomorrow> Recap already exists`; stop.
3. Call `skills/check-in.md` Generate (tier=daily) to produce a `## Check-in` block.
4. Write `$VAULT_PATH/<tomorrow> Recap.md`:

```markdown
---
agent_generated: true
agent_last_touched: YYYY-MM-DDThh:mm:ssZ
---

# <tomorrow> Recap

## Check-in
<generated check-in block from step 3>
```

5. Log `PRE_GEN: created <tomorrow> Recap`.

This procedure is called by Loop Phase 6 (CLEANUP).
