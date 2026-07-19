# HANDOVER.md — Current Session State

Last updated: 2026-07-20

---

## Where we left off

VESTIBULAR fully activated end-to-end — form (16 sections, battery chips + KIV lock,
positioning-test scaffold), Best Statement templates, KKM PDF export, MPIS SOAPIER export.
All 4 milestones (FORM/TEMPLATES/PDF/MPIS) browser-smoke-tested and verified by Miruya.
Merged to main `--no-ff` at `235a241`, `ready=True`. Remaining NO-ready forms: PAEDIATRIC,
LYMPHOEDEMA, GENERAL.

---

## Half-done

- **Local `main` is 17 commits ahead of `origin/main` — merge not yet pushed.** Explicit next
  step per Miruya (push + stray-ref cleanup together).
- **Stray remote ref `origin/worktree-vestibular-form`** — doesn't match the branch actually
  used (`claude/vestibular-implementation-b1ec2d`), looks like leftover from an earlier/different
  push attempt. Flagged, not deleted — next-session cleanup.
- **`PT_Assessment-worktrees/vestibular-implementation-b1ec2d` — git-side pruned, folder
  lingers (Windows CWD lock, this session's own lock).** Branch `claude/vestibular-implementation-b1ec2d`
  already deleted local + remote. Manual `rmdir /s /q` once no session holds the folder as CWD.
- exe build + v3 migration check on a real v2 db — still deferred (carried, low priority).

---

## Next session priorities

1. **Push main to origin + delete the stray `origin/worktree-vestibular-form` ref** — explicit
   next step, Miruya's call.
2. **PDF/MPIS polish/revamp session — its own spec/plan.** Collects: app-wide 2-column borang
   layout (all 15 forms via shared `pdf_platypus_base.py`), `pdf_vestibular.py` dead `BLACK`/`LGREY`
   imports + unused `baseline_label` param, soma/coord note-typed-without-status dropped from PDF,
   AROM/PROM+soma+coord rendering as bordered tables vs the borang's dotted-line fills, MPIS
   soma/coord printing raw `collect()` keys (`propUlR` etc.) instead of human labels, MPIS
   positioning-test line dropping latency/duration/symptoms (decide if POMR needs them).
3. **DESIGN_SYSTEM.md (280/250) / WORKFLOW.md (248/250) split** — still blocked, unresolved
   from prior sessions. BACKLOG.md now also at 240/250, approaching the same wall.
4. PAEDIATRIC / LYMPHOEDEMA / GENERAL forms — still not ready.
5. exe build + v3 migration check (carried, lower priority than 1-3).

---

## Gotchas discovered this session

- **Flask template cache stale: `debug=False`, no `TEMPLATES_AUTO_RELOAD` → serves frozen
  templates AND frozen imported modules until the server restarts.** Two fixes to the KIV lock
  CSS looked correct in review but never reached the browser because the dev server had cached
  `vestibular.html` since before either fix existed. Root-caused by curling the live route
  directly and finding it still served pre-fix content. Rule going forward: verify the serving
  layer (curl the live route) before diagnosing a UI bug as code; restart the server after any
  template/JS/py edit, before browser testing. Cost 2 wasted rounds.
- **MPIS builders output plain clipboard text — never `escapeHtml()`.** It would corrupt `<`,
  `>`, `&` in clinical values (e.g. this form's own Vertigo Tempo chip, `< 3 days`, would paste
  as `&lt; 3 days`). Confirmed no sibling `_buildMpisXxx()` escapes — `escapeHtml()` in this
  codebase is reserved for `innerHTML` insertion only. Don't carry an escapeHtml instruction into
  future MPIS-builder prompts even if a spec section implies it.
- **KIV clear-on-engage (2026-07-19 Miruya clinical call) overrides the design spec's D4/§4.3
  non-destructive framing.** Reaching for KIV now means the section held no answers, not locked
  ones — engaging clears every control before locking; disengaging leaves it empty, no
  stash/restore. Spec corrected in place at
  `docs/superpowers/specs/2026-07-14-vestibular-form-design.md` (D4 table row + §4.3 point 2).
- **Windows CWD-lock worktree-folder gotcha recurred exactly as previously documented** — Nth
  session this has bitten end-of-session cleanup. Not new information, just confirms the BACKLOG
  entry is still accurate.

---

## What to skip for now

PDF/MPIS polish (2-column layout, cosmetic items, label fixes) — deferred to its own session,
do not attempt piecemeal inside unrelated work. PAEDIATRIC / LYMPHOEDEMA / GENERAL still not
ready. exe build + v3 migration check. Full deferred list in BACKLOG.md.
