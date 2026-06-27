# pdf_ncd.py — KKM NCD / Obesity Assessment Form PDF (Platypus layout engine)
# KKM Ref: fisio / b.pen. 17 / 2019

import os
import sys

from reportlab.platypus import Image as RLImage, Paragraph, Spacer
from reportlab.lib.units import mm

from pdf_platypus_base import (
    build_pdf, page_header, patient_bar,
    box, two_col, plan_section, sign_chop_block,
    data_table, body_chart_section, gap,
    S_LABEL, S_NORMAL, S_SMALL,
    CW, LW, RW,
    ensure_dict, generate_episode_pdf_base,
)

KKM_REF    = 'fisio / b.pen. 17 / 2019'
FORM_TITLE = ['KEMENTERIAN KESIHATAN MALAYSIA',
              'PHYSIOTHERAPY DEPARTMENT',
              'NCD / OBESITY ASSESSMENT']

_SHAPE_FILES = {
    'The Inverted Triangle': 'ncd_shape_1_inverted_triangle.png',
    'The Lean Column':       'ncd_shape_2_lean_column.png',
    'The Rectangle':         'ncd_shape_3_rectangle.png',
    'The Apple':             'ncd_shape_4_apple.png',
    'The Pear':              'ncd_shape_5_pear.png',
    'The Neat Hour Glass':   'ncd_shape_6_neat_hourglass.png',
    'The Full Hour Glass':   'ncd_shape_7_full_hourglass.png',
}


def _shape_flowable(shape_name):
    fn = _SHAPE_FILES.get((shape_name or '').strip())
    if not fn:
        return None
    base = getattr(sys, '_MEIPASS', os.path.dirname(os.path.abspath(__file__)))
    path = os.path.join(base, 'static', 'img', 'ncd_shapes', fn)
    if not os.path.exists(path):
        return None
    return RLImage(path, width=28 * mm, height=40 * mm, kind='proportional')


def _has_data(rows):
    """True if any row has at least one non-empty value cell (cols 1+)."""
    return any(any(str(cell).strip() for cell in row[1:]) for row in rows)


def _v(val):
    """Return value as string or em-dash if empty/None."""
    s = str(val).strip() if val is not None else ''
    return s if s else '—'


