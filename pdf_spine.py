# pdf_spine.py — KKM Spine Assessment Form PDF
# Standalone bespoke generator. fisio / b.pen. 6 / Pind. 2 / 2019
# Pure Python, PyInstaller-friendly.

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import Table, TableStyle
from reportlab.pdfgen import canvas as rl_canvas
from pdf_base import draw_figure, draw_markers, draw_soap_page, wrap_text, MARKER_COLORS
import io

W, H   = A4
ML     = 12 * mm   # margin left
MR     = 12 * mm   # margin right
MT     = 10 * mm   # margin top
CW     = W - ML - MR
LW     = CW * 0.47
RW     = CW * 0.53
BLACK  = colors.black
WHITE  = colors.white
LGREY  = colors.HexColor('#f0f0f0')
FB, FN = 'Helvetica-Bold', 'Helvetica'
REF    = 'fisio / b.pen. 6 / Pind. 2 / 2019'
TITLE  = ['KEMENTERIAN KESIHATAN MALAYSIA',
          'PHYSIOTHERAPY DEPARTMENT',
          'SPINE  ASSESSMENT FORM']

SPINE_MOVEMENTS = [
    'Flexion', 'Extension',
    'Lateral Flexion (L)', 'Lateral Flexion (R)',
    'Rotation (L)', 'Rotation (R)',
]
NEURO_TESTS = [
    ('pnf',    'PNF'),
    ('slr',    'SLR'),
    ('ultt1',  'ULTT 1'),
    ('ultt2a', 'ULTT 2a'),
    ('ultt2b', 'ULTT 2b'),
    ('ultt2c', 'ULTT 2c'),
    ('slump',  'Slump'),
    ('pkb',    'PKB / Quad'),
]

# ── Shared drawing helpers ─────────────────────────────

def _ref(c):
    c.setFont(FN, 7)
    c.drawRightString(W - MR, H - MT, REF)

def _title(c):
    ty = H - MT - 5 * mm
    c.setFont(FB, 10)
    for line in TITLE:
        c.drawCentredString(W / 2, ty, line)
        ty -= 5 * mm
    return ty - 1 * mm

def _patient_bar(c, p, ty):
    bh = 7 * mm
    c.setLineWidth(0.5)
    c.rect(ML, ty - bh, CW, bh)
    by = ty - bh + 2.2 * mm
    c.setFont(FN, 8)

    def fld(lbl, val, at, fw=30*mm):
        c.drawString(at, by, lbl)
        lw = c.stringWidth(lbl, FN, 8)
        vx = at + lw + 1*mm
        c.line(vx, by - 0.5*mm, vx + fw, by - 0.5*mm)
        c.drawString(vx + 0.5*mm, by, str(val or ''))
        return at + lw + fw + 3*mm

    nric = p.get('nric','') or p.get('ic','') or p.get('passport','')
    sex  = p.get('sex','') or 'M / F'
    nx = fld('Name :', p.get('name',''), ML + 2*mm, 52*mm)
    nx = fld('Age:', p.get('age',''), nx, 10*mm)
    c.drawString(nx, by, 'Sex: ' + sex); nx += 16*mm
    nx = fld('RN /IC :', nric, nx, 34*mm)
    fld('Date :', p.get('date',''), nx, 24*mm)
    return ty - bh

def _box(c, x, y, w, h, label=None, content=None, fs=8):
    c.setStrokeColor(BLACK); c.setLineWidth(0.5)
    c.rect(x, y, w, h)
    cy = y + h - 4*mm
    if label:
        c.setFont(FB, fs); c.setFillColor(BLACK)
        c.drawString(x + 2*mm, cy, label); cy -= 4.5*mm
    if content:
        c.setFont(FN, fs)
        for line in wrap_text(content, w - 4*mm, fs):
            if cy < y + 1.5*mm: break
            c.drawString(x + 2*mm, cy, line)
            cy -= fs * 0.38*mm + 0.8*mm

# ═══════════════════════════════════════════════════
# PAGE 1
# ═══════════════════════════════════════════════════

