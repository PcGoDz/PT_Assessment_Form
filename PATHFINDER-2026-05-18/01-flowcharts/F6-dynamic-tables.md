# F6 — Dynamic Clinical Tables

## MovementTable

```mermaid
flowchart TD
    A["Form HTML includes table container"]
    B["MovementTable.init(config)<br/>movement_table.js:29<br/>config: {containerId, columns, rowTemplate}"]
    C["User clicks Add Row<br/>addRow(prefill)<br/>movement_table.js:43"]
    D["Append DOM row with input cells"]
    E["User clicks Delete Row<br/>deleteRow(id)<br/>movement_table.js:61"]
    F["Remove DOM row"]
    G["MovementTable.getData()<br/>movement_table.js:140"]
    H["Reads all DOM rows → Array of row objects (named fields)"]
    I["Included in collect() output"]
    J["MovementTable.loadData(arr)<br/>movement_table.js:160"]
    K["Recreate DOM rows from data array"]
    L["MovementTable.clear()<br/>movement_table.js:168"]

    A --> B
    B --> C --> D
    B --> E --> F
    G --> H --> I
    J --> K
    L
```

## MmtTable

```mermaid
flowchart TD
    A["Form HTML includes MMT table container"]
    B["MmtTable.init(config)<br/>mmt_table.js:13"]
    C["User adds row<br/>addRow(prefill)<br/>mmt_table.js:28"]
    D["User deletes row<br/>deleteRow(id)<br/>mmt_table.js:39"]
    E["MmtTable.getData()<br/>mmt_table.js:97<br/>Filters out empty rows"]
    F["Returns Array of row objects (named fields)"]
    G["MmtTable.loadData(arr)<br/>mmt_table.js:106"]
    H["MmtTable.clear()<br/>mmt_table.js:113"]

    A --> B --> C --> D
    E --> F
    G
    H
```

## InvMedTable

```mermaid
flowchart TD
    A["Form HTML includes investigations + medications table"]
    B["InvMedTable.init()<br/>inv_med_table.js:8"]
    C["addInvRow(prefill)<br/>inv_med_table.js:24<br/>Tuple: [date, test, result, remark]"]
    D["addMedRow(prefill)<br/>inv_med_table.js:37<br/>Tuple: [name, dose, freq, remark]"]
    E["InvMedTable.getData()<br/>inv_med_table.js:63"]
    F["Returns {investigations:[[]], medications:[[]]}<br/>Positional tuples — NO named fields<br/>DOM is the single source of truth"]
    G["InvMedTable.loadData(obj)<br/>inv_med_table.js:71"]
    H["InvMedTable.clear()<br/>inv_med_table.js:80"]

    A --> B --> C --> D
    E --> F
    G
    H
```

## Table Return Type Comparison

| Table | getData() structure | Field access |
|-------|-------------------|--------------|
| MovementTable | `Array<{movement, active, passive, ...}>` | named fields |
| MmtTable | `Array<{muscle, left, right, ...}>` | named fields |
| InvMedTable | `{investigations:[[date,test,result,remark]], medications:[[name,dose,freq,remark]]}` | positional index |

InvMedTable is the outlier — positional tuples with no field names. PDF generators must know the index positions.

## External Dependencies

- F3 Assessment Form Entry: all tables called inside relevant form_xxx.js `collect()` / `populate()` / `reset()`
- F8 PDF Export: table data read from serialized JSON record in each `pdf_*.py`
