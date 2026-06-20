# Spec: Daily Note Handling

**Trigger**: A daily note (`YYYY-MM-DD.md`) exists with unprocessed bullet points.

## Daily Note Philosophy

Daily notes are the primary inbox. The user pours raw thoughts here. The agent's job is to:
- Extract linkable concepts and route them to atomic notes
- Add wikilinks to existing concepts already in the vault
- Leave tasks, reflections, and personal entries **untouched**
- Never rewrite the user's words — only annotate with links

## Processing Rules

1. Read the daily note top to bottom
2. For each bullet point:
   - If it names a known concept → inline-link it: `[[Syncthing]]`
   - If it names an unknown concept → log in `Agent Concept Gaps`; link it only if the same plan creates a stub this session
   - If it is a task (contains "TODO", action verb, or "- [ ]") → leave it unchanged
   - If it is a personal reflection → leave it unchanged
3. Add the canonical processed footer at the bottom of the note with the processing date:
   ```
   ---
   *Processed by agent on YYYY-MM-DD*
   ```
4. Do NOT delete any content from daily notes — only add links and the processed marker

## What NOT to Do

- Do not reformat or restructure the daily note layout
- Do not merge daily notes
- Do not extract personal reflections into separate notes
- Do not create notes from tasks (tasks stay in the daily note)

## Scope

Process at most the last 7 unprocessed daily notes per session. Older ones are lower priority.

## Relationship to Daily Pipeline

This spec covers **link annotation only** — adding wikilinks to concepts already named in the vault.

For the full pipeline (URL fetching, note enrichment, knowledge digest), see `specs/daily-pipeline.md`. The daily pipeline runs *after* this spec's steps complete; it does not replace them.
