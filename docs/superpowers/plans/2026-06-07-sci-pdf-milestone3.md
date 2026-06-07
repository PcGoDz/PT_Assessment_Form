# SCI PDF Milestone-3 (pdf_sci.py) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create `pdf_sci.py` so the SCI form exports to PDF on both the episode and single-record routes, matching the house style of the other 8 ready forms.

**Architecture:** Single new file `pdf_sci.py`, structured exactly like `pdf_neuro.py` (the house-style reference): a `_build_story(d)` that returns a flat Platypus `story` list, plus two public entry points the registry calls. Text sections use a local `rs()` ruled-section helper copied from `pdf_neuro.py`; the five-plus AssessmentGrid tables use a new local `grid_table()` helper that renders the four+ cell states (real value / blank / NT / N/A / greyed) distinctly. Wiring is via the `FORM_REGISTRY` row + `pt_assessment.spec` datas — the two PDF dicts derive automatically.

**Tech Stack:** Python, ReportLab/Platypus only (no `pdf_platypus_base.py` / `pdf_base.py` refactor), Flask registry wiring, PyInstaller spec.

**Project axiom note (overrides writing-plans default):** This project has NO test suite and forbids TDD on the UI layer. Verification here is backend smoke checks (import clean → generate PDF → open/rasterize → eyeball), per the spec's own VERIFICATION section and `CLAUDE.md`. There is no `pytest`. Do not introduce one.

**DECISION-COMPLETE spec:** `SPEC-SCI-pdf-milestone3.md` at project root. All architectural calls are made. If the route signatures, AssessmentGrid data shape, or registry layout differ from what this plan assumes, **STOP and flag** — do not silently change a decision.

---

## Ground truth verified while writing this plan (do not re-derive — already confirmed against source)

- **Route signatures** (`app.py`):
  - Single: `_gen = _SINGLE_PDF_GENERATORS.get(...)`, called `pdf_bytes = _gen(data)` — **one arg**, the record data dict (`app.py:395-396`).
  - Episode: `generate_episode_pdf = _PDF_GENERATORS.get(...)`, called `generate_episode_pdf(assessment, soaps, ep)` — **three args** (`app.py:355, 369`).
  - Both match `pdf_neuro.generate_neuro_pdf(data)` and `pdf_neuro.generate_episode_pdf(assessment_data, soap_notes, episode_info=None)` exactly.
- **AssessmentGrid `getData()` shape** (`static/js/assessment_grid.js:90-99`): returns a **list of row dicts**. Each dict is `{ label: <rowLabel>, <colId>: <value>, ... }`. Greyed cells: the `colId` key is **absent** from the dict. Blank: value is `''`. NT/N-A: literal strings `'NT'` / `'N/A'`. Real: the string value.
- **SCI grid columns** (`static/js/form_sci.js:24-90`) — Python must mirror these `id → label` lists (the JS column configs are not visible to the PDF):
  - `sensory`: `pp_l`→"Pin Prick L", `pp_r`→"Pin Prick R", `lt_l`→"Light Touch L", `lt_r`→"Light Touch R"
  - `proprioception`: `r`→"R", `l`→"L"
  - `mmt`: `mmt_l`→"MMT L", `mmt_r`→"MMT R", `prom_l`→"PROM L", `prom_r`→"PROM R", `mas_l`→"MAS L", `mas_r`→"MAS R"
  - `upright_control`: `flex_l`→"Flex L", `flex_r`→"Flex R", `ext_l`→"Ext L", `ext_r`→"Ext R"
  - all 5 `functional` grids: single col `val`→"Grade"
- **collect() data contract** (`static/js/form_sci.js:141-195`) — section order for the PDF (spec STRUCTURE): patient → diagnosis & mgmt → problem → pain → history → special questions → home environment → respiratory → skin integrity → sensory grid → proprioception grid → mmt grid → upright grid → functional (5 grids + notes) → outcome measures → assistive aids → narrative tail (impression/stg/ltg/plan) → sign/chop.
- **Registry SCI row** (`app.py:59`): `{ 'id': 'SCI', 'label': 'Spinal Cord Injury', 'icon': '&#9855;', 'badge': 'SC', 'group': 'Neurological', 'ready': True }` — has NO pdf keys yet.
- **`pdf_platypus_base` exports** used here (all confirmed imported by `pdf_neuro.py:11-18`): `build_pdf, page_header, patient_bar, two_col, sign_chop_block, gap, S_LABEL, S_NORMAL, S_SMALL, S_BOLD, CW, LW, RW, BLACK, LGREY, ensure_dict, generate_episode_pdf_base`.

---

## Vet results (Opus + Miruya, 2026-06-07) — confirmed before execution

The plan was reviewed against live source by Opus and Miruya. Findings, baked in so tomorrow's cold-start trusts this file, not chat history:

