# Vault Structure & Conventions

**Vault path**: `/home/openclaw/Vault`  
**Last observed**: 2026-06-19

## Current Structure

```
Vault/
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

Daily notes use bullet point format:
```markdown
- Item 1
- Item 2 with a [[wikilink]]
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
Vault/
├── Daily/              ← Daily notes (YYYY-MM-DD.md)
├── Atomic/             ← Atomic concept notes
├── MOCs/               ← Maps of Content
├── Inbox/              ← Raw drops that aren't daily notes
└── Sources/            ← References and source documents
```

*Do not create these folders yet — wait for the vault to accumulate enough notes to warrant it. Current state: flat structure is fine.*

## Obsidian Plugins Detected

*(None detected from current config — tracking as vault grows)*
