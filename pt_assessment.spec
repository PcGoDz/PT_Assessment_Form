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
    ],
    hiddenimports=['flask', 'jinja2', 'werkzeug', 'click', 'itsdangerous'],
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
