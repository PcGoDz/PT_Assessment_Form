# GOTCHA — 2026-06-08 — Archiving a Cowork/CC session DESTROYS its worktree folder

**Severity: HIGH (surprise data-scare). Loss this time: ZERO — but only because git had everything committed.**

## What happened

CC (Claude Code) ran the SCI PDF work inside a git worktree at
`PT_Assessment-worktrees\pensive-poitras-c94773` (branch `claude/pensive-poitras-c94773`).
After the session's work was committed, the CC session was **archived** (closed) from the Cowork UI.

Archiving the session **emptied the worktree folder** — every checked-out file
(`pdf_sci.py`, `app.py`, `ARCHIVE/`, the whole tree) was swept from disk. Windows Explorer showed
the folder containing a single stray file. `git worktree list` showed the worktree was also
**deregistered** (only main remained).

## Why nothing was lost

The worktree FOLDER is just a checkout. The actual work lives in commits inside the **main repo's
`.git` database**, which is untouched by the session archive. All 8 commits (including
`81c2582 refactor(sci): side-by-side equal-height pairs` and `8abbf8b docs: session wind-down`)
survived intact on the branch. Verified: `git show claude/pensive-poitras-c94773:pdf_sci.py`
returned the full refined file (pair_box + generate_sci_pdf + _build_story all present).

**Commits = money in the bank. Worktree folder = cash on the table. Archiving cleared the table,
not the account.**

## THE RULE (load-bearing)

**Before archiving/closing a CC session that ran in a worktree: confirm ALL work is COMMITTED.**
Uncommitted working-tree changes in a worktree are at risk of being swept on session archive.
A committed branch is safe; an uncommitted edit in the worktree is NOT.

- Commit early, commit per task (we already do this — keep doing it).
- Never leave a worktree session with uncommitted work you care about, then archive it.
- The branch persists forever regardless of the folder — so "continue from the same branch" next
  session STILL WORKS: just `git worktree add <path> claude/<branch>` to re-materialise every file.

## Recovery procedure (if a worktree folder gets swept)

From the MAIN repo (`PT_Assessment`):
```
git worktree prune                       # clear stale worktree bookkeeping
git worktree list                        # confirm only main remains
rmdir /s /q <empty-husk-folder>          # delete the emptied folder (Windows)
# next session, when ready to resume:
git worktree add C:\...\PT_Assessment-worktrees\<name> claude/pensive-poitras-c94773
# ^ recreates the folder with EVERY file restored from the branch
```

## Related

- Same family as the sandbox-mount staleness incident
  (`incident-2026-06-08-sci-pdf-stale-mount-phantom.md`) — both are Cowork-environment quirks around
  files vs git state. Different mechanism, same lesson: trust git (committed bytes), not the folder view.
- BACKLOG already notes a prior stale worktree folder lingering after `git worktree remove`. This is
  the inverse — folder destroyed by session archive rather than left behind.
