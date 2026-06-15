@echo off
chcp 65001 >nul
title LM Passo - Atualizar Firebase
cd /d "%~dp0"
color 0B

echo.
echo  ╔═══════════════════════════════════════════════════╗
echo  ║       LM PASSO - ATUALIZAR NO FIREBASE            ║
echo  ╚═══════════════════════════════════════════════════╝
echo.
echo  Opcoes de deploy:
echo    [1] Tudo  (API + Frontend)  ← recomendado
echo    [2] So API (backend/servidor)
echo    [3] So Frontend (paginas/visual)
echo.
set /p OPCAO="  Escolha [1/2/3]: "

:: Valida entrada
if "%OPCAO%"=="1" goto TUDO
if "%OPCAO%"=="2" goto SO_API
if "%OPCAO%"=="3" goto SO_FRONTEND
echo  [ERRO] Opcao invalida. Saindo.
pause >nul
exit /b 1

:TUDO
echo.
echo  Enviando alteracoes ao Git...
git add public\ server\ server.js package.json firebase.json
git commit -m "update: %date% %time:~0,8%"
if %ERRORLEVEL% NEQ 0 (
    echo  [INFO] Nenhuma alteracao nova no Git.
)
git push origin main >nul 2>&1

echo.
echo  [1/2] Fazendo deploy da API (Cloud Run)...
call gcloud run deploy lm-passo-api ^
    --source . ^
    --region southamerica-east1 ^
    --platform managed ^
    --allow-unauthenticated ^
    --min-instances 0 ^
    --max-instances 3 ^
    --memory 512Mi ^
    --cpu 1 ^
    --timeout 60 ^
    --set-env-vars "NODE_ENV=production,USE_FIREBASE_STORAGE=true,USE_SQLITE=false,GEMINI_API_KEY=AIzaSyBb2G6FBdckww5a2hVWa-E6uOlaz3_jYBc" ^
    --project=lm-passo

if %ERRORLEVEL% NEQ 0 (
    echo  [ERRO] Falha no deploy da API!
    pause
    exit /b 1
)

echo.
echo  [2/2] Fazendo deploy do Frontend (Firebase Hosting)...
set GOOGLE_APPLICATION_CREDENTIALS=%CD%\firebase-credentials.json
call firebase deploy --only hosting --project=lm-passo

if %ERRORLEVEL% NEQ 0 (
    echo  [ERRO] Falha no deploy do Hosting!
    pause
    exit /b 1
)
goto FIM

:SO_API
echo.
echo  Enviando alteracoes ao Git...
git add server\ server.js package.json
git commit -m "update-api: %date% %time:~0,8%"
if %ERRORLEVEL% NEQ 0 echo  [INFO] Nenhuma alteracao nova no Git.
git push origin main >nul 2>&1

echo.
echo  Fazendo deploy da API (Cloud Run)...
call gcloud run deploy lm-passo-api ^
    --source . ^
    --region southamerica-east1 ^
    --platform managed ^
    --allow-unauthenticated ^
    --min-instances 0 ^
    --max-instances 3 ^
    --memory 512Mi ^
    --cpu 1 ^
    --timeout 60 ^
    --set-env-vars "NODE_ENV=production,USE_FIREBASE_STORAGE=true,USE_SQLITE=false,GEMINI_API_KEY=AIzaSyBb2G6FBdckww5a2hVWa-E6uOlaz3_jYBc" ^
    --project=lm-passo

if %ERRORLEVEL% NEQ 0 (
    echo  [ERRO] Falha no deploy da API!
    pause
    exit /b 1
)
goto FIM

:SO_FRONTEND
echo.
echo  Enviando alteracoes ao Git...
git add public\ firebase.json
git commit -m "update-frontend: %date% %time:~0,8%"
if %ERRORLEVEL% NEQ 0 echo  [INFO] Nenhuma alteracao nova no Git.
git push origin main >nul 2>&1

echo.
echo  Fazendo deploy do Frontend (Firebase Hosting)...
set GOOGLE_APPLICATION_CREDENTIALS=%CD%\firebase-credentials.json
call firebase deploy --only hosting --project=lm-passo

if %ERRORLEVEL% NEQ 0 (
    echo  [ERRO] Falha no deploy do Hosting!
    pause
    exit /b 1
)
goto FIM

:FIM
echo.
echo  ╔═══════════════════════════════════════════════════╗
echo  ║   ✓  DEPLOY CONCLUIDO COM SUCESSO!               ║
echo  ║                                                   ║
echo  ║   App:  https://lm-passo.web.app                 ║
echo  ╚═══════════════════════════════════════════════════╝
echo.
start "" "https://lm-passo.web.app"
timeout /t 5 /nobreak >nul
