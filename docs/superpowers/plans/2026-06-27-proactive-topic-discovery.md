# Proactive Topic-Driven Content Discovery — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a proactive discovery capability that infers the user's active topics from daily notes, fetches recent content on them from arxiv/YouTube/web/Hacker News, and weaves the results into the vault as source notes — including weekly/monthly passes that resurface forgotten topics.

**Architecture:** Approach A — discovery is a *URL producer*. New skills derive topics and search each source; they emit candidate URLs into the loop's change set, after which the **existing** extract → source-note → link → daily-suggestions pipeline runs unchanged. A new agent-managed note (`Agent Discovery Log`) is the dedup ledger that makes hourly re-runs safe.

**Tech Stack:** Markdown instruction files under `.agents/` (read by the LLM agent at runtime). External tools already present: `yt-dlp`, `defuddle`, `WebFetch`, `WebSearch`. Public HTTP APIs: arxiv (`export.arxiv.org`), Hacker News Algolia (`hn.algolia.com`). No new dependencies, no shell/cron changes.

## Global Constraints

- **This feature is pure instruction authoring.** Deliverables are `.agents/*.md` files. There is no compiler or unit-test layer for them; verification is structural (file exists, format matches existing skills/specs, cross-references resolve) plus a human read-review.
- **No shell/cron/harness-script changes.** Discovery folds into the already-cron'd hourly loop; weekly/monthly are already cron'd. Do **not** touch `scripts/`, `run.sh`, `setup.sh`, or the Obsidian plugin.
- **Brevity is a repo law** (`AGENTS.md` Core Principle "Brevity"): no prose where a list works; every `.agents/` file as short as possible. Match the terseness of existing skills.
- **Skill file format:** start with `# Skill: <Name>`, then a `**Used in**: …` line. **Spec file format:** start with `# Spec: <Name>`, then a `**Trigger**: …` line.
- **Source notes** follow `specs/source-note.md`. The discovery feature must not invent a new note shape.
- **Sources:** arxiv, YouTube, web/news, Hacker News only. **No Twitter.**
- **Caps (hard ceilings):** hourly ≤2 new source notes/run and ≤1 search call per source per topic; weekly ≤5; monthly ≤10. Creating >5 notes/session requires a `BULK_CREATION: N notes` log entry (`context/boundaries.md`).
- **No fabrication:** never emit a URL not returned by a real search/API call this session.

## Reusable Verification Command

Several tasks reference **VERIFY-REFS**. It confirms no instruction file points at a non-existent skill/spec/context file:

```bash
cd /home/openclaw/second-brain/.agents && \
grep -rhoE '\b(skills|specs|context)/[A-Za-z0-9_-]+(/[A-Za-z0-9_-]+)*\.md' . | sort -u | \
while read -r f; do [ -f "$f" ] || echo "DANGLING: $f"; done; echo "VERIFY-REFS done"
```
Expected: prints only `VERIFY-REFS done` with no `DANGLING:` lines.

---

### Task 1: Agent Discovery Log (dedup ledger) + agent-note wiring

The ledger is load-bearing for every later task, so it lands first.

**Files:**
- Modify: `.agents/context/agent-notes.md` (add note to the Standard Notes table)
- Modify: `.agents/skills/agent-notes.md` (add template + section; "four" → "five")
- Modify: `.agents/AGENTS.md` (Phase 0 step 3: "four" → "five")
- Modify: `.agents/context/boundaries.md:51` ("four agent-managed notes" → "five")

**Interfaces:**
- Produces: the agent-managed note **`Agent Discovery Log`** with two sections consumed by later tasks:
  - `## Surfaced` rows: `- YYYY-MM-DD | <source> | <normalized-url> | [[Topic]] | note: [[Note Title]]`
  - `## Topic Coverage` rows: `- [[Topic]] | last_covered: YYYY-MM-DD | pass: active|faded|dormant`
  - URL normalization rule (used by dedup): lowercase host, strip `www.`, strip query string and fragment, strip trailing slash.

- [ ] **Step 1: Add the note to the Standard Notes table** in `.agents/context/agent-notes.md` — add this row after the `Agent User Profile` row:

```markdown
| `Agent Discovery Log` | Surfaced discovery URLs + per-topic coverage markers (dedup ledger) |
```

- [ ] **Step 2: Add the template + update the count** in `.agents/skills/agent-notes.md`.
  - Change line 5 `…the four agent-managed vault notes.` → `…the five agent-managed vault notes.`
  - Change line 11 `…check that all four notes exist…` → `…check that all five notes exist…`
  - Append this section at the end of the file:

