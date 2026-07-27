# Spec: Daily Notes Processing Pipeline

**Trigger**: Every scheduled run (via `scripts/run.sh`, cron `0 */6 * * *`). Always targets today's daily note.

## Co-Ownership Model

The vault is jointly maintained by the user and the agent. Today's daily note is the shared workspace:

- **User zone**: everything above the agent boundary (`---\n## Agent`). The user writes freely here — bullets, URLs, tasks, thoughts. It is **read-only** to the agent: analyze it, but never annotate, wikilink, append to, or rewrite it. All generated content (source-note links, transcripts, detected concepts) goes in the agent zone. Preferred shape: `## User Inputs` first (freeform user content), then `## Agent Feedback` (user-owned checkboxes).
- **Feedback checkboxes**: positive-confirmation only, max 3 boxes. Unchecked boxes are neutral prompts, not weak negatives. Checked boxes are explicit steering; read them in Phase 1, update `Agent User Profile` / `Agent Concept Gaps` / discovery priorities as applicable, then leave the checkbox text unchanged.
- **Agent zone**: everything from `---\n## Agent — YYYY-MM-DD HH:MM` onward. Contains only `[[YYYY-MM-DD Recap]]` — a link to the recap note where all generated sections live. The agent replaces this with a single link each run (via `skills/recap.md`). The user never edits it.

---

## Run Modes

### Active mode — user zone changed since `last_run_timestamp`

Full pipeline: process new content, fetch URLs, create notes, find resources, write the recap note and update the daily note's recap link.

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
| 4 ACT | Execute plan; write recap note + daily recap link | Find resource; write recap note + daily recap link |
| 5 VERIFY | Zone written; wikilinks valid; no user zone rewritten | Zone written |
| 6 CLEANUP | Update Agent logs; persist state | Update timestamp only |

---

## §URL Extraction (Phase 2 — Active only)

Scan the user zone diff for:

| Pattern | Extract |
|---------|---------|
| Bare URL | URL as-is |
| Markdown link `[title](url)` | URL + title hint |
| Checked feedback `- [x] ...` under `## Agent Feedback` | user steering; update agent-managed notes / discovery priorities only |
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
4. Surface the source note in the recap's `## New Notes` (via `skills/recap.md`); **leave the user's URL bullets untouched**
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

Call `skills/recap.md` **Build/Refresh** (today's date) to assemble all generated sections (Check-in, What's New, Explore, Routines, Question for Today, New Notes) into `$VAULT_PATH/YYYY-MM-DD Recap.md`.

Then call `skills/recap.md` **Link** to write or update the daily note's agent zone:

```
---
## Agent — YYYY-MM-DD HH:MM

[[YYYY-MM-DD Recap]]
```

The recap note is the write target for all suggestions content. The daily note's agent zone holds only the link.

In idle mode: call `skills/recap.md` Build/Refresh — it updates `agent_last_touched`, refreshes any counts, and adds one Explore item if a resource was found.

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
- `skills/recap.md` — builds the recap note and writes the `[[YYYY-MM-DD Recap]]` link into the daily note
- `specs/daily-suggestions.md` — section builders (What's New, Explore, Routines, Question) called from `skills/recap.md`
- `specs/source-note.md` — source note creation
- `specs/generation.md` — atomic note creation
- `skills/fetch-url.md`, `extract-youtube.md`, `extract-twitter.md` — fetching primitives
- `skills/find-resources.md` — resource search (idle mode + Explore section)
