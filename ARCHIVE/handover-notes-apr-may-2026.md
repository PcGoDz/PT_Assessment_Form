# Handover Notes — Archive (Apr–May 2026)

Historical session handover notes from the original CLAUDE.md. Preserved for reference. Do NOT load every session — only consult when investigating "when did X happen" or "why did we make decision Y".

Sessions covered (chronological):
- 2026-04-25 — Session (8 hours)
- 2026-04-26 — Session + Code Review
- 2026-04-27 — Frontend Refactor + Code Review + Backend Fixes (Part 2)
- 2026-04-28 — NEURO Form, NEURO PDF Rewrite + Git Setup, NEURO Bug Fix
- 2026-05-01 — MPIS Modal + Session Header Modal
- 2026-05-07 — M3 UI Redesign
- 2026-05-09 — Patient Profile Wiring, UI Fixes + Seed Script
- 2026-05-16 — HAND Form Implementation (most recent — also summarized in HANDOVER.md)

Current session state lives in HANDOVER.md (root). This file is the audit trail.

---

## HANDOVER NOTE — NEURO Bug Fix Session 2026-04-28

### What happened this session

Short bug fix session immediately after first real-world test of the NEURO form.
8 bugs identified and resolved. No new features added. Files changed:
`templates/forms/neuro.html`, `static/js/form_neuro.js`, `static/css/style.css`, `templates/home.html`.

**Bugs fixed:**

1. **BodyChart SyntaxError on load** — `neuro.html` extra_js block had a second
   `<script src="bodychart.js">` tag. `bodychart.js` declares `const BodyChart` at IIFE level.
   Loading it twice caused "cannot redeclare block-scoped variable BodyChart" SyntaxError.
   Fixed: removed the duplicate script tag. `base.html` already loads it — extra_js must not.

2. **BodyChart null addEventListener** — neuro.html had `<div id="body-chart-container">`
   as a placeholder. `main.js init()` auto-calls `BodyChart.init()` when `#svg-ant` is found in DOM.
   `BodyChart.init()` directly attaches events to `#ptype-sel`, `#svg-ant`, `#svg-post` — it
   does NOT accept a container ID. Placeholder div → those IDs absent → null.addEventListener crash.
   Fixed: replaced placeholder with full embedded SVG body chart HTML (identical to ms.html).
   Also removed the manual `BodyChart.init()` call from extra_js — main.js handles it automatically.

3. **Sex and RN fields present on form** — Sex is auto-derived from NRIC (odd/even last digit).
   RN = referral number = NRIC in KKM workflow. Both fields are already handled by the
   shared patient header. Removed both `<div class="field">` blocks from neuro.html.

4. **Chief complaint chips only, no free text** — User needed a textarea for patient's own words
   below the chip multi-select. Added `<textarea id="complaint-text">` after the chip group.
   Wired in form_neuro.js: `collect()` adds `complaint_text: gv('complaint-text')`,
   `populate()` calls `sv('complaint-text', d.complaint_text)`, `reset()` includes `'complaint-text'`.

5. **Chips rendered as plain text (`.chip` CSS missing)** — `.chip` and `.chip-group` classes
   were never defined in style.css. Only `.irr-chip` (amputation) and `.pt-chip` (body chart)
   existed. The chips displayed as unstyled inline text with no borders, no toggle behaviour.
   Fixed: added full `.chip-group` / `.chip` / `.chip.active` / dark mode variant block to style.css
   after the `.irr-chip` section. Chip CSS is now shared across NEURO and any future form that uses it.

6. **NEURO episode modal card greyed out** — `home.html` has a hardcoded episode modal (not
   driven by FORM_REGISTRY). The NEURO card still had class `soon` and no `onclick` from the
   previous session's "all 15 cards shown, not-ready greyed" modal overhaul. Fixed: removed `soon`
   class, removed "Soon" badge span, added `onclick="selectForm(this)"`, changed icon to `&#9889;`.
   Also added `NEURO:'Neurological'` to the formLabel map and `NEURO:'&#9889;'` to the icon map.

7. **No template buttons** — `ClinicalTemplates.addButton()` calls were missing from neuro.html
   extra_js. Fixed: added a `DOMContentLoaded` listener with 6 calls (impression_bsf, impression_al,
   impression_pr, stg, ltg, plan). The NEURO assessment template categories in clinical_templates.js
   were already added in the prior session.

8. **422 on Save Record and Export KKM PDF** — `validate_record()` in `database.py` reads form
   type via `data.get('meta', {}).get('form', 'MS')`. `form_neuro.js collect()` was only setting
   `_form_type: 'NEURO'` — no `meta` block. Validator fell back to `'MS'`, applied MS
   REQUIRED_FIELDS against NEURO data → mismatches → 422.
   Fixed: added `meta: { form: 'NEURO' }` to the `collect()` return object.
   Verified with `node --check static/js/form_neuro.js` → OK.

---

### Retrospective

**What went wrong and why:**

- **The `meta.form` / `_form_type` split is a footgun.** Two separate keys serve two separate
  consumers (PDF routing vs. validator) and there's nothing in the checklist that reminds you to
  set both. The new form checklist says "set `_form_type` in collect()" but says nothing about
  `meta.form`. This gap caused the 422. Added to the gotchas section of the top-of-file summary
  and to Anti-Repeat Rules below.

- **The body chart placeholder was a half-measure.** Writing `<div id="body-chart-container">`
  as a todo-placeholder creates a category of bug that only surfaces at runtime when `BodyChart.init()`
  runs and the expected IDs aren't there. The correct approach is always: embed the real SVG HTML
  from ms.html, or don't have a body chart section at all.

- **The chip CSS gap was invisible until render.** `.chip` was used in 7 places in neuro.html
  before anyone checked that the class existed in style.css. Because chips were pre-existing code
  from the form design phase, the assumption was "chip CSS is there somewhere." It wasn't. Rule:
  when using a CSS class that isn't in a standard library, grep for it in style.css before assuming.

- **NEURO modal card was missed in the home.html overhaul.** The "show all 15 forms with not-ready
  greyed" session updated the modal HTML, but NEURO wasn't ready at that point — it got `soon`
  class correctly. Then NEURO was built but home.html wasn't revisited. Lesson: FORM_REGISTRY
  ready=True changes must trigger a home.html modal card review as part of the checklist.

**What went well:**

- `node --check` on form_neuro.js caught nothing — the 422 fix was syntactically clean.
- All 8 bugs were diagnosed from first principles from the console errors + code read,
  no guessing. Root cause was right every time.
- The chip CSS fix was additive — it didn't touch existing `.irr-chip` or `.pt-chip` selectors.

**What we'd do differently:**

- Add a "does this CSS class exist?" check to the form build process for any custom class used
  in chip groups, sliders, or other non-standard UI patterns.
- Add home.html modal card review to the new form checklist (step after FORM_REGISTRY ready=True).
- Make `meta: { form: 'XXX' }` explicit in the form JS template alongside `_form_type`.

---

### Known issues (updated as of 2026-04-28)

**Still open:**
- Age auto-calculation (NRIC→age, DOB→age) — unresolved, deprioritised
- Geriatric duplicate RN/IC fields — cosmetic, low priority
- No UNIQUE constraint on `records.episode_id` — ORDER BY workaround in place
- `audit_log` FK has no ON DELETE CASCADE — orphaned audit rows harmless but untidy
- `pt_assessment.spec` datas includes `templates/pdf` redundantly
- No ARIA attributes anywhere — low clinical priority
- Accessibility: sidebar nav uses onclick divs, not buttons — not keyboard navigable
- `resetPatient()` in `form_base.js` missing null guards on `derived-dob`/`derived-gender`
- `api.js` episode/SOAP coverage inconsistent (inline fetches in templates)
- NEURO exe build NOT tested — code is fixed, build verification deferred to next session

**Fixed this session:**
- BodyChart SyntaxError (duplicate script tag in neuro.html extra_js) ✓
- BodyChart null addEventListener (placeholder div instead of real SVG HTML) ✓
- Sex / RN fields removed from neuro.html ✓
- Chief complaint textarea added below chips ✓
- `.chip` / `.chip-group` CSS classes added to style.css ✓
- NEURO episode modal card `soon` class and missing onclick fixed in home.html ✓
- ClinicalTemplates.addButton() calls added in neuro.html extra_js ✓
- 422 on save/PDF: `meta: { form: 'NEURO' }` added to form_neuro.js collect() ✓

---

### Next session priorities

1. **Git push** — 5+ sessions and counting. Do it first, before opening any files.
2. **Full exe build test** — all 6 forms end-to-end. NEURO is code-complete but untested in the built exe.
3. **HAND form** — next new form. Simpler than NEURO (no MRMI, no MRCP, no ICF structure). Good session warmup.
4. **Validation layer UI** — surface REQUIRED_FIELDS errors to the user before save attempt. Backend is done; frontend just needs to show the error list from the 422 response body.

---

### New architecture rules / gotchas to add to checklist

**collect() must set BOTH `_form_type` AND `meta.form`:**
  ```javascript
  return {
    _form_type: 'NEURO',      // used by: getCurrentFormType() → ?form_type= query param → PDF routing
    meta: { form: 'NEURO' },  // used by: validate_record() in database.py → REQUIRED_FIELDS lookup
    ...
  };
  ```
  Missing `_form_type` → wrong PDF generator used. Missing `meta.form` → validator defaults to MS → 422.
  Both are required. Both must match. Add this to the new form checklist (step 4, form_xxx.js creation).

**home.html modal card review is part of FORM_REGISTRY ready=True:**
  When you flip a form from `ready=False` to `ready=True`, ALSO check home.html episode modal.
  The modal is hardcoded (not driven by FORM_REGISTRY). The `soon` class and missing `onclick`
  will not be caught by the sidebar — the sidebar IS dynamic. The modal is not.
  Add to checklist between step 1 (FORM_REGISTRY ready=True) and step 2 (FORM_TEMPLATES).

**Chip CSS is now shared via `.chip` / `.chip-group` in style.css:**
  All chip multi-selects across any form use these classes. Do NOT redefine chip styles per-form.
  Do NOT use `.irr-chip` for new forms — that's amputation-specific (has its own colour scheme).
  Before using any custom CSS class in a new form, grep for it in style.css first.

