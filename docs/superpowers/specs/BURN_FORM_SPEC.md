# BURN Form — Implementation Spec

KKM ref: `fisio / b.pen. 5 / Pind. 2 / 2019`
Group: Musculoskeletal · FORM_REGISTRY key: `BURN`
Source borang: Burn Assessment Form (single page, MSK + cardioresp fused)

This is a hand-off spec for Claude Code. Follow the WORKFLOW.md "Adding a new form" checklist. **Read CLAUDE.md, WORKFLOW.md, DESIGN_SYSTEM.md, and `templates/forms/ms.html` first.** This form is 100% assembly of existing components — nothing here is net-new machinery.

---

## 1. Scope decisions (already made — do not re-litigate)

- **TBSA = plain number field.** Copied from BHT (doctor calculates it). No Rule-of-9s auto-calc, no region summing.
- **Body chart = MS chart, relabelled.** Reuse the MS body-chart SVG + `bodychart.js` verbatim. Only change: marker-type chips become burn-depth chips (see §4, Section 09). Marker + note approach — NOT resizable/freehand shading.
- **Respiratory section = light-touch, kept for completeness.** Mirror CR's resp markup but it's rarely filled on ward burns. The PDF `_has_data()` guard skips empty tables, so blank resp on a typical patient renders nothing.
- **ROM/Movement = simple Joint / Active / Passive table.** Matches borang exactly. Simpler than MS's table (no Side/Resisted/Pain columns).
- **Lung chart = CR's `lungchart.js` verbatim.** Auscultation section.
- **Chest expansion = CR's verbatim.** Apical/Middle/Lower selects + thumb-displacement table.

---

## 2. Component reuse map

| Section | Reuses | New code? |
|---|---|---|
| Body chart + TBSA | MS body-chart SVG + `bodychart.js` | Relabel chips only |
| Respiratory | CR `s-obs` resp markup | Trim only |
| Chest expansion | CR `s-palp` markup | None |
| Auscultation + lung chart | CR `s-ausc` + `lungchart.js` | None |
| Movement ROM | MS `mov-table` pattern, trimmed to 3 cols | Trim only |
| Pain VAS | `.pain-score-box` recipe | None |
| All text/textarea sections | `.card` + `.fg` + `.field` | None |

If any section needs a CSS class not already in `style.css`, STOP and flag it — do not invent CSS (project axiom: no shared-CSS edits without explicit request).

---

## 3. Section order (matches clinical flow + borang reading order)

01 Patient Information (standard block — copy from ms.html verbatim)
02 Diagnosis & Doctor's Management
03 Problems
04 Pain Score
05 Special Questions
06 Investigation
07 Current History
08 Associated Injury / Precaution
09 Body Chart + TBSA + Depth
10 Respiratory Assessment
11 Chest Expansion
12 Auscultation
13 Movement (ROM)
14 Mobility & Ambulatory Status
15 Gait Analysis
16 Physiotherapist's Impression
17 Short Term Goals
18 Long Term Goals
19 Plan of Treatment

19 sections, but most are single text field / textarea. Heavy sections (09 body chart, 12 lung chart) are pre-built reuse.

---

## 4. Field-level spec

Field IDs use `gv(id)` collection. Keep ID naming consistent with existing forms.

**02 Diagnosis & Management** (`s-dx`)
- `diagnosis` — textarea, "As in referral"
- `dr-mgmt` — textarea, "Dressing type, escharotomy/fasciotomy, skin graft..."
- `pt-problem` — textarea, presenting complaint

**03 Pain Score** (`s-pain`)
- `pain-pre` / `pain-post` — VAS sliders (`.pain-score-box` recipe, `Form.setPain`)
- Borang notes "by observation of facial expression" — keep VAS, it covers it

**05 Special Questions** (`s-sq`) — all text inputs, `.fg c2`
- `sq-health` — General Health
- `sq-pmhx` — PMHx / Surgery (DM, HTN...)
- `sq-med` — Medication / Steroid (NSAIDs, corticosteroids)
- `sq-occ` — Occupation / Recreation

