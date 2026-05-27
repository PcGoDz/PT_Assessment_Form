// main.js — app init, navigation, records sidebar, progress bar, toast
// Features: autosave to localStorage, dirty form warning, draft recovery

const Main = (function () {

  let currentId     = null;
  let isDirty       = false;
  let autoSaveTimer = null;
  const DRAFT_KEY   = 'pt_assessment_draft';

  var _panelEpisodeId   = null;
  var _panelPatientId   = null;
  var _panelPatientData = null;
  var _panelAssessDate  = null;

  var _mpisModalResolve = null;

  // ── Shared MPIS constants ─────────────────────
  var MPIS_DIV  = '==================================================';
  var MPIS_DASH = '--------------------------------------------------';
  var MPIS_LN   = String.fromCharCode(10);

  // ── Shared helpers ────────────────────────────
  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function _formatAppt(date, time) {
    if (!date) return '';
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var parts  = date.split('-');
    if (parts.length < 3) return date;
    var d   = parseInt(parts[2], 10);
    var mon = months[parseInt(parts[1], 10) - 1] || '';
    var t   = '';
    if (time) {
      var tp   = time.split(':');
      var h    = parseInt(tp[0], 10);
      var m    = tp[1] || '00';
      var ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      t = ' · ' + h + ':' + m + ' ' + ampm;
    }
    return d + ' ' + mon + t;
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
    }
    showToast('Copied! Paste into MPIS', 'ok');
  }

  function mpisSec(parts, title, val) {
    if (!val || !String(val).trim()) return;
    parts.push(MPIS_DASH); parts.push(title); parts.push(String(val).trim()); parts.push('');
  }

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
    if (el) el.style.display = show ? 'flex' : 'none';
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
      if (banner) banner.classList.add('show');
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
    if (banner) banner.classList.remove('show');
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
          + '<div class="record-name">' + escapeHtml(r.patient_name || '(no name)') + '</div>'
          + '<div class="record-meta">' + escapeHtml(r.patient_date || '') + ' &bull; ' + escapeHtml(r.form_type) + '</div>'
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
        _panelPatientData = p;
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
            if (data && data.patient) {
              _panelAssessDate = data.patient.date || '';
            }
          }
        })
        .catch(function(e) { console.warn('Auto-load record failed:', e); });
    }

    // ── Patient chip injection ──────────────────────────────────────
    if (episodeId) {
      _panelEpisodeId = episodeId;
      _panelPatientId = patientId;
      fetch('/api/episodes/' + episodeId)
        .then(function(r){ return r.json(); })
        .then(function(ep){
          var pt       = _panelPatientData || {};
          var name     = pt.name || 'Patient';
          var initials = name.split(' ').map(function(w){ return w[0]; })
                             .slice(0,2).join('').toUpperCase();
          var apptLabel = _formatAppt(ep.next_appt, ep.next_appt_time);

          var chip = document.createElement('button');
          chip.type      = 'button';
          chip.className = 'm3-patient-chip';
          chip.id        = 'pt-context-chip';
          chip.innerHTML =
            '<span class="m3-patient-chip-avatar">' + escapeHtml(initials) + '</span>' +
            '<span>' + escapeHtml(name) + '</span>' +
            (apptLabel
              ? '<span style="color:var(--text-muted);font-size:11px"> &middot; ' + escapeHtml(apptLabel) + '</span>'
              : '');
          chip.onclick = openPatientPanel;

          var navGroup = document.getElementById('topbar-nav-group');
          if (navGroup) navGroup.insertBefore(chip, navGroup.firstChild);
        })
        .catch(function(e){ console.warn('Patient chip fetch failed:', e); });
    }

    // ── 3. Lock patient identity fields — prevent changing NRIC/type for existing patient
    if (patientId || episodeId) {
      ['pt-nric', 'pt-passport'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.readOnly = true;
      });
      document.querySelectorAll('input[name="pt-type"]').forEach(function(el) {
        el.disabled = true;
      });
    }

    // ── 4. Return / Save & Return nav buttons ────────────────────
    if (episodeId || patientId) {
      var navGroup = document.getElementById('topbar-nav-group');
      var navSep   = document.getElementById('topbar-nav-sep');
      if (navGroup && !navGroup.querySelector('.ctx-ret-btn')) {
        var retBtn = document.createElement('button');
        retBtn.className   = 'm3-ctx-action ctx-ret-btn';
        retBtn.innerHTML   = '&#8592; Return';
        retBtn.title       = 'Return to patient';
        var retDest = patientId ? '/patient/' + patientId : '/';
        retBtn.onclick = function() {
          if (isDirty && !confirm('You have unsaved changes. Return anyway?')) return;
          window.location.href = retDest;
        };

        var saveRetBtn = document.createElement('button');
        saveRetBtn.className   = 'm3-ctx-primary ctx-ret-btn';
        saveRetBtn.textContent = 'Save & Return';
        saveRetBtn.onclick = async function() {
          await saveRecord();
          setTimeout(function() { window.location.href = retDest; }, 800);
        };

        if (patientId) {
          var profileBtn = document.createElement('button');
          profileBtn.className   = 'm3-ctx-action ctx-ret-btn';
          profileBtn.innerHTML   = '&#128100; View Profile';
          profileBtn.title       = 'View patient profile';
          profileBtn.onclick = function() {
            window.location.href = '/patient/' + patientId;
          };
          navGroup.appendChild(profileBtn);
        }
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
    if (typeof HandChart !== 'undefined' && document.getElementById('hand-svg-r')) {
      HandChart.init();
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
  function _buildMpisSpine() {
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
    var LN   = MPIS_LN;
    var DIV  = MPIS_DIV;
    var dash = MPIS_DASH;
    var parts = [];

    function sec(title, val) { mpisSec(parts, title, val); }
    parts.push('SPINE ASSESSMENT');
    parts.push(DIV);
    parts.push('Name  : ' + (p.name||'') + '   Date : ' + (p.date||''));
    if (p.type === 'local') {
      parts.push('IC    : ' + (p.nric||'') + '   Age  : ' + (p.age||''));
    } else {
      parts.push('Passport : ' + (p.passport||'') + '   Country : ' + (p.country||'') + '   Age : ' + (p.age||''));
    }
    parts.push('');

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
    return parts;
  }

  // ── MPIS: Geriatric ────────────────────────────
  function _buildMpisGeriatric() {
    var data = window.ActiveForm.collect(currentId);
    var p    = data.patient || {};
    var plan_impression = data.plan_impression || '';
    var plan_stg  = data.plan_stg  || '';
    var plan_ltg  = data.plan_ltg  || '';
    var plan_tx   = data.plan_tx   || '';
    var LN  = MPIS_LN;
    var DIV = MPIS_DIV;
    var dash= MPIS_DASH;
    var parts = [];

    function sec(title, val) { mpisSec(parts, title, val); }
    parts.push('GERIATRIC ASSESSMENT');
    parts.push(DIV);
    parts.push('Name  : ' + (p.name||'') + '   Date : ' + (data.pt_date||p.date||''));
    if (p.type === 'local') {
      parts.push('IC    : ' + (p.nric||'') + '   Age  : ' + (p.age||''));
    } else {
      parts.push('Passport : ' + (p.passport||'') + '   Age : ' + (p.age||''));
    }
    parts.push('');

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
    return parts;
  }

  // ── MPIS: Cardiorespiratory ─────────────────────────
  function _buildMpisCr() {
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

    var LN  = MPIS_LN;
    var DIV = MPIS_DIV;
    var dash= MPIS_DASH;

    var parts = [];
    function sec(title, val) { mpisSec(parts, title, val); }
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
    return parts;
  }

  // ── MPIS: Musculoskeletal ─────────────────────
  function _buildMpisMs() {
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
    var LN   = MPIS_LN;
    var DIV  = MPIS_DIV;
    var dash = MPIS_DASH;

    var parts = [];
    function sec(title, val) { mpisSec(parts, title, val); }
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
    return parts;
  }

  // ── Export PDF — auto-save if needed then export ─
  async function exportPdf(id, formType) {
    var needSave = !id || isDirty;
    if (needSave) {
      var name = document.getElementById('pt-name') ? document.getElementById('pt-name').value.trim() : '';
      var date = document.getElementById('pt-date') ? document.getElementById('pt-date').value.trim() : '';
      if (!id && !name && !date) {
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
        API.exportPdf(currentId, formType);
      } catch (e) {
        showToast('Save failed: ' + e.message, 'err');
      }
      return;
    }
    API.exportPdf(id, formType);
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


  // ── MPIS dispatcher — shows modal once, then dispatches ──
  async function copyToMpisAuto() {
    var header = await showMpisHeaderModal();
    if (!header) return;
    var formType = 'MS';
    try {
      var d = window.ActiveForm.collect(currentId);
      formType = (d._form_type || (d.meta && d.meta.form) || 'MS').toUpperCase();
    } catch(e) {}
    var parts;
    if      (formType === 'SPINE')      parts = _buildMpisSpine();
    else if (formType === 'GERIATRIC')  parts = _buildMpisGeriatric();
    else if (formType === 'CR')         parts = _buildMpisCr();
    else if (formType === 'AMPUTATION') parts = _buildMpisAmputation();
    else if (formType === 'NEURO')      parts = _buildMpisNeuro();
    else if (formType === 'HAND')       parts = _buildMpisHand();
    else                                parts = _buildMpisMs();
    await _doCopyMpis(parts, header);
  }

  function _buildMpisAmputation() {
    var data = window.ActiveForm.collect(currentId);
    var p    = data.patient || {};

    var LN  = MPIS_LN;
    var DIV = MPIS_DIV;
    var dash= MPIS_DASH;
    var parts = [];

    function sec(title, val) { mpisSec(parts, title, val); }
    function line(label, val) {
      if (val && String(val).trim()) parts.push(label + String(val).trim());
    }
    parts.push('AMPUTATION ASSESSMENT');
    parts.push(DIV);
    parts.push('Name  : ' + (p.name||'') + '   Date : ' + (p.date||''));
    if (p.pt_type === 'local') {
      parts.push('IC    : ' + (p.nric||'') + '   Age  : ' + (p.age||''));
    } else {
      parts.push('Passport : ' + (p.passport||'') + '   Country : ' + (p.country||'') + '   Age : ' + (p.age||''));
    }
    parts.push('Sex   : ' + (p.sex||''));
    parts.push('');

    sec('DIAGNOSIS',           data.diagnosis);
    sec("DOCTOR'S MANAGEMENT", data.doctors_management);
    sec('PROBLEMS',            data.problems);

    parts.push(dash); parts.push('PAIN SCALE');
    parts.push('PRE: ' + (data.pain_pre||'0') + '/10   POST: ' + (data.pain_post||'0') + '/10');
    line('Nature       : ', data.pain_nature);
    line('Agg          : ', data.pain_agg);
    line('Ease         : ', data.pain_ease);
    line('Irritability : ', data.pain_irritability);
    parts.push('');

    parts.push(dash); parts.push('PHANTOM LIMB SENSATION');
    parts.push('Present: ' + (data.phantom_present||'No'));
    if (data.phantom_present === 'Yes') {
      if (data.phantom_type)     parts.push('Type    : ' + data.phantom_type);
      if (data.phantom_duration) parts.push('Pattern : ' + data.phantom_duration);
      if (data.phantom_comments) parts.push('Comments: ' + data.phantom_comments);
    }
    parts.push('');

    parts.push(dash); parts.push('SPECIAL QUESTIONS');
    line('General Health      : ', data.sq_general_health);
    line('PMHx / Surgery      : ', data.sq_pmhx);
    line('Medication          : ', data.sq_medication);
    line('Social History      : ', data.sq_social_history);
    line('Home Accessibility  : ', data.sq_home_access);
    line('Pre-Morbid Condition: ', data.sq_pre_morbid);
    parts.push('');

    parts.push(dash); parts.push('PROSTHETIC USAGE');
    line('Types of Prosthesis          : ', data.prosthetic_types);
    line('Don/Doff                     : ', data.prosthetic_don_doff);
    line('Prosthetic Static WB         : ', data.prosthetic_static_wb);
    line('Max Walking Distance/day     : ', data.prosthetic_max_walk);
    line('Duration Wearing/day         : ', data.prosthetic_duration);
    parts.push('');

    sec('CURRENT HISTORY', data.current_history);
    sec('PAST HISTORY',    data.past_history);

    parts.push(dash); parts.push('OBSERVATION');
    if (data.obs_general)         parts.push('General / Local  : ' + data.obs_general);
    if (data.obs_stump_condition) parts.push('Stump Condition  : ' + data.obs_stump_condition);
    if (data.obs_bandaging)       parts.push('Bandaging Skill  : ' + data.obs_bandaging);
    if (data.obs_gait)            parts.push('Gait             : ' + data.obs_gait);
    parts.push('');

    sec('PALPATION', data.palpation);
    sec('CARDIORESPIRATORY STATUS', data.cardio_status);

    if (data.movements && data.movements.length) {
      parts.push(dash); parts.push('MOVEMENT');
      data.movements.forEach(function(m) {
        if (m.joint) {
          parts.push('  ' + m.joint + ' — Active: ' + (m.active||'—') + '  Passive: ' + (m.passive||'—') +
            (m.comments ? '  [' + m.comments + ']' : ''));
        }
      });
      parts.push('');
    }

    if (data.mmt && data.mmt.length) {
      parts.push(dash); parts.push('MANUAL MUSCLE TESTING');
      data.mmt.forEach(function(m) {
        if (m.muscle || m.gradeR || m.gradeL) {
          parts.push('  ' + (m.muscle||'—') + ' — R: ' + (m.gradeR||'—') + '  L: ' + (m.gradeL||'—'));
        }
      });
      parts.push('');
    }

    parts.push(dash); parts.push('STUMP MEASUREMENT');
    line('Length        : ', data.stump_length);
    line('Circumference : ', data.stump_circumference);
    parts.push('');

    sec('CLEARING TESTS', data.clearing_tests);

    parts.push(dash); parts.push('OUTCOME MEASUREMENT');
    if (data.outcome_skipped) {
      parts.push('Not assessed — ' + (data.outcome_skip_reason||'') +
        (data.outcome_skip_notes ? ' (' + data.outcome_skip_notes + ')' : ''));
    } else {
      var mrmiTotal = 0;
      var mrmiItems = [data.mrmi_1,data.mrmi_2,data.mrmi_3,data.mrmi_4,
                       data.mrmi_5,data.mrmi_6,data.mrmi_7,data.mrmi_8];
      mrmiItems.forEach(function(v){ mrmiTotal += parseInt(v||0,10); });
      parts.push('Modified Rivermead Mobility Index  Date: ' + (data.mrmi_date||''));
      parts.push('  1.Turning over:' + (data.mrmi_1||'') +
        '  2.Lying-sitting:' + (data.mrmi_2||'') +
        '  3.Sit Balance:' + (data.mrmi_3||'') +
        '  4.Sit-Stand:' + (data.mrmi_4||''));
      parts.push('  5.Standing:' + (data.mrmi_5||'') +
        '  6.Transfer:' + (data.mrmi_6||'') +
        '  7.Walking:' + (data.mrmi_7||'') +
        '  8.Stairs:' + (data.mrmi_8||'') +
        '  Total: ' + mrmiTotal + '/40');
      parts.push('TUG — Aid: ' + (data.tug_walking_aid||'—') + '  Result: ' + (data.tug_distance||'—'));
      parts.push('2MWT — Aid: ' + (data.mwt_walking_aid||'—') + '  Distance: ' + (data.mwt_distance||'—') + ' m');
    }
    parts.push('');

    parts.push(dash); parts.push("PHYSIOTHERAPIST'S IMPRESSION");
    if (data.pt_impression)    parts.push(data.pt_impression);
    if (data.patient_goals)    parts.push('Patient Goals : ' + data.patient_goals);
    if (data.short_term_goals) parts.push('STG           : ' + data.short_term_goals);
    if (data.long_term_goals)  parts.push('LTG           : ' + data.long_term_goals);
    if (data.plan_of_treatment)parts.push('Treatment     : ' + data.plan_of_treatment);
    parts.push(''); parts.push(DIV);
    return parts;
  }

  function _buildMpisNeuro() {
    var data = window.ActiveForm.collect(currentId);
    var p    = data.patient || {};

    var LN   = MPIS_LN;
    var DIV  = MPIS_DIV;
    var dash = MPIS_DASH;
    var parts = [];

    function sec(title, val) { mpisSec(parts, title, val); }
    function line(label, val) {
      if (val && String(val).trim()) parts.push(label + String(val).trim());
    }
    function chips(label, arr) {
      if (arr && arr.length) parts.push(label + arr.join(', '));
    }

    parts.push('NEUROLOGY ASSESSMENT');
    parts.push(DIV);
    parts.push('Name  : ' + (p.name||'') + '   Date : ' + (p.date||''));
    if (p.pt_type === 'local') {
      parts.push('IC    : ' + (p.nric||'') + '   Age  : ' + (p.age||''));
    } else {
      parts.push('Passport : ' + (p.passport||'') + '   Country : ' + (p.country||'') + '   Age : ' + (p.age||''));
    }
    parts.push('Sex   : ' + (p.sex||''));
    parts.push('');

    sec('DIAGNOSIS', data.diagnosis);
    line("DOCTOR'S MANAGEMENT : ", data.dr_mgmt);
    parts.push('');

    parts.push(dash); parts.push('PRESENTING COMPLAINT');
    chips('Complaints  : ', data.complaint);
    line('Details     : ', data.complaint_text);
    parts.push('Pain Score  : ' + (data.pain_score||'0') + '/10');
    line('Patient Goal: ', data.patient_goal);
    parts.push('');

    parts.push(dash); parts.push('HISTORY');
    if (data.onset_value) parts.push('Onset : ' + data.onset_value + ' ' + (data.onset_unit||''));
    chips('Limbs Affected : ', data.limbs);
    line('Previous Episode : ', data.prev_episode);
    line('Pre-morbid Mobility : ', data.prev_mobility);
    chips('Pre-morbid Aid : ', data.prev_aid);
    chips('PMHx : ', data.pmhx_chips);
    line('PMHx Details : ', data.pmhx_details);
    line('Previous PT  : ', data.past_pt);
    line('PT Outcome   : ', data.past_pt_outcome);
    parts.push('');

    if (data.investigations && data.investigations.length) {
      parts.push(dash); parts.push('INVESTIGATIONS');
      data.investigations.forEach(function(r) {
        if (r[0]) parts.push('  ' + r[0] + (r[1] ? '  ' + r[1] : '') + (r[2] ? '  — ' + r[2] : ''));
      });
      parts.push('');
    }

    if (data.medications && data.medications.length) {
      parts.push(dash); parts.push('MEDICATIONS');
      data.medications.forEach(function(r) {
        if (r[0]) parts.push('  ' + r[0] + (r[1] ? '  ' + r[1] : '') + (r[2] ? '  ' + r[2] : ''));
      });
      parts.push('');
    }

    parts.push(dash); parts.push('SPECIAL QUESTIONS');
    line('General Health        : ', data.gen_health);
    line('Emotional Status      : ', data.emotional_status);
    line('Bladder               : ', data.bladder);
    line('Bowel                 : ', data.bowel);
    chips('Vision                : ', data.vision);
    chips('Hearing               : ', data.hearing);
    line('Sensation (general)   : ', data.sensation_gen);
    line('Hand Dominance        : ', data.hand_dom);
    line('Premorbid Independence: ', data.premorbid_indep);
    line('Current Independence  : ', data.current_indep);
    line('House Type            : ', data.house_type);
    line('Toilet Type           : ', data.toilet_type);
    line('Stairs                : ', data.has_stairs);
    line('Door Width            : ', data.door_width);
    line('Occupation            : ', data.occupation);
    line('Hobbies               : ', data.hobbies);
    parts.push('');

    parts.push(dash); parts.push('OBSERVATION');
    chips('Appearance    : ', data.appearance);
    chips('Consciousness : ', data.consciousness);
    chips('Posture       : ', data.posture_obs);
    chips('Mobility      : ', data.mobility_obs);
    chips('Emotional     : ', data.emotional_obs);
    chips('Respiratory   : ', data.resp_obs);
    chips('Devices       : ', data.devices);
    parts.push('');

    parts.push(dash); parts.push('VITAL SIGNS');
    if (data.bp_sys || data.bp_dia) parts.push('BP  : ' + (data.bp_sys||'—') + '/' + (data.bp_dia||'—') + ' mmHg');
    line('HR  : ', data.hr ? data.hr + ' bpm' : '');
    line('RR  : ', data.rr ? data.rr + ' /min' : '');
    line('SpO2: ', data.spo2 ? data.spo2 + '%' : '');
    line('Breathing Pattern : ', data.breathing_pattern);
    line('Breathing Type    : ', data.breathing_type);
    parts.push('');

    parts.push(dash); parts.push('MUSCLE TONE (Modified Ashworth)');
    parts.push('RUL: ' + (data.tone_rul||'—') + '  LUL: ' + (data.tone_lul||'—') +
               '  RLL: ' + (data.tone_rll||'—') + '  LLL: ' + (data.tone_lll||'—'));
    line('Notes: ', data.tone_notes);
    parts.push('');

    if (data.mmt && data.mmt.length) {
      parts.push(dash); parts.push('MANUAL MUSCLE TESTING');
      data.mmt.forEach(function(r) {
        var isObj = r !== null && typeof r === 'object' && !Array.isArray(r);
        var muscle = isObj ? r.muscle : r[0];
        var gradeR = isObj ? r.gradeR : r[1];
        var gradeL = isObj ? r.gradeL : r[2];
        if (muscle) parts.push('  ' + muscle + ' — R: ' + (gradeR||'—') + '  L: ' + (gradeL||'—'));
      });
      parts.push('');
    }

    if (data.rom && data.rom.length) {
      parts.push(dash); parts.push('RANGE OF MOTION');
      data.rom.forEach(function(r) {
        if (r[0]) parts.push('  ' + r[0] + ' (' + (r[1]||'—') + ') Active: ' + (r[2]||'—') + '  Passive: ' + (r[3]||'—'));
      });
      parts.push('');
    }

    parts.push(dash); parts.push('COORDINATION');
    line('Finger-to-Nose : ', data.ftn);
    line('Heel-to-Shin   : ', data.hts);
    line('RAM            : ', data.ram);
    line('Tremor         : ', data.tremor);
    if (data.tremor === 'Yes') line('Tremor Type    : ', data.tremor_type);
    parts.push('');

    parts.push(dash); parts.push('SENSATION');
    line('Light Touch : ', data.lt);
    line('Pin Prick   : ', data.pp);
    line('Thermal     : ', data.thermal);
    line('Notes       : ', data.sensation_notes);
    line('Proprioception UL : ', data.prop_ul);
    line('Proprioception LL : ', data.prop_ll);
    parts.push('');

    parts.push(dash); parts.push('COGNITIVE / COMMUNICATION / OROFACIAL');
    chips('Cognitive     : ', data.cognitive);
    line('Communication : ', data.communication);
    line('Orofacial     : ', data.orofacial);
    line('Orofacial Notes: ', data.orofacial_notes);
    line('Other Findings : ', data.other_findings);
    parts.push('');

    parts.push(dash); parts.push('BALANCE');
    chips('Sitting Balance  : ', data.sit_balance);
    chips('Standing Balance : ', data.stand_balance);
    line('Notes : ', data.balance_notes);
    parts.push('');

    parts.push(dash); parts.push('MOBILITY — MRMI');
    var mrmiVals = [data.mrmi_turn, data.mrmi_lying_sit, data.mrmi_sit_balance, data.mrmi_sit_stand,
                    data.mrmi_standing, data.mrmi_transfer, data.mrmi_walk, data.mrmi_stairs];
    var mrmiTotal = 0;
    mrmiVals.forEach(function(v){ mrmiTotal += parseInt(v||0, 10); });
    parts.push('Turning:' + (data.mrmi_turn||'—') + '  Lying-Sit:' + (data.mrmi_lying_sit||'—') +
               '  Sit Bal:' + (data.mrmi_sit_balance||'—') + '  Sit-Stand:' + (data.mrmi_sit_stand||'—'));
    parts.push('Standing:' + (data.mrmi_standing||'—') + '  Transfer:' + (data.mrmi_transfer||'—') +
               '  Walking:' + (data.mrmi_walk||'—') + '  Stairs:' + (data.mrmi_stairs||'—'));
    parts.push('Total: ' + mrmiTotal + '/40');
    parts.push('');

    parts.push(dash); parts.push('GAIT');
    chips('Gait Pattern : ', data.gait_pattern);
    chips('Walking Aid  : ', data.walking_aid);
    if (data.mwt10_time) {
      var speed10 = parseFloat(data.mwt10_time) > 0 ? (10 / parseFloat(data.mwt10_time)).toFixed(2) : '—';
      parts.push('10MWT: ' + data.mwt10_time + ' sec  (' + speed10 + ' m/s)');
    }
    chips('Turning      : ', data.turning);
    line('Notes        : ', data.gait_notes);
    parts.push('');

    parts.push(dash); parts.push('OUTCOME MEASURES');
    if (data.sixmwt_dist)  parts.push('6MWT: ' + data.sixmwt_dist + ' m' +
      (data.sixmwt_pre_hr ? '  HR pre:' + data.sixmwt_pre_hr : '') +
      (data.sixmwt_post_hr ? ' post:' + data.sixmwt_post_hr : '') +
      (data.sixmwt_pre_spo2 ? '  SpO2 pre:' + data.sixmwt_pre_spo2 + '%' : '') +
      (data.sixmwt_post_spo2 ? ' post:' + data.sixmwt_post_spo2 + '%' : '') +
      (data.borg_rpe ? '  Borg:' + data.borg_rpe + '/10' : ''));
    if (data.tug_time)   parts.push('TUG  : ' + data.tug_time + ' sec' +
      (parseFloat(data.tug_time) > 13.5 ? ' ⚠ Fall risk (Stroke)' :
       parseFloat(data.tug_time) > 11.5 ? ' ⚠ Fall risk (PD)' : ''));
    if (data.berg_score) parts.push('Berg : ' + data.berg_score + '/56' +
      (parseInt(data.berg_score) < 45 ? ' ⚠ Increased fall risk' : ''));
    if (data.frt_score)  parts.push('FRT  : ' + data.frt_score + ' cm' +
      (parseFloat(data.frt_score) < 15 ? ' ⚠ High fall risk' :
       parseFloat(data.frt_score) <= 25 ? ' ⚡ Moderate fall risk' : ' ✓ Low fall risk'));
    chips('Other : ', data.other_outcomes);
    line('Notes : ', data.outcome_notes);
    parts.push('');

    parts.push(dash); parts.push("PHYSIOTHERAPIST'S IMPRESSION");
    if (data.pt_impression)    parts.push('BSF : ' + data.pt_impression);
    if (data.pt_impression_al) parts.push('AL  : ' + data.pt_impression_al);
    if (data.pt_impression_pr) parts.push('PR  : ' + data.pt_impression_pr);
    parts.push('');

    parts.push(dash); parts.push('GOALS & PLAN');
    line('STG   : ', data.stg);
    line('LTG   : ', data.ltg);
    chips('Plan  : ', data.plan);
    line('Notes : ', data.plan_notes);
    parts.push(''); parts.push(DIV);
    return parts;
  }

  function _buildMpisHand() {
    var d    = window.ActiveForm ? window.ActiveForm.collect() : {};
    var p    = d.patient || {};
    var DIV  = MPIS_DIV;
    var dash = MPIS_DASH;
    var parts = [];

    // Title + patient header (mirrors _buildMpisMs pattern)
    parts.push('HAND ASSESSMENT');
    parts.push(DIV);
    parts.push('Name  : ' + (p.name||'') + '   Date : ' + (p.date||''));
    if (p.type === 'local') {
      parts.push('IC    : ' + (p.nric||'') + '   Age  : ' + (p.age||''));
    } else {
      parts.push('Passport : ' + (p.passport||'') + '   Country : ' + (p.country||'') + '   Age : ' + (p.age||''));
      parts.push('Sex   : ' + (p.sex||''));
    }
    parts.push('');

    // ── SUBJECTIVE ──────────────────────────────────────────────────────
    parts.push(dash);
    parts.push('SUBJECTIVE ASSESSMENT');
    parts.push('');
    var mgmtLine = (d.managementType || '');
    if (d.managementType === 'Surgical' && d.surgeryDate) mgmtLine += ' — ' + d.surgeryDate;
    if (d.diagnosis)      parts.push('Diagnosis     : ' + d.diagnosis);
    if (d.referralSource) parts.push('Referral      : ' + d.referralSource);
    if (mgmtLine)         parts.push('Management    : ' + mgmtLine);
    if (d.managementType === 'Surgical' && d.surgeryType) parts.push('Surgery Type  : ' + d.surgeryType);
    if (d.problem)        parts.push('Problem       : ' + d.problem);
    if (d.sqDominantHand) parts.push('Dominant Hand : ' + d.sqDominantHand);
    parts.push('');
    if (d.hxCurrent) parts.push('Current History : ' + d.hxCurrent);
    if (d.hxPast)    parts.push('Past History    : ' + d.hxPast);
    parts.push('');
    // ── SPECIAL QUESTIONS ──
    var _hasSq = d.sqGeneralHealth || d.sqHealthNotes || d.sqPmhx || d.sqInvest ||
                 d.sqMedications || d.sqAllergies || d.sqSocial || d.sqOccupation ||
                 d.sqRec || d.sqSplinting;
    if (_hasSq) {
      parts.push('SPECIAL QUESTIONS');
      if (d.sqGeneralHealth) parts.push('General Health : ' + d.sqGeneralHealth);
      if (d.sqGeneralHealth === 'Other' && d.sqHealthNotes) parts.push('Health Notes   : ' + d.sqHealthNotes);
      if (d.sqPmhx)         parts.push('PMHx           : ' + d.sqPmhx);
      if (d.sqInvest)       parts.push('Investigations : ' + d.sqInvest);
      if (d.sqMedications)  parts.push('Medications    : ' + d.sqMedications);
      if (d.sqAllergies)    parts.push('Allergies      : ' + d.sqAllergies);
      if (d.sqSocial)       parts.push('Social         : ' + d.sqSocial);
      if (d.sqOccupation)   parts.push('Occupation     : ' + d.sqOccupation);
      if (d.sqRec)          parts.push('Recreation     : ' + d.sqRec);
      if (d.sqSplinting)    parts.push('Splinting      : ' + d.sqSplinting);
      parts.push('');
    }
    parts.push('PAIN SCORE');
    parts.push('PRE: ' + (d.painPre||'0') + '/10   POST: ' + (d.painPost||'0') + '/10');
    if (d.painNature)   parts.push('Nature       : ' + d.painNature);
    if (d.pain24hr)     parts.push('24hrs        : ' + d.pain24hr);
    if (d.painAgg)      parts.push('Aggravating  : ' + d.painAgg);
    if (d.painEase)     parts.push('Easing       : ' + d.painEase);
    if (d.irritability) parts.push('Irritability : ' + d.irritability);
    parts.push('');

    // ── OBJECTIVE ───────────────────────────────────────────────────────
    var hc      = d.handChart || {};
    var markers = hc.markers || [];
    var mm      = (d.neuro || {}).muscles || {};
    var muscleKeys   = ['deltoid','biceps','brachiorad','wristExt','wristFlex','fingerMpExt','triceps','fingerFlex','handIntrinsics'];
    var muscleLabels = { deltoid:'Deltoid', biceps:'Biceps', brachiorad:'Brachioradialis',
                         wristExt:'Wrist Extensors', wristFlex:'Wrist Flexors', fingerMpExt:'Finger MP Ext',
                         triceps:'Triceps', fingerFlex:'Finger Flexors', handIntrinsics:'Hand Intrinsics' };
    var typeLabels   = { pain:'Pain', numb:'Numbness', tingling:'Tingling', weak:'Weakness', swelling:'Swelling', scar:'Scar' };
    var hasObs  = d.observationNotes || d.woundNotes;
    var hasPalp = d.tenderness || d.temperature || d.texture || d.palpationNotes;
    var hasStr  = d.gripStrengthR || d.gripStrengthL || d.pinchLateralR || d.pinchLateralL ||
                  d.pinchPulpR || d.pinchPulpL || d.pinch3ptR || d.pinch3ptL ||
                  d.pulpOpposition || d.fpc2nd || d.fpc3rd || d.fpc4th || d.fpc5th;
    var refs    = (d.neuro || {}).reflexes || {};
    var hasRef  = ['c5','c6','c7','c8t1'].some(function(k){ var r=refs[k]||{}; return r.l||r.r; });
    var hasMMT  = muscleKeys.some(function(k) { var m = mm[k]||{}; return m.l || m.r; });
    var hasNeuro = hasRef || hasMMT;
    var hasRom  = Array.isArray(d.rom) && d.rom.length;
    var hasCirc = Array.isArray(d.circumference) && d.circumference.length;
    var hasSens = d.lightTouchR || d.lightTouchL || d.pinPrickR || d.pinPrickL ||
                  d.twoPointDiscR || d.twoPointDiscL || d.sensationNotes;
    var ot      = d.otherTests || {};
    var hasST   = (ot.tinels && (ot.tinels.r || ot.tinels.l)) ||
                  (ot.phalens && (ot.phalens.r || ot.phalens.l)) ||
                  (ot.finkelsteins && (ot.finkelsteins.r || ot.finkelsteins.l)) ||
                  (ot.fromens && (ot.fromens.r || ot.fromens.l)) ||
                  (Array.isArray(d.customSpecialTests) && d.customSpecialTests.length);
    var hasObj  = hasObs || markers.length || hasPalp || hasStr || hasNeuro ||
                  hasRom || hasCirc || hasSens || hasST;

    if (hasObj) {
      parts.push(dash);
      parts.push('OBJECTIVE ASSESSMENT');
      parts.push('');

      if (hasObs) {
        parts.push('OBSERVATION');
        if (d.observationNotes) parts.push('General : ' + d.observationNotes);
        if (d.woundNotes)       parts.push('Wound   : ' + d.woundNotes);
        parts.push('');
      }

      if (markers.length) {
        parts.push('HAND CHART');
        markers.forEach(function(m) {
          var handLbl = m.hand === 'R' ? 'Right Palmar' : 'Left Palmar';
          var typeLbl = typeLabels[m.type] || (m.type ? m.type.charAt(0).toUpperCase() + m.type.slice(1) : '');
          parts.push('#' + m.id + ' (' + typeLbl + ') - ' + handLbl);
        });
        if (hc.notes) parts.push('Notes: ' + hc.notes);
        parts.push('');
      }

      if (hasPalp) {
        parts.push('PALPATION');
        if (d.tenderness)     parts.push('Tenderness  : ' + d.tenderness);
        if (d.temperature)    parts.push('Temperature : ' + d.temperature);
        if (d.texture)        parts.push('Texture     : ' + d.texture);
        if (d.palpationNotes) parts.push('Notes       : ' + d.palpationNotes);
        parts.push('');
      }

      if (hasRom) {
        parts.push('ROM');
        d.rom.forEach(function(row) {
          var hdr = (row.category || '') + (row.movement ? ' ' + row.movement : '');
          if (hdr.trim()) parts.push(hdr);
          var als = row.active_l_start, ale = row.active_l_end,
              ars = row.active_r_start, are_ = row.active_r_end;
          if (als || ale || ars || are_)
            parts.push('Active       : L ' + (als||'') + '–' + (ale||'') + '\xb0   R ' + (ars||'') + '–' + (are_||'') + '\xb0');
          var pls = row.passive_l_start, ple = row.passive_l_end,
              prs = row.passive_r_start, pre_ = row.passive_r_end;
          if (pls || ple || prs || pre_)
            parts.push('Passive      : L ' + (pls||'') + '–' + (ple||'') + '\xb0   R ' + (prs||'') + '–' + (pre_||'') + '\xb0');
          var ols = row.op_l_start, ole = row.op_l_end,
              ors = row.op_r_start, ore_ = row.op_r_end;
          if (ols || ole || ors || ore_)
            parts.push('Overpressure : L ' + (ols||'') + '–' + (ole||'') + '\xb0   R ' + (ors||'') + '–' + (ore_||'') + '\xb0');
        });
        parts.push('');
      }

      if (hasStr) {
        parts.push('STRENGTH');
        parts.push('Grip (R/L)    : ' + (d.gripStrengthR||'—') + ' / ' + (d.gripStrengthL||'—') + ' kg');
        parts.push('Pinch Lateral : ' + (d.pinchLateralR||'—') + ' / ' + (d.pinchLateralL||'—') + ' kg');
        parts.push('Pinch Pulp    : ' + (d.pinchPulpR||'—')    + ' / ' + (d.pinchPulpL||'—')    + ' kg');
        parts.push('Pinch 3-point : ' + (d.pinch3ptR||'—')     + ' / ' + (d.pinch3ptL||'—')     + ' kg');
        if (d.pulpOpposition) parts.push('Pulp Opposition : ' + d.pulpOpposition);
        if (d.fpc2nd)         parts.push('FPC 2nd Finger  : ' + d.fpc2nd);
        if (d.fpc3rd)         parts.push('FPC 3rd Finger  : ' + d.fpc3rd);
        if (d.fpc4th)         parts.push('FPC 4th Finger  : ' + d.fpc4th);
        if (d.fpc5th)         parts.push('FPC 5th Finger  : ' + d.fpc5th);
        parts.push('');
      }

      if (hasCirc) {
        parts.push('CIRCUMFERENCE');
        d.circumference.forEach(function(row) {
          if (!row.left_cm && !row.right_cm) return;
          var loc = row.location || '';
          var pad = new Array(Math.max(1, 14 - loc.length) + 1).join(' ');
          parts.push(loc + pad + ': L ' + (row.left_cm||'') + ' cm   R ' + (row.right_cm||'') + ' cm');
        });
        parts.push('');
      }

      if (hasSens) {
        parts.push('SENSATION');
        if (d.lightTouchL || d.lightTouchR)
          parts.push('Light Touch     : L ' + (d.lightTouchL||'') + '   R ' + (d.lightTouchR||''));
        if (d.pinPrickL || d.pinPrickR)
          parts.push('Pin Prick       : L ' + (d.pinPrickL||'') + '   R ' + (d.pinPrickR||''));
        if (d.twoPointDiscL || d.twoPointDiscR)
          parts.push('Two-point Disc. : L ' + (d.twoPointDiscL||'') + '   R ' + (d.twoPointDiscR||''));
        if (d.sensationNotes)
          parts.push('Notes           : ' + d.sensationNotes);
        parts.push('');
      }

      if (hasST) {
        parts.push('SPECIAL TESTS');
        var stLabels = { tinels: "Tinel's      ", phalens: "Phalen's     ",
                         finkelsteins: "Finkelstein's", fromens: "Froment's    " };
        ['tinels','phalens','finkelsteins','fromens'].forEach(function(k) {
          var t = ot[k] || {};
          if (!t.r && !t.l) return;
          parts.push(stLabels[k] + ' : L ' + (t.l||'') + '   R ' + (t.r||''));
        });
        if (Array.isArray(d.customSpecialTests)) {
          d.customSpecialTests.forEach(function(t) {
            if (!t.name || (!t.r && !t.l)) return;
            parts.push(t.name + ' : L ' + (t.l||'') + '   R ' + (t.r||''));
          });
        }
        parts.push('');
      }

      if (hasNeuro) {
        parts.push('NEUROLOGICAL TEST');
        if (hasRef) {
          parts.push('Reflexes:');
          var refLabels = { c5: 'C5', c6: 'C6', c7: 'C7', c8t1: 'C8/T1' };
          ['c5','c6','c7','c8t1'].forEach(function(k) {
            var r = refs[k] || {};
            if (!r.l && !r.r) return;
            var lbl = refLabels[k];
            var pad = new Array(Math.max(1, 6 - lbl.length) + 1).join(' ');
            parts.push('  ' + lbl + pad + ': L ' + (r.l||'—') + '   R ' + (r.r||'—'));
          });
        }
        if (hasMMT) {
          parts.push('MMT:');
          muscleKeys.forEach(function(k) {
            var m = mm[k] || {};
            if (!m.l && !m.r) return;
            var lbl = muscleLabels[k];
            var pad = new Array(Math.max(1, 17 - lbl.length) + 1).join(' ');
            parts.push(lbl + pad + ': L: ' + (m.l||'—') + '  R: ' + (m.r||'—'));
          });
        }
        parts.push('');
      }
    }

    // ── ANALYSIS ────────────────────────────────────────────────────────
    if (d.ptImpression) {
      parts.push(dash);
      parts.push('ANALYSIS');
      parts.push('');
      parts.push(d.ptImpression);
      parts.push('');
    }

    // ── PLAN ────────────────────────────────────────────────────────────
    if (d.stg || d.ltg) {
      parts.push(dash);
      parts.push('PLAN');
      parts.push('');
      if (d.stg) parts.push('Short-term Goals: ' + d.stg);
      if (d.ltg) parts.push('Long-term Goals : ' + d.ltg);
      parts.push('');
    }

    // ── INTERVENTION ────────────────────────────────────────────────────
    if (d.plan) {
      parts.push(dash);
      parts.push('INTERVENTION');
      parts.push('');
      parts.push(d.plan);
      parts.push('');
    }

    return parts;
  }

  // ── MPIS session header modal ──────────────────
  function showMpisHeaderModal() {
    return new Promise(function(resolve) {
      _mpisModalResolve = resolve;
      var now   = new Date();
      var yyyy  = now.getFullYear();
      var mm    = String(now.getMonth() + 1).padStart(2, '0');
      var dd    = String(now.getDate()).padStart(2, '0');
      var el    = document.getElementById('mpis-tarikh');
      if (el) el.value = yyyy + '-' + mm + '-' + dd;
      // Pre-fill Temujanji from patient panel next-appt fields (set by initFormContext)
      var ppDate = document.getElementById('pp-appt-date');
      var ppTime = document.getElementById('pp-appt-time');
      var apptDate = document.getElementById('mpis-appt-date');
      var apptTime = document.getElementById('mpis-appt-time');
      if (apptDate && ppDate && ppDate.value) apptDate.value = ppDate.value;
      if (apptTime && ppTime && ppTime.value) apptTime.value = ppTime.value;
      var overlay = document.getElementById('mpis-overlay');
      var modal   = document.getElementById('mpis-modal');
      if (overlay) overlay.classList.add('show');
      if (modal)   modal.classList.add('show');
      var qEl = document.getElementById('mpis-queue');
      if (qEl) setTimeout(function(){ qEl.focus(); }, 60);
    });
  }

  function cancelMpisModal() {
    var overlay = document.getElementById('mpis-overlay');
    var modal   = document.getElementById('mpis-modal');
    if (overlay) overlay.classList.remove('show');
    if (modal)   modal.classList.remove('show');
    if (_mpisModalResolve) { _mpisModalResolve(null); _mpisModalResolve = null; }
  }

  function confirmMpisModal() {
    var header = {
      tarikh:       (document.getElementById('mpis-tarikh')    || {}).value || '',
      queueNo:      (document.getElementById('mpis-queue')     || {}).value || '',
      kpi30:        (document.getElementById('mpis-kpi')       || {}).value || '',
      seenBy:       (document.getElementById('mpis-seen-by')   || {}).value || '',
      nextAppt:     (document.getElementById('mpis-appt-date') || {}).value || '',
      nextApptTime: (document.getElementById('mpis-appt-time') || {}).value || '',
    };
    var overlay = document.getElementById('mpis-overlay');
    var modal   = document.getElementById('mpis-modal');
    if (overlay) overlay.classList.remove('show');
    if (modal)   modal.classList.remove('show');
    if (_mpisModalResolve) { _mpisModalResolve(header); _mpisModalResolve = null; }
  }

  async function _doCopyMpis(parts, header) {
    var LN   = MPIS_LN;
    var DIV  = MPIS_DIV;
    var dash = MPIS_DASH;
    var out  = [];
    if (header) {
      if (header.tarikh)  out.push('TARIKH : ' + header.tarikh);
      if (header.queueNo) out.push('NOMBOR GILIRAN : ' + header.queueNo);
      if (header.kpi30)   out.push('KPI-SS-30 MINIT : ' + header.kpi30);
      if (header.seenBy)  out.push('DILIHAT : ' + header.seenBy);
      out.push(DIV);
    }
    out = out.concat(parts);
    if (header && (header.nextAppt || header.nextApptTime)) {
      out.push(dash);
      out.push('TEMUJANJI');
      if (header.nextAppt)     out.push('Tarikh : ' + header.nextAppt);
      if (header.nextApptTime) out.push('Masa   : ' + header.nextApptTime);
    }
    out.push(DIV);
    out.push('Generated by PT Assessment System');
    await copyText(out.join(LN));
  }

  function getCurrentFormType() {
    try {
      var d = window.ActiveForm && window.ActiveForm.collect(currentId);
      return ((d && (d._form_type || (d.meta && d.meta.form))) || 'MS').toUpperCase();
    } catch(e) { return 'MS'; }
  }

  // ── Patient panel ─────────────────────────────
  function openPatientPanel() {
    if (!_panelEpisodeId || !_panelPatientData) return;
    var p   = _panelPatientData;
    var ep  = _panelEpisodeId;

    // Avatar initials
    var initials = (p.name || '?').split(' ')
      .map(function(w){ return w[0]; }).slice(0,2).join('').toUpperCase();
    var avEl = document.getElementById('pp-avatar');
    if (avEl) avEl.textContent = initials;

    // Name + badge
    var nmEl = document.getElementById('pp-name');
    if (nmEl) nmEl.textContent = p.name || '—';
    var bdEl = document.getElementById('pp-badge');
    if (bdEl) bdEl.textContent = p.pt_type === 'foreign' ? 'Foreign Patient' : 'Malaysian';

    // Info grid
    var icEl = document.getElementById('pp-ic');
    if (icEl) icEl.textContent = p.ic || p.passport || '—';
    var dobEl = document.getElementById('pp-dob');
    if (dobEl) dobEl.textContent = p.dob || '—';
    var asEl = document.getElementById('pp-age-sex');
    if (asEl) {
      var age = p.age || '';
      var sex = p.sex === 'M' ? 'Male' : p.sex === 'F' ? 'Female' : '';
      asEl.textContent = [age ? age + 'y' : '', sex].filter(Boolean).join(' · ') || '—';
    }

    // Last visit — fetch latest SOAP note date
    var lvEl = document.getElementById('pp-last-visit');
    if (lvEl) {
      lvEl.textContent = '…';
      fetch('/api/episodes/' + ep + '/soap')
        .then(function(r){ return r.json(); })
        .then(function(soaps){
          if (soaps && soaps.length) {
            lvEl.textContent = soaps[soaps.length - 1].note_date || '—';
          } else {
            lvEl.textContent = _panelAssessDate || 'No visits yet';
          }
        })
        .catch(function(){ lvEl.textContent = '—'; });
    }

    // Next appt inputs
    fetch('/api/episodes/' + ep)
      .then(function(r){ return r.json(); })
      .then(function(episode){
        var dateEl = document.getElementById('pp-appt-date');
        var timeEl = document.getElementById('pp-appt-time');
        var saveEl = document.getElementById('pp-appt-save');
        if (dateEl) dateEl.value = episode.next_appt || '';
        if (timeEl) timeEl.value = episode.next_appt_time || '';
        if (saveEl) saveEl.style.display = 'none';
      })
      .catch(function(){ console.warn('Patient panel: episode fetch failed'); });

    // Action buttons
    var editBtn = document.getElementById('pp-edit-btn');
    if (editBtn) editBtn.onclick = function() {
      window.location.href = '/?patient_id=' + (_panelPatientId || '');
    };
    var histBtn = document.getElementById('pp-history-btn');
    if (histBtn) histBtn.onclick = function() {
      window.location.href = '/episode/' + ep;
    };

    // Show panel
    var overlay = document.getElementById('pt-panel-overlay');
    var panel   = document.getElementById('pt-panel');
    if (overlay) overlay.classList.add('open');
    if (panel)   panel.classList.add('open');
  }

  function closePatientPanel() {
    var overlay = document.getElementById('pt-panel-overlay');
    var panel   = document.getElementById('pt-panel');
    if (overlay) overlay.classList.remove('open');
    if (panel)   panel.classList.remove('open');
  }

  function saveNextAppt() {
    var dateEl = document.getElementById('pp-appt-date');
    var timeEl = document.getElementById('pp-appt-time');
    var saveEl = document.getElementById('pp-appt-save');
    if (!dateEl || !_panelEpisodeId) return;
    var apptDate = dateEl.value;
    var apptTime = timeEl ? timeEl.value : '';
    fetch('/api/episodes/' + _panelEpisodeId + '/appt', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ next_appt: apptDate, next_appt_time: apptTime })
    })
    .then(function(r){ return r.json(); })
    .then(function(res){
      if (res.ok) {
        var apptSpan = document.querySelector('#pt-context-chip .patient-chip-appt');
        var label    = _formatAppt(apptDate, apptTime);
        if (apptSpan) apptSpan.textContent = label ? ' · ' + label : '';
        if (saveEl) saveEl.style.display = 'none';
        showToast('Appointment saved', 'ok');
      } else {
        showToast('Save failed', 'err');
      }
    })
    .catch(function(){ showToast('Save failed', 'err'); });
  }

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closePatientPanel();
  });

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
    getCurrentId:       function() { return currentId; },
    getCurrentFormType: getCurrentFormType,
    setCurrentId:   function(id) { currentId = id; },
    clearDirty:     function() { isDirty = false; },
    get isDirty()   { return isDirty; },
    copyToMpisAuto:           copyToMpisAuto,
    toggleDark:     toggleDark,
    openPatientPanel:  openPatientPanel,
    closePatientPanel: closePatientPanel,
    saveNextAppt:      saveNextAppt,
    cancelMpisModal:   cancelMpisModal,
    confirmMpisModal:  confirmMpisModal
  };

})();

document.addEventListener('DOMContentLoaded', function () {
  Main.init();
});
