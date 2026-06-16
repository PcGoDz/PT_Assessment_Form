# FACIAL Form Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Activate the FACIAL (facial palsy) assessment form end-to-end — HTML, JS, PDF, MPIS — following the KKM borang `fisio / b.pen. 7 / Pind. 2 / 2019`.

**Architecture:** Page-1 intake is a near-clone of `ms.html` (MSK skeleton); the only net-new clinical structure is the page-2 facial/tongue grading grids (two `assessment_grid.js` instances) plus four multi-select chip intake fields. The form follows the `window.Form` contract, `collect()` returns `_form_type:'FACIAL'` + `meta:{form:'FACIAL'}`, PDF via a new `pdf_facial.py`, MPIS via `_buildMpisFacial` in `main.js` (SOAPIER, mirroring HAND/SCI).

**Tech Stack:** Flask + SQLite + vanilla JS (no frameworks), ReportLab/Platypus for PDF, PyInstaller packaging. Source of truth: `FACIAL_SPEC.md`.

---

## ⚠ Plan-level decisions (read before Task 1)

**1. No TDD / no unit tests — smoke-test rungs instead.** Per `CLAUDE.md` + `RULES.md`: this project has no test suite and TDD on the UI layer is explicitly forbidden. The writing-plans skill's failing-test-first loop is therefore replaced with **smoke-test verification steps** Miruya runs in the browser (and quick `node --check` / `py -c import` backend checks). Each task still ends in a commit. This is a deliberate, user-instructed deviation from the skill default.

**2. SPEC CORRECTION — multi-select chips are NOT net-new.** `FACIAL_SPEC.md` Build Note #4 says no multi-select chip primitive exists and instructs building a `.multi-chip`/`.mc-sel` helper. That is incorrect. The primitive ships in NEURO today:
- CSS: `.chip-group` / `.chip` / `.chip.active` — `static/css/style.css:583–606`
- JS: `static/js/form_neuro.js:11–27` — `toggleChip(el, groupId)`, `getChips(groupId)`, `setChips(groupId, values)`
- HTML: `<div class="chip-group" id="x-chips"><span class="chip" onclick="...toggleChip(this,'x-chips')">Label</span>…</div>` (chip value = its `textContent`)

This plan **borrows** that pattern (copies the 3 helpers locally into `form_facial.js`, exactly as `form_sci.js` keeps its own local `getChecks`/`setChecks`). No new CSS, no `.multi-chip` class. Build Note #4's *intent* (one reusable multi-select, not bespoke-per-field) is honoured; its *premise* is corrected. The deferred full-clickfest project's "seed component" is this existing neuro pattern — a future 3rd consumer is the trigger to promote `toggleChip/getChips/setChips` into `FormBase` (logged to BACKLOG, not done here — ship-crude, no shared-code edit).

**3. The other Build Notes stand and are load-bearing:**
- **#1 mixed collect() shape:** `pain` and `sensation` are NESTED objects; everything else FLAT. PDF + MPIS must read each field at its real depth.
- **#2 grid row labels are a DATA CONTRACT:** `assessment_grid.js loadData()` matches saved rows to grid rows by the `label` STRING. The 15 facial + 5 tongue labels (KKM typos preserved) ARE the persistence key. Once any record is saved, NEVER edit a label — old records would silently fail to repopulate (blank grid, no error). Typo-preservation and the load-key are the same constraint.
- **#3 two grids = two wirings:** `collect()`→`getData()` on both, `populate()`→`loadData()` on both, `reset()`→`clear()` on both. Mirror `form_sci.js`.

**4. KKM ref string — EXACT:** `fisio / b.pen. 7 / Pind. 2 / 2019`. Preserve all borang typos verbatim in grid labels AND PDF: "uplook" (row 1), "Suprioris" (row 4), "month" ×3 (rows 10/11/14), original spacing.

---

## Pre-flight: verified anchors (real line numbers, June 2026 tree)

| What | Location | Note |
|---|---|---|
| FACIAL registry row | `app.py:62` | EXISTS, `ready=False`, no pdf keys — flip + add keys |
| PDF dicts (derived) | `app.py:72–73` | dict-comp from registry — DO NOT hand-edit |
| FORM_TEMPLATES | `app.py:~102` (SCI line) | add `'FACIAL': 'forms/facial.html'` |
| REQUIRED_FIELDS | `database.py:129`, SCI at `:142` | add FACIAL entry |
| MPIS switch | `main.js:1032–1039` | add `else if (formType === 'FACIAL')` |
| MPIS helpers | `main.js:19–21` (`MPIS_DIV/DASH/LN`), `:63` (`mpisSec`), `:24` (`escapeHtml`), `:2081` (`_doCopyMpis`) | reuse, never redeclare |
| `_buildMpisSci` (skeleton ref) | `main.js:1878–~2000` | clone structure |
| MPIS public-API export | `main.js:2244` (`copyToMpisAuto`) | builder is private, no public wrapper |
| spec datas | `pt_assessment.spec:8–22` (`('pdf_sci.py','.')` at :22) | add `('pdf_facial.py','.')` |
| ms.html sections | `templates/forms/ms.html` — patient `22–135`, `s-dx` 138, `s-pain` 170, `s-hx` 378, `s-sq` 398, `s-obs` 427, `s-palp` 479, `s-plan` 556, `extra_js` 577 | clone source |
| home.html picker FACIAL card | `home.html:1087` (`soon`) | un-soon |
| home.html label maps | `FORM_LABELS` const `:1207–1210`, inline `formLabel` `:1922`, inline icon `:1923` | add FACIAL |
| patient.html picker FACIAL card | `patient.html:565` (`soon`) | un-soon, handler `selectEpForm` |
| patient.html label/icon maps | `form_labels` `:475`, `form_icons` `:476` | add FACIAL |
| episode.html label maps ×2 | `episode.html:787`, `:828` | add FACIAL |
| episode.html SOAP `tplMap` | `episode.html:663`, key fallback `:672` | add `FACIAL` |
| clinical templates | `clinical_templates.js` — SCI at `:548` | add `TEMPLATES.FACIAL` + `TEMPLATES.FACIAL_SOAP` |
| chip primitive (borrow) | CSS `style.css:583–606`, JS `form_neuro.js:11–27` | reuse, copy helpers locally |
| grid factory API | `assessment_grid.js` — `create({containerId,rows,columns,greyout})` → `{getData,loadData,clear,stampBlanks}`; getData row shape `{label, <colId>}` | single-col config = `[{id:'grade',...}]` → `{label,grade}` |
| FormBase reset pacemaker | `form_base.js:138` | `resetPatient()` already sets `[name=pacemaker][value=No]` checked — wire Hearing-Aid/Pacemaker toggle to `name="pacemaker"` and reset is free |

---

# RUNG 1 — FORM (HTML + form_facial.js)

Milestone-ladder rung 1. Produces a loadable, fillable, savable FACIAL form. Polished before templates rung.

## Task 1: Template file + registry wiring so the page can load

**Files:**
- Create: `templates/forms/facial.html` (skeleton only this task; sections added in Tasks 3–5)
- Modify: `app.py:62` (flip `ready`), `app.py:~102` (FORM_TEMPLATES)
- Modify: `database.py:142` area (REQUIRED_FIELDS)

- [ ] **Step 1: Create the template skeleton** `templates/forms/facial.html`:

```jinja
{% extends "base.html" %}

{% block form_name %}Facial Assessment{% endblock %}

{% block sidebar_nav %}
<div class="nav-item" onclick="Main.go('s-patient')"><span class="nav-icon">&#128100;</span> Patient Info</div>
<div class="nav-item" onclick="Main.go('s-dx')"><span class="nav-icon">&#128203;</span> Diagnosis</div>
<div class="nav-item" onclick="Main.go('s-pain')"><span class="nav-icon">&#128293;</span> Pain Assessment</div>
<div class="nav-item" onclick="Main.go('s-hx')"><span class="nav-icon">&#128214;</span> History</div>
<div class="nav-item" onclick="Main.go('s-sq')"><span class="nav-icon">&#10067;</span> Special Questions</div>
<div class="nav-item" onclick="Main.go('s-obs')"><span class="nav-icon">&#128065;</span> Observation</div>
<div class="nav-item" onclick="Main.go('s-palp')"><span class="nav-icon">&#9995;</span> Palpation</div>
<div class="nav-item" onclick="Main.go('s-sens')"><span class="nav-icon">&#127777;</span> Sensation Test</div>
<div class="nav-item" onclick="Main.go('s-mov')"><span class="nav-icon">&#128512;</span> Movement Assessment</div>
<div class="nav-item" onclick="Main.go('s-plan')"><span class="nav-icon">&#127919;</span> PT Impression</div>
{% endblock %}

{% block content %}
<!-- Sections added in Tasks 3, 4, 5 -->
{% endblock %}

{% block extra_js %}
<script src="{{ url_for('static', filename='js/assessment_grid.js') }}"></script>
<script src="{{ url_for('static', filename='js/form_facial.js') }}"></script>
<script>
document.addEventListener('DOMContentLoaded', function () {
  if (window.FacialForm) FacialForm.initGrids();
});
</script>
{% endblock %}
```

