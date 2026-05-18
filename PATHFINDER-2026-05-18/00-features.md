# PT Assessment System — Feature Inventory
**Generated:** 2026-05-18 by /pathfinder

---

## Feature Boundaries

| # | Feature | Core Files | Entry Points | Purpose |
|---|---------|-----------|--------------|---------|
| F1 | **Patient Registry** | `app.py`, `database.py`, `templates/patient.html`, `static/js/form_base.js` | `app.py:146` `api_patient_search`, `app.py:155` `api_create_patient`, `app.py:166` `api_get_patient`, `app.py:174` `api_delete_patient`, `app.py:182` `api_update_patient` | Create, search, update, delete patient demographics. NRIC-derived DOB/sex/age. |
| F2 | **Episode Management** | `app.py`, `database.py`, `templates/episode.html` | `app.py:192` `api_patient_episodes`, `app.py:200` `api_create_episode`, `app.py:211` `api_get_episode`, `app.py:219` `api_episode_status`, `app.py:230` `api_update_episode_appt` | Track a referral course (one form type, active/discharged status, appointment scheduling). |
| F3 | **Assessment Form Entry** | `app.py`, `database.py`, `static/js/main.js`, `static/js/form_base.js`, `static/js/form_*.js`, `templates/forms/*.html`, `templates/base.html` | `app.py:129` `form_view`, `window.Form.collect()`, `window.Form.populate()`, `window.Form.reset()`, `Main.saveRecord()`, `Main.autosave()` | Structured KKM form data entry (7 active specialities). Includes autosave/draft recovery via localStorage. |
| F4 | **SOAP Follow-Up Notes** | `app.py`, `database.py`, `templates/episode.html` | `app.py:248` `api_get_soaps`, `app.py:256` `api_save_soap`, `app.py:267` `api_delete_soap` | Per-session SOAP progress notes with POMR session metadata (queue no, KPI-30min, seen-by, next appt). |
| F5 | **Interactive Diagram Widgets** | `static/js/bodychart.js`, `static/js/handchart.js`, `static/js/lungchart.js` | `BodyChart.init()`, `HandChart.init()`, `LungChart.init()` | Visual clinical annotation tools (body pain chart, bilateral hand chart, lung auscultation diagram). Data returned via `.getData()` for inclusion in form collect. |
| F6 | **Dynamic Clinical Tables** | `static/js/movement_table.js`, `static/js/mmt_table.js`, `static/js/inv_med_table.js` | `MovementTable.init(config)`, `MmtTable.init(config)`, `InvMedTable.init()` | Row-based data entry for ROM measurements, MMT muscle grading, investigations, medications. Each widget manages its own DOM rows. |
| F7 | **MPIS Copy-to-Clipboard** | `static/js/main.js`, `templates/episode.html` | `Main.copyToMpisAuto()`, `copySOAPtoMpis()` (episode.html) | Format assessment/SOAP data as POMR plain text for clipboard paste into hospital MPIS. No API. |
| F8 | **PDF Export** | `app.py`, `pdf_platypus_base.py`, `pdf_ms.py`, `pdf_spine.py`, `pdf_geriatric.py`, `pdf_cr.py`, `pdf_amputation.py`, `pdf_neuro.py`, `pdf_hand.py`, `pdf_base.py`, `pdf_generator.py` | `app.py:360` `export_episode_pdf`, `app.py:398` `export_pdf`, `api.js:36` `API.exportPdf` | Generate KKM-compliant A4 PDFs (assessment + SOAP pages). Per-form generators share `pdf_platypus_base.py`. |
| F9 | **Clinical Text Templates** | `static/js/clinical_templates.js` | `ClinicalTemplates.show(fieldId, formType, category)`, `ClinicalTemplates.addButton()` | Pre-written KKM "Best Statement" snippets per form type and section category. Modal picker appends to textarea. |
| F10 | **Dashboard and Stats** | `app.py`, `database.py`, `templates/home.html` | `app.py:276` `api_stats`, `app.py:290` `api_dashboard_seen_today`, `app.py:302` `api_dashboard_active_patients`, `app.py:99` `index` | Home screen: seen-today summary, active patients list, aggregate counters. |
| F11 | **App Packaging** | `app.py`, `pt_assessment.spec` | `app.py:45` `resource_path`, `app.py:51` `data_path`, `app.py:426` `open_browser` | PyInstaller bundle targeting Windows. Resource path shimming for dev vs exe contexts. Auto-open browser. |

---

## Boundary Decisions & Notes

- **Draft/Autosave merged into F3** — both live in `main.js` and share the form lifecycle. Not a standalone concern.
- **`pdf_generator.py` and `pdf_base.py`** — flagged as legacy (canvas-based). `pdf_generator.py` appears superseded by `pdf_ms.py`. `pdf_base.py` is still used by `BodyChartFlowable` in `pdf_platypus_base.py` for the body figure draw. Treated as F8 sub-components.
- **`form.js`** — discovered by subagent as potentially a legacy stub. Appears to be a pre-refactor `window.Form` direct export. May be dead code. Worth investigating in Phase 2.
- **`_form_type` casing inconsistency** — Spine/Geriatric/Amputation use lowercase ids in collect(); HAND/NEURO use uppercase. Potential routing risk. Flagged for Phase 2.
- **F9 (Clinical Templates) is a sub-concern of F3** but is a standalone IIFE module. Kept separate because it has its own duplication risk (SOAP template placement bug pattern is already documented in WORKFLOW.md).

---

## Features Excluded from Phase 1 Flowcharts

The following features are trivial (simple DB query → JSON response, or pure config) and will be covered in the duplication report only if relevant:
- **F10 Dashboard** — 3 straight read queries, no business logic
- **F11 Packaging** — `resource_path()` + spec file, no control flow worth diagramming

**Flowcharts will be produced for: F1–F9.**
