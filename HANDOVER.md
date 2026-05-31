# HANDOVER.md — Current Session State

Last updated: 2026-05-31

---

## Where we left off

Session L. Fixed BURN PDF body-chart marker dots rendering all blue. Added 6 burn-depth keys to
MARKER_COLORS in pdf_base.py (now 12 keys, zero collisions), mirroring form_burn.js
BodyChart.configure(). Verified by rasterized PNG: 6 distinct colours on the anterior figure,
zero blue fallthrough; test PDF +1,007 bytes over sparse baseline. Code commit 8086492
(pdf_base.py + BACKLOG.md).

---

## Half-done

None — fix complete and committed; docs commit + worktree merge are the only remaining steps.

---

## Next session priorities

1. **Cross-form body chart marker bleed (BACKLOG, data integrity)** — markers persist across
   form-type swap, can save into wrong record. Ranks above Pass 3.
2. **BURN Pass 3** — `_buildMpisBurn()` in main.js + wire into `copyToMpisAuto()` switch.
3. **CSS batch (style.css)** — dark-mode `<select>` garbled + `.mov-table-wrap` overflow-x:auto.
4. **DESIGN_SYSTEM.md split** — still ~312 lines, over 250 ceiling, deferred since Session C.

---

## Gotchas discovered this session

- **Body chart marker data key is `bodyChart` (camelCase), NOT `body_chart`.** A snake_case test
  payload renders "No markers recorded" silently — no error. → logged in WORKFLOW.md anti-repeat rules.
- **A render test that doesn't verify pixels is a hollow pass.** First burn-PDF "render OK" drew
  an empty chart twice (off-canvas float coords, then wrong data key) and reported success.
  Rasterize page to PNG and LOOK before trusting any visual-output test. → logged in WORKFLOW.md.
- **Two MARKER_COLORS dicts exist:** `pdf_base` (dot-colour truth, used via lazy import in
  BodyChartFlowable) and `pdf_platypus_base` (pain-only, drives legend, falls back to raw type
  string on miss). NOT a dead twin — both live. Logged in BACKLOG.

---

## What to skip for now

Pass 3, CSS batch, DESIGN_SYSTEM split — see BACKLOG. Do NOT fix anything by touching
bodychart.js (browser side already correct; browser and PDF colours are separate lookups).
