// inv_med_table.js — Investigation and Medication dynamic row tables

const InvMedTable = (function () {

  var INV_TYPES = ['CT scan','MRI','Angiogram','X-ray','Blood test','ECG','Other'];

  // ── Init ────────────────────────────────────────────────
  function init() {
    document.addEventListener('click', function (e) {
      if (e.target && e.target.id === 'inv-add-row') { e.preventDefault(); addInvRow(); }
      if (e.target && e.target.id === 'med-add-row') { e.preventDefault(); addMedRow(); }
    });
  }

  // ── Add rows ─────────────────────────────────────────────
  function _appendRow(tbodyId, html) {
    var tb = document.getElementById(tbodyId);
    if (!tb) return;
    var tr = document.createElement('tr');
    tr.innerHTML = html;
    tb.appendChild(tr);
  }

  function addInvRow(prefill) {
    var typeOpts = INV_TYPES.map(function (t) {
      return '<option value="' + t + '"' + (prefill && prefill[0] === t ? ' selected' : '') + '>' + t + '</option>';
    }).join('');
    _appendRow('investigation-tbody',
      '<td><select style="width:100%"><option value="">— Type —</option>' + typeOpts + '</select></td>'
      + '<td><input type="date" style="width:100%"' + (prefill && prefill[1] ? ' value="' + prefill[1] + '"' : '') + '></td>'
      + '<td><input type="text" placeholder="Key findings..." style="width:100%"'
        + (prefill && prefill[2] ? ' value="' + prefill[2].replace(/"/g,'&quot;') + '"' : '') + '></td>'
      + '<td><button class="btn-ghost btn-sm" onclick="this.closest(\'tr\').remove()">&#x2715;</button></td>'
    );
  }

  function addMedRow(prefill) {
    _appendRow('medication-tbody',
      '<td><input type="text" placeholder="Medication name..." style="width:100%"'
        + (prefill && prefill[0] ? ' value="' + prefill[0].replace(/"/g,'&quot;') + '"' : '') + '></td>'
      + '<td><input type="text" placeholder="Dose..." style="width:100%"'
        + (prefill && prefill[1] ? ' value="' + prefill[1].replace(/"/g,'&quot;') + '"' : '') + '></td>'
      + '<td><input type="text" placeholder="Frequency..." style="width:100%"'
        + (prefill && prefill[2] ? ' value="' + prefill[2].replace(/"/g,'&quot;') + '"' : '') + '></td>'
      + '<td><button class="btn-ghost btn-sm" onclick="this.closest(\'tr\').remove()">&#x2715;</button></td>'
    );
  }

  // ── Collect ──────────────────────────────────────────────
  function _collectTbody(tbodyId) {
    var rows = [];
    var tb   = document.getElementById(tbodyId);
    if (!tb) return rows;
    tb.querySelectorAll('tr').forEach(function (tr) {
      var cells = tr.querySelectorAll('input, select');
      var row   = [];
      cells.forEach(function (c) { row.push(c.value); });
      rows.push(row);
    });
    return rows;
  }

  function getData() {
    return {
      investigations: _collectTbody('investigation-tbody'),
      medications:    _collectTbody('medication-tbody')
    };
  }

  // ── Load / clear ─────────────────────────────────────────
  function loadData(data) {
    var invTb = document.getElementById('investigation-tbody');
    var medTb = document.getElementById('medication-tbody');
    if (invTb) invTb.innerHTML = '';
    if (medTb) medTb.innerHTML = '';
    if (data && data.investigations) data.investigations.forEach(function (r) { addInvRow(r); });
    if (data && data.medications)    data.medications.forEach(function (r)    { addMedRow(r); });
  }

  function clear() {
    loadData({ investigations: [], medications: [] });
  }

  return { init: init, addInvRow: addInvRow, addMedRow: addMedRow, getData: getData, loadData: loadData, clear: clear };

})();
