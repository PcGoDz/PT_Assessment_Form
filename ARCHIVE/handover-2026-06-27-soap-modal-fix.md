# HANDOVER.md — Current Session State

Last updated: 2026-06-27

---

## Where we left off

SOAP modal draft-recovery fix SHIPPED and merged to main (`baaa3f4`, 2026-06-27). Built on worktree `hardcore-khorana-a854b8`. Implementation: per-episode localStorage key `pt_soap_draft_<EPISODE_ID>` — stash on every `input` event, rehydrate inside `openSoapModal()` on the new-note path only (`!soap` guard), clear on `saveSoap()` success and explicit Cancel. Backdrop click and `×` button are soft-dismiss (preserve draft). Cancel button swapped to `cancelSoapModal()` (clears then closes). Five commits: `dbe2f84` (helpers) → `f647b35` (stash wiring) → `4de9fac` (rehydrate) → `ebcd182` (clear on save/cancel) → `75d2a9b` (autocomplete=off).

During smoke-test, a cross-episode field bleed was observed (home→episode B showed episode A's typed content). Diagnosed via console instrumentation: our localStorage code was confirmed innocent (`soapDraftKey()` returned correct per-episode key, `localStorage.getItem()` returned null during the bleed). Root cause: browser autofill firing on fixed-ID textarea fields (`soap-s`, `soap-o`, `soap-a`, `soap-p`) after `setTimeout` focus. Fix: `autocomplete="off"` on all 9 SOAP modal fields (commit `75d2a9b`). Smoke-test cases 1–7 all green post-fix. Two CLAUDE.md axioms also added this session (`dc0762a`): "Data-loss is a ship-stopper" (first bullet in Project axioms) and "Hold state, don't make the clinician re-enter it" (appended to Design intent). WORKFLOW.md Cowork two-window rule loosened (`ef348ff`).

---

## Half-done

- Worktree folder `PT_Assessment-worktrees/hardcore-khorana-a854b8` may still be on disk (Windows CWD lock — `git worktree remove --force` got permission denied). Git-side clean (branch deleted, worktree pruned). `rmdir /s /q PT_Assessment-worktrees\hardcore-khorana-a854b8` once session closes.
- **git push** — main ahead of origin by 31 commits. Miruya's call.
- **exe build** — deferred. `build.bat` after push.

---

## Next session priorities

1. **git push** — 31 commits unpushed. Run when ready.
2. **NCD Plan B vs +Note sweep** — Miruya picks which goes next. Plan B spec at `docs/superpowers/plans/2026-06-25-ncd-form-plan-B.md` (per-visit measurements v3, SOAP-modal NCD panel, trend page). +Note sweep: DESIGN_SYSTEM recipe + apply to NCD/BURN/HAND.
3. **exe build** — `build.bat` after push; confirm `pdf_ncd.py` + `ncd_shapes` bundle.

---

## Gotchas discovered this session

- **Browser autofill bleeds across SOAP modal episodes.** Fixed with `autocomplete="off"` on all 9 modal fields (`75d2a9b`). If it resurfaces: root cause is browser-heuristic timing — fills textareas on `focus()` after fixed-ID fields are cleared. The bug reproduced twice then went shy under console instrumentation. `autocomplete="off"` is the correct suppressor; if a future browser ignores it, the next layer is `name` attribute removal or dynamic ID suffixing. Our localStorage draft code was confirmed innocent throughout.
- **DESIGN_SYSTEM.md at 247/250 lines** — at ceiling. Next component recipe addition requires either splitting the file or pruning stale content first.
- **Systematic debugging finding:** when `localStorage.getItem(key)` returns null during a visible bleed, the bleed is NOT from your localStorage code — look at browser-side form memory or external autofill sources.

---

## What to skip for now

VESTIBULAR / PAEDIATRIC / LYMPHOEDEMA / GENERAL. Don't start Plan B without reading `docs/superpowers/plans/2026-06-25-ncd-form-plan-B.md` fresh. See BACKLOG.md for full deferred list.
