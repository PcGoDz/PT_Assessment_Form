# ARCHIVE — HANDOVER snapshot when FACIAL execution was parked at the gate
# Captured 2026-06-14, before FACIAL build session opened.
# FACIAL built + merged 2026-06-17 (tip 412ae7d). This file preserved for chronology.

---

# HANDOVER.md — Current Session State

Last updated: 2026-06-13

---

## Where we left off

Fix B (PRAGMA user_version gated schema migrations) shipped and merged to main (`943cde7`). `database.py` lines 79–108 now read `PRAGMA user_version`, gate v0→v1 (soap_notes session-header cols) and v1→v2 (episodes next-appt/discharge cols), with inner `try/except sqlite3.OperationalError` inside each gate as one-time transition net for mid-air DBs (already have columns but report `user_version=0`). Stamps to 2 unconditionally. Verified live on real DB copy: 0→2, then 2→2 (idempotent). 7 commits pushed to origin: Fix B merge+commit + 5 parked SCI legend commits.

Branch/worktree cull done: all three `claude/*` branches deleted (jolly-hodgkin-245daf, nice-mahavira-6a9cb1, elastic-mayer-cb8c07 — all confirmed `--merged main`). `git worktree prune` run. One worktree folder lingers on disk (Windows CWD lock — see Half-done).

---

## Half-done

- `PT_Assessment-worktrees/jolly-hodgkin-245daf` folder lingers on disk (branch deleted, registration pruned — only the folder remains, Windows CWD lock prevents removal mid-session). Safe to `rmdir /s /q PT_Assessment-worktrees\jolly-hodgkin-245daf` from Explorer/cmd once this session closes.

---

## Next session priorities

1. Manual `rmdir /s /q PT_Assessment-worktrees\jolly-hodgkin-245daf` if folder still present.
2. Webinar brainstorm (20 Jun) — scope and prep.
3. Next-form scoping — decide which form activates next.

---

## What to skip for now

UI revamp. VESTIBULAR / FACIAL / PAEDIATRIC / LYMPHOEDEMA / NCD / GENERAL forms. Functional-scale "With guidance" change. See BACKLOG.md for full deferred list.
