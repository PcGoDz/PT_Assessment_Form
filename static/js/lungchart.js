// lungchart.js — Interactive lung auscultation diagram for CR form
// 6 zones matching pdf_cr.py: RU, RM, RL (right lung), LU, LL (left lung), BASE (bilateral)
// Anterior anatomical view: viewer's LEFT = patient's RIGHT lung

const LungChart = (function () {

  // ── Finding types — colours must match FINDING_COLORS in pdf_cr.py ──
  const FINDINGS = [
    { value: 'clear',   label: 'Clear',             color: '#2a8a4a' },
    { value: 'crep',    label: 'Crepitation',        color: '#c0392b' },
    { value: 'wheeze',  label: 'Wheeze',             color: '#c87a00' },
    { value: 'reduced', label: 'Reduced air entry',  color: '#4a7ac8' },
    { value: 'absent',  label: 'Absent',             color: '#7b5ea7' },
  ];

  // ── Zone definitions ─────────────────────────────────────────────
  // SVG viewBox: 0 0 220 200
  // Viewer's LEFT side = patient's RIGHT lung (RU/RM/RL)
  // Viewer's RIGHT side = patient's LEFT lung (LU/LL)
  // BASE = bilateral lower zone strip

  // All zones defined as SVG clipPath + hit polygon
  // We use path data matching the lung shape curves
  // For simplicity: zones are horizontal bands clipped to lung shape

  const VB_W = 220, VB_H = 200;
  const CX    = VB_W / 2;
  const PAD   = 8;      // mediastinum gap each side (px in viewBox)
  const LW_Z  = 80;     // lung width in viewBox px
  const BASE_Y = 160;   // lung base y
  const TOP_Y  = 30;    // lung apex y
  const LH     = BASE_Y - TOP_Y; // 130px

  // Zone vertical bands (y from top of SVG, note SVG y increases downward)
  // Right lung (viewer's left): RU top 38%, RM mid, RL bottom 38%, BASE bottom 22%
  const BASE_FRAC = 0.22;
  const R_MID_BOT = 0.40;  // fraction from TOP_Y down
  const R_MID_TOP = 0.62;
  const L_SPLIT   = 0.55;

  // Zone boundaries in SVG Y coords (y increases downward)
  // Right lung: RU occupies top 38%, RM middle 22%, RL lower 40% (above base strip)
  const R_MID_TOP_Y = TOP_Y + LH * 0.38;   // y where RU ends / RM starts  (~79)
  const R_MID_BOT_Y = TOP_Y + LH * 0.60;   // y where RM ends / RL starts  (~108)
  const R_BASE_Y    = TOP_Y + LH * (1 - BASE_FRAC);  // y where RL ends / base starts (~143)
  const L_SPL_Y     = TOP_Y + LH * 0.55;   // y where LU ends / LL starts  (~102)

  // Right lung x bounds (viewer's left)
  const R_XI = CX - PAD;          // inner edge (mediastinum side)
  const R_XO = R_XI - LW_Z;       // outer edge

  // Left lung x bounds (viewer's right)
  const L_XI = CX + PAD;
  const L_XO = L_XI + LW_Z;

  // Zone hit rectangles (for click detection, zones are simple bands)
  const ZONES = [
    { id: 'RU',   label: 'Right Upper',     x: R_XO, y: TOP_Y,       w: LW_Z,         h: R_MID_TOP_Y - TOP_Y,       side: 'R' },
    { id: 'RM',   label: 'Right Middle',    x: R_XO, y: R_MID_TOP_Y, w: LW_Z,         h: R_MID_BOT_Y - R_MID_TOP_Y, side: 'R' },
    { id: 'RL',   label: 'Right Lower',     x: R_XO, y: R_MID_BOT_Y, w: LW_Z,         h: R_BASE_Y - R_MID_BOT_Y,   side: 'R' },
    { id: 'LU',   label: 'Left Upper',      x: L_XI, y: TOP_Y,       w: LW_Z,         h: L_SPL_Y - TOP_Y,           side: 'L' },
    { id: 'LL',   label: 'Left Lower',      x: L_XI, y: L_SPL_Y,     w: LW_Z,         h: R_BASE_Y - L_SPL_Y,        side: 'L' },
    { id: 'BASE', label: 'Bilateral Bases', x: R_XO, y: R_BASE_Y,    w: L_XO - R_XO,  h: BASE_Y - R_BASE_Y,         side: 'B' },
  ];

  var findings   = {};
  var activeZone = null;
  var svgEl      = null;

  // ── Lung outline path (SVG path d string) ────────────────────────
  function lungPath(side) {
    // side 'R': right lung (viewer's LEFT), xi=inner(mediastinum), xo=outer
    // side 'L': left lung  (viewer's RIGHT), xi=inner(mediastinum), xo=outer
    var xi = side === 'R' ? R_XI : L_XI;
    var xo = side === 'R' ? R_XO : L_XO;
    // outward direction: R lung goes left (negative), L lung goes right (positive)
    var out = side === 'R' ? -1 : 1;

    // Key points
    var botInX = xi,                    botInY = BASE_Y;           // bottom inner
    var botOutX = xo,                   botOutY = BASE_Y + 2;      // bottom outer (slightly lower)
    var midOutX = xo + out * 4,         midOutY = TOP_Y + LH*0.5;  // widest point mid-height
    var apexX   = xi + out * LW_Z*0.4,  apexY   = TOP_Y;           // apex (toward outer, near top)
    var topInX  = xi,                   topInY  = TOP_Y + 14;      // top inner

    return [
      'M', botInX, botInY,
      // inner bottom → outer bottom (curved base)
      'C', botInX, botInY + 4,
           botOutX + out * (-6), botOutY,
           botOutX, botOutY,
      // outer bottom → mid outer (outward bulge)
      'C', botOutX, botOutY + LH*0.2,
           midOutX, midOutY - LH*0.1,
           midOutX, midOutY,
      // mid outer → apex (narrows toward top)
      'C', midOutX, midOutY + LH*0.15,
           apexX + out * 8, apexY - 6,
           apexX, apexY,
      // apex → top inner
      'C', apexX + out * (-4), apexY + 2,
           topInX, topInY + 6,
           topInX, topInY,
      // top inner → bottom inner (straight inner edge)
      'L', botInX, botInY,
      'Z'
    ].join(' ');
  }

  // ── Build SVG ─────────────────────────────────────────────────────
  function _buildSvg() {
    if (!svgEl) return;
    svgEl.innerHTML = '';
    var ns = 'http://www.w3.org/2000/svg';

    function el(tag, attrs, parent) {
      var e = document.createElementNS(ns, tag);
      Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
      if (parent) parent.appendChild(e);
      return e;
    }

    // Defs: clipPaths for each lung
    var defs = el('defs', {}, svgEl);
    el('clipPath', { id: 'clip-R' }, defs)
      .appendChild(el('path', { d: lungPath('R') }));
    el('clipPath', { id: 'clip-L' }, defs)
      .appendChild(el('path', { d: lungPath('L') }));
    // BASE clip = union of bottom of both lungs (simple rect clipped by both)
    var baseClipG = el('clipPath', { id: 'clip-BASE' }, defs);
    el('rect', { x: R_XO, y: R_BASE_Y, width: L_XO - R_XO, height: BASE_Y - R_BASE_Y + 5 }, baseClipG);

    // Draw each zone fill, clipped to lung shape
    ZONES.forEach(function (z) {
      var clipId = z.side === 'B' ? 'clip-BASE'
                 : z.side === 'R' ? 'clip-R' : 'clip-L';
      var g = el('g', { 'clip-path': 'url(#' + clipId + ')' }, svgEl);
      g.setAttribute('id', 'zg-' + z.id);
      var rect = el('rect', {
        x: z.x, y: z.y, width: z.w, height: z.h + 2,
        fill: '#dce8f5', 'fill-opacity': '1'
      }, g);
      rect.setAttribute('id', 'zr-' + z.id);
    });

    // Lung outlines on top (drawn after fills)
    ['R', 'L'].forEach(function (side) {
      var clipId = side === 'R' ? 'clip-R' : 'clip-L';
      // Background fill (transparent, outline only)
      el('path', {
        d: lungPath(side),
        fill: 'none',
        stroke: '#1a3a6b',
        'stroke-width': '1.2'
      }, svgEl);
    });

    // Fissure lines
    var fissures = [
      // Right lung: oblique fissure between RU/RM and RL
      { x1: R_XI - LW_Z*0.08, y1: R_MID_TOP_Y, x2: R_XI - LW_Z*0.65, y2: R_MID_BOT_Y },
      // Right lung: horizontal fissure between RU and RM
      { x1: R_XI - LW_Z*0.08, y1: R_MID_TOP_Y, x2: R_XI - LW_Z*0.55, y2: R_MID_TOP_Y },
      // Left lung: oblique fissure
      { x1: L_XI + LW_Z*0.08, y1: L_SPL_Y*0.5 + TOP_Y*0.5, x2: L_XI + LW_Z*0.55, y2: L_SPL_Y },
    ];
    fissures.forEach(function (f) {
      el('line', {
        x1: f.x1, y1: f.y1, x2: f.x2, y2: f.y2,
        stroke: '#7a9cc0', 'stroke-width': '0.8',
        'stroke-dasharray': '3 2'
      }, svgEl);
    });

    // Hit zones (transparent, clickable)
    ZONES.forEach(function (z) {
      var clipId = z.side === 'B' ? 'clip-BASE'
                 : z.side === 'R' ? 'clip-R' : 'clip-L';
      var hit = el('rect', {
        x: z.x, y: z.y, width: z.w, height: z.h,
        fill: 'transparent', cursor: 'pointer',
        'clip-path': 'url(#' + clipId + ')'
      }, svgEl);
      hit.style.transition = 'opacity 0.15s';
      hit.addEventListener('mouseenter', function () {
        var zr = document.getElementById('zr-' + z.id);
        if (zr) zr.style.filter = 'brightness(0.88)';
      });
      hit.addEventListener('mouseleave', function () {
        var zr = document.getElementById('zr-' + z.id);
        if (zr) zr.style.filter = '';
      });
      hit.addEventListener('click', function (e) {
        e.stopPropagation();
        activeZone = z.id;
        _openPicker(z);
      });
    });

    // Zone text labels
    var zoneLabelPositions = {
      RU:   { x: R_XI - LW_Z*0.5, y: TOP_Y + (R_MID_TOP_Y - TOP_Y)/2 },
      RM:   { x: R_XI - LW_Z*0.5, y: R_MID_TOP_Y + (R_MID_BOT_Y - R_MID_TOP_Y)/2 },
      RL:   { x: R_XI - LW_Z*0.5, y: R_MID_BOT_Y + (R_BASE_Y - R_MID_BOT_Y)/2 },
      LU:   { x: L_XI + LW_Z*0.5, y: TOP_Y + (L_SPL_Y - TOP_Y)/2 },
      LL:   { x: L_XI + LW_Z*0.5, y: L_SPL_Y + (R_BASE_Y - L_SPL_Y)/2 },
      BASE: { x: CX,              y: R_BASE_Y + (BASE_Y - R_BASE_Y)/2 },
    };
    ZONES.forEach(function (z) {
      var pos = zoneLabelPositions[z.id];
      var lbl = el('text', {
        id: 'ztxt-' + z.id,
        x: pos.x, y: pos.y,
        'text-anchor': 'middle', 'dominant-baseline': 'middle',
        'font-size': '9', 'font-family': 'sans-serif',
        fill: '#1a3a6b', 'pointer-events': 'none'
      }, svgEl);
      lbl.textContent = z.id;

      // Finding label (shown when marked)
      var flbl = el('text', {
        id: 'ftxt-' + z.id,
        x: pos.x, y: pos.y + 10,
        'text-anchor': 'middle', 'dominant-baseline': 'middle',
        'font-size': '7.5', 'font-family': 'sans-serif', 'font-weight': 'bold',
        fill: 'white', 'pointer-events': 'none'
      }, svgEl);
      flbl.textContent = '';
    });

    // Trachea
    el('line', {
      x1: CX, y1: TOP_Y - 8, x2: CX, y2: TOP_Y,
      stroke: '#1a3a6b', 'stroke-width': '1.5'
    }, svgEl);

    // L / R labels
    // R / L labels — radiological convention
    // Patient's RIGHT lung (3 lobes, RU/RM/RL) = viewer's LEFT → label R
    // Patient's LEFT lung (2 lobes, LU/LL) = viewer's RIGHT → label L
    el('text', { x: R_XI - LW_Z*0.5, y: BASE_Y + 10,
      'text-anchor': 'middle', 'font-size': '9', 'font-weight': 'bold',
      'font-family': 'sans-serif', fill: '#888' }, svgEl).textContent = 'R';
    el('text', { x: L_XI + LW_Z*0.5, y: BASE_Y + 10,
      'text-anchor': 'middle', 'font-size': '9', 'font-weight': 'bold',
      'font-family': 'sans-serif', fill: '#888' }, svgEl).textContent = 'L';
    el('text', { x: CX, y: BASE_Y + 18,
      'text-anchor': 'middle', 'font-size': '7',
      'font-family': 'sans-serif', fill: '#aaa' }, svgEl).textContent = '(radiological view — click to mark)';

    _renderZones();
  }

  // ── Render zone colours ───────────────────────────────────────────
  function _renderZones() {
    ZONES.forEach(function (z) {
      var zr   = document.getElementById('zr-'   + z.id);
      var ztxt = document.getElementById('ztxt-' + z.id);
      var ftxt = document.getElementById('ftxt-' + z.id);
      if (!zr) return;

      var fv = findings[z.id];
      var fd = fv ? FINDINGS.find(function (f) { return f.value === fv; }) : null;

      if (fd) {
        zr.setAttribute('fill', fd.color);
        if (ztxt) { ztxt.setAttribute('fill', 'rgba(255,255,255,0.85)'); ztxt.setAttribute('font-size', '7'); }
        if (ftxt) { ftxt.textContent = fd.label; }
      } else {
        zr.setAttribute('fill', '#dce8f5');
        if (ztxt) { ztxt.setAttribute('fill', '#1a3a6b'); ztxt.setAttribute('font-size', '9'); }
        if (ftxt) { ftxt.textContent = ''; }
      }
    });
  }

  // ── Picker ────────────────────────────────────────────────────────
  function _openPicker(zone) {
    var backdrop = document.getElementById('lung-picker-backdrop');
    var title    = document.getElementById('lung-picker-title');
    if (!backdrop) return;
    if (title) title.textContent = zone.label;

    // Highlight current selection
    var cur = findings[zone.id];
    document.querySelectorAll('#lung-finding-sel [data-finding]').forEach(function (btn) {
      btn.style.outline = (cur && btn.dataset.finding === cur) ? '2px solid var(--accent)' : 'none';
    });

    backdrop.style.display = 'flex';
  }

  function _closePicker() {
    var b = document.getElementById('lung-picker-backdrop');
    if (b) b.style.display = 'none';
    activeZone = null;
  }

  // ── Findings list sidebar ─────────────────────────────────────────
  function _updateList() {
    var list    = document.getElementById('lung-finding-list');
    var emptyEl = document.getElementById('lung-empty-hint');
    if (!list) return;

    list.querySelectorAll('.lc-item').forEach(function (el) { el.remove(); });
    var keys = Object.keys(findings).filter(function (k) { return findings[k]; });
    if (emptyEl) emptyEl.style.display = keys.length ? 'none' : '';

    keys.forEach(function (zid) {
      var zone = ZONES.find(function (z) { return z.id === zid; });
      var fd   = FINDINGS.find(function (f) { return f.value === findings[zid]; });
      if (!zone || !fd) return;

      var item = document.createElement('div');
      item.className = 'lc-item';
      item.style.cssText = 'display:flex;align-items:center;gap:8px;padding:5px 0;font-size:12px;border-bottom:1px solid var(--border-faint)';

      var dot = document.createElement('span');
      dot.style.cssText = 'width:10px;height:10px;border-radius:50%;flex-shrink:0;background:' + fd.color;
      item.appendChild(dot);

      var lbl = document.createElement('span');
      lbl.style.flex = '1';
      lbl.textContent = zone.label + ' — ' + fd.label;
      item.appendChild(lbl);

      var del = document.createElement('button');
      del.textContent = '×';
      del.style.cssText = 'background:none;border:none;cursor:pointer;color:var(--text-faint);font-size:15px;padding:0 3px;line-height:1';
      del.addEventListener('click', function () {
        delete findings[zid];
        _renderZones();
        _updateList();
      });
      item.appendChild(del);
      list.appendChild(item);
    });
  }

  // ── Init ─────────────────────────────────────────────────────────
  function init() {
    svgEl = document.getElementById('lung-svg');
    if (!svgEl) return;

    _buildSvg();

    // Finding picker buttons
    var selEl = document.getElementById('lung-finding-sel');
    if (selEl) {
      selEl.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-finding]');
        if (!btn || !activeZone) return;
        findings[activeZone] = btn.dataset.finding;
        _renderZones();
        _updateList();
        _closePicker();
      });
    }

    // Clear zone button
    var clearBtn = document.getElementById('lung-clear-zone');
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        if (activeZone) {
          delete findings[activeZone];
          _renderZones();
          _updateList();
        }
        _closePicker();
      });
    }

    // Backdrop click to close
    var backdrop = document.getElementById('lung-picker-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', function (e) {
        if (e.target === backdrop) _closePicker();
      });
    }
  }

  // ── Public API ────────────────────────────────────────────────────
  function getData()      { return JSON.parse(JSON.stringify(findings)); }
  function loadData(data) { findings = data || {}; _renderZones(); _updateList(); }
  function clearAll()     { findings = {}; _renderZones(); _updateList(); }

  return { init: init, getData: getData, loadData: loadData, clearAll: clearAll };

})();
