# WORKFLOW.md — Procedures

## Adding a new form — Full Checklist

1. Add entry to `FORM_REGISTRY` in `app.py`, set `ready=True`
1.5 Update `home.html` episode modal card for this form: remove `soon` class, remove "Soon" badge, add `onclick="selectForm(this)"`, update icon. Add to formLabel map and icon map in home.html. **The modal is HARDCODED — FORM_REGISTRY does NOT drive it. This step is mandatory.**
2. Add form to `FORM_TEMPLATES` dict in `app.py` (one line — generic route handles the rest), e.g. `'HAND': 'forms/hand.html'`
2.5 **Before writing form HTML:** read `DESIGN_SYSTEM.md` and `templates/forms/ms.html`. Mirror layout primitives (`.card` wrappers, sidebar_nav block, `.fg` grid, derived-badge chips). Adapt section structure to clinical domain — section count and labels may differ, layout primitives may not.
3. Create `templates/forms/xxx.html` extending `base.html`:
   - Only needs: form HTML sections + `extra_js` block with form-specific init
   - NO boilerplate needed — `initFormContext()` handles patient prefill, nav buttons, auto-load
   - Before using any custom CSS class (chips, sliders, badges): grep for it in `style.css` first
4. Create `static/js/form_xxx.js`:
   - `window.ActiveForm = { collect, populate, reset, ... }`
   - `window.Form = { collect, populate, reset, onPtTypeChange, onNricInput, onDobChange }` (window.Form is REQUIRED — missing it crashes main.js init)
   - `collect()` MUST return BOTH: `_form_type: 'XXX'` AND `meta: { form: 'XXX' }`
     `_form_type` → PDF routing; `meta.form` → `validate_record()` in database.py
     Missing either = silent wrong PDF or 422 on every save.
4.5 Add form's required fields to `REQUIRED_FIELDS` dict in `database.py`. DO NOT skip this. A form without REQUIRED_FIELDS entries saves silently with empty data.
5. Create `pdf_xxx.py` with `generate_episode_pdf()` and `generate_xxx_pdf()`
6. Add to `_PDF_GENERATORS` and `_SINGLE_PDF_GENERATORS` in `app.py`
7. Add `pdf_xxx.py` to `pt_assessment.spec` under `datas` (DO NOT FORGET — silent failure)
8. Add MPIS builder in `main.js` and wire into `copyToMpisAuto()` switch block (see MPIS pattern below). Do NOT add a per-form public wrapper — `copyToMpisAuto()` is the single entry point.
9. Add clinical templates to `clinical_templates.js` (assessment categories + SOAP variant)
10. Add SOAP key to `tplMap` in `showSoapTemplate()` in `episode.html`
11. Run `node --check static/js/form_xxx.js` before packaging
12. After any large str_replace: grep for the function name, read the entire function. Confirm no orphaned code below the return statement.
13. Recompile with `build.bat`

---

## initFormContext() — central boilerplate engine

Lives in `main.js`. Runs automatically after every form loads (via setTimeout in init()). Reads from base.html meta tags set by Jinja:
```
<meta id="page-context" data-episode-id="..." data-patient-id="...">
<script id="patient-json" type="application/json">...</script>
```

Handles for ALL forms automatically:
1. Patient prefill — fills all pt fields from patient JSON
2. Episode collect wrapper — injects episode_id into collected data
3. Auto-load — fetches existing assessment record for episode on page open
4. Nav buttons — injects Return and Save & Return when episode/patient context present

New forms need ZERO boilerplate. Just write form HTML + form_xxx.js.

---

## MPIS Pattern (builder/wrapper/finalizer)

Refactored 2026-05-01. Strict three-part split:

**A. Builder (private, sync)** — returns parts array, ZERO copyText calls inside:
```js
function _buildMpisXxx() {
  var parts = []; var LN = MPIS_LN; var DIV = MPIS_DIV; var dash = MPIS_DASH;
  function sec(title, val) { mpisSec(parts, title, val); }
  // ... fill parts ...
  return parts;
}
```

**B. Wire into `copyToMpisAuto()`** switch block (formType === 'XXX' branch).

