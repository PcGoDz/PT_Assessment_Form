# Shared Table IIFEs + Geriatric Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract MMT, Investigation, and Medication tables into reusable IIFEs; make MovementTable joint lists configurable; fix Geriatric PDF crash and UI redundancies.

**Architecture:** Approach B — new IIFEs wired into NEURO and AMPUTATION immediately; MS deferred. Each IIFE mirrors the existing MovementTable pattern (init/getData/loadData/clear). No new dependencies — pure vanilla JS. PDF generators updated for new MMT dict schema with backward-compat for old positional-array records.

**Tech Stack:** Vanilla JS (IIFEs), Python/ReportLab (PDFs), Flask/Jinja2 (HTML). No build step — `node --check` for JS syntax validation.

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `pdf_geriatric.py` | Fix bc parsing, derive pain_site from markers |
| Modify | `static/js/form_geriatric.js` | Fix bodyChart format, remove pain_site/RN/Sex |
| Modify | `templates/forms/geriatric.html` | Remove RN/IC, Sex, pain-site fields |
| Modify | `static/js/movement_table.js` | Make JOINTS/PLANES/SIDES configurable at init |
| **Create** | `static/js/mmt_table.js` | Bilateral MMT IIFE (muscle \| R \| L) |
| Modify | `templates/forms/neuro.html` | Script tags, button IDs, init calls |
| Modify | `static/js/form_neuro.js` | Wire MmtTable + InvMedTable, remove inline |
| Modify | `pdf_neuro.py` | Read MMT dicts (with array backward compat) |
| Modify | `static/js/main.js` | Update NEURO + AMPUTATION MPIS for new MMT schema |
| Modify | `templates/forms/amputation.html` | Script tag, button ID, header, clear static rows |
| Modify | `static/js/form_amputation.js` | Wire MmtTable, remove inline MMT functions |
| Modify | `pdf_amputation.py` | Update MMT headers + keys for bilateral schema |
| **Create** | `static/js/inv_med_table.js` | InvMedTable IIFE (inv + med tables) |
| Modify | `templates/forms/neuro.html` | Script tag + button IDs for InvMedTable |
| Modify | `static/js/form_neuro.js` | Wire InvMedTable, remove inline inv/med functions |

---

## Task 1 — Geriatric PDF: fix bc parsing + derive pain_site

**Files:**
- Modify: `pdf_geriatric.py`

- [ ] **Step 1: Add `_ensure_dict` local helper and fix bc parsing**

In `pdf_geriatric.py`, replace lines 21–24:
```python
def _build_story(d):
    story   = []
    patient = d.get('patient', {})
    bc      = d.get('body_chart') or {}
```
With:
```python
def _ensure_dict(val):
    if isinstance(val, str):
        import json
        try: return json.loads(val)
        except: return {}
    return val if isinstance(val, dict) else {}

def _build_story(d):
    story   = []
    patient = _ensure_dict(d.get('patient'))
    bc      = _ensure_dict(d.get('bodyChart') or d.get('body_chart'))
```

- [ ] **Step 2: Replace pain_site with body chart marker derivation**

In `pdf_geriatric.py`, replace line 141:
```python
        Paragraph(f'<b>Pain Site:</b> {d.get("pain_site","")}', S_NORMAL),
```
With:
```python
        pain_sites = ', '.join(
            f"{m.get('zone','')} ({'Ant' if m.get('view')=='ant' else 'Post'})"
            for m in bc.get('markers', [])
        ) or '—'
        Paragraph(f'<b>Pain Site (Body Chart):</b> {pain_sites}', S_NORMAL),
```

- [ ] **Step 3: Restart Flask and export a Geriatric PDF — confirm no error**

```
Ctrl+C  →  python app.py
```
Open any Geriatric episode → Export KKM PDF → confirm PDF downloads without `'list' object has no attribute 'get'` error.

---

## Task 2 — Geriatric JS: fix bodyChart format, remove pain_site

**Files:**
- Modify: `static/js/form_geriatric.js`

- [ ] **Step 1: Fix bodyChart storage format in collect()**

Find the line:
```js
    d.body_chart  = (typeof BodyChart !== 'undefined') ? BodyChart.getData() : null;
```
Replace with:
```js
    d.bodyChart   = (typeof BodyChart !== 'undefined')
                  ? { markers: BodyChart.getData(), notes: gv('chart-notes') }
                  : null;
```

- [ ] **Step 2: Remove pain_site from collect()**

Find and delete the line that collects `pain_site` (it will be something like `d.pain_site = gv('pain-site');`). Remove it entirely.

- [ ] **Step 3: Fix bodyChart populate**

Find the line:
```js
    if (data.body_chart && typeof BodyChart !== 'undefined') BodyChart.setData(data.body_chart);
```
Replace with:
```js
    if (data.bodyChart && typeof BodyChart !== 'undefined') {
      BodyChart.loadData(data.bodyChart.markers || []);
      sv('chart-notes', data.bodyChart.notes || '');
    }
```

- [ ] **Step 4: Fix bodyChart reset**

Find the reset section and ensure it uses:
```js
    if (typeof BodyChart !== 'undefined') BodyChart.clearAll();
```
(If it already says `BodyChart.clearAll()` this step is done.)

