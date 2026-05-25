# Hand Assessment Form UI Rebuild — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite `templates/forms/hand.html` to comply with DESIGN_SYSTEM.md — 19 canonical sections with sidebar nav, `.card` layout, dynamic ROM + circumference tables — while preserving all `form_hand.js` element ID dependencies and updating the minimal surrounding JS/Python.

**Architecture:** New `hand.html` uses only design-system primitives (`.card`, `.fg`, `.field`, `.irr-chip`, `.pain-score-box`, `.body-chart-wrap`). Two new IIFE files handle dynamic tables (`hand_rom_table.js`, `hand_circ_table.js`). `form_hand.js` collect/populate/reset updated to delegate to new IIFEs and reflect new field IDs. `pdf_hand.py` updated for dynamic array rendering. Branch: `claude/refactor-hand-form-ui-rebuild` (already exists — do not create new branches).

**Tech Stack:** Flask/Jinja2, vanilla JS (IIFE), ReportLab, SQLite (unchanged)

---

## Worktree Setup (do this before Task 1)

Branch `claude/refactor-hand-form-ui-rebuild` already exists. Add a worktree pointing at it — do **not** create a new branch:

```bash
git worktree add ../hand-ui-rebuild claude/refactor-hand-form-ui-rebuild
```

All work happens in `../hand-ui-rebuild`. Paths below are relative to that root. Commit directly to this branch when done.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `templates/forms/hand.html` | **Rewrite** | 19-section canonical layout |
| `static/js/hand_rom_table.js` | **Create** | HandRomTable IIFE: init/collect/populate/reset |
| `static/js/hand_circ_table.js` | **Create** | HandCircTable IIFE: init/collect/populate/reset |
| `static/js/form_hand.js` | **Update** (collect/populate/reset + 2 new helpers) | Match new field IDs, delegate tables |
| `pdf_hand.py` | **Update** (`_build_story` only) | Render dynamic ROM, 4-type pinch, new fields |

Untouched: `handchart.js`, `database.py`, `app.py`, `clinical_templates.js`, `main.js`, `base.html`, `movement_table.js`

`style.css` — **one targeted deletion only:** remove the dead `.surgery-row.show` rule (see Task 15 Step 8a). No other style.css changes.

---

## ID Dependency Audit

### Preserved IDs — must exist verbatim in new hand.html

**Patient (FormBase contract):**
`pt-name`, `pt-nric` ⚠️ *(old hand.html used `pt-ic` — new HTML uses `pt-nric`, may fix Session B prefill bug as side effect)*, `pt-passport`, `pt-date`, `pt-dob`, `pt-age`, `pt-country`, `derived-dob`, `derived-gender`
Radio name `pt-type` (values `local`/`foreign`), radio name `pt-sex`

**Diagnosis:**
`diagnosis`, `referral-source`, `management-type`, `surgery-date`, `surgery-date-row` (reveal div), `surgery-type`

**Hand Chart:**
`hctype-sel`, `hand-svg-r`, `hand-svg-l`, `markers-r` (SVG `<g>`), `markers-l` (SVG `<g>`), `hand-marker-list`, `chart-notes`

**Special Questions:**
`sq-general-health`, `sq-health-notes`, `sq-health-notes-row` (reveal div), `sq-medications`, `sq-allergies`, `sq-occupation`, `sq-dominant-hand`

**Observation:**
`wound-notes` (maps to Local textarea), `observation-notes` (maps to General textarea)

**Palpation:**
`tenderness`, `temperature`, `texture`, `palpation-notes`

**ROM:** `rom-tbody` (HandRomTable renders into this tbody)

**Strength:** `grip-r`, `grip-l`, `pinch-r` (Pinch Lateral R), `pinch-l` (Pinch Lateral L)

**Circumference:** `circ-tbody` (HandCircTable renders into this tbody)

**Sensation:** `light-touch-r`, `light-touch-l`, `pin-prick-r`, `pin-prick-l`, `two-point-r`, `two-point-l`, `sensation-notes`

**Special Tests (fixed 4):** `tinels-r`, `tinels-l`, `phalens-r`, `phalens-l`, `finkelsteins-r`, `finkelsteins-l`, `fromens-r`, `fromens-l`

**Neurological — reflexes:** `ref-c5-l`, `ref-c5-r`, `ref-c6-l`, `ref-c6-r`, `ref-c7-l`, `ref-c7-r`, `ref-c8t1-l`, `ref-c8t1-r`

**Neurological — MMT (existing):** `mmt-deltoid-l/r`, `mmt-biceps-l/r`, `mmt-wristext-l/r`, `mmt-wristflex-l/r`, `mmt-fingermpext-l/r`, `mmt-triceps-l/r`, `mmt-fingerflex-l/r`, `mmt-intrinsics-l/r`

**Clinical output:** `pt-impression`, `stg`, `ltg`, `plan`

### New IDs — added by this rewrite

**Pain Assessment:**
`pain-pre`, `pain-post`, `pv-pre`, `pv-post` (VAS slider pattern from ms.html)
`pain-nature` (select), `pain-24hr` (select), `pain-agg` (text), `pain-ease` (text)
Irr-chip buttons: `irr-High`, `irr-Medium`, `irr-Low`

**History:**
`hx-current` (textarea, replaces chief-complaint + onset-date + mechanism)
`hx-past` (textarea, replaces pmh-chips + pmh-other + social-history + family-history)

**Special Questions (new fields):**
`sq-pmhx` (textarea), `sq-invest` (text), `sq-social` (text), `sq-rec` (text), `sq-splinting` (radio Yes/No/N/A)

**Strength (expanded):**
`pinch-lateral-r`, `pinch-lateral-l` *(note: pinch-r/pinch-l map to these in HTML labels only; IDs pinch-r/pinch-l preserved for collect compat)*
`pinch-pulp-r`, `pinch-pulp-l`, `pinch-3pt-r`, `pinch-3pt-l`
`pulp-opposition` (textarea), `fpc-2nd`, `fpc-3rd`, `fpc-4th`, `fpc-5th` (number inputs, cm)

**Neurological — MMT (new):**
`mmt-brachiorad-l`, `mmt-brachiorad-r`

**Custom special tests:**
`special-custom-tbody` (tbody for user-added tests)

### Deprecated IDs — removed from HTML, form_hand.js updated

`pain-score-r`, `pain-score-l` → replaced by `pain-pre`/`pain-post` VAS
`pain-nature-chips` chip group → replaced by `pain-nature` select
`pain-aggravate` → renamed `pain-agg`
`pain-relieve` → renamed `pain-ease`
`chief-complaint`, `onset-date`, `mechanism` → merged into `hx-current`
`pmh-chips`, `pmh-other`, `social-history`, `family-history` → replaced by `hx-past` + sq fields
`skin-chips`, `deformity-chips`, `swelling-chips` → removed; Observation becomes two freetext textareas

### Breaking changes for saved records (note in HANDOVER.md)
- Pain: old `painScoreR`/`painScoreL` → new `painPre`/`painPost`
- History: old `chiefComplaint`/`onsetDate`/`mechanism` → new `hxCurrent`
- Old chip arrays (`skinCondition`, `deformity`, `swelling`, `pastMedHistory`) → removed from collect output; old records partially populate

---

## Task 1: Verify ID list against current files

**Files:** Read-only verification

- [ ] **Step 1: Grep form_hand.js for all getElementById calls**

```bash
grep -oP "getElementById\('\K[^']+" static/js/form_hand.js | sort
```

Expected: matches the "Preserved IDs" table above. Any ID in the output that is NOT in the preserved list is a risk — add it to the list.

- [ ] **Step 2: Grep handchart.js for element IDs**

```bash
grep -oP "getElementById\('\K[^']+" static/js/handchart.js | sort
```

Expected: `hand-svg-r`, `hand-svg-l`, `hctype-sel`, `markers-r`, `markers-l`, `hand-marker-list`

- [ ] **Step 3: Confirm surgery-date-row reveal logic**

```bash
grep "surgery-date-row\|sq-health-notes-row" static/js/form_hand.js
```

Expected: both IDs appear in `onManagementChange()` and `onHealthChange()`. Both must exist as `id="..."` on `<div>` elements in the new HTML.

---

## Task 2: Write hand.html — skeleton (extends + sidebar_nav + empty content)

**Files:**
- Rewrite: `templates/forms/hand.html`

- [ ] **Step 1: Write the skeleton**

Replace entire `templates/forms/hand.html` with:

```jinja
{% extends "base.html" %}

{% block form_name %}Hand Assessment{% endblock %}

{% block sidebar_nav %}
<div class="nav-item" onclick="Main.go('s-patient')"><span class="nav-icon">&#128100;</span> Patient Info</div>
<div class="nav-item" onclick="Main.go('s-dx')"><span class="nav-icon">&#128203;</span> Diagnosis</div>
<div class="nav-item" onclick="Main.go('s-pain')"><span class="nav-icon">&#128202;</span> Pain Score</div>
<div class="nav-item" onclick="Main.go('s-chart')"><span class="nav-icon">&#9995;</span> Hand Chart</div>
<div class="nav-item" onclick="Main.go('s-hx-current')"><span class="nav-icon">&#128214;</span> Current Hx</div>
<div class="nav-item" onclick="Main.go('s-hx-past')"><span class="nav-icon">&#128218;</span> Past Hx</div>
<div class="nav-item" onclick="Main.go('s-sq')"><span class="nav-icon">&#10067;</span> Special Qs</div>
<div class="nav-item" onclick="Main.go('s-obs')"><span class="nav-icon">&#128065;</span> Observation</div>
<div class="nav-item" onclick="Main.go('s-palp')"><span class="nav-icon">&#128400;</span> Palpation</div>
<div class="nav-item" onclick="Main.go('s-rom')"><span class="nav-icon">&#128260;</span> ROM</div>
<div class="nav-item" onclick="Main.go('s-strength')"><span class="nav-icon">&#128170;</span> Strength</div>
<div class="nav-item" onclick="Main.go('s-circ')"><span class="nav-icon">&#128207;</span> Circumference</div>
<div class="nav-item" onclick="Main.go('s-sensation')"><span class="nav-icon">&#9889;</span> Sensation</div>
<div class="nav-item" onclick="Main.go('s-neuro')"><span class="nav-icon">&#9881;</span> Neurological</div>
<div class="nav-item" onclick="Main.go('s-special')"><span class="nav-icon">&#128300;</span> Special Tests</div>
<div class="nav-item" onclick="Main.go('s-impression')"><span class="nav-icon">&#127919;</span> PT Impression</div>
<div class="nav-item" onclick="Main.go('s-stg')"><span class="nav-icon">&#128204;</span> Short-Term Goals</div>
<div class="nav-item" onclick="Main.go('s-ltg')"><span class="nav-icon">&#127942;</span> Long-Term Goals</div>
<div class="nav-item" onclick="Main.go('s-plan')"><span class="nav-icon">&#128221;</span> Plan</div>
{% endblock %}

{% block content %}
<!-- sections go here — added in Tasks 3–10 -->
{% endblock %}

{% block extra_js %}
<!-- scripts go here — added in Task 10 -->
{% endblock %}
```

- [ ] **Step 2: Verify block names**

```bash
grep "block form_name\|block sidebar_nav\|block content\|block extra_js\|block title" templates/forms/hand.html
```

Expected: `form_name`, `sidebar_nav`, `content`, `extra_js` — NO `block title`.

---

## Task 3: hand.html — Section 01 Patient Info

**Files:** Modify `templates/forms/hand.html`

- [ ] **Step 1: Add Section 01 inside `{% block content %}`**

Replace `<!-- sections go here -->` comment with:

