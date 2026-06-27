# Skill: Agent-Managed Notes

**Used in**: Initialization (AGENTS.md step 3-4), Phase 6 CLEANUP, Abort Protocol

How to create, read, and write the five agent-managed vault notes. See `context/agent-notes.md` for the naming and marker convention.

---

## Initialisation

Before each session, check that all five notes exist in `$VAULT_PATH`. If any is missing, create it from the template below before proceeding.

---

## Agent Vault Index

**Purpose**: Registry of all vault notes. Read in Phase 2; written in Phase 6.

### Template

```markdown
---
agent_managed: true
---

# Agent Vault Index

**Last updated**: YYYY-MM-DD
**last_indexed_at**: YYYY-MM-DDThh:mm:ssZ

## Note Registry

| File | Title | Tags | Key Concepts | Last Modified |

## MOC Registry

*(No MOCs yet.)*

## Orphan Watch

*(Notes with no outbound wikilinks.)*

---
*Machine-maintained. Do not edit manually.* #agent-system
```

### Update (Phase 6)

- Add new notes as rows in Note Registry
- Append `[UPDATED YYYY-MM-DD]` to the row of any enriched note
- Move notes from Orphan Watch once they gain a wikilink
- Update `last_indexed_at` to current ISO 8601 time (informational only; `Agent Operation Log` is authoritative for `last_run_timestamp`)

---

## Agent Concept Gaps

**Purpose**: Concepts referenced in the vault that have no atomic note yet. Read in Phase 3; written in Phase 2 and Phase 6.

### Template

```markdown
---
agent_managed: true
---

# Agent Concept Gaps

| Concept | First seen in | Priority | Status |
|---------|--------------|----------|--------|

## Priority Guide

- **High**: Referenced in 3+ notes, or core to understanding other notes
- **Medium**: Referenced once, clearly a standalone concept
- **Low**: Passing mention, needs more context

---
*Machine-maintained. Do not edit manually.* #agent-system
```

### Update

- Add row when a new concept gap is found (Phase 2 / Phase 6)
- Set Status to `Created` when an atomic note is generated; remove the row next session

---

## Agent Operation Log

**Purpose**: Session history and `last_run_timestamp`. Read in Phase 1; written in Phase 4 (per-action) and Phase 6 (session summary).

### Template

```markdown
---
agent_managed: true
---

# Agent Operation Log

Newest entries at top.

---
*Machine-maintained. Do not edit manually.* #agent-system
```

### Per-action entry (Phase 4, appended under the current session header)

```
[TIMESTAMP] ACTION_TYPE: <file> — <one-line rationale>
```

### Session summary (Phase 6, prepended after the header line)

```markdown
## Session YYYY-MM-DD

**Type**: Ingestion | Connection | Generation | Maintenance
**Items processed**: N
**Actions taken**: N
**Deferred**: N

[per-action entries]

**next_run_hint**: what to prioritise next
**last_run_timestamp**: YYYY-MM-DDThh:mm:ssZ
```

### Reading `last_run_timestamp`

Scan for the most recent `last_run_timestamp:` line in the file. If absent, treat all vault files as new (bootstrap mode).

---

## Agent User Profile

**Purpose**: Observed facts about this vault's owner. Read during Phase 2 to inform how notes are enriched; written whenever new patterns are observed.

### Template

```markdown
---
agent_managed: true
---

# Agent User Profile

Observed facts only — no speculation.

## Writing Style

## Known Topics

## Preferences

---
*Machine-maintained. Do not edit manually.* #agent-system
```

### Update

Add bullet points under the relevant section when new patterns are observed. Never remove existing entries unless they are directly contradicted by newer evidence.

---

## Agent Discovery Log

**Purpose**: Dedup ledger for proactive discovery. Records every URL surfaced and per-topic coverage markers so the hourly loop never re-surfaces the same item. Read in `specs/discovery.md` (dedup filter + rotation); written to this note after each emit (see `specs/discovery.md`).

### Template

```markdown
---
agent_managed: true
---

# Agent Discovery Log

## Surfaced

| Date | Source | Normalized URL | Topic | Note | Discussion |
|------|--------|----------------|-------|------|------------|

## Topic Coverage

| Topic | last_covered | pass |
|-------|--------------|------|

---
*Machine-maintained. Do not edit manually.* #agent-system
```

### Update (`specs/discovery.md`)

Rows are appended as **markdown table rows** matching the column headers above — never as bullet-list items.

- After emitting a candidate, add a row to `## Surfaced` with the normalized URL and the source note it became.
- After covering a topic, upsert its `## Topic Coverage` row with today's date and the pass name.
- **URL normalization** (apply before any compare or store): lowercase host, strip `www.`, strip `?query` and `#fragment`, strip trailing `/`.
