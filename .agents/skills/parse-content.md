# Skill: Parse Content

**Used in**: Loop Phase 2 (ORIENT) for vault notes; Phase 4 (ACT) as router for external content

## Part A — Vault Note Parsing

For a given `.md` file already in the vault:

1. **Metadata**: title (first `# Heading` or filename), tags (`#tag`), frontmatter YAML, existing wikilinks
2. **Concepts**: `**bold**` terms, capitalised mid-sentence proper nouns, `[[wikilinks]]`, `##`/`###` headings
3. **Facts**: each bullet or numbered list item, each sentence under a heading
4. **Classify each item**:
   - Task: checkbox `- [ ]`, "TODO", imperative verb phrase
   - Question: ends with `?` or starts with Why/How/What
   - Fact/Claim: declarative statement
   - Reference: URL, book title, author name — **route to Part B**

### Output

```
PARSE_RESULT for <filename>:
  title: <string>
  tags: [#tag1]
  existing_links: [[Note1]]
  concepts: [A, B]
  facts: [Fact 1]
  tasks: [Task 1]
  questions: [Question 1]
  references: [url or citation]  ← hand these to Part B
```

### Guardrails

- Extract only — do not interpret or expand beyond what is written
- Ambiguous bullet (task vs fact) → classify as fact
- Proper nouns under 4 characters → include, flag `[ACRONYM]`

---

## Part B — External Content Routing

Triggered when a reference (URL or citation) is found in Part A, or when a daily note bullet is itself a URL.

### Step 1: Classify the URL

| Pattern | Type | Extractor |
|---------|------|-----------|
| `youtube.com/watch`, `youtu.be/` | YouTube | `skills/extract-youtube.md` |
| `twitter.com/`, `x.com/` (post URL) | Twitter/X | `skills/extract-twitter.md` |
| `arxiv.org/abs/`, `arxiv.org/pdf/` | arxiv paper | `skills/extract-arxiv.md` |
| Any other URL | Web article | `skills/fetch-url.md` |
| No URL — book/paper citation | Citation | log in `Agent Concept Gaps`, tag `#needs-review` |

### Step 2: Call Extractor

Each extractor returns an `EXTRACT_RESULT` with `status`, `note` (filename created), and `concepts`.

### Step 3: Update Source

After the extractor creates the source note:
1. Annotate the raw URL bullet in the originating vault note with `[[<source note title>]]`; keep the original URL in the source note frontmatter
2. If additional concepts were returned, add them to `Agent Concept Gaps` for atomic note generation
3. If additional URLs/references were returned, schedule or defer FETCH; do not treat URLs as concepts

### Failure

If the extractor returns `BLOCKED`, `FAILED`, or `EMPTY`, leave the original bullet untouched and append `#needs-review` only if safe.
