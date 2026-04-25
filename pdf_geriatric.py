# pdf_geriatric.py — KKM Geriatric Assessment Form PDF (Platypus layout engine)
# fisio / b.pen. 15 / 2019

from reportlab.platypus import Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
from reportlab.lib.units import mm
from reportlab.lib import colors
from pdf_platypus_base import (
    build_pdf, page_header, patient_bar, body_chart_section,
    box, two_col, plan_section, soap_page,
    data_table, gap, tick, cbtick,
    S_LABEL, S_NORMAL, S_SMALL, S_BOLD,
    CW, LW2, RW2, BLACK, LGREY
)

REF   = 'fisio / b.pen. 15 / 2019'
TITLE = ['KEMENTERIAN KESIHATAN MALAYSIA',
         'PHYSIOTHERAPY DEPARTMENT',
         'GERIATRIC  ASSESSMENT FORM']


def _build_story(d):
    story   = []
    patient = d.get('patient', {})
    bc      = d.get('body_chart') or {}

    # ── PAGE 1 ────────────────────────────────────────────────────
    story += page_header(TITLE, REF)
    story.append(patient_bar(patient, REF))
    story.append(gap(2))

    # Management
    mgmt_val = d.get('dx_mgmt_type','')
    mgmt_txt = mgmt_val
    if mgmt_val == 'Surgical':
        if d.get('dx_surgery_no_info'):
            mgmt_txt += ' — No information disclosed'
        else:
            if d.get('dx_surgery_date'):    mgmt_txt += f"  Date: {d['dx_surgery_date']}"
            if d.get('dx_surgery_details'): mgmt_txt += f"  ({d['dx_surgery_details']})"

    # Falls
    fall_cons = []
    if d.get('fall_fracture'):     fall_cons.append('Fracture')
    if d.get('fall_hospitalised'): fall_cons.append('Hospitalised')
    if d.get('fall_fear'):         fall_cons.append('Fear of Falling')
    if d.get('fall_injury'):       fall_cons.append('Soft Tissue Injury')
    if d.get('fall_none'):         fall_cons.append('No Injury')
    if d.get('fall_consequence_other'): fall_cons.append(d['fall_consequence_other'])
    fall_content = [
        Paragraph(f'<b>H/O Fall in Past 1 Year:</b> {d.get("fall_hx","Not recorded")}', S_NORMAL),
    ]
    if fall_cons:
        fall_content.append(Paragraph(f'<b>Consequence:</b> {", ".join(fall_cons)}', S_NORMAL))

    # Walking aids
    aids = []
    if d.get('aid_none'):       aids.append('None')
    if d.get('aid_frame'):      aids.append('Walking Frame')
    if d.get('aid_quadripod'):  aids.append('Quadripod')
    if d.get('aid_stick'):      aids.append('Stick')
    if d.get('aid_wheelchair'): aids.append('Wheelchair')
    if d.get('aid_others'):     aids.append(d['aid_others'])

    # Incontinence
    incon_parts = []
    if d.get('incon_bladder'): incon_parts.append(f"Bladder: {d['incon_bladder']}")
    if d.get('incon_bowel'):   incon_parts.append(f"Bowel: {d['incon_bowel']}")
    types = []
    if d.get('incon_stress'): types.append('Stress')
    if d.get('incon_urge'):   types.append('Urge')
    if d.get('incon_mixed'):  types.append('Mixed')
    if types: incon_parts.append(f"Type: {', '.join(types)}")

    # Medical history
    med_map = [
        ('med_hpt','HPT'),('med_dm','DM'),('med_ccf','CCF'),
        ('med_ihd','IHD'),('med_pvd','PVD'),('med_copd','COPD'),
        ('med_dementia','DEMENTIA'),('med_pd','PD'),
        ('med_cva_rt','OLD CVA (RT)'),('med_cva_lt','OLD CVA (LT)'),
        ('med_oa','OA'),('med_fracture','FRACTURE'),
    ]
    active_med = [lbl for k, lbl in med_map if d.get(k)]

    # Subjective block
    subj_content = [
        Paragraph(f'<b>Medical History:</b> {", ".join(active_med) if active_med else "Nil"}', S_NORMAL),
        Paragraph(f'<b>Social History:</b> {d.get("social_hx","")}', S_NORMAL),
        Paragraph(f'<b>Previous Surgery:</b> {d.get("prev_surgery","")}  {d.get("surgery_area","")}', S_NORMAL),
        Paragraph(f'<b>Investigations:</b> {d.get("investigations","")}', S_NORMAL),
        Paragraph(f'<b>Medication:</b> {d.get("medication","")}', S_NORMAL),
        Paragraph(f'<b>Main Carer:</b> {d.get("main_carer","")} {d.get("carer_other","")}', S_NORMAL),
        Paragraph(f'<b>Premorbid Mobility:</b> {d.get("premorbid_mobility","")}', S_NORMAL),
        Paragraph(f'<b>Current Mobility:</b> {d.get("current_mobility","")}', S_NORMAL),
    ]
    home = []
    if d.get('home_lift'):   home.append('Lift')
    if d.get('home_stairs'): home.append('Stairs')
    if d.get('home_kerbs'):  home.append('Kerbs')
    if d.get('home_ground'): home.append('Ground Level')
    if home: subj_content.append(Paragraph(f'<b>Home Environment:</b> {", ".join(home)}', S_NORMAL))

    tlt = []
    if d.get('toilet_sitting'):   tlt.append('Sitting')
    if d.get('toilet_squatting'): tlt.append('Squatting')
    if d.get('toilet_commode'):   tlt.append('Commode')
    if tlt: subj_content.append(Paragraph(f'<b>Toilet:</b> {", ".join(tlt)}', S_NORMAL))

    if aids: subj_content.append(Paragraph(f'<b>Walking Aids:</b> {", ".join(aids)}', S_NORMAL))
    if incon_parts: subj_content.append(Paragraph(f'<b>Incontinence:</b> {" | ".join(incon_parts)}', S_NORMAL))

    diaper_txt = d.get('diaper','')
    if diaper_txt == 'Yes':
        day_night = []
        if d.get('diaper_day'):   day_night.append('Day')
        if d.get('diaper_night'): day_night.append('Night')
        diaper_txt += f' ({", ".join(day_night)})' if day_night else ''
    subj_content.append(Paragraph(f'<b>Wear Diapers:</b> {diaper_txt}', S_NORMAL))
    subj_content.append(Paragraph(f'<b>Dominant Hand:</b> {d.get("dominant_hand","")}', S_NORMAL))

    cog_txt = d.get('cognitive','')
    if d.get('cognitive_test'): cog_txt += f'  — {d["cognitive_test"]}'
    subj_content.append(Paragraph(f'<b>Cognitive Impairment:</b> {cog_txt}', S_NORMAL))
    subj_content.append(Paragraph(f'<b>Communication Impairment:</b> {d.get("communication","")}', S_NORMAL))

    sens = []
    if d.get('deficit_visual'):  sens.append('Visual Field Deficit')
    if d.get('deficit_hearing'): sens.append('Hearing Deficit')
    if not sens and d.get('deficit_none'): sens.append('No Deficit')
    subj_content.append(Paragraph(f'<b>Sensory Deficits:</b> {", ".join(sens) if sens else "—"}', S_NORMAL))

    dev = []
    if d.get('device_pacemaker'):   dev.append('Pacemaker')
    if d.get('device_hearing_aid'): dev.append('Hearing Aid')
    if d.get('device_spectacles'):  dev.append('Spectacles')
    if d.get('device_dentures'):    dev.append('Dentures')
    if dev: subj_content.append(Paragraph(f'<b>Assistive Devices:</b> {", ".join(dev)}', S_NORMAL))

    # Pain
    pain_content = [
        Paragraph(f'<b>Presence of Pain:</b> {d.get("pain_present","")}   <b>Score:</b> {d.get("pain_score","0")}/10', S_NORMAL),
        Paragraph(f'<b>Pain Site:</b> {d.get("pain_site","")}', S_NORMAL),
        Paragraph(f'<b>Nature:</b> {d.get("pain_nature","")}   <b>Type:</b> {d.get("pain_type","")}', S_NORMAL),
        Paragraph(f'<b>Pain History:</b> {d.get("pain_history","")}', S_NORMAL),
    ]

    left = [
        box("DOCTOR'S DIAGNOSIS", d.get('dx_diagnosis',''), width=LW2),
        box("DOCTOR'S MANAGEMENT", mgmt_txt, width=LW2),
        box('CURRENT COMPLAINT / PROBLEM', d.get('complaint',''), width=LW2),
        box('FALLS HISTORY', fall_content, width=LW2),
        box('SUBJECTIVE ASSESSMENT', subj_content, width=LW2),
    ]

    right = [
        box('CURRENT HISTORY', d.get('hx_current',''), width=RW2),
        box('PAST HISTORY', d.get('hx_past',''), width=RW2),
        body_chart_section(bc, width=RW2),
        box('PAIN ASSESSMENT', pain_content, width=RW2),
    ]

    story.append(two_col(left, right, lw=LW2, rw=RW2))
    story.append(PageBreak())

    # ── PAGE 2 ────────────────────────────────────────────────────
    story += page_header(TITLE, REF)
    story.append(patient_bar(patient, REF))
    story.append(gap(3))

    # Objective Assessment
    story.append(Paragraph('OBJECTIVE ASSESSMENT', S_LABEL))

    def mob_tick(key):
        val = d.get(key,'')
        opts = ['Ind','Sup','Min A','Mod A','Max A']
        return '  '.join(f"[{'x' if val==o else ' '}] {o}" for o in opts)

    obj_content = [
        Paragraph(f'<b>Posture / Gait:</b> {d.get("obj_posture","")}', S_NORMAL),
        gap(1),
        Paragraph('<b>Functional Mobility:</b>', S_BOLD),
        Paragraph(f'Bed Mobility :  {mob_tick("mob_bed")}', S_NORMAL),
        Paragraph(f'Sitting ⇔ Standing :  {mob_tick("mob_sitting")}  /  {mob_tick("mob_standing")}', S_NORMAL),
        Paragraph(f'Transfer (Bed ⇔ W/C) :  {mob_tick("mob_transfer")}', S_NORMAL),
        gap(1),
        Paragraph(f'<b>Lungs:</b> {d.get("obj_lungs","")}', S_NORMAL),
        Paragraph(f'<b>General Muscle Strength:</b> {d.get("obj_strength","")}', S_NORMAL),
        Paragraph(f'<b>ROM & Contracture:</b> {d.get("rom_contracture","")}  Area: {d.get("rom_notes","")}', S_NORMAL),
        Paragraph(f'<b>Reflex / Sensation / Proprioception:</b> {d.get("reflex_sensation","")}  {d.get("reflex_notes","")}', S_NORMAL),
    ]
    story.append(box(None, obj_content))
    story.append(gap(2))

    # Outcome Measures Table
    story.append(Paragraph('OUTCOME MEASURE', S_LABEL))

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

    def fmt_result(val, unit=''):
        if not val or val == 'N/A': return val or '—'
        return f"{val} {unit}".strip()

    om_headers = ['Category', 'Test', 'Result', 'Reference']
    om_cw = [CW*0.14, CW*0.28, CW*0.26, CW*0.32]
    om_rows = [
        ['Balance',         "Berg's Balance Scale",     fmt_result(berg, '/56'),    '56–41 Low · 40–21 Mod · 0–20 High'],
        ['',                'Timed Up & Go (TUG)',       fmt_result(tug, 'sec'),     '≤13.5s Low risk · >13.5s High'],
        ['',                'Single Leg Stance',         fmt_result(sls, 'sec'),     'Age norm 50–59: ~29 sec'],
        ['Strength',        'Grip Strength (R/L)',       grip or '—',                'Frailty indicator'],
        ['',                'Chair Rising 5× (FTSST)',   fmt_result(ftsst, 'sec'),   '60–69: 11.4s · 70–79: 12.6s'],
        ['Mobility & Gait', 'Elderly Mobility Scale',    fmt_result(ems, '/20'),     '14–20 Ind · 10–13 Sup · 0–9 Dep'],
        ['',                'Problem Orientated Mobility', poma or '—',             ''],
        ['',                '3/6-Min Walk Test',         fmt_result(walk, 'm'),      'Specify 3 or 6 min'],
        ['Performance',     'Gait Speed (10m)',          f"Time: {gsec} sec  Steps: {gstep}" if (gsec or gstep) else '—', '<0.8 m/s = fall risk'],
        ['Flexibility',     'Chair Sit & Reach (R/L)',   reach or '—',               'Hamstring / lower back'],
    ]

    om_tbl = Table([om_headers] + om_rows, colWidths=om_cw)
    om_tbl.setStyle(TableStyle([
        ('BACKGROUND',    (0,0),(-1,0),  LGREY),
        ('FONTNAME',      (0,0),(-1,0),  'Helvetica-Bold'),
        ('FONTSIZE',      (0,0),(-1,-1), 7.5),
        ('FONTNAME',      (0,1),(-1,-1), 'Helvetica'),
        ('FONTNAME',      (0,1),(0,-1),  'Helvetica-Bold'),
        ('GRID',          (0,0),(-1,-1), 0.4, BLACK),
        ('VALIGN',        (0,0),(-1,-1), 'TOP'),
        ('TOPPADDING',    (0,0),(-1,-1), 3),
        ('BOTTOMPADDING', (0,0),(-1,-1), 3),
        ('LEFTPADDING',   (0,0),(-1,-1), 3),
        ('SPAN',          (0,1),(0,3)),  # Balance
        ('SPAN',          (0,4),(0,5)),  # Strength
        ('SPAN',          (0,6),(0,9)),  # Mobility
        ('BACKGROUND',    (0,1),(0,-1),  LGREY),
    ]))
    story.append(om_tbl)

    if d.get('om_notes'):
        story.append(gap(1))
        story.append(Paragraph(f'<b>Notes:</b> {d["om_notes"]}', S_SMALL))

    story.append(gap(2))

    # Plan
    story.append(plan_section(
        d.get('plan_impression',''), d.get('plan_stg',''),
        d.get('plan_ltg',''), d.get('plan_tx','')
    ))

    # Consent footer — matches real KKM form layout
    # Row 1: "Patient / carer agreeable..." (left) | "Attending Physiotherapist:" (right)
    # Row 2: "Patient Education Given..." (left) | blank (right)
    story.append(gap(2))
    consent = d.get('consent_agree','')
    edu     = d.get('consent_edu','')

    # Left col: 2 rows (consent + education), merged vertically on right for signature area
    consent_tbl = Table([
        [
            Paragraph(f'Patient / carer agreeable to proposed treatment:  {tick(consent, ["Yes","No"])}', S_NORMAL),
            Paragraph('Attending Physiotherapist:', S_NORMAL),
        ],
        [
            Paragraph(f'Patient Education Given :  {tick(edu, ["YES","NO"])}', S_NORMAL),
            Paragraph('', S_NORMAL),  # blank — signature space
        ],
    ], colWidths=[CW*0.60, CW*0.40], rowHeights=[10*mm, 12*mm])
    consent_tbl.setStyle(TableStyle([
        ('BOX',          (0,0),(-1,-1), 0.5, BLACK),
        ('LINEABOVE',    (0,1),(0,1),   0.5, BLACK),  # line only between left cells
        ('LINEBEFORE',   (1,0),(1,-1),  0.5, BLACK),  # vertical divider
        ('SPAN',         (1,0),(1,1)),                 # merge right col — one big signature area
        ('TOPPADDING',   (0,0),(-1,-1), 6),
        ('BOTTOMPADDING',(0,0),(-1,-1), 6),
        ('LEFTPADDING',  (0,0),(-1,-1), 6),
        ('RIGHTPADDING', (0,0),(-1,-1), 6),
        ('VALIGN',       (0,0),(0,-1),  'MIDDLE'),     # left col: vertically centred
        ('VALIGN',       (1,0),(1,-1),  'TOP'),        # right col: label at top, space below
    ]))
    story.append(consent_tbl)
    return story


def generate_geriatric_pdf(data):
    return build_pdf(_build_story(data))

def generate_episode_pdf(assessment_data, soap_notes, episode_info=None):
    story   = []
    patient = (assessment_data or {}).get('patient', {})
    if assessment_data:
        story += _build_story(assessment_data)
    else:
        story += page_header(TITLE, REF)
        story.append(Paragraph('No initial assessment recorded for this episode.', S_NORMAL))
    # Pair notes explicitly — 2 per page, PageBreak between pairs
    notes = soap_notes or []
    for i in range(0, len(notes), 2):
        story.append(PageBreak())
        pair = []
        pair += soap_page(patient, notes[i], episode_info)
        if i + 1 < len(notes):
            pair += soap_page(patient, notes[i + 1], episode_info)
        story.append(KeepTogether(pair))
    return build_pdf(story)
