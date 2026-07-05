# NCD Trend Render-Layer Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **No TDD on this plan.** UI render layer — project convention (CLAUDE.md, RULES.md) forbids TDD push on the UI layer, and the source prompt reaffirms it. Verification is `node --check` + a hands-on smoke on a real multi-visit NCD episode. Backend is untouched; no Python/DB test needed.

**Goal:** Replace the NCD Trend page's flat, mostly-empty grid table with data-driven trend cards, a quiet chip row for under-tracked metrics, and an accessible per-visit history table — screen-only, no PDF/MPIS, no shared-code edits.

**Architecture:** Only `render()` and its chart helper in `static/js/ncd_trend.js` change; `transform()`, `init()`, the fetch, and the `HEADLINE` key list are frozen. All new CSS lands in `templates/ncd_trend.html`'s own `<style>` block using existing M3 surface/elevation tokens. The current `sparkline()` gap-aware segment logic is **extracted** into a reusable geometry helper (not re-derived) and reused by the new larger card chart.

**Tech Stack:** Vanilla JS (IIFE module, ES5-style to match the file), inline SVG, M3-token CSS. No frameworks, no libraries.

---

## File Structure

| File | Change | Responsibility |
|------|--------|----------------|
| `static/js/ncd_trend.js` | Modify — replace `sparkline()` + `render()`, add helpers | Render layer: geometry helper, card chart, delta line, trend card, chip row, visit-history table, `render()` orchestration |
| `templates/ncd_trend.html` | Modify — `<style>` block only | Form-local `tr-*` styling for the new markup, both light + dark |

**Untouched (hard boundaries):** `transform()`, `init()`, the fetch call, and `HEADLINE` inside `ncd_trend.js`; `static/js/ncd_measure.js`; `templates/episode.html`; `saveSoapDraft()`; all shared JS (`form_base.js`, `assessment_grid.js`, …); `static/css/style.css`; every PDF/MPIS path.

---

## Design decisions locked before build

- **Chart line colour is neutral (`var(--accent)`), NOT green/blue-by-direction.** The current `sparkline()` colours the line green when the last value ≤ the first ("down = improving"). That heuristic is applied to *all* metrics — but for `handGrip` and `walk6Hr`, down is not improving, so the existing behaviour is a latent clinical-accuracy bug. Direction is now carried by the delta line's **arrow + word** (accessible, colour-independent), so the chart line no longer needs to encode meaning. Going neutral removes the wrong-direction implication for free. (Flagged to Miruya; recorded here as the chosen default.)
- **Gaps stay breaks, never bridges.** Two real readings separated by a missing visit render as two disconnected dots, not a bridged line — preserving the established "gap ≠ zero, gap ≠ interpolate" principle from `transform()`/`sparkline()`.
- **History table orientation follows the prompt: rows = visits, columns = the 7 metrics.** This deliberately flips the current metric-rows layout. Semantic `<table>` with `<th scope="col">` for metric headers and `<th scope="row">` for each visit date.
- **"Qualifies for a card" = 2+ non-null readings** for that metric key across all visits. `<2` → chip row. This makes the card count vary (0–7) per episode; the grid is `auto-fill`, never a hardcoded hero layout.

---

## Task 1: Extract gap-aware chart geometry; build the card chart

**Files:**
- Modify: `static/js/ncd_trend.js` — replace `sparkline()` (lines ~39–73) with `chartGeometry()` + `metricChart()`; add `shortDate()` helper.

- [ ] **Step 1: Add the `shortDate()` helper** (near the top of the IIFE, after `HEADLINE`).

```js
  // 'YYYY-MM-DD...' -> 'D Mon'. Manual parse (avoids new Date() UTC day-shift);
  // non-date strings pass through unchanged.
  function shortDate(s) {
    if (!s) return '';
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s));
    if (!m) return String(s);
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return parseInt(m[3], 10) + ' ' + months[parseInt(m[2], 10) - 1];
  }
```

- [ ] **Step 2: Replace `sparkline()` with `chartGeometry()`** — the SAME segment-building logic, extracted into a reusable box of size W×H. Delete the old `sparkline()` function entirely.

