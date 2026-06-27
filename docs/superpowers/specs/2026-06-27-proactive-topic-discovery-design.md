# Design: Proactive Topic-Driven Content Discovery

*Date: 2026-06-27*
*Status: Approved — ready for implementation planning*

## Problem

Second-brain is currently a **reactive digester**: the user pastes URLs into the
vault and the agent extracts them into source notes. The user wants it to also be
a **proactive, topic-driven discovery engine** that:

1. Infers the topics the user cares about from their daily notes (no manual config).
2. Goes out and fetches *recent* news, analysis, and content on those topics from
   multiple internet sources (arxiv, YouTube, web/news, Hacker News).
3. Weaves the results back into the vault as source notes with embedded abstracts,
   wikilinks to existing concepts, and pointers in the daily note.
4. Periodically resurfaces **forgotten** topics (faded/dormant interests) via the
   existing weekly and monthly review passes.

## Decisions (locked)

| Decision | Choice |
|----------|--------|
| Interest model | **Fully automatic inference** from daily notes. No user-maintained interest file. |
| Sources | **arxiv, YouTube, web/news, Hacker News.** Twitter excluded (no reliable unauthenticated search). |
| Output per item | **A full source note for every discovered item** + pointer in the daily note. |
| Cadence (active topics) | **Every hourly loop, small cap (1–2 new notes/run).** Max freshness. |
| Forgotten topics | **Weekly + monthly review passes** target faded/dormant topics. |
| Integration architecture | **Approach A** — discovery is a *URL producer* that feeds the existing extract → source-note → link pipeline unchanged. |

## Architecture (Approach A)

Discovery is one bounded unit: **topics in → new URLs out → existing pipeline takes over.**

```
HOURLY LOOP
│
├─ [NEW] Discovery step (Phase 1 OBSERVE, step 0)
│   1. derive-topics(active)  → ranked active topics from recent daily notes
│   2. pick topic(s)          → rotation, so coverage spreads across runs
│   3. search-{source}        → candidate URLs (arxiv / youtube / web / HN)
│   4. dedup filter           → drop anything in the Discovery Log or already a source note
│   5. cap                    → keep top 1–2; emit their URLs into the change set
│   6. record in Discovery Log
│
└─ EXISTING PIPELINE (unchanged)
    OBSERVE → ORIENT → DECIDE(FETCH) → ACT(extract → source note → link)
    → daily-suggestions embeds the pointer + abstract into today's note
```

Because discovery only *produces URLs*, the existing `parse-content` Part B router,
the YouTube/web extractors, `source-note` creation, `link-notes`, and the
`daily-suggestions` embedding all work without modification. The FETCH idempotency
guard (skip a URL that already has a non-stub source note) is reused as a second
dedup layer.

## Components

### New files

| File | Concern |
|------|---------|
| `skills/derive-topics.md` | Recency-weighted topic clustering from daily notes; supports `active` / `faded` / `dormant` modes |
| `skills/search-arxiv.md` | arxiv API query → recent paper abstract-page URLs |
| `skills/search-youtube.md` | `yt-dlp ytsearchdate` → recent video URLs |
| `skills/search-web.md` | recency-biased `WebSearch` → news/analysis URLs |
| `skills/search-hackernews.md` | Algolia HN API → recent story URLs (+ discussion permalink) |
| `skills/extract-arxiv.md` | New extractor: arxiv API → clean `source_type: paper` note with abstract embedded verbatim |
| `specs/discovery.md` | Orchestrates the 6 discovery steps; defines per-pass budgets |

### Changed files

| File | Change |
|------|--------|
| `loop.md` | Insert discovery as step 0 of Phase 1 (OBSERVE) |
| `skills/parse-content.md` | Add arxiv route (`arxiv.org/abs/`, `/pdf/`) in Part B → `extract-arxiv.md` |
| `skills/agent-notes.md` + `context/agent-notes.md` | Add 5th agent-managed note: **Agent Discovery Log** |
| `AGENTS.md` Phase 0 checklist | Verify/create the Discovery Log note |
| `specs/daily-suggestions.md` + `context/vault-structure.md` | New **What's New** subsection in the daily-note agent zone |
| `specs/weekly-review.md` | Add `## Rediscovered` section: discovery on faded topics (relaxes the "no fetch" constraint, scoped to this section only) |
| `specs/monthly-review.md` | Replace the narrow `find-resources` call with full four-source discovery on dormant topics |

## Component detail

### `derive-topics.md`

Input: last ~14 daily notes (user zone only). Output: ranked `{topic, weight,
last_seen, source_concepts, search_phrases}`.

- Extract concepts from user bullets: `[[wikilinks]]`, `**bold**`, capitalized
  proper nouns, recurring noun phrases.
- Recency-weight (linear decay over the window); sum per concept; cluster near-synonyms.
- A topic qualifies if it appears in ≥2 notes **or** once with strong signal
  (explicit wikilink) — filters one-off noise.
- Each topic carries 1–2 **search phrases** (topic name + most-linked neighbor
  concept), shared by all four search skills.

**Modes** (one skill, three selection windows):

