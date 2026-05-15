# pdf_hand.py — KKM Hand Assessment Form PDF (Platypus layout engine)
# fisio / b.pen. 12 / Pind. 2 / 2019

import json
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.colors import HexColor, white
from reportlab.platypus import (
    PageBreak, Paragraph, Spacer, KeepTogether, Table, TableStyle
)
from reportlab.platypus.flowables import Flowable

from pdf_platypus_base import (
    build_pdf, soap_page, sign_chop_block,
    box, two_col, kv, gap, patient_bar, page_header, data_table,
    S_NORMAL, S_BOLD, S_SMALL, S_LABEL,
    CW, LW, RW, ML, MR, MT, MB, BLACK, LGREY
)

TITLE = ['KEMENTERIAN KESIHATAN MALAYSIA',
         'PHYSIOTHERAPY DEPARTMENT',
         'HAND ASSESSMENT FORM']
REF   = 'fisio / b.pen. 12 / Pind. 2 / 2019'

# Hand-specific marker colours (different palette from body chart markers in pdf_platypus_base)
HAND_MARKER_COLORS = {
    'pain':     HexColor('#e53935'),
    'numb':     HexColor('#1e88e5'),
    'tingling': HexColor('#8e24aa'),
    'weak':     HexColor('#fb8c00'),
    'swelling': HexColor('#00897b'),
    'scar':     HexColor('#6d4c41'),
}
HAND_MARKER_LABELS = {
    'pain':     'Pain',
    'numb':     'Numbness',
    'tingling': 'Tingling',
    'weak':     'Weakness',
    'swelling': 'Swelling',
    'scar':     'Scar',
}


def _ensure_dict(val):
    if isinstance(val, str):
        try:
            return json.loads(val)
        except Exception:
            return {}
    return val or {}


class HandChartFlowable(Flowable):
    """Draws two simplified palmar hand outlines (R and L) with coloured markers."""

    def __init__(self, markers, width=None, height=60 * mm):
        super().__init__()
        self.markers = markers or []
        self._w = width or LW
        self._h = height

    def wrap(self, availW, availH):
        return self._w, self._h

    def draw(self):
        c = self.canv
        w = self._w
        h = self._h
        half = w / 2 - 4 * mm

        for hand_idx, hand_char in enumerate(['R', 'L']):
            ox = hand_idx * (half + 8 * mm)
            c.saveState()
            c.setStrokeColor(HexColor('#909090'))
            c.setFillColor(white)

            # Palm rectangle
            c.roundRect(ox + half * 0.25, h * 0.05,
                        half * 0.55, h * 0.40,
                        3 * mm, stroke=1, fill=1)

            # Thumb: left side for R hand, right side for L hand
            if hand_char == 'R':
                tx = ox + half * 0.12
            else:
                tx = ox + half * 0.65
            c.ellipse(tx, h * 0.25,
                      tx + half * 0.18, h * 0.60,
                      stroke=1, fill=1)

            # 4 fingers
            finger_starts = [0.28, 0.40, 0.52, 0.63]
            for fs in finger_starts:
                fx = ox + half * fs
                c.roundRect(fx, h * 0.42,
                            half * 0.10, h * 0.50,
                            2 * mm, stroke=1, fill=1)

            # Hand label
            c.setFont('Helvetica-Bold', 8)
            c.setFillColor(HexColor('#606060'))
            c.drawCentredString(ox + half / 2, h * 0.01, hand_char)
            c.restoreState()

            # Draw markers for this hand
            hand_markers = [m for m in self.markers
                            if m.get('hand', '').upper() == hand_char]
            for m in hand_markers:
                mx = ox + (m.get('x', 50) / 100.0) * half
                my = (m.get('y', 50) / 100.0) * h
                color = HAND_MARKER_COLORS.get(m.get('type', 'pain'),
                                               HAND_MARKER_COLORS['pain'])
                c.saveState()
                c.setFillColor(color)
                c.setStrokeColor(white)
                c.setLineWidth(0.5)
                c.circle(mx, my, 2.5 * mm, stroke=1, fill=1)
                c.restoreState()