**BodyChart requires real SVG DOM nodes — never use a placeholder div:**
  `BodyChart.init()` in `main.js` fires automatically when `#svg-ant` is detected.
  It directly attaches event listeners to `#ptype-sel`, `#svg-ant`, `#svg-post`.
  If these IDs are absent (e.g. placeholder div used instead), it throws and body chart is dead.
  Copy the full SVG block from ms.html. There is no initialisation call to make — main.js handles it.

---

## HANDOVER NOTE — NEURO Form Session 2026-04-28

### What happened this session

Built the NEURO (Neurology) assessment form from scratch. Full implementation across all 6
required files. Session split across two context windows (context compacted mid-session).

**Files created:**
- `templates/forms/neuro.html` — 11-section form using chip multi-selects for high-frequency
  lists (complaints, limbs, PMHx, observation, gait, plan), radio buttons for binary/trinary
  choices, Ashworth dropdowns (0/1/1+/2/3/4), MRMI auto-total, 10MWT speed auto-calc,
  outcome risk flags (TUG, Berg, FRT), dynamic tables (investigations, medications, MMT, ROM),
  body chart, ICF-structured PT Impression (BSF / Activity Limitation / Participation Restriction)
- `static/js/form_neuro.js` — NeuroForm IIFE (~580 lines). window.ActiveForm + window.Form
  contract fulfilled. node --check passed. Named functions for all dynamic table rows
  (no inline onclick JS). All chip/radio/slider/select patterns follow established conventions.
- `pdf_neuro.py` — 2-page KKM layout (MOH/P/FIS/27.25(HB)-e). Page 1: two_col with
  subjective/history left, objective/clinical right, then full-width MMT + ROM + body chart.
  Page 2: two_col with balance/MRMI/gait left, outcomes/impression/goals right.
  story.append() (not +=) for two_col and body_chart_section. _ensure_dict() throughout.
  sign_chop_block() footer.

**Files modified:**
- `app.py` — import pdf_neuro, _PDF_GENERATORS['NEURO'], _SINGLE_PDF_GENERATORS['NEURO'],
  FORM_REGISTRY ready=True, FORM_TEMPLATES['NEURO']
- `database.py` — REQUIRED_FIELDS['NEURO'] (diagnosis + pt_impression)
- `static/js/main.js` — copyToMpisNeuro() (~120 lines), NEURO dispatch in copyToMpisAuto(),
  copyToMpisNeuro exported from return object
- `static/js/clinical_templates.js` — NEURO_SOAP (objective/analysis/plan templates)
- `templates/episode.html` — tplMap NEURO: NEURO_SOAP
- `pt_assessment.spec` — pdf_neuro.py added to datas

**Key design decisions:**
- Chip multi-selects for: complaints, limbs affected, PMHx, prev mobility aid, vision, hearing,
  appearance, consciousness, posture, mobility obs, emotional obs, resp obs, devices,
  cognitive, sitting/standing balance, gait pattern, walking aid, turning, other outcomes, plan
- Ashworth Modified Scale for tone: dropdowns with 0/1/1+/2/3/4 options
- MRMI: 8 <select> dropdowns (0–5), JS auto-calculates total on every change
- 10MWT: time input + auto-displayed speed (10/t m/s)
- Outcome risk flags: TUG (>13.5s stroke, >11.5s PD), Berg (<45), FRT (<15 high, 15-25 moderate)
- ICF-structured impression: BSF / AL / PR — three separate textareas
- copyToMpisNeuro(): outputs NEURO flags inline (⚠/⚡/✓) within the outcome lines

### Retrospective

**What went well:**
- Context compaction mid-session worked cleanly — the summary accurately captured all
  data field names from form_neuro.js, making copyToMpisNeuro() easy to write without re-reading.
- 6-registry verification grep (`grep NEURO app.py database.py spec`) caught everything at once.
  Anti-repeat rule from CLAUDE.md applied correctly.
- node --check on both main.js and clinical_templates.js passed first time. No syntax errors.
- The chip UI pattern established in amputation carried over cleanly to neuro — no new patterns
  needed, just more chips.

**What was fiddly:**
- Nothing major this session. The session was split across context windows but the summary
  was detailed enough that resumption was seamless.
- episode.html edit hit "File has not been read yet" — needed a Read before Edit.
  This is a recurring friction point. Always read before editing, even for one-liner changes.

**What we'd do differently:**
- The two-context-window split is inevitable for long form builds. The summary captured enough
  to resume cleanly. No changes needed to the workflow — this worked.
- NEURO form has more sections than any previous form (11 vs ~8 for amputation).
  For future complex forms (SCI, VESTIBULAR), consider building section-by-section
  with intermediate syntax checks rather than writing the full HTML in one pass.

### Known issues (updated as of 2026-04-28)

**Still open:**
- Age auto-calculation (NRIC→age, DOB→age) — unresolved, deprioritised
- Geriatric duplicate RN/IC fields — cosmetic, low priority
- No UNIQUE constraint on `records.episode_id` — ORDER BY workaround in place
- `audit_log` FK has no ON DELETE CASCADE — orphaned audit rows harmless but untidy
- `pt_assessment.spec` datas includes `templates/pdf` redundantly
- No ARIA attributes anywhere — low clinical priority
- Accessibility: sidebar nav uses onclick divs, not buttons — not keyboard navigable
- `resetPatient()` in `form_base.js` missing null guards on `derived-dob`/`derived-gender`
- `api.js` episode/SOAP coverage inconsistent (inline fetches in templates)
- NEURO exe build NOT tested yet — full build test is next session's first task

**Fixed this session:**
- NEURO form full implementation ✓

### What to do next session
1. **Git push** — still deferred. Do it first.
2. **Full exe build test** — all 6 forms end-to-end (MS, SPINE, GERIATRIC, CR, AMPUTATION, NEURO)
3. **HAND form** — next new form, simpler scope (no MRMI, no lung diagram, no complex balance section)
4. Validation layer UI — surface REQUIRED_FIELDS errors before save

### Architecture reminders / new rules
- **NEURO-specific collect() keys** — key names are: `pt_impression` (BSF), `pt_impression_al`,
  `pt_impression_pr`, `mrmi_turn/lying_sit/sit_balance/sit_stand/standing/transfer/walk/stairs`,
  `mwt10_time`, `tug_time`, `berg_score`, `frt_score`, `sixmwt_dist`, `borg_rpe`.
  The MPIS formatter uses these directly. Keep consistent if re-visiting the form.
- **ICF impression pattern** — BSF / Activity Limitation / Participation Restriction split into
  3 textareas. This is the correct clinical framing for NEURO. Consider reusing for SCI/VESTIBULAR.
- **Chip-heavy forms** — when >50% of fields are chips, the collect() function stays clean but
  the reset() function needs explicit enumeration of all chipGroups arrays. Don't miss any group.

---

## HANDOVER NOTE — Code Review + Backend Fixes Session 2026-04-27 (Part 2)

### What happened this session

Short focused session: full backend code review followed by two targeted fixes.
No new features. Files changed: `database.py`, `templates/home.html`.

**What was reviewed:**
- `app.py` — routes, PDF dispatch, FORM_REGISTRY
- `database.py` — all CRUD functions, validation, schema
- `form_base.js` — shared patient helpers, age calc, NRIC derive
- `api.js` — fetch wrappers

**Bugs fixed:**

- `delete_patient()` in `database.py` — multi-step cascade delete had no transaction boundary.
  If any step failed mid-way (e.g. SOAP notes deleted, records delete throws), data would be
  left in a half-deleted state with no rollback. Fixed by wrapping all deletes in `with conn:`
  (SQLite context manager = atomic transaction, auto-rollback on exception). Removed the
  explicit `conn.commit()` that was at the end — `with conn:` handles that.

- `update_episode_status()` in `database.py` — discharge reason was encoded as
  `"discharged|Reason text"` in the `status` column. Any reason containing a pipe `|`
  character would corrupt the `split('|')` parsing on the frontend. Fixed by:
  1. Adding `discharge_reason TEXT DEFAULT ""` column to `episodes` via safe migration
     in `init_db()` (same try/except OperationalError pattern as soap_notes migration)
  2. `update_episode_status()` now writes `status='discharged'` clean, reason goes to
     `discharge_reason` column separately
  3. `home.html` status parsing now reads `ep.discharge_reason` directly, with a
     backwards-compat fallback to the old `split('|')[1]` for any existing records
     that still have the pipe encoding in their status field

**Issues identified but NOT fixed (deferred):**
- `resetPatient()` in `form_base.js` calls `getElementById('derived-dob')` and
  `getElementById('derived-gender')` without null guards. Will crash if a future form
  omits those elements. Low risk until we build such a form.
- `api.js` has no episode or SOAP methods — fetch calls for those are scattered inline
  in templates. Inconsistent but not broken.
- `app.secret_key` hardcoded — fine for localhost-only, note if sessions ever used.
- `export_episode_pdf()` silent failure path — if `assessment` is falsy and `ep` has
  no patient_name, PDF generates with blank patient fields. No crash, just confusing output.

---

### Retrospective

**What went well:**
- Both fixes were genuinely low-risk: additive schema change + transaction wrap.
- Backwards-compat fallback on home.html means existing DBs with pipe-encoded status
  still display correctly without a data migration.
- `python -c "import database"` sanity check caught nothing (good).

**What went wrong:**
- `update_episode_status()` str_replace missed the closing `except/finally` block of the
  original function — left orphaned `conn.commit() / return True / except / finally`
  code after the new `finally: conn.close()`. Python would have raised a SyntaxError
  on the orphaned `except` outside any `try`. Caught immediately by re-reading the
  function after the edit. Required a second str_replace to clean up.
- This is the same orphaned-code trap documented 4 sessions in a row. The fix: always
  view the full function after any str_replace, not just the replaced block.

**What we'd do differently:**
- Plan first, then execute. The fixes were correct but the str_replace for
  `update_episode_status()` tried to replace only the body and missed the tail.
  When replacing a function that has try/except/finally, include the entire function
  signature-to-end in the old_str to avoid partial matches.

---

### Known issues (updated as of 2026-04-27)

