# HANDOVER.md — Current Session State

Last updated: 2026-06-23

## Where we left off

FACIAL +Note ghost (collapsible optional notes) BUILT, double-audited, smoke-gated, and MERGED to main (--no-ff `a2a4553`) + pushed to GitHub. Executed PLAN-FACIAL-UIX.md Tasks 1-4 on worktree upbeat-einstein-e05cd8: CSS (`e60829d`), 5-note markup wraps (`495a053`), JS toggleNote + empty-blur auto-collapse + populate-reopen + reset-recollapse (`0b97fac`). One layout fix during smoke-test: +Note buttons floated center in `.field`'s flex-column → pinned `align-self:flex-start` form-local (`a674b46`). All 5 note input ids unchanged (nature-notes/agg-notes/ease-notes/hrs24-notes/sensation-notes) so collect()/populate() data path intact; sensation-notes lost its `.fg>.field>label` chrome to match the other 4 (plan risk #4, intentional). FACIAL Phase 1.2 DONE.
Also this session: pushed 20 backlogged commits to GitHub (origin/main was stuck at 636bf03, all FACIAL work was local-only) + housekeeping (`dc2f348`: gitignored outputs/ Cowork scratchpad, deleted stale FACIAL_TEMPLATES_PROMPT.md + PASSOVER-next-session.md, force-deleted dead claude/facial-plan branch — content was strict subset of main).

## Half-done

- Worktree folder PT_Assessment-worktrees/upbeat-einstein-e05cd8 lingers on disk (Windows CWD-lock, this CC session inside it). Branch deleted + pruned git-side. Safe `rmdir /s /q PT_Assessment-worktrees\upbeat-einstein-e05cd8` once this session closes.
- Older lingering worktree folders from prior sessions may still be on disk (see BACKLOG worktree-cleanup list) — all git-side clean, folders await manual rmdir.

## Next session priorities

1. Nothing blocking. FACIAL is fully shipped + merged + pushed. Fresh pick.
2. Candidate next forms (all ready=False): VESTIBULAR (Neuro), PAEDIATRIC/LYMPHOEDEMA/NCD/GENERAL (Rehab). Per memory: peds is lowest priority, GENERAL dead last.
3. Optional: exe build (deferred whole FACIAL phase) — rebuild via build.bat now that FACIAL's done, smoke the packaged exe.
4. Optional housekeeping: clear the lingering worktree folders once their sessions close.

## Gotchas discovered this session

- **+Note in a flex-column `.field` floats center, not left** — `.field` is `display:flex;flex-direction:column`; a bare `<button>` child centers in the leftover width. SCI's donor avoids this only because its +Note sits under a full-width grid, not a partial-width chip row. Fix: `align-self:flex-start` on `.func-note-toggle`, form-local. Cosmetic, see-it-live per plan risk #3.
- **Two-window audit method held clean** — verified all 4 commits from git object store (`git show <hash>:<file>`), never raw mount read. The "4 files in git diff --stat main" scare was housekeeping-commit noise (main advanced past branch point d0af376); diffing against the true merge-base showed exactly 2 files. Always diff against merge-base, not main tip, when the branch is behind main.

## What to skip for now

Exe build unless explicitly wanted. Other forms (VESTIBULAR/PAEDIATRIC/LYMPHOEDEMA/NCD/GENERAL). See BACKLOG.md for the full deferred list.
