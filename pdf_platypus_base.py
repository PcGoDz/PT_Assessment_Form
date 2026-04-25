# pdf_platypus_base.py — Shared Platypus layout engine for all KKM PDF generators
# Pure Python, PyInstaller-friendly. No system dependencies.

from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether, PageBreak
)
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.pdfgen import canvas as rl_canvas
import io

from reportlab.platypus import Flowable

# ── Body chart figure — custom Flowable ───────────────────────────

class BodyChartFlowable(Flowable):
    """
    Draws anterior + posterior human figure with pain markers.
    Uses pdf_base draw_figure and draw_markers if available,
    otherwise falls back to simple geometric representation.
    """
    def __init__(self, markers, notes='', width=None, height=None):
        super().__init__()
        self.markers = markers or []
        self.notes   = notes or ''
        self.fig_w   = width or CW
        # Figure draws 287 SVG units tall at scale s=0.155
        # Total drawn height = 287 * 0.155 * mm = 44.5mm
        # Add 5mm top (ANTERIOR/POSTERIOR labels) + 5mm bottom (Right/Left labels)
        self._sc     = 0.155
        self._fig_h  = 287 * self._sc * mm   # ~44.5mm actual figure height
        self._top_pad = 5 * mm               # space above figure for col labels
        self._bot_pad = 5 * mm               # space below figure for R/L labels
        calc_h       = self._fig_h + self._top_pad + self._bot_pad
        self.fig_h   = height if height is not None else calc_h
        self.width   = self.fig_w
        self.height  = self.fig_h

    def draw(self):
        c = self.canv
        w = self.fig_w
        h = self.fig_h
        sc = self._sc

        # In Platypus Flowable coords: (0,0) = bottom-left, (w,h) = top-right
        # figure top_y = height of figure body from bottom = fig_h + bot_pad
        fig_top = self._fig_h + self._bot_pad

        try:
            from pdf_base import draw_figure, draw_markers
            ant_cx  = w * 0.27
            post_cx = w * 0.73

            draw_figure(c, ant_cx,  fig_top, s=sc)
            draw_markers(c, ant_cx,  fig_top, self.markers, 'ant',  s=sc)
            draw_figure(c, post_cx, fig_top, s=sc)
            draw_markers(c, post_cx, fig_top, self.markers, 'post', s=sc)

            c.setFont('Helvetica', 6)
            c.setFillColor(colors.black)

            # R/L labels below feet — offset matches figure foot positions
            # Feet span ~5mm either side of cx; Right=patient's right=anatomically left of cx
            foot_y = 2 * mm
            ant_r_x  = ant_cx  - 6 * mm   # patient Right foot, anterior
            ant_l_x  = ant_cx  + 6 * mm   # patient Left foot, anterior
            post_r_x = post_cx - 6 * mm
            post_l_x = post_cx + 6 * mm

            c.drawCentredString(ant_r_x,  foot_y, 'Right')
            c.drawCentredString(ant_l_x,  foot_y, 'Left')
            c.drawCentredString(post_l_x, foot_y, 'Left')
            c.drawCentredString(post_r_x, foot_y, 'Right')

            # ANTERIOR / POSTERIOR column headers in top pad zone
            label_y = fig_top + 2 * mm
            c.drawCentredString(ant_cx,  label_y, 'ANTERIOR')
            c.drawCentredString(post_cx, label_y, 'POSTERIOR')

        except Exception:
            c.setFont('Helvetica', 7)
            c.setFillColor(colors.HexColor('#aaaaaa'))
            c.drawCentredString(w * 0.27, h / 2, '[Body Chart — Anterior]')
            c.drawCentredString(w * 0.73, h / 2, '[Body Chart — Posterior]')


# ── Page geometry ─────────────────────────────────────────────────
W, H   = A4
ML     = 12 * mm
MR     = 12 * mm
MT     = 14 * mm
MB     = 14 * mm
CW     = W - ML - MR   # full content width
LW     = CW * 0.47     # left column
RW     = CW * 0.53     # right column
LW2    = CW * 0.50     # equal split (geriatric)
RW2    = CW * 0.50

# ── Colours ───────────────────────────────────────────────────────
BLACK  = colors.black
WHITE  = colors.white
LGREY  = colors.HexColor('#f0f0f0')
MGREY  = colors.HexColor('#dddddd')
BLUE   = colors.HexColor('#1a3a6b')
MUTED  = colors.HexColor('#555555')

