# CLAUDE.md — PT Assessment System Project Bible

Read this at the start of every session. It contains rules, decisions, and
context established during development. Keep it updated as things change.

---

## What This Project Is

A local offline web app for KKM Physiotherapy Department staff to fill in
standardised assessment forms digitally, replacing paper-based workflows.
Built with Flask + SQLite + vanilla JS. Packaged as a Windows `.exe` via PyInstaller.

**Current user:** Miruya — physiotherapist, KKM dept, ~12-21 patients/day.
**Primary device:** Dept PC (Windows). No internet dependency required.
**Future:** May integrate with HIS (hospital information system) — TBD.

---

## Current Architecture

```
app.py                  — Flask routes + PDF routing dispatch
database.py             — All SQLite logic + validation
pdf_base.py             — Shared ReportLab primitives (figure, markers, SOAP page, helpers)
pdf_ms.py               — MS assessment PDF generator (bespoke KKM layout)
pdf_spine.py            — Spine assessment PDF generator (bespoke KKM layout)
pdf_geriatric.py        — Geriatric assessment PDF generator (bespoke KKM layout)
pdf_generator.py        — Legacy standalone MS generator (kept for reference, not used)

static/css/style.css    — All styles, dark mode via CSS variables
static/js/
  api.js                — All fetch calls to Flask
  bodychart.js          — Body chart SVG marker logic (IIFE)
  form_base.js          — Shared patient fields, NRIC derive, age calc (exposes window.FormBase)
  form_ms.js            — MS collect/populate/reset, registers as window.ActiveForm
  form_spine.js         — Spine collect/populate/reset, registers as window.ActiveForm
  form_geriatric.js     — Geriatric collect/populate/reset, registers as window.ActiveForm
  movement_table.js     — Dynamic ROM table (IIFE)
  clinical_templates.js — Best Statement templates for MS, SPINE, GERIATRIC
  main.js               — Init, autosave, save/load, MPIS copy (all 3 forms), dark mode

templates/
  base.html             — Shell: topbar, sidebar, progress bar (extended by all forms)
  home.html             — Patient dashboard, search, episode list
  episode.html          — Episode detail, SOAP timeline, export button
  forms/ms.html         — MS assessment form
  forms/spine.html      — Spine assessment form
  forms/geriatric.html  — Geriatric assessment form
```

### PDF Routing (CRITICAL)
`app.py` has two export routes:
- `/api/episodes/<id>/pdf` — episode export (assessment + SOAPs). Routes via `_PDF_GENERATORS` dict.
- `/api/export/<record_id>/pdf` — single record export. Routes via `_SINGLE_PDF_GENERATORS` dict.

Both dicts live at module level in `app.py`:
```python
_PDF_GENERATORS = {
    'MS':        pdf_ms.generate_episode_pdf,
    'SPINE':     pdf_spine.generate_episode_pdf,
    'GERIATRIC': pdf_geriatric.generate_episode_pdf,
}
_SINGLE_PDF_GENERATORS = {
    'MS':        pdf_ms.generate_ms_pdf,
    'SPINE':     pdf_spine.generate_spine_pdf,
    'GERIATRIC': pdf_geriatric.generate_geriatric_pdf,
}
```

### MPIS Clipboard Routing
`main.js` has `copyToMpisAuto()` which collects form data, reads `_form_type`,
and dispatches to the correct MPIS formatter:
- `'MS'` → `copyToMpis()`
- `'SPINE'` → `copyToMpisSpine()`
- `'GERIATRIC'` → `copyToMpisGeriatric()`

Form type identifiers:
- MS: `data.meta.form = 'MS'`
- Spine: `data._form_type = 'spine'` AND `data.meta.form = 'SPINE'`
- Geriatric: `data._form_type = 'geriatric'`

---

## Database Schema

```
patients    — id, name, ic, passport, pt_type, dob, sex, country
episodes    — id, patient_id, form_type, referral_date, status
             status: "active" or "discharged|Reason"
records     — id, episode_id, form_type, patient_name, patient_rn, patient_date, data_json
soap_notes  — id, episode_id, session_no, note_date, subjective, objective, analysis, plan
audit_log   — id, record_id, action, changed_at, data_json
```

**JSON blob is source of truth. SQLite columns are for display only.**
All real data lives in `data_json`. Never treat display columns as authoritative.

---

## Assessment Forms — Status

| Form | UI | PDF | MPIS | Status |
|------|----|-----|------|--------|
| Musculoskeletal (MS) | ✅ | ✅ | ✅ | Done |
| Spine | ✅ | ✅ | ✅ | Done |
| Geriatric | ✅ | ✅ | ✅ | Done |
| Cardiorespiratory | ❌ | ❌ | ❌ | Planned |
| Obesity | ❌ | ❌ | ❌ | Planned |
| Neurological | ❌ | ❌ | ❌ | Planned |

