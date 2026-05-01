# Patient Window Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the app patient-oriented — accordion-collapse the home stats when a patient is selected, and add a patient chip + slide-in panel to every assessment form showing name, next appointment, and inline-editable appointment time.

**Architecture:** Four coordinated changes: (1) home screen stats accordion, (2) new `next_appt`/`next_appt_time` columns on `episodes` + PATCH API, (3) patient chip injected into the topbar by `initFormContext()`, (4) slide-in panel HTML in `base.html` + panel logic in `main.js`. No new pages, no new routes beyond the PATCH endpoint.

**Tech Stack:** Flask, SQLite, vanilla JS (ES5 IIFE pattern), CSS transitions.

---

## File Map

| File | Change |
|------|--------|
| `database.py` | Migration + `update_episode_appt()` |
| `app.py` | `PATCH /api/episodes/<id>/appt` route + import |
| `templates/home.html` | Stats accordion CSS + JS + URL param auto-open |
| `templates/base.html` | `#pt-panel` + `#pt-panel-overlay` markup |
| `static/css/style.css` | `.pt-chip`, `#pt-panel`, `#pt-panel-overlay` styles |
| `static/js/main.js` | Chip injection in `initFormContext()` + panel open/close/save logic |

---

## Task 1: DB migration + `update_episode_appt()`

**Files:**
- Modify: `database.py`

- [ ] **Step 1: Add migration to `init_db()`**

Find the existing safe-migration block in `init_db()` (uses `try/except sqlite3.OperationalError`). Add two new migrations for the episodes table right after the existing `discharge_reason` migration block:

```python
# After the existing discharge_reason migration, add:
for col_def in [
    ("next_appt",      "TEXT DEFAULT ''"),
    ("next_appt_time", "TEXT DEFAULT ''"),
]:
    try:
        conn.execute(f"ALTER TABLE episodes ADD COLUMN {col_def[0]} {col_def[1]}")
    except sqlite3.OperationalError:
        pass
```

- [ ] **Step 2: Add `update_episode_appt()` function**

Add immediately after `update_episode_status()` in `database.py`:

```python
def update_episode_appt(db_path, episode_id, next_appt, next_appt_time):
    now  = datetime.now().isoformat(timespec='seconds')
    conn = get_conn(db_path)
    try:
        conn.execute(
            'UPDATE episodes SET next_appt=?, next_appt_time=?, updated_at=? WHERE id=?',
            (next_appt or '', next_appt_time or '', now, episode_id)
        )
        conn.commit()
        return True, None
    except Exception as e:
        return False, str(e)
    finally:
        conn.close()
```

- [ ] **Step 3: Verify no import errors**

Run: `python -c "import database; print('OK')"` from `PT_Assessment/` folder.

Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add database.py
git commit -m "feat: add next_appt/next_appt_time to episodes table + update_episode_appt()"
```

---

## Task 2: PATCH API endpoint

**Files:**
- Modify: `app.py`

- [ ] **Step 1: Add `update_episode_appt` to import**

Find the existing import line at the top of `app.py`:
```python
    create_episode, get_patient_episodes, get_episode, update_episode_status,
```
Change it to:
```python
    create_episode, get_patient_episodes, get_episode, update_episode_status,
    update_episode_appt,
```

- [ ] **Step 2: Add the PATCH route**

Add immediately after the existing `PUT /api/episodes/<id>/status` route (around line 213):

```python
@app.route('/api/episodes/<int:episode_id>/appt', methods=['PATCH'])
def api_update_episode_appt(episode_id):
    data = request.get_json(silent=True) or {}
    ok, err = update_episode_appt(
        DB_PATH, episode_id,
        data.get('next_appt', ''),
        data.get('next_appt_time', '')
    )
    if not ok:
        return jsonify({'error': err}), 500
    return jsonify({
        'ok': True,
        'next_appt':      data.get('next_appt', ''),
        'next_appt_time': data.get('next_appt_time', '')
    })
