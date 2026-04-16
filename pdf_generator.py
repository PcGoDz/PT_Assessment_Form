# pdf_generator.py — KKM MS Assessment Form PDF using ReportLab
# Pure Python, no system dependencies, PyInstaller friendly

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import Table, TableStyle
import io

W, H   = A4
M_LEFT = 12*mm; M_RIGHT = 12*mm; M_TOP = 10*mm
COL_W  = W - M_LEFT - M_RIGHT
LEFT_W = COL_W * 0.47
RIGHT_W= COL_W * 0.53
BLACK  = colors.black
WHITE  = colors.white
LGREY  = colors.HexColor('#f0f0f0')
FB     = 'Helvetica-Bold'
FN     = 'Helvetica'

MARKER_COLORS = {
    'ache':   colors.HexColor('#4a7ac8'),
    'sharp':  colors.HexColor('#c0392b'),
    'numb':   colors.HexColor('#7b5ea7'),
    'burn':   colors.HexColor('#c87a00'),
    'refer':  colors.HexColor('#2a8a4a'),
    'tender': colors.HexColor('#b84a8a'),
}

def wrap_text(text, max_w, fs):
    if not text: return []
    cw = fs * 0.52
    mc = max(1, int(max_w / cw))
    out = []
    for para in str(text).split('\n'):
        words = para.split()
        if not words: out.append(''); continue
        cur = ''
        for w in words:
            t = (cur+' '+w).strip()
            if len(t) <= mc: cur = t
            else:
                if cur: out.append(cur)
                cur = w
        if cur: out.append(cur)
    return out

def draw_section(c, x, y, w, h, label=None, content=None, fs=8):
    c.setStrokeColor(BLACK); c.setLineWidth(0.5)
    c.rect(x, y, w, h)
    cy = y + h - 4*mm
    if label:
        c.setFont(FB, fs); c.setFillColor(BLACK)
        c.drawString(x+2*mm, cy, label); cy -= 4.5*mm
    if content:
        c.setFont(FN, fs)
        for line in wrap_text(content, w-4*mm, fs):
            if cy < y+1.5*mm: break
            c.drawString(x+2*mm, cy, line); cy -= (fs*0.38*mm + 0.8*mm)

# ── Body figure drawing ────────────────────────────────────
def draw_figure(c, cx, top_y, s=0.185):
    """Draw anatomical figure. s=mm per SVG unit. Total height = 310*s mm."""
    # All coords in 0-130 / 0-310 SVG space
    # cx = center x in PDF points, top_y = top of figure in PDF points
    def px(v): return cx + (v - 65) * s * mm
    def py(v): return top_y - v * s * mm

    c.setStrokeColor(colors.HexColor('#222222'))
    c.setFillColor(WHITE)
    c.setLineWidth(0.55)

    def rr(svgx, svgy, svgw, svgh, r=2):
        """Draw rounded rect from SVG coords."""
        c.roundRect(px(svgx), py(svgy+svgh), svgw*s*mm, svgh*s*mm,
                    r*s*mm, stroke=1, fill=1)

    def el(svgx1, svgy1, svgx2, svgy2):
        """Draw ellipse from SVG bounding box."""
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
    rr(8,  55, 16, 52, 4)   # L
    rr(106, 55, 16, 52, 4)  # R
    # Forearms
    rr(10, 107, 13, 46, 3)  # L
    rr(107, 107, 13, 46, 3) # R
    # Hands
    el(8, 153, 24, 167)     # L
    el(106, 153, 122, 167)  # R
    # Pelvis
    rr(37, 115, 56, 20, 3)
    # Thighs
    rr(38, 135, 22, 68, 4)  # L
    rr(70, 135, 22, 68, 4)  # R
    # Knees
    el(36, 203, 62, 215)    # L
    el(68, 203, 94, 215)    # R
    # Shins
    rr(39, 215, 20, 60, 3)  # L
    rr(71, 215, 20, 60, 3)  # R
    # Feet
    el(32, 275, 62, 287)    # L
    el(68, 275, 98, 287)    # R

    # R / L labels
    c.setFont(FN, 6); c.setFillColor(colors.HexColor('#888888'))
    c.drawString(px(2),  py(160), 'R')
    c.drawString(px(122), py(160), 'L')


