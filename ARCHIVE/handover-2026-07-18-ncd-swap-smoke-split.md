# HANDOVER.md — Current Session State

Last updated: 2026-07-18

---

## Where we left off

NCD template swap SHIPPED. `038f9f4` merged into main as `ae807ec`. `TEMPLATES.NCD` and
`TEMPLATES.NCD_SOAP` in `clinical_templates.js` re-aimed from knee-OA to obesity/metabolic —
content-only, keys unchanged, verbatim from `docs/superpowers/specs/2026-07-14-ncd-template-content.md`
(verified by string-match against the spec, not eyeball).

---

## Half-done

- **`PT_Assessment-worktrees/upbeat-haslett-1fb10a` — git-side pruned, folder lingers (Windows
  CWD lock).** Branch `claude/upbeat-haslett-1fb10a` already deleted local + remote. Manual
  `rmdir /s /q` once no session holds the folder as CWD.
- **exe build + v3 migration check on a real v2 db** — still deferred (carried from 2026-07-12).

---

## Next session priorities

1. **VESTIBULAR build** — execute `docs/superpowers/plans/2026-07-14-vestibular.md` task by task.
   Both vet fixes are already folded into the plan text; no further doc edit needed before
   starting Task 1.
2. **DESIGN_SYSTEM.md / WORKFLOW.md split** — DESIGN_SYSTEM.md is 30 lines over its 250 cap;
   WORKFLOW.md is 248/250 and blocked on the same unresolved split. Two docs now stuck behind
   one file-split job.
3. exe build + v3 migration check on a real v2 db (carried, lower priority than 1-2).

---

## Gotchas discovered this session

- **A rule banked only in session memory is not a rule.** The CC/Miruya smoke split was agreed
  2026-07-12 but never landed in a bible — blocked on the WORKFLOW.md 250-line cap, left in
  memory instead. It regressed this session: the CC prompt contained a browser click-test, CC
  spent ~14 min driving Claude Browser through the NCD form, and Miruya sat watching a robot do
  his half of the job. Fixed properly this session — migrated to RULES.md (both halves: Miruya's
  job gains the browser pass, Claude's "Don't do" gains the ban on writing browser steps into CC
  prompts).
- **Second leak: spec docs written before the split rule carry browser-verify instructions in
  their own "verify" sections.** Building a CC prompt from a spec inherits the violation. Check
  verify blocks against the split before handing any spec-derived prompt to CC. Fixed this
  session in `docs/superpowers/plans/2026-07-14-vestibular.md` Task 8 Step 2 and Task 13 Step 1 —
  both now attribute the browser click-test to Miruya, matching every other browser step in that
  plan.
- **DESIGN_SYSTEM.md is at 280 lines — already 30 over its 250 cap.** Newly discovered, not
  previously flagged. Needs a split. WORKFLOW.md still 248/250 and still blocked on the same
  problem. Two files now stuck behind one unresolved split.
- **BACKLOG.md at 227/250 — approaching the cap.**

---

## What to skip for now

VESTIBULAR build (plan ready, not started). PAEDIATRIC / LYMPHOEDEMA / GENERAL still not ready.
home.html dashboard UI pass. Full deferred list in BACKLOG.md.
