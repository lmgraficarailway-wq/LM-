@echo off
title LM Passo - Sincronizar com Firebase
cd /d "%~dp0"
color 0B
mode con: cols=70 lines=35

echo.
echo  ╔══════════════════════════════════════════════════════════╗
echo  ║         LM PASSO — SINCRONIZAR COM FIREBASE              ║
echo  ╠══════════════════════════════════════════════════════════╣
echo  ║                                                          ║
echo  ║  [1] Enviar dados locais → FIREBASE  (local p/ nuvem)    ║
echo  ║  [2] Baixar dados FIREBASE → local   (nuvem p/ backup)   ║
echo  ║  [3] Ambos: enviar e depois baixar                       ║
echo  ║  [4] Sair                                                ║
echo  ║                                                          ║
echo  ╚══════════════════════════════════════════════════════════╝
echo.
set /p OPCAO="  Escolha uma opcao (1, 2, 3 ou 4): "

if "%OPCAO%"=="4" exit /b 0
if "%OPCAO%"=="" exit /b 0

if "%OPCAO%"=="1" goto :UPLOAD
if "%OPCAO%"=="2" goto :DOWNLOAD
if "%OPCAO%"=="3" goto :UPLOAD_THEN_DOWNLOAD

echo  Opcao invalida.
timeout /t 3 /nobreak >nul
exit /b 1

:: ─────────────────────────────────────────────────────────────────
:UPLOAD
cls
echo.
echo  ╔══════════════════════════════════════════════════════════╗
echo  ║  ENVIANDO: SQLite local → Firebase (nuvem)               ║
echo  ╚══════════════════════════════════════════════════════════╝
echo.

:: Fechar o servidor local se estiver rodando para liberar o banco
taskkill /F /IM node.exe >nul 2>&1
timeout /t 1 /nobreak >nul

node scripts/export_sqlite_to_firebase.js

if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo.
    echo  [ERRO] Falha ao enviar os dados. Verifique as credenciais Firebase.
    echo.
    pause
    exit /b 1
)

echo.
echo  ╔══════════════════════════════════════════════════════════╗
echo  ║  ✓ Dados locais enviados com sucesso para o Firebase!    ║
echo  ║                                                          ║
echo  ║  O aplicativo Render.com ja pode ser acessado com        ║
echo  ║  os dados mais recentes.                                 ║
echo  ╚══════════════════════════════════════════════════════════╝

if "%OPCAO%"=="3" goto :DOWNLOAD_STEP
goto :FIM

:: ─────────────────────────────────────────────────────────────────
:DOWNLOAD
cls
echo.
echo  ╔══════════════════════════════════════════════════════════╗
echo  ║  BAIXANDO: Firebase (nuvem) → backup local               ║
echo  ╚══════════════════════════════════════════════════════════╝
echo.

:DOWNLOAD_STEP
node scripts/backup_firebase_to_sqlite.js

if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo.
    echo  [ERRO] Falha ao baixar o backup. Verifique as credenciais Firebase.
    echo.
    pause
    exit /b 1
)

echo.
echo  ╔══════════════════════════════════════════════════════════╗
echo  ║  ✓ Backup local atualizado com sucesso!                  ║
echo  ║                                                          ║
echo  ║  Arquivo salvo em: scripts/db_backup_firebase.json       ║
echo  ╚══════════════════════════════════════════════════════════╝
goto :FIM

:UPLOAD_THEN_DOWNLOAD
goto :UPLOAD

:: ─────────────────────────────────────────────────────────────────
:FIM
echo.
echo  Reiniciando o servidor...
timeout /t 2 /nobreak >nul
start "" "%~dp0INICIAR_REDE.bat"
timeout /t 3 /nobreak >nul