- [ ] **Step 5: Remove pain_site from populate() and reset()**

Search `form_geriatric.js` for any `pain-site` or `pain_site` reference in populate or reset. Delete those lines.

- [ ] **Step 6: Syntax check**

```
node --check static/js/form_geriatric.js
```
Expected: no output (clean).

---

## Task 3 — Geriatric HTML: remove redundant fields

**Files:**
- Modify: `templates/forms/geriatric.html`

- [ ] **Step 1: Remove RN/IC field block**

Find the field block containing `id="pt-rn"` (around line 83). Remove the entire `<div class="field">` block:
```html
        <div class="field">
          <label>RN / IC</label>
          <input type="text" id="pt-rn" ...>
        </div>
```

- [ ] **Step 2: Remove Sex field block**

Find and remove the entire Sex section — includes both the read-only display input (`id="pt-sex-display"`) and the radio button group (`pt-sex-m` / `pt-sex-f`), around lines 65–70. Remove the entire wrapping `<div class="field">` block.

- [ ] **Step 3: Remove pain-site input**

Find the pain-site field around line 507:
```html
          <input type="text" id="pain-site" placeholder="Location of pain...">
```
Remove this line (and any wrapping `<div class="field">` / `<label>` block for pain site).

- [ ] **Step 4: Verify in browser**

Restart Flask, open a Geriatric form — confirm RN/IC, Sex, and Pain Site fields are gone from the UI. Body chart and pain score/nature fields should still be present.

- [ ] **Step 5: Commit Geriatric fixes**

```bash
git add pdf_geriatric.py static/js/form_geriatric.js templates/forms/geriatric.html
git commit -m "fix: geriatric PDF crash (bodyChart list→dict), remove redundant RN/Sex/pain-site fields"
```

---

## Task 4 — MovementTable: configurable joint/plane/side lists

**Files:**
- Modify: `static/js/movement_table.js`

- [ ] **Step 1: Replace module-level constants with init-time config**

In `movement_table.js`, the file currently opens with:
```js
const MovementTable = (function () {

  const JOINTS = [ ... ];
  const PLANES = [ ... ];
  const SIDES  = [ ... ];

  let rows = [];
  let rowCounter = 0;

  function init() {
    document.addEventListener('click', function(e) { ... });
    renderTable();
  }
```

Replace with:
```js
const MovementTable = (function () {

  const _DEFAULT_JOINTS = [
    'Shoulder joint', 'Glenohumeral joint', 'Acromioclavicular joint',
    'Elbow joint', 'Radioulnar joint', 'Wrist joint (radiocarpal)',
    'Carpometacarpal joint', 'Metacarpophalangeal joint', 'Interphalangeal joint',
    'Hip joint', 'Knee joint', 'Ankle joint (talocrural)',
    'Subtalar joint', 'Metatarsophalangeal joint',
    'Temporomandibular joint', 'Other (specify)'
  ];
  const _DEFAULT_PLANES = [
    'Flexion', 'Extension', 'Abduction', 'Adduction',
    'Internal rotation', 'External rotation',
    'Lateral flexion (L)', 'Lateral flexion (R)',
    'Pronation', 'Supination', 'Inversion', 'Eversion',
    'Opposition', 'All planes', 'Other (specify)'
  ];
  const _DEFAULT_SIDES = ['Right (affected)', 'Left (affected)', 'Right (unaffected)', 'Left (unaffected)', 'Bilateral'];

  var _joints = _DEFAULT_JOINTS;
  var _planes = _DEFAULT_PLANES;
  var _sides  = _DEFAULT_SIDES;

  let rows = [];
  let rowCounter = 0;

  function init(config) {
    _joints = (config && config.joints) || _DEFAULT_JOINTS;
    _planes = (config && config.planes) || _DEFAULT_PLANES;
    _sides  = (config && config.sides)  || _DEFAULT_SIDES;
    document.addEventListener('click', function(e) {
      if (e.target && e.target.id === 'mov-add-row') {
        e.preventDefault();
        addRow();
      }
    });
    renderTable();
  }
```

- [ ] **Step 2: Update makeSelect to use module variables**

Find all three `makeSelect(...)` calls that reference `JOINTS`, `PLANES`, `SIDES`. They are inside `renderTable()`. Change them to use `_joints`, `_planes`, `_sides`:
```js
        + '<td style="min-width:180px">' + makeSelect('joint', r.id, _joints, r.joint) + ...</td>'
        + '<td>' + makeSelect('side',  r.id, _sides,  r.side)  + '</td>'
        + '<td>' + makeSelect('plane', r.id, _planes, r.plane) + '</td>'
```

- [ ] **Step 3: Syntax check**

```
node --check static/js/movement_table.js
```
Expected: no output.

- [ ] **Step 4: Verify MS and SPINE ROM tables still work**

Restart Flask. Open a MS assessment form → confirm ROM table still renders and Add Row works. Open Spine form — same check. No args to `MovementTable.init()` must still work (defaults kick in).

- [ ] **Step 5: Commit**

```bash
git add static/js/movement_table.js
git commit -m "refactor: make MovementTable joint/plane/side lists configurable at init"
```

---

