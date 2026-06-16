# pdf_facial.py — KKM Facial Assessment Form PDF (Platypus layout engine)
# KKM Ref: fisio / b.pen. 7 / Pind. 2 / 2019
# Page 1: MSK-style intake (two_col, mirrors pdf_ms.py). Page 2: facial + tongue grade tables.
# Build Note #1: pain + sensation are NESTED; nature/agg/ease/hrs24 are ARRAYS.

from reportlab.platypus import Paragraph, PageBreak
from pdf_platypus_base import (
    build_pdf, page_header, patient_bar,
    box, two_col, plan_section, sign_chop_block,
    data_table, gap,
    S_LABEL, S_NORMAL,
    CW, LW, RW,
    ensure_dict, generate_episode_pdf_base,
)

REF   = 'fisio / b.pen. 7 / Pind. 2 / 2019'
TITLE = ['KEMENTERIAN KESIHATAN MALAYSIA',
         'PHYSIOTHERAPY DEPARTMENT',
         'FACIAL ASSESSMENT FORM']


def _join(arr):
    """Multi-chip array -> comma-joined string."""
    if isinstance(arr, list):
        return ', '.join([str(v) for v in arr if v])
    return str(arr) if arr else ''


def _has_data(rows):
    """True if any row has a non-empty value cell (col index >= 1)."""
    return any(any(str(cell).strip() for cell in row[1:]) for row in rows)


def _grade_table(label, mov_rows):
    """Return [header, data_table, gap] for a grade grid, or [] if all grades blank."""
    rows = [[r.get('label', ''), r.get('grade', '')] for r in (mov_rows or [])]
    if not _has_data(rows):
        return []
    return [
        Paragraph(label, S_LABEL),
        data_table(['Movement', 'Grade'], rows, [CW * 0.78, CW * 0.22]),
        gap(2),
    ]


def _build_story(d):
    story   = []
    patient = ensure_dict(d.get('patient'))
    pain    = d.get('pain', {}) or {}
    sens    = d.get('sensation', {}) or {}

    # ── Header ──
    story += page_header(TITLE, REF)
    story.append(patient_bar(patient, REF))
    story.append(gap(2))

    # ── PAGE 1 — intake (two_col, mirrors pdf_ms.py) ──
    pain_content = [
        Paragraph(f'<b>PRE:</b> {pain.get("pre","0")}/10   <b>POST:</b> {pain.get("post","0")}/10', S_NORMAL),
        Paragraph(f'<b>Area:</b> {d.get("area","")}', S_NORMAL),
        Paragraph(f'<b>Nature:</b> {_join(d.get("nature"))}  {d.get("natureNotes","")}', S_NORMAL),
        Paragraph(f'<b>Agg:</b> {_join(d.get("agg"))}  {d.get("aggNotes","")}', S_NORMAL),
        Paragraph(f'<b>Ease:</b> {_join(d.get("ease"))}  {d.get("easeNotes","")}', S_NORMAL),
        Paragraph(f'<b>24 hrs:</b> {_join(d.get("hrs24"))}  {d.get("hrs24Notes","")}', S_NORMAL),
        Paragraph(f'<b>Irritability:</b> {d.get("irritability","")}', S_NORMAL),
    ]

    sq_content = [
        Paragraph(f'<b>General Health:</b> {d.get("generalHealth","")}', S_NORMAL),
        Paragraph(f'<b>PMHX / Surgery:</b> {d.get("pmhx","")}', S_NORMAL),
        Paragraph(f'<b>Investigations:</b> {d.get("investigations","")}', S_NORMAL),
        Paragraph(f'<b>Medication:</b> {d.get("medication","")}', S_NORMAL),
        Paragraph(f'<b>Occupation / Recreation:</b> {d.get("occupation","")}', S_NORMAL),
        Paragraph(f'<b>Social History:</b> {d.get("socialHistory","")}', S_NORMAL),
        Paragraph(f'<b>Hearing Aid / Pacemaker:</b> {d.get("hearingAidPacemaker","")}', S_NORMAL),
    ]

    sens_content = [
        Paragraph(f'<b>Hot:</b> {sens.get("hot","")}', S_NORMAL),
        Paragraph(f'<b>Cold:</b> {sens.get("cold","")}', S_NORMAL),
        Paragraph(f'<b>Pin-prick:</b> {sens.get("pinPrick","")}', S_NORMAL),
        Paragraph(f'<b>Notes:</b> {sens.get("notes","")}', S_NORMAL),
    ]

    left = [
        box('DIAGNOSIS', d.get('diagnosis', ''), width=LW),
        box("DOCTOR'S MANAGEMENT", d.get('doctorMgmt', ''), width=LW),
        box('PROBLEM', d.get('problem', ''), width=LW),
        box('PAIN SCORE', pain_content, width=LW),
        box('SPECIAL QUESTION', sq_content, width=LW),
    ]
    right = [
        box('CURRENT HISTORY', d.get('currentHistory', ''), width=RW),
        box('PAST HISTORY', d.get('pastHistory', ''), width=RW),
        box('OBSERVATION', d.get('observation', ''), width=RW),
        box('PALPATION', d.get('palpation', ''), width=RW),
        box('SENSATION TEST', sens_content, width=RW),
    ]
    story.append(two_col(left, right))
    story.append(PageBreak())

    # ── PAGE 2 — grade tables ──
    story += page_header(TITLE, REF)
    story.append(patient_bar(patient, REF))
    story.append(gap(3))

    side = d.get('affectedSide') or '—'
    story.append(Paragraph(f'MOVEMENT ASSESSMENT — Affected Side: {side}', S_LABEL))
    story.append(gap(1))
    story += _grade_table('FACIAL', d.get('facialMov'))
    story += _grade_table('TONGUE', d.get('tongueMov'))

    # ── Narrative tail (shared plan_section, like pdf_ms.py) ──
    story.append(plan_section(
        d.get('impression', ''), d.get('stg', ''),
        d.get('ltg', ''), d.get('planOfTreatment', ''),
    ))

    story += sign_chop_block()
    return story


def generate_facial_pdf(data):
    return build_pdf(_build_story(data))


def generate_episode_pdf(assessment_data, soap_notes, episode_info=None):
    return generate_episode_pdf_base(_build_story, TITLE, REF, assessment_data, soap_notes, episode_info)
