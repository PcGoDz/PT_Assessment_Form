# WORKFLOW.md — Procedures

## Cowork two-window workflow (READ ONLY IF you are in Cowork mode)

> **Self-gate:** If you are a normal Claude Code session (single window, executing directly), SKIP
> this section — it does not apply. It applies ONLY when running as the Cowork "brain" window with a
> separate CC "muscle" window. If you don't know which you are: Cowork mode has the Linux sandbox
> mount + card UI; plain CC works the repo natively. When in doubt, you're probably CC — skip.

**The split.** Cowork = brain (plan, vet, audit, verify). CC (separate window) = muscle (writes code,
runs git, builds). Git is the source of truth that passes work between them. Miruya is NOT a code
reviewer (see RULES.md) — Cowork does the fidelity checks CC's output needs.

**THE RULE THAT MAKES THIS SAFE — verify via git, never via raw mount read.**
The Cowork Linux sandbox mounts the Windows working tree over virtiofs/FUSE. A raw read (`cat`/`Read`/
`ls`) of a file CC just wrote can return a STALE pre-write snapshot — the "time-dilation bubble."
Git object reads (`git show <branch>:<file>`, `git cat-file`, `git diff <commit>`) read `.git`
directly and are ALWAYS current. So:
- To verify CC's work, read COMMITTED BYTES via git, NOT a raw read of the file CC just touched.
- A raw read disagreeing with git is almost always mount lag, not real breakage — tiebreak by
  rendering the artifact (generate the PDF / run the build). If it produces correct output, trust git.
- BUT mount lag is not the only failure: a genuinely broken working file (e.g. an interrupted CC write
  that truncates) is real. Distinguish: stable byte count across re-reads + parse/build failure = real
  breakage; frozen/old content that git contradicts = lag. (Both happened — 2026-06-08 lag false-alarm;
  2026-06-09 a real truncated `pdf_sci.py`, restored from the committed blob.)

**MOUNT THE WORKTREE.** When work lives on a branch in a worktree folder, mount THAT folder in Cowork,
not just main. If only main is mounted, the worktree isn't visible and git lists it `prunable`
(it is NOT gone — just unmounted). Faceplant logged 2026-06-09. The worktree's `.git` file points to a
Windows path that won't resolve inside the sandbox, so git commands won't run FROM the worktree dir —
read its committed bytes via MAIN's git store (`git show <branch>:<file>`), and write working files via
bash (the Cowork Write tool only maps the originally-mounted folder).

