# NCD Form — Implementation Plan B (Per-Visit Measurements + Trend)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the NCD-only per-visit machinery on top of the shipped Plan A snapshot form: a new `ncd_measurements` table (v3 migration), DB functions + Flask routes mirroring `soap_notes`, an NCD-only measurements panel **injected additively into the shared SOAP modal**, an auto-written `session_no=1` row on initial-form save, and a new **screen-only trend page** (infographic table + inline-SVG sparklines) that never touches PDF or MPIS.

**Architecture:** NCD is the only form that breaks "one record per episode" (spec §0). The numeric battery (vitals/bodycomp/fitness — the SAME fields Plan A already collects in sections 04–06) is also captured per-visit into `ncd_measurements`, one JSON-blob row per visit, auto-numbered `session_no` exactly like `soap_notes`. The trend page reads the ordered series and renders deltas. **The highest-risk surface is the shared SOAP modal in `episode.html`, used by all 15 forms** — the injection is additive and form-type-guarded, never a restructure (RED LINE).

**Tech Stack:** Flask + SQLite + vanilla JS. Sparklines = inline SVG polylines (no chart lib). No new dependencies. No PDF/MPIS involvement (D1).

**Source of truth:** `docs/superpowers/specs/2026-06-24-ncd-form-design.md` §5–6 (D1–D3, D7, D10). HOW only.

**Depends on:** Plan A merged (NCD form shipped, `form_type='NCD'` episodes exist, `collect()` battery fields stable).

---

## Resolved §11 decisions (plan author's calls, against live code)

1. **`ncd_measurements` = JSON blob, not typed columns.** Live `records.data_json` and `soap_notes` patterns both use `json.dumps`/`json.loads` (database.py `save_record`/`save_soap`). The trend reads the whole series and computes deltas in JS anyway. JSON blob keeps the schema stable if the battery changes. (Spec rec, confirmed.)
2. **Two sequential fetches, NOT one combined endpoint.** `save_soap` (database.py:692) and the `POST /soap` route (app.py:243) + `saveSoap()` (episode.html:678) are shared by all 15 forms. The RED LINE forbids modifying them. So: existing SOAP path untouched + a NEW `POST /ncd-measurements` route, called as a second fetch. (Spec rec, confirmed.)
3. **Initial-form save auto-writes `session_no=1`** via a second client-side fetch from the NCD form's save flow (the route exists now, in this plan). Forward-only — no backfill (NCD had no real production use pre-Plan-B; see Plan A's closing seam note). (Spec rec, confirmed.)

**Nothing in D1–D10 is technically unbuildable** — the SOAP modal has a clean `.soap-form` container and an `openSoapModal()` populator that accept additive injection without restructure (verified against episode.html:501–584, 627–651). No blocker to flag back.

## Conventions

- **No TDD on the UI layer** (project axiom). Backend (migration, DB functions) gets quick `py -c` smoke checks; UI/trend gets Miruya hand-testing. Overrides the writing-plans TDD default (user instructions win).
- **Migrations use `PRAGMA user_version` gates, never blind ALTER-and-swallow** (WORKFLOW Anti-Repeat; database.py:79–108 is the pattern, currently stamps v2).
- **Smoke-test on the worktree before merge.** Run Flask from the worktree folder.
- **The RED LINE (spec §5.3):** the SOAP modal is shared by ALL forms. The NCD panel is additive + form-type-guarded. A NON-NCD form's SOAP modal MUST be behaviourally unchanged after the injection. Task 4 has a mandatory regression step. If the panel ever needs markup that won't fit additively, STOP and flag to Cowork — do not restructure the modal.

## Reference files (read before starting)

| Purpose | File:line |
|---|---|
| Migration gate pattern (v2) | `database.py:79–108` |
| soap_notes DB functions to mirror | `save_soap` (database.py:692), `get_soap_notes` (761), `delete_soap` (775) |
| delete_patient cascade loop | `database.py:314–340` |
| SOAP route to mirror (NOT modify) | `api_save_soap` (app.py:243), `api_get_soaps` (235) |
| Shared SOAP modal markup | `episode.html:501–584` |
| SOAP modal populate/save JS | `openSoapModal()` (episode.html:627), `saveSoap()` (678) |
| Episode page route + render | `episode_detail` (app.py:88) |
| NCD form save flow (for auto-write hook) | `static/js/main.js` save path + `form_ncd.js collect()` |
| Breadcrumb + neutral topbar pattern | `episode.html:438–444`; BACKLOG "neutral topbar" |

