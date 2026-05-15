var HandChart = (function () {
  'use strict';

  var COLORS = {
    pain:     '#e53935',
    numb:     '#1e88e5',
    tingling: '#8e24aa',
    weak:     '#fb8c00',
    swelling: '#00897b',
    scar:     '#6d4c41'
  };
  var LABELS = {
    pain:     'Pain',
    numb:     'Numbness',
    tingling: 'Tingling',
    weak:     'Weakness',
    swelling: 'Swelling',
    scar:     'Scar'
  };

  var markers = [];
  var nextId  = 1;

  function init() {
    var selEl = document.getElementById('hctype-sel');
    var svgR  = document.getElementById('hand-svg-r');
    var svgL  = document.getElementById('hand-svg-l');
    if (!selEl || !svgR || !svgL) return;

    svgR.addEventListener('click', function (e) { placeMarker(svgR, 'R', e); });
    svgL.addEventListener('click', function (e) { placeMarker(svgL, 'L', e); });
  }

  function placeMarker(svg, hand, e) {
    var selEl = document.getElementById('hctype-sel');
    var type  = selEl ? selEl.value : 'pain';
    var rect  = svg.getBoundingClientRect();
    var x     = ((e.clientX - rect.left) / rect.width)  * 100;
    var y     = ((e.clientY - rect.top)  / rect.height) * 100;
    var id    = 'hm' + (nextId++);

    var marker = { id: id, hand: hand, type: type, x: x, y: y };
    markers.push(marker);
    renderMarker(svg, marker);
    renderList();
  }

  function renderMarker(svg, m) {
    var group = svg.getElementById ? svg.getElementById('markers-' + m.hand.toLowerCase())
                                   : null;
    if (!group) {
      group = document.getElementById('markers-' + m.hand.toLowerCase());
    }
    if (!group) return;

    var circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('id', m.id);
    circle.setAttribute('cx', m.x + '%');
    circle.setAttribute('cy', m.y + '%');
    circle.setAttribute('r', '4%');
    circle.setAttribute('fill', COLORS[m.type] || '#e53935');
    circle.setAttribute('fill-opacity', '0.75');
    circle.setAttribute('stroke', '#fff');
    circle.setAttribute('stroke-width', '1');
    circle.style.cursor = 'pointer';
    circle.title = LABELS[m.type] || m.type;
    circle.addEventListener('click', function (e) {
      e.stopPropagation();
      removeMarker(m.id);
    });
    group.appendChild(circle);
  }

  function removeMarker(id) {
    markers = markers.filter(function (m) { return m.id !== id; });
    var el = document.getElementById(id);
    if (el) el.parentNode.removeChild(el);
    renderList();
  }

  function renderList() {
    var list = document.getElementById('hand-marker-list');
    if (!list) return;
    if (markers.length === 0) {
      list.innerHTML = '<span style="color:var(--text-muted);font-size:.85rem;">No markers placed.</span>';
      return;
    }
    list.innerHTML = markers.map(function (m) {
      return '<span class="chip active" style="background:' + (COLORS[m.type] || '#e53935') +
             ';color:#fff;margin:2px;">' +
             m.hand + ' — ' + (LABELS[m.type] || m.type) +
             ' <span onclick="HandChart.remove(\'' + m.id + '\')" style="cursor:pointer;margin-left:4px;">×</span></span>';
    }).join('');
  }

  function getData() {
    return markers.map(function (m) {
      return { id: m.id, hand: m.hand, type: m.type, x: m.x, y: m.y };
    });
  }

  function loadData(arr) {
    clearAll();
    if (!Array.isArray(arr)) return;
    arr.forEach(function (m) {
      var svgId = 'hand-svg-' + m.hand.toLowerCase();
      var svg   = document.getElementById(svgId);
      if (!svg) return;
      var marker = { id: m.id || ('hm' + (nextId++)), hand: m.hand, type: m.type, x: m.x, y: m.y };
      markers.push(marker);
      renderMarker(svg, marker);
    });
    renderList();
  }

  function clearAll() {
    ['r', 'l'].forEach(function (h) {
      var g = document.getElementById('markers-' + h);
      if (g) g.innerHTML = '';
    });
    markers = [];
    nextId  = 1;
    renderList();
  }

  return {
    init:     init,
    getData:  getData,
    loadData: loadData,
    clearAll: clearAll,
    remove:   removeMarker
  };
}());
