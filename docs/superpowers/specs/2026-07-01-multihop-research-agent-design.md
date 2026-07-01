# Design: Multi-Hop Research Agent (Depth via Question-Anchored Exploration)

*Date: 2026-07-01*
*Status: Approved — ready for implementation planning*

## Problem / Vision

Today the vault fetches external knowledge in **single shots** — discovery searches a
topic, fetches a result, makes a source note. That keeps it shallow. This subsystem adds
**depth**: a multi-hop research agent that investigates a *question* across many hops —
decomposing it, following citations/links, and expanding entities — until the question is
answered, producing a synthesized research note wired into the graph.

This is **subsystem #3** from the steering-model design. It fills the `EXPLORE` action
socket the action-router already reserves (currently a no-op): when the steering model
gives `EXPLORE` effort to a mature, well-covered topic, that effort advances a research
session.

## Decisions (locked in brainstorming)

| Decision | Choice |
|----------|--------|
| Hop types | **All three**, unified over one mixed frontier of "leads": question-decomposition, source-following (citations/links), entity-expansion. |
| Session shape | **Question-anchored** — one driving question per session; tangential questions become future seeds, not chased mid-session. |
| Placement | **Incremental** — one hop per loop cycle via the `EXPLORE` action; stateful, resumable across hours. Focus topics advance faster (they earn more action slots). |
| Termination | **Sub-question checklist** (≤5 items) — answered when every item has a source-backed finding; + hop-budget ceiling + saturation guard. |
| State | A new agent-managed note, **`Agent Research Log`** (the 7th). |

## Section 1 — Session model + state

A **research session** is a bounded, question-anchored investigation. It runs one hop per
loop cycle and is fully stateful, so it survives across hours and is interruptible. `EXPLORE`
= "advance the active session by one hop" (or start one if none is active).

**State lives in `Agent Research Log`** (agent-managed, machine-written, human-readable):

- **Active session** (exactly one at a time):
  - `driving_question` + the topic/interest it serves
  - `checklist` — the ≤5 sub-questions, each with a coverage mark (`[ ]`/`[x]`) and the
    source note(s) that satisfied it
  - `frontier` — open leads, each `{type: question|source|entity, ref, score, status}`
  - `explored` — leads/URLs already done (dedup)
  - `findings` — accumulated answer-relevant notes, each stamped with its source note
  - `hops_used`, `hop_budget`, `saturation_counter`, `status`
- **Queue** — pending driving questions (seeds) not yet started, priority-ordered
- **Completed index** — finished sessions → their research notes (so questions aren't
  re-researched)

The research agent is a pure **orchestrator** over existing skills (search, fetch chain,
source/atomic/link/MOC). It adds no new fetching primitives.

## Section 2 — The hop cycle + termination

**One `EXPLORE` action = one hop.**

**No active session → start one (that is the hop):**
1. Pop the top driving question from the queue.
2. Decompose it into the ≤5-item `checklist` (via `skills/decompose-question.md`).
3. Seed the frontier: each sub-question becomes a `question`-lead; add any obvious seed
   `source`/`entity` leads.
4. Stop.

**Active session → advance one hop:**
1. **Pick the best lead.** Score = *primarily* "can this lead fill an **open** checklist
   item?", then source authority/recency, minus a hop-distance penalty. Leads mapping to no
   open item sink to the bottom (pruned). This single score is how the three lead types
   compete on one axis — the agent picks whichever *kind* of hop best advances coverage.
2. **Expand by type:**
   - `question` → run the discovery search skills (`search-arxiv/web/hackernews/youtube/rss`)
     + fetch the top hit via the fetch chain.
   - `source` → fetch it; harvest its citations / outbound links as new `source`-leads.
   - `entity` → search/fetch the entity; harvest related entities as new `entity`-leads
     **from the fetched content itself** (co-occurring named concepts and the source's own
     references) — not from a new external knowledge base (see non-goals).