---

## File Structure (Plan B)

**Create:**
- `templates/ncd_trend.html` — the screen-only trend page
- `static/js/ncd_trend.js` — data transform (series → per-metric arrays) + render (table + sparklines), kept SEPARATE so a future UIX pass rewrites render without touching transform (D10 modularity)
- `static/js/ncd_measure.js` — the SOAP-modal measurements panel logic (collect/populate the panel, second-fetch save) — kept out of episode.html's inline script to minimise edits to the shared file

**Modify:**
- `database.py` — v3 migration gate (create `ncd_measurements`) + `save_ncd_measurement`/`get_ncd_measurements`/`delete_ncd_measurement` + delete_patient cascade
- `app.py` — routes: `POST/GET /api/episodes/<id>/ncd-measurements`, `DELETE /api/ncd-measurements/<id>`, `GET /episodes/<id>/ncd-trend` (page)
- `templates/episode.html` — additive NCD-only panel inside the SOAP modal + guard + second-fetch wire + "View Trend" breadcrumb link (NCD-only)
- `static/js/form_ncd.js` (or main.js save hook) — on initial NCD save, second fetch to write `session_no=1`

---

## Task 1: v3 migration — create `ncd_measurements`

**Files:**
- Modify: `database.py` (migration block + table create)

- [ ] **Step 1: Branch**

```bash
cd /c/Users/legac/Downloads/FOR_CLAUDE/PT_Assessment
git worktree add ../PT_Assessment-worktrees/ncd-form-B -b claude/ncd-form-B
```

- [ ] **Step 2: Add the table create + v3 gate**

In `init_db`, add a `CREATE TABLE IF NOT EXISTS ncd_measurements` alongside the other creates (before the migration block), mirroring soap_notes shape with a JSON blob:
```python
    # ── NCD per-visit measurements (NCD form only) ────────────
    conn.execute('''
        CREATE TABLE IF NOT EXISTS ncd_measurements (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            episode_id   INTEGER NOT NULL,
            session_no   INTEGER NOT NULL DEFAULT 1,
            note_date    TEXT    NOT NULL,
            data_json    TEXT    NOT NULL,
            created_at   TEXT    NOT NULL,
            updated_at   TEXT    NOT NULL,
            FOREIGN KEY (episode_id) REFERENCES episodes(id)
        )
    ''')
```
Then bump the version gate. Current code ends the migration block with `conn.execute('PRAGMA user_version = 2')` (database.py:108). Add a v3 gate before it and change the stamp to 3:
```python
    if _version < 3:
        # v3: ncd_measurements table (created above via CREATE TABLE IF NOT EXISTS).
        # No ALTER needed — the CREATE IF NOT EXISTS handles both fresh and mid-air DBs.
        pass

    conn.execute('PRAGMA user_version = 3')
```
(The CREATE IF NOT EXISTS makes the table appear for both fresh DBs and existing v2 DBs on next launch — the gate is bookkeeping. No blind ALTER-and-swallow; the version stamp moves to 3.)

- [ ] **Step 3: Backend smoke-check the migration**

```bash
py -c "import database, tempfile, os; p=os.path.join(tempfile.gettempdir(),'ncd_v3_test.db'); os.path.exists(p) and os.remove(p); database.init_db(p); import sqlite3; c=sqlite3.connect(p); print('version', c.execute('PRAGMA user_version').fetchone()[0]); print('cols', [r[1] for r in c.execute('PRAGMA table_info(ncd_measurements)')])"
```
Expected: `version 3` and the column list `['id','episode_id','session_no','note_date','data_json','created_at','updated_at']`. Re-run a second time (idempotent) → still `version 3`, no error.

- [ ] **Step 4: Commit**

```bash
git add database.py
git commit -m "NCD-B: v3 migration — ncd_measurements table"
```

---

## Task 2: DB functions + delete_patient cascade

**Files:**
- Modify: `database.py`