```markdown

---

## Agent Discovery Log

**Purpose**: Dedup ledger for proactive discovery. Records every URL surfaced and per-topic coverage markers so the hourly loop never re-surfaces the same item. Read in `specs/discovery.md` (dedup filter + rotation); written there after each emit.

### Template

```markdown
---
agent_managed: true
---

# Agent Discovery Log

## Surfaced

| Date | Source | Normalized URL | Topic | Note |
|------|--------|----------------|-------|------|

## Topic Coverage

| Topic | last_covered | pass |
|-------|--------------|------|

---
*Machine-maintained. Do not edit manually.* #agent-system
```

### Update (`specs/discovery.md`)

- After emitting a candidate, add a row to `## Surfaced` with the normalized URL and the source note it became.
- After covering a topic, upsert its `## Topic Coverage` row with today's date and the pass name.
- **URL normalization** (apply before any compare or store): lowercase host, strip `www.`, strip `?query` and `#fragment`, strip trailing `/`.
```

- [ ] **Step 3: Update Phase 0 in `.agents/AGENTS.md`** — change step 3 (line ~14) from `Verify all four agent-managed notes exist…` to `Verify all five agent-managed notes exist…`.

- [ ] **Step 4: Update `.agents/context/boundaries.md`** — change the Scope Creep list item (line 51) `3. One of the four agent-managed notes, OR` → `3. One of the five agent-managed notes, OR`.

- [ ] **Step 5: Verify references + counts**

Run:
```bash
cd /home/openclaw/second-brain && \
grep -rn "four agent-managed\|all four notes\|four agent-managed vault" .agents && echo "---should be empty above---"; \
grep -rn "Agent Discovery Log" .agents | head
```
Expected: no remaining "four agent-managed" matches; `Agent Discovery Log` appears in `context/agent-notes.md`, `skills/agent-notes.md`. Then run **VERIFY-REFS** → only `VERIFY-REFS done`.

- [ ] **Step 6: Read-review** — open `skills/agent-notes.md` and confirm the new section matches the terseness and structure of the other four note sections (frontmatter marker, `#agent-system` footer).

- [ ] **Step 7: Commit**

```bash
cd /home/openclaw/second-brain && git add .agents/ && \
git commit -m "Add Agent Discovery Log note convention (dedup ledger)"
```

---

### Task 2: `derive-topics.md` skill

**Files:**
- Create: `.agents/skills/derive-topics.md`

**Interfaces:**
- Consumes: the last ~14 daily notes (`YYYY-MM-DD.md`, user zone only).
- Produces: `TOPICS` list, each item `{topic, weight, last_seen, source_concepts:[…], search_phrases:[1–2 strings]}`, ranked by weight desc. Consumed by all search skills (`search_phrases`, `source_concepts`) and by `specs/discovery.md` (rotation uses `topic` + `weight`).
- Input parameter `mode ∈ {active, faded, dormant}` selects the window.

- [ ] **Step 1: Write the file** `.agents/skills/derive-topics.md`:

```markdown
# Skill: Derive Topics

**Used in**: `specs/discovery.md` (all passes); selects which topics to discover content for.

Infers the user's topics of interest from recent daily notes. No user-maintained list — fully automatic.

## Input

- `mode`: `active` | `faded` | `dormant` — selects the time window and ranking (see Step 3).

## Step 1: Collect Daily Notes

Read the last ~14 daily notes (`YYYY-MM-DD.md`), newest first. **User zone only** — stop at the `---`/`## Agent` separator; never read agent-zone bullets. Skip `agent_managed: true` notes.

## Step 2: Extract Concepts

From user bullets, extract concept candidates:
- `[[wikilinks]]` (strongest signal)
- `**bold**` terms
- Capitalised mid-sentence proper nouns
- Recurring multi-word noun phrases

Skip tasks (`- [ ]`), pure-URL bullets, and dates/amounts. Group near-synonyms under one canonical label (e.g. "LLMs", "language models" → `Large Language Models`).

## Step 3: Score by Mode

Per concept, build the sorted list of dates it appeared. Then:

| Mode | Window | Keep concepts that… | Weight |
|------|--------|---------------------|--------|
| `active` | last 14d | appeared in the last ~5d | recency-weighted (linear decay; today highest) |
| `faded` | 7–21d ago | had ≥2 appearances in 7–21d band but **none** in the last ~5d | total appearances in band |
| `dormant` | 30–90d ago | had real past signal (≥2 appearances) and untouched recently | total appearances in band |

A concept qualifies only if it appeared in ≥2 notes **or** once as an explicit `[[wikilink]]` — filters one-off noise.

## Step 4: Build Search Phrases

For each surviving topic, emit 1–2 search phrases:
1. the topic label itself
2. topic label + its most frequently co-occurring concept (most-linked neighbour), if any

## Output

