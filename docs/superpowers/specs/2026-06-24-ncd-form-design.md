# NCD Form — Design Spec

**Date:** 2026-06-24
**Form:** NCD (Non-Communicable Disease Assessment) — Rehabilitation group
**KKM borang ref:** `fisio / b.pen. 17 / 2019` (preserve verbatim in PDF, KKM typos included)
**Status:** Design spec. NOT an implementation plan. Tomorrow's CC-Opus session writes the durable plan FROM this doc.
**Source docs:** `NCD.pdf` (2-page borang), `NCD 2026_compressed.pdf` (28-page Best Statement guide, MOH/P/FIS/27.25(HB)-e, 2026).

---

## 0. What makes NCD different (read this first)

Every other form in the app is a **snapshot**: one assessment record per episode, edited in place, exported to PDF/MPIS. NCD is a **series across visits** — a patient comes back repeatedly for weight-loss / metabolic management, and the clinical value is the **delta**: did weight, BMI, waist, fitness move since last time? A single snapshot throws away the one thing that makes NCD worth digitising.

So NCD has **two data layers** the other forms don't separate:

1. **Initial assessment** — the full form, filled ONCE at episode start. Saved as a `records` row exactly like every other form. PDF + MPIS export this, unchanged. (Subjective / Objective / Analysis / Plan structure — see §3.)
2. **Per-visit measurements** — the numeric battery (vital signs, body composition, fitness tests) captured EVERY visit (including the first), saved one row per visit in a **new `ncd_measurements` table**. This mirrors how `soap_notes` already works (auto-numbered `session_no`, queried as an ordered series). Entry happens INSIDE the SOAP modal (see §5).
3. **Trend screen** — a NEW screen-only page reading `ncd_measurements` for the episode, rendering an infographic-style trend table + sparklines. **It NEVER touches PDF or MPIS.** Those stay per-visit snapshots — axioms intact.

**The honest cost:** NCD is the only form that breaks the "one record per episode" mould. That's deliberate and justified, but it's where the build has the most NEW surface: a new table, new routes, a new page + breadcrumb, and an NCD-only panel injected into the SOAP modal. Everything else borrows existing patterns (bodychart.js, chip selectors, clinical_templates.js, the PDF Flowable-image pattern).

---

## 1. Decisions locked during brainstorm (the WHY behind each)

| # | Decision | Rationale |
|---|----------|-----------|
| D1 | Trend lives on a **separate screen-only page**, not in PDF/MPIS | Plain-text MPIS can't render a trend; forcing it into the locked export paths violates ship-crude. The DB already holds the data — a read-only viewer is the light path. |
| D2 | Per-visit numbers → **new `ncd_measurements` table**, NOT inside soap_notes | Numbers stay numbers (trivially plottable). Stuffing them in SOAP `objective` free-text means parsing them back out to plot — fragile. |
| D3 | Per-visit entry point = **inside the SOAP modal** (episode.html), NCD-only | The SOAP note is the per-visit thing the therapist already opens every visit. Gating measurement entry behind it prevents an "itchy-hand" user logging measurements for a never-assessed patient (no stray button outside the natural flow). |
| D4 | Body **shape** = figure-card single-select using **7 traced PNGs**, captured **once at initial** | WYSIWYG: what's picked on screen must match what prints in PDF. Both surfaces embed the SAME PNG. A shape is a body-habitus archetype — it barely changes visit-to-visit, so once-at-initial. |
| D5 | Body **chart** (pain/complaint location) = **borrow `bodychart.js` unchanged** like MS, captured **once at initial** | Borrow-first axiom. It's the same MS-style mark-a-spot chart already on 5 forms. |
| D6 | Body composition segmental grid = **full borang grid, but everything optional** | 12–15 patients/day means nothing beyond bare-minimum can be mandatory. First visit is assessment + warm-up, not a full battery. Show everything, require almost nothing, let the therapist skip via NT/N-A stamp. |
| D7 | Trend sparklines = **headline set** (weight, BMI, waist, W/H, visceral fat, 6-min walk, hand grip) | The metrics that actually move and matter clinically. Engine plots all captured metrics; default surfaces the headline set (future polish can expose more). |
| D8 | Chips = **chip the obvious ones** (fixed-option fields + Yes/No), free-text stays free-text | Ship-crude. Borrows existing chip + NT/N-A stamp patterns. NOT the full FACIAL-pilot "clickfest" (deferred per BACKLOG until FACIAL proves it). |
| D9 | Templates = **all 5 narrative fields** get template pickers, pulled verbatim from Best Statement doc | PT Impression, Patient's Goal, STG, LTG, Plan of Treatment. Doc has real statements for all 5. Plus a SOAP variant per the SOAPIER canon. |
| D10 | Trend page initial build = **infographic style, modular** | Enables future UIX passes without refactor. M3 conventions (DESIGN_SYSTEM.md heritage). |

