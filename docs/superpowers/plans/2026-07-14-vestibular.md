# VESTIBULAR Form Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Adaptation from the standard writing-plans template:** this project has no test suite and CLAUDE.md explicitly says "Do NOT push TDD on UI layer." Steps below replace "write failing test → implement → pass" with "write code → run the concrete verification command / manual check given in that step." Backend-only pieces (PDF generator, MPIS builder) get quick importability/output smoke checks, per axiom.

**Goal:** Activate the VESTIBULAR form (Neurological group) end-to-end — HTML + JS form, Best Statement templates, PDF export, MPIS export — following the locked design spec `docs/superpowers/specs/2026-07-14-vestibular-form-design.md` and the milestone ladder `form → polish → templates → PDF → polish → MPIS → polish`.

**Architecture:** Battery-farm-as-chips (D1/D2/D3/D9), not a grid. All battery chip pairs are hand-authored HTML rows (mirrors FACIAL/NEURO, NOT a JS-rendered factory like `assessment_grid.js` — batteries are visually and structurally simple, a factory would be the second net-new component the spec explicitly rules out). A single generic, form-local chip helper (`pickBattery`/`getBatteryData`/`setBatteryData`/`stampBattery`) drives every battery via `data-item`/`data-val` attributes, so ~44 battery rows share one small block of JS instead of 44 one-off handlers. The ONE genuinely new component is the scaffold chip (`vestibular_scaffold.js`), which IS config-driven/JS-rendered per D5 — reused for all 4 positioning-test rows.

**Tech Stack:** Flask + Jinja2 (`templates/forms/vestibular.html`), vanilla JS (`static/js/form_vestibular.js`, `static/js/vestibular_scaffold.js`), ReportLab/Platypus (`pdf_vestibular.py`), SQLite (`database.py` REQUIRED_FIELDS only — no schema change, `records` table already generic).

---

## Section/field key reference (used throughout)

Section table (§3 of spec), with the JS data-domain key and `collect()` field shape decided in this plan:

| # | `s-id` | Domain key | Shape |
|---|--------|-----------|-------|
| 01 | `s-patient` | `patient` | via `FormBase` |
| 02 | `s-referral` | `referral` | `{ dx, mgmt }` |
| 03 | `s-history` | `history` | `{ current, past, problem }` |
| 04 | `s-pmhx` | `pmhx`, `recentSymptoms`, `ix`, `medication` | battery + battery + text + text |
| 05 | `s-social` | `social`, `functionalStatus` | fields + battery |
| 06 | `s-falls` | `falls` | `{ frequency, injury }` |
| 07 | `s-vertigo` | `vertigo`, `disequilibrium` | field sets |
| 08 | `s-measures` | `measures` | `{ dhi, abc }` |
| 09 | `s-oculomotor` | `oculomotor` | battery + side chip |
| 10 | `s-positional` | `positional` | 4 scaffold objects |
| 11 | `s-rom` | `rom`, `strength` | fixed rows + fields |
| 12 | `s-neuro` | `somatosensory`, `coordination` | chip+note ×4 each |
| 13 | `s-balance` | `postural`, `ctsib` | fixed rows |
| 14 | `s-gait` | `gait`, `clearance` | fields + text |
| 15 | `s-impression` | `impression` | text + template |
| 16 | `s-goals` | `stg`, `ltg`, `plan` | text + template ×3 |

Battery item lists (verbatim from spec §2 — the source of truth for every `data-item` string used in HTML):

- **pmhx** (baseline `No`): Heart Disease, Hypertension, Diabetes, Migraine Headaches, Head Trauma, Stroke / TIA
- **recentSymptoms** (baseline `No`): Neck Pain, Blackouts / Fainting, Weakness or Paralysis, Hearing Loss, Blurred Vision, Ear Infection or drainage, Tinnitus
- **functionalStatus** (baseline `No`): Independent in self-care activities, Drive: Daytime, Drive: Night time, Reading, Crowded Area, Escalator / Stairs, Watch TV / Movie
- **oculomotor** (baseline `−Ve`): Spontaneous Nystagmus, Smooth pursuit, Saccades, Gaze Holding Nystagmus, VOR Cancellation, Head Thrusts, Dynamic Visual Acuity, Head Shaking (Head Thrusts also carries a R/L/BIL side chip)

---

## Milestone: FORM

### Task 1: Registry wiring — navigable stub (no PDF/MPIS yet)

**Files:**
- Modify: `app.py:64` (FORM_REGISTRY VESTIBULAR row), `app.py` FORM_TEMPLATES dict (~line 112)
- Modify: `database.py:150-166` (REQUIRED_FIELDS)
- Modify: `templates/home.html:1081-1086` (picker card), `templates/home.html:1205-1209` (FORM_LABELS const), `templates/home.html:1920` (inline formLabel map)
- Modify: `templates/patient.html:559-564` (picker card), `templates/patient.html:475` (Jinja form_labels)
- Modify: `templates/episode.html:898`, `templates/episode.html:953` (formLabel object literals)

- [ ] **Step 1: Flip FORM_REGISTRY to ready, no PDF keys yet**

In `app.py`, replace line 64:
```python
{ 'id': 'VESTIBULAR',  'label': 'Vestibular',         'icon': '&#128261;', 'badge': 'VB',  'group': 'Neurological',      'ready': False },
```
with:
```python
{ 'id': 'VESTIBULAR',  'label': 'Vestibular',         'icon': '&#128260;', 'badge': 'VB',  'group': 'Neurological',      'ready': True  },
```
(Icon changed from `&#128261;` to `&#128260;` — `&#128261;` was registry drift; the two form pickers already use `&#128260;` (the cyclone/dizzy glyph) for Vestibular. Match the pickers, not the stale registry entry.)

`_PDF_GENERATORS`/`_SINGLE_PDF_GENERATORS` derive via dict-comp filtering on `f.get('pdf_episode')` — omitting the keys is safe; PDF export falls back to `pdf_ms` generators until Task 10 adds the real ones (`app.py:396`, `app.py:436`).

- [ ] **Step 2: Add FORM_TEMPLATES entry**

In `app.py`, in the `FORM_TEMPLATES` dict (~line 103-112), add after the `'SCI'` line:
```python
    'VESTIBULAR':  'forms/vestibular.html',
```

- [ ] **Step 3: Add REQUIRED_FIELDS entry**

In `database.py`, in `REQUIRED_FIELDS` (line 150), add after the `'FACIAL'` line:
```python
    'VESTIBULAR':  [('referral.dx', "Doctor's Diagnosis is required")],
```
(Minimal per spec §9.3 recommendation. Field key `referral.dx` must match the `collect()` shape from Task 3 — `d.referral.dx`.)

- [ ] **Step 4: Update home.html picker card**

In `templates/home.html`, replace lines 1081-1086:
```html
      <div class="form-card soon" data-form="VESTIBULAR">
        <div class="form-card-badge">Soon</div>
        <div class="form-card-icon">&#128260;</div>
        <div class="form-card-name">Vestibular</div>
        <div class="form-card-sub">Vertigo, balance disorders</div>
      </div>
```
with:
```html
      <div class="form-card" data-form="VESTIBULAR" onclick="selectForm(this)">
        <div class="form-card-icon">&#128260;</div>
        <div class="form-card-name">Vestibular</div>
        <div class="form-card-sub">Vertigo, balance disorders</div>
      </div>
```

- [ ] **Step 5: Update patient.html picker card**