### Adding a New Form Type — Checklist
1. Create `templates/forms/xxx.html` extending `base.html`
2. Create `static/js/form_xxx.js` — collect/populate/reset, registers `window.ActiveForm`
3. Create `pdf_xxx.py` — standalone bespoke generator matching KKM borang layout
4. Add `pdf_xxx.py` to `pt_assessment.spec` under `datas` ← **DO NOT FORGET**
5. Add to `_PDF_GENERATORS` and `_SINGLE_PDF_GENERATORS` in `app.py`
6. Add `generate_episode_pdf()` and `generate_xxx_pdf()` functions to `pdf_xxx.py`
7. Add `/form/xxx` route in `app.py`
8. Enable form card in `home.html` episode modal (remove `soon` class, add `onclick`)
9. Add MPIS formatter in `main.js`, wire into `copyToMpisAuto()`
10. Add clinical templates to `clinical_templates.js`
11. Set `_form_type` in `form_xxx.js` collect output
12. Recompile with `build.bat`

---

## PyInstaller Build Rules (CRITICAL — LEARN FROM PAST PAIN)

- Every new `.py` file MUST be added to `pt_assessment.spec` under `datas` before building
- Current bundled Python files in spec:
  `app.py`, `database.py`, `pdf_generator.py`, `pdf_base.py`,
  `pdf_ms.py`, `pdf_spine.py`, `pdf_geriatric.py`
- After ANY code change → must recompile with `build.bat`
- Running the old `.exe` after code changes will silently use old code — no error shown
- Symptoms of missing spec entry: wrong PDF generator called, import errors, features that
  work in dev but not in `.exe`

---

## Non-Negotiable Rules

### 1. Dependency Rule
Pure Python only. No system-level dependencies.
- WeasyPrint rejected — needs Cairo, Pango (C libs). ReportLab is the PDF engine.
- Every dependency must bundle cleanly on Windows via PyInstaller.

### 2. UX Rule
Shortest path always. Clinician has 12-21 patients/day.
- Export PDF → auto-saves first if not saved
- New button → auto-saves before clearing
- Never add friction between the user and their primary action

### 3. Clinical Rule
- Fields must match KKM standardised form exactly for audit compliance
- Preserve KKM typos in PDF (e.g. double space in `MUSCULOSKELETAL  ASSESSMENT FORM`)
- Use "PT Impression" not "PT Diagnosis" — physios cannot diagnose
- "ACCESSORRY" (double R) is a KKM typo — preserve it in spine PDF

### 4. JS Rules
- `window.FormBase` must be exposed before any inline HTML handler calls it
- All inline HTML handlers must use `window.FormBase.xxx` not `FormBase.xxx`
  (const is block-scoped and unreliable from HTML attributes)
- Never write literal newlines in JS strings via Python — use `\n` in string ops only
- Always syntax-check new JS with `node -e "new Function(...)"` before packaging

### 5. PDF Rules
- Each form type has its own standalone PDF generator — no shared `_page1` tricks
- PDF generators read from each form's specific data structure (not a unified schema)
- MS/Spine use nested data: `data.pain.pre`, `data.history.current`, etc.
- Geriatric uses flat data: `data.pain_score`, `data.hx_current`, etc.
- Body chart markers rendered as coloured circles with ID numbers
- Always match KKM borang ref number exactly (different per form type)
- **CRITICAL: Every `box()` call inside a two-column layout MUST pass explicit `width=LW` or `width=LW2`.**
  Default is `CW` (full page width) which overdraws into the adjacent column. Right column boxes
  already do this — never omit it for left column boxes either.
- `two_col()` wraps each column in `_col_wrap()` — do not bypass or inline raw lists into Table cells
- `S_NORMAL` leading is 13 — do not revert to 11
- SOAP notes are fixed half-page height (~133.5mm), paired 2-per-page with `KeepTogether` at pair level

### 6. Code Patching Rule
When patching files with Python string replacement:
- Always verify the pattern exists before writing
- Use exact string matching — check output, don't assume
- Never patch the same string twice accidentally

---

## Key Clinical Context

### Malaysian NRIC Logic
- 12 digits, no dashes
- First 6 = YYMMDD (birthdate)
- Last digit: odd = Male, even = Female
- Year: if YY <= current year's last 2 digits → 2000s, else 1900s
- Auto-derives DOB, age, sex on input in new patient modal AND assessment form

### Form Data Structures
**MS & Spine** — nested:
```json
{ "patient": {...}, "pain": {"pre": "5", "nature": "dull"}, 
  "history": {"current": "...", "past": "..."}, "plan": {"impression": "..."} }
```

**Geriatric** — flat:
```json
{ "patient": {...}, "pain_score": "6", "hx_current": "...", 
  "plan_impression": "...", "om_berg": "32" }
```

### KKM Form References
- MS:        `fisio / b.pen. 14 / Pind. 1 / 2019`
- Spine:     `fisio / b.pen. 6 / Pind. 2 / 2019`
- Geriatric: `fisio / b.pen. 15 / 2019`

