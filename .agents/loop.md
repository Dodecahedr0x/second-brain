# The Second-Brain Processing Loop

Core closed-loop process. Execute all six phases in order — skipping or reordering is forbidden.

---

## Phase 1: OBSERVE

**Goal**: Establish what has changed since the last run.

1. Read `Agent Operation Log` → extract `last_run_timestamp`
2. Always add today's daily note (`YYYY-MM-DD.md`) to the change set, even if unmodified — it needs an agent zone refresh every run
3. Find all vault `.md` files modified after `last_run_timestamp` (skip `agent_managed: true` notes and `.obsidian/`, `.stfolder/`)
4. Identify files tagged `#inbox` or `#raw`, or located in `Inbox/`
5. Merge and deduplicate → **change set**
6. Classify today's daily note as **active** (user zone changed since `last_run_timestamp`) or **idle** (no user zone changes) — this mode drives Phase 3

Exit: Change set built. Never empty (today's note is always present).

---

## Phase 2: ORIENT

**Goal**: Understand each item's place in the knowledge graph.

1. For each item: parse with `skills/parse-content.md` — extract title, tags, concepts, entities
2. Cross-reference `Agent Vault Index` for existing notes sharing those concepts
3. Build **connection map**: `{note: [candidate_links]}`
4. Flag concepts with no existing note → candidates for `Agent Concept Gaps`

Exit: Connection map built. Every change set item has an entry.

---

## Phase 3: DECIDE

**Goal**: Produce a precise, bounded action plan before touching any file.

1. For each item, assign exactly one action:
   - **ENRICH**: Add wikilinks/tags → `skills/link-notes.md`
   - **ATOMIZE**: Extract concepts into new notes → `skills/create-atomic.md`
   - **CONNECT**: Update a MOC → `skills/update-moc.md`
   - **FETCH**: Extract external content into a source note → `skills/parse-content.md` Part B / `specs/source-note.md`
   - **SOURCE_CREATE**: Create a source note from fetched content → `specs/source-note.md`
   - **DEFER**: Tag `#needs-review`, skip this session
2. Validate against `context/boundaries.md`
3. If > 20 actions planned: process oldest first, defer the rest
4. Write the plan as a numbered list in the log — this is the session **contract**

Exit: Numbered plan exists. No action is ambiguous.

---

## Phase 4: ACT

**Goal**: Execute the plan exactly as written.

1. Execute actions in order, one at a time
2. Before each action apply idempotency guards:
   - **ENRICH**: skip any wikilink or tag that already exists verbatim in the target note
   - **ATOMIZE / SOURCE_CREATE**: if the target note already exists, switch to ENRICH instead of creating a duplicate
   - **FETCH**: if a source note for this URL already exists and is not a `#stub`, skip the fetch
3. After each action, log immediately in `Agent Operation Log`:
   ```
   [TIMESTAMP] ACTION_TYPE: <file> — <rationale>
   ```
4. After each action, verify modified file is valid markdown and all wikilinks are valid
5. If an action would violate `context/boundaries.md` → SKIP, log reason, continue

Exit: All planned actions executed or explicitly SKIPPED.

---

## Phase 5: VERIFY

**Goal**: Confirm work meets victory conditions before declaring success.

Checks (from `specs/victory.md`):
1. All change set items have at least one wikilink
2. No dangling wikilinks introduced
3. All new atomic notes have title, summary, tags, and at least one backlink
4. MOCs updated for any new notes in tracked topics
5. No forbidden files modified

Fail → fix in Phase 4, or log as DEFERRED with reason.

Exit: All checks pass, or failures explicitly logged as DEFERRED.

---

## Phase 6: CLEANUP

**Goal**: Restore clean state for the next session.

1. Update `Agent Vault Index` — add new notes, mark changed notes with `[UPDATED date]`
2. Prepend session summary near the top of `Agent Operation Log` (newest first):
   ```
   ## Session YYYY-MM-DD
   Type / Items processed / Actions / Deferred
   next_run_hint: ...
   last_run_timestamp: ISO 8601
   ```
3. Append new concept gaps to `Agent Concept Gaps`
4. Verify `Agent Vault Index` is consistent with actual vault contents

Exit: All agent-managed notes updated. Session fully logged.

---

## Loop Invariants

At the END of every session:
- `Agent Operation Log` contains this session's entry
- `Agent Vault Index` reflects current vault state
- No vault file left in a partial/broken state
- All change set items are processed or explicitly deferred

## Abort Protocol

If an ambiguous or potentially destructive action is encountered:
1. STOP immediately
2. Log in `Agent Operation Log` under `ABORT_REASON`
3. Restore any partial changes
4. Exit without Phase 6 cleanup (except the abort log entry)
5. Surface the issue to the user before the next run