- **`pdf_platypus_base` imports:** all 17 names exist; signatures match the `pdf_neuro` call sites. The Task 1 skeleton imports + generates clean.
- **`GRID_COLUMNS` labels:** every `id → label` verified EXACTLY against `form_sci.js` (`SENSORY_COLS` / `MMT_COLS` / `UPRIGHT_COLS` / `PROP_COLS` / `FUNC_COL`). No change needed.
- **Route signatures:** correct — single is 1-arg `_gen(data)`, episode is 3-arg `(assessment, soaps, ep)`.
- **Four-state `grid_table` logic:** correct against the real `getData()` shape — key-absence → greyed (grey background), `''` → em-dash, `'NT'` / `'N/A'` rendered as literals, anything else plain.
- **MMT is the ONLY grid with greyout** (`form_sci.js:97`). The renderer greys by key-absence regardless, so **no Python greyout map is needed**. The greyout in the Task 3 smoke data is ILLUSTRATIVE — it is NOT a transcription of the real `MMT_GREYOUT` map and does not need to match it.
- **Two functional column configs** (`FUNC_COL` / `FUNC_COL_B`) differ only in their dropdown *options*; the PDF renders the stored value, so the single `'functional': [('val', 'Grade')]` mapping is correct for all 5 functional grids.
- **Layout = flat full-width (not two-column):** accepted as-is. Miruya judges the look on the rendered PDF tomorrow and adjusts then if needed. Do **NOT** pre-switch to two-column during execution.

---

## File Structure

- **Create:** `pdf_sci.py` — the entire SCI PDF generator. One responsibility: turn an SCI record dict into PDF bytes. Self-contained; imports only from `reportlab` + `pdf_platypus_base`.
- **Modify:** `app.py` — add `import pdf_sci` (after `import pdf_burn`, line 23) and the two pdf keys on the SCI `FORM_REGISTRY` row (line 59). The `_PDF_GENERATORS` / `_SINGLE_PDF_GENERATORS` dict-comps (lines 71-72) derive automatically — **do NOT touch them**.
- **Modify:** `pt_assessment.spec` — add `('pdf_sci.py', '.'),` to the `datas` list (after the `pdf_burn.py` line, line 21).
- **Temp (do NOT commit):** `_smoke_sci.py` — throwaway smoke harness. Delete before the final commit.

---

## Task 1: Create `pdf_sci.py` skeleton — imports, constants, column map, `_build_story` stub

**Files:**
- Create: `pdf_sci.py`

- [ ] **Step 1: Write the skeleton file**

This establishes a clean importable module that produces a one-section PDF (patient header only). The helpers and full story come in later tasks.

```python
# pdf_sci.py — KKM Spinal Cord Injury Assessment Form PDF
# KKM Ref: fisio / b.pen. 4 / Pind. 2 / 2019 — house style matches pdf_neuro.py.
# Grid-heavy form: sensory / proprioception / MMT / upright / 5 functional grids
# render as Tables via grid_table() with four+ distinct cell states.
# NO body chart (sensory is captured as a TABLE, not marker coords — by design).

from reportlab.platypus import Paragraph, Table, TableStyle
from reportlab.lib.units import mm
from reportlab.lib import colors
from pdf_platypus_base import (
    build_pdf, page_header, patient_bar,
    sign_chop_block, gap,
    S_LABEL, S_NORMAL, S_SMALL, S_BOLD,
    CW, LW, RW, BLACK, LGREY,
    ensure_dict, generate_episode_pdf_base,
)

REF   = 'fisio / b.pen. 4 / Pind. 2 / 2019'
TITLE = ['KEMENTERIAN KESIHATAN MALAYSIA',
         'PHYSIOTHERAPY DEPARTMENT',
         'SPINAL CORD INJURY ASSESSMENT FORM']

# ── Grid column maps — mirror static/js/form_sci.js column configs ──
# Each entry: list of (col_id, header_label) in display order.
GRID_COLUMNS = {
    'sensory': [
        ('pp_l', 'Pin Prick L'), ('pp_r', 'Pin Prick R'),
        ('lt_l', 'Light Touch L'), ('lt_r', 'Light Touch R'),
    ],
    'proprioception': [
        ('r', 'R'), ('l', 'L'),
    ],
    'mmt': [
        ('mmt_l', 'MMT L'), ('mmt_r', 'MMT R'),
        ('prom_l', 'PROM L'), ('prom_r', 'PROM R'),
        ('mas_l', 'MAS L'), ('mas_r', 'MAS R'),
    ],
    'upright_control': [
        ('flex_l', 'Flex L'), ('flex_r', 'Flex R'),
        ('ext_l', 'Ext L'), ('ext_r', 'Ext R'),
    ],
    'functional': [
        ('val', 'Grade'),
    ],
}


def _build_story(d):
    story   = []
    patient = ensure_dict(d.get('patient'))
    story += page_header(TITLE, REF)
    story.append(patient_bar(patient, REF))
    story.append(gap(2))
    return story


def generate_sci_pdf(data):
    return build_pdf(_build_story(data))


def generate_episode_pdf(assessment_data, soap_notes, episode_info=None):
    return generate_episode_pdf_base(_build_story, TITLE, REF, assessment_data, soap_notes, episode_info)
```

