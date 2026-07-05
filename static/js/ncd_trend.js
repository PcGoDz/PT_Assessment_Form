// ncd_trend.js — screen-only NCD trend view. NEVER touches PDF/MPIS (D1).
// TWO layers, deliberately decoupled (D10): transform (series -> per-metric arrays)
// is stable; render (trend cards + chip row + semantic visit-history table) is the
// UIX layer. Direction is carried by the delta line's arrow+word, never by colour.

var NcdTrend = (function () {

  // Headline metrics (D7). key = EXACT frozen battery key (form_ncd.js collect().measurements).
  // All seven CONFIRMED present verbatim — no null-trap.
  var HEADLINE = [
    { key: 'weight',      label: 'Weight (kg)' },
    { key: 'bmi',         label: 'BMI' },
    { key: 'waist',       label: 'Waist (cm)' },
    { key: 'whr',         label: 'Waist/Hip' },
    { key: 'visceralFat', label: 'Visceral Fat' },
    { key: 'walk6Hr',     label: '6-min walk HR' },
    { key: 'handGrip',    label: 'Hand grip (kg)' }
  ];

  // 'YYYY-MM-DD...' -> 'D Mon'. Manual parse (avoids new Date() UTC day-shift);
  // non-date strings pass through unchanged.
  function shortDate(s) {
    if (!s) return '';
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s));
    if (!m) return String(s);
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return parseInt(m[3], 10) + ' ' + months[parseInt(m[2], 10) - 1];
  }

  // ── TRANSFORM: note_date-ordered series -> { dates:[], metrics:{key:[values...]} } ──
  // rows arrive already ordered by note_date (get_ncd_measurements ORDER BY note_date).
  // Missing metric in a visit => null (a GAP, never 0 — clinically wrong to plot blank as 0).
  function transform(rows) {
    var dates = rows.map(function (r) { return r.note_date; });
    var metrics = {};
    HEADLINE.forEach(function (m) {
      metrics[m.key] = rows.map(function (r) {
        var v = (r.measurements || {})[m.key];
        if (v === null || v === undefined || v === '') return null;
        var n = parseFloat(v);
        return isNaN(n) ? null : n;
      });
    });
    return { dates: dates, metrics: metrics };
  }

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
      // Edge labels anchor inward so they don't bleed past the SVG edge and clip.
      var anchor = (i === 0) ? 'start' : (i === n - 1 ? 'end' : 'middle');
      return '<text x="' + xAt(i).toFixed(1) + '" y="' + (H - 3) + '" font-size="9" ' +
             'text-anchor="' + anchor + '" fill="var(--text-faint)" ' +
             'font-family="IBM Plex Mono, monospace">' + shortDate(dates[i]) + '</text>';
    }).join('');

    return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" style="max-width:' + W +
           'px" role="img" aria-hidden="true">' + line + dots + labels + '</svg>';
  }

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

  // "↓ 16 kg lower since 3 May". Arrow + word both carry direction (accessibility:
  // no colour dependence). Delta is vs the PREVIOUS non-null value, not the first.
  function deltaLine(values, dates, unit) {
    var t = lastTwo(values, dates);
    if (!t) return '';
    var diff  = t.latest.v - t.prev.v;
    var mag   = Math.round(Math.abs(diff) * 10) / 10;
    var arrow = diff < 0 ? '↓' : (diff > 0 ? '↑' : '→');
    var word  = diff < 0 ? 'lower' : (diff > 0 ? 'higher' : 'unchanged');
    var amt   = (diff === 0) ? ' unchanged'
                             : ' ' + mag + (unit ? ' ' + unit : '') + ' ' + word;
    return '<div class="tr-delta">' + arrow + amt + ' since ' + shortDate(t.prev.d) + '</div>';
  }

  function trendCard(m, values, dates) {
    var t = lastTwo(values, dates);            // guaranteed non-null: only called for 2+ metrics
    return '<div class="tr-card">' +
      '<div class="tr-card-label">' + m.label + '</div>' +
      '<div class="tr-card-value">' + t.latest.v + '</div>' +
      deltaLine(values, dates, unitOf(m.label)) +
      '<div class="tr-card-chart">' + metricChart(values, dates) + '</div>' +
    '</div>';
  }

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
      '<caption class="tr-hist-cap">Visit history</caption>' +
      '<thead>' + head + '</thead><tbody>' + rows + '</tbody></table>';
  }

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

  async function init() {
    try {
      var res  = await fetch('/api/episodes/' + EPISODE_ID + '/ncd-measurements');
      var rows = await res.json();
      var model = transform(rows || []);
      document.getElementById('trend-root').innerHTML = render(model);
    } catch (e) {
      document.getElementById('trend-root').innerHTML =
        '<div class="trend-empty">Could not load measurements.</div>';
    }
  }

  // transform exported so it stays unit-testable in isolation (D10).
  return { init: init, transform: transform, render: render };
})();
document.addEventListener('DOMContentLoaded', NcdTrend.init);