def _build_story(d):
    d       = ensure_dict(d)
    patient = ensure_dict(d.get('patient', {}))
    m       = ensure_dict(d.get('measurements', {}))
    bc      = ensure_dict(d.get('bodyChart', {}))
    ls      = ensure_dict(d.get('lifestyle', {}))

    story = []
    story += page_header(FORM_TITLE, KKM_REF)
    story.append(patient_bar(patient, KKM_REF))
    story.append(gap(2))

    # ── Subjective ────────────────────────────────────────────────
    sm  = ensure_dict(ls.get('smoking', {}))
    al  = ensure_dict(ls.get('alcohol', {}))
    ac  = ensure_dict(ls.get('active',  {}))

    def _life_line(label, obj):
        flag    = obj.get('flag', '') or ''
        comment = obj.get('comment', '') or ''
        parts   = [f'<b>{label}:</b> {flag}' if flag else f'<b>{label}:</b>']
        if comment:
            parts.append(comment)
        return Paragraph('  '.join(parts), S_NORMAL)

    subj_content = [
        Paragraph('<b>Doctor\'s Diagnosis:</b> ' + _v(d.get('diagnosis')), S_NORMAL),
        Paragraph('<b>Patient\'s Complaint:</b> ' + _v(d.get('complaint')), S_NORMAL),
        Paragraph('<b>Marital Status:</b> '        + _v(d.get('marital')),   S_NORMAL),
        Paragraph('<b>Occupation:</b> '             + _v(d.get('occupation')), S_NORMAL),
        Paragraph('<b>Recreation:</b> '             + _v(d.get('recreation')), S_NORMAL),
        Paragraph('<b>PMHx:</b> '                   + _v(d.get('pmhx')),       S_NORMAL),
        Paragraph('<b>Family Hx:</b> '              + _v(d.get('familyHx')),   S_NORMAL),
        Paragraph('<b>Medication:</b> '             + _v(d.get('medication')), S_NORMAL),
        gap(1),
        Paragraph('<b>Lifestyle</b>', S_LABEL),
        _life_line('Smoking', sm),
        _life_line('Alcohol', al),
        _life_line('Physically Active', ac),
    ]
    story.append(box('SUBJECTIVE', subj_content))

    # ── History ───────────────────────────────────────────────────
    left_hist  = [box('CURRENT HISTORY', d.get('currentHistory') or '', width=LW)]
    right_hist = [box('PAST HISTORY',    d.get('pastHistory')    or '', width=RW)]
    story.append(two_col(left_hist, right_hist))

    # ── Body Chart ────────────────────────────────────────────────
    story.append(body_chart_section(bc))

    # ── Body Shape ────────────────────────────────────────────────
    shape_name = d.get('bodyShape', '') or ''
    if shape_name:
        sf = _shape_flowable(shape_name)
        shape_content = [Paragraph(shape_name, S_NORMAL)]
        if sf:
            shape_content.append(sf)
        story.append(box('BODY SHAPE', shape_content))

    # ── Measurements: Vital Signs ─────────────────────────────────
    vitals_rows = [
        ['HR (/min)', str(m.get('hr', '') or ''), 'RR (/min)', str(m.get('rr', '') or '')],
        ['BP (mmHg)', str(m.get('bp', '') or ''), 'SpO₂ (%)', str(m.get('spo2', '') or '')],
    ]
    if any(r[1] or r[3] for r in vitals_rows):
        cw4 = CW / 4
        story.append(data_table(
            ['Measurement', 'Value', 'Measurement', 'Value'],
            vitals_rows,
            [cw4 * 1.2, cw4 * 0.8, cw4 * 1.2, cw4 * 0.8],
        ))

    # ── Measurements: Blood Results ───────────────────────────────
    blood_rows = [
        ['FBS (mmol/L)',   str(m.get('fbs', '') or ''),
         'HbA1c (%)',      str(m.get('hba1c', '') or '')],
        ['Cholesterol',    str(m.get('cholesterol', '') or ''),
         'LDL (mmol/L)',   str(m.get('ldl', '') or '')],
        ['HDL (mmol/L)',   str(m.get('hdl', '') or ''),
         'Triglycerides',  str(m.get('triglycerides', '') or '')],
    ]
    if any(r[1] or r[3] for r in blood_rows):
        cw4 = CW / 4
        story.append(data_table(
            ['Bloods', 'Value', 'Bloods', 'Value'],
            blood_rows,
            [cw4 * 1.2, cw4 * 0.8, cw4 * 1.2, cw4 * 0.8],
        ))

    # ── Measurements: Body Composition ────────────────────────────
    bmi_val = str(m.get('bmi', '') or '')
    whr_val = str(m.get('whr', '') or '')
    bodycomp_rows = [
        ['Height (cm)',    str(m.get('height', '') or ''),
         'Weight (kg)',    str(m.get('weight', '') or '')],
        ['BMI (kg/m²)', bmi_val,
         'Waist (cm)',     str(m.get('waist', '') or '')],
        ['Hip (cm)',       str(m.get('hip', '') or ''),
         'Waist/Hip Ratio', whr_val],
        ['Sub-fat Whole (%)', str(m.get('subfatWhole', '') or ''),
         'Sub-fat Trunk (%)', str(m.get('subfatTrunk', '') or '')],
        ['Sub-fat Arm (%)',   str(m.get('subfatArm', '') or ''),
         'Sub-fat Leg (%)',   str(m.get('subfatLeg', '') or '')],
        ['Muscle Whole (%)',  str(m.get('muscleWhole', '') or ''),
         'Muscle Trunk (%)',  str(m.get('muscleTrunk', '') or '')],
        ['Muscle Arm (%)',    str(m.get('muscleArm', '') or ''),
         'Muscle Leg (%)',    str(m.get('muscleLeg', '') or '')],
        ['Visceral Fat',  str(m.get('visceralFat', '') or ''),
         'RMR (kcal)',    str(m.get('rmr', '') or '')],
    ]
    if any(r[1] or r[3] for r in bodycomp_rows):
        cw4 = CW / 4
        story.append(data_table(
            ['Body Composition', 'Value', 'Body Composition', 'Value'],
            bodycomp_rows,
            [cw4 * 1.2, cw4 * 0.8, cw4 * 1.2, cw4 * 0.8],
        ))

    # ── Measurements: Fitness ─────────────────────────────────────
    fitness_rows = []
    if m.get('walk6Rpe') or m.get('walk6Bp') or m.get('walk6Hr') or m.get('walk6Comment'):
        fitness_rows.append(['6MWT RPE', str(m.get('walk6Rpe', '') or ''),
                              '6MWT BP',  str(m.get('walk6Bp',  '') or '')])
        fitness_rows.append(['6MWT HR',  str(m.get('walk6Hr', '') or ''),
                              '6MWT Notes', str(m.get('walk6Comment', '') or '')])
    if m.get('step3Hr') or m.get('step3Comment'):
        fitness_rows.append(['3-Min Step HR', str(m.get('step3Hr', '') or ''),
                              '3-Min Step Notes', str(m.get('step3Comment', '') or '')])
    if m.get('sitReach') or m.get('flexComment'):
        fitness_rows.append(['Sit & Reach (cm)', str(m.get('sitReach', '') or ''),
                              'Flex Notes', str(m.get('flexComment', '') or '')])
    if m.get('handGrip') or m.get('sitUp') or m.get('pushUp') or m.get('ulComment'):
        fitness_rows.append(['Hand Grip (kg)', str(m.get('handGrip', '') or ''),
                              'Sit-Up (reps)', str(m.get('sitUp', '') or '')])
        fitness_rows.append(['Push-Up (reps)', str(m.get('pushUp', '') or ''),
                              'UL Notes', str(m.get('ulComment', '') or '')])
    if m.get('sitToStand') or m.get('llComment'):
        fitness_rows.append(['Sit-to-Stand (reps)', str(m.get('sitToStand', '') or ''),
                              'LL Notes', str(m.get('llComment', '') or '')])
    if m.get('stork') or m.get('balanceComment'):
        fitness_rows.append(['Stork Balance (s)', str(m.get('stork', '') or ''),
                              'Balance Notes', str(m.get('balanceComment', '') or '')])

    if fitness_rows:
        cw4 = CW / 4
        story.append(data_table(
            ['Fitness Test', 'Result', 'Fitness Test', 'Result'],
            fitness_rows,
            [cw4 * 1.2, cw4 * 0.8, cw4 * 1.2, cw4 * 0.8],
        ))

    # ── Observation / Physical Examination ───────────────────────
    story.append(box('OBSERVATION / PHYSICAL EXAMINATION', [
        Paragraph(d.get('observation') or '—', S_NORMAL),
    ]))

    # ── Plan: Impression / STG / LTG / Treatment ─────────────────
    story.append(plan_section(
        d.get('impression', ''),
        d.get('stg', ''),
        d.get('ltg', ''),
        d.get('planOfTreatment', ''),
    ))

    # ── Patient Goal ──────────────────────────────────────────────
    if d.get('patientGoal'):
        story.append(box('PATIENT GOAL', [
            Paragraph(d.get('patientGoal'), S_NORMAL),
        ]))

    # ── Sign & Chop ───────────────────────────────────────────────
    story += sign_chop_block()
    return story


def generate_ncd_pdf(data, output_path=None):
    story = _build_story(data)
    pdf_bytes = build_pdf(story)
    if output_path:
        with open(output_path, 'wb') as f:
            f.write(pdf_bytes)
        return output_path
    return pdf_bytes


def generate_episode_pdf(assessment_data, soap_notes, episode_info=None):
    return generate_episode_pdf_base(
        _build_story, FORM_TITLE, KKM_REF, assessment_data, soap_notes, episode_info
    )
