# Plan: PDF Consolidation (U1 + U2)
**Source:** PATHFINDER-2026-05-18/02-duplication-report.md (D1, D2), 03-unified-proposal.md (U1, U2)
**Scope:** Move `_ensure_dict` and `generate_episode_pdf` boilerplate into `pdf_platypus_base.py`. 7 PDF generators become one-liners.
**Net change:** ~30 lines added to pdf_platypus_base.py, ~120+ lines deleted across 7 files.

---

## Phase 0: Discovery (COMPLETE)

All facts verified from source.

**pdf_platypus_base.py confirmed imports (lines 1–13):**
```python
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether, PageBreak
)
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.pdfgen import canvas as rl_canvas
import io
from reportlab.platypus import Flowable
```
`KeepTogether` and `PageBreak` are already imported. `Paragraph` is already imported. `soap_page` is at line 482, `build_pdf` at line 563, `page_header` at line 322.

**generate_episode_pdf locations:**

| File | Line | _build_story line | Local _ensure_dict |
|------|------|-------------------|--------------------|
| pdf_ms.py | 154 | 21 | No |
| pdf_spine.py | 201 | 32 | No |
| pdf_geriatric.py | 316 | 28 | Yes (line 21, module-level) |
| pdf_cr.py | 571 | 427 | No |
| pdf_amputation.py | 346 | 21 | Yes (line 24, nested in _build_story) |
| pdf_neuro.py | 445 | 25 | Yes (line 28, nested in _build_story) |
| pdf_hand.py | 310 | 121 | Yes (line 44, module-level) |

**KeepTogether import status per file:**
- pdf_ms.py, pdf_spine.py, pdf_geriatric.py, pdf_cr.py, pdf_amputation.py, pdf_hand.py: imported ✓
- pdf_neuro.py: NOT imported — uses `__import__` hack in generate_episode_pdf body (goes away after U2)

**Current `from pdf_platypus_base import ...` lines (need adding `ensure_dict, generate_episode_pdf_base`):**

| File | Line | Current import |
|------|------|----------------|
| pdf_ms.py | 6–12 | `from pdf_platypus_base import (build_pdf, page_header, patient_bar, body_chart_section, box, two_col, plan_section, soap_page, sign_chop_block, data_table, gap, tick, S_LABEL, S_NORMAL, S_SMALL, CW, LW, RW, BLACK, LGREY)` |
| pdf_spine.py | 6–12 | `from pdf_platypus_base import (build_pdf, page_header, patient_bar, body_chart_section, box, two_col, plan_section, soap_page, sign_chop_block, data_table, gap, tick, cbtick, S_LABEL, S_NORMAL, S_SMALL, S_BOLD, CW, LW, RW, BLACK, LGREY)` |
| pdf_geriatric.py | 6–12 | `from pdf_platypus_base import (build_pdf, page_header, patient_bar, body_chart_section, box, two_col, plan_section, soap_page, data_table, gap, tick, cbtick, S_LABEL, S_NORMAL, S_SMALL, S_BOLD, CW, LW2, RW2, BLACK, LGREY)` |
| pdf_cr.py | 8–14 | `from pdf_platypus_base import (build_pdf, page_header, patient_bar, box, two_col, plan_section, soap_page, sign_chop_block, data_table, gap, tick, S_LABEL, S_NORMAL, S_SMALL, S_BOLD, CW, LW, RW, BLACK, LGREY, BLUE, MGREY)` |
| pdf_amputation.py | 6–12 | `from pdf_platypus_base import (build_pdf, page_header, patient_bar, body_chart_section, box, two_col, plan_section, soap_page, sign_chop_block, data_table, gap, tick, cbtick, S_LABEL, S_NORMAL, S_SMALL, S_BOLD, CW, LW2, RW2, BLACK, LGREY)` |
| pdf_neuro.py | 10–16 | `from pdf_platypus_base import (build_pdf, page_header, patient_bar, body_chart_section, two_col, soap_page, sign_chop_block, gap, S_LABEL, S_NORMAL, S_SMALL, S_BOLD, CW, LW, RW, BLACK, LGREY)` |
| pdf_hand.py | 12–17 | `from pdf_platypus_base import (build_pdf, soap_page, sign_chop_block, box, two_col, kv, gap, patient_bar, page_header, data_table, S_NORMAL, S_BOLD, S_SMALL, S_LABEL, CW, LW, RW, ML, MR, MT, MB, BLACK, LGREY)` |

---

## Phase 1: Add `ensure_dict` and `generate_episode_pdf_base` to pdf_platypus_base.py

**File:** `pdf_platypus_base.py`

