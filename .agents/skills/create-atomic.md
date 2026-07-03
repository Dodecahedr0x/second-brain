# Skill: Create Atomic Note

**Used in**: Loop Phase 4 (ACT) — generation actions

## Purpose

Create a well-formed atomic note for a concept, following the standard template from `specs/generation.md`.

## Pre-Creation Checks

1. Confirm the concept is in `Agent Concept Gaps` or was extracted this session
2. Confirm no file named `<Concept>.md` already exists in the vault
3. Confirm the concept has enough information to write at minimum a stub (title + 1 sentence)

## Gather (depth + breadth) — do this before writing

A single source makes a shallow note. Unless the current session already fetched enough (e.g. from a research hop):

1. Pull the concept from **≥2 sources of different kinds** via the search skills — `skills/search-wikipedia.md` for the foundational definition, plus one of `skills/search-arxiv.md` / `skills/search-web.md` / `skills/search-youtube.md` / `skills/search-reddit.md` for mechanism, current practice, or discussion. Fetch each via `skills/fetch-url.md`.
2. **Depth**: synthesize what it is, *how it works*, a key distinction/trade-off, and an example from across the sources — not a lone definition.
3. **Breadth**: list the related concepts it connects to; wikilink them inline, and add any important ones that lack a note to `Agent Concept Gaps` so exploration keeps widening from this note.

## Template

```markdown
---
agent_generated: true
agent_last_touched: YYYY-MM-DDThh:mm:ssZ
---

# {Concept Name}

{2–4 sentence summary — what it is and what it's for. Facts only, no speculation. Wikilink related concepts inline. If unknown, write "Details pending — stub note."}

## How It Works

- {Mechanism, key property, or distinction — substantive; wikilink related concepts}
- {A trade-off or comparison to [[Alternative]]}

## Examples

- {Concrete example or application, if known}

## References

- {2+ sources of different kinds where available; or "From: [[Source Note]]"}

## See Also

- [[Related Note]]

---
Tags: #{topic} #atomic
```

**Depth & breadth**: aim past a one-line definition (how it works + a distinction/example, from ≥2 different kinds of source where available), wikilink every related concept inline, and add important new sub-concepts to `Agent Concept Gaps`. **No `## Context` section** — placement comes from the wikilinks + backlinks, not prose.

## File Creation Steps

```
1. Determine filename: `<Concept Name>.md` at the vault root (Title Case, spaces not underscores)
2. Apply the Duplicate / Missing-Note Guard from `specs/reconcile.md` (checks flat root and legacy `Atomic/<Concept Name>.md`). If an existing note is found, run `skills/classify-note.md` augment-check; if `agent_augmented`, additive edits only. Stamp `agent_last_touched` after editing. Skip creation if a duplicate exists.
3. Write file using template
4. Append to Agent Vault Index:
   | <filename> | <title> | #atomic #<topic> | <key concepts> | <today's date> |
5. Remove concept from Agent Concept Gaps (or mark status: Created)
6. Log: [TIMESTAMP] ATOMIC_CREATED: <filename> — <one-line rationale>
```

## Stub vs Full Note Decision

| Information available | Action |
|-----------------------|--------|
| Only name known | Create stub with `#stub` tag |
| Name + 2+ facts | Create full atomic note |
| Name appears in source note | Extract facts from source, fill template |

## Quality Check

- [ ] File does not already exist
- [ ] Note has at least one `[[wikilink]]` to another note
- [ ] Tags include `#atomic`
- [ ] If stub: includes `#stub` tag and "Details pending" text
- [ ] Filename matches exactly how it's referenced in other notes' wikilinks
