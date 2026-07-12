# HANDOVER.md — Current Session State

Last updated: 2026-07-07

---

## Where we left off

NCD new-follow-up draft-loss bug FIXED, merged (`7d5caed`), pushed. 3 additive NCD-guarded
edits in `templates/episode.html`, ZERO `ncd_measure.js` changes: `saveSoapDraft()` now
stashes `NcdMeasure.collect()` for NCD episodes and counts non-empty measurements as content
(numbers-only draft no longer wiped as empty); `openSoapModal()`'s new-note path rehydrates via
`NcdMeasure.populate()` after the grid builds. Fix commit `c7d6028`, merge `7d5caed`. 5 CC
smoke tests passed against a live dev server: measurements survive backdrop-dismiss alone;
measurements+SOAP text survive together; a real save clears the draft; MS (non-NCD) red-line
made zero stray `/ncd-measurements` calls; editing an existing saved visit loads by `soap_id`
untouched by a stray draft.

---

## Half-done

- **Miruya's OWN break-it pass on the fix is OWED.** Merge happened via a CC prompt that said
  "merge to main", skipping the WORKFLOW-176 worktree eyeball gate. Verified at git + CC-smoke
  level, not by his hands. Run next session vs main `7d5caed`; if it finds something → fix-
  forward on a NEW branch.
- **exe build + v3 migration check on a real v2 db** — deferred (carried from 2026-07-05).
- **Lingering worktree folder:** `PT_Assessment-worktrees/frosty-torvalds-5e6f9c` — git-side
  removed (`git worktree remove --force` + branch deleted + pruned), but the folder itself
  wouldn't `rmdir` (Windows CWD lock — this session's shell was still inside it). Needs a
  manual `rmdir /s /q` once the session closes.

---

## Next session priorities

1. **NCD measurements panel DENSITY REDESIGN (the beeg, untouched).** Do it in a FRESH Cowork
   session — this session's mount went stale. Decision locked: panel lives INSIDE the SOAP
   modal → design in the modal's vocabulary (`session-info-grid` / `-box` / `soap-form-field`),
   NOT the form `.fg`/`.card` primitives. Group by the 4 BATTERY headers (Vitals/Bloods/
   BodyComp/Fitness), compact multi-col, borrow NT/N-A grid-stamp for bulk-empty rows. See
   BACKLOG.
2. **Miruya's break-it pass on the shipped fix** (see Half-done above).
3. **exe build.**

---

## Gotchas discovered this session

- **Merge-gate slip: CC handoff prompts must NEVER say "merge to main"** — stop at "push the
  BRANCH". Merge is human-gated (WORKFLOW-176), done together after Miruya eyeballs the
  worktree. Added to WORKFLOW two-window section + Cowork memory.
- **CC force-moved the checked-out main ref from the worktree to complete that merge**
  (guardrail-dodge, born from the bad prompt). Landed clean but sketchy. Correct mechanics: CC
  pushes the branch, merge from the main checkout.
- **Cowork mount went stale-behind-HEAD** (torn `episode.html` snapshot — session started
  before CC finished). Verify CC work via `git show <commit>:<file>`, never a raw read of a
  file CC just touched. Miruya's real git status came back clean.

---

## What to skip for now

VESTIBULAR/PAEDIATRIC/LYMPHOEDEMA/GENERAL still not ready. home.html dashboard UI pass (5
findings) parked in BACKLOG. Full deferred list in BACKLOG.
