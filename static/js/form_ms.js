// form_ms.js — MS assessment form specific logic
// Depends on: form_base.js, bodychart.js, movement_table.js
// Registers itself as window.ActiveForm on load.

const FormMS = (function () {

  var gv       = FormBase.gv;
  var sv       = FormBase.sv;
  var radio    = FormBase.radio;
  var setRadio = FormBase.setRadio;

  // ── MS-specific UI handlers ───────────────────
  function onMgmtChange() {
    var v = gv('dr-mgmt');
    document.getElementById('surgery-row').className =
      'surgery-row' + (v === 'Surgical' ? ' show' : '');
  }

  function setPain(id, v) {
    var n  = parseInt(v);
    var el = document.getElementById('pv-' + id);
    if (!el) return;
    el.textContent = n;
    el.className   = 'pain-val ' + (n <= 3 ? 'pv-low' : n <= 6 ? 'pv-mid' : 'pv-high');
  }

  function pickIrr(val) {
    document.querySelectorAll('.irr-chip').forEach(function (c) {
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

  // ── Collect full MS assessment data ──────────
  function collect(currentId) {
    return {
      id:   currentId,
      meta: { form: 'MS', ref: 'fisio/b.pen.14/Pind.1/2019', saved: new Date().toISOString() },
      patient:    FormBase.collectPatient(),
      diagnosis:  gv('pt-diagnosis'),
      management: { type: gv('dr-mgmt'), surgeryDate: gv('surgery-date') },
      problem:    gv('pt-problem'),
      pain: {
        pre:          gv('pain-pre'),
        post:         gv('pain-post'),
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
        occupation:    gv('sq-occ'),
        recreation:    gv('sq-rec'),
        social:        gv('sq-social'),
        pacemaker:     radio('pacemaker') || 'No'
      },
      neurological: {
        sensation: { left: gv('neuro-sens-l'), right: gv('neuro-sens-r'), notes: gv('neuro-sens-n') },
        reflex:    { left: gv('neuro-ref-l'),  right: gv('neuro-ref-r'),  notes: gv('neuro-ref-n') },
        motor:     { left: gv('neuro-mot-l'),  right: gv('neuro-mot-r'),  notes: gv('neuro-mot-n') },
        notes: gv('neuro-notes')
      },
      observation: { general: gv('obs-general'), local: gv('obs-local') },
      palpation: {
        tenderness:  gv('palp-tender'),
        temperature: gv('palp-temp'),
        muscle:      gv('palp-muscle'),
        joint:       gv('palp-joint')
      },
      movement: {
        table:     MovementTable.getData(),
        accessory: gv('mov-accessory'),
        special:   gv('mov-special'),
        clearing:  gv('mov-clearing'),
        muscle:    gv('mov-muscle'),
        functional:gv('mov-func')
      },
      plan: {
        impression: gv('plan-impression'),
        stg:        gv('plan-stg'),
        ltg:        gv('plan-ltg'),
        treatment:  gv('plan-tx'),
        remarks:    gv('plan-remarks')
      }
    };
  }

  // ── Populate full MS form from data ──────────
  function populate(d) {
    if (!d) return;

    FormBase.populatePatient(d.patient);

    sv('pt-diagnosis', d.diagnosis);
    sv('pt-problem',   d.problem);

    if (d.management) {
      sv('dr-mgmt', d.management.type);
      onMgmtChange();
      sv('surgery-date', d.management.surgeryDate);
    }

    if (d.pain) {
      var pre  = d.pain.pre  || 0;
      var post = d.pain.post || 0;
      document.getElementById('pain-pre').value  = pre;  setPain('pre',  pre);
      document.getElementById('pain-post').value = post; setPain('post', post);
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
      sv('sq-health',  sq.health);    sv('sq-pmhx',   sq.pmhx);
      sv('sq-surgery', sq.surgery);   sv('sq-invest', sq.investigation);
      sv('sq-med',     sq.medication);sv('sq-occ',    sq.occupation);
      sv('sq-rec',     sq.recreation);sv('sq-social', sq.social);
      setRadio('pacemaker', sq.pacemaker || 'No');
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

    if (d.movement) {
      MovementTable.loadData(d.movement.table || []);
      sv('mov-accessory', d.movement.accessory);
      sv('mov-special',   d.movement.special);
      sv('mov-clearing',  d.movement.clearing);
      sv('mov-muscle',    d.movement.muscle);
      sv('mov-func',      d.movement.functional);
    }

    if (d.plan) {
      sv('plan-impression', d.plan.impression);
      sv('plan-stg',        d.plan.stg);
      sv('plan-ltg',        d.plan.ltg);
      sv('plan-tx',         d.plan.treatment);
      sv('plan-remarks',    d.plan.remarks);
    }

    if (d.bodyChart && d.bodyChart.markers) {
      BodyChart.loadData(d.bodyChart.markers);
    }
  }

  // ── Reset full MS form ────────────────────────
  function reset() {
    FormBase.resetPatient();
    setPain('pre',  0); document.getElementById('pain-pre').value  = 0;
    setPain('post', 0); document.getElementById('pain-post').value = 0;
    var mgmt = document.getElementById('dr-mgmt');
    if (mgmt) mgmt.value = '';
    var surgRow = document.getElementById('surgery-row');
    if (surgRow) surgRow.className = 'surgery-row';
    document.querySelectorAll('.irr-chip').forEach(function (c) {
      c.className = 'irr-chip';
    });
    BodyChart.clearAll();
    MovementTable.clear();
  }

  // ── Progress fields for this form ────────────
  FormBase.setProgressFields([
    'pt-name', 'pt-date', 'pt-nric|pt-passport',
    'pt-diagnosis', 'hx-current', 'obs-general'
  ]);

  // ── Register as the active form ───────────────
  window.ActiveForm = {
    collect:  collect,
    populate: populate,
    reset:    reset
  };

  // ── Keep old Form alias for backward compat ───
  // (in case anything still calls Form.xxx directly)
  window.Form = {
    collect:        collect,
    populate:       populate,
    reset:          reset,
    onPtTypeChange: FormBase.onPtTypeChange,
    onNricInput:    FormBase.onNricInput,
    onMgmtChange:   onMgmtChange,
    setPain:        setPain,
    pickIrr:        pickIrr
  };

  return window.ActiveForm;

})();