```html
<!-- 01 PATIENT INFO -->
<div class="card" id="s-patient">
  <div class="card-header">
    <span class="sec-num">01</span>
    <h2>Patient Information</h2>
  </div>
  <div class="card-body">
    <div class="fg">
      <div class="field">
        <label>Patient Type</label>
        <div class="radio-group">
          <label><input type="radio" name="pt-type" value="local" onchange="FormBase.onPtTypeChange()"> Malaysian (NRIC)</label>
          <label><input type="radio" name="pt-type" value="foreign" onchange="FormBase.onPtTypeChange()"> Foreign (Passport)</label>
        </div>
      </div>
      <div class="fg c2">
        <div class="field" style="grid-column:span 2">
          <label>Full Name <span class="req">*</span></label>
          <input type="text" id="pt-name" placeholder="Patient full name">
        </div>
        <div class="field" id="nric-field">
          <label>NRIC No. <span class="req">*</span></label>
          <input type="text" id="pt-nric" placeholder="e.g. 661010071234" maxlength="12" oninput="FormBase.onNricInput(this.value)">
          <div class="derived-info">
            <span class="derived-badge hidden" id="derived-dob"></span>
            <span class="derived-badge hidden" id="derived-gender"></span>
          </div>
        </div>
        <div class="field" id="passport-field" style="display:none">
          <label>Passport No. <span class="req">*</span></label>
          <input type="text" id="pt-passport" placeholder="Passport number">
        </div>
        <div class="field" id="country-field" style="display:none">
          <label>Country of Origin</label>
          <select id="pt-country">
            <option value="">— Select —</option>
            <option value="No Information">No Information</option>
            <option value="Stateless">Stateless</option>
            <optgroup label="ASEAN">
              <option>Indonesia</option><option>Myanmar</option><option>Philippines</option>
              <option>Thailand</option><option>Vietnam</option><option>Cambodia</option>
              <option>Laos</option><option>Brunei</option><option>Singapore</option><option>Timor-Leste</option>
            </optgroup>
            <optgroup label="South Asia">
              <option>Bangladesh</option><option>India</option><option>Pakistan</option>
              <option>Nepal</option><option>Sri Lanka</option><option>Afghanistan</option>
            </optgroup>
            <optgroup label="East Asia">
              <option>China</option><option>Taiwan</option><option>Japan</option>
              <option>South Korea</option><option>Hong Kong</option>
            </optgroup>
            <optgroup label="Middle East">
              <option>Saudi Arabia</option><option>Yemen</option><option>Iraq</option>
              <option>Iran</option><option>Jordan</option><option>Syria</option>
            </optgroup>
            <optgroup label="Africa">
              <option>Nigeria</option><option>Somalia</option><option>Ghana</option>
              <option>Ethiopia</option><option>Kenya</option><option>Tanzania</option>
            </optgroup>
            <optgroup label="Other">
              <option>Australia</option><option>United Kingdom</option><option>United States</option>
              <option>France</option><option>Germany</option><option>Netherlands</option>
              <option>Other (not listed)</option>
            </optgroup>
          </select>
        </div>
        <div class="field">
          <label>Assessment Date <span class="req">*</span></label>
          <input type="date" id="pt-date">
        </div>
        <div class="field">
          <label>Date of Birth</label>
          <input type="date" id="pt-dob" onchange="FormBase.onDobChange(this.value)">
        </div>
        <div class="field">
          <label>Age</label>
          <input type="number" id="pt-age" placeholder="Years" min="0" max="130">
        </div>
        <div class="field" id="sex-field" style="display:none">
          <label>Sex <span class="req">*</span></label>
          <div class="radio-group">
            <label><input type="radio" name="pt-sex" value="M"> Male</label>
            <label><input type="radio" name="pt-sex" value="F"> Female</label>
          </div>
        </div>
        <div class="field">
          <label>Dominant Hand</label>
          <select id="sq-dominant-hand">
            <option value="">— Select —</option>
            <option>Right</option>
            <option>Left</option>
            <option>Ambidextrous</option>
          </select>
        </div>
      </div>
    </div>
  </div>
</div>
```

---

## Task 4: hand.html — Sections 02 (Diagnosis) and 03 (Pain)

**Files:** Modify `templates/forms/hand.html`

- [ ] **Step 1: Append Section 02 after Section 01**

```html
<!-- 02 DIAGNOSIS & DOCTOR'S MANAGEMENT -->
<div class="card" id="s-dx">
  <div class="card-header">
    <span class="sec-num">02</span>
    <h2>Diagnosis &amp; Doctor's Management</h2>
  </div>
  <div class="card-body">
    <div class="fg c2">
      <div class="field" style="grid-column:span 2">
        <label>Diagnosis <span class="req">*</span></label>
        <textarea id="diagnosis" placeholder="Working diagnosis from referring doctor..."></textarea>
      </div>
      <div class="field">
        <label>Referral Source</label>
        <select id="referral-source">
          <option value="">— Select —</option>
          <option>Orthopaedic</option>
          <option>Plastic Surgery</option>
          <option>Neurosurgery</option>
          <option>General Surgery</option>
          <option>Rheumatology</option>
          <option>Self-referral</option>
          <option>Other</option>
        </select>
      </div>
      <div class="field">
        <label>Doctor's Management</label>
        <select id="management-type" onchange="HandForm.onManagementChange()">
          <option value="">— Select —</option>
          <option value="Conservative">Conservative</option>
          <option value="Surgical">Surgical</option>
        </select>
        <div class="surgery-row" id="surgery-date-row">
          <span style="font-size:12px;color:var(--text-muted);white-space:nowrap">Surgery date:</span>
          <input type="date" id="surgery-date" style="flex:1">
        </div>
      </div>
      <div class="field">
        <label>Surgery / Procedure Type</label>
        <input type="text" id="surgery-type" placeholder="e.g. ORIF, tendon repair, nerve graft...">
      </div>
      <div class="field">
        <label>Problem</label>
        <textarea id="pt-problem" placeholder="Main presenting problem..." style="min-height:52px"></textarea>
      </div>
    </div>
  </div>
</div>
```

- [ ] **Step 2: Append Section 03 (Pain)**

```html
<!-- 03 PAIN ASSESSMENT -->
<div class="card" id="s-pain">
  <div class="card-header">
    <span class="sec-num">03</span>
    <h2>Pain Assessment</h2>
  </div>
  <div class="card-body">
    <div class="fg">
      <div class="fg c2">
        <div class="pain-score-box">
          <label style="font-size:11px;font-weight:500;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.04em">PRE-treatment Pain (VAS 0&ndash;10)</label>
          <div class="pain-scale-row">
            <span style="font-size:11px;color:var(--text-faint)">0</span>
            <input type="range" id="pain-pre" min="0" max="10" value="0" step="1" oninput="Form.setPain('pre', this.value)">
            <span style="font-size:11px;color:var(--text-faint)">10</span>
            <div class="pain-val pv-low" id="pv-pre">0</div>
          </div>
        </div>
        <div class="pain-score-box">
          <label style="font-size:11px;font-weight:500;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.04em">POST-treatment Pain (VAS 0&ndash;10)</label>
          <div class="pain-scale-row">
            <span style="font-size:11px;color:var(--text-faint)">0</span>
            <input type="range" id="pain-post" min="0" max="10" value="0" step="1" oninput="Form.setPain('post', this.value)">
            <span style="font-size:11px;color:var(--text-faint)">10</span>
            <div class="pain-val pv-low" id="pv-post">0</div>
          </div>
        </div>
      </div>
      <div class="fg c2">
        <div class="field">
          <label>Nature of Pain</label>
          <select id="pain-nature">
            <option value="">&#8212; Select &#8212;</option>
            <option>Sharp</option>
            <option>Dull aching</option>
            <option>Burning</option>
            <option>Throbbing / Pulsating</option>
            <option>Shooting</option>
            <option>Tingling / Pins &amp; needles</option>
            <option>Cramping</option>
            <option>Stiffness / Tightness</option>
            <option>Mixed (describe in notes)</option>
          </select>
        </div>
        <div class="field">
          <label>24-Hour Behaviour</label>
          <select id="pain-24hr">
            <option value="">&#8212; Select &#8212;</option>
            <option>Constant</option>
            <option>Intermittent</option>
            <option>Worse in morning</option>
            <option>Worse in evening</option>
            <option>Worse with activity</option>
            <option>Worse at rest</option>
            <option>Nocturnal</option>
          </select>
        </div>
        <div class="field">
          <label>Aggravating Factors</label>
          <input type="text" id="pain-agg" placeholder="e.g. gripping, writing, cold...">
        </div>
        <div class="field">
          <label>Easing Factors</label>
          <input type="text" id="pain-ease" placeholder="e.g. rest, elevation, splint...">
        </div>
      </div>
      <div class="field">
        <label>Irritability</label>
        <div class="irr-chips">
          <button class="irr-chip" id="irr-High"   onclick="Form.pickIrr('High')">High</button>
          <button class="irr-chip" id="irr-Medium" onclick="Form.pickIrr('Medium')">Medium</button>
          <button class="irr-chip" id="irr-Low"    onclick="Form.pickIrr('Low')">Low</button>
        </div>
      </div>
    </div>
  </div>
</div>
```

---

## Task 5: hand.html — Section 04 Hand Chart

**Files:** Modify `templates/forms/hand.html`

- [ ] **Step 1: Append Section 04**

```html
<!-- 04 HAND CHART -->
<div class="card" id="s-chart">
  <div class="card-header">
    <span class="sec-num">04</span>
    <h2>Hand Chart</h2>
  </div>
  <div class="card-body">
    <div class="body-chart-wrap">
      <div class="body-figures">
        <!-- RIGHT HAND (palmar) -->
        <div class="fig-wrap">
          <div class="fig-label">Right Hand (Palmar)</div>
          <svg id="hand-svg-r" class="bsvg" viewBox="0 0 200 300" width="160" height="240" style="cursor:crosshair">
            <rect x="55" y="130" width="110" height="100" rx="12" fill="none" stroke="var(--text-muted)" stroke-width="2"/>
            <ellipse cx="50" cy="110" rx="18" ry="35" fill="none" stroke="var(--text-muted)" stroke-width="2"/>
            <rect x="65" y="55" width="22" height="78" rx="10" fill="none" stroke="var(--text-muted)" stroke-width="2"/>
            <rect x="91" y="40" width="22" height="93" rx="10" fill="none" stroke="var(--text-muted)" stroke-width="2"/>
            <rect x="117" y="50" width="22" height="83" rx="10" fill="none" stroke="var(--text-muted)" stroke-width="2"/>
            <rect x="143" y="70" width="20" height="65" rx="10" fill="none" stroke="var(--text-muted)" stroke-width="2"/>
            <text x="100" y="290" text-anchor="middle" font-size="11" fill="var(--text-muted)">R</text>
            <g id="markers-r"></g>
          </svg>
        </div>
        <!-- LEFT HAND (palmar) -->
        <div class="fig-wrap">
          <div class="fig-label">Left Hand (Palmar)</div>
          <svg id="hand-svg-l" class="bsvg" viewBox="0 0 200 300" width="160" height="240" style="cursor:crosshair">
            <rect x="35" y="130" width="110" height="100" rx="12" fill="none" stroke="var(--text-muted)" stroke-width="2"/>
            <rect x="37" y="70" width="20" height="65" rx="10" fill="none" stroke="var(--text-muted)" stroke-width="2"/>
            <rect x="61" y="50" width="22" height="83" rx="10" fill="none" stroke="var(--text-muted)" stroke-width="2"/>
            <rect x="87" y="40" width="22" height="93" rx="10" fill="none" stroke="var(--text-muted)" stroke-width="2"/>
            <rect x="113" y="55" width="22" height="78" rx="10" fill="none" stroke="var(--text-muted)" stroke-width="2"/>
            <ellipse cx="150" cy="110" rx="18" ry="35" fill="none" stroke="var(--text-muted)" stroke-width="2"/>
            <text x="100" y="290" text-anchor="middle" font-size="11" fill="var(--text-muted)">L</text>
            <g id="markers-l"></g>
          </svg>
        </div>
      </div>
      <div class="chart-controls">
        <div>
          <div style="font-size:11px;font-weight:500;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:7px">Select type then click hand</div>
          <div>
            <select id="hctype-sel" style="width:100%;margin-bottom:6px">
              <option value="pain">&#9679; Pain</option>
              <option value="numb">&#9679; Numbness</option>
              <option value="tingling">&#9679; Tingling</option>
              <option value="weak">&#9679; Weakness</option>
              <option value="swelling">&#9679; Swelling</option>
              <option value="scar">&#9679; Scar</option>
            </select>
            <div style="font-size:11px;color:var(--text-muted);line-height:1.7">
              <span style="color:#e53935">&#9679;</span> Pain &nbsp;
              <span style="color:#1e88e5">&#9679;</span> Numbness &nbsp;
              <span style="color:#8e24aa">&#9679;</span> Tingling<br>
              <span style="color:#fb8c00">&#9679;</span> Weakness &nbsp;
              <span style="color:#00897b">&#9679;</span> Swelling &nbsp;
              <span style="color:#6d4c41">&#9679;</span> Scar
            </div>
          </div>
        </div>
        <div>
          <div class="list-header">
            <span>Marked Locations</span>
            <button class="btn-sm" onclick="HandChart.clearAll()">Clear all</button>
          </div>
          <div class="marker-list" id="hand-marker-list">
            <div class="empty-hint">No markers yet</div>
          </div>
        </div>
        <div class="field">
          <label>Chart Notes</label>
          <textarea id="chart-notes" placeholder="Distribution, area of numbness, scar location..." style="min-height:56px"></textarea>
        </div>
      </div>
    </div>
  </div>
</div>
```

