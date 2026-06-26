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
      bodyShape: getShape()
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
  }
  function reset(keepPatient) {
    var savedPt = keepPatient ? FormBase.collectPatient() : null;
    FormBase.resetPatient();
    ['diagnosis','complaint','occupation','recreation','pmhx','family-hx','medication',
     'smoking-comment','alcohol-comment','active-comment','current-history','past-history','chart-notes'
    ].forEach(function(id) { sv(id, ''); });
    _marital = ''; pickMarital('');
    _life = { smoking: '', alcohol: '', active: '' };
    ['smoking','alcohol','active'].forEach(function(k) { pickLife(k, ''); });
    if (BodyChart.clearAll) BodyChart.clearAll();
    sv('chart-notes', '');
    _shape = '';
    document.querySelectorAll('#shape-grid .shape-card').forEach(function (c) { c.classList.remove('sel'); });
    if (savedPt) FormBase.populatePatient(savedPt);
  }

  return { collect: collect, populate: populate, reset: reset, pickMarital: pickMarital, pickLife: pickLife, pickShape: pickShape };
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
  pickShape:      NcdForm.pickShape
};