**STANDING RULE — do not tear down branch-only work.** A worktree's checked-out files are "cash on
hand." Until the branch merges to main, keep the worktree MATERIALIZED. Do NOT `git worktree prune`
or archive the CC session (archiving wipes the worktree folder; commits survive but the visible files
don't). Miruya verifies with his own eyes — respect it. Cull the worktree only AFTER a deliberate
merge to main.

**Loose files are the recurring bite.** Plans, incident notes, anything written to the worktree is an
uncommitted working file until CC commits it — exactly what got truncated 2026-06-09. Have CC commit
docs/notes FIRST, then build.

**`.gitattributes` handles CRLF.** A Windows checkout read in the Linux sandbox shows phantom CRLF/LF
"everything modified." `git diff --ignore-all-space` → 0 real lines = phantom. Never
`git add --renormalize` from the sandbox. All git write ops happen CC-side (Windows).

---

## Adding a new form

The full form-build narrative — front-half design pipeline (transcribe → classify → sequence → assess backbone → brainstorm lightest), the milestone ladder, the 13-step implementation checklist, and the `initFormContext()` engine note — now lives in **`FORM_PIPELINE.md`**. Read it whenever activating a new form.

---

## MPIS Pattern (builder/wrapper/finalizer)

Refactored 2026-05-01. Strict three-part split:

**A. Builder (private, sync)** — returns parts array, ZERO copyText calls inside:
```js
function _buildMpisXxx() {
  var parts = []; var LN = MPIS_LN; var DIV = MPIS_DIV; var dash = MPIS_DASH;
  function sec(title, val) { mpisSec(parts, title, val); }
  // ... fill parts ...
  return parts;
}
```

**B. Wire into `copyToMpisAuto()`** switch block (formType === 'XXX' branch).

> ⚠ Do NOT create a per-form public wrapper (`copyToMpisXxx`). The 7 original per-form wrappers were deleted 2026-05-19 as dead code — `copyToMpisAuto()` is the sole entry point. New forms need only Part A (builder) + Part B (wire into switch).

Rules:
- NEVER put `copyText()` or `await` inside a builder.
- NEVER call `showMpisHeaderModal()` inside a builder — that's the wrapper's job.
- `_doCopyMpis()` handles all copying. One call only, inside _doCopyMpis.

Shared constants: `MPIS_LN`, `MPIS_DIV`, `MPIS_DASH`. Never redeclare locally.

POMR format: TARIKH / NOMBOR GILIRAN / KPI-SS-30 MINIT / DILIHAT / [content] / TEMUJANJI.

XSS: user-supplied strings injected into innerHTML must go through `escapeHtml()` — patient names, dates, form types.
- New MPIS builders follow HAND's SOAPIER structure (SUBJECTIVE / OBJECTIVE / ANALYSIS / PLAN / INTERVENTION as `dash`-delimited top-level sections), NOT the older flat one-section-per-block format (MS/SPINE/CR/etc.). SOAPIER is the canon-in-progress. Read the form's OWN `collect()` shape for field access: BURN/MS/CR use NESTED objects (`d.pain.pre`); HAND uses FLAT keys (`d.painPre`). Match whatever that form's collect() returns. Borrow sibling builders for shared sub-blocks (BURN reused CR's lung-map `zoneLabels`/`findingLabels`). Guard each objective sub-block with a `has*` check so blank sections are skipped, not rendered empty.

---

## PDF Generation Rules

- Each form type has its own standalone PDF generator
- LungDiagramFlowable uses clipPath — always saveState()/restoreState() per lung
- Match KKM borang ref number exactly per form
- Every `box()` call inside two-column layout MUST pass explicit width
- ReportLab clipPath is cumulative — second lung must saveState before clipPath call
- `two_col()` returns a single Table (not a list) — use `story.append()`, NOT `story +=`
- `body_chart_section()` returns a single Table — use `items.append()`, NOT `items +=`
- Nested tables inside `ruled_section()` cells: use `INN = column_width - 8*mm` for colWidths (padding eats space)
- NEURO layout: 2-column throughout, multiple short blocks (not one giant block). Each block under ~250mm or ReportLab throws "too large".
- ALWAYS use `sign_chop_block()` from `pdf_platypus_base` for sign & chop footer. Do NOT inline custom sign/chop code.
- `patient` and `body_chart` from DB records may be JSON strings (not dicts). Always use `_ensure_dict()` or `json.loads()` before `.get()` on them.

---

## JS Rules (CRITICAL)

- `window.FormBase` must be exposed before any inline HTML handler calls it
- All inline HTML handlers must use `window.FormBase.xxx` not `FormBase.xxx` (const is block-scoped, unreliable from HTML attributes)
- Never write literal newlines in JS strings via Python — silent browser SyntaxError
- Always syntax-check new JS: `node --check file.js` before packaging
- `onPtTypeChange` uses null-guarded `set()` — never direct `getElementById` without null check
- `form_xxx.js` MUST export `window.Form` (not just `window.ActiveForm`)
- BodyChart API: `BodyChart.getData()` to collect markers, `BodyChart.loadData(arr)` to populate, `BodyChart.clearAll()` to reset. There is NO `BodyChart.collect()` or `BodyChart.populate()`. Store as `bodyChart: { markers: [...], notes: str }` (camelCase).
- `clinical_templates.js` must be a clean IIFE — orphaned code outside functions breaks the entire module silently
- All templates (both assessment arrays AND SOAP dicts) must live in `TEMPLATES` (the `const` at the top of the IIFE). `show()` does `(TEMPLATES[formType] || {})[category]` — structure is `TEMPLATES.FORM_TYPE = { impression: [...], stg: [...], ltg: [...], treatment: [...] }` for assessment, `TEMPLATES.FORM_TYPE_SOAP = { subjective: [...], objective: [...], analysis: [...], plan: [...] }` for SOAP. The flat `templates` dict (lowercase) is NOT used for lookups — anything stored there silently falls through to `[]` and template buttons do nothing.

