# DESIGN_SYSTEM.md — UI Patterns for PT Assessment Forms

Read this before writing any form HTML. The design system already exists in `style.css` — this file documents what's there so it stops getting reinvented per form.

**Design heritage:** This system follows Material Design 3 (M3) conventions. Elevation via `--m3-elev-1/2/3` tokens, surface containers via `--m3-surface-*`, chip components for short categorical selectors. When adding new components, prefer M3 primitives over inventing custom patterns.

**Two tiers of rules:**
- **Layout primitives** — non-negotiable. Apply to every form regardless of clinical domain.
- **Section patterns** — form-specific. MS form is the canonical MSK reference; other domains (pelvic floor, paediatric, etc.) adapt the section structure but MUST still use the primitives.

If a primitive is missing from a form, that's a bug, not a design choice.

---

## Canonical reference

**`templates/forms/ms.html`** is the visual canon. Read it before writing any new form HTML. Mirror its structure for: section card pattern, sidebar nav block, field grid usage, derived-value chips, required-field marker.

When in doubt about *how something should look*, open ms.html and copy the pattern.

---

## Layout Primitives (apply to ALL forms)

### 1. Three required template blocks

Every form template MUST implement all three Jinja blocks. Missing any = visible bug.

```jinja
{% block form_name %}<Form Display Name>{% endblock %}

{% block sidebar_nav %}
<div class="nav-item" onclick="Main.go('s-<id>')"><span class="nav-icon">&#<emoji>;</span> <Section Label></div>
... one per section ...
{% endblock %}

{% block content %}
... all section cards here ...
{% endblock %}
```

**Empty sidebar_nav is a bug.** If the form has sections, the sidebar lists them. No exceptions.

### 2. Section card pattern

Every clinical section MUST be wrapped in a `.card` with numbered prefix. Flat content in `{% block content %}` without card wrappers is broken UI.

```html
<div class="card" id="s-<section-id>">
  <div class="card-header">
    <span class="sec-num">01</span>
    <h2>Section Title</h2>
  </div>
  <div class="card-body">
    <!-- fields here -->
  </div>
</div>
```

- `id="s-<section-id>"` must match the `Main.go('s-<id>')` in sidebar nav.
- `.sec-num` is two-digit zero-padded (01, 02, ... 11). Increments per section in clinical flow order.
- `<h2>` is the human-readable section title.

### 3. Field grid system (`.fg`)

`.fg` is the grid container for fields. Three variants:

- `.fg` — single column, stacked. Use for single-field rows.
- `.fg.c2` — two equal columns. Use for paired clinical data.
- `.fg.c3` — three equal columns. Use sparingly (only when three short fields read better side-by-side).

To span a field across all columns of a `.fg.c2` or `.fg.c3`:
```html
<div class="field" style="grid-column:span 2"> ... </div>
```

### 4. Field anatomy

Every input lives inside a `.field`:

```html
<div class="field">
  <label>Label Text <span class="req">*</span></label>
  <input type="text" id="..." placeholder="...">
</div>
```

- `<span class="req">*</span>` marks required. Optional fields omit it.
- Label text is sentence case for the human-readable part. The CSS handles the uppercase/letter-spacing treatment.

### 5. Field pairing grammar

Pair related fields side-by-side via `.fg.c2`. Examples from MS form:

- Patient identification: NRIC + Assessment Date, DOB + Age
- Symmetric clinical data: Pre-VAS + Post-VAS, Left + Right neurological findings
- Two halves of one concept: Doctor's Management + Problem, Aggravating + Easing factors

**Rule of thumb:** if two fields would naturally be read together by a clinician scanning the form, pair them. If they're independent, stack them.

### 6. Derived value display

When a field's value can be derived from another field (NRIC → DOB + Gender, DOB → Age), show the derived value as a `.derived-badge` chip directly below the source input.