## Task 5 — Write mmt_table.js

**Files:**
- Create: `static/js/mmt_table.js`

- [ ] **Step 1: Create the file with full IIFE implementation**

```js
// mmt_table.js — reusable bilateral MMT table (muscle | R | L)

const MmtTable = (function () {

  var _containerId = 'mmt-tbody';
  var _muscles     = [];
  var _rows        = [];
  var _rowCounter  = 0;

  var GRADES = ['0','1','2','2+','3','3+','4','4+','5'];

  // ── Init ────────────────────────────────────────────────
  function init(config) {
    _containerId = (config && config.containerId) || 'mmt-tbody';
    _muscles     = (config && config.muscles)     || [];
    _rows        = [];
    _rowCounter  = 0;
    document.addEventListener('click', function (e) {
      if (e.target && e.target.id === 'mmt-add-row') {
        e.preventDefault();
        addRow();
      }
    });
    renderTable();
  }

  // ── Add / delete rows ────────────────────────────────────
  function addRow(prefill) {
    var id = _rowCounter++;
    _rows.push({
      id:     id,
      muscle: (prefill && prefill.muscle) || '',
      gradeR: (prefill && prefill.gradeR) || '',
      gradeL: (prefill && prefill.gradeL) || ''
    });
    renderTable();
  }

  function deleteRow(id) {
    _rows = _rows.filter(function (r) { return r.id !== id; });
    renderTable();
  }

  // ── Render ───────────────────────────────────────────────
  function renderTable() {
    var tbody = document.getElementById(_containerId);
    if (!tbody) return;

    if (!_rows.length) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-faint);'
        + 'font-style:italic;padding:12px;font-size:12px;">No muscles recorded — click Add Row</td></tr>';
      return;
    }

    tbody.innerHTML = _rows.map(function (r) {
      var muscleOpts = '<option value="">— Select —</option>'
        + _muscles.map(function (m) {
            return '<option value="' + m + '"' + (r.muscle === m ? ' selected' : '') + '>' + m + '</option>';
          }).join('');
      var gradeOptsR = '<option value="">—</option>'
        + GRADES.map(function (g) {
            return '<option value="' + g + '"' + (r.gradeR === g ? ' selected' : '') + '>' + g + '</option>';
          }).join('');
      var gradeOptsL = '<option value="">—</option>'
        + GRADES.map(function (g) {
            return '<option value="' + g + '"' + (r.gradeL === g ? ' selected' : '') + '>' + g + '</option>';
          }).join('');
      return '<tr data-rid="' + r.id + '">'
        + '<td style="min-width:160px"><select class="mmt-cell-input" data-field="muscle" data-rid="' + r.id + '" style="width:100%">'
          + muscleOpts + '</select></td>'
        + '<td><select class="mmt-cell-input" data-field="gradeR" data-rid="' + r.id + '" style="width:100%">'
          + gradeOptsR + '</select></td>'
        + '<td><select class="mmt-cell-input" data-field="gradeL" data-rid="' + r.id + '" style="width:100%">'
          + gradeOptsL + '</select></td>'
        + '<td><button class="mov-del-btn" onclick="MmtTable.deleteRow(' + r.id + ')">&#x2715;</button></td>'
        + '</tr>';
    }).join('');

    tbody.querySelectorAll('select').forEach(function (el) {
      el.addEventListener('change', function () { syncFromDOM(); });
    });
  }

  // ── Sync DOM → rows array ────────────────────────────────
  function syncFromDOM() {
    var tbody = document.getElementById(_containerId);
    if (!tbody) return;
    tbody.querySelectorAll('[data-rid][data-field]').forEach(function (el) {
      var rid   = parseInt(el.dataset.rid);
      var field = el.dataset.field;
      var row   = _rows.find(function (r) { return r.id === rid; });
      if (row && field) row[field] = el.value;
    });
  }

  // ── Public data API ──────────────────────────────────────
  function getData() {
    syncFromDOM();
    return _rows
      .filter(function (r) { return r.muscle || r.gradeR || r.gradeL; })
      .map(function (r) {
        return { muscle: r.muscle, gradeR: r.gradeR, gradeL: r.gradeL };
      });
  }

  function loadData(data) {
    _rows       = [];
    _rowCounter = 0;
    if (!data || !data.length) { renderTable(); return; }
    data.forEach(function (r) { addRow(r); });
  }

  function clear() {
    _rows       = [];
    _rowCounter = 0;
    renderTable();
  }

  return { init: init, addRow: addRow, deleteRow: deleteRow, getData: getData, loadData: loadData, clear: clear };

})();
```

- [ ] **Step 2: Syntax check**

```
node --check static/js/mmt_table.js
```
Expected: no output.

---

## Task 6 — Wire MmtTable into NEURO (HTML)

**Files:**
- Modify: `templates/forms/neuro.html`

- [ ] **Step 1: Add mmt_table.js script tag**

In the `{% block extra_js %}` section (around line 1053), add the script tag BEFORE `form_neuro.js`:
```html
{% block extra_js %}
<script src="{{ url_for('static', filename='js/mmt_table.js') }}"></script>
<script src="{{ url_for('static', filename='js/form_neuro.js') }}"></script>
```