> ⚠ Do NOT create a per-form public wrapper (`copyToMpisXxx`). The 7 original per-form wrappers were deleted 2026-05-19 as dead code — `copyToMpisAuto()` is the sole entry point. New forms need only Part A (builder) + Part B (wire into switch).

Rules:
- NEVER put `copyText()` or `await` inside a builder.
- NEVER call `showMpisHeaderModal()` inside a builder — that's the wrapper's job.
- `_doCopyMpis()` handles all copying. One call only, inside _doCopyMpis.

Shared constants: `MPIS_LN`, `MPIS_DIV`, `MPIS_DASH`. Never redeclare locally.

POMR format: TARIKH / NOMBOR GILIRAN / KPI-SS-30 MINIT / DILIHAT / [content] / TEMUJANJI.

XSS: user-supplied strings injected into innerHTML must go through `escapeHtml()` — patient names, dates, form types.

---

## PDF Generation Rules

- Each form type has its own standalone PDF generator
- LungDiagramFlowable uses clipPath — always saveState()/restoreState() per lung
- Match KKM borang ref number exactly per form
- Every `box()` call inside two-column layout MUST pass explicit width
- ReportLab clipPath is cumulative — second lung must saveState before clipPath call
- `two_col()` returns a single Table (not a list) — use `story.append()`, NOT `story +=`
- `body_chart_section()` returns a single Table — use `items.append()`, NOT `items +=`
- Nested tables inside `ruled_section()` cells: use `INN = column_width - 8*mm` for colWidths (padding eats space)
- NEURO layout: 2-column throughout, multiple short blocks (not one giant block). Each block under ~250mm or ReportLab throws "too large".
- ALWAYS use `sign_chop_block()` from `pdf_platypus_base` for sign & chop footer. Do NOT inline custom sign/chop code.
- `patient` and `body_chart` from DB records may be JSON strings (not dicts). Always use `_ensure_dict()` or `json.loads()` before `.get()` on them.

---

## JS Rules (CRITICAL)

- `window.FormBase` must be exposed before any inline HTML handler calls it
- All inline HTML handlers must use `window.FormBase.xxx` not `FormBase.xxx` (const is block-scoped, unreliable from HTML attributes)
- Never write literal newlines in JS strings via Python — silent browser SyntaxError
- Always syntax-check new JS: `node --check file.js` before packaging
- `onPtTypeChange` uses null-guarded `set()` — never direct `getElementById` without null check
- `form_xxx.js` MUST export `window.Form` (not just `window.ActiveForm`)
- BodyChart API: `BodyChart.getData()` to collect markers, `BodyChart.loadData(arr)` to populate, `BodyChart.clearAll()` to reset. There is NO `BodyChart.collect()` or `BodyChart.populate()`. Store as `bodyChart: { markers: [...], notes: str }` (camelCase).
- `clinical_templates.js` must be a clean IIFE — orphaned code outside functions breaks the entire module silently
- HAND_SOAP must live in `TEMPLATES` (const at top of IIFE), not in `templates` (flat dict). SOAP template dicts stored in `templates` silently fail `.length` check in `show()`. Assessment templates (arrays) live in `templates` correctly — only SOAP dicts go into `TEMPLATES`.

---

## Code Editing Discipline

- Read the file before editing. Always.
- After a str_replace, re-read the affected area before making another edit to the same file. Previous view output becomes stale after any successful edit.
- When rewriting large blocks, check for orphaned code AFTER the replacement. Multiple str_replace passes on the same file accumulate stale sections.
- When in doubt about file state: view the file, grep for the pattern, then edit.
- Never assume a previous edit "got everything" — verify.
- After ANY str_replace > 5 lines: grep -n "def function_name" file and read the ENTIRE function. Look for unreachable code below return statements. **Non-negotiable.**

---

## Anti-Repeat Rules

Things relearned the hard way. Do not let happen again:

