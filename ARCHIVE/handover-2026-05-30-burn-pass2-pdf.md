# HANDOVER.md — Current Session State

Last updated: 2026-05-30

---

## Where we left off

Session J. BURN Pass 2 shipped — `pdf_burn.py` created and merged to main. Mirrors
`pdf_hand.py`: `page_header` + `patient_bar`, `two_col` text blocks, full-width tables each
behind a `_has_data()` guard, `plan_section()` quadrant, `sign_chop_block()` footer. Chest
measurement renders all six fields (apical/middle/lower_costal + their `_status` counterparts)
— the CR-palpation silent-drop was avoided. `LungDiagramFlowable` imported from `pdf_cr`, not
reimplemented. Wired into `_PDF_GENERATORS` + `_SINGLE_PDF_GENERATORS` in app.py; added
`('pdf_burn.py', '.')` to `pt_assessment.spec` datas.

Verified three ways: Miruya's manual full-form fill (23/23 smoke checklist; single-record
export AND episode export with a SOAP note both render clean), plus the generator script's
dense (12.4 KB) vs sparse (7.4 KB) round-trip — the 5 KB gap confirms `_has_data` guards fire
(sparse strips every table, keeps labelled text boxes and "No markers recorded").

---

## Half-done

- BURN Pass 3 (MPIS `_buildMpisBurn`) — not started. Pass 2 is stable, so this is now unblocked.
- DESIGN_SYSTEM.md still ~312 lines — over the 250 ceiling. Split deferred since Session C.

---

## Next session priorities

1. **Burn body chart depth-chip wiring bug (NEW, clinical accuracy).** `burn.html` §09 chips
   display burn-depth labels but placed markers save MS pain-type values (sharp/refer/ache)
   instead of the selected depth. Depth chip is cosmetic — value not wired through to the
   `BodyChart` marker write. Affects `form_burn.js` / `bodychart.js`. PDF render is correct
   (`burn_dense.pdf` prints depth labels when fed depth values) — bug is upstream in the form.
2. **BURN Pass 3** — `_buildMpisBurn()` in main.js + wire into `copyToMpisAuto()` switch
   (BURN branch). No per-form wrapper.
3. **CSS pass (batch)** — dark-mode `<select>` garbled/zigzag + `overflow-x:auto` on
   `.mov-table-wrap`. Both style.css; batch together.
4. **DESIGN_SYSTEM.md split** — over ceiling since Session C.
5. **patient-page-direct branch** — investigate and resolve (cherry-pick or force-delete).

---

## Gotchas discovered this session

- **Relabeling a UI control ≠ rewiring its value.** Burn body chart chips were relabeled
  MS-pain-type → burn-depth in the UI, but the marker-write path still emitted pain-type
  values. Form displays "Deep partial", record stores "Sharp", PDF faithfully prints "Sharp".
  A cosmetic relabel without a data-path rewire is a silent clinical-accuracy bug. Migrated to
  WORKFLOW.md Anti-Repeat Rules.
- **When output labels look wrong, check what the data layer emits before blaming the render.**
  `body_chart_section()` renders raw `type` strings correctly — it was never the bug; the form
  fed it pain types. Cost a detour before a grep settled it.
- **Windows bare `py script.py` / double-click closes the terminal on completion.**
  `smoke_burn_gen.py` looked like it failed (window flashed and closed) but had succeeded. Run
  from an IDE or a self-opened cmd to see stdout.

---

## What to skip for now

- BURN Pass 3 MPIS — priority 2, its own pass.
- Body chart legend depth-label map — NOT needed; base renders raw depth strings correctly.
  Do not add a map.
- CSS batch, DESIGN_SYSTEM split, patient-page-direct — see BACKLOG.
