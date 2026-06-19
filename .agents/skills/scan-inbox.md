# Skill: Scan Inbox

**Used in**: Loop Phase 1 (OBSERVE)

## Purpose

Identify all vault content that needs processing: new files, modified files, and inbox-tagged notes.

## Procedure

```
1. Read memory/vault-index.md → get last_run_timestamp (T)

2. Find modified files:
   find ../Vault -name "*.md" -newer <T> -not -path "*/.obsidian/*"

3. Find inbox-tagged files:
   grep -rl "#inbox\|#raw" ../Vault --include="*.md"

4. Find unprocessed daily notes:
   - List files matching YYYY-MM-DD.md pattern
   - Exclude those containing "Processed by agent" in their content

5. Merge and deduplicate all three lists → change set

6. Sort by: inbox-tagged first, then newest-modified first
```

## Output Format

```
CHANGE_SET:
- [inbox] ../Vault/Inbox/raw-note.md
- [modified] ../Vault/2026-06-20.md
- [unprocessed-daily] ../Vault/2026-06-19.md
```

## Edge Cases

- If `last_run_timestamp` is missing → treat ALL vault files as new (bootstrap mode)
- If vault is empty → return empty change set, skip to Phase 6
- If a file is both modified AND inbox-tagged → list once, mark both flags

## Time Complexity Note

For vaults with >500 notes, limit the change set to the 20 oldest unprocessed items and log a warning.
