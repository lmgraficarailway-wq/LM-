@echo off
chcp 65001 >nul
title LM Passo - Deploy Completo

echo.
echo ============================================================
echo          LM PASSO - DEPLOY COMPLETO
echo   Cloud Run (API) + Firebase Hosting (frontend)
echo ============================================================
echo.

set /p MSG="Mensagem do commit (Enter para automatico): "
if "%MSG%"=="" set MSG=chore: atualizacao %date% %time%

:: ---- 1. Git push (backup/historico) -------------------------
echo [1/3] Git push...
git add -A
git commit -m "%MSG%"
git push origin master
echo [OK] Git atualizado
echo.

:: ---- 2. Cloud Run (BACKEND REAL) ----------------------------
echo [2/3] Deploy do backend no Cloud Run...
echo       (aguarde 3-5 minutos)
echo.
cmd /c "gcloud run deploy lm-passo-api --source . --region southamerica-east1 --platform managed --allow-unauthenticated --min-instances 1 --max-instances 5 --memory 1Gi --cpu 1 --timeout 60 --set-env-vars NODE_ENV=production,USE_FIREBASE_STORAGE=true,USE_SQLITE=false --project lm-passo"

if %errorlevel% neq 0 (
    echo [ERRO] Falha no deploy do Cloud Run!
    pause
    exit /b 1
)
echo [OK] Cloud Run atualizado!
echo.

:: ---- 3. Firebase Hosting (FRONTEND) -------------------------
echo [3/3] Deploy do frontend no Firebase Hosting...
cmd /c "firebase deploy --only hosting --project lm-passo"

if %errorlevel% neq 0 (
    echo [ERRO] Falha no deploy do Firebase Hosting!
    pause
    exit /b 1
)

echo.
echo ============================================================
echo           DEPLOY CONCLUIDO COM SUCESSO!
echo ------------------------------------------------------------
echo   App: https://lm-passo.web.app
echo ============================================================
echo.
pause
