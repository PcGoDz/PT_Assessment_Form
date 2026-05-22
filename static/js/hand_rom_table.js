// hand_rom_table.js — dynamic ROM table for Hand Assessment form
// Follows movement_table.js IIFE pattern.
// ROM cells store start/end angle pairs (e.g. 0°–20°) per KKM borang convention.

const HandRomTable = (function () {
  'use strict';

  var ROM_MOVEMENTS = {
    'Elbow':     ['Flexion', 'Extension'],
    'Forearm':   ['Pronation', 'Supination'],
    'Wrist':     ['Flexion', 'Extension', 'Radial Deviation', 'Ulnar Deviation'],
    'Thumb':     ['CMC Flexion', 'CMC Extension', 'CMC Abduction', 'CMC Adduction',
                  'MCP Flexion', 'MCP Extension', 'IP Flexion', 'IP Extension',
                  'Opposition to Index', 'Opposition to Middle', 'Opposition to Ring', 'Opposition to Little'],
    'Index':     ['MCP Flexion', 'MCP Extension', 'PIP Flexion', 'PIP Extension', 'DIP Flexion', 'DIP Extension'],
    'Middle':    ['MCP Flexion', 'MCP Extension', 'PIP Flexion', 'PIP Extension', 'DIP Flexion', 'DIP Extension'],
    'Ring':      ['MCP Flexion', 'MCP Extension', 'PIP Flexion', 'PIP Extension', 'DIP Flexion', 'DIP Extension'],
    'Little':    ['MCP Flexion', 'MCP Extension', 'PIP Flexion', 'PIP Extension', 'DIP Flexion', 'DIP Extension'],
    'Composite': ['TAM (Total Active Motion)', 'TPM (Total Passive Motion)']
  };

  var CATEGORIES = Object.keys(ROM_MOVEMENTS);

  var _rows = [];
  var _rowCounter = 0;
  var _tbodyId = 'rom-tbody';

  function init(addBtnId, tbodyId) {
    _tbodyId = tbodyId || 'rom-tbody';
    _render();
    document.addEventListener('click', function (e) {
      if (e.target && e.target.id === (addBtnId || 'hand-rom-add-row')) {
        e.preventDefault();
        addRow();
      }
    });
  }

  function addRow(prefill) {
    var id = _rowCounter++;
    _rows.push({
      id:               id,
      category:         (prefill && prefill.category)         || '',
      movement:         (prefill && prefill.movement)         || '',
      active_l_start:   (prefill && prefill.active_l_start)   || '',
      active_l_end:     (prefill && prefill.active_l_end)     || '',
      active_r_start:   (prefill && prefill.active_r_start)   || '',
      active_r_end:     (prefill && prefill.active_r_end)     || '',
      passive_l_start:  (prefill && prefill.passive_l_start)  || '',
      passive_l_end:    (prefill && prefill.passive_l_end)    || '',
      passive_r_start:  (prefill && prefill.passive_r_start)  || '',
      passive_r_end:    (prefill && prefill.passive_r_end)    || '',
      op_l_start:       (prefill && prefill.op_l_start)       || '',
      op_l_end:         (prefill && prefill.op_l_end)         || '',
      op_r_start:       (prefill && prefill.op_r_start)       || '',
      op_r_end:         (prefill && prefill.op_r_end)         || ''
    });
    _render();
  }

  function deleteRow(id) {
    _rows = _rows.filter(function (r) { return r.id !== id; });
    _render();
  }

  function _pairInputs(field_start, field_end, rid, val_start, val_end) {
    function inp(field, val) {
      return '<input type="number" class="mov-cell-input" data-field="' + field + '" data-rid="' + rid +
        '" value="' + (val || '') + '" min="0" max="360" placeholder="\xb0" style="width:44px;text-align:center">';
    }
    return '<span style="display:inline-flex;align-items:center;gap:2px">' +
      inp(field_start, val_start) +
      '<span style="font-size:10px;color:var(--text-faint)">–</span>' +
      inp(field_end, val_end) +
      '</span>';
  }

  function _render() {
    var tbody = document.getElementById(_tbodyId);
    if (!tbody) return;

    if (!_rows.length) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--text-faint);font-style:italic;padding:16px;font-size:12px;">No movements recorded — click + Add Row</td></tr>';
      return;
    }

    tbody.innerHTML = _rows.map(function (r) {
      var catOptions = '<option value="">— Category —</option>' +
        CATEGORIES.map(function (c) {
          return '<option value="' + c + '"' + (r.category === c ? ' selected' : '') + '>' + c + '</option>';
        }).join('');

      var movements = r.category ? (ROM_MOVEMENTS[r.category] || []) : [];
      var movOptions = '<option value="">— Movement —</option>' +
        movements.map(function (m) {
          return '<option value="' + m + '"' + (r.movement === m ? ' selected' : '') + '>' + m + '</option>';
        }).join('');

      return '<tr data-rid="' + r.id + '">' +
        '<td><select class="mov-cell-input" data-field="category" data-rid="' + r.id + '">' + catOptions + '</select></td>' +
        '<td><select class="mov-cell-input" data-field="movement" data-rid="' + r.id + '">' + movOptions + '</select></td>' +
        '<td>' + _pairInputs('active_l_start',  'active_l_end',  r.id, r.active_l_start,  r.active_l_end)  + '</td>' +
        '<td>' + _pairInputs('active_r_start',  'active_r_end',  r.id, r.active_r_start,  r.active_r_end)  + '</td>' +
        '<td>' + _pairInputs('passive_l_start', 'passive_l_end', r.id, r.passive_l_start, r.passive_l_end) + '</td>' +
        '<td>' + _pairInputs('passive_r_start', 'passive_r_end', r.id, r.passive_r_start, r.passive_r_end) + '</td>' +
        '<td>' + _pairInputs('op_l_start',      'op_l_end',      r.id, r.op_l_start,      r.op_l_end)      + '</td>' +
        '<td>' + _pairInputs('op_r_start',      'op_r_end',      r.id, r.op_r_start,      r.op_r_end)      + '</td>' +
        '<td><button class="mov-del-btn" onclick="HandRomTable.deleteRow(' + r.id + ')">✕</button></td>' +
        '</tr>';
    }).join('');

    // Wire category → movement cascade
    tbody.querySelectorAll('[data-field="category"]').forEach(function (sel) {
      sel.addEventListener('change', function () {
        var rid = parseInt(sel.dataset.rid);
        var row = _rows.find(function (r) { return r.id === rid; });
        if (row) { row.category = sel.value; row.movement = ''; }
        _render();
      });
    });

    // Wire all non-category inputs to sync
    tbody.querySelectorAll('[data-field]:not([data-field="category"])').forEach(function (el) {
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
      if (row && field && field !== 'category') row[field] = el.value;
    });
  }

  function collect() {
    _syncFromDOM();
    return _rows
      .filter(function (r) { return r.category !== ''; })
      .map(function (r) {
        return {
          category:        r.category,
          movement:        r.movement,
          active_l_start:  r.active_l_start,
          active_l_end:    r.active_l_end,
          active_r_start:  r.active_r_start,
          active_r_end:    r.active_r_end,
          passive_l_start: r.passive_l_start,
          passive_l_end:   r.passive_l_end,
          passive_r_start: r.passive_r_start,
          passive_r_end:   r.passive_r_end,
          op_l_start:      r.op_l_start,
          op_l_end:        r.op_l_end,
          op_r_start:      r.op_r_start,
          op_r_end:        r.op_r_end
        };
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