---

## Task 6: hand.html — Sections 05–07 (History + Special Questions)

**Files:** Modify `templates/forms/hand.html`

- [ ] **Step 1: Append Sections 05, 06, 07**

```html
<!-- 05 CURRENT HISTORY -->
<div class="card" id="s-hx-current">
  <div class="card-header">
    <span class="sec-num">05</span>
    <h2>Current History</h2>
  </div>
  <div class="card-body">
    <div class="fg">
      <div class="field">
        <label>Current History <span class="req">*</span></label>
        <textarea id="hx-current" placeholder="Onset, mechanism of injury, course of symptoms, date of injury..." style="min-height:95px"></textarea>
      </div>
    </div>
  </div>
</div>

<!-- 06 PAST HISTORY -->
<div class="card" id="s-hx-past">
  <div class="card-header">
    <span class="sec-num">06</span>
    <h2>Past History</h2>
  </div>
  <div class="card-body">
    <div class="fg">
      <div class="field">
        <label>Past History</label>
        <textarea id="hx-past" placeholder="Previous episodes, relevant medical history, past surgeries, comorbidities..." style="min-height:95px"></textarea>
      </div>
    </div>
  </div>
</div>

<!-- 07 SPECIAL QUESTIONS -->
<div class="card" id="s-sq">
  <div class="card-header">
    <span class="sec-num">07</span>
    <h2>Special Questions</h2>
  </div>
  <div class="card-body">
    <div class="fg c2">
      <div class="field">
        <label>General Health</label>
        <select id="sq-general-health" onchange="HandForm.onHealthChange()">
          <option value="">— Select —</option>
          <option>Good</option>
          <option>Fair</option>
          <option>Poor</option>
          <option>Other</option>
        </select>
      </div>
      <div class="field" id="sq-health-notes-row" style="display:none">
        <label>Health Notes</label>
        <input type="text" id="sq-health-notes" placeholder="Specify...">
      </div>
      <div class="field" style="grid-column:span 2">
        <label>PMHx / Previous Surgery</label>
        <textarea id="sq-pmhx" placeholder="Diabetes, hypertension, RA, previous fractures, surgeries..." style="min-height:52px"></textarea>
      </div>
      <div class="field">
        <label>Investigations</label>
        <input type="text" id="sq-invest" placeholder="X-ray, MRI, nerve conduction, EMG...">
      </div>
      <div class="field">
        <label>Medications / Steroids</label>
        <input type="text" id="sq-medications" placeholder="Current medications...">
      </div>
      <div class="field">
        <label>Allergies</label>
        <input type="text" id="sq-allergies" placeholder="Drug allergies, latex...">
      </div>
      <div class="field">
        <label>Home / Social Situation</label>
        <input type="text" id="sq-social" placeholder="Living situation, support, ADL independence...">
      </div>
      <div class="field">
        <label>Occupation</label>
        <input type="text" id="sq-occupation" placeholder="Job title, physical demands...">
      </div>
      <div class="field">
        <label>Recreation / Hobbies</label>
        <input type="text" id="sq-rec" placeholder="Sports, instruments, hobbies...">
      </div>
      <div class="field">
        <label>Splinting</label>
        <div class="radio-group">
          <label><input type="radio" name="sq-splinting" value="Yes"> Yes</label>
          <label><input type="radio" name="sq-splinting" value="No"> No</label>
          <label><input type="radio" name="sq-splinting" value="N/A"> N/A</label>
        </div>
      </div>
    </div>
  </div>
</div>
```

---

## Task 7: hand.html — Sections 08–09 (Observation + Palpation)

**Files:** Modify `templates/forms/hand.html`

- [ ] **Step 1: Append Sections 08 and 09**

```html
<!-- 08 OBSERVATION -->
<div class="card" id="s-obs">
  <div class="card-header">
    <span class="sec-num">08</span>
    <h2>Observation</h2>
  </div>
  <div class="card-body">
    <div class="fg c2">
      <div class="field">
        <label>General <span class="req">*</span></label>
        <textarea id="observation-notes" placeholder="Posture, use of dominant hand, guarding, affect, use of aids..." style="min-height:95px"></textarea>
      </div>
      <div class="field">
        <label>Local</label>
        <textarea id="wound-notes" placeholder="Skin condition, swelling, erythema, wasting, deformity, scar, wound..." style="min-height:95px"></textarea>
      </div>
    </div>
  </div>
</div>

<!-- 09 PALPATION -->
<div class="card" id="s-palp">
  <div class="card-header">
    <span class="sec-num">09</span>
    <h2>Palpation</h2>
  </div>
  <div class="card-body">
    <div class="fg c2">
      <div class="field">
        <label>Tenderness</label>
        <textarea id="tenderness" placeholder="Location, grade (0–3), tissue..."></textarea>
      </div>
      <div class="field">
        <label>Temperature / Skin</label>
        <input type="text" id="temperature" placeholder="Normal / Warm / Cool, skin texture...">
      </div>
      <div class="field">
        <label>Muscle / Soft Tissue</label>
        <textarea id="texture" placeholder="Spasm, tightness, trigger points, cord..."></textarea>
      </div>
      <div class="field">
        <label>Joint / Bony</label>
        <textarea id="palpation-notes" placeholder="Joint line tenderness, bony landmarks, crepitus..."></textarea>
      </div>
    </div>
  </div>
</div>
```

⚠️ Note: `id="texture"` maps to `gv('texture')` in form_hand.js collect(). The label says "Muscle / Soft Tissue" but the ID stays `texture` for backward compat.

---

## Task 8: hand.html — Sections 10–12 (ROM, Strength, Circumference)

**Files:** Modify `templates/forms/hand.html`

- [ ] **Step 1: Append Section 10 ROM**

```html
<!-- 10 RANGE OF MOTION -->
<div class="card" id="s-rom">
  <div class="card-header">
    <span class="sec-num">10</span>
    <h2>Range of Motion</h2>
  </div>
  <div class="card-body">
    <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:8px;">Assessed joints only — add rows as needed</div>
    <div class="mov-table-wrap" style="overflow-x:auto">
      <table class="mov-table" style="width:100%;border-collapse:collapse;font-size:.88rem;">
        <thead>
          <tr>
            <th style="min-width:140px;text-align:left;padding:6px 8px;">Category</th>
            <th style="min-width:160px;">Movement</th>
            <th style="min-width:72px;">Active L</th>
            <th style="min-width:72px;">Active R</th>
            <th style="min-width:72px;">Passive L</th>
            <th style="min-width:72px;">Passive R</th>
            <th style="min-width:72px;">OP L</th>
            <th style="min-width:72px;">OP R</th>
            <th style="width:32px;"></th>
          </tr>
        </thead>
        <tbody id="rom-tbody"></tbody>
      </table>
    </div>
    <button class="mov-add-btn" id="hand-rom-add-row">+ Add Row</button>
  </div>
</div>
```

- [ ] **Step 2: Append Section 11 Strength**

```html
<!-- 11 STRENGTH -->
<div class="card" id="s-strength">
  <div class="card-header">
    <span class="sec-num">11</span>
    <h2>Strength</h2>
  </div>
  <div class="card-body">
    <div class="fg">
      <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:8px;">Grip &amp; Pinch Strength (kg)</div>
      <div class="fg c2">
        <div class="field">
          <label>Grip — Left (kg)</label>
          <input type="number" id="grip-l" min="0" step="0.1" placeholder="0.0">
        </div>
        <div class="field">
          <label>Grip — Right (kg)</label>
          <input type="number" id="grip-r" min="0" step="0.1" placeholder="0.0">
        </div>
        <div class="field">
          <label>Pinch Lateral — Left (kg)</label>
          <input type="number" id="pinch-l" min="0" step="0.1" placeholder="0.0">
        </div>
        <div class="field">
          <label>Pinch Lateral — Right (kg)</label>
          <input type="number" id="pinch-r" min="0" step="0.1" placeholder="0.0">
        </div>
        <div class="field">
          <label>Pinch Pulp — Left (kg)</label>
          <input type="number" id="pinch-pulp-l" min="0" step="0.1" placeholder="0.0">
        </div>
        <div class="field">
          <label>Pinch Pulp — Right (kg)</label>
          <input type="number" id="pinch-pulp-r" min="0" step="0.1" placeholder="0.0">
        </div>
        <div class="field">
          <label>Pinch 3-Point — Left (kg)</label>
          <input type="number" id="pinch-3pt-l" min="0" step="0.1" placeholder="0.0">
        </div>
        <div class="field">
          <label>Pinch 3-Point — Right (kg)</label>
          <input type="number" id="pinch-3pt-r" min="0" step="0.1" placeholder="0.0">
        </div>
        <div class="field" style="grid-column:span 2">
          <label>Pulp-to-Pulp Opposition</label>
          <textarea id="pulp-opposition" placeholder="e.g. Thumb–Index: intact bilaterally, Thumb–Little: limited R..." style="min-height:52px"></textarea>
        </div>
      </div>
      <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:8px;">Finger-to-Proximal Palmar Crease (cm, 0 = touching)</div>
      <div class="fg c2">
        <div class="field">
          <label>2nd Finger (cm)</label>
          <input type="number" id="fpc-2nd" min="0" step="0.1" placeholder="0.0">
        </div>
        <div class="field">
          <label>3rd Finger (cm)</label>
          <input type="number" id="fpc-3rd" min="0" step="0.1" placeholder="0.0">
        </div>
        <div class="field">
          <label>4th Finger (cm)</label>
          <input type="number" id="fpc-4th" min="0" step="0.1" placeholder="0.0">
        </div>
        <div class="field">
          <label>5th Finger (cm)</label>
          <input type="number" id="fpc-5th" min="0" step="0.1" placeholder="0.0">
        </div>
      </div>
    </div>
  </div>
</div>
```

- [ ] **Step 3: Append Section 12 Circumference**

