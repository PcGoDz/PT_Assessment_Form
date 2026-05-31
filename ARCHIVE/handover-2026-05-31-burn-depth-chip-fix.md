# HANDOVER.md — Current Session State

Last updated: 2026-05-31

---

## Where we left off

Session K. Shipped the burn body chart depth-chip fix (commit 99f4e5d, on main, origin synced).
Root cause: §09 depth chips in burn.html were relabeled to burn-depth in the UI but their
data-ptype still carried MS pain codes (ache/sharp/etc.), so markers saved pain values, not
depth. Fix made bodychart.js vocabulary-configurable: COLORS/LABELS const→let; new
configure({colors,labels}) merge method exposed in the API; renderList() falls back to raw type
string when no LABELS entry; init() reads activeType from the .pt-chip.active chip's data-ptype
(null-guarded, defaults to 'ache'). burn.html §09 data-ptype values changed to literal depth
strings; form_burn.js calls BodyChart.configure() with six depth→hex colours at IIFE load. MS
untouched — never calls configure(), keeps default pain vocab. Files: bodychart.js, burn.html,
form_burn.js. Verified by smoke test — depth labels correct in live list AND PDF text.

Two follow-on bugs surfaced during smoke test — logged in BACKLOG, not started.

---

## Half-done

None — depth-chip fix is complete and shipped.

---

## Next session priorities

1. **Cross-form body chart marker bleed (BACKLOG)** — data-integrity, ranks above Pass 3.
   Markers persist across form-type swap, can save into wrong record.
2. **BURN Pass 3** — `_buildMpisBurn()` in main.js + wire into `copyToMpisAuto()` switch.
3. **BURN PDF marker dots all blue (BACKLOG)** — cosmetic, PDF colour map keys on old pain vocab.
4. **CSS batch (style.css)** — dark-mode `<select>` garbled + `.mov-table-wrap` overflow-x:auto.
5. **DESIGN_SYSTEM.md split** — still ~312 lines, over 250 ceiling, deferred since Session C.

---

## Gotchas discovered this session

- **Browser marker colours and PDF marker colours are SEPARATE lookups.** configure() fixed the
  browser side; ReportLab's server-side colour map still keys on pain vocab, so depth markers
  fall back to default blue. Fixing one doesn't fix the other.
- **A smoke-test "regression" can be a newly-exposed pre-existing bug.** Cross-form marker bleed
  looked like a new fail but was pre-existing — the depth fix just made always-leaking markers
  legible. Check new-breakage vs newly-visible before calling something a regression.

---

## What to skip for now

- Pass 3, CSS batch, DESIGN_SYSTEM split, patient-page-direct — see BACKLOG.
- Do NOT fix PDF blue dots by touching browser bodychart.js — separate PDF-side map.
