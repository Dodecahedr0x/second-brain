# Spec: Atomic Note Generation

**Trigger**: A concept is in `Agent Concept Gaps` with no existing note, OR ingestion produced a concept that warrants its own note.

## Atomic Note Standard

An atomic note covers **one concept** with real substance — not a surface one-liner:

- **Depth**: explain what it is, how it works, and its key distinctions / trade-offs, synthesized from **≥2 sources of different kinds** where available (e.g. a paper *and* a video/blog *and* a discussion) — go past the dictionary definition.
- **Breadth**: wikilink every related concept **inline in the body** and in `## See Also`; when the note introduces an important sub-concept with no note yet, add it to `Agent Concept Gaps` so exploration keeps widening.
- **No `## Context` section**: a note's place in the graph is carried by its inline `[[wikilinks]]`, its `## See Also`, and the **backlinks** other notes point at it — never a prose section explaining why the note exists.

```markdown
---
agent_generated: true
agent_last_touched: YYYY-MM-DDThh:mm:ssZ
---

# [Concept Name]

[2–4 sentence summary: what it is and what it's for. Wikilink related concepts inline as they appear, e.g. "a [[Transformer]] variant that ...".]

## How It Works

- [Mechanism, key property, or distinction — substantive, not a single word. Wikilink related concepts.]
- [A trade-off, a comparison to [[Alternative]], or when to use it.]

## Examples

- [A concrete example or application, if known.]

## References

- [2+ sources of different kinds where available — e.g. a paper, a video/blog, a discussion — not a single link.]

## See Also

- [[Related Note]] — the neighbours this concept sits between (context comes from these links + backlinks)

---
Tags: #[topic] #atomic
```

## Generation Process

1. Check `Agent Vault Index` — confirm the note does NOT already exist under a different name
2. Name the file exactly as the concept appears in wikilinks: `[[Syncthing]]` → `Syncthing.md`
3. Fill the template above. Do not hallucinate facts — if information is unknown, use "Information pending" and tag `#stub`
4. Save to `<Concept>.md` at the vault root (check legacy `Atomic/<Concept>.md` first to avoid duplicates; do not move legacy notes automatically)
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
