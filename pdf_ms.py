# pdf_ms.py — MS Assessment Form PDF generator
# Imports shared utilities from pdf_base.py

import io
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import Table, TableStyle
from reportlab.pdfgen import canvas as rl_canvas

from pdf_base import (
    W, H, M_LEFT, M_RIGHT, M_TOP, COL_W, LEFT_W, RIGHT_W,
    BLACK, WHITE, LGREY, FB, FN, MARKER_COLORS,
    wrap_text, draw_section, draw_patient_bar,
    draw_form_header, draw_page2_header,
    draw_figure, draw_markers, draw_sign_block
)

TITLE_LINES = [
    'KEMENTERIAN KESIHATAN MALAYSIA',
    'PHYSIOTHERAPY DEPARTMENT',
    'MUSCULOSKELETAL  ASSESSMENT FORM',
]

def generate_ms_pdf(data):
    buf = io.BytesIO()
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

    # Shared header + patient bar
    ty = draw_form_header(c, TITLE_LINES)
    ty = draw_patient_bar(c, patient, ty)

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
    ty = draw_page2_header(c, patient)
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
    # Shared sign block from pdf_base
    draw_sign_block(c, ty)