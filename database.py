import sqlite3
import json
from datetime import datetime


def get_conn(db_path):
    conn = sqlite3.connect(db_path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute('PRAGMA foreign_keys = ON')
    return conn


def init_db(db_path):
    conn = get_conn(db_path)

    # ── Patients ──────────────────────────────────
    conn.execute('''
        CREATE TABLE IF NOT EXISTS patients (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            name         TEXT    NOT NULL,
            ic           TEXT,
            passport     TEXT,
            pt_type      TEXT    NOT NULL DEFAULT 'local',
            dob          TEXT,
            sex          TEXT,
            country      TEXT,
            created_at   TEXT    NOT NULL,
            updated_at   TEXT    NOT NULL
        )
    ''')

    # ── Episodes (one per referral) ───────────────
    conn.execute('''
        CREATE TABLE IF NOT EXISTS episodes (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id     INTEGER NOT NULL,
            form_type      TEXT    NOT NULL DEFAULT 'MS',
            referral_date  TEXT,
            status         TEXT    NOT NULL DEFAULT 'active',
            created_at     TEXT    NOT NULL,
            updated_at     TEXT    NOT NULL,
            FOREIGN KEY (patient_id) REFERENCES patients(id)
        )
    ''')

    # ── Records (full assessment) ─────────────────
    conn.execute('''
        CREATE TABLE IF NOT EXISTS records (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            episode_id   INTEGER,
            form_type    TEXT    NOT NULL DEFAULT 'MS',
            patient_name TEXT,
            patient_rn   TEXT,
            patient_date TEXT,
            created_at   TEXT,
            updated_at   TEXT,
            data_json    TEXT    NOT NULL,
            FOREIGN KEY (episode_id) REFERENCES episodes(id)
        )
    ''')

    # ── SOAP follow-up notes ──────────────────────
    conn.execute('''
        CREATE TABLE IF NOT EXISTS soap_notes (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            episode_id   INTEGER NOT NULL,
            session_no   INTEGER NOT NULL DEFAULT 1,
            note_date    TEXT    NOT NULL,
            subjective   TEXT,
            objective    TEXT,
            analysis     TEXT,
            plan         TEXT,
            created_at   TEXT    NOT NULL,
            updated_at   TEXT    NOT NULL,
            FOREIGN KEY (episode_id) REFERENCES episodes(id)
        )
    ''')

    # ── Audit log ─────────────────────────────────
    conn.execute('''
        CREATE TABLE IF NOT EXISTS audit_log (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            record_id    INTEGER NOT NULL,
            action       TEXT    NOT NULL,
            changed_at   TEXT    NOT NULL,
            data_json    TEXT    NOT NULL
        )
    ''')

    conn.commit()
    conn.close()


# ══════════════════════════════════════════════════════════
# VALIDATION
# ══════════════════════════════════════════════════════════

REQUIRED_FIELDS = {
    'common': [
        ('patient.name', 'Patient name is required'),
        ('patient.date', 'Assessment date is required'),
    ],
    'MS':        [('diagnosis', 'Diagnosis is required')],
    'SPINE':     [('diagnosis', 'Diagnosis is required')],
    'GERIATRIC': [('diagnosis', 'Diagnosis is required')],
}


def validate_record(data):
    errors    = []
    patient   = data.get('patient', {})
    form_type = data.get('meta', {}).get('form', 'MS')

    for field, msg in REQUIRED_FIELDS.get('common', []):
        parts = field.split('.')
        val   = data
        for p in parts:
            val = val.get(p, {}) if isinstance(val, dict) else {}
        if not str(val).strip():
            errors.append(msg)

    pt_type = patient.get('type', 'local')
    if pt_type == 'local' and not patient.get('nric', '').strip():
        errors.append('NRIC is required for Malaysian patients')
    if pt_type == 'foreign' and not patient.get('passport', '').strip():
        errors.append('Passport number is required for foreign patients')

    for field, msg in REQUIRED_FIELDS.get(form_type, []):
        parts = field.split('.')
        val   = data
        for p in parts:
            val = val.get(p, {}) if isinstance(val, dict) else {}
        if not str(val).strip():
            errors.append(msg)

    return errors


# ══════════════════════════════════════════════════════════
# PATIENTS
# ══════════════════════════════════════════════════════════

def create_patient(db_path, patient_data):
    name = patient_data.get('name', '').strip()
    if not name:
        return None, ['Patient name is required']
    now  = datetime.now().isoformat(timespec='seconds')
    conn = get_conn(db_path)
    try:
        cur = conn.execute('''
            INSERT INTO patients
                (name, ic, passport, pt_type, dob, sex, country, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            name,
            patient_data.get('nric', ''),
            patient_data.get('passport', ''),
            patient_data.get('type', 'local'),
            patient_data.get('dob', ''),
            patient_data.get('sex', ''),
            patient_data.get('country', ''),
            now, now
        ))
        conn.commit()
        return cur.lastrowid, []
    except Exception as e:
        return None, [str(e)]
    finally:
        conn.close()


def search_patients(db_path, query=''):
    conn = get_conn(db_path)
    try:
        q    = '%' + query.strip() + '%'
        rows = conn.execute('''
            SELECT p.id, p.name, p.ic, p.passport, p.pt_type,
                   p.dob, p.sex, p.country, p.created_at,
                   COUNT(DISTINCT CASE WHEN e.status='active' THEN e.id END) as active_episodes, COUNT(DISTINCT e.id) as episode_count,
                   MAX(e.updated_at)     as last_visit
            FROM patients p
            LEFT JOIN episodes e ON e.patient_id = p.id
            WHERE LOWER(p.name) LIKE LOWER(?)
               OR p.ic       LIKE ?
               OR p.passport LIKE ?
            GROUP BY p.id
            ORDER BY p.name COLLATE NOCASE ASC
        ''', (q, q, q)).fetchall()
        return [dict(r) for r in rows], None
    except Exception as e:
        return [], str(e)
    finally:
        conn.close()


def get_patient(db_path, patient_id):
    conn = get_conn(db_path)
    try:
        row = conn.execute(
            'SELECT * FROM patients WHERE id=?', (patient_id,)
        ).fetchone()
        return (dict(row) if row else None), None
    except Exception as e:
        return None, str(e)
    finally:
        conn.close()


def delete_patient(db_path, patient_id):
    """Cascade delete patient and ALL related data. Irreversible."""
    conn = get_conn(db_path)
    try:
        # Get all episode IDs for this patient
        eps = conn.execute(
            'SELECT id FROM episodes WHERE patient_id=?', (patient_id,)
        ).fetchall()
        for ep in eps:
            eid = ep['id']
            # Delete SOAP notes
            conn.execute('DELETE FROM soap_notes WHERE episode_id=?', (eid,))
            # Get record IDs to clean audit log
            recs = conn.execute(
                'SELECT id FROM records WHERE episode_id=?', (eid,)
            ).fetchall()
            for rec in recs:
                conn.execute('DELETE FROM audit_log WHERE record_id=?', (rec['id'],))
            conn.execute('DELETE FROM records WHERE episode_id=?', (eid,))
        conn.execute('DELETE FROM episodes WHERE patient_id=?', (patient_id,))
        conn.execute('DELETE FROM patients WHERE id=?', (patient_id,))
        conn.commit()
        return True, None
    except Exception as e:
        return False, str(e)
    finally:
        conn.close()


def update_patient(db_path, patient_id, patient_data):
    now  = datetime.now().isoformat(timespec='seconds')
    conn = get_conn(db_path)
    try:
        conn.execute('''
            UPDATE patients
            SET name=?, ic=?, passport=?, pt_type=?,
                dob=?, sex=?, country=?, updated_at=?
            WHERE id=?
        ''', (
            patient_data.get('name', ''),
            patient_data.get('nric', ''),
            patient_data.get('passport', ''),
            patient_data.get('type', 'local'),
            patient_data.get('dob', ''),
            patient_data.get('sex', ''),
            patient_data.get('country', ''),
            now, patient_id
        ))
        conn.commit()
        return True, []
    except Exception as e:
        return False, [str(e)]
    finally:
        conn.close()


# ══════════════════════════════════════════════════════════
# EPISODES
# ══════════════════════════════════════════════════════════

def create_episode(db_path, patient_id, form_type='MS', referral_date=None):
    now  = datetime.now().isoformat(timespec='seconds')
    conn = get_conn(db_path)
    try:
        cur = conn.execute('''
            INSERT INTO episodes
                (patient_id, form_type, referral_date, status, created_at, updated_at)
            VALUES (?, ?, ?, 'active', ?, ?)
        ''', (patient_id, form_type, referral_date or now[:10], now, now))
        conn.commit()
        return cur.lastrowid, []
    except Exception as e:
        return None, [str(e)]
    finally:
        conn.close()


def get_patient_episodes(db_path, patient_id):
    conn = get_conn(db_path)
    try:
        rows = conn.execute('''
            SELECT e.id, e.form_type, e.referral_date, e.status,
                   e.created_at, e.updated_at,
                   COUNT(DISTINCT r.id) as has_assessment,
                   COUNT(DISTINCT s.id) as soap_count
            FROM episodes e
            LEFT JOIN records    r ON r.episode_id = e.id
            LEFT JOIN soap_notes s ON s.episode_id = e.id
            WHERE e.patient_id = ?
            GROUP BY e.id
            ORDER BY e.referral_date DESC
        ''', (patient_id,)).fetchall()
        return [dict(r) for r in rows], None
    except Exception as e:
        return [], str(e)
    finally:
        conn.close()


def get_episode(db_path, episode_id):
    conn = get_conn(db_path)
    try:
        row = conn.execute('''
            SELECT e.*, p.name as patient_name, p.ic, p.passport,
                   p.pt_type, p.dob, p.sex, p.country
            FROM episodes e
            JOIN patients p ON p.id = e.patient_id
            WHERE e.id = ?
        ''', (episode_id,)).fetchone()
        return (dict(row) if row else None), None
    except Exception as e:
        return None, str(e)
    finally:
        conn.close()


def update_episode_status(db_path, episode_id, status, reason=None):
    now  = datetime.now().isoformat(timespec='seconds')
    conn = get_conn(db_path)
    try:
        # Store discharge reason in status field if provided
        status_val = status
        if reason and status != 'active':
            status_val = status + '|' + reason
        conn.execute(
            'UPDATE episodes SET status=?, updated_at=? WHERE id=?',
            (status_val, now, episode_id)
        )
        conn.commit()
        return True, None
    except Exception as e:
        return False, str(e)
    finally:
        conn.close()


# ══════════════════════════════════════════════════════════
# RECORDS
# ══════════════════════════════════════════════════════════

def save_record(db_path, data):
    errors = validate_record(data)
    if errors:
        return None, errors

    now        = datetime.now().isoformat(timespec='seconds')
    patient    = data.get('patient', {})
    record_id  = data.get('id')
    episode_id = data.get('episode_id')

    conn = get_conn(db_path)
    try:
        if record_id:
            old = conn.execute(
                'SELECT data_json FROM records WHERE id=?', (record_id,)
            ).fetchone()
            if old:
                conn.execute('''
                    INSERT INTO audit_log (record_id, action, changed_at, data_json)
                    VALUES (?, ?, ?, ?)
                ''', (record_id, 'update', now, old['data_json']))
                conn.execute('''
                    DELETE FROM audit_log WHERE record_id=? AND id NOT IN (
                        SELECT id FROM audit_log WHERE record_id=?
                        ORDER BY changed_at DESC LIMIT 10
                    )
                ''', (record_id, record_id))
            conn.execute('''
                UPDATE records
                SET patient_name=?, patient_rn=?, patient_date=?,
                    updated_at=?, data_json=?, episode_id=?
                WHERE id=?
            ''', (
                patient.get('name', ''),
                patient.get('nric') or patient.get('passport', ''),
                patient.get('date', ''),
                now, json.dumps(data), episode_id, record_id
            ))
            if episode_id:
                conn.execute(
                    'UPDATE episodes SET updated_at=? WHERE id=?',
                    (now, episode_id)
                )
        else:
            cur = conn.execute('''
                INSERT INTO records
                    (episode_id, form_type, patient_name, patient_rn,
                     patient_date, created_at, updated_at, data_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                episode_id,
                data.get('meta', {}).get('form', 'MS'),
                patient.get('name', ''),
                patient.get('nric') or patient.get('passport', ''),
                patient.get('date', ''),
                now, now, json.dumps(data)
            ))
            record_id = cur.lastrowid
            conn.execute('''
                INSERT INTO audit_log (record_id, action, changed_at, data_json)
                VALUES (?, ?, ?, ?)
            ''', (record_id, 'create', now, json.dumps(data)))
            if episode_id:
                conn.execute(
                    'UPDATE episodes SET updated_at=? WHERE id=?',
                    (now, episode_id)
                )
        conn.commit()
        return record_id, []
    except Exception as e:
        return None, [str(e)]
    finally:
        conn.close()


def load_record(db_path, record_id):
    conn = get_conn(db_path)
    try:
        row = conn.execute(
            'SELECT data_json, episode_id FROM records WHERE id=?', (record_id,)
        ).fetchone()
        if not row:
            return None, 'Record not found'
        data = json.loads(row['data_json'])
        data['episode_id'] = row['episode_id']
        return data, None
    except Exception as e:
        return None, str(e)
    finally:
        conn.close()


def get_episode_record(db_path, episode_id):
    conn = get_conn(db_path)
    try:
        row = conn.execute(
            'SELECT id, data_json FROM records WHERE episode_id=?', (episode_id,)
        ).fetchone()
        if not row:
            return None, None
        data = json.loads(row['data_json'])
        data['id'] = row['id']
        return data, None
    except Exception as e:
        return None, str(e)
    finally:
        conn.close()


def list_records(db_path):
    """Legacy — kept for backward compat with sidebar."""
    conn = get_conn(db_path)
    try:
        rows = conn.execute('''
            SELECT id, form_type, patient_name, patient_rn,
                   patient_date, created_at, updated_at
            FROM records ORDER BY updated_at DESC
        ''').fetchall()
        return [dict(r) for r in rows], None
    except Exception as e:
        return [], str(e)
    finally:
        conn.close()


def delete_record(db_path, record_id):
    conn = get_conn(db_path)
    try:
        now = datetime.now().isoformat(timespec='seconds')
        row = conn.execute(
            'SELECT data_json FROM records WHERE id=?', (record_id,)
        ).fetchone()
        if row:
            conn.execute('''
                INSERT INTO audit_log (record_id, action, changed_at, data_json)
                VALUES (?, ?, ?, ?)
            ''', (record_id, 'delete', now, row['data_json']))
        conn.execute('DELETE FROM records WHERE id=?', (record_id,))
        conn.commit()
        return True, None
    except Exception as e:
        return False, str(e)
    finally:
        conn.close()


# ══════════════════════════════════════════════════════════
# SOAP NOTES
# ══════════════════════════════════════════════════════════

def save_soap(db_path, episode_id, soap_data):
    if not soap_data.get('note_date', '').strip():
        return None, ['Note date is required']

    now     = datetime.now().isoformat(timespec='seconds')
    soap_id = soap_data.get('id')
    conn    = get_conn(db_path)
    try:
        if soap_id:
            conn.execute('''
                UPDATE soap_notes
                SET note_date=?, subjective=?, objective=?,
                    analysis=?, plan=?, updated_at=?
                WHERE id=?
            ''', (
                soap_data.get('note_date', ''),
                soap_data.get('subjective', ''),
                soap_data.get('objective', ''),
                soap_data.get('analysis', ''),
                soap_data.get('plan', ''),
                now, soap_id
            ))
        else:
            row = conn.execute(
                'SELECT MAX(session_no) as mx FROM soap_notes WHERE episode_id=?',
                (episode_id,)
            ).fetchone()
            next_session = (row['mx'] or 0) + 1
            cur = conn.execute('''
                INSERT INTO soap_notes
                    (episode_id, session_no, note_date, subjective,
                     objective, analysis, plan, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                episode_id, next_session,
                soap_data.get('note_date', ''),
                soap_data.get('subjective', ''),
                soap_data.get('objective', ''),
                soap_data.get('analysis', ''),
                soap_data.get('plan', ''),
                now, now
            ))
            soap_id = cur.lastrowid

        conn.execute(
            'UPDATE episodes SET updated_at=? WHERE id=?', (now, episode_id)
        )
        conn.commit()
        return soap_id, []
    except Exception as e:
        return None, [str(e)]
    finally:
        conn.close()


def get_soap_notes(db_path, episode_id):
    conn = get_conn(db_path)
    try:
        rows = conn.execute('''
            SELECT * FROM soap_notes WHERE episode_id=?
            ORDER BY session_no ASC
        ''', (episode_id,)).fetchall()
        return [dict(r) for r in rows], None
    except Exception as e:
        return [], str(e)
    finally:
        conn.close()


def delete_soap(db_path, soap_id):
    conn = get_conn(db_path)
    try:
        conn.execute('DELETE FROM soap_notes WHERE id=?', (soap_id,))
        conn.commit()
        return True, None
    except Exception as e:
        return False, str(e)
    finally:
        conn.close()


def get_audit_log(db_path, record_id):
    conn = get_conn(db_path)
    try:
        rows = conn.execute('''
            SELECT id, action, changed_at FROM audit_log
            WHERE record_id=? ORDER BY changed_at DESC
        ''', (record_id,)).fetchall()
        return [dict(r) for r in rows], None
    except Exception as e:
        return [], str(e)
    finally:
        conn.close()
