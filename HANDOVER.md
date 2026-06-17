# HANDOVER.md — Current Session State

Last updated: 2026-06-17

---

## Where we left off

FACIAL form fully built, smoke-tested (all 13 checklist items + 24/24 pass), and merged to main (FF merge, tip `412ae7d`). Implemented across ~14 files:

- `templates/forms/facial.html` — 10 sections, own `<style>` block with `.grid-stamp-btn` + `.irr-chip.sel-R/.sel-L` rules inside `{% block content %}`
- `static/js/form_facial.js` — `window.Form` contract, 2 `AssessmentGrid` instances (facial + tongue), locally-copied chip helpers (`toggleChip`/`getChips`/`setChips`/`clearChips`)
- `pdf_facial.py` — page-1 `two_col` intake mirroring `pdf_ms.py`, page-2 grade tables via `data_table()` (NOT `grid_table`), sparse render confirmed 4068 bytes
- `_buildMpisFacial()` in `main.js` — SOAPIER builder, nested reads for `pain`/`sensation`, `chips()`/`grades()` helpers, wired into `copyToMpisAuto` switch
- `clinical_templates.js` — `TEMPLATES.FACIAL` + `TEMPLATES.FACIAL_SOAP` (seed content; needs real SMART statements — see Next Session)
- 5 registry-drift sites: `home.html`, `patient.html`, `episode.html` pickers + label/icon maps
- `database.py` `REQUIRED_FIELDS`, `app.py` `FORM_TEMPLATES` + `FORM_REGISTRY` (`ready=True`), `pt_assessment.spec` datas

KKM ref `fisio / b.pen. 7 / Pind. 2 / 2019` preserved verbatim. Grid row labels with KKM typos are persistence keys — never edit them. PDF + MPIS cross-ref audited: all `collect()` keys render in both, no neuro.muscles-style silent drop.

One post-build bug fixed pre-merge: Affected Side R/L visual — missing `.sel-R`/`.sel-L` CSS. Commit `412ae7d`. See Gotchas.

---

## Half-done

- `PT_Assessment-worktrees/magical-swartz-16db1c` folder lingers on disk (Windows CWD lock — session still inside). Branch deleted (`-D`), worktree registration pruned. Safe to `rmdir /s /q PT_Assessment-worktrees\magical-swartz-16db1c` once this session closes.
- `claude/facial-plan` branch still exists — NOT in `git branch --merged main` (files were `git checkout`'d in, no merge commit). Content (FACIAL_SPEC.md + PLAN-FACIAL.md) is already on main. Delete when no longer needed: `git branch -D claude/facial-plan`.
- FACIAL Phase 1.2 (UI/UX polish + SMART template authoring) not started. Exe build deliberately deferred until after polish.

---

## Next session priorities

1. Manual `rmdir /s /q PT_Assessment-worktrees\magical-swartz-16db1c` if folder still present.
2. `git push` — main at `412ae7d` is local-only, not yet pushed to origin.
3. `git branch -D claude/facial-plan` (superseded; content on main).
4. Phase 1.2 polish — FACIAL UI/UX pass (Miruya-driven) + real discrete SMART statements in `clinical_templates.js` (`TEMPLATES.FACIAL` + `TEMPLATES.FACIAL_SOAP` currently have seed content only).
5. PDF page-1 empty-label behavior check (see Gotchas).

---

## Gotchas discovered this session

- **SILENT CSS GAP — `.irr-chip.sel-<Value>` is value-specific:** Borrowing `.irr-chip` for a non-irritability control (Affected Side R/L) silently breaks unless matching `.sel-<Value>` CSS exists for the new values. `style.css` only defines `.sel-High/.sel-Medium/.sel-Low`. JS applied `.sel-R`/`.sel-L` correctly — classes appeared in DOM — but no CSS rule matched → button looked greyed/dead, no console error, nothing in DevTools inspect. Fixed in `facial.html`'s own `<style>` block at `412ae7d`, NOT in `style.css`. Rule: for every `.irr-chip` variant in a new form, grep `style.css` for each `.sel-<Value>` the JS applies — if absent, add form-locally. Migrated to WORKFLOW.md Anti-Repeat Rules this session.
- **`.grid-stamp-btn` is form-local, not global:** BACKLOG "DONE 2026-06-11" implied a global CSS change but the SCI stamp restyle lives in `sci.html`'s own `<style>` block (lines 29–33). `{% block extra_head %}` does NOT exist in `base.html` — `<style>` goes inside `{% block content %}`, mirroring `sci.html`.
- **PDF page-1 empty labels:** `pdf_facial.py` clones `pdf_ms.py` page-1 pattern — blank fields render as empty string beside their label. Likely consistent-by-design. Confirm + guard during Phase 1.2 PDF polish pass if undesired.

---

## What to skip for now

Exe build until Phase 1.2 done. Other forms (VESTIBULAR / PAEDIATRIC / LYMPHOEDEMA / NCD / GENERAL). Full-clickfest cross-form pilot. UI revamp. See BACKLOG.md.
