# pdf_geriatric.py — KKM Geriatric Assessment Form PDF
# Standalone bespoke generator. fisio / b.pen. 15 / 2019
# Pure Python, PyInstaller-friendly.

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import Table, TableStyle
from reportlab.pdfgen import canvas as rl_canvas
from pdf_base import draw_figure, draw_markers, draw_soap_page, wrap_text, MARKER_COLORS
import io

W, H   = A4
ML     = 12 * mm
MR     = 12 * mm
MT     = 10 * mm
CW     = W - ML - MR
LW     = CW * 0.50
RW     = CW * 0.50
BLACK  = colors.black
WHITE  = colors.white
LGREY  = colors.HexColor('#f0f0f0')
DGREY  = colors.HexColor('#555555')
FB, FN = 'Helvetica-Bold', 'Helvetica'
REF    = 'fisio / b.pen. 15 / 2019'
TITLE  = ['KEMENTERIAN KESIHATAN MALAYSIA',
          'PHYSIOTHERAPY DEPARTMENT',
          'GERIATRIC  ASSESSMENT FORM']

# ── Helpers ───────────────────────────────────────────

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
    c.setLineWidth(0.5); c.rect(ML, ty-bh, CW, bh)
    by = ty - bh + 2.2*mm
    c.setFont(FN, 8)

    def fld(lbl, val, at, fw=30*mm):
        c.drawString(at, by, lbl)
        lw = c.stringWidth(lbl, FN, 8)
        vx = at + lw + 1*mm
        c.line(vx, by-0.5*mm, vx+fw, by-0.5*mm)
        c.drawString(vx+0.5*mm, by, str(val or ''))
        return at + lw + fw + 3*mm

    nric = p.get('nric','') or p.get('ic','') or p.get('passport','')
    sex  = p.get('sex','') or 'M / F'
    nx = fld('Name :', p.get('name',''), ML+2*mm, 46*mm)
    nx = fld('Age:', p.get('age',''), nx, 10*mm)
    c.drawString(nx, by, 'Sex: M / F  [' + sex + ']'); nx += 28*mm
    nx = fld('RN :', nric, nx, 30*mm)
    fld('Date :', p.get('date',''), nx, 22*mm)
    return ty - bh

def _box(c, x, y, w, h, label=None, content=None, fs=8):
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
            c.drawString(x+2*mm, cy, line)
            cy -= fs*0.38*mm + 0.8*mm

def _tick(val, options):
    """Return 'option [x]' style string for the filled option."""
    parts = []
    for opt in options:
        mark = 'x' if str(val or '').strip().lower() == opt.lower() else ' '
        parts.append(f'[{mark}] {opt}')
    return '  '.join(parts)

def _cb(checked):
    return '[x]' if checked else '[ ]'

# ═══════════════════════════════════════════════════
# PAGE 1
# ═══════════════════════════════════════════════════

