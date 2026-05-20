@echo off
color 0A
mode con: cols=80 lines=25
echo =======================================================
echo   INSTALANDO NGROK - LM PASSO
echo =======================================================
echo.

:: Baixar ngrok se não existir
IF NOT EXIST "%~dp0ngrok.exe" (
    echo Baixando ngrok... aguarde.
    powershell -Command "Invoke-WebRequest -Uri 'https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-windows-amd64.zip' -OutFile '%~dp0ngrok.zip' -UseBasicParsing"
    echo Extraindo...
    powershell -Command "Expand-Archive -Path '%~dp0ngrok.zip' -DestinationPath '%~dp0' -Force"
    del "%~dp0ngrok.zip" 2>nul
    echo Pronto!
    echo.
)

:: Configurar o token
echo Configurando autenticacao...
"%~dp0ngrok.exe" config add-authtoken 3C2eThni42ftcwRB1JuumWtZSUW_6yeAXdnxLFBfZuuDPrPPH

echo.
echo =======================================================
echo  INSTALACAO CONCLUIDA!
echo  Agora abra o arquivo: ABRIR_NGROK.bat
echo =======================================================
echo.
pause
