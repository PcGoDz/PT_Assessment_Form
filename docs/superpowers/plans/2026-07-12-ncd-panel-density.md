# NCD Panel Density Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Project axiom override:** NO TDD on the UI layer (per CLAUDE.md). This is DOM-building vanilla JS. Verification is console smoke + a human clinical pass, NOT unit tests. Do not scaffold a test suite.

**Goal:** Make the NCD SOAP-modal measurements panel ~2× denser (flat inline-label grid, 3 columns, fitness notes as `+Note` chips) so per-visit logging stops being a scroll-marathon — without changing any field key or public method contract.

**Architecture:** Single-file change to `static/js/ncd_measure.js`. Rewrite `buildGrid()` to override the grid container into a dense auto-fill grid and build inline-label cells; add a `_buildNoteChip()` helper that renders the 6 optional comment fields as collapsible `+Note` chips; teach `populate()` to auto-expand a note with saved content and `clear()` to re-collapse. All styling is JS inline styles — **zero `episode.html` edits, zero shared `style.css` edits.** The 42-key battery contract and every public method signature stay identical, so the 2026-07-07 draft-loss fix (`7d5caed`) keeps working untouched.

**Tech Stack:** Vanilla JS (IIFE module, no framework), CSS via inline styles + existing M3 CSS custom properties.

**Reference spec:** `docs/superpowers/specs/2026-07-12-ncd-panel-density-design.md`. Read it before starting.

---

## File Structure

- **Modify:** `static/js/ncd_measure.js` — the ONLY file touched.
  - `BATTERY` array: add a `note: true` render-flag to the 6 comment entries (keys unchanged).
  - `buildGrid()`: full rewrite of the cell-construction loop + grid-container override.
  - New `_buildNoteChip(f, strip)`: builds one `+Note` chip + collapsed input.
  - `populate(m)`: add note auto-expand.
  - `clear()`: add note re-collapse.
  - `collect()`, `maybeShow()`, `loadForSoap()`, `save()`, `recompute()`, `_bmi()`, `_whr()`, `el()`: UNCHANGED.

No other files. If you find yourself editing `episode.html`, STOP — that's the RED LINE (see spec §6).

---

## Task 1: Flag the 6 note fields in BATTERY

**Files:**
- Modify: `static/js/ncd_measure.js` (the `BATTERY` array, ~lines 46–58)

The 6 optional freeform comment fields become `+Note` chips. Add `note: true` to each. Keys and `type` stay exactly as-is (`collect()` still reads them as normal text inputs).

- [ ] **Step 1: Add the render flag to the 6 comment entries**

Change these 6 lines inside `BATTERY` (Fitness group) from:

```js
    { key: 'walk6Comment',  label: '6MWT Note',       type: 'text'   },
```
```js
    { key: 'step3Comment',  label: '3-min Step Note', type: 'text'   },
```
```js
    { key: 'flexComment',   label: 'Flexibility Note',type: 'text'   },
```
```js
    { key: 'ulComment',     label: 'UL Strength Note',type: 'text'   },
```
```js
    { key: 'llComment',     label: 'LL Strength Note',type: 'text'   },
```
```js
    { key: 'balanceComment',label: 'Balance Note',    type: 'text'   }
```

to (add `, note: true` to each):

```js
    { key: 'walk6Comment',  label: '6MWT Note',        type: 'text', note: true },
    { key: 'step3Comment',  label: '3-min Step Note',  type: 'text', note: true },
    { key: 'flexComment',   label: 'Flexibility Note', type: 'text', note: true },
    { key: 'ulComment',     label: 'UL Strength Note', type: 'text', note: true },
    { key: 'llComment',     label: 'LL Strength Note', type: 'text', note: true },
    { key: 'balanceComment',label: 'Balance Note',     type: 'text', note: true }
```

- [ ] **Step 2: Self-check**

Run: `grep -n "note: true" static/js/ncd_measure.js`
Expected: exactly 6 matches, all in the Fitness section.

- [ ] **Step 3: Commit**

```bash
git add static/js/ncd_measure.js
git commit -m "ncd: flag 6 fitness comment fields as note-render in BATTERY"
```

---

## Task 2: Rewrite buildGrid() into a dense inline-label grid + add note chips

**Files:**
- Modify: `static/js/ncd_measure.js` — replace `buildGrid()` (~lines 81–114) and add `_buildNoteChip()` above it.

