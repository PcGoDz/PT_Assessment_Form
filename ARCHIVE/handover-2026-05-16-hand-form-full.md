## HANDOVER NOTE — HAND Form Implementation 2026-05-16

### What we did

Full HAND (Hand Assessment) form implementation — form 7 of 15. Executed via subagent-driven development (8 tasks, 3 reviewers per task, 1 final reviewer). 14 commits pushed to GitHub. One critical bug caught and fixed in final review before push.

**Files created:**

- `static/js/handchart.js` — IIFE `const HandChart`. `init()` attaches click listeners to `#hand-svg-r` and `#hand-svg-l`, returns early if any required IDs absent. `renderMarker()` uses `document.getElementById('markers-' + m.hand.toLowerCase())` directly (no dead `svg.getElementById` fallback). Public API: `{ init, getData, loadData, clearAll, remove }`. Marker field is `hand:'R'|'L'` (not `view:'ant'|'post'` as in bodychart.js).

- `static/js/form_hand.js` — IIFE `var HandForm`. `collect()` returns `{ _form_type:'HAND', meta:{form:'HAND'}, patient:FormBase.collectPatient(), handChart:{markers:HandChart.getData(), notes:gv('chart-notes')}, ... }`. `initChips()` uses event delegation on `.chip-group` containers (not per-chip listeners). `onManagementChange()` shows `#surgery-date-row` when value is `'Surgical'`. `onHealthChange()` shows `#sq-health-notes-row` when value is `'Other'`. Dynamic circumference table with `addCircRow()` / `removeCircRow(btn)`. `window.ActiveForm = HandForm; window.Form = { collect, populate, reset, onPtTypeChange: FormBase.onPtTypeChange, onNricInput: FormBase.onNricInput, onDobChange: FormBase.onDobChange }`.

- `templates/forms/hand.html` — Extends `base.html`. Inline SVGs: `id="hand-svg-r"` (thumb on left = palmar R) and `id="hand-svg-l"` (thumb on right = palmar L), each with `<g id="markers-r">` / `<g id="markers-l">`. 44-row static ROM table via `{% for row in rom_rows %}` Jinja2 loop, `id="rom-tbody"`. 5 chip groups. DOMContentLoaded block calls `HandForm.initChips()` and 6 `ClinicalTemplates.addButton()` calls with textarea ID as first arg (e.g. `addButton('observation-notes', 'HAND_OBS', '')`).

- `pdf_hand.py` — `TITLE = 'HAND ASSESSMENT'`, `REF = 'fisio / b.pen. 12 / Pind. 2 / 2019'`. `HAND_MARKER_COLORS` / `HAND_MARKER_LABELS` (renamed from `MARKER_COLORS` to avoid import conflict with `pdf_platypus_base`). `HandChartFlowable` draws two palmar outlines (palm rect + 4 fingers + thumb ellipse) + coloured circles for each marker. `_build_story()` has 5 `two_col()` blocks with full-width ROM table between blocks 3 and 4. `generate_hand_pdf(data)` + `generate_episode_pdf(assessment_data, soap_notes, episode_info=None)`. Smoke test: 6503 bytes.

**Files modified:**

- `app.py` — `import pdf_hand`, `FORM_REGISTRY` HAND `ready=True`, `FORM_TEMPLATES['HAND'] = 'forms/hand.html'`, `_PDF_GENERATORS['HAND'] = pdf_hand.generate_episode_pdf`, `_SINGLE_PDF_GENERATORS['HAND'] = pdf_hand.generate_hand_pdf`
- `database.py` — `REQUIRED_FIELDS['HAND'] = [('diagnosis', 'Diagnosis is required'), ('pt_impression', 'PT Impression is required')]`
- `pt_assessment.spec` — `('pdf_hand.py', '.')` added to datas list
- `templates/base.html` — `<script src="/static/js/handchart.js"></script>` added after bodychart.js (hardcoded path, not url_for — matches existing pattern)
- `templates/home.html` — HAND modal card: `soon` class removed, "Soon" badge removed, `onclick="selectForm(this)"` added, icon `&#9995;`. formLabel map + icon map updated.
- `templates/episode.html` — `tplMap` HAND→HAND_SOAP, both `loadEpisode()` and `loadAssessment()` formLabel maps updated.
- `static/js/main.js` — `HandChart.init()` guard block in `init()` (checks `typeof HandChart !== 'undefined' && document.getElementById('hand-svg-r')`). `_buildMpisHand()` sync builder (returns parts[]). `copyToMpisHand()` async wrapper. `formType === 'HAND'` case in `copyToMpisAuto()`. `copyToMpisHand` exported in return {}.
- `static/js/clinical_templates.js` — 6 assessment template vars (`HAND_OBS`, `HAND_PALP`, `HAND_IMPRESSION`, `HAND_STG`, `HAND_LTG`, `HAND_PLAN`) registered in `templates` flat dict. `HAND_SOAP` registered inside `TEMPLATES` const (alongside `MS_SOAP`, `NEURO_SOAP`, etc.) — see critical bug below.

---

### Retrospective

**What went wrong:** `HAND_SOAP` was initially stored as `templates['HAND_SOAP']` (a plain object `{objective:[...], analysis:[...], plan:[...]}`), following the same pattern as the assessment templates. But `ClinicalTemplates.show(fieldId, formType, category)` resolves via `(TEMPLATES[formType] || {})[category] || templates[formType] || []`. When `templates[formType]` returns a dict (not an array), `items.length` is `undefined` → falsy → silent return. SOAP template buttons would have done nothing on click.

