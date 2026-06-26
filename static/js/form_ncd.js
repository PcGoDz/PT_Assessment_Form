// form_ncd.js — NCD / Obesity initial assessment form logic.
// Snapshot form (Plan A). Per-visit measurements + trend = Plan B.
var NcdForm = (function () {
  function gv(id)       { return FormBase.gv(id); }
  function sv(id, val)  { return FormBase.sv(id, val); }
  function radio(name)  { return FormBase.radio(name); }
  function setRadio(n,v){ return FormBase.setRadio(n, v); }

  // ── Marital single-select chips ──
  var _marital = '';
  function pickMarital(val) {
    _marital = val;
    ['Single','Married','Widowed','Divorced'].forEach(function (v) {
      var el = document.getElementById('marital-' + v);
      if (el) el.classList.remove('sel-Single','sel-Married','sel-Widowed','sel-Divorced');
    });
    var sel = document.getElementById('marital-' + val);
    if (sel) sel.classList.add('sel-' + val);
  }

  // ── Lifestyle Yes/No pairs ──
  var _life = { smoking: '', alcohol: '', active: '' };
  function pickLife(key, val) {
    _life[key] = val;
    ['Yes','No'].forEach(function (v) {
      var el = document.getElementById('life-' + key + '-' + v);
      if (el) el.classList.remove('sel-Yes', 'sel-No');
    });
    var sel = document.getElementById('life-' + key + '-' + val);
    if (sel) sel.classList.add('sel-' + val);
  }

  // ── Body shape single-select (PNG cards) ──
  var _shape = '';
  function pickShape(val) {
    _shape = val;
    document.querySelectorAll('#shape-grid .shape-card').forEach(function (c) { c.classList.remove('sel'); });
    var sel = document.getElementById('shape-' + val);
    if (sel) sel.classList.add('sel');
  }
  function getShape() { return _shape; }

  // ── Derived: BMI and WHR ──
  function _bmi() {
    var h = parseFloat(gv('height')); var w = parseFloat(gv('weight'));
    return (h > 0 && w > 0) ? +((w / ((h / 100) * (h / 100))).toFixed(1)) : '';
  }
  function _whr() {
    var wa = parseFloat(gv('waist')); var hp = parseFloat(gv('hip'));
    return (wa > 0 && hp > 0) ? +((wa / hp).toFixed(2)) : '';
  }
  function recompute() {
    var bmiEl = document.getElementById('derived-bmi');
    var bmiVal = _bmi();
    if (bmiEl) {
      if (bmiVal !== '') { bmiEl.textContent = 'BMI: ' + bmiVal; bmiEl.classList.remove('hidden'); }
      else { bmiEl.classList.add('hidden'); }
    }
    var whrEl = document.getElementById('derived-whr');
    var whrVal = _whr();
    if (whrEl) {
      if (whrVal !== '') { whrEl.textContent = 'Waist/Hip: ' + whrVal; whrEl.classList.remove('hidden'); }
      else { whrEl.classList.add('hidden'); }
    }
  }

  function collect() {
    return {
      _form_type: 'NCD',
      meta:       { form: 'NCD' },
      patient:    FormBase.collectPatient(),
      diagnosis:  gv('diagnosis'),
      complaint:      gv('complaint'),
      marital:        _marital,
      occupation:     gv('occupation'),
      recreation:     gv('recreation'),
      pmhx:           gv('pmhx'),
      familyHx:       gv('family-hx'),
      medication:     gv('medication'),
      lifestyle: {
        smoking: { flag: _life.smoking, comment: gv('smoking-comment') },
        alcohol: { flag: _life.alcohol, comment: gv('alcohol-comment') },
        active:  { flag: _life.active,  comment: gv('active-comment') }
      },
      currentHistory: gv('current-history'),
      pastHistory:    gv('past-history'),
      bodyChart: BodyChart.getData ? { markers: BodyChart.getData(), notes: gv('chart-notes') } : { markers: [], notes: '' },
      bodyShape: getShape(),
      measurements: {
        // vitals
        hr: gv('hr'), rr: gv('rr'), bp: gv('bp'), spo2: gv('spo2'),
        // bloods
        fbs: gv('fbs'), hba1c: gv('hba1c'), cholesterol: gv('cholesterol'),
        ldl: gv('ldl'), hdl: gv('hdl'), triglycerides: gv('triglycerides'),
        // body composition
        height: gv('height'), weight: gv('weight'), bmi: _bmi(),
        waist: gv('waist'), hip: gv('hip'), whr: _whr(),
        subfatWhole: gv('subfat-whole'), subfatTrunk: gv('subfat-trunk'),
        subfatArm: gv('subfat-arm'), subfatLeg: gv('subfat-leg'),
        muscleWhole: gv('muscle-whole'), muscleTrunk: gv('muscle-trunk'),
        muscleArm: gv('muscle-arm'), muscleLeg: gv('muscle-leg'),
        visceralFat: gv('visceral-fat'), rmr: gv('rmr'),
        // fitness
        walk6Rpe: gv('walk6-rpe'), walk6Bp: gv('walk6-bp'),
        walk6Hr: gv('walk6-hr'), walk6Comment: gv('walk6-comment'),
        step3Hr: gv('step3-hr'), step3Comment: gv('step3-comment'),
        sitReach: gv('sit-reach'), flexComment: gv('flex-comment'),
        handGrip: gv('hand-grip'), sitUp: gv('sit-up'),
        pushUp: gv('push-up'), ulComment: gv('ul-comment'),
        sitToStand: gv('sit-to-stand'), llComment: gv('ll-comment'),
        stork: gv('stork'), balanceComment: gv('balance-comment')
      }
    };
  }
  function populate(d) {
    if (!d) return;
    FormBase.populatePatient(d.patient);
    sv('diagnosis', d.diagnosis);
    sv('complaint', d.complaint);
    if (d.marital) pickMarital(d.marital);
    sv('occupation', d.occupation);
    sv('recreation', d.recreation);
    sv('pmhx', d.pmhx);
    sv('family-hx', d.familyHx);
    sv('medication', d.medication);
    var ls = d.lifestyle || {};
    var sm = ls.smoking || {}; if (sm.flag) pickLife('smoking', sm.flag); sv('smoking-comment', sm.comment);
    var al = ls.alcohol || {}; if (al.flag) pickLife('alcohol', al.flag); sv('alcohol-comment', al.comment);
    var ac = ls.active  || {}; if (ac.flag) pickLife('active',  ac.flag); sv('active-comment',  ac.comment);
    sv('current-history', d.currentHistory);
    sv('past-history', d.pastHistory);
    var bc = d.bodyChart || {};
    if (BodyChart.loadData) BodyChart.loadData(bc.markers || []);
    sv('chart-notes', bc.notes);
    if (d.bodyShape) pickShape(d.bodyShape);
    var m = d.measurements || {};
    sv('hr', m.hr); sv('rr', m.rr); sv('bp', m.bp); sv('spo2', m.spo2);
    sv('fbs', m.fbs); sv('hba1c', m.hba1c); sv('cholesterol', m.cholesterol);
    sv('ldl', m.ldl); sv('hdl', m.hdl); sv('triglycerides', m.triglycerides);
    sv('height', m.height); sv('weight', m.weight);
    sv('waist', m.waist); sv('hip', m.hip);
    sv('subfat-whole', m.subfatWhole); sv('subfat-trunk', m.subfatTrunk);
    sv('subfat-arm', m.subfatArm); sv('subfat-leg', m.subfatLeg);
    sv('muscle-whole', m.muscleWhole); sv('muscle-trunk', m.muscleTrunk);
    sv('muscle-arm', m.muscleArm); sv('muscle-leg', m.muscleLeg);
    sv('visceral-fat', m.visceralFat); sv('rmr', m.rmr);
    sv('walk6-rpe', m.walk6Rpe); sv('walk6-bp', m.walk6Bp);
    sv('walk6-hr', m.walk6Hr); sv('walk6-comment', m.walk6Comment);
    sv('step3-hr', m.step3Hr); sv('step3-comment', m.step3Comment);
    sv('sit-reach', m.sitReach); sv('flex-comment', m.flexComment);
    sv('hand-grip', m.handGrip); sv('sit-up', m.sitUp);
    sv('push-up', m.pushUp); sv('ul-comment', m.ulComment);
    sv('sit-to-stand', m.sitToStand); sv('ll-comment', m.llComment);
    sv('stork', m.stork); sv('balance-comment', m.balanceComment);
    recompute();
  }
  function reset(keepPatient) {
    var savedPt = keepPatient ? FormBase.collectPatient() : null;
    FormBase.resetPatient();
    ['diagnosis','complaint','occupation','recreation','pmhx','family-hx','medication',
     'smoking-comment','alcohol-comment','active-comment','current-history','past-history','chart-notes',
     'hr','rr','bp','spo2','fbs','hba1c','cholesterol','ldl','hdl','triglycerides',
     'height','weight','waist','hip',
     'subfat-whole','subfat-trunk','subfat-arm','subfat-leg',
     'muscle-whole','muscle-trunk','muscle-arm','muscle-leg',
     'visceral-fat','rmr',
     'walk6-rpe','walk6-bp','walk6-hr','walk6-comment',
     'step3-hr','step3-comment',
     'sit-reach','flex-comment',
     'hand-grip','sit-up','push-up','ul-comment',
     'sit-to-stand','ll-comment',
     'stork','balance-comment'
    ].forEach(function(id) { sv(id, ''); });
    _marital = ''; pickMarital('');
    _life = { smoking: '', alcohol: '', active: '' };
    ['smoking','alcohol','active'].forEach(function(k) { pickLife(k, ''); });
    if (BodyChart.clearAll) BodyChart.clearAll();
    sv('chart-notes', '');
    _shape = '';
    document.querySelectorAll('#shape-grid .shape-card').forEach(function (c) { c.classList.remove('sel'); });
    recompute();
    if (savedPt) FormBase.populatePatient(savedPt);
  }

  return { collect: collect, populate: populate, reset: reset, pickMarital: pickMarital, pickLife: pickLife, pickShape: pickShape, recompute: recompute };
})();

window.ActiveForm = { collect: NcdForm.collect, populate: NcdForm.populate, reset: NcdForm.reset };
window.Form = {
  collect:        NcdForm.collect,
  populate:       NcdForm.populate,
  reset:          NcdForm.reset,
  onPtTypeChange: FormBase.onPtTypeChange,
  onNricInput:    FormBase.onNricInput,
  onDobChange:    FormBase.onDobChange,
  pickMarital:    NcdForm.pickMarital,
  pickLife:       NcdForm.pickLife,
  pickShape:      NcdForm.pickShape,
  recompute:      NcdForm.recompute
};
