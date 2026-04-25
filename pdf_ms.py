# pdf_ms.py — KKM Musculoskeletal Assessment Form PDF (Platypus layout engine)
# fisio / b.pen. 14 / Pind. 1 / 2019

from reportlab.platypus import Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
from reportlab.lib.units import mm
from reportlab.lib import colors
from pdf_platypus_base import (
    build_pdf, page_header, patient_bar, body_chart_section,
    box, two_col, plan_section, soap_page,
    data_table, gap, tick,
    S_LABEL, S_NORMAL, S_SMALL,
    CW, LW, RW, BLACK, LGREY
)

REF   = 'fisio / b.pen. 14 / Pind. 1 / 2019'
TITLE = ['KEMENTERIAN KESIHATAN MALAYSIA',
         'PHYSIOTHERAPY DEPARTMENT',
         'MUSCULOSKELETAL  ASSESSMENT FORM']


def _build_story(d):
    story = []
    patient  = d.get('patient', {})
    pain     = d.get('pain', {})
    sq       = d.get('specialQuestions', {})
    hx       = d.get('history', {})
    neuro    = d.get('neurological', {})
    obs      = d.get('observation', {})
    palp     = d.get('palpation', {})
    movement = d.get('movement', {})
    plan     = d.get('plan', {})
    mgmt     = d.get('management', {})
    bc       = d.get('bodyChart', {})

    # Header
    story += page_header(TITLE, REF)
    story.append(patient_bar(patient, REF))
    story.append(gap(2))

    # Management
    mgmt_txt = mgmt.get('type', '')
    if mgmt.get('surgeryDate'):
        mgmt_txt += f"  (Surgery: {mgmt['surgeryDate']})"

    # Pain block
    pain_content = [
        Paragraph(f'<b>PRE:</b> {pain.get("pre","0")}/10   <b>POST:</b> {pain.get("post","0")}/10', S_NORMAL),
        Paragraph(f'<b>Nature:</b> {pain.get("nature","")}', S_NORMAL),
        Paragraph(f'<b>Agg:</b> {pain.get("agg","")}', S_NORMAL),
        Paragraph(f'<b>Ease:</b> {pain.get("ease","")}', S_NORMAL),
        Paragraph(f'<b>24 hrs:</b> {pain.get("behaviour24","")}', S_NORMAL),
        Paragraph(f'<b>Irritability:</b> {pain.get("irritability","High / Medium / Low")}', S_NORMAL),
    ]

    # Special questions
    sq_content = [
        Paragraph(f'<b>General Health:</b> {sq.get("health","")}', S_NORMAL),
        Paragraph(f'<b>PMHx / Surgery:</b> {sq.get("pmhx","")} {sq.get("surgery","")}', S_NORMAL),
        Paragraph(f'<b>Investigation:</b> {sq.get("investigation","")}', S_NORMAL),
        Paragraph(f'<b>Medication:</b> {sq.get("medication","")}', S_NORMAL),
        Paragraph(f'<b>Occupation / Recreation:</b> {sq.get("occupation","")} {sq.get("recreation","")}', S_NORMAL),
        Paragraph(f'<b>Social History:</b> {sq.get("social","")}', S_NORMAL),
        Paragraph(f'<b>Pacemaker / Hearing aid:</b> {sq.get("pacemaker","No")}', S_NORMAL),
    ]

    left = [
        box('DIAGNOSIS', d.get('diagnosis',''), width=LW),
        box("DOCTOR'S MANAGEMENT", mgmt_txt, width=LW),
        box('PROBLEM', d.get('problem',''), width=LW),
        box('PAIN SCORE', pain_content, width=LW),
        box('SPECIAL QUESTION', sq_content, width=LW),
    ]

    # Neuro
    s  = neuro.get('sensation', {})
    r  = neuro.get('reflex', {})
    mo = neuro.get('motor', {})
    neuro_content = [
        Paragraph(f'<b>Sensation:</b> L: {s.get("left","")}  R: {s.get("right","")}  {s.get("notes","")}', S_NORMAL),
        Paragraph(f'<b>Reflex:</b> L: {r.get("left","")}  R: {r.get("right","")}  {r.get("notes","")}', S_NORMAL),
        Paragraph(f'<b>Motor:</b> L: {mo.get("left","")}  R: {mo.get("right","")}  {mo.get("notes","")}', S_NORMAL),
    ]

    obs_txt  = ''
    if obs.get('general'): obs_txt += f"General: {obs['general']}\n"
    if obs.get('local'):   obs_txt += f"Local: {obs['local']}"

    palp_txt = ''
    if palp.get('tenderness'):  palp_txt += f"Tenderness: {palp['tenderness']}\n"
    if palp.get('temperature'): palp_txt += f"Temperature: {palp['temperature']}\n"
    if palp.get('muscle'):      palp_txt += f"Muscle/ST: {palp['muscle']}\n"
    if palp.get('joint'):       palp_txt += f"Joint/Bony: {palp['joint']}"

    right = [
        body_chart_section(bc, width=RW),
        box('CURRENT HISTORY', hx.get('current',''), width=RW),
        box('PAST HISTORY', hx.get('past',''), width=RW),
        box('NEUROLOGICAL TEST', neuro_content, width=RW),
        box('OBSERVATION (general & local)', obs_txt, width=RW),
        box('PALPATION', palp_txt, width=RW),
    ]

    story.append(two_col(left, right))
    story.append(PageBreak())

    # PAGE 2
    story += page_header(TITLE, REF)
    story.append(patient_bar(patient, REF))
    story.append(gap(3))

    # Movement table
    mov_rows = movement.get('table', [])
    headers  = ['Joint','Side','Movement','Active ROM','Pain\n(Active)','Passive ROM','Pain\n(Passive)','Resisted']
    cw       = [20*mm, 28*mm, 22*mm, 20*mm, 30*mm, 20*mm, 22*mm, 24*mm]
    rows = []
    for row in mov_rows:
        rows.append([
            row.get('joint',''), row.get('side',''), row.get('plane',''),
            row.get('activeRom',''), row.get('activePain',''),
            row.get('passiveRom',''), row.get('passivePain',''),
            row.get('resisted','')
        ])
    story.append(Paragraph('MOVEMENT', S_LABEL))
    story.append(data_table(headers, rows or None, cw))
    story.append(gap(2))

    # Additional findings
    extra = []
    if movement.get('muscle'):    extra.append(Paragraph(f'<b>Muscle Strength:</b> {movement["muscle"]}', S_NORMAL))
    if movement.get('accessory'): extra.append(Paragraph(f'<b>Accessory Movement:</b> {movement["accessory"]}', S_NORMAL))
    if movement.get('clearing'):  extra.append(Paragraph(f'<b>Clearing Tests:</b> {movement["clearing"]}', S_NORMAL))
    if movement.get('special'):   extra.append(Paragraph(f'<b>Special Tests:</b> {movement["special"]}', S_NORMAL))
    if extra:
        story.append(box('ADDITIONAL FINDINGS', extra))
        story.append(gap(2))

    story.append(plan_section(
        plan.get('impression',''), plan.get('stg',''),
        plan.get('ltg',''), plan.get('treatment','')
    ))

    if plan.get('remarks'):
        story.append(gap(2))
        story.append(box('REMARKS / PRECAUTIONS', plan.get('remarks','')))

    story.append(gap(3))
    sign_content = [
        Paragraph('Attending Physiotherapist :  ………………………………………………………………………………………', S_NORMAL),
        Spacer(1, 4*mm),
        Paragraph('Date :  _______________________&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Sign &amp; Stamp :', S_NORMAL),
    ]
    sign = Table([[sign_content]], colWidths=[CW])
    sign.setStyle(TableStyle([
        ('BOX',          (0,0),(-1,-1), 0.5, BLACK),
        ('TOPPADDING',   (0,0),(-1,-1), 8),
        ('BOTTOMPADDING',(0,0),(-1,-1), 8),
        ('LEFTPADDING',  (0,0),(-1,-1), 6),
        ('RIGHTPADDING', (0,0),(-1,-1), 6),
        ('VALIGN',       (0,0),(-1,-1), 'TOP'),
    ]))
    story.append(sign)
    return story


def generate_ms_pdf(data):
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