- [ ] **Step 2: Flip the registry row.** Edit `app.py:62` from:

```python
    { 'id': 'FACIAL',      'label': 'Facial',             'icon': '&#128580;', 'badge': 'FC',  'group': 'Neurological',      'ready': False },
```

to (PDF keys added in Rung 3 — for now just flip ready):

```python
    { 'id': 'FACIAL',      'label': 'Facial',             'icon': '&#128580;', 'badge': 'FC',  'group': 'Neurological',      'ready': True  },
```

- [ ] **Step 3: Register the template.** In `app.py` FORM_TEMPLATES dict (near `:102`), add after the SCI line:

```python
    'FACIAL':      'forms/facial.html',
```

- [ ] **Step 4: Add REQUIRED_FIELDS.** In `database.py`, after the `'SCI'` entry (`:142`), add:

```python
    'FACIAL':      [('diagnosis', "Doctor's Diagnosis is required"), ('pt_impression', 'PT Impression is required')],
```

- [ ] **Step 5: Verify backend imports cleanly.**

Run: `py -c "import app; print('FACIAL' in app.FORM_TEMPLATES, [f['id'] for f in app.FORM_REGISTRY if f['id']=='FACIAL'])"`
Expected: `True ['FACIAL']` and no traceback.

- [ ] **Step 6: Commit.**

```bash
git add templates/forms/facial.html app.py database.py
git commit -m "feat(facial): scaffold template + registry + required fields"
```

---

## Task 2: form_facial.js skeleton — window.Form contract + grid configs + chip helpers

**Files:**
- Create: `static/js/form_facial.js`

This task creates the JS module with: borrowed chip helpers, the two grid configs (verbatim labels), single-select sensation helper, and a stub `collect/populate/reset` so `window.Form` is valid. The full field wiring lands as HTML sections are added (Tasks 3–5), but the contract must be present from the start or `main.js init()` crashes silently.

- [ ] **Step 1: Write `static/js/form_facial.js`:**

