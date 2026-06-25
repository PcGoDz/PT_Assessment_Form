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
3. **Initial-form save auto-writes the visit-1 assessment row** (`soap_id=NULL`) via a second client-side fetch from the NCD form's save flow. Idempotent by upsert on `(episode_id, soap_id IS NULL)`. Forward-only — no backfill (NCD had no real production use pre-Plan-B; see Plan A's closing seam note). (Spec rec, confirmed.)

**Cold-vet alignment fix folded in (the one real design change this revision):** `ncd_measurements` gains a nullable `soap_id` FK to `soap_notes`. Visit-1 assessment row = `soap_id NULL`; every follow-up row = the SOAP note's id. Editing/prefilling matches by `soap_id` (FK lookup), the trend orders by `note_date` — neither relies on the two tables' independent `session_no` counters agreeing (they can't: visit 1 writes a measurement with no soap note, so the counters are off-by-one from the first follow-up onward). Alignment is now by construction. See the box in Task 1.

**Nothing in D1–D10 is technically unbuildable** — the SOAP modal has a clean `.soap-form` container and an `openSoapModal()` populator that accept additive injection without restructure (verified against episode.html:501–584, 627–651). The `soap_id` column is a one-line additive schema change. No blocker to flag back.

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

In `init_db`, add a `CREATE TABLE IF NOT EXISTS ncd_measurements` alongside the other creates (before the migration block), mirroring soap_notes shape with a JSON blob **plus a nullable `soap_id` FK** (the cold-vet alignment fix — see the box below):
```python
    # ── NCD per-visit measurements (NCD form only) ────────────
    conn.execute('''
        CREATE TABLE IF NOT EXISTS ncd_measurements (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            episode_id   INTEGER NOT NULL,
            soap_id      INTEGER,            -- FK to the visit's SOAP note; NULL for the visit-1 assessment row
            session_no   INTEGER NOT NULL DEFAULT 1,  -- informational counter only; NOT the alignment key
            note_date    TEXT    NOT NULL,
            data_json    TEXT    NOT NULL,
            created_at   TEXT    NOT NULL,
            updated_at   TEXT    NOT NULL,
            FOREIGN KEY (episode_id) REFERENCES episodes(id),
            FOREIGN KEY (soap_id)    REFERENCES soap_notes(id)
        )
    ''')
```

> **═══ THE SESSION_NO ALIGNMENT FIX (cold-vet, confirmed against live code + Miruya) ═══**
> The original plan aligned `ncd_measurements` to `soap_notes` by parallel `MAX(session_no)+1` counters. That is **FALSE by construction** for NCD's real flow:
> - **Visit 1 = full assessment.** Writes the `records` row + (Plan A auto-write) a `ncd_measurements` row. It does **NOT** create a SOAP note — SOAP notes start at visit 2 (Miruya: first visit is the assessment we're digitising; follow-ups are SOAP).
> - After visit 1: `ncd_measurements` has 1 row, `soap_notes` has 0.
> - **Visit 2 (first follow-up):** `save_soap` → `MAX(0)+1 = 1`; `save_ncd_measurement` → `MAX(1)+1 = 2`. **Misaligned on the first follow-up, for every NCD patient** — the default path, not an edge case. Editing a visit then pulls the WRONG measurement row; the trend's columns desync from the SOAP timeline. Silent.
> **Fix = alignment BY CONSTRUCTION via the `soap_id` FK.** The assessment row carries `soap_id=NULL`; every follow-up measurement row carries the SOAP note's `id`. Editing fetches/updates by `soap_id` (a clean FK lookup), never by a guessed `session_no`. The trend orders by `note_date`. The two independent counters never have to agree. `session_no` stays as an informational per-row counter only — nothing aligns on it.
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
Expected: `version 3` and the column list `['id','episode_id','soap_id','session_no','note_date','data_json','created_at','updated_at']` (note `soap_id` present). Re-run a second time (idempotent) → still `version 3`, no error.

- [ ] **Step 4: Commit**

```bash
git add database.py
git commit -m "NCD-B: v3 migration — ncd_measurements table"
```

---

## Task 2: DB functions + delete_patient cascade

**Files:**
- Modify: `database.py`

- [ ] **Step 1: Add `save_ncd_measurement` — upsert by the `(episode_id, soap_id)` natural key**

The alignment fix lives here: the row is identified by `soap_id`, NOT by a parallel counter. `soap_id=None` ⇒ the visit-1 assessment row (there is exactly one per episode). `soap_id=<n>` ⇒ the follow-up tied to that SOAP note. Upserting on this natural key means re-saving a visit can never create a duplicate, and editing always lands on the right row.
```python
def save_ncd_measurement(db_path, episode_id, data):
    if not data.get('note_date', '').strip():
        return None, ['Measurement date is required']
    now     = datetime.now().isoformat(timespec='seconds')
    soap_id = data.get('soap_id')   # None for the visit-1 assessment row
    blob    = json.dumps(data.get('measurements', {}))
    conn    = get_conn(db_path)
    try:
        # Find the existing row by the natural key (episode_id + soap_id), NULL-safe.
        if soap_id is None:
            existing = conn.execute(
                'SELECT id FROM ncd_measurements WHERE episode_id=? AND soap_id IS NULL',
                (episode_id,)
            ).fetchone()
        else:
            existing = conn.execute(
                'SELECT id FROM ncd_measurements WHERE episode_id=? AND soap_id=?',
                (episode_id, soap_id)
            ).fetchone()

        if existing:
            mid = existing['id']
            conn.execute('''
                UPDATE ncd_measurements
                SET note_date=?, data_json=?, updated_at=?
                WHERE id=?
            ''', (data.get('note_date',''), blob, now, mid))
        else:
            row = conn.execute(
                'SELECT MAX(session_no) as mx FROM ncd_measurements WHERE episode_id=?',
                (episode_id,)
            ).fetchone()
            next_session = (row['mx'] or 0) + 1   # informational counter only
            cur = conn.execute('''
                INSERT INTO ncd_measurements
                    (episode_id, soap_id, session_no, note_date, data_json, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (episode_id, soap_id, next_session, data.get('note_date',''), blob, now, now))
            mid = cur.lastrowid

        conn.execute('UPDATE episodes SET updated_at=? WHERE id=?', (now, episode_id))
        conn.commit()
        return mid, []
    except Exception as e:
        return None, [str(e)]
    finally:
        conn.close()
```
Notes: the numeric battery lives under a `measurements` key in the posted payload; `data_json` stores just that sub-dict. The upsert-by-natural-key makes BOTH the auto-write idempotency (Task 5) and the SOAP-panel edit (Task 4) fall out for free — neither needs to track a separate measurement-row `id`.

- [ ] **Step 2: Add `get_ncd_measurements` (mirror `get_soap_notes`)**

```python
def get_ncd_measurements(db_path, episode_id):
    conn = get_conn(db_path)
    try:
        # Order by note_date (the alignment fix orders the trend by real visit date,
        # NOT by either table's session_no counter). created_at breaks date ties stably.
        rows = conn.execute('''
            SELECT * FROM ncd_measurements WHERE episode_id=?
            ORDER BY note_date ASC, created_at ASC
        ''', (episode_id,)).fetchall()
        out = []
        for r in rows:
            d = dict(r)                       # carries id, episode_id, soap_id, session_no, note_date
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
Parses the JSON blob server-side so the trend JS and the SOAP-panel prefill receive ready dicts. Each row carries `soap_id` (the FK the panel matches on) and `note_date` (the trend's column/order key).

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
# Visit 1 = assessment auto-write: soap_id NULL
database.save_ncd_measurement(p,eid,{'note_date':'2026-06-25','measurements':{'weight':90,'bmi':31.1}})
# Re-save the assessment (idempotency): same NULL-soap row UPDATES, no duplicate
database.save_ncd_measurement(p,eid,{'note_date':'2026-06-25','measurements':{'weight':89,'bmi':30.8}})
# Visit 2 = first follow-up: a soap note then its linked measurement (soap_id set)
sid,_=database.save_soap(p,eid,{'note_date':'2026-07-02','subjective':'better'})
database.save_ncd_measurement(p,eid,{'soap_id':sid,'note_date':'2026-07-02','measurements':{'weight':88,'bmi':30.4}})
# Edit that follow-up's measurement: same soap_id UPDATES, no duplicate
database.save_ncd_measurement(p,eid,{'soap_id':sid,'note_date':'2026-07-02','measurements':{'weight':87,'bmi':30.0}})
rows,_=database.get_ncd_measurements(p,eid)
print('count', len(rows))
print('soap_ids', [r['soap_id'] for r in rows])
print('dates', [r['note_date'] for r in rows])
print('weights', [r['measurements'].get('weight') for r in rows])
database.delete_patient(p,pid)
rows2,_=database.get_ncd_measurements(p,eid)
print('after cascade', len(rows2))
"
```
Expected: `count 2` (NOT 4 — both re-saves upserted), `soap_ids [None, <sid>]`, `dates ['2026-06-25','2026-07-02']` (note_date order), `weights [89, 87]` (the updated values), then `after cascade 0`. This proves: (a) idempotent assessment row, (b) `soap_id` linkage, (c) per-soap edit upserts, (d) date ordering, (e) cascade delete.

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
- `NcdMeasure.maybeShow(formType)` — toggles `#ncd-measure-panel` display based on `formType === 'NCD'`, and builds the grid inputs once (the per-visit battery). Render them as compact number inputs into `#ncd-measure-grid`.
- `NcdMeasure.collect()` — returns the `measurements` sub-dict from the panel inputs (with `bmi`/`whr` computed numerics, same math as form_ncd.js — reuse the formula).
- `NcdMeasure.populate(m)` — fills the panel from a measurements dict.
- `NcdMeasure.clear()` — blanks the panel.
- `NcdMeasure.loadForSoap(episodeId, soapId)` — fetches `/ncd-measurements`, finds the row whose `soap_id === soapId`, populates the panel; clears if none.
- `NcdMeasure.save(episodeId, soapId)` — POSTs `{soap_id: soapId, note_date, measurements}` to `/api/episodes/<id>/ncd-measurements`. Called as the SECOND fetch (Step 4).

**B-rider-2 (FROZEN KEYS — no placeholders):** the panel's field set and key names MUST be the EXACT frozen battery keys emitted by Plan A Task 5 Step 3 (`hr, rr, bp, spo2, fbs, hba1c, cholesterol, ldl, hdl, triglycerides, height, weight, bmi, waist, hip, whr, subfatWhole…subfatLeg, muscleWhole…muscleLeg, visceralFat, rmr, walk6Rpe…balanceComment`). Copy that frozen list verbatim from Plan A — do NOT invent keys like `walk6`/`handGrip` shorthand. A mismatch = the trend reads `null` for that metric across every visit, silently. Cross-check the panel keys against Plan A's frozen comment block before wiring.

- [ ] **Step 3: Include the script + wire the guard**

In episode.html, add `<script src="/static/js/ncd_measure.js"></script>` near the existing `clinical_templates.js` include. Then hook the guard into the EXISTING `openSoapModal()` (episode.html:627) with a single additive line near the end (where it already does the `oBtn` form-type check at line 644–648 — same idiom, null-guarded):
```javascript
  // NCD-only: show measurements panel + prefill the row linked to THIS soap note (by FK, not session_no)
  if (window.NcdMeasure) {
    NcdMeasure.maybeShow(episode ? episode.form_type : '');
    if (soap && soap.id) NcdMeasure.loadForSoap(EPISODE_ID, soap.id);
    else NcdMeasure.clear();
  }
```
`loadForSoap` matches the measurement row by `soap_id === soap.id` — the FK lookup from the alignment fix, NOT a `session_no` guess. (The original session_no-match approach is the bug the cold vet caught; do not reintroduce it.) Purely additive: on non-NCD forms `maybeShow('MS')` keeps the panel hidden and does nothing else.

- [ ] **Step 4: Second-fetch on SOAP save (additive, no change to existing save)**

The existing `saveSoap()` (episode.html:678) POSTs the SOAP note and on success gets back `{success, id}` where `id` is the soap note's id. Do NOT modify its payload or route. Add the measurements write as a SECOND fetch AFTER the SOAP save succeeds, guarded by form type, passing the soap note's id as the FK. Minimal additive change inside `saveSoap()`'s success branch (after the response `j` is parsed, before/after `loadSoaps()`):
```javascript
    if (window.NcdMeasure && episode && episode.form_type === 'NCD') {
      // Link the measurement row to THIS soap note via soap_id (the alignment fix).
      // save_ncd_measurement upserts on (episode_id, soap_id) — new visit inserts,
      // edited visit updates. No session_no counter is trusted; no duplicate possible.
      NcdMeasure.save(EPISODE_ID, j.id);  // j.id = saved soap note id
    }
```
**Why this is now correct (was the bug):** the original plan assumed `save_soap` and `save_ncd_measurement` increment `session_no` "in lockstep." They do NOT — visit 1 (assessment) writes a measurement row with no soap note, so the counters are off by one from the first follow-up onward (see the alignment box in Task 1). The fix removes the counter dependency entirely: `NcdMeasure.save` passes `soap_id = j.id`, and `save_ncd_measurement` upserts on `(episode_id, soap_id)`. A brand-new follow-up inserts (no row with that `soap_id` yet); editing an existing follow-up updates (the `soap_id` already has a row). The executor does NOT need to track a measurement-row id — the natural key handles new-vs-edit. Verify in Step 6.

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

On the worktree, walk the REAL flow (the one the alignment fix exists for):
- **Visit 1 (assessment):** with the initial NCD form already saved (Task 5 auto-write), GET `/api/episodes/N/ncd-measurements` → exactly one row, `soap_id: null`.
- **Visit 2 (first follow-up):** "+ Follow-up" → the measurements panel appears below the SOAP fields → fill weight/BMI etc. + SOAP text → Save → GET measurements → now TWO rows; the new one has `soap_id` = the new soap note's id (NOT null). Confirm a soap note also persisted (`/soap`).
- **Edit visit 2:** reopen that follow-up → panel PREFILLS the saved numbers (proves `loadForSoap` matched by FK) → change weight → Save → GET measurements → still TWO rows, the follow-up row UPDATED (no duplicate, `soap_id` unchanged). This is the exact case the old session_no-match got wrong.
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

After a successful record save, if `_form_type === 'NCD'` and `episode_id` is set, POST the battery to `/api/episodes/<episode_id>/ncd-measurements`. Because Plan A now nests the battery under `collect().measurements` (A-rider-1), this is a literal pass-through — no extraction, no key remapping:
```javascript
    if (data._form_type === 'NCD' && data.episode_id) {
      fetch('/api/episodes/' + data.episode_id + '/ncd-measurements', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          // soap_id omitted (=> null) — this is the visit-1 assessment row
          note_date:    (data.patient && data.patient.date) || '',
          measurements: data.measurements || {}
        })
      });
    }
```
**Idempotency is now free** — no client-side GET-and-check needed. `save_ncd_measurement` upserts on `(episode_id, soap_id IS NULL)`: re-saving or editing the initial form lands on the SAME assessment row and UPDATEs it. Saving the initial form twice can never create two assessment rows (the upsert natural key guarantees it; verified in Task 2 Step 5).

**B-rider-1 — chosen behaviour, flagged not defaulted:** the visit-1 row uses `note_date = patient.date` (the assessment date), while SOAP-panel follow-up rows use the SOAP modal's date. These are normally the same day. If the clinician back-dates the assessment so `patient.date` ≠ the actual visit date, the trend's first column shows the assessment date, not the visit date. This is a deliberate choice (the assessment date IS the clinically meaningful date for visit 1, and it needs no extra UI). Documented here so it's a decision on record, not an accident. If it ever bites, the fix is to add a visit-date field to the initial form — out of scope for now.

- [ ] **Step 3: Hand-test**

On the worktree: create a fresh NCD episode → fill the initial form including some vitals/weight → Save Record → check `/api/episodes/N/ncd-measurements` shows exactly ONE row with `soap_id: null`, carrying the battery values. Edit the initial form, change weight, Save again → still ONE row (soap_id still null), updated weight (no duplicate — the upsert). Then add a follow-up via the SOAP panel → a SECOND row appears with `soap_id` set to the new soap note's id.

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

  // Headline metrics (D7). key = EXACT frozen battery key (Plan A Task 5 Step 3) — B-rider-2.
  // These are NOT placeholders: every key below must appear verbatim in Plan A's frozen list,
  // or the metric reads null across all visits and plots nothing, silently.
  var HEADLINE = [
    { key: 'weight',      label: 'Weight (kg)' },
    { key: 'bmi',         label: 'BMI' },
    { key: 'waist',       label: 'Waist (cm)' },
    { key: 'whr',         label: 'Waist/Hip' },
    { key: 'visceralFat', label: 'Visceral Fat' },
    { key: 'walk6Hr',     label: '6-min walk HR' },  // this borang's 6MWT tracks HR/RPE/BP, not distance; HR is the headline numeric
    { key: 'handGrip',    label: 'Hand grip (kg)' }
  ];

  // ── TRANSFORM: note_date-ordered series -> { dates:[], metrics:{key:[values...]} } ──
  // rows arrive already ordered by note_date (get_ncd_measurements ORDER BY note_date) —
  // the alignment fix orders the trend by real visit date, not by any session_no counter.
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
- **§5.3 SOAP-modal injection (additive, guarded) + two-fetch save + load-by-`soap_id` FK** → Task 4. ✅ RED LINE regression test mandatory (Task 4 Step 6, Task 7 Step 2.6).
- **SESSION_NO ALIGNMENT FIX (cold vet)** → Task 1 (soap_id FK column), Task 2 (upsert by natural key, order by note_date), Task 4 (loadForSoap + save-by-soap_id, false "lockstep" assumption removed), Task 5 (idempotency via upsert). ✅ The off-by-one that desynced the trend from the SOAP timeline is fixed at the schema level — alignment is now by construction.
- **§3 note / §11.3 auto-write the visit-1 assessment row on initial save (idempotent via upsert, soap_id=NULL)** → Task 5. ✅
- **A-rider-1 / B-rider-2 frozen battery keys** → Plan A Task 5 Step 3 emits the contract; Plan B Task 4 Step 2 + Task 6 Step 3 import it verbatim. ✅
- **B-rider-1 note_date = patient.date (chosen, flagged)** → Task 5 Step 2. ✅
- **§6 trend page (route, neutral topbar, headline metrics, sparklines, transform/render split, empty/sparse states, gap-not-zero)** → Task 6. ✅
- **§6 breadcrumb link (NCD-only)** → Task 4 Step 5. ✅
- **D1 trend never touches PDF/MPIS** → verified Task 6 Step 5, Task 7 Step 2.4–2.5. ✅
- **Two fetches, JSON blob, auto-write (§11 1–3)** → resolved at top, implemented Tasks 1–5. ✅
- Placeholder scan: DB functions, routes, sparkline/transform/render given in full code; the panel field-set + trend HEADLINE keys are now PINNED to Plan A's frozen battery contract (A-rider-1 / B-rider-2), not illustrative — the earlier `walk6`/`handGrip` placeholders are replaced with the frozen `walk6Hr`/`handGrip` keys and a cross-check instruction. ✅
- Type consistency: `measurements` sub-dict key used uniformly across save_ncd_measurement (stores it), get_ncd_measurements (parses it back), the panel collect/save, the auto-write, and the trend transform. `soap_id` used uniformly as the alignment FK across the table, save (upsert key), loadForSoap (match key), and the auto-write (NULL). ✅
```
