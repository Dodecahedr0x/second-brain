# Spec: Retry Failed Items

**Trigger**: Manual (`scripts/retry-failed.sh`) or scheduled as needed.

**Goal**: Locate every `#needs-review` item in the vault, retry the extraction step that previously failed, and either fully process the item or queue it for the next daily pipeline run. Items that still fail are logged with a reason so the user can act on them.

---

## Phase Integration Map

| Loop Phase | Work Done |
|------------|-----------|
| Phase 1 OBSERVE | Find all `#needs-review` items across the vault |
| Phase 2 ORIENT | Classify each item by type and determine the retry strategy |
| Phase 3 DECIDE | Assign one action per item (RETRY or SKIP); cap at 20 items |
| Phase 4 ACT | Execute retries; on success fully process or hand off; on failure log |
| Phase 5 VERIFY | All items either processed, queued, or explicitly logged as failed |
| Phase 6 CLEANUP | Update `Agent Vault Index`, write to `Agent Operation Log`, emit summary |

---

## Phase 1: Find Items

Search `$VAULT_PATH` for `#needs-review` in `.md` files. Exclude agent-managed notes (`agent_managed: true` frontmatter) and the agent notes themselves.

Collect two item types:

### Type A — URL bullet in a daily note

Pattern: a bullet in a `YYYY-MM-DD.md` file that contains a bare URL or markdown link **and** either `#needs-review` on the same line or no wikilink annotation yet (unannotated after a previous failed session).

```
- https://youtu.be/abc123 #needs-review
- [Some Article](https://example.com) #needs-review
```

Extract: `url`, `source_daily_note` (filename), `bullet_text`.

### Type B — Stub source note

Pattern: a non-daily `.md` file with `source_url:` in frontmatter and `#needs-review` in its Tags line.

```yaml
---
source_url: https://youtu.be/abc123
source_type: youtube
---
...
Tags: #source #youtube #needs-review
```

Extract: `source_url`, `source_type`, `note_filename`.

---

## Phase 2: Classify

For each item determine the retry skill:

| URL pattern | Skill |
|-------------|-------|
| `youtu.be` or `youtube.com/watch` | `skills/extract-youtube.md` |
| `twitter.com` or `x.com` | `skills/extract-twitter.md` |
| anything else | `skills/fetch-url.md` |

If the URL cannot be determined from a Type B note's frontmatter → classify as SKIP (log: "no source_url in frontmatter").

---

## Phase 3: Decide

For each item assign one action:
- **RETRY**: re-run the classified skill
- **SKIP**: log reason, take no action

Cap at **20 retries per session**. If more items exist, process oldest first (by file modification date), defer the rest — they will be caught on the next run.

Write the plan as a numbered list before starting Phase 4.

---

## Phase 4: Act

For each RETRY item in plan order:

### 4a. Run the skill

Call the appropriate extraction skill with the item's URL.

### 4b. On success (`status: OK`)

**Type A (URL bullet)**:
1. Replace the `#needs-review` bullet in the daily note with the annotated form:
   ```
   - [[Source Note Title]] — <url kept in source note frontmatter only>
   ```
2. Remove `#needs-review` from the bullet line.
3. For each concept returned by the skill:
   - Matches existing note → schedule ENRICH (add to a deferred list; the next daily run will pick it up)
   - No match → add to `Agent Concept Gaps`
4. Log: `[TIMESTAMP] RETRY_OK: <url> → [[Source Note Title]]`

**Type B (stub source note)**:
1. Fill in the stub: overwrite `## Summary`, `## Key Points`, `## Raw Notes`, `## Concepts` with extracted content.
2. Remove `#needs-review` from the Tags line.
3. If the originating daily note can be found (via `source_url` cross-reference in the vault), annotate its bullet.
4. Log: `[TIMESTAMP] RETRY_OK: <note_filename> filled from <url>`

**After success**: tag the item `#queued` only if enrichment of atomic notes was deferred. Otherwise it is fully processed.

### 4c. On failure (status: `FAILED` / `EMPTY` / `BLOCKED` / `NO_TRANSCRIPT`)

1. Leave the item unchanged.
2. Log the failure:
   ```
   [TIMESTAMP] RETRY_FAIL: <url or note_filename> — <status>: <reason>
   ```
3. Do NOT remove `#needs-review` — it stays so future retry runs will find it.

### 4d. On SKIP

Log: `[TIMESTAMP] RETRY_SKIP: <item> — <reason>`

---

## Phase 5: Verify

- Every item in the Phase 3 plan has a corresponding log entry (RETRY_OK, RETRY_FAIL, or RETRY_SKIP)
- No `#needs-review` item that was successfully processed still has the tag
- No vault note is left in a partial/broken state

---

## Phase 6: Cleanup

1. Update `Agent Vault Index` for any new or updated notes.
2. Write to `Agent Operation Log`:
   ```
   ## Retry Session YYYY-MM-DD
   Items found: N  |  Succeeded: N  |  Failed: N  |  Skipped: N
   last_run_timestamp: ISO 8601
   ```
3. Print a **RETRY SUMMARY** block to stdout so it appears in the script's log:
   ```
   === RETRY SUMMARY ===
   Found:     N items with #needs-review
   Succeeded: N
     - [[Note Title]] (youtube)
     - [[Note Title]] (article)
   Failed:    N
     - https://... — NO_TRANSCRIPT: no subtitles available
     - https://... — BLOCKED: paywall
   Skipped:   N
   =====================
   ```

---

## Constraints

- Never delete vault files — leave failed items untouched with their `#needs-review` tag
- Do not re-attempt an item more than once per retry session
- Do not modify `Agent Operation Log` entries from previous sessions
- Deferred enrichment (ENRICH actions for atomic notes) is not done here — it is left for the daily pipeline
- If `$VAULT_PATH` is missing or unreadable, abort immediately with a clear error
