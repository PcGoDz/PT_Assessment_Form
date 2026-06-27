# SOAP Modal Draft Recovery — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop the SOAP follow-up modal from silently destroying a clinician's typed note when the modal is dismissed by a stray backdrop click — by holding the in-progress note in a per-episode localStorage draft that survives accidental dismissal and rehydrates on reopen.

**Architecture:** Mirror the assessment page's existing `saveDraft`/`restoreDraft`/`clearDraft` localStorage pattern (`main.js`), but scope the key per-episode (`pt_soap_draft_<EPISODE_ID>`) to avoid the known cross-form bleed bug of the global `pt_assessment_draft` key. Three additive touchpoints: stash on `input`, rehydrate inside `openSoapModal()` on the new-note path only, clear after a successful `saveSoap()`. Cancel button gets its own clear path so deliberate discard still wipes the draft while a stray backdrop click does not.

**Tech Stack:** Vanilla JS, localStorage. No new files, no libraries. All changes inside `templates/episode.html`'s inline `<script>`.

---

## RED LINE (do not cross)

- **Additive only. No modal restructure.** Do not change the modal markup, the field IDs, the `.modal-backdrop`/`.modal` DOM, or the open/close animation. The fix is new JS functions + three small wire-ins.
- **Per-episode key only.** The draft key MUST be `'pt_soap_draft_' + EPISODE_ID`. Do NOT reuse or touch the global `pt_assessment_draft` key — that key is a documented cross-form bleed vector (see BACKLOG.md). A single global key here would let one patient's draft surface on another patient's episode.
- **Draft applies to the NEW-note path only.** When `openSoapModal(soap)` is called WITH a `soap` argument (editing an existing saved note), load the real saved values — never overlay a draft. A draft must never pollute an edit of a different, already-saved note.
- **Backdrop click must NOT clear the draft.** That is the entire bug. Only an explicit Cancel or a successful Save clears it.
- **No-TDD-on-UI axiom in effect.** This project has no UI test suite and the bible forbids adding one. Verification is Miruya's manual smoke-test on the worktree. Each task ends with a concrete smoke gate, not an automated test.

---

## File Structure

Only one file changes:

- **Modify:** `templates/episode.html` — inline `<script>` block (~line 588 onward). Adds: a draft-key helper, a `saveSoapDraft()` stash function, a `clearSoapDraft()` function, a rehydrate call inside `openSoapModal()`, an `input` listener wire-up, a dedicated `cancelSoapModal()`, and a `removeItem` on save-success.

No new files. No changes to `main.js` (its draft system is for the assessment form, a separate concern — do not touch it).

---

## Current behavior (what's broken — read before editing)

In `templates/episode.html`:

- `openSoapModal(soap)` (~line 627): opens the modal. When called with no `soap` (the `+ Follow-up` button → `openSoapModal()`), it HARD-RESETS every field to `''` except date. When called with a `soap` object (Edit), it loads that note's saved values.
- `closeModal()` (~line 653): just removes the `.open` class. No persistence.
- Backdrop listener (~line 656): `if (e.target === this) closeModal();` — this is the stray-click path that loses work.
- Cancel button (~line 580): `onclick="closeModal()"` — currently identical to backdrop.
- `saveSoap()` (~line 679): POSTs the note, on success calls `closeModal()` + `showToast()` + `loadSoaps()` (~lines 706-708).

The eight fields that make up a draft (IDs): `soap-date`, `soap-s`, `soap-o`, `soap-a`, `soap-p`, `soap-queue-no`, `soap-kpi-30min`, `soap-seen-by`, `soap-next-appt`, `soap-next-appt-time`. (Ten total — date + 4 SOAP + 5 session-header. The hidden `soap-edit-id` is NOT part of the draft.)

---

## Task 1: Add draft-key helper + stash + clear functions

**Files:**
- Modify: `templates/episode.html` — add three functions in the `// ── Modal ──` region, immediately AFTER the existing `closeModal()` function (~line 658, after the backdrop listener).

- [ ] **Step 1: Add the draft helpers**

Insert this block immediately after the backdrop listener (after line ~658, the `});` that closes the `soap-modal` click listener):