- [ ] **Step 1: Add `save_ncd_measurement` (mirror `save_soap`)**

```python
def save_ncd_measurement(db_path, episode_id, data):
    if not data.get('note_date', '').strip():
        return None, ['Measurement date is required']
    now = datetime.now().isoformat(timespec='seconds')
    mid = data.get('id')
    conn = get_conn(db_path)
    try:
        if mid:
            conn.execute('''
                UPDATE ncd_measurements
                SET note_date=?, data_json=?, updated_at=?
                WHERE id=?
            ''', (data.get('note_date',''), json.dumps(data.get('measurements', {})), now, mid))
        else:
            row = conn.execute(
                'SELECT MAX(session_no) as mx FROM ncd_measurements WHERE episode_id=?',
                (episode_id,)
            ).fetchone()
            next_session = (row['mx'] or 0) + 1
            cur = conn.execute('''
                INSERT INTO ncd_measurements
                    (episode_id, session_no, note_date, data_json, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (episode_id, next_session, data.get('note_date',''),
                  json.dumps(data.get('measurements', {})), now, now))
            mid = cur.lastrowid
        conn.execute('UPDATE episodes SET updated_at=? WHERE id=?', (now, episode_id))
        conn.commit()
        return mid, []
    except Exception as e:
        return None, [str(e)]
    finally:
        conn.close()
```
Note: the numeric battery lives under a `measurements` key in the posted payload; `data_json` stores just that sub-dict (the trend reads it directly).

- [ ] **Step 2: Add `get_ncd_measurements` (mirror `get_soap_notes`)**

```python
def get_ncd_measurements(db_path, episode_id):
    conn = get_conn(db_path)
    try:
        rows = conn.execute('''
            SELECT * FROM ncd_measurements WHERE episode_id=?
            ORDER BY session_no ASC
        ''', (episode_id,)).fetchall()
        out = []
        for r in rows:
            d = dict(r)
            try:
                d['measurements'] = json.loads(d.get('data_json') or '{}')
            except Exception:
                d['measurements'] = {}
            out.append(d)
        return out, None
    except Exception as e:
        return [], str(e)
    finally:
        conn.close()
```
(Parses the JSON blob server-side so the trend JS receives ready dicts.)

- [ ] **Step 3: Add `delete_ncd_measurement` (mirror `delete_soap`)**

```python
def delete_ncd_measurement(db_path, mid):
    conn = get_conn(db_path)
    try:
        conn.execute('DELETE FROM ncd_measurements WHERE id=?', (mid,))
        conn.commit()
        return True, None
    except Exception as e:
        return False, str(e)
    finally:
        conn.close()
```

- [ ] **Step 4: Add the cascade to `delete_patient`**

In `delete_patient`'s per-episode loop (database.py:322–332), alongside the soap_notes delete, add:
```python
            conn.execute('DELETE FROM ncd_measurements WHERE episode_id=?', (eid,))
```
(Currently the loop deletes soap_notes, audit_log per record, records. Add measurements so deleting a patient leaves no orphan rows.)

- [ ] **Step 5: Backend smoke-check the round-trip**

```bash
py -c "
import database, tempfile, os
p=os.path.join(tempfile.gettempdir(),'ncd_fn_test.db'); os.path.exists(p) and os.remove(p)
database.init_db(p)
pid,_=database.create_patient(p,{'name':'Test','nric':'900101015523','type':'local'})
eid,_=database.create_episode(p,pid,'NCD')
m1,_=database.save_ncd_measurement(p,eid,{'note_date':'2026-06-25','measurements':{'weight':90,'bmi':31.1}})
m2,_=database.save_ncd_measurement(p,eid,{'note_date':'2026-07-02','measurements':{'weight':88,'bmi':30.4}})
rows,_=database.get_ncd_measurements(p,eid)
print('count', len(rows), 'sessions', [r['session_no'] for r in rows], 'w', [r['measurements'].get('weight') for r in rows])
database.delete_patient(p,pid)
rows2,_=database.get_ncd_measurements(p,eid)
print('after cascade', len(rows2))
"
```
Expected: `count 2 sessions [1, 2] w [90, 88]` then `after cascade 0`.

- [ ] **Step 6: Commit**