### Geriatric Outcome Measures
The geriatric PDF has a 3-date-column outcome measures table (for repeat measurements).
Data fills column 1 only — columns 2 and 3 left blank for manual completion at review visits.
N/A checkbox per test stored as `om_na_xxx` boolean in data.

---

## MPIS Integration

**MPIS = Malaysian Patient Information System** (hospital web app)
- Input: single plain text box, fully manual, no file upload
- Format: plain text only, no markdown

**Workflow:** Fill form → Copy to MPIS → paste into MPIS text box.
`copyToMpisAuto()` in `main.js` detects form type and calls the right formatter.

---

## What's Done

- [x] Patient registration with NRIC auto-derive (DOB/age/sex)
- [x] Episode management (create, discharge, reactivate)
- [x] MS assessment form (11 sections, body chart, dynamic ROM table)
- [x] Spine assessment form (13 sections, PAIVM grid, neurodynamic grid)
- [x] Geriatric assessment form (9 sections, outcome measures with N/A, live Berg/TUG badges)
- [x] Body chart (SVG anterior + posterior, 6 pain types, markers in PDF)
- [x] Clinical templates (Best Statement) for all 3 forms
- [x] SOAP follow-up notes with session numbering
- [x] PDF export for all 3 forms (bespoke KKM layout)
- [x] Episode PDF (assessment + all SOAPs)
- [x] Single record PDF export (from saved records list)
- [x] MPIS clipboard copy for all 3 forms
- [x] Copy to MPIS auto-dispatcher
- [x] Autosave to localStorage (3s debounce) + draft recovery
- [x] Dark mode (CSS variables, persisted)
- [x] Collapsible Jump To sidebar nav
- [x] Discharge flow with reason + reactivate
- [x] Delete patient (cascade, two-step confirm)
- [x] Auto-load assessment when opening form from episode
- [x] Patient pre-fill from registration data
- [x] PyInstaller `.exe` build (Windows)

## What's Pending

- [ ] Cardiorespiratory assessment form
- [ ] Obesity assessment form
- [ ] Neurological assessment form
- [ ] Versioning UI (audit_log data exists, no UI to view history yet)
- [ ] Schema versioning field in JSON blob
- [ ] Push codebase to GitHub (mentioned in earlier session)
- [ ] Architecture discussion (GPT raised points about service layer, data validation)

---

## Tone & Working Style

- Casual and direct. No corporate speak.
- Plan before implementing — especially for large features.
- Push back when something doesn't make sense technically or clinically.
- Miruya is a physio, not a developer. Explain tech decisions in plain terms.
- When in doubt about clinical workflow, ask. She knows her job better than the code does.
- Don't rush. Ghost-chasing costs more time than planning.

---

## Handover Note — Session End (2026-04-23, Session 2)

### What Was Done This Session (Session 2)
- Fixed PDF text overlap — root cause: left column `box()` calls missing explicit `width=LW/LW2`, defaulting to full CW and overdrawing into right column
- Fixed `two_col()` — now wraps each column list in `_col_wrap()` single-cell Table to ensure correct x-positioning of nested flowables
- Fixed `BodyChartFlowable` coordinate system — label positions now calculated from actual figure geometry
- Fixed SOAP spacing — switched from 2x2 equalised-height table to fixed half-page height per note, 2 notes per page via explicit pairing with `KeepTogether`
- Fixed ROM table column widths (MS) — content-based mm values instead of guessed proportions
- Fixed patient bar — 4-column layout so Name/Age/Sex/RN/Date don't crowd
- Fixed Sign & Stamp footer (MS, Spine) — matches real KKM form: two stacked lines in a single box
- Fixed Geriatric consent footer — merged right cell for proper signature area
- Bumped `S_NORMAL` leading from 11 to 13 for better readability throughout

### Outstanding Issues (NOT YET FIXED)
- None from previous session. All PDF issues resolved this session.

### Architecture — Current PDF Stack
```
pdf_platypus_base.py   — shared Platypus building blocks (NEW — this session)
pdf_ms.py              — MS PDF using Platypus (REWRITTEN this session)
pdf_spine.py           — Spine PDF using Platypus (REWRITTEN this session)
pdf_geriatric.py       — Geriatric PDF using Platypus (REWRITTEN this session)
pdf_base.py            — Old canvas primitives (KEPT — still used by BodyChartFlowable for figure drawing)
pdf_generator.py       — Legacy standalone (KEPT for reference, not used in routing)
```

### Key Pattern — two_col()
The two-column layout uses a Platypus Table with two cells, each containing a list of flowables.
Platypus sizes each row to the tallest cell. This is correct behaviour but can cause visual imbalance
when columns have very different content amounts. If this is the overlap source, consider splitting
page 1 into explicit stacked sections instead of true two-column layout.

### What To Do Next Session
1. Compile and test the .exe with all PDF fixes
2. Discuss GPT architecture feedback (service layer, data validation, schema) — deferred twice now
3. Plan next assessment form (Cardiorespiratory, Neurological, or Obesity)
4. Push codebase to GitHub