```js
  // ── Gap-aware geometry (extracted verbatim from the old sparkline). ──
  // Nulls split the series into contiguous segments; a length-1 segment is an
  // isolated reading (draw as a dot). Never bridges a gap. Points carry x,y,i.
  function chartGeometry(values, W, H) {
    var present = values.filter(function (v) { return v !== null; });
    if (!present.length) return { segments: [], min: 0, max: 0 };
    var min = Math.min.apply(null, present), max = Math.max.apply(null, present);
    var span = (max - min) || 1;
    var n = values.length;
    function x(i) { return (n === 1) ? W / 2 : (i / (n - 1)) * W; }
    function y(v) { return H - ((v - min) / span) * H; }
    var segments = [], cur = [];
    values.forEach(function (v, i) {
      if (v === null) { if (cur.length) { segments.push(cur); cur = []; } return; }
      cur.push({ x: x(i), y: y(v), i: i });
    });
    if (cur.length) segments.push(cur);
    return { segments: segments, min: min, max: max };
  }
```

- [ ] **Step 3: Add `metricChart()`** — a card-sized line chart with x-axis visit-date labels, built on `chartGeometry()`.

```js
  // ── Card-sized chart: gap-aware line + dots, x-axis date labels under readings. ──
  function metricChart(values, dates) {
    var W = 240, PLOT_H = 70, LABEL_H = 16, PAD = 4;
    var innerW = W - PAD * 2, H = PLOT_H + LABEL_H;
    var geo = chartGeometry(values, innerW, PLOT_H);
    var STROKE = 'var(--accent, #4a7ac8)';

    var line = geo.segments.map(function (seg) {
      if (seg.length === 1) {
        return '<circle cx="' + (PAD + seg[0].x).toFixed(1) + '" cy="' + seg[0].y.toFixed(1) +
               '" r="2.4" fill="' + STROKE + '"/>';
      }
      var pts = seg.map(function (p) { return (PAD + p.x).toFixed(1) + ',' + p.y.toFixed(1); }).join(' ');
      return '<polyline points="' + pts + '" fill="none" stroke="' + STROKE +
             '" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/>';
    }).join('');

    var dots = geo.segments.reduce(function (acc, seg) {
      seg.forEach(function (p) {
        acc.push('<circle cx="' + (PAD + p.x).toFixed(1) + '" cy="' + p.y.toFixed(1) +
                 '" r="1.8" fill="' + STROKE + '"/>');
      });
      return acc;
    }, []).join('');

    var n = values.length;
    function xAt(i) { return PAD + ((n === 1) ? innerW / 2 : (i / (n - 1)) * innerW); }
    var labels = values.map(function (v, i) {
      if (v === null) return '';
      return '<text x="' + xAt(i).toFixed(1) + '" y="' + (H - 3) + '" font-size="8" ' +
             'text-anchor="middle" fill="var(--text-faint)" ' +
             'font-family="IBM Plex Mono, monospace">' + shortDate(dates[i]) + '</text>';
    }).join('');

    return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" style="max-width:' + W +
           'px" role="img" aria-hidden="true">' + line + dots + labels + '</svg>';
  }
```

- [ ] **Step 4: `node --check`** to catch syntax errors early.

Run: `node --check static/js/ncd_trend.js`
Expected: no output, exit 0.

---

## Task 2: Delta line + non-null counting helpers

**Files:**
- Modify: `static/js/ncd_trend.js` — add helpers above `render()`.

- [ ] **Step 1: Add counting + last-two helpers.**

```js
  function nonNullCount(values) {
    return values.filter(function (v) { return v !== null; }).length;
  }

  // The two most recent non-null readings with their dates (or null if <2 exist).
  function lastTwo(values, dates) {
    var pts = [];
    values.forEach(function (v, i) { if (v !== null) pts.push({ v: v, d: dates[i] }); });
    return pts.length >= 2 ? { latest: pts[pts.length - 1], prev: pts[pts.length - 2] } : null;
  }

  // Unit from a label's parenthetical, e.g. 'Weight (kg)' -> 'kg'. '' when none.
  function unitOf(label) {
    var m = label.match(/\(([^)]+)\)/);
    return m ? m[1] : '';
  }
```

