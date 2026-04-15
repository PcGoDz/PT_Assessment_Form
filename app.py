import sys
import os
import threading
import webbrowser
from flask import Flask, render_template, request, jsonify
from database import init_db, save_record, list_records, load_record, delete_record


# ── Path resolution (works both in dev and PyInstaller bundle) ──
def resource_path(relative):
    if hasattr(sys, '_MEIPASS'):
        return os.path.join(sys._MEIPASS, relative)
    return os.path.join(os.path.dirname(os.path.abspath(__file__)), relative)


def data_path(filename):
    base = os.path.dirname(sys.executable) if hasattr(sys, '_MEIPASS') \
        else os.path.dirname(os.path.abspath(__file__))
    d = os.path.join(base, 'pt_data')
    os.makedirs(d, exist_ok=True)
    return os.path.join(d, filename)


DB_PATH = data_path('records.db')

app = Flask(
    __name__,
    template_folder=resource_path('templates'),
    static_folder=resource_path('static')
)
app.secret_key = 'pt_assessment_local_key'


# ── Pages ────────────────────────────────────────────────────────
@app.route('/')
def index():
    return render_template('forms/ms.html')


# ── API ──────────────────────────────────────────────────────────
@app.route('/api/records', methods=['GET'])
def api_list():
    records, err = list_records(DB_PATH)
    if err:
        return jsonify({'error': err}), 500
    return jsonify(records)


@app.route('/api/records', methods=['POST'])
def api_save():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({'error': 'Invalid JSON'}), 400
    record_id, errors = save_record(DB_PATH, data)
    if errors:
        return jsonify({'error': errors}), 422
    return jsonify({'success': True, 'id': record_id})


@app.route('/api/records/<int:record_id>', methods=['GET'])
def api_load(record_id):
    data, err = load_record(DB_PATH, record_id)
    if err:
        return jsonify({'error': err}), 404
    return jsonify(data)


@app.route('/api/records/<int:record_id>', methods=['DELETE'])
def api_delete(record_id):
    ok, err = delete_record(DB_PATH, record_id)
    if not ok:
        return jsonify({'error': err}), 500
    return jsonify({'success': True})


# ── Launch ───────────────────────────────────────────────────────
def open_browser():
    webbrowser.open('http://127.0.0.1:5000')


if __name__ == '__main__':
    init_db(DB_PATH)
    threading.Timer(1.2, open_browser).start()
    print("PT Assessment System running at http://127.0.0.1:5000")
    print("Close this window to stop the server.")
    app.run(host='127.0.0.1', port=5000, debug=False, use_reloader=False)
