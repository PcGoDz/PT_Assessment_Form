# pdf_neuro.py — KKM Neurology Assessment Form PDF
# KKM Ref: fisio/b.pen. 21/2022
# Layout: 2-column, matching KKM borang. Splits across up to 3 pages.
# Page 1 : Subjective + History (left) | Body chart + Vitals + Tone (right)
# Page 1-2: Investigation + Social (left) | Objective + Coordination + Others (right)
# Page 3 : MRMI/Gait/Endurance/Outcomes (left) | PT Impression + Goals + Plan (right)

from reportlab.platypus import Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.units import mm
from reportlab.lib import colors
from pdf_platypus_base import (
    build_pdf, page_header, patient_bar, body_chart_section,
    two_col, soap_page, sign_chop_block,
    gap,
    S_LABEL, S_NORMAL, S_SMALL, S_BOLD,
    CW, LW, RW, BLACK, LGREY
)

REF   = 'fisio/b.pen. 21/2022'
TITLE = ['KEMENTERIAN KESIHATAN MALAYSIA',
         'PHYSIOTHERAPY DEPARTMENT',
         'NEUROLOGY ASSESSMENT FORM']


def _build_story(d):
    import json as _json

    def _ensure_dict(val):
        if isinstance(val, str):
            try:
                return _json.loads(val)
            except Exception:
                return {}
        return val if isinstance(val, dict) else {}

    def _ls(val, sep=', '):
        if isinstance(val, list):
            return sep.join([str(v) for v in val if v])
        return str(val) if val else ''

    def _mmt_val(r, key, idx):
        if isinstance(r, dict): return str(r.get(key, '') or '')
        if isinstance(r, list) and len(r) > idx: return str(r[idx])
        return ''

    story   = []
    patient = _ensure_dict(d.get('patient'))
    bc      = _ensure_dict(d.get('bodyChart') or d.get('body_chart'))

    # ── ruled_section helper (local to this generator) ────────────
    def rs(rows, width):
        col_w = [width * 0.40, width * 0.60]
        table_rows = []
        span_rows  = []
        for i, (label, val) in enumerate(rows):
            if label is None or label == '':
                vp = val if not isinstance(val, str) else Paragraph(val, S_NORMAL)
                table_rows.append([vp, ''])
                span_rows.append(i)
            else:
                lp = Paragraph(f'<b>{label}</b>', S_NORMAL)
                vp = val if not isinstance(val, str) else Paragraph(str(val), S_NORMAL)
                table_rows.append([lp, vp])

        style = [
            ('BOX',           (0, 0), (-1, -1), 0.5, BLACK),
            ('LINEBELOW',     (0, 0), (-1, -2), 0.3, LGREY),
            ('TOPPADDING',    (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('LEFTPADDING',   (0, 0), (-1, -1), 4),
            ('RIGHTPADDING',  (0, 0), (-1, -1), 4),
            ('VALIGN',        (0, 0), (-1, -1), 'TOP'),
            ('FONTSIZE',      (0, 0), (-1, -1), 7),
        ]
        for i in span_rows:
            style.append(('SPAN', (0, i), (1, i)))

        t = Table(table_rows, colWidths=col_w)
        t.setStyle(TableStyle(style))
        return t

    def mini_table(header_row, data_rows, col_widths, width):
        INN = width - 8 * mm
        scaled = [INN * f for f in col_widths]
        rows = [header_row]
        rows += data_rows
        t = Table(rows, colWidths=scaled)
        t.setStyle(TableStyle([
            ('BOX',           (0, 0), (-1, -1), 0.3, BLACK),
            ('LINEBELOW',     (0, 0), (-1, -2), 0.2, LGREY),
            ('FONTSIZE',      (0, 0), (-1, -1), 6.5),
            ('TOPPADDING',    (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
            ('LEFTPADDING',   (0, 0), (-1, -1), 3),
            ('RIGHTPADDING',  (0, 0), (-1, -1), 3),
            ('BACKGROUND',    (0, 0), (-1,  0), colors.HexColor('#f0f0f0')),
            ('ALIGN',         (1, 0), (-1, -1), 'CENTER'),
        ]))
        return t

    # ──────────────────────────────────────────────────────────────
    # PAGE 1
    # ──────────────────────────────────────────────────────────────
    story += page_header(TITLE, REF)
    story.append(patient_bar(patient, REF))
    story.append(gap(2))

    # ── Block 1: Subjective / History (left) | Body chart + Vitals + Tone (right) ──
    left1 = [rs([
        ('', Paragraph('<b>DIAGNOSIS</b>', S_LABEL)),
        (None, Paragraph(d.get('diagnosis', ''), S_NORMAL)),
        ("DOCTOR'S MANAGEMENT", d.get('dr_mgmt', '')),
        ('', Paragraph('<b>CHIEF COMPLAINT / PROBLEM</b>', S_LABEL)),
        (None, Paragraph(_ls(d.get('complaint')), S_NORMAL)),
        ('Details', d.get('complaint_text', '')),
        ('Patient Goal', d.get('patient_goal', '')),
        ('PAIN SCORE (VAS)', str(d.get('pain_score', '')) + '/10'),
        ('', Paragraph('<b>SUBJECTIVE</b>', S_LABEL)),
        ('Onset', str(d.get('onset_value', '')) + ' ' + str(d.get('onset_unit', ''))),
        ('Motor Deficit — Limbs', _ls(d.get('limbs'))),
        ('Previous Episodes', d.get('prev_episode', '')),
        ('Previous Mobility', d.get('prev_mobility', '')),
        ('Previous Walking Aid', _ls(d.get('prev_aid'))),
        ('Past PT Treatment', d.get('past_pt', '')),
        ('Past PT Outcome', d.get('past_pt_outcome', '')),
        ('', Paragraph('<b>PMHx / COMORBIDITIES</b>', S_LABEL)),
        (None, Paragraph(_ls(d.get('pmhx_chips')), S_NORMAL)),
        ('Details', d.get('pmhx_details', '')),
    ], LW)]

    right1 = [
        body_chart_section(bc, RW),
        gap(2),
        rs([
            ('', Paragraph('<b>VITAL SIGNS</b>', S_LABEL)),
            ('BP (mmHg)',         str(d.get('bp_sys', '')) + ' / ' + str(d.get('bp_dia', ''))),
            ('HR (bpm)',          str(d.get('hr', ''))),
            ('RR (breaths/min)',  str(d.get('rr', ''))),
            ('SpO₂ (%)',         str(d.get('spo2', ''))),
            ('Breathing Pattern', d.get('breathing_pattern', '')),
            ('Breathing Type',    d.get('breathing_type', '')),
            ('', Paragraph('<b>MUSCLE TONE (Modified Ashworth Scale)</b>', S_LABEL)),
            ('Right UL',  str(d.get('tone_rul', ''))),
            ('Left UL',   str(d.get('tone_lul', ''))),
            ('Right LL',  str(d.get('tone_rll', ''))),
            ('Left LL',   str(d.get('tone_lll', ''))),
            ('Tone Notes', d.get('tone_notes', '')),
        ], RW),
    ]

    story.append(two_col(left1, right1, lw=LW, rw=RW))
    story.append(gap(2))

    # ── Block 2: Investigation + Social (left) | Objective + Coordination (right) ──
    # --- Left column ---
    inv_rows_sec = [('', Paragraph('<b>INVESTIGATIONS</b>', S_LABEL))]
    invs = d.get('investigations', [])
    if invs:
        inv_data = [[
            Paragraph(str(r[0]) if len(r) > 0 else '', S_SMALL),
            Paragraph(str(r[1]) if len(r) > 1 else '', S_SMALL),
            Paragraph(str(r[2]) if len(r) > 2 else '', S_SMALL),
        ] for r in invs]
        inv_t = mini_table(
            [Paragraph('<b>Type</b>', S_SMALL), Paragraph('<b>Date</b>', S_SMALL), Paragraph('<b>Findings</b>', S_SMALL)],
            inv_data,
            [0.25, 0.22, 0.53],
            LW
        )
        inv_rows_sec.append((None, inv_t))
    else:
        inv_rows_sec.append(('', Paragraph('Nil', S_NORMAL)))

    med_rows_sec = [('', Paragraph('<b>MEDICATION</b>', S_LABEL))]
    meds = d.get('medications', [])
    if meds:
        med_data = [[
            Paragraph(str(r[0]) if len(r) > 0 else '', S_SMALL),
            Paragraph(str(r[1]) if len(r) > 1 else '', S_SMALL),
            Paragraph(str(r[2]) if len(r) > 2 else '', S_SMALL),
        ] for r in meds]
        med_t = mini_table(
            [Paragraph('<b>Name</b>', S_SMALL), Paragraph('<b>Dose</b>', S_SMALL), Paragraph('<b>Frequency</b>', S_SMALL)],
            med_data,
            [0.40, 0.25, 0.35],
            LW
        )
        med_rows_sec.append((None, med_t))
    else:
        med_rows_sec.append(('', Paragraph('Nil', S_NORMAL)))

    left2 = [
        rs(inv_rows_sec, LW),
        gap(1),
        rs(med_rows_sec, LW),
        gap(1),
        rs([
            ('', Paragraph('<b>GENERAL &amp; SOCIAL</b>', S_LABEL)),
            ('General Health',          d.get('gen_health', '')),
            ('Emotional / Psych.',      d.get('emotional_status', '')),
            ('Incontinence — Bladder',  d.get('bladder', '')),
            ('Incontinence — Bowel',    d.get('bowel', '')),
            ('Visual Field',            _ls(d.get('vision'))),
            ('Hearing',                 _ls(d.get('hearing'))),
            ('Sensation',               d.get('sensation_gen', '')),
            ('Hand Dominance',          d.get('hand_dom', '')),
            ('Pre-morbid Independence', d.get('premorbid_indep', '')),
            ('Current Independence',    d.get('current_indep', '')),
            ('Type of House',           d.get('house_type', '')),
            ('Toilet',                  d.get('toilet_type', '')),
            ('Curb / Stairs',           d.get('has_stairs', '')),
            ('Occupation',              d.get('occupation', '')),
            ('Hobbies / Social Role',   d.get('hobbies', '')),
        ], LW),
    ]

    # --- Right column ---
    right2 = [rs([
        ('', Paragraph('<b>OBJECTIVE — OBSERVATION</b>', S_LABEL)),
        ('Appearance',        _ls(d.get('appearance'))),
        ('Consciousness',     _ls(d.get('consciousness'))),
        ('Posture',           _ls(d.get('posture_obs'))),
        ('Mobility',          _ls(d.get('mobility_obs'))),
        ('Emotional State',   _ls(d.get('emotional_obs'))),
        ('Resp. Status',      _ls(d.get('resp_obs'))),
        ('Medical Devices',   _ls(d.get('devices'))),
        ('', Paragraph('<b>MUSCLE STRENGTH (if applicable)</b>', S_LABEL)),
        ('', Paragraph('<b>RANGE OF MOTION (State the Impaired Joint)</b>', S_LABEL)),
        ('', Paragraph('<b>COORDINATION</b>', S_LABEL)),
        ('Finger-to-Nose',              d.get('ftn', '')),
        ('Heel-to-Shin',                d.get('hts', '')),
        ('Rapid Alternating Movements', d.get('ram', '')),
        ('Tremor',                      d.get('tremor', '')),
        ('Tremor Type',                 d.get('tremor_type', '')),
        ('', Paragraph('<b>SENSATION</b>', S_LABEL)),
        ('Light Touch',       d.get('lt', '')),
        ('Pin Prick',         d.get('pp', '')),
        ('Thermal',           d.get('thermal', '')),
        ('Sensation Notes',   d.get('sensation_notes', '')),
        ('', Paragraph('<b>PROPRIOCEPTION</b>', S_LABEL)),
        ('Upper Limb',        d.get('prop_ul', '')),
        ('Lower Limb',        d.get('prop_ll', '')),
        ('', Paragraph('<b>OTHERS</b>', S_LABEL)),
        ('Cognitive Impairment', _ls(d.get('cognitive'))),
        ('Communication',        d.get('communication', '')),
        ('Oro-Facial Function',  d.get('orofacial', '')),
        ('Oro-Facial Notes',     d.get('orofacial_notes', '')),
        ('Other Findings',       d.get('other_findings', '')),
        ('', Paragraph('<b>POSTURE &amp; BALANCE</b>', S_LABEL)),
        ('Sitting Balance',      _ls(d.get('sit_balance'))),
        ('Standing Balance',     _ls(d.get('stand_balance'))),
        ('Notes',                d.get('balance_notes', '')),
    ], RW)]

    story.append(two_col(left2, right2, lw=LW, rw=RW))
    story.append(gap(2))

    # ── MMT & ROM — full-width if data present ─────────────────────
    mmt = d.get('mmt', [])
    if mmt:
        mmt_data = [[
            Paragraph(_mmt_val(r, 'muscle', 0), S_SMALL),
            Paragraph(_mmt_val(r, 'gradeR', 1), S_SMALL),
            Paragraph(_mmt_val(r, 'gradeL', 2), S_SMALL),
        ] for r in mmt if r]
        mmt_t = mini_table(
            [Paragraph('<b>Muscle Group</b>', S_SMALL), Paragraph('<b>R</b>', S_SMALL), Paragraph('<b>L</b>', S_SMALL)],
            mmt_data,
            [0.65, 0.175, 0.175],
            CW
        )
        story += [Paragraph('<b>MUSCLE STRENGTH (MMT)</b>', S_BOLD), gap(1), mmt_t, gap(2)]

    rom = d.get('rom', [])
    if rom:
        rom_data = [[
            Paragraph(str(r[0]) if len(r) > 0 else '', S_SMALL),
            Paragraph(str(r[1]) if len(r) > 1 else '', S_SMALL),
            Paragraph(str(r[2]) if len(r) > 2 else '', S_SMALL),
            Paragraph(str(r[3]) if len(r) > 3 else '', S_SMALL),
        ] for r in rom]
        rom_t = mini_table(
            [Paragraph('<b>Joint</b>', S_SMALL), Paragraph('<b>UL/LL</b>', S_SMALL),
             Paragraph('<b>Active</b>', S_SMALL), Paragraph('<b>Passive</b>', S_SMALL)],
            rom_data,
            [0.35, 0.12, 0.265, 0.265],
            CW
        )
        story += [Paragraph('<b>RANGE OF MOTION</b>', S_BOLD), gap(1), rom_t, gap(2)]

    # ──────────────────────────────────────────────────────────────
    # PAGE 2 (KKM form page 2: MRMI / GAIT / ENDURANCE / OUTCOMES)
    # ──────────────────────────────────────────────────────────────
    story.append(PageBreak())
    story += page_header(TITLE, REF)
    story.append(patient_bar(patient, REF))
    story.append(gap(2))

    # ── Block 3: MRMI functional limitation (left) | PT Impression / Problem list (right) ──
    mrmi_items = [
        ('Transfers',                       d.get('mrmi_transfer', '')),
        ('Turning Over',                    d.get('mrmi_turn', '')),
        ('Lying to Sitting on Edge of Bed', d.get('mrmi_lying_sit', '')),
        ('Balance in Sitting',              d.get('mrmi_sit_balance', '')),
        ('Sitting to Standing',             d.get('mrmi_sit_stand', '')),
        ('Standing',                        d.get('mrmi_standing', '')),
        ('Walking Indoors',                 d.get('mrmi_walk', '')),
        ('Stair Climbing',                  d.get('mrmi_stairs', '')),
    ]
    INN_mrmi = LW - 8 * mm
    mrmi_rows = [[
        Paragraph('<b>ACTIVITY</b>', S_SMALL),
        Paragraph('<b>SCORE</b>', S_SMALL),
        Paragraph('<b>MOVEMENT QUALITY</b>', S_SMALL),
    ]]
    mrmi_total = 0
    for label, val in mrmi_items:
        try:
            mrmi_total += int(val)
        except (ValueError, TypeError):
            pass
        mrmi_rows.append([
            Paragraph(label, S_SMALL),
            Paragraph(str(val) if val != '' else '', S_SMALL),
            Paragraph('', S_SMALL),
        ])
    mrmi_rows.append([
        Paragraph('<b>TOTAL</b>', S_SMALL),
        Paragraph(f'<b>{mrmi_total} / 40</b>', S_SMALL),
        Paragraph('', S_SMALL),
    ])
    mrmi_t = Table(mrmi_rows, colWidths=[INN_mrmi * 0.50, INN_mrmi * 0.18, INN_mrmi * 0.32])
    mrmi_t.setStyle(TableStyle([
        ('BOX',           (0, 0), (-1, -1), 0.5, BLACK),
        ('LINEBELOW',     (0, 0), (-1, -2), 0.3, LGREY),
        ('FONTSIZE',      (0, 0), (-1, -1), 6.5),
        ('TOPPADDING',    (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ('LEFTPADDING',   (0, 0), (-1, -1), 3),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 3),
        ('BACKGROUND',    (0, 0), (-1,  0), colors.HexColor('#f0f0f0')),
        ('BACKGROUND',    (0, -1), (-1, -1), colors.HexColor('#e8e8e8')),
        ('ALIGN',         (1, 0), (-1, -1), 'CENTER'),
    ]))
    legend = Paragraph(
        '<font size="6">0 – unable to perform &nbsp; 1 – assistance of 2 &nbsp; '
        '2 – assistance of 1 &nbsp; 3 – supervision/verbal &nbsp; '
        '4 – aid/appliance &nbsp; 5 – independent</font>',
        S_SMALL
    )

    left3 = [rs([
        ('', Paragraph('<b>FUNCTIONAL LIMITATION (MRMI)</b>', S_LABEL)),
        (None, mrmi_t),
        (None, legend),
    ], LW)]

    right3 = [rs([
        ('', Paragraph('<b>PROBLEM LIST / PT IMPRESSION (ICF)</b>', S_LABEL)),
        ('Body Structure &amp; Function', d.get('pt_impression', '')),
        ('Activity Limitation',           d.get('pt_impression_al', '')),
        ('Participation Restriction',      d.get('pt_impression_pr', '')),
    ], RW)]

    story.append(two_col(left3, right3, lw=LW, rw=RW))
    story.append(gap(2))

    # ── Block 4: Gait + Endurance + Outcomes (left) | Goals + Plan (right) ──
    mwt10 = d.get('mwt10_time', '')
    try:
        mwt10_speed = str(round(10 / float(mwt10), 2)) + ' m/s' if float(mwt10) > 0 else ''
    except (ValueError, TypeError):
        mwt10_speed = ''

    INN_out = LW - 8 * mm
    outcome_rows = [[
        Paragraph('<b>Outcome Measure</b>', S_SMALL),
        Paragraph('<b>Score</b>', S_SMALL),
        Paragraph('<b>Remarks</b>', S_SMALL),
    ]]
    for label, score, remark in [
        ('Modified Rivermead Mobility Index', f'{mrmi_total} / 40', ''),
        ('Timed Up and Go (TUG)',             str(d.get('tug_time', '')) + ' sec', ''),
        ('Berg Balance Scale',                str(d.get('berg_score', '')) + ' / 56', ''),
        ('Functional Reach Test',             str(d.get('frt_score', '')) + ' cm', ''),
        ('Others',                            _ls(d.get('other_outcomes')), d.get('outcome_notes', '')),
    ]:
        outcome_rows.append([
            Paragraph(label, S_SMALL),
            Paragraph(score, S_SMALL),
            Paragraph(remark, S_SMALL),
        ])
    outcome_t = Table(outcome_rows, colWidths=[INN_out * 0.45, INN_out * 0.20, INN_out * 0.35])
    outcome_t.setStyle(TableStyle([
        ('BOX',           (0, 0), (-1, -1), 0.5, BLACK),
        ('LINEBELOW',     (0, 0), (-1, -2), 0.3, LGREY),
        ('FONTSIZE',      (0, 0), (-1, -1), 6.5),
        ('TOPPADDING',    (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ('LEFTPADDING',   (0, 0), (-1, -1), 3),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 3),
        ('BACKGROUND',    (0, 0), (-1,  0), colors.HexColor('#f0f0f0')),
    ]))

    left4 = [rs([
        ('', Paragraph('<b>GAIT</b>', S_LABEL)),
        ('Gait Pattern',      _ls(d.get('gait_pattern'))),
        ('Walking Aid',       _ls(d.get('walking_aid'))),
        ('10MWT Time (sec)',   str(mwt10)),
        ('10MWT Speed',        mwt10_speed),
        ('Turning',            _ls(d.get('turning'))),
        ('Gait Observations',  d.get('gait_notes', '')),
        ('', Paragraph('<b>EXERCISE ENDURANCE</b>', S_LABEL)),
        ('6MWT Distance (m)',  str(d.get('sixmwt_dist', ''))),
        ('Pre / Post HR (bpm)',
         str(d.get('sixmwt_pre_hr', '')) + ' / ' + str(d.get('sixmwt_post_hr', ''))),
        ('Pre / Post SpO₂ (%)',
         str(d.get('sixmwt_pre_spo2', '')) + ' / ' + str(d.get('sixmwt_post_spo2', ''))),
        ('RPE (Borg)',         str(d.get('borg_rpe', '')) + '/10'),
        ('', Paragraph('<b>OTHER OUTCOME MEASURES</b>', S_LABEL)),
        (None, outcome_t),
    ], LW)]

    right4 = [
        rs([
            ('', Paragraph('<b>SHORT TERM GOALS</b>', S_LABEL)),
            (None, Paragraph(d.get('stg', ''), S_NORMAL)),
            ('', Paragraph('<b>LONG TERM GOALS</b>', S_LABEL)),
            (None, Paragraph(d.get('ltg', ''), S_NORMAL)),
            ('', Paragraph('<b>PLAN OF TREATMENT</b>', S_LABEL)),
            ('Interventions', _ls(d.get('plan'))),
            (None, Paragraph(d.get('plan_notes', ''), S_NORMAL)),
        ], RW),
    ] + sign_chop_block()

    story.append(two_col(left4, right4, lw=LW, rw=RW))

    return story


def generate_neuro_pdf(data):
    return build_pdf(_build_story(data))


def generate_episode_pdf(assessment_data, soap_notes, episode_info=None):
    story   = []
    patient = (assessment_data or {}).get('patient', {})

    if assessment_data:
        story += _build_story(assessment_data)
    else:
        story += page_header(TITLE, REF)
        story.append(Paragraph('No initial assessment recorded for this episode.', S_NORMAL))

    notes = soap_notes or []
    for i in range(0, len(notes), 2):
        story.append(PageBreak())
        pair  = soap_page(patient, notes[i], episode_info)
        if i + 1 < len(notes):
            pair += soap_page(patient, notes[i + 1], episode_info)
        story.append(__import__('reportlab.platypus', fromlist=['KeepTogether']).KeepTogether(pair))

    return build_pdf(story)
