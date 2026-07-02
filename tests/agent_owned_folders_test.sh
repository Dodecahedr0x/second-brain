#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

require_literal() {
    local file="$1"
    local literal="$2"
    grep -F "$literal" "$ROOT/$file" >/dev/null || {
        echo "missing expected text in $file: $literal" >&2
        exit 1
    }
}

require_absent() {
    local file="$1"
    local literal="$2"
    if grep -F "$literal" "$ROOT/$file" >/dev/null; then
        echo "unexpected legacy text in $file: $literal" >&2
        exit 1
    fi
}

require_literal ".agents/context/vault-structure.md" 'The user selected a flat vault for knowledge notes.'
require_literal ".agents/context/vault-structure.md" 'User-generated notes carry no ownership tag/frontmatter.'
require_literal ".agents/context/vault-structure.md" 'agent_augmented: true'
require_literal ".agents/context/vault-structure.md" 'Only these folders are agent-owned:'
require_literal ".agents/AGENTS.md" 'Ensure the agent-owned folder skeleton exists: `Agent/` and `Agent/Temp/` only'
require_literal ".agents/context/agent-notes.md" 'Agent-managed notes live under `Agent/`'
require_literal ".agents/skills/agent-notes.md" 'check that all seven notes exist there'
require_literal ".agents/specs/source-note.md" 'create new source notes flat at the vault root'
require_literal ".agents/specs/source-note.md" 'agent_generated: true'
require_literal ".agents/specs/source-note.md" 'agent_last_touched: YYYY-MM-DDThh:mm:ssZ'
require_literal ".agents/specs/generation.md" 'Save to `<Concept>.md` at the vault root'
require_literal ".agents/skills/update-moc.md" 'Create file: `{Topic} MOC.md` at the vault root'
require_literal ".agents/specs/research.md" '$VAULT_PATH/<short_form>.md'
require_literal ".agents/context/vault-structure.md" 'Migration safety: never move, rename, or delete existing vault notes automatically.'
require_literal ".agents/specs/reconcile.md" 'Regular flat root notes can keep improving over time.'
require_literal ".agents/specs/reconcile.md" 'Past daily recap exists | Frozen; do not edit'
require_literal ".agents/specs/reconcile.md" 'Rerunning setup on an existing vault fills gaps only.'
require_literal ".agents/loop.md" 'Run `specs/reconcile.md` in `continuous` mode'
require_absent ".agents/AGENTS.md" 'Sources/`, `Atomic/`, `MOCs/`, `Research/`, `Agent/`'
