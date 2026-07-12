# HANDOVER.md — Current Session State

Last updated: 2026-07-12

---

## Where we left off

NCD SOAP-modal measurements panel DENSITY REDESIGN shipped + merged (`513c05b`). Full cycle in
one session: brainstorm → spec → plan → CC build (3 commits, `static/js/ncd_measure.js` ONLY) →
dual-gate review per task → CC browser smoke → Miruya feel-pass 8/8 → merge. Design: flat dense
inline-label grid (`repeat(auto-fill,minmax(150px,1fr))` → 3-col at modal width), 4 battery bands
kept, the 6 fitness comment fields (walk6Comment/step3Comment/flexComment/ulComment/llComment/
balanceComment) render as `+Note` chips via new `_buildNoteChip()`; `populate()` auto-expands a
filled note, `clear()` re-collapses. BMI/WHR read-only + live-recompute. Labels kept FULL —
research confirmed no standard shorthand for segmental body-comp terms; 3-col fits because values
are short. NT/N-A stamp and collapsible-groups both REJECTED in spec (recorded so they aren't
re-litigated). Docs authored: docs/superpowers/specs/2026-07-12-ncd-panel-density-design.md +
plans/2026-07-12-ncd-panel-density.md. FACIAL specs/plans relocated root → docs/superpowers/
(Miruya tidy), committed with the NCD docs as `e334cd1`.

---

## Half-done

- **Lingering worktree folders (Windows CWD lock):** `PT_Assessment-worktrees/ncd-page-ui-fix-5e9e46/`
  — git-side fully removed (worktree deregistered, branch deleted local+remote), empty folder
  won't `rmdir` until the CC session that owned it closes. Also re-confirm the older
  `frosty-torvalds-5e6f9c` from the 2026-07-07 handover is gone. Manual `rmdir /s /q` both.
- **exe build + v3 migration check on a real v2 db** — still deferred (carried).

---

## Next session priorities

1. **NCD template content** — still generic knee-OA boilerplate, NOT obesity/metabolic. Author NCD
   SMART statements for the 5 clinical categories + 4 SOAP categories. Content-only, no code. The
   realest remaining NCD gap.
2. **exe build** + v3 migration check on a real v2 db.
3. NCD cosmetic tail: boba-cup icon swap, faint body-shape PNGs; and the shared MPIS-readability
   pass (divider bars slam text — all forms, worst on NCD's longer output).

---

## Gotchas discovered this session

- **Cowork mount stale-on-WORKING-FILE (nastier variant of the known lag).** Post-merge, the Cowork
  window's on-disk `ncd_measure.js` was 88 lines SHORT of HEAD (pre-redesign snapshot) and showed
  as ` M`, while HEAD was correct. A blind `git add -A && commit` from stale Cowork would have
  REVERTED the ship. Guard: verify with `git show HEAD:<file> | grep`, commit ONLY from CC's live
  window, never `git-restore` from stale Cowork. → migrated to WORKFLOW two-window section.
- **Verification split banked.** CC smoke = code truth only (boots-clean, console, structure, dual
  gates) → push; Miruya owns the browser UI/feel + round-trip break-it (merge already human-gated).
  CC burned ~24 calls pixel-hunting a layout it can't judge. → migrated to WORKFLOW two-window.
- Browser smoke tooling flaky (viewport/click) → CC drove UI via DOM events + computed-style reads,
  not screenshots. Environment quirk, not code.
- **WORKFLOW.md at 248 lines — the two 2026-07-12 rules (stale-mount guard, smoke split) don't fit
  under the 250 ceiling.** NOT appended this session per the flag-instead-of-exceed instruction.
  Next session: split WORKFLOW.md (candidate: hive off "Cowork two-window workflow" into its own
  file) THEN add both rules — stale-mount guard (verify `git show HEAD:<file> | grep`, commit only
  from CC's live window, never `git-restore` from stale Cowork) and smoke split (CC = code-truth
  smoke only, push, STOP; Miruya owns browser feel + round-trip break-it).

---

## What to skip for now

VESTIBULAR / PAEDIATRIC / LYMPHOEDEMA / GENERAL still not ready. NCD polish tail (templates /
cosmetic / shared MPIS). home.html dashboard UI pass. Full deferred list in BACKLOG.
