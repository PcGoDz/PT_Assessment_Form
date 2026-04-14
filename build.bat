@echo off
echo ============================================
echo  PT Assessment System - Build Script
echo ============================================
echo.

echo Checking Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found. Install from https://python.org
    pause
    exit /b 1
)

echo Installing dependencies...
pip install flask pyinstaller --quiet

echo.
echo Building executable...
python -m PyInstaller pt_assessment.spec --distpath dist --workpath build --noconfirm

echo.
if exist "dist\PT_Assessment.exe" (
    echo ============================================
    echo  Build successful!
    echo  Your exe is in the dist\ folder
    echo ============================================
) else (
    echo ============================================
    echo  Build failed. Check errors above.
    echo ============================================
)
echo.
pause
