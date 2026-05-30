// form_burn.js — Burn assessment form specific logic
// Depends on: form_base.js, bodychart.js, lungchart.js
// Registers BurnMov (IIFE) and FormBurn (window.ActiveForm / window.Form).

// ══════════════════════════════════════════════════════════════════════════════
// BurnMov — ROM mini-table v2
// Columns: Joint | Side | Plane (cascades off Joint) | Active | Passive | Remark
// ══════════════════════════════════════════════════════════════════════════════
var BurnMov = (function () {

  var _rows    = [];
  var _counter = 0;

  var _JOINTS = [
    'Neck', 'Shoulder', 'Elbow', 'Forearm', 'Wrist', 'Fingers (MCP)',
    'Fingers (PIP)', 'Hip', 'Knee', 'Ankle', 'Toes (MTP)',
    'Other (specify)'
  ];

  var _BURN_ROM_PLANES = {
    'Neck':          ['Flexion', 'Extension', 'Lateral flexion (L)', 'Lateral flexion (R)', 'Rotation (L)', 'Rotation (R)'],
    'Shoulder':      ['Flexion', 'Extension', 'Abduction', 'Adduction', 'Internal rotation', 'External rotation'],
    'Elbow':         ['Flexion', 'Extension'],
    'Forearm':       ['Pronation', 'Supination'],
    'Wrist':         ['Flexion', 'Extension', 'Radial deviation', 'Ulnar deviation'],
    'Fingers (MCP)': ['Flexion', 'Extension', 'Abduction', 'Adduction'],
    'Fingers (PIP)': ['Flexion', 'Extension'],
    'Hip':           ['Flexion', 'Extension', 'Abduction', 'Adduction', 'Internal rotation', 'External rotation'],
    'Knee':          ['Flexion', 'Extension'],
    'Ankle':         ['Dorsiflexion', 'Plantarflexion', 'Inversion', 'Eversion'],
    'Toes (MTP)':    ['Flexion', 'Extension']
  };

  var _SIDES = ['Left', 'Right', 'Bilateral'];

  var _REMARKS = [
    'Limited d/t pain',
    'Reduced ROM d/t dressing',
    'Limited d/t oedema',
    'Limited d/t graft/skin tightness',
    'Unable to assess',
    'Other (specify)'
  ];

  // ── Pair number inputs (start–end) ───────────────────────────────────────────
  function _pairInputs(field_start, field_end, rid, val_start, val_end) {
    function inp(field, val) {
      return '<input type="number" class="mov-cell-input" data-field="' + field + '" data-rid="' + rid +
        '" value="' + (val || '') + '" min="0" max="360" placeholder="\xb0" style="width:44px;text-align:center">';
    }
    return '<span style="display:inline-flex;align-items:center;gap:2px">' +
      inp(field_start, val_start) +
      '<span style="font-size:10px;color:var(--text-faint)">–</span>' +
      inp(field_end, val_end) +
      '</span>';
  }

  // ── Escape helper for attribute values ──────────────────────────────────────
  function _esc(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  function _render() {
    var tbody = document.getElementById('burn-mov-tbody');
    if (!tbody) return;

    if (!_rows.length) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-faint);font-style:italic;padding:16px;font-size:12px">No movements recorded — click Add Row</td></tr>';
      return;
    }

    var html = '';
    _rows.forEach(function (r) {
      // Joint select + other text
      var jointOpts = _JOINTS.map(function (j) {
        return '<option value="' + j + '"' + (r.joint === j ? ' selected' : '') + '>' + j + '</option>';
      }).join('');
      var otherDisplay = (r.joint === 'Other (specify)') ? '' : 'none';

      // Side select
      var sideOpts = '<option value="">—</option>' + _SIDES.map(function (s) {
        return '<option value="' + s + '"' + (r.side === s ? ' selected' : '') + '>' + s + '</option>';
      }).join('');

      // Plane: cascade select for known joints, free-text for Other
      var planeCell;
      if (r.joint === 'Other (specify)') {
        planeCell = '<input type="text" class="mov-cell-input" data-field="plane" data-rid="' + r.id + '"' +
          ' value="' + _esc(r.plane) + '" placeholder="Specify movement" style="width:100%">';
      } else {
        var planes = _BURN_ROM_PLANES[r.joint] || [];
        var planeOpts = '<option value="">— Select —</option>' + planes.map(function (p) {
          return '<option value="' + p + '"' + (r.plane === p ? ' selected' : '') + '>' + p + '</option>';
        }).join('');
        planeCell = '<select class="mov-cell-input" data-field="plane" data-rid="' + r.id + '">' + planeOpts + '</select>';
      }

      // Remark select + other text
      var remarkOpts = '<option value="">—</option>' + _REMARKS.map(function (k) {
        return '<option value="' + k + '"' + (r.remark === k ? ' selected' : '') + '>' + k + '</option>';
      }).join('');
      var remarkOtherDisplay = (r.remark === 'Other (specify)') ? '' : 'none';

      html += '<tr>' +
        '<td>' +
          '<select class="mov-cell-input" data-field="joint" data-rid="' + r.id + '">' +
            '<option value="">— Select —</option>' + jointOpts +
          '</select>' +
          '<input type="text" class="mov-cell-input" data-field="joint_other" data-rid="' + r.id + '"' +
            ' placeholder="Specify joint" value="' + _esc(r.joint_other) + '"' +
            ' style="display:' + otherDisplay + ';margin-top:4px;width:100%">' +
        '</td>' +
        '<td><select class="mov-cell-input" data-field="side" data-rid="' + r.id + '">' + sideOpts + '</select></td>' +
        '<td>' + planeCell + '</td>' +
        '<td>' + _pairInputs('active_start',  'active_end',  r.id, r.active_start,  r.active_end)  + '</td>' +
        '<td>' + _pairInputs('passive_start', 'passive_end', r.id, r.passive_start, r.passive_end) + '</td>' +
        '<td>' +
          '<select class="mov-cell-input" data-field="remark" data-rid="' + r.id + '">' + remarkOpts + '</select>' +
          '<input type="text" class="mov-cell-input" data-field="remark_other" data-rid="' + r.id + '"' +
            ' placeholder="Specify remark" value="' + _esc(r.remark_other) + '"' +
            ' style="display:' + remarkOtherDisplay + ';margin-top:4px;width:100%">' +
        '</td>' +
        '<td><button class="mov-del-btn" data-delid="' + r.id + '" title="Delete row">&times;</button></td>' +
        '</tr>';
    });
    tbody.innerHTML = html;

    // Wire joint select: sync → clear plane → re-render
    tbody.querySelectorAll('[data-field="joint"]').forEach(function (sel) {
      sel.addEventListener('change', function () {
        _syncFromDOM();
        var rid = parseInt(sel.dataset.rid);
        var row = _rows.find(function (r) { return r.id === rid; });
        if (row) row.plane = '';
        _render();
      });
    });

    // Wire remark select: sync → re-render (toggles remark_other visibility)
    tbody.querySelectorAll('[data-field="remark"]').forEach(function (sel) {
      sel.addEventListener('change', function () {
        _syncFromDOM();
        _render();
      });
    });

    // Wire all other inputs/selects
    tbody.querySelectorAll('[data-field]:not([data-field="joint"]):not([data-field="remark"])').forEach(function (el) {
      el.addEventListener('input',  _syncFromDOM);
      el.addEventListener('change', _syncFromDOM);
    });

    // Wire delete buttons
    tbody.querySelectorAll('[data-delid]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        deleteRow(parseInt(btn.dataset.delid));
      });
    });
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
      id:            id,
      joint:         (prefill && prefill.joint)         || '',
      joint_other:   (prefill && prefill.joint_other)   || '',
      side:          (prefill && prefill.side)          || '',
      plane:         (prefill && prefill.plane)         || '',
      active_start:  (prefill && prefill.active_start)  || '',
      active_end:    (prefill && prefill.active_end)    || '',
      passive_start: (prefill && prefill.passive_start) || '',
      passive_end:   (prefill && prefill.passive_end)   || '',
      remark:        (prefill && prefill.remark)        || '',
      remark_other:  (prefill && prefill.remark_other)  || ''
    });
    _render();
  }

  // ── Public: deleteRow ───────────────────────────────────────────────────────
  function deleteRow(id) {
    _rows = _rows.filter(function (r) { return r.id !== id; });
    _render();
  }

  // ── Public: getData ──────────────────────────────────────────────────────────
  function getData() {
    _syncFromDOM();
    return _rows.map(function (r) {
      var jointName  = (r.joint === 'Other (specify)') ? r.joint_other : r.joint;
      var remarkName = (r.remark === 'Other (specify)') ? r.remark_other : r.remark;
      return {
        joint:         jointName,
        side:          r.side,
        plane:         r.plane,
        active_start:  r.active_start,
        active_end:    r.active_end,
        passive_start: r.passive_start,
        passive_end:   r.passive_end,
        remark:        remarkName
      };
    });
  }

  // ── Public: loadData ─────────────────────────────────────────────────────────
  function loadData(data) {
    _rows    = [];
    _counter = 0;
    if (!data || !data.length) { _render(); return; }
    data.forEach(function (d) {
      var id        = _counter++;
      var inJoints  = _JOINTS.indexOf(d.joint)  !== -1;
      var inRemarks = _REMARKS.indexOf(d.remark) !== -1;
      _rows.push({
        id:            id,
        joint:         inJoints  ? d.joint  : 'Other (specify)',
        joint_other:   inJoints  ? ''       : (d.joint  || ''),
        side:          d.side          || '',
        plane:         d.plane         || '',
        active_start:  d.active_start  || '',
        active_end:    d.active_end    || '',
        passive_start: d.passive_start || '',
        passive_end:   d.passive_end   || '',
        remark:        inRemarks ? d.remark : (d.remark ? 'Other (specify)' : ''),
        remark_other:  inRemarks ? ''       : (d.remark || '')
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
