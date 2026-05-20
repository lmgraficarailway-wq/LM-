@echo off
title LM Passo - Restaurar Dados Salvos
cd /d "%~dp0"

echo.
echo  ==========================================
echo    LM PASSO - Restaurando Dados Salvos
echo    (usando ultimo export disponivel)
echo  ==========================================
echo.

:: Para o servidor se estiver rodando
echo  [0] Parando servidor atual...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 1 /nobreak >nul

:: Verifica se o arquivo de export existe
if not exist "scripts\db_export.json" (
    echo.
    echo  ERRO: Arquivo scripts\db_export.json nao encontrado!
    echo  Execute primeiro o PUXAR_DADOS_REDE.bat quando
    echo  o servidor Railway estiver online.
    echo.
    pause
    exit /b 1
)

echo  [1/2] Importando dados do ultimo export salvo...
echo.
node scripts/restore_local.js
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo  ERRO ao restaurar dados. Verifique o Node.js.
    echo.
    pause
    exit /b 1
)

echo.
echo  [2/2] Iniciando servidor com os dados restaurados...
timeout /t 1 /nobreak >nul

echo.
echo  ==========================================
echo    DADOS RESTAURADOS COM SUCESSO!
echo.
echo    Acesse: http://localhost:3000
echo  ==========================================
echo.
echo  (Nao feche esta janela - e o servidor)
echo.

:INICIO
node server.js
if %ERRORLEVEL% EQU 0 (
    echo  Reiniciando...
    timeout /t 1 /nobreak >nul
    goto INICIO
)

echo.
echo  Servidor encerrado. Pressione qualquer tecla para fechar.
pause >nul
