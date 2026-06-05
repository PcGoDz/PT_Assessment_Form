# SCI Form — Design Decisions (Milestone 1: Form)

Scoped 2026-06-03 (Tue evening). Source forms: KKM Best Statement SCI (MOH/P/FIS/27.25(HB)-e, 2025) + blank borang (fisio / b.pen. 4 / Pind. 2 / 2019). This is the locked clinical/structural spec. It is NOT the CC prompt yet — it is the no-open-questions source the prompt gets written from.

---

## Framing (read first)

- The ward fills the **KKM borang only**. Miruya has been cheating by using the NEURO form as a stand-in. SCI getting its own form retires that detour.
- Miruya **fills both heavy grids** (sensory + MMT) in real use. His lecturer insists on full completion. So both grids are real, fillable, load-bearing components — NOT compliance decoration. No skip-render escape hatch on them.
- We render the **data**, not the borang's layout. The KKM margins-everywhere mess dies at the import boundary. Our engine renders fields in our own house style, same as MS/NEURO PDFs share zero visual DNA with their paper forms.
- Milestone ladder (unchanged): **form → polish → PDF → polish → MPIS → polish.** Everything here is milestone 1. PDF layout and MPIS are deliberately NOT decided yet (they want real rendered output to react to).

---

## Cross-cutting principle: three (four) cell states

Every grid cell can be in one of these, and they are clinically distinct:

- **blank** = not yet assessed (draft / ran out of time)
- **NT** = assessed-decision to skip / not testable
- **N/A** = doesn't apply to this patient's injury level (Upright Control only)
- **real value** = N/I/A, 0–5, G/F/P etc.

These must stay distinct in the data layer AND render differently in the PDF. A blank printing as "—" must NOT read as "normal nothing." This ambiguity is a medico-legal trap on an SCI neuro chart specifically (completeness of the exam is the whole point of the document).

## Cross-cutting component: stamp button (reusable, ONE pattern)

One control, built once, pointed at two places:
- **Whole-grid "NT" stamp** — sensory grid + MMT grid. Fills empty cells with NT.
- **Block-level "N/A" stamp** — Upright Control only. Fills empty cells with N/A.

**Non-destructive**: only fills cells that are currently blank. Never overwrites an entered value. Stamped values are valid dropdown options so they round-trip and re-display on reload.

---

## GRIDS (the hard half — all locked)

### 1. Sensory Evaluation — TABLE, not a body chart
**CRITICAL CC TRAP:** This is the bodychart-relabel trap (cf. BURN chip bug) wearing a new coat. The borang's sensory *figure* is a reference drawing, NOT an input. The data is the table beside it. Do **NOT** reach for `bodychart.js` / marker canvas. It is a vertical dropdown table.

- Rows: dermatome levels **C2, C3, C4, C5, C6, C7, C8, T1–T12, L1–L5, S1–S4** (28 levels)
- Columns (4 data): Pin Prick L, Pin Prick R, Light Touch L, Light Touch R
- Cell dropdown: **N / I / A / NT** (Normal / Impaired / Absent / Not Tested)
- Whole-grid NT stamp button
- Optional (UI taste, deferred): static non-interactive dermatome reference image beside the table for "which level is which." Garnish, not capture.

### 2. Musculoskeletal Evaluation (MMT grid) — widest grid, scroll risk
- Rows (joint × movement, ~30): Neck (Flex/Ext), Scapula (Elev/Depression/Protraction/Retraction), Shoulder (Flex/Ext/Abd/Add Horiz), Elbow (Flex/Ext), Wrist (Flex/Ext), Finger (Flex/Ext), Trunk (Flex/Ext), Hip (Flex/Ext/Abd/Add/Int Rot/Ext Rot), Knee (Flex/Ext), Ankle (P.Flex/D.Flex), Subtalar (Inv/Eve), Toe (Flex/Ext)
- Columns (6 data): MMT L, MMT R, PROM L, PROM R, MAS L, MAS R
- **MMT dropdown — expanded MRC** (half-grades required; ideal whole-number scale is useless on real high-grade tetra): `0, 1, 2-, 2, 2+, 3-, 3, 3+, 4-, 4, 4+, 5`
  - OPEN (smol): if bottom-end modifiers `2-` / `2+` are never used in real charting, trim them to declutter. Confirm with Miruya.
- **PROM — freeform text, blank by default.** Ward writes "limited" only on rows with a noticed limitation (hypertone or joint). MAS column beside it tells the story (high MAS + limited = tone-driven; MAS 0 + limited = contracture/joint). PDF renders limited PROM in **red** (borang convention) — milestone-2 detail.
- **MAS dropdown:** `0, 1, 1+, 2, 3, 4`
- **Grey-out map — honored, greyed cells non-fillable.** Borang shades certain PROM cells (scapula movements, some hip rotations) as not-clinically-meaningful. **MUST be transcribed cell-by-cell from a clean copy and any ambiguous cells confirmed with Miruya BEFORE the blueprint is finalized** — no CC guessing on the shading. (Scan is fuzzy in spots.)
- NT stamp applies to MMT + MAS dropdown cells
- **Dropdown system states (MMT + MAS):** beyond the frozen clinical scales above, both dropdowns carry a trailing `NT` option (a *state*, not a grade/score). This is what lets the NT stamp round-trip on reload — a stamped value the `<select>` has no option for is silently lost. Blank stays `''` (no option selected); greyed cells emit no key at all.
- Scroll: 6 data cols = widest grid → this is where the backlog `.mov-table-wrap overflow-x: auto` fix finally earns its keep. SCI gives the queued fix its reason.