---

## 2. Field transcription (verbatim from borang)

Per FORM_PIPELINE step 1 (TRANSCRIBE). Preserve KKM wording/typos. `[chip]` `[text]` `[number]` `[derived]` `[stamp-able]` = classification (step 2 CLASSIFY).

**Page 1 — intake + objective measures:**

- Name `[text]`, Age `[derived from NRIC]`, Sex M/F `[derived]`, RN/IC `[text]`, Date `[text]`
- **Doctor's Diagnosis** `[text]`
- **Patient's Complaint** `[text]`
- **Special Question:**
  - Marital Status: Single / Married / Widowed / Divorced `[chip, single-select]`
  - Occupation `[text]`
  - Recreation `[text]`
  - PMHx/Surgery `[text]`
  - Family Hx `[text]`
  - Medication `[text]`
- **Lifestyle** (YES / NO + Comment each) `[chip Yes/No + text comment]`:
  - Smoking, Alcohol, Physically Active
- **Body Chart** — anterior + posterior figure, Right/Left labelled. Mark pain/complaint location. `[bodychart.js]`
- **Body Shape** — 7 archetype figures, pick one `[figure-card single-select]`:
  1. The Inverted Triangle  2. The Lean Column  3. The Rectangle  4. The Apple  5. The Pear  6. The Neat Hour Glass  7. The Full Hour Glass
- **Current History / Past History** `[text]`
- **Vital Sign:** HR `/min`, RR `/min`, BP `mmHg`, SpO2 `%` — all `[number]`
- **Blood Investigation:** FBS `mmol/L`, HbA1C `%`, Cholesterol `mmol/L`, LDL `mmol/L`, HDL `mmol/L`, Triglycerides `mmol/L` — all `[number]`
- **Body Composition:**
  - Height `cm` `[number]`, Weight `kg` `[number]`, BMI `[derived: kg/(m²)]`, Waist `cm` `[number]`, Hip `cm` `[number]`, Waist/Hip ratio `[derived: waist/hip]`
  - Segmental (borang lists, all optional): Subcutaneous Fat % and Skeletal Muscle % for **Whole body / Trunk / Arm / Leg**; Visceral Fat; Resting Metabolic `Kcal`
  - Borang note (preserve): *"* *for patient below 18 yo please refer Z score"*

**Page 2 — fitness battery + analysis/plan:**

- **Fitness Test (Choose the applicable)** — all `[number]`, all optional:
  - Cardiovascular Endurance:
    - 6 minute walk test: RPE `(score) *Modified Borg scale`, BP `mmHg`, HR `/min` + Comment `[text]`
    - 3 minute step test: HR `/min` + Comment `[text]`
  - Flexibility Test: Sit and Reach `cm` + Comment `[text]`
  - Strength Test — Upper Limb: Hand Grip `kg`, Sit Up `/min`, Max Push up `/rep` + Comment `[text]`
  - Strength Test — Lower Limb: Sit to Stand `/rep` + Comment `[text]`
  - Balance Test: Stork balance `seconds` + Comment `[text]`
- **Observation / Physical Examination** `[text]`
- **Physiotherapist's Impression** `[text + template picker]`
- **Patient's Goal** `[text + template picker]`
- **Short Term Goals** `[text + template picker]`
- **Long Term Goals** `[text + template picker]`
- **Plan of Treatment** `[text + template picker]`
- Footer: Attending Physiotherapist, Date, Sign & Stamp `[sign_chop_block in PDF]`

---

## 3. Section structure (SOAPIER flow) — initial assessment form

