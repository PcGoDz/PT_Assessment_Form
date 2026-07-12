// ncd_measure.js — NCD-only per-visit measurements panel inside the shared SOAP modal.
// Additive + form-type-guarded: on any non-NCD form the panel stays hidden and inert.
// Panel logic is kept OUT of episode.html's inline script to minimise edits to the
// shared file (RED LINE). Field keys are the FROZEN battery contract from form_ncd.js
// collect().measurements — 42 keys, verbatim. bmi/whr are COMPUTED, not read fields.

var NcdMeasure = (function () {

  // ── Frozen battery (exact keys from form_ncd.js:125-148) ──────────────
  // type: 'number' raw numeric input | 'text' free string (bp / notes) |
  //       'computed' derived read-only (bmi, whr) — never an input the user edits.
  var BATTERY = [
    { group: 'Vitals' },
    { key: 'hr',            label: 'HR',              type: 'number' },
    { key: 'rr',            label: 'RR',              type: 'number' },
    { key: 'bp',            label: 'BP',              type: 'text'   },
    { key: 'spo2',          label: 'SpO₂',            type: 'number' },
    { group: 'Bloods' },
    { key: 'fbs',           label: 'FBS',             type: 'number' },
    { key: 'hba1c',         label: 'HbA1c',           type: 'number' },
    { key: 'cholesterol',   label: 'Cholesterol',     type: 'number' },
    { key: 'ldl',           label: 'LDL',             type: 'number' },
    { key: 'hdl',           label: 'HDL',             type: 'number' },
    { key: 'triglycerides', label: 'Triglycerides',   type: 'number' },
    { group: 'Body Composition' },
    { key: 'height',        label: 'Height (cm)',     type: 'number' },
    { key: 'weight',        label: 'Weight (kg)',     type: 'number' },
    { key: 'bmi',           label: 'BMI',             type: 'computed' },
    { key: 'waist',         label: 'Waist (cm)',      type: 'number' },
    { key: 'hip',           label: 'Hip (cm)',        type: 'number' },
    { key: 'whr',           label: 'Waist/Hip',       type: 'computed' },
    { key: 'subfatWhole',   label: 'Subcut Fat Whole',type: 'number' },
    { key: 'subfatTrunk',   label: 'Subcut Fat Trunk',type: 'number' },
    { key: 'subfatArm',     label: 'Subcut Fat Arm',  type: 'number' },
    { key: 'subfatLeg',     label: 'Subcut Fat Leg',  type: 'number' },
    { key: 'muscleWhole',   label: 'Muscle Whole',    type: 'number' },
    { key: 'muscleTrunk',   label: 'Muscle Trunk',    type: 'number' },
    { key: 'muscleArm',     label: 'Muscle Arm',      type: 'number' },
    { key: 'muscleLeg',     label: 'Muscle Leg',      type: 'number' },
    { key: 'visceralFat',   label: 'Visceral Fat',    type: 'number' },
    { key: 'rmr',           label: 'RMR',             type: 'number' },
    { group: 'Fitness Tests' },
    { key: 'walk6Rpe',      label: '6MWT RPE',        type: 'number' },
    { key: 'walk6Bp',       label: '6MWT BP',         type: 'text'   },
    { key: 'walk6Hr',       label: '6MWT HR',         type: 'number' },
    { key: 'walk6Comment',  label: '6MWT Note',        type: 'text', note: true },
    { key: 'step3Hr',       label: '3-min Step HR',   type: 'number' },
    { key: 'step3Comment',  label: '3-min Step Note',  type: 'text', note: true },
    { key: 'sitReach',      label: 'Sit & Reach',     type: 'number' },
    { key: 'flexComment',   label: 'Flexibility Note', type: 'text', note: true },
    { key: 'handGrip',      label: 'Hand Grip (kg)',  type: 'number' },
    { key: 'sitUp',         label: 'Sit-up',          type: 'number' },
    { key: 'pushUp',        label: 'Push-up',         type: 'number' },
    { key: 'ulComment',     label: 'UL Strength Note', type: 'text', note: true },
    { key: 'sitToStand',    label: 'Sit-to-Stand',    type: 'number' },
    { key: 'llComment',     label: 'LL Strength Note', type: 'text', note: true },
    { key: 'stork',         label: 'Stork Balance',   type: 'number' },
    { key: 'balanceComment',label: 'Balance Note',     type: 'text', note: true }
  ];

  var _built = false;

  function el(id) { return document.getElementById('ncdm-' + id); }

  // ── Derived: BMI and WHR — SAME math as form_ncd.js _bmi()/_whr() ──────
  function _bmi() {
    var h = parseFloat(el('height').value), w = parseFloat(el('weight').value);
    return (h > 0 && w > 0) ? +((w / ((h / 100) * (h / 100))).toFixed(1)) : '';
  }
  function _whr() {
    var wa = parseFloat(el('waist').value), hp = parseFloat(el('hip').value);
    return (wa > 0 && hp > 0) ? +((wa / hp).toFixed(2)) : '';
  }
  function recompute() {
    var b = el('bmi'), w = el('whr');
    if (b) { var bv = _bmi(); b.value = (bv === '') ? '' : bv; }
    if (w) { var wv = _whr(); w.value = (wv === '') ? '' : wv; }
  }

  // ── Build the grid once ───────────────────────────────────────────────
  function buildGrid() {
    if (_built) return;
    var grid = document.getElementById('ncd-measure-grid');
    if (!grid) return;
    BATTERY.forEach(function (f) {
      if (f.group) {
        var h = document.createElement('div');
        h.textContent = f.group;
        h.style.cssText = 'grid-column:1/-1;font-size:10px;font-weight:600;text-transform:uppercase;' +
                          'letter-spacing:0.05em;color:var(--text-muted);margin-top:4px;';
        grid.appendChild(h);
        return;
      }
      var cell = document.createElement('div');
      cell.className = 'soap-form-field';
      var lab = document.createElement('label');
      lab.textContent = f.label;
      var inp = document.createElement('input');
      inp.id = 'ncdm-' + f.key;
      inp.autocomplete = 'off';
      if (f.type === 'number') { inp.type = 'text'; inp.inputMode = 'decimal'; }
      else if (f.type === 'computed') { inp.type = 'text'; inp.readOnly = true; inp.style.background = 'var(--surface2)'; inp.style.color = 'var(--text-muted)'; }
      else { inp.type = 'text'; }
      cell.appendChild(lab);
      cell.appendChild(inp);
      grid.appendChild(cell);
    });
    // Live recompute of bmi/whr when their inputs change.
    ['height', 'weight', 'waist', 'hip'].forEach(function (k) {
      var i = el(k);
      if (i) i.addEventListener('input', recompute);
    });
    _built = true;
  }

  // ── Public: show/hide based on form type, build grid on first NCD show ──
  function maybeShow(formType) {
    var panel = document.getElementById('ncd-measure-panel');
    if (!panel) return;
    if (formType === 'NCD') {
      buildGrid();
      panel.style.display = '';
    } else {
      panel.style.display = 'none';
    }
  }

  // ── Public: collect the measurements sub-dict (all 42 keys) ─────────────
  function collect() {
    var out = {};
    BATTERY.forEach(function (f) {
      if (f.group) return;
      if (f.type === 'computed') {
        out[f.key] = (f.key === 'bmi') ? _bmi() : _whr();
      } else {
        var i = el(f.key);
        out[f.key] = i ? i.value.trim() : '';
      }
    });
    return out;
  }

  // ── Public: fill the panel from a measurements dict ─────────────────────
  function populate(m) {
    m = m || {};
    BATTERY.forEach(function (f) {
      if (f.group || f.type === 'computed') return;
      var i = el(f.key);
      if (i) i.value = (m[f.key] != null) ? m[f.key] : '';
    });
    recompute();   // bmi/whr reflect populated height/weight/waist/hip
  }

  // ── Public: blank the panel ─────────────────────────────────────────────
  function clear() {
    BATTERY.forEach(function (f) {
      if (f.group) return;
      var i = el(f.key);
      if (i) i.value = '';
    });
  }

  // ── Public: prefill the row linked to THIS soap note (match by soap_id FK) ──
  function loadForSoap(episodeId, soapId) {
    fetch('/api/episodes/' + episodeId + '/ncd-measurements')
      .then(function (r) { return r.json(); })
      .then(function (rows) {
        var hit = (rows || []).filter(function (r) { return r.soap_id === soapId; })[0];
        if (hit) populate(hit.measurements || {});
        else clear();
      })
      .catch(function () { clear(); });
  }

  // ── Public: second-fetch save, linked to the soap note by soap_id ───────
  function save(episodeId, soapId) {
    var dateEl = document.getElementById('soap-date');
    return fetch('/api/episodes/' + episodeId + '/ncd-measurements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        soap_id:      soapId,
        note_date:    dateEl ? dateEl.value : '',
        measurements: collect()
      })
    });
  }

  return {
    maybeShow:   maybeShow,
    collect:     collect,
    populate:    populate,
    clear:       clear,
    loadForSoap: loadForSoap,
    save:        save
  };
})();