**Still open:**
- Age auto-calculation (NRIC→age, DOB→age) — unresolved, deprioritised
- Geriatric duplicate RN/IC fields — cosmetic, low priority
- No UNIQUE constraint on `records.episode_id` — ORDER BY workaround in place
- `audit_log` FK has no ON DELETE CASCADE — orphaned audit rows harmless but untidy
- `pt_assessment.spec` datas includes `templates/pdf` redundantly
- No ARIA attributes anywhere — low clinical priority
- Accessibility: sidebar nav uses onclick divs, not buttons — not keyboard navigable
- `resetPatient()` in `form_base.js` missing null guards on `derived-dob`/`derived-gender`
- `api.js` episode/SOAP coverage inconsistent (inline fetches in templates)

**Fixed this session:**
- `delete_patient()` partial cascade delete risk ✓ (atomic transaction)
- Discharge reason pipe-encoding fragility ✓ (dedicated `discharge_reason` column)

---

### What to do next session
1. **Git push** — see persistent reminder above. Do it first.
2. HAND or NEURO form (HAND simpler warmup, NEURO higher clinical volume)
3. Full exe build test — all 5 forms end-to-end, including discharge/reactivate flow
4. Validation layer UI — surface REQUIRED_FIELDS errors before save (backend already done)
5. Fix `resetPatient()` null guards before building any form that omits derived-dob/gender

### Architecture reminders / new rules
- **`discharge_reason` is now its own column.** Do NOT go back to pipe-encoding status.
  Any new status-related reason fields follow the same pattern: dedicated column + safe migration.
- **When replacing a try/except/finally function:** include the full function from `def`
  to the last `conn.close()` in old_str. Never replace just the try block — you will
  leave the old except/finally as orphaned syntax.
- **`with conn:` = atomic transaction in SQLite.** Use it for any multi-step write
  operation where partial completion would leave bad state. Remove explicit `conn.commit()`
  inside the `with` block — it's redundant and misleading.

---

## Lessons Learned — MPIS Modal Session 2026-05-01

1. **Stale Flask process is the most common 500 mystery.** When all API endpoints return 500
   with HTML (doctype visible), and local Python tests pass fine, the running server is an old
   process. Same error memory addresses across two requests confirms it. Diagnosis: run
   `python -c "import app; ..."` with Flask test client — if that returns 200, restart the server.
   The code is fine. This is a process problem, not a code problem.

2. **Promise-based modal pattern for async user input.** The MPIS session header modal needed
   to pause copyToMpisXxx() while waiting for user input, then resume with the header object.
   Pattern: `showMpisHeaderModal()` returns a `new Promise(resolve => { _mpisModalResolve = resolve; })`.
   The confirm/cancel buttons call `_mpisModalResolve(header)` / `_mpisModalResolve(null)`.
   The async wrapper: `var h = await showMpisHeaderModal(); if (!h) return;`. Clean, no callbacks.

3. **Builder/wrapper/finalizer is the right split for any operation with shared pre/post work.**
   With 6 formatters all needing the same modal + POMR header/footer, the wrong design is
   putting modal logic in each formatter. The right design: builders return pure data (parts[]),
   a single finalizer wraps + copies, wrappers sequence them. Adding formatter 7 = one builder
   function + one 2-line wrapper. Zero changes to finalizer, modal, or copyToMpisAuto switch.

4. **Label changes that don't touch DB columns need to be searched carefully.**
   "Date of Referral" lived in: home.html (New Episode modal label), home.html (episode card text),
   episode.html (context banner). Three separate locations, two templates. grep for the string
   first — don't assume it's in one place. The episode.html banner also had an em-dash character
   that prevented Edit tool from matching. Fix: PowerShell `$content -replace` with regex.

5. **`node --check` is the final gate before commit for any main.js change.**
   The MPIS refactor touched ~300 lines across 6 functions. `node --check` caught nothing,
   which confirmed the syntax was clean. Never commit a main.js change without running this.
   Also useful: grep for "await copyText" in main.js after refactor — should appear exactly once
   (inside `_doCopyMpis`). Any other match = a builder that wasn't cleaned up.

### What we should have done differently

- **Diagnose the stale process earlier.** When the user reported 500s on basic GET endpoints,
  the first step should have been "restart Flask." Instead, we ran several Python import tests
  before arriving at the same conclusion. The tell: HTML in a JSON endpoint response = wrong process.
  New rule: 500 on GET + HTML response → restart Flask first, investigate after.

- **The label rename should have been one grep sweep first, then edit all occurrences.**
  We edited home.html, then found episode.html had a different format with em-dash issues.
  A `grep -rn "Referral" templates/` would have shown all locations upfront.

### Known issues (updated as of 2026-05-01)

**Still open:**
- Age auto-calculation (NRIC→age, DOB→age) — unresolved, deprioritised
- Geriatric duplicate RN/IC fields — cosmetic, low priority
- No UNIQUE constraint on `records.episode_id` — ORDER BY workaround in place
- `audit_log` FK has no ON DELETE CASCADE — orphaned audit rows harmless but untidy
- `pt_assessment.spec` datas includes `templates/pdf` redundantly
- No ARIA attributes anywhere — low clinical priority
- `.topbar-sub` CSS media query in style.css targets a removed element (harmless dead selector)
- Bug 2: SOAP gate before first assessment — not implemented, pending scope clarification
- Full exe build untested since NEURO was added

**Fixed this session:**
- MPIS session header modal — all 6 assessment formatters prompt for session info before copy ✓
- All 6 MPIS formatters refactored to builder/wrapper/finalizer pattern ✓
- "Date of Referral" → "Date of Assessment" label across home.html + episode.html ✓
- Static KKM serial number removed from topbar ✓
- 500 errors: confirmed stale Flask process, not code bugs ✓

---

## HANDOVER NOTE — MPIS Session Header Modal 2026-05-01

### What happened this session

Two main work streams: (1) implemented the MPIS session header modal for all 6 assessment
formatters, and (2) diagnosed 500 errors as a stale Flask process. Also label rename and
topbar cleanup. Session ended with context compaction mid-CLAUDE.md update.

**Files modified:**

- `templates/base.html` — Added `#mpis-overlay` and `#mpis-modal` HTML (before patient panel comment).
  Modal has 6 fields: Tarikh (date), Nombor Giliran (text), KPI-SS-30 Minit (select), Dilihat (text),
  Temujanji Tarikh (date), Temujanji Masa (time). Cancel → `Main.cancelMpisModal()`, confirm → `Main.confirmMpisModal()`.
  Also: removed `.topbar-sep` + `.topbar-sub` divs (static KKM serial number).

- `static/css/style.css` — Added `.mpis-overlay` + `.mpis-modal` CSS block before TOAST section.
  Grid layout: 2 columns, smooth show transition via transform + opacity on `.show` class.

- `static/js/main.js` — Major MPIS refactor:
  - Added `_mpisModalResolve` module-level state var
  - Renamed all 6 formatters: `copyToMpisXxx()` → `_buildMpisXxx()` (sync, returns parts[])
  - Removed trailing `await copyText(...)` from each builder (replaced with `return parts`)
  - Added: `showMpisHeaderModal()`, `cancelMpisModal()`, `confirmMpisModal()`, `_doCopyMpis(parts, header)`
  - Rewrote all 6 public `copyToMpisXxx()` wrappers as async one-liners
  - Rewrote `copyToMpisAuto()` to show modal once then dispatch to builder
  - Added `cancelMpisModal` + `confirmMpisModal` to return {} export

- `templates/home.html` — "Date of Referral" → "Date of Assessment" (modal label + episode card text)

- `templates/episode.html` — "Referral: " → "Assessment: " in context banner
  (required PowerShell regex due to em-dash multibyte chars in file)

**Key design decisions:**

- **Builder/wrapper/finalizer**: the cleanest separation for 6 formatters sharing modal + POMR wrapping.
  Each builder is pure (no side effects), the finalizer is the single clipboard write point.
- **Promise-based modal**: module-level `_mpisModalResolve` bridges async wrappers to button clicks.
  No callbacks, no event emitters — just a Promise + a stored resolve function.
- **POMR output format**: TARIKH / NOMBOR GILIRAN / KPI-SS-30 MINIT / DILIHAT / [content] / TEMUJANJI.
  Empty fields are omitted (only push if value is non-empty). Matches dept Word template exactly.

### Retrospective

**What went well:**
- The builder pattern was obvious once we saw the problem. The refactor was mechanical,
  `node --check` passed first time, and grep-for-`await copyText` confirmed exactly 1 hit.
- 500 error diagnosis was systematic and conclusive: Flask test client all 200 → stale process.

**What was fiddly:**
- episode.html em-dash caused Edit tool to fail silently (old_string not matching). Had to use
  PowerShell regex. Lesson: for files with non-ASCII characters, reach for PowerShell earlier.
- Context compaction mid-CLAUDE.md write. The summary captured everything needed to resume.

**What we'd do differently:**
- Grep all template files for a label before starting an edit. Would have caught all 3 locations
  of "Referral" upfront instead of discovering episode.html separately.
- "Restart Flask first" should be step 1 for any 500 mystery, not step N.

### Next session priorities

1. Restart Flask → verify patient registration works (was 500 due to stale process, should be fine now)
2. UI redesign brainstorm — user explicitly asked, patient detail page hierarchy needs rethinking
3. Full exe build test — all 6 forms, first test since NEURO added
4. HAND form — next new form when UI brainstorm is done

### Architecture reminders / new rules

- **MPIS builder pattern is the standard.** New formatter = `_buildMpisXxx()` + `copyToMpisXxx()` wrapper + switch case in `copyToMpisAuto()`. Never put `copyText` or `showMpisHeaderModal` inside a builder.
- **episodes.referral_date is labelled "Date of Assessment" in the UI.** The column name is unchanged — only the display label changed. Do not rename the DB column.
- **Stale process rule:** 500 on any GET endpoint + HTML in response body → restart Flask before debugging code.

## HANDOVER NOTE — Frontend Refactor Session 2026-04-27

### What happened this session

Short focused session: frontend code review followed by targeted refactoring.
No new features, no backend changes. All changes are in main.js and base.html only.

**Bugs fixed:**

- `draft-indicator` (base.html line 202) had `display:none` written twice in the same
  inline style attribute. The second declaration overwrote `align-items:center`, so when
  JS showed the indicator via `style.display = ''` it rendered as block — dot and "draft saved"
  text stacked vertically instead of inline.

