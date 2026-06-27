# Spec: Daily Note Handling

**Trigger**: Today's daily note is always in the change set (see `loop.md` Phase 1).

## Zone Ownership

Daily notes have two zones separated by `\n---\n## Agent`:

| Zone | Owner | Rules |
|------|-------|-------|
| **User zone** (above the boundary) | User | Agent annotates with wikilinks only; never rewrites, restructures, or deletes content |
| **Agent zone** (from `---\n## Agent` onward) | Agent | Replaced in full each run; user never edits it |

If no agent boundary exists yet, the entire note is the user zone. The agent appends the boundary at the end of the first run.

## User Zone Processing Rules

1. Read top to bottom
2. For each bullet:
   - Names a known concept → inline-link it: `[[Syncthing]]` (skip if already linked)
   - Names an unknown concept → log in `Agent Concept Gaps`; link only if an ATOMIZE action creates it this session
   - Is a task (`TODO`, action verb, `- [ ]`) → leave unchanged
   - Is a personal reflection → leave unchanged
3. Do NOT delete any user content
4. Do NOT reformat or restructure

## Scope

- Today's note: always processed (zone refresh at minimum)
- Yesterday's note: processed if user zone was modified since `last_run_timestamp`
- Catch-up: at most 3 missed daily notes per session, oldest first

## Relationship to Daily Pipeline

This spec covers zone ownership and user-zone annotation rules only.

For URL extraction, note creation, resource finding, and agent zone content, see `specs/daily-pipeline.md`.
