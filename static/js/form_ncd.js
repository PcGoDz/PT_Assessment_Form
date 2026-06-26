// form_ncd.js — NCD / Obesity initial assessment form logic.
// Snapshot form (Plan A). Per-visit measurements + trend = Plan B.
var NcdForm = (function () {
  function gv(id)       { return FormBase.gv(id); }
  function sv(id, val)  { return FormBase.sv(id, val); }
  function radio(name)  { return FormBase.radio(name); }
  function setRadio(n,v){ return FormBase.setRadio(n, v); }

  function collect() {
    return {
      _form_type: 'NCD',
      meta:       { form: 'NCD' },
      patient:    FormBase.collectPatient(),
      diagnosis:  gv('diagnosis')
      // ... filled out across Tasks 2–5
    };
  }
  function populate(d) {
    if (!d) return;
    FormBase.populatePatient(d.patient);
    sv('diagnosis', d.diagnosis);
    // ... filled out across Tasks 2–5
  }
  function reset(keepPatient) {
    var savedPt = keepPatient ? FormBase.collectPatient() : null;
    FormBase.resetPatient();
    sv('diagnosis', '');
    // ... filled out across Tasks 2–5
    if (savedPt) FormBase.populatePatient(savedPt);
  }

  return { collect: collect, populate: populate, reset: reset };
})();

window.ActiveForm = { collect: NcdForm.collect, populate: NcdForm.populate, reset: NcdForm.reset };
window.Form = {
  collect:        NcdForm.collect,
  populate:       NcdForm.populate,
  reset:          NcdForm.reset,
  onPtTypeChange: FormBase.onPtTypeChange,
  onNricInput:    FormBase.onNricInput,
  onDobChange:    FormBase.onDobChange
};
