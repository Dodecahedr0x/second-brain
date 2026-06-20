# Skill: Scan Inbox

**Used in**: Loop Phase 1 (OBSERVE)

## Purpose

Identify all vault content that needs processing: new files, modified files, and inbox-tagged notes.

## Procedure

```
1. Read Agent Operation Log → get last_run_timestamp (T)

2. Find modified files:
   find $VAULT_PATH -name "*.md" -newer <T> -not -path "*/.obsidian/*"

3. Find inbox-tagged files:
   grep -rl "#inbox\|#raw" $VAULT_PATH --include="*.md"

4. Find yesterday's daily note:
   YESTERDAY=$(date -d yesterday +%Y-%m-%d)
   - Target: $VAULT_PATH/$YESTERDAY.md
   - Include regardless of whether it has already been processed — always extend it
   - If the file does not exist, skip (user did not write a note yesterday)

5. Merge and deduplicate all three lists → change set

6. Sort by: inbox-tagged first, then yesterday's daily note, then oldest-modified first
```

## Output Format

```
CHANGE_SET:
- [inbox] $VAULT_PATH/Inbox/raw-note.md
- [modified] $VAULT_PATH/2026-06-20.md
- [daily] $VAULT_PATH/2026-06-19.md
```

## Edge Cases

- If `last_run_timestamp` is missing → treat ALL vault files as new (bootstrap mode)
- If vault is empty → return empty change set, skip to Phase 6
- If a file is both modified AND inbox-tagged → list once, mark both flags

## Time Complexity Note

For vaults with >500 notes, limit the modified-files slice to the 20 oldest items and log a warning. Yesterday's daily note is always included regardless of this limit.
