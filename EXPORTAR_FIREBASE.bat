@echo off
title LM Passo - Exportar para Firebase
cd /d "%~dp0"

echo.
echo  ==========================================
echo    LM PASSO - Exportando para Firebase
echo  ==========================================
echo.

:: Instala firebase-admin se necessario
echo  [1/3] Verificando firebase-admin...
node -e "require('firebase-admin')" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo  Instalando firebase-admin... (aguarde ~30 segundos)
    npm install firebase-admin --save
    echo.
)
echo  firebase-admin OK!
echo.

:: Exporta dados para Firebase
echo  [2/3] Enviando dados para o Firebase Firestore...
echo.
node scripts/export_to_firebase.js
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo  ERRO ao exportar. Verifique o arquivo firebase-credentials.json
    pause
    exit /b 1
)

echo.
echo  [3/3] Iniciando servidor local...
echo.

for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /R "IPv4"') do (
    set "IP=%%a"
    goto :ip_ok
)
:ip_ok
set "IP=%IP: =%"

cls
echo.
echo  ╔══════════════════════════════════════════╗
echo  ║   LM PASSO - DADOS NO FIREBASE!         ║
echo  ╠══════════════════════════════════════════╣
echo  ║                                          ║
echo  ║  Neste PC:   http://localhost:3000       ║
echo  ║  Na Rede:    http://%IP%:3000       ║
echo  ║                                          ║
echo  ╚══════════════════════════════════════════╝
echo.
echo  Nao feche esta janela!
echo.

start /B cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:3000"

:LOOP
node server.js
if %ERRORLEVEL% EQU 0 (
    timeout /t 1 /nobreak >nul
    goto LOOP
)
echo.
echo Servidor parou. Pressione qualquer tecla.
pause >nul