- `draft-banner` had a CSS class system (`.draft-banner { display:none }` /
  `.draft-banner.show { display:flex }`) defined in the `<style>` block, but the actual
  element used inline `style="display:none"` with no class, and JS toggled it via
  `banner.style.display = ''`. The class toggle was completely disconnected. Unified to
  use the class system: element now has class `draft-banner`, JS calls
  `classList.add/remove('show')`.

- `showDraftIndicator(true)` was setting `style.display = ''` (inherits as block) instead
  of `style.display = 'flex'`. Fixed.

- `loadRecordsList()` interpolated `r.patient_name`, `r.patient_date`, `r.form_type`
  directly into `innerHTML` string. Wrapped with `escapeHtml()`. Low-risk in a local app
  but trivial to fix now that the helper exists.

**Refactoring done (main.js):**

- Added 3 shared MPIS constants at top of Main IIFE:
    `MPIS_LN`, `MPIS_DIV`, `MPIS_DASH`
  Previously each of the 5 `copyToMpis*` functions redeclared these identically.

- Added `escapeHtml(str)` — sanitises strings before innerHTML injection.

- Added `copyText(str)` — single implementation of the clipboard try/catch fallback.
  Previously copy-pasted verbatim into all 5 MPIS functions (25 lines × 5 = 125 lines gone).

- Added `mpisSec(parts, title, val)` — the shared section helper.
  Previously `function sec(title, val)` was redeclared inside each of the 5 MPIS functions.

- Each `copyToMpis*` function now declares:
    `var LN = MPIS_LN; var DIV = MPIS_DIV; var dash = MPIS_DASH;`
    `function sec(title, val) { mpisSec(parts, title, val); }`
  and ends with `await copyText(parts.join(LN));` instead of the clipboard block.

- Topbar button order in base.html corrected to match documented spec:
    `[← Return | Save & Return] | [+ New | Clear] | [🌙 | Copy to MPIS | Export KKM PDF] | [Save Record]`
  Previously "Destructive group" comment label was misleading; New/Clear aren't destructive
  (New auto-saves). Comment updated to "Form group".

**net result:** main.js 1164 → 1126 lines. All public APIs unchanged.

---

### Retrospective

**What went smoothly:**
- The refactor was safe because all helpers produce identical output — just extracted, not changed.
- `node --check` caught nothing (good). All 3 modified JS files passed.
- str_replace discipline held up — re-read file after each edit, no orphaned code.

**What was fiddly:**
- The spine `copyToMpisSpine()` refactor accidentally consumed the `parts.push('SPINE ASSESSMENT')`
  line inside the str_replace. Caught by re-reading the function immediately after the edit.
  Required a second pass to restore it. This is the orphaned-code pattern in reverse —
  the replacement omitted a line rather than leaving dead code behind. Always re-read.

**What we'd do differently:**
- The CSS class vs inline style conflict on draft-banner was a "define it twice" bug —
  the class was defined in CSS but the element never used it. In future: if a class exists
  for show/hide behaviour, don't also add inline style to the element. Pick one mechanism.
- `display:''` to "reset" an element is fragile — it inherits the element's default
  (block for div), which isn't always what you want. Prefer explicit `display:'flex'`
  or `display:'block'` when the rendered type matters.

---

### Known issues (updated)

**Still open:**
- Age auto-calculation (NRIC→age, DOB→age) — unresolved, deprioritised
- Geriatric duplicate RN/IC fields — cosmetic, low priority
- No unique constraint on episode_id in records table — ORDER BY workaround in place
- audit_log FK has no ON DELETE CASCADE — orphaned rows harmless but untidy
- pt_assessment.spec datas includes templates/pdf redundantly
- No ARIA attributes anywhere (toast, progress bar, sidebar nav) — low clinical priority
- Accessibility: sidebar nav uses onclick divs, not buttons — not keyboard navigable

**Fixed this session:**
- draft-indicator duplicate display:none ✓
- draft-banner class/inline style conflict ✓
- showDraftIndicator() block vs flex ✓
- XSS in loadRecordsList() innerHTML ✓
- Topbar button order ✓
- MPIS code duplication (5× sec/LN/DIV/clipboard) ✓

---

### What to do next session
1. Git push — this has been on the list for 3 sessions
2. HAND or NEURO form (HAND simpler, NEURO higher clinical value)
3. Full exe build test (all 5 forms end-to-end)
4. Validation layer UI — surface REQUIRED_FIELDS errors to the user before save

### Architecture reminders for next session
- New MPIS formatter: use MPIS_LN/DIV/DASH + mpisSec() + copyText() — see step 8 of checklist
- Shared helpers live at the top of the Main IIFE (lines ~10–40 in main.js)
- Draft banner: uses CSS `.show` class toggle, not `style.display`
- Always re-read the full replaced function after any str_replace — missing lines are as
  dangerous as orphaned lines, and harder to spot

---

## HANDOVER NOTE — Code Review Session 2026-04-26

### What happened this session

Short focused session: full code review of the codebase, followed by targeted bug fixes.
No new features added. All changes are correctness/quality fixes.

**Bugs fixed:**
- `export_pdf()` in app.py had 8 lines of dead code after `return response` — leftover
  from a str_replace that didn't remove the old body. Included a duplicate `except Exception`
  block that could silently swallow errors. Removed entirely.
- `get_episode_record()` used `fetchone()` with no `ORDER BY`. If two records ever existed
  for one episode, SQLite returned whichever it felt like. Now `ORDER BY updated_at DESC LIMIT 1`.
- `api_stats()` used `__import__('database')` and `__import__('flask')` despite both being
  already imported at top of file. Replaced with direct `get_conn` and `jsonify` calls.
- Migration `ALTER TABLE` caught bare `Exception` — masks real errors like disk-full or
  column name typos. Narrowed to `sqlite3.OperationalError`.

**Issues identified but deferred (see TODO):**
- 5 copy-paste form route handlers in app.py — should be one generic `/form/<form_id>` route
- No `ON DELETE CASCADE` on FK declarations — manual cascade in delete_patient() covers it,
  but schema should document intent explicitly
- CR and AMPUTATION missing from REQUIRED_FIELDS — those forms save with empty diagnosis
- `get_episode_record()` has no unique constraint on episode_id in records table — multiple
  records per episode is possible; ORDER BY fixes the symptom but not the root cause
- `audit_log` FK has no ON DELETE CASCADE — audit rows from update operations persist
  after a record is deleted (orphaned but harmless)
- `pt_assessment.spec` datas includes `templates/pdf` redundantly (already under `templates`)

### What to do next session
1. HAND or NEURO form — HAND is simpler warmup, NEURO is higher clinical value
2. Add CR + AMPUTATION to REQUIRED_FIELDS while the file is open
3. Git push — seriously, do this first
4. Full exe build test (all 5 forms end-to-end)

---

## HANDOVER NOTE — Session 2026-04-26

### What happened this session (~8 hours)

Long session covering Amputation form from scratch, multiple PDF layout iterations,
architectural improvements, and planning discussions.

**Amputation Form (fully implemented):**
- Full HTML form (12 sections): patient info, diagnosis, pain+phantom, special questions,
  prosthetic usage, body chart, history, observation, palpation/CR, movement+MMT,
  stump measurement + outcome (MRMI/TUG/2MWT with skip option), PT impression + goals
- form_amputation.js with full collect/populate/reset, pain sliders, irr chips,
  management dropdown with surgery date reveal, phantom toggle, outcome skip toggle,
  MMT table with named addMmtRow()/addMovRow() functions (no inline onclick JS)
- pdf_amputation.py: KKM-style two-column layout with continuous ruled sections,
  _ensure_dict() for JSON string handling, sign_chop_block() for sign/chop footer
- MPIS formatter copyToMpisAmputation() in main.js
- AMPUTATION_SOAP templates with objective category (MRMI scoring template)
- Body chart properly wired: bodyChart key (camelCase), getData()/loadData()/clearAll()

**Infrastructure improvements:**
- Episode modal: all 15 forms shown, not-ready greyed with "Soon" badge
- sign_chop_block() helper in pdf_platypus_base — all 5 generators now use it
- Session header fields in SOAP modal: Nombor Giliran, KPI-SS-30 min, Dilihat, Temujanji
- SOAP MPIS output follows actual dept POMR format (Malay headers)
- DB migration for soap_notes new columns (safe ALTER TABLE + try/except)
- getCurrentFormType() fixed to check _form_type first
- exportPdf() autosave on dirty form (not just unsaved)
- clinical_templates insert() null focus bug fixed

**Planning discussion:**
- Acknowledged this is drifting toward a dept-wide system (both Claude and GPT senior dev noticed)
- Reviewed GPT senior dev recommendations: validation, draft/final state, audit trail,
  schema versioning, UI friction. All valid. Priority: finish forms first, then harden.
- POMR docs exist for all 15 forms — these are the feature spec for remaining forms
- Next form priority: NEURO (high volume) after HAND (simpler warmup)

### Current known issues / things to watch
- Age auto-calculation (NRIC→age, DOB→age) — still unresolved from earlier sessions,
  has been deprioritised but worth revisiting when building NEURO form
- Geriatric has duplicate RN/IC fields — cosmetic, low priority
- PDF layout for amputation has had many iterations — if more issues arise,
  check two_col() lw/rw params and INN width for nested tables first

### What to do next session
1. HAND or NEURO form (HAND simpler, NEURO higher clinical value)
2. Share remaining POMR docs when dept colleagues finish them (BURN, FACIAL etc.)
3. Geriatric RN/IC cleanup
4. Consider validation layer (required fields hard stop) — GPT senior dev is right
5. Git push! (been on the list for multiple sessions)

### Architecture reminders for next session
- New form checklist in CLAUDE.md — follow it exactly
- Session header = FREE (already in SOAP modal for all forms)
- sign_chop_block() = FREE (call it in right2() or wherever sign goes)
- bodychart.js API = getData() / loadData() / clearAll() — NOT collect/populate
- Always node --check new JS files before packaging
- Always run local PDF test before declaring done
- Check for orphaned code after large str_replace operations


---

## HANDOVER NOTE — Session 2026-04-25

### What happened this session (8 hours)

Started with CR form GUI refinements, ended with a fully centralised architecture.
Main achievements:

**CR Form (completed):**
- All dropdowns for observation (breathing pattern, chest deformity, sputum, drain, etc.)
- Interactive lung auscultation diagram (lungchart.js) — 6 zones, radiological view,
  click-to-mark with finding picker, findings feed into PDF LungDiagramFlowable
