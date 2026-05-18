# Lessons Learned — Archive (Apr–May 2026)

Historical "Lessons Learned" sections from the original CLAUDE.md. Preserved for reference. Do NOT load every session — only consult if investigating a past decision or repeated pattern.

Key actionable rules from these sessions have been migrated to WORKFLOW.md (Anti-Repeat Rules section). This file is the full original context.

---

## Lessons Learned — Code Review Session 2026-04-26

1. **Dead code after return is invisible until you grep for it.**
   The orphaned block in export_pdf() had two `return response` and two `except Exception`
   blocks. Python never warns about unreachable code. The symptom would only surface if
   the try block logic changed. Pattern: after any large str_replace, grep for the function
   signature and visually trace the entire function body. Don't just check the replaced block.

2. **fetchone() without ORDER BY is a latent bug, not a current one.**
   get_episode_record() worked fine for months because no episode ever had duplicate records.
   The bug was invisible right up until it wasn't. Rule: any query that expects at most
   one row should have ORDER BY + LIMIT 1. SQLite result order is undefined without it.

3. **Copy-paste route handlers are a maintenance trap.**
   The 5 form routes in app.py are identical except for template name and current_form string.
   Every new form adds another copy. Same pattern as the boilerplate-in-every-form-html mistake
   from session 2026-04-25 — learned it for JS, didn't apply it to Python routes.
   Fix: generic /form/<form_id> route. Do this before adding HAND or NEURO.

4. **REQUIRED_FIELDS gaps are silent data quality holes.**
   CR and AMPUTATION forms save with empty diagnosis/impression because they're not in
   REQUIRED_FIELDS. The validation layer exists and works — it just wasn't extended when
   new forms were added. Rule: add to REQUIRED_FIELDS before a form is declared done.
   This is now in the form checklist (step 4.5).

5. **Code review catches bugs before they become mysterious symptoms.**
   All four bugs fixed this session would have been debugged eventually — as confusing
   symptoms (wrong PDF, empty form, silent error). A review pass every few sessions
   pays for itself in a project with heavy str_replace usage.

6. **Replacing a hack requires understanding why the hack existed.**
   api_stats() used __import__('database').get_conn() — ugly but functional, because
   get_conn was never in the module-level imports. Replacing it with a direct get_conn()
   call without adding the import = NameError at runtime. Before removing a workaround,
   ask: what problem was this solving? Then solve that problem properly first.

### What we should have done differently

- **Grep for orphaned code mechanically, not as a reminder.** After any replacement
  > 5 lines: grep for the function signature and read the entire function top to bottom.
  The CLAUDE.md already said this. It wasn't done. Make it a step, not a guideline.

- **Generic form route from form 2.** The pattern was obvious by form 2. Ten minutes
  to write /form/<form_id> would have saved more than that across 5 form additions.
  Architecture decisions compound — make the right call early.

- **REQUIRED_FIELDS is now in the form checklist** (see Adding a New Form section).
  It wasn't before. Now it is.

---

## Lessons Learned — Session 2026-04-25 (The Big Session)

### What We Learned The Hard Way

1. **Orphaned code is the silent killer.**
   Every time we rewrote a function (show() in clinical_templates.js, draw() in pdf_cr.py),
   the old code body was left behind. The new code ran first, then hit the orphaned block
   and crashed. Pattern: after any large str_replace, grep for remnants of the old code.

2. **clinical_templates.js was structurally broken for multiple sessions.**
   The template picker had orphaned picker.style.cssText = [...] outside any function.
   This silently broke the entire IIFE module — ClinicalTemplates was never defined.
   This caused cascading failures across ALL forms (no template buttons, no MPIS, crashes).
   Lesson: when multiple unrelated things break at once, suspect a broken module.

3. **window.Form is not the same as window.ActiveForm.**
   form_geriatric.js set window.ActiveForm but not window.Form.
   main.js calls Form.onPtTypeChange() on init — undefined = crash.
   Every new form MUST set both. Check the checklist.

4. **onPtTypeChange without null guards = form-specific crashes.**
   form_base.js's onPtTypeChange did direct getElementById without null checks.
   Geriatric doesn't have country-field or sex-field so it crashed on load.
   Fix: always use null-guarded helpers when accessing optional DOM elements.

5. **Boilerplate copy-paste creates maintenance debt.**
   We had patient prefill + episode wrapper + nav buttons copied into 4 form HTML files.
   When we fixed a bug in one, the others still had the old version.
   Fix: initFormContext() centralises all of this. New forms are zero-boilerplate.

6. **FORM_REGISTRY defined before app = Flask() crashes the exe.**
   We put the registry and @app.context_processor before app was created.
   Python executes decorators immediately — no app object yet = NameError.
   Fix: always define app first, registry second.

