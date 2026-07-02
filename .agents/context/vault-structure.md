# Vault Structure & Conventions

**Vault path**: `$VAULT_PATH` (see `.env.local`)  
**Last observed**: 2026-06-19

## Current Structure

```
$VAULT_PATH/
├── .obsidian/          ← FORBIDDEN: Obsidian config, never touch
├── .stfolder/          ← FORBIDDEN: Syncthing metadata, never touch
├── YYYY-MM-DD.md       ← Daily notes; user-owned input at top, agent zone below
├── Sources/            ← Agent-created source/reference notes
├── Atomic/             ← Agent-created concept notes
├── MOCs/               ← Agent-created maps of content
├── Research/           ← Agent-created multi-hop research notes
└── Agent/              ← Agent-managed state notes
```

## Conventions Observed

### File Naming

| Content Type | Convention | Example |
|-------------|------------|---------|
| Daily notes | `YYYY-MM-DD.md` | `2026-06-19.md` |
| Source notes | `Sources/Title Case.md` | `Sources/Obsidian Agent Skills.md` |
| Atomic notes | `Atomic/Title Case.md` | `Atomic/Syncthing.md` |
| MOCs | `MOCs/Topic MOC.md` | `MOCs/Tools MOC.md` |
| Research notes | `Research/Short Research Title.md` | `Research/Agentic RAG Runtime.md` |
| Agent state notes | `Agent/Agent <Name>.md` | `Agent/Agent Operation Log.md` |

### Note Structure

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

### Tags

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

### Wikilink Conventions

- First mention of a concept in a note gets linked: `[[Concept]]`
- Subsequent mentions are NOT linked
- Display text used when title differs: `[[File Title|display text]]`

## Agent-Owned Folder Boundary

The user selected a dedicated-folder boundary for generated content. New agent-created notes MUST live in these folders:
```
$VAULT_PATH/
├── Sources/            ← References and source documents
├── Atomic/             ← Atomic concept notes
├── MOCs/               ← Maps of Content
├── Research/           ← Multi-hop research outputs
└── Agent/              ← Machine-written state notes
```

Daily notes remain at the vault root by default because they are user-owned entrypoints. The agent may rewrite only the check-in and agent zones inside a daily note.

Regenerability invariant: `Sources/`, `Atomic/`, `MOCs/`, `Research/`, and `Agent/` are derived projections of user writing plus external sources. If the user deletes those folders, future loop runs should recreate the folder skeleton and rebuild the same structural classes of notes over time. Content may differ; folder/function boundaries should not.

Migration safety: never move or rename existing vault notes automatically. When reading existing vaults, check both the dedicated-folder path and the legacy root path. Create new notes only in the dedicated folder for their type.

## Obsidian Plugins Detected

*(None detected from current config — tracking as vault grows)*
