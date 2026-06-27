# HANDOVER.md — Current Session State

Last updated: 2026-06-27

## Where we left off

**NCD Plan A SHIPPED.** Merged to main at commit `74c0991` (merge commit) on 2026-06-27. Branch `claude/vigilant-gauss-c07678` deleted; worktree git-record pruned (folder may need manual `rmdir /s /q` if still on disk).

### What Plan A delivered (15 files, 1221 insertions)

- `templates/forms/ncd.html` — 11-section form (MSK-canonical flow: Patient → Subjective → History → Special Questions → Observation → Body Chart & Shape → Vital Signs → Body Composition → Fitness Tests → PT Impression → Goals & Plan)
- `static/js/form_ncd.js` — collect/populate/reset, body-shape 7-PNG picker, BMI/WHR derive, marital/lifestyle chips
- `pdf_ncd.py` — full PDF generator with body-shape PNG embed (WYSIWYG), KKM ref `fisio / b.pen. 17 / 2019`
- `static/js/main.js` — `_buildMpisNcd()` SOAPIER builder + `copyToMpisAuto()` NCD branch
- `static/js/clinical_templates.js` — `TEMPLATES.NCD` (impression/goal/stg/ltg/treatment) + `TEMPLATES.NCD_SOAP`
- `templates/episode.html` — `tplMap` NCD→NCD_SOAP + 2 formLabel maps
- `templates/home.html` — picker card activated + FORM_LABELS + formLabel + icon maps
- `templates/patient.html` — picker card activated + Jinja form_labels + form_icons
- `database.py` — `REQUIRED_FIELDS['NCD']` (diagnosis + impression)
- `app.py` — `import pdf_ncd` + FORM_REGISTRY NCD `ready=True`
- `pt_assessment.spec` — `pdf_ncd.py` + `static/img/ncd_shapes` in datas
- `static/img/ncd_shapes/ncd_shape_1_inverted_triangle.png` + `ncd_shape_4_apple.png` — top-crop cleanup
- `docs/superpowers/specs/2026-06-24-ncd-form-design.md` + `docs/superpowers/plans/2026-06-25-ncd-form-plan-A.md` — updated to 11-section order (post-build revision 2026-06-27)

### Section reshuffle (post-build, same merge)

After the initial 12-task Plan A build, a section reshuffle was applied on the same branch to align NCD with MSK canonical flow. Fields were regrouped (not renamed). collect()/populate()/reset() keys, battery keys, PDF order, and MPIS routing all preserved. Miruya smoke-tested the reshuffled form and confirmed all green before merge.

## Next session priorities

1. **Plan B** — per-visit measurements + trend page. Plan lives at `docs/superpowers/plans/2026-06-25-ncd-form-plan-B.md`. Depends on Plan A's `form_type='NCD'` episodes existing in DB (now satisfied). Key surfaces: v3 `ncd_measurements` migration, additive SOAP-modal injection (form-type-guarded — THE RED LINE), screen-only trend page (inline-SVG sparklines).
2. **git push** — main is ahead of origin by the NCD commits + merge. Push timing is Miruya's call.
3. **exe build** — `build.bat` after push, confirm `pdf_ncd.py` + `ncd_shapes` bundle in the .exe.

## Plan B — critical reminders

- **Session-no alignment (fixed by construction):** `ncd_measurements` uses nullable `soap_id` FK (assessment row = NULL, follow-ups = SOAP note id). Trend orders by `note_date`. Do NOT reintroduce session_no as an alignment key.
- **Battery keys FROZEN** — the `measurements` sub-dict in collect() (`hr`, `rr`, `bp`, `spo2`, `fbs`, `hba1c`, `cholesterol`, `ldl`, `hdl`, `triglycerides`, `height`, `weight`, `bmi`, `waist`, `hip`, `whr`, `subfat*`, `muscle*`, `visceralFat`, `rmr`, `walk6*`, `step3*`, `sitReach`, `flexComment`, `handGrip`, `sitUp`, `pushUp`, `ulComment`, `sitToStand`, `llComment`, `stork`, `balanceComment`) — Plan B imports these VERBATIM. Do NOT rename without updating Plan B in lockstep.
- **RED LINE:** episode.html SOAP modal is shared by all 15 forms. NCD panel must be additive + form-type-guarded. If it can't fit additively, STOP and flag.
- **Plan B Task 4 Step 6 + Task 7** carry the mandatory NON-NCD SOAP-modal regression test (other forms must be unaffected).

## Half-done / worktree cleanup

- Worktree folder `PT_Assessment-worktrees/vigilant-gauss-c07678` may still exist on disk (Windows CWD lock during session). Safe to `rmdir /s /q` once the old session is closed.

## What to skip for now

VESTIBULAR / PAEDIATRIC / LYMPHOEDEMA / GENERAL. exe build (deferred). See BACKLOG.md for full deferred list.