```
TOPICS (mode=<mode>):
- topic: <label>
  weight: <number>
  last_seen: YYYY-MM-DD
  source_concepts: [A, B]
  search_phrases: ["<label>", "<label> <neighbour>"]
```

Return at most 5 topics, ranked by weight desc. Empty list if none qualify — do not fabricate.

## Guardrails

- Report only concepts actually present in the notes — no inference of unstated interests.
- Never read or score agent-zone content.
```

- [ ] **Step 2: Verify** — run **VERIFY-REFS** (expect clean). Confirm the file starts with `# Skill:` and a `**Used in**:` line:

```bash
head -3 /home/openclaw/second-brain/.agents/skills/derive-topics.md
```
Expected: `# Skill: Derive Topics` then a blank line then `**Used in**: …`.

- [ ] **Step 3: Read-review** — confirm the three modes are unambiguous and the output block names every field later tasks consume (`topic`, `weight`, `source_concepts`, `search_phrases`).

- [ ] **Step 4: Commit**

```bash
cd /home/openclaw/second-brain && git add .agents/skills/derive-topics.md && \
git commit -m "Add derive-topics skill (active/faded/dormant topic inference)"
```

---

### Task 3: API-based search skills — `search-arxiv.md` + `search-hackernews.md`

Both query a public HTTP API and return the uniform candidate shape. This task also establishes the **uniform search contract** that Task 4 reuses.

**Files:**
- Create: `.agents/skills/search-arxiv.md`
- Create: `.agents/skills/search-hackernews.md`

**Interfaces:**
- Consumes: `{topic, search_phrases, source_concepts, since_date}` from `derive-topics` (via `specs/discovery.md`).
- Produces (uniform across all four search skills): `CANDIDATES` list of `{url, title, published, source, why, references?}`, ≤3 items. `source` ∈ `arxiv|youtube|web|hn`. `references` is optional (HN puts the discussion permalink here).

- [ ] **Step 1: Write `.agents/skills/search-arxiv.md`:**

```markdown
# Skill: Search arxiv

**Used in**: `specs/discovery.md` Step 3 — recency-first paper discovery.

Returns recent arxiv papers for a topic. Conforms to the uniform search contract (see Output).

## Input

`{topic, search_phrases, source_concepts, since_date}`.

## Step 1: Query

For the first search phrase:
```bash
curl -s "http://export.arxiv.org/api/query?search_query=all:<phrase>&sortBy=submittedDate&sortOrder=descending&max_results=10"
```
URL-encode the phrase (spaces → `+`). One call per topic (budget).

## Step 2: Parse + Filter

The response is Atom XML. Per `<entry>` extract: `title`, `published`, `id` (the `arxiv.org/abs/<id>` URL), `summary` (abstract), `category`.
- Drop entries with `published` < `since_date`.
- **Relevance gate**: keep only if `title`+`summary` shares ≥1 term with `source_concepts`.

## Step 3: Select

Keep up to 3, newest first. For each: `why` = one clause (e.g. "new paper on <topic>, submitted <date>").

## Output

```
CANDIDATES (source=arxiv):
- url: https://arxiv.org/abs/<id>
  title: <title>
  published: YYYY-MM-DD
  source: arxiv
  why: <clause>
```
Empty list if none pass. Never fabricate an id.

## Guardrails

- ≤1 API call per topic per pass.
- Return abstract-page URLs (`/abs/`), not `/pdf/` — the extractor handles either but `/abs/` is canonical.
```

- [ ] **Step 2: Write `.agents/skills/search-hackernews.md`:**

```markdown
# Skill: Search Hacker News

**Used in**: `specs/discovery.md` Step 3 — recent high-signal tech/science discussion.

Returns recent HN stories for a topic via the Algolia API. Conforms to the uniform search contract.

## Input

`{topic, search_phrases, source_concepts, since_date}`.

## Step 1: Query

For the first search phrase:
```bash
curl -s "http://hn.algolia.com/api/v1/search_by_date?query=<phrase>&tags=story&numericFilters=points>20&hitsPerPage=15"
```
URL-encode the phrase. One call per topic (budget).

## Step 2: Parse + Filter

The response is JSON. Per `hits[]` extract: `title`, `url` (the linked article; may be null for Ask/Show HN text posts), `created_at`, `points`, `objectID` (→ discussion permalink `https://news.ycombinator.com/item?id=<objectID>`).
- Drop hits with `created_at` < `since_date`.
- If `url` is null (text post), use the discussion permalink as the primary `url` and omit `references`.
- **Relevance gate**: keep only if `title` shares ≥1 term with `source_concepts`.

## Step 3: Select

Keep up to 3, highest `points` first. `why` = "HN, <points> points, <date>".

## Output

