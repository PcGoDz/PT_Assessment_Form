# F8 — PDF Export

## Episode PDF Export

```mermaid
flowchart TD
    A["User clicks Export KKM PDF<br/>exportEpisodePdf()<br/>episode.html:908"]
    B["GET /api/episodes/:id/pdf[?form_type=XXX]<br/>export_episode_pdf()<br/>app.py:360"]
    C{"form_type resolution priority:<br/>1. ?form_type query param<br/>2. ep['form_type'] from DB<br/>3. 'MS' fallback"}
    D["_PDF_GENERATORS[form_type](episode_id, db)<br/>app.py:~385"]
    E1["pdf_ms.generate_episode_pdf()<br/>pdf_ms.py"]
    E2["pdf_spine.generate_episode_pdf()<br/>pdf_spine.py"]
    E3["pdf_geriatric.generate_episode_pdf()<br/>pdf_geriatric.py"]
    E4["pdf_cr.generate_episode_pdf()<br/>pdf_cr.py"]
    E5["pdf_amputation.generate_episode_pdf()<br/>pdf_amputation.py"]
    E6["pdf_neuro.generate_episode_pdf()<br/>pdf_neuro.py"]
    E7["pdf_hand.generate_episode_pdf()<br/>pdf_hand.py"]
    F["build_pdf(story)<br/>pdf_platypus_base.py:563<br/>SimpleDocTemplate → doc.build() → bytes"]
    G["Return PDF bytes with Content-Disposition: attachment"]

    A --> B --> C --> D
    D --> E1 & E2 & E3 & E4 & E5 & E6 & E7
    E1 & E2 & E3 & E4 & E5 & E6 & E7 --> F --> G
```

## Single Record PDF Export

```mermaid
flowchart TD
    A["API.exportPdf(recordId, formType)<br/>api.js:36"]
    B["GET /api/export/:record_id/pdf[?form_type=XXX]<br/>export_pdf()<br/>app.py:398"]
    C{"form_type resolution priority:<br/>1. ?form_type query param<br/>2. data['_form_type']<br/>3. data['meta']['form']<br/>4. 'MS' fallback"}
    D["_SINGLE_PDF_GENERATORS[form_type](record_id, db)"]
    E["Same per-form generator functions<br/>generate_<form>_pdf()"]
    F["build_pdf(story) → bytes"]
    G["Return PDF"]

    A --> B --> C --> D --> E --> F --> G
```

## Per-Form PDF Generator Structure

```mermaid
flowchart TD
    A["generate_episode_pdf(episode_id, db)"]
    B["get_episode(episode_id) — patient + episode data"]
    C["get_episode_record(episode_id) — JSON data"]
    D["_ensure_dict(data['patient'])<br/>pdf_geriatric.py:21 / pdf_hand.py:44 / pdf_neuro.py:28 / pdf_amputation.py:24<br/>(DUPLICATED in 4 files)"]
    E["Build story[] list with Platypus Flowables"]
    F["patient_bar() — header with name/IC/DOB/age/sex<br/>pdf_platypus_base.py"]
    G["form_header() — KKM form ref + title<br/>pdf_platypus_base.py"]
    H["Per-form sections: ruled_section(), two_col(), body_chart_section(), etc."]
    I["sign_chop_block()<br/>pdf_platypus_base.py:424<br/>(properly centralized)"]
    J["SOAP pages appended if episode has SOAP notes"]
    K["build_pdf(story) → bytes"]

    A --> B --> C --> D --> E
    E --> F & G & H & I & J
    E --> K
```

## PDF Routing Registries (must both be updated per new form)

```
_PDF_GENERATORS (app.py) — episode export:
  MS → pdf_ms.generate_episode_pdf
  SPINE → pdf_spine.generate_episode_pdf
  GERIATRIC → pdf_geriatric.generate_episode_pdf
  CR → pdf_cr.generate_episode_pdf
  AMPUTATION → pdf_amputation.generate_episode_pdf
  NEURO → pdf_neuro.generate_episode_pdf
  HAND → pdf_hand.generate_episode_pdf

_SINGLE_PDF_GENERATORS (app.py) — single record:
  MS → pdf_ms.generate_ms_pdf
  SPINE → pdf_spine.generate_spine_pdf
  ... (same 7 forms)
```

## Dead / Legacy

- `pdf_generator.py` — NOT in any dispatch dict, NOT imported in app.py. Still bundled in `pt_assessment.spec:12`. Dead code.
- `pdf_base.py` — ALIVE: imported by `pdf_platypus_base.py:54` via try/except for `BodyChartFlowable`. Not dead.

## External Dependencies

- F2 Episode Management: episode record + patient data fetched from DB
- F5 Diagram Widgets: widget data (bodyChart, handChart, lungChart) read from serialized JSON
- F6 Dynamic Tables: table data (movements, MMT, inv/med) read from serialized JSON
