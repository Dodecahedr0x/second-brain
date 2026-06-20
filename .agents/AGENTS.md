# Second-Brain Agent Harness

## Purpose

This harness governs agents that process content poured into the Obsidian vault (path set in `.env.local`) and digest it into structured, connected knowledge: new atomic notes, updated Maps of Content, and wikilink relationships.

## Initialization Checklist

Before executing any loop iteration, an agent MUST:

0. Read `.env.local` in the repo root — load `VAULT_PATH`. Abort if missing (tell user to run `scripts/setup.sh`).
1. Read `context/vault-structure.md` — understand current folder layout and conventions
2. Read `context/agent-notes.md` — understand the agent-managed note convention
3. Read `Agent Vault Index` in the vault — load last known vault state
4. Read `Agent Operation Log` in the vault — know what was done last time
5. Read `context/boundaries.md` — internalize what is off-limits
6. Read `loop.md` — load the six-phase execution model
7. Load relevant skills from `skills/` for the current task type

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

All agents start by executing `loop.md`. No direct vault editing occurs without passing through the loop phases.

## Scope Boundaries (Summary)

Full detail in `context/boundaries.md`. Quick reference:
- **Allowed**: Creating `.md` files in the vault, editing existing vault notes, adding wikilinks, creating/updating MOC files
- **Forbidden**: Deleting vault files, modifying `.obsidian/` config, modifying files in `second-brain/` itself, touching `.stfolder/`

## Agent Types

| Task | Entry Spec |
|------|-----------|
| Process new raw content | `specs/ingestion.md` |
| Connect existing notes | `specs/connection.md` |
| Generate atomic notes | `specs/generation.md` |
| Handle daily notes (link annotation only) | `specs/daily-note.md` |
| Handle daily notes (full pipeline: fetch + enrich + digest) | `specs/daily-pipeline.md` |
| Surface new knowledge as digest | `specs/knowledge-digest.md` |
