# BACKLOG.md — Known Issues & Deferred Work

---

## Open bugs / Cleanup

- **FACIAL shipped without template-button wiring (addButton calls in facial.html) — caught 2026-06-18 by click-test, NOT by the build smoke-test.** The DESIGN_SYSTEM pre-ship checklist and the 24/24 FACIAL smoke-test both passed without catching it because neither verifies that template picker buttons actually render and fire. WORKFLOW/checklist change candidate: add 'click every + template button, confirm picker opens and inserts' as a mandatory pre-ship step for any form with clinical templates. Root cause: addButton wiring lives in the HTML, separate from the template data in clinical_templates.js — the seam between the two files is unchecked.

- **Episode form-type drift on mid-form swap.** Repro: create episode (e.g. BURN) → on the
  form page swap to another form (SPINE) → Save & Return → episode list still labels it BURN.
  Likely same root as the deferred `get_episode_record form-aware` item: episode `form_type`
  set at creation, record `form_type` set at save, never reconciled. TRIAGE QUESTION before
  fixing: does the swapped-form record save with its OWN `form_type` (cosmetic — only episode
  label stale) or inherit the episode's creation type (data-integrity — wrong stored
  `form_type` + wrong downstream PDF, cf. BURN-chip-relabel bug)? Severity depends on answer.

- **Twin `MARKER_COLORS` dicts are a maintenance trap.** `pdf_base.MARKER_COLORS` = dot-colour source of truth (used by `draw_markers()` for rendered dots). `pdf_platypus_base.MARKER_COLORS` = pain-only / legend-fallback — depth keys NOT present. The Session L fix only updated `pdf_base`. If the platypus-side copy is ever wired into a new render path, it will silently emit wrong colours for all burn depth markers. Consolidate (make platypus import from pdf_base) or document the split formally before the dicts drift further. (Corrected from earlier "dead" wording — both are live.)

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

- ~~**DESIGN_SYSTEM.md at ~312 lines — over 250-line ceiling.**~~ DONE 2026-06-10. Split: DESIGN_SYSTEM.md keeps form-HTML primitives + CSS classes; PDF Layout section moved to new `DESIGN_SYSTEM-pdf.md`. Both now under 250. Also this session: WORKFLOW.md (273) trimmed by moving the form-build checklist + initFormContext into new `FORM_PIPELINE.md` (which also carries the new front-half design pipeline). See REFACTOR_NOTES.md.

