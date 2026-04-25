# pdf_cr.py — KKM Cardiorespiratory Assessment Form PDF (Platypus layout engine)
# fisio / b.pen. 11 / Pind.2 / 2019

from reportlab.platypus import (
    Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, Flowable
)
from reportlab.lib.units import mm
from reportlab.lib import colors
from pdf_platypus_base import (
    build_pdf, page_header, patient_bar,
    box, two_col, plan_section, soap_page,
    data_table, gap, tick,
    S_LABEL, S_NORMAL, S_SMALL, S_BOLD,
    CW, LW, RW, BLACK, LGREY, BLUE, MGREY
)

REF   = 'fisio / b.pen. 11 / Pind.2 / 2019'
TITLE = ['KEMENTERIAN KESIHATAN MALAYSIA',
         'PHYSIOTHERAPY DEPARTMENT',
         'CARDIORESPIRATORY ASSESSMENT FORM']


# ── Lung diagram Flowable ─────────────────────────────────────────

# Finding colours — must match lungchart.js FINDINGS colours
FINDING_COLORS = {
    'clear':   colors.HexColor('#2a8a4a'),
    'crep':    colors.HexColor('#c0392b'),
    'wheeze':  colors.HexColor('#c87a00'),
    'reduced': colors.HexColor('#4a7ac8'),
    'absent':  colors.HexColor('#7b5ea7'),
}
FINDING_LABELS = {
    'clear':   'Clear',
    'crep':    'Crep.',
    'wheeze':  'Wheeze',
    'reduced': 'Reduced',
    'absent':  'Absent',
}

# Zone IDs — must match lungchart.js ZONES
# Anterior view: viewer's LEFT = patient's RIGHT lung
# RU/RM/RL = right lung zones (drawn on left side of diagram)
# LU/LL    = left lung zones  (drawn on right side)
# BASE     = bilateral bases  (bottom strip of both lungs)

