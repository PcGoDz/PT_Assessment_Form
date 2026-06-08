# HANDOVER.md — Current Session State

Last updated: 2026-06-08

---

## Where we left off

Execution session. Built and shipped `pdf_sci.py` (SCI PDF Milestone-3) in full, then did a
layout-refinement pass. All 6 plan tasks + the refactor are committed on this worktree branch.
No push — by design; the whole SCI milestone ships together.

**Milestone-3 commits (6):**
- `feat(sci): pdf_sci.py skeleton (header + entry points)`
- `feat(sci): four-state grid_table + rs/_ls helpers`
- `feat(sci): full _build_story in spec section order`
- `feat(sci): wire pdf_sci into FORM_REGISTRY + import`
- `build(sci): add pdf_sci.py to PyInstaller datas`
- `refactor(sci): side-by-side equal-height pairs for short sections`

**What was built:**
- `pdf_sci.py` — new file. Self-contained SCI PDF generator (house style matches `pdf_neuro.py`).
  Local helpers: `rs()`, `_ls()`, `grid_table()` (four cell states: real / blank→em-dash / NT / N-A /
  greyed→grey bg), `_pair_half()` + `pair_box()` (equal-height side-by-side, kills staircase).
  `_build_story` sections: 4 `pair_box` pairs for short text sections
  (Diagnosis+Management|Problem, History|Special Questions, Respiratory|Skin, Pain|Home Env),
  full-width grids (sensory / proprioception / MMT / upright / 5×functional), full-width rs() for
  Outcome Measures + Assistive Aids, narrative tail (Impression/STG/LTG/Plan) + sign/chop.
  KKM Ref: `fisio / b.pen. 4 / Pind. 2 / 2019`.
- `app.py` — `import pdf_sci` added (after `import pdf_burn`); SCI `FORM_REGISTRY` row updated
  with `pdf_episode` + `pdf_single` keys. `_PDF_GENERATORS` / `_SINGLE_PDF_GENERATORS` derive
  automatically from registry — not hand-edited.
- `pt_assessment.spec` — `('pdf_sci.py', '.')` added to `datas` list (after `pdf_burn.py` line).

**Verified:** app-level QA 9/9 pass (boot, form open, save, both PDF routes give SCI not MS-fallback,
four cell states, flush pairs, MPIS no-crash, long-entry wrap). Real-app export eyeballed clean
by Miruya. Page count: 2 (down from 3 with the flat layout).

---

## Half-done

Nothing mid-flight. Clean working tree (scratch files deleted before wind-down).

---

## Next session priorities

1. **SCI MPIS — Milestone-4.** Build the MPIS copy builder for SCI form. No plan written yet.
2. **SCI stamp-button cosmetic restyle** — NT stamp + "Mark block N/A" ghost placeholder styling.
   Deferred from Milestone-2.
3. **Fix B — DB migration versioning.** `PRAGMA user_version` gates in `database.py` (lines 80-101).
   Test against a COPY of the real DB; keep `try/except` INSIDE the v0→v1 gate as belt-and-suspenders.
4. **Git push the whole SCI milestone** (form + polish + templates + PDF + MPIS) in one deliberate
   pass once MPIS is done. NOT before.

---

## Gotchas discovered this session

- **Stale-mount phantom (Cowork sandbox).** Sandbox-side file reads can return frozen/stale contents
  after a Windows-side write (frozen mtime, mount cache). Symptom: sandbox says file is N bytes but
  Windows confirms different content. Tiebreak: render an artifact (generate the PDF); if generation
  succeeds with the correct output, trust the Windows-side source, not the sandbox read. Never repair
  off mount-only bytes. Full incident write-up at
  `ARCHIVE/incident-2026-06-08-sci-pdf-stale-mount-phantom.md` (written by Opus; check main branch
  if not in this worktree).
- **`pair_box()` promotion candidate** — local to `pdf_sci.py` for now. See BACKLOG deferred.
  Don't add to `DESIGN_SYSTEM.md` or `pdf_platypus_base.py` until a second form needs it.

---

## What to skip for now

VESTIBULAR / FACIAL / remaining NO forms. See BACKLOG.md for the full deferred list.
