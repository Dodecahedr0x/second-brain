# Skill: Parse Content

**Used in**: Loop Phase 2 (ORIENT)

## Purpose

Extract structured information from a raw vault note for downstream processing.

## Parse Steps

For a given note file:

1. **Extract metadata**:
   - Title: first `# Heading` or filename (strip `.md`)
   - Tags: all `#tag` tokens
   - Frontmatter: YAML block if present
   - Existing wikilinks: all `[[Target]]` patterns

2. **Extract concepts**:
   - All `**bold**` terms (often key concepts)
   - All proper nouns (capitalized mid-sentence)
   - All `[[wikilinks]]` even if already existing
   - Headings `##` and `###` (each is a sub-concept)

3. **Extract facts**:
   - Each bullet point or numbered list item
   - Each sentence under a heading

4. **Classify content type**:
   - Task: contains checkbox `- [ ]`, "TODO", "- [ ]", imperative verb phrase
   - Question: ends with `?` or starts with "Why", "How", "What"
   - Fact/Claim: declarative statement
   - Reference: URL, book title, author name

## Output Format

```
PARSE_RESULT for <filename>:
  title: <string>
  tags: [#tag1, #tag2]
  existing_links: [[Note1]], [[Note2]]
  concepts: [Concept A, Concept B]
  facts: [Fact 1, Fact 2]
  tasks: [Task 1]
  questions: [Question 1]
  references: [URL or citation]
```

## Guardrails

- Do not interpret or expand beyond what is written — only extract
- If a bullet is ambiguous between task and fact → classify as fact
- Proper nouns under 4 characters are likely acronyms → include but flag with `[ACRONYM]`
