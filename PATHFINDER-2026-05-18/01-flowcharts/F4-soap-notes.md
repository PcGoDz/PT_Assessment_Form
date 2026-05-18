# F4 — SOAP Follow-Up Notes

## Add SOAP Note

```mermaid
flowchart TD
    A["User opens SOAP modal (+ button)<br/>openSoapModal(null)<br/>episode.html:~650"]
    B["Modal opens in Add mode<br/>No id field in form"]
    C["User fills S/O/A/P + session fields<br/>(queue_no, kpi_30min, seen_by, next_appt)"]
    D["saveSoap()<br/>episode.html:~700"]
    E["POST /api/episodes/:id/soap<br/>api_save_soap()<br/>app.py:257"]
    F["save_soap(episode_id, data)<br/>database.py:682"]
    G{"id in payload?"}
    H["INSERT soap_notes<br/>session_no = MAX+1<br/>database.py:713"]
    I["Return new SOAP JSON"]
    J["loadSoaps() refresh<br/>SOAP timeline re-renders"]

    A --> B --> C --> D --> E --> F --> G
    G -- no --> H --> I --> J
```

## Edit SOAP Note

```mermaid
flowchart TD
    A["User clicks Edit on existing SOAP<br/>openSoapModal(soapId)<br/>episode.html:~650"]
    B["GET /api/episodes/:id/soaps, find by id<br/>Populate modal with existing data"]
    C["User edits fields"]
    D["saveSoap()<br/>episode.html:~700"]
    E["POST /api/episodes/:id/soap<br/>(same endpoint as Add)"]
    F["save_soap(episode_id, data)<br/>database.py:682"]
    G{"id in payload?"}
    H["UPDATE soap_notes SET ...<br/>database.py:~730"]
    I["Return updated SOAP JSON"]
    J["loadSoaps() refresh"]

    A --> B --> C --> D --> E --> F --> G
    G -- yes --> H --> I --> J
```

## Delete SOAP Note

```mermaid
flowchart TD
    A["User clicks Delete on SOAP<br/>deleteSoap(id)<br/>episode.html:~760"]
    B["DELETE /api/episodes/:id/soap/:soap_id<br/>api_delete_soap()<br/>app.py:268"]
    C["delete_soap(id)<br/>database.py:765"]
    D["DELETE soap_notes WHERE id<br/>database.py:770"]
    E["Return 204"]
    F["loadSoaps() refresh<br/>session_no gaps NOT renumbered"]

    A --> B --> C --> D --> E --> F
```

## SOAP Template (O button for AMPUTATION only)

```mermaid
flowchart TD
    A["User clicks template button in SOAP modal<br/>showSoapTemplate(fieldId, formType)<br/>episode.html:~800"]
    B["tplMap lookup: form→template key<br/>CR→CR_SOAP, SPINE→SPINE_SOAP, ...<br/>episode.html:~805"]
    C["ClinicalTemplates.show(fieldId, 'SOAP', tplMap[formType])<br/>clinical_templates.js:475"]
    D["Open template picker modal<br/>User selects snippet"]
    E["Append to textarea"]

    A --> B --> C --> D --> E
```

## session_no Behavior

- Assigned at INSERT: `SELECT COALESCE(MAX(session_no), 0) + 1` (database.py:713–717)
- Deleting a SOAP note leaves a gap — sessions 1,2,3 → delete 2 → sessions 1,3
- No renumbering after delete (intentional — audit integrity)

## Objective Template Visibility

- O (Objective) template button shown ONLY for AMPUTATION form (episode.html:644–648)
- All other forms: only S/A/P template buttons visible

## External Dependencies

- F2 Episode Management: SOAP notes displayed in episode detail timeline
- F7 MPIS Copy: `copySOAPtoMpis()` in episode.html:721 reads SOAP fields directly from DOM (standalone, no Main.* dependency)
- F9 Clinical Templates: `ClinicalTemplates.show()` used for per-form SOAP snippets
