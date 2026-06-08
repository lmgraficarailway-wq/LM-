@echo off
chcp 65001 >nul
title LM Passo - Deploy Completo

echo.
echo ============================================================
echo          LM PASSO - DEPLOY COMPLETO
echo   Railway (backend) + Firebase Hosting (frontend)
echo ============================================================
echo.

:: ---- Pede mensagem do commit --------------------------------
set /p MSG="Mensagem do commit (Enter para mensagem automatica): "
if "%MSG%"=="" set MSG=chore: atualizacao %date% %time%

:: ---- 1. Git push para o Railway ----------------------------
echo [1/2] Enviando para Railway (git push)...
echo.
git add -A
git commit -m "%MSG%"
git push origin master

if %errorlevel% neq 0 (
    echo.
    echo [ERRO] Falha no git push! Verifique acima.
    pause
    exit /b 1
)
echo.
echo [OK] Railway atualizado!
echo.

:: ---- 2. Firebase Hosting -----------------------------------
echo [2/2] Publicando no Firebase Hosting...
echo.
cmd /c "firebase deploy --only hosting --project lm-passo"

if %errorlevel% neq 0 (
    echo.
    echo [ERRO] Falha no deploy do Firebase Hosting!
    pause
    exit /b 1
)

echo.
echo ============================================================
echo               DEPLOY CONCLUIDO COM SUCESSO!
echo ------------------------------------------------------------
echo   Railway (API):   https://lm-passo-api.railway.app
echo   Firebase (App):  https://lm-passo.web.app
echo ============================================================
echo.
pause