```javascript
// ── SOAP draft recovery (per-episode, survives stray dismissal) ──
function soapDraftKey() {
  return 'pt_soap_draft_' + EPISODE_ID;
}

function saveSoapDraft() {
  // Only stash drafts for NEW notes, never while editing a saved note.
  if (document.getElementById('soap-edit-id').value) return;
  try {
    var draft = {
      date:           document.getElementById('soap-date').value,
      s:              document.getElementById('soap-s').value,
      o:              document.getElementById('soap-o').value,
      a:              document.getElementById('soap-a').value,
      p:              document.getElementById('soap-p').value,
      queue_no:       document.getElementById('soap-queue-no').value,
      kpi_30min:      document.getElementById('soap-kpi-30min').value,
      seen_by:        document.getElementById('soap-seen-by').value,
      next_appt:      document.getElementById('soap-next-appt').value,
      next_appt_time: document.getElementById('soap-next-appt-time').value
    };
    // Don't persist a draft that is empty apart from the auto-filled date.
    var hasContent = draft.s || draft.o || draft.a || draft.p ||
                     draft.queue_no || draft.kpi_30min || draft.seen_by ||
                     draft.next_appt || draft.next_appt_time;
    if (!hasContent) { clearSoapDraft(); return; }
    localStorage.setItem(soapDraftKey(), JSON.stringify(draft));
  } catch (e) {
    console.warn('SOAP draft save failed:', e);
  }
}

function clearSoapDraft() {
  try { localStorage.removeItem(soapDraftKey()); } catch (e) {}
}
```

- [ ] **Step 2: Syntax-check the file**

Because this is inline JS inside HTML, extract-and-check is the closest available lint. Run from the worktree root:

```bash
node -e "const fs=require('fs');const h=fs.readFileSync('templates/episode.html','utf8');const m=h.match(/<script>\n([\s\S]*?)<\/script>/g);console.log(m?('script blocks found: '+m.length):'NO SCRIPT FOUND');"
```

Expected: prints `script blocks found: N` (N ≥ 1) with no crash. This confirms the file still parses as readable text and the script block delimiters are intact. (A full JS parse of the inline block is not reliable because of the Jinja `{{ episode_id }}` token; the real verification is the browser smoke-test in Task 5.)

- [ ] **Step 3: Commit**

```bash
git add templates/episode.html
git commit -m "feat(soap): add per-episode draft stash + clear helpers"
```

---

## Task 2: Wire the stash to fire on every input in the modal

**Files:**
- Modify: `templates/episode.html` — replace the existing backdrop listener (~line 656) with a version that ALSO attaches an input listener.

- [ ] **Step 1: Replace the backdrop listener block**

Find this exact block (~line 656):

```javascript
document.getElementById('soap-modal').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});
```

Replace it with:

```javascript
document.getElementById('soap-modal').addEventListener('click', function(e) {
  if (e.target === this) closeModal();   // backdrop click closes WITHOUT clearing the draft
});
// Stash a draft on every keystroke / field change inside the modal (new-note path only).
document.getElementById('soap-modal').addEventListener('input', function() {
  saveSoapDraft();
});
```

- [ ] **Step 2: Confirm the replacement is clean**

Run from worktree root:

```bash
grep -n "addEventListener('input'" templates/episode.html
grep -n "backdrop click closes WITHOUT" templates/episode.html
```

Expected: both greps return exactly one line each. Confirms the input listener is wired and the backdrop comment marker is present (so we know we edited the right block, not a duplicate).

- [ ] **Step 3: Commit**

```bash
git add templates/episode.html
git commit -m "feat(soap): stash draft on every modal input"
```

---

## Task 3: Rehydrate the draft when reopening a NEW note

**Files:**
- Modify: `templates/episode.html` — `openSoapModal()` (~line 627-651). Add a rehydrate block at the END of the function, guarded to the new-note path.

- [ ] **Step 1: Add the rehydrate block inside openSoapModal()**

Find the end of `openSoapModal()`. The last two lines before its closing `}` are currently (~line 649-650):

```javascript
  document.getElementById('soap-modal').classList.add('open');
  setTimeout(function() { document.getElementById('soap-s').focus(); }, 100);
}
```

