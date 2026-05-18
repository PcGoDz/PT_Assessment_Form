# PT Assessment System — Handoff Prompts

Copy any of these directly into `/make-plan` to implement the corresponding change.

---

## Prompt 1 — U1+U2: Centralize PDF boilerplate in pdf_platypus_base.py

```
Target: pdf_platypus_base.py — add two shared functions: `ensure_dict` and `generate_episode_pdf_base`
Then update 7 PDF generators to use them.

Context:
- `_ensure_dict()` is redefined identically in 4 files: pdf_geriatric.py:21, pdf_hand.py:44, pdf_neuro.py:28, pdf_amputation.py:24
- `generate_episode_pdf()` is copied verbatim across all 7 PDF generators: pdf_ms.py:154, pdf_spine.py:201, pdf_geriatric.py:316, pdf_cr.py:571, pdf_amputation.py:346, pdf_neuro.py:445, pdf_hand.py:310
- Reference flowchart: PATHFINDER-2026-05-18/01-flowcharts/F8-pdf-export.md
- Full proposal: PATHFINDER-2026-05-18/03-unified-proposal.md (U1, U2)

Step 1 — add to pdf_platypus_base.py near top after imports:

def ensure_dict(val):
    if isinstance(val, str):
        try:
            import json
            return json.loads(val)
        except Exception:
            return {}
    return val if isinstance(val, dict) else {}

Step 2 — add to pdf_platypus_base.py after ensure_dict:

def generate_episode_pdf_base(build_story_fn, title, ref, assessment_data, soap_notes, episode_info=None):
    story   = []
    patient = ensure_dict((assessment_data or {}).get('patient', {}))
    if assessment_data:
        story += build_story_fn(assessment_data)
    else:
        story += page_header(title, ref)
        story.append(Paragraph('No initial assessment recorded for this episode.', S_NORMAL))
    notes = soap_notes or []
    for i in range(0, len(notes), 2):
        story.append(PageBreak())
        pair = []
        pair += soap_page(patient, notes[i], episode_info)
        if i + 1 < len(notes):
            pair += soap_page(patient, notes[i + 1], episode_info)
        story.append(KeepTogether(pair))
    return build_pdf(story)

Step 3 — in each pdf_*.py, update the import from pdf_platypus_base to include ensure_dict and generate_episode_pdf_base.

Step 4 — replace generate_episode_pdf in each of the 7 files:
  pdf_ms.py:154 → return generate_episode_pdf_base(_build_story, TITLE, REF, assessment_data, soap_notes, episode_info)
  pdf_spine.py:201 → same pattern
  pdf_geriatric.py:316 → same pattern
  pdf_cr.py:571 → same pattern
  pdf_amputation.py:346 → same pattern (also remove the unused `import json` at line 347)
  pdf_neuro.py:445 → same pattern
  pdf_hand.py:310 → same pattern (the _ensure_dict call on patient is now handled by the base function)

Step 5 — delete the 4 local _ensure_dict definitions:
  pdf_geriatric.py:21–26
  pdf_hand.py:44–50
  pdf_neuro.py:28–35 (nested inside _build_story — remove the nested def and its `import json as _json`)
  pdf_amputation.py:24–30 (same)

Step 6 — in pdf_ms.py, pdf_spine.py, pdf_cr.py: wrap the bare `.get('patient', {})` in `ensure_dict()` inside _build_story() to close the latent bug where SQLite returns JSON as string.

Anti-pattern guards:
- Do NOT change _build_story() in any file — that is form-specific layout code and must stay per-file
- Do NOT add TITLE or REF as module-level arguments to generate_episode_pdf_base — pass them per-call
- After editing any pdf_*.py: grep for the old 18-line generate_episode_pdf body and confirm it's gone
- After editing pdf_platypus_base.py: check that all existing imports of soap_page, sign_chop_block, patient_bar etc. still resolve
- Run `python -c "import pdf_platypus_base; import pdf_ms; import pdf_hand"` as a smoke check
```

---

## Prompt 2 — U3: Delete dead per-form MPIS wrappers from main.js

```
Target: static/js/main.js — delete 7 per-form MPIS wrapper functions and remove from Main exports

Context:
- Seven wrapper functions exist at main.js:1499–1509 but are never called from any HTML template
- The single unified dispatcher copyToMpisAuto() at main.js:1013 handles all dispatch
- base.html:131 wires the MPIS button to Main.copyToMpisAuto() only
- Reference flowchart: PATHFINDER-2026-05-18/01-flowcharts/F7-mpis-copy.md
- Full proposal: PATHFINDER-2026-05-18/03-unified-proposal.md (U3)

Step 1 — delete the wrapper block at main.js:1498–1509:
  // ── MPIS public wrappers ───────────────────────
  async function copyToMpisSpine()      { ... }
  async function copyToMpisGeriatric()  { ... }
  async function copyToMpisCr()         { ... }
  async function copyToMpis()           { ... }
  async function copyToMpisAmputation() { ... }
  async function copyToMpisNeuro()      { ... }
  async function copyToMpisHand() { ... }

Step 2 — remove these lines from the Main return object (main.js:~1650–1656):
    copyToMpis:               copyToMpis,
    copyToMpisSpine:          copyToMpisSpine,
    copyToMpisGeriatric:      copyToMpisGeriatric,
    copyToMpisCr:             copyToMpisCr,
    copyToMpisAmputation:     copyToMpisAmputation,
    copyToMpisNeuro:          copyToMpisNeuro,
    copyToMpisHand:           copyToMpisHand,

Anti-pattern guards:
- Before deleting, grep templates/ for each function name to confirm zero HTML call sites
- Do NOT touch copyToMpisAuto — that is the live dispatcher
- Do NOT touch the builder functions (_buildMpisMs, _buildMpisSpine, etc.) — those are called by copyToMpisAuto via its switch
- After edit: node --check static/js/main.js
```

---

## Prompt 3 — U4: Delete dead files

```
Target: delete static/js/form.js, pdf_generator.py, and orphaned comment in pdf_amputation.py

Context:
- static/js/form.js is a pre-refactor MS form (~300 lines). Not loaded in any template. Would conflict with window.Form if loaded.
- pdf_generator.py is the original canvas-based MS PDF generator (~300 lines). Not imported in app.py, not in _PDF_GENERATORS, not in _SINGLE_PDF_GENERATORS. Still listed in pt_assessment.spec.
- pdf_amputation.py:341 has an orphaned comment `# ── Left column / Right column split ──` that appears after `return story` — unreachable position.
- Reference: PATHFINDER-2026-05-18/02-duplication-report.md (D4, D5, D7)

Step 1 — delete static/js/form.js

Step 2 — delete pdf_generator.py

Step 3 — open pt_assessment.spec, find the line that references pdf_generator.py in the datas list, remove it. (form.js is NOT in the spec — confirmed.)

Step 4 — remove pdf_amputation.py:341 (the orphaned comment line `# ── Left column / Right column split ──`)

Anti-pattern guards:
- Before deleting form.js: grep templates/ for 'form.js' to confirm it's not script-tagged anywhere
- Before deleting pdf_generator.py: grep app.py for 'pdf_generator' to confirm it's not imported
- Do NOT delete pdf_base.py — it is still used by pdf_platypus_base.py:54 via try/except import for BodyChartFlowable
- After removing from spec: verify pt_assessment.spec still lists all active pdf_*.py files (pdf_ms, pdf_spine, pdf_geriatric, pdf_cr, pdf_amputation, pdf_neuro, pdf_hand, pdf_platypus_base, pdf_base)
```
