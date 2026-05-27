# HANDOVER.md — Current Session State

Last updated: 2026-05-26

---

## Where we left off

Session D complete (partial). Rewrote `_buildMpisHand()` in `static/js/main.js` (~line 1388) to SOAPIER structure with patient header block. Caught and fixed MMT silent data loss in MPIS — `d.neuro.muscles` was collected by `form_hand.js` since Session A but never rendered (same pattern as PDF Session C catch). Hand chart markers now render as `#hm1 (Pain) - Left Palmar` (verified actual marker shape `{id, hand, type, x, y}` — no `zone` field, no `view` field).

Scope miss discovered after implementation: Opus drafted target shape from partial mental model of HAND form, omitted 10 sub-blocks from coverage. MMT fix is correct and shipped; full block coverage parked for tomorrow on same branch. `WORKFLOW.md` Anti-Repeat rule updated to cover collect→PDF→MPIS triangle. Branch NOT merged, NOT pushed — intentional, continuation tomorrow.

---

## Half-done

- Branch `claude/mystifying-banach-fff0d9` open, not merged, not pushed
- `_buildMpisHand()` covers ~60% of `collect()` fields. Missing 10 sub-blocks (see BACKLOG for full audit list)
- HAND form `templates/forms/hand.html` NEUROLOGICAL TEST table has broken HTML structure — wrap-around grid, header cells in wrong columns. Data collects correctly, PDF/MPIS render correctly, only form UI affected

---

## Next session priorities

1. Read `form_hand.js collect()` lines 100–223 in full BEFORE drafting anything
2. Draft revised SOAPIER target shape covering ALL collected fields (audit list in BACKLOG)
3. Patch `_buildMpisHand()` on existing branch — append missing blocks, don't rewrite
4. Smoke test: full record + sparse record + per-block-empty records
5. Merge + push branch

---

## Gotchas discovered this session

- **HAND marker shape has no `zone` field.** Shape is `{id, hand: 'R'|'L', type, x, y}` — not `{id, zone, type, view}` as the plan spec assumed. Grep `handchart.js getData()` before writing any MPIS builder that uses chart markers.
- **`mpisSec()` always prepends a dash.** Use only for SOAPIER major section headers. Sub-headers within a block (OBSERVATION, PAIN SCORE, etc.) use raw `parts.push()` — no dash.
- **HAND uses `d.neuro.muscles` and `d.neuro.reflexes`.** Top-level `d.muscles` does not exist. Drill through `neuro` or MMT/reflexes silently renders nothing.
- **`HandRomTable.collect()` and `HandCircTable.collect()` return row arrays.** Exact row shape needs grepping their JS files before writing render blocks — don't assume flat field names.
- **DESIGN_SYSTEM.md at 311 lines — over 250-line ceiling.** Still unfixed from Session C flag. Needs splitting into `DESIGN_SYSTEM-form-html.md` + `DESIGN_SYSTEM-pdf.md` before next major session.

---

## What to skip for now

- Merging Session D branch — intentional, continues tomorrow
- HAND form NEUROLOGICAL TEST table HTML rebuild — parked to BACKLOG
- MS-as-MPIS-canon SOAPIER refactor for other forms — parked until HAND ships
- BURN form scoping — still next probable build target, not tomorrow
