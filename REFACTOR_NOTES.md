# REFACTOR_NOTES.md — CLAUDE.md Refactor Summary

Date: 2026-05-16
Performed by: claude-md-refactor skill (dry-run via Claude chat)

---

## Before

- **CLAUDE.md** — 2385 lines, monolithic. Contained: project description, architecture, registries, rules, ~7 "Lessons Learned" sections, ~10 "HANDOVER NOTE" sections, TODO list, persistent reminders, M3 design notes.
- **Estimated context cost:** ~40% of context budget consumed just reading CLAUDE.md per session.

---

## After

| File | Lines | Purpose |
|------|-------|---------|
| `CLAUDE.md` | 130 | Lean root: axioms + architecture + context index |
| `RULES.md` | 87 | How to work with Miruya (behavioral rules) |
| `WORKFLOW.md` | 189 | Procedures: adding forms, MPIS pattern, PDF rules, debugging |
| `HANDOVER.md` | 42 | Current session state (2026-05-16 HAND form) |
| `BACKLOG.md` | 88 | Open bugs, deferred work, persistent reminders (git push), nice-to-haves |
| `ARCHIVE/lessons-learned-apr-may-2026.md` | 549 | Historical lessons-learned sections |
| `ARCHIVE/handover-notes-apr-may-2026.md` | 1429 | Historical session handover notes |
| `ARCHIVE/handover-2026-05-16-hand-form-full.md` | 92 | Full latest handover (HANDOVER.md is summary) |
| **Total root files** | **536** | **78% reduction in always-loaded content vs 2385** |

---

## What moved where

**Stayed in CLAUDE.md (root, always loaded):**
- Project description (what this is)
- Project axioms (stack, deployment, ship-crude philosophy, MPIS plain-text, KKM compliance)
- Architecture overview (file map, key registries)
- FORM_REGISTRY table
- PDF Routing rules (critical)
- window.Form contract
- Database overview
- Clinical context (compressed — NRIC, KKM refs, lung diagram convention)
- Pointers to companion files

**Moved to RULES.md:**
- "About Miruya" (skill level, partnership rules)
- Communication preferences (casual, dry humor, no AI-isms)
- Don't-do list (no reviewer chair, no wellness coaching, etc.)
- Health/safety notes (latex allergy, no pork)
- Cultural notes (Malay/English, coffee preference)

**Moved to WORKFLOW.md:**
- Adding a New Form — Full Checklist
- initFormContext() boilerplate engine
- MPIS Pattern (builder/wrapper/finalizer)
- PDF Generation Rules
- JS Rules (CRITICAL section)
- Code Editing Discipline
- Anti-Repeat Rules
- Debugging procedures
- Build & Deploy
- seed_db.py usage
- SOAP Templates per form
- Clinical Reference (expanded — NRIC, KKM, lung diagram, session header, POMR)

**Moved to HANDOVER.md:**
- Only the most recent session header (2026-05-16 HAND form)
- "Where we left off" / "Half-done" / "Next session priorities" / "Gotchas" / "What to skip"

**Moved to BACKLOG.md:**
- Persistent git push reminder
- Open bugs and cleanup items
- Deferred work (BURN form, age auto-calc, ARIA, etc.)
- Nice-to-haves
- Layout gotcha traps (two max-width sources, neutral topbar rules, M3 elevation tiers, discharge modal)

**Moved to ARCHIVE/:**
- All 7 "Lessons Learned" sections (~540 lines) → `lessons-learned-apr-may-2026.md`
- All 10 historical HANDOVER NOTE sections (~1400 lines) → `handover-notes-apr-may-2026.md`
- Full latest handover (the summary is in HANDOVER.md) → `handover-2026-05-16-hand-form-full.md`

---

## Categorization notes (ambiguous calls)

- **"Non-Negotiable Rules" section** in original CLAUDE.md — split between root (axioms) and WORKFLOW.md (procedural rules). The dependency/UX/clinical rules became axioms. The JS/PDF/code-editing/anti-repeat rules became procedural workflow.
- **M3 design notes** — went to BACKLOG.md rather than WORKFLOW.md because they're reference for future UI work, not active procedures.
- **The Two Max-Width Sources gotcha** — went to BACKLOG.md as a known trap. Could argue for WORKFLOW.md but it's more of a "watch out for this" than a "do this when".
- **Clinical context (NRIC, KKM refs)** — duplicated in compressed form in CLAUDE.md and expanded in WORKFLOW.md. Intentional — CLAUDE.md needs enough for quick lookups; WORKFLOW.md has the full version when actually implementing.

---

## Nothing was deleted

Every chunk from the original 2385-line CLAUDE.md is now somewhere:
- Active rules → CLAUDE.md / RULES.md / WORKFLOW.md / BACKLOG.md
- Historical context → ARCHIVE/

Total content preserved: 100%. Total content always loaded: reduced from 2385 lines to ~448 lines (the root + RULES + WORKFLOW + HANDOVER + BACKLOG that load by default), plus only ~130 lines of CLAUDE.md is the absolute "must-read" for every session.

---

## Suggestions for next steps

1. **Drop the new file tree into your project**, overwriting the old CLAUDE.md.
2. **Test a Claude Code session** and check `/context` to confirm reduced consumption.
3. **Going forward**, when a session ends:
   - Update HANDOVER.md (overwrite, don't append)
   - Move the previous HANDOVER.md to ARCHIVE/ with date+topic in filename
   - Add any new known issues to BACKLOG.md
   - CLAUDE.md / RULES.md / WORKFLOW.md should stay stable across sessions
4. **If WORKFLOW.md grows past 250 lines** in future, consider splitting by domain (e.g. WORKFLOW-FORMS.md, WORKFLOW-PDF.md, WORKFLOW-MPIS.md).
5. **Subdirectory CLAUDE.md option:** Claude Code supports `static/js/CLAUDE.md` etc. for path-specific rules. If JS rules grow heavy, consider moving them to `static/js/CLAUDE.md` which auto-loads only when working on JS files.

---

## Caveats

This was a dry-run via Claude chat (not a Claude Code session). The skill itself (`claude-md-refactor`) was drafted but not yet installed. To install it, package the skill folder as a `.skill` file and add to your Claude Code skills directory.

If anything in the refactored files looks wrong (categorization, missing content, formatting), the original CLAUDE.md remains intact at `/mnt/user-data/uploads/CLAUDE.md` — nothing was destroyed.