class LungDiagramFlowable(Flowable):
    """
    Anatomical anterior lung diagram with 6 clickable lobe zones.
    findings: dict of zoneId → finding value (e.g. {'RU': 'crep', 'LL': 'reduced'})
    Zones: RU, RM, RL (right lung), LU, LL (left lung), BASE (bilateral)
    """
    LUNG_W = 52 * mm
    LUNG_H = 54 * mm

    def __init__(self, width=None, findings=None):
        super().__init__()
        self.width    = width or self.LUNG_W
        self.height   = self.LUNG_H
        self.findings = findings or {}

    def draw(self):
        c  = self.canv
        w  = self.width

        outline_col  = colors.HexColor('#1a3a6b')
        default_fill = colors.HexColor('#dce8f5')
        fissure_col  = colors.HexColor('#7a9cc0')
        label_col    = colors.HexColor('#333333')
        white        = colors.white

        cx   = w / 2
        pad  = 3 * mm    # mediastinum gap each side
        lw   = (w / 2) - pad - 1.5 * mm   # width of one lung
        lh   = 36 * mm
        base = 8 * mm
        top  = base + lh

        # Zone vertical boundaries (as fraction of lh from base)
        # Right lung: upper (top 38%), middle (38-60%), lower (60-100%)
        # Left lung: upper (top 45%), lower (45-100%)
        # Base: bottom 22% of both lungs
        BASE_FRAC  = 0.22   # bilateral base strip
        R_MID_TOP  = 0.62   # top of right middle (from base, counting up)
        R_MID_BOT  = 0.40   # bottom of right middle
        L_SPLIT    = 0.55   # upper/lower split for left lung

        def lung_fill(side, zone_id):
            """Return fill colour for a zone."""
            fv = self.findings.get(zone_id)
            return FINDING_COLORS.get(fv, default_fill)

        def draw_lung_side(side):
            if side == 'L':   # viewer's left = patient's RIGHT lung → zones RU, RM, RL
                xi = cx - pad
                xo = xi - lw
                zones = [
                    ('RU', base + lh * R_MID_TOP,  top),
                    ('RM', base + lh * R_MID_BOT,  base + lh * R_MID_TOP),
                    ('RL', base,                    base + lh * R_MID_BOT),
                ]
            else:             # viewer's right = patient's LEFT lung → zones LU, LL
                xi = cx + pad
                xo = xi + lw
                zones = [
                    ('LU', base + lh * L_SPLIT, top),
                    ('LL', base,                base + lh * L_SPLIT),
                ]

            # Pre-compute outer boundary bezier pts
            bot_inner_x = xi
            bot_inner_y = base
            bot_outer_x = xo
            bot_outer_y = base - 0.8 * mm
            mid_outer_x = xo + (-1.5*mm if side=='L' else 1.5*mm)
            mid_outer_y = base + lh * 0.38
            apex_x      = xo + (lw * 0.38 if side=='L' else -lw * 0.38)
            apex_y      = top
            top_inner_x = xi
            top_inner_y = top - 3.5 * mm

            # Helper: build outer lung outline path
            def lung_path():
                p = c.beginPath()
                p.moveTo(bot_inner_x, bot_inner_y)
                p.curveTo(bot_inner_x, bot_inner_y - 0.8*mm,
                          bot_outer_x + (1.5*mm if side=='L' else -1.5*mm), bot_outer_y,
                          bot_outer_x, bot_outer_y)
                p.curveTo(bot_outer_x, bot_outer_y + lh * 0.15,
                          mid_outer_x, mid_outer_y - lh * 0.1,
                          mid_outer_x, mid_outer_y)
                p.curveTo(mid_outer_x, mid_outer_y + lh * 0.2,
                          apex_x + (-2.5*mm if side=='L' else 2.5*mm), apex_y - 2.5*mm,
                          apex_x, apex_y)
                p.curveTo(apex_x + (2*mm if side=='L' else -2*mm), apex_y + 0.8*mm,
                          top_inner_x, top_inner_y + 1.5*mm,
                          top_inner_x, top_inner_y)
                p.lineTo(bot_inner_x, bot_inner_y)
                p.close()
                return p

            # Draw each zone as clipped fill
            c.saveState()
            # Clip to lung outline — use even-odd fill rule to avoid accumulation issues
            c.clipPath(lung_path(), stroke=0, fill=0, fillMode=1)

            for (zid, y_bot, y_top) in zones:
                fc = lung_fill(side, zid)
                c.setFillColor(fc)
                # Fill zone as rect within the clipped area
                min_x = min(xi, xo) - 2*mm
                max_x = max(xi, xo) + 2*mm
                c.rect(min_x, y_bot, max_x - min_x, y_top - y_bot, fill=1, stroke=0)

            c.restoreState()

            # Draw lung outline on top
            c.setFillColor(colors.Color(0, 0, 0, 0))  # transparent
            c.setStrokeColor(outline_col)
            c.setLineWidth(0.7)
            c.drawPath(lung_path(), fill=0, stroke=1)

            # Fissure lines
            c.setStrokeColor(fissure_col)
            c.setLineWidth(0.45)
            c.setDash(2, 2)

            if side == 'L':  # right lung — oblique + horizontal fissure
                # Oblique fissure (separates RU+RM from RL)
                c.line(xi - lw*0.08, base + lh*R_MID_BOT,
                       xi - lw*0.55, base + lh*R_MID_TOP)
                # Horizontal fissure (separates RU from RM) — shorter
                c.line(xi - lw*0.08, base + lh*R_MID_BOT,
                       xi - lw*0.50, base + lh*R_MID_BOT)
            else:  # left lung — oblique fissure only
                c.line(xi + lw*0.08, base + lh*L_SPLIT * 0.55,
                       xi + lw*0.55, base + lh*L_SPLIT)
            c.setDash()

            # Zone labels
            c.setFont('Helvetica', 5)
            for (zid, y_bot, y_top) in zones:
                lx = (xi + xo) / 2
                ly = (y_bot + y_top) / 2
                fv = self.findings.get(zid) or (self.findings.get('BASE') if zid in ('RL','LL') else None)
                if fv:
                    c.setFillColor(white)
                    c.setFont('Helvetica-Bold', 4.5)
                    short = zid
                    c.drawCentredString(lx, ly + 2, short)
                    c.setFont('Helvetica', 4.5)
                    c.drawCentredString(lx, ly - 2, FINDING_LABELS.get(fv, fv))
                else:
                    c.setFillColor(label_col)
                    c.setFont('Helvetica', 5)
                    c.drawCentredString(lx, ly, zid)

        draw_lung_side('L')
        draw_lung_side('R')

        # Trachea stub
        c.setStrokeColor(outline_col)
        c.setLineWidth(0.6)
        c.setDash()
        c.line(cx, top + 0.5*mm, cx, top + 3*mm)

        # Bilateral base indicator if BASE finding set
        base_fv = self.findings.get('BASE')
        if base_fv:
            c.setFont('Helvetica-Bold', 4)
            c.setFillColor(FINDING_COLORS.get(base_fv, label_col))
            c.drawCentredString(cx, base + lh * 0.11, 'BASE: ' + FINDING_LABELS.get(base_fv, base_fv))

        # R / L labels — radiological convention (CXR view)
        # Patient's RIGHT lung (3 lobes) = viewer's LEFT, labelled R
        # Patient's LEFT lung (2 lobes) = viewer's RIGHT, labelled L
        c.setFont('Helvetica-Bold', 6)
        c.setFillColor(label_col)
        lbl_y = base - 5 * mm
        c.drawCentredString(cx - (pad + lw/2), lbl_y, 'R')
        c.drawCentredString(cx + (pad + lw/2), lbl_y, 'L')

        # Caption
        c.setFont('Helvetica', 4.5)
        c.setFillColor(fissure_col)
        c.drawCentredString(cx, lbl_y - 3*mm, '(anterior view)')


