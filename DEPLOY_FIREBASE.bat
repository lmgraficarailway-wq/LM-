@echo off
chcp 65001 >nul
title LM Passo - Deploy Firebase

echo.
echo ======================================================
echo        LM PASSO - DEPLOY 100%% FIREBASE              
echo    Firebase Hosting + Cloud Run + Firestore          
echo ======================================================
echo.

:: -- Configuracoes --------------------------------------------------------------
set PROJECT_ID=lm-passo
set SERVICE_NAME=lm-passo-api
set REGION=southamerica-east1
set IMAGE=gcr.io/%PROJECT_ID%/%SERVICE_NAME%

:: Configurar Python embutido para o gcloud
set CLOUDSDK_PYTHON=%LOCALAPPDATA%\python-embed\python.exe
set PATH=%PATH%;%LOCALAPPDATA%\gcloud-sdk\google-cloud-sdk\bin

echo [1/6] Verificando ferramentas instaladas...
where gcloud >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [ERRO] Google Cloud SDK nao encontrado!
    echo    Instale em: https://cloud.google.com/sdk/docs/install
    echo    Depois execute: gcloud auth login
    pause
    exit /b 1
)

where firebase >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [ERRO] Firebase CLI nao encontrado!
    echo    Instale com: npm install -g firebase-tools
    pause
    exit /b 1
)

echo [OK] Ferramentas OK
echo.

echo [2/6] Fazendo login e configurando projeto...
call gcloud config set project %PROJECT_ID%
if %errorlevel% neq 0 (
    echo [ERRO] Erro ao configurar projeto. Execute: gcloud auth login
    pause
    exit /b 1
)
echo [OK] Projeto configurado: %PROJECT_ID%
echo.

echo [3/6] Habilitando APIs necessarias no Google Cloud...
call gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com --project=%PROJECT_ID%
echo [OK] APIs habilitadas
echo.

echo [4/6] Build e deploy do container no Cloud Run...
echo    Enviando imagem para: %IMAGE%
echo    Regiao: %REGION%
echo.

:: Ler credenciais do Firebase como variavel de ambiente para o Cloud Run
set /p FIREBASE_CREDS=<firebase-credentials.json

call gcloud run deploy %SERVICE_NAME% ^
    --source . ^
    --region %REGION% ^
    --platform managed ^
    --allow-unauthenticated ^
    --min-instances 0 ^
    --max-instances 3 ^
    --memory 512Mi ^
    --cpu 1 ^
    --timeout 60 ^
    --set-env-vars "NODE_ENV=production,USE_FIREBASE_STORAGE=true,USE_SQLITE=false,GEMINI_API_KEY=AIzaSyBb2G6FBdckww5a2hVWa-E6uOlaz3_jYBc" ^
    --project=%PROJECT_ID%

if %errorlevel% neq 0 (
    echo.
    echo [ERRO] Erro no deploy do Cloud Run!
    echo    Verifique os logs acima.
    pause
    exit /b 1
)
echo.
echo [OK] Cloud Run deployado com sucesso!
echo.

echo [5/6] Deploy do Firebase Hosting (frontend)...
set GOOGLE_APPLICATION_CREDENTIALS=%CD%\firebase-credentials.json
call firebase deploy --only hosting --project=%PROJECT_ID%
if %errorlevel% neq 0 (
    echo [ERRO] Erro no deploy do Hosting!
    pause
    exit /b 1
)
echo [OK] Firebase Hosting atualizado!
echo.

echo [6/6] Obtendo URL do servico...
for /f "tokens=*" %%i in ('call gcloud run services describe %SERVICE_NAME% --region=%REGION% --format="value(status.url)" --project=%PROJECT_ID%') do set SERVICE_URL=%%i

echo.
echo ======================================================
echo               [OK] DEPLOY CONCLUIDO!                  
echo ------------------------------------------------------
echo   App:      https://%PROJECT_ID%.web.app          
echo   API:      %SERVICE_URL%                        
echo   Console:  https://console.firebase.google.com   
echo ======================================================
echo.
echo Proximos passos:
echo  1. Execute MIGRAR_BANCO_FIRESTORE.bat para migrar os dados
echo  2. Execute MIGRAR_IMAGENS_STORAGE.bat para migrar as fotos
echo.
pause