# ── Styles ────────────────────────────────────────────────────────
S_TITLE = ParagraphStyle('title',
    fontName='Helvetica-Bold', fontSize=10, leading=14,
    alignment=TA_CENTER, spaceAfter=1)

S_REF = ParagraphStyle('ref',
    fontName='Helvetica', fontSize=7, leading=9,
    alignment=TA_RIGHT, textColor=MUTED)

S_LABEL = ParagraphStyle('label',
    fontName='Helvetica-Bold', fontSize=7.5, leading=10,
    textColor=BLACK, spaceAfter=2)

S_NORMAL = ParagraphStyle('normal',
    fontName='Helvetica', fontSize=8, leading=13, spaceAfter=1)

S_SMALL = ParagraphStyle('small',
    fontName='Helvetica', fontSize=7, leading=9,
    textColor=MUTED, spaceAfter=0)

S_BOLD = ParagraphStyle('bold',
    fontName='Helvetica-Bold', fontSize=8, leading=11)

S_PATIENT = ParagraphStyle('patient',
    fontName='Helvetica', fontSize=8, leading=10)

S_SECTION = ParagraphStyle('section',
    fontName='Helvetica-Bold', fontSize=8, leading=10,
    textColor=BLUE, spaceBefore=2, spaceAfter=1)


# ── Core building blocks ──────────────────────────────────────────

def gap(h=2):
    """Vertical spacer in mm."""
    return Spacer(1, h * mm)


def divider():
    """Thin horizontal rule."""
    return HRFlowable(width='100%', thickness=0.5, color=MGREY, spaceAfter=2, spaceBefore=2)


