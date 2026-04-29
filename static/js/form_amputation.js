// form_amputation.js — Amputee assessment form logic

var AmputationForm = (function () {

  function gv(id)        { return FormBase.gv(id); }
  function sv(id, val)   { return FormBase.sv(id, val); }
  function radio(name)   { return FormBase.radio(name); }
  function setRadio(n,v) { return FormBase.setRadio(n, v); }
  function cb(id)        { var el = document.getElementById(id); return el ? el.checked : false; }
  function setCb(id, v)  { var el = document.getElementById(id); if (el) el.checked = !!v; }

  // ── Pain slider ──────────────────────────────
  function setPain(id, v) {
    var n  = parseInt(v);
    var el = document.getElementById('pv-' + id);
    if (!el) return;
    el.textContent = n;
    el.className   = 'pain-val ' + (n <= 3 ? 'pv-low' : n <= 6 ? 'pv-mid' : 'pv-high');
  }

  // ── Irritability chips ───────────────────────
  function pickIrr(val) {
    document.querySelectorAll('.irr-chip').forEach(function(c) { c.className = 'irr-chip'; });
    var chip = document.getElementById('irr-' + val);
    if (chip) chip.classList.add('sel-' + val);
  }

  function getIrr() {
    if (document.querySelector('.irr-chip.sel-High'))   return 'High';
    if (document.querySelector('.irr-chip.sel-Medium')) return 'Medium';
    if (document.querySelector('.irr-chip.sel-Low'))    return 'Low';
    return '';
  }

  // ── Doctor's management toggle ───────────────
  function onMgmtChange(val) {
    var row = document.getElementById('surgery-date-row');
    if (row) row.style.display = (val === 'Surgical') ? 'flex' : 'none';
  }

  // ── Phantom limb toggle ──────────────────────
  function onPhantomChange(val) {
    var block = document.getElementById('phantom-comments-block');
    if (block) block.style.display = (val === 'Yes') ? '' : 'none';
  }

  // ── Outcome measures skip toggle ─────────────
  function onOutcomeSkip(checked) {
    var skipBlock   = document.getElementById('outcome-skip-block');
    var scoresBlock = document.getElementById('outcome-scores-block');
    if (skipBlock)   skipBlock.style.display   = checked ? '' : 'none';
    if (scoresBlock) scoresBlock.style.display = checked ? 'none' : '';
  }

  // ── Add row helpers ──────────────────────────
  function addMovRow() {
    var tb = document.getElementById('movement-table-body');
    var tr = document.createElement('tr');
    tr.innerHTML =
      '<td><input type="text" placeholder="Joint..."></td>' +
      '<td><input type="text" placeholder="Active..."></td>' +
      '<td><input type="text" placeholder="Passive..."></td>' +
      '<td><input type="text" placeholder="Comments..."></td>';
    tb.appendChild(tr);
  }

  // ── Movement table ───────────────────────────
  function collectMovements() {
    var rows = document.querySelectorAll('#movement-table-body tr');
    var out  = [];
    rows.forEach(function(row) {
      var inputs = row.querySelectorAll('input, textarea');
      if (inputs.length >= 4) {
        var joint    = inputs[0].value.trim();
        var active   = inputs[1].value.trim();
        var passive  = inputs[2].value.trim();
        var comments = inputs[3].value.trim();
        if (joint || active || passive || comments) {
          out.push({ joint: joint, active: active, passive: passive, comments: comments });
        }
      }
    });
    return out;
  }

  function populateMovements(movements) {
    if (!movements || !movements.length) return;
    var rows = document.querySelectorAll('#movement-table-body tr');
    movements.forEach(function(m, i) {
      if (i < rows.length) {
        var inputs = rows[i].querySelectorAll('input, textarea');
        if (inputs.length >= 4) {
          inputs[0].value = m.joint    || '';
          inputs[1].value = m.active   || '';
          inputs[2].value = m.passive  || '';
          inputs[3].value = m.comments || '';
        }
      }
    });
  }

  // ── Collect ──────────────────────────────────
  function collect(currentId) {
    var d = { _form_type: 'amputation' };
    if (currentId) d.id = currentId;

    d.patient = FormBase.collectPatient();

    // Diagnosis
    d.diagnosis           = gv('diagnosis');
    d.doctors_management  = gv('doctors-management');
    d.surgery_date        = gv('surgery-date');
    d.problems            = gv('problems');

    // Pain
    d.pain_pre            = gv('pain-pre');
    d.pain_post           = gv('pain-post');
    d.pain_nature         = gv('pain-nature');
    d.pain_agg            = gv('pain-agg');
    d.pain_ease           = gv('pain-ease');
    d.pain_irritability   = getIrr();

    // Phantom limb
    d.phantom_present     = radio('phantom-present');
    d.phantom_type        = gv('phantom-type');
    d.phantom_duration    = gv('phantom-duration');
    d.phantom_comments    = gv('phantom-comments');

    // Special questions
    d.sq_general_health   = gv('sq-general-health');
    d.sq_pmhx             = gv('sq-pmhx');
    d.sq_medication       = gv('sq-medication');
    d.sq_social_history   = gv('sq-social-history');
    d.sq_home_access      = gv('sq-home-access');
    d.sq_pre_morbid       = gv('sq-pre-morbid');

    // Prosthetic usage
    d.prosthetic_types      = gv('prosthetic-types');
    d.prosthetic_don_doff   = gv('prosthetic-don-doff');
    d.prosthetic_static_wb  = gv('prosthetic-static-wb');
    d.prosthetic_max_walk   = gv('prosthetic-max-walk');
    d.prosthetic_duration   = gv('prosthetic-duration');

    // Body chart
    if (window.BodyChart) d.bodyChart = { markers: BodyChart.getData(), notes: gv('chart-notes') };

    // History
    d.current_history     = gv('current-history');
    d.past_history        = gv('past-history');

    // Observation
    d.obs_general         = gv('obs-general');
    d.obs_stump_condition = gv('obs-stump-condition');
    d.obs_bandaging       = gv('obs-bandaging');
    d.obs_gait            = gv('obs-gait');

    // Palpation
    d.palpation           = gv('palpation');

    // Cardiorespiratory
    d.cardio_status       = gv('cardio-status');

    // Movement table
    d.movements           = collectMovements();

    // MMT table
    d.mmt                 = MmtTable.getData();

    // Stump measurement
    d.stump_length        = gv('stump-length');
    d.stump_circumference = gv('stump-circumference');

    // Clearing tests
    d.clearing_tests      = gv('clearing-tests');

    // Outcome measurement
    d.outcome_skipped     = cb('outcome-skipped');
    d.outcome_skip_reason = gv('outcome-skip-reason');
    d.outcome_skip_notes  = gv('outcome-skip-notes');
    d.mrmi_date           = gv('mrmi-date');
    d.mrmi_1              = gv('mrmi-1');
    d.mrmi_2              = gv('mrmi-2');
    d.mrmi_3              = gv('mrmi-3');
    d.mrmi_4              = gv('mrmi-4');
    d.mrmi_5              = gv('mrmi-5');
    d.mrmi_6              = gv('mrmi-6');
    d.mrmi_7              = gv('mrmi-7');
    d.mrmi_8              = gv('mrmi-8');
    d.tug_walking_aid     = gv('tug-walking-aid');
    d.tug_distance        = gv('tug-distance');
    d.mwt_walking_aid     = gv('mwt-walking-aid');
    d.mwt_distance        = gv('mwt-distance');

    // Goals
    d.pt_impression       = gv('pt-impression');
    d.patient_goals       = gv('patient-goals');
    d.short_term_goals    = gv('short-term-goals');
    d.long_term_goals     = gv('long-term-goals');
    d.plan_of_treatment   = gv('plan-of-treatment');

    return d;
  }

  // ── Populate ─────────────────────────────────
  function populate(data) {
    if (!data) return;

    if (data.patient) FormBase.populatePatient(data.patient);

    sv('diagnosis',          data.diagnosis);
    sv('doctors-management', data.doctors_management);
    onMgmtChange(data.doctors_management);
    sv('surgery-date',       data.surgery_date);
    sv('problems',           data.problems);

    var pre  = parseInt(data.pain_pre  || 0);
    var post = parseInt(data.pain_post || 0);
    var preEl  = document.getElementById('pain-pre');
    var postEl = document.getElementById('pain-post');
    if (preEl)  { preEl.value  = pre;  setPain('pre',  pre); }
    if (postEl) { postEl.value = post; setPain('post', post); }
    sv('pain-nature',        data.pain_nature);
    sv('pain-agg',           data.pain_agg);
    sv('pain-ease',          data.pain_ease);
    if (data.pain_irritability) pickIrr(data.pain_irritability);

    setRadio('phantom-present', data.phantom_present);
    onPhantomChange(data.phantom_present);
    sv('phantom-type',       data.phantom_type);
    sv('phantom-duration',   data.phantom_duration);
    sv('phantom-comments',   data.phantom_comments);

    sv('sq-general-health',  data.sq_general_health);
    sv('sq-pmhx',            data.sq_pmhx);
    sv('sq-medication',      data.sq_medication);
    sv('sq-social-history',  data.sq_social_history);
    sv('sq-home-access',     data.sq_home_access);
    sv('sq-pre-morbid',      data.sq_pre_morbid);

    sv('prosthetic-types',    data.prosthetic_types);
    sv('prosthetic-don-doff', data.prosthetic_don_doff);
    sv('prosthetic-static-wb',data.prosthetic_static_wb);
    sv('prosthetic-max-walk', data.prosthetic_max_walk);
    sv('prosthetic-duration', data.prosthetic_duration);

    if (window.BodyChart && data.bodyChart) {
      BodyChart.loadData(data.bodyChart.markers);
      sv('chart-notes', data.bodyChart.notes);
    }

    sv('current-history',    data.current_history);
    sv('past-history',       data.past_history);

    sv('obs-general',        data.obs_general);
    sv('obs-stump-condition',data.obs_stump_condition);
    sv('obs-bandaging',      data.obs_bandaging);
    sv('obs-gait',           data.obs_gait);

    sv('palpation',          data.palpation);
    sv('cardio-status',      data.cardio_status);

    populateMovements(data.movements);
    // Backward-compat: old records stored {muscle, side, grade, comment} per limb;
    // new MmtTable expects bilateral {muscle, gradeR, gradeL}.
    var mmtData = (data.mmt || []).map(function(r) {
      if (r.gradeR !== undefined || r.gradeL !== undefined) return r;
      var out = { muscle: r.muscle || '' };
      out[r.side === 'Left' ? 'gradeL' : 'gradeR'] = r.grade || '';
      out[r.side === 'Left' ? 'gradeR' : 'gradeL'] = '';
      return out;
    });
    MmtTable.loadData(mmtData);

    sv('stump-length',       data.stump_length);
    sv('stump-circumference',data.stump_circumference);
    sv('clearing-tests',     data.clearing_tests);

    setCb('outcome-skipped', data.outcome_skipped);
    onOutcomeSkip(data.outcome_skipped);
    sv('outcome-skip-reason',data.outcome_skip_reason);
    sv('outcome-skip-notes', data.outcome_skip_notes);
    sv('mrmi-date',          data.mrmi_date);
    sv('mrmi-1', data.mrmi_1); sv('mrmi-2', data.mrmi_2);
    sv('mrmi-3', data.mrmi_3); sv('mrmi-4', data.mrmi_4);
    sv('mrmi-5', data.mrmi_5); sv('mrmi-6', data.mrmi_6);
    sv('mrmi-7', data.mrmi_7); sv('mrmi-8', data.mrmi_8);
    sv('tug-walking-aid',    data.tug_walking_aid);
    sv('tug-distance',       data.tug_distance);
    sv('mwt-walking-aid',    data.mwt_walking_aid);
    sv('mwt-distance',       data.mwt_distance);

    sv('pt-impression',      data.pt_impression);
    sv('patient-goals',      data.patient_goals);
    sv('short-term-goals',   data.short_term_goals);
    sv('long-term-goals',    data.long_term_goals);
    sv('plan-of-treatment',  data.plan_of_treatment);
  }

  // ── Reset ────────────────────────────────────
  function reset() {
    var ids = [
      'diagnosis','doctors-management','surgery-date','problems',
      'pain-nature','pain-agg','pain-ease',
      'phantom-comments','phantom-type','phantom-duration',
      'sq-general-health','sq-pmhx','sq-medication',
      'sq-social-history','sq-home-access','sq-pre-morbid',
      'prosthetic-types','prosthetic-don-doff','prosthetic-static-wb',
      'prosthetic-max-walk','prosthetic-duration',
      'current-history','past-history',
      'obs-general','obs-stump-condition','obs-bandaging','obs-gait',
      'palpation','cardio-status',
      'stump-length','stump-circumference','clearing-tests',
      'outcome-skip-reason','outcome-skip-notes','mrmi-date',
      'mrmi-1','mrmi-2','mrmi-3','mrmi-4',
      'mrmi-5','mrmi-6','mrmi-7','mrmi-8',
      'tug-walking-aid','tug-distance','mwt-walking-aid','mwt-distance',
      'pt-impression','patient-goals','short-term-goals',
      'long-term-goals','plan-of-treatment'
    ];
    ids.forEach(function(id) { sv(id, ''); });

    // Reset sliders
    var preEl  = document.getElementById('pain-pre');
    var postEl = document.getElementById('pain-post');
    if (preEl)  { preEl.value  = 0; setPain('pre',  0); }
    if (postEl) { postEl.value = 0; setPain('post', 0); }

    // Reset irr chips
    document.querySelectorAll('.irr-chip').forEach(function(c) { c.className = 'irr-chip'; });

    setCb('outcome-skipped', false);
    onOutcomeSkip(false);

    document.querySelectorAll('input[name="phantom-present"]').forEach(function(el) { el.checked = false; });
    onPhantomChange('No');
    onMgmtChange('');

    document.querySelectorAll('#movement-table-body input, #movement-table-body textarea').forEach(function(el) { el.value = ''; });
    MmtTable.clear();

    if (window.BodyChart) BodyChart.clearAll();
    FormBase.resetPatient();
  }

  var api = {
    collect:            collect,
    populate:           populate,
    reset:              reset,
    setPain:            setPain,
    pickIrr:            pickIrr,
    addMovRow:          addMovRow,
    onMgmtChange:       onMgmtChange,
    onPhantomChange:    onPhantomChange,
    onOutcomeSkip:      onOutcomeSkip,
  };

  window.ActiveForm = api;

  window.Form = {
    collect:          api.collect,
    populate:         api.populate,
    reset:            api.reset,
    setPain:          api.setPain,
    pickIrr:          api.pickIrr,
    onPtTypeChange:   FormBase.onPtTypeChange,
    onNricInput:      FormBase.onNricInput,
    onDobChange:      FormBase.onDobChange,
  };

  return api;

})();