def _page1(c, d):
    patient = d.get('patient', {})
    bc      = d.get('body_chart') or {}
    markers = bc.get('markers', [])

    _ref(c)
    ty = _title(c)
    ty = _patient_bar(c, patient, ty)

    lx = ML; rx = ML + LW
    cl = ty;  cr = ty

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
    _box(c, lx, cl-16*mm, LW, 16*mm, "DOCTOR'S DIAGNOSIS", d.get('dx_diagnosis',''))
    cl -= 16*mm

    # Management
    mgmt_val = d.get('dx_mgmt_type','')
    mgmt_txt = _tick(mgmt_val, ['Conservative','Surgical'])
    if mgmt_val == 'Surgical':
        if d.get('dx_surgery_no_info'):
            mgmt_txt += '\nNo information disclosed'
        else:
            if d.get('dx_surgery_date'):    mgmt_txt += f"  Date: {d['dx_surgery_date']}"
            if d.get('dx_surgery_details'): mgmt_txt += f"\n{d['dx_surgery_details']}"
    lsec(14*mm, "DOCTOR'S MANAGEMENT :", mgmt_txt)
    lsec(16*mm, 'CURRENT COMPLAINT / PROBLEM :', d.get('complaint',''))

    # Subjective Assessment block
    def draw_subj(bx, by, bw, bh):
        c.setFont(FB, 8)
        c.drawString(bx+2*mm, by+bh-5*mm, 'SUBJECTIVE ASSESSMENT :')
        c.setFont(FN, 7.5)
        cy = by+bh-10*mm

        # Medical history checkboxes — compact inline format
        med_map = [
            ('med_hpt','HPT'),('med_dm','DM'),('med_ccf','CCF'),
            ('med_ihd','IHD'),('med_pvd','PVD'),('med_copd','COPD'),
            ('med_dementia','DEMENTIA'),('med_pd','PD'),
            ('med_cva_rt','OLD CVA (RT)'),('med_cva_lt','OLD CVA (LT)'),
            ('med_oa','OA'),('med_fracture','FRACTURE'),
        ]
        med_line = 'Medical history :  ' + '  '.join(
            f"{'[x]' if d.get(k) else '[ ]'} {lbl}" for k,lbl in med_map
        )
        for line in wrap_text(med_line, bw-4*mm, 7.5):
            if cy < by+1.5*mm: break
            c.drawString(bx+2*mm, cy, line); cy -= 3.8*mm

        # Social history
        soc = d.get('social_hx','')
        c.drawString(bx+2*mm, cy, f"SOCIAL HISTORY : {soc[:60]}"); cy -= 3.8*mm

        # Previous Surgery
        surg = _tick(d.get('prev_surgery',''), ['YES','NO'])
        area = d.get('surgery_area','')
        c.drawString(bx+2*mm, cy, f"Previous Surgery : {surg}  : Area {area}"); cy -= 3.8*mm

        # IX
        ix = d.get('investigations','')
        c.drawString(bx+2*mm, cy, f"IX / MRI / X-RAY / CT BRAIN / BMD / BIA :"); cy -= 3.8*mm
        if ix:
            for line in wrap_text(ix, bw-6*mm, 7.5):
                if cy < by+1.5*mm: break
                c.drawString(bx+4*mm, cy, line); cy -= 3.8*mm

        # Medication
        med = d.get('medication','')
        c.drawString(bx+2*mm, cy, f"Medication : {med[:55]}"); cy -= 3.8*mm

        # Main carer
        carer = d.get('main_carer','')
        carer_other = d.get('carer_other','')
        if carer == 'Other' and carer_other: carer = carer_other
        c.drawString(bx+2*mm, cy,
            f"Main Carer : Husband / Wife / Son / Daughter / Sibling / Other :  {carer}"); cy -= 3.8*mm

        # Premorbid / Current Mobility
        c.drawString(bx+2*mm, cy,
            'Premorbid Mobility : ' + _tick(d.get('premorbid_mobility',''),
            ['Independent','Semi Independent','Dependent'])); cy -= 3.8*mm
        c.drawString(bx+2*mm, cy,
            'Current Mobility : ' + _tick(d.get('current_mobility',''),
            ['Independent','Semi Independent','Dependent'])); cy -= 3.8*mm

        # Home Environment
        home = []
        if d.get('home_lift'):   home.append('[x] Lift')
        if d.get('home_stairs'): home.append('[x] Stairs')
        if d.get('home_kerbs'):  home.append('[x] Kerbs')
        if d.get('home_ground'): home.append('[x] Ground Level')
        if not home: home = ['[ ] Lift','[ ] Stairs','[ ] Kerbs','[ ] Ground Level']
        c.drawString(bx+2*mm, cy, 'Home Environment  ' + '  '.join(home)); cy -= 3.8*mm

        # Toilet
        tlt = []
        if d.get('toilet_sitting'):   tlt.append('[x] Sitting')
        if d.get('toilet_squatting'): tlt.append('[x] Squatting')
        if d.get('toilet_commode'):   tlt.append('[x] Commode')
        if not tlt: tlt = ['[ ] Sitting','[ ] Squatting','[ ] Commode']
        c.drawString(bx+2*mm, cy, 'Toilet :  ' + '  '.join(tlt)); cy -= 3.8*mm

        # Walking aids
        aids = []
        if d.get('aid_frame'):      aids.append('[x] Walking Frame')
        if d.get('aid_quadripod'):  aids.append('[x] Quadripod')
        if d.get('aid_stick'):      aids.append('[x] Stick')
        if d.get('aid_wheelchair'): aids.append('[x] Wheelchair')
        if d.get('aid_none'):       aids.append('[x] None')
        if not aids: aids = ['[ ] Walking Frame','[ ] Quadripod','[ ] Stick']
        aid_str = '  '.join(aids)
        if d.get('aid_others'): aid_str += f"  Others: {d['aid_others']}"
        c.drawString(bx+2*mm, cy, 'Walking Aids :  ' + aid_str); cy -= 3.8*mm

        # Incontinence
        bl = _tick(d.get('incon_bladder',''), ['YES','NO'])
        bw2 = _tick(d.get('incon_bowel',''), ['YES','NO'])
        c.drawString(bx+2*mm, cy, f"Incontinence :  Bladder: {bl}    Bowel: {bw2}"); cy -= 3.8*mm
        types = []
        if d.get('incon_stress'): types.append('[x] Stress')
        if d.get('incon_urge'):   types.append('[x] Urge')
        if d.get('incon_mixed'):  types.append('[x] Mixed')
        if types: c.drawString(bx+6*mm, cy, '  '.join(types)); cy -= 3.8*mm

        # Diaper
        diaper = _tick(d.get('diaper',''), ['YES','NO'])
        day_str = ''
        if d.get('diaper_day') and d.get('diaper_night'): day_str = 'Day & Night'
        elif d.get('diaper_day'):   day_str = 'Day'
        elif d.get('diaper_night'): day_str = 'Night'
        c.drawString(bx+2*mm, cy,
            f"Wear Diapers : {diaper}" + (f"  Day : {'[x]' if d.get('diaper_day') else '[ ]'}  Night : {'[x]' if d.get('diaper_night') else '[ ]'}" if d.get('diaper') == 'Yes' else '')); cy -= 3.8*mm

        # Dominant hand / cognitive / communication / sensory
        c.drawString(bx+2*mm, cy,
            f"Dominant Hand : {_tick(d.get('dominant_hand',''), ['Right','Left'])}"); cy -= 3.8*mm
        cog = _tick(d.get('cognitive',''), ['YES','NO'])
        cog_test = d.get('cognitive_test','')
        c.drawString(bx+2*mm, cy,
            f"Cognitive Impairment : {cog}  MMSE / Mini COG Test : {cog_test}"); cy -= 3.8*mm
        c.drawString(bx+2*mm, cy,
            'Communication Impairment : ' + _tick(d.get('communication',''), ['Expressive','Receptive','None'])); cy -= 3.8*mm
        vis = _cb(d.get('deficit_visual'))
        hrg = _cb(d.get('deficit_hearing'))
        c.drawString(bx+2*mm, cy,
            f"Visual Field Deficit : YES / NO  {vis}    Hearing Deficit : YES / NO  {hrg}"); cy -= 3.8*mm
        dev = []
        if d.get('device_pacemaker'):   dev.append('Pacemaker')
        if d.get('device_hearing_aid'): dev.append('Hearing aids')
        if d.get('device_spectacles'):  dev.append('Spectacles')
        if d.get('device_dentures'):    dev.append('Dentures')
        c.drawString(bx+2*mm, cy,
            'Other assistive Device : ' + (', '.join(dev) if dev else 'Pacemaker / Hearing aids / spectacles / dentures'))

    lsec(114*mm, fn=draw_subj)

    # ── RIGHT ─────────────────────────────────────────
    # Fall History
    def draw_falls(bx, by, bw, bh):
        c.setFont(FB, 8)
        c.drawString(bx+2*mm, by+bh-5*mm, 'Fall History :')
        c.setFont(FN, 8)
        fall_hx = d.get('fall_hx','')
        c.drawString(bx+2*mm, by+bh-10*mm,
            'H/O Fall in past 1 year :  ' + _tick(fall_hx, ['YES','NO']))
        # Consequence
        cons = []
        if d.get('fall_fracture'):     cons.append('[x] Fracture')
        if d.get('fall_hospitalised'): cons.append('[x] Hospitalised')
        if d.get('fall_fear'):         cons.append('[x] Fear of Falling')
        if d.get('fall_injury'):       cons.append('[x] Soft Tissue Injury')
        if d.get('fall_none'):         cons.append('[x] No Injury')
        if d.get('fall_consequence_other'): cons.append(d['fall_consequence_other'])
        c.setFont(FN, 7.5)
        cy = by+bh-15*mm
        for line in wrap_text('Consequence of fall : ' + ('  '.join(cons) if cons else ''), bw-4*mm, 7.5):
            if cy < by+1.5*mm: break
            c.drawString(bx+2*mm, cy, line); cy -= 3.8*mm

    rsec(24*mm, fn=draw_falls)
    rsec(28*mm, 'CURRENT HISTORY', d.get('hx_current',''))
    rsec(22*mm, 'PAST HISTORY',    d.get('hx_past',''))

    # Body Chart
    def draw_bc(bx, by, bw, bh):
        c.setFont(FB, 8); c.setFillColor(BLACK)
        c.drawString(bx+2*mm, by+bh-5*mm, 'BODY CHART')
        sc      = 0.155
        ant_cx  = bx + bw*0.27
        post_cx = bx + bw*0.73
        fig_top = by + bh - 9*mm
        draw_figure(c, ant_cx,  fig_top, s=sc)
        draw_markers(c, ant_cx,  fig_top, markers, 'ant',  s=sc)
        draw_figure(c, post_cx, fig_top, s=sc)
        draw_markers(c, post_cx, fig_top, markers, 'post', s=sc)
        label_y = by+2*mm
        c.setFont(FN, 6); c.setFillColor(BLACK)
        c.drawString(bx+2*mm,         label_y, 'Right')
        c.drawCentredString(ant_cx,   label_y, 'Left')
        c.drawCentredString(post_cx,  label_y, 'Left')
        c.drawRightString(bx+bw-2*mm, label_y, 'Right')

    rsec(64*mm, fn=draw_bc)

    # Pain section — right column bottom
    def draw_pain(bx, by, bw, bh):
        c.setFont(FN, 8); c.setFillColor(BLACK)
        presence = d.get('pain_present','')
        score    = d.get('pain_score','0') or '0'
        cy = by+bh-5*mm
        c.drawString(bx+2*mm, cy,
            f"Presence of pain : {_tick(presence, ['YES','NO'])}    Pain Score : {score}")
        cy -= 4.5*mm
        c.drawString(bx+2*mm, cy, f"Pain Site : {d.get('pain_site','')}")
        cy -= 4.5*mm
        c.drawString(bx+2*mm, cy,
            'Nature of pain : ' + _tick(d.get('pain_nature',''), ['constant','intermittent','episodic']))
        cy -= 4.5*mm
        c.drawString(bx+2*mm, cy,
            'Type of pain : ' + _tick(d.get('pain_type',''), ['sharp','dull','superficial','deep']))
        cy -= 4.5*mm
        c.drawString(bx+2*mm, cy,
            'Pain History : ' + _tick(d.get('pain_history',''), ['improve','unchanged','worsened']))

    rsec(30*mm, fn=draw_pain)

    # Close borders
    bottom = min(cl, cr)
    c.setLineWidth(0.5)
    c.line(ML,    ty, ML,    bottom)
    c.line(ML+LW, ty, ML+LW, bottom)
    c.line(ML+CW, ty, ML+CW, bottom)
    c.line(ML, bottom, ML+CW, bottom)

