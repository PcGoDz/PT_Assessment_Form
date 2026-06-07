# CLAUDE.md — PT Assessment System

Read this at the start of every session. This is the lean index — detailed content lives in companion files.

---

## What this project is

A local offline web app for KKM Physiotherapy Department staff to fill in standardised assessment forms digitally, replacing paper-based workflows. Built with Flask + SQLite + vanilla JS. Packaged as a Windows .exe via PyInstaller.

User: Miruya — physiotherapist, KKM dept, ~12-21 patients/day.
Device: Dept PC (Windows). No internet dependency required.

**Design intent:** Every form should reduce clinician burden, not just digitise paper. Pre-fill what derives (NRIC → DOB/age/gender), template what repeats (Best Statements), stamp what's bulk (NT / N-A), multi-select what's plural. The paper borang is the floor, not the target. This GUIDES design but does NOT override the ship-crude axiom — if a burden-reducer would mean refactoring shared code or inventing an abstraction, ship-crude wins; flag it instead of building it.

---

## Project axioms (DO NOT VIOLATE)

- **Stack:** Flask + SQLite + vanilla JavaScript only. No frameworks, no jQuery.
- **Deployment:** PyInstaller .exe on Windows clinical PCs. Every dependency must bundle cleanly.
- **PDF engine:** ReportLab only. WeasyPrint rejected (needs C libs).
- **MPIS integration:** plain-text paste only. No API. Builder/wrapper/finalizer pattern.
- **Clinical compliance:** Fields must match KKM standardised forms exactly. PT Impression (not Diagnosis). Preserve KKM typos in PDFs.
- **Ship-crude philosophy:** match existing form patterns even if aesthetically ugly. NO refactors of shared code (form_base.js, pdf_platypus_base.py, bodychart.js, etc.) without explicit request.
- **UI consistency:** all forms follow DESIGN_SYSTEM.md. MS form (`templates/forms/ms.html`) is the canonical visual reference. Layout primitives (cards, sidebar nav, .fg grid) are non-negotiable across all forms; section structure adapts to clinical domain.
- **No test suite:** Do NOT push TDD on UI layer. Backend smoke checks OK if quick.
- **Topbar button order** (left→right): [← Return | Save & Return] | [+ New | Clear] | [🌙 | Copy to MPIS | Export KKM PDF] | [Save Record]. Save Record is always rightmost. Do NOT reorder.

---

## Architecture overview

```
app.py                  Flask routes, PDF routing dispatch, FORM_REGISTRY (15 forms)
database.py             All SQLite logic + validation
pdf_platypus_base.py    Shared Platypus building blocks
pdf_<form>.py           Per-form PDF generators (ms, spine, geriatric, cr, amputation, neuro, hand, burn)
pdf_base.py             Legacy canvas primitives (kept for BodyChartFlowable)

static/js/
  api.js                All fetch calls to Flask
  bodychart.js          Body chart SVG marker logic (IIFE)
  handchart.js          Hand chart SVG marker logic — R+L palmar, IIFE
  lungchart.js          Lung auscultation diagram, 6 zones, radiological view
  form_base.js          Shared patient fields, NRIC derive, age calc (window.FormBase)
  form_<form>.js        Per-form collect/populate/reset → window.ActiveForm + window.Form
  assessment_grid.js    Fixed-row grid FACTORY (multi-instance; config-driven; greyed-cell-aware)
  movement_table.js     Dynamic ROM table (IIFE)
  clinical_templates.js Best Statement templates (per form + SOAP variants)
  main.js               Init, autosave, MPIS copy, dark mode, initFormContext()

templates/
  base.html             Shell: M3 context bar, section rail, progress bar
  home.html             Patient dashboard, search, episode list
  episode.html          Episode detail, SOAP timeline, export button
  forms/<form>.html     Per-form HTML
```

---

## Form Registry

15 forms total. SINGLE SOURCE OF TRUTH is `FORM_REGISTRY` in app.py.