- MPIS generator for CR (copyToMpisCr)
- CR SOAP templates (CR_SOAP category)
- PDF export wired end-to-end

**Infrastructure (major refactor):**
- FORM_REGISTRY in app.py — 15 forms, dynamic sidebar, groups, collapsible
- initFormContext() in main.js — centralised patient prefill, episode wrapper,
  auto-load, nav buttons. All 4 existing forms stripped of boilerplate.
- window.Form contract established and enforced across all form JS files
- form_base.js onPtTypeChange null-guarded (fixes geriatric crash)
- clinical_templates.js fully rewritten (was structurally broken)
- Context-aware form switching via navigateForm() (preserves URL params)
- Export KKM PDF passes ?form_type= so correct generator always used
- Sidebar collapse (hamburger) + group collapse (chevron) with localStorage persistence
- Edit patient modal restored in home.html
- NRIC validation warning for invalid date in registration modal
- GERIATRIC_SOAP and SPINE_SOAP added (was using MS_SOAP for all forms before)

### Current known issues
- Geriatric form has duplicate RN/IC fields — cosmetic, low priority
- pdf_cr.py may not be in pt_assessment.spec yet — VERIFY before next build

### What to do next session
1. Verify pdf_cr.py is in pt_assessment.spec (check datas list)
2. Full end-to-end test of the .exe build
3. Push to GitHub
4. Geriatric duplicate field cleanup
5. Decide which form to build next (NEURO recommended for clinical volume,
   HAND recommended for simpler scope as warmup)

---

## HANDOVER NOTE — NEURO PDF Rewrite + Git Setup Session 2026-04-28

### What happened this session

Second bug-fix session on the NEURO form, immediately following the first (chip CSS / body chart / modal card / template buttons session). User ran first real-world test of the fixed form and found two more bugs. Also: git was finally pushed to GitHub for the first time. pdf_neuro.py was completely rewritten to match the real KKM borang layout.

**Files modified:**
- `static/js/form_neuro.js` — added `patient: FormBase.collectPatient()` to collect(), `FormBase.populatePatient(d.patient)` to populate(), `FormBase.resetPatient()` to reset()
- `static/css/style.css` — topbar resize fixes (overflow-x:auto, .topbar-sub ellipsis + media query, nowrap on .topbar-logo)
- `pdf_neuro.py` — complete rewrite to 2-column KKM layout
- `CLAUDE.md` — ref number corrected, NEURO PDF layout rules updated, this handover note

**Git:**
- Repo initialised (`git init`)
- `.gitignore` already had `pt_data/` and `*.db` — patient data excluded
- 43 files committed and pushed to https://github.com/PcGoDz/PT_Assessment_Form

---

**Bugs fixed:**

1. **422 on Save Record and Export KKM PDF (pass 2)** — After the previous session fixed `meta: { form: 'NEURO' }`, a second unrelated 422 remained: `validate_record()` also checks `patient.name` and `patient.date` as common required fields for ALL forms. `form_neuro.js collect()` never called `FormBase.collectPatient()` so there was no `patient` object in the payload. Validator found `patient.name` undefined → 422.
   Fixed: added `patient: FormBase.collectPatient()` to collect(), plus matching populate/reset calls.
   This is a different bug from the `meta.form` one. Both were present; both needed fixing.

2. **Topbar breaks on window resize** — At narrow widths, `.topbar-actions` wrapped onto a second line pushing the topbar to double height. `.topbar-sub` compressed to zero and broke the flex layout.
   Fixed: `.topbar-actions { overflow-x: auto; flex-shrink: 0; }` keeps buttons on one scrollable row.
   `.topbar-sub { overflow: hidden; text-overflow: ellipsis; min-width: 0; }` clips gracefully.
   `@media (max-width: 900px) { .topbar-sub { display: none; } }` hides subtitle on small windows.

3. **PDF export all flat (not 2-column)** — The previous pdf_neuro.py was using a single large `two_col()` block spanning 39 rows across both columns. ReportLab threw `"Flowable too large on page 2 in frame 'normal' (515 x 750*)"`. First fix attempt (not restarting Flask) appeared to change nothing. Second fix attempt (full flatten) generated but completely wrong layout — KKM audit requires 2-column to match the printed borang. User shared actual form scan images.
   Correct fix: rewrite as 4 independent two_col blocks, each ≤ ~250mm tall. ReportLab moves whole blocks to the next page; it cannot split a single block that exceeds frame height. The `two_col()` unit is a hard constraint.

4. **Floating / jarring tables on PDF page 3** — MRMI table, legend, and outcome_t were sibling items in the two_col left-column list alongside their header rs() row. They rendered as disconnected boxes with a header floating above. Visual layout looked broken.
   Fix: moved all three inside rs() as `(None, mrmi_t)`, `(None, legend)`, `(None, outcome_t)` rows. They are now contained inside one continuous bordered block. Rule: tables that belong "inside" a section must be `(None, table)` rows in rs(), not separate list items.

---

### Retrospective

**What went wrong:**

- **Two 422 bugs in the same form for the same symptom.** `meta.form` and `patient` are both required by the validator. One was fixed in the previous session, one in this session. The bug that was obvious to the user ("422 on save") actually had two independent root causes. We should have read validate_record() end-to-end after fixing the first one to check whether any other paths still failed — instead of waiting for the user to report the same symptom again.

- **Flask restart assumption.** After changing pdf_neuro.py, the error did not change. The instinct was "code change didn't work" rather than "Flask didn't reload." Same error memory address in two requests confirmed the process was stale. Lesson: always mention "restart Flask after any .py change" in the same message as the fix.

- **Flatten instinct was wrong.** When "too large" fires, the brain goes to "simplify layout." That's the wrong direction. The constraint is height-per-block, not total layout complexity. A flat layout that breaks audit compliance is worse than no PDF at all.

**What went well:**

- User sharing the actual KKM form scan immediately resolved the layout question. There was no ambiguity about what "2-column" meant once we had the reference.
- The 4-block two_col structure correctly matches the form's two pages: block 1-2 on page 1, block 3-4 on page 3 after explicit PageBreak.
- The floating table fix was a clean conceptual change (sibling → nested row) with no other fallout.

**What we'd do differently:**

- After fixing any 422, run validate_record() mentally against the full collect() output and check every required path — not just the one that matched the reported error.
- Ask "does the KKM borang have a specific layout?" before starting any new PDF generator. The answer is always yes. All KKM forms are 2-column. This is now in CLAUDE.md as a PDF rule.
- Plan two_col block count FIRST, then write content. For any form with > 20 content rows, assume 2–3 blocks per page before writing a single line.

---

### Known issues (updated as of 2026-04-28)

**Still open:**
- Age auto-calculation (NRIC→age, DOB→age) — unresolved, deprioritised
- Geriatric duplicate RN/IC fields — cosmetic, low priority
- No UNIQUE constraint on `records.episode_id` — ORDER BY workaround in place
- `audit_log` FK has no ON DELETE CASCADE — orphaned audit rows harmless but untidy
- `pt_assessment.spec` datas includes `templates/pdf` redundantly
- No ARIA attributes anywhere — low clinical priority
- Accessibility: sidebar nav uses onclick divs, not buttons — not keyboard navigable
- `resetPatient()` in `form_base.js` missing null guards on `derived-dob`/`derived-gender`
- `api.js` episode/SOAP coverage inconsistent (inline fetches in templates)
- NEURO exe build NOT tested — code is fixed, build verification still deferred
- Shared table components (MmtTable, InvMedTable, MovementTable refactor) — planned and scoped, not started

**Fixed this session:**
- 422 on Save Record / Export KKM PDF (pass 2): `patient: FormBase.collectPatient()` ✓
- Topbar resize / wrapping ✓
- pdf_neuro.py rewrite — 2-column KKM layout, correct ref, 4 two_col blocks ✓
- Floating tables on PDF page 3 ✓
- Git pushed to GitHub ✓

---

### Next session priorities

1. **Git push** — now set up, keep the habit. `git add -A && git commit -m "session checkpoint" && git push` before opening any files.
2. **Shared table IIFEs** — MmtTable, InvMedTable, refactor MovementTable to accept configurable tbody ID. Do this BEFORE HAND form — it pays off across NEURO MMT, AMPUTATION MMT, and every new form that has a tabular section. Estimated ~2.5h. Pattern: same IIFE structure as movement_table.js.
3. **Full exe build test** — all 6 forms (MS, SPINE, GERIATRIC, CR, AMPUTATION, NEURO). NEURO is code-complete but untested in the built exe.
4. **HAND form** — next new form after shared components. Simpler than NEURO (no MRMI, no MRCP, no complex balance section). Good session warmup.

---

### Architecture reminders / new rules from this session

**Two_col block planning (NEURO / any large form):**
- Each `two_col()` call is ONE Table flowable. If either column exceeds ~250mm, it will "too large" error.
- Plan block count first. NEURO: 4 blocks across 2 explicit pages. Never try to fit a full page in one block.
- Page breaks must be explicit `PageBreak` flowables in story[] — ReportLab won't insert them mid-block.

**Nested tables in rs() rows:**
- Tables that belong visually "inside" a bordered section must be `(None, table)` rows in rs(), not sibling list items.
- Sibling = floating. Nested row = contained. No visual border will appear around siblings. This is the source of the "jarring floating table" appearance.

**collect() template — the two non-negotiables:**
```javascript
return {
  _form_type: 'NEURO',          // → getCurrentFormType() → ?form_type= → PDF routing
  meta:       { form: 'NEURO' }, // → validate_record() → REQUIRED_FIELDS lookup
  patient:    FormBase.collectPatient(), // → validate_record() patient.name / patient.date check
  ...
};
```
All three keys are required. Missing any one of them causes 422. Check all three in any new form.

**Shared table component plan (for next session):**
- `movement_table.js` is currently hardcoded to `#mov-tbody`. Refactor to accept tbody ID as config.
- `MmtTable` — new IIFE, same pattern (rows array, addRow, deleteRow, renderTable, getData, loadData, clear). Columns: Muscle Group, Side, Grade (0-5 select).
- `InvMedTable` — new IIFE for investigation / medication tables. Columns vary by table (Inv: date/type/result; Med: name/dose/frequency).
- Wire into neuro.html for MMT section. Wire into amputation.html for its MMT. Smoke test both.
- Injection pattern: same as sign_chop_block — pass tbody ID as config option to the IIFE init.

