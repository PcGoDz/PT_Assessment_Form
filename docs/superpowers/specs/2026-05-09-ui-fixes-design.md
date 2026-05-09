# UI Fixes & QoL — Design Spec
**Date:** 2026-05-09  
**Branch:** main  
**Files touched:** `templates/home.html`, `templates/patient.html`, `static/css/style.css`  
**Design system:** Material Design 3 (tokens already defined in `static/css/style.css` from line 1290)

---

## 1. Discharge option missing (Critical)

### Problem
The bottom sheet only puts a `⋯` context menu on **discharged** episodes (Reactivate + View history). Active episodes only get a `›` arrow — no way to discharge. `patient.html` has no discharge or reactivate anywhere.

### Fix A — `home.html` bottom sheet (`renderSheetEpisodes`, line ~1385)

Active episodes currently render `<span class="sheet-ep-row-arrow">›</span>`.

Replace with the same `⋯` button pattern already used for discharged episodes (`sheet-ep-menu-btn` class, line 1125 in style.css). Add a second context menu `#ctx-menu-active` with:
- 🚪 **Discharge episode** → `openDischargeModal(episodeId)` (modal already in home.html)
- 📂 **View episode** → `sheetViewEpisode(episodeId)`

The ⋯ button must call `e.stopPropagation()` — same pattern as line 1395 — so it doesn't trigger the row's navigate onclick.

The row body onclick (`sheetViewEpisode`) stays. Clicking the row navigates; clicking `⋯` opens the menu. This matches the M3 list item + overflow menu pattern.

### Fix B — `patient.html` episode cards (line ~451)

Add action buttons to each episode card following M3 **tonal button** style (filled-tonal for secondary actions):
- Active card: "Discharge" button using `.btn-danger` (already styled, matches M3 error tonal)
- Discharged card: "Reactivate" button using `.btn-ghost` (matches M3 outlined button)

Add discharge modal markup (port from `home.html` `#modal-discharge`) and JS:
- `openDischargeModal(episodeId)`, `submitDischarge()`, `onDcReasonChange()` — same logic as home.html
- `reactivateEpisode(episodeId)` — same logic as home.html
- On success: `window.location.reload()` (patient.html is server-rendered, no SPA state to update)

M3 modal compliance: existing `.modal` class already uses `--m3-shape-lg` border-radius and `--m3-elev-3` shadow — no changes needed to modal structure.

---

## 2. Home page layout squeezed (QoL)

### Problem
`.home-main { max-width: 1100px; margin: 0 auto }` — on a 1920px dept monitor, ~400px of dead space either side.

### Fix — `home.html` line ~120

Remove `max-width` and `margin: 0 auto`. Keep `padding: 28px 24px` and `width: 100%`.

M3 compliance: M3 responsive layout uses the full canvas width within the navigation container. No artificial centring constraints. The 4-column stats grid and patient card grid will naturally expand to fill available space, which is the correct M3 adaptive layout behaviour.

```css
/* Before */
.home-main {
  flex: 1;
  max-width: 1100px;
  width: 100%;
  margin: 0 auto;
  padding: 28px 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* After */
.home-main {
  flex: 1;
  width: 100%;
  padding: 28px 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}
```

---

## 3. Assessment form dropdowns — native browser look (QoL)

### Problem
`select` elements have no `appearance: none` — browser renders native OS chrome. Inconsistent with the M3 design language used everywhere else.

### Fix — `static/css/style.css` line ~290

Update the existing `select` rule to match M3's **Exposed Dropdown Menu** specification:
- `appearance: none` to suppress OS chrome
- Trailing chevron icon using an inline SVG in `background-image`, coloured with `--m3-on-surface-variant` (`#49454f` light / `#c4c0ca` dark)
- `padding-right: 32px` to make room for the icon
- Existing focus state (accent border + shadow) already matches M3 focus indicator — keep as-is
- Existing `border-radius: var(--radius)` already matches M3 shape tokens — keep as-is

```css
select {
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%2349454f' d='M1.41 0L6 4.58 10.59 0 12 1.41l-6 6-6-6z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  padding-right: 32px;
}

body.dark select {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%23c4c0ca' d='M1.41 0L6 4.58 10.59 0 12 1.41l-6 6-6-6z'/%3E%3C/svg%3E");
}
```

Dark mode gets the `--m3-on-surface-variant` dark value (`#c4c0ca`) so the chevron stays visible.

---

## Files changed

| File | Change |
|------|--------|
| `templates/home.html` | Add `#ctx-menu-active` element + `openActiveCtxMenu()` JS + wire discharge for active sheet episodes |
| `templates/home.html` | Remove `max-width: 1100px` + `margin: 0 auto` from `.home-main` |
| `templates/patient.html` | Add discharge/reactivate buttons on episode cards + discharge modal markup + JS |
| `static/css/style.css` | `appearance: none` + M3 chevron SVG (light + dark) on `select` |

---

## Verification

1. **Discharge from bottom sheet:** Active patient card → bottom sheet → `⋯` on active episode → "Discharge episode" → M3 modal → select reason → confirm → episode moves to discharged, sheet refreshes
2. **Reactivate from bottom sheet:** Discharged episode `⋯` → "Reactivate episode" → works unchanged
3. **Discharge from patient.html:** `/patient/<id>` → active episode card has "Discharge" button → modal → success → page reloads with updated state
4. **Reactivate from patient.html:** Discharged episode card has "Reactivate" button → confirm → page reloads
5. **Layout:** Home page fills full viewport width on dept PC, no narrow centred column
6. **Dropdowns:** All `<select>` elements show M3 chevron (light + dark mode), no native OS chrome
