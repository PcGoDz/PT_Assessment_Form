# BURN Form Pass 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the BURN assessment form as a fully working load-and-save vertical slice — form HTML, JS collect/populate/reset, registry wiring, and clinical templates — stopping short of PDF generation and MPIS builder (those are Pass 2).

**Architecture:** Standard form-add pattern (WORKFLOW.md §"Adding a new form"). Seven files touched: `app.py`, `database.py`, `templates/home.html`, `templates/episode.html`, new `templates/forms/burn.html`, new `static/js/form_burn.js`, and `static/js/clinical_templates.js`. The form reuses bodychart.js (verbatim), lungchart.js (verbatim), and a private 3-column movement mini-table built inside form_burn.js.

**Tech Stack:** Flask/Jinja2, vanilla JS, SQLite. No new CSS — all components reuse existing style.css classes.

---

## Pre-flight: key non-obvious decisions (READ BEFORE CODING)

### Burn depth chips — CSS mapping
`bodychart.js` has a hardcoded `COLORS` dict keyed on exactly 6 ptype strings: `ache`, `sharp`, `numb`, `burn`, `refer`, `tender`. Unknown types fall back to `#888` (grey) on reload. To avoid grey markers and to avoid touching shared code, **reuse the existing 6 ptype keys with relabelled buttons**:

| CSS class + data-ptype | Button label |
|---|---|
| `ptype-ache` / `ache` | Superficial (1°) |
| `ptype-burn` / `burn` | Superficial partial (2°) |
| `ptype-sharp` / `sharp` | Deep partial (2°) |
| `ptype-numb` / `numb` | Full thickness (3°/4°) |
| `ptype-refer` / `refer` | Donor site |
| `ptype-tender` / `tender` | Grafted (SSG) |

No new CSS needed. Colours are semantically approximate (orange=partial, red=deep, purple=full-thickness) which is clinically reasonable.

