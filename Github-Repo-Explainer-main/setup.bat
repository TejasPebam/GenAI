@echo off
cd /d "%~dp0"

echo ==========================================
echo CodeExplainer - Final Setup
echo ==========================================
echo.

if not exist ".venv\Scripts\python.exe" (
    echo Creating Python virtual environment...
    python -m venv .venv
    if errorlevel 1 (
        echo ERROR: Could not create .venv.
        pause
        exit /b 1
    )
)

call .venv\Scripts\activate.bat

echo Installing project dependencies...
python -m pip install --upgrade pip
python -m pip install -r requirements.txt

echo.
echo ==========================================
echo SETUP COMPLETE
echo ==========================================
echo.
echo Local LLM:
echo   Ollama + Qwen 2.5 3B
echo.
echo If Qwen is not installed yet:
echo   ollama pull qwen2.5:3b
echo.
echo Run backend:
echo   run_backend.bat
echo.
echo Run frontend in a second terminal:
echo   run_frontend.bat
echo.
pause
