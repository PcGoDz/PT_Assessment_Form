// main.js — app init, navigation, records sidebar, progress bar, toast
// Features: autosave to localStorage, dirty form warning, draft recovery

const Main = (function () {

  let currentId     = null;
  let isDirty       = false;
  let autoSaveTimer = null;
  const DRAFT_KEY   = 'pt_assessment_draft';

  // ── Navigation ────────────────────────────────
  function go(id) {
    var el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ── Progress bar ──────────────────────────────
  function updateProgress() {
    // Use fields registered by the active form, fallback to sensible defaults
    var fields = (typeof FormBase !== 'undefined' && FormBase.getProgressFields().length)
      ? FormBase.getProgressFields()
      : ['pt-name','pt-date','pt-diagnosis'];

    var checks = fields.map(function(f) {
      // Support pipe-separated OR fields e.g. 'pt-nric|pt-passport'
      if (f.indexOf('|') >= 0) {
        return f.split('|').some(function(id) {
          var el = document.getElementById(id);
          return el && el.value.trim();
        }) ? '1' : '';
      }
      var el = document.getElementById(f);
      return el ? el.value.trim() : '';
    });
    // Body chart markers always count
    if (typeof BodyChart !== 'undefined') {
      checks.push(BodyChart.getData().length > 0 ? '1' : '');
    }
    var filled = checks.filter(Boolean).length;
    var pct    = Math.round(filled / checks.length * 100);
    document.getElementById('prog-fill').style.width = pct + '%';
    document.getElementById('prog-pct').textContent  = pct + '%';
  }

  // ── Dirty tracking ────────────────────────────
  function markDirty() {
    isDirty = true;
    scheduleAutosave();
  }

  function markClean() {
    isDirty = false;
    clearDraft();
  }

  // ── Autosave to localStorage ──────────────────
  function scheduleAutosave() {
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(saveDraft, 3000);
  }

  function saveDraft() {
    try {
      var data = window.ActiveForm.collect(currentId);
      var name = data.patient && data.patient.name;
      var date = data.patient && data.patient.date;
      if (!name && !date) return;
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        savedAt: new Date().toISOString(),
        data: data
      }));
      showDraftIndicator(true);
    } catch (e) {
      console.warn('Draft save failed:', e);
    }
  }

  function clearDraft() {
    try {
      localStorage.removeItem(DRAFT_KEY);
      showDraftIndicator(false);
    } catch (e) {}
  }

  function showDraftIndicator(show) {
    var el = document.getElementById('draft-indicator');
    if (el) el.style.display = show ? '' : 'none';
  }

  // ── Draft recovery on load ────────────────────
  function checkForDraft() {
    try {
      var raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      var draft = JSON.parse(raw);
      if (!draft || !draft.data) return;
      var name    = (draft.data.patient && draft.data.patient.name) || '(unnamed)';
      var savedAt = draft.savedAt ? new Date(draft.savedAt).toLocaleString() : 'unknown time';
      var msg     = document.getElementById('draft-banner-msg');
      var banner  = document.getElementById('draft-banner');
      if (msg)    msg.textContent = 'Unsaved draft found: ' + name + ' — ' + savedAt;
      if (banner) banner.style.display = '';
    } catch (e) {
      console.warn('Draft check failed:', e);
    }
  }

  function restoreDraft() {
    try {
      var raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      var draft = JSON.parse(raw);
      window.ActiveForm.reset();
      currentId = draft.data.id || null;
      Form.populate(draft.data);
      updateProgress();
      hideDraftBanner();
      showToast('Draft restored', 'ok');
    } catch (e) {
      showToast('Could not restore draft', 'err');
    }
  }

  function dismissDraft() {
    clearDraft();
    hideDraftBanner();
  }

  function hideDraftBanner() {
    var banner = document.getElementById('draft-banner');
    if (banner) banner.style.display = 'none';
  }

  // ── Records sidebar ───────────────────────────
  async function loadRecordsList() {
    try {
      var records = await API.listRecords();
      var list    = document.getElementById('records-list');
      if (!records.length) {
        list.innerHTML = '<div class="no-records">No records yet</div>';
        return;
      }
      list.innerHTML = records.map(function (r) {
        return '<div class="record-item" onclick="Main.loadRecord(' + r.id + ')">'
          + '<div class="record-name">' + (r.patient_name || '(no name)') + '</div>'
          + '<div class="record-meta">' + (r.patient_date || '') + ' &bull; ' + r.form_type + '</div>'
          + '<div style="display:flex;gap:6px;margin-top:3px;">'
          + '<button class="record-del" onclick="API.exportPdf(' + r.id + ');event.stopPropagation()">&#x21E9; PDF</button>'
          + '<button class="record-del" onclick="Main.deleteRecord(' + r.id + ',event)">&#x2715; delete</button>'
          + '</div>'
          + '</div>';
      }).join('');
    } catch (e) {
      console.error('loadRecordsList:', e);
    }
  }

  // ── Save ──────────────────────────────────────
  async function saveRecord() {
    try {
      var data = window.ActiveForm.collect(currentId);
      var j    = await API.saveRecord(data);
      currentId = j.id;
      markClean();
      showToast('Record saved', 'ok');
      loadRecordsList();
      updateProgress();
    } catch (e) {
      showToast(e.message || 'Save failed', 'err');
    }
  }

  // ── Load ──────────────────────────────────────
  async function loadRecord(id) {
    if (isDirty) {
      if (!confirm('You have unsaved changes. Load this record anyway?')) return;
    }
    try {
      var data = await API.loadRecord(id);
      window.ActiveForm.reset();
      currentId = data.id || id;
      window.ActiveForm.populate(data);
      markClean();
      updateProgress();
      showToast('Record loaded', 'ok');
    } catch (e) {
      showToast('Load failed', 'err');
    }
  }

  // ── Delete ────────────────────────────────────
  async function deleteRecord(id, e) {
    e.stopPropagation();
    if (!confirm('Delete this record? Cannot be undone.')) return;
    try {
      await API.deleteRecord(id);
      if (currentId === id) newForm();
      loadRecordsList();
      showToast('Deleted', 'ok');
    } catch (e) {
      showToast('Delete failed', 'err');
    }
  }

  // ── New — auto-save then reset ────────────────
  async function newForm() {
    var name = document.getElementById('pt-name').value.trim();
    var date = document.getElementById('pt-date').value.trim();
    if (name || date) {
      try {
        var data = window.ActiveForm.collect(currentId);
        var j    = await API.saveRecord(data);
        currentId = j.id;
        showToast('Saved — ready for next patient', 'ok');
        loadRecordsList();
      } catch (e) {
        if (!confirm('Auto-save failed: ' + e.message + '\n\nClear anyway?')) return;
      }
    }
    window.ActiveForm.reset();
    currentId = null;
    markClean();
    updateProgress();
  }

  // ── Clear — wipe only, confirm first ──────────
  function clearForm(silent) {
    if (!silent && !confirm('Clear all fields without saving?')) return;
    window.ActiveForm.reset();
    currentId = null;
    markClean();
    updateProgress();
  }

  // ── Toast ─────────────────────────────────────
  function showToast(msg, type) {
    var t = document.getElementById('toast');
    t.textContent = msg;
    t.className   = 'toast show' + (type ? ' ' + type : '');
    setTimeout(function () { t.className = 'toast'; }, 2400);
  }

  // ── Dirty warning on close/navigate ──────────
  function setupDirtyWarning() {
    window.addEventListener('beforeunload', function (e) {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    });
  }

  // ── Init ──────────────────────────────────────
  // ── Form context init — replaces boilerplate in every form ──────
  // Reads episode_id, patient_id, and patient data from base.html meta tags.
  // Handles: patient prefill, episode collect wrapper, auto-load, nav buttons.
  // New forms get all this for FREE — no boilerplate needed in form HTML.
  function initFormContext() {
    var ctx       = document.getElementById('page-context');
    if (!ctx) return;
    var episodeId = parseInt(ctx.dataset.episodeId) || null;
    var patientId = parseInt(ctx.dataset.patientId) || null;

    // ── 1. Patient prefill ───────────────────────────────────────
    var ptScript  = document.getElementById('patient-json');
    if (ptScript) {
      try {
        var p = JSON.parse(ptScript.textContent);
        FormBase.sv('pt-name',     p.name      || '');
        FormBase.sv('pt-nric',     p.ic         || '');
        FormBase.sv('pt-passport', p.passport   || '');
        FormBase.sv('pt-dob',      p.dob        || '');
        if (p.dob) FormBase.onDobChange(p.dob);
        FormBase.sv('pt-age',      p.age        || '');
        FormBase.sv('pt-country',  p.country    || '');
        FormBase.setRadio('pt-type', p.pt_type  || 'local');
        FormBase.setRadio('pt-sex',  p.sex      || '');
        FormBase.onPtTypeChange();
        if (p.ic && p.ic.length === 12) FormBase.onNricInput(p.ic);
        updateProgress();
      } catch(e) { console.warn('Patient prefill error:', e); }
    }

    // ── 2. Episode collect wrapper + auto-load ───────────────────
    if (episodeId && window.ActiveForm) {
      var origCollect = window.ActiveForm.collect;
      window.ActiveForm.collect = function(id) {
        var d = origCollect(id);
        d.episode_id = episodeId;
        return d;
      };

      fetch('/api/episodes/' + episodeId + '/record')
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (data && data.id) {
            window.ActiveForm.populate(data);
            setCurrentId(data.id);
            updateProgress();
            setTimeout(function() { markClean(); }, 100);
          }
        })
        .catch(function(e) { console.warn('Auto-load record failed:', e); });
    }

    // ── 3. Return / Save & Return nav buttons ────────────────────
    if (episodeId || patientId) {
      var navGroup = document.getElementById('topbar-nav-group');
      var navSep   = document.getElementById('topbar-nav-sep');
      if (navGroup && !navGroup.querySelector('.ctx-ret-btn')) {
        var retBtn = document.createElement('button');
        retBtn.className   = 'tbtn ctx-ret-btn';
        retBtn.textContent = '← Return';
        retBtn.title       = 'Return to patient';
        retBtn.onclick = function() {
          if (isDirty && !confirm('You have unsaved changes. Return anyway?')) return;
          window.location.href = '/';
        };

        var saveRetBtn = document.createElement('button');
        saveRetBtn.className   = 'tbtn primary ctx-ret-btn';
        saveRetBtn.textContent = 'Save & Return';
        saveRetBtn.onclick = async function() {
          await saveRecord();
          setTimeout(function() { window.location.href = '/'; }, 800);
        };

        navGroup.appendChild(retBtn);
        navGroup.appendChild(saveRetBtn);
        if (navSep) navSep.style.display = '';
      }
    }
  }

  function setCurrentId(id) { currentId = id; }

  function init() {
    if (typeof BodyChart !== 'undefined' && document.getElementById('svg-ant')) {
      BodyChart.init();
    }
    if (typeof MovementTable !== 'undefined' && document.getElementById('mov-tbody')) {
      MovementTable.init();
    }

    document.getElementById('pt-date').value = new Date().toISOString().split('T')[0];

    var localRadio = document.querySelector('[name=pt-type][value=local]');
    if (localRadio) localRadio.checked = true;
    var noRadio = document.querySelector('[name=pacemaker][value=No]');
    if (noRadio) noRadio.checked = true;

    if (typeof Form !== 'undefined' && typeof Form.onPtTypeChange === 'function') {
      Form.onPtTypeChange();
    } else if (typeof FormBase !== 'undefined') {
      FormBase.onPtTypeChange();
    }
    loadRecordsList();
    updateProgress();
    setupDirtyWarning();
    checkForDraft();
    initDark();

    // Must run after ActiveForm is registered by form-specific JS
    setTimeout(initFormContext, 0);

    document.querySelector('.main').addEventListener('input', function () {
      markDirty();
      updateProgress();
    });
  }


  // ── MPIS: Spine ────────────────────────────────
  async function copyToMpisSpine() {
    var data = window.ActiveForm.collect(currentId);
    var p    = data.patient || {};
    var pain = data.pain    || {};
    var sq   = data.specialQuestions || {};
    var hx   = data.history || {};
    var neuro= data.neurological || {};
    var obs  = data.observation  || {};
    var palp = data.palpation    || {};
    var plan = data.plan         || {};
    var mgmt = data.management   || {};
    var bc   = data.bodyChart    || {};
    var mov  = data.spineMovement || [];
    var acc  = data.accessory    || {};
    var nd   = data.neurodynamic || {};
    var LN   = String.fromCharCode(10);
    var DIV  = '==================================================';
    var dash = '--------------------------------------------------';
    var parts = [];

    parts.push('SPINE ASSESSMENT');
    parts.push(DIV);
    parts.push('Name  : ' + (p.name||'') + '   Date : ' + (p.date||''));
    if (p.type === 'local') {
      parts.push('IC    : ' + (p.nric||'') + '   Age  : ' + (p.age||''));
    } else {
      parts.push('Passport : ' + (p.passport||'') + '   Country : ' + (p.country||'') + '   Age : ' + (p.age||''));
    }
    parts.push('');

    function sec(title, val) {
      if (!val || !String(val).trim()) return;
      parts.push(dash); parts.push(title); parts.push(String(val).trim()); parts.push('');
    }

    sec('DIAGNOSIS', data.diagnosis);
    sec("DOCTOR'S MANAGEMENT", (mgmt.type||'') + (mgmt.surgeryDate ? ' (Surgery: ' + mgmt.surgeryDate + ')' : ''));
    sec('PROBLEM', data.problem);

    parts.push(dash); parts.push('PAIN SCORE');
    parts.push('PRE: ' + (pain.pre||'0') + '/10   POST: ' + (pain.post||'0') + '/10');
    if (pain.area)         parts.push('Area         : ' + pain.area);
    if (pain.nature)       parts.push('Nature       : ' + pain.nature);
    if (pain.agg)          parts.push('Aggravating  : ' + pain.agg);
    if (pain.ease)         parts.push('Easing       : ' + pain.ease);
    if (pain.behaviour24)  parts.push('24hrs        : ' + pain.behaviour24);
    if (pain.irritability) parts.push('Irritability : ' + pain.irritability);
    parts.push('');

    var markers = bc.markers || [];
    if (markers.length) {
      parts.push(dash); parts.push('BODY CHART');
      markers.forEach(function(m) {
        parts.push('#' + m.id + ' ' + m.zone + ' (' + m.type + ') - ' + (m.view==='ant'?'Anterior':'Posterior'));
      });
      if (bc.notes) parts.push('Notes: ' + bc.notes);
      parts.push('');
    }

    sec('CURRENT HISTORY', hx.current);
    sec('PAST HISTORY',    hx.past);

    parts.push(dash); parts.push('SPECIAL QUESTIONS');
    if (sq.health)        parts.push('General Health     : ' + sq.health);
    if (sq.pmhx)          parts.push('PMHx               : ' + sq.pmhx);
    if (sq.surgery)       parts.push('Surgical History   : ' + sq.surgery);
    if (sq.investigation) parts.push('Investigation      : ' + sq.investigation);
    if (sq.medication)    parts.push('Medication         : ' + sq.medication);
    if (sq.ce)            parts.push('C.E                : ' + sq.ce);
    if (sq.bedPillow)     parts.push('Bed / Pillow       : ' + sq.bedPillow);
    if (sq.occupation)    parts.push('Occupation         : ' + sq.occupation);
    if (sq.social)        parts.push('Social History     : ' + sq.social);
    parts.push('Hearing aid / Pacemaker: ' + (sq.pacemaker||'No'));
    parts.push('');

    parts.push(dash); parts.push('OBSERVATION');
    if (obs.general) parts.push('General : ' + obs.general);
    if (obs.local)   parts.push('Local   : ' + obs.local);
    parts.push('');

    parts.push(dash); parts.push('PALPATION');
    if (palp.tenderness)  parts.push('Tenderness  : ' + palp.tenderness);
    if (palp.temperature) parts.push('Temperature : ' + palp.temperature);
    if (palp.muscle)      parts.push('Muscle/ST   : ' + palp.muscle);
    if (palp.joint)       parts.push('Joint/Bony  : ' + palp.joint);
    parts.push('');

    if (mov && mov.length) {
      parts.push(dash); parts.push('SPINE MOVEMENT');
      mov.forEach(function(row) {
        if (!row.movement) return;
        parts.push(
          (row.movement||'') +
          '  Active: ' + (row.activeRom||'') +
          '  Passive: ' + (row.passiveRom||'') +
          '  Overpressure: ' + (row.overpress||'') +
          '  End Feel: ' + (row.endFeel||'')
        );
      });
      parts.push('');
    }

    if (acc.notes) sec('ACCESSORY (PAIVM)', acc.notes);

    var nd_tests = nd.tests || {};
    var nd_lines = [];
    ['pnf','slr','ultt1','ultt2a','ultt2b','ultt2c','slump','pkb'].forEach(function(id) {
      var t = nd_tests[id] || {};
      var labels = {pnf:'PNF',slr:'SLR',ultt1:'ULTT 1',ultt2a:'ULTT 2a',ultt2b:'ULTT 2b',ultt2c:'ULTT 2c',slump:'Slump',pkb:'PKB'};
      var vals = [t.leftNeck, t.rightNeck, t.leftBack, t.rightBack].filter(Boolean);
      if (vals.length) nd_lines.push(labels[id] + ': NL:' + (t.leftNeck||'-') + ' NR:' + (t.rightNeck||'-') + ' BL:' + (t.leftBack||'-') + ' BR:' + (t.rightBack||'-'));
    });
    if (nd_lines.length) {
      parts.push(dash); parts.push('NEURODYNAMIC TEST');
      nd_lines.forEach(function(l) { parts.push(l); });
      if (nd.notes) parts.push('Notes: ' + nd.notes);
      parts.push('');
    }

    var s = neuro.sensation||{}, r = neuro.reflex||{}, mo = neuro.motor||{};
    parts.push(dash); parts.push('NEUROLOGICAL TEST');
    parts.push('Sensation : L: ' + (s.left||'') + '  R: ' + (s.right||''));
    parts.push('Motor     : L: ' + (mo.left||'') + '  R: ' + (mo.right||''));
    parts.push('Reflexes  : L: ' + (r.left||'') + '  R: ' + (r.right||''));
    parts.push('');

    parts.push(dash); parts.push("PHYSIOTHERAPIST'S IMPRESSION & PLAN");
    if (plan.impression) parts.push('Impression : ' + plan.impression);
    if (plan.stg)        parts.push('STG        : ' + plan.stg);
    if (plan.ltg)        parts.push('LTG        : ' + plan.ltg);
    if (plan.treatment)  parts.push('Treatment  : ' + plan.treatment);
    parts.push(''); parts.push(DIV);
    parts.push('Generated by PT Assessment System');

    var text = parts.join(LN);
    try {
      await navigator.clipboard.writeText(text);
      showToast('Copied! Paste into MPIS', 'ok');
    } catch (e) {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
      showToast('Copied! Paste into MPIS', 'ok');
    }
  }

  // ── MPIS: Geriatric ────────────────────────────
  async function copyToMpisGeriatric() {
    var data = window.ActiveForm.collect(currentId);
    var p    = data.patient || {};
    var plan_impression = data.plan_impression || '';
    var plan_stg  = data.plan_stg  || '';
    var plan_ltg  = data.plan_ltg  || '';
    var plan_tx   = data.plan_tx   || '';
    var LN  = String.fromCharCode(10);
    var DIV = '==================================================';
    var dash= '--------------------------------------------------';
    var parts = [];

    parts.push('GERIATRIC ASSESSMENT');
    parts.push(DIV);
    parts.push('Name  : ' + (p.name||'') + '   Date : ' + (data.pt_date||p.date||''));
    if (p.type === 'local') {
      parts.push('IC    : ' + (p.nric||'') + '   Age  : ' + (p.age||''));
    } else {
      parts.push('Passport : ' + (p.passport||'') + '   Age : ' + (p.age||''));
    }
    parts.push('');

    function sec(title, val) {
      if (!val || !String(val).trim()) return;
      parts.push(dash); parts.push(title); parts.push(String(val).trim()); parts.push('');
    }

    sec("DOCTOR'S DIAGNOSIS", data.dx_diagnosis);
    sec("DOCTOR'S MANAGEMENT", data.dx_mgmt_type);
    sec('CURRENT COMPLAINT', data.complaint);
    sec('CURRENT HISTORY',   data.hx_current);
    sec('PAST HISTORY',      data.hx_past);

    // Falls
    if (data.fall_hx) {
      parts.push(dash); parts.push('FALLS HISTORY');
      parts.push('H/O Fall Past 1 Year : ' + (data.fall_hx||''));
      var cons = [];
      if (data.fall_fracture)     cons.push('Fracture');
      if (data.fall_hospitalised) cons.push('Hospitalised');
      if (data.fall_fear)         cons.push('Fear of Falling');
      if (data.fall_injury)       cons.push('Soft Tissue Injury');
      if (data.fall_none)         cons.push('No Injury');
      if (cons.length) parts.push('Consequence : ' + cons.join(', '));
      parts.push('');
    }

    // Medical history
    var med = [];
    var medMap = {med_hpt:'HPT',med_dm:'DM',med_ccf:'CCF',med_ihd:'IHD',
                  med_pvd:'PVD',med_copd:'COPD',med_dementia:'DEMENTIA',med_pd:'PD',
                  med_cva_rt:'CVA(RT)',med_cva_lt:'CVA(LT)',med_oa:'OA',med_fracture:'FRACTURE'};
    Object.keys(medMap).forEach(function(k) { if (data[k]) med.push(medMap[k]); });
    if (med.length) { parts.push(dash); parts.push('MEDICAL HISTORY'); parts.push(med.join(', ')); parts.push(''); }

    if (data.medication)    { parts.push(dash); parts.push('MEDICATION');    parts.push(data.medication); parts.push(''); }
    if (data.social_hx)    { parts.push(dash); parts.push('SOCIAL HISTORY'); parts.push(data.social_hx); parts.push(''); }

    parts.push(dash); parts.push('SUBJECTIVE');
    if (data.premorbid_mobility) parts.push('Premorbid Mobility : ' + data.premorbid_mobility);
    if (data.current_mobility)   parts.push('Current Mobility   : ' + data.current_mobility);
    if (data.main_carer)         parts.push('Main Carer         : ' + data.main_carer);
    if (data.cognitive)          parts.push('Cognitive Impairment: ' + data.cognitive + (data.cognitive_test ? ' (' + data.cognitive_test + ')' : ''));
    if (data.communication)      parts.push('Communication      : ' + data.communication);
    parts.push('');

    parts.push(dash); parts.push('OBJECTIVE');
    if (data.obj_posture)  parts.push('Posture/Gait   : ' + data.obj_posture);
    var mobMap = {mob_bed:'Bed',mob_sitting:'Sitting',mob_standing:'Standing',mob_transfer:'Transfer'};
    Object.keys(mobMap).forEach(function(k) {
      if (data[k]) parts.push('Functional ' + mobMap[k] + ' : ' + data[k]);
    });
    if (data.obj_lungs)    parts.push('Lungs          : ' + data.obj_lungs);
    if (data.obj_strength) parts.push('Strength       : ' + data.obj_strength);
    parts.push('');

    // Outcome measures
    var om = [];
    if (data.om_berg  && !data.om_na_berg)  om.push('Berg Balance Scale: ' + data.om_berg + '/56');
    if (data.om_tug   && !data.om_na_tug)   om.push('TUG: ' + data.om_tug + ' sec');
    if (data.om_sls   && !data.om_na_sls)   om.push('Single Leg Stance: ' + data.om_sls + ' sec');
    if ((data.om_grip_r || data.om_grip_l) && !data.om_na_grip) om.push('Grip Strength: R:' + (data.om_grip_r||'') + ' L:' + (data.om_grip_l||'') + ' kg');
    if (data.om_ftsst && !data.om_na_ftsst) om.push('FTSST: ' + data.om_ftsst + ' sec');
    if (data.om_ems   && !data.om_na_ems)   om.push('Elderly Mobility Scale: ' + data.om_ems + '/20');
    if (data.om_walk  && !data.om_na_walk)  om.push('Walk Test: ' + data.om_walk + ' m');
    if ((data.om_gait_sec || data.om_gait_steps) && !data.om_na_gait) om.push('Gait Speed: ' + (data.om_gait_sec||'') + 's / ' + (data.om_gait_steps||'') + ' steps');
    if ((data.om_reach_r || data.om_reach_l) && !data.om_na_reach) om.push('Sit & Reach: R:' + (data.om_reach_r||'') + ' L:' + (data.om_reach_l||'') + ' cm');
    if (om.length) {
      parts.push(dash); parts.push('OUTCOME MEASURES');
      om.forEach(function(l) { parts.push(l); });
      parts.push('');
    }

    parts.push(dash); parts.push("PHYSIOTHERAPIST'S IMPRESSION & PLAN");
    if (plan_impression) parts.push('Impression : ' + plan_impression);
    if (plan_stg)        parts.push('STG        : ' + plan_stg);
    if (plan_ltg)        parts.push('LTG        : ' + plan_ltg);
    if (plan_tx)         parts.push('Treatment  : ' + plan_tx);
    parts.push(''); parts.push(DIV);
    parts.push('Generated by PT Assessment System');

    var text = parts.join(LN);
    try {
      await navigator.clipboard.writeText(text);
      showToast('Copied! Paste into MPIS', 'ok');
    } catch (e) {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
      showToast('Copied! Paste into MPIS', 'ok');
    }
  }

  // ── MPIS: Cardiorespiratory ─────────────────────────
  async function copyToMpisCr() {
    var data = window.ActiveForm.collect(currentId);
    var p    = data.patient          || {};
    var pain = data.pain             || {};
    var sq   = data.specialQuestions || {};
    var ix   = data.investigation    || {};
    var hx   = data.history          || {};
    var obs  = data.observation      || {};
    var vs   = obs.vital_signs       || {};
    var sput = obs.sputum            || {};
    var vent = data.ventilated       || {};
    var palp = data.palpation        || {};
    var exp  = palp.expansion        || {};
    var meas = palp.measurement      || {};
    var ausc = data.auscultation     || {};
    var lmap = ausc.lung_map         || {};
    var st   = data.specialTest      || {};
    var mwt  = st['6mwt']           || {};
    var plan = data.plan             || {};
    var mgmt = data.management       || {};

    var LN  = String.fromCharCode(10);
    var DIV = '==================================================';
    var dash= '--------------------------------------------------';

    var parts = [];
    parts.push('CARDIORESPIRATORY ASSESSMENT');
    parts.push(DIV);
    parts.push('Name  : ' + (p.name||'') + '   Date : ' + (p.date||''));
    if (p.type === 'local') {
      parts.push('IC    : ' + (p.nric||'') + '   Age  : ' + (p.age||''));
    } else {
      parts.push('Passport : ' + (p.passport||'') + '   Country : ' + (p.country||'') + '   Age : ' + (p.age||''));
    }
    parts.push('Sex   : ' + (p.sex === 'M' ? 'Male' : p.sex === 'F' ? 'Female' : ''));
    parts.push('');

    function sec(title, val) {
      if (!val || !String(val).trim()) return;
      parts.push(dash); parts.push(title); parts.push(String(val).trim()); parts.push('');
    }

    sec('DIAGNOSIS', data.diagnosis);
    sec("DOCTOR'S MANAGEMENT", mgmt.type);
    sec('PROBLEM', data.problem);

    parts.push(dash); parts.push('PAIN SCORE');
    parts.push('PRE: ' + (pain.pre||'0') + '/10   POST: ' + (pain.post||'0') + '/10');
    parts.push('');

    parts.push(dash); parts.push('SPECIAL QUESTIONS');
    if (sq.health)                parts.push('General Health        : ' + sq.health);
    if (sq.pmhx)                  parts.push('PMHx                  : ' + sq.pmhx);
    if (sq.surgery)               parts.push('Surgical History      : ' + sq.surgery);
    if (sq.medication)            parts.push('Medication            : ' + sq.medication);
    if (sq.occupation)            parts.push('Occupation/Recreation : ' + sq.occupation);
    if (sq.functional_limitation) parts.push('Functional Limitation : ' + sq.functional_limitation);
    if (sq.smoking)               parts.push('Smoking               : ' + sq.smoking);
    if (sq.alcohol)               parts.push('Alcohol               : ' + sq.alcohol);
    parts.push('');

    parts.push(dash); parts.push('INVESTIGATION');
    if (ix.cxr)   parts.push('CXR  : ' + ix.cxr);
    if (ix.abg)   parts.push('ABG  : ' + ix.abg);
    if (ix.other) parts.push('Other: ' + ix.other);
    parts.push('');

    sec('CURRENT HISTORY', hx.current);
    sec('PAST HISTORY',    hx.past);

    parts.push(dash); parts.push('OBSERVATION');
    parts.push('Vital Signs : Temp ' + (vs.temp||'—') + 'C  RR ' + (vs.rr||'—') + '/min  PR ' + (vs.pr||'—') + 'bpm  BP ' + (vs.bp||'—') + 'mmHg  SpO2 ' + (vs.spo2||'—') + '%');
    if (obs.breathing_pattern) parts.push('Breathing Pattern  : ' + obs.breathing_pattern);
    if (obs.breathing_level)   parts.push('Breathing Level    : ' + obs.breathing_level);
    if (obs.chest_deformity)   parts.push('Chest Deformity    : ' + obs.chest_deformity);
    if (obs.chest_drain)       parts.push('Chest Drain        : ' + obs.chest_drain);
    if (obs.cough_type || obs.cough_effect)
      parts.push('Cough              : ' + [obs.cough_type, obs.cough_effect].filter(Boolean).join(', '));
    if (sput.colour || sput.amount || sput.consistency)
      parts.push('Sputum             : Colour: ' + (sput.colour||'—') + '  Amount: ' + (sput.amount||'—') + '  Consistency: ' + (sput.consistency||'—'));
    if (obs.o2_treatment) parts.push('O2 Treatment       : ' + obs.o2_treatment);
    if (vent.mode || vent.peep || vent.fio2) {
      parts.push('Ventilated         : Mode: ' + (vent.mode||'—') + '  PEEP: ' + (vent.peep||'—') + '  FiO2: ' + (vent.fio2||'—') + '%');
    }
    parts.push('');

    parts.push(dash); parts.push('PALPATION');
    parts.push('Chest Expansion:');
    parts.push('  Apical (ant)     : ' + (exp.apical||'—'));
    parts.push('  Middle (ant)     : ' + (exp.middle||'—'));
    parts.push('  Lower Costal     : ' + (exp.lower_costal||'—'));
    parts.push('Chest Measurement (thumb displacement):');
    parts.push('  Apical       : ' + (meas.apical||'—') + (meas.apical_status ? '  [' + meas.apical_status + ']' : ''));
    parts.push('  Middle       : ' + (meas.middle||'—') + (meas.middle_status ? '  [' + meas.middle_status + ']' : ''));
    parts.push('  Lower Costal : ' + (meas.lower_costal||'—') + (meas.lower_costal_status ? '  [' + meas.lower_costal_status + ']' : ''));
    parts.push('');

    parts.push(dash); parts.push('AUSCULTATION');
    if (ausc.lungs)       parts.push('Lungs       : ' + ausc.lungs);
    if (ausc.crepitation) parts.push('Crepitation : ' + ausc.crepitation);
    if (ausc.air_entry)   parts.push('Air Entry   : ' + ausc.air_entry);
    var zoneLabels = { RU:'Right Upper', RM:'Right Middle', RL:'Right Lower', LU:'Left Upper', LL:'Left Lower', BASE:'Bilateral Bases' };
    var findingLabels = { clear:'Clear', crep:'Crepitation', wheeze:'Wheeze', reduced:'Reduced air entry', absent:'Absent' };
    var mapEntries = Object.keys(lmap).filter(function(k){ return lmap[k]; });
    if (mapEntries.length) {
      parts.push('Zone Findings:');
      mapEntries.forEach(function(k) {
        parts.push('  ' + (zoneLabels[k]||k) + ' : ' + (findingLabels[lmap[k]]||lmap[k]));
      });
    }
    parts.push('');

    parts.push(dash); parts.push('SPECIAL TEST');
    parts.push('6-Minute Walk Test:');
    parts.push('  Distance : ' + (mwt.distance||'—') + ' m');
    parts.push('  PR       : Pre ' + (mwt.pr_pre||'—') + '  Post ' + (mwt.pr_post||'—'));
    parts.push('  RPE/Borg : Pre ' + (mwt.rpe_pre||'—') + '  Post ' + (mwt.rpe_post||'—'));
    if (mwt.remarks) parts.push('  Remarks  : ' + mwt.remarks);
    if (st.pefr)                 parts.push('PEFR               : ' + st.pefr + ' L/min');
    if (st.incentive_spirometer) parts.push('Incentive Spirometer: ' + st.incentive_spirometer);
    parts.push('');

    parts.push(dash); parts.push("PHYSIOTHERAPIST'S IMPRESSION & PLAN");
    if (plan.impression) parts.push('Impression : ' + plan.impression);
    if (plan.stg)        parts.push('STG        : ' + plan.stg);
    if (plan.ltg)        parts.push('LTG        : ' + plan.ltg);
    if (plan.treatment)  parts.push('Treatment  : ' + plan.treatment);
    parts.push(''); parts.push(DIV);
    parts.push('Generated by PT Assessment System');

    var text = parts.join(LN);
    try {
      await navigator.clipboard.writeText(text);
      showToast('Copied! Paste into MPIS', 'ok');
    } catch (e) {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
      showToast('Copied! Paste into MPIS', 'ok');
    }
  }
  async function copyToMpis() {
    var data = window.ActiveForm.collect(currentId);
    var p    = data.patient || {};
    var pain = data.pain    || {};
    var sq   = data.specialQuestions || {};
    var hx   = data.history || {};
    var neuro= data.neurological || {};
    var obs  = data.observation  || {};
    var palp = data.palpation    || {};
    var mov  = data.movement     || {};
    var plan = data.plan         || {};
    var mgmt = data.management   || {};
    var bc   = data.bodyChart    || {};
    var LN   = String.fromCharCode(10); // avoid literal newline issues
    var DIV  = '==================================================';
    var dash = '--------------------------------------------------';

    var parts = [];
    parts.push('MUSCULOSKELETAL ASSESSMENT');
    parts.push(DIV);
    parts.push('Name  : ' + (p.name||'') + '   Date : ' + (p.date||''));
    if (p.type === 'local') {
      parts.push('IC    : ' + (p.nric||'') + '   Age  : ' + (p.age||''));
    } else {
      parts.push('Passport : ' + (p.passport||'') + '   Country : ' + (p.country||'') + '   Age : ' + (p.age||''));
      parts.push('Sex   : ' + (p.sex||''));
    }
    parts.push('');

    function sec(title, val) {
      if (!val || !String(val).trim()) return;
      parts.push(dash); parts.push(title); parts.push(String(val).trim()); parts.push('');
    }

    sec('DIAGNOSIS', data.diagnosis);
    sec("DOCTOR'S MANAGEMENT", (mgmt.type||'') + (mgmt.surgeryDate ? ' (Surgery: ' + mgmt.surgeryDate + ')' : ''));
    sec('PROBLEM', data.problem);

    parts.push(dash); parts.push('PAIN SCORE');
    parts.push('PRE: ' + (pain.pre||'0') + '/10   POST: ' + (pain.post||'0') + '/10');
    if (pain.nature)       parts.push('Nature       : ' + pain.nature);
    if (pain.agg)          parts.push('Aggravating  : ' + pain.agg);
    if (pain.ease)         parts.push('Easing       : ' + pain.ease);
    if (pain.behaviour24)  parts.push('24hrs        : ' + pain.behaviour24);
    if (pain.irritability) parts.push('Irritability : ' + pain.irritability);
    parts.push('');

    var markers = bc.markers || [];
    if (markers.length) {
      parts.push(dash); parts.push('BODY CHART');
      markers.forEach(function(m) {
        parts.push('#' + m.id + ' ' + m.zone + ' (' + m.type + ') - ' + (m.view==='ant'?'Anterior':'Posterior'));
      });
      if (bc.notes) parts.push('Notes: ' + bc.notes);
      parts.push('');
    }

    sec('CURRENT HISTORY', hx.current);
    sec('PAST HISTORY', hx.past);

    parts.push(dash); parts.push('SPECIAL QUESTIONS');
    if (sq.health)        parts.push('General Health   : ' + sq.health);
    if (sq.pmhx)          parts.push('PMHX             : ' + sq.pmhx);
    if (sq.surgery)       parts.push('Surgical History : ' + sq.surgery);
    if (sq.investigation) parts.push('Investigation    : ' + sq.investigation);
    if (sq.medication)    parts.push('Medication       : ' + sq.medication);
    if (sq.occupation)    parts.push('Occupation       : ' + sq.occupation);
    if (sq.recreation)    parts.push('Recreation       : ' + sq.recreation);
    if (sq.social)        parts.push('Social History   : ' + sq.social);
    parts.push('Pacemaker/Hearing Aid: ' + (sq.pacemaker||'No'));
    parts.push('');

    var s = neuro.sensation||{}, r = neuro.reflex||{}, mo = neuro.motor||{};
    parts.push(dash); parts.push('NEUROLOGICAL TEST');
    parts.push('Sensation : L: ' + (s.left||'') + '  R: ' + (s.right||'') + (s.notes ? '  ' + s.notes : ''));
    parts.push('Reflex    : L: ' + (r.left||'') + '  R: ' + (r.right||'') + (r.notes ? '  ' + r.notes : ''));
    parts.push('Motor     : L: ' + (mo.left||'') + '  R: ' + (mo.right||'') + (mo.notes ? '  ' + mo.notes : ''));
    if (neuro.notes) parts.push('Notes: ' + neuro.notes);
    parts.push('');

    parts.push(dash); parts.push('OBSERVATION');
    if (obs.general) parts.push('General : ' + obs.general);
    if (obs.local)   parts.push('Local   : ' + obs.local);
    parts.push('');

    parts.push(dash); parts.push('PALPATION');
    if (palp.tenderness)  parts.push('Tenderness  : ' + palp.tenderness);
    if (palp.temperature) parts.push('Temperature : ' + palp.temperature);
    if (palp.muscle)      parts.push('Muscle/ST   : ' + palp.muscle);
    if (palp.joint)       parts.push('Joint/Bony  : ' + palp.joint);
    parts.push('');

    var movRows = mov.table || [];
    if (movRows.length) {
      parts.push(dash); parts.push('MOVEMENT ASSESSMENT');
      movRows.forEach(function(row) {
        if (!row.joint) return;
        parts.push(
          (row.joint||'') + ' | ' + (row.side||'') + ' | ' + (row.plane||'') +
          ' | Active: ' + (row.activeRom||'') + (row.activePain ? ' (' + row.activePain + ')' : '') +
          ' | Passive: ' + (row.passiveRom||'') + (row.passivePain ? ' (' + row.passivePain + ')' : '') +
          ' | Resisted: ' + (row.resisted||'')
        );
      });
      parts.push('');
    }
    if (mov.muscle)    parts.push('Muscle Strength : ' + mov.muscle);
    if (mov.accessory) parts.push('Accessory Movt  : ' + mov.accessory);
    if (mov.special)   parts.push('Special Tests   : ' + mov.special);
    if (mov.clearing)  parts.push('Clearing Tests  : ' + mov.clearing);
    if (mov.functional)parts.push('Functional      : ' + mov.functional);
    parts.push('');

    parts.push(dash); parts.push("PHYSIOTHERAPIST'S IMPRESSION & PLAN");
    if (plan.impression) parts.push('Impression : ' + plan.impression);
    if (plan.stg)        parts.push('STG        : ' + plan.stg);
    if (plan.ltg)        parts.push('LTG        : ' + plan.ltg);
    if (plan.treatment)  parts.push('Treatment  : ' + plan.treatment);
    if (plan.remarks)    parts.push('Remarks    : ' + plan.remarks);
    parts.push(''); parts.push(DIV);
    parts.push('Generated by PT Assessment System');

    var text = parts.join(LN);

    try {
      await navigator.clipboard.writeText(text);
      showToast('Copied! Paste into MPIS', 'ok');
    } catch (e) {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
      showToast('Copied! Paste into MPIS', 'ok');
    }
  }

    // ── Export PDF — auto-save if needed then export ─
  async function exportPdf(id) {
    if (!id) {
      // Try auto-save first
      var name = document.getElementById('pt-name').value.trim();
      var date = document.getElementById('pt-date').value.trim();
      if (!name && !date) {
        showToast('Fill in patient details before exporting', 'err');
        return;
      }
      try {
        showToast('Saving before export...', '');
        var data = window.ActiveForm.collect(currentId);
        var j    = await API.saveRecord(data);
        currentId = j.id;
        markClean();
        loadRecordsList();
        API.exportPdf(currentId);
      } catch (e) {
        showToast('Save failed: ' + e.message, 'err');
      }
      return;
    }
    API.exportPdf(id);
  }

  // ── Dark mode ────────────────────────────────
  function initDark() {
    if (localStorage.getItem('pt_dark') === '1') {
      document.body.classList.add('dark');
      var btn = document.getElementById('dark-toggle');
      if (btn) btn.textContent = '\u2600'; // sun
    }
  }

  function toggleDark() {
    var isDark = document.body.classList.toggle('dark');
    localStorage.setItem('pt_dark', isDark ? '1' : '0');
    var btn = document.getElementById('dark-toggle');
    if (btn) btn.textContent = isDark ? '\u2600' : '\u263E'; // sun/moon
  }


  // ── MPIS dispatcher — picks right function by form type ──
  async function copyToMpisAuto() {
    var formType = 'MS';
    try {
      var d = window.ActiveForm.collect(currentId);
      formType = (d._form_type || (d.meta && d.meta.form) || 'MS').toUpperCase();
    } catch(e) { formType = 'MS'; }
    if (formType === 'SPINE')     return copyToMpisSpine();
    if (formType === 'GERIATRIC') return copyToMpisGeriatric();
    if (formType === 'CR')        return copyToMpisCr();
    return copyToMpis();
  }

  return {
    init:           init,
    go:             go,
    updateProgress: updateProgress,
    saveRecord:     saveRecord,
    loadRecord:     loadRecord,
    deleteRecord:   deleteRecord,
    newForm:        newForm,
    clearForm:      clearForm,
    showToast:      showToast,
    restoreDraft:   restoreDraft,
    dismissDraft:   dismissDraft,
    exportPdf:      exportPdf,
    getCurrentId:   function() { return currentId; },
    setCurrentId:   function(id) { currentId = id; },
    clearDirty:     function() { isDirty = false; },
    get isDirty()   { return isDirty; },
    copyToMpis:          copyToMpis,
    copyToMpisSpine:     copyToMpisSpine,
    copyToMpisGeriatric: copyToMpisGeriatric,
    copyToMpisCr:        copyToMpisCr,
    copyToMpisAuto:      copyToMpisAuto,
    toggleDark:     toggleDark
  };

})();

document.addEventListener('DOMContentLoaded', function () {
  Main.init();
});
