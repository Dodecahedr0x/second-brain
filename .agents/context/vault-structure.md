# Vault Structure & Conventions

**Vault path**: `$VAULT_PATH` (see `.env.local`)  
**Last observed**: 2026-06-19

## Current Structure

```
$VAULT_PATH/
├── .obsidian/          ← FORBIDDEN: Obsidian config, never touch
├── .stfolder/          ← FORBIDDEN: Syncthing metadata, never touch
└── 2026-06-19.md       ← Daily note (inbox)
```

## Conventions Observed

### File Naming

| Content Type | Convention | Example |
|-------------|------------|---------|
| Daily notes | `YYYY-MM-DD.md` | `2026-06-19.md` |
| Atomic notes | `Title Case.md` | `Syncthing.md` |
| MOCs | `Topic MOC.md` | `Tools MOC.md` |

### Note Structure

Daily notes have three zones. The user writes freely in the **input zone** (top); the agent owns the **Check-in** (positive-confirmation steering questions) and the **agent zone** (replaced each run).

```markdown
YYYY-MM-DD

- User bullet 1
- User bullet 2 with a [[wikilink]]

## Check-in
Focus this week?   - [ ] Topic A
Keep tracking?     - [ ] Topic C (new)
<!-- steering: unprocessed -->

---
## Agent — YYYY-MM-DD HH:MM
### What's New
...
```

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

## Folder Structure Plan

As the vault grows, use this folder structure:
```
$VAULT_PATH/
├── Daily/              ← Daily notes (YYYY-MM-DD.md)
├── Atomic/             ← Atomic concept notes
├── MOCs/               ← Maps of Content
├── Inbox/              ← Raw drops that aren't daily notes
└── Sources/            ← References and source documents
```

*Do not create these folders yet — wait for the vault to accumulate enough notes to warrant it. Current state: flat structure is fine.*

## Obsidian Plugins Detected

*(None detected from current config — tracking as vault grows)*
