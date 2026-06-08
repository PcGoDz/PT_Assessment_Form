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


def _build_story(d):
    story   = []
    patient = ensure_dict(d.get('patient'))

    story += page_header(TITLE, REF)
    story.append(patient_bar(patient, REF))
    story.append(gap(2))

    # 1 — Diagnosis & Management
    story.append(rs([
        ('', Paragraph('<b>DIAGNOSIS &amp; MANAGEMENT</b>', S_LABEL)),
        ('Diagnosis',            d.get('diagnosis', '')),
        ("Doctor's Management",  d.get('dr_management', '')),
    ], CW))
    story.append(gap(2))

    # 2 — Problem
    story.append(rs([
        ('', Paragraph('<b>PROBLEM</b>', S_LABEL)),
        (None, Paragraph(d.get('problem', ''), S_NORMAL)),
    ], CW))
    story.append(gap(2))

    # 3 — Pain Score (VAS)
    pain = d.get('pain') or {}
    story.append(rs([
        ('', Paragraph('<b>PAIN SCORE (VAS)</b>', S_LABEL)),
        ('Pre',  str(pain.get('pre', '')) + '/10'),
        ('Post', str(pain.get('post', '')) + '/10'),
    ], CW))
    story.append(gap(2))

    # 4 — History
    story.append(rs([
        ('', Paragraph('<b>HISTORY</b>', S_LABEL)),
        ('Current History', d.get('current_history', '')),
        ('Past History',    d.get('past_history', '')),
    ], CW))
    story.append(gap(2))

    # 5 — Special Questions
    sq = d.get('special_questions') or {}
    story.append(rs([
        ('', Paragraph('<b>SPECIAL QUESTIONS</b>', S_LABEL)),
        ('Date of Surgery', sq.get('date_surgery', '')),
        ('Occupation',      sq.get('occupation', '')),
        ('Investigation',   sq.get('investigation', '')),
    ], CW))
    story.append(gap(2))

    # 6 — Home Environment
    story.append(rs([
        ('', Paragraph('<b>HOME ENVIRONMENT</b>', S_LABEL)),
        (None, Paragraph(d.get('home_environment', ''), S_NORMAL)),
    ], CW))
    story.append(gap(2))

    # 7 — Respiratory
    resp = d.get('respiratory') or {}
    story.append(rs([
        ('', Paragraph('<b>RESPIRATORY</b>', S_LABEL)),
        ('Breathing Pattern', _ls(resp.get('breathing_pattern'))),
        ('Cough',             resp.get('cough', '')),
        ('Vital Capacity',    resp.get('vc', '')),
        ('PEFR',              resp.get('pefr', '')),
    ], CW))
    story.append(gap(2))

    # 8 — Skin Integrity
    story.append(rs([
        ('', Paragraph('<b>SKIN INTEGRITY</b>', S_LABEL)),
        (None, Paragraph(d.get('skin_integrity', ''), S_NORMAL)),
    ], CW))
    story.append(gap(2))

    # 9 — Sensory (dermatomes) grid
    story += [Paragraph('<b>SENSORY (DERMATOMES)</b>', S_BOLD), gap(1),
              grid_table(d.get('sensory', []), GRID_COLUMNS['sensory'], CW), gap(2)]

    # 10 — Proprioception grid
    story += [Paragraph('<b>PROPRIOCEPTION</b>', S_BOLD), gap(1),
              grid_table(d.get('proprioception', []), GRID_COLUMNS['proprioception'], CW), gap(2)]

    # 11 — MMT grid
    story += [Paragraph('<b>MUSCLE STRENGTH (MMT) / PROM / MAS</b>', S_BOLD), gap(1),
              grid_table(d.get('mmt', []), GRID_COLUMNS['mmt'], CW), gap(2)]

    # 12 — Upright Control grid
    story += [Paragraph('<b>UPRIGHT CONTROL</b>', S_BOLD), gap(1),
              grid_table(d.get('upright_control', []), GRID_COLUMNS['upright_control'], CW), gap(2)]

    # 13 — Functional (5 grids, each followed by its notes line if present)
    func  = d.get('functional') or {}
    notes = func.get('notes') or {}
    for key, title in [
        ('body_handling', 'BODY HANDLING'),
        ('balance',       'BALANCE'),
        ('transfer',      'TRANSFER'),
        ('wheelchair',    'WHEELCHAIR SKILLS'),
        ('walking',       'WALKING'),
    ]:
        story += [Paragraph(f'<b>FUNCTIONAL — {title}</b>', S_BOLD), gap(1),
                  grid_table(func.get(key, []), GRID_COLUMNS['functional'], CW)]
        note = notes.get(key, '')
        if note:
            story.append(rs([('Notes', note)], CW))
        story.append(gap(2))

    # 14 — Outcome Measures
    om = d.get('outcome_measures') or {}
    story.append(rs([
        ('', Paragraph('<b>OUTCOME MEASURES</b>', S_LABEL)),
        ('10MWT', om.get('tenmwt', '')),
        ('SCIM',  om.get('scim', '')),
        ('WISCI', om.get('wisci', '')),
    ], CW))
    story.append(gap(2))

    # 15 — Assistive Aids
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
