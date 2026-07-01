# Skill: Check-in

**Used in**: daily-note pre-generation + `specs/weekly-review.md` / `specs/monthly-review.md` (generate); loop OBSERVE (read-back).

Generate positive-confirmation check-in questions from `Agent Interest Model`, and read the user's ticks back into steering updates. Which topics get asked depends on the `tier`.

## Tiers (which topics to ask about)

| tier | topics asked | checked tick |
|------|--------------|--------------|
| daily | `Focus ★` topics + `probationary` topics | `focus` or `promote` |
| weekly | faded (`established`, `Last seen` 7–21d) | `refresh` |
| monthly | dormant (`established`, `Last seen` > 21d) | `refresh` |

Ask at most 3 items per check-in (highest-weight first). Omit the section if none qualify.

## Generate

Emit a daily section like:

```markdown
## Agent Feedback

- [ ] Focus more on [[Topic A]] this week
- [ ] Keep tracking [[Topic B]]
- [ ] Revisit [[Topic C]]
<!-- steering: unprocessed -->
```

For weekly/monthly review notes, use `## Interest Check-in` but keep the same checkbox semantics.

Every generated box is **positive-confirmation only**:
- checked = yes, keep / promote / focus / refresh this topic.
- unchecked = neutral.
- do not generate negative, deprioritization, or drop boxes.

## Read-back

Given a check-in section not yet marked processed:
- Collect checked boxes; map each to `{promote | focus | refresh}` by its label and tier.
- Return `{promote, focus, refresh, drop}` for `skills/update-interest-model.md` Step 4; generated check-ins normally return `drop: []`.
- Mark the section processed by replacing `<!-- steering: unprocessed -->` with `<!-- steering: processed YYYY-MM-DD -->`.
- **Do not un-tick the user's boxes** — their marks stay visible; the processed marker prevents re-applying.

## Guardrails

- Unchecked = neutral; never treat a skipped box as a negative.
- Generated check-ins are capped at 3 boxes.
- Read-back applies a section at most once (guard on the processed marker).
- Direct veto/deprioritization is handled in `Agent Interest Model` via `mute`, not via generated daily checkboxes.