- [ ] **Step 2: Add `deltaLine()`** — direction via arrow **and** word (never colour-only), magnitude vs the *previous* non-null reading, referencing that reading's date.

```js
  // "↓ 16 kg lower since 3 May". Arrow + word both carry direction (accessibility:
  // no colour dependence). Delta is vs the PREVIOUS non-null value, not the first.
  function deltaLine(values, dates, unit) {
    var t = lastTwo(values, dates);
    if (!t) return '';
    var diff  = t.latest.v - t.prev.v;
    var mag   = Math.round(Math.abs(diff) * 10) / 10;
    var arrow = diff < 0 ? '↓' : (diff > 0 ? '↑' : '→');
    var word  = diff < 0 ? 'lower' : (diff > 0 ? 'higher' : 'unchanged');
    var amt   = (diff === 0) ? '' : ' ' + mag + (unit ? ' ' + unit : '') + ' ' + word;
    if (diff === 0) amt = ' unchanged';
    return '<div class="tr-delta">' + arrow + amt + ' since ' + shortDate(t.prev.d) + '</div>';
  }
```

- [ ] **Step 3: `node --check`.**

Run: `node --check static/js/ncd_trend.js`
Expected: exit 0.

---

## Task 3: Trend-card builder

**Files:**
- Modify: `static/js/ncd_trend.js` — add `trendCard()` above `render()`.

- [ ] **Step 1: Add `trendCard()`.** Label + latest value + delta line + chart.

```js
  function trendCard(m, values, dates) {
    var t = lastTwo(values, dates);            // guaranteed non-null: only called for 2+ metrics
    return '<div class="tr-card">' +
      '<div class="tr-card-label">' + m.label + '</div>' +
      '<div class="tr-card-value">' + t.latest.v + '</div>' +
      deltaLine(values, dates, unitOf(m.label)) +
      '<div class="tr-card-chart">' + metricChart(values, dates) + '</div>' +
    '</div>';
  }
```

- [ ] **Step 2: `node --check`.**

Run: `node --check static/js/ncd_trend.js`
Expected: exit 0.

---

## Task 4: Visit-history semantic table

**Files:**
- Modify: `static/js/ncd_trend.js` — add `visitHistory()` above `render()`.

- [ ] **Step 1: Add `visitHistory()`.** Rows = visits, columns = the 7 metrics. Real `<table>` with `scope`'d headers and a `<caption>`.

```js
  // One row per visit; a column per HEADLINE metric. Semantic + accessible
  // (scope="col"/"row", caption) — the current table's a11y is a strength we keep.
  function visitHistory(model) {
    var head = '<tr><th scope="col">Visit</th>' +
      HEADLINE.map(function (m) { return '<th scope="col">' + m.label + '</th>'; }).join('') +
      '</tr>';
    var rows = model.dates.map(function (d, i) {
      var cells = HEADLINE.map(function (m) {
        var v = model.metrics[m.key][i];
        return '<td>' + (v === null ? '<span class="tr-miss">&mdash;</span>' : v) + '</td>';
      }).join('');
      return '<tr><th scope="row">' + shortDate(d) + '</th>' + cells + '</tr>';
    }).join('');
    return '<table class="tr-hist">' +
      '<caption class="tr-hist-cap">Every headline metric, per visit</caption>' +
      '<thead>' + head + '</thead><tbody>' + rows + '</tbody></table>';
  }
```

- [ ] **Step 2: `node --check`.**

Run: `node --check static/js/ncd_trend.js`
Expected: exit 0.

---

## Task 5: Rewrite `render()` to assemble the new layout

**Files:**
- Modify: `static/js/ncd_trend.js` — replace the whole `render()` body (current lines ~75–96).

- [ ] **Step 1: Replace `render()`.** Zero-visit message → single-visit note (if applicable) → cards → chips → history. Exports (`init`, `transform`, `render`) stay identical.

