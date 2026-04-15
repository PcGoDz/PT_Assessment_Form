// bodychart.js — interactive body chart marker logic

const BodyChart = (function () {

  const COLORS = {
    ache:   '#4a7ac8',
    sharp:  '#c0392b',
    numb:   '#7b5ea7',
    burn:   '#c87a00',
    refer:  '#2a8a4a',
    tender: '#b84a8a'
  };

  const LABELS = {
    ache:   'Ache',
    sharp:  'Sharp',
    numb:   'Numbness',
    burn:   'Burning',
    refer:  'Referred',
    tender: 'Tenderness'
  };

  let activeType = 'ache';
  let markers    = [];
  let counter    = 1;

  // ── Init ──────────────────────────────────────
  function init() {
    // Pain type chip selection
    document.getElementById('ptype-sel').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-ptype]');
      if (!btn) return;
      document.querySelectorAll('#ptype-sel .pt-chip').forEach(function (c) {
        c.classList.remove('active');
      });
      btn.classList.add('active');
      activeType = btn.dataset.ptype;
    });

    // SVG click listeners
    document.getElementById('svg-ant').addEventListener('click', function (e) {
      placeMarker(this, 'ant', e);
    });
    document.getElementById('svg-post').addEventListener('click', function (e) {
      placeMarker(this, 'post', e);
    });
  }

  // ── Coordinate helpers ────────────────────────
  function getSvgPoint(svg, e) {
    var rect = svg.getBoundingClientRect();
    var vb   = svg.viewBox.baseVal;
    return {
      x: (e.clientX - rect.left) * (vb.width  / rect.width),
      y: (e.clientY - rect.top)  * (vb.height / rect.height)
    };
  }

  function getZone(svg, x, y) {
    var hits = svg.querySelectorAll('.hit');
    var zone = 'Body';
    for (var i = hits.length - 1; i >= 0; i--) {
      var h  = hits[i];
      var hx = parseFloat(h.getAttribute('x'));
      var hy = parseFloat(h.getAttribute('y'));
      var hw = parseFloat(h.getAttribute('width'));
      var hh = parseFloat(h.getAttribute('height'));
      if (x >= hx && x <= hx + hw && y >= hy && y <= hy + hh) {
        zone = h.dataset.zone;
        break;
      }
    }
    return zone;
  }

  // ── Place a marker on the SVG ─────────────────
  function placeMarker(svg, view, e) {
    var pt    = getSvgPoint(svg, e);
    var zone  = getZone(svg, pt.x, pt.y);
    var id    = counter++;
    var color = COLORS[activeType];
    var ns    = 'http://www.w3.org/2000/svg';

    var g = document.createElementNS(ns, 'g');

    var circle = document.createElementNS(ns, 'circle');
    circle.setAttribute('cx', pt.x);
    circle.setAttribute('cy', pt.y);
    circle.setAttribute('r', '7');
    circle.setAttribute('fill', color);
    circle.setAttribute('fill-opacity', '0.88');
    circle.setAttribute('stroke', 'white');
    circle.setAttribute('stroke-width', '1.5');

    var label = document.createElementNS(ns, 'text');
    label.setAttribute('x', pt.x);
    label.setAttribute('y', pt.y + 4);
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('font-size', '7');
    label.setAttribute('font-weight', '700');
    label.setAttribute('fill', 'white');
    label.setAttribute('font-family', 'sans-serif');
    label.textContent = id;

    g.appendChild(circle);
    g.appendChild(label);
    svg.querySelector('#markers-' + view).appendChild(g);

    markers.push({
      id:   id,
      zone: zone,
      type: activeType,
      view: view,
      x:    Math.round(pt.x),
      y:    Math.round(pt.y),
      el:   g
    });

    renderList();
  }

  // ── Render marker list ────────────────────────
  function renderList() {
    var list = document.getElementById('marker-list');
    var hint = document.getElementById('empty-hint');
    list.innerHTML = '';

    if (!markers.length) {
      hint.style.display = '';
      list.appendChild(hint);
      return;
    }

    hint.style.display = 'none';
    markers.forEach(function (m) {
      var div = document.createElement('div');
      div.className = 'marker-item';
      div.innerHTML =
        '<div class="mdot" style="background:' + COLORS[m.type] + '"></div>' +
        '<span class="mnum">#' + m.id + '</span>' +
        '<span class="mzone">' + m.zone + '</span>' +
        '<span class="mtype">' + LABELS[m.type] + '</span>' +
        '<button class="mdel" onclick="BodyChart.remove(' + m.id + ')">&#x2715;</button>';
      list.appendChild(div);
    });
  }

  // ── Public API ────────────────────────────────
  function remove(id) {
    var i = markers.findIndex(function (m) { return m.id === id; });
    if (i < 0) return;
    markers[i].el.remove();
    markers.splice(i, 1);
    renderList();
  }

  function clearAll() {
    markers.forEach(function (m) { m.el.remove(); });
    markers = [];
    renderList();
  }

  function getData() {
    return markers.map(function (m) {
      return { id: m.id, zone: m.zone, type: m.type, view: m.view, x: m.x, y: m.y };
    });
  }

  function loadData(data) {
    if (!data || !data.length) return;
    data.forEach(function (m) {
      var svgId = 'svg-' + m.view;
      var svg   = document.getElementById(svgId);
      if (!svg) return;

      var color = COLORS[m.type] || '#888';
      var ns    = 'http://www.w3.org/2000/svg';
      var g     = document.createElementNS(ns, 'g');

      var circle = document.createElementNS(ns, 'circle');
      circle.setAttribute('cx', m.x); circle.setAttribute('cy', m.y); circle.setAttribute('r', '7');
      circle.setAttribute('fill', color); circle.setAttribute('fill-opacity', '0.88');
      circle.setAttribute('stroke', 'white'); circle.setAttribute('stroke-width', '1.5');

      var label = document.createElementNS(ns, 'text');
      label.setAttribute('x', m.x); label.setAttribute('y', m.y + 4);
      label.setAttribute('text-anchor', 'middle'); label.setAttribute('font-size', '7');
      label.setAttribute('font-weight', '700'); label.setAttribute('fill', 'white');
      label.setAttribute('font-family', 'sans-serif');
      label.textContent = m.id;

      g.appendChild(circle); g.appendChild(label);
      svg.querySelector('#markers-' + m.view).appendChild(g);

      markers.push({ id: m.id, zone: m.zone, type: m.type, view: m.view, x: m.x, y: m.y, el: g });
      if (m.id >= counter) counter = m.id + 1;
    });
    renderList();
  }

  return { init: init, remove: remove, clearAll: clearAll, getData: getData, loadData: loadData };

})();
