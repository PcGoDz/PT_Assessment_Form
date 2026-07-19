// form_vestibular.js — Vestibular assessment form logic.
// Battery chip pairs are hand-authored HTML rows (vestibular.html); this file supplies
// ONE generic set of handlers (pickBattery/getBatteryData/setBatteryData/stampBattery/
// toggleKiv) that drives every battery via data-item/data-val attributes — not a
// per-battery JS block. Positioning tests use VestibularScaffold (vestibular_scaffold.js).
// Chip helper (toggleChip/getChips/setChips) is a form-local copy of the NEURO/FACIAL
// pattern — promotion to FormBase is DEFERRED to BACKLOG, do not import FormBase's chip
// helpers here even if they exist elsewhere.

var VestibularForm = (function () {

  function gv(id)        { return FormBase.gv(id); }
  function sv(id, val)   { return FormBase.sv(id, val); }

  // ── Multi-select chips (form-local copy, mirrors form_facial.js:16-30) ──
  function toggleChip(el) { el.classList.toggle('active'); }
  function getChips(groupId) {
    var out = [];
    document.querySelectorAll('#' + groupId + ' .chip.active').forEach(function (c) { out.push(c.textContent.trim()); });
    return out;
  }
  function setChips(groupId, values) {
    if (!Array.isArray(values)) values = [];
    document.querySelectorAll('#' + groupId + ' .chip').forEach(function (c) {
      c.classList.toggle('active', values.indexOf(c.textContent.trim()) !== -1);
    });
  }

  // ── 2/3-way single-select chip (marital, smoking, side selectors, etc.) ──
  // groupId's chips carry data-val; class list gets sel-<Val> (spaces stripped for CSS safety).
  function cssVal(v) { return String(v).replace(/[^A-Za-z0-9]/g, ''); }
  function pick3(groupId, el) {
    var group = document.getElementById(groupId);
    if (!group) return;
    group.querySelectorAll('.irr-chip').forEach(function (c) {
      c.classList.remove('active');
      group.querySelectorAll('.irr-chip').forEach(function (d) { c.classList.remove('sel-' + cssVal(d.getAttribute('data-val'))); });
    });
    el.classList.add('active', 'sel-' + cssVal(el.getAttribute('data-val')));
  }
  function get3(groupId) {
    var el = document.querySelector('#' + groupId + ' .irr-chip.active');
    return el ? el.getAttribute('data-val') : '';
  }
  function set3(groupId, value) {
    var group = document.getElementById(groupId);
    if (!group) return;
    group.querySelectorAll('.irr-chip').forEach(function (c) {
      var on = c.getAttribute('data-val') === value;
      c.classList.toggle('active', on);
      c.classList.remove('sel-' + cssVal(c.getAttribute('data-val')));
      if (on) c.classList.add('sel-' + cssVal(value));
    });
  }

  // ── Battery chip pairs (D1/D2/D3) — generic across every battery container ──
  function pickBattery(el) {
    var row = el.closest('.vb-row');
    if (!row) return;
    row.querySelectorAll('.vb-chip').forEach(function (c) {
      c.classList.remove('active', 'sel-Yes', 'sel-No', 'sel-Pos', 'sel-Neg');
    });
    var val = el.getAttribute('data-val');
    var stateClass = (val === '+Ve') ? 'sel-Pos' : (val === '−Ve') ? 'sel-Neg' : ('sel-' + val);
    el.classList.add('active', stateClass);
  }
  function getBatteryData(containerId) {
    var out = {};
    document.querySelectorAll('#' + containerId + '-rows .vb-row').forEach(function (row) {
      var sel = row.querySelector('.vb-chip.active');
      if (sel) out[row.getAttribute('data-item')] = sel.getAttribute('data-val');
    });
    return out;
  }
  function setBatteryData(containerId, data) {
    data = data || {};
    document.querySelectorAll('#' + containerId + '-rows .vb-row').forEach(function (row) {
      var val = data[row.getAttribute('data-item')];
      row.querySelectorAll('.vb-chip').forEach(function (c) {
        c.classList.remove('active', 'sel-Yes', 'sel-No', 'sel-Pos', 'sel-Neg');
      });
      if (val) {
        var target = row.querySelector('.vb-chip[data-val="' + val + '"]');
        if (target) pickBattery(target);
      }
    });
  }
  function clearBatteryData(containerId) {
    document.querySelectorAll('#' + containerId + '-rows .vb-chip').forEach(function (c) {
      c.classList.remove('active', 'sel-Yes', 'sel-No', 'sel-Pos', 'sel-Neg');
    });
  }
  function stampBattery(containerId, baseline) {
    document.querySelectorAll('#' + containerId + '-rows .vb-row').forEach(function (row) {
      if (row.querySelector('.vb-chip.active')) return; // non-destructive — skip already-tapped
      var target = row.querySelector('.vb-chip[data-val="' + baseline + '"]');
      if (target) pickBattery(target);
    });
  }

  // ── KIV remark (D4) — section-level (per battery), overrides item list on collect ──
  // Lock/unlock is applied element-by-element (disabled attr + .vb-locked class) directly
  // on each control, not via a CSS ancestor/compound selector keyed off a class on the
  // battery wrapper — two earlier selector-based attempts silently disabled nothing.
  function lockBatteryControls(containerId, locked) {
    var battery = document.getElementById(containerId);
    if (!battery) return;
    var controls = [];
    var stamp = battery.querySelector('.vb-stamp');
    if (stamp) controls.push(stamp);
    var rows = document.getElementById(containerId + '-rows');
    if (rows) controls = controls.concat(Array.prototype.slice.call(rows.querySelectorAll('button, input, select, textarea')));
    controls.forEach(function (el) {
      el.classList.toggle('vb-locked', locked);
      if (locked) el.setAttribute('disabled', 'disabled');
      else el.removeAttribute('disabled');
    });
  }
  function toggleKiv(containerId) {
    var wrap = document.getElementById(containerId + '-kiv-wrap');
    var battery = document.getElementById(containerId);
    if (!wrap) return;
    wrap.classList.toggle('collapsed');
    var active = !wrap.classList.contains('collapsed');
    if (battery) battery.classList.toggle('vb-kiv-active', active);
    lockBatteryControls(containerId, active);
  }
  function onKivInput(containerId) {
    var battery = document.getElementById(containerId);
    var input   = document.getElementById(containerId + '-kiv');
    if (!battery || !input) return;
    var active = input.value.trim() !== '';
    battery.classList.toggle('vb-kiv-active', active);
    lockBatteryControls(containerId, active);
  }
  function getKiv(containerId) {
    var input = document.getElementById(containerId + '-kiv');
    return input ? input.value.trim() : '';
  }
  function setKiv(containerId, text) {
    var input = document.getElementById(containerId + '-kiv');
    var wrap  = document.getElementById(containerId + '-kiv-wrap');
    var battery = document.getElementById(containerId);
    if (input) input.value = text || '';
    var active = !!(text && text.trim());
    if (wrap) wrap.classList.toggle('collapsed', !active);
    if (battery) battery.classList.toggle('vb-kiv-active', active);
    lockBatteryControls(containerId, active);
  }

  // ── Battery collect/populate — reads KIV first (overrides item list per D4) ──
  function collectBattery(containerId) {
    var kiv = getKiv(containerId);
    if (kiv) return { kiv: kiv };
    var items = getBatteryData(containerId);
    return Object.keys(items).length ? { items: items } : null; // null = blank/untapped = N/A (D3)
  }
  function populateBattery(containerId, data) {
    data = data || {};
    setKiv(containerId, data.kiv || '');
    setBatteryData(containerId, data.items || {});
  }
  function resetBattery(containerId) {
    setKiv(containerId, '');
    clearBatteryData(containerId);
  }

  // ── Scaffold instances (positioning tests) ──
  var scaffolds = {};
  function initScaffolds() {
    scaffolds.rDixHallpike = VestibularScaffold.create('scaffold-r-dixhallpike', { label: 'R Dix Hallpike' });
    scaffolds.lDixHallpike = VestibularScaffold.create('scaffold-l-dixhallpike', { label: 'L Dix Hallpike' });
    scaffolds.rRoll        = VestibularScaffold.create('scaffold-r-roll',        { label: 'R Roll' });
    scaffolds.lRoll        = VestibularScaffold.create('scaffold-l-roll',        { label: 'L Roll' });
  }

  // ── Collect ──────────────────────────────────────────────────────────────
  function collect() {
    var d = {
      _form_type: 'VESTIBULAR',
      meta: { form: 'VESTIBULAR' },
      patient: FormBase.collectPatient(),

      referral: { dx: gv('vb-dx'), mgmt: gv('vb-mgmt') },
      history:  { current: gv('vb-hx-current'), past: gv('vb-hx-past'), problem: gv('vb-problem') },

      pmhx:             collectBattery('battery-pmhx'),
      recentSymptoms:   collectBattery('battery-recent-symptoms'),
      ix:               gv('vb-ix'),
      medication:       gv('vb-medication'),

      social: {
        occupation: gv('vb-occupation'),
        marital:    get3('vb-marital'),
        smoking:    get3('vb-smoking'),
        alcohol:    get3('vb-alcohol'),
        sleep:      get3('vb-sleep')
      },
      functionalStatus: collectBattery('battery-functional'),

      falls: { frequency: gv('vb-falls-freq'), injury: gv('vb-falls-injury') },

      vertigo: {
        spontaneous: get3('vb-vert-spont'),
        motion:      get3('vb-vert-motion'),
        position:    get3('vb-vert-position'),
        tempo:       get3('vb-vert-tempo'),
        spells:      get3('vb-vert-spells')
      },
      disequilibrium: {
        constant:  get3('vb-diseq-constant'),
        spontaneous: get3('vb-diseq-spont'),
        motion:    get3('vb-diseq-motion'),
        position:  get3('vb-diseq-position'),
        dark:      get3('vb-diseq-dark'),
        worseIn:   getChips('vb-diseq-worsein')
      },

      measures: { dhi: gv('vb-dhi'), abc: gv('vb-abc') },

      oculomotor: collectBattery('battery-oculomotor'),
      headThrustSide: get3('vb-headthrust-side'),

      positional: {
        rDixHallpike: scaffolds.rDixHallpike ? scaffolds.rDixHallpike.getData() : null,
        lDixHallpike: scaffolds.lDixHallpike ? scaffolds.lDixHallpike.getData() : null,
        rRoll:        scaffolds.rRoll        ? scaffolds.rRoll.getData()        : null,
        lRoll:        scaffolds.lRoll        ? scaffolds.lRoll.getData()        : null
      },

      rom: {
        neck: { range: gv('vb-rom-neck-range'), quality: gv('vb-rom-neck-quality'), pain: gv('vb-rom-neck-pain') },
        rUl:  { range: gv('vb-rom-rul-range'),  quality: gv('vb-rom-rul-quality'),  pain: gv('vb-rom-rul-pain') },
        lUl:  { range: gv('vb-rom-lul-range'),  quality: gv('vb-rom-lul-quality'),  pain: gv('vb-rom-lul-pain') },
        rLl:  { range: gv('vb-rom-rll-range'),  quality: gv('vb-rom-rll-quality'),  pain: gv('vb-rom-rll-pain') },
        lLl:  { range: gv('vb-rom-lll-range'),  quality: gv('vb-rom-lll-quality'),  pain: gv('vb-rom-lll-pain') }
      },
      strength: { ulR: gv('vb-str-ul-r'), ulL: gv('vb-str-ul-l'), llR: gv('vb-str-ll-r'), llL: gv('vb-str-ll-l') },

      somatosensory: {
        propUlR: { status: get3('vb-prop-ul-r'), note: gv('vb-prop-ul-r-note') },
        propUlL: { status: get3('vb-prop-ul-l'), note: gv('vb-prop-ul-l-note') },
        propLlR: { status: get3('vb-prop-ll-r'), note: gv('vb-prop-ll-r-note') },
        propLlL: { status: get3('vb-prop-ll-l'), note: gv('vb-prop-ll-l-note') }
      },
      coordination: {
        ftnR: { status: get3('vb-coord-ftn-r'), note: gv('vb-coord-ftn-r-note') },
        ftnL: { status: get3('vb-coord-ftn-l'), note: gv('vb-coord-ftn-l-note') },
        htsR: { status: get3('vb-coord-hts-r'), note: gv('vb-coord-hts-r-note') },
        htsL: { status: get3('vb-coord-hts-l'), note: gv('vb-coord-hts-l-note') }
      },

      postural: {
        rhomberg: { eo: gv('vb-post-rhomberg-eo'), ec: gv('vb-post-rhomberg-ec') },
        rSharpened: { eo: gv('vb-post-rsharp-eo'), ec: gv('vb-post-rsharp-ec') },
        lSharpened: { eo: gv('vb-post-lsharp-eo'), ec: gv('vb-post-lsharp-ec') },
        rSls: { eo: gv('vb-post-rsls-eo'), ec: gv('vb-post-rsls-ec') },
        lSls: { eo: gv('vb-post-lsls-eo'), ec: gv('vb-post-lsls-ec') },
        tug: gv('vb-tug')
      },
      ctsib: {
        eoFirm: gv('vb-ctsib-eo-firm'), ecFirm: gv('vb-ctsib-ec-firm'),
        eoFoam: gv('vb-ctsib-eo-foam'), ecFoam: gv('vb-ctsib-ec-foam')
      },

      gait: {
        velocity: gv('vb-gait-velocity'),
        deviation: get3('vb-gait-deviation'),
        deviationSide: get3('vb-gait-deviation-side'),
        device: get3('vb-gait-device'),
        dgi: gv('vb-gait-dgi')
      },
      clearance: gv('vb-clearance'),

      impression: gv('pt-impression'),
      stg: gv('stg'),
      ltg: gv('ltg'),
      plan: gv('plan')
    };
    return d;
  }

  // ── Populate ─────────────────────────────────────────────────────────────
  function populate(d) {
    if (!d) return;
    if (d.patient) FormBase.populatePatient(d.patient);

    var referral = d.referral || {};
    sv('vb-dx', referral.dx); sv('vb-mgmt', referral.mgmt);

    var history = d.history || {};
    sv('vb-hx-current', history.current); sv('vb-hx-past', history.past); sv('vb-problem', history.problem);

    populateBattery('battery-pmhx', d.pmhx);
    populateBattery('battery-recent-symptoms', d.recentSymptoms);
    sv('vb-ix', d.ix); sv('vb-medication', d.medication);

    var social = d.social || {};
    sv('vb-occupation', social.occupation);
    set3('vb-marital', social.marital); set3('vb-smoking', social.smoking);
    set3('vb-alcohol', social.alcohol); set3('vb-sleep', social.sleep);
    populateBattery('battery-functional', d.functionalStatus);

    var falls = d.falls || {};
    sv('vb-falls-freq', falls.frequency); sv('vb-falls-injury', falls.injury);

    var vertigo = d.vertigo || {};
    set3('vb-vert-spont', vertigo.spontaneous); set3('vb-vert-motion', vertigo.motion);
    set3('vb-vert-position', vertigo.position); set3('vb-vert-tempo', vertigo.tempo);
    set3('vb-vert-spells', vertigo.spells);

    var diseq = d.disequilibrium || {};
    set3('vb-diseq-constant', diseq.constant); set3('vb-diseq-spont', diseq.spontaneous);
    set3('vb-diseq-motion', diseq.motion); set3('vb-diseq-position', diseq.position);
    set3('vb-diseq-dark', diseq.dark); setChips('vb-diseq-worsein', diseq.worseIn);

    var measures = d.measures || {};
    sv('vb-dhi', measures.dhi); sv('vb-abc', measures.abc);

    populateBattery('battery-oculomotor', d.oculomotor);
    set3('vb-headthrust-side', d.headThrustSide);

    var pos = d.positional || {};
    if (scaffolds.rDixHallpike) scaffolds.rDixHallpike.setData(pos.rDixHallpike);
    if (scaffolds.lDixHallpike) scaffolds.lDixHallpike.setData(pos.lDixHallpike);
    if (scaffolds.rRoll)        scaffolds.rRoll.setData(pos.rRoll);
    if (scaffolds.lRoll)        scaffolds.lRoll.setData(pos.lRoll);

    var rom = d.rom || {};
    var romIdMap = { neck: 'neck', rUl: 'rul', lUl: 'lul', rLl: 'rll', lLl: 'lll' };
    Object.keys(romIdMap).forEach(function (k) {
      var r = rom[k] || {};
      var id = romIdMap[k];
      sv('vb-rom-' + id + '-range', r.range); sv('vb-rom-' + id + '-quality', r.quality); sv('vb-rom-' + id + '-pain', r.pain);
    });
    var strength = d.strength || {};
    sv('vb-str-ul-r', strength.ulR); sv('vb-str-ul-l', strength.ulL);
    sv('vb-str-ll-r', strength.llR); sv('vb-str-ll-l', strength.llL);

    var soma = d.somatosensory || {};
    set3('vb-prop-ul-r', (soma.propUlR||{}).status); sv('vb-prop-ul-r-note', (soma.propUlR||{}).note);
    set3('vb-prop-ul-l', (soma.propUlL||{}).status); sv('vb-prop-ul-l-note', (soma.propUlL||{}).note);
    set3('vb-prop-ll-r', (soma.propLlR||{}).status); sv('vb-prop-ll-r-note', (soma.propLlR||{}).note);
    set3('vb-prop-ll-l', (soma.propLlL||{}).status); sv('vb-prop-ll-l-note', (soma.propLlL||{}).note);

    var coord = d.coordination || {};
    set3('vb-coord-ftn-r', (coord.ftnR||{}).status); sv('vb-coord-ftn-r-note', (coord.ftnR||{}).note);
    set3('vb-coord-ftn-l', (coord.ftnL||{}).status); sv('vb-coord-ftn-l-note', (coord.ftnL||{}).note);
    set3('vb-coord-hts-r', (coord.htsR||{}).status); sv('vb-coord-hts-r-note', (coord.htsR||{}).note);
    set3('vb-coord-hts-l', (coord.htsL||{}).status); sv('vb-coord-hts-l-note', (coord.htsL||{}).note);

    var postural = d.postural || {};
    ['rhomberg','rSharpened','lSharpened','rSls','lSls'].forEach(function (k) {
      var v = postural[k] || {};
      var idMap = { rhomberg:'rhomberg', rSharpened:'rsharp', lSharpened:'lsharp', rSls:'rsls', lSls:'lsls' };
      var id = idMap[k];
      sv('vb-post-' + id + '-eo', v.eo); sv('vb-post-' + id + '-ec', v.ec);
    });
    sv('vb-tug', postural.tug);

    var ctsib = d.ctsib || {};
    sv('vb-ctsib-eo-firm', ctsib.eoFirm); sv('vb-ctsib-ec-firm', ctsib.ecFirm);
    sv('vb-ctsib-eo-foam', ctsib.eoFoam); sv('vb-ctsib-ec-foam', ctsib.ecFoam);

    var gait = d.gait || {};
    sv('vb-gait-velocity', gait.velocity); set3('vb-gait-deviation', gait.deviation);
    set3('vb-gait-deviation-side', gait.deviationSide); set3('vb-gait-device', gait.device);
    sv('vb-gait-dgi', gait.dgi);
    sv('vb-clearance', d.clearance);

    sv('pt-impression', d.impression); sv('stg', d.stg); sv('ltg', d.ltg); sv('plan', d.plan);
  }

  // ── Reset (snapshot-restore pattern, WORKFLOW) ──────────────────────────
  function reset(keepPatient) {
    var savedPt = keepPatient ? FormBase.collectPatient() : null;

    FormBase.resetPatient();
    ['vb-dx','vb-mgmt','vb-hx-current','vb-hx-past','vb-problem','vb-ix','vb-medication',
     'vb-occupation','vb-falls-freq','vb-falls-injury','vb-dhi','vb-abc',
     'vb-rom-neck-range','vb-rom-neck-quality','vb-rom-neck-pain',
     'vb-rom-rul-range','vb-rom-rul-quality','vb-rom-rul-pain',
     'vb-rom-lul-range','vb-rom-lul-quality','vb-rom-lul-pain',
     'vb-rom-rll-range','vb-rom-rll-quality','vb-rom-rll-pain',
     'vb-rom-lll-range','vb-rom-lll-quality','vb-rom-lll-pain',
     'vb-str-ul-r','vb-str-ul-l','vb-str-ll-r','vb-str-ll-l',
     'vb-prop-ul-r-note','vb-prop-ul-l-note','vb-prop-ll-r-note','vb-prop-ll-l-note',
     'vb-coord-ftn-r-note','vb-coord-ftn-l-note','vb-coord-hts-r-note','vb-coord-hts-l-note',
     'vb-post-rhomberg-eo','vb-post-rhomberg-ec','vb-post-rsharp-eo','vb-post-rsharp-ec',
     'vb-post-lsharp-eo','vb-post-lsharp-ec','vb-post-rsls-eo','vb-post-rsls-ec',
     'vb-post-lsls-eo','vb-post-lsls-ec','vb-tug',
     'vb-ctsib-eo-firm','vb-ctsib-ec-firm','vb-ctsib-eo-foam','vb-ctsib-ec-foam',
     'vb-gait-velocity','vb-gait-dgi','vb-clearance',
     'pt-impression','stg','ltg','plan'
    ].forEach(function (id) { sv(id, ''); });

    document.querySelectorAll('.irr-chip.active').forEach(function (c) {
      c.classList.remove('active');
    });
    set3('vb-headthrust-side', '');
    set3('vb-gait-deviation-side', '');
    document.querySelectorAll('#vb-diseq-worsein .chip.active').forEach(function (c) { c.classList.remove('active'); });

    resetBattery('battery-pmhx');
    resetBattery('battery-recent-symptoms');
    resetBattery('battery-functional');
    resetBattery('battery-oculomotor');

    Object.keys(scaffolds).forEach(function (k) { if (scaffolds[k]) scaffolds[k].reset(); });

    if (savedPt) FormBase.populatePatient(savedPt);
  }

  return {
    collect: collect,
    populate: populate,
    reset: reset,
    initScaffolds: initScaffolds,
    toggleChip: toggleChip,
    pick3: pick3,
    pickBattery: pickBattery,
    stampBattery: stampBattery,
    toggleKiv: toggleKiv,
    onKivInput: onKivInput,
    onPtTypeChange: function () { FormBase.onPtTypeChange(); },
    onNricInput:    function (v) { FormBase.onNricInput(v); },
    onDobChange:    function (v) { FormBase.onDobChange(v); }
  };
})();

window.ActiveForm = VestibularForm;
window.Form = {
  collect: VestibularForm.collect,
  populate: VestibularForm.populate,
  reset: VestibularForm.reset,
  onPtTypeChange: VestibularForm.onPtTypeChange,
  onNricInput: VestibularForm.onNricInput,
  onDobChange: VestibularForm.onDobChange
};