7. **SVG zone heights can be negative if coordinate conventions are mixed.**
   Tried to reuse fraction constants named R_MID_TOP/R_MID_BOT but their values
   were named for "top of screen" (small Y) vs "bottom of zone" (large Y in SVG).
   Passing them in wrong order produced negative heights. Rename to be explicit:
   R_MID_TOP_Y = where upper zone ends (smaller Y value in SVG).

8. **PDF export used stored form_type, not current form type.**
   Switching forms and exporting gave the old form's PDF because the record's
   stored meta.form was still the previous type. Fix: pass ?form_type= as query param
   from the frontend, always use that as highest priority in the backend.

9. **str_replace on the same file multiple times in one session accumulates drift.**
   After each successful edit, the previous view output is stale. Subsequent edits
   based on stale output can miss, duplicate, or corrupt content.
   Discipline: re-view file after every edit before making the next one.

10. **Text wrap in ReportLab tables.**
    Plain strings in table cells don't wrap — they overflow or crash.
    Always use Paragraph() objects in table cells. This was learned in an earlier
    session but worth repeating: Paragraph(text, style) not just text.

### What We Should Have Done Differently

- **Plan the boilerplate centralisation earlier.** We wrote the same 50 lines of
  patient prefill + nav button code into 4 separate form files before realising
  it should be in one place. Should have designed initFormContext() before form 2.

- **Test each form in isolation before moving to the next.**
  We built CR form, discovered it had 8 bugs, fixed them all in a rush.
  Better: build one section, test, then build the next.

- **Read clinical_templates.js top to bottom before each edit.**
  We made 4 separate edits to it across the session without reading the full file
  each time. Result: multiple orphaned blocks accumulating. A single full read
  would have caught this immediately.

- **Agreed on the lung diagram scope earlier.**
  We built a 4-box grid, then a 6-zone anatomical version, then fixed the R/L labels,
  then fixed the coordinate math. Three iterations for something that could have been
  planned in 5 minutes with a sketch.

---


## Lessons Learned — Session 2026-04-26 (Amputation Form Session)

1. **Modal form picker was hardcoded — missed when adding new forms.**
   The New Episode modal had 4 hardcoded form cards. FORM_REGISTRY drove the sidebar
   dynamically but not the modal. Always update BOTH when adding a new form.
   Fix: modal now shows all 15 forms, not-ready ones greyed out with "Soon" badge.

2. **getCurrentFormType() only checked d.meta.form, not d._form_type.**
   Export KKM PDF was passing form_type=MS for amputation records because the
   check for _form_type was missing. Spotted instantly via network tab URL showing
   ?form_type=MS. Lesson: when an export gives wrong output, check the network tab first.

3. **BodyChart.collect() does not exist.**
   The method is BodyChart.getData() / BodyChart.loadData() / BodyChart.clearAll().
   Also the key must be bodyChart (camelCase) not body_chart (snake_case) to match
   how MS/Spine store it. PDF generator must accept both via _ensure_dict fallback.

4. **patient and body_chart from DB may be JSON strings, not dicts.**
   When load_record returns data, nested objects like patient and bodyChart may still
   be JSON-encoded strings. Always call _ensure_dict() before .get() on any nested
   object from DB records.

5. **two_col() and body_chart_section() return single Table objects, not lists.**
   story += Table crashes. Use story.append(). body_chart_section same issue.
   When in doubt: check the function return type in pdf_platypus_base.py before using +=.

6. **Nested tables inside ruled_section() overflow their cells.**
   MMT and MRMI tables embedded inside ruled_section() rows blew out column bounds.
   Fix: render complex tables as flat flowables alongside ruled_section(), not inside it.
   Use INN = column_width - 8*mm for nested table colWidths to account for cell padding.

7. **sign_chop_block() — standardised across all forms.**
   After multiple iterations trying to right-align the sign & chop block, the cleanest
   solution is a simple reusable helper in pdf_platypus_base.py. All forms use it.
   Never inline custom sign/chop code again — just call sign_chop_block().

8. **Inline JS in HTML onclick attributes cannot contain single quotes or newlines.**
   The MMT "Add row" button had escaped JS strings inside onclick="..." attribute.
   The quotes and newlines broke the HTML attribute parsing, rendering raw JS as text.
   Fix: always move complex onclick logic to a named function in the form JS file.
   This is a repeat of the CLAUDE.md Python \n in JS string lesson — same root cause.

---


## Lessons Learned — Session 2026-04-26 Part 2 (Amputation Polish + Session Header)