- [ ] **Step 2: Verify it imports clean**

Run (from project root, Windows-side):
```
py -c "import pdf_sci; print('ok', pdf_sci.REF)"
```
Expected: `ok fisio / b.pen. 4 / Pind. 2 / 2019` — no traceback. If `ImportError` on any name from `pdf_platypus_base`, STOP and flag (the import list was confirmed against `pdf_neuro.py:11-18` — a mismatch means the base module changed).

- [ ] **Step 3: Verify it generates a (minimal) PDF**

Run:
```
py -c "import pdf_sci; b = pdf_sci.generate_sci_pdf({'patient': {'name':'Test','age':'40','sex':'M'}}); open('sci_smoke.pdf','wb').write(b); print('bytes', len(b))"
```
Expected: `bytes <some number > 1000>`, `sci_smoke.pdf` written. No exception.

- [ ] **Step 4: Commit**

```
git add pdf_sci.py
git commit -m "feat(sci): pdf_sci.py skeleton (header + entry points)"
```

---

## Task 2: Add the four-state `grid_table()` helper + the `rs()` / `_ls()` text helpers

This is the **load-bearing** task. The four cell states (plus greyed) must render distinctly. Verify in isolation before building the full story.

**Files:**
- Modify: `pdf_sci.py`

- [ ] **Step 1: Insert the helpers above `_build_story`**

Add these three functions to `pdf_sci.py`, immediately after the `GRID_COLUMNS` dict and before `def _build_story(d):`.

`rs()` and `_ls()` are copied verbatim-in-spirit from `pdf_neuro.py` (lines 27-71) — the house ruled-section + list-join helpers. `grid_table()` is new.

```python
def _ls(val, sep=', '):
    if isinstance(val, list):
        return sep.join([str(v) for v in val if v])
    return str(val) if val else ''


def rs(rows, width):
    """Ruled label/value section — house style (mirrors pdf_neuro.rs)."""
    col_w = [width * 0.40, width * 0.60]
    table_rows = []
    span_rows  = []
    for i, (label, val) in enumerate(rows):
        if label is None or label == '':
            vp = val if not isinstance(val, str) else Paragraph(val, S_NORMAL)
            table_rows.append([vp, ''])
            span_rows.append(i)
        else:
            lp = Paragraph(f'<b>{label}</b>', S_NORMAL)
            vp = val if not isinstance(val, str) else Paragraph(str(val), S_NORMAL)
            table_rows.append([lp, vp])

    style = [
        ('BOX',           (0, 0), (-1, -1), 0.5, BLACK),
        ('LINEBELOW',     (0, 0), (-1, -2), 0.3, LGREY),
        ('TOPPADDING',    (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING',   (0, 0), (-1, -1), 4),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 4),
        ('VALIGN',        (0, 0), (-1, -1), 'TOP'),
        ('FONTSIZE',      (0, 0), (-1, -1), 7),
    ]
    for i in span_rows:
        style.append(('SPAN', (0, i), (1, i)))

    t = Table(table_rows, colWidths=col_w)
    t.setStyle(TableStyle(style))
    return t


def grid_table(grid_rows, columns, width):
    """Render an AssessmentGrid getData() array as a four-state Table.

    grid_rows: list of row dicts {label, colId: value, ...}. Greyed cell = colId ABSENT.
    columns:   list of (col_id, header_label) in display order.
    Cell states:
      key absent  -> greyed: light-grey BACKGROUND, empty text
      value ''    -> em-dash placeholder
      value 'NT'  -> 'NT'
      value 'N/A' -> 'N/A'
      other       -> the value, plain
    """
    n = len(columns)
    label_w = width * 0.28
    cell_w  = (width - label_w) / n if n else width
    col_w   = [label_w] + [cell_w] * n

    header = [Paragraph('', S_SMALL)] + [Paragraph(f'<b>{lab}</b>', S_SMALL) for _, lab in columns]
    table_rows  = [header]
    grey_coords = []   # (col_index, row_index) 1-based for data cells

    for ri, row in enumerate(grid_rows or [], start=1):
        cells = [Paragraph(f"<b>{str(row.get('label', ''))}</b>", S_SMALL)]
        for ci, (cid, _lab) in enumerate(columns, start=1):
            if cid not in row:                      # greyed — key absent
                cells.append(Paragraph('', S_SMALL))
                grey_coords.append((ci, ri))
            else:
                v = row.get(cid, '')
                txt = '—' if v == '' else str(v)   # em-dash for blank
                cells.append(Paragraph(txt, S_SMALL))
        table_rows.append(cells)

    style = [
        ('BOX',           (0, 0), (-1, -1), 0.5, BLACK),
        ('INNERGRID',     (0, 0), (-1, -1), 0.25, LGREY),
        ('FONTSIZE',      (0, 0), (-1, -1), 6.5),
        ('TOPPADDING',    (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ('LEFTPADDING',   (0, 0), (-1, -1), 3),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 3),
        ('VALIGN',        (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN',         (1, 0), (-1, -1), 'CENTER'),
        ('BACKGROUND',    (0, 0), (-1,  0), colors.HexColor('#f0f0f0')),  # header row
    ]
    for (ci, ri) in grey_coords:
        style.append(('BACKGROUND', (ci, ri), (ci, ri), colors.HexColor('#cccccc')))

    t = Table(table_rows, colWidths=col_w, repeatRows=1)   # header repeats on page split
    t.setStyle(TableStyle(style))
    return t
```

