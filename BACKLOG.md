# BACKLOG.md — Known Issues & Deferred Work

---

## Open bugs / Cleanup


- **Episode form-type drift on mid-form swap.** Repro: create episode (e.g. BURN) → on the
  form page swap to another form (SPINE) → Save & Return → episode list still labels it BURN.
  Likely same root as the deferred `get_episode_record form-aware` item: episode `form_type`
  set at creation, record `form_type` set at save, never reconciled. TRIAGE QUESTION before
  fixing: does the swapped-form record save with its OWN `form_type` (cosmetic — only episode
  label stale) or inherit the episode's creation type (data-integrity — wrong stored
  `form_type` + wrong downstream PDF, cf. BURN-chip-relabel bug)? Severity depends on answer.

- **Twin `MARKER_COLORS` dicts are a maintenance trap.** `pdf_base.MARKER_COLORS` = dot-colour source of truth (used by `draw_markers()` for rendered dots). `pdf_platypus_base.MARKER_COLORS` = pain-only / legend-fallback — depth keys NOT present. The Session L fix only updated `pdf_base`. If the platypus-side copy is ever wired into a new render path, it will silently emit wrong colours for all burn depth markers. Consolidate (make platypus import from pdf_base) or document the split formally before the dicts drift further. (Corrected from earlier "dead" wording — both are live.)

- **No DB schema version tracking — `try: ALTER / except: pass` migrations (`database.py` lines 80-101).** Schema evolves by attempting `ALTER TABLE ADD COLUMN` and swallowing `OperationalError` when the column exists. Works, but no version stamp means a deployed `records.db`'s schema state is unknowable, and there's no clean place to hang the next migration. Fix: `PRAGMA user_version` gates per migration batch. CRITICAL footgun — existing deployed DBs already have the soap_notes/episodes columns but still report `user_version=0`, so a naive version gate would re-ALTER and crash; keep `try/except` INSIDE the v0→v1 gate as belt-and-suspenders, trust version numbers for v2 onward. Test against a COPY of the real DB. Priority: High (clinical data), Effort: Small-Medium. Surfaced by GPT architecture review 2026-06-02.

- **Cross-form body chart marker bleed (DATA INTEGRITY, pre-existing).** Root cause confirmed
  Session M: `get_episode_record` returns `ORDER BY updated_at DESC LIMIT 1` regardless of
  form type, so landing on Form A in an episode whose newest record is Form B fetches B's data
  and adopts B's record id. Session M fix: form-type guard in `initFormContext()` returns early
  (no populate, no id adoption) when `pageForm !== recForm`. Known accepted limitation: in an
  episode with both Form A and Form B records, opening the form that is NOT the most-recently-
  updated one shows blank instead of auto-loading its own record. Proper fix: see BACKLOG item
  "Make `get_episode_record` form-aware" below.

- **Make `get_episode_record` form-aware (proper fix for marker bleed).** Currently
  `ORDER BY updated_at DESC LIMIT 1` returns the episode's newest record of any form type. The
  Session-M guard in `initFormContext` blocks cross-form populate but, as a side effect, won't
  auto-load a same-form record when a different form is newer in the same episode. Proper fix:
  `get_episode_record(db_path, episode_id, form_type)` →
  `WHERE episode_id=? AND form_type=? ORDER BY updated_at DESC LIMIT 1`; add `?form_type=` to
  the route + the fetch URL in `initFormContext`. Retires the guard's limitation.

- **Global draft key is a second cross-form bleed vector.** `DRAFT_KEY = 'pt_assessment_draft'`
  is a single localStorage key not scoped by form type. A burn draft will offer "Restore" onto
  an MS form (user-initiated, so less silent than auto-load, but same contamination + id
  adoption). Apply the same form-type check in `restoreDraft()` before populate, or scope the
  draft key by form type.

- **`save_record` UPDATE branch never updates the `form_type` column.** On UPDATE it rewrites
  `data_json` but leaves the original `form_type`. A clobbered row can end up with
  `form_type='burn'` but MS `data_json`. Harmless once the Session-M guard lands (the clobber
  path is closed), but worth a one-line note. Low priority.