```
CANDIDATES (source=hn):
- url: <article url or discussion permalink>
  title: <title>
  published: YYYY-MM-DD
  source: hn
  why: <clause>
  references: [https://news.ycombinator.com/item?id=<objectID>]
```
Empty list if none pass. `references` carries the discussion link so the source note records it. No new extractor — the article `url` is fetched by the existing `skills/fetch-url.md`.

## Guardrails

- ≤1 API call per topic per pass.
- Never emit a hit that failed the relevance gate.
```

- [ ] **Step 3: Smoke-test the APIs are reachable and shaped as documented** (sanity only — not a unit test):

```bash
curl -s "http://export.arxiv.org/api/query?search_query=all:transformers&max_results=1" | grep -c "<entry>"; \
curl -s "http://hn.algolia.com/api/v1/search_by_date?query=rust&tags=story&hitsPerPage=1" | grep -c "objectID"
```
Expected: each prints `1` (one entry / one objectID present). If `0`, the API URL in the skill is wrong — fix before committing.

- [ ] **Step 4: Verify + read-review** — run **VERIFY-REFS** (clean). Confirm both files share the identical `CANDIDATES` output field names (`url,title,published,source,why`).

- [ ] **Step 5: Commit**

```bash
cd /home/openclaw/second-brain && git add .agents/skills/search-arxiv.md .agents/skills/search-hackernews.md && \
git commit -m "Add arxiv + Hacker News discovery search skills"
```

---

### Task 4: Tool-based search skills — `search-youtube.md` + `search-web.md`

**Files:**
- Create: `.agents/skills/search-youtube.md`
- Create: `.agents/skills/search-web.md`

**Interfaces:**
- Consumes: `{topic, search_phrases, source_concepts, since_date}`.
- Produces: the same `CANDIDATES` shape as Task 3 (`source` = `youtube` / `web`).

- [ ] **Step 1: Write `.agents/skills/search-youtube.md`:**

```markdown
# Skill: Search YouTube

**Used in**: `specs/discovery.md` Step 3 — recent videos (talks, explainers, analysis).

Returns recent YouTube videos for a topic via `yt-dlp` search. Conforms to the uniform search contract.

## Input

`{topic, search_phrases, source_concepts, since_date}`.

## Step 1: Search

For the first search phrase:
```bash
yt-dlp "ytsearchdate20:<phrase>" --dump-json --flat-playlist --no-warnings
```
`ytsearchdate` returns newest first. One search per topic (budget).

## Step 2: Parse + Filter

Each JSON line is a video. Extract `id`, `title`, `upload_date` (YYYYMMDD), `duration`, `channel`.
- Drop `upload_date` < `since_date`.
- Drop `duration` < 60s (Shorts).
- **Relevance gate**: keep only if `title` shares ≥1 term with `source_concepts`.

## Step 3: Select

Keep up to 3, newest first. `why` = "video by <channel>, <date>".

## Output

```
CANDIDATES (source=youtube):
- url: https://www.youtube.com/watch?v=<id>
  title: <title>
  published: YYYY-MM-DD
  source: youtube
  why: <clause>
```
Empty list if none pass. The video is later extracted by the existing `skills/extract-youtube.md`.

## Guardrails

- ≤1 search per topic per pass.
- If `yt-dlp` errors, return an empty list and log the failure — never abort the loop.
```

- [ ] **Step 2: Write `.agents/skills/search-web.md`:**

```markdown
# Skill: Search Web

**Used in**: `specs/discovery.md` Step 3 — recent news, blog posts, and analysis articles.

Returns recent web articles for a topic via `WebSearch`. Conforms to the uniform search contract.

## Input

`{topic, search_phrases, source_concepts, since_date}`.

## Step 1: Search

Run `WebSearch` on the first search phrase with a recency bias — append the current year and "news OR analysis" (e.g. `<phrase> 2026 news OR analysis`). One WebSearch per topic (budget).

## Step 2: Filter

From results, collect candidates:
- Prefer a visible publication date ≥ `since_date`; if no date is visible, keep only if the result snippet implies recency.
- Exclude paywalled sites, social media (except YouTube — but those are handled by search-youtube), arxiv (handled by search-arxiv), and Hacker News (handled by search-hackernews).
- **Relevance gate**: keep only if title/snippet shares ≥1 term with `source_concepts`.

## Step 3: Select

Keep up to 3, most-recent first. `why` = one clause on why it connects to the topic.

## Output

```
CANDIDATES (source=web):
- url: <url>
  title: <title>
  published: YYYY-MM-DD | unknown
  source: web
  why: <clause>
```
Empty list if none pass. The article is later extracted by the existing `skills/fetch-url.md`.

## Guardrails

