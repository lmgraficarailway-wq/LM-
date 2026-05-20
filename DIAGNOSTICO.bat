@echo off
title LM Passo - Diagnostico
cd /d "%~dp0"
echo ============================================
echo    LM PASSO - MODO DIAGNOSTICO
echo ============================================
echo.
echo Verificando Node.js...
node --version
if ERRORLEVEL 1 (
    echo ERRO: Node.js nao encontrado! Instale em nodejs.org
    pause
    exit /b 1
)
echo.
echo Iniciando servidor (erros aparecem aqui)...
echo.
node server.js
echo.
echo SERVIDOR ENCERRADO.
pause