| Mode | Used by | Selects |
|------|---------|---------|
| `active` | hourly loop | recency-weighted; topics touched in the last few days |
| `faded` | weekly review | strong signal in the 7–21d band, absent from the last ~5d |
| `dormant` | monthly review | real past signal in the 30–90d band, untouched recently |

### Search skills — uniform contract

Each takes `{topic, search_phrases, since_date}` and returns `≤3 candidate URLs`
as `{url, title, published, source, why}`. Recency is enforced per source by
dropping anything published before `since_date` (the caller sets `since_date` per
pass — e.g. last few days for hourly, wider for weekly/monthly):

- **arxiv**: `http://export.arxiv.org/api/query?search_query=all:<phrase>&sortBy=submittedDate&sortOrder=descending`; keep results with submission date ≥ `since_date`; return abstract-page URLs.
- **YouTube**: `yt-dlp "ytsearchdate20:<phrase>" --dump-json --flat-playlist`; keep `upload_date` ≥ `since_date`; drop < 60s (Shorts).
- **Web/news**: `WebSearch` with recency bias (append year / "this week"); prefer a visible recent date; exclude paywalls and social.
- **Hacker News**: `http://hn.algolia.com/api/v1/search_by_date?query=<phrase>&tags=story&numericFilters=points>20`; emit the **article URL** with the **HN discussion permalink** as a reference. No new extractor — the article is fetched via existing `fetch-url`.

Each enforces its own budget (≤1 API/search call per topic per pass).

### `extract-arxiv.md`

Routed from `parse-content` Part B on `arxiv.org/abs/` or `/pdf/`. Pulls title,
authors, full abstract, categories, submission date from the arxiv API → builds a
`source_type: paper` source note with the **abstract embedded verbatim** and
categories/authors as concepts. No scraping.

### `Agent Discovery Log` (new agent-managed note — the dedup ledger)

Load-bearing. Terse, machine-written:

```markdown
## Surfaced
- 2026-06-27 | arxiv | https://arxiv.org/abs/2506.12345 | [[Topic]] | note: [[Paper Title]]
- 2026-06-27 | hn    | https://example.com/post        | [[Topic]] | note: [[Article Title]]

## Topic Coverage
- [[Topic]] | last_covered: 2026-06-27 | pass: active
```

- **Dedup filter** rejects any candidate whose URL — normalized (strip query
  strings, `www.`, trailing slash) — is already in `## Surfaced`, **or** already
  has a non-stub source note (existing FETCH guard).
- **`## Topic Coverage`** drives rotation: each run picks the highest-weighted
  topic *not* covered recently; weekly/monthly use it so they don't re-hit a topic
  rediscovered last cycle.

### Cap & rotation

- **Rotation**: each hourly run considers `active` topics whose `last_covered` is
  older than the rotation gap (e.g. not covered in the last 3 runs), then picks the
  highest-weighted among those. Spreads coverage so one hot topic doesn't monopolize;
  if all topics were covered recently, the run emits nothing.
- **Cap**: across all sources for the chosen topic, keep the top **1–2** by score
  (recency + source priority + phrase-match strength); emit those URLs; stop.

## Output: daily-note "What's New"

New subsection in the daily-note agent zone, alongside the existing
Resources/Explore sections (those stay concept-driven):

```markdown
### What's New
- [[Paper Title]] · arxiv · 2026-06-27 — abstract first line… → connects [[Existing Concept]]
- [[Article Title]] · HN — one-line abstract → [[Existing Concept]]  ([discussion](hn-url))
```

## Forgotten-topic passes

Both reuse the same search skills, `extract-arxiv`, and the same
`Agent Discovery Log` — so nothing surfaced hourly is re-surfaced, and no topic
rediscovered last cycle is re-hit (via `## Topic Coverage`).

- **Weekly review**: after the retrospective sections, run discovery on the top
  **2–3 faded topics**, cap **~5 new source notes**. New section
  `## Rediscovered — Fresh Content on Topics You've Drifted From`, grouping new
  `[[source notes]]` under each faded topic. Relaxes weekly-review's current
  "do not fetch external URLs" constraint — **scoped strictly to this section.**
- **Monthly review**: replace the narrow `find-resources` call in its niche-concept
  step with full four-source discovery on **dormant topics**, cap **~10 new source
  notes** (matches its existing fetch budget). Feeds its existing
  `## Fresh Resources` + MOC-update steps.

## Guardrails

- **Relevance gate**: a candidate is kept only if its title/abstract shares ≥1
  concept with the topic's `source_concepts` — blocks keyword false-positives.
- **Per-pass budgets** (hard ceilings): hourly ≤1 search call/source/topic and ≤2
  notes; weekly ≤5 notes; monthly ≤10 notes.
- **No fabrication / verify-exists** carried over from `find-resources`.
- **Failure isolation**: any source erroring (arxiv down, yt-dlp fails) is logged
  and skipped — discovery never aborts the main loop.

## Out of scope

- Twitter/X discovery (no reliable unauthenticated search).
- A user-editable interest registry (chose fully automatic inference).
- Folder restructuring of the vault (handled separately when the vault grows).
```
