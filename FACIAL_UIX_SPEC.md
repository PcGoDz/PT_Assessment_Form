# FACIAL_UIX_SPEC.md — Collapsible Optional Notes (`+ Note` ghost)

**Status:** Design approved 2026-06-18 (brain-window brainstorm). Awaiting implementation plan → CC build.
**Part of:** FACIAL Phase 1.2 polish.
**Sibling task:** `FACIAL_TEMPLATES_PROMPT.md` (SMART templates) — independent; either can ship first.
**Donor pattern:** SCI form (`sci.html` + `form_sci.js`) — verified by reading real source, NOT memory. (Passover note said "BURN" — that was wrong; BURN uses plain always-on textareas. The `+ Note` collapsible lives in SCI.)

---

## Problem

The Pain Assessment section (`s-pain`) and Sensation Test section (`s-sens`) render **5 always-open full-width "Notes" boxes** sitting empty on most patients. Each box is roughly as tall as the chip row above it, so a large share of those sections' vertical height is empty boxes that visually nag the clinician to fill them ("fill me up bro"). The chips are the real content; the open boxes are noise pretending to be content.

The 5 offending notes (all currently `<input type="text">` with a `Notes` placeholder, rendered open):
1. Nature notes — `#nature-notes` (facial.html ~line 201)
2. Aggravating notes — `#agg-notes` (~213)
3. Easing notes — `#ease-notes` (~225)
4. 24hrs notes — `#hrs24-notes` (~235)
5. Sensation notes — `#sensation-notes` (~317)

---

## Fix

Port SCI's `+ Note` collapsible pattern onto all 5 notes. Each note collapses to a small, quiet `+ Note` ghost link placed under its chips. Behavior:

- **Default:** note hidden; only the `+ Note` link shows.
- **Tap `+ Note`:** the box appears and receives focus.
- **Has content:** stays open.
- **Saved record with a note:** auto-opens on `populate()` so a written note is NEVER hidden behind a click.
- **NET-NEW tweak (approved):** if the box is opened, left empty, and loses focus, it quietly re-collapses. Only fires when the trimmed value is empty (a stray space does not count as filled).

This is a **visibility-layer change only.** Note *values* already collect/populate correctly — nothing about the data contract changes.

---

## ⚠ MIRUYA SMOKE-TEST POKE — auto-collapse feel-gamble (DO NOT SKIP)

The auto-collapse-on-blur is the one place this design gambles on *feel* over safety. **Miruya explicitly asked to be poked about this.**

When smoke-testing, deliberately do the awkward thing: tap `+ Note`, type nothing, pause a beat (as if glancing at the patient), then click another field. Watch whether the box vanishing feels **helpful** or feels like the form **yanked it out from under you**.

- If it feels jumpy/aggressive → revert to SCI's dead-simple behavior: "box stays open until reload, empty boxes collapse only on populate/reset." That is a one-line change (drop the blur handler). This is **Miruya's clinical-feel call**, not a technical one.

The only soft spot is the "tapped open, still thinking, haven't typed" moment. Mitigation: re-tapping `+ Note` brings it back instantly. Judged acceptable, but flagged.

---

## Build shape (ship-crude — all form-local, ZERO shared-code edits)

**Decision (Claude's call, per RULES.md — technical decisions are Claude's):** copy the pattern LOCALLY into FACIAL. Do NOT promote to `form_base.js` / `style.css`. Rationale: ship-crude axiom + the bible's promotion rule (promote on the THIRD consumer; SCI+FACIAL = two) + `form_sci.js` precedent of keeping local helper copies. No axiom-protected shared file is touched.

### 1. `facial.html` `<style>` block (inside `{% block content %}`, alongside existing `.grid-stamp-btn`)
Add, copied from `sci.html:34–36`:
```css
.func-note-toggle { font-size:12px; color:var(--accent); background:none; border:none;
  cursor:pointer; padding:4px 0; }
.func-note.collapsed { display:none; }
```