```html
<!-- 12 CIRCUMFERENCE -->
<div class="card" id="s-circ">
  <div class="card-header">
    <span class="sec-num">12</span>
    <h2>Circumference</h2>
  </div>
  <div class="card-body">
    <div style="overflow-x:auto">
      <table class="mov-table" style="width:100%;border-collapse:collapse;font-size:.88rem;">
        <thead>
          <tr>
            <th style="min-width:180px;text-align:left;padding:6px 8px;">Location</th>
            <th style="min-width:100px;">Left (cm)</th>
            <th style="min-width:100px;">Right (cm)</th>
            <th style="width:32px;"></th>
          </tr>
        </thead>
        <tbody id="circ-tbody"></tbody>
      </table>
    </div>
    <button class="mov-add-btn" id="hand-circ-add-row">+ Add Row</button>
  </div>
</div>
```

---

## Task 9: hand.html — Sections 13–15 (Sensation, Neurological, Special Tests)

**Files:** Modify `templates/forms/hand.html`

- [ ] **Step 1: Append Section 13 Sensation**

```html
<!-- 13 SENSATION TEST -->
<div class="card" id="s-sensation">
  <div class="card-header">
    <span class="sec-num">13</span>
    <h2>Sensation Test</h2>
  </div>
  <div class="card-body">
    <div class="fg c2">
      <div class="field">
        <label>Light Touch — Left</label>
        <select id="light-touch-l">
          <option value="">—</option>
          <option>Intact</option><option>Reduced</option><option>Absent</option><option>Hypersensitive</option>
        </select>
      </div>
      <div class="field">
        <label>Light Touch — Right</label>
        <select id="light-touch-r">
          <option value="">—</option>
          <option>Intact</option><option>Reduced</option><option>Absent</option><option>Hypersensitive</option>
        </select>
      </div>
      <div class="field">
        <label>Pin Prick — Left</label>
        <select id="pin-prick-l">
          <option value="">—</option>
          <option>Intact</option><option>Reduced</option><option>Absent</option><option>Hypersensitive</option>
        </select>
      </div>
      <div class="field">
        <label>Pin Prick — Right</label>
        <select id="pin-prick-r">
          <option value="">—</option>
          <option>Intact</option><option>Reduced</option><option>Absent</option><option>Hypersensitive</option>
        </select>
      </div>
      <div class="field">
        <label>2-Point Discrimination — Left (mm)</label>
        <input type="number" id="two-point-l" min="0" step="0.5" placeholder="mm">
      </div>
      <div class="field">
        <label>2-Point Discrimination — Right (mm)</label>
        <input type="number" id="two-point-r" min="0" step="0.5" placeholder="mm">
      </div>
      <div class="field" style="grid-column:span 2">
        <label>Sensation Notes</label>
        <textarea id="sensation-notes" placeholder="Distribution, dermatomal pattern, hypersensitivity site..." style="min-height:56px"></textarea>
      </div>
    </div>
  </div>
</div>
```

- [ ] **Step 2: Append Section 14 Neurological**

```html
<!-- 14 NEUROLOGICAL TEST -->
<div class="card" id="s-neuro">
  <div class="card-header">
    <span class="sec-num">14</span>
    <h2>Neurological Test</h2>
  </div>
  <div class="card-body">
    <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:8px;">Reflexes (0 = absent, 1+ = diminished, 2+ = normal, 3+ = brisk, 4+ = clonus)</div>
    <div class="neuro-grid" style="margin-bottom:16px">
      <div class="nc hdr"></div>
      <div class="nc hdr">Left</div>
      <div class="nc hdr">Right</div>
      <div class="nc rl">C5 (Biceps)</div>
      <div class="nc">
        <select id="ref-c5-l" class="mov-cell-input">
          <option value="">—</option><option>0</option><option>1+</option><option>2+</option><option>3+</option><option>4+</option>
        </select>
      </div>
      <div class="nc">
        <select id="ref-c5-r" class="mov-cell-input">
          <option value="">—</option><option>0</option><option>1+</option><option>2+</option><option>3+</option><option>4+</option>
        </select>
      </div>
      <div class="nc rl">C6 (Brachioradialis)</div>
      <div class="nc">
        <select id="ref-c6-l" class="mov-cell-input">
          <option value="">—</option><option>0</option><option>1+</option><option>2+</option><option>3+</option><option>4+</option>
        </select>
      </div>
      <div class="nc">
        <select id="ref-c6-r" class="mov-cell-input">
          <option value="">—</option><option>0</option><option>1+</option><option>2+</option><option>3+</option><option>4+</option>
        </select>
      </div>
      <div class="nc rl">C7 (Triceps)</div>
      <div class="nc">
        <select id="ref-c7-l" class="mov-cell-input">
          <option value="">—</option><option>0</option><option>1+</option><option>2+</option><option>3+</option><option>4+</option>
        </select>
      </div>
      <div class="nc">
        <select id="ref-c7-r" class="mov-cell-input">
          <option value="">—</option><option>0</option><option>1+</option><option>2+</option><option>3+</option><option>4+</option>
        </select>
      </div>
      <div class="nc rl">C8/T1 (Finger flexors)</div>
      <div class="nc">
        <select id="ref-c8t1-l" class="mov-cell-input">
          <option value="">—</option><option>0</option><option>1+</option><option>2+</option><option>3+</option><option>4+</option>
        </select>
      </div>
      <div class="nc">
        <select id="ref-c8t1-r" class="mov-cell-input">
          <option value="">—</option><option>0</option><option>1+</option><option>2+</option><option>3+</option><option>4+</option>
        </select>
      </div>
    </div>

    <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:8px;">Manual Muscle Testing (0 / 1 / 2 / 2+ / 3 / 3+ / 4 / 4+ / 5)</div>
    <div class="neuro-grid">
      <div class="nc hdr"></div>
      <div class="nc hdr">Left</div>
      <div class="nc hdr">Right</div>
      {% for muscle, idkey in [
        ('Deltoid',             'mmt-deltoid'),
        ('Biceps',              'mmt-biceps'),
        ('Brachioradialis',     'mmt-brachiorad'),
        ('Wrist Extensors',     'mmt-wristext'),
        ('Wrist Flexors',       'mmt-wristflex'),
        ('Finger MP Extensors', 'mmt-fingermpext'),
        ('Triceps',             'mmt-triceps'),
        ('Finger Flexors',      'mmt-fingerflex'),
        ('Hand Intrinsics',     'mmt-intrinsics')
      ] %}
      <div class="nc rl">{{ muscle }}</div>
      <div class="nc">
        <select id="{{ idkey }}-l" class="mov-cell-input">
          <option value="">—</option><option>0</option><option>1</option><option>2</option><option>2+</option>
          <option>3</option><option>3+</option><option>4</option><option>4+</option><option>5</option>
        </select>
      </div>
      <div class="nc">
        <select id="{{ idkey }}-r" class="mov-cell-input">
          <option value="">—</option><option>0</option><option>1</option><option>2</option><option>2+</option>
          <option>3</option><option>3+</option><option>4</option><option>4+</option><option>5</option>
        </select>
      </div>
      {% endfor %}
    </div>
  </div>
</div>
```

- [ ] **Step 3: Append Section 15 Special Tests**

```html
<!-- 15 SPECIAL TESTS -->
<div class="card" id="s-special">
  <div class="card-header">
    <span class="sec-num">15</span>
    <h2>Special Tests</h2>
  </div>
  <div class="card-body">
    <div style="overflow-x:auto">
      <table class="mov-table" style="width:100%;border-collapse:collapse;font-size:.88rem;">
        <thead>
          <tr>
            <th style="min-width:180px;text-align:left;padding:6px 8px;">Test</th>
            <th style="min-width:130px;">Right</th>
            <th style="min-width:130px;">Left</th>
          </tr>
        </thead>
        <tbody>
          {% for test, idkey in [
            ("Tinel's Sign",        "tinels"),
            ("Phalen's Test",       "phalens"),
            ("Finkelstein's Test",  "finkelsteins"),
            ("Froment's Sign",      "fromens")
          ] %}
          <tr>
            <td style="padding:4px 8px;">{{ test }}</td>
            <td>
              <select id="{{ idkey }}-r" class="mov-cell-input" style="min-width:120px">
                <option value="">—</option><option>Negative</option><option>Positive</option><option>Not tested</option>
              </select>
            </td>
            <td>
              <select id="{{ idkey }}-l" class="mov-cell-input" style="min-width:120px">
                <option value="">—</option><option>Negative</option><option>Positive</option><option>Not tested</option>
              </select>
            </td>
          </tr>
          {% endfor %}
        </tbody>
        <tbody id="special-custom-tbody"></tbody>
      </table>
    </div>
    <button class="mov-add-btn" id="special-add-test">+ Add Test</button>
  </div>
</div>
```

---

## Task 10: hand.html — Sections 16–19 + extra_js block

**Files:** Modify `templates/forms/hand.html`

- [ ] **Step 1: Append Sections 16–19**

```html
<!-- 16 PT IMPRESSION -->
<div class="card" id="s-impression">
  <div class="card-header">
    <span class="sec-num">16</span>
    <h2>PT Impression</h2>
  </div>
  <div class="card-body">
    <div class="fg">
      <div class="field">
        <label>PT Impression</label>
        <textarea id="pt-impression" placeholder="Clinical reasoning summary, physiotherapy impression..."></textarea>
      </div>
    </div>
  </div>
</div>

<!-- 17 SHORT-TERM GOALS -->
<div class="card" id="s-stg">
  <div class="card-header">
    <span class="sec-num">17</span>
    <h2>Short-Term Goals</h2>
  </div>
  <div class="card-body">
    <div class="fg">
      <div class="field">
        <label>Short-Term Goals (STG)</label>
        <textarea id="stg" placeholder="Goals within 2–4 weeks..."></textarea>
      </div>
    </div>
  </div>
</div>

<!-- 18 LONG-TERM GOALS -->
<div class="card" id="s-ltg">
  <div class="card-header">
    <span class="sec-num">18</span>
    <h2>Long-Term Goals</h2>
  </div>
  <div class="card-body">
    <div class="fg">
      <div class="field">
        <label>Long-Term Goals (LTG)</label>
        <textarea id="ltg" placeholder="Functional rehabilitation goals..."></textarea>
      </div>
    </div>
  </div>
</div>

<!-- 19 PLAN OF TREATMENT -->
<div class="card" id="s-plan">
  <div class="card-header">
    <span class="sec-num">19</span>
    <h2>Plan of Treatment</h2>
  </div>
  <div class="card-body">
    <div class="fg">
      <div class="field">
        <label>Plan of Treatment</label>
        <textarea id="plan" placeholder="Modalities, exercises, splinting, HEP, frequency, precautions..."></textarea>
      </div>
    </div>
  </div>
</div>
```

- [ ] **Step 2: Replace `{% block extra_js %}` with**

```jinja
{% block extra_js %}
<script src="/static/js/hand_rom_table.js"></script>
<script src="/static/js/hand_circ_table.js"></script>
<script src="/static/js/form_hand.js"></script>
<script>
document.addEventListener('DOMContentLoaded', function () {
  HandRomTable.init('hand-rom-add-row', 'rom-tbody');
  HandCircTable.init('hand-circ-add-row', 'circ-tbody');
  HandForm.initSpecialTests();

  var FM = 'HAND';
  ClinicalTemplates.addButton('pt-impression', FM, 'impression');
  ClinicalTemplates.addButton('stg',           FM, 'stg');
  ClinicalTemplates.addButton('ltg',           FM, 'ltg');
  ClinicalTemplates.addButton('plan',          FM, 'treatment');
  ClinicalTemplates.addButton('observation-notes', FM, 'observation');
  ClinicalTemplates.addButton('palpation-notes',   FM, 'palpation');
});
</script>
{% endblock %}
```

- [ ] **Step 3: Verify section count**

```bash
grep -c 'class="sec-num"' templates/forms/hand.html
```

Expected: `19`

- [ ] **Step 4: Verify sidebar nav count**

