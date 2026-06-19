# Skill: Create Atomic Note

**Used in**: Loop Phase 4 (ACT) — generation actions

## Purpose

Create a well-formed atomic note for a concept, following the standard template from `specs/generation.md`.

## Pre-Creation Checks

1. Confirm the concept is in `memory/concept-gaps.md` or was extracted this session
2. Confirm no file named `<Concept>.md` already exists in the vault
3. Confirm the concept has enough information to write at minimum a stub (title + 1 sentence)

## Template

```markdown
# {Concept Name}

{One-paragraph summary. Facts only, no speculation. If unknown, write: "Details pending — stub note."}

## Key Properties

- {Property or characteristic}
- {Property or characteristic}

## Context

{How this concept relates to other notes in the vault. What broader topic does it belong to?}

## References

- {Source, URL, or "From: [[Source Note]]"}

## See Also

- [[Related Note 1]]
- [[Related Note 2]]

---
Tags: #{topic} #atomic
```

## File Creation Steps

```
1. Determine filename: <Concept Name>.md (Title Case, spaces not underscores)
2. Determine location:
   - If a matching topic folder exists → place there
   - Otherwise → vault root
3. Write file using template
4. Append to memory/vault-index.md:
   | <filename> | <title> | #atomic #<topic> | <key concepts> | <today's date> |
5. Remove concept from memory/concept-gaps.md (or mark status: Created)
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
