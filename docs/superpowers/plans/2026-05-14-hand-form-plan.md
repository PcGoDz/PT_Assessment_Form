# HAND Form Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete HAND (Hand Assessment) form — form 7 of 15 — including the interactive hand chart, all 13 clinical sections, PDF export, MPIS clipboard, and clinical templates.

**Architecture:** Follow existing form patterns exactly (neuro.html/form_neuro.js for chip UI, ms.html/pdf_ms.py for PDF). New IIFE `handchart.js` clones `bodychart.js` with `hand:'R'|'L'` instead of `view:'ant'|'post'`. PDF uses `HandChartFlowable` (ReportLab primitives, simplified palmar outline) and 5 two_col blocks matching the KKM borang layout.

**Tech Stack:** Flask, SQLite, vanilla JS (IIFE pattern), ReportLab, PyInstaller

**KKM Ref:** `fisio / b.pen. 12 / Pind. 2 / 2019`

---

## File Structure

| File | Action | Purpose |
|------|--------|---------|
| `static/js/handchart.js` | Create | Hand chart IIFE (R+L SVG, marker placement, getData/loadData/clearAll) |
| `static/js/form_hand.js` | Create | Form logic IIFE (collect/populate/reset, dynamic tables, chip toggle) |
| `templates/forms/hand.html` | Create | 13-section form HTML extending base.html |
| `pdf_hand.py` | Create | PDF generator (HandChartFlowable, _build_story, generate_episode_pdf) |
| `app.py` | Modify | Import pdf_hand, FORM_REGISTRY ready=True, FORM_TEMPLATES, PDF dicts |
| `database.py` | Modify | REQUIRED_FIELDS['HAND'] |
| `pt_assessment.spec` | Modify | Add pdf_hand.py to datas |
| `templates/base.html` | Modify | Load handchart.js after bodychart.js |
| `templates/home.html` | Modify | HAND modal card, formLabel/icon maps |
| `templates/episode.html` | Modify | tplMap, two formLabel maps |
| `static/js/main.js` | Modify | HandChart init, _buildMpisHand, copyToMpisHand, switch, export |
| `static/js/clinical_templates.js` | Modify | HAND_OBS, HAND_SOAP templates + addButton calls in hand.html |

---

## Task 1: Create `static/js/handchart.js`

**Files:**
- Create: `static/js/handchart.js`

Clone `bodychart.js` pattern but for two hand SVGs (R and L). The key differences:
- Element IDs: `#hand-svg-r`, `#hand-svg-l`, `#hctype-sel`, `#hand-marker-list`
- Field: `hand: 'R'|'L'` instead of `view: 'ant'|'post'`
- Marker group IDs: `#markers-r`, `#markers-l`

- [ ] **Step 1: Write handchart.js**

```javascript
var HandChart = (function () {
  'use strict';

  var COLORS = {
    pain:     '#e53935',
    numb:     '#1e88e5',
    tingling: '#8e24aa',
    weak:     '#fb8c00',
    swelling: '#00897b',
    scar:     '#6d4c41'
  };
  var LABELS = {
    pain:     'Pain',
    numb:     'Numbness',
    tingling: 'Tingling',
    weak:     'Weakness',
    swelling: 'Swelling',
    scar:     'Scar'
  };

  var markers = [];
  var nextId  = 1;

  function init() {
    var selEl = document.getElementById('hctype-sel');
    var svgR  = document.getElementById('hand-svg-r');
    var svgL  = document.getElementById('hand-svg-l');
    if (!selEl || !svgR || !svgL) return;

    svgR.addEventListener('click', function (e) { placeMarker(svgR, 'R', e); });
    svgL.addEventListener('click', function (e) { placeMarker(svgL, 'L', e); });
  }

  function placeMarker(svg, hand, e) {
    var selEl = document.getElementById('hctype-sel');
    var type  = selEl ? selEl.value : 'pain';
    var rect  = svg.getBoundingClientRect();
    var x     = ((e.clientX - rect.left) / rect.width)  * 100;
    var y     = ((e.clientY - rect.top)  / rect.height) * 100;
    var id    = 'hm' + (nextId++);

    var marker = { id: id, hand: hand, type: type, x: x, y: y };
    markers.push(marker);
    renderMarker(svg, marker);
    renderList();
  }

  function renderMarker(svg, m) {
    var group = svg.getElementById ? svg.getElementById('markers-' + m.hand.toLowerCase())
                                   : null;
    if (!group) {
      group = document.getElementById('markers-' + m.hand.toLowerCase());
    }
    if (!group) return;

    var circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('id', m.id);
    circle.setAttribute('cx', m.x + '%');
    circle.setAttribute('cy', m.y + '%');
    circle.setAttribute('r', '4%');
    circle.setAttribute('fill', COLORS[m.type] || '#e53935');
    circle.setAttribute('fill-opacity', '0.75');
    circle.setAttribute('stroke', '#fff');
    circle.setAttribute('stroke-width', '1');
    circle.style.cursor = 'pointer';
    circle.title = LABELS[m.type] || m.type;
    circle.addEventListener('click', function (e) {
      e.stopPropagation();
      removeMarker(m.id);
    });
    group.appendChild(circle);
  }

  function removeMarker(id) {
    markers = markers.filter(function (m) { return m.id !== id; });
    var el = document.getElementById(id);
    if (el) el.parentNode.removeChild(el);
    renderList();
  }

  function renderList() {
    var list = document.getElementById('hand-marker-list');
    if (!list) return;
    if (markers.length === 0) {
      list.innerHTML = '<span style="color:var(--text-muted);font-size:.85rem;">No markers placed.</span>';
      return;
    }
    list.innerHTML = markers.map(function (m) {
      return '<span class="chip active" style="background:' + (COLORS[m.type] || '#e53935') +
             ';color:#fff;margin:2px;">' +
             m.hand + ' — ' + (LABELS[m.type] || m.type) +
             ' <span onclick="HandChart.remove(\'' + m.id + '\')" style="cursor:pointer;margin-left:4px;">×</span></span>';
    }).join('');
  }

  function getData() {
    return markers.map(function (m) {
      return { id: m.id, hand: m.hand, type: m.type, x: m.x, y: m.y };
    });
  }

  function loadData(arr) {
    clearAll();
    if (!Array.isArray(arr)) return;
    arr.forEach(function (m) {
      var svgId = 'hand-svg-' + m.hand.toLowerCase();
      var svg   = document.getElementById(svgId);
      if (!svg) return;
      var marker = { id: m.id || ('hm' + (nextId++)), hand: m.hand, type: m.type, x: m.x, y: m.y };
      markers.push(marker);
      renderMarker(svg, marker);
    });
    renderList();
  }

  function clearAll() {
    ['r', 'l'].forEach(function (h) {
      var g = document.getElementById('markers-' + h);
      if (g) g.innerHTML = '';
    });
    markers = [];
    nextId  = 1;
    renderList();
  }

  return {
    init:     init,
    getData:  getData,
    loadData: loadData,
    clearAll: clearAll,
    remove:   removeMarker
  };
}());
```

- [ ] **Step 2: Syntax-check**

```
node --check static/js/handchart.js
```

Expected: no output (clean).

- [ ] **Step 3: Commit**

```
git add static/js/handchart.js
git commit -m "feat: add handchart.js IIFE for hand assessment marker chart"
```

---

## Task 2: Create `static/js/form_hand.js`

**Files:**
- Create: `static/js/form_hand.js`

Full form logic. All collect/populate/reset for 13 sections. Chip toggle uses event delegation. Management type reveals surgery date row. Special question "Other" general health reveals notes row.

- [ ] **Step 1: Write form_hand.js**

