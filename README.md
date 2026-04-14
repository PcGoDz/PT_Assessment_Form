# PT Assessment System — Musculoskeletal
KKM Physiotherapy Department | fisio/b.pen.14/Pind.1/2019

## How to use

1. Double-click `PT_Assessment.exe`
   - A terminal window will open (don't close it)
   - Your browser opens automatically at http://127.0.0.1:5000

2. Fill in the assessment form

3. Click **Save Record** to store to local database

4. To stop: close the terminal window

## Files
- `PT_Assessment.exe` — the app
- `pt_data/records.db` — SQLite database (auto-created on first run)
- All data stays local on this PC, nothing goes to internet

## Building from source (if you have Python)
```
pip install flask pyinstaller
cd pt_app
pyinstaller pt_assessment.spec
```
The .exe will be in the `dist/` folder.

## Modular design
Each assessment type (Spine, Cardio, Obesity) will be added as:
- A new route in `app.py`
- A new HTML template in `templates/`
- Same database, same save/load system

## Notes
- Records saved as JSON in SQLite — future-proof for HIS integration
- No internet required, fully offline
- Tested on Python 3.12 + Flask 3.x