Per FORM_PIPELINE step 3 (SEQUENCE): regroup paper order into clinical SOAP flow, NOT borang print order. This is the section list + sidebar nav. Each section is a `.card` with `.sec-num` (DESIGN_SYSTEM.md primitives — non-negotiable). Patient card copied from **ms.html** (NOT neuro.html — it's missing required IDs, see WORKFLOW Anti-Repeat).

| # | Section (`s-id`) | SOAP | Contents |
|---|------------------|------|----------|
| 01 | Patient | — | Patient card from ms.html (NRIC derive → DOB/age/sex, assessment date) |
| 02 | Subjective | S | Doctor's Diagnosis, Patient's Complaint, Special Question (marital chip + occupation/recreation/PMHx/family/medication text), Lifestyle (smoking/alcohol/active Yes-No chips + comments), Current/Past History |
| 03 | Body Chart & Shape | O | bodychart.js (pain location) + 7-figure body-shape picker. Both once-at-initial. |
| 04 | Vital Signs & Bloods | O | HR/RR/BP/SpO2 + FBS/HbA1c/Chol/LDL/HDL/TG |
| 05 | Body Composition | O | Height/Weight/BMI(derived)/Waist/Hip/WHR(derived) + optional segmental grid + visceral + RMR |
| 06 | Fitness Tests | O | 6-min walk, 3-min step, sit-and-reach, hand grip/sit-up/push-up, sit-to-stand, stork balance. All optional. |
| 07 | Observation / Physical Exam | O | Free-text |
| 08 | PT Impression | A | Text + template picker |
| 09 | Goals & Plan | P | Patient's Goal, STG, LTG, Plan of Treatment — each text + template picker |

> **Note on Objective duplication:** ONLY sections 04 (Vital Signs & Bloods), 05 (Body Composition), and 06 (Fitness Tests) are the per-visit recurring battery — these appear BOTH in the initial assessment AND in the per-visit measurements panel (§5), as the SAME field set. Section 03 (Body Chart & Shape) and 07 (Observation) are **initial-only** — they do NOT go in the per-visit panel and do NOT ride the trend. (Body chart/shape captured once at initial per D4/D5.) The initial form's capture writes the FIRST `ncd_measurements` row (session_no=1) in addition to the assessment record. Subsequent visits add rows via the SOAP modal. Implementation detail for the plan: decide whether the initial form writes the measurements row directly on save, or whether visit-1 measurements are entered through the same SOAP-modal panel. **Recommended: initial form save writes session_no=1 measurements row automatically** (one less manual step on the busy first visit), then visits 2+ use the SOAP-modal panel.

---

## 4. The four brainstorm targets — resolved designs

### 4.1 Reduce typing (chips / GUI) — D8

Borrow existing patterns ONLY. No new chip infrastructure.

- **Marital status** — chip single-select (Single/Married/Widowed/Divorced). Reuse `.irr-chip` pattern. **CRITICAL (WORKFLOW Anti-Repeat):** `.irr-chip` only has `.sel-High/Medium/Low` CSS in style.css. New `.sel-<Value>` classes (`.sel-Single` etc.) must be defined FORM-LOCALLY in the form's `<style>` block — `style.css` is axiom-protected, do NOT touch it. Verify the selected state actually paints in smoke-test.
- **Lifestyle Yes/No** — Yes/No chip pair per item (smoking/alcohol/active) + a text comment field beside each. Same `.sel-Yes`/`.sel-No` form-local CSS rule.
- **NT / N-A stamp** — for skip-fast on optional numeric blocks (body comp segmental, fitness tests). Borrow the stamp pattern from the assessment_grid factory / SCI form if the layout fits; otherwise per-field "—" default. Skipped fields must serialise as ABSENT, not empty-string-rendered, in PDF (see DESIGN_SYSTEM-pdf `_has_data` guard).
- **Derived (zero-typing):** BMI auto-computes from height+weight; Waist/Hip ratio auto-computes from waist+hip. Display as `.derived-badge` style readouts (DESIGN_SYSTEM §6). Recompute on input.

### 4.2 Table implementation — per-visit measurements + trend

Two tables, different jobs:

**(a) Per-visit measurements entry** — grouped numeric panel (Vital Signs / Body Composition / Fitness Tests). Lives in the SOAP modal (§5). All optional. BMI + W/H derived (disabled inputs, auto-filled). Layout: `.fg` grids, grouped by sub-heading. NOT a dynamic add-row table — it's a fixed-field panel (one set of fields = one visit's row).