```bash
git add database.py
git commit -m "NCD-B: ncd_measurements DB functions + delete_patient cascade"
```

---

## Task 3: Flask routes

**Files:**
- Modify: `app.py`

- [ ] **Step 1: Import the new functions**

In app.py's `from database import (...)` block add `save_ncd_measurement, get_ncd_measurements, delete_ncd_measurement`.

- [ ] **Step 2: Add the measurement routes (mirror the SOAP routes, app.py:235–259)**

```python
@app.route('/api/episodes/<int:episode_id>/ncd-measurements', methods=['GET'])
def api_get_ncd_measurements(episode_id):
    rows, err = get_ncd_measurements(DB_PATH, episode_id)
    if err:
        return jsonify({'error': err}), 500
    return jsonify(rows)


@app.route('/api/episodes/<int:episode_id>/ncd-measurements', methods=['POST'])
def api_save_ncd_measurement(episode_id):
    data = request.get_json(silent=True)
    if not data:
        return jsonify({'error': 'Invalid JSON'}), 400
    mid, errors = save_ncd_measurement(DB_PATH, episode_id, data)
    if errors:
        return jsonify({'error': errors}), 422
    return jsonify({'success': True, 'id': mid})


@app.route('/api/ncd-measurements/<int:mid>', methods=['DELETE'])
def api_delete_ncd_measurement(mid):
    ok, err = delete_ncd_measurement(DB_PATH, mid)
    if not ok:
        return jsonify({'error': err}), 500
    return jsonify({'success': True})
```

- [ ] **Step 3: Smoke-check routes resolve**

Launch Flask from the worktree; with an NCD episode id N:
```bash
curl -s -X POST http://127.0.0.1:5000/api/episodes/N/ncd-measurements -H "Content-Type: application/json" -d "{\"note_date\":\"2026-06-25\",\"measurements\":{\"weight\":90}}"
curl -s http://127.0.0.1:5000/api/episodes/N/ncd-measurements
```
Expected: first returns `{"success":true,"id":...}`, second returns a JSON array with one row carrying `measurements.weight = 90`.

- [ ] **Step 4: Commit**

```bash
git add app.py
git commit -m "NCD-B: measurement save/get/delete routes"
```

---

## Task 4: SOAP-modal injection (THE RED LINE)

**Goal:** An NCD-only measurements panel inside the existing SOAP modal. Additive, form-type-guarded, zero change to the SOAP save path. A non-NCD form's modal must be behaviourally identical afterward.

**Files:**
- Create: `static/js/ncd_measure.js`
- Modify: `templates/episode.html` (additive panel markup + guard + second-fetch + script include)

- [ ] **Step 1: Add the panel markup additively inside the modal**

In episode.html, inside the `.soap-form` div (after the session-info-box, before the S textarea — or after P; pick a position that reads naturally), add a single self-contained block that defaults hidden:
```html
      <!-- NCD-only measurements panel (injected additively; hidden unless form_type==='NCD') -->
      <div id="ncd-measure-panel" style="display:none;">
        <div class="session-info-box">
          <div class="session-info-title">NCD Measurements (this visit)</div>
          <div class="session-info-grid" id="ncd-measure-grid">
            <!-- number inputs for the per-visit battery — built by ncd_measure.js -->
          </div>
        </div>
      </div>
```
This is ADDITIVE — it adds one hidden `<div>` and changes nothing existing. Do NOT restructure `.soap-form`, the existing fields, or `.modal-actions`. (RED LINE.)

- [ ] **Step 2: Create `static/js/ncd_measure.js` — panel build + guard + save**

Keep the logic OUT of episode.html's inline script (minimise edits to the shared file). The module:
- `NcdMeasure.maybeShow(formType)` — toggles `#ncd-measure-panel` display based on `formType === 'NCD'`, and builds the grid inputs once (the per-visit battery = the SAME numeric fields as Plan A form sections 04–06: vitals, bloods, body comp incl. derived BMI/WHR, fitness tests). Render them as compact number inputs into `#ncd-measure-grid`.
- `NcdMeasure.collect()` — returns the `measurements` sub-dict from the panel inputs.
- `NcdMeasure.populate(m)` — fills the panel from a measurements dict.
- `NcdMeasure.clear()` — blanks the panel.
- `NcdMeasure.save(episodeId, soapId)` — POSTs `{note_date, measurements}` to `/api/episodes/<id>/ncd-measurements`. Called as the SECOND fetch (see Step 4).