def _build_story(data):
    if isinstance(data, str):
        try:
            data = json.loads(data)
        except Exception:
            data = {}

    patient    = _ensure_dict(data.get('patient', {}))
    hand_chart = _ensure_dict(data.get('handChart', {}))
    markers    = hand_chart.get('markers', [])
    rom_data   = _ensure_dict(data.get('rom', {}))
    rom_table  = rom_data.get('table', [])
    circ_data  = _ensure_dict(data.get('circumference', {}))
    circ_table = circ_data.get('table', [])
    other_tests = _ensure_dict(data.get('otherTests', {}))
    neuro      = _ensure_dict(data.get('neuro', {}))

    story = []
    story += page_header(TITLE, REF)
    story.append(patient_bar(patient, REF))
    story.append(gap(2))

    # ── Block 1: Diagnosis / Referral (left) | Hand Chart (right) ────────────
    left1 = box('Diagnosis & Referral', [
        kv('Diagnosis',       data.get('diagnosis', '')),
        kv('Referral Source', data.get('referralSource', '')),
        kv('Management',      data.get('managementType', '')),
        kv('Surgery Date',    data.get('surgeryDate', '')),
        kv('Surgery Type',    data.get('surgeryType', '')),
        kv('Dominant Hand',   data.get('sqDominantHand', '')),
        kv('Occupation',      data.get('sqOccupation', '')),
    ], width=LW)

    right1_items = [Paragraph('Hand Chart', S_LABEL), gap(1)]
    if markers:
        right1_items.append(HandChartFlowable(markers, width=RW - 10 * mm, height=55 * mm))
        legend_parts = []
        for t in HAND_MARKER_LABELS:
            hex_str = HAND_MARKER_COLORS[t].hexval()
            legend_parts.append(
                '<font color="{}">●</font> {}'.format(hex_str, HAND_MARKER_LABELS[t])
            )
        right1_items.append(Paragraph('  '.join(legend_parts), S_SMALL))
    else:
        right1_items.append(Paragraph('No markers placed.', S_SMALL))
    if hand_chart.get('notes'):
        right1_items.append(gap(1))
        right1_items.append(kv('Notes', hand_chart['notes']))

    right1 = box('', right1_items, width=RW)
    story.append(two_col(left1, right1))
    story.append(gap(2))

    # ── Block 2: Chief Complaint / Pain (left) | Special Questions + History (right) ──
    pain_nature = ', '.join(data.get('painNature', []) or [])
    left2 = box('Chief Complaint & Pain', [
        kv('Chief Complaint', data.get('chiefComplaint', '')),
        kv('Date of Onset',   data.get('onsetDate', '')),
        kv('Mechanism',       data.get('mechanism', '')),
        kv('Pain Score R',    data.get('painScoreR', '')),
        kv('Pain Score L',    data.get('painScoreL', '')),
        kv('Nature of Pain',  pain_nature),
        kv('Aggravating',     data.get('painAggravate', '')),
        kv('Relieving',       data.get('painRelieve', '')),
    ], width=LW)

    pmh = ', '.join(data.get('pastMedHistory', []) or [])
    pmh_other = data.get('pastMedOther', '')
    if pmh and pmh_other:
        pmh_full = pmh + ', ' + pmh_other
    elif pmh:
        pmh_full = pmh
    else:
        pmh_full = pmh_other

    right2 = box('Special Questions & History', [
        kv('General Health',  data.get('sqGeneralHealth', '')),
        kv('Health Notes',    data.get('sqHealthNotes', '')),
        kv('Medications',     data.get('sqMedications', '')),
        kv('Allergies',       data.get('sqAllergies', '')),
        kv('PMH',             pmh_full),
        kv('Social History',  data.get('socialHistory', '')),
        kv('Family History',  data.get('familyHistory', '')),
    ], width=RW)
    story.append(two_col(left2, right2))
    story.append(gap(2))

    # ── Block 3: Observation (left) | Palpation (right) ──────────────────────
    skin    = ', '.join(data.get('skinCondition', []) or [])
    deform  = ', '.join(data.get('deformity', []) or [])
    swell   = ', '.join(data.get('swelling', []) or [])
    left3 = box('Observation', [
        kv('Skin Condition', skin),
        kv('Deformity',      deform),
        kv('Swelling',       swell),
        kv('Wound Notes',    data.get('woundNotes', '')),
        kv('Notes',          data.get('observationNotes', '')),
    ], width=LW)

    right3 = box('Palpation', [
        kv('Tenderness',  data.get('tenderness', '')),
        kv('Temperature', data.get('temperature', '')),
        kv('Texture',     data.get('texture', '')),
        kv('Notes',       data.get('palpationNotes', '')),
    ], width=RW)
    story.append(two_col(left3, right3))
    story.append(gap(2))

    # ── ROM Table (full width, only if data present) ──────────────────────────
    if rom_table:
        rom_headers = ['Movement', 'Active L', 'Active R', 'Passive L', 'Passive R', 'OP L', 'OP R']
        rom_col_w   = [65 * mm, 20 * mm, 20 * mm, 20 * mm, 20 * mm, 17 * mm, 17 * mm]
        rom_rows    = [
            [r.get('movement', ''), r.get('activeL', ''), r.get('activeR', ''),
             r.get('passiveL', ''), r.get('passiveR', ''), r.get('opL', ''), r.get('opR', '')]
            for r in rom_table
        ]
        story.append(Paragraph('Range of Motion', S_BOLD))
        story.append(Spacer(1, 2 * mm))
        story.append(data_table(rom_headers, rom_rows, rom_col_w))
        story.append(gap(2))

    # ── Block 4: Strength + Circumference (left) | Sensation + Special Tests + Neuro (right) ──
    def grip_str(val):
        return '{} kg'.format(val) if val else ''

    circ_lines = [
        '{}: {} cm'.format(r.get('label', ''), r.get('value', ''))
        for r in circ_table
    ] if circ_table else []

    left4_content = [
        kv('Grip Strength R',  grip_str(data.get('gripStrengthR', ''))),
        kv('Grip Strength L',  grip_str(data.get('gripStrengthL', ''))),
        kv('Pinch Strength R', grip_str(data.get('pinchStrengthR', ''))),
        kv('Pinch Strength L', grip_str(data.get('pinchStrengthL', ''))),
    ]
    if circ_lines:
        left4_content.append(kv('Circumference', '\n'.join(circ_lines)))

    left4 = box('Strength & Circumference', left4_content, width=LW)

    def ot(test, side):
        return (other_tests.get(test) or {}).get(side, '')

    def rf_val(level, side):
        return (neuro.get('reflexes') or {}).get(level, {}).get(side, '')

    right4 = box('Sensation, Special Tests & Neurology', [
        kv('Light Touch R / L',  '{} / {}'.format(data.get('lightTouchR', ''), data.get('lightTouchL', ''))),
        kv('Pin Prick R / L',    '{} / {}'.format(data.get('pinPrickR', ''),   data.get('pinPrickL', ''))),
        kv('2PD R / L (mm)',     '{} / {}'.format(data.get('twoPointDiscR', ''), data.get('twoPointDiscL', ''))),
        kv('Sensation Notes',    data.get('sensationNotes', '')),
        gap(1),
        kv("Tinel's R / L",     '{} / {}'.format(ot('tinels', 'r'),        ot('tinels', 'l'))),
        kv("Phalen's R / L",    '{} / {}'.format(ot('phalens', 'r'),       ot('phalens', 'l'))),
        kv("Finkelstein's R/L", '{} / {}'.format(ot('finkelsteins', 'r'),  ot('finkelsteins', 'l'))),
        kv("Froment's R / L",   '{} / {}'.format(ot('fromens', 'r'),       ot('fromens', 'l'))),
        gap(1),
        kv('Reflexes C5 R/L',   '{} / {}'.format(rf_val('c5', 'r'),   rf_val('c5', 'l'))),
        kv('Reflexes C6 R/L',   '{} / {}'.format(rf_val('c6', 'r'),   rf_val('c6', 'l'))),
        kv('Reflexes C7 R/L',   '{} / {}'.format(rf_val('c7', 'r'),   rf_val('c7', 'l'))),
        kv('Reflexes C8T1 R/L', '{} / {}'.format(rf_val('c8t1', 'r'), rf_val('c8t1', 'l'))),
    ], width=RW)
    story.append(two_col(left4, right4))
    story.append(gap(2))

    # ── Block 5: PT Impression + STG (left) | LTG + Plan (right) ────────────
    left5 = box('PT Impression & Short-Term Goals', [
        kv('PT Impression',    data.get('ptImpression', '')),
        kv('Short-Term Goals', data.get('stg', '')),
    ], width=LW)

    right5 = box('Long-Term Goals & Treatment Plan', [
        kv('Long-Term Goals', data.get('ltg', '')),
        kv('Treatment Plan',  data.get('plan', '')),
    ], width=RW)
    story.append(two_col(left5, right5))
    story.append(gap(2))

    story += sign_chop_block()
    return story


def generate_hand_pdf(data):
    """Generate a single Hand Assessment PDF. Returns bytes."""
    return build_pdf(_build_story(data))


def generate_episode_pdf(assessment_data, soap_notes, episode_info=None):
    """Generate full episode PDF: assessment + SOAP notes. Returns bytes."""
    story = []
    patient = _ensure_dict((assessment_data or {}).get('patient', {}))

    if assessment_data:
        story += _build_story(assessment_data)
    else:
        story += page_header(TITLE, REF)
        story.append(
            Paragraph('No initial assessment recorded for this episode.', S_NORMAL)
        )

    notes = soap_notes or []
    for i in range(0, len(notes), 2):
        story.append(PageBreak())
        pair = []
        pair += soap_page(patient, notes[i], episode_info)
        if i + 1 < len(notes):
            pair += soap_page(patient, notes[i + 1], episode_info)
        story.append(KeepTogether(pair))

    return build_pdf(story)
