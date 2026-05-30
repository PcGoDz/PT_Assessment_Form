# pdf_burn.py — KKM Burn Assessment Form PDF (Platypus layout engine)
# fisio / b.pen. 5 / Pind. 2 / 2019

import json
from reportlab.platypus import (
    PageBreak, Paragraph, Spacer, Table, TableStyle
)
from reportlab.lib.units import mm

from pdf_platypus_base import (
    build_pdf, sign_chop_block,
    box, two_col, kv, gap, patient_bar, page_header, data_table,
    body_chart_section, plan_section,
    S_NORMAL, S_BOLD, S_SMALL, S_LABEL,
    CW, LW, RW, BLACK, LGREY,
    ensure_dict, generate_episode_pdf_base
)
from pdf_cr import LungDiagramFlowable

TITLE = ['KEMENTERIAN KESIHATAN MALAYSIA',
         'PHYSIOTHERAPY DEPARTMENT',
         'BURN ASSESSMENT FORM']
REF   = 'fisio / b.pen. 5 / Pind. 2 / 2019'


def _fmt_rom(r, sk, ek):
    s = str(r.get(sk) or '').strip()
    e = str(r.get(ek) or '').strip()
    if s and e:   return u'{}°-{}°'.format(s, e)
    elif s:       return u'{}°'.format(s)
    elif e:       return u'{}°'.format(e)
    return ''


def _any(*vals):
    return any(str(v or '').strip() for v in vals)


# ── BURN-specific palpation (includes _status fields CR's version drops) ──────

