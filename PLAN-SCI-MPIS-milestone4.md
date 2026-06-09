# PLAN — SCI MPIS (Milestone-4)

Written 2026-06-09. Branch: `claude/pensive-poitras-c94773`. Plan-first; CC executes after vet.
**REV 2** — restructured flat→SOAPIER after reading WORKFLOW.md MPIS canon.

---

## Goal

Give SCI a working "Copy to MPIS" output. `copyToMpisAuto()` (main.js:1023, switch at :1032) has
**no SCI branch** → SCI falls through to `_buildMpisMs()` (wrong headings/fields). M4 closes the gap.

Plain text for clipboard paste into MPIS (POMR). No API, no new abstractions. Ship-crude.

---

## Canon (from WORKFLOW.md — "MPIS Pattern" section)

New MPIS builders follow **HAND's SOAPIER** structure, NOT the older flat format (MS/SPINE/CR/NEURO).
SOAPIER = five top-level `dash`-delimited sections:
**SUBJECTIVE / OBJECTIVE / ANALYSIS / PLAN / INTERVENTION**, clinical sub-blocks nested inside,
each guarded by a `has*` check so empty blocks are skipped (not rendered empty).

Rules (from canon):
- Builder is PRIVATE + SYNC. Returns `parts` array. ZERO `copyText`/`await`/modal calls inside.
- `_doCopyMpis()` is the sole copy path; `copyToMpisAuto()` the sole dispatch.
- Shared constants `MPIS_LN/MPIS_DIV/MPIS_DASH` — use, never redeclare.
- Read the form's OWN `collect()` for field access (SCI = nested objects, like BURN/CR).
- Guard each objective sub-block with `has*` so blanks skip.

---

## Scope (what changes)

**One file: `static/js/main.js`. Two edits.**

1. **NEW `_buildMpisSci()`** — place after `_buildMpisBurn`, before `copyToMpisAuto`.
2. **Dispatch wiring** — in `copyToMpisAuto` switch (~line 1038, after BURN, before the
   `else ... _buildMpisMs()` fallback):
   `else if (formType === 'SCI') parts = _buildMpisSci();`

NO changes to `form_sci.js`, `sci.html`, `pdf_sci.py`, or any shared helper.

---

## SCI data contract (verbatim from form_sci.js collect())

```
patient,
diagnosis, dr_management, problem,
special_questions: { date_surgery, occupation, investigation },
current_history, past_history,
sensory[], mmt[], upright_control[], proprioception[],
functional: { body_handling[], balance[], transfer[], wheelchair[], walking[],
              notes:{ body_handling, balance, transfer, wheelchair, walking } },
respiratory: { breathing_pattern[], cough, vc, pefr },
pain: { pre, post },
assistive_aids: { wheelchair[], cushion[], orthosis },
outcome_measures: { tenmwt, scim, wisci },
skin_integrity, home_environment,
pt_impression, stg, ltg, plan
```

Grid `getData()` = list of dicts `{label, <colId>:val, ...}`. Greyed cell = key ABSENT.
Blank = `''`. NT / N/A pass through.

RESOLVED — patient type key: `FormBase.collectPatient()` emits **`type`** (form_base.js:103).
Use `p.type === 'local'` (same as HAND). NEURO's `p.pt_type` reads a non-existent key — latent NEURO
bug, NOT ours to fix tonight.

---

## Local helpers inside _buildMpisSci

```js
var d = window.ActiveForm ? window.ActiveForm.collect() : {};
var p = d.patient || {};
var DIV = MPIS_DIV, dash = MPIS_DASH;
var parts = [];
function line(label, val) { if (val && String(val).trim()) parts.push(label + String(val).trim()); }
function chips(label, arr){ if (arr && arr.length) parts.push(label + arr.join(', ')); }

// four-state grid serializer. cols: [[colId,'Label'], ...]
function grid(title, rows, cols) {
  if (!rows || !rows.length) return;
  var body = [];
  rows.forEach(function (r) {
    var vals = cols.map(function (c) {
      if (!(c[0] in r)) return null;            // greyed -> skip cell
      var v = r[c[0]];
      return c[1] + ':' + (v === '' ? '—' : v); // blank -> em-dash
    }).filter(Boolean);
    if (vals.length) body.push('  ' + (r.label || '') + '  ' + vals.join('  '));
  });
  if (!body.length) return;                      // empty grid -> omit (confirmed)
  parts.push(title);
  body.forEach(function (l) { parts.push(l); });
  parts.push('');
}
```

Column maps (mirror form_sci.js exactly):
- sensory: `[['pp_l','PP L'],['pp_r','PP R'],['lt_l','LT L'],['lt_r','LT R']]`
- mmt: `[['mmt_l','MMT L'],['mmt_r','MMT R'],['prom_l','PROM L'],['prom_r','PROM R'],['mas_l','MAS L'],['mas_r','MAS R']]`
- upright: `[['flex_l','Flex L'],['flex_r','Flex R'],['ext_l','Ext L'],['ext_r','Ext R']]`
- proprioception: `[['r','R'],['l','L']]`
- functional (all 5): `[['val','Grade']]`

---

## Structure — SOAPIER

### Header
`SPINAL CORD INJURY ASSESSMENT` + `DIV`; Name/Date; IC/Age or Passport/Country/Age + Sex
(local-vs-foreign branch via `p.type === 'local'`); blank.

