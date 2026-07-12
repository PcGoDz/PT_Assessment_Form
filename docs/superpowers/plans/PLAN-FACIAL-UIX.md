# FACIAL Collapsible `+ Note` Ghost — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (or subagent-driven-development) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 5 always-open "Notes" boxes in FACIAL's Pain + Sensation sections with SCI's collapsible `+ Note` ghost pattern, so empty boxes stop nagging the clinician.

**Architecture:** Ship-crude, all form-local. Copy SCI's `+ Note` pattern (CSS + markup + JS toggle) directly into FACIAL. ZERO shared-code edits — `form_base.js` and `style.css` are not touched. This is a visibility-layer change only; note *values* already collect/populate correctly, so the data contract (`collect()`) does not change.

**Tech Stack:** Vanilla JS (IIFE module), Jinja HTML template, form-local `<style>` block. No build step, no framework.

**Source spec:** `FACIAL_UIX_SPEC.md` (approved 2026-06-18). Donor pattern verified by reading real source: `sci.html` + `form_sci.js`.

---

## ⚠ READ BEFORE BUILDING — three standing flags

1. **Plan-now, fire-LATER.** Do NOT implement on main, and do NOT implement in the current session if this plan is being reviewed. The build happens on a NEW worktree branched from main, smoke-tested BEFORE merge. (Spec handoff note: "Saint Dario (CC) was wheezing 2026-06-18 — check CC status before building.")
2. **No test suite (project axiom).** CLAUDE.md / RULES.md forbid pushing TDD on the UI layer. There is no jest/pytest harness for vanilla-JS forms. Verification here = `node --check` (syntax) + manual smoke-test on the running form. Do NOT fabricate unit tests.
3. **The auto-collapse-on-blur is a feel-gamble Miruya asked to be poked about.** Task 5 carries an explicit, non-skippable smoke-test step for it. Do not bury it, do not skip it. If it feels jumpy on the running form, the revert is one line (drop the blur wiring) — that's Miruya's clinical-feel call, not a technical one.

---

## Risk register (carried verbatim from spec)

1. **Auto-collapse feel-trap** — opening a note, typing nothing, clicking away re-collapses it. The one real gamble. Could feel like the form yanked the box out from under you. Mitigation: re-tapping `+ Note` brings it back instantly. **Miruya's call on the running form** (see Task 5).
2. **`<input>` vs `<textarea>`** — FACIAL's notes are `<input type="text">`; SCI's donors are `<textarea>`. The collapsible pattern is element-agnostic. **Do NOT convert FACIAL's notes to `<textarea>`** — that's scope creep.
3. **`+ Note` placement** — own line (SCI-style) vs trailing the chip row is a see-it-live call. Build SCI-style (own line) first; Miruya adjusts on the running form if it reads cramped.
4. **Sensation note wrapper differs** — `#sensation-notes` (facial.html:317) currently sits inside a `<div class="fg"><div class="field"><label>Notes</label>…</div></div>` structure; the other 4 sit bare under their chips. Task 2 removes that wrapper so all 5 use the identical button+wrap shape. Confirm collapsed treatment looks consistent across both sections on the running form.

---

## The 5 notes in scope

| # | Note id           | Current location (main HEAD) | Section       | Current markup shape                          |
|---|-------------------|------------------------------|---------------|-----------------------------------------------|
| 1 | `nature-notes`    | facial.html:201              | Pain (`s-pain`)| bare `<input>` under chips                    |
| 2 | `agg-notes`       | facial.html:213              | Pain          | bare `<input>` under chips                    |
| 3 | `ease-notes`      | facial.html:225              | Pain          | bare `<input>` under chips                    |
| 4 | `hrs24-notes`     | facial.html:235              | Pain          | bare `<input>` under chips                    |
| 5 | `sensation-notes` | facial.html:317              | Sensation (`s-sens`)| wrapped in `.fg > .field > label "Notes"` |

> Line numbers are accurate as of main HEAD at plan-authoring time. They WILL drift after Task 1 inserts CSS lines and Task 2 expands markup. Locate by **id**, not by line number, when editing later tasks.

---

## Files touched (exhaustive)