- [ ] **Step 2: Change MMT add-row button to use ID instead of onclick**

Find line 662:
```html
    <button class="btn-ghost mt-1" onclick="NeuroForm.addMmtRow()">+ Add MMT Row</button>
```
Replace with:
```html
    <button class="btn-ghost mt-1" id="mmt-add-row">+ Add MMT Row</button>
```

- [ ] **Step 3: Add MmtTable.init() call in DOMContentLoaded block**

In the `<script>` block inside `{% block extra_js %}` (around line 1055), add the init call:
```html
<script>
document.addEventListener('DOMContentLoaded', function () {
  var NEURO_MUSCLES = [
    'Shoulder Flexors','Shoulder Abductors','Shoulder External Rotators',
    'Elbow Flexors','Elbow Extensors','Wrist Extensors','Wrist Flexors',
    'Finger Extensors','Finger Flexors','Grip Strength',
    'Hip Flexors','Hip Extensors','Hip Abductors','Hip Adductors',
    'Knee Extensors','Knee Flexors','Ankle Dorsiflexors','Ankle Plantarflexors',
    'Core / Trunk','Other'
  ];
  MmtTable.init({ containerId: 'mmt-tbody', muscles: NEURO_MUSCLES });

  var FM = 'NEURO';
  ClinicalTemplates.addButton('pt-impression-bsf', FM, 'impression_bsf');
  ClinicalTemplates.addButton('pt-impression-al',  FM, 'impression_al');
  ClinicalTemplates.addButton('pt-impression-pr',  FM, 'impression_pr');
  ClinicalTemplates.addButton('stg',               FM, 'stg');
  ClinicalTemplates.addButton('ltg',               FM, 'ltg');
  ClinicalTemplates.addButton('plan-notes',        FM, 'plan');
});
</script>
```

---

## Task 7 — Wire MmtTable into NEURO (JS)

**Files:**
- Modify: `static/js/form_neuro.js`

- [ ] **Step 1: Remove inline MMT functions**

Delete the following functions entirely from `form_neuro.js`:
- `var MMT_MUSCLES = [...]` (lines 144–151)
- `function addMmtRow() { ... }` (lines 153–167)

- [ ] **Step 2: Replace MMT collect call**

In `collect()`, find:
```js
      mmt:        collectTable('mmt-tbody'),
```
Replace with:
```js
      mmt:        MmtTable.getData(),
```

- [ ] **Step 3: Replace MMT populate call**

In `populate()`, find:
```js
    restoreTable('mmt-tbody', d.mmt, addMmtRow);
```
Replace with:
```js
    MmtTable.loadData(d.mmt);
```

- [ ] **Step 4: Replace MMT reset**

In `reset()`, find:
```js
    ['investigation-tbody','medication-tbody','mmt-tbody','rom-tbody'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.innerHTML = '';
    });
```
Replace with:
```js
    MmtTable.clear();
    ['investigation-tbody','medication-tbody','rom-tbody'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.innerHTML = '';
    });
```

- [ ] **Step 5: Remove addMmtRow from public API**

In the `return { ... }` at the bottom of `NeuroForm`, remove:
```js
    addMmtRow:           addMmtRow,
```

- [ ] **Step 6: Syntax check**

```
node --check static/js/form_neuro.js
```
Expected: no output.

---

## Task 8 — Update NEURO PDF for new MMT schema

**Files:**
- Modify: `pdf_neuro.py`

- [ ] **Step 1: Update MMT parsing to handle both dict (new) and list (old) records**

In `pdf_neuro.py`, find (around line 254):
```python
    mmt = d.get('mmt', [])
    if mmt:
        mmt_data = [[
            Paragraph(str(r[0]) if len(r) > 0 else '', S_SMALL),
            Paragraph(str(r[1]) if len(r) > 1 else '', S_SMALL),
            Paragraph(str(r[2]) if len(r) > 2 else '', S_SMALL),
        ] for r in mmt]
        mmt_t = mini_table(
            [Paragraph('<b>Muscle Group</b>', S_SMALL), Paragraph('<b>R</b>', S_SMALL), Paragraph('<b>L</b>', S_SMALL)],
            mmt_data,
            [0.65, 0.175, 0.175],
            CW
        )
        story += [Paragraph('<b>MUSCLE STRENGTH (MMT)</b>', S_BOLD), gap(1), mmt_t, gap(2)]
```
Replace with:
```python
    mmt = d.get('mmt', [])
    if mmt:
        def _mmt_val(r, key, idx):
            if isinstance(r, dict): return str(r.get(key, '') or '')
            if isinstance(r, list) and len(r) > idx: return str(r[idx])
            return ''
        mmt_data = [[
            Paragraph(_mmt_val(r, 'muscle', 0), S_SMALL),
            Paragraph(_mmt_val(r, 'gradeR', 1), S_SMALL),
            Paragraph(_mmt_val(r, 'gradeL', 2), S_SMALL),
        ] for r in mmt if r]
        mmt_t = mini_table(
            [Paragraph('<b>Muscle Group</b>', S_SMALL), Paragraph('<b>R</b>', S_SMALL), Paragraph('<b>L</b>', S_SMALL)],
            mmt_data,
            [0.65, 0.175, 0.175],
            CW
        )
        story += [Paragraph('<b>MUSCLE STRENGTH (MMT)</b>', S_BOLD), gap(1), mmt_t, gap(2)]
```