1. **Episode modal was hardcoded — always check when adding new forms.**
   The New Episode modal had 4 hardcoded form cards independent of FORM_REGISTRY.
   Fixed by rendering all 15 forms, greying out not-ready ones with "Soon" badge.
   Rule: whenever FORM_REGISTRY changes, check home.html modal too.

2. **getCurrentFormType() only checked d.meta.form, missed d._form_type.**
   Export KKM PDF was passing form_type=MS for amputation. Spotted immediately
   via network tab URL. Lesson: check network tab URL first when export gives wrong output.

3. **BodyChart API: getData() not collect(). Key: bodyChart not body_chart.**
   There is no BodyChart.collect() or BodyChart.populate(). Always use:
     collect:  bodyChart: { markers: BodyChart.getData(), notes: gv('chart-notes') }
     populate: BodyChart.loadData(data.bodyChart.markers)
     reset:    BodyChart.clearAll()

4. **patient and bodyChart from DB load as JSON strings, not dicts.**
   Use _ensure_dict() in PDF generators before calling .get() on any nested object.
   This is now documented in PDF rules. Do not forget on new PDF generators.

5. **two_col() and body_chart_section() return Table, not list.**
   Use story.append() not story +=. Learned the hard way again this session.
   Added to PDF rules. Check return type before using += on any platypus helper.

6. **Nested tables inside ruled_section() overflow — use INN width.**
   Tables inside table cells must account for padding.
   INN = column_width - 8*mm for inner table colWidths.

7. **sign_chop_block() — build reusable helpers, not inline code.**
   After 9 iterations of sign & chop positioning, the right answer was always:
   simple flat paragraphs outside any box, as a shared helper. Keep it simple.
   Pattern now documented and used across all 5 PDF generators.

8. **inline onclick with complex JS bleeds as visible text.**
   MMT add-row button had escaped JS strings inside onclick="" attribute.
   Browser rendered the raw JS as visible page text. Always move complex onclick
   to a named function in the JS file. This is the CLAUDE.md Python newline lesson
   in HTML form — same root cause, different surface.

9. **clinical_templates insert() called focus() after hide() nulled activeField.**
   Classic order-of-operations: save reference to local var before calling hide().
   Simple fix, documented in code.

10. **Session header as shared injectable — the right architecture call.**
    POMR fields (Nombor Giliran, KPI, Dilihat, Temujanji) belong at session level,
    not form level. Putting them in episode.html SOAP modal means ALL forms get them
    automatically — zero extra work per new form. This is the correct layering:
      - Form-specific: form_xxx.html, form_xxx.js, pdf_xxx.py
      - Session-level shared: episode.html SOAP modal
      - PDF shared: pdf_platypus_base.py helpers

11. **MPIS SOAP output should match actual dept POMR format, not custom format.**
    The department uses a Word POMR template with Malay headers. Our MPIS output
    should match that exactly so paste is seamless. Malay headers + English SOAP
    content is correct and intentional — that is the clinical convention.

---

## Lessons Learned — NEURO PDF Rewrite Session 2026-04-28

1. **`patient: FormBase.collectPatient()` is a separate requirement from `meta: { form: 'XXX' }`.**
   Both must be present in collect(). They fail in different ways:
   - Missing `meta.form` → validator picks wrong REQUIRED_FIELDS → 422 with wrong field errors
   - Missing `patient` → validator can't find `patient.name` / `patient.date` → 422 even if all form fields are filled
   NEURO had `meta.form` fixed in the previous session but still 422'd — because `patient` was also missing.
   Both are now in the Anti-Repeat Rules and the new form template. Two bugs, one symptom.

2. **Flask does not auto-reload .py changes. Restart it.**
   Same error memory address across two separate requests = same process still running.
   The pdf_neuro.py rewrite was not picked up until Flask was manually restarted (Ctrl+C → `python app.py`).
   Rule: after changing any .py file, tell the user to restart Flask before testing. Make it explicit.

3. **ReportLab "too large" error = a single flowable exceeds the frame height (~750pt / 264mm).**
   `two_col()` returns ONE Table. If that table's height > frame, it cannot be split — error and crash.
   The fix is not to flatten the layout; it's to split the content into multiple shorter `two_col()` blocks.
   Each block must be ≤ ~250mm. ReportLab will move a block to the next page if needed, but it
   cannot split a block that is taller than the frame. Think of each `two_col()` as a unit, not a section.

4. **Nested tables inside `rs()` must be `(None, table)` rows — not siblings.**
   When MRMI table and outcome_t were siblings of their header rows in the `two_col` list,
   they rendered as disconnected floating elements with a box header above them. No error.
   Correct pattern: the table goes as the `content` of an `rs()` row — `(None, table)` —
   so it's contained inside the ruled section's border. Always test page 3+ of any PDF for this.

