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
                   - [ ] drop [[Topic E]]
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
- Direct veto/deprioritization is handled in `Agent Interest Model` via `mute`, not via generated checkboxes.
