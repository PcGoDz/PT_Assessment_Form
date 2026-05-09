"""
seed_db.py — 10 dummy patients with active episodes.
  python seed_db.py          — skips patients already in DB
  python seed_db.py --reset  — wipes seeded patients and re-inserts
"""
import sqlite3, json, os, sys
from datetime import datetime, timedelta

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'pt_data', 'records.db')
NOW = datetime.now().isoformat(timespec='seconds')

PATIENTS = [
    # name, ic, dob, sex, form_type, days_since_referral
    ('Ahmad Razif bin Hamdan',        '880514076231', '1988-05-14', 'M', 'MS',         14),
    ('Siti Norzahira binti Malik',    '950302106542', '1995-03-02', 'F', 'SPINE',        7),
    ('Mohamad Faizal bin Zainudin',   '791108075431', '1979-11-08', 'M', 'SPINE',        3),
    ('Nurul Ain binti Roslan',        '001015086620', '2000-10-15', 'F', 'MS',          21),
    ('Hajah Rohani binti Daud',       '480630106524', '1948-06-30', 'F', 'GERIATRIC',   30),
    ('Lim Ah Kow',                    '520318082531', '1952-03-18', 'M', 'GERIATRIC',    5),
    ('Rajendran a/l Subramaniam',     '710630085109', '1971-06-30', 'M', 'NEURO',        2),
    ('Lee Mei Ling',                  '880418105234', '1988-04-18', 'F', 'AMPUTATION',  10),
    ('Muhammad Hafiz bin Abdullah',   '990205034567', '1999-02-05', 'M', 'CR',           1),
    ('Priya a/p Krishnan',            '641120126042', '1964-11-20', 'F', 'GERIATRIC',   45),
]


def get_conn():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute('PRAGMA foreign_keys = ON')
    return conn


def ensure_schema(conn):
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
            created_at TEXT, updated_at TEXT, data_json TEXT NOT NULL,
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
            record_id INTEGER, action TEXT, changed_at TEXT, data_json TEXT
        );
    ''')
    for col, typedef in [
        ('next_appt',        "TEXT DEFAULT ''"),
        ('next_appt_time',   "TEXT DEFAULT ''"),
        ('discharge_reason', "TEXT DEFAULT ''"),
    ]:
        try:
            conn.execute(f'ALTER TABLE episodes ADD COLUMN {col} {typedef}')
        except sqlite3.OperationalError:
            pass
    conn.commit()


def seed(reset=False):
    conn = get_conn()
    ensure_schema(conn)

    if reset:
        ics = [p[1] for p in PATIENTS]
        rows = conn.execute(
            'SELECT id FROM patients WHERE ic IN ({})'.format(','.join('?'*len(ics))), ics
        ).fetchall()
        if rows:
            pids = [r['id'] for r in rows]
            ph = ','.join('?'*len(pids))
            conn.execute(f'DELETE FROM soap_notes WHERE episode_id IN (SELECT id FROM episodes WHERE patient_id IN ({ph}))', pids)
            conn.execute(f'DELETE FROM records    WHERE episode_id IN (SELECT id FROM episodes WHERE patient_id IN ({ph}))', pids)
            conn.execute(f'DELETE FROM episodes   WHERE patient_id IN ({ph})', pids)
            conn.execute(f'DELETE FROM patients   WHERE id         IN ({ph})', pids)
            conn.commit()
            print(f'Reset: removed {len(pids)} seeded patient(s).\n')

    added = skipped = 0
    for name, ic, dob, sex, form_type, days_ago in PATIENTS:
        if conn.execute('SELECT id FROM patients WHERE ic = ?', (ic,)).fetchone():
            print(f'  skip  {name}')
            skipped += 1
            continue

        ref = (datetime.now() - timedelta(days=days_ago)).strftime('%Y-%m-%d')
        pid = conn.execute(
            'INSERT INTO patients (name,ic,pt_type,dob,sex,created_at,updated_at) VALUES (?,?,?,?,?,?,?)',
            (name, ic, 'local', dob, sex, NOW, NOW)
        ).lastrowid
        conn.execute(
            'INSERT INTO episodes (patient_id,form_type,referral_date,status,created_at,updated_at) VALUES (?,?,?,?,?,?)',
            (pid, form_type, ref, 'active', NOW, NOW)
        )
        print(f'  added {name:<40} {form_type:<10} ref {ref}')
        added += 1

    conn.commit()
    conn.close()
    print(f'\n{added} added, {skipped} skipped.  DB: {DB_PATH}')


if __name__ == '__main__':
    seed(reset='--reset' in sys.argv)
