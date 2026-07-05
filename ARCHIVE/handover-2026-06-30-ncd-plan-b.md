# HANDOVER.md — Current Session State

Last updated: 2026-06-30

---

## Where we left off

NCD **Plan B** shipped, merged, and **pushed** — the per-visit measurements machine is live on `main`. Built across 7 tasks: v3 migration (`ncd_measurements` table with a **nullable `soap_id` FK** = alignment by construction, the cold-vet fix), DB functions (`save/get/delete_ncd_measurement`, upsert on the `(episode_id, soap_id)` natural key) + `delete_patient` cascade, Flask save/get/delete routes mirroring soap_notes, an **additive NCD-only measurements panel injected into the shared SOAP modal** (RED LINE held — non-NCD modal byte-for-byte unchanged), auto-write of the visit-1 assessment row on initial form save (idempotent via the NULL-soap_id upsert), and a **screen-only trend page** (`/episodes/<id>/ncd-trend`, transform/render split, inline-SVG sparklines, gap=null=break never zero). New files: `static/js/ncd_measure.js`, `static/js/ncd_trend.js`, `templates/ncd_trend.html`. Modified: `database.py`, `app.py`, `static/js/main.js`, `templates/episode.html`.

Commits `542c583`→`79a6df0`, trend `4d55df7`, RED-LINE hardening `49293fe`, merge **`2bb479c`**. `git push origin main` succeeded — origin/main now in sync at `2bb479c` (the whole 49-commit backlog is backed up). D1 verified structurally: the episode-PDF route hands the generator only (assessment, soaps, episode) — `get_ncd_measurements` is never in the PDF/MPIS path; export routes byte-for-byte untouched from Plan A.

---

## Half-done

- **Worktree `competent-hodgkin-2ec56c` pending manual folder delete** — branch `claude/competent-hodgkin-2ec56c` IS merged to main, but it's checked out in this live session's worktree, so git-side branch delete + `git worktree remove` both refuse while the session is open (Windows CWD lock). Once this session closes: `git worktree remove --force PT_Assessment-worktrees/competent-hodgkin-2ec56c && git worktree prune && git branch -d claude/competent-hodgkin-2ec56c`.
- **exe build deferred** — `build.bat`, then confirm the v3 migration runs cleanly on an existing v2 `pt_data/records.db` (launch exe → `PRAGMA user_version` becomes 3, `ncd_measurements` exists). `ncd_trend.html`/`ncd_trend.js`/`ncd_measure.js` bundle via the existing `('templates','templates')`/`('static','static')` globs — no `.spec` edit needed.

(`infallible-edison-fa5fc5` from prior sessions is now fully gone — folder deleted, not git-tracked. Resolved.)

---

## Next session priorities

1. **NCD measurements panel — density redesign (BURDEN-REDUCER, not cosmetic).** Current panel is a wall of bare full-width textboxes; the real use case (logging a ~10-patient group exercise cohort) makes it a scroll-marathon per visit. Group by Vitals/Bloods/BodyComp/Fitness, compact grid, NT/N-A stamps. See BACKLOG.
2. **New-follow-up panel draft-loss fix.** `saveSoapDraft` protects S/O/A/P + MPIS fields but NOT un-saved panel numbers — dismissing a brand-new follow-up loses typed measurements (SOAP text survives; editing a saved visit is fine, reloads by soap_id). Touches shared `saveSoapDraft`. See BACKLOG.
3. **exe build** + v3 migration check on a real v2 db (see Half-done).

---

## Gotchas discovered this session

- **Form-type guards in the shared SOAP modal must cover BOTH entry paths — new-note AND edit-existing-note.** Task 4's panel guarded `maybeShow` but NOT the `loadForSoap` fetch, so editing an EXISTING non-NCD note fired a stray `GET /ncd-measurements` (harmless, but violates "zero stray calls on non-NCD"). New-note passed the hands-on gate because no `soap.id` → fetch never fired; the edit path was the unguarded hole. Caught by reviewing own work against the literal criterion, fixed `49293fe`. **Migrated to WORKFLOW.md Anti-Repeat.**
- **Cascade delete order with a child FK:** `ncd_measurements.soap_id` → `soap_notes` means `delete_patient` must delete measurements BEFORE soap_notes, or the soap_notes delete trips a FK violation (`foreign_keys=ON`) and the whole transaction rolls back silently. Fixed in Task 2 (`8bf5fc8`).
- **`validate_patient` rejects names containing digits** — bit a smoke test named "Task5" (404 via NULL episode id). Test-data only; real clinical names are fine.
- **Doc line-count watch:** `DESIGN_SYSTEM.md` is at 280 (OVER the 250 ceiling, pre-existing + user-accepted "no ceiling concern" — prune prose before adding the next recipe). `WORKFLOW.md` now at 245 (approaching ceiling after this session's Anti-Repeat addition — prune candidate next time a rule lands).

---

## What to skip for now

VESTIBULAR / PAEDIATRIC / LYMPHOEDEMA / GENERAL forms — still not ready. See BACKLOG.md for the full deferred list (panel density redesign + draft-loss fix are the two fresh NCD items).
