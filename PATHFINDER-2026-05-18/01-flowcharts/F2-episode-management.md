# F2 — Episode Management

## Happy Path: Create Episode

```mermaid
flowchart TD
    A["User selects form in New Episode modal<br/>selectForm()<br/>home.html:1720"]
    B["submitNewEpisode()<br/>home.html:1729"]
    C["POST /api/patients/:id/episodes<br/>api_create_episode()<br/>app.py:200"]
    D["create_episode(patient_id, form_type, ref_date)<br/>database.py:367"]
    E["INSERT episodes row<br/>database.py:400"]
    F["Return episode JSON<br/>app.py:208"]
    G["Redirect to /episode/:id<br/>or open episode detail"]

    A --> B --> C --> D --> E --> F --> G
```

## Episode Detail Load

```mermaid
flowchart TD
    A["User navigates to /episode/:id<br/>episode_detail()<br/>app.py:104"]
    B["Render episode.html<br/>with patient + episode JSON injected"]
    C["loadEpisode()<br/>episode.html:781"]
    D["GET /api/episodes/:id<br/>api_get_episode()<br/>app.py:211"]
    E["get_episode() — JOINs patients<br/>database.py:472"]
    F["Render context banner, status pill, appointment"]
    G["loadAssessment()<br/>episode.html:823"]
    H["GET /api/episodes/:id/record<br/>api_episode_record()<br/>app.py:349"]
    I["get_episode_record()<br/>database.py:623"]
    J["Show assessment card or 'No assessment' state"]
    K["loadSoaps()<br/>episode.html:854"]
    L["GET /api/episodes/:id/soaps<br/>api_get_soaps()<br/>app.py:249"]
    M["get_soap_notes()<br/>database.py:751"]
    N["Render SOAP timeline"]

    A --> B --> C --> D --> E --> F
    C --> G --> H --> I --> J
    C --> K --> L --> M --> N
```

## Discharge / Reactivate

```mermaid
flowchart TD
    A["submitDischarge()<br/>home.html:2012"]
    B["PATCH /api/episodes/:id/status<br/>api_episode_status()<br/>app.py:219"]
    C["update_episode_status(id, status)<br/>database.py:489"]
    D["UPDATE episodes SET status, discharge_date<br/>database.py:500"]
    E["Return updated episode"]

    F["reactivateEpisode()<br/>home.html:2034"]
    F --> B

    A --> B --> C --> D --> E
```

## Next Appointment Update

```mermaid
flowchart TD
    A["saveNextAppt()<br/>main.js:1601"]
    B["PATCH /api/episodes/:id/appt<br/>api_update_episode_appt()<br/>app.py:230"]
    C["update_episode_appt()<br/>database.py:511"]
    D["UPDATE episodes SET next_appt, next_appt_time"]

    A --> B --> C --> D
```

## form_type Propagation

```
create_episode stores form_type in episodes row
  → /form/<form_type> link on episode detail
  → _PDF_GENERATORS[form_type] at export time
  → MPIS copyToMpisAuto normalizes with .toUpperCase()
```

## External Dependencies

- F1 Patient Registry: `get_patient()` JOINed in `get_episode()`
- F3 Assessment Form Entry: assessment card reads record from F3
- F4 SOAP Notes: SOAP timeline rendered alongside episode
- F8 PDF Export: export button on episode detail
