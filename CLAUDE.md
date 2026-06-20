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
3. Update `.agents/memory/` before stopping

## What This Repo Does NOT Do

- Does not push to any remote automatically
- Does not delete vault files
- Does not modify Obsidian configuration
- Does not run without completing the initialization checklist

## Scripts

*(None yet — add as the repo grows)*

## Conventions

- All agent config lives in `.agents/`
- Memory files (state between sessions) live in `.agents/memory/`
- Specs (what to do) live in `.agents/specs/`
- Skills (how to do it) live in `.agents/skills/`
- Context (environment facts) live in `.agents/context/`