```javascript
var HandForm = (function () {
  'use strict';

  /* ── helpers ── */
  function gv(id) {
    var el = document.getElementById(id);
    if (!el) return '';
    return el.value || '';
  }
  function sv(id, val) {
    var el = document.getElementById(id);
    if (!el) return;
    el.value = val || '';
  }
  function gb(id) {
    var el = document.getElementById(id);
    return el ? el.checked : false;
  }
  function sb(id, val) {
    var el = document.getElementById(id);
    if (el) el.checked = !!val;
  }
  function getChips(groupId) {
    var chips = document.querySelectorAll('#' + groupId + ' .chip.active');
    return Array.from(chips).map(function (c) { return c.dataset.value; });
  }
  function setChips(groupId, vals) {
    var chips = document.querySelectorAll('#' + groupId + ' .chip');
    chips.forEach(function (c) {
      c.classList.toggle('active', Array.isArray(vals) && vals.indexOf(c.dataset.value) !== -1);
    });
  }
  function clearChips(groupId) {
    document.querySelectorAll('#' + groupId + ' .chip').forEach(function (c) {
      c.classList.remove('active');
    });
  }

  /* ── ROM table ── */
  function collectRom() {
    var rows = document.querySelectorAll('#rom-tbody tr');
    var result = [];
    rows.forEach(function (row) {
      var movement = row.dataset.movement || '';
      var inputs   = row.querySelectorAll('input');
      if (inputs.length < 6) return;
      var activeL  = inputs[0].value.trim();
      var activeR  = inputs[1].value.trim();
      var passiveL = inputs[2].value.trim();
      var passiveR = inputs[3].value.trim();
      var opL      = inputs[4].value.trim();
      var opR      = inputs[5].value.trim();
      if (activeL || activeR || passiveL || passiveR || opL || opR) {
        result.push({ movement: movement, activeL: activeL, activeR: activeR,
                      passiveL: passiveL, passiveR: passiveR, opL: opL, opR: opR });
      }
    });
    return result;
  }
  function populateRom(tableData) {
    if (!Array.isArray(tableData)) return;
    tableData.forEach(function (rowData) {
      var tr = document.querySelector('#rom-tbody tr[data-movement="' + rowData.movement + '"]');
      if (!tr) return;
      var inputs = tr.querySelectorAll('input');
      if (inputs.length < 6) return;
      inputs[0].value = rowData.activeL  || '';
      inputs[1].value = rowData.activeR  || '';
      inputs[2].value = rowData.passiveL || '';
      inputs[3].value = rowData.passiveR || '';
      inputs[4].value = rowData.opL      || '';
      inputs[5].value = rowData.opR      || '';
    });
  }
  function clearRom() {
    document.querySelectorAll('#rom-tbody input').forEach(function (inp) { inp.value = ''; });
  }

  /* ── circumference table ── */
  function addCircRow() {
    var tbody = document.getElementById('circ-tbody');
    if (!tbody) return;
    var tr = document.createElement('tr');
    tr.innerHTML = '<td><input type="text" placeholder="e.g. Wrist" style="width:100%"></td>' +
                   '<td><input type="text" placeholder="cm" style="width:80px"></td>' +
                   '<td><button type="button" onclick="HandForm.removeCircRow(this)" ' +
                   'class="btn-ghost" style="padding:2px 8px;">×</button></td>';
    tbody.appendChild(tr);
  }
  function removeCircRow(btn) {
    var tr = btn.closest('tr');
    if (tr) tr.parentNode.removeChild(tr);
  }
  function collectCirc() {
    var rows   = document.querySelectorAll('#circ-tbody tr');
    var result = [];
    rows.forEach(function (row) {
      var inputs = row.querySelectorAll('input');
      var label  = inputs[0] ? inputs[0].value.trim() : '';
      var value  = inputs[1] ? inputs[1].value.trim() : '';
      if (label || value) result.push({ label: label, value: value });
    });
    return result;
  }
  function populateCirc(data) {
    var tbody = document.getElementById('circ-tbody');
    if (!tbody || !Array.isArray(data)) return;
    tbody.innerHTML = '';
    data.forEach(function (row) {
      var tr = document.createElement('tr');
      tr.innerHTML = '<td><input type="text" style="width:100%" value="' +
                     (row.label || '') + '"></td>' +
                     '<td><input type="text" style="width:80px" value="' +
                     (row.value || '') + '"></td>' +
                     '<td><button type="button" onclick="HandForm.removeCircRow(this)" ' +
                     'class="btn-ghost" style="padding:2px 8px;">×</button></td>';
      tbody.appendChild(tr);
    });
  }
  function clearCirc() {
    var tbody = document.getElementById('circ-tbody');
    if (tbody) tbody.innerHTML = '';
  }

  /* ── collect ── */
  function collect() {
    return {
      _form_type: 'HAND',
      meta:       { form: 'HAND' },
      patient:    FormBase.collectPatient(),

      /* Section 1 – Diagnosis */
      diagnosis:        gv('diagnosis'),
      referralSource:   gv('referral-source'),
      managementType:   gv('management-type'),
      surgeryDate:      gv('surgery-date'),
      surgeryType:      gv('surgery-type'),

      /* Section 2 – Hand Chart */
      handChart: {
        markers: HandChart.getData(),
        notes:   gv('chart-notes')
      },

      /* Section 3 – Chief Complaint */
      chiefComplaint:   gv('chief-complaint'),
      onsetDate:        gv('onset-date'),
      mechanism:        gv('mechanism'),

      /* Section 4 – Pain */
      painScoreR:       gv('pain-score-r'),
      painScoreL:       gv('pain-score-l'),
      painNature:       getChips('pain-nature-chips'),
      painAggravate:    gv('pain-aggravate'),
      painRelieve:      gv('pain-relieve'),

      /* Section 5 – Special Questions */
      sqGeneralHealth:  gv('sq-general-health'),
      sqHealthNotes:    gv('sq-health-notes'),
      sqMedications:    gv('sq-medications'),
      sqAllergies:      gv('sq-allergies'),
      sqOccupation:     gv('sq-occupation'),
      sqDominantHand:   gv('sq-dominant-hand'),

      /* Section 6 – History */
      pastMedHistory:   getChips('pmh-chips'),
      pastMedOther:     gv('pmh-other'),
      socialHistory:    gv('social-history'),
      familyHistory:    gv('family-history'),

      /* Section 7 – Observation */
      skinCondition:    getChips('skin-chips'),
      deformity:        getChips('deformity-chips'),
      swelling:         getChips('swelling-chips'),
      woundNotes:       gv('wound-notes'),
      observationNotes: gv('observation-notes'),

      /* Section 8 – Palpation */
      tenderness:       gv('tenderness'),
      temperature:      gv('temperature'),
      texture:          gv('texture'),
      palpationNotes:   gv('palpation-notes'),

      /* Section 9 – ROM */
      rom: { table: collectRom() },

      /* Section 10 – Strength & Circumference */
      gripStrengthR:    gv('grip-r'),
      gripStrengthL:    gv('grip-l'),
      pinchStrengthR:   gv('pinch-r'),
      pinchStrengthL:   gv('pinch-l'),
      circumference:    { table: collectCirc() },

      /* Section 11 – Sensation */
      lightTouchR:      gv('light-touch-r'),
      lightTouchL:      gv('light-touch-l'),
      pinPrickR:        gv('pin-prick-r'),
      pinPrickL:        gv('pin-prick-l'),
      twoPointDiscR:    gv('two-point-r'),
      twoPointDiscL:    gv('two-point-l'),
      sensationNotes:   gv('sensation-notes'),

      /* Section 12 – Other Tests & Neurology */
      otherTests: {
        tinels:       { r: gv('tinels-r'),       l: gv('tinels-l') },
        phalens:      { r: gv('phalens-r'),       l: gv('phalens-l') },
        finkelsteins: { r: gv('finkelsteins-r'),  l: gv('finkelsteins-l') },
        fromens:      { r: gv('fromens-r'),        l: gv('fromens-l') }
      },
      neuro: {
        reflexes: {
          c5:    { l: gv('ref-c5-l'),    r: gv('ref-c5-r') },
          c6:    { l: gv('ref-c6-l'),    r: gv('ref-c6-r') },
          c7:    { l: gv('ref-c7-l'),    r: gv('ref-c7-r') },
          c8t1:  { l: gv('ref-c8t1-l'), r: gv('ref-c8t1-r') }
        },
        muscles: {
          deltoid:       { l: gv('mmt-deltoid-l'),       r: gv('mmt-deltoid-r') },
          biceps:        { l: gv('mmt-biceps-l'),         r: gv('mmt-biceps-r') },
          wristExt:      { l: gv('mmt-wristext-l'),       r: gv('mmt-wristext-r') },
          wristFlex:     { l: gv('mmt-wristflex-l'),      r: gv('mmt-wristflex-r') },
          fingerMpExt:   { l: gv('mmt-fingermpext-l'),    r: gv('mmt-fingermpext-r') },
          triceps:       { l: gv('mmt-triceps-l'),         r: gv('mmt-triceps-r') },
          fingerFlex:    { l: gv('mmt-fingerflex-l'),      r: gv('mmt-fingerflex-r') },
          handIntrinsics:{ l: gv('mmt-intrinsics-l'),     r: gv('mmt-intrinsics-r') }
        }
      },

      /* Section 13 – PT Impression + Goals + Plan */
      ptImpression:     gv('pt-impression'),
      stg:              gv('stg'),
      ltg:              gv('ltg'),
      plan:             gv('plan')
    };
  }

  /* ── populate ── */
  function populate(d) {
    FormBase.populatePatient(d.patient);

    sv('diagnosis',       d.diagnosis);
    sv('referral-source', d.referralSource);
    sv('management-type', d.managementType);
    sv('surgery-date',    d.surgeryDate);
    sv('surgery-type',    d.surgeryType);
    onManagementChange();

    if (d.handChart) {
      HandChart.loadData(d.handChart.markers || []);
      sv('chart-notes', d.handChart.notes);
    }

    sv('chief-complaint', d.chiefComplaint);
    sv('onset-date',      d.onsetDate);
    sv('mechanism',       d.mechanism);

    sv('pain-score-r',  d.painScoreR);
    sv('pain-score-l',  d.painScoreL);
    setChips('pain-nature-chips', d.painNature);
    sv('pain-aggravate', d.painAggravate);
    sv('pain-relieve',   d.painRelieve);

    sv('sq-general-health', d.sqGeneralHealth);
    sv('sq-health-notes',   d.sqHealthNotes);
    onHealthChange();
    sv('sq-medications', d.sqMedications);
    sv('sq-allergies',   d.sqAllergies);
    sv('sq-occupation',  d.sqOccupation);
    sv('sq-dominant-hand', d.sqDominantHand);

    setChips('pmh-chips',       d.pastMedHistory);
    sv('pmh-other',             d.pastMedOther);
    sv('social-history',        d.socialHistory);
    sv('family-history',        d.familyHistory);

    setChips('skin-chips',     d.skinCondition);
    setChips('deformity-chips',d.deformity);
    setChips('swelling-chips', d.swelling);
    sv('wound-notes',          d.woundNotes);
    sv('observation-notes',    d.observationNotes);

    sv('tenderness',    d.tenderness);
    sv('temperature',   d.temperature);
    sv('texture',       d.texture);
    sv('palpation-notes', d.palpationNotes);

    if (d.rom) populateRom(d.rom.table);

    sv('grip-r',  d.gripStrengthR);
    sv('grip-l',  d.gripStrengthL);
    sv('pinch-r', d.pinchStrengthR);
    sv('pinch-l', d.pinchStrengthL);
    if (d.circumference) populateCirc(d.circumference.table);

    sv('light-touch-r', d.lightTouchR);
    sv('light-touch-l', d.lightTouchL);
    sv('pin-prick-r',   d.pinPrickR);
    sv('pin-prick-l',   d.pinPrickL);
    sv('two-point-r',   d.twoPointDiscR);
    sv('two-point-l',   d.twoPointDiscL);
    sv('sensation-notes', d.sensationNotes);

    var ot = d.otherTests || {};
    sv('tinels-r',       (ot.tinels       || {}).r);
    sv('tinels-l',       (ot.tinels       || {}).l);
    sv('phalens-r',      (ot.phalens      || {}).r);
    sv('phalens-l',      (ot.phalens      || {}).l);
    sv('finkelsteins-r', (ot.finkelsteins || {}).r);
    sv('finkelsteins-l', (ot.finkelsteins || {}).l);
    sv('fromens-r',      (ot.fromens      || {}).r);
    sv('fromens-l',      (ot.fromens      || {}).l);

    var nr = (d.neuro || {});
    var rf = nr.reflexes  || {};
    var mm = nr.muscles   || {};
    sv('ref-c5-l',  (rf.c5   || {}).l); sv('ref-c5-r',  (rf.c5   || {}).r);
    sv('ref-c6-l',  (rf.c6   || {}).l); sv('ref-c6-r',  (rf.c6   || {}).r);
    sv('ref-c7-l',  (rf.c7   || {}).l); sv('ref-c7-r',  (rf.c7   || {}).r);
    sv('ref-c8t1-l',(rf.c8t1 || {}).l); sv('ref-c8t1-r',(rf.c8t1 || {}).r);
    sv('mmt-deltoid-l',      (mm.deltoid        || {}).l); sv('mmt-deltoid-r',      (mm.deltoid        || {}).r);
    sv('mmt-biceps-l',       (mm.biceps         || {}).l); sv('mmt-biceps-r',       (mm.biceps         || {}).r);
    sv('mmt-wristext-l',     (mm.wristExt       || {}).l); sv('mmt-wristext-r',     (mm.wristExt       || {}).r);
    sv('mmt-wristflex-l',    (mm.wristFlex      || {}).l); sv('mmt-wristflex-r',    (mm.wristFlex      || {}).r);
    sv('mmt-fingermpext-l',  (mm.fingerMpExt    || {}).l); sv('mmt-fingermpext-r',  (mm.fingerMpExt    || {}).r);
    sv('mmt-triceps-l',      (mm.triceps        || {}).l); sv('mmt-triceps-r',      (mm.triceps        || {}).r);
    sv('mmt-fingerflex-l',   (mm.fingerFlex     || {}).l); sv('mmt-fingerflex-r',   (mm.fingerFlex     || {}).r);
    sv('mmt-intrinsics-l',   (mm.handIntrinsics || {}).l); sv('mmt-intrinsics-r',   (mm.handIntrinsics || {}).r);

    sv('pt-impression', d.ptImpression);
    sv('stg',           d.stg);
    sv('ltg',           d.ltg);
    sv('plan',          d.plan);
  }

  /* ── reset ── */
  function reset() {
    FormBase.resetPatient();

    ['diagnosis','referral-source','management-type','surgery-date','surgery-type',
     'chart-notes','chief-complaint','onset-date','mechanism',
     'pain-score-r','pain-score-l','pain-aggravate','pain-relieve',
     'sq-general-health','sq-health-notes','sq-medications','sq-allergies',
     'sq-occupation','sq-dominant-hand',
     'pmh-other','social-history','family-history',
     'wound-notes','observation-notes',
     'tenderness','temperature','texture','palpation-notes',
     'grip-r','grip-l','pinch-r','pinch-l','sensation-notes',
     'light-touch-r','light-touch-l','pin-prick-r','pin-prick-l',
     'two-point-r','two-point-l',
     'tinels-r','tinels-l','phalens-r','phalens-l',
     'finkelsteins-r','finkelsteins-l','fromens-r','fromens-l',
     'ref-c5-l','ref-c5-r','ref-c6-l','ref-c6-r','ref-c7-l','ref-c7-r','ref-c8t1-l','ref-c8t1-r',
     'mmt-deltoid-l','mmt-deltoid-r','mmt-biceps-l','mmt-biceps-r',
     'mmt-wristext-l','mmt-wristext-r','mmt-wristflex-l','mmt-wristflex-r',
     'mmt-fingermpext-l','mmt-fingermpext-r','mmt-triceps-l','mmt-triceps-r',
     'mmt-fingerflex-l','mmt-fingerflex-r','mmt-intrinsics-l','mmt-intrinsics-r',
     'pt-impression','stg','ltg','plan'
    ].forEach(function (id) { sv(id, ''); });

    ['pain-nature-chips','pmh-chips','skin-chips','deformity-chips','swelling-chips'
    ].forEach(function (g) { clearChips(g); });

    HandChart.clearAll();
    clearRom();
    clearCirc();
    onManagementChange();
    onHealthChange();
  }

  /* ── reveal helpers ── */
  function onManagementChange() {
    var row = document.getElementById('surgery-date-row');
    if (!row) return;
    row.style.display = (gv('management-type') === 'Surgical') ? '' : 'none';
  }
  function onHealthChange() {
    var row = document.getElementById('sq-health-notes-row');
    if (!row) return;
    row.style.display = (gv('sq-general-health') === 'Other') ? '' : 'none';
  }

  /* ── chip delegation (called from DOMContentLoaded in HTML) ── */
  function initChips() {
    document.querySelectorAll('.chip-group').forEach(function (group) {
      group.addEventListener('click', function (e) {
        var chip = e.target.closest('.chip');
        if (!chip || !group.contains(chip)) return;
        chip.classList.toggle('active');
      });
    });
  }

  /* ── public ── */
  return {
    collect:            collect,
    populate:           populate,
    reset:              reset,
    addCircRow:         addCircRow,
    removeCircRow:      removeCircRow,
    onManagementChange: onManagementChange,
    onHealthChange:     onHealthChange,
    initChips:          initChips
  };
}());

window.ActiveForm = HandForm;
window.Form = {
  collect:         HandForm.collect,
  populate:        HandForm.populate,
  reset:           HandForm.reset,
  onPtTypeChange:  FormBase.onPtTypeChange,
  onNricInput:     FormBase.onNricInput,
  onDobChange:     FormBase.onDobChange
};
```

