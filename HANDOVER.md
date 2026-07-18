# HANDOVER.md — Current Session State

Last updated: 2026-07-14

---

## Where we left off

VESTIBULAR form activation — front half only, DOCS-ONLY, no build. Cowork-brain wrote the design
spec (D1-D10 locked) + vetted the plan; CC-muscle wrote the durable implementation plan (14 tasks,
milestone ladder `form → polish → templates → PDF → polish → MPIS → polish`) and folded in 2 vet
fixes before merge: (1) `.irr-chip.active:not(.vb-chip)` paint rule in Task 2's CSS block — style.css
only paints `.irr-chip` via `.sel-High/Medium/Low`, `.active` alone doesn't paint (the FACIAL
invisible-selection trap), scoped `:not(.vb-chip)` so it can't fight the battery Yes/No/Pos/Neg
colors; (2) Task 5's `populate()` had a broken regex mapping `rom` keys to DOM ids — replaced with
the explicit `romIdMap` version, dead `soma` id-loop deleted. On main now (merged `--no-ff`,
`ccc7323`): `docs/superpowers/specs/2026-07-14-vestibular-form-design.md`,
`docs/superpowers/plans/2026-07-14-vestibular.md`, and `docs/superpowers/specs/2026-07-14-ncd-template-content.md`
(loose Cowork doc, committed explicitly). No source code touched.

---

## Half-done

- **Lingering worktree folders (Windows CWD lock), both git-side fully removed** (worktree
  deregistered, branches deleted via `git branch -D` after confirming `--merged main`):
  `PT_Assessment-worktrees/busy-mendeleev-5e834c/` and `.claude/worktrees/vestibular-form/`.
  Neither folder would `rmdir` while this session held it open. Manual `rmdir /s /q` both once no
  Claude Code session has them as CWD.
- **exe build + v3 migration check on a real v2 db** — still deferred (carried from 2026-07-12).

---

## Next session priorities

1. **VESTIBULAR build** — execute `docs/superpowers/plans/2026-07-14-vestibular.md` task by task.
   Both vet fixes are already folded into the plan text; no further doc edit needed before
   starting Task 1.
2. exe build + v3 migration check on a real v2 db (carried, lower priority than 1).

---

## Gotchas discovered this session

- **Write-tool absolute paths don't follow `EnterWorktree` switches automatically.** Mid-session,
  a `Write` call using a path typed earlier in the conversation landed a file in the OLD worktree
  (`busy-mendeleev-5e834c`) after the session had already `EnterWorktree`'d into a NEW one
  (`vestibular-form`). Caught via `git status --short` showing the file untracked in the wrong
  location; fixed by copying to the correct worktree and deleting the stray. Rule: after any
  `EnterWorktree` switch, re-verify the target path of the next `Write`/`Edit` call rather than
  reusing a path string composed before the switch.
- **`git branch -d` can refuse a branch it just confirmed via `--merged main`.** When a local
  branch has a remote tracking ref, `-d` also checks merge status against `@{upstream}`, not just
  the comparison ref you passed to `--merged`. If `--merged main` already confirmed the branch is
  an ancestor of main, the refusal is upstream-sync pedantry, not a real safety signal — `-D` is
  fine there. Don't treat the refusal itself as proof the branch is unmerged.
- **WORKFLOW.md still at 248/250 lines** — the two 2026-07-12 rules (stale-mount guard, smoke
  split) remain un-migrated, blocked on the file-split that was flagged last session. Not touched
  this session either (docs-only, no WORKFLOW-worthy pattern emerged). Still pending.

---

## What to skip for now

VESTIBULAR build (plan ready, not started). PAEDIATRIC / LYMPHOEDEMA / GENERAL still not ready.
home.html dashboard UI pass. Full deferred list in BACKLOG.md.
