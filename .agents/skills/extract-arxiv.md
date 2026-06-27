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
curl -sL "https://export.arxiv.org/api/query?id_list=<id>"
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