| Form        | Group             | Ready |
|-------------|-------------------|-------|
| MS          | Musculoskeletal   | YES   |
| SPINE       | Musculoskeletal   | YES   |
| HAND        | Musculoskeletal   | YES   |
| AMPUTATION  | Musculoskeletal   | YES   |
| BURN        | Musculoskeletal   | YES   |
| NEURO       | Neurological      | YES   |
| SCI         | Neurological      | YES   |
| VESTIBULAR  | Neurological      | NO    |
| FACIAL      | Neurological      | NO    |
| CR          | Cardiorespiratory | YES   |
| GERIATRIC   | Rehabilitation    | YES   |
| PAEDIATRIC  | Rehabilitation    | NO    |
| LYMPHOEDEMA | Rehabilitation    | NO    |
| NCD         | Rehabilitation    | NO    |
| GENERAL     | Rehabilitation    | NO    |

To add: set ready=True in registry. Follow checklist in WORKFLOW.md.

---

## PDF Routing (CRITICAL — do not break)

Two export routes in app.py:
- `/api/episodes/<id>/pdf` — episode export. Uses `_PDF_GENERATORS`.
- `/api/export/<record_id>/pdf` — single record. Uses `_SINGLE_PDF_GENERATORS`.
  Priority: `?form_type=` query param > `_form_type` in data > `meta.form` > MS fallback.

PDF generators are declared as `pdf_episode`/`pdf_single` keys on each ready `FORM_REGISTRY` row; `_PDF_GENERATORS` and `_SINGLE_PDF_GENERATORS` are derived from the registry via dict-comp — do not hand-edit them. Forms must set `_form_type` in `collect()` or PDF routing breaks.

---

## window.Form — REQUIRED CONTRACT

Every form_xxx.js MUST expose `window.Form` with `collect, populate, reset, onPtTypeChange, onNricInput, onDobChange`. Missing any of these crashes main.js init() silently.

`collect()` MUST return BOTH `_form_type: 'XXX'` AND `meta: { form: 'XXX' }`. Missing either = silent wrong PDF or 422 on save.

---

## Database

Single SQLite file at `pt_data/records.db`. Schema in database.py.

Key tables: `patients`, `episodes`, `records`, `soap_notes`, `audit_log`.

SOAP notes carry session header fields: `queue_no`, `kpi_30min`, `seen_by`, `next_appt`, `next_appt_time`. These are shared across ALL forms automatically via episode.html — do NOT add them to individual forms.

---

## Where to find what

- **RULES.md** — How to work with Miruya (skill level, partnership rules, communication preferences, behavioral DOs and DON'Ts).
- **WORKFLOW.md** — Procedures: adding new forms, MPIS builder pattern, build/deploy, debugging steps.
- **DESIGN_SYSTEM.md** — UI patterns for form templates AND PDF output. Layout primitives (non-negotiable), component recipes, anti-patterns. Read before writing any form HTML or PDF generator. Now includes a PDF Layout section (added Session C).
- **HANDOVER.md** — Current session state, what's half-done, next session priorities. Overwrite each session.
- **BACKLOG.md** — Known issues, deferred work, persistent reminders (git push), TODO list.
- **ARCHIVE/** — Historical handover notes and old lessons-learned sections. Don't load unless investigating history.

---

## Clinical context (compressed)

- **Malaysian NRIC:** YYMMDD-PB-XXXG format. G odd=male, even=female. DOB century: 00-29 = 2000s, 30-99 = 1900s.
- **KKM Form refs:** preserve exactly per form (e.g. HAND: `fisio / b.pen. 12 / Pind. 2 / 2019`).
- **Lung Diagram (CR):** radiological convention — patient RIGHT on viewer's LEFT, labelled R.
- **MPIS POMR format:** TARIKH / NOMBOR GILIRAN / KPI-SS-30 MINIT / DILIHAT / [content] / TEMUJANJI.

Full clinical details in WORKFLOW.md under "Clinical Reference".