- ≤1 WebSearch per topic per pass.
- Never emit a URL not present in this session's search results.
```

- [ ] **Step 3: Verify + read-review** — run **VERIFY-REFS** (clean). Confirm both files emit the identical `CANDIDATES` field names as Task 3.

- [ ] **Step 4: Commit**

```bash
cd /home/openclaw/second-brain && git add .agents/skills/search-youtube.md .agents/skills/search-web.md && \
git commit -m "Add YouTube + web discovery search skills"
```

---

### Task 5: `extract-arxiv.md` extractor + `parse-content.md` route + `source-note.md` paper type

After this task, an `arxiv.org/abs/…` URL in the change set routes to a clean paper source note.

**Files:**
- Create: `.agents/skills/extract-arxiv.md`
- Modify: `.agents/skills/parse-content.md` (Part B Step 1 routing table)
- Modify: `.agents/specs/source-note.md` (add `paper` to the `source_type` enum)

**Interfaces:**
- Consumes: an arxiv URL routed from `parse-content` Part B.
- Produces: an `EXTRACT_RESULT` `{status, note, concepts}` identical to the other extractors; a source note with `source_type: paper` and the abstract embedded verbatim.

- [ ] **Step 1: Write `.agents/skills/extract-arxiv.md`:**

```markdown
# Skill: Extract arxiv

**Used in**: `skills/parse-content.md` Part B routing (Phase 4 ACT), for `arxiv.org/abs/` and `/pdf/` URLs.

Produces a source note (see `specs/source-note.md`) from an arxiv paper using the arxiv API — no scraping.

## Step 1: Extract arxiv ID

| URL pattern | ID |
|-------------|-----|
| `arxiv.org/abs/<id>` | `<id>` |
| `arxiv.org/pdf/<id>` (optional `.pdf`) | `<id>` |

Strip any version suffix only if the API returns 404 for the exact id. If no id → status `FAILED`.

## Step 2: Fetch Metadata

```bash
curl -s "http://export.arxiv.org/api/query?id_list=<id>"
```
Atom XML. From the single `<entry>` extract: `title`, all `<author><name>`, `published`, `summary` (the abstract), `<category term>` values. Non-200 / empty entry → status `FAILED`.

## Step 3: Create Source Note

Fill `specs/source-note.md` (single-URL template):
- `source_type: paper`
- `source_url`: `https://arxiv.org/abs/<id>`
- `## Summary`: 2–3 sentence synthesis of the abstract
- `## Key Points`: omit unless the abstract enumerates contributions
- `## Concepts`: the arxiv categories + key technical terms from the abstract → candidate wikilinks
- `## Raw Notes`: the **full abstract verbatim** as a blockquote, prefixed `> **Abstract.**`

Title: the paper title, Title Case, special characters stripped. Save as `$VAULT_PATH/<Title>.md`.

## Step 4: Return

```
EXTRACT_RESULT:
  status: OK | FAILED
  note: <filename or blank>
  concepts: [A, B, C]
```
```

- [ ] **Step 2: Add the arxiv route to `.agents/skills/parse-content.md`.** In Part B → Step 1 "Classify the URL" table, insert a row **above** the `Any other URL` row:

```markdown
| `arxiv.org/abs/`, `arxiv.org/pdf/` | arxiv paper | `skills/extract-arxiv.md` |
```

- [ ] **Step 3: Add `paper` to the source_type enum in `.agents/specs/source-note.md`.** In the single-URL template frontmatter, change:

```
source_type: article | youtube | twitter | pdf | other
```
to:
```
source_type: article | youtube | twitter | paper | pdf | other
```

- [ ] **Step 4: Verify** — run **VERIFY-REFS** (expect clean; the new `skills/extract-arxiv.md` reference in `parse-content.md` must resolve). Confirm the route exists:

```bash
grep -n "extract-arxiv" /home/openclaw/second-brain/.agents/skills/parse-content.md; \
grep -n "paper" /home/openclaw/second-brain/.agents/specs/source-note.md | head -1
```
Expected: both print a match.

- [ ] **Step 5: Read-review** — confirm `extract-arxiv.md`'s `EXTRACT_RESULT` block matches the field names returned by `extract-youtube.md` (`status`, `note`, `concepts`) so `parse-content` Part B Step 2/3 handles it identically.

- [ ] **Step 6: Commit**

```bash
cd /home/openclaw/second-brain && \
git add .agents/skills/extract-arxiv.md .agents/skills/parse-content.md .agents/specs/source-note.md && \
git commit -m "Add arxiv extractor + Part B route + paper source type"
```

---

### Task 6: `specs/discovery.md` orchestrator + loop integration

Ties the pieces together and wires discovery into Phase 1 of the loop.

**Files:**
- Create: `.agents/specs/discovery.md`
- Modify: `.agents/loop.md` (Phase 1 OBSERVE — add the discovery step)

**Interfaces:**
- Consumes: `derive-topics` (TOPICS), the four `search-*` skills (CANDIDATES), `Agent Discovery Log` (dedup + rotation).
- Produces: ≤cap candidate URLs added to the loop's **change set** as FETCH candidates; updated `Agent Discovery Log`.
- Parameter `pass ∈ {active, faded, dormant}` with cap `{active:2, faded:5, dormant:10}` and `since_date` `{active: 5d, faded: 21d, dormant: 90d}` ago.

- [ ] **Step 1: Write `.agents/specs/discovery.md`:**

```markdown
# Spec: Discovery