In `templates/patient.html`, replace lines 559-564:
```html
      <div class="form-card soon" data-form="VESTIBULAR">
        <div class="form-card-badge">Soon</div>
        <div class="form-card-icon">&#128260;</div>
        <div class="form-card-name">Vestibular</div>
        <div class="form-card-sub">Vertigo, balance disorders</div>
      </div>
```
with:
```html
      <div class="form-card" data-form="VESTIBULAR" onclick="selectEpForm(this)">
        <div class="form-card-icon">&#128260;</div>
        <div class="form-card-name">Vestibular</div>
        <div class="form-card-sub">Vertigo, balance disorders</div>
      </div>
```
(Handler is `selectEpForm`, NOT `selectForm` — patient.html's independent picker, per WORKFLOW Anti-Repeat.)

- [ ] **Step 6: Update formLabel maps — 5 sites**

`templates/home.html:1207-1208` (`FORM_LABELS` const), add `VESTIBULAR:'Vestibular',` after the `FACIAL:'Facial',` entry:
```js
var FORM_LABELS = {
  MS:'Musculoskeletal', SPINE:'Spine', GERIATRIC:'Geriatric',
  CR:'Cardiorespiratory', AMPUTATION:'Amputation', NEURO:'Neurological', HAND:'Hand', BURN:'Burn',
  SCI:'Spinal Cord Injury', FACIAL:'Facial', VESTIBULAR:'Vestibular', NCD:'NCD / Obesity'
};
```

`templates/home.html:1920` (inline `formLabel` map), add `VESTIBULAR:'Vestibular',`:
```js
      var formLabel  = { MS:'Musculoskeletal', SPINE:'Spine', GERIATRIC:'Geriatric', CR:'Cardiorespiratory', AMPUTATION:'Amputation', NEURO:'Neurological', HAND:'Hand', BURN:'Burn', SCI:'Spinal Cord Injury', FACIAL:'Facial', VESTIBULAR:'Vestibular', NCD:'NCD / Obesity' }[ep.form_type] || ep.form_type;
```

`templates/patient.html:475` (Jinja `form_labels`), add `'VESTIBULAR':'Vestibular',`:
```jinja
{% set form_labels = {'MS':'Musculoskeletal','SPINE':'Spine','GERIATRIC':'Geriatric','CR':'Cardiorespiratory','AMPUTATION':'Amputation','NEURO':'Neurological','HAND':'Hand','BURN':'Burn','SCI':'Spinal Cord Injury','FACIAL':'Facial','VESTIBULAR':'Vestibular','NCD':'NCD / Obesity'} %}
```

`templates/episode.html:898` and `templates/episode.html:953` (both `formLabel` object literals), add `VESTIBULAR:'Vestibular',` to each:
```js
    var formLabel = {MS:'Musculoskeletal',SPINE:'Spine',GERIATRIC:'Geriatric',CR:'Cardiorespiratory',AMPUTATION:'Amputation',NEURO:'Neurological',HAND:'Hand',BURN:'Burn',SCI:'Spinal Cord Injury',FACIAL:'Facial',VESTIBULAR:'Vestibular',NCD:'NCD / Obesity'}[episode.form_type] || episode.form_type;
```
(second occurrence at line 953 uses `ep.form_type` instead of `episode.form_type` — same edit, different variable name.)

- [ ] **Step 7: Verify with grep**

```bash
grep -rn "MS:'Musculoskeletal'\|'MS':'Musculoskeletal'" templates/
```
Confirm all 5 hits now also contain `VESTIBULAR`.

- [ ] **Step 8: Commit**

```bash
git add app.py database.py templates/home.html templates/patient.html templates/episode.html
git commit -m "vestibular: registry wiring stub (navigable, no PDF/MPIS yet)"
```

---

### Task 2: Form-local CSS block

**Files:**
- Create: none (goes inside `templates/forms/vestibular.html`, written in Task 3)

This task defines the CSS block content that Task 3 embeds. Per DESIGN_SYSTEM.md, form-local CSS lives in the form's own `<style>` block inside `{% block content %}`, never in `style.css`.

- [ ] **Step 1: Write the CSS block (used verbatim in Task 3, Step 1)**

```css
<style>
/* VESTIBULAR form-local CSS — battery chips, scaffold, KIV note. Do NOT move to style.css. */

/* Battery chip pairs — reuse .irr-chip base, add form-local .sel-* states.
   Clinical convention: No/−Ve (baseline, reassuring) = success green;
   Yes/+Ve (positive finding, needs attention) = danger red. */
.vb-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 6px 0; border-bottom: 1px solid var(--border); }
.vb-row:last-child { border-bottom: none; }
.vb-label { font-size: 13px; color: var(--text); flex: 1; }
.vb-chips { display: flex; gap: 6px; flex-shrink: 0; }
.vb-chip.sel-No, .vb-chip.sel-Neg  { background: var(--success-light); border-color: var(--success); color: var(--success); font-weight: 500; }
.vb-chip.sel-Yes, .vb-chip.sel-Pos { background: var(--danger-light);  border-color: var(--danger);  color: var(--danger);  font-weight: 500; }

/* Generic single-select paint for every pick3()-driven chip group (marital, smoking, alcohol,
   sleep, vertigo/disequilibrium fields, soma/coord status, side selectors, gait chips, ...).
   style.css only paints .irr-chip via .sel-High/Medium/Low — .active alone does NOT paint
   (the FACIAL invisible-selection trap, WORKFLOW Anti-Repeat). Scoped :not(.vb-chip) so this
   does NOT fight the battery .sel-Yes/No/Pos/Neg colors above (same specificity + source
   order would otherwise let this rule win and flatten every battery chip to accent blue). */
.irr-chip.active:not(.vb-chip) { background: var(--accent-light); border-color: var(--accent); color: var(--accent); font-weight: 500; }

.vb-battery { margin-bottom: 4px; }
.vb-battery-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
.vb-battery-title { font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; }
.vb-stamp { font-size: 11px; padding: 3px 10px; border-radius: 12px; border: 1px solid var(--accent-mid); background: var(--accent-light); color: var(--accent); cursor: pointer; font-family: inherit; }
.vb-stamp:hover { background: var(--accent-mid); color: white; }

/* KIV remark — reuses +Note collapsible pattern, form-local label text */
.vb-kiv-toggle { font-size: 11px; color: var(--danger); background: none; border: none; cursor: pointer; padding: 3px 0; align-self: flex-start; }
.vb-kiv-wrap.collapsed { display: none; }
.vb-kiv-wrap input { margin-top: 4px; width: 100%; }
.vb-kiv-active .vb-battery { opacity: 0.4; pointer-events: none; }

/* Side selector (Head Thrusts R/L/BIL, Gait Deviation R/L) — reuse .irr-chip */
.irr-chip.sel-R   { background: var(--accent-light); border-color: var(--accent); color: var(--accent); font-weight: 500; }
.irr-chip.sel-L   { background: var(--accent-light); border-color: var(--accent); color: var(--accent); font-weight: 500; }
.irr-chip.sel-BIL { background: var(--accent-light); border-color: var(--accent); color: var(--accent); font-weight: 500; }

/* Scaffold chip (vestibular_scaffold.js renders into these containers) */
.vsc-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 6px 0; }
.vsc-label { font-size: 13px; color: var(--text); flex: 1; }
.vsc-chips { display: flex; gap: 6px; }
.vsc-chip.sel-pos { background: var(--danger-light); border-color: var(--danger); color: var(--danger); font-weight: 500; }
.vsc-chip.sel-neg { background: var(--success-light); border-color: var(--success); color: var(--success); font-weight: 500; }
.vsc-detail { padding: 8px 0 4px 0; border-top: 1px dashed var(--border); margin-top: 4px; }
.vsc-detail.collapsed { display: none; }
.vsc-directions { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
.vsc-dir.sel-dir { background: var(--accent-light); border-color: var(--accent); color: var(--accent); font-weight: 500; }

/* Fixed-row light tables (AROM/PROM, Postural Control, CTSIB) — no grid chrome (D9) */
.vb-fixed-row { display: grid; grid-template-columns: 140px 1fr; gap: 10px; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--border); }
.vb-fixed-row:last-child { border-bottom: none; }
.vb-fixed-row-label { font-size: 12px; font-weight: 500; color: var(--text-muted); }
.vb-fixed-row-fields { display: flex; gap: 8px; flex-wrap: wrap; }
.vb-fixed-row-fields .field { flex: 1; min-width: 90px; margin: 0; }
.vb-fixed-row-fields label { font-size: 10px; }
</style>
```

- [ ] **Step 2: No separate commit — bundled into Task 3's commit.**

---

### Task 3: `templates/forms/vestibular.html` — full form markup

**Files:**
- Create: `templates/forms/vestibular.html`

- [ ] **Step 1: Write the file**

```html
{% extends "base.html" %}

{% block form_name %}Vestibular Assessment{% endblock %}

{% block sidebar_nav %}
<div class="nav-item" onclick="Main.go('s-patient')"><span class="nav-icon">&#128100;</span> Patient Info</div>
<div class="nav-item" onclick="Main.go('s-referral')"><span class="nav-icon">&#128203;</span> Referral</div>
<div class="nav-item" onclick="Main.go('s-history')"><span class="nav-icon">&#128214;</span> History</div>
<div class="nav-item" onclick="Main.go('s-pmhx')"><span class="nav-icon">&#127973;</span> Past Medical Hx</div>
<div class="nav-item" onclick="Main.go('s-social')"><span class="nav-icon">&#128101;</span> Social &amp; Function</div>
<div class="nav-item" onclick="Main.go('s-falls')"><span class="nav-icon">&#9888;</span> Falls</div>
<div class="nav-item" onclick="Main.go('s-vertigo')"><span class="nav-icon">&#128260;</span> Vertigo &amp; Disequilibrium</div>
<div class="nav-item" onclick="Main.go('s-measures')"><span class="nav-icon">&#128202;</span> Measures</div>
<div class="nav-item" onclick="Main.go('s-oculomotor')"><span class="nav-icon">&#128065;</span> Oculomotor</div>
<div class="nav-item" onclick="Main.go('s-positional')"><span class="nav-icon">&#128260;</span> Positioning Tests</div>
<div class="nav-item" onclick="Main.go('s-rom')"><span class="nav-icon">&#128260;</span> AROM/PROM &amp; Strength</div>
<div class="nav-item" onclick="Main.go('s-neuro')"><span class="nav-icon">&#9889;</span> Somatosensory &amp; Coordination</div>
<div class="nav-item" onclick="Main.go('s-balance')"><span class="nav-icon">&#9878;</span> Postural Control</div>
<div class="nav-item" onclick="Main.go('s-gait')"><span class="nav-icon">&#128694;</span> Gait</div>
<div class="nav-item" onclick="Main.go('s-impression')"><span class="nav-icon">&#127919;</span> PT Impression</div>
<div class="nav-item" onclick="Main.go('s-goals')"><span class="nav-icon">&#127775;</span> Goals &amp; Plan</div>
{% endblock %}

{% block content %}

<!-- PASTE CSS BLOCK FROM TASK 2, STEP 1 HERE, immediately after {% block content %} -->

<!-- 01 PATIENT INFO — copied verbatim from ms.html lines 22-135 (WORKFLOW Anti-Repeat: do NOT copy from neuro.html, it's missing #pt-age / #sex-field) -->
<div class="card" id="s-patient">
  <div class="card-header">
    <span class="sec-num">01</span>
    <h2>Patient Information</h2>
  </div>
  <div class="card-body">
    <div class="fg">
      <div class="field">
        <label>Patient Type</label>
        <div class="radio-group">
          <label><input type="radio" name="pt-type" value="local" onchange="FormBase.onPtTypeChange()"> Malaysian (NRIC)</label>
          <label><input type="radio" name="pt-type" value="foreign" onchange="FormBase.onPtTypeChange()"> Foreign (Passport)</label>
        </div>
      </div>
      <div class="fg c2">
        <div class="field" style="grid-column:span 2">
          <label>Full Name <span class="req">*</span></label>
          <input type="text" id="pt-name" placeholder="Patient full name">
        </div>
        <div class="field" id="nric-field">
          <label>NRIC No. <span class="req">*</span></label>
          <input type="text" id="pt-nric" placeholder="e.g. 661010071234" maxlength="12" oninput="FormBase.onNricInput(this.value)">
          <div class="derived-info">
            <span class="derived-badge hidden" id="derived-dob"></span>
            <span class="derived-badge hidden" id="derived-gender"></span>
          </div>
        </div>
        <div class="field" id="passport-field" style="display:none">
          <label>Passport No. <span class="req">*</span></label>
          <input type="text" id="pt-passport" placeholder="Passport number">
        </div>
        <div class="field" id="country-field" style="display:none">
          <label>Country of Origin</label>
          <select id="pt-country">
            <option value="">— Select —</option>
            <option value="No Information">No Information</option>
            <option value="Stateless">Stateless</option>
          </select>
        </div>
        <div class="field">
          <label>Assessment Date <span class="req">*</span></label>
          <input type="date" id="pt-date">
        </div>
        <div class="field">
          <label>Date of Birth</label>
          <input type="date" id="pt-dob" onchange="FormBase.onDobChange(this.value)">
        </div>
        <div class="field">
          <label>Age</label>
          <input type="number" id="pt-age" placeholder="Years" min="0" max="130">
        </div>
        <div class="field" id="sex-field" style="display:none">
          <label>Sex <span class="req">*</span></label>
          <div class="radio-group">
            <label><input type="radio" name="pt-sex" value="M"> Male</label>
            <label><input type="radio" name="pt-sex" value="F"> Female</label>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- 02 REFERRAL -->
<div class="card" id="s-referral">
  <div class="card-header"><span class="sec-num">02</span><h2>Referral</h2></div>
  <div class="card-body">
    <div class="fg c2">
      <div class="field">
        <label>Doctor Diagnosis <span class="req">*</span></label>
        <textarea id="vb-dx" rows="2" placeholder="Refer to diagnosis in medical referral"></textarea>
      </div>
      <div class="field">
        <label>Doctor Management</label>
        <textarea id="vb-mgmt" rows="2"></textarea>
      </div>
    </div>
  </div>
</div>

<!-- 03 HISTORY -->
<div class="card" id="s-history">
  <div class="card-header"><span class="sec-num">03</span><h2>History</h2></div>
  <div class="card-body">
    <div class="fg">
      <div class="field">
        <label>Current Hx <button type="button" class="ct-trigger-anchor"></button></label>
        <textarea id="vb-hx-current" rows="2"></textarea>
      </div>
      <div class="field">
        <label>Past Hx</label>
        <textarea id="vb-hx-past" rows="2"></textarea>
      </div>
      <div class="field">
        <label>Problem</label>
        <textarea id="vb-problem" rows="2"></textarea>
      </div>
    </div>
  </div>
</div>

<!-- 04 PAST MEDICAL HX -->
<div class="card" id="s-pmhx">
  <div class="card-header"><span class="sec-num">04</span><h2>Past Medical History</h2></div>
  <div class="card-body">

    <div class="vb-battery" id="battery-pmhx">
      <div class="vb-battery-head">
        <span class="vb-battery-title">Past Medical Hx</span>
        <button type="button" class="vb-stamp" onclick="VestibularForm.stampBattery('battery-pmhx','No')">Stamp remaining &rarr; No</button>
      </div>
      <button type="button" class="vb-kiv-toggle" onclick="VestibularForm.toggleKiv('battery-pmhx')">KIV &mdash; unable to answer this visit</button>
      <div class="vb-kiv-wrap collapsed" id="battery-pmhx-kiv-wrap">
        <input type="text" id="battery-pmhx-kiv" placeholder="Reason (optional)" oninput="VestibularForm.onKivInput('battery-pmhx')">
      </div>
      <div id="battery-pmhx-rows">
        <div class="vb-row" data-item="Heart Disease"><span class="vb-label">Heart Disease</span><div class="vb-chips">
          <button type="button" class="irr-chip vb-chip" data-val="Yes" onclick="VestibularForm.pickBattery(this)">Yes</button>
          <button type="button" class="irr-chip vb-chip" data-val="No" onclick="VestibularForm.pickBattery(this)">No</button>
        </div></div>
        <div class="vb-row" data-item="Hypertension"><span class="vb-label">Hypertension</span><div class="vb-chips">
          <button type="button" class="irr-chip vb-chip" data-val="Yes" onclick="VestibularForm.pickBattery(this)">Yes</button>
          <button type="button" class="irr-chip vb-chip" data-val="No" onclick="VestibularForm.pickBattery(this)">No</button>
        </div></div>
        <div class="vb-row" data-item="Diabetes"><span class="vb-label">Diabetes</span><div class="vb-chips">
          <button type="button" class="irr-chip vb-chip" data-val="Yes" onclick="VestibularForm.pickBattery(this)">Yes</button>
          <button type="button" class="irr-chip vb-chip" data-val="No" onclick="VestibularForm.pickBattery(this)">No</button>
        </div></div>
        <div class="vb-row" data-item="Migraine Headaches"><span class="vb-label">Migraine Headaches</span><div class="vb-chips">
          <button type="button" class="irr-chip vb-chip" data-val="Yes" onclick="VestibularForm.pickBattery(this)">Yes</button>
          <button type="button" class="irr-chip vb-chip" data-val="No" onclick="VestibularForm.pickBattery(this)">No</button>
        </div></div>
        <div class="vb-row" data-item="Head Trauma"><span class="vb-label">Head Trauma</span><div class="vb-chips">
          <button type="button" class="irr-chip vb-chip" data-val="Yes" onclick="VestibularForm.pickBattery(this)">Yes</button>
          <button type="button" class="irr-chip vb-chip" data-val="No" onclick="VestibularForm.pickBattery(this)">No</button>
        </div></div>
        <div class="vb-row" data-item="Stroke / TIA"><span class="vb-label">Stroke / TIA</span><div class="vb-chips">
          <button type="button" class="irr-chip vb-chip" data-val="Yes" onclick="VestibularForm.pickBattery(this)">Yes</button>
          <button type="button" class="irr-chip vb-chip" data-val="No" onclick="VestibularForm.pickBattery(this)">No</button>
        </div></div>
      </div>
    </div>

    <div class="vb-battery" id="battery-recent-symptoms" style="margin-top:16px">
      <div class="vb-battery-head">
        <span class="vb-battery-title">Recent Symptoms or Problems</span>
        <button type="button" class="vb-stamp" onclick="VestibularForm.stampBattery('battery-recent-symptoms','No')">Stamp remaining &rarr; No</button>
      </div>
      <button type="button" class="vb-kiv-toggle" onclick="VestibularForm.toggleKiv('battery-recent-symptoms')">KIV &mdash; unable to answer this visit</button>
      <div class="vb-kiv-wrap collapsed" id="battery-recent-symptoms-kiv-wrap">
        <input type="text" id="battery-recent-symptoms-kiv" placeholder="Reason (optional)" oninput="VestibularForm.onKivInput('battery-recent-symptoms')">
      </div>
      <div id="battery-recent-symptoms-rows">
        <div class="vb-row" data-item="Neck Pain"><span class="vb-label">Neck Pain</span><div class="vb-chips">
          <button type="button" class="irr-chip vb-chip" data-val="Yes" onclick="VestibularForm.pickBattery(this)">Yes</button>
          <button type="button" class="irr-chip vb-chip" data-val="No" onclick="VestibularForm.pickBattery(this)">No</button>
        </div></div>
        <div class="vb-row" data-item="Blackouts / Fainting"><span class="vb-label">Blackouts / Fainting</span><div class="vb-chips">
          <button type="button" class="irr-chip vb-chip" data-val="Yes" onclick="VestibularForm.pickBattery(this)">Yes</button>
          <button type="button" class="irr-chip vb-chip" data-val="No" onclick="VestibularForm.pickBattery(this)">No</button>
        </div></div>
        <div class="vb-row" data-item="Weakness or Paralysis"><span class="vb-label">Weakness or Paralysis</span><div class="vb-chips">
          <button type="button" class="irr-chip vb-chip" data-val="Yes" onclick="VestibularForm.pickBattery(this)">Yes</button>
          <button type="button" class="irr-chip vb-chip" data-val="No" onclick="VestibularForm.pickBattery(this)">No</button>
        </div></div>
        <div class="vb-row" data-item="Hearing Loss"><span class="vb-label">Hearing Loss</span><div class="vb-chips">
          <button type="button" class="irr-chip vb-chip" data-val="Yes" onclick="VestibularForm.pickBattery(this)">Yes</button>
          <button type="button" class="irr-chip vb-chip" data-val="No" onclick="VestibularForm.pickBattery(this)">No</button>
        </div></div>
        <div class="vb-row" data-item="Blurred Vision"><span class="vb-label">Blurred Vision</span><div class="vb-chips">
          <button type="button" class="irr-chip vb-chip" data-val="Yes" onclick="VestibularForm.pickBattery(this)">Yes</button>
          <button type="button" class="irr-chip vb-chip" data-val="No" onclick="VestibularForm.pickBattery(this)">No</button>
        </div></div>
        <div class="vb-row" data-item="Ear Infection or drainage"><span class="vb-label">Ear Infection or drainage</span><div class="vb-chips">
          <button type="button" class="irr-chip vb-chip" data-val="Yes" onclick="VestibularForm.pickBattery(this)">Yes</button>
          <button type="button" class="irr-chip vb-chip" data-val="No" onclick="VestibularForm.pickBattery(this)">No</button>
        </div></div>
        <div class="vb-row" data-item="Tinnitus"><span class="vb-label">Tinnitus</span><div class="vb-chips">
          <button type="button" class="irr-chip vb-chip" data-val="Yes" onclick="VestibularForm.pickBattery(this)">Yes</button>
          <button type="button" class="irr-chip vb-chip" data-val="No" onclick="VestibularForm.pickBattery(this)">No</button>
        </div></div>
      </div>
    </div>

    <div class="fg c2" style="margin-top:16px">
      <div class="field">
        <label>Ix : MRI / CT Scan</label>
        <textarea id="vb-ix" rows="2" placeholder="Date, type, results; note hearing tests"></textarea>
      </div>
      <div class="field">
        <label>Medication / Steroid</label>
        <textarea id="vb-medication" rows="2" placeholder="Name, dosage, frequency, date started"></textarea>
      </div>
    </div>
  </div>
</div>

<!-- 05 SOCIAL & FUNCTION -->
<div class="card" id="s-social">
  <div class="card-header"><span class="sec-num">05</span><h2>Social History &amp; Current Functional Status</h2></div>
  <div class="card-body">
    <div class="fg c2">
      <div class="field">
        <label>Occupation / Job</label>
        <input type="text" id="vb-occupation">
      </div>
      <div class="field">
        <label>Marital Status</label>
        <div class="irr-chips" id="vb-marital">
          <button type="button" class="irr-chip" data-val="Single" onclick="VestibularForm.pick3('vb-marital', this)">Single</button>
          <button type="button" class="irr-chip" data-val="Married" onclick="VestibularForm.pick3('vb-marital', this)">Married</button>
        </div>
      </div>
      <div class="field">
        <label>Smoking</label>
        <div class="irr-chips" id="vb-smoking">
          <button type="button" class="irr-chip" data-val="Yes" onclick="VestibularForm.pick3('vb-smoking', this)">Yes</button>
          <button type="button" class="irr-chip" data-val="No" onclick="VestibularForm.pick3('vb-smoking', this)">No</button>
        </div>
      </div>
      <div class="field">
        <label>Alcohol</label>
        <div class="irr-chips" id="vb-alcohol">
          <button type="button" class="irr-chip" data-val="Yes" onclick="VestibularForm.pick3('vb-alcohol', this)">Yes</button>
          <button type="button" class="irr-chip" data-val="No" onclick="VestibularForm.pick3('vb-alcohol', this)">No</button>
        </div>
      </div>
      <div class="field">
        <label>Trouble Sleeping</label>
        <div class="irr-chips" id="vb-sleep">
          <button type="button" class="irr-chip" data-val="Yes" onclick="VestibularForm.pick3('vb-sleep', this)">Yes</button>
          <button type="button" class="irr-chip" data-val="No" onclick="VestibularForm.pick3('vb-sleep', this)">No</button>
        </div>
      </div>
    </div>

    <div class="vb-battery" id="battery-functional" style="margin-top:16px">
      <div class="vb-battery-head">
        <span class="vb-battery-title">Current Functional Status</span>
        <button type="button" class="vb-stamp" onclick="VestibularForm.stampBattery('battery-functional','No')">Stamp remaining &rarr; No</button>
      </div>
      <button type="button" class="vb-kiv-toggle" onclick="VestibularForm.toggleKiv('battery-functional')">KIV &mdash; unable to answer this visit</button>
      <div class="vb-kiv-wrap collapsed" id="battery-functional-kiv-wrap">
        <input type="text" id="battery-functional-kiv" placeholder="Reason (optional)" oninput="VestibularForm.onKivInput('battery-functional')">
      </div>
      <div id="battery-functional-rows">
        <div class="vb-row" data-item="Independent in self-care activities"><span class="vb-label">Independent in self-care activities</span><div class="vb-chips">
          <button type="button" class="irr-chip vb-chip" data-val="Yes" onclick="VestibularForm.pickBattery(this)">Yes</button>
          <button type="button" class="irr-chip vb-chip" data-val="No" onclick="VestibularForm.pickBattery(this)">No</button>
        </div></div>
        <div class="vb-row" data-item="Drive: Daytime"><span class="vb-label">Drive: Daytime</span><div class="vb-chips">
          <button type="button" class="irr-chip vb-chip" data-val="Yes" onclick="VestibularForm.pickBattery(this)">Yes</button>
          <button type="button" class="irr-chip vb-chip" data-val="No" onclick="VestibularForm.pickBattery(this)">No</button>
        </div></div>
        <div class="vb-row" data-item="Drive: Night time"><span class="vb-label">Drive: Night time</span><div class="vb-chips">
          <button type="button" class="irr-chip vb-chip" data-val="Yes" onclick="VestibularForm.pickBattery(this)">Yes</button>
          <button type="button" class="irr-chip vb-chip" data-val="No" onclick="VestibularForm.pickBattery(this)">No</button>
        </div></div>
        <div class="vb-row" data-item="Reading"><span class="vb-label">Reading</span><div class="vb-chips">
          <button type="button" class="irr-chip vb-chip" data-val="Yes" onclick="VestibularForm.pickBattery(this)">Yes</button>
          <button type="button" class="irr-chip vb-chip" data-val="No" onclick="VestibularForm.pickBattery(this)">No</button>
        </div></div>
        <div class="vb-row" data-item="Crowded Area"><span class="vb-label">Crowded Area</span><div class="vb-chips">
          <button type="button" class="irr-chip vb-chip" data-val="Yes" onclick="VestibularForm.pickBattery(this)">Yes</button>
          <button type="button" class="irr-chip vb-chip" data-val="No" onclick="VestibularForm.pickBattery(this)">No</button>
        </div></div>
        <div class="vb-row" data-item="Escalator / Stairs"><span class="vb-label">Escalator / Stairs</span><div class="vb-chips">
          <button type="button" class="irr-chip vb-chip" data-val="Yes" onclick="VestibularForm.pickBattery(this)">Yes</button>
          <button type="button" class="irr-chip vb-chip" data-val="No" onclick="VestibularForm.pickBattery(this)">No</button>
        </div></div>
        <div class="vb-row" data-item="Watch TV / Movie"><span class="vb-label">Watch TV / Movie</span><div class="vb-chips">
          <button type="button" class="irr-chip vb-chip" data-val="Yes" onclick="VestibularForm.pickBattery(this)">Yes</button>
          <button type="button" class="irr-chip vb-chip" data-val="No" onclick="VestibularForm.pickBattery(this)">No</button>
        </div></div>
      </div>
    </div>
  </div>
</div>

<!-- 06 FALLS -->
<div class="card" id="s-falls">
  <div class="card-header"><span class="sec-num">06</span><h2>Falls</h2></div>
  <div class="card-body">
    <div class="fg c2">
      <div class="field">
        <label>Frequency of Falls</label>
        <input type="text" id="vb-falls-freq" placeholder="e.g. 2x in past month">
      </div>
      <div class="field">
        <label>Injury from Fall</label>
        <input type="text" id="vb-falls-injury" placeholder="Date, number, area of injury">
      </div>
    </div>
  </div>
</div>

<!-- 07 VERTIGO & DISEQUILIBRIUM -->
<div class="card" id="s-vertigo">
  <div class="card-header"><span class="sec-num">07</span><h2>Vertigo &amp; Disequilibrium</h2></div>
  <div class="card-body">
    <div class="vb-battery-title" style="margin-bottom:8px">Vertigo (a sense of spinning)</div>
    <div class="fg">
      <div class="field">
        <label>Spontaneous</label>
        <div class="irr-chips" id="vb-vert-spont">
          <button type="button" class="irr-chip" data-val="Yes" onclick="VestibularForm.pick3('vb-vert-spont', this)">Yes</button>
          <button type="button" class="irr-chip" data-val="No" onclick="VestibularForm.pick3('vb-vert-spont', this)">No</button>
        </div>
      </div>
      <div class="field">
        <label>Induced by motion</label>
        <div class="irr-chips" id="vb-vert-motion">
          <button type="button" class="irr-chip" data-val="Yes" onclick="VestibularForm.pick3('vb-vert-motion', this)">Yes</button>
          <button type="button" class="irr-chip" data-val="No" onclick="VestibularForm.pick3('vb-vert-motion', this)">No</button>
        </div>
      </div>
      <div class="field">
        <label>Induced by position changes</label>
        <div class="irr-chips" id="vb-vert-position">
          <button type="button" class="irr-chip" data-val="Yes" onclick="VestibularForm.pick3('vb-vert-position', this)">Yes</button>
          <button type="button" class="irr-chip" data-val="No" onclick="VestibularForm.pick3('vb-vert-position', this)">No</button>
        </div>
      </div>
      <div class="field">
        <label>Tempo</label>
        <div class="irr-chips" id="vb-vert-tempo">
          <button type="button" class="irr-chip" data-val="&lt; 3 days" onclick="VestibularForm.pick3('vb-vert-tempo', this)">&lt; 3 days</button>
          <button type="button" class="irr-chip" data-val="&gt; 3 days" onclick="VestibularForm.pick3('vb-vert-tempo', this)">&gt; 3 days</button>
        </div>
      </div>
      <div class="field">
        <label>Spells</label>
        <div class="irr-chips" id="vb-vert-spells">
          <button type="button" class="irr-chip" data-val="seconds" onclick="VestibularForm.pick3('vb-vert-spells', this)">Seconds</button>
          <button type="button" class="irr-chip" data-val="minute" onclick="VestibularForm.pick3('vb-vert-spells', this)">Minute</button>
          <button type="button" class="irr-chip" data-val="hours" onclick="VestibularForm.pick3('vb-vert-spells', this)">Hours</button>
        </div>
      </div>
    </div>

    <div class="vb-battery-title" style="margin:16px 0 8px">Disequilibrium (sense of being off-balance)</div>
    <div class="fg">
      <div class="field">
        <label>Constant</label>
        <div class="irr-chips" id="vb-diseq-constant">
          <button type="button" class="irr-chip" data-val="Yes" onclick="VestibularForm.pick3('vb-diseq-constant', this)">Yes</button>
          <button type="button" class="irr-chip" data-val="No" onclick="VestibularForm.pick3('vb-diseq-constant', this)">No</button>
        </div>
      </div>
      <div class="field">
        <label>Spontaneous</label>
        <div class="irr-chips" id="vb-diseq-spont">
          <button type="button" class="irr-chip" data-val="Yes" onclick="VestibularForm.pick3('vb-diseq-spont', this)">Yes</button>
          <button type="button" class="irr-chip" data-val="No" onclick="VestibularForm.pick3('vb-diseq-spont', this)">No</button>
        </div>
      </div>
      <div class="field">
        <label>Induced by motion</label>
        <div class="irr-chips" id="vb-diseq-motion">
          <button type="button" class="irr-chip" data-val="Yes" onclick="VestibularForm.pick3('vb-diseq-motion', this)">Yes</button>
          <button type="button" class="irr-chip" data-val="No" onclick="VestibularForm.pick3('vb-diseq-motion', this)">No</button>
        </div>
      </div>
      <div class="field">
        <label>Induced by position changes</label>
        <div class="irr-chips" id="vb-diseq-position">
          <button type="button" class="irr-chip" data-val="Yes" onclick="VestibularForm.pick3('vb-diseq-position', this)">Yes</button>
          <button type="button" class="irr-chip" data-val="No" onclick="VestibularForm.pick3('vb-diseq-position', this)">No</button>
        </div>
      </div>
      <div class="field">
        <label>Worse in the dark</label>
        <div class="irr-chips" id="vb-diseq-dark">
          <button type="button" class="irr-chip" data-val="Yes" onclick="VestibularForm.pick3('vb-diseq-dark', this)">Yes</button>
          <button type="button" class="irr-chip" data-val="No" onclick="VestibularForm.pick3('vb-diseq-dark', this)">No</button>
        </div>
      </div>
      <div class="field">
        <label>Worse in</label>
        <div class="chip-group" id="vb-diseq-worsein">
          <button type="button" class="chip" onclick="VestibularForm.toggleChip(this)">Lying</button>
          <button type="button" class="chip" onclick="VestibularForm.toggleChip(this)">Standing</button>
          <button type="button" class="chip" onclick="VestibularForm.toggleChip(this)">Sitting</button>
          <button type="button" class="chip" onclick="VestibularForm.toggleChip(this)">Walking</button>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- 08 MEASURES -->
<div class="card" id="s-measures">
  <div class="card-header"><span class="sec-num">08</span><h2>Measures</h2></div>
  <div class="card-body">
    <div class="fg c2">
      <div class="field">
        <label>Dizziness Handicap Inventory (DHI)</label>
        <input type="number" id="vb-dhi" min="0" max="100">
      </div>
      <div class="field">
        <label>Activities Specific Balance Confidence Scale (ABC)</label>
        <input type="number" id="vb-abc" min="0" max="100">
      </div>
    </div>
  </div>
</div>

<!-- 09 OCULOMOTOR -->
<div class="card" id="s-oculomotor">
  <div class="card-header"><span class="sec-num">09</span><h2>Objective Examination / Oculomotor Examination</h2></div>
  <div class="card-body">
    <div class="vb-battery" id="battery-oculomotor">
      <div class="vb-battery-head">
        <span class="vb-battery-title">Oculomotor Examination</span>
        <button type="button" class="vb-stamp" onclick="VestibularForm.stampBattery('battery-oculomotor','&minus;Ve')">Stamp remaining &rarr; &minus;Ve</button>
      </div>
      <button type="button" class="vb-kiv-toggle" onclick="VestibularForm.toggleKiv('battery-oculomotor')">KIV &mdash; unable to answer this visit</button>
      <div class="vb-kiv-wrap collapsed" id="battery-oculomotor-kiv-wrap">
        <input type="text" id="battery-oculomotor-kiv" placeholder="Reason (optional)" oninput="VestibularForm.onKivInput('battery-oculomotor')">
      </div>
      <div id="battery-oculomotor-rows">
        <div class="vb-row" data-item="Spontaneous Nystagmus"><span class="vb-label">Spontaneous Nystagmus</span><div class="vb-chips">
          <button type="button" class="irr-chip vb-chip" data-val="+Ve" onclick="VestibularForm.pickBattery(this)">+Ve</button>
          <button type="button" class="irr-chip vb-chip" data-val="&minus;Ve" onclick="VestibularForm.pickBattery(this)">&minus;Ve</button>
        </div></div>
        <div class="vb-row" data-item="Smooth pursuit"><span class="vb-label">Smooth pursuit</span><div class="vb-chips">
          <button type="button" class="irr-chip vb-chip" data-val="+Ve" onclick="VestibularForm.pickBattery(this)">+Ve</button>
          <button type="button" class="irr-chip vb-chip" data-val="&minus;Ve" onclick="VestibularForm.pickBattery(this)">&minus;Ve</button>
        </div></div>
        <div class="vb-row" data-item="Saccades"><span class="vb-label">Saccades</span><div class="vb-chips">
          <button type="button" class="irr-chip vb-chip" data-val="+Ve" onclick="VestibularForm.pickBattery(this)">+Ve</button>
          <button type="button" class="irr-chip vb-chip" data-val="&minus;Ve" onclick="VestibularForm.pickBattery(this)">&minus;Ve</button>
        </div></div>
        <div class="vb-row" data-item="Gaze Holding Nystagmus"><span class="vb-label">Gaze Holding Nystagmus</span><div class="vb-chips">
          <button type="button" class="irr-chip vb-chip" data-val="+Ve" onclick="VestibularForm.pickBattery(this)">+Ve</button>
          <button type="button" class="irr-chip vb-chip" data-val="&minus;Ve" onclick="VestibularForm.pickBattery(this)">&minus;Ve</button>
        </div></div>
        <div class="vb-row" data-item="VOR Cancellation"><span class="vb-label">VOR Cancellation</span><div class="vb-chips">
          <button type="button" class="irr-chip vb-chip" data-val="+Ve" onclick="VestibularForm.pickBattery(this)">+Ve</button>
          <button type="button" class="irr-chip vb-chip" data-val="&minus;Ve" onclick="VestibularForm.pickBattery(this)">&minus;Ve</button>
        </div></div>
        <div class="vb-row" data-item="Head Thrusts">
          <span class="vb-label">Head Thrusts</span>
          <div class="vb-chips">
            <button type="button" class="irr-chip vb-chip" data-val="+Ve" onclick="VestibularForm.pickBattery(this)">+Ve</button>
            <button type="button" class="irr-chip vb-chip" data-val="&minus;Ve" onclick="VestibularForm.pickBattery(this)">&minus;Ve</button>
            <span class="irr-chips" id="vb-headthrust-side" style="margin-left:8px">
              <button type="button" class="irr-chip" data-val="R" onclick="VestibularForm.pick3('vb-headthrust-side', this)">R</button>
              <button type="button" class="irr-chip" data-val="L" onclick="VestibularForm.pick3('vb-headthrust-side', this)">L</button>
              <button type="button" class="irr-chip" data-val="BIL" onclick="VestibularForm.pick3('vb-headthrust-side', this)">BIL</button>
            </span>
          </div>
        </div>
        <div class="vb-row" data-item="Dynamic Visual Acuity"><span class="vb-label">Dynamic Visual Acuity</span><div class="vb-chips">
          <button type="button" class="irr-chip vb-chip" data-val="+Ve" onclick="VestibularForm.pickBattery(this)">+Ve</button>
          <button type="button" class="irr-chip vb-chip" data-val="&minus;Ve" onclick="VestibularForm.pickBattery(this)">&minus;Ve</button>
        </div></div>
        <div class="vb-row" data-item="Head Shaking"><span class="vb-label">Head Shaking</span><div class="vb-chips">
          <button type="button" class="irr-chip vb-chip" data-val="+Ve" onclick="VestibularForm.pickBattery(this)">+Ve</button>
          <button type="button" class="irr-chip vb-chip" data-val="&minus;Ve" onclick="VestibularForm.pickBattery(this)">&minus;Ve</button>
        </div></div>
      </div>
    </div>
  </div>
</div>

<!-- 10 POSITIONING TESTS — scaffold chip, JS-rendered by vestibular_scaffold.js -->
<div class="card" id="s-positional">
  <div class="card-header"><span class="sec-num">10</span><h2>Positioning Tests</h2></div>
  <div class="card-body">
    <div id="scaffold-r-dixhallpike"></div>
    <div id="scaffold-l-dixhallpike"></div>
    <div id="scaffold-r-roll"></div>
    <div id="scaffold-l-roll"></div>
  </div>
</div>

<!-- 11 AROM/PROM & STRENGTH -->
<div class="card" id="s-rom">
  <div class="card-header"><span class="sec-num">11</span><h2>AROM / PROM &amp; Strength</h2></div>
  <div class="card-body">
    <div class="vb-battery-title" style="margin-bottom:8px">AROM / PROM</div>
    <div class="vb-fixed-row">
      <span class="vb-fixed-row-label">Neck</span>
      <div class="vb-fixed-row-fields">
        <div class="field"><label>Range</label><input type="text" id="vb-rom-neck-range"></div>
        <div class="field"><label>Quality / Symptom</label><input type="text" id="vb-rom-neck-quality"></div>
        <div class="field"><label>Pain (0&ndash;10)</label><input type="number" id="vb-rom-neck-pain" min="0" max="10"></div>
      </div>
    </div>
    <div class="vb-fixed-row">
      <span class="vb-fixed-row-label">R UL</span>
      <div class="vb-fixed-row-fields">
        <div class="field"><label>Range</label><input type="text" id="vb-rom-rul-range"></div>
        <div class="field"><label>Quality / Symptom</label><input type="text" id="vb-rom-rul-quality"></div>
        <div class="field"><label>Pain (0&ndash;10)</label><input type="number" id="vb-rom-rul-pain" min="0" max="10"></div>
      </div>
    </div>
    <div class="vb-fixed-row">
      <span class="vb-fixed-row-label">L UL</span>
      <div class="vb-fixed-row-fields">
        <div class="field"><label>Range</label><input type="text" id="vb-rom-lul-range"></div>
        <div class="field"><label>Quality / Symptom</label><input type="text" id="vb-rom-lul-quality"></div>
        <div class="field"><label>Pain (0&ndash;10)</label><input type="number" id="vb-rom-lul-pain" min="0" max="10"></div>
      </div>
    </div>
    <div class="vb-fixed-row">
      <span class="vb-fixed-row-label">R LL</span>
      <div class="vb-fixed-row-fields">
        <div class="field"><label>Range</label><input type="text" id="vb-rom-rll-range"></div>
        <div class="field"><label>Quality / Symptom</label><input type="text" id="vb-rom-rll-quality"></div>
        <div class="field"><label>Pain (0&ndash;10)</label><input type="number" id="vb-rom-rll-pain" min="0" max="10"></div>
      </div>
    </div>
    <div class="vb-fixed-row">
      <span class="vb-fixed-row-label">L LL</span>
      <div class="vb-fixed-row-fields">
        <div class="field"><label>Range</label><input type="text" id="vb-rom-lll-range"></div>
        <div class="field"><label>Quality / Symptom</label><input type="text" id="vb-rom-lll-quality"></div>
        <div class="field"><label>Pain (0&ndash;10)</label><input type="number" id="vb-rom-lll-pain" min="0" max="10"></div>
      </div>
    </div>

    <div class="vb-battery-title" style="margin:16px 0 8px">Strength (MMT grade)</div>
    <div class="fg c2">
      <div class="field"><label>UL &mdash; R</label><input type="text" id="vb-str-ul-r"></div>
      <div class="field"><label>UL &mdash; L</label><input type="text" id="vb-str-ul-l"></div>
      <div class="field"><label>LL &mdash; R</label><input type="text" id="vb-str-ll-r"></div>
      <div class="field"><label>LL &mdash; L</label><input type="text" id="vb-str-ll-l"></div>
    </div>
  </div>
</div>

<!-- 12 SOMATOSENSORY & COORDINATION -->
<div class="card" id="s-neuro">
  <div class="card-header"><span class="sec-num">12</span><h2>Somatosensory &amp; Coordination</h2></div>
  <div class="card-body">
    <div class="vb-battery-title" style="margin-bottom:8px">Somatosensory (Proprioception)</div>
    <div class="fg c2">
      <div class="field">
        <label>Proprioception UL &mdash; R</label>
        <div class="irr-chips" id="vb-prop-ul-r"><button type="button" class="irr-chip" data-val="Intact" onclick="VestibularForm.pick3('vb-prop-ul-r', this)">Intact</button><button type="button" class="irr-chip" data-val="Impaired" onclick="VestibularForm.pick3('vb-prop-ul-r', this)">Impaired</button></div>
        <input type="text" id="vb-prop-ul-r-note" placeholder="Impaired joint (if applicable)" style="margin-top:6px">
      </div>
      <div class="field">
        <label>Proprioception UL &mdash; L</label>
        <div class="irr-chips" id="vb-prop-ul-l"><button type="button" class="irr-chip" data-val="Intact" onclick="VestibularForm.pick3('vb-prop-ul-l', this)">Intact</button><button type="button" class="irr-chip" data-val="Impaired" onclick="VestibularForm.pick3('vb-prop-ul-l', this)">Impaired</button></div>
        <input type="text" id="vb-prop-ul-l-note" placeholder="Impaired joint (if applicable)" style="margin-top:6px">
      </div>
      <div class="field">
        <label>Proprioception LL &mdash; R</label>
        <div class="irr-chips" id="vb-prop-ll-r"><button type="button" class="irr-chip" data-val="Intact" onclick="VestibularForm.pick3('vb-prop-ll-r', this)">Intact</button><button type="button" class="irr-chip" data-val="Impaired" onclick="VestibularForm.pick3('vb-prop-ll-r', this)">Impaired</button></div>
        <input type="text" id="vb-prop-ll-r-note" placeholder="Impaired joint (if applicable)" style="margin-top:6px">
      </div>
      <div class="field">
        <label>Proprioception LL &mdash; L</label>
        <div class="irr-chips" id="vb-prop-ll-l"><button type="button" class="irr-chip" data-val="Intact" onclick="VestibularForm.pick3('vb-prop-ll-l', this)">Intact</button><button type="button" class="irr-chip" data-val="Impaired" onclick="VestibularForm.pick3('vb-prop-ll-l', this)">Impaired</button></div>
        <input type="text" id="vb-prop-ll-l-note" placeholder="Impaired joint (if applicable)" style="margin-top:6px">
      </div>
    </div>

    <div class="vb-battery-title" style="margin:16px 0 8px">Coordination</div>
    <div class="fg c2">
      <div class="field">
        <label>Finger to Nose &mdash; R</label>
        <div class="irr-chips" id="vb-coord-ftn-r"><button type="button" class="irr-chip" data-val="Intact" onclick="VestibularForm.pick3('vb-coord-ftn-r', this)">Intact</button><button type="button" class="irr-chip" data-val="Dysmetria" onclick="VestibularForm.pick3('vb-coord-ftn-r', this)">Dysmetria</button><button type="button" class="irr-chip" data-val="Ataxia" onclick="VestibularForm.pick3('vb-coord-ftn-r', this)">Ataxia</button><button type="button" class="irr-chip" data-val="Tremor" onclick="VestibularForm.pick3('vb-coord-ftn-r', this)">Tremor</button></div>
        <input type="text" id="vb-coord-ftn-r-note" placeholder="Note" style="margin-top:6px">
      </div>
      <div class="field">
        <label>Finger to Nose &mdash; L</label>
        <div class="irr-chips" id="vb-coord-ftn-l"><button type="button" class="irr-chip" data-val="Intact" onclick="VestibularForm.pick3('vb-coord-ftn-l', this)">Intact</button><button type="button" class="irr-chip" data-val="Dysmetria" onclick="VestibularForm.pick3('vb-coord-ftn-l', this)">Dysmetria</button><button type="button" class="irr-chip" data-val="Ataxia" onclick="VestibularForm.pick3('vb-coord-ftn-l', this)">Ataxia</button><button type="button" class="irr-chip" data-val="Tremor" onclick="VestibularForm.pick3('vb-coord-ftn-l', this)">Tremor</button></div>
        <input type="text" id="vb-coord-ftn-l-note" placeholder="Note" style="margin-top:6px">
      </div>
      <div class="field">
        <label>Heel to Shin &mdash; R</label>
        <div class="irr-chips" id="vb-coord-hts-r"><button type="button" class="irr-chip" data-val="Intact" onclick="VestibularForm.pick3('vb-coord-hts-r', this)">Intact</button><button type="button" class="irr-chip" data-val="Dysmetria" onclick="VestibularForm.pick3('vb-coord-hts-r', this)">Dysmetria</button><button type="button" class="irr-chip" data-val="Ataxia" onclick="VestibularForm.pick3('vb-coord-hts-r', this)">Ataxia</button><button type="button" class="irr-chip" data-val="Tremor" onclick="VestibularForm.pick3('vb-coord-hts-r', this)">Tremor</button></div>
        <input type="text" id="vb-coord-hts-r-note" placeholder="Note" style="margin-top:6px">
      </div>
      <div class="field">
        <label>Heel to Shin &mdash; L</label>
        <div class="irr-chips" id="vb-coord-hts-l"><button type="button" class="irr-chip" data-val="Intact" onclick="VestibularForm.pick3('vb-coord-hts-l', this)">Intact</button><button type="button" class="irr-chip" data-val="Dysmetria" onclick="VestibularForm.pick3('vb-coord-hts-l', this)">Dysmetria</button><button type="button" class="irr-chip" data-val="Ataxia" onclick="VestibularForm.pick3('vb-coord-hts-l', this)">Ataxia</button><button type="button" class="irr-chip" data-val="Tremor" onclick="VestibularForm.pick3('vb-coord-hts-l', this)">Tremor</button></div>
        <input type="text" id="vb-coord-hts-l-note" placeholder="Note" style="margin-top:6px">
      </div>
    </div>
  </div>
</div>

<!-- 13 POSTURAL CONTROL / CTSIB -->
<div class="card" id="s-balance">
  <div class="card-header"><span class="sec-num">13</span><h2>Postural Control</h2></div>
  <div class="card-body">
    <div class="vb-battery-title" style="margin-bottom:8px">Postural Control ( : +ve / &minus;ve / sec )</div>
    <div class="vb-fixed-row"><span class="vb-fixed-row-label">Rhomberg</span><div class="vb-fixed-row-fields">
      <div class="field"><label>EO</label><input type="text" id="vb-post-rhomberg-eo"></div>
      <div class="field"><label>EC</label><input type="text" id="vb-post-rhomberg-ec"></div>
    </div></div>
    <div class="vb-fixed-row"><span class="vb-fixed-row-label">R Sharpened Rhomberg</span><div class="vb-fixed-row-fields">
      <div class="field"><label>EO</label><input type="text" id="vb-post-rsharp-eo"></div>
      <div class="field"><label>EC</label><input type="text" id="vb-post-rsharp-ec"></div>
    </div></div>
    <div class="vb-fixed-row"><span class="vb-fixed-row-label">L Sharpened Rhomberg</span><div class="vb-fixed-row-fields">
      <div class="field"><label>EO</label><input type="text" id="vb-post-lsharp-eo"></div>
      <div class="field"><label>EC</label><input type="text" id="vb-post-lsharp-ec"></div>
    </div></div>
    <div class="vb-fixed-row"><span class="vb-fixed-row-label">R Single Leg Stand</span><div class="vb-fixed-row-fields">
      <div class="field"><label>EO</label><input type="text" id="vb-post-rsls-eo"></div>
      <div class="field"><label>EC</label><input type="text" id="vb-post-rsls-ec"></div>
    </div></div>
    <div class="vb-fixed-row"><span class="vb-fixed-row-label">L Single Leg Stand</span><div class="vb-fixed-row-fields">
      <div class="field"><label>EO</label><input type="text" id="vb-post-lsls-eo"></div>
      <div class="field"><label>EC</label><input type="text" id="vb-post-lsls-ec"></div>
    </div></div>
    <div class="fg c2" style="margin-top:12px">
      <div class="field"><label>Time Up &amp; Go Test (seconds)</label><input type="number" id="vb-tug" min="0" step="0.1"></div>
    </div>

    <div class="vb-battery-title" style="margin:16px 0 8px">Clinical Test of Sensory Interaction for Balance (CTSIB)</div>
    <div class="vb-fixed-row"><span class="vb-fixed-row-label">EO Firm surface</span><div class="vb-fixed-row-fields"><div class="field"><label>Seconds</label><input type="number" id="vb-ctsib-eo-firm" min="0" step="0.1"></div></div></div>
    <div class="vb-fixed-row"><span class="vb-fixed-row-label">EC Firm surface</span><div class="vb-fixed-row-fields"><div class="field"><label>Seconds</label><input type="number" id="vb-ctsib-ec-firm" min="0" step="0.1"></div></div></div>
    <div class="vb-fixed-row"><span class="vb-fixed-row-label">EO Foam surface</span><div class="vb-fixed-row-fields"><div class="field"><label>Seconds</label><input type="number" id="vb-ctsib-eo-foam" min="0" step="0.1"></div></div></div>
    <div class="vb-fixed-row"><span class="vb-fixed-row-label">EC Foam surface</span><div class="vb-fixed-row-fields"><div class="field"><label>Seconds</label><input type="number" id="vb-ctsib-ec-foam" min="0" step="0.1"></div></div></div>
  </div>
</div>

<!-- 14 GAIT -->
<div class="card" id="s-gait">
  <div class="card-header"><span class="sec-num">14</span><h2>Gait Assessment</h2></div>
  <div class="card-body">
    <div class="fg c2">
      <div class="field"><label>Velocity (Sec / 20 ft)</label><input type="number" id="vb-gait-velocity" min="0" step="0.1"></div>
      <div class="field"><label>Dynamic Gait Index Score</label><input type="number" id="vb-gait-dgi" min="0" max="24"></div>
      <div class="field">
        <label>Deviation</label>
        <div class="irr-chips" id="vb-gait-deviation">
          <button type="button" class="irr-chip" data-val="Yes" onclick="VestibularForm.pick3('vb-gait-deviation', this)">Yes</button>
          <button type="button" class="irr-chip" data-val="No" onclick="VestibularForm.pick3('vb-gait-deviation', this)">No</button>
        </div>
        <div class="irr-chips" id="vb-gait-deviation-side" style="margin-top:6px">
          <button type="button" class="irr-chip" data-val="R" onclick="VestibularForm.pick3('vb-gait-deviation-side', this)">R</button>
          <button type="button" class="irr-chip" data-val="L" onclick="VestibularForm.pick3('vb-gait-deviation-side', this)">L</button>
        </div>
      </div>
      <div class="field">
        <label>Device</label>
        <div class="irr-chips" id="vb-gait-device">
          <button type="button" class="irr-chip" data-val="Yes" onclick="VestibularForm.pick3('vb-gait-device', this)">Yes</button>
          <button type="button" class="irr-chip" data-val="No" onclick="VestibularForm.pick3('vb-gait-device', this)">No</button>
        </div>
      </div>
    </div>
    <div class="field" style="margin-top:12px">
      <label>Clearance Test</label>
      <textarea id="vb-clearance" rows="2" placeholder="VBI, cervical spine screening, cranial nerve exam"></textarea>
    </div>
  </div>
</div>

<!-- 15 PT IMPRESSION -->
<div class="card" id="s-impression">
  <div class="card-header"><span class="sec-num">15</span><h2>Physiotherapy Impression</h2></div>
  <div class="card-body">
    <div class="field">
      <label>PT Impression</label>
      <textarea id="pt-impression" rows="4" placeholder="ICF-based, in order of priority"></textarea>
    </div>
  </div>
</div>

<!-- 16 GOALS & PLAN -->
<div class="card" id="s-goals">
  <div class="card-header"><span class="sec-num">16</span><h2>Goals &amp; Plan of Treatment</h2></div>
  <div class="card-body">
    <div class="field">
      <label>Short Term Goals</label>
      <textarea id="stg" rows="3"></textarea>
    </div>
    <div class="field">
      <label>Long Term Goals</label>
      <textarea id="ltg" rows="3"></textarea>
    </div>
    <div class="field">
      <label>Plan of Treatment</label>
      <textarea id="plan" rows="4"></textarea>
    </div>
  </div>
</div>

{% endblock %}

{% block extra_js %}
<script src="{{ url_for('static', filename='js/vestibular_scaffold.js') }}"></script>
<script src="{{ url_for('static', filename='js/form_vestibular.js') }}"></script>
<script>
document.addEventListener('DOMContentLoaded', function () {
  VestibularForm.initScaffolds();

  var FM = 'VESTIBULAR';
  ClinicalTemplates.addButton('pt-impression', FM, 'impression');
  ClinicalTemplates.addButton('stg',           FM, 'stg');
  ClinicalTemplates.addButton('ltg',           FM, 'ltg');
  ClinicalTemplates.addButton('plan',          FM, 'treatment');
});
</script>
{% endblock %}
```

- [ ] **Step 2: Paste the CSS block from Task 2, Step 1 into the file**, replacing the `<!-- PASTE CSS BLOCK FROM TASK 2, STEP 1 HERE -->` marker (right after `{% block content %}`, before the first card).

- [ ] **Step 3: No JS yet — Task 4/5 write `form_vestibular.js` and `vestibular_scaffold.js`. Do not smoke-test this file alone; verify after Task 5.**

---

### Task 4: `static/js/vestibular_scaffold.js` — the one net-new component

**Files:**
- Create: `static/js/vestibular_scaffold.js`

- [ ] **Step 1: Write the file**

```js
// vestibular_scaffold.js — Positioning-test scaffold chip (D5 of the VESTIBULAR design spec).
// +Ve unfolds click-to-fill nystagmus detail; −Ve stays collapsed. Config-driven, one
// instance per positioning-test row. Form-local, NOT a shared factory — promotion is a
// BACKLOG item if it proves out in clinic (do not generalize further in this build).

var VestibularScaffold = (function () {

  var DIRECTIONS = ['Upbeat', 'Downbeat', 'Torsional', 'Horizontal', 'Geotropic', 'Ageotropic'];

  function create(containerId, config) {
    var el = document.getElementById(containerId);
    if (!el) return null;
    var state = { result: '' }; // '' = untapped, 'pos', 'neg'

    function render() {
      var dirBtns = DIRECTIONS.map(function (d) {
        return '<button type="button" class="irr-chip vsc-dir" data-val="' + d + '">' + d + '</button>';
      }).join('');

      el.innerHTML =
        '<div class="vsc-row">' +
          '<span class="vsc-label">' + config.label + '</span>' +
          '<div class="vsc-chips">' +
            '<button type="button" class="irr-chip vsc-chip" data-val="pos">+Ve</button>' +
            '<button type="button" class="irr-chip vsc-chip" data-val="neg">&minus;Ve</button>' +
          '</div>' +
        '</div>' +
        '<div class="vsc-detail collapsed" id="' + containerId + '-detail">' +
          '<div class="vsc-directions">' + dirBtns + '</div>' +
          '<div class="fg c3">' +
            '<div class="field"><label>Latency (s)</label><input type="number" id="' + containerId + '-latency" min="0" step="0.1"></div>' +
            '<div class="field"><label>Duration (s)</label><input type="number" id="' + containerId + '-duration" min="0" step="0.1"></div>' +
            '<div class="field"><label>Intensity (0&ndash;10)</label><input type="number" id="' + containerId + '-intensity" min="0" max="10"></div>' +
          '</div>' +
          '<div class="field"><label>Symptoms</label><input type="text" id="' + containerId + '-symptoms" placeholder="e.g. vertigo, nausea"></div>' +
        '</div>';

      el.querySelectorAll('.vsc-chip').forEach(function (c) {
        c.addEventListener('click', function () { pickResult(c.getAttribute('data-val')); });
      });
      el.querySelectorAll('.vsc-dir').forEach(function (c) {
        c.addEventListener('click', function () {
          c.classList.toggle('active');
          c.classList.toggle('sel-dir');
        });
      });
    }

    function pickResult(val) {
      state.result = val;
      el.querySelectorAll('.vsc-chip').forEach(function (c) {
        var v = c.getAttribute('data-val');
        c.classList.toggle('sel-pos', v === 'pos' && val === 'pos');
        c.classList.toggle('sel-neg', v === 'neg' && val === 'neg');
      });
      var detail = document.getElementById(containerId + '-detail');
      if (detail) detail.classList.toggle('collapsed', val !== 'pos');
    }

    function getData() {
      if (state.result === 'neg') return { result: 'neg' };
      if (state.result !== 'pos') return null; // untapped — caller must omit the key entirely
      var dirs = [];
      el.querySelectorAll('.vsc-dir.active').forEach(function (c) { dirs.push(c.getAttribute('data-val')); });
      return {
        result: 'pos',
        direction: dirs,
        latency: document.getElementById(containerId + '-latency').value,
        duration: document.getElementById(containerId + '-duration').value,
        intensity: document.getElementById(containerId + '-intensity').value,
        note: document.getElementById(containerId + '-symptoms').value
      };
    }

    function setData(data) {
      reset();
      if (!data || !data.result) return;
      pickResult(data.result);
      if (data.result === 'pos') {
        el.querySelectorAll('.vsc-dir').forEach(function (c) {
          var on = (data.direction || []).indexOf(c.getAttribute('data-val')) !== -1;
          c.classList.toggle('active', on);
          c.classList.toggle('sel-dir', on);
        });
        document.getElementById(containerId + '-latency').value   = data.latency   || '';
        document.getElementById(containerId + '-duration').value  = data.duration  || '';
        document.getElementById(containerId + '-intensity').value = data.intensity || '';
        document.getElementById(containerId + '-symptoms').value  = data.note      || '';
      }
    }

    function reset() {
      state.result = '';
      el.querySelectorAll('.vsc-chip').forEach(function (c) { c.classList.remove('sel-pos', 'sel-neg'); });
      el.querySelectorAll('.vsc-dir').forEach(function (c) { c.classList.remove('active', 'sel-dir'); });
      var detail = document.getElementById(containerId + '-detail');
      if (detail) detail.classList.add('collapsed');
      ['latency', 'duration', 'intensity', 'symptoms'].forEach(function (f) {
        var input = document.getElementById(containerId + '-' + f);
        if (input) input.value = '';
      });
    }

    render();
    return { getData: getData, setData: setData, reset: reset };
  }

  return { create: create };
})();
```

- [ ] **Step 2: Syntax check**

```bash
node --check static/js/vestibular_scaffold.js
```
Expected: no output (clean exit).

- [ ] **Step 3: Commit**

```bash
git add static/js/vestibular_scaffold.js
git commit -m "vestibular: add scaffold chip component (positioning tests)"
```

---

### Task 5: `static/js/form_vestibular.js` — collect/populate/reset + battery/chip helpers

**Files:**
- Create: `static/js/form_vestibular.js`

- [ ] **Step 1: Write the file**

```js
// form_vestibular.js — Vestibular assessment form logic.
// Battery chip pairs are hand-authored HTML rows (vestibular.html); this file supplies
// ONE generic set of handlers (pickBattery/getBatteryData/setBatteryData/stampBattery/
// toggleKiv) that drives every battery via data-item/data-val attributes — not a
// per-battery JS block. Positioning tests use VestibularScaffold (vestibular_scaffold.js).
// Chip helper (toggleChip/getChips/setChips) is a form-local copy of the NEURO/FACIAL
// pattern — promotion to FormBase is DEFERRED to BACKLOG, do not import FormBase's chip
// helpers here even if they exist elsewhere.

var VestibularForm = (function () {

  function gv(id)        { return FormBase.gv(id); }
  function sv(id, val)   { return FormBase.sv(id, val); }

  // ── Multi-select chips (form-local copy, mirrors form_facial.js:16-30) ──
  function toggleChip(el) { el.classList.toggle('active'); }
  function getChips(groupId) {
    var out = [];
    document.querySelectorAll('#' + groupId + ' .chip.active').forEach(function (c) { out.push(c.textContent.trim()); });
    return out;
  }
  function setChips(groupId, values) {
    if (!Array.isArray(values)) values = [];
    document.querySelectorAll('#' + groupId + ' .chip').forEach(function (c) {
      c.classList.toggle('active', values.indexOf(c.textContent.trim()) !== -1);
    });
  }

  // ── 2/3-way single-select chip (marital, smoking, side selectors, etc.) ──
  // groupId's chips carry data-val; class list gets sel-<Val> (spaces stripped for CSS safety).
  function cssVal(v) { return String(v).replace(/[^A-Za-z0-9]/g, ''); }
  function pick3(groupId, el) {
    var group = document.getElementById(groupId);
    if (!group) return;
    group.querySelectorAll('.irr-chip').forEach(function (c) {
      c.classList.remove('active');
      group.querySelectorAll('.irr-chip').forEach(function (d) { c.classList.remove('sel-' + cssVal(d.getAttribute('data-val'))); });
    });
    el.classList.add('active', 'sel-' + cssVal(el.getAttribute('data-val')));
  }
  function get3(groupId) {
    var el = document.querySelector('#' + groupId + ' .irr-chip.active');
    return el ? el.getAttribute('data-val') : '';
  }
  function set3(groupId, value) {
    var group = document.getElementById(groupId);
    if (!group) return;
    group.querySelectorAll('.irr-chip').forEach(function (c) {
      var on = c.getAttribute('data-val') === value;
      c.classList.toggle('active', on);
      c.classList.remove('sel-' + cssVal(c.getAttribute('data-val')));
      if (on) c.classList.add('sel-' + cssVal(value));
    });
  }

  // ── Battery chip pairs (D1/D2/D3) — generic across every battery container ──
  function pickBattery(el) {
    var row = el.closest('.vb-row');
    if (!row) return;
    row.querySelectorAll('.vb-chip').forEach(function (c) {
      c.classList.remove('active', 'sel-Yes', 'sel-No', 'sel-Pos', 'sel-Neg');
    });
    var val = el.getAttribute('data-val');
    var stateClass = (val === '+Ve') ? 'sel-Pos' : (val === '−Ve') ? 'sel-Neg' : ('sel-' + val);
    el.classList.add('active', stateClass);
  }
  function getBatteryData(containerId) {
    var out = {};
    document.querySelectorAll('#' + containerId + '-rows .vb-row').forEach(function (row) {
      var sel = row.querySelector('.vb-chip.active');
      if (sel) out[row.getAttribute('data-item')] = sel.getAttribute('data-val');
    });
    return out;
  }
  function setBatteryData(containerId, data) {
    data = data || {};
    document.querySelectorAll('#' + containerId + '-rows .vb-row').forEach(function (row) {
      var val = data[row.getAttribute('data-item')];
      row.querySelectorAll('.vb-chip').forEach(function (c) {
        c.classList.remove('active', 'sel-Yes', 'sel-No', 'sel-Pos', 'sel-Neg');
      });
      if (val) {
        var target = row.querySelector('.vb-chip[data-val="' + val + '"]');
        if (target) pickBattery(target);
      }
    });
  }
  function clearBatteryData(containerId) {
    document.querySelectorAll('#' + containerId + '-rows .vb-chip').forEach(function (c) {
      c.classList.remove('active', 'sel-Yes', 'sel-No', 'sel-Pos', 'sel-Neg');
    });
  }
  function stampBattery(containerId, baseline) {
    document.querySelectorAll('#' + containerId + '-rows .vb-row').forEach(function (row) {
      if (row.querySelector('.vb-chip.active')) return; // non-destructive — skip already-tapped
      var target = row.querySelector('.vb-chip[data-val="' + baseline + '"]');
      if (target) pickBattery(target);
    });
  }

  // ── KIV remark (D4) — section-level (per battery), overrides item list on collect ──
  function toggleKiv(containerId) {
    var wrap = document.getElementById(containerId + '-kiv-wrap');
    var battery = document.getElementById(containerId);
    if (!wrap) return;
    wrap.classList.toggle('collapsed');
    if (battery) battery.classList.toggle('vb-kiv-active', !wrap.classList.contains('collapsed'));
  }
  function onKivInput(containerId) {
    var battery = document.getElementById(containerId);
    var input   = document.getElementById(containerId + '-kiv');
    if (battery && input) battery.classList.toggle('vb-kiv-active', input.value.trim() !== '');
  }
  function getKiv(containerId) {
    var input = document.getElementById(containerId + '-kiv');
    return input ? input.value.trim() : '';
  }
  function setKiv(containerId, text) {
    var input = document.getElementById(containerId + '-kiv');
    var wrap  = document.getElementById(containerId + '-kiv-wrap');
    var battery = document.getElementById(containerId);
    if (input) input.value = text || '';
    var active = !!(text && text.trim());
    if (wrap) wrap.classList.toggle('collapsed', !active);
    if (battery) battery.classList.toggle('vb-kiv-active', active);
  }

  // ── Battery collect/populate — reads KIV first (overrides item list per D4) ──
  function collectBattery(containerId) {
    var kiv = getKiv(containerId);
    if (kiv) return { kiv: kiv };
    var items = getBatteryData(containerId);
    return Object.keys(items).length ? { items: items } : null; // null = blank/untapped = N/A (D3)
  }
  function populateBattery(containerId, data) {
    data = data || {};
    setKiv(containerId, data.kiv || '');
    setBatteryData(containerId, data.items || {});
  }
  function resetBattery(containerId) {
    setKiv(containerId, '');
    clearBatteryData(containerId);
  }

  // ── Scaffold instances (positioning tests) ──
  var scaffolds = {};
  function initScaffolds() {
    scaffolds.rDixHallpike = VestibularScaffold.create('scaffold-r-dixhallpike', { label: 'R Dix Hallpike' });
    scaffolds.lDixHallpike = VestibularScaffold.create('scaffold-l-dixhallpike', { label: 'L Dix Hallpike' });
    scaffolds.rRoll        = VestibularScaffold.create('scaffold-r-roll',        { label: 'R Roll' });
    scaffolds.lRoll        = VestibularScaffold.create('scaffold-l-roll',        { label: 'L Roll' });
  }

  // ── Collect ──────────────────────────────────────────────────────────────
  function collect() {
    var d = {
      _form_type: 'VESTIBULAR',
      meta: { form: 'VESTIBULAR' },
      patient: FormBase.collectPatient(),

      referral: { dx: gv('vb-dx'), mgmt: gv('vb-mgmt') },
      history:  { current: gv('vb-hx-current'), past: gv('vb-hx-past'), problem: gv('vb-problem') },

      pmhx:             collectBattery('battery-pmhx'),
      recentSymptoms:   collectBattery('battery-recent-symptoms'),
      ix:               gv('vb-ix'),
      medication:       gv('vb-medication'),

      social: {
        occupation: gv('vb-occupation'),
        marital:    get3('vb-marital'),
        smoking:    get3('vb-smoking'),
        alcohol:    get3('vb-alcohol'),
        sleep:      get3('vb-sleep')
      },
      functionalStatus: collectBattery('battery-functional'),

      falls: { frequency: gv('vb-falls-freq'), injury: gv('vb-falls-injury') },

      vertigo: {
        spontaneous: get3('vb-vert-spont'),
        motion:      get3('vb-vert-motion'),
        position:    get3('vb-vert-position'),
        tempo:       get3('vb-vert-tempo'),
        spells:      get3('vb-vert-spells')
      },
      disequilibrium: {
        constant:  get3('vb-diseq-constant'),
        spontaneous: get3('vb-diseq-spont'),
        motion:    get3('vb-diseq-motion'),
        position:  get3('vb-diseq-position'),
        dark:      get3('vb-diseq-dark'),
        worseIn:   getChips('vb-diseq-worsein')
      },

      measures: { dhi: gv('vb-dhi'), abc: gv('vb-abc') },

      oculomotor: collectBattery('battery-oculomotor'),
      headThrustSide: get3('vb-headthrust-side'),

      positional: {
        rDixHallpike: scaffolds.rDixHallpike ? scaffolds.rDixHallpike.getData() : null,
        lDixHallpike: scaffolds.lDixHallpike ? scaffolds.lDixHallpike.getData() : null,
        rRoll:        scaffolds.rRoll        ? scaffolds.rRoll.getData()        : null,
        lRoll:        scaffolds.lRoll        ? scaffolds.lRoll.getData()        : null
      },

      rom: {
        neck: { range: gv('vb-rom-neck-range'), quality: gv('vb-rom-neck-quality'), pain: gv('vb-rom-neck-pain') },
        rUl:  { range: gv('vb-rom-rul-range'),  quality: gv('vb-rom-rul-quality'),  pain: gv('vb-rom-rul-pain') },
        lUl:  { range: gv('vb-rom-lul-range'),  quality: gv('vb-rom-lul-quality'),  pain: gv('vb-rom-lul-pain') },
        rLl:  { range: gv('vb-rom-rll-range'),  quality: gv('vb-rom-rll-quality'),  pain: gv('vb-rom-rll-pain') },
        lLl:  { range: gv('vb-rom-lll-range'),  quality: gv('vb-rom-lll-quality'),  pain: gv('vb-rom-lll-pain') }
      },
      strength: { ulR: gv('vb-str-ul-r'), ulL: gv('vb-str-ul-l'), llR: gv('vb-str-ll-r'), llL: gv('vb-str-ll-l') },

      somatosensory: {
        propUlR: { status: get3('vb-prop-ul-r'), note: gv('vb-prop-ul-r-note') },
        propUlL: { status: get3('vb-prop-ul-l'), note: gv('vb-prop-ul-l-note') },
        propLlR: { status: get3('vb-prop-ll-r'), note: gv('vb-prop-ll-r-note') },
        propLlL: { status: get3('vb-prop-ll-l'), note: gv('vb-prop-ll-l-note') }
      },
      coordination: {
        ftnR: { status: get3('vb-coord-ftn-r'), note: gv('vb-coord-ftn-r-note') },
        ftnL: { status: get3('vb-coord-ftn-l'), note: gv('vb-coord-ftn-l-note') },
        htsR: { status: get3('vb-coord-hts-r'), note: gv('vb-coord-hts-r-note') },
        htsL: { status: get3('vb-coord-hts-l'), note: gv('vb-coord-hts-l-note') }
      },

      postural: {
        rhomberg: { eo: gv('vb-post-rhomberg-eo'), ec: gv('vb-post-rhomberg-ec') },
        rSharpened: { eo: gv('vb-post-rsharp-eo'), ec: gv('vb-post-rsharp-ec') },
        lSharpened: { eo: gv('vb-post-lsharp-eo'), ec: gv('vb-post-lsharp-ec') },
        rSls: { eo: gv('vb-post-rsls-eo'), ec: gv('vb-post-rsls-ec') },
        lSls: { eo: gv('vb-post-lsls-eo'), ec: gv('vb-post-lsls-ec') },
        tug: gv('vb-tug')
      },
      ctsib: {
        eoFirm: gv('vb-ctsib-eo-firm'), ecFirm: gv('vb-ctsib-ec-firm'),
        eoFoam: gv('vb-ctsib-eo-foam'), ecFoam: gv('vb-ctsib-ec-foam')
      },

      gait: {
        velocity: gv('vb-gait-velocity'),
        deviation: get3('vb-gait-deviation'),
        deviationSide: get3('vb-gait-deviation-side'),
        device: get3('vb-gait-device'),
        dgi: gv('vb-gait-dgi')
      },
      clearance: gv('vb-clearance'),

      impression: gv('pt-impression'),
      stg: gv('stg'),
      ltg: gv('ltg'),
      plan: gv('plan')
    };
    return d;
  }

  // ── Populate ─────────────────────────────────────────────────────────────
  function populate(d) {
    if (!d) return;
    if (d.patient) FormBase.populatePatient(d.patient);

    var referral = d.referral || {};
    sv('vb-dx', referral.dx); sv('vb-mgmt', referral.mgmt);

    var history = d.history || {};
    sv('vb-hx-current', history.current); sv('vb-hx-past', history.past); sv('vb-problem', history.problem);

    populateBattery('battery-pmhx', d.pmhx);
    populateBattery('battery-recent-symptoms', d.recentSymptoms);
    sv('vb-ix', d.ix); sv('vb-medication', d.medication);

    var social = d.social || {};
    sv('vb-occupation', social.occupation);
    set3('vb-marital', social.marital); set3('vb-smoking', social.smoking);
    set3('vb-alcohol', social.alcohol); set3('vb-sleep', social.sleep);
    populateBattery('battery-functional', d.functionalStatus);

    var falls = d.falls || {};
    sv('vb-falls-freq', falls.frequency); sv('vb-falls-injury', falls.injury);

    var vertigo = d.vertigo || {};
    set3('vb-vert-spont', vertigo.spontaneous); set3('vb-vert-motion', vertigo.motion);
    set3('vb-vert-position', vertigo.position); set3('vb-vert-tempo', vertigo.tempo);
    set3('vb-vert-spells', vertigo.spells);

    var diseq = d.disequilibrium || {};
    set3('vb-diseq-constant', diseq.constant); set3('vb-diseq-spont', diseq.spontaneous);
    set3('vb-diseq-motion', diseq.motion); set3('vb-diseq-position', diseq.position);
    set3('vb-diseq-dark', diseq.dark); setChips('vb-diseq-worsein', diseq.worseIn);

    var measures = d.measures || {};
    sv('vb-dhi', measures.dhi); sv('vb-abc', measures.abc);

    populateBattery('battery-oculomotor', d.oculomotor);
    set3('vb-headthrust-side', d.headThrustSide);

    var pos = d.positional || {};
    if (scaffolds.rDixHallpike) scaffolds.rDixHallpike.setData(pos.rDixHallpike);
    if (scaffolds.lDixHallpike) scaffolds.lDixHallpike.setData(pos.lDixHallpike);
    if (scaffolds.rRoll)        scaffolds.rRoll.setData(pos.rRoll);
    if (scaffolds.lRoll)        scaffolds.lRoll.setData(pos.lRoll);

    var rom = d.rom || {};
    var romIdMap = { neck: 'neck', rUl: 'rul', lUl: 'lul', rLl: 'rll', lLl: 'lll' };
    Object.keys(romIdMap).forEach(function (k) {
      var r = rom[k] || {};
      var id = romIdMap[k];
      sv('vb-rom-' + id + '-range', r.range); sv('vb-rom-' + id + '-quality', r.quality); sv('vb-rom-' + id + '-pain', r.pain);
    });
    var strength = d.strength || {};
    sv('vb-str-ul-r', strength.ulR); sv('vb-str-ul-l', strength.ulL);
    sv('vb-str-ll-r', strength.llR); sv('vb-str-ll-l', strength.llL);

    var soma = d.somatosensory || {};
    set3('vb-prop-ul-r', (soma.propUlR||{}).status); sv('vb-prop-ul-r-note', (soma.propUlR||{}).note);
    set3('vb-prop-ul-l', (soma.propUlL||{}).status); sv('vb-prop-ul-l-note', (soma.propUlL||{}).note);
    set3('vb-prop-ll-r', (soma.propLlR||{}).status); sv('vb-prop-ll-r-note', (soma.propLlR||{}).note);
    set3('vb-prop-ll-l', (soma.propLlL||{}).status); sv('vb-prop-ll-l-note', (soma.propLlL||{}).note);

    var coord = d.coordination || {};
    set3('vb-coord-ftn-r', (coord.ftnR||{}).status); sv('vb-coord-ftn-r-note', (coord.ftnR||{}).note);
    set3('vb-coord-ftn-l', (coord.ftnL||{}).status); sv('vb-coord-ftn-l-note', (coord.ftnL||{}).note);
    set3('vb-coord-hts-r', (coord.htsR||{}).status); sv('vb-coord-hts-r-note', (coord.htsR||{}).note);
    set3('vb-coord-hts-l', (coord.htsL||{}).status); sv('vb-coord-hts-l-note', (coord.htsL||{}).note);

    var postural = d.postural || {};
    ['rhomberg','rSharpened','lSharpened','rSls','lSls'].forEach(function (k) {
      var v = postural[k] || {};
      var idMap = { rhomberg:'rhomberg', rSharpened:'rsharp', lSharpened:'lsharp', rSls:'rsls', lSls:'lsls' };
      var id = idMap[k];
      sv('vb-post-' + id + '-eo', v.eo); sv('vb-post-' + id + '-ec', v.ec);
    });
    sv('vb-tug', postural.tug);

    var ctsib = d.ctsib || {};
    sv('vb-ctsib-eo-firm', ctsib.eoFirm); sv('vb-ctsib-ec-firm', ctsib.ecFirm);
    sv('vb-ctsib-eo-foam', ctsib.eoFoam); sv('vb-ctsib-ec-foam', ctsib.ecFoam);

    var gait = d.gait || {};
    sv('vb-gait-velocity', gait.velocity); set3('vb-gait-deviation', gait.deviation);
    set3('vb-gait-deviation-side', gait.deviationSide); set3('vb-gait-device', gait.device);
    sv('vb-gait-dgi', gait.dgi);
    sv('vb-clearance', d.clearance);

    sv('pt-impression', d.impression); sv('stg', d.stg); sv('ltg', d.ltg); sv('plan', d.plan);
  }

  // ── Reset (snapshot-restore pattern, WORKFLOW) ──────────────────────────
  function reset(keepPatient) {
    var savedPt = keepPatient ? FormBase.collectPatient() : null;

    FormBase.resetPatient();
    ['vb-dx','vb-mgmt','vb-hx-current','vb-hx-past','vb-problem','vb-ix','vb-medication',
     'vb-occupation','vb-falls-freq','vb-falls-injury','vb-dhi','vb-abc',
     'vb-rom-neck-range','vb-rom-neck-quality','vb-rom-neck-pain',
     'vb-rom-rul-range','vb-rom-rul-quality','vb-rom-rul-pain',
     'vb-rom-lul-range','vb-rom-lul-quality','vb-rom-lul-pain',
     'vb-rom-rll-range','vb-rom-rll-quality','vb-rom-rll-pain',
     'vb-rom-lll-range','vb-rom-lll-quality','vb-rom-lll-pain',
     'vb-str-ul-r','vb-str-ul-l','vb-str-ll-r','vb-str-ll-l',
     'vb-prop-ul-r-note','vb-prop-ul-l-note','vb-prop-ll-r-note','vb-prop-ll-l-note',
     'vb-coord-ftn-r-note','vb-coord-ftn-l-note','vb-coord-hts-r-note','vb-coord-hts-l-note',
     'vb-post-rhomberg-eo','vb-post-rhomberg-ec','vb-post-rsharp-eo','vb-post-rsharp-ec',
     'vb-post-lsharp-eo','vb-post-lsharp-ec','vb-post-rsls-eo','vb-post-rsls-ec',
     'vb-post-lsls-eo','vb-post-lsls-ec','vb-tug',
     'vb-ctsib-eo-firm','vb-ctsib-ec-firm','vb-ctsib-eo-foam','vb-ctsib-ec-foam',
     'vb-gait-velocity','vb-gait-dgi','vb-clearance',
     'pt-impression','stg','ltg','plan'
    ].forEach(function (id) { sv(id, ''); });

    document.querySelectorAll('.irr-chip.active').forEach(function (c) {
      c.classList.remove('active');
    });
    document.querySelectorAll('#vb-diseq-worsein .chip.active').forEach(function (c) { c.classList.remove('active'); });

    resetBattery('battery-pmhx');
    resetBattery('battery-recent-symptoms');
    resetBattery('battery-functional');
    resetBattery('battery-oculomotor');

    Object.keys(scaffolds).forEach(function (k) { if (scaffolds[k]) scaffolds[k].reset(); });

    if (savedPt) FormBase.populatePatient(savedPt);
  }

  return {
    collect: collect,
    populate: populate,
    reset: reset,
    initScaffolds: initScaffolds,
    toggleChip: toggleChip,
    pick3: pick3,
    pickBattery: pickBattery,
    stampBattery: stampBattery,
    toggleKiv: toggleKiv,
    onKivInput: onKivInput,
    onPtTypeChange: function () { FormBase.onPtTypeChange(); },
    onNricInput:    function (v) { FormBase.onNricInput(v); },
    onDobChange:    function (v) { FormBase.onDobChange(v); }
  };
})();

window.ActiveForm = VestibularForm;
window.Form = {
  collect: VestibularForm.collect,
  populate: VestibularForm.populate,
  reset: VestibularForm.reset,
  onPtTypeChange: VestibularForm.onPtTypeChange,
  onNricInput: VestibularForm.onNricInput,
  onDobChange: VestibularForm.onDobChange
};
```

**Note on the `rom` populate-loop key mapping (fixed during vet, 2026-07-14):** an earlier draft of this block computed `prefix` via a regex (`k.replace(/([A-Z])/g, ...)`) that did NOT match the actual `vb-rom-rul-*`/`vb-rom-lul-*` id scheme (ids are lowercase `rul`/`lul`/`rll`/`lll`, not camelCase-split). The main code block above now uses the explicit `romIdMap` version instead, same style as the `postural` block below it. The dead `soma`-block `id` variable loop (leftover scaffolding above the four explicit `set3`/`sv` calls, computed a value nothing used) has also been removed from the code block above. When implementing: copy the `populate()` block exactly as written above — no further edit needed here.

- [ ] **Step 2: Syntax-verify the pasted `populate()` matches the code block above exactly (no stray regex, no unused `soma` id-loop) before saving the file.**

- [ ] **Step 3: Syntax check**

```bash
node --check static/js/form_vestibular.js
```
Expected: no output.

- [ ] **Step 4: Grep for orphaned code**

```bash
grep -n "function collect\|function populate\|function reset" static/js/form_vestibular.js
```
Read each function in full (per WORKFLOW Code Editing Discipline) — confirm no code sits below any `return` statement.

- [ ] **Step 5: Commit**

```bash
git add static/js/form_vestibular.js templates/forms/vestibular.html
git commit -m "vestibular: form HTML + collect/populate/reset, battery chips, KIV remark"
```

---

## Milestone: POLISH (after form)

### Task 6: Smoke test — form rung

**Files:** none (manual verification + one scripted check)

- [ ] **Step 1: Launch Flask from this worktree** (per WORKFLOW Anti-Repeat — confirm `git worktree list` shows this folder's HEAD at the commit just made before starting the server):
```bash
git worktree list
python app.py
```

- [ ] **Step 2: Miruya smoke-tests in browser** — navigate to a patient → New Episode → Vestibular. Checklist (DESIGN_SYSTEM.md Pre-ship Visual Checklist + spec §10 polish criteria):
  - [ ] Sidebar nav populated, all 16 items, clicking scrolls to the right card
  - [ ] Every section wrapped in `.card` with `.sec-num` + `<h2>`
  - [ ] Battery chip taps paint visibly (green for No/−Ve, red for Yes/+Ve) — this is the FACIAL `.sel-R`/`.sel-L` invisible-state trap (WORKFLOW Anti-Repeat); confirm in DevTools that `.sel-Yes`/`.sel-No`/`.sel-Pos`/`.sel-Neg` actually have matching CSS (they do, added in Task 2 — just visually confirm)
  - [ ] Stamp button fills only untapped rows in that battery, does not overwrite an already-tapped item
  - [ ] KIV toggle opens the remark input; typing in it visually dims the battery's chip rows (`.vb-kiv-active`)
  - [ ] Positioning-test scaffold: tapping +Ve unfolds direction chips + latency/duration/intensity/symptoms; tapping −Ve keeps it collapsed
  - [ ] Head Thrusts side chip (R/L/BIL) paints when selected
  - [ ] Round-trip: fill several sections including at least one battery + the scaffold → Save Record → reload the episode → confirm every value re-populates, including scaffold detail and KIV remark text

- [ ] **Step 3: If any check fails, fix in this file, re-run `node --check`, commit a fix, re-test.** Do not proceed to Templates milestone until all boxes are checked.

---

## Milestone: TEMPLATES

### Task 7: Best Statement content — `clinical_templates.js`

**Files:**
- Modify: `static/js/clinical_templates.js`

Source: spec §8 and its SOURCE TRAP warning — the Best Statement doc's STG/LTG examples are respiratory boilerplate bled in from a CR template; do NOT transcribe them. Impression and Plan-of-Treatment content in the source doc IS vestibular-appropriate.

- [ ] **Step 1: Add `TEMPLATES.VESTIBULAR` (assessment arrays)**

In `static/js/clinical_templates.js`, immediately after the `TEMPLATES.FACIAL = { ... };` block (before `TEMPLATES.NCD`), insert:

```js
  // Vestibular assessment templates
  TEMPLATES.VESTIBULAR = {
    impression: [
      'Impaired vestibular function secondary to [BPPV / unilateral vestibular hypofunction / bilateral vestibular loss], contributing to vertigo and disequilibrium.',
      'Reduced dynamic balance and gait stability secondary to vestibular dysfunction, increasing fall risk.',
      'Positive [R/L] Dix-Hallpike consistent with [posterior/horizontal] canal BPPV.',
      'Reduced gaze stability (positive head thrust / abnormal VOR) affecting functional tasks requiring head movement.',
      'Activity avoidance and reduced participation (driving, crowded areas) secondary to dizziness-related anxiety and reduced balance confidence (low ABC score).',
      'Cervicogenic component contributing to dizziness — reduced neck AROM/PROM with symptom reproduction on positional testing.',
    ],
    stg: [
      'Reduce vertigo intensity from [7]/10 to [3]/10 on positional testing within [2] weeks.',
      'Resolve positive [R/L] Dix-Hallpike (canalith repositioning) within [1-2] sessions.',
      'Improve DHI score from [_] to [_] within [4] weeks.',
      'Improve DGI score from [12] to [19] within [4] weeks.',
      'Improve static single-leg-stand time on the affected side from [_]s to [_]s (eyes open) within [2] weeks.',
      'Reduce Time Up & Go from [_]s to [_]s within [4] weeks.',
    ],
    ltg: [
      'Achieve independent community ambulation without dizziness-related falls within [3] months.',
      'Return to driving (daytime and/or night time) without dizziness-related restriction within [2-3] months.',
      'Improve ABC score to [_]% or greater, reflecting restored balance confidence, within [3] months.',
      'Return to premorbid functional activities (work, crowded areas, escalators/stairs) without symptom limitation within [3] months.',
      'Maintain resolution of positional vertigo with no recurrence at [3]-month review.',
    ],
    treatment: [
      'Canalith repositioning manoeuvre ([Epley / Semont / Barbecue roll]) for [R/L] [posterior/horizontal] canal BPPV.',
      'Vestibular rehabilitation therapy (VRT) — gaze stabilisation exercises (VOR x1/x2), habituation exercises for [_] reps x [_]/day.',
      'Balance retraining — static and dynamic balance tasks progressing surface/base of support, [_] min x [_]/week.',
      'Gait training with head turns / dual-task progression to address dynamic gait deficits.',
      'Cervical spine treatment (mobilisation / AROM exercises) if cervicogenic component identified.',
      'Patient education — BPPV recurrence signs, fall-prevention strategies, home exercise programme (HEP) issued.',
      'Graded exposure to symptom-provoking environments (crowded areas, escalators) as tolerated.',
    ],
  };

```

- [ ] **Step 2: Add `TEMPLATES.VESTIBULAR_SOAP` (SOAP variant)**

Immediately after the `TEMPLATES.FACIAL_SOAP = { ... };` block (before the `// ── State ──` comment), insert:

```js
  TEMPLATES.VESTIBULAR_SOAP = {
    subjective: [
      'Reports episodic vertigo triggered by [position changes / head movement], lasting [seconds/minutes], [with/without] nausea.',
      'Reports constant disequilibrium/unsteadiness, worse in [the dark / on uneven surfaces / crowded areas].',
      'History of [_] falls in the past [month], [with/without] injury.',
      'Reports difficulty with [driving / reading / crowded areas / escalators] secondary to dizziness.',
      'DHI [_]/100, ABC [_]%, indicating [mild/moderate/severe] perceived handicap and [low/moderate/high] balance confidence.',
    ],
    objective: [
      'Positive [R/L] Dix-Hallpike with [upbeat/torsional] nystagmus, latency [_]s, duration [_]s.',
      '[Positive/Negative] head thrust test [R/L/bilateral]; [positive/negative] head shaking nystagmus.',
      'DGI [_]/24; TUG [_]s; single leg stance [R/L] [_]s (EO) / [_]s (EC).',
      'Reduced cervical AROM with symptom reproduction; CTSIB shows increased sway on foam surface with eyes closed.',
    ],
    analysis: [
      '[R/L] [posterior/horizontal] canal BPPV, responding to canalith repositioning — [resolved/residual symptoms].',
      'Vestibular hypofunction with ongoing gaze and gait instability; on track for VRT goals.',
      'Improving — DHI/ABC trending toward [target], balance and gait measures improving session to session.',
      'Plateau in symptom resolution — reviewing VRT progression / considering ENT referral if red flags present.',
    ],
    plan: [
      'Repeat canalith repositioning manoeuvre; reassess Dix-Hallpike next visit.',
      'Progress VRT — gaze stabilisation and habituation exercises, advance balance/gait training difficulty.',
      'Continue HEP; review fall-prevention strategies and home safety.',
      'Reassess DHI/ABC/DGI at [_] weeks to track functional progress.',
    ],
  };

```

- [ ] **Step 3: Syntax check**

```bash
node --check static/js/clinical_templates.js
```
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add static/js/clinical_templates.js
git commit -m "vestibular: author SMART Best Statement templates (assessment + SOAP)"
```

---

### Task 8: Wire template buttons + `tplMap`

**Files:**
- Modify: `templates/episode.html:766-777` (`tplMap` in `showSoapTemplate()`)
- `templates/forms/vestibular.html` `extra_js` block already calls `ClinicalTemplates.addButton(...)` (written in Task 3) — this task is verification + the one remaining registry site.

- [ ] **Step 1: Add VESTIBULAR to `tplMap`**

In `templates/episode.html`, in `showSoapTemplate()` (~line 766), add `'VESTIBULAR': 'VESTIBULAR_SOAP',` after the `'NCD': 'NCD_SOAP',` line:
```js
  var tplMap   = {
    'CR':          'CR_SOAP',
    'SPINE':       'SPINE_SOAP',
    'GERIATRIC':   'GERIATRIC_SOAP',
    'AMPUTATION':  'AMPUTATION_SOAP',
    'NEURO':       'NEURO_SOAP',
    'HAND':        'HAND_SOAP',
    'BURN':        'BURN_SOAP',
    'FACIAL':      'FACIAL_SOAP',
    'NCD':         'NCD_SOAP',
    'VESTIBULAR':  'VESTIBULAR_SOAP',
  };
```

- [ ] **Step 2: Miruya click-tests every template button** (spec §8 warning — FACIAL shipped template buttons that didn't fire). In the browser: open the Vestibular form, click "+ template" next to PT Impression, STG, LTG, and Plan of Treatment. Confirm the modal opens and lists the arrays from Task 7. Then open the SOAP modal on an episode (Vestibular form type) and confirm the SOAP template buttons show the `VESTIBULAR_SOAP` categories.

- [ ] **Step 3: Commit**

```bash
git add templates/episode.html
git commit -m "vestibular: wire SOAP template map"
```

---

## Milestone: PDF

### Task 9: `pdf_vestibular.py`

**Files:**
- Create: `pdf_vestibular.py`

Read `DESIGN_SYSTEM-pdf.md` primitives table before writing. Battery blocks are long (up to 7 items) — commit to full-width stacked rendering for every battery per the "mixed layout rhythm" anti-pattern; use `two_col()` only for genuinely short paired blocks (Falls, Measures, Strength).

- [ ] **Step 1: Write the file**

```python
# pdf_vestibular.py — VESTIBULAR ASSESSMENT FORM PDF generator.
# KKM ref: fisio/b.pen. 22 /2022 (verbatim, note the spacing).

from reportlab.platypus import Paragraph, Table, TableStyle
from reportlab.lib.units import mm

from pdf_platypus_base import (
    CW, S_BOLD, S_NORMAL, S_SMALL, BLACK, LGREY,
    gap, page_header, patient_bar, two_col, data_table, sign_chop_block, ensure_dict,
)

REF = 'fisio/b.pen. 22 /2022'
TITLE = ['KEMENTERIAN KESIHATAN MALAYSIA', 'PHYSIOTHERAPY DEPARTMENT', 'VESTIBULAR ASSESSMENT FORM']


def _has_text(*vals):
    return any(str(v or '').strip() for v in vals)


def _battery_block(story, title, battery, baseline_label):
    """
    battery: {'items': {label: 'Yes'/'No'/'+Ve'/'−Ve', ...}} or {'kiv': 'reason'} or None/{}.
    Renders full documented Yes/No list (D8) or the KIV remark (D4). Omitted if blank (D3).
    """
    battery = battery or {}
    kiv = (battery.get('kiv') or '').strip()
    items = battery.get('items') or {}
    if not kiv and not items:
        return
    story.append(Paragraph(title, S_BOLD))
    story.append(gap(1))
    if kiv:
        story.append(Paragraph('KIV — unable to answer this visit. ' + kiv, S_NORMAL))
    else:
        for label, val in items.items():
            story.append(Paragraph(f'{label} : {val}.', S_NORMAL))
    story.append(gap(2))


def _scaffold_line(story, label, data):
    """Positioning test row. data: {'result':'pos'|'neg', direction, latency, duration, intensity, note} or None."""
    if not data:
        return
    if data.get('result') == 'neg':
        story.append(Paragraph(f'{label} : −Ve', S_NORMAL))
        return
    dirs = ', '.join(data.get('direction') or [])
    detail = (
        f'Direction: {dirs} · Latency: {data.get("latency","")}s · '
        f'Duration: {data.get("duration","")}s · Intensity: {data.get("intensity","")}/10'
    )
    if data.get('note'):
        detail += f' · Symptoms: {data.get("note")}'
    story.append(Paragraph(f'{label} : +Ve', S_NORMAL))
    story.append(Paragraph(detail, S_SMALL))


def _fixed_rows_table(story, title, headers, rows, col_widths):
    if not any(any(str(c).strip() for c in r[1:]) for r in rows):
        return
    story.append(Paragraph(title, S_BOLD))
    story.append(gap(1))
    story.append(data_table(headers, rows, col_widths))
    story.append(gap(2))


def _build_story(data, patient):
    d = ensure_dict(data)
    p = ensure_dict(patient)
    story = []

    story += page_header(TITLE, REF)
    story.append(patient_bar(p, REF))
    story.append(gap(2))

    referral = d.get('referral') or {}
    if _has_text(referral.get('dx'), referral.get('mgmt')):
        story.append(Paragraph('REFERRAL', S_BOLD)); story.append(gap(1))
        if referral.get('dx'):   story.append(Paragraph(f'Doctor Diagnosis: {referral["dx"]}', S_NORMAL))
        if referral.get('mgmt'): story.append(Paragraph(f'Doctor Management: {referral["mgmt"]}', S_NORMAL))
        story.append(gap(2))

    history = d.get('history') or {}
    if _has_text(history.get('current'), history.get('past'), history.get('problem')):
        story.append(Paragraph('HISTORY', S_BOLD)); story.append(gap(1))
        if history.get('current'): story.append(Paragraph(f'Current Hx: {history["current"]}', S_NORMAL))
        if history.get('past'):    story.append(Paragraph(f'Past Hx: {history["past"]}', S_NORMAL))
        if history.get('problem'): story.append(Paragraph(f'Problem: {history["problem"]}', S_NORMAL))
        story.append(gap(2))

    _battery_block(story, 'PAST MEDICAL HISTORY', d.get('pmhx'), 'No')
    _battery_block(story, 'RECENT SYMPTOMS OR PROBLEMS', d.get('recentSymptoms'), 'No')

    if _has_text(d.get('ix'), d.get('medication')):
        story.append(Paragraph('INVESTIGATIONS / MEDICATION', S_BOLD)); story.append(gap(1))
        if d.get('ix'):         story.append(Paragraph(f'Ix (MRI/CT Scan): {d["ix"]}', S_NORMAL))
        if d.get('medication'): story.append(Paragraph(f'Medication / Steroid: {d["medication"]}', S_NORMAL))
        story.append(gap(2))

    social = d.get('social') or {}
    if _has_text(social.get('occupation'), social.get('marital'), social.get('smoking'), social.get('alcohol'), social.get('sleep')):
        story.append(Paragraph('SOCIAL HISTORY', S_BOLD)); story.append(gap(1))
        if social.get('occupation'): story.append(Paragraph(f'Occupation: {social["occupation"]}', S_NORMAL))
        if social.get('marital'):    story.append(Paragraph(f'Marital Status: {social["marital"]}', S_NORMAL))
        if social.get('smoking'):    story.append(Paragraph(f'Smoking: {social["smoking"]}', S_NORMAL))
        if social.get('alcohol'):    story.append(Paragraph(f'Alcohol: {social["alcohol"]}', S_NORMAL))
        if social.get('sleep'):      story.append(Paragraph(f'Trouble Sleeping: {social["sleep"]}', S_NORMAL))
        story.append(gap(2))

    _battery_block(story, 'CURRENT FUNCTIONAL STATUS', d.get('functionalStatus'), 'No')

    falls = d.get('falls') or {}
    if _has_text(falls.get('frequency'), falls.get('injury')):
        story.append(Paragraph('FALLS', S_BOLD)); story.append(gap(1))
        story.append(two_col(
            [Paragraph(f'Frequency of Falls: {falls.get("frequency","")}', S_NORMAL)],
            [Paragraph(f'Injury from Fall: {falls.get("injury","")}', S_NORMAL)],
        ))
        story.append(gap(2))

    vertigo = d.get('vertigo') or {}
    if any(vertigo.values()):
        story.append(Paragraph('VERTIGO (a sense of spinning)', S_BOLD)); story.append(gap(1))
        if vertigo.get('spontaneous'): story.append(Paragraph(f'Spontaneous : {vertigo["spontaneous"]}.', S_NORMAL))
        if vertigo.get('motion'):      story.append(Paragraph(f'Induced by motion : {vertigo["motion"]}.', S_NORMAL))
        if vertigo.get('position'):    story.append(Paragraph(f'Induced by position changes : {vertigo["position"]}.', S_NORMAL))
        if vertigo.get('tempo'):       story.append(Paragraph(f'Tempo : {vertigo["tempo"]}.', S_NORMAL))
        if vertigo.get('spells'):      story.append(Paragraph(f'Spells : {vertigo["spells"]}.', S_NORMAL))
        story.append(gap(2))

    diseq = d.get('disequilibrium') or {}
    if any([diseq.get('constant'), diseq.get('spontaneous'), diseq.get('motion'), diseq.get('position'), diseq.get('dark'), diseq.get('worseIn')]):
        story.append(Paragraph('DISEQUILIBRIUM (sense of being off-balance)', S_BOLD)); story.append(gap(1))
        if diseq.get('constant'):    story.append(Paragraph(f'Constant : {diseq["constant"]}.', S_NORMAL))
        if diseq.get('spontaneous'): story.append(Paragraph(f'Spontaneous : {diseq["spontaneous"]}.', S_NORMAL))
        if diseq.get('motion'):      story.append(Paragraph(f'Induced by motion : {diseq["motion"]}.', S_NORMAL))
        if diseq.get('position'):    story.append(Paragraph(f'Induced by position changes : {diseq["position"]}.', S_NORMAL))
        if diseq.get('dark'):        story.append(Paragraph(f'Worse in the dark : {diseq["dark"]}.', S_NORMAL))
        if diseq.get('worseIn'):     story.append(Paragraph('Worse in : ' + ', '.join(diseq['worseIn']) + '.', S_NORMAL))
        story.append(gap(2))

    measures = d.get('measures') or {}
    if _has_text(measures.get('dhi'), measures.get('abc')):
        story.append(Paragraph('MEASURES', S_BOLD)); story.append(gap(1))
        story.append(two_col(
            [Paragraph(f'DHI: {measures.get("dhi","")}', S_NORMAL)],
            [Paragraph(f'ABC: {measures.get("abc","")}', S_NORMAL)],
        ))
        story.append(gap(2))

    _battery_block(story, 'OCULOMOTOR EXAMINATION', d.get('oculomotor'), '−Ve')
    if d.get('headThrustSide'):
        story.append(Paragraph(f'Head Thrusts side : {d["headThrustSide"]}', S_SMALL))
        story.append(gap(1))

    pos = d.get('positional') or {}
    if any(pos.values()):
        story.append(Paragraph('POSITIONING TESTS', S_BOLD)); story.append(gap(1))
        _scaffold_line(story, 'R Dix Hallpike', pos.get('rDixHallpike'))
        _scaffold_line(story, 'L Dix Hallpike', pos.get('lDixHallpike'))
        _scaffold_line(story, 'R Roll', pos.get('rRoll'))
        _scaffold_line(story, 'L Roll', pos.get('lRoll'))
        story.append(gap(2))

    rom = d.get('rom') or {}
    rom_rows = []
    for label, key in [('Neck','neck'), ('R UL','rUl'), ('L UL','lUl'), ('R LL','rLl'), ('L LL','lLl')]:
        r = rom.get(key) or {}
        rom_rows.append([label, r.get('range',''), r.get('quality',''), r.get('pain','')])
    _fixed_rows_table(story, 'AROM / PROM', ['Region','Range','Quality/Symptom','Pain (0-10)'], rom_rows,
                       [CW*0.20, CW*0.30, CW*0.35, CW*0.15])

    strength = d.get('strength') or {}
    if _has_text(strength.get('ulR'), strength.get('ulL'), strength.get('llR'), strength.get('llL')):
        story.append(Paragraph('STRENGTH (MMT)', S_BOLD)); story.append(gap(1))
        story.append(data_table(['Region','R','L'],
            [['UL', strength.get('ulR',''), strength.get('ulL','')],
             ['LL', strength.get('llR',''), strength.get('llL','')]],
            [CW*0.4, CW*0.3, CW*0.3]))
        story.append(gap(2))

    soma = d.get('somatosensory') or {}
    soma_rows = []
    for label, key in [('Proprioception UL R','propUlR'), ('Proprioception UL L','propUlL'),
                        ('Proprioception LL R','propLlR'), ('Proprioception LL L','propLlL')]:
        v = soma.get(key) or {}
        if v.get('status'):
            soma_rows.append([label, v.get('status',''), v.get('note','')])
    if soma_rows:
        story.append(Paragraph('SOMATOSENSORY', S_BOLD)); story.append(gap(1))
        story.append(data_table(['Test','Status','Note'], soma_rows, [CW*0.35, CW*0.25, CW*0.40]))
        story.append(gap(2))

    coord = d.get('coordination') or {}
    coord_rows = []
    for label, key in [('Finger to Nose R','ftnR'), ('Finger to Nose L','ftnL'),
                        ('Heel to Shin R','htsR'), ('Heel to Shin L','htsL')]:
        v = coord.get(key) or {}
        if v.get('status'):
            coord_rows.append([label, v.get('status',''), v.get('note','')])
    if coord_rows:
        story.append(Paragraph('COORDINATION', S_BOLD)); story.append(gap(1))
        story.append(data_table(['Test','Status','Note'], coord_rows, [CW*0.35, CW*0.25, CW*0.40]))
        story.append(gap(2))

    postural = d.get('postural') or {}
    post_rows = []
    for label, key in [('Rhomberg','rhomberg'), ('R Sharpened Rhomberg','rSharpened'),
                        ('L Sharpened Rhomberg','lSharpened'), ('R Single Leg Stand','rSls'),
                        ('L Single Leg Stand','lSls')]:
        v = postural.get(key) or {}
        post_rows.append([label, v.get('eo',''), v.get('ec','')])
    _fixed_rows_table(story, 'POSTURAL CONTROL', ['Test','EO','EC'], post_rows, [CW*0.5, CW*0.25, CW*0.25])
    if postural.get('tug'):
        story.append(Paragraph(f'Time Up &amp; Go Test : {postural["tug"]}s', S_NORMAL))
        story.append(gap(2))

    ctsib = d.get('ctsib') or {}
    ctsib_rows = [
        ['EO Firm surface', ctsib.get('eoFirm','')], ['EC Firm surface', ctsib.get('ecFirm','')],
        ['EO Foam surface', ctsib.get('eoFoam','')], ['EC Foam surface', ctsib.get('ecFoam','')],
    ]
    _fixed_rows_table(story, 'CLINICAL TEST OF SENSORY INTERACTION FOR BALANCE (CTSIB)',
                       ['Test','Seconds'], ctsib_rows, [CW*0.6, CW*0.4])

    gait = d.get('gait') or {}
    if any(gait.values()) or d.get('clearance'):
        story.append(Paragraph('GAIT ASSESSMENT', S_BOLD)); story.append(gap(1))
        if gait.get('velocity'): story.append(Paragraph(f'Velocity : {gait["velocity"]} Sec/20ft', S_NORMAL))
        if gait.get('deviation'):
            devline = f'Deviation : {gait["deviation"]}'
            if gait.get('deviationSide'): devline += f' ({gait["deviationSide"]})'
            story.append(Paragraph(devline, S_NORMAL))
        if gait.get('device'):  story.append(Paragraph(f'Device : {gait["device"]}', S_NORMAL))
        if gait.get('dgi'):     story.append(Paragraph(f'Dynamic Gait Index Score : {gait["dgi"]}', S_NORMAL))
        if d.get('clearance'):  story.append(Paragraph(f'Clearance Test : {d["clearance"]}', S_NORMAL))
        story.append(gap(2))

    if d.get('impression'):
        story.append(Paragraph('PHYSIOTHERAPY IMPRESSION', S_BOLD)); story.append(gap(1))
        story.append(Paragraph(d['impression'], S_NORMAL)); story.append(gap(2))

    if _has_text(d.get('stg'), d.get('ltg'), d.get('plan')):
        story.append(Paragraph('GOALS &amp; PLAN', S_BOLD)); story.append(gap(1))
        if d.get('stg'):  story.append(Paragraph(f'Short Term Goals: {d["stg"]}', S_NORMAL))
        if d.get('ltg'):  story.append(Paragraph(f'Long Term Goals: {d["ltg"]}', S_NORMAL))
        if d.get('plan'): story.append(Paragraph(f'Plan of Treatment: {d["plan"]}', S_NORMAL))
        story.append(gap(2))

    story += sign_chop_block()
    return story


def generate_vestibular_pdf(record, patient):
    from pdf_platypus_base import build_pdf
    story = _build_story(record, patient)
    return build_pdf(story)


def generate_episode_pdf(episode, records, patient):
    from pdf_platypus_base import build_pdf
    story = []
    for i, rec in enumerate(records):
        if i > 0:
            from reportlab.platypus import PageBreak
            story.append(PageBreak())
        story += _build_story(rec, patient)
    return build_pdf(story)
```

- [ ] **Step 2: Verify `build_pdf` exists in `pdf_platypus_base.py` with this exact name/signature**

```bash
grep -n "def build_pdf" pdf_platypus_base.py
```
If the helper has a different name or signature in this codebase (it may be inlined per-generator via `SimpleDocTemplate` instead — check `pdf_sci.py`'s `generate_sci_pdf`/`generate_episode_pdf` tail for the actual pattern used), **match `pdf_sci.py`'s exact PDF-assembly tail instead of the placeholder call above** — copy its `SimpleDocTemplate(...).build(story)` / `io.BytesIO()` return plumbing verbatim, only swapping the story-builder function.

- [ ] **Step 3: Import check**

```bash
py -c "from pdf_vestibular import generate_vestibular_pdf, generate_episode_pdf; print('ok')"
```
Expected: `ok`.

- [ ] **Step 4: Sparse-data render check** — construct a minimal record (patient + `referral.dx` only) and render:
```bash
py -c "
from pdf_vestibular import generate_vestibular_pdf
patient = {'name':'Test Patient','age':'40','sex':'F','nric':'800101-01-1234','date':'2026-07-14'}
record = {'referral': {'dx': 'BPPV'}}
pdf_bytes = generate_vestibular_pdf(record, patient)
open('scratch_vestibular_sparse.pdf','wb').write(pdf_bytes if isinstance(pdf_bytes, (bytes,bytearray)) else pdf_bytes.getvalue())
print('sparse pdf written, len=', len(open('scratch_vestibular_sparse.pdf','rb').read()))
"
```
Open `scratch_vestibular_sparse.pdf` — confirm no ReportLab error, no empty "—" tables, only the Referral block + sign/chop render. Delete the scratch file after checking.

- [ ] **Step 5: Realistic-data render check** — build a record dict exercising every field (batteries with mixed Yes/No + one KIV battery, scaffold with a +Ve positional test, all fixed rows filled), render, and eyeball the PDF for the mixed-layout-rhythm anti-pattern (battery blocks must be full-width, not squeezed into `two_col()`).

- [ ] **Step 6: Cross-check `collect()` → PDF coverage** — open `static/js/form_vestibular.js`'s `collect()` and `pdf_vestibular.py`'s `_build_story()` side by side. Every top-level key returned by `collect()` must have a corresponding render block. (`_form_type` and `meta` are routing-only, correctly unrendered.)

- [ ] **Step 7: Commit**

```bash
git add pdf_vestibular.py
git commit -m "vestibular: add PDF generator"
```

---

### Task 10: Wire PDF into registry + PyInstaller spec

**Files:**
- Modify: `app.py` (import + FORM_REGISTRY row)
- Modify: `pt_assessment.spec`

- [ ] **Step 1: Add the import**

In `app.py`, after `import pdf_ncd` (line 27):
```python
import pdf_vestibular
```

- [ ] **Step 2: Add `pdf_episode`/`pdf_single` keys to the FORM_REGISTRY row**

Replace the Task-1 stub row:
```python
    { 'id': 'VESTIBULAR',  'label': 'Vestibular',         'icon': '&#128260;', 'badge': 'VB',  'group': 'Neurological',      'ready': True  },
```
with:
```python
    { 'id': 'VESTIBULAR',  'label': 'Vestibular',         'icon': '&#128260;', 'badge': 'VB',  'group': 'Neurological',      'ready': True,  'pdf_episode': pdf_vestibular.generate_episode_pdf, 'pdf_single': pdf_vestibular.generate_vestibular_pdf },
```
Do NOT hand-edit `_PDF_GENERATORS`/`_SINGLE_PDF_GENERATORS` — they derive automatically from this row.

- [ ] **Step 3: Add to `pt_assessment.spec` datas**

In `pt_assessment.spec`, after `('pdf_ncd.py', '.'),` (line 24):
```python
        ('pdf_vestibular.py', '.'),
```

- [ ] **Step 4: Verify app still imports cleanly**

```bash
py -c "import app; print('ok')"
```

- [ ] **Step 5: Commit**

```bash
git add app.py pt_assessment.spec
git commit -m "vestibular: wire PDF generator into FORM_REGISTRY and PyInstaller spec"
```

---

## Milestone: POLISH (PDF)

### Task 11: PDF pre-ship checklist

**Files:** none (verification only, per DESIGN_SYSTEM-pdf.md Pre-ship Checklist)

- [ ] **Step 1:** `py -c "from pdf_vestibular import generate_vestibular_pdf; print('ok')"` — already done Task 9 Step 3, re-run to confirm still clean after Task 10's edits.
- [ ] **Step 2:** Realistic-data PDF renders without ReportLab errors (re-run Task 9 Step 5's realistic-data script).
- [ ] **Step 3:** Sparse-data PDF — all empty tables skipped, no "—" rows (re-run Task 9 Step 4).
- [ ] **Step 4:** Every `collect()` field has a matching PDF render block (re-verify Task 9 Step 6 after any Task 10 edits).
- [ ] **Step 5:** `sign_chop_block()` used as footer via `story +=`, not inlined — confirmed by reading `pdf_vestibular.py`'s tail.
- [ ] **Step 6:** KKM ref string `fisio/b.pen. 22 /2022` matches the borang exactly — confirmed against spec §0 header.
- [ ] **Step 7:** From the browser, export a real episode's PDF via the topbar "Export KKM PDF" button and visually compare against the 2-page borang scan referenced in the spec (`vestibular.pdf` — Miruya has the source scan; not in this repo). Target ~90% look-and-feel per spec §6.

If any item fails, do not proceed to MPIS.

---

## Milestone: MPIS

### Task 12: `_buildMpisVestibular()` — SOAPIER builder

**Files:**
- Modify: `static/js/main.js` (add builder near the other `_buildMpisXxx` functions, e.g. after `_buildMpisFacial`; wire into `copyToMpisAuto()` switch at line ~1253-1264)

- [ ] **Step 1: Write the builder**

Insert after the existing `_buildMpisHand()`/other builder functions in `static/js/main.js` (function-declaration order doesn't matter in this file — place it near the FACIAL/NCD builders for readability):

```js
  function _buildMpisVestibular() {
    var d    = window.ActiveForm ? window.ActiveForm.collect() : {};
    var p    = d.patient || {};
    var dash = MPIS_DASH;
    var parts = [];

    parts.push('VESTIBULAR ASSESSMENT');
    parts.push(MPIS_DIV);
    parts.push('Name  : ' + (p.name||'') + '   Date : ' + (p.date||''));
    if (p.type === 'local') {
      parts.push('IC    : ' + (p.nric||'') + '   Age  : ' + (p.age||''));
    } else {
      parts.push('Passport : ' + (p.passport||'') + '   Country : ' + (p.country||'') + '   Age : ' + (p.age||''));
      parts.push('Sex   : ' + (p.sex||''));
    }
    parts.push('');

    // ── Battery roll-up helper: positives spelled out, rest = compact roll-up (D8) ──
    function batteryLines(label, battery) {
      var out = [];
      if (!battery) return out; // blank = N/A, omitted (D3)
      if (battery.kiv) {
        out.push(label + ': KIV — unable to answer this visit. ' + battery.kiv);
        return out;
      }
      var items = battery.items || {};
      var keys = Object.keys(items);
      if (!keys.length) return out;
      var positives = keys.filter(function (k) { return items[k] === 'Yes' || items[k] === '+Ve'; });
      var negCount  = keys.length - positives.length;
      if (positives.length) out.push(label + ': ' + positives.join(', ') + '.');
      if (negCount > 0) out.push('Other ' + label + ': ' + negCount + ' item(s) negative.');
      if (!positives.length && !negCount) out.push(label + ': all negative.');
      return out;
    }

    // ── SUBJECTIVE ──────────────────────────────────────────────────────
    parts.push(dash);
    parts.push('SUBJECTIVE');
    parts.push('');
    var referral = d.referral || {};
    if (referral.dx)   parts.push('Doctor Diagnosis : ' + referral.dx);
    if (referral.mgmt) parts.push('Doctor Management: ' + referral.mgmt);
    var history = d.history || {};
    if (history.current) parts.push('Current Hx: ' + history.current);
    if (history.past)    parts.push('Past Hx   : ' + history.past);
    if (history.problem) parts.push('Problem   : ' + history.problem);
    parts.push('');

    batteryLines('PMHx', d.pmhx).forEach(function (l) { parts.push(l); });
    batteryLines('Recent Symptoms', d.recentSymptoms).forEach(function (l) { parts.push(l); });
    if (d.ix)         parts.push('Ix: ' + d.ix);
    if (d.medication) parts.push('Medication: ' + d.medication);

    var social = d.social || {};
    if (social.occupation || social.marital || social.smoking || social.alcohol || social.sleep) {
      var socialBits = [];
      if (social.occupation) socialBits.push('Occupation: ' + social.occupation);
      if (social.marital)    socialBits.push('Marital: ' + social.marital);
      if (social.smoking)    socialBits.push('Smoking: ' + social.smoking);
      if (social.alcohol)    socialBits.push('Alcohol: ' + social.alcohol);
      if (social.sleep)      socialBits.push('Sleep issues: ' + social.sleep);
      parts.push(socialBits.join(' \xb7 '));
    }
    batteryLines('Functional Status', d.functionalStatus).forEach(function (l) { parts.push(l); });

    var falls = d.falls || {};
    if (falls.frequency || falls.injury) {
      parts.push('Falls: ' + (falls.frequency||'') + (falls.injury ? ' — Injury: ' + falls.injury : ''));
    }
    parts.push('');

    // ── OBJECTIVE ───────────────────────────────────────────────────────
    var vertigo = d.vertigo || {};
    var diseq   = d.disequilibrium || {};
    var hasVestib = Object.keys(vertigo).some(function(k){return vertigo[k];}) ||
                    Object.keys(diseq).some(function(k){return diseq[k] && (!Array.isArray(diseq[k]) || diseq[k].length);});
    var measures = d.measures || {};
    var pos = d.positional || {};
    var hasPos = pos.rDixHallpike || pos.lDixHallpike || pos.rRoll || pos.lRoll;
    var rom = d.rom || {};
    var hasRom = Object.keys(rom).some(function(k){ var r=rom[k]||{}; return r.range||r.quality||r.pain; });
    var strength = d.strength || {};
    var hasStrength = strength.ulR||strength.ulL||strength.llR||strength.llL;
    var soma = d.somatosensory || {}, coord = d.coordination || {};
    var hasNeuro = Object.keys(soma).some(function(k){return (soma[k]||{}).status;}) ||
                   Object.keys(coord).some(function(k){return (coord[k]||{}).status;});
    var postural = d.postural || {}, ctsib = d.ctsib || {};
    var hasBalance = Object.keys(postural).some(function(k){ var v=postural[k]; return v && typeof v==='object' && (v.eo||v.ec); }) ||
                     postural.tug || Object.keys(ctsib).some(function(k){return ctsib[k];});
    var gait = d.gait || {};
    var hasGait = gait.velocity||gait.deviation||gait.device||gait.dgi||d.clearance;
    var hasObj = hasVestib || measures.dhi || measures.abc || d.oculomotor || hasPos ||
                 hasRom || hasStrength || hasNeuro || hasBalance || hasGait;

    if (hasObj) {
      parts.push(dash);
      parts.push('OBJECTIVE');
      parts.push('');

      if (hasVestib) {
        var vLine = [];
        if (vertigo.spontaneous) vLine.push('Spontaneous: ' + vertigo.spontaneous);
        if (vertigo.motion)      vLine.push('Motion: ' + vertigo.motion);
        if (vertigo.position)    vLine.push('Position: ' + vertigo.position);
        if (vertigo.tempo)       vLine.push('Tempo: ' + vertigo.tempo);
        if (vertigo.spells)      vLine.push('Spells: ' + vertigo.spells);
        if (vLine.length) parts.push('Vertigo — ' + vLine.join(', '));
        var dLine = [];
        if (diseq.constant)    dLine.push('Constant: ' + diseq.constant);
        if (diseq.spontaneous) dLine.push('Spontaneous: ' + diseq.spontaneous);
        if (diseq.motion)      dLine.push('Motion: ' + diseq.motion);
        if (diseq.position)    dLine.push('Position: ' + diseq.position);
        if (diseq.dark)        dLine.push('Dark: ' + diseq.dark);
        if (diseq.worseIn && diseq.worseIn.length) dLine.push('Worse in: ' + diseq.worseIn.join('/'));
        if (dLine.length) parts.push('Disequilibrium — ' + dLine.join(', '));
        parts.push('');
      }

      if (measures.dhi || measures.abc) {
        parts.push('DHI: ' + (measures.dhi||'—') + '   ABC: ' + (measures.abc||'—') + '%');
        parts.push('');
      }

      batteryLines('Oculomotor', d.oculomotor).forEach(function (l) { parts.push(l); });
      if (d.headThrustSide) parts.push('Head Thrusts side: ' + d.headThrustSide);
      if (d.oculomotor || d.headThrustSide) parts.push('');

      if (hasPos) {
        parts.push('POSITIONING TESTS');
        [['R Dix Hallpike', pos.rDixHallpike], ['L Dix Hallpike', pos.lDixHallpike],
         ['R Roll', pos.rRoll], ['L Roll', pos.lRoll]].forEach(function (pair) {
          var label = pair[0], v = pair[1];
          if (!v) return;
          if (v.result === 'neg') { parts.push(label + ': −Ve'); return; }
          var dirs = (v.direction||[]).join(', ');
          parts.push(label + ': +Ve' + (dirs ? ' (' + dirs + ')' : '') +
            (v.intensity ? ', intensity ' + v.intensity + '/10' : ''));
        });
        parts.push('');
      }

      if (hasRom) {
        parts.push('AROM/PROM');
        [['Neck','neck'],['R UL','rUl'],['L UL','lUl'],['R LL','rLl'],['L LL','lLl']].forEach(function (pair) {
          var r = rom[pair[1]] || {};
          if (r.range || r.quality || r.pain) {
            parts.push(pair[0] + ': ' + (r.range||'') + (r.quality ? ' — ' + r.quality : '') + (r.pain ? ' (pain ' + r.pain + '/10)' : ''));
          }
        });
        parts.push('');
      }

      if (hasStrength) {
        parts.push('Strength (MMT) — UL: R ' + (strength.ulR||'—') + ' / L ' + (strength.ulL||'—') +
          '   LL: R ' + (strength.llR||'—') + ' / L ' + (strength.llL||'—'));
        parts.push('');
      }

      if (hasNeuro) {
        var somaLine = [];
        ['propUlR','propUlL','propLlR','propLlL'].forEach(function (k) {
          var v = soma[k] || {};
          if (v.status) somaLine.push(k + ': ' + v.status + (v.note ? ' (' + v.note + ')' : ''));
        });
        if (somaLine.length) parts.push('Somatosensory — ' + somaLine.join(', '));
        var coordLine = [];
        ['ftnR','ftnL','htsR','htsL'].forEach(function (k) {
          var v = coord[k] || {};
          if (v.status) coordLine.push(k + ': ' + v.status + (v.note ? ' (' + v.note + ')' : ''));
        });
        if (coordLine.length) parts.push('Coordination — ' + coordLine.join(', '));
        parts.push('');
      }

      if (hasBalance) {
        parts.push('Postural Control / CTSIB');
        if (postural.tug) parts.push('TUG: ' + postural.tug + 's');
        var ctsibBits = [];
        if (ctsib.eoFirm) ctsibBits.push('EO Firm ' + ctsib.eoFirm + 's');
        if (ctsib.ecFirm) ctsibBits.push('EC Firm ' + ctsib.ecFirm + 's');
        if (ctsib.eoFoam) ctsibBits.push('EO Foam ' + ctsib.eoFoam + 's');
        if (ctsib.ecFoam) ctsibBits.push('EC Foam ' + ctsib.ecFoam + 's');
        if (ctsibBits.length) parts.push('CTSIB: ' + ctsibBits.join(', '));
        parts.push('');
      }

      if (hasGait) {
        var gLine = [];
        if (gait.velocity) gLine.push('Velocity: ' + gait.velocity + 's/20ft');
        if (gait.deviation) gLine.push('Deviation: ' + gait.deviation + (gait.deviationSide ? ' (' + gait.deviationSide + ')' : ''));
        if (gait.device) gLine.push('Device: ' + gait.device);
        if (gait.dgi) gLine.push('DGI: ' + gait.dgi);
        if (gLine.length) parts.push('Gait — ' + gLine.join(', '));
        if (d.clearance) parts.push('Clearance Test: ' + d.clearance);
        parts.push('');
      }
    }

    // ── ANALYSIS ────────────────────────────────────────────────────────
    if (d.impression) {
      parts.push(dash);
      parts.push('ANALYSIS');
      parts.push('');
      parts.push(d.impression);
      parts.push('');
    }

    // ── PLAN ────────────────────────────────────────────────────────────
    if (d.stg || d.ltg || d.plan) {
      parts.push(dash);
      parts.push('PLAN');
      parts.push('');
      if (d.stg)  parts.push('STG : ' + d.stg);
      if (d.ltg)  parts.push('LTG : ' + d.ltg);
      if (d.plan) parts.push('Plan: ' + d.plan);
    }

    return parts;
  }
```

- [ ] **Step 2: Wire into `copyToMpisAuto()` switch**

In `static/js/main.js` (~line 1253-1264), add the VESTIBULAR branch:
```js
    var parts;
    if      (formType === 'SPINE')      parts = _buildMpisSpine();
    else if (formType === 'GERIATRIC')  parts = _buildMpisGeriatric();
    else if (formType === 'CR')         parts = _buildMpisCr();
    else if (formType === 'AMPUTATION') parts = _buildMpisAmputation();
    else if (formType === 'NEURO')      parts = _buildMpisNeuro();
    else if (formType === 'HAND')       parts = _buildMpisHand();
    else if (formType === 'BURN')       parts = _buildMpisBurn();
    else if (formType === 'SCI')        parts = _buildMpisSci();
    else if (formType === 'FACIAL')     parts = _buildMpisFacial();
    else if (formType === 'NCD')        parts = _buildMpisNcd();
    else if (formType === 'VESTIBULAR') parts = _buildMpisVestibular();
    else                                parts = _buildMpisMs();
```

Do NOT add a per-form public wrapper (`copyToMpisVestibular`) — `copyToMpisAuto()` is the sole entry point (WORKFLOW MPIS Pattern).

- [ ] **Step 3: Syntax check**

```bash
node --check static/js/main.js
```

- [ ] **Step 4: Commit**

```bash
git add static/js/main.js
git commit -m "vestibular: add MPIS builder (SOAPIER, positives + roll-up, truncated per D8)"
```

---

### Task 13: MPIS smoke test

**Files:** none (manual verification)

- [ ] **Step 1: Miruya fills a realistic Vestibular record in the browser** (patient info, at least 2 batteries with mixed Yes/No, one battery left as KIV, one positive positioning test, impression + goals).
- [ ] **Step 2:** Click "Copy to MPIS" on the topbar. Confirm the header modal appears, then copy completes.
- [ ] **Step 3:** Paste the clipboard content somewhere visible (e.g. a scratch text file). Verify:
  - [ ] SOAPIER dash-delimited sections (SUBJECTIVE / OBJECTIVE / ANALYSIS / PLAN) present
  - [ ] Positive battery items spelled out by name; negative items collapse to a roll-up line ("Other PMHx: N item(s) negative.")
  - [ ] The KIV battery prints its remark line, not an item list
  - [ ] A blank/untapped battery produces NO line at all (omitted, not an empty header)
  - [ ] Output stays reasonably tight (D8 — no 13-line enumeration of negatives)
- [ ] **Step 4:** If any check fails, fix `_buildMpisVestibular()`, re-run `node --check`, commit a fix.

---

## Milestone: POLISH (final)

### Task 14: Final pre-ship pass

**Files:** none (verification + BACKLOG note)

- [ ] **Step 1: Full DESIGN_SYSTEM.md Pre-ship Visual Checklist** — re-run every item from Task 6 Step 2 once more now that PDF/MPIS/templates are wired, in case any later edit touched the HTML.

- [ ] **Step 2: Full round-trip test** — fill every section (including KIV on at least one battery, a negative AND positive scaffold entry, all fixed-row tables), Save Record, reload, Export KKM PDF, Copy to MPIS. Confirm all three outputs (screen re-populate, PDF, MPIS) agree with what was entered.

- [ ] **Step 3: `node --check` every touched JS file one more time**
```bash
node --check static/js/form_vestibular.js
node --check static/js/vestibular_scaffold.js
node --check static/js/clinical_templates.js
node --check static/js/main.js
```

- [ ] **Step 4: Add BACKLOG entries** (per spec §12 open items) — append to `BACKLOG.md`:
```markdown
- Chip-helper promotion: NEURO/FACIAL/VESTIBULAR all now carry local copies of the same toggleChip/getChips/setChips pattern. Promote to a shared `window.FormBase` helper as its own small pass (decided 2026-07-14, deferred — do not promote inside any single form's build).
- VESTIBULAR section count (16) — D10 flagged the SOAPIER sequence as preliminary. Revisit merge/reorder in a future polish pass once Miruya has used it clinically.
- VESTIBULAR AROM/PROM row shape — confirm with Miruya whether the borang's `..../....` two-slot per row is range/quality (as implemented) vs a true AROM/PROM pair; adjust `pdf_vestibular.py` + `form_vestibular.js` together if wrong.
- VESTIBULAR scaffold chip (`vestibular_scaffold.js`) is a promotion candidate if it proves out in clinic — do not generalize speculatively; wait for a second consumer.
```

- [ ] **Step 5: Commit BACKLOG update**
```bash
git add BACKLOG.md
git commit -m "vestibular: note deferred items in BACKLOG"
```

- [ ] **Step 6: Push the branch**
```bash
git push -u origin worktree-vestibular-form
```

**STOP HERE.** Do not merge. Miruya eyeballs the worktree; merge is human-gated (WORKFLOW-176) after Cowork vets the build against this plan and the design spec.

---

## Self-review notes (writing-plans skill requirement)

**Spec coverage check against `docs/superpowers/specs/2026-07-14-vestibular-form-design.md`:**
- §1 D1-D10 — D1 (Task 5 `pickBattery`/battery HTML), D2 (Task 5 `stampBattery`, non-destructive), D3 (Task 5 `collectBattery` returns `null` on blank → PDF/MPIS `_battery_block`/`batteryLines` omit), D4 (Task 5 `toggleKiv`/`getKiv`, Task 9 `_battery_block` kiv branch, Task 12 `batteryLines` kiv branch), D5 (Task 4 scaffold component), D6 (Task 3 `addButton` wiring, Task 7 templates), D7 (no chart component anywhere in plan — confirmed), D8 (Task 9 full Yes/No list, Task 12 positives+roll-up truncation), D9 (no `<table>` grid chrome for batteries — chip rows only), D10 (Task 14 Step 4 BACKLOG note) — all covered.
- §2 field transcription — every field enumerated in Task 3's HTML and Task 5's `collect()`/`populate()`.
- §3 section structure — all 16 sections present in Task 3 sidebar_nav + cards, matching the `s-id` table.
- §4 interaction model — §4.1-4.5 covered across Tasks 3-5.
- §5 backbone table — matches: battery chips borrowed+local (Task 5), stamp mechanic borrowed (Task 5 `stampBattery`, non-destructive per SCI semantics), scaffold built once (Task 4), plain inputs/fixed rows (Task 3), templates borrowed (Task 7/8), no chart (nowhere in plan).
- §6 PDF spec — Task 9 follows every bullet (ref string, full documented lists, positional detail, full-width battery rhythm, section label rhythm, sparse guard, sign_chop_block via `+=`, cross-check step).
- §7 MPIS spec — Task 12 follows SOAPIER structure, positives+roll-up, KIV handling, guards, no `copyText`/`await` inside builder, reuses `MPIS_DIV`/`MPIS_DASH`.
- §8 templates — Task 7 authors original vestibular SMART content, explicitly avoids the respiratory-boilerplate trap called out in the spec.
- §9 wiring checklist — all 9 items covered: Task 1 (1-5 excluding pdf keys), Task 10 (1, 6), Task 8 (7 tplMap; addButton already in Task 3), Task 12 (8), Task 5/9 (9, `node --check` steps throughout).
- §10 build order — plan's milestone structure matches exactly.
- §11 axiom compliance — no new deps, ReportLab only, MPIS plain-text SOAPIER, ship-crude (one new component only), KKM ref preserved, topbar unchanged.
- §12 open items — scaffold location decided (own file, per spec recommendation), chip-helper promotion deferred (BACKLOG, Task 14), KIV UI decided (per-battery `+Note`-style toggle), section count deferred to polish, AROM/PROM row shape flagged for clinical confirm (BACKLOG), templates authored as their own rung (Task 7, separate from Task 3's form rung).

**Placeholder scan:** no "TBD"/"implement later"/"add appropriate X" strings in any code block. Task 5's `rom` populate regex bug (found during vet) and the dead `soma` id-loop are both fixed directly in the main `populate()` code block — no separate patch step remains.

**Type/key consistency check:** `collect()` (Task 5) and `_build_story()`/`_battery_block()` (Task 9) and `_buildMpisVestibular()` (Task 12) all key off the same field names — `d.pmhx`, `d.recentSymptoms`, `d.functionalStatus`, `d.oculomotor` (all `{items, kiv}` shape), `d.positional.{rDixHallpike,lDixHallpike,rRoll,lRoll}` (all `{result, direction, latency, duration, intensity, note}` shape), `d.rom.{neck,rUl,lUl,rLl,lLl}` (all `{range, quality, pain}`), `d.postural.{rhomberg,rSharpened,lSharpened,rSls,lSls}` (all `{eo, ec}`), `d.somatosensory.{propUlR,propUlL,propLlR,propLlL}` and `d.coordination.{ftnR,ftnL,htsR,htsL}` (all `{status, note}`). Verified matching across all three consumers during drafting.
