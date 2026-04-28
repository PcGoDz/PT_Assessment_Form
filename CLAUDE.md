# CLAUDE.md — PT Assessment System Project Bible

Read this at the start of every session. It contains rules, decisions, lessons,
and context established during development. Keep it updated as things change.

---

## ⚠️ LAST SESSION: 2026-04-28 (NEURO Bug Fixes)

1. **Where we left off** — NEURO form bug fix session complete. 8 bugs found and resolved after first real-world test. Final fix: added `meta: { form: 'NEURO' }` to `form_neuro.js collect()` — this made the 422 save/PDF error disappear by letting `validate_record()` in database.py correctly identify the form type. All known bugs resolved. Exe build NOT yet tested.
2. **Do this first next session** — Git push (seriously). Then full exe build test (all 6 forms end-to-end). Then HAND form.
3. **Traps / gotchas** — Every form's `collect()` MUST return both `_form_type` AND `meta: { form: 'NEURO' }`. The PDF routing uses `_form_type`, the validator uses `meta.form`. Missing either one causes silent mismatch. Also: `resetPatient()` in `form_base.js` still has no null guard on `derived-dob`/`derived-gender` — will crash any future form that omits those elements.
4. **What's half-done** — Validation layer UI (REQUIRED_FIELDS errors exist in backend, not surfaced before save). Age auto-calculation still broken. Both deprioritised.
5. **What to skip for now** — audit_log ON DELETE CASCADE, UNIQUE constraint on records.episode_id, pt_assessment.spec redundant templates/pdf entry, ARIA/accessibility. All documented, none urgent.

---

## What This Project Is

A local offline web app for KKM Physiotherapy Department staff to fill in
standardised assessment forms digitally, replacing paper-based workflows.
Built with Flask + SQLite + vanilla JS. Packaged as a Windows .exe via PyInstaller.

User: Miruya — physiotherapist, KKM dept, ~12-21 patients/day.
Device: Dept PC (Windows). No internet dependency required.

---

## Current Architecture

```
app.py                  — Flask routes, PDF routing dispatch, FORM_REGISTRY (15 forms)
database.py             — All SQLite logic + validation
pdf_platypus_base.py    — Shared Platypus building blocks
pdf_ms.py               — MS PDF generator
pdf_spine.py            — Spine PDF generator
pdf_geriatric.py        — Geriatric PDF generator
pdf_cr.py               — CR PDF generator (LungDiagramFlowable with clipPath zone colouring)
pdf_amputation.py       — Amputation PDF generator
pdf_neuro.py            — Neurology PDF generator (2-page, ICF impression, MRMI, outcomes)
pdf_base.py             — Legacy canvas primitives (kept for BodyChartFlowable)
pdf_generator.py        — Legacy standalone (reference only, not used)

static/js/
  api.js                — All fetch calls to Flask
  bodychart.js          — Body chart SVG marker logic (IIFE)
  lungchart.js          — Lung auscultation diagram, 6 zones, radiological view
  form_base.js          — Shared patient fields, NRIC derive, age calc (window.FormBase)
  form_ms.js            — MS collect/populate/reset -> window.ActiveForm + window.Form
  form_spine.js         — Spine collect/populate/reset -> window.ActiveForm + window.Form
  form_geriatric.js     — Geriatric collect/populate/reset -> window.ActiveForm + window.Form
  form_cr.js            — CR collect/populate/reset -> window.ActiveForm + window.Form
  form_amputation.js    — Amputation collect/populate/reset -> window.ActiveForm + window.Form
  form_neuro.js         — Neuro collect/populate/reset -> window.ActiveForm + window.Form
  movement_table.js     — Dynamic ROM table (IIFE)
  clinical_templates.js — Best Statement templates (MS, SPINE, GERIATRIC, CR, AMPUTATION, NEURO + SOAP variants)
  main.js               — Init, autosave, MPIS copy, dark mode, initFormContext()

templates/
  base.html             — Shell: topbar, sidebar (dynamic FORM_REGISTRY), progress bar
  home.html             — Patient dashboard, search, episode list, edit patient modal
  episode.html          — Episode detail, SOAP timeline, export button
  forms/ms.html         — MS assessment form
  forms/spine.html      — Spine assessment form
  forms/geriatric.html  — Geriatric assessment form
  forms/cr.html         — CR assessment form (interactive lung diagram)
  forms/amputation.html — Amputation assessment form
  forms/neuro.html      — Neurology assessment form (11 sections, chip UI, MRMI, outcomes)
```

---

## Form Registry (SINGLE SOURCE OF TRUTH)

All 15 forms in FORM_REGISTRY list in app.py. Sidebar built dynamically from it.
To add a new form: set ready=True in its registry entry.

Groups: Musculoskeletal, Neurological, Cardiorespiratory, Rehabilitation

| Form        | Group             | Ready |
|-------------|-------------------|-------|
| MS          | Musculoskeletal   | YES   |
| SPINE       | Musculoskeletal   | YES   |
| HAND        | Musculoskeletal   | NO    |
| AMPUTATION  | Musculoskeletal   | YES   |
| BURN        | Musculoskeletal   | NO    |
| NEURO       | Neurological      | YES   |
| SCI         | Neurological      | NO    |
| VESTIBULAR  | Neurological      | NO    |
| FACIAL      | Neurological      | NO    |
| CR          | Cardiorespiratory | YES   |
| GERIATRIC   | Rehabilitation    | YES   |
| PAEDIATRIC  | Rehabilitation    | NO    |
| LYMPHOEDEMA | Rehabilitation    | NO    |
| NCD         | Rehabilitation    | NO    |
| GENERAL     | Rehabilitation    | NO    |

---

## PDF Routing (CRITICAL)

Two export routes in app.py:
- /api/episodes/<id>/pdf        — episode export (assessment + SOAPs). Uses _PDF_GENERATORS.
- /api/export/<record_id>/pdf   — single record export. Uses _SINGLE_PDF_GENERATORS.
  Priority: ?form_type= query param > _form_type in data > meta.form > MS fallback.

Both dicts must be updated when adding a new form:
  _PDF_GENERATORS        = { MS, SPINE, GERIATRIC, CR, AMPUTATION, NEURO }
  _SINGLE_PDF_GENERATORS = { MS, SPINE, GERIATRIC, CR, AMPUTATION, NEURO }

Export KKM PDF button passes getCurrentFormType() as ?form_type= so the correct
generator is always used regardless of what's stored in the record.
getCurrentFormType() checks d._form_type first (amputation/cr/etc), then d.meta.form
(MS/spine/etc), then falls back to MS. New forms must set _form_type in collect().

---

## Adding a New Form — Full Checklist

1.  Add entry to FORM_REGISTRY in app.py, set ready=True
1.5 Update home.html episode modal card for this form: remove `soon` class, remove "Soon" badge,
    add `onclick="selectForm(this)"`, update icon. Add to formLabel map and icon map in home.html.
    The modal is HARDCODED — FORM_REGISTRY does NOT drive it. This step is mandatory.
2.  Add form to FORM_TEMPLATES dict in app.py (one line — generic route handles the rest)
    e.g. 'HAND': 'forms/hand.html'
3.  Create templates/forms/xxx.html extending base.html
    - Only needs: form HTML sections + extra_js block with form-specific init
    - NO boilerplate needed — initFormContext() handles patient prefill, nav buttons, auto-load
    - Before using any custom CSS class (chips, sliders, badges): grep for it in style.css first
4.  Create static/js/form_xxx.js:
    - window.ActiveForm = { collect, populate, reset, ... }
    - window.Form = { collect, populate, reset, onPtTypeChange, onNricInput, onDobChange }
      (window.Form is REQUIRED — missing it crashes main.js init)
    - collect() MUST return BOTH: `_form_type: 'XXX'` AND `meta: { form: 'XXX' }`
      `_form_type` → PDF routing; `meta.form` → validate_record() in database.py
      Missing either = silent wrong PDF or 422 on every save.
4.5 Add form's required fields to REQUIRED_FIELDS dict in database.py.
    DO NOT skip this. A form without REQUIRED_FIELDS entries saves silently with empty data.
5.  Create pdf_xxx.py with generate_episode_pdf() and generate_xxx_pdf()
6.  Add to _PDF_GENERATORS and _SINGLE_PDF_GENERATORS in app.py
7.  Add pdf_xxx.py to pt_assessment.spec under datas (DO NOT FORGET — silent failure)
8.  Add MPIS formatter copyToMpisXxx() in main.js, wire into copyToMpisAuto()
    Use the shared helpers — do NOT redeclare locally:
      var LN   = MPIS_LN;   var DIV = MPIS_DIV;   var dash = MPIS_DASH;
      function sec(title, val) { mpisSec(parts, title, val); }
      await copyText(parts.join(LN));   // at the end, replaces try/catch clipboard block
    Pattern: declare LN/DIV/dash + sec() once at top of the function, use throughout.
9.  Add clinical templates to clinical_templates.js (assessment categories + SOAP variant)
10. Add SOAP key to tplMap in showSoapTemplate() in episode.html
11. Run: node --check static/js/form_xxx.js before packaging
12. After any large str_replace: grep for the function name, read the entire function.
    Confirm no orphaned code below the return statement.
13. Recompile with build.bat

---

## initFormContext() — The Central Boilerplate Engine (main.js)

Runs automatically after every form loads (via setTimeout in init()).
Reads from base.html meta tags set by Jinja:
  <meta id="page-context" data-episode-id="..." data-patient-id="...">
  <script id="patient-json" type="application/json">...</script>

