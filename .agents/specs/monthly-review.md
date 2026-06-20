# Spec: Monthly Review

**Trigger**: Scheduled (first of each month, 08:00 local time) or manual run. Looks back at the 30 days ending yesterday.

**Goal**: Surface unusual/niche topics from the past month — concepts that appeared briefly but deserve deeper exploration. Find fresh external content for them, wire them into MOCs, and prepare new angles for revisiting past work.

---

## Output Location

Write a new note: `$VAULT_PATH/Monthly Review — YYYY-MM.md`
(e.g. `Monthly Review — 2026-06.md`)

Create the file fresh each run. If it already exists, replace it in full.

---

## Output Template

```markdown
# Monthly Review — YYYY-MM
*YYYY-MM-01 → YYYY-MM-DD*

## Unusual Topics Worth Revisiting
<!-- Low-frequency concepts: appeared in ≤ 2 notes but intellectually interesting -->
- [[Concept]] — appeared N times · [[Related Note]]

## Fresh Resources Added
<!-- External resources found and added to atomic notes this session -->
- [[Concept]]: [Resource Title](url) — one-line reason it's worth reading

## New Exploration Angles
<!-- An alternative question or adjacent concept for each niche topic -->
- [[Concept]] → explore: "framing question or adjacent concept"

## MOCs Updated
<!-- MOCs created or extended this session -->
- [[Topic MOC]] — N notes added

---
Tags: #monthly-review
```

Omit any section with no entries.

---

## Phase Integration Map

| Loop Phase | Work Added by This Spec |
|------------|------------------------|
| Phase 1 OBSERVE | Collect all notes created/updated in the past 30 days from `Agent Vault Index` |
| Phase 2 ORIENT | Identify low-frequency concepts (≤ 2 notes); rank by intellectual interest heuristic; read existing MOCs for the niche topics |
| Phase 3 DECIDE | Plan: up to 5 niche concepts to research; FETCH for each; MOC updates; exploration angle per concept |
| Phase 4 ACT | Call `skills/find-resources.md` per niche concept; add resources to atomic notes; update/create MOCs; write review note |
| Phase 5 VERIFY | Review note exists; all wikilinks valid; all added resources verified (not fabricated); MOCs internally consistent |
| Phase 6 CLEANUP | Log session in `Agent Operation Log`; update `Agent Vault Index` for any enriched notes and MOC changes |

---

## Steps

### 1. Collect the Month's Inventory

From `Agent Vault Index`:
- Collect all notes created or updated in the 30-day window
- Count total notes per concept/tag → build a frequency table

### 2. Identify Niche Concepts

A **niche concept** is one that:
- Appears in ≤ 2 notes across the 30-day window, AND
- Is not already well-represented in a MOC (< 3 MOC entries), AND
- Has at least one atomic note (not a pure concept gap — those are stubs, not worth external research yet)

Rank niche candidates:
1. Has an existing atomic note with a `## References` section that has < 2 entries (most underexplored)
2. Was mentioned in a daily note as something the user found interesting (wikilink inside a descriptive bullet, not just a task)
3. Has a concept gap open for > 14 days (long-standing curiosity)

Pick up to 5 niche concepts. If fewer than 2 qualify, widen the frequency threshold to ≤ 4 notes.

### 3. Find Fresh Resources

For each selected niche concept, call `skills/find-resources.md`:
- Bias queries toward recent content (add "2025 OR 2026" to search queries)
- Collect up to 2 resources per concept
- Pass the concept's existing `## References` URLs as `existing_refs` to avoid duplicates

### 4. Enrich Atomic Notes

For each concept with found resources:
1. Open the concept's atomic note
2. Append each resource under `## References`:
   ```markdown
   - [Title](url) — one-sentence annotation
   ```
3. Log: `[TIMESTAMP] ENRICH: [[Concept]] — 1 reference added from monthly review`

### 5. Update MOCs

For each niche concept:
1. Check `Agent Vault Index` MOC Registry for an existing MOC covering this concept's topic
2. **If MOC exists**: call `skills/update-moc.md` to add the concept note if not already listed
3. **If no MOC exists AND ≥ 3 notes share the concept's primary topic**: create a new MOC via `skills/update-moc.md`
4. Do not create a MOC for a topic with < 3 notes — log as "MOC deferred: insufficient notes"

### 6. Generate Exploration Angles

For each niche concept, write one exploration angle: a question or adjacent concept that would naturally extend what's already in the note.

Heuristics:
- If the note covers *what* something is → angle is *how* it works or *when* to use it
- If the note covers a tool → angle is a competing tool or a use-case study
- If the note covers a theory → angle is an empirical example or a criticism

Format: a short question or a `[[wikilink]]` to a concept that doesn't exist yet (intentional forward link).

### 7. Write the Review Note

Assemble the template. Write the file.

Log:
```
[TIMESTAMP] MONTHLY_REVIEW: wrote Monthly Review — YYYY-MM.md — N niche concepts, N resources added, N MOCs updated
```

---

## Constraints

- Limit to 5 niche concepts and 10 total external fetches per session — stay within budget
- Never fabricate resources — all URLs must pass the lightweight verify step in `skills/find-resources.md`
- Do not delete or overwrite existing `## References` entries — append only
- Exploration angles may include forward wikilinks to notes that don't exist yet (intentional; seeds future work)
- Do not process the regular inbox during a monthly review run — this is a dedicated retrospective session
