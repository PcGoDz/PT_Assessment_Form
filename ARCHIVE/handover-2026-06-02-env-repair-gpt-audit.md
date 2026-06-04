# HANDOVER.md — Current Session State

Last updated: 2026-06-02

---

## Where we left off

No project code changed this session. Two threads: (1) dev-environment repair, (2) audit of
an external (GPT) architecture review.

**Env repair:** A Windows update broke the `python` command — the real install
(`C:\Users\legac\AppData\Local\Python\pythoncore-3.14-64`, Python 3.14.3) was being shadowed by
the Microsoft Store stubs. Fix: disabled the `python.exe`/`python3.exe` App Execution Aliases
(Settings → Apps → Advanced → App execution aliases) and prepended the real Python dir + its
`Scripts` to the USER PATH. Installed Bun 1.3.14 (`C:\Users\legac\.bun\bin`) so the claude-mem
worker can run. Worker now live on `:37777`. claude-mem had ZERO prior observations — the timeline
starts from this session, so a timeline-report has no history to draw on yet.

**GPT review audit:** Verdict — two findings worth acting on (registry-sync footgun, migration
versioning); the rest (split app.py/database.py into blueprints/packages, dedupe form JS) rejected
as violating ship-crude + adding PyInstaller bundling risk for a single-user local .exe. Both
accepted fixes scoped below, neither started.

Prior session (2026-06-01, archived `handover-2026-06-01-burn-mpis-ship.md`): BURN shipped end to
end, Musculoskeletal group closed.

---

## Half-done

- None code-wise. Two fixes scoped but not started — see Next priorities + BACKLOG entries
  ("PDF generator dicts duplicate FORM_REGISTRY" and "No DB schema version tracking").

---

## Next session priorities

1. **Fix A — fold PDF generators into FORM_REGISTRY** (`app.py`, ~30 min). Add `pdf_episode`/
   `pdf_single` keys to each ready registry row; derive `_PDF_GENERATORS`/`_SINGLE_PDF_GENERATORS`
   via dict-comp; delete the two hand-maintained dicts (lines 25-45). Keeps `import pdf_*` above
   `FORM_REGISTRY`. Smoke test: one episode PDF + one single-record PDF, confirm no MS fallback.
2. **Fix B — DB migration versioning** (`database.py`, ~30-45 min). Replace `try: ALTER / except:
   pass` (lines 80-101) with `PRAGMA user_version` gates. CRITICAL: existing deployed DBs already
   have those columns but report `user_version=0` — keep `try/except` INSIDE the v0→v1 gate as
   belt-and-suspenders, then trust version numbers for v2 onward. Test against a COPY of the real
   `records.db`, never the original.
3. **SCI form build** (Neurological). The picked next form — was only in the chat passover note,
   now on disk. Heart is the ASIA/ISNCSCI chart (bilateral myotome/dermatome, light-touch/pin-prick
   grids, AIS grade, neuro level, complete vs incomplete). Borrows NEURO's bones but is genuinely
   the most involved form on the board — NOT a NEURO reskin. PLAN SLOW: read the NEURO form source
   + a real ASIA worksheet BEFORE prescribing anything or writing a CC prompt. Do Fix A first so
   SCI's PDF wiring is a one-row registry edit, not three scattered ones.

---

## Gotchas discovered this session

- **The SCI "next target" decision lived ONLY in the chat passover note — never on disk.** A cold
  read of the bible would have pointed at CSS fixes, not SCI. Lesson: build-direction decisions
  must land in HANDOVER, not just chat. Now captured (priority 3 above).
- **Registry drift is ONE systemic problem, not three paper-cuts.** Adding a form requires manually
  touching N hardcoded sites that should derive from `FORM_REGISTRY`: (a) the two PDF generator
  dicts, (b) `formLabel`/`form_icons` maps × 5 sites, (c) home.html + patient.html picker grids.
  BACKLOG documented (b) and (c) separately without naming the pattern. Fix A is the cleanest of
  the three and proves the "derive from registry" approach before tackling the JS/Jinja ones.
- **claude-mem was empty (no prior observations).** Timeline-report and passive recall have no
  history until this session's observations accumulate. Day 0 for auto-memory.

---

## What to skip for now

CSS batch (dark-mode `<select>` + `.mov-table-wrap` overflow), DESIGN_SYSTEM.md split (~312 lines,
over ceiling), `get_episode_record` form-aware, seed-data for smoke tests — all still parked in
BACKLOG / Deferred. Worktree branch `claude/practical-grothendieck-4cc345` + older
`cool-edison-f52354` folder persist on disk — housekeeping sweep when convenient.
