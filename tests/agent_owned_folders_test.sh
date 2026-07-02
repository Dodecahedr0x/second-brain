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

require_literal ".agents/context/vault-structure.md" 'Regenerability invariant: `Sources/`, `Atomic/`, `MOCs/`, `Research/`, and `Agent/`'
require_literal ".agents/AGENTS.md" 'Ensure the agent-owned folder skeleton exists: `Sources/`, `Atomic/`, `MOCs/`, `Research/`, `Agent/`'
require_literal ".agents/context/agent-notes.md" 'Agent-managed notes live under `Agent/`'
require_literal ".agents/skills/agent-notes.md" 'check that all seven notes exist there'
require_literal ".agents/specs/source-note.md" 'create new source notes under `Sources/`'
require_literal ".agents/specs/generation.md" 'Save to `Atomic/<Concept>.md`'
require_literal ".agents/skills/update-moc.md" 'Create file: `MOCs/{Topic} MOC.md`'
require_literal ".agents/specs/research.md" '$VAULT_PATH/Research/<short_form>.md'
require_literal ".agents/context/vault-structure.md" 'Migration safety: never move or rename existing vault notes automatically.'
