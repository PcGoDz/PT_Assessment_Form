# F3 — Assessment Form Entry

## Form Init / Page Load

```mermaid
flowchart TD
    A["User navigates to /form/:form_type/:episode_id<br/>form_view()<br/>app.py:129"]
    B["Render forms/:form_type.html extending base.html<br/>Jinja injects patient-json, page-context meta tags"]
    C["init()<br/>main.js:451"]
    D["window.Form.onNricInput()<br/>window.Form.onDobChange()  → wired to input events"]
    E["initFormContext()<br/>main.js:315"]
    F["Populate patient fields from patient-json<br/>main.js:~330"]
    G["loadRecord() — GET /api/episodes/:id/record<br/>main.js:231"]
    H{"Record exists?"}
    I["window.Form.populate(data)<br/>main.js:~253"]
    J["checkForDraft()<br/>main.js:148"]
    K{"Draft in localStorage<br/>newer than saved?"}
    L["Prompt: restore draft?<br/>restoreDraft()<br/>main.js:165"]
    M["Render form in blank state"]

    A --> B --> C --> D
    C --> E --> F
    E --> G --> H
    H -- yes --> I
    H -- no --> J --> K
    K -- yes --> L
    K -- no --> M
```

## Save Record

```mermaid
flowchart TD
    A["User clicks Save Record<br/>saveRecord()<br/>main.js:216"]
    B["window.Form.collect()<br/>Returns { _form_type, meta, ...fields }"]
    C["API.saveRecord(episodeId, data)<br/>api.js:~20"]
    D["POST /api/episodes/:id/record<br/>app.py:~240"]
    E["validate_record(data)<br/>database.py:140"]
    F{"REQUIRED_FIELDS[form] satisfied?<br/>database.py:122"}
    G["Return 422 with error"]
    H["save_record()<br/>database.py:~550"]
    I{"Existing record?"}
    J["UPDATE records SET data=JSON<br/>database.py:~580"]
    K["INSERT records row<br/>database.py:~570"]
    L["audit_log INSERT<br/>database.py:~590"]
    M["clearDraft()<br/>main.js:135"]
    N["markClean()<br/>main.js:108"]

    A --> B --> C --> D --> E --> F
    F -- no --> G
    F -- yes --> H --> I
    I -- yes --> J
    I -- no --> K
    J --> L --> M --> N
    K --> L
```

## Autosave / Draft

```mermaid
flowchart TD
    A["User edits any field<br/>markDirty()<br/>main.js:103"]
    B["scheduleAutosave()<br/>main.js:114  — debounced 2s"]
    C["saveDraft()<br/>main.js:119"]
    D["window.Form.collect()"]
    E["localStorage.setItem(DRAFT_KEY, JSON)<br/>DRAFT_KEY = 'pt_assessment_draft'\nmain.js:9"]

    A --> B --> C --> D --> E
```

## REQUIRED_FIELDS per form (database.py:122–134)

| Form | Required |
|------|----------|
| common | name, date |
| MS / SPINE / GERIATRIC / CR / NEURO | + diagnosis |
| HAND | + diagnosis, pt_impression |
| AMPUTATION | + impression |

## validate_record form_type resolution

`data['meta']['form']` at database.py:140 — NOT `data['_form_type']`.
`_form_type` is used only for PDF routing dispatch.

## window.Form contract (form_hand.js:398–406 as example)

```js
window.ActiveForm = HandForm;
window.Form = {
  collect: HandForm.collect,
  populate: HandForm.populate,
  reset: HandForm.reset,
  onPtTypeChange: FormBase.onPtTypeChange,
  onNricInput: FormBase.onNricInput,
  onDobChange: FormBase.onDobChange
}
```

Missing any of these = silent crash in main.js init().

## External Dependencies

- F5 Interactive Diagram Widgets: widgets called inside `collect()` (BodyChart.getData(), HandChart.getData(), LungChart.getData())
- F6 Dynamic Clinical Tables: tables called inside `collect()` (MovementTable.getData(), MmtTable.getData(), InvMedTable.getData())
- F8 PDF Export: exportPdf() at main.js:970 calls same record data
- F9 Clinical Templates: template buttons inject text into textareas
