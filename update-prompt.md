# Update Project Files — Hierarchical Structure

Update project documentation files at end of session. Follow ALL rules. If any requirement cannot be met, STOP and output:
`ERROR: project file update requirements not fully satisfied`

---

## File Structure Reminder

The project uses a hierarchical structure (refactored 2026-05-16, DESIGN_SYSTEM.md added 2026-05-19, WORKFLOW + DESIGN_SYSTEM split 2026-06-10):

- `CLAUDE.md` — lean root: axioms + architecture + context index. STABLE, rarely changes.
- `RULES.md` — behavioral rules for working with the user. STABLE, rarely changes.
- `WORKFLOW.md` — procedures, patterns, debugging. UPDATES when patterns evolve.
- `FORM_PIPELINE.md` — how to build a new form start to finish: front-half design pipeline, milestone ladder, 13-step checklist, initFormContext. UPDATES when the form-build process evolves.
- `DESIGN_SYSTEM.md` — UI patterns for form templates (HTML). UPDATES when UI primitives or component recipes evolve.
- `DESIGN_SYSTEM-pdf.md` — PDF output patterns (ReportLab/Platypus). UPDATES when PDF primitives or recipes evolve.
- `HANDOVER.md` — current session state. **OVERWRITE EACH SESSION**, do not append.
- `BACKLOG.md` — known issues, deferred work, persistent reminders. UPDATES as bugs found/fixed.
- `ARCHIVE/` — historical handover notes. Add previous HANDOVER.md here before overwriting.

---

## Step 1: Archive Previous HANDOVER.md

BEFORE overwriting HANDOVER.md, copy its current content to:
`ARCHIVE/handover-YYYY-MM-DD-<short-topic-slug>.md`

Where YYYY-MM-DD is the date in HANDOVER.md's `Last updated:` field and topic-slug is a 2-4 word kebab-case summary (e.g. `hand-form-implementation`, `mpis-modal-refactor`, `discharge-fix`).

Do NOT skip this. Without archiving, session history is lost.

---

## Step 2: Overwrite HANDOVER.md

Replace HANDOVER.md entirely with current session content. Use this exact structure:

```markdown
# HANDOVER.md — Current Session State

Last updated: YYYY-MM-DD

---

## Where we left off

[1-2 short paragraphs. Specific files modified, specific decisions made. NO vague summaries.]

✔ GOOD: "Implemented HAND form across 14 files. Critical bug fixed before push: HAND_SOAP was in templates[] flat dict instead of TEMPLATES[]."
❌ BAD: "Worked on hand form. Fixed some bugs."

---

## Half-done

[Bulleted list of work in progress but not finished. Specific file names where applicable.]

✔ GOOD: "- pdf_hand.py has unused imports (Table, TableStyle, colors, CW, ML, MR, MT, MB)"
❌ BAD: "- Some cleanup needed"

---

## Next session priorities

[Ordered list, 1-5 items, most important first. Concrete actions.]

✔ GOOD: "1. Git push — git add -A && git commit -m 'session checkpoint' && git push"
❌ BAD: "1. Maybe do some testing"

---

## Gotchas discovered this session

[Bulleted list of traps/lessons learned this session. If the gotcha is permanent enough to be a rule, flag it for migration to WORKFLOW.md or DESIGN_SYSTEM.md.]

✔ GOOD: "- HAND_SOAP must live in TEMPLATES (const), not templates (flat dict). Migrated to WORKFLOW.md JS Rules section."
❌ BAD: "- Found some issues"

---

## What to skip for now

[Brief list of deferred work. Reference BACKLOG.md for full list.]
```

---

## Step 3: Update BACKLOG.md

Update each section based on this session's changes:

- **Open bugs / Cleanup:** Add new bugs found. Remove fixed bugs. Do NOT re-list fixed items.
- **Deferred work:** Add new "we'll do this later" items.
- **Nice-to-haves:** Add new ideas that surfaced.

Format consistency:

✔ GOOD: "- pdf_hand.py unused imports: Table, TableStyle, colors, CW, ML, MR, MT, MB — harmless but noise."
❌ BAD: "- Some imports issue"

Do NOT rewrite the persistent git push reminder at the top. Leave it as-is.

---

## Step 4: Update WORKFLOW.md (ONLY IF RULES CHANGED)

Update WORKFLOW.md ONLY if this session established a new pattern, rule, or procedure that should apply to future work.

Triggers for update:
- A bug was bad enough that the FIX should be documented as a rule (e.g. HAND_SOAP TEMPLATES vs templates)
- A new shared pattern was introduced (e.g. MPIS builder/wrapper/finalizer)
- An existing procedure changed
- A new anti-repeat rule emerged

If updating:
- Add to the appropriate existing section (JS Rules, PDF Rules, Anti-Repeat Rules, etc.)
- Do NOT create a new top-level section unless absolutely necessary
- Match the existing tone and format
- Do NOT remove or reformat existing rules

If nothing in this session changed the WORKFLOW, do not touch the file.

---

## Step 4.5: Update DESIGN_SYSTEM.md (ONLY IF FORM-HTML/UI PATTERNS CHANGED)

Update DESIGN_SYSTEM.md ONLY if this session changed how form UI (HTML) should look or be structured. PDF patterns go in DESIGN_SYSTEM-pdf.md (Step 4.6), NOT here.

