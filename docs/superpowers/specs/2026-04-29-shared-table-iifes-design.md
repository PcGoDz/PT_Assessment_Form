# Shared Table IIFEs + Geriatric Fixes — Design Spec
**Date:** 2026-04-29
**Status:** Approved, ready for implementation

---

## Context

Three forms (NEURO, AMPUTATION, and the upcoming HAND) share nearly identical dynamic table
components for MMT, investigation, and medication rows — each currently implemented as inline
functions duplicated per form. MovementTable is already an IIFE but has hardcoded joint/plane
lists that block HAND reuse. Additionally, the Geriatric PDF generator has a critical bug and
two UI redundancies to clean up.

**Approach:** Extract shared tables into standalone IIFEs (mirrors existing MovementTable pattern).
Wire NEURO and AMPUTATION to the new IIFEs. MS deferred — keeps its inline `addMmtRow` for now,
migrated when MS is next touched for another reason (Approach B — contained blast radius).

---

## Section 1 — Geriatric Fixes

### 1a. PDF Bug — Body Chart Format Mismatch

**Root cause:** `form_geriatric.js` stores body chart as:
```js
d.body_chart = BodyChart.getData()  // returns raw markers array (list)
```
But `body_chart_section()` in `pdf_platypus_base.py` expects:
```python
{ 'markers': [...], 'notes': '' }  # dict with two keys
```
So `bc.get('markers')` blows up with `'list' object has no attribute 'get'`.

**Fix — `form_geriatric.js`:** Store in the standard format (matching CLAUDE.md):
```js
d.bodyChart = { markers: BodyChart.getData(), notes: gv('chart-notes') }
```
Update `populate` to use `BodyChart.loadData(data.bodyChart?.markers || [])`.
Update `reset` to use `BodyChart.clearAll()`.

**Fix — `pdf_geriatric.py`:** Add a local `_ensure_dict` helper (same pattern as `pdf_neuro.py` — it is NOT exported from `pdf_platypus_base`, must be defined locally):
```python
def _ensure_dict(val):
    if isinstance(val, str):
        import json
        try: return json.loads(val)
        except: return {}
    return val if isinstance(val, dict) else {}

bc = _ensure_dict(d.get('bodyChart') or d.get('body_chart'))
```
This handles old records (raw list or snake_case key) and new records (camelCase dict) safely.

### 1b. UI — Remove Redundant RN/IC and Sex Fields

**File:** `templates/forms/geriatric.html`

Remove from the patient details section:
- **RN/IC** — the `<div class="field">` block containing `id="pt-rn"` (line ~83)
- **Sex** — the entire sex section including both the read-only display input (`id="pt-sex-display"`) and the radio button group (`pt-sex-m` / `pt-sex-f`) — remove the whole field block

Both are auto-derived from NRIC via `FormBase`. Remove corresponding `sv()`/`gv()`/radio() calls from `form_geriatric.js` collect/populate/reset.

### 1c. UI — Remove Pain Site Field, Derive from Body Chart

**File:** `templates/forms/geriatric.html` — remove the `pain_site` input field.

**File:** `pdf_geriatric.py` line 141 — replace:
```python
Paragraph(f'<b>Pain Site:</b> {d.get("pain_site","")}', S_NORMAL),
```
With body chart marker summary derived from `bc`:
```python
pain_sites = ', '.join(
    f"{m.get('zone','')} ({'Ant' if m.get('view')=='ant' else 'Post'})"
    for m in bc.get('markers', [])
) or '—'
Paragraph(f'<b>Pain Site:</b> {pain_sites}', S_NORMAL),
```

Remove `pain_site` from `form_geriatric.js` collect/populate/reset.

---

## Section 2 — MmtTable IIFE

**New file:** `static/js/mmt_table.js`

### Schema

Unified bilateral schema — muscle | L-grade | R-grade.

Rationale: NEURO and AMPUTATION already use this format. HAND will too.
MS migration deferred to Approach B (MS keeps inline `addMmtRow`, no regression).

### Init Config

```js
MmtTable.init({
  containerId: 'mmt-tbody',   // ID of the <tbody> element
  muscles: [                  // caller provides muscle list
    'Shoulder Flexors', 'Elbow Flexors', ...
  ]
})
```

### Public API

| Method | Description |
|--------|-------------|
| `MmtTable.init(config)` | Renders empty table, wires add-row button via event delegation |
| `MmtTable.addRow(prefill?)` | Adds a row; prefill is `{ muscle, gradeL, gradeR }` |
| `MmtTable.deleteRow(id)` | Removes row by internal id |
| `MmtTable.getData()` | Syncs DOM → returns `[{ muscle, gradeL, gradeR }, ...]` |
| `MmtTable.loadData(arr)` | Clears and repopulates from saved array |
| `MmtTable.clear()` | Resets to empty state |

### Grade Options

`0, 1, 2, 2+, 3, 3+, 4, 4+, 5` — standard MRC scale, same as current inline implementations.

### Add-Row Button Wiring

Event delegation on `document` listening for click on `#mmt-add-row` (matches MovementTable pattern).
Each HTML form places `<button id="mmt-add-row">Add Row</button>` above its MMT table.

### Migration — NEURO and AMPUTATION

