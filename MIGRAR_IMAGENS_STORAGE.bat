@echo off
chcp 65001 >nul
title LM Passo — Migrar Imagens → Firebase Storage

echo.
echo ╔══════════════════════════════════════════════════════╗
echo ║   MIGRAÇÃO: Imagens locais → Firebase Storage       ║
echo ╚══════════════════════════════════════════════════════╝
echo.
echo Este script vai enviar todas as fotos da pasta
echo public\uploads\ para o Firebase Storage e atualizar
echo os links no Firestore automaticamente.
echo.
echo ⚠️  Certifique-se de que o Firestore já foi migrado
echo    antes de rodar este script!
echo.
set /p CONFIRM=Deseja continuar? (s/n): 
if /i "%CONFIRM%" neq "s" (
    echo Cancelado.
    pause
    exit /b 0
)

echo.
echo Enviando imagens para o Firebase Storage...
node scripts/upload_images_storage.js

if %errorlevel% neq 0 (
    echo.
    echo ⚠️  Algumas imagens podem ter falhado. Verifique acima.
    pause
    exit /b 1
)

echo.
echo ✅ Imagens migradas com sucesso para o Firebase Storage!
echo.
pause
