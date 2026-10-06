@echo off
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
    echo ERROR: .venv not found. Run setup.bat first.
    pause
    exit /b 1
)

call .venv\Scripts\activate.bat

echo ==========================================
echo FastAPI Backend - Port 8001
echo ==========================================
echo.

python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8001

