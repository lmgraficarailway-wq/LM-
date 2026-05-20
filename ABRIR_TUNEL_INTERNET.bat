@echo off
color 0B
mode con: cols=90 lines=30
echo =======================================================
echo   LM PASSO - TUNEL DE INTERNET (NGROK)
echo =======================================================
echo.
echo ATENCAO: O servidor LM PASSO precisa estar aberto!
echo (O INICIAR_REDE.bat deve estar rodando em outra janela)
echo.
echo Iniciando tunel com endereco FIXO na internet...
echo.
echo Seu link permanente sera:
echo https://supercivilly-unterminating-winnifred.ngrok-free.dev
echo.
echo =======================================================
echo.

IF NOT EXIST "%~dp0ngrok.exe" (
    echo ERRO: ngrok.exe nao encontrado!
    echo Execute primeiro o arquivo: INSTALAR_NGROK.bat
    echo.
    pause
    exit /b 1
)

"%~dp0ngrok.exe" http --domain=supercivilly-unterminating-winnifred.ngrok-free.dev 3000

echo.
echo =======================================================
echo O tunel foi encerrado.
pause