**Trigger**: Called by `loop.md` Phase 1 (`pass=active`, every hourly run); by `specs/weekly-review.md` (`pass=faded`); by `specs/monthly-review.md` (`pass=dormant`).

**Goal**: Produce candidate URLs for recent content on the user's topics and hand them to the existing FETCH pipeline. Discovery only *produces URLs* — it never writes source notes itself.

## Parameters

| pass | topic mode | since_date | cap (max notes) |
|------|-----------|-----------|-----------------|
| active | `active` | 5 days ago | 2 |
| faded | `faded` | 21 days ago | 5 |
| dormant | `dormant` | 90 days ago | 10 |

## Steps

### 1. Derive Topics
Call `skills/derive-topics.md` with `mode = pass`. If empty → return no candidates.

### 2. Pick Topic(s)
Read `Agent Discovery Log` → `## Topic Coverage`.
- **active**: pick the single highest-weight topic whose `last_covered` is older than the last 3 runs (or never covered). If all were covered recently, return no candidates.
- **faded**: pick the top 2–3 topics not covered in the last 7 days.
- **dormant**: pick the top topics until the cap is reachable, not covered in the last 30 days.

### 3. Search Each Source
For each picked topic, call all four search skills with `{topic, search_phrases, source_concepts, since_date}`:
`skills/search-arxiv.md`, `skills/search-youtube.md`, `skills/search-web.md`, `skills/search-hackernews.md`.
Collect all `CANDIDATES`. Each skill self-limits to ≤1 call per topic.

### 4. Dedup
Reject any candidate whose **normalized URL** (see `skills/agent-notes.md` Discovery Log rule) is:
- already a row in `## Surfaced`, OR
- already has a non-stub source note (same guard as `loop.md` Phase 4 FETCH).

### 5. Score + Cap
Score each survivor: `recency` (newer better) + `source_priority` (arxiv/hn > web/youtube for research topics; tune by topic nature) + `phrase_match` strength. Keep the top `cap` candidates across all topics/sources. Emit their URLs into the change set as FETCH candidates, tagged `discovered`.

### 6. Record
For each emitted candidate, append a `## Surfaced` row (date, source, normalized URL, `[[Topic]]`, and — after Phase 4 creates the note — `note: [[Title]]`). Upsert each covered topic's `## Topic Coverage` row with today's date and `pass`.

## Output

```
DISCOVERED (pass=<pass>): N urls
- <url> | <source> | [[Topic]]
```

## Constraints

- Hard cap per pass (table above). Never exceed, regardless of how many sources hit.
- If a search skill errors, log and skip it — discovery never aborts the loop.
- Creating > 5 notes in a session (dormant/faded passes) requires the `BULK_CREATION: N notes` log (`context/boundaries.md`).
- HN candidates carry their discussion permalink in `references`; preserve it into the source note.
```

- [ ] **Step 2: Wire into `.agents/loop.md` Phase 1 (OBSERVE).** Insert a new step **between** current step 1 (read `last_run_timestamp`) and step 2 (add today's daily note), and renumber subsequent steps:

```markdown
2. **Discovery** (pass=active): run `specs/discovery.md` → obtain ≤2 candidate URLs. Add each to the change set as a FETCH candidate (treated exactly like a daily-note URL bullet). If discovery returns nothing, continue.
```

(After insertion, Phase 1 reads: 1 read timestamp, 2 discovery, 3 add today's note, 4 find modified files, 5 inbox tag scan, 6 merge/dedup, 7 classify active/idle. Update the numeric labels accordingly.)

- [ ] **Step 3: Verify** — run **VERIFY-REFS** (the new `specs/discovery.md` references to the four search skills + derive-topics must resolve). Then:

```bash
grep -n "discovery.md" /home/openclaw/second-brain/.agents/loop.md
```
Expected: prints the inserted Phase 1 step.

- [ ] **Step 4: Read-review** — confirm the cap table in `discovery.md` matches the Global Constraints caps (2/5/10), and that Phase 1's renumbered steps still read coherently end to end.

- [ ] **Step 5: Commit**

```bash
cd /home/openclaw/second-brain && git add .agents/specs/discovery.md .agents/loop.md && \
git commit -m "Add discovery orchestrator spec + wire into loop Phase 1"
```

---

### Task 7: Daily-note "What's New" output

**Files:**
- Modify: `.agents/specs/daily-suggestions.md` (new sub-section + step)
- Modify: `.agents/context/vault-structure.md` (document the agent-zone sub-section)

**Interfaces:**
- Consumes: `Agent Discovery Log` `## Surfaced` rows dated today.
- Produces: a `### What's New` block in the daily note's agent zone.

