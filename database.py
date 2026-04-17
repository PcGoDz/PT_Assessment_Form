import sqlite3
import json
from datetime import datetime


def get_conn(db_path):
    conn = sqlite3.connect(db_path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db(db_path):
    conn = get_conn(db_path)
    conn.execute('''
        CREATE TABLE IF NOT EXISTS records (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            form_type    TEXT    NOT NULL DEFAULT 'MS',
            patient_name TEXT,
            patient_rn   TEXT,
            patient_date TEXT,
            created_at   TEXT,
            updated_at   TEXT,
            data_json    TEXT    NOT NULL
        )
    ''')
    # Audit trail — keeps last 10 versions of any record
    conn.execute('''
        CREATE TABLE IF NOT EXISTS audit_log (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            record_id    INTEGER NOT NULL,
            action       TEXT    NOT NULL,
            changed_at   TEXT    NOT NULL,
            data_json    TEXT    NOT NULL,
            FOREIGN KEY (record_id) REFERENCES records(id)
        )
    ''')
    conn.commit()
    conn.close()


# ── Per-form required fields ──────────────────────────────
# Add new form types here as needed. 'common' rules always run.
REQUIRED_FIELDS = {
    'common': [
        ('patient.name',    'Patient name is required'),
        ('patient.date',    'Assessment date is required'),
    ],
    'MS': [
        ('diagnosis',       'Diagnosis is required'),
    ],
    'SPINE': [
        ('diagnosis',       'Diagnosis is required'),
    ],
    'GERIATRIC': [
        ('diagnosis',       'Diagnosis is required'),
    ],
}


def validate_record(data):
    """Validate a record. form_type is read from data.meta.form."""
    errors  = []
    patient = data.get('patient', {})
    meta    = data.get('meta', {})
    form_type = meta.get('form', 'MS')

    # Common rules — apply to all forms
    for field, msg in REQUIRED_FIELDS.get('common', []):
        parts = field.split('.')
        val   = data
        for p in parts:
            val = val.get(p, {}) if isinstance(val, dict) else {}
        if not str(val).strip():
            errors.append(msg)

    # NRIC / passport — always required regardless of form
    pt_type = patient.get('type', 'local')
    if pt_type == 'local' and not patient.get('nric', '').strip():
        errors.append('NRIC is required for Malaysian patients')
    if pt_type == 'foreign' and not patient.get('passport', '').strip():
        errors.append('Passport number is required for foreign patients')

    # Form-specific rules
    for field, msg in REQUIRED_FIELDS.get(form_type, []):
        parts = field.split('.')
        val   = data
        for p in parts:
            val = val.get(p, {}) if isinstance(val, dict) else {}
        if not str(val).strip():
            errors.append(msg)

    return errors


def save_record(db_path, data):
    errors = validate_record(data)
    if errors:
        return None, errors

    now     = datetime.now().isoformat(timespec='seconds')
    patient = data.get('patient', {})
    record_id = data.get('id')

    conn = get_conn(db_path)
    try:
        if record_id:
            # Snapshot current version to audit log before overwriting
            old = conn.execute(
                'SELECT data_json FROM records WHERE id=?', (record_id,)
            ).fetchone()
            if old:
                conn.execute('''
                    INSERT INTO audit_log (record_id, action, changed_at, data_json)
                    VALUES (?, ?, ?, ?)
                ''', (record_id, 'update', now, old['data_json']))
                # Keep only last 10 audit entries per record
                conn.execute('''
                    DELETE FROM audit_log WHERE record_id=? AND id NOT IN (
                        SELECT id FROM audit_log WHERE record_id=?
                        ORDER BY changed_at DESC LIMIT 10
                    )
                ''', (record_id, record_id))

            conn.execute('''
                UPDATE records
                SET patient_name=?, patient_rn=?, patient_date=?,
                    updated_at=?, data_json=?
                WHERE id=?
            ''', (
                patient.get('name', ''),
                patient.get('nric') or patient.get('passport', ''),
                patient.get('date', ''),
                now,
                json.dumps(data),
                record_id
            ))
        else:
            cur = conn.execute('''
                INSERT INTO records
                    (form_type, patient_name, patient_rn, patient_date,
                     created_at, updated_at, data_json)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                data.get('meta', {}).get('form', 'MS'),
                patient.get('name', ''),
                patient.get('nric') or patient.get('passport', ''),
                patient.get('date', ''),
                now, now,
                json.dumps(data)
            ))
            record_id = cur.lastrowid
            # Log creation
            conn.execute('''
                INSERT INTO audit_log (record_id, action, changed_at, data_json)
                VALUES (?, ?, ?, ?)
            ''', (record_id, 'create', now, json.dumps(data)))

        conn.commit()
        return record_id, []
    except Exception as e:
        return None, [str(e)]
    finally:
        conn.close()


def list_records(db_path):
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


def load_record(db_path, record_id):
    conn = get_conn(db_path)
    try:
        row = conn.execute(
            'SELECT data_json FROM records WHERE id=?', (record_id,)
        ).fetchone()
        if not row:
            return None, 'Record not found'
        return json.loads(row['data_json']), None
    except Exception as e:
        return None, str(e)
    finally:
        conn.close()


def delete_record(db_path, record_id):
    conn = get_conn(db_path)
    try:
        # Log deletion before removing
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


def get_audit_log(db_path, record_id):
    """Get audit history for a record — for future use."""
    conn = get_conn(db_path)
    try:
        rows = conn.execute('''
            SELECT id, action, changed_at
            FROM audit_log WHERE record_id=?
            ORDER BY changed_at DESC
        ''', (record_id,)).fetchall()
        return [dict(r) for r in rows], None
    except Exception as e:
        return [], str(e)
    finally:
        conn.close()
