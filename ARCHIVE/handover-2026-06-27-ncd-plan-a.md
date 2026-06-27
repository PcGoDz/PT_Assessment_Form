# HANDOVER.md — Current Session State

Last updated: 2026-06-27

---

## Where we left off

NCD Plan A SHIPPED and merged to main (`74c0991`, 2026-06-27). Built Tasks 7–12 on top of the committed Tasks 1–6 (worktree `vigilant-gauss-c07678`): registry-drift sweep (5 formLabel sites + 2 icon maps + both picker cards), clinical templates (TEMPLATES.NCD + NCD_SOAP), `pdf_ncd.py` (body-shape PNG WYSIWYG embed, KKM ref `fisio / b.pen. 17 / 2019`), `_buildMpisNcd()` SOAPIER builder, figure top-crop on shapes 1 + 4. Post-build: section reshuffle on the same branch — 9 → 11 sections, MSK-canonical flow (Patient → Subjective → History → Special Questions → Observation → Body Chart & Shape → Vital Signs → Body Composition → Fitness Tests → PT Impression → Goals & Plan). Miruya smoke-tested post-reshuffle and confirmed all green. Branch deleted; worktree git-record pruned.

15 files: `pdf_ncd.py` (new), `templates/forms/ncd.html` (new), `static/js/form_ncd.js` (new), `static/js/main.js` (+98 lines), `static/js/clinical_templates.js` (+70 lines), `templates/episode.html`, `templates/home.html`, `templates/patient.html`, `database.py`, `app.py`, `pt_assessment.spec`, 2 PNG crops, 2 spec docs.

---

## Half-done

- Worktree folder `PT_Assessment-worktrees/vigilant-gauss-c07678` may still be on disk (Windows CWD lock). Git-side clean. `rmdir /s /q` once session closes.
- **git push** — main ahead of origin by NCD work. Miruya's call.
- **exe build** — deferred. `build.bat` after push; confirm `pdf_ncd.py` + `ncd_shapes` bundle.

---

## Next session priorities

1. **Plan B** — per-visit `ncd_measurements` v3 migration, additive SOAP-modal NCD panel (RED LINE: form-type guarded, additive only), screen-only trend page (inline-SVG sparklines). Plan at `docs/superpowers/plans/2026-06-25-ncd-form-plan-B.md`. Battery keys FROZEN — `form_ncd.js collect().measurements` is the contract; Plan B imports verbatim.
2. **+Note / textbox-galore sweep** (lighter palate-cleanser): promote `+Note` collapsible from FACIAL/SCI to a DESIGN_SYSTEM recipe, then apply across NCD/BURN/HAND. Own spec→plan→build cycle. See BACKLOG.
3. **SOAP modal data-loss bug** (MAJOR, shared) — backdrop click dismisses modal and wipes typed SOAP content. See BACKLOG. Could fold into Plan B (which enters that modal anyway).
4. **git push** + **build.bat** — Miruya's sequencing call.

---

## Gotchas discovered this session

- **SOAP modal backdrop click wipes unsaved data** — clinical data-loss risk at 12-21 patients/day. Shared modal, all 15 forms affected. Added to BACKLOG.
- **MPIS divider bars smash against text** — `MPIS_DIV`/`MPIS_DASH` house style produces wall-of-text; only obvious on NCD's longer SOAPIER output. Shared across all forms. Added to BACKLOG.
- **Screen order ≠ PDF order is intentional** — NCD screen (MSK-canonical) diverges from KKM borang paper order. `collect()` is the bridge; PDF renders in borang order. Correct by design. Do NOT reorder the PDF to match the screen.
- **Rasterizer not installed** — `pdf2image`/poppler unavailable on the build machine; body-shape PNG embed in PDF confirmed by Miruya's visual smoke-test only, not automated rasterization. Note for future PDF tasks.
- **DESIGN_SYSTEM.md at 247/250 lines** — at ceiling. Next component recipe addition requires either splitting the file or pruning stale content first. Flag for next session touching UI patterns.

---

## What to skip for now

VESTIBULAR / PAEDIATRIC / LYMPHOEDEMA / GENERAL. Don't start Plan B without reading `docs/superpowers/plans/2026-06-25-ncd-form-plan-B.md` fresh. See BACKLOG.md for full deferred list.