# ═══════════════════════════════════════════════════
# PAGE 2
# ═══════════════════════════════════════════════════

def _page2(c, d):
    patient = d.get('patient', {})

    _ref(c)
    c.setFont(FN, 7)
    c.drawRightString(W-MR, H-MT,
        f"{REF}  |  {patient.get('name','')}  |  {patient.get('date','')}")
    ty = H - MT - 6*mm

    # ── OBJECTIVE ASSESSMENT ──────────────────────────
    c.setFont(FB, 8)
    c.drawString(ML, ty, 'OBJECTIVE ASSESSMENT')
    ty -= 2*mm

    obj_h = 62*mm
    c.setLineWidth(0.5); c.rect(ML, ty-obj_h, CW, obj_h)
    mid_x = ML + LW
    c.line(mid_x, ty, mid_x, ty-obj_h)

    # Left: Posture + Functional Mobility grid
    lx2 = ML + 2*mm
    oy  = ty - 4*mm
    c.setFont(FN, 8); c.setFillColor(BLACK)
    c.drawString(lx2, oy, f"Posture : {d.get('obj_posture','')[:50]}"); oy -= 4*mm
    c.drawString(lx2, oy, 'Gait:'); oy -= 5*mm
    c.setFont(FB, 8)
    c.drawString(lx2, oy, 'Functional Mobility :'); oy -= 5*mm

    mob_data = [
        ['', 'Ind', 'Sup', 'Min A', 'Mod A', 'Max A'],
        ['Bed Mobility  :',
         _cb(d.get('mob_bed')=='Ind'), _cb(d.get('mob_bed')=='Sup'),
         _cb(d.get('mob_bed')=='Min A'), _cb(d.get('mob_bed')=='Mod A'),
         _cb(d.get('mob_bed')=='Max A')],
        ['Sitting \u21d4 Standing :',
         _cb(d.get('mob_sitting')=='Ind' or d.get('mob_standing')=='Ind'),
         _cb(d.get('mob_sitting')=='Sup' or d.get('mob_standing')=='Sup'),
         _cb(d.get('mob_sitting')=='Min A' or d.get('mob_standing')=='Min A'),
         _cb(d.get('mob_sitting')=='Mod A' or d.get('mob_standing')=='Mod A'),
         _cb(d.get('mob_sitting')=='Max A' or d.get('mob_standing')=='Max A')],
        ['Transfer (Bed \u21d4 W/C) :',
         _cb(d.get('mob_transfer')=='Ind'), _cb(d.get('mob_transfer')=='Sup'),
         _cb(d.get('mob_transfer')=='Min A'), _cb(d.get('mob_transfer')=='Mod A'),
         _cb(d.get('mob_transfer')=='Max A')],
    ]
    mob_cw = [LW*0.38, LW*0.12, LW*0.12, LW*0.12, LW*0.12, LW*0.12]
    mob_tbl = Table(mob_data, colWidths=mob_cw)
    mob_tbl.setStyle(TableStyle([
        ('BACKGROUND',    (0,0),(-1,0),  LGREY),
        ('FONTNAME',      (0,0),(-1,0),  FB),
        ('FONTNAME',      (0,1),(-1,-1), FN),
        ('FONTSIZE',      (0,0),(-1,-1), 7),
        ('ALIGN',         (1,0),(-1,-1), 'CENTER'),
        ('VALIGN',        (0,0),(-1,-1), 'MIDDLE'),
        ('GRID',          (0,0),(-1,-1), 0.4, BLACK),
        ('TOPPADDING',    (0,0),(-1,-1), 2),
        ('BOTTOMPADDING', (0,0),(-1,-1), 2),
        ('LEFTPADDING',   (0,0),(-1,-1), 2),
    ]))
    tw, th = mob_tbl.wrapOn(c, LW-4*mm, 30*mm)
    mob_tbl.drawOn(c, lx2, oy-th)

    # Right: Lungs / Strength / ROM / Reflex
    rx2 = mid_x + 2*mm
    ry  = ty - 4*mm
    c.setFont(FN, 8)
    c.drawString(rx2, ry, f"Lungs : {d.get('obj_lungs','')[:45]}"); ry -= 4*mm
    c.setFont(FB, 8)
    c.drawString(rx2, ry, 'General Muscle Strength :  Upper Limb :'); ry -= 4*mm
    c.setFont(FN, 8)
    for line in wrap_text(d.get('obj_strength',''), RW-6*mm, 8):
        c.drawString(rx2+2*mm, ry, line); ry -= 3.8*mm
    ry -= 1*mm
    c.drawString(rx2, ry, 'Lower Limb :'); ry -= 5*mm
    rom_val  = d.get('rom_contracture','')
    rom_note = d.get('rom_notes','')
    c.drawString(rx2, ry,
        f"ROM : Any contractures (Yes/No) : Area : {rom_note}"); ry -= 4*mm
    reflex = d.get('reflex_sensation','')
    c.drawString(rx2, ry,
        f"Reflex :  {_cb(reflex=='Intact')} Intact    {_cb(reflex=='Impaired')} Absent"); ry -= 4*mm
    ref_note = d.get('reflex_notes','')
    c.drawString(rx2, ry,
        f"Sensation: Intact (Yes / No)  :  {ref_note[:28]}"); ry -= 4*mm
    c.drawString(rx2, ry,
        'Proprioception: Intact (Yes / No)  : ........................')

    ty -= obj_h + 2*mm

    # ── OUTCOME MEASURE table ─────────────────────────
    c.setFont(FB, 8)
    c.drawCentredString(W/2, ty, 'OUTCOME MEASURE')
    ty -= 4*mm

    def fv(key, na_key=None):
        if na_key and d.get(na_key): return 'N/A'
        return str(d.get(key,'') or '')

    def frl(rk, lk, na_key=None):
        if na_key and d.get(na_key): return 'N/A'
        r = d.get(rk,'') or ''; l = d.get(lk,'') or ''
        return f"R: {r}  L: {l}" if (r or l) else ''

    berg  = fv('om_berg','om_na_berg')
    tug   = fv('om_tug','om_na_tug')
    sls   = fv('om_sls','om_na_sls')
    grip  = frl('om_grip_r','om_grip_l','om_na_grip')
    ftsst = fv('om_ftsst','om_na_ftsst')
    ems   = fv('om_ems','om_na_ems')
    poma  = fv('om_poma','om_na_poma')
    walk  = fv('om_walk','om_na_walk')
    gsec  = fv('om_gait_sec','om_na_gait')
    gstep = fv('om_gait_steps','om_na_gait')
    reach = frl('om_reach_r','om_reach_l','om_na_reach')

    gait_cell  = f"No. of step : {gstep}\nTime of Speed : {gsec} sec" if (gsec or gstep) else 'N/A' if d.get('om_na_gait') else 'No. of step :\nTime of Speed :'
    berg_cell  = f"{berg} /56" if berg and berg != 'N/A' else (berg or '/56')
    tug_cell   = f"{tug} sec"  if tug  and tug  != 'N/A' else (tug  or 'sec')
    sls_cell   = f"{sls} sec"  if sls  and sls  != 'N/A' else (sls  or 'sec')
    ftsst_cell = f"{ftsst} sec" if ftsst and ftsst != 'N/A' else (ftsst or 'sec')
    ems_cell   = f"{ems} /20"  if ems  and ems  != 'N/A' else (ems  or '/20')
    walk_cell  = f"{walk} m"   if walk and walk != 'N/A' else (walk or 'meter')

    om_data = [
        ['', 'Test', 'Date', 'Date', 'Date', 'Remarks'],
        ['Balance',         "Berg's Balance Scale", berg_cell,  '/56',               '/56',               ''],
        ['',                'Timed Up and go Test', tug_cell,   'sec',               'sec',               ''],
        ['',                'Single Leg Stance',    sls_cell,   'sec',               'sec',               ''],
        ['Strength',        'Grip Strength (kg)',   grip or 'R :    L :', 'R :    L :', 'R :    L :', ''],
        ['',                'Chair rising (5x)',    ftsst_cell, 'sec',               'sec',               ''],
        ['Mobility &\nGait','Elderly Mobility Scale', ems_cell, '',                  '',                  ''],
        ['',                'Problem Orientated\nMobility Assessment', poma or '', '', '', ''],
        ['',                '3 / 6 Min Walk Test',  walk_cell,  'meter',             'meter',             ''],
        ['Physical\nPerformance','Gait Speed (10 meter\nwalk test)', gait_cell, 'No. of step :\nTime of Speed :', 'No. of step :\nTime of Speed :', ''],
        ['Flexibility',     'Chair Sit and Reach\n(cm)', reach or 'R :    L :', 'R :    L :', 'R :    L :', ''],
    ]

    cw_cat  = CW * 0.11
    cw_test = CW * 0.22
    cw_date = CW * 0.185
    cw_rem  = CW * 0.12
    om_cw   = [cw_cat, cw_test, cw_date, cw_date, cw_date, cw_rem]

    om_tbl = Table(om_data, colWidths=om_cw)
    om_tbl.setStyle(TableStyle([
        ('BACKGROUND',    (0,0), (-1,0),  LGREY),
        ('FONTNAME',      (0,0), (-1,0),  FB),
        ('FONTSIZE',      (0,0), (-1,-1), 7.5),
        ('FONTNAME',      (0,1), (-1,-1), FN),
        ('FONTNAME',      (0,1), (0,-1),  FB),
        ('ALIGN',         (0,0), (-1,0),  'CENTER'),
        ('ALIGN',         (2,1), (-1,-1), 'CENTER'),
        ('VALIGN',        (0,0), (-1,-1), 'MIDDLE'),
        ('GRID',          (0,0), (-1,-1), 0.4, BLACK),
        ('TOPPADDING',    (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
        ('LEFTPADDING',   (0,0), (-1,-1), 2),
        ('BACKGROUND',    (0,1), (0,-1),  LGREY),
        ('SPAN', (0,1), (0,3)),   # Balance
        ('SPAN', (0,4), (0,5)),   # Strength
        ('SPAN', (0,6), (0,8)),   # Mobility & Gait
        ('SPAN', (0,9), (0,9)),   # Physical Performance
        ('SPAN', (0,10),(0,10)),  # Flexibility
    ]))
    tw, th = om_tbl.wrapOn(c, CW, H)
    om_tbl.drawOn(c, ML, ty-th)
    ty -= th + 3*mm

    # ── PT Impression 2x2 grid ────────────────────────
    cell_h = 26*mm
    hw     = CW / 2
    cells  = [
        ('PHYSIOTHERAPY IMPRESSION', d.get('plan_impression','')),
        ('SHORT TERM GOALS',         d.get('plan_stg','')),
        ('LONG TERM GOALS',          d.get('plan_ltg','')),
        ('PLAN OF TREATMENT',        d.get('plan_tx','')),
    ]
    for i, (lbl, txt) in enumerate(cells):
        col = i % 2; row = i // 2
        _box(c, ML+col*hw, ty-(row+1)*cell_h, hw, cell_h, lbl, txt)
    ty -= 2 * cell_h + 3*mm

    # ── Consent footer ────────────────────────────────
    consent = d.get('consent_agree','')
    edu     = d.get('consent_edu','')
    c.setFont(FN, 8)
    c.drawString(ML, ty,
        f"Patient / carer agreeable to propose treatment:  {_tick(consent, ['Yes','No'])}")
    c.drawRightString(ML+CW, ty, 'Attending Physiotherapist:')
    ty -= 8*mm
    c.drawString(ML, ty, f"Patient Education Given : {_tick(edu, ['YES','NO'])}")

# ═══════════════════════════════════════════════════
# Public API
# ═══════════════════════════════════════════════════

def generate_geriatric_pdf(data):
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