- [ ] **Step 2: Restart Flask and test NEURO PDF export**

Open a NEURO episode with MMT data → Export KKM PDF → confirm MMT table renders in PDF.

---

## Task 9 — Update NEURO MPIS for new MMT schema

**Files:**
- Modify: `static/js/main.js`

- [ ] **Step 1: Update copyToMpisNeuro MMT formatter**

In `main.js`, find (around line 1200):
```js
    if (data.mmt && data.mmt.length) {
      parts.push(dash); parts.push('MANUAL MUSCLE TESTING');
      data.mmt.forEach(function(r) {
        if (r[0]) parts.push('  ' + r[0] + ' — R: ' + (r[1]||'—') + '  L: ' + (r[2]||'—'));
      });
      parts.push('');
    }
```
Replace with:
```js
    if (data.mmt && data.mmt.length) {
      parts.push(dash); parts.push('MANUAL MUSCLE TESTING');
      data.mmt.forEach(function(r) {
        var muscle = (typeof r === 'object' && !Array.isArray(r)) ? r.muscle : r[0];
        var gradeR = (typeof r === 'object' && !Array.isArray(r)) ? r.gradeR : r[1];
        var gradeL = (typeof r === 'object' && !Array.isArray(r)) ? r.gradeL : r[2];
        if (muscle) parts.push('  ' + muscle + ' — R: ' + (gradeR||'—') + '  L: ' + (gradeL||'—'));
      });
      parts.push('');
    }
```

- [ ] **Step 2: Test NEURO Copy to MPIS**

Open a NEURO assessment with MMT data → Copy to MPIS → confirm MMT section appears in copied text.

- [ ] **Step 3: Commit NEURO MmtTable wiring**

```bash
git add templates/forms/neuro.html static/js/form_neuro.js pdf_neuro.py static/js/main.js
git commit -m "feat: wire MmtTable IIFE into NEURO — replaces inline addMmtRow"
```

---

## Task 10 — Wire MmtTable into AMPUTATION (HTML)

**Files:**
- Modify: `templates/forms/amputation.html`

- [ ] **Step 1: Add mmt_table.js script tag**

In `{% block extra_js %}` (around line 762), add before `form_amputation.js`:
```html
{% block extra_js %}
<script src="/static/js/mmt_table.js"></script>
<script src="/static/js/form_amputation.js"></script>
```

- [ ] **Step 2: Update MMT table header from Side/Grade/Comments to R/L**

Find the MMT table `<thead>` (around line 573):
```html
            <thead>
              <tr>
                <th style="min-width:180px;">Muscle Group</th>
                <th style="min-width:80px;">Side</th>
                <th style="min-width:80px;">Grade (0–5)</th>
                <th style="min-width:160px;">Comments</th>
              </tr>
            </thead>
```
Replace with:
```html
            <thead>
              <tr>
                <th style="min-width:180px;">Muscle Group</th>
                <th style="min-width:80px;">R</th>
                <th style="min-width:80px;">L</th>
                <th></th>
              </tr>
            </thead>
```

- [ ] **Step 3: Clear all hardcoded tbody rows**

Find the `<tbody id="mmt-tbody">` block (lines 581–586). It contains 4 hardcoded `<tr>` rows. Replace the entire tbody content with an empty tbody — MmtTable will render into it:
```html
            <tbody id="mmt-tbody"></tbody>
```

- [ ] **Step 4: Change add-row button to use ID**

Find (line 589):
```html
        <button class="mov-add-btn" onclick="AmputationForm.addMmtRow()">+ Add row</button>
```
Replace with:
```html
        <button class="mov-add-btn" id="mmt-add-row">+ Add row</button>
```

- [ ] **Step 5: Add MmtTable.init() in DOMContentLoaded block**

In the `<script>` block of `{% block extra_js %}`, add:
```html
<script>
document.addEventListener('DOMContentLoaded', function () {
  var AMP_MUSCLES = [
    'Hip Flexors','Hip Extensors','Hip Abductors','Hip Adductors',
    'Hip External Rotators','Knee Extensors','Knee Flexors','Ankle Dorsiflexors',
    'Ankle Plantarflexors','Shoulder Flexors','Shoulder Abductors',
    'Elbow Flexors','Elbow Extensors','Core / Trunk','Other'
  ];
  MmtTable.init({ containerId: 'mmt-tbody', muscles: AMP_MUSCLES });

  var FM = 'AMPUTATION';
  ClinicalTemplates.addButton('obs-general',       FM, 'observation');
  ClinicalTemplates.addButton('obs-stump-condition',FM, 'observation');
  ClinicalTemplates.addButton('palpation',         FM, 'palpation');
  ClinicalTemplates.addButton('pt-impression',     FM, 'impression');
  ClinicalTemplates.addButton('short-term-goals',  FM, 'stg');
  ClinicalTemplates.addButton('long-term-goals',   FM, 'ltg');
  ClinicalTemplates.addButton('plan-of-treatment', FM, 'treatment');
});
</script>
```

---

