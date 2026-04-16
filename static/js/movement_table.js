// movement_table.js — dynamic movement assessment table

const MovementTable = (function () {

  const JOINTS = [
    'Shoulder joint', 'Glenohumeral joint', 'Acromioclavicular joint',
    'Elbow joint', 'Radioulnar joint', 'Wrist joint (radiocarpal)',
    'Carpometacarpal joint', 'Metacarpophalangeal joint', 'Interphalangeal joint',
    'Hip joint', 'Knee joint', 'Ankle joint (talocrural)',
    'Subtalar joint', 'Metatarsophalangeal joint',
    'Temporomandibular joint', 'Other (specify)'
  ];

  const PLANES = [
    'Flexion', 'Extension', 'Abduction', 'Adduction',
    'Internal rotation', 'External rotation',
    'Lateral flexion (L)', 'Lateral flexion (R)',
    'Pronation', 'Supination', 'Inversion', 'Eversion',
    'Opposition', 'All planes', 'Other (specify)'
  ];

  const SIDES = ['Right (affected)', 'Left (affected)', 'Right (unaffected)', 'Left (unaffected)', 'Bilateral'];

  let rows = [];
  let rowCounter = 0;

  // ── Init ──────────────────────────────────────
  function init() {
    // Use event delegation on document for robustness
    document.addEventListener('click', function(e) {
      if (e.target && e.target.id === 'mov-add-row') {
        e.preventDefault();
        addRow();
      }
    });
    renderTable();
  }

  // ── Add a row ─────────────────────────────────
  function addRow(prefill) {
    var id = rowCounter++;
    rows.push({
      id:       id,
      joint:    (prefill && prefill.joint)    || '',
      side:     (prefill && prefill.side)     || '',
      plane:    (prefill && prefill.plane)    || '',
      activeRom:(prefill && prefill.activeRom)|| '',
      activePain:(prefill && prefill.activePain)|| '',
      passiveRom:(prefill && prefill.passiveRom)|| '',
      passivePain:(prefill && prefill.passivePain)|| '',
      resisted: (prefill && prefill.resisted) || ''
    });
    renderTable();
  }

  // ── Delete a row ──────────────────────────────
  function deleteRow(id) {
    rows = rows.filter(function (r) { return r.id !== id; });
    renderTable();
  }

  // ── Render the table ──────────────────────────
  function renderTable() {
    var tbody = document.getElementById('mov-tbody');
    if (!tbody) return; // not on page yet

    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--text-faint);font-style:italic;padding:16px;font-size:12px;">No movements recorded — click Add Row</td></tr>';
      return;
    }

    tbody.innerHTML = rows.map(function (r) {
      return '<tr data-rid="' + r.id + '">'
        + '<td>' + makeSelect('joint', r.id, JOINTS, r.joint) + '</td>'
        + '<td>' + makeSelect('side', r.id, SIDES, r.side) + '</td>'
        + '<td>' + makeSelect('plane', r.id, PLANES, r.plane) + '</td>'
        + '<td>' + makeInput('activeRom', r.id, r.activeRom, '0-°') + '</td>'
        + '<td>' + makeInput('activePain', r.id, r.activePain, 'Nil / end range...') + '</td>'
        + '<td>' + makeInput('passiveRom', r.id, r.passiveRom, '0-°') + '</td>'
        + '<td>' + makeInput('passivePain', r.id, r.passivePain, 'Nil / end range...') + '</td>'
        + '<td>' + makeInput('resisted', r.id, r.resisted, '5/5') + '</td>'
        + '<td><button class="mov-del-btn" onclick="MovementTable.deleteRow(' + r.id + ')">&#x2715;</button></td>'
        + '</tr>';
    }).join('');

    // Attach change listeners
    tbody.querySelectorAll('select, input').forEach(function (el) {
      el.addEventListener('change', function () { syncFromDOM(); });
      el.addEventListener('input',  function () { syncFromDOM(); });
    });
  }

  function makeSelect(field, id, options, val) {
    return '<select class="mov-cell-input" data-field="' + field + '" data-rid="' + id + '">'
      + '<option value="">—</option>'
      + options.map(function (o) {
          return '<option value="' + o + '"' + (val === o ? ' selected' : '') + '>' + o + '</option>';
        }).join('')
      + '</select>';
  }

  function makeInput(field, id, val, placeholder) {
    return '<input type="text" class="mov-cell-input" data-field="' + field + '" data-rid="' + id + '" value="' + (val || '').replace(/"/g, '&quot;') + '" placeholder="' + placeholder + '">';
  }

  // ── Sync DOM → rows array ─────────────────────
  function syncFromDOM() {
    var tbody = document.getElementById('mov-tbody');
    if (!tbody) return;
    tbody.querySelectorAll('[data-rid]').forEach(function (el) {
      var rid   = parseInt(el.dataset.rid);
      var field = el.dataset.field;
      var row   = rows.find(function (r) { return r.id === rid; });
      if (row && field) row[field] = el.value;
    });
  }

  // ── Get data for save ─────────────────────────
  function getData() {
    syncFromDOM();
    return rows.map(function (r) {
      return {
        joint:      r.joint,
        side:       r.side,
        plane:      r.plane,
        activeRom:  r.activeRom,
        activePain: r.activePain,
        passiveRom: r.passiveRom,
        passivePain:r.passivePain,
        resisted:   r.resisted
      };
    });
  }

  // ── Load data ─────────────────────────────────
  function loadData(data) {
    rows = [];
    rowCounter = 0;
    if (!data || !data.length) { renderTable(); return; }
    data.forEach(function (r) { addRow(r); });
  }

  // ── Clear ─────────────────────────────────────
  function clear() {
    rows = [];
    rowCounter = 0;
    renderTable();
  }

  return {
    init:      init,
    addRow:    addRow,
    deleteRow: deleteRow,
    getData:   getData,
    loadData:  loadData,
    clear:     clear
  };

})();
