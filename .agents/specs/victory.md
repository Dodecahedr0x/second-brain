# Spec: Victory Conditions

A session is complete ONLY when ALL applicable checks below pass. This prevents premature completion declarations (Harness Engineering Principle 8).

## Universal Checks (every session)

- [ ] `memory/operation-log.md` has been updated with this session's entry
- [ ] `memory/vault-index.md` reflects the current state of the vault
- [ ] No vault file is in a partial or broken state (no half-written notes, no truncated content)
- [ ] All wikilinks inserted this session point to files that exist (or are new stubs)
- [ ] No files listed in `context/boundaries.md` as forbidden were modified

## Ingestion Session Checks

- [ ] All raw/inbox items in the change set are either processed or explicitly tagged `#queued`
- [ ] Every named concept extracted has either an existing note or an entry in `memory/concept-gaps.md`
- [ ] The original source note is not degraded — only enriched

## Generation Session Checks

- [ ] Every new note follows the atomic note template from `specs/generation.md`
- [ ] Every new note has at least one wikilink to an existing note
- [ ] New notes removed from `memory/concept-gaps.md`

## Connection Session Checks

- [ ] No orphan notes remain among the session's target notes
- [ ] No duplicate wikilinks were introduced in any single note

## Failure Protocol

If a check fails:
1. Log the failure in `memory/operation-log.md` under `VICTORY_CHECK_FAILED`
2. Attempt to fix if the fix is unambiguous and safe
3. If fix is unclear → mark as DEFERRED, log reason, proceed to Phase 6 cleanup
4. NEVER mark a session complete with an outstanding unresolved failure

## Definition of "Done" for Long-Running Tasks

A large batch (e.g., 50+ notes to process) is "done" when:
- The current session's planned actions are verified
- State is written to memory
- A clear `next_run_hint` is logged

A task is not "done" just because the current session ended.