Field set MUST match Plan A's battery keys exactly (so the trend can read a uniform series across initial + follow-ups). Derive BMI/WHR in the panel the same way form_ncd.js does (reuse the formula; the panel can include its own tiny `recompute`).

- [ ] **Step 3: Include the script + wire the guard**

In episode.html, add `<script src="/static/js/ncd_measure.js"></script>` near the existing `clinical_templates.js` include. Then hook the guard into the EXISTING `openSoapModal()` (episode.html:627) with a single additive line near the end (where it already does the `oBtn` form-type check at line 644–648 — same idiom, null-guarded):
```javascript
  // NCD-only: show measurements panel + prefill if editing an existing visit
  if (window.NcdMeasure) {
    NcdMeasure.maybeShow(episode ? episode.form_type : '');
    if (soap && soap.session_no) NcdMeasure.loadForSession(EPISODE_ID, soap.session_no);
    else NcdMeasure.clear();
  }
```
`loadForSession` fetches `/ncd-measurements`, finds the row whose `session_no` matches the SOAP note's `session_no` (session_no alignment — both auto-number per visit, spec §5.3 "simplest"), and populates the panel. This is purely additive: on non-NCD forms `maybeShow('MS')` keeps the panel hidden and does nothing else.

- [ ] **Step 4: Second-fetch on SOAP save (additive, no change to existing save)**

The existing `saveSoap()` (episode.html:678) POSTs the SOAP note and on success calls `loadSoaps()`. Do NOT modify its payload or route. Add the measurements write as a SECOND fetch AFTER the SOAP save succeeds, guarded by form type. Minimal additive change inside `saveSoap()`'s success branch (right after `closeModal()` / before/after `loadSoaps()`):
```javascript
    if (window.NcdMeasure && episode && episode.form_type === 'NCD') {
      // session_no is assigned server-side; refetch isn't needed — post with the note_date,
      // the measurement row auto-numbers in lockstep with the soap note for a new visit.
      NcdMeasure.save(EPISODE_ID, j.id);  // j = soap save response
    }
```
**Important alignment note for the executor:** `save_soap` and `save_ncd_measurement` independently `MAX(session_no)+1`. For a brand-new visit both increment together (both at count N→N+1), so they stay aligned. For an EDIT of an existing soap note, `NcdMeasure.save` must pass the existing measurement row's `id` (resolved via `loadForSession`) so it UPDATEs rather than inserting a duplicate. Implement `NcdMeasure.save` to: if the panel was populated from an existing row, send that row's `id`; else insert new. Verify alignment in Step 6.

- [ ] **Step 5: Add the "View Trend" breadcrumb link (NCD-only)**

In episode.html's breadcrumb (line 438) or context bar, add an NCD-only link to the trend page. After `loadEpisode()` resolves `episode.form_type`, conditionally inject:
```javascript
    if (episode.form_type === 'NCD') {
      var bc = document.querySelector('.breadcrumb');
      var a = document.createElement('a');
      a.textContent = '📈 View Trend';
      a.style.marginLeft = 'auto';
      a.onclick = function(){ window.location.href = '/episodes/' + EPISODE_ID + '/ncd-trend'; };
      bc.appendChild(a);
    }
```
Mirror the neutral-topbar/breadcrumb styling already in episode.html (BACKLOG: no accent topbars). Non-NCD episodes get no link — additive.

- [ ] **Step 6: MANDATORY — NCD flow test AND non-NCD regression test (RED LINE)**

On the worktree:
- **NCD:** open an NCD episode → "+ Follow-up" → the measurements panel appears below the SOAP fields → fill weight/BMI etc. + SOAP text → Save → confirm BOTH a soap note AND a measurement row persisted (check `/api/episodes/N/ncd-measurements` and `/soap`). Edit that visit → panel prefills the saved numbers → change one → Save → confirm it UPDATED (no duplicate row; session count unchanged).
- **NON-NCD regression (the RED LINE check):** open an MS (or any non-NCD) episode → "+ Follow-up" → confirm the measurements panel is ABSENT, the modal looks and behaves byte-for-byte as before, SOAP save works unchanged, no console errors, no stray network call to `/ncd-measurements`. This is non-negotiable per spec §5.3.

