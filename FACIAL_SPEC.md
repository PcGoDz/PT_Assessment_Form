# FACIAL_SPEC.md — Front-Half Design Spec

Front-half pipeline output for the FACIAL form (per FORM_PIPELINE.md). **No code in this doc** — this is the design artifact the build rungs work from. Produced 2026-06-14.

Source of truth: `facial.pdf` (the KKM borang, 2 pages) + `12. Facial (Done 1111)_compressed.pdf` (Best Statement + SOP, 25 pages, born-digital text layer).

KKM form ref (preserve EXACTLY in PDF header): **`fisio / b.pen. 7 / Pind. 2 / 2019`**
Best Statement doc ref: `MOH/P/FIS/27.25(HB)-e`

---

## Clinical framing

Facial palsy (Bell's, post-parotidectomy, etc.) is almost always **unilateral**. The borang grades one side only (single grade column). We record the affected side as DATA via an R/L toggle above the grid rather than burying it in prose. Best Statement worked examples are all right-sided Bell's palsy.

---

## STEP 1 — TRANSCRIBE (verbatim, typos preserved)

The borang is 2 pages. **Page 1 is the MSK-style intake skeleton** (field-for-field near-identical to the MS borang). **Page 2 is the facial-specific grading grid** — the only net-new clinical structure.

### Page 1 — header
- `KEMENTERIAN KESIHATAN MALAYSIA`
- `PHYSIOTHERAPY DEPARTMENT`
- `FACIAL ASSESSMENT FORM`
- Patient bar: `Name:` / `Age:` / `Sex: M / F` / `RN / IC:` / `Date:`

### Page 1 — LEFT column
- **DIAGNOSIS** (textbox)
- **DOCTOR'S MANAGEMENT** (textbox)
- **PROBLEM** (textbox)
- **PAIN SCORE** — grid with `Pre` / `Post` rows (two numeric cells)
- **Area :** (textbox)
- **Nature:** (textbox)
- **Agg:** (textbox)
- **Ease:** (textbox)
- **24 hrs:** (textbox)
- **Irritability: High / Medium / Low** (chip pick — 3 options)
- **SPECIAL QUESTION**
  - `General Health:`
  - `PMHX / Surgery:`
  - `Investigations :`
  - `Medication:`
  - `Occupation / Recreation:`
  - `Social History :`
  - `Hearing Aid / Pacemaker:  Y / N` (chip/toggle — Y/N)

### Page 1 — RIGHT column
- **CURRENT HISTORY** (textbox)
- **PAST HISTORY** (textbox)
- **OBSERVATION** (textbox)
- **PALPATION** (textbox)
- **SENSATION TEST** (textbox)

### Page 2 — MOVEMENT (MUSCLES) grid
Column headers: **POOR | FAIR | GOOD** (single grade per row).

**FACIAL** (15 rows — muscle names VERBATIM, including KKM typos):
1. Lift eyebrows,uplook surprised and wrinkle forehead (Frontalis)
2. Frown ,pull eyebrows down (Corrugator)
3. Close eyes (Orbicularis Oculi)
4. Open eyes (Levator Palpebrae Suprioris)
5. Wrinkle nose (Procerus)
6. Smile (Risorius and Zygomaticus Major)
7. Purse lips, whistle, say 'prunes', close mouth  (Orbicularis Oris)
8. Lift upper lip, show upper teeth (Levator Labii Superioris)
9. Push lower lip downwards, show lower teeth (Depressor Labii Inferioris)
10. Pull corners of month up, sneer (Levator Anguli Oris)
11. Push corners of month down, look sad (Depressor Anguli Oris)
12. Suck cheek in, pull in against tongue blade (Buccinator)
13. Bite (Masseter Temporalis)
14. Open month (Infrahyoid  & Suprahyoid)
15. Pull chin down (Platysma)

**TONGUE** (5 rows — verbatim):
1. Stick the tongue out straight
2. Stick the tongue out to left and right
3. Touch the nose with the tongue
4. Hump the tongue (push food back in the month preparing for swallowing)
5. Swallowing Difficulty

> **KKM typos preserved deliberately** (per bible — preserve KKM typos in PDFs):
> "uplook" (row 1), "Suprioris" (row 4, should be Superioris), "month" ×3 (rows 10/11/14, should be "mouth"), spacing oddities. These carry through verbatim to the HTML labels AND the PDF. Do NOT correct them.

### Page 2 — footer blocks
- **PHYSIOTHERAPIST'S IMPRESSION** (textbox)
- **SHORT TERM GOALS** (textbox)
- **LONG TERM GOALS** (textbox)
- **PLAN OF TREATMENT** (textbox)
- `Attending Physiotherapist: ....` / `Date:` / `Sign & Stamp` → standard `sign_chop_block()`

---

## STEP 2 — CLASSIFY (input type per field)

| Field | Input type | Notes |
|---|---|---|
| Diagnosis, Doctor's Management, Problem | textbox | freeform clinical narrative |
| Pain Score Pre / Post | number (VAS 0–10) | reuse MS pain block pattern |
| Area | textbox | freeform (pain location, may reference side) |
| Nature (pain type) | **multi-chip** (sharp / dull / pricking / throbbing / burning / numbness) + notes | SOP-enumerated. Multi — pain is often "dull + throbbing". |
| Aggravating | **multi-chip** (chewing / swallowing / drinking / speaking / facial expressions) + notes | SOP-enumerated common triggers. Multi. |
| Easing | **multi-chip** (moist heat / ice packs / medication / rest / self-relief) + notes | SOP-enumerated. Multi. |
| 24 hrs | **multi-chip** (AM / PM / Night) + notes | SOP: better/worse AM/PM/night. Multi (can span). |
| Irritability | **chip** (3 opts: High/Medium/Low) | single-select. DESIGN_SYSTEM chip rule: 3–6 categorical → chips. Reuse MS `.irr-chips` pattern (already exists). |
| Special Question fields (General Health … Social History) | textbox | freeform — kept as MS clone (deferred to full-clickfest project, see below) |
| Hearing Aid / Pacemaker | **chip/toggle** (Y/N) | 2-state |
| Current History, Past History, Observation, Palpation | textbox | freeform narrative |
| Sensation Test — Hot / Cold / Pin-prick | **chip set ×3** (Normal/Reduced/Absent each) + optional notes textbox | borang shows a blank box, but SOP names the 3 modalities → clickfest them. See clickfest rule below. |
| Movement grade (per row) | **dropdown** (Poor/Fair/Good) | via `assessment_grid.js` factory — see backbone |
| Affected side | **chip/toggle** (R/L) | single toggle above the grids |
| Impression, STG, LTG, Plan of Treatment | textbox | freeform; Best Statement templates feed these |

> **CLICKFEST RULE (design principle for this form, applies form-wide):** Any field with a concrete, finite set of answers → give the clinician a click target (chip / toggle / dropdown), NOT a textbox. Reserve textboxes for genuinely open narrative (Diagnosis, Problem, histories, Observation, Palpation, Impression, goals, plan). This is why Irritability, Hearing Aid/Pacemaker, Affected Side, movement grades, AND Sensation modalities are all click-to-fill. When the borang shows a blank box but the SOP enumerates the options (as with Sensation Test), prefer the enumerated clickfest version — it's a bible-blessed burden-reducer (template-what-repeats) and is MORE informative than the paper. The borang is the floor, not the ceiling.

---

## STEP 3 — SEQUENCE (SOAPIER order → section list)

The borang's two-column print layout is a printing artifact. Resequenced into clinical flow, FACIAL maps almost 1:1 onto MS's section structure (verified against `templates/forms/ms.html`). Deltas: **drop** Body Chart + Neurological Test (MS sections 04, 08 — not on the facial borang); **add** an explicit Sensation Test section (borang has it as its own block; MS folds sensation into neuro); **swap** the MSK Movement/ROM section for the two facial grading grids.

Proposed section list (clinical order, numbered per DESIGN_SYSTEM):

| # | Section (id) | Source | Borrow from |
|---|---|---|---|
| 01 | Patient Information (`s-patient`) | header | **clone ms.html lines 22–135** (has all required IDs incl. `pt-age`, `sex-field`) |
| 02 | Diagnosis & Doctor's Management (`s-dx`) | Diagnosis, Doctor's Mgmt, Problem | clone MS s-dx, +Problem field |
| 03 | Pain Assessment (`s-pain`) | Pain Score Pre/Post, Area, Nature, Agg, Ease, 24hrs, Irritability | clone MS s-pain base (VAS slider + single-select irr-chips for Irritability), BUT Nature/Agg/Ease/24hrs become **multi-chips** (Build Note #4), Area stays textbox |
| 04 | History (`s-hx`) | Current History, Past History | clone MS s-hx |
| 05 | Special Questions (`s-sq`) | General Health, PMHX/Surgery, Ix, Medication, Occupation/Rec, Social Hx, Hearing Aid/Pacemaker | clone MS s-sq, + Hearing Aid/Pacemaker Y/N toggle |
| 06 | Observation (`s-obs`) | Observation | clone MS s-obs |
| 07 | Palpation (`s-palp`) | Palpation | clone MS s-palp |
| 08 | Sensation Test (`s-sens`) | Sensation Test | NEW section — 3 modality chip sets (Hot/Cold/Pin-prick) + notes textbox. NOT a blank box (clickfest). |
| 09 | Movement Assessment (`s-mov`) | Page-2 grids + affected-side toggle | **2× `assessment_grid.js` + R/L chip** |
| 10 | PT Impression & Treatment Plan (`s-plan`) | Impression, STG, LTG, Plan of Treatment | clone MS s-plan |

(Numbering may shift ±1 during build; clinical order holds.)

---

## STEP 4 — BACKBONE (heavy structural pieces)

ZERO genuinely net-new components — both heavy pieces are borrows: (1) the **facial movement grading grids** (config off `assessment_grid.js`, no new code), and (2) the **multi-select chips** for chipified intake (borrow NEURO's existing `.chip-group` CSS + 3 JS helpers, copied locally — see Build Note #4; the original "net-new" claim was corrected). Everything else is intake textboxes + single-select chips already living in MS. This form is pure borrow — the cheapest of the lot.

- **No body chart** (facial borang has none — the Best Statement mentions a "face chart" for pain location, but the borang itself does not include one; do NOT invent it).
- **No lung/hand chart.**
- **Two fixed-row grading grids:** FACIAL (15 rows) + TONGUE (5 rows), each single-column Poor/Fair/Good dropdown.
- **One R/L affected-side toggle** above the grids.

---

## STEP 5 — LIGHTEST IMPLEMENTATION (borrow-first)

**The grids are a direct borrow of `assessment_grid.js`** — verified against the real code (not assumed):
- `columns` is a free array → single-column config works, no multi-column assumption (SCI's 9 grids don't force shape).
- Cells default to `<select>` when `c.type !== 'text'` → **the factory IS a dropdown-per-row**, which is the natural input for Poor/Fair/Good. No net-new layout.
- `stampBlanks(value)` fills only blank cells, skips already-set rows → the speed trick: stamp "Poor" once on a fresh palsy, then bump the 3–4 Fair/Good rows. Same dividend SCI got.
- `getData()` / `loadData()` / `clear()` round-trip already built.

**Two grids, not one** — the factory builds a single flat table with no mid-table section header. The borang splits FACIAL / TONGUE with sub-headers, and clinically they're two different assessments. So: two `create()` calls, two cards, two independent stamps. Matches the borang flow.

Grid config (illustrative, not final code):
```js
// FACIAL grid
AssessmentGrid.create({
  containerId: 'facial-mov-grid',
  rows: [ /* 15 facial movement labels, verbatim w/ typos */ ],
  columns: [{ id: 'grade', label: 'Grade', type: 'dropdown', options: ['Poor','Fair','Good'] }]
});
// TONGUE grid — separate instance
AssessmentGrid.create({
  containerId: 'tongue-mov-grid',
  rows: [ /* 5 tongue labels, verbatim */ ],
  columns: [{ id: 'grade', label: 'Grade', type: 'dropdown', options: ['Poor','Fair','Good'] }]
});
```

Affected-side toggle: reuse the MS chip pattern (`.irr-chips` → `.sel-<Value>`), 2 options R / L, stored as a scalar in `collect()`.

**Grading legend** (POOR/FAIR/GOOD definitions, from the SOP — surface near the grid as helper text):
- **Poor:** No contraction
- **Fair:** Partial or difficult movement
- **Good:** Full movement with control

---

## BUILD NOTES FOR CC (gap-audit output — read before planning)

Surfaced during a brainstorming gap-pass. These are the non-obvious traps and decisions the implementation plan must inherit:

1. **MPIS builder — field shape is MIXED.** `collect()` returns `pain` NESTED (`d.pain.pre`) and `sensation` NESTED (`d.sensation.hot`), but most other fields FLAT. The MPIS builder (`_buildMpisFacial`) must read each field at its real depth — do NOT assume uniform flat/nested. Follow HAND's SOAPIER structure for the builder skeleton (per WORKFLOW MPIS pattern), but match THIS form's collect() shape for field access. New multi-chip arrays (`nature`, `agg`, `ease`, `hrs24`) join as comma-listed values in their MPIS sections.

2. **Grid row labels are a DATA CONTRACT, not just display text.** `assessment_grid.js` `loadData()` matches saved rows to grid rows by the `label` STRING. The 15 facial + 5 tongue labels (with KKM typos preserved) become the persistence key. **Once any record is saved, NEVER edit a grid row label** — even to fix a typo — or old records silently fail to repopulate (label mismatch → blank grid, no error). The typo-preservation rule and the load-key are the same constraint here. If a label must ever change, a data migration is required.

3. **Two grids = two wirings.** `collect()` calls `getData()` on BOTH grid instances (facial + tongue); `populate()` calls `loadData()` on both; `reset()` calls `clear()` on both. Mirror SCI's multi-grid form wiring (`form_sci.js`) — it already does this for nine grids. Do NOT invent a new pattern; SCI is the reference.

4. **Multi-select chips ALREADY EXIST — borrow NEURO's, do NOT build net-new.** ⚠ CORRECTION (2026-06-14, caught by CC during plan grounding): the original brainstorm claimed multi-select chips were net-new "no existing primitive." That was WRONG — written without grepping the form JS. A complete multi-select chip primitive ships in production NOW:
   - **CSS:** `.chip-group` / `.chip` / `.chip.active` — `style.css:583–606` (labelled "MULTI-SELECT CHIPS, neuro + general forms"). Do NOT add a new `.multi-chip`/`.mc-sel` pair — it already exists.
   - **JS:** `form_neuro.js:11–28` — `toggleChip(el, groupId)`, `getChips(groupId)` (returns array of selected chips' `textContent.trim()`), `setChips(groupId, values)`.
   - **HTML:** `<div class="chip-group" id="x-chips"><span class="chip" onclick="FacialForm.toggleChip(this,'x-chips')">Label</span>…</div>`
   - **BORROW STYLE:** per ship-crude + the `form_sci.js` precedent (which keeps its own LOCAL `getChecks`/`setChecks` rather than touching shared code), `form_facial.js` copies the 3 chip helpers LOCALLY. No shared-module edit.
   - **DATA CONTRACT:** the stored value IS the chip's visible label text (`textContent.trim()`). So the `<span>` label text is the persistence value — keep labels stable once records exist (same family as the grid-label-as-load-key trap, #2).
   - This makes the build SMALLER than the brainstorm assumed. The deferred full-clickfest project (BACKLOG) also inherits this existing primitive, not a new one.
   - Sensation Test is THREE SINGLE-select chip rows (Hot/Cold/Pin-prick, each Normal/Reduced/Absent) + a notes textbox — single-select uses the `.irr-chip`/`.sel-<Value>` pattern. Only Nature/Agg/Ease/24hrs use the multi-select `.chip-group` borrow.

5. **CSS pre-check.** Before using `.multi-chip`, `.mc-sel`, or any new chip class in HTML, grep `style.css` — custom chip classes are invisible until the CSS exists (bible anti-repeat rule).

> **DEFERRED — full-clickfest cross-form experiment (NOT this build).** The SOP enumerates options for MORE fields than we're chipifying (Observation: asymmetry/swelling/reduced-expression; Palpation: warmth/swelling/spasm/tenderness; General Health: HPT/DM/cancer/ear; Problem: pain-type/swelling/saliva-control). Converting ALL of them is a cross-form idea (MS has the same fields) — doing it on FACIAL alone causes pattern drift. PLAN: ship FACIAL with the "easy wins" above, then once stable, use FACIAL as the PILOT form to flip its full intake to clickfest. If it feels good, roll the multi-chip template across all forms as its own spec → plan → build cycle. Log to BACKLOG so it isn't lost. The multi-chip helper built in note #4 is the seed component for this.

---

## collect() contract (for build rung — REQUIRED)

Per WORKFLOW + bible: `collect()` MUST return BOTH `_form_type: 'FACIAL'` AND `meta: { form: 'FACIAL' }`. Shape (illustrative):
```
{
  _form_type: 'FACIAL',
  meta: { form: 'FACIAL' },
  patient: {...},
  diagnosis, doctorMgmt, problem,
  pain: { pre, post }, area,
  nature: [...], natureNotes,   // multi-chip arrays + freeform notes
  agg: [...], aggNotes,
  ease: [...], easeNotes,
  hrs24: [...], hrs24Notes,
  irritability,                 // single scalar 'High'|'Medium'|'Low'
  currentHistory, pastHistory,
  generalHealth, pmhx, investigations, medication, occupation, socialHistory, hearingAidPacemaker,
  observation, palpation,
  sensation: { hot, cold, pinPrick, notes },  // each modality 'Normal'|'Reduced'|'Absent'
  affectedSide,                 // 'R' | 'L'
  facialMov: [ {label, grade}, ... ],   // from FACIAL grid getData()
  tongueMov: [ {label, grade}, ... ],   // from TONGUE grid getData()
  impression, stg, ltg, planOfTreatment
}
```
Add FACIAL required fields to `REQUIRED_FIELDS` in `database.py` (step 4.5).

---

## STEP 6 source material — Best Statement & SOP (for templates rung)

The SOP (`Garis Panduan`, pp9–14) gives field-fill guidance; the Best Statement (pp15–21) gives canned worked statements. These feed the **templates rung** of the milestone ladder → `clinical_templates.js` (assessment arrays + SOAP variant). NOT used in the form/HTML rung.

### SOP field-fill notes (condensed)
- **Diagnosis:** As in referral.
- **Doctor's Management:** Brief — conservative or operative.
- **Problem:** Presenting complaint — pain (type/nature: sharp, dull, pricking, throbbing, burning, numbness), swelling (presence/location/severity), saliva control (dribbling/drooling), other (facial heaviness, tightness, twitching, asymmetry).
- **Pain Score:** MOH Pain Scale 0–10; location, duration, agg/relieve factors.
- **Aggravating:** chewing, swallowing, drinking, speaking, facial expressions.
- **Easing:** moist heat, ice packs, medication, rest, self-relief.
- **24hr:** AM/PM/night variation.
- **Irritability:** activity needed to provoke / severity when provoked / time to return to baseline.
- **General Health:** HPT, DM, cancer, ear-related.
- **PMHX/Surgery:** previous brain or ear surgeries.
- **Ix:** MRI, X-ray (esp. ENT involvement).
- **Medication/Steroid:** incl. steroids, vitamins (Neurobion / nerve health).
- **Occupation/Recreation:** job demands + recreation affected.
- **Hearing Aid/Pacemaker:** relevant for electrotherapy precautions.
- **Current History:** what caused it, when, anything felt/heard at onset (snap/pop).
- **Past History:** prior occurrence, onset/progression, past Rx + effectiveness.
- **Observation:** facial asymmetry, swelling, abnormal/reduced expressions.
- **Palpation:** local warmth, swelling, spasm/tightness, tenderness.
- **Sensation Test:** hot / cold / pin-prick over facial area.
- **Movement:** quality, symmetry, control.
- **Tongue:** deviation, tightness/shortening, asymmetry/reduced mobility.
- **Impression:** problems in priority order; severity, functional impact, concerns.
- **STG:** measurable, time-bound (e.g. 1–2 weeks).
- **LTG:** functional outcomes, longer (3–6 weeks+), aligned to return-to-work/confidence/eating/speaking.
- **Plan:** modality-based (facial massage, neuromuscular stim, sensory retraining); frequency + progression; individualised.

### Best Statement worked examples (Right Bell's Palsy — author SMART variants from these)
- **STG (verbatim from doc):** Provide patient assurance and education · Relieve pain within 1/52 · Reduce swelling within 1/52 · Maintain muscle properties within 1/12 · Begin strengthening facial muscles within 1/12
- **LTG:** Improve facial expression and cosmetic appearance within 3/12 · Regain full function of right facial muscles within 3/12 · Enable return to daily and social activities within 3/12
- **Plan of Treatment:** Explanation/reassurance · Patient education on Bell's Palsy + home care · PNF · Ice stroking · Brushing · Facial exercises · Soft Tissue Manipulation (STM)
- **Impression:** Weakness of right facial muscles due to nerve compression/injury · Pain and swelling possibly associated with ear pathology
- **SOAP (Progress Note):**
  - S: Sudden onset of right facial weakness, pain behind ear, history of parotidectomy
  - O: Right facial asymmetry, muscle weakness, reduced sensation
  - A: Right Bell's Palsy with moderate irritability
  - P: reassurance + education; advice (facial exercises, avoid sleeping on affected side, eye protection, use straw, chew gum); exercise (AEIOU, PNF, ice stroking, brushing, STM, facial exercises 10 reps × 3/day); handouts provided

> Templates rung MUST author proper discrete SMART statements (one per array entry), NOT copy these vague category lines verbatim (per bible Anti-Repeat rule on template arrays).

---

## Open items for build rung (none blocking design)
- Confirm `s-sens` (Sensation Test) as its own card vs. folding into Observation. Spec'd as own card to match borang. **Clinical-feel call — Miruya's chair.**
- PDF: page-1 two-column intake mirrors MS PDF; page-2 grids render as `data_table()` with grade column. Affected side prints in the movement section header.
- MPIS: SOAPIER builder following HAND's structure (per WORKFLOW MPIS pattern).
