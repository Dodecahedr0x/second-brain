# Second-Brain Agent Harness

## Purpose

This harness governs agents that process content poured into the Obsidian vault (path set in `.env.local`) and digest it into structured, connected knowledge: new atomic notes, updated Maps of Content, and wikilink relationships.

## Phase 0: Initialization Checklist

Before executing any loop iteration, an agent MUST:

0. Read `.env.local` in the repo root — load `VAULT_PATH` (abort if missing; tell user to run `scripts/setup.sh`) and the optional YouTube knobs: `YT_COOKIES` (yt-dlp cookie args; may be empty/absent) and `YT_PROXY` (single proxy URL for yt-dlp `--proxy` and youtube-transcript-api `--http-proxy/--https-proxy`; may be empty/absent). These are used by `skills/extract-youtube.md` and `skills/search-youtube.md`.
1. Read `context/vault-structure.md` — understand current folder layout and conventions
2. Read `context/agent-notes.md` and `skills/agent-notes.md` — load the agent-managed note convention and templates
3. Verify all seven agent-managed notes exist in the vault; create any missing ones using `skills/agent-notes.md` templates (Phase 0 exception)
4. Read `Agent Vault Index` — load last known vault state
5. Read `Agent Operation Log` — know what was done last time
6. Read `context/boundaries.md` — internalize what is off-limits
7. Read `loop.md` — load the six-phase execution model
8. Load relevant skills from `skills/` for the current task type

## Core Principles (Harness Engineering)

- **Capability ≠ Reliability**: Structure compensates for model variability. Follow the loop exactly.
- **Repository as System of Record**: This `.agents/` folder is the single source of truth for agent behavior. Never infer rules from conversation history.
- **Modular Instructions**: Each file handles one concern. Never collapse multiple specs into one.
- **Brevity**: Every file in `.agents/` must be as short as possible. No prose where a list works. No list where a single line works. Agent-managed vault notes are machine-written state — keep them terse. When updating any agent file, remove redundancy rather than accumulate it.
- **Session Continuity**: Always read agent-managed vault notes before acting; always write them before stopping.
- **Initialization Phase**: Complete the checklist above before touching any vault file.
- **Scope Control**: Agents may only modify vault files explicitly targeted by the current loop phase. Do not touch `.obsidian/` configuration.
- **Victory Verification**: A task is NOT complete until victory conditions in `specs/victory.md` are met and checked.
- **State Cleanup**: Every session must update `Agent Vault Index` and `Agent Operation Log` before exiting.
- **Internal Observability**: Log every action in `Agent Operation Log` with timestamp and rationale.
- **Long-Running Task Management**: If the vault has many changes to process, split across sessions. Log progress. Never claim completion prematurely.

## Entry Point

All agents start with Phase 0 initialization, then execute `loop.md`. No direct vault editing occurs outside Phase 0 or the loop phases.

## Scope Boundaries (Summary)

Full detail in `context/boundaries.md`. Quick reference:
- **Allowed**: Creating `.md` files in the vault, editing current change-set notes, updating agent-managed notes, adding wikilinks, creating/updating MOC files named in the Phase 3 contract
- **Forbidden during vault-processing runs**: Deleting vault files, modifying `.obsidian/` config, modifying repo files, touching `.stfolder/`

## Agent Types

| Task | Entry Spec |
|------|-----------|
| Process new raw content | `specs/ingestion.md` |
| Connect existing notes | `specs/connection.md` |
| Generate atomic notes | `specs/generation.md` |
| Handle daily notes (link annotation only) | `specs/daily-note.md` |
| Handle daily notes (full pipeline: fetch + enrich + digest) | `specs/daily-pipeline.md` |
| Create a note from external content | `specs/source-note.md` |
| Surface new knowledge as digest | `specs/knowledge-digest.md` |
| Write daily suggestions (explore + routines) | `specs/daily-suggestions.md` |
| Summarise the past week's most important themes | `specs/weekly-review.md` |
| Surface niche topics from the past month, find resources, update MOCs | `specs/monthly-review.md` |
| Retry all #needs-review items; log persistent failures | `specs/retry-failed.md` |
