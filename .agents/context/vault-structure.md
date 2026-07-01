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

Daily notes have two zones. The user writes freely in the user zone; the agent owns and replaces the agent zone each run. Preferred user-zone structure is `## User Inputs` followed by `## Agent Feedback`; checked feedback boxes steer future agent-managed notes/discovery, unchecked boxes are neutral, and the section should show at most 3 positive-confirmation boxes.

```markdown
YYYY-MM-DD

## User Inputs

- User bullet 1
- User bullet 2 with a [[wikilink]]
- https://url-to-explore.com

## Agent Feedback

- [ ] More on topic A.
- [ ] Less on topic B.

---
## Agent — YYYY-MM-DD HH:MM

### New Notes
- [[Note A]] — one-liner

### Resources
- [[Source Title]] — summary
- [External Title](url) — why it connects

### What's New
- [[Source Title]] · arxiv · YYYY-MM-DD — abstract line → [[Concept]]

### Explore
- [Resource](url) — reason
- [[Concept Gap]] — worth creating

### Routines
- **Activity** · N-day streak · Next: action

### Question
> Open question for today?

### Open
- N items #needs-review · N items #queued
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
