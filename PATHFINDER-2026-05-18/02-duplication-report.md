# PT Assessment System — Duplication Report

**Phase 2 findings. All claims cite ≥2 file:line locations.**

---

## D1 — `_ensure_dict()` copied into 4 PDF files [HIGH value to consolidate]

**Concern:** A 7-line helper that safely coerces a SQLite JSON string (or None, or already-dict) into a Python dict is redefined locally in four PDF generators. It is NOT in `pdf_platypus_base.py` where it belongs.

**Locations:**

| File | Line | Scope |
|------|------|-------|
| `pdf_geriatric.py` | 21 | module-level function, `import json` inside body |
| `pdf_hand.py` | 44 | module-level function, uses top-of-file `import json` |
| `pdf_neuro.py` | 28 | nested inside `_build_story()`, uses `import json as _json` |
| `pdf_amputation.py` | 24 | nested inside `_build_story()`, uses `import json as _json` |

**Implementations are functionally identical for realistic inputs (None / string / dict) but differ in the fallback line:**

| File | Fallback line |
|------|--------------|
| `pdf_geriatric.py:26` | `return val if isinstance(val, dict) else {}` |
| `pdf_neuro.py:34` | `return val if isinstance(val, dict) else {}` |
| `pdf_amputation.py:30` | `return val if isinstance(val, dict) else {}` |
| `pdf_hand.py:50` | `return val or {}` ← uses truthiness, not isinstance check |

`val or {}` and `val if isinstance(val, dict) else {}` produce the same result for None, string, non-empty dict. Diverge only if `val` is an empty dict `{}` — both return `{}` there too. Functionally equivalent in practice but technically different.

Canonical form to use in pdf_platypus_base.py:
```python
def ensure_dict(val):
    if isinstance(val, str):
        try:
            import json
            return json.loads(val)
        except Exception:
            return {}
    return val if isinstance(val, dict) else {}
```

**Why it diverged:** Each PDF file was written independently and needed to handle the fact that SQLite returns JSON as a string. The fix was copy-pasted without being extracted to the shared base.

**Not present in:** `pdf_ms.py`, `pdf_spine.py`, `pdf_cr.py` — these files do bare `.get('patient', {})` which works only because their patient data is already a dict at that call site. This is a latent bug: if SQLite ever returns the field as a JSON string in those files, they'll get a string and `.get()` will AttributeError.

**Consolidation:** Move to `pdf_platypus_base.py` as a module-level export. All 4 files + the 3 at-risk files should import and use it.

---

## D2 — `generate_episode_pdf()` copied verbatim into all 7 PDF files [HIGH value]

**Concern:** The 18-line episode PDF assembly function — get patient, build story, paginate SOAP notes 2-per-page with PageBreak+KeepTogether, call build_pdf — is near-verbatim in every form's PDF generator.

**Locations:**

| File | Line | Divergence |
|------|------|-----------|
| `pdf_ms.py` | 154 | None — canonical form |
| `pdf_spine.py` | 201 | None — identical to ms |
| `pdf_geriatric.py` | 316 | None — identical to ms |
| `pdf_cr.py` | 571 | None — identical to ms |
| `pdf_amputation.py` | 346 | Spurious `import json` at line 347 (never used here) |
| `pdf_neuro.py` | 445 | Two differences: (1) `pair = soap_page(...)` directly instead of `pair=[]; pair+=...`; (2) uses `__import__('reportlab.platypus',...).KeepTogether(pair)` hack — `KeepTogether` not in module-level imports |
| `pdf_hand.py` | 310 | Uses `_ensure_dict()` for patient extraction (line 313) |

**Identical body (all but pdf_hand.py):**
```python
story   = []
patient = (assessment_data or {}).get('patient', {})
if assessment_data:
    story += _build_story(assessment_data)
else:
    story += page_header(TITLE, REF)
    story.append(Paragraph('No initial assessment recorded for this episode.', S_NORMAL))
notes = soap_notes or []
for i in range(0, len(notes), 2):
    story.append(PageBreak())
    pair = []
    pair += soap_page(patient, notes[i], episode_info)
    if i + 1 < len(notes):
        pair += soap_page(patient, notes[i + 1], episode_info)
    story.append(KeepTogether(pair))
return build_pdf(story)
```

**Why it diverged:** Each generator is a standalone file. The `_build_story()` function is form-specific, so it was easier to copy the wrapper than to extract it. The `__import__` hack in pdf_neuro.py is a workaround for a missing `KeepTogether` import at module level in that file — the hack goes away when U2 moves the function to `pdf_platypus_base.py`, which already imports `KeepTogether` at line 6.

**Consolidation:** Move to `pdf_platypus_base.py` as:
```python
def generate_episode_pdf_base(build_story_fn, title, ref, assessment_data, soap_notes, episode_info=None):
```
Each form's `generate_episode_pdf` becomes a one-liner: `return generate_episode_pdf_base(_build_story, TITLE, REF, ...)`.

Note: `pdf_hand.py`'s patient extraction would need `_ensure_dict` applied before passing, OR the base function can call `_ensure_dict` on patient itself (which is the right fix anyway — see D1).

---

## D3 — Per-form MPIS wrapper functions (dead public API) [LOW value]

**Concern:** Seven per-form MPIS functions exist in `main.js` that each do exactly one thing: `showMpisHeaderModal → _doCopyMpis(builder, h)`. They are all exported in the `Main` public API but are never called from any HTML template.

**Locations (main.js):**

