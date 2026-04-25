// form_cr.js — Cardiorespiratory assessment form specific logic
// Depends on: form_base.js
// Registers itself as window.ActiveForm on load.

const FormCR = (function () {

  var gv       = FormBase.gv;
  var sv       = FormBase.sv;
  var radio    = FormBase.radio;
  var setRadio = FormBase.setRadio;

  // ── Pain slider ───────────────────────────────
  function setPain(id, v) {
    var n  = parseInt(v);
    var el = document.getElementById('pv-' + id);
    if (!el) return;
    el.textContent = n;
    el.className   = 'pain-val ' + (n <= 3 ? 'pv-low' : n <= 6 ? 'pv-mid' : 'pv-high');
  }

  // ── Ventilated toggle ─────────────────────────
  function onVentChange() {
    var show = document.getElementById('vent-toggle') &&
               document.getElementById('vent-toggle').checked;
    var block = document.getElementById('vent-block');
    if (block) block.style.display = show ? '' : 'none';
  }

  function collect(currentId) {
    // Build smoking string from dropdown + detail
    var smokingYN  = gv('sq-smoking-yn');
    var smokingDet = gv('sq-smoking-detail');
    var smoking    = smokingDet ? smokingYN + ' — ' + smokingDet : smokingYN;

    var alcoholYN  = gv('sq-alcohol-yn');
    var alcoholDet = gv('sq-alcohol-detail');
    var alcohol    = alcoholDet ? alcoholYN + ' — ' + alcoholDet : alcoholYN;

    var surgeryYN  = gv('sq-surgery-yn');
    var surgeryDet = gv('sq-surgery-detail');
    var surgery    = surgeryDet ? surgeryYN + ' — ' + surgeryDet : surgeryYN;

    var funcYN     = gv('sq-func-yn');
    var funcDet    = gv('sq-func-detail');
    var funcLimit  = funcDet ? funcYN + ' — ' + funcDet : funcYN;

    var drainYN    = gv('obs-chest-drain-yn');
    var drainDet   = gv('obs-chest-drain-detail');
    var drain      = drainDet ? drainYN + ' — ' + drainDet : drainYN;

    return {
      id:   currentId,
      meta: { form: 'CR', ref: 'fisio / b.pen. 11 / Pind.2 / 2019', saved: new Date().toISOString() },
      patient:    FormBase.collectPatient(),
      diagnosis:  gv('pt-diagnosis'),
      problem:    gv('pt-problem'),
      management: { type: gv('dr-mgmt') },
      pain: { pre: gv('pain-pre'), post: gv('pain-post') },
      specialQuestions: {
        health:                gv('sq-health'),
        pmhx:                  gv('sq-pmhx'),
        surgery:               surgery,
        medication:            gv('sq-med'),
        occupation:            gv('sq-occ'),
        functional_limitation: funcLimit,
        smoking:               smoking,
        alcohol:               alcohol
      },
      investigation: {
        cxr:   gv('ix-cxr'),
        abg:   gv('ix-abg'),
        other: gv('ix-other')
      },
      history: { current: gv('hx-current'), past: gv('hx-past') },
      observation: {
        vital_signs: {
          temp: gv('vs-temp'), rr: gv('vs-rr'), pr: gv('vs-pr'),
          bp:   gv('vs-bp'),   spo2: gv('vs-spo2')
        },
        breathing_pattern: gv('obs-breathing-pattern'),
        breathing_level:   gv('obs-breathing-level'),
        chest_deformity:   gv('obs-chest-deformity'),
        chest_drain:       drain,
        cough_type:        gv('cough-type'),
        cough_effect:      gv('cough-effect'),
        sputum: {
          colour:      gv('sputum-colour'),
          amount:      gv('sputum-amount'),
          consistency: gv('sputum-consistency')
        },
        o2_treatment: gv('obs-o2')
      },
      ventilated: {
        mode: gv('vent-mode'),
        peep: gv('vent-peep'),
        fio2: gv('vent-fio2')
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
      specialTest: {
        '6mwt': {
          distance: gv('mwt-dist'),
          pr_pre:   gv('mwt-pr-pre'),  pr_post:  gv('mwt-pr-post'),
          rpe_pre:  gv('mwt-rpe-pre'), rpe_post: gv('mwt-rpe-post'),
          remarks:  gv('mwt-remarks')
        },
        pefr:                 gv('st-pefr'),
        incentive_spirometer: gv('st-is')
      },
      plan: {
        impression: gv('plan-impression'),
        stg:        gv('plan-stg'),
        ltg:        gv('plan-ltg'),
        treatment:  gv('plan-tx')
      }
    };
  }

  function _splitToggle(combined, selectId, detailId, showVals) {
    if (!combined) return;
    var parts = combined.split(' — ');
    var yn    = parts[0] || '';
    var det   = parts.slice(1).join(' — ') || '';
    sv(selectId, yn);
    if (det) {
      sv(detailId, det);
      var detEl = document.getElementById(detailId);
      if (detEl && showVals.indexOf(yn) !== -1) detEl.style.display = '';
    }
  }

  // ── Populate full CR form from data ──────────
  function populate(d) {
    if (!d) return;

    FormBase.populatePatient(d.patient);
    sv('pt-diagnosis', d.diagnosis);
    sv('pt-problem',   d.problem);
    sv('dr-mgmt',      d.management && d.management.type);

    if (d.pain) {
      var pre  = d.pain.pre  || 0;
      var post = d.pain.post || 0;
      document.getElementById('pain-pre').value  = pre;  setPain('pre',  pre);
      document.getElementById('pain-post').value = post; setPain('post', post);
    }

    if (d.specialQuestions) {
      var sq = d.specialQuestions;
      sv('sq-health', sq.health);
      sv('sq-pmhx',   sq.pmhx);
      sv('sq-med',    sq.medication);
      sv('sq-occ',    sq.occupation);
      _splitToggle(sq.surgery,               'sq-surgery-yn', 'sq-surgery-detail', ['Yes']);
      _splitToggle(sq.functional_limitation, 'sq-func-yn',    'sq-func-detail',    ['Yes']);
      _splitToggle(sq.smoking,               'sq-smoking-yn', 'sq-smoking-detail', ['Ex-smoker','Current smoker']);
      _splitToggle(sq.alcohol,               'sq-alcohol-yn', 'sq-alcohol-detail', ['Yes']);
    }

    if (d.investigation) {
      var ix = d.investigation;
      sv('ix-cxr',   ix.cxr);
      sv('ix-abg',   ix.abg);
      sv('ix-other', ix.other);
    }

    if (d.history) {
      sv('hx-current', d.history.current);
      sv('hx-past',    d.history.past);
    }

    if (d.observation) {
      var obs = d.observation;
      var vs  = obs.vital_signs || {};
      sv('vs-temp', vs.temp); sv('vs-rr', vs.rr); sv('vs-pr', vs.pr);
      sv('vs-bp',   vs.bp);   sv('vs-spo2', vs.spo2);
      sv('obs-breathing-pattern', obs.breathing_pattern);
      sv('obs-breathing-level',   obs.breathing_level);
      sv('obs-chest-deformity',   obs.chest_deformity);
      _splitToggle(obs.chest_drain, 'obs-chest-drain-yn', 'obs-chest-drain-detail', ['Present']);
      sv('cough-type',   obs.cough_type);
      sv('cough-effect', obs.cough_effect);
      var sp = obs.sputum || {};
      sv('sputum-colour',      sp.colour);
      sv('sputum-amount',      sp.amount);
      sv('sputum-consistency', sp.consistency);
      sv('obs-o2', obs.o2_treatment);
    }

    if (d.ventilated) {
      sv('vent-mode', d.ventilated.mode);
      sv('vent-peep', d.ventilated.peep);
      sv('vent-fio2', d.ventilated.fio2);
      if (d.ventilated.mode || d.ventilated.peep || d.ventilated.fio2) {
        var tog = document.getElementById('vent-toggle');
        if (tog) { tog.checked = true; onVentChange(); }
      }
    }

    if (d.palpation) {
      var palp = d.palpation;
      var exp  = palp.expansion   || {};
      var meas = palp.measurement || {};
      sv('exp-apical', exp.apical);
      sv('exp-middle', exp.middle);
      sv('exp-lower',  exp.lower_costal);
      sv('meas-apical', meas.apical); sv('meas-apical-status', meas.apical_status);
      sv('meas-middle', meas.middle); sv('meas-middle-status', meas.middle_status);
      sv('meas-lower',  meas.lower_costal); sv('meas-lower-status', meas.lower_costal_status);
    }

    if (d.auscultation) {
      sv('ausc-lungs', d.auscultation.lungs);
      sv('ausc-crep',  d.auscultation.crepitation);
      sv('ausc-air',   d.auscultation.air_entry);
      if (d.auscultation.lung_map && typeof LungChart !== 'undefined') {
        LungChart.loadData(d.auscultation.lung_map);
      }
    }

    if (d.specialTest) {
      var st  = d.specialTest;
      var mwt = st['6mwt'] || {};
      sv('mwt-dist',    mwt.distance);
      sv('mwt-pr-pre',  mwt.pr_pre);  sv('mwt-pr-post',  mwt.pr_post);
      sv('mwt-rpe-pre', mwt.rpe_pre); sv('mwt-rpe-post', mwt.rpe_post);
      sv('mwt-remarks', mwt.remarks);
      sv('st-pefr', st.pefr);
      sv('st-is',   st.incentive_spirometer);
    }

    if (d.plan) {
      sv('plan-impression', d.plan.impression);
      sv('plan-stg',        d.plan.stg);
      sv('plan-ltg',        d.plan.ltg);
      sv('plan-tx',         d.plan.treatment);
    }
  }

  // ── Reset full CR form ────────────────────────
  function reset() {
    FormBase.resetPatient();
    setPain('pre',  0); document.getElementById('pain-pre').value  = 0;
    setPain('post', 0); document.getElementById('pain-post').value = 0;
    var tog = document.getElementById('vent-toggle');
    if (tog) { tog.checked = false; onVentChange(); }
  }

  // ── Progress fields ───────────────────────────
  FormBase.setProgressFields([
    'pt-name', 'pt-date', 'pt-nric|pt-passport',
    'pt-diagnosis', 'pt-problem',
    'hx-current', 'vs-temp', 'plan-impression'
  ]);

  // ── Register as the active form ───────────────
  window.ActiveForm = {
    collect:  collect,
    populate: populate,
    reset:    reset
  };

  window.Form = {
    collect:        collect,
    populate:       populate,
    reset:          reset,
    setPain:        setPain,
    onVentChange:   onVentChange,
    onPtTypeChange: FormBase.onPtTypeChange,
    onNricInput:    FormBase.onNricInput,
    onDobChange:    FormBase.onDobChange
  };

  return window.ActiveForm;

})();
