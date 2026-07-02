# Spec: Vault Reconcile

**Trigger**: Phase 1 of every loop (`mode=continuous`) and setup's first-pass bootstrap (`mode=full-backfill`).

## Purpose

Keep a co-owned vault coherent without churn.

- The user owns daily-note input zones and any note without agent frontmatter.
- The agent owns durable machine state and scratch files under the `Agent/` folder hierarchy.
- Flat root knowledge notes with `agent_generated: true` are co-owned: the agent may keep improving them, but user edits are preservation-sensitive.
- Past daily recaps are frozen after their calendar day passes.

---

## Modes

### Continuous mode

Run every scheduled loop. Work only from the current change set plus need-driven repairs.

Targets:
1. Today's daily note and today's recap/agent zone.
2. Notes modified since `last_run_timestamp`.
3. `#inbox`, `#raw`, `#stub`, `#queued`, and active research notes.
4. Missing derived notes whose seed/source still exists.
5. Regular `agent_generated` / `agent_augmented` knowledge notes when the current action can improve them.

Skip:
- Complete past daily recaps.
- Stable user-owned notes unless they are in the current change set and the active spec only reads them.
- Any regeneration that would duplicate, rename, move, or delete a note.

### Full-backfill mode

Run during setup's first pass or an explicit bootstrap request. It catches the vault up once, then stops.

Targets:
1. Create missing agent-owned folder skeleton (per AGENTS.md initialization).
2. Create missing agent-managed notes from templates.
3. Index existing vault notes.
4. Regenerate missing flat root source/atomic/MOC/research notes only when their seed/source still exists and no duplicate exists at either the flat root path or legacy folder path.
5. Finalize any missing past recap once, then freeze it.

Idempotency requirements:
- Rerunning setup on an existing vault fills gaps only.
- Never duplicate notes.
- Never clobber `agent_augmented: true` notes.
- Never move legacy `Sources/`, `Atomic/`, `MOCs/`, or `Research/` notes automatically.
- Never rewrite a complete past recap.

---

## Recap Lifecycle

| Note | Behavior |
|------|----------|
| Today's daily note / recap | Working note; refresh the agent zone every run |
| Past daily recap exists | Frozen; do not edit |
| Past daily recap missing but daily note exists | Regenerate once from that daily note, mark complete, then freeze |
| Past daily note missing | Log `RECAP_SKIPPED: missing daily note`; do not invent content |

---

## Regular Knowledge Notes

Regular flat root notes can keep improving over time.

Before editing an existing generated note:
1. Read frontmatter.
2. If `agent_augmented: true`, preserve user-authored sections and use additive edits only.
3. If `agent_generated: true`, compare content/mtime against `agent_last_touched`; if changed after that timestamp, switch/add `agent_augmented: true` before editing.
4. Refresh `agent_last_touched` on every agent edit.
5. Keep the note at its current path; do not move root notes into folders or folder notes into root.

Allowed improvements:
- Add net-new sourced facts.
- Add missing wikilinks/backlinks.
- Add references.
- Resolve `#stub` with verified content.
- Update MOC membership.
- Advance active research notes.

---

## Per-Class Routing

Run `skills/classify-note.md` before every write. Routing targets are agent notes or the recap — never user content.

| Class | Action |
|-------|--------|
| `user` (daily note) | Ensure recap link via `skills/recap.md` Link; extract URL/concept seeds; otherwise read-only — never write |
| `agent_generated` / `agent_augmented` | Enrich / atomize / clean / fetch+source_create / explore — need-driven, augment-preserving (run augment-check per `skills/classify-note.md`) |
| `agent_managed` | Dedicated update per the relevant spec; Phase 0 recreates missing notes |

Cap (continuous mode): at most **5** need-driven repairs per run beyond the change set.

Seed rule: regenerate a missing note only if its seed still exists — source URL still referenced in a note; concept recurs in vault; research question still open; daily note exists for a recap. Seed gone → `REGENERATE_SKIPPED`.

---

## Duplicate / Missing-Note Guard

For every note to create:
1. Compute the new flat root path: `$VAULT_PATH/<Title>.md`.
2. Compute legacy candidates for its type:
   - `Sources/<Title>.md`
   - `Atomic/<Title>.md`
   - `MOCs/<Title>.md`
   - `Research/<Title>.md`
3. If any candidate exists, update/link the existing note instead of creating a duplicate.
4. If none exists and the seed/source still exists, create the flat root note.
5. If the seed/source is missing, log `REGENERATE_SKIPPED: <title> — missing seed`.

---

## Daily Note as Entry Point

The **only** agent write into a daily note is the recap link. Follow `skills/recap.md` Link procedure:

- Preserve the user input zone exactly.
- Replace the agent zone with `[[Recap YYYY-MM-DD]]` only — all sections (What's New, Explore, Routines, New Notes, etc.) live in `Recap YYYY-MM-DD`.
- Extract URL bullets and concept mentions from the user zone as seeds for knowledge-note creation.

---

## Required Logging

Log in `Agent Operation Log`:

```text
RECONCILE_MODE: continuous|full-backfill
REGENERATED: <note> — <seed>
REGENERATE_SKIPPED: <note> — <reason>
AUGMENTED_PRESERVED: <note>
PAST_RECAP_FROZEN: <date>
```

Full-backfill sessions must end with a summary count:

```text
BACKFILL_SUMMARY: indexed=N created=N regenerated=N skipped=N preserved=N
```