**(b) Trend table (the new screen)** — see §6.

### 4.3 Template extraction from Best Statement doc — D9

Source: `NCD 2026_compressed.pdf`, the DATA / STATEMENT / KNOWLEDGE / SKILL tables (pages 14–23). The **STATEMENT column** carries the example clinical phrasings. Extract VERBATIM into `clinical_templates.js`.

> **WORKFLOW Anti-Repeat rule:** template arrays must be discrete SMART statements (one per array entry, each Specific/Measurable/Achievable/Realistic/Time-bound). The doc's STATEMENT column is already written this way — use it, but verify each entry is a complete standalone statement, not a category header.

Real examples pulled from the doc (the plan should transcribe the full set per field):

- **PT Impression:** "Pain in the right knee due to osteoarthritis." · "Reduced range of motion in the right knee due to pain." · "Muscle weakness in the right quadriceps due to reduced activity." · "Impaired balance and gait due to muscle weakness."
- **Patient's Goal:** "Return to work as a shopkeeper within 3 months." · "Walk independently without an assistive device for daily activities." · "Perform recreational activities, such as gardening, without knee pain."
- **Short Term Goals:** "Reduce right knee pain from 7 to 4 on the VAS within 2 weeks." · "Achieve 10° improvement in right knee flexion and extension within 2 weeks." · "Increase quadriceps strength from 3/5 to 4/5 within 3 weeks." · "Improve standing balance to maintain 20 seconds on a single leg within 3 weeks." · "Ambulate 10 meters with minimal assistance using a walking frame within 3 weeks."
- **Long Term Goals:** "Achieve pain-free functional independence for daily activities within 3-6 months." · "Restore full range of motion and flexibility in the affected joint within 6 months." · "Strengthen affected muscles to 5/5 grade and improve endurance for sustained physical activity within 6 months." · "Improve walking distance to 500 meters without assistive devices within 6 months." · "Maintain an active lifestyle with regular physical activity to reduce the recurrence risk of the condition within 12 months."
- **Plan of Treatment:** "Explanation and assurance to the patient" · "Patient and carer education" · "Pain management" · "Posture" · "Mobilising exercise" · "Strengthening exercise" · "Balance training" · "Ambulation" · "Functional exercise" (borang note: *"In sequence"*)

**Wiring (CRITICAL — WORKFLOW Anti-Repeat):** Templates register under `TEMPLATES.NCD = { impression:[...], goal:[...], stg:[...], ltg:[...], treatment:[...] }` (the `const TEMPLATES` at top of the clinical_templates.js IIFE), NOT the flat lowercase `templates` dict (which silently falls through to `[]`). SOAP variant under `TEMPLATES.NCD_SOAP = { subjective:[...], objective:[...], analysis:[...], plan:[...] }`. Add SOAP key to `tplMap` in `showSoapTemplate()` in episode.html. **Also wire the `addButton` calls in ncd.html** — FACIAL shipped with templates that didn't fire because the HTML button wiring was missing (BACKLOG). Click-test every template button in smoke-test.

### 4.4 Body chart + body shape — D4, D5

**Body chart (pain location):** borrow `bodychart.js` UNCHANGED. Mirror ms.html exactly:
- bodychart.js is loaded globally by base.html — do NOT add a `<script src>` for it in the form (re-executes IIFE → `const COLORS` redeclare SyntaxError, WORKFLOW Anti-Repeat).
- Call `BodyChart.init()` in DOMContentLoaded only.
- Store as `bodyChart: { markers: [...], notes: str }` (camelCase — `body_chart` snake_case silently renders empty, WORKFLOW Anti-Repeat).
- API: `BodyChart.getData()` / `loadData(arr)` / `clearAll()`. No `.collect()`/`.populate()`.