- **Icon maps missing BURN (and HAND in patient.html) — parallel to the formLabel-map gap fixed 2026-06-01.** `home.html` inline icon map (~1923) and `patient.html` Jinja `form_icons` (~476) have no BURN key (patient.html also missing HAND), so burn/hand episode cards fall to the default clipboard glyph (&#128203;). Cosmetic. Burn-glyph choice is a UI-taste call — deferred to the UI polish pass. When fixed, update ALL icon-map sites in lockstep with the label maps.
- **pdf_burn.py auscultation prints a dangling "Crepitation:" label unconditionally.** When `ausc.crepitation` is blank the PDF still renders an empty "Crepitation:" line (the MPIS builder correctly skips it). One-line guard in `_burn_auscultation_section`. Low priority cosmetic.

- **Worktree churn can corrupt `.git/config` (panic-preventer).** Seen 2026-06-12: heavy worktree add/remove/prune/force-delete left (a) Windows-CWD-locked worktree folders that won't `rmdir` until the CC session closes, AND (b) torn `.git/config` write — trailing whitespace then null-byte (`\x00`) padding — causing `fatal: bad config line N`. Commits safe in `.git/objects`; config is only settings. Fix Windows-side: rewrite the whole file fresh via `open('.git/config','wb').write(content.encode('utf-8'))` (15 lines, single trailing newline); verify: `python -c "print(b'\x00' in open('.git/config','rb').read())"` → `False`. Cowork sandbox config reads lag behind CC's fix — tiebreak via CC's authoritative `git status`.

---

## Deferred work

- Age auto-calculation (NRIC→age, DOB→age) — unresolved.
- No ARIA attributes anywhere — low clinical priority.
- **pair_box() equal-height helper — promotion candidate.** `pdf_sci.py` has a LOCAL `_pair_half()` + `pair_box()` that renders side-by-side sections as one outer box + centre divider (kills staircase on lopsided pairs). Pattern is reusable for other form PDFs but currently lives only in `pdf_sci.py`. When a second form needs the same layout, promote to `pdf_platypus_base.py`. Do NOT move it speculatively — one confirmed consumer is not enough.
- ~~**SCI stamp button cosmetic**~~ DONE 2026-06-11. Filled-tonal M3 restyle of `.grid-stamp-btn` (accent-light fill, accent text, pill radius, hover→accent-mid, active scale, `margin:-10px 0 16px` optical). CSS-only, merged `33887fe`.
- ~~**No DB schema version tracking — `try: ALTER / except: pass` migrations.**~~ DONE 2026-06-13. Replaced with `PRAGMA user_version` gates in `database.py` lines 79–108. v0→v1 adds soap_notes session-header cols; v1→v2 adds episodes next-appt/discharge cols. Inner `try/except` retained inside each gate as one-time transition net for mid-air DBs. Stamps to `user_version=2`. Verified live: 0→2 and 2→2 (idempotent). Branch: `claude/jolly-hodgkin-245daf`, merge `943cde7`.

- ~~**SCI abbreviation legend/key.**~~ DONE 2026-06-12. Per-grid caption legends added to
  screen (form_sci.js LEGENDS const → captions under each grid), PDF (pdf_sci.py, verbatim-
  borang punctuation), and MPIS (_buildMpisSci legend line per section). Wording transcribed
  VERBATIM from KKM borang (SCI.pdf), not guessed. NT/N-A confirmed as app additions (not on
  borang). A=Absent (sensory/prop) vs A=Assisted (functional) collision handled by per-grid
  placement. Branch: claude/exciting-lewin-bf53d0.

- **Functional scale: 'Supervised' is clinically low-value for quick PT notes.** Miruya
  (clinical) flags that the borang's 4-tier assistance scale (U/A/S/I) over-resolves for
  day-to-day functional notes — in practice it's mostly "can / can't", and where there's
  nuance he writes "With guidance", not "Supervised". The S (Supervised = hands-off but
  presence-required, a discharge-risk tier) distinction matters for formal outcome scoring
  (SCIM/FIM) and medico-legal discharge justification, but is noise for routine notes.
  OPTION when revisited: add "With guidance" (G) as a 6th OPT_FUNC value, OR replace the
  scale with Miruya's real-world set (Independent / With guidance / Assisted / Unable).
  DEFERRED — replacing scale values deviates from the KKM borang letters (preserve-KKM
  axiom tension) and touches OPT_FUNC + saved data + PDF + MPIS. Bigger than a legend task;
  needs its own deliberate decision. Surfaced 2026-06-12 during legend build.
- **Worktree folder cleanup** — `PT_Assessment-worktrees\optimistic-banzai-766e26`,
  `PT_Assessment-worktrees\eloquent-williamson-fb5d6d`, `PT_Assessment-worktrees\vigorous-lehmann-32404d`,
  `PT_Assessment-worktrees\exciting-lewin-bf53d0`, `PT_Assessment-worktrees\nice-mahavira-6a9cb1`,
  `PT_Assessment-worktrees\jolly-hodgkin-245daf` (added 2026-06-13), and `PT_Assessment-worktrees\magical-swartz-16db1c` (added 2026-06-17) folders may persist on disk
  after git worktree remove (Windows blocks deletion when a session's CWD is inside). Branches deleted
  + pruned fine; only the folders linger. Safe to `rmdir /s /q` manually from Explorer/cmd once those
  sessions are closed. `PT_Assessment-worktrees\frosty-hodgkin-8090cd` (2026-06-18, merged to main);
  `PT_Assessment-worktrees\upbeat-einstein-e05cd8` (2026-06-23, merged to main) — both safe to
  `rmdir /s /q` once those sessions close.
- **Multi-select chip helper promotion** — `toggleChip/getChips/setChips` now has 2 local copies (NEURO, FACIAL). On a 3rd consumer, promote to FormBase (cf. `pair_box` promotion rule from `pdf_sci.py`). Do NOT promote speculatively.

- **FACIAL full-clickfest pilot (deferred)** — Per FACIAL_SPEC.md Build Note #5: once FACIAL is stable in clinical use, use it as the pilot form to flip full intake to clickfest (Observation/Palpation/General Health/Problem chip sets). If good, roll across all forms as its own spec→plan→build cycle. Defer until post-pilot.

- **pdf_facial.py page-1 empty intake labels (low priority)** — blank fields (Doctor's Mgmt, Problem, histories, Hot/Cold/Pin-prick, Irritability, Hearing Aid/Pacemaker) render with empty string beside their label. Same behavior as `pdf_ms.py` clone; likely consistent-by-design. Confirm against `pdf_ms.py` during Phase 1.2 PDF polish pass; guard if undesired.

- VESTIBULAR form (Neurological group, NO ready). FACIAL now shipped (ready=True).
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
