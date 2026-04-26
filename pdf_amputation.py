# pdf_amputation.py — KKM Amputee Assessment Form PDF (Platypus layout engine)
# fisio / b.pen. 16 / 2019

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

REF   = 'fisio / b.pen. 16 / 2019'
TITLE = ['KEMENTERIAN KESIHATAN MALAYSIA',
         'PHYSIOTHERAPY DEPARTMENT',
         'AMPUTEE ASSESSMENT FORM']


def _build_story(d):
    import json as _json

    def _ensure_dict(val):
        if isinstance(val, str):
            try:
                return _json.loads(val)
            except Exception:
                return {}
        return val if isinstance(val, dict) else {}

    story   = []
    patient = _ensure_dict(d.get('patient'))
    bc      = _ensure_dict(d.get('bodyChart') or d.get('body_chart'))

    PAD = [
        ('TOPPADDING',    (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING',   (0,0), (-1,-1), 4),
        ('RIGHTPADDING',  (0,0), (-1,-1), 4),
        ('VALIGN',        (0,0), (-1,-1), 'TOP'),
        ('FONTSIZE',      (0,0), (-1,-1), 7),
    ]

    def cell(content, bold=False):
        """Render content as a Paragraph or list."""
        if isinstance(content, list):
            return content
        s = S_LABEL if bold else S_NORMAL
        if content:
            return Paragraph(str(content), s)
        return Paragraph('', S_NORMAL)

    def ruled_section(rows, width, min_row_h=6*mm):
        """
        Build one continuous bordered table — KKM style.
        rows = list of (label, value_or_flowable)
          label=None means full-width content row
          label='' means section header row (bold, full span)
        """
        table_rows = []
        col_w = [width * 0.38, width * 0.62]

        for label, val in rows:
            if label is None:
                # Full-width content row
                table_rows.append([val, ''])
            elif label == '':
                # Section header — full span
                table_rows.append([val, ''])
            else:
                lp = Paragraph(f'<b>{label}</b>', S_NORMAL)
                if isinstance(val, str):
                    vp = Paragraph(val, S_NORMAL) if val else Paragraph('', S_NORMAL)
                else:
                    vp = val
                table_rows.append([lp, vp])

        style = [
            ('BOX',          (0,0),  (-1,-1), 0.5, BLACK),
            ('LINEBELOW',    (0,0),  (-1,-2), 0.3, LGREY),
            ('TOPPADDING',   (0,0),  (-1,-1), 3),
            ('BOTTOMPADDING',(0,0),  (-1,-1), 3),
            ('LEFTPADDING',  (0,0),  (-1,-1), 4),
            ('RIGHTPADDING', (0,0),  (-1,-1), 4),
            ('VALIGN',       (0,0),  (-1,-1), 'TOP'),
            ('FONTSIZE',     (0,0),  (-1,-1), 7),
        ]

        # Span full-width rows
        for i, (label, _) in enumerate(rows):
            if label is None or label == '':
                style.append(('SPAN', (0,i), (1,i)))

        t = Table(table_rows, colWidths=col_w,
                  repeatRows=0)
        t.setStyle(TableStyle(style))
        return t

    # ── PAGE 1 ──────────────────────────────────────────────────────
    story += page_header(TITLE, REF)
    story.append(patient_bar(patient, REF))
    story.append(gap(2))

    # ── LEFT COLUMN PAGE 1 ──────────────────────────────────────────
    def left():
        phantom_val = d.get('phantom_present', 'No')
        pls = 'Yes' if str(phantom_val).lower() in ('yes','true','1') else 'No'
        phantom_line = f'{pls}'
        if pls == 'Yes':
            parts = []
            if d.get('phantom_type'):     parts.append(d.get('phantom_type'))
            if d.get('phantom_duration'): parts.append(d.get('phantom_duration'))
            if d.get('phantom_comments'): parts.append(d.get('phantom_comments'))
            if parts: phantom_line += ' — ' + '; '.join(parts)

        pain_pre  = str(d.get('pain_pre','0'))
        pain_post = str(d.get('pain_post','0'))

        rows = [
            ('', Paragraph('<b>DIAGNOSIS</b>', S_LABEL)),
            (None, Paragraph(d.get('diagnosis',''), S_NORMAL)),
            ('', Paragraph("<b>DOCTOR'S MANAGEMENT</b>", S_LABEL)),
            (None, Paragraph(d.get('doctors_management',''), S_NORMAL)),
            ('', Paragraph('<b>PROBLEMS</b>', S_LABEL)),
            (None, Paragraph(d.get('problems',''), S_NORMAL)),
            ('', Paragraph('<b>PAIN SCALE</b>', S_LABEL)),
            ('PRE', pain_pre),
            ('POST', pain_post),
            ('Nature:', d.get('pain_nature','')),
            ('Agg:', d.get('pain_agg','')),
            ('Ease:', d.get('pain_ease','')),
            ('Irritability:', d.get('pain_irritability','')),
            ('', Paragraph(f'<b>PHANTOM LIMB SENSATION; PRESENT</b>', S_LABEL)),
            (None, Paragraph(phantom_line, S_NORMAL)),
            ('', Paragraph('<b>SPECIAL QUESTION</b>', S_LABEL)),
            ('General Health:', d.get('sq_general_health','')),
            ('PMHx / Surgery:', d.get('sq_pmhx','')),
            ('Medication:', d.get('sq_medication','')),
            ('Social Hx / Occupation:', d.get('sq_social_history','')),
            ('Home / Work Accessibility:', d.get('sq_home_access','')),
            ('Pre-Morbid Condition:', d.get('sq_pre_morbid','')),
            ('', Paragraph('<b>PROSTHETIC USAGE</b>', S_LABEL)),
            ('Types of Prosthesis:', d.get('prosthetic_types','')),
            ('Don / Doff:', d.get('prosthetic_don_doff','')),
            ('Static Weight Bearing:', d.get('prosthetic_static_wb','')),
            ('Max Walking Distance/day:', d.get('prosthetic_max_walk','')),
            ('Duration Wearing/day:', d.get('prosthetic_duration','')),
        ]
        return [ruled_section(rows, LW2)]

    # ── RIGHT COLUMN PAGE 1 ─────────────────────────────────────────
    def right():
        items = []

        # Body chart — keep as box
        items.append(body_chart_section(bc, width=RW2))
        items.append(gap(1))

        right_rows = [
            ('', Paragraph('<b>CURRENT HISTORY</b>', S_LABEL)),
            (None, Paragraph(d.get('current_history',''), S_NORMAL)),
            ('', Paragraph('<b>PAST HISTORY</b>', S_LABEL)),
            (None, Paragraph(d.get('past_history',''), S_NORMAL)),
            ('', Paragraph('<b>OBSERVATION</b>', S_LABEL)),
            ('', Paragraph('<b>General / Local</b>', S_NORMAL)),
            (None, Paragraph(d.get('obs_general',''), S_NORMAL)),
            ('', Paragraph('<b>Stump Condition:</b>', S_NORMAL)),
            (None, Paragraph(d.get('obs_stump_condition',''), S_NORMAL)),
            ('Bandaging skill:', d.get('obs_bandaging','')),
            ('Gait:', d.get('obs_gait','')),
            ('', Paragraph('<b>PALPATION</b>', S_LABEL)),
            (None, Paragraph(d.get('palpation',''), S_NORMAL)),
            ('', Paragraph('<b>CARDIORESPIRATORY STATUS:</b>', S_LABEL)),
            (None, Paragraph(d.get('cardio_status',''), S_NORMAL)),
        ]
        items.append(ruled_section(right_rows, RW2))
        return items

    story.append(two_col(left(), right(), lw=LW2, rw=RW2))
    story.append(PageBreak())

    # ── PAGE 2 ──────────────────────────────────────────────────────

    # Movement Table — full width
    movements = d.get('movements', [])
    if not movements:
        movements = [{'joint': '', 'active': '', 'passive': '', 'comments': ''}] * 6
    mov_hdr = [Paragraph('<b>JOINT</b>', S_LABEL),
               Paragraph('<b>ACTIVE</b>', S_LABEL),
               Paragraph('<b>PASSIVE</b>', S_LABEL),
               Paragraph('<b>COMMENTS</b>', S_LABEL)]
    mov_rows = [mov_hdr]
    for m in movements:
        if not isinstance(m, dict): continue
        mov_rows.append([
            Paragraph(m.get('joint',''),    S_NORMAL),
            Paragraph(m.get('active',''),   S_NORMAL),
            Paragraph(m.get('passive',''),  S_NORMAL),
            Paragraph(m.get('comments',''), S_NORMAL),
        ])
    # Pad to at least 6 data rows for writing space
    while len(mov_rows) < 7:
        mov_rows.append([Paragraph('', S_NORMAL)] * 4)

    cw_j = CW * 0.30
    cw_a = CW * 0.22
    cw_p = CW * 0.22
    cw_c = CW - cw_j - cw_a - cw_p
    story.append(Table(mov_rows, colWidths=[cw_j, cw_a, cw_p, cw_c],
        style=TableStyle([
            ('BOX',          (0,0), (-1,-1), 0.5, BLACK),
            ('LINEBELOW',    (0,0), (-1,-2), 0.3, LGREY),
            ('LINEAFTER',    (0,0), (-2,-1), 0.3, LGREY),
            ('FONTSIZE',     (0,0), (-1,-1), 7),
            ('TOPPADDING',   (0,0), (-1,-1), 3),
            ('BOTTOMPADDING',(0,0), (-1,-1), 3),
            ('LEFTPADDING',  (0,0), (-1,-1), 4),
            ('RIGHTPADDING', (0,0), (-1,-1), 4),
            ('ROWBACKGROUNDS',(0,1),(-1,-1), [colors.white, colors.HexColor('#f5f5f5')]),
        ])))
    story.append(gap(3))

    # ── LEFT COLUMN PAGE 2 ──────────────────────────────────────────
    # ── LEFT COLUMN PAGE 2 ──────────────────────────────────────────
    def left2():
        INN = LW2 - 8*mm  # usable width inside cell padding

        # ── MMT ─────────────────────────────────
        mmt_data = d.get('mmt', [])
        if isinstance(mmt_data, list) and mmt_data:
            mmt_rows = [[Paragraph('<b>Muscle Group</b>', S_SMALL),
                         Paragraph('<b>Side</b>', S_SMALL),
                         Paragraph('<b>Grade</b>', S_SMALL),
                         Paragraph('<b>Comments</b>', S_SMALL)]]
            for m in mmt_data:
                if isinstance(m, dict) and (m.get('muscle') or m.get('grade')):
                    mmt_rows.append([
                        Paragraph(m.get('muscle',''), S_SMALL),
                        Paragraph(m.get('side',''),   S_SMALL),
                        Paragraph(m.get('grade',''),  S_SMALL),
                        Paragraph(m.get('comment',''),S_SMALL),
                    ])
            while len(mmt_rows) < 5:
                mmt_rows.append([Paragraph('', S_SMALL)] * 4)
            mmt_inner = Table(mmt_rows,
                colWidths=[INN*0.44, INN*0.10, INN*0.10, INN*0.36],
                style=TableStyle([
                    ('INNERGRID',    (0,0), (-1,-1), 0.3, LGREY),
                    ('FONTSIZE',     (0,0), (-1,-1), 6.5),
                    ('TOPPADDING',   (0,0), (-1,-1), 2),
                    ('BOTTOMPADDING',(0,0), (-1,-1), 2),
                    ('LEFTPADDING',  (0,0), (-1,-1), 3),
                    ('RIGHTPADDING', (0,0), (-1,-1), 3),
                ]))
        else:
            mmt_inner = Spacer(1, 12*mm)

        # ── MRMI ─────────────────────────────────
        om_skipped = d.get('outcome_skipped', False)
        if om_skipped:
            reason = d.get('outcome_skip_reason', '')
            notes  = d.get('outcome_skip_notes', '')
            om_inner = [Paragraph(f'Not assessed \u2014 {reason}', S_NORMAL)]
            if notes:
                om_inner.append(Paragraph(f'Notes: {notes}', S_NORMAL))
            om_inner = om_inner[0] if len(om_inner) == 1 else om_inner
        else:
            mrmi_list = [
                ('1. Turning over',        d.get('mrmi_1', '')),
                ('2. Lying to sitting',    d.get('mrmi_2', '')),
                ('3. Sitting Balance',     d.get('mrmi_3', '')),
                ('4. Sitting to Standing', d.get('mrmi_4', '')),
                ('5. Standing',            d.get('mrmi_5', '')),
                ('6. Transfer',            d.get('mrmi_6', '')),
                ('7. Walking Indoors',     d.get('mrmi_7', '')),
                ('8. Stairs',              d.get('mrmi_8', '')),
            ]
            mrmi_total = sum(int(v) for _, v in mrmi_list if str(v).isdigit())
            mrmi_date  = d.get('mrmi_date', '')
            mrmi_rows  = [[Paragraph('<b>Item</b>', S_SMALL),
                           Paragraph(f'<b>Score  ({mrmi_date})</b>', S_SMALL)]]
            for lbl, val in mrmi_list:
                mrmi_rows.append([Paragraph(lbl, S_SMALL), Paragraph(str(val), S_SMALL)])
            mrmi_rows.append([Paragraph('<b>TOTAL</b>', S_SMALL),
                               Paragraph(f'<b>{mrmi_total} / 40</b>', S_SMALL)])
            mrmi_tbl = Table(mrmi_rows, colWidths=[INN*0.72, INN*0.28],
                style=TableStyle([
                    ('INNERGRID',    (0,0), (-1,-1), 0.3, LGREY),
                    ('FONTSIZE',     (0,0), (-1,-1), 6.5),
                    ('TOPPADDING',   (0,0), (-1,-1), 2),
                    ('BOTTOMPADDING',(0,0), (-1,-1), 2),
                    ('LEFTPADDING',  (0,0), (-1,-1), 3),
                    ('RIGHTPADDING', (0,0), (-1,-1), 3),
                    ('ROWBACKGROUNDS', (0,1), (-1,-2), [colors.white, colors.HexColor('#f5f5f5')]),
                ]))
            tug = f'{d.get("tug_walking_aid","")}  Time: {d.get("tug_distance","")}'
            mwt = f'{d.get("mwt_walking_aid","")}  Distance: {d.get("mwt_distance","")} m'
            om_inner = [
                Paragraph('0=unable \u00b7 1=assist\u00d72 \u00b7 2=assist\u00d71 \u00b7 3=supervision \u00b7 4=aids \u00b7 5=independent', S_SMALL),
                mrmi_tbl,
                gap(1),
                Paragraph(f'<b>b) TUG</b>  Aid: {tug}', S_NORMAL),
                Paragraph(f'<b>c) 2MWT</b>  Aid: {mwt}', S_NORMAL),
            ]

        # Build as one continuous bordered table — KKM style
        rows = [
            ('', Paragraph('<b>MANUAL MUSCLE TESTING</b>', S_LABEL)),
            (None, mmt_inner),
            ('', Paragraph('<b>STUMP MEASUREMENT</b>', S_LABEL)),
            ('Length:', d.get('stump_length', '')),
            ('Circumference:', d.get('stump_circumference', '')),
            ('', Paragraph('<b>CLEARING TESTS AND MEASUREMENTS</b>', S_LABEL)),
            (None, Paragraph(d.get('clearing_tests', ''), S_NORMAL)),
            ('', Paragraph('<b>OUTCOME MEASUREMENT</b>', S_LABEL)),
            ('', Paragraph('<b>a) Modified Rivermead Mobility Index</b>', S_NORMAL)),
            (None, om_inner),
        ]
        return [ruled_section(rows, LW2)]

    # ── RIGHT COLUMN PAGE 2 ─────────────────────────────────────────
    def right2():
        rows = [
            ('', Paragraph("<b>PHYSIOTHERAPIST'S IMPRESSION</b>", S_LABEL)),
            (None, Paragraph(d.get('pt_impression', ''), S_NORMAL)),
            ('', Paragraph("<b>PATIENT'S GOALS</b>", S_LABEL)),
            (None, Paragraph(d.get('patient_goals', ''), S_NORMAL)),
            ('', Paragraph('<b>SHORT TERM GOALS</b>', S_LABEL)),
            (None, Paragraph(d.get('short_term_goals', ''), S_NORMAL)),
            ('', Paragraph('<b>LONG TERM GOALS</b>', S_LABEL)),
            (None, Paragraph(d.get('long_term_goals', ''), S_NORMAL)),
            ('', Paragraph('<b>PLAN OF TREATMENT</b>', S_LABEL)),
            (None, Paragraph(d.get('plan_of_treatment', ''), S_NORMAL)),
        ]
        items = [ruled_section(rows, RW2)]
        items += sign_chop_block()
        return items

    story.append(two_col(left2(), right2(), lw=LW2, rw=RW2))
    return story

    # ── Left column / Right column split ──────────────────────────
def generate_amputation_pdf(data):
    return build_pdf(_build_story(data))


def generate_episode_pdf(assessment_data, soap_notes, episode_info=None):
    import json
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
