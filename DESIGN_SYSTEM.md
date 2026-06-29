# DESIGN_SYSTEM.md — UI Patterns for PT Assessment Forms

Read this before writing any form HTML. The design system already exists in `style.css` — this file documents what's there so it stops getting reinvented per form.

**Design heritage:** This system follows Material Design 3 (M3) conventions. Elevation via `--m3-elev-1/2/3` tokens, surface containers via `--m3-surface-*`, chip components for short categorical selectors. When adding new components, prefer M3 primitives over inventing custom patterns.

**Two tiers of rules:**
- **Layout primitives** — non-negotiable. Apply to every form regardless of clinical domain.
- **Section patterns** — form-specific. MS form is the canonical MSK reference; other domains (pelvic floor, paediatric, etc.) adapt the section structure but MUST still use the primitives.

---

## Canonical reference

**`templates/forms/ms.html`** is the visual canon. Read it before writing any new form HTML. Mirror its structure for: section card pattern, sidebar nav block, field grid usage, derived-value chips, required-field marker.

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

Use exact HTML structure — don't reinvent.

### Pain VAS slider with chip readout

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

Section count, labels, and content are domain-specific. What MUST stay consistent across all forms:
- Section card pattern (`.card` > `.card-header` > `.card-body`)
- Numbered `.sec-num` prefix in clinical flow order
- Sidebar nav populated, one entry per section, with icon
- All fields wrapped in `.field`
- `.fg` grid used for layout

---

## Anti-patterns (real failures from prior sessions)

The hand form failure mode (May 2026):

- ❌ Sidebar nav block empty → users see no section navigation
- ❌ Sections built without `.card` wrappers → flat floating fields, no visual hierarchy
- ❌ Canvas (hand SVG) plopped in centre of empty whitespace → spatially incoherent
- ❌ Marker type selector + Clear All buttons disconnected from canvas → spatial relationship broken
- ❌ Legend floated at the bottom, far from canvas → clinician forgets colour mapping by the time they read it
- ❌ Hand SVGs tiny relative to canvas whitespace → clinical precision impossible
- ❌ Reusing `.irr-chip` for a non-irritability single-select without adding matching `.sel-<Value>` CSS form-locally → selected state is invisible (`style.css` only defines `.sel-High/.sel-Medium/.sel-Low`; JS applies the class, nothing paints). Add rules in the form's own `<style>` block inside `{% block content %}`. Full pattern in WORKFLOW.md Anti-Repeat.
- ❌ Placing a `+Note` toggle button (or any bare child) directly in a `.field` (which is `flex-direction:column`) without `align-self:flex-start` → the button centers in the leftover width instead of sitting left under its content. SCI's donor doesn't show this because its +Note sits under a full-width grid; under a partial-width chip row the float is visible. Fix form-locally: `.func-note-toggle { align-self:flex-start; }`. Caught FACIAL +Note smoke-test 2026-06-23.

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

PDF output patterns (ReportLab/Platypus primitives, component recipes, anti-patterns, pre-ship checklist) now live in **`DESIGN_SYSTEM-pdf.md`**. Read it before writing or editing any `pdf_<form>.py`.

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
