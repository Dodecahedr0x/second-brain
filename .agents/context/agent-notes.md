# Agent-Managed Notes

Agent-managed notes live in the vault like any user note but carry a marker so they can be identified and filtered.

## Marker

```yaml
---
agent_managed: true
---
```

Every agent-managed note must have this frontmatter property. Tag `#agent-system` is also added at the bottom.

## Standard Notes

| Note | Purpose |
|------|---------|
| `Agent Vault Index` | Registry of all vault notes — updated every session |
| `Agent Concept Gaps` | Concepts referenced but not yet having their own note |
| `Agent Operation Log` | Session history and `last_run_timestamp` |
| `Agent User Profile` | Observed user preferences and writing patterns |
| `Agent Discovery Log` | Surfaced discovery URLs + per-topic coverage markers (dedup ledger) |
| `Agent Interest Model` | Co-owned topic table (weights, status, focus) steering autonomous effort |
| `Agent Research Log` | Active research session (driving question, checklist, frontier, findings) + seed queue + completed index |

## Rules

- Agents may freely read and write these notes, including section-level rewrites when needed
- Users should not edit them manually (agents may overwrite) — **exception**: `Agent Interest Model` is co-owned; user edits (weights, `pin`/`mute`, added rows) are authoritative input, not overwritten.
- Never delete them — reset their content instead
- If a note is missing, create it from scratch during Phase 0 before proceeding
