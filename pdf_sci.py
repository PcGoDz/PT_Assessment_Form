# pdf_sci.py — KKM Spinal Cord Injury Assessment Form PDF
# KKM Ref: fisio / b.pen. 4 / Pind. 2 / 2019 — house style matches pdf_neuro.py.
# Grid-heavy form: sensory / proprioception / MMT / upright / 5 functional grids
# render as Tables via grid_table() with four+ distinct cell states.
# NO body chart (sensory is captured as a TABLE, not marker coords — by design).

from reportlab.platypus import Paragraph, Table, TableStyle
from reportlab.lib.units import mm
from reportlab.lib import colors
from pdf_platypus_base import (
    build_pdf, page_header, patient_bar,
    sign_chop_block, gap,
    S_LABEL, S_NORMAL, S_SMALL, S_BOLD,
    CW, LW, RW, BLACK, LGREY,
    ensure_dict, generate_episode_pdf_base,
)

REF   = 'fisio / b.pen. 4 / Pind. 2 / 2019'
TITLE = ['KEMENTERIAN KESIHATAN MALAYSIA',
         'PHYSIOTHERAPY DEPARTMENT',
         'SPINAL CORD INJURY ASSESSMENT FORM']

# Legend captions (verbatim from KKM borang) — keep in sync with static/js/form_sci.js LEGENDS const.
# NT / N/A are app additions (stamp buttons), appended as a clearly app-side tail.
PDF_LEGENDS = {
    'sensory':    'N- Normal/ I- Impaired/ A- Absent · NT=Not Tested',
    'functional': 'U – Unable, A – Assisted, S- Supervised, I – Independent · NT=Not Tested',
    'balance':    'G- Good, F – Fair, P- Poor · NT=Not Tested',
    'upright':    'Good/ Fair/Poor · N/A=Not Applicable',
    'mmt':        'MMT: Oxford scale 0–5 · MAS: Modified Ashworth 0–4 · NT=Not Tested',
}


def _legend(txt):
    return Paragraph(f'<i>{txt}</i>', S_SMALL)


# ── Grid column maps — mirror static/js/form_sci.js column configs ──
# Each entry: list of (col_id, header_label) in display order.
GRID_COLUMNS = {
    'sensory': [
        ('pp_l', 'Pin Prick L'), ('pp_r', 'Pin Prick R'),
        ('lt_l', 'Light Touch L'), ('lt_r', 'Light Touch R'),
    ],
    'proprioception': [
        ('r', 'R'), ('l', 'L'),
    ],
    'mmt': [
        ('mmt_l', 'MMT L'), ('mmt_r', 'MMT R'),
        ('prom_l', 'PROM L'), ('prom_r', 'PROM R'),
        ('mas_l', 'MAS L'), ('mas_r', 'MAS R'),
    ],
    'upright_control': [
        ('flex_l', 'Flex L'), ('flex_r', 'Flex R'),
        ('ext_l', 'Ext L'), ('ext_r', 'Ext R'),
    ],
    'functional': [
        ('val', 'Grade'),
    ],
}


def _ls(val, sep=', '):
    if isinstance(val, list):
        return sep.join([str(v) for v in val if v])
    return str(val) if val else ''


def rs(rows, width):
    """Ruled label/value section — house style (mirrors pdf_neuro.rs)."""
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