### 3. Functional Evaluation — 5 sub-blocks, DIFFERENT keys (do not broadcast one key)
- **A. Body Handling Skills** — key **U/A/S/I**. Rows: Roll side to side, Come to sit, Shift, Raise (off pressure)
- **B. Balance** — key **G/F/P** (different!). Rows: Static, Dynamic
- **C. Transfer** — key **U/A/S/I**. Rows: Bed, Chair, Floor, Car, Toilet/Commode Chair
- **D. Wheelchair Mobility** — key **U/A/S/I**. Rows: Level Propulsion, Ramp, Curbs, Rough Terrain, Wheelie
- **E. Walking (with/without aids)** — key **U/A/S/I**. Rows: Sit to stand, Level, Rough Surface, Stairs
- One dropdown per row (no L/R split, whole-body tasks)
- **NT added to every functional row** (covers "didn't attempt / not assessable")
- **Collapsed `+Note` per sub-block**, expands on tap. Keeps resting layout clean. **Note value saves and round-trips regardless of collapsed/expanded state; re-expands on reload if a note exists.** (Miruya's real behavior = cross out the pick and write what's needed; the note preserves that margin-scribble.)

### 4. Upright Control — labelled "(Incomplete)"
- Rows: Hip, Knee, Ankle
- Columns (4 data): Flex L, Flex R, Ext L, Ext R
- Key: **G/F/P** + **N/A** (`N/A` is a real selectable dropdown option, normally set via the block stamp — it must live in the options array so it round-trips, not conjured by the stamp)
- **Block-level "Mark block N/A" stamp button** (same reusable component, fills blanks with N/A). Rationale: block is clinically N/A for complete-injury patients; a loaded/ADHD/novice user shouldn't grind 12 cells of N/A by hand. N/A here = "doesn't apply to this injury level," distinct from NT and blank.

### 5. Proprioception — simplest grid
- Rows: Shoulder, Elbow, Wrist, Thumb, Hip, Knee, Ankle, Big Toe
- Columns (2 data): R, L
- Dropdown: **N / I / A / NT**
- No stamp button needed (short, applies to everyone)

---

## ASSEMBLY LAYER (the easy half)

### Pure copy from NEURO (textareas, zero decisions)
Doctor's Diagnosis · Doctor's Management · Problem · Special Questions (Date of Surgery, Occupation, Investigation) · Current History · Past History · Physiotherapist Impression · Short Term Goals · Long Term Goals · Plan of Treatment.
Patient-identity header comes free from `initFormContext`.

### Borrowed components
- **Pain Score** — existing VAS, Pre + Post. Lifted whole.
- **Respiratory Evaluation** — maps to CR (BURN already borrowed this path). Breathing Pattern ticks (neck accessory muscle / apical / abdominal / diaphragm), Cough (functional / weak / non-functional), Diaphragm Function (VC + PEFR number entries). OPEN (smol): sanity-check it matches what Miruya actually fills.

### Small fields
- **Assistive Aids** — Wheelchair (Standard / Light Weight / Power) **multi-select**; Cushion (Jay / Air Filled / Foam) **multi-select**; Orthosis = free text ("please state"). Multi chosen because a patient *could* own multiple even if usually using one; multi represents everything single can plus the edge case.
- **Outcome Measures** — 10 Meter Walk Test (time), SCIM (score), WISCI (score). Lean: plain labelled inputs. OPEN (smol): confirm input style.
- **Skin Integrity** — textarea (pressure-sore risk etc.)
- **Home Environment** — textarea (flat / double-storey / modifications)

### Clinical templates source
The Best Statement **DATA / STATEMENT** grid (pp.15–26) is the source for the Impression / STG / LTG / Plan SMART statement arrays. When we reach `clinical_templates.js`, it's transcription, not authoring. (Author proper discrete SMART statements per WORKFLOW, don't copy vague category headers.)

---

## CC blueprint guardrails (write these into the prompt)

1. **Sensory is a TABLE, not `bodychart.js`.** Bold this. Highest-risk autopilot error.
2. **Grey-out map confirmed cell-by-cell before build.** No guessing on shading.
3. **Stamp buttons non-destructive** (fill blanks only).
4. **Collapsed `+Note` still saves + round-trips**, re-expands on reload if populated.
5. **Functional eval: each sub-block its own key.** Balance = G/F/P; the rest = U/A/S/I.
6. **Four cell states distinct in data + PDF:** blank / NT / N/A / real value.
7. Follow the WORKFLOW 13-step add-form checklist. `window.Form` contract. `collect()` returns BOTH `_form_type:'SCI'` AND `meta:{form:'SCI'}`. Add `SCI` to `REQUIRED_FIELDS` in database.py.

## Sequencing
**Fix A first** (PDF-registry fold, prompt already banked in Notepad++) so SCI's PDF wiring is a one-row registry edit. Then write the SCI form blueprint from this doc.

## Still open ("smol2" — revisit when fresh)
- MMT dropdown: keep or trim `2-` / `2+`
- Respiratory block sanity-check vs ward fill
- Outcome Measures input style confirm
- Exact UI label text: "Mark block N/A", "+Note" (Miruya's taste call)
- Optional static dermatome reference image beside sensory table (taste call)
- Grey-out map confirmation (required pre-build step, between Miruya + Claude)
