# HANDOVER.md — Current Session State

Last updated: 2026-06-24

## Where we left off

NCD form design spec written + committed (`docs/superpowers/specs/2026-06-24-ncd-form-design.md`). Full brainstorm via superpowers skill in Cowork. Locked 10 decisions (D1-D10 in spec §1). Core architecture: NCD is the first form to break "one record per episode" — per-visit numeric battery (vitals/bodycomp/fitness) saved to a NEW `ncd_measurements` table (mirrors soap_notes pattern), entered via an NCD-only panel injected into the SOAP modal, read by a new screen-only trend page (infographic style, sparklines, NEVER touches PDF/MPIS). Body shape = 7-figure picker (traced PNGs already extracted to `static/img/ncd_shapes/`, WYSIWYG screen+PDF). Body chart = borrow bodychart.js. Templates = all 5 narrative fields from the Best Statement doc.

## Half-done

- NCD spec is design-only — NO implementation plan yet (next session's job: CC-Opus writes durable plan FROM the spec via writing-plans skill).
- Figure assets need a ~2min top-crop cleanup (figs 1+4 have faint leg-bleed smudge at top edge, noted spec §7).

## Next session priorities

1. CC-Opus (fresh session, Opus): writing-plans skill → durable NCD implementation plan from `docs/superpowers/specs/2026-06-24-ncd-form-design.md`. Spec §11 has 5 open items for the plan author (all have a recommendation).
2. Decide at spec §9 cut line: NCD as one plan, or split initial-form (rungs 1-7) from measurements/trend (rungs 8-10) into two cycles.
3. Commit untracked: the spec + `static/img/ncd_shapes/`. Delete `_ncd_render/` scratch. (DONE this session — see commit below.)

## Gotchas discovered this session

- None code-level (spec-only session). Process note: the body-shape archetype count was 7 (not the 4-5 the prior passover guessed) — the leash (PDF) corrected the memory, as the don't-pre-scope-from-memory flag intended.
- All lingering worktree folders from prior sessions are now GONE — `PT_Assessment-worktrees/` is empty. The BACKLOG worktree-cleanup list is stale and was trimmed this session.

## What to skip for now

VESTIBULAR/PAEDIATRIC/LYMPHOEDEMA/GENERAL. exe build. See BACKLOG.md for the full deferred list.