def draw_markers(c, cx, top_y, markers, view, s=0.35):
    def x(v): return cx + (v-65)*s*mm
    def y(v): return top_y - v*s*mm
    for m in markers:
        if m.get('view') != view: continue
        mx = cx + (m.get('x', 65)-65)*s*mm
        my = top_y - m.get('y', 0)*s*mm
        col = MARKER_COLORS.get(m.get('type','ache'), colors.blue)
        c.setFillColor(col); c.setStrokeColor(WHITE); c.setLineWidth(0.6)
        c.circle(mx, my, 2.0*mm, stroke=1, fill=1)
        c.setFillColor(WHITE); c.setFont(FB, 4.5)
        c.drawCentredString(mx, my-1.2*mm, str(m.get('id','')))


# ══════════════════════════════════════════════════════════
def generate_ms_pdf(data):
    buf = io.BytesIO()
    from reportlab.pdfgen import canvas as rl_canvas
    c = rl_canvas.Canvas(buf, pagesize=A4)

    patient  = data.get('patient', {})
    pain     = data.get('pain', {})
    sq       = data.get('specialQuestions', {})
    hx       = data.get('history', {})
    neuro    = data.get('neurological', {})
    obs      = data.get('observation', {})
    palp     = data.get('palpation', {})
    movement = data.get('movement', {})
    plan     = data.get('plan', {})
    mgmt     = data.get('management', {})
    bc       = data.get('bodyChart', {})
    markers  = bc.get('markers', [])

    _page1(c, patient, pain, sq, hx, neuro, obs, palp, mgmt,
           data.get('diagnosis',''), data.get('problem',''), markers, bc)
    c.showPage()
    _page2(c, patient, movement, plan)
    c.save()
    return buf.getvalue()


