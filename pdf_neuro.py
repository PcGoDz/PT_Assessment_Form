# pdf_neuro.py — KKM Neurology Assessment Form PDF (Platypus layout engine)
# MOH/P/FIS/27.25(HB)-e

from reportlab.platypus import Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
from reportlab.lib.units import mm
from reportlab.lib import colors
from pdf_platypus_base import (
    build_pdf, page_header, patient_bar, body_chart_section,
    box, two_col, plan_section, soap_page, sign_chop_block,
    data_table, gap, tick, cbtick,
    S_LABEL, S_NORMAL, S_SMALL, S_BOLD,
    CW, LW2, RW2, BLACK, LGREY
)

REF   = 'MOH/P/FIS/27.25(HB)-e'
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

    def _list_str(val, sep=', '):
        if isinstance(val, list):
            return sep.join([str(v) for v in val if v])
        return str(val) if val else ''

    story   = []
    patient = _ensure_dict(d.get('patient'))
    bc      = _ensure_dict(d.get('bodyChart') or d.get('body_chart'))

    def cell(content, bold=False):
        s = S_LABEL if bold else S_NORMAL
        if isinstance(content, list):
            return content
        return Paragraph(str(content), s) if content else Paragraph('', S_NORMAL)

    def ruled_section(rows, width, min_row_h=6*mm):
        table_rows = []
        col_w = [width * 0.36, width * 0.64]
        for label, val in rows:
            if label is None:
                table_rows.append([val, ''])
            elif label == '':
                table_rows.append([val, ''])
            else:
                lp = Paragraph(f'<b>{label}</b>', S_NORMAL)
                vp = Paragraph(str(val), S_NORMAL) if isinstance(val, str) else val
                table_rows.append([lp, vp])

        style = [
            ('BOX',           (0,0),  (-1,-1), 0.5, BLACK),
            ('LINEBELOW',     (0,0),  (-1,-2), 0.3, LGREY),
            ('TOPPADDING',    (0,0),  (-1,-1), 3),
            ('BOTTOMPADDING', (0,0),  (-1,-1), 3),
            ('LEFTPADDING',   (0,0),  (-1,-1), 4),
            ('RIGHTPADDING',  (0,0),  (-1,-1), 4),
            ('VALIGN',        (0,0),  (-1,-1), 'TOP'),
            ('FONTSIZE',      (0,0),  (-1,-1), 7),
        ]
        for i, (label, _) in enumerate(rows):
            if label is None or label == '':
                style.append(('SPAN', (0,i), (1,i)))

        t = Table(table_rows, colWidths=col_w)
        t.setStyle(TableStyle(style))
        return t

    # ── PAGE 1 ──────────────────────────────────────────────────────
    story += page_header(TITLE, REF)
    story.append(patient_bar(patient, REF))
    story.append(gap(2))

    # ── LEFT COLUMN PAGE 1 ──────────────────────────────────────────
    def left():
        complaint = _list_str(d.get('complaint'))
        plan_chips = _list_str(d.get('plan'))

        rows = [
            ('', Paragraph('<b>DIAGNOSIS</b>', S_LABEL)),
            (None, Paragraph(d.get('diagnosis', ''), S_NORMAL)),
            ("DOCTOR'S MANAGEMENT", d.get('dr_mgmt', '')),
            ('', Paragraph('<b>CHIEF COMPLAINT / PROBLEM</b>', S_LABEL)),
            (None, Paragraph(complaint, S_NORMAL)),
            ('Patient Goal', d.get('patient_goal', '')),
            ('Pain Score (VAS)', str(d.get('pain_score', '')) + '/10'),
            ('', Paragraph('<b>SUBJECTIVE — CURRENT HISTORY</b>', S_LABEL)),
            ('Onset', str(d.get('onset_value', '')) + ' ' + str(d.get('onset_unit', ''))),
            ('Motor Deficit — Limbs', _list_str(d.get('limbs'))),
            ('', Paragraph('<b>PAST HISTORY</b>', S_LABEL)),
            ('Previous Episodes', d.get('prev_episode', '')),
            ('Previous Mobility', d.get('prev_mobility', '')),
            ('Walking Aid', _list_str(d.get('prev_aid'))),
            ('PMHx / Comorbidities', _list_str(d.get('pmhx_chips'))),
            ('PMHx / Surgery Details', d.get('pmhx_details', '')),
            ('Past PT Treatment', d.get('past_pt', '')),
            ('Past PT Outcome', d.get('past_pt_outcome', '')),
            ('', Paragraph('<b>INVESTIGATIONS</b>', S_LABEL)),
        ]

        # Investigations table
        invs = d.get('investigations', [])
        if invs:
            INN = LW2 - 8*mm
            inv_rows = [[
                Paragraph('<b>Type</b>', S_SMALL),
                Paragraph('<b>Date</b>', S_SMALL),
                Paragraph('<b>Findings</b>', S_SMALL),
            ]]
            for row in invs:
                inv_rows.append([
                    Paragraph(str(row[0]) if len(row) > 0 else '', S_SMALL),
                    Paragraph(str(row[1]) if len(row) > 1 else '', S_SMALL),
                    Paragraph(str(row[2]) if len(row) > 2 else '', S_SMALL),
                ])
            inv_t = Table(inv_rows, colWidths=[INN*0.25, INN*0.22, INN*0.53])
            inv_t.setStyle(TableStyle([
                ('BOX',        (0,0),(-1,-1), 0.3, BLACK),
                ('LINEBELOW',  (0,0),(-1,-2), 0.2, LGREY),
                ('FONTSIZE',   (0,0),(-1,-1), 6.5),
                ('TOPPADDING', (0,0),(-1,-1), 2),
                ('BOTTOMPADDING',(0,0),(-1,-1), 2),
                ('LEFTPADDING',(0,0),(-1,-1), 3),
                ('BACKGROUND', (0,0),(-1,0),  colors.HexColor('#f0f0f0')),
            ]))
            rows.append((None, inv_t))
        else:
            rows.append(('', Paragraph('', S_NORMAL)))

        rows += [
            ('', Paragraph('<b>MEDICATION</b>', S_LABEL)),
        ]

        # Medication table
        meds = d.get('medications', [])
        if meds:
            INN = LW2 - 8*mm
            med_rows = [[
                Paragraph('<b>Name</b>', S_SMALL),
                Paragraph('<b>Dose</b>', S_SMALL),
                Paragraph('<b>Frequency</b>', S_SMALL),
            ]]
            for row in meds:
                med_rows.append([
                    Paragraph(str(row[0]) if len(row) > 0 else '', S_SMALL),
                    Paragraph(str(row[1]) if len(row) > 1 else '', S_SMALL),
                    Paragraph(str(row[2]) if len(row) > 2 else '', S_SMALL),
                ])
            med_t = Table(med_rows, colWidths=[INN*0.40, INN*0.25, INN*0.35])
            med_t.setStyle(TableStyle([
                ('BOX',        (0,0),(-1,-1), 0.3, BLACK),
                ('LINEBELOW',  (0,0),(-1,-2), 0.2, LGREY),
                ('FONTSIZE',   (0,0),(-1,-1), 6.5),
                ('TOPPADDING', (0,0),(-1,-1), 2),
                ('BOTTOMPADDING',(0,0),(-1,-1), 2),
                ('LEFTPADDING',(0,0),(-1,-1), 3),
                ('BACKGROUND', (0,0),(-1,0),  colors.HexColor('#f0f0f0')),
            ]))
            rows.append((None, med_t))
        else:
            rows.append(('', Paragraph('', S_NORMAL)))

        rows += [
            ('', Paragraph('<b>GENERAL &amp; SOCIAL</b>', S_LABEL)),
            ('General Health', d.get('gen_health', '')),
            ('Emotional / Psychological', d.get('emotional_status', '')),
            ('Incontinence — Bladder', d.get('bladder', '')),
            ('Incontinence — Bowel', d.get('bowel', '')),
            ('Visual Field', _list_str(d.get('vision'))),
            ('Hearing', _list_str(d.get('hearing'))),
            ('Sensation', d.get('sensation_gen', '')),
            ('Hand Dominance', d.get('hand_dom', '')),
            ('Pre-morbid Independence', d.get('premorbid_indep', '')),
            ('Current Independence', d.get('current_indep', '')),
            ('Type of House', d.get('house_type', '')),
            ('Toilet', d.get('toilet_type', '')),
            ('Curb / Stairs', d.get('has_stairs', '')),
            ('Door Width (wheelchair-adequate)', d.get('door_width', '')),
            ('Occupation', d.get('occupation', '')),
            ('Hobbies / Social Role', d.get('hobbies', '')),
        ]
        return ruled_section(rows, LW2)

    # ── RIGHT COLUMN PAGE 1 ──────────────────────────────────────────
    def right():
        rows = [
            ('', Paragraph('<b>OBJECTIVE — OBSERVATION</b>', S_LABEL)),
            ('Appearance', _list_str(d.get('appearance'))),
            ('Consciousness', _list_str(d.get('consciousness'))),
            ('Posture', _list_str(d.get('posture_obs'))),
            ('Mobility', _list_str(d.get('mobility_obs'))),
            ('Emotional State', _list_str(d.get('emotional_obs'))),
            ('Respiratory Status', _list_str(d.get('resp_obs'))),
            ('Medical Devices', _list_str(d.get('devices'))),
            ('', Paragraph('<b>VITAL SIGNS</b>', S_LABEL)),
            ('BP (mmHg)', str(d.get('bp_sys','')) + ' / ' + str(d.get('bp_dia',''))),
            ('HR (bpm)', str(d.get('hr',''))),
            ('RR (breaths/min)', str(d.get('rr',''))),
            ('SpO₂ (%)', str(d.get('spo2',''))),
            ('Breathing Pattern', d.get('breathing_pattern','')),
            ('Breathing Type', d.get('breathing_type','')),
            ('', Paragraph('<b>MUSCLE TONE (Modified Ashworth Scale)</b>', S_LABEL)),
            ('Right UL', str(d.get('tone_rul',''))),
            ('Left UL', str(d.get('tone_lul',''))),
            ('Right LL', str(d.get('tone_rll',''))),
            ('Left LL', str(d.get('tone_lll',''))),
            ('Tone Notes', d.get('tone_notes','')),
            ('', Paragraph('<b>COORDINATION</b>', S_LABEL)),
            ('Finger-to-Nose', d.get('ftn','')),
            ('Heel-to-Shin', d.get('hts','')),
            ('Rapid Alternating Movements', d.get('ram','')),
            ('Tremor', d.get('tremor','')),
            ('Tremor Type', d.get('tremor_type','')),
            ('', Paragraph('<b>SENSATION</b>', S_LABEL)),
            ('Light Touch', d.get('lt','')),
            ('Pin Prick', d.get('pp','')),
            ('Thermal', d.get('thermal','')),
            ('Sensation Notes', d.get('sensation_notes','')),
            ('', Paragraph('<b>PROPRIOCEPTION</b>', S_LABEL)),
            ('Upper Limb', d.get('prop_ul','')),
            ('Lower Limb', d.get('prop_ll','')),
            ('', Paragraph('<b>OTHERS</b>', S_LABEL)),
            ('Cognitive Impairment', _list_str(d.get('cognitive'))),
            ('Communication', d.get('communication','')),
            ('Oro-Facial Function', d.get('orofacial','')),
            ('Oro-Facial Notes', d.get('orofacial_notes','')),
            ('Other Findings', d.get('other_findings','')),
        ]
        return ruled_section(rows, RW2)

    story.append(two_col(left(), right(), lw=LW2, rw=RW2))
    story.append(gap(3))

    # ── MUSCLE STRENGTH (MMT) — full-width ─────────────────────────
    mmt = d.get('mmt', [])
    if mmt:
        story += [Paragraph('<b>MUSCLE STRENGTH (MMT)</b>', S_BOLD)]
        story.append(gap(1))
        mmt_rows = [[
            Paragraph('<b>Muscle Group</b>', S_SMALL),
            Paragraph('<b>R</b>', S_SMALL),
            Paragraph('<b>L</b>', S_SMALL),
        ]]
        for row in mmt:
            mmt_rows.append([
                Paragraph(str(row[0]) if len(row) > 0 else '', S_SMALL),
                Paragraph(str(row[1]) if len(row) > 1 else '', S_SMALL),
                Paragraph(str(row[2]) if len(row) > 2 else '', S_SMALL),
            ])
        mmt_t = Table(mmt_rows, colWidths=[CW*0.65, CW*0.175, CW*0.175])
        mmt_t.setStyle(TableStyle([
            ('BOX',        (0,0),(-1,-1), 0.5, BLACK),
            ('LINEBELOW',  (0,0),(-1,-2), 0.3, LGREY),
            ('FONTSIZE',   (0,0),(-1,-1), 7),
            ('TOPPADDING', (0,0),(-1,-1), 2),
            ('BOTTOMPADDING',(0,0),(-1,-1), 2),
            ('LEFTPADDING',(0,0),(-1,-1), 4),
            ('BACKGROUND', (0,0),(-1,0),  colors.HexColor('#e8e8e8')),
            ('ALIGN',      (1,0),(-1,-1), 'CENTER'),
        ]))
        story.append(mmt_t)
        story.append(gap(2))

    # ── ROM — full-width ────────────────────────────────────────────
    rom = d.get('rom', [])
    if rom:
        story += [Paragraph('<b>RANGE OF MOTION</b>', S_BOLD)]
        story.append(gap(1))
        rom_rows = [[
            Paragraph('<b>Joint</b>', S_SMALL),
            Paragraph('<b>UL/LL</b>', S_SMALL),
            Paragraph('<b>Active</b>', S_SMALL),
            Paragraph('<b>Passive</b>', S_SMALL),
        ]]
        for row in rom:
            rom_rows.append([
                Paragraph(str(row[0]) if len(row) > 0 else '', S_SMALL),
                Paragraph(str(row[1]) if len(row) > 1 else '', S_SMALL),
                Paragraph(str(row[2]) if len(row) > 2 else '', S_SMALL),
                Paragraph(str(row[3]) if len(row) > 3 else '', S_SMALL),
            ])
        rom_t = Table(rom_rows, colWidths=[CW*0.35, CW*0.12, CW*0.265, CW*0.265])
        rom_t.setStyle(TableStyle([
            ('BOX',        (0,0),(-1,-1), 0.5, BLACK),
            ('LINEBELOW',  (0,0),(-1,-2), 0.3, LGREY),
            ('FONTSIZE',   (0,0),(-1,-1), 7),
            ('TOPPADDING', (0,0),(-1,-1), 2),
            ('BOTTOMPADDING',(0,0),(-1,-1), 2),
            ('LEFTPADDING',(0,0),(-1,-1), 4),
            ('BACKGROUND', (0,0),(-1,0),  colors.HexColor('#e8e8e8')),
        ]))
        story.append(rom_t)
        story.append(gap(2))

    # ── BODY CHART ──────────────────────────────────────────────────
    story.append(body_chart_section(bc))
    story.append(gap(2))

    # ── PAGE 2 — POSTURE/BALANCE, MRMI, GAIT, ENDURANCE, OUTCOMES ──
    story.append(PageBreak())
    story += page_header(TITLE, REF)
    story.append(patient_bar(patient, REF))
    story.append(gap(2))

    def left2():
        sit_bal   = _list_str(d.get('sit_balance'))
        stand_bal = _list_str(d.get('stand_balance'))

        rows = [
            ('', Paragraph('<b>POSTURE &amp; BALANCE</b>', S_LABEL)),
            ('Sitting Balance', sit_bal),
            ('Standing Balance', stand_bal),
            ('Postural Observations', d.get('balance_notes','')),
            ('', Paragraph('<b>FUNCTIONAL LIMITATION (MRMI)</b>', S_LABEL)),
        ]

        # MRMI table
        mrmi_ids = [
            ('Turning Over',                  d.get('mrmi_turn','')),
            ('Lying to Sitting on Edge of Bed', d.get('mrmi_lying_sit','')),
            ('Balance in Sitting',            d.get('mrmi_sit_balance','')),
            ('Sitting to Standing',           d.get('mrmi_sit_stand','')),
            ('Standing',                      d.get('mrmi_standing','')),
            ('Transfer (Bed to Chair)',        d.get('mrmi_transfer','')),
            ('Walking Inside',                d.get('mrmi_walk','')),
            ('Stair Climbing',                d.get('mrmi_stairs','')),
        ]
        INN = LW2 - 8*mm
        mrmi_rows = []
        total = 0
        for label, val in mrmi_ids:
            v = str(val) if val != '' else '—'
            try:
                total += int(val)
            except (ValueError, TypeError):
                pass
            mrmi_rows.append([
                Paragraph(label, S_SMALL),
                Paragraph(v, S_SMALL),
            ])
        mrmi_rows.append([
            Paragraph('<b>Total</b>', S_SMALL),
            Paragraph('<b>' + str(total) + ' / 40</b>', S_SMALL),
        ])
        mrmi_t = Table(mrmi_rows, colWidths=[INN*0.75, INN*0.25])
        mrmi_t.setStyle(TableStyle([
            ('BOX',        (0,0),(-1,-1), 0.3, BLACK),
            ('LINEBELOW',  (0,0),(-1,-2), 0.2, LGREY),
            ('FONTSIZE',   (0,0),(-1,-1), 6.5),
            ('TOPPADDING', (0,0),(-1,-1), 2),
            ('BOTTOMPADDING',(0,0),(-1,-1), 2),
            ('LEFTPADDING',(0,0),(-1,-1), 3),
            ('BACKGROUND', (0,-1),(-1,-1), colors.HexColor('#e8e8e8')),
            ('ALIGN',      (1,0),(-1,-1), 'CENTER'),
        ]))
        rows.append((None, mrmi_t))

        rows += [
            ('', Paragraph('<b>GAIT</b>', S_LABEL)),
            ('Gait Pattern',  _list_str(d.get('gait_pattern'))),
            ('Walking Aid',   _list_str(d.get('walking_aid'))),
            ('10MWT Time',    str(d.get('mwt10_time','')) + ' sec'),
            ('10MWT Speed',   (str(round(10/float(d.get('mwt10_time')),2)) + ' m/s')
                              if str(d.get('mwt10_time','')).replace('.','').isdigit()
                              and float(d.get('mwt10_time',0)) > 0 else ''),
            ('Turning',       _list_str(d.get('turning'))),
            ('Gait Observations', d.get('gait_notes','')),
        ]
        return ruled_section(rows, LW2)

    def right2():
        rows = [
            ('', Paragraph('<b>EXERCISE ENDURANCE (6MWT)</b>', S_LABEL)),
            ('Distance (m)',      str(d.get('sixmwt_dist',''))),
            ('Pre HR (bpm)',      str(d.get('sixmwt_pre_hr',''))),
            ('Post HR (bpm)',     str(d.get('sixmwt_post_hr',''))),
            ('Pre SpO₂ (%)', str(d.get('sixmwt_pre_spo2',''))),
            ('Post SpO₂ (%)',str(d.get('sixmwt_post_spo2',''))),
            ('RPE (Borg)',        str(d.get('borg_rpe','')) + '/10'),
            ('', Paragraph('<b>OUTCOME MEASURES</b>', S_LABEL)),
            ('TUG (seconds)',     str(d.get('tug_time',''))),
            ('Berg Balance Scale',str(d.get('berg_score','')) + '/56'),
            ('Functional Reach Test', str(d.get('frt_score','')) + ' cm'),
            ('Other Measures',   _list_str(d.get('other_outcomes'))),
            ('Outcome Notes',    d.get('outcome_notes','')),
            ('', Paragraph('<b>PHYSIOTHERAPIST\'S IMPRESSION (ICF)</b>', S_LABEL)),
            ('Body Structure &amp; Function', d.get('pt_impression','')),
            ('Activity Limitation',          d.get('pt_impression_al','')),
            ('Participation Restriction',     d.get('pt_impression_pr','')),
            ('', Paragraph('<b>SHORT TERM GOALS</b>', S_LABEL)),
            (None, Paragraph(d.get('stg',''), S_NORMAL)),
            ('', Paragraph('<b>LONG TERM GOALS</b>', S_LABEL)),
            (None, Paragraph(d.get('ltg',''), S_NORMAL)),
            ('', Paragraph('<b>PLAN OF TREATMENT</b>', S_LABEL)),
            ('Interventions', _list_str(d.get('plan'))),
            (None, Paragraph(d.get('plan_notes',''), S_NORMAL)),
        ]
        return ruled_section(rows, RW2)

    story.append(two_col(left2(), right2(), lw=LW2, rw=RW2))
    story.append(gap(4))
    story += sign_chop_block()

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
        pair = []
        pair += soap_page(patient, notes[i], episode_info)
        if i + 1 < len(notes):
            pair += soap_page(patient, notes[i + 1], episode_info)
        story.append(KeepTogether(pair))

    return build_pdf(story)
