# HANDOVER.md — Current Session State

Last updated: 2026-06-12

---

## Where we left off

SCI per-grid abbreviation legend SHIPPED and merged to main (`3908e94`). Two-commit feature: v1 `440f547` — per-grid caption legends on screen (`form_sci.js` LEGENDS const + `_addLegend()`), PDF (`pdf_sci.py` `PDF_LEGENDS` dict + `_legend()`, verbatim KKM borang punctuation), MPIS (`_buildMpisSci` `[Key]` lines). v2 `5d82e4b` — screen upgraded to full-word dropdowns via additive `optionLabels` map on `AssessmentGrid` factory column configs; screen captions removed; PDF + MPIS unchanged. Clinical wording transcribed VERBATIM from KKM SCI.pdf, not guessed. Round-trip proven: screen shows "Not Tested", stored value stays `NT`; survived F5 reload; PDF/MPIS still print compact letters.

Fix B (DB migration versioning) BUILT on `claude/nice-mahavira-6a9cb1` — `database.py` lines 79–108 now use `PRAGMA user_version` gates: v1 gate adds soap_notes session-header cols, v2 gate adds episodes next-appt/discharge cols, each with inner `try/except` as one-time transition safety net (existing DBs have the columns but report `user_version=0`). NOT yet verified by Cowork and NOT merged — blocked mid-session by a `.git/config` torn-write snag (see Gotchas). Deferred to next session.

---

## Half-done

- Fix B awaiting verification + merge. Branch `claude/nice-mahavira-6a9cb1`, `database.py` lines 79–108. Needs: (1) Cowork `git show claude/nice-mahavira-6a9cb1:database.py | grep -A 30 "PRAGMA user_version"` to verify gate structure + inner `try/except`; (2) Miruya clinical-test on a COPY of `records.db` (Flask from worktree folder → open forms → save → reload → confirm data survived version bump); (3) merge to main.
- main is 4 commits ahead of origin — NOT pushed. Push deferred until Fix B lands.

---

## Next session priorities

1. Confirm `.git/config` healthy on both windows: `python -c "print(b'\x00' in open('.git/config','rb').read())"` → `False`; CC `git status` is the tiebreak.
2. Verify Fix B: Cowork `git show claude/nice-mahavira-6a9cb1:database.py | grep -A 30 "PRAGMA user_version"` — confirm v1/v2 gate structure + inner `try/except` present.
3. Miruya: clinical-test on DB copy → then real DB.
4. Merge `claude/nice-mahavira-6a9cb1` to main (after verification + clinical test pass).
5. Push all to origin in one go (5 commits ahead after Fix B merge).

---

## Gotchas discovered this session

- **`.git/config` torn-write from worktree churn — two forms seen 2026-06-12:** (a) trailing whitespace-only line → `fatal: bad config line N`, (b) null-byte (`\x00`) padding after rewrite → same error. Commits SAFE (live in `.git/objects`); config is only settings. Fix Windows-side: rewrite WHOLE file fresh via `open('.git/config','wb').write(content.encode('utf-8'))` (not append/trim — avoids torn tails); verify `python -c "print(b'\x00' in open('.git/config','rb').read())"` → `False`. Cowork sandbox config reads can lag behind CC's fix — tiebreak via CC `git status`. Anti-Repeat rule added to WORKFLOW.md.
- **`optionLabels` on `AssessmentGrid` is cross-form reusable** (dropdown shows full word, stores short letter — e.g. "Not Tested" on screen, `NT` stored; verified round-trip). DESIGN_SYSTEM.md is at 246 lines — adding the Component Recipe would breach 250-line ceiling. Split DESIGN_SYSTEM.md before next recipe addition; then backfill `optionLabels` recipe in Component Recipes.

---

## What to skip for now

UI revamp. VESTIBULAR / FACIAL / PAEDIATRIC / LYMPHOEDEMA / NCD / GENERAL forms. Functional-scale "With guidance" change. See BACKLOG.md for full deferred list.
