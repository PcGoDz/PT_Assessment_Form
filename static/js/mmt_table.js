// mmt_table.js — reusable bilateral MMT table (muscle | R | L)

const MmtTable = (function () {

  var _containerId = 'mmt-tbody';
  var _muscles     = [];
  var _rows        = [];
  var _rowCounter  = 0;

  var GRADES = ['0','1','2','2+','3','3+','4','4+','5'];

  // ── Init ────────────────────────────────────────────────
  function init(config) {
    _containerId = (config && config.containerId) || 'mmt-tbody';
    _muscles     = (config && config.muscles)     || [];
    _rows        = [];
    _rowCounter  = 0;
    document.addEventListener('click', function (e) {
      if (e.target && e.target.id === 'mmt-add-row') {
        e.preventDefault();
        addRow();
      }
    });
    renderTable();
  }

  // ── Add / delete rows ────────────────────────────────────
  function addRow(prefill) {
    var id = _rowCounter++;
    _rows.push({
      id:     id,
      muscle: (prefill && prefill.muscle) || '',
      gradeR: (prefill && prefill.gradeR) || '',
      gradeL: (prefill && prefill.gradeL) || ''
    });
    renderTable();
  }

  function deleteRow(id) {
    _rows = _rows.filter(function (r) { return r.id !== id; });
    renderTable();
  }

  // ── Render ───────────────────────────────────────────────
  function renderTable() {
    var tbody = document.getElementById(_containerId);
    if (!tbody) return;

    if (!_rows.length) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-faint);'
        + 'font-style:italic;padding:12px;font-size:12px;">No muscles recorded — click Add Row</td></tr>';
      return;
    }

    tbody.innerHTML = _rows.map(function (r) {
      var muscleOpts = '<option value="">— Select —</option>'
        + _muscles.map(function (m) {
            return '<option value="' + m + '"' + (r.muscle === m ? ' selected' : '') + '>' + m + '</option>';
          }).join('');
      var gradeOptsR = '<option value="">—</option>'
        + GRADES.map(function (g) {
            return '<option value="' + g + '"' + (r.gradeR === g ? ' selected' : '') + '>' + g + '</option>';
          }).join('');
      var gradeOptsL = '<option value="">—</option>'
        + GRADES.map(function (g) {
            return '<option value="' + g + '"' + (r.gradeL === g ? ' selected' : '') + '>' + g + '</option>';
          }).join('');
      return '<tr data-rid="' + r.id + '">'
        + '<td style="min-width:160px"><select class="mmt-cell-input" data-field="muscle" data-rid="' + r.id + '" style="width:100%">'
          + muscleOpts + '</select></td>'
        + '<td><select class="mmt-cell-input" data-field="gradeR" data-rid="' + r.id + '" style="width:100%">'
          + gradeOptsR + '</select></td>'
        + '<td><select class="mmt-cell-input" data-field="gradeL" data-rid="' + r.id + '" style="width:100%">'
          + gradeOptsL + '</select></td>'
        + '<td><button class="mov-del-btn" onclick="MmtTable.deleteRow(' + r.id + ')">&#x2715;</button></td>'
        + '</tr>';
    }).join('');

    tbody.querySelectorAll('select').forEach(function (el) {
      el.addEventListener('change', function () { syncFromDOM(); });
    });
  }

  // ── Sync DOM → rows array ────────────────────────────────
  function syncFromDOM() {
    var tbody = document.getElementById(_containerId);
    if (!tbody) return;
    tbody.querySelectorAll('[data-rid][data-field]').forEach(function (el) {
      var rid   = parseInt(el.dataset.rid);
      var field = el.dataset.field;
      var row   = _rows.find(function (r) { return r.id === rid; });
      if (row && field) row[field] = el.value;
    });
  }

  // ── Public data API ──────────────────────────────────────
  function getData() {
    syncFromDOM();
    return _rows
      .filter(function (r) { return r.muscle || r.gradeR || r.gradeL; })
      .map(function (r) {
        return { muscle: r.muscle, gradeR: r.gradeR, gradeL: r.gradeL };
      });
  }

  function loadData(data) {
    _rows       = [];
    _rowCounter = 0;
    if (!data || !data.length) { renderTable(); return; }
    data.forEach(function (r) { addRow(r); });
  }

  function clear() {
    _rows       = [];
    _rowCounter = 0;
    renderTable();
  }

  return { init: init, addRow: addRow, deleteRow: deleteRow, getData: getData, loadData: loadData, clear: clear };

})();
