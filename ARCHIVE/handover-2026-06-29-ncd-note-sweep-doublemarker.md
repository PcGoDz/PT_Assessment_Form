# HANDOVER.md — Current Session State

Last updated: 2026-06-29

---

## Where we left off

NCD +Note sweep SHIPPED and merged to main (`f029ee8`, 2026-06-29). 9 NCD comment inputs converted to +Note collapsibles — IDs preserved (no collect/PDF/MPIS breakage): `smoking-comment`, `alcohol-comment`, `active-comment` (Lifestyle) + `walk6-comment`, `step3-comment`, `flex-comment`, `ul-comment`, `ll-comment`, `balance-comment` (Fitness Tests). Comment labels restored to Fitness cells in a post-sweep fix (floating bare buttons). DESIGN_SYSTEM.md gained Rule 7 (optional free-text MUST use +Note, not always-visible textbox) + full component recipe (HTML/CSS/JS contract). One line over-pruned during prose pass was restored: the "primitive missing = bug" rule (`c9b6bb7`).

Double-marker bug on NCD body chart fixed (`1f27298`): root cause was a redundant `BodyChart.init()` call in ncd.html's DOMContentLoaded — main.js already auto-inits on `#svg-ant` detection, so two listeners bound = two markers per click. Removed the template-side call; ms.html (no template init) confirmed as canonical mirror. WORKFLOW.md Anti-Repeat gained the "double-marker + grey-bleed = two separate bugs" rule (`4816dca`). Miruya smoke-tested all fixes green before merge.

---

## Half-done

- Worktree folder `PT_Assessment-worktrees/infallible-edison-fa5fc5` pending manual delete (Windows CWD lock — git-side clean, branch deleted). `rmdir /s /q PT_Assessment-worktrees\infallible-edison-fa5fc5` once this session closes.
- **git push** — main now 40 commits ahead of origin. Miruya's call.
- **exe build** — deferred. `build.bat` after push; confirm `pdf_ncd.py` + `ncd_shapes` bundle.

---

## Next session priorities

1. **git push** — 40 commits unpushed. Run when ready.
2. **NCD Plan B (trend page)** — BEEG task. Read `docs/superpowers/plans/2026-06-25-ncd-form-plan-B.md` fresh before touching code. Sanity-check charting lib vs `.exe` bundling (vanilla JS + PyInstaller) before any aesthetics. Split pipeline-first then GA-look.
3. **exe build** — `build.bat` after push.

---

## Gotchas discovered this session

- **Forms must NOT call `BodyChart.init()` in their DOMContentLoaded block.** main.js auto-fires it on `#svg-ant` detection. A second call binds a second click listener → one click creates two markers. Fix: delete template-side `init()`; mirror ms.html (no init call). Migrated to WORKFLOW.md Anti-Repeat this session.
- **"Same symptom ≠ same bug."** Double-marker + grey-bleed co-occurred on BURN and read as one bug — both involve markers. Root causes are independent: (a) duplicate init → double placeMarker; (b) get_episode_record cross-loading wrong form's record. Diagnose by which half: same-session duplicate-on-click = (a); markers from a different form = (b).
- **DESIGN_SYSTEM.md is now at 280 lines** (grew with +Note recipe). User confirmed "no ceiling concern" for this session. If another recipe is added, prune prose again first.

---

## What to skip for now

VESTIBULAR / PAEDIATRIC / LYMPHOEDEMA / GENERAL. Don't start Plan B without reading the plan doc fresh. See BACKLOG.md for full deferred list.
