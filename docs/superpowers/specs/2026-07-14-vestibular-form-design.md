# VESTIBULAR Form — Design Spec

**Date:** 2026-07-14
**Form:** VESTIBULAR (Vestibular Assessment) — Neurological group
**KKM borang ref:** `fisio/b.pen. 22 /2022` (preserve verbatim in PDF, KKM typos included)
**Status:** Design spec. NOT an implementation plan. A later CC session writes the durable plan FROM this doc, cold.
**Source docs:** `vestibular.pdf` (2-page scanned borang — the real fillable form), `4. Vestibular 2026.txt` (Best Statement guide transcription, MOH/P/FIS/27.25(HB)-e, 2026).

---

## 0. What makes VESTIBULAR different (read this first)

SCI was mashed-potato: nine fixed-row grids, everything through the `assessment_grid` factory. **VESTIBULAR is the polar opposite** (Miruya's framing): *"someone who used Excel but removed the grid."* The data is spreadsheet-like — dozens of discrete Yes/No and +Ve/−Ve cells — but the clinician does **not** want to look at a bordered grid table. So this form is a **battery-farm rendered as chips**, not a grid.

Count the batteries: Past Medical Hx (6 items), Recent Symptoms (7), Current Functional Status (7), Vertigo (5), Disequilibrium (6), Oculomotor (8), Positioning tests (4). Then scored measures (DHI, ABC, DGI, TUG, gait velocity), AROM/PROM for neck+UL+LL, strength, somatosensory, coordination, postural control with EO/EC timings, CTSIB.

**The backbone is light.** No body chart, no lung diagram, no hand chart — none of the heavy SVG components. The only genuinely new build is ONE small form-local component: the **scaffold chip** (§4.4). Everything else is configuration of existing chip patterns plus plain inputs. Structurally this is one of the cheapest forms to build; the design work is all in the *interaction model*, not the components.

**The interaction model IS the innovation of this form.** Read §4 carefully — it's the reusable idea (click-to-fill instead of type, stamp-the-baseline instead of tap-fifty-times) that could later graduate into the FACIAL "clickfest" pilot the BACKLOG has been waiting for.

---

## 1. Decisions locked during brainstorm (the WHY behind each)

| # | Decision | Rationale |
|---|----------|-----------|
| D1 | Batteries are **explicit Yes/No (or +Ve/−Ve) chip pairs** — both values documented — NOT a "what's present" multi-select cloud | Miruya: *"all of it matters."* A documented **No** (asked, negative) is clinically distinct from "didn't ask." A present-only cloud can't tell them apart. |
| D2 | Each battery/section gets a **one-tap stamp** that sets all un-tapped items to the baseline (No / −Ve), non-destructively; clinician then flips the few positives | The burden-killer isn't dropping the No — it's replacing fifty taps + all typing with *stamp → flip positives*. Reuses SCI's stamp mechanic, reskinned from grid to chips. Most of a PMHx is "No". |
| D3 | A section left **completely untouched = N/A = omitted** from PDF and MPIS. Filled or stamped → it prints. | The app's established sparse-data behaviour (`_has_data` guard). Miruya's rule verbatim: skipped question treated as N/A, block skipped downstream. |
| D4 | Section-level **"KIV — unable to answer this visit"** remark that *prints* (distinct from silent skip). **SHIPPED behavior is destructive on engage — see §4.3 correction, 2026-07-19.** | Miruya's real workflow: when there's no time or the patient can't answer, he slashes the section and remarks it. That remark must survive to the PDF, not vanish like a blank. |
| D5 | **Scaffold chip** for Positioning tests + Oculomotor: `+Ve` unfolds structured click-to-fill (nystagmus direction, latency, duration, intensity, symptoms note); `−Ve` stays collapsed. Built **once, form-local**. | Captures Best-Statement-level nystagmus detail without typing. Axiom: don't invent a *shared* abstraction speculatively — build it local, prove it in clinic, promote later (cf. `pair_box`, chip-helper promotion rule). |
| D6 | Narrative sections (Hx, Problem, Impression, STG, LTG, Plan) use the **existing Best Statement template buttons** (`clinical_templates.js`) | Miruya: *"follow the Best Statement as the SOP."* That's exactly what the existing template mechanism does — scaffold the clinician instead of asking them to type. |
| D7 | **No body chart, no lung, no hand chart.** Borrow existing chip patterns + plain inputs + light fixed rows. | The form is a battery-farm; none of the heavy SVG components apply. Borrow-first + ship-crude. |
| D8 | **PDF** prints the full documented Yes/No list (`Neck Pain : No.`). **MPIS** prints positives spelled out + a compact roll-up (`Other PMHx: all negative`), and is truncated. | PDF = formal record, matches paper. MPIS = running POMR note; the char/line limit is still untested, and dumping every negative slams the known MPIS-readability sore spot. Truncate until tested. |
| D9 | *"Excel minus the grid"* — structured discrete values render as **chips / inline controls**, never a bordered grid table. Explicit contrast to SCI. | Direct clinical instruction. The row structure survives; the table chrome does not. |
| D10 | SOAPIER section sequence (§3) is **preliminary** — revisit in the polish pass | Miruya agreed the flow but flagged it as not final. Sequence is cheap to reorder later; don't over-commit now. |

---

## 2. Field transcription (verbatim from borang) + classification

Per FORM_PIPELINE step 1 (TRANSCRIBE) + step 2 (CLASSIFY). Preserve KKM wording/typos exactly (they carry downstream to the PDF). Classification tags: `[text]` `[number]` `[derived]` `[chip Y/N]` `[chip choice]` `[battery+stamp]` `[scaffold]` `[template]`.

**Header / patient bar (borang):** `KEMENTERIAN KESIHATAN MALAYSIA / PHYSIOTHERAPY DEPARTMENT / VESTIBULAR ASSESSMENT FORM` · ref `fisio/b.pen. 22 /2022`
- Name `[text]`, Age `[derived NRIC]`, Sex: M / F `[derived]`, R/N `[text]`, Date `[text]`

**Page 1 — left column:**

- **DOCTOR DIAGNOSIS** `[text]` (guide: refer to diagnosis in medical referral)
- **DOCTOR MANAGEMENT** `[text]`
- **CURRENT Hx** `[text + template]`
- **PAST Hx** `[text + template]`
- **PROBLEM** `[text + template]`
- **PAST MEDICAL Hx** `[battery+stamp, chip Y/N each]`: Heart Disease · Hypertension · Diabetes · Migraine Headaches · Head Trauma · Stroke / TIA
- **RECENT SYMPTOMS OR PROBLEMS** `[battery+stamp, chip Y/N each]`: Neck Pain · Blackouts / Fainting · Weakness or Paralysis · Hearing Loss · Blurred Vision · Ear Infection or drainage · Tinnitus
- **Ix : MRI / CT Scan** `[text]` (guide: date, type, results; note hearing tests)
- **Medication / Steroid** `[text]` (guide: name, dosage, frequency, date started)
- **SOCIAL HX:** Occupation / Job `[text]` · Marital Status: Single / Married `[chip choice]` · Smoking `[chip Y/N]` · Alcohol `[chip Y/N]` · Trouble sleeping `[chip Y/N]`
- **CURRENT FUNCTIONAL STATUS** `[battery+stamp, chip Y/N each]`: Independent in self-care activities · Drive: Daytime · Drive: Night time · Reading · Crowded Area · Escalator / Stairs · Watch TV / Movie

**Page 1 — right column:**

- **FREQUENCY OF FALLS** `[text/number]` · **INJURY FROM FALL** `[text]` (guide: date, number, area of injury)
- **VERTIGO (a sense of spinning):** Spontaneous `[chip Y/N]` · Induced by motion `[chip Y/N]` · Induced by position changes `[chip Y/N]` · Tempo (days) `[chip choice: < 3 days / > 3 days]` · Spells `[chip choice: seconds / minute / hours]`
- **DISEQUILIBRIUM (sense of being off-balance):** Constant `[chip Y/N]` · Spontaneous `[chip Y/N]` · Induced by motion `[chip Y/N]` · Induced by position changes `[chip Y/N]` · Worse in the dark `[chip Y/N]` · Worse in `[chip choice, multi: Lying / Standing / Sitting / Walking]`
- **MEASURES:** Dizziness Handicap Inventory (DHI) `[number score]` · Activities Specific Balance Confidence Scale (ABC) `[number score]`
- **OBJECTIVE EXAMINATION / OCULOMOTOR EXAMINATION** `[battery+stamp, chip +Ve/−Ve each]`: Spontaneous Nystagmus · Smooth pursuit · Saccades · Gaze Holding Nystagmus · VOR Cancellation · Head Thrusts `[+ side R / L / BIL]` · Dynamic Visual Acuity · Head Shaking
- **POSITIONING TESTS** `[scaffold]` (each: +Ve/−Ve, and on +Ve → Symptoms line): R Dix Hallpike · L Dix Hallpike · R Roll · L Roll

**Page 2 — left column:**

- **AROM / PROM** `[fixed 5 rows: range + quality/symptom + pain score]`: Neck · R UL · L UL · R LL · L LL (borang shows `..../....` two-slot per row)
- **STRENGTH** `[4 values, text/number MMT grade]`: (UL) R__ L__ · (LL) R__ L__
- **SOMATOSENSORY** `[chip intact/impaired + note]`: Proprioception UL (R / L) · Proprioception LL (R / L) — guide: state the impaired joint
- **COORDINATION** `[chip + note]`: Finger to nose (R / L) · Heel to shin (R / L) — guide: dysmetria / ataxia / tremor / intact
- **POSTURAL CONTROL** ( `: +ve / −ve / sec` ) `[light fixed rows, EO + EC values]`: Rhomberg · R Sharpened Rhomberg · L Sharpened Rhomberg · R Single Leg Stand · L Single Leg Stand (each EO____ / EC____) · Time Up & Go Test `[seconds]`
- **Clinical Test of Sensory Interaction for Balance (CTSIB)** `[light fixed rows, seconds]`: EO Firm surface · EC Firm surface · EO Foam surface · EC Foam surface
- **GAIT ASSESSMENT** `[mixed]`: Velocity `[number: Sec / 20 ft]` · Deviation `[chip Y/N + chip R/L]` · Device `[chip Y/N]` · Dynamic Gait Index Score `[number]`
- **CLEARANCE TEST** `[text]` (guide: VBI, cervical spine screening, cranial nerve exam)

**Page 2 — right column:**

- **PHYSIOTHERAPY IMPRESSION** `[text + template]` (guide: ICF-based, in order of priority)
- **SHORT TERM GOALS** `[text + template]`
- **LONG TERM GOALS** `[text + template]`
- **PLAN OF TREATMENT** `[text + template]`
- **ATTENDING PHYSIOTHERAPY** `[sign_chop_block in PDF]` (sign, stamp, date)

> **KKM typos to PRESERVE (do not "correct"):** `Rhomberg` (not Romberg) · `Time Up & Go Test` (not Timed) · `OCULOMOTOR` on the borang header (the guide text spells it `OCCULOMOTOR` — use the borang's `OCULOMOTOR` for the PDF) · `ATTENDING PHYSIOTHERAPY` (borang header; guide says `ATTENDING PHYSIOTHERAPIST`). Match the borang for PDF strings.

---

## 3. Section structure (SOAPIER flow) — PRELIMINARY (D10)

Per FORM_PIPELINE step 3 (SEQUENCE): regroup paper order into clinical SOAP flow, NOT borang print order. Each section is a `.card` with `.sec-num` (DESIGN_SYSTEM primitives, non-negotiable). **Patient card copied from `ms.html`** (NOT neuro.html — missing required IDs, WORKFLOW Anti-Repeat).

| # | Section (`s-id`) | SOAP | Contents |
|---|------------------|------|----------|
| 01 | `s-patient` | — | Patient card from ms.html (NRIC → DOB/age/sex derive, assessment date) |
| 02 | `s-referral` | S | Doctor Diagnosis, Doctor Management (2 narrative) |
| 03 | `s-history` | S | Current Hx, Past Hx, Problem (narrative + template) |
| 04 | `s-pmhx` | S | Past Medical Hx battery + Recent Symptoms battery + Ix (MRI/CT), Medication/Steroid |
| 05 | `s-social` | S | Social Hx (occupation, marital chip, smoking/alcohol/sleep Y/N), Current Functional Status battery |
| 06 | `s-falls` | S | Frequency of Falls, Injury from Fall |
| 07 | `s-vertigo` | O | Vertigo battery + Disequilibrium battery |
| 08 | `s-measures` | O | DHI score, ABC score |
| 09 | `s-oculomotor` | O | Oculomotor battery (+Ve/−Ve + Head Thrusts side) |
| 10 | `s-positional` | O | Positioning tests — scaffold chips (Dix-Hallpike R/L, Roll R/L) |
| 11 | `s-rom` | O | AROM/PROM (Neck/UL/LL), Strength |
| 12 | `s-neuro` | O | Somatosensory, Coordination |
| 13 | `s-balance` | O | Postural Control (Rhomberg/SLS EO-EC, TUG), CTSIB |
| 14 | `s-gait` | O | Gait Assessment (velocity, deviation, device, DGI), Clearance Test |
| 15 | `s-impression` | A | Physiotherapy Impression — text + template |
| 16 | `s-goals` | P | STG, LTG, Plan of Treatment — each text + template |

> 16 sections is more than most forms — expected for a battery-heavy assessment. The polish pass (D10) may merge or reorder; the sidebar nav absorbs the count fine.

---

## 4. The interaction model — resolved designs (the heart of this form)

### 4.1 Battery = explicit Yes/No chip pairs (D1)

Each battery item renders as: `Label ............ [Yes] [No]` — two small chips, tap one. Same for +Ve/−Ve batteries: `[+Ve] [−Ve]`. No table borders (D9). Tri-state under the hood:

- **Yes / +Ve tapped** → positive value stored, renders.
- **No / −Ve tapped** → negative value stored, renders (documented negative — D1).
- **Untapped** → absent from `getData()` (NOT empty string). Downstream `_has_data` guard skips it (D3).

**Borrow, keep local (Miruya 2026-07-14):** reuse the `.irr-chip` CSS + the multi-select chip helper (`toggleChip/getChips/setChips`) pattern from NEURO/FACIAL with a **form-local copy** for this build. VESTIBULAR is technically the 3rd consumer (the promotion trigger), but promotion into `window.FormBase` is **deferred to a BACKLOG item** — do NOT do that refactor in this build. Ship-crude: local copy now, promote all three later as its own small pass.

> **CRITICAL (WORKFLOW Anti-Repeat):** `.irr-chip` only ships `.sel-High/Medium/Low` in style.css. Every new `.sel-<Value>` the JS applies (`.sel-Yes`, `.sel-No`, `.sel-Pos`, `.sel-Neg`, `.sel-R`, `.sel-L`, etc.) must be defined **form-locally** in the form's `<style>` block — style.css is axiom-protected. Verify the selected state actually PAINTS in smoke-test (FACIAL shipped an invisible `.sel-R`/`.sel-L` for exactly this reason, fixed `412ae7d`).

### 4.2 Section stamp (D2) — the burden-killer

Each battery section header carries a stamp button, e.g. `Stamp remaining → No` (or `→ −Ve` for oculomotor). One tap fills every **un-tapped** item in that section with the baseline value, **non-destructively** (never overwrites an already-tapped item). Then the clinician flips the handful of positives.

- Mirror the SCI `assessment_grid` stamp semantics: fill blanks only, skip already-set cells.
- Baseline is per-battery: `No` for Yes/No batteries, `−Ve` for oculomotor. Bake the baseline into each battery's config.
- After stamping, the section counts as filled (D3) → it prints in full.

### 4.3 Section states → PDF/MPIS (D3, D4, D8)

Three terminal states per section:

1. **Filled / stamped** → prints. PDF shows the full Yes/No list (`Neck Pain : No.` — D8). MPIS shows positives + roll-up (§7).
2. **KIV-remarked** → the section carries a `"KIV — unable to answer this visit"` note (D4). PDF/MPIS print the remark line *instead of* the item list. Implement as an optional per-section remark field (a `+Note`-style toggle at section level) whose presence flips the section into "print the remark, skip the items" mode. **CORRECTED post-build (2026-07-19, Miruya clinical call — SHIPPED, overrides this paragraph's original intent):** engaging KIV is destructive, not a print-time-only override — it CLEARS every control in the section (chip selections, scaffold entries, text/number fields) before locking, since reaching for KIV means the section was never assessed and must hold no answers, not merely locked/hidden ones. Disengaging leaves the section empty and unlocked — no stash, no restore. Implemented in `static/js/form_vestibular.js`'s `clearBatteryControls()`, called from `toggleKiv()`/`onKivInput()`/`setKiv()`.
3. **Blank** (nothing tapped, no stamp, no remark) → N/A → omitted from PDF and MPIS entirely (`_has_data` guard).

### 4.4 Scaffold chip (D5) — build ONCE, form-local

For Positioning tests (and the structured slice of Oculomotor if it earns it). A labelled row with a `+Ve / −Ve` toggle; **on +Ve** it unfolds a scaffold of click-to-fill controls, **on −Ve** it stays collapsed.

Scaffold contents (from the Best Statement nystagmus model): **Direction** chips (Upbeat · Downbeat · Torsional · Horizontal · Geotropic · Ageotropic — multi-select allowed, e.g. "upbeat torsional") · **Latency** `[number, s]` · **Duration** `[number, s]` · **Intensity** `[0–10]` · **Symptoms** `[+Note]`. The interactive concept mock shown in-session is the reference feel.

- **Scope:** ONE small form-local component (`static/js/vestibular_scaffold.js` or inline in `form_vestibular.js` — plan's call). Config-driven: `{ label, sideSelect?, fields:[...] }` so all 4 positional rows + any oculomotor use share it.
- **Not shared, not speculative.** Do NOT promote to a global factory in this build. If it proves out in clinic it's a promotion candidate — note it in BACKLOG, same discipline as `pair_box`/trend-card.
- **Data shape:** store per test as a small object, e.g. `posTests.rDixHallpike = { result:'pos', direction:['Upbeat','Torsional'], latency:3, duration:15, intensity:7, note:'vertigo, nausea' }`. `−Ve` stores `{ result:'neg' }`. Untapped = key absent.
- **Head Thrusts side (R/L/BIL):** a chip choice adjacent to its +Ve/−Ve — not a full scaffold, just a side selector. Deviation R/L in gait is the same tiny pattern.

### 4.5 Non-battery objective inputs (borrow / plain)

- **AROM/PROM** — fixed 5 rows (Neck, R UL, L UL, R LL, L LL), each: range `[text]` + quality/symptom `[text/+Note]` + pain score `[number 0–10]`. NOT `movement_table.js` (that's for a dynamic list of *named* movements with start/end angles; here it's 5 fixed gross-region rows). Light fixed rows, no grid chrome (D9).
- **Strength** — 4 plain inputs (UL R/L, LL R/L), MMT grade text/number.
- **Somatosensory / Coordination** — chip (intact / impaired, or intact / dysmetria / ataxia / tremor) per R/L + `+Note` for the impaired joint.
- **Postural Control** — light fixed rows: label + EO `[number]` + EC `[number]`; TUG `[number s]`.
- **CTSIB** — 4 rows (EO/EC × Firm/Foam), seconds each.
- **Scores** — DHI, ABC, DGI, gait velocity: plain `[number]`.

---

## 5. Backbone / components — borrow vs build

| Piece | Decision | Notes |
|-------|----------|-------|
| Battery chip pairs | **Borrow (local)** | `.irr-chip` + form-local chip-helper copy. Promotion to FormBase deferred to BACKLOG (Miruya 2026-07-14). Form-local `.sel-*` CSS. |
| Section stamp | **Borrow mechanic** | SCI `assessment_grid` stamp semantics (fill blanks only), reskinned to chips. Not the grid itself. |
| Scaffold chip | **Build once, form-local** | Only genuinely new component. Config-driven. Promotion candidate later, NOT now. |
| Choice chips (Tempo, Spells, Worse-in, Marital, side selectors) | **Borrow** | Existing chip single/multi-select. |
| AROM/PROM, Strength, Postural, CTSIB, scores | **Plain inputs / light fixed rows** | No component. `.fg` grids, no borders. |
| Narrative + goals | **Borrow** | `clinical_templates.js` template buttons (D6). |
| Body/lung/hand chart | **None** | Form has no figure component (D7). |

**Net new build surface: one form-local scaffold component. That's it.** This is a cheap form structurally — the spend is in wiring the batteries + stamp + the three section-state behaviours correctly.

---

## 6. PDF renderer spec — target ~90% KKM match

Engine: ReportLab/Platypus. Read DESIGN_SYSTEM-pdf.md before writing `pdf_vestibular.py`. Borang is 2-page, 2-column.

- **Header + patient bar:** `page_header('VESTIBULAR ASSESSMENT FORM', 'fisio/b.pen. 22 /2022')` then `patient_bar(patient, REF)` then `gap(2)`. Never nest either in `two_col()`.
- **Ref string EXACT:** `fisio/b.pen. 22 /2022` (note the spacing — matches borang).
- **Batteries print the full documented list** (D8): one line per item, `Label : Yes.` / `Label : No.` / `Spontaneous Nystagmus : +Ve.` etc. Guard each battery with `_has_data` — a fully-blank (untouched) battery is skipped entirely (D3). A KIV-remarked section prints the remark line instead of the list (D4).
- **Positional tests:** print `R Dix Hallpike : +Ve` and, when +Ve, the structured detail underneath (`Direction: Upbeat, Torsional · Latency: 3s · Duration: 15s · Intensity: 7/10 · Symptoms: vertigo, nausea`). `−Ve` prints just the result line. Untapped skipped.
- **Layout rhythm:** the borang pairs blocks 2-across. Use `two_col()` for genuinely short paired blocks; **stack full-width for the long batteries** (forcing a 7-item battery into a narrow column is unreadable — DESIGN_SYSTEM-pdf anti-pattern "mixed layout rhythm"). Commit to full-width for battery blocks.
- **Section label rhythm:** `Paragraph(section, S_BOLD)` + `gap(1)` before each block, `gap(2)` after (DESIGN_SYSTEM-pdf).
- **Sparse-data guard everywhere** — `_has_data()` before every block. A patient with only Dx + impression must not produce pages of empty "—" lines.
- **Footer:** `story += sign_chop_block()` (returns a list — use `+=`, never `append`). Never inline sign/chop.
- **Cross-check:** every field in `form_vestibular.js collect()` must have a render block here — the neuro.muscles silent-drop class of bug. Cross-reference collect → PDF → MPIS (WORKFLOW Anti-Repeat).

---

## 7. MPIS builder spec

Builder/wrapper/finalizer, SOAPIER structure (WORKFLOW MPIS pattern). `_buildMpisVestibular()` returns a parts array — ZERO `copyText`/`await` inside. Wire into `copyToMpisAuto()` switch (`formType === 'VESTIBULAR'`). No per-form public wrapper.

- **SOAPIER top-level sections** (dash-delimited), following HAND's SOAPIER canon: SUBJECTIVE / OBJECTIVE / ANALYSIS / PLAN.
- **Batteries → positives + roll-up (D8):** spell out the positives, then one compact roll-up line for the rest. E.g. `PMHx: Hypertension, Diabetes. Other PMHx: all negative.` NOT 13 separate lines. This keeps MPIS lean.
- **Truncate (D8):** the MPIS char/line limit is still UNTESTED (BACKLOG A/B test unrun). Until tested, keep output tight — roll-ups over enumerations, skip documented-negative detail that the PDF carries. Positives and scored measures are the signal.
- **KIV-remarked sections** → print the remark line (D4). Blank sections → omitted.
- **Guard each objective sub-block** with a `has*` check so blank sections don't render empty headers (WORKFLOW).
- **XSS:** any user string into innerHTML goes through `escapeHtml()`.
- Reuse shared constants `MPIS_LN / MPIS_DIV / MPIS_DASH` — never redeclare.

---

## 8. Best Statement templates — content plan

Source: `4. Vestibular 2026.txt`, the DATA / STATEMENT columns. Extract into `clinical_templates.js`.

- Register under `TEMPLATES.VESTIBULAR = { impression:[...], stg:[...], ltg:[...], treatment:[...] }` (the `const TEMPLATES` at top of the IIFE — NOT the flat lowercase `templates`, which silently falls through to `[]`). SOAP variant `TEMPLATES.VESTIBULAR_SOAP = { subjective, objective, analysis, plan }`. Add the SOAP key to `tplMap` in `showSoapTemplate()` in episode.html. **Wire the `addButton` calls in vestibular.html** and click-test every one (FACIAL shipped template buttons that didn't fire — BACKLOG).
- Statements must be **discrete SMART entries** (one per array slot, each Specific/Measurable/Achievable/Realistic/Time-bound) — NOT category headers (WORKFLOW Anti-Repeat).

> **⚠ SOURCE TRAP — the Best Statement doc's STG/LTG examples are respiratory boilerplate, NOT vestibular.** The txt's Short/Long Term Goals section reads *"Improve secretion clearance through airway clearance techniques… reducing sputum retention… respiratory endurance…"* — that's a cardiorespiratory template that bled into the vestibular doc. Do **NOT** transcribe those verbatim. **Author real vestibular SMART statements** for STG/LTG (e.g. *"Reduce vertigo intensity from 7/10 to 3/10 on positional testing within 2/52"*, *"Improve DGI score from 12 to 19 within 4/52"*, *"Achieve independent community ambulation without dizziness-related falls within 3/12"*). The Impression and Plan-of-Treatment content in the doc IS vestibular-appropriate (ICF impression example, VRT/canal-repositioning plan) — use those. This is a content-authoring task; treat it as its own rung with clinical review, like the NCD template-content gap.

---

## 9. Wiring checklist (registry-drift tax — hit EVERY site)

1. `FORM_REGISTRY` in app.py → `ready=True`, add `pdf_episode` + `pdf_single` keys (the two PDF dicts derive automatically — do NOT hand-edit).
2. `FORM_TEMPLATES` dict in app.py → `'VESTIBULAR': 'forms/vestibular.html'`.
3. `REQUIRED_FIELDS` in database.py → add VESTIBULAR (recommend minimal, e.g. Doctor Diagnosis). Field key must match collect().
4. **home.html** picker → remove `soon`/"Soon", add `onclick="selectForm(this)"`, set icon. **AND patient.html** picker → same removals, handler `onclick="selectEpForm(this)"` (different handler; both independently hardcoded).
5. **formLabel display maps × 5 sites:** episode.html (×2), home.html (`FORM_LABELS` const ~1208 + inline ~1922), patient.html (Jinja `form_labels` ~475). Verify `grep -rn "MS:'Musculoskeletal'\|'MS':'Musculoskeletal'" templates/`. Parallel icon maps too.
6. `pdf_vestibular.py` → add to `pt_assessment.spec` under `datas` (forgotten datas = silent exe failure).
7. clinical_templates.js → `TEMPLATES.VESTIBULAR` + `_SOAP`; `addButton` wiring in vestibular.html; `tplMap` in episode.html.
8. MPIS `_buildMpisVestibular()` in main.js + wire into `copyToMpisAuto()` switch.
9. `node --check static/js/form_vestibular.js` before packaging. After any large str_replace, grep the function + read it whole (no orphaned code past `return`).

**window.Form contract (REQUIRED):** form_vestibular.js must expose `window.Form` with `collect, populate, reset, onPtTypeChange, onNricInput, onDobChange`. `collect()` MUST return BOTH `_form_type: 'VESTIBULAR'` AND `meta: { form: 'VESTIBULAR' }`. Missing either = silent wrong PDF or 422 on save. `reset(keepPatient)` = snapshot-restore pattern (WORKFLOW). Patient card from ms.html.

---

## 10. Build order (milestone ladder — FORM_PIPELINE)

```
form → polish → templates → PDF → polish → MPIS → polish
```

- **form** — HTML + form_vestibular.js: patient card, 16 sections, battery chip pairs + stamp + section-state (KIV/blank), the scaffold component, plain inputs. Chip helper stays a form-local copy (promotion deferred — BACKLOG).
- **polish** — Miruya smoke-tests: chip states paint, stamp fills blanks non-destructively, scaffold unfolds on +Ve, KIV remark prints, blank section omits. Round-trip (fill → save → reload → export).
- **templates** — author vestibular SMART statements (§8, mind the respiratory trap) → clinical_templates.js + wire buttons.
- **PDF** — `pdf_vestibular.py`, ~90% borang match, full documented Yes/No lists, sparse guard.
- **MPIS** — `_buildMpisVestibular()`, positives + roll-up, truncated.

Each rung ships + smoke-tests before the next. Standard single-form ladder — no NCD-style extra rungs (this form has no per-visit series or trend).

---

## 11. Axiom compliance check

- ✅ Stack: Flask + SQLite + vanilla JS. No new deps. Scaffold chip = vanilla JS, no lib.
- ✅ PDF: ReportLab only. No figures to embed (no chart).
- ✅ MPIS: plain-text, SOAPIER, roll-ups. Truncated pending the untested limit.
- ✅ Ship-crude: borrows chip patterns, stamp mechanic, templates. ONE new form-local component (scaffold), justified (D5). No refactor of shared code — chip helper stays a form-local copy this build (promotion deferred to BACKLOG, not done here).
- ✅ Clinical compliance: ref `fisio/b.pen. 22 /2022` verbatim. KKM typos preserved (Rhomberg, Time Up & Go, OCULOMOTOR/ATTENDING PHYSIOTHERAPY). "PT Impression" not Diagnosis.
- ✅ Topbar button order: unchanged (standard topbar).
- ✅ Burden-reducer design intent: stamp-the-baseline, click-to-fill scaffold, template scaffolds, multi-select chips — all reduce typing without inventing shared abstractions.
- ⚠️ No axiom stretch. This is a conventional single-record form; the only novelty is UI-level (chip batteries + scaffold), fully inside existing patterns.

---

## 12. Open items for the plan author (NOT blockers)

- **Scaffold component location** (§4.4) — own file vs inline in form_vestibular.js. Recommend own small file `static/js/vestibular_scaffold.js`, IIFE, config-driven.
- **Chip-helper promotion to FormBase** (§4.1/§5) — DECIDED (Miruya 2026-07-14): DEFER. Keep a form-local copy for this build; add a BACKLOG item to promote NEURO/FACIAL/VESTIBULAR together as its own pass. Do NOT promote in this build.
- **KIV remark UI** (§4.3) — section-level `+Note` toggle vs a dedicated "unable to answer" chip. Recommend a section-level `+Note`-style control that, when filled, switches the section to remark-print mode.
- **Section count (16)** — merge/reorder is a polish-pass call (D10), not a blocker.
- **AROM/PROM row shape** — confirm the borang `..../....` two-slot is range/quality (recommended reading) vs AROM/PROM pair. Clinical confirm from Miruya during form polish.
- **Templates = own rung** (§8) — author vestibular SMART content with clinical review; do not ship the respiratory boilerplate.

---

*End of design spec. Next: self-review, Miruya reviews the written spec, then a CC session writes the durable implementation plan FROM this doc, cold. Merge stays human-gated.*
