// form_neuro.js — Neurology assessment form logic

var NeuroForm = (function () {

  function gv(id)        { return FormBase.gv(id); }
  function sv(id, val)   { return FormBase.sv(id, val); }
  function radio(name)   { return FormBase.radio(name); }
  function setRadio(n,v) { return FormBase.setRadio(n, v); }

  // ── Chip helpers ─────────────────────────────────────
  function toggleChip(el, groupId) {
    el.classList.toggle('active');
  }

  function getChips(groupId) {
    var result = [];
    document.querySelectorAll('#' + groupId + ' .chip.active').forEach(function(c) {
      result.push(c.textContent.trim());
    });
    return result;
  }

  function setChips(groupId, values) {
    if (!values || !Array.isArray(values)) return;
    document.querySelectorAll('#' + groupId + ' .chip').forEach(function(c) {
      c.classList.toggle('active', values.indexOf(c.textContent.trim()) !== -1);
    });
  }

  // ── Pain / Borg sliders ───────────────────────────────
  function onPainChange(val) {
    var n  = parseInt(val);
    var el = document.getElementById('pain-display');
    if (!el) return;
    el.textContent = n;
    el.className   = 'pain-val ' + (n <= 3 ? 'pv-low' : n <= 6 ? 'pv-mid' : 'pv-high');
  }

  function onBorgChange(val) {
    var n  = parseInt(val);
    var el = document.getElementById('borg-display');
    if (!el) return;
    el.textContent = n;
    el.className   = 'pain-val ' + (n <= 3 ? 'pv-low' : n <= 6 ? 'pv-mid' : 'pv-high');
  }

  // ── Conditional reveals ───────────────────────────────
  function onPrevMobilityChange(val) {
    var f = document.getElementById('walking-aid-field');
    if (f) f.style.display = (val === 'Limited') ? '' : 'none';
  }

  function onTremorChange(val) {
    var f = document.getElementById('tremor-type-field');
    if (f) f.style.display = (val === 'Yes') ? '' : 'none';
  }

  // ── MRMI total ────────────────────────────────────────
  function calcMrmiTotal() {
    var ids = ['mrmi-turn','mrmi-lying-sit','mrmi-sit-balance','mrmi-sit-stand',
               'mrmi-standing','mrmi-transfer','mrmi-walk','mrmi-stairs'];
    var total  = 0;
    var scored = 0;
    ids.forEach(function(id) {
      var el = document.getElementById(id);
      if (el && el.value !== '') {
        total += parseInt(el.value);
        scored++;
      }
    });
    var disp = document.getElementById('mrmi-total');
    if (disp) disp.textContent = scored > 0 ? total + ' / 40' : '— / 40';
  }

  // ── 10MWT speed calculation ───────────────────────────
  function calc10MWT() {
    var t    = parseFloat(gv('mwt10-time'));
    var disp = document.getElementById('mwt10-speed');
    if (!disp) return;
    if (t > 0) {
      disp.textContent = '= ' + (10 / t).toFixed(2) + ' m/s';
    } else {
      disp.textContent = '';
    }
  }

  // ── Outcome flags ─────────────────────────────────────
  function flagTug() {
    var t    = parseFloat(gv('tug-time'));
    var disp = document.getElementById('tug-flag');
    if (!disp) return;
    if (!t) { disp.textContent = ''; return; }
    var flags = [];
    if (t > 13.5) flags.push('⚠ Fall risk (Stroke)');
    if (t > 11.5) flags.push('⚠ Fall risk (PD)');
    disp.textContent = flags.join(' | ');
  }

  function flagBerg() {
    var s    = parseInt(gv('berg-score'));
    var disp = document.getElementById('berg-flag');
    if (!disp) return;
    disp.textContent = (!isNaN(s) && s < 45) ? '⚠ Increased fall risk' : '';
  }

  function flagFrt() {
    var s    = parseFloat(gv('frt-score'));
    var disp = document.getElementById('frt-flag');
    if (!disp) return;
    if (isNaN(s) || s === 0) { disp.textContent = ''; return; }
    if (s < 15)       disp.textContent = '⚠ High fall risk';
    else if (s <= 25) disp.textContent = '⚡ Moderate fall risk';
    else              disp.textContent = '✓ Low fall risk';
  }

  // ── Dynamic table rows ────────────────────────────────
  function addRomRow() {
    var tb = document.getElementById('rom-tbody');
    if (!tb) return;
    var tr = document.createElement('tr');
    var limbOpts = '<option value="">—</option><option>UL</option><option>LL</option>';
    tr.innerHTML =
      '<td><input type="text" placeholder="Joint..." style="width:100%"></td>' +
      '<td><select style="width:100%">' + limbOpts + '</select></td>' +
      '<td><input type="text" placeholder="Active ROM..." style="width:100%"></td>' +
      '<td><input type="text" placeholder="Passive ROM..." style="width:100%"></td>' +
      '<td><button class="btn-ghost btn-sm" onclick="this.closest(\'tr\').remove()">✕</button></td>';
    tb.appendChild(tr);
  }

  // ── Table serialisers ─────────────────────────────────
  function collectTable(tbodyId) {
    var rows = [];
    var tb   = document.getElementById(tbodyId);
    if (!tb) return rows;
    tb.querySelectorAll('tr').forEach(function(tr) {
      var cells = tr.querySelectorAll('input, select, textarea');
      var row   = [];
      cells.forEach(function(c) { row.push(c.value); });
      rows.push(row);
    });
    return rows;
  }

  function restoreTable(tbodyId, rows, addFn) {
    var tb = document.getElementById(tbodyId);
    if (!tb) return;
    tb.innerHTML = '';
    if (!rows || !rows.length) return;
    rows.forEach(function(row) {
      addFn();
      var cells = tb.querySelectorAll('tr:last-child input, tr:last-child select, tr:last-child textarea');
      cells.forEach(function(c, i) { if (row[i] !== undefined) c.value = row[i]; });
    });
  }

  // ── COLLECT ───────────────────────────────────────────
  function collect() {
    return {
      _form_type: 'NEURO',
      meta:       { form: 'NEURO' },
      patient:    FormBase.collectPatient(),
      diagnosis:  gv('diagnosis'),
      dr_mgmt:    radio('dr-mgmt'),
      pain_score: gv('pain-score'),
      complaint:  getChips('complaint-chips'),
      complaint_text: gv('complaint-text'),
      patient_goal: gv('patient-goal'),

      onset_value: gv('onset-value'),
      onset_unit:  gv('onset-unit'),
      limbs:       getChips('limb-chips'),
      prev_episode: radio('prev-episode'),
      prev_mobility: radio('prev-mobility'),
      prev_aid:    getChips('prev-aid-chips'),
      pmhx_chips:  getChips('pmhx-chips'),
      pmhx_details: gv('pmhx-details'),
      past_pt:     radio('past-pt'),
      past_pt_outcome: gv('past-pt-outcome'),

      investigations: InvMedTable.getData().investigations,
      medications:    InvMedTable.getData().medications,

      gen_health:  radio('gen-health'),
      emotional_status: gv('emotional-status'),
      bladder:     radio('bladder'),
      bowel:       radio('bowel'),
      vision:      getChips('vision-chips'),
      hearing:     getChips('hearing-chips'),
      sensation_gen: radio('sensation-gen'),
      hand_dom:    radio('hand-dom'),
      premorbid_indep: radio('premorbid-indep'),
      current_indep:   radio('current-indep'),
      house_type:  radio('house-type'),
      toilet_type: radio('toilet-type'),
      has_stairs:  radio('has-stairs'),
      door_width:  radio('door-width'),
      occupation:  gv('occupation'),
      hobbies:     gv('hobbies'),

      appearance:  getChips('appearance-chips'),
      consciousness: getChips('consciousness-chips'),
      posture_obs: getChips('posture-obs-chips'),
      mobility_obs: getChips('mobility-obs-chips'),
      emotional_obs: getChips('emotional-obs-chips'),
      resp_obs:    getChips('resp-obs-chips'),
      devices:     getChips('devices-chips'),
      bodyChart:   { markers: BodyChart.getData(), notes: gv('chart-notes') },

      bp_sys:  gv('bp-sys'),
      bp_dia:  gv('bp-dia'),
      hr:      gv('heart-rate'),
      rr:      gv('resp-rate'),
      spo2:    gv('spo2'),
      breathing_pattern: radio('breathing-pattern'),
      breathing_type:    radio('breathing-type'),

      tone_rul:   gv('tone-rul'),
      tone_lul:   gv('tone-lul'),
      tone_rll:   gv('tone-rll'),
      tone_lll:   gv('tone-lll'),
      tone_notes: gv('tone-notes'),
      mmt:        MmtTable.getData(),
      rom:        collectTable('rom-tbody'),

      ftn:     radio('ftn'),
      hts:     radio('hts'),
      ram:     radio('ram'),
      tremor:  radio('tremor'),
      tremor_type: radio('tremor-type'),

      lt:      radio('lt'),
      pp:      radio('pp'),
      thermal: radio('thermal'),
      sensation_notes: gv('sensation-notes'),
      prop_ul: radio('prop-ul'),
      prop_ll: radio('prop-ll'),

      cognitive:     getChips('cognitive-chips'),
      communication: radio('communication'),
      orofacial:     radio('orofacial'),
      orofacial_notes: gv('orofacial-notes'),
      other_findings:  gv('other-findings'),

      sit_balance:   getChips('sit-balance-chips'),
      stand_balance: getChips('stand-balance-chips'),
      balance_notes: gv('balance-notes'),

      mrmi_turn:      gv('mrmi-turn'),
      mrmi_lying_sit: gv('mrmi-lying-sit'),
      mrmi_sit_balance: gv('mrmi-sit-balance'),
      mrmi_sit_stand: gv('mrmi-sit-stand'),
      mrmi_standing:  gv('mrmi-standing'),
      mrmi_transfer:  gv('mrmi-transfer'),
      mrmi_walk:      gv('mrmi-walk'),
      mrmi_stairs:    gv('mrmi-stairs'),

      gait_pattern: getChips('gait-pattern-chips'),
      walking_aid:  getChips('walking-aid-chips'),
      mwt10_time:   gv('mwt10-time'),
      turning:      getChips('turning-chips'),
      gait_notes:   gv('gait-notes'),

      sixmwt_dist:     gv('sixmwt-dist'),
      sixmwt_pre_hr:   gv('sixmwt-pre-hr'),
      sixmwt_post_hr:  gv('sixmwt-post-hr'),
      sixmwt_pre_spo2: gv('sixmwt-pre-spo2'),
      sixmwt_post_spo2: gv('sixmwt-post-spo2'),
      borg_rpe:        gv('borg-rpe'),

      tug_time:    gv('tug-time'),
      berg_score:  gv('berg-score'),
      frt_score:   gv('frt-score'),
      other_outcomes: getChips('other-outcome-chips'),
      outcome_notes:  gv('outcome-notes'),

      pt_impression: gv('pt-impression-bsf'),
      pt_impression_al: gv('pt-impression-al'),
      pt_impression_pr: gv('pt-impression-pr'),
      stg:   gv('stg'),
      ltg:   gv('ltg'),
      plan:  getChips('plan-chips'),
      plan_notes: gv('plan-notes'),
    };
  }

  // ── POPULATE ──────────────────────────────────────────
  function populate(d) {
    if (!d) return;
    FormBase.populatePatient(d.patient);
    sv('diagnosis', d.diagnosis);
    setRadio('dr-mgmt', d.dr_mgmt);
    var ps = document.getElementById('pain-score');
    if (ps) { ps.value = d.pain_score || 0; onPainChange(ps.value); }
    setChips('complaint-chips', d.complaint);
    sv('complaint-text', d.complaint_text);
    sv('patient-goal', d.patient_goal);

    sv('onset-value', d.onset_value);
    if (d.onset_unit) { var ou = document.getElementById('onset-unit'); if (ou) ou.value = d.onset_unit; }
    setChips('limb-chips', d.limbs);
    setRadio('prev-episode', d.prev_episode);
    setRadio('prev-mobility', d.prev_mobility);
    if (d.prev_mobility) onPrevMobilityChange(d.prev_mobility);
    setChips('prev-aid-chips', d.prev_aid);
    setChips('pmhx-chips', d.pmhx_chips);
    sv('pmhx-details', d.pmhx_details);
    setRadio('past-pt', d.past_pt);
    sv('past-pt-outcome', d.past_pt_outcome);

    InvMedTable.loadData({ investigations: d.investigations, medications: d.medications });

    setRadio('gen-health', d.gen_health);
    sv('emotional-status', d.emotional_status);
    setRadio('bladder', d.bladder);
    setRadio('bowel',   d.bowel);
    setChips('vision-chips',   d.vision);
    setChips('hearing-chips',  d.hearing);
    setRadio('sensation-gen',  d.sensation_gen);
    setRadio('hand-dom',       d.hand_dom);
    setRadio('premorbid-indep', d.premorbid_indep);
    setRadio('current-indep',   d.current_indep);
    setRadio('house-type', d.house_type);
    setRadio('toilet-type', d.toilet_type);
    setRadio('has-stairs', d.has_stairs);
    setRadio('door-width', d.door_width);
    sv('occupation', d.occupation);
    sv('hobbies',    d.hobbies);

    setChips('appearance-chips',    d.appearance);
    setChips('consciousness-chips', d.consciousness);
    setChips('posture-obs-chips',   d.posture_obs);
    setChips('mobility-obs-chips',  d.mobility_obs);
    setChips('emotional-obs-chips', d.emotional_obs);
    setChips('resp-obs-chips',      d.resp_obs);
    setChips('devices-chips',       d.devices);
    if (d.bodyChart) {
      if (d.bodyChart.markers) BodyChart.loadData(d.bodyChart.markers);
      sv('chart-notes', d.bodyChart.notes);
    }

    sv('bp-sys',     d.bp_sys);
    sv('bp-dia',     d.bp_dia);
    sv('heart-rate', d.hr);
    sv('resp-rate',  d.rr);
    sv('spo2',       d.spo2);
    setRadio('breathing-pattern', d.breathing_pattern);
    setRadio('breathing-type',    d.breathing_type);

    sv('tone-rul',   d.tone_rul);
    sv('tone-lul',   d.tone_lul);
    sv('tone-rll',   d.tone_rll);
    sv('tone-lll',   d.tone_lll);
    sv('tone-notes', d.tone_notes);
    MmtTable.loadData(d.mmt);
    restoreTable('rom-tbody', d.rom, addRomRow);

    setRadio('ftn',    d.ftn);
    setRadio('hts',    d.hts);
    setRadio('ram',    d.ram);
    setRadio('tremor', d.tremor);
    if (d.tremor) onTremorChange(d.tremor);
    setRadio('tremor-type', d.tremor_type);

    setRadio('lt',      d.lt);
    setRadio('pp',      d.pp);
    setRadio('thermal', d.thermal);
    sv('sensation-notes', d.sensation_notes);
    setRadio('prop-ul', d.prop_ul);
    setRadio('prop-ll', d.prop_ll);

    setChips('cognitive-chips', d.cognitive);
    setRadio('communication', d.communication);
    setRadio('orofacial',     d.orofacial);
    sv('orofacial-notes', d.orofacial_notes);
    sv('other-findings',  d.other_findings);

    setChips('sit-balance-chips',   d.sit_balance);
    setChips('stand-balance-chips', d.stand_balance);
    sv('balance-notes', d.balance_notes);

    var mrmiIds = {
      'mrmi-turn': d.mrmi_turn, 'mrmi-lying-sit': d.mrmi_lying_sit,
      'mrmi-sit-balance': d.mrmi_sit_balance, 'mrmi-sit-stand': d.mrmi_sit_stand,
      'mrmi-standing': d.mrmi_standing, 'mrmi-transfer': d.mrmi_transfer,
      'mrmi-walk': d.mrmi_walk, 'mrmi-stairs': d.mrmi_stairs
    };
    Object.keys(mrmiIds).forEach(function(id) {
      var el = document.getElementById(id);
      if (el && mrmiIds[id] !== undefined) el.value = mrmiIds[id];
    });
    calcMrmiTotal();

    setChips('gait-pattern-chips', d.gait_pattern);
    setChips('walking-aid-chips',  d.walking_aid);
    sv('mwt10-time', d.mwt10_time);
    calc10MWT();
    setChips('turning-chips', d.turning);
    sv('gait-notes', d.gait_notes);

    sv('sixmwt-dist',      d.sixmwt_dist);
    sv('sixmwt-pre-hr',    d.sixmwt_pre_hr);
    sv('sixmwt-post-hr',   d.sixmwt_post_hr);
    sv('sixmwt-pre-spo2',  d.sixmwt_pre_spo2);
    sv('sixmwt-post-spo2', d.sixmwt_post_spo2);
    var borg = document.getElementById('borg-rpe');
    if (borg) { borg.value = d.borg_rpe || 0; onBorgChange(borg.value); }

    sv('tug-time',    d.tug_time);
    sv('berg-score',  d.berg_score);
    sv('frt-score',   d.frt_score);
    flagTug(); flagBerg(); flagFrt();
    setChips('other-outcome-chips', d.other_outcomes);
    sv('outcome-notes', d.outcome_notes);

    sv('pt-impression-bsf', d.pt_impression);
    sv('pt-impression-al',  d.pt_impression_al);
    sv('pt-impression-pr',  d.pt_impression_pr);
    sv('stg', d.stg);
    sv('ltg', d.ltg);
    setChips('plan-chips', d.plan);
    sv('plan-notes', d.plan_notes);
  }

  // ── RESET ─────────────────────────────────────────────
  function reset(keepPatient) {
    var savedPt = keepPatient ? FormBase.collectPatient() : null;
    FormBase.resetPatient();
    var ids = [
      'diagnosis','complaint-text','patient-goal','onset-value','pmhx-details','past-pt-outcome',
      'emotional-status','occupation','hobbies','chart-notes',
      'bp-sys','bp-dia','heart-rate','resp-rate','spo2',
      'tone-rul','tone-lul','tone-rll','tone-lll','tone-notes',
      'sensation-notes','orofacial-notes','other-findings','balance-notes',
      'gait-notes','mwt10-time','sixmwt-dist','sixmwt-pre-hr','sixmwt-post-hr',
      'sixmwt-pre-spo2','sixmwt-post-spo2','tug-time','berg-score','frt-score',
      'outcome-notes','pt-impression-bsf','pt-impression-al','pt-impression-pr',
      'stg','ltg','plan-notes'
    ];
    ids.forEach(function(id) { sv(id, ''); });

    var selects = ['onset-unit','tone-rul','tone-lul','tone-rll','tone-lll',
                   'mrmi-turn','mrmi-lying-sit','mrmi-sit-balance','mrmi-sit-stand',
                   'mrmi-standing','mrmi-transfer','mrmi-walk','mrmi-stairs'];
    selects.forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.value = '';
    });

    var radios = ['dr-mgmt','prev-episode','prev-mobility','past-pt','gen-health',
                  'bladder','bowel','sensation-gen','hand-dom','premorbid-indep',
                  'current-indep','house-type','toilet-type','has-stairs','door-width',
                  'breathing-pattern','breathing-type','ftn','hts','ram','tremor',
                  'tremor-type','lt','pp','thermal','prop-ul','prop-ll',
                  'communication','orofacial'];
    radios.forEach(function(name) {
      document.querySelectorAll('input[name="' + name + '"]').forEach(function(r) {
        r.checked = false;
      });
    });

    var chipGroups = ['complaint-chips','limb-chips','prev-aid-chips','pmhx-chips',
                      'vision-chips','hearing-chips','appearance-chips','consciousness-chips',
                      'posture-obs-chips','mobility-obs-chips','emotional-obs-chips',
                      'resp-obs-chips','devices-chips','cognitive-chips','sit-balance-chips',
                      'stand-balance-chips','gait-pattern-chips','walking-aid-chips',
                      'turning-chips','other-outcome-chips','plan-chips'];
    chipGroups.forEach(function(g) {
      document.querySelectorAll('#' + g + ' .chip').forEach(function(c) {
        c.classList.remove('active');
      });
    });

    MmtTable.clear();
    InvMedTable.clear();
    var romTb = document.getElementById('rom-tbody');
    if (romTb) romTb.innerHTML = '';

    BodyChart.clearAll();

    var ps = document.getElementById('pain-score');
    if (ps) { ps.value = 0; onPainChange(0); }
    var borg = document.getElementById('borg-rpe');
    if (borg) { borg.value = 0; onBorgChange(0); }

    calcMrmiTotal();
    calc10MWT();

    var f = document.getElementById('walking-aid-field');
    if (f) f.style.display = 'none';
    var tf = document.getElementById('tremor-type-field');
    if (tf) tf.style.display = 'none';

    ['tug-flag','berg-flag','frt-flag','mwt10-speed'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.textContent = '';
    });
    if (savedPt) FormBase.populatePatient(savedPt);
  }

  // ── PUBLIC API ────────────────────────────────────────
  return {
    toggleChip:          toggleChip,
    onPainChange:        onPainChange,
    onBorgChange:        onBorgChange,
    onPrevMobilityChange: onPrevMobilityChange,
    onTremorChange:      onTremorChange,
    calcMrmiTotal:       calcMrmiTotal,
    calc10MWT:           calc10MWT,
    flagTug:             flagTug,
    flagBerg:            flagBerg,
    flagFrt:             flagFrt,
    addRomRow:           addRomRow,
    collect:             collect,
    populate:            populate,
    reset:               reset,
  };

})();

window.ActiveForm = {
  collect:  NeuroForm.collect,
  populate: NeuroForm.populate,
  reset:    NeuroForm.reset,
};

window.Form = {
  collect:          NeuroForm.collect,
  populate:         NeuroForm.populate,
  reset:            NeuroForm.reset,
  onPtTypeChange:   FormBase.onPtTypeChange,
  onNricInput:      FormBase.onNricInput,
  onDobChange:      FormBase.onDobChange,
};