## Task 11 — Wire MmtTable into AMPUTATION (JS)

**Files:**
- Modify: `static/js/form_amputation.js`

- [ ] **Step 1: Remove inline MMT functions**

Delete the following from `form_amputation.js`:
- `var MMT_MUSCLES = [...]` (lines 67–70)
- `function addMmtRow() { ... }` (lines 72–84)
- `function collectMmt() { ... }` (lines 122–139)
- `function populateMmt(mmt) { ... }` (lines 141–156)

- [ ] **Step 2: Replace MMT collect call**

In `collect()`, find:
```js
    d.mmt                 = collectMmt();
```
Replace with:
```js
    d.mmt                 = MmtTable.getData();
```

- [ ] **Step 3: Replace MMT populate call**

In `populate()`, find:
```js
    populateMmt(data.mmt);
```
Replace with:
```js
    MmtTable.loadData(data.mmt);
```

- [ ] **Step 4: Replace MMT reset**

In `reset()`, find:
```js
    document.querySelectorAll('#mmt-tbody select, #mmt-tbody input').forEach(function(el) { el.value = ''; });
```
Replace with:
```js
    MmtTable.clear();
```

- [ ] **Step 5: Remove addMmtRow from public API**

In `var api = { ... }`, find and remove:
```js
    addMmtRow:          addMmtRow,
```

- [ ] **Step 6: Syntax check**

```
node --check static/js/form_amputation.js
```
Expected: no output.

---

## Task 12 — Update AMPUTATION PDF for bilateral MMT schema

**Files:**
- Modify: `pdf_amputation.py`

- [ ] **Step 1: Update MMT table headers and key reads**

In `pdf_amputation.py`, find (around line 232):
```python
            mmt_rows = [[Paragraph('<b>Muscle Group</b>', S_SMALL),
                         Paragraph('<b>Side</b>', S_SMALL),
                         Paragraph('<b>Grade</b>', S_SMALL),
                         Paragraph('<b>Comments</b>', S_SMALL)]]
            for m in mmt_data:
                if isinstance(m, dict) and (m.get('muscle') or m.get('grade')):
                    mmt_rows.append([
                        Paragraph(m.get('muscle',''), S_SMALL),
                        Paragraph(m.get('side',''),   S_SMALL),
                        Paragraph(m.get('grade',''),  S_SMALL),
                        Paragraph(m.get('comment',''),S_SMALL),
                    ])
            while len(mmt_rows) < 5:
                mmt_rows.append([Paragraph('', S_SMALL)] * 4)
            mmt_inner = Table(mmt_rows,
                colWidths=[INN*0.44, INN*0.10, INN*0.10, INN*0.36],
```
Replace with:
```python
            mmt_rows = [[Paragraph('<b>Muscle Group</b>', S_SMALL),
                         Paragraph('<b>R</b>', S_SMALL),
                         Paragraph('<b>L</b>', S_SMALL)]]
            for m in mmt_data:
                if isinstance(m, dict) and m.get('muscle'):
                    mmt_rows.append([
                        Paragraph(m.get('muscle',''),  S_SMALL),
                        Paragraph(m.get('gradeR', m.get('grade','')), S_SMALL),
                        Paragraph(m.get('gradeL',''),  S_SMALL),
                    ])
            while len(mmt_rows) < 5:
                mmt_rows.append([Paragraph('', S_SMALL)] * 3)
            mmt_inner = Table(mmt_rows,
                colWidths=[INN*0.64, INN*0.18, INN*0.18],
```

- [ ] **Step 2: Confirm full 3-column Table block is complete**

Your replacement in Step 1 must include the complete Table call. Verify the full block reads:
```python
            mmt_inner = Table(mmt_rows,
                colWidths=[INN*0.64, INN*0.18, INN*0.18],
                style=TableStyle([
                    ('INNERGRID',    (0,0), (-1,-1), 0.3, LGREY),
                    ('FONTSIZE',     (0,0), (-1,-1), 6.5),
                    ('TOPPADDING',   (0,0), (-1,-1), 2),
                    ('BOTTOMPADDING',(0,0), (-1,-1), 2),
                    ('LEFTPADDING',  (0,0), (-1,-1), 3),
                    ('RIGHTPADDING', (0,0), (-1,-1), 3),
                ]))
```
The `(-1,-1)` indexing is relative so it's safe for 3 or 4 columns — no other change needed in the style.

- [ ] **Step 3: Restart Flask and test AMPUTATION PDF**

Open an Amputation episode → Export KKM PDF → confirm MMT table shows "Muscle Group | R | L" headers and data renders.

---

## Task 13 — Update AMPUTATION MPIS for new MMT schema

**Files:**
- Modify: `static/js/main.js`

- [ ] **Step 1: Update copyToMpisAmputation MMT formatter**