3. **Extract:** (a) findings tied to specific open checklist items, each stamped with the
   source note backing it; (b) new leads (raised sub-questions, citations, entities), scored
   and added to the frontier, **deduped** against `explored` and against existing non-stub
   source notes (reusing `loop.md` Phase 4's FETCH guard).
4. **Create a source note** for the fetched doc (existing `specs/source-note.md` pipeline);
   link it from the session. Mark a checklist item `[x]` once it has ≥1 source-backed
   finding. Increment `hops_used`; bump `saturation_counter` if the hop added no
   answer-relevant finding, reset it if it did.

**Termination (checked after each hop):**
- **Answered** — all checklist items `[x]` → finalize (Section 3).
- **Budget** — `hops_used ≥ hop_budget` (default 12) → finalize, flagging uncovered items.
- **Saturation** — `saturation_counter ≥ 3` → finalize (stalled).
- else — log the hop, stop until the next `EXPLORE`.

**Bounds:** ≤12 hops/session · 1 primary fetch per hop (≈ one action's weight) · frontier
capped to the top ~20 leads by score (tail dropped) · one active session at a time.

## Section 3 — Seeding, prioritization, output

**Seed queue (where driving questions come from).** Research drains the questions the vault
already generates — it does not invent them:
- `## Question for Today` (from `specs/daily-suggestions.md`)
- `Agent Concept Gaps` (esp. High priority → "what is X?")
- unresolved threads (`skills/unresolved-threads.md`) and `#stub` / `#needs-review` notes

**Prioritization.** Each candidate question is weighted by the `Weight` of its topic in
`Agent Interest Model` (research serves live interests), then by priority/age. When `EXPLORE`
fires on a mature focus topic with no active session, it starts the **top open question tied
to that topic**; otherwise the top of the queue.

**On finalize, the session produces:**
- **A research note** (primary artifact) — answers the driving question, **structured by the
  checklist** (each sub-question → its source-backed findings, citing the source notes).
  Tagged `#research`.
- **Source notes** — already minted per hop, linked from the research note.
- **Atomic notes** — key concepts discovered → `skills/create-atomic.md`, wired into the
  graph / relevant MOC via `skills/link-notes.md` / `skills/update-moc.md`.
- **Mark the origin answered** — resolve the concept gap / annotate the daily-note question
  with `[[Research Note]]` / fill the stub.
- **Tangential questions** uncovered → appended to the queue as future seeds.
- **Completed index** entry in `Agent Research Log`; the new research note surfaces in the
  daily note's *What's New*.
- **Honest partials** — if finalized by budget/saturation with open checklist items, the note
  flags what's unanswered and the question may be re-queued at lower priority.

## Components / files

**New:**
- `specs/research.md` — the session orchestrator + hop cycle (start / advance / finalize).
- `Agent Research Log` (vault, agent-managed) — active session + queue + completed index.
- `skills/decompose-question.md` — driving question → ≤5-item checklist + initial leads.
- `skills/synthesize-research-note.md` — checklist + findings → the research note.

**Changed:**
- `skills/action-router.md` — the `EXPLORE` action (currently no-op) now delegates to
  `specs/research.md` (start/advance the active session by one hop).
- `loop.md` — `EXPLORE` items from the action plan execute the research hop in Phase 4 ACT.
- `skills/agent-notes.md`, `context/agent-notes.md`, `AGENTS.md` (Phase 0 count),
  `context/boundaries.md` — register the 7th agent-managed note.
- `specs/daily-suggestions.md` — surface newly-finalized research notes in *What's New*.

## Interfaces

- **`Agent Research Log` is the single source of truth** for research state. Written by
  `specs/research.md`; the queue is fed from the seed sources (Section 3) and drained one
  session at a time.
- **`EXPLORE` action → one hop**: `action-router.md` emits `EXPLORE` for a mature topic;
  `loop.md` Phase 4 runs `specs/research.md` for exactly one hop against the active session
  (or starts one). This is the only entry point.
- **Reuse contracts:** discovery `search-*` skills (`{topic, search_phrases, source_concepts,
  since_date}` → `CANDIDATES`), the fetch chain (`fetch-url.md` and extractors),
  `source-note.md`, `create-atomic.md`, `link-notes.md`, `update-moc.md`,
  `Agent Interest Model` weights.

## Open parameters (tune during implementation)

`hop_budget` (default 12), checklist size cap (5), saturation threshold (3 no-progress hops),
frontier size cap (~20 leads), lead-scoring weights (open-item fit vs authority vs
hop-distance), and how many `EXPLORE` slots a focus topic may consume per cycle.

## Non-goals / out of scope

- Inventing questions the vault didn't surface (research only drains existing questions).
- Multiple concurrent active sessions (strictly one at a time; the rest queue).
- New fetching primitives (reuses the existing search skills + fetch chain).
- Changing the steering model, discovery sources, or the fetch chain.
- Deep maintenance (subsystem #2) — separate.
