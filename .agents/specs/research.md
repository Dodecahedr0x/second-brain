# Spec: Research (Multi-Hop)

**Trigger**: The `EXPLORE` action from `skills/action-router.md` (Phase 4 ACT). One call = one hop. Subsystem #3; fills the `EXPLORE` socket.

Question-anchored, incremental. Exactly ONE active session at a time (in `Agent Research Log`). Adds no new fetching primitives — orchestrates existing skills. Bounds: checklist ≤5, hop_budget 12, saturation 3, frontier cap 20, 1 primary fetch/hop.

## On call

Read `Agent Research Log`. If there is an **active session** → do "Advance one hop". Else → do "Start a session".

## Start a session

1. **Fill the queue** (if empty): harvest open questions — `## Question for Today` (daily notes), High-priority `Agent Concept Gaps` (as "What is X?"), `skills/unresolved-threads.md`, `#stub` notes. Weight each by its topic's `Weight` in `Agent Interest Model`, then priority/age → `## Queue` (highest first). If `EXPLORE` named a focus topic, prefer the top queue question tied to it.
2. Pop the top queued question → `## Active Session` (`Status: active`, `Hops: 0/12`, `Saturation: 0/3`).
3. `skills/decompose-question.md` → `### Checklist` (≤5, all `[ ]`) + `### Frontier` (the `INITIAL_LEADS`, `Status: open`).
4. Stop (that was the hop).

## Advance one hop

1. **Pick the best lead**: from open `### Frontier` leads, highest `Score` (primarily fills an OPEN checklist item; then source authority/recency; minus hop-distance). If no open lead → treat as saturation.
2. **Expand by `Type`**:
   - `question` → call the `search-*` skills for the sub-question; fetch the top candidate via `skills/parse-content.md` Part B / `skills/fetch-url.md`.
   - `source` → fetch it; harvest its citations/outbound links as new `source`-leads.
   - `entity` → search/fetch the entity; harvest co-occurring named concepts + the source's own references as new `entity`-leads (from the fetched content only — no new external KB).
3. **Source note**: create one for the fetched doc (`specs/source-note.md`); dedup — skip any lead whose normalized URL is in `### Explored` or already has a non-stub source note (same guard as `loop.md` Phase 4 FETCH). Add the lead to `### Explored`, set its Frontier `Status: done`.
4. **Extract**: (a) findings answering OPEN checklist items → `### Findings` (each `— [[Source Note]] (sub-q N)`); flip a checklist item to `[x]` when it gains a source-backed finding. (b) new leads → `### Frontier` (scored, `open`), deduped; keep only the top 20 by Score.
5. **Update counters**: `Hops` +1; `Saturation` +1 if no new answer-relevant finding this hop, else reset to 0.
6. **Check termination** (in order): all checklist `[x]` → `Status: answered`; `Hops ≥ 12` → `Status: budget`; `Saturation ≥ 3` → `Status: saturated`. If terminated → **Finalize**. Else stop.

## Finalize

1. `skills/synthesize-research-note.md` → write the research note (checklist-structured, cites the session's source notes, `#research`; `## Open` lists any `[ ]` items).
2. Spin-offs: key concepts → `skills/create-atomic.md`; wire the research note + atomics into the graph via `skills/link-notes.md` / `skills/update-moc.md`.
3. **Mark the origin answered**: resolve the `Agent Concept Gaps` row / annotate the daily-note question with `[[<research note>]]` / fill the stub.
4. **Tangential questions** uncovered during the session → append to `## Queue` as future seeds.
5. Move the session to `## Completed` (`| Date | Question | [[Research Note]] |`); clear `## Active Session` to `*(none)*`.

## Constraints

- One active session; never start a second.
- ≤1 primary fetch per hop; ≤12 hops/session; frontier ≤20 leads.
- No uncited findings; honest `## Open` on partial finalize.
- If a search/fetch errors, drop that lead and stop the hop — never abort the loop.
