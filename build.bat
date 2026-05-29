@echo off
echo ============================================
echo  PT Assessment System - Build Script
echo ============================================
echo.
echo Checking Python...
py --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found. Install from https://python.org
    pause
    exit /b 1
)
echo Installing dependencies...
py -m pip install flask pyinstaller reportlab --quiet
echo.
echo Building executable...
py -m PyInstaller pt_assessment.spec --distpath dist --workpath build --noconfirm
echo.
if exist "dist\PT_Assessment.exe" (
    echo ============================================
    echo  Build successful! exe is in dist\
    echo ============================================
) else (
    echo Build failed. Check errors above.
)
echo.
pause