### 1. SUBJECTIVE  (`dash` + 'SUBJECTIVE ASSESSMENT' + '')
- `line('Diagnosis        : ', d.diagnosis)`
- `line("Doctor's Mgmt    : ", d.dr_management)`
- `line('Problem          : ', d.problem)`
- blank
- **SPECIAL QUESTIONS** (guard: any of sq.* present) — Date of Surgery / Occupation / Investigation
- blank
- `line('Current History  : ', d.current_history)`
- `line('Past History     : ', d.past_history)`
- blank
- **PAIN SCORE** (guard: pain.pre || pain.post) — `PRE: x/10   POST: y/10`

### 2. OBJECTIVE  (guard hasObj = any grid non-empty OR any resp/aids/om/skin/home present)
`dash` + 'OBJECTIVE ASSESSMENT' + ''
- `grid('SENSORY (Pin Prick / Light Touch)', d.sensory, …)`
- `grid('PROPRIOCEPTION', d.proprioception, …)`
- `grid('MMT / PROM / MAS', d.mmt, …)`
- `grid('UPRIGHT CONTROL', d.upright_control, …)`
- **FUNCTIONAL** — five `grid()` calls (Body Handling, Balance, Transfers, Wheelchair, Walking),
  THEN notes grouped (confirmed): `line('Body Handling Notes : ', f.notes.body_handling)` etc.
- **RESPIRATORY** (guard) — `chips('Breathing Pattern : ', resp.breathing_pattern)` /
  `line('Cough : ', resp.cough)` / `line('VC : ', resp.vc)` / `line('PEFR : ', resp.pefr)`
- **ASSISTIVE AIDS** (guard) — `chips` Wheelchair / Cushion / `line` Orthosis
- **OUTCOME MEASURES** (guard) — `line` 10MWT / SCIM / WISCI
- **SKIN INTEGRITY** (guard) — `line`
- **HOME ENVIRONMENT** (guard) — `line`

### 3. ANALYSIS  (guard: d.pt_impression)
`dash` + 'ANALYSIS' + '' + `d.pt_impression` + ''

### 4. PLAN  (guard: d.stg || d.ltg)
`dash` + 'PLAN' + '' + `Short-term Goals: …` / `Long-term Goals : …` + ''

### 5. INTERVENTION  (guard: d.plan)
`dash` + 'INTERVENTION' + '' + `d.plan` + ''

`return parts;`  (no trailing DIV — HAND doesn't; `_doCopyMpis` handles wrap/header.)

---

## collect -> MPIS coverage audit (WORKFLOW Anti-Repeat: collect/PDF/MPIS cross-check)

Every field SCI `collect()` emits is rendered somewhere in the SOAPIER output. Verified field-by-field
2026-06-09. **0 collected fields unrendered** — no `neuro.muscles`-style silent drop.

- SUBJECTIVE: diagnosis, dr_management, problem, special_questions.{date_surgery,occupation,
  investigation}, current_history, past_history, pain.{pre,post}
- OBJECTIVE: sensory, proprioception, mmt, upright_control, functional.{5 grids + 5 notes},
  respiratory.{breathing_pattern,cough,vc,pefr}, assistive_aids.{wheelchair,cushion,orthosis},
  outcome_measures.{tenmwt,scim,wisci}, skin_integrity, home_environment
- ANALYSIS: pt_impression · PLAN: stg, ltg · INTERVENTION: plan
- META (not rendered, correct): _form_type, meta, patient (-> header block)

## Bible-compliance notes (from full WORKFLOW.md read)

- **Nested field access** — SCI collect() is NESTED (`d.pain.pre`, `d.respiratory.cough`), like
  BURN/CR — NOT flat like HAND. Plan reads nested throughout. ✓
- **No sibling sub-block to borrow** — SCI respiratory is simple (breathing_pattern chips + cough/
  vc/pefr), no lung diagram. Nothing to borrow from CR/BURN. ✓
- **escapeHtml does NOT apply here** — builder returns a plain-text array for clipboard, not innerHTML.
  XSS/escapeHtml is the header-modal's job, handled by `_doCopyMpis`, not the builder. ✓
- **Known cosmetic (BACKLOG, accepted):** MMT rows with `+` suffix on L value (e.g. `L: 2+`) misalign
  the R label slightly. Do NOT chase — it's a logged nice-to-have, not an M4 bug.

## Verification (after CC writes) — read committed bytes via git, NOT raw mount read

1. App boots, SCI form opens.
2. Fill fields + grid cells + a stamped NT + a greyed row -> Copy to MPIS.
3. Output heading reads SPINAL CORD INJURY; five SOAPIER sections present.
4. Dispatch hits `_buildMpisSci`, NOT `_buildMpisMs`.
5. Greyed MMT cells (e.g. `HIP Int. Rot` mmt_l/r) absent from output.
6. Blank cells -> em-dash; NT/N-A pass through.
7. Empty grids/sub-blocks omitted (no orphan headings).
8. Foreign-patient header branch renders Passport/Country.
9. Long free-text wraps; no console errors; clipboard toast fires.
10. **`node --check static/js/main.js`** passes before packaging (JS Rules, mandatory).

---

## Decisions (RESOLVED with Miruya 2026-06-09)

- **SOAPIER not flat** — follow HAND canon (WORKFLOW.md). SCI is a new form.
- **Omit-empty grids/blocks** — CONFIRMED. `has*` guards everywhere.
- **Functional notes grouped** — all 5 grids first, notes together after.
- **Cough** — plain `line('Cough : ', resp.cough)` pass-through of the single radio
  (`Functional` / `Weak` / `Non-functional`). NO schema change. (Two-axis "Cough Ax: productive/
  effective" is the CR form's thing — do NOT port to SCI.)

## Out of scope

SCI stamp-button restyle · DB migration Fix B · pair_box promotion · other forms' MPIS.

## Scope guard

ONE file: `static/js/main.js`. Two edits. Nothing else touched.