```

- [ ] **Step 3: Smoke test the endpoint**

Start `python app.py`, then in a second terminal:

```bash
curl -s -X PATCH http://localhost:5000/api/episodes/1/appt \
  -H "Content-Type: application/json" \
  -d "{\"next_appt\":\"2026-05-10\",\"next_appt_time\":\"09:30\"}"
```

Expected: `{"ok": true, "next_appt": "2026-05-10", "next_appt_time": "09:30"}`

(Use episode ID 1 or any valid ID in your dev DB. If it returns 500, confirm the migration ran — restart Flask so `init_db()` fires.)

- [ ] **Step 4: Commit**

```bash
git add app.py
git commit -m "feat: PATCH /api/episodes/<id>/appt — update next appointment"
```

---

## Task 3: Home screen stats accordion

**Files:**
- Modify: `templates/home.html`

- [ ] **Step 1: Add accordion CSS to home.html `<style>` block**

Inside the `<style>` block at the top of `home.html`, add after the existing `.stat-sub` rule:

```css
/* ── Stats accordion ── */
#stats-row {
  overflow: hidden;
  transition: max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1),
              opacity     0.3s ease,
              margin-bottom 0.4s ease;
  max-height: 200px;
}
#stats-row.stats-collapsed {
  max-height: 0 !important;
  opacity: 0;
  margin-bottom: 0;
}
```

- [ ] **Step 2: Add `collapseStats()` and `expandStats()` JS functions**

Find the `<script>` block near the bottom of `home.html` that contains `openPatient()` and `showList()`. Add these two functions before `openPatient()`:

```js
function collapseStats() {
  var el = document.getElementById('stats-row');
  if (el) el.classList.add('stats-collapsed');
}

function expandStats() {
  var el = document.getElementById('stats-row');
  if (el) el.classList.remove('stats-collapsed');
}
```

- [ ] **Step 3: Wire `collapseStats()` into `openPatient()`**

Find the `openPatient()` function. Immediately before the two view-switch lines at the end:
```js
    document.getElementById('list-view').style.display = 'none';
    document.getElementById('detail-view').classList.add('open');
```
Add `collapseStats();` before them:
```js
    collapseStats();
    document.getElementById('list-view').style.display = 'none';
    document.getElementById('detail-view').classList.add('open');
```

- [ ] **Step 4: Wire `expandStats()` into `showList()`**

Find the `showList()` function. Add `expandStats();` as the first line inside it:
```js
function showList() {
  expandStats();
  currentPatientId = null;
  document.getElementById('detail-view').classList.remove('open');
  document.getElementById('list-view').style.display = 'block';
  doSearch(document.getElementById('search-input').value);
}
```

- [ ] **Step 5: Add URL-param auto-open**

Find the DOMContentLoaded listener that loads stats (`loadStats()`). After `loadStats()`, add:

```js
// Auto-open patient if ?patient_id=X in URL (e.g. from panel "Edit Patient" button)
(function() {
  var params = new URLSearchParams(window.location.search);
  var pid    = parseInt(params.get('patient_id'));
  if (pid) openPatient(pid);
})();
```

- [ ] **Step 6: Manual test**

Start `python app.py`, open `http://localhost:5000/`.
- Click any patient → stats row should accordion-collapse upward (400ms smooth).
- Click "← All Patients" → stats row should expand back.
- Navigate to `http://localhost:5000/?patient_id=1` (or valid ID) → patient detail should open automatically.

- [ ] **Step 7: Commit**

```bash
git add templates/home.html
git commit -m "feat: stats accordion collapses when patient selected, auto-open from URL param"
```

---

## Task 4: Panel HTML in base.html

**Files:**
- Modify: `templates/base.html`

- [ ] **Step 1: Add panel markup before `</body>`**

In `base.html`, find the closing `</body>` tag. Add the patient panel HTML immediately before it (after the last `</script>` block):

