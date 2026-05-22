var HandForm = (function () {
  'use strict';

  /* ── helpers ── */
  function gv(id) {
    var el = document.getElementById(id);
    if (!el) return '';
    return el.value || '';
  }
  function sv(id, val) {
    var el = document.getElementById(id);
    if (!el) return;
    el.value = val || '';
  }
  function gr(name) {
    var el = document.querySelector('input[name="' + name + '"]:checked');
    return el ? el.value : '';
  }
  function sr(name, val) {
    var els = document.querySelectorAll('input[name="' + name + '"]');
    els.forEach(function (el) { el.checked = (el.value === val); });
  }

  /* ── irritability chip ── */
  var _irr = '';
  function pickIrr(val) {
    _irr = (_irr === val) ? '' : val;
    ['High', 'Medium', 'Low'].forEach(function (v) {
      var btn = document.getElementById('irr-' + v);
      if (!btn) return;
      btn.classList.remove('sel-High', 'sel-Medium', 'sel-Low');
      if (_irr === v) btn.classList.add('sel-' + v);
    });
  }
  function _setIrr(val) {
    _irr = val || '';
    ['High', 'Medium', 'Low'].forEach(function (v) {
      var btn = document.getElementById('irr-' + v);
      if (!btn) return;
      btn.classList.remove('sel-High', 'sel-Medium', 'sel-Low');
      if (_irr === v) btn.classList.add('sel-' + v);
    });
  }

  /* ── VAS pain display ── */
  function setPain(type, val) {
    var chip = document.getElementById('pv-' + type);
    if (!chip) return;
    var n = parseInt(val, 10);
    chip.textContent = n;
    chip.className = 'pain-val ' + (n <= 3 ? 'pv-low' : n <= 6 ? 'pv-mid' : 'pv-high');
  }

  /* ── custom special tests ── */
  function initSpecialTests() {
    var addBtn = document.getElementById('special-add-test');
    if (!addBtn) return;
    addBtn.addEventListener('click', function (e) {
      e.preventDefault();
      _addCustomTest();
    });
  }
  function _addCustomTest(prefill) {
    var tbody = document.getElementById('special-custom-tbody');
    if (!tbody) return;
    var tr = document.createElement('tr');
    var opts = ['', 'Negative', 'Positive', 'Not tested'].map(function (o) {
      return '<option value="' + o + '"' + ((prefill && prefill.r === o) ? ' selected' : '') + '>' + (o || '—') + '</option>';
    }).join('');
    var optsL = ['', 'Negative', 'Positive', 'Not tested'].map(function (o) {
      return '<option value="' + o + '"' + ((prefill && prefill.l === o) ? ' selected' : '') + '>' + (o || '—') + '</option>';
    }).join('');
    tr.innerHTML =
      '<td><input type="text" class="mov-cell-input" placeholder="Test name..." value="' + ((prefill && prefill.name) || '') + '" style="width:100%"></td>' +
      '<td><select class="mov-cell-input" style="min-width:120px">' + opts  + '</select></td>' +
      '<td><select class="mov-cell-input" style="min-width:120px">' + optsL + '</select></td>' +
      '<td><button class="mov-del-btn" onclick="this.closest(\'tr\').remove()">&#x2715;</button></td>';
    tbody.appendChild(tr);
  }
  function _collectCustomTests() {
    var rows = document.querySelectorAll('#special-custom-tbody tr');
    var result = [];
    rows.forEach(function (tr) {
      var els = tr.querySelectorAll('input, select');
      var name = els[0] ? els[0].value.trim() : '';
      var r    = els[1] ? els[1].value : '';
      var l    = els[2] ? els[2].value : '';
      if (name) result.push({ name: name, r: r, l: l });
    });
    return result;
  }
  function _populateCustomTests(arr) {
    var tbody = document.getElementById('special-custom-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (!Array.isArray(arr)) return;
    arr.forEach(function (t) { _addCustomTest(t); });
  }

  /* ── collect ── */
  function collect() {
    return {
      _form_type: 'HAND',
      meta:       { form: 'HAND' },
      patient:    FormBase.collectPatient(),

      /* Diagnosis */
      diagnosis:       gv('diagnosis'),
      referralSource:  gv('referral-source'),
      managementType:  gv('management-type'),
      surgeryDate:     gv('surgery-date'),
      surgeryType:     gv('surgery-type'),
      problem:         gv('pt-problem'),

      /* Hand Chart */
      handChart: {
        markers: HandChart.getData(),
        notes:   gv('chart-notes')
      },

      /* Pain */
      painPre:         gv('pain-pre'),
      painPost:        gv('pain-post'),
      painNature:      gv('pain-nature'),
      pain24hr:        gv('pain-24hr'),
      painAgg:         gv('pain-agg'),
      painEase:        gv('pain-ease'),
      irritability:    _irr,

      /* History */
      hxCurrent:       gv('hx-current'),
      hxPast:          gv('hx-past'),

      /* Special Questions */
      sqGeneralHealth: gv('sq-general-health'),
      sqHealthNotes:   gv('sq-health-notes'),
      sqPmhx:          gv('sq-pmhx'),
      sqInvest:        gv('sq-invest'),
      sqMedications:   gv('sq-medications'),
      sqAllergies:     gv('sq-allergies'),
      sqSocial:        gv('sq-social'),
      sqOccupation:    gv('sq-occupation'),
      sqRec:           gv('sq-rec'),
      sqSplinting:     gr('sq-splinting'),
      sqDominantHand:  gv('sq-dominant-hand'),

      /* Observation */
      observationNotes: gv('observation-notes'),
      woundNotes:       gv('wound-notes'),

      /* Palpation */
      tenderness:    gv('tenderness'),
      temperature:   gv('temperature'),
      texture:       gv('texture'),
      palpationNotes:gv('palpation-notes'),

      /* ROM — delegated to HandRomTable */
      rom: HandRomTable.collect(),

      /* Strength */
      gripStrengthR:   gv('grip-r'),
      gripStrengthL:   gv('grip-l'),
      pinchLateralR:   gv('pinch-r'),
      pinchLateralL:   gv('pinch-l'),
      pinchPulpR:      gv('pinch-pulp-r'),
      pinchPulpL:      gv('pinch-pulp-l'),
      pinch3ptR:       gv('pinch-3pt-r'),
      pinch3ptL:       gv('pinch-3pt-l'),
      pulpOpposition:  gv('pulp-opposition'),
      fpc2nd:          gv('fpc-2nd'),
      fpc3rd:          gv('fpc-3rd'),
      fpc4th:          gv('fpc-4th'),
      fpc5th:          gv('fpc-5th'),

      /* Circumference — delegated */
      circumference: HandCircTable.collect(),

      /* Sensation */
      lightTouchR:    gv('light-touch-r'),
      lightTouchL:    gv('light-touch-l'),
      pinPrickR:      gv('pin-prick-r'),
      pinPrickL:      gv('pin-prick-l'),
      twoPointDiscR:  gv('two-point-r'),
      twoPointDiscL:  gv('two-point-l'),
      sensationNotes: gv('sensation-notes'),

      /* Special Tests */
      otherTests: {
        tinels:       { r: gv('tinels-r'),       l: gv('tinels-l') },
        phalens:      { r: gv('phalens-r'),       l: gv('phalens-l') },
        finkelsteins: { r: gv('finkelsteins-r'),  l: gv('finkelsteins-l') },
        fromens:      { r: gv('fromens-r'),        l: gv('fromens-l') }
      },
      customSpecialTests: _collectCustomTests(),

      /* Neurological */
      neuro: {
        reflexes: {
          c5:   { l: gv('ref-c5-l'),    r: gv('ref-c5-r') },
          c6:   { l: gv('ref-c6-l'),    r: gv('ref-c6-r') },
          c7:   { l: gv('ref-c7-l'),    r: gv('ref-c7-r') },
          c8t1: { l: gv('ref-c8t1-l'), r: gv('ref-c8t1-r') }
        },
        muscles: {
          deltoid:       { l: gv('mmt-deltoid-l'),      r: gv('mmt-deltoid-r') },
          biceps:        { l: gv('mmt-biceps-l'),        r: gv('mmt-biceps-r') },
          brachiorad:    { l: gv('mmt-brachiorad-l'),    r: gv('mmt-brachiorad-r') },
          wristExt:      { l: gv('mmt-wristext-l'),      r: gv('mmt-wristext-r') },
          wristFlex:     { l: gv('mmt-wristflex-l'),     r: gv('mmt-wristflex-r') },
          fingerMpExt:   { l: gv('mmt-fingermpext-l'),   r: gv('mmt-fingermpext-r') },
          triceps:       { l: gv('mmt-triceps-l'),        r: gv('mmt-triceps-r') },
          fingerFlex:    { l: gv('mmt-fingerflex-l'),     r: gv('mmt-fingerflex-r') },
          handIntrinsics:{ l: gv('mmt-intrinsics-l'),    r: gv('mmt-intrinsics-r') }
        }
      },

      /* Goals + Plan */
      ptImpression: gv('pt-impression'),
      stg:          gv('stg'),
      ltg:          gv('ltg'),
      plan:         gv('plan')
    };
  }

  /* ── populate ── */
  function populate(d) {
    FormBase.populatePatient(d.patient);

    sv('diagnosis',      d.diagnosis);
    sv('referral-source',d.referralSource);
    sv('management-type',d.managementType);
    sv('surgery-date',   d.surgeryDate);
    sv('surgery-type',   d.surgeryType);
    sv('pt-problem',     d.problem);
    onManagementChange();

    if (d.handChart) {
      HandChart.loadData(d.handChart.markers || []);
      sv('chart-notes', d.handChart.notes);
    }

    sv('pain-pre',  d.painPre);
    sv('pain-post', d.painPost);
    if (d.painPre  !== undefined) setPain('pre',  d.painPre  || 0);
    if (d.painPost !== undefined) setPain('post', d.painPost || 0);
    sv('pain-nature', d.painNature);
    sv('pain-24hr',   d.pain24hr);
    sv('pain-agg',    d.painAgg);
    sv('pain-ease',   d.painEase);
    _setIrr(d.irritability);

    sv('hx-current', d.hxCurrent);
    sv('hx-past',    d.hxPast);

    sv('sq-general-health', d.sqGeneralHealth);
    sv('sq-health-notes',   d.sqHealthNotes);
    onHealthChange();
    sv('sq-pmhx',       d.sqPmhx);
    sv('sq-invest',     d.sqInvest);
    sv('sq-medications',d.sqMedications);
    sv('sq-allergies',  d.sqAllergies);
    sv('sq-social',     d.sqSocial);
    sv('sq-occupation', d.sqOccupation);
    sv('sq-rec',        d.sqRec);
    sr('sq-splinting',  d.sqSplinting);
    sv('sq-dominant-hand', d.sqDominantHand);

    sv('observation-notes', d.observationNotes);
    sv('wound-notes',       d.woundNotes);

    sv('tenderness',     d.tenderness);
    sv('temperature',    d.temperature);
    sv('texture',        d.texture);
    sv('palpation-notes',d.palpationNotes);

    HandRomTable.populate(d.rom || []);

    sv('grip-r',       d.gripStrengthR);
    sv('grip-l',       d.gripStrengthL);
    sv('pinch-r',      d.pinchLateralR);
    sv('pinch-l',      d.pinchLateralL);
    sv('pinch-pulp-r', d.pinchPulpR);
    sv('pinch-pulp-l', d.pinchPulpL);
    sv('pinch-3pt-r',  d.pinch3ptR);
    sv('pinch-3pt-l',  d.pinch3ptL);
    sv('pulp-opposition', d.pulpOpposition);
    sv('fpc-2nd', d.fpc2nd);
    sv('fpc-3rd', d.fpc3rd);
    sv('fpc-4th', d.fpc4th);
    sv('fpc-5th', d.fpc5th);

    HandCircTable.populate(d.circumference || []);

    sv('light-touch-r', d.lightTouchR);
    sv('light-touch-l', d.lightTouchL);
    sv('pin-prick-r',   d.pinPrickR);
    sv('pin-prick-l',   d.pinPrickL);
    sv('two-point-r',   d.twoPointDiscR);
    sv('two-point-l',   d.twoPointDiscL);
    sv('sensation-notes', d.sensationNotes);

    var ot = d.otherTests || {};
    sv('tinels-r',       (ot.tinels       || {}).r);
    sv('tinels-l',       (ot.tinels       || {}).l);
    sv('phalens-r',      (ot.phalens      || {}).r);
    sv('phalens-l',      (ot.phalens      || {}).l);
    sv('finkelsteins-r', (ot.finkelsteins || {}).r);
    sv('finkelsteins-l', (ot.finkelsteins || {}).l);
    sv('fromens-r',      (ot.fromens      || {}).r);
    sv('fromens-l',      (ot.fromens      || {}).l);
    _populateCustomTests(d.customSpecialTests);

    var nr = d.neuro || {};
    var rf = nr.reflexes || {};
    var mm = nr.muscles  || {};
    sv('ref-c5-l',   (rf.c5   || {}).l); sv('ref-c5-r',   (rf.c5   || {}).r);
    sv('ref-c6-l',   (rf.c6   || {}).l); sv('ref-c6-r',   (rf.c6   || {}).r);
    sv('ref-c7-l',   (rf.c7   || {}).l); sv('ref-c7-r',   (rf.c7   || {}).r);
    sv('ref-c8t1-l', (rf.c8t1 || {}).l); sv('ref-c8t1-r', (rf.c8t1 || {}).r);
    sv('mmt-deltoid-l',     (mm.deltoid       || {}).l); sv('mmt-deltoid-r',     (mm.deltoid       || {}).r);
    sv('mmt-biceps-l',      (mm.biceps        || {}).l); sv('mmt-biceps-r',      (mm.biceps        || {}).r);
    sv('mmt-brachiorad-l',  (mm.brachiorad    || {}).l); sv('mmt-brachiorad-r',  (mm.brachiorad    || {}).r);
    sv('mmt-wristext-l',    (mm.wristExt      || {}).l); sv('mmt-wristext-r',    (mm.wristExt      || {}).r);
    sv('mmt-wristflex-l',   (mm.wristFlex     || {}).l); sv('mmt-wristflex-r',   (mm.wristFlex     || {}).r);
    sv('mmt-fingermpext-l', (mm.fingerMpExt   || {}).l); sv('mmt-fingermpext-r', (mm.fingerMpExt   || {}).r);
    sv('mmt-triceps-l',     (mm.triceps       || {}).l); sv('mmt-triceps-r',     (mm.triceps       || {}).r);
    sv('mmt-fingerflex-l',  (mm.fingerFlex    || {}).l); sv('mmt-fingerflex-r',  (mm.fingerFlex    || {}).r);
    sv('mmt-intrinsics-l',  (mm.handIntrinsics|| {}).l); sv('mmt-intrinsics-r',  (mm.handIntrinsics|| {}).r);

    sv('pt-impression', d.ptImpression);
    sv('stg',           d.stg);
    sv('ltg',           d.ltg);
    sv('plan',          d.plan);
  }

  /* ── reset ── */
  function reset() {
    FormBase.resetPatient();
    [
      'diagnosis','referral-source','management-type','surgery-date','surgery-type','pt-problem',
      'chart-notes',
      'pain-agg','pain-ease','pain-nature','pain-24hr',
      'hx-current','hx-past',
      'sq-general-health','sq-health-notes','sq-pmhx','sq-invest',
      'sq-medications','sq-allergies','sq-social','sq-occupation','sq-rec','sq-dominant-hand',
      'observation-notes','wound-notes',
      'tenderness','temperature','texture','palpation-notes',
      'grip-r','grip-l','pinch-r','pinch-l',
      'pinch-pulp-r','pinch-pulp-l','pinch-3pt-r','pinch-3pt-l',
      'pulp-opposition','fpc-2nd','fpc-3rd','fpc-4th','fpc-5th',
      'sensation-notes','light-touch-r','light-touch-l','pin-prick-r','pin-prick-l',
      'two-point-r','two-point-l',
      'tinels-r','tinels-l','phalens-r','phalens-l',
      'finkelsteins-r','finkelsteins-l','fromens-r','fromens-l',
      'ref-c5-l','ref-c5-r','ref-c6-l','ref-c6-r','ref-c7-l','ref-c7-r','ref-c8t1-l','ref-c8t1-r',
      'mmt-deltoid-l','mmt-deltoid-r','mmt-biceps-l','mmt-biceps-r',
      'mmt-brachiorad-l','mmt-brachiorad-r',
      'mmt-wristext-l','mmt-wristext-r','mmt-wristflex-l','mmt-wristflex-r',
      'mmt-fingermpext-l','mmt-fingermpext-r','mmt-triceps-l','mmt-triceps-r',
      'mmt-fingerflex-l','mmt-fingerflex-r','mmt-intrinsics-l','mmt-intrinsics-r',
      'pt-impression','stg','ltg','plan'
    ].forEach(function (id) { sv(id, ''); });

    document.querySelectorAll('input[name="sq-splinting"]').forEach(function (r) { r.checked = false; });

    _setIrr('');
    var pre = document.getElementById('pain-pre');
    var post = document.getElementById('pain-post');
    if (pre)  { pre.value  = 0; setPain('pre',  0); }
    if (post) { post.value = 0; setPain('post', 0); }

    HandChart.clearAll();
    HandRomTable.reset();
    HandCircTable.reset();

    var customTbody = document.getElementById('special-custom-tbody');
    if (customTbody) customTbody.innerHTML = '';

    onManagementChange();
    onHealthChange();
  }

  /* ── reveal helpers ── */
  function onManagementChange() {
    var row = document.getElementById('surgery-date-row');
    if (!row) return;
    var isSurgical = (gv('management-type') === 'Surgical');
    row.style.display = isSurgical ? 'flex' : 'none';
  }
  function onHealthChange() {
    var row = document.getElementById('sq-health-notes-row');
    if (!row) return;
    row.style.display = (gv('sq-general-health') === 'Other') ? '' : 'none';
  }

  /* ── public ── */
  return {
    collect:            collect,
    populate:           populate,
    reset:              reset,
    setPain:            setPain,
    pickIrr:            pickIrr,
    initSpecialTests:   initSpecialTests,
    onManagementChange: onManagementChange,
    onHealthChange:     onHealthChange
  };
}());

window.ActiveForm = HandForm;
window.Form = {
  collect:        HandForm.collect,
  populate:       HandForm.populate,
  reset:          HandForm.reset,
  setPain:        HandForm.setPain,
  pickIrr:        HandForm.pickIrr,
  onPtTypeChange: FormBase.onPtTypeChange,
  onNricInput:    FormBase.onNricInput,
  onDobChange:    FormBase.onDobChange
};
