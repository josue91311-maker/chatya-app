@echo off
title ChatYa - Iniciando Sistema
chcp 65001 > nul
cls

echo.
echo  ██████╗██╗  ██╗ █████╗ ████████╗██╗   ██╗ █████╗
echo ██╔════╝██║  ██║██╔══██╗╚══██╔══╝╚██╗ ██╔╝██╔══██╗
echo ██║     ███████║███████║   ██║    ╚████╔╝ ███████║
echo ██║     ██╔══██║██╔══██║   ██║     ╚██╔╝  ██╔══██║
echo ╚██████╗██║  ██║██║  ██║   ██║      ██║   ██║  ██║
echo  ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝      ╚═╝   ╚═╝  ╚═╝
echo.
echo  Plataforma SaaS de Ventas por WhatsApp
echo  =========================================
echo.

:: Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python no encontrado. Instala Python 3.11+ desde https://python.org
    pause
    exit /b 1
)

:: Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js no encontrado. Instala Node.js 18+ desde https://nodejs.org
    pause
    exit /b 1
)

echo [OK] Python encontrado
echo [OK] Node.js encontrado
echo.

:: Setup Backend
echo [1/4] Configurando Backend...
cd backend

if not exist "venv" (
    echo     Creando entorno virtual Python...
    python -m venv venv
)

echo     Instalando dependencias Python...
venv\Scripts\pip install -r requirements.txt -q

if not exist ".env" (
    echo     Creando archivo .env...
    copy .env.example .env >nul
)

if not exist "chatya.db" (
    echo     Inicializando base de datos y datos de demo...
    set PYTHONIOENCODING=utf-8
    venv\Scripts\python seed_data.py
)

echo [OK] Backend configurado
cd ..

:: Setup Frontend
echo.
echo [2/4] Configurando Frontend...
cd frontend

if not exist "node_modules" (
    echo     Instalando dependencias Node.js ^(puede tardar unos minutos^)...
    npm install --silent
)

if not exist ".env.local" (
    echo     Creando archivo .env.local...
    copy .env.local.example .env.local >nul
)

echo [OK] Frontend configurado
cd ..

echo.
echo [3/4] Iniciando Backend (FastAPI)...
start "ChatYa Backend - API :8000" cmd /k "cd backend && set PYTHONIOENCODING=utf-8 && venv\Scripts\python -m uvicorn main:app --reload --port 8000 --host 0.0.0.0"

timeout /t 4 /nobreak >nul

echo [4/4] Iniciando Frontend (Next.js)...
start "ChatYa Frontend :3000" cmd /k "cd frontend && npm run dev"

echo.
echo  =========================================
echo   ChatYa iniciado correctamente!
echo  =========================================
echo.
echo   Tienda Demo:   http://localhost:3000/demo
echo   Portal Admin:  http://localhost:3000/admin
echo   API Docs:      http://localhost:8000/docs
echo.
echo   Credenciales Admin:
echo   Email:     admin@chatya.com
echo   Password:  chatya123
echo.
echo   Para probar sin WhatsApp agrega ?preview=true
echo   Ejemplo: http://localhost:3000/demo?preview=true
echo.
timeout /t 8 /nobreak >nul

:: Open browser
start http://localhost:3000/demo

echo   Presiona cualquier tecla para cerrar esta ventana.
echo   (Los servicios seguiran corriendo en sus ventanas)
pause >nul
