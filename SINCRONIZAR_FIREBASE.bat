@echo off
title LM Passo - Sincronizar com Firebase
cd /d "%~dp0"

echo.
echo  ==========================================
echo    LM PASSO - Sincronizando com Firebase
echo  ==========================================
echo.

:: Verifica credenciais
if not exist "firebase-credentials.json" (
    echo.
    echo  ==========================================
    echo   ERRO: firebase-credentials.json nao encontrado!
    echo.
    echo   Para configurar o Firebase:
    echo   1. Acesse: https://console.firebase.google.com
    echo   2. Crie um projeto chamado "lm-passo"
    echo   3. Va em Configuracoes do projeto
    echo      -> Contas de servico
    echo      -> Gerar nova chave privada
    echo   4. Salve o arquivo JSON baixado como:
    echo      firebase-credentials.json
    echo   5. Coloque nesta pasta e rode novamente
    echo  ==========================================
    echo.
    pause
    exit /b 1
)

:: Instala firebase-admin se necessario
echo  Verificando dependencias...
node -e "require('firebase-admin')" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo  Instalando firebase-admin (aguarde)...
    npm install firebase-admin --save >nul 2>&1
    echo  firebase-admin instalado!
)
echo.

:: Menu de opcoes
echo  O que deseja fazer?
echo.
echo  [1] Enviar dados locais PARA o Firebase
echo  [2] Baixar dados DO Firebase para o PC
echo  [3] Ambos: enviar e depois baixar (sync completo)
echo.
set /p OPCAO="  Escolha (1, 2 ou 3): "

if "%OPCAO%"=="1" goto :EXPORTAR
if "%OPCAO%"=="2" goto :IMPORTAR
if "%OPCAO%"=="3" goto :EXPORTAR
echo Opcao invalida.
pause
exit /b 1

:EXPORTAR
echo.
echo  Enviando dados para o Firebase...
echo.
taskkill /F /IM node.exe >nul 2>&1
timeout /t 1 /nobreak >nul
node scripts/export_to_firebase.js
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo  ERRO ao exportar. Verifique as credenciais.
    pause
    exit /b 1
)
if "%OPCAO%"=="3" goto :IMPORTAR
goto :INICIAR

:IMPORTAR
echo.
echo  Baixando dados do Firebase...
echo.
taskkill /F /IM node.exe >nul 2>&1
timeout /t 1 /nobreak >nul
node scripts/import_from_firebase.js
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo  ERRO ao importar. Verifique as credenciais.
    pause
    exit /b 1
)

:INICIAR
echo.
echo  Iniciando servidor com dados atualizados...
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
echo  ║   LM PASSO - FIREBASE SINCRONIZADO!      ║
echo  ╠══════════════════════════════════════════╣
echo  ║                                          ║
echo  ║  Neste PC:   http://localhost:3000       ║
echo  ║  Na Rede:    http://%IP%:3000       ║
echo  ║                                          ║
echo  ╚══════════════════════════════════════════╝
echo.
echo  (Nao feche esta janela - e o servidor)
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