- [ ] **Step 7: Commit**

```bash
git add static/js/ncd_measure.js templates/episode.html
git commit -m "NCD-B: additive SOAP-modal measurements panel + trend link (form-type guarded)"
```

---

## Task 5: Auto-write session_no=1 on initial form save

**Goal:** When the NCD initial assessment is first saved, also write the `session_no=1` measurements row from the form's battery fields (spec §3 note, §11 item 3) — so visit 1 isn't a manual SOAP-panel step on the busy first visit.

**Files:**
- Modify: `static/js/form_ncd.js` (or the shared save path in `main.js`)

- [ ] **Step 1: Locate the NCD form save success path**

Find where the NCD form's Save Record completes (the shared save in main.js that POSTs to `/api/records` and gets `{success, id}` back, with `episode_id` in context). The auto-write must fire only for NCD and only when an `episode_id` is present.

- [ ] **Step 2: Add the second fetch (additive, NCD-only)**

After a successful record save, if `_form_type === 'NCD'` and `episode_id` is set, POST the battery sub-dict to `/api/episodes/<episode_id>/ncd-measurements`. Build the `measurements` dict from the same battery keys (vitals/bloods/bodycomp/fitness incl. derived BMI/WHR) the form already collected — extract them from `collect()` into a `measurements` object. Use `note_date = patient.date` (the assessment date) as the visit date.

Idempotency: saving the initial form twice should NOT create two `session_no=1` rows. Guard: before posting, GET `/ncd-measurements`; if a row already exists for this episode (session 1 present), send that row's `id` to UPDATE instead of insert. (Simplest robust approach; avoids duplicate visit-1 rows on re-save/edit of the initial assessment.)

- [ ] **Step 3: Hand-test**

On the worktree: create a fresh NCD episode → fill the initial form including some vitals/weight → Save Record → check `/api/episodes/N/ncd-measurements` shows exactly ONE row, `session_no=1`, carrying the battery values. Edit the initial form, change weight, Save again → still ONE row, updated weight (no duplicate). Then add a follow-up via the SOAP panel → a `session_no=2` row appears.

- [ ] **Step 4: Commit**

```bash
git add static/js/form_ncd.js static/js/main.js
git commit -m "NCD-B: auto-write session_no=1 measurements row on initial save (idempotent)"
```

---

## Task 6: Trend page — route, template, transform + sparklines

**Goal:** A new screen-only page reading the measurement series, rendering an infographic trend table with inline-SVG sparklines. NEVER touches PDF/MPIS (D1). Transform and render are SEPARATE modules (D10).

**Files:**
- Create: `templates/ncd_trend.html`, `static/js/ncd_trend.js`
- Modify: `app.py` (page route)

- [ ] **Step 1: Add the page route**

```python
@app.route('/episodes/<int:episode_id>/ncd-trend')
def ncd_trend(episode_id):
    return render_template('ncd_trend.html', episode_id=episode_id)
```
(Mirrors `episode_detail` at app.py:88 — minimal; the page fetches its data via the existing `/ncd-measurements` GET route.)

- [ ] **Step 2: Create `templates/ncd_trend.html`**

