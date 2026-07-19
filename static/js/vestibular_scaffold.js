// vestibular_scaffold.js — Positioning-test scaffold chip (D5 of the VESTIBULAR design spec).
// +Ve unfolds click-to-fill nystagmus detail; −Ve stays collapsed. Config-driven, one
// instance per positioning-test row. Form-local, NOT a shared factory — promotion is a
// BACKLOG item if it proves out in clinic (do not generalize further in this build).

var VestibularScaffold = (function () {

  var DIRECTIONS = ['Upbeat', 'Downbeat', 'Torsional', 'Horizontal', 'Geotropic', 'Ageotropic'];

  function create(containerId, config) {
    var el = document.getElementById(containerId);
    if (!el) return null;
    var state = { result: '' }; // '' = untapped, 'pos', 'neg'

    function render() {
      var dirBtns = DIRECTIONS.map(function (d) {
        return '<button type="button" class="irr-chip vsc-dir" data-val="' + d + '">' + d + '</button>';
      }).join('');

      el.innerHTML =
        '<div class="vsc-row">' +
          '<span class="vsc-label">' + config.label + '</span>' +
          '<div class="vsc-chips">' +
            '<button type="button" class="irr-chip vsc-chip" data-val="pos">+Ve</button>' +
            '<button type="button" class="irr-chip vsc-chip" data-val="neg">&minus;Ve</button>' +
          '</div>' +
        '</div>' +
        '<div class="vsc-detail collapsed" id="' + containerId + '-detail">' +
          '<div class="vsc-directions">' + dirBtns + '</div>' +
          '<div class="fg c3">' +
            '<div class="field"><label>Latency (s)</label><input type="number" id="' + containerId + '-latency" min="0" step="0.1"></div>' +
            '<div class="field"><label>Duration (s)</label><input type="number" id="' + containerId + '-duration" min="0" step="0.1"></div>' +
            '<div class="field"><label>Intensity (0&ndash;10)</label><input type="number" id="' + containerId + '-intensity" min="0" max="10"></div>' +
          '</div>' +
          '<div class="field"><label>Symptoms</label><input type="text" id="' + containerId + '-symptoms" placeholder="e.g. vertigo, nausea"></div>' +
        '</div>';

      el.querySelectorAll('.vsc-chip').forEach(function (c) {
        c.addEventListener('click', function () { pickResult(c.getAttribute('data-val')); });
      });
      el.querySelectorAll('.vsc-dir').forEach(function (c) {
        c.addEventListener('click', function () {
          c.classList.toggle('active');
          c.classList.toggle('sel-dir');
        });
      });
    }

    function pickResult(val) {
      state.result = val;
      el.querySelectorAll('.vsc-chip').forEach(function (c) {
        var v = c.getAttribute('data-val');
        c.classList.toggle('sel-pos', v === 'pos' && val === 'pos');
        c.classList.toggle('sel-neg', v === 'neg' && val === 'neg');
      });
      var detail = document.getElementById(containerId + '-detail');
      if (detail) detail.classList.toggle('collapsed', val !== 'pos');
    }

    function getData() {
      if (state.result === 'neg') return { result: 'neg' };
      if (state.result !== 'pos') return null; // untapped — caller must omit the key entirely
      var dirs = [];
      el.querySelectorAll('.vsc-dir.active').forEach(function (c) { dirs.push(c.getAttribute('data-val')); });
      return {
        result: 'pos',
        direction: dirs,
        latency: document.getElementById(containerId + '-latency').value,
        duration: document.getElementById(containerId + '-duration').value,
        intensity: document.getElementById(containerId + '-intensity').value,
        note: document.getElementById(containerId + '-symptoms').value
      };
    }

    function setData(data) {
      reset();
      if (!data || !data.result) return;
      pickResult(data.result);
      if (data.result === 'pos') {
        el.querySelectorAll('.vsc-dir').forEach(function (c) {
          var on = (data.direction || []).indexOf(c.getAttribute('data-val')) !== -1;
          c.classList.toggle('active', on);
          c.classList.toggle('sel-dir', on);
        });
        document.getElementById(containerId + '-latency').value   = data.latency   || '';
        document.getElementById(containerId + '-duration').value  = data.duration  || '';
        document.getElementById(containerId + '-intensity').value = data.intensity || '';
        document.getElementById(containerId + '-symptoms').value  = data.note      || '';
      }
    }

    function reset() {
      state.result = '';
      el.querySelectorAll('.vsc-chip').forEach(function (c) { c.classList.remove('sel-pos', 'sel-neg'); });
      el.querySelectorAll('.vsc-dir').forEach(function (c) { c.classList.remove('active', 'sel-dir'); });
      var detail = document.getElementById(containerId + '-detail');
      if (detail) detail.classList.add('collapsed');
      ['latency', 'duration', 'intensity', 'symptoms'].forEach(function (f) {
        var input = document.getElementById(containerId + '-' + f);
        if (input) input.value = '';
      });
    }

    render();
    return { getData: getData, setData: setData, reset: reset };
  }

  return { create: create };
})();
