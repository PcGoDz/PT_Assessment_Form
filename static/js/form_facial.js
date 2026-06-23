// form_facial.js — Facial palsy assessment form logic.
// Two AssessmentGrid instances (facial + tongue), single-grade Poor/Fair/Good.
// Multi-select chips: BORROWED from form_neuro.js pattern (.chip / .chip.active / .chip-group).
// Single-select sensation chips: local pickSingle helper, reuses .chip CSS.
// PDF + MPIS wired in later rungs.

var FacialForm = (function () {

  function gv(id)        { return FormBase.gv(id); }
  function sv(id, val)   { return FormBase.sv(id, val); }
  function radio(name)   { return FormBase.radio(name); }
  function setRadio(n,v) { return FormBase.setRadio(n, v); }

  // ── Multi-select chips (borrowed verbatim from form_neuro.js:11-27) ──
  // Chip value = its trimmed textContent. One handler shape, used by all multi groups.
  function toggleChip(el)            { el.classList.toggle('active'); }
  function getChips(groupId) {
    var out = [];
    document.querySelectorAll('#' + groupId + ' .chip.active').forEach(function (c) { out.push(c.textContent.trim()); });
    return out;
  }
  function setChips(groupId, values) {
    if (!Array.isArray(values)) values = [];
    document.querySelectorAll('#' + groupId + ' .chip').forEach(function (c) {
      c.classList.toggle('active', values.indexOf(c.textContent.trim()) !== -1);
    });
  }
  function clearChips(groupId) {
    document.querySelectorAll('#' + groupId + ' .chip').forEach(function (c) { c.classList.remove('active'); });
  }

  // ── Single-select chips (sensation modalities) — reuses .chip CSS, single pick ──
  function pickSingle(el, groupId) {
    document.querySelectorAll('#' + groupId + ' .chip').forEach(function (c) { c.classList.remove('active'); });
    el.classList.add('active');
  }
  function getSingle(groupId) {
    var el = document.querySelector('#' + groupId + ' .chip.active');
    return el ? el.textContent.trim() : '';
  }
  function setSingle(groupId, value) {
    document.querySelectorAll('#' + groupId + ' .chip').forEach(function (c) {
      c.classList.toggle('active', c.textContent.trim() === value);
    });
  }

  // ── Single-select irritability chips (reuse MS .irr-chip / .sel-<Value>) ──
  function pickIrr(val) {
    ['High','Medium','Low'].forEach(function (v) {
      var el = document.getElementById('irr-' + v);
      if (el) el.classList.remove('sel-High','sel-Medium','sel-Low');
    });
    var sel = document.getElementById('irr-' + val);
    if (sel) sel.classList.add('sel-' + val);
  }
  var _irr = '';
  function pickIrrStore(val) { _irr = val; pickIrr(val); }
  function getIrr() { return _irr; }

  // ── Affected-side R/L toggle (reuse .irr-chip / .sel-<Value>) ──
  var _side = '';
  function pickSide(val) {
    _side = val;
    ['R','L'].forEach(function (v) {
      var el = document.getElementById('side-' + v);
      if (el) el.classList.remove('sel-R','sel-L');
    });
    var sel = document.getElementById('side-' + val);
    if (sel) sel.classList.add('sel-' + val);
  }
  function getSide() { return _side; }

  // ── Collapsible note toggle + empty-blur auto-collapse (copied from form_sci.js:129) ──
  var NOTE_IDS = ['nature-notes','agg-notes','ease-notes','hrs24-notes','sensation-notes'];

  function toggleNote(noteId) {
    var w = document.getElementById(noteId + '-wrap');
    if (w) w.classList.toggle('collapsed');
  }

  // NET-NEW (spec, approved): re-collapse a note opened but left empty on blur.
  // Only fires when trimmed value is empty (a stray space does not count as filled).
  function autoCollapseIfEmpty(noteId) {
    var input = document.getElementById(noteId);
    var w     = document.getElementById(noteId + '-wrap');
    if (input && w && input.value.trim() === '') w.classList.add('collapsed');
  }

  // ── Pain VAS display (mirror form_sci.js onPainChange) ──
  function onPainChange(which) {
    var n  = parseInt(gv('pain-' + which));
    var el = document.getElementById('pain-' + which + '-display');
    if (!el) return;
    el.textContent = isNaN(n) ? 0 : n;
    el.className = 'pain-val ' + (n <= 3 ? 'pv-low' : n <= 6 ? 'pv-mid' : 'pv-high');
  }

  // ── Grid configs — labels VERBATIM with KKM typos (DATA CONTRACT, never edit) ──
  var GRADE_COL = [{ id: 'grade', label: 'Grade', type: 'dropdown', options: ['Poor','Fair','Good'] }];

  var FACIAL_ROWS = [
    'Lift eyebrows,uplook surprised and wrinkle forehead (Frontalis)',
    'Frown ,pull eyebrows down (Corrugator)',
    'Close eyes (Orbicularis Oculi)',
    'Open eyes (Levator Palpebrae Suprioris)',
    'Wrinkle nose (Procerus)',
    'Smile (Risorius and Zygomaticus Major)',
    "Purse lips, whistle, say 'prunes', close mouth  (Orbicularis Oris)",
    'Lift upper lip, show upper teeth (Levator Labii Superioris)',
    'Push lower lip downwards, show lower teeth (Depressor Labii Inferioris)',
    'Pull corners of month up, sneer (Levator Anguli Oris)',
    'Push corners of month down, look sad (Depressor Anguli Oris)',
    'Suck cheek in, pull in against tongue blade (Buccinator)',
    'Bite (Masseter Temporalis)',
    'Open month (Infrahyoid  & Suprahyoid)',
    'Pull chin down (Platysma)'
  ];

  var TONGUE_ROWS = [
    'Stick the tongue out straight',
    'Stick the tongue out to left and right',
    'Touch the nose with the tongue',
    'Hump the tongue (push food back in the month preparing for swallowing)',
    'Swallowing Difficulty'
  ];

  var gFacial, gTongue;
  function initGrids() {
    gFacial = AssessmentGrid.create({ containerId: 'facial-mov-grid', rows: FACIAL_ROWS, columns: GRADE_COL });
    gTongue = AssessmentGrid.create({ containerId: 'tongue-mov-grid', rows: TONGUE_ROWS, columns: GRADE_COL });
    NOTE_IDS.forEach(function (id) {
      var input = document.getElementById(id);
      if (input) input.addEventListener('blur', function () { autoCollapseIfEmpty(id); });
    });
  }
  function stampFacialPoor() { if (gFacial) gFacial.stampBlanks('Poor'); }
  function stampTonguePoor() { if (gTongue) gTongue.stampBlanks('Poor'); }

  // ── collect() — full data contract per FACIAL_SPEC ──
  // Build Note #1: pain + sensation NESTED, everything else FLAT.
  function collect() {
    return {
      _form_type: 'FACIAL',
      meta:       { form: 'FACIAL' },
      patient:    FormBase.collectPatient(),

      diagnosis:  gv('diagnosis'),
      doctorMgmt: gv('doctor-mgmt'),
      problem:    gv('problem'),

      pain:  { pre: gv('pain-pre'), post: gv('pain-post') },
      area:  gv('area'),
      nature:     getChips('nature-chips'),  natureNotes: gv('nature-notes'),
      agg:        getChips('agg-chips'),      aggNotes:    gv('agg-notes'),
      ease:       getChips('ease-chips'),     easeNotes:   gv('ease-notes'),
      hrs24:      getChips('hrs24-chips'),     hrs24Notes:  gv('hrs24-notes'),
      irritability: getIrr(),

      currentHistory: gv('current-history'),
      pastHistory:    gv('past-history'),

      generalHealth:  gv('general-health'),
      pmhx:           gv('pmhx'),
      investigations: gv('investigations'),
      medication:     gv('medication'),
      occupation:     gv('occupation'),
      socialHistory:  gv('social-history'),
      hearingAidPacemaker: radio('pacemaker'),

      observation: gv('observation'),
      palpation:   gv('palpation'),

      sensation: {
        hot:      getSingle('sens-hot-chips'),
        cold:     getSingle('sens-cold-chips'),
        pinPrick: getSingle('sens-pin-chips'),
        notes:    gv('sensation-notes')
      },

      affectedSide: getSide(),
      facialMov: gFacial ? gFacial.getData() : [],
      tongueMov: gTongue ? gTongue.getData() : [],

      impression:      gv('pt-impression'),
      stg:             gv('stg'),
      ltg:             gv('ltg'),
      planOfTreatment: gv('plan')
    };
  }

  // ── populate(d) — mirror collect at correct depths ──
  function populate(d) {
    if (!d) return;
    FormBase.populatePatient(d.patient);

    sv('diagnosis',   d.diagnosis);
    sv('doctor-mgmt', d.doctorMgmt);
    sv('problem',     d.problem);

    var pain = d.pain || {};
    var pre = document.getElementById('pain-pre');
    if (pre)  { pre.value = pain.pre || 0;  onPainChange('pre'); }
    var post = document.getElementById('pain-post');
    if (post) { post.value = pain.post || 0; onPainChange('post'); }
    sv('area', d.area);
    setChips('nature-chips', d.nature); sv('nature-notes', d.natureNotes);
    setChips('agg-chips',    d.agg);    sv('agg-notes',    d.aggNotes);
    setChips('ease-chips',   d.ease);   sv('ease-notes',   d.easeNotes);
    setChips('hrs24-chips',  d.hrs24);  sv('hrs24-notes',  d.hrs24Notes);
    if (d.irritability) pickIrrStore(d.irritability);

    sv('current-history', d.currentHistory);
    sv('past-history',    d.pastHistory);

    sv('general-health',  d.generalHealth);
    sv('pmhx',            d.pmhx);
    sv('investigations',  d.investigations);
    sv('medication',      d.medication);
    sv('occupation',      d.occupation);
    sv('social-history',  d.socialHistory);
    setRadio('pacemaker', d.hearingAidPacemaker);

    sv('observation', d.observation);
    sv('palpation',   d.palpation);

    var s = d.sensation || {};
    setSingle('sens-hot-chips',  s.hot);
    setSingle('sens-cold-chips', s.cold);
    setSingle('sens-pin-chips',  s.pinPrick);
    sv('sensation-notes', s.notes);

    // Re-open any note that has content so a written note is never hidden behind a click.
    NOTE_IDS.forEach(function (id) {
      var input = document.getElementById(id);
      var w     = document.getElementById(id + '-wrap');
      if (input && w && input.value.trim() !== '') w.classList.remove('collapsed');
    });

    if (d.affectedSide) pickSide(d.affectedSide);
    if (gFacial) gFacial.loadData(d.facialMov);
    if (gTongue) gTongue.loadData(d.tongueMov);

    sv('pt-impression', d.impression);
    sv('stg',  d.stg);
    sv('ltg',  d.ltg);
    sv('plan', d.planOfTreatment);
  }

  // ── reset(keepPatient) — snapshot-restore pattern ──
  function reset(keepPatient) {
    var savedPt = keepPatient ? FormBase.collectPatient() : null;
    FormBase.resetPatient();
    // resetPatient() blanket-clears all input[type=radio] including pacemaker Y/N — no explicit clear needed.

    var ids = ['diagnosis','doctor-mgmt','problem','area',
      'nature-notes','agg-notes','ease-notes','hrs24-notes',
      'current-history','past-history',
      'general-health','pmhx','investigations','medication','occupation','social-history',
      'observation','palpation','sensation-notes',
      'pt-impression','stg','ltg','plan'];
    ids.forEach(function (id) { sv(id, ''); });

    ['nature-chips','agg-chips','ease-chips','hrs24-chips',
     'sens-hot-chips','sens-cold-chips','sens-pin-chips'].forEach(clearChips);
    // Re-collapse all notes back to the tidy +Note default.
    NOTE_IDS.forEach(function (id) {
      var w = document.getElementById(id + '-wrap');
      if (w) w.classList.add('collapsed');
    });
    _irr = ''; pickIrr('');
    _side = ''; pickSide('');

    var pre = document.getElementById('pain-pre');
    if (pre)  { pre.value = 0; onPainChange('pre'); }
    var post = document.getElementById('pain-post');
    if (post) { post.value = 0; onPainChange('post'); }

    if (gFacial) gFacial.clear();
    if (gTongue) gTongue.clear();

    if (savedPt) FormBase.populatePatient(savedPt);
  }

  return {
    initGrids: initGrids,
    toggleChip: toggleChip,
    pickSingle: pickSingle,
    pickIrr: pickIrrStore,
    pickSide: pickSide,
    onPainChange: onPainChange,
    stampFacialPoor: stampFacialPoor,
    stampTonguePoor: stampTonguePoor,
    collect: collect,
    populate: populate,
    reset: reset,
    toggleNote: toggleNote
  };
})();

window.ActiveForm = { collect: FacialForm.collect, populate: FacialForm.populate, reset: FacialForm.reset };
window.Form = {
  collect:        FacialForm.collect,
  populate:       FacialForm.populate,
  reset:          FacialForm.reset,
  onPtTypeChange: FormBase.onPtTypeChange,
  onNricInput:    FormBase.onNricInput,
  onDobChange:    FormBase.onDobChange
};
