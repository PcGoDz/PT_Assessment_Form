# CLAUDE.md — PT Assessment System Project Bible

Read this at the start of every session. It contains rules, decisions, lessons,
and context established during development. Keep it updated as things change.

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
  movement_table.js     — Dynamic ROM table (IIFE)
  clinical_templates.js — Best Statement templates (MS, SPINE, GERIATRIC, CR + SOAP variants)
  main.js               — Init, autosave, MPIS copy, dark mode, initFormContext()

templates/
  base.html             — Shell: topbar, sidebar (dynamic FORM_REGISTRY), progress bar
  home.html             — Patient dashboard, search, episode list, edit patient modal
  episode.html          — Episode detail, SOAP timeline, export button
  forms/ms.html         — MS assessment form
  forms/spine.html      — Spine assessment form
  forms/geriatric.html  — Geriatric assessment form
  forms/cr.html         — CR assessment form (interactive lung diagram)
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
| NEURO       | Neurological      | NO    |
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
  _PDF_GENERATORS        = { MS, SPINE, GERIATRIC, CR, AMPUTATION }
  _SINGLE_PDF_GENERATORS = { MS, SPINE, GERIATRIC, CR, AMPUTATION }

Export KKM PDF button passes getCurrentFormType() as ?form_type= so the correct
generator is always used regardless of what's stored in the record.
getCurrentFormType() checks d._form_type first (amputation/cr/etc), then d.meta.form
(MS/spine/etc), then falls back to MS. New forms must set _form_type in collect().

---

## Adding a New Form — Full Checklist

1.  Add entry to FORM_REGISTRY in app.py, set ready=True
2.  Add /form/xxx route in app.py passing current_form='XXX', episode_id, patient_id, patient
    NOTE: These 5 routes are copy-paste duplicates. A generic /form/<form_id> route is on the
    TODO — until that's done, copy carefully and don't miss wiring the template name.
3.  Create templates/forms/xxx.html extending base.html
    - Only needs: form HTML sections + extra_js block with form-specific init
    - NO boilerplate needed — initFormContext() handles patient prefill, nav buttons, auto-load
4.  Create static/js/form_xxx.js:
    - window.ActiveForm = { collect, populate, reset, ... }
    - window.Form = { collect, populate, reset, onPtTypeChange, onNricInput, onDobChange }
      (window.Form is REQUIRED — missing it crashes main.js init)
4.5 Add form's required fields to REQUIRED_FIELDS dict in database.py.
    DO NOT skip this. A form without REQUIRED_FIELDS entries saves silently with empty data.
5.  Create pdf_xxx.py with generate_episode_pdf() and generate_xxx_pdf()
6.  Add to _PDF_GENERATORS and _SINGLE_PDF_GENERATORS in app.py
7.  Add pdf_xxx.py to pt_assessment.spec under datas (DO NOT FORGET — silent failure)
8.  Add MPIS formatter copyToMpisXxx() in main.js, wire into copyToMpisAuto()
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

## TODO (next session priority order)

### High Priority
- [ ] HAND or NEURO form (HAND simpler warmup; NEURO higher clinical volume)
- [ ] Full end-to-end test of exe build (all 5 forms)
- [ ] Git push — this has been on the list too long
- [ ] Add CR + AMPUTATION entries to REQUIRED_FIELDS in database.py

### Medium Priority
- [ ] Validation layer — hard stop on required fields before save (REQUIRED_FIELDS exists, just needs CR/AMPUTATION + UI enforcement)
- [ ] Generic form route /form/<form_id> to replace 5 copy-paste handlers in app.py
- [ ] Geriatric duplicate RN/IC fields cleanup (cosmetic, low effort)
- [ ] Age auto-calculation bug (NRIC->age, DOB->age) — still unresolved, revisit when building NEURO

### Lower Priority
- [ ] Draft vs Final state for assessment records
- [ ] Versioning UI (audit_log data exists, no UI yet)
- [ ] Remaining 10 forms: BURN, SCI, VESTIBULAR, FACIAL, PAEDIATRIC, LYMPHOEDEMA, NCD, GENERAL
- [ ] POMR-aligned MPIS output for assessment forms (currently uses assessment format)

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

---

## What's Done (as of 2026-04-25)

- [x] Patient registration with NRIC auto-derive (DOB/age/sex)
- [x] Patient edit modal in home.html
- [x] Episode management (create, discharge with reason, reactivate)
- [x] Delete patient (cascade wipe, two-step confirm)
- [x] MS assessment form + PDF + MPIS + SOAP templates
- [x] Spine assessment form + PDF + MPIS + SOAP templates
- [x] Geriatric assessment form + PDF + MPIS + SOAP templates
- [x] CR assessment form + PDF + MPIS + SOAP templates
- [x] Body chart (SVG anterior + posterior, 6 pain types, markers in PDF)
- [x] Lung chart (SVG 6 zones, radiological view, click-to-mark, findings -> PDF)
- [x] Clinical templates for all 4 forms (assessment + per-form SOAP variants)
- [x] SOAP follow-up notes (session numbered, per-form-type templates)
- [x] PDF export for all 5 forms (episode PDF + single record PDF)
- [x] MPIS clipboard copy for all 5 forms (MS, Spine, Geriatric, CR, Amputation)
- [x] Amputation form — full implementation (HTML, JS, PDF, MPIS, SOAP templates, body chart)
- [x] Episode modal — all 15 form cards shown, not-ready ones greyed out with "Soon" badge
- [x] sign_chop_block() helper in pdf_platypus_base — used by all 5 PDF generators
- [x] Session header fields in SOAP modal (Nombor Giliran, KPI-SS-30 min, Dilihat, Temujanji)
- [x] SOAP MPIS output follows POMR format (Malay headers matching dept Word template)
- [x] clinical_templates.js insert() null focus bug fixed
- [x] getCurrentFormType() now checks _form_type first (fixes amputation export routing)
- [x] BodyChart body_chart→bodyChart key fixed (body chart markers now appear in PDF)
- [x] pdf_amputation.py _ensure_dict() — handles patient/bodyChart as JSON strings from DB
- [x] exportPdf() autosave now triggers on dirty form, not just unsaved form
- [x] Autosave to localStorage (3s debounce) + draft recovery on reload
- [x] Dark mode (CSS variables, localStorage persisted)
- [x] Dynamic sidebar from FORM_REGISTRY (15 forms, collapsible groups)
- [x] Sidebar collapse toggle (hamburger button in topbar)
- [x] Context-aware form switching (preserves patient_id + episode_id in URL)
- [x] initFormContext() — zero-boilerplate pattern for all current + future forms
- [x] Export KKM PDF passes current form type to override stored record type
- [x] PyInstaller .exe build (Windows, build.bat)
- [x] Code review: dead code removed from export_pdf() in app.py
- [x] Code review: get_episode_record() now ORDER BY updated_at DESC LIMIT 1 (deterministic)
- [x] Code review: api_stats() __import__ hack replaced with direct imports
- [x] Code review: migration ALTER TABLE now catches sqlite3.OperationalError not bare Exception

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
