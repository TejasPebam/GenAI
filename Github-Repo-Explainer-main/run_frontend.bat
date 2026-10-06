@echo off
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
    echo ERROR: .venv not found. Run setup.bat first.
    pause
    exit /b 1
)

call .venv\Scripts\activate.bat

echo ==========================================
echo Streamlit Frontend
echo ==========================================
echo.

python -m streamlit run frontend\app.py

