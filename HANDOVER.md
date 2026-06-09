# HANDOVER.md — Current Session State

Last updated: 2026-06-09

---

## Where we left off

SCI MPIS Milestone-4 built, verified, and merged. **SCI is now fully shipped** — form + polish +
templates + PDF + MPIS, the whole ladder. Main tip: `0b7a608`.

**What was built this session:**
- `static/js/main.js`: added `_buildMpisSci()` (~line 1878, SOAPIER structure: SUBJECTIVE /
  OBJECTIVE / ANALYSIS / PLAN / INTERVENTION) + dispatch wire in `copyToMpisAuto()` (~line 1039,
  before MS fallback). Commit `06f6e51`.
  - Grid serializer handles four cell states: greyed (key absent → skip), blank → em-dash, NT/N-A
    pass through, real value plain.
  - OBJECTIVE block guarded by `hasObj` — skips entirely if all grids + resp + aids + OM are empty.
  - Foreign patient header: shows Passport/Country instead of IC.
- Grand merge: `--no-ff` of branch `claude/pensive-poitras-c94773` (10 commits) → main.
  Merge commit `0b7a608`, pushed to origin. Branch history preserved (not squashed).

**Verified:** Opus Node harness 8/8 pass (SCI heading, 5 SOAPIER sections, greyed cells absent,
blank→em-dash, NT passthrough, empty grids omitted). Miruya smoke-tested worktree + post-merge
main: form + PDF + MPIS all confirmed. PDF↔MPIS tally green.

---

## Half-done

Nothing mid-flight. Clean tree on main. Worktrees removed (pensive-poitras gone; eloquent-williamson
folder still on disk — see Gotchas).

---

## Next session priorities

1. **SCI stamp-button cosmetic restyle** — NT stamp + "Mark block N/A" ghost placeholder styling.
   Deferred from Milestone-2. First visible next SCI task.
2. **SCI abbreviation legend/key** — SCI grids use shorthands (N/I/A/NT, MMT grades, MAS, G/F/P,
   U/A/S/I/NT) with no on-screen or PDF key. Scope TBD; clinical wording to confirm with Miruya
   before building. See BACKLOG for full abbreviation list.
3. **Fix B — DB migration versioning.** `PRAGMA user_version` gates in `database.py` (lines 80-101).
   Test against a COPY of the real DB; keep `try/except` INSIDE the v0→v1 gate.
4. **WORKFLOW.md split** — now 264 lines (over 250 ceiling). Candidate split: move Cowork section
   or Anti-Repeat list into a companion file. Do before next substantial edit to WORKFLOW.md.

---

## Gotchas discovered this session

- **Pre-merge dirty-tree check is mandatory.** Main had 1 real modified file (BACKLOG.md, 14-line
  pair_box write-up) + untracked incident notes that the branch commit adds as new files. Discarding
  without reading would have lost the pair_box detail; untracked notes matching incoming branch files
  would have caused "untracked files would be overwritten" abort. Correct sequence: `git diff` first,
  identify real vs phantom changes, discard stale, delete untracked files the merge will add, then
  merge. Flagging and waiting for Miruya's call on the BACKLOG divergence was the right move.
- **Stale `.git/index.lock`** — 0-byte, dated 2026-06-08, blocked all git ops. No live git process
  (`tasklist | findstr git` empty) → safe to `del .git\index.lock`. Already in WORKFLOW Anti-Repeat.
- **`eloquent-williamson-fb5d6d` folder still on disk.** Windows blocked `git worktree remove`
  because CC's session CWD was inside it. Manual `rmdir /s /q` from Explorer/cmd once that session
  is closed. Same situation as the optimistic-banzai note in BACKLOG.
- **Stray branch `claude/elastic-mayer-cb8c07`** — unrelated, not part of SCI, left alone. Worth
  investigating/culling a future session.

---

## What to skip for now

VESTIBULAR / FACIAL / remaining NO forms. See BACKLOG.md for the full deferred list.