### 2. `facial.html` markup — wrap each of the 5 notes
For each note, replace the bare `<input ... id="X-notes">` with the SCI shape: a `+ Note` button, then a wrapper div (collapsed by default) holding the input. Pattern (mirrors `sci.html:396–399`):
```html
<button type="button" class="func-note-toggle" onclick="FacialForm.toggleNote('nature-notes')">+ Note</button>
<div class="func-note collapsed" id="nature-notes-wrap">
  <input type="text" id="nature-notes" placeholder="Notes">
</div>
```
Apply to: `nature-notes`, `agg-notes`, `ease-notes`, `hrs24-notes`, `sensation-notes` (the last loses its current `<div class="fg"><div class="field"><label>Notes</label>…` wrapper styling — keep a `Notes` affordance via the button; confirm visual on running form).

> **CC note — do NOT "helpfully" convert these to `<textarea>`.** FACIAL's notes are `<input type="text">`; SCI's are `<textarea>`. The collapsible pattern is element-agnostic — keep them as `<input>`. Converting them is scope creep.

### 3. `form_facial.js`
- Add local `toggleNote(id)` (copy from `form_sci.js:129–132`):
  ```js
  function toggleNote(noteId) {
    var w = document.getElementById(noteId + '-wrap');
    if (w) w.classList.toggle('collapsed');
  }
  ```
- Add the NET-NEW empty-blur auto-collapse helper, wired to each note input's `onblur` (or attached in `initGrids()` / DOMContentLoaded). Collapse only when `value.trim() === ''`:
  ```js
  function autoCollapseIfEmpty(noteId) {
    var input = document.getElementById(noteId);
    var w = document.getElementById(noteId + '-wrap');
    if (input && w && input.value.trim() === '') w.classList.add('collapsed');
  }
  ```
- In `populate()`: after setting each note value, re-open any note that has content (mirror `form_sci.js:249–255`). For the 5 note ids: `if (value) document.getElementById(id + '-wrap').classList.remove('collapsed');`
- In `reset()`: notes are already blanked by the existing `ids.forEach(sv(id,''))` sweep; ADD a step to re-collapse all 5 wrappers (add `.collapsed` back) so a cleared form returns to the tidy default.
- Expose `toggleNote` on the returned `FacialForm` object.

### 4. NOT touched
`collect()` (note values already collected), the 4 multi-chip groups, sensation single-selects, both grids, pain slider, affected-side toggle, every other section. PDF + MPIS unaffected (they read note *values*, which are unchanged).

---

## Risk register
1. **Auto-collapse feel-trap** — see the smoke-test poke above. The one real gamble. Miruya's call on the running form.
2. **`<input>` vs `<textarea>`** — FACIAL notes are `<input>`; SCI's are `<textarea>`. Cosmetic only; flagged so CC doesn't convert them.
3. **`+ Note` placement** — own line (SCI-style) vs trailing the chip row is a see-it-live call. CC builds it SCI-style (own line) first; Miruya adjusts on the running form if it reads cramped.
4. **Sensation note wrapper** — `#sensation-notes` currently sits in a `.fg > .field > label` structure; the others sit bare under chips. Confirm the collapsed treatment looks consistent across both sections on the running form.

---

## Verification (smoke-test on worktree BEFORE merge — per WORKFLOW)
- [ ] `node --check static/js/form_facial.js` passes.
- [ ] Form loads: Pain + Sensation sections show only `+ Note` links, no open boxes. Vertical height visibly tighter.
- [ ] Tap `+ Note` → box opens + focuses. Type → stays. Reload draft / open saved record with a note → box auto-opens.
- [ ] **Auto-collapse poke (Miruya):** tap open, type nothing, click away → does the vanish feel helpful or jumpy? Decide keep-vs-revert.
- [ ] Clear / New → all 5 notes re-collapse to the tidy default.
- [ ] Save a record WITH notes → reload → notes round-trip AND their boxes are open (content never hidden).
- [ ] No regression: chips, grids, pain slider, other sections unchanged.

---

## Handoff
After approval: → `writing-plans` skill for the rung-by-rung implementation plan → CC executes on a worktree → Miruya smoke-tests the worktree (incl. the auto-collapse poke) → merge to main only after pass. Standing flag: Saint Dario (CC) was wheezing 2026-06-18 — check CC status before building; this spec is plan-now-fire-later.
