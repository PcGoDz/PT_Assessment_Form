import os
block_cipher = None

a = Analysis(
    ['app.py'],
    pathex=[],
    binaries=[],
    datas=[
        ('templates', 'templates'),
        ('static', 'static'),
        ('database.py', '.'),
        ('pdf_generator.py', '.'),
        ('pdf_base.py', '.'),
        ('pdf_ms.py', '.'),
        ('pdf_spine.py', '.'),
        ('pdf_geriatric.py', '.'),
        ('templates/pdf', 'templates/pdf'),
    ],
    hiddenimports=[
        'flask', 'jinja2', 'werkzeug', 'click', 'itsdangerous',
        'reportlab', 'reportlab.pdfgen', 'reportlab.platypus',
        'reportlab.lib', 'reportlab.lib.pagesizes', 'reportlab.lib.units',
        'reportlab.lib.colors',
    ],
    hookspath=[],
    runtime_hooks=[],
    excludes=[],
    cipher=block_cipher,
)
pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)
exe = EXE(
    pyz, a.scripts, a.binaries, a.zipfiles, a.datas, [],
    name='PT_Assessment',
    debug=False, strip=False, upx=True, console=True, icon=None,
)
