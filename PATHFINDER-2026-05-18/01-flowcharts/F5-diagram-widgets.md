# F5 — Interactive Diagram Widgets

## BodyChart

```mermaid
flowchart TD
    A["Form HTML includes body SVG<br/>base.html body-chart section"]
    B["BodyChart.init()<br/>bodychart.js:28"]
    C["SVG click → place marker<br/>bodychart.js:~80"]
    D["Marker stored in internal markers array"]
    E["BodyChart.getData()<br/>bodychart.js:163"]
    F["Returns Array<{id,zone,type,view,x,y}>"]
    G["Included in window.Form.collect() output<br/>as bodyChart.markers + bodyChart.notes"]

    H["window.Form.populate(data)<br/>Calls BodyChart.loadData(data.bodyChart.markers)<br/>bodychart.js:169"]
    I["BodyChart.clearAll()<br/>bodychart.js:157<br/>Called by window.Form.reset()"]

    A --> B --> C --> D
    E --> F --> G
    H --> D
    I
```

## HandChart

```mermaid
flowchart TD
    A["form_hand.html includes #hand-svg-r + #hand-svg-l<br/>hand.html inline SVGs"]
    B["HandChart.init()<br/>handchart.js:24<br/>Binds to both SVGs"]
    C["SVG click → place marker (R or L hand)<br/>handchart.js:~50"]
    D["Marker stored in internal markers array<br/>{id, hand:'R'|'L', type, x%, y%}"]
    E["HandChart.getData()<br/>handchart.js:92"]
    F["Returns Array<{id,hand,type,x%,y%}>"]
    G["Included in form_hand.js collect() output<br/>as handChart array"]

    H["HandChart.loadData(arr)<br/>handchart.js:98"]
    I["HandChart.clearAll()<br/>handchart.js:112"]

    A --> B --> C --> D
    E --> F --> G
    H --> D
    I
```

## LungChart

```mermaid
flowchart TD
    A["form_cr.html includes lung diagram container"]
    B["LungChart.init()<br/>lungchart.js:341"]
    C["User clicks zone → select finding<br/>lungchart.js:~360"]
    D["State stored as Object: {zone: finding}<br/>6 zones, radiological convention (R on viewer left)"]
    E["LungChart.getData()<br/>lungchart.js:383"]
    F["Returns Object{zone:finding} — NOT an array<br/>(unique among all widgets)"]
    G["Included in form_cr.js collect() output<br/>as lungChart object"]

    H["LungChart.loadData(obj)<br/>lungchart.js:384"]
    I["LungChart.clearAll()<br/>lungchart.js:385"]

    A --> B --> C --> D
    E --> F --> G
    H --> D
    I
```

## Widget Return Type Summary

| Widget | getData() return type | Key |
|--------|----------------------|-----|
| BodyChart | `Array<{id,zone,type,view,x,y}>` | `bodyChart.markers` |
| HandChart | `Array<{id,hand,type,x%,y%}>` | `handChart` |
| LungChart | `Object{zone:finding}` | `lungChart` |

## FINDING_COLORS consistency

All 5 hex values identical between `lungchart.js:8–14` and `pdf_cr.py:26–32`.
No drift. Must be kept in sync manually when either file changes.

## External Dependencies

- F3 Assessment Form Entry: all three widgets called inside `collect()` / `populate()` / `reset()` of the relevant form_xxx.js
- F8 PDF Export: widget data serialized to JSON in record; `pdf_cr.py` reads `lungChart` object, `pdf_*.py` read `bodyChart`
