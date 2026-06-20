# Spec: Daily Notes Processing Pipeline

**Trigger**: Scheduled (daily, default 08:00) or manual run. Always targets yesterday's daily note; extends it even if already processed.

## Overview

This pipeline extends the base loop with four capabilities that `specs/daily-note.md` does not cover:

1. **External content extraction** — pull URLs and citations from daily notes and fetch their content
2. **Note enrichment** — update existing atomic notes (or create new ones) with facts from fetched content
3. **Knowledge surfacing** — append a digest to the daily note summarising what was learned
4. **Daily suggestions** — compile recent knowledge, find extending resources, detect routines, write suggestions to today's daily note

All four run inside the existing six-phase loop. This spec defines *when* and *how* each additional step fires within those phases.

---

## Phase Integration Map

| Loop Phase | New Work Added by This Pipeline |
|------------|--------------------------------|
| Phase 1 OBSERVE | Mark daily notes as `daily-pipeline` type in the change set |
| Phase 2 ORIENT | Detect URLs/citations only (see §URL Extraction) |
| Phase 3 DECIDE | Add FETCH, SOURCE_CREATE, ENRICH, and ATOMIZE actions to the plan |
| Phase 4 ACT | Execute fetches, enrich notes, build digest buffer, run suggestions workflow |
| Phase 5 VERIFY | Check fetched sources are referenced; digest and suggestions are written |
| Phase 6 CLEANUP | Log fetch results; persist digest; update vault index |

---

## §URL Extraction

Runs during Phase 2 (ORIENT) after the standard parse step.

### Detection Patterns

For each daily note in the change set, scan for:

| Pattern | Example | Extract |
|---------|---------|---------|
| Bare URL | `https://example.com/article` | URL as-is |
| Markdown link | `[title](https://...)` | URL + title hint |
| YouTube link | `https://youtu.be/...` or `https://youtube.com/watch?v=...` | URL, treat as video |
| Book/article mention | `"Reading X by Y"` | Author + title (no URL) |

### Output

Append to the session's connection map:

```
EXTERNAL_REFS for <daily-note>:
  urls: [url1, url2]
  citations: [{author, title}]
```

---

## §Content Extraction

Runs during Phase 4 (ACT), immediately before standard enrichment actions.

### Per-URL Steps

1. Pass the URL to `skills/parse-content.md` Part B — it classifies the content type and calls the appropriate extractor (`extract-youtube.md`, `extract-twitter.md`, or `fetch-url.md`)
2. Each extractor creates a source note (see `specs/source-note.md`) and returns `EXTRACT_RESULT` with `status`, `note`, `concepts`, and optional `references`
3. Annotate the raw URL bullet in the daily note with `[[<source note title>]]`; keep the original URL in the source note frontmatter
4. For each returned concept:
   - **Matches existing note** → schedule ENRICH action
   - **No match** → add to `Agent Concept Gaps`; schedule ATOMIZE if enough info exists
5. For returned `references`, schedule a later FETCH or log as deferred; do not put URLs in `Agent Concept Gaps`.
6. Log:
   ```
   [TIMESTAMP] EXTRACT: <url> → note="<filename>", concepts=[A, B]
   ```

### Failure Handling

| Status | Action |
|--------|--------|
| `FAILED` / `EMPTY` / `BLOCKED` | Log, leave URL bullet unchanged, append `#needs-review` only if safe |
| `NO_TRANSCRIPT` (YouTube) | Source note created as stub; annotate source bullet and add `#needs-review` if safe |

Do not retry failed extractions in the same session.

---

## §Note Enrichment (ENRICH Actions)

When fetched content maps to an existing atomic note:

1. Read the existing note
2. Compare its `## Key Properties` and `## References` sections against the fetched facts
3. Add only **net-new** facts — do not duplicate existing content
4. Append the source URL under `## References`:
   ```markdown
   - [Page Title](https://url) — one-sentence annotation
   ```
5. If the fetched content contradicts something in the note, add a `> [!note]` callout flagging the discrepancy rather than silently overwriting

### Limits

- Add at most 5 new bullet facts per note per session (avoid flooding)
- If more than 5 new facts exist, add the top 5 by relevance and log the rest in `Agent Concept Gaps` under the note's name

---

## §Knowledge Digest

Runs at the end of Phase 4, before Phase 5 VERIFY.

### Format

Use `specs/knowledge-digest.md` as the canonical template. Write the digest after user content and before suggestions / the processed footer.

### Constraints

- The digest is **append-only** — never modify earlier digest sections
- If nothing was fetched or enriched (no URLs in the daily note), omit the digest entirely
- The digest is written to the *same* daily note the content came from, not a separate file

---

## §Suggestions

Runs during Phase 4 (ACT), after §Knowledge Digest is written. Delegates entirely to `specs/daily-suggestions.md`.

Summary of what it does:
1. Compiles notes created/updated in the last 7 days from `Agent Vault Index`
2. Calls `skills/find-resources.md` for the dominant concept cluster
3. Calls `skills/identify-routines.md` on the last 14 daily notes
4. Writes a `## Suggestions — YYYY-MM-DD` section to **today's** daily note (creating the file if absent)

Final daily-note order: user content → knowledge digest(s) → suggestions → processed footer. If today's daily note already has a `## Suggestions` section, replace that section in place rather than appending a second one.

Log:
```
[TIMESTAMP] SUGGESTIONS: written to YYYY-MM-DD.md — N explore items, N routines
```

---

## Scheduling

The pipeline is designed to run via the local scheduled agent/cron path installed by `scripts/setup.sh` and invoked by `scripts/run.sh`.

Recommended cadence: **daily at 08:00 local time**, processing all daily notes modified since the last successful run.

Session state (`Agent Operation Log`) provides the `last_run_timestamp` that bounds what gets picked up.

---

## Scope Limits

| Resource | Limit per session |
|----------|------------------|
| Daily notes processed | 7 (oldest unprocessed first) |
| URLs fetched per note | 5 |
| Atomic notes created | 10 |
| Enrichment facts added per note | 5 |

If any limit is hit mid-session, defer the remainder with `#queued` and log clearly.

---

## Relationship to Other Specs

- `specs/daily-note.md` — governs basic link annotation (still runs first; this pipeline adds steps after)
- `specs/ingestion.md` — governs non-URL raw content (runs in parallel with this pipeline)
- `specs/generation.md` — used when this pipeline schedules ATOMIZE actions
- `specs/connection.md` — runs after generation to wire new notes into the graph
- `skills/fetch-url.md` — the fetching primitive used by §Content Extraction
- `specs/daily-suggestions.md` — full spec for the §Suggestions workflow
- `skills/identify-routines.md` — routine detection used by §Suggestions
- `skills/find-resources.md` — resource search used by §Suggestions
