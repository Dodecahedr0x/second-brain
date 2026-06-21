# Spec: Daily Notes Processing Pipeline

**Trigger**: Scheduled (daily, default 08:00) or manual run. Always targets yesterday's daily note; extends it even if already processed.

## Overview

This pipeline extends the base loop with five capabilities that `specs/daily-note.md` does not cover:

1. **External content extraction** — pull URLs and citations from daily notes and fetch their content
2. **Note enrichment** — update existing atomic notes (or create new ones) with facts from fetched content
3. **Knowledge surfacing** — append a digest to yesterday's note summarising what was learned
4. **Carry-forward** — write a compact bridge section into today's note with the session's key outputs
5. **Daily suggestions** — compile recent knowledge, find extending resources, detect routines, write suggestions to today's daily note

All five run inside the existing six-phase loop. This spec defines *when* and *how* each additional step fires within those phases.

---

## Phase Integration Map

| Loop Phase | New Work Added by This Pipeline |
|------------|--------------------------------|
| Phase 1 OBSERVE | Mark daily notes as `daily-pipeline` type in the change set |
| Phase 2 ORIENT | Detect URLs/citations only (see §URL Extraction) |
| Phase 3 DECIDE | Add FETCH, SOURCE_CREATE, ENRICH, and ATOMIZE actions to the plan |
| Phase 4 ACT | Execute fetches, enrich notes, build digest buffer, run carry-forward, run suggestions workflow |
| Phase 5 VERIFY | Check fetched sources are referenced; digest, carry-forward, and suggestions are written |
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

### Grouping by Site

After collecting all URLs, group them by site so that multiple pages from the same source end up in one note.

**Grouping key** — the registered domain after stripping common subdomains (`www`, `docs`, `blog`, `help`, `support`, `developer`, `developers`, `api`):

| Raw hostname | Grouping key |
|---|---|
| `docs.python.org` | `python.org` |
| `developer.mozilla.org` | `mozilla.org` |
| `react.dev` | `react.dev` |

**Exceptions** — treat each URL as its own group regardless of domain:
- `youtube.com`, `youtu.be` — each video is one artifact
- `twitter.com`, `x.com` — each tweet is one artifact
- `github.com` — group by `github.com/<owner>/<repo>` (first three path segments)

For each group, pick a human-readable title: use the site's well-known name if recognizable (e.g., `MDN Web Docs`, `Python Documentation`), otherwise Title-Case the domain.

### Output

Append to the session's connection map:

```
SITE_GROUPS for <daily-note>:
  - key: python.org
    title: Python Documentation
    type: article
    urls: [url1, url2]
  - key: youtu.be/abc123
    title: <video title>
    type: youtube
    urls: [url3]
  citations: [{author, title}]
```

---

## §Content Extraction

Runs during Phase 4 (ACT), immediately before standard enrichment actions.

### Per-Group Steps

For each group in `SITE_GROUPS`:

1. For each URL in the group, call the appropriate extractor via `skills/parse-content.md` Part B (`extract-youtube.md`, `extract-twitter.md`, or `fetch-url.md`). Fetch all URLs before creating the note.
2. Merge results across all URLs in the group:
   - `summary`: synthesize across all pages into a single paragraph
   - `key_points`: union and deduplicate; keep at most 10
   - `concepts`: union of all returned concept lists
3. Create **one** source note for the group using `specs/source-note.md`:
   - Note title = the group's `title`
   - `source_url` = the first (or root) URL in the group
   - `source_urls` = all URLs in the group (only written when group has > 1 URL)
4. Annotate **every** raw URL bullet in the daily note that belongs to this group with `[[<group note title>]]` — all bullets in the group point to the same note.
5. For each returned concept:
   - **Matches existing note** → schedule ENRICH action
   - **No match** → add to `Agent Concept Gaps`; schedule ATOMIZE if enough info exists
6. For returned `references`, schedule a later FETCH or log as deferred.
7. Log:
   ```
   [TIMESTAMP] EXTRACT: <key> (N URLs) → note="<filename>", concepts=[A, B]
   ```

### Failure Handling

If **any** URL in a group fails, continue fetching the remaining URLs in the group. Create the source note from whatever succeeded. Only mark the whole group as failed if **all** URLs fail.

| Status | Action |
|--------|--------|
| All URLs `FAILED` / `EMPTY` / `BLOCKED` | Log, leave all URL bullets unchanged, tag `#needs-review` |
| Partial failure (some URLs OK) | Create note from successful fetches; annotate succeeded bullets; mark failed bullets `#needs-review` |
| `NO_TRANSCRIPT` (YouTube) | Source note created as stub; annotate source bullet; tag `#needs-review` |

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
- The digest is written to the *same* daily note the content came from (yesterday's note), not to today's note

---

## §Carry-Forward

Runs during Phase 4 (ACT), immediately after §Knowledge Digest is written, before §Suggestions.

Writes a compact summary of the current session's outputs to **today's** daily note (creating the file if absent). Its purpose is to make yesterday's work visible the moment the user opens a new day — without requiring them to navigate back.

### Template

```markdown
## From Yesterday — YYYY-MM-DD

- **Created**: [[Note A]], [[Note B]]
- **Enriched**: [[Existing Note]] · N facts · [Source Title](url)
- **Theme**: [[Dominant Concept]] — one sentence on why it dominated
- **Deferred**: N items — see [Knowledge Digest](YYYY-MM-DD.md)
```

Omit any line with no entries. Keep the section to ≤ 5 lines total.

### Rules

- **Created**: list every atomic note created this session as a wikilink; omit if none
- **Enriched**: list the note enriched with the most new facts; if multiple, pick the one most relevant to the dominant theme; omit if none
- **Theme**: the dominant concept cluster from the session (same source as §Suggestions Step 4); always include if anything was processed
- **Deferred**: count of items tagged `#queued` or `#needs-review` in this session; link to the source daily note for details; omit if zero

If today's note already has a `## From Yesterday` section, replace it in place — do not append a second one.

Log:
```
[TIMESTAMP] CARRY_FORWARD: written to YYYY-MM-DD.md — N created, N enriched, theme=<concept>
```

---

## §Suggestions

Runs during Phase 4 (ACT), after §Carry-Forward is written. Delegates entirely to `specs/daily-suggestions.md`.

Summary of what it does:
1. Compiles notes created/updated in the last 7 days from `Agent Vault Index`
2. Calls `skills/find-resources.md` for the dominant concept cluster
3. Calls `skills/identify-routines.md` on the last 14 daily notes
4. Writes a `## Suggestions — YYYY-MM-DD` section to **today's** daily note (creating the file if absent)

**Yesterday's note** order: user content → knowledge digest(s) → processed footer.

**Today's note** order: carry-forward → suggestions. If either section already exists, replace it in place rather than appending a second one.

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