```bash
grep -c 'class="nav-item"' templates/forms/hand.html
```

Expected: `19`

- [ ] **Step 5: Verify no old class names remain**

```bash
grep -c 'section-card\|section-title\|form-row\|block title' templates/forms/hand.html
```

Expected: `0`

---

## Task 11: Create `static/js/hand_rom_table.js`

**Files:**
- Create: `static/js/hand_rom_table.js`

- [ ] **Step 1: Write the complete IIFE**

```javascript
// hand_rom_table.js — dynamic ROM table for Hand Assessment form
// Follows movement_table.js IIFE pattern.

const HandRomTable = (function () {
  'use strict';

  var ROM_MOVEMENTS = {
    'Wrist':     ['Flexion', 'Extension', 'Radial Deviation', 'Ulnar Deviation', 'Supination', 'Pronation'],
    'Thumb':     ['CMC Flexion', 'CMC Extension', 'CMC Abduction', 'CMC Adduction',
                  'MCP Flexion', 'MCP Extension', 'IP Flexion', 'IP Extension',
                  'Opposition to Index', 'Opposition to Middle', 'Opposition to Ring', 'Opposition to Little'],
    'Index':     ['MCP Flexion', 'MCP Extension', 'PIP Flexion', 'PIP Extension', 'DIP Flexion', 'DIP Extension'],
    'Middle':    ['MCP Flexion', 'MCP Extension', 'PIP Flexion', 'PIP Extension', 'DIP Flexion', 'DIP Extension'],
    'Ring':      ['MCP Flexion', 'MCP Extension', 'PIP Flexion', 'PIP Extension', 'DIP Flexion', 'DIP Extension'],
    'Little':    ['MCP Flexion', 'MCP Extension', 'PIP Flexion', 'PIP Extension', 'DIP Flexion', 'DIP Extension'],
    'Composite': ['Finger Abduction', 'Finger Adduction', 'TAM (Total Active Motion)', 'TPM (Total Passive Motion)']
  };

  var CATEGORIES = Object.keys(ROM_MOVEMENTS);

  var _rows = [];
  var _rowCounter = 0;
  var _tbodyId = 'rom-tbody';

  function init(addBtnId, tbodyId) {
    _tbodyId = tbodyId || 'rom-tbody';
    _render();
    document.addEventListener('click', function (e) {
      if (e.target && e.target.id === (addBtnId || 'hand-rom-add-row')) {
        e.preventDefault();
        addRow();
      }
    });
  }

  function addRow(prefill) {
    var id = _rowCounter++;
    _rows.push({
      id:        id,
      category:  (prefill && prefill.category)  || '',
      movement:  (prefill && prefill.movement)   || '',
      active_l:  (prefill && prefill.active_l)   || '',
      active_r:  (prefill && prefill.active_r)   || '',
      passive_l: (prefill && prefill.passive_l)  || '',
      passive_r: (prefill && prefill.passive_r)  || '',
      op_l:      (prefill && prefill.op_l)       || '',
      op_r:      (prefill && prefill.op_r)       || ''
    });
    _render();
  }

  function deleteRow(id) {
    _rows = _rows.filter(function (r) { return r.id !== id; });
    _render();
  }

  function _render() {
    var tbody = document.getElementById(_tbodyId);
    if (!tbody) return;

    if (!_rows.length) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--text-faint);font-style:italic;padding:16px;font-size:12px;">No movements recorded — click + Add Row</td></tr>';
      return;
    }

    tbody.innerHTML = _rows.map(function (r) {
      var catOptions = '<option value="">— Category —</option>' +
        CATEGORIES.map(function (c) {
          return '<option value="' + c + '"' + (r.category === c ? ' selected' : '') + '>' + c + '</option>';
        }).join('');

      var movements = r.category ? (ROM_MOVEMENTS[r.category] || []) : [];
      var movOptions = '<option value="">— Movement —</option>' +
        movements.map(function (m) {
          return '<option value="' + m + '"' + (r.movement === m ? ' selected' : '') + '>' + m + '</option>';
        }).join('');

      function numInput(field, val) {
        return '<input type="number" class="mov-cell-input" data-field="' + field + '" data-rid="' + r.id +
          '" value="' + (val || '') + '" min="0" max="360" placeholder="°" style="width:60px;text-align:center">';
      }

      return '<tr data-rid="' + r.id + '">' +
        '<td><select class="mov-cell-input" data-field="category" data-rid="' + r.id + '">' + catOptions + '</select></td>' +
        '<td><select class="mov-cell-input" data-field="movement" data-rid="' + r.id + '">' + movOptions + '</select></td>' +
        '<td>' + numInput('active_l',  r.active_l)  + '</td>' +
        '<td>' + numInput('active_r',  r.active_r)  + '</td>' +
        '<td>' + numInput('passive_l', r.passive_l) + '</td>' +
        '<td>' + numInput('passive_r', r.passive_r) + '</td>' +
        '<td>' + numInput('op_l',      r.op_l)      + '</td>' +
        '<td>' + numInput('op_r',      r.op_r)      + '</td>' +
        '<td><button class="mov-del-btn" onclick="HandRomTable.deleteRow(' + r.id + ')">&#x2715;</button></td>' +
        '</tr>';
    }).join('');

    // Wire category → movement cascade
    tbody.querySelectorAll('[data-field="category"]').forEach(function (sel) {
      sel.addEventListener('change', function () {
        var rid = parseInt(sel.dataset.rid);
        var row = _rows.find(function (r) { return r.id === rid; });
        if (row) { row.category = sel.value; row.movement = ''; }
        _render();
      });
    });

    // Wire all other inputs to sync
    tbody.querySelectorAll('[data-field]:not([data-field="category"])').forEach(function (el) {
      el.addEventListener('change', function () { _syncFromDOM(); });
      el.addEventListener('input',  function () { _syncFromDOM(); });
    });
  }

  function _syncFromDOM() {
    var tbody = document.getElementById(_tbodyId);
    if (!tbody) return;
    tbody.querySelectorAll('[data-rid][data-field]').forEach(function (el) {
      var rid   = parseInt(el.dataset.rid);
      var field = el.dataset.field;
      var row   = _rows.find(function (r) { return r.id === rid; });
      if (row && field && field !== 'category') row[field] = el.value;
    });
  }

  function collect() {
    _syncFromDOM();
    return _rows
      .filter(function (r) { return r.category !== ''; })
      .map(function (r) {
        return {
          category:  r.category,
          movement:  r.movement,
          active_l:  r.active_l,
          active_r:  r.active_r,
          passive_l: r.passive_l,
          passive_r: r.passive_r,
          op_l:      r.op_l,
          op_r:      r.op_r
        };
      });
  }

  function populate(arr) {
    _rows = [];
    _rowCounter = 0;
    if (!Array.isArray(arr) || !arr.length) { _render(); return; }
    arr.forEach(function (r) { addRow(r); });
  }

  function reset() {
    _rows = [];
    _rowCounter = 0;
    _render();
  }

  return {
    init:      init,
    addRow:    addRow,
    deleteRow: deleteRow,
    collect:   collect,
    populate:  populate,
    reset:     reset
  };

}());
```

- [ ] **Step 2: Syntax check (if node available)**

```bash
node --check static/js/hand_rom_table.js
```

Expected: no output (clean). If node not installed, skip.

---

## Task 12: Create `static/js/hand_circ_table.js`

**Files:**
- Create: `static/js/hand_circ_table.js`

- [ ] **Step 1: Write the complete IIFE**

```javascript
// hand_circ_table.js — dynamic circumference table for Hand Assessment form

const HandCircTable = (function () {
  'use strict';

  var LOCATIONS = [
    'Index PIP', 'Index DIP', 'Middle PIP', 'Middle DIP',
    'Ring PIP',  'Ring DIP',  'Little PIP', 'Little DIP',
    'Thumb', 'Palmar Crease', 'Wrist'
  ];

  var _rows = [];
  var _rowCounter = 0;
  var _tbodyId = 'circ-tbody';

  function init(addBtnId, tbodyId) {
    _tbodyId = tbodyId || 'circ-tbody';
    _render();
    document.addEventListener('click', function (e) {
      if (e.target && e.target.id === (addBtnId || 'hand-circ-add-row')) {
        e.preventDefault();
        addRow();
      }
    });
  }

  function addRow(prefill) {
    var id = _rowCounter++;
    _rows.push({
      id:       id,
      location: (prefill && prefill.location) || '',
      left_cm:  (prefill && prefill.left_cm)  || '',
      right_cm: (prefill && prefill.right_cm) || ''
    });
    _render();
  }

  function deleteRow(id) {
    _rows = _rows.filter(function (r) { return r.id !== id; });
    _render();
  }

  function _render() {
    var tbody = document.getElementById(_tbodyId);
    if (!tbody) return;

    if (!_rows.length) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-faint);font-style:italic;padding:16px;font-size:12px;">No measurements — click + Add Row</td></tr>';
      return;
    }

    tbody.innerHTML = _rows.map(function (r) {
      var locOptions = '<option value="">— Location —</option>' +
        LOCATIONS.map(function (l) {
          return '<option value="' + l + '"' + (r.location === l ? ' selected' : '') + '>' + l + '</option>';
        }).join('');

      function cmInput(field, val) {
        return '<input type="number" class="mov-cell-input" data-field="' + field + '" data-rid="' + r.id +
          '" value="' + (val || '') + '" min="0" step="0.1" placeholder="0.0" style="width:80px;text-align:center">';
      }

      return '<tr data-rid="' + r.id + '">' +
        '<td><select class="mov-cell-input" data-field="location" data-rid="' + r.id + '">' + locOptions + '</select></td>' +
        '<td>' + cmInput('left_cm',  r.left_cm)  + '</td>' +
        '<td>' + cmInput('right_cm', r.right_cm) + '</td>' +
        '<td><button class="mov-del-btn" onclick="HandCircTable.deleteRow(' + r.id + ')">&#x2715;</button></td>' +
        '</tr>';
    }).join('');

    tbody.querySelectorAll('[data-rid][data-field]').forEach(function (el) {
      el.addEventListener('change', function () { _syncFromDOM(); });
      el.addEventListener('input',  function () { _syncFromDOM(); });
    });
  }

  function _syncFromDOM() {
    var tbody = document.getElementById(_tbodyId);
    if (!tbody) return;
    tbody.querySelectorAll('[data-rid][data-field]').forEach(function (el) {
      var rid   = parseInt(el.dataset.rid);
      var field = el.dataset.field;
      var row   = _rows.find(function (r) { return r.id === rid; });
      if (row && field) row[field] = el.value;
    });
  }

  function collect() {
    _syncFromDOM();
    return _rows
      .filter(function (r) { return r.location !== ''; })
      .map(function (r) {
        return { location: r.location, left_cm: r.left_cm, right_cm: r.right_cm };
      });
  }

  function populate(arr) {
    _rows = [];
    _rowCounter = 0;
    if (!Array.isArray(arr) || !arr.length) { _render(); return; }
    arr.forEach(function (r) { addRow(r); });
  }

  function reset() {
    _rows = [];
    _rowCounter = 0;
    _render();
  }

  return {
    init:      init,
    addRow:    addRow,
    deleteRow: deleteRow,
    collect:   collect,
    populate:  populate,
    reset:     reset
  };

}());
```

- [ ] **Step 2: Syntax check**

```bash
node --check static/js/hand_circ_table.js
```

Expected: clean.

---

## Task 13: Update `static/js/form_hand.js`

**Files:**
- Modify: `static/js/form_hand.js`

Replace the entire file content. This is a full rewrite of collect/populate/reset plus adding new helpers. The IIFE wrapper structure, `window.ActiveForm`, and `window.Form` assignments stay identical.

- [ ] **Step 1: Replace the full file**

