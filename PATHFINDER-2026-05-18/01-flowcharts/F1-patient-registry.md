# F1 — Patient Registry

## Happy Path: Create Patient

```mermaid
flowchart TD
    A["User fills New Patient form<br/>home.html:~1450"]
    B["submitNewPatient()<br/>home.html:~1460"]
    C["API.createPatient(data)<br/>api.js:~10"]
    D["POST /api/patients<br/>api_create_patient()<br/>app.py:156"]
    E["validate_patient(data)<br/>database.py:174"]
    F{"NRIC duplicate?<br/>database.py:212"}
    G["Return 409 Conflict"]
    H["create_patient()<br/>database.py:220"]
    I["INSERT patients row<br/>database.py:240"]
    J["audit_log INSERT<br/>database.py:257"]
    K["Return patient JSON<br/>app.py:163"]
    L["UI closes modal, refreshes list"]

    A --> B --> C --> D --> E
    E --> F
    F -- yes --> G
    F -- no --> H --> I --> J --> K --> L
```

## Happy Path: Search Patient

```mermaid
flowchart TD
    A["User types in search box<br/>home.html"]
    B["api_patient_search()<br/>app.py:147"]
    C["search_patients(query)<br/>database.py:265"]
    D["SELECT LIKE on name/ic/mrn<br/>database.py:275"]
    E["Return list JSON<br/>app.py:152"]
    F["Render patient cards in list view"]

    A --> B --> C --> D --> E --> F
```

## Delete Patient (cascade)

```mermaid
flowchart TD
    A["deleteCurrentPatient()<br/>home.html:~1850"]
    B["API.deletePatient(id)<br/>api.js"]
    C["DELETE /api/patients/:id<br/>api_delete_patient()<br/>app.py:175"]
    D["delete_patient(id)<br/>database.py:304"]
    E["DELETE soap_notes WHERE episode_id IN ...<br/>database.py:310"]
    F["DELETE audit_log WHERE episode_id IN ...<br/>database.py:314"]
    G["DELETE records WHERE episode_id IN ...<br/>database.py:318"]
    H["DELETE episodes WHERE patient_id<br/>database.py:322"]
    I["DELETE patients WHERE id<br/>database.py:326"]
    J["Return 204"]

    A --> B --> C --> D --> E --> F --> G --> H --> I --> J
```

## External Dependencies

- F2 Episode Management: `api_patient_episodes()` called from patient detail view
- F10 Dashboard: `search_patients()` also feeds active patient list

## Known Issues

- `update_patient()` (database.py:333) has NO duplicate NRIC check on edit — a patient can be updated to an NRIC already belonging to another record
- `_openPatientInline(id)` in home.html — dead code not yet removed
