// form.js — collect form data into object, populate form from object

const Form = (function () {

  // ── Helpers ───────────────────────────────────
  function gv(id) {
    var el = document.getElementById(id);
    return el ? el.value : '';
  }

  function sv(id, val) {
    var el = document.getElementById(id);
    if (el) el.value = val || '';
  }

  function radio(name) {
    var el = document.querySelector('[name=' + name + ']:checked');
    return el ? el.value : '';
  }

  function setRadio(name, val) {
    if (!val) return;
    var el = document.querySelector('[name=' + name + '][value="' + val + '"]');
    if (el) el.checked = true;
  }

  // ── Patient type toggle ───────────────────────
  function onPtTypeChange() {
    var local = radio('pt-type') === 'local';
    document.getElementById('nric-field').style.display    = local ? '' : 'none';
    document.getElementById('passport-field').style.display= local ? 'none' : '';
    document.getElementById('country-field').style.display = local ? 'none' : '';
    document.getElementById('sex-field').style.display     = local ? 'none' : '';
    if (!local) {
      document.getElementById('derived-dob').classList.add('hidden');
      document.getElementById('derived-gender').classList.add('hidden');
    }
  }

  // ── NRIC auto-derive ──────────────────────────
  function onNricInput(val) {
    var c  = val.replace(/\D/g, '');
    var db = document.getElementById('derived-dob');
    var dg = document.getElementById('derived-gender');
    if (c.length < 12) { db.classList.add('hidden'); dg.classList.add('hidden'); return; }

    var yy = c.substring(0, 2), mm = c.substring(2, 4), dd = c.substring(4, 6);
    var thisYY = new Date().getFullYear() % 100;
    var yr  = parseInt(yy) <= thisYY ? '20' + yy : '19' + yy;
    var dobStr = yr + '-' + mm + '-' + dd;

    sv('pt-dob', dobStr);

    var today = new Date(), dob = new Date(dobStr);
    var age   = today.getFullYear() - dob.getFullYear();
    if (today.getMonth() < dob.getMonth() ||
        (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate())) age--;
    sv('pt-age', age);

    db.textContent = 'DOB: ' + dd + '/' + mm + '/' + yr;
    db.classList.remove('hidden');

    var last   = parseInt(c.charAt(11));
    var gender = last % 2 === 1 ? 'Male' : 'Female';
    dg.textContent = 'Gender: ' + gender;
    dg.classList.remove('hidden');

    setRadio('pt-sex', gender === 'Male' ? 'M' : 'F');
    Main.updateProgress();
  }

  // ── Dr management dropdown ────────────────────
  function onMgmtChange() {
    var v = gv('dr-mgmt');
    document.getElementById('surgery-row').className = 'surgery-row' + (v === 'Surgical' ? ' show' : '');
  }

  // ── Pain score ────────────────────────────────
  function setPain(id, v) {
    var n  = parseInt(v);
    var el = document.getElementById('pv-' + id);
    el.textContent = n;
    el.className   = 'pain-val ' + (n <= 3 ? 'pv-low' : n <= 6 ? 'pv-mid' : 'pv-high');
  }

  // ── Irritability ──────────────────────────────
  function pickIrr(val) {
    document.querySelectorAll('.irr-chip').forEach(function (c) { c.className = 'irr-chip'; });
    document.getElementById('irr-' + val).classList.add('sel-' + val);
  }

  function getIrr() {
    if (document.querySelector('.irr-chip.sel-High'))   return 'High';
    if (document.querySelector('.irr-chip.sel-Medium')) return 'Medium';
    if (document.querySelector('.irr-chip.sel-Low'))    return 'Low';
    return '';
  }

  // ── Collect all data ──────────────────────────
  function collect(currentId) {
    return {
      id:   currentId,
      meta: { form: 'MS', ref: 'fisio/b.pen.14/Pind.1/2019', saved: new Date().toISOString() },
      patient: {
        type:     radio('pt-type') || 'local',
        name:     gv('pt-name'),
        nric:     gv('pt-nric'),
        passport: gv('pt-passport'),
        country:  gv('pt-country'),
        dob:      gv('pt-dob'),
        date:     gv('pt-date'),
        age:      gv('pt-age'),
        sex:      radio('pt-sex')
      },
      diagnosis:  gv('pt-diagnosis'),
      management: { type: gv('dr-mgmt'), surgeryDate: gv('surgery-date') },
      problem:    gv('pt-problem'),
      pain: {
        pre:         gv('pain-pre'),
        post:        gv('pain-post'),
        nature:      gv('pain-nature'),
        behaviour24: gv('pain-24hr'),
        agg:         gv('pain-agg'),
        ease:        gv('pain-ease'),
        irritability:getIrr()
      },
      bodyChart: { markers: BodyChart.getData(), notes: gv('chart-notes') },
      history:   { current: gv('hx-current'), past: gv('hx-past') },
      specialQuestions: {
        health:      gv('sq-health'),
        pmhx:        gv('sq-pmhx'),
        surgery:     gv('sq-surgery'),
        investigation:gv('sq-invest'),
        medication:  gv('sq-med'),
        occupation:  gv('sq-occ'),
        recreation:  gv('sq-rec'),
        social:      gv('sq-social'),
        pacemaker:   radio('pacemaker') || 'No'
      },
      neurological: {
        sensation: { left: gv('neuro-sens-l'), right: gv('neuro-sens-r'), notes: gv('neuro-sens-n') },
        reflex:    { left: gv('neuro-ref-l'),  right: gv('neuro-ref-r'),  notes: gv('neuro-ref-n') },
        motor:     { left: gv('neuro-mot-l'),  right: gv('neuro-mot-r'),  notes: gv('neuro-mot-n') },
        notes: gv('neuro-notes')
      },
      observation: { general: gv('obs-general'), local: gv('obs-local') },
      palpation: {
        tenderness:  gv('palp-tender'),
        temperature: gv('palp-temp'),
        muscle:      gv('palp-muscle'),
        joint:       gv('palp-joint')
      },
      movement: {
        table:     MovementTable.getData(),
        accessory: gv('mov-accessory'),
        special:   gv('mov-special'),
        clearing:  gv('mov-clearing'),
        muscle:    gv('mov-muscle'),
        functional:gv('mov-func')
      },
      plan: {
        impression: gv('plan-impression'),
        stg:        gv('plan-stg'),
        ltg:        gv('plan-ltg'),
        treatment:  gv('plan-tx'),
        remarks:    gv('plan-remarks')
      }
    };
  }

  // ── Populate form from data object ────────────
  function populate(d) {
    if (!d) return;

    if (d.patient) {
      setRadio('pt-type', d.patient.type || 'local');
      onPtTypeChange();
      sv('pt-name',     d.patient.name);
      sv('pt-nric',     d.patient.nric);
      sv('pt-passport', d.patient.passport);
      sv('pt-country',  d.patient.country);
      sv('pt-dob',      d.patient.dob);
      sv('pt-date',     d.patient.date);
      sv('pt-age',      d.patient.age);
      setRadio('pt-sex', d.patient.sex);
    }

    sv('pt-diagnosis', d.diagnosis);
    sv('pt-problem',   d.problem);

    if (d.management) {
      sv('dr-mgmt', d.management.type);
      onMgmtChange();
      sv('surgery-date', d.management.surgeryDate);
    }

    if (d.pain) {
      var pre  = d.pain.pre  || 0;
      var post = d.pain.post || 0;
      document.getElementById('pain-pre').value  = pre;  setPain('pre',  pre);
      document.getElementById('pain-post').value = post; setPain('post', post);
      sv('pain-nature', d.pain.nature);
      sv('pain-24hr',   d.pain.behaviour24);
      sv('pain-agg',    d.pain.agg);
      sv('pain-ease',   d.pain.ease);
      if (d.pain.irritability) pickIrr(d.pain.irritability);
    }

    sv('chart-notes', d.bodyChart  && d.bodyChart.notes);
    sv('hx-current',  d.history    && d.history.current);
    sv('hx-past',     d.history    && d.history.past);

    if (d.specialQuestions) {
      var sq = d.specialQuestions;
      sv('sq-health',  sq.health);   sv('sq-pmhx',    sq.pmhx);
      sv('sq-surgery', sq.surgery);  sv('sq-invest',  sq.investigation);
      sv('sq-med',     sq.medication);sv('sq-occ',    sq.occupation);
      sv('sq-rec',     sq.recreation);sv('sq-social', sq.social);
      setRadio('pacemaker', sq.pacemaker || 'No');
    }

    if (d.neurological) {
      var n = d.neurological;
      sv('neuro-sens-l', n.sensation && n.sensation.left);
      sv('neuro-sens-r', n.sensation && n.sensation.right);
      sv('neuro-sens-n', n.sensation && n.sensation.notes);
      sv('neuro-ref-l',  n.reflex    && n.reflex.left);
      sv('neuro-ref-r',  n.reflex    && n.reflex.right);
      sv('neuro-ref-n',  n.reflex    && n.reflex.notes);
      sv('neuro-mot-l',  n.motor     && n.motor.left);
      sv('neuro-mot-r',  n.motor     && n.motor.right);
      sv('neuro-mot-n',  n.motor     && n.motor.notes);
      sv('neuro-notes',  n.notes);
    }

    if (d.observation) { sv('obs-general', d.observation.general); sv('obs-local', d.observation.local); }

    if (d.palpation) {
      sv('palp-tender', d.palpation.tenderness);
      sv('palp-temp',   d.palpation.temperature);
      sv('palp-muscle', d.palpation.muscle);
      sv('palp-joint',  d.palpation.joint);
    }

    if (d.movement) {
      MovementTable.loadData(d.movement.table || []);
      sv('mov-accessory', d.movement.accessory);
      sv('mov-special',   d.movement.special);
      sv('mov-clearing',  d.movement.clearing);
      sv('mov-muscle',    d.movement.muscle);
      sv('mov-func',      d.movement.functional);
    }

    if (d.plan) {
      sv('plan-impression', d.plan.impression);
      sv('plan-stg',        d.plan.stg);
      sv('plan-ltg',        d.plan.ltg);
      sv('plan-tx',         d.plan.treatment);
      sv('plan-remarks',    d.plan.remarks);
    }

    if (d.bodyChart && d.bodyChart.markers) {
      BodyChart.loadData(d.bodyChart.markers);
    }
  }

  // ── Reset ─────────────────────────────────────
  function reset() {
    document.querySelectorAll('input[type=text],input[type=date],input[type=number],textarea')
      .forEach(function (el) { el.value = ''; });
    document.querySelectorAll('input[type=radio]')
      .forEach(function (el) { el.checked = false; });
    document.querySelector('[name=pt-type][value=local]').checked = true;
    document.querySelector('[name=pacemaker][value=No]').checked  = true;
    onPtTypeChange();
    document.getElementById('pain-pre').value  = 0; setPain('pre',  0);
    document.getElementById('pain-post').value = 0; setPain('post', 0);
    document.getElementById('dr-mgmt').value   = '';
    document.getElementById('surgery-row').className = 'surgery-row';
    document.querySelectorAll('.irr-chip').forEach(function (c) { c.className = 'irr-chip'; });
    document.getElementById('derived-dob').classList.add('hidden');
    document.getElementById('derived-gender').classList.add('hidden');
    document.getElementById('sex-field').style.display     = 'none';
    document.getElementById('country-field').style.display = 'none';
    BodyChart.clearAll();
    MovementTable.clear();
  }

  return {
    collect:        collect,
    populate:       populate,
    reset:          reset,
    onPtTypeChange: onPtTypeChange,
    onNricInput:    onNricInput,
    onMgmtChange:   onMgmtChange,
    setPain:        setPain,
    pickIrr:        pickIrr
  };

})();