- [ ] **Step 1: Add the template block to `.agents/specs/daily-suggestions.md`.** In the `## Output Template`, add this sub-section immediately after the `### Loose Ends` block (keep it before `### Routines`):

```markdown
### What's New
<!-- Items discovered today for your active topics (from Agent Discovery Log) -->
- [[Source Title]] · <source> · YYYY-MM-DD — one-line abstract → [[Existing Concept]]
```

- [ ] **Step 2: Add the assembly step.** In `## Steps`, add a new step `### 3e. What's New` after `### 3d. Question for Today`:

```markdown
### 3e. What's New

Read `Agent Discovery Log` → `## Surfaced`. Take rows dated today whose `note:` is filled.
For each (max 5, newest first): render `- [[Note Title]] · <source> · YYYY-MM-DD — <first line of the note's ## Summary> → <first [[concept]] from the note's ## Concepts>`.
For HN items, append `([discussion](<permalink from the note frontmatter>))`.
Omit the section if no discovery rows are dated today.
```

- [ ] **Step 3: Add "What's New" to the assembly order.** In step `### 5. Write to Today's Daily Note`, insert into the ordered list after `1. Loose Ends`:

```markdown
2. **What's New** — proactive discovery feed
```
(Renumber the remaining items: Routines becomes 3, On This Day 4, etc.)

- [ ] **Step 4: Document the zone in `.agents/context/vault-structure.md`.** In the daily-note agent-zone example, add after the `### Resources` block:

```markdown
### What's New
- [[Source Title]] · arxiv · YYYY-MM-DD — abstract line → [[Concept]]
```

- [ ] **Step 5: Verify + read-review** — run **VERIFY-REFS** (clean). Confirm `daily-suggestions.md` references `Agent Discovery Log` and the section order list is internally consistent (no duplicate numbers).

```bash
grep -n "What's New\|Agent Discovery Log" /home/openclaw/second-brain/.agents/specs/daily-suggestions.md
```
Expected: matches in both the template and the new step.

- [ ] **Step 6: Commit**

```bash
cd /home/openclaw/second-brain && \
git add .agents/specs/daily-suggestions.md .agents/context/vault-structure.md && \
git commit -m "Add What's New discovery feed to daily note agent zone"
```

---

### Task 8: Weekly review — `faded`-topic discovery

**Files:**
- Modify: `.agents/specs/weekly-review.md`

**Interfaces:**
- Consumes: `specs/discovery.md` with `pass=faded`.
- Produces: a `## Rediscovered` section listing new source notes grouped by faded topic.

- [ ] **Step 1: Add the template section to `.agents/specs/weekly-review.md`.** In `## Output Template`, add before the closing `---`/`Tags` block:

```markdown
## Rediscovered — Fresh Content on Topics You've Drifted From
<!-- Faded topics (active recently-past, quiet now) with newly discovered source notes -->
- **[[Faded Topic]]**
  - [[Source Title]] · <source> · YYYY-MM-DD — one-line why
```

- [ ] **Step 2: Add the discovery step.** In `## Steps`, add `### 5b. Rediscover Faded Topics` after `### 5. Collect Open Threads`:

```markdown
### 5b. Rediscover Faded Topics

Run `specs/discovery.md` with `pass=faded` (cap 5 new source notes). The emitted URLs are fetched through the normal extract → source-note pipeline this session. Group the resulting `[[source notes]]` under their faded topic for the `## Rediscovered` section. If discovery returns nothing, omit the section.
```

- [ ] **Step 3: Scope the "no fetch" constraint.** In `## Constraints`, change the line `- Do not fetch external URLs — this is a retrospective, not an enrichment run` to:

