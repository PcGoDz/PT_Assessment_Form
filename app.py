import sys
import os
import json
import sqlite3
import threading
import webbrowser
from datetime import datetime
from flask import Flask, render_template, request, jsonify, send_file
import io

# ── Path handling for PyInstaller bundle ──────────────────────
def resource_path(relative):
    if hasattr(sys, '_MEIPASS'):
        return os.path.join(sys._MEIPASS, relative)
    return os.path.join(os.path.dirname(os.path.abspath(__file__)), relative)

def data_path(filename):
    """Always writes next to the .exe, not inside the bundle."""
    if hasattr(sys, '_MEIPASS'):
        base = os.path.dirname(sys.executable)
    else:
        base = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(base, 'pt_data')
    os.makedirs(data_dir, exist_ok=True)
    return os.path.join(data_dir, filename)

app = Flask(
    __name__,
    template_folder=resource_path('templates'),
    static_folder=resource_path('static')
)
app.secret_key = 'pt_assessment_local_key'

DB_PATH = data_path('records.db')

# ── Database setup ─────────────────────────────────────────
def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            form_type TEXT NOT NULL DEFAULT 'MS',
            patient_name TEXT,
            patient_rn TEXT,
            patient_date TEXT,
            created_at TEXT,
            updated_at TEXT,
            data_json TEXT NOT NULL
        )
    ''')
    conn.commit()
    conn.close()

# ── Routes ─────────────────────────────────────────────────
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/records', methods=['GET'])
def list_records():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        SELECT id, form_type, patient_name, patient_rn, patient_date, created_at, updated_at
        FROM records ORDER BY updated_at DESC
    ''')
    rows = c.fetchall()
    conn.close()
    records = [
        {
            'id': r[0], 'form_type': r[1], 'patient_name': r[2],
            'patient_rn': r[3], 'patient_date': r[4],
            'created_at': r[5], 'updated_at': r[6]
        }
        for r in rows
    ]
    return jsonify(records)

@app.route('/api/records', methods=['POST'])
def save_record():
    data = request.get_json()
    now = datetime.now().isoformat(timespec='seconds')
    patient = data.get('patient', {})
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    record_id = data.get('id')
    if record_id:
        c.execute('''
            UPDATE records SET patient_name=?, patient_rn=?, patient_date=?,
            updated_at=?, data_json=? WHERE id=?
        ''', (
            patient.get('name', ''), patient.get('rn', ''),
            patient.get('date', ''), now, json.dumps(data), record_id
        ))
    else:
        c.execute('''
            INSERT INTO records (form_type, patient_name, patient_rn, patient_date, created_at, updated_at, data_json)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            data.get('meta', {}).get('form', 'MS'),
            patient.get('name', ''), patient.get('rn', ''),
            patient.get('date', ''), now, now, json.dumps(data)
        ))
        record_id = c.lastrowid
    conn.commit()
    conn.close()
    return jsonify({'success': True, 'id': record_id})

@app.route('/api/records/<int:record_id>', methods=['GET'])
def load_record(record_id):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('SELECT data_json FROM records WHERE id=?', (record_id,))
    row = c.fetchone()
    conn.close()
    if not row:
        return jsonify({'error': 'Not found'}), 404
    return jsonify(json.loads(row[0]))

@app.route('/api/records/<int:record_id>', methods=['DELETE'])
def delete_record(record_id):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('DELETE FROM records WHERE id=?', (record_id,))
    conn.commit()
    conn.close()
    return jsonify({'success': True})

@app.route('/api/export/<int:record_id>', methods=['GET'])
def export_json(record_id):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('SELECT patient_name, patient_date, data_json FROM records WHERE id=?', (record_id,))
    row = c.fetchone()
    conn.close()
    if not row:
        return jsonify({'error': 'Not found'}), 404
    name = row[0] or 'record'
    date = row[1] or 'nodate'
    filename = f"PT_MS_{name}_{date}.json".replace(' ', '_')
    buf = io.BytesIO(row[2].encode('utf-8'))
    return send_file(buf, as_attachment=True, download_name=filename, mimetype='application/json')

# ── Launch ─────────────────────────────────────────────────
def open_browser():
    webbrowser.open('http://127.0.0.1:5000')

if __name__ == '__main__':
    init_db()
    # Open browser after short delay
    threading.Timer(1.2, open_browser).start()
    print("PT Assessment System running at http://127.0.0.1:5000")
    print("Close this window to stop the server.")
    app.run(host='127.0.0.1', port=5000, debug=False, use_reloader=False)
