# HANDOVER.md — Current Session State

Last updated: 2026-06-18

---

## Where we left off

FACIAL Phase 1.2 progressed. Templates rung SHIPPED + merged to main (`--no-ff` `a05354c`): real SMART templates authored (`fc098ff`, generic-fill `[blanks]` style) + the missing `addButton` template-button wiring fixed (`b061b42`). Both click-tested live: all 4 `+template` buttons fire, statements insert, survive reload, render in PDF + MPIS, SOAP entries present.

FACIAL UIX rung PLANNED, NOT BUILT. Approved design: `FACIAL_UIX_SPEC.md` (collapsible `+Note` ghost, ported from SCI — NOT BURN). Vetted implementation plan: `PLAN-FACIAL-UIX.md` (committed `f278617`), reviewed + blessed by brain window + Miruya. One senior-CC design improvement accepted: blur auto-collapse listeners attach at tail of `initGrids()` (keeps `autoCollapseIfEmpty` private, only `toggleNote` exposed) instead of inline `onblur` attributes. Clinical decision locked: Sensation Test "NOTES" caption STRIPPED for full 5-note consistency.

---

## Half-done

- `PT_Assessment-worktrees/frosty-hodgkin-8090cd` folder lingers on disk (Windows CWD lock — this session's CWD is inside it). Branch `claude/frosty-hodgkin-8090cd` deleted (`-d`, merged), worktree registration deregistered (`git worktree list` shows only main). Safe to `rmdir /s /q PT_Assessment-worktrees\frosty-hodgkin-8090cd` once this session closes.
- `PT_Assessment-worktrees/magical-swartz-16db1c` folder lingers on disk (Windows CWD lock — session still inside). Branch deleted (`-D`), worktree registration pruned. Safe to `rmdir /s /q PT_Assessment-worktrees\magical-swartz-16db1c` once this session closes.
- `claude/facial-plan` branch still exists — NOT in `git branch --merged main` (files were `git checkout`'d in, no merge commit). Content (FACIAL_SPEC.md + PLAN-FACIAL.md) is already on main. Delete when no longer needed: `git branch -D claude/facial-plan`.
- FACIAL Phase 1.2 (UI/UX polish + SMART template authoring) not started. Exe build deliberately deferred until after polish.

---

## Next session priorities

1. `git push` — main has unpushed work (templates merge + plan). Confirm pushed.
2. Execute `PLAN-FACIAL-UIX.md` rung by rung: NEW worktree off main → Tasks 1-4 (CSS/markup/JS/static verify) → STOP at Task 5 (Miruya smoke-test gate, incl. the ⚠ auto-collapse feel-poke) → merge only after gate passes.
3. Delete `claude/facial-plan` (superseded, content on main).

---

## Gotchas discovered this session

- **SILENT CSS GAP — `.irr-chip.sel-<Value>` is value-specific:** Borrowing `.irr-chip` for a non-irritability control (Affected Side R/L) silently breaks unless matching `.sel-<Value>` CSS exists for the new values. `style.css` only defines `.sel-High/.sel-Medium/.sel-Low`. JS applied `.sel-R`/`.sel-L` correctly — classes appeared in DOM — but no CSS rule matched → button looked greyed/dead, no console error, nothing in DevTools inspect. Fixed in `facial.html`'s own `<style>` block at `412ae7d`, NOT in `style.css`. Rule: for every `.irr-chip` variant in a new form, grep `style.css` for each `.sel-<Value>` the JS applies — if absent, add form-locally. Migrated to WORKFLOW.md Anti-Repeat Rules this session.
- **`.grid-stamp-btn` is form-local, not global:** BACKLOG "DONE 2026-06-11" implied a global CSS change but the SCI stamp restyle lives in `sci.html`'s own `<style>` block (lines 29–33). `{% block extra_head %}` does NOT exist in `base.html` — `<style>` goes inside `{% block content %}`, mirroring `sci.html`.
- **PDF page-1 empty labels:** `pdf_facial.py` clones `pdf_ms.py` page-1 pattern — blank fields render as empty string beside their label. Likely consistent-by-design. Confirm + guard during Phase 1.2 PDF polish pass if undesired.

---

## What to skip for now

Exe build until Phase 1.2 done. Other forms (VESTIBULAR / PAEDIATRIC / LYMPHOEDEMA / NCD / GENERAL). Full-clickfest cross-form pilot. UI revamp. See BACKLOG.md.
