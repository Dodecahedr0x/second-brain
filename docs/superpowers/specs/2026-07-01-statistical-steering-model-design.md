# Design: Statistical Steering Model (Autonomous Vault, Unstructured Steering)

*Date: 2026-07-01*
*Status: Approved — ready for implementation planning*

## Problem / Vision

Make the vault **almost autonomous** — fetching content, connecting and enhancing
existing notes, and tidying itself — with the user's only inputs being **ordinary,
unstructured writing** that (a) focuses short-term effort on specific topics and
(b) introduces new topics of interest. The user never fills in structured fields;
the vault infers what to work on from prose and lets the user *ratify or veto*
that read through low-friction, agent-authored affordances.

This is the first of three subsystems. It is the **control plane** the other two
obey, so it is designed first:

1. **Statistical steering model** (this spec) — infer focus + interests from
   unstructured writing; allocate autonomous effort; expose a correction loop.
2. **Deep graph maintenance** (later) — de-dup/merge/split/refactor.
3. **Self-directed exploration** (later) — follow the vault's own open questions.

## Decisions (locked in brainstorming)

| Decision | Choice |
|----------|--------|
| User input | **Unstructured only** — daily-note free-writing + arbitrary new notes. No structured fields, ever. |
| Signal reading | **Purely statistical** — recency + repetition + volume of writing. No intent-parsing of prose. |
| Focus vs interest | **Two timescales** — short-window spike = focus; long-window persistence = interest. |
| New-topic entry | **Novelty-boosted** — a never-seen concept enters immediately as *probationary* on one deliberate mention. |
| Promotion | **Recurrence** — writing about a probationary topic again promotes it to *established*. |
| Durability | **Indefinite** — established interests decay only to a low floor; never removed. |
| Effort allocation | **Portfolio** — weight-proportional per-cycle budget across all live interests; focus gets a multiplier; **no cap** (low-weight topics are touched rarely, never cut off). |
| Steering state | **Persistent, co-owned, user-editable** agent note (option B). |
| Correction | **Positive-confirmation checkboxes**, tiered by timescale; plus direct table edits. |

## Section 1 — The steering engine

Built on the existing `derive-topics` statistical substrate (recency-weighted
concept extraction). Concept signals are read at two timescales:

- **Short window (last few days) spike → focus.**
- **Long window persistence → interest.**
- Fading on both → dormant (not deleted; resurfaced by the monthly pass).

**Lifecycle of a topic:**

1. **New concept** → **novelty boost** → enters **probationary** immediately (one
   deliberate mention / a whole new note is enough).
2. **Recurrence** (written about again, N times across the window) → promoted to
   **established**.
3. **Established** → decays slowly to a low nonzero floor → **durable
   indefinitely**, never removed.
4. **Probationary without recurrence** → short half-life → decays out.

**Effort allocation — portfolio:** each cycle a fixed work budget is spread
**weight-proportionally** across all live interests; **focus applies a
multiplier** so the current focus advances fastest. No hard cap on portfolio
size; low-weight interests are simply worked proportionally rarely (never cut
off). The engine's *output* is this weighted portfolio; Section 4 turns it into
concrete work.

## Section 2 — The steering note (co-owned state)

A new agent-managed note, **`Agent Interest Model.md`** — a single table with a
command legend documented above it.

```markdown
# Agent Interest Model
<!-- Edit freely. Commands (put in the Flags column):
       pin  = freeze this row; the agent won't change its weight/status.
       mute = force weight 0 and never re-add, even if you keep writing about it.
     Adjust a Weight directly and the agent starts its update from your number.
     Add a row to inject an interest; the agent adopts it as established. -->

| Topic | Status | Weight | Focus | Last seen | Flags |
|-------|--------|--------|-------|-----------|-------|
| Distributed Systems | established | 0.80 | – | 2026-07-01 | pin |
| Visual RAG | established | 0.55 | ★ | 2026-06-27 | |
| GenUI | probationary | 0.20 | – | 2026-06-27 | |
```

Columns: `Topic` (canonical concept), `Status` (`probationary` | `established`),
`Weight` (0.0–1.0 portfolio weight, user-editable), `Focus` (`★` when spiking),
`Last seen` (date of last signal), `Flags` (user commands `pin` / `mute`).

**Parse-then-update each run:**
1. **Parse** the table as it currently stands — including the user's weight edits
   and `pin`/`mute` flags and any manually added rows.
2. **Update**: apply decay, fold in new statistical signal from recent writing
   (novelty boost / recurrence / focus spikes), and apply checkbox ticks
   (Section 3) — **starting from the user's edited values**, never overwriting
   `pin`ned rows, and holding `mute`d rows at 0.
3. **Write back** the table.

`derive-topics` is refactored to **read and write this note** rather than
recomputing an ephemeral topic list, making `Agent Interest Model.md` the single
source of truth for "what the vault is into." (Sixth agent-managed note; add to
`skills/agent-notes.md`, `context/agent-notes.md`, `AGENTS.md` Phase 0 count, and
`context/boundaries.md`.)

## Section 3 — The feedback loop

**Daily note, three zones:**
```
YYYY-MM-DD
[① unstructured user input — free writing]      ← the real input surface

## Check-in                                       ← ② agent-authored, positive-confirmation
Focus this week?   - [ ] Topic A   - [ ] Topic B
Keep tracking?     - [ ] Topic C (new)
                   - [ ] drop Topic E

---
## Agent — HH:MM   [③ existing agent zone: What's New, suggestions, …]
```

