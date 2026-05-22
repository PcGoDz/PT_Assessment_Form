// hand_circ_table.js — dynamic circumference table for Hand Assessment form

const HandCircTable = (function () {
  'use strict';

  var LOCATIONS = [
    'Index PIP', 'Index DIP', 'Middle PIP', 'Middle DIP',
    'Ring PIP',  'Ring DIP',  'Little PIP', 'Little DIP',
    'Thumb', 'Palmar Crease', 'Wrist'
  ];

  var _rows = [];
  var _rowCounter = 0;
  var _tbodyId = 'circ-tbody';

  function init(addBtnId, tbodyId) {
    _tbodyId = tbodyId || 'circ-tbody';
    _render();
    document.addEventListener('click', function (e) {
      if (e.target && e.target.id === (addBtnId || 'hand-circ-add-row')) {
        e.preventDefault();
        addRow();
      }
    });
  }

  function addRow(prefill) {
    var id = _rowCounter++;
    _rows.push({
      id:       id,
      location: (prefill && prefill.location) || '',
      left_cm:  (prefill && prefill.left_cm)  || '',
      right_cm: (prefill && prefill.right_cm) || ''
    });
    _render();
  }

  function deleteRow(id) {
    _rows = _rows.filter(function (r) { return r.id !== id; });
    _render();
  }

  function _render() {
    var tbody = document.getElementById(_tbodyId);
    if (!tbody) return;

    if (!_rows.length) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-faint);font-style:italic;padding:16px;font-size:12px;">No measurements — click + Add Row</td></tr>';
      return;
    }

    tbody.innerHTML = _rows.map(function (r) {
      var locOptions = '<option value="">— Location —</option>' +
        LOCATIONS.map(function (l) {
          return '<option value="' + l + '"' + (r.location === l ? ' selected' : '') + '>' + l + '</option>';
        }).join('');

      function cmInput(field, val) {
        return '<input type="number" class="mov-cell-input" data-field="' + field + '" data-rid="' + r.id +
          '" value="' + (val || '') + '" min="0" step="0.1" placeholder="0.0" style="width:80px;text-align:center">';
      }

      return '<tr data-rid="' + r.id + '">' +
        '<td><select class="mov-cell-input" data-field="location" data-rid="' + r.id + '">' + locOptions + '</select></td>' +
        '<td>' + cmInput('left_cm',  r.left_cm)  + '</td>' +
        '<td>' + cmInput('right_cm', r.right_cm) + '</td>' +
        '<td><button class="mov-del-btn" onclick="HandCircTable.deleteRow(' + r.id + ')">✕</button></td>' +
        '</tr>';
    }).join('');

    tbody.querySelectorAll('[data-rid][data-field]').forEach(function (el) {
      el.addEventListener('change', function () { _syncFromDOM(); });
      el.addEventListener('input',  function () { _syncFromDOM(); });
    });
  }

  function _syncFromDOM() {
    var tbody = document.getElementById(_tbodyId);
    if (!tbody) return;
    tbody.querySelectorAll('[data-rid][data-field]').forEach(function (el) {
      var rid   = parseInt(el.dataset.rid);
      var field = el.dataset.field;
      var row   = _rows.find(function (r) { return r.id === rid; });
      if (row && field) row[field] = el.value;
    });
  }

  function collect() {
    _syncFromDOM();
    return _rows
      .filter(function (r) { return r.location !== ''; })
      .map(function (r) {
        return { location: r.location, left_cm: r.left_cm, right_cm: r.right_cm };
      });
  }

  function populate(arr) {
    _rows = [];
    _rowCounter = 0;
    if (!Array.isArray(arr) || !arr.length) { _render(); return; }
    arr.forEach(function (r) { addRow(r); });
  }

  function reset() {
    _rows = [];
    _rowCounter = 0;
    _render();
  }

  return {
    init:      init,
    addRow:    addRow,
    deleteRow: deleteRow,
    collect:   collect,
    populate:  populate,
    reset:     reset
  };

}());
