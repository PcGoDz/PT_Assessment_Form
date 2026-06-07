# HANDOVER.md — Archive (SCI Milestone-1 wind-down)

Last updated: 2026-06-05

---

## Where we left off

SCI Milestone-1 shipped. Form HTML, form_sci.js, assessment_grid.js factory all landed.
Merged to main. Worktree cleaned.

**SCI ready=True in FORM_REGISTRY** — home.html + patient.html pickers updated, label/icon maps
updated across all 5 sites. SCI uses `AssessmentGrid.create()` factory for 9 grid instances
(Sensory, MMT ×2 body regions, Upright Control, Proprioception, Functional ×5 modes).

**assessment_grid.js** — new fixed-row grid factory. Config: `{ containerId, rows, columns, greyout }`.
Four cell states: blank / NT / N-A / real value. Greyed cells have key ABSENT in getData()
(not ''). Stamp non-destructive. Multi-instance safe (module-scoped state map). Smoke-tested
standalone before SCI wired it.

---

## Half-done / Known gaps

- **SCI section order** — clinical review by Miruya flagged the current order is not SOAPIER.
  Reorder deferred to Milestone-2 polish.
- **Clear button bug** — on all 9 ready forms, hitting Clear wipes patient identity fields along
  with clinical data. Scope: app-wide (all form_*.js). Fix deferred to Milestone-2.
- **Stamp button styling** — NT stamp + "Mark block N/A" ghost placeholder need cosmetic polish.
  Deferred.

---

## Next session priorities (as of 2026-06-05)

1. SCI Milestone-2 polish: section reorder (SOAPIER) + Clear button fix (all 9 ready forms)
2. SCI Milestone-3: pdf_sci.py + pt_assessment.spec entry
3. Fix B: DB migration versioning (PRAGMA user_version in database.py)
4. SCI clinical templates (blocked on KKM Best Statement SCI doc from Miruya)

---

## Gotchas discovered this session

- **neuro.html patient card is INCOMPLETE** — missing `id="pt-age"` and `id="sex-field"`.
  Always copy patient card from ms.html (lines 22-135). Logged in Anti-Repeat Rules.
- **assessment_grid.js must be loaded before form_sci.js** — script tag order matters.
- **SCI form has 9 grid instances** — gSensory, gMmt (upper/lower split), gUpright, gProp,
  gFuncBody, gFuncBalance, gFuncTransfer, gFuncWc, gFuncWalk.

---

## What to skip for now

PDF + MPIS for SCI. Fix B. SCI clinical templates. VESTIBULAR / FACIAL / remaining NO forms.
