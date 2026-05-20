@echo off
:: Solicita elevacao automatica se nao for administrador
net session >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Solicitando permissao de administrador...
    powershell -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

title LM Passo - Liberando Firewall
echo.
echo  ==========================================
echo    Liberando porta 3000 no Firewall...
echo  ==========================================
echo.

:: Remove regras antigas para evitar duplicatas
netsh advfirewall firewall delete rule name="LM Passo - Porta 3000" >nul 2>&1
netsh advfirewall firewall delete rule name="LM Passo - Node.exe" >nul 2>&1

:: Adiciona regra por PORTA (vale para qualquer processo)
netsh advfirewall firewall add rule name="LM Passo - Porta 3000" dir=in action=allow protocol=TCP localport=3000

:: Adiciona regra para o executavel node.exe especificamente
for /f "tokens=*" %%i in ('where node.exe 2^>nul') do (
    netsh advfirewall firewall add rule name="LM Passo - Node.exe" dir=in action=allow program="%%i" protocol=TCP
)

:: Adiciona regra para o lm-passo.exe tambem
netsh advfirewall firewall delete rule name="LM Passo - Exe" >nul 2>&1
netsh advfirewall firewall add rule name="LM Passo - Exe" dir=in action=allow program="%~dp0lm-passo.exe" protocol=TCP

echo.
echo  ==========================================
echo   PRONTO! Rede liberada com sucesso.
echo   Agora outros dispositivos podem acessar:
echo   http://192.168.1.16:3000
echo  ==========================================
echo.
timeout /t 4 /nobreak >nul
exit
