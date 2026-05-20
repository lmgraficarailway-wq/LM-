@echo off
color 0B
mode con: cols=90 lines=30
echo =======================================================
echo   LM PASSO - LINK FIXO DE INTERNET
echo =======================================================
echo.
echo ATENCAO: O servidor LM PASSO precisa estar aberto!
echo (O INICIAR_REDE.bat deve estar rodando em outra janela)
echo.
echo Iniciando tunel com endereco FIXO...
echo.
echo Seu link permanente do LM PASSO sera:
echo https://supercivilly-unterminating-winnifred.ngrok-free.dev
echo.
echo =======================================================
echo.

"%~dp0ngrok.exe" http --domain=supercivilly-unterminating-winnifred.ngrok-free.dev 3000

echo.
pause
