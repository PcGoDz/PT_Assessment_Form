# NCD Form — Implementation Plan A (Initial Assessment Form)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the NCD (Non-Communicable Disease) initial assessment as a standard snapshot form — HTML + `form_ncd.js` + templates + `pdf_ncd.py` + MPIS — saving a normal `records` row and exporting PDF/MPIS, exactly like every other form. NO per-visit table, NO trend page, NO SOAP-modal change. Those are Plan B.

**Architecture:** Mirror the most recent form build (FACIAL) end-to-end. NCD adds two genuinely-novel pieces over a normal form: a **7-figure body-shape picker** (PNG cards on screen, same PNG embedded in PDF — WYSIWYG) and **two derived readouts** (BMI from height+weight, Waist/Hip ratio from waist+hip). Everything else is borrow-and-configure: `bodychart.js` unchanged, `.irr-chip` selectors with form-local `.sel-<Value>` CSS, the `clinical_templates.js` picker, the Platypus PDF primitives, the MPIS builder/wrapper/finalizer.

**Tech Stack:** Flask + SQLite + vanilla JS only. ReportLab for PDF. No new dependencies, no chart libs, no SVG-in-PDF (body shape is a raster PNG embed).

**Source of truth:** `docs/superpowers/specs/2026-06-24-ncd-form-design.md` (D1–D10 locked). This plan is HOW only.

**Why split from Plan B (Scope Check result):** Plan A is a pure standard-form build with zero schema change — fully working, independently testable. Plan B (the `ncd_measurements` table, the shared-SOAP-modal injection, the trend page) is the entire net-new/high-risk surface and depends on Plan A's `form_type='NCD'` episodes existing. Splitting isolates the one dangerous surface (shared SOAP modal) into its own cold vet.

---

## Conventions for this plan

- **No TDD on the UI layer** (project axiom, CLAUDE.md / RULES.md). Verification = Miruya hand-tests the running app on the worktree. Backend smoke checks via `py -c "..."` are fine where quick. This OVERRIDES the writing-plans default of TDD-per-step — user instructions win (superpowers priority rule).
- **Mirror, don't reinvent.** Where a step says "mirror FACIAL", open the named reference file and copy its structure, swapping the NCD field set given in the step. The reference files are the canonical pattern; retyping them here would risk drift.
- **Smoke-test on the worktree BEFORE merge** (WORKFLOW Anti-Repeat). Run Flask from the worktree folder, not main.
- **Windows build uses the `py` launcher**, not bare `python` (WORKFLOW Build & Deploy).
- After any `str_replace` > 5 lines: grep the function name, read the whole function, check for orphaned code below `return` (WORKFLOW Code Editing Discipline).

## Reference files (read before starting)

| Purpose | File |
|---|---|
| Form HTML canonical structure | `templates/forms/ms.html` (patient card lines 22–135 — copy from HERE, not neuro.html) |
| Most-recent form HTML (sections, chips, `+template` wiring, extra_js) | `templates/forms/facial.html` |
| Most-recent form JS (window.Form contract, chip helpers, snapshot-reset) | `static/js/form_facial.js` |
| Most-recent SOAPIER MPIS builder | `_buildMpisFacial()` in `static/js/main.js:1022` |
| PDF primitives | `pdf_platypus_base.py` (`page_header`, `patient_bar`, `two_col`, `box`, `data_table`, `body_chart_section`, `plan_section`, `sign_chop_block`, `build_pdf`) |
| Most-recent PDF generator to mirror | `pdf_facial.py` |
| Template data structure | `static/js/clinical_templates.js` (`const TEMPLATES` IIFE) |
| Registry-drift sites | spec §8 + WORKFLOW Anti-Repeat (formLabel maps × 5) |

---

## File Structure (Plan A)

**Create:**
- `templates/forms/ncd.html` — the form (sections 01–09 per spec §3)
- `static/js/form_ncd.js` — collect/populate/reset + body-shape picker + BMI/WHR derive + chip helpers
- `pdf_ncd.py` — `generate_ncd_pdf(data)` + `generate_episode_pdf(assessment, soaps, ep)`

**Modify:**
- `app.py` — `FORM_REGISTRY` NCD row (`ready=True` + `pdf_episode`/`pdf_single`), `FORM_TEMPLATES`, `import pdf_ncd`
- `database.py` — `REQUIRED_FIELDS['NCD']`
- `static/js/clinical_templates.js` — `TEMPLATES.NCD` + `TEMPLATES.NCD_SOAP`
- `static/js/main.js` — `_buildMpisNcd()` + `copyToMpisAuto()` switch branch
- `templates/episode.html` — `tplMap` NCD→`NCD_SOAP`; two inline `formLabel` maps
- `templates/home.html` — picker grid card, `FORM_LABELS` const, inline formLabel map, icon map
- `templates/patient.html` — picker grid card, Jinja `form_labels`, `form_icons`
- `pt_assessment.spec` — `datas`: `pdf_ncd.py` + `static/img/ncd_shapes`
- `static/img/ncd_shapes/ncd_shape_1_*.png` + `_4_*.png` — top-crop cleanup

---

## Task 1: Branch + form scaffolding (page loads blank)

**Goal:** Get `/form/ncd` to render an empty shell with the patient card, so the rest is incremental.

**Files:**
- Create: `templates/forms/ncd.html`
- Create: `static/js/form_ncd.js`
- Modify: `app.py:94` (`FORM_TEMPLATES`)

- [ ] **Step 1: Create the worktree branch**

```bash
cd /c/Users/legac/Downloads/FOR_CLAUDE/PT_Assessment
git worktree add ../PT_Assessment-worktrees/ncd-form-A -b claude/ncd-form-A
```
Work happens in `../PT_Assessment-worktrees/ncd-form-A`. (Per WORKFLOW: smoke-test from the worktree folder, merge only after it passes.)

- [ ] **Step 2: Add NCD to `FORM_TEMPLATES`**

In `app.py`, the dict at line 94. Add one line (keep alignment):
```python
    'FACIAL':      'forms/facial.html',
    'NCD':         'forms/ncd.html',
}
```

- [ ] **Step 3: Create `templates/forms/ncd.html` shell**