- [ ] **Step 2: Smoke-test `grid_table` on one grid covering all four+ states**

Create temp file `_smoke_sci.py` (will be reused + extended in Task 7, deleted before final commit):

```python
# _smoke_sci.py — throwaway smoke harness for pdf_sci. NOT committed.
import pdf_sci

# MMT grid: one row demonstrates ALL states in a single table.
#   NECK Flex -> mmt_l '3' (real), mmt_r '' (blank->em-dash),
#                prom_l 'NT', prom_r 'N/A', mas_l/mas_r ABSENT (greyed)
#   SHOULDER Flex -> all six columns present (no greyout)
mmt = [
    {'label': 'NECK Flex',     'mmt_l': '3', 'mmt_r': '', 'prom_l': 'NT', 'prom_r': 'N/A'},
    {'label': 'SHOULDER Flex', 'mmt_l': '4', 'mmt_r': '4', 'prom_l': 'full', 'prom_r': 'full',
     'mas_l': '1', 'mas_r': '0'},
]

story = []
from pdf_platypus_base import page_header, patient_bar, gap
story += page_header(pdf_sci.TITLE, pdf_sci.REF)
story.append(patient_bar({'name': 'Smoke Test', 'age': '40', 'sex': 'M'}, pdf_sci.REF))
story.append(gap(2))
story.append(pdf_sci.grid_table(mmt, pdf_sci.GRID_COLUMNS['mmt'], pdf_sci.CW))

from pdf_platypus_base import build_pdf
open('sci_smoke.pdf', 'wb').write(build_pdf(story))
print('wrote sci_smoke.pdf')
```

Run:
```
py _smoke_sci.py
```
Expected: `wrote sci_smoke.pdf`, no exception.

- [ ] **Step 3: Visually confirm the four+ states**

Open `sci_smoke.pdf` (default viewer):
```
start sci_smoke.pdf
```
Confirm in the MMT table, ALL of these are visible and distinct:
- a plain real value (`3`, `4`)
- an em-dash (`—`) where the value was blank (NECK Flex / MMT R)
- `NT` (NECK Flex / PROM L)
- `N/A` (NECK Flex / PROM R)
- two **grey-shaded empty cells** (NECK Flex / MAS L + MAS R — the greyed columns)

If any state is indistinguishable (e.g. greyed cell not shaded, or blank shows nothing instead of `—`), STOP — the four-state mapping is the spec's load-bearing requirement; fix before proceeding.

- [ ] **Step 4: Commit (helpers only; smoke file stays uncommitted)**

```
git add pdf_sci.py
git commit -m "feat(sci): four-state grid_table + rs/_ls helpers"
```

---

## Task 3: Build the full `_build_story` in spec section order

**Files:**
- Modify: `pdf_sci.py` (`_build_story`)

- [ ] **Step 1: Replace the `_build_story` stub body with the full story**

Replace the entire `_build_story` function from Task 1 with this. Section order follows the spec STRUCTURE exactly. Text blocks use `rs()`; grids use `grid_table()` under a `S_BOLD` title; functional renders 5 grids each followed by its notes line (only when the note is non-empty); ends with the narrative tail and `sign_chop_block()`.

