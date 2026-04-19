import sys
import os
import threading
import webbrowser
from flask import Flask, render_template, request, jsonify, make_response
from database import (
    init_db, save_record, list_records, load_record, delete_record,
    create_patient, search_patients, get_patient, update_patient,
    create_episode, get_patient_episodes, get_episode, update_episode_status,
    get_episode_record, save_soap, get_soap_notes, delete_soap
)


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
    return render_template('home.html')


@app.route('/episode/<int:episode_id>')
def episode_detail(episode_id):
    return render_template('episode.html', episode_id=episode_id)


@app.route('/form/ms')
def form_ms():
    episode_id = request.args.get('episode_id', type=int)
    patient_id = request.args.get('patient_id', type=int)
    patient    = None
    if patient_id:
        patient, _ = get_patient(DB_PATH, patient_id)
    return render_template('forms/ms.html',
        episode_id=episode_id,
        patient_id=patient_id,
        patient=patient)


@app.route('/form/spine')
def form_spine():
    episode_id = request.args.get('episode_id', type=int)
    patient_id = request.args.get('patient_id', type=int)
    patient    = None
    if patient_id:
        patient, _ = get_patient(DB_PATH, patient_id)
    return render_template('forms/spine.html',
        episode_id=episode_id,
        patient_id=patient_id,
        patient=patient)


# ── Patient API ──────────────────────────────────────────────────
@app.route('/api/patients/search')
def api_patient_search():
    q       = request.args.get('q', '')
    results, err = search_patients(DB_PATH, q)
    if err:
        return jsonify({'error': err}), 500
    return jsonify(results)


@app.route('/api/patients', methods=['POST'])
def api_create_patient():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({'error': 'Invalid JSON'}), 400
    pid, errors = create_patient(DB_PATH, data)
    if errors:
        return jsonify({'error': errors}), 422
    return jsonify({'success': True, 'id': pid})


@app.route('/api/patients/<int:patient_id>', methods=['GET'])
def api_get_patient(patient_id):
    patient, err = get_patient(DB_PATH, patient_id)
    if err or not patient:
        return jsonify({'error': err or 'Not found'}), 404
    return jsonify(patient)


@app.route('/api/patients/<int:patient_id>', methods=['PUT'])
def api_update_patient(patient_id):
    data = request.get_json(silent=True)
    ok, errors = update_patient(DB_PATH, patient_id, data)
    if not ok:
        return jsonify({'error': errors}), 422
    return jsonify({'success': True})


# ── Episode API ──────────────────────────────────────────────────
@app.route('/api/patients/<int:patient_id>/episodes', methods=['GET'])
def api_patient_episodes(patient_id):
    episodes, err = get_patient_episodes(DB_PATH, patient_id)
    if err:
        return jsonify({'error': err}), 500
    return jsonify(episodes)


@app.route('/api/patients/<int:patient_id>/episodes', methods=['POST'])
def api_create_episode(patient_id):
    data      = request.get_json(silent=True) or {}
    form_type = data.get('form_type', 'MS')
    ref_date  = data.get('referral_date')
    eid, errors = create_episode(DB_PATH, patient_id, form_type, ref_date)
    if errors:
        return jsonify({'error': errors}), 422
    return jsonify({'success': True, 'id': eid})


@app.route('/api/episodes/<int:episode_id>', methods=['GET'])
def api_get_episode(episode_id):
    episode, err = get_episode(DB_PATH, episode_id)
    if err or not episode:
        return jsonify({'error': err or 'Not found'}), 404
    return jsonify(episode)


@app.route('/api/episodes/<int:episode_id>/status', methods=['PUT'])
def api_episode_status(episode_id):
    data   = request.get_json(silent=True) or {}
    status = data.get('status', 'active')
    reason = data.get('reason')
    ok, err = update_episode_status(DB_PATH, episode_id, status, reason)
    if not ok:
        return jsonify({'error': err}), 500
    return jsonify({'success': True})


# ── SOAP API ─────────────────────────────────────────────────────
@app.route('/api/episodes/<int:episode_id>/soap', methods=['GET'])
def api_get_soaps(episode_id):
    notes, err = get_soap_notes(DB_PATH, episode_id)
    if err:
        return jsonify({'error': err}), 500
    return jsonify(notes)