**Body shape (7 figures):** figure-card single-select. Assets ALREADY EXTRACTED this session — see §7.
- 7 traced PNGs at `static/img/ncd_shapes/ncd_shape_{1-7}_{name}.png`.
- Both screen AND PDF embed the SAME PNG (WYSIWYG — D4).
- Screen: figure cards in a grid (`repeat(auto-fit, minmax(...))`), selected state = border/bg accent (form-local CSS).
- Store as a single string value, e.g. `bodyShape: "The Apple"` — serialises directly to MPIS plain text.
- PDF: embed the selected figure's PNG via the existing Flowable-image pattern (cf. how BodyChartFlowable / image embedding works in pdf_base.py). ReportLab does NOT render SVG — PNG is why D4 chose raster.

---

## 5. Per-visit measurements — data model + SOAP-modal injection (D2, D3)

This is the heart of NCD and the part with the most new surface. Read carefully.

### 5.1 New table `ncd_measurements`

Mirror the `soap_notes` pattern (auto-numbered per visit, queried as ordered series). Add via a **`PRAGMA user_version` migration gate** (current version is 2 → add v3; WORKFLOW Anti-Repeat: no blind ALTER-and-swallow, use version gates). Suggested shape — confirm columns-vs-JSON in the plan:

```
CREATE TABLE IF NOT EXISTS ncd_measurements (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    episode_id   INTEGER NOT NULL,
    session_no   INTEGER NOT NULL DEFAULT 1,
    note_date    TEXT    NOT NULL,
    data_json    TEXT    NOT NULL,   -- the numeric battery as JSON (vitals/bodycomp/fitness)
    created_at   TEXT    NOT NULL,
    updated_at   TEXT    NOT NULL,
    FOREIGN KEY (episode_id) REFERENCES episodes(id)
)
```

> **Columns vs JSON blob — plan decision.** JSON blob (above) is the lighter mirror of how `records.data_json` already works and keeps the schema stable if the battery changes. Trade-off: trend queries must `json_extract()` or parse in Python rather than `SELECT` columns. Given the battery is fixed-ish and the trend reads the whole series anyway (then computes deltas in Python/JS), **JSON blob recommended.** The plan may choose typed columns if it prefers SQL-side aggregation — either works; this is a CC technical call, not a clinical one.

### 5.2 DB functions (mirror soap_notes functions)

- `save_ncd_measurement(db_path, episode_id, data)` — auto-number `session_no = MAX+1` on insert, update-in-place if `id` present. Bump `episodes.updated_at`. (Copy the shape of `save_soap`.)
- `get_ncd_measurements(db_path, episode_id)` — `WHERE episode_id=? ORDER BY session_no ASC`. Returns the full ordered series for the trend page. (Copy `get_soap_notes`.)
- `delete_ncd_measurement(db_path, id)` — mirror `delete_soap`.
- Cascade: add `DELETE FROM ncd_measurements WHERE episode_id=?` to `delete_patient`'s episode-cleanup loop (currently deletes soap_notes + records + audit_log — add measurements alongside).

### 5.3 SOAP-modal injection (the "injection" Miruya flagged)

The measurements panel is injected into the **existing SOAP modal in episode.html**, NCD-only, guarded by episode form_type. It is NOT data inside `soap_notes` — it's a separate panel in the same modal UI, saving to `ncd_measurements`.

- **Guard:** the panel renders ONLY when the episode's `form_type === 'NCD'`. On all other forms the SOAP modal is unchanged. Use a form-type check, mirror the null-guard discipline (`onPtTypeChange` uses null-guarded `set()`, WORKFLOW JS Rules).
- **Save flow:** when the therapist saves a SOAP note on an NCD episode, the modal saves BOTH the soap_note (existing path) AND the measurements row (new path). Two writes, one click. Decide in the plan whether one combined endpoint or two sequential fetches — recommend two fetches reusing the existing `save_soap` route untouched + a new `save_ncd_measurement` route, so the SOAP path is not modified (lower risk to the shared SOAP code).
- **Load flow:** opening an existing SOAP note on an NCD episode pre-fills the matching measurements row (match by session_no or by FK to the soap note — plan decision; session_no alignment is simplest since both auto-number per visit).
- **Why this entry point (D3):** prevents an out-of-flow "add measurements" button that could let a user log measurements for a never-assessed patient. The SOAP note is the natural per-visit gate.

