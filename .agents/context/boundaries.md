# Boundaries: What Agents Must Not Do

This file defines hard constraints. Violating any of these is an automatic abort (Harness Engineering Principle 6: Scope Control).

## Ownership Territory

Ownership is marker-based, not folder-based. Agent-generated knowledge notes (source, atomic, MOC, research, recap) carry `agent_generated: true` and live flat at the root; agent-owned state notes carry `agent_managed: true` and live under `Agent/`. `Agent/` and `Agent/Temp/` are the only agent-owned folder territories. Legacy folders (`Sources/`, `Atomic/`, `MOCs/`, `Research/`) are read-only fallbacks — notes there are found but never auto-moved.

## Forbidden Paths (NEVER modify)

| Path | Reason |
|------|--------|
| `$VAULT_PATH/.obsidian/` | Obsidian configuration — changes here break the app |
| `$VAULT_PATH/.stfolder/` | Syncthing metadata — changes here break sync |
| `.agents/` itself | Agents do not rewrite their own harness during vault-processing runs |
| `/home/openclaw/second-brain/` | Repo code is not a vault artifact |
| `$VAULT_PATH/Agent/` | *Restricted, not forbidden* — the agent creates/updates state notes and `Agent/Temp/` scratch here per the active spec; never delete durable notes or hand-edit outside a spec |

Exception: explicit harness-maintenance requests may edit `.agents/` and repo files, but must not touch vault user content unless separately requested.

## Forbidden Actions

| Action | Reason |
|--------|--------|
| Delete any `.md` file | Irreversible — user content loss |
| Rename existing files | Breaks all existing wikilinks pointing to that file |
| Move files between folders automatically | Same as rename — breaks links; use dedicated folders for new notes only unless the user explicitly requests a migration |
| Overwrite a user-authored file's full content | Risks destroying user content |
| **Modify the user zone / user-authored unstructured content** — annotate, wikilink, append to, or rewrite the user's bullets, pasted URLs, or prose | The user's writing is **read-only**. Analyze it but write nothing into it; all generated content (source-note links, transcripts, detected concepts) goes in the **agent zone** or new agent-created notes |
| Modify task items (`- [ ]`) | Tasks belong to the user |
| Modify a note carrying `agent_augmented: true` beyond additive edits | That note is co-owned; only additive changes allowed unless the active spec explicitly says otherwise |
| Alter personal reflections or diary entries | Not the agent's domain |
| Push to any git remote | Requires explicit user instruction |
| Modify `.obsidian/` plugin config | Not the agent's domain |

## Restricted Actions (require explicit log entry before doing)

| Action | Required log |
|--------|-------------|
| Adding frontmatter to an existing note | Log: `FRONTMATTER_ADDED: <file>` |
| Creating a folder in the vault | Log: `FOLDER_CREATED: <path>`; only `Agent/` and `Agent/Temp/` are routine folders |
| Creating more than 5 new notes in one session | Log: `BULK_CREATION: N notes` |
| Editing a note the user modified in the last 1 hour | Log: `RECENT_EDIT_TOUCHED: <file>` — and prefer deferring |

## Ambiguity Protocol

If an action COULD fall into a forbidden category but the agent is uncertain:
1. Do NOT perform the action
2. Log it as `AMBIGUOUS_ACTION: <description>`
3. Defer to user clarification before next run

## Scope Creep Prevention

The agent may only touch files that are:
1. Listed in the current session's change set (from Phase 1), OR
2. Directly created by the agent this session (new atomic notes, new MOCs), OR
3. One of the seven agent-managed notes, OR
4. A related note or MOC explicitly named in the Phase 3 contract

Any other file is out of scope. If a file outside scope needs updating, log it in `Agent Operation Log` under `DEFERRED_SCOPE` and address it next session.
