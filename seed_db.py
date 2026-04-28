# seed_db.py — Populate dummy data for testing
# Run this ONCE from the same folder as the app:
#   python seed_db.py
# It will create pt_data/records.db with test patients if not already seeded.

import sqlite3, json, os, sys
from datetime import datetime, date

BASE = os.path.dirname(os.path.abspath(__file__))
DB_DIR = os.path.join(BASE, 'pt_data')
os.makedirs(DB_DIR, exist_ok=True)
DB_PATH = os.path.join(DB_DIR, 'records.db')

NOW = datetime.now().isoformat()
TODAY = date.today().isoformat()

# ── Init tables (mirrors app.py / database.py) ────────────────────

def init(conn):
    conn.executescript('''
        CREATE TABLE IF NOT EXISTS patients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL, ic TEXT, passport TEXT,
            pt_type TEXT NOT NULL DEFAULT 'local',
            dob TEXT, sex TEXT, country TEXT,
            created_at TEXT NOT NULL, updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS episodes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER NOT NULL,
            form_type TEXT NOT NULL DEFAULT 'MS',
            referral_date TEXT,
            status TEXT NOT NULL DEFAULT 'active',
            created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
            FOREIGN KEY (patient_id) REFERENCES patients(id)
        );
        CREATE TABLE IF NOT EXISTS records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            episode_id INTEGER, form_type TEXT NOT NULL DEFAULT 'MS',
            patient_name TEXT, patient_rn TEXT, patient_date TEXT,
            created_at TEXT, updated_at TEXT,
            data_json TEXT NOT NULL,
            FOREIGN KEY (episode_id) REFERENCES episodes(id)
        );
        CREATE TABLE IF NOT EXISTS soap_notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            episode_id INTEGER NOT NULL,
            session_no INTEGER NOT NULL DEFAULT 1,
            note_date TEXT, subjective TEXT, objective TEXT,
            analysis TEXT, plan TEXT,
            created_at TEXT, updated_at TEXT,
            FOREIGN KEY (episode_id) REFERENCES episodes(id)
        );
        CREATE TABLE IF NOT EXISTS audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            record_id INTEGER, action TEXT,
            changed_at TEXT, data_json TEXT
        );
    ''')
    conn.commit()

def ins_patient(conn, name, ic, dob, sex, pt_type='local', passport='', country=''):
    cur = conn.execute(
        'INSERT INTO patients (name,ic,passport,pt_type,dob,sex,country,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)',
        (name, ic, passport, pt_type, dob, sex, country, NOW, NOW)
    )
    conn.commit()
    return cur.lastrowid

def ins_episode(conn, patient_id, form_type, ref_date, status='active'):
    cur = conn.execute(
        'INSERT INTO episodes (patient_id,form_type,referral_date,status,created_at,updated_at) VALUES (?,?,?,?,?,?)',
        (patient_id, form_type, ref_date, status, NOW, NOW)
    )
    conn.commit()
    return cur.lastrowid

def ins_record(conn, episode_id, form_type, name, rn, date_str, data):
    cur = conn.execute(
        'INSERT INTO records (episode_id,form_type,patient_name,patient_rn,patient_date,created_at,updated_at,data_json) VALUES (?,?,?,?,?,?,?,?)',
        (episode_id, form_type, name, rn, date_str, NOW, NOW, json.dumps(data))
    )
    conn.commit()
    return cur.lastrowid

def ins_soap(conn, episode_id, session_no, note_date, s, o, a, p):
    conn.execute(
        'INSERT INTO soap_notes (episode_id,session_no,note_date,subjective,objective,analysis,plan,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)',
        (episode_id, session_no, note_date, s, o, a, p, NOW, NOW)
    )
    conn.commit()

# ══════════════════════════════════════════════════════════════════
# DUMMY DATA
# ══════════════════════════════════════════════════════════════════

