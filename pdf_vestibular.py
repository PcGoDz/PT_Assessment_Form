# pdf_vestibular.py — VESTIBULAR ASSESSMENT FORM PDF generator.
# KKM ref: fisio/b.pen. 22 /2022 (verbatim, note the spacing).

from reportlab.platypus import Paragraph

from pdf_platypus_base import (
    CW, S_BOLD, S_NORMAL, S_SMALL,
    gap, page_header, patient_bar, two_col, data_table, sign_chop_block, ensure_dict,
    build_pdf, generate_episode_pdf_base,
)

REF = 'fisio/b.pen. 22 /2022'
TITLE = ['KEMENTERIAN KESIHATAN MALAYSIA', 'PHYSIOTHERAPY DEPARTMENT', 'VESTIBULAR ASSESSMENT FORM']


def _has_text(*vals):
    return any(str(v or '').strip() for v in vals)


def _battery_block(story, title, battery):
    """
    battery: {'items': {label: 'Yes'/'No'/'+Ve'/'−Ve', ...}} or {'kiv': 'reason'} or None/{}.
    Renders full documented Yes/No list (D8) or the KIV remark (D4). Omitted if blank (D3).
    """
    battery = battery or {}
    kiv = (battery.get('kiv') or '').strip()
    items = battery.get('items') or {}
    if not kiv and not items:
        return
    story.append(Paragraph(title, S_BOLD))
    story.append(gap(1))
    if kiv:
        story.append(Paragraph('KIV — unable to answer this visit. ' + kiv, S_NORMAL))
    else:
        for label, val in items.items():
            story.append(Paragraph(f'{label} : {val}.', S_NORMAL))
    story.append(gap(2))


def _scaffold_line(story, label, data):
    """Positioning test row. data: {'result':'pos'|'neg', direction, latency, duration, intensity, note} or None."""
    if not data:
        return
    if data.get('result') == 'neg':
        story.append(Paragraph(f'{label} : −Ve', S_NORMAL))
        return
    dirs = ', '.join(data.get('direction') or [])
    detail = (
        f'Direction: {dirs} · Latency: {data.get("latency","")}s · '
        f'Duration: {data.get("duration","")}s · Intensity: {data.get("intensity","")}/10'
    )
    if data.get('note'):
        detail += f' · Symptoms: {data.get("note")}'
    story.append(Paragraph(f'{label} : +Ve', S_NORMAL))
    story.append(Paragraph(detail, S_SMALL))


def _fixed_rows_table(story, title, headers, rows, col_widths):
    if not any(any(str(c).strip() for c in r[1:]) for r in rows):
        return
    story.append(Paragraph(title, S_BOLD))
    story.append(gap(1))
    story.append(data_table(headers, rows, col_widths))
    story.append(gap(2))


