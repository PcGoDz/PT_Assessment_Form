# NCD_PANEL_DENSITY_SPEC.md — SOAP-modal measurements panel density redesign

Status: DESIGN LOCKED, ready for CC implementation plan. Author: Cowork (brain). Executor: CC (muscle).
Date: 2026-07-12.

---

## 1. What this is

The per-visit NCD measurements panel inside the shared SOAP modal (`#ncd-measure-panel` /
`#ncd-measure-grid`, built by `static/js/ncd_measure.js`) currently renders all 42 battery
fields as stacked-label cells in a 2-column grid — roughly **~1,300px** of vertical scroll per
visit. Real pain: logging a ~10-patient group-exercise cohort = that scroll-marathon × 10.

This is a **LAYOUT-ONLY density redesign**. It changes how the panel is drawn. It does NOT
change what data it holds, the field keys, or any public method contract.

---

## 2. The two clinical modes this must serve (the WHY)

Miruya (clinical owner) confirmed the panel is used two ways:

1. **Routine visit (dominant):** cherry-pick a couple of fields, time-boxed. Most fields left
   blank. Blank already means "not recorded" — unambiguous.
2. **Quarterly full-check (every 3 months post-intake):** run most/all of the battery.

Design consequence: make the sparse case tidy AND the full case frictionless — no clicking gate
between the clinician and any field. This is why we do NOT collapse the field groups (see §7
Rejected).

---

## 3. Chosen approach — "flat dense grid" (Option A)

Everything stays visible; the panel just gets tight. Three levers, in order of impact:

1. **Kill the stacked label** — biggest single win. Labels move from *above* the input to
   *inline beside* it. This roughly halves every row on its own.
2. **2 → 3 columns** on the short numeric fields.
3. **Note-fields → `+Note` chips** — the 6 optional freeform comment fields stop rendering as
   always-visible text rows; they collapse to a `+Note` chip that expands a box only on click.
   Reclaims ~5–6 empty rows. This is the exact pattern the main NCD form already uses
   (DESIGN_SYSTEM Rule 7 / `+Note` collapsible recipe).

Target result: panel drops from ~1,300px to ~600px — about half, ~2× denser. On the dept PC
modal (~700–800px usable once the SOAP textareas take their share) the quarterly full-check goes
from scroll-marathon to roughly one screen; routine cherry-pick fields sit near the top, barely
any scroll.

"About half" is a conservative floor driven by the label change alone, not a best case.

---

## 4. Layout spec (per group)

Panel keeps its 4 existing battery group bands, in existing order. Group headers already live in
the `BATTERY` config as `{ group: '...' }` entries — keep them, restyle tighter.

**Grid container** (`#ncd-measure-grid`): switch from the inherited 2-col `session-info-grid` to
a dense auto-fill grid so it lands on 3 columns at the modal's ~512px inner width:

```
display: grid;
grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
gap: 6px 10px;
```

**Group header cell:** full-width band (`grid-column: 1 / -1`), thin uppercase, muted. Same as
today, just less top margin. (Current inline style is fine — keep it.)

**Field cell (numeric / short-text):** an inline row — label left, input right:

```
cell:  display:flex; align-items:center; gap:6px;
label: font-size:12px; color:var(--text-muted); min-width sized per label; no wrap
input: height ~28px; font-size:12px; flex:1; min-width:0
```

- `bp` and `walk6Bp` are short free-text ("128/82") — render as normal inline inputs, NOT note
  chips. Their labels are short ("BP" / "6MWT BP"), so their inputs stay comfortably wide at
  3-across — no span or special handling needed.
- **Computed fields (`bmi`, `whr`):** stay inline in the Body Composition grid as read-only,
  muted-background inputs (as today). Live recompute on `height`/`weight`/`waist`/`hip` input is
  UNCHANGED — the existing listeners + `recompute()` stay exactly as they are.

**Note cell (the 6 comment fields):** render as a `+Note` chip that toggles a collapsed input.
All-JS, no stylesheet dependency — the chip button and the collapsed wrapper carry inline styles;
toggle flips the wrapper's `display`. Default collapsed. These are the 6 keys:

```
walk6Comment, step3Comment, flexComment, ulComment, llComment, balanceComment
```

A note chip should sit on its own full-width row under its group's numeric grid (so it doesn't
break the 3-col rhythm) — e.g. a chip strip spanning `grid-column: 1 / -1`.

---

## 5. Labels stay FULL — no cryptic shorthand (resolved by research 2026-07-12)

Checked whether the crowded labels have a standardized clinical shorthand. They do NOT — for the
segmental body-composition terms (`Subcut Fat Trunk/Arm/Leg`, `Muscle Trunk/Arm/Leg`) there is no
standard abbreviation; BIA/InBody reports simply spell out the segment. Inventing codes like
"SF trunk" would be locally vague on a clinical form and risks mis-ID / wrong-field data →
REJECTED. (Real standard abbreviations exist only for a few aggregates — SMM, VFA, RMR — and the
bloods already carry theirs: FBS, HbA1c, LDL, HDL.)

