# Spec: Source Note

A source note captures a specific piece of external content (article, video, tweet, etc.) as a first-class vault note. Unlike atomic notes (one concept), source notes are about one *artifact*.

## When to Create

Create a source note whenever a daily note references external content that warrants more than a single bullet — i.e., content rich enough to extract multiple concepts or facts from.

## Template

```markdown
---
source_url: <url>
source_type: article | youtube | twitter | pdf | other
captured: YYYY-MM-DD
agent_processed: true
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

## Naming

`<Title>.md` — use the content's own title, Title Case, stripped of special characters.

If the title is unknown or too generic, use: `<Source Type> - <YYYY-MM-DD>.md`

## Linking Back

After creating the source note, update the originating daily note bullet:

```
- Watched [[Some Video Title]] — <one-line personal note if any>
```

Replace or annotate the raw URL with the wikilink. Do not delete the original URL — keep it in the source note's frontmatter.

## Relationship to Atomic Notes

Source notes and atomic notes serve different purposes:

| Source Note | Atomic Note |
|-------------|-------------|
| About one artifact | About one concept |
| Created once, rarely updated | Updated as concept evolves |
| Contains `## Raw Notes` / excerpts | Contains synthesised knowledge only |
| Tagged `#source` | Tagged `#atomic` |

The `## Concepts` section of a source note is the bridge: it links out to atomic notes, and atomic notes' `## References` sections link back.
