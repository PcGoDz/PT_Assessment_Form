# FORM_PIPELINE.md — How to Build a New Form, Start to Finish

The complete form-build narrative in one place: the front-half design pipeline (what to do BEFORE writing code), the milestone ladder, and the implementation checklist. Read this whenever activating a new form from the registry.

Proven on SCI (2026-06). The front half used to live only in Miruya's head — it's canon now.

---

## Front-half pipeline (design BEFORE build)

These are the steps before "build" — previously instinct, now spelled out. Do them in order, on paper/scratch, before touching any `.html` or `.js`.

1. **TRANSCRIBE** the KKM borang to a flat list — every field, verbatim. Preserve KKM wording and typos exactly (they get preserved downstream in the PDF too). Don't reorganise yet; just capture.

2. **CLASSIFY** each field by input type — chip / dropdown / textbox. The chip-vs-dropdown decision is a DESIGN_SYSTEM call, not a fresh judgement each time: see **DESIGN_SYSTEM.md → "Chip-style selectors"** (chips for 3–6 visual/categorical options; dropdowns for longer or text-entry sets; textboxes for freeform clinical narrative). Tag every field with its type here.

3. **SEQUENCE** by SOAPIER flow. Regroup the flat list into clinical order (Subjective → Objective → Analysis → Plan → Intervention → Evaluation → Re-assessment), NOT paper order. The borang's field order is a printing artifact; the form should read the way a physio actually works through an assessment. This grouping becomes the section list.

4. **ASSESS THE BACKBONE** — identify the heavy structural pieces. Bodychart? Lung diagram? Hand chart? Fixed-row grids? These are the load-bearing components that dominate build effort and layout. Name them before estimating anything.

5. **BRAINSTORM LIGHTEST IMPLEMENTATION** — borrow or configure an existing component before building net-new. The instinct is borrow-first: `bodychart.js`, `handchart.js`, `lungchart.js`, `movement_table.js`, `assessment_grid.js` already exist and are config-driven. Reach for `configure()`/`create()` on an existing singleton/factory before writing a new module.
   - **Exception, not the rule:** SCI needed `assessment_grid.js` built from scratch for its 9 fixed-row grids — no existing component fit. Net-new is sometimes correct, but it's the exception. Default to borrow; justify net-new explicitly when you reach for it.

→ Then the milestone ladder takes over.

---

## Milestone ladder (the build sequence)

Each rung ships and gets polished before the next starts:

```
form → polish → templates → PDF → polish → MPIS → polish
```

- **form** — HTML + `form_xxx.js`, following the implementation checklist below.
- **polish** — UI feel, layout, derived badges, chip states. Miruya smoke-tests.
- **templates** — Best Statement templates from the KKM Best Statement doc → `clinical_templates.js` (assessment arrays + SOAP variant). Cap each Best Statement / SOAP template category at ≤10 statements (fewer is fine; the field stays free-text, the clinician can type). Applies to all forms.
- **PDF** — work from the KKM borang's REAL shape; target ~90% look-and-feel. See DESIGN_SYSTEM-pdf.md.
- **MPIS** — builder/wrapper/finalizer (SOAPIER structure). See WORKFLOW.md → MPIS Pattern.

---

## Adding a new form — Full Checklist

1. Add entry to `FORM_REGISTRY` in `app.py`, set `ready=True`
1.5 Update `home.html` episode modal card for this form: remove `soon` class, remove "Soon" badge, add `onclick="selectForm(this)"`, update icon. Add to formLabel map and icon map in home.html. **The modal is HARDCODED — FORM_REGISTRY does NOT drive it. This step is mandatory.**
    Also update `patient.html` new episode form card: same removals, but handler is `onclick="selectEpForm(this)"` (NOT `selectForm`). `patient.html` is a standalone page with its own independent picker grid — it does NOT share home.html's picker and is NOT driven by FORM_REGISTRY. Both pickers must be updated every time.
1.6 Update ALL formLabel display maps (SEPARATE from the picker grids in 1.5): `episode.html` (×2 object literals), `home.html` (`FORM_LABELS` const + inline map ~1922), `patient.html` (Jinja `form_labels` ~475). These render episode-card titles and are NOT driven by FORM_REGISTRY — miss one and the card shows the raw uppercase form code. Also update the parallel icon maps at the same sites if the form should have a non-default glyph. Verify with `grep -rn "MS:'Musculoskeletal'\|'MS':'Musculoskeletal'" templates/`.
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
6. Add `pdf_episode` + `pdf_single` keys to the form's `FORM_REGISTRY` row in `app.py`. The two dicts (`_PDF_GENERATORS`, `_SINGLE_PDF_GENERATORS`) derive automatically via dict-comp — do NOT hand-maintain them.
7. Add `pdf_xxx.py` to `pt_assessment.spec` under `datas` (DO NOT FORGET — silent failure)
8. Add MPIS builder in `main.js` and wire into `copyToMpisAuto()` switch block (see MPIS pattern in WORKFLOW.md). Do NOT add a per-form public wrapper — `copyToMpisAuto()` is the single entry point.
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