```html
<div class="field" id="nric-field">
  <label>NRIC No. <span class="req">*</span></label>
  <input type="text" id="pt-nric" maxlength="12" oninput="FormBase.onNricInput(this.value)">
  <div class="derived-info">
    <span class="derived-badge hidden" id="derived-dob"></span>
    <span class="derived-badge hidden" id="derived-gender"></span>
  </div>
</div>
```

`.derived-badge` is a green inline chip (success-coloured). It confirms to the clinician that auto-derivation worked. Toggle `.hidden` to show/hide.

---

## Component Recipes (use when applicable)

These are reusable patterns. Use the exact HTML structure — don't reinvent.

### Pain VAS slider with chip readout

For any 0–10 visual analog scale:

```html
<div class="pain-score-box">
  <label style="font-size:11px;font-weight:500;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.04em">PRE-treatment Pain (VAS 0&ndash;10)</label>
  <div class="pain-scale-row">
    <span style="font-size:11px;color:var(--text-faint)">0</span>
    <input type="range" id="pain-pre" min="0" max="10" value="0" step="1" oninput="Form.setPain('pre', this.value)">
    <span style="font-size:11px;color:var(--text-faint)">10</span>
    <div class="pain-val pv-low" id="pv-pre">0</div>
  </div>
</div>
```

The `.pain-val` chip displays the current value. JS toggles `.pv-low / .pv-mid / .pv-high` for colour.

### Chip-style selectors (for short option sets)

Use chip buttons instead of dropdowns when there are 3–6 options and the choice is visual/categorical (not freeform text):

```html
<div class="irr-chips">
  <button class="irr-chip" id="irr-High"   onclick="Form.pickIrr('High')">High</button>
  <button class="irr-chip" id="irr-Medium" onclick="Form.pickIrr('Medium')">Medium</button>
  <button class="irr-chip" id="irr-Low"    onclick="Form.pickIrr('Low')">Low</button>
</div>
```

Selected state is added via JS as `.sel-<Value>` (e.g. `.sel-High`).

### Canvas + controls layout (body chart / hand chart / lung chart)

Visual marker tools follow a 2-column grid: canvas on left, controls on right. NOT canvas centred with controls floating elsewhere.

```html
<div class="body-chart-wrap">
  <div class="body-figures">
    <!-- SVG canvases -->
  </div>
  <div class="chart-controls">
    <!-- marker type selector -->
    <!-- marker list -->
    <!-- chart notes textarea -->
  </div>
</div>
```

`.body-chart-wrap` is `grid-template-columns: auto 1fr` — canvas takes its natural size, controls fill the rest. Marker type selector lives at the TOP of `.chart-controls`, directly above the marker list. Legend (if needed) is integrated INTO the marker type selector, not floated separately.

---

## Form-Specific Structure (MS canonical, others adapt)

MS form's 11 sections are an MSK-specific clinical flow. **Other domains will have different sections.** That's expected.

What MUST stay consistent across all forms:
- Section card pattern (`.card` > `.card-header` > `.card-body`)
- Numbered `.sec-num` prefix in clinical flow order
- Sidebar nav populated, one entry per section, with icon
- All fields wrapped in `.field`
- `.fg` grid used for layout

What CAN differ per form:
- Number of sections (MS has 11; a simpler form might have 5)
- Section labels and content (pelvic floor will have continence/PERFECT/prolapse sections, not body chart)
- Which component recipes apply (lung chart for CR, hand chart for HAND, neither for pelvic floor)

When implementing a new clinical domain, the question is *which sections does this assessment need clinically*, not *what does MS have*. But once sections are decided, the layout primitives are non-negotiable.

---

## Anti-patterns (real failures from prior sessions)

The hand form failure mode (May 2026):