- **Modify:** `templates/forms/facial.html` — `<style>` block (Task 1) + 5 note markup wraps (Task 2)
- **Modify:** `static/js/form_facial.js` — toggle + auto-collapse + populate re-open + reset re-collapse + export (Task 3)
- **NOT touched:** `static/js/form_base.js`, `static/css/style.css`, `static/js/clinical_templates.js`, `pdf_facial.py`, `main.js` (MPIS), `collect()`, the 4 multi-chip groups, sensation single-selects, both grids, pain slider, affected-side toggle, every other section.

---

## Task 0: Setup (LATER — at build time, not during planning)

**Files:** none yet.

- [ ] **Step 1: Confirm CC status before building.** Spec standing flag — check CC is healthy before starting.

- [ ] **Step 2: Create an isolated worktree off main.**

Use the `superpowers:using-git-worktrees` skill (or the native worktree tool). Branch from main, which already contains the merged templates work (`a05354c`) and the `addButton` wiring in facial.html's `DOMContentLoaded` block. Do NOT build on main.

- [ ] **Step 3: Baseline check — confirm form_facial.js parses before any edit.**

Run: `node --check static/js/form_facial.js`
Expected: exits 0, no output.

---

## Task 1: Add the collapsible CSS (form-local)

**Files:**
- Modify: `templates/forms/facial.html` — the existing `<style>` block at lines 19–27 (the one containing `.grid-stamp-btn` and `.irr-chip.sel-R/.sel-L`)

- [ ] **Step 1: Add the two SCI rules into the existing `<style>` block.**

The donor is `sci.html:34–36`. Insert these two rules immediately before the closing `</style>` (currently line 27), after the `.irr-chip.sel-R, .irr-chip.sel-L` rule:

```css
  .func-note-toggle { font-size:12px; color:var(--accent); background:none; border:none;
    cursor:pointer; padding:4px 0; }
  .func-note.collapsed { display:none; }
```

Resulting block tail looks like:

```html
  .irr-chip.sel-R, .irr-chip.sel-L { background: var(--accent-light); border-color: var(--accent); color: var(--accent); font-weight: 500; }
  .func-note-toggle { font-size:12px; color:var(--accent); background:none; border:none;
    cursor:pointer; padding:4px 0; }
  .func-note.collapsed { display:none; }
</style>
```

- [ ] **Step 2: Visual smoke deferred to Task 5.** No standalone verification for a CSS-only insert; it's exercised once markup (Task 2) references the classes.

- [ ] **Step 3: Commit.**

```bash
git add templates/forms/facial.html
git commit -m "FACIAL-UIX: add collapsible +Note CSS (form-local, from SCI)"
```

---

## Task 2: Wrap the 5 notes in the `+ Note` collapsible markup

**Files:**
- Modify: `templates/forms/facial.html` — the 5 note inputs (locate by id, not line number; lines drift after Task 1)

