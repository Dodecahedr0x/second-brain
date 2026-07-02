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
   - **Check-in** — call `skills/check-in.md` (tier=daily); top section.
   - **What's New** — from `specs/daily-suggestions.md` Step 3e.
   - **Explore** — from `specs/daily-suggestions.md` Step 2.
   - **Routines** — from `specs/daily-suggestions.md` Step 3.
   - **Question for Today** — from `specs/daily-suggestions.md` Step 3d.
   - **New Notes** — notes created or substantially updated this session.
3. Assemble in the order above.
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

## Question for Today
> Specific open question derived from this week's theme or a stub note.

## New Notes
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

The user zone above the boundary is **never touched**. This replacement is the sole agent write into any daily note.

---

## Freeze

A recap dated `< today` is frozen:

| State | Action |
|-------|--------|
| Recap exists (past date) | Do not edit — log `PAST_RECAP_FROZEN: <date>` |
| Recap missing, daily note exists | Regenerate once (Build/Refresh cold run using that day's state), then freeze — log `REGENERATED: Recap <date>` |
| Recap missing, daily note also missing | Log `RECAP_SKIPPED: missing daily note <date>`; invent nothing |
