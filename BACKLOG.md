# BACKLOG.md — Known Issues & Deferred Work

---

## Open bugs / Cleanup

- `patient-page-direct` branch — shows entire project history when diffed against main (`git log main..patient-page-direct` returns initial commit). Likely orphaned from master → main default branch switch. Not deleted during 2026-05-27 branch cleanup. Investigate origin and either rebase, cherry-pick any unique work into main, or force-delete after confirming no unique value.

- **BURN form Pass 2 (PDF) pending.** `pdf_burn.py` not yet written. Export KKM PDF falls back to MS generator for BURN records until Pass 2 ships. KKM ref: `fisio / b.pen. 5 / Pind. 2 / 2019`. After Pass 2: wire into `_PDF_GENERATORS` + `_SINGLE_PDF_GENERATORS`, add to `pt_assessment.spec`. Pass 3 (MPIS `_buildMpisBurn`) follows after Pass 2 is stable.

- **Dropdown/select elements render garbled/zigzag in dark mode.** Global `style.css` issue affecting ALL forms' `<select>` elements. Pre-existing since ~HAND form; made obvious by BurnMov v2's additional selects. Batch fix with mov-table overflow (both `style.css`).

- **`mov-table` clips right-hand columns at narrow window widths — no horizontal scroll.** `.mov-table-wrap` needs `overflow-x: auto`. Surfaced by BurnMov v2's 7-column width. Shared class — fix benefits all forms with mov-tables. Batch fix with dark-mode select issue.

- **Neck (midline joint) offers Left/Right in BurnMov Side dropdown — clinically meaningless.** Midline joints (Neck, possibly Spine) should suppress or blank the Side column. Minor; defer until CSS pass or next BurnMov polish.

- **BURN chest expansion section — no client-side validation.** Chest expansion fields (3 measurements in cm) copied verbatim from CR form. No plausibility check (e.g. values < 0, or expansion smaller than rest). Low priority — clinic staff catch implausible values — but worth noting for a BURN polish pass.

- **home.html + patient.html form picker grids are independently hardcoded.** Both pages have separate picker grids that must be manually updated when activating a new form (step 1.5 now covers both). The structural duplication means every new form needs two manual activations. Consider driving both pickers from a shared data source if the active-form list keeps growing.

- **BURN_FORM_SPEC.md — verify tracked in git.** The spec file at the project root was authored during Session G planning. Confirm it's committed: `git log --oneline -- BURN_FORM_SPEC.md`. If not present, `git add BURN_FORM_SPEC.md` and commit.

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

- **DESIGN_SYSTEM.md at ~312 lines — over 250-line ceiling.** Needs splitting into `DESIGN_SYSTEM-form-html.md` + `DESIGN_SYSTEM-pdf.md`. Flagged Session C, carried through Sessions D, E, and F unfixed. Priority 1 for next session.

---

## Deferred work

- Age auto-calculation (NRIC→age, DOB→age) — unresolved.
- No ARIA attributes anywhere — low clinical priority.
- BURN form Pass 2 (pdf_burn.py) and Pass 3 (MPIS _buildMpisBurn) — to scope after Pass 1 ships and Miruya smoke-tests.
- SCI / VESTIBULAR / FACIAL forms (Neurological group, all NO ready).
- PAEDIATRIC / LYMPHOEDEMA / NCD / GENERAL (Rehabilitation group, all NO ready).
- MS as MPIS source-of-truth refactor: after HAND SOAPIER ships and proves itself in clinical use, propagate SOAPIER flow to MS / SPINE / GERIATRIC / CR / AMPUTATION / NEURO builders. Then document in DESIGN_SYSTEM.md as MPIS Layout canon. Do NOT do this until HAND has shipped + been used.

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
