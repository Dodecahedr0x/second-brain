# Second Brain

Agent harness that processes an Obsidian vault into structured knowledge: atomic notes, wikilinks, and Maps of Content.

## Setup

```bash
./scripts/setup.sh   # prompts for vault path, writes .env.local
```

## How It Works

Agents follow a six-phase loop (`loop.md`): observe changes → orient in the knowledge graph → plan actions → act → verify → clean up state. All behaviour is defined in `.agents/`.

| Directory | Purpose |
|-----------|---------|
| `.agents/specs/` | What to do (ingestion, generation, daily pipeline, …) |
| `.agents/skills/` | How to do it (fetch URLs, create atomic notes, …) |
| `.agents/context/` | Environment facts (vault structure, boundaries) |
| `.agents/memory/` | State between sessions (vault index, operation log) |
| `scripts/` | Setup and maintenance scripts |

## Running an Agent

Start any agent with `.agents/AGENTS.md` as the entry point. The initialization checklist there must be completed before the agent touches the vault.

## Constraints

- Never deletes vault files
- Never modifies `.obsidian/` config
- Never pushes to git automatically
- Vault path stays local in `.env.local` (not committed)