In `main.js`, find (around line 1035):
```js
    if (data.mmt && data.mmt.length) {
      parts.push(dash); parts.push('MANUAL MUSCLE TESTING');
      data.mmt.forEach(function(m) {
        if (m.muscle || m.grade) {
          parts.push('  ' + (m.muscle||'—') + ' (' + (m.side||'—') + ') : ' + (m.grade||'—') +
            (m.comment ? '  — ' + m.comment : ''));
        }
      });
      parts.push('');
    }
```
Replace with:
```js
    if (data.mmt && data.mmt.length) {
      parts.push(dash); parts.push('MANUAL MUSCLE TESTING');
      data.mmt.forEach(function(m) {
        if (m.muscle || m.gradeR || m.gradeL) {
          parts.push('  ' + (m.muscle||'—') + ' — R: ' + (m.gradeR||'—') + '  L: ' + (m.gradeL||'—'));
        }
      });
      parts.push('');
    }
```

- [ ] **Step 2: Test AMPUTATION Copy to MPIS**

Open an Amputation assessment with MMT data → Copy to MPIS → confirm MMT section appears.

- [ ] **Step 3: Commit AMPUTATION MmtTable wiring**

```bash
git add templates/forms/amputation.html static/js/form_amputation.js pdf_amputation.py static/js/main.js static/js/mmt_table.js
git commit -m "feat: wire MmtTable IIFE into AMPUTATION — unified bilateral schema (R/L)"
```

---

## Task 14 — Write inv_med_table.js

**Files:**
- Create: `static/js/inv_med_table.js`

- [ ] **Step 1: Create the file with full IIFE implementation**

```js
// inv_med_table.js — Investigation and Medication dynamic row tables

const InvMedTable = (function () {

  var INV_TYPES = ['CT scan','MRI','Angiogram','X-ray','Blood test','ECG','Other'];

  // ── Init ────────────────────────────────────────────────
  function init() {
    document.addEventListener('click', function (e) {
      if (e.target && e.target.id === 'inv-add-row') { e.preventDefault(); addInvRow(); }
      if (e.target && e.target.id === 'med-add-row') { e.preventDefault(); addMedRow(); }
    });
  }

  // ── Add rows ─────────────────────────────────────────────
  function _appendRow(tbodyId, html) {
    var tb = document.getElementById(tbodyId);
    if (!tb) return;
    var tr = document.createElement('tr');
    tr.innerHTML = html;
    tb.appendChild(tr);
  }

  function addInvRow(prefill) {
    var typeOpts = INV_TYPES.map(function (t) {
      return '<option value="' + t + '"' + (prefill && prefill[0] === t ? ' selected' : '') + '>' + t + '</option>';
    }).join('');
    _appendRow('investigation-tbody',
      '<td><select style="width:100%"><option value="">— Type —</option>' + typeOpts + '</select></td>'
      + '<td><input type="date" style="width:100%"' + (prefill && prefill[1] ? ' value="' + prefill[1] + '"' : '') + '></td>'
      + '<td><input type="text" placeholder="Key findings..." style="width:100%"'
        + (prefill && prefill[2] ? ' value="' + prefill[2].replace(/"/g,'&quot;') + '"' : '') + '></td>'
      + '<td><button class="btn-ghost btn-sm" onclick="this.closest(\'tr\').remove()">&#x2715;</button></td>'
    );
  }

  function addMedRow(prefill) {
    _appendRow('medication-tbody',
      '<td><input type="text" placeholder="Medication name..." style="width:100%"'
        + (prefill && prefill[0] ? ' value="' + prefill[0].replace(/"/g,'&quot;') + '"' : '') + '></td>'
      + '<td><input type="text" placeholder="Dose..." style="width:100%"'
        + (prefill && prefill[1] ? ' value="' + prefill[1].replace(/"/g,'&quot;') + '"' : '') + '></td>'
      + '<td><input type="text" placeholder="Frequency..." style="width:100%"'
        + (prefill && prefill[2] ? ' value="' + prefill[2].replace(/"/g,'&quot;') + '"' : '') + '></td>'
      + '<td><button class="btn-ghost btn-sm" onclick="this.closest(\'tr\').remove()">&#x2715;</button></td>'
    );
  }

  // ── Collect ──────────────────────────────────────────────
  function _collectTbody(tbodyId) {
    var rows = [];
    var tb   = document.getElementById(tbodyId);
    if (!tb) return rows;
    tb.querySelectorAll('tr').forEach(function (tr) {
      var cells = tr.querySelectorAll('input, select');
      var row   = [];
      cells.forEach(function (c) { row.push(c.value); });
      rows.push(row);
    });
    return rows;
  }

  function getData() {
    return {
      investigations: _collectTbody('investigation-tbody'),
      medications:    _collectTbody('medication-tbody')
    };
  }

  // ── Load / clear ─────────────────────────────────────────
  function loadData(data) {
    var invTb = document.getElementById('investigation-tbody');
    var medTb = document.getElementById('medication-tbody');
    if (invTb) invTb.innerHTML = '';
    if (medTb) medTb.innerHTML = '';
    if (data && data.investigations) data.investigations.forEach(function (r) { addInvRow(r); });
    if (data && data.medications)    data.medications.forEach(function (r)    { addMedRow(r); });
  }

  function clear() {
    loadData({ investigations: [], medications: [] });
  }

  return { init: init, addInvRow: addInvRow, addMedRow: addMedRow, getData: getData, loadData: loadData, clear: clear };

})();
```

- [ ] **Step 2: Syntax check**

```
node --check static/js/inv_med_table.js
```
Expected: no output.

---

