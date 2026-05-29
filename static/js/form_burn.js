// form_burn.js — Burn assessment form specific logic
// Depends on: form_base.js, bodychart.js, lungchart.js
// Registers BurnMov (IIFE) and FormBurn (window.ActiveForm / window.Form).

// ══════════════════════════════════════════════════════════════════════════════
// BurnMov — private 3-column ROM mini-table (Joint / Active ROM / Passive ROM)
// Custom module because shared MovementTable is 9-column only.
// ══════════════════════════════════════════════════════════════════════════════
var BurnMov = (function () {

  var _rows    = [];
  var _counter = 0;

  var _JOINTS = [
    'Neck', 'Shoulder', 'Elbow', 'Wrist', 'Fingers (MCP)',
    'Fingers (PIP)', 'Hip', 'Knee', 'Ankle', 'Toes (MTP)',
    'Other (specify)'
  ];

  // ── Render ──────────────────────────────────────────────────────────────────
  function _render() {
    var tbody = document.getElementById('burn-mov-tbody');
    if (!tbody) return;

    var html = '';
    _rows.forEach(function (r) {
      var optHtml = _JOINTS.map(function (j) {
        return '<option value="' + j + '"' + (r.joint === j ? ' selected' : '') + '>' + j + '</option>';
      }).join('');

      var otherDisplay = (r.joint === 'Other (specify)') ? '' : 'none';

      html += '<tr>' +
        '<td>' +
          '<select class="mov-cell-input" data-field="joint" data-rid="' + r.id + '">' +
            '<option value="">— Select —</option>' +
            optHtml +
          '</select>' +
          '<input type="text" class="mov-cell-input" data-field="joint_other" data-rid="' + r.id + '"' +
            ' placeholder="Specify joint" value="' + _esc(r.joint_other) + '"' +
            ' style="display:' + otherDisplay + ';margin-top:4px;width:100%">' +
        '</td>' +
        '<td><input type="text" class="mov-cell-input" data-field="active" data-rid="' + r.id + '"' +
          ' value="' + _esc(r.active) + '" placeholder="e.g. 0–120°" style="width:100%"></td>' +
        '<td><input type="text" class="mov-cell-input" data-field="passive" data-rid="' + r.id + '"' +
          ' value="' + _esc(r.passive) + '" placeholder="e.g. 0–130°" style="width:100%"></td>' +
        '<td><button class="mov-del-btn" data-delid="' + r.id + '" title="Delete row">&times;</button></td>' +
        '</tr>';
    });
    tbody.innerHTML = html;

    // Wire events
    tbody.querySelectorAll('[data-field]').forEach(function (el) {
      if (el.tagName === 'SELECT' && el.dataset.field === 'joint') {
        el.addEventListener('change', function () { _syncFromDOM(); _render(); });
      } else {
        el.addEventListener('input', _syncFromDOM);
      }
    });

    // Wire delete buttons
    tbody.querySelectorAll('[data-delid]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        deleteRow(parseInt(btn.dataset.delid));
      });
    });
  }

  // ── Escape helper for attribute values ──────────────────────────────────────
  function _esc(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  }

  // ── Sync DOM → _rows ────────────────────────────────────────────────────────
  function _syncFromDOM() {
    var tbody = document.getElementById('burn-mov-tbody');
    if (!tbody) return;
    tbody.querySelectorAll('[data-rid][data-field]').forEach(function (el) {
      var rid   = parseInt(el.dataset.rid);
      var field = el.dataset.field;
      var row   = _rows.find(function (r) { return r.id === rid; });
      if (row && field) row[field] = el.value;
    });
  }

  // ── Public: init ────────────────────────────────────────────────────────────
  function init() {
    document.addEventListener('click', function (e) {
      if (e.target && e.target.id === 'burn-mov-add') {
        addRow();
      }
    });
    _render();
  }

  // ── Public: addRow ──────────────────────────────────────────────────────────
  function addRow(prefill) {
    var id = _counter++;
    _rows.push({
      id:          id,
      joint:       (prefill && prefill.joint)       || '',
      joint_other: (prefill && prefill.joint_other) || '',
      active:      (prefill && prefill.active)      || '',
      passive:     (prefill && prefill.passive)      || ''
    });
    _render();
  }

  // ── Public: deleteRow ───────────────────────────────────────────────────────
  function deleteRow(id) {
    _rows = _rows.filter(function (r) { return r.id !== id; });
    _render();
  }

  // ── Public: getData — emit bare joint name ───────────────────────────────────
  function getData() {
    _syncFromDOM();
    return _rows.map(function (r) {
      var jointName = (r.joint === 'Other (specify)') ? r.joint_other : r.joint;
      return { joint: jointName, active: r.active, passive: r.passive };
    });
  }

  // ── Public: loadData — round-trip detect ────────────────────────────────────
  function loadData(data) {
    _rows    = [];
    _counter = 0;
    if (!data || !data.length) { _render(); return; }
    data.forEach(function (d) {
      var id     = _counter++;
      var inList = _JOINTS.indexOf(d.joint) !== -1;
      _rows.push({
        id:          id,
        joint:       inList ? d.joint : 'Other (specify)',
        joint_other: inList ? '' : (d.joint || ''),
        active:      d.active  || '',
        passive:     d.passive || ''
      });
    });
    _render();
  }

  // ── Public: clear ────────────────────────────────────────────────────────────
  function clear() {
    _rows    = [];
    _counter = 0;
    _render();
  }

  return { init: init, addRow: addRow, deleteRow: deleteRow, getData: getData, loadData: loadData, clear: clear };

})();