```python
def _build_story(d):
    story   = []
    patient = ensure_dict(d.get('patient'))

    story += page_header(TITLE, REF)
    story.append(patient_bar(patient, REF))
    story.append(gap(2))

    # 1 — Diagnosis & Management
    story.append(rs([
        ('', Paragraph('<b>DIAGNOSIS &amp; MANAGEMENT</b>', S_LABEL)),
        ('Diagnosis',            d.get('diagnosis', '')),
        ("Doctor's Management",  d.get('dr_management', '')),
    ], CW))
    story.append(gap(2))

    # 2 — Problem
    story.append(rs([
        ('', Paragraph('<b>PROBLEM</b>', S_LABEL)),
        (None, Paragraph(d.get('problem', ''), S_NORMAL)),
    ], CW))
    story.append(gap(2))

    # 3 — Pain Score (VAS)
    pain = d.get('pain') or {}
    story.append(rs([
        ('', Paragraph('<b>PAIN SCORE (VAS)</b>', S_LABEL)),
        ('Pre',  str(pain.get('pre', '')) + '/10'),
        ('Post', str(pain.get('post', '')) + '/10'),
    ], CW))
    story.append(gap(2))

    # 4 — History
    story.append(rs([
        ('', Paragraph('<b>HISTORY</b>', S_LABEL)),
        ('Current History', d.get('current_history', '')),
        ('Past History',    d.get('past_history', '')),
    ], CW))
    story.append(gap(2))

    # 5 — Special Questions
    sq = d.get('special_questions') or {}
    story.append(rs([
        ('', Paragraph('<b>SPECIAL QUESTIONS</b>', S_LABEL)),
        ('Date of Surgery', sq.get('date_surgery', '')),
        ('Occupation',      sq.get('occupation', '')),
        ('Investigation',   sq.get('investigation', '')),
    ], CW))
    story.append(gap(2))

    # 6 — Home Environment
    story.append(rs([
        ('', Paragraph('<b>HOME ENVIRONMENT</b>', S_LABEL)),
        (None, Paragraph(d.get('home_environment', ''), S_NORMAL)),
    ], CW))
    story.append(gap(2))

    # 7 — Respiratory
    resp = d.get('respiratory') or {}
    story.append(rs([
        ('', Paragraph('<b>RESPIRATORY</b>', S_LABEL)),
        ('Breathing Pattern', _ls(resp.get('breathing_pattern'))),
        ('Cough',             resp.get('cough', '')),
        ('Vital Capacity',    resp.get('vc', '')),
        ('PEFR',              resp.get('pefr', '')),
    ], CW))
    story.append(gap(2))

    # 8 — Skin Integrity
    story.append(rs([
        ('', Paragraph('<b>SKIN INTEGRITY</b>', S_LABEL)),
        (None, Paragraph(d.get('skin_integrity', ''), S_NORMAL)),
    ], CW))
    story.append(gap(2))

    # 9 — Sensory (dermatomes) grid
    story += [Paragraph('<b>SENSORY (DERMATOMES)</b>', S_BOLD), gap(1),
              grid_table(d.get('sensory', []), GRID_COLUMNS['sensory'], CW), gap(2)]

    # 10 — Proprioception grid
    story += [Paragraph('<b>PROPRIOCEPTION</b>', S_BOLD), gap(1),
              grid_table(d.get('proprioception', []), GRID_COLUMNS['proprioception'], CW), gap(2)]

    # 11 — MMT grid
    story += [Paragraph('<b>MUSCLE STRENGTH (MMT) / PROM / MAS</b>', S_BOLD), gap(1),
              grid_table(d.get('mmt', []), GRID_COLUMNS['mmt'], CW), gap(2)]

    # 12 — Upright Control grid
    story += [Paragraph('<b>UPRIGHT CONTROL</b>', S_BOLD), gap(1),
              grid_table(d.get('upright_control', []), GRID_COLUMNS['upright_control'], CW), gap(2)]

    # 13 — Functional (5 grids, each followed by its notes line if present)
    func  = d.get('functional') or {}
    notes = func.get('notes') or {}
    for key, title in [
        ('body_handling', 'BODY HANDLING'),
        ('balance',       'BALANCE'),
        ('transfer',      'TRANSFER'),
        ('wheelchair',    'WHEELCHAIR SKILLS'),
        ('walking',       'WALKING'),
    ]:
        story += [Paragraph(f'<b>FUNCTIONAL — {title}</b>', S_BOLD), gap(1),
                  grid_table(func.get(key, []), GRID_COLUMNS['functional'], CW)]
        note = notes.get(key, '')
        if note:
            story.append(rs([('Notes', note)], CW))
        story.append(gap(2))

    # 14 — Outcome Measures
    om = d.get('outcome_measures') or {}
    story.append(rs([
        ('', Paragraph('<b>OUTCOME MEASURES</b>', S_LABEL)),
        ('10MWT', om.get('tenmwt', '')),
        ('SCIM',  om.get('scim', '')),
        ('WISCI', om.get('wisci', '')),
    ], CW))
    story.append(gap(2))

    # 15 — Assistive Aids
    aa = d.get('assistive_aids') or {}
    story.append(rs([
        ('', Paragraph('<b>ASSISTIVE AIDS</b>', S_LABEL)),
        ('Wheelchair', _ls(aa.get('wheelchair'))),
        ('Cushion',    _ls(aa.get('cushion'))),
        ('Orthosis',   aa.get('orthosis', '')),
    ], CW))
    story.append(gap(2))

    # 16 — Narrative tail: PT Impression / STG / LTG / Plan
    story.append(rs([
        ('', Paragraph('<b>PT IMPRESSION</b>', S_LABEL)),
        (None, Paragraph(d.get('pt_impression', ''), S_NORMAL)),
        ('', Paragraph('<b>SHORT TERM GOALS</b>', S_LABEL)),
        (None, Paragraph(d.get('stg', ''), S_NORMAL)),
        ('', Paragraph('<b>LONG TERM GOALS</b>', S_LABEL)),
        (None, Paragraph(d.get('ltg', ''), S_NORMAL)),
        ('', Paragraph('<b>PLAN OF TREATMENT</b>', S_LABEL)),
        (None, Paragraph(d.get('plan', ''), S_NORMAL)),
    ], CW))

    # 17 — Sign & chop footer
    story += sign_chop_block()

    return story
```