A standalone page (like episode.html — NOT extending base.html's form shell). Must use the **neutral M3 context bar** (BACKLOG: all standalone pages use neutral topbars, no accent). Include `<script src="/static/js/ncd_trend.js"></script>`. Body: a context bar with a "← Back to Episode" link (`/episode/<id>`), a heading, and a `<div id="trend-root"></div>` the JS fills. Pass `var EPISODE_ID = {{ episode_id }};` inline.

- [ ] **Step 3: Create `static/js/ncd_trend.js` — TRANSFORM (stable) + RENDER (swappable), kept separate**

```javascript
// ncd_trend.js — screen-only NCD trend view. NEVER touches PDF/MPIS (D1).
// TWO layers, deliberately decoupled (D10): transform (series -> per-metric arrays)
// is stable; render (table + sparkline HTML) is the bit a future UIX pass rewrites.

var NcdTrend = (function () {

  // Headline metrics (D7). key = measurements dict key; label = display.
  var HEADLINE = [
    { key: 'weight',   label: 'Weight (kg)' },
    { key: 'bmi',      label: 'BMI' },
    { key: 'waist',    label: 'Waist (cm)' },
    { key: 'whr',      label: 'Waist/Hip' },
    { key: 'visceralFat', label: 'Visceral Fat' },
    { key: 'walk6',    label: '6-min walk' },   // adjust key to the battery's actual key
    { key: 'handGrip', label: 'Hand grip (kg)' }
  ];

  // ── TRANSFORM: ordered series -> { dates:[], metrics:{key:[values...]} } ──
  // Missing metric in a visit => null (a GAP, never 0 — clinically wrong to plot blank as 0).
  function transform(rows) {
    var dates = rows.map(function (r) { return r.note_date; });
    var metrics = {};
    HEADLINE.forEach(function (m) {
      metrics[m.key] = rows.map(function (r) {
        var v = (r.measurements || {})[m.key];
        var n = parseFloat(v);
        return isNaN(n) ? null : n;
      });
    });
    return { dates: dates, metrics: metrics };
  }

  // ── RENDER: sparkline as inline SVG polyline (no chart lib) ──
  function sparkline(values) {
    var pts = values.filter(function (v) { return v !== null; });
    if (pts.length < 2) return '<span style="color:var(--text-faint)">—</span>';
    var min = Math.min.apply(null, pts), max = Math.max.apply(null, pts);
    var span = (max - min) || 1;
    var W = 80, H = 24, n = values.length;
    var coords = [];
    values.forEach(function (v, i) {
      if (v === null) return; // gap: skip the point (line breaks naturally between drawn points)
      var x = (n === 1) ? 0 : (i / (n - 1)) * W;
      var y = H - ((v - min) / span) * H;
      coords.push(x.toFixed(1) + ',' + y.toFixed(1));
    });
    // improving (down for weight/bmi/waist) vs gaining-capacity (up for fitness) colour:
    var first = pts[0], last = pts[pts.length - 1];
    var color = (last <= first) ? 'var(--success, #2a8a4a)' : 'var(--accent, #4a7ac8)';
    return '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '">' +
           '<polyline points="' + coords.join(' ') + '" fill="none" stroke="' + color + '" stroke-width="1.5"/></svg>';
  }

  function render(model) {
    if (!model.dates.length) {
      return '<div style="padding:24px;color:var(--text-faint)">No measurements recorded yet.</div>';
    }
    if (model.dates.length === 1) {
      // single visit: show the reading, note that trend needs another visit
      // (still render the row values; sparkline shows '—')
    }
    var head = '<tr><th>Metric</th>' + model.dates.map(function (d) { return '<th>' + d + '</th>'; }).join('') + '<th>Trend</th></tr>';
    var body = HEADLINE.map(function (m) {
      var vals = model.metrics[m.key];
      var cells = vals.map(function (v) { return '<td>' + (v === null ? '—' : v) + '</td>'; }).join('');
      return '<tr><td>' + m.label + '</td>' + cells + '<td>' + sparkline(vals) + '</td></tr>';
    }).join('');
    return '<table class="trend-table"><thead>' + head + '</thead><tbody>' + body + '</tbody></table>';
  }

  async function init() {
    var res = await fetch('/api/episodes/' + EPISODE_ID + '/ncd-measurements');
    var rows = await res.json();
    var model = transform(rows);
    document.getElementById('trend-root').innerHTML = render(model);
  }

  return { init: init, transform: transform };  // transform exported so it stays testable
})();
document.addEventListener('DOMContentLoaded', NcdTrend.init);
```
**Executor:** align the `HEADLINE` keys (`weight`, `bmi`, `whr`, `visceralFat`, `walk6`, `handGrip`, `waist`) to the ACTUAL keys the measurements battery stores (from Plan A's collect / Task 4's panel). The transform/render split is the D10 modularity requirement — keep them decoupled.

- [ ] **Step 4: Add trend-table CSS to ncd_trend.html**

Minimal infographic styling (form-local, neutral M3): `.trend-table { width:100%; border-collapse:collapse; }`, header row tinted, sparkline cells right-aligned. Improving = green, gaining-capacity = blue (handled in JS).

- [ ] **Step 5: Hand-test the trend page**

On the worktree, on an NCD episode with ≥2 measurement rows: click "📈 View Trend" → the trend table renders, dates as columns, headline metrics as rows, sparklines drawn. Test edge cases: 1 visit (sparkline shows "—", values still show); a metric missing in one visit (gap, not a drop to 0). Confirm the page never calls any PDF/MPIS route.

- [ ] **Step 6: Commit**

```bash
git add app.py templates/ncd_trend.html static/js/ncd_trend.js
git commit -m "NCD-B: screen-only trend page (transform/render split, inline-SVG sparklines)"
```

---

## Task 7: .spec bundling + full smoke test + merge

**Files:**
- Modify: `pt_assessment.spec`

- [ ] **Step 1: Bundle new JS/templates**

`('templates','templates')` and `('static','static')` already glob everything, so `ncd_trend.html`, `ncd_trend.js`, `ncd_measure.js` bundle automatically. No new `datas` line needed (unlike pdf_ncd.py in Plan A, which is a top-level .py). Confirm by listing — no spec edit required unless a file lives outside templates/static. (If true, this task has no spec change; keep the step as a verification.)

- [ ] **Step 2: Full end-to-end smoke test (worktree)**

1. Fresh NCD episode → initial form save → confirm `session_no=1` measurement auto-written (Task 5).
2. Two follow-ups via SOAP panel → measurements rows 2, 3; soap notes aligned.
3. Trend page → 3 columns, sparklines trending.
4. Export episode PDF → unchanged from Plan A (NO measurement/trend data leaks into PDF — D1 axiom check).
5. Copy SOAP to MPIS → unchanged (no measurement leak — D1).
6. **RED LINE regression:** an MS episode's SOAP modal is byte-for-byte unchanged (Task 4 Step 6).
7. Delete the patient → confirm `ncd_measurements` rows gone (cascade, Task 2).

- [ ] **Step 3: Merge to main (only after worktree smoke-test passes)**

```bash
cd /c/Users/legac/Downloads/FOR_CLAUDE/PT_Assessment
git merge --no-ff claude/ncd-form-B -m "Merge NCD per-visit measurements + trend (Plan B)"
git worktree remove ../PT_Assessment-worktrees/ncd-form-B
git worktree prune
git branch -d claude/ncd-form-B
```

- [ ] **Step 4: exe build check**

`build.bat` → confirm the v3 migration runs cleanly on an existing v2 `pt_data/records.db` (launch the exe, verify `PRAGMA user_version` becomes 3 and `ncd_measurements` exists). Test the NCD flow end-to-end in the packaged exe.

---

## Self-Review (against spec §5–6)

- **§5.1 ncd_measurements table (JSON blob, v3 gate)** → Task 1. ✅
- **§5.2 DB functions (save/get/delete) + delete_patient cascade** → Task 2. ✅
- **§5.3 SOAP-modal injection (additive, guarded) + two-fetch save + load-by-session_no** → Task 4. ✅ RED LINE regression test mandatory (Task 4 Step 6, Task 7 Step 2.6).
- **§3 note / §11.3 auto-write session_no=1 on initial save (idempotent)** → Task 5. ✅
- **§6 trend page (route, neutral topbar, headline metrics, sparklines, transform/render split, empty/sparse states, gap-not-zero)** → Task 6. ✅
- **§6 breadcrumb link (NCD-only)** → Task 4 Step 5. ✅
- **D1 trend never touches PDF/MPIS** → verified Task 6 Step 5, Task 7 Step 2.4–2.5. ✅
- **Two fetches, JSON blob, auto-write (§11 1–3)** → resolved at top, implemented Tasks 1–5. ✅
- Placeholder scan: DB functions, routes, sparkline/transform/render given in full code; the panel field-set + trend HEADLINE keys say "align to Plan A's battery keys" (a real cross-plan dependency, not a placeholder — the exact keys come from Plan A's finalized collect()). ✅
- Type consistency: `measurements` sub-dict key used uniformly across save_ncd_measurement (stores it), get_ncd_measurements (parses it back), the panel collect/save, the auto-write, and the trend transform. ✅
```