```html
<!-- ── Patient Context Panel ──────────────────────── -->
<div id="pt-panel-overlay" onclick="if(typeof Main!=='undefined')Main.closePatientPanel()"></div>
<div id="pt-panel" role="dialog" aria-label="Patient details">
  <button class="pt-panel-close" onclick="if(typeof Main!=='undefined')Main.closePatientPanel()">&#x2715;</button>

  <div class="pt-panel-header">
    <div class="pt-panel-avatar" id="pp-avatar"></div>
    <div>
      <div class="pt-panel-name" id="pp-name"></div>
      <div class="pt-panel-badge" id="pp-badge"></div>
    </div>
  </div>

  <div class="pt-panel-grid">
    <div class="pt-panel-item">
      <div class="pt-panel-label">NRIC / Passport</div>
      <div class="pt-panel-value" id="pp-ic">—</div>
    </div>
    <div class="pt-panel-item">
      <div class="pt-panel-label">Date of Birth</div>
      <div class="pt-panel-value" id="pp-dob">—</div>
    </div>
    <div class="pt-panel-item">
      <div class="pt-panel-label">Age / Sex</div>
      <div class="pt-panel-value" id="pp-age-sex">—</div>
    </div>
    <div class="pt-panel-item">
      <div class="pt-panel-label">Last Visit</div>
      <div class="pt-panel-value" id="pp-last-visit">—</div>
    </div>
  </div>

  <div class="pt-panel-appt-section">
    <div class="pt-panel-label">Next Appointment</div>
    <div class="pt-panel-appt-row">
      <input type="date" id="pp-appt-date" class="pt-panel-input" oninput="document.getElementById('pp-appt-save').style.display='inline-flex'">
      <input type="time" id="pp-appt-time" class="pt-panel-input" oninput="document.getElementById('pp-appt-save').style.display='inline-flex'">
      <button id="pp-appt-save" class="pt-panel-save-btn" style="display:none"
        onclick="if(typeof Main!=='undefined')Main.saveNextAppt()">&#10003;</button>
    </div>
  </div>

  <div class="pt-panel-actions">
    <button class="pt-panel-action-btn" id="pp-edit-btn">&#9998; Edit Patient</button>
    <button class="pt-panel-action-btn" id="pp-history-btn">&#128203; Episode History</button>
  </div>
</div>
```

- [ ] **Step 2: Verify the HTML renders without error**

Start `python app.py`, open any form page (e.g. `/form/ms`). Open browser DevTools → Elements. Confirm `#pt-panel` and `#pt-panel-overlay` exist in the DOM and are not visible.

- [ ] **Step 3: Commit**

```bash
git add templates/base.html
git commit -m "feat: add patient panel + overlay markup to base.html"
```

---

## Task 5: CSS — chip, panel, overlay, accordion

**Files:**
- Modify: `static/css/style.css`

- [ ] **Step 1: Add all new styles**

Find the end of the existing `.tbtn` button section in `style.css`. Add the following block after it:

```css
/* ══ PATIENT CONTEXT CHIP (topbar) ═══════════════ */
.pt-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px 4px 4px;
  border: 1.5px solid rgba(255,255,255,0.25);
  border-radius: 20px;
  background: rgba(255,255,255,0.12);
  color: #fff;
  font-family: inherit;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
  white-space: nowrap;
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pt-chip:hover { background: rgba(255,255,255,0.22); }
.pt-chip-avatar {
  width: 22px; height: 22px;
  border-radius: 50%;
  background: rgba(255,255,255,0.3);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  flex-shrink: 0;
}
.pt-chip-appt { color: rgba(255,255,255,0.7); }

/* ══ PATIENT PANEL OVERLAY ════════════════════════ */
#pt-panel-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.35);
  z-index: 900;
}
#pt-panel-overlay.open { display: block; }

/* ══ PATIENT PANEL ════════════════════════════════ */
#pt-panel {
  position: fixed;
  top: 0; right: 0;
  width: 280px;
  height: 100%;
  background: var(--surface);
  border-left: 1px solid var(--border);
  box-shadow: -4px 0 24px rgba(0,0,0,0.18);
  z-index: 901;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px 16px 16px;
  transform: translateX(100%);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow-y: auto;
}
#pt-panel.open { transform: translateX(0); }

.pt-panel-close {
  position: absolute;
  top: 12px; right: 12px;
  background: none;
  border: none;
  font-size: 16px;
  color: var(--text-faint);
  cursor: pointer;
  line-height: 1;
  padding: 4px;
}
.pt-panel-close:hover { color: var(--text); }

.pt-panel-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-right: 24px;
}
.pt-panel-avatar {
  width: 44px; height: 44px;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 700;
  flex-shrink: 0;
}
.pt-panel-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  line-height: 1.3;
}
.pt-panel-badge {
  font-size: 10px;
  color: var(--text-muted);
  margin-top: 2px;
}

.pt-panel-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.pt-panel-item {
  background: var(--surface2);
  border-radius: var(--radius);
  padding: 8px 10px;
}
.pt-panel-label {
  font-size: 9px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-faint);
  margin-bottom: 3px;
}
.pt-panel-value {
  font-size: 12px;
  color: var(--text);
  font-weight: 500;
}

.pt-panel-appt-section {
  border-top: 1px solid var(--border);
  padding-top: 14px;
}
.pt-panel-appt-row {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-top: 6px;
}
.pt-panel-input {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  font-family: inherit;
  font-size: 12px;
  background: var(--surface2);
  color: var(--text);
  outline: none;
  min-width: 0;
}
.pt-panel-input:focus { border-color: var(--accent-mid); }
.pt-panel-save-btn {
  width: 30px; height: 30px;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  border: none;
  cursor: pointer;
  font-size: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.pt-panel-save-btn:hover { opacity: 0.85; }

.pt-panel-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: auto;
  border-top: 1px solid var(--border);
  padding-top: 14px;
}
.pt-panel-action-btn {
  width: 100%;
  padding: 8px 12px;
  text-align: left;
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  font-family: inherit;
  font-size: 12px;
  color: var(--text);
  cursor: pointer;
  transition: background 0.12s;
}
.pt-panel-action-btn:hover { background: var(--accent-light); color: var(--accent); }

/* Dark mode overrides */
body.dark .pt-panel-input { background: var(--surface); }
body.dark .pt-panel-save-btn { background: var(--accent-mid); }
```

- [ ] **Step 2: Verify no visible regressions**

Open any form page. Confirm existing styles are unchanged (topbar, sidebar, form fields). Panel and overlay should not be visible.

- [ ] **Step 3: Commit**

```bash
git add static/css/style.css
git commit -m "feat: add patient chip, panel, overlay CSS"
```

---

## Task 6: main.js — chip injection + panel logic

**Files:**
- Modify: `static/js/main.js`

This is the largest task. Add all new code **inside the existing `Main` IIFE**, before the `return` statement.

- [ ] **Step 1: Add module-level panel state variables**

Find the top of the `Main` IIFE (right after `var Main = (function() {`). Add these variables alongside the existing ones like `currentId`, `isDirty`, etc.:

```js
var _panelEpisodeId = null;
var _panelPatientId = null;
var _panelPatientData = null;  // { name, ic, passport, dob, sex, pt_type, age }
```

- [ ] **Step 2: Add `_formatAppt()` helper**

Add near the top of the Main IIFE, alongside other helpers like `escapeHtml`:

```js
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
```

- [ ] **Step 3: Add `openPatientPanel()`, `closePatientPanel()`, `saveNextAppt()`**

Add these three functions before the `return` statement:

```js
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
    });

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
      // Update chip label
      var apptSpan = document.querySelector('#pt-context-chip .pt-chip-appt');
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
```

- [ ] **Step 4: Add Escape key listener**

Add once, alongside the existing DOMContentLoaded listener pattern (or inside `init()`):

```js
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') closePatientPanel();
});
```

- [ ] **Step 5: Wire chip injection into `initFormContext()`**

Find `initFormContext()` in `main.js`. Find the patient prefill `try` block:
```js
var p = JSON.parse(ptScript.textContent);
// ... all the sv() calls ...
updateProgress();
```
After `updateProgress();` and before the closing `} catch(e)`, save patient data to the panel variables:
```js
_panelPatientData = p;
```

Then, still inside `initFormContext()`, find the `if (episodeId && window.ActiveForm)` block. After the entire fetch/auto-load block, add the chip injection:

```js
// ── 2b. Patient chip injection ───────────────────────────────────
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
      chip.className = 'pt-chip';
      chip.id        = 'pt-context-chip';
      chip.innerHTML =
        '<span class="pt-chip-avatar">' + escapeHtml(initials) + '</span>' +
        '<span class="pt-chip-name">' + escapeHtml(name) + '</span>' +
        (apptLabel
          ? '<span class="pt-chip-appt"> &middot; ' + escapeHtml(apptLabel) + '</span>'
          : '');
      chip.onclick = openPatientPanel;

      var navGroup = document.getElementById('topbar-nav-group');
      if (navGroup) navGroup.insertBefore(chip, navGroup.firstChild);

      // Show nav separator
      var navSep = document.getElementById('topbar-nav-sep');
      if (navSep) navSep.style.display = '';
    })
    .catch(function(e){ console.warn('Patient chip fetch failed:', e); });
}
```

Also: inside the auto-load `.then(function(data)` block (where `window.ActiveForm.populate(data)` is called), store the assessment date for the "Last Visit" fallback:

```js
// After: window.ActiveForm.populate(data);
if (data && data.patient) {
  _panelAssessDate = data.patient.date || '';
}
```

Add `var _panelAssessDate = null;` alongside the other panel variables in Step 1.

- [ ] **Step 6: Export new functions from Main IIFE**

Find the `return { ... }` statement at the bottom of the Main IIFE. Add the new functions:

```js
closePatientPanel: closePatientPanel,
saveNextAppt:      saveNextAppt,
```

(`openPatientPanel` is called only from the chip onclick — no need to export it publicly, but add it too for completeness: `openPatientPanel: openPatientPanel`)

- [ ] **Step 7: Syntax check**

```bash
node --check static/js/main.js
```

Expected: no output (silent = pass). Fix any errors before continuing.

- [ ] **Step 8: Manual test**

Start `python app.py`. Navigate to any patient → open an episode → open a form.

Verify:
1. Patient chip appears at left of topbar actions: `[Initials] Patient Name`  (or `· DD Mon HH:MM` if next_appt set)
2. Click chip → panel slides in from right, overlay dims form
3. Panel shows: correct name, NRIC, DOB, age/sex, last visit (or "No visits yet")
4. Next appt inputs are present. Enter a date + time → ✓ button appears → click it → chip label updates → toast shows "Appointment saved"
5. Press Escape → panel closes
6. Click "Episode History" → navigates to `/episode/<id>`
7. Click "Edit Patient" → navigates to `/?patient_id=<id>` and auto-opens that patient

- [ ] **Step 9: Commit**

```bash
git add static/js/main.js
git commit -m "feat: patient chip in topbar + slide-in panel with editable next appointment"
```

---

## Task 7: Final smoke test + push

- [ ] **Step 1: Full end-to-end smoke test**

Start `python app.py`. Test the following scenarios:

**Home screen:**
- Open `/`. Stats dashboard visible.
- Click any patient → stats accordion-collapse (smooth, ~400ms).
- Click "← All Patients" → stats expand back.
- Navigate to `/?patient_id=1` (use valid ID) → patient detail auto-opens.

**Form + panel:**
- From home, click a patient → click an episode → opens a form.
- Patient chip visible in topbar with name.
- Click chip → panel opens, correct patient info shown.
- Set a next appointment date + time → save → chip updates → reopen panel → correct value persists (reload form to confirm DB persisted).
- Escape closes panel.
- "Episode History" button navigates to episode page.
- "Edit Patient" navigates to home with patient pre-selected.

**Existing features (no regressions):**
- Save Record still works on all forms.
- Export KKM PDF still works.
- Copy to MPIS still works.
- Dark mode toggle still works.
- NRIC fields are still locked (readonly) in episode context.

- [ ] **Step 2: Build exe (if smoke test passes)**

```bash
build.bat
```

Expected: `dist/PT_Assessment.exe` created with no errors.

- [ ] **Step 3: Push**

```bash
git add -A
git commit -m "feat: patient window — stats accordion + topbar chip + slide-in panel"
git push
```