def _page1(c, d):
    patient = d.get('patient', {})
    pain    = d.get('pain', {})
    sq      = d.get('specialQuestions', {})
    hx      = d.get('history', {})
    obs     = d.get('observation', {})
    bc      = d.get('bodyChart', {})
    markers = bc.get('markers', [])

    _ref(c)
    ty = _title(c)
    ty = _patient_bar(c, patient, ty)

    lx = ML
    rx = ML + LW
    cl = ty
    cr = ty

    def lsec(h, label=None, content=None, fn=None):
        nonlocal cl
        if fn:
            c.setLineWidth(0.5); c.rect(lx, cl-h, LW, h)
            fn(lx, cl-h, LW, h)
        else:
            _box(c, lx, cl-h, LW, h, label, content)
        cl -= h

    def rsec(h, label=None, content=None, fn=None):
        nonlocal cr
        if fn:
            c.setLineWidth(0.5); c.rect(rx, cr-h, RW, h)
            fn(rx, cr-h, RW, h)
        else:
            _box(c, rx, cr-h, RW, h, label, content)
        cr -= h

    # ── LEFT ─────────────────────────────────────────
    lsec(18*mm, 'DIAGNOSIS', d.get('diagnosis',''))

    mgmt = d.get('management', {})
    mt   = mgmt.get('type','')
    if mgmt.get('surgeryDate'): mt += f"  Surgery: {mgmt['surgeryDate']}"
    lsec(12*mm, "DOCTOR'S MANAGEMENT", mt)
    lsec(16*mm, 'PROBLEM', d.get('problem',''))

    # Pain score block — matches actual KKM layout exactly
    def draw_pain(bx, by, bw, bh):
        c.setFont(FB, 8); c.setFillColor(BLACK)
        c.drawString(bx+2*mm, by+bh-5*mm, 'PAIN SCORE :')
        ps_x = bx + 30*mm
        # PRE box
        c.setFont(FN, 8)
        c.drawString(ps_x, by+bh-5*mm, 'PRE')
        c.rect(ps_x+9*mm, by+bh-7*mm, 22*mm, 5.5*mm)
        c.setFont(FB, 9)
        c.drawString(ps_x+11*mm, by+bh-5.5*mm, str(pain.get('pre','')))
        # POST box
        c.setFont(FN, 8)
        c.drawString(ps_x, by+bh-13*mm, 'POST')
        c.rect(ps_x+11*mm, by+bh-15*mm, 22*mm, 5.5*mm)
        c.setFont(FB, 9)
        c.drawString(ps_x+13*mm, by+bh-13.5*mm, str(pain.get('post','')))
        c.setFont(FN, 8)
        fy = by+bh-20*mm
        rows = [
            f"Area : {pain.get('area','')}",
            f"Nature : {pain.get('nature','')}",
            f"Agg : {pain.get('agg','')}",
            f"Ease : {pain.get('ease','')}",
            f"24 Hrs: {pain.get('behaviour24','')}",
            f"Irritability: {pain.get('irritability','High / Medium / Low')}",
        ]
        for row in rows:
            if fy < by+1.5*mm: break
            c.drawString(bx+2*mm, fy, row); fy -= 4.2*mm

    lsec(46*mm, fn=draw_pain)

    # Special Questions — spine-specific fields
    def draw_sq(bx, by, bw, bh):
        c.setFont(FB, 8)
        c.drawString(bx+2*mm, by+bh-5*mm, 'SPECIAL QUESTIONS')
        c.setFont(FN, 8)
        cy = by+bh-10*mm
        rows = [
            f"General Health : {sq.get('health','')}",
            f"PMHx / Surgery : {sq.get('pmhx','')}" + (f"  {sq.get('surgery','')}" if sq.get('surgery') else ''),
            f"Investigation : {sq.get('investigation','')}",
            f"Medication : {sq.get('medication','')}",
            f"C.E : {sq.get('ce','')}",
            f"Bed / Pillow : {sq.get('bedPillow','')}",
            f"Occupation / Recreation : {sq.get('occupation','')}" + (f"  {sq.get('recreation','')}" if sq.get('recreation') else ''),
            f"Social Histrory: {sq.get('social','')}",
            '',
            f"Hearing aid / Pacemaker:  Y / N   [{sq.get('pacemaker','No')}]",
        ]
        for row in rows:
            if cy < by+1.5*mm: break
            for line in wrap_text(row, bw-4*mm, 8):
                if cy < by+1.5*mm: break
                c.drawString(bx+2*mm, cy, line); cy -= 4.2*mm

    lsec(52*mm, fn=draw_sq)

    # ── RIGHT ─────────────────────────────────────────
    # Body chart — matches KKM layout with ant+post figures
    def draw_bc(bx, by, bw, bh):
        sc      = 0.165
        ant_cx  = bx + bw * 0.27
        post_cx = bx + bw * 0.73
        fig_top = by + bh - 4*mm
        draw_figure(c, ant_cx,  fig_top, s=sc)
        draw_markers(c, ant_cx,  fig_top, markers, 'ant',  s=sc)
        draw_figure(c, post_cx, fig_top, s=sc)
        draw_markers(c, post_cx, fig_top, markers, 'post', s=sc)
        label_y = by + 2*mm
        c.setFont(FN, 6.5); c.setFillColor(BLACK)
        c.drawString(bx+2*mm,         label_y, 'Right')
        c.drawCentredString(ant_cx,   label_y, 'Left')
        c.drawCentredString(post_cx,  label_y, 'Left')
        c.drawRightString(bx+bw-2*mm, label_y, 'Right')

    rsec(68*mm, fn=draw_bc)

    rsec(22*mm, 'CURRENT HISTORY', hx.get('current',''))
    rsec(18*mm, 'PAST HISTORY',    hx.get('past',''))

    obs_txt = ''
    if obs.get('general'): obs_txt += f"General: {obs['general']}\n"
    if obs.get('local'):   obs_txt += f"Local: {obs['local']}"
    rsec(18*mm, 'OBSERVATION', obs_txt)

    # Close column borders
    bottom = min(cl, cr)
    c.setLineWidth(0.5)
    c.line(ML,      ty, ML,      bottom)
    c.line(ML+LW,   ty, ML+LW,   bottom)
    c.line(ML+CW,   ty, ML+CW,   bottom)
    c.line(ML, bottom, ML+CW, bottom)

