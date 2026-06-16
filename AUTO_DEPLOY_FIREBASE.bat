@echo off
chcp 65001 >nul
title LM PASSO - Auto Deploy Firebase
cd /d "%~dp0"
color 0A

echo.
echo ====================================================
echo    AUTO DEPLOY FIREBASE - LM PASSO
echo    Monitorando mudancas a cada 30 segundos...
echo    Minimize esta janela para rodar em fundo.
echo ====================================================
echo.

set GOOGLE_APPLICATION_CREDENTIALS=%~dp0firebase-credentials.json

call :GET_HASH
set LAST_HASH=%CURRENT_HASH%

echo [%time:~0,8%] Sistema iniciado. Aguardando mudancas em public\ e server\ ...
echo.

:loop
timeout /t 30 /nobreak >nul

call :GET_HASH

if "%CURRENT_HASH%"=="%LAST_HASH%" goto loop

echo ====================================================
echo [%time:~0,8%] MUDANCAS DETECTADAS! Iniciando deploy...
echo ====================================================

git add public\ server\ server.js package.json firebase.json >nul 2>&1
git commit -m "Auto-Deploy Firebase: %date% %time:~0,8%" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [%time:~0,8%] OK - Git commit realizado.
    git push origin main >nul 2>&1
    echo [%time:~0,8%] OK - Git push realizado.
) else (
    echo [%time:~0,8%] INFO - Nenhuma mudanca nova no Git.
)

echo [%time:~0,8%] Fazendo deploy no Firebase Hosting...
call firebase deploy --only hosting --project=lm-passo

if %ERRORLEVEL% EQU 0 (
    color 0A
    echo.
    echo ====================================================
    echo [%time:~0,8%] DEPLOY CONCLUIDO! https://lm-passo.web.app
    echo ====================================================
    echo.
) else (
    color 0C
    echo [%time:~0,8%] ERRO - Falha no deploy. Verifique o Firebase CLI.
    color 0A
    echo.
)

call :GET_HASH
set LAST_HASH=%CURRENT_HASH%
goto loop

:GET_HASH
set CURRENT_HASH=
for /r "public" %%f in (*) do (
    set CURRENT_HASH=%CURRENT_HASH%%%~zf%%~tf
)
for /r "server" %%f in (*.js) do (
    set CURRENT_HASH=%CURRENT_HASH%%%~zf%%~tf
)
if exist "server.js" (
    for %%f in ("server.js") do set CURRENT_HASH=%CURRENT_HASH%%%~zf%%~tf
)
exit /b