- **Dropdown/select elements render garbled/zigzag in dark mode.** Global `style.css` issue affecting ALL forms' `<select>` elements. Pre-existing since ~HAND form; made obvious by BurnMov v2's additional selects. Batch fix with mov-table overflow (both `style.css`).

- **Neck (midline joint) offers Left/Right in BurnMov Side dropdown — clinically meaningless.** Midline joints (Neck, possibly Spine) should suppress or blank the Side column. Minor; defer until CSS pass or next BurnMov polish.

- **BURN chest expansion section — no client-side validation.** Chest expansion fields (3 measurements in cm) copied verbatim from CR form. No plausibility check (e.g. values < 0, or expansion smaller than rest). Low priority — clinic staff catch implausible values — but worth noting for a BURN polish pass.

- **home.html + patient.html form picker grids are independently hardcoded.** Both pages have separate picker grids that must be manually updated when activating a new form (step 1.5 now covers both). The structural duplication means every new form needs two manual activations. Consider driving both pickers from a shared data source if the active-form list keeps growing.

- **REGISTRY-DRIFT PATTERN (meta-note, not a separate bug).** Three places require manual edits per new form that should all derive from `FORM_REGISTRY`: (a) the PDF generator dicts in `app.py`, (b) `formLabel`/`form_icons` display maps × 5 sites (episode.html ×2, home.html const + inline, patient.html Jinja), (c) the home.html + patient.html picker grids above. Same disease — "add a form → touch N hardcoded sites." Fixing (a) is smallest and proves the derive-from-registry approach; (b)/(c) are larger JS/Jinja follow-ups. Named here so the three items above are understood as one theme, not three paper-cuts.

- **BURN_FORM_SPEC.md — verify tracked in git.** The spec file at the project root was authored during Session G planning. Confirm it's committed: `git log --oneline -- BURN_FORM_SPEC.md`. If not present, `git add BURN_FORM_SPEC.md` and commit. Session J note: CC's file read did not find BURN_FORM_SPEC.md in the fervent-shannon worktree. Confirm whether it's actually on main (`git log --oneline -- BURN_FORM_SPEC.md`) or was never committed despite the Session I claim.

- **DESIGN_SYSTEM.md documentation gaps:** backfill `{% block extra_js %}`, `.mov-add-btn`, `.mov-del-btn`, `.mov-cell-input`, `.neuro-grid`, `.neuro-grid.cols-3`, `.nc` variants. All de-facto canonical but undocumented. When DESIGN_SYSTEM is split, add a component recipe for both `.neuro-grid` (4-col, MS form) and `.neuro-grid.cols-3` (3-col, for forms without Notes column). Surfaced by 2026-05-21 hand form plan audit; `.cols-3` added Session F.

- **Hand form ROM cells — validation pass for asymmetric start/end pair entries.** Rows where only start or only end angle is filled currently render gracefully in PDF (single value with °). No UX validation or warning implemented yet. Session A scope only covered UI rebuild.

- `_openPatientInline(id)` in `home.html` — dead code, not yet removed. Check `openEditPatientModal()` and `deleteCurrentPatient()` dependency on `currentPatientData` before deleting.
- `pdf_hand.py` unused imports: `Table`, `TableStyle`, `colors`, `ML`, `MR`, `MT`, `MB` — `CW` is now used (Block 4 table widths). Remaining imports are dead weight, harmless, clean up after merge.
- 6 `pdf_*.py` files have unused `KeepTogether` import after U12 refactor (`pdf_ms`, `pdf_spine`, `pdf_geriatric`, `pdf_cr`, `pdf_amputation`, `pdf_hand`) — cosmetic, zero runtime/build risk. Spawned as background task.
- **HAND PDF layout rhythm inconsistency.** Block 4 is now full-width tables while Blocks 1–3 and 5 use `two_col()` boxes. Usable, but alternating rhythm is visually mixed. Future polish when HAND form gets a broader PDF pass.
- **Block 5 + sign block flow risk.** `sign_chop_block()` can land on a near-empty page 3 if Block 5 is short. Consider wrapping Block 5 + sign block in `KeepTogether` when Block 5 content is brief.
- `resetPatient()` in `form_base.js` missing null guards on `derived-dob` / `derived-gender`.
- Geriatric form has duplicate RN/IC fields — cosmetic, low priority.
- No UNIQUE constraint on `records.episode_id` — ORDER BY workaround in place.
- `audit_log` FK has no ON DELETE CASCADE — orphaned rows harmless but untidy.

