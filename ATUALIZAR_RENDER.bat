@echo off
title LM Passo - Enviando atualizacoes para o Render...
cd /d "%~dp0"
color 0A

echo.
echo  ╔═══════════════════════════════════════════════════╗
echo  ║       LM PASSO - ATUALIZAR SERVIDOR RENDER        ║
echo  ╚═══════════════════════════════════════════════════╝
echo.
echo  Enviando alteracoes para o GitHub...
echo  O Render vai atualizar automaticamente em seguida.
echo.

:: Adiciona todos os arquivos modificados (exceto arquivos sensíveis e binários)
git add public\ server\ server.js package.json render.yaml

:: Cria o commit com a data e hora atual
for /f "tokens=1-6 delims=/ " %%a in ("%date% %time%") do (
    set DT=%%c-%%b-%%a %%d:%%e
)
git commit -m "update: atualizacao automatica - %date% %time%"

:: Verifica se há algo para enviar
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo  [INFO] Nenhuma alteracao nova encontrada.
    echo  O servidor Render ja esta com a versao mais recente!
    echo.
    timeout /t 4 /nobreak >nul
    exit /b 0
)

echo.
echo  Enviando para o GitHub...
git push origin main

if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo.
    echo  [ERRO] Falha ao enviar. Verifique sua conexao com a internet.
    echo.
    pause
    exit /b 1
)

echo.
echo  ╔═══════════════════════════════════════════════════╗
echo  ║  ✓ ATUALIZADO COM SUCESSO!                        ║
echo  ║                                                   ║
echo  ║  O Render esta aplicando as mudancas agora.       ║
echo  ║  Aguarde ~2 minutos e acesse:                     ║
echo  ║  https://lm-passo.onrender.com                   ║
echo  ╚═══════════════════════════════════════════════════╝
echo.

:: Abre o Render para acompanhar o deploy
start "" "https://lm-passo.onrender.com"

timeout /t 6 /nobreak >nul
