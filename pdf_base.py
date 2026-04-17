# pdf_base.py — Shared PDF drawing utilities for all assessment forms
# Import this in form-specific PDF generators (pdf_ms.py, pdf_spine.py etc.)
# Pure Python, no system dependencies, PyInstaller friendly.

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
import io

# ── Page constants ─────────────────────────────────────────
W, H     = A4
M_LEFT   = 12 * mm
M_RIGHT  = 12 * mm
M_TOP    = 10 * mm
COL_W    = W - M_LEFT - M_RIGHT
LEFT_W   = COL_W * 0.47
RIGHT_W  = COL_W * 0.53

# ── Colours ────────────────────────────────────────────────
BLACK = colors.black
WHITE = colors.white
LGREY = colors.HexColor('#f0f0f0')

# ── Marker colours (body chart) ────────────────────────────
MARKER_COLORS = {
    'ache':   colors.HexColor('#4a7ac8'),
    'sharp':  colors.HexColor('#c0392b'),
    'numb':   colors.HexColor('#7b5ea7'),
    'burn':   colors.HexColor('#c87a00'),
    'refer':  colors.HexColor('#2a8a4a'),
    'tender': colors.HexColor('#b84a8a'),
}

# ── Fonts ──────────────────────────────────────────────────
FB = 'Helvetica-Bold'
FN = 'Helvetica'


# ── Text helpers ───────────────────────────────────────────
def wrap_text(text, max_w, fs):
    """Word-wrap text to fit max_w points at font size fs."""
    if not text:
        return []
    cw = fs * 0.52
    mc = max(1, int(max_w / cw))
    out = []
    for para in str(text).split('\n'):
        words = para.split()
        if not words:
            out.append('')
            continue
        cur = ''
        for w in words:
            t = (cur + ' ' + w).strip()
            if len(t) <= mc:
                cur = t
            else:
                if cur:
                    out.append(cur)
                cur = w
        if cur:
            out.append(cur)
    return out


def draw_section(c, x, y, w, h, label=None, content=None, fs=8):
    """Draw a bordered section box with optional bold label and wrapped content."""
    c.setStrokeColor(BLACK)
    c.setLineWidth(0.5)
    c.rect(x, y, w, h)
    cy = y + h - 4 * mm
    if label:
        c.setFont(FB, fs)
        c.setFillColor(BLACK)
        c.drawString(x + 2 * mm, cy, label)
        cy -= 4.5 * mm
    if content:
        c.setFont(FN, fs)
        for line in wrap_text(content, w - 4 * mm, fs):
            if cy < y + 1.5 * mm:
                break
            c.drawString(x + 2 * mm, cy, line)
            cy -= (fs * 0.38 * mm + 0.8 * mm)


# ── Patient bar ────────────────────────────────────────────
def draw_patient_bar(c, patient, ty):
    """Draw patient info bar. Returns new y position after bar."""
    bh = 7 * mm
    c.setLineWidth(0.5)
    c.rect(M_LEFT, ty - bh, COL_W, bh)
    by = ty - bh + 2.2 * mm
    bx = M_LEFT + 2 * mm
    c.setFont(FN, 8)

    def field(lbl, val, at, fw=30 * mm):
        c.drawString(at, by, lbl)
        lw = c.stringWidth(lbl, FN, 8)
        vx = at + lw + 1 * mm
        c.line(vx, by - 0.5 * mm, vx + fw, by - 0.5 * mm)
        c.drawString(vx + 0.5 * mm, by, str(val or ''))
        return at + lw + fw + 3 * mm

    nric = patient.get('nric', '') or patient.get('passport', '')
    sex = ''
    if patient.get('type') == 'local' and len(patient.get('nric', '')) >= 12:
        sex = 'M' if int(patient['nric'][-1]) % 2 == 1 else 'F'
    else:
        sex = patient.get('sex', '') or 'M / F'

    nx = field('Name :', patient.get('name', ''), bx, 52 * mm)
    nx = field('Age:', patient.get('age', ''), nx, 10 * mm)
    c.drawString(nx, by, 'Sex: ' + sex)
    nx += 16 * mm
    nx = field('RN /IC :', nric, nx, 34 * mm)
    field('Date :', patient.get('date', ''), nx, 24 * mm)

    return ty - bh


# ── Page header (form reference + title) ───────────────────
def draw_form_header(c, title_lines, ref='fisio / b.pen. 14 / Pind. 1 / 2019'):
    """Draw ref number top-right and centered title lines. Returns y after header."""
    c.setFont(FN, 7)
    c.drawRightString(W - M_RIGHT, H - M_TOP, ref)

    ty = H - M_TOP - 5 * mm
    c.setFont(FB, 10)
    for line in title_lines:
        c.drawCentredString(W / 2, ty, line)
        ty -= 5 * mm
    ty -= 1 * mm
    return ty


# ── Page 2 header (continuation line) ──────────────────────
def draw_page2_header(c, patient, ref='fisio / b.pen. 14 / Pind. 1 / 2019'):
    """Draw page 2 continuation header. Returns y after header."""
    c.setFont(FN, 7)
    name = patient.get('name', '')
    date = patient.get('date', '')
    c.drawRightString(W - M_RIGHT, H - M_TOP,
                      f"{ref}  |  {name}  |  {date}")
    return H - M_TOP - 6 * mm