Copy the full skeleton of `templates/forms/facial.html` into `templates/forms/ncd.html`, then strip the section cards down to ONLY the patient card for now. Concretely, the shell must contain:
- `{% extends "base.html" %}`
- `{% block form_name %}NCD / Obesity Assessment{% endblock %}`
- `{% block sidebar_nav %}` — one `.nav-item` placeholder for `s-patient` (more added in later tasks)
- `{% block content %}` — the **patient card copied verbatim from `templates/forms/ms.html` lines 22–135** (NOT neuro.html — it's missing `id="pt-age"` and `id="sex-field"`, which makes `reset()` throw; WORKFLOW Anti-Repeat). Wrap in `<div class="card" id="s-patient">`.
- A `<style>` block inside `{% block content %}` (form-local CSS goes here — see Task 3/4).
- `{% block extra_js %}` with `<script src="/static/js/form_ncd.js"></script>` and a `DOMContentLoaded` init (mirror facial.html's extra_js).

Do NOT add a `<script src>` for `bodychart.js` — it is loaded globally by base.html; re-including it throws `const COLORS` redeclare SyntaxError (WORKFLOW Anti-Repeat). That comes in Task 3 via `BodyChart.init()` only.

- [ ] **Step 4: Create `static/js/form_ncd.js` skeleton with the window.Form contract**

The module MUST expose `window.Form` or main.js init() crashes silently. Minimal valid skeleton:
```javascript
// form_ncd.js — NCD / Obesity initial assessment form logic.
// Snapshot form (Plan A). Per-visit measurements + trend = Plan B.
var NcdForm = (function () {
  function gv(id)      { return FormBase.gv(id); }
  function sv(id, val) { return FormBase.sv(id, val); }
  function radio(name) { return FormBase.radio(name); }
  function setRadio(n,v){ return FormBase.setRadio(n, v); }

  function collect() {
    return {
      _form_type: 'NCD',
      meta:       { form: 'NCD' },
      patient:    FormBase.collectPatient(),
      diagnosis:  gv('diagnosis')
      // ... filled out across Tasks 2–5
    };
  }
  function populate(d) {
    if (!d) return;
    FormBase.populatePatient(d.patient);
    sv('diagnosis', d.diagnosis);
    // ... filled out across Tasks 2–5
  }
  function reset(keepPatient) {
    var savedPt = keepPatient ? FormBase.collectPatient() : null;
    FormBase.resetPatient();
    sv('diagnosis', '');
    // ... filled out across Tasks 2–5
    if (savedPt) FormBase.populatePatient(savedPt);
  }

  return { collect: collect, populate: populate, reset: reset };
})();

window.ActiveForm = { collect: NcdForm.collect, populate: NcdForm.populate, reset: NcdForm.reset };
window.Form = {
  collect:        NcdForm.collect,
  populate:       NcdForm.populate,
  reset:          NcdForm.reset,
  onPtTypeChange: FormBase.onPtTypeChange,
  onNricInput:    FormBase.onNricInput,
  onDobChange:    FormBase.onDobChange
};
```

- [ ] **Step 5: Syntax-check**

Run: `node --check static/js/form_ncd.js`
Expected: no output (exit 0). A SyntaxError here means the file won't load and main.js init() dies silently.

- [ ] **Step 6: Smoke-test the shell**

Launch Flask from the worktree (`py app.py`), navigate to `http://127.0.0.1:5000/form/ncd`. Expected: page renders with the patient card; NRIC entry derives DOB/age/sex (FormBase wiring). No console errors. (NCD is not yet on the picker grids — direct URL is fine for now.)

- [ ] **Step 7: Commit**

```bash
git add templates/forms/ncd.html static/js/form_ncd.js app.py
git commit -m "NCD-A: form shell + window.Form contract + patient card"
```

---

## Task 2: Subjective section (S)

**Goal:** Section 02 — Doctor's Diagnosis, Patient's Complaint, Special Question, Lifestyle (Yes/No chips), Current/Past History.

**Files:**
- Modify: `templates/forms/ncd.html` (add section card + chip CSS)
- Modify: `static/js/form_ncd.js` (chip helpers, collect/populate/reset additions)

- [ ] **Step 1: Add the Subjective section card to ncd.html**

After the patient card, add `<div class="card" id="s-subjective">` with `.card-header` (`<span class="sec-num">02</span><h2>Subjective</h2>`) and `.card-body`. Fields (all `.field` inside `.fg`/`.fg.c2` per DESIGN_SYSTEM):
- Doctor's Diagnosis — textarea `id="diagnosis"` (REQUIRED, mark `<span class="req">*</span>`)
- Patient's Complaint — textarea `id="complaint"`
- Special Question group: Marital Status chips (`.irr-chips` with buttons `id="marital-Single/Married/Widowed/Divorced"`, `onclick="Form.pickMarital('Single')"`), then text fields `id="occupation"`, `id="recreation"`, `id="pmhx"`, `id="family-hx"`, `id="medication"`
- Lifestyle: three Yes/No chip pairs (`id="life-smoking-Yes"/"-No"`, `onclick="Form.pickLife('smoking','Yes')"`; same for `alcohol`, `active`) each with a comment text field (`id="smoking-comment"` etc.)
- Current History — textarea `id="current-history"`; Past History — textarea `id="past-history"`

Add the sidebar nav item: `<div class="nav-item" onclick="Main.go('s-subjective')"><span class="nav-icon">&#128172;</span> Subjective</div>`

- [ ] **Step 2: Add form-local chip-state CSS**

`.irr-chip` only has `.sel-High/Medium/Low` in `style.css` (axiom-protected — do NOT touch it). The new selected-values won't paint without form-local rules. In ncd.html's `<style>` block add:
```css
.irr-chip.sel-Single, .irr-chip.sel-Married, .irr-chip.sel-Widowed, .irr-chip.sel-Divorced,
.irr-chip.sel-Yes, .irr-chip.sel-No {
  background: var(--accent-light); border-color: var(--accent);
  color: var(--accent); font-weight: 500;
}
```
(WORKFLOW Anti-Repeat: relabel ≠ rewire — verify the selected state actually paints in Step 5.)

- [ ] **Step 3: Add chip helpers to form_ncd.js**

```javascript
  // ── Single-select chips (marital) — reuse .irr-chip / form-local .sel-<Value> ──
  var _marital = '';
  function pickMarital(val) {
    _marital = val;
    ['Single','Married','Widowed','Divorced'].forEach(function (v) {
      var el = document.getElementById('marital-' + v);
      if (el) el.classList.remove('sel-' + v);
    });
    var sel = document.getElementById('marital-' + val);
    if (sel) sel.classList.add('sel-' + val);
  }
  function getMarital() { return _marital; }

  // ── Lifestyle Yes/No pairs ──
  var _life = { smoking: '', alcohol: '', active: '' };
  function pickLife(key, val) {
    _life[key] = val;
    ['Yes','No'].forEach(function (v) {
      var el = document.getElementById('life-' + key + '-' + v);
      if (el) el.classList.remove('sel-' + v);
    });
    var sel = document.getElementById('life-' + key + '-' + val);
    if (sel) sel.classList.add('sel-' + val);
  }
  function getLife(key) { return _life[key]; }
```

- [ ] **Step 4: Extend collect/populate/reset for Subjective**

In `collect()` add:
```javascript
      complaint:      gv('complaint'),
      marital:        getMarital(),
      occupation:     gv('occupation'),
      recreation:     gv('recreation'),
      pmhx:           gv('pmhx'),
      familyHx:       gv('family-hx'),
      medication:     gv('medication'),
      lifestyle: {
        smoking: { flag: getLife('smoking'), comment: gv('smoking-comment') },
        alcohol: { flag: getLife('alcohol'), comment: gv('alcohol-comment') },
        active:  { flag: getLife('active'),  comment: gv('active-comment') }
      },
      currentHistory: gv('current-history'),
      pastHistory:    gv('past-history'),
```
In `populate(d)` add the mirror (guard nested objects: `var ls = d.lifestyle || {}; var sm = ls.smoking || {};` then `if (sm.flag) pickLife('smoking', sm.flag); sv('smoking-comment', sm.comment);` etc., `if (d.marital) pickMarital(d.marital);`).
In `reset()` add the text ids to the blanket `sv(id,'')` list, reset comments, and clear chip state: `_marital=''; pickMarital(''); _life={smoking:'',alcohol:'',active:''}; ['smoking','alcohol','active'].forEach(function(k){pickLife(k,'');});` — note `pickMarital('')`/`pickLife(k,'')` just removes classes (the `sel-` lookup for `''` matches nothing, which is the intended clear).
Export `pickMarital` and `pickLife` in the module's return object AND on `window.Form` is not needed (HTML calls `Form.pickMarital`) — wait: HTML onclick uses `Form.pickMarital`, so add `pickMarital` + `pickLife` to the `window.Form` object too. (FACIAL exposes such helpers on the returned module which is aliased; simplest: add them to `window.Form`.)

- [ ] **Step 5: node --check + smoke-test**

Run: `node --check static/js/form_ncd.js` → exit 0.
Smoke-test: fill Subjective, click each chip — **confirm selected state paints** (the form-local CSS check). Save is not wired to clinical yet; just verify the chips toggle and no console errors.

- [ ] **Step 6: Commit**

```bash
git add templates/forms/ncd.html static/js/form_ncd.js
git commit -m "NCD-A: Subjective section + marital/lifestyle chips"
```

---

## Task 3: Body Chart & Shape section (O) — the 7-figure picker (NOVEL)

**Goal:** Section 03 — borrow `bodychart.js` unchanged (pain location) + a 7-PNG body-shape single-select. This is the genuinely-new UI in Plan A.

**Files:**
- Modify: `templates/forms/ncd.html`
- Modify: `static/js/form_ncd.js`

- [ ] **Step 1: Add the section card with body-chart wrap + shape grid**

Mirror ms.html's body-chart block for the canvas side. Structure:
```html
<div class="card" id="s-bodychart">
  <div class="card-header"><span class="sec-num">03</span><h2>Body Chart &amp; Shape</h2></div>
  <div class="card-body">
    <!-- Body chart: copy the .body-chart-wrap markup from ms.html verbatim -->
    <div class="body-chart-wrap"> ... (ms.html body chart canvas + chart-controls) ... </div>

    <!-- Body shape picker -->
    <label style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;color:var(--text-muted);margin-top:18px;display:block;">Body Shape</label>
    <div class="shape-grid" id="shape-grid">
      <button type="button" class="shape-card" id="shape-The Inverted Triangle" onclick="Form.pickShape('The Inverted Triangle')">
        <img src="/static/img/ncd_shapes/ncd_shape_1_inverted_triangle.png" alt="Inverted Triangle">
        <span>The Inverted Triangle</span>
      </button>
      <!-- repeat for all 7, mapping name → filename per spec §7:
        The Inverted Triangle → ncd_shape_1_inverted_triangle.png
        The Lean Column       → ncd_shape_2_lean_column.png
        The Rectangle         → ncd_shape_3_rectangle.png
        The Apple             → ncd_shape_4_apple.png
        The Pear              → ncd_shape_5_pear.png
        The Neat Hour Glass   → ncd_shape_6_neat_hourglass.png
        The Full Hour Glass   → ncd_shape_7_full_hourglass.png
      -->
    </div>
  </div>
</div>
```
The 7 shape NAMES are the data contract (stored verbatim, mapped to filenames in PDF). Use the exact strings from spec §2/§7.
Add sidebar nav item for `s-bodychart`.

- [ ] **Step 2: Add shape-grid CSS (form-local)**

```css
.shape-grid {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
  gap: 10px; margin-top: 8px;
}
.shape-card {
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  padding: 10px; border: 2px solid var(--border); border-radius: var(--radius);
  background: var(--surface); cursor: pointer; font-family: inherit;
  font-size: 11px; color: var(--text-muted); transition: all 0.12s;
}
.shape-card img { height: 90px; width: auto; object-fit: contain; }
.shape-card:hover { border-color: var(--accent-mid); }
.shape-card.sel { border-color: var(--accent); background: var(--accent-light); color: var(--accent); font-weight: 600; }
```

- [ ] **Step 3: Body-chart init + shape picker JS**

In the `DOMContentLoaded` handler in ncd.html's extra_js, call `BodyChart.init();` (no script tag — global load). In form_ncd.js add:
```javascript
  // ── Body shape single-select (PNG cards) ──
  var _shape = '';
  function pickShape(val) {
    _shape = val;
    document.querySelectorAll('#shape-grid .shape-card').forEach(function (c) { c.classList.remove('sel'); });
    var sel = document.getElementById('shape-' + val);
    if (sel) sel.classList.add('sel');
  }
  function getShape() { return _shape; }
```

- [ ] **Step 4: collect/populate/reset for body chart + shape**

In `collect()`:
```javascript
      bodyChart: BodyChart.getData ? { markers: BodyChart.getData(), notes: gv('bodychart-notes') } : { markers: [], notes: '' },
      bodyShape: getShape(),
```
**CRITICAL:** key is `bodyChart` (camelCase). `body_chart` snake_case silently renders empty in PDF (WORKFLOW Anti-Repeat). Confirm `BodyChart.getData()` returns the marker array — there is NO `.collect()`. Use the same `bodychart-notes` textarea id ms.html uses (check ms.html for the exact id and match it).
In `populate(d)`:
```javascript
    var bc = d.bodyChart || {};
    if (BodyChart.loadData) BodyChart.loadData(bc.markers || []);
    sv('bodychart-notes', bc.notes);
    if (d.bodyShape) pickShape(d.bodyShape);
```
In `reset()`: `if (BodyChart.clearAll) BodyChart.clearAll(); sv('bodychart-notes',''); _shape=''; pickShape('');`
Add `pickShape` to `window.Form`.

- [ ] **Step 5: node --check + smoke-test**

`node --check static/js/form_ncd.js` → exit 0.
Smoke-test: mark a body-chart spot, pick a body shape — selected card highlights, only one selectable. Reload nothing yet (populate tested in Task 6). No console errors. **Visually confirm all 7 PNGs load** (broken-image = wrong path/filename).

- [ ] **Step 6: Commit**

```bash
git add templates/forms/ncd.html static/js/form_ncd.js
git commit -m "NCD-A: body chart borrow + 7-figure body-shape picker"
```

---

## Task 4: Objective measures — Vitals/Bloods, Body Composition (derived BMI/WHR), Fitness Tests

**Goal:** Sections 04–06. All numeric, all optional (D6). BMI + Waist/Hip auto-derive.

**Files:**
- Modify: `templates/forms/ncd.html`
- Modify: `static/js/form_ncd.js`

- [ ] **Step 1: Section 04 — Vital Signs & Bloods**

`<div class="card" id="s-vitals">` sec-num 04. `.fg.c2`/`.fg.c3` number inputs (all optional, no `.req`):
- Vitals: `hr` (/min), `rr` (/min), `bp` (mmHg, text — accept "120/80"), `spo2` (%)
- Bloods: `fbs` (mmol/L), `hba1c` (%), `cholesterol` (mmol/L), `ldl` (mmol/L), `hdl` (mmol/L), `triglycerides` (mmol/L)
Use `type="number"` for single-value numerics, `type="text"` for `bp`. Sidebar nav `s-vitals`.

- [ ] **Step 2: Section 05 — Body Composition with derived readouts**

`<div class="card" id="s-bodycomp">` sec-num 05.
- Inputs: `height` (cm), `weight` (kg), `waist` (cm), `hip` (cm) — each `oninput="Form.recompute()"`.
- Derived: BMI + Waist/Hip ratio as `.derived-badge` chips (DESIGN_SYSTEM §6):
```html
<div class="derived-info">
  <span class="derived-badge hidden" id="derived-bmi"></span>
  <span class="derived-badge hidden" id="derived-whr"></span>
</div>
```
- Segmental grid (all optional): Subcutaneous Fat % and Skeletal Muscle % for Whole body / Trunk / Arm / Leg (8 number inputs: `subfat-whole`, `subfat-trunk`, `subfat-arm`, `subfat-leg`, `muscle-whole`, `muscle-trunk`, `muscle-arm`, `muscle-leg`), plus `visceral-fat` and `rmr` (Kcal).
- Preserve the borang note verbatim as helper text: `<div style="font-size:10px;color:var(--text-faint);margin-top:6px;">* for patient below 18 yo please refer Z score</div>`
Sidebar nav `s-bodycomp`.

- [ ] **Step 3: BMI/WHR derive logic**

```javascript
  // ── Derived readouts: BMI = kg/(m^2), WHR = waist/hip ──
  function recompute() {
    var h = parseFloat(gv('height')); var w = parseFloat(gv('weight'));
    var bmiEl = document.getElementById('derived-bmi');
    if (bmiEl) {
      if (h > 0 && w > 0) {
        var m = h / 100; var bmi = w / (m * m);
        bmiEl.textContent = 'BMI: ' + bmi.toFixed(1);
        bmiEl.classList.remove('hidden');
      } else { bmiEl.classList.add('hidden'); }
    }
    var wa = parseFloat(gv('waist')); var hp = parseFloat(gv('hip'));
    var whrEl = document.getElementById('derived-whr');
    if (whrEl) {
      if (wa > 0 && hp > 0) {
        whrEl.textContent = 'Waist/Hip: ' + (wa / hp).toFixed(2);
        whrEl.classList.remove('hidden');
      } else { whrEl.classList.add('hidden'); }
    }
  }
```
Add `recompute` to `window.Form`. Call `recompute()` at the end of `populate()` so a loaded record shows the derived badges.

- [ ] **Step 4: Section 06 — Fitness Tests**

`<div class="card" id="s-fitness">` sec-num 06. All optional number/text. Group with sub-headings (`<h3>`-style labels):
- 6-min walk: `walk6-rpe`, `walk6-bp` (text), `walk6-hr`, `walk6-comment` (text)
- 3-min step: `step3-hr`, `step3-comment`
- Flexibility: `sit-reach` (cm), `flex-comment`
- Strength UL: `hand-grip` (kg), `sit-up` (/min), `push-up` (/rep), `ul-comment`
- Strength LL: `sit-to-stand` (/rep), `ll-comment`
- Balance: `stork` (sec), `balance-comment`
Sidebar nav `s-fitness`.

- [ ] **Step 5: collect/populate/reset for 04–06**

In `collect()` add a flat block of all the above ids (`hr: gv('hr')`, … `stork: gv('stork')`, plus all comments). Keep flat keys (NCD has no nesting need beyond lifestyle/bodyChart/sensation). In `populate(d)` mirror each `sv(id, d.key)`. In `reset()` add every id to the blanket `sv(id,'')` list, then call `recompute()` (clears the badges since inputs are now empty).

- [ ] **Step 6: node --check + smoke-test**

`node --check` → exit 0. Smoke-test: type height+weight → BMI badge appears and updates live; waist+hip → WHR badge. Clear a field → badge hides. No console errors.

- [ ] **Step 7: Commit**

```bash
git add templates/forms/ncd.html static/js/form_ncd.js
git commit -m "NCD-A: vitals/bloods + body comp (derived BMI/WHR) + fitness tests"
```

---

## Task 5: Analysis + Plan sections (A, P) + template buttons

**Goal:** Sections 07–09 — Observation, PT Impression, Goals & Plan, each with a `+template` button.

**Files:**
- Modify: `templates/forms/ncd.html`
- Modify: `static/js/form_ncd.js`

- [ ] **Step 1: Sections 07–09 HTML**

- Section 07 `s-observation` sec-num 07: textarea `observation` (Observation / Physical Examination).
- Section 08 `s-impression` sec-num 08: textarea `pt-impression` (REQUIRED `.req`) with a `+template` button: `<button type="button" onclick="ClinicalTemplates.show('pt-impression','NCD','impression')" class="...tpl-btn...">+ template</button>`. Copy the exact `+template` button markup/style from facial.html.
- Section 09 `s-goals` sec-num 09: textarea `patient-goal` (+template `goal`), `stg` (+template `stg`), `ltg` (+template `ltg`), `plan` (+template `treatment`). Each gets its own `+template` button calling `ClinicalTemplates.show('<id>','NCD','<category>')`.

**Wiring note (BACKLOG — FACIAL shipped without working template buttons):** the `addButton`/onclick wiring lives in THIS HTML, separate from the data in clinical_templates.js. The seam is unchecked by the build smoke-test. Step 4 of Task 8 click-tests every button.

Add sidebar nav items for `s-observation`, `s-impression`, `s-goals`.

- [ ] **Step 2: collect/populate/reset for 07–09**

`collect()`: `observation`, `impression: gv('pt-impression')`, `patientGoal: gv('patient-goal')`, `stg`, `ltg`, `planOfTreatment: gv('plan')`. `populate()` mirror. `reset()` add ids to blanket list.

- [ ] **Step 3: Finalize the full collect() shape**

Read the entire `collect()` function top-to-bottom and confirm it returns EVERY field from sections 02–09 plus `_form_type:'NCD'`, `meta:{form:'NCD'}`, `patient`. This is the single data contract the PDF and MPIS must mirror. Document it as a comment block at the top of collect() so PDF/MPIS authors cross-reference (WORKFLOW: collect → PDF → MPIS must all three agree, or silent data loss).

- [ ] **Step 4: node --check + commit**

`node --check static/js/form_ncd.js` → exit 0.
```bash
git add templates/forms/ncd.html static/js/form_ncd.js
git commit -m "NCD-A: Observation + Impression + Goals/Plan sections"
```

---

## Task 6: Full lifecycle wiring — REQUIRED_FIELDS + save/load/clear round-trip

**Goal:** The form saves a record, reloads it, and Clear preserves patient / blanks clinical. This is the behavior-change task that demands hand-testing (WORKFLOW Anti-Repeat).

**Files:**
- Modify: `database.py:129` (`REQUIRED_FIELDS`)

- [ ] **Step 1: Add `REQUIRED_FIELDS['NCD']`**

Per spec §8 item 3 (D6 — almost nothing mandatory). The field key must match `collect()`:
```python
    'FACIAL':      [('diagnosis', "Doctor's Diagnosis is required"), ('pt_impression', 'PT Impression is required')],
    'NCD':         [('diagnosis', "Doctor's Diagnosis is required"), ('impression', 'PT Impression is required')],
```
Note: `validate_record` resolves dotted paths against the collected dict. `collect()` returns top-level `diagnosis` and `impression` — so the keys are `'diagnosis'` and `'impression'` (NOT `pt_impression`; that's the DOM id, not the collect key). Confirm against the finalized collect() from Task 5.

- [ ] **Step 2: Backend smoke-check the validator**

Run:
```bash
py -c "from database import validate_record; print(validate_record({'meta':{'form':'NCD'},'patient':{'name':'X','date':'2026-06-25','type':'local','nric':'900101015523'},'diagnosis':'','impression':''}))"
```
Expected: `["Doctor's Diagnosis is required", 'PT Impression is required']` (both fired). Then re-run with `'diagnosis':'DM','impression':'obese'` → expected `[]`.

- [ ] **Step 3: Hand-test the full round-trip (Miruya)**

On the worktree Flask: navigate `/form/ncd?...` inside a real NCD episode (create one via the picker after Task 7, or test standalone save via `/api/records`). Fill all sections → Save Record → reload page → confirm every field repopulates (chips, body chart, body shape, BMI/WHR badges, all numerics, templates-inserted text). Then click Clear → confirm patient fields SURVIVE and all clinical fields BLANK (snapshot-restore reset pattern). Read field values back, don't eyeball (WORKFLOW Anti-Repeat: "looks right" ≠ verified).

- [ ] **Step 4: Commit**

```bash
git add database.py
git commit -m "NCD-A: REQUIRED_FIELDS + verified save/load/clear round-trip"
```

---

## Task 7: Registry-drift sweep (Miruya's #1 concern) — make NCD a first-class form

**Goal:** Hit EVERY hardcoded site so the NCD episode card shows "NCD / Obesity", the pickers offer it, and PDF routing resolves. None of these derive from FORM_REGISTRY (spec §8, WORKFLOW Anti-Repeat).

**Files:**
- Modify: `app.py` (FORM_REGISTRY ready flag)
- Modify: `templates/home.html`, `templates/patient.html`, `templates/episode.html`

- [ ] **Step 1: Flip FORM_REGISTRY ready (PDF keys added in Task 9)**

In `app.py` the NCD row (line 70) currently `'ready': False`. Leave it `False` for now — flip to `True` only in Task 9 once `pdf_ncd` exists and its `pdf_episode`/`pdf_single` keys are added (flipping ready without the pdf import will `NameError` at module load). This step is a placeholder reminder; the actual flip is Task 9 Step 3.

- [ ] **Step 2: home.html picker grid card**

Find the NCD card in home.html's episode-modal picker grid. Remove `soon` class + "Soon" badge, add `onclick="selectForm(this)"`, set the icon glyph (`&#129483;` per registry). (WORKFLOW Anti-Repeat: the modal is hardcoded, FORM_REGISTRY does NOT drive it.)

- [ ] **Step 3: patient.html picker grid card**

Same removals, but handler is `onclick="selectEpForm(this)"` (NOT `selectForm` — patient.html has its own independent picker). (FORM_PIPELINE step 1.5.)

- [ ] **Step 4: formLabel display maps × 5 sites**

Run from the worktree root: `grep -rn "MS:'Musculoskeletal'\|'MS':'Musculoskeletal'" templates/` — add an `NCD:'NCD / Obesity'` entry to EVERY hit. Known sites (spec §8 / WORKFLOW Anti-Repeat):
- `episode.html` — TWO inline `formLabel` object literals (in `loadEpisode()` ~line 788 and `loadAssessment()` ~line 829). Add `NCD:'NCD / Obesity'` to both.
- `home.html` — `FORM_LABELS` const (~1208) AND a separate inline `formLabel` (~1922).
- `patient.html` — Jinja `{% set form_labels %}` (~475).
Also add NCD to the parallel **icon maps** at the same sites (home.html inline icon map ~1923, patient.html `form_icons` ~476) — pick the `&#129483;` glyph to match the registry.

- [ ] **Step 5: Verify the sweep**

Re-run the grep; confirm NCD appears in every formLabel map hit. Smoke-test: create an NCD episode from the home picker → the episode card title reads "NCD / Obesity", not raw "NCD".

- [ ] **Step 6: Commit**

```bash
git add templates/home.html templates/patient.html templates/episode.html
git commit -m "NCD-A: registry-drift sweep — pickers + formLabel/icon maps x5"
```

---

## Task 8: Clinical templates — TEMPLATES.NCD + NCD_SOAP + tplMap

**Goal:** Wire the 5 narrative-field template pickers (D9) and the SOAP variant. Templates transcribed VERBATIM from the Best Statement doc (spec §4.3).

**Files:**
- Modify: `static/js/clinical_templates.js`
- Modify: `templates/episode.html` (`tplMap`)

- [ ] **Step 1: Add `TEMPLATES.NCD`**

In the `const TEMPLATES` object in clinical_templates.js (NOT the flat lowercase `templates` — that silently falls through to `[]`, WORKFLOW Anti-Repeat). Categories must match the `ClinicalTemplates.show(id,'NCD','<category>')` calls from Task 5: `impression`, `goal`, `stg`, `ltg`, `treatment`. Transcribe the full verbatim sets from spec §4.3 (each entry a discrete SMART statement, not a category header):
```javascript
    NCD: {
      impression: [
        'Pain in the right knee due to osteoarthritis.',
        'Reduced range of motion in the right knee due to pain.',
        'Muscle weakness in the right quadriceps due to reduced activity.',
        'Impaired balance and gait due to muscle weakness.'
      ],
      goal: [
        'Return to work as a shopkeeper within 3 months.',
        'Walk independently without an assistive device for daily activities.',
        'Perform recreational activities, such as gardening, without knee pain.'
      ],
      stg: [
        'Reduce right knee pain from 7 to 4 on the VAS within 2 weeks.',
        'Achieve 10° improvement in right knee flexion and extension within 2 weeks.',
        'Increase quadriceps strength from 3/5 to 4/5 within 3 weeks.',
        'Improve standing balance to maintain 20 seconds on a single leg within 3 weeks.',
        'Ambulate 10 meters with minimal assistance using a walking frame within 3 weeks.'
      ],
      ltg: [
        'Achieve pain-free functional independence for daily activities within 3-6 months.',
        'Restore full range of motion and flexibility in the affected joint within 6 months.',
        'Strengthen affected muscles to 5/5 grade and improve endurance for sustained physical activity within 6 months.',
        'Improve walking distance to 500 meters without assistive devices within 6 months.',
        'Maintain an active lifestyle with regular physical activity to reduce the recurrence risk of the condition within 12 months.'
      ],
      treatment: [
        'Explanation and assurance to the patient',
        'Patient and carer education',
        'Pain management',
        'Posture',
        'Mobilising exercise',
        'Strengthening exercise',
        'Balance training',
        'Ambulation',
        'Functional exercise'
      ]
    },
```

- [ ] **Step 2: Add `TEMPLATES.NCD_SOAP`**

```javascript
    NCD_SOAP: {
      subjective: [ /* transcribe from Best Statement doc SOAP-relevant rows */ ],
      objective:  [ /* ... */ ],
      analysis:   [ /* ... */ ],
      plan:       [ /* ... */ ]
    },
```
If the Best Statement doc lacks distinct SOAP-phrased statements, reuse the assessment statements adapted to SOAP register (analysis ← impression set, plan ← treatment set). Keep each a discrete SMART statement.

- [ ] **Step 3: Add NCD to `tplMap` in episode.html**

In `showSoapTemplate()` (episode.html:663):
```javascript
    'FACIAL':      'FACIAL_SOAP',
    'NCD':         'NCD_SOAP',
```

- [ ] **Step 4: MANDATORY click-test every template button (BACKLOG gap)**

On the worktree: open the NCD form, click EACH of the 5 `+template` buttons (impression, goal, stg, ltg, treatment). Confirm the picker opens and inserting a statement writes it into the correct textarea. Then on an NCD episode, open the SOAP modal, click the A/P `+template` buttons → confirm NCD_SOAP statements appear. (FACIAL shipped broken here because this seam is unchecked by the build smoke-test — do not skip.)

- [ ] **Step 5: node --check + commit**

`node --check static/js/clinical_templates.js` → exit 0 (orphaned code outside the IIFE breaks the whole module silently, WORKFLOW JS Rules).
```bash
git add static/js/clinical_templates.js templates/episode.html
git commit -m "NCD-A: TEMPLATES.NCD + NCD_SOAP + tplMap + verified button wiring"
```

---

## Task 9: PDF generator (pdf_ncd.py) + registry pdf keys + .spec

**Goal:** `generate_ncd_pdf(data)` (single) + `generate_episode_pdf(...)` (episode). Mirror `pdf_facial.py`. The novel piece is embedding the selected body-shape PNG (WYSIWYG, D4).

**Files:**
- Create: `pdf_ncd.py`
- Modify: `app.py` (import + FORM_REGISTRY pdf keys + ready=True)
- Modify: `pt_assessment.spec` (datas)

- [ ] **Step 1: Scaffold pdf_ncd.py from pdf_facial.py**

Copy `pdf_facial.py` to `pdf_ncd.py`. Change the KKM ref string to `fisio / b.pen. 17 / 2019` (spec — preserve verbatim, KKM typos included). Change the title block to the NCD borang title. Keep the `generate_episode_pdf` wrapper calling `generate_episode_pdf_base(build_story_fn, title, ref, ...)` exactly as facial does.

- [ ] **Step 2: Build the story to mirror collect()**

Cross-reference every field in the finalized `collect()` (Task 5 comment block) against a render block. Use the primitives: `page_header`, `patient_bar`, `box`/`two_col` for text sections, `data_table` (with `_has_data` guard, DESIGN_SYSTEM-pdf) for the numeric batteries (vitals/bloods/bodycomp/fitness), `body_chart_section(data.get('bodyChart'))` for the chart, `plan_section(impression, stg, ltg, treatment)` for the plan grid, `sign_chop_block()` (via `story +=`, it returns a list) as footer. Guard empty tables so a sparse first visit doesn't print "—" everywhere.

- [ ] **Step 3: Body-shape PNG embed (NOVEL)**

ReportLab renders PNG natively via `reportlab.platypus.Image`. Add a helper in pdf_ncd.py:
```python
import os
from reportlab.platypus import Image as RLImage
from reportlab.lib.units import mm

_SHAPE_FILES = {
    'The Inverted Triangle': 'ncd_shape_1_inverted_triangle.png',
    'The Lean Column':       'ncd_shape_2_lean_column.png',
    'The Rectangle':         'ncd_shape_3_rectangle.png',
    'The Apple':             'ncd_shape_4_apple.png',
    'The Pear':              'ncd_shape_5_pear.png',
    'The Neat Hour Glass':   'ncd_shape_6_neat_hourglass.png',
    'The Full Hour Glass':   'ncd_shape_7_full_hourglass.png',
}

def _shape_flowable(shape_name):
    fn = _SHAPE_FILES.get((shape_name or '').strip())
    if not fn:
        return None
    # Resolve via the same resource_path logic app.py uses (PyInstaller _MEIPASS aware)
    import sys
    base = getattr(sys, '_MEIPASS', os.path.dirname(os.path.abspath(__file__)))
    path = os.path.join(base, 'static', 'img', 'ncd_shapes', fn)
    if not os.path.exists(path):
        return None
    img = RLImage(path, width=28*mm, height=40*mm, kind='proportional')
    return img
```
Render: a `box('BODY SHAPE', [Paragraph(shape_name, S_NORMAL), shape_flowable])` if a shape was picked; skip if blank. The same PNG that the screen showed is embedded — WYSIWYG (D4). **The `static/img/ncd_shapes` folder MUST be in the .spec datas (Step 5) or this `os.path.exists` returns False in the built exe and the figure silently vanishes.**

- [ ] **Step 4: Import + register the generator**

In `app.py` top imports add `import pdf_ncd`. In the FORM_REGISTRY NCD row (line 70): set `'ready': True` AND add `'pdf_episode': pdf_ncd.generate_episode_pdf, 'pdf_single': pdf_ncd.generate_ncd_pdf`. The `_PDF_GENERATORS`/`_SINGLE_PDF_GENERATORS` dicts derive automatically (do NOT hand-edit them).

- [ ] **Step 5: Add to .spec datas**

In `pt_assessment.spec` datas list add:
```python
        ('pdf_facial.py', '.'),
        ('pdf_ncd.py', '.'),
        ('static/img/ncd_shapes', 'static/img/ncd_shapes'),
```
Note: `('static', 'static')` already bundles all of static including the shapes — but add the explicit `ncd_shapes` line for clarity AND because the shape-embed path resolution depends on it being present (belt-and-suspenders; the explicit entry is harmless and documents intent). (WORKFLOW: forgotten datas = silent PyInstaller failure.)

- [ ] **Step 6: PDF smoke-tests (DESIGN_SYSTEM-pdf checklist)**

```bash
py -c "from pdf_ncd import generate_ncd_pdf; print('import ok')"
```
Then generate a realistic-data PDF and a sparse-data PDF (patient + diagnosis only). **Rasterize at least one page to PNG and LOOK at it** — body chart markers AND the body-shape figure render silently empty if the data key or asset path is wrong (WORKFLOW Anti-Repeat: "renders without error" ≠ visual test; hollow-pass happened 3× on SCI/BURN). Confirm: shape figure appears, body-chart markers appear, empty tables skipped (no all-"—" tables), KKM ref string correct, sign block present.

- [ ] **Step 7: Commit**

```bash
git add pdf_ncd.py app.py pt_assessment.spec
git commit -m "NCD-A: pdf_ncd.py + body-shape PNG embed + registry pdf keys + spec datas"
```

---

## Task 10: MPIS builder

**Goal:** `_buildMpisNcd()` returning a parts array (SOAPIER structure), wired into `copyToMpisAuto()`. No `copyText`/`await` inside the builder (WORKFLOW MPIS pattern).

**Files:**
- Modify: `static/js/main.js`

- [ ] **Step 1: Write `_buildMpisNcd()`**

Mirror `_buildMpisFacial()` (main.js:1022) — same `line()`/`chips()` helpers, same header block, same `MPIS_DIV`/`MPIS_DASH` constants (never redeclare). Structure NCD's content as SOAPIER:
- Header: NCD ASSESSMENT + patient block (copy facial's header verbatim).
- SUBJECTIVE: diagnosis, complaint, marital, occupation/recreation/pmhx/family/medication, lifestyle (smoking/alcohol/active flag + comment), current/past history.
- OBJECTIVE: body shape (the name string — serialises directly, D4/§7), vitals, bloods, body comp incl. computed BMI/WHR (recompute in JS from the collected height/weight/waist/hip, or read the rendered badge text), fitness tests. Guard each sub-block with a `has*` check so blank sections are skipped (WORKFLOW MPIS pattern).
- ANALYSIS: impression.
- PLAN: patient goal, STG, LTG, plan of treatment.
Body chart markers: keep MPIS plain-text — list markers as facial/other forms do, or omit (the chart is visual; the PDF carries it). Decide for brevity: list a one-line marker summary if present.

- [ ] **Step 2: Wire into the switch**

In `copyToMpisAuto()` (main.js:1137) add before the `else`:
```javascript
    else if (formType === 'NCD')        parts = _buildMpisNcd();
```

- [ ] **Step 3: node --check + smoke-test**

`node --check static/js/main.js` → exit 0. On the worktree: fill an NCD form → Copy to MPIS → paste into a text editor → confirm SOAPIER structure, all filled fields present, blank sections skipped, body-shape name appears. Cross-check collect → PDF → MPIS all carry the same fields (WORKFLOW Anti-Repeat: silent data loss if a collected field has no MPIS/PDF render — e.g. the historical `neuro.muscles` drop).

- [ ] **Step 4: Commit**

```bash
git add static/js/main.js
git commit -m "NCD-A: _buildMpisNcd SOAPIER builder + switch wire"
```

---

## Task 11: Figure asset top-crop cleanup (§7, cosmetic)

**Goal:** Tighten the top crop on figures 1 and 4 (faint leg-bleed smudge at top edge, spec §7).

**Files:**
- Modify: `static/img/ncd_shapes/ncd_shape_1_inverted_triangle.png`, `ncd_shape_4_apple.png`

- [ ] **Step 1: Crop the smudge**

Use Pillow (already a transitive dep? confirm; if not, do it in any image editor). Example with Pillow:
```bash
py -c "from PIL import Image; im=Image.open('static/img/ncd_shapes/ncd_shape_1_inverted_triangle.png'); w,h=im.size; im.crop((0,int(h*0.06),w,h)).save('static/img/ncd_shapes/ncd_shape_1_inverted_triangle.png')"
```
Adjust the crop fraction by eye. Repeat for shape 4. Re-check both render clean on screen AND in the PDF (regenerate + rasterize).

- [ ] **Step 2: Commit**

```bash
git add static/img/ncd_shapes/ncd_shape_1_inverted_triangle.png static/img/ncd_shapes/ncd_shape_4_apple.png
git commit -m "NCD-A: top-crop cleanup on shape figures 1 + 4"
```

---

## Task 12: Full pre-ship smoke test + merge

**Goal:** Run the DESIGN_SYSTEM + WORKFLOW pre-ship checklists end-to-end on the worktree, then merge to main.

- [ ] **Step 1: DESIGN_SYSTEM visual checklist**

Confirm: sidebar_nav populated (one item per section 01–09); every section a `.card` with `.sec-num`+`<h2>`+`.card-body`; section ids match `Main.go('s-...')`; paired fields use `.fg.c2`; derived BMI/WHR show as `.derived-badge`; required fields marked `.req`; visual compare to ms.html (same family). Click every `+template` button (Task 8). Confirm chip selected-states paint.

- [ ] **Step 2: Lifecycle + routing checklist**

Full round-trip (Task 6 Step 3): save → reload → all fields restore; Clear → patient survives, clinical blanks. Export PDF from the episode → correct NCD borang, body shape + chart visible, ref string `fisio / b.pen. 17 / 2019`. Copy to MPIS → SOAPIER text correct. Confirm PDF routing: the episode export and single-record export both resolve to pdf_ncd (the `_form_type:'NCD'` in collect drives it).

- [ ] **Step 3: Merge to main (only after worktree smoke-test passes)**

WORKFLOW Anti-Repeat: smoke-test on the worktree BEFORE merge, never invert. From main:
```bash
cd /c/Users/legac/Downloads/FOR_CLAUDE/PT_Assessment
git merge --no-ff claude/ncd-form-A -m "Merge NCD initial assessment form (Plan A)"
git worktree remove ../PT_Assessment-worktrees/ncd-form-A
git worktree prune
git branch -d claude/ncd-form-A
```

- [ ] **Step 4: Build check (optional, before real deploy)**

`build.bat` (uses `py` launcher). Confirm pdf_ncd.py + ncd_shapes bundle. Test the exe: open an NCD form, save, export PDF — shape figure must appear (the .spec datas check).

---

## Open seam to carry into Plan B (not a Plan A blocker)

- **`ready=True` rollout timing.** Plan A flips NCD `ready=True` (a complete form deliverable, matching every prior form). But until Plan B lands, an NCD initial assessment saves only a `records` row — no `session_no=1` measurements row (the table doesn't exist yet). Since NCD is brand-new with no production history, there will be ~zero real NCD records between Plan A and Plan B ship. **Rollout note for Miruya (his domain — ship timing):** if he prefers to hide NCD from the picker until the trend machinery lands, leaving the registry `ready=False` is a one-line toggle and changes nothing technical. Plan B's auto-write is forward-only — no migration backfill needed for a form with no real prior use. Recommend the two plans ship in close succession.

---

## Self-Review (against spec)

- **§2 field transcription** → Tasks 2–5 cover every borang field. ✅
- **§3 SOAPIER sections 01–09** → Tasks 1–5 one card each. ✅
- **§4.1 chips/derived** → Task 2 (marital/lifestyle), Task 4 (BMI/WHR). ✅
- **§4.3 templates verbatim** → Task 8. ✅
- **§4.4 body chart + shape** → Task 3 (screen) + Task 9 Step 3 (PDF WYSIWYG). ✅
- **§7 assets + .spec + top-crop** → Task 9 Step 5, Task 11. ✅
- **§8 registry-drift (every site)** → Task 7 + Task 9 Step 4–5. ✅
- **window.Form contract + _form_type/meta** → Task 1 Step 4, Task 5 Step 3. ✅
- **Plan B surface (table/SOAP/trend)** → explicitly EXCLUDED, deferred to Plan B. ✅
- Placeholder scan: no "TBD"/"add error handling" — chip/derive/shape-embed code given in full; boilerplate sections reference the exact mirror file + field list. ✅
- Type consistency: collect keys (`diagnosis`, `impression`, `bodyChart`, `bodyShape`, `marital`, `lifestyle.*.flag`) referenced identically in populate/reset/PDF/MPIS/REQUIRED_FIELDS. ✅
```
