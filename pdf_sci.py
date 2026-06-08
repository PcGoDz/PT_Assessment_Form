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
    return story


def generate_sci_pdf(data):
    return build_pdf(_build_story(data))


def generate_episode_pdf(assessment_data, soap_notes, episode_info=None):
    return generate_episode_pdf_base(_build_story, TITLE, REF, assessment_data, soap_notes, episode_info)
