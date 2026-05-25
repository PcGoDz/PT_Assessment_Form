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
    CW, LW, RW, ML, MR, MT, MB, BLACK, LGREY,
    ensure_dict, generate_episode_pdf_base
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

    patient    = ensure_dict(data.get('patient', {}))
    hand_chart = ensure_dict(data.get('handChart', {}))
    markers    = hand_chart.get('markers', [])
    # rom and circumference are now flat arrays (not wrapped in {table: [...]})
    # Legacy support: if old shape {table:[...]}, unwrap it
    _rom_raw = data.get('rom', [])
    rom_table = _rom_raw.get('table', []) if isinstance(_rom_raw, dict) else (_rom_raw if isinstance(_rom_raw, list) else [])
    _circ_raw = data.get('circumference', [])
    circ_table = _circ_raw.get('table', []) if isinstance(_circ_raw, dict) else (_circ_raw if isinstance(_circ_raw, list) else [])
    other_tests = ensure_dict(data.get('otherTests', {}))
    neuro      = ensure_dict(data.get('neuro', {}))

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

    # ── Block 2: History & Pain (left) | Special Questions (right) ──
    left2 = box('History & Pain', [
        kv('Current History',  data.get('hxCurrent', '')),
        kv('Past History',     data.get('hxPast', '')),
        kv('Pain Pre / Post',  '{} / {}'.format(data.get('painPre', ''), data.get('painPost', ''))),
        kv('Nature of Pain',   data.get('painNature', '')),
        kv('24hr Behaviour',   data.get('pain24hr', '')),
        kv('Aggravating',      data.get('painAgg', '')),
        kv('Easing',           data.get('painEase', '')),
        kv('Irritability',     data.get('irritability', '')),
    ], width=LW)

    right2 = box('Special Questions', [
        kv('General Health',   data.get('sqGeneralHealth', '')),
        kv('Health Notes',     data.get('sqHealthNotes', '')),
        kv('PMHx / Surgery',   data.get('sqPmhx', '')),
        kv('Investigations',   data.get('sqInvest', '')),
        kv('Medications',      data.get('sqMedications', '')),
        kv('Allergies',        data.get('sqAllergies', '')),
        kv('Social',           data.get('sqSocial', '')),
        kv('Occupation',       data.get('sqOccupation', '')),
        kv('Recreation',       data.get('sqRec', '')),
        kv('Splinting',        data.get('sqSplinting', '')),
        kv('Dominant Hand',    data.get('sqDominantHand', '')),
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
    # New shape: flat array [{category, movement, active_l_start, active_l_end, ...}]
    # Legacy shape {table:[{movement, activeL, ...}]} already unwrapped above.
    if rom_table:
        def _fmt_rom(r, sk, ek):
            s = str(r.get(sk) or '').strip()
            e = str(r.get(ek) or '').strip()
            if s and e:  return u'{}°-{}°'.format(s, e)
            elif s:      return u'{}°'.format(s)
            elif e:      return u'{}°'.format(e)
            return ''

        rom_headers = ['Category', 'Movement', 'Active L', 'Active R', 'Passive L', 'Passive R', 'OP L', 'OP R']
        rom_col_w   = [28 * mm, 42 * mm, 17 * mm, 17 * mm, 17 * mm, 17 * mm, 14 * mm, 14 * mm]
        rom_rows    = [
            [r.get('category', ''), r.get('movement', ''),
             _fmt_rom(r, 'active_l_start',  'active_l_end'),
             _fmt_rom(r, 'active_r_start',  'active_r_end'),
             _fmt_rom(r, 'passive_l_start', 'passive_l_end'),
             _fmt_rom(r, 'passive_r_start', 'passive_r_end'),
             _fmt_rom(r, 'op_l_start',      'op_l_end'),
             _fmt_rom(r, 'op_r_start',      'op_r_end')]
            for r in rom_table
        ]
        story.append(Paragraph('Range of Motion (Assessed joints only)', S_BOLD))
        story.append(Spacer(1, 2 * mm))
        story.append(data_table(rom_headers, rom_rows, rom_col_w))
        story.append(gap(2))

    # ── Block 4: Strength, Tick-if-necessary, Circumference, Sensation,
    #            Special Tests, Reflexes, MMT — single-column vertical stack ──

    def _has_data(rows):
        """Return True if any row has at least one non-empty cell after the first."""
        return any(any(str(cell).strip() for cell in row[1:]) for row in rows)

    def _sec(txt):
        return Paragraph(txt, S_BOLD)

    def _v(d, key):
        return str(d.get(key) or '')

    # 1 ── Strength ────────────────────────────────────────────────────────────
    strength_rows = [
        ['Grip (kg)',          _v(data, 'gripStrengthL'),  _v(data, 'gripStrengthR')],
        ['Pinch Lateral (kg)', _v(data, 'pinchLateralL'),  _v(data, 'pinchLateralR')],
        ['Pinch Pulp (kg)',    _v(data, 'pinchPulpL'),     _v(data, 'pinchPulpR')],
        ['Pinch 3-Point (kg)', _v(data, 'pinch3ptL'),      _v(data, 'pinch3ptR')],
    ]
    if _has_data(strength_rows):
        story.append(_sec('Strength'))
        story.append(gap(1))
        story.append(data_table(
            ['Test', 'Left', 'Right'],
            strength_rows,
            [CW * 0.4, CW * 0.3, CW * 0.3]
        ))
        story.append(gap(2))

    # 2 ── Tick if necessary (FPC + Pulp Opposition) ───────────────────────────
    fpc_row = [
        'Finger-to-Proximal Palmar Crease (cm)',
        _v(data, 'fpc2nd'), _v(data, 'fpc3rd'), _v(data, 'fpc4th'), _v(data, 'fpc5th'),
    ]
    pulp_val = _v(data, 'pulpOpposition')
    has_fpc  = any(str(v).strip() for v in fpc_row[1:])
    if has_fpc or pulp_val:
        story.append(_sec('Tick if Necessary'))
        story.append(gap(1))
        if has_fpc:
            story.append(data_table(
                ['Test', '2nd', '3rd', '4th', '5th'],
                [fpc_row],
                [CW * 0.4, CW * 0.15, CW * 0.15, CW * 0.15, CW * 0.15]
            ))
        if pulp_val:
            story.append(gap(1))
            story.append(kv('Pulp Opposition (notes)', pulp_val))
        story.append(gap(2))

    # 3 ── Circumference ───────────────────────────────────────────────────────
    if circ_table:
        circ_rows = [
            [r.get('location', ''), str(r.get('left_cm') or ''), str(r.get('right_cm') or '')]
            for r in circ_table
        ]
        if _has_data(circ_rows):
            story.append(_sec('Circumference'))
            story.append(gap(1))
            story.append(data_table(
                ['Location', 'Left (cm)', 'Right (cm)'],
                circ_rows,
                [CW * 0.5, CW * 0.25, CW * 0.25]
            ))
            story.append(gap(2))

    # 4 ── Sensation ───────────────────────────────────────────────────────────
    sensation_rows = [
        ['Light Touch',                 _v(data, 'lightTouchL'),   _v(data, 'lightTouchR')],
        ['Pin Prick',                   _v(data, 'pinPrickL'),     _v(data, 'pinPrickR')],
        ['2-Point Discrimination (mm)', _v(data, 'twoPointDiscL'), _v(data, 'twoPointDiscR')],
    ]
    sensation_notes = _v(data, 'sensationNotes')
    if _has_data(sensation_rows) or sensation_notes:
        story.append(_sec('Sensation'))
        story.append(gap(1))
        if _has_data(sensation_rows):
            story.append(data_table(
                ['Test', 'Left', 'Right'],
                sensation_rows,
                [CW * 0.5, CW * 0.25, CW * 0.25]
            ))
        if sensation_notes:
            story.append(gap(1))
            story.append(kv('Sensation Notes', sensation_notes))
        story.append(gap(2))

    # 5 ── Special Tests ───────────────────────────────────────────────────────
    def _ot(test, side):
        return str((other_tests.get(test) or {}).get(side) or '')

    special_rows = [
        ["Tinel's Sign",       _ot('tinels', 'l'),       _ot('tinels', 'r')],
        ["Phalen's Test",      _ot('phalens', 'l'),      _ot('phalens', 'r')],
        ["Finkelstein's Test", _ot('finkelsteins', 'l'), _ot('finkelsteins', 'r')],
        ["Froment's Sign",     _ot('fromens', 'l'),      _ot('fromens', 'r')],
    ]
    custom_tests = data.get('customSpecialTests') or []
    if _has_data(special_rows) or custom_tests:
        story.append(_sec('Special Tests'))
        story.append(gap(1))
        if _has_data(special_rows):
            story.append(data_table(
                ['Test', 'Left', 'Right'],
                special_rows,
                [CW * 0.5, CW * 0.25, CW * 0.25]
            ))
        if isinstance(custom_tests, list):
            for ct in custom_tests:
                if ct and isinstance(ct, dict) and ct.get('name'):
                    story.append(kv(ct['name'],
                                    '{} / {}'.format(ct.get('r', ''), ct.get('l', ''))))
        story.append(gap(2))

    # 6 ── Reflexes ────────────────────────────────────────────────────────────
    def _rf(level, side):
        return str((neuro.get('reflexes') or {}).get(level, {}).get(side) or '')

    reflex_rows = [
        ['C5',    'Biceps',          _rf('c5',   'l'), _rf('c5',   'r')],
        ['C6',    'Brachioradialis', _rf('c6',   'l'), _rf('c6',   'r')],
        ['C7',    'Triceps',         _rf('c7',   'l'), _rf('c7',   'r')],
        ['C8/T1', '—',          _rf('c8t1', 'l'), _rf('c8t1', 'r')],
    ]
    if any(_rf(lvl, side) for lvl in ('c5', 'c6', 'c7', 'c8t1') for side in ('l', 'r')):
        story.append(_sec('Reflexes'))
        story.append(gap(1))
        story.append(data_table(
            ['Root', 'Reflex', 'Left', 'Right'],
            reflex_rows,
            [CW * 0.15, CW * 0.35, CW * 0.25, CW * 0.25]
        ))
        story.append(gap(2))

    # 7 ── Manual Muscle Test (MMT) — NEW, previously missing ─────────────────
    muscles = neuro.get('muscles') or {}
    if isinstance(muscles, str):
        try:
            import json as _json
            muscles = _json.loads(muscles)
        except Exception:
            muscles = {}

    mmt_def = [
        ('Deltoid',            'deltoid'),
        ('Biceps',             'biceps'),
        ('Brachioradialis',    'brachiorad'),
        ('Wrist Extensor',     'wristExt'),
        ('Wrist Flexor',       'wristFlex'),
        ('Finger MP Extensor', 'fingerMpExt'),
        ('Triceps',            'triceps'),
        ('Finger Flexion',     'fingerFlex'),
        ('Hand Intrinsics',    'handIntrinsics'),
    ]
    mmt_rows = []
    for label, key in mmt_def:
        m = muscles.get(key) or {}
        if isinstance(m, str):
            m = {}
        mmt_rows.append([label, str(m.get('l') or ''), str(m.get('r') or '')])

    if _has_data(mmt_rows):
        story.append(_sec('Manual Muscle Test (MMT)'))
        story.append(gap(1))
        story.append(data_table(
            ['Muscle', 'Left', 'Right'],
            mmt_rows,
            [CW * 0.5, CW * 0.25, CW * 0.25]
        ))
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
    return generate_episode_pdf_base(_build_story, TITLE, REF, assessment_data, soap_notes, episode_info)
