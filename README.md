# PT Assessment System
**KKM Physiotherapy Department — Digital Assessment Platform**

A local, offline-first physiotherapy assessment system replacing paper-based
documentation workflows. Built for Malaysian Ministry of Health (KKM) clinical
settings with MPIS (Malaysian Patient Information System) integration.

---

## Quick Start

1. Double-click `PT_Assessment.exe`
   - A terminal window opens (don't close it)
   - Browser opens automatically at `http://127.0.0.1:5000`
2. Register a patient → Create an episode → Fill in the assessment form
3. **Save Record** — stores to local SQLite database
4. **Export KKM PDF** — generates the official KKM borang PDF
5. **Copy to MPIS** — copies formatted text for pasting into MPIS
6. To stop: close the terminal window

---

## Features

### Assessment Forms

11 of 15 forms are ready for clinical use. `FORM_REGISTRY` in `app.py` is the
single source of truth for form status — the table below is a snapshot.

| Form | Group | KKM Reference | Status |
|------|-------|--------------|--------|
| Musculoskeletal (MS) | Musculoskeletal | fisio/b.pen.14/Pind.1/2019 | ✅ Ready |
| Spine | Musculoskeletal | fisio/b.pen.6/Pind.2/2019 | ✅ Ready |
| Hand | Musculoskeletal | fisio/b.pen.12/Pind.2/2019 | ✅ Ready |
| Amputation | Musculoskeletal | fisio/b.pen.16/2019 | ✅ Ready |
| Burn | Musculoskeletal | — | ✅ Ready |
| Neurology | Neurological | — | ✅ Ready |
| Spinal Cord Injury | Neurological | — | ✅ Ready |
| Facial | Neurological | — | ✅ Ready |
| Vestibular | Neurological | — | 🔜 Planned |
| Cardiorespiratory (CR) | Cardiorespiratory | fisio/b.pen.11/Pind.2/2019 | ✅ Ready |
| Geriatric | Rehabilitation | fisio/b.pen.15/2019 | ✅ Ready |
| NCD / Obesity | Rehabilitation | — | ✅ Ready |
| Paediatric | Rehabilitation | — | 🔜 Planned |
| Lymphoedema | Rehabilitation | — | 🔜 Planned |
| General | Rehabilitation | — | 🔜 Planned |

### Clinical Features
- **Interactive body chart** — anterior/posterior SVG, 6 pain types, markers rendered in PDF
- **Hand chart** (Hand) — right + left palmar SVG, click-to-mark
- **Lung auscultation diagram** (CR) — 6-zone radiological view, click-to-mark
- **NCD per-visit tracking** — the NCD/Obesity form is the only one that follows a patient
  *across visits*: a per-visit measurement battery (vitals, blood work, body composition,
  fitness tests) captured against each session, plus a screen-only **trend page** with
  inline sparklines showing how each metric moves over time
- **SOAP follow-up notes** — session timeline with per-form clinical templates
- **Session header** — Nombor Giliran, KPI-SS-30 min, Dilihat, Temujanji (shared by all SOAP notes)
- **MPIS integration** — assessment copy (assessment format) + SOAP copy (POMR format)
- **PDF export** — KKM-compliant borang PDF per form
- **Clinical templates** — Best Statement-aligned templates for each ready form

### System Features
- **Fully offline** — no internet required, all data local
- **Dark mode** — CSS variables, persisted to localStorage
- **Dynamic sidebar** — 15 forms in 4 clinical groups, collapsible
- **Episode management** — multiple referrals per patient, discharge/reactivate
- **Patient management** — NRIC auto-derive (DOB/age/sex), foreign patient support
- **Autosave** — debounced draft to localStorage, draft recovery on reload

---

## File Structure

```
PT_Assessment.exe       — the application
pt_data/
  records.db            — SQLite database (auto-created on first run)

Source:
app.py                  — Flask routes, PDF routing dispatch, FORM_REGISTRY
database.py             — SQLite logic + validation (schema versioned via PRAGMA user_version)
pdf_platypus_base.py    — Shared PDF building blocks (sign_chop_block, two_col, etc.)
pdf_base.py             — Legacy canvas primitives (BodyChartFlowable)
pdf_<form>.py           — Per-form PDF generators
                          (ms, spine, hand, amputation, burn, neuro, sci, facial, cr, geriatric, ncd)
static/js/
  api.js                — All fetch calls to Flask
  form_base.js          — Shared patient fields, NRIC derive, age calc
  form_<form>.js        — Per-form collect/populate/reset (window.Form contract)
  bodychart.js          — Body chart SVG markers (anterior/posterior)
  handchart.js          — Hand chart SVG markers (right + left palmar)
  lungchart.js          — Lung auscultation diagram (6-zone radiological)
  assessment_grid.js    — Fixed-row grid factory (config-driven, multi-instance)
  movement_table.js     — Dynamic ROM table
  clinical_templates.js — Best Statement templates (per form + SOAP variants)
  ncd_measure.js        — NCD per-visit measurements panel (SOAP-modal injection)
  ncd_trend.js          — NCD trend view (data transform + inline-SVG sparklines)
  main.js               — Init, autosave, MPIS copy, dark mode, initFormContext()
templates/
  base.html             — Shell: context bar, section rail, progress bar
  home.html             — Patient dashboard, search, episode list
  episode.html          — Episode detail, SOAP timeline, export
  ncd_trend.html        — NCD per-visit trend page (screen-only)
  forms/                — Per-form assessment templates
```

---

## Building from Source

```bash
pip install flask reportlab pyinstaller
pyinstaller pt_assessment.spec
# Output: dist/PT_Assessment.exe
```

Requirements: Python 3.12+, Flask 3.x, ReportLab, PyInstaller

---

## Design Decisions

- **Offline-first** — SQLite + local exe. No cloud dependency. Works during internet outages.
- **JSON blob for assessment data** — no schema migration when adding form fields.
  Only session-level and per-visit series data use proper DB columns/tables.
- **ReportLab Platypus** — PDF engine. WeasyPrint rejected (C libs incompatible with PyInstaller).
- **Shared helpers** — `sign_chop_block()`, `initFormContext()`, session header fields
  are shared infrastructure. New forms get them for free.
- **MPIS integration** — assessment forms → KKM assessment format;
  SOAP notes → POMR format matching dept Word templates (Malay headers).

---

## Data & Privacy

- All patient data stored locally in `pt_data/records.db`
- Nothing sent to internet
- Backup: copy `pt_data/records.db`
- Multi-machine: each machine has its own database (by design)

---

## For Developers

See `CLAUDE.md` for full development documentation, architecture decisions,
and the checklist for adding new forms.

---

*Forms: 11 of 15 ready — authoritative status lives in `FORM_REGISTRY` (`app.py`).*