def _page1(c, patient, pain, sq, hx, neuro, obs, palp, mgmt,
           diagnosis, problem, markers, bc):

    # Ref
    c.setFont(FN, 7)
    c.drawRightString(W-M_RIGHT, H-M_TOP, 'fisio / b.pen. 14 / Pind. 1 / 2019')

    # Title
    ty = H - M_TOP - 5*mm
    c.setFont(FB, 10)
    for line in ['KEMENTERIAN KESIHATAN MALAYSIA',
                 'PHYSIOTHERAPY DEPARTMENT',
                 'MUSCULOSKELETAL  ASSESSMENT FORM']:
        c.drawCentredString(W/2, ty, line); ty -= 5*mm
    ty -= 1*mm

    # Patient bar
    bh = 7*mm
    c.setLineWidth(0.5); c.rect(M_LEFT, ty-bh, COL_W, bh)
    by = ty - bh + 2.2*mm
    bx = M_LEFT + 2*mm
    c.setFont(FN, 8)

    def field(lbl, val, at, fw=30*mm):
        c.drawString(at, by, lbl)
        lw = c.stringWidth(lbl, FN, 8)
        vx = at + lw + 1*mm
        c.line(vx, by-0.5*mm, vx+fw, by-0.5*mm)
        c.drawString(vx+0.5*mm, by, str(val or ''))
        return at + lw + fw + 3*mm

    nric = patient.get('nric','') or patient.get('passport','')
    sex = ''
    if patient.get('type') == 'local' and len(patient.get('nric','')) >= 12:
        sex = 'M' if int(patient['nric'][-1]) % 2 == 1 else 'F'
    else:
        sex = patient.get('sex','') or 'M / F'

    nx = field('Name :', patient.get('name',''), bx, 52*mm)
    nx = field('Age:', patient.get('age',''), nx, 10*mm)
    c.drawString(nx, by, f'Sex: {sex}'); nx += 16*mm
    nx = field('RN /IC :', nric, nx, 34*mm)
    field('Date :', patient.get('date',''), nx, 24*mm)
    ty -= bh

    # Column layout
    lx = M_LEFT; rx = M_LEFT + LEFT_W
    cur_l = ty; cur_r = ty

    def lsec(h, label=None, content=None, fn=None):
        nonlocal cur_l
        if fn:
            c.setLineWidth(0.5); c.rect(lx, cur_l-h, LEFT_W, h)
            fn(lx, cur_l-h, LEFT_W, h)
        else:
            draw_section(c, lx, cur_l-h, LEFT_W, h, label, content)
        cur_l -= h

    def rsec(h, label=None, content=None, fn=None):
        nonlocal cur_r
        if fn:
            c.setLineWidth(0.5); c.rect(rx, cur_r-h, RIGHT_W, h)
            fn(rx, cur_r-h, RIGHT_W, h)
        else:
            draw_section(c, rx, cur_r-h, RIGHT_W, h, label, content)
        cur_r -= h

    # LEFT column
    lsec(18*mm, 'DIAGNOSIS', diagnosis)

    mgmt_txt = mgmt.get('type','')
    if mgmt.get('surgeryDate'): mgmt_txt += f" — Surgery: {mgmt['surgeryDate']}"
    lsec(14*mm, "DOCTOR'S MANAGEMENT", mgmt_txt)
    lsec(14*mm, 'PROBLEM', problem)

    def draw_pain(bx, by, bw, bh):
        c.setFont(FB, 8); c.setFillColor(BLACK)
        c.drawString(bx+2*mm, by+bh-5*mm, 'PAIN SCORE :')
        pw = c.stringWidth('PAIN SCORE :', FB, 8)
        prx = bx + pw + 5*mm
        # PRE
        c.setFont(FN, 8)
        c.drawString(prx, by+bh-5*mm, 'PRE')
        c.rect(prx+10*mm, by+bh-7*mm, 18*mm, 5.5*mm)
        c.setFont(FB, 9); c.drawString(prx+12*mm, by+bh-5.5*mm, str(pain.get('pre','')))
        # POST
        c.setFont(FN, 8)
        c.drawString(prx, by+bh-12*mm, 'POST')
        c.rect(prx+12*mm, by+bh-14*mm, 18*mm, 5.5*mm)
        c.setFont(FB, 9); c.drawString(prx+14*mm, by+bh-12.5*mm, str(pain.get('post','')))
        # Fields
        items = [
            f"Nature : {pain.get('nature','')}",
            f"Agg. : {pain.get('agg','')}",
            f"Ease : {pain.get('ease','')}",
            f"24 hrs. : {pain.get('behaviour24','')}",
        ]
        fy = by+bh-18*mm
        c.setFont(FN, 8)
        for it in items:
            c.drawString(bx+2*mm, fy, it); fy -= 4.5*mm
        irr = pain.get('irritability','')
        c.drawString(bx+2*mm, fy,
            f"Irritability: {irr}" if irr else "Irritability: High / Medium/ Low")

    lsec(44*mm, fn=draw_pain)

    pm = sq.get('pacemaker','')
    pm_display = pm if pm and pm != 'No' else 'Yes / No'
    pmhx = sq.get('pmhx','')
    if sq.get('surgery'): pmhx += f" / {sq['surgery']}"
    occ = sq.get('occupation','')
    if sq.get('recreation'): occ += f" / {sq['recreation']}"

    sq_txt = (f"General Health : {sq.get('health','')}\n"
              f"PMHX / Surgery : {pmhx}\n"
              f"Investigation : {sq.get('investigation','')}\n"
              f"Medication : {sq.get('medication','')}\n"
              f"Occupation / Recreation: {occ}\n\n"
              f"Social History: {sq.get('social','')}\n\n\n"
              f"Pacemaker/ Hearing aid:   {pm_display}")
    lsec(56*mm, 'SPECIAL QUESTION', sq_txt)

    # RIGHT column — body chart
    def draw_bc(bx, by, bw, bh):
        sc = 0.185
        ant_cx  = bx + bw*0.28
        post_cx = bx + bw*0.74
        # Position figure so feet land above label area (10mm from bottom)
        fig_top = by + bh - 5*mm

        draw_figure(c, ant_cx,  fig_top, s=sc)
        draw_markers(c, ant_cx,  fig_top, markers, 'ant',  s=sc)
        draw_figure(c, post_cx, fig_top, s=sc)
        draw_markers(c, post_cx, fig_top, markers, 'post', s=sc)

        # Right / Left labels at bottom of figures
        label_y = by + 2*mm
        c.setFont(FN, 6.5); c.setFillColor(BLACK)
        c.drawString(bx+2*mm,        label_y, 'Right')
        c.drawCentredString(ant_cx,   label_y, 'Left')
        c.drawCentredString(post_cx,  label_y, 'Left')
        c.drawRightString(bx+bw-2*mm, label_y, 'Right')

    # Height: figure is 287*0.185mm = 53mm + 5mm top pad + 6mm labels = 64mm
    rsec(66*mm, fn=draw_bc)

    # Marker legend — separate small section
    if markers:
        leg_h = min(4 + len(markers)*3.5, 20)*mm
        def draw_legend(bx, by, bw, bh):
            c.setFont(FN, 6.5); c.setFillColor(BLACK)
            ly = by + bh - 3*mm
            for m in markers:
                col = MARKER_COLORS.get(m.get('type','ache'), colors.blue)
                c.setFillColor(col); c.circle(bx+3.5*mm, ly+1*mm, 1.5*mm, fill=1, stroke=0)
                c.setFillColor(BLACK)
                c.drawString(bx+6.5*mm, ly,
                    f"#{m.get('id','')} {m.get('zone','')} ({m.get('type','')})")
                ly -= 3.5*mm
            if bc.get('notes'):
                c.setFont(FN, 6); c.setFillColor(colors.HexColor('#555555'))
                c.drawString(bx+2*mm, by+1.5*mm, bc['notes'][:80])
        rsec(leg_h, fn=draw_legend)

    rsec(18*mm, 'CURRENT HISTORY', hx.get('current',''))
    rsec(18*mm, 'PAST HISTORY',    hx.get('past',''))

    def draw_neuro(bx, by, bw, bh):
        c.setFont(FB, 8); c.setFillColor(BLACK)
        c.drawString(bx+2*mm, by+bh-5*mm, 'NEUROLOGICAL TEST:')
        rows = [
            ('Sensation:', neuro.get('sensation',{})),
            ('Reflex :',   neuro.get('reflex',{})),
            ('Motor',      neuro.get('motor',{})),
        ]
        fy = by+bh-10*mm
        for lbl, d in rows:
            c.setFont(FB, 8)
            c.drawString(bx+2*mm, fy, lbl)
            lw = c.stringWidth(lbl, FB, 8)
            c.setFont(FN, 8)
            val = f"L: {d.get('left','')}  R: {d.get('right','')}  {d.get('notes','')}"
            c.drawString(bx+2*mm+lw+1*mm, fy, val[:55])
            fy -= 5*mm

    rsec(20*mm, fn=draw_neuro)

    obs_txt = ''
    if obs.get('general'): obs_txt += f"General: {obs['general']}\n"
    if obs.get('local'):   obs_txt += f"Local: {obs['local']}"
    rsec(18*mm, 'OBSERVATION ( general & local )', obs_txt)

    palp_txt = ''
    if palp.get('tenderness'):  palp_txt += f"Tenderness: {palp['tenderness']}\n"
    if palp.get('temperature'): palp_txt += f"Temperature: {palp['temperature']}\n"
    if palp.get('muscle'):      palp_txt += f"Muscle: {palp['muscle']}\n"
    if palp.get('joint'):       palp_txt += f"Joint: {palp['joint']}"
    rsec(16*mm, 'PALPATION', palp_txt)

    # Close borders
    bottom = min(cur_l, cur_r)
    c.setLineWidth(0.5)
    c.line(M_LEFT, ty, M_LEFT, bottom)
    c.line(rx, ty, rx, bottom)
    c.line(M_LEFT+COL_W, ty, M_LEFT+COL_W, bottom)
    c.line(M_LEFT, bottom, M_LEFT+COL_W, bottom)