This is the core change. The grid container currently inherits the 2-col `session-info-grid` class; we override its layout via inline styles. Numeric/short-text fields become inline-label cells (label beside input, ~28px tall). The 6 note fields are gathered and flushed as a full-width chip strip at the end of their group (so they don't break the numeric column rhythm mid-group).

- [ ] **Step 1: Add the `_buildNoteChip` helper**

Insert this function immediately BEFORE `function buildGrid()`:

```js
  // ── Build one +Note chip: button toggles a collapsed input (same id contract) ──
  function _buildNoteChip(f, strip) {
    var wrap = document.createElement('span');
    wrap.style.cssText = 'display:inline-flex;flex-direction:column;';

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = '+ ' + f.label;
    btn.style.cssText = 'font-size:11px;color:var(--accent);background:none;' +
      'border:1px solid var(--border);border-radius:14px;padding:2px 10px;' +
      'cursor:pointer;align-self:flex-start;font-family:inherit;';

    var box = document.createElement('div');
    box.id = 'ncdm-' + f.key + '-wrap';
    box.style.display = 'none';

    var inp = document.createElement('input');
    inp.id = 'ncdm-' + f.key;
    inp.type = 'text';
    inp.autocomplete = 'off';
    inp.placeholder = f.label;
    inp.style.cssText = 'margin-top:4px;height:28px;font-size:12px;padding:2px 8px;' +
      'border:1px solid var(--border);border-radius:6px;min-width:180px;' +
      'background:var(--m3-surface-container, var(--surface));color:var(--text);' +
      'font-family:inherit;outline:none;';

    btn.addEventListener('click', function () {
      box.style.display = (box.style.display === 'none') ? '' : 'none';
    });

    box.appendChild(inp);
    wrap.appendChild(btn);
    wrap.appendChild(box);
    strip.appendChild(wrap);
  }
```

- [ ] **Step 2: Replace `buildGrid()` entirely**

Replace the whole existing `buildGrid()` function with:

```js
  // ── Build the grid once — dense inline-label layout ────────────────────
  function buildGrid() {
    if (_built) return;
    var grid = document.getElementById('ncd-measure-grid');
    if (!grid) return;

    // Override the inherited 2-col session-info-grid → dense auto-fill (lands 3-col at modal width).
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(150px, 1fr))';
    grid.style.gap = '6px 10px';
    grid.style.alignItems = 'center';

    var pendingNotes = [];
    function flushNotes() {
      if (!pendingNotes.length) return;
      var strip = document.createElement('div');
      strip.style.cssText = 'grid-column:1/-1;display:flex;flex-wrap:wrap;gap:6px;margin-top:2px;';
      pendingNotes.forEach(function (nf) { _buildNoteChip(nf, strip); });
      grid.appendChild(strip);
      pendingNotes = [];
    }

    BATTERY.forEach(function (f) {
      if (f.group) {
        flushNotes();
        var h = document.createElement('div');
        h.textContent = f.group;
        h.style.cssText = 'grid-column:1/-1;font-size:10px;font-weight:600;text-transform:uppercase;' +
          'letter-spacing:0.05em;color:var(--text-muted);margin-top:6px;';
        grid.appendChild(h);
        return;
      }
      if (f.note) { pendingNotes.push(f); return; }

      var cell = document.createElement('div');
      cell.style.cssText = 'display:flex;align-items:center;gap:6px;';

      var lab = document.createElement('label');
      lab.textContent = f.label;
      lab.style.cssText = 'font-size:12px;color:var(--text-muted);white-space:nowrap;';

      var inp = document.createElement('input');
      inp.id = 'ncdm-' + f.key;
      inp.autocomplete = 'off';
      inp.style.cssText = 'flex:1;min-width:0;height:28px;font-size:12px;padding:2px 8px;' +
        'border:1px solid var(--border);border-radius:6px;' +
        'background:var(--m3-surface-container, var(--surface));color:var(--text);' +
        'font-family:inherit;outline:none;';

      if (f.type === 'number') { inp.type = 'text'; inp.inputMode = 'decimal'; }
      else if (f.type === 'computed') {
        inp.type = 'text'; inp.readOnly = true;
        inp.style.background = 'var(--surface2)'; inp.style.color = 'var(--text-muted)';
      } else { inp.type = 'text'; }

      cell.appendChild(lab);
      cell.appendChild(inp);
      grid.appendChild(cell);
    });
    flushNotes();

    ['height', 'weight', 'waist', 'hip'].forEach(function (k) {
      var i = el(k);
      if (i) i.addEventListener('input', recompute);
    });
    _built = true;
  }
```

- [ ] **Step 3: Self-check the structure**

Run: `node -e "require('fs').readFileSync('static/js/ncd_measure.js','utf8')" && echo OK`
Expected: `OK` (file parses as readable). Then visually confirm: `grep -n "flushNotes\|_buildNoteChip\|gridTemplateColumns" static/js/ncd_measure.js` shows the new helper, both flush calls, and the grid override.

- [ ] **Step 4: Commit**

```bash
git add static/js/ncd_measure.js
git commit -m "ncd: dense inline-label grid + note chips in measurements panel buildGrid"
```

---

## Task 3: populate() auto-expands filled notes, clear() re-collapses

**Files:**
- Modify: `static/js/ncd_measure.js` — `populate()` (~lines 144–152) and `clear()` (~lines 155–161)

`collect()` already reads note inputs by their unchanged `ncdm-<key>` id, so it needs no change. But `populate()` must OPEN a note chip when the saved value is non-empty (otherwise a saved note is invisible until the clinician guesses to click), and `clear()` must re-collapse them (New/reset path).

- [ ] **Step 1: Replace `populate()`**

Replace the existing `populate()` with:

```js
  // ── Public: fill the panel from a measurements dict ─────────────────────
  function populate(m) {
    m = m || {};
    BATTERY.forEach(function (f) {
      if (f.group || f.type === 'computed') return;
      var i = el(f.key);
      if (i) i.value = (m[f.key] != null) ? m[f.key] : '';
      if (f.note) {
        var w = document.getElementById('ncdm-' + f.key + '-wrap');
        if (w) w.style.display = (i && i.value.trim() !== '') ? '' : 'none';
      }
    });
    recompute();   // bmi/whr reflect populated height/weight/waist/hip
  }
```

- [ ] **Step 2: Replace `clear()`**

Replace the existing `clear()` with:

```js
  // ── Public: blank the panel + re-collapse all note chips ────────────────
  function clear() {
    BATTERY.forEach(function (f) {
      if (f.group) return;
      var i = el(f.key);
      if (i) i.value = '';
      if (f.note) {
        var w = document.getElementById('ncdm-' + f.key + '-wrap');
        if (w) w.style.display = 'none';
      }
    });
  }
```

- [ ] **Step 3: Self-check**

Run: `grep -n "wrap'" static/js/ncd_measure.js`
Expected: the `-wrap` id referenced in `_buildNoteChip` (created), `populate` (auto-expand), and `clear` (collapse) — 3 read/build sites, consistent `'ncdm-' + f.key + '-wrap'` form.

- [ ] **Step 4: Commit**

```bash
git add static/js/ncd_measure.js
git commit -m "ncd: note chips auto-expand on populate, re-collapse on clear"
```

---

## Task 4: Verification & handoff

**No unit tests (UI-layer axiom).** Two gates: CC console smoke, then Miruya's clinical break-it pass.

- [ ] **Step 1: CC console smoke (against a live dev server)**

Start the app, open an NCD episode's SOAP modal (new note). Confirm in the browser console — zero JS errors — and by eye:
  1. Panel renders as a 3-column dense grid with 4 group bands (Vitals / Bloods / Body composition / Fitness tests).
  2. The 6 fitness note chips render collapsed at the bottom of the Fitness group; clicking one reveals its input, clicking again hides it.
  3. `bmi` / `whr` show as read-only muted inputs and still recompute live when height/weight/waist/hip change.

- [ ] **Step 2: Round-trip smoke (the draft-loss guard must survive)**

  1. Fill a few numeric fields + expand one note and type into it → Save → reopen that visit → all values incl. the note round-trip, and the filled note's chip is auto-expanded.
  2. New follow-up: type numbers, dismiss the modal via backdrop click, reopen → measurements survive (the `7d5caed` guard still holds).
  3. Trigger the reset/New path → all fields blank AND all note chips re-collapsed.
  4. Open a NON-NCD form (e.g. MS) SOAP modal → panel stays hidden, zero `/ncd-measurements` network calls.

- [ ] **Step 3: Push the branch and STOP**

```bash
git push -u origin <branch-name>
```

Do NOT merge. Report the branch name and a one-line smoke summary, then STOP. Merge is human-gated: Miruya runs his own break-it pass on the worktree, and we merge together afterward (WORKFLOW-176).

---

## Self-Review (author pass — done before handoff)

- **Spec coverage:** flat dense grid (T2), inline labels (T2), 3-col (T2 grid override), note chips (T1+T2+T3), computed inline read-only (T2), group bands kept (T2), auto-expand/collapse (T3), labels stay full — no shorthand (spec §5, no task needed; values are short so inputs shrink to fit), zero episode.html / style.css edits (file scope), frozen keys + unchanged public contract (T1 keeps keys; collect/maybeShow/loadForSoap/save untouched), draft-loss guard (T4 step 2), screen-only no PDF/MPIS (out of scope, nothing touches it). All spec sections map to a task.
- **Placeholder scan:** no TBD/TODO; every code step shows complete code.
- **Type/id consistency:** note wrapper id is `'ncdm-' + f.key + '-wrap'` in all 3 sites (build/populate/clear); input id is `'ncdm-' + f.key` everywhere including chips, so `collect()`/`el()` keep working unchanged; `note` flag read in buildGrid/populate/clear matches the flag set in T1.