```js
  function render(model) {
    if (!model.dates.length) {
      return '<div class="tr-empty">No measurements recorded yet. ' +
             'Save the initial NCD assessment to begin the trend.</div>';
    }

    var cardMetrics = HEADLINE.filter(function (m) { return nonNullCount(model.metrics[m.key]) >= 2; });
    var chipMetrics = HEADLINE.filter(function (m) { return nonNullCount(model.metrics[m.key]) < 2; });

    var single = (model.dates.length === 1)
      ? '<div class="tr-note">One visit recorded &mdash; a second visit is needed to draw a trend.</div>'
      : '';

    var cards = cardMetrics.length
      ? '<div class="tr-card-grid">' +
          cardMetrics.map(function (m) { return trendCard(m, model.metrics[m.key], model.dates); }).join('') +
        '</div>'
      : '';

    var chips = chipMetrics.length
      ? '<div class="tr-chip-row">' +
          chipMetrics.map(function (m) {
            var c = nonNullCount(model.metrics[m.key]);
            return '<span class="tr-chip">' + m.label + ' &mdash; ' +
                   (c === 1 ? 'one reading only' : 'not yet tracked') + '</span>';
          }).join('') +
        '</div>'
      : '';

    var history = '<div class="tr-hist-wrap">' + visitHistory(model) + '</div>';

    return single + cards + chips + history;
  }
```

- [ ] **Step 2: Confirm no orphaned code.** After the replace, grep the file and read `render()` + its neighbours end-to-end — no leftover `sparkline`, no dangling `trend-table` references, no code below any `return`.

Run: `grep -n "sparkline\|trend-table\|trend-metric\|trend-spark\|trend-gap" static/js/ncd_trend.js`
Expected: **no matches** (all old identifiers gone).

- [ ] **Step 3: `node --check`.**

Run: `node --check static/js/ncd_trend.js`
Expected: exit 0.

---

## Task 6: Form-local CSS in `ncd_trend.html`

**Files:**
- Modify: `templates/ncd_trend.html` — inside the existing `<style>` block. Remove the now-dead `.trend-table` / `.trend-metric` / `.trend-spark` / `.trend-gap` rules; rename `.trend-empty`/`.trend-note` to `.tr-empty`/`.tr-note`; add the new `tr-*` rules.

- [ ] **Step 1: Delete the dead table rules** (`.trend-table`, `.trend-table th/td`, `.trend-table thead th`, `.trend-table th:first-child`/`.trend-metric`, `.trend-spark`, `.trend-gap`) — the new markup uses none of them.

- [ ] **Step 2: Add the new block** (append inside `<style>`, before `</style>`). All colours are existing M3/theme tokens with fallbacks → works light + dark automatically.

```css
    /* ── Trend cards (form-local, M3 surface tokens) ── */
    .tr-card-grid {
      display:grid; grid-template-columns:repeat(auto-fill, minmax(230px, 1fr));
      gap:16px; margin-bottom:24px;
    }
    .tr-card {
      background:var(--m3-surface-container-low, var(--surface));
      border:1px solid var(--border); border-radius:var(--radius);
      padding:14px 16px; box-shadow:var(--m3-elev-1, none);
      display:flex; flex-direction:column; gap:4px;
    }
    .tr-card-label {
      font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:.04em;
      color:var(--text-muted); font-family:'IBM Plex Mono', monospace;
    }
    .tr-card-value { font-size:26px; font-weight:600; color:var(--text); line-height:1.1; }
    .tr-delta { font-size:12px; color:var(--text-muted); margin-bottom:2px; }
    .tr-card-chart { margin-top:2px; }

    /* ── Under-tracked metrics: quiet chip row ── */
    .tr-chip-row { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:24px; }
    .tr-chip {
      font-size:12px; color:var(--text-muted); background:var(--surface2);
      border:1px solid var(--border); border-radius:999px; padding:4px 12px;
    }

    /* ── Visit history (semantic table) ── */
    .tr-hist-wrap { overflow-x:auto; }
    .tr-hist { width:100%; border-collapse:collapse; font-size:13px; }
    .tr-hist .tr-hist-cap {
      text-align:left; font-size:11px; text-transform:uppercase; letter-spacing:.04em;
      color:var(--text-muted); font-family:'IBM Plex Mono', monospace; padding:0 0 8px;
    }
    .tr-hist th, .tr-hist td {
      padding:8px 12px; border-bottom:1px solid var(--border); text-align:center; white-space:nowrap;
    }
    .tr-hist thead th {
      background:var(--surface2); color:var(--text-muted); font-weight:600; font-size:11px;
      text-transform:uppercase; letter-spacing:.04em; font-family:'IBM Plex Mono', monospace;
    }
    .tr-hist th[scope="row"] { text-align:left; font-weight:500; color:var(--text); }
    .tr-miss { color:var(--text-faint); }
```

