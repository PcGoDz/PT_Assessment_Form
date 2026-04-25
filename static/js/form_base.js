// form_base.js — shared patient fields, helpers, common logic
// Used by ALL assessment forms. Form-specific logic lives in form_ms.js etc.

const FormBase = (function () {

  // ── Field helpers ─────────────────────────────────────
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

  // ── Age calculation from DOB string ──────────────────
  // Single shared function — called by both NRIC and DOB paths
  function calcAgeFromDob(dobStr) {
    if (!dobStr) return null;
    var dob   = new Date(dobStr);
    if (isNaN(dob.getTime())) return null;
    var today = new Date();
    var age   = today.getFullYear() - dob.getFullYear();
    if (today.getMonth() < dob.getMonth() ||
       (today.getMonth() === dob.getMonth() &&
        today.getDate()  < dob.getDate())) age--;
    return (age >= 0 && age <= 130) ? age : null;
  }

  // ── Patient type toggle ───────────────────────────────
  function onPtTypeChange() {
    var local = radio('pt-type') === 'local';
    var set = function(id, val) {
      var el = document.getElementById(id);
      if (el) el.style.display = val;
    };
    set('nric-field',     local ? '' : 'none');
    set('passport-field', local ? 'none' : '');
    set('country-field',  local ? 'none' : '');
    set('sex-field',      local ? 'none' : '');
    if (!local) {
      var dd = document.getElementById('derived-dob');
      var dg = document.getElementById('derived-gender');
      if (dd) dd.classList.add('hidden');
      if (dg) dg.classList.add('hidden');
    }
  }

  // ── NRIC auto-derive ──────────────────────────────────
  function onNricInput(val) {
    var c  = val.replace(/\D/g, '');
    var db = document.getElementById('derived-dob');
    var dg = document.getElementById('derived-gender');
    if (c.length < 12) {
      db.classList.add('hidden');
      dg.classList.add('hidden');
      return;
    }

    var yy = c.substring(0, 2), mm = c.substring(2, 4), dd = c.substring(4, 6);
    var thisYY = new Date().getFullYear() % 100;
    var yr     = parseInt(yy) <= thisYY ? '20' + yy : '19' + yy;
    var dobStr = yr + '-' + mm + '-' + dd;

    sv('pt-dob', dobStr);

    var age = calcAgeFromDob(dobStr);
    if (age !== null) sv('pt-age', age);

    db.textContent = 'DOB: ' + dd + '/' + mm + '/' + yr;
    db.classList.remove('hidden');

    var last   = parseInt(c.charAt(11));
    var gender = last % 2 === 1 ? 'Male' : 'Female';
    dg.textContent = 'Gender: ' + gender;
    dg.classList.remove('hidden');

    setRadio('pt-sex', gender === 'Male' ? 'M' : 'F');
    if (typeof Main !== 'undefined') Main.updateProgress();
  }

  // ── DOB manual entry (foreign patients) ──────────────
  function onDobChange(val) {
    var age = calcAgeFromDob(val);
    if (age !== null) sv('pt-age', age);
  }

  // ── Collect patient section only ──────────────────────
  function collectPatient() {
    return {
      type:     radio('pt-type') || 'local',
      name:     gv('pt-name'),
      nric:     gv('pt-nric'),
      passport: gv('pt-passport'),
      country:  gv('pt-country'),
      dob:      gv('pt-dob'),
      date:     gv('pt-date'),
      age:      gv('pt-age'),
      sex:      radio('pt-sex')
    };
  }

  // ── Populate patient section only ─────────────────────
  function populatePatient(p) {
    if (!p) return;
    setRadio('pt-type', p.type || 'local');
    onPtTypeChange();
    sv('pt-name',     p.name);
    sv('pt-nric',     p.nric);
    sv('pt-passport', p.passport);
    sv('pt-country',  p.country);
    sv('pt-dob',      p.dob);
    sv('pt-date',     p.date);
    sv('pt-age',      p.age);
    setRadio('pt-sex', p.sex);
  }

  // ── Reset common patient fields ───────────────────────
  function resetPatient() {
    document.querySelectorAll('input[type=text],input[type=date],input[type=number],textarea')
      .forEach(function (el) { el.value = ''; });
    document.querySelectorAll('input[type=radio]')
      .forEach(function (el) { el.checked = false; });
    var localRadio = document.querySelector('[name=pt-type][value=local]');
    if (localRadio) localRadio.checked = true;
    var noRadio = document.querySelector('[name=pacemaker][value=No]');
    if (noRadio) noRadio.checked = true;
    onPtTypeChange();
    document.getElementById('derived-dob').classList.add('hidden');
    document.getElementById('derived-gender').classList.add('hidden');
    document.getElementById('sex-field').style.display     = 'none';
    document.getElementById('country-field').style.display = 'none';
  }

  // ── Progress fields config ────────────────────────────
  var progressFields = [];

  function setProgressFields(fields) { progressFields = fields; }
  function getProgressFields()       { return progressFields; }

  // ── Public API ────────────────────────────────────────
  var api = {
    gv:               gv,
    sv:               sv,
    radio:            radio,
    setRadio:         setRadio,
    onPtTypeChange:   onPtTypeChange,
    onNricInput:      onNricInput,
    onDobChange:      onDobChange,
    collectPatient:   collectPatient,
    populatePatient:  populatePatient,
    resetPatient:     resetPatient,
    setProgressFields:setProgressFields,
    getProgressFields:getProgressFields
  };

  // Expose on window for inline HTML handlers
  window.FormBase = api;
  return api;

})();