---

## Code Editing Discipline

- Read the file before editing. Always.
- After a str_replace, re-read the affected area before making another edit to the same file. Previous view output becomes stale after any successful edit.
- When rewriting large blocks, check for orphaned code AFTER the replacement. Multiple str_replace passes on the same file accumulate stale sections.
- When in doubt about file state: view the file, grep for the pattern, then edit.
- Never assume a previous edit "got everything" — verify.
- After ANY str_replace > 5 lines: grep -n "def function_name" file and read the ENTIRE function. Look for unreachable code below return statements. **Non-negotiable.**

---

## End-of-session hygiene (run before wind-down)

- **Commit real work; discard/delete junk.** Litter files (`cd`, `git`, `_write_test.txt` etc.) get left by mistyped redirects — delete before commit. Loose docs (plans, incident notes) belong on the branch, not floating in main.
- **Clear stale `.git/index.lock`** — a dead process leaves a 0-byte lock that blocks all git ops. Check: `tasklist | findstr git` → empty = stale, safe to `del .git\index.lock`. See Anti-Repeat for the full rule.
- **No orphan worktrees after merge.** After `--no-ff` merge: remove both branch worktree and any empty CC-session stray (`git worktree remove --force`), then `git worktree prune`, then `git branch -d`. Folder may persist if Windows blocks deletion (CWD in use) — note it for manual `rmdir /s /q` cleanup.
- **Verify tree clean before merge.** `git status` + `git diff --ignore-all-space --stat` on main. Real modifications (not CRLF phantoms) must be resolved — either committed or deliberately discarded — before a merge that touches the same files.

---

## Anti-Repeat Rules

Things relearned the hard way. Do not let happen again:

- `fetchone()` with no `ORDER BY` on any query that expects 0-1 rows is a latent bug. Always add `ORDER BY + LIMIT 1`.
- When adding a new form type, check ALL required registries: `FORM_REGISTRY` (carries `pdf_episode`/`pdf_single` refs — the two PDF dicts derive from it automatically), and `REQUIRED_FIELDS` in `database.py`. Missing either = silent failure.
- Copy-paste route handlers are a code smell. 5th copy = write a generic handler instead.
- `sqlite3.OperationalError`, not bare `Exception`, for migration try/except blocks.
- When replacing a `__import__()` hack with a direct call, ADD the symbol to module-level imports first. The hack worked precisely because it bypassed imports. Replacing without updating imports = NameError at runtime.
- When flipping FORM_REGISTRY ready=True, ALSO update home.html episode modal card. Modal is hardcoded, not driven by FORM_REGISTRY.
- Before using a custom CSS class in a new form, grep for it in style.css. Chip groups, sliders, custom badges look like they work in HTML but are invisible/unstyled until the CSS class exists.
- When adding clinical templates for a new form, register them under `templates['FORM_TYPE']` (single array), NOT compound keys like `templates['FORM_TYPE_OBS']`. `show()` in `clinical_templates.js` only looks up `templates[formType]` — compound keys silently fall through to `[]` and buttons do nothing. If compound keys must be used, extend `show()` to try `templates[formType + '_' + category.toUpperCase()]` as a fallback.
- When adding a new field to `form_X.js collect()`, verify corresponding render blocks exist in BOTH `pdf_X.py` AND `_buildMpisX()` in `main.js`. Silent data loss occurs when collect() captures data that no downstream render touches. `neuro.muscles` (MMT) was collected by `form_hand.js` for the entire HAND form history and silently dropped — caught in PDF Session C, caught in MPIS Session D. Cross-reference all three: collect → PDF → MPIS.
- Clinical template arrays must contain discrete SMART statements (one statement per array entry, each Specific/Measurable/Achievable/Realistic/Time-bound). Do not copy vague category headers from source KKM documents — author proper SMART statements for the app.
- Making a shared singleton form-aware: prefer a `configure()` merge with safe defaults over branching the central `init()`. The merge leaves untouched forms behaviorally identical.
- `bodychart.js` is loaded globally by `base.html` — do NOT add `<script src="...bodychart.js">` inside any form's `{% block extra_js %}`. Doing so causes a SyntaxError on page load (`const COLORS` is redeclared when the IIFE re-executes). Pattern: call `BodyChart.init()` in DOMContentLoaded only; no script tag. Mirror ms.html.
- `patient.html` uses `selectEpForm(this)` for its form picker, NOT `selectForm(this)`. When activating a new form (step 1.5), BOTH home.html AND patient.html must be updated. They are independently hardcoded pickers; FORM_REGISTRY drives neither.
- **Empty-state `colspan` in a dynamic table's `_render()` lives in the JS, not the HTML.** When a table's column count changes, the empty-state `<td colspan="N">` string inside `_render()` must also be updated. Wrong colspan only appears when the table is empty — easy to miss in testing if you always add at least one row. BurnMov v2: wrong value was `4`, corrected to `7` (7 columns).
- **Relabeling a UI control is not the same as rewiring its value.** When a chip, dropdown, or
  button is relabeled for a new form or domain, verify the selected value is actually written
  through to storage — not just that the label renders. BURN body chart chips were relabeled
  MS-pain-type → burn-depth in the UI, but the marker-write path still emitted pain-type values;
  the form displayed "Deep partial" while the record stored "Sharp" and the PDF faithfully
  printed "Sharp". A cosmetic relabel without a data-path rewire is a silent clinical-accuracy
  bug. Check: pick the new option, save, reload/export, confirm the NEW value (not a legacy one)
  round-trips end to end.