- [ ] **Step 2: Grep the function to confirm no orphaned code below the return**

Per WORKFLOW Code Editing Discipline (after any large replace): confirm there is exactly one `return story` and nothing unreachable below it.

Run:
```
py -c "import ast,sys; src=open('pdf_sci.py').read(); ast.parse(src); print('parse ok')"
```
Expected: `parse ok`. Then visually scan `_build_story` end — the `return story` must be the last statement; `generate_sci_pdf` / `generate_episode_pdf` follow as separate top-level defs.

- [ ] **Step 3: Verify it still imports and generates with a full record**

Extend `_smoke_sci.py` to build a representative full SCI record (this is the Task 7 smoke data — write it now, reuse later). Replace `_smoke_sci.py` contents with:

```python
# _smoke_sci.py — throwaway smoke harness for pdf_sci. NOT committed.
import pdf_sci

DATA = {
    '_form_type': 'SCI', 'meta': {'form': 'SCI'},
    'patient': {'name': 'Ahmad bin Test', 'age': '34', 'sex': 'M',
                'nric': '900101-10-5555', 'date': '2026-06-07'},
    'diagnosis': 'T6 ASIA-A complete paraplegia',
    'dr_management': 'Conservative, spinal precautions',
    'problem': 'Loss of lower trunk and lower limb control; impaired sitting balance.',
    'special_questions': {'date_surgery': '2026-05-20', 'occupation': 'Teacher',
                          'investigation': 'MRI: T6 cord compression'},
    'current_history': 'RTA 3 weeks ago, transferred post-op.',
    'past_history': 'Nil significant.',
    # Sensory: real / blank / NT across columns
    'sensory': [
        {'label': 'C5', 'pp_l': 'N', 'pp_r': 'N', 'lt_l': 'N', 'lt_r': 'N'},
        {'label': 'T6', 'pp_l': 'I', 'pp_r': '', 'lt_l': 'NT', 'lt_r': 'A'},
        {'label': 'L1', 'pp_l': 'A', 'pp_r': 'A', 'lt_l': 'A', 'lt_r': 'A'},
    ],
    # MMT: greyed (mas absent on NECK Flex) + real + blank + NT
    'mmt': [
        {'label': 'NECK Flex',     'mmt_l': '5', 'mmt_r': '5', 'prom_l': 'NT', 'prom_r': ''},
        {'label': 'SHOULDER Flex', 'mmt_l': '4', 'mmt_r': '4', 'prom_l': 'full', 'prom_r': 'full',
         'mas_l': '1', 'mas_r': '0'},
        {'label': 'HIP Flex',      'mmt_l': '0', 'mmt_r': '0', 'prom_l': 'full', 'prom_r': 'full',
         'mas_l': '2', 'mas_r': '2'},
    ],
    'upright_control': [
        {'label': 'Hip',   'flex_l': 'P', 'flex_r': 'P', 'ext_l': 'N/A', 'ext_r': 'N/A'},
        {'label': 'Knee',  'flex_l': 'F', 'flex_r': 'F', 'ext_l': 'P', 'ext_r': 'P'},
        {'label': 'Ankle', 'flex_l': '', 'flex_r': '', 'ext_l': 'NT', 'ext_r': 'NT'},
    ],
    'proprioception': [
        {'label': 'Shoulder', 'r': 'N', 'l': 'N'},
        {'label': 'Big Toe',  'r': 'A', 'l': 'NT'},
    ],
    'functional': {
        'body_handling': [
            {'label': 'Roll side to side', 'val': 'A'},
            {'label': 'Come to sit',       'val': 'U'},
        ],
        'balance':   [{'label': 'Static', 'val': 'P'}, {'label': 'Dynamic', 'val': ''}],
        'transfer':  [{'label': 'Bed', 'val': 'A'}, {'label': 'Chair', 'val': 'NT'}],
        'wheelchair':[{'label': 'Level Propulsion', 'val': 'I'}],
        'walking':   [{'label': 'Sit to stand', 'val': 'U'}],
        'notes': {
            'body_handling': 'Requires assistance of one for come-to-sit.',
            'balance': '', 'transfer': 'Sliding board used for bed transfer.',
            'wheelchair': '', 'walking': '',
        },
    },
    'respiratory': {'breathing_pattern': ['Diaphragmatic', 'Shallow'], 'cough': 'Weak',
                    'vc': '2.1 L', 'pefr': '180 L/min'},
    'pain': {'pre': '4', 'post': '2'},
    'assistive_aids': {'wheelchair': ['Manual'], 'cushion': ['ROHO'], 'orthosis': 'Nil'},
    'outcome_measures': {'tenmwt': 'N/A', 'scim': '34/100', 'wisci': '0/20'},
    'skin_integrity': 'Intact, no pressure areas. Reddening over sacrum monitored.',
    'home_environment': 'Single-storey terrace, one step at entrance, squat toilet.',
    'pt_impression': 'T6 ASIA-A complete paraplegia with impaired sitting balance.',
    'stg': 'Achieve independent sitting balance in 2 weeks.',
    'ltg': 'Independent wheelchair-level mobility in 8 weeks.',
    'plan': 'Mat exercises, sitting balance retraining, wheelchair skills, family education.',
}

if __name__ == '__main__':
    b = pdf_sci.generate_sci_pdf(DATA)
    open('sci_smoke.pdf', 'wb').write(b)
    print('wrote sci_smoke.pdf', len(b), 'bytes')
```

