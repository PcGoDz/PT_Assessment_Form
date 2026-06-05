# CC BLUEPRINT — SCI Assessment Form (Milestone 1: FORM + SAVE)

Paste this into Claude Code. Read the bibles first (CLAUDE.md → RULES.md → WORKFLOW.md → DESIGN_SYSTEM.md), then `SCI_DESIGN_DECISIONS.md` (the locked spec), then this prompt. Plan before touching code.

---

## MISSION

Add the **SCI (Spinal Cord Injury)** form to the PT Assessment app — Neurological group. This pass is the **FORM milestone only**: the form must render, accept input across all sections, save to the DB, and round-trip on reload. **PDF export and MPIS are explicitly OUT OF SCOPE for this pass** (later milestones).

The clinical/structural spec is fully locked in `SCI_DESIGN_DECISIONS.md` — there are **no open clinical questions**. Do not re-derive any clinical decision; transcribe from the spec. If you think a clinical call is missing, STOP and ask — do not invent one.

---

## SCOPE FENCE (read carefully)

**IN scope (this pass):**
- New shared component `static/js/assessment_grid.js` (the fixed-row grid engine — see below)
- `templates/forms/sci.html`
- `static/js/form_sci.js`
- `FORM_REGISTRY` + `FORM_TEMPLATES` entries in `app.py`
- Both hardcoded form pickers + all formLabel/icon maps (the activation-drift hazard below)
- `REQUIRED_FIELDS` entry in `database.py`
- `node --check` on both new JS files

**OUT of scope (later milestones — do NOT build):**
- `pdf_sci.py`, `_PDF_GENERATORS`/`_SINGLE_PDF_GENERATORS`, `pt_assessment.spec` datas → milestone 3
- MPIS builder (`_buildMpisSci`) + `copyToMpisAuto()` wiring → milestone 5
- Clinical templates (`clinical_templates.js` SCI arrays) + `ClinicalTemplates.addButton()` wiring → later. **Do NOT wire template buttons this pass** — without a `TEMPLATES.SCI` array they silently no-op. Leave the textareas plain.
- SOAP key in `episode.html tplMap` → later

Checklist steps in play this pass: **1, 1.5, 1.6, 2, 2.5, 3, 4, 4.5, 11, 12, 13.** Steps 5–10 are deferred.

> Note: "Fix A" (PDF-registry fold) is a **separate banked task** and serves the milestone-3 PDF wiring. It is NOT a dependency of this form pass — the form milestone never touches PDF code. Run Fix A on its own per the handover order.

---

## PROCESS DISCIPLINE (non-negotiable)

1. **Fresh FF worktree off `main`.** STOP if `main` has moved unexpectedly since the bible read-in — report and wait.
2. **Plan first (Superpowers `/execute`).** Write a spec + implementation plan. **Wait for approval before writing code.** If the plan looks too large for one clean pass, the natural fracture line is: **Phase A** = `assessment_grid.js` + standalone smoke test, **Phase B** = the SCI form built on it. Propose the split in your plan if warranted.
3. **Smoke-test on the WORKTREE before merging to main.** Run Flask from the worktree folder, not main. Merge only after the smoke test passes. Never invert this.
4. **Checkpoint before edit:** read the target file/region, summarize what you'll change, then edit. After any `str_replace` > 5 lines: re-read, then `grep` the function name and read the whole function — confirm no orphaned code below the `return`.
5. Do not force-delete branches. Do not commit code and wind-down docs in separate passes that leave docs uncommitted.

---

## PART A — `assessment_grid.js` (build and smoke-test this FIRST, standalone)

A new, **standalone** vanilla-JS component. **Do NOT modify `mmt_table.js`, `movement_table.js`, `inv_med_table.js`, or any shared module** — they belong to other forms; leave them untouched. Model the *mechanics* on `mmt_table.js` (the `data-field`/`data-rid` render-from-array + `syncFromDOM` idiom) but build fresh.

