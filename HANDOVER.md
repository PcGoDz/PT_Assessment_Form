# HANDOVER.md — Current Session State

Last updated: 2026-06-11

---

## Where we left off

SCI stamp-button cosmetic restyle — **shipped**. The three grid stamp buttons (`stampSensoryNT`,
`stampMmtNT`, `stampUprightNA`, all sharing `.grid-stamp-btn`) went from flat dashed-ghost to a
**filled-tonal M3** treatment: `background:var(--accent-light); color:var(--accent)`, no border,
`border-radius:20px` pill, `font-weight:500`, hover deepens to `--accent-mid` + white, `:active
scale(0.98)`. Matches the existing `.chip.active` / `.nav-item.active` recipe in `style.css` (same
token pair), so it's consistent with canon, not a new invention. Dark mode handled free by the token
flip. CSS-only, scoped `<style>` block in `templates/forms/sci.html`. No HTML/JS/logic/DB/PDF touched.

Final vertical spacing after a long tuning chase: `margin:-10px 0 16px` (~10px above / 16px below).
The extra bottom room is a deliberate optical correction for the card-header's visual weight pressing
down — Miruya tuned it live in DevTools. Six commits on branch `claude/vigorous-lehmann-32404d`,
merged `--no-ff` to main as `33887fe`, pushed to origin. Verified on origin/main: final margin in
pushed bytes, branch deleted.

---

## Half-done

Nothing mid-flight. Clean tree on main (`33887fe`).

---

## Next session priorities

1. **Fix B — DB migration versioning.** `PRAGMA user_version` gates in `database.py` (lines 80-101).
   GREENLIT. Test against a COPY of the real DB; keep `try/except` INSIDE the v0→v1 gate. Miruya does
   NOT review backend — his job after is clinical testing only (open forms → save → reload → confirm
   data survived). Needs full brain + test-on-a-copy ritual — not an end-of-day hour.
2. **SCI abbreviation legend / inline letter-expansion.** Parked tonight. Two competing approaches
   surfaced: (a) a separate legend/key, or (b) expand the single-letter cell values inline to full
   words (NT → Not Tested etc.). CLINICAL INPUT NEEDED FIRST — same letter means different things per
   grid (e.g. `A` = Absent in sensory vs Assisted in functional), so wrong expansion = silent
   clinical-accuracy bug. Miruya confirms per-grid wording + decides screen/PDF/MPIS scope + column
   width impact BEFORE build. Full abbreviation list in BACKLOG.
3. **Next form scoping** — the creative one. Front-half pipeline (transcribe → classify → sequence →
   assess backbone → lightest impl) per FORM_PIPELINE.md. Form not yet picked — chat-window decision.

---

## Gotchas discovered this session

- **Specificity decides which CSS rule wins — tune against the COMPUTED style, not the source file.**
  Spent three spacing passes tuning against `.card-body { padding:18px }` (style.css:453) when the
  form runs inside `<main class="m3-main">`, so the MORE-SPECIFIC `.m3-main .card-body { padding:
  var(--sp-5) var(--sp-6) }` (style.css:1809, = 20px) actually applied. The "number's right but it
  still looks off" symptom = you're computing against a rule the cascade overrode. Fix: read the
  element's Computed tab / box-model in DevTools for the REAL applied value before doing margin math.
  Candidate for WORKFLOW Anti-Repeat (added).
- **Cowork sandbox mounts MAIN, not the worktree — read committed bytes via the BRANCH, not HEAD.**
  `git show HEAD:...` returned stale main code; `git show claude/<branch>:...` returned the real work.
  The worktree folder shows `prunable` in `git worktree list` because it isn't mounted in the sandbox.
  Already a WORKFLOW two-window rule; re-confirmed live tonight.
- **`vigorous-lehmann-32404d` worktree folder still on disk.** Windows blocked `git worktree remove`
  (CC session CWD inside it). Branch deleted + pruned fine; folder needs manual `rmdir /s /q` once the
  CC window closes. Same as optimistic-banzai / eloquent-williamson strays — added to BACKLOG.

---

## What to skip for now

The full SCI/app UI redesign (look-feel + page wiring — the "real dress" Miruya itches for) — its own
session with a fresh brain + clean runway, not a tired hour. VESTIBULAR / FACIAL / remaining NO forms.
See BACKLOG.md for the full deferred list.