### Movement table — custom private mini-table
`MovementTable` (shared IIFE) always renders 9 columns. BURN needs only 3 (Joint / Active / Passive). Build a private `BurnMov` IIFE inside `form_burn.js` — same add-row/sync/getData/loadData pattern, 3 columns only. The tbody ID is `burn-mov-tbody` (distinct from ms.html's `mov-tbody`). Delete button calls `BurnMov.deleteRow(id)` — `BurnMov` is module-scope in form_burn.js, not wrapped in the main IIFE.

### Toggle pattern
Copy CR's `_splitToggle` private function verbatim into `form_burn.js`. Wire `onchange` handlers using an inline `BurnForm.onToggle(...)` object defined in the `extra_js` block (exact mirror of CRForm.onToggle pattern in cr.html).

### Section count
The spec's §3 lists 19 sections; §4 groups `pt-problem` under `s-dx`. To hit 19 cards, create a standalone `s-prob` card (section 03) for `pt-problem`. Sections 17, 18, 19 (STG / LTG / Plan) each get their own card.

---

## File map

| File | Action | What changes |
|---|---|---|
| `app.py` | Modify | `FORM_REGISTRY` BURN `ready=True`; add `'BURN': 'forms/burn.html'` to `FORM_TEMPLATES` |
| `database.py` | Modify | Add `'BURN': [('diagnosis', 'Diagnosis is required')]` to `REQUIRED_FIELDS` |
| `templates/home.html` | Modify | BURN card: remove `soon` class + badge, add `onclick="selectForm(this)"`; add `BURN` to `formLabel` map |
| `templates/forms/burn.html` | Create | 19-section assessment form |
| `static/js/form_burn.js` | Create | `BurnMov` IIFE + `window.ActiveForm` + `window.Form` (collect/populate/reset + 4 FormBase delegates) |
| `static/js/clinical_templates.js` | Modify | Add `BURN` assessment arrays + `BURN_SOAP` to `TEMPLATES` const |
| `templates/episode.html` | Modify | Add `'BURN': 'BURN_SOAP'` to `tplMap` in `showSoapTemplate()` |

---

## Task 1: App & database wiring

**Files:**
- Modify: `app.py:76` (FORM_REGISTRY) and `app.py:110` (FORM_TEMPLATES)
- Modify: `database.py:122` (REQUIRED_FIELDS)

- [ ] **Step 1.1: Read app.py lines 70–120 to confirm current state**

  Run: `grep -n "BURN\|FORM_TEMPLATES" app.py`
  Expected: BURN line shows `'ready': False`; FORM_TEMPLATES has no BURN entry.

- [ ] **Step 1.2: Flip BURN ready=True in FORM_REGISTRY**

  In `app.py`, find the BURN registry line (currently ~line 76):
  ```python
  { 'id': 'BURN',        'label': 'Burn',               'icon': '&#128293;', 'badge': 'BN',  'group': 'Musculoskeletal',  'ready': False },
  ```
  Change `'ready': False` → `'ready': True`.

- [ ] **Step 1.3: Add BURN to FORM_TEMPLATES**

  In `app.py` FORM_TEMPLATES dict (~line 117), add after the HAND entry:
  ```python
  FORM_TEMPLATES = {
      'MS':          'forms/ms.html',
      'SPINE':       'forms/spine.html',
      'GERIATRIC':   'forms/geriatric.html',
      'CR':          'forms/cr.html',
      'AMPUTATION':  'forms/amputation.html',
      'NEURO':       'forms/neuro.html',
      'HAND':        'forms/hand.html',
      'BURN':        'forms/burn.html',
  }
  ```

- [ ] **Step 1.4: Add BURN to REQUIRED_FIELDS in database.py**

  In `database.py`, REQUIRED_FIELDS dict (~line 122), add after the HAND entry:
  ```python
  'HAND':  [('diagnosis', 'Diagnosis is required'), ('pt_impression', 'PT Impression is required')],
  'BURN':  [('diagnosis', 'Diagnosis is required')],
  ```

- [ ] **Step 1.5: Verify database.py syntax**

  Run: `py -c "import database; print('ok')"`
  Expected: `ok`

- [ ] **Step 1.6: Commit**

  ```bash
  git add app.py database.py
  git commit -m "feat(burn): flip registry ready + FORM_TEMPLATES + REQUIRED_FIELDS"
  ```

---

## Task 2: home.html — activate BURN card

**Files:**
- Modify: `templates/home.html:1065` (BURN form-card)
- Modify: `templates/home.html:1923` (formLabel map in episode JS)

- [ ] **Step 2.1: Read the BURN card in home.html**

  Run: `grep -n "BURN\|formLabel" templates/home.html`
  Expected: BURN card at ~1065 has class `soon` and no `onclick`. formLabel map at ~1923 has no BURN entry.

- [ ] **Step 2.2: Activate the BURN form card**

  Find (~line 1065):
  ```html
  <div class="form-card soon" data-form="BURN">
    <div class="form-card-badge">Soon</div>
    <div class="form-card-icon">&#128293;</div>
    <div class="form-card-name">Burn</div>
    <div class="form-card-sub">Burns rehabilitation</div>
  </div>
  ```
  Replace with:
  ```html
  <div class="form-card" data-form="BURN" onclick="selectForm(this)">
    <div class="form-card-icon">&#128293;</div>
    <div class="form-card-name">Burn</div>
    <div class="form-card-sub">Burns rehabilitation</div>
  </div>
  ```

- [ ] **Step 2.3: Add BURN to the formLabel map**

  Find (~line 1923):
  ```js
  var formLabel  = { MS:'Musculoskeletal', SPINE:'Spine', GERIATRIC:'Geriatric', CR:'Cardiorespiratory', AMPUTATION:'Amputation', NEURO:'Neurological', HAND:'Hand' }[ep.form_type] || ep.form_type;
  ```
  Replace with:
  ```js
  var formLabel  = { MS:'Musculoskeletal', SPINE:'Spine', GERIATRIC:'Geriatric', CR:'Cardiorespiratory', AMPUTATION:'Amputation', NEURO:'Neurological', HAND:'Hand', BURN:'Burn' }[ep.form_type] || ep.form_type;
  ```

- [ ] **Step 2.4: Commit**

  ```bash
  git add templates/home.html
  git commit -m "feat(burn): activate home.html form card"
  ```

---

## Task 3: burn.html — Sections 01–09

**Files:**
- Create: `templates/forms/burn.html` (first half — through body chart)

- [ ] **Step 3.1: Create burn.html with the file header and sections 01–09**

  Create `templates/forms/burn.html` with this content (the `extra_js` block comes in Task 4):

  ```html
  {% extends "base.html" %}

  {% block form_name %}Burn Assessment{% endblock %}
  {% block topbar_ref %}KKM Physiotherapy Dept &mdash; fisio / b.pen. 5 / Pind. 2 / 2019{% endblock %}

  {% block sidebar_nav %}
  <div class="nav-item" onclick="Main.go('s-patient')"><span class="nav-icon">&#128100;</span> Patient Info</div>
  <div class="nav-item" onclick="Main.go('s-dx')"><span class="nav-icon">&#128293;</span> Diagnosis</div>
  <div class="nav-item" onclick="Main.go('s-prob')"><span class="nav-icon">&#128203;</span> Problems</div>
  <div class="nav-item" onclick="Main.go('s-pain')"><span class="nav-icon">&#128202;</span> Pain Score</div>
  <div class="nav-item" onclick="Main.go('s-sq')"><span class="nav-icon">&#10067;</span> Special Qs</div>
  <div class="nav-item" onclick="Main.go('s-ix')"><span class="nav-icon">&#128300;</span> Investigation</div>
  <div class="nav-item" onclick="Main.go('s-hx')"><span class="nav-icon">&#128214;</span> History</div>
  <div class="nav-item" onclick="Main.go('s-assoc')"><span class="nav-icon">&#9888;</span> Assoc. Injury</div>
  <div class="nav-item" onclick="Main.go('s-chart')"><span class="nav-icon">&#128506;</span> Body Chart</div>
  <div class="nav-item" onclick="Main.go('s-resp')"><span class="nav-icon">&#128065;</span> Respiratory</div>
  <div class="nav-item" onclick="Main.go('s-palp')"><span class="nav-icon">&#128400;</span> Chest Expansion</div>
  <div class="nav-item" onclick="Main.go('s-ausc')"><span class="nav-icon">&#127908;</span> Auscultation</div>
  <div class="nav-item" onclick="Main.go('s-mov')"><span class="nav-icon">&#128260;</span> Movement</div>
  <div class="nav-item" onclick="Main.go('s-mob')"><span class="nav-icon">&#128694;</span> Mobility</div>
  <div class="nav-item" onclick="Main.go('s-gait')"><span class="nav-icon">&#128247;</span> Gait</div>
  <div class="nav-item" onclick="Main.go('s-impression')"><span class="nav-icon">&#127919;</span> PT Impression</div>
  <div class="nav-item" onclick="Main.go('s-stg')"><span class="nav-icon">&#127775;</span> Short-Term Goals</div>
  <div class="nav-item" onclick="Main.go('s-ltg')"><span class="nav-icon">&#127919;</span> Long-Term Goals</div>
  <div class="nav-item" onclick="Main.go('s-plan')"><span class="nav-icon">&#128221;</span> Plan of Treatment</div>
  {% endblock %}

  {% block content %}

  <!-- 01 PATIENT INFO — copy verbatim from ms.html -->
  <div class="card" id="s-patient">
    <div class="card-header"><span class="sec-num">01</span><h2>Patient Information</h2></div>
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
        </div>
      </div>
    </div>
  </div>

  <!-- 02 DIAGNOSIS & MANAGEMENT -->
  <div class="card" id="s-dx">
    <div class="card-header"><span class="sec-num">02</span><h2>Diagnosis &amp; Doctor&#39;s Management</h2></div>
    <div class="card-body">
      <div class="fg c2">
        <div class="field" style="grid-column:span 2">
          <label>Diagnosis <span class="req">*</span></label>
          <textarea id="diagnosis" placeholder="As stated in referral / BHT..."></textarea>
        </div>
        <div class="field" style="grid-column:span 2">
          <label>Doctor&#39;s Management</label>
          <textarea id="dr-mgmt" placeholder="Dressing type, escharotomy/fasciotomy, skin graft, antibiotics..." style="min-height:60px"></textarea>
        </div>
      </div>
    </div>
  </div>

  <!-- 03 PROBLEMS -->
  <div class="card" id="s-prob">
    <div class="card-header"><span class="sec-num">03</span><h2>Problems</h2></div>
    <div class="card-body">
      <div class="fg">
        <div class="field">
          <label>Presenting Problem</label>
          <textarea id="pt-problem" placeholder="Main presenting problem from patient perspective — pain, limited movement, respiratory distress..." style="min-height:72px"></textarea>
        </div>
      </div>
    </div>
  </div>

  <!-- 04 PAIN SCORE -->
  <div class="card" id="s-pain">
    <div class="card-header"><span class="sec-num">04</span><h2>Pain Score</h2></div>
    <div class="card-body">
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
    </div>
  </div>

  <!-- 05 SPECIAL QUESTIONS -->
  <div class="card" id="s-sq">
    <div class="card-header"><span class="sec-num">05</span><h2>Special Questions</h2></div>
    <div class="card-body">
      <div class="fg c2">
        <div class="field"><label>General Health</label><input type="text" id="sq-health" placeholder="General health status..."></div>
        <div class="field"><label>PMHx / Surgery (DM, HTN...)</label><input type="text" id="sq-pmhx" placeholder="Diabetes, HPT, previous surgeries..."></div>
        <div class="field"><label>Medication / Steroid</label><input type="text" id="sq-med" placeholder="NSAIDs, corticosteroids, antibiotics..."></div>
        <div class="field"><label>Occupation / Recreation</label><input type="text" id="sq-occ" placeholder="Nature of job, hobbies..."></div>
      </div>
    </div>
  </div>

  <!-- 06 INVESTIGATION -->
  <div class="card" id="s-ix">
    <div class="card-header"><span class="sec-num">06</span><h2>Investigation</h2></div>
    <div class="card-body">
      <div class="fg c2">
        <div class="field">
          <label>Wound C&amp;S</label>
          <select id="ix-wound-cs-status" onchange="BurnForm.onToggle('ix-wound-cs-status','ix-wound-cs-detail',['Available'])">
            <option value="">— Select —</option>
            <option value="Not done">Not done</option>
            <option value="Available">Available</option>
            <option value="KIV next visit">KIV next visit</option>
          </select>
          <textarea id="ix-wound-cs-detail" style="display:none;margin-top:6px;min-height:52px" placeholder="e.g. MRSA face, Pseudomonas axilla, pen-sensitive..."></textarea>
        </div>
        <div class="field">
          <label>CXR</label>
          <select id="ix-cxr-status" onchange="BurnForm.onToggle('ix-cxr-status','ix-cxr-detail',['Available'])">
            <option value="">— Select —</option>
            <option value="Not done">Not done</option>
            <option value="Available">Available</option>
            <option value="KIV next visit">KIV next visit</option>
          </select>
          <textarea id="ix-cxr-detail" style="display:none;margin-top:6px;min-height:52px" placeholder="Lung inflation, mediastinal/trachea shift..."></textarea>
        </div>
        <div class="field">
          <label>ABG</label>
          <select id="ix-abg-status" onchange="BurnForm.onToggle('ix-abg-status','ix-abg-detail',['Available'])">
            <option value="">— Select —</option>
            <option value="Not done">Not done</option>
            <option value="Available">Available</option>
            <option value="KIV next visit">KIV next visit</option>
          </select>
          <textarea id="ix-abg-detail" style="display:none;margin-top:6px;min-height:52px" placeholder="e.g. Respiratory acidosis — pH 7.28, PaCO2 58..."></textarea>
        </div>
      </div>
    </div>
  </div>

  <!-- 07 CURRENT HISTORY -->
  <div class="card" id="s-hx">
    <div class="card-header"><span class="sec-num">07</span><h2>Current History</h2></div>
    <div class="card-body">
      <div class="fg">
        <div class="field">
          <label>History of Present Burn <span class="req">*</span></label>
          <textarea id="hx-current" placeholder="Cause (thermal/chemical/electrical/radiation), date of burn, smoke inhalation, first aid given..." style="min-height:95px"></textarea>
        </div>
      </div>
    </div>
  </div>

  <!-- 08 ASSOCIATED INJURY / PRECAUTION -->
  <div class="card" id="s-assoc">
    <div class="card-header"><span class="sec-num">08</span><h2>Associated Injury &amp; Precaution</h2></div>
    <div class="card-body">
      <div class="fg">
        <div class="field">
          <label>Associated Injury / Precautions</label>
          <textarea id="assoc-injury" placeholder="Head/chest/abdominal injury, fractures, SSG site precautions, tendon exposure, circumferential burns, escharotomy..." style="min-height:80px"></textarea>
        </div>
      </div>
    </div>
  </div>

  <!-- 09 BODY CHART + TBSA + DEPTH -->
  <div class="card" id="s-chart">
    <div class="card-header"><span class="sec-num">09</span><h2>Body Chart, TBSA &amp; Burn Depth</h2></div>
    <div class="card-body">
      <div class="fg">
        <!-- TBSA -->
        <div class="fg c2">
          <div class="field">
            <label>TBSA (%)</label>
            <input type="number" id="tbsa" min="0" max="100" step="0.5" placeholder="e.g. 25">
          </div>
        </div>
        <!-- Body chart — reuse MS SVG + bodychart.js verbatim, relabelled chips -->
        <div class="body-chart-wrap">
          <div class="body-figures">
            <div class="fig-wrap">
              <div class="fig-label">Anterior</div>
              <svg class="bsvg" id="svg-ant" width="130" height="310" viewBox="0 0 130 310">
                <g stroke="#555" stroke-width="1" fill="white">
                  <ellipse cx="65" cy="18" rx="13" ry="16"/>
                  <rect x="59" y="32" width="12" height="10"/>
                  <path d="M32,42 Q40,38 59,40 L59,52 Q50,50 40,54 Q34,56 30,60 Z"/>
                  <path d="M98,42 Q90,38 71,40 L71,52 Q80,50 90,54 Q96,56 100,60 Z"/>
                  <path d="M40,54 Q38,70 38,90 Q38,105 42,115 L88,115 Q92,105 92,90 Q92,70 90,54 Z"/>
                  <path d="M30,60 Q22,65 18,78 Q16,90 20,102 Q26,106 32,104 Q36,92 38,78 Q36,66 32,60 Z"/>
                  <path d="M100,60 Q108,65 112,78 Q114,90 110,102 Q104,106 98,104 Q94,92 92,78 Q94,66 98,60 Z"/>
                  <path d="M20,102 Q16,114 16,126 Q16,138 20,146 Q26,148 32,146 Q36,138 36,126 Q36,114 32,104 Z"/>
                  <path d="M110,102 Q114,114 114,126 Q114,138 110,146 Q104,148 98,146 Q94,138 94,126 Q94,114 98,104 Z"/>
                  <ellipse cx="24" cy="153" rx="8" ry="10"/>
                  <ellipse cx="106" cy="153" rx="8" ry="10"/>
                  <path d="M42,115 Q38,120 36,130 Q34,140 38,148 Q50,154 65,154 Q80,154 92,148 Q96,140 94,130 Q92,120 88,115 Z"/>
                  <path d="M38,148 Q32,160 30,178 Q28,196 30,212 Q36,218 44,216 Q50,200 52,182 Q54,164 50,150 Z"/>
                  <path d="M92,148 Q98,160 100,178 Q102,196 100,212 Q94,218 86,216 Q80,200 78,182 Q76,164 80,150 Z"/>
                  <ellipse cx="37" cy="219" rx="9" ry="8"/>
                  <ellipse cx="93" cy="219" rx="9" ry="8"/>
                  <path d="M28,226 Q26,244 28,260 Q30,272 34,278 Q40,280 46,278 Q48,266 46,252 Q44,238 40,226 Z"/>
                  <path d="M102,226 Q104,244 102,260 Q100,272 96,278 Q90,280 84,278 Q82,266 84,252 Q86,238 90,226 Z"/>
                  <path d="M28,278 Q24,284 24,292 Q28,300 38,300 Q46,300 48,292 Q48,284 46,278 Z"/>
                  <path d="M102,278 Q106,284 106,292 Q102,300 92,300 Q84,300 82,292 Q82,284 84,278 Z"/>
                </g>
                <text x="6" y="172" font-size="8" fill="#888" font-family="sans-serif">R</text>
                <text x="118" y="172" font-size="8" fill="#888" font-family="sans-serif">L</text>
                <rect class="hit" x="50" y="2"   width="30" height="32" rx="14" data-zone="Head"            data-view="ant"/>
                <rect class="hit" x="30" y="34"  width="70" height="22" rx="3"  data-zone="Neck / Shoulder" data-view="ant"/>
                <rect class="hit" x="4"  y="56"  width="34" height="50" rx="3"  data-zone="L arm"           data-view="ant"/>
                <rect class="hit" x="92" y="56"  width="34" height="50" rx="3"  data-zone="R arm"           data-view="ant"/>
                <rect class="hit" x="36" y="56"  width="58" height="60" rx="3"  data-zone="Chest"           data-view="ant"/>
                <rect class="hit" x="36" y="112" width="58" height="44" rx="3"  data-zone="Abdomen"         data-view="ant"/>
                <rect class="hit" x="4"  y="102" width="34" height="46" rx="3"  data-zone="L forearm"       data-view="ant"/>
                <rect class="hit" x="92" y="102" width="34" height="46" rx="3"  data-zone="R forearm"       data-view="ant"/>
                <rect class="hit" x="34" y="150" width="34" height="68" rx="3"  data-zone="L thigh"         data-view="ant"/>
                <rect class="hit" x="62" y="150" width="34" height="68" rx="3"  data-zone="R thigh"         data-view="ant"/>
                <rect class="hit" x="24" y="222" width="28" height="58" rx="3"  data-zone="L leg"           data-view="ant"/>
                <rect class="hit" x="78" y="222" width="28" height="58" rx="3"  data-zone="R leg"           data-view="ant"/>
                <rect class="hit" x="22" y="276" width="30" height="26" rx="3"  data-zone="L foot"          data-view="ant"/>
                <rect class="hit" x="78" y="276" width="30" height="26" rx="3"  data-zone="R foot"          data-view="ant"/>
                <g id="markers-ant"></g>
              </svg>
            </div>
            <div class="fig-wrap">
              <div class="fig-label">Posterior</div>
              <svg class="bsvg" id="svg-post" width="130" height="310" viewBox="0 0 130 310">
                <g stroke="#555" stroke-width="1" fill="white">
                  <ellipse cx="65" cy="18" rx="13" ry="16"/>
                  <rect x="59" y="32" width="12" height="10"/>
                  <path d="M32,42 Q40,38 59,40 L59,52 Q50,50 40,54 Q34,56 30,60 Z"/>
                  <path d="M98,42 Q90,38 71,40 L71,52 Q80,50 90,54 Q96,56 100,60 Z"/>
                  <path d="M40,54 Q38,70 38,90 Q38,105 42,115 L88,115 Q92,105 92,90 Q92,70 90,54 Z"/>
                  <path d="M30,60 Q22,65 18,78 Q16,90 20,102 Q26,106 32,104 Q36,92 38,78 Q36,66 32,60 Z"/>
                  <path d="M100,60 Q108,65 112,78 Q114,90 110,102 Q104,106 98,104 Q94,92 92,78 Q94,66 98,60 Z"/>
                  <path d="M20,102 Q16,114 16,126 Q16,138 20,146 Q26,148 32,146 Q36,138 36,126 Q36,114 32,104 Z"/>
                  <path d="M110,102 Q114,114 114,126 Q114,138 110,146 Q104,148 98,146 Q94,138 94,126 Q94,114 98,104 Z"/>
                  <ellipse cx="24" cy="153" rx="8" ry="10"/>
                  <ellipse cx="106" cy="153" rx="8" ry="10"/>
                  <path d="M42,115 Q38,122 36,132 Q34,144 40,150 Q52,156 65,156 Q78,156 90,150 Q96,144 94,132 Q92,122 88,115 Z"/>
                  <path d="M40,150 Q32,162 30,180 Q28,198 32,214 Q38,220 46,218 Q52,202 54,184 Q56,166 50,152 Z"/>
                  <path d="M90,150 Q98,162 100,180 Q102,198 98,214 Q92,220 84,218 Q78,202 76,184 Q74,166 80,152 Z"/>
                  <ellipse cx="37" cy="219" rx="9" ry="8"/>
                  <ellipse cx="93" cy="219" rx="9" ry="8"/>
                  <path d="M28,226 Q26,244 28,260 Q30,272 34,278 Q40,280 46,278 Q48,266 46,252 Q44,238 40,226 Z"/>
                  <path d="M102,226 Q104,244 102,260 Q100,272 96,278 Q90,280 84,278 Q82,266 84,252 Q86,238 90,226 Z"/>
                  <path d="M34,278 Q28,282 26,290 Q30,298 40,300 Q48,300 48,290 Q48,282 46,278 Z"/>
                  <path d="M96,278 Q102,282 104,290 Q100,298 90,300 Q82,300 82,290 Q82,282 84,278 Z"/>
                </g>
                <text x="6" y="172" font-size="8" fill="#888" font-family="sans-serif">R</text>
                <text x="118" y="172" font-size="8" fill="#888" font-family="sans-serif">L</text>
                <rect class="hit" x="50" y="2"   width="30" height="32" rx="14" data-zone="Head (post)"          data-view="post"/>
                <rect class="hit" x="30" y="34"  width="70" height="22" rx="3"  data-zone="Neck (post)"          data-view="post"/>
                <rect class="hit" x="4"  y="56"  width="34" height="50" rx="3"  data-zone="L arm (post)"         data-view="post"/>
                <rect class="hit" x="92" y="56"  width="34" height="50" rx="3"  data-zone="R arm (post)"         data-view="post"/>
                <rect class="hit" x="36" y="56"  width="58" height="60" rx="3"  data-zone="Upper back"           data-view="post"/>
                <rect class="hit" x="36" y="112" width="58" height="44" rx="3"  data-zone="Lumbar / Lower back"  data-view="post"/>
                <rect class="hit" x="4"  y="102" width="34" height="46" rx="3"  data-zone="L forearm (post)"     data-view="post"/>
                <rect class="hit" x="92" y="102" width="34" height="46" rx="3"  data-zone="R forearm (post)"     data-view="post"/>
                <rect class="hit" x="34" y="150" width="34" height="70" rx="3"  data-zone="L hamstring"          data-view="post"/>
                <rect class="hit" x="62" y="150" width="34" height="70" rx="3"  data-zone="R hamstring"          data-view="post"/>
                <rect class="hit" x="24" y="222" width="28" height="58" rx="3"  data-zone="L calf"               data-view="post"/>
                <rect class="hit" x="78" y="222" width="28" height="58" rx="3"  data-zone="R calf"               data-view="post"/>
                <rect class="hit" x="22" y="276" width="30" height="26" rx="3"  data-zone="L heel / foot (post)" data-view="post"/>
                <rect class="hit" x="78" y="276" width="30" height="26" rx="3"  data-zone="R heel / foot (post)" data-view="post"/>
                <g id="markers-post"></g>
              </svg>
            </div>
          </div>
          <div class="chart-controls">
            <div>
              <div style="font-size:11px;font-weight:500;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:7px">Select depth then click figure</div>
              <div class="pain-type-sel" id="ptype-sel">
                <button class="pt-chip ptype-ache active" data-ptype="ache">Superficial (1&deg;)</button>
                <button class="pt-chip ptype-burn"        data-ptype="burn">Superficial partial (2&deg;)</button>
                <button class="pt-chip ptype-sharp"       data-ptype="sharp">Deep partial (2&deg;)</button>
                <button class="pt-chip ptype-numb"        data-ptype="numb">Full thickness (3&deg;/4&deg;)</button>
                <button class="pt-chip ptype-refer"       data-ptype="refer">Donor site</button>
                <button class="pt-chip ptype-tender"      data-ptype="tender">Grafted (SSG)</button>
              </div>
            </div>
            <div>
              <div class="list-header">
                <span>Marked Locations</span>
                <button class="btn-sm" onclick="BodyChart.clearAll()">Clear all</button>
              </div>
              <div class="marker-list" id="marker-list">
                <div class="empty-hint" id="empty-hint">No markers yet</div>
              </div>
            </div>
            <div class="field">
              <label>Body Chart Notes</label>
              <textarea id="chart-notes" placeholder="Circumferential burns, escharotomy done, ~% per region..." style="min-height:56px"></textarea>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  ```

- [ ] **Step 3.2: Verify file was created**

  Run: `py -c "open('templates/forms/burn.html').read(); print('ok')"`
  Expected: `ok` (no encoding error)

---

## Task 4: burn.html — Sections 10–19 + extra_js

**Files:**
- Modify: `templates/forms/burn.html` (append remaining sections + close `{% endblock %}` + add `{% block extra_js %}`)

- [ ] **Step 4.1: Append sections 10–12 (Respiratory / Chest Expansion / Auscultation) to burn.html**

  Append to `templates/forms/burn.html` (before the final `{% endblock %}` line):

  ```html
  <!-- 10 RESPIRATORY ASSESSMENT -->
  <div class="card" id="s-resp">
    <div class="card-header"><span class="sec-num">10</span><h2>Respiratory Assessment</h2></div>
    <div class="card-body">
      <div class="fg">
        <div class="field">
          <label>Observation (pain/distress/conscious level)</label>
          <textarea id="resp-obs" placeholder="Level of consciousness, pain on inspiration, distress level, use of accessory muscles..." style="min-height:72px"></textarea>
        </div>
        <div class="fg c2">
          <div class="field">
            <label>Ventilated</label>
            <select id="resp-vent-yn" onchange="BurnForm.onToggle('resp-vent-yn','resp-vent-detail',['Yes'])">
              <option value="">— Select —</option>
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
            <input type="text" id="resp-vent-detail" style="display:none;margin-top:6px" placeholder="Mode, PEEP, FiO2...">
          </div>
          <div class="field">
            <label>O2 Treatment</label>
            <select id="resp-o2-yn" onchange="BurnForm.onToggle('resp-o2-yn','resp-o2-detail',['Yes'])">
              <option value="">— Select —</option>
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
            <input type="text" id="resp-o2-detail" style="display:none;margin-top:6px" placeholder="e.g. Nasal prong 3L/min, Venturi 40%...">
          </div>
          <div class="field">
            <label>Breathing Pattern</label>
            <select id="obs-breathing-pattern">
              <option value="">— Select —</option>
              <option>Normal</option>
              <option>Rapid, shallow</option>
              <option>Slow, deep</option>
              <option>Kussmaul (deep, laboured)</option>
              <option>Cheyne-Stokes</option>
              <option>Biot's (ataxic)</option>
              <option>Paradoxical</option>
            </select>
          </div>
          <div class="field">
            <label>Hoarseness</label>
            <select id="resp-hoarseness-yn" onchange="BurnForm.onToggle('resp-hoarseness-yn','resp-hoarseness-detail',['Yes'])">
              <option value="">— Select —</option>
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
            <input type="text" id="resp-hoarseness-detail" style="display:none;margin-top:6px" placeholder="Onset, severity...">
          </div>
          <div class="field">
            <label>Cough Type</label>
            <select id="cough-type">
              <option value="">— Select —</option>
              <option>Productive</option>
              <option>Non-Productive</option>
            </select>
          </div>
          <div class="field">
            <label>Cough Effectiveness</label>
            <select id="cough-effect">
              <option value="">— Select —</option>
              <option>Effective</option>
              <option>Ineffective</option>
            </select>
          </div>
        </div>
        <div>
          <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:8px">Sputum</div>
          <div class="fg c2" style="gap:10px">
            <div class="field">
              <label>Colour</label>
              <select id="sputum-colour">
                <option value="">— Select —</option>
                <option>Clear / White (mucoid)</option>
                <option>Yellow (mucopurulent)</option>
                <option>Green (purulent)</option>
                <option>Rust / Brown (old blood)</option>
                <option>Pink frothy (pulmonary oedema)</option>
                <option>Blood-stained (haemoptysis)</option>
              </select>
            </div>
            <div class="field">
              <label>Amount</label>
              <select id="sputum-amount">
                <option value="">— Select —</option>
                <option>Minimal (&lt;10 mL/day)</option>
                <option>Moderate (10&ndash;30 mL/day)</option>
                <option>Large (&gt;30 mL/day)</option>
              </select>
            </div>
            <div class="field">
              <label>Consistency</label>
              <select id="sputum-consistency">
                <option value="">— Select —</option>
                <option>Watery</option>
                <option>Loose</option>
                <option>Mucoid</option>
                <option>Thick</option>
                <option>Tenacious</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 11 CHEST EXPANSION — verbatim from cr.html s-palp -->
  <div class="card" id="s-palp">
    <div class="card-header"><span class="sec-num">11</span><h2>Chest Expansion</h2></div>
    <div class="card-body">
      <div class="fg">
        <div>
          <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:8px">Chest Expansion</div>
          <div class="fg c2">
            <div class="field"><label>Apical (anterior)</label><select id="exp-apical"><option value="">— Select —</option><option>Symmetrical</option><option>Asymmetrical</option></select></div>
            <div class="field"><label>Middle (anterior)</label><select id="exp-middle"><option value="">— Select —</option><option>Symmetrical</option><option>Asymmetrical</option></select></div>
            <div class="field"><label>Lower Costal (posterior)</label><select id="exp-lower"><option value="">— Select —</option><option>Symmetrical</option><option>Asymmetrical</option></select></div>
          </div>
        </div>
        <div>
          <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:8px">Chest Measurement — Thumb Displacement</div>
          <table class="mov-table" style="width:100%">
            <thead><tr><th>Level</th><th>Measurement</th><th>Status</th></tr></thead>
            <tbody>
              <tr>
                <td>Apical</td>
                <td><input type="text" id="meas-apical" placeholder="e.g. 2 cm" style="width:100%;border:none;background:transparent;font-size:12px;padding:2px 4px"></td>
                <td><select id="meas-apical-status" style="font-size:12px;width:100%;border:none;background:transparent;padding:2px 4px"><option value="">—</option><option>Assessed</option><option>Not assessed</option><option>KIV next visit</option></select></td>
              </tr>
              <tr>
                <td>Middle</td>
                <td><input type="text" id="meas-middle" placeholder="e.g. 3 cm" style="width:100%;border:none;background:transparent;font-size:12px;padding:2px 4px"></td>
                <td><select id="meas-middle-status" style="font-size:12px;width:100%;border:none;background:transparent;padding:2px 4px"><option value="">—</option><option>Assessed</option><option>Not assessed</option><option>KIV next visit</option></select></td>
              </tr>
              <tr>
                <td>Lower Costal</td>
                <td><input type="text" id="meas-lower" placeholder="e.g. 2.5 cm" style="width:100%;border:none;background:transparent;font-size:12px;padding:2px 4px"></td>
                <td><select id="meas-lower-status" style="font-size:12px;width:100%;border:none;background:transparent;padding:2px 4px"><option value="">—</option><option>Assessed</option><option>Not assessed</option><option>KIV next visit</option></select></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>

  <!-- 12 AUSCULTATION — verbatim from cr.html s-ausc (including lung-picker modal) -->
  <div class="card" id="s-ausc">
    <div class="card-header"><span class="sec-num">12</span><h2>Auscultation</h2></div>
    <div class="card-body">
      <div class="fg">
        <div class="fg c2">
          <div class="field">
            <label>Overall Lung Sounds</label>
            <select id="ausc-lungs">
              <option value="">— Select —</option>
              <option>Clear</option>
              <option>Crepitation</option>
              <option>Wheeze</option>
              <option>Reduced air entry</option>
              <option>Absent breath sounds</option>
            </select>
          </div>
          <div class="field">
            <label>Crepitation Grade</label>
            <select id="ausc-crep">
              <option value="">— N/A —</option>
              <option>Mild</option>
              <option>Moderate</option>
              <option>Coarse</option>
              <option>Rhonchi</option>
              <option>Mild — bilateral bases</option>
              <option>Moderate — bilateral</option>
              <option>Coarse — right lower zone</option>
              <option>Coarse — left lower zone</option>
            </select>
          </div>
          <div class="field" style="grid-column:span 2">
            <label>Air Entry</label>
            <select id="ausc-air">
              <option value="">— Select —</option>
              <option>Equal bilaterally</option>
              <option>Reduced right upper zone</option>
              <option>Reduced right middle zone</option>
              <option>Reduced right lower zone</option>
              <option>Reduced left upper zone</option>
              <option>Reduced left lower zone</option>
              <option>Reduced bilateral bases</option>
              <option>Absent right side</option>
              <option>Absent left side</option>
            </select>
          </div>
        </div>
        <div>
          <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:8px">Auscultation Map — click a zone to mark findings</div>
          <div class="body-chart-wrap">
            <div class="body-figures" style="justify-content:center">
              <div class="fig-wrap">
                <div class="fig-label">Anterior view (click to mark)</div>
                <svg id="lung-svg" width="220" height="200" viewBox="0 0 220 200" style="display:block;cursor:pointer;border-radius:8px;background:var(--bg)"></svg>
              </div>
            </div>
            <div class="chart-controls">
              <div class="list-header">
                <span>Zone Findings</span>
                <button class="btn-sm" onclick="LungChart.clearAll()">Clear all</button>
              </div>
              <div class="marker-list" id="lung-finding-list">
                <div class="empty-hint" id="lung-empty-hint">No findings marked</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Lung finding picker modal (identical to cr.html) -->
  <div id="lung-picker-backdrop" style="display:none;position:fixed;inset:0;z-index:1100;background:rgba(0,0,0,0.35);align-items:center;justify-content:center">
    <div style="background:var(--surface);border:1px solid var(--accent-mid);border-radius:var(--radius-lg);padding:16px;width:min(340px,90vw);box-shadow:0 8px 32px rgba(0,0,0,0.22)">
      <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center">
        <span id="lung-picker-title">Select Finding</span>
        <button onclick="document.getElementById('lung-picker-backdrop').style.display='none'" style="background:none;border:none;cursor:pointer;color:var(--text-faint);font-size:18px;line-height:1">&#x2715;</button>
      </div>
      <div id="lung-finding-sel" style="display:flex;flex-direction:column;gap:6px">
        <button data-finding="clear"   style="text-align:left;padding:8px 12px;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg);color:var(--text);cursor:pointer;font-size:12px;font-family:inherit;display:flex;align-items:center;gap:8px"><span style="width:10px;height:10px;border-radius:50%;background:#2a8a4a;display:inline-block;flex-shrink:0"></span>Clear</button>
        <button data-finding="crep"    style="text-align:left;padding:8px 12px;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg);color:var(--text);cursor:pointer;font-size:12px;font-family:inherit;display:flex;align-items:center;gap:8px"><span style="width:10px;height:10px;border-radius:50%;background:#c0392b;display:inline-block;flex-shrink:0"></span>Crepitation</button>
        <button data-finding="wheeze"  style="text-align:left;padding:8px 12px;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg);color:var(--text);cursor:pointer;font-size:12px;font-family:inherit;display:flex;align-items:center;gap:8px"><span style="width:10px;height:10px;border-radius:50%;background:#c87a00;display:inline-block;flex-shrink:0"></span>Wheeze</button>
        <button data-finding="reduced" style="text-align:left;padding:8px 12px;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg);color:var(--text);cursor:pointer;font-size:12px;font-family:inherit;display:flex;align-items:center;gap:8px"><span style="width:10px;height:10px;border-radius:50%;background:#4a7ac8;display:inline-block;flex-shrink:0"></span>Reduced air entry</button>
        <button data-finding="absent"  style="text-align:left;padding:8px 12px;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg);color:var(--text);cursor:pointer;font-size:12px;font-family:inherit;display:flex;align-items:center;gap:8px"><span style="width:10px;height:10px;border-radius:50%;background:#7b5ea7;display:inline-block;flex-shrink:0"></span>Absent</button>
      </div>
      <button id="lung-clear-zone" style="margin-top:10px;width:100%;padding:7px;border:1px dashed var(--border);border-radius:var(--radius);background:none;cursor:pointer;font-size:12px;color:var(--text-muted);font-family:inherit">Clear this zone</button>
    </div>
  </div>
  ```

- [ ] **Step 4.2: Append sections 13–19 to burn.html**

  Continue appending to `templates/forms/burn.html`:

  ```html
  <!-- 13 MOVEMENT (ROM) — 3-col add-row table, custom BurnMov in form_burn.js -->
  <div class="card" id="s-mov">
    <div class="card-header"><span class="sec-num">13</span><h2>Movement (ROM)</h2></div>
    <div class="card-body">
      <div class="fg" style="gap:20px">
        <div>
          <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:8px">Range of Motion</div>
          <div class="mov-table-wrap">
            <table class="mov-table">
              <thead>
                <tr>
                  <th style="min-width:180px">Joint</th>
                  <th style="min-width:100px">Active ROM</th>
                  <th style="min-width:100px">Passive ROM</th>
                  <th style="width:32px"></th>
                </tr>
              </thead>
              <tbody id="burn-mov-tbody"></tbody>
            </table>
          </div>
          <button class="mov-add-btn" id="burn-mov-add">+ Add row</button>
        </div>
      </div>
    </div>
  </div>

  <!-- 14 MOBILITY & AMBULATORY STATUS -->
  <div class="card" id="s-mob">
    <div class="card-header"><span class="sec-num">14</span><h2>Mobility &amp; Ambulatory Status</h2></div>
    <div class="card-body">
      <div class="fg c2">
        <div class="field">
          <label>Bed Mobility</label>
          <textarea id="mob-bed" placeholder="Rolling, sit-from-lying, bridging — independence level (Ind / Min A / Mod A / Max A / Dep)..." style="min-height:80px"></textarea>
        </div>
        <div class="field">
          <label>Transfer / ADL / Ambulation</label>
          <textarea id="mob-transfer" placeholder="Bed-chair transfer, hygiene, feeding, dressing, ambulation distance/aid..." style="min-height:80px"></textarea>
        </div>
      </div>
    </div>
  </div>

  <!-- 15 GAIT ANALYSIS -->
  <div class="card" id="s-gait">
    <div class="card-header"><span class="sec-num">15</span><h2>Gait Analysis</h2></div>
    <div class="card-body">
      <div class="fg">
        <div class="field">
          <label>Gait Notes</label>
          <textarea id="gait-notes" placeholder="Gait pattern, deviations, use of aid, distance toleranced, pain on weight-bearing..." style="min-height:72px"></textarea>
        </div>
      </div>
    </div>
  </div>

  <!-- 16 PT IMPRESSION -->
  <div class="card" id="s-impression">
    <div class="card-header"><span class="sec-num">16</span><h2>Physiotherapist&#39;s Impression</h2></div>
    <div class="card-body">
      <div class="fg">
        <div class="field">
          <label>PT Impression</label>
          <textarea id="plan-impression" placeholder="Problems by priority — respiratory, contracture risk, functional deficit..." style="min-height:95px"></textarea>
        </div>
      </div>
    </div>
  </div>

  <!-- 17 SHORT-TERM GOALS -->
  <div class="card" id="s-stg">
    <div class="card-header"><span class="sec-num">17</span><h2>Short Term Goals</h2></div>
    <div class="card-body">
      <div class="fg">
        <div class="field">
          <label>Short-Term Goals (STG)</label>
          <textarea id="plan-stg" placeholder="Goals within 1–2 weeks with time frame..."></textarea>
        </div>
      </div>
    </div>
  </div>

  <!-- 18 LONG-TERM GOALS -->
  <div class="card" id="s-ltg">
    <div class="card-header"><span class="sec-num">18</span><h2>Long Term Goals</h2></div>
    <div class="card-body">
      <div class="fg">
        <div class="field">
          <label>Long-Term Goals (LTG)</label>
          <textarea id="plan-ltg" placeholder="Functional rehabilitation goals, time frame..."></textarea>
        </div>
      </div>
    </div>
  </div>

  <!-- 19 PLAN OF TREATMENT -->
  <div class="card" id="s-plan">
    <div class="card-header"><span class="sec-num">19</span><h2>Plan of Treatment</h2></div>
    <div class="card-body">
      <div class="fg">
        <div class="field">
          <label>Plan of Treatment</label>
          <textarea id="plan-tx" placeholder="Modalities, exercises, chest PT, positioning, scar management, HEP, frequency..."></textarea>
        </div>
      </div>
    </div>
  </div>

  {% endblock %}

  {% block extra_js %}
  <script src="/static/js/bodychart.js"></script>
  <script src="/static/js/lungchart.js"></script>
  <script src="/static/js/form_burn.js"></script>
  <script>
  var BurnForm = {
    onToggle: function(selectId, detailId, showVals) {
      var val = document.getElementById(selectId).value;
      var det = document.getElementById(detailId);
      if (!det) return;
      det.style.display = (showVals.indexOf(val) !== -1) ? '' : 'none';
    }
  };

  document.addEventListener('DOMContentLoaded', function () {
    try { BodyChart.init(); } catch(e) { console.warn('BodyChart init error:', e); }
    try { LungChart.init(); } catch(e) { console.warn('LungChart init error:', e); }
    try { BurnMov.init(); } catch(e) { console.warn('BurnMov init error:', e); }

    ClinicalTemplates.addButton('plan-impression', 'BURN', 'impression');
    ClinicalTemplates.addButton('plan-stg',        'BURN', 'stg');
    ClinicalTemplates.addButton('plan-ltg',        'BURN', 'ltg');
    ClinicalTemplates.addButton('plan-tx',         'BURN', 'treatment');
  });
  </script>
  {% endblock %}
  ```

- [ ] **Step 4.3: Confirm section ID / sidebar nav parity**

  Run: `grep -o "id=\"s-[^\"]*\"" templates/forms/burn.html | sort`
  Run: `grep -o "Main.go('s-[^']*')" templates/forms/burn.html | sort`
  Expected: Both produce exactly 19 entries, all IDs match.

- [ ] **Step 4.4: Commit**

  ```bash
  git add templates/forms/burn.html
  git commit -m "feat(burn): add burn.html — 19-section form template"
  ```

---

## Task 5: form_burn.js

**Files:**
- Create: `static/js/form_burn.js`

- [ ] **Step 5.1: Create form_burn.js**

  Create `static/js/form_burn.js` with the full content below:

  ```js
  // form_burn.js — Burn assessment form logic
  // Depends on: form_base.js, bodychart.js, lungchart.js

  // ── BurnMov: private 3-col ROM mini-table ──────────────────────────
  var BurnMov = (function () {
    var _JOINTS = [
      'Neck', 'Shoulder', 'Elbow', 'Wrist', 'Fingers (MCP)',
      'Fingers (PIP)', 'Hip', 'Knee', 'Ankle', 'Toes (MTP)',
      'Other (specify)'
    ];

    var _rows    = [];
    var _counter = 0;

    function _render() {
      var tbody = document.getElementById('burn-mov-tbody');
      if (!tbody) return;
      if (!_rows.length) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-faint);font-style:italic;padding:16px;font-size:12px">No movements recorded — click Add Row</td></tr>';
        return;
      }
      tbody.innerHTML = _rows.map(function (r) {
        var opts = '<option value="">—</option>'
          + _JOINTS.map(function (j) {
              return '<option value="' + j + '"' + (r.joint === j ? ' selected' : '') + '>' + j + '</option>';
            }).join('');
        return '<tr data-rid="' + r.id + '">'
          + '<td><select class="mov-cell-input" data-field="joint" data-rid="' + r.id + '">' + opts + '</select></td>'
          + '<td><input type="text" class="mov-cell-input" data-field="active" data-rid="' + r.id + '" value="' + (r.active || '').replace(/"/g, '&quot;') + '" placeholder="e.g. 90°"></td>'
          + '<td><input type="text" class="mov-cell-input" data-field="passive" data-rid="' + r.id + '" value="' + (r.passive || '').replace(/"/g, '&quot;') + '" placeholder="e.g. 95°"></td>'
          + '<td><button class="mov-del-btn" onclick="BurnMov.deleteRow(' + r.id + ')">&#x2715;</button></td>'
          + '</tr>';
      }).join('');

      tbody.querySelectorAll('select, input').forEach(function (el) {
        el.addEventListener('change', _syncFromDOM);
        el.addEventListener('input',  _syncFromDOM);
      });
    }

    function _syncFromDOM() {
      var tbody = document.getElementById('burn-mov-tbody');
      if (!tbody) return;
      tbody.querySelectorAll('[data-rid][data-field]').forEach(function (el) {
        var rid   = parseInt(el.dataset.rid);
        var field = el.dataset.field;
        var row   = _rows.find(function (r) { return r.id === rid; });
        if (row && field) row[field] = el.value;
      });
    }

    function addRow(prefill) {
      var id = _counter++;
      _rows.push({
        id:      id,
        joint:   (prefill && prefill.joint)   || '',
        active:  (prefill && prefill.active)  || '',
        passive: (prefill && prefill.passive) || ''
      });
      _render();
    }

    function deleteRow(id) {
      _rows = _rows.filter(function (r) { return r.id !== id; });
      _render();
    }

    function getData() {
      _syncFromDOM();
      return _rows.map(function (r) {
        return { joint: r.joint, active: r.active, passive: r.passive };
      });
    }

    function loadData(data) {
      _rows    = [];
      _counter = 0;
      if (!data || !data.length) { _render(); return; }
      data.forEach(function (r) { addRow(r); });
    }

    function clear() {
      _rows    = [];
      _counter = 0;
      _render();
    }

    function init() {
      document.addEventListener('click', function (e) {
        if (e.target && e.target.id === 'burn-mov-add') {
          e.preventDefault();
          addRow();
        }
      });
      _render();
    }

    return { init: init, addRow: addRow, deleteRow: deleteRow, getData: getData, loadData: loadData, clear: clear };
  })();

  // ── Main form module ───────────────────────────────────────────────
  const FormBurn = (function () {

    var gv       = FormBase.gv;
    var sv       = FormBase.sv;
    var radio    = FormBase.radio;
    var setRadio = FormBase.setRadio;

    // ── Pain slider ──────────────────────────────────────────────────
    function setPain(id, v) {
      var n  = parseInt(v);
      var el = document.getElementById('pv-' + id);
      if (!el) return;
      el.textContent = n;
      el.className   = 'pain-val ' + (n <= 3 ? 'pv-low' : n <= 6 ? 'pv-mid' : 'pv-high');
    }

    // ── Toggle helper (populate side): split "Status — detail" string ─
    function _splitToggle(combined, selectId, detailId, showVals) {
      if (!combined) return;
      var parts = combined.split(' — ');
      var yn    = parts[0] || '';
      var det   = parts.slice(1).join(' — ') || '';
      sv(selectId, yn);
      if (det) {
        sv(detailId, det);
        var detEl = document.getElementById(detailId);
        if (detEl && showVals.indexOf(yn) !== -1) detEl.style.display = '';
      }
    }

    // ── Collect helper: build "Status — detail" string ───────────────
    function _toggleVal(statusId, detailId) {
      var st  = gv(statusId);
      var det = gv(detailId);
      return det ? st + ' — ' + det : st;
    }

    // ── collect() ────────────────────────────────────────────────────
    function collect(currentId) {
      return {
        id:         currentId,
        _form_type: 'BURN',
        meta:       { form: 'BURN', ref: 'fisio / b.pen. 5 / Pind. 2 / 2019', saved: new Date().toISOString() },
        patient:    FormBase.collectPatient(),

        diagnosis:  gv('diagnosis'),
        management: gv('dr-mgmt'),
        problem:    gv('pt-problem'),

        pain: { pre: gv('pain-pre'), post: gv('pain-post') },

        specialQuestions: {
          health:     gv('sq-health'),
          pmhx:       gv('sq-pmhx'),
          medication: gv('sq-med'),
          occupation: gv('sq-occ')
        },

        investigation: {
          wound_cs: _toggleVal('ix-wound-cs-status', 'ix-wound-cs-detail'),
          cxr:      _toggleVal('ix-cxr-status',      'ix-cxr-detail'),
          abg:      _toggleVal('ix-abg-status',       'ix-abg-detail')
        },

        history:         { current: gv('hx-current') },
        associatedInjury: gv('assoc-injury'),

        bodyChart: {
          markers: (typeof BodyChart !== 'undefined') ? BodyChart.getData() : [],
          notes:   gv('chart-notes')
        },
        tbsa: gv('tbsa'),

        respiratory: {
          observation:      gv('resp-obs'),
          ventilated:       _toggleVal('resp-vent-yn',        'resp-vent-detail'),
          o2:               _toggleVal('resp-o2-yn',          'resp-o2-detail'),
          breathing_pattern: gv('obs-breathing-pattern'),
          cough_type:       gv('cough-type'),
          cough_effect:     gv('cough-effect'),
          sputum: {
            colour:      gv('sputum-colour'),
            amount:      gv('sputum-amount'),
            consistency: gv('sputum-consistency')
          },
          hoarseness: _toggleVal('resp-hoarseness-yn', 'resp-hoarseness-detail')
        },

        palpation: {
          expansion: {
            apical:       gv('exp-apical'),
            middle:       gv('exp-middle'),
            lower_costal: gv('exp-lower')
          },
          measurement: {
            apical:              gv('meas-apical'),
            apical_status:       gv('meas-apical-status'),
            middle:              gv('meas-middle'),
            middle_status:       gv('meas-middle-status'),
            lower_costal:        gv('meas-lower'),
            lower_costal_status: gv('meas-lower-status')
          }
        },

        auscultation: {
          lungs:       gv('ausc-lungs'),
          crepitation: gv('ausc-crep'),
          air_entry:   gv('ausc-air'),
          lung_map:    (typeof LungChart !== 'undefined') ? LungChart.getData() : {}
        },

        movement: BurnMov.getData(),

        mobility: {
          bed:      gv('mob-bed'),
          transfer: gv('mob-transfer')
        },
        gait: gv('gait-notes'),

        plan: {
          impression: gv('plan-impression'),
          stg:        gv('plan-stg'),
          ltg:        gv('plan-ltg'),
          treatment:  gv('plan-tx')
        }
      };
    }

    // ── populate() ───────────────────────────────────────────────────
    function populate(d) {
      if (!d) return;

      FormBase.populatePatient(d.patient);
      sv('diagnosis',  d.diagnosis);
      sv('dr-mgmt',    d.management);
      sv('pt-problem', d.problem);

      if (d.pain) {
        var pre  = d.pain.pre  || 0;
        var post = d.pain.post || 0;
        document.getElementById('pain-pre').value  = pre;  setPain('pre',  pre);
        document.getElementById('pain-post').value = post; setPain('post', post);
      }

      if (d.specialQuestions) {
        var sq = d.specialQuestions;
        sv('sq-health', sq.health);
        sv('sq-pmhx',   sq.pmhx);
        sv('sq-med',    sq.medication);
        sv('sq-occ',    sq.occupation);
      }

      if (d.investigation) {
        var ix = d.investigation;
        _splitToggle(ix.wound_cs, 'ix-wound-cs-status', 'ix-wound-cs-detail', ['Available']);
        _splitToggle(ix.cxr,      'ix-cxr-status',      'ix-cxr-detail',      ['Available']);
        _splitToggle(ix.abg,      'ix-abg-status',       'ix-abg-detail',      ['Available']);
      }

      if (d.history)         sv('hx-current',   d.history.current);
      if (d.associatedInjury !== undefined) sv('assoc-injury', d.associatedInjury);

      if (d.bodyChart) {
        if (d.bodyChart.markers && typeof BodyChart !== 'undefined') BodyChart.loadData(d.bodyChart.markers);
        sv('chart-notes', d.bodyChart.notes);
      }
      sv('tbsa', d.tbsa);

      if (d.respiratory) {
        var resp = d.respiratory;
        sv('resp-obs',              resp.observation);
        _splitToggle(resp.ventilated,  'resp-vent-yn',        'resp-vent-detail',        ['Yes']);
        _splitToggle(resp.o2,          'resp-o2-yn',          'resp-o2-detail',          ['Yes']);
        sv('obs-breathing-pattern', resp.breathing_pattern);
        sv('cough-type',            resp.cough_type);
        sv('cough-effect',          resp.cough_effect);
        _splitToggle(resp.hoarseness,  'resp-hoarseness-yn',  'resp-hoarseness-detail',  ['Yes']);
        if (resp.sputum) {
          sv('sputum-colour',      resp.sputum.colour);
          sv('sputum-amount',      resp.sputum.amount);
          sv('sputum-consistency', resp.sputum.consistency);
        }
      }

      if (d.palpation) {
        var pal = d.palpation;
        if (pal.expansion) {
          sv('exp-apical', pal.expansion.apical);
          sv('exp-middle', pal.expansion.middle);
          sv('exp-lower',  pal.expansion.lower_costal);
        }
        if (pal.measurement) {
          var m = pal.measurement;
          sv('meas-apical',        m.apical);
          sv('meas-apical-status', m.apical_status);
          sv('meas-middle',        m.middle);
          sv('meas-middle-status', m.middle_status);
          sv('meas-lower',         m.lower_costal);
          sv('meas-lower-status',  m.lower_costal_status);
        }
      }

      if (d.auscultation) {
        var ausc = d.auscultation;
        sv('ausc-lungs', ausc.lungs);
        sv('ausc-crep',  ausc.crepitation);
        sv('ausc-air',   ausc.air_entry);
        if (ausc.lung_map && typeof LungChart !== 'undefined') LungChart.loadData(ausc.lung_map);
      }

      if (d.movement) BurnMov.loadData(d.movement);

      if (d.mobility) {
        sv('mob-bed',      d.mobility.bed);
        sv('mob-transfer', d.mobility.transfer);
      }
      sv('gait-notes', d.gait);

      if (d.plan) {
        sv('plan-impression', d.plan.impression);
        sv('plan-stg',        d.plan.stg);
        sv('plan-ltg',        d.plan.ltg);
        sv('plan-tx',         d.plan.treatment);
      }
    }

    // ── reset() ──────────────────────────────────────────────────────
    function reset() {
      var ids = [
        'diagnosis', 'dr-mgmt', 'pt-problem',
        'sq-health', 'sq-pmhx', 'sq-med', 'sq-occ',
        'hx-current', 'assoc-injury',
        'chart-notes', 'tbsa',
        'resp-obs', 'resp-vent-detail', 'resp-o2-detail',
        'obs-breathing-pattern', 'cough-type', 'cough-effect',
        'sputum-colour', 'sputum-amount', 'sputum-consistency',
        'resp-hoarseness-detail',
        'exp-apical', 'exp-middle', 'exp-lower',
        'meas-apical', 'meas-apical-status',
        'meas-middle', 'meas-middle-status',
        'meas-lower',  'meas-lower-status',
        'ausc-lungs', 'ausc-crep', 'ausc-air',
        'mob-bed', 'mob-transfer', 'gait-notes',
        'plan-impression', 'plan-stg', 'plan-ltg', 'plan-tx',
        'ix-wound-cs-status', 'ix-wound-cs-detail',
        'ix-cxr-status', 'ix-cxr-detail',
        'ix-abg-status', 'ix-abg-detail',
        'resp-vent-yn', 'resp-o2-yn', 'resp-hoarseness-yn'
      ];
      ids.forEach(function (id) {
        var el = document.getElementById(id);
        if (!el) return;
        if (el.tagName === 'SELECT') { el.value = ''; }
        else { el.value = ''; }
        el.style.display = '';
      });

      // Reset detail fields to hidden
      ['ix-wound-cs-detail','ix-cxr-detail','ix-abg-detail',
       'resp-vent-detail','resp-o2-detail','resp-hoarseness-detail'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.style.display = 'none';
      });

      // Reset VAS sliders
      var pre  = document.getElementById('pain-pre');
      var post = document.getElementById('pain-post');
      if (pre)  { pre.value  = 0; setPain('pre',  0); }
      if (post) { post.value = 0; setPain('post', 0); }

      if (typeof BodyChart !== 'undefined') BodyChart.clearAll();
      if (typeof LungChart  !== 'undefined') LungChart.clearAll();
      BurnMov.clear();
    }

    // ── window.Form contract delegates ───────────────────────────────
    function onPtTypeChange()   { FormBase.onPtTypeChange(); }
    function onNricInput(v)     { FormBase.onNricInput(v); }
    function onDobChange(v)     { FormBase.onDobChange(v); }

    var pub = {
      collect:         collect,
      populate:        populate,
      reset:           reset,
      setPain:         setPain,
      onPtTypeChange:  onPtTypeChange,
      onNricInput:     onNricInput,
      onDobChange:     onDobChange
    };

    window.ActiveForm = pub;
    window.Form       = pub;
    return pub;

  })();
  ```

- [ ] **Step 5.2: Syntax-check the file**

  Run: `node --check static/js/form_burn.js`
  Expected: no output (no syntax errors)

- [ ] **Step 5.3: Cross-reference collect() fields vs populate() fields**

  Manually scan: every key in collect()'s return object must have a matching populate() block. Check:
  - `diagnosis`, `management`, `problem` → `sv()` calls ✓
  - `pain.pre/post` → slider restore block ✓
  - `specialQuestions.*` → sq block ✓
  - `investigation.*` → `_splitToggle()` calls ✓
  - `history.current` → `sv('hx-current')` ✓
  - `associatedInjury` → `sv('assoc-injury')` ✓
  - `bodyChart.markers/notes` → BodyChart.loadData + sv ✓
  - `tbsa` → `sv('tbsa')` ✓
  - `respiratory.*` → resp block ✓
  - `palpation.*` → pal block ✓
  - `auscultation.*` → ausc block ✓
  - `movement` → `BurnMov.loadData()` ✓
  - `mobility.*` → sv calls ✓
  - `gait` → `sv('gait-notes')` ✓
  - `plan.*` → sv calls ✓

  If any field is missing from populate(), add it before proceeding.

- [ ] **Step 5.4: Commit**

  ```bash
  git add static/js/form_burn.js
  git commit -m "feat(burn): add form_burn.js — collect/populate/reset + BurnMov"
  ```

---

## Task 6: Clinical templates + episode.html tplMap

**Files:**
- Modify: `static/js/clinical_templates.js` (add BURN arrays + BURN_SOAP to TEMPLATES)
- Modify: `templates/episode.html` (add BURN to tplMap)

- [ ] **Step 6.1: Read the end of the TEMPLATES const in clinical_templates.js**

  Run: `grep -n "HAND\|TEMPLATES\|BURN" static/js/clinical_templates.js`
  Expected: TEMPLATES const exists; no BURN entry yet. Locate the closing `};` of the TEMPLATES object.

- [ ] **Step 6.2: Add BURN assessment templates + BURN_SOAP to TEMPLATES const**

  In `static/js/clinical_templates.js`, inside the `TEMPLATES` const (before its closing `};`), add after the last existing entry (e.g. after HAND):

  ```js
  BURN: {
    impression: [
      'Reduced chest expansion secondary to pain on inspiration, limiting thoracic mobility.',
      'Limited shoulder ROM secondary to scar tightness restricting overhead reach.',
      'Impaired hand function secondary to oedema and burn contracture.',
      'Decreased exercise tolerance secondary to pain and deconditioning.',
      'Risk of contracture across grafted areas secondary to reduced ROM.',
    ],
    stg: [
      'Improve lung expansion and reduce sputum retention within 2/7.',
      'Reduce oedema of affected limb within 1/52.',
      'Maintain available joint ROM to prevent contracture over 1/52.',
      'Improve pain tolerance during daily ROM exercises within 1/52.',
      'Mobilise out of bed with assistance as tolerated within 2/7.',
    ],
    ltg: [
      'Regain functional hand ROM for ADLs (feeding, dressing, hygiene) by [time frame].',
      'Achieve independent ambulation without aid by [time frame].',
      'Prevent hypertrophic scarring and contracture across grafted areas.',
      'Family able to carry out home exercise program independently by discharge.',
    ],
    treatment: [
      'Deep breathing exercises 5x hourly during waking hours for lung clearance.',
      'Active / active-assisted ROM all unaffected joints, 10 reps each, BD.',
      'Limb elevation and positioning to reduce oedema.',
      'Slow active stretching to end-range, 5-10s hold within pain-free range (post-graft, once taken).',
      'Scar management: pressure garment and moisturiser massage once healed.',
      'Patient education: skin care, sun protection, avoid tight clothing over grafted areas.',
    ],
  },
  ```

  Then, inside the `TEMPLATES` const (which holds SOAP dicts — note: this is the SAME `TEMPLATES` const, not the flat `templates` dict), add `BURN_SOAP` after the last existing SOAP dict (e.g. after `HAND_SOAP`):

  ```js
  BURN_SOAP: {
    subjective: [
      'Patient reports pain VAS [x]/10 at rest, [y]/10 on movement. Dressing change [date]. Tolerating positioning.',
      'Patient reports reduced exercise tolerance. Breathless on minimal exertion. Cough [productive/non-productive].',
      'Patient complains of stiffness in [joint] with reduced ability to [function].',
    ],
    objective: [
      'Obs: SpO2 [x]% on RA/[O2 delivery]. RR [x]/min. Temp [x]°C. Breath sounds [clear/reduced/crep].',
      'ROM: [joint] active [x]°, passive [x]°. TBSA [x]%. Wound [condition]. Oedema [present/absent].',
      'Chest expansion: apical [sym/asym], middle [sym/asym], lower costal [sym/asym].',
    ],
    analysis: [
      'Progressing as expected. ROM maintained. Wound healing adequately.',
      'Reduced chest expansion persists. High risk of sputum retention. Airway clearance prioritised.',
      'Contracture risk at [joint]. Stretching and positioning protocol reinforced.',
    ],
    plan: [
      'Continue ROM exercises BD. Review in [x] days. Escalate if ROM declines.',
      'Airway clearance techniques BD. Reassess chest expansion at next session.',
      'Commence pressure garment fitting once wound healed. Refer occupational therapy for splinting.',
    ],
  },
  ```

  **CRITICAL:** Verify placement — both `BURN` (assessment arrays) and `BURN_SOAP` (SOAP dict) go inside `const TEMPLATES = { ... }`, NOT in the flat `templates` dict below. Wrong dict = silent failure.

- [ ] **Step 6.3: Syntax-check clinical_templates.js**

  Run: `node --check static/js/clinical_templates.js`
  Expected: no output (no syntax errors)

- [ ] **Step 6.4: Add BURN to tplMap in episode.html**

  In `templates/episode.html` (~line 663), find:
  ```js
  var tplMap   = {
      'CR':          'CR_SOAP',
      'SPINE':       'SPINE_SOAP',
      'GERIATRIC':   'GERIATRIC_SOAP',
      'AMPUTATION':  'AMPUTATION_SOAP',
      'NEURO':       'NEURO_SOAP',
      'HAND':        'HAND_SOAP',
  };
  ```
  Replace with:
  ```js
  var tplMap   = {
      'CR':          'CR_SOAP',
      'SPINE':       'SPINE_SOAP',
      'GERIATRIC':   'GERIATRIC_SOAP',
      'AMPUTATION':  'AMPUTATION_SOAP',
      'NEURO':       'NEURO_SOAP',
      'HAND':        'HAND_SOAP',
      'BURN':        'BURN_SOAP',
  };
  ```

- [ ] **Step 6.5: Commit**

  ```bash
  git add static/js/clinical_templates.js templates/episode.html
  git commit -m "feat(burn): add clinical templates + BURN_SOAP + episode tplMap"
  ```

---

## Task 7: Smoke test

- [ ] **Step 7.1: Start Flask from worktree**

  Run from the worktree directory: `py app.py`
  Open browser to `http://localhost:5000`

- [ ] **Step 7.2: Verify BURN card is active in home.html**

  Navigate to home page. In the form picker, BURN card should:
  - Show flame icon &#128293;
  - Be selectable (no greyed "Soon" badge)
  - Highlight when clicked

- [ ] **Step 7.3: Open a patient and create a BURN episode**

  - Select a patient → New Episode → select BURN form → Open
  - Expected: BURN Assessment form loads with 19 sidebar nav entries, all 19 section cards visible

- [ ] **Step 7.4: Fill minimum required fields**

  - Patient Name + NRIC/date + Assessment Date
  - Diagnosis (required field)
  - Click Save Record

  Expected: success toast, no 422 error in Flask terminal

- [ ] **Step 7.5: Test reload round-trip**

  - Navigate away (Return) then re-open same episode
  - Expected: all saved fields repopulate correctly (text, VAS sliders, selects)

- [ ] **Step 7.6: Test body chart round-trip**

  - Click a burn depth chip (e.g. "Superficial (1°)")
  - Click anterior SVG figure to place a marker
  - Save → navigate away → return
  - Expected: marker reappears in correct location with correct colour

- [ ] **Step 7.7: Test investigation toggle**

  - In Investigation section, set Wound C&S to "Available"
  - Expected: detail textarea appears immediately
  - Set back to "Not done"
  - Expected: detail textarea hides

- [ ] **Step 7.8: Test movement table**

  - Click "+ Add row" in Movement section
  - Fill Joint, Active ROM, Passive ROM
  - Save → reload
  - Expected: row persists with correct values

- [ ] **Step 7.9: Test lung chart + auscultation**

  - Click a lung zone
  - Select a finding (e.g. Crepitation)
  - Save → reload
  - Expected: finding reappears on the lung diagram

- [ ] **Step 7.10: Test clinical templates**

  - Navigate to PT Impression section
  - Click the template button next to the textarea
  - Expected: BURN impression templates appear and can be inserted

- [ ] **Step 7.11: Test SOAP template in episode view**

  - From the BURN episode page, open SOAP note modal
  - Click a SOAP template button (Objective section)
  - Expected: BURN_SOAP templates appear (not MS templates)

- [ ] **Step 7.12: Final commit if all checks pass**

  ```bash
  git add -A
  git commit -m "chore(burn): smoke test pass — Pass 1 complete"
  ```

---

## Spec coverage check (self-review)

| Spec requirement | Task |
|---|---|
| FORM_REGISTRY ready=True | Task 1 |
| FORM_TEMPLATES dict entry | Task 1 |
| home.html card activation | Task 2 |
| home.html formLabel map | Task 2 |
| REQUIRED_FIELDS['BURN'] | Task 1 |
| burn.html 19 sections, sidebar nav | Tasks 3–4 |
| Section 01 Patient Info (verbatim ms.html) | Task 3 |
| Sections 02–08 text/select sections | Tasks 3–4 |
| Section 09 body chart + TBSA + burn depth chips | Task 3 |
| Burn depth chips reuse existing ptype keys (no new CSS) | Task 3 pre-flight + Task 3 |
| Section 10 Respiratory (from CR, trimmed) | Task 4 |
| Section 11 Chest Expansion (verbatim CR) | Task 4 |
| Section 12 Auscultation + lung chart (verbatim CR) | Task 4 |
| Section 13 Movement — 3-col add-row table | Task 4 |
| Sections 14–19 mobility/gait/impression/goals/plan | Task 4 |
| window.Form contract (collect/populate/reset/onPtTypeChange/onNricInput/onDobChange) | Task 5 |
| `_form_type: 'BURN'` AND `meta: { form: 'BURN' }` in collect() | Task 5 |
| Investigation toggle (status + conditional detail) | Tasks 3–4 + Task 5 |
| _splitToggle for populate | Task 5 |
| BurnMov 3-col ROM mini-table | Task 5 |
| BURN clinical assessment templates | Task 6 |
| BURN_SOAP in TEMPLATES const | Task 6 |
| episode.html tplMap entry | Task 6 |
| node --check syntax verification | Task 5 |
| Save + reload smoke test | Task 7 |

**Out of scope (Pass 2+):** `pdf_burn.py`, `_PDF_GENERATORS`, `_SINGLE_PDF_GENERATORS`, `pt_assessment.spec` datas entry, `_buildMpisBurn()` in main.js. Save will succeed; clicking "Export KKM PDF" will fall back to MS PDF (expected for Pass 1).