5. **KKM form ref numbers must be verified against the real printed form.**
   CLAUDE.md had `MOH/P/FIS/27.25(HB)-e` for NEURO. The real form says `fisio/b.pen. 21/2022`.
   PDF audit compliance depends on this matching exactly. When in doubt, ask for the physical form scan.
   All refs are now documented in the Key Clinical Context section — check there first.

6. **Never flatten a 2-column layout because of a ReportLab error.**
   The first instinct when "too large" error fires is to simplify the layout to flat single-column.
   This is wrong — it breaks audit compliance, visual match to KKM borang, and user trust.
   The right fix is always: split the two_col blocks smaller. The layout must stay 2-column.

### What we should have done differently

- **Split two_col blocks from the start on any form with > 20 content rows.**
  The "too large" error was entirely predictable from the content volume. NEURO has 11 sections.
  A single two_col block covering 6 sections will always exceed 264mm on A4. Plan for 2–3 blocks
  per page from the moment you start the PDF generator — not as a bugfix pass.

- **Flatten-then-rewrite cost a full round-trip.** The intermediate flat PDF was wrong layout,
  the Flask-not-restarted confusion added ambiguity, and the user had to share form images to
  confirm the requirement was always 2-column. One clarifying question up front ("should this match
  the 2-column borang layout?") saves all of that.

---

## Lessons Learned — NEURO Bug Fix Session 2026-04-28

1. **`collect()` needs both `_form_type` AND `meta.form` — they serve different consumers.**
   `_form_type` feeds `getCurrentFormType()` in the frontend → `?form_type=` query param → PDF routing.
   `meta.form` feeds `validate_record()` in `database.py` → `REQUIRED_FIELDS` lookup.
   NEURO set `_form_type` only. Validator defaulted to `'MS'`, applied wrong REQUIRED_FIELDS, returned 422.
   The fix is a single key in collect(). The trap is that both keys must exist and match — forever.
   New rule: every form's collect() template must include both from day one.

2. **The home.html episode modal is hardcoded — it does NOT follow FORM_REGISTRY.**
   FORM_REGISTRY drives the sidebar dynamically. The episode modal is static HTML.
   When NEURO was built, FORM_REGISTRY was updated → sidebar showed NEURO. Modal still had `soon` class.
   The "all 15 forms shown" modal overhaul ran before NEURO was ready, so NEURO got `soon` correctly.
   Then NEURO shipped but no one revisited the modal. Modal card greyed out in production.
   Fix: home.html modal review is now step 1.5 in the new form checklist, tied to ready=True.

3. **CSS classes used in HTML must actually exist in style.css — grep before assuming.**
   `.chip` and `.chip-group` were used in 7 places across neuro.html before anyone checked style.css.
   Assumption: "chips worked in amputation, so the class must exist." It didn't — amputation uses `.irr-chip`.
   Result: all chip multi-selects rendered as plain unstyled text. Clear button didn't fix it (it was CSS, not data).
   Lesson: when reusing a UI pattern from another form, check whether the CSS class name actually matches.

4. **BodyChart never accepts a container ID — it needs the real SVG nodes in the DOM.**
   `BodyChart.init()` in main.js auto-fires when `#svg-ant` exists. It hardcodes IDs `#ptype-sel`,
   `#svg-ant`, `#svg-post` — no container abstraction. A placeholder div = those IDs missing =
   null.addEventListener crash. There is no "lazy init" path. Either the full SVG is in the DOM or it isn't.
   Fix: copy the full SVG block from ms.html verbatim. No manual init call needed.

5. **Duplicate `<script>` tags for IIFEs that declare `const` at module level cause SyntaxError.**
   `bodychart.js` is an IIFE but declares `const BodyChart` at the top level of the script, not inside
   the IIFE. Loading it a second time in extra_js re-declares the const → SyntaxError → page broken silently.
   base.html already loads it. extra_js must never load it again. Check base.html before adding scripts.

6. **Template buttons require explicit `ClinicalTemplates.addButton()` calls — they are not automatic.**
   NEURO assessment templates were added to clinical_templates.js in the prior session. But the 6
   `addButton()` calls were never added to neuro.html extra_js. No error thrown — buttons simply absent.
   This is easy to forget because the rest of the form works fine without them. Add the calls during
   the form build, not as a follow-up, so the gap is obvious during the first test.

### What we should have done differently

- **Set both `_form_type` and `meta.form` from the very first version of collect().** The checklist
  said "set `_form_type`" without mentioning `meta.form`. The two-consumer split was documented in
  CLAUDE.md (PDF routing section) but not in the form creation checklist. A rule documented in one
  place but missing from the actionable checklist is effectively undiscoverable. Now in both places.

- **Test Save Record on the first day of a new form, before declaring it done.**
  The 422 would have been caught immediately on day one if we'd hit Save. We built the full form,
  ran node --check, confirmed UI looked right, and called it done — without ever clicking Save.
  For any future form: Save Record and Export KKM PDF are mandatory smoke tests before done status.

- **Check home.html modal as part of FORM_REGISTRY ready=True, not as an afterthought.**
  The modal review was not in the checklist. It is now. This bug will not recur.

- **Write `ClinicalTemplates.addButton()` calls during the form build, not at cleanup time.**
  If you write the HTML section, immediately write the corresponding addButton() call in extra_js.
  Leaving it for "later" guarantees it gets missed — the form looks fine in every other respect.

---

## TODO (next session priority order)

### High Priority
- [x] Git push — pushed to GitHub (PcGoDz/PT_Assessment_Form) — DONE 2026-04-28
- [x] UI redesign — full M3 reskin across style.css, base.html, home.html, episode.html, main.js — DONE 2026-05-07
- [ ] Full end-to-end exe build test (all 7 forms — build untested since NEURO was added)
- [x] HAND form — full implementation complete 2026-05-16

### Medium Priority
- [ ] Validation layer — UI enforcement (REQUIRED_FIELDS covers all 6 forms, needs frontend to surface errors)
- [ ] Bug 2: SOAP gate — prevent adding SOAP before first assessment is saved (blocked: clarify what "completed" means)
- [ ] Geriatric duplicate RN/IC fields cleanup (cosmetic, low effort)
- [ ] Age auto-calculation bug (NRIC->age, DOB->age) — still unresolved, deprioritised

### Lower Priority
- [ ] Draft vs Final state for assessment records
- [ ] Versioning UI (audit_log data exists, no UI yet)
- [ ] Remaining 9 forms: BURN, SCI, VESTIBULAR, FACIAL, PAEDIATRIC, LYMPHOEDEMA, NCD, GENERAL
- [ ] Shared table IIFEs: MmtTable, InvMedTable, refactor MovementTable (planned but not started)
- [ ] Accessibility: ARIA labels on toast, progress bar, sidebar nav items (low clinical priority)

### Done this session (2026-05-16 — HAND form)
- [x] `handchart.js` — IIFE `HandChart` with `init()`, `getData()`, `loadData()`, `clearAll()`, `remove()`. Click-to-place markers on `#hand-svg-r` and `#hand-svg-l`. 6 marker types matching `bodychart.js` colour scheme. `hand:'R'|'L'` field instead of `view:'ant'|'post'`.
- [x] `form_hand.js` — 13-section IIFE: collect/populate/reset for all fields. `initChips()` event-delegation pattern. `onManagementChange()` reveals `#surgery-date-row` when Surgical. `onHealthChange()` reveals `#sq-health-notes-row` when Other. Dynamic circumference table. `window.ActiveForm` + `window.Form` contract fulfilled.
- [x] `hand.html` — 13 HTML sections extending `base.html`. Inline `#hand-svg-r` / `#hand-svg-l` SVGs with `#markers-r` / `#markers-l` groups. Static 44-row ROM table via Jinja2 loop. 5 chip groups. 6 `ClinicalTemplates.addButton()` calls with textarea ID as first arg (not container div).
- [x] `pdf_hand.py` — `HandChartFlowable` draws two palmar outlines + coloured marker circles. 5 `two_col()` blocks. ROM table full-width between blocks 3 and 4 (conditional). `_ensure_dict()` on all nested fields. `sign_chop_block()` footer. `generate_hand_pdf()` + `generate_episode_pdf()`. KKM ref `fisio / b.pen. 12 / Pind. 2 / 2019`. Smoke test: 6503 bytes.
- [x] `app.py` — FORM_REGISTRY HAND `ready=True`, `FORM_TEMPLATES['HAND']`, `_PDF_GENERATORS['HAND']`, `_SINGLE_PDF_GENERATORS['HAND']`, `import pdf_hand`
- [x] `database.py` — `REQUIRED_FIELDS['HAND']`: diagnosis + pt_impression
- [x] `pt_assessment.spec` — `('pdf_hand.py', '.')` added to datas
- [x] `base.html` — `<script src="/static/js/handchart.js">` added after bodychart.js
- [x] `home.html` — HAND modal card activated (onclick, no soon class, `&#9995;` icon), formLabel + icon maps updated
- [x] `episode.html` — `tplMap` HAND→HAND_SOAP, both formLabel maps updated
- [x] `main.js` — `HandChart.init()` guard in `init()`, `_buildMpisHand()` builder, `copyToMpisHand()` async wrapper, switch case in `copyToMpisAuto()`, exported in return {}
- [x] `clinical_templates.js` — HAND_OBS, HAND_PALP, HAND_IMPRESSION, HAND_STG, HAND_LTG, HAND_PLAN in flat `templates` dict; `HAND_SOAP` moved into `TEMPLATES` const (critical bug fix — was silently failing `show()` lookup)

### Done this session (2026-05-07 — M3 UI redesign)
- [x] `style.css` restructured: M3 design tokens added (`--m3-surface-container`, `--m3-shape-sm/md/lg`, `--m3-elev-1/2/3`), new layout system (`.m3-context-bar`, `.m3-section-rail`, `.m3-content`)
- [x] `base.html` rebuilt: old topbar/sidebar replaced with `.m3-context-bar` + `.m3-section-rail`, dark toggle moved to settings gear dropdown
- [x] `home.html` fully rewritten (~2170 lines): `.dash-header` → `.home-ctx-bar` (neutral 56px bar), greeting card, settings dropdown with `toggleSettingsMenu()` + click-outside handler, `loadStats()` wired to init
- [x] `episode.html` fully rewritten (~760 lines): `.ep-topbar` → `.ep-ctx-bar` (neutral, border-bottom), settings gear dropdown, session info box CSS classes (`.session-info-box`, `.session-info-grid`), AMPUTATION+NEURO added to formLabel maps
- [x] `main.js` adapted: sidebar references updated to `#m3-sidebar` / `#m3-rail`, context bar references updated to `.m3-context-bar`
- [x] All 6 forms smoke-tested (MS, SPINE, GERIATRIC, CR, AMPUTATION, NEURO) — DOM hooks verified intact
- [x] DOM ID verification: 33 critical IDs in episode.html, 84 critical IDs in home.html — all present
- [x] All JS functions preserved character-for-character across home.html (~50 functions) and episode.html (15 functions)

### Done this session (2026-05-01 — MPIS modal + label fixes)
- [x] MPIS session header modal added to base.html (`#mpis-overlay` + `#mpis-modal`)
- [x] Modal CSS added to style.css (`.mpis-overlay`, `.mpis-modal`, `.mpis-modal-grid`, `.mpis-field`, etc.)
- [x] All 6 MPIS formatters refactored: `copyToMpisXxx()` → `_buildMpisXxx()` (builder, returns parts[])
- [x] `_doCopyMpis(parts, header)` finalizer added — wraps content with POMR header/footer, calls copyText
- [x] `showMpisHeaderModal()` / `cancelMpisModal()` / `confirmMpisModal()` added to Main IIFE
- [x] `copyToMpisAuto()` refactored — shows modal once, dispatches to correct builder, calls _doCopyMpis
- [x] Public wrappers `copyToMpisXxx()` — one-liners: await modal, if (!h) return, await _doCopyMpis
- [x] Main.cancelMpisModal + Main.confirmMpisModal exported in return {} block
- [x] "Date of Referral" → "Date of Assessment" in home.html (New Episode modal label + episode card text)
- [x] "Referral: " → "Assessment: " in episode.html context banner (PowerShell regex — em-dash in file)
- [x] Static KKM form serial number removed from topbar in base.html
- [x] 500 errors diagnosed as stale Flask process (not code bugs) — restarting Flask is the fix

### Done this session (2026-04-28 — NEURO form build + bug fixes + Git setup)
- [x] NEURO form — full HTML, form_neuro.js, pdf_neuro.py, MPIS, SOAP templates, spec, all registries
- [x] NEURO bug fixes: chip CSS, body chart SVG, duplicate script, 422 validator, modal card, template buttons
- [x] Git repository initialised and pushed to GitHub (https://github.com/PcGoDz/PT_Assessment_Form)
- [x] NEURO 422 fix pass 2: patient: FormBase.collectPatient() + populatePatient/resetPatient
- [x] Topbar resize CSS fix (scrollable actions row, .topbar-sub hidden at <900px)
- [x] pdf_neuro.py full rewrite — 2-column KKM layout, 4 two_col blocks, correct ref number

---

## Key Clinical Context

### Malaysian NRIC Logic
- 12 digits, no dashes
- First 6 = YYMMDD (birthdate)
- Last digit: odd = Male, even = Female
- Year: if YY <= current year's last 2 digits -> 2000s, else 1900s

### KKM Form References
- MS:        fisio / b.pen. 14 / Pind. 1 / 2019
- Spine:     fisio / b.pen. 6 / Pind. 2 / 2019
- Geriatric: fisio / b.pen. 15 / 2019
- CR:        fisio / b.pen. 11 / Pind. 2 / 2019
- Amputation: fisio / b.pen. 16 / 2019
- Hand:       fisio / b.pen. 12 / Pind. 2 / 2019
- Neurology: fisio/b.pen. 21/2022

### Lung Diagram (CR)
- 6 zones: RU, RM, RL (right lung), LU, LL (left lung), BASE (bilateral)
- Radiological view: patient RIGHT lung on viewer's LEFT, labelled R
- Zone IDs and finding colours must match between lungchart.js and pdf_cr.py exactly

---

## MPIS Integration

MPIS = Malaysian Patient Information System (hospital web app, plain text paste only).
copyToMpisAuto() in main.js dispatches based on form type (assessment forms).
copySOAPtoMpis() in episode.html handles SOAP/follow-up notes — outputs POMR format.
POMR format uses Malay headers (TARIKH, NOMBOR GILIRAN, KPI-SS-30 MINIT, DILIHAT, TEMUJANJI) + English content.

**Assessment MPIS flow (since 2026-05-01):**
All 6 assessment formatters trigger `#mpis-modal` (in base.html) to collect session header
fields (Tarikh, Nombor Giliran, KPI-SS-30 Minit, Dilihat, Temujanji Tarikh, Temujanji Masa)
BEFORE copying. The modal is promise-based — cancel resolves null, confirm resolves header obj.

  MS         -> copyToMpis()           (calls _buildMpisMs())
  SPINE      -> copyToMpisSpine()      (calls _buildMpisSpine())
  GERIATRIC  -> copyToMpisGeriatric()  (calls _buildMpisGeriatric())
  CR         -> copyToMpisCr()         (calls _buildMpisCr())
  AMPUTATION -> copyToMpisAmputation() (calls _buildMpisAmputation())
  NEURO      -> copyToMpisNeuro()      (calls _buildMpisNeuro())
  HAND       -> copyToMpisHand()       (calls _buildMpisHand())

Modal HTML: `#mpis-overlay` + `#mpis-modal` in base.html (always present).
Modal CSS: `.mpis-overlay` / `.mpis-modal` block in style.css before TOAST section.
Modal state: `_mpisModalResolve` — module-level var in Main IIFE.
Public API: `Main.cancelMpisModal()`, `Main.confirmMpisModal()` (called from base.html buttons).

---

## What's Done (as of 2026-05-16)

- [x] Patient registration with NRIC auto-derive (DOB/age/sex)
- [x] Patient edit modal in home.html
- [x] Episode management (create, discharge with reason, reactivate)
- [x] Delete patient (cascade wipe, two-step confirm)
- [x] MS assessment form + PDF + MPIS + SOAP templates
- [x] Spine assessment form + PDF + MPIS + SOAP templates
- [x] Geriatric assessment form + PDF + MPIS + SOAP templates
- [x] CR assessment form + PDF + MPIS + SOAP templates
- [x] Amputation form — full implementation (HTML, JS, PDF, MPIS, SOAP templates, body chart)
- [x] Body chart (SVG anterior + posterior, 6 pain types, markers in PDF)
- [x] Lung chart (SVG 6 zones, radiological view, click-to-mark, findings -> PDF)
- [x] Clinical templates for all 5 forms (assessment + per-form SOAP variants)
- [x] SOAP follow-up notes (session numbered, per-form-type templates)
- [x] PDF export for all 5 forms (episode PDF + single record PDF)
- [x] MPIS clipboard copy for all 5 forms (MS, Spine, Geriatric, CR, Amputation)
- [x] Episode modal — all 15 form cards shown, not-ready ones greyed out with "Soon" badge
- [x] sign_chop_block() helper in pdf_platypus_base — used by all 5 PDF generators
- [x] Session header fields in SOAP modal (Nombor Giliran, KPI-SS-30 min, Dilihat, Temujanji)
- [x] SOAP MPIS output follows POMR format (Malay headers matching dept Word template)
- [x] Frontend refactor: shared MPIS helpers (MPIS_LN/DIV/DASH, mpisSec(), copyText(), escapeHtml())
- [x] Autosave to localStorage (3s debounce) + draft recovery on reload
- [x] Dark mode (CSS variables, localStorage persisted)
- [x] Dynamic sidebar from FORM_REGISTRY (15 forms, collapsible groups)
- [x] Sidebar collapse toggle (hamburger button in topbar)
- [x] Context-aware form switching (preserves patient_id + episode_id in URL)
- [x] initFormContext() — zero-boilerplate pattern for all current + future forms
- [x] Generic form route /form/<form_id> — add to FORM_TEMPLATES for new forms
- [x] Export KKM PDF passes current form type as ?form_type= to override stored record type
- [x] PyInstaller .exe build (Windows, build.bat)
- [x] Code review fixes: dead code, ORDER BY on get_episode_record(), api_stats() __import__ hack, ALTER TABLE exception narrowing, CR+AMPUTATION REQUIRED_FIELDS
- [x] **delete_patient() wrapped in atomic transaction — partial deletes now impossible**
- [x] **discharge_reason stored in dedicated column — status field no longer pipe-encoded**
- [x] **home.html status parsing reads discharge_reason directly, with backwards-compat fallback**
- [x] **NEURO form — full implementation (HTML, JS, PDF, MPIS, SOAP templates, spec)**
- [x] **NEURO bug fix pass — chip CSS, body chart SVG, duplicate script, 422 validator, modal card, template buttons**
- [x] **Git repository initialised and pushed to GitHub (PcGoDz/PT_Assessment_Form)**
- [x] **NEURO save/PDF 422 fix (pass 2) — patient: FormBase.collectPatient() added to collect(); populatePatient/resetPatient wired in**
- [x] **Topbar resize CSS fix — scrollable actions row, .topbar-sub hidden at <900px**
- [x] **pdf_neuro.py full rewrite — 2-column KKM borang layout, 4 two_col blocks, correct ref number fisio/b.pen. 21/2022**
- [x] **Floating table fix on PDF page 3 — nested tables placed inside rs() rows not as siblings**
- [x] **MPIS session header modal — all 6 assessment formatters show session header prompt before copy**
- [x] **MPIS builder/wrapper/finalizer pattern — builders return parts[], _doCopyMpis wraps + copies**
- [x] **"Date of Referral" → "Date of Assessment" label change (home.html + episode.html)**
- [x] **Static KKM serial number removed from topbar**
- [x] **M3 UI redesign — style.css tokens, base.html shell, home.html dashboard, episode.html detail, main.js adapted**
- [x] **Dark mode toggle moved to settings gear dropdown on all pages (base.html, home.html, episode.html)**
- [x] **Neutral context bars replacing colored topbars across all standalone pages**
- [x] **episode.html formLabel maps updated to include AMPUTATION + NEURO (were missing)**
- [x] **Discharge action added to home.html active episode bottom sheet (`#ctx-menu-active`, `openActiveCtxMenu()`, `ctxDischarge()` wired to existing `#modal-discharge`)**
- [x] **Discharge modal + reactivate button added to patient.html episode cards**
- [x] **`.home-main` max-width removed (home.html inline style)**
- [x] **`.dash-content` max-width + margin:0 auto removed (style.css) — was centering "Seen Today" and "Active Patients" sections**
- [x] **`.active-pts-grid` changed from `repeat(4,1fr)` to `repeat(auto-fill, minmax(200px, 1fr))` — fills full width responsively**
- [x] **M3 SVG chevron applied to all `select` elements — `appearance:none` + inline SVG background, light (`#49454f`) and dark (`#c4c0ca`) variants**
- [x] **`seed_db.py` rewritten — 10 dummy patients (MS×2, SPINE×2, GERIATRIC×3, NEURO, AMPUTATION, CR), all active, skip-by-IC idempotency, `--reset` flag**
- [x] **HAND form — full implementation: `handchart.js` (R+L palmar SVG IIFE), `form_hand.js` (13 sections, chip delegation, reveal helpers), `hand.html` (44-row static ROM table, inline SVGs), `pdf_hand.py` (HandChartFlowable, 5 two_col blocks, ROM table full-width), MPIS builder `_buildMpisHand()`, clinical templates (HAND_OBS/PALP/IMPRESSION/STG/LTG/PLAN + HAND_SOAP), all 4 registries (FORM_REGISTRY, _PDF_GENERATORS, _SINGLE_PDF_GENERATORS, REQUIRED_FIELDS)**
- [x] **HAND form critical fix — `HAND_SOAP` moved from `templates[...]` flat dict into `TEMPLATES` const so `showSoapTemplate()` correctly resolves `objective`/`analysis`/`plan` sub-keys**

---


## 🔁 PERSISTENT REMINDER — Git Push Before Every Session

**Git is set up. Remote is live. Push at the start of every session.**
Remote: https://github.com/PcGoDz/PT_Assessment_Form

```bash
git add -A && git commit -m "session checkpoint" && git push
```

This is now a 2-minute habit, not a 5-session debt. Keep it that way.

---

## HANDOVER NOTE — NEURO Bug Fix Session 2026-04-28
