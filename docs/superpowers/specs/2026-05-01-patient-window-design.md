# Patient Window Design Spec

**Goal:** Make the PT Assessment app patient-oriented — hide irrelevant dashboard stats when a patient is in focus, and give every assessment form a persistent patient context panel accessible from the topbar.

**Architecture:** Three coordinated changes: (1) home screen stats accordion, (2) patient chip in form topbars, (3) slide-in patient panel with editable next appointment. A new `next_appt` / `next_appt_time` column pair on the `episodes` table is the authoritative data source for the chip and panel.

**Tech Stack:** Vanilla JS, CSS transitions (cubic-bezier), Flask/SQLite, existing modal infrastructure.

---

## Component 1 — Home Screen Stats Accordion

**Behaviour:**
- Default state (no patient selected): stats dashboard visible as today.
- When a patient row is clicked: stats block collapses upward with `max-height` + `opacity` transition using `cubic-bezier(0.4, 0, 0.2, 1)` easing (400ms). Patient detail view expands to fill the space.
- When "← All Patients" is clicked: stats re-expand with the same easing in reverse.

**Implementation:**
- `home.html` — wrap the existing stats `<div>` in a container with `id="stats-panel"`. Add CSS transition: `max-height 0.4s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease`.
- The existing `showPatient(id)` JS function (or equivalent) calls `collapseStats()`. The existing back-to-list call calls `expandStats()`.
- `collapseStats()`: sets `stats-panel` `max-height` to `0`, `opacity` to `0`, `overflow` to `hidden`.
- `expandStats()`: restores `max-height` to measured height (or a safe large value like `200px`), `opacity` to `1`.
- No new pages, no new routes. The home screen is context-aware within the same view.

---

## Component 2 — Patient Chip in Topbar

**Behaviour:**
- Visible only when the form is opened in episode context (i.e., `episodeId` is present in `page-context` meta tag).
- Displays: `[Avatar initials] Patient Name · DD Mon HH:MM` where the date/time is the episode's `next_appt` + `next_appt_time`.
- If no next appointment is set, shows: `[Avatar] Patient Name`.
- Clicking the chip opens the slide-in patient panel (Component 3).
- The chip sits at the left of the topbar actions row, before the existing form action buttons.

**Implementation:**
- `main.js` `initFormContext()` — after patient prefill, if `episodeId` is present, inject the patient chip into `#topbar-nav-group` (left side).
- Chip markup: `<button class="pt-chip" id="pt-context-chip">...</button>`.
- Next appt data fetched from `/api/episodes/<id>` (already exists) and read from `next_appt` / `next_appt_time` fields.
- Chip label updated whenever the panel saves a new next appointment.

---

## Component 3 — Slide-in Patient Panel

**Behaviour:**
- Opens when the patient chip is clicked.
- Slides in from the right edge of the viewport. Form content dims to `opacity: 0.4` behind a semi-transparent overlay.
- Clicking the overlay or pressing Escape closes the panel.
- Panel content (top to bottom):
  1. Avatar circle (initials, coloured by name hash) + full name + patient type badge (Malaysian / Foreign)
  2. Info grid: NRIC or Passport · DOB · Age · Sex
  3. Last visit date — latest SOAP `note_date` for this episode; falls back to the assessment record's `patient_date` if no SOAP notes exist yet; shows "No visits yet" if neither exists.
  4. Next appointment — **inline editable**: date input + time input side by side. A small ✓ save button appears on change. Saves to `episodes.next_appt` and `episodes.next_appt_time` via `PATCH /api/episodes/<id>/appt`.
  5. Divider
  6. **Edit Patient** button — opens the patient edit modal. The modal markup moves from `home.html` into `base.html` so it is available on all pages. The panel triggers it directly with no navigation required.
  7. **Episode History** button — navigates to `/episode/<id>` (the existing episode detail page).

**Implementation:**
- Panel markup injected into `base.html` as a hidden `<div id="pt-panel">` + `<div id="pt-panel-overlay">`.
- CSS: panel uses `transform: translateX(100%)` → `translateX(0)` with `transition: transform 0.3s cubic-bezier(0.4,0,0.2,1)`.
- `main.js` — `openPatientPanel()` / `closePatientPanel()` functions. Panel populated from patient JSON already in the page + episode data fetched once on open.
- New API endpoint: `PATCH /api/episodes/<id>/appt` — accepts `{ next_appt, next_appt_time }`, updates the episode row, returns updated episode.
- After successful save: update chip label in topbar without page reload.

---

## Component 4 — Data: Episode Next Appointment

**Schema change:**
```sql
ALTER TABLE episodes ADD COLUMN next_appt      TEXT DEFAULT '';
ALTER TABLE episodes ADD COLUMN next_appt_time TEXT DEFAULT '';
```
Added via safe migration in `init_db()` using the existing `try/except sqlite3.OperationalError` pattern.

**API endpoint:**
```
PATCH /api/episodes/<id>/appt
Body: { "next_appt": "2026-05-02", "next_appt_time": "09:30" }
Returns: { "ok": true, "next_appt": "...", "next_appt_time": "..." }
```

**Read path:** `GET /api/episodes/<id>` already exists — add `next_appt` and `next_appt_time` to its response.

**Relationship to SOAP notes:** SOAP notes continue to store `next_appt` / `next_appt_time` per session (unchanged). The episode-level columns are the authoritative "current next appointment" displayed in the chip and panel. They are independent — updating from the panel does not touch SOAP notes.

---

## CSS additions (style.css)

- `.pt-chip` — pill button in topbar, left-aligned, shows avatar circle + name + next appt.
- `#pt-panel` — fixed right panel, `width: 280px`, slide-in transform transition.
- `#pt-panel-overlay` — full-viewport semi-transparent overlay behind panel.
- `#stats-panel` — transition wrapper for home screen stats accordion.
- Dark mode variants for all new elements.

---

## Files changed

| File | Change |
|------|--------|
| `database.py` | Add `next_appt` / `next_appt_time` columns to episodes via migration. Add `update_episode_appt()` function. |
| `app.py` | Add `PATCH /api/episodes/<id>/appt` route. Update `GET /api/episodes/<id>` response to include new fields. |
| `templates/base.html` | Add `#pt-panel` + `#pt-panel-overlay` markup. Move patient edit modal markup here from `home.html`. |
| `static/js/main.js` | Add `openPatientPanel()`, `closePatientPanel()`, patient chip injection in `initFormContext()`. |
| `templates/home.html` | Wrap stats in `#stats-panel`, add `collapseStats()` / `expandStats()` calls. |
| `static/css/style.css` | Add `.pt-chip`, `#pt-panel`, `#pt-panel-overlay`, `#stats-panel` styles + dark mode. |

---

## Out of scope

- Appointment management system (scheduling, calendar, reminders) — not in this spec.
- Last appointment shown across multiple episodes — panel shows last visit for the **current active episode** only.
- The "Edit Patient" modal itself — already implemented, just wired up.