Pattern (mirrors `sci.html:396–399`): a `+ Note` button, then a wrapper div `collapsed` by default holding the existing `<input>`. **Keep the element as `<input type="text">` — do NOT convert to `<textarea>` (risk #2).**

- [ ] **Step 1: Wrap `nature-notes`.** Replace the bare input (currently facial.html:201):

```html
      <input type="text" id="nature-notes" placeholder="Notes" style="margin-top:6px">
```

with:

```html
      <button type="button" class="func-note-toggle" onclick="FacialForm.toggleNote('nature-notes')">+ Note</button>
      <div class="func-note collapsed" id="nature-notes-wrap">
        <input type="text" id="nature-notes" placeholder="Notes" style="margin-top:6px">
      </div>
```

- [ ] **Step 2: Wrap `agg-notes`.** Replace:

```html
      <input type="text" id="agg-notes" placeholder="Notes" style="margin-top:6px">
```

with:

```html
      <button type="button" class="func-note-toggle" onclick="FacialForm.toggleNote('agg-notes')">+ Note</button>
      <div class="func-note collapsed" id="agg-notes-wrap">
        <input type="text" id="agg-notes" placeholder="Notes" style="margin-top:6px">
      </div>
```

- [ ] **Step 3: Wrap `ease-notes`.** Replace:

```html
      <input type="text" id="ease-notes" placeholder="Notes" style="margin-top:6px">
```

with:

```html
      <button type="button" class="func-note-toggle" onclick="FacialForm.toggleNote('ease-notes')">+ Note</button>
      <div class="func-note collapsed" id="ease-notes-wrap">
        <input type="text" id="ease-notes" placeholder="Notes" style="margin-top:6px">
      </div>
```

- [ ] **Step 4: Wrap `hrs24-notes`.** Replace:

```html
      <input type="text" id="hrs24-notes" placeholder="Notes" style="margin-top:6px">
```

with:

```html
      <button type="button" class="func-note-toggle" onclick="FacialForm.toggleNote('hrs24-notes')">+ Note</button>
      <div class="func-note collapsed" id="hrs24-notes-wrap">
        <input type="text" id="hrs24-notes" placeholder="Notes" style="margin-top:6px">
      </div>
```

- [ ] **Step 5: Wrap `sensation-notes` (different starting shape — risk #4).** Replace the whole `.fg` wrapper (currently facial.html:317):

```html
    <div class="fg"><div class="field"><label>Notes</label><input type="text" id="sensation-notes"></div></div>
```

with the same button+wrap shape as the others (drops the `.fg/.field/label` chrome; adds `placeholder="Notes"` + `margin-top:6px` so it matches its 4 siblings):

```html
    <button type="button" class="func-note-toggle" onclick="FacialForm.toggleNote('sensation-notes')">+ Note</button>
    <div class="func-note collapsed" id="sensation-notes-wrap">
      <input type="text" id="sensation-notes" placeholder="Notes" style="margin-top:6px">
    </div>
```

- [ ] **Step 6: Grep-confirm all 5 wraps + buttons exist.**

Run: `git grep -n "func-note collapsed" templates/forms/facial.html`
Expected: 5 lines — `nature-notes-wrap`, `agg-notes-wrap`, `ease-notes-wrap`, `hrs24-notes-wrap`, `sensation-notes-wrap`.

Run: `git grep -n "FacialForm.toggleNote" templates/forms/facial.html`
Expected: 5 lines, one per note id.

- [ ] **Step 7: Commit.**

```bash
git add templates/forms/facial.html
git commit -m "FACIAL-UIX: wrap 5 notes in collapsible +Note markup"
```

---

## Task 3: Wire the JS — toggle, auto-collapse, populate re-open, reset re-collapse

**Files:**
- Modify: `static/js/form_facial.js`

**Design note:** the empty-blur auto-collapse listeners are attached at the tail of `initGrids()` (which already runs in facial.html's `DOMContentLoaded`). This keeps `autoCollapseIfEmpty` private — only `toggleNote` needs exposing (the markup's `onclick` calls it). No new `onblur` attributes in the markup, no second export.

- [ ] **Step 1: Add a `NOTE_IDS` const + the two note helpers, after the affected-side block (after `getSide()`, currently form_facial.js:71).**

```js
  // ── Collapsible note toggle + empty-blur auto-collapse (copied from form_sci.js:129) ──
  var NOTE_IDS = ['nature-notes','agg-notes','ease-notes','hrs24-notes','sensation-notes'];

  function toggleNote(noteId) {
    var w = document.getElementById(noteId + '-wrap');
    if (w) w.classList.toggle('collapsed');
  }

  // NET-NEW (spec, approved): re-collapse a note opened but left empty on blur.
  // Only fires when trimmed value is empty (a stray space does not count as filled).
  function autoCollapseIfEmpty(noteId) {
    var input = document.getElementById(noteId);
    var w     = document.getElementById(noteId + '-wrap');
    if (input && w && input.value.trim() === '') w.classList.add('collapsed');
  }
```

- [ ] **Step 2: Attach the blur listeners at the tail of `initGrids()`.** The current function (form_facial.js:112–115) is:

```js
  function initGrids() {
    gFacial = AssessmentGrid.create({ containerId: 'facial-mov-grid', rows: FACIAL_ROWS, columns: GRADE_COL });
    gTongue = AssessmentGrid.create({ containerId: 'tongue-mov-grid', rows: TONGUE_ROWS, columns: GRADE_COL });
  }
```

Append the blur-wiring loop so the function becomes:

```js
  function initGrids() {
    gFacial = AssessmentGrid.create({ containerId: 'facial-mov-grid', rows: FACIAL_ROWS, columns: GRADE_COL });
    gTongue = AssessmentGrid.create({ containerId: 'tongue-mov-grid', rows: TONGUE_ROWS, columns: GRADE_COL });
    NOTE_IDS.forEach(function (id) {
      var input = document.getElementById(id);
      if (input) input.addEventListener('blur', function () { autoCollapseIfEmpty(id); });
    });
  }
```

- [ ] **Step 3: In `populate()`, re-open any note that has content** (mirror `form_sci.js:249–255`), so a written note is never hidden behind a click. The current note-setting lines are form_facial.js:186–189 (nature/agg/ease/hrs24) and 210 (sensation):

```js
    setChips('nature-chips', d.nature); sv('nature-notes', d.natureNotes);
    setChips('agg-chips',    d.agg);    sv('agg-notes',    d.aggNotes);
    setChips('ease-chips',   d.ease);   sv('ease-notes',   d.easeNotes);
    setChips('hrs24-chips',  d.hrs24);  sv('hrs24-notes',  d.hrs24Notes);
```

...and line 210:

```js
    sv('sensation-notes', s.notes);
```

Immediately AFTER line 210 (after all five note values are set — `nature/agg/ease/hrs24` from d, `sensation` from `s.notes`), add a single re-open sweep:

```js
    // Re-open any note that has content so a written note is never hidden behind a click.
    NOTE_IDS.forEach(function (id) {
      var input = document.getElementById(id);
      var w     = document.getElementById(id + '-wrap');
      if (input && w && input.value.trim() !== '') w.classList.remove('collapsed');
    });
```

> Placing the sweep after line 210 covers all 5 in one loop and avoids interleaving per-note `classList` calls into the existing `sv()` lines. The sweep reads the already-set input values, so it correctly re-opens exactly the notes that received content.

- [ ] **Step 4: In `reset()`, re-collapse all 5 wrappers** so a cleared form returns to the tidy default. The note *values* are already blanked by the existing `ids.forEach(sv(id,''))` sweep (form_facial.js:234). Add the re-collapse AFTER the chip-clearing block (after form_facial.js:237's `.forEach(clearChips)` line):

```js
    // Re-collapse all notes back to the tidy +Note default.
    NOTE_IDS.forEach(function (id) {
      var w = document.getElementById(id + '-wrap');
      if (w) w.classList.add('collapsed');
    });
```

- [ ] **Step 5: Expose `toggleNote` on the returned `FacialForm` object.** The current return (form_facial.js:252–264) ends:

```js
    collect: collect,
    populate: populate,
    reset: reset
  };
```

Add `toggleNote` (the markup `onclick` needs it). `autoCollapseIfEmpty` stays private:

```js
    collect: collect,
    populate: populate,
    reset: reset,
    toggleNote: toggleNote
  };
```

- [ ] **Step 6: Syntax-check.**

Run: `node --check static/js/form_facial.js`
Expected: exits 0, no output. (A stray brace or unescaped quote breaks the whole IIFE silently — do not skip this.)

- [ ] **Step 7: Commit.**

```bash
git add static/js/form_facial.js
git commit -m "FACIAL-UIX: toggleNote + empty-blur auto-collapse + populate/reset wiring"
```

---

## Task 4: Static verification

**Files:** none modified.

- [ ] **Step 1: Confirm JS parses.**

Run: `node --check static/js/form_facial.js`
Expected: exits 0.

- [ ] **Step 2: Confirm only the two intended files changed since main.**

Run: `git diff --stat main`
Expected: exactly two files — `templates/forms/facial.html` and `static/js/form_facial.js`. If `form_base.js`, `style.css`, or any other file appears, STOP — a shared-code edit leaked in, violating the build shape.

- [ ] **Step 3: Confirm export + toggle id consistency.**

Run: `git grep -n "toggleNote" static/js/form_facial.js`
Expected: definition (`function toggleNote`), the `addEventListener`-adjacent usage is NOT toggleNote (it's autoCollapseIfEmpty — confirm they're distinct), and the export line `toggleNote: toggleNote`. The 5 markup callers live in facial.html (verified in Task 2 Step 6).

---

## Task 5: Smoke-test on the running form (Miruya) — GATE BEFORE MERGE

This is manual, on the worktree's running app, per WORKFLOW (smoke-test BEFORE merge). All boxes must pass before merge to main.

- [ ] **Step 1: Form loads tidy.** Open a FACIAL assessment form. Pain + Sensation sections show only `+ Note` links — no open boxes. Vertical height visibly tighter than before.

- [ ] **Step 2: Open + type sticks.** Tap `+ Note` on a note → box appears AND receives focus. Type something → it stays open.

- [ ] **Step 3: Saved/draft note auto-opens.** Save a record WITH notes, reload / reopen the saved record → boxes with content auto-open on `populate()`. Content is NEVER hidden behind a click.

- [ ] **Step 4: ⚠ AUTO-COLLAPSE FEEL-POKE (DO NOT SKIP — Miruya explicitly asked for this).** Deliberately do the awkward thing: tap `+ Note`, type NOTHING, pause a beat (as if glancing at the patient), then click another field. Watch the box vanish.
  - Does it feel **helpful** (form tidied up after you) or **jumpy/aggressive** (form yanked it out from under you)?
  - **This is Miruya's clinical-feel call, not a technical one.**
  - If it feels wrong → revert to SCI's dead-simple behavior: drop the blur wiring (remove the `NOTE_IDS.forEach(... addEventListener('blur' ...))` block from `initGrids()` in Task 3 Step 2, and optionally remove `autoCollapseIfEmpty`). Boxes then stay open until reload; empty boxes collapse only on populate/reset. One-line-ish change. Re-commit, re-smoke Steps 1–3.

- [ ] **Step 5: Clear/New re-collapses.** Hit Clear / New → all 5 notes re-collapse to the tidy `+ Note` default.

- [ ] **Step 6: Round-trip integrity.** Save a record WITH notes → reload → note values round-trip correctly AND their boxes are open.

- [ ] **Step 7: No regression.** Chips (4 multi-select pain groups + 3 single-select sensation groups), both grids, pain slider, affected-side toggle, and every other section behave exactly as before. PDF + MPIS unaffected (they read note *values*, unchanged).

---

## Task 6: Finish — merge only after the gate passes

- [ ] **Step 1: Confirm all Task 5 boxes pass** (including the auto-collapse decision — kept or reverted).

- [ ] **Step 2: Use the `superpowers:finishing-a-development-branch` skill** to merge the worktree branch into main with `--no-ff`, mirroring the templates-work merge pattern (`git merge --no-ff <branch>`).

- [ ] **Step 3: Note the worktree folder** in HANDOVER under "Half-done" if Windows CWD-locks it post-merge (known pattern — folder lingers until the session closes; safe to `rmdir /s /q` later).

---

## Self-review (against FACIAL_UIX_SPEC.md)

- **Spec "Fix" — all 5 notes collapse to `+ Note`:** covered by Task 2 (markup) Steps 1–5, one per note id. ✔
- **Default hidden:** `collapsed` class on every wrap (Task 2) + `.func-note.collapsed { display:none }` CSS (Task 1). ✔
- **Tap opens + focus:** `toggleNote` (Task 3 Step 1) toggles `collapsed`; native focus follows the visible input on tap. ✔ (Note: SCI's donor `toggleNote` also only toggles visibility — focus is not forced in code. Matches donor.)
- **Has content stays open:** content keeps the box open by definition; blur only collapses when `value.trim() === ''` (Task 3 Step 1). ✔
- **Saved record auto-opens:** populate re-open sweep (Task 3 Step 3). ✔
- **NET-NEW empty-blur re-collapse, trim-aware:** `autoCollapseIfEmpty` + `initGrids` blur wiring (Task 3 Steps 1–2). ✔
- **Reset re-collapses:** Task 3 Step 4. ✔
- **Expose toggleNote:** Task 3 Step 5. ✔
- **ZERO shared-code edits:** enforced by Task 4 Step 2 (`git diff --stat main` must show exactly 2 files). ✔
- **Keep `<input>`, don't convert to `<textarea>`:** risk #2 + Task 2 preamble. ✔
- **Smoke-test poke not buried:** Task 5 Step 4, flagged ⚠ DO NOT SKIP, with the one-line revert spelled out. ✔
- **Build on new worktree, smoke before merge:** Task 0 + Task 6. ✔
- **collect() / chips / grids / slider / PDF / MPIS untouched:** Task 5 Step 7 regression check + "Files touched" exhaustive list. ✔
