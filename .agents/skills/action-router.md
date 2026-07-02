# Skill: Action Router

**Used in**: Loop Phase 3 (DECIDE) — turn the Interest Model portfolio into per-topic work.

Rule: **weight decides how much, graph-state decides what kind.**

## Step 1: Split the cycle budget

Given the run's total action budget (from `loop.md` Phase 3, ≤20 as today):
- **Baseline maintenance (mandatory — at least 1 action every run whenever any such work exists)**: reserve ~20% (min 1) for whole-graph tidying, independent of hot topics **and of new external content** — link an orphan note, fill an open `Agent Concept Gaps` row (`ATOMIZE` or `EXPLORE`), weave a `#stub` into the graph (`ENRICH`/`CONNECT` — a stub whose source can't be fetched is still linkable and can seed research), or add a missing MOC placement. Do **not** skip this slice because discovery/ingestion returned nothing — that is exactly when it matters.
- **Topic work**: the rest, allocated across live topics **proportional to `Weight` × focus multiplier** (`Focus ★` → ×1.5). Skip `mute`d (weight 0) topics. Low-weight topics may get 0 actions this cycle (touched a later cycle) — never cut off.

## Step 2: Per topic, pick the action by graph-state

For each topic receiving effort, inspect its notes in the vault:

| Topic state | Action |
|-------------|--------|
| Thin/new — 0–1 notes, or an open `Agent Concept Gaps` row | `FETCH` (discovery on the topic) then `ATOMIZE` |
| Disconnected — notes exist but < 2 outbound wikilinks, or absent from any MOC | `CONNECT` (add wikilinks / MOC placement) |
| Stale/shallow — youngest note > 30 days old, or `## References` has < 2 entries | `ENHANCE` (enrich, add sources, deepen) |
| Mature/well-woven — none of the above | `EXPLORE` — advance the active research session, or seed+start one from an open question (an `Agent Concept Gaps` row, a `#stub` note's topic, or an unresolved thread); if no open question remains, `ENHANCE` (deepen a note with a new sourced fact or connection). **Never a no-op.** |

**Depth & width always exist on a growing graph — prefer these over declaring a topic "mature/idle":**
- A note that gained a **newly-created related note this session** (e.g. a fresh atomic note or research note on an adjacent concept) → `CONNECT`: add the cross-links both ways. Every note the loop creates opens genuine link work for older notes.
- A concept named in **≥2 notes with no atomic note of its own** → `ATOMIZE` (width; no external fetch needed).
- A cluster of ≥3 related notes with **no MOC** → `CONNECT`: create/extend the MOC.
- The active research note → it grows every hop via `specs/research.md` (a content change each run while a session is live).

At least one of these is almost always available; use it to satisfy the loop's Content guard rather than ending a run with only agent-state churn.

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
- A `#stub` whose external source can't be fetched (blocked host, no transcript) is **not** dead weight: `ENRICH` it (link its title concepts to existing notes), `CONNECT` it (MOC placement), and let its topic seed an `EXPLORE` question. Only `DEFER` a stub that has no linkable concept at all — do not report it as "no actionable work."

## Note-Class Gate

Run `skills/classify-note.md` on the target before routing any action:

- `ENRICH` / `ATOMIZE` / `CONNECT` / `CLEAN` → `agent_generated` or `agent_augmented` notes only.
- Daily-note action → ensure recap link + seed extraction via `skills/recap.md`; never write sections into a daily note.
- `FETCH` / `SOURCE_CREATE` / `EXPLORE` → create/update agent notes; never target a `user`-class note.
- `user`-class target → redirect to recap link + seed extraction; all other actions blocked.
