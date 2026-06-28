# Second Brain

Agent harness that processes an Obsidian vault into structured knowledge: atomic notes, wikilinks, and Maps of Content.

## Setup

```bash
./scripts/setup.sh   # prompts for vault path, writes .env.local
```

YouTube transcripts are fetched cookielessly first — title/channel via oEmbed and the transcript via `youtube-transcript-api` (`setup.sh` installs it). This bypasses YouTube's player-API bot-gate for many videos. On a datacenter/cloud IP, YouTube still blocks some videos at the IP level; for those, set `YT_COOKIES` in `.env.local` (e.g. `YT_COOKIES="--cookies-from-browser chrome"` or `--cookies cookies.txt`) so transcript extraction and YouTube discovery can authenticate. If the block is IP-level, set `YT_PROXY` to a proxy URL (e.g. `socks5://127.0.0.1:9050` or `http://user:pass@host:8080`); it is passed to yt-dlp and `youtube-transcript-api`. Leave both empty to run cookieless/direct (best-effort; discovery is then relevance-only). See `.env.example`.

## How It Works

Agents follow a six-phase loop (`loop.md`): observe changes → orient in the knowledge graph → plan actions → act → verify → clean up state. All behaviour is defined in `.agents/`.

Beyond digesting what you pour in, the agent also **proactively discovers** content for the topics you write about: it infers your active topics from recent daily notes and pulls fresh items from **arxiv, YouTube, the web, and Hacker News** into source notes, surfaced in your daily note's *What's New* section. Weekly and monthly passes resurface topics you've drifted from. See `.agents/specs/discovery.md`.

| Directory | Purpose |
|-----------|---------|
| `.agents/specs/` | What to do (ingestion, generation, daily pipeline, discovery, …) |
| `.agents/skills/` | How to do it (derive topics, search sources, fetch URLs, create atomic notes, …) |
| `.agents/context/` | Environment facts (vault structure, boundaries) |
| Agent-managed vault notes | State between sessions (vault index, concept gaps, operation log, user profile, discovery log) |
| `scripts/` | Setup and maintenance scripts |

## Running an Agent

Start any agent with `.agents/AGENTS.md` as the entry point. The initialization checklist there must be completed before the agent touches the vault.

## Obsidian Plugin: Second Brain Workflows

Run any workflow as an Obsidian command, with live output in a side panel. The
plugin shells out to `scripts/run.sh <spec>` (the same entry point cron uses).

### Install (via BRAT)

1. Install **BRAT** (Obsidian → Community Plugins → "Obsidian42 - BRAT").
2. BRAT → *Add beta plugin* → paste `https://github.com/Dodecahedr0x/second-brain`.
3. Enable **Second Brain Workflows** in Community Plugins.
4. Open its settings:
   - **Repo path** → the disk path to this repo (vault and repo are separate).
   - **Claude binary path** → defaults to `~/.local/bin/claude`; fix if needed
     (GUI Obsidian can't see your shell `PATH`).
   - **.env.local** → click **Point at this vault** if it's missing.

Desktop only (spawns a local process).

### Commands

`Process inbox`, `Ingest new content`, `Connect existing notes`,
`Generate atomic notes`, `Annotate daily note links`, `Run daily pipeline`,
`Create source note from URL` (prompts for a URL), `Knowledge digest`,
`Daily suggestions`, `Weekly review`, `Monthly review`, `Retry failed items`.

A ribbon icon opens a quick-pick of all workflows. Only one runs at a time;
output streams to the **Second Brain output** panel with a Stop button.

### Building the plugin

```bash
npm install
npm run build      # emits main.js
```

Cutting a release for BRAT: bump `version` in `manifest.json` + `package.json`,
add it to `versions.json`, then create a GitHub release tagged with that exact
version and attach `manifest.json`, `main.js`, and `styles.css`.

## Constraints

- Never deletes vault files
- Never modifies `.obsidian/` config
- Never pushes to git automatically
- Vault path stays local in `.env.local` (not committed)
