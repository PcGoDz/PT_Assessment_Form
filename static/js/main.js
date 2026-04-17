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
    var checks = [
      document.getElementById('pt-name').value.trim(),
      document.getElementById('pt-date').value.trim(),
      (document.getElementById('pt-nric').value.trim() ||
       document.getElementById('pt-passport').value.trim()),
      document.getElementById('pt-diagnosis').value.trim(),
      document.getElementById('hx-current').value.trim(),
      document.getElementById('obs-general').value.trim(),
      BodyChart.getData().length > 0 ? '1' : ''
    ];
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
      var data = Form.collect(currentId);
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
      Form.reset();
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
      var data = Form.collect(currentId);
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
      Form.reset();
      currentId = data.id || id;
      Form.populate(data);
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
        var data = Form.collect(currentId);
        var j    = await API.saveRecord(data);
        currentId = j.id;
        showToast('Saved — ready for next patient', 'ok');
        loadRecordsList();
      } catch (e) {
        if (!confirm('Auto-save failed: ' + e.message + '\n\nClear anyway?')) return;
      }
    }
    Form.reset();
    currentId = null;
    markClean();
    updateProgress();
  }

  // ── Clear — wipe only, confirm first ──────────
  function clearForm(silent) {
    if (!silent && !confirm('Clear all fields without saving?')) return;
    Form.reset();
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
  function init() {
    BodyChart.init();
    MovementTable.init();

    document.getElementById('pt-date').value = new Date().toISOString().split('T')[0];

    var localRadio = document.querySelector('[name=pt-type][value=local]');
    if (localRadio) localRadio.checked = true;
    var noRadio = document.querySelector('[name=pacemaker][value=No]');
    if (noRadio) noRadio.checked = true;

    Form.onPtTypeChange();
    loadRecordsList();
    updateProgress();
    setupDirtyWarning();
    checkForDraft();

    document.querySelector('.main').addEventListener('input', function () {
      markDirty();
      updateProgress();
    });
  }

  // ── Copy to clipboard (MPIS plain text) ──────────
  async function copyToMpis() {
    var data = Form.collect(currentId);
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
        var data = Form.collect(currentId);
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
    copyToMpis:     copyToMpis
  };

})();

document.addEventListener('DOMContentLoaded', function () {
  Main.init();
});
