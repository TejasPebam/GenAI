@echo off
cd /d %~dp0
uvicorn backend:app --reload
pause