Run:
```
py _smoke_sci.py
```
Expected: `wrote sci_smoke.pdf <N> bytes`, no exception. If ReportLab raises `LayoutError` ("Flowable too large"), STOP and flag — a single grid or section overflowed a page; the four big grids (sensory 28 rows, mmt 32 rows) rely on Table auto-split (`repeatRows=1` set), so a layout error means something else is oversized.

- [ ] **Step 4: Commit**

```
git add pdf_sci.py
git commit -m "feat(sci): full _build_story in spec section order"
```

---

## Task 4: Wire `pdf_sci` into `app.py` (import + registry row)

**Files:**
- Modify: `app.py:23` (import), `app.py:59` (SCI registry row)

- [ ] **Step 1: Add the import**

Find (`app.py:16-23`):
```python
import pdf_burn
```
Add directly below it:
```python
import pdf_sci
```

- [ ] **Step 2: Add the two pdf keys to the SCI registry row**

Find (`app.py:59`):
```python
    { 'id': 'SCI',         'label': 'Spinal Cord Injury', 'icon': '&#9855;',   'badge': 'SC',  'group': 'Neurological',      'ready': True  },
```
Replace with:
```python
    { 'id': 'SCI',         'label': 'Spinal Cord Injury', 'icon': '&#9855;',   'badge': 'SC',  'group': 'Neurological',      'ready': True,  'pdf_episode': pdf_sci.generate_episode_pdf,        'pdf_single': pdf_sci.generate_sci_pdf             },
```
Do **NOT** touch `_PDF_GENERATORS` / `_SINGLE_PDF_GENERATORS` (lines 71-72) — they derive from the row automatically.

- [ ] **Step 3: Verify the registry resolves the generators**

Run:
```
py -c "import app; print('SCI episode:', app._PDF_GENERATORS.get('SCI')); print('SCI single:', app._SINGLE_PDF_GENERATORS.get('SCI'))"
```
Expected: both print bound functions from `pdf_sci` (e.g. `<function generate_episode_pdf at ...>`, `<function generate_sci_pdf at ...>`), not `None`. If either is `None`, the row edit didn't take — STOP and re-check.

- [ ] **Step 4: Commit**

```
git add app.py
git commit -m "feat(sci): wire pdf_sci into FORM_REGISTRY + import"
```

---

## Task 5: Add `pdf_sci.py` to the PyInstaller spec (the footgun)

**Files:**
- Modify: `pt_assessment.spec:21`

- [ ] **Step 1: Add the datas entry**

Find (`pt_assessment.spec:21`):
```python
        ('pdf_burn.py', '.'),
```
Add directly below it:
```python
        ('pdf_sci.py', '.'),
```

- [ ] **Step 2: Confirm the entry is present**

Run:
```
py -c "print('pdf_sci.py listed:', \"('pdf_sci.py', '.')\" in open('pt_assessment.spec').read())"
```
Expected: `pdf_sci.py listed: True`. (This is the known PyInstaller footgun — works in dev, silently missing from the .exe build if skipped. No rebuild needed now; the build happens when Miruya ships the whole milestone.)

- [ ] **Step 3: Commit**

```
git add pt_assessment.spec
git commit -m "build(sci): add pdf_sci.py to PyInstaller datas"
```

---

## Task 6: Full verification — both routes + four-state visual + narrative tail

This is the spec's VERIFICATION section. No new code unless a check fails.