```javascript
var HandForm = (function () {
  'use strict';

  /* ── helpers ── */
  function gv(id) {
    var el = document.getElementById(id);
    if (!el) return '';
    return el.value || '';
  }
  function sv(id, val) {
    var el = document.getElementById(id);
    if (!el) return;
    el.value = val || '';
  }
  function gr(name) {
    var el = document.querySelector('input[name="' + name + '"]:checked');
    return el ? el.value : '';
  }
  function sr(name, val) {
    var els = document.querySelectorAll('input[name="' + name + '"]');
    els.forEach(function (el) { el.checked = (el.value === val); });
  }

  /* ── irritability chip ── */
  var _irr = '';
  function pickIrr(val) {
    _irr = (_irr === val) ? '' : val;
    ['High', 'Medium', 'Low'].forEach(function (v) {
      var btn = document.getElementById('irr-' + v);
      if (!btn) return;
      btn.classList.remove('sel-High', 'sel-Medium', 'sel-Low');
      if (_irr === v) btn.classList.add('sel-' + v);
    });
  }
  function _setIrr(val) {
    _irr = val || '';
    ['High', 'Medium', 'Low'].forEach(function (v) {
      var btn = document.getElementById('irr-' + v);
      if (!btn) return;
      btn.classList.remove('sel-High', 'sel-Medium', 'sel-Low');
      if (_irr === v) btn.classList.add('sel-' + v);
    });
  }

  /* ── VAS pain chip ── */
  function setPain(type, val) {
    var chip = document.getElementById('pv-' + type);
    if (!chip) return;
    var n = parseInt(val, 10);
    chip.textContent = n;
    chip.className = 'pain-val ' + (n <= 3 ? 'pv-low' : n <= 6 ? 'pv-mid' : 'pv-high');
  }

  /* ── custom special tests ── */
  function initSpecialTests() {
    var addBtn = document.getElementById('special-add-test');
    if (!addBtn) return;
    addBtn.addEventListener('click', function (e) {
      e.preventDefault();
      _addCustomTest();
    });
  }
  function _addCustomTest(prefill) {
    var tbody = document.getElementById('special-custom-tbody');
    if (!tbody) return;
    var tr = document.createElement('tr');
    var opts = ['', 'Negative', 'Positive', 'Not tested'].map(function (o) {
      return '<option value="' + o + '"' + ((prefill && prefill.r === o) ? ' selected' : '') + '>' + (o || '—') + '</option>';
    }).join('');
    var optsL = ['', 'Negative', 'Positive', 'Not tested'].map(function (o) {
      return '<option value="' + o + '"' + ((prefill && prefill.l === o) ? ' selected' : '') + '>' + (o || '—') + '</option>';
    }).join('');
    tr.innerHTML =
      '<td><input type="text" class="mov-cell-input" placeholder="Test name..." value="' + ((prefill && prefill.name) || '') + '" style="width:100%"></td>' +
      '<td><select class="mov-cell-input" style="min-width:120px">' + opts  + '</select></td>' +
      '<td><select class="mov-cell-input" style="min-width:120px">' + optsL + '</select></td>' +
      '<td><button class="mov-del-btn" onclick="this.closest(\'tr\').remove()">&#x2715;</button></td>';
    tbody.appendChild(tr);
  }
  function _collectCustomTests() {
    var rows = document.querySelectorAll('#special-custom-tbody tr');
    var result = [];
    rows.forEach(function (tr) {
      var els = tr.querySelectorAll('input, select');
      var name = els[0] ? els[0].value.trim() : '';
      var r    = els[1] ? els[1].value : '';
      var l    = els[2] ? els[2].value : '';
      if (name) result.push({ name: name, r: r, l: l });
    });
    return result;
  }
  function _populateCustomTests(arr) {
    var tbody = document.getElementById('special-custom-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (!Array.isArray(arr)) return;
    arr.forEach(function (t) { _addCustomTest(t); });
  }

  /* ── collect ── */
  function collect() {
    return {
      _form_type: 'HAND',
      meta:       { form: 'HAND' },
      patient:    FormBase.collectPatient(),

      /* Diagnosis */
      diagnosis:       gv('diagnosis'),
      referralSource:  gv('referral-source'),
      managementType:  gv('management-type'),
      surgeryDate:     gv('surgery-date'),
      surgeryType:     gv('surgery-type'),
      problem:         gv('pt-problem'),

      /* Hand Chart */
      handChart: {
        markers: HandChart.getData(),
        notes:   gv('chart-notes')
      },

      /* Pain */
      painPre:         gv('pain-pre'),
      painPost:        gv('pain-post'),
      painNature:      gv('pain-nature'),
      pain24hr:        gv('pain-24hr'),
      painAgg:         gv('pain-agg'),
      painEase:        gv('pain-ease'),
      irritability:    _irr,

      /* History */
      hxCurrent:       gv('hx-current'),
      hxPast:          gv('hx-past'),

      /* Special Questions */
      sqGeneralHealth: gv('sq-general-health'),
      sqHealthNotes:   gv('sq-health-notes'),
      sqPmhx:          gv('sq-pmhx'),
      sqInvest:        gv('sq-invest'),
      sqMedications:   gv('sq-medications'),
      sqAllergies:     gv('sq-allergies'),
      sqSocial:        gv('sq-social'),
      sqOccupation:    gv('sq-occupation'),
      sqRec:           gv('sq-rec'),
      sqSplinting:     gr('sq-splinting'),
      sqDominantHand:  gv('sq-dominant-hand'),

      /* Observation */
      observationNotes: gv('observation-notes'),
      woundNotes:       gv('wound-notes'),

      /* Palpation */
      tenderness:    gv('tenderness'),
      temperature:   gv('temperature'),
      texture:       gv('texture'),
      palpationNotes:gv('palpation-notes'),

      /* ROM — delegated to HandRomTable */
      rom: HandRomTable.collect(),

      /* Strength */
      gripStrengthR:   gv('grip-r'),
      gripStrengthL:   gv('grip-l'),
      pinchLateralR:   gv('pinch-r'),
      pinchLateralL:   gv('pinch-l'),
      pinchPulpR:      gv('pinch-pulp-r'),
      pinchPulpL:      gv('pinch-pulp-l'),
      pinch3ptR:       gv('pinch-3pt-r'),
      pinch3ptL:       gv('pinch-3pt-l'),
      pulpOpposition:  gv('pulp-opposition'),
      fpc2nd:          gv('fpc-2nd'),
      fpc3rd:          gv('fpc-3rd'),
      fpc4th:          gv('fpc-4th'),
      fpc5th:          gv('fpc-5th'),

      /* Circumference — delegated */
      circumference: HandCircTable.collect(),

      /* Sensation */
      lightTouchR:    gv('light-touch-r'),
      lightTouchL:    gv('light-touch-l'),
      pinPrickR:      gv('pin-prick-r'),
      pinPrickL:      gv('pin-prick-l'),
      twoPointDiscR:  gv('two-point-r'),
      twoPointDiscL:  gv('two-point-l'),
      sensationNotes: gv('sensation-notes'),

      /* Special Tests */
      otherTests: {
        tinels:       { r: gv('tinels-r'),       l: gv('tinels-l') },
        phalens:      { r: gv('phalens-r'),       l: gv('phalens-l') },
        finkelsteins: { r: gv('finkelsteins-r'),  l: gv('finkelsteins-l') },
        fromens:      { r: gv('fromens-r'),        l: gv('fromens-l') }
      },
      customSpecialTests: _collectCustomTests(),

      /* Neurological */
      neuro: {
        reflexes: {
          c5:   { l: gv('ref-c5-l'),    r: gv('ref-c5-r') },
          c6:   { l: gv('ref-c6-l'),    r: gv('ref-c6-r') },
          c7:   { l: gv('ref-c7-l'),    r: gv('ref-c7-r') },
          c8t1: { l: gv('ref-c8t1-l'), r: gv('ref-c8t1-r') }
        },
        muscles: {
          deltoid:       { l: gv('mmt-deltoid-l'),      r: gv('mmt-deltoid-r') },
          biceps:        { l: gv('mmt-biceps-l'),        r: gv('mmt-biceps-r') },
          brachiorad:    { l: gv('mmt-brachiorad-l'),    r: gv('mmt-brachiorad-r') },
          wristExt:      { l: gv('mmt-wristext-l'),      r: gv('mmt-wristext-r') },
          wristFlex:     { l: gv('mmt-wristflex-l'),     r: gv('mmt-wristflex-r') },
          fingerMpExt:   { l: gv('mmt-fingermpext-l'),   r: gv('mmt-fingermpext-r') },
          triceps:       { l: gv('mmt-triceps-l'),        r: gv('mmt-triceps-r') },
          fingerFlex:    { l: gv('mmt-fingerflex-l'),     r: gv('mmt-fingerflex-r') },
          handIntrinsics:{ l: gv('mmt-intrinsics-l'),    r: gv('mmt-intrinsics-r') }
        }
      },

      /* Goals + Plan */
      ptImpression: gv('pt-impression'),
      stg:          gv('stg'),
      ltg:          gv('ltg'),
      plan:         gv('plan')
    };
  }

  /* ── populate ── */
  function populate(d) {
    FormBase.populatePatient(d.patient);

    sv('diagnosis',      d.diagnosis);
    sv('referral-source',d.referralSource);
    sv('management-type',d.managementType);
    sv('surgery-date',   d.surgeryDate);
    sv('surgery-type',   d.surgeryType);
    sv('pt-problem',     d.problem);
    onManagementChange();

    if (d.handChart) {
      HandChart.loadData(d.handChart.markers || []);
      sv('chart-notes', d.handChart.notes);
    }

    sv('pain-pre',  d.painPre);
    sv('pain-post', d.painPost);
    if (d.painPre  !== undefined) setPain('pre',  d.painPre  || 0);
    if (d.painPost !== undefined) setPain('post', d.painPost || 0);
    sv('pain-nature', d.painNature);
    sv('pain-24hr',   d.pain24hr);
    sv('pain-agg',    d.painAgg);
    sv('pain-ease',   d.painEase);
    _setIrr(d.irritability);

    sv('hx-current', d.hxCurrent);
    sv('hx-past',    d.hxPast);

    sv('sq-general-health', d.sqGeneralHealth);
    sv('sq-health-notes',   d.sqHealthNotes);
    onHealthChange();
    sv('sq-pmhx',       d.sqPmhx);
    sv('sq-invest',     d.sqInvest);
    sv('sq-medications',d.sqMedications);
    sv('sq-allergies',  d.sqAllergies);
    sv('sq-social',     d.sqSocial);
    sv('sq-occupation', d.sqOccupation);
    sv('sq-rec',        d.sqRec);
    sr('sq-splinting',  d.sqSplinting);
    sv('sq-dominant-hand', d.sqDominantHand);

    sv('observation-notes', d.observationNotes);
    sv('wound-notes',       d.woundNotes);

    sv('tenderness',     d.tenderness);
    sv('temperature',    d.temperature);
    sv('texture',        d.texture);
    sv('palpation-notes',d.palpationNotes);

    HandRomTable.populate(d.rom || []);

    sv('grip-r',       d.gripStrengthR);
    sv('grip-l',       d.gripStrengthL);
    sv('pinch-r',      d.pinchLateralR);
    sv('pinch-l',      d.pinchLateralL);
    sv('pinch-pulp-r', d.pinchPulpR);
    sv('pinch-pulp-l', d.pinchPulpL);
    sv('pinch-3pt-r',  d.pinch3ptR);
    sv('pinch-3pt-l',  d.pinch3ptL);
    sv('pulp-opposition', d.pulpOpposition);
    sv('fpc-2nd', d.fpc2nd);
    sv('fpc-3rd', d.fpc3rd);
    sv('fpc-4th', d.fpc4th);
    sv('fpc-5th', d.fpc5th);

    HandCircTable.populate(d.circumference || []);

    sv('light-touch-r', d.lightTouchR);
    sv('light-touch-l', d.lightTouchL);
    sv('pin-prick-r',   d.pinPrickR);
    sv('pin-prick-l',   d.pinPrickL);
    sv('two-point-r',   d.twoPointDiscR);
    sv('two-point-l',   d.twoPointDiscL);
    sv('sensation-notes', d.sensationNotes);

    var ot = d.otherTests || {};
    sv('tinels-r',       (ot.tinels       || {}).r);
    sv('tinels-l',       (ot.tinels       || {}).l);
    sv('phalens-r',      (ot.phalens      || {}).r);
    sv('phalens-l',      (ot.phalens      || {}).l);
    sv('finkelsteins-r', (ot.finkelsteins || {}).r);
    sv('finkelsteins-l', (ot.finkelsteins || {}).l);
    sv('fromens-r',      (ot.fromens      || {}).r);
    sv('fromens-l',      (ot.fromens      || {}).l);
    _populateCustomTests(d.customSpecialTests);

    var nr = d.neuro || {};
    var rf = nr.reflexes || {};
    var mm = nr.muscles  || {};
    sv('ref-c5-l',   (rf.c5   || {}).l); sv('ref-c5-r',   (rf.c5   || {}).r);
    sv('ref-c6-l',   (rf.c6   || {}).l); sv('ref-c6-r',   (rf.c6   || {}).r);
    sv('ref-c7-l',   (rf.c7   || {}).l); sv('ref-c7-r',   (rf.c7   || {}).r);
    sv('ref-c8t1-l', (rf.c8t1 || {}).l); sv('ref-c8t1-r', (rf.c8t1 || {}).r);
    sv('mmt-deltoid-l',     (mm.deltoid       || {}).l); sv('mmt-deltoid-r',     (mm.deltoid       || {}).r);
    sv('mmt-biceps-l',      (mm.biceps        || {}).l); sv('mmt-biceps-r',      (mm.biceps        || {}).r);
    sv('mmt-brachiorad-l',  (mm.brachiorad    || {}).l); sv('mmt-brachiorad-r',  (mm.brachiorad    || {}).r);
    sv('mmt-wristext-l',    (mm.wristExt      || {}).l); sv('mmt-wristext-r',    (mm.wristExt      || {}).r);
    sv('mmt-wristflex-l',   (mm.wristFlex     || {}).l); sv('mmt-wristflex-r',   (mm.wristFlex     || {}).r);
    sv('mmt-fingermpext-l', (mm.fingerMpExt   || {}).l); sv('mmt-fingermpext-r', (mm.fingerMpExt   || {}).r);
    sv('mmt-triceps-l',     (mm.triceps       || {}).l); sv('mmt-triceps-r',     (mm.triceps       || {}).r);
    sv('mmt-fingerflex-l',  (mm.fingerFlex    || {}).l); sv('mmt-fingerflex-r',  (mm.fingerFlex    || {}).r);
    sv('mmt-intrinsics-l',  (mm.handIntrinsics|| {}).l); sv('mmt-intrinsics-r',  (mm.handIntrinsics|| {}).r);

    sv('pt-impression', d.ptImpression);
    sv('stg',           d.stg);
    sv('ltg',           d.ltg);
    sv('plan',          d.plan);
  }

  /* ── reset ── */
  function reset() {
    FormBase.resetPatient();
    [
      'diagnosis','referral-source','management-type','surgery-date','surgery-type','pt-problem',
      'chart-notes',
      'pain-agg','pain-ease','pain-nature','pain-24hr',
      'hx-current','hx-past',
      'sq-general-health','sq-health-notes','sq-pmhx','sq-invest',
      'sq-medications','sq-allergies','sq-social','sq-occupation','sq-rec','sq-dominant-hand',
      'observation-notes','wound-notes',
      'tenderness','temperature','texture','palpation-notes',
      'grip-r','grip-l','pinch-r','pinch-l',
      'pinch-pulp-r','pinch-pulp-l','pinch-3pt-r','pinch-3pt-l',
      'pulp-opposition','fpc-2nd','fpc-3rd','fpc-4th','fpc-5th',
      'sensation-notes','light-touch-r','light-touch-l','pin-prick-r','pin-prick-l',
      'two-point-r','two-point-l',
      'tinels-r','tinels-l','phalens-r','phalens-l',
      'finkelsteins-r','finkelsteins-l','fromens-r','fromens-l',
      'ref-c5-l','ref-c5-r','ref-c6-l','ref-c6-r','ref-c7-l','ref-c7-r','ref-c8t1-l','ref-c8t1-r',
      'mmt-deltoid-l','mmt-deltoid-r','mmt-biceps-l','mmt-biceps-r',
      'mmt-brachiorad-l','mmt-brachiorad-r',
      'mmt-wristext-l','mmt-wristext-r','mmt-wristflex-l','mmt-wristflex-r',
      'mmt-fingermpext-l','mmt-fingermpext-r','mmt-triceps-l','mmt-triceps-r',
      'mmt-fingerflex-l','mmt-fingerflex-r','mmt-intrinsics-l','mmt-intrinsics-r',
      'pt-impression','stg','ltg','plan'
    ].forEach(function (id) { sv(id, ''); });

    document.querySelectorAll('input[name="sq-splinting"]').forEach(function (r) { r.checked = false; });

    _setIrr('');
    var pre = document.getElementById('pain-pre');
    var post = document.getElementById('pain-post');
    if (pre)  { pre.value  = 0; setPain('pre',  0); }
    if (post) { post.value = 0; setPain('post', 0); }

    HandChart.clearAll();
    HandRomTable.reset();
    HandCircTable.reset();

    var customTbody = document.getElementById('special-custom-tbody');
    if (customTbody) customTbody.innerHTML = '';

    onManagementChange();
    onHealthChange();
  }

  /* ── reveal helpers ── */
  function onManagementChange() {
    var row = document.getElementById('surgery-date-row');
    if (!row) return;
    var isSurgical = (gv('management-type') === 'Surgical');
    row.style.display = isSurgical ? 'flex' : 'none';
  }
  function onHealthChange() {
    var row = document.getElementById('sq-health-notes-row');
    if (!row) return;
    row.style.display = (gv('sq-general-health') === 'Other') ? '' : 'none';
  }

  /* ── public ── */
  return {
    collect:            collect,
    populate:           populate,
    reset:              reset,
    setPain:            setPain,
    pickIrr:            pickIrr,
    initSpecialTests:   initSpecialTests,
    onManagementChange: onManagementChange,
    onHealthChange:     onHealthChange
  };
}());

window.ActiveForm = HandForm;
window.Form = {
  collect:        HandForm.collect,
  populate:       HandForm.populate,
  reset:          HandForm.reset,
  setPain:        HandForm.setPain,
  pickIrr:        HandForm.pickIrr,
  onPtTypeChange: FormBase.onPtTypeChange,
  onNricInput:    FormBase.onNricInput,
  onDobChange:    FormBase.onDobChange
};
```

