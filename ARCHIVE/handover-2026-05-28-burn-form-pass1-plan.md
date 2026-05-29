# HANDOVER.md — Current Session State

Last updated: 2026-05-28

---

## Where we left off

Session G. Two work streams — one landed on disk, one is planned only.

**build.bat / v0.5.1 (SHIPPED):** Windows 11 build 26200's App Execution Alias stub was intercepting bare `python` calls in build.bat, producing a false "Python not found" error even with Python 3.14.3 installed. Fixed by switching build.bat to use the `py` launcher (`py`, `py -m pip`, `py -m PyInstaller`). Rebuilt successfully, smoke-tested exe with seed DB. Cut v0.5.1 pre-release on GitHub (PcGoDz/PT_Assessment_Form), tag at commit 09f80b1, 22.5 MB exe with sha256 asset. Clears the long-deferred exe build test backlog item.

**BURN form scoping + Pass 1 plan (PLANNED ONLY — NOT BUILT):** Authored BURN_FORM_SPEC.md and ran superpowers writing-plans to produce `docs/superpowers/plans/2026-05-28-burn-form-pass-1.md` (7 tasks, 40 steps). No BURN code written. `FORM_REGISTRY BURN ready=False`. The form does not exist yet.

---

## Half-done

- **DESIGN_SYSTEM.md over 250-line ceiling** — still ~312 lines. Needs splitting into `DESIGN_SYSTEM-form-html.md` + `DESIGN_SYSTEM-pdf.md`. `.neuro-grid` / `.neuro-grid.cols-3` component recipes still missing (only in CSS class index). Flagged since Session C.
- **BURN Pass 1 plan written, not executed.** Plan at `docs/superpowers/plans/2026-05-28-burn-form-pass-1.md`. Zero code on disk.

---

## Next session priorities

1. **Execute BURN Pass 1** via the saved plan — subagent-driven pathway (superpowers:subagent-driven-development). Plan is ready at `docs/superpowers/plans/2026-05-28-burn-form-pass-1.md`. 7 tasks: app/DB wiring → home.html activation → burn.html sections 01–09 → burn.html sections 10–19 → form_burn.js → clinical templates → smoke test.
2. **DESIGN_SYSTEM.md split** — still over ceiling, flagged every session. Do it.
3. **patient-page-direct branch investigation** — shares no common ancestor with main. Cherry-pick any unique work or force-delete.

---

## Gotchas discovered this session

- **Windows App Execution Alias stub.** Windows 11 (recent builds) installs a fake `python.exe` at `%LOCALAPPDATA%\Microsoft\WindowsApps\python.exe` that opens the Store instead of running Python. build.bat using bare `python` silently fails. Fix: always use `py` launcher in Windows build scripts. Documented in WORKFLOW.md Build & Deploy section.
- **bodychart.js COLORS hardcoded.** The COLORS dict in bodychart.js is keyed on exactly 6 ptype strings (ache/sharp/numb/burn/refer/tender). Unknown ptype values fall back to `#888` grey on loadData. Cannot pass semantic burn-depth type names without modifying shared code. BURN form works around this by remapping existing keys to burn-depth labels (no new CSS, no shared code change).
- **MovementTable is 9-col only.** MovementTable shared IIFE always renders 9 columns (Joint/Side/Plane/ActiveROM/ActivePain/PassiveROM/PassivePain/Resisted/Delete). BURN's 3-col ROM table (Joint/Active/Passive) requires a separate `BurnMov` private mini-table in form_burn.js — not a MovementTable reuse.

---

## What to skip for now

- BURN PDF (pdf_burn.py) + MPIS builder (_buildMpisBurn) — deliberately deferred to separate later passes. Pass 1 is form-and-save only; Export KKM PDF will fall back to MS for now.
- MS-as-MPIS-canon SOAPIER refactor — parked until HAND has clinical use time.
- ROM Overpressure data shape fix — needs clinical decision.