Handles for ALL forms automatically:
1. Patient prefill — fills all pt fields from patient JSON
2. Episode collect wrapper — injects episode_id into collected data
3. Auto-load — fetches existing assessment record for episode on page open
4. Nav buttons — injects Return and Save & Return when episode/patient context present

New forms need ZERO boilerplate. Just write form HTML + form_xxx.js.

---

## window.Form — REQUIRED CONTRACT

Every form_xxx.js MUST expose window.Form with:
  window.Form = {
    collect, populate, reset,
    onPtTypeChange: FormBase.onPtTypeChange,
    onNricInput:    FormBase.onNricInput,
    onDobChange:    FormBase.onDobChange,
  };

Missing any of these crashes main.js init() silently.
onPtTypeChange in form_base.js uses null-guarded set() helper — safe for forms
that don't have all optional patient fields (country, sex, etc.).

---

## SOAP Templates Per Form

clinical_templates.js categories:
  MS_SOAP        — general MSK (analysis + plan)
  SPINE_SOAP     — centralisation, directional preference, neural mobilisation
  GERIATRIC_SOAP — Berg/TUG, functional mobility levels, falls risk, carer education
  CR_SOAP        — secretion clearance, SpO2, ventilator weaning, exercise tolerance
  AMPUTATION_SOAP — MRMI scoring template, residual limb, prosthetic progress
  NEURO_SOAP     — tone/spasticity, MRMI/Berg/TUG outcomes, gait observation, neuroplasticity

showSoapTemplate() in episode.html selects via tplMap based on episode.form_type.
When adding a new form: add its SOAP key to tplMap.

---

## Database Schema

  patients   — id, name, ic, passport, pt_type, dob, sex, country
  episodes   — id, patient_id, form_type, referral_date, status
               status: "active" or "discharged|Reason"
  records    — id, episode_id, form_type, patient_name, patient_rn, patient_date, data_json
  soap_notes — id, episode_id, session_no, note_date, subjective, objective, analysis, plan
  audit_log  — id, record_id, action, changed_at, data_json

JSON blob is source of truth. SQLite columns are for display/search only.

---

## Non-Negotiable Rules

### 1. Dependency Rule
Pure Python only. ReportLab is the PDF engine. WeasyPrint rejected (needs C libs).
Every dependency must bundle cleanly via PyInstaller on Windows.

### 2. UX Rule
Shortest path always. 12-21 patients/day.
- Export PDF auto-saves first if not saved
- Never add friction between user and primary action
- If user can enter, user must be able to return — always provide navigation back
- Topbar button order (left→right): [← Return | Save & Return] | [+ New | Clear] | [🌙 | Copy to MPIS | Export KKM PDF] | [Save Record]
  Return/Save & Return are injected by initFormContext() into #topbar-nav-group — only visible in episode context.
  Do NOT reorder these. The primary action (Save Record) is always rightmost.