Triggers for update:
- A new layout primitive was introduced (rare — these are foundational)
- A new component recipe was built and is reusable across forms (e.g. a new chart canvas type, a new chip variant)
- An anti-pattern was discovered that needs flagging (e.g. "don't use X here because Y breaks")
- The canonical reference form changed (very rare)
- A CSS class used by the design system was renamed or restructured

If updating:
- Layout primitives section is the most stable — only add here if a truly new foundational pattern emerged
- Component recipes section is where most additions land — new reusable HTML+CSS patterns go here
- Anti-patterns section grows over time as failures are caught — append, don't reorganize
- Match existing tone (firm on primitives, lenient on form-specific structure)
- Do NOT remove existing primitives without explicit user discussion

Do NOT update for:
- One-off styling tweaks inside a single form
- CSS class renames that don't affect cross-form patterns
- Cosmetic adjustments to ms.html that don't change the visual canon

If nothing in this session changed UI patterns, do not touch the file.

---

## Step 4.6: Update DESIGN_SYSTEM-pdf.md (ONLY IF PDF PATTERNS CHANGED)

Update DESIGN_SYSTEM-pdf.md ONLY if this session changed how form PDFs (ReportLab/Platypus) should be built.

Triggers for update:
- A new PDF primitive was introduced in `pdf_platypus_base.py` (e.g. a new shared building block)
- A new PDF component recipe is reusable across form generators (e.g. a new table convention, a layout helper)
- A PDF anti-pattern was discovered that needs flagging
- A column convention or width standard for clinical tables changed

If updating:
- Match existing tone and the form-html sibling's structure
- Anti-patterns and component recipes are where most additions land — append, don't reorganize
- Do NOT duplicate form-HTML patterns here — those belong in DESIGN_SYSTEM.md

If nothing in this session changed PDF patterns, do not touch the file.

---

## Step 4.7: Update FORM_PIPELINE.md (ONLY IF THE FORM-BUILD PROCESS CHANGED)

Update FORM_PIPELINE.md ONLY if this session changed HOW a new form gets built start to finish.

Triggers for update:
- The front-half design pipeline (transcribe → classify → sequence → assess backbone → brainstorm lightest) gained or lost a step
- The milestone ladder changed
- A step in the 13-step implementation checklist changed, or a new registry/site needs touching per form
- The initFormContext engine's responsibilities changed

If updating:
- Match existing tone; keep the front-half / ladder / checklist / initFormContext order intact
- The checklist is the section that drifts most as new hardcoded sites appear — keep it accurate
- Cross-references to DESIGN_SYSTEM.md (chip-vs-dropdown criteria) and WORKFLOW.md (MPIS pattern) stay as references, not duplicated content

If nothing in this session changed the form-build process, do not touch the file.

---

## Step 5: Update CLAUDE.md (ONLY IF ARCHITECTURE CHANGED)

Update root CLAUDE.md ONLY if structural changes happened:
- New form became ready (update Form Registry table)
- New file added to architecture (update Architecture Overview file map)
- New axiom established (rare)
- New companion file created (update "Where to find what" section)

Do NOT touch CLAUDE.md for:
- Bug fixes
- Cosmetic changes
- Workflow tweaks
- Anything that belongs in HANDOVER/BACKLOG/WORKFLOW/DESIGN_SYSTEM

If nothing structural changed, leave CLAUDE.md alone.

---

## Step 6: Do NOT Touch RULES.md

RULES.md captures behavioral preferences for working with the user. It changes only when the user explicitly asks to update it. Do not modify it during routine session updates.

---

## Global Constraints

- No fluff, no filler, no generic wording
- Prefer explicit details (file names, function names, line numbers) over summaries
- Maintain consistency with existing formatting and tone
- Do NOT introduce new section styles or formatting conventions
- Do NOT touch ARCHIVE/ entries that already exist (only ADD new ones)
- Keep all files under 250 lines (HANDOVER.md under 100). If a file approaches the ceiling, flag it for splitting in HANDOVER.md gotchas section.

---

## Final Validation Checklist

Before declaring done, verify:

- [ ] Previous HANDOVER.md content moved to ARCHIVE/handover-YYYY-MM-DD-topic.md
- [ ] New HANDOVER.md written with all 5 sections complete (Where we left off, Half-done, Next session priorities, Gotchas, What to skip)
- [ ] BACKLOG.md reflects current bug/deferred state (no duplicates, no fixed items still listed)
- [ ] WORKFLOW.md updated ONLY if a new rule or pattern was established (otherwise untouched)
- [ ] DESIGN_SYSTEM.md updated ONLY if a form-HTML/UI primitive/recipe/anti-pattern changed (otherwise untouched)
- [ ] DESIGN_SYSTEM-pdf.md updated ONLY if a PDF primitive/recipe/anti-pattern changed (otherwise untouched)
- [ ] FORM_PIPELINE.md updated ONLY if the form-build process/checklist changed (otherwise untouched)
- [ ] CLAUDE.md updated ONLY if architecture/registry changed (otherwise untouched)
- [ ] RULES.md NOT touched
- [ ] No file exceeds line limit (CLAUDE.md ≤250, RULES.md ≤250, WORKFLOW.md ≤250, FORM_PIPELINE.md ≤250, DESIGN_SYSTEM.md ≤250, DESIGN_SYSTEM-pdf.md ≤250, HANDOVER.md ≤100, BACKLOG.md ≤250)
- [ ] No vague statements anywhere

If ANY check fails → output error only and do not commit.
