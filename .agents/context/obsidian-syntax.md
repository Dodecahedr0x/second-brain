# Obsidian Markdown Syntax Reference

Quick reference for syntax the agent needs when writing vault notes.

## Wikilinks

```markdown
[[Note Title]]                    — basic link
[[Note Title|display text]]       — link with custom display text  
[[Note Title#Heading]]            — link to specific heading
![[Note Title]]                   — embed note inline
![[image.png]]                    — embed image
```

## Frontmatter (YAML)

```yaml
---
aliases: [Alias One, Alias Two]
tags: [tag1, tag2]
created: 2026-06-19
---
```

Agents should add frontmatter to atomic notes. Not required for daily notes.

## Tags

```markdown
#tagname              — inline tag
#parent/child         — nested tag
```

## Callouts

```markdown
> [!note]
> Content here

> [!warning]
> Content here

> [!tip]
> Content here
```

Use callouts sparingly — only when the note's author clearly intended a highlighted block.

## Headings

```markdown
# H1 — note title (one per note)
## H2 — major section
### H3 — subsection
```

## Tasks

```markdown
- [ ] Incomplete task
- [x] Complete task
```

Do not modify or create task items — leave those to the user.

## Agent-Safe Operations

The agent is permitted to write all syntax above EXCEPT:
- Do not create embedded notes (`![[]]`) in other people's notes without clear intent
- Do not add callouts to existing notes — only to new notes the agent creates
- Do not modify frontmatter that already exists — only add frontmatter to notes that have none
