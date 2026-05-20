@echo off
title LM Passo - Servidor
cd /d "%~dp0"

:INICIO
echo.
echo  ==========================================
echo    LM PASSO - Iniciando...
echo  ==========================================
echo.

:: Mata processo node anterior se existir
taskkill /F /IM node.exe >nul 2>&1
timeout /t 1 /nobreak >nul

:: Tenta adicionar regra de firewall silenciosamente (so funciona se for admin)
netsh advfirewall firewall add rule name="LM Passo - Porta 3000" dir=in action=allow protocol=TCP localport=3000 >nul 2>&1

:: Abre o browser apos 2 segundos (em processo separado)
start /B cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:3000"

:: Inicia o servidor (fica visivel nesta janela)
node server.js

:: Se saiu com codigo 0 = pedido de reinicio (botao Reiniciar no Admin)
if %ERRORLEVEL% EQU 0 (
    echo.
    echo  Reiniciando servidor...
    timeout /t 1 /nobreak >nul
    goto INICIO
)

:: Qualquer outro codigo = erro ou fechamento manual
echo.
echo  Servidor encerrado. Pressione qualquer tecla para fechar.
pause >nul