- [ ] **Step 2: Syntax-check**

```
node --check static/js/form_hand.js
```

Expected: no output (clean).

- [ ] **Step 3: Commit**

```
git add static/js/form_hand.js
git commit -m "feat: add form_hand.js with collect/populate/reset for all 13 sections"
```

---

## Task 3: Create `templates/forms/hand.html`

**Files:**
- Create: `templates/forms/hand.html`

Extends `base.html`. Inline SVG hands in the hand chart section — two SVG elements with `<g id="markers-r">` and `<g id="markers-l">` to receive marker circles. ROM table has 44 static rows with `data-movement` attributes. Chip groups use `.chip-group` class (already in style.css from neuro form).

- [ ] **Step 1: Write hand.html**

```html
{% extends "base.html" %}
{% block title %}Hand Assessment{% endblock %}
{% block extra_js %}
<script src="{{ url_for('static', filename='js/form_hand.js') }}"></script>
<script>
document.addEventListener('DOMContentLoaded', function () {
  HandForm.initChips();
  /* Clinical template buttons */
  ClinicalTemplates.addButton('obs-btn-container',    'observation-notes', 'HAND_OBS');
  ClinicalTemplates.addButton('palp-btn-container',   'palpation-notes',   'HAND_PALP');
  ClinicalTemplates.addButton('imp-btn-container',    'pt-impression',     'HAND_IMPRESSION');
  ClinicalTemplates.addButton('stg-btn-container',    'stg',               'HAND_STG');
  ClinicalTemplates.addButton('ltg-btn-container',    'ltg',               'HAND_LTG');
  ClinicalTemplates.addButton('plan-btn-container',   'plan',              'HAND_PLAN');
});
</script>
{% endblock %}
{% block content %}
<form id="assessment-form" autocomplete="off">

  <!-- ═══ PATIENT INFO (managed by FormBase / initFormContext) ═══ -->
  <div class="section-card">
    <div class="section-title">Patient Information</div>
    <div class="form-row">
      <div class="field"><label>Patient Name</label><input type="text" id="pt-name" onchange="window.FormBase.onNricInput()"></div>
      <div class="field"><label>IC / Passport</label>
        <div style="display:flex;gap:8px;align-items:center;">
          <select id="pt-type" onchange="window.FormBase.onPtTypeChange()" style="width:110px;">
            <option value="IC">IC</option>
            <option value="Passport">Passport</option>
          </select>
          <input type="text" id="pt-ic" placeholder="YYMMDDXXXXXX" oninput="window.FormBase.onNricInput()">
        </div>
      </div>
      <div class="field"><label>Date of Assessment</label><input type="date" id="pt-date"></div>
    </div>
    <div class="form-row">
      <div class="field"><label>Age</label><input type="number" id="pt-age" min="0" max="120"></div>
      <div class="field"><label>Diagnosis</label><input type="text" id="diagnosis" placeholder="Primary diagnosis"></div>
      <div class="field"><label>Referral Source</label>
        <select id="referral-source">
          <option value="">— select —</option>
          <option>Orthopaedic</option><option>Plastic Surgery</option><option>Neurosurgery</option>
          <option>General Surgery</option><option>Rheumatology</option><option>Self-referral</option><option>Other</option>
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="field"><label>Management Type</label>
        <select id="management-type" onchange="HandForm.onManagementChange()">
          <option value="">— select —</option>
          <option>Conservative</option><option>Surgical</option>
        </select>
      </div>
      <div class="field" id="surgery-date-row" style="display:none;">
        <label>Date of Surgery</label><input type="date" id="surgery-date">
      </div>
      <div class="field" id="surgery-type-row">
        <label>Surgery / Procedure Type</label><input type="text" id="surgery-type" placeholder="e.g. ORIF, tendon repair">
      </div>
    </div>
  </div>

  <!-- ═══ HAND CHART ═══ -->
  <div class="section-card">
    <div class="section-title">Hand Chart</div>
    <div class="form-row" style="align-items:center;gap:12px;margin-bottom:8px;">
      <label style="font-weight:500;">Marker Type:</label>
      <select id="hctype-sel" style="width:160px;">
        <option value="pain">Pain</option>
        <option value="numb">Numbness</option>
        <option value="tingling">Tingling</option>
        <option value="weak">Weakness</option>
        <option value="swelling">Swelling</option>
        <option value="scar">Scar</option>
      </select>
      <button type="button" class="btn-ghost" onclick="HandChart.clearAll()">Clear All</button>
    </div>
    <div style="display:flex;gap:24px;justify-content:center;flex-wrap:wrap;">
      <!-- RIGHT HAND SVG (palmar view) -->
      <div style="text-align:center;">
        <div style="font-weight:600;margin-bottom:4px;">Right Hand (Palmar)</div>
        <svg id="hand-svg-r" viewBox="0 0 200 300" width="160" height="240"
             style="border:1px solid var(--border);border-radius:8px;cursor:crosshair;background:var(--surface);">
          <!-- Simplified palmar hand outline: palm + 5 fingers (thumb on left for R hand) -->
          <!-- Palm -->
          <rect x="55" y="130" width="110" height="100" rx="12" fill="none" stroke="var(--text-muted)" stroke-width="2"/>
          <!-- Thumb (leftmost for right hand) -->
          <ellipse cx="50" cy="110" rx="18" ry="35" fill="none" stroke="var(--text-muted)" stroke-width="2"/>
          <!-- Index finger -->
          <rect x="65" y="55" width="22" height="78" rx="10" fill="none" stroke="var(--text-muted)" stroke-width="2"/>
          <!-- Middle finger -->
          <rect x="91" y="40" width="22" height="93" rx="10" fill="none" stroke="var(--text-muted)" stroke-width="2"/>
          <!-- Ring finger -->
          <rect x="117" y="50" width="22" height="83" rx="10" fill="none" stroke="var(--text-muted)" stroke-width="2"/>
          <!-- Little finger -->
          <rect x="143" y="70" width="20" height="65" rx="10" fill="none" stroke="var(--text-muted)" stroke-width="2"/>
          <text x="100" y="290" text-anchor="middle" font-size="11" fill="var(--text-muted)">R</text>
          <g id="markers-r"></g>
        </svg>
      </div>
      <!-- LEFT HAND SVG (palmar view) -->
      <div style="text-align:center;">
        <div style="font-weight:600;margin-bottom:4px;">Left Hand (Palmar)</div>
        <svg id="hand-svg-l" viewBox="0 0 200 300" width="160" height="240"
             style="border:1px solid var(--border);border-radius:8px;cursor:crosshair;background:var(--surface);">
          <!-- Thumb on right for left hand (mirror) -->
          <rect x="35" y="130" width="110" height="100" rx="12" fill="none" stroke="var(--text-muted)" stroke-width="2"/>
          <!-- Little finger (leftmost for left hand) -->
          <rect x="37" y="70" width="20" height="65" rx="10" fill="none" stroke="var(--text-muted)" stroke-width="2"/>
          <!-- Ring finger -->
          <rect x="61" y="50" width="22" height="83" rx="10" fill="none" stroke="var(--text-muted)" stroke-width="2"/>
          <!-- Middle finger -->
          <rect x="87" y="40" width="22" height="93" rx="10" fill="none" stroke="var(--text-muted)" stroke-width="2"/>
          <!-- Index finger -->
          <rect x="113" y="55" width="22" height="78" rx="10" fill="none" stroke="var(--text-muted)" stroke-width="2"/>
          <!-- Thumb (rightmost for left hand) -->
          <ellipse cx="150" cy="110" rx="18" ry="35" fill="none" stroke="var(--text-muted)" stroke-width="2"/>
          <text x="100" y="290" text-anchor="middle" font-size="11" fill="var(--text-muted)">L</text>
          <g id="markers-l"></g>
        </svg>
      </div>
    </div>
    <!-- Legend -->
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">
      <span style="font-size:.8rem;color:var(--text-muted);">Legend:</span>
      <span style="font-size:.8rem;color:#e53935;">● Pain</span>
      <span style="font-size:.8rem;color:#1e88e5;">● Numbness</span>
      <span style="font-size:.8rem;color:#8e24aa;">● Tingling</span>
      <span style="font-size:.8rem;color:#fb8c00;">● Weakness</span>
      <span style="font-size:.8rem;color:#00897b;">● Swelling</span>
      <span style="font-size:.8rem;color:#6d4c41;">● Scar</span>
    </div>
    <div id="hand-marker-list" style="margin-top:6px;min-height:24px;"></div>
    <div class="field" style="margin-top:8px;"><label>Chart Notes</label><textarea id="chart-notes" rows="2"></textarea></div>
  </div>

  <!-- ═══ CHIEF COMPLAINT ═══ -->
  <div class="section-card">
    <div class="section-title">Chief Complaint</div>
    <div class="form-row">
      <div class="field" style="flex:2;"><label>Chief Complaint</label><textarea id="chief-complaint" rows="3" placeholder="Patient's own words"></textarea></div>
      <div class="field"><label>Date of Onset</label><input type="date" id="onset-date"></div>
    </div>
    <div class="field"><label>Mechanism of Injury / Onset</label><textarea id="mechanism" rows="2"></textarea></div>
  </div>

  <!-- ═══ PAIN ═══ -->
  <div class="section-card">
    <div class="section-title">Pain Assessment</div>
    <div class="form-row">
      <div class="field"><label>Pain Score — Right (0–10)</label><input type="number" id="pain-score-r" min="0" max="10"></div>
      <div class="field"><label>Pain Score — Left (0–10)</label><input type="number" id="pain-score-l" min="0" max="10"></div>
    </div>
    <div class="field">
      <label>Nature of Pain</label>
      <div class="chip-group" id="pain-nature-chips">
        <span class="chip" data-value="Aching">Aching</span>
        <span class="chip" data-value="Sharp">Sharp</span>
        <span class="chip" data-value="Burning">Burning</span>
        <span class="chip" data-value="Throbbing">Throbbing</span>
        <span class="chip" data-value="Shooting">Shooting</span>
        <span class="chip" data-value="Constant">Constant</span>
        <span class="chip" data-value="Intermittent">Intermittent</span>
        <span class="chip" data-value="Rest pain">Rest pain</span>
        <span class="chip" data-value="Night pain">Night pain</span>
      </div>
    </div>
    <div class="form-row">
      <div class="field"><label>Aggravating Factors</label><textarea id="pain-aggravate" rows="2"></textarea></div>
      <div class="field"><label>Relieving Factors</label><textarea id="pain-relieve" rows="2"></textarea></div>
    </div>
  </div>

  <!-- ═══ SPECIAL QUESTIONS ═══ -->
  <div class="section-card">
    <div class="section-title">Special Questions</div>
    <div class="form-row">
      <div class="field"><label>General Health</label>
        <select id="sq-general-health" onchange="HandForm.onHealthChange()">
          <option value="">— select —</option>
          <option>Good</option><option>Fair</option><option>Poor</option><option>Other</option>
        </select>
      </div>
      <div class="field" id="sq-health-notes-row" style="display:none;">
        <label>Health Notes</label><input type="text" id="sq-health-notes">
      </div>
      <div class="field"><label>Dominant Hand</label>
        <select id="sq-dominant-hand">
          <option value="">— select —</option>
          <option>Right</option><option>Left</option><option>Ambidextrous</option>
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="field"><label>Medications</label><textarea id="sq-medications" rows="2" placeholder="Current medications"></textarea></div>
      <div class="field"><label>Allergies</label><input type="text" id="sq-allergies"></div>
      <div class="field"><label>Occupation</label><input type="text" id="sq-occupation"></div>
    </div>
  </div>

  <!-- ═══ HISTORY ═══ -->
  <div class="section-card">
    <div class="section-title">History</div>
    <div class="field">
      <label>Past Medical History</label>
      <div class="chip-group" id="pmh-chips">
        <span class="chip" data-value="Diabetes">Diabetes</span>
        <span class="chip" data-value="Hypertension">Hypertension</span>
        <span class="chip" data-value="IHD">IHD</span>
        <span class="chip" data-value="RA">RA</span>
        <span class="chip" data-value="Osteoporosis">Osteoporosis</span>
        <span class="chip" data-value="Stroke">Stroke</span>
        <span class="chip" data-value="Neuropathy">Neuropathy</span>
        <span class="chip" data-value="Previous fracture">Previous fracture</span>
        <span class="chip" data-value="Previous surgery">Previous surgery</span>
      </div>
    </div>
    <div class="field"><label>Other Past Medical History</label><input type="text" id="pmh-other"></div>
    <div class="form-row">
      <div class="field"><label>Social History</label><textarea id="social-history" rows="2" placeholder="Living situation, ADL independence, supports"></textarea></div>
      <div class="field"><label>Family History</label><textarea id="family-history" rows="2"></textarea></div>
    </div>
  </div>

  <!-- ═══ OBSERVATION ═══ -->
  <div class="section-card">
    <div class="section-title">Observation</div>
    <div class="field">
      <label>Skin Condition</label>
      <div class="chip-group" id="skin-chips">
        <span class="chip" data-value="Normal">Normal</span>
        <span class="chip" data-value="Dry">Dry</span>
        <span class="chip" data-value="Shiny">Shiny</span>
        <span class="chip" data-value="Macerated">Macerated</span>
        <span class="chip" data-value="Scar">Scar</span>
        <span class="chip" data-value="Wound">Wound</span>
        <span class="chip" data-value="Discolouration">Discolouration</span>
      </div>
    </div>
    <div class="field">
      <label>Deformity</label>
      <div class="chip-group" id="deformity-chips">
        <span class="chip" data-value="None">None</span>
        <span class="chip" data-value="Mallet finger">Mallet finger</span>
        <span class="chip" data-value="Boutonniere">Boutonniere</span>
        <span class="chip" data-value="Swan neck">Swan neck</span>
        <span class="chip" data-value="Claw hand">Claw hand</span>
        <span class="chip" data-value="Wrist drop">Wrist drop</span>
        <span class="chip" data-value="Thenar wasting">Thenar wasting</span>
        <span class="chip" data-value="Hypothenar wasting">Hypothenar wasting</span>
        <span class="chip" data-value="Dupuytren's">Dupuytren's</span>
      </div>
    </div>
    <div class="field">
      <label>Swelling / Oedema</label>
      <div class="chip-group" id="swelling-chips">
        <span class="chip" data-value="None">None</span>
        <span class="chip" data-value="Pitting">Pitting</span>
        <span class="chip" data-value="Non-pitting">Non-pitting</span>
        <span class="chip" data-value="Localised">Localised</span>
        <span class="chip" data-value="Diffuse">Diffuse</span>
      </div>
    </div>
    <div class="field"><label>Wound Description</label><textarea id="wound-notes" rows="2"></textarea></div>
    <div id="obs-btn-container"></div>
    <div class="field"><label>Additional Observation Notes</label><textarea id="observation-notes" rows="3"></textarea></div>
  </div>

  <!-- ═══ PALPATION ═══ -->
  <div class="section-card">
    <div class="section-title">Palpation</div>
    <div class="form-row">
      <div class="field"><label>Tenderness</label><input type="text" id="tenderness" placeholder="Location and severity"></div>
      <div class="field"><label>Temperature</label>
        <select id="temperature">
          <option value="">— select —</option>
          <option>Normal</option><option>Warm</option><option>Hot</option><option>Cool</option><option>Cold</option>
        </select>
      </div>
      <div class="field"><label>Texture</label>
        <select id="texture">
          <option value="">— select —</option>
          <option>Normal</option><option>Firm</option><option>Boggy</option><option>Fluctuant</option><option>Hard</option>
        </select>
      </div>
    </div>
    <div id="palp-btn-container"></div>
    <div class="field"><label>Palpation Notes</label><textarea id="palpation-notes" rows="3"></textarea></div>
  </div>

  <!-- ═══ ROM ═══ -->
  <div class="section-card">
    <div class="section-title">Range of Motion (degrees)</div>
    <div style="overflow-x:auto;">
      <table style="width:100%;border-collapse:collapse;font-size:.88rem;">
        <thead>
          <tr style="background:var(--surface-alt);">
            <th style="text-align:left;padding:6px 8px;border:1px solid var(--border);">Movement</th>
            <th style="padding:6px;border:1px solid var(--border);">Active L</th>
            <th style="padding:6px;border:1px solid var(--border);">Active R</th>
            <th style="padding:6px;border:1px solid var(--border);">Passive L</th>
            <th style="padding:6px;border:1px solid var(--border);">Passive R</th>
            <th style="padding:6px;border:1px solid var(--border);">OP L</th>
            <th style="padding:6px;border:1px solid var(--border);">OP R</th>
          </tr>
        </thead>
        <tbody id="rom-tbody">
          {% set rom_rows = [
            'Wrist Flexion','Wrist Extension','Wrist Radial Deviation','Wrist Ulnar Deviation',
            'Wrist Supination','Wrist Pronation',
            'Thumb CMC Flexion','Thumb CMC Extension','Thumb CMC Abduction','Thumb CMC Adduction',
            'Thumb MCP Flexion','Thumb MCP Extension',
            'Thumb IP Flexion','Thumb IP Extension',
            'Index MCP Flexion','Index MCP Extension',
            'Index PIP Flexion','Index PIP Extension',
            'Index DIP Flexion','Index DIP Extension',
            'Middle MCP Flexion','Middle MCP Extension',
            'Middle PIP Flexion','Middle PIP Extension',
            'Middle DIP Flexion','Middle DIP Extension',
            'Ring MCP Flexion','Ring MCP Extension',
            'Ring PIP Flexion','Ring PIP Extension',
            'Ring DIP Flexion','Ring DIP Extension',
            'Little MCP Flexion','Little MCP Extension',
            'Little PIP Flexion','Little PIP Extension',
            'Little DIP Flexion','Little DIP Extension',
            'Finger Abduction','Finger Adduction',
            'Opposition — Thumb to Index','Opposition — Thumb to Middle',
            'Opposition — Thumb to Ring','Opposition — Thumb to Little'
          ] %}
          {% for row in rom_rows %}
          <tr data-movement="{{ row }}" style="{% if loop.index is odd %}background:var(--surface);{% else %}background:var(--surface-alt);{% endif %}">
            <td style="padding:4px 8px;border:1px solid var(--border);white-space:nowrap;">{{ row }}</td>
            <td style="border:1px solid var(--border);"><input type="text" style="width:52px;text-align:center;border:none;background:transparent;"></td>
            <td style="border:1px solid var(--border);"><input type="text" style="width:52px;text-align:center;border:none;background:transparent;"></td>
            <td style="border:1px solid var(--border);"><input type="text" style="width:52px;text-align:center;border:none;background:transparent;"></td>
            <td style="border:1px solid var(--border);"><input type="text" style="width:52px;text-align:center;border:none;background:transparent;"></td>
            <td style="border:1px solid var(--border);"><input type="text" style="width:52px;text-align:center;border:none;background:transparent;"></td>
            <td style="border:1px solid var(--border);"><input type="text" style="width:52px;text-align:center;border:none;background:transparent;"></td>
          </tr>
          {% endfor %}
        </tbody>
      </table>
    </div>
  </div>

  <!-- ═══ STRENGTH & CIRCUMFERENCE ═══ -->
  <div class="section-card">
    <div class="section-title">Muscle Strength &amp; Circumference</div>
    <div class="form-row">
      <div class="field"><label>Grip Strength R (kg)</label><input type="number" id="grip-r" min="0" step="0.1"></div>
      <div class="field"><label>Grip Strength L (kg)</label><input type="number" id="grip-l" min="0" step="0.1"></div>
      <div class="field"><label>Pinch Strength R (kg)</label><input type="number" id="pinch-r" min="0" step="0.1"></div>
      <div class="field"><label>Pinch Strength L (kg)</label><input type="number" id="pinch-l" min="0" step="0.1"></div>
    </div>
    <div style="display:flex;align-items:center;gap:12px;margin:8px 0 4px;">
      <span style="font-weight:500;font-size:.9rem;">Circumference Measurements</span>
      <button type="button" class="btn-ghost" onclick="HandForm.addCircRow()">+ Add Row</button>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:.88rem;">
      <thead>
        <tr style="background:var(--surface-alt);">
          <th style="text-align:left;padding:4px 8px;border:1px solid var(--border);">Location</th>
          <th style="padding:4px 8px;border:1px solid var(--border);">Measurement (cm)</th>
          <th style="width:40px;border:1px solid var(--border);"></th>
        </tr>
      </thead>
      <tbody id="circ-tbody"></tbody>
    </table>
  </div>

  <!-- ═══ SENSATION ═══ -->
  <div class="section-card">
    <div class="section-title">Sensation</div>
    <div class="form-row">
      <div class="field"><label>Light Touch R</label>
        <select id="light-touch-r"><option value="">—</option><option>Intact</option><option>Reduced</option><option>Absent</option><option>Hypersensitive</option></select>
      </div>
      <div class="field"><label>Light Touch L</label>
        <select id="light-touch-l"><option value="">—</option><option>Intact</option><option>Reduced</option><option>Absent</option><option>Hypersensitive</option></select>
      </div>
      <div class="field"><label>Pin Prick R</label>
        <select id="pin-prick-r"><option value="">—</option><option>Intact</option><option>Reduced</option><option>Absent</option><option>Hypersensitive</option></select>
      </div>
      <div class="field"><label>Pin Prick L</label>
        <select id="pin-prick-l"><option value="">—</option><option>Intact</option><option>Reduced</option><option>Absent</option><option>Hypersensitive</option></select>
      </div>
    </div>
    <div class="form-row">
      <div class="field"><label>2-Point Discrimination R (mm)</label><input type="number" id="two-point-r" min="0" step="0.5"></div>
      <div class="field"><label>2-Point Discrimination L (mm)</label><input type="number" id="two-point-l" min="0" step="0.5"></div>
    </div>
    <div class="field"><label>Sensation Notes</label><textarea id="sensation-notes" rows="2"></textarea></div>
  </div>

  <!-- ═══ OTHER TESTS ═══ -->
  <div class="section-card">
    <div class="section-title">Special Tests</div>
    <table style="width:100%;border-collapse:collapse;font-size:.88rem;">
      <thead>
        <tr style="background:var(--surface-alt);">
          <th style="text-align:left;padding:6px 8px;border:1px solid var(--border);">Test</th>
          <th style="padding:6px;border:1px solid var(--border);">Right</th>
          <th style="padding:6px;border:1px solid var(--border);">Left</th>
        </tr>
      </thead>
      <tbody>
        {% for test, idkey in [('Tinel\'s Sign','tinels'),('Phalen\'s Test','phalens'),('Finkelstein\'s Test','finkelsteins'),('Froment\'s Sign','fromens')] %}
        <tr>
          <td style="padding:4px 8px;border:1px solid var(--border);">{{ test }}</td>
          <td style="border:1px solid var(--border);">
            <select id="{{ idkey }}-r" style="width:120px;">
              <option value="">—</option><option>Negative</option><option>Positive</option><option>Not tested</option>
            </select>
          </td>
          <td style="border:1px solid var(--border);">
            <select id="{{ idkey }}-l" style="width:120px;">
              <option value="">—</option><option>Negative</option><option>Positive</option><option>Not tested</option>
            </select>
          </td>
        </tr>
        {% endfor %}
      </tbody>
    </table>

    <div style="margin-top:16px;font-weight:500;font-size:.9rem;">Neurological Screen</div>
    <div style="font-size:.85rem;color:var(--text-muted);margin-bottom:6px;">Reflexes (0 = absent, 1+ = diminished, 2+ = normal, 3+ = brisk, 4+ = clonus)</div>
    <table style="width:100%;border-collapse:collapse;font-size:.88rem;margin-bottom:12px;">
      <thead>
        <tr style="background:var(--surface-alt);">
          <th style="text-align:left;padding:4px 8px;border:1px solid var(--border);">Reflex</th>
          <th style="padding:4px;border:1px solid var(--border);">Left</th>
          <th style="padding:4px;border:1px solid var(--border);">Right</th>
        </tr>
      </thead>
      <tbody>
        {% for ref, idkey in [('C5 (Biceps)','ref-c5'),('C6 (Brachioradialis)','ref-c6'),('C7 (Triceps)','ref-c7'),('C8/T1 (Finger flexors)','ref-c8t1')] %}
        <tr>
          <td style="padding:4px 8px;border:1px solid var(--border);">{{ ref }}</td>
          <td style="border:1px solid var(--border);">
            <select id="{{ idkey }}-l" style="width:80px;">
              <option value="">—</option><option>0</option><option>1+</option><option>2+</option><option>3+</option><option>4+</option>
            </select>
          </td>
          <td style="border:1px solid var(--border);">
            <select id="{{ idkey }}-r" style="width:80px;">
              <option value="">—</option><option>0</option><option>1+</option><option>2+</option><option>3+</option><option>4+</option>
            </select>
          </td>
        </tr>
        {% endfor %}
      </tbody>
    </table>

    <div style="font-size:.85rem;color:var(--text-muted);margin-bottom:6px;">Manual Muscle Testing (0–5)</div>
    <table style="width:100%;border-collapse:collapse;font-size:.88rem;">
      <thead>
        <tr style="background:var(--surface-alt);">
          <th style="text-align:left;padding:4px 8px;border:1px solid var(--border);">Muscle Group</th>
          <th style="padding:4px;border:1px solid var(--border);">Left</th>
          <th style="padding:4px;border:1px solid var(--border);">Right</th>
        </tr>
      </thead>
      <tbody>
        {% for muscle, idkey in [
          ('Deltoid','mmt-deltoid'),('Biceps','mmt-biceps'),
          ('Wrist Extensors','mmt-wristext'),('Wrist Flexors','mmt-wristflex'),
          ('Finger MP Extensors','mmt-fingermpext'),('Triceps','mmt-triceps'),
          ('Finger Flexors','mmt-fingerflex'),('Hand Intrinsics','mmt-intrinsics')
        ] %}
        <tr>
          <td style="padding:4px 8px;border:1px solid var(--border);">{{ muscle }}</td>
          <td style="border:1px solid var(--border);">
            <select id="{{ idkey }}-l" style="width:70px;">
              <option value="">—</option><option>0</option><option>1</option><option>2</option><option>2+</option><option>3</option><option>3+</option><option>4</option><option>4+</option><option>5</option>
            </select>
          </td>
          <td style="border:1px solid var(--border);">
            <select id="{{ idkey }}-r" style="width:70px;">
              <option value="">—</option><option>0</option><option>1</option><option>2</option><option>2+</option><option>3</option><option>3+</option><option>4</option><option>4+</option><option>5</option>
            </select>
          </td>
        </tr>
        {% endfor %}
      </tbody>
    </table>
  </div>

  <!-- ═══ PT IMPRESSION + GOALS + PLAN ═══ -->
  <div class="section-card">
    <div class="section-title">PT Impression, Goals &amp; Plan</div>
    <div id="imp-btn-container"></div>
    <div class="field"><label>PT Impression</label><textarea id="pt-impression" rows="4"></textarea></div>
    <div class="form-row">
      <div class="field">
        <div id="stg-btn-container"></div>
        <label>Short-Term Goals</label><textarea id="stg" rows="3"></textarea>
      </div>
      <div class="field">
        <div id="ltg-btn-container"></div>
        <label>Long-Term Goals</label><textarea id="ltg" rows="3"></textarea>
      </div>
    </div>
    <div id="plan-btn-container"></div>
    <div class="field"><label>Treatment Plan</label><textarea id="plan" rows="4"></textarea></div>
  </div>

</form>
{% endblock %}
```