# ── Body figure ────────────────────────────────────────────
def draw_figure(c, cx, top_y, s=0.185):
    """Draw anatomical body figure. s = mm per SVG unit. Total height ~287*s mm."""
    def px(v): return cx + (v - 65) * s * mm
    def py(v): return top_y - v * s * mm

    c.setStrokeColor(colors.HexColor('#222222'))
    c.setFillColor(WHITE)
    c.setLineWidth(0.55)

    def rr(svgx, svgy, svgw, svgh, r=2):
        c.roundRect(px(svgx), py(svgy + svgh), svgw * s * mm, svgh * s * mm,
                    r * s * mm, stroke=1, fill=1)

    def el(svgx1, svgy1, svgx2, svgy2):
        c.ellipse(px(svgx1), py(svgy2), px(svgx2), py(svgy1), stroke=1, fill=1)

    # Head
    el(52, 6, 78, 34)
    # Neck
    rr(59, 33, 12, 9, 1)
    # Shoulders
    p = c.beginPath()
    p.moveTo(px(37), py(42)); p.lineTo(px(20), py(55))
    p.lineTo(px(20), py(65)); p.lineTo(px(37), py(56))
    p.lineTo(px(93), py(56)); p.lineTo(px(110), py(65))
    p.lineTo(px(110), py(55)); p.lineTo(px(93), py(42))
    p.close()
    c.drawPath(p, stroke=1, fill=1)
    # Torso
    rr(37, 55, 56, 60, 3)
    # Upper arms
    rr(8,   55, 16, 52, 4)
    rr(106, 55, 16, 52, 4)
    # Forearms
    rr(10,  107, 13, 46, 3)
    rr(107, 107, 13, 46, 3)
    # Hands
    el(8,   153, 24, 167)
    el(106, 153, 122, 167)
    # Pelvis
    rr(37, 115, 56, 20, 3)
    # Thighs
    rr(38, 135, 22, 68, 4)
    rr(70, 135, 22, 68, 4)
    # Knees
    el(36, 203, 62, 215)
    el(68, 203, 94, 215)
    # Shins
    rr(39, 215, 20, 60, 3)
    rr(71, 215, 20, 60, 3)
    # Feet
    el(32, 275, 62, 287)
    el(68, 275, 98, 287)

    # R / L labels
    c.setFont(FN, 6)
    c.setFillColor(colors.HexColor('#888888'))
    c.drawString(px(2),   py(160), 'R')
    c.drawString(px(122), py(160), 'L')


def draw_markers(c, cx, top_y, markers, view, s=0.185):
    """Draw body chart markers for the given view (ant/post)."""
    for m in markers:
        if m.get('view') != view:
            continue
        mx = cx + (m.get('x', 65) - 65) * s * mm
        my = top_y - m.get('y', 0) * s * mm
        col = MARKER_COLORS.get(m.get('type', 'ache'), colors.blue)
        c.setFillColor(col)
        c.setStrokeColor(WHITE)
        c.setLineWidth(0.6)
        c.circle(mx, my, 2.0 * mm, stroke=1, fill=1)
        c.setFillColor(WHITE)
        c.setFont(FB, 4.5)
        c.drawCentredString(mx, my - 1.2 * mm, str(m.get('id', '')))


# ── Movement table (shared across MS / Spine variants) ─────
def draw_movement_table(c, ty, col_widths, headers, rows, empty_rows=4):
    """Draw a movement assessment table. Returns y after table."""
    from reportlab.platypus import Table, TableStyle

    tdata = [headers]
    if rows:
        for r in rows:
            tdata.append([r.get(k, '') for k in r.keys()] if isinstance(r, dict) else r)
    else:
        for _ in range(empty_rows):
            tdata.append([''] * len(headers))

    tbl = Table(tdata, colWidths=col_widths)
    tbl.setStyle(TableStyle([
        ('BACKGROUND',    (0, 0), (-1, 0),  LGREY),
        ('FONTNAME',      (0, 0), (-1, 0),  FB),
        ('FONTSIZE',      (0, 0), (-1, 0),  7),
        ('FONTNAME',      (0, 1), (-1, -1), FN),
        ('FONTSIZE',      (0, 1), (-1, -1), 8),
        ('ALIGN',         (0, 0), (-1, 0),  'CENTER'),
        ('VALIGN',        (0, 0), (-1, -1), 'TOP'),
        ('GRID',          (0, 0), (-1, -1), 0.5, BLACK),
        ('TOPPADDING',    (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING',   (0, 0), (-1, -1), 3),
        ('MINROWHEIGHT',  (0, 1), (-1, -1), 8 * mm),
    ]))
    from reportlab.pdfgen import canvas as rl_canvas
    tw, th = tbl.wrapOn(c, COL_W, H)
    tbl.drawOn(c, M_LEFT, ty - th)
    return ty - th


# ── Sign / stamp block ─────────────────────────────────────
def draw_sign_block(c, ty):
    """Draw attending physiotherapist sign/stamp/date block."""
    sh = 20 * mm
    c.setLineWidth(0.5)
    c.rect(M_LEFT, ty - sh, COL_W, sh)
    c.setFont(FN, 8)
    c.drawString(M_LEFT + 2 * mm, ty - sh + 9 * mm,
                 'Attending Physiotherapist: ……………………………………………………….')
    c.drawRightString(M_LEFT + COL_W - 2 * mm, ty - sh + 15 * mm,
                      'Date: _______________')
    c.drawRightString(M_LEFT + COL_W - 2 * mm, ty - sh + 9 * mm,
                      'Sign & Stamp')
    return ty - sh