def _build_story(d):
    d = ensure_dict(d)
    patient = ensure_dict(d.get('patient'))
    story = []

    story += page_header(TITLE, REF)
    story.append(patient_bar(patient, REF))
    story.append(gap(2))

    referral = d.get('referral') or {}
    if _has_text(referral.get('dx'), referral.get('mgmt')):
        story.append(Paragraph('REFERRAL', S_BOLD)); story.append(gap(1))
        if referral.get('dx'):   story.append(Paragraph(f'Doctor Diagnosis: {referral["dx"]}', S_NORMAL))
        if referral.get('mgmt'): story.append(Paragraph(f'Doctor Management: {referral["mgmt"]}', S_NORMAL))
        story.append(gap(2))

    history = d.get('history') or {}
    if _has_text(history.get('current'), history.get('past'), history.get('problem')):
        story.append(Paragraph('HISTORY', S_BOLD)); story.append(gap(1))
        if history.get('current'): story.append(Paragraph(f'Current Hx: {history["current"]}', S_NORMAL))
        if history.get('past'):    story.append(Paragraph(f'Past Hx: {history["past"]}', S_NORMAL))
        if history.get('problem'): story.append(Paragraph(f'Problem: {history["problem"]}', S_NORMAL))
        story.append(gap(2))

    _battery_block(story, 'PAST MEDICAL HISTORY', d.get('pmhx'))
    _battery_block(story, 'RECENT SYMPTOMS OR PROBLEMS', d.get('recentSymptoms'))

    if _has_text(d.get('ix'), d.get('medication')):
        story.append(Paragraph('INVESTIGATIONS / MEDICATION', S_BOLD)); story.append(gap(1))
        if d.get('ix'):         story.append(Paragraph(f'Ix (MRI/CT Scan): {d["ix"]}', S_NORMAL))
        if d.get('medication'): story.append(Paragraph(f'Medication / Steroid: {d["medication"]}', S_NORMAL))
        story.append(gap(2))

    social = d.get('social') or {}
    if _has_text(social.get('occupation'), social.get('marital'), social.get('smoking'), social.get('alcohol'), social.get('sleep')):
        story.append(Paragraph('SOCIAL HISTORY', S_BOLD)); story.append(gap(1))
        if social.get('occupation'): story.append(Paragraph(f'Occupation: {social["occupation"]}', S_NORMAL))
        if social.get('marital'):    story.append(Paragraph(f'Marital Status: {social["marital"]}', S_NORMAL))
        if social.get('smoking'):    story.append(Paragraph(f'Smoking: {social["smoking"]}', S_NORMAL))
        if social.get('alcohol'):    story.append(Paragraph(f'Alcohol: {social["alcohol"]}', S_NORMAL))
        if social.get('sleep'):      story.append(Paragraph(f'Trouble Sleeping: {social["sleep"]}', S_NORMAL))
        story.append(gap(2))

    _battery_block(story, 'CURRENT FUNCTIONAL STATUS', d.get('functionalStatus'))

    falls = d.get('falls') or {}
    if _has_text(falls.get('frequency'), falls.get('injury')):
        story.append(Paragraph('FALLS', S_BOLD)); story.append(gap(1))
        story.append(two_col(
            [Paragraph(f'Frequency of Falls: {falls.get("frequency","")}', S_NORMAL)],
            [Paragraph(f'Injury from Fall: {falls.get("injury","")}', S_NORMAL)],
        ))
        story.append(gap(2))

    vertigo = d.get('vertigo') or {}
    if any(vertigo.values()):
        story.append(Paragraph('VERTIGO (a sense of spinning)', S_BOLD)); story.append(gap(1))
        if vertigo.get('spontaneous'): story.append(Paragraph(f'Spontaneous : {vertigo["spontaneous"]}.', S_NORMAL))
        if vertigo.get('motion'):      story.append(Paragraph(f'Induced by motion : {vertigo["motion"]}.', S_NORMAL))
        if vertigo.get('position'):    story.append(Paragraph(f'Induced by position changes : {vertigo["position"]}.', S_NORMAL))
        if vertigo.get('tempo'):       story.append(Paragraph(f'Tempo : {vertigo["tempo"]}.', S_NORMAL))
        if vertigo.get('spells'):      story.append(Paragraph(f'Spells : {vertigo["spells"]}.', S_NORMAL))
        story.append(gap(2))

    diseq = d.get('disequilibrium') or {}
    if any([diseq.get('constant'), diseq.get('spontaneous'), diseq.get('motion'), diseq.get('position'), diseq.get('dark'), diseq.get('worseIn')]):
        story.append(Paragraph('DISEQUILIBRIUM (sense of being off-balance)', S_BOLD)); story.append(gap(1))
        if diseq.get('constant'):    story.append(Paragraph(f'Constant : {diseq["constant"]}.', S_NORMAL))
        if diseq.get('spontaneous'): story.append(Paragraph(f'Spontaneous : {diseq["spontaneous"]}.', S_NORMAL))
        if diseq.get('motion'):      story.append(Paragraph(f'Induced by motion : {diseq["motion"]}.', S_NORMAL))
        if diseq.get('position'):    story.append(Paragraph(f'Induced by position changes : {diseq["position"]}.', S_NORMAL))
        if diseq.get('dark'):        story.append(Paragraph(f'Worse in the dark : {diseq["dark"]}.', S_NORMAL))
        if diseq.get('worseIn'):     story.append(Paragraph('Worse in : ' + ', '.join(diseq['worseIn']) + '.', S_NORMAL))
        story.append(gap(2))

    measures = d.get('measures') or {}
    if _has_text(measures.get('dhi'), measures.get('abc')):
        story.append(Paragraph('MEASURES', S_BOLD)); story.append(gap(1))
        story.append(two_col(
            [Paragraph(f'DHI: {measures.get("dhi","")}', S_NORMAL)],
            [Paragraph(f'ABC: {measures.get("abc","")}', S_NORMAL)],
        ))
        story.append(gap(2))

    _battery_block(story, 'OCULOMOTOR EXAMINATION', d.get('oculomotor'))
    if d.get('headThrustSide'):
        story.append(Paragraph(f'Head Thrusts side : {d["headThrustSide"]}', S_SMALL))
        story.append(gap(1))

    pos = d.get('positional') or {}
    if any(pos.values()):
        story.append(Paragraph('POSITIONING TESTS', S_BOLD)); story.append(gap(1))
        _scaffold_line(story, 'R Dix Hallpike', pos.get('rDixHallpike'))
        _scaffold_line(story, 'L Dix Hallpike', pos.get('lDixHallpike'))
        _scaffold_line(story, 'R Roll', pos.get('rRoll'))
        _scaffold_line(story, 'L Roll', pos.get('lRoll'))
        story.append(gap(2))

    rom = d.get('rom') or {}
    rom_rows = []
    for label, key in [('Neck','neck'), ('R UL','rUl'), ('L UL','lUl'), ('R LL','rLl'), ('L LL','lLl')]:
        r = rom.get(key) or {}
        rom_rows.append([label, r.get('range',''), r.get('quality',''), r.get('pain','')])
    _fixed_rows_table(story, 'AROM / PROM', ['Region','Range','Quality/Symptom','Pain (0-10)'], rom_rows,
                       [CW*0.20, CW*0.30, CW*0.35, CW*0.15])

    strength = d.get('strength') or {}
    if _has_text(strength.get('ulR'), strength.get('ulL'), strength.get('llR'), strength.get('llL')):
        story.append(Paragraph('STRENGTH (MMT)', S_BOLD)); story.append(gap(1))
        story.append(data_table(['Region','R','L'],
            [['UL', strength.get('ulR',''), strength.get('ulL','')],
             ['LL', strength.get('llR',''), strength.get('llL','')]],
            [CW*0.4, CW*0.3, CW*0.3]))
        story.append(gap(2))

    soma = d.get('somatosensory') or {}
    soma_rows = []
    for label, key in [('Proprioception UL R','propUlR'), ('Proprioception UL L','propUlL'),
                        ('Proprioception LL R','propLlR'), ('Proprioception LL L','propLlL')]:
        v = soma.get(key) or {}
        if v.get('status') or v.get('note'):
            soma_rows.append([label, v.get('status',''), v.get('note','')])
    if soma_rows:
        story.append(Paragraph('SOMATOSENSORY', S_BOLD)); story.append(gap(1))
        story.append(data_table(['Test','Status','Note'], soma_rows, [CW*0.35, CW*0.25, CW*0.40]))
        story.append(gap(2))

    coord = d.get('coordination') or {}
    coord_rows = []
    for label, key in [('Finger to Nose R','ftnR'), ('Finger to Nose L','ftnL'),
                        ('Heel to Shin R','htsR'), ('Heel to Shin L','htsL')]:
        v = coord.get(key) or {}
        if v.get('status') or v.get('note'):
            coord_rows.append([label, v.get('status',''), v.get('note','')])
    if coord_rows:
        story.append(Paragraph('COORDINATION', S_BOLD)); story.append(gap(1))
        story.append(data_table(['Test','Status','Note'], coord_rows, [CW*0.35, CW*0.25, CW*0.40]))
        story.append(gap(2))

    postural = d.get('postural') or {}
    post_rows = []
    for label, key in [('Rhomberg','rhomberg'), ('R Sharpened Rhomberg','rSharpened'),
                        ('L Sharpened Rhomberg','lSharpened'), ('R Single Leg Stand','rSls'),
                        ('L Single Leg Stand','lSls')]:
        v = postural.get(key) or {}
        post_rows.append([label, v.get('eo',''), v.get('ec','')])
    _fixed_rows_table(story, 'POSTURAL CONTROL', ['Test','EO','EC'], post_rows, [CW*0.5, CW*0.25, CW*0.25])
    if postural.get('tug'):
        story.append(Paragraph(f'Time Up &amp; Go Test : {postural["tug"]}s', S_NORMAL))
        story.append(gap(2))

    ctsib = d.get('ctsib') or {}
    ctsib_rows = [
        ['EO Firm surface', ctsib.get('eoFirm','')], ['EC Firm surface', ctsib.get('ecFirm','')],
        ['EO Foam surface', ctsib.get('eoFoam','')], ['EC Foam surface', ctsib.get('ecFoam','')],
    ]
    _fixed_rows_table(story, 'CLINICAL TEST OF SENSORY INTERACTION FOR BALANCE (CTSIB)',
                       ['Test','Seconds'], ctsib_rows, [CW*0.6, CW*0.4])

    gait = d.get('gait') or {}
    if any(gait.values()) or d.get('clearance'):
        story.append(Paragraph('GAIT ASSESSMENT', S_BOLD)); story.append(gap(1))
        if gait.get('velocity'): story.append(Paragraph(f'Velocity : {gait["velocity"]} Sec/20ft', S_NORMAL))
        if gait.get('deviation'):
            devline = f'Deviation : {gait["deviation"]}'
            if gait.get('deviationSide'): devline += f' ({gait["deviationSide"]})'
            story.append(Paragraph(devline, S_NORMAL))
        if gait.get('device'):  story.append(Paragraph(f'Device : {gait["device"]}', S_NORMAL))
        if gait.get('dgi'):     story.append(Paragraph(f'Dynamic Gait Index Score : {gait["dgi"]}', S_NORMAL))
        if d.get('clearance'):  story.append(Paragraph(f'Clearance Test : {d["clearance"]}', S_NORMAL))
        story.append(gap(2))

    if d.get('impression'):
        story.append(Paragraph('PHYSIOTHERAPY IMPRESSION', S_BOLD)); story.append(gap(1))
        story.append(Paragraph(d['impression'], S_NORMAL)); story.append(gap(2))

    if _has_text(d.get('stg'), d.get('ltg'), d.get('plan')):
        story.append(Paragraph('GOALS &amp; PLAN', S_BOLD)); story.append(gap(1))
        if d.get('stg'):  story.append(Paragraph(f'Short Term Goals: {d["stg"]}', S_NORMAL))
        if d.get('ltg'):  story.append(Paragraph(f'Long Term Goals: {d["ltg"]}', S_NORMAL))
        if d.get('plan'): story.append(Paragraph(f'Plan of Treatment: {d["plan"]}', S_NORMAL))
        story.append(gap(2))

    story += sign_chop_block()
    return story


def generate_vestibular_pdf(data):
    return build_pdf(_build_story(data))


def generate_episode_pdf(assessment_data, soap_notes, episode_info=None):
    return generate_episode_pdf_base(_build_story, TITLE, REF, assessment_data, soap_notes, episode_info)