Replace those two lines (and the closing brace) with:

```javascript
  // If opening a NEW note (no soap arg) and a draft exists for this episode, rehydrate it.
  if (!soap) {
    try {
      var raw = localStorage.getItem(soapDraftKey());
      if (raw) {
        var d = JSON.parse(raw);
        if (d) {
          if (d.date)           document.getElementById('soap-date').value           = d.date;
          if (d.s)              document.getElementById('soap-s').value              = d.s;
          if (d.o)              document.getElementById('soap-o').value              = d.o;
          if (d.a)              document.getElementById('soap-a').value              = d.a;
          if (d.p)              document.getElementById('soap-p').value              = d.p;
          if (d.queue_no)       document.getElementById('soap-queue-no').value       = d.queue_no;
          if (d.kpi_30min)      document.getElementById('soap-kpi-30min').value      = d.kpi_30min;
          if (d.seen_by)        document.getElementById('soap-seen-by').value        = d.seen_by;
          if (d.next_appt)      document.getElementById('soap-next-appt').value      = d.next_appt;
          if (d.next_appt_time) document.getElementById('soap-next-appt-time').value = d.next_appt_time;
        }
      }
    } catch (e) {
      console.warn('SOAP draft restore failed:', e);
    }
  }
  document.getElementById('soap-modal').classList.add('open');
  setTimeout(function() { document.getElementById('soap-s').focus(); }, 100);
}
```

- [ ] **Step 2: Confirm the guard is present**

Run from worktree root:

```bash
grep -n "rehydrate it" templates/episode.html
grep -n "if (!soap) {" templates/episode.html
```

Expected: the `rehydrate it` comment returns one line; `if (!soap)` returns at least one line (the rehydrate guard). Confirms rehydrate is gated to the new-note path.

- [ ] **Step 3: Commit**

```bash
git add templates/episode.html
git commit -m "feat(soap): rehydrate draft on reopening a new note"
```

---

## Task 4: Clear the draft on Save-success and on explicit Cancel

**Files:**
- Modify: `templates/episode.html` — `saveSoap()` success path (~line 706) and the Cancel button (~line 580) + a new `cancelSoapModal()` function.

- [ ] **Step 1: Clear draft after a successful save**

In `saveSoap()`, find the success block (~line 705-708):

```javascript
    if (!res.ok) { showToast(j.error || 'Failed to save', 'err'); return; }
    closeModal();
    showToast(soapId ? 'Note updated' : 'Follow-up note saved', 'ok');
    loadSoaps();
```

Replace with:

```javascript
    if (!res.ok) { showToast(j.error || 'Failed to save', 'err'); return; }
    clearSoapDraft();   // note is now persisted in SQLite — draft has done its job
    closeModal();
    showToast(soapId ? 'Note updated' : 'Follow-up note saved', 'ok');
    loadSoaps();
```

- [ ] **Step 2: Add a dedicated cancel handler**

Immediately after `clearSoapDraft()` (added in Task 1), add:

```javascript
function cancelSoapModal() {
  // Explicit Cancel = deliberate discard. Clear the draft, then close.
  clearSoapDraft();
  closeModal();
}
```

- [ ] **Step 3: Point the Cancel button at the new handler**

Find the Cancel button (~line 580):

```html
      <button class="btn-ghost" onclick="closeModal()">Cancel</button>
```

Replace with:

```html
      <button class="btn-ghost" onclick="cancelSoapModal()">Cancel</button>
```

> NOTE: only the **Cancel** button changes. The top-right `×` close button (~line 503, `onclick="closeModal()"`) intentionally stays on `closeModal()` — treat the `×` like the backdrop: a soft dismiss that PRESERVES the draft. Do not change it.

- [ ] **Step 4: Confirm all three wire-ins**

Run from worktree root:

```bash
grep -n "clearSoapDraft()" templates/episode.html
grep -n "cancelSoapModal()" templates/episode.html
```

Expected: `clearSoapDraft()` returns 3+ lines (definition in Task 1, the save-success call, the cancel handler call). `cancelSoapModal()` returns 2 lines (the function definition + the button onclick). Confirms save-clear and cancel-clear are both wired.