```markdown
- Do not fetch external URLs **except** via the `### 5b` faded-topic discovery pass (cap 5 notes); the rest of the review is retrospective only
```

- [ ] **Step 4: Update the Phase Integration Map** row for Phase 4 to mention discovery:

```markdown
| Phase 4 ACT | Write `Weekly Review — YYYY-W##.md`; run `pass=faded` discovery (≤5 source notes) |
```

- [ ] **Step 5: Verify + read-review** — run **VERIFY-REFS** (the new `specs/discovery.md` reference must resolve). Confirm the constraint no longer flatly forbids fetching:

```bash
grep -n "discovery.md\|except\|Rediscover" /home/openclaw/second-brain/.agents/specs/weekly-review.md
```
Expected: matches present; the bare "Do not fetch external URLs" line is gone.

- [ ] **Step 6: Commit**

```bash
cd /home/openclaw/second-brain && git add .agents/specs/weekly-review.md && \
git commit -m "Add faded-topic rediscovery to weekly review"
```

---

### Task 9: Monthly review — `dormant`-topic discovery

Replaces the narrow `find-resources` call with full four-source discovery on dormant topics.

**Files:**
- Modify: `.agents/specs/monthly-review.md`

**Interfaces:**
- Consumes: `specs/discovery.md` with `pass=dormant`.
- Produces: dormant-topic source notes feeding the existing `## Fresh Resources` + MOC steps.

- [ ] **Step 1: Replace the resource-finding step.** In `.agents/specs/monthly-review.md` `### 3. Find Fresh Resources`, replace its body with:

```markdown
### 3. Find Fresh Content (Dormant Topics)

Run `specs/discovery.md` with `pass=dormant` (cap 10 new source notes). It derives dormant topics, searches all four sources (arxiv/YouTube/web/HN), dedups against `Agent Discovery Log`, and emits URLs that this session fetches into source notes. Use the resulting `[[source notes]]` to populate `## Fresh Resources Added`, one line per note. For niche concepts that already have an atomic note, also append the new source under that note's `## References` (Step 4 below).
```

- [ ] **Step 2: Keep `find-resources` as a fallback note.** Append to that same step:

```markdown
If discovery returns fewer than 2 items for a niche concept that has an atomic note, fall back to `skills/find-resources.md` for that concept (concept-driven web search) to fill the gap.
```

- [ ] **Step 3: Update the Phase Integration Map** Phase 4 row:

```markdown
| Phase 4 ACT | Run `pass=dormant` discovery (≤10 source notes); add resources to atomic notes; update/create MOCs; write review note |
```

- [ ] **Step 4: Update the budget constraint.** In `## Constraints`, change `- Limit to 5 niche concepts and 10 total external fetches per session — stay within budget` to:

```markdown
- Limit to 10 new discovery source notes per session (the `pass=dormant` cap); plus ≤2 `find-resources` fallback fetches per niche concept — stay within budget
```

- [ ] **Step 5: Verify + read-review** — run **VERIFY-REFS** (clean). Confirm discovery is referenced and the 10-note cap is consistent with `specs/discovery.md`:

```bash
grep -n "discovery.md\|pass=dormant\|10 new discovery" /home/openclaw/second-brain/.agents/specs/monthly-review.md
```
Expected: all three match.

- [ ] **Step 6: Final whole-feature verification** — run **VERIFY-REFS** once more from a clean state and confirm the full set of new files exists:

```bash
cd /home/openclaw/second-brain && for f in \
  .agents/skills/derive-topics.md .agents/skills/search-arxiv.md \
  .agents/skills/search-hackernews.md .agents/skills/search-youtube.md \
  .agents/skills/search-web.md .agents/skills/extract-arxiv.md \
  .agents/specs/discovery.md; do [ -f "$f" ] && echo "OK $f" || echo "MISSING $f"; done
```
Expected: seven `OK` lines.

- [ ] **Step 7: Commit + push** (per repo commit-and-push policy)

```bash
cd /home/openclaw/second-brain && git add .agents/specs/monthly-review.md && \
git commit -m "Replace monthly find-resources with dormant-topic discovery" && \
git push
```

---

## Self-Review (completed by plan author)

**Spec coverage:** every spec section maps to a task — interest inference → T2; four sources → T3/T4; arxiv extractor + abstracts → T5; dedup ledger → T1; orchestrator/cap/rotation → T6; hourly loop integration + What's New → T6/T7; weekly faded → T8; monthly dormant → T9; "no Twitter / no interest file / no folder restructuring" honored (no tasks create them).

**Placeholder scan:** no TBD/TODO; every new file has complete content; modifications give exact old→new text; every command has an expected result.

**Type/name consistency:** `CANDIDATES` fields (`url,title,published,source,why,references?`) identical across T3/T4; `EXTRACT_RESULT` (`status,note,concepts`) matches existing extractors in T5; `TOPICS` fields (`topic,weight,source_concepts,search_phrases`) produced in T2 and consumed in T3/T4/T6; cap values (2/5/10) identical in Global Constraints, T6, T8, T9; `Agent Discovery Log` section names (`## Surfaced`, `## Topic Coverage`) and normalization rule defined in T1 and referenced in T3/T6/T7.
