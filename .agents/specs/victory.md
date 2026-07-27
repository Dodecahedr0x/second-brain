# Spec: Victory Conditions

A session is complete ONLY when ALL applicable checks below pass. This prevents premature completion declarations (Harness Engineering Principle 8).

## Universal Checks (every session)

- [ ] `Agent Operation Log` has been updated with this session's entry
- [ ] `Agent Vault Index` reflects the current state of the vault
- [ ] No vault file is in a partial or broken state (no half-written notes, no truncated content)
- [ ] All wikilinks inserted this session point to files that exist (or are new stubs)
- [ ] No files listed in `context/boundaries.md` as forbidden were modified

## Content Progress (every session)

- [ ] At least one **content** note — a root knowledge note (source / atomic / MOC / research) — was created or modified this session, via genuine **depth** (a note enriched with a newly-relevant cross-link or sourced fact) or **width** (a concept atomized, a MOC created/extended, or the active research note grown per `specs/research.md` "Advance one hop" step 6). Updating **only** agent-state notes (`Agent/…`: Operation Log, Vault Index, Research Log state, Discovery Log) does **not** satisfy this. A content-free session is valid ONLY after confirming no note can be deepened, no recurring concept atomized, no cluster connected, and no research question is open — nearly never true on an established vault. If unmet, return to Phase 3/4 and do genuine deepening before completing.

## Recap Completeness (every session that changed anything)

- [ ] If any note was created/updated or a research hop ran this session, today's `YYYY-MM-DD Recap` is a **full** recap — it includes a non-empty **Synthesis** section (1–3 paragraph reasoning over the day's notes) and a non-empty **Explore** section (origin-tagged questions from new notes / Check-in / interests **and** a report of the running exploration). A stripped recap (only Check-in / What's New / New Notes) does NOT pass — rebuild it via `skills/recap.md` Build/Refresh.

## Ingestion Session Checks

- [ ] All raw/inbox items in the change set are either processed or explicitly tagged `#queued`
- [ ] Every named concept extracted has either an existing note or an entry in `Agent Concept Gaps`
- [ ] The original source note is not degraded — only enriched

## Generation Session Checks

- [ ] Every new note follows the atomic note template from `specs/generation.md`
- [ ] Every new note has at least one wikilink to an existing note
- [ ] New notes removed from `Agent Concept Gaps`

## Connection Session Checks

- [ ] No orphan notes remain among the session's target notes
- [ ] No duplicate wikilinks were introduced in any single note

## Failure Protocol

If a check fails:
1. Log the failure in `Agent Operation Log` under `VICTORY_CHECK_FAILED`
2. Attempt to fix if the fix is unambiguous and safe
3. If fix is unclear → mark as DEFERRED, log reason, proceed to Phase 6 cleanup
4. NEVER mark a session complete with an outstanding unresolved failure

## Definition of "Done" for Long-Running Tasks

A large batch (e.g., 50+ notes to process) is "done" when:
- The current session's planned actions are verified
- State is written to memory
- A clear `next_run_hint` is logged

A task is not "done" just because the current session ended.
