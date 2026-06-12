// assessment_grid.js — fixed-row grid FACTORY (multi-instance).
// Each AssessmentGrid.create(config) returns an instance with closed-over state.
// Cell states: '' (blank) / 'NT' / 'N/A' / real value. Greyed cells = key ABSENT.
// Renders <table class="mov-table"> inside <div class="mov-table-wrap"> (styled in base.html).
// Does NOT modify mmt_table.js or any shared module. Build-new, ship-crude.

var AssessmentGrid = (function () {

  function create(config) {
    var containerId = config.containerId;
    var rows        = config.rows || [];
    var columns     = config.columns || [];
    var greyPairs   = config.greyout || [];

    // greyed lookup: "rowLabel colId" -> true
    var greySet = {};
    greyPairs.forEach(function (pair) { greySet[pair[0] + ' ' + pair[1]] = true; });
    function isGrey(rowLabel, colId) { return greySet[rowLabel + ' ' + colId] === true; }

    var colById = {};
    columns.forEach(function (c) { colById[c.id] = c; });

    // state[rowLabel][colId] = value ; greyed cells never added
    var state = {};
    function freshState() {
      state = {};
      rows.forEach(function (rowLabel) {
        state[rowLabel] = {};
        columns.forEach(function (c) {
          if (!isGrey(rowLabel, c.id)) state[rowLabel][c.id] = '';
        });
      });
    }
    freshState();

    function esc(s) { return String(s).replace(/"/g, '&quot;'); }

    function render() {
      var container = document.getElementById(containerId);
      if (!container) return;

      var head = '<thead><tr><th>&nbsp;</th>'
        + columns.map(function (c) { return '<th>' + c.label + '</th>'; }).join('')
        + '</tr></thead>';

      var body = '<tbody>' + rows.map(function (rowLabel) {
        var cells = columns.map(function (c) {
          if (isGrey(rowLabel, c.id)) {
            return '<td class="grid-greyed"></td>';
          }
          var val = state[rowLabel][c.id];
          if (c.type === 'text') {
            return '<td><input type="text" class="mov-cell-input" '
              + 'data-row="' + esc(rowLabel) + '" data-col="' + c.id + '" '
              + 'value="' + esc(val) + '"></td>';
          }
          // dropdown — optionLabels map is optional; if absent, displayed text = value (unchanged behaviour)
          var labels = c.optionLabels || {};
          var opts = '<option value="">&mdash;</option>'
            + (c.options || []).map(function (o) {
                var txt = Object.prototype.hasOwnProperty.call(labels, o) ? labels[o] : o;
                return '<option value="' + esc(o) + '"' + (val === o ? ' selected' : '') + '>' + esc(txt) + '</option>';
              }).join('');
          return '<td><select class="mov-cell-input" '
            + 'data-row="' + esc(rowLabel) + '" data-col="' + c.id + '">' + opts + '</select></td>';
        }).join('');
        return '<tr data-row="' + esc(rowLabel) + '"><td class="grid-row-label">' + rowLabel + '</td>' + cells + '</tr>';
      }).join('') + '</tbody>';

      container.innerHTML = '<div class="mov-table-wrap"><table class="mov-table">' + head + body + '</table></div>';

      container.querySelectorAll('select.mov-cell-input').forEach(function (el) {
        el.addEventListener('change', syncFromDOM);
      });
      container.querySelectorAll('input.mov-cell-input').forEach(function (el) {
        el.addEventListener('input', syncFromDOM);
      });
    }

    function syncFromDOM() {
      var container = document.getElementById(containerId);
      if (!container) return;
      container.querySelectorAll('[data-row][data-col]').forEach(function (el) {
        var r = el.getAttribute('data-row');
        var c = el.getAttribute('data-col');
        if (state[r] && Object.prototype.hasOwnProperty.call(state[r], c)) {
          state[r][c] = el.value;
        }
      });
    }

    function getData() {
      syncFromDOM();
      return rows.map(function (rowLabel) {
        var obj = { label: rowLabel };
        columns.forEach(function (c) {
          if (!isGrey(rowLabel, c.id)) obj[c.id] = state[rowLabel][c.id];
        });
        return obj;
      });
    }

    function loadData(data) {
      freshState();
      if (Array.isArray(data)) {
        data.forEach(function (row) {
          var label = row && row.label;
          if (label === undefined || !state[label]) return;
          columns.forEach(function (c) {
            if (isGrey(label, c.id)) return;
            if (Object.prototype.hasOwnProperty.call(row, c.id)) state[label][c.id] = row[c.id];
          });
        });
      }
      render();
    }

    function clear() { freshState(); render(); }

    function stampBlanks(value, opts) {
      opts = opts || {};
      syncFromDOM();
      rows.forEach(function (rowLabel) {
        columns.forEach(function (c) {
          if (isGrey(rowLabel, c.id)) return;                    // skip greyed (always)
          if (opts.dropdownsOnly && c.type !== 'dropdown') return;
          if (state[rowLabel][c.id] === '') state[rowLabel][c.id] = value;  // blanks only
        });
      });
      render();
    }

    render();
    return {
      getData: getData,
      loadData: loadData,
      clear: clear,
      stampBlanks: stampBlanks
    };
  }

  return { create: create };
})();

if (typeof window !== 'undefined') window.AssessmentGrid = AssessmentGrid;
