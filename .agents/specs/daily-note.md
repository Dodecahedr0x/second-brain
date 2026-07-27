# Spec: Daily Note Handling

**Trigger**: Today's daily note is always in the change set (see `loop.md` Phase 1).

## Zone Ownership

Daily notes have two zones separated by `\n---\n## Agent`:

| Zone | Owner | Rules |
|------|-------|-------|
| **User zone** (above the boundary) | User | **Read-only.** Agent reads/analyzes but never modifies it — no annotating, wikilinking, appending, or rewriting. Detected links and source-note refs surface in the recap note (via `skills/recap.md`) |
| **Agent zone** (from `---\n## Agent` onward) | Agent | Single `[[YYYY-MM-DD Recap]]` link (via `skills/recap.md`); replaced each run; user never edits it. All generated sections live in the recap note |

If no agent boundary exists yet, the entire note is the user zone. The agent appends the boundary at the end of the first run.

## User Zone Processing Rules

The user zone is **read-only** — analyze it, write nothing into it. All output goes in the agent zone.

1. Read top to bottom.
2. For each bullet, **extract without modifying it**:
   - Names a known concept → surface it in the recap (via `skills/recap.md`); do **not** inline-link the user's text.
   - Names an unknown concept → log in `Agent Concept Gaps`.
   - Is a pasted URL → route to `skills/parse-content.md` Part B; surface the resulting source note in the recap's `## New Notes` (via `skills/recap.md`), leaving the user's URL bullet exactly as written.
   - Is a task or personal reflection → leave alone.
3. Never inline-link, annotate, append to, delete, reformat, or restructure user content.

## Scope

- Today's note: always processed (zone refresh at minimum)
- Yesterday's note: processed if user zone was modified since `last_run_timestamp`
- Catch-up: at most 3 missed daily notes per session, oldest first

## Relationship to Daily Pipeline

This spec covers zone ownership and user-zone **read** rules only (the user zone is never modified).

For URL extraction, note creation, resource finding, and recap content, see `specs/daily-pipeline.md` and `skills/recap.md`.