# ── Auscultation section ──────────────────────────────────────────

def auscultation_section(ausc, width=None):
    """
    Auscultation box: dropdowns then lung diagram with zone findings.
    """
    w       = width or LW
    findings = ausc.get('lung_map', {})

    inner = [
        Paragraph('AUSCULTATION', S_LABEL),
        Paragraph(f'<b>Lungs:</b> {ausc.get("lungs", "")}', S_NORMAL),
        Paragraph(f'<b>Crepitation:</b> {ausc.get("crepitation", "")}', S_NORMAL),
        Paragraph(f'<b>Air Entry:</b> {ausc.get("air_entry", "")}', S_NORMAL),
        Spacer(1, 3 * mm),
        LungDiagramFlowable(width=w - 10 * mm, findings=findings),
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


# ── 6MWT table ───────────────────────────────────────────────────

def sixmwt_table(mwt, width=None):
    """
    6-Minute Walk Test structured table.
    width should already be inner_w (box width - 10mm padding).
    """
    w    = width or (LW - 10 * mm)
    col1 = 14 * mm
    col2 = 42 * mm
    col3 = w - col1 - col2

    def cell(txt, bold=False):
        style = S_BOLD if bold else S_NORMAL
        return Paragraph(txt, style)

    rows = [
        # Header
        [cell('6MWT', bold=True), cell('Distance'), cell(f'{mwt.get("distance", "")} m')],
        # PR row
        [cell(''), cell('PR  Pre / Post'),
         cell(f'{mwt.get("pr_pre", "")}  /  {mwt.get("pr_post", "")}')],
        # RPE row
        [cell(''), cell('RPE/Dyspnea Borg Scale  Pre / Post'),
         cell(f'{mwt.get("rpe_pre", "")}  /  {mwt.get("rpe_post", "")}')],
        # Remarks
        [cell(''), cell('Remarks'), cell(mwt.get('remarks', ''))],
    ]

    tbl = Table(rows, colWidths=[col1, col2, col3])
    tbl.setStyle(TableStyle([
        ('GRID',          (0, 0), (-1, -1), 0.4, BLACK),
        ('FONTNAME',      (0, 0), (0, 0),   'Helvetica-Bold'),
        ('FONTSIZE',      (0, 0), (-1, -1), 8),
        ('SPAN',          (0, 0), (0, -1)),   # merge 6MWT label vertically
        ('VALIGN',        (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN',         (0, 0), (0, -1),  'CENTER'),
        ('TOPPADDING',    (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING',   (0, 0), (-1, -1), 3),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 3),
        ('BACKGROUND',    (0, 0), (1, 0),   LGREY),
    ]))
    return tbl


# ── Palpation tables ──────────────────────────────────────────────

def palpation_section(palp, width=None):
    """
    Palpation: chest expansion + chest measurement tables.
    Follows body_chart_section pattern — flat inner list, tables at inner_w.
    """
    w       = width or LW
    inner_w = w - 10 * mm
    col1    = inner_w * 0.58
    col2    = inner_w * 0.42

    exp  = palp.get('expansion', {})
    meas = palp.get('measurement', {})

    # Chest expansion table
    exp_tbl = Table(
        [
            [Paragraph('Chest Expansion', S_BOLD), Paragraph('Symmetrical / Asymmetrical', S_BOLD)],
            [Paragraph('Apical (anterior)', S_NORMAL),        Paragraph(exp.get('apical',       'Symmetrical / Asymmetrical'), S_NORMAL)],
            [Paragraph('Middle (anterior)', S_NORMAL),        Paragraph(exp.get('middle',       'Symmetrical / Asymmetrical'), S_NORMAL)],
            [Paragraph('Lower Costal (posterior)', S_NORMAL), Paragraph(exp.get('lower_costal', 'Symmetrical / Asymmetrical'), S_NORMAL)],
        ],
        colWidths=[col1, col2]
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

    # Chest measurement table
    meas_tbl = Table(
        [
            [Paragraph('Chest Measurement (Thumb Displacement)', S_BOLD), Paragraph('', S_NORMAL)],
            [Paragraph('Apical', S_NORMAL),       Paragraph(meas.get('apical', ''), S_NORMAL)],
            [Paragraph('Middle', S_NORMAL),       Paragraph(meas.get('middle', ''), S_NORMAL)],
            [Paragraph('Lower Costal', S_NORMAL), Paragraph(meas.get('lower_costal', ''), S_NORMAL)],
        ],
        colWidths=[col1, col2]
    )
    meas_tbl.setStyle(TableStyle([
        ('SPAN',          (0, 0), (-1, 0)),
        ('ALIGN',         (0, 0), (-1, 0),  'CENTER'),
        ('BACKGROUND',    (0, 0), (-1, 0),  LGREY),
        ('GRID',          (0, 0), (-1, -1), 0.4, BLACK),
        ('VALIGN',        (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING',    (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING',   (0, 0), (-1, -1), 4),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 4),
    ]))

    inner = [
        Paragraph('PALPATION', S_LABEL),
        Spacer(1, 2 * mm),
        exp_tbl,
        Spacer(1, 2 * mm),
        meas_tbl,
    ]

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


# ── Investigation table ───────────────────────────────────────────

def investigation_section(ix, width=None):
    """
    Investigation: CXR / ABG / Other Ix each with a date field.
    Follows body_chart_section pattern — flat inner list, table at inner_w.
    """
    w       = width or LW
    inner_w = w - 10 * mm
    col1    = 32 * mm   # wide enough for "ABG interpretation:"
    col3    = 18 * mm
    col2    = inner_w - col1 - col3

    rows = [
        [Paragraph('CXR findings:', S_BOLD),       Paragraph(ix.get('cxr',   ''), S_NORMAL), Paragraph(ix.get('cxr_date',   ''), S_SMALL)],
        [Paragraph('ABG interpretation:', S_BOLD),  Paragraph(ix.get('abg',   ''), S_NORMAL), Paragraph(ix.get('abg_date',   ''), S_SMALL)],
        [Paragraph('Other Ix:', S_BOLD),            Paragraph(ix.get('other', ''), S_NORMAL), Paragraph(ix.get('other_date', ''), S_SMALL)],
    ]

    tbl = Table(rows, colWidths=[col1, col2, col3])
    tbl.setStyle(TableStyle([
        ('GRID',          (0, 0), (-1, -1), 0.4, BLACK),
        ('VALIGN',        (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING',    (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING',   (0, 0), (-1, -1), 3),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 3),
    ]))

    inner = [Paragraph('INVESTIGATION', S_LABEL), Spacer(1, 2 * mm), tbl]

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


# ── Main story builder ────────────────────────────────────────────

def _build_story(d):
    story   = []
    patient = d.get('patient', {})
    pain    = d.get('pain', {})
    sq      = d.get('specialQuestions', {})
    hx      = d.get('history', {})
    obs     = d.get('observation', {})
    vent    = d.get('ventilated', {})
    ix      = d.get('investigation', {})
    palp    = d.get('palpation', {})
    ausc    = d.get('auscultation', {})
    special = d.get('specialTest', {})
    plan    = d.get('plan', {})
    mgmt    = d.get('management', {})

    # ── PAGE 1 ───────────────────────────────────────────────────
    story += page_header(TITLE, REF)
    story.append(patient_bar(patient, REF))
    story.append(gap(2))

    # Pain score
    pain_content = [
        Paragraph(f'<b>PRE:</b> {pain.get("pre", "0")}/10'
                  f'&nbsp;&nbsp;&nbsp;<b>POST:</b> {pain.get("post", "0")}/10', S_NORMAL),
    ]

    # Special Question box
    sq_content = [
        Paragraph(f'<b>General Health:</b> {sq.get("health", "")}', S_NORMAL),
        Paragraph(f'<b>PMHx / Surgery:</b> {sq.get("pmhx", "")}  {sq.get("surgery", "")}', S_NORMAL),
        Paragraph(f'<b>Medication:</b> {sq.get("medication", "")}', S_NORMAL),
        Paragraph(f'<b>Occupation / Recreation:</b> {sq.get("occupation", "")}', S_NORMAL),
        Paragraph(f'<b>Functional Limitation:</b> {sq.get("functional_limitation", "")}', S_NORMAL),
        Paragraph(f'<b>Smoking:</b> {sq.get("smoking", "")}', S_NORMAL),
        Paragraph(f'<b>Alcohol consumption:</b> {sq.get("alcohol", "")}', S_NORMAL),
    ]

    # Observation content
    vs   = obs.get('vital_signs', {})
    vs_line = (
        f'Temp {vs.get("temp", "…")} °C'
        f'  RR {vs.get("rr", "…")}/min'
        f'  PR {vs.get("pr", "…")} bpm'
        f'  B/P {vs.get("bp", "…")} mmHg'
        f'  SpO2 {vs.get("spo2", "…")} %'
    )
    sputum = obs.get('sputum', {})
    sputum_txt = (
        f'Colour: {sputum.get("colour", "")}  '
        f'Amount: {sputum.get("amount", "")}  '
        f'Consistency: {sputum.get("consistency", "")}'
    )

    obs_content = [
        Paragraph(f'<b>Vital Signs:</b> {vs_line}', S_NORMAL),
        Paragraph(f'<b>Breathing Pattern:</b> {obs.get("breathing_pattern", "")}', S_NORMAL),
        Paragraph(f'<b>Level:</b> {obs.get("breathing_level", "")}', S_NORMAL),
        Paragraph(f'<b>Chest Deformity:</b> {obs.get("chest_deformity", "")}', S_NORMAL),
        Paragraph(f'<b>Chest Drain:</b> {obs.get("chest_drain", "")}', S_NORMAL),
        Paragraph(
            f'<b>Cough:</b> {obs.get("cough_type", "Productive / Non-Productive")}'
            f'  {obs.get("cough_effect", "Effective / Ineffective")}', S_NORMAL),
        Paragraph(f'<b>Sputum:</b> {sputum_txt}', S_NORMAL),
        Paragraph(f'<b>O2 Treatment:</b> {obs.get("o2_treatment", "")}', S_NORMAL),
    ]

    # Ventilated patient content — only render if any value present
    vent_content = []
    if any([vent.get('mode'), vent.get('peep'), vent.get('fio2')]):
        vent_content = [
            Paragraph('<b>VENTILATED PATIENT</b>', S_BOLD),
            Paragraph(f'<b>Mode:</b> {vent.get("mode", "")}', S_NORMAL),
            Paragraph(f'<b>PEEP:</b> {vent.get("peep", "")}', S_NORMAL),
            Paragraph(f'<b>FiO2:</b> {vent.get("fio2", "")}', S_NORMAL),
        ]

    # ── LEFT column (page 1) ──────────────────────────────────
    left = [
        box('DIAGNOSIS',            d.get('diagnosis', ''),  width=LW),
        box("DOCTOR'S MANAGEMENT",  mgmt.get('type', ''),    width=LW),
        box('PROBLEM',              d.get('problem', ''),    width=LW),
        box('PAIN SCORE',           pain_content,            width=LW),
        box('SPECIAL QUESTION',     sq_content,              width=LW),
        investigation_section(ix,                            width=LW),
    ]

    # ── RIGHT column (page 1) ─────────────────────────────────
    right_obs = obs_content + (vent_content if vent_content else [])

    right = [
        box('CURRENT HISTORY', hx.get('current', ''), width=RW),
        box('PAST HISTORY',    hx.get('past', ''),    width=RW),
        box('OBSERVATION',     right_obs,              width=RW),
    ]

    story.append(two_col(left, right))
    story.append(PageBreak())

    # ── PAGE 2 ───────────────────────────────────────────────────
    story += page_header(TITLE, REF)
    story.append(patient_bar(patient, REF))
    story.append(gap(2))

    # Special test section
    mwt = special.get('6mwt', {})
    special_left = [
        Paragraph('Exercise Tolerance Test:', S_NORMAL),
        gap(1),
        sixmwt_table(mwt, width=LW - 10 * mm),        gap(2),
        Paragraph(
            f'<b>PEFR:</b> {special.get("pefr", "")} L/min', S_NORMAL),
        gap(1),
        Paragraph(
            f'<b>Incentive Spirometer:</b> {special.get("incentive_spirometer", "")} / c.c', S_NORMAL),
    ]

    left2 = [
        palpation_section(palp,                       width=LW),
        gap(1),
        auscultation_section(ausc,                    width=LW),
        gap(1),
        box('SPECIAL TEST', special_left,             width=LW),
    ]

    right2_plan = plan_section(
        plan.get('impression', ''),
        plan.get('stg', ''),
        plan.get('ltg', ''),
        plan.get('treatment', ''),
        width=RW,
    )

    # Sign / stamp block
    sign_content = [
        Paragraph('Attending Physiotherapist :  ………………………………………………………………………', S_NORMAL),
        Spacer(1, 4 * mm),
        Paragraph('Date :  _______________________&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Sign &amp; Stamp :', S_NORMAL),
    ]
    sign_tbl = Table([[sign_content]], colWidths=[RW])
    sign_tbl.setStyle(TableStyle([
        ('BOX',          (0, 0), (-1, -1), 0.5, BLACK),
        ('TOPPADDING',   (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING',(0, 0), (-1, -1), 8),
        ('LEFTPADDING',  (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('VALIGN',       (0, 0), (-1, -1), 'TOP'),
    ]))

    right2 = [right2_plan, gap(2), sign_tbl]

    story.append(two_col(left2, right2))
    return story


# ── Public API ────────────────────────────────────────────────────

def generate_cr_pdf(data):
    return build_pdf(_build_story(data))


def generate_episode_pdf(assessment_data, soap_notes, episode_info=None):
    story   = []
    patient = (assessment_data or {}).get('patient', {})

    if assessment_data:
        story += _build_story(assessment_data)
    else:
        story += page_header(TITLE, REF)
        story.append(Paragraph('No initial assessment recorded for this episode.', S_NORMAL))

    # 2 SOAP notes per page
    notes = soap_notes or []
    for i in range(0, len(notes), 2):
        story.append(PageBreak())
        pair  = []
        pair += soap_page(patient, notes[i], episode_info)
        if i + 1 < len(notes):
            pair += soap_page(patient, notes[i + 1], episode_info)
        story.append(KeepTogether(pair))

    return build_pdf(story)