## Task 15 — Wire InvMedTable into NEURO (HTML)

**Files:**
- Modify: `templates/forms/neuro.html`

- [ ] **Step 1: Add inv_med_table.js script tag**

In `{% block extra_js %}`, add `inv_med_table.js` alongside `mmt_table.js` (both before `form_neuro.js`):
```html
{% block extra_js %}
<script src="{{ url_for('static', filename='js/mmt_table.js') }}"></script>
<script src="{{ url_for('static', filename='js/inv_med_table.js') }}"></script>
<script src="{{ url_for('static', filename='js/form_neuro.js') }}"></script>
```

- [ ] **Step 2: Change investigation add-row button to use ID**

Find (line 245):
```html
        <button class="btn-ghost mt-1" onclick="NeuroForm.addInvestigationRow()">+ Add Investigation</button>
```
Replace with:
```html
        <button class="btn-ghost mt-1" id="inv-add-row">+ Add Investigation</button>
```

- [ ] **Step 3: Change medication add-row button to use ID**

Find (line 253):
```html
        <button class="btn-ghost mt-1" onclick="NeuroForm.addMedicationRow()">+ Add Medication</button>
```
Replace with:
```html
        <button class="btn-ghost mt-1" id="med-add-row">+ Add Medication</button>
```

- [ ] **Step 4: Add InvMedTable.init() to DOMContentLoaded block**

In the `<script>` init block (already modified in Task 6), add `InvMedTable.init()`:
```js
  MmtTable.init({ containerId: 'mmt-tbody', muscles: NEURO_MUSCLES });
  InvMedTable.init();
```

---

## Task 16 — Wire InvMedTable into NEURO (JS)

**Files:**
- Modify: `static/js/form_neuro.js`

- [ ] **Step 1: Remove inline investigation and medication functions**

Delete the following functions entirely from `form_neuro.js`:
- `function addInvestigationRow() { ... }` (lines 117–130)
- `function addMedicationRow() { ... }` (lines 132–142)

- [ ] **Step 2: Replace inv/med collect calls**

In `collect()`, find:
```js
      investigations: collectTable('investigation-tbody'),
      medications:    collectTable('medication-tbody'),
```
Replace with:
```js
      investigations: InvMedTable.getData().investigations,
      medications:    InvMedTable.getData().medications,
```

- [ ] **Step 3: Replace inv/med populate calls**

In `populate()`, find:
```js
    restoreTable('investigation-tbody', d.investigations, addInvestigationRow);
    restoreTable('medication-tbody',    d.medications,    addMedicationRow);
```
Replace with:
```js
    InvMedTable.loadData({ investigations: d.investigations, medications: d.medications });
```

- [ ] **Step 4: Replace inv/med reset**

In `reset()`, find:
```js
    MmtTable.clear();
    ['investigation-tbody','medication-tbody','rom-tbody'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.innerHTML = '';
    });
```
Replace with:
```js
    MmtTable.clear();
    InvMedTable.clear();
    var romTb = document.getElementById('rom-tbody');
    if (romTb) romTb.innerHTML = '';
```

- [ ] **Step 5: Remove addInvestigationRow and addMedicationRow from public API**

In the `return { ... }` at the bottom of `NeuroForm`, remove:
```js
    addInvestigationRow: addInvestigationRow,
    addMedicationRow:    addMedicationRow,
```

- [ ] **Step 6: Check if collectTable and restoreTable are still needed**

After all replacements, `collectTable` and `restoreTable` are still used for `rom-tbody`. Do NOT delete them.

- [ ] **Step 7: Syntax check**

```
node --check static/js/form_neuro.js
```
Expected: no output.

- [ ] **Step 8: Full NEURO smoke test**

Restart Flask. Open NEURO form:
1. Add 2 investigation rows, 2 medication rows, 2 MMT rows
2. Click **Save Record** — confirm 200 response, no 422
3. Reload page (or navigate away and back) — confirm all rows repopulate correctly
4. Click **Export KKM PDF** — confirm PDF downloads and shows investigation, medication, MMT tables
5. Click **Clear** — confirm all three tables reset to empty state

- [ ] **Step 9: Commit InvMedTable NEURO wiring**

```bash
git add static/js/inv_med_table.js templates/forms/neuro.html static/js/form_neuro.js
git commit -m "feat: wire InvMedTable IIFE into NEURO — replaces inline addInvestigationRow/addMedicationRow"
```

---

## Final Verification Checklist

Run through each form before closing the session:

- [ ] **Geriatric** — PDF exports without error; RN/IC, Sex, Pain Site fields absent from UI; body chart markers appear as Pain Site in PDF
- [ ] **MS** — ROM table still works (MovementTable with no-arg init); MMT inline functions untouched (Approach B)
- [ ] **Spine** — ROM table still works
- [ ] **NEURO** — Save, load, export PDF, Copy to MPIS all work for MMT + Inv + Med tables
- [ ] **AMPUTATION** — Save, load, export PDF, Copy to MPIS all work for MMT table; bilateral R/L shows in PDF
- [ ] `node --check` passes on: `movement_table.js`, `mmt_table.js`, `inv_med_table.js`, `form_neuro.js`, `form_amputation.js`, `form_geriatric.js`