- [ ] **Step 1: Import clean (spec verify #1)**

```
py -c "import pdf_sci; print('import ok')"
```
Expected: `import ok`.

- [ ] **Step 2: Single-record route path — generate via the registry generator (spec verify #2)**

This exercises the exact callable the single route uses (`_SINGLE_PDF_GENERATORS['SCI'](data)`):
```
py -c "import app, _smoke_sci; b = app._SINGLE_PDF_GENERATORS['SCI'](_smoke_sci.DATA); open('sci_single.pdf','wb').write(b); print('single route bytes', len(b))"
```
Expected: `single route bytes <N>`, no 500/exception. `sci_single.pdf` written.

- [ ] **Step 3: Episode route path — generate via the episode generator (spec verify #2)**

The episode generator takes `(assessment, soaps, episode_info)`. Smoke it with the same record as the assessment, empty soaps:
```
py -c "import app, _smoke_sci; b = app._PDF_GENERATORS['SCI'](_smoke_sci.DATA, [], {'patient_name':'Ahmad bin Test','referral_date':'2026-06-07','form_type':'SCI'}); open('sci_episode.pdf','wb').write(b); print('episode route bytes', len(b))"
```
Expected: `episode route bytes <N>`, no exception. `sci_episode.pdf` written.

- [ ] **Step 4: Four-state visual confirmation (spec verify #3)**

Open `sci_single.pdf`:
```
start sci_single.pdf
```
In the **MMT** table confirm all five render distinctly:
- real value (`5`, `4`, `0`)
- em-dash `—` (NECK Flex / PROM R — blank)
- `NT` (NECK Flex / PROM L)
- grey-shaded empty cells (NECK Flex / MAS L + MAS R — greyed/absent keys)

In the **Upright Control** table confirm `N/A` renders as text (Hip / Ext) AND in **Sensory** confirm `NT` (T6 / Light Touch L) and `—` (T6 / Pin Prick R blank) appear. All four+ states must be present and visually separable. If a greyed cell is NOT grey-shaded, or a blank shows empty instead of `—`, STOP and fix (load-bearing spec requirement).

- [ ] **Step 5: Narrative tail confirmation (spec verify #4)**

In the same PDF, scroll to the end: confirm **PT IMPRESSION**, **SHORT TERM GOALS**, **LONG TERM GOALS**, **PLAN OF TREATMENT** each render their text from `_smoke_sci.DATA`, and the sign & chop block follows.

- [ ] **Step 6: Hand off to Miruya for the clinical eyeball**

Per RULES (Miruya owns visual/clinical confirmation): tell Miruya the three PDFs (`sci_single.pdf`, `sci_episode.pdf`) are ready and what to look for — four cell states distinct, sections in form order, KKM title + sign/chop present. Wait for the ship signal before the cleanup commit.

- [ ] **Step 7: Delete the smoke harness + generated PDFs, confirm clean tree (spec verify #5)**

```
del _smoke_sci.py sci_smoke.pdf sci_single.pdf sci_episode.pdf
git status
```
Expected: `git status` shows only the already-committed `pdf_sci.py` / `app.py` / `pt_assessment.spec` (clean working tree, no stray files). The `.gitattributes`/`.db`/`.png` ignores from prior sessions should keep noise out — if any `sci_*.pdf` lingers, remove it. Do **NOT** `git push` — Miruya pushes the whole SCI milestone (form + polish + templates + PDF + MPIS) in one go later.

---

## Self-Review (run against `SPEC-SCI-pdf-milestone3.md`)

**1. Spec coverage:**
- GOAL (pdf_sci.py, both routes, house style) → Tasks 1-6. ✔
- Decision 1 (match form PDFs not pixel borang) → `rs()`/`grid_table()` mirror `pdf_neuro`. ✔
- Decision 2 (no body chart; sensory as table) → no `body_chart_section` import; sensory rendered via `grid_table`. ✔
- Decision 3 (four states distinct) → Task 2 `grid_table` + verified Tasks 2/6. ✔
- Decision 4 (wiring via registry) → Tasks 4-5; dict-comps untouched. ✔
- DATA CONTRACT → every collect() key consumed in Task 3 `_build_story` (diagnosis, dr_management, problem, special_questions, current/past history, sensory, mmt, upright_control, proprioception, functional+notes, respiratory, pain, assistive_aids, outcome_measures, skin_integrity, home_environment, pt_impression, stg, ltg, plan). ✔
- FOUR-STATE table → `grid_table` mapping matches spec table row-for-row (real/blank→—/NT/N-A/greyed→grey bg). ✔
- STRUCTURE/section order → Task 3 comments 1-17 follow spec order. ✔
- WIRING (3 sub-items) → Tasks 4 (import+row), 5 (spec datas). ✔
- VERIFICATION (5 items) → Task 6 steps 1-7. ✔
- DO NOT list → no base-module refactor, no body chart, dict-comps untouched, MPIS untouched, spec entry included, signatures matched. ✔

**2. Placeholder scan:** No "TBD"/"add validation"/"similar to Task N" — all code is complete and shown inline. ✔

**3. Type/name consistency:** `grid_table(grid_rows, columns, width)`, `rs(rows, width)`, `_ls(val)`, `GRID_COLUMNS` keys (`sensory`/`proprioception`/`mmt`/`upright_control`/`functional`) used identically in Tasks 2-3. Entry points `generate_sci_pdf` / `generate_episode_pdf` consistent across Tasks 1, 4, 6 and match route call sites. ✔

**Open flag — RESOLVED:** `REF = 'fisio / b.pen. 4 / Pind. 2 / 2019'` (confirmed off the paper borang by Miruya, 2026-06-07). The earlier placeholder is gone. The ref number is `4` (vs HAND's `12`); spacing follows HAND's house style (`fisio / b.pen. 12 / Pind. 2 / 2019`) for readability, Miruya's call 2026-06-07.
