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
    getCurrentId:   function() { return currentId; }
  };

})();

document.addEventListener('DOMContentLoaded', function () {
  Main.init();
});
