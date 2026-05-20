# Plan: Dead Code Cleanup (U3 + U4)
**Source:** PATHFINDER-2026-05-18/02-duplication-report.md (D3, D4, D5, D7)
**Scope:** Delete 7 dead MPIS wrappers, form.js, pdf_generator.py, one orphaned comment.
**Risk:** Zero — all targets confirmed to have no call sites outside their own file.

---

## Phase 0: Discovery (COMPLETE)

All facts verified from source. No further discovery needed.

**Confirmed dead targets:**

| Target | Evidence |
|--------|----------|
| `main.js:1499–1509` — 7 MPIS wrapper functions | Confirmed not called from any template. `base.html:131` calls `Main.copyToMpisAuto()` only. |
| `main.js:1651–1657` — 7 exports in Main return object | Same. |
| `static/js/form.js` | Not script-tagged in any template. Not in `pt_assessment.spec`. |
| `pdf_generator.py` | Not imported in `app.py`. Not in `_PDF_GENERATORS` or `_SINGLE_PDF_GENERATORS`. IS in `pt_assessment.spec:12`. |
| `pdf_amputation.py:341` | Orphaned comment between two function defs, after `return story` at line 339. |

---

## Phase 1: Delete MPIS Wrappers from main.js

**File:** `static/js/main.js`

**Step 1a — delete the 7 wrapper functions.**

Find and delete this entire block (lines 1498–1509):
```js
  // ── MPIS public wrappers ───────────────────────
  async function copyToMpisSpine()      { var h = await showMpisHeaderModal(); if (!h) return; await _doCopyMpis(_buildMpisSpine(),      h); }
  async function copyToMpisGeriatric()  { var h = await showMpisHeaderModal(); if (!h) return; await _doCopyMpis(_buildMpisGeriatric(),  h); }
  async function copyToMpisCr()         { var h = await showMpisHeaderModal(); if (!h) return; await _doCopyMpis(_buildMpisCr(),         h); }
  async function copyToMpis()           { var h = await showMpisHeaderModal(); if (!h) return; await _doCopyMpis(_buildMpisMs(),          h); }
  async function copyToMpisAmputation() { var h = await showMpisHeaderModal(); if (!h) return; await _doCopyMpis(_buildMpisAmputation(), h); }
  async function copyToMpisNeuro()      { var h = await showMpisHeaderModal(); if (!h) return; await _doCopyMpis(_buildMpisNeuro(),      h); }
  async function copyToMpisHand() {
    var h = await showMpisHeaderModal();
    if (!h) return;
    await _doCopyMpis(_buildMpisHand(), h);
  }
```

**Step 1b — delete the 7 export lines from the Main return object.**

Find and delete these lines (currently at lines 1651–1657):
```js
    copyToMpis:               copyToMpis,
    copyToMpisSpine:          copyToMpisSpine,
    copyToMpisGeriatric:      copyToMpisGeriatric,
    copyToMpisCr:             copyToMpisCr,
    copyToMpisAmputation:     copyToMpisAmputation,
    copyToMpisNeuro:          copyToMpisNeuro,
    copyToMpisHand:           copyToMpisHand,
```

The line immediately before them (`get isDirty() { return isDirty; },` at line 1650) and the line immediately after (`copyToMpisAuto: copyToMpisAuto,`) must remain untouched.

**Verification checklist:**
- [ ] `node --check static/js/main.js` — passes with no errors
- [ ] Grep `main.js` for `copyToMpisSpine` — zero results
- [ ] Grep `main.js` for `copyToMpisAuto` — still present (do NOT delete this one)
- [ ] Grep `templates/` for `copyToMpisSpine|copyToMpisGeriatric|copyToMpisCr|copyToMpisAmputation|copyToMpisNeuro|copyToMpisHand` — zero results

**Anti-pattern guards:**
- Do NOT delete `copyToMpisAuto` — that is the live dispatcher wired to `base.html:131`
- Do NOT delete the builder functions (`_buildMpisMs`, `_buildMpisSpine`, etc.) — `copyToMpisAuto` calls them
- Do NOT delete `_doCopyMpis`, `showMpisHeaderModal` — still used by `copyToMpisAuto`

---

## Phase 2: Delete Dead Files

**Step 2a — delete `static/js/form.js`.**

Before deleting: confirm `grep -r "form.js" templates/` returns zero results (or only PATHFINDER docs).

Delete the file `static/js/form.js`.

**Step 2b — delete `pdf_generator.py`.**

Before deleting: confirm `grep "pdf_generator" app.py` returns zero results.

Delete the file `pdf_generator.py`.

**Step 2c — remove `pdf_generator.py` from `pt_assessment.spec`.**

Open `pt_assessment.spec`. Find line 12:
```python
        ('pdf_generator.py', '.'),
```
Delete that line. The surrounding lines (other `pdf_*.py` entries) must remain untouched.

**Verification checklist:**
- [ ] `static/js/form.js` does not exist
- [ ] `pdf_generator.py` does not exist
- [ ] `pt_assessment.spec` still contains entries for: `pdf_ms.py`, `pdf_spine.py`, `pdf_geriatric.py`, `pdf_cr.py`, `pdf_amputation.py`, `pdf_neuro.py`, `pdf_hand.py`, `pdf_platypus_base.py`, `pdf_base.py`
- [ ] `pt_assessment.spec` no longer contains `pdf_generator.py`
- [ ] `grep "pdf_generator" pt_assessment.spec` — zero results

**Anti-pattern guards:**
- Do NOT delete `pdf_base.py` — it is still used by `pdf_platypus_base.py:54` via try/except import for `BodyChartFlowable`

---

## Phase 3: Remove Orphaned Comment from pdf_amputation.py

**File:** `pdf_amputation.py`

Line 341 contains an orphaned comment between two function definitions:
```python
    # ── Left column / Right column split ──────────────────────────
```

This line sits after `return story` (line 339, end of `_build_story`) and before `def generate_amputation_pdf(data):` (line 342). Delete this one line.

**Verification checklist:**
- [ ] `grep "Left column / Right column" pdf_amputation.py` — zero results
- [ ] `python -c "import pdf_amputation"` — no SyntaxError

---

## Phase 4: Final Verification

Run all checks together:

```
node --check static/js/main.js
python -c "import pdf_amputation; import pdf_platypus_base"
grep -r "form\.js" templates/
grep "pdf_generator" app.py pt_assessment.spec
grep "copyToMpisSpine\|copyToMpisGeriatric\|copyToMpisCr\|copyToMpisAmputation\|copyToMpisNeuro\|copyToMpisHand" templates/ static/js/main.js
```

All should return zero results or clean output.

Start the app (`python app.py`), open a form, click Copy to MPIS — confirm the modal appears and copy works. This confirms `copyToMpisAuto` is still intact.
