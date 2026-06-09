# INCIDENT NOTE — 2026-06-08 — SCI PDF refinement: stale-mount phantom + the verification lessons

Logged during the SCI Milestone-3 PDF refinement (side-by-side pair_box layout). Two separate
failure modes collided and chewed ~20 min of confident-but-wrong forensics. Captured here so the
next session recognises the pattern in <5 min instead of re-deriving it.

---

## What happened (sequence)

1. CC (Sonnet, worktree `pensive-poitras-c94773`) executed the layout refinement: added a local
   `pair_box()` / `_pair_half()` equal-height helper to `pdf_sci.py` and restructured `_build_story`
   into 4 side-by-side pairs + unchanged full-width grids. Reported "ships clean, 6497 bytes, 2 pages."
2. Opus (Cowork, reads repo via the Linux sandbox **mount**) tried to verify the committed bytes.
   Every read said `pdf_sci.py` was **truncated at `# Full-width: O`** — missing Outcome Measures,
   Assistive Aids, the narrative tail, `sign_chop_block()`, `return story`, AND both entry points.
   Raw `os.open`/`os.read` (cache-bypassing) agreed: 10613 bytes, `generate_sci_pdf` absent, mtime
   frozen at 12:05.
3. Opus diagnosed "CC truncated the file" and wrote a repair prompt. CC pushed back: its own grep
   showed `return story` at L309, entry points at L312/L316, `gen True`, registry resolved both
   functions. Internally consistent — a healthy file.
4. Tiebreak = the human. Miruya supplied the actual rendered PDF (`PDF_GEN_Test.pdf`): **complete** —
   all sections, narrative tail, sign/chop present. CC was right. The file on the real Windows disk
   was whole the entire time.

**Root cause:** the Cowork Linux sandbox **mount served a stale snapshot** of the worktree, frozen at
an earlier write (mtime stuck at 12:05). Opus did real, careful, cache-busting forensics — on bytes
that were already a ghost. The one failure mode not accounted for: not *my* python/pyc cache, but the
**whole mount** being behind the Windows-side disk. CC, running on Windows, read live truth.

This is the SAME beast documented in `handover-2026-06-07` Thread A ("71 phantom-modified files when
viewed from the Cowork Linux sandbox — pure CRLF↔LF churn; Windows-side git only saw 3"). Sandbox
mount ≠ Windows disk is a KNOWN, RECURRING divergence in this project. It manifests as phantom diffs,
frozen mtimes, and now stale file *contents*.

---

## Failure mode A — stale sandbox mount (the big one)

The Cowork Linux mount can lag the real Windows disk after a Windows-side write (CC saving a file).
Reads — even raw `os.open` / `md5sum` / fresh `python3 -B` — return the stale snapshot, because the
staleness is BELOW the cache layers Opus can bust. Symptom tell: **file mtime frozen** while the file
is supposedly being edited; Opus-side reads contradict CC-side reads of the "same" path.

**Rule for next time:** when Opus-side bytes contradict a CC-side report, **suspect the mount BEFORE
accusing the muscle.** Tiebreak with ground truth Opus can't fake: (a) the actual rendered PDF/artifact
from the human, or (b) have CC run a Windows-side `Get-Item file | Select Length` + line count and
paste literal output. Do NOT write a repair based on Opus-mount bytes alone — you may be "fixing" a
phantom and would instead CORRUPT a healthy file.

---

## Failure mode B — the original suspicion that turned out false, but the lesson still holds

The truncation theory was wrong, but it was *plausible* because earlier in the session a genuine
stale-`.pyc` had fooled BOTH parties (CC's "6497 bytes" was rendered off a cached module, not live
source). Two distinct cache layers (python `__pycache__` AND the mount) can each independently lie.

**Rule for next time — verifying a generated artifact:** never trust byte-size / page-count
self-reports. Regenerate in a **fresh, cache-busted process** (`rm -rf __pycache__; python3 -B`),
AND if results still smell off, escalate to the human-rendered artifact. For "did the code change
land," grep the **source file** for the marker (e.g. `def generate_sci_pdf`) — not via `import`,
which the cache poisons.

---

## What worked (keep doing)

- **Read committed bytes, don't trust self-reports** — correct instinct; it just needs the mount-staleness
  caveat bolted on. The discipline caught the earlier real `.pyc` phantom cleanly.
- **The interactive QA harness** (pass/fail + fail-note + single submit) collapsed the app-level wiring
  test into one human pass, zero clickfest drift. 9/9 green, real-app export confirmed by eyeball.
- **Human-as-tiebreak** — when two agents read different realities, the human's rendered artifact is the
  oracle. Cheap, decisive, no ego.

---

## One-line takeaway for HANDOVER / gotchas

Cowork sandbox mount can serve STALE file contents (frozen mtime) after a Windows-side write — when
Opus-side reads contradict CC, suspect the mount, tiebreak with the human's rendered artifact, never
write a "repair" off mount-only bytes.
