@echo off
title ChatYa - Frontend
color 5F
cd frontend
if not exist "node_modules" npm install
if not exist ".env.local" copy .env.local.example .env.local >nul
npm run dev