---

## HANDOVER NOTE — M3 UI Redesign Session 2026-05-07

### What happened this session

Full Google Material Design 3 (M3) UI redesign across the entire app. 7-task plan executed
across multiple context windows. No backend changes. No new features. Pure visual/structural
CSS + HTML rewrite with strict DOM ID and JS function preservation.

**Files modified:**

- `static/css/style.css` — Added M3 design token block: `--m3-surface-container`,
  `--m3-surface-container-high`, `--m3-shape-sm` (8px), `--m3-shape-md` (12px),
  `--m3-shape-lg` (16px), `--m3-elev-1/2/3` (box-shadow levels). New layout classes:
  `.m3-context-bar` (56px neutral bar, border-bottom, no box-shadow),
  `.m3-section-rail` (replacing old sidebar), `.m3-content` (main content area).
  Dark mode variants for all new tokens.

- `templates/base.html` — Old topbar (`.topbar`) + sidebar (`.sidebar`) replaced with
  `.m3-context-bar` + `.m3-section-rail`. Dark mode toggle moved from standalone topbar
  button to settings gear dropdown (`#settings-menu`, `#settings-btn`). Settings dropdown
  pattern: anchor div with absolute-positioned menu, `toggleSettingsMenu()` function +
  click-outside handler to auto-close.

- `templates/home.html` — Full rewrite (~2170 lines). `.dash-header` (gradient blue) replaced
  with `.home-ctx-bar` (neutral 56px bar) + `.home-greeting` (separate card). Settings gear
  dropdown added with same pattern as base.html. `toggleSettingsMenu()` + click-outside
  handler added. `loadStats()` call added to init (was defined but never called).
  Emojis removed from greeting messages. All 84 DOM IDs preserved. All ~50 JS functions
  preserved character-for-character. All 5 modals, 2 bottom sheets, FAB, context menu intact.

- `templates/episode.html` — Full rewrite (~760 lines). `.ep-topbar` (accent colored,
  box-shadow) replaced with `.ep-ctx-bar` (neutral, border-bottom). Settings gear dropdown added.
  Session info box in SOAP modal: inline styles replaced with proper CSS classes
  (`.session-info-box`, `.session-info-title`, `.session-info-grid`). formLabel maps
  updated to include AMPUTATION and NEURO (were missing — only had MS/SPINE/GERIATRIC/CR).
  All 33 DOM IDs preserved. All 15 JS functions preserved.

- `static/js/main.js` — Sidebar references updated from `#sidebar` / `.sidebar` to
  `#m3-sidebar` / `#m3-rail` / `.m3-section-rail`. Context bar references updated from
  `.topbar` to `.m3-context-bar`. Dark mode toggle logic updated to find `#dark-toggle`
  inside settings dropdown rather than standalone topbar button.

**Key design decisions:**

- **Neutral context bars everywhere.** All three standalone pages (base.html, home.html,
  episode.html) use the same pattern: 56px neutral bar, `border-bottom: 1px solid var(--border)`,
  no `box-shadow`. Consistent, clean, professional.

- **Settings gear dropdown as shared pattern.** Dark mode toggle, and potentially future
  settings, live inside a gear dropdown. The `id="dark-toggle"` is placed on the inner
  `<span>` icon element, NOT on the `<button>`, because `initDark()` sets `textContent`
  on the element — putting it on the button would wipe the "Dark Mode" label text.

- **M3 tokens with fallbacks.** All new M3 CSS vars use fallback syntax:
  `var(--m3-surface-container, var(--surface))`. This means any component not yet updated
  to M3-specific tokens still works via the old `--surface` fallback. Graceful migration.

- **DOM ID preservation as hard constraint.** Every `getElementById` call in JS was mapped
  and verified against the rewritten HTML. Zero IDs changed. Zero JS functions modified in
  signature or body. The redesign is purely visual — data flow is untouched.

---

### Retrospective

**What went well:**

- The 7-task plan was clean and executed in order. Each task had clear scope, clear inputs/outputs.
  No task required rework of a previous task.
- DOM ID verification scripts (Python) caught the formLabel map gap in episode.html (AMPUTATION
  and NEURO missing) before it could become a runtime bug.
- M3 token fallback pattern (`var(--m3-x, var(--old-x))`) meant we could update pages
  incrementally without breaking partially-migrated components.
- The session info box CSS cleanup in episode.html (inline styles to proper classes) was a
  bonus maintainability win — not in the plan but the right call while the file was open.

**What went wrong:**

- DOM ID verification script in bash had encoding issues — `grep -c "function onEp2TypeChange"`
  returned 0 despite the function being present (confirmed via Read tool). The bash sandbox
  encoding and the Windows file encoding did not agree. Workaround: used Python verification
  script instead of raw grep. Lesson: for verification on Windows-origin files, prefer Python
  `open(encoding='utf-8')` over bash grep.
- Five functions appeared "missing" in the Python verification of home.html because the matcher
  used `'function ' + fn` which did not account for leading whitespace. Not a code bug — a
  verification script bug. All five functions were confirmed present via Grep tool.

**What we'd do differently:**

- **Write the verification script to handle indented function declarations** from the start.
  The regex should be `r'function\s+' + fn` not `'function ' + fn`. Simple but cost a
  false-alarm investigation cycle.
- **Check formLabel maps in episode.html as part of new form checklist.** AMPUTATION and
  NEURO were added to all registries (FORM_REGISTRY, PDF generators, REQUIRED_FIELDS, MPIS,
  SOAP templates) but not to episode.html's inline formLabel map. This is a new gap —
  the checklist does not mention episode.html formLabel maps. Now it should.

---

### Known issues (updated as of 2026-05-07)

**Still open:**
- Age auto-calculation (NRIC to age, DOB to age) — unresolved, deprioritised
- Geriatric duplicate RN/IC fields — cosmetic, low priority
- No UNIQUE constraint on `records.episode_id` — ORDER BY workaround in place
- `audit_log` FK has no ON DELETE CASCADE — orphaned audit rows harmless but untidy
- `pt_assessment.spec` datas includes `templates/pdf` redundantly
- No ARIA attributes anywhere — low clinical priority
- Bug 2: SOAP gate before first assessment — not implemented, pending scope clarification
- Full exe build untested since NEURO was added (now also untested since M3 redesign)
- Shared table components (MmtTable, InvMedTable, MovementTable refactor) — planned, not started
- HAND form not started

**Fixed this session:**
- UI redesign — full M3 reskin across style.css, base.html, home.html, episode.html, main.js
- episode.html formLabel maps missing AMPUTATION + NEURO
- `loadStats()` was defined but never called in home.html init

---

### Next session priorities

1. Git push — M3 redesign is a large changeset, push immediately
2. Full exe build test — all 6 forms end-to-end (MS, SPINE, GERIATRIC, CR, AMPUTATION, NEURO), first test since both NEURO and M3 redesign
3. HAND form — next new form, simpler scope than NEURO
4. Validation layer UI — surface REQUIRED_FIELDS errors to the user before save attempt

---

### Architecture updates / gotchas

**M3 design token system (style.css):**
- All new visual tokens prefixed `--m3-`. Dark mode overrides in `:root.dark-mode` block.
- Fallback pattern: `var(--m3-surface-container, var(--surface))` — old tokens still work.
- Shape tokens: `--m3-shape-sm` (8px), `--m3-shape-md` (12px), `--m3-shape-lg` (16px).
- Elevation: `--m3-elev-1/2/3` — box-shadow values, not z-index.

**Settings gear dropdown pattern (all 3 standalone pages):**
- HTML: `.xxx-settings-anchor` > `button#settings-btn` + `div#settings-menu.xxx-settings-menu`
- JS: `toggleSettingsMenu()` toggles `.show` class. Click-outside listener on `document`.
- `id="dark-toggle"` goes on the inner `<span>` icon, NOT the `<button>`.
  `initDark()` sets `el.textContent` — if on the button, it wipes "Dark Mode" label.

**Standalone pages (home.html, episode.html) do NOT extend base.html:**
- Each has its own complete `<html>`, `<head>`, CSS, and JS.
- Each has its own `toggleSettingsMenu()`, `initDark()`, `toggleDark()`, click-outside handler.
- Changes to the settings dropdown pattern must be applied to ALL THREE files independently.
- base.html pattern is canonical; home.html and episode.html replicate it.

**episode.html formLabel maps must include all ready forms:**
- `loadEpisode()` and `loadAssessment()` each have inline `{MS:'Musculoskeletal',...}` maps.
- When a new form is added, these maps must be updated alongside all other registries.
- This is a NEW gap in the form checklist — add "update episode.html formLabel maps" as a step.

**New form checklist addition (step 1.6):**
- After step 1.5 (home.html modal card), add: update episode.html formLabel/icon maps in
  `loadEpisode()` and `loadAssessment()` to include the new form type.*Full exe build test** — all 6 forms (MS, SPINE, GERIATRIC, CR, AMPUTATION, NEURO). NEURO is code-complete but untested in the built exe.
4. **HAND form** — next new form after shared components. Simpler than NEURO (no MRMI, no MRCP, no complex balance section). Good session warmup.

---

### Architecture reminders / new rules from this session

**Two_col block planning (NEURO / any large form):**
- Each `two_col()` call is ONE Table flowable. If either column exceeds ~250mm, it will "too large" error.
- Plan block count first. NEURO: 4 blocks across 2 explicit pages. Never try to fit a full page in one block.
- Page breaks must be explicit `PageBreak` flowables in story[] — ReportLab won't insert them mid-block.

**Nested tables in rs() rows:**
- Tables that belong visually "inside" a bordered section must be `(None, table)` rows in rs(), not sibling list items.
- Sibling = floating. Nested row = contained. No visual border will appear around siblings. This is the source of the "jarring floating table" appearance.

**collect() template — the two non-negotiables:**
```javascript
return {
  _form_type: 'NEURO',          // → getCurrentFormType() → ?form_type= → PDF routing
  meta:       { form: 'NEURO' }, // → validate_record() → REQUIRED_FIELDS lookup
  patient:    FormBase.collectPatient(), // → validate_record() patient.name / patient.date check
  ...
};
```
All three keys are required. Missing any one of them causes 422. Check all three in any new form.