@app.route('/api/episodes/<int:episode_id>/soap', methods=['POST'])
def api_save_soap(episode_id):
    data = request.get_json(silent=True)
    if not data:
        return jsonify({'error': 'Invalid JSON'}), 400
    sid, errors = save_soap(DB_PATH, episode_id, data)
    if errors:
        return jsonify({'error': errors}), 422
    return jsonify({'success': True, 'id': sid})


@app.route('/api/soap/<int:soap_id>', methods=['DELETE'])
def api_delete_soap(soap_id):
    ok, err = delete_soap(DB_PATH, soap_id)
    if not ok:
        return jsonify({'error': err}), 500
    return jsonify({'success': True})


# ── Stats API ───────────────────────────────────────────────────
@app.route('/api/stats')
def api_stats():
    conn = __import__('database').get_conn(DB_PATH)
    try:
        stats = {}
        stats['patients']    = conn.execute('SELECT COUNT(*) FROM patients').fetchone()[0]
        stats['episodes']    = conn.execute("SELECT COUNT(*) FROM episodes WHERE status='active'").fetchone()[0]
        stats['assessments'] = conn.execute('SELECT COUNT(*) FROM records').fetchone()[0]
        stats['soaps']       = conn.execute('SELECT COUNT(*) FROM soap_notes').fetchone()[0]
        return __import__('flask').jsonify(stats)
    finally:
        conn.close()


# ── Records API (kept for form save/load) ────────────────────────
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


@app.route('/api/episodes/<int:episode_id>/record', methods=['GET'])
def api_episode_record(episode_id):
    data, err = get_episode_record(DB_PATH, episode_id)
    if err:
        return jsonify({'error': err}), 500
    if not data:
        return jsonify(None)
    return jsonify(data)


# ── PDF Export ───────────────────────────────────────────────────
@app.route('/api/episodes/<int:episode_id>/pdf', methods=['GET'])
def export_episode_pdf(episode_id):
    try:
        from pdf_ms import generate_episode_pdf
        ep, err = get_episode(DB_PATH, episode_id)
        if err or not ep:
            return jsonify({'error': err or 'Episode not found'}), 404
        assessment, _ = get_episode_record(DB_PATH, episode_id)
        soaps, _      = get_soap_notes(DB_PATH, episode_id)
        if not assessment:
            assessment = {}
            assessment['patient'] = {
                'name':    ep.get('patient_name',''),
                'nric':    ep.get('ic',''),
                'passport':ep.get('passport',''),
                'type':    ep.get('pt_type','local'),
                'dob':     ep.get('dob',''),
                'sex':     ep.get('sex',''),
                'date':    ep.get('referral_date',''),
            }
        pdf_bytes = generate_episode_pdf(assessment, soaps, ep)
        name     = (ep.get('patient_name') or 'record').replace(' ','_')
        ref_date = ep.get('referral_date') or 'nodate'
        form     = ep.get('form_type','MS')
        filename = f"PT_{form}_{name}_{ref_date}.pdf"
        response = make_response(pdf_bytes)
        response.headers['Content-Type']        = 'application/pdf'
        response.headers['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/export/<int:record_id>/pdf', methods=['GET'])
def export_pdf(record_id):
    data, err = load_record(DB_PATH, record_id)
    if err:
        return jsonify({'error': err}), 404
    try:
        from pdf_ms import generate_ms_pdf
        pdf_bytes = generate_ms_pdf(data)
        patient   = data.get('patient', {})
        name      = (patient.get('name') or 'record').replace(' ', '_')
        date      = patient.get('date') or 'nodate'
        filename  = f"PT_MS_{name}_{date}.pdf"
        response  = make_response(pdf_bytes)
        response.headers['Content-Type']        = 'application/pdf'
        response.headers['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── Launch ───────────────────────────────────────────────────────
def open_browser():
    webbrowser.open('http://127.0.0.1:5000')


if __name__ == '__main__':
    init_db(DB_PATH)
    threading.Timer(1.2, open_browser).start()
    print("PT Assessment System running at http://127.0.0.1:5000")
    print("Close this window to stop the server.")
    app.run(host='127.0.0.1', port=5000, debug=False, use_reloader=False)
