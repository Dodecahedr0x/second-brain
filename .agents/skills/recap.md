# Skill: Recap

**Used in**: Loop Phase 4 (ACT); `specs/daily-pipeline.md`; `specs/reconcile.md` (backfill + Phase 6 CLEANUP).

## Purpose

`Recap YYYY-MM-DD` is the agent's primary daily output note. All sections formerly written into the daily agent zone (Check-in, What's New, Explore, Routines, Question for Today, New Notes) live here instead. The daily note's agent zone holds only `[[Recap YYYY-MM-DD]]` — the **only** agent write into a daily note.

Recap notes are `agent_generated` (flat at vault root), not `agent_managed`. They do not live under `Agent/`.

---

## Build / Refresh

Called when `<date>` is today. Assembles `$VAULT_PATH/Recap <date>.md` from current day state.

1. Run `skills/classify-note.md` augment-check if the file already exists.
2. Collect section content — call each provider; omit any section with no entries:
   - **Check-in** — call `skills/check-in.md` (tier=daily); always first.
   - **What's New** — from `specs/daily-suggestions.md` Step 3e.
   - **Explore** — from `specs/daily-suggestions.md` Step 2.
   - **Routines** — from `specs/daily-suggestions.md` Step 3.
   - **On This Day** *(optional)* — from `specs/daily-suggestions.md` Step 3b; omit if empty.
   - **Loose Ends** *(optional)* — from `specs/daily-suggestions.md` Step 3c; omit if empty.
   - **This Week's Theme** *(optional)* — from `specs/daily-suggestions.md` Step 4; omit if empty.
   - **Question for Today** — from `specs/daily-suggestions.md` Step 3d; omit if empty.
   - **New Notes** — notes created or substantially updated this session **that are not already surfaced in What's New** (typically atomic notes, MOCs, and enriched notes; What's New already covers new source and finalized research notes). **Omit if empty** — never repeat a note that already appears in What's New. Always last.
3. Assemble in this canonical order:
   1. Check-in
   2. What's New
   3. Explore
   4. Routines
   5. On This Day *(if any)*
   6. Loose Ends *(if any)*
   7. This Week's Theme *(if any)*
   8. Question for Today
   9. New Notes
4. Write (or fully rewrite if `agent_generated`) `$VAULT_PATH/Recap <date>.md`:

```markdown
---
agent_generated: true
agent_last_touched: YYYY-MM-DDThh:mm:ssZ
---

# Recap YYYY-MM-DD

## Check-in
Focus this week?
- [ ] Topic A

<!-- steering: unprocessed -->

## What's New
- [[Source Title]] · <source> · YYYY-MM-DD — abstract → [[Concept]]

## Explore
- [Resource](url) — why it connects to recent notes
- [[Concept Gap]] — stub worth creating

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
<!-- only notes NOT already in What's New (atomic / MOC / enriched); omit this section if none -->
- [[Note A]] — one-liner
- [[Note B]] — one-liner
```

5. Stamp `agent_last_touched` (see `skills/classify-note.md`).

**Checkbox rule**: one `- [ ]` per line — Obsidian renders a checkbox only when the box is alone on its own line; never put two boxes on one line or text before a box.

---

## Link

Ensure the daily note's agent zone contains exactly `[[Recap <date>]]`:

1. Open `$VAULT_PATH/<date>.md`. If it does not exist, skip (log `RECAP_SKIPPED: missing daily note <date>`).
2. Locate the agent zone boundary (`\n---\n## Agent`). If absent, append the boundary after all user content.
3. Replace everything from the boundary onward with:

```
---
## Agent — YYYY-MM-DD HH:MM

[[Recap YYYY-MM-DD]]
```

The user zone above the boundary is **never touched**. This replacement is the sole agent write into any daily note. Sibling agent links (weekly/monthly review notes) surface in the recap's `## New Notes`, not in the daily note's agent zone.

---

## Freeze

A recap dated `< today` is frozen:

| State | Action |
|-------|--------|
| Recap exists (past date) | Do not edit — log `PAST_RECAP_FROZEN: <date>` |
| Recap missing, daily note exists | Regenerate once (Build/Refresh cold run using that day's state), then freeze — log `REGENERATED: Recap <date>` |
| Recap missing, daily note also missing | Log `RECAP_SKIPPED: missing daily note <date>`; invent nothing |

---

## Pre-generate tomorrow

Ensure `$VAULT_PATH/Recap <tomorrow>.md` exists with a fresh `## Check-in` before the session ends. **Idempotent** — skip silently if the file already exists.

1. Compute tomorrow's date (today + 1 day, ISO 8601: `YYYY-MM-DD`).
2. Check whether `$VAULT_PATH/Recap <tomorrow>.md` exists.
   - If it exists: log `PRE_GEN_SKIPPED: Recap <tomorrow> already exists`; stop.
3. Call `skills/check-in.md` Generate (tier=daily) to produce a `## Check-in` block.
4. Write `$VAULT_PATH/Recap <tomorrow>.md`:

```markdown
---
agent_generated: true
agent_last_touched: YYYY-MM-DDThh:mm:ssZ
---

# Recap <tomorrow>

## Check-in
<generated check-in block from step 3>
```

5. Log `PRE_GEN: created Recap <tomorrow>`.

This procedure is called by Loop Phase 6 (CLEANUP).