```js
// form_facial.js — Facial palsy assessment form logic.
// Two AssessmentGrid instances (facial + tongue), single-grade Poor/Fair/Good.
// Multi-select chips: BORROWED from form_neuro.js pattern (.chip / .chip.active / .chip-group).
// Single-select sensation chips: local pickSingle helper, reuses .chip CSS.
// PDF + MPIS wired in later rungs.

var FacialForm = (function () {

  function gv(id)        { return FormBase.gv(id); }
  function sv(id, val)   { return FormBase.sv(id, val); }
  function radio(name)   { return FormBase.radio(name); }
  function setRadio(n,v) { return FormBase.setRadio(n, v); }

  // ── Multi-select chips (borrowed verbatim from form_neuro.js:11-27) ──
  // Chip value = its trimmed textContent. One handler shape, used by all multi groups.
  function toggleChip(el)            { el.classList.toggle('active'); }
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
  function clearChips(groupId) {
    document.querySelectorAll('#' + groupId + ' .chip').forEach(function (c) { c.classList.remove('active'); });
  }

  // ── Single-select chips (sensation modalities) — reuses .chip CSS, single pick ──
  // Stores value as the chip's textContent; clears siblings on pick.
  function pickSingle(el, groupId) {
    document.querySelectorAll('#' + groupId + ' .chip').forEach(function (c) { c.classList.remove('active'); });
    el.classList.add('active');
  }
  function getSingle(groupId) {
    var el = document.querySelector('#' + groupId + ' .chip.active');
    return el ? el.textContent.trim() : '';
  }
  function setSingle(groupId, value) {
    document.querySelectorAll('#' + groupId + ' .chip').forEach(function (c) {
      c.classList.toggle('active', c.textContent.trim() === value);
    });
  }

  // ── Single-select irritability chips (reuse MS .irr-chip / .sel-<Value>) ──
  function pickIrr(val) {
    ['High','Medium','Low'].forEach(function (v) {
      var el = document.getElementById('irr-' + v);
      if (el) el.classList.remove('sel-High','sel-Medium','sel-Low');
    });
    var sel = document.getElementById('irr-' + val);
    if (sel) sel.classList.add('sel-' + val);
  }
  var _irr = '';
  function pickIrrStore(val) { _irr = val; pickIrr(val); }
  function getIrr() { return _irr; }

  // ── Affected-side R/L toggle (reuse .irr-chip / .sel-<Value>) ──
  var _side = '';
  function pickSide(val) {
    _side = val;
    ['R','L'].forEach(function (v) {
      var el = document.getElementById('side-' + v);
      if (el) el.classList.remove('sel-R','sel-L');
    });
    var sel = document.getElementById('side-' + val);
    if (sel) sel.classList.add('sel-' + val);
  }
  function getSide() { return _side; }

  // ── Pain VAS display (mirror form_sci.js onPainChange) ──
  function onPainChange(which) {
    var n  = parseInt(gv('pain-' + which));
    var el = document.getElementById('pain-' + which + '-display');
    if (!el) return;
    el.textContent = isNaN(n) ? 0 : n;
    el.className = 'pain-val ' + (n <= 3 ? 'pv-low' : n <= 6 ? 'pv-mid' : 'pv-high');
  }

  // ── Grid configs — labels VERBATIM with KKM typos (DATA CONTRACT, never edit) ──
  var GRADE_COL = [{ id: 'grade', label: 'Grade', type: 'dropdown', options: ['Poor','Fair','Good'] }];

  var FACIAL_ROWS = [
    'Lift eyebrows,uplook surprised and wrinkle forehead (Frontalis)',
    'Frown ,pull eyebrows down (Corrugator)',
    'Close eyes (Orbicularis Oculi)',
    'Open eyes (Levator Palpebrae Suprioris)',
    'Wrinkle nose (Procerus)',
    'Smile (Risorius and Zygomaticus Major)',
    "Purse lips, whistle, say 'prunes', close mouth  (Orbicularis Oris)",
    'Lift upper lip, show upper teeth (Levator Labii Superioris)',
    'Push lower lip downwards, show lower teeth (Depressor Labii Inferioris)',
    'Pull corners of month up, sneer (Levator Anguli Oris)',
    'Push corners of month down, look sad (Depressor Anguli Oris)',
    'Suck cheek in, pull in against tongue blade (Buccinator)',
    'Bite (Masseter Temporalis)',
    'Open month (Infrahyoid  & Suprahyoid)',
    'Pull chin down (Platysma)'
  ];

  var TONGUE_ROWS = [
    'Stick the tongue out straight',
    'Stick the tongue out to left and right',
    'Touch the nose with the tongue',
    'Hump the tongue (push food back in the month preparing for swallowing)',
    'Swallowing Difficulty'
  ];

  var gFacial, gTongue;
  function initGrids() {
    gFacial = AssessmentGrid.create({ containerId: 'facial-mov-grid', rows: FACIAL_ROWS, columns: GRADE_COL });
    gTongue = AssessmentGrid.create({ containerId: 'tongue-mov-grid', rows: TONGUE_ROWS, columns: GRADE_COL });
  }
  function stampFacialPoor() { if (gFacial) gFacial.stampBlanks('Poor'); }
  function stampTonguePoor() { if (gTongue) gTongue.stampBlanks('Poor'); }

  // ── collect() — full data contract per FACIAL_SPEC ──
  // NOTE Build Note #1: pain + sensation NESTED, everything else FLAT.
  function collect() {
    return {
      _form_type: 'FACIAL',
      meta:       { form: 'FACIAL' },
      patient:    FormBase.collectPatient(),

      diagnosis:  gv('diagnosis'),
      doctorMgmt: gv('doctor-mgmt'),
      problem:    gv('problem'),

      pain:  { pre: gv('pain-pre'), post: gv('pain-post') },
      area:  gv('area'),
      nature:     getChips('nature-chips'),  natureNotes: gv('nature-notes'),
      agg:        getChips('agg-chips'),      aggNotes:    gv('agg-notes'),
      ease:       getChips('ease-chips'),     easeNotes:   gv('ease-notes'),
      hrs24:      getChips('hrs24-chips'),     hrs24Notes:  gv('hrs24-notes'),
      irritability: getIrr(),

      currentHistory: gv('current-history'),
      pastHistory:    gv('past-history'),

      generalHealth:  gv('general-health'),
      pmhx:           gv('pmhx'),
      investigations: gv('investigations'),
      medication:     gv('medication'),
      occupation:     gv('occupation'),
      socialHistory:  gv('social-history'),
      hearingAidPacemaker: radio('pacemaker'),

      observation: gv('observation'),
      palpation:   gv('palpation'),

      sensation: {
        hot:      getSingle('sens-hot-chips'),
        cold:     getSingle('sens-cold-chips'),
        pinPrick: getSingle('sens-pin-chips'),
        notes:    gv('sensation-notes')
      },

      affectedSide: getSide(),
      facialMov: gFacial ? gFacial.getData() : [],
      tongueMov: gTongue ? gTongue.getData() : [],

      impression:      gv('pt-impression'),
      stg:             gv('stg'),
      ltg:             gv('ltg'),
      planOfTreatment: gv('plan')
    };
  }

  // ── populate(d) — mirror collect at correct depths ──
  function populate(d) {
    if (!d) return;
    FormBase.populatePatient(d.patient);

    sv('diagnosis',   d.diagnosis);
    sv('doctor-mgmt', d.doctorMgmt);
    sv('problem',     d.problem);

    var pain = d.pain || {};
    var pre = document.getElementById('pain-pre');
    if (pre)  { pre.value = pain.pre || 0;  onPainChange('pre'); }
    var post = document.getElementById('pain-post');
    if (post) { post.value = pain.post || 0; onPainChange('post'); }
    sv('area', d.area);
    setChips('nature-chips', d.nature); sv('nature-notes', d.natureNotes);
    setChips('agg-chips',    d.agg);    sv('agg-notes',    d.aggNotes);
    setChips('ease-chips',   d.ease);   sv('ease-notes',   d.easeNotes);
    setChips('hrs24-chips',  d.hrs24);  sv('hrs24-notes',  d.hrs24Notes);
    if (d.irritability) pickIrrStore(d.irritability);

    sv('current-history', d.currentHistory);
    sv('past-history',    d.pastHistory);

    sv('general-health',  d.generalHealth);
    sv('pmhx',            d.pmhx);
    sv('investigations',  d.investigations);
    sv('medication',      d.medication);
    sv('occupation',      d.occupation);
    sv('social-history',  d.socialHistory);
    setRadio('pacemaker', d.hearingAidPacemaker);

    sv('observation', d.observation);
    sv('palpation',   d.palpation);

    var s = d.sensation || {};
    setSingle('sens-hot-chips',  s.hot);
    setSingle('sens-cold-chips', s.cold);
    setSingle('sens-pin-chips',  s.pinPrick);
    sv('sensation-notes', s.notes);

    if (d.affectedSide) pickSide(d.affectedSide);
    if (gFacial) gFacial.loadData(d.facialMov);
    if (gTongue) gTongue.loadData(d.tongueMov);

    sv('pt-impression', d.impression);
    sv('stg',  d.stg);
    sv('ltg',  d.ltg);
    sv('plan', d.planOfTreatment);
  }

  // ── reset(keepPatient) — snapshot-restore pattern (RULES.md) ──
  function reset(keepPatient) {
    var savedPt = keepPatient ? FormBase.collectPatient() : null;
    FormBase.resetPatient();   // also resets pacemaker radio to "No" (form_base.js:138)

    var ids = ['diagnosis','doctor-mgmt','problem','area',
      'nature-notes','agg-notes','ease-notes','hrs24-notes',
      'current-history','past-history',
      'general-health','pmhx','investigations','medication','occupation','social-history',
      'observation','palpation','sensation-notes',
      'pt-impression','stg','ltg','plan'];
    ids.forEach(function (id) { sv(id, ''); });

    ['nature-chips','agg-chips','ease-chips','hrs24-chips',
     'sens-hot-chips','sens-cold-chips','sens-pin-chips'].forEach(clearChips);
    _irr = ''; pickIrr('');
    _side = ''; pickSide('');

    var pre = document.getElementById('pain-pre');
    if (pre)  { pre.value = 0; onPainChange('pre'); }
    var post = document.getElementById('pain-post');
    if (post) { post.value = 0; onPainChange('post'); }

    if (gFacial) gFacial.clear();
    if (gTongue) gTongue.clear();

    if (savedPt) FormBase.populatePatient(savedPt);
  }

  return {
    initGrids: initGrids,
    toggleChip: toggleChip,
    pickSingle: pickSingle,
    pickIrr: pickIrrStore,
    pickSide: pickSide,
    onPainChange: onPainChange,
    stampFacialPoor: stampFacialPoor,
    stampTonguePoor: stampTonguePoor,
    collect: collect,
    populate: populate,
    reset: reset
  };
})();

window.ActiveForm = { collect: FacialForm.collect, populate: FacialForm.populate, reset: FacialForm.reset };
window.Form = {
  collect:        FacialForm.collect,
  populate:       FacialForm.populate,
  reset:          FacialForm.reset,
  onPtTypeChange: FormBase.onPtTypeChange,
  onNricInput:    FormBase.onNricInput,
  onDobChange:    FormBase.onDobChange
};
```

- [ ] **Step 2: Syntax-check.**

Run: `node --check static/js/form_facial.js`
Expected: no output (exit 0). Any SyntaxError must be fixed before continuing.

- [ ] **Step 3: Commit.**

```bash
git add static/js/form_facial.js
git commit -m "feat(facial): form_facial.js — window.Form contract, grid configs, chip helpers"
```

---

## Task 3: HTML sections 01–02 — Patient Info + Diagnosis (clone from ms.html)

**Files:**
- Modify: `templates/forms/facial.html` (`{% block content %}`)

- [ ] **Step 1: Clone the patient card.** Copy `templates/forms/ms.html` lines **22–135** (the entire `<div class="card" id="s-patient">` block — it has all required IDs incl. `pt-age`, `sex-field`, `derived-dob`, `derived-gender`; per RULES.md the neuro card is INCOMPLETE, always clone from ms.html) verbatim into `facial.html`'s `{% block content %}` as the first card. Keep `<span class="sec-num">01</span>`.

- [ ] **Step 2: Add the Diagnosis card** (sec 02) below it. Clone `ms.html` `s-dx` (line 138) structure; FACIAL needs Diagnosis + Doctor's Management + Problem:

```html
<div class="card" id="s-dx">
  <div class="card-header"><span class="sec-num">02</span><h2>Diagnosis &amp; Doctor's Management</h2></div>
  <div class="card-body">
    <div class="fg">
      <div class="field">
        <label>Diagnosis <span class="req">*</span></label>
        <textarea id="diagnosis" rows="2" placeholder="As per referral"></textarea>
      </div>
    </div>
    <div class="fg c2">
      <div class="field">
        <label>Doctor's Management</label>
        <textarea id="doctor-mgmt" rows="2" placeholder="Conservative / operative"></textarea>
      </div>
      <div class="field">
        <label>Problem</label>
        <textarea id="problem" rows="2" placeholder="Presenting complaint"></textarea>
      </div>
    </div>
  </div>
</div>
```

- [ ] **Step 3: Smoke-test.** Start Flask (`py app.py`), open a patient → new FACIAL episode → confirm the form loads, patient fields prefill from NRIC (type a 12-digit IC, DOB+Gender derived badges appear), and sections 01/02 render as cards. No console errors (check terminal for Flask errors too).

- [ ] **Step 4: Commit.**