**Shared table component plan (for next session):**
- `movement_table.js` is currently hardcoded to `#mov-tbody`. Refactor to accept tbody ID as config.
- `MmtTable` — new IIFE, same pattern (rows array, addRow, deleteRow, renderTable, getData, loadData, clear). Columns: Muscle Group, Side, Grade (0-5 select).
- `InvMedTable` — new IIFE for investigation / medication tables. Columns vary by table (Inv: date/type/result; Med: name/dose/frequency).
- Wire into neuro.html for MMT section. Wire into amputation.html for its MMT. Smoke test both.
- Injection pattern: same as sign_chop_block — pass tbody ID as config option to the IIFE init.

---

## HANDOVER NOTE — M3 UI Redesign Session 2026-05-07

### What happened this session

Full Google Material Design 3 (M3) UI redesign across the entire app. 7-task plan executed
across multiple context windows. No backend changes. No new features. Pure visual/structural
CSS + HTML rewrite with strict DOM ID and JS function preservation.

**Files modified:**

- `static/css/style.css` — Added M3 design token block: `--m3-surface-container`,
  `--m3-surface-container-high`, `--m3-shape-sm` (8px), `--m3-shape-md` (12px),
  `--m3-shape-lg` (16px), `--m3-elev-1/2/3` (box-shadow levels). New layout classes:
  `.m3-context-bar` (56px neutral bar, border-bottom, no box-shadow),
  `.m3-section-rail` (replacing old sidebar), `.m3-content` (main content area).
  Dark mode variants for all new tokens.

- `templates/base.html` — Old topbar (`.topbar`) + sidebar (`.sidebar`) replaced with
  `.m3-context-bar` + `.m3-section-rail`. Dark mode toggle moved from standalone topbar
  button to settings gear dropdown (`#settings-menu`, `#settings-btn`). Settings dropdown
  pattern: anchor div with absolute-positioned menu, `toggleSettingsMenu()` function +
  click-outside handler to auto-close.

- `templates/home.html` — Full rewrite (~2170 lines). `.dash-header` (gradient blue) →
  `.home-ctx-bar` (neutral 56px bar) + `.home-greeting` (separate card). Settings gear
  dropdown added with same pattern as base.html. `toggleSettingsMenu()` + click-outside
  handler added. `loadStats()` call added to init (was defined but never called).
  Emojis removed from greeting messages. All 84 DOM IDs preserved. All ~50 JS functions
  preserved character-for-character. All 5 modals, 2 bottom sheets, FAB, context menu intact.

- `templates/episode.html` — Full rewrite (~760 lines). `.ep-topbar` (accent colored,
  box-shadow) → `.ep-ctx-bar` (neutral, border-bottom). Settings gear dropdown added.
  Session info box in SOAP modal: inline styles replaced with proper CSS classes
  (`.session-info-box`, `.session-info-title`, `.session-info-grid`). formLabel maps
  updated to include AMPUTATION and NEURO (were missing — only had MS/SPINE/GERIATRIC/CR).
  All 33 DOM IDs preserved. All 15 JS functions preserved.

- `static/js/main.js` — Sidebar references updated from `#sidebar` / `.sidebar` to
  `#m3-sidebar` / `#m3-rail` / `.m3-section-rail`. Context bar references updated from
  `.topbar` to `.m3-context-bar`. Dark mode toggle logic updated to find `#dark-toggle`
  inside settings dropdown rather than standalone topbar button.

**Key design decisions:**

- **Neutral context bars everywhere.** All three standalone pages (base.html, home.html,
  episode.html) use the same pattern: 56px neutral bar, `border-bottom: 1px solid var(--border)`,
  no `box-shadow`. Consistent, clean, professional.

- **Settings gear dropdown as shared pattern.** Dark mode toggle, and potentially future
  settings, live inside a gear dropdown. The `id="dark-toggle"` is placed on the inner
  `<span>` icon element, NOT on the `<button>`, because `initDark()` sets `textContent`
  on the element — putting it on the button would wipe the "Dark Mode" label text.

- **M3 tokens with fallbacks.** All new M3 CSS vars use fallback syntax:
  `var(--m3-surface-container, var(--surface))`. This means any component not yet updated
  to M3-specific tokens still works via the old `--surface` fallback. Graceful migration.

- **DOM ID preservation as hard constraint.** Every `getElementById` call in JS was mapped
  and verified against the rewritten HTML. Zero IDs changed. Zero JS functions modified in
  signature or body. The redesign is purely visual — data flow is untouched.

---

### Retrospective

**What went well:**

- The 7-task plan was clean and executed in order. Each task had clear scope, clear inputs/outputs.
  No task required rework of a previous task.
- DOM ID verification scripts (Python) caught the formLabel map gap in episode.html (AMPUTATION
  and NEURO missing) before it could become a runtime bug.
- M3 token fallback pattern (`var(--m3-x, var(--old-x))`) meant we could update pages
  incrementally without breaking partially-migrated components.
- The session info box CSS cleanup in episode.html (inline styles → proper classes) was a
  bonus maintainability win — not in the plan but the right call while the file was open.

**What went wrong:**

- DOM ID verification script in bash had encoding issues — `grep -c "function onEp2TypeChange"`
  returned 0 despite the function being present (confirmed via Read tool). The bash sandbox
  encoding and the Windows file encoding didn't agree. Workaround: used Python verification
  script instead of raw grep. Lesson: for verification on Windows-origin files, prefer Python
  `open(encoding='utf-8')` over bash grep.
- Five functions appeared "missing" in the Python verification of home.html because the matcher
  used `'function ' + fn` which didn't account for leading whitespace. Not a code bug — a
  verification script bug. All five functions were confirmed present via Grep tool.

**What we'd do differently:**

- **Write the verification script to handle indented function declarations** from the start.
  The regex should be `r'function\s+' + fn` not `'function ' + fn`. Simple but cost a
  false-alarm investigation cycle.
- **Check formLabel maps in episode.html as part of new form checklist.** AMPUTATION and
  NEURO were added to all registries (FORM_REGISTRY, PDF generators, REQUIRED_FIELDS, MPIS,
  SOAP templates) but not to episode.html's inline formLabel map. This is a new gap —
  the checklist doesn't mention episode.html formLabel maps. Now it should.

---

### Known issues (updated as of 2026-05-07)

**Still open:**
- Age auto-calculation (NRIC→age, DOB→age) — unresolved, deprioritised
- Geriatric duplicate RN/IC fields — cosmetic, low priority
- No UNIQUE constraint on `records.episode_id` — ORDER BY workaround in place
- `audit_log` FK has no ON DELETE CASCADE — orphaned audit rows harmless but untidy
- `pt_assessment.spec` datas includes `templates/pdf` redundantly
- No ARIA attributes anywhere — low clinical priority
- Bug 2: SOAP gate before first assessment — not implemented, pending scope clarification
- Full exe build untested since NEURO was added (now also untested since M3 redesign)
- Shared table components (MmtTable, InvMedTable, MovementTable refactor) — planned, not started
- HAND form not started

**Fixed this session:**
- UI redesign — full M3 reskin across style.css, base.html, home.html, episode.html, main.js ✓
- episode.html formLabel maps missing AMPUTATION + NEURO ✓
- `loadStats()` was defined but never called in home.html init ✓

---

### Next session priorities

1. Git push — M3 redesign is a large changeset, push immediately
2. Full exe build test — all 6 forms end-to-end (MS, SPINE, GERIATRIC, CR, AMPUTATION, NEURO), first test since both NEURO and M3 redesign
3. HAND form — next new form, simpler scope than NEURO
4. Validation layer UI — surface REQUIRED_FIELDS errors to the user before save attempt

---

### Architecture updates / gotchas

**M3 design token system (style.css):**
- All new visual tokens prefixed `--m3-`. Dark mode overrides in `:root.dark-mode` block.
- Fallback pattern: `var(--m3-surface-container, var(--surface))` — old tokens still work.
- Shape tokens: `--m3-shape-sm` (8px), `--m3-shape-md` (12px), `--m3-shape-lg` (16px).
- Elevation: `--m3-elev-1/2/3` — box-shadow values, not z-index.

**Settings gear dropdown pattern (all 3 standalone pages):**
- HTML: `.xxx-settings-anchor` > `button#settings-btn` + `div#settings-menu.xxx-settings-menu`
- JS: `toggleSettingsMenu()` toggles `.show` class. Click-outside listener on `document`.
- `id="dark-toggle"` goes on the inner `<span>` icon, NOT the `<button>`.
  `initDark()` sets `el.textContent` — if on the button, it wipes "Dark Mode" label.

**Standalone pages (home.html, episode.html) do NOT extend base.html:**
- Each has its own complete `<html>`, `<head>`, CSS, and JS.
- Each has its own `toggleSettingsMenu()`, `initDark()`, `toggleDark()`, click-outside handler.
- Changes to the settings dropdown pattern must be applied to ALL THREE files independently.
- base.html pattern is canonical; home.html and episode.html replicate it.

**episode.html formLabel maps must include all ready forms:**
- `loadEpisode()` and `loadAssessment()` each have inline `{MS:'Musculoskeletal',...}` maps.
- When a new form is added, these maps must be updated alongside all other registries.
- This is a NEW gap in the form checklist — add "update episode.html formLabel maps" as a step.

**New form checklist addition (step 1.6):**
- After step 1.5 (home.html modal card), add: update episode.html formLabel/icon maps in
  `loadEpisode()` and `loadAssessment()` to include the new form type.


---

## HANDOVER NOTE — Patient Profile Wiring Session 2026-05-09

### What we did

Short session. Two tasks: (1) diagnose and fix `TemplateNotFound: patient.html` 500 error on the patient profile route, and (2) wire `/patient/<id>` into all navigation points across the app.

**Bug fixed:**

- `jinja2.exceptions.TemplateNotFound: patient.html` on `GET /patient/<id>` — `app.py` had the route (`patient_profile()` at line 116) but `templates/patient.html` only existed in the git worktree, not in the main project folder. Fixed by copying `patient.html` from the worktree into `templates/`. The route and template were always correct; the file was simply absent from the running app's template directory.

**Navigation wiring (`home.html`):**

