# Spec: Daily Suggestions

**Trigger**: End of each daily pipeline run, after §Knowledge Digest is written.

**Goal**: Write a curated, actionable section to today's daily note so the user opens Obsidian and immediately knows what to explore and do — without needing to read anything else.

---

## Output Location

Append to `$VAULT_PATH/YYYY-MM-DD.md` (today's date, not the note being processed).
Create the file if it does not exist yet.

The section is always the **last thing** in the note, after any digest already written.

---

## Output Template

```markdown
---

## Suggestions — YYYY-MM-DD

### Explore
<!-- 2–4 items: resources or concepts worth visiting today -->
- [Resource Title](url) — one line on why it connects to your recent notes
- [[Concept]] — in your notes but not yet explored; worth creating a note

### Routines
<!-- Detected recurring activities with streak and a concrete next step -->
- **Activity name** · N-day streak · Next: specific action

### This Week's Theme
<!-- One sentence naming the dominant concept cluster this week, with a suggestion -->
One sentence + optional [[MOC suggestion]]
```

Omit any section with no entries. Keep the total under 15 lines — if more items exist, pick the highest-value ones.

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
- Get a list of activities with streak counts and last-seen date
- Flag: **active** (seen in last 3 days), **fading** (4–7 days ago), **dormant** (>7 days)
- For each active routine, generate one concrete next-step sentence
- For each fading routine, flag it as "pick back up?"

### 4. Identify This Week's Theme

From the concept clusters found in Step 1:
- Name the dominant theme (the cluster with the most recently-touched notes)
- If 3+ notes share a topic and no MOC exists for it, suggest creating one

### 5. Write to Today's Daily Note

Assemble the template. Rank items:
1. Routines (user-defined patterns take priority)
2. Explore items from the dominant cluster
3. Loose ends (#stub notes, concept gaps with High priority)

Write the section. If today's note already has a `## Suggestions` section, replace it — do not append a second one.

---

## Constraints

- Never write speculative content — only suggest resources that were actually found via search, and only name routines actually observed in the notes
- Do not suggest the user do things they already did today (check today's note content first)
- Keep suggestions concrete and skimmable — the user should be able to action each item in under a minute of reading
