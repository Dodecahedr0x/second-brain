# Spec: Content Ingestion

**Trigger**: New files appear in the vault, or files are tagged `#inbox`, or daily notes contain raw bullet points not yet linked.

## What Counts as "Raw" Content

- Daily notes (`YYYY-MM-DD.md`) containing unlinked bullet points
- Files in an `Inbox/` folder (if created)
- Notes tagged `#inbox` or `#raw`
- Files modified within the last 24 hours that have no wikilinks

## Ingestion Steps

1. **Extract**: Read the raw note. Pull out distinct ideas, facts, named entities, and questions
2. **Classify** each extracted item as one of:
   - **Concept**: A standalone idea worth its own atomic note (e.g., "Syncthing")
   - **Fact**: A specific claim that belongs inside an existing or new concept note
   - **Task/Action**: Something to do — leave in the daily note, tag `#action`
   - **Reference**: A link to an external resource — preserve in a References section
3. **Route**: Concepts and facts go to `specs/generation.md`. Tasks stay. References get a `[[Sources]]` wikilink.
4. **Mark processed**: Add `#processed` tag to the raw note, or move its content under a `## Processed` heading

## Quality Gate

Before marking a raw item as ingested, verify:
- [ ] Every named entity either has an existing note or is logged in `Agent Concept Gaps`
- [ ] No information was silently dropped
- [ ] The original note is not degraded (only enriched or tagged)

## Scope Limit

Process at most 5 raw notes per session. Defer the rest with `#queued` tag and log in operation-log.