```bash
git add templates/forms/facial.html
git commit -m "feat(facial): HTML sections 01-02 patient + diagnosis"
```

---

## Task 4: HTML sections 03–07 — Pain, History, Special Questions, Observation, Palpation

**Files:**
- Modify: `templates/forms/facial.html`

- [ ] **Step 1: Add the Pain Assessment card (sec 03).** VAS sliders (clone `ms.html` `s-pain` pain-score-box pattern, DESIGN_SYSTEM "Pain VAS slider"), Area textbox, four multi-chip groups (Nature/Agg/Ease/24hrs) each with a notes textbox, and single-select irritability chips:

```html
<div class="card" id="s-pain">
  <div class="card-header"><span class="sec-num">03</span><h2>Pain Assessment</h2></div>
  <div class="card-body">
    <div class="fg c2">
      <div class="pain-score-box">
        <label style="font-size:11px;font-weight:500;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.04em">PRE-treatment Pain (VAS 0&ndash;10)</label>
        <div class="pain-scale-row">
          <span style="font-size:11px;color:var(--text-faint)">0</span>
          <input type="range" id="pain-pre" min="0" max="10" value="0" step="1" oninput="FacialForm.onPainChange('pre')">
          <span style="font-size:11px;color:var(--text-faint)">10</span>
          <div class="pain-val pv-low" id="pain-pre-display">0</div>
        </div>
      </div>
      <div class="pain-score-box">
        <label style="font-size:11px;font-weight:500;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.04em">POST-treatment Pain (VAS 0&ndash;10)</label>
        <div class="pain-scale-row">
          <span style="font-size:11px;color:var(--text-faint)">0</span>
          <input type="range" id="pain-post" min="0" max="10" value="0" step="1" oninput="FacialForm.onPainChange('post')">
          <span style="font-size:11px;color:var(--text-faint)">10</span>
          <div class="pain-val pv-low" id="pain-post-display">0</div>
        </div>
      </div>
    </div>

    <div class="fg"><div class="field"><label>Area</label><input type="text" id="area" placeholder="Pain location"></div></div>

    <div class="field">
      <label>Nature <span style="font-weight:400;color:var(--text-faint)">(select all that apply)</span></label>
      <div class="chip-group" id="nature-chips">
        <span class="chip" onclick="FacialForm.toggleChip(this)">Sharp</span>
        <span class="chip" onclick="FacialForm.toggleChip(this)">Dull</span>
        <span class="chip" onclick="FacialForm.toggleChip(this)">Pricking</span>
        <span class="chip" onclick="FacialForm.toggleChip(this)">Throbbing</span>
        <span class="chip" onclick="FacialForm.toggleChip(this)">Burning</span>
        <span class="chip" onclick="FacialForm.toggleChip(this)">Numbness</span>
      </div>
      <input type="text" id="nature-notes" placeholder="Notes" style="margin-top:6px">
    </div>

    <div class="field">
      <label>Aggravating <span style="font-weight:400;color:var(--text-faint)">(select all that apply)</span></label>
      <div class="chip-group" id="agg-chips">
        <span class="chip" onclick="FacialForm.toggleChip(this)">Chewing</span>
        <span class="chip" onclick="FacialForm.toggleChip(this)">Swallowing</span>
        <span class="chip" onclick="FacialForm.toggleChip(this)">Drinking</span>
        <span class="chip" onclick="FacialForm.toggleChip(this)">Speaking</span>
        <span class="chip" onclick="FacialForm.toggleChip(this)">Facial expressions</span>
      </div>
      <input type="text" id="agg-notes" placeholder="Notes" style="margin-top:6px">
    </div>

    <div class="field">
      <label>Easing <span style="font-weight:400;color:var(--text-faint)">(select all that apply)</span></label>
      <div class="chip-group" id="ease-chips">
        <span class="chip" onclick="FacialForm.toggleChip(this)">Moist heat</span>
        <span class="chip" onclick="FacialForm.toggleChip(this)">Ice packs</span>
        <span class="chip" onclick="FacialForm.toggleChip(this)">Medication</span>
        <span class="chip" onclick="FacialForm.toggleChip(this)">Rest</span>
        <span class="chip" onclick="FacialForm.toggleChip(this)">Self-relief</span>
      </div>
      <input type="text" id="ease-notes" placeholder="Notes" style="margin-top:6px">
    </div>

    <div class="field">
      <label>24 hrs <span style="font-weight:400;color:var(--text-faint)">(select all that apply)</span></label>
      <div class="chip-group" id="hrs24-chips">
        <span class="chip" onclick="FacialForm.toggleChip(this)">AM</span>
        <span class="chip" onclick="FacialForm.toggleChip(this)">PM</span>
        <span class="chip" onclick="FacialForm.toggleChip(this)">Night</span>
      </div>
      <input type="text" id="hrs24-notes" placeholder="Notes" style="margin-top:6px">
    </div>

    <div class="field">
      <label>Irritability</label>
      <div class="irr-chips">
        <button type="button" class="irr-chip" id="irr-High"   onclick="FacialForm.pickIrr('High')">High</button>
        <button type="button" class="irr-chip" id="irr-Medium" onclick="FacialForm.pickIrr('Medium')">Medium</button>
        <button type="button" class="irr-chip" id="irr-Low"    onclick="FacialForm.pickIrr('Low')">Low</button>
      </div>
    </div>
  </div>
</div>
```

- [ ] **Step 2: Add History (sec 04), Special Questions (sec 05), Observation (sec 06), Palpation (sec 07):**

```html
<div class="card" id="s-hx">
  <div class="card-header"><span class="sec-num">04</span><h2>History</h2></div>
  <div class="card-body">
    <div class="fg c2">
      <div class="field"><label>Current History</label><textarea id="current-history" rows="3"></textarea></div>
      <div class="field"><label>Past History</label><textarea id="past-history" rows="3"></textarea></div>
    </div>
  </div>
</div>

<div class="card" id="s-sq">
  <div class="card-header"><span class="sec-num">05</span><h2>Special Questions</h2></div>
  <div class="card-body">
    <div class="fg c2">
      <div class="field"><label>General Health</label><input type="text" id="general-health" placeholder="HPT, DM, cancer, ear-related"></div>
      <div class="field"><label>PMHX / Surgery</label><input type="text" id="pmhx" placeholder="Prior brain/ear surgery"></div>
      <div class="field"><label>Investigations</label><input type="text" id="investigations" placeholder="MRI, X-ray"></div>
      <div class="field"><label>Medication</label><input type="text" id="medication" placeholder="Steroids, Neurobion"></div>
      <div class="field"><label>Occupation / Recreation</label><input type="text" id="occupation"></div>
      <div class="field"><label>Social History</label><input type="text" id="social-history"></div>
    </div>
    <div class="field" style="margin-top:10px">
      <label>Hearing Aid / Pacemaker</label>
      <div class="irr-chips">
        <label class="irr-chip" style="cursor:pointer"><input type="radio" name="pacemaker" value="Y" style="margin-right:5px">Y</label>
        <label class="irr-chip" style="cursor:pointer"><input type="radio" name="pacemaker" value="N" style="margin-right:5px">N</label>
      </div>
    </div>
  </div>
</div>

<div class="card" id="s-obs">
  <div class="card-header"><span class="sec-num">06</span><h2>Observation</h2></div>
  <div class="card-body"><div class="fg"><div class="field"><label>Observation</label><textarea id="observation" rows="3" placeholder="Facial asymmetry, swelling, reduced expression"></textarea></div></div></div>
</div>

<div class="card" id="s-palp">
  <div class="card-header"><span class="sec-num">07</span><h2>Palpation</h2></div>
  <div class="card-body"><div class="fg"><div class="field"><label>Palpation</label><textarea id="palpation" rows="3" placeholder="Warmth, swelling, spasm, tenderness"></textarea></div></div></div>
</div>
```

