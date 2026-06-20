# Second-Brain Repo

## Purpose

This repo contains code, scripts, and tools that digest content from the Obsidian vault into structured knowledge: atomic notes, wikilink connections, and Maps of Content.

## Agent Entry Point

All agent work starts at `.agents/AGENTS.md`. Read it before touching the vault.

## Vault Location

Set in `.env.local` (untracked). Run `scripts/setup.sh` to create it. Agents abort if this file is missing.

## Quick Start for Agents

1. Read `.agents/AGENTS.md` (harness config + initialization checklist)
2. Execute `.agents/loop.md` (six-phase processing loop)
3. Update the agent-managed vault notes before stopping

## What This Repo Does NOT Do

- Does not push to any remote automatically
- Does not delete vault files
- Does not modify Obsidian configuration
- Does not run without completing the initialization checklist

## Scripts

| Script | Purpose |
|--------|---------|
| `scripts/setup.sh` | First-time setup: vault path → `.env.local`, cron job |
| `scripts/run.sh` | Run the agent loop once (also called by cron) |

## Conventions

- All agent config lives in `.agents/`
- Agent memory/state lives in agent-managed notes inside the user vault
- Specs (what to do) live in `.agents/specs/`
- Skills (how to do it) live in `.agents/skills/`
- Context (environment facts) live in `.agents/context/`
