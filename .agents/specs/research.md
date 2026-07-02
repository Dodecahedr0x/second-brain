# Spec: Research (Multi-Hop)

**Trigger**: The `EXPLORE` action from `skills/action-router.md` (Phase 4 ACT). One call = one hop. Subsystem #3; fills the `EXPLORE` socket.

Question-anchored, incremental. Exactly ONE active session at a time in `Agent Research Log`. Adds no new fetching primitives — orchestrates existing skills. Bounds: checklist ≤5, hop_budget 12, saturation 3, frontier cap 20, 1 primary fetch/hop.

## On call

Read `Agent Research Log`.
- Active session exists → **Advance one hop**.
- No active session → **Start a session**.

## Start a session

1. Fill `## Queue` if empty: harvest open questions from daily-note `## Question for Today`, high-priority `Agent Concept Gaps` (as "What is X?"), `skills/unresolved-threads.md`, and `#stub` notes.
2. Weight candidates by topic `Weight` in `Agent Interest Model`, then priority/age. If `EXPLORE` names a focus topic, prefer that topic's top question.
3. Pop the top question into `## Active Session`: `Status: active`, `Hops: 0/12`, `Saturation: 0/3`.
4. Run `skills/decompose-question.md` → `short_form`, `### Checklist` (≤5, all `[ ]`), and `### Frontier` (`INITIAL_LEADS`, `Status: open`); score each initial lead as in Advance step 1 (open-checklist fit → authority → hop-distance).
5. Create the research note **stub** titled by `short_form`: `$VAULT_PATH/<short_form>.md` — frontmatter `source_type: research` / `agent_processed: false` / `agent_generated: true` / `agent_last_touched: YYYY-MM-DDThh:mm:ssZ`, tags `#research #stub`, the full driving question as a `> [!question]` callout, and a `<!-- research in progress -->` marker. Apply the Duplicate / Missing-Note Guard from `specs/reconcile.md` (checks flat root and legacy `Research/<short_form>.md`) before creating. If an existing note is found, run `skills/classify-note.md` augment-check before editing; if `agent_augmented`, additive edits only. Stamp `agent_last_touched` after editing. Record it in `## Active Session` as `**Note**: [[<short_form>]]` (the durable, linkable home for the session).
6. Stop. Starting the session counts as this hop.

## Advance one hop

1. Pick the best open `### Frontier` lead by `Score`: fills an OPEN checklist item first, then authority/recency, minus hop-distance. No open lead → skip expansion (steps 2–4) and findings; bump `Saturation` and go straight to the termination check (step 6/7).
2. Expand by `Type`:
   - `question` → call the `search-*` skills for the sub-question; fetch the top candidate via `skills/parse-content.md` Part B / `skills/fetch-url.md`.
   - `source` → fetch it; harvest citations/outbound links as new `source` leads.
   - `entity` → search/fetch the entity; harvest co-occurring named concepts and fetched-source references as new `entity` leads.
3. Create a source note via `specs/source-note.md`. Dedup by normalized URL: skip if already in `### Explored` or an existing non-stub source note.
4. Mark the lead explored: append to `### Explored`; set its Frontier `Status: done`.
5. Extract findings answering OPEN checklist items into `### Findings` as `— [[Source Note]] (sub-q N)`. Flip an item to `[x]` only when source-backed.
6. Add new leads to `### Frontier`, deduped, scored, `open`; keep top 20.
7. Update counters: `Hops` +1; `Saturation` +1 if no answer-relevant finding, else 0.
8. Terminate in order: all checklist `[x]` → `Status: answered`; `Hops ≥ 12` → `Status: budget`; `Saturation ≥ 3` → `Status: saturated`. If terminated → **Finalize**. Else stop.

## Finalize

1. Run `skills/synthesize-research-note.md` to **fill the stub note `[[<short_form>]]`** created at start (do not create a new note): checklist-structured, source-cited; remove the `#stub` tag and the in-progress marker; `## Open` lists any unchecked item.
2. Create key concept notes with `skills/create-atomic.md`; wire `[[<short_form>]]` + atomics with `skills/link-notes.md` and `skills/update-moc.md`.
3. Mark the origin answered: resolve the `Agent Concept Gaps` row, annotate the daily-note question with `[[<short_form>]]`, or fill the stub.
4. Append tangential questions to `## Queue` as future seeds.
5. Move the session to `## Completed`: `| Date | Question | [[<short_form>]] |`.
6. Clear `## Active Session` to `*(none)*`.

## Constraints

- One active session; never start a second.
- `Type` ∈ {`question`, `source`, `entity`}.
- ≤1 primary fetch per hop; ≤12 hops/session; frontier ≤20 leads.
- No uncited findings; partial finalizations keep an honest `## Open`.
- If a search/fetch errors, drop that lead and stop the hop — never abort the loop.
