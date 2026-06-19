# Spec: Knowledge Digest

**Trigger**: End of Phase 4 in the daily pipeline, after all FETCH and ENRICH actions complete.

## Purpose

Surface what the agent learned in a session so the user can see it at a glance without inspecting individual notes. The digest is the agent's "show your work" output — it closes the loop between agent processing and user awareness.

## Output Location

The digest is appended to the **same daily note** the content came from.

- If content came from `2026-06-19.md`, the digest goes into `2026-06-19.md`
- If multiple daily notes were processed in one session, each note gets its own digest section

There are no separate digest files. The daily note is the audit trail.

## Digest Template

```markdown
---

## Knowledge Digest — YYYY-MM-DD

### New Notes Created
- [[Note Title]] — one-sentence description of what it covers

### Notes Enriched
- [[Existing Note]] — N facts added from [Source](url)

### Sources Processed
| Source | Outcome | Linked Note |
|--------|---------|-------------|
| [Title](url) | created / enriched | [[Note]] |
| [Title](url) | DEFERRED — paywall | — |

### Needs Review
- [url or description] — reason the agent could not process it
```

Omit any section that has no entries. Do not emit empty `###` headings.

## Writing Rules

1. Write the digest **after** all ACT phase actions are complete — never mid-session
2. Use exact wikilinks `[[Note Title]]` for every note referenced, so Obsidian can graph them
3. Keep summaries in "New Notes Created" to one sentence — this is a signpost, not a repeat of the note's content
4. "Needs Review" is for the user to handle manually; do not attempt to process items listed here
5. If a note was both created AND enriched in the same session (e.g., created from one source, then another source added more facts), list it under **New Notes Created** only — enrichment is implied

## What the Digest Is NOT

- Not a replacement for the atomic note — the note itself holds the knowledge
- Not a journal entry or reflection — stay factual and terse
- Not permanent — users may archive, tag, or delete digest sections; the agent will not re-create them

## Surfacing Beyond the Daily Note

In addition to the in-note digest, update two index files in `memory/`:

### `memory/vault-index.md`
Add all newly created notes. Mark enriched notes with `[UPDATED YYYY-MM-DD]` suffix.

### `memory/concept-gaps.md`
For items in "Needs Review" that are concepts (not fetch failures), add them to the Pending list so the next session can attempt creation.

## Example Output

```markdown
---

## Knowledge Digest — 2026-06-19

### New Notes Created
- [[Syncthing]] — open-source continuous file synchronization tool for keeping folders in sync across devices

### Notes Enriched
- [[Distributed Systems]] — 3 facts added from [Syncthing Documentation](https://docs.syncthing.net)

### Sources Processed
| Source | Outcome | Linked Note |
|--------|---------|-------------|
| [Syncthing Docs](https://docs.syncthing.net) | enriched | [[Distributed Systems]] |
| [Syncthing Getting Started](https://docs.syncthing.net/intro/getting-started.html) | created | [[Syncthing]] |

*Processed by agent on 2026-06-19*
```
