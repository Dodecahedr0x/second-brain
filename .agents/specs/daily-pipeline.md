# Spec: Daily Notes Processing Pipeline

**Trigger**: Scheduled (daily, default 08:00) or manual run. Processes daily notes written since the last run.

## Overview

This pipeline extends the base loop with three capabilities that `specs/daily-note.md` does not cover:

1. **External content extraction** — pull URLs and citations from daily notes and fetch their content
2. **Note enrichment** — update existing atomic notes (or create new ones) with facts from fetched content
3. **Knowledge surfacing** — append a digest to the daily note summarising what was learned

All three run inside the existing six-phase loop. This spec defines *when* and *how* each additional step fires within those phases.

---

## Phase Integration Map

| Loop Phase | New Work Added by This Pipeline |
|------------|--------------------------------|
| Phase 1 OBSERVE | Mark daily notes as `daily-pipeline` type in the change set |
| Phase 2 ORIENT | Run URL extraction and content fetching (see §URL Extraction) |
| Phase 3 DECIDE | Add FETCH and ENRICH actions to the plan |
| Phase 4 ACT | Execute fetches, enrich notes, build digest buffer |
| Phase 5 VERIFY | Check fetched sources are referenced; digest is written |
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
2. Each extractor creates a source note (see `specs/source-note.md`) and returns `EXTRACT_RESULT` with `status`, `note`, and `concepts`
3. Replace the raw URL bullet in the daily note with `[[<source note title>]]`
4. For each concept returned:
   - **Matches existing note** → schedule ENRICH action
   - **No match** → add to `Agent Concept Gaps`; schedule CREATE if enough info exists
5. Log:
   ```
   [TIMESTAMP] EXTRACT: <url> → note="<filename>", concepts=[A, B]
   ```

### Failure Handling

| Status | Action |
|--------|--------|
| `FAILED` / `EMPTY` | Log, leave URL bullet unchanged |
| `BLOCKED` | Log, tag bullet `#needs-review` |
| `NO_TRANSCRIPT` (YouTube) | Source note created as stub, tag `#needs-review` |

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

Append a fenced section to the bottom of the current daily note (above the existing `*Processed by agent*` footer if present):

```markdown
---

## Knowledge Digest — YYYY-MM-DD

### New Notes Created
- [[Note A]] — one-sentence summary
- [[Note B]] — one-sentence summary

### Notes Enriched
- [[Existing Note]] — added N facts from [Source Title](url)

### Sources Processed
- [Title](url) → [[Atomic Note]] (created / enriched)

### Deferred / Needs Review
- [url] — reason (FETCH_FAILED / too ambiguous / paywall)
```

### Constraints

- The digest is **append-only** — never modify earlier digest sections
- If nothing was fetched or enriched (no URLs in the daily note), omit the digest entirely
- The digest is written to the *same* daily note the content came from, not a separate file

---

## Scheduling

The pipeline is designed to run via a scheduled cloud agent (see `specs/schedule.md` once created).

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
- `specs/generation.md` — used when this pipeline schedules CREATE actions
- `specs/connection.md` — runs after generation to wire new notes into the graph
- `skills/fetch-url.md` — the fetching primitive used by §Content Fetching