**Step 1a — add `ensure_dict` before `def gap` (currently line 144).**

Insert this block immediately before the line `def gap(h=2):`:

```python
def ensure_dict(val):
    """Coerce a SQLite JSON string, None, or any non-dict to a plain dict."""
    if isinstance(val, str):
        try:
            import json
            return json.loads(val)
        except Exception:
            return {}
    return val if isinstance(val, dict) else {}

```

**Step 1b — add `generate_episode_pdf_base` after `def build_pdf` (currently line 563).**

`build_pdf` is the last function in the file. Append this block at the end of the file:

```python

def generate_episode_pdf_base(build_story_fn, title, ref, assessment_data, soap_notes, episode_info=None):
    """Shared episode PDF assembly: assessment pages + paginated SOAP notes (2 per page)."""
    story   = []
    patient = ensure_dict((assessment_data or {}).get('patient', {}))

    if assessment_data:
        story += build_story_fn(assessment_data)
    else:
        story += page_header(title, ref)
        story.append(Paragraph('No initial assessment recorded for this episode.', S_NORMAL))

    notes = soap_notes or []
    for i in range(0, len(notes), 2):
        story.append(PageBreak())
        pair  = []
        pair += soap_page(patient, notes[i], episode_info)
        if i + 1 < len(notes):
            pair += soap_page(patient, notes[i + 1], episode_info)
        story.append(KeepTogether(pair))

    return build_pdf(story)
```

**Verification checklist:**
- [ ] `python -c "from pdf_platypus_base import ensure_dict, generate_episode_pdf_base; print('ok')"` — prints `ok`
- [ ] `python -c "from pdf_platypus_base import ensure_dict; print(ensure_dict(None), ensure_dict('{}'), ensure_dict({'a':1}))"` — prints `{} {} {'a': 1}`

---

## Phase 2: Update Each pdf_*.py (7 files)

Do all 7 files. For each file the work is identical in structure:
1. Add `ensure_dict, generate_episode_pdf_base` to the `from pdf_platypus_base import (...)` line
2. Replace the `generate_episode_pdf` function body with a one-liner
3. Delete the local `_ensure_dict` definition (only in 4 of the 7 files)

### 2.1 — pdf_ms.py

**Add to import (line 6–12):** append `ensure_dict, generate_episode_pdf_base` inside the existing parentheses.

**Replace `generate_episode_pdf` (line 154–171):**
```python
def generate_episode_pdf(assessment_data, soap_notes, episode_info=None):
    return generate_episode_pdf_base(_build_story, TITLE, REF, assessment_data, soap_notes, episode_info)
```

No local `_ensure_dict` to delete.

**Bonus fix:** In `_build_story` (line 21), find where patient is extracted. Current pattern: bare `.get('patient', {})`. Wrap it: `ensure_dict(d.get('patient', {}))`. This closes the latent bug where SQLite returns a JSON string.

### 2.2 — pdf_spine.py

**Add to import (line 6–12):** append `ensure_dict, generate_episode_pdf_base`.

**Replace `generate_episode_pdf` (line 201–218):**
```python
def generate_episode_pdf(assessment_data, soap_notes, episode_info=None):
    return generate_episode_pdf_base(_build_story, TITLE, REF, assessment_data, soap_notes, episode_info)
```

No local `_ensure_dict` to delete.

**Bonus fix:** Wrap patient extraction in `_build_story` with `ensure_dict()`.

### 2.3 — pdf_geriatric.py

**Add to import (line 6–12):** append `ensure_dict, generate_episode_pdf_base`.

**Replace `generate_episode_pdf` (line 316–333):**
```python
def generate_episode_pdf(assessment_data, soap_notes, episode_info=None):
    return generate_episode_pdf_base(_build_story, TITLE, REF, assessment_data, soap_notes, episode_info)
```

**Delete local `_ensure_dict` (lines 21–26):**
```python
def _ensure_dict(val):
    if isinstance(val, str):
        import json
        try: return json.loads(val)
        except: return {}
    return val if isinstance(val, dict) else {}
```
Also update usages in `_build_story` from `_ensure_dict(...)` to `ensure_dict(...)`.

### 2.4 — pdf_cr.py

**Add to import (line 8–14):** append `ensure_dict, generate_episode_pdf_base`.

**Replace `generate_episode_pdf` (line 571–591):**
```python
def generate_episode_pdf(assessment_data, soap_notes, episode_info=None):
    return generate_episode_pdf_base(_build_story, TITLE, REF, assessment_data, soap_notes, episode_info)
```

No local `_ensure_dict` to delete.