**06 Investigation** (`s-ix`) — HYBRID status dropdown + conditional detail text, `.fg c2`

Each of the three investigations is a free-form clinical finding copied from BHT, but availability is a repeating administrative state. Use the CR `_splitToggle` pattern: a status select + a detail text field that shows only when status = `Available`.

Per investigation, status options: `Not done` / `Available` / `KIV next visit`. Detail text holds the actual finding (free text, shown when `Available`).

- `ix-wound-cs-status` + `ix-wound-cs-detail` — Wound C&S (e.g. "MRSA face, Pseudomonas axilla, pen-sensitive")
- `ix-cxr-status` + `ix-cxr-detail` — CXR (lung inflation, mediastinal/trachea shift)
- `ix-abg-status` + `ix-abg-detail` — ABG (interpret from doctor's notes, e.g. "respiratory acidosis")

Wire each with `onchange` calling the toggle helper, showing detail on `['Available']` (mirror CR's `onToggle('id','detail-id',['Present'])` exactly). Collect as combined string via the same `gv` + join pattern CR uses for surgery/smoking/chest-drain — e.g. `"Available — MRSA face, Pseudomonas axilla"` or `"KIV next visit"`. Populate via `_splitToggle(combined, statusId, detailId, ['Available'])`.

**07 Current History** (`s-hx`)
- `hx-current` — textarea. Cause (thermal/chemical/electrical/radiation), date of burn, smoke presence

**08 Associated Injury / Precaution** (`s-assoc`)
- `assoc-injury` — textarea. Head/chest/abdo injury, fractures, SSG + tendon exposure precautions

**09 Body Chart + TBSA** (`s-chart`)
- Reuse MS body-chart SVG (anterior + posterior, `.hit` zones) + `.chart-controls`
- **Marker-type chips → burn depth** (replaces MS pain-type chips). Suggested chip set + classes:
  - `Superficial (1°)`
  - `Superficial partial (2°)`
  - `Deep partial (2°)`
  - `Full thickness (3°/4°)`
  - `Donor site`
  - `Grafted (SSG)`
- Collected as `bodyChart: { markers: [...], notes: gv('chart-notes') }`
- `chart-notes` textarea — "Circumferential, escharotomy done, ~% per region..."
- **`tbsa` — number input** (`TBSA ___%`), placed in this card. Copied from BHT.
- Depth classification text (`depth-class`) optional text field if marker chips don't cover it — but chips should suffice.
- NOTE: chip colours need CSS classes. If reusing `.pt-chip` pattern, check whether new `.ptype-*` style classes are needed. If they don't exist, FLAG — don't invent. May reuse existing colour classes.

**10 Respiratory Assessment** (`s-resp`) — mirror CR `s-obs`, trim
- `resp-obs` — textarea (pain/distress/conscious level)
- `resp-vent-yn` — select Y/N + `resp-vent-detail` (toggle pattern from CR `onToggle`)
- `resp-o2-yn` — select Y/N + `resp-o2-detail`
- `obs-breathing-pattern` — select (reuse CR option list)
- `cough-type` (Productive/Non-productive) + `cough-effect` (Effective/Ineffective) — selects
- Sputum: `sputum-colour` / `sputum-amount` / `sputum-consistency` — selects (reuse CR lists)
- `resp-hoarseness-yn` — select Y/N + detail

**11 Chest Expansion** (`s-palp`) — copy CR verbatim
- `exp-apical` / `exp-middle` / `exp-lower` — Symmetrical/Asymmetrical selects
- Thumb-displacement table: `meas-apical/-status`, `meas-middle/-status`, `meas-lower/-status`

**12 Auscultation** (`s-ausc`) — copy CR verbatim
- `ausc-lungs` / `ausc-crep` / `ausc-air` — selects (reuse CR lists)
- `#lung-svg` + `LungChart.init()` in extra_js
- Collected as `auscultation.lung_map = LungChart.getData()`

**13 Movement** (`s-mov`) — simple 3-col table
- Table: Joint | Active | Passive (no Side/Resisted/Pain columns)
- Either a `mov-table` with add-row, or fixed rows for common burn joints (shoulder/elbow/wrist/hand/neck/knee). Recommend add-row pattern (`MovementTable`-style) keyed minimal.
- Collected as `movement: [...]` array of `{joint, active, passive}`

**14 Mobility & Ambulatory** (`s-mob`) — textareas
- `mob-bed` — bed mobility (roll, sit-from-lying, bridging; independence level)
- `mob-transfer` — transfer/ADL/ambulation (bed-chair, hygiene, feed/dress, ambulate)

**15 Gait Analysis** (`s-gait`)
- `gait-notes` — textarea

**16 PT Impression** (`s-impression`)
- `plan-impression` — textarea. Problems by priority.

**17/18/19 Goals + Plan** (`s-goals`, `s-plan`)
- `plan-stg` — Short Term Goals textarea
- `plan-ltg` — Long Term Goals textarea
- `plan-tx` — Plan of Treatment textarea

---

## 5. collect() contract (form_burn.js)

```js
function collect() {
  return {
    _form_type: 'BURN',
    meta: { form: 'BURN', ref: 'fisio / b.pen. 5 / Pind. 2 / 2019' },
    patient: FormBase.collectPatient(),

    diagnosis:  gv('diagnosis'),
    management: gv('dr-mgmt'),
    problem:    gv('pt-problem'),

    pain: { pre: gv('pain-pre'), post: gv('pain-post') },

    specialQuestions: {
      health: gv('sq-health'), pmhx: gv('sq-pmhx'),
      medication: gv('sq-med'), occupation: gv('sq-occ')
    },

    investigation: {
      wound_cs: <toggle-combined: ix-wound-cs-status + detail>,
      cxr:      <toggle-combined: ix-cxr-status + detail>,
      abg:      <toggle-combined: ix-abg-status + detail>
    },

    history: { current: gv('hx-current') },
    associatedInjury: gv('assoc-injury'),

    bodyChart: { markers: BodyChart.getData(), notes: gv('chart-notes') },
    tbsa: gv('tbsa'),

    respiratory: {
      observation: gv('resp-obs'),
      ventilated: <toggle-combined gv>,
      o2: <toggle-combined gv>,
      breathing_pattern: gv('obs-breathing-pattern'),
      cough_type: gv('cough-type'), cough_effect: gv('cough-effect'),
      sputum: { colour: gv('sputum-colour'), amount: gv('sputum-amount'), consistency: gv('sputum-consistency') },
      hoarseness: <toggle-combined gv>
    },

    palpation: {
      expansion: { apical: gv('exp-apical'), middle: gv('exp-middle'), lower_costal: gv('exp-lower') },
      measurement: { apical: gv('meas-apical'), apical_status: gv('meas-apical-status'), /* middle, lower... */ }
    },

    auscultation: {
      lungs: gv('ausc-lungs'), crepitation: gv('ausc-crep'), air_entry: gv('ausc-air'),
      lung_map: (typeof LungChart !== 'undefined') ? LungChart.getData() : {}
    },

    movement: <MovementTable.collect() or row scrape>,

    mobility: { bed: gv('mob-bed'), transfer: gv('mob-transfer') },
    gait: gv('gait-notes'),

    plan: {
      impression: gv('plan-impression'),
      stg: gv('plan-stg'), ltg: gv('plan-ltg'), treatment: gv('plan-tx')
    }
  };
}
```

Use CR's `_splitToggle` helper pattern for the Y/N + detail toggles (ventilated, o2, hoarseness).

**CRITICAL (per WORKFLOW.md anti-repeat): every field in collect() MUST have a matching render block in BOTH `pdf_burn.py` AND `_buildMpisBurn()` in main.js.** Cross-reference all three before shipping. The `neuro.muscles` silent-drop bug happened twice — don't repeat it.

---

## 6. SMART templates (clinical_templates.js)

Author as discrete SMART statements (one per array entry), NOT vague category headers. Pulled/adapted from the Best Statement doc (pp.22–25). Register under `templates['BURN']` (single array per category) — NOT compound keys.

**impression** (problems by priority):
- "Reduced chest expansion secondary to pain on inspiration, limiting thoracic mobility."
- "Limited [joint] ROM secondary to [muscle/scar] tightness restricting [function]."
- "Impaired hand function secondary to oedema."
- "Decreased exercise tolerance secondary to pain."

**stg** (short-term, with time frame):
- "Improve lung expansion within 2/7."
- "Reduce oedema of affected limb within 1/52."
- "Maintain available joint ROM to prevent contracture over 1/52."
- "Improve pain tolerance during daily ROM exercises within 1/52."
- "Mobilise out of bed as tolerated within 2/7."

**ltg** (long-term):
- "Regain functional hand ROM for ADLs (feeding, dressing, hygiene) by [time frame]."
- "Achieve independent ambulation without aid by [time frame]."
- "Prevent hypertrophic scarring and contracture across grafted areas."
- "Family able to carry out home exercise program independently."

**treatment** (plan):
- "Deep breathing exercises 5x hourly during waking hours for lung clearance."
- "Active/active-assisted ROM all unaffected joints, 10 reps each, BD."
- "Limb elevation/positioning to reduce oedema."
- "Slow active stretching to end-range, 5–10s hold within pain-free range (post-graft, once taken)."
- "Scar management: pressure garment + moisturiser massage once healed."
- "Patient education: skin care, sun protection, avoid tight clothing."

Wire SOAP key `SOAP_BURN` into `TEMPLATES` const (not flat `templates`), and add to `tplMap` in episode.html `showSoapTemplate()`.

---

## 7. WORKFLOW.md checklist — BURN-specific notes

1. FORM_REGISTRY: flip `BURN` ready=True
1.5 **home.html episode modal card** — hardcoded, NOT driven by FORM_REGISTRY. Remove `soon` class + badge, add onclick, icon, formLabel + icon map entries. MANDATORY.
2. FORM_TEMPLATES dict in app.py: `'BURN': 'forms/burn.html'`
2.5 Read DESIGN_SYSTEM.md + ms.html before writing HTML
3. `templates/forms/burn.html` extends base.html — sidebar_nav (19 entries), content (19 cards)
4. `static/js/form_burn.js` — window.ActiveForm + window.Form, collect/populate/reset + onPtTypeChange/onNricInput/onDobChange
4.5 `REQUIRED_FIELDS['BURN']` in database.py — at minimum pt-name, pt-date, nric/passport, diagnosis
5. `pdf_burn.py` — generate_episode_pdf + generate_burn_pdf. KKM ref `fisio / b.pen. 5 / Pind. 2 / 2019`. Use `_has_data()` guard on every table.
6. `_PDF_GENERATORS` + `_SINGLE_PDF_GENERATORS` in app.py
7. **`pt_assessment.spec` datas: add `('pdf_burn.py', '.')`** — silent failure if forgotten
8. `_buildMpisBurn()` in main.js + wire into `copyToMpisAuto()` switch (BURN branch). No per-form wrapper.
9. clinical_templates.js — BURN arrays + SOAP_BURN
10. tplMap in episode.html
11. `node --check static/js/form_burn.js`
12. After large str_replace: grep function name, read whole function, check orphaned code
13. `build.bat` (now uses `py` launcher — v0.5.1 fix)

Scripts: extra_js loads `bodychart.js`, `lungchart.js`, `form_burn.js`, inits BodyChart + LungChart + movement table + ClinicalTemplates.addButton for impression/stg/ltg/treatment.

---

## 8. Resolved decisions (was open — now locked)

- **Movement table: add-row pattern** (not fixed rows). Cleaner, more professional. `MovementTable`-style with `+ Add row`, columns Joint / Active / Passive only.
- **Investigation: all three kept** (Wound C&S / CXR / ABG) — borang requires them. Implemented as hybrid status-dropdown + conditional detail (see §4 Section 06). Status covers the "not done / KIV next visit" ward reality without forcing free-text every time.
