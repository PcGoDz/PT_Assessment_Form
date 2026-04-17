# CLAUDE.md — PT Assessment System Project Bible

This file is for Claude to read at the start of every session.
It contains rules, decisions, and context established during development.

---

## What This Project Is

A local offline web app for KKM Physiotherapy Department staff to fill in
standardised assessment forms digitally, replacing paper-based workflows.
Built with Flask + SQLite + vanilla JS. Packaged as a Windows .exe via PyInstaller.

**Current user:** Miruya — physiotherapist, KKM dept, ~18-21 patients/day.
**Primary device:** Dept PC (Windows). No internet dependency required.
**Future:** May integrate with HIS (hospital information system) — TBD once HIS is installed.

---

## Architecture

```
app.py              — Flask routes only, thin as possible
database.py         — All SQLite logic + validation
pdf_generator.py    — ReportLab PDF generation (KKM form layout)
static/
  css/style.css     — All styles
  js/
    api.js          — All fetch calls to Flask
    bodychart.js    — Body chart marker logic (IIFE module)
    form.js         — Collect/populate form data (IIFE module)
    movement_table.js — Dynamic movement ROM table (IIFE module)
    main.js         — Init, nav, save/load, autosave, toast
templates/
  base.html         — Shell, topbar, sidebar (extended by all forms)
  forms/ms.html     — MS assessment form (extends base)
  pdf/ms_form.html  — Legacy HTML PDF template (not used, kept for reference)
```

**Adding a new form:** Create `templates/forms/spine.html` extending base,
add one route in `app.py`, add `generate_spine_pdf()` in pdf_generator.py. Done.

---

## Rules — Non-Negotiable

### Dependency Rule
**Minimum dependencies, prefer pure Python.**
- If a library needs system-level dependencies (GTK, Cairo, etc.) — reject it.
- WeasyPrint was rejected for this reason. ReportLab is the PDF engine.
- Every new dependency must be PyInstaller-friendly and pure Python.
- Check before adding: will this bundle cleanly on Windows with no extra installs?

### UX Rule
**Assume the user always takes the shortest path.**
- Never require extra steps before a primary action.
- Example: "Export PDF" should auto-save if not saved — don't make the user save first.
- Example: "New" button auto-saves current record before clearing.
- Remove friction. Clinician has 18-21 patients/day. Every extra click costs time.

### Clinical Rule
**The app serves a trained physiotherapist, not a patient.**
- UI can be technical — dropdowns with clinical terms are fine.
- Fields must match the KKM standardised form exactly for audit compliance.
- Typos in the original KKM form must be preserved in PDF output.
  e.g. "MUSCULOSKELETAL  ASSESSMENT FORM" (double space) — keep it.
- PT cannot diagnose — use "PT Impression" not "PT Diagnosis".
- Unaffected side must always be documented alongside affected side (ROM table).

### Code Rule
**HTML must be written as properly formatted multi-line files.**
- Never generate HTML by squashing everything onto one line via Python string ops.
- One-liner HTML breaks browser parsers. Always use heredoc or write line by line.
- When patching files with Python, use exact string matching — verify pattern exists before writing.

### Data Rule
**JSON blob is source of truth. SQLite columns are for display only.**
- `patient_name`, `patient_rn`, `patient_date` columns exist only for sidebar list display.
- All real data lives in `data_json`. Never treat columns as authoritative.

---

## Key Clinical Context

### Assessment Forms Planned
- [x] Musculoskeletal (MS) — done
- [ ] Spine — next (has its own special assessment, Maitland grades, neural tension)
- [ ] Cardiorespiratory
- [ ] Obesity
- [ ] Neurological

**Important:** MS form = peripheral joints only. Spine is separate.
Spine assessment will have segmental assessment, Maitland grades, SLR, SLUMP etc.

### Malaysian NRIC Logic
- 12 digits, no dashes
- First 6 = YYMMDD (birthdate)
- Last digit: odd = Male, even = Female
- Year: if YY <= current year's last 2 digits → 2000s, else 1900s
- Auto-derives DOB, age, gender on input

### Movement Table Structure
Each row = one joint, one movement plane, one side:
| Joint | Side | Movement/Plane | Active ROM | Pain (Active) | Passive ROM | Pain (Passive) | Resisted |

- Always document affected AND unaffected side (clinical requirement)
- Side options: Right (affected), Left (affected), Right (unaffected), Left (unaffected), Bilateral
- Pain column: describe nature e.g. "End range pain", "Painful arc 70-120°", "Nil"
- MS form handles peripheral joints only (shoulder, elbow, wrist, hip, knee, ankle etc.)
- Accessory movement = gliding tests, NOT Maitland grades (that's spine)

### PDF Output
- Must match KKM form layout as closely as possible — auditors check details
- Two pages: Page 1 = main assessment, Page 2 = movement + plan
- Body chart figures rendered in PDF using ReportLab geometric primitives
- Markers from body chart are embedded in PDF with colour + number
- Reference: fisio / b.pen. 14 / Pind. 1 / 2019

---

## What's Been Done

- [x] Full MS assessment form (11 sections)
- [x] Interactive body chart (anterior + posterior, 6 pain types)
- [x] Dynamic movement ROM table with affected/unaffected side
- [x] Save/load records to SQLite
- [x] Autosave to localStorage (3s debounce)
- [x] Draft recovery on page load
- [x] Dirty form warning on tab close
- [x] Audit trail in DB (last 10 versions per record)
- [x] PDF export matching KKM form layout (ReportLab)
- [x] Auto-save before PDF export
- [x] New button auto-saves before clearing
- [x] NRIC auto-derive (DOB, age, gender)
- [x] Local/Foreign patient toggle
- [x] PyInstaller .exe build (Windows)
- [x] Modular architecture (base.html extended by form templates)

## What's Next (Planned)

- [ ] Spine assessment form
- [ ] Cardiorespiratory assessment form  
- [ ] HIS integration (pending HIS installation and format discovery)
- [ ] Search/filter saved records
- [ ] Print-friendly CSS improvements
- [ ] Record list pagination (when records pile up)

---

## Session Notes

### HIS Integration — MPIS
System name: **MPIS (Malaysian Patient Information System)**
- Web-based system
- Input method: one plain text box, fully manual, no file upload
- Format: plain text only — no markdown, no formatting, no character limit confirmed
- No API access, no structured fields for PT notes

**Implementation decision:**
- PDF export kept for physical filing and KKM audit compliance
- Added "Copy to MPIS" button — formats assessment as clean plain text, copies to clipboard
- Workflow: fill form → Copy to MPIS → paste into MPIS text box. Done.
- No auto-save required before copy (reads from current form state directly)

### GPT Code Review (addressed)
GPT reviewed the code and raised valid points. Status:
- [x] Backend validation — done in database.py
- [x] SQLite threading — check_same_thread=False
- [x] Error handling — all routes wrapped in try/except
- [x] Frontend monolith — split into 4 JS modules
- [x] Autosave — localStorage, 3s debounce
- [x] Audit trail — audit_log table, last 10 versions
- [ ] Versioning UI — data is there, no UI to view history yet

---

## Tone & Communication Style

- Casual, direct. No corporate speak.
- Push back when something doesn't make clinical or technical sense.
- User is a physio, not a developer — explain tech decisions in plain terms.
- When in doubt about clinical workflow, ask Miruya. She knows her job better than the code does.
- "Strength in numbers" is an acceptable clinical compliance strategy 😄