**Resolution: keep full labels.** 3-across still fits because the *values* are short (2–4 digit
numbers): a long label takes its natural width (`white-space:nowrap`) and the input flex-shrinks
to fill the rest of the track — a ~60px input still holds a 3-digit measurement. The one longer
value, BP "128/82", pairs with a short label ("BP"), so its input stays wide. No abbreviation, no
tooltip, no `span 2` gymnastics. This is also the clinically safer choice.

**Fallback (NOT built now — documented so it isn't re-derived):** if a future session wants to
claw back the last ~100px with even denser packing, the safe path is standard abbreviations ONLY
where one genuinely exists (SMM / VFA / RMR / blood panel) plus a native `title="<full name>"`
tooltip on the label. Never cryptic segmental codes.

---

## 6. HARD CONSTRAINTS (do not violate)

- **Battery keys are FROZEN.** All 42 keys stay verbatim (the `form_ncd.js collect()` comment
  block is the source of truth). This is a render change — no key is renamed, added, or removed.
- **Public method contract UNCHANGED.** `NcdMeasure.{maybeShow, collect, populate, clear,
  loadForSoap, save}` keep identical signatures and behavior. `collect()` still returns all 42
  keys (note fields read from their collapsed inputs). `populate(m)` still fills all 42 — and
  MUST auto-expand any note chip whose value is non-empty (mirror the main form's `NOTE_IDS`
  auto-expand on populate). `clear()` blanks all fields AND re-collapses every note chip.
- **Data-loss is the ship-stopper axiom, and this panel already bled once.** The new-follow-up
  draft-loss fix (`7d5caed`, 2026-07-07) depends on `collect()`/`populate()` round-tripping every
  key. The redesign is internal to `buildGrid()` DOM construction + note-toggle logic. Do not
  touch `saveSoapDraft()` / `openSoapModal()` in `episode.html`. Verify round-trip survives
  backdrop-dismiss after the change (same smoke test that guarded the fix).
- **Ship-crude / RED LINE.** Keep the redesign inside `static/js/ncd_measure.js`. The file's own
  header states panel logic is kept OUT of `episode.html`'s inline script to minimise edits to
  the shared file. Prefer setting the grid container's layout + all cell/label/chip styles via
  JS inline styles (the builder already sets styles inline). Target: **zero `episode.html`
  edits.** If a scoped style block there turns out unavoidable, keep it additive and flag it —
  do NOT edit `saveSoapDraft`/`openSoapModal`/the SOAP field markup.
- **No shared `style.css` edits.** No new global classes.
- **Screen-only. Never touches PDF or MPIS.** `ncd_measurements` never feeds export; this panel
  even less so. No `pdf_*.py`, no MPIS builder, no `main.js` changes.
- **`form_ncd.js` (the main initial-assessment form) is OUT of scope.** This is the SOAP-modal
  panel only.

---

## 7. Rejected / explicitly out of scope

- **NT/N-A bulk-empty stamp** (the scope-note's original idea): DROPPED. A blank measurement
  already means "not recorded" — unlike an assessment grid where blank is genuinely ambiguous, a
  stamp here marks nothing new. It would add controls and state for zero clinical gain.
- **Collapsible battery groups (Option B):** REJECTED. For repetitive cohort logging you enter
  the *same few fields* on every patient; accordions would tax you with a re-open click per
  patient, and collapse-state is extra `populate()`-restored state on a surface that just bled
  work. Flat-but-always-there beats it for the marquee case. Revisit only if flat density alone
  doesn't kill the pain in real use.
- **Any change to the 42-key contract, PDF/MPIS, or the main form.**

---

## 8. Files in scope

- `static/js/ncd_measure.js` — `buildGrid()` rewrite: dense grid container override, inline-label
  cells, tighter group bands, note-field rendering (chip + collapsed input + toggle), and
  `populate()` auto-expand for note fields with content / `clear()` re-collapse. New internal
  `type: 'note'` (or equivalent flag) on the 6 comment entries in `BATTERY` — a RENDER flag only,
  keys unchanged.
- `templates/episode.html` — target zero edits (see §6 RED LINE). Only if forced, additive
  scoped CSS, flagged.

---

## 9. Verification (post-implementation, before merge)

1. NCD SOAP modal opens → panel renders 3-col dense, 4 group bands, 6 note chips collapsed.
2. Fill a few fields + one note (expand chip, type) → save → reopen that visit → all values incl.
   the note round-trip, and the filled note's chip is auto-expanded.
3. New follow-up: type numbers, dismiss via backdrop, reopen → measurements survive (the
   `7d5caed` guard still holds).
4. `clear()` (New / reset path) blanks all fields and re-collapses all note chips.
5. Non-NCD form (e.g. MS) → panel stays hidden, zero `/ncd-measurements` calls (guard intact).
6. Eyeball at dept-PC modal width: full battery is ~one screen, no horizontal scroll, long labels
   not clipped.

Human gate: Miruya's own break-it pass on the worktree before merge (per WORKFLOW-176 — CC pushes
the BRANCH and STOPS; merge is done together).
