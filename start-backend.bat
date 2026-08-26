@echo off
title ChatYa - Backend
color 5F
cd backend
if not exist "venv" python -m venv venv
call venv\Scripts\activate.bat
pip install -r requirements.txt -q
if not exist ".env" copy .env.example .env >nul
uvicorn main:app --reload --port 8000 --host 0.0.0.0
