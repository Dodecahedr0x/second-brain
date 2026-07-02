# Skill: Classify Note

**Used in**: Any write operation — call before touching any vault note.

## Purpose

Return the ownership class of a note and enforce write rules. Every agent write must call this skill first.

## Classify Procedure

```
1. Read the note's frontmatter.
2. If `agent_managed: true`  → class = agent_managed  (stop)
3. If `agent_augmented: true` → class = agent_augmented (stop)
4. If `agent_generated: true` → run augment-check; class = agent_generated or agent_augmented
5. No ownership tag          → class = user
```

## augment-check

Run before rewriting any `agent_generated` note:

```
1. Get real file mtime (stat --format=%Y or equivalent).
2. Read `agent_last_touched` from frontmatter (ISO 8601 UTC → epoch).
3. If mtime > agent_last_touched:
   a. Add `agent_augmented: true` to frontmatter.
   b. Switch to additive-only mode (append new sections; never overwrite existing content).
   c. Class becomes agent_augmented.
4. Else: class stays agent_generated; full rewrite is permitted by spec.
```

## stamp `agent_last_touched`

Run on every agent edit to an `agent_generated` or `agent_augmented` note:

```
Set frontmatter field: agent_last_touched: <current ISO 8601 UTC timestamp>
Format: YYYY-MM-DDThh:mm:ssZ
```

## Write-gate

| Class | Rule |
|-------|------|
| `user` | **Read-only. Never write.** |
| `agent_generated` | Agent may edit. Run augment-check first. Stamp `agent_last_touched` on every edit. |
| `agent_augmented` | Additive only — preserve all existing content. Append new sections only. Stamp `agent_last_touched`. |
| `agent_managed` | Agent writes per the relevant spec (e.g., `specs/reconcile.md`). |
