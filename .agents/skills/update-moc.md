# Skill: Update Map of Content (MOC)

**Used in**: Loop Phase 4 (ACT) — when 3+ notes share a topic

## Purpose

Create or update a Map of Content note that organizes multiple notes under a shared topic. MOCs are navigational hubs, not summaries.

## MOC Template (new MOC)

```markdown
---
agent_generated: true
agent_last_touched: YYYY-MM-DDThh:mm:ssZ
---

# {Topic} MOC

Overview of notes related to {Topic}.

## Notes

- [[Note 1]] — {one-line description}
- [[Note 2]] — {one-line description}
- [[Note 3]] — {one-line description}

## Sub-topics

- [[Sub-MOC 1]] (if applicable)

---
Tags: #moc #{topic}
```

## Procedure

### Creating a New MOC

```
1. Trigger condition: 3+ notes share a primary topic AND no MOC exists for it
2. Collect all notes in vault-index with that topic tag
3. Apply the Duplicate / Missing-Note Guard from `specs/reconcile.md` (checks flat root and legacy `MOCs/{Topic} MOC.md`). If an existing note is found, skip creation and go to "Updating an Existing MOC". Otherwise: Create file: `{Topic} MOC.md` at the vault root (`$VAULT_PATH/{Topic} MOC.md`).
4. Fill template with all relevant notes + one-line description each
5. In each listed note, add at bottom: "See also: [[{Topic} MOC]]"
6. Update Agent Vault Index: add MOC to MOC Registry
```

### Updating an Existing MOC

Run `skills/classify-note.md` augment-check before editing. If `agent_augmented`, additive edits only. Stamp `agent_last_touched` after every edit.

```
1. Open the existing MOC file
2. Find the "## Notes" section
3. Append the new note as: "- [[New Note]] — {one-line description}"
4. Keep the list sorted alphabetically (or by subtopic if the MOC has sections)
5. Do NOT remove existing entries unless a note was deleted (which agents don't do)
```

## MOC Naming Rules

- Format: `{Topic} MOC.md` at the vault root for new MOCs
- Topic should be a noun or noun phrase (not an adjective)
- Example: `Tools MOC.md`, `Productivity MOC.md`, `Programming MOC.md`

## Quality Check

- [ ] MOC contains only links to notes that exist
- [ ] No duplicate entries in the Notes list
- [ ] Each entry has a brief description
- [ ] The MOC itself is listed in `Agent Vault Index` under MOC Registry
- [ ] Notes added to MOC have a reciprocal "See also" link back to the MOC
