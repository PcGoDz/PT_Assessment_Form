// form_geriatric.js — Geriatric assessment form logic

var GeriatricForm = (function () {

  function gv(id)        { return FormBase.gv(id); }
  function sv(id, val)   { return FormBase.sv(id, val); }
  function radio(name)   { return FormBase.radio(name); }
  function setRadio(n,v) { return FormBase.setRadio(n, v); }
  function cb(id)        { var el = document.getElementById(id); return el ? el.checked : false; }
  function setCb(id, v)  { var el = document.getElementById(id); if (el) el.checked = !!v; }

  // ── Doctor's management toggle ────────────────
  function onMgmtChange(val) {
    var block = document.getElementById('dx-surgical-block');
    if (block) block.style.display = val === 'Surgical' ? '' : 'none';
  }

  function onSurgeryNoInfo(checked) {
    var dateEl    = document.getElementById('dx-surgery-date');
    var detailEl  = document.getElementById('dx-surgery-details');
    if (dateEl)   { dateEl.disabled   = checked; if (checked) dateEl.value = ''; }
    if (detailEl) { detailEl.disabled = checked; if (checked) detailEl.value = ''; }
  }

  // ── Fall history toggle ───────────────────────
  function onFallHx(val) {
    var block = document.getElementById('fall-detail-block');
    if (block) block.style.display = val === 'Yes' ? '' : 'none';
  }

  // ── Pain present toggle ───────────────────────
  function onPainPresent(val) {
    var block = document.getElementById('pain-detail-block');
    if (!block) return;
    block.style.opacity  = val === 'Yes' ? '1' : '0.35';
    block.style.pointerEvents = val === 'Yes' ? '' : 'none';
  }

  // ── VAS slider ────────────────────────────────
  function setPain(v) {
    var n  = parseInt(v);
    var el = document.getElementById('pv-pain');
    if (!el) return;
    el.textContent = n;
    el.className   = 'pain-val ' + (n <= 3 ? 'pv-low' : n <= 6 ? 'pv-mid' : 'pv-high');
  }

  // ── Berg live badge ───────────────────────────
  function onBergInput(val) {
    var badge = document.getElementById('om-berg-badge');
    if (!badge) return;
    var n = parseFloat(val);
    if (val === '' || isNaN(n)) { badge.textContent = ''; badge.style.color = ''; return; }
    if (n >= 41)      { badge.textContent = 'Low risk';      badge.style.color = 'var(--success, #22c55e)'; }
    else if (n >= 21) { badge.textContent = 'Moderate risk'; badge.style.color = 'var(--warn, #f59e0b)'; }
    else              { badge.textContent = 'High risk';      badge.style.color = 'var(--danger, #ef4444)'; }
  }

  // ── TUG live badge ────────────────────────────
  function onTugInput(val) {
    var badge = document.getElementById('om-tug-badge');
    if (!badge) return;
    var n = parseFloat(val);
    if (val === '' || isNaN(n)) { badge.textContent = ''; badge.style.color = ''; return; }
    if (n <= 13.5) { badge.textContent = 'Low risk';  badge.style.color = 'var(--success, #22c55e)'; }
    else           { badge.textContent = 'High risk'; badge.style.color = 'var(--danger, #ef4444)'; }
  }

  // ── N/A toggle for outcome measures ──────────
  var NA_INPUTS = {
    berg:  ['om-berg'],
    tug:   ['om-tug'],
    sls:   ['om-sls'],
    grip:  ['om-grip-r', 'om-grip-l'],
    ftsst: ['om-ftsst'],
    ems:   ['om-ems'],
    poma:  ['om-poma'],
    walk:  ['om-walk'],
    gait:  ['om-gait-sec', 'om-gait-steps'],
    reach: ['om-reach-r', 'om-reach-l']
  };

  function toggleNa(key, checked) {
    var ids = NA_INPUTS[key] || [];
    ids.forEach(function(id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.disabled = checked;
      if (checked) { el.value = ''; }
      el.style.background = checked ? 'var(--surface2)' : '';
      el.style.color      = checked ? 'var(--muted)'    : '';
      el.placeholder      = checked ? 'N/A'             : el.dataset.origPlaceholder || '';
    });
    // also clear badges
    if (key === 'berg') { var b = document.getElementById('om-berg-badge'); if (b) { b.textContent = ''; } }
    if (key === 'tug')  { var b = document.getElementById('om-tug-badge');  if (b) { b.textContent = ''; } }
  }

  function initNaPlaceholders() {
    Object.keys(NA_INPUTS).forEach(function(key) {
      NA_INPUTS[key].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.dataset.origPlaceholder = el.placeholder;
      });
    });
  }


  // ── Fall consequence: No Injury greys out others ─
  function onFallNone(checked) {
    var others = ['fall-fracture','fall-hospitalised','fall-fear','fall-injury'];
    others.forEach(function(id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.disabled = checked;
      if (checked) el.checked = false;
      el.parentElement.style.opacity = checked ? '0.4' : '';
    });
  }

  // ── Incontinence: both No → grey out type checkboxes ─
  function onIncon() {
    var bladderNo = FormBase.radio('incon-bladder') === 'No';
    var bowelNo   = FormBase.radio('incon-bowel')   === 'No';
    var noBoth    = bladderNo && bowelNo;
    // also show/hide if both answered
    var bladderAns = FormBase.radio('incon-bladder');
    var bowelAns   = FormBase.radio('incon-bowel');
    var anyYes = bladderAns === 'Yes' || bowelAns === 'Yes';
    var typeIds = ['incon-stress','incon-urge','incon-mixed'];
    typeIds.forEach(function(id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.disabled = !anyYes;
      if (!anyYes) el.checked = false;
      el.parentElement.style.opacity = anyYes ? '' : '0.4';
    });
  }

  // ── Sensory deficit: No Deficit greys out specifics ─
  function onDeficitNone(checked) {
    var others = ['deficit-visual','deficit-hearing'];
    others.forEach(function(id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.disabled = checked;
      if (checked) el.checked = false;
      el.parentElement.style.opacity = checked ? '0.4' : '';
    });
  }

  // ── Sensory deficit: specific → uncheck No Deficit ─
  function onDeficitOther(checked) {
    if (checked) {
      var noneEl = document.getElementById('deficit-none');
      if (noneEl) noneEl.checked = false;
    }
  }

  // ── Diaper: No → grey out day/night ──────────────
  function onDiaper(val) {
    var isNo = val === 'No';
    var ids  = ['diaper-day','diaper-night'];
    ids.forEach(function(id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.disabled = isNo;
      if (isNo) el.checked = false;
      el.parentElement.style.opacity = isNo ? '0.4' : '';
    });
  }

  // ── Collect ───────────────────────────────────
  function collect(currentId) {
    var d = { _form_type: 'geriatric' };
    if (currentId) d.id = currentId;

    d.patient = FormBase.collectPatient();
    d.patient.rn = gv('pt-rn');

    d.dx_diagnosis      = gv('dx-diagnosis');
    d.dx_mgmt_type      = radio('dx-mgmt-type');
    d.dx_surgery_date   = gv('dx-surgery-date');
    d.dx_surgery_details= gv('dx-surgery-details');
    d.dx_surgery_no_info= cb('dx-surgery-no-info');

    d.complaint          = gv('hx-complaint');
    d.hx_current         = gv('hx-current');
    d.hx_past            = gv('hx-past');
    d.fall_hx            = radio('fall-hx');
    d.fall_fracture      = cb('fall-fracture');
    d.fall_hospitalised  = cb('fall-hospitalised');
    d.fall_fear          = cb('fall-fear');
    d.fall_injury        = cb('fall-injury');
    d.fall_none          = cb('fall-none');
    d.fall_consequence_other = gv('fall-consequence-other');
    d.aid_none       = cb('aid-none');
    d.aid_frame      = cb('aid-frame');
    d.aid_quadripod  = cb('aid-quadripod');
    d.aid_stick      = cb('aid-stick');
    d.aid_wheelchair = cb('aid-wheelchair');
    d.aid_others     = gv('aid-others');
    d.incon_bladder  = radio('incon-bladder');
    d.incon_bowel    = radio('incon-bowel');
    d.incon_stress   = cb('incon-stress');
    d.incon_urge     = cb('incon-urge');
    d.incon_mixed    = cb('incon-mixed');
    d.diaper         = radio('diaper');
    d.diaper_day     = cb('diaper-day');
    d.diaper_night   = cb('diaper-night');
    d.dominant_hand  = radio('dominant-hand');
    d.cognitive      = radio('cognitive');
    d.cognitive_test = gv('cognitive-test');
    d.communication  = radio('communication');
    d.deficit_none    = cb('deficit-none');
    d.deficit_visual  = cb('deficit-visual');
    d.deficit_hearing = cb('deficit-hearing');
    d.device_pacemaker   = cb('device-pacemaker');
    d.device_hearing_aid = cb('device-hearing-aid');
    d.device_spectacles  = cb('device-spectacles');
    d.device_dentures    = cb('device-dentures');

    d.med_hpt      = cb('med-hpt');
    d.med_dm       = cb('med-dm');
    d.med_ccf      = cb('med-ccf');
    d.med_ihd      = cb('med-ihd');
    d.med_pvd      = cb('med-pvd');
    d.med_copd     = cb('med-copd');
    d.med_dementia = cb('med-dementia');
    d.med_pd       = cb('med-pd');
    d.med_cva_rt   = cb('med-cva-rt');
    d.med_cva_lt   = cb('med-cva-lt');
    d.med_oa       = cb('med-oa');
    d.med_fracture = cb('med-fracture');
    d.social_hx          = gv('subj-social');
    d.prev_surgery       = radio('prev-surgery');
    d.surgery_area       = gv('surgery-area');
    d.investigations     = gv('subj-investigations');
    d.medication         = gv('subj-medication');
    d.main_carer         = radio('main-carer');
    d.carer_other        = gv('carer-other');
    d.premorbid_mobility = radio('premorbid-mobility');
    d.current_mobility   = radio('current-mobility');
    d.home_lift    = cb('home-lift');
    d.home_stairs  = cb('home-stairs');
    d.home_kerbs   = cb('home-kerbs');
    d.home_ground  = cb('home-ground');
    d.toilet_sitting   = cb('toilet-sitting');
    d.toilet_squatting = cb('toilet-squatting');
    d.toilet_commode   = cb('toilet-commode');

    d.body_chart  = (typeof BodyChart !== 'undefined') ? BodyChart.getData() : null;
    d.chart_notes = gv('chart-notes');

    d.pain_present = radio('pain-present');
    d.pain_score   = gv('pain-score');
    d.pain_site    = gv('pain-site');
    d.pain_nature  = radio('pain-nature');
    d.pain_type    = radio('pain-type');
    d.pain_history = radio('pain-history');

    d.obj_posture      = gv('obj-posture');
    d.mob_bed          = radio('mob-bed');
    d.mob_sitting      = radio('mob-sitting');
    d.mob_standing     = radio('mob-standing');
    d.mob_transfer     = radio('mob-transfer');
    d.obj_lungs        = gv('obj-lungs');
    d.obj_strength     = gv('obj-strength');
    d.rom_contracture  = radio('rom-contracture');
    d.rom_notes        = gv('rom-notes');
    d.reflex_sensation = radio('reflex-sensation');
    d.reflex_notes     = gv('reflex-notes');

    d.om_na_berg  = cb('om-na-berg');
    d.om_berg     = cb('om-na-berg') ? 'N/A' : gv('om-berg');
    d.om_na_tug   = cb('om-na-tug');
    d.om_tug      = cb('om-na-tug')  ? 'N/A' : gv('om-tug');
    d.om_na_sls   = cb('om-na-sls');
    d.om_sls      = cb('om-na-sls')  ? 'N/A' : gv('om-sls');
    d.om_na_grip  = cb('om-na-grip');
    d.om_grip_r   = cb('om-na-grip') ? 'N/A' : gv('om-grip-r');
    d.om_grip_l   = cb('om-na-grip') ? 'N/A' : gv('om-grip-l');
    d.om_na_ftsst = cb('om-na-ftsst');
    d.om_ftsst    = cb('om-na-ftsst')? 'N/A' : gv('om-ftsst');
    d.om_na_ems   = cb('om-na-ems');
    d.om_ems      = cb('om-na-ems')  ? 'N/A' : gv('om-ems');
    d.om_na_poma  = cb('om-na-poma');
    d.om_poma     = cb('om-na-poma') ? 'N/A' : gv('om-poma');
    d.om_na_walk  = cb('om-na-walk');
    d.om_walk     = cb('om-na-walk') ? 'N/A' : gv('om-walk');
    d.om_na_gait  = cb('om-na-gait');
    d.om_gait_sec  = cb('om-na-gait')? 'N/A' : gv('om-gait-sec');
    d.om_gait_steps= cb('om-na-gait')? 'N/A' : gv('om-gait-steps');
    d.om_na_reach  = cb('om-na-reach');
    d.om_reach_r   = cb('om-na-reach')? 'N/A' : gv('om-reach-r');
    d.om_reach_l   = cb('om-na-reach')? 'N/A' : gv('om-reach-l');
    d.om_notes     = gv('om-notes');

    d.plan_impression = gv('plan-impression');
    d.plan_stg        = gv('plan-stg');
    d.plan_ltg        = gv('plan-ltg');
    d.plan_tx         = gv('plan-tx');
    d.consent_agree   = radio('consent-agree');
    d.consent_edu     = radio('consent-edu');

    return d;
  }

  // ── Populate ──────────────────────────────────
  function populate(data) {
    if (!data) return;

    if (data.patient) {
      FormBase.populatePatient(data.patient);
      sv('pt-rn', data.patient.rn || '');
    }

    sv('dx-diagnosis',       data.dx_diagnosis);
    setRadio('dx-mgmt-type', data.dx_mgmt_type);
    if (data.dx_mgmt_type) onMgmtChange(data.dx_mgmt_type);
    sv('dx-surgery-date',    data.dx_surgery_date);
    sv('dx-surgery-details', data.dx_surgery_details);
    setCb('dx-surgery-no-info', data.dx_surgery_no_info);
    if (data.dx_surgery_no_info) onSurgeryNoInfo(true);

    sv('hx-complaint',    data.complaint);
    sv('hx-current',      data.hx_current);
    sv('hx-past',         data.hx_past);
    setRadio('fall-hx',   data.fall_hx);
    if (data.fall_hx) onFallHx(data.fall_hx);
    setCb('fall-fracture',    data.fall_fracture);
    setCb('fall-hospitalised',data.fall_hospitalised);
    setCb('fall-fear',        data.fall_fear);
    setCb('fall-injury',      data.fall_injury);
    setCb('fall-none',        data.fall_none);
    if (data.fall_none) onFallNone(true);
    sv('fall-consequence-other', data.fall_consequence_other);
    setCb('aid-none',      data.aid_none);
    setCb('aid-frame',     data.aid_frame);
    setCb('aid-quadripod', data.aid_quadripod);
    setCb('aid-stick',     data.aid_stick);
    setCb('aid-wheelchair',data.aid_wheelchair);
    sv('aid-others',       data.aid_others);
    setRadio('incon-bladder', data.incon_bladder);
    setRadio('incon-bowel',   data.incon_bowel);
    setCb('incon-stress', data.incon_stress);
    setCb('incon-urge',   data.incon_urge);
    setCb('incon-mixed',  data.incon_mixed);
    onIncon();
    setRadio('diaper',    data.diaper);
    setCb('diaper-day',   data.diaper_day);
    setCb('diaper-night', data.diaper_night);
    if (data.diaper) onDiaper(data.diaper);
    setRadio('dominant-hand', data.dominant_hand);
    setRadio('cognitive',     data.cognitive);
    sv('cognitive-test',      data.cognitive_test);
    setRadio('communication', data.communication);
    setCb('deficit-none',     data.deficit_none);
    setCb('deficit-visual',   data.deficit_visual);
    setCb('deficit-hearing',  data.deficit_hearing);
    if (data.deficit_none) onDeficitNone(true);
    setCb('device-pacemaker',   data.device_pacemaker);
    setCb('device-hearing-aid', data.device_hearing_aid);
    setCb('device-spectacles',  data.device_spectacles);
    setCb('device-dentures',    data.device_dentures);

    setCb('med-hpt',     data.med_hpt);
    setCb('med-dm',      data.med_dm);
    setCb('med-ccf',     data.med_ccf);
    setCb('med-ihd',     data.med_ihd);
    setCb('med-pvd',     data.med_pvd);
    setCb('med-copd',    data.med_copd);
    setCb('med-dementia',data.med_dementia);
    setCb('med-pd',      data.med_pd);
    setCb('med-cva-rt',  data.med_cva_rt);
    setCb('med-cva-lt',  data.med_cva_lt);
    setCb('med-oa',      data.med_oa);
    setCb('med-fracture',data.med_fracture);
    sv('subj-social',        data.social_hx);
    setRadio('prev-surgery', data.prev_surgery);
    sv('surgery-area',       data.surgery_area);
    sv('subj-investigations',data.investigations);
    sv('subj-medication',    data.medication);
    setRadio('main-carer',   data.main_carer);
    sv('carer-other',        data.carer_other);
    setRadio('premorbid-mobility', data.premorbid_mobility);
    setRadio('current-mobility',   data.current_mobility);
    setCb('home-lift',    data.home_lift);
    setCb('home-stairs',  data.home_stairs);
    setCb('home-kerbs',   data.home_kerbs);
    setCb('home-ground',  data.home_ground);
    setCb('toilet-sitting',   data.toilet_sitting);
    setCb('toilet-squatting', data.toilet_squatting);
    setCb('toilet-commode',   data.toilet_commode);

    if (data.body_chart && typeof BodyChart !== 'undefined') BodyChart.setData(data.body_chart);
    sv('chart-notes', data.chart_notes);

    setRadio('pain-present', data.pain_present);
    if (data.pain_present) onPainPresent(data.pain_present);
    var scoreVal = (data.pain_score && data.pain_score !== 'N/A') ? data.pain_score : '0';
    var scoreEl = document.getElementById('pain-score');
    if (scoreEl) { scoreEl.value = scoreVal; setPain(scoreVal); }
    sv('pain-site',          data.pain_site);
    setRadio('pain-nature',  data.pain_nature);
    setRadio('pain-type',    data.pain_type);
    setRadio('pain-history', data.pain_history);

    sv('obj-posture',       data.obj_posture);
    setRadio('mob-bed',     data.mob_bed);
    setRadio('mob-sitting', data.mob_sitting);
    setRadio('mob-standing',data.mob_standing);
    setRadio('mob-transfer',data.mob_transfer);
    sv('obj-lungs',         data.obj_lungs);
    sv('obj-strength',      data.obj_strength);
    setRadio('rom-contracture',  data.rom_contracture);
    sv('rom-notes',              data.rom_notes);
    setRadio('reflex-sensation', data.reflex_sensation);
    sv('reflex-notes',           data.reflex_notes);

    // Outcome measures — handle N/A
    function restoreOm(key, naVal, ids, vals) {
      var naEl = document.getElementById('om-na-' + key);
      if (naEl) { naEl.checked = !!naVal; toggleNa(key, !!naVal); }
      if (!naVal) {
        ids.forEach(function(id, i) {
          var el = document.getElementById(id);
          if (el) el.value = vals[i] || '';
        });
      }
    }
    restoreOm('berg',  data.om_na_berg,  ['om-berg'],       [data.om_berg]);
    onBergInput(data.om_na_berg ? '' : (data.om_berg || ''));
    restoreOm('tug',   data.om_na_tug,   ['om-tug'],        [data.om_tug]);
    onTugInput(data.om_na_tug  ? '' : (data.om_tug  || ''));
    restoreOm('sls',   data.om_na_sls,   ['om-sls'],        [data.om_sls]);
    restoreOm('grip',  data.om_na_grip,  ['om-grip-r','om-grip-l'], [data.om_grip_r, data.om_grip_l]);
    restoreOm('ftsst', data.om_na_ftsst, ['om-ftsst'],      [data.om_ftsst]);
    restoreOm('ems',   data.om_na_ems,   ['om-ems'],        [data.om_ems]);
    restoreOm('poma',  data.om_na_poma,  ['om-poma'],       [data.om_poma]);
    restoreOm('walk',  data.om_na_walk,  ['om-walk'],       [data.om_walk]);
    restoreOm('gait',  data.om_na_gait,  ['om-gait-sec','om-gait-steps'], [data.om_gait_sec, data.om_gait_steps]);
    restoreOm('reach', data.om_na_reach, ['om-reach-r','om-reach-l'], [data.om_reach_r, data.om_reach_l]);
    sv('om-notes', data.om_notes);

    sv('plan-impression',    data.plan_impression);
    sv('plan-stg',           data.plan_stg);
    sv('plan-ltg',           data.plan_ltg);
    sv('plan-tx',            data.plan_tx);
    setRadio('consent-agree',data.consent_agree);
    setRadio('consent-edu',  data.consent_edu);
  }

  // ── Reset ─────────────────────────────────────
  function reset() {
    document.querySelectorAll('input[type=text],input[type=date],input[type=number],textarea').forEach(function(el) {
      if (!el.readOnly) el.value = '';
    });
    document.querySelectorAll('input[type=radio],input[type=checkbox]').forEach(function(el) { el.checked = false; });
    var scoreEl = document.getElementById('pain-score');
    if (scoreEl) { scoreEl.value = 0; setPain(0); }
    var bergBadge = document.getElementById('om-berg-badge');
    var tugBadge  = document.getElementById('om-tug-badge');
    if (bergBadge) { bergBadge.textContent = ''; bergBadge.style.color = ''; }
    if (tugBadge)  { tugBadge.textContent  = ''; tugBadge.style.color  = ''; }
    if (typeof BodyChart !== 'undefined') BodyChart.clearAll();
    document.getElementById('dx-surgical-block').style.display = 'none';
    document.getElementById('fall-detail-block').style.display = 'none';
    onPainPresent('Yes');
    Object.keys(NA_INPUTS).forEach(function(k) { toggleNa(k, false); });
  }

  var progressFields = ['pt-name','pt-date','dx-diagnosis','hx-complaint','hx-current','obj-posture','plan-impression','plan-stg','plan-tx'];

  var api = {
    collect:        collect,
    populate:       populate,
    reset:          reset,
    onFallNone:     onFallNone,
    onIncon:        onIncon,
    onDeficitNone:  onDeficitNone,
    onDeficitOther: onDeficitOther,
    onDiaper:       onDiaper,
    onMgmtChange:   onMgmtChange,
    onSurgeryNoInfo:onSurgeryNoInfo,
    onFallHx:       onFallHx,
    onPainPresent:  onPainPresent,
    setPain:        setPain,
    onBergInput:    onBergInput,
    onTugInput:     onTugInput,
    toggleNa:       toggleNa
  };

  window.ActiveForm    = api;
  window.GeriatricForm = api;
  window.Form = {
    collect:        api.collect,
    populate:       api.populate,
    reset:          api.reset,
    setPain:        api.setPain,
    onPtTypeChange: FormBase.onPtTypeChange,
    onNricInput:    FormBase.onNricInput,
    onDobChange:    FormBase.onDobChange
  };
  FormBase.setProgressFields(progressFields);

  // Init N/A placeholder cache after DOM ready
  document.addEventListener('DOMContentLoaded', function() {
    initNaPlaceholders();
  });

  return api;
})();