> **CONCERN FLAG (Miruya raised SOAP injection as a worry):** episode.html's SOAP modal is shared by ALL forms. The injection MUST be additive and form-type-guarded — do not refactor the shared SOAP modal structure. If the NCD panel needs markup that doesn't fit additively, flag it rather than restructuring the modal (ship-crude + no-refactor-shared-code axiom). Smoke-test that a NON-NCD form's SOAP modal is byte-for-byte behaviourally unchanged after the injection lands.

---

## 6. Trend screen — new page + breadcrumb (D1, D7, D10)

A NEW screen-only page. Reads `get_ncd_measurements(episode_id)`, renders an infographic trend view. **Does not touch PDF or MPIS.**

- **Route:** new Flask route, e.g. `GET /episodes/<id>/ncd-trend` → new template `templates/ncd_trend.html`. Plan confirms naming.
- **Breadcrumb:** add a breadcrumb/nav entry to reach it from the episode page (Miruya accepted "an extra breadcrumb HTML, fine for what it's worth"). E.g. on the NCD episode page, a "View Trend" link in the context bar. Mirror the neutral-topbar pattern (BACKLOG: all standalone pages use neutral M3 context bars, no accent topbars).
- **Content (infographic style, modular — D10):**
  - Trend table: rows = headline metrics (Weight, BMI, Waist, Waist/Hip, Visceral Fat, 6-min walk, Hand grip — D7), columns = visit dates, last column = inline sparkline.
  - Sparklines: small inline SVG polylines. Colour convention: improving = green (`c-teal`/success), gaining-capacity (fitness ↑) = blue (`c-blue`/info). Keep it modular so a future UIX pass can swap in richer charts without touching the data layer.
  - Engine plots ALL captured metrics internally; default view surfaces the headline set. Which to surface = future polish tweak, not a rebuild.
