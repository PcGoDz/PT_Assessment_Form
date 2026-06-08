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