# ═══════════════════════════════════════════════════
# PAGE 2
# ═══════════════════════════════════════════════════

def _page2(c, d):
    patient   = d.get('patient', {})
    plan      = d.get('plan', {})
    movement  = d.get('movement', {})
    spine_mov = d.get('spineMovement', [])
    neuro     = d.get('neurological', {})
    palp      = d.get('palpation', {})
    accessory = d.get('accessory', {})
    neurodynamic = d.get('neurodynamic', {})

    _ref(c)
    c.setFont(FN, 7)
    c.drawRightString(W-MR, H-MT,
        f"{REF}  |  {patient.get('name','')}  |  {patient.get('date','')}")
    ty = H - MT - 6*mm

    # ── LEFT COLUMN: movement tables ──────────────────
    lx = ML
    rx = ML + LW
    cl = ty
    cr = ty

    def lsec(h, label=None, content=None, fn=None):
        nonlocal cl
        if fn:
            c.setLineWidth(0.5); c.rect(lx, cl-h, LW, h)
            fn(lx, cl-h, LW, h)
        else:
            _box(c, lx, cl-h, LW, h, label, content)
        cl -= h

    def rsec(h, label=None, content=None, fn=None):
        nonlocal cr
        if fn:
            c.setLineWidth(0.5); c.rect(rx, cr-h, RW, h)
            fn(rx, cr-h, RW, h)
        else:
            _box(c, rx, cr-h, RW, h, label, content)
        cr -= h

    # Spine Movement Table
    def draw_spine_mov(bx, by, bw, bh):
        c.setFont(FB, 8)
        c.drawString(bx+2*mm, by+bh-5*mm, 'SPINE MOVEMENT')
        hdr  = ['Movement', 'Active', 'Passive', 'Overpressure']
        rows = [[m.get('movement',''), m.get('activeRom',''), m.get('passiveRom',''), m.get('overpress','')]
                for m in spine_mov] if spine_mov else [['','','','']] * 6
        tdata = [hdr] + rows
        cws   = [bw*0.34, bw*0.22, bw*0.22, bw*0.22]
        tbl   = Table(tdata, colWidths=cws)
        tbl.setStyle(TableStyle([
            ('BACKGROUND',    (0,0),(-1,0),  LGREY),
            ('FONTNAME',      (0,0),(-1,0),  FB),
            ('FONTSIZE',      (0,0),(-1,-1), 7.5),
            ('FONTNAME',      (0,1),(-1,-1), FN),
            ('ALIGN',         (1,0),(-1,-1), 'CENTER'),
            ('VALIGN',        (0,0),(-1,-1), 'MIDDLE'),
            ('GRID',          (0,0),(-1,-1), 0.4, BLACK),
            ('TOPPADDING',    (0,0),(-1,-1), 2),
            ('BOTTOMPADDING', (0,0),(-1,-1), 2),
            ('LEFTPADDING',   (0,0),(-1,-1), 2),
            ('MINROWHEIGHT',  (0,1),(-1,-1), 7*mm),
        ]))
        tw, th = tbl.wrapOn(c, bw-4*mm, bh-10*mm)
        tbl.drawOn(c, bx+2*mm, by+bh-10*mm-th)

    lsec(64*mm, fn=draw_spine_mov)

    # ACCESSORY (PAIVM/PPIVM)
    acc_notes = accessory.get('notes','') if accessory else ''
    # Also summarise any filled PAIVM levels
    paivm_lines = []
    for region, levels in [('Cervical', accessory.get('cervical',{})),
                            ('Thoracic', accessory.get('thoracic',{})),
                            ('Lumbar',   accessory.get('lumbar',{}))]:
        if not levels: continue
        for lv, vals in levels.items():
            parts = []
            if vals.get('central'):    parts.append(f"C:{vals['central']}")
            if vals.get('unilateral'): parts.append(f"U:{vals['unilateral']}")
            if vals.get('pain'):       parts.append(f"P:{vals['pain']}")
            if parts:
                paivm_lines.append(f"{region} {lv}: {' '.join(parts)}")
    acc_content = '\n'.join(paivm_lines)
    if acc_notes: acc_content = acc_notes + ('\n' + acc_content if acc_content else '')
    lsec(32*mm, 'ACCESSORRY (PAIVM / PPIVM)', acc_content)

    # Palpation
    palp_txt = ''
    if palp.get('tenderness'):  palp_txt += f"Tenderness: {palp['tenderness']}\n"
    if palp.get('temperature'): palp_txt += f"Temperature: {palp['temperature']}\n"
    if palp.get('muscle'):      palp_txt += f"Muscle/ST: {palp['muscle']}\n"
    if palp.get('joint'):       palp_txt += f"Joint: {palp['joint']}"
    lsec(24*mm, 'PALPATION', palp_txt)

    # Neurodynamic Test table
    def draw_nd(bx, by, bw, bh):
        c.setFont(FB, 8)
        c.drawString(bx+2*mm, by+bh-5*mm, 'NEURODYNAMIC TEST')
        nd_tests = neurodynamic.get('tests', {}) if neurodynamic else {}
        hdr   = ['', 'Neck\nLeft', 'Neck\nRight', 'Back\nLeft', 'Back\nRight']
        rows  = []
        for tid, tlbl in NEURO_TESTS:
            td = nd_tests.get(tid, {})
            rows.append([tlbl,
                         td.get('leftNeck',''),
                         td.get('rightNeck',''),
                         td.get('leftBack',''),
                         td.get('rightBack','')])
        tdata = [hdr] + rows
        cws   = [bw*0.28, bw*0.18, bw*0.18, bw*0.18, bw*0.18]
        tbl   = Table(tdata, colWidths=cws)
        tbl.setStyle(TableStyle([
            ('BACKGROUND',    (0,0),(-1,0),  LGREY),
            ('FONTNAME',      (0,0),(-1,0),  FB),
            ('FONTSIZE',      (0,0),(-1,-1), 7),
            ('FONTNAME',      (0,1),(-1,-1), FN),
            ('ALIGN',         (1,0),(-1,-1), 'CENTER'),
            ('VALIGN',        (0,0),(-1,-1), 'MIDDLE'),
            ('GRID',          (0,0),(-1,-1), 0.4, BLACK),
            ('TOPPADDING',    (0,0),(-1,-1), 1),
            ('BOTTOMPADDING', (0,0),(-1,-1), 1),
            ('LEFTPADDING',   (0,0),(-1,-1), 2),
            ('MINROWHEIGHT',  (0,1),(-1,-1), 5.5*mm),
        ]))
        tw, th = tbl.wrapOn(c, bw-4*mm, bh-10*mm)
        tbl.drawOn(c, bx+2*mm, by+bh-10*mm-th)
        if neurodynamic and neurodynamic.get('notes'):
            c.setFont(FN, 7.5)
            c.drawString(bx+2*mm, by+2*mm, f"Notes: {neurodynamic['notes'][:60]}")

    lsec(54*mm, fn=draw_nd)

    # Neurological Test
    def draw_neuro(bx, by, bw, bh):
        c.setFont(FB, 8)
        c.drawString(bx+2*mm, by+bh-5*mm, 'NEUROLOGICAL TEST')
        c.setFont(FN, 8)
        cy = by+bh-10*mm
        s  = neuro.get('sensation',{}) if neuro else {}
        mo = neuro.get('motor',{})     if neuro else {}
        r  = neuro.get('reflex',{})    if neuro else {}
        rows = [
            ('Sensation:', f"L: {s.get('left','')}  R: {s.get('right','')}  {s.get('notes','')}"),
            ('Motor:',     f"L: {mo.get('left','')}  R: {mo.get('right','')}  {mo.get('notes','')}"),
            ('Reflexes:',  f"L: {r.get('left','')}  R: {r.get('right','')}  {r.get('notes','')}"),
        ]
        for lbl, val in rows:
            c.setFont(FB, 8); c.drawString(bx+2*mm, cy, lbl)
            lw = c.stringWidth(lbl, FB, 8)
            c.setFont(FN, 8); c.drawString(bx+2*mm+lw+1*mm, cy, val[:50])
            cy -= 5*mm

    lsec(22*mm, fn=draw_neuro)

    # ── RIGHT COLUMN: plan + clearing ─────────────────
    rsec(32*mm, "PHYSIOTHERAPIST'S IMPRESSION", plan.get('impression',''))
    rsec(28*mm, 'SHORT TERM GOALS',             plan.get('stg',''))
    rsec(28*mm, 'LONG TERM GOALS',              plan.get('ltg',''))
    rsec(32*mm, 'PLAN OF TREATMENT',            plan.get('treatment',''))
    rsec(24*mm, 'CLEARING TESTS / OTHER JOINTS',movement.get('clearing',''))

    # Equalise columns
    bottom = min(cl, cr)
    c.setLineWidth(0.5)
    c.line(ML,    ty, ML,    bottom)
    c.line(ML+LW, ty, ML+LW, bottom)
    c.line(ML+CW, ty, ML+CW, bottom)
    c.line(ML, bottom, ML+CW, bottom)

    # Sign block
    ty = bottom - 2*mm
    sh = 16*mm
    c.setLineWidth(0.5); c.rect(ML, ty-sh, CW, sh)
    c.setFont(FN, 8)
    c.drawString(ML+2*mm, ty-sh+9*mm,
                 'Attending Physiotherapist :…………………………………..…')
    c.drawRightString(ML+CW-2*mm, ty-sh+9*mm, 'Date:                Sign & Stamp :')

# ═══════════════════════════════════════════════════
# Public API
# ═══════════════════════════════════════════════════

def generate_spine_pdf(data):
    buf = io.BytesIO()
    c   = rl_canvas.Canvas(buf, pagesize=A4)
    _page1(c, data); c.showPage()
    _page2(c, data); c.save()
    return buf.getvalue()


def generate_episode_pdf(assessment_data, soap_notes, episode_info=None):
    buf     = io.BytesIO()
    c       = rl_canvas.Canvas(buf, pagesize=A4)
    patient = (assessment_data or {}).get('patient', {})

    if assessment_data:
        _page1(c, assessment_data); c.showPage()
        _page2(c, assessment_data); c.showPage()
    else:
        _ref(c); _title(c)
        c.setFont(FN, 12); c.setFillColor(colors.HexColor('#aaaaaa'))
        c.drawCentredString(W/2, H/2, 'No initial assessment recorded for this episode.')
        c.showPage()

    for soap in (soap_notes or []):
        draw_soap_page(c, patient, soap, episode_info)
        c.showPage()

    c.save()
    return buf.getvalue()