| Function | Line |
|----------|------|
| `copyToMpis()` (MS) | 1502 |
| `copyToMpisSpine()` | 1499 |
| `copyToMpisGeriatric()` | 1500 |
| `copyToMpisCr()` | 1501 |
| `copyToMpisAmputation()` | 1503 |
| `copyToMpisNeuro()` | 1504 |
| `copyToMpisHand()` | 1505–1509 |

All exported at main.js:1650–1656.

**What calls them:** Nothing. `base.html:131` wires the Copy to MPIS button to `Main.copyToMpisAuto()` exclusively. The per-form wrappers predate `copyToMpisAuto()` and were not cleaned up after the unified dispatcher was added.

**Consolidation:** Delete all 7 wrappers and remove from exports. `copyToMpisAuto()` handles all dispatch. No call sites to update.

**Risk:** Zero — no HTML or JS outside main.js references these functions.

---

## D4 — `form.js` dead file [LOW value, cleanup only]

**Concern:** `static/js/form.js` is a pre-refactor MS form implementation (`const Form = (function(){...})()`, ~300 lines). It is not loaded in any template and would conflict with `window.Form` if it were.

**Evidence:**
- Not referenced in `templates/base.html`, `home.html`, `episode.html`, or `patient.html`
- Exports `Form` as a block-scoped const (IIFE pattern), not `window.Form`
- `form_ms.js` is the current MS form implementation
- `form.js` collect() has hardcoded `meta: { form: 'MS' }` and `_form_type` is absent — confirms it's pre-contract era

**Why it exists:** Pre-dates the `window.Form` contract and form IIFE refactor. Never deleted.

**Consolidation:** Delete the file. Also remove from `pt_assessment.spec` datas if present (currently not in spec — confirmed it's not bundled).

---

## D5 — `pdf_generator.py` dead file [LOW value, cleanup only]

**Concern:** `pdf_generator.py` is the original canvas-based MS PDF generator. It is not imported in `app.py`, not in `_PDF_GENERATORS`, not in `_SINGLE_PDF_GENERATORS`. It is still bundled in `pt_assessment.spec` (~line 12).

**Evidence:**
- `app.py` imports: `pdf_ms`, `pdf_spine`, `pdf_geriatric`, `pdf_cr`, `pdf_amputation`, `pdf_neuro`, `pdf_hand` — no `pdf_generator`
- Neither dispatch dict references it
- Adds dead weight to the exe bundle

**Consolidation:** Delete file, remove from `pt_assessment.spec`.

---

## D6 — `gv()`/`sv()` helpers inconsistently sourced across form files [LOW, known]

**Concern:** `form_hand.js` defines its own `gv()`/`sv()` directly (lines 5–13) instead of delegating to `FormBase.gv`/`FormBase.sv` as `form_ms.js`, `form_spine.js`, `form_cr.js`, `form_geriatric.js`, `form_neuro.js`, and `form_amputation.js` do.

**Locations:**

| File | Pattern |
|------|---------|
| `form_ms.js:7–8` | `var gv = FormBase.gv; var sv = FormBase.sv;` |
| `form_spine.js:7–8` | same |
| `form_cr.js:7–8` | same |
| `form_geriatric.js:5–6` | `function gv(id) { return FormBase.gv(id); }` |
| `form_neuro.js:5–6` | same |
| `form_amputation.js:5–6` | same |
| `form_hand.js:5–13` | inline re-implementation |

**Why it diverged:** `form_hand.js` adds an extra null-guard comment (`if (!el) return ''`). `FormBase.gv` already null-guards. The divergence is cosmetic — not a behavior difference.

**Consolidation:** Not urgent. Minor cleanup: replace `form_hand.js:5–13` with `var gv = FormBase.gv; var sv = FormBase.sv;`. Low priority.

---

## D7 — `pdf_amputation.py:341` orphaned comment [TRIVIAL]

**Concern:** `# ── Left column / Right column split ──` appears at line 341 in `pdf_amputation.py`, which is below `return story` in `_build_story()` — unreachable code position (a comment orphaned by a prior str_replace edit).

**Location:** `pdf_amputation.py:341`

---

## Legitimate Non-Duplications

These LOOK like duplication but are NOT:

- **`window.Form = { collect, populate, reset, ... }` contract** in all 7 form_xxx.js files — this is the required API surface, not duplication. Each form's implementation is form-specific.
- **`soap_page()` usage** in all 7 PDF files — the function is defined once in `pdf_platypus_base.py:482`. Properly centralized.
- **`sign_chop_block()` usage** — defined once in `pdf_platypus_base.py:424`. Properly centralized.
- **`patient_bar()` usage** — defined once in `pdf_platypus_base.py`. Properly centralized.
- **`audit_log` INSERTs** at database.py:549, 590, 665 — three different operations (update, insert, delete) on the same table. Intentional, not accidental.
- **LungChart colors** in lungchart.js and pdf_cr.py — cross-language (JS + Python). Cannot be shared. Must be kept in sync manually. Documented in F5 flowchart.
- **`_build_story()` per form** — form-specific layout code. Intentional divergence.

---

## Summary Table

| ID | Concern | Files | Lines | Value |
|----|---------|-------|-------|-------|
| D1 | `_ensure_dict()` redefined | 4 py files | ~28 | High |
| D2 | `generate_episode_pdf()` copied | 7 py files | ~126 | High |
| D3 | Dead per-form MPIS wrappers | main.js | ~10 | Low |
| D4 | `form.js` dead file | 1 js file | ~300 | Low |
| D5 | `pdf_generator.py` dead file | 1 py file | ~300 | Low |
| D6 | `gv()`/`sv()` sourcing inconsistency | form_hand.js | ~8 | Low |
| D7 | Orphaned comment | pdf_amputation.py:341 | 1 | Trivial |