def seed(conn):

    # ── 1. MS patient — knee OA ───────────────────────────────────
    p1 = ins_patient(conn, 'Ahmad Razif bin Hamdan', '880514076231', '1988-05-14', 'M')
    e1 = ins_episode(conn, p1, 'MS', '2026-04-01')
    ms_data = {
        '_form_type': 'MS',
        'meta': {'form': 'MS', 'ref': 'fisio/b.pen.14/Pind.1/2019', 'saved': NOW},
        'patient': {'type':'local','name':'Ahmad Razif bin Hamdan','nric':'880514076231',
                    'passport':'','country':'','dob':'1988-05-14','date':TODAY,'age':'37','sex':'M'},
        'diagnosis': 'Right knee osteoarthritis',
        'problem': 'Right knee pain and stiffness, difficulty with stairs and prolonged walking.',
        'management': {'type': 'Conservative'},
        'pain': {'pre': '6', 'post': '4', 'nature': 'Dull aching',
                 'agg': 'Stairs, prolonged standing, squatting',
                 'ease': 'Rest, elevation, ice',
                 'behaviour24': 'Worse in evening after activity',
                 'irritability': 'Low'},
        'bodyChart': {'markers': [
            {'id': 1, 'zone': 'R thigh', 'type': 'ache', 'view': 'ant', 'x': 76, 'y': 170},
            {'id': 2, 'zone': 'R leg', 'type': 'sharp', 'view': 'ant', 'x': 84, 'y': 240},
        ], 'notes': 'Diffuse anteromedial knee pain'},
        'history': {
            'current': 'Insidious onset right knee pain 6 months ago. Gradual worsening. No mechanism of injury. Treated with NSAID with minimal relief.',
            'past': 'No previous knee problems. HTN diagnosed 2022.'
        },
        'specialQuestions': {
            'health': 'HTN — on Amlodipine 5mg OD',
            'pmhx': 'Hypertension 2022',
            'surgery': 'Nil',
            'investigation': 'X-ray right knee — medial joint space narrowing, osteophytes',
            'medication': 'Amlodipine 5mg OD, Arcoxia 90mg PRN',
            'occupation': 'Office clerk — prolonged sitting',
            'recreation': 'Badminton (stopped due to pain)',
            'social': 'Married, 2 children, lives in flat (3rd floor, stairs only)',
            'pacemaker': 'No'
        },
        'observation': {
            'general': 'Antalgic gait favouring right leg. Reduced stride length. No walking aid.',
            'local': 'Mild effusion right knee. No muscle wasting. Mild valgus alignment.'
        },
        'palpation': {
            'tenderness': 'Medial joint line Grade 2. Pes anserinus tenderness.',
            'temperature': 'Mild warmth over right knee',
            'muscle': 'Tight hamstrings bilaterally. VMO bulk reduced right vs left.',
            'joint': 'Mild effusion — fluctuation test positive'
        },
        'neurological': {
            'sensation': {'left': 'Intact', 'right': 'Intact', 'notes': ''},
            'reflex': {'left': 'Normal', 'right': 'Normal', 'notes': ''},
            'motor': {'left': '5/5', 'right': '4/5 quadriceps', 'notes': 'VMO weakness right'}
        },
        'movement': {
            'table': [
                {'joint':'Knee','side':'Right (affected)','plane':'Flexion','activeRom':'0-105°','activePain':'VAS 4 at end range','passiveRom':'0-110°','passivePain':'VAS 3','resisted':'Weak, pain-free'},
                {'joint':'Knee','side':'Left (unaffected)','plane':'Flexion','activeRom':'0-135°','activePain':'Nil','passiveRom':'0-140°','passivePain':'Nil','resisted':'Strong, pain-free'},
                {'joint':'Knee','side':'Right (affected)','plane':'Extension','activeRom':'10-0° (lag)','activePain':'Nil','passiveRom':'0°','passivePain':'Nil','resisted':'Weak Grade 4-'},
            ],
            'muscle': 'Quadriceps 4-/5 right, 5/5 left. Hamstrings 4+/5 bilateral.',
            'accessory': 'Medial glide — hypomobile. Lateral glide — normal.',
            'clearing': 'Hip ROM full and pain-free bilaterally.',
            'special': 'McMurray negative. Lachman negative. Patella grind positive.'
        },
        'plan': {
            'impression': 'Right knee OA with VMO weakness and reduced ROM. Low irritability.',
            'stg': 'Reduce pain to VAS 3 within 2 weeks. Improve knee flexion to 120°.',
            'ltg': 'Independent ambulation without pain. Return to badminton in 3 months.',
            'treatment': 'Quadriceps strengthening (VMO focus). Hydrotherapy. Manual therapy — patellar and tibial mobilisation. HEP: quad sets, SLR, wall slides. Ice post-exercise.',
            'remarks': 'Advise weight management. Avoid squatting and kneeling.'
        }
    }
    r1 = ins_record(conn, e1, 'MS', 'Ahmad Razif bin Hamdan', '880514076231', TODAY, ms_data)
    ins_soap(conn, e1, 1, '2026-04-08',
        'Pain VAS 5/10. Reports improvement with ice. Difficulty with stairs persists.',
        'Knee flexion improved to 112°. Mild effusion remains. VMO 4/5.',
        'Improving. ROM gaining. Strength still deficient.',
        'Continue strengthening. Add step-up exercises. Review in 1 week.')
    ins_soap(conn, e1, 2, '2026-04-15',
        'Pain VAS 4/10. Stairs easier. Still avoids squatting.',
        'Flexion 118°. Effusion reduced. VMO 4+/5. Gait improved.',
        'Good progress. Functional improvement noted.',
        'Progress to closed chain exercises. Begin proprioception training.')

    # ── 2. MS patient — shoulder (discharged) ─────────────────────
    p2 = ins_patient(conn, 'Siti Norzahira binti Malik', '950302106542', '1995-03-02', 'F')
    e2 = ins_episode(conn, p2, 'MS', '2026-02-10', 'discharged|Goals achieved')
    ms_data2 = {
        '_form_type': 'MS',
        'meta': {'form': 'MS', 'ref': 'fisio/b.pen.14/Pind.1/2019', 'saved': NOW},
        'patient': {'type':'local','name':'Siti Norzahira binti Malik','nric':'950302106542',
                    'passport':'','country':'','dob':'1995-03-02','date':'2026-02-10','age':'31','sex':'F'},
        'diagnosis': 'Left rotator cuff tendinopathy',
        'problem': 'Left shoulder pain and restricted ROM.',
        'management': {'type': 'Conservative'},
        'pain': {'pre': '5', 'post': '2', 'nature': 'Aching with sharp on movement',
                 'agg': 'Overhead activities, reaching behind back',
                 'ease': 'Rest, analgesia',
                 'behaviour24': 'Disturbs sleep when lying on left side',
                 'irritability': 'Medium'},
        'bodyChart': {'markers': [
            {'id': 1, 'zone': 'Neck / Shoulder', 'type': 'ache', 'view': 'ant', 'x': 32, 'y': 45},
        ], 'notes': 'Left shoulder anterolateral pain'},
        'history': {
            'current': 'Left shoulder pain onset 3 months ago after carrying heavy files. Gradual worsening.',
            'past': 'No previous shoulder problems.'
        },
        'specialQuestions': {
            'health': 'Generally well', 'pmhx': 'Nil', 'surgery': 'Nil',
            'investigation': 'X-ray shoulder — normal bony alignment',
            'medication': 'Ibuprofen 400mg PRN',
            'occupation': 'Administrative officer — keyboard work',
            'recreation': 'Nil significant', 'social': 'Single, lives with parents',
            'pacemaker': 'No'
        },
        'observation': {
            'general': 'Holds left arm guarded, slightly abducted.',
            'local': 'No wasting. Mild swelling over anterior shoulder.'
        },
        'palpation': {'tenderness': 'Supraspinatus tendon Grade 2. Bicipital groove tenderness.', 'temperature': 'Normal', 'muscle': 'Upper trapezius tightness left > right', 'joint': 'Nil'},
        'neurological': {'sensation': {'left': 'Intact', 'right': 'Intact', 'notes': ''}, 'reflex': {'left': 'Normal', 'right': 'Normal', 'notes': ''}, 'motor': {'left': '4/5 abduction', 'right': '5/5', 'notes': ''}},
        'movement': {
            'table': [
                {'joint':'Shoulder','side':'Left (affected)','plane':'Abduction','activeRom':'0-110°','activePain':'Painful arc 70-120°','passiveRom':'0-150°','passivePain':'End range','resisted':'Weak, pain'},
                {'joint':'Shoulder','side':'Right (unaffected)','plane':'Abduction','activeRom':'0-170°','activePain':'Nil','passiveRom':'0-175°','passivePain':'Nil','resisted':'Strong, nil'},
            ],
            'muscle': 'Supraspinatus 3+/5 left. Infraspinatus 4/5 left.',
            'accessory': 'GH inferior glide — hypomobile left.',
            'clearing': 'Cervical spine clear. Elbow full ROM.',
            'special': 'Hawkins-Kennedy positive left. Empty can positive left. Speed test negative.'
        },
        'plan': {
            'impression': 'Left rotator cuff tendinopathy with supraspinatus involvement.',
            'stg': 'Reduce pain to VAS 2. Restore full painless ROM.',
            'ltg': 'Return to full work capacity. Full overhead function.',
            'treatment': 'Rotator cuff strengthening. Posterior capsule stretch. Manual therapy GH joint. Posture correction. HEP.',
            'remarks': 'Ergonomic advice for workstation.'
        }
    }
    ins_record(conn, e2, 'MS', 'Siti Norzahira binti Malik', '950302106542', '2026-02-10', ms_data2)

    # ── 3. Spine patient — LBP ────────────────────────────────────
    p3 = ins_patient(conn, 'Mohamad Faizal bin Zainudin', '791108075431', '1979-11-08', 'M')
    e3 = ins_episode(conn, p3, 'SPINE', '2026-04-10')
    spine_data = {
        '_form_type': 'spine',
        'meta': {'form': 'SPINE', 'ref': 'fisio/b.pen.6/Pind.2/2019', 'saved': NOW},
        'patient': {'type':'local','name':'Mohamad Faizal bin Zainudin','nric':'791108075431',
                    'passport':'','country':'','dob':'1979-11-08','date':TODAY,'age':'46','sex':'M'},
        'diagnosis': 'Lumbar disc prolapse L4/L5 with right-sided radiculopathy',
        'problem': 'Lower back pain with radiation to right leg. Numbness right foot.',
        'management': {'type': 'Conservative'},
        'pain': {'pre': '7', 'post': '5', 'nature': 'Dull aching with sharp on movement',
                 'agg': 'Bending forward, prolonged sitting, coughing',
                 'ease': 'Lying flat, extension exercises',
                 'behaviour24': 'Worse in morning, eases after 30 min. Worsens again in evening.',
                 'irritability': 'Medium', 'area': 'Lumbar with right leg radiation'},
        'bodyChart': {'markers': [
            {'id': 1, 'zone': 'Lumbar / Lower back', 'type': 'ache', 'view': 'post', 'x': 65, 'y': 130},
            {'id': 2, 'zone': 'R hamstring', 'type': 'refer', 'view': 'post', 'x': 76, 'y': 180},
            {'id': 3, 'zone': 'R calf', 'type': 'refer', 'view': 'post', 'x': 84, 'y': 245},
        ], 'notes': 'L4/L5 distribution right leg'},
        'history': {
            'current': 'Acute onset LBP 3 weeks ago after lifting heavy box at work. Immediate pain, unable to straighten. Leg pain developed 1 week later.',
            'past': 'Similar episode 2018 — resolved with rest and physio.'
        },
        'specialQuestions': {
            'health': 'Generally well. DM Type 2.',
            'pmhx': 'DM Type 2 (2020). Previous LBP 2018.',
            'surgery': 'Nil',
            'investigation': 'MRI lumbar spine — L4/L5 disc prolapse, right-sided, moderate canal compromise',
            'medication': 'Metformin 500mg BD, Arcoxia 90mg OD, Neurobion',
            'ce': 'Negative — bladder and bowel intact, no saddle anaesthesia',
            'bedPillow': 'Firm mattress, one pillow, sleeps supine',
            'occupation': 'Factory supervisor — prolonged standing, lifting',
            'recreation': 'Football (stopped due to pain)',
            'social': 'Married, 3 children, lives in single-storey house',
            'pacemaker': 'No'
        },
        'observation': {
            'general': 'Antalgic posture, leans to left. Reduced lumbar lordosis. Slow guarded movement.',
            'local': 'Paravertebral muscle spasm L3-S1 right > left. No scoliosis at rest.'
        },
        'palpation': {
            'tenderness': 'L4/L5 interspinous Grade 3. Right paraspinal muscles Grade 2.',
            'temperature': 'Mild warmth L4/L5',
            'muscle': 'Significant right paraspinal spasm. Piriformis tightness right.',
            'joint': 'Step deformity absent. PSIS level.'
        },
        'neurological': {
            'sensation': {'left': 'Intact', 'right': 'Reduced L5 dermatomal distribution (dorsum foot)', 'notes': 'Hypoaesthesia right L5'},
            'reflex': {'left': 'Normal', 'right': 'Patella normal. Achilles diminished.', 'notes': 'R Achilles Grade 1+'},
            'motor': {'left': '5/5', 'right': 'EHL 4/5, Tibialis anterior 4/5', 'notes': 'R L4/L5 myotomal weakness'}
        },
        'spineMovement': [
            {'movement': 'Flexion', 'activeRom': '30°', 'activePain': 'VAS 6, peripheralises', 'passiveRom': '35°', 'overpress': 'Not tested', 'endFeel': 'Muscle spasm'},
            {'movement': 'Extension', 'activeRom': '15°', 'activePain': 'VAS 3, centralises', 'passiveRom': '20°', 'overpress': 'Mild increase', 'endFeel': 'Firm'},
            {'movement': 'Lateral Flexion (L)', 'activeRom': '20°', 'activePain': 'Nil', 'passiveRom': '25°', 'overpress': 'Nil', 'endFeel': 'Normal'},
            {'movement': 'Lateral Flexion (R)', 'activeRom': '10°', 'activePain': 'VAS 4, leg pain', 'passiveRom': '12°', 'overpress': 'Not tested', 'endFeel': 'Muscle'},
            {'movement': 'Rotation (L)', 'activeRom': 'AFROM', 'activePain': 'Nil', 'passiveRom': 'AFROM', 'overpress': 'Nil', 'endFeel': 'Normal'},
            {'movement': 'Rotation (R)', 'activeRom': 'AFROM', 'activePain': 'Nil', 'passiveRom': 'AFROM', 'overpress': 'Nil', 'endFeel': 'Normal'},
        ],
        'accessory': {
            'notes': 'Central PA L4/5 — reproduces right leg symptoms Grade III. Unilateral PA L4/5 right — Grade III, symptom reproduction.',
            'cervical': {}, 'thoracic': {},
            'lumbar': {
                'L3': {'central': 'Grade II', 'unilateral': 'Grade I', 'pain': 'Local only'},
                'L4': {'central': 'Grade III', 'unilateral': 'Grade II', 'pain': 'Local + right leg'},
                'L5': {'central': 'Grade III', 'unilateral': 'Grade III', 'pain': 'Reproduces leg symptoms'},
                'S1': {'central': 'Grade I', 'unilateral': 'Grade I', 'pain': 'Nil'},
            }
        },
        'neurodynamic': {
            'tests': {
                'slr': {'leftNeck': 'N/A', 'rightNeck': 'N/A', 'leftBack': '-ve 80°', 'rightBack': '+ve 40° — reproduces leg pain'},
                'pkb': {'leftNeck': 'N/A', 'rightNeck': 'N/A', 'leftBack': '-ve', 'rightBack': '-ve'},
                'pnf': {'leftNeck': '-ve', 'rightNeck': '-ve', 'leftBack': 'N/A', 'rightBack': 'N/A'},
            },
            'notes': 'Right SLR sensitised with dorsiflexion and neck flexion — neural mechanosensitivity confirmed.'
        },
        'plan': {
            'impression': 'L4/L5 disc prolapse with right L5 radiculopathy. Neural mechanosensitivity. Medium irritability. Directional preference — extension.',
            'stg': 'Centralise and reduce leg pain within 1 week. Improve SLR to 60°. Reduce VAS to 4/10.',
            'ltg': 'Full pain-free ROM. Return to work in 6 weeks. Independent HEP.',
            'treatment': 'McKenzie extension protocol. Neural mobilisation (slider technique). PA mobilisation L4/5 Grade II-III. Core stabilisation. Ergonomic advice. HEP: prone lying, extension exercises, nerve sliders.'
        },
        'movement': {'clearing': 'Hip ROM full and pain-free bilaterally. SIJ provocation tests negative.'}
    }
    r3 = ins_record(conn, e3, 'SPINE', 'Mohamad Faizal bin Zainudin', '791108075431', TODAY, spine_data)
    ins_soap(conn, e3, 1, '2026-04-17',
        'Leg pain reduced slightly. LBP unchanged. Extension exercises helping.',
        'SLR improved to 50° right. Extension 20°. Flexion still limited 35°.',
        'Early centralisation. Positive response to McKenzie protocol.',
        'Continue extension protocol. Progress PA Grade III. Neural sliders.')

    # ── 4. Spine patient — neck pain ──────────────────────────────
    p4 = ins_patient(conn, 'Nurul Ain binti Roslan', '001015086620', '2000-10-15', 'F')
    e4 = ins_episode(conn, p4, 'SPINE', '2026-04-15')
    spine_data2 = {
        '_form_type': 'spine',
        'meta': {'form': 'SPINE', 'ref': 'fisio/b.pen.6/Pind.2/2019', 'saved': NOW},
        'patient': {'type':'local','name':'Nurul Ain binti Roslan','nric':'001015086620',
                    'passport':'','country':'','dob':'2000-10-15','date':TODAY,'age':'25','sex':'F'},
        'diagnosis': 'Cervical spondylosis C5/C6 with left arm referral',
        'problem': 'Neck pain with left arm aching and occasional tingling fingers.',
        'management': {'type': 'Conservative'},
        'pain': {'pre': '5', 'post': '3', 'nature': 'Dull constant with sharp on rotation',
                 'agg': 'Looking over left shoulder, prolonged screen work',
                 'ease': 'Heat, gentle movement',
                 'behaviour24': 'Stiff in morning, eases. Worsens afternoon at desk.',
                 'irritability': 'Low', 'area': 'Cervical with left C6 referral'},
        'bodyChart': {'markers': [
            {'id': 1, 'zone': 'Neck / Shoulder', 'type': 'ache', 'view': 'post', 'x': 65, 'y': 38},
            {'id': 2, 'zone': 'L arm (post)', 'type': 'refer', 'view': 'post', 'x': 20, 'y': 80},
        ], 'notes': 'C6 dermatomal distribution left arm'},
        'history': {
            'current': 'Gradual onset neck pain 2 months ago. Works 10hr/day at computer. Posture issues.',
            'past': 'No significant neck history. Occasional tension headaches.'
        },
        'specialQuestions': {
            'health': 'Generally well', 'pmhx': 'Nil', 'surgery': 'Nil',
            'investigation': 'X-ray cervical — reduced C5/C6 disc height, mild osteophytes',
            'medication': 'Ponstan 500mg PRN',
            'ce': 'Nil — no myelopathy signs',
            'bedPillow': 'Soft pillow, tends to sleep prone',
            'occupation': 'Graphic designer — prolonged screen use, poor ergonomics',
            'recreation': 'Gaming (4-6hrs/day)', 'social': 'Single, lives alone',
            'pacemaker': 'No'
        },
        'observation': {
            'general': 'Forward head posture, protracted shoulders. Reduced cervical lordosis.',
            'local': 'Upper trapezius hypertonic bilateral. Left SCM tightness.'
        },
        'palpation': {
            'tenderness': 'C5/C6 facet joint left Grade 2. Upper trapezius trigger points bilateral.',
            'temperature': 'Normal',
            'muscle': 'Levator scapulae tightness left. Suboccipital muscle tightness.',
            'joint': 'C5/C6 PA stiff'
        },
        'neurological': {
            'sensation': {'left': 'Slightly reduced C6 (thumb, index)', 'right': 'Intact', 'notes': 'Hypoaesthesia left C6 dermatomal'},
            'reflex': {'left': 'Biceps diminished', 'right': 'Normal', 'notes': 'Left C6 reflex arc reduced'},
            'motor': {'left': 'Wrist extension 4+/5', 'right': '5/5', 'notes': 'Mild left C6 myotomal weakness'}
        },
        'spineMovement': [
            {'movement': 'Flexion', 'activeRom': 'AFROM', 'activePain': 'Nil', 'passiveRom': 'AFROM', 'overpress': 'Nil', 'endFeel': 'Normal'},
            {'movement': 'Extension', 'activeRom': '40°', 'activePain': 'VAS 3', 'passiveRom': '45°', 'overpress': 'Reproduces arm pain', 'endFeel': 'Firm'},
            {'movement': 'Lateral Flexion (L)', 'activeRom': '30°', 'activePain': 'VAS 4', 'passiveRom': '35°', 'overpress': 'Not tested', 'endFeel': 'Muscle'},
            {'movement': 'Lateral Flexion (R)', 'activeRom': 'AFROM', 'activePain': 'Nil', 'passiveRom': 'AFROM', 'overpress': 'Nil', 'endFeel': 'Normal'},
            {'movement': 'Rotation (L)', 'activeRom': '50°', 'activePain': 'VAS 3', 'passiveRom': '55°', 'overpress': 'Increases arm symptoms', 'endFeel': 'Muscle'},
            {'movement': 'Rotation (R)', 'activeRom': 'AFROM', 'activePain': 'Nil', 'passiveRom': 'AFROM', 'overpress': 'Nil', 'endFeel': 'Normal'},
        ],
        'accessory': {
            'notes': 'C5/C6 central PA Grade II reproduces neck pain. C5/C6 left unilateral PA Grade II reproduces arm referral.',
            'cervical': {
                'C5': {'central': 'Grade II', 'unilateral': 'Grade II', 'pain': 'Local + left arm'},
                'C6': {'central': 'Grade II', 'unilateral': 'Grade III', 'pain': 'Reproduces arm referral'},
                'C7': {'central': 'Grade I', 'unilateral': 'Grade I', 'pain': 'Nil'},
            }, 'thoracic': {}, 'lumbar': {}
        },
        'neurodynamic': {
            'tests': {
                'ultt1': {'leftNeck': '+ve', 'rightNeck': '-ve', 'leftBack': 'N/A', 'rightBack': 'N/A'},
                'ultt2a': {'leftNeck': '+ve', 'rightNeck': '-ve', 'leftBack': 'N/A', 'rightBack': 'N/A'},
                'pnf': {'leftNeck': '-ve', 'rightNeck': '-ve', 'leftBack': 'N/A', 'rightBack': 'N/A'},
            },
            'notes': 'ULTT1 and 2a positive left — median nerve bias. Sensitised with contralateral lateral flexion.'
        },
        'plan': {
            'impression': 'Cervical spondylosis C5/C6 with left C6 radiculopathy. Low irritability. Neural mechanosensitivity.',
            'stg': 'Reduce arm referral within 2 weeks. Improve cervical rotation to 65° left.',
            'ltg': 'Full pain-free cervical ROM. Independent ergonomic management. Return to gaming without symptoms.',
            'treatment': 'C5/C6 PA mobilisation Grade II-III. Neural mobilisation (median nerve). Deep neck flexor strengthening. Postural correction. Ergonomic advice. HEP.'
        },
        'movement': {'clearing': 'Shoulder ROM full and pain-free bilaterally. Thoracic spine — mild stiffness extension, no symptoms reproduced.'}
    }
    ins_record(conn, e4, 'SPINE', 'Nurul Ain binti Roslan', '001015086620', TODAY, spine_data2)

    # ── 5. Geriatric patient ──────────────────────────────────────
    p5 = ins_patient(conn, 'Hajah Rohani binti Daud', '480630106524', '1948-06-30', 'F')
    e5 = ins_episode(conn, p5, 'GERIATRIC', '2026-04-05')
    ger_data = {
        '_form_type': 'geriatric',
        'patient': {'type':'local','name':'Hajah Rohani binti Daud','nric':'480630106524',
                    'passport':'','country':'','dob':'1948-06-30','date':TODAY,'age':'77','sex':'F',
                    'rn':'480630106524'},
        'dx_diagnosis': 'Generalised deconditioning with bilateral knee OA post right THR 2024',
        'dx_mgmt_type': 'Surgical',
        'dx_surgery_date': '2024-08-15',
        'dx_surgery_details': 'Right Total Hip Replacement (THR) — cemented',
        'complaint': 'Difficulty walking, frequent falls, generalised weakness since discharge from orthopaedic ward.',
        'hx_current': 'Patient admitted 3/2026 for elective right THR. Post-op complicated by prolonged bed rest and deconditioning. Discharged home but unable to mobilise independently. Referred to physio for rehabilitation.',
        'hx_past': 'Bilateral knee OA diagnosed 2019. Right hip OA 2022. HTN, DM Type 2, HLD.',
        'fall_hx': 'Yes',
        'fall_hospitalised': True, 'fall_fear': True, 'fall_fracture': False,
        'fall_injury': False, 'fall_none': False,
        'fall_consequence_other': 'Required hospital admission post-fall Jan 2026',
        'aid_frame': True, 'aid_none': False, 'aid_stick': False,
        'aid_quadripod': False, 'aid_wheelchair': False,
        'aid_others': '',
        'incon_bladder': 'Yes', 'incon_bowel': 'No',
        'incon_stress': True, 'incon_urge': False, 'incon_mixed': False,
        'diaper': 'Yes', 'diaper_day': False, 'diaper_night': True,
        'dominant_hand': 'Right',
        'cognitive': 'No', 'cognitive_test': 'MMSE 27/30 — mild forgetfulness only',
        'communication': 'None',
        'deficit_visual': True, 'deficit_hearing': False,
        'deficit_none': False,
        'device_spectacles': True, 'device_pacemaker': False,
        'device_hearing_aid': False, 'device_dentures': True,
        'med_hpt': True, 'med_dm': True, 'med_ccf': False,
        'med_ihd': False, 'med_pvd': False, 'med_copd': False,
        'med_dementia': False, 'med_pd': False,
        'med_cva_rt': False, 'med_cva_lt': False,
        'med_oa': True, 'med_fracture': False,
        'social_hx': 'Lives with daughter and son-in-law in double-storey house. Main support from daughter. Has 6 grandchildren.',
        'prev_surgery': 'Yes',
        'surgery_area': 'Right THR 2024, Appendectomy 1985',
        'investigations': 'X-ray right hip post-THR — good prosthesis position. X-ray bilateral knee — severe OA, joint space narrowing.',
        'medication': 'Amlodipine 5mg OD, Metformin 500mg BD, Simvastatin 20mg ON, Calcium+Vit D, Arcoxia 60mg PRN',
        'main_carer': 'Daughter',
        'carer_other': '',
        'premorbid_mobility': 'Semi Independent',
        'current_mobility': 'Dependent',
        'home_lift': False, 'home_stairs': True, 'home_kerbs': True, 'home_ground': False,
        'toilet_sitting': True, 'toilet_squatting': False, 'toilet_commode': False,
        'body_chart': {'markers': [
            {'id': 1, 'zone': 'R thigh', 'type': 'ache', 'view': 'ant', 'x': 76, 'y': 170},
            {'id': 2, 'zone': 'R hamstring', 'type': 'ache', 'view': 'post', 'x': 76, 'y': 180},
        ], 'notes': 'Right hip surgical site — healing well'},
        'chart_notes': 'Right THR scar well-healed',
        'pain_present': 'Yes', 'pain_score': '4',
        'pain_site': 'Right hip and bilateral knees',
        'pain_nature': 'constant', 'pain_type': 'dull', 'pain_history': 'Improving',
        'obj_posture': 'Kyphotic posture. Antalgic gait with walking frame. Short stride length. Reduced cadence.',
        'mob_bed': 'Min A', 'mob_sitting': 'Sup',
        'mob_standing': 'Min A', 'mob_transfer': 'Mod A',
        'obj_lungs': 'Clear air entry bilaterally. No wheeze or crepitation.',
        'obj_strength': 'UL: AFROM, 4/5 bilateral. LL: Hip abductors 3/5 right, 4/5 left. Quadriceps 3+/5 bilateral. Hamstrings 4/5 bilateral.',
        'rom_contracture': 'Present',
        'rom_notes': 'Hip flexion right limited to 90° (THR precaution). Bilateral knee flexion contracture ~10°.',
        'reflex_sensation': 'Intact',
        'reflex_notes': '',
        'om_berg': '28', 'om_na_berg': False,
        'om_tug': '24.5', 'om_na_tug': False,
        'om_sls': '4', 'om_na_sls': False,
        'om_grip_r': '12.4', 'om_grip_l': '11.8', 'om_na_grip': False,
        'om_ftsst': '32.1', 'om_na_ftsst': False,
        'om_ems': '9', 'om_na_ems': False,
        'om_poma': 'Dependent for all mobility. High fall risk. Requires frame and assistance.',
        'om_na_poma': False,
        'om_walk': 'N/A', 'om_na_walk': True,
        'om_gait_sec': '', 'om_gait_steps': '', 'om_na_gait': True,
        'om_reach_r': '-12', 'om_reach_l': '-10', 'om_na_reach': False,
        'om_notes': '6-min walk test not performed — patient unable to complete due to fatigue and deconditioning.',
        'plan_impression': 'Severe deconditioning post right THR with bilateral knee OA. High fall risk (Berg 28/56, TUG 24.5s, EMS 9/20). Reduced lower limb strength and balance.',
        'plan_stg': 'Improve bed mobility to Sup within 1 week. Improve standing balance with frame. Reduce fall risk. Strengthen lower limbs.',
        'plan_ltg': 'Ambulate independently with walking frame on level surfaces within 6 weeks. Climb stairs with assistance. Improve Berg to >40.',
        'plan_tx': 'Bed mobility exercises. Sit-to-stand practice. Hip strengthening (THR precautions observed — no adduction past midline, no hip flexion >90°). Quadriceps strengthening. Balance training. Gait re-education with frame. Fall prevention education for patient and carer. HEP 3x/day.',
        'consent_agree': 'Yes', 'consent_edu': 'Yes',
    }
    r5 = ins_record(conn, e5, 'GERIATRIC', 'Hajah Rohani binti Daud', '480630106524', TODAY, ger_data)
    ins_soap(conn, e5, 1, '2026-04-12',
        'Reports pain 4/10 right hip. Fatigue after minimal activity. Anxious about falling.',
        'Bed mobility Min A. Sit-to-stand with frame 3x completed. Standing balance 30s with frame. HR stable.',
        'Early rehabilitation. Significant deconditioning. Cooperative and motivated.',
        'Continue bed mobility. Increase sit-to-stand reps. Begin step training next session.')
    ins_soap(conn, e5, 2, '2026-04-19',
        'Pain improved to 3/10. Less anxious. Daughter reports she is doing HEP.',
        'Sit-to-stand 10x independent with frame. Standing balance 60s. Ambulated 10m with frame Min A.',
        'Good progress. Strength improving. Endurance still limited.',
        'Progress ambulation distance. Begin stair training. Review TUG next session.')

    # ── 6. Geriatric patient — Parkinson's ───────────────────────
    p6 = ins_patient(conn, 'Lim Ah Kow', '520318082531', '1952-03-18', 'M')
    e6 = ins_episode(conn, p6, 'GERIATRIC', '2026-03-20')
    ger_data2 = {
        '_form_type': 'geriatric',
        'patient': {'type':'local','name':'Lim Ah Kow','nric':'520318082531',
                    'passport':'','country':'','dob':'1952-03-18','date':'2026-03-20','age':'74','sex':'M',
                    'rn':'520318082531'},
        'dx_diagnosis': "Parkinson's disease with freezing of gait",
        'dx_mgmt_type': 'Conservative',
        'complaint': 'Frequent falls, shuffling gait, difficulty initiating movement.',
        'hx_current': "Parkinson's disease diagnosed 2019. Increasing falls frequency over last 6 months (4 falls, 2 requiring hospital attendance). Freezing episodes increasing.",
        'hx_past': "Parkinson's disease 2019. HTN. Previous fall with left wrist fracture 2025.",
        'fall_hx': 'Yes',
        'fall_hospitalised': True, 'fall_fear': True,
        'fall_fracture': True, 'fall_injury': False, 'fall_none': False,
        'fall_consequence_other': 'Left wrist fracture 2025',
        'aid_frame': False, 'aid_stick': True, 'aid_quadripod': False,
        'aid_none': False, 'aid_wheelchair': False,
        'incon_bladder': 'Yes', 'incon_bowel': 'No',
        'incon_stress': False, 'incon_urge': True, 'incon_mixed': False,
        'diaper': 'No', 'diaper_day': False, 'diaper_night': False,
        'dominant_hand': 'Right',
        'cognitive': 'Yes', 'cognitive_test': 'MMSE 24/30 — mild cognitive impairment',
        'communication': 'None',
        'deficit_visual': False, 'deficit_hearing': True, 'deficit_none': False,
        'device_hearing_aid': True, 'device_spectacles': True,
        'device_pacemaker': False, 'device_dentures': False,
        'med_hpt': True, 'med_dm': False, 'med_pd': True,
        'med_ccf': False, 'med_ihd': False, 'med_pvd': False,
        'med_copd': False, 'med_dementia': False,
        'med_cva_rt': False, 'med_cva_lt': False, 'med_oa': False, 'med_fracture': False,
        'social_hx': 'Lives with wife. Son visits weekly. Wife is primary carer but elderly herself (72yo).',
        'prev_surgery': 'No', 'surgery_area': '',
        'investigations': 'DaTscan confirmed dopaminergic deficit 2019. Brain MRI 2022 — no new lesions.',
        'medication': 'Levodopa/Carbidopa 100/25mg TDS, Amlodipine 5mg OD, Rasagiline 1mg OD',
        'main_carer': 'Wife', 'carer_other': '',
        'premorbid_mobility': 'Semi Independent',
        'current_mobility': 'Dependent',
        'home_lift': False, 'home_stairs': False, 'home_kerbs': True, 'home_ground': True,
        'toilet_sitting': True, 'toilet_squatting': False, 'toilet_commode': False,
        'body_chart': {'markers': [], 'notes': ''},
        'chart_notes': '',
        'pain_present': 'No', 'pain_score': '0', 'pain_site': '',
        'pain_nature': '', 'pain_type': '', 'pain_history': '',
        'obj_posture': 'Stooped posture, kyphosis. Shuffling gait, reduced arm swing bilateral. Festination noted. Freezing at doorways.',
        'mob_bed': 'Mod A', 'mob_sitting': 'Min A',
        'mob_standing': 'Min A', 'mob_transfer': 'Min A',
        'obj_lungs': 'Clear air entry bilaterally.',
        'obj_strength': 'UL: AFROM with rigidity. LL: AFROM with rigidity. Bradykinesia noted all limbs.',
        'rom_contracture': 'Present',
        'rom_notes': 'Bilateral hip and knee flexion contractures. Thoracic kyphosis fixed.',
        'reflex_sensation': 'Intact', 'reflex_notes': '',
        'om_berg': '32', 'om_na_berg': False,
        'om_tug': '22.4', 'om_na_tug': False,
        'om_sls': '3', 'om_na_sls': False,
        'om_grip_r': '18.2', 'om_grip_l': '16.4', 'om_na_grip': False,
        'om_ftsst': '28.6', 'om_na_ftsst': False,
        'om_ems': '11', 'om_na_ems': False,
        'om_poma': 'Shuffling gait, festination, freezing at thresholds. High fall risk.',
        'om_na_poma': False,
        'om_walk': '95', 'om_na_walk': False,
        'om_gait_sec': '18.2', 'om_gait_steps': '34', 'om_na_gait': False,
        'om_reach_r': '-8', 'om_reach_l': '-9', 'om_na_reach': False,
        'om_notes': '',
        'plan_impression': "Parkinson's disease with significant freezing of gait and high fall risk. Berg 32/56 moderate risk. TUG 22.4s high risk. Cognitive changes present.",
        'plan_stg': 'Reduce freezing episodes with cueing strategies. Improve gait speed. Berg >40 within 4 weeks.',
        'plan_ltg': 'Independent community ambulation with stick. Fall prevention. Carer education.',
        'plan_tx': 'Rhythmic auditory stimulation (RAS) for gait. Visual cuing (floor markers) for freezing. Large amplitude movement training (LSVT BIG principles). Balance training. Dual-task practice. Carer education on cueing and fall prevention. HEP.',
        'consent_agree': 'Yes', 'consent_edu': 'Yes',
    }
    ins_record(conn, e6, 'GERIATRIC', 'Lim Ah Kow', '520318082531', '2026-03-20', ger_data2)

    print("✓ 6 patients seeded")
    print("  1. Ahmad Razif — MS (knee OA) — active, 2 SOAPs")
    print("  2. Siti Norzahira — MS (shoulder) — DISCHARGED")
    print("  3. Mohamad Faizal — Spine (LBP L4/5 radiculopathy) — active, 1 SOAP")
    print("  4. Nurul Ain — Spine (cervical C5/6) — active")
    print("  5. Hajah Rohani — Geriatric (post THR deconditioning) — active, 2 SOAPs")
    print("  6. Lim Ah Kow — Geriatric (Parkinson's) — active")

# ── Main ──────────────────────────────────────────────────────────
if __name__ == '__main__':
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute('PRAGMA foreign_keys = ON')

    # Check if already seeded
    try:
        count = conn.execute('SELECT COUNT(*) FROM patients').fetchone()[0]
        if count > 0:
            print(f"Database already has {count} patients. Skipping seed.")
            print("Delete pt_data/records.db first if you want a fresh seed.")
            conn.close()
            sys.exit(0)
    except:
        pass

    init(conn)
    seed(conn)
    conn.close()
    print(f"\nDatabase created at: {DB_PATH}")
    print("Run the app normally — dummy data will be waiting.")
