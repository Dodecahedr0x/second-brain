# Skill: Action Router

**Used in**: Loop Phase 3 (DECIDE) — turn the Interest Model portfolio into per-topic work.

Rule: **weight decides how much, graph-state decides what kind.**

## Step 1: Split the cycle budget

Given the run's total action budget (from `loop.md` Phase 3, ≤20 as today):
- **Baseline maintenance**: reserve ~20% (min 1 action) for whole-graph tidying not tied to a hot topic — orphan-linking, dangling-gap fills, stub cleanup.
- **Topic work**: the rest, allocated across live topics **proportional to `Weight` × focus multiplier** (`Focus ★` → ×1.5). Skip `mute`d (weight 0) topics. Low-weight topics may get 0 actions this cycle (touched a later cycle) — never cut off.

## Step 2: Per topic, pick the action by graph-state

For each topic receiving effort, inspect its notes in the vault:

| Topic state | Action |
|-------------|--------|
| Thin/new — 0–1 notes, or an open `Agent Concept Gaps` row | `FETCH` (discovery on the topic) then `ATOMIZE` |
| Disconnected — notes exist but < 2 outbound wikilinks, or absent from any MOC | `CONNECT` (add wikilinks / MOC placement) |
| Stale/shallow — youngest note > 30 days old, or `## References` has < 2 entries | `ENHANCE` (enrich, add sources, deepen) |
| Mature/well-woven — none of the above | light touch, or `EXPLORE` (open questions) |

## Output

```
ACTION_PLAN:
- topic: <T>  action: FETCH|ATOMIZE|CONNECT|ENHANCE|EXPLORE
maintenance: <N reserved actions>
```

## Guardrails

- Respect the Phase 3 cap (≤20 actions / oldest-first). Never exceed the split budget.
- `FETCH` → `specs/discovery.md`; `ATOMIZE` → `skills/create-atomic.md`; `CONNECT` → `skills/update-moc.md`; `ENHANCE` → `skills/link-notes.md` (executes as the loop's `ENRICH`); `EXPLORE` → run `specs/research.md` (advance the active research session by one hop, or start one for a top open question tied to this topic).
- The loop executor vocabulary is ENRICH/ATOMIZE/CLEAN/CONNECT/FETCH/SOURCE_CREATE/DEFER/EXPLORE — map `ENHANCE`→`ENRICH`; `CLEAN` → `skills/create-atomic.md` + `skills/link-notes.md`.

## Note-Class Gate

Run `skills/classify-note.md` on the target before routing any action:

- `ENRICH` / `ATOMIZE` / `CONNECT` / `CLEAN` → `agent_generated` or `agent_augmented` notes only.
- Daily-note action → ensure recap link + seed extraction via `skills/recap.md`; never write sections into a daily note.
- `FETCH` / `SOURCE_CREATE` / `EXPLORE` → create/update agent notes; never target a `user`-class note.
- `user`-class target → redirect to recap link + seed extraction; all other actions blocked.
