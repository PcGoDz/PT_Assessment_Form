// form_sci.js — Spinal Cord Injury assessment form logic.
// Multi-grid form built on AssessmentGrid factory. PDF + MPIS out of scope (milestone 1).

var SciForm = (function () {

  function gv(id)       { return FormBase.gv(id); }
  function sv(id, val)  { return FormBase.sv(id, val); }
  function radio(name)  { return FormBase.radio(name); }
  function setRadio(n,v){ return FormBase.setRadio(n, v); }

  // ── Option sets (verbatim) ──────────────────────────────────────────────
  var OPT_SENSORY = ['N','I','A','NT'];
  var OPT_MMT     = ['0','1','2-','2','2+','3-','3','3+','4-','4','4+','5','NT'];
  var OPT_MAS     = ['0','1','1+','2','3','4','NT'];
  var OPT_UPRIGHT = ['G','F','P','N/A'];
  var OPT_FUNC    = ['U','A','S','I','NT'];
  var OPT_BALANCE = ['G','F','P','NT'];

  // Full-word display maps for screen dropdowns — stored VALUES stay as letters; only displayed text changes.
  // MMT/MAS grades are numeric scales — NO label map (keep grades as-is).
  var LBL_SENSORY = { N:'Normal', I:'Impaired', A:'Absent', NT:'Not Tested' };
  var LBL_FUNC    = { U:'Unable', A:'Assisted', S:'Supervised', I:'Independent', NT:'Not Tested' };
  var LBL_UPRIGHT = { G:'Good', F:'Fair', P:'Poor', 'N/A':'Not Applicable' };
  var LBL_BALANCE = { G:'Good', F:'Fair', P:'Poor', NT:'Not Tested' };

  // Legend captions — single source for MPIS. PDF mirrors these in pdf_sci.py (keep in sync).
  var LEGENDS = {
    sensory:    'N=Normal · I=Impaired · A=Absent · NT=Not Tested',
    functional: 'U=Unable · A=Assisted · S=Supervised · I=Independent · NT=Not Tested',
    balance:    'G=Good · F=Fair · P=Poor · NT=Not Tested',
    upright:    'G=Good · F=Fair · P=Poor · N/A=Not Applicable',
    mmt:        'MMT: Oxford 0–5 · MAS: Modified Ashworth 0–4 · NT=Not Tested'
  };

  // ── Grid configs ────────────────────────────────────────────────────────

  var SENSORY_ROWS = ['C2','C3','C4','C5','C6','C7','C8',
    'T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12',
    'L1','L2','L3','L4','L5','S1','S2','S3','S4'];
  var SENSORY_COLS = [
    { id:'pp_l', label:'Pin Prick L',   type:'dropdown', options:OPT_SENSORY, optionLabels:LBL_SENSORY },
    { id:'pp_r', label:'Pin Prick R',   type:'dropdown', options:OPT_SENSORY, optionLabels:LBL_SENSORY },
    { id:'lt_l', label:'Light Touch L', type:'dropdown', options:OPT_SENSORY, optionLabels:LBL_SENSORY },
    { id:'lt_r', label:'Light Touch R', type:'dropdown', options:OPT_SENSORY, optionLabels:LBL_SENSORY }
  ];

  // Row label = "JOINT Movement" exactly (stable data key)
  var MMT_ROWS = [
    'NECK Flex','NECK Ext',
    'SCAPULA Elev','SCAPULA Depression','SCAPULA Protraction','SCAPULA Retraction',
    'SHOULDER Flex','SHOULDER Ext','SHOULDER Abd','SHOULDER Add Horiz',
    'ELBOW Flex','ELBOW Ext',
    'WRIST Flex','WRIST Ext',
    'FINGER Flex','FINGER Ext',
    'TRUNK Flex','TRUNK Ext',
    'HIP Flex','HIP Ext','HIP Abd','HIP Add','HIP Int. Rot','HIP Ext. Rot',
    'KNEE Flex','KNEE Ext',
    'ANKLE P.Flex','ANKLE D.Flex',
    'SUBTALAR Inv','SUBTALAR Eve',
    'TOE Flex','TOE Ext'
  ];
  var MMT_COLS = [
    { id:'mmt_l',  label:'MMT L',  type:'dropdown', options:OPT_MMT },
    { id:'mmt_r',  label:'MMT R',  type:'dropdown', options:OPT_MMT },
    { id:'prom_l', label:'PROM L', type:'text' },
    { id:'prom_r', label:'PROM R', type:'text' },
    { id:'mas_l',  label:'MAS L',  type:'dropdown', options:OPT_MAS },
    { id:'mas_r',  label:'MAS R',  type:'dropdown', options:OPT_MAS }
  ];
  // GREY-OUT MAP — transcribed EXACTLY from blueprint. Every [row,col] here = non-cell.
  var MMT_GREYOUT = [
    ['NECK Flex','mas_l'],    ['NECK Flex','mas_r'],
    ['NECK Ext','mas_l'],     ['NECK Ext','mas_r'],
    ['SCAPULA Elev','prom_l'],        ['SCAPULA Elev','prom_r'],
    ['SCAPULA Depression','prom_l'],  ['SCAPULA Depression','prom_r'],
    ['SCAPULA Protraction','prom_l'], ['SCAPULA Protraction','prom_r'],
    ['SCAPULA Retraction','prom_l'],  ['SCAPULA Retraction','prom_r'],
    ['ELBOW Ext','prom_l'],   ['ELBOW Ext','prom_r'],
    ['FINGER Ext','prom_l'],  ['FINGER Ext','prom_r'],
    ['HIP Int. Rot','mmt_l'], ['HIP Int. Rot','mmt_r'], ['HIP Int. Rot','mas_l'], ['HIP Int. Rot','mas_r'],
    ['HIP Ext. Rot','mmt_l'], ['HIP Ext. Rot','mmt_r'], ['HIP Ext. Rot','mas_l'], ['HIP Ext. Rot','mas_r'],
    ['KNEE Ext','prom_l'],    ['KNEE Ext','prom_r'],
    ['ANKLE D.Flex','prom_l'],['ANKLE D.Flex','prom_r']
  ];

  var UPRIGHT_ROWS = ['Hip','Knee','Ankle'];
  var UPRIGHT_COLS = [
    { id:'flex_l', label:'Flex L', type:'dropdown', options:OPT_UPRIGHT, optionLabels:LBL_UPRIGHT },
    { id:'flex_r', label:'Flex R', type:'dropdown', options:OPT_UPRIGHT, optionLabels:LBL_UPRIGHT },
    { id:'ext_l',  label:'Ext L',  type:'dropdown', options:OPT_UPRIGHT, optionLabels:LBL_UPRIGHT },
    { id:'ext_r',  label:'Ext R',  type:'dropdown', options:OPT_UPRIGHT, optionLabels:LBL_UPRIGHT }
  ];

  var PROP_ROWS = ['Shoulder','Elbow','Wrist','Thumb','Hip','Knee','Ankle','Big Toe'];
  var PROP_COLS = [
    { id:'r', label:'R', type:'dropdown', options:OPT_SENSORY, optionLabels:LBL_SENSORY },
    { id:'l', label:'L', type:'dropdown', options:OPT_SENSORY, optionLabels:LBL_SENSORY }
  ];

  var FUNC_BODY_ROWS    = ['Roll side to side','Come to sit','Shift','Raise (off pressure)'];
  var FUNC_BALANCE_ROWS = ['Static','Dynamic'];
  var FUNC_TRANSFER_ROWS= ['Bed','Chair','Floor','Car','Toilet/Commode Chair'];
  var FUNC_WC_ROWS      = ['Level Propulsion','Ramp','Curbs','Rough Terrain','Wheelie'];
  var FUNC_WALK_ROWS    = ['Sit to stand','Level','Rough Surface','Stairs'];
  var FUNC_COL   = [{ id:'val', label:'Grade', type:'dropdown', options:OPT_FUNC,    optionLabels:LBL_FUNC }];
  var FUNC_COL_B = [{ id:'val', label:'Grade', type:'dropdown', options:OPT_BALANCE, optionLabels:LBL_BALANCE }];

  // ── Grid instances (multi-instance — each closed over its container) ────
  var gSensory, gMmt, gUpright, gProp, gFuncBody, gFuncBalance, gFuncTransfer, gFuncWc, gFuncWalk;

  function initGrids() {
    gSensory      = AssessmentGrid.create({ containerId:'grid-sensory',       rows:SENSORY_ROWS,       columns:SENSORY_COLS });
    gMmt          = AssessmentGrid.create({ containerId:'grid-mmt',           rows:MMT_ROWS,           columns:MMT_COLS, greyout:MMT_GREYOUT });
    gUpright      = AssessmentGrid.create({ containerId:'grid-upright',       rows:UPRIGHT_ROWS,       columns:UPRIGHT_COLS });
    gProp         = AssessmentGrid.create({ containerId:'grid-prop',          rows:PROP_ROWS,          columns:PROP_COLS });
    gFuncBody     = AssessmentGrid.create({ containerId:'grid-func-body',     rows:FUNC_BODY_ROWS,     columns:FUNC_COL });
    gFuncBalance  = AssessmentGrid.create({ containerId:'grid-func-balance',  rows:FUNC_BALANCE_ROWS,  columns:FUNC_COL_B });
    gFuncTransfer = AssessmentGrid.create({ containerId:'grid-func-transfer', rows:FUNC_TRANSFER_ROWS, columns:FUNC_COL });
    gFuncWc       = AssessmentGrid.create({ containerId:'grid-func-wc',       rows:FUNC_WC_ROWS,       columns:FUNC_COL });
    gFuncWalk     = AssessmentGrid.create({ containerId:'grid-func-walk',     rows:FUNC_WALK_ROWS,     columns:FUNC_COL });
  }

  // ── Stamp buttons ────────────────────────────────────────────────────────
  function stampSensoryNT() { gSensory.stampBlanks('NT', { skipGreyed:true }); }
  function stampMmtNT()     { gMmt.stampBlanks('NT', { skipGreyed:true, dropdownsOnly:true }); }
  function stampUprightNA() { gUpright.stampBlanks('N/A', { skipGreyed:true }); }

  // ── Collapsible note toggle ──────────────────────────────────────────────
  function toggleNote(noteId) {
    var w = document.getElementById(noteId + '-wrap');
    if (w) w.classList.toggle('collapsed');
  }

  // ── Pain VAS display ─────────────────────────────────────────────────────
  function onPainChange(which) {
    var n  = parseInt(gv('pain-' + which));
    var el = document.getElementById('pain-' + which + '-display');
    if (!el) return;
    el.textContent = isNaN(n) ? 0 : n;
    el.className = 'pain-val ' + (n <= 3 ? 'pv-low' : n <= 6 ? 'pv-mid' : 'pv-high');
  }

  // ── Checkbox group helpers (multi-select) ────────────────────────────────
  function getChecks(groupId) {
    var out = [];
    document.querySelectorAll('#' + groupId + ' input[type=checkbox]:checked').forEach(function (c) { out.push(c.value); });
    return out;
  }
  function setChecks(groupId, vals) {
    if (!Array.isArray(vals)) vals = [];
    document.querySelectorAll('#' + groupId + ' input[type=checkbox]').forEach(function (c) {
      c.checked = vals.indexOf(c.value) !== -1;
    });
  }

  // ── collect() — data contract (read by PDF + MPIS in later milestones) ──
  function collect() {
    return {
      _form_type: 'SCI',
      meta:       { form: 'SCI' },
      patient:    FormBase.collectPatient(),

      diagnosis:      gv('diagnosis'),
      dr_management:  gv('dr-management'),
      problem:        gv('problem'),
      special_questions: {
        date_surgery:  gv('date-surgery'),
        occupation:    gv('occupation'),
        investigation: gv('investigation')
      },
      current_history: gv('current-history'),
      past_history:    gv('past-history'),

      sensory:         gSensory.getData(),
      mmt:             gMmt.getData(),
      upright_control: gUpright.getData(),
      proprioception:  gProp.getData(),
      functional: {
        body_handling: gFuncBody.getData(),
        balance:       gFuncBalance.getData(),
        transfer:      gFuncTransfer.getData(),
        wheelchair:    gFuncWc.getData(),
        walking:       gFuncWalk.getData(),
        notes: {
          body_handling: gv('note-body'),
          balance:       gv('note-balance'),
          transfer:      gv('note-transfer'),
          wheelchair:    gv('note-wc'),
          walking:       gv('note-walk')
        }
      },
      respiratory: {
        breathing_pattern: getChecks('breathing-pattern-group'),
        cough: radio('cough'),
        vc:    gv('vc'),
        pefr:  gv('pefr')
      },
      pain: { pre: gv('pain-pre'), post: gv('pain-post') },
      assistive_aids: {
        wheelchair: getChecks('wheelchair-group'),
        cushion:    getChecks('cushion-group'),
        orthosis:   gv('orthosis')
      },
      outcome_measures: { tenmwt: gv('tenmwt'), scim: gv('scim'), wisci: gv('wisci') },
      skin_integrity:   gv('skin-integrity'),
      home_environment: gv('home-environment'),
      pt_impression: gv('pt-impression'),
      stg:  gv('stg'),
      ltg:  gv('ltg'),
      plan: gv('plan')
    };
  }

  // ── populate(d) — mirror collect; re-expand notes that have content ──────
  function populate(d) {
    if (!d) return;
    FormBase.populatePatient(d.patient);

    sv('diagnosis',     d.diagnosis);
    sv('dr-management', d.dr_management);
    sv('problem',       d.problem);
    var sq = d.special_questions || {};
    sv('date-surgery',  sq.date_surgery);
    sv('occupation',    sq.occupation);
    sv('investigation', sq.investigation);
    sv('current-history', d.current_history);
    sv('past-history',    d.past_history);

    if (gSensory) gSensory.loadData(d.sensory);
    if (gMmt)     gMmt.loadData(d.mmt);
    if (gUpright) gUpright.loadData(d.upright_control);
    if (gProp)    gProp.loadData(d.proprioception);

    var f = d.functional || {};
    if (gFuncBody)     gFuncBody.loadData(f.body_handling);
    if (gFuncBalance)  gFuncBalance.loadData(f.balance);
    if (gFuncTransfer) gFuncTransfer.loadData(f.transfer);
    if (gFuncWc)       gFuncWc.loadData(f.wheelchair);
    if (gFuncWalk)     gFuncWalk.loadData(f.walking);

    var notes = f.notes || {};
    var noteMap = {
      'note-body':     notes.body_handling,
      'note-balance':  notes.balance,
      'note-transfer': notes.transfer,
      'note-wc':       notes.wheelchair,
      'note-walk':     notes.walking
    };
    Object.keys(noteMap).forEach(function (id) {
      sv(id, noteMap[id]);
      if (noteMap[id]) {
        var w = document.getElementById(id + '-wrap');
        if (w) w.classList.remove('collapsed');
      }
    });

    var r = d.respiratory || {};
    setChecks('breathing-pattern-group', r.breathing_pattern);
    setRadio('cough', r.cough);
    sv('vc', r.vc);
    sv('pefr', r.pefr);

    var p = d.pain || {};
    var pre = document.getElementById('pain-pre');
    if (pre)  { pre.value = p.pre || 0;  onPainChange('pre'); }
    var post = document.getElementById('pain-post');
    if (post) { post.value = p.post || 0; onPainChange('post'); }

    var aa = d.assistive_aids || {};
    setChecks('wheelchair-group', aa.wheelchair);
    setChecks('cushion-group',    aa.cushion);
    sv('orthosis', aa.orthosis);

    var om = d.outcome_measures || {};
    sv('tenmwt', om.tenmwt);
    sv('scim',   om.scim);
    sv('wisci',  om.wisci);

    sv('skin-integrity',   d.skin_integrity);
    sv('home-environment', d.home_environment);
    sv('pt-impression', d.pt_impression);
    sv('stg',  d.stg);
    sv('ltg',  d.ltg);
    sv('plan', d.plan);
  }

  // ── reset() — clear all fields + grids, collapse notes ───────────────────
  function reset(keepPatient) {
    var savedPt = keepPatient ? FormBase.collectPatient() : null;
    FormBase.resetPatient();
    var ids = ['diagnosis','dr-management','problem','date-surgery','occupation','investigation',
      'current-history','past-history',
      'note-body','note-balance','note-transfer','note-wc','note-walk',
      'vc','pefr','orthosis','tenmwt','scim','wisci',
      'skin-integrity','home-environment',
      'pt-impression','stg','ltg','plan'];
    ids.forEach(function (id) { sv(id, ''); });

    ['breathing-pattern-group','wheelchair-group','cushion-group'].forEach(function (g) {
      document.querySelectorAll('#' + g + ' input[type=checkbox]').forEach(function (c) { c.checked = false; });
    });
    document.querySelectorAll('input[name="cough"]').forEach(function (r) { r.checked = false; });

    ['note-body','note-balance','note-transfer','note-wc','note-walk'].forEach(function (id) {
      var w = document.getElementById(id + '-wrap');
      if (w) w.classList.add('collapsed');
    });

    var pre = document.getElementById('pain-pre');
    if (pre)  { pre.value = 0;  onPainChange('pre'); }
    var post = document.getElementById('pain-post');
    if (post) { post.value = 0; onPainChange('post'); }

    [gSensory,gMmt,gUpright,gProp,gFuncBody,gFuncBalance,gFuncTransfer,gFuncWc,gFuncWalk]
      .forEach(function (g) { if (g) g.clear(); });
    if (savedPt) FormBase.populatePatient(savedPt);
  }

  // ── Public API ────────────────────────────────────────────────────────────
  return {
    LEGENDS:        LEGENDS,
    initGrids:      initGrids,
    stampSensoryNT: stampSensoryNT,
    stampMmtNT:     stampMmtNT,
    stampUprightNA: stampUprightNA,
    toggleNote:     toggleNote,
    onPainChange:   onPainChange,
    collect:        collect,
    populate:       populate,
    reset:          reset
  };
})();

window.ActiveForm = { collect: SciForm.collect, populate: SciForm.populate, reset: SciForm.reset };
window.Form = {
  collect:        SciForm.collect,
  populate:       SciForm.populate,
  reset:          SciForm.reset,
  onPtTypeChange: FormBase.onPtTypeChange,
  onNricInput:    FormBase.onNricInput,
  onDobChange:    FormBase.onDobChange
};
