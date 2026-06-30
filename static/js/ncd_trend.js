// ncd_trend.js — screen-only NCD trend view. NEVER touches PDF/MPIS (D1).
// TWO layers, deliberately decoupled (D10): transform (series -> per-metric arrays)
// is stable; render (table + sparkline HTML) is the bit a future UIX pass rewrites.

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

  // ── RENDER: sparkline as inline SVG, with true gap-breaks (no bridge-to-zero) ──
  // Nulls split the line into separate polyline segments; an isolated point (a single
  // reading flanked by gaps) is drawn as a dot so it stays visible.
  function sparkline(values) {
    var present = values.filter(function (v) { return v !== null; });
    if (present.length < 2) return '<span style="color:var(--text-faint)">&mdash;</span>';

    var min = Math.min.apply(null, present), max = Math.max.apply(null, present);
    var span = (max - min) || 1;
    var W = 80, H = 24, n = values.length;

    function x(i) { return (n === 1) ? 0 : (i / (n - 1)) * W; }
    function y(v) { return H - ((v - min) / span) * H; }

    // Build contiguous non-null segments, preserving global index for x-spacing.
    var segments = [], cur = [];
    values.forEach(function (v, i) {
      if (v === null) { if (cur.length) { segments.push(cur); cur = []; } return; }
      cur.push({ x: x(i), y: y(v) });
    });
    if (cur.length) segments.push(cur);

    // Improving (down for weight/bmi/waist) vs gaining-capacity (up for fitness).
    var color = (present[present.length - 1] <= present[0])
      ? 'var(--success, #2a8a4a)' : 'var(--accent, #4a7ac8)';

    var parts = segments.map(function (seg) {
      if (seg.length === 1) {
        return '<circle cx="' + seg[0].x.toFixed(1) + '" cy="' + seg[0].y.toFixed(1) +
               '" r="1.8" fill="' + color + '"/>';
      }
      var pts = seg.map(function (p) { return p.x.toFixed(1) + ',' + p.y.toFixed(1); }).join(' ');
      return '<polyline points="' + pts + '" fill="none" stroke="' + color + '" stroke-width="1.5"/>';
    }).join('');

    return '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H +
           '">' + parts + '</svg>';
  }

  function render(model) {
    if (!model.dates.length) {
      return '<div class="trend-empty">No measurements recorded yet. ' +
             'Save the initial NCD assessment to begin the trend.</div>';
    }
    var single = (model.dates.length === 1)
      ? '<div class="trend-note">One visit recorded — the sparkline needs a second visit to draw a trend.</div>'
      : '';
    var head = '<tr><th>Metric</th>' +
      model.dates.map(function (d) { return '<th>' + d + '</th>'; }).join('') +
      '<th>Trend</th></tr>';
    var body = HEADLINE.map(function (m) {
      var vals  = model.metrics[m.key];
      var cells = vals.map(function (v) {
        return '<td>' + (v === null ? '<span class="trend-gap">&mdash;</span>' : v) + '</td>';
      }).join('');
      return '<tr><td class="trend-metric">' + m.label + '</td>' + cells +
             '<td class="trend-spark">' + sparkline(vals) + '</td></tr>';
    }).join('');
    return single +
      '<table class="trend-table"><thead>' + head + '</thead><tbody>' + body + '</tbody></table>';
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
