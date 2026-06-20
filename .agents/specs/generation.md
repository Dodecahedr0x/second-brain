# Spec: Atomic Note Generation

**Trigger**: A concept is in `Agent Concept Gaps` with no existing note, OR ingestion produced a concept that warrants its own note.

## Atomic Note Standard

An atomic note covers **one concept**. It must contain:

```markdown
# [Concept Name]

[One to three sentence summary of what this concept is.]

## Key Properties

- Property 1
- Property 2

## Context

[How this concept fits into the vault's knowledge graph — what it relates to.]

## References

- [Source if known]

## See Also

- [[Related Note 1]]
- [[Related Note 2]]

---
Tags: #[topic] #atomic
```

## Generation Process

1. Check `Agent Vault Index` — confirm the note does NOT already exist under a different name
2. Name the file exactly as the concept appears in wikilinks: `[[Syncthing]]` → `Syncthing.md`
3. Fill the template above. Do not hallucinate facts — if information is unknown, use "Information pending" and tag `#stub`
4. Save to the vault root (or appropriate topic folder if one exists)
5. Update `Agent Vault Index` with the new note
6. Update `Agent Concept Gaps` — move concept from Pending to Created
7. Return to `specs/connection.md` — link the new note to/from related notes

## Stub Policy

If the agent cannot confidently write more than the title and one sentence:
- Create the note as a `#stub` with just the title and a one-line placeholder
- Do NOT fill in speculative content
- Log it in `Agent Operation Log` as `STUB_CREATED`
- The user will fill it in; the stub ensures wikilinks don't dangle

## Naming Rules

- Use Title Case for concept names
- Match exactly how the concept appears in `[[wikilinks]]` already in the vault
- If a concept has multiple names, use the most common one and add aliases in frontmatter:
  ```yaml
  ---
  aliases: [Other Name, Yet Another Name]
  ---
  ```
