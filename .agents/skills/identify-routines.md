# Skill: Identify Routines

**Used in**: `specs/daily-suggestions.md` Step 3

Scans recent daily notes to detect recurring activities and compute streaks.

## Input

The last 14 daily notes (`YYYY-MM-DD.md` files, sorted newest first).

## Step 1: Extract Activities

For each note, read every bullet point and classify:
- **Skip**: tasks (`- [ ]`), wikilink-only bullets, agent-written sections (## Suggestions, ## Knowledge Digest)
- **Keep**: descriptive bullets — things the user did, read, worked on, or thought about

Normalise each kept bullet to an **activity label**:
- Strip dates, amounts, specifics → find the recurring core
- Example: "ran 5km", "ran 3km", "went for a run" → `running`
- Example: "read chapter 3 of X", "reading X" → `reading X`
- Group similar labels under one canonical name

## Step 2: Compute Streaks

For each activity label, build a sorted list of dates it appeared.

| Metric | Definition |
|--------|-----------|
| Streak | Consecutive calendar days ending today (or yesterday) |
| Last seen | Most recent date in the list |
| Frequency | Total appearances in the 14-day window |

Classification:
- **Active**: last seen ≤ 3 days ago
- **Fading**: last seen 4–7 days ago
- **Dormant**: last seen > 7 days ago

## Step 3: Generate Next Step

For each active routine, write one short imperative sentence as a suggested next action:
- Use the activity label + a logical progression
- Example: `running` → "Go for a run today — keep the streak going"
- Example: `reading Atomic Habits` → "Read the next chapter of Atomic Habits"
- If progression is unclear, just: "Continue: <activity label>"

For fading routines, the next step is: "Pick back up: <activity label> (last: <date>)"

## Output

```
ROUTINES:
- label: <name>
  status: active | fading | dormant
  streak: N days
  last_seen: YYYY-MM-DD
  frequency: N/14
  next_step: <one sentence>
```

Return at most 6 routines, sorted: active first, then fading, then dormant.

## Guardrails

- Only report things that appeared in ≥ 2 of the 14 notes — single occurrences are not routines
- Do not infer intent — report only what is written
- Agent-managed notes (`agent_managed: true`) are not daily notes — skip them