### 3. Clinical Rule
- Fields must match KKM standardised form exactly for audit compliance
- Use "PT Impression" not "PT Diagnosis" — physios cannot diagnose
- Preserve KKM typos in PDFs (e.g. "ACCESSORRY" double R in Spine)
- Lung diagram: radiological convention (patient RIGHT on viewer's LEFT, labelled R)

### 4. JS Rules — CRITICAL
- window.FormBase must be exposed before any inline HTML handler calls it
- All inline HTML handlers must use window.FormBase.xxx not FormBase.xxx
  (const is block-scoped and unreliable from HTML attributes)
- Never write literal newlines in JS strings via Python — silent browser SyntaxError
- Always syntax-check new JS: node --check file.js before packaging
- onPtTypeChange uses null-guarded set() — never direct getElementById without null check
- form_xxx.js MUST export window.Form (not just window.ActiveForm)
- BodyChart API: use BodyChart.getData() to collect markers, BodyChart.loadData(arr)
  to populate, BodyChart.clearAll() to reset. There is NO BodyChart.collect() or
  BodyChart.populate(). Store as bodyChart: { markers: [...], notes: str } (camelCase).
- clinical_templates.js must be a clean IIFE — orphaned code outside functions
  breaks the entire module silently (learned the hard way this session)
- MPIS formatters share constants and helpers defined at top of Main IIFE:
    MPIS_LN, MPIS_DIV, MPIS_DASH — never redeclare locally as String.fromCharCode etc.
    mpisSec(parts, title, val) — replaces inline function sec() in each formatter
    copyText(str) — replaces the 5-line try/catch clipboard block
  XSS: user-supplied strings injected into innerHTML must go through escapeHtml()
  (available as a shared helper in Main) — patient names, dates, form types.

### 5. PDF Rules
- Each form type has its own standalone PDF generator
- LungDiagramFlowable uses clipPath — always saveState()/restoreState() per lung
- Always match KKM borang ref number exactly (different per form)
- Every box() call inside two-column layout MUST pass explicit width
- ReportLab clipPath is cumulative — second lung must saveState before clipPath call
- two_col() returns a single Table (not a list) — use story.append(), NOT story += 
- body_chart_section() returns a single Table — use items.append(), NOT items +=
- Nested tables inside ruled_section() cells MUST use INN = column_width - 8*mm for
  their colWidths, not the full column width — padding eats into available space
- ALWAYS use sign_chop_block() from pdf_platypus_base for the sign & chop footer.
  Do NOT inline custom sign/chop code in individual PDF generators.
  Usage: items += sign_chop_block()  or  story += sign_chop_block()
- Session header fields (Nombor Giliran, KPI-SS-30 min, Dilihat, Temujanji) live in
  episode.html SOAP modal — shared automatically across ALL forms. Zero extra work
  per form. New forms get these fields for free. Do NOT add them to individual forms.
  DB columns: queue_no, kpi_30min, seen_by, next_appt, next_appt_time in soap_notes.
  MPIS output for SOAP notes follows POMR format (Malay headers) not assessment format.
- patient and body_chart from DB records may be JSON strings (not dicts).
  Always use _ensure_dict() or json.loads() before calling .get() on them.

### 6. Code Editing Rules — WORKFLOW DISCIPLINE
- Read the file before editing. Always.
- After a str_replace, re-read the affected area before making another edit to the same file.
  Previous view output becomes stale after any successful edit.
- When rewriting large blocks, check for orphaned code AFTER the replacement.
  Multiple str_replace passes on the same file accumulate stale sections.
- When in doubt about file state: view the file, grep for the pattern, then edit.
- Never assume a previous edit "got everything" — verify.

### 7. Anti-Repeat Rules — things we keep relearning, do not let this happen again
- After ANY str_replace > 5 lines: grep -n "def function_name" file and read the ENTIRE
  function. Look for unreachable code below return statements. This is non-negotiable.
- fetchone() with no ORDER BY on any query that expects 0-1 rows is a latent bug.
  Always add ORDER BY + LIMIT 1. Always.
- When adding a new form type anywhere (FORM_REGISTRY, PDF generator, MPIS handler),
  check ALL four registries: FORM_REGISTRY, _PDF_GENERATORS, _SINGLE_PDF_GENERATORS,
  REQUIRED_FIELDS. Missing any one of them is a silent failure mode.
- Copy-paste route handlers are a code smell. If you're about to paste a 5th copy
  of a route, stop and write a generic handler instead.
- sqlite3.OperationalError, not bare Exception, for migration try/except blocks.
- When replacing a __import__() hack with a direct call, ADD the symbol to the
  module-level imports first. The hack worked precisely because it bypassed imports.
  Replacing the call without updating imports = NameError at runtime.
- collect() MUST set both `_form_type` AND `meta: { form: 'XXX' }`. They serve
  different consumers: `_form_type` → PDF routing; `meta.form` → validate_record()
  in database.py. Missing either causes silent wrong behaviour or 422. Non-negotiable.
- When flipping FORM_REGISTRY ready=True, ALSO update home.html episode modal card.
  The modal is hardcoded — it is NOT driven by FORM_REGISTRY. The sidebar is dynamic;
  the modal is not. Forgetting this leaves the new form's modal card greyed out with "Soon".
- Before using a custom CSS class in a new form, grep for it in style.css. If absent, add it.
  Chip groups, sliders, and custom badges are common offenders — they look like they work
  in HTML but are invisible or unstyled until the CSS class actually exists.

---

## Lessons Learned — Code Review Session 2026-04-26

1. **Dead code after return is invisible until you grep for it.**
   The orphaned block in export_pdf() had two `return response` and two `except Exception`
   blocks. Python never warns about unreachable code. The symptom would only surface if
   the try block logic changed. Pattern: after any large str_replace, grep for the function
   signature and visually trace the entire function body. Don't just check the replaced block.

2. **fetchone() without ORDER BY is a latent bug, not a current one.**
   get_episode_record() worked fine for months because no episode ever had duplicate records.
   The bug was invisible right up until it wasn't. Rule: any query that expects at most
   one row should have ORDER BY + LIMIT 1. SQLite result order is undefined without it.

3. **Copy-paste route handlers are a maintenance trap.**
   The 5 form routes in app.py are identical except for template name and current_form string.
   Every new form adds another copy. Same pattern as the boilerplate-in-every-form-html mistake
   from session 2026-04-25 — learned it for JS, didn't apply it to Python routes.
   Fix: generic /form/<form_id> route. Do this before adding HAND or NEURO.

4. **REQUIRED_FIELDS gaps are silent data quality holes.**
   CR and AMPUTATION forms save with empty diagnosis/impression because they're not in
   REQUIRED_FIELDS. The validation layer exists and works — it just wasn't extended when
   new forms were added. Rule: add to REQUIRED_FIELDS before a form is declared done.
   This is now in the form checklist (step 4.5).

5. **Code review catches bugs before they become mysterious symptoms.**
   All four bugs fixed this session would have been debugged eventually — as confusing
   symptoms (wrong PDF, empty form, silent error). A review pass every few sessions
   pays for itself in a project with heavy str_replace usage.

6. **Replacing a hack requires understanding why the hack existed.**
   api_stats() used __import__('database').get_conn() — ugly but functional, because
   get_conn was never in the module-level imports. Replacing it with a direct get_conn()
   call without adding the import = NameError at runtime. Before removing a workaround,
   ask: what problem was this solving? Then solve that problem properly first.

### What we should have done differently

- **Grep for orphaned code mechanically, not as a reminder.** After any replacement
  > 5 lines: grep for the function signature and read the entire function top to bottom.
  The CLAUDE.md already said this. It wasn't done. Make it a step, not a guideline.

- **Generic form route from form 2.** The pattern was obvious by form 2. Ten minutes
  to write /form/<form_id> would have saved more than that across 5 form additions.
  Architecture decisions compound — make the right call early.

- **REQUIRED_FIELDS is now in the form checklist** (see Adding a New Form section).
  It wasn't before. Now it is.

---

## Lessons Learned — Session 2026-04-25 (The Big Session)

### What We Learned The Hard Way

1. **Orphaned code is the silent killer.**
   Every time we rewrote a function (show() in clinical_templates.js, draw() in pdf_cr.py),
   the old code body was left behind. The new code ran first, then hit the orphaned block
   and crashed. Pattern: after any large str_replace, grep for remnants of the old code.

2. **clinical_templates.js was structurally broken for multiple sessions.**
   The template picker had orphaned picker.style.cssText = [...] outside any function.
   This silently broke the entire IIFE module — ClinicalTemplates was never defined.
   This caused cascading failures across ALL forms (no template buttons, no MPIS, crashes).
   Lesson: when multiple unrelated things break at once, suspect a broken module.

3. **window.Form is not the same as window.ActiveForm.**
   form_geriatric.js set window.ActiveForm but not window.Form.
   main.js calls Form.onPtTypeChange() on init — undefined = crash.
   Every new form MUST set both. Check the checklist.

4. **onPtTypeChange without null guards = form-specific crashes.**
   form_base.js's onPtTypeChange did direct getElementById without null checks.
   Geriatric doesn't have country-field or sex-field so it crashed on load.
   Fix: always use null-guarded helpers when accessing optional DOM elements.

5. **Boilerplate copy-paste creates maintenance debt.**
   We had patient prefill + episode wrapper + nav buttons copied into 4 form HTML files.
   When we fixed a bug in one, the others still had the old version.
   Fix: initFormContext() centralises all of this. New forms are zero-boilerplate.

6. **FORM_REGISTRY defined before app = Flask() crashes the exe.**
   We put the registry and @app.context_processor before app was created.
   Python executes decorators immediately — no app object yet = NameError.
   Fix: always define app first, registry second.

7. **SVG zone heights can be negative if coordinate conventions are mixed.**
   Tried to reuse fraction constants named R_MID_TOP/R_MID_BOT but their values
   were named for "top of screen" (small Y) vs "bottom of zone" (large Y in SVG).
   Passing them in wrong order produced negative heights. Rename to be explicit:
   R_MID_TOP_Y = where upper zone ends (smaller Y value in SVG).

8. **PDF export used stored form_type, not current form type.**
   Switching forms and exporting gave the old form's PDF because the record's
   stored meta.form was still the previous type. Fix: pass ?form_type= as query param
   from the frontend, always use that as highest priority in the backend.

9. **str_replace on the same file multiple times in one session accumulates drift.**
   After each successful edit, the previous view output is stale. Subsequent edits
   based on stale output can miss, duplicate, or corrupt content.
   Discipline: re-view file after every edit before making the next one.

10. **Text wrap in ReportLab tables.**
    Plain strings in table cells don't wrap — they overflow or crash.
    Always use Paragraph() objects in table cells. This was learned in an earlier
    session but worth repeating: Paragraph(text, style) not just text.

### What We Should Have Done Differently

- **Plan the boilerplate centralisation earlier.** We wrote the same 50 lines of
  patient prefill + nav button code into 4 separate form files before realising
  it should be in one place. Should have designed initFormContext() before form 2.

- **Test each form in isolation before moving to the next.**
  We built CR form, discovered it had 8 bugs, fixed them all in a rush.
  Better: build one section, test, then build the next.

- **Read clinical_templates.js top to bottom before each edit.**
  We made 4 separate edits to it across the session without reading the full file
  each time. Result: multiple orphaned blocks accumulating. A single full read
  would have caught this immediately.

- **Agreed on the lung diagram scope earlier.**
  We built a 4-box grid, then a 6-zone anatomical version, then fixed the R/L labels,
  then fixed the coordinate math. Three iterations for something that could have been
  planned in 5 minutes with a sketch.

---


## Lessons Learned — Session 2026-04-26 (Amputation Form Session)

1. **Modal form picker was hardcoded — missed when adding new forms.**
   The New Episode modal had 4 hardcoded form cards. FORM_REGISTRY drove the sidebar
   dynamically but not the modal. Always update BOTH when adding a new form.
   Fix: modal now shows all 15 forms, not-ready ones greyed out with "Soon" badge.

2. **getCurrentFormType() only checked d.meta.form, not d._form_type.**
   Export KKM PDF was passing form_type=MS for amputation records because the
   check for _form_type was missing. Spotted instantly via network tab URL showing
   ?form_type=MS. Lesson: when an export gives wrong output, check the network tab first.

3. **BodyChart.collect() does not exist.**
   The method is BodyChart.getData() / BodyChart.loadData() / BodyChart.clearAll().
   Also the key must be bodyChart (camelCase) not body_chart (snake_case) to match
   how MS/Spine store it. PDF generator must accept both via _ensure_dict fallback.

4. **patient and body_chart from DB may be JSON strings, not dicts.**
   When load_record returns data, nested objects like patient and bodyChart may still
   be JSON-encoded strings. Always call _ensure_dict() before .get() on any nested
   object from DB records.

5. **two_col() and body_chart_section() return single Table objects, not lists.**
   story += Table crashes. Use story.append(). body_chart_section same issue.
   When in doubt: check the function return type in pdf_platypus_base.py before using +=.

6. **Nested tables inside ruled_section() overflow their cells.**
   MMT and MRMI tables embedded inside ruled_section() rows blew out column bounds.
   Fix: render complex tables as flat flowables alongside ruled_section(), not inside it.
   Use INN = column_width - 8*mm for nested table colWidths to account for cell padding.

7. **sign_chop_block() — standardised across all forms.**
   After multiple iterations trying to right-align the sign & chop block, the cleanest
   solution is a simple reusable helper in pdf_platypus_base.py. All forms use it.
   Never inline custom sign/chop code again — just call sign_chop_block().

8. **Inline JS in HTML onclick attributes cannot contain single quotes or newlines.**
   The MMT "Add row" button had escaped JS strings inside onclick="..." attribute.
   The quotes and newlines broke the HTML attribute parsing, rendering raw JS as text.
   Fix: always move complex onclick logic to a named function in the form JS file.
   This is a repeat of the CLAUDE.md Python \n in JS string lesson — same root cause.

---


## Lessons Learned — Session 2026-04-26 Part 2 (Amputation Polish + Session Header)

1. **Episode modal was hardcoded — always check when adding new forms.**
   The New Episode modal had 4 hardcoded form cards independent of FORM_REGISTRY.
   Fixed by rendering all 15 forms, greying out not-ready ones with "Soon" badge.
   Rule: whenever FORM_REGISTRY changes, check home.html modal too.

2. **getCurrentFormType() only checked d.meta.form, missed d._form_type.**
   Export KKM PDF was passing form_type=MS for amputation. Spotted immediately
   via network tab URL. Lesson: check network tab URL first when export gives wrong output.

3. **BodyChart API: getData() not collect(). Key: bodyChart not body_chart.**
   There is no BodyChart.collect() or BodyChart.populate(). Always use:
     collect:  bodyChart: { markers: BodyChart.getData(), notes: gv('chart-notes') }
     populate: BodyChart.loadData(data.bodyChart.markers)
     reset:    BodyChart.clearAll()

4. **patient and bodyChart from DB load as JSON strings, not dicts.**
   Use _ensure_dict() in PDF generators before calling .get() on any nested object.
   This is now documented in PDF rules. Do not forget on new PDF generators.

5. **two_col() and body_chart_section() return Table, not list.**
   Use story.append() not story +=. Learned the hard way again this session.
   Added to PDF rules. Check return type before using += on any platypus helper.

6. **Nested tables inside ruled_section() overflow — use INN width.**
   Tables inside table cells must account for padding.
   INN = column_width - 8*mm for inner table colWidths.

7. **sign_chop_block() — build reusable helpers, not inline code.**
   After 9 iterations of sign & chop positioning, the right answer was always:
   simple flat paragraphs outside any box, as a shared helper. Keep it simple.
   Pattern now documented and used across all 5 PDF generators.

8. **inline onclick with complex JS bleeds as visible text.**
   MMT add-row button had escaped JS strings inside onclick="" attribute.
   Browser rendered the raw JS as visible page text. Always move complex onclick
   to a named function in the JS file. This is the CLAUDE.md Python newline lesson
   in HTML form — same root cause, different surface.

9. **clinical_templates insert() called focus() after hide() nulled activeField.**
   Classic order-of-operations: save reference to local var before calling hide().
   Simple fix, documented in code.

10. **Session header as shared injectable — the right architecture call.**
    POMR fields (Nombor Giliran, KPI, Dilihat, Temujanji) belong at session level,
    not form level. Putting them in episode.html SOAP modal means ALL forms get them
    automatically — zero extra work per new form. This is the correct layering:
      - Form-specific: form_xxx.html, form_xxx.js, pdf_xxx.py
      - Session-level shared: episode.html SOAP modal
      - PDF shared: pdf_platypus_base.py helpers

11. **MPIS SOAP output should match actual dept POMR format, not custom format.**
    The department uses a Word POMR template with Malay headers. Our MPIS output
    should match that exactly so paste is seamless. Malay headers + English SOAP
    content is correct and intentional — that is the clinical convention.

---

## Lessons Learned — NEURO Bug Fix Session 2026-04-28

1. **`collect()` needs both `_form_type` AND `meta.form` — they serve different consumers.**
   `_form_type` feeds `getCurrentFormType()` in the frontend → `?form_type=` query param → PDF routing.
   `meta.form` feeds `validate_record()` in `database.py` → `REQUIRED_FIELDS` lookup.
   NEURO set `_form_type` only. Validator defaulted to `'MS'`, applied wrong REQUIRED_FIELDS, returned 422.
   The fix is a single key in collect(). The trap is that both keys must exist and match — forever.
   New rule: every form's collect() template must include both from day one.

2. **The home.html episode modal is hardcoded — it does NOT follow FORM_REGISTRY.**
   FORM_REGISTRY drives the sidebar dynamically. The episode modal is static HTML.
   When NEURO was built, FORM_REGISTRY was updated → sidebar showed NEURO. Modal still had `soon` class.
   The "all 15 forms shown" modal overhaul ran before NEURO was ready, so NEURO got `soon` correctly.
   Then NEURO shipped but no one revisited the modal. Modal card greyed out in production.
   Fix: home.html modal review is now step 1.5 in the new form checklist, tied to ready=True.

3. **CSS classes used in HTML must actually exist in style.css — grep before assuming.**
   `.chip` and `.chip-group` were used in 7 places across neuro.html before anyone checked style.css.
   Assumption: "chips worked in amputation, so the class must exist." It didn't — amputation uses `.irr-chip`.
   Result: all chip multi-selects rendered as plain unstyled text. Clear button didn't fix it (it was CSS, not data).
   Lesson: when reusing a UI pattern from another form, check whether the CSS class name actually matches.

4. **BodyChart never accepts a container ID — it needs the real SVG nodes in the DOM.**
   `BodyChart.init()` in main.js auto-fires when `#svg-ant` exists. It hardcodes IDs `#ptype-sel`,
   `#svg-ant`, `#svg-post` — no container abstraction. A placeholder div = those IDs missing =
   null.addEventListener crash. There is no "lazy init" path. Either the full SVG is in the DOM or it isn't.
   Fix: copy the full SVG block from ms.html verbatim. No manual init call needed.

5. **Duplicate `<script>` tags for IIFEs that declare `const` at module level cause SyntaxError.**
   `bodychart.js` is an IIFE but declares `const BodyChart` at the top level of the script, not inside
   the IIFE. Loading it a second time in extra_js re-declares the const → SyntaxError → page broken silently.
   base.html already loads it. extra_js must never load it again. Check base.html before adding scripts.

6. **Template buttons require explicit `ClinicalTemplates.addButton()` calls — they are not automatic.**
   NEURO assessment templates were added to clinical_templates.js in the prior session. But the 6
   `addButton()` calls were never added to neuro.html extra_js. No error thrown — buttons simply absent.
   This is easy to forget because the rest of the form works fine without them. Add the calls during
   the form build, not as a follow-up, so the gap is obvious during the first test.

### What we should have done differently

- **Set both `_form_type` and `meta.form` from the very first version of collect().** The checklist
  said "set `_form_type`" without mentioning `meta.form`. The two-consumer split was documented in
  CLAUDE.md (PDF routing section) but not in the form creation checklist. A rule documented in one
  place but missing from the actionable checklist is effectively undiscoverable. Now in both places.

- **Test Save Record on the first day of a new form, before declaring it done.**
  The 422 would have been caught immediately on day one if we'd hit Save. We built the full form,
  ran node --check, confirmed UI looked right, and called it done — without ever clicking Save.
  For any future form: Save Record and Export KKM PDF are mandatory smoke tests before done status.

- **Check home.html modal as part of FORM_REGISTRY ready=True, not as an afterthought.**
  The modal review was not in the checklist. It is now. This bug will not recur.

- **Write `ClinicalTemplates.addButton()` calls during the form build, not at cleanup time.**
  If you write the HTML section, immediately write the corresponding addButton() call in extra_js.
  Leaving it for "later" guarantees it gets missed — the form looks fine in every other respect.

---

## TODO (next session priority order)

### High Priority
- [ ] Git push — this has been on the list for 5+ sessions, do it first
- [ ] Full end-to-end exe build test (all 6 forms — NEURO code is fixed but build is untested)
- [ ] HAND form (next new form — simpler scope, good warmup)

### Medium Priority
- [ ] Validation layer — UI enforcement (hard stop before save — REQUIRED_FIELDS covers all 6 forms, just needs frontend to surface the errors)
- [ ] Geriatric duplicate RN/IC fields cleanup (cosmetic, low effort)
- [ ] Age auto-calculation bug (NRIC->age, DOB->age) — still unresolved, deprioritised

### Lower Priority
- [ ] Draft vs Final state for assessment records
- [ ] Versioning UI (audit_log data exists, no UI yet)
- [ ] Remaining 9 forms: HAND, BURN, SCI, VESTIBULAR, FACIAL, PAEDIATRIC, LYMPHOEDEMA, NCD, GENERAL
- [ ] POMR-aligned MPIS output for assessment forms (currently uses assessment format)
- [ ] Accessibility: ARIA labels on toast, progress bar, sidebar nav items (low clinical priority)

### Done this session (2026-04-28 — NEURO form build)
- [x] NEURO form — full HTML (11 sections, chip UI, Ashworth dropdowns, MRMI auto-total, outcome flags)
- [x] form_neuro.js — collect/populate/reset, NeuroForm IIFE, window.Form + window.ActiveForm
- [x] pdf_neuro.py — 2-page KKM layout, ICF impression, MRMI table, body chart, sign_chop_block
- [x] copyToMpisNeuro() in main.js + NEURO dispatch in copyToMpisAuto()
- [x] NEURO_SOAP templates in clinical_templates.js (objective/analysis/plan)
- [x] tplMap NEURO entry in episode.html
- [x] pdf_neuro.py added to pt_assessment.spec datas
- [x] All 6 registries updated: FORM_REGISTRY ready=True, FORM_TEMPLATES, _PDF_GENERATORS, _SINGLE_PDF_GENERATORS, REQUIRED_FIELDS, spec

### Done this session (2026-04-28 — NEURO bug fixes)
- [x] Removed duplicate bodychart.js script tag from neuro.html extra_js (SyntaxError on load)
- [x] Replaced body-chart-container placeholder div with full SVG HTML — BodyChart.init() needs real DOM nodes
- [x] Removed Sex and RN fields from neuro.html (auto-derived from NRIC; RN = NRIC)
- [x] Added complaint-text textarea below complaint chips
- [x] Added `.chip` / `.chip-group` CSS to style.css (was completely missing — chips rendered as plain text)
- [x] Fixed NEURO episode modal card in home.html (removed `soon` class, added onclick, updated icon)
- [x] Added ClinicalTemplates.addButton() calls in neuro.html extra_js (6 template buttons)
- [x] Added `meta: { form: 'NEURO' }` to form_neuro.js collect() — fixed 422 on save/PDF

---

## Key Clinical Context

### Malaysian NRIC Logic
- 12 digits, no dashes
- First 6 = YYMMDD (birthdate)
- Last digit: odd = Male, even = Female
- Year: if YY <= current year's last 2 digits -> 2000s, else 1900s

### KKM Form References
- MS:        fisio / b.pen. 14 / Pind. 1 / 2019
- Spine:     fisio / b.pen. 6 / Pind. 2 / 2019
- Geriatric: fisio / b.pen. 15 / 2019
- CR:        fisio / b.pen. 11 / Pind. 2 / 2019
- Amputation: fisio / b.pen. 16 / 2019
- Neurology: MOH/P/FIS/27.25(HB)-e

### Lung Diagram (CR)
- 6 zones: RU, RM, RL (right lung), LU, LL (left lung), BASE (bilateral)
- Radiological view: patient RIGHT lung on viewer's LEFT, labelled R
- Zone IDs and finding colours must match between lungchart.js and pdf_cr.py exactly

---

## MPIS Integration

MPIS = Malaysian Patient Information System (hospital web app, plain text paste only).
copyToMpisAuto() in main.js dispatches based on form type (assessment forms).
copySOAPtoMpis() in episode.html handles SOAP/follow-up notes — outputs POMR format.
POMR format uses Malay headers (TARIKH, NOMBOR GILIRAN, DILIHAT, TEMUJANJI) + English SOAP.
  MS         -> copyToMpis()
  SPINE      -> copyToMpisSpine()
  GERIATRIC  -> copyToMpisGeriatric()
  CR         -> copyToMpisCr()
  AMPUTATION -> copyToMpisAmputation()
  NEURO      -> copyToMpisNeuro()

---

## What's Done (as of 2026-04-28)

- [x] Patient registration with NRIC auto-derive (DOB/age/sex)
- [x] Patient edit modal in home.html
- [x] Episode management (create, discharge with reason, reactivate)
- [x] Delete patient (cascade wipe, two-step confirm)
- [x] MS assessment form + PDF + MPIS + SOAP templates
- [x] Spine assessment form + PDF + MPIS + SOAP templates
- [x] Geriatric assessment form + PDF + MPIS + SOAP templates
- [x] CR assessment form + PDF + MPIS + SOAP templates
- [x] Amputation form — full implementation (HTML, JS, PDF, MPIS, SOAP templates, body chart)
- [x] Body chart (SVG anterior + posterior, 6 pain types, markers in PDF)
- [x] Lung chart (SVG 6 zones, radiological view, click-to-mark, findings -> PDF)
- [x] Clinical templates for all 5 forms (assessment + per-form SOAP variants)
- [x] SOAP follow-up notes (session numbered, per-form-type templates)
- [x] PDF export for all 5 forms (episode PDF + single record PDF)
- [x] MPIS clipboard copy for all 5 forms (MS, Spine, Geriatric, CR, Amputation)
- [x] Episode modal — all 15 form cards shown, not-ready ones greyed out with "Soon" badge
- [x] sign_chop_block() helper in pdf_platypus_base — used by all 5 PDF generators
- [x] Session header fields in SOAP modal (Nombor Giliran, KPI-SS-30 min, Dilihat, Temujanji)
- [x] SOAP MPIS output follows POMR format (Malay headers matching dept Word template)
- [x] Frontend refactor: shared MPIS helpers (MPIS_LN/DIV/DASH, mpisSec(), copyText(), escapeHtml())
- [x] Autosave to localStorage (3s debounce) + draft recovery on reload
- [x] Dark mode (CSS variables, localStorage persisted)
- [x] Dynamic sidebar from FORM_REGISTRY (15 forms, collapsible groups)
- [x] Sidebar collapse toggle (hamburger button in topbar)
- [x] Context-aware form switching (preserves patient_id + episode_id in URL)
- [x] initFormContext() — zero-boilerplate pattern for all current + future forms
- [x] Generic form route /form/<form_id> — add to FORM_TEMPLATES for new forms
- [x] Export KKM PDF passes current form type as ?form_type= to override stored record type
- [x] PyInstaller .exe build (Windows, build.bat)
- [x] Code review fixes: dead code, ORDER BY on get_episode_record(), api_stats() __import__ hack, ALTER TABLE exception narrowing, CR+AMPUTATION REQUIRED_FIELDS
- [x] **delete_patient() wrapped in atomic transaction — partial deletes now impossible**
- [x] **discharge_reason stored in dedicated column — status field no longer pipe-encoded**
- [x] **home.html status parsing reads discharge_reason directly, with backwards-compat fallback**
- [x] **NEURO form — full implementation (HTML, JS, PDF, MPIS, SOAP templates, spec)**
- [x] **NEURO bug fix pass — chip CSS, body chart SVG, duplicate script, 422 validator, modal card, template buttons**

---


## 🔁 PERSISTENT REMINDER — Git Push

**Push to GitHub at the start of every session. Not the end. The start.**
This has been on the TODO list for 4+ sessions and keeps getting skipped.
It takes 2 minutes. Do it before opening any files.

```bash
git add -A && git commit -m "session checkpoint" && git push
```

---

## HANDOVER NOTE — NEURO Bug Fix Session 2026-04-28

### What happened this session

Short bug fix session immediately after first real-world test of the NEURO form.
8 bugs identified and resolved. No new features added. Files changed:
`templates/forms/neuro.html`, `static/js/form_neuro.js`, `static/css/style.css`, `templates/home.html`.

**Bugs fixed:**

1. **BodyChart SyntaxError on load** — `neuro.html` extra_js block had a second
   `<script src="bodychart.js">` tag. `bodychart.js` declares `const BodyChart` at IIFE level.
   Loading it twice caused "cannot redeclare block-scoped variable BodyChart" SyntaxError.
   Fixed: removed the duplicate script tag. `base.html` already loads it — extra_js must not.

2. **BodyChart null addEventListener** — neuro.html had `<div id="body-chart-container">`
   as a placeholder. `main.js init()` auto-calls `BodyChart.init()` when `#svg-ant` is found in DOM.
   `BodyChart.init()` directly attaches events to `#ptype-sel`, `#svg-ant`, `#svg-post` — it
   does NOT accept a container ID. Placeholder div → those IDs absent → null.addEventListener crash.
   Fixed: replaced placeholder with full embedded SVG body chart HTML (identical to ms.html).
   Also removed the manual `BodyChart.init()` call from extra_js — main.js handles it automatically.

3. **Sex and RN fields present on form** — Sex is auto-derived from NRIC (odd/even last digit).
   RN = referral number = NRIC in KKM workflow. Both fields are already handled by the
   shared patient header. Removed both `<div class="field">` blocks from neuro.html.

4. **Chief complaint chips only, no free text** — User needed a textarea for patient's own words
   below the chip multi-select. Added `<textarea id="complaint-text">` after the chip group.
   Wired in form_neuro.js: `collect()` adds `complaint_text: gv('complaint-text')`,
   `populate()` calls `sv('complaint-text', d.complaint_text)`, `reset()` includes `'complaint-text'`.

5. **Chips rendered as plain text (`.chip` CSS missing)** — `.chip` and `.chip-group` classes
   were never defined in style.css. Only `.irr-chip` (amputation) and `.pt-chip` (body chart)
   existed. The chips displayed as unstyled inline text with no borders, no toggle behaviour.
   Fixed: added full `.chip-group` / `.chip` / `.chip.active` / dark mode variant block to style.css
   after the `.irr-chip` section. Chip CSS is now shared across NEURO and any future form that uses it.

6. **NEURO episode modal card greyed out** — `home.html` has a hardcoded episode modal (not
   driven by FORM_REGISTRY). The NEURO card still had class `soon` and no `onclick` from the
   previous session's "all 15 cards shown, not-ready greyed" modal overhaul. Fixed: removed `soon`
   class, removed "Soon" badge span, added `onclick="selectForm(this)"`, changed icon to `&#9889;`.
   Also added `NEURO:'Neurological'` to the formLabel map and `NEURO:'&#9889;'` to the icon map.

7. **No template buttons** — `ClinicalTemplates.addButton()` calls were missing from neuro.html
   extra_js. Fixed: added a `DOMContentLoaded` listener with 6 calls (impression_bsf, impression_al,
   impression_pr, stg, ltg, plan). The NEURO assessment template categories in clinical_templates.js
   were already added in the prior session.

8. **422 on Save Record and Export KKM PDF** — `validate_record()` in `database.py` reads form
   type via `data.get('meta', {}).get('form', 'MS')`. `form_neuro.js collect()` was only setting
   `_form_type: 'NEURO'` — no `meta` block. Validator fell back to `'MS'`, applied MS
   REQUIRED_FIELDS against NEURO data → mismatches → 422.
   Fixed: added `meta: { form: 'NEURO' }` to the `collect()` return object.
   Verified with `node --check static/js/form_neuro.js` → OK.

---

### Retrospective

**What went wrong and why:**

- **The `meta.form` / `_form_type` split is a footgun.** Two separate keys serve two separate
  consumers (PDF routing vs. validator) and there's nothing in the checklist that reminds you to
  set both. The new form checklist says "set `_form_type` in collect()" but says nothing about
  `meta.form`. This gap caused the 422. Added to the gotchas section of the top-of-file summary
  and to Anti-Repeat Rules below.

- **The body chart placeholder was a half-measure.** Writing `<div id="body-chart-container">`
  as a todo-placeholder creates a category of bug that only surfaces at runtime when `BodyChart.init()`
  runs and the expected IDs aren't there. The correct approach is always: embed the real SVG HTML
  from ms.html, or don't have a body chart section at all.

- **The chip CSS gap was invisible until render.** `.chip` was used in 7 places in neuro.html
  before anyone checked that the class existed in style.css. Because chips were pre-existing code
  from the form design phase, the assumption was "chip CSS is there somewhere." It wasn't. Rule:
  when using a CSS class that isn't in a standard library, grep for it in style.css before assuming.

- **NEURO modal card was missed in the home.html overhaul.** The "show all 15 forms with not-ready
  greyed" session updated the modal HTML, but NEURO wasn't ready at that point — it got `soon`
  class correctly. Then NEURO was built but home.html wasn't revisited. Lesson: FORM_REGISTRY
  ready=True changes must trigger a home.html modal card review as part of the checklist.

**What went well:**

- `node --check` on form_neuro.js caught nothing — the 422 fix was syntactically clean.
- All 8 bugs were diagnosed from first principles from the console errors + code read,
  no guessing. Root cause was right every time.
- The chip CSS fix was additive — it didn't touch existing `.irr-chip` or `.pt-chip` selectors.

**What we'd do differently:**

- Add a "does this CSS class exist?" check to the form build process for any custom class used
  in chip groups, sliders, or other non-standard UI patterns.
- Add home.html modal card review to the new form checklist (step after FORM_REGISTRY ready=True).
- Make `meta: { form: 'XXX' }` explicit in the form JS template alongside `_form_type`.

---

### Known issues (updated as of 2026-04-28)

**Still open:**
- Age auto-calculation (NRIC→age, DOB→age) — unresolved, deprioritised
- Geriatric duplicate RN/IC fields — cosmetic, low priority
- No UNIQUE constraint on `records.episode_id` — ORDER BY workaround in place
- `audit_log` FK has no ON DELETE CASCADE — orphaned audit rows harmless but untidy
- `pt_assessment.spec` datas includes `templates/pdf` redundantly
- No ARIA attributes anywhere — low clinical priority
- Accessibility: sidebar nav uses onclick divs, not buttons — not keyboard navigable
- `resetPatient()` in `form_base.js` missing null guards on `derived-dob`/`derived-gender`
- `api.js` episode/SOAP coverage inconsistent (inline fetches in templates)
- NEURO exe build NOT tested — code is fixed, build verification deferred to next session

**Fixed this session:**
- BodyChart SyntaxError (duplicate script tag in neuro.html extra_js) ✓
- BodyChart null addEventListener (placeholder div instead of real SVG HTML) ✓
- Sex / RN fields removed from neuro.html ✓
- Chief complaint textarea added below chips ✓
- `.chip` / `.chip-group` CSS classes added to style.css ✓
- NEURO episode modal card `soon` class and missing onclick fixed in home.html ✓
- ClinicalTemplates.addButton() calls added in neuro.html extra_js ✓
- 422 on save/PDF: `meta: { form: 'NEURO' }` added to form_neuro.js collect() ✓

---

### Next session priorities

1. **Git push** — 5+ sessions and counting. Do it first, before opening any files.
2. **Full exe build test** — all 6 forms end-to-end. NEURO is code-complete but untested in the built exe.
3. **HAND form** — next new form. Simpler than NEURO (no MRMI, no MRCP, no ICF structure). Good session warmup.
4. **Validation layer UI** — surface REQUIRED_FIELDS errors to the user before save attempt. Backend is done; frontend just needs to show the error list from the 422 response body.

---

### New architecture rules / gotchas to add to checklist

**collect() must set BOTH `_form_type` AND `meta.form`:**
  ```javascript
  return {
    _form_type: 'NEURO',      // used by: getCurrentFormType() → ?form_type= query param → PDF routing
    meta: { form: 'NEURO' },  // used by: validate_record() in database.py → REQUIRED_FIELDS lookup
    ...
  };
  ```
  Missing `_form_type` → wrong PDF generator used. Missing `meta.form` → validator defaults to MS → 422.
  Both are required. Both must match. Add this to the new form checklist (step 4, form_xxx.js creation).

**home.html modal card review is part of FORM_REGISTRY ready=True:**
  When you flip a form from `ready=False` to `ready=True`, ALSO check home.html episode modal.
  The modal is hardcoded (not driven by FORM_REGISTRY). The `soon` class and missing `onclick`
  will not be caught by the sidebar — the sidebar IS dynamic. The modal is not.
  Add to checklist between step 1 (FORM_REGISTRY ready=True) and step 2 (FORM_TEMPLATES).

**Chip CSS is now shared via `.chip` / `.chip-group` in style.css:**
  All chip multi-selects across any form use these classes. Do NOT redefine chip styles per-form.
  Do NOT use `.irr-chip` for new forms — that's amputation-specific (has its own colour scheme).
  Before using any custom CSS class in a new form, grep for it in style.css first.

**BodyChart requires real SVG DOM nodes — never use a placeholder div:**
  `BodyChart.init()` in `main.js` fires automatically when `#svg-ant` is detected.
  It directly attaches event listeners to `#ptype-sel`, `#svg-ant`, `#svg-post`.
  If these IDs are absent (e.g. placeholder div used instead), it throws and body chart is dead.
  Copy the full SVG block from ms.html. There is no initialisation call to make — main.js handles it.

---

## HANDOVER NOTE — NEURO Form Session 2026-04-28

### What happened this session

Built the NEURO (Neurology) assessment form from scratch. Full implementation across all 6
required files. Session split across two context windows (context compacted mid-session).

**Files created:**
- `templates/forms/neuro.html` — 11-section form using chip multi-selects for high-frequency
  lists (complaints, limbs, PMHx, observation, gait, plan), radio buttons for binary/trinary
  choices, Ashworth dropdowns (0/1/1+/2/3/4), MRMI auto-total, 10MWT speed auto-calc,
  outcome risk flags (TUG, Berg, FRT), dynamic tables (investigations, medications, MMT, ROM),
  body chart, ICF-structured PT Impression (BSF / Activity Limitation / Participation Restriction)
- `static/js/form_neuro.js` — NeuroForm IIFE (~580 lines). window.ActiveForm + window.Form
  contract fulfilled. node --check passed. Named functions for all dynamic table rows
  (no inline onclick JS). All chip/radio/slider/select patterns follow established conventions.
- `pdf_neuro.py` — 2-page KKM layout (MOH/P/FIS/27.25(HB)-e). Page 1: two_col with
  subjective/history left, objective/clinical right, then full-width MMT + ROM + body chart.
  Page 2: two_col with balance/MRMI/gait left, outcomes/impression/goals right.
  story.append() (not +=) for two_col and body_chart_section. _ensure_dict() throughout.
  sign_chop_block() footer.

**Files modified:**
- `app.py` — import pdf_neuro, _PDF_GENERATORS['NEURO'], _SINGLE_PDF_GENERATORS['NEURO'],
  FORM_REGISTRY ready=True, FORM_TEMPLATES['NEURO']
- `database.py` — REQUIRED_FIELDS['NEURO'] (diagnosis + pt_impression)
- `static/js/main.js` — copyToMpisNeuro() (~120 lines), NEURO dispatch in copyToMpisAuto(),
  copyToMpisNeuro exported from return object
- `static/js/clinical_templates.js` — NEURO_SOAP (objective/analysis/plan templates)
- `templates/episode.html` — tplMap NEURO: NEURO_SOAP
- `pt_assessment.spec` — pdf_neuro.py added to datas

**Key design decisions:**
- Chip multi-selects for: complaints, limbs affected, PMHx, prev mobility aid, vision, hearing,
  appearance, consciousness, posture, mobility obs, emotional obs, resp obs, devices,
  cognitive, sitting/standing balance, gait pattern, walking aid, turning, other outcomes, plan
- Ashworth Modified Scale for tone: dropdowns with 0/1/1+/2/3/4 options
- MRMI: 8 <select> dropdowns (0–5), JS auto-calculates total on every change
- 10MWT: time input + auto-displayed speed (10/t m/s)
- Outcome risk flags: TUG (>13.5s stroke, >11.5s PD), Berg (<45), FRT (<15 high, 15-25 moderate)
- ICF-structured impression: BSF / AL / PR — three separate textareas
- copyToMpisNeuro(): outputs NEURO flags inline (⚠/⚡/✓) within the outcome lines

### Retrospective

**What went well:**
- Context compaction mid-session worked cleanly — the summary accurately captured all
  data field names from form_neuro.js, making copyToMpisNeuro() easy to write without re-reading.
- 6-registry verification grep (`grep NEURO app.py database.py spec`) caught everything at once.
  Anti-repeat rule from CLAUDE.md applied correctly.
- node --check on both main.js and clinical_templates.js passed first time. No syntax errors.
- The chip UI pattern established in amputation carried over cleanly to neuro — no new patterns
  needed, just more chips.

**What was fiddly:**
- Nothing major this session. The session was split across context windows but the summary
  was detailed enough that resumption was seamless.
- episode.html edit hit "File has not been read yet" — needed a Read before Edit.
  This is a recurring friction point. Always read before editing, even for one-liner changes.

**What we'd do differently:**
- The two-context-window split is inevitable for long form builds. The summary captured enough
  to resume cleanly. No changes needed to the workflow — this worked.
- NEURO form has more sections than any previous form (11 vs ~8 for amputation).
  For future complex forms (SCI, VESTIBULAR), consider building section-by-section
  with intermediate syntax checks rather than writing the full HTML in one pass.

### Known issues (updated as of 2026-04-28)

**Still open:**
- Age auto-calculation (NRIC→age, DOB→age) — unresolved, deprioritised
- Geriatric duplicate RN/IC fields — cosmetic, low priority
- No UNIQUE constraint on `records.episode_id` — ORDER BY workaround in place
- `audit_log` FK has no ON DELETE CASCADE — orphaned audit rows harmless but untidy
- `pt_assessment.spec` datas includes `templates/pdf` redundantly
- No ARIA attributes anywhere — low clinical priority
- Accessibility: sidebar nav uses onclick divs, not buttons — not keyboard navigable
- `resetPatient()` in `form_base.js` missing null guards on `derived-dob`/`derived-gender`
- `api.js` episode/SOAP coverage inconsistent (inline fetches in templates)
- NEURO exe build NOT tested yet — full build test is next session's first task

**Fixed this session:**
- NEURO form full implementation ✓

### What to do next session
1. **Git push** — still deferred. Do it first.
2. **Full exe build test** — all 6 forms end-to-end (MS, SPINE, GERIATRIC, CR, AMPUTATION, NEURO)
3. **HAND form** — next new form, simpler scope (no MRMI, no lung diagram, no complex balance section)
4. Validation layer UI — surface REQUIRED_FIELDS errors before save

### Architecture reminders / new rules
- **NEURO-specific collect() keys** — key names are: `pt_impression` (BSF), `pt_impression_al`,
  `pt_impression_pr`, `mrmi_turn/lying_sit/sit_balance/sit_stand/standing/transfer/walk/stairs`,
  `mwt10_time`, `tug_time`, `berg_score`, `frt_score`, `sixmwt_dist`, `borg_rpe`.
  The MPIS formatter uses these directly. Keep consistent if re-visiting the form.
- **ICF impression pattern** — BSF / Activity Limitation / Participation Restriction split into
  3 textareas. This is the correct clinical framing for NEURO. Consider reusing for SCI/VESTIBULAR.
- **Chip-heavy forms** — when >50% of fields are chips, the collect() function stays clean but
  the reset() function needs explicit enumeration of all chipGroups arrays. Don't miss any group.

---

## HANDOVER NOTE — Code Review + Backend Fixes Session 2026-04-27 (Part 2)

### What happened this session

Short focused session: full backend code review followed by two targeted fixes.
No new features. Files changed: `database.py`, `templates/home.html`.

**What was reviewed:**
- `app.py` — routes, PDF dispatch, FORM_REGISTRY
- `database.py` — all CRUD functions, validation, schema
- `form_base.js` — shared patient helpers, age calc, NRIC derive
- `api.js` — fetch wrappers

**Bugs fixed:**

- `delete_patient()` in `database.py` — multi-step cascade delete had no transaction boundary.
  If any step failed mid-way (e.g. SOAP notes deleted, records delete throws), data would be
  left in a half-deleted state with no rollback. Fixed by wrapping all deletes in `with conn:`
  (SQLite context manager = atomic transaction, auto-rollback on exception). Removed the
  explicit `conn.commit()` that was at the end — `with conn:` handles that.

- `update_episode_status()` in `database.py` — discharge reason was encoded as
  `"discharged|Reason text"` in the `status` column. Any reason containing a pipe `|`
  character would corrupt the `split('|')` parsing on the frontend. Fixed by:
  1. Adding `discharge_reason TEXT DEFAULT ""` column to `episodes` via safe migration
     in `init_db()` (same try/except OperationalError pattern as soap_notes migration)
  2. `update_episode_status()` now writes `status='discharged'` clean, reason goes to
     `discharge_reason` column separately
  3. `home.html` status parsing now reads `ep.discharge_reason` directly, with a
     backwards-compat fallback to the old `split('|')[1]` for any existing records
     that still have the pipe encoding in their status field

**Issues identified but NOT fixed (deferred):**
- `resetPatient()` in `form_base.js` calls `getElementById('derived-dob')` and
  `getElementById('derived-gender')` without null guards. Will crash if a future form
  omits those elements. Low risk until we build such a form.
- `api.js` has no episode or SOAP methods — fetch calls for those are scattered inline
  in templates. Inconsistent but not broken.
- `app.secret_key` hardcoded — fine for localhost-only, note if sessions ever used.
- `export_episode_pdf()` silent failure path — if `assessment` is falsy and `ep` has
  no patient_name, PDF generates with blank patient fields. No crash, just confusing output.

---

### Retrospective

**What went well:**
- Both fixes were genuinely low-risk: additive schema change + transaction wrap.
- Backwards-compat fallback on home.html means existing DBs with pipe-encoded status
  still display correctly without a data migration.
- `python -c "import database"` sanity check caught nothing (good).

**What went wrong:**
- `update_episode_status()` str_replace missed the closing `except/finally` block of the
  original function — left orphaned `conn.commit() / return True / except / finally`
  code after the new `finally: conn.close()`. Python would have raised a SyntaxError
  on the orphaned `except` outside any `try`. Caught immediately by re-reading the
  function after the edit. Required a second str_replace to clean up.
- This is the same orphaned-code trap documented 4 sessions in a row. The fix: always
  view the full function after any str_replace, not just the replaced block.

**What we'd do differently:**
- Plan first, then execute. The fixes were correct but the str_replace for
  `update_episode_status()` tried to replace only the body and missed the tail.
  When replacing a function that has try/except/finally, include the entire function
  signature-to-end in the old_str to avoid partial matches.

---

### Known issues (updated as of 2026-04-27)

**Still open:**
- Age auto-calculation (NRIC→age, DOB→age) — unresolved, deprioritised
- Geriatric duplicate RN/IC fields — cosmetic, low priority
- No UNIQUE constraint on `records.episode_id` — ORDER BY workaround in place
- `audit_log` FK has no ON DELETE CASCADE — orphaned audit rows harmless but untidy
- `pt_assessment.spec` datas includes `templates/pdf` redundantly
- No ARIA attributes anywhere — low clinical priority
- Accessibility: sidebar nav uses onclick divs, not buttons — not keyboard navigable
- `resetPatient()` in `form_base.js` missing null guards on `derived-dob`/`derived-gender`
- `api.js` episode/SOAP coverage inconsistent (inline fetches in templates)

**Fixed this session:**
- `delete_patient()` partial cascade delete risk ✓ (atomic transaction)
- Discharge reason pipe-encoding fragility ✓ (dedicated `discharge_reason` column)

---

### What to do next session
1. **Git push** — see persistent reminder above. Do it first.
2. HAND or NEURO form (HAND simpler warmup, NEURO higher clinical volume)
3. Full exe build test — all 5 forms end-to-end, including discharge/reactivate flow
4. Validation layer UI — surface REQUIRED_FIELDS errors before save (backend already done)
5. Fix `resetPatient()` null guards before building any form that omits derived-dob/gender

### Architecture reminders / new rules
- **`discharge_reason` is now its own column.** Do NOT go back to pipe-encoding status.
  Any new status-related reason fields follow the same pattern: dedicated column + safe migration.
- **When replacing a try/except/finally function:** include the full function from `def`
  to the last `conn.close()` in old_str. Never replace just the try block — you will
  leave the old except/finally as orphaned syntax.
- **`with conn:` = atomic transaction in SQLite.** Use it for any multi-step write
  operation where partial completion would leave bad state. Remove explicit `conn.commit()`
  inside the `with` block — it's redundant and misleading.

---

## HANDOVER NOTE — Frontend Refactor Session 2026-04-27

### What happened this session

Short focused session: frontend code review followed by targeted refactoring.
No new features, no backend changes. All changes are in main.js and base.html only.

**Bugs fixed:**

- `draft-indicator` (base.html line 202) had `display:none` written twice in the same
  inline style attribute. The second declaration overwrote `align-items:center`, so when
  JS showed the indicator via `style.display = ''` it rendered as block — dot and "draft saved"
  text stacked vertically instead of inline.

- `draft-banner` had a CSS class system (`.draft-banner { display:none }` /
  `.draft-banner.show { display:flex }`) defined in the `<style>` block, but the actual
  element used inline `style="display:none"` with no class, and JS toggled it via
  `banner.style.display = ''`. The class toggle was completely disconnected. Unified to
  use the class system: element now has class `draft-banner`, JS calls
  `classList.add/remove('show')`.

- `showDraftIndicator(true)` was setting `style.display = ''` (inherits as block) instead
  of `style.display = 'flex'`. Fixed.

- `loadRecordsList()` interpolated `r.patient_name`, `r.patient_date`, `r.form_type`
  directly into `innerHTML` string. Wrapped with `escapeHtml()`. Low-risk in a local app
  but trivial to fix now that the helper exists.

**Refactoring done (main.js):**

- Added 3 shared MPIS constants at top of Main IIFE:
    `MPIS_LN`, `MPIS_DIV`, `MPIS_DASH`
  Previously each of the 5 `copyToMpis*` functions redeclared these identically.

- Added `escapeHtml(str)` — sanitises strings before innerHTML injection.

- Added `copyText(str)` — single implementation of the clipboard try/catch fallback.
  Previously copy-pasted verbatim into all 5 MPIS functions (25 lines × 5 = 125 lines gone).

- Added `mpisSec(parts, title, val)` — the shared section helper.
  Previously `function sec(title, val)` was redeclared inside each of the 5 MPIS functions.

- Each `copyToMpis*` function now declares:
    `var LN = MPIS_LN; var DIV = MPIS_DIV; var dash = MPIS_DASH;`
    `function sec(title, val) { mpisSec(parts, title, val); }`
  and ends with `await copyText(parts.join(LN));` instead of the clipboard block.

- Topbar button order in base.html corrected to match documented spec:
    `[← Return | Save & Return] | [+ New | Clear] | [🌙 | Copy to MPIS | Export KKM PDF] | [Save Record]`
  Previously "Destructive group" comment label was misleading; New/Clear aren't destructive
  (New auto-saves). Comment updated to "Form group".

**net result:** main.js 1164 → 1126 lines. All public APIs unchanged.

---

### Retrospective

**What went smoothly:**
- The refactor was safe because all helpers produce identical output — just extracted, not changed.
- `node --check` caught nothing (good). All 3 modified JS files passed.
- str_replace discipline held up — re-read file after each edit, no orphaned code.

**What was fiddly:**
- The spine `copyToMpisSpine()` refactor accidentally consumed the `parts.push('SPINE ASSESSMENT')`
  line inside the str_replace. Caught by re-reading the function immediately after the edit.
  Required a second pass to restore it. This is the orphaned-code pattern in reverse —
  the replacement omitted a line rather than leaving dead code behind. Always re-read.

**What we'd do differently:**
- The CSS class vs inline style conflict on draft-banner was a "define it twice" bug —
  the class was defined in CSS but the element never used it. In future: if a class exists
  for show/hide behaviour, don't also add inline style to the element. Pick one mechanism.
- `display:''` to "reset" an element is fragile — it inherits the element's default
  (block for div), which isn't always what you want. Prefer explicit `display:'flex'`
  or `display:'block'` when the rendered type matters.

---

### Known issues (updated)

**Still open:**
- Age auto-calculation (NRIC→age, DOB→age) — unresolved, deprioritised
- Geriatric duplicate RN/IC fields — cosmetic, low priority
- No unique constraint on episode_id in records table — ORDER BY workaround in place
- audit_log FK has no ON DELETE CASCADE — orphaned rows harmless but untidy
- pt_assessment.spec datas includes templates/pdf redundantly
- No ARIA attributes anywhere (toast, progress bar, sidebar nav) — low clinical priority
- Accessibility: sidebar nav uses onclick divs, not buttons — not keyboard navigable

**Fixed this session:**
- draft-indicator duplicate display:none ✓
- draft-banner class/inline style conflict ✓
- showDraftIndicator() block vs flex ✓
- XSS in loadRecordsList() innerHTML ✓
- Topbar button order ✓
- MPIS code duplication (5× sec/LN/DIV/clipboard) ✓

---

### What to do next session
1. Git push — this has been on the list for 3 sessions
2. HAND or NEURO form (HAND simpler, NEURO higher clinical value)
3. Full exe build test (all 5 forms end-to-end)
4. Validation layer UI — surface REQUIRED_FIELDS errors to the user before save

### Architecture reminders for next session
- New MPIS formatter: use MPIS_LN/DIV/DASH + mpisSec() + copyText() — see step 8 of checklist
- Shared helpers live at the top of the Main IIFE (lines ~10–40 in main.js)
- Draft banner: uses CSS `.show` class toggle, not `style.display`
- Always re-read the full replaced function after any str_replace — missing lines are as
  dangerous as orphaned lines, and harder to spot

---

## HANDOVER NOTE — Code Review Session 2026-04-26

### What happened this session

Short focused session: full code review of the codebase, followed by targeted bug fixes.
No new features added. All changes are correctness/quality fixes.

**Bugs fixed:**
- `export_pdf()` in app.py had 8 lines of dead code after `return response` — leftover
  from a str_replace that didn't remove the old body. Included a duplicate `except Exception`
  block that could silently swallow errors. Removed entirely.
- `get_episode_record()` used `fetchone()` with no `ORDER BY`. If two records ever existed
  for one episode, SQLite returned whichever it felt like. Now `ORDER BY updated_at DESC LIMIT 1`.
- `api_stats()` used `__import__('database')` and `__import__('flask')` despite both being
  already imported at top of file. Replaced with direct `get_conn` and `jsonify` calls.
- Migration `ALTER TABLE` caught bare `Exception` — masks real errors like disk-full or
  column name typos. Narrowed to `sqlite3.OperationalError`.

**Issues identified but deferred (see TODO):**
- 5 copy-paste form route handlers in app.py — should be one generic `/form/<form_id>` route
- No `ON DELETE CASCADE` on FK declarations — manual cascade in delete_patient() covers it,
  but schema should document intent explicitly
- CR and AMPUTATION missing from REQUIRED_FIELDS — those forms save with empty diagnosis
- `get_episode_record()` has no unique constraint on episode_id in records table — multiple
  records per episode is possible; ORDER BY fixes the symptom but not the root cause
- `audit_log` FK has no ON DELETE CASCADE — audit rows from update operations persist
  after a record is deleted (orphaned but harmless)
- `pt_assessment.spec` datas includes `templates/pdf` redundantly (already under `templates`)

### What to do next session
1. HAND or NEURO form — HAND is simpler warmup, NEURO is higher clinical value
2. Add CR + AMPUTATION to REQUIRED_FIELDS while the file is open
3. Git push — seriously, do this first
4. Full exe build test (all 5 forms end-to-end)

---

## HANDOVER NOTE — Session 2026-04-26

### What happened this session (~8 hours)

Long session covering Amputation form from scratch, multiple PDF layout iterations,
architectural improvements, and planning discussions.

**Amputation Form (fully implemented):**
- Full HTML form (12 sections): patient info, diagnosis, pain+phantom, special questions,
  prosthetic usage, body chart, history, observation, palpation/CR, movement+MMT,
  stump measurement + outcome (MRMI/TUG/2MWT with skip option), PT impression + goals
- form_amputation.js with full collect/populate/reset, pain sliders, irr chips,
  management dropdown with surgery date reveal, phantom toggle, outcome skip toggle,
  MMT table with named addMmtRow()/addMovRow() functions (no inline onclick JS)
- pdf_amputation.py: KKM-style two-column layout with continuous ruled sections,
  _ensure_dict() for JSON string handling, sign_chop_block() for sign/chop footer
- MPIS formatter copyToMpisAmputation() in main.js
- AMPUTATION_SOAP templates with objective category (MRMI scoring template)
- Body chart properly wired: bodyChart key (camelCase), getData()/loadData()/clearAll()

**Infrastructure improvements:**
- Episode modal: all 15 forms shown, not-ready greyed with "Soon" badge
- sign_chop_block() helper in pdf_platypus_base — all 5 generators now use it
- Session header fields in SOAP modal: Nombor Giliran, KPI-SS-30 min, Dilihat, Temujanji
- SOAP MPIS output follows actual dept POMR format (Malay headers)
- DB migration for soap_notes new columns (safe ALTER TABLE + try/except)
- getCurrentFormType() fixed to check _form_type first
- exportPdf() autosave on dirty form (not just unsaved)
- clinical_templates insert() null focus bug fixed

**Planning discussion:**
- Acknowledged this is drifting toward a dept-wide system (both Claude and GPT senior dev noticed)
- Reviewed GPT senior dev recommendations: validation, draft/final state, audit trail,
  schema versioning, UI friction. All valid. Priority: finish forms first, then harden.
- POMR docs exist for all 15 forms — these are the feature spec for remaining forms
- Next form priority: NEURO (high volume) after HAND (simpler warmup)

### Current known issues / things to watch
- Age auto-calculation (NRIC→age, DOB→age) — still unresolved from earlier sessions,
  has been deprioritised but worth revisiting when building NEURO form
- Geriatric has duplicate RN/IC fields — cosmetic, low priority
- PDF layout for amputation has had many iterations — if more issues arise,
  check two_col() lw/rw params and INN width for nested tables first

### What to do next session
1. HAND or NEURO form (HAND simpler, NEURO higher clinical value)
2. Share remaining POMR docs when dept colleagues finish them (BURN, FACIAL etc.)
3. Geriatric RN/IC cleanup
4. Consider validation layer (required fields hard stop) — GPT senior dev is right
5. Git push! (been on the list for multiple sessions)

### Architecture reminders for next session
- New form checklist in CLAUDE.md — follow it exactly
- Session header = FREE (already in SOAP modal for all forms)
- sign_chop_block() = FREE (call it in right2() or wherever sign goes)
- bodychart.js API = getData() / loadData() / clearAll() — NOT collect/populate
- Always node --check new JS files before packaging
- Always run local PDF test before declaring done
- Check for orphaned code after large str_replace operations


---

## HANDOVER NOTE — Session 2026-04-25

### What happened this session (8 hours)

Started with CR form GUI refinements, ended with a fully centralised architecture.
Main achievements:

**CR Form (completed):**
- All dropdowns for observation (breathing pattern, chest deformity, sputum, drain, etc.)
- Interactive lung auscultation diagram (lungchart.js) — 6 zones, radiological view,
  click-to-mark with finding picker, findings feed into PDF LungDiagramFlowable
- MPIS generator for CR (copyToMpisCr)
- CR SOAP templates (CR_SOAP category)
- PDF export wired end-to-end

**Infrastructure (major refactor):**
- FORM_REGISTRY in app.py — 15 forms, dynamic sidebar, groups, collapsible
- initFormContext() in main.js — centralised patient prefill, episode wrapper,
  auto-load, nav buttons. All 4 existing forms stripped of boilerplate.
- window.Form contract established and enforced across all form JS files
- form_base.js onPtTypeChange null-guarded (fixes geriatric crash)
- clinical_templates.js fully rewritten (was structurally broken)
- Context-aware form switching via navigateForm() (preserves URL params)
- Export KKM PDF passes ?form_type= so correct generator always used
- Sidebar collapse (hamburger) + group collapse (chevron) with localStorage persistence
- Edit patient modal restored in home.html
- NRIC validation warning for invalid date in registration modal
- GERIATRIC_SOAP and SPINE_SOAP added (was using MS_SOAP for all forms before)

### Current known issues
- Geriatric form has duplicate RN/IC fields — cosmetic, low priority
- pdf_cr.py may not be in pt_assessment.spec yet — VERIFY before next build

### What to do next session
1. Verify pdf_cr.py is in pt_assessment.spec (check datas list)
2. Full end-to-end test of the .exe build
3. Push to GitHub
4. Geriatric duplicate field cleanup
5. Decide which form to build next (NEURO recommended for clinical volume,
   HAND recommended for simpler scope as warmup)
