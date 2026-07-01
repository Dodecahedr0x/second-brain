# Skill: Search RSS

**Used in**: `specs/discovery.md` Step 3 — new items from the user's subscribed feeds, topic-gated.

Reads feed URLs from the vault note `Feeds.md`, pulls recent entries, and returns those matching the topic. Conforms to the uniform search contract.

## Input

`{topic, search_phrases, source_concepts, since_date}`.

## Step 0: Load Feeds

Read `$VAULT_PATH/Feeds.md`. Extract one `http(s)` URL per line; ignore blank lines and lines starting with `#` (comments). If the note is missing or has no active URLs → return empty `CANDIDATES`.

## Step 1: Fetch Entries

For each feed URL (cap 10 feeds), parse with `feedparser` (installed by `setup.sh`):
```bash
python3 -c "import feedparser,json,sys; d=feedparser.parse(sys.argv[1]); print(json.dumps([{'title':e.get('title',''),'link':e.get('link',''),'published':e.get('published',e.get('updated','')),'summary':e.get('summary','')[:300]} for e in d.entries[:15]]))" "<feed_url>"
```

## Step 2: Parse + Filter

- Drop entries whose `published` is older than `since_date` (if the date is unparseable, keep the entry).
- **Relevance gate (the topic filter)**: keep only if `title`+`summary` shares ≥1 term with `source_concepts`. This is what makes RSS topic-gated — feed items that don't match an active topic are dropped.

## Step 3: Select

Keep up to 3 across all feeds, newest first. `why` = "from <feed title>, <date>".

## Output

```
CANDIDATES (source=rss):
- url: <entry link>
  title: <title>
  published: YYYY-MM-DD | unknown
  source: rss
  why: <clause>
```
Empty list if none pass. The linked article is later extracted by `skills/fetch-url.md` (or the arxiv/youtube extractor if the link matches those patterns).

## Guardrails

- ≤10 feeds, ≤15 entries/feed per pass.
- If a feed fails to fetch/parse, skip it and continue — never abort the loop.
- Never emit an entry that failed the relevance gate.
