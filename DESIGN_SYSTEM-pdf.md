# DESIGN_SYSTEM-pdf.md — PDF Output Patterns (ReportLab/Platypus)

Read this before writing or editing any `pdf_<form>.py` generator. Companion to **DESIGN_SYSTEM.md** (form-HTML/UI patterns) — UI layout lives there, PDF layout lives here.

The PDF engine is ReportLab (Platypus). All building blocks live in `pdf_platypus_base.py`. Per-form generators follow `pdf_<form>.py`. Do not duplicate shared primitives per form.

---

## PDF Primitives

**`two_col()` vs full-width:**
- Use `two_col()` when two related blocks are short enough to sit side-by-side (e.g. Diagnosis / Hand Chart, History / Special Questions).
- Use full-width sequential blocks when content is long, tabular, or would produce cramped columns. Forcing tabular data into a `two_col()` box creates unreadable cells.
- Rule of thumb: 2 short related `box()` blocks → `two_col()`. Long sequential tables or 3+ blocks → stack full-width.

**Patient bar and page header order (always):**
```python
story += page_header(TITLE, REF)      # KKM title block, full width
story.append(patient_bar(patient, REF))  # 4-col bar, full width
story.append(gap(2))
```
Never swap or nest either inside `two_col()`.

**Sign block:**
- Always use `story += sign_chop_block()` as the final element. `sign_chop_block()` returns a list — use `+=`, NOT `append()`.
- Never inline custom sign/chop code.

## PDF Component Recipes

**`data_table()` with empty-data guard:**
```python
def _has_data(rows):
    return any(any(str(cell).strip() for cell in row[1:]) for row in rows)

rows = [['Label', left_val, right_val], ...]
if _has_data(rows):
    story.append(Paragraph('Section Name', S_BOLD))
    story.append(gap(1))
    story.append(data_table(['Test', 'Left', 'Right'], rows, [CW*0.5, CW*0.25, CW*0.25]))
    story.append(gap(2))
```
Guard before every table render. `data_table()` fills empty cells with "—" — an all-empty table looks like valid data.

**Standard column conventions for Left/Right clinical data:**
- Generic L/R test results: `['Test', 'Left', 'Right']` — widths `[CW*0.5, CW*0.25, CW*0.25]`
- Strength/grip (kg): `['Test', 'Left', 'Right']` — widths `[CW*0.4, CW*0.3, CW*0.3]`
- Reflexes: `['Root', 'Reflex', 'Left', 'Right']` — widths `[CW*0.15, CW*0.35, CW*0.25, CW*0.25]`
- MMT: `['Muscle', 'Left', 'Right']` — widths `[CW*0.5, CW*0.25, CW*0.25]`
- Circumference: `['Location', 'Left (cm)', 'Right (cm)']` — widths `[CW*0.5, CW*0.25, CW*0.25]`

**Section label before each table (consistent rhythm):**
```python
story.append(Paragraph('Section Name', S_BOLD))
story.append(gap(1))
story.append(data_table(...))
story.append(gap(2))
```

## PDF Anti-patterns

- ❌ **Mixed layout rhythm in one form.** Alternating `two_col()` boxes and full-width tables within a single visual region creates inconsistent vertical rhythm. HAND PDF Block 4 demonstrates this — usable but noticeable. When converting a kv-soup block to tables, commit to full-width for the entire block.
- ❌ **Tables with all-empty rows.** Without a `_has_data()` guard, a patient with no strength data gets a Strength table of "—" in every cell. Skip the table entirely.
- ❌ **Collecting form data without a PDF render block.** Silent data loss. `neuro.muscles` (MMT) was collected by `form_hand.js` for the entire HAND form history and never rendered by `pdf_hand.py`. Undetectable without explicit cross-referencing.
- ❌ **`story.append()` on a list-returning helper.** `sign_chop_block()` returns a list — use `story +=`. `two_col()` and `box()` return a single Table — use `story.append()`. Mixing these causes NestedFlowable errors.

## Raster Image Embed (PNG/JPEG in PDF body)

Use `reportlab.platypus.Image` (aliased `RLImage`) to embed raster assets. Pattern introduced for NCD body-shape picker (`pdf_ncd.py`):

```python
from reportlab.platypus import Image as RLImage
from reportlab.lib.units import mm

def _asset_flowable(name, asset_map, subdir, width=28*mm, height=40*mm):
    fn = asset_map.get((name or '').strip())
    if not fn:
        return None
    base = getattr(sys, '_MEIPASS', os.path.dirname(os.path.abspath(__file__)))
    path = os.path.join(base, 'static', 'img', subdir, fn)
    if not os.path.exists(path):
        return None
    return RLImage(path, width=width, height=height, kind='proportional')
```

Rules:
- Always `os.path.exists()` before constructing `RLImage` — returns `None` silently if missing.
- Resolve path via `getattr(sys, '_MEIPASS', ...)` so the built .exe finds assets in the bundle.
- Add `('static/img/<subdir>', 'static/img/<subdir>')` to `pt_assessment.spec` datas — omitting this causes silent missing figure in the .exe build even when dev-mode works.
- `kind='proportional'` preserves aspect ratio within the declared bounding box.
- Rasterize a test page to PNG and LOOK at the output — a missing/wrong asset path produces a silent blank spot with a clean exit code.

## PDF Pre-ship Checklist

- [ ] Module imports cleanly: `py -c "from pdf_X import generate_X_pdf; print('ok')"`
- [ ] Realistic-data PDF renders without ReportLab errors (no "too large", no FrameError)
- [ ] Sparse-data PDF (patient + diagnosis only) — all empty tables skipped, no "—" rows rendered
- [ ] Every field in `form_X.js collect()` has a matching render block in `pdf_X.py` — cross-check manually
- [ ] `sign_chop_block()` used as footer, not inlined
- [ ] KKM form ref string matches borang exactly (check WORKFLOW.md Clinical Reference)
