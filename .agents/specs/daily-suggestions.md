# Spec: Daily Suggestions

**Trigger**: End of each daily pipeline run, after §Knowledge Digest is written.

**Goal**: Write a curated, actionable section to today's daily note so the user opens Obsidian and immediately knows what to explore and do — with hooks that pull them back (open threads, memory, questions, stakes).

---

## Output Location

Append to `$VAULT_PATH/YYYY-MM-DD.md` (today's date, not the note being processed).
Create the file if it does not exist yet.

The section is written after any digest and before the processed footer, if present.

---

## Output Template

```markdown
---

## Suggestions — YYYY-MM-DD

### Loose Ends
<!-- Open questions or follow-ups from the past 7 days not yet resolved -->
- *YYYY-MM-DD* — bullet text with [[wikilinks]]

### What's New
<!-- Items discovered today for your active topics (from Agent Discovery Log) -->
- [[Source Title]] · <source> · YYYY-MM-DD — one-line abstract → [[Existing Concept]]

### Routines
<!-- Fading routines first (pick back up — fading), then active -->
- **Activity name** · N-day streak · Next: specific action
- **Fading activity** · last seen YYYY-MM-DD · Pick back up — fading

### On This Day
<!-- 1–2 items from same date in prior weeks/months/years -->
- *N days ago* — bullet text with [[wikilinks]]

### Question for Today
<!-- One specific open question derived from this week's theme or a stub note -->
> Question text here?

### Explore
<!-- 2–4 resources or concepts worth visiting today -->
- [Resource Title](url) — one line on why it connects to your recent notes
- [[Concept]] — in your notes but not yet explored; worth creating a note

### This Week's Theme
<!-- One sentence naming the dominant concept cluster this week, with a suggestion -->
One sentence + optional [[MOC suggestion]]
```

Omit any section with no entries. Keep the total under 20 lines — if more items exist, pick the highest-value ones.

---

## Steps

### 1. Compile Recent Knowledge

Read `Agent Vault Index`:
- Collect all notes with `[UPDATED …]` or created within the last 7 days
- Group by topic/tag to find clusters
- Identify notes still tagged `#stub` or with no outbound wikilinks — these are loose ends

### 2. Find Resources

For each cluster of ≥ 2 recently-touched concepts, call `skills/find-resources.md`:
- Get 1–2 high-quality external resources per cluster (article, video, docs page)
- Prefer resources not already in any vault note's `## References` section

### 3. Identify Routines

Call `skills/identify-routines.md` on the last 14 daily notes:
- Get routines sorted: **fading first** (urgent: true), then active, then dormant
- For fading routines, render as: `**Name** · last seen YYYY-MM-DD · Pick back up — fading`
- For active routines, render as: `**Name** · N-day streak · Next: [next_step]`
- Omit dormant routines

### 3b. On This Day

Call `skills/on-this-day.md` with today's date.
Use the returned items verbatim — do not paraphrase. If the result is empty, omit the section.

### 3c. Loose Ends

Call `skills/unresolved-threads.md` on the last 7 daily notes.
Use the returned items verbatim. If the result is empty, omit the section.

### 4. Identify This Week's Theme

From the concept clusters found in Step 1:
- Name the dominant theme (the cluster with the most recently-touched notes)
- If 3+ notes share a topic and no MOC exists for it, suggest creating one

### 3d. Question for Today

Using the dominant theme from Step 4 and any `#stub` notes from Step 1, generate one specific, answerable question:
- Tool/technique theme → ask about a concrete use case or trade-off
- Theory/concept theme → ask for an empirical example or counter-argument
- Stub note → ask the most obvious unanswered question implied by the stub's title

The question must go one level deeper than what's already in the notes — do not ask something the vault already answers. Format as a `>` blockquote so it reads as a writing prompt, not agent commentary.

Omit this section if no good question can be formed.

### 3e. What's New

Read `Agent Discovery Log` → `## Surfaced`. Take rows dated today whose `note:` is filled.
For each (max 5, newest first): render `- [[Note Title]] · <source> · YYYY-MM-DD — <first line of the note's ## Summary> → <first [[concept]] from the note's ## Concepts>`.
For HN items, append `([discussion](<permalink from the note frontmatter>))`.
Omit the section if no discovery rows are dated today.

### 5. Write to Today's Daily Note

Assemble the template in this section order (highest return-pull first):
1. **Loose Ends** — accountability hook
2. **What's New** — proactive discovery feed
3. **Routines** — stakes hook (fading before active)
4. **On This Day** — memory hook
5. **Question for Today** — curiosity hook
6. **Explore** — discovery (from dominant cluster, then loose ends)
7. **This Week's Theme** — orientation

Write the section. If today's note already has a `## Suggestions` section, replace only that section — do not append a second one. If individual sub-sections already exist within it, replace each sub-section in place.

---

## Constraints

- Never write speculative content — only suggest resources actually found via search, name only routines observed in the notes, surface only threads that genuinely appear in past notes
- Do not suggest things already done today (check today's note content first)
- The Question for Today must not be answerable by reading the existing vault — if the answer is already there, generate a different question
- Keep suggestions concrete and skimmable — each item should be actionable in under a minute of reading