**Critical structural difference from `mmt_table.js`:** that component is a **singleton** (module-level `_rows`). The SCI page hosts **multiple grids at once** (sensory, MMT, upright, proprioception, 5 functional sub-blocks). So `assessment_grid.js` must be a **factory** — `AssessmentGrid.create(config)` returns an **instance** whose state is closed over per-container. No shared module-level row state. Plain factory + closures — no class inheritance.

**Config shape (each instance):**
- `containerId` — the `<tbody>` (or container) it renders into
- `rows` — ordered list of row labels (fixed; never add/delete rows)
- `columns` — ordered list of `{ id, label, type, options }` where `type` is `'dropdown'` or `'text'`; `options` is the dropdown option array (omit for text)
- `greyout` — optional list of `[rowLabel, columnId]` pairs that are **non-cells**: render nothing (no input, disabled/blank cell), never collected

**Instance API:** `getData()`, `loadData(rows)`, `clear()`, `stampBlanks(value, opts)`.

**Cell-state rules (the spine of the whole form — get this exactly right):**
- Four distinct states must survive collect→reload: **blank** (`''`), **NT**, **N/A**, **real value**. A blank is `''` — NOT the same as a greyed non-cell.
- `getData()` returns an array of row objects: `{ label, <colId>: value, ... }` — **every fillable cell present** (blank cells included as `''`). **Greyed cells: key entirely ABSENT** (not `''`). This is the encoding the later PDF uses to tell blank (`''` → "—") from greyed (absent → shaded/skipped). Do NOT filter empty rows or cells (the bug in `mmt_table.js getData()` — do not copy it).
- `stampBlanks(value, opts)` — fills only currently-blank cells with `value`; **never overwrites a real value**; with `opts.skipGreyed` (always true here) **skips greyed non-cells**; `opts.dropdownsOnly` limits to dropdown columns (so a text PROM column isn't stamped). Stamped values must be valid dropdown options so they round-trip.

**Standalone smoke test before wiring anything:** render a throwaway config with one greyed cell, confirm: greyed cell renders empty/disabled, `stampBlanks('NT', {skipGreyed:true})` fills blanks but skips the greyed cell and doesn't touch a pre-filled cell, `getData()` returns the greyed key absent and blanks as `''`, `loadData(getData())` round-trips. `node --check assessment_grid.js`.

---

## PART B — the SCI form

### Section order (clinical flow; numbered `.sec-num`, one sidebar nav entry each)
Follow DESIGN_SYSTEM.md primitives (`.card` > `.card-header` (`.sec-num`+`<h2>`) > `.card-body`, `.fg`/`.fg.c2`, `.field`, derived-badge). Mirror `templates/forms/ms.html` and `neuro.html`. Grep `style.css` for any chip/badge/slider class before using it.

1. **Diagnosis & Management** — Doctor's Diagnosis, Doctor's Management (textareas) — copy NEURO pattern
2. **Problem** — textarea
3. **Special Questions** — Date of Surgery, Occupation, Investigation
4. **History** — Current History, Past History (textareas)
5. **Sensory Evaluation** — GRID (see configs)
6. **Musculoskeletal Evaluation (MMT)** — GRID (widest; grey-out map)
7. **Upright Control (Incomplete)** — GRID + block "Mark block N/A" stamp
8. **Proprioception** — GRID
9. **Functional Evaluation** — 5 sub-blocks, each its own grid + collapsible `+Note`
10. **Respiratory Evaluation** — built fresh (see below)
11. **Pain Score** — existing VAS, Pre + Post (lift whole, as MS/NEURO)
12. **Assistive Aids** — Wheelchair (multi), Cushion (multi), Orthosis (text)
13. **Outcome Measures** — 3 labelled inputs
14. **Skin Integrity** — textarea
15. **Home Environment** — textarea
16. **Physiotherapist Impression / STG / LTG / Plan of Treatment** — textareas (copy NEURO; NO template buttons this pass)

Patient-identity header comes free from `initFormContext()` — write ZERO patient-field boilerplate.

### Grid configs (exact)

**Option sets (verbatim):**
- Sensory / Proprioception dropdown: `N`, `I`, `A`, `NT`
- MMT dropdown (all 12 grades — keep the minus/plus): `0, 1, 2-, 2, 2+, 3-, 3, 3+, 4-, 4, 4+, 5` — **PLUS a trailing `NT` option** (system state, NOT a grade; required so the NT stamp round-trips on reload). Rendered options array = the 12 grades + `NT`.
- MAS dropdown: `0, 1, 1+, 2, 3, 4` — **PLUS a trailing `NT` option** (system state; required for NT-stamp round-trip). Rendered options array = the 6 values + `NT`.
- PROM column: **text** (freeform, blank by default — not a dropdown)
- Upright Control dropdown: `G`, `F`, `P`, `N/A` — **`N/A` is a real selectable option** (normally set via the block stamp, but it MUST live in the options array or the stamped value cannot round-trip). Do NOT treat N/A as something the stamp conjures outside the option set.
- Functional A/C/D/E dropdown: `U`, `A`, `S`, `I`, `NT`
- Functional B (Balance) dropdown: `G`, `F`, `P`, `NT`

**Sensory** — 28 rows (`C2, C3, C4, C5, C6, C7, C8, T1…T12, L1…L5, S1…S4`), 4 dropdown columns: `Pin Prick L`, `Pin Prick R`, `Light Touch L`, `Light Touch R`. Whole-grid NT stamp button.

**MMT** — ~30 rows (joint × movement per spec), 6 columns: `MMT L` (dropdown, 12 grades + NT), `MMT R` (dropdown, 12 grades + NT), `PROM L` (text), `PROM R` (text), `MAS L` (dropdown, 6 + NT), `MAS R` (dropdown, 6 + NT). Whole-grid NT stamp (dropdowns only, skip greyed). **Grey-out map — transcribe EXACTLY, no guessing** (also in spec; reproduced here because it is the single highest-risk item):

| Joint   | Movement     | Greyed columns               |
|---------|--------------|------------------------------|
| NECK    | Flex         | MAS L, MAS R                 |
| NECK    | Ext          | MAS L, MAS R                 |
| SCAPULA | Elev         | PROM L, PROM R               |
| SCAPULA | Depression   | PROM L, PROM R               |
| SCAPULA | Protraction  | PROM L, PROM R               |
| SCAPULA | Retraction   | PROM L, PROM R               |
| ELBOW   | Ext          | PROM L, PROM R               |
| FINGER  | Ext          | PROM L, PROM R               |
| HIP     | Int. Rot     | MMT L, MMT R, MAS L, MAS R   |
| HIP     | Ext. Rot     | MMT L, MMT R, MAS L, MAS R   |
| KNEE    | Ext          | PROM L, PROM R               |
| ANKLE   | D.Flex       | PROM L, PROM R               |

Every row/column NOT listed = all six columns fillable.

This grid is the widest → wire the backlog `.mov-table-wrap { overflow-x: auto }` horizontal-scroll fix so it doesn't blow out the layout. (Fixed rows means no empty-state — the empty-state-colspan footgun does not apply here.)

**Upright Control** — rows `Hip, Knee, Ankle`; 4 dropdown columns `Flex L, Flex R, Ext L, Ext R` (options: `G, F, P, N/A`). Block-level **"Mark block N/A"** button → `stampBlanks('N/A', {skipGreyed:true})` on this instance only. (`N/A` must be in the options array — see Option sets — so stamped values re-display on reload.)

**Proprioception** — rows `Shoulder, Elbow, Wrist, Thumb, Hip, Knee, Ankle, Big Toe`; 2 dropdown columns `R`, `L` (N/I/A/NT). No stamp.

**Functional (5 sub-blocks, each a 1-column grid; DO NOT share one key):**
- A. Body Handling Skills (U/A/S/I/NT): Roll side to side, Come to sit, Shift, Raise (off pressure)
- B. Balance (**G/F/P**/NT): Static, Dynamic
- C. Transfer (U/A/S/I/NT): Bed, Chair, Floor, Car, Toilet/Commode Chair
- D. Wheelchair Mobility (U/A/S/I/NT): Level Propulsion, Ramp, Curbs, Rough Terrain, Wheelie
- E. Walking (U/A/S/I/NT): Sit to stand, Level, Rough Surface, Stairs
- Each sub-block has a **collapsed `+Note`** (textarea) that expands on tap. **Note saves + round-trips regardless of collapsed state; re-expands on reload if populated.** The `+Note` and stamp buttons are section-level wrappers in `form_sci.js`/HTML — NOT grid internals.

### Respiratory — build fresh (do NOT lift CR's big observation block)
Three small sub-blocks:
- **Breathing Pattern — multi-tick (checkboxes):** Usage of neck accessory muscle, Apical, Abdominal, Diaphragm (more than one may apply)
- **Cough — single-pick (radio):** Functional, Weak, Non-functional
- **Diaphragm Function — number inputs:** VC, PEFR

### Small fields
- **Assistive Aids:** Wheelchair multi-select (Standard / Light Weight / Power); Cushion multi-select (Jay / Air Filled / Foam); Orthosis = free text ("please state")
- **Outcome Measures:** 3 plain labelled inputs — `10 Meter Walk Test` (time), `SCIM` (score), `WISCI` (score). (SCIM kept deliberately though absent from the blank borang — see spec.)

---

## DATA CONTRACT (`collect()` — design once, now; PDF + MPIS read it later)

`window.Form.collect()` MUST return BOTH `_form_type: 'SCI'` AND `meta: { form: 'SCI' }`. Missing either = wrong PDF / 422 on save.

Capture **everything** in a flat, Python-friendly shape (later `pdf_sci.py` feeds `data_table(headers, rows, widths)` directly). Grids → arrays of row objects from `getData()` (greyed keys absent, blanks `''`). Suggested top-level keys: `patient`, `diagnosis`, `dr_management`, `problem`, `special_questions{date_surgery, occupation, investigation}`, `current_history`, `past_history`, `sensory[]`, `mmt[]`, `upright_control[]`, `proprioception[]`, `functional{body_handling[], balance[], transfer[], wheelchair[], walking[], notes{}}`, `respiratory{breathing_pattern[], cough, vc, pefr}`, `pain{pre, post}`, `assistive_aids{wheelchair[], cushion[], orthosis}`, `outcome_measures{tenmwt, scim, wisci}`, `skin_integrity`, `home_environment`, `pt_impression`, `stg`, `ltg`, `plan`.

`window.Form` must expose `collect, populate, reset, onPtTypeChange, onNricInput, onDobChange` (the last three delegate to `FormBase`). Missing `window.Form` crashes `main.js` init. Inline HTML handlers call `window.FormBase.xxx` (not bare `FormBase.xxx`).

---

## ACTIVATION-DRIFT HAZARD (this is where new forms break — do ALL of it)

`FORM_REGISTRY` does **not** drive the pickers or the label/icon maps. These are independently hardcoded across multiple sites. Miss one → form doesn't appear, or its card shows raw `SCI`.

- **Pickers (2, independent):** `home.html` episode modal card (`onclick="selectForm(this)"`) AND `patient.html` new-episode card (`onclick="selectEpForm(this)"` — different handler). Remove `soon` class + "Soon" badge, set icon, on both.
- **formLabel maps (5 sites):** `episode.html` (×2 object literals), `home.html` (`FORM_LABELS` const + inline `formLabel` ~1922), `patient.html` (Jinja `form_labels` ~475). Add the SCI key to EVERY hit. **Display label is PINNED: `Spinal Cord Injury`** (exact string, Title Case — matches the spelled-out style of sibling labels like `'Musculoskeletal'`/`'Cardiorespiratory'`; do not use the raw code `SCI` or the legacy borang wording "Spinal Injury"). Match the exact quoting/formatting of the sibling entries you find at each site. Update parallel icon maps at the same sites.
- **Verify:** `grep -rn "MS:'Musculoskeletal'\|'MS':'Musculoskeletal'" templates/` — add the SCI key to every location returned.
- `FORM_REGISTRY` ready=True + `FORM_TEMPLATES` `'SCI': 'forms/sci.html'` in `app.py`.
- `REQUIRED_FIELDS['SCI']` in `database.py` (don't skip — missing = silent save with empty data).

---

## GUARDRAILS (verbatim into your plan)

1. **Sensory is a TABLE, not `bodychart.js`.** Highest-risk autopilot error. Do not reach for `bodychart.js` / any marker canvas. Do not add a `bodychart.js` script tag (it's global; re-including throws a redeclare SyntaxError).
2. **Grey-out map transcribed exactly** from the table above / spec. No re-derivation.
3. **Stamp buttons non-destructive** (fill blanks only) and **skip greyed cells**. Every stamped value MUST exist as a selectable option in its target dropdown or it cannot round-trip: `NT` in sensory/proprioception (already present), `NT` in MMT + MAS (appended — see Option sets), `N/A` in Upright Control (appended). A stamp that writes a value the `<select>` has no option for = silent data loss on reload (cell falls back to the first option).
4. **Collapsed `+Note` still saves + round-trips**, re-expands on reload if populated.
5. **Functional: each sub-block its own key.** Balance = G/F/P; the rest = U/A/S/I. All get NT.
6. **Four cell states distinct in data:** blank (`''`) / NT / N/A / real. Greyed = key absent, not a state.
7. `window.Form` contract + `_form_type` + `meta.form` + `REQUIRED_FIELDS`.
8. **Greyed MMT cells are non-cells:** render nothing, emit no key, NT stamp skips them.
9. **Do NOT modify shared modules** (`mmt_table.js`, `movement_table.js`, `form_base.js`, `bodychart.js`, etc.). Build `assessment_grid.js` new. Ship-crude — no refactors, no abstractions beyond the one grid factory.

---

## REFERENCE FILES (read before building)
- Spec: `SCI_DESIGN_DECISIONS.md` (locked source of truth)
- Visual canon: `templates/forms/ms.html`; assembly donor: `templates/forms/neuro.html` + `static/js/form_neuro.js`
- Grid mechanic to model on (do NOT edit): `static/js/mmt_table.js`
- Patient contract: `static/js/form_base.js`
- `DESIGN_SYSTEM.md`, `WORKFLOW.md` (13-step checklist, JS rules)
- Blank borang + Best Statement (the two SCI PDFs) for field cross-check

---

## DONE = SMOKE TEST PASSES (on the worktree, before merge)
- SCI appears in BOTH pickers; card shows "Spinal Cord Injury", not raw `SCI`
- Form loads via picker with no console error; `initFormContext` prefills patient
- All 9 section grids render with correct rows, columns, and greyed cells (MMT shows the grey map exactly)
- Whole-grid NT stamp fills blanks, skips greyed, leaves real values; Upright "Mark block N/A" works
- Functional `+Note` collapses/expands; note persists
- Fill a realistic spread (some real, some NT, some N/A, some blank, some greyed) → Save → reload → **all four states round-trip intact**, greyed cells stay non-cells
- `node --check static/js/assessment_grid.js` and `static/js/form_sci.js` both clean
- No orphaned code below any `return` (grep + read each edited function)
- `build.bat` recompiles clean (uses `py` launcher) — exe smoke optional this pass, but the change must build