- **Body chart marker payload key is `bodyChart` (camelCase), NOT `body_chart` (snake_case).** A snake_case key silently gives `bc = {}` → `body_chart_section()` renders the figures with no markers and prints "No markers recorded" — no error, no warning. Applies to both test scripts and any ad-hoc PDF generation calls. Always pass `bodyChart`.
- **A "renders without error" check is not a visual-output test.** For any PDF that includes drawn figures (body chart, hand chart, lung diagram), rasterize at least one page to PNG and look at it before calling the test a pass. Off-canvas coords and wrong data keys both produce a silent empty figure with a clean exit code. Session L: hollow-pass twice (float coords → wrong key) before the rasterized PNG caught it.
- Before smoke-testing a worktree change, run `git worktree list` and launch Flask from the folder whose HEAD matches the work commit. Prune stray prior-session worktrees during wind-down — a worktree sitting at main while the live branch is elsewhere causes folder-confusion and ghost-bug false results (you smoke-test stale code and conclude the fix doesn't work when main is fine).

- Smoke-test on the worktree BEFORE merging to main. Non-negotiable. The worktree exists precisely so the change can be verified in isolation. Sequence: edit in worktree → Miruya smoke-tests the worktree directly (run Flask from the worktree folder, not main) → only after confirmed working, merge to main. Inverting this (merge first, smoke-test after) creates two failure modes: (a) if the smoke-test fails, broken code is already on main and rollback is needed instead of just abandoning a branch, and (b) if the worktree branch is left behind main after the merge, the worktree folder displays stale pre-merge code, which produces a FALSE smoke-test failure on a fix that actually works. The second mode is especially dangerous — it leads to "chasing ghost bugs" where every subsequent edit goes into a stale branch, the user keeps reporting the bug isn't fixed, and the actual code in main is fine the whole time. To prevent both: never run `git merge` on main until the worktree smoke-test has passed. If a merge must happen urgently, fast-forward the worktree branch immediately after so the folder stays in sync.
- **Form-type swap is a full page reload, not an in-page swap.** `navigateForm()` in `base.html` ends with `window.location.href = url` — the JS context is destroyed and the `BodyChart` singleton reloads with `markers = []` empty. Therefore cross-form body-chart marker bleed is NOT caused by a surviving singleton, and adding a `clearAll()` call on form swap fixes nothing (the chart is already empty on load). The real cause was `initFormContext()` auto-loading the episode record via `/api/episodes/<id>/record` and cross-populating a *different* form type's data (`get_episode_record` returns the episode's newest record of ANY form type, regardless of the current page's form type). Fixed Session M: form-type guard in `initFormContext` skips populate + `setCurrentId` when the fetched record's form type ≠ the page's form type. Do not reintroduce the singleton-clear theory — the BACKLOG entry that proposed it was incorrect.
- **neuro.html patient card is INCOMPLETE — use ms.html as copy source.** `templates/forms/neuro.html`'s patient card (lines 22-88) is missing `id="pt-age"` and `id="sex-field"`. `FormBase.resetPatient()` does `document.getElementById('sex-field').style.display = 'none'` with no null guard — copying the neuro card to a new form means `reset()` throws a TypeError. Always copy the patient card from `templates/forms/ms.html` (lines 22-135), which has all required IDs. Caught during SCI form build 2026-06-05.
- **`assessment_grid.js` is the canonical fixed-row grid factory for multi-grid forms.** Config: `{ containerId, rows, columns, greyout }` — instance returned by `AssessmentGrid.create()`. Four cell-states (blank `''` / NT / N-A / real value); greyed cells have key ABSENT in `getData()` (not `''`). Stamp is non-destructive (fill blanks only, skip greyed). Future grid-heavy forms reuse this factory — do NOT rebuild per-form. Smoke-tested standalone before SCI wired it.
- **`reset(keepPatient)` — use snapshot-restore, not a conditional skip.** When adding `keepPatient` support to a form's `reset()`: (1) `var savedPt = keepPatient ? FormBase.collectPatient() : null;` at the top, (2) run the ENTIRE existing reset body unchanged (including `FormBase.resetPatient()`), (3) `if (savedPt) FormBase.populatePatient(savedPt);` as the final line. Do NOT wrap `resetPatient()` in `if (!keepPatient)` — CR's `reset()` relies entirely on `resetPatient()`'s blanket sweep for all clinical text; skipping it leaves diagnosis, history, plan, and observation fields populated after Clear. The snapshot-restore pattern works uniformly across all forms, including GERIATRIC (which uses its own `querySelectorAll` sweep instead of calling `resetPatient()`).
- **Derive the ready-form set from FORM_REGISTRY in app.py, not memory.** When a task touches all ready forms, read `FORM_REGISTRY` directly and count. Memory snapshots drift — initial session count was 8; GERIATRIC was missed until FORM_REGISTRY was re-read. Any list of "all X forms" in a prompt is advisory; verify against the live source before acting.
- **Behavior changes (Clear, autosave, populate) require hand-testing, not "looks right" checks.** A clean `node --check` or "no console errors" does not verify that data flows correctly through collect → reset → populate. For any change to form lifecycle (Clear, New, restore, load): fill the form, trigger the action, then read the field values back and confirm patient fields survive / clinical fields blank. Miruya smoke-tests the worktree before merge — do not skip or invert that sequence.
- **formLabel / form_labels display maps are independently hardcoded across FIVE sites and NOT driven by FORM_REGISTRY.** Locations: `episode.html` (two `formLabel` object literals, one per render var — `episode.form_type` and `ep.form_type`), `home.html` (`FORM_LABELS` const ~1208 used by search / active-patient / episode-list renders, AND a separate inline `formLabel` object ~1922), `patient.html` (Jinja `{% set form_labels %}` ~475, server-side). A new form added to FORM_REGISTRY and the picker grids but NOT these maps renders its raw uppercase code ("BURN Assessment", "HAND Assessment") on episode cards. The maps drift even within one file — home.html's inline map had BURN while its const did not. When adding a form: `grep -rn "MS:'Musculoskeletal'\|'MS':'Musculoskeletal'" templates/` and add the new key to EVERY hit. The parallel icon maps at the same sites have the same structure and the same gap — see BACKLOG.
- **Cowork Linux sandbox shows phantom CRLF/LF dirtiness on a Windows checkout.** If 71-file "everything modified" appears, run `git diff --ignore-all-space` — 0 real lines = phantom, not a real change. `.gitattributes` (added `2f3f58f`, 2026-06-07) normalizes line endings going forward. If the ghost reappears, verify with `--ignore-all-space` before acting. Never run `git add --renormalize` from the Linux sandbox — it rewrites to LF, wrong for a Windows checkout. Do all git ops Windows-side.
- **Stale `.git/index.lock` blocks all git ops** ("Another git process seems to be running"). Before deleting: confirm no real git process is running (`tasklist | findstr git` returns empty). If empty, `del .git\index.lock`. A 0-byte lock file with no running process = stale leftover, safe to remove.

---

## Debugging

- **Flask errors live in the TERMINAL, not the browser console.** Set `debug=True` for in-browser tracebacks.
- For runtime bugs: YOU (Miruya) reproduce, copy the error from terminal/console, then prompt. Don't make Claude Code play detective.
- Stuck-in-creating bug in Claude Code: kill the session, do NOT `claude --resume`, start fresh.
- Compact between superpowers phases wipes skill orchestration state. Use `/clear` instead, or close session and start new.

---

## Build & Deploy

- Recompile via `build.bat` (PyInstaller spec is `pt_assessment.spec`).
- Test exe end-to-end after any structural change (new form, schema migration, MPIS refactor).
- Don't forget to add new pdf_xxx.py files to `pt_assessment.spec` under `datas`.
- **`build.bat` uses the `py` launcher** (`py`, `py -m pip`, `py -m PyInstaller`) — NOT bare `python`. Windows 11 (build 26200+) installs a Microsoft Store stub at `%LOCALAPPDATA%\Microsoft\WindowsApps\python.exe` that intercepts bare `python` calls and opens the Store instead of running Python, even when Python is correctly installed. The `py` launcher bypasses this. Any future Python tooling added to the build pipeline should use `py`, not `python`.

---

## seed_db.py

- `python seed_db.py` — adds missing patients, skips by IC if already in DB. Safe to re-run.
- `python seed_db.py --reset` — wipes the 10 seeded patients (by IC match) and re-inserts fresh.
- DB path: `pt_data/records.db` relative to script. Same path app.py uses via `data_path()`.

---

## SOAP Templates Per Form

`tplMap` in `showSoapTemplate()` in episode.html routes form-type to SOAP template key.

Naming: `SOAP_MS`, `SOAP_SPINE`, etc. Stored in `TEMPLATES` const at top of clinical_templates.js IIFE (not in flat `templates` dict — that's for assessment template arrays only).

---

## Clinical Reference

**Malaysian NRIC logic:**
- Format: YYMMDD-PB-XXXG
- G odd = male, even = female
- DOB century: 00-29 = 2000s, 30-99 = 1900s

**KKM Form References (preserve exactly in PDF headers):**
- HAND: `fisio / b.pen. 12 / Pind. 2 / 2019`
- See respective `pdf_<form>.py` for each form's ref string.

**Lung Diagram (CR):** radiological convention — patient RIGHT on viewer's LEFT, labelled R.

**Session header fields** (Nombor Giliran, KPI-SS-30 min, Dilihat, Temujanji) live in episode.html SOAP modal — shared across ALL forms. Do NOT add to individual forms. DB columns: `queue_no`, `kpi_30min`, `seen_by`, `next_appt`, `next_appt_time` in `soap_notes`.

**MPIS output for SOAP notes** follows POMR format (Malay headers), not assessment format.
