@echo off
color 0A
mode con: cols=70 lines=15
echo =====================================================
echo   ATUALIZANDO TOKEN NGROK
echo =====================================================
echo.
echo Aplicando novo token...
"%~dp0ngrok.exe" config add-authtoken 3C2eThni42ftcwRB1JuumWtZSUW_6yeAXdnxLFBfZuuDPrPPH
echo.
echo =====================================================
echo  PRONTO! Agora execute: ABRIR_TUNEL_INTERNET.bat
echo =====================================================
echo.
pause