def _page2(c, patient, movement, plan):
    c.setFont(FN, 7)
    name = patient.get('name',''); date = patient.get('date','')
    c.drawRightString(W-M_RIGHT, H-M_TOP,
        f"fisio / b.pen. 14 / Pind. 1 / 2019  |  {name}  |  {date}")

    ty = H - M_TOP - 6*mm
    c.setFont(FB, 8.5); c.drawString(M_LEFT, ty, 'MOVEMENT:'); ty -= 5*mm

    # Movement table
    hdr = ['JOINT','SIDE','MOVEMENT','ACTIVE ROM','PAIN\n(ACTIVE)',
           'PASSIVE ROM','PAIN\n(PASSIVE)','RESISTED']
    rows = movement.get('table', [])
    tdata = [hdr]
    if rows:
        for r in rows:
            tdata.append([r.get('joint',''), r.get('side',''), r.get('plane',''),
                          r.get('activeRom',''), r.get('activePain',''),
                          r.get('passiveRom',''), r.get('passivePain',''),
                          r.get('resisted','')])
    else:
        for _ in range(4): tdata.append(['']*8)

    cw = [COL_W*v for v in [0.18,0.14,0.12,0.10,0.12,0.10,0.12,0.12]]
    tbl = Table(tdata, colWidths=cw)
    tbl.setStyle(TableStyle([
        ('BACKGROUND',    (0,0),(-1,0), LGREY),
        ('FONTNAME',      (0,0),(-1,0), FB),
        ('FONTSIZE',      (0,0),(-1,0), 7),
        ('FONTNAME',      (0,1),(-1,-1), FN),
        ('FONTSIZE',      (0,1),(-1,-1), 8),
        ('ALIGN',         (0,0),(-1,0), 'CENTER'),
        ('VALIGN',        (0,0),(-1,-1), 'TOP'),
        ('GRID',          (0,0),(-1,-1), 0.5, BLACK),
        ('TOPPADDING',    (0,0),(-1,-1), 2),
        ('BOTTOMPADDING', (0,0),(-1,-1), 4),
        ('LEFTPADDING',   (0,0),(-1,-1), 3),
        ('MINROWHEIGHT',  (0,1),(-1,-1), 8*mm),
    ]))
    tw, th = tbl.wrapOn(c, COL_W, H)
    tbl.drawOn(c, M_LEFT, ty-th); ty -= th + 4*mm

    # Bottom grid 4 rows x 2 cols
    ch = 28*mm; hw = COL_W/2
    cells = [
        ('MUSCLE STRENGTH',             movement.get('muscle','')),
        ("PHYSIOTHERAPIST'S IMPRESSION",plan.get('impression','')),
        ('ACCESSORY MOVEMENT',          movement.get('accessory','')),
        ('SHORT TERM GOALS',            plan.get('stg','')),
        ('CLEARING TESTS / OTHER JOINT',movement.get('clearing','')),
        ('LONG TERM GOALS',             plan.get('ltg','')),
        ('SPECIAL TESTS / MEASUREMENTS',movement.get('special','')),
        ('PLAN OF TREATMENT',           plan.get('treatment','')),
    ]
    for i, (lbl, txt) in enumerate(cells):
        col = i % 2
        row = i // 2
        cx  = M_LEFT + col*hw
        cy  = ty - (row+1)*ch
        draw_section(c, cx, cy, hw, ch, lbl, txt)

    ty -= 4*ch
    # Sign
    sh = 20*mm
    c.setLineWidth(0.5); c.rect(M_LEFT, ty-sh, COL_W, sh)
    c.setFont(FN, 8)
    c.drawString(M_LEFT+2*mm, ty-sh+9*mm,
        'Attending Physiotherapist: ………………………………………………………….')
    c.drawRightString(M_LEFT+COL_W-2*mm, ty-sh+15*mm, 'Date: _______________')
    c.drawRightString(M_LEFT+COL_W-2*mm, ty-sh+9*mm,  'Sign & Stamp')
