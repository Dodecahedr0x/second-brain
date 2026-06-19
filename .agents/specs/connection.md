# Spec: Note Connection

**Trigger**: A note exists without wikilinks to related notes, OR new notes were created and existing notes should reference them.

## Connection Types

| Type | Syntax | When to Use |
|------|--------|-------------|
| Concept reference | `[[Concept Name]]` | When a note mentions a concept that has its own note |
| Related note | `## See Also\n- [[Note]]` | When two notes are thematically related but not directly referencing |
| MOC membership | Add to `[[MOC Name]]` | When 3+ notes share a topic and a MOC exists |
| Backlink hint | Add `## Referenced By` section | On atomic notes, list notes that link to them |

## Connection Process

1. Load `memory/vault-index.md` — get list of all existing notes and their key concepts
2. For the target note, extract its concepts (from headings, bold terms, named entities)
3. For each concept: check if a note exists with that name → if yes, insert `[[Note Name]]` at first mention
4. Search other notes for references to THIS note's title → add `[[This Note]]` to them
5. If 3+ notes share the target's primary topic and no MOC exists → flag for MOC creation (`skills/update-moc.md`)

## Rules

- Insert wikilinks **inline** at the first mention of a concept per note — do not add a separate links section unless using "See Also"
- Never duplicate a wikilink within the same note (first mention only)
- Never add a link that changes the meaning of a sentence
- Do not link common words (days of the week, generic verbs, etc.)

## Quality Gate

- [ ] All inserted wikilinks point to files that exist
- [ ] No sentence meaning was altered by link insertion
- [ ] The note reads naturally — links are inline, not appended as a list (except See Also)
