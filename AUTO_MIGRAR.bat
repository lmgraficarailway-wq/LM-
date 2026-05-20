@echo off
title LM Passo - Auto Migrar Railway pro Firebase
cd /d "%~dp0"

echo.
echo  ==========================================
echo    AUTO MIGRAR RAILWAY -^> FIREBASE
echo  ==========================================
echo.

node scripts/auto_migrate_railway_to_firebase.js

echo.
pause
