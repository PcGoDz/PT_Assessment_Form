# F7 — MPIS Copy-to-Clipboard

## Assessment MPIS (main.js pattern)

```mermaid
flowchart TD
    A["User clicks Copy to MPIS button<br/>copyToMpisAuto()<br/>main.js:1013"]
    B["formType = Form.collect()._form_type.toUpperCase()<br/>main.js:1019"]
    C{"Switch on formType"}
    D1["_buildMpisMs()<br/>main.js:850"]
    D2["_buildMpisSpine()<br/>main.js:491"]
    D3["_buildMpisGeriatric()<br/>main.js:623"]
    D4["_buildMpisCr()<br/>main.js:722"]
    D5["_buildMpisAmputation()<br/>main.js:1032"]
    D6["_buildMpisNeuro()<br/>main.js:1169"]
    D7["_buildMpisHand()<br/>main.js:1388"]
    E["Returns parts[] array<br/>(ZERO clipboard/await calls inside builder)"]
    F["showMpisHeaderModal()<br/>main.js:1425<br/>Shows modal: tarikh, queue, kpi, seen-by, appt"]
    G{"User confirms or cancels?"}
    H["Cancel — return"]
    I["_doCopyMpis(parts, header)<br/>main.js:1474<br/>Formats POMR text, calls copyText()"]
    J["navigator.clipboard.writeText(text)<br/>copyText()<br/>main.js:51"]
    K["Show success toast"]

    A --> B --> C
    C --> D1 & D2 & D3 & D4 & D5 & D6 & D7
    D1 & D2 & D3 & D4 & D5 & D6 & D7 --> E
    E --> F --> G
    G -- cancel --> H
    G -- confirm --> I --> J --> K
```

## SOAP MPIS (episode.html, standalone)

```mermaid
flowchart TD
    A["User clicks Copy SOAP to MPIS button<br/>copySOAPtoMpis()<br/>episode.html:721"]
    B["Reads SOAP fields directly from DOM<br/>(tarikh, queue_no, kpi_30min, seen_by, next_appt)"]
    C["Formats POMR plain text string<br/>No modal, no Main.* dependency"]
    D["navigator.clipboard.writeText(text)<br/>Inline in episode.html"]
    E["Show success indicator"]

    A --> B --> C --> D --> E
```

## Legacy Per-Form Wrappers (main.js:1499–1505)

```js
// These all exist but are REDUNDANT — copyToMpisAuto() handles dispatch
async function copyToMpisSpine()     { ... }  // main.js:1499
async function copyToMpisGeriatric() { ... }  // main.js:1500
async function copyToMpisCr()        { ... }  // main.js:1501
async function copyToMpis()          { ... }  // main.js:1502 (MS)
async function copyToMpisAmputation(){ ... }  // main.js:1503
async function copyToMpisNeuro()     { ... }  // main.js:1504
async function copyToMpisHand()      { ... }  // main.js:1505
```

These call their respective builders + `_doCopyMpis()` directly. Not called from any HTML. Exist alongside `copyToMpisAuto()`. Duplication candidate.

## POMR Format

```
TARIKH: <date>
NOMBOR GILIRAN: <queue>
KPI-SS-30 MINIT: <kpi>
DILIHAT: <seen_by>
---
[content blocks via mpisSec()]
---
TEMUJANJI: <next_appt>
```

## XSS

User-supplied strings (patient name, dates, form type) must pass through `escapeHtml()` before innerHTML injection. Clipboard copy path uses text (safe), but modal display path requires escaping.

## External Dependencies

- F3 Assessment Form Entry: `window.Form.collect()` called to gather form data
- F4 SOAP Notes: `copySOAPtoMpis()` reads episode.html SOAP modal DOM (standalone, no F3/F7 dependency)