- ❌ Sidebar nav block empty → users see no section navigation
- ❌ Sections built without `.card` wrappers → flat floating fields, no visual hierarchy
- ❌ Canvas (hand SVG) plopped in centre of empty whitespace → spatially incoherent
- ❌ Marker type selector + Clear All buttons disconnected from canvas → spatial relationship broken
- ❌ Legend floated at the bottom, far from canvas → clinician forgets colour mapping by the time they read it
- ❌ Hand SVGs tiny relative to canvas whitespace → clinical precision impossible

If any of these slip in again, the form is not shippable.

---

## Pre-ship Visual Checklist

Add to smoke test for every new form (extends WORKFLOW.md checklist):

- [ ] `{% block sidebar_nav %}` populated with one `.nav-item` per section
- [ ] Every section wrapped in `<div class="card">` with `.card-header` (containing `.sec-num` + `<h2>`) and `.card-body`
- [ ] Section IDs (`id="s-..."`) match `Main.go('s-...')` in sidebar nav
- [ ] Paired clinical fields use `.fg.c2`, not stacked full-width
- [ ] Derived values (NRIC → DOB/Gender, DOB → Age) display as `.derived-badge` chips
- [ ] Required fields marked with `<span class="req">*</span>`
- [ ] Visual compare to `templates/forms/ms.html` — does this form belong to the same family?

If any item fails, form is not ready=True. No exceptions.

---

## PDF Layout

The PDF engine is ReportLab (Platypus). All building blocks live in `pdf_platypus_base.py`. Per-form generators follow `pdf_<form>.py`. Do not duplicate shared primitives per form.

### PDF Primitives

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

### PDF Component Recipes

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

### PDF Anti-patterns

- ❌ **Mixed layout rhythm in one form.** Alternating `two_col()` boxes and full-width tables within a single visual region creates inconsistent vertical rhythm. HAND PDF Block 4 demonstrates this — usable but noticeable. When converting a kv-soup block to tables, commit to full-width for the entire block.
- ❌ **Tables with all-empty rows.** Without a `_has_data()` guard, a patient with no strength data gets a Strength table of "—" in every cell. Skip the table entirely.
- ❌ **Collecting form data without a PDF render block.** Silent data loss. `neuro.muscles` (MMT) was collected by `form_hand.js` for the entire HAND form history and never rendered by `pdf_hand.py`. Undetectable without explicit cross-referencing.
- ❌ **`story.append()` on a list-returning helper.** `sign_chop_block()` returns a list — use `story +=`. `two_col()` and `box()` return a single Table — use `story.append()`. Mixing these causes NestedFlowable errors.

### PDF Pre-ship Checklist

- [ ] Module imports cleanly: `py -c "from pdf_X import generate_X_pdf; print('ok')"`
- [ ] Realistic-data PDF renders without ReportLab errors (no "too large", no FrameError)
- [ ] Sparse-data PDF (patient + diagnosis only) — all empty tables skipped, no "—" rows rendered
- [ ] Every field in `form_X.js collect()` has a matching render block in `pdf_X.py` — cross-check manually
- [ ] `sign_chop_block()` used as footer, not inlined
- [ ] KKM form ref string matches borang exactly (check WORKFLOW.md Clinical Reference)

---

## CSS classes used by this document

All defined in `style.css`. Do NOT redefine per form — reuse.

- **Layout:** `.card`, `.card-header`, `.sec-num`, `.card-body`, `.fg`, `.fg.c2`, `.fg.c3`, `.field`, `.req`
- **Derived chips:** `.derived-info`, `.derived-badge`
- **Pain VAS:** `.pain-score-box`, `.pain-scale-row`, `.pain-val` (+ `.pv-low / .pv-mid / .pv-high`)
- **Chip selectors:** `.irr-chips`, `.irr-chip` (+ `.sel-<Value>` state classes)
- **Chart canvas + controls:** `.body-chart-wrap`, `.chart-controls`
- **Sidebar nav:** `.nav-item`, `.nav-icon`

Grep `style.css` for any of these to find the exact definitions.
