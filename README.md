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

### Assessment Forms (5 implemented, 10 planned)
| Form | KKM Reference | Status |
|------|--------------|--------|
| Musculoskeletal (MS) | fisio/b.pen.14/Pind.1/2019 | ✅ Ready |
| Spine | fisio/b.pen.6/Pind.2/2019 | ✅ Ready |
| Geriatric | fisio/b.pen.15/2019 | ✅ Ready |
| Cardiorespiratory (CR) | fisio/b.pen.11/Pind.2/2019 | ✅ Ready |
| Amputation | fisio/b.pen.16/2019 | ✅ Ready |
| Hand | — | 🔜 Planned |
| Neurological | — | 🔜 Planned |
| Paediatric | — | 🔜 Planned |
| Burn | — | 🔜 Planned |
| Spinal Cord Injury | — | 🔜 Planned |
| Vestibular | — | 🔜 Planned |
| Facial | — | 🔜 Planned |
| Lymphoedema | — | 🔜 Planned |
| NCD / Obesity | — | 🔜 Planned |
| General | — | 🔜 Planned |

### Clinical Features
- **Interactive body chart** — anterior/posterior SVG, 6 pain types, markers in PDF
- **Lung auscultation diagram** (CR) — 6-zone radiological view, click-to-mark
- **SOAP follow-up notes** — session timeline, per-form clinical templates
- **Session header** — Nombor Giliran, KPI-SS-30 min, Dilihat, Temujanji (all SOAP notes)
- **MPIS integration** — assessment copy (assessment format) + SOAP copy (POMR format)
- **PDF export** — KKM-compliant borang PDF per form
- **Clinical templates** — Best Statement-aligned templates for all 5 forms

### System Features
- **Fully offline** — no internet required, all data local
- **Dark mode** — CSS variables, persisted to localStorage
- **Dynamic sidebar** — 15 forms in 4 groups, collapsible
- **Episode management** — multiple referrals per patient, discharge/reactivate
- **Patient management** — NRIC auto-derive (DOB/age/sex), foreign patient support
- **Autosave** — 3-second debounce to localStorage, draft recovery on reload

---

## File Structure

```
PT_Assessment.exe       — the application
pt_data/
  records.db            — SQLite database (auto-created on first run)

Source:
app.py                  — Flask routes, PDF routing, FORM_REGISTRY
database.py             — SQLite logic, validation
pdf_platypus_base.py    — Shared PDF building blocks (sign_chop_block etc.)
pdf_ms.py / pdf_spine.py / pdf_geriatric.py / pdf_cr.py / pdf_amputation.py
static/js/
  form_base.js          — Shared patient fields, NRIC logic
  form_ms/spine/geriatric/cr/amputation.js — Per-form collect/populate/reset
  bodychart.js          — Body chart SVG markers
  lungchart.js          — Lung auscultation diagram
  clinical_templates.js — Best Statement templates (all forms)
  main.js               — Init, autosave, MPIS, dark mode
  api.js                — All fetch calls to Flask
templates/
  base.html             — Shell: topbar, sidebar, progress bar
  home.html             — Patient dashboard
  episode.html          — Episode detail + SOAP timeline + session header
  forms/                — Individual assessment form templates
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
  Only session-level fields use proper DB columns.
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
lessons learned, and the checklist for adding new forms.

---

*Last updated: 2026-04-26 | Forms: 5/15 implemented*
