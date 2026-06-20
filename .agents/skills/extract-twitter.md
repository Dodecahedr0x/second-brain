# Skill: Extract Twitter/X

**Used in**: `skills/parse-content.md` external content routing (Phase 4 ACT)

Produces a source note (see `specs/source-note.md`) from a Twitter/X post URL.

## Step 1: Fetch Post

Try in order until one succeeds:

1. Replace `twitter.com` or `x.com` with `nitter.net` in the URL → `defuddle <nitter_url>`
2. `WebFetch <original_url>` (may be blocked or require login)
3. Status `BLOCKED` → skip, tag bullet `#needs-review`

## Step 2: Extract

From the fetched content:

| Field | Where |
|-------|-------|
| Author | `@handle` and display name |
| Date | Post timestamp |
| Text | Main post body (and thread replies if present) |
| Media | Note presence of images/video — do not fetch |
| Links | Any URLs in the post body → add to `## Concepts` as candidates for further extraction |

## Step 3: Create Source Note

Fill `specs/source-note.md` template:
- `source_type: twitter`
- Title: `@<handle> - <first 6 words of tweet> - <YYYY-MM-DD>`
- `## Raw Notes`: full post text verbatim (blockquote)
- `## Summary`: 1–2 sentences on what the post says or argues
- `## Key Points`: only if a thread with 3+ substantive tweets; otherwise omit

Save as `$VAULT_PATH/<Title>.md`.

## Step 4: Update Caller

Return:
```
EXTRACT_RESULT:
  status: OK | BLOCKED | FAILED
  note: <filename>
  concepts: [A, B, C]
```
