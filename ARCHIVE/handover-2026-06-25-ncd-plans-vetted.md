# HANDOVER.md — Current Session State

Last updated: 2026-06-25

## Where we left off

NCD implementation plans **written + cold-vetted + committed** (on main). Design-only session — NO code written yet. The plans split into two build-ready deliverables:
- **Plan A** — `docs/superpowers/plans/2026-06-25-ncd-form-plan-A.md`. Initial snapshot form (rungs 1–7, 12 tasks). A pure standard form build, zero schema change — saves a normal `records` row, exports PDF + MPIS like every other form. Novel pieces: 7-figure body-shape PNG picker (WYSIWYG screen+PDF) and derived BMI/WHR readouts.
- **Plan B** — `docs/superpowers/plans/2026-06-25-ncd-form-plan-B.md`. Per-visit measurements + trend (rungs 8–10, 7 tasks). The net-new/high-risk surface: v3 `ncd_measurements` migration, additive SOAP-modal injection (form-type guarded — the RED LINE), screen-only trend page (inline-SVG sparklines, never touches PDF/MPIS).

Split decided via writing-plans Scope Check against live code. Plan A is independently shippable; Plan B depends on Plan A's `form_type='NCD'` episodes existing.

## The one real bug caught + fixed in the cold vet (session_no alignment)

The first plan draft aligned `ncd_measurements` to `soap_notes` by two parallel `MAX(session_no)+1` counters. That is FALSE by construction for NCD's flow:
- Visit 1 = full assessment → writes the `records` row + a measurement row, but NO SOAP note (SOAP notes start at visit 2; clinically confirmed).
- After visit 1: measurements has 1 row, soap_notes has 0. First follow-up: `save_soap` → session 1, `save_ncd_measurement` → session 2. **Off-by-one for every patient on the default path**, silently desyncing the trend from the SOAP timeline.

**Fixed BY CONSTRUCTION** (Plan B Task 1–2, baked in so it can't be re-derived wrong at build time): nullable `soap_id` FK on `ncd_measurements` (assessment row = NULL, follow-ups = the SOAP note's id), `save_ncd_measurement` upserts on the `(episode_id, soap_id)` natural key, trend orders by `note_date`. `session_no` demoted to an informational counter only — nothing aligns on it. Editing/prefilling matches by `soap_id` FK lookup (`loadForSoap`), never a guessed session_no.

Other vet riders folded in: battery keys FROZEN as a contract in Plan A `collect().measurements` (Plan B imports verbatim — no key-guessing); validator `py -c` made a hard gate; `note_date = patient.date` for visit-1 flagged as a deliberate choice.

## Rollout decision (Miruya's clinical/ship call)

Ship NCD `ready=True` the moment Plan A merges — single-user app, he needs the picker to smoke-test, no one else is exposed. Do NOT hold it at `ready=False`. (This resolves the one open seam Plan A left for him.)

## Next session priorities

1. **BUILD Plan A first** — the standalone working snapshot form. Smoke-test on the worktree, merge, THEN start Plan B.
2. **Then Plan B** layers the measurements/trend machinery on top.
3. Each plan's final task carries the pre-ship smoke-test checklist (Plan A Task 12, Plan B Task 7). Plan B Task 4 Step 6 + Task 7 carry the mandatory NON-NCD SOAP-modal regression test (the RED LINE).

## Half-done

- Nothing code-level (planning session).
- Figure assets 1 + 4 still need the ~2min top-crop (faint leg-bleed smudge at top edge). Folded into Plan A Task 11 — will be done during the build.

## Gotchas / notes

- **main is ahead of origin** by the local commits: `255410c` (NCD spec + 7 PNGs), `93f2693`/`40b86ae` (plans), plus the merge commit. Push timing is Miruya's call — he said push AFTER NCD ships. Leave unpushed unless told otherwise.
- Plan B's RED LINE: episode.html's SOAP modal is shared by all 15 forms. The NCD panel is additive + form-type-guarded. If during build the panel ever needs markup that won't fit additively, STOP and flag — do not restructure the shared modal.

## What to skip for now

VESTIBULAR / PAEDIATRIC / LYMPHOEDEMA / GENERAL. exe build (deferred tonight — budget + late). See BACKLOG.md for the full deferred list.
