@echo off
title LM PASSO - Deploy Railway
color 0A
echo.
echo  ==========================================
echo    LM PASSO - ENVIAR ATUALIZACAO RAILWAY
echo  ==========================================
echo.

cd /d "%~dp0"

:: Verificacao de seguranca: confirma que e o LM PASSO
if not exist "server\routes\api.routes.js" (
    echo  [ERRO] Esta pasta nao parece ser o LM PASSO correto!
    echo  Verifique se voce esta na pasta certa.
    pause >nul
    exit /b 1
)

:: Garante que o arte-generator nao existe
if exist "arte-generator" (
    echo  [AVISO] Removendo pasta arte-generator antes do deploy...
    rmdir /s /q "arte-generator"
)

echo  [1/3] Salvando alteracoes no historico (Git)...
git add .
git commit -m "update: %date% %time%"

echo.
echo  [2/3] Enviando para o servidor Railway...
call npx @railway/cli up --service aace4273-4c36-4df5-8376-781e61cefd30 --detach

echo.
echo  ==========================================
if %ERRORLEVEL% EQU 0 (
    echo    SUCESSO! O LM PASSO foi atualizado.
    echo    Aguarde 2-3 minutos e acesse:
    echo    https://lm-passo-production.up.railway.app
) else (
    echo    [AVISO] Verifique o painel do Railway:
    echo    https://railway.com/project/838e84c0-dd4a-415e-ace6-68803f1b847c
)
echo  ==========================================
echo.
pause