- [ ] **Step 2: Syntax check**

```bash
node --check static/js/form_hand.js
```

Expected: clean.

---

## Task 14: Update `pdf_hand.py` — dynamic ROM, circumference, new strength fields

**Files:**
- Modify: `pdf_hand.py` — `_build_story()` only. Do not change `generate_hand_pdf()` or `generate_episode_pdf()` or the `HandChartFlowable` class.

- [ ] **Step 1: Update ROM block in `_build_story`**

Find this block (around line 222):
```python
    # ── ROM Table (full width, only if data present) ──────────────────────────
    if rom_table:
        rom_headers = ['Movement', 'Active L', 'Active R', 'Passive L', 'Passive R', 'OP L', 'OP R']
        rom_col_w   = [65 * mm, 20 * mm, 20 * mm, 20 * mm, 20 * mm, 17 * mm, 17 * mm]
        rom_rows    = [
            [r.get('movement', ''), r.get('activeL', ''), r.get('activeR', ''),
             r.get('passiveL', ''), r.get('passiveR', ''), r.get('opL', ''), r.get('opR', '')]
            for r in rom_table
        ]
        story.append(Paragraph('Range of Motion', S_BOLD))
        story.append(Spacer(1, 2 * mm))
        story.append(data_table(rom_headers, rom_rows, rom_col_w))
        story.append(gap(2))
```

Replace with:
```python
    # ── ROM Table (full width, only if data present) ──────────────────────────
    # rom is now a flat array: [{category, movement, active_l, active_r, passive_l, passive_r, op_l, op_r}]
    # Also support legacy shape {table: [...]} from old records
    if isinstance(data.get('rom'), dict):
        rom_table = data['rom'].get('table', [])
    else:
        rom_table = data.get('rom', []) if isinstance(data.get('rom'), list) else []

    if rom_table:
        rom_headers = ['Category', 'Movement', 'Active L', 'Active R', 'Passive L', 'Passive R', 'OP L', 'OP R']
        rom_col_w   = [28 * mm, 42 * mm, 17 * mm, 17 * mm, 17 * mm, 17 * mm, 14 * mm, 14 * mm]
        rom_rows    = [
            [r.get('category', ''), r.get('movement', ''),
             r.get('active_l', ''), r.get('active_r', ''),
             r.get('passive_l', ''), r.get('passive_r', ''),
             r.get('op_l', ''), r.get('op_r', '')]
            for r in rom_table
        ]
        story.append(Paragraph('Range of Motion (Assessed joints only)', S_BOLD))
        story.append(Spacer(1, 2 * mm))
        story.append(data_table(rom_headers, rom_rows, rom_col_w))
        story.append(gap(2))
```

- [ ] **Step 2: Update data extraction at top of `_build_story`**

Find:
```python
    rom_data   = ensure_dict(data.get('rom', {}))
    rom_table  = rom_data.get('table', [])
    circ_data  = ensure_dict(data.get('circumference', {}))
    circ_table = circ_data.get('table', [])
```

Replace with:
```python
    # rom and circumference are now flat arrays (not wrapped in {table: [...]})
    # Legacy support: if old shape {table:[...]}, unwrap it
    _rom_raw = data.get('rom', [])
    rom_table = _rom_raw.get('table', []) if isinstance(_rom_raw, dict) else (_rom_raw if isinstance(_rom_raw, list) else [])

    _circ_raw = data.get('circumference', [])
    circ_table = _circ_raw.get('table', []) if isinstance(_circ_raw, dict) else (_circ_raw if isinstance(_circ_raw, list) else [])
```

- [ ] **Step 3: Update circumference rendering in Block 4**

Find:
```python
    circ_lines = [
        '{}: {} cm'.format(r.get('label', ''), r.get('value', ''))
        for r in circ_table
    ] if circ_table else []
```

Replace with:
```python
    # New shape: {location, left_cm, right_cm}. Legacy shape: {label, value}.
    def _circ_line(r):
        if r.get('location'):
            return '{}: L {}cm  R {}cm'.format(r.get('location',''), r.get('left_cm',''), r.get('right_cm',''))
        return '{}: {}cm'.format(r.get('label',''), r.get('value',''))  # legacy
    circ_lines = [_circ_line(r) for r in circ_table] if circ_table else []
```

- [ ] **Step 4: Update Strength block in Block 4**

Find:
```python
    left4_content = [
        kv('Grip Strength R',  grip_str(data.get('gripStrengthR', ''))),
        kv('Grip Strength L',  grip_str(data.get('gripStrengthL', ''))),
        kv('Pinch Strength R', grip_str(data.get('pinchStrengthR', ''))),
        kv('Pinch Strength L', grip_str(data.get('pinchStrengthL', ''))),
    ]
```