- [ ] **Step 3: Rename the empty/note rules** (keep the exact same declarations, just the selector names).

```css
    .tr-empty, .tr-note {
      padding:20px; color:var(--text-muted); font-size:13px; background:var(--surface);
      border:1px solid var(--border); border-radius:var(--radius);
    }
    .tr-note { margin-bottom:16px; }
```

---

## Task 7: Smoke test + commit

**Files:** none changed — verification only.

- [ ] **Step 1: Final syntax check.**

Run: `node --check static/js/ncd_trend.js`
Expected: exit 0.

- [ ] **Step 2: Hands-on smoke (Miruya).** Launch Flask, open an NCD episode with **2+ visits** and varied data at `/episodes/<id>/ncd-trend`. Confirm:
  - Metrics with 2+ readings show as cards (value + delta line with arrow **and** word + dated line chart).
  - Metrics with 0–1 readings appear only as quiet chips.
  - Visit-history table lists one row per visit, `—` for missing cells.
  - Toggle dark mode (the page reads `pt_dark`) — cards, chips, table all legible.
  - Open a **single-visit** episode → "One visit recorded…" note + all-chips + 1-row history, no chart attempts.
  - Open a **zero-visit** episode → "No measurements recorded yet…" only.

- [ ] **Step 3: Commit.**

```bash
git add static/js/ncd_trend.js templates/ncd_trend.html docs/superpowers/plans/2026-07-05-ncd-trend-render-redesign.md
git commit -m "feat(ncd-trend): data-driven trend cards, chip row, accessible visit history

Replace flat grid table render layer with per-metric trend cards (2+ readings),
a quiet chip row for under-tracked metrics, and a semantic per-visit history
table. Extract sparkline segment logic into chartGeometry(); direction now via
arrow+word (colour-independent). Screen-only; transform/init/fetch/HEADLINE and
all shared code untouched.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review (against the source prompt)

- **7 HEADLINE keys, 2+ qualifies for a card** → Task 3 + Task 5 (`nonNullCount >= 2`). ✓
- **Responsive grid, card count 0–7, no hardcoded hero** → Task 6 `auto-fill minmax`. ✓
- **Delta in words + arrow, vs previous non-null, "since <date>", never colour-only** → Task 2 `deltaLine()`. ✓
- **`<2` readings → quiet chip row, no chart attempt** → Task 5 `chipMetrics`. ✓
- **Visit history = real semantic `<table>` with `<th>`** → Task 4 `visitHistory()`. ✓
- **Preserve + restyle zero-visit and single-visit messages** → Task 5 (`tr-empty`, `tr-note`). ✓
- **Reuse gap-aware segment logic, don't re-derive** → Task 1 extracts `chartGeometry()` from `sparkline()`. ✓
- **Don't touch transform/init/fetch/HEADLINE/ncd_measure.js/episode.html/shared JS/style.css/PDF/MPIS** → File Structure boundaries; only `render()`+helpers and the `<style>` block change. ✓
- **Works in dark mode** → Task 6 uses theme tokens with fallbacks. ✓
- **No TDD; smoke check only** → Task 7. ✓

**Type/name consistency:** `chartGeometry`, `metricChart`, `shortDate`, `nonNullCount`, `lastTwo`, `unitOf`, `deltaLine`, `trendCard`, `visitHistory`, `render` — each defined once, called with matching signatures. Exports unchanged: `{ init, transform, render }`.
