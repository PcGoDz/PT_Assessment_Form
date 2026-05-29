# HANDOVER.md — Current Session State

Last updated: 2026-05-29

---

## Where we left off

Session H. BURN form Pass 1 executed and shipped.

**BURN Pass 1 (SHIPPED):** Executed via superpowers:subagent-driven-development (7 tasks, 10 commits). Full browser smoke test passed (10/10 checks green). Merged to main, pushed to origin. `FORM_REGISTRY BURN ready=True`. Form is live.

What was built:
- `templates/forms/burn.html` — 19 sections, 19-item sidebar nav, body chart with burn-depth chips (remapping existing bodychart.js ptype keys), respiratory assessment with BurnForm.onToggle toggles, chest expansion (CR pattern), auscultation + lung picker modal, BurnMov mini-table shell
- `static/js/form_burn.js` — BurnMov IIFE (3-col ROM: Joint/Active/Passive, "Other (specify)" joint with free-text input and proper round-trip save/reload), FormBurn IIFE (collect/populate/reset + FormBase delegates)
- `app.py` — FORM_REGISTRY `ready=True` + FORM_TEMPLATES entry
- `database.py` — REQUIRED_FIELDS entry
- `templates/home.html` — BURN card activated (`selectForm` handler, formLabel entry)
- `templates/patient.html` — BURN card activated (`selectEpForm` handler)
- `static/js/clinical_templates.js` — `TEMPLATES.BURN` assessment arrays + `TEMPLATES.BURN_SOAP` dict
- `templates/episode.html` — `'BURN': 'BURN_SOAP'` tplMap entry

Bugs found and fixed during smoke test (all in-session):
- `patient.html` BURN card still greyed/Soon — task 2 only covered home.html; patient.html is standalone with its own `selectEpForm` picker (separate commit `ecd50ce`)
- `bodychart.js` double-load SyntaxError — burn.html `extra_js` re-loaded bodychart.js which base.html already loads globally; removed script tag + init call to match ms.html pattern (commit `ff586f4`)
- Sputum colour options lacked "no secretions" — added "None / no secretions observed" to colour, "None" to amount and consistency (commit `623c22f`)

---

## Half-done

- **DESIGN_SYSTEM.md over 250-line ceiling** — still ~312 lines. Needs splitting into `DESIGN_SYSTEM-form-html.md` + `DESIGN_SYSTEM-pdf.md`. `.neuro-grid` / `.neuro-grid.cols-3` component recipes still missing. Flagged since Session C — now Session H, still unfixed.
- **BURN PDF deferred.** `pdf_burn.py` not written. Export KKM PDF falls back to MS generator for BURN records. Pass 2 needed.
- **BURN MPIS deferred.** `_buildMpisBurn()` not written. Pass 3 scope.

---

## Next session priorities

1. **BURN Pass 2** — `pdf_burn.py`. KKM ref `fisio / b.pen. 5 / Pind. 2 / 2019`. Scope: realistic-data PDF renders cleanly; sparse-data PDF skips empty tables. Wire into `_PDF_GENERATORS` + `_SINGLE_PDF_GENERATORS`. Add to `pt_assessment.spec`.
2. **DESIGN_SYSTEM.md split** — over ceiling every session, deferred since Session C. Split into form-html + pdf halves.
3. **patient-page-direct branch investigation** — no common ancestor with main. Cherry-pick unique work or force-delete.

---

## Gotchas discovered this session

- **`bodychart.js` is loaded globally by `base.html`.** Do NOT add `<script src="...bodychart.js">` inside any form's `{% block extra_js %}`. Doing so causes a SyntaxError on first load (`const COLORS` redeclared inside the re-executing IIFE). Pattern: call `BodyChart.init()` in DOMContentLoaded, do NOT include the script tag. ms.html is the reference.
- **`patient.html` form picker is standalone — uses `selectEpForm(this)`, not `selectForm(this)`.** When activating a new form, BOTH home.html AND patient.html picker grids must be updated. The two pickers are independently hardcoded. FORM_REGISTRY drives neither. Step 1.5 in WORKFLOW.md now covers both.
- **`clinical_templates.js` `const TEMPLATES` holds BOTH assessment arrays AND SOAP dicts.** The flat `templates` dict (lowercase) is not used for lookups. `show()` does `(TEMPLATES[formType] || {})[category]`. Nesting: `TEMPLATES.BURN = { impression: [...], stg: [...], ltg: [...], treatment: [...] }` for assessment; `TEMPLATES.BURN_SOAP = { subjective: [...], ... }` for SOAP. WORKFLOW.md JS Rules had an inaccurate note claiming assessment arrays live in `templates` — corrected this session.

---

## What to skip for now

- BURN PDF (`pdf_burn.py`) — Pass 2. Export falls back to MS until then.
- BURN MPIS (`_buildMpisBurn`) — Pass 3.
- DESIGN_SYSTEM.md split — deferred again, but do it next session.
- ROM Overpressure data shape fix — needs clinical decision (pre-existing backlog item).
- MS-as-MPIS-canon SOAPIER refactor — parked until HAND has clinical use time.
