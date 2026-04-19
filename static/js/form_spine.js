// form_spine.js — Spine assessment form specific logic
// Depends on: form_base.js, bodychart.js
// Registers itself as window.ActiveForm on load.

const FormSpine = (function () {

  var gv       = FormBase.gv;
  var sv       = FormBase.sv;
  var radio    = FormBase.radio;
  var setRadio = FormBase.setRadio;

  // ── Spine movement rows (fixed, not dynamic) ──────────
  var SPINE_MOVEMENTS = [
    'Flexion', 'Extension',
    'Lateral Flexion (L)', 'Lateral Flexion (R)',
    'Rotation (L)', 'Rotation (R)'
  ];

  // ── Neurodynamic tests ────────────────────────────────
  var NEURO_TESTS = [
    { id: 'pnf',    label: 'PNF',         neck: true,  back: false },
    { id: 'slr',    label: 'SLR',         neck: false, back: true  },
    { id: 'ultt1',  label: 'ULTT 1',      neck: true,  back: false },
    { id: 'ultt2a', label: 'ULTT 2a',     neck: true,  back: false },
    { id: 'ultt2b', label: 'ULTT 2b',     neck: true,  back: false },
    { id: 'ultt2c', label: 'ULTT 2c',     neck: true,  back: false },
    { id: 'slump',  label: 'Slump',       neck: false, back: true  },
    { id: 'pkb',    label: 'PKB / Quad',  neck: false, back: true  },
  ];

  var NEURO_OPTIONS = [
    { value: '',           label: '—' },
    { value: '+ve',        label: '+ve' },
    { value: '-ve',        label: '-ve' },
    { value: 'N/A',        label: 'N/A' },
    { value: 'Next visit', label: 'Next visit' },
  ];

  // ── PAIVM levels ──────────────────────────────────────
  var PAIVM_CERVICAL = ['C1','C2','C3','C4','C5','C6','C7'];
  var PAIVM_THORACIC = ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12'];
  var PAIVM_LUMBAR   = ['L1','L2','L3','L4','L5','S1'];

  var PAIVM_OPTIONS = [
    { value: '',           label: '—' },
    { value: 'Grade I',    label: 'Grade I' },
    { value: 'Grade II',   label: 'Grade II' },
    { value: 'Grade III',  label: 'Grade III' },
    { value: 'Grade IV',   label: 'Grade IV' },
    { value: 'Normal',     label: 'Normal' },
    { value: 'N/A',        label: 'N/A' },
    { value: 'Next visit', label: 'Next visit' },
  ];

  // ── Helpers ───────────────────────────────────────────
  function makeSelect(id, options, val) {
    var html = '<select id="' + id + '" class="spine-cell-sel">';
    options.forEach(function(o) {
      html += '<option value="' + o.value + '"' +
        (val === o.value ? ' selected' : '') + '>' + o.label + '</option>';
    });
    return html + '</select>';
  }

  // ── Irritability ──────────────────────────────────────
  function pickIrr(val) {
    document.querySelectorAll('.irr-chip').forEach(function(c) {
      c.className = 'irr-chip';
    });
    var chip = document.getElementById('irr-' + val);
    if (chip) chip.classList.add('sel-' + val);
  }

  function getIrr() {
    if (document.querySelector('.irr-chip.sel-High'))   return 'High';
    if (document.querySelector('.irr-chip.sel-Medium')) return 'Medium';
    if (document.querySelector('.irr-chip.sel-Low'))    return 'Low';
    return '';
  }

  // ── Management toggle ─────────────────────────────────
  function onMgmtChange() {
    var v = gv('dr-mgmt');
    var row = document.getElementById('surgery-row');
    if (row) row.className = 'surgery-row' + (v === 'Surgical' ? ' show' : '');
  }

  // ── Collect ───────────────────────────────────────────
  function collect(currentId) {
    // Spine movement table
    var movTable = SPINE_MOVEMENTS.map(function(mov) {
      var key = mov.replace(/[^a-z]/gi, '').toLowerCase();
      return {
        movement:    mov,
        activeRom:   gv('smov-active-'  + key),
        activePain:  gv('smov-apain-'   + key),
        passiveRom:  gv('smov-passive-' + key),
        overpress:   gv('smov-op-'      + key),
        endFeel:     gv('smov-ef-'      + key),
      };
    });

    // Neurodynamic tests
    var neuroTests = {};
    NEURO_TESTS.forEach(function(t) {
      neuroTests[t.id] = {
        leftNeck:  gv('nd-' + t.id + '-ln'),
        rightNeck: gv('nd-' + t.id + '-rn'),
        leftBack:  gv('nd-' + t.id + '-lb'),
        rightBack: gv('nd-' + t.id + '-rb'),
        notes:     gv('nd-' + t.id + '-notes'),
      };
    });

    // PAIVM
    function getPaivm(levels, prefix) {
      var result = {};
      levels.forEach(function(lv) {
        result[lv] = {
          central:    gv(prefix + '-' + lv + '-c'),
          unilateral: gv(prefix + '-' + lv + '-u'),
          pain:       gv(prefix + '-' + lv + '-p'),
        };
      });
      return result;
    }

    return {
      id:   currentId,
      _form_type: 'spine',
      meta: { form: 'SPINE', ref: 'fisio/b.pen.6/Pind.2/2019', saved: new Date().toISOString() },
      patient:    FormBase.collectPatient(),
      diagnosis:  gv('pt-diagnosis'),
      management: { type: gv('dr-mgmt'), surgeryDate: gv('surgery-date') },
      problem:    gv('pt-problem'),
      pain: {
        pre:          gv('pain-pre'),
        post:         gv('pain-post'),
        area:         gv('pain-area'),
        nature:       gv('pain-nature'),
        behaviour24:  gv('pain-24hr'),
        agg:          gv('pain-agg'),
        ease:         gv('pain-ease'),
        irritability: getIrr()
      },
      bodyChart: { markers: BodyChart.getData(), notes: gv('chart-notes') },
      history:   { current: gv('hx-current'), past: gv('hx-past') },
      specialQuestions: {
        health:        gv('sq-health'),
        pmhx:          gv('sq-pmhx'),
        surgery:       gv('sq-surgery'),
        investigation: gv('sq-invest'),
        medication:    gv('sq-med'),
        ce:            gv('sq-ce'),
        bedPillow:     gv('sq-bed'),
        occupation:    gv('sq-occ'),
        recreation:    gv('sq-rec'),
        social:        gv('sq-social'),
        pacemaker:     radio('pacemaker') || 'No'
      },
      observation: { general: gv('obs-general'), local: gv('obs-local') },
      spineMovement: movTable,
      accessory: {
        cervical:  getPaivm(PAIVM_CERVICAL, 'paivm-c'),
        thoracic:  getPaivm(PAIVM_THORACIC, 'paivm-t'),
        lumbar:    getPaivm(PAIVM_LUMBAR,   'paivm-l'),
        notes:     gv('paivm-notes'),
      },
      neurodynamic: {
        tests: neuroTests,
        notes: gv('nd-notes'),
      },
      neurological: {
        sensation: { left: gv('neuro-sens-l'), right: gv('neuro-sens-r'), notes: gv('neuro-sens-n') },
        reflex:    { left: gv('neuro-ref-l'),  right: gv('neuro-ref-r'),  notes: gv('neuro-ref-n') },
        motor:     { left: gv('neuro-mot-l'),  right: gv('neuro-mot-r'),  notes: gv('neuro-mot-n') },
        notes: gv('neuro-notes'),
      },
      palpation: {
        tenderness:  gv('palp-tender'),
        temperature: gv('palp-temp'),
        muscle:      gv('palp-muscle'),
        joint:       gv('palp-joint'),
      },
      plan: {
        impression: gv('plan-impression'),
        stg:        gv('plan-stg'),
        ltg:        gv('plan-ltg'),
        treatment:  gv('plan-tx'),
        review:     gv('plan-review'),
        remarks:    gv('plan-remarks'),
      }
    };
  }

  // ── Populate ──────────────────────────────────────────
  function populate(d) {
    if (!d) return;

    FormBase.populatePatient(d.patient);
    sv('pt-diagnosis', d.diagnosis);
    sv('pt-problem',   d.problem);

    if (d.management) {
      sv('dr-mgmt', d.management.type); onMgmtChange();
      sv('surgery-date', d.management.surgeryDate);
    }

    if (d.pain) {
      var pre  = d.pain.pre  || 0;
      var post = d.pain.post || 0;
      var preEl  = document.getElementById('pain-pre');
      var postEl = document.getElementById('pain-post');
      if (preEl)  { preEl.value  = pre;  setPainVal('pre',  pre);  }
      if (postEl) { postEl.value = post; setPainVal('post', post); }
      sv('pain-area',   d.pain.area);
      sv('pain-nature', d.pain.nature);
      sv('pain-24hr',   d.pain.behaviour24);
      sv('pain-agg',    d.pain.agg);
      sv('pain-ease',   d.pain.ease);
      if (d.pain.irritability) pickIrr(d.pain.irritability);
    }

    sv('chart-notes', d.bodyChart && d.bodyChart.notes);
    sv('hx-current',  d.history   && d.history.current);
    sv('hx-past',     d.history   && d.history.past);

    if (d.specialQuestions) {
      var sq = d.specialQuestions;
      sv('sq-health', sq.health); sv('sq-pmhx',   sq.pmhx);
      sv('sq-surgery',sq.surgery);sv('sq-invest', sq.investigation);
      sv('sq-med',    sq.medication); sv('sq-ce',  sq.ce);
      sv('sq-bed',    sq.bedPillow);  sv('sq-occ', sq.occupation);
      sv('sq-rec',    sq.recreation); sv('sq-social', sq.social);
      setRadio('pacemaker', sq.pacemaker || 'No');
    }

    // Spine movement
    if (d.spineMovement) {
      d.spineMovement.forEach(function(row) {
        var key = row.movement.replace(/[^a-z]/gi,'').toLowerCase();
        sv('smov-active-'  + key, row.activeRom);
        sv('smov-apain-'   + key, row.activePain);
        sv('smov-passive-' + key, row.passiveRom);
        sv('smov-op-'      + key, row.overpress);
        sv('smov-ef-'      + key, row.endFeel);
      });
    }

    // Neurodynamic
    if (d.neurodynamic && d.neurodynamic.tests) {
      NEURO_TESTS.forEach(function(t) {
        var td = d.neurodynamic.tests[t.id] || {};
        sv('nd-' + t.id + '-ln',    td.leftNeck);
        sv('nd-' + t.id + '-rn',    td.rightNeck);
        sv('nd-' + t.id + '-lb',    td.leftBack);
        sv('nd-' + t.id + '-rb',    td.rightBack);
        sv('nd-' + t.id + '-notes', td.notes);
      });
      sv('nd-notes', d.neurodynamic.notes);
    }

    // PAIVM
    if (d.accessory) {
      function setPaivm(levels, prefix, data) {
        if (!data) return;
        levels.forEach(function(lv) {
          var ldata = data[lv] || {};
          sv(prefix + '-' + lv + '-c', ldata.central);
          sv(prefix + '-' + lv + '-u', ldata.unilateral);
          sv(prefix + '-' + lv + '-p', ldata.pain);
        });
      }
      setPaivm(PAIVM_CERVICAL, 'paivm-c', d.accessory.cervical);
      setPaivm(PAIVM_THORACIC, 'paivm-t', d.accessory.thoracic);
      setPaivm(PAIVM_LUMBAR,   'paivm-l', d.accessory.lumbar);
      sv('paivm-notes', d.accessory.notes);
    }

    if (d.neurological) {
      var n = d.neurological;
      sv('neuro-sens-l', n.sensation && n.sensation.left);
      sv('neuro-sens-r', n.sensation && n.sensation.right);
      sv('neuro-sens-n', n.sensation && n.sensation.notes);
      sv('neuro-ref-l',  n.reflex    && n.reflex.left);
      sv('neuro-ref-r',  n.reflex    && n.reflex.right);
      sv('neuro-ref-n',  n.reflex    && n.reflex.notes);
      sv('neuro-mot-l',  n.motor     && n.motor.left);
      sv('neuro-mot-r',  n.motor     && n.motor.right);
      sv('neuro-mot-n',  n.motor     && n.motor.notes);
      sv('neuro-notes',  n.notes);
    }

    if (d.observation) {
      sv('obs-general', d.observation.general);
      sv('obs-local',   d.observation.local);
    }

    if (d.palpation) {
      sv('palp-tender', d.palpation.tenderness);
      sv('palp-temp',   d.palpation.temperature);
      sv('palp-muscle', d.palpation.muscle);
      sv('palp-joint',  d.palpation.joint);
    }

    if (d.plan) {
      sv('plan-impression', d.plan.impression);
      sv('plan-stg',        d.plan.stg);
      sv('plan-ltg',        d.plan.ltg);
      sv('plan-tx',         d.plan.treatment);
      sv('plan-review',     d.plan.review);
      sv('plan-remarks',    d.plan.remarks);
    }

    if (d.bodyChart && d.bodyChart.markers) {
      BodyChart.loadData(d.bodyChart.markers);
    }
  }

  // ── Pain value display ────────────────────────────────
  function setPainVal(id, v) {
    var n  = parseInt(v) || 0;
    var el = document.getElementById('pv-' + id);
    if (!el) return;
    el.textContent = n;
    el.className   = 'pain-val ' + (n <= 3 ? 'pv-low' : n <= 6 ? 'pv-mid' : 'pv-high');
  }

  // ── Reset ─────────────────────────────────────────────
  function reset() {
    FormBase.resetPatient();
    setPainVal('pre',  0); var pe = document.getElementById('pain-pre');  if(pe) pe.value = 0;
    setPainVal('post', 0); var po = document.getElementById('pain-post'); if(po) po.value = 0;
    var mgmt = document.getElementById('dr-mgmt'); if(mgmt) mgmt.value = '';
    var sr   = document.getElementById('surgery-row'); if(sr) sr.className = 'surgery-row';
    document.querySelectorAll('.irr-chip').forEach(function(c) { c.className = 'irr-chip'; });
    // Reset all selects in spine-specific sections
    document.querySelectorAll('.spine-cell-sel').forEach(function(el) { el.value = ''; });
    BodyChart.clearAll();
  }

  // ── Progress fields ───────────────────────────────────
  FormBase.setProgressFields([
    'pt-name', 'pt-date', 'pt-nric|pt-passport',
    'pt-diagnosis', 'hx-current', 'obs-general'
  ]);

  // ── Register as active form ───────────────────────────
  window.ActiveForm = {
    collect:  collect,
    populate: populate,
    reset:    reset
  };

  window.Form = {
    collect:        collect,
    populate:       populate,
    reset:          reset,
    onPtTypeChange: FormBase.onPtTypeChange,
    onNricInput:    FormBase.onNricInput,
    onMgmtChange:   onMgmtChange,
    setPain:        setPainVal,
    pickIrr:        pickIrr,
  };

  return window.ActiveForm;

})();