**What fixed it:** Final code reviewer (dispatched after all 8 tasks individually approved) caught the integration mismatch. Fix: moved `HAND_SOAP` into the `TEMPLATES` const where all other `*_SOAP` templates live. Removed the `templates['HAND_SOAP']` line. Verified with `node --check` + grep confirming single occurrence at `TEMPLATES.HAND_SOAP`.

**What we'd do differently:** The distinction between `TEMPLATES` (nested dicts, for SOAP sub-key lookup) and `templates` (flat arrays, for assessment addButton fallback) is not documented anywhere in the IIFE — only apparent by reading `show()`. Add a comment to `clinical_templates.js` above each block explicitly stating which dict SOAP vs assessment templates belong in. Would have prevented the mis-registration in the first place.

---

### Known issues (updated as of 2026-05-16)

**Still open:**
- `_openPatientInline(id)` in `home.html` — dead code, not yet removed. Check `openEditPatientModal()` and `deleteCurrentPatient()` dependency on `currentPatientData` before deleting.
- Age auto-calculation (NRIC→age, DOB→age) — unresolved, deprioritised
- Geriatric duplicate RN/IC fields — cosmetic, low priority
- No UNIQUE constraint on `records.episode_id` — ORDER BY workaround in place
- `audit_log` FK has no ON DELETE CASCADE — orphaned audit rows harmless but untidy
- `pt_assessment.spec` datas includes `templates/pdf` redundantly
- No ARIA attributes anywhere — low clinical priority
- Bug 2: SOAP gate before first assessment — not implemented
- Full exe build untested since NEURO + M3 + discharge fixes + HAND
- `resetPatient()` in `form_base.js` missing null guards on `derived-dob`/`derived-gender`
- `api.js` episode/SOAP coverage inconsistent (inline fetches in templates)
- `pdf_hand.py` unused imports: `Table`, `TableStyle`, `colors`, `CW`, `ML`, `MR`, `MT`, `MB` — harmless but noisy
- `pdf_hand.py` ROM column widths sum to 179mm vs 186mm CW — 7mm gap on right side of table, cosmetic
- `clinical_templates.js` comment line 4 stale — lists only MS/SPINE/GERIATRIC/CR, missing HAND/NEURO/AMPUTATION

**Fixed this session:**
- HAND form full implementation (all 4 registries, all JS/HTML/PDF/MPIS/templates) ✓
- `HAND_SOAP` silent failure in `showSoapTemplate()` — moved into `TEMPLATES` const ✓

---

### Next session priorities

1. Smoke-test HAND form end-to-end: save, PDF export, hand chart markers, MPIS copy, all 6 template buttons, all 3 SOAP template buttons.
2. Full exe build test — all 7 forms (MS, SPINE, GERIATRIC, CR, AMPUTATION, NEURO, HAND). Build has not run since NEURO was added.
3. Validation layer UI — surface REQUIRED_FIELDS 422 errors to the user before save attempt. Backend already done; frontend needs to parse and display the error list from the 422 response body.
4. Next new form — BURN (Musculoskeletal) is the next not-ready form in the same group as HAND.

---

### Architecture updates / gotchas

**`TEMPLATES` vs `templates` in `clinical_templates.js` — the critical distinction:**
- `TEMPLATES` (const, top of IIFE) — stores SOAP templates as `{ objective:[...], analysis:[...], plan:[...] }` dicts. Keys: `MS_SOAP`, `CR_SOAP`, `SPINE_SOAP`, `GERIATRIC_SOAP`, `AMPUTATION_SOAP`, `NEURO_SOAP`, `HAND_SOAP`, and assessment categories like `MS: { observation:[...] }`.
- `templates` (var, mid-IIFE) — stores flat arrays for assessment-form `addButton` fallback. Keys: `HAND_OBS`, `HAND_PALP`, `HAND_IMPRESSION`, `HAND_STG`, `HAND_LTG`, `HAND_PLAN`.
- `show()` lookup: `(TEMPLATES[formType] || {})[category] || templates[formType] || []`. SOAP calls pass `category='objective'` etc. Assessment calls pass `category=''` and fall through to `templates[formType]`.
- **Rule:** SOAP dicts → `TEMPLATES`. Assessment arrays → `templates`. Never swap them.

**`ClinicalTemplates.addButton(fieldId, formType, category)` calling convention for HAND:**
- First arg: the **textarea's ID** (e.g. `'observation-notes'`), NOT a container div ID.
- Second arg: the flat template key (e.g. `'HAND_OBS'`).
- Third arg: `''` (empty string) — causes fallback to `templates['HAND_OBS']` array.
- The `addButton()` call injects the button next to the textarea's `<label>`, not into a named container.

**`handchart.js` IDs — must all be present in `hand.html` or `HandChart.init()` returns early:**
- `#hctype-sel` — marker type dropdown
- `#hand-svg-r` — right hand SVG (with `<g id="markers-r">` inside)
- `#hand-svg-l` — left hand SVG (with `<g id="markers-l">` inside)
- `#hand-marker-list` — marker list display element
- Missing any of these → `init()` returns without attaching events. No error thrown.
