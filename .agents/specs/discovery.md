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
Read `Agent Interest Model`; skip rows whose `Flags` contain `mute`. `pass` scopes candidate rows: `active` → rows with `Last seen` ≤ 7 days ago; `faded` → `established` rows with `Last seen` > 7 and ≤ 21 days ago; `dormant` → `established` rows with `Last seen` > 21 days ago (each scope sets `since_date` per the table above). If no candidate rows remain → return no candidates.

### 2. Pick Topic(s)
Read `Agent Discovery Log` → `## Topic Coverage`. From scoped candidates, exclude any covered within the pass exclusion window (active: covered today; faded: covered in last 7 days; dormant: covered in last 30 days). Allocate the per-pass cap (table above) across remaining topics proportional to `Weight × focus_multiplier`, where `Focus ★` → ×1.5, others → ×1.0. Round down; remainder goes to the highest-weight topic. If none remain after exclusion → return no candidates.

### 3. Search Each Source
For each picked topic, call the search skills with `{topic, search_phrases, source_concepts, since_date}`:
`skills/search-arxiv.md`, `skills/search-youtube.md`, `skills/search-web.md`, `skills/search-hackernews.md`, `skills/search-rss.md`, `skills/search-twitter.md`.
Collect all `CANDIDATES`. Each skill self-limits to ≤1 call per topic (per feed for RSS).
- `search-rss.md` reads the user's feed list from the vault note `Feeds.md` and is topic-gated (only feed items matching `source_concepts`).
- `search-twitter.md` is **gated**: it returns empty unless the Agent-Reach Twitter backend + cookies are configured — so it is a no-op until enabled.

### 4. Dedup
Reject any candidate whose **normalized URL** (see `skills/agent-notes.md` Discovery Log rule) is:
- already a row in `## Surfaced`, OR
- already has a non-stub source note (same guard as `loop.md` Phase 4 FETCH).

### 5. Score + Cap
Score each survivor: `recency` (newer better) + `source_priority` (arxiv/hn > web/youtube for research topics; tune by topic nature) + `phrase_match` strength. Keep the top `cap` candidates across all topics/sources. Emit their URLs into the change set as FETCH candidates, tagged `discovered`.

### 6. Record
For each emitted candidate, append a `## Surfaced` row (date, source, normalized URL, `[[Topic]]`); set the `Note` column to `[[Title]]` after Phase 4 creates the note; for HN items, set the `Discussion` column to the `references` permalink — leave `Discussion` empty for non-HN. Upsert each covered topic's `## Topic Coverage` row with today's date and `pass`.

## Output

```
DISCOVERED (pass=<pass>): N urls
- <url> | <source> | [[Topic]]
```

## Constraints

- Hard cap per pass (table above). Never exceed, regardless of how many sources hit.
- If a search skill errors, log and skip it — discovery never aborts the loop.
- Creating > 5 notes in a session (dormant/faded passes) requires the `BULK_CREATION: N notes` log (`context/boundaries.md`).
- HN candidates carry their discussion permalink in `references`; record it in the Discovery Log `## Surfaced` Discussion column.
