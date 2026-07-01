# Skill: Update Interest Model

**Used in**: Loop ORIENT — refresh `Agent Interest Model` each run from writing + check-in ticks.

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
