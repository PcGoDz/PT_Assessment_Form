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
  function getChips(groupId) {
    var chips = document.querySelectorAll('#' + groupId + ' .chip.active');
    return Array.from(chips).map(function (c) { return c.dataset.value; });
  }
  function setChips(groupId, vals) {
    var chips = document.querySelectorAll('#' + groupId + ' .chip');
    chips.forEach(function (c) {
      c.classList.toggle('active', Array.isArray(vals) && vals.indexOf(c.dataset.value) !== -1);
    });
  }
  function clearChips(groupId) {
    document.querySelectorAll('#' + groupId + ' .chip').forEach(function (c) {
      c.classList.remove('active');
    });
  }

  /* ── ROM table ── */
  function collectRom() {
    var rows = document.querySelectorAll('#rom-tbody tr');
    var result = [];
    rows.forEach(function (row) {
      var movement = row.dataset.movement || '';
      var inputs   = row.querySelectorAll('input');
      if (inputs.length < 6) return;
      var activeL  = inputs[0].value.trim();
      var activeR  = inputs[1].value.trim();
      var passiveL = inputs[2].value.trim();
      var passiveR = inputs[3].value.trim();
      var opL      = inputs[4].value.trim();
      var opR      = inputs[5].value.trim();
      if (activeL || activeR || passiveL || passiveR || opL || opR) {
        result.push({ movement: movement, activeL: activeL, activeR: activeR,
                      passiveL: passiveL, passiveR: passiveR, opL: opL, opR: opR });
      }
    });
    return result;
  }
  function populateRom(tableData) {
    if (!Array.isArray(tableData)) return;
    tableData.forEach(function (rowData) {
      var tr = document.querySelector('#rom-tbody tr[data-movement="' + rowData.movement + '"]');
      if (!tr) return;
      var inputs = tr.querySelectorAll('input');
      if (inputs.length < 6) return;
      inputs[0].value = rowData.activeL  || '';
      inputs[1].value = rowData.activeR  || '';
      inputs[2].value = rowData.passiveL || '';
      inputs[3].value = rowData.passiveR || '';
      inputs[4].value = rowData.opL      || '';
      inputs[5].value = rowData.opR      || '';
    });
  }
  function clearRom() {
    document.querySelectorAll('#rom-tbody input').forEach(function (inp) { inp.value = ''; });
  }

  /* ── circumference table ── */
  function addCircRow() {
    var tbody = document.getElementById('circ-tbody');
    if (!tbody) return;
    var tr = document.createElement('tr');
    tr.innerHTML = '<td><input type="text" placeholder="e.g. Wrist" style="width:100%"></td>' +
                   '<td><input type="text" placeholder="cm" style="width:80px"></td>' +
                   '<td><button type="button" onclick="HandForm.removeCircRow(this)" ' +
                   'class="btn-ghost" style="padding:2px 8px;">×</button></td>';
    tbody.appendChild(tr);
  }
  function removeCircRow(btn) {
    var tr = btn.closest('tr');
    if (tr) tr.parentNode.removeChild(tr);
  }
  function collectCirc() {
    var rows   = document.querySelectorAll('#circ-tbody tr');
    var result = [];
    rows.forEach(function (row) {
      var inputs = row.querySelectorAll('input');
      var label  = inputs[0] ? inputs[0].value.trim() : '';
      var value  = inputs[1] ? inputs[1].value.trim() : '';
      if (label || value) result.push({ label: label, value: value });
    });
    return result;
  }
  function populateCirc(data) {
    var tbody = document.getElementById('circ-tbody');
    if (!tbody || !Array.isArray(data)) return;
    tbody.innerHTML = '';
    data.forEach(function (row) {
      var tr = document.createElement('tr');
      tr.innerHTML = '<td><input type="text" style="width:100%" value="' +
                     (row.label || '') + '"></td>' +
                     '<td><input type="text" style="width:80px" value="' +
                     (row.value || '') + '"></td>' +
                     '<td><button type="button" onclick="HandForm.removeCircRow(this)" ' +
                     'class="btn-ghost" style="padding:2px 8px;">×</button></td>';
      tbody.appendChild(tr);
    });
  }
  function clearCirc() {
    var tbody = document.getElementById('circ-tbody');
    if (tbody) tbody.innerHTML = '';
  }

  /* ── collect ── */
  function collect() {
    return {
      _form_type: 'HAND',
      meta:       { form: 'HAND' },
      patient:    FormBase.collectPatient(),

      /* Section 1 – Diagnosis */
      diagnosis:        gv('diagnosis'),
      referralSource:   gv('referral-source'),
      managementType:   gv('management-type'),
      surgeryDate:      gv('surgery-date'),
      surgeryType:      gv('surgery-type'),

      /* Section 2 – Hand Chart */
      handChart: {
        markers: HandChart.getData(),
        notes:   gv('chart-notes')
      },

      /* Section 3 – Chief Complaint */
      chiefComplaint:   gv('chief-complaint'),
      onsetDate:        gv('onset-date'),
      mechanism:        gv('mechanism'),

      /* Section 4 – Pain */
      painScoreR:       gv('pain-score-r'),
      painScoreL:       gv('pain-score-l'),
      painNature:       getChips('pain-nature-chips'),
      painAggravate:    gv('pain-aggravate'),
      painRelieve:      gv('pain-relieve'),

      /* Section 5 – Special Questions */
      sqGeneralHealth:  gv('sq-general-health'),
      sqHealthNotes:    gv('sq-health-notes'),
      sqMedications:    gv('sq-medications'),
      sqAllergies:      gv('sq-allergies'),
      sqOccupation:     gv('sq-occupation'),
      sqDominantHand:   gv('sq-dominant-hand'),

      /* Section 6 – History */
      pastMedHistory:   getChips('pmh-chips'),
      pastMedOther:     gv('pmh-other'),
      socialHistory:    gv('social-history'),
      familyHistory:    gv('family-history'),

      /* Section 7 – Observation */
      skinCondition:    getChips('skin-chips'),
      deformity:        getChips('deformity-chips'),
      swelling:         getChips('swelling-chips'),
      woundNotes:       gv('wound-notes'),
      observationNotes: gv('observation-notes'),

      /* Section 8 – Palpation */
      tenderness:       gv('tenderness'),
      temperature:      gv('temperature'),
      texture:          gv('texture'),
      palpationNotes:   gv('palpation-notes'),

      /* Section 9 – ROM */
      rom: { table: collectRom() },

      /* Section 10 – Strength & Circumference */
      gripStrengthR:    gv('grip-r'),
      gripStrengthL:    gv('grip-l'),
      pinchStrengthR:   gv('pinch-r'),
      pinchStrengthL:   gv('pinch-l'),
      circumference:    { table: collectCirc() },

      /* Section 11 – Sensation */
      lightTouchR:      gv('light-touch-r'),
      lightTouchL:      gv('light-touch-l'),
      pinPrickR:        gv('pin-prick-r'),
      pinPrickL:        gv('pin-prick-l'),
      twoPointDiscR:    gv('two-point-r'),
      twoPointDiscL:    gv('two-point-l'),
      sensationNotes:   gv('sensation-notes'),

      /* Section 12 – Other Tests & Neurology */
      otherTests: {
        tinels:       { r: gv('tinels-r'),       l: gv('tinels-l') },
        phalens:      { r: gv('phalens-r'),       l: gv('phalens-l') },
        finkelsteins: { r: gv('finkelsteins-r'),  l: gv('finkelsteins-l') },
        fromens:      { r: gv('fromens-r'),        l: gv('fromens-l') }
      },
      neuro: {
        reflexes: {
          c5:    { l: gv('ref-c5-l'),    r: gv('ref-c5-r') },
          c6:    { l: gv('ref-c6-l'),    r: gv('ref-c6-r') },
          c7:    { l: gv('ref-c7-l'),    r: gv('ref-c7-r') },
          c8t1:  { l: gv('ref-c8t1-l'), r: gv('ref-c8t1-r') }
        },
        muscles: {
          deltoid:       { l: gv('mmt-deltoid-l'),       r: gv('mmt-deltoid-r') },
          biceps:        { l: gv('mmt-biceps-l'),         r: gv('mmt-biceps-r') },
          wristExt:      { l: gv('mmt-wristext-l'),       r: gv('mmt-wristext-r') },
          wristFlex:     { l: gv('mmt-wristflex-l'),      r: gv('mmt-wristflex-r') },
          fingerMpExt:   { l: gv('mmt-fingermpext-l'),    r: gv('mmt-fingermpext-r') },
          triceps:       { l: gv('mmt-triceps-l'),         r: gv('mmt-triceps-r') },
          fingerFlex:    { l: gv('mmt-fingerflex-l'),      r: gv('mmt-fingerflex-r') },
          handIntrinsics:{ l: gv('mmt-intrinsics-l'),     r: gv('mmt-intrinsics-r') }
        }
      },

      /* Section 13 – PT Impression + Goals + Plan */
      ptImpression:     gv('pt-impression'),
      stg:              gv('stg'),
      ltg:              gv('ltg'),
      plan:             gv('plan')
    };
  }

  /* ── populate ── */
  function populate(d) {
    FormBase.populatePatient(d.patient);

    sv('diagnosis',       d.diagnosis);
    sv('referral-source', d.referralSource);
    sv('management-type', d.managementType);
    sv('surgery-date',    d.surgeryDate);
    sv('surgery-type',    d.surgeryType);
    onManagementChange();

    if (d.handChart) {
      HandChart.loadData(d.handChart.markers || []);
      sv('chart-notes', d.handChart.notes);
    }

    sv('chief-complaint', d.chiefComplaint);
    sv('onset-date',      d.onsetDate);
    sv('mechanism',       d.mechanism);

    sv('pain-score-r',  d.painScoreR);
    sv('pain-score-l',  d.painScoreL);
    setChips('pain-nature-chips', d.painNature);
    sv('pain-aggravate', d.painAggravate);
    sv('pain-relieve',   d.painRelieve);

    sv('sq-general-health', d.sqGeneralHealth);
    sv('sq-health-notes',   d.sqHealthNotes);
    onHealthChange();
    sv('sq-medications', d.sqMedications);
    sv('sq-allergies',   d.sqAllergies);
    sv('sq-occupation',  d.sqOccupation);
    sv('sq-dominant-hand', d.sqDominantHand);

    setChips('pmh-chips',       d.pastMedHistory);
    sv('pmh-other',             d.pastMedOther);
    sv('social-history',        d.socialHistory);
    sv('family-history',        d.familyHistory);

    setChips('skin-chips',     d.skinCondition);
    setChips('deformity-chips',d.deformity);
    setChips('swelling-chips', d.swelling);
    sv('wound-notes',          d.woundNotes);
    sv('observation-notes',    d.observationNotes);

    sv('tenderness',    d.tenderness);
    sv('temperature',   d.temperature);
    sv('texture',       d.texture);
    sv('palpation-notes', d.palpationNotes);

    if (d.rom) populateRom(d.rom.table);

    sv('grip-r',  d.gripStrengthR);
    sv('grip-l',  d.gripStrengthL);
    sv('pinch-r', d.pinchStrengthR);
    sv('pinch-l', d.pinchStrengthL);
    if (d.circumference) populateCirc(d.circumference.table);

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

    var nr = (d.neuro || {});
    var rf = nr.reflexes  || {};
    var mm = nr.muscles   || {};
    sv('ref-c5-l',  (rf.c5   || {}).l); sv('ref-c5-r',  (rf.c5   || {}).r);
    sv('ref-c6-l',  (rf.c6   || {}).l); sv('ref-c6-r',  (rf.c6   || {}).r);
    sv('ref-c7-l',  (rf.c7   || {}).l); sv('ref-c7-r',  (rf.c7   || {}).r);
    sv('ref-c8t1-l',(rf.c8t1 || {}).l); sv('ref-c8t1-r',(rf.c8t1 || {}).r);
    sv('mmt-deltoid-l',      (mm.deltoid        || {}).l); sv('mmt-deltoid-r',      (mm.deltoid        || {}).r);
    sv('mmt-biceps-l',       (mm.biceps         || {}).l); sv('mmt-biceps-r',       (mm.biceps         || {}).r);
    sv('mmt-wristext-l',     (mm.wristExt       || {}).l); sv('mmt-wristext-r',     (mm.wristExt       || {}).r);
    sv('mmt-wristflex-l',    (mm.wristFlex      || {}).l); sv('mmt-wristflex-r',    (mm.wristFlex      || {}).r);
    sv('mmt-fingermpext-l',  (mm.fingerMpExt    || {}).l); sv('mmt-fingermpext-r',  (mm.fingerMpExt    || {}).r);
    sv('mmt-triceps-l',      (mm.triceps        || {}).l); sv('mmt-triceps-r',      (mm.triceps        || {}).r);
    sv('mmt-fingerflex-l',   (mm.fingerFlex     || {}).l); sv('mmt-fingerflex-r',   (mm.fingerFlex     || {}).r);
    sv('mmt-intrinsics-l',   (mm.handIntrinsics || {}).l); sv('mmt-intrinsics-r',   (mm.handIntrinsics || {}).r);

    sv('pt-impression', d.ptImpression);
    sv('stg',           d.stg);
    sv('ltg',           d.ltg);
    sv('plan',          d.plan);
  }

  /* ── reset ── */
  function reset() {
    FormBase.resetPatient();

    ['diagnosis','referral-source','management-type','surgery-date','surgery-type',
     'chart-notes','chief-complaint','onset-date','mechanism',
     'pain-score-r','pain-score-l','pain-aggravate','pain-relieve',
     'sq-general-health','sq-health-notes','sq-medications','sq-allergies',
     'sq-occupation','sq-dominant-hand',
     'pmh-other','social-history','family-history',
     'wound-notes','observation-notes',
     'tenderness','temperature','texture','palpation-notes',
     'grip-r','grip-l','pinch-r','pinch-l','sensation-notes',
     'light-touch-r','light-touch-l','pin-prick-r','pin-prick-l',
     'two-point-r','two-point-l',
     'tinels-r','tinels-l','phalens-r','phalens-l',
     'finkelsteins-r','finkelsteins-l','fromens-r','fromens-l',
     'ref-c5-l','ref-c5-r','ref-c6-l','ref-c6-r','ref-c7-l','ref-c7-r','ref-c8t1-l','ref-c8t1-r',
     'mmt-deltoid-l','mmt-deltoid-r','mmt-biceps-l','mmt-biceps-r',
     'mmt-wristext-l','mmt-wristext-r','mmt-wristflex-l','mmt-wristflex-r',
     'mmt-fingermpext-l','mmt-fingermpext-r','mmt-triceps-l','mmt-triceps-r',
     'mmt-fingerflex-l','mmt-fingerflex-r','mmt-intrinsics-l','mmt-intrinsics-r',
     'pt-impression','stg','ltg','plan'
    ].forEach(function (id) { sv(id, ''); });

    ['pain-nature-chips','pmh-chips','skin-chips','deformity-chips','swelling-chips'
    ].forEach(function (g) { clearChips(g); });

    HandChart.clearAll();
    clearRom();
    clearCirc();
    onManagementChange();
    onHealthChange();
  }

  /* ── reveal helpers ── */
  function onManagementChange() {
    var row = document.getElementById('surgery-date-row');
    if (!row) return;
    row.style.display = (gv('management-type') === 'Surgical') ? '' : 'none';
  }
  function onHealthChange() {
    var row = document.getElementById('sq-health-notes-row');
    if (!row) return;
    row.style.display = (gv('sq-general-health') === 'Other') ? '' : 'none';
  }

  /* ── chip delegation (called from DOMContentLoaded in HTML) ── */
  function initChips() {
    document.querySelectorAll('.chip-group').forEach(function (group) {
      group.addEventListener('click', function (e) {
        var chip = e.target.closest('.chip');
        if (!chip || !group.contains(chip)) return;
        chip.classList.toggle('active');
      });
    });
  }

  /* ── public ── */
  return {
    collect:            collect,
    populate:           populate,
    reset:              reset,
    addCircRow:         addCircRow,
    removeCircRow:      removeCircRow,
    onManagementChange: onManagementChange,
    onHealthChange:     onHealthChange,
    initChips:          initChips
  };
}());

window.ActiveForm = HandForm;
window.Form = {
  collect:         HandForm.collect,
  populate:        HandForm.populate,
  reset:           HandForm.reset,
  onPtTypeChange:  FormBase.onPtTypeChange,
  onNricInput:     FormBase.onNricInput,
  onDobChange:     FormBase.onDobChange
};