// ══════════════════════════════════════════════════════════════════════════════
// FormBurn — main form module
// ══════════════════════════════════════════════════════════════════════════════
const FormBurn = (function () {

  var gv       = FormBase.gv;
  var sv       = FormBase.sv;
  var radio    = FormBase.radio;
  var setRadio = FormBase.setRadio;

  // ── Pain slider ──────────────────────────────────────────────────────────────
  function setPain(id, v) {
    var n  = parseInt(v);
    var el = document.getElementById('pv-' + id);
    if (!el) return;
    el.textContent = n;
    el.className   = 'pain-val ' + (n <= 3 ? 'pv-low' : n <= 6 ? 'pv-mid' : 'pv-high');
  }

  // ── Toggle helpers ────────────────────────────────────────────────────────────
  // Collect: build "Status — detail" string from two fields
  function _toggleVal(statusId, detailId) {
    var status = gv(statusId);
    var detail = gv(detailId);
    if (!status) return '';
    return detail ? status + ' — ' + detail : status;
  }

  // Populate: split "Status — detail" string and restore both fields
  function _splitToggle(combined, selectId, detailId, showVals) {
    if (!combined) return;
    var parts  = combined.split(' — ');
    var yn     = parts[0] || '';
    var det    = parts.slice(1).join(' — ') || '';
    sv(selectId, yn);
    if (det) {
      sv(detailId, det);
      var detEl = document.getElementById(detailId);
      if (detEl && showVals.indexOf(yn) !== -1) detEl.style.display = '';
    }
  }

  // ── collect ───────────────────────────────────────────────────────────────────
  function collect(currentId) {
    return {
      id:          currentId,
      _form_type:  'BURN',
      meta: { form: 'BURN', ref: 'fisio / b.pen. 5 / Pind. 2 / 2019', saved: new Date().toISOString() },
      patient:     FormBase.collectPatient(),
      diagnosis:   gv('diagnosis'),
      management:  gv('dr-mgmt'),
      problem:     gv('pt-problem'),
      pain: {
        pre:  gv('pain-pre'),
        post: gv('pain-post')
      },
      specialQuestions: {
        health:     gv('sq-health'),
        pmhx:       gv('sq-pmhx'),
        medication: gv('sq-med'),
        occupation: gv('sq-occ')
      },
      investigation: {
        wound_cs: _toggleVal('ix-wound-cs-status', 'ix-wound-cs-detail'),
        cxr:      _toggleVal('ix-cxr-status',      'ix-cxr-detail'),
        abg:      _toggleVal('ix-abg-status',       'ix-abg-detail')
      },
      history: {
        current: gv('hx-current')
      },
      associatedInjury: gv('assoc-injury'),
      bodyChart: {
        markers: (typeof BodyChart !== 'undefined') ? BodyChart.getData() : [],
        notes:   gv('chart-notes')
      },
      tbsa: gv('tbsa'),
      respiratory: {
        observation:      gv('resp-obs'),
        ventilated:       _toggleVal('resp-vent-yn',        'resp-vent-detail'),
        o2:               _toggleVal('resp-o2-yn',          'resp-o2-detail'),
        breathing_pattern: gv('obs-breathing-pattern'),
        cough_type:       gv('cough-type'),
        cough_effect:     gv('cough-effect'),
        hoarseness:       _toggleVal('resp-hoarseness-yn',  'resp-hoarseness-detail'),
        sputum: {
          colour:      gv('sputum-colour'),
          amount:      gv('sputum-amount'),
          consistency: gv('sputum-consistency')
        }
      },
      palpation: {
        expansion: {
          apical:       gv('exp-apical'),
          middle:       gv('exp-middle'),
          lower_costal: gv('exp-lower')
        },
        measurement: {
          apical:              gv('meas-apical'),
          apical_status:       gv('meas-apical-status'),
          middle:              gv('meas-middle'),
          middle_status:       gv('meas-middle-status'),
          lower_costal:        gv('meas-lower'),
          lower_costal_status: gv('meas-lower-status')
        }
      },
      auscultation: {
        lungs:       gv('ausc-lungs'),
        crepitation: gv('ausc-crep'),
        air_entry:   gv('ausc-air'),
        lung_map:    (typeof LungChart !== 'undefined') ? LungChart.getData() : {}
      },
      movement: BurnMov.getData(),
      mobility: {
        bed:      gv('mob-bed'),
        transfer: gv('mob-transfer')
      },
      gait: gv('gait-notes'),
      plan: {
        impression: gv('plan-impression'),
        stg:        gv('plan-stg'),
        ltg:        gv('plan-ltg'),
        treatment:  gv('plan-tx')
      }
    };
  }

  // ── populate ──────────────────────────────────────────────────────────────────
  function populate(d) {
    if (!d) return;

    FormBase.populatePatient(d.patient);

    sv('diagnosis',  d.diagnosis);
    sv('dr-mgmt',    d.management);
    sv('pt-problem', d.problem);

    if (d.pain) {
      var pre  = d.pain.pre  || 0;
      var post = d.pain.post || 0;
      var preEl  = document.getElementById('pain-pre');
      var postEl = document.getElementById('pain-post');
      if (preEl)  { preEl.value  = pre;  setPain('pre',  pre);  }
      if (postEl) { postEl.value = post; setPain('post', post); }
    }

    if (d.specialQuestions) {
      var sq = d.specialQuestions;
      sv('sq-health', sq.health);
      sv('sq-pmhx',   sq.pmhx);
      sv('sq-med',    sq.medication);
      sv('sq-occ',    sq.occupation);
    }

    if (d.investigation) {
      var ix = d.investigation;
      _splitToggle(ix.wound_cs, 'ix-wound-cs-status', 'ix-wound-cs-detail', ['Available']);
      _splitToggle(ix.cxr,      'ix-cxr-status',       'ix-cxr-detail',      ['Available']);
      _splitToggle(ix.abg,      'ix-abg-status',        'ix-abg-detail',      ['Available']);
    }

    if (d.history) {
      sv('hx-current', d.history.current);
    }

    sv('assoc-injury', d.associatedInjury);

    if (d.bodyChart) {
      if (typeof BodyChart !== 'undefined' && d.bodyChart.markers) {
        BodyChart.loadData(d.bodyChart.markers);
      }
      sv('chart-notes', d.bodyChart.notes);
    }

    sv('tbsa', d.tbsa);

    if (d.respiratory) {
      var resp = d.respiratory;
      sv('resp-obs', resp.observation);
      _splitToggle(resp.ventilated,       'resp-vent-yn',       'resp-vent-detail',       ['Yes']);
      _splitToggle(resp.o2,               'resp-o2-yn',         'resp-o2-detail',         ['Yes']);
      sv('obs-breathing-pattern', resp.breathing_pattern);
      sv('cough-type',            resp.cough_type);
      sv('cough-effect',          resp.cough_effect);
      _splitToggle(resp.hoarseness,       'resp-hoarseness-yn', 'resp-hoarseness-detail', ['Yes']);
      if (resp.sputum) {
        sv('sputum-colour',      resp.sputum.colour);
        sv('sputum-amount',      resp.sputum.amount);
        sv('sputum-consistency', resp.sputum.consistency);
      }
    }

    if (d.palpation) {
      var palp = d.palpation;
      var exp  = palp.expansion   || {};
      var meas = palp.measurement || {};
      sv('exp-apical', exp.apical);
      sv('exp-middle', exp.middle);
      sv('exp-lower',  exp.lower_costal);
      sv('meas-apical',       meas.apical);
      sv('meas-apical-status', meas.apical_status);
      sv('meas-middle',       meas.middle);
      sv('meas-middle-status', meas.middle_status);
      sv('meas-lower',        meas.lower_costal);
      sv('meas-lower-status', meas.lower_costal_status);
    }

    if (d.auscultation) {
      sv('ausc-lungs', d.auscultation.lungs);
      sv('ausc-crep',  d.auscultation.crepitation);
      sv('ausc-air',   d.auscultation.air_entry);
      if (d.auscultation.lung_map && typeof LungChart !== 'undefined') {
        LungChart.loadData(d.auscultation.lung_map);
      }
    }

    if (d.movement) {
      BurnMov.loadData(d.movement);
    }

    if (d.mobility) {
      sv('mob-bed',      d.mobility.bed);
      sv('mob-transfer', d.mobility.transfer);
    }

    sv('gait-notes', d.gait);

    if (d.plan) {
      sv('plan-impression', d.plan.impression);
      sv('plan-stg',        d.plan.stg);
      sv('plan-ltg',        d.plan.ltg);
      sv('plan-tx',         d.plan.treatment);
    }
  }

  // ── reset ─────────────────────────────────────────────────────────────────────
  function reset() {
    FormBase.resetPatient();

    // Sliders
    var preEl  = document.getElementById('pain-pre');
    var postEl = document.getElementById('pain-post');
    if (preEl)  { preEl.value  = 0; setPain('pre',  0); }
    if (postEl) { postEl.value = 0; setPain('post', 0); }

    // Plain text / textarea / select fields
    var plainIds = [
      'diagnosis', 'dr-mgmt', 'pt-problem',
      'sq-health', 'sq-pmhx', 'sq-med', 'sq-occ',
      'hx-current', 'assoc-injury', 'chart-notes', 'tbsa',
      'resp-obs', 'obs-breathing-pattern', 'cough-type', 'cough-effect',
      'sputum-colour', 'sputum-amount', 'sputum-consistency',
      'exp-apical', 'exp-middle', 'exp-lower',
      'meas-apical', 'meas-apical-status',
      'meas-middle', 'meas-middle-status',
      'meas-lower',  'meas-lower-status',
      'ausc-lungs', 'ausc-crep', 'ausc-air',
      'mob-bed', 'mob-transfer', 'gait-notes',
      'plan-impression', 'plan-stg', 'plan-ltg', 'plan-tx'
    ];
    plainIds.forEach(function (id) { sv(id, ''); });

    // Toggle status selects + hide detail fields
    var togglePairs = [
      ['ix-wound-cs-status', 'ix-wound-cs-detail'],
      ['ix-cxr-status',       'ix-cxr-detail'],
      ['ix-abg-status',       'ix-abg-detail'],
      ['resp-vent-yn',        'resp-vent-detail'],
      ['resp-o2-yn',          'resp-o2-detail'],
      ['resp-hoarseness-yn',  'resp-hoarseness-detail']
    ];
    togglePairs.forEach(function (pair) {
      sv(pair[0], '');
      var detEl = document.getElementById(pair[1]);
      if (detEl) {
        detEl.value        = '';
        detEl.style.display = 'none';
      }
    });

    // Charts
    if (typeof BodyChart !== 'undefined') BodyChart.clearAll();
    if (typeof LungChart  !== 'undefined') LungChart.clearAll();

    // ROM table
    BurnMov.clear();
  }

  // ── Progress fields ───────────────────────────────────────────────────────────
  FormBase.setProgressFields([
    'pt-name', 'pt-date', 'pt-nric|pt-passport',
    'diagnosis', 'pt-problem',
    'hx-current', 'plan-impression'
  ]);

  // ── Delegates ──────────────────────────────────────────────────────────────────
  function onPtTypeChange() { FormBase.onPtTypeChange(); }
  function onNricInput(v)   { FormBase.onNricInput(v);   }
  function onDobChange(v)   { FormBase.onDobChange(v);   }

  // ── Register ───────────────────────────────────────────────────────────────────
  var pub = {
    collect:        collect,
    populate:       populate,
    reset:          reset,
    setPain:        setPain,
    onPtTypeChange: onPtTypeChange,
    onNricInput:    onNricInput,
    onDobChange:    onDobChange
  };

  window.ActiveForm = pub;
  window.Form       = pub;

  return pub;

})();
