# Skill: Check-in

**Used in**: `skills/recap.md` Build/Refresh (daily generation, top section of the recap); `specs/weekly-review.md` / `specs/monthly-review.md` (generate); loop ORIENT (read-back from today's recap).

Generate positive-confirmation check-in questions from `Agent Interest Model`, and read the user's ticks back into steering updates. Which topics get asked depends on the `tier`.

For daily use: the `## Check-in` section is the **top section of the recap** (`$VAULT_PATH/YYYY-MM-DD Recap.md`), not the daily note. Read-back reads today's recap. Pre-generation for tomorrow: call `skills/recap.md` **Pre-generate tomorrow** before the session ends.

## Tiers (which topics to ask about)

| tier | topics asked | questions |
|------|--------------|-----------|
| daily | `Focus ★` topics + `probationary` topics | "Focus this week?" (focus), "Keep tracking?" (probationary) |
| weekly | faded (`established`, `Last seen` 7–21d) | "Still into these?" (refresh) |
| monthly | dormant (`established`, `Last seen` > 21d) | "Revisit? / Drop?" (refresh / drop) |

Ask at most 4 items per check-in (highest-weight first). Omit the section if none qualify.

## Generate

Emit — **one checkbox per line**. Obsidian only renders `- [ ]` as a task when the box is alone on its own line; never put two boxes on one line or any text before the `- [ ]`. Each question is a plain label line above its checkbox group, with a blank line between groups:
```markdown
## Check-in
Focus this week?
- [ ] Topic A
- [ ] Topic B

Keep tracking?
- [ ] Topic C (new)

Drop?
- [ ] [[Topic E]]

<!-- steering: unprocessed -->
```
Only render the groups relevant to the tier. Every box is **positive-confirmation** (checked = yes); `drop` boxes are the only negative. Leave the `<!-- steering: unprocessed -->` marker at the end of the section.

## Read-back

Source for daily read-back: the `## Check-in` section of **today's recap** (`$VAULT_PATH/YYYY-MM-DD Recap.md`), not the daily note.

Given a `## Check-in` section not yet marked processed:
- Collect checked boxes; map each to `{promote | focus | refresh | drop}` by its question label (see the daily/weekly/monthly rows above).
- Return the four lists for `skills/update-interest-model.md` Step 4.
- Mark the section processed by replacing `<!-- steering: unprocessed -->` with `<!-- steering: processed YYYY-MM-DD -->`. **Do not un-tick the user's boxes** — their marks stay visible; the processed marker prevents re-applying.

## Guardrails

- **One checkbox per line** — each `- [ ]` alone on its own line (Obsidian requirement); never inline multiple boxes or put text before a box.
- Unchecked = neutral; never treat a skipped box as a negative.
- Read-back applies a section at most once (guard on the processed marker).
- Direct veto/deprioritization is handled in `Agent Interest Model` via `mute`, not via generated checkboxes.