def _burn_palpation_section(palp, width=None):
    w       = width or LW
    inner_w = w - 10 * mm

    exp  = palp.get('expansion',   {}) or {}
    meas = palp.get('measurement', {}) or {}

    exp_rows = [
        ['Apical (anterior)',    exp.get('apical',       '')],
        ['Middle (anterior)',    exp.get('middle',       '')],
        ['Lower Costal (post.)', exp.get('lower_costal', '')],
    ]
    show_exp = any(str(r[1]).strip() for r in exp_rows)

    meas_rows = [
        ['Apical',       meas.get('apical',       ''), meas.get('apical_status',       '')],
        ['Middle',       meas.get('middle',       ''), meas.get('middle_status',       '')],
        ['Lower Costal', meas.get('lower_costal', ''), meas.get('lower_costal_status', '')],
    ]
    show_meas = any(str(c).strip() for r in meas_rows for c in r[1:])

    if not show_exp and not show_meas:
        return None

    inner = [Paragraph('PALPATION', S_LABEL)]

    if show_exp:
        inner.append(Spacer(1, 2 * mm))
        exp_tbl = Table(
            [[Paragraph('Chest Expansion', S_BOLD),
              Paragraph('Symmetrical / Asymmetrical', S_BOLD)]] +
            [[Paragraph(r[0], S_NORMAL), Paragraph(r[1], S_NORMAL)]
             for r in exp_rows],
            colWidths=[inner_w * 0.55, inner_w * 0.45]
        )
        exp_tbl.setStyle(TableStyle([
            ('BACKGROUND',    (0, 0), (-1, 0),  LGREY),
            ('GRID',          (0, 0), (-1, -1), 0.4, BLACK),
            ('VALIGN',        (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING',    (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('LEFTPADDING',   (0, 0), (-1, -1), 4),
            ('RIGHTPADDING',  (0, 0), (-1, -1), 4),
        ]))
        inner.append(exp_tbl)

    if show_meas:
        inner.append(Spacer(1, 2 * mm))
        col1 = inner_w * 0.38
        col2 = inner_w * 0.28
        col3 = inner_w * 0.34
        meas_tbl = Table(
            [[Paragraph('Zone',              S_BOLD),
              Paragraph('Measurement (cm)',  S_BOLD),
              Paragraph('Status',            S_BOLD)]] +
            [[Paragraph(r[0], S_NORMAL), Paragraph(r[1], S_NORMAL), Paragraph(r[2], S_NORMAL)]
             for r in meas_rows],
            colWidths=[col1, col2, col3]
        )
        meas_tbl.setStyle(TableStyle([
            ('BACKGROUND',    (0, 0), (-1, 0),  LGREY),
            ('GRID',          (0, 0), (-1, -1), 0.4, BLACK),
            ('VALIGN',        (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING',    (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('LEFTPADDING',   (0, 0), (-1, -1), 4),
            ('RIGHTPADDING',  (0, 0), (-1, -1), 4),
        ]))
        inner.append(meas_tbl)

    t = Table([[inner]], colWidths=[w])
    t.setStyle(TableStyle([
        ('BOX',          (0, 0), (-1, -1), 0.5, BLACK),
        ('TOPPADDING',   (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING',(0, 0), (-1, -1), 4),
        ('LEFTPADDING',  (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ('VALIGN',       (0, 0), (-1, -1), 'TOP'),
    ]))
    return t


# ── Auscultation with LungDiagramFlowable (imported from pdf_cr) ──────────────

def _burn_auscultation_section(ausc, width=None):
    w        = width or RW
    lungs    = ausc.get('lungs',       '')
    crep     = ausc.get('crepitation', '')
    air      = ausc.get('air_entry',   '')
    lung_map = ausc.get('lung_map',    {}) or {}

    if not _any(lungs, crep, air) and not any(lung_map.values()):
        return None

    inner = [
        Paragraph('AUSCULTATION', S_LABEL),
        Paragraph('<b>Lungs:</b> {}'.format(lungs),      S_NORMAL),
        Paragraph('<b>Crepitation:</b> {}'.format(crep), S_NORMAL),
        Paragraph('<b>Air Entry:</b> {}'.format(air),    S_NORMAL),
        Spacer(1, 3 * mm),
        LungDiagramFlowable(width=w - 10 * mm, findings=lung_map),
    ]
    t = Table([[inner]], colWidths=[w])
    t.setStyle(TableStyle([
        ('BOX',          (0, 0), (-1, -1), 0.5, BLACK),
        ('TOPPADDING',   (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING',(0, 0), (-1, -1), 8),
        ('LEFTPADDING',  (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ('VALIGN',       (0, 0), (-1, -1), 'TOP'),
    ]))
    return t


# ── Respiratory — full has_data guard (ward burns commonly blank) ─────────────

def _burn_respiratory_section(resp, width=None):
    w          = width or CW
    obs        = resp.get('observation',       '')
    ventilated = resp.get('ventilated',        '')
    o2         = resp.get('o2',                '')
    bp         = resp.get('breathing_pattern', '')
    cough_t    = resp.get('cough_type',        '')
    cough_e    = resp.get('cough_effect',      '')
    hoarseness = resp.get('hoarseness',        '')
    sputum     = resp.get('sputum',            {}) or {}
    sput_col   = sputum.get('colour',      '')
    sput_amt   = sputum.get('amount',      '')
    sput_con   = sputum.get('consistency', '')

    if not _any(obs, ventilated, o2, bp, cough_t, cough_e,
                hoarseness, sput_col, sput_amt, sput_con):
        return None

    content = []
    if obs:        content.append(kv('Observation',       obs))
    if ventilated: content.append(kv('Ventilated',        ventilated))
    if o2:         content.append(kv('O2 Supplement',     o2))
    if bp:         content.append(kv('Breathing Pattern', bp))
    if cough_t or cough_e:
        content.append(kv('Cough', '  '.join(filter(None, [cough_t, cough_e]))))
    if hoarseness: content.append(kv('Hoarseness', hoarseness))
    if _any(sput_col, sput_amt, sput_con):
        sput_parts = []
        if sput_col: sput_parts.append('Colour: ' + sput_col)
        if sput_amt: sput_parts.append('Amount: ' + sput_amt)
        if sput_con: sput_parts.append('Consistency: ' + sput_con)
        content.append(kv('Sputum', '  '.join(sput_parts)))

    return box('RESPIRATORY', content, width=w)


# ── Main story builder ────────────────────────────────────────────────────────

def _build_story(data):
    if isinstance(data, str):
        try:
            data = json.loads(data)
        except Exception:
            data = {}

    patient  = ensure_dict(data.get('patient',          {}))
    pain     = ensure_dict(data.get('pain',              {}))
    sq       = ensure_dict(data.get('specialQuestions',  {}))
    hx       = ensure_dict(data.get('history',           {}))
    ix       = ensure_dict(data.get('investigation',     {}))
    bc       = ensure_dict(data.get('bodyChart',         {}))
    resp     = ensure_dict(data.get('respiratory',       {}))
    palp     = ensure_dict(data.get('palpation',         {}))
    ausc     = ensure_dict(data.get('auscultation',      {}))
    mob      = ensure_dict(data.get('mobility',          {}))
    plan     = ensure_dict(data.get('plan',              {}))

    movement = data.get('movement', []) or []
    if isinstance(movement, str):
        try:
            movement = json.loads(movement)
        except Exception:
            movement = []

    story = []
    story += page_header(TITLE, REF)
    story.append(patient_bar(patient, REF))
    story.append(gap(2))

    # ── PAGE 1 ────────────────────────────────────────────────────────────────
    # Left: Diagnosis | Management | Problem | Pain | Special Questions | Investigation
    # Right: History | Body Chart (always rendered; TBSA + associated injury inline)

    ix_items = []
    if ix.get('wound_cs'): ix_items.append(kv('Wound C&S', ix['wound_cs']))
    if ix.get('cxr'):      ix_items.append(kv('CXR',       ix['cxr']))
    if ix.get('abg'):      ix_items.append(kv('ABG',       ix['abg']))

    left1 = [
        box('DIAGNOSIS',           data.get('diagnosis',  ''), width=LW),
        box("DOCTOR'S MANAGEMENT", data.get('management', ''), width=LW),
        box('PROBLEM',             data.get('problem',    ''), width=LW),
        box('PAIN SCORE', [
            Paragraph(
                '<b>PRE:</b> {}/10&nbsp;&nbsp;&nbsp;<b>POST:</b> {}/10'.format(
                    pain.get('pre', '0'), pain.get('post', '0')),
                S_NORMAL)
        ], width=LW),
        box('SPECIAL QUESTIONS', [
            kv('General Health', sq.get('health',     '')),
            kv('PMHx',           sq.get('pmhx',       '')),
            kv('Medication',     sq.get('medication', '')),
            kv('Occupation',     sq.get('occupation', '')),
        ], width=LW),
    ]
    if ix_items:
        left1.append(box('INVESTIGATION', ix_items, width=LW))

    hx_items = [kv('Current History', hx.get('current', ''))]
    assoc = data.get('associatedInjury', '')
    if assoc:
        hx_items += [gap(1), kv('Associated Injury', assoc)]
    tbsa = data.get('tbsa', '')
    if tbsa:
        hx_items += [gap(1), kv('TBSA (%)', tbsa)]

    right1 = [
        box('HISTORY', hx_items, width=RW),
        body_chart_section(bc, width=RW),
    ]

    story.append(two_col(left1, right1))
    story.append(PageBreak())

    # ── PAGE 2 ────────────────────────────────────────────────────────────────
    story += page_header(TITLE, REF)
    story.append(patient_bar(patient, REF))
    story.append(gap(2))

    # Respiratory (full-width, skip if blank — ward burns commonly have no resp data)
    resp_block = _burn_respiratory_section(resp, width=CW)
    if resp_block:
        story.append(resp_block)
        story.append(gap(2))

    # Palpation (left) | Auscultation (right) — each independently guarded
    palp_block = _burn_palpation_section(palp, width=LW)
    ausc_block = _burn_auscultation_section(ausc, width=RW)
    if palp_block and ausc_block:
        story.append(two_col([palp_block], [ausc_block]))
        story.append(gap(2))
    elif palp_block:
        story.append(palp_block)
        story.append(gap(2))
    elif ausc_block:
        story.append(ausc_block)
        story.append(gap(2))

    # Movement / ROM table — full width, skip if no rows
    # Columns: Joint(38) + Side(20) + Plane(42) + Active(25) + Passive(25) + Remark(36) = 186mm = CW
    if movement:
        rom_col_w = [38*mm, 20*mm, 42*mm, 25*mm, 25*mm, 36*mm]
        rom_rows  = [
            [
                r.get('joint',  ''),
                r.get('side',   ''),
                r.get('plane',  ''),
                _fmt_rom(r, 'active_start',  'active_end'),
                _fmt_rom(r, 'passive_start', 'passive_end'),
                r.get('remark', ''),
            ]
            for r in movement
        ]
        story.append(Paragraph('MOVEMENT / RANGE OF MOTION', S_BOLD))
        story.append(Spacer(1, 2 * mm))
        story.append(data_table(
            ['Joint', 'Side', 'Plane', 'Active ROM', 'Passive ROM', 'Remark'],
            rom_rows,
            rom_col_w,
        ))
        story.append(gap(2))

    # Mobility + Gait
    mob_bed      = mob.get('bed',      '')
    mob_transfer = mob.get('transfer', '')
    gait         = data.get('gait',    '')
    if _any(mob_bed, mob_transfer, gait):
        left3  = [box('MOBILITY', [
            kv('Bed Mobility', mob_bed),
            kv('Transfer',     mob_transfer),
        ], width=LW)]
        right3 = [box('GAIT', gait or '', width=RW)]
        story.append(two_col(left3, right3))
        story.append(gap(2))

    # Plan (full-width 2x2 grid)
    story.append(plan_section(
        plan.get('impression', ''),
        plan.get('stg',        ''),
        plan.get('ltg',        ''),
        plan.get('treatment',  ''),
        width=CW,
    ))
    story.append(gap(2))

    story += sign_chop_block()
    return story


# ── Public entry points (mirror pdf_hand.py shape) ────────────────────────────

def generate_burn_pdf(data):
    """Generate a single Burn Assessment PDF. Returns bytes."""
    return build_pdf(_build_story(data))


def generate_episode_pdf(assessment_data, soap_notes, episode_info=None):
    """Generate full episode PDF: assessment + SOAP notes. Returns bytes."""
    return generate_episode_pdf_base(
        _build_story, TITLE, REF, assessment_data, soap_notes, episode_info
    )
