# pdf_spine.py — KKM Spine Assessment Form PDF (Platypus layout engine)
# fisio / b.pen. 6 / Pind. 2 / 2019

from reportlab.platypus import Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
from reportlab.lib.units import mm
from reportlab.lib import colors
from pdf_platypus_base import (
    build_pdf, page_header, patient_bar, body_chart_section,
    box, two_col, plan_section, soap_page,
    data_table, gap, tick, cbtick,
    S_LABEL, S_NORMAL, S_SMALL, S_BOLD,
    CW, LW, RW, BLACK, LGREY
)

REF   = 'fisio / b.pen. 6 / Pind. 2 / 2019'
TITLE = ['KEMENTERIAN KESIHATAN MALAYSIA',
         'PHYSIOTHERAPY DEPARTMENT',
         'SPINE  ASSESSMENT FORM']

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


def _build_story(d):
    story   = []
    patient = d.get('patient', {})
    pain    = d.get('pain', {})
    sq      = d.get('specialQuestions', {})
    hx      = d.get('history', {})
    obs     = d.get('observation', {})
    palp    = d.get('palpation', {})
    neuro   = d.get('neurological', {})
    mgmt    = d.get('management', {})
    bc      = d.get('bodyChart', {})
    spine_mov    = d.get('spineMovement', [])
    accessory    = d.get('accessory', {})
    neurodynamic = d.get('neurodynamic', {})
    plan         = d.get('plan', {})
    movement     = d.get('movement', {})

    # ── PAGE 1 ────────────────────────────────────────────────────
    story += page_header(TITLE, REF)
    story.append(patient_bar(patient, REF))
    story.append(gap(2))

    mgmt_txt = mgmt.get('type','')
    if mgmt.get('surgeryDate'):
        mgmt_txt += f"  (Surgery: {mgmt['surgeryDate']})"

    pain_content = [
        Paragraph(f'<b>PRE:</b> {pain.get("pre","0")}/10   <b>POST:</b> {pain.get("post","0")}/10', S_NORMAL),
        Paragraph(f'<b>Area:</b> {pain.get("area","")}', S_NORMAL),
        Paragraph(f'<b>Nature:</b> {pain.get("nature","")}', S_NORMAL),
        Paragraph(f'<b>Agg:</b> {pain.get("agg","")}', S_NORMAL),
        Paragraph(f'<b>Ease:</b> {pain.get("ease","")}', S_NORMAL),
        Paragraph(f'<b>24 Hrs:</b> {pain.get("behaviour24","")}', S_NORMAL),
        Paragraph(f'<b>Irritability:</b> {pain.get("irritability","High / Medium / Low")}', S_NORMAL),
    ]

    sq_content = [
        Paragraph(f'<b>General Health:</b> {sq.get("health","")}', S_NORMAL),
        Paragraph(f'<b>PMHx / Surgery:</b> {sq.get("pmhx","")} {sq.get("surgery","")}', S_NORMAL),
        Paragraph(f'<b>Investigation:</b> {sq.get("investigation","")}', S_NORMAL),
        Paragraph(f'<b>Medication:</b> {sq.get("medication","")}', S_NORMAL),
        Paragraph(f'<b>C.E:</b> {sq.get("ce","")}', S_NORMAL),
        Paragraph(f'<b>Bed / Pillow:</b> {sq.get("bedPillow","")}', S_NORMAL),
        Paragraph(f'<b>Occupation / Recreation:</b> {sq.get("occupation","")} {sq.get("recreation","")}', S_NORMAL),
        Paragraph(f'<b>Social History:</b> {sq.get("social","")}', S_NORMAL),
        Paragraph(f'<b>Hearing aid / Pacemaker:</b> {sq.get("pacemaker","Y / N")}', S_NORMAL),
    ]

    left = [
        box('DIAGNOSIS', d.get('diagnosis',''), width=LW),
        box("DOCTOR'S MANAGEMENT", mgmt_txt, width=LW),
        box('PROBLEM', d.get('problem',''), width=LW),
        box('PAIN SCORE', pain_content, width=LW),
        box('SPECIAL QUESTIONS', sq_content, width=LW),
    ]

    obs_txt = ''
    if obs.get('general'): obs_txt += f"General: {obs['general']}\n"
    if obs.get('local'):   obs_txt += f"Local: {obs['local']}"

    right = [
        body_chart_section(bc, width=RW),
        box('CURRENT HISTORY', hx.get('current',''), width=RW),
        box('PAST HISTORY', hx.get('past',''), width=RW),
        box('OBSERVATION', obs_txt, width=RW),
    ]

    story.append(two_col(left, right))
    story.append(PageBreak())

    # ── PAGE 2 ────────────────────────────────────────────────────
    story += page_header(TITLE, REF)
    story.append(patient_bar(patient, REF))
    story.append(gap(3))

    # Spine Movement Table
    headers = ['Movement', 'Active ROM', 'Pain (Active)', 'Passive ROM', 'Overpressure', 'End Feel']
    cw = [CW*v for v in [0.20, 0.15, 0.18, 0.15, 0.17, 0.15]]
    rows = []
    if spine_mov:
        for m in spine_mov:
            rows.append([
                m.get('movement',''), m.get('activeRom',''), m.get('activePain',''),
                m.get('passiveRom',''), m.get('overpress',''), m.get('endFeel','')
            ])
    story.append(Paragraph('SPINE MOVEMENT', S_LABEL))
    story.append(data_table(headers, rows or None, cw))
    story.append(gap(2))

    # PAIVM / Accessory
    acc_lines = []
    if accessory.get('notes'):
        acc_lines.append(Paragraph(accessory['notes'], S_NORMAL))
    for region, levels in [('Cervical', accessory.get('cervical',{})),
                            ('Thoracic', accessory.get('thoracic',{})),
                            ('Lumbar',   accessory.get('lumbar',{}))]:
        if not levels: continue
        for lv, vals in levels.items():
            parts = []
            if vals.get('central'):    parts.append(f"Central: {vals['central']}")
            if vals.get('unilateral'): parts.append(f"Unilateral: {vals['unilateral']}")
            if vals.get('pain'):       parts.append(f"Pain: {vals['pain']}")
            if parts:
                acc_lines.append(Paragraph(f'<b>{region} {lv}:</b> {" | ".join(parts)}', S_NORMAL))

    story.append(box('ACCESSORRY (PAIVM / PPIVM)', acc_lines if acc_lines else None))
    story.append(gap(2))

    # Palpation
    palp_txt = ''
    if palp.get('tenderness'):  palp_txt += f"Tenderness: {palp['tenderness']}\n"
    if palp.get('temperature'): palp_txt += f"Temperature: {palp['temperature']}\n"
    if palp.get('muscle'):      palp_txt += f"Muscle/ST: {palp['muscle']}\n"
    if palp.get('joint'):       palp_txt += f"Joint/Bony: {palp['joint']}"
    story.append(box('PALPATION', palp_txt))
    story.append(gap(2))

    # Neurodynamic table
    nd_tests = neurodynamic.get('tests', {}) if neurodynamic else {}
    nd_headers = ['Test', 'Neck Left', 'Neck Right', 'Back Left', 'Back Right', 'Notes']
    nd_cw = [CW*v for v in [0.16, 0.14, 0.14, 0.14, 0.14, 0.28]]
    nd_rows = []
    for tid, tlbl in NEURO_TESTS:
        td = nd_tests.get(tid, {})
        nd_rows.append([
            tlbl,
            td.get('leftNeck',''), td.get('rightNeck',''),
            td.get('leftBack',''), td.get('rightBack',''),
            td.get('notes','')
        ])
    nd_tbl = data_table(nd_headers, nd_rows, nd_cw)
    story.append(Paragraph('NEURODYNAMIC TEST', S_LABEL))
    story.append(nd_tbl)
    if neurodynamic and neurodynamic.get('notes'):
        story.append(Paragraph(f'Notes: {neurodynamic["notes"]}', S_SMALL))
    story.append(gap(2))

    # Neurological Test
    s  = neuro.get('sensation', {}) if neuro else {}
    mo = neuro.get('motor', {})     if neuro else {}
    r  = neuro.get('reflex', {})    if neuro else {}
    neuro_content = [
        Paragraph(f'<b>Sensation:</b> L: {s.get("left","")}  R: {s.get("right","")}  {s.get("notes","")}', S_NORMAL),
        Paragraph(f'<b>Motor:</b> L: {mo.get("left","")}  R: {mo.get("right","")}  {mo.get("notes","")}', S_NORMAL),
        Paragraph(f'<b>Reflexes:</b> L: {r.get("left","")}  R: {r.get("right","")}  {r.get("notes","")}', S_NORMAL),
    ]
    story.append(box('NEUROLOGICAL TEST', neuro_content))
    story.append(gap(2))

    # Plan 2x2
    story.append(plan_section(
        plan.get('impression',''), plan.get('stg',''),
        plan.get('ltg',''), plan.get('treatment','')
    ))

    # Clearing Tests
    if movement.get('clearing'):
        story.append(gap(2))
        story.append(box('CLEARING TESTS / OTHER JOINTS', movement.get('clearing','')))

    # Sign block
    story.append(gap(3))
    sign_content = [
        Paragraph('Attending Physiotherapist :  …………………………………………………………………………………………………', S_NORMAL),
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


def generate_spine_pdf(data):
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
