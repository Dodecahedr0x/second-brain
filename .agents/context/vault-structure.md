# Vault Structure & Conventions

**Vault path**: `$VAULT_PATH` (see `.env.local`)  
**Last observed**: 2026-06-19

## Current Structure

```text
$VAULT_PATH/
├── .obsidian/          ← FORBIDDEN: Obsidian config, never touch
├── .stfolder/          ← FORBIDDEN: Syncthing metadata, never touch
├── YYYY-MM-DD.md       ← Daily notes; user-owned input at top, agent check-in/agent zones below
├── <Title>.md          ← User notes and flat agent-generated knowledge notes
└── Agent/              ← Agent-owned machine state + temporary working files
```

## File Naming

| Content Type | Convention | Example |
|-------------|------------|---------|
| Daily notes | `YYYY-MM-DD.md` | `2026-06-19.md` |
| Source notes | `<Title Case>.md` | `Obsidian Agent Skills.md` |
| Atomic notes | `<Title Case>.md` | `Syncthing.md` |
| MOCs | `<Topic> MOC.md` | `Tools MOC.md` |
| Research notes | `<Short Research Title>.md` | `Agentic RAG Runtime.md` |
| Agent state notes | `Agent/Agent <Name>.md` | `Agent/Agent Operation Log.md` |
| Temporary agent files | `Agent/Temp/<Name>` | `Agent/Temp/fetch-context.json` |

## Note Structure

Daily notes have three zones. The user writes freely in the **input zone** (top); the agent owns the **Check-in** (positive-confirmation steering questions) and the **agent zone** (replaced each run).

```markdown
YYYY-MM-DD

- User bullet 1
- User bullet 2 with a [[wikilink]]

## Check-in
Focus this week?
- [ ] Topic A

Keep tracking?
- [ ] Topic C (new)
<!-- steering: unprocessed -->

---
## Agent — YYYY-MM-DD HH:MM
### What's New
...
```

Check-in checkboxes are **one per line** — Obsidian only renders `- [ ]` as a task when the box is alone on its own line (never inline two boxes or put text before a box). The question is a plain label line above its group.

Atomic notes use the template from `specs/generation.md`.

## Tags

| Tag | Meaning |
|-----|---------|
| `#inbox` | Unprocessed content, needs agent attention |
| `#raw` | Alternative inbox marker |
| `#processed` | Agent has processed this note |
| `#queued` | Deferred for next session |
| `#stub` | Placeholder note, incomplete |
| `#atomic` | Standalone concept note |
| `#moc` | Map of Content |
| `#action` | Contains tasks/todos |
| `#needs-review` | Too ambiguous for agent to process |

## Wikilink Conventions

- First mention of a concept in a note gets linked: `[[Concept]]`
- Subsequent mentions are NOT linked
- Display text used when title differs: `[[File Title|display text]]`

## Ownership Markers

- User-generated notes carry no ownership tag/frontmatter. The agent may read them but must not annotate or rewrite their user-authored content.
- Agent-owned notes live under `Agent/` (including `Agent/Temp/`) and carry `agent_managed: true` when durable; users should not edit them because agents may rewrite them.
- Agent-generated knowledge notes live flat at the vault root, carry `agent_generated: true` and `agent_last_touched: YYYY-MM-DDThh:mm:ssZ`, and are co-editable by user and agent.
- Before rewriting an agent-generated note, compare its file mtime/content against `agent_last_touched`. If the note was modified after that timestamp by something other than the current agent run, preserve the page, switch/add `agent_augmented: true`, keep `agent_generated: true`, refresh `agent_last_touched`, and limit edits to additive sections unless the active spec explicitly says otherwise.
- `agent_augmented: true` means the note started as agent-generated but now contains user edits; preserve it as a co-owned page, not disposable output.

## Flat Knowledge Boundary

The user selected a flat vault for knowledge notes. New source, atomic, MOC, and research notes MUST be created at `$VAULT_PATH/<Title>.md`, not in type folders.

Only these folders are agent-owned:

```text
$VAULT_PATH/Agent/       ← machine-written state notes
$VAULT_PATH/Agent/Temp/   ← temporary scratch/context files; safe to regenerate
```

Daily notes remain at the vault root because they are user-owned entrypoints. The agent may rewrite only the check-in and agent zones inside a daily note.

Regenerability invariant: agent-owned state/temp files under `Agent/` are disposable machine projections. Agent-generated root knowledge notes are not disposable once written; if the user edits one after `agent_last_touched`, it becomes `agent_augmented: true` and must be preserved.

Migration safety: never move, rename, or delete existing vault notes automatically. When reading existing vaults, check both the new flat root path and legacy folder paths (`Sources/`, `Atomic/`, `MOCs/`, `Research/`) to avoid duplicates. Create new knowledge notes only at the flat root.

## Obsidian Plugins Detected

*(None detected from current config — tracking as vault grows)*