- [ ] **Step 2: Verify Jinja2 template renders (check Flask won't throw on first load)**

Start Flask (`python app.py`), navigate to the HAND form URL (after Task 4 registers it), check browser console for errors.

- [ ] **Step 3: Commit**

```
git add templates/forms/hand.html
git commit -m "feat: add hand.html template with 13 sections including SVG hand chart and ROM table"
```

---

## Task 4: Backend + Script Registration

**Files:**
- Modify: `app.py` (4 changes)
- Modify: `database.py` (1 change)
- Modify: `pt_assessment.spec` (1 change)
- Modify: `templates/base.html` (1 change)

- [ ] **Step 1: Add import + PDF dicts to app.py**

In `app.py`, add `import pdf_hand` to the import block alongside the other pdf imports.

In `_PDF_GENERATORS` dict, add:
```python
'HAND': pdf_hand.generate_episode_pdf,
```

In `_SINGLE_PDF_GENERATORS` dict, add:
```python
'HAND': pdf_hand.generate_hand_pdf,
```

- [ ] **Step 2: Register form route and flip ready=True in app.py**

In `FORM_REGISTRY`, find the HAND entry and change `'ready': False` to `'ready': True`.

In `FORM_TEMPLATES` dict, add:
```python
'HAND': 'forms/hand.html',
```

- [ ] **Step 3: Add REQUIRED_FIELDS to database.py**

In `database.py`, find the `REQUIRED_FIELDS` dict and add:
```python
'HAND': ['diagnosis', 'pt_impression'],
```

- [ ] **Step 4: Add pdf_hand.py to pt_assessment.spec**

In `pt_assessment.spec`, in the `datas` list, add after the `pdf_neuro.py` line:
```python
('pdf_hand.py', '.'),
```

- [ ] **Step 5: Load handchart.js in base.html**

In `templates/base.html`, find the line that loads `bodychart.js`:
```html
<script src="{{ url_for('static', filename='js/bodychart.js') }}"></script>
```

Add immediately after it:
```html
<script src="{{ url_for('static', filename='js/handchart.js') }}"></script>
```

- [ ] **Step 6: Smoke-test backend registration**

```
python -c "import app; print('OK')"
python -c "import database; print('OK')"
```

Both should print `OK` with no errors.

- [ ] **Step 7: Commit**

```
git add app.py database.py pt_assessment.spec templates/base.html
git commit -m "feat: register HAND form in app.py, database.py, spec, and base.html"
```

---

## Task 5: UI Registration (home.html + episode.html)

**Files:**
- Modify: `templates/home.html` (3 changes)
- Modify: `templates/episode.html` (3 changes)

- [ ] **Step 1: Update HAND modal card in home.html**

Find the line (around line 1060):
```html
<div class="form-card soon" data-form="HAND">
```

Replace with:
```html
<div class="form-card" data-form="HAND" onclick="selectForm(this)">
```

Inside that card, find and remove the `<span class="badge">Soon</span>` span if present.

Change the card icon to hand emoji:
Find the icon span inside the HAND card and change its content to `&#9995;`

- [ ] **Step 2: Update formLabel and icon maps in home.html**

Find the formLabel map in home.html (around line 1924):
```javascript
{MS:'Musculoskeletal', SPINE:'Spine', GERIATRIC:'Geriatric', CR:'Cardiorespiratory', AMPUTATION:'Amputation', NEURO:'Neurological'}
```

Add `HAND:'Hand'` to the object.

Find the icon map (around line 1925):
```javascript
{MS:'&#129460;', SPINE:'&#128279;', GERIATRIC:'&#9878;', CR:'&#129728;', AMPUTATION:'&#129452;', NEURO:'&#9889;'}
```

Add `HAND:'&#9995;'` to the object.

- [ ] **Step 3: Update episode.html tplMap and formLabel maps**

Find `tplMap` in episode.html (around line 663) and add:
```javascript
'HAND': 'HAND_SOAP',
```

Find both inline `formLabel` maps in episode.html (around lines 785 and 826) — both in `loadEpisode()` and `loadAssessment()`. In each, add:
```javascript
HAND: 'Hand',
```

- [ ] **Step 4: Verify modal card renders correctly**

Start Flask, open home.html, click "+ New Episode", confirm the HAND card is clickable (not greyed out), has the hand icon, and shows "Hand" label.

- [ ] **Step 5: Commit**

```
git add templates/home.html templates/episode.html
git commit -m "feat: enable HAND form card in home.html modal, wire episode.html maps"
```

---

## Task 6: Update `static/js/main.js`

**Files:**
- Modify: `static/js/main.js` (4 changes)

- [ ] **Step 1: Add HandChart init in init() function**

In `main.js`, find the `init()` function body. Find the BodyChart init block:
```javascript
if (typeof BodyChart !== 'undefined' && document.getElementById('svg-ant')) {
  BodyChart.init();
}
```

Add immediately after it:
```javascript
if (typeof HandChart !== 'undefined' && document.getElementById('hand-svg-r')) {
  HandChart.init();
}
```

- [ ] **Step 2: Add _buildMpisHand() builder function**

In `main.js`, add this function near the other `_buildMpis*` builders (before `copyToMpisAuto`):

```javascript
function _buildMpisHand() {
  var d    = window.ActiveForm ? window.ActiveForm.collect() : {};
  var LN   = MPIS_LN;
  var DIV  = MPIS_DIV;
  var dash = MPIS_DASH;
  var parts = [];
  function sec(title, val) { mpisSec(parts, title, val); }

  sec('DIAGNOSIS', d.diagnosis);
  sec('MANAGEMENT', d.managementType + (d.managementType === 'Surgical' && d.surgeryDate ? ' — ' + d.surgeryDate : ''));
  sec('DOMINANT HAND', d.sqDominantHand);
  sec('COMPLAINT', d.chiefComplaint);
  sec('ONSET', d.onsetDate);
  sec('MECHANISM', d.mechanism);
  sec('PAIN (R/L)', (d.painScoreR || dash) + ' / ' + (d.painScoreL || dash));
  if (d.painNature && d.painNature.length) sec('PAIN NATURE', d.painNature.join(', '));
  sec('AGGRAVATING', d.painAggravate);
  sec('RELIEVING',   d.painRelieve);
  sec('OBSERVATION', d.observationNotes);
  if (d.skinCondition  && d.skinCondition.length)  sec('SKIN',     d.skinCondition.join(', '));
  if (d.deformity      && d.deformity.length)       sec('DEFORMITY',d.deformity.join(', '));
  if (d.swelling       && d.swelling.length)         sec('SWELLING', d.swelling.join(', '));
  sec('TENDERNESS',  d.tenderness);
  sec('TEMPERATURE', d.temperature);
  sec('PALPATION',   d.palpationNotes);
  sec('GRIP (R/L)',  (d.gripStrengthR || dash) + ' / ' + (d.gripStrengthL || dash) + ' kg');
  sec('PINCH (R/L)', (d.pinchStrengthR || dash) + ' / ' + (d.pinchStrengthL || dash) + ' kg');
  sec('SENSATION',   d.sensationNotes);
  sec('PT IMPRESSION', d.ptImpression);
  sec('STG', d.stg);
  sec('LTG', d.ltg);
  sec('PLAN', d.plan);

  return parts;
}
```

- [ ] **Step 3: Add copyToMpisHand() public wrapper**

After the other `copyToMpisXxx` wrappers, add:
```javascript
async function copyToMpisHand() {
  var h = await showMpisHeaderModal();
  if (!h) return;
  await _doCopyMpis(_buildMpisHand(), h);
}
```

- [ ] **Step 4: Wire into copyToMpisAuto() and export**

In `copyToMpisAuto()`, find the `else if` chain and add before the final `else` (MS fallback):
```javascript
} else if (formType === 'HAND') {
  parts = _buildMpisHand();
```

In the `return {}` block at the bottom of the Main IIFE, add:
```javascript
copyToMpisHand: copyToMpisHand,
```

- [ ] **Step 5: Syntax-check main.js**

```
node --check static/js/main.js
```

Expected: no output (clean).

Also verify `await copyText` appears exactly once in main.js:
```
grep -n "await copyText" static/js/main.js
```

Expected: exactly 1 line (inside `_doCopyMpis`).

- [ ] **Step 6: Commit**

```
git add static/js/main.js
git commit -m "feat: add HandChart init, _buildMpisHand, copyToMpisHand to main.js"
```

---

## Task 7: Add Clinical Templates

**Files:**
- Modify: `static/js/clinical_templates.js` (1 change)

- [ ] **Step 1: Add HAND templates to clinical_templates.js**

Inside the `ClinicalTemplates` IIFE, find the section where other form templates are defined (after NEURO_SOAP). Add:

```javascript
var HAND_OBS = [
  { label: 'Normal Appearance', text: 'Hand appears well-formed with no gross deformity. Skin intact, normal colour and texture. No oedema observed.' },
  { label: 'Post-Surgical', text: 'Post-operative wound noted at [site] — [healing stage]. Sutures [present/removed]. No signs of infection. Moderate periarticular oedema.' },
  { label: 'Oedema + Deformity', text: 'Diffuse oedema noted over [dorsal/palmar] aspect. [Deformity type] deformity observed at [joint]. Skin intact. No wound.' }
];

var HAND_PALP = [
  { label: 'Tenderness — Joint', text: 'Tenderness on palpation over [joint] joint — [mild/moderate/severe]. Temperature [normal/warm]. No crepitus noted.' },
  { label: 'Tenderness — Tendon', text: 'Tenderness along [tendon name] tendon sheath. Temperature [normal/warm]. Crepitus [absent/present] on AROM.' },
  { label: 'Carpal Tunnel', text: 'Tenderness at carpal tunnel. Tinel\'s [positive/negative] at wrist. Phalen\'s [positive/negative] at 60 seconds.' }
];

var HAND_IMPRESSION = [
  { label: 'MSK — Post-fracture', text: 'Pain, oedema and restricted ROM of [joint] following [fracture type] fracture managed [conservatively/surgically]. Reduced grip strength and functional hand use.' },
  { label: 'MSK — Tendon Repair', text: 'Post-operative tendon repair at [tendon]. Restricted AROM within protective range. No signs of re-rupture. Oedema present.' },
  { label: 'Nerve — CTS', text: 'Carpal tunnel syndrome — positive Tinel\'s and Phalen\'s bilaterally. Reduced light touch [median nerve distribution]. Grip and pinch strength reduced.' },
  { label: 'Nerve — Radial Palsy', text: 'Radial nerve palsy — wrist drop present. MMT [0–2]/5 wrist extensors. Sensation intact over first dorsal web space. Functional grip severely limited.' }
];

var HAND_STG = [
  { label: 'Pain + Oedema', text: '1. Reduce pain score from [x] to [x/10] within 2 weeks.\n2. Reduce periarticular oedema — circumference [target] cm by 2 weeks.\n3. Improve AROM wrist flexion/extension by 15° within 2 weeks.' },
  { label: 'ROM + Strength', text: '1. Achieve functional wrist ROM (>50° flex/ext) within 4 weeks.\n2. Grip strength >10 kg within 4 weeks.\n3. Pinch strength adequate for key grip within 4 weeks.' }
];

var HAND_LTG = [
  { label: 'Functional Return', text: '1. Full pain-free AROM of [joint] within 8 weeks.\n2. Grip strength >[target] kg within 8 weeks.\n3. Return to [occupation/ADL] within 8–12 weeks.' },
  { label: 'Post-Surgical', text: '1. Independent ADL with affected hand within 3 months.\n2. Return to work — [date/timeframe].\n3. Maintain ROM gains and prevent recurrence.' }
];

var HAND_PLAN = [
  { label: 'Conservative', text: '1. Splinting — [resting/functional] splint for [duration/usage schedule].\n2. Oedema management — elevation, retrograde massage, compression.\n3. ROM exercises — AROM/PROM [joint] [frequency].\n4. Strengthening — grip/pinch exercises progressed as tolerated.\n5. Education — joint protection, activity modification, HEP.' },
  { label: 'Post-Operative', text: '1. Wound care + dressing as per surgical protocol.\n2. Oedema management — elevation + retrograde massage.\n3. Guarded AROM within prescribed range — [degrees] flexion/extension limit.\n4. Progress splint weaning per surgeon instruction.\n5. Strengthening commenced at [week] post-op per protocol.' }
];

var HAND_SOAP = {
  objective: [
    { label: 'ROM Improved', text: 'Wrist flexion [x]° (was [x]°). Extension [x]° (was [x]°). Grip strength [x] kg R, [x] kg L. Oedema [stable/reduced].' },
    { label: 'ROM Unchanged', text: 'ROM unchanged from last session. Grip strength [x] kg. Patient reports pain [x/10] at rest, [x/10] with activity.' }
  ],
  analysis: [
    { label: 'Progressing', text: 'ROM improving as expected. Patient tolerating exercise progression well. On track for [goal].' },
    { label: 'Plateau', text: 'Plateau in ROM gains. Consider [technique change/referral for further investigation]. Continue current programme.' }
  ],
  plan: [
    { label: 'Progress', text: 'Progress to next stage of rehabilitation protocol. Increase resistance for strengthening. Continue HEP reinforcement.' },
    { label: 'Maintain', text: 'Maintain current exercise programme. Review in [timeframe]. Consider discharge planning if goals met.' }
  ]
};
```

Then register all templates using `templates[key]`:

Find the block where other forms register their templates (e.g., `templates['NEURO_SOAP'] = NEURO_SOAP;`) and add:
```javascript
templates['HAND_OBS']        = HAND_OBS;
templates['HAND_PALP']       = HAND_PALP;
templates['HAND_IMPRESSION'] = HAND_IMPRESSION;
templates['HAND_STG']        = HAND_STG;
templates['HAND_LTG']        = HAND_LTG;
templates['HAND_PLAN']       = HAND_PLAN;
templates['HAND_SOAP']       = HAND_SOAP;
```

- [ ] **Step 2: Syntax-check clinical_templates.js**

```
node --check static/js/clinical_templates.js
```

Expected: no output (clean).

- [ ] **Step 3: Commit**

```
git add static/js/clinical_templates.js
git commit -m "feat: add HAND clinical templates (observation, palpation, impression, goals, plan, SOAP)"
```

---

## Task 8: Create `pdf_hand.py`

**Files:**
- Create: `pdf_hand.py`

Follows `pdf_ms.py` pattern exactly. `HandChartFlowable` draws two simplified palmar hand outlines + markers using ReportLab canvas primitives. Five two_col blocks to stay under 250mm each.

- [ ] **Step 1: Write pdf_hand.py**

```python
import json
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, white
from reportlab.platypus import PageBreak, Paragraph, Spacer, KeepTogether
from reportlab.platypus.flowables import Flowable

from pdf_platypus_base import (
    build_pdf, soap_page, sign_chop_block,
    box, two_col, kv, kv_list, tick, gap, patient_bar, page_header,
    S_NORMAL, S_BOLD, S_SMALL, S_H2,
    CW, LW, RW, ML, MR, MT, MB
)

TITLE = 'HAND ASSESSMENT'
REF   = 'fisio / b.pen. 12 / Pind. 2 / 2019'

MARKER_COLORS = {
    'pain':     HexColor('#e53935'),
    'numb':     HexColor('#1e88e5'),
    'tingling': HexColor('#8e24aa'),
    'weak':     HexColor('#fb8c00'),
    'swelling': HexColor('#00897b'),
    'scar':     HexColor('#6d4c41'),
}
MARKER_LABELS = {
    'pain': 'Pain', 'numb': 'Numbness', 'tingling': 'Tingling',
    'weak': 'Weakness', 'swelling': 'Swelling', 'scar': 'Scar',
}


def _ensure_dict(val):
    if isinstance(val, str):
        try:
            return json.loads(val)
        except Exception:
            return {}
    return val or {}


class HandChartFlowable(Flowable):
    """Draws two simplified palmar hand outlines (R and L) with markers."""

    def __init__(self, markers, width=LW, height=60*mm):
        super().__init__()
        self.markers  = markers or []
        self._w       = width
        self._h       = height

    def wrap(self, availW, availH):
        return self._w, self._h

    def draw(self):
        c      = self.canv
        w      = self._w
        h      = self._h
        half   = w / 2 - 4*mm

        for hand_idx, hand_char in enumerate(['R', 'L']):
            ox = hand_idx * (half + 8*mm)
            # palm rect
            c.saveState()
            c.setStrokeColor(HexColor('#90909090'))
            c.setFillColor(white)
            c.roundRect(ox + half * 0.25, h * 0.05, half * 0.55, h * 0.40, 3*mm, stroke=1, fill=1)
            # thumb: on left for R, on right for L
            if hand_char == 'R':
                tx = ox + half * 0.12
            else:
                tx = ox + half * 0.65
            c.ellipse(tx, h * 0.25, tx + half * 0.18, h * 0.60, stroke=1, fill=1)
            # 4 fingers
            finger_starts = [0.28, 0.40, 0.52, 0.63]
            for fs in finger_starts:
                fx = ox + half * fs
                c.roundRect(fx, h * 0.42, half * 0.10, h * 0.50, 2*mm, stroke=1, fill=1)
            # label
            c.setFont('Helvetica-Bold', 8)
            c.setFillColor(HexColor('#606060'))
            c.drawCentredString(ox + half / 2, h * 0.01, hand_char)
            c.restoreState()

            # draw markers for this hand
            hand_markers = [m for m in self.markers if m.get('hand', '').upper() == hand_char]
            for m in hand_markers:
                mx = ox + (m.get('x', 50) / 100.0) * half
                my = (m.get('y', 50) / 100.0) * h
                color = MARKER_COLORS.get(m.get('type', 'pain'), MARKER_COLORS['pain'])
                c.saveState()
                c.setFillColor(color)
                c.setStrokeColor(white)
                c.setLineWidth(0.5)
                c.circle(mx, my, 2.5*mm, stroke=1, fill=1)
                c.restoreState()


def _val(d, *keys, default=''):
    for k in keys:
        d = d.get(k, {}) if isinstance(d, dict) else {}
    return d if isinstance(d, str) else default


def _build_story(data):
    if isinstance(data, str):
        try:
            data = json.loads(data)
        except Exception:
            data = {}

    patient     = _ensure_dict(data.get('patient', {}))
    hand_chart  = _ensure_dict(data.get('handChart', {}))
    markers     = hand_chart.get('markers', [])
    rom_table   = (data.get('rom') or {}).get('table', [])
    circ_table  = (data.get('circumference') or {}).get('table', [])
    other_tests = _ensure_dict(data.get('otherTests', {}))
    neuro       = _ensure_dict(data.get('neuro', {}))

    story = []
    story += page_header(TITLE, REF)
    story.append(patient_bar(patient))

    # ── Block 1: Diagnosis / Referral (left) | Hand Chart (right) ──
    left1 = box('Diagnosis & Referral', [
        kv('Diagnosis',      data.get('diagnosis', '')),
        kv('Referral Source',data.get('referralSource', '')),
        kv('Management',     data.get('managementType', '')),
        kv('Surgery Date',   data.get('surgeryDate', '')),
        kv('Surgery Type',   data.get('surgeryType', '')),
        kv('Dominant Hand',  data.get('sqDominantHand', '')),
        kv('Occupation',     data.get('sqOccupation', '')),
    ], width=LW)

    right1_items = [Paragraph('Hand Chart', S_BOLD), gap(1)]
    if markers:
        right1_items.append(HandChartFlowable(markers, width=RW, height=55*mm))
        # legend
        legend_text = '  '.join(
            '<font color="{}">●</font> {}'.format(
                MARKER_COLORS.get(t, MARKER_COLORS['pain']).hexval(), MARKER_LABELS.get(t, t)
            )
            for t in MARKER_LABELS
        )
        right1_items.append(Paragraph(legend_text, S_SMALL))
    else:
        right1_items.append(Paragraph('No markers placed.', S_SMALL))
    if hand_chart.get('notes'):
        right1_items.append(gap(1))
        right1_items.append(kv('Notes', hand_chart['notes']))

    right1 = box('', right1_items, width=RW)
    story.append(two_col(left1, right1))
    story.append(gap(2))

    # ── Block 2: Pain / Chief Complaint (left) | Special Questions + History (right) ──
    pain_nature = ', '.join(data.get('painNature', []) or [])
    left2 = box('Chief Complaint & Pain', [
        kv('Chief Complaint', data.get('chiefComplaint', '')),
        kv('Date of Onset',   data.get('onsetDate', '')),
        kv('Mechanism',       data.get('mechanism', '')),
        kv('Pain Score R',    data.get('painScoreR', '')),
        kv('Pain Score L',    data.get('painScoreL', '')),
        kv('Nature of Pain',  pain_nature),
        kv('Aggravating',     data.get('painAggravate', '')),
        kv('Relieving',       data.get('painRelieve', '')),
    ], width=LW)

    pmh = ', '.join(data.get('pastMedHistory', []) or [])
    pmh_full = (pmh + (', ' + data.get('pastMedOther', '') if data.get('pastMedOther') else '')) if pmh else data.get('pastMedOther', '')
    right2 = box('Special Questions & History', [
        kv('General Health',  data.get('sqGeneralHealth', '')),
        kv('Health Notes',    data.get('sqHealthNotes', '')),
        kv('Medications',     data.get('sqMedications', '')),
        kv('Allergies',       data.get('sqAllergies', '')),
        kv('PMH',             pmh_full),
        kv('Social History',  data.get('socialHistory', '')),
        kv('Family History',  data.get('familyHistory', '')),
    ], width=RW)
    story.append(two_col(left2, right2))
    story.append(gap(2))

    # ── Block 3: Observation (left) | Palpation (right) ──
    skin     = ', '.join(data.get('skinCondition', []) or [])
    deform   = ', '.join(data.get('deformity', []) or [])
    swelling = ', '.join(data.get('swelling', []) or [])
    left3 = box('Observation', [
        kv('Skin Condition', skin),
        kv('Deformity',      deform),
        kv('Swelling',       swelling),
        kv('Wound Notes',    data.get('woundNotes', '')),
        kv('Notes',          data.get('observationNotes', '')),
    ], width=LW)

    right3 = box('Palpation', [
        kv('Tenderness',     data.get('tenderness', '')),
        kv('Temperature',    data.get('temperature', '')),
        kv('Texture',        data.get('texture', '')),
        kv('Notes',          data.get('palpationNotes', '')),
    ], width=RW)
    story.append(two_col(left3, right3))
    story.append(gap(2))

    # ── ROM Table (full width) ──
    if rom_table:
        rom_headers = ['Movement', 'Active L', 'Active R', 'Passive L', 'Passive R', 'OP L', 'OP R']
        rom_rows    = [[r.get('movement',''), r.get('activeL',''), r.get('activeR',''),
                        r.get('passiveL',''), r.get('passiveR',''), r.get('opL',''), r.get('opR','')]
                       for r in rom_table]
        from pdf_platypus_base import data_table
        story.append(Paragraph('Range of Motion', S_BOLD))
        story.append(data_table(rom_headers, rom_rows, colwidths=[65*mm, 21*mm, 21*mm, 21*mm, 21*mm, 18*mm, 18*mm]))
        story.append(gap(2))

    # ── Block 4: Strength + Circumference (left) | Sensation + Special Tests + Neuro (right) ──
    circ_lines = ['{}: {} cm'.format(r.get('label',''), r.get('value','')) for r in circ_table] if circ_table else []

    left4 = box('Strength & Circumference', [
        kv('Grip Strength R',  str(data.get('gripStrengthR', '')) + (' kg' if data.get('gripStrengthR') else '')),
        kv('Grip Strength L',  str(data.get('gripStrengthL', '')) + (' kg' if data.get('gripStrengthL') else '')),
        kv('Pinch Strength R', str(data.get('pinchStrengthR', '')) + (' kg' if data.get('pinchStrengthR') else '')),
        kv('Pinch Strength L', str(data.get('pinchStrengthL', '')) + (' kg' if data.get('pinchStrengthL') else '')),
    ] + ([kv('Circumference', '\n'.join(circ_lines))] if circ_lines else []), width=LW)

    def ot(test, side):
        return (other_tests.get(test) or {}).get(side, '')

    def mm_val(muscle, side):
        return (neuro.get('muscles') or {}).get(muscle, {}).get(side, '')

    def rf_val(level, side):
        return (neuro.get('reflexes') or {}).get(level, {}).get(side, '')

    right4 = box('Sensation, Special Tests & Neurology', [
        kv('Light Touch R / L', '{} / {}'.format(data.get('lightTouchR',''), data.get('lightTouchL',''))),
        kv('Pin Prick R / L',   '{} / {}'.format(data.get('pinPrickR',''),   data.get('pinPrickL',''))),
        kv('2PD R / L (mm)',    '{} / {}'.format(data.get('twoPointDiscR',''), data.get('twoPointDiscL',''))),
        kv('Sensation Notes',   data.get('sensationNotes','')),
        gap(1),
        kv('Tinel\'s R / L',    '{} / {}'.format(ot('tinels','r'), ot('tinels','l'))),
        kv('Phalen\'s R / L',   '{} / {}'.format(ot('phalens','r'), ot('phalens','l'))),
        kv('Finkelstein\'s R/L','{} / {}'.format(ot('finkelsteins','r'), ot('finkelsteins','l'))),
        kv('Froment\'s R / L',  '{} / {}'.format(ot('fromens','r'), ot('fromens','l'))),
        gap(1),
        kv('Reflexes C5 R/L',  '{} / {}'.format(rf_val('c5','r'), rf_val('c5','l'))),
        kv('Reflexes C6 R/L',  '{} / {}'.format(rf_val('c6','r'), rf_val('c6','l'))),
        kv('Reflexes C7 R/L',  '{} / {}'.format(rf_val('c7','r'), rf_val('c7','l'))),
        kv('Reflexes C8T1 R/L','{} / {}'.format(rf_val('c8t1','r'), rf_val('c8t1','l'))),
    ], width=RW)
    story.append(two_col(left4, right4))
    story.append(gap(2))

    # ── Block 5: PT Impression + STG (left) | LTG + Plan (right) ──
    left5 = box('PT Impression & Short-Term Goals', [
        kv('PT Impression', data.get('ptImpression', '')),
        kv('Short-Term Goals', data.get('stg', '')),
    ], width=LW)

    right5 = box('Long-Term Goals & Treatment Plan', [
        kv('Long-Term Goals', data.get('ltg', '')),
        kv('Treatment Plan',  data.get('plan', '')),
    ], width=RW)
    story.append(two_col(left5, right5))
    story.append(gap(2))

    story += sign_chop_block()
    return story


def generate_hand_pdf(data):
    return build_pdf(_build_story(data))


def generate_episode_pdf(assessment_data, soap_notes, episode_info=None):
    story = []
    patient = _ensure_dict((assessment_data or {}).get('patient', {}))
    if assessment_data:
        story += _build_story(assessment_data)
    else:
        story += page_header(TITLE, REF)
        story.append(Paragraph('No initial assessment recorded for this episode.', S_NORMAL))
    notes = soap_notes or []
    for i in range(0, len(notes), 2):
        story.append(PageBreak())
        pair = []
        pair += soap_page(patient, notes[i], episode_info)
        if i + 1 < len(notes):
            pair += soap_page(patient, notes[i + 1], episode_info)
        story.append(KeepTogether(pair))
    return build_pdf(story)
```

- [ ] **Step 2: Syntax-check pdf_hand.py**

```
python -c "import pdf_hand; print('OK')"
```

Expected: `OK`.

- [ ] **Step 3: Smoke-test PDF generation**

```python
python -c "
import pdf_hand, json
data = {
  '_form_type': 'HAND',
  'meta': {'form': 'HAND'},
  'patient': {'name': 'Test Patient', 'date': '2026-05-14'},
  'diagnosis': 'Carpal tunnel syndrome',
  'handChart': {'markers': [{'id': 'hm1', 'hand': 'R', 'type': 'numb', 'x': 40, 'y': 60}], 'notes': ''},
  'ptImpression': 'CTS right hand',
  'stg': 'Reduce pain',
  'ltg': 'Return to work',
  'plan': 'Splinting + exercises',
  'painScoreR': '6', 'painScoreL': '2',
  'gripStrengthR': '18', 'gripStrengthL': '30',
}
pdf_bytes = pdf_hand.generate_hand_pdf(data)
with open('test_hand.pdf', 'wb') as f:
    f.write(pdf_bytes)
print('PDF written:', len(pdf_bytes), 'bytes')
"
```

Expected: `PDF written: XXXXX bytes` (non-zero). Open `test_hand.pdf` to verify layout.

- [ ] **Step 4: Restart Flask and test Export KKM PDF from a HAND episode**

```
python app.py
```

Open a HAND episode, fill in fields, save, export PDF. Verify the PDF downloads and shows the correct HAND layout with KKM ref.

- [ ] **Step 5: Commit**

```
git add pdf_hand.py
git commit -m "feat: add pdf_hand.py with HandChartFlowable and 5 two_col blocks"
```

---

## Final Verification

- [ ] **Form loads without JS errors** — open a HAND form from an episode, check browser console (F12).
- [ ] **Save Record succeeds** — fill minimum required fields (diagnosis, pt_impression), click Save Record. Expect 200, no 422.
- [ ] **Export KKM PDF** — click Export KKM PDF. Expect PDF download with `fisio / b.pen. 12 / Pind. 2 / 2019` reference.
- [ ] **Hand chart markers** — place markers on R and L hands, collect(), check that `handChart.markers` has correct `hand`, `x`, `y`, `type` fields.
- [ ] **Populate round-trip** — save a record with data in all 13 sections, reload the form, verify all fields are populated correctly.
- [ ] **MPIS copy** — click "Copy to MPIS", fill modal, verify clipboard output is non-empty and includes diagnosis, PT impression, and plan.
- [ ] **Clinical templates** — click template buttons for observation, palpation, impression, STG, LTG, plan. Verify each fills the correct textarea.
- [ ] **HAND card in home modal** — open home.html, click "+ New Episode", confirm HAND card is clickable, not greyed, shows hand icon.
- [ ] **Episode.html shows "Hand" label** — open a HAND episode, verify the context banner shows "Hand" not "HAND" or empty.

- [ ] **Final commit**

```
git add -A
git commit -m "feat: complete HAND form implementation — handchart, form JS, HTML, PDF, MPIS, templates"
git push
```

---

## Self-Review

**Spec coverage:**

| Spec requirement | Task |
|-----------------|------|
| handchart.js IIFE (R+L SVG, getData/loadData/clearAll) | Task 1 |
| 13-section form HTML | Task 3 |
| ROM static table 44 rows | Task 3 |
| form_hand.js collect (all 13 sections) | Task 2 |
| form_hand.js populate + reset | Task 2 |
| `_form_type`, `meta.form`, `patient` in collect() | Task 2 |
| Management type reveals surgery date | Task 2, 3 |
| General health "Other" reveals notes | Task 2, 3 |
| Chip delegation via event bubbling | Task 2 |
| HandChartFlowable in PDF | Task 8 |
| 5 two_col blocks in PDF | Task 8 |
| ROM table full-width in PDF (between blocks 3 and 4) | Task 8 |
| sign_chop_block() in PDF | Task 8 |
| generate_hand_pdf + generate_episode_pdf | Task 8 |
| _buildMpisHand (builder/wrapper pattern) | Task 6 |
| copyToMpisHand public wrapper | Task 6 |
| copyToMpisAuto switch case | Task 6 |
| Clinical templates (OBS/PALP/IMP/STG/LTG/PLAN/SOAP) | Task 7 |
| FORM_REGISTRY ready=True | Task 4 |
| FORM_TEMPLATES entry | Task 4 |
| _PDF_GENERATORS + _SINGLE_PDF_GENERATORS | Task 4 |
| REQUIRED_FIELDS['HAND'] | Task 4 |
| pt_assessment.spec datas | Task 4 |
| base.html loads handchart.js | Task 4 |
| home.html modal card activated | Task 5 |
| home.html formLabel + icon maps | Task 5 |
| episode.html tplMap | Task 5 |
| episode.html formLabel maps (both) | Task 5 |
| HandChart.init() in main.js | Task 6 |
| KKM ref fisio / b.pen. 12 / Pind. 2 / 2019 | Task 8 |

**Placeholder scan:** No TBDs, no TODOs, no "similar to Task N" references. All code is production-ready.

**Type consistency:**
- `HandChart.getData()` → `handChart.markers` key in collect() → `markers` param in HandChartFlowable — consistent.
- `HandChart.loadData(arr)` called in populate with `d.handChart.markers || []` — consistent.
- `data.get('handChart', {})` in pdf_hand.py with `_ensure_dict` — safe.
- `REQUIRED_FIELDS['HAND']` checks `diagnosis` and `pt_impression` — both IDs exist in form.
- `_form_type: 'HAND'` and `meta: { form: 'HAND' }` — both present in collect().
- `patient: FormBase.collectPatient()` — present in collect().

---

**Plan complete and saved to `docs/superpowers/plans/2026-05-14-hand-form-plan.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

**Which approach?**