- **HAND ROM Overpressure misimplemented as degree pairs (CLINICAL BUG).** `hand_rom_table.js` codes Overpressure as `op_l_start/end`, `op_r_start/end` numeric degree fields, matching Active and Passive column shape. Clinically incorrect — Overpressure is an end-feel quality assessment (firm / springy / rubbery / boggy / hard) + pain response + optional gain, not a degree range. Typical clinical note: "rubbery end-range-feel with pain, +5° gain". Affected files when fixed: `templates/forms/hand.html` (column needs text input or dropdown + freeform notes), `static/js/hand_rom_table.js` (row shape change: `op_l_text/op_r_text`, or structured `{end_feel, gain, pain}` — clinical input needed), `pdf_hand.py` (ROM render block), `_buildMpisHand()` in `main.js` (ROM render block), plus migration: existing records with numeric op fields need auto-conversion or graceful display fallback. Defer until clinical-side decision on data shape. Surfaced Session E — MPIS coverage shipped using current buggy shape deliberately.

- **DESIGN_SYSTEM.md at ~312 lines — over 250-line ceiling.** Needs splitting into `DESIGN_SYSTEM-form-html.md` + `DESIGN_SYSTEM-pdf.md`. Flagged Session C, carried through Sessions D–M unfixed. Priority 1 for next session.