- Remove `MMT_MUSCLES`, `addMmtRow()`, `collectTable('mmt-tbody')`, `restoreTable('mmt-tbody', ...)` from `form_neuro.js` and `form_amputation.js`
- Replace with `MmtTable.getData()` in `collect()` and `MmtTable.loadData(d.mmt)` in `populate()`
- Replace `MmtTable.clear()` in `reset()`
- Add `<script src="/static/js/mmt_table.js">` to `neuro.html` and `amputation.html` extra_js
- Call `MmtTable.init({ containerId: 'mmt-tbody', muscles: [...] })` in each form's init block

### PDF impact

None. NEURO and AMPUTATION PDFs already consume `[{ muscle, gradeL, gradeR }]`.
Data key (`mmt`) and shape stay identical.

---

## Section 3 — InvMedTable IIFE

**New file:** `static/js/inv_med_table.js`

### Two tables, one IIFE

Investigation and medication always appear together on every form using the dynamic variant.
Single script tag, single `getData()` / `loadData()` call pair.

### Row Schemas

**Investigation:** type (dropdown: CT scan, MRI, Angiogram, X-ray, Blood test, ECG, Other) | date | findings (text)

**Medication:** name | dose | frequency

Schemas extracted verbatim from `form_neuro.js` — no change, so NEURO's PDF and MPIS need zero updates.

### Public API

| Method | Description |
|--------|-------------|
| `InvMedTable.init()` | Wires both add-row buttons via event delegation |
| `InvMedTable.addInvRow(prefill?)` | Adds investigation row |
| `InvMedTable.addMedRow(prefill?)` | Adds medication row |
| `InvMedTable.getData()` | Returns `{ investigations: [[...]], medications: [[...]] }` |
| `InvMedTable.loadData(data)` | Clears and repopulates both tables from `{ investigations, medications }` |
| `InvMedTable.clear()` | Resets both tables |

### Expected DOM IDs

`investigation-tbody` and `medication-tbody` — hardcoded for now (only NEURO uses this IIFE).
Config param added when a second form needs it.

Add-row buttons: `#inv-add-row` and `#med-add-row` (event delegation, matches MmtTable pattern).

### Migration — NEURO only

- Remove `addInvestigationRow()`, `addMedicationRow()`, `collectTable('investigation-tbody')`,
  `collectTable('medication-tbody')`, and matching `restoreTable` calls from `form_neuro.js`
- Replace with `InvMedTable.getData()` in `collect()` and `InvMedTable.loadData(...)` in `populate()`
- Add `<script src="/static/js/inv_med_table.js">` to `neuro.html` extra_js
- Call `InvMedTable.init()` in neuro.html init block

### PDF / MPIS impact

None. Data keys (`investigations`, `medications`) and array-of-arrays shape stay identical.

---

## Section 4 — MovementTable Refactor

**Same file:** `static/js/movement_table.js` — refactor in place.

### Change

`JOINTS`, `PLANES`, and `SIDES` move from module-level constants into the `init()` config,
with the current values as defaults:

```js
MovementTable.init({
  joints: [...],  // optional, defaults to current MSK joint list
  planes: [...],  // optional, defaults to current MSK plane list
  sides:  [...],  // optional, defaults to current sides list
})
```

Internal module variables `_joints`, `_planes`, `_sides` replace the constants.
`makeSelect()` reads from these variables instead of the constants.

### What does NOT change

- Column structure: joint | side | plane | activeRom | activePain | passiveRom | passivePain | resisted
- `getData()` output shape — identical
- `loadData()`, `deleteRow()`, `clear()` — identical
- `addRow()` button ID: `#mov-add-row` — identical

### Forms affected

MS and SPINE call `MovementTable.init()` with no args today → keep working unchanged,
defaults cover them. Zero migration needed.

### HAND benefit

```js
MovementTable.init({ joints: HAND_JOINTS, planes: HAND_PLANES })
```
One line gives HAND a fully tailored ROM table.

---

## Execution Order

Run in this sequence to keep each step independently testable:

1. **Geriatric fixes** — self-contained, no dependencies. Verify PDF export works before moving on.
2. **MovementTable refactor** — change is internal only, MS/SPINE must still work after.
3. **MmtTable IIFE** — new file first, then wire NEURO, then AMPUTATION. Test save/load each.
4. **InvMedTable IIFE** — new file first, then wire NEURO. Test save/load.

---

## Files Changed Summary

| File | Change |
|------|--------|
| `pdf_geriatric.py` | Fix bc parsing, derive pain_site from markers |
| `form_geriatric.js` | Fix bodyChart format, remove RN/IC, Sex, pain_site |
| `templates/forms/geriatric.html` | Remove RN/IC, Sex, pain_site fields |
| `static/js/movement_table.js` | Make JOINTS/PLANES/SIDES configurable at init |
| `static/js/mmt_table.js` | **New** — bilateral MMT IIFE |
| `static/js/form_neuro.js` | Wire MmtTable + InvMedTable, remove inline equivalents |
| `static/js/form_amputation.js` | Wire MmtTable, remove inline equivalent |
| `templates/forms/neuro.html` | Add script tags, update button IDs |
| `templates/forms/amputation.html` | Add script tag, update button ID |
| `static/js/inv_med_table.js` | **New** — InvMedTable IIFE |

---

## Non-Goals (explicitly out of scope)

- MS MMT migration (Approach B — deferred)
- HAND form (future session)
- Validation layer UI
- Any other form not listed above