- `fetchone()` with no `ORDER BY` on any query that expects 0-1 rows is a latent bug. Always add `ORDER BY + LIMIT 1`.
- When adding a new form type anywhere, check ALL four registries: FORM_REGISTRY, _PDF_GENERATORS, _SINGLE_PDF_GENERATORS, REQUIRED_FIELDS. Missing one = silent failure.
- Copy-paste route handlers are a code smell. 5th copy = write a generic handler instead.
- `sqlite3.OperationalError`, not bare `Exception`, for migration try/except blocks.
- When replacing a `__import__()` hack with a direct call, ADD the symbol to module-level imports first. The hack worked precisely because it bypassed imports. Replacing without updating imports = NameError at runtime.
- When flipping FORM_REGISTRY ready=True, ALSO update home.html episode modal card. Modal is hardcoded, not driven by FORM_REGISTRY.
- Before using a custom CSS class in a new form, grep for it in style.css. Chip groups, sliders, custom badges look like they work in HTML but are invisible/unstyled until the CSS class exists.
- When adding clinical templates for a new form, register them under `templates['FORM_TYPE']` (single array), NOT compound keys like `templates['FORM_TYPE_OBS']`. `show()` in `clinical_templates.js` only looks up `templates[formType]` — compound keys silently fall through to `[]` and buttons do nothing. If compound keys must be used, extend `show()` to try `templates[formType + '_' + category.toUpperCase()]` as a fallback.
- When adding a new field to `form_X.js collect()`, verify corresponding render blocks exist in BOTH `pdf_X.py` AND `_buildMpisX()` in `main.js`. Silent data loss occurs when collect() captures data that no downstream render touches. `neuro.muscles` (MMT) was collected by `form_hand.js` for the entire HAND form history and silently dropped — caught in PDF Session C, caught in MPIS Session D. Cross-reference all three: collect → PDF → MPIS.
- Clinical template arrays must contain discrete SMART statements (one statement per array entry, each Specific/Measurable/Achievable/Realistic/Time-bound). Do not copy vague category headers from source KKM documents — author proper SMART statements for the app.

---

## Debugging

- **Flask errors live in the TERMINAL, not the browser console.** Set `debug=True` for in-browser tracebacks.
- For runtime bugs: YOU (Miruya) reproduce, copy the error from terminal/console, then prompt. Don't make Claude Code play detective.
- Stuck-in-creating bug in Claude Code: kill the session, do NOT `claude --resume`, start fresh.
- Compact between superpowers phases wipes skill orchestration state. Use `/clear` instead, or close session and start new.

---

## Build & Deploy

- Recompile via `build.bat` (PyInstaller spec is `pt_assessment.spec`).
- Test exe end-to-end after any structural change (new form, schema migration, MPIS refactor).
- Don't forget to add new pdf_xxx.py files to `pt_assessment.spec` under `datas`.

---

## seed_db.py

- `python seed_db.py` — adds missing patients, skips by IC if already in DB. Safe to re-run.
- `python seed_db.py --reset` — wipes the 10 seeded patients (by IC match) and re-inserts fresh.
- DB path: `pt_data/records.db` relative to script. Same path app.py uses via `data_path()`.

---

## SOAP Templates Per Form

`tplMap` in `showSoapTemplate()` in episode.html routes form-type to SOAP template key.

Naming: `SOAP_MS`, `SOAP_SPINE`, etc. Stored in `TEMPLATES` const at top of clinical_templates.js IIFE (not in flat `templates` dict — that's for assessment template arrays only).

---

## Clinical Reference

**Malaysian NRIC logic:**
- Format: YYMMDD-PB-XXXG
- G odd = male, even = female
- DOB century: 00-29 = 2000s, 30-99 = 1900s

**KKM Form References (preserve exactly in PDF headers):**
- HAND: `fisio / b.pen. 12 / Pind. 2 / 2019`
- See respective `pdf_<form>.py` for each form's ref string.

**Lung Diagram (CR):** radiological convention — patient RIGHT on viewer's LEFT, labelled R.

**Session header fields** (Nombor Giliran, KPI-SS-30 min, Dilihat, Temujanji) live in episode.html SOAP modal — shared across ALL forms. Do NOT add to individual forms. DB columns: `queue_no`, `kpi_30min`, `seen_by`, `next_appt`, `next_appt_time` in `soap_notes`.

**MPIS output for SOAP notes** follows POMR format (Malay headers), not assessment format.