- **Icon maps missing BURN (and HAND in patient.html) — parallel to the formLabel-map gap fixed 2026-06-01.** `home.html` inline icon map (~1923) and `patient.html` Jinja `form_icons` (~476) have no BURN key (patient.html also missing HAND), so burn/hand episode cards fall to the default clipboard glyph (&#128203;). Cosmetic. Burn-glyph choice is a UI-taste call — deferred to the UI polish pass. When fixed, update ALL icon-map sites in lockstep with the label maps.
- **pdf_burn.py auscultation prints a dangling "Crepitation:" label unconditionally.** When `ausc.crepitation` is blank the PDF still renders an empty "Crepitation:" line (the MPIS builder correctly skips it). One-line guard in `_burn_auscultation_section`. Low priority cosmetic.

---

## Deferred work

- Age auto-calculation (NRIC→age, DOB→age) — unresolved.
- No ARIA attributes anywhere — low clinical priority.
- SCI Milestone 3 (pdf_sci.py + pt_assessment.spec). **Plan written + vetted, execution-ready:**
  `docs/superpowers/plans/2026-06-07-sci-pdf-milestone3.md` (6 tasks, REF resolved to
  `fisio / b.pen. 4 / Pind. 2 / 2019`, vet results baked in). Four cell states must render distinctly:
  blank → em-dash / NT / N-A / real value; greyed cells absent from getData() → grey background. Add
  pdf_episode + pdf_single to SCI FORM_REGISTRY row. Just execute the plan.
- **SCI stamp button cosmetic** — NT stamp + "Mark block N/A" ghost placeholder styling. Deferred from Milestone-2.
- **Worktree folder cleanup** — `PT_Assessment-worktrees\optimistic-banzai-766e26` folder may persist on disk after git worktree remove. Safe to delete manually.
- VESTIBULAR / FACIAL forms (Neurological group, NO ready).
- PAEDIATRIC / LYMPHOEDEMA / NCD / GENERAL (Rehabilitation group, all NO ready).
- MS as MPIS source-of-truth refactor: after HAND SOAPIER ships and proves itself in clinical use, propagate SOAPIER flow to MS / SPINE / GERIATRIC / CR / AMPUTATION / NEURO builders. Then document in DESIGN_SYSTEM.md as MPIS Layout canon. Do NOT do this until HAND has shipped + been used.
- Dummy patient + burn seed record for smoke-testing — extend `seed_db.py` so a realistic test record loads with one click instead of hand-filling `test` into every field each smoke test. Requested 2026-06-01.

---

## Nice-to-haves

- Hand chart SVG R/L visual disambiguation — R and L hand SVGs look identical; consider labels or colour tint.
- Hand chart marker input — currently a dropdown selector; chip-style selector (matching ms.html bodychart pattern) would be more consistent.
- Topbar button order axiom in CLAUDE.md — smoke test flagged a possible order mismatch; confirm with Miruya whether axiom needs updating before next form build.
- Draft/final state for records (currently records save in single state)
- Shared table IIFEs (movement_table.js pattern could be extended to other tables)
- Audit log UI viewer (audit_log table is logged but not surfaced anywhere)
- Patient profile page improvements (currently functional but not polished)
- MMT label spacing in MPIS: rows with `+` suffix on L value (e.g. `L: 2+`) render with inconsistent spacing before R label. Cosmetic.
- STRENGTH block empty-row policy: currently renders `— / — kg` for empty rows instead of skipping. Pick canonical skip-vs-em-dash behavior when MS-as-canon SOAPIER refactor happens.
- BURN depth palette is the recycled pain palette, not severity-ordered — colour doesn't encode depth severity (full-thickness currently reads calmer than deep-partial). Good-to-have: ramp the four depths cool/light→hot/dark by severity (e.g. yellow→orange→red→dark-brown for full thickness; dark-brown also resembles eschar). Donor site + Grafted are surgical-status, NOT burn depths — keep them off the depth ramp as distinct hues. Both-sides change: browser configure() + PDF MARKER_COLORS must move in lockstep. Low priority.

---

## Two max-width sources for home page layout (gotcha trap)

Both must be clear:
- `.home-main` — inline `<style>` in `home.html`. Now: `flex:1; width:100%; padding:28px 24px`.
- `.dash-content` — `style.css` line ~862. Now: `width:100%; padding:0 0 100px`. No `max-width`, no `margin: 0 auto`.

If layout looks centred again, grep both files. Do not assume one source.

---

## M3 token elevation tiers (reference for future UI work)

- Resting cards (stat, hero, section, seen, active-pt, ep-card): `box-shadow: var(--m3-elev-1)`
- Hover state: `box-shadow: var(--m3-elev-2)`
- Modals/overlays: `box-shadow: var(--m3-elev-3)`
- Empty states, flat sections: no elevation
- Context bars: no elevation (border-bottom instead)

---

## Neutral topbar colour rule (all standalone pages)

All standalone pages (base.html, home.html, episode.html, patient.html) use neutral M3 context bars.

Pattern: `background: var(--m3-surface-container, var(--surface)); color: var(--text); border-bottom: 1px solid var(--border); box-shadow: none`.

Any future standalone page must follow this pattern. No accent-coloured topbars.

White-alpha values are accent-topbar artifacts — when converting from accent to neutral, grep for `rgba(255,255,255` and `rgba(0,0,0`. Common conversions:
- Separators: `rgba(255,255,255,0.2)` → `var(--border)`
- Text muted: `rgba(255,255,255,0.6)` → `var(--text-faint)`
- Button borders: `rgba(255,255,255,0.3)` → `var(--border)`

Stale `body.dark` overrides for M3-token components are maintenance traps — do NOT add per-component dark overrides for components using M3 tokens. The token handles dark mode via the `body.dark` block in token definition section.

---

## Discharge in patient.html (gotcha)

`patient.html` has no `openModal()` helper — it's a standalone page, not on base.html. Uses `classList.add('open')` directly.

`home.html` uses `openModal('modal-discharge')` — available because home has its own `openModal()` defined.

Do not copy `openModal()` calls between pages without checking the helper exists on the target page.
