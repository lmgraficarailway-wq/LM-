@echo off
color 0E
mode con: cols=80 lines=35
echo =====================================================
echo   DIAGNOSTICO NGROK - LM PASSO
echo =====================================================
echo.

:: 1. Verificar se ngrok.exe existe
echo [1] Verificando ngrok.exe...
IF EXIST "%~dp0ngrok.exe" (
    echo     OK - ngrok.exe encontrado!
) ELSE (
    echo     ERRO - ngrok.exe NAO encontrado!
    echo     Execute: INSTALAR_NGROK.bat
    echo.
    pause
    exit /b 1
)

:: 2. Verificar o token configurado
echo.
echo [2] Verificando configuracao do ngrok...
"%~dp0ngrok.exe" config check 2>nul
IF %ERRORLEVEL% EQU 0 (
    echo     OK - Configuracao valida!
) ELSE (
    echo     AVISO - Reconfigurando token...
    "%~dp0ngrok.exe" config add-authtoken 3C2dDPRVMFTjwfo9tFeX3JyBxOT_2gQK1HV6iqgnmvJ8rq3ae
)

:: 3. Verificar se o servidor esta rodando na porta 3000
echo.
echo [3] Verificando servidor LM PASSO na porta 3000...
netstat -an | findstr ":3000" | findstr "LISTENING" >nul 2>&1
IF %ERRORLEVEL% EQU 0 (
    echo     OK - Servidor rodando na porta 3000!
) ELSE (
    echo     ERRO - Servidor NAO esta rodando na porta 3000!
    echo     Abra o INICIAR_LM_PASSO.bat primeiro!
)

echo.
echo =====================================================
echo [4] Versao do ngrok:
"%~dp0ngrok.exe" version
echo =====================================================
echo.
echo Se tudo mostrou OK acima, execute: ABRIR_TUNEL_INTERNET.bat
echo Se houve ERRO no servidor, execute: INICIAR_LM_PASSO.bat primeiro
echo.
pause