- [ ] **Step 5: Commit**

```bash
git add templates/episode.html
git commit -m "feat(soap): clear draft on save-success and explicit cancel"
```

---

## Task 5: Manual smoke-test gate (HUMAN — Miruya)

**This is the verification step. No automated test exists for this UI layer by design (no-TDD-on-UI axiom). Miruya runs the worktree and confirms each case. STOP here and hand to Miruya.**

**Files:** none — this is verification only.

- [ ] **Step 1: Launch Flask from the WORKTREE folder**

Critical: run from `hardcore-khorana-a854b8`, NOT main. (See WORKFLOW.md Anti-Repeat — smoke-testing the wrong folder produces ghost results.)

```bash
# from the worktree root
python app.py
```

Open an episode that has the SOAP timeline (any episode with a `+ Follow-up` button).

- [ ] **Step 2: The core bug — stray backdrop click**

1. Click `+ Follow-up`. Modal opens, fields blank except date.
2. Type into S, O, A, P and a couple of session-header fields.
3. Click the dimmed backdrop OUTSIDE the modal. Modal closes.
4. Click `+ Follow-up` again.
5. ✅ PASS: every field you typed is still there. ❌ FAIL: fields are blank.

- [ ] **Step 3: Reload survival (the catastrophic case)**

1. Click `+ Follow-up`, type into a few fields.
2. Backdrop-click to close.
3. **Refresh the whole browser page (F5).**
4. Click `+ Follow-up`.
5. ✅ PASS: typed content survived the reload. ❌ FAIL: blank.

- [ ] **Step 4: Save clears the draft**

1. Click `+ Follow-up`, type a note, hit **Save Note**. Note appears in the timeline.
2. Click `+ Follow-up` again.
3. ✅ PASS: modal is BLANK (fresh note, no leftover draft). ❌ FAIL: the just-saved note's text is pre-filled.

- [ ] **Step 5: Cancel clears the draft**

1. Click `+ Follow-up`, type something.
2. Hit the **Cancel** button (not the backdrop).
3. Click `+ Follow-up` again.
4. ✅ PASS: modal is BLANK. ❌ FAIL: the cancelled text is still there.

- [ ] **Step 6: Edit path is not polluted by a draft**

1. Click `+ Follow-up`, type some text, backdrop-click to close (so a draft now exists).
2. In the timeline, click **Edit** on an EXISTING saved note.
3. ✅ PASS: the Edit modal shows the SAVED note's real values, NOT your draft text. ❌ FAIL: draft text overlays the saved note.

- [ ] **Step 7: Cross-episode isolation (no patient bleed)**

1. In episode A: `+ Follow-up`, type a draft, backdrop-click to close.
2. Navigate to a DIFFERENT episode B (different patient).
3. Click `+ Follow-up` in episode B.
4. ✅ PASS: episode B's modal is BLANK — episode A's draft did not bleed in. ❌ FAIL: A's text appears in B.

- [ ] **Step 8: Miruya confirms all green → ready to merge**

If any case fails, report which one — do not merge. If all green, the worktree is ready for the merge-to-main step (Miruya's sequencing call, per the push/merge standing flags in HANDOVER.md).

---

## Self-Review notes (author)

- **Spec coverage:** stray-backdrop preservation (T2+T3+smoke 2), reload survival (localStorage choice; smoke 3), save-clear (T4 step1; smoke 4), cancel-clear (T4 step2-3; smoke 5), edit-path guard (T1 `soap-edit-id` check + T3 `!soap` guard; smoke 6), cross-episode isolation (per-episode key; smoke 7). All covered.
- **The `×` vs Cancel vs backdrop distinction is deliberate:** `×` and backdrop = soft dismiss (preserve draft); Cancel = hard discard (clear draft); Save = success (clear draft). Documented inline so CC doesn't "helpfully" unify them.
- **Empty-draft guard** (`hasContent` in T1) prevents writing a useless date-only key on first open, so we don't create litter before the clinician has typed anything.
- **No `main.js` changes** — the assessment-form draft system is a separate concern and stays untouched, respecting the no-refactor axiom.