**Tiered check-ins by timescale** (each asks only about topics that live at that
cadence):
- **Daily note** → **focus + probationary** topics (fast-moving).
- **Weekly note** (Mon) → **faded** interests ("still into these?"). The day's
  daily note carries a `[[wikilink]]` to the weekly note.
- **Monthly note** (1st) → **dormant / niche** interests ("revisit? / drop?").
  Likewise wikilinked from that day's daily note.

**Positive-confirmation semantics** (a busy day never costs anything):
- **checked** = keep / promote / focus that topic.
- **unchecked** = neutral — the statistics carry on as if unasked.
- explicit **`drop`** checkbox = retire (agent `mute`s the topic).

**Tick → state mapping** (applied in Section 2's update step):
| Check-in item (checked) | Effect on `Agent Interest Model` |
|-------------------------|----------------------------------|
| Daily "Focus?" | set `Focus ★` + short-term weight multiplier |
| Daily "Keep tracking?" (probationary) | promote → `established` |
| Weekly "Still into?" (faded) | refresh `Last seen` + restore weight |
| Monthly "Revisit?" (dormant) | resurface boost |
| any "drop" | set `mute` (weight 0, retire) |

**Pre-generation:** a `loop.md` Phase 6 step ensures **tomorrow's** daily note
exists with an empty input zone and a Check-in prefilled from the current Interest
Model, so it is waiting when the user opens it. It runs **every cycle** (unlike
the daily rollup, which is first-run-of-a-new-day only) and is **idempotent and
non-clobbering**: create tomorrow's note if missing; if it exists but is still
untouched (empty input zone, no ticked boxes) refresh its Check-in to the latest
read; once the user has written or ticked anything in it, leave it alone. On
weekly/monthly creation days, that note gets its own timescale check-in and the
daily note wikilinks to it.

**Read-back:** the day's passes read the ticks from the current daily note and
apply them to `Agent Interest Model.md`. Each check-in is consumed **once** — the
agent records it as processed (a `processed` marker on the section, or the
processed date in the Operation Log) rather than un-ticking it, so the user's
marks stay visible and are not re-applied on later passes that day.

## Section 4 — The action layer (portfolio → work)

One rule: **weight decides *how much*, graph-state decides *what kind*.** Each
cycle:

1. **Read** the Interest Model → weighted portfolio.
2. **Split the action budget:**
   - **Topic work** (bulk) — allocated across topics by weight × focus
     multiplier.
   - **Baseline maintenance** (fixed slice) — whole-graph tidying not tied to a
     hot topic: orphan-linking, dangling-gap fills, stub cleanup. Keeps the vault
     healthy during quiet stretches.
3. **Per topic getting effort, a router picks the action by what the topic
   lacks:**
   - **Thin / new** (few notes, open gaps) → **FETCH** (discovery on that topic) +
     **ATOMIZE**.
   - **Disconnected** (notes exist, few links) → **CONNECT** (wikilinks, MOC
     placement).
   - **Stale / shallow** (old or reference-poor notes) → **ENHANCE** (enrich, add
     sources, deepen).
   - **Mature / well-woven** → light touch, or hand to **EXPLORE** (later).

**Reuse:** *fetching* = the existing discovery pipeline (`specs/discovery.md`),
now **weight-allocated by the Interest Model** instead of ad-hoc `derive-topics`.
*Connecting / enhancing* = the existing ENRICH / CONNECT / MOC actions, now
**portfolio-driven and prioritized by graph-state**.

**Extension sockets** (later subsystems plug in here, not built now):
- **Deep maintenance (#2)** → richer CONNECT/ENHANCE moves (de-dup, merge, split,
  MOC refactor).
- **Self-directed exploration (#3)** → the EXPLORE action following the vault's
  own open questions.

## Components / files

**New:**
- `Agent Interest Model.md` (vault, agent-managed, co-owned) — the steering table.
- A steering-update skill (parse-then-update the Interest Model each run).
- An action-router skill (portfolio + graph-state → per-topic action).

**Changed:**
- `skills/derive-topics.md` — refactor to read/write `Agent Interest Model.md`.
- `specs/discovery.md` — take topic weights from the Interest Model; allocate the
  discovery budget by weight × focus.
- `specs/daily-suggestions.md` / daily-note handling — add the three-zone layout +
  Check-in generation + read-back.
- `loop.md` Phase 6 — pre-generate tomorrow's daily note with the Check-in (beside
  the daily-rollup step); add the action-router + baseline-maintenance split to
  the ACT phase.
- `specs/weekly-review.md`, `specs/monthly-review.md` — add faded / dormant
  check-ins; daily-note wikilinks.
- `skills/agent-notes.md`, `context/agent-notes.md`, `AGENTS.md`,
  `context/boundaries.md` — register the sixth agent-managed note.

## Interfaces

- **`Agent Interest Model.md` is the single source of truth.** Produced/updated by:
  the statistical steering pass + checkbox read-back + direct user edits. Consumed
  by: the discovery budget allocator and the action router.
- **Check-in tick → state** mapping (table in Section 3) is the only path from
  user checkboxes into steering state.

## Open parameters (tune during implementation, not design)

Decay half-lives (probationary vs established), novelty-boost magnitude,
recurrence threshold for promotion, weight floor for "durable indefinitely",
per-cycle work budget size, baseline-maintenance slice fraction, and the number of
Check-in questions per note (target 3–4).

## Non-goals / out of scope

- Structured user input or intent-parsing of prose (beyond the checkbox/command
  affordances).
- The deep maintenance logic (#2) and self-directed exploration (#3) — only their
  sockets are defined here.
- Changing the discovery *sources* or the fetch chain (already built).
