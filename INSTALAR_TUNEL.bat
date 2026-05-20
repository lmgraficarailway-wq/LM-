@echo off
color 0A
mode con: cols=80 lines=20
echo =======================================================
echo   INSTALANDO TUNEL DE INTERNET - LM PASSO
echo =======================================================
echo.
echo Baixando o programa de tunel... aguarde.
echo (Isso so precisa ser feito uma unica vez!)
echo.

powershell -Command "Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/download/2026.3.0/cloudflared-windows-amd64.exe' -OutFile '%~dp0cloudflared.exe' -UseBasicParsing"

IF EXIST "%~dp0cloudflared.exe" (
    color 0A
    echo.
    echo =======================================================
    echo  INSTALACAO CONCLUIDA COM SUCESSO!
    echo =======================================================
    echo.
    echo Agora feche esta janela e abra o arquivo:
    echo ABRIR_TUNEL_INTERNET.bat
    echo.
) ELSE (
    color 0C
    echo.
    echo ERRO: Nao foi possivel baixar. Verifique sua internet.
    echo.
)
pause