> NOTE on pacemaker: `form_base.js:138` resets `[name=pacemaker][value=No]`. FACIAL uses values `Y`/`N` (borang wording), so the reset's `value=No` selector won't match — `reset()` in `form_facial.js` does not rely on it (it sweeps radios via `resetPatient()`'s blanket `input[type=radio]` clear at `form_base.js:134-135`). No conflict; the Y/N radios clear cleanly.

- [ ] **Step 3: Smoke-test.** Reload FACIAL form. Confirm: pain sliders update the colored chip; clicking Nature/Agg/Ease/24hrs chips toggles `.active` (multiple selectable); Irritability is single-select (picking Medium clears High). Fill some fields, hit **Save Record**, confirm no 422 in terminal.

- [ ] **Step 4: Commit.**

```bash
git add templates/forms/facial.html
git commit -m "feat(facial): HTML sections 03-07 pain/history/special-q/obs/palp"
```

---

## Task 5: HTML sections 08–10 — Sensation Test, Movement grids, PT Impression

**Files:**
- Modify: `templates/forms/facial.html`

- [ ] **Step 1: Add Sensation Test (sec 08)** — three single-select chip rows + notes:

```html
<div class="card" id="s-sens">
  <div class="card-header"><span class="sec-num">08</span><h2>Sensation Test</h2></div>
  <div class="card-body">
    <div class="field">
      <label>Hot <span style="font-weight:400;color:var(--text-faint)">(select one)</span></label>
      <div class="chip-group" id="sens-hot-chips">
        <span class="chip" onclick="FacialForm.pickSingle(this,'sens-hot-chips')">Normal</span>
        <span class="chip" onclick="FacialForm.pickSingle(this,'sens-hot-chips')">Reduced</span>
        <span class="chip" onclick="FacialForm.pickSingle(this,'sens-hot-chips')">Absent</span>
      </div>
    </div>
    <div class="field">
      <label>Cold <span style="font-weight:400;color:var(--text-faint)">(select one)</span></label>
      <div class="chip-group" id="sens-cold-chips">
        <span class="chip" onclick="FacialForm.pickSingle(this,'sens-cold-chips')">Normal</span>
        <span class="chip" onclick="FacialForm.pickSingle(this,'sens-cold-chips')">Reduced</span>
        <span class="chip" onclick="FacialForm.pickSingle(this,'sens-cold-chips')">Absent</span>
      </div>
    </div>
    <div class="field">
      <label>Pin-prick <span style="font-weight:400;color:var(--text-faint)">(select one)</span></label>
      <div class="chip-group" id="sens-pin-chips">
        <span class="chip" onclick="FacialForm.pickSingle(this,'sens-pin-chips')">Normal</span>
        <span class="chip" onclick="FacialForm.pickSingle(this,'sens-pin-chips')">Reduced</span>
        <span class="chip" onclick="FacialForm.pickSingle(this,'sens-pin-chips')">Absent</span>
      </div>
    </div>
    <div class="fg"><div class="field"><label>Notes</label><input type="text" id="sensation-notes"></div></div>
  </div>
</div>
```

- [ ] **Step 2: Add Movement Assessment (sec 09)** — affected-side toggle, grading legend, two grid containers + per-grid stamp buttons:

```html
<div class="card" id="s-mov">
  <div class="card-header"><span class="sec-num">09</span><h2>Movement Assessment</h2></div>
  <div class="card-body">
    <div class="field">
      <label>Affected Side</label>
      <div class="irr-chips">
        <button type="button" class="irr-chip" id="side-R" onclick="FacialForm.pickSide('R')">R</button>
        <button type="button" class="irr-chip" id="side-L" onclick="FacialForm.pickSide('L')">L</button>
      </div>
    </div>
    <p style="font-size:11px;color:var(--text-faint);margin:6px 0 14px">
      <strong>Poor:</strong> No contraction &nbsp;·&nbsp; <strong>Fair:</strong> Partial / difficult movement &nbsp;·&nbsp; <strong>Good:</strong> Full movement with control
    </p>

    <h3 style="font-size:13px;margin:0 0 6px">Facial</h3>
    <button type="button" class="grid-stamp-btn" onclick="FacialForm.stampFacialPoor()">Stamp blanks &rarr; Poor</button>
    <div id="facial-mov-grid"></div>

    <h3 style="font-size:13px;margin:18px 0 6px">Tongue</h3>
    <button type="button" class="grid-stamp-btn" onclick="FacialForm.stampTonguePoor()">Stamp blanks &rarr; Poor</button>
    <div id="tongue-mov-grid"></div>
  </div>
</div>
```

> `.grid-stamp-btn` exists (SCI restyle, BACKLOG "SCI stamp button" DONE 2026-06-11). Grep `style.css` to confirm before relying on it; if absent, drop the `class` (button still works, just unstyled).

- [ ] **Step 3: Add PT Impression & Plan (sec 10):**

```html
<div class="card" id="s-plan">
  <div class="card-header"><span class="sec-num">10</span><h2>PT Impression &amp; Treatment Plan</h2></div>
  <div class="card-body">
    <div class="fg">
      <div class="field"><label>Physiotherapist's Impression <span class="req">*</span></label><textarea id="pt-impression" rows="3"></textarea></div>
    </div>
    <div class="fg c2">
      <div class="field"><label>Short Term Goals</label><textarea id="stg" rows="3"></textarea></div>
      <div class="field"><label>Long Term Goals</label><textarea id="ltg" rows="3"></textarea></div>
    </div>
    <div class="fg">
      <div class="field"><label>Plan of Treatment</label><textarea id="plan" rows="3"></textarea></div>
    </div>
  </div>
</div>
```

- [ ] **Step 4: Smoke-test the full round-trip.** Reload FACIAL. Both grids render (15 facial rows, 5 tongue rows) with Poor/Fair/Good dropdowns. Pick affected side R. Set a few grades, click "Stamp blanks → Poor" (confirm it fills only blank rows, skips set ones). Fill required fields (Diagnosis, PT Impression). **Save Record** → reload the episode → confirm grids, chips, side, and all fields repopulate. This verifies the grid-label data contract (Build Note #2) round-trips.

- [ ] **Step 5: Commit.**

```bash
git add templates/forms/facial.html
git commit -m "feat(facial): HTML sections 08-10 sensation/movement-grids/plan"
```

---

## Task 6: Picker grids + label/icon maps (registry-drift sites)

**Files:**
- Modify: `templates/home.html`, `templates/patient.html`, `templates/episode.html`

These are hardcoded and NOT driven by FORM_REGISTRY (RULES.md anti-repeat + FORM_PIPELINE step 1.5/1.6). Miss one → episode cards show raw "FACIAL".

- [ ] **Step 1: home.html picker card** (`:1087`). Change the `soon` card to active — remove `soon` class + "Soon" badge, add `onclick="selectForm(this)"`, and a name/sub like the SCI card (`:1076–1079`):

```html
      <div class="form-card" data-form="FACIAL" onclick="selectForm(this)">
        <div class="form-card-icon">&#128580;</div>
        <div class="form-card-name">Facial</div>
        <div class="form-card-sub">Bell's palsy, facial nerve</div>
      </div>
```
(Match the exact inner structure of the neighbouring active cards — copy SCI's card markup and swap text/icon/data-form.)

- [ ] **Step 2: home.html label maps.** `FORM_LABELS` const (`:1207–1210`) add `FACIAL:'Facial'`. Inline `formLabel` map (`:1922`) add `FACIAL:'Facial'`. Inline icon map (`:1923`) add `FACIAL:'&#128580;'`.

- [ ] **Step 3: patient.html picker card** (`:565`, `soon`). Same un-soon treatment, but handler is `selectEpForm(this)` (NOT selectForm). Copy patient.html's SCI card (`:554–557`) markup, swap text/icon/data-form.

- [ ] **Step 4: patient.html maps.** `form_labels` Jinja (`:475`) add `'FACIAL':'Facial'`. `form_icons` Jinja (`:476`) add `'FACIAL':'&#128580;'`.

- [ ] **Step 5: episode.html maps ×2** (`:787`, `:828`) — add `FACIAL:'Facial'` to both `formLabel` object literals.

- [ ] **Step 6: Verify all sites hit.**

Run: `grep -rn "MS:'Musculoskeletal'\|'MS':'Musculoskeletal'" templates/`
Then confirm every matched object also now contains a FACIAL key. (Expected hits: home.html ×2, patient.html ×1, episode.html ×2.)

- [ ] **Step 7: Smoke-test.** From home dashboard, the FACIAL card is no longer greyed and is clickable. Create a FACIAL episode → the episode card shows "Facial Assessment" with the 🙄 glyph, not "FACIAL". Same check from the patient page.

- [ ] **Step 8: Commit.**

```bash
git add templates/home.html templates/patient.html templates/episode.html
git commit -m "feat(facial): activate picker grids + label/icon maps (5 drift sites)"
```

---

# RUNG 2 — TEMPLATES (clinical_templates.js)

## Task 7: Best Statement templates (assessment arrays + SOAP variant)

**Files:**
- Modify: `static/js/clinical_templates.js` (add after SCI block `:548`)
- Modify: `templates/episode.html` `tplMap` (`:663`)

Author DISCRETE SMART statements (one per array entry) from `FACIAL_SPEC.md` STEP 6 source material — do NOT paste the vague category lines (bible Anti-Repeat rule on template arrays). Examples below are seed content; the build may refine wording with Miruya.

- [ ] **Step 1: Add `TEMPLATES.FACIAL`** (assessment categories: impression / stg / ltg / treatment) to `clinical_templates.js`, matching the structure used by `TEMPLATES.SCI` (`:548`):

```js
  // Facial palsy templates
  TEMPLATES.FACIAL = {
    impression: [
      'Weakness of right facial muscles secondary to facial nerve compression/injury (Bell\'s palsy).',
      'Reduced facial expression and oral competence affecting eating, speech and cosmesis.',
      'Pain and swelling in the [peri-auricular] region, possibly associated with ear pathology.'
    ],
    stg: [
      'Provide patient assurance and education within 1 session.',
      'Reduce facial pain to VAS ≤ 3/10 within 1 week.',
      'Reduce facial swelling within 1 week.',
      'Maintain facial muscle length and extensibility within 1 month.',
      'Initiate facial muscle re-education exercises within 1 month.'
    ],
    ltg: [
      'Improve facial symmetry and cosmetic appearance within 3 months.',
      'Regain functional control of right facial muscles within 3 months.',
      'Enable return to daily, work and social activities within 3 months.'
    ],
    treatment: [
      'Explanation and reassurance regarding Bell\'s palsy and expected recovery.',
      'Home programme: facial exercises 10 reps × 3/day, eye protection, avoid sleeping on affected side.',
      'PNF facial patterns and neuromuscular re-education.',
      'Ice stroking and brushing for facilitation.',
      'Soft tissue manipulation (STM) to affected muscles.'
    ]
  };
```

- [ ] **Step 2: Add `TEMPLATES.FACIAL_SOAP`** (SOAP categories: subjective / objective / analysis / plan):

```js
  TEMPLATES.FACIAL_SOAP = {
    subjective: [
      'Sudden onset of right facial weakness with pain behind the ear.',
      'Reports difficulty closing the right eye and drooling on the affected side.'
    ],
    objective: [
      'Right facial asymmetry with reduced movement on muscle testing (graded Poor/Fair).',
      'Reduced sensation to hot/cold/pin-prick over the affected facial area.'
    ],
    analysis: [
      'Right Bell\'s palsy with moderate irritability; functional and cosmetic impact.'
    ],
    plan: [
      'Reassurance and education; facial exercises, eye protection, use of straw.',
      'PNF, ice stroking, brushing, STM; facial exercises 10 reps × 3/day; handouts provided.'
    ]
  };
```

- [ ] **Step 3: Wire SOAP routing.** In `episode.html` `tplMap` (`:663`), add:

```js
    FACIAL: 'FACIAL_SOAP',
```

- [ ] **Step 4: Syntax-check.**

Run: `node --check static/js/clinical_templates.js`
Expected: exit 0 (a stray brace breaks the whole IIFE silently — JS Rules).

- [ ] **Step 5: Smoke-test.** On a FACIAL form, the assessment template buttons (Impression/STG/LTG/Treatment) insert statements. On the episode SOAP modal, the FACIAL SOAP templates populate. (If a button does nothing, the key is wrong — `show()` looks up `TEMPLATES[formType]` / `TEMPLATES[formType+'_SOAP']`.)

- [ ] **Step 6: Commit.**

```bash
git add static/js/clinical_templates.js templates/episode.html
git commit -m "feat(facial): Best Statement assessment + SOAP templates"
```

---

# RUNG 3 — PDF (pdf_facial.py)

## Task 8: pdf_facial.py — page-1 intake + page-2 grade tables

**Files:**
- Create: `pdf_facial.py`
- Modify: `app.py:62` (add `pdf_episode`/`pdf_single` keys), `pt_assessment.spec:22` (datas)

Follow `DESIGN_SYSTEM-pdf.md`. **Reference split (verified against the real files):**
- **PAGE-1 INTAKE → `pdf_ms.py` is the SOLE reference.** It is FACIAL's true structural twin: identical intake fields, same `two_col(left, right)` block sequence built from `box()` flowables. Mirror it exactly.
- **GRADE TABLES → `data_table()`**, the shared base primitive `pdf_ms.py` already uses for its movement table (`pdf_ms.py:125`). Do NOT borrow `pdf_sci.py`'s local `grid_table` — that is for greyed multi-state cells FACIAL doesn't have. Do NOT import `pair_box` (SCI-local, unpromoted, BACKLOG).
- **ENTRY-POINT SCAFFOLDING → identical in both files:** `generate_xxx_pdf(data)` returns `build_pdf(_build_story(data))`; `generate_episode_pdf(assessment_data, soap_notes, episode_info=None)` returns `generate_episode_pdf_base(_build_story, TITLE, REF, ...)`. Copy verbatim.
- `TITLE` is a **3-line LIST** (not a string). `page_header()`/`sign_chop_block()` return lists → use `story +=`. `patient_bar()`/`two_col()`/`box()`/`data_table()` return a single flowable → use `story.append()`. `ensure_dict()` (no leading underscore). Narrative tail uses the shared `plan_section(impression, stg, ltg, treatment)`, exactly as `pdf_ms.py:138`.

Build Note #1 depth rules apply: read `pain.pre`/`pain.post` and `sensation.hot`/`cold`/`pinPrick`/`notes` at nested depth; `nature`/`agg`/`ease`/`hrs24` are ARRAYS → comma-join.

- [ ] **Step 1: Write `pdf_facial.py`** (complete, real signatures — no placeholders):

```python
# pdf_facial.py — KKM Facial Assessment Form PDF (Platypus layout engine)
# KKM Ref: fisio / b.pen. 7 / Pind. 2 / 2019
# Page 1: MSK-style intake (two_col, mirrors pdf_ms.py). Page 2: facial + tongue grade tables.
# Build Note #1: pain + sensation are NESTED; nature/agg/ease/hrs24 are ARRAYS.

from reportlab.platypus import Paragraph, PageBreak
from pdf_platypus_base import (
    build_pdf, page_header, patient_bar,
    box, two_col, plan_section, sign_chop_block,
    data_table, gap,
    S_LABEL, S_NORMAL,
    CW, LW, RW,
    ensure_dict, generate_episode_pdf_base,
)

REF   = 'fisio / b.pen. 7 / Pind. 2 / 2019'
TITLE = ['KEMENTERIAN KESIHATAN MALAYSIA',
         'PHYSIOTHERAPY DEPARTMENT',
         'FACIAL ASSESSMENT FORM']


def _join(arr):
    """Multi-chip array -> comma-joined string."""
    if isinstance(arr, list):
        return ', '.join([str(v) for v in arr if v])
    return str(arr) if arr else ''


def _has_data(rows):
    """True if any row has a non-empty value cell (col index >= 1)."""
    return any(any(str(cell).strip() for cell in row[1:]) for row in rows)


def _grade_table(label, mov_rows):
    """Return [header, data_table, gap] for a grade grid, or [] if all grades blank."""
    rows = [[r.get('label', ''), r.get('grade', '')] for r in (mov_rows or [])]
    if not _has_data(rows):
        return []
    return [
        Paragraph(label, S_LABEL),
        data_table(['Movement', 'Grade'], rows, [CW * 0.78, CW * 0.22]),
        gap(2),
    ]


def _build_story(d):
    story   = []
    patient = ensure_dict(d.get('patient'))
    pain    = d.get('pain', {}) or {}
    sens    = d.get('sensation', {}) or {}

    # ── Header ──
    story += page_header(TITLE, REF)
    story.append(patient_bar(patient, REF))
    story.append(gap(2))

    # ── PAGE 1 — intake (two_col, mirrors pdf_ms.py) ──
    pain_content = [
        Paragraph(f'<b>PRE:</b> {pain.get("pre","0")}/10   <b>POST:</b> {pain.get("post","0")}/10', S_NORMAL),
        Paragraph(f'<b>Area:</b> {d.get("area","")}', S_NORMAL),
        Paragraph(f'<b>Nature:</b> {_join(d.get("nature"))}  {d.get("natureNotes","")}', S_NORMAL),
        Paragraph(f'<b>Agg:</b> {_join(d.get("agg"))}  {d.get("aggNotes","")}', S_NORMAL),
        Paragraph(f'<b>Ease:</b> {_join(d.get("ease"))}  {d.get("easeNotes","")}', S_NORMAL),
        Paragraph(f'<b>24 hrs:</b> {_join(d.get("hrs24"))}  {d.get("hrs24Notes","")}', S_NORMAL),
        Paragraph(f'<b>Irritability:</b> {d.get("irritability","")}', S_NORMAL),
    ]

    sq_content = [
        Paragraph(f'<b>General Health:</b> {d.get("generalHealth","")}', S_NORMAL),
        Paragraph(f'<b>PMHX / Surgery:</b> {d.get("pmhx","")}', S_NORMAL),
        Paragraph(f'<b>Investigations:</b> {d.get("investigations","")}', S_NORMAL),
        Paragraph(f'<b>Medication:</b> {d.get("medication","")}', S_NORMAL),
        Paragraph(f'<b>Occupation / Recreation:</b> {d.get("occupation","")}', S_NORMAL),
        Paragraph(f'<b>Social History:</b> {d.get("socialHistory","")}', S_NORMAL),
        Paragraph(f'<b>Hearing Aid / Pacemaker:</b> {d.get("hearingAidPacemaker","")}', S_NORMAL),
    ]

    sens_content = [
        Paragraph(f'<b>Hot:</b> {sens.get("hot","")}', S_NORMAL),
        Paragraph(f'<b>Cold:</b> {sens.get("cold","")}', S_NORMAL),
        Paragraph(f'<b>Pin-prick:</b> {sens.get("pinPrick","")}', S_NORMAL),
        Paragraph(f'<b>Notes:</b> {sens.get("notes","")}', S_NORMAL),
    ]

    left = [
        box('DIAGNOSIS', d.get('diagnosis', ''), width=LW),
        box("DOCTOR'S MANAGEMENT", d.get('doctorMgmt', ''), width=LW),
        box('PROBLEM', d.get('problem', ''), width=LW),
        box('PAIN SCORE', pain_content, width=LW),
        box('SPECIAL QUESTION', sq_content, width=LW),
    ]
    right = [
        box('CURRENT HISTORY', d.get('currentHistory', ''), width=RW),
        box('PAST HISTORY', d.get('pastHistory', ''), width=RW),
        box('OBSERVATION', d.get('observation', ''), width=RW),
        box('PALPATION', d.get('palpation', ''), width=RW),
        box('SENSATION TEST', sens_content, width=RW),
    ]
    story.append(two_col(left, right))
    story.append(PageBreak())

    # ── PAGE 2 — grade tables ──
    story += page_header(TITLE, REF)
    story.append(patient_bar(patient, REF))
    story.append(gap(3))

    side = d.get('affectedSide') or '—'
    story.append(Paragraph(f'MOVEMENT ASSESSMENT — Affected Side: {side}', S_LABEL))
    story.append(gap(1))
    story += _grade_table('FACIAL', d.get('facialMov'))
    story += _grade_table('TONGUE', d.get('tongueMov'))

    # ── Narrative tail (shared plan_section, like pdf_ms.py:138) ──
    story.append(plan_section(
        d.get('impression', ''), d.get('stg', ''),
        d.get('ltg', ''), d.get('planOfTreatment', ''),
    ))

    story += sign_chop_block()
    return story


def generate_facial_pdf(data):
    return build_pdf(_build_story(data))


def generate_episode_pdf(assessment_data, soap_notes, episode_info=None):
    return generate_episode_pdf_base(_build_story, TITLE, REF, assessment_data, soap_notes, episode_info)
```

> Before writing, read BOTH `pdf_ms.py` and `pdf_sci.py` top-to-bottom (done during planning — signatures above are verified against them, not invented). If `pdf_platypus_base` lacks any imported name, STOP and check the real export list — do not guess a primitive. Cross-check every `collect()` field has a render line here (the `neuro.muscles` silent-data-loss precedent).

- [ ] **Step 2: Add PDF keys to the registry row.** Edit `app.py:62` to its final form:

```python
    { 'id': 'FACIAL',      'label': 'Facial',             'icon': '&#128580;', 'badge': 'FC',  'group': 'Neurological',      'ready': True,  'pdf_episode': pdf_facial.generate_episode_pdf,    'pdf_single': pdf_facial.generate_facial_pdf       },
```
And add `import pdf_facial` with the other `pdf_*` imports at the top of `app.py`.

- [ ] **Step 3: Add to spec datas.** In `pt_assessment.spec`, after `('pdf_sci.py', '.')` (`:22`):

```python
        ('pdf_facial.py', '.'),
```

- [ ] **Step 4: Import check.**

Run: `py -c "from pdf_facial import generate_facial_pdf, generate_episode_pdf; print('ok')"`
Expected: `ok`, no ImportError.

- [ ] **Step 5: Render checks (realistic + sparse).**
  - Realistic: build a PDF from a fully-filled FACIAL record (use a saved DB record or a hand-built dict). Expected: no ReportLab "too large"/FrameError; both grade tables render; affected side in header; sign block on the last page.
  - Sparse: patient + diagnosis only. Expected: both grade tables SKIPPED (no "—"-filled table), no empty-section noise.

- [ ] **Step 6: Smoke-test via the app.** From a saved FACIAL episode, click **Export KKM PDF**. Confirm the PDF downloads and the KKM ref string reads exactly `fisio / b.pen. 7 / Pind. 2 / 2019`, typos preserved in movement labels.

- [ ] **Step 7: Commit.**

```bash
git add pdf_facial.py app.py pt_assessment.spec
git commit -m "feat(facial): pdf_facial.py + registry pdf keys + spec datas"
```

---

# RUNG 4 — MPIS (_buildMpisFacial in main.js)

## Task 9: MPIS SOAPIER builder + wire into switch

**Files:**
- Modify: `static/js/main.js` (add `_buildMpisFacial`, wire switch `:1039`)

Mirror `_buildMpisSci` (`:1878`) structure and HAND's SOAPIER layout (WORKFLOW MPIS pattern). Builder is PRIVATE, returns parts array, ZERO `copyText`/`await`. No public per-form wrapper. Build Note #1: read nested `pain`/`sensation`, flat everything else. Multi-chip arrays → comma-listed. Guard empty objective sub-blocks.

- [ ] **Step 1: Add `_buildMpisFacial`** near the other builders in `main.js` (before `copyToMpisAuto`). Reuse module-level `MPIS_DIV`/`MPIS_DASH` (`:19–21`) — never redeclare:

```js
  function _buildMpisFacial() {
    var d = window.ActiveForm ? window.ActiveForm.collect() : {};
    var p = d.patient || {};
    var DIV = MPIS_DIV, dash = MPIS_DASH;
    var parts = [];
    function line(label, val)  { if (val && String(val).trim()) parts.push(label + String(val).trim()); }
    function chips(label, arr) { if (arr && arr.length) parts.push(label + arr.join(', ')); }
    function grades(title, rows) {
      if (!rows || !rows.length) return;
      var body = [];
      rows.forEach(function (r) {
        if (r.grade && String(r.grade).trim()) body.push('  ' + r.label + '  :  ' + r.grade);
      });
      if (!body.length) return;
      parts.push(title);
      body.forEach(function (l) { parts.push(l); });
      parts.push('');
    }

    // ── Header ──
    parts.push('FACIAL ASSESSMENT');
    parts.push(DIV);
    parts.push('Name  : ' + (p.name||'') + '   Date : ' + (p.date||''));
    if (p.type === 'local') {
      parts.push('IC    : ' + (p.nric||'') + '   Age  : ' + (p.age||''));
    } else {
      parts.push('Passport : ' + (p.passport||'') + '   Country : ' + (p.country||'') + '   Age : ' + (p.age||''));
    }
    parts.push('Sex   : ' + (p.sex||''));
    parts.push('');

    // ── SUBJECTIVE ──
    parts.push(dash); parts.push('SUBJECTIVE ASSESSMENT'); parts.push('');
    line('Diagnosis        : ', d.diagnosis);
    line("Doctor's Mgmt    : ", d.doctorMgmt);
    line('Problem          : ', d.problem);
    var pain = d.pain || {};
    if (pain.pre || pain.post) {
      parts.push('');
      parts.push('PAIN SCORE (VAS)');
      parts.push('PRE: ' + (pain.pre||'0') + '/10   POST: ' + (pain.post||'0') + '/10');
    }
    line('Area             : ', d.area);
    chips('Nature           : ', d.nature);    line('  Nature notes   : ', d.natureNotes);
    chips('Aggravating      : ', d.agg);        line('  Agg notes      : ', d.aggNotes);
    chips('Easing           : ', d.ease);       line('  Ease notes     : ', d.easeNotes);
    chips('24 hrs           : ', d.hrs24);      line('  24hr notes     : ', d.hrs24Notes);
    line('Irritability     : ', d.irritability);
    parts.push('');
    line('Current History  : ', d.currentHistory);
    line('Past History     : ', d.pastHistory);
    if (d.generalHealth || d.pmhx || d.investigations || d.medication || d.occupation || d.socialHistory || d.hearingAidPacemaker) {
      parts.push('');
      parts.push('SPECIAL QUESTIONS');
      line('General Health   : ', d.generalHealth);
      line('PMHX / Surgery   : ', d.pmhx);
      line('Investigations   : ', d.investigations);
      line('Medication       : ', d.medication);
      line('Occupation       : ', d.occupation);
      line('Social History   : ', d.socialHistory);
      line('Hearing Aid/PM   : ', d.hearingAidPacemaker);
    }
    parts.push('');

    // ── OBJECTIVE ──
    var sens = d.sensation || {};
    var hasSens = sens.hot || sens.cold || sens.pinPrick || sens.notes;
    var hasMov  = (d.facialMov && d.facialMov.some(function(r){return r.grade;})) ||
                  (d.tongueMov && d.tongueMov.some(function(r){return r.grade;}));
    if (d.observation || d.palpation || hasSens || hasMov) {
      parts.push(dash); parts.push('OBJECTIVE ASSESSMENT'); parts.push('');
      line('Observation      : ', d.observation);
      line('Palpation        : ', d.palpation);
      if (hasSens) {
        parts.push('');
        parts.push('SENSATION TEST');
        line('Hot       : ', sens.hot);
        line('Cold      : ', sens.cold);
        line('Pin-prick : ', sens.pinPrick);
        line('Notes     : ', sens.notes);
      }
      if (hasMov) {
        parts.push('');
        parts.push('MOVEMENT  (Affected Side: ' + (d.affectedSide || '—') + ')');
        grades('FACIAL', d.facialMov);
        grades('TONGUE', d.tongueMov);
      }
      parts.push('');
    }

    // ── ANALYSIS ──
    if (d.impression) { parts.push(dash); parts.push('ANALYSIS'); parts.push(''); line('Impression : ', d.impression); parts.push(''); }

    // ── PLAN ──
    if (d.stg || d.ltg || d.planOfTreatment) {
      parts.push(dash); parts.push('PLAN'); parts.push('');
      line('STG  : ', d.stg);
      line('LTG  : ', d.ltg);
      line('Plan : ', d.planOfTreatment);
      parts.push('');
    }

    return parts;
  }
```

- [ ] **Step 2: Wire into the switch** (`main.js:1039`, after the SCI branch):

```js
    else if (formType === 'FACIAL')     parts = _buildMpisFacial();
```

- [ ] **Step 3: Syntax-check.**

Run: `node --check static/js/main.js`
Expected: exit 0.

- [ ] **Step 4: Cross-reference audit (Build Note #1 + WORKFLOW cross-ref rule).** Walk every key in `collect()` and confirm it appears in BOTH `pdf_facial.py` (Task 8) AND `_buildMpisFacial`. Make a literal checklist from the spec's collect() contract; tick each. Any field collected but not rendered = silent data loss (the `neuro.muscles` precedent).

- [ ] **Step 5: Smoke-test.** Fill a FACIAL form (incl. chips, grades, sensation), click **Copy to MPIS**. Paste into a text editor. Confirm SOAPIER sections appear, multi-chip fields are comma-listed, empty objective sub-blocks are omitted (not rendered as blank headers), and grades print under FACIAL/TONGUE with the affected side.

- [ ] **Step 6: Commit.**

```bash
git add static/js/main.js
git commit -m "feat(facial): _buildMpisFacial SOAPIER builder + wire into copyToMpisAuto"
```

---

# RUNG 5 — POLISH + BUILD

## Task 10: Final checklist sweep + build

**Files:** none new — verification + packaging.

- [ ] **Step 1: 13-step checklist audit.** Confirm every FORM_PIPELINE step done: registry ready=True ✓; home.html + patient.html pickers ✓; all 5 label maps ✓; FORM_TEMPLATES ✓; facial.html sections + extra_js ✓; form_facial.js with window.Form + `_form_type`+`meta` ✓; REQUIRED_FIELDS ✓; pdf_facial.py + pdf keys ✓; spec datas ✓; MPIS builder + switch ✓; clinical templates + tplMap ✓; `node --check` on all touched JS ✓.

- [ ] **Step 2: Orphan-code grep.** For each large block added to `main.js` and `form_facial.js`, grep the function name and read the whole function — confirm no unreachable code below a `return` (WORKFLOW discipline).

- [ ] **Step 3: Full clinical round-trip smoke-test (Miruya).** New patient → FACIAL episode → fill everything → Save → reload (grids/chips/side repopulate) → Copy to MPIS (looks right) → Export KKM PDF (looks right, ref string exact). This is the ship/no-ship gate.

- [ ] **Step 4: Build the exe.**

Run: `build.bat` (uses the `py` launcher — never bare `python`, per WORKFLOW).
Expected: clean PyInstaller build with `pdf_facial.py` bundled (confirm no missing-module warning for pdf_facial).

- [ ] **Step 5: Commit + log deferred items to BACKLOG.** Add a BACKLOG note: "Multi-select chip helper — 3 consumers now (NEURO local, FACIAL local copy). On a 3rd, promote `toggleChip/getChips/setChips` to FormBase (cf. pair_box promotion rule)." Also log the full-clickfest FACIAL-pilot follow-up (already in BACKLOG from the spec commit — confirm, don't duplicate).

```bash
git add BACKLOG.md
git commit -m "docs(facial): BACKLOG — chip-helper promotion trigger + clickfest pilot note"
```

---

## Self-Review (run against FACIAL_SPEC.md)

**Spec coverage:** every spec section mapped — Page-1 intake (Tasks 3–4), Page-2 grids (Task 5), classify/sequence section list (Tasks 3–5 sec 01–10), backbone grids (Task 2 configs + Task 5 containers), collect() contract (Task 2, full shape), templates STEP 6 (Task 7), PDF open-items (Task 8), MPIS (Task 9). Build Notes #1–#4 all addressed (#4 via the documented spec correction). KKM ref string exact in Task 8.

**Placeholder scan:** no `...` / TBD markers remain. Task 8's `pdf_facial.py` is now complete with real, file-verified signatures (`build_pdf`, `page_header`, `patient_bar`, `box`, `two_col`, `plan_section`, `data_table`, `gap`, `S_LABEL`, `S_NORMAL`, `CW`/`LW`/`RW`, `ensure_dict`, `generate_episode_pdf_base` — all confirmed exported and used identically in `pdf_ms.py`/`pdf_sci.py`). Entry points match the `pdf_episode`/`pdf_single` registry keys.

**Type consistency:** `collect()` keys in Task 2 match `populate()` (Task 2), `pdf_facial.py` reads (Task 8), and `_buildMpisFacial` reads (Task 9) — `pain.pre/post`, `sensation.hot/cold/pinPrick/notes`, `facialMov`/`tongueMov` row shape `{label,grade}`, `nature/agg/ease/hrs24` arrays + `*Notes`, `affectedSide`, `doctorMgmt`, `planOfTreatment`. Grid row label arrays are the single source (Task 2) and never re-typed elsewhere.