**Bonus fix:** Wrap patient extraction in `_build_story` with `ensure_dict()`.

### 2.5 — pdf_amputation.py

**Add to import (line 6–12):** append `ensure_dict, generate_episode_pdf_base`.

**Replace `generate_episode_pdf` (line 346–366):**
```python
def generate_episode_pdf(assessment_data, soap_notes, episode_info=None):
    return generate_episode_pdf_base(_build_story, TITLE, REF, assessment_data, soap_notes, episode_info)
```

**Delete nested `_ensure_dict` inside `_build_story` (lines 24–30):**
```python
    def _ensure_dict(val):
        if isinstance(val, str):
            try:
                return _json.loads(val)
            except Exception:
                return {}
        return val if isinstance(val, dict) else {}
```
Also delete the `import json as _json` at the top of `_build_story` (line 22) if it's only used for `_ensure_dict`. Update usages: `_ensure_dict(...)` → `ensure_dict(...)`.

Also delete the spurious `import json` inside the old `generate_episode_pdf` at line 347 (goes away with the function replacement).

### 2.6 — pdf_neuro.py

**Add to import (line 10–16):** append `ensure_dict, generate_episode_pdf_base`.

**Replace `generate_episode_pdf` (line 445–463):**
```python
def generate_episode_pdf(assessment_data, soap_notes, episode_info=None):
    return generate_episode_pdf_base(_build_story, TITLE, REF, assessment_data, soap_notes, episode_info)
```

This eliminates the `__import__('reportlab.platypus', fromlist=['KeepTogether']).KeepTogether(pair)` hack at line 461. The base function uses `KeepTogether` from pdf_platypus_base's own imports.

**Delete nested `_ensure_dict` inside `_build_story` (lines 28–34):**
```python
    def _ensure_dict(val):
        if isinstance(val, str):
            try:
                return _json.loads(val)
            except Exception:
                return {}
        return val if isinstance(val, dict) else {}
```
Also delete `import json as _json` at line 26 if only used for `_ensure_dict`. Update usages: `_ensure_dict(...)` → `ensure_dict(...)`.

### 2.7 — pdf_hand.py

**Add to import (line 12–17):** append `ensure_dict, generate_episode_pdf_base`.

**Replace `generate_episode_pdf` (line 310–332):**
```python
def generate_episode_pdf(assessment_data, soap_notes, episode_info=None):
    return generate_episode_pdf_base(_build_story, TITLE, REF, assessment_data, soap_notes, episode_info)
```

Note: the old version had `patient = _ensure_dict((assessment_data or {}).get('patient', {}))` — this is now handled inside `generate_episode_pdf_base` using the shared `ensure_dict`. No loss of behaviour.

**Delete module-level `_ensure_dict` (lines 44–50):**
```python
def _ensure_dict(val):
    if isinstance(val, str):
        try:
            return json.loads(val)
        except Exception:
            return {}
    return val or {}
```
Update all usages inside `_build_story` from `_ensure_dict(...)` to `ensure_dict(...)`.

---

## Phase 3: Final Verification

**Import smoke checks:**
```python
python -c "import pdf_ms; import pdf_spine; import pdf_geriatric; import pdf_cr; import pdf_amputation; import pdf_neuro; import pdf_hand; print('all imports ok')"
```

**Grep checks — confirm deletions:**
```
grep -n "_ensure_dict" pdf_ms.py pdf_spine.py pdf_geriatric.py pdf_cr.py pdf_amputation.py pdf_neuro.py pdf_hand.py
# → zero results

grep -n "generate_episode_pdf_base\|ensure_dict" pdf_platypus_base.py
# → should show the two new function definitions

grep -n "__import__" pdf_neuro.py
# → zero results (hack gone)
```

**Functional test:**
Start `python app.py`, open a HAND or NEURO episode, click Export KKM PDF. Verify PDF downloads correctly with patient header populated. Repeat for MS to confirm the base function works across form types.

---

## Anti-Pattern Guards (for all phases)

- Do NOT modify `_build_story()` in any file — form-specific layout code, must stay per-file
- Do NOT change TITLE or REF — they are module-level constants in each pdf_*.py and are passed as arguments
- After any edit to a pdf_*.py: `python -c "import pdf_<form>"` before moving to the next file
- After editing pdf_platypus_base.py: ALL 7 files must be re-tested (it's a shared module)
- Do NOT remove `import json` from pdf_hand.py's top-level imports if it's used elsewhere in the file (check first with grep)
- `generate_episode_pdf_base` receives `build_story_fn` as a callable — always pass `_build_story` (the function object), not `_build_story()` (a call)