Replace with:
```python
    left4_content = [
        kv('Grip R / L',           '{} / {}'.format(grip_str(data.get('gripStrengthR','')),  grip_str(data.get('gripStrengthL','')))),
        kv('Pinch Lateral R / L',  '{} / {}'.format(grip_str(data.get('pinchLateralR','')),  grip_str(data.get('pinchLateralL','')))),
        kv('Pinch Pulp R / L',     '{} / {}'.format(grip_str(data.get('pinchPulpR','')),     grip_str(data.get('pinchPulpL','')))),
        kv('Pinch 3-Point R / L',  '{} / {}'.format(grip_str(data.get('pinch3ptR','')),      grip_str(data.get('pinch3ptL','')))),
    ]
    if data.get('pulpOpposition'):
        left4_content.append(kv('Pulp Opposition', data.get('pulpOpposition','')))
    fpc = []
    for finger, key in [('2nd','fpc2nd'),('3rd','fpc3rd'),('4th','fpc4th'),('5th','fpc5th')]:
        if data.get(key):
            fpc.append('{}:{}'.format(finger, data.get(key,'')))
    if fpc:
        left4_content.append(kv('FPC (cm)', '  '.join(fpc)))
```

- [ ] **Step 5: Update History + Pain fields referenced in Block 2**

Find the `left2 = box(...)` block and update field keys:
```python
    left2 = box('History &amp; Pain', [
        kv('Current History',  data.get('hxCurrent', '')),
        kv('Past History',     data.get('hxPast', '')),
        kv('Pain Pre / Post',  '{} / {}'.format(data.get('painPre',''), data.get('painPost',''))),
        kv('Nature of Pain',   data.get('painNature', '')),
        kv('24hr Behaviour',   data.get('pain24hr', '')),
        kv('Aggravating',      data.get('painAgg', '')),
        kv('Easing',           data.get('painEase', '')),
        kv('Irritability',     data.get('irritability', '')),
    ], width=LW)

    right2 = box('Special Questions', [
        kv('General Health',   data.get('sqGeneralHealth', '')),
        kv('Health Notes',     data.get('sqHealthNotes', '')),
        kv('PMHx / Surgery',   data.get('sqPmhx', '')),
        kv('Investigations',   data.get('sqInvest', '')),
        kv('Medications',      data.get('sqMedications', '')),
        kv('Allergies',        data.get('sqAllergies', '')),
        kv('Social',           data.get('sqSocial', '')),
        kv('Occupation',       data.get('sqOccupation', '')),
        kv('Recreation',       data.get('sqRec', '')),
        kv('Splinting',        data.get('sqSplinting', '')),
        kv('Dominant Hand',    data.get('sqDominantHand', '')),
    ], width=RW)
```

- [ ] **Step 6: Verify KKM ref string is still present**

```bash
grep "fisio / b.pen. 12 / Pind. 2 / 2019" pdf_hand.py
```

Expected: 1 match on line 2 (`REF = 'fisio / b.pen. 12 / Pind. 2 / 2019'`)

---

## Task 15: Acceptance criteria verification + commit

**Files:** Read-only checks + git

- [ ] **Step 1: Check `{% block form_name %}` (not `block title`)**

```bash
grep "block form_name\|block title" templates/forms/hand.html
```

Expected: `block form_name` present, `block title` absent.

- [ ] **Step 2: Count sidebar nav items**

```bash
grep -c "nav-item" templates/forms/hand.html
```

Expected: `19`

- [ ] **Step 3: Count section cards**

```bash
grep -c 'class="sec-num"' templates/forms/hand.html
```

Expected: `19`

- [ ] **Step 4: Verify no banned class names**

```bash
grep -c "section-card\|section-title\|class=\"form-row\"" templates/forms/hand.html
```

Expected: `0`

- [ ] **Step 5: Verify all section IDs match sidebar nav**

```bash
grep -oP "Main\.go\('\K[^']+" templates/forms/hand.html | sort
grep -oP 'class="card" id="\K[^"]+' templates/forms/hand.html | sort
```

Both lists must be identical when sorted.

- [ ] **Step 6: Verify preserved IDs exist in new HTML**

```bash
for id in pt-name pt-nric pt-passport pt-date pt-dob pt-age pt-country derived-dob derived-gender \
  diagnosis referral-source management-type surgery-date surgery-date-row surgery-type \
  hctype-sel hand-svg-r hand-svg-l markers-r markers-l hand-marker-list chart-notes \
  sq-general-health sq-health-notes sq-health-notes-row sq-medications sq-allergies sq-occupation sq-dominant-hand \
  wound-notes observation-notes tenderness temperature texture palpation-notes \
  rom-tbody grip-r grip-l pinch-r pinch-l circ-tbody \
  light-touch-r light-touch-l pin-prick-r pin-prick-l two-point-r two-point-l sensation-notes \
  tinels-r tinels-l phalens-r phalens-l finkelsteins-r finkelsteins-l fromens-r fromens-l \
  ref-c5-l ref-c5-r ref-c6-l ref-c6-r ref-c7-l ref-c7-r ref-c8t1-l ref-c8t1-r \
  pt-impression stg ltg plan; do
  grep -q "id=\"$id\"" templates/forms/hand.html || echo "MISSING: $id"
done
```

Expected: no output (all IDs present).

- [ ] **Step 7: Verify no inline style except approved patterns**

```bash
grep 'style="' templates/forms/hand.html | grep -v "grid-column:span\|min-height\|display:none\|flex:1\|width:\|font-size\|color:\|white-space\|letter-spacing\|text-transform\|font-weight\|margin\|overflow\|cursor\|min-width\|text-align\|padding\|line-height"
```

Expected: 0 lines (all remaining `style=""` usages should match approved patterns).

- [ ] **Step 8: Syntax check JS files**

```bash
node --check static/js/hand_rom_table.js && \
node --check static/js/hand_circ_table.js && \
node --check static/js/form_hand.js && \
echo "All JS syntax OK"
```

Expected: `All JS syntax OK`

- [ ] **Step 9: Smoke-test Flask can render the template**

```bash
python -c "
from app import app
with app.test_client() as c:
    # HAND form is at /form/hand/<episode_id> but we just test template parsing
    import jinja2
    env = app.jinja_env
    t = env.get_template('forms/hand.html')
    out = t.render(episode_id=1, patient_id=1, patient=None, is_form_page=True)
    assert 'Hand Assessment' in out
    assert 'sidebar_nav' not in out  # block rendered, not raw tag
    assert out.count('sec-num') == 19
    print('Template smoke test OK — 19 sections rendered')
"
```

Expected: `Template smoke test OK — 19 sections rendered`

- [ ] **Step 8a: Delete dead `.surgery-row.show` rule from style.css**

`style.css` line 610 has `.surgery-row.show { display: flex; }`. This rule was designed for a JS class-toggle pattern. `form_hand.js` (and ms.html's equivalent) use direct `style.display` assignment instead — the `.show` class is never set by any JS. Canonical pattern is inline-style show/hide (matches ms.html `onManagementChange`). Delete the dead rule.

Find in `static/css/style.css`:
```css
.surgery-row { display: none; align-items: center; gap: 10px; margin-top: 8px; }
.surgery-row.show { display: flex; }
```

Replace with:
```css
.surgery-row { display: none; align-items: center; gap: 10px; margin-top: 8px; }
```

Verify after edit:
```bash
grep "surgery-row" static/css/style.css
```
Expected: one line only (the base rule, no `.show` variant).

- [ ] **Step 10: Commit**

```bash
git add templates/forms/hand.html \
        static/js/hand_rom_table.js \
        static/js/hand_circ_table.js \
        static/js/form_hand.js \
        pdf_hand.py \
        static/css/style.css

git commit -m "$(cat <<'EOF'
refactor(hand): rebuild hand.html to DESIGN_SYSTEM spec — 19 sections, dynamic ROM/circ tables

- Replace all section-card/form-row/chip with .card/.fg/.field canonical classes
- Add {% block sidebar_nav %} with 19 nav-items (was missing entirely)
- Switch from {% block title %} to {% block form_name %}
- Pain: VAS slider pattern + irr-chip irritability (was number inputs + chip-group)
- Hand chart: .body-chart-wrap 2-col layout, legend integrated into type selector
- ROM: dynamic add-row table via HandRomTable IIFE (was 44-row static Jinja table)
- Circumference: dynamic table via HandCircTable IIFE with L/R columns
- Strength: expanded to 4 pinch types + FPC + pulp opposition
- Neuro: Brachioradialis MMT added, .neuro-grid pattern
- 19→16 clinical sections split for PT Impression / STG / LTG / Plan
- pt-nric replaces pt-ic (may fix Session B patient prefill bug as side-effect)
- pdf_hand.py updated for new array shapes and field keys (legacy shape supported)
- style.css: delete dead .surgery-row.show rule (inline-style is canonical show/hide pattern)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Post-commit: Write HANDOVER.md

Update `HANDOVER.md` with:

**What was done:** Session A complete. `claude/refactor-hand-form-ui-rebuild` branch committed. Not merged to main.

**Gotchas:**
- `pt-ic` → `pt-nric` in patient field — likely fixes Session B patient prefill bug. Verify during smoke test.
- `surgery-date-row` reveal: **fixed in-session.** `onManagementChange()` uses direct `style.display` assignment (matches ms.html pattern). The dead `.surgery-row.show { display: flex; }` rule in `style.css` was deleted in Task 15 Step 8a — it was never set by any JS, just noise. Inline-style is now the canonical show/hide pattern across all forms. Broader class-vs-inline cleanup (other components that may have similar drift) flagged as a separate task.
- Breaking data shape changes for existing HAND records:
  - `painScoreR`/`painScoreL` → `painPre`/`painPost`
  - `chiefComplaint`/`onsetDate`/`mechanism` → `hxCurrent`
  - Chip arrays `skinCondition`/`deformity`/`swelling`/`pastMedHistory` removed from collect output
  - ROM: `{table:[{movement,activeL,...}]}` → flat `[{category,movement,active_l,...}]` (legacy handled in pdf_hand.py)
  - Circumference: `{table:[{label,value}]}` → flat `[{location,left_cm,right_cm}]` (legacy rendered in pdf_hand.py)
- `btn-ghost` not perpetuated — used `btn-sm` instead (see flagged cleanup task).

**Next session (Session B):** Functional bug fixes — patient prefill verification, diagnosis validation, clinical_templates.js amalgamation issue.

**Smoke test instructions for Miruya:** Start app, open a new HAND assessment, verify: sidebar shows 19 sections, clicking nav scrolls to correct card, ROM table starts empty and "+ Add Row" adds cascading dropdowns, Hand Chart markers place and show in legend area, Save works, PDF export shows correct data.

---

## Spec coverage self-check

| Spec requirement | Task |
|-----------------|------|
| 19 sections, sidebar nav | Tasks 2–10 |
| `.card` + `.card-header` + `.card-body` on every section | Tasks 3–10 |
| `{% block form_name %}` not `{% block title %}` | Task 2 |
| NRIC derived-badge chips | Task 3 |
| VAS slider pair (pain-pre/post) | Task 4 |
| irr-chip irritability | Task 4 |
| `.body-chart-wrap` layout for hand chart | Task 5 |
| Marker type selector with integrated legend | Task 5 |
| Dynamic ROM table with cascading category→movement | Tasks 8, 11 |
| Dynamic circumference table with L/R columns | Tasks 8, 12 |
| All preserved element IDs verified | Task 1, Task 15 Step 6 |
| form_hand.js collect/populate/reset updated | Task 13 |
| pdf_hand.py ROM/circ array rendering | Task 14 |
| hand_rom_table.js IIFE | Task 11 |
| hand_circ_table.js IIFE | Task 12 |
| No `class="form-row"` or `class="section-card"` | Task 15 Step 4 |
| KKM ref string preserved | Task 14 Step 6 |
| Worktree isolation on `claude/refactor-hand-form-ui-rebuild` | Pre-task setup |
| node --check passes | Tasks 11, 12, 13 |

No gaps found.
