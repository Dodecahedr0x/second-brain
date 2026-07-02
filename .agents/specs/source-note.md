# Spec: Source Note

A source note captures a specific piece of external content (article, video, tweet, etc.) as a first-class vault note. Unlike atomic notes (one concept), source notes are about one *artifact*.

## When to Create

Create a source note whenever a daily note references external content that warrants more than a single bullet — i.e., content rich enough to extract multiple concepts or facts from.

## Template — Single URL

```markdown
---
source_url: <url>
source_type: article | youtube | twitter | paper | pdf | other
captured: YYYY-MM-DD
agent_processed: true
agent_generated: true
agent_last_touched: YYYY-MM-DDThh:mm:ssZ
---

# <Title>

> [!info] Source
> [<display title>](<url>) — <author if known>, <pub_date if known>

## Summary

<2–5 sentence summary of the main argument or content.>

## Key Points

- Point 1
- Point 2

## Concepts

Links to atomic notes for concepts mentioned in this source:
- [[Concept A]]
- [[Concept B]]

## Raw Notes

<Optional: verbatim quotes, transcript excerpts, or timestamped notes.>

---
Tags: #source #<source_type>
```

## Template — Multiple URLs (same site)

Use when two or more URLs from the same site are processed together. The user's original bullets are left untouched; the single source note is surfaced in the agent zone (see Linking Back).

```markdown
---
source_url: <root or first url>
source_urls:
  - <url1>
  - <url2>
source_type: article | docs | other
captured: YYYY-MM-DD
agent_processed: true
agent_generated: true
agent_last_touched: YYYY-MM-DDThh:mm:ssZ
---

# <Site Name>

> [!info] Source
> [<site name>](<root url>) — <author / org if known>

## Summary

<Synthesized summary across all pages — 3–6 sentences.>

## Key Points

<Merged and deduplicated from all pages — max 10 bullets.>

## Concepts

- [[Concept A]]
- [[Concept B]]

## Pages

| Page | Key Takeaway |
|------|-------------|
| [<page title>](<url1>) | One sentence |
| [<page title>](<url2>) | One sentence |

## Raw Notes

### [<page title>](<url1>)

> <key excerpt or first 200 words>

### [<page title>](<url2>)

> <key excerpt or first 200 words>

---
Tags: #source #<source_type>
```

## Naming

- **Path**: create new source notes flat at the vault root: `$VAULT_PATH/<Title>.md`.
- **Single URL**: use the content's own title, Title Case, stripped of special characters: `<Title>.md`.
- **Multiple URLs**: use the site name + a topic qualifier if all pages share a clear sub-topic (e.g., `Python Documentation — asyncio.md`); otherwise just the site name (`MDN Web Docs.md`).
- Fallback if title unknown: `<Source Type> - <YYYY-MM-DD>.md`.
- Before creating, apply the Duplicate / Missing-Note Guard from `specs/reconcile.md` (checks flat root and legacy `Sources/<Title>.md`). Do not move legacy notes automatically.
- When an existing note is found by the guard, run `skills/classify-note.md` augment-check before editing; if `agent_augmented`, additive edits only. Always stamp `agent_last_touched` after editing.

## Linking Back

**Never modify the user's pasted link or its bullet — the user zone is read-only.** After creating the source note, surface it in the **recap's `## New Notes`** via `skills/recap.md`, leaving the user's original bullet exactly as written:

```
## New Notes
- [[Some Video Title]] — from a link in your notes
- [[Python Documentation — asyncio]] — from a link in your notes
```

The `source_url` (and `source_urls` for multi-URL notes) lives in the source note's frontmatter, so the reference is preserved without touching the user's text. Do not annotate, replace, or append to the user's bullets.

## Relationship to Atomic Notes

Source notes and atomic notes serve different purposes:

| Source Note | Atomic Note |
|-------------|-------------|
| About one artifact | About one concept |
| Created once, rarely updated | Updated as concept evolves |
| Contains `## Raw Notes` / excerpts | Contains synthesised knowledge only |
| Tagged `#source` | Tagged `#atomic` |

The `## Concepts` section of a source note is the bridge: it links out to atomic notes, and atomic notes' `## References` sections link back.