def grid_table(grid_rows, columns, width):
    """Render an AssessmentGrid getData() array as a four-state Table.

    grid_rows: list of row dicts {label, colId: value, ...}. Greyed cell = colId ABSENT.
    columns:   list of (col_id, header_label) in display order.
    Cell states:
      key absent  -> greyed: light-grey BACKGROUND, empty text
      value ''    -> em-dash placeholder
      value 'NT'  -> 'NT'
      value 'N/A' -> 'N/A'
      other       -> the value, plain
    """
    n = len(columns)
    label_w = width * 0.28
    cell_w  = (width - label_w) / n if n else width
    col_w   = [label_w] + [cell_w] * n

    header = [Paragraph('', S_SMALL)] + [Paragraph(f'<b>{lab}</b>', S_SMALL) for _, lab in columns]
    table_rows  = [header]
    grey_coords = []   # (col_index, row_index) 1-based for data cells

    for ri, row in enumerate(grid_rows or [], start=1):
        cells = [Paragraph(f"<b>{str(row.get('label', ''))}</b>", S_SMALL)]
        for ci, (cid, _lab) in enumerate(columns, start=1):
            if cid not in row:                      # greyed — key absent
                cells.append(Paragraph('', S_SMALL))
                grey_coords.append((ci, ri))
            else:
                v = row.get(cid, '')
                txt = '—' if v == '' else str(v)   # em-dash for blank
                cells.append(Paragraph(txt, S_SMALL))
        table_rows.append(cells)

    style = [
        ('BOX',           (0, 0), (-1, -1), 0.5, BLACK),
        ('INNERGRID',     (0, 0), (-1, -1), 0.25, LGREY),
        ('FONTSIZE',      (0, 0), (-1, -1), 6.5),
        ('TOPPADDING',    (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ('LEFTPADDING',   (0, 0), (-1, -1), 3),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 3),
        ('VALIGN',        (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN',         (1, 0), (-1, -1), 'CENTER'),
        ('BACKGROUND',    (0, 0), (-1,  0), colors.HexColor('#f0f0f0')),  # header row
    ]
    for (ci, ri) in grey_coords:
        style.append(('BACKGROUND', (ci, ri), (ci, ri), colors.HexColor('#cccccc')))

    t = Table(table_rows, colWidths=col_w, repeatRows=1)   # header repeats on page split
    t.setStyle(TableStyle(style))
    return t


def _pair_half(title, rows, half_w, lab_ratio=0.40):
    """One side of a pair_box: bold title row + label/value rows, BORDERLESS
    (the outer pair_box owns the box + divider). title rows span both cols."""
    inner, spans = [], []
    if title:
        inner.append([Paragraph(f'<b>{title}</b>', S_LABEL), '']); spans.append(0)
    for lab, val in rows:
        if lab is None or lab == '':
            vp = val if not isinstance(val, str) else Paragraph(val, S_NORMAL)
            inner.append([vp, '']); spans.append(len(inner) - 1)
        else:
            inner.append([Paragraph(f'<b>{lab}</b>', S_NORMAL),
                          val if not isinstance(val, str) else Paragraph(str(val), S_NORMAL)])
    t = Table(inner, colWidths=[half_w * lab_ratio, half_w * (1 - lab_ratio)])
    st = [('TOPPADDING',(0,0),(-1,-1),2),('BOTTOMPADDING',(0,0),(-1,-1),2),
          ('LEFTPADDING',(0,0),(-1,-1),4),('RIGHTPADDING',(0,0),(-1,-1),4),
          ('VALIGN',(0,0),(-1,-1),'TOP'),('FONTSIZE',(0,0),(-1,-1),7),
          ('LINEBELOW',(0,0),(-1,-2),0.3,LGREY)]
    for i in spans: st.append(('SPAN',(0,i),(1,i)))
    t.setStyle(TableStyle(st))
    return t


def pair_box(left, right, width=CW):
    """Equal-height side-by-side pair. left/right = (title, [(label,value),...]).
    ONE outer rectangle + center divider; both halves draw flush regardless of
    content height (kills the staircase)."""
    half = width / 2.0
    outer = Table([[_pair_half(*left, half), _pair_half(*right, half)]],
                  colWidths=[half, half])
    outer.setStyle(TableStyle([
        ('BOX',          (0,0), (-1,-1), 0.5, BLACK),
        ('LINEAFTER',    (0,0), (0,-1),  0.5, BLACK),
        ('VALIGN',       (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING',  (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING',   (0,0), (-1,-1), 0),
        ('BOTTOMPADDING',(0,0), (-1,-1), 0),
    ]))
    return outer


def _build_story(d):
    story   = []
    patient = ensure_dict(d.get('patient'))

    story += page_header(TITLE, REF)
    story.append(patient_bar(patient, REF))
    story.append(gap(2))

    # Pair 1 — Diagnosis & Management | Problem
    story.append(pair_box(
        ('DIAGNOSIS & MANAGEMENT', [
            ('Diagnosis',           d.get('diagnosis', '')),
            ("Doctor's Management", d.get('dr_management', '')),
        ]),
        ('PROBLEM', [
            (None, Paragraph(d.get('problem', ''), S_NORMAL)),
        ]),
    ))
    story.append(gap(2))

    # Pair 2 — History | Special Questions
    sq = d.get('special_questions') or {}
    story.append(pair_box(
        ('HISTORY', [
            ('Current History', d.get('current_history', '')),
            ('Past History',    d.get('past_history', '')),
        ]),
        ('SPECIAL QUESTIONS', [
            ('Date of Surgery', sq.get('date_surgery', '')),
            ('Occupation',      sq.get('occupation', '')),
            ('Investigation',   sq.get('investigation', '')),
        ]),
    ))
    story.append(gap(2))

    # Full-width grids: Sensory → Proprioception → MMT → Upright Control
    story += [Paragraph('<b>SENSORY (DERMATOMES)</b>', S_BOLD), gap(1),
              grid_table(d.get('sensory', []), GRID_COLUMNS['sensory'], CW),
              _legend(PDF_LEGENDS['sensory']), gap(2)]

    story += [Paragraph('<b>PROPRIOCEPTION</b>', S_BOLD), gap(1),
              grid_table(d.get('proprioception', []), GRID_COLUMNS['proprioception'], CW),
              _legend(PDF_LEGENDS['sensory']), gap(2)]

    story += [Paragraph('<b>MUSCLE STRENGTH (MMT) / PROM / MAS</b>', S_BOLD), gap(1),
              grid_table(d.get('mmt', []), GRID_COLUMNS['mmt'], CW),
              _legend(PDF_LEGENDS['mmt']), gap(2)]

    story += [Paragraph('<b>UPRIGHT CONTROL</b>', S_BOLD), gap(1),
              grid_table(d.get('upright_control', []), GRID_COLUMNS['upright_control'], CW),
              _legend(PDF_LEGENDS['upright']), gap(2)]

    # Full-width: 5 Functional grids + conditional Notes lines
    func  = d.get('functional') or {}
    notes = func.get('notes') or {}
    for key, title in [
        ('body_handling', 'BODY HANDLING'),
        ('balance',       'BALANCE'),
        ('transfer',      'TRANSFER'),
        ('wheelchair',    'WHEELCHAIR SKILLS'),
        ('walking',       'WALKING'),
    ]:
        leg_key = 'balance' if key == 'balance' else 'functional'
        story += [Paragraph(f'<b>FUNCTIONAL — {title}</b>', S_BOLD), gap(1),
                  grid_table(func.get(key, []), GRID_COLUMNS['functional'], CW),
                  _legend(PDF_LEGENDS[leg_key])]
        note = notes.get(key, '')
        if note:
            story.append(rs([('Notes', note)], CW))
        story.append(gap(2))

    # Pair 3 — Respiratory | Skin Integrity
    resp = d.get('respiratory') or {}
    story.append(pair_box(
        ('RESPIRATORY', [
            ('Breathing Pattern', _ls(resp.get('breathing_pattern'))),
            ('Cough',             resp.get('cough', '')),
            ('Vital Capacity',    resp.get('vc', '')),
            ('PEFR',              resp.get('pefr', '')),
        ]),
        ('SKIN INTEGRITY', [
            (None, Paragraph(d.get('skin_integrity', ''), S_NORMAL)),
        ]),
    ))
    story.append(gap(2))

    # Pair 4 — Pain Score (VAS) | Home Environment
    pain = d.get('pain') or {}
    story.append(pair_box(
        ('PAIN SCORE (VAS)', [
            ('Pre',  str(pain.get('pre', '')) + '/10'),
            ('Post', str(pain.get('post', '')) + '/10'),
        ]),
        ('HOME ENVIRONMENT', [
            (None, Paragraph(d.get('home_environment', ''), S_NORMAL)),
        ]),
    ))
    story.append(gap(2))

    # Full-width: Outcome Measures + Assistive Aids
    om = d.get('outcome_measures') or {}
    story.append(rs([
        ('', Paragraph('<b>OUTCOME MEASURES</b>', S_LABEL)),
        ('10MWT', om.get('tenmwt', '')),
        ('SCIM',  om.get('scim', '')),
        ('WISCI', om.get('wisci', '')),
    ], CW))
    story.append(gap(2))

    aa = d.get('assistive_aids') or {}
    story.append(rs([
        ('', Paragraph('<b>ASSISTIVE AIDS</b>', S_LABEL)),
        ('Wheelchair', _ls(aa.get('wheelchair'))),
        ('Cushion',    _ls(aa.get('cushion'))),
        ('Orthosis',   aa.get('orthosis', '')),
    ], CW))
    story.append(gap(2))

    # 16 — Narrative tail: PT Impression / STG / LTG / Plan
    story.append(rs([
        ('', Paragraph('<b>PT IMPRESSION</b>', S_LABEL)),
        (None, Paragraph(d.get('pt_impression', ''), S_NORMAL)),
        ('', Paragraph('<b>SHORT TERM GOALS</b>', S_LABEL)),
        (None, Paragraph(d.get('stg', ''), S_NORMAL)),
        ('', Paragraph('<b>LONG TERM GOALS</b>', S_LABEL)),
        (None, Paragraph(d.get('ltg', ''), S_NORMAL)),
        ('', Paragraph('<b>PLAN OF TREATMENT</b>', S_LABEL)),
        (None, Paragraph(d.get('plan', ''), S_NORMAL)),
    ], CW))

    # 17 — Sign & chop footer
    story += sign_chop_block()

    return story


def generate_sci_pdf(data):
    return build_pdf(_build_story(data))


def generate_episode_pdf(assessment_data, soap_notes, episode_info=None):
    return generate_episode_pdf_base(_build_story, TITLE, REF, assessment_data, soap_notes, episode_info)