- **Modularity requirement:** separate the data-fetch/transform (episode series → per-metric arrays) from the render (table + sparkline HTML). The transform is stable; the render is the bit a future UIX pass rewrites. Don't entangle them.
- **Empty/sparse states:** 1 visit = no trend yet (show the single reading, "trend appears after the next visit"). Missing metric across some visits = gap in the line, not zero (don't plot blanks as 0 — clinically wrong).

---

## 7. Body-shape figure assets (D4) — ALREADY EXTRACTED

Done this session. 7 traced PNGs (white knocked transparent, traced from the borang archetype row so they carry the exact KKM look):

```
static/img/ncd_shapes/ncd_shape_1_inverted_triangle.png
static/img/ncd_shapes/ncd_shape_2_lean_column.png
static/img/ncd_shapes/ncd_shape_3_rectangle.png
static/img/ncd_shapes/ncd_shape_4_apple.png
static/img/ncd_shapes/ncd_shape_5_pear.png
static/img/ncd_shapes/ncd_shape_6_neat_hourglass.png
static/img/ncd_shapes/ncd_shape_7_full_hourglass.png
```

- **Known cleanup (minor, ~2 min):** figures 1 and 4 have a faint dark smudge at the top edge (leftover leg-bleed from the body-chart figure above them in the source row). Tighten the top crop before ship. Usable as-is for build; cosmetic.
- **Bundle into exe:** add `static/img/ncd_shapes/*.png` to `pt_assessment.spec` under `datas` (WORKFLOW: forgotten datas = silent failure in PyInstaller build).
- **Value stored** = the human name string (e.g. `"The Apple"`) so it serialises to MPIS plain text directly and maps to the filename for PDF embedding.

---

## 8. Wiring checklist (Miruya's #1 concern — registry-drift tax)

The bible documents this as the REGISTRY-DRIFT PATTERN: many hardcoded sites must be touched per new form, none driven by FORM_REGISTRY. Miss one = silent failure. The plan must hit EVERY site:

1. `FORM_REGISTRY` in app.py → set `ready=True`, add `pdf_episode` + `pdf_single` keys (the two PDF dicts derive automatically — do NOT hand-edit them).
2. `FORM_TEMPLATES` dict in app.py → `'NCD': 'forms/ncd.html'`.
3. `REQUIRED_FIELDS` in database.py → add NCD entry. Recommend minimal: `[('diagnosis', "Doctor's Diagnosis is required")]` (D6 — almost nothing mandatory). Confirm field key matches collect().
4. **home.html** picker grid → remove `soon`/"Soon", add `onclick="selectForm(this)"`, set icon. **AND** patient.html picker grid → same removals, handler is `onclick="selectEpForm(this)"` (different handler — both pickers independently hardcoded).
5. **formLabel display maps × 5 sites** (separate from picker grids): episode.html (×2 object literals), home.html (`FORM_LABELS` const ~1208 + inline map ~1922), patient.html (Jinja `form_labels` ~475). Verify: `grep -rn "MS:'Musculoskeletal'\|'MS':'Musculoskeletal'" templates/`. Add NCD to every hit. Parallel icon maps at same sites too.
6. `pdf_ncd.py` → add to `pt_assessment.spec` under `datas`.
7. `static/img/ncd_shapes/*.png` → add to `pt_assessment.spec` under `datas` (§7).
8. New: `ncd_measurements` table migration (v3 gate), DB functions (§5.2), Flask routes (save/get measurements + trend page), breadcrumb (§6).
9. clinical_templates.js → `TEMPLATES.NCD` + `TEMPLATES.NCD_SOAP`; `addButton` wiring in ncd.html; `tplMap` in episode.html showSoapTemplate().
10. MPIS builder `_buildMpisNcd()` in main.js + wire into `copyToMpisAuto()` switch (SOAPIER structure per WORKFLOW MPIS pattern; builder returns parts array, no copyText/await inside).
11. `node --check static/js/form_ncd.js` before packaging.

**window.Form contract (REQUIRED):** form_ncd.js must expose `window.Form` with `collect, populate, reset, onPtTypeChange, onNricInput, onDobChange`. `collect()` MUST return BOTH `_form_type: 'NCD'` AND `meta: { form: 'NCD' }`. Missing either = silent wrong PDF or 422 on save.

---

## 9. Build order (milestone ladder — FORM_PIPELINE)

```
form → polish → templates → PDF → polish → MPIS → polish → [measurements table + SOAP panel] → [trend page] → polish
```

The measurements table + SOAP panel + trend page are NCD-specific rungs ADDED after the standard ladder. Rationale: get the initial assessment form shipping like any other form first (it's the floor), then layer the series/trend machinery (the NCD-special part) on top. Each rung ships + smoke-tests before the next.

> Cross-form cut line: the initial assessment form (rungs 1–7) is a normal form build and could ship standalone as a working NCD snapshot form. The measurements/trend rungs (8–10) are the differentiator and could even be a SECOND spec→plan→build cycle if the plan wants to split them. Flag for the plan author: decide whether NCD ships as one plan or splits at the cut line.

---

## 10. Axiom compliance check

- ✅ Stack: Flask + SQLite + vanilla JS. No new deps. Trend sparklines = inline SVG, no chart lib.
- ✅ PDF: ReportLab only. Body-shape figures = PNG embed (ReportLab-native), not SVG.
- ✅ MPIS: plain-text. Body shape → name string. Trend NOT in MPIS (D1).
- ✅ Ship-crude: borrows bodychart.js, chip patterns, soap_notes pattern, clinical_templates.js. NO refactor of shared code. SOAP modal injection is additive + form-type-guarded.
- ✅ Clinical compliance: borang ref `fisio / b.pen. 17 / 2019` preserved. KKM wording/typos preserved. "PT Impression" not Diagnosis. Z-score note preserved.
- ✅ Topbar button order: unchanged (NCD form uses the standard topbar).
- ⚠️ ONE deliberate axiom stretch: NCD breaks "one record per episode" with the per-visit `ncd_measurements` series. Justified (D1) and isolated (new table, doesn't alter the records/episode model for other forms).

---

## 11. Open items for the plan author (NOT blockers)

- Columns-vs-JSON for `ncd_measurements` (§5.1) — recommend JSON blob.
- One combined save endpoint vs two fetches for SOAP+measurements (§5.3) — recommend two fetches (don't touch shared SOAP route).
- Whether initial form auto-writes session_no=1 measurements row, or visit-1 uses the SOAP panel (§3 note) — recommend auto-write on initial save.
- Whether NCD ships as one plan or splits at the cut line (§9) — plan author's call.
- Figure asset top-crop cleanup (§7) — cosmetic, do before ship.

---

*End of design spec. Next: tomorrow's CC-Opus session writes the durable implementation plan FROM this doc, cold.*