def box(title, content, width=None, min_height=None):
    """
    Auto-height bordered section box.
    content can be: str, Paragraph, or list of flowables.
    Always pass explicit width= when inside two_col() — default is full CW.
    """
    w = width or CW
    if w > CW + 0.5:  # 0.5pt tolerance for float rounding
        raise ValueError(
            f"box() width {w/mm:.1f}mm exceeds page content width {CW/mm:.1f}mm. "
            f"Did you forget width=LW or width=RW inside two_col()?"
        )
    inner = []
    if title:
        inner.append(Paragraph(title, S_LABEL))
    if content is None or content == '':
        inner.append(Spacer(1, 6 * mm))
    elif isinstance(content, str):
        if content.strip():
            # Handle newlines
            for line in content.split('\n'):
                if line.strip():
                    inner.append(Paragraph(line.strip(), S_NORMAL))
                else:
                    inner.append(Spacer(1, 2 * mm))
        else:
            inner.append(Spacer(1, 6 * mm))
    elif isinstance(content, list):
        inner.extend(content)
    else:
        inner.append(content)

    style = [
        ('BOX',          (0,0), (-1,-1), 0.5, BLACK),
        ('TOPPADDING',   (0,0), (-1,-1), 4),
        ('BOTTOMPADDING',(0,0), (-1,-1), 4),
        ('LEFTPADDING',  (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
        ('VALIGN',       (0,0), (-1,-1), 'TOP'),
    ]
    if min_height:
        style.append(('MINROWHEIGHT', (0,0), (-1,-1), min_height))

    t = Table([[inner]], colWidths=[w])
    t.setStyle(TableStyle(style))
    return t


def _col_wrap(items, width):
    """
    Wrap a list of flowables in a single-cell no-border Table.
    This forces Platypus to treat the column as one atomic unit and
    correctly apply x-offsets when nested inside a two-column Table.
    Without this, complex nested flowables (Tables, custom Flowables)
    render at x=0 of the page frame instead of their column position.
    """
    t = Table([[items]], colWidths=[width])
    t.setStyle(TableStyle([
        ('VALIGN',       (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING',  (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING',   (0,0), (-1,-1), 0),
        ('BOTTOMPADDING',(0,0), (-1,-1), 0),
    ]))
    return t


def two_col(left_items, right_items, lw=None, rw=None):
    """
    Two-column layout. Each side is a list of flowables.
    Wraps each column in a container Table to ensure correct x-positioning.
    """
    lw = lw or LW
    rw = rw or RW
    if lw + rw > CW + 0.5:
        raise ValueError(
            f"two_col() lw+rw ({lw/mm:.1f}+{rw/mm:.1f}={( lw+rw)/mm:.1f}mm) "
            f"exceeds page content width {CW/mm:.1f}mm."
        )
    left_wrapped  = _col_wrap(left_items,  lw)
    right_wrapped = _col_wrap(right_items, rw)
    t = Table(
        [[left_wrapped, right_wrapped]],
        colWidths=[lw, rw]
    )
    t.setStyle(TableStyle([
        ('VALIGN',       (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING',  (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING',   (0,0), (-1,-1), 0),
        ('BOTTOMPADDING',(0,0), (-1,-1), 0),
    ]))
    return t


def kv(label, value, style=S_NORMAL):
    """Single key-value line as a Paragraph."""
    if not value:
        return Paragraph(f'<b>{label}</b>', style)
    return Paragraph(f'<b>{label}</b> {value}', style)


def kv_list(pairs):
    """List of (label, value) pairs rendered as paragraphs."""
    items = []
    for lbl, val in pairs:
        if val and str(val).strip():
            items.append(Paragraph(f'<b>{lbl}</b> {val}', S_NORMAL))
    return items


def tick(value, options):
    """Radio-style tick: [x] Option or [ ] Option."""
    parts = []
    for opt in options:
        mark = 'x' if str(value or '').strip().lower() == opt.lower() else ' '
        parts.append(f'[{mark}] {opt}')
    return '  '.join(parts)


def cbtick(checked):
    return '[x]' if checked else '[ ]'


def checklist(items_dict):
    """Render a dict of {label: bool} as inline checkbox string."""
    parts = []
    for lbl, val in items_dict.items():
        parts.append(f"{'[x]' if val else '[ ]'} {lbl}")
    return '  '.join(parts)


# ── Patient bar ───────────────────────────────────────────────────

def patient_bar(patient, ref):
    """
    Top patient info bar — Name, Age, Sex, RN/IC, Date.
    Returns a Table spanning full width.
    """
    name    = patient.get('name', '')
    age     = patient.get('age', '')
    sex     = patient.get('sex', '') or 'M / F'
    nric    = patient.get('nric', '') or patient.get('ic', '') or patient.get('passport', '')
    date    = patient.get('date', '')

    S_BAR = ParagraphStyle('patbar', fontName='Helvetica', fontSize=7.5, leading=10)

    # 4-column bar: Name | Age  Sex | RN/IC | Date
    # Gives each field enough room and prevents crowding
    t = Table([[
        Paragraph(f'<b>Name :</b> {name}',          S_BAR),
        Paragraph(f'<b>Age:</b> {age}   <b>Sex:</b> {sex}', S_BAR),
        Paragraph(f'<b>RN /IC :</b> {nric}',         S_BAR),
        Paragraph(f'<b>Date :</b> {date}',            S_BAR),
    ]], colWidths=[CW*0.32, CW*0.18, CW*0.30, CW*0.20])
    t.setStyle(TableStyle([
        ('BOX',          (0,0), (-1,-1), 0.5, BLACK),
        ('TOPPADDING',   (0,0), (-1,-1), 3),
        ('BOTTOMPADDING',(0,0), (-1,-1), 3),
        ('LEFTPADDING',  (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
        ('VALIGN',       (0,0), (-1,-1), 'MIDDLE'),
    ]))
    return t


# ── Page header builder ───────────────────────────────────────────

def page_header(title_lines, ref):
    """KKM form title block. Returns list of flowables."""
    items = []
    items.append(Paragraph(ref, S_REF))
    for line in title_lines:
        items.append(Paragraph(line, S_TITLE))
    items.append(gap(2))
    return items


# ── Body chart markers ────────────────────────────────────────────

MARKER_COLORS = {
    'ache':   colors.HexColor('#4a7ac8'),
    'sharp':  colors.HexColor('#c0392b'),
    'numb':   colors.HexColor('#7b5ea7'),
    'burn':   colors.HexColor('#c87a00'),
    'refer':  colors.HexColor('#2a8a4a'),
    'tender': colors.HexColor('#b84a8a'),
}

MARKER_LABELS = {
    'ache': 'Ache', 'sharp': 'Sharp', 'numb': 'Numbness',
    'burn': 'Burning', 'refer': 'Referred', 'tender': 'Tenderness'
}

def body_chart_section(bc, width=None):
    """
    Render body chart: figure drawing (ant + post) with coloured markers,
    followed by a text legend below.
    """
    w       = width or CW
    markers = (bc or {}).get('markers', [])
    notes   = (bc or {}).get('notes', '')

    # inner_w accounts for box left+right padding (5mm each side)
    inner_w = w - 10 * mm
    fig = BodyChartFlowable(markers, width=inner_w)

    # Legend
    legend = []
    if markers:
        for m in markers:
            view = 'Anterior' if m.get('view') == 'ant' else 'Posterior'
            typ  = MARKER_LABELS.get(m.get('type', ''), m.get('type', ''))
            txt  = f"#{m.get('id', '')} {m.get('zone', '')} ({typ}) - {view}"
            legend.append(Paragraph(txt, S_SMALL))
    if notes and notes.strip():
        legend.append(Paragraph(f'Notes: {notes}', S_SMALL))

    inner = [Paragraph('BODY CHART', S_LABEL), fig]
    inner += legend if legend else [Paragraph('No markers recorded', S_SMALL)]

    t = Table([[inner]], colWidths=[w])
    t.setStyle(TableStyle([
        ('BOX',          (0,0),(-1,-1), 0.5, BLACK),
        ('TOPPADDING',   (0,0),(-1,-1), 4),
        ('BOTTOMPADDING',(0,0),(-1,-1), 4),
        ('LEFTPADDING',  (0,0),(-1,-1), 5),
        ('RIGHTPADDING', (0,0),(-1,-1), 5),
        ('VALIGN',       (0,0),(-1,-1), 'TOP'),
    ]))
    return t


# ── Generic data table ────────────────────────────────────────────

def data_table(headers, rows, col_widths, stripe=True):
    """
    Render a data table with header row.
    headers: list of str
    rows: list of list of str
    col_widths: list of mm values
    """
    total = sum(col_widths)
    if total > CW + 0.5:
        raise ValueError(
            f"data_table() col_widths sum {total/mm:.1f}mm exceeds page content width {CW/mm:.1f}mm."
        )
    tdata = [headers] + (rows if rows else [['—'] * len(headers)])
    tbl   = Table(tdata, colWidths=col_widths)
    style = [
        ('BACKGROUND',    (0,0), (-1,0),  LGREY),
        ('FONTNAME',      (0,0), (-1,0),  'Helvetica-Bold'),
        ('FONTSIZE',      (0,0), (-1,0),  7.5),
        ('FONTNAME',      (0,1), (-1,-1), 'Helvetica'),
        ('FONTSIZE',      (0,1), (-1,-1), 8),
        ('ALIGN',         (0,0), (-1,0),  'CENTER'),
        ('VALIGN',        (0,0), (-1,-1), 'TOP'),
        ('GRID',          (0,0), (-1,-1), 0.4, BLACK),
        ('TOPPADDING',    (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING',   (0,0), (-1,-1), 3),
        ('RIGHTPADDING',  (0,0), (-1,-1), 3),
        ('WORDWRAP',      (0,0), (-1,-1), 1),
    ]
    tbl.setStyle(TableStyle(style))
    return tbl


# ── Plan section (Impression / STG / LTG / Plan) ─────────────────

def plan_section(impression, stg, ltg, treatment, width=None):
    """2x2 grid for the clinical plan."""
    w = width or CW
    hw = w / 2

    def cell(title, content):
        inner = [Paragraph(title, S_LABEL)]
        if content and content.strip():
            for line in content.split('\n'):
                if line.strip():
                    inner.append(Paragraph(line.strip(), S_NORMAL))
        else:
            inner.append(Spacer(1, 8*mm))
        return inner

    tbl = Table([
        [cell('PHYSIOTHERAPY IMPRESSION', impression),
         cell('SHORT TERM GOALS', stg)],
        [cell('LONG TERM GOALS', ltg),
         cell('PLAN OF TREATMENT', treatment)],
    ], colWidths=[hw, hw])
    tbl.setStyle(TableStyle([
        ('BOX',          (0,0), (-1,-1), 0.5, BLACK),
        ('INNERGRID',    (0,0), (-1,-1), 0.5, BLACK),
        ('TOPPADDING',   (0,0), (-1,-1), 4),
        ('BOTTOMPADDING',(0,0), (-1,-1), 4),
        ('LEFTPADDING',  (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
        ('VALIGN',       (0,0), (-1,-1), 'TOP'),
    ]))
    return tbl


# ── SOAP page ─────────────────────────────────────────────────────

# SOAP layout constants — 2 notes per page with 2mm breathing room
_SOAP_NOTE_H  = (A4[1] - 14*mm - 14*mm - 2*mm) / 2   # ~133.5mm each, 2mm total gap
_SOAP_BANNER_H = 9.5 * mm
_SOAP_GRID_H  = _SOAP_NOTE_H - _SOAP_BANNER_H
_SOAP_ROW_H   = _SOAP_GRID_H / 2


def soap_page(patient, soap, episode_info=None):
    """
    Returns a list of flowables for one SOAP note block.
    Fixed height = half page. Caller is responsible for PageBreak every 2 notes.
    No PageBreak included here.
    """
    story = []
    form_type  = (episode_info or {}).get('form_type', 'MS')
    form_label = {'MS':'Musculoskeletal','SPINE':'Spine','GERIATRIC':'Geriatric'}.get(form_type, form_type)
    session_no = soap.get('session_no', '')
    note_date  = soap.get('note_date', '')
    name       = patient.get('name', '')
    nric       = patient.get('nric', '') or patient.get('ic', '') or patient.get('passport', '')

    # Banner
    banner_txt = (f'<font color="#ffffff"><b>FOLLOW-UP NOTE — Session {session_no}</b>'
                  f'&nbsp;&nbsp;&nbsp;{form_label} &nbsp;|&nbsp; Date: {note_date}'
                  f'&nbsp;&nbsp;&nbsp;Patient: {name} &nbsp;|&nbsp; IC: {nric}</font>')
    banner = Table([[Paragraph(banner_txt, ParagraphStyle('banner',
                    fontName='Helvetica-Bold', fontSize=8, leading=11,
                    textColor=colors.white))]],
                   colWidths=[CW])
    banner.setStyle(TableStyle([
        ('BACKGROUND',   (0,0),(-1,-1), BLUE),
        ('TOPPADDING',   (0,0),(-1,-1), 5),
        ('BOTTOMPADDING',(0,0),(-1,-1), 5),
        ('LEFTPADDING',  (0,0),(-1,-1), 6),
        ('RIGHTPADDING', (0,0),(-1,-1), 6),
    ]))
    story.append(banner)

    # SOAP grid — fixed row heights, 2 rows x 2 cols
    # Content clips if too long (long notes = rare, use new assessment instead)
    hw = CW / 2

    def cell_content(letter, title, content, hint, bg):
        """Build cell inner content as a list of paragraphs."""
        inner = [Paragraph(f'<b>{letter} — {title}</b>', S_LABEL)]
        if content and str(content).strip():
            inner.append(Paragraph(str(content), S_NORMAL))
        else:
            inner.append(Paragraph(hint, S_SMALL))
        return inner

    S_bg = colors.HexColor('#eef2f9')
    A_bg = colors.HexColor('#f5f5f5')

    soap_tbl = Table([
        [
            cell_content('S', 'SUBJECTIVE', soap.get('subjective', ''),
                         "Patient's report — pain, function, symptoms.", S_bg),
            cell_content('O', 'OBJECTIVE',  soap.get('objective', ''),
                         'Measurements — ROM, strength, VAS, special tests.', S_bg),
        ],
        [
            cell_content('A', 'ANALYSIS', soap.get('analysis', ''),
                         'Progress towards goals, problems in priority.', A_bg),
            cell_content('P', 'PLAN',     soap.get('plan', ''),
                         'Treatment given, HEP, next session plan.', A_bg),
        ],
    ],
        colWidths=[hw, hw],
        rowHeights=[_SOAP_ROW_H, _SOAP_ROW_H],
    )
    soap_tbl.setStyle(TableStyle([
        ('BOX',          (0,0),(-1,-1), 0.5, BLACK),
        ('INNERGRID',    (0,0),(-1,-1), 0.5, BLACK),
        ('TOPPADDING',   (0,0),(-1,-1), 5),
        ('BOTTOMPADDING',(0,0),(-1,-1), 5),
        ('LEFTPADDING',  (0,0),(-1,-1), 5),
        ('RIGHTPADDING', (0,0),(-1,-1), 5),
        ('VALIGN',       (0,0),(-1,-1), 'TOP'),
        ('BACKGROUND',   (0,0),(1,0),   S_bg),
        ('BACKGROUND',   (0,1),(1,1),   A_bg),
        ('CLIPONOVERFLOW', (0,0),(-1,-1), 1),
    ]))
    return [banner, soap_tbl]


# ── Document builder ──────────────────────────────────────────────

def build_pdf(story):
    """Build a PDF from a story list. Returns bytes."""
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=ML, rightMargin=MR,
        topMargin=MT, bottomMargin=MB
    )
    doc.build(story)
    return buf.getvalue()
