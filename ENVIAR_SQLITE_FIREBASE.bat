@echo off
title LM Passo - Enviar Dados Atuais ao Firebase
cd /d "%~dp0"

echo.
echo  ==========================================
echo    ENVIANDO DADOS ATUALIZADOS AO FIREBASE
echo  ==========================================
echo.

node scripts/export_sqlite_to_firebase.js

echo.
echo  Iniciando o servidor...
timeout /t 2 /nobreak >nul
start http://localhost:3000
node server.js

pause
