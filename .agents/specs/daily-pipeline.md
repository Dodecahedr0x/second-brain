# Spec: Daily Notes Processing Pipeline

**Trigger**: Every hour (via `scripts/run.sh`, cron `0 * * * *`). Always targets today's daily note.

## Co-Ownership Model

The vault is jointly maintained by the user and the agent. Today's daily note is the shared workspace:

- **User zone**: everything above the agent boundary (`---\n## Agent`). The user writes freely here — bullets, URLs, tasks, thoughts. The agent annotates (wikilinks) but never rewrites.
- **Agent zone**: everything from `---\n## Agent — YYYY-MM-DD HH:MM` onward. The agent **replaces** this section in full on every run. The user never edits it.

---

## Run Modes

### Active mode — user zone changed since `last_run_timestamp`

Full pipeline: process new content, fetch URLs, create notes, find resources, write agent zone.

### Idle mode — no user zone changes

Lightweight: pick the top concept gap, find one resource, update agent zone timestamp and counts.

The mode is determined in Phase 1 and stays fixed for the session.

---

## Phase Integration Map

| Phase | Active | Idle |
|-------|--------|------|
| 1 OBSERVE | Classify mode; diff user zone; extract change set | Classify mode only |
| 2 ORIENT | Parse URLs, citations, new concepts | — |
| 3 DECIDE | Plan FETCHes, CREATEs, ENRICHes, ATOMIZEs | Plan 1 resource lookup for top concept gap |
| 4 ACT | Execute plan; write agent zone | Find resource; write agent zone |
| 5 VERIFY | Zone written; wikilinks valid; no user zone rewritten | Zone written |
| 6 CLEANUP | Update Agent logs; persist state | Update timestamp only |

---

## §URL Extraction (Phase 2 — Active only)

Scan the user zone diff for:

| Pattern | Extract |
|---------|---------|
| Bare URL | URL as-is |
| Markdown link `[title](url)` | URL + title hint |
| YouTube `youtu.be/…` or `youtube.com/watch?v=…` | URL, type = video |
| Book/article mention `"Reading X by Y"` | Author + title (no URL) |

**Grouping by site** — key = registered domain after stripping `www`, `docs`, `blog`, `help`, `support`, `developer`, `developers`, `api`.

**Exceptions** (each URL is its own group):
- `youtube.com`, `youtu.be` — one group per video
- `twitter.com`, `x.com` — one group per tweet
- `github.com` — group by `github.com/<owner>/<repo>`

---

## §Content Extraction (Phase 4 — Active only)

For each URL group:

1. Fetch via `skills/parse-content.md` Part B (using `extract-youtube.md`, `extract-twitter.md`, or `fetch-url.md`)
2. Merge results across group (union concepts, synthesize summary)
3. Create one source note via `specs/source-note.md`
4. Annotate every URL bullet in the user zone with `[[source note title]]`
5. Schedule ENRICH for matched concepts; ATOMIZE or add to gaps for new ones

**Failure handling**:

| Status | Action |
|--------|--------|
| All URLs failed | Leave bullets unchanged, tag `#needs-review` |
| Partial failure | Create note from successes; mark failed bullets `#needs-review` |
| YouTube `NO_TRANSCRIPT` | Create stub; tag `#needs-review` |

---

## §Note Enrichment (Phase 4 — Active only)

When fetched content maps to an existing atomic note:
1. Add only net-new facts (at most 5 per note per run)
2. Append source under `## References`
3. Flag contradictions with `> [!note]` rather than silently overwriting

---

## §Agent Zone (Phase 4 — Always)

Write (or replace) the agent zone in today's daily note as the last ACT step.

**Boundary**: The agent zone starts at the first occurrence of `\n---\n## Agent` in the file. Everything from that line onward is replaced. If the boundary does not exist, append it after all user content.

**Template**:

```markdown
---
## Agent — YYYY-MM-DD HH:MM

### New Notes
- [[Note A]] — one-liner
- [[Note B]] — one-liner

### Resources
- [[Source Title]] — one-line summary
- [External Title](url) — one-line reason

### Explore
- [Resource](url) — why it connects to recent notes
- [[Concept Gap]] — stub worth creating

### Routines
- **Activity** · N-day streak · Next: action
- **Fading activity** · last seen YYYY-MM-DD · Pick back up

### Question
> Specific open question derived from this week's theme or a stub note.

### Open
- N items #needs-review · N items #queued
```

**Rules**:
- Omit any section with no entries
- Keep under 25 lines total
- `HH:MM` = local time of this run
- In idle mode: update timestamp; refresh Open counts; add one Explore item if a resource was found; keep all other sections from the previous zone intact

**Suggestions content** — populate Explore, Routines, and Question by delegating to `specs/daily-suggestions.md` Steps 1–4 (compile knowledge, find resources, identify routines, question). Skip Step 5 (write) — the agent zone is the write target.

---

## Session Limits (per run)

| Resource | Limit |
|----------|-------|
| URLs fetched | 3 |
| Atomic notes created | 5 |
| Enrichment facts per note | 5 |
| Daily notes caught up (missed days) | 3 |

If any limit is hit, defer remaining items with `#queued` and log clearly.

---

## Relationship to Other Specs

- `specs/daily-note.md` — zone ownership rules (governs what agent may touch in the user zone)
- `specs/daily-suggestions.md` — Steps 1–4 called to populate agent zone §Explore / §Routines / §Question
- `specs/source-note.md` — source note creation
- `specs/generation.md` — atomic note creation
- `skills/fetch-url.md`, `extract-youtube.md`, `extract-twitter.md` — fetching primitives
- `skills/find-resources.md` — resource search (idle mode + Explore section)
