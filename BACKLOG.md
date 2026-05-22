# BACKLOG.md — Known Issues & Deferred Work

---

## 🔁 PERSISTENT REMINDER — Git Push

`git add -A && git commit -m "session checkpoint" && git push`

Has been deferred multiple sessions. Do this BEFORE opening any files in a new session.

---

## Open bugs / Cleanup

### Missing episode creation flow [BLOCKING]

**Discovered:** 2026-05-22 smoke test prep

**Symptoms:**
- Patient detail panel (dashboard): no "+ New Episode" button
- Patient profile page: no episode creation button
- Patient profile empty state reads "Go back to patient list to start a new episode" but no such control exists on the patient list either
- App is currently unusable for its core purpose — patients can be created, but no episode → no assessment → no hand form (or any other form)

**Regression context:**
- Episode creation worked in earlier version (last tested by Miruya)
- Not introduced by Session A (hand form rebuild touched only `hand.html`, `hand_rom_table.js`, `hand_circ_table.js`, `form_hand.js`, `pdf_hand.py`)
- Predates Session A — likely lost during an earlier refactor

**Suggested fix scope (for Session B planning):**
- Add "+ New Episode" button to patient profile page header
- Add "+ New Episode" button to patient detail panel on dashboard
- Verify episode creation flow end-to-end: create → routes to assessment selection → routes to selected form (e.g. hand)
- Confirm existing patient model and episode model relationships still intact

**Priority:**
- Bumps to top of Session B queue — gates all downstream work
- Original Session B bugs (patient prefill, diagnosis validation, templates dedup) become secondary until episode flow is restored

- **DESIGN_SYSTEM.md documentation gaps:** backfill `{% block extra_js %}`, `.mov-add-btn`, `.mov-del-btn`, `.mov-cell-input`, `.neuro-grid`, `.nc` variants. All de-facto canonical from ms.html but undocumented. Surfaced by 2026-05-21 hand form plan audit.

- **Hand form ROM cells — validation pass for asymmetric start/end pair entries.** Rows where only start or only end angle is filled currently render gracefully in PDF (single value with °). No UX validation or warning implemented yet. Session A scope only covered UI rebuild.

- `_openPatientInline(id)` in `home.html` — dead code, not yet removed. Check `openEditPatientModal()` and `deleteCurrentPatient()` dependency on `currentPatientData` before deleting.
- `pdf_hand.py` unused imports: `Table`, `TableStyle`, `colors`, `CW`, `ML`, `MR`, `MT`, `MB` — harmless but noise.
- 6 `pdf_*.py` files have unused `KeepTogether` import after U12 refactor (`pdf_ms`, `pdf_spine`, `pdf_geriatric`, `pdf_cr`, `pdf_amputation`, `pdf_hand`) — cosmetic, zero runtime/build risk. Spawned as background task.
- `clinical_templates.js` comment at line 4 lists only MS/SPINE/GERIATRIC/CR — stale, doesn't include HAND/AMPUTATION/NEURO.
- `resetPatient()` in `form_base.js` missing null guards on `derived-dob` / `derived-gender`.
- Geriatric form has duplicate RN/IC fields — cosmetic, low priority.
- No UNIQUE constraint on `records.episode_id` — ORDER BY workaround in place.
- `audit_log` FK has no ON DELETE CASCADE — orphaned rows harmless but untidy.

---

## Deferred work

- Age auto-calculation (NRIC→age, DOB→age) — unresolved.
- No ARIA attributes anywhere — low clinical priority.
- Full exe build test outstanding since NEURO + M3 redesign + discharge changes + visual polish + HAND form + U34 + U12 cleanup.
- BURN form (next probable form to implement, also Musculoskeletal group).
- SCI / VESTIBULAR / FACIAL forms (Neurological group, all NO ready).
- PAEDIATRIC / LYMPHOEDEMA / NCD / GENERAL (Rehabilitation group, all NO ready).

---

## Nice-to-haves

- Draft/final state for records (currently records save in single state)
- Shared table IIFEs (movement_table.js pattern could be extended to other tables)
- Audit log UI viewer (audit_log table is logged but not surfaced anywhere)
- Patient profile page improvements (currently functional but not polished)

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
