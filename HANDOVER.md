# HANDOVER.md — Current Session State

Last updated: 2026-06-07

---

## Where we left off

Two threads this session: git housekeeping (Thread A) and SCI clinical templates shipped (Thread B).
Main is at `d32472d`. NOT pushed — Miruya pushes the whole SCI milestone in one go when PDF + MPIS are done.

**Thread A — Git housekeeping:**
Repo had 71 phantom-modified files when viewed from the Cowork Linux sandbox — pure CRLF↔LF churn,
`git diff --ignore-all-space` showed 0 real changes; Windows-side git only saw 3 truly-modified docs.
A stale `.git/index.lock` (0 bytes, no git process running) was blocking commits — removed after
confirming nothing held it (`tasklist | findstr git` empty).
Committed last session's uncommitted wind-down docs (BACKLOG, HANDOVER, WORKFLOW + 2 ARCHIVE files) → `f3c07a4`.
Added `.gitattributes` to permanently normalize line endings (text=auto; .py/.js/.html/.css/.md/.txt/.json/.spec
as text; .bat pinned `eol=crlf`; .db/.png/.jpg/.pdf/.ico as binary) → `2f3f58f`. Prevents phantom recurrence.

**Thread B — SCI clinical templates (`9f181ed`, `d32472d`):**
KKM Best Statement SCI doc (`13. SCI Final (1)_compressed.pdf`, pp.13-25) surfaced by Miruya —
unblocked the templates task. Content transcribed from the worked T6 ASIA-A example. Design decision:
scaffold-with-blanks style (KKM wording + grammar quirks preserved verbatim, T6-specific numbers blanked
to `__` for reuse across SCI levels). Plan-of-Treatment lines expanded from KKM's short headings into
fuller sentences (Miruya's call, burden-reduction). Extra clinically-suitable lines added and approved.

`TEMPLATES.SCI` added to `static/js/clinical_templates.js` (categories impression/stg/ltg/treatment,
6/6/6/7 entries). 4 `addButton` calls wired in `templates/forms/sci.html` existing DOMContentLoaded
(`pt-impression`/`stg`/`ltg`/`plan` → impression/stg/ltg/treatment; note plan→treatment matches
HAND/BURN/CR/GERIATRIC pattern). Field IDs identical to HAND. KKM grammar quirks preserved verbatim
per axiom — canary lines "Reduce sitting balance due lacks lower trunk stability" / "due to lacks lower
trunk stability and lower limb control" confirmed intact in committed bytes.
CLAUDE.md design-intent block added (burden-reduction guiding-value paragraph, subordinate to ship-crude).
Arrow char fixed `->` → `→` → `d32472d`.

Smoke-tested by Miruya — all 7 rows PASS (clinical wording + overall flow confirmed). Ship signal given.
FF-merged worktree branch `claude/elastic-mayer-cb8c07` → main. Worktree removed + pruned.
Prompt files (`CC-PROMPT-sci-templates.md`, `CC-PROMPT-sci-closeout.md`) deleted from working tree.

---

## Half-done

Nothing critical.

- **Worktree folder on Miruya's desk** — `PT_Assessment-worktrees\elastic-mayer-cb8c07` folder may
  still physically exist on disk (Windows file lock after session). Git no longer tracks it.
  Safe to delete manually.

---

## Next session priorities

1. **SCI Milestone-3** — `pdf_sci.py` + `pt_assessment.spec` entry. **HARD PRECONDITION:** Miruya
   must surface the KKM SCI FORM (the borang layout, not the Best Statement doc) as the visual
   baseline before PDF work starts. Four cell states must render distinctly in PDF (blank / NT /
   N-A / real value; greyed cells absent from getData()). Add `pdf_episode` + `pdf_single` to SCI
   FORM_REGISTRY row.
2. **SCI stamp button restyle** — NT stamp + "Mark block N/A" ghost placeholder cosmetic polish.
   Deferred from Milestone-2.
3. **Fix B** — DB migration versioning (`PRAGMA user_version` in `database.py`). Test against a
   COPY of the real DB — existing deployed DBs report user_version=0 despite having
   soap_notes/episodes columns. Keep try/except INSIDE v0→v1 gate.
4. **Git push** — Miruya pushes the whole SCI milestone (form + polish + templates + PDF + MPIS)
   in one go when all rungs are done.

---

## Gotchas discovered this session

- **Cowork Linux sandbox shows phantom CRLF/LF dirtiness on a Windows checkout.** 71 files looked
  "modified" but `git diff --ignore-all-space` showed 0 real changes. `.gitattributes` added
  `2f3f58f` now normalizes. If 71-file ghost reappears, verify with `--ignore-all-space` before
  acting. Never `git add --renormalize` from Linux sandbox.
- **Stale `.git/index.lock` blocks all git ops.** Before deleting: confirm no real git running
  (`tasklist | findstr git` returns empty), then `del .git\index.lock`. 0-byte lock + no running
  process = stale, safe to remove.

---

## What to skip for now

PDF + MPIS for SCI (precondition: KKM borang not yet surfaced). Stamp-button restyling. Fix B.
VESTIBULAR / FACIAL / remaining NO forms.
