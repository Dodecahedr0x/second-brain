# Skill: Link Notes

**Used in**: Loop Phase 4 (ACT) — connection actions

## Purpose

Insert wikilinks into a note where concepts are mentioned but not yet linked.

## Procedure

```
1. Load parse result for the target note (from skills/parse-content.md)
2. Load Agent Vault Index — get list of all note titles

3. For each concept in parse result:
   a. Check if an exact match exists in vault-index (case-insensitive)
   b. Check if a partial match exists (e.g., "Sync" matches "Syncthing")
   c. If match found:
      - Find first occurrence of the concept text in the note body
      - Replace with [[Note Title]] (use exact note title, not concept text if different)
      - Do not replace subsequent occurrences

4. Check: does the note itself have any existing notes referencing its title?
   a. Search vault-index for notes that mention this note's title in their concepts
   b. For each such note, open it and add [[This Note]] at first mention

5. Write the modified note back to disk
```

## Link Text Rules

- If the displayed text should differ from the note title: `[[Note Title|display text]]`
- Use display text when the wikilink would read awkwardly as the full title
- Never use display text just to avoid capitalizing a mid-sentence title — Obsidian handles this

## Validation Before Writing

- [ ] Count of wikilinks in modified note > count in original note
- [ ] No sentence was split or truncated during replacement
- [ ] All new `[[targets]]` exist in vault-index or are being created this session
- [ ] Diff the original vs modified note — no content was deleted

## Rollback

If validation fails: restore original file content, log LINK_FAILED with the specific check that failed.
