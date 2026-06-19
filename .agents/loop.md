# The Second-Brain Processing Loop

This is the core closed-loop process. Every agent run executes these six phases in order. Skipping a phase or reordering is forbidden — each phase guards the next.

---

## Phase 1: OBSERVE

**Goal**: Establish what has changed in the vault since the last run.

Steps:
1. Read `memory/operation-log.md` → extract `last_run_timestamp`
2. Find all vault `.md` files modified after `last_run_timestamp`
3. Identify files with an `#inbox` tag or located in an `Inbox/` folder — these are unprocessed inputs
4. List: new files, modified files, flagged-inbox files
5. Write this list as the **change set** — it bounds the entire session

Exit condition: Change set is built. If empty → skip to Phase 6 (nothing to do).

---

## Phase 2: ORIENT

**Goal**: Understand the content and its place in the existing knowledge graph.

Steps:
1. For each item in the change set:
   a. Parse the note: extract title, tags, headings, key concepts, named entities
   b. Search vault index (`memory/vault-index.md`) for notes that share concepts or entities
   c. Note which existing notes could link TO this item, or FROM this item
2. Build a **connection map**: `{new_note: [candidate_links]}`
3. Identify concept gaps — concepts in the new content that have no existing note

Exit condition: Connection map built. Every item in the change set has at least an empty entry.

---

## Phase 3: DECIDE

**Goal**: Produce a precise, bounded action plan before touching any file.

Steps:
1. For each item in the change set, decide exactly ONE of:
   - **ENRICH**: Add wikilinks and tags to an existing note → use `skills/link-notes.md`
   - **ATOMIZE**: Extract key concepts into new atomic notes → use `skills/create-atomic.md`
   - **CONNECT**: Update an MOC or index to include the new note → use `skills/update-moc.md`
   - **DEFER**: Content is too incomplete — tag with `#needs-review`, skip this session
2. Validate the plan against `context/boundaries.md`
3. Count total planned actions. If > 20 in one session, split: process oldest items first, defer the rest
4. Write the plan as a numbered list in the log — this is the session's **contract**

Exit condition: Numbered action plan exists. No action is ambiguous.

---

## Phase 4: ACT

**Goal**: Execute the action plan exactly as written.

Steps:
1. Execute actions in plan order, one at a time
2. After each action, log it immediately in `memory/operation-log.md`:
   ```
   [TIMESTAMP] ACTION_TYPE: <file> — <one-line rationale>
   ```
3. After each action, verify the modified file is valid markdown and all wikilinks point to real files (or are creating a new one intentionally)
4. If an action would violate `context/boundaries.md`, STOP that action, log it as SKIPPED with reason, continue to next

Exit condition: All planned actions executed or explicitly SKIPPED. No partial edits left open.

---

## Phase 5: VERIFY

**Goal**: Confirm the work meets victory conditions before declaring success.

Steps (from `specs/victory.md`):
1. All items in the change set now have at least one wikilink to another note
2. No dangling wikilinks were introduced (all `[[targets]]` exist as files)
3. All new atomic notes have: title, one-sentence summary, tags, at least one backlink
4. MOCs updated for any new notes in tracked topics
5. No files in `context/boundaries.md` forbidden list were modified

If any check fails → return to Phase 4 to fix, or log as DEFERRED with specific reason.

Exit condition: All five checks pass, or failures are explicitly logged as DEFERRED.

---

## Phase 6: CLEANUP

**Goal**: Restore clean state so the next session can start fresh.

Steps:
1. Update `memory/vault-index.md` — add all new notes created, update changed notes
2. Append session summary to `memory/operation-log.md`:
   ```
   === SESSION [DATE] ===
   Items processed: N
   Actions taken: N
   Deferred: N (list reasons)
   next_run_hint: [what needs attention next time]
   last_run_timestamp: [ISO 8601]
   ```
3. If any concepts were identified as gaps (Phase 2), append them to `memory/concept-gaps.md`
4. Verify `memory/vault-index.md` is consistent with actual vault contents

Exit condition: All memory files updated. Session is fully logged. Agent may stop.

---

## Loop Invariants

These must hold at the END of every session:
- `memory/operation-log.md` contains this session's entry
- `memory/vault-index.md` reflects current vault state
- No vault file is left in a partial/broken state
- The change set items are either processed or explicitly deferred

## Abort Protocol

If at any point the agent encounters an ambiguous or potentially destructive action:
1. STOP immediately
2. Log the ambiguity in `memory/operation-log.md` under `ABORT_REASON`
3. Restore any partial changes from this session
4. Exit without completing Phase 6 cleanup (except for the abort log entry)
5. Surface the issue to the user before the next run