- `openPatient(id)` replaced with a one-liner: `window.location.href = '/patient/' + id`. All callers (patient row click at line 2037, post-create at line 1666, post-edit at line 2164, URL param restore at line 2182) now navigate directly to the profile page.
- Old function body moved to `_openPatientInline(id)` — preserved but unreachable from normal flow. Clean-up deferred.

**Navigation wiring (`episode.html`):**

- `goBack()` updated: `window.location.href = episode && episode.patient_id ? '/patient/' + episode.patient_id : '/'`. Falls back to `/` if `episode` is not yet loaded.
- "View Profile" button (`#ctx-view-profile-btn`) added to context banner markup — hidden by default, shown and href-set in `loadEpisode()` once `episode.patient_id` is available.

**Navigation wiring (`static/js/main.js` — `initFormContext()`):**

- Introduced `var retDest = patientId ? '/patient/' + patientId : '/'` — computed once, used by both Return and Save & Return `onclick` handlers instead of hardcoded `'/'`.
- Added "View Profile" button injected before Return/Save & Return in the topbar nav group — only rendered when `patientId` is present.

---

### Retrospective

**What went wrong:** Spent ~4 hours running Flask test commands trying to reproduce the 500 error instead of immediately asking for the terminal traceback. The error was `TemplateNotFound: patient.html` — one line, completely unambiguous. Had the traceback been the first ask, the fix would have taken 2 minutes.

**What fixed it:** User pasted the Flask terminal output. `jinja2.exceptions.TemplateNotFound: patient.html` identified the root cause instantly.

**What we'd do differently:** When a route returns 500 and the code looks correct, ask for the Flask terminal traceback before touching anything else. "What does the error say?" is always step 1.

---

### Known issues (updated as of 2026-05-09)

**Still open:**
- `_openPatientInline(id)` in `home.html` is dead code — unreachable from normal flow, not yet deleted
- `goBack()` in `episode.html` falls back to `/` if called before `loadEpisode()` resolves (edge case, low impact)
- Age auto-calculation (NRIC→age, DOB→age) — unresolved, deprioritised
- Geriatric duplicate RN/IC fields — cosmetic, low priority
- No UNIQUE constraint on `records.episode_id` — ORDER BY workaround in place
- `audit_log` FK has no ON DELETE CASCADE — orphaned audit rows harmless but untidy
- `pt_assessment.spec` datas includes `templates/pdf` redundantly
- No ARIA attributes anywhere — low clinical priority
- Bug 2: SOAP gate before first assessment — not implemented
- Full exe build untested since NEURO was added
- `resetPatient()` in `form_base.js` missing null guards on `derived-dob`/`derived-gender`
- `api.js` episode/SOAP coverage inconsistent (inline fetches in templates)

**Fixed this session:**
- `TemplateNotFound: patient.html` on `/patient/<id>` — `patient.html` copied to main project `templates/` ✓
- `goBack()` now navigates to patient profile instead of home ✓
- Return / Save & Return in `initFormContext()` now navigate to `/patient/<patientId>` ✓
- "View Profile" button added to episode.html context banner ✓
- "View Profile" button added to form topbar nav group via `initFormContext()` ✓
- `openPatient(id)` now navigates to patient profile instead of showing inline detail view ✓

---

### Next session priorities

1. Git push — has been deferred for multiple sessions. Do it first before opening any files.
2. Smoke-test full patient navigation flow: home row → profile → episode → back → profile. Verify Return button on all 6 forms lands on patient profile, not home.
3. Full exe build test — all 6 forms end-to-end. Build has not been run since NEURO was added.
4. HAND form — next new form, simpler scope (no MRMI, no lung diagram).

---

### Architecture updates / gotchas

**Patient profile is now the navigation hub for all patient links:**
- All patient row clicks in `home.html` go to `/patient/<id>` via `openPatient(id)`.
- `sheetViewProfile()` in `home.html` already went to `/patient/<id>` (unchanged).
- `goBack()` in `episode.html` goes to `/patient/<episode.patient_id>` — falls back to `/` only if `episode` is null.
- `initFormContext()` in `main.js` uses `retDest = patientId ? '/patient/' + patientId : '/'` for all Return navigation. "View Profile" button is also injected into the topbar nav group.
- Do NOT add any new navigation that goes directly from patient list → episode without passing through the profile page.

**`_openPatientInline(id)` in `home.html` is dead code:**
- The old inline patient detail view function was renamed but not deleted.
- Before removing it, verify that the edit-patient modal (`openEditPatientModal()`) and delete-patient flow (`deleteCurrentPatient()`) do not depend on `currentPatientData` being set by the inline loading path.

---

## HANDOVER NOTE — UI Fixes + Seed Script Session 2026-05-09

### What we did

- Added `#ctx-menu-active` HTML element in `home.html` immediately after `#ctx-menu`. Added `openActiveCtxMenu(e, episodeId)`, `closeActiveCtxMenu()`, `ctxDischarge()`, `ctxViewActiveEpisode()` functions after `ctxViewEpisode()`. Replaced the `›` arrow span on active episode rows in `renderSheetEpisodes()` with a `⋯` button calling `openActiveCtxMenu()`. `ctxDischarge()` assigns `dischargeEpisodeId` and calls `openModal('modal-discharge')` — reuses the existing discharge modal without any new markup.
- Added discharge/reactivate to `patient.html` episode cards: `.ep-actions` CSS class wrapping the status pill + conditional button. Active cards get a `.btn-danger` "Discharge" button (`event.stopPropagation()` to prevent card navigation). Discharged cards get a `.btn-ghost` "Reactivate" button. Added `#modal-discharge` modal markup (ported from `home.html`), plus `openDischargeModal()`, `closeDischargeModal()`, `onDcReasonChange()`, `submitDischarge()`, `reactivateEpisode()` — on success both call `window.location.reload()`.
- Removed `max-width: 1100px` and `margin: 0 auto` from `.home-main` in `home.html` inline `<style>` block.
- Removed `max-width: 480px/900px` and `margin: 0 auto` from `.dash-content` in `style.css` (line ~862). This was the actual cause of the "Seen Today" and "Active Patients" sections being centred/narrow after the first fix.
- Changed `.active-pts-grid` in `style.css` from `repeat(4, 1fr)` to `repeat(auto-fill, minmax(200px, 1fr))` — fills full viewport width on dept PC, collapses to `1fr 1fr` at ≤600px.
- Applied M3 custom chevron to all `select` elements in `style.css`: `appearance: none`, `-webkit-appearance: none`, inline SVG background-image with fill `#49454f` (light) and `#c4c0ca` (dark via `body.dark select`).
- Rewrote `seed_db.py` — 10 dummy patients (MS×2, SPINE×2, GERIATRIC×3, NEURO×1, AMPUTATION×1, CR×1), all active episodes, skip-by-IC idempotency, `--reset` flag wipes and re-inserts. Confirmed working against `pt_data/records.db`.

---

### Retrospective

**What went wrong:**
- Layout fix required two passes. First pass removed `max-width` from `.home-main` (correct). But `.dash-content` in `style.css` had its own `max-width: 480px/900px; margin: 0 auto` that was not touched — leaving "Seen Today" and "Active Patients" still centred. Only caught after the user reported the layout was still broken. Root cause: two separate constraint sources, only one was in scope when reading the HTML file.

**What fixed it:**
- Grepped `style.css` for `max-width` and `margin: 0 auto`, found `.dash-content` rule at line 862, removed constraints in one targeted edit.

**What we'd do differently:**
- When fixing a layout constraint, grep the entire codebase (`home.html` + `style.css`) for both `max-width` and `margin.*auto` before touching anything. A layout can be constrained from multiple places — confirm the full chain before declaring fixed.

---

### Known issues (updated as of 2026-05-09)

**Still open:**
- `_openPatientInline(id)` in `home.html` — dead code, not yet removed. Check `openEditPatientModal()` and `deleteCurrentPatient()` dependency on `currentPatientData` before deleting.
- Age auto-calculation (NRIC→age, DOB→age) — unresolved, deprioritised
- Geriatric duplicate RN/IC fields — cosmetic, low priority
- No UNIQUE constraint on `records.episode_id` — ORDER BY workaround in place
- `audit_log` FK has no ON DELETE CASCADE — orphaned rows harmless but untidy
- No ARIA attributes anywhere — low clinical priority
- `resetPatient()` in `form_base.js` missing null guards on `derived-dob`/`derived-gender`
- Full exe build untested since NEURO + M3 redesign + discharge fixes

**Fixed this session:**
- Discharge missing from home.html active episode bottom sheet ✓
- Discharge/reactivate missing from patient.html ✓
- Home page layout squeezed (`.home-main` + `.dash-content` both fixed) ✓
- `select` elements retaining native OS chrome ✓
- `seed_db.py` blocked on re-run without manual DB deletion ✓

---

### Next session priorities

1. Smoke-test discharge full flow: home bottom sheet `⋯` → discharge modal → confirm → episode moves to discharged with `⋯` Reactivate menu
2. Smoke-test discharge from `/patient/<id>` card → modal → reload → discharged pill + Reactivate button
3. Full exe build test — all 6 forms, first build since NEURO + M3 + discharge changes
4. HAND form — next new form, simpler scope (no MRMI, no lung diagram)

---

### Architecture updates / gotchas

**Two max-width sources for home page layout — both must be clear:**
- `.home-main` — inline `<style>` in `home.html`. Now: `flex:1; width:100%; padding:28px 24px`.
- `.dash-content` — `style.css` line ~862. Now: `width:100%; padding:0 0 100px`. No `max-width`, no `margin: 0 auto`.
- If layout looks centred again, grep both files. Do not assume one source.

**`seed_db.py` usage:**
- `python seed_db.py` — adds missing patients, skips by IC if already in DB. Safe to re-run.
- `python seed_db.py --reset` — wipes the 10 seeded patients (by IC match) and re-inserts fresh.
- DB path: `pt_data/records.db` relative to the script. Same path `app.py` uses via `data_path()`.

**Discharge in patient.html uses `classList.add('open')` not `openModal()`:**
- `patient.html` has no `openModal()` helper — it's a standalone page, not on `base.html`.
- `home.html` uses `openModal('modal-discharge')` — available because home is also standalone but has its own `openModal()` defined.
- Do not copy `openModal()` calls between pages without checking the helper exists on the target page.

---

## HANDOVER NOTE — HAND Form Implementation 2026-05-16
