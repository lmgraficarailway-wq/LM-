@echo off
chcp 65001 >nul
title LM Passo — Migrar Banco SQLite → Firestore

echo.
echo ╔══════════════════════════════════════════════════════╗
echo ║     MIGRAÇÃO: SQLite → Firebase Firestore           ║
echo ╚══════════════════════════════════════════════════════╝
echo.
echo Este script vai migrar TODOS os dados do banco local
echo (database.sqlite) para o Firestore na nuvem.
echo.
echo ⚠️  Execute isso apenas UMA VEZ!
echo     (Executar de novo sobrescreve os dados existentes)
echo.
set /p CONFIRM=Deseja continuar? (s/n): 
if /i "%CONFIRM%" neq "s" (
    echo Cancelado.
    pause
    exit /b 0
)

echo.
echo Iniciando migração...
node scripts/migrate_to_firestore.js

if %errorlevel% neq 0 (
    echo.
    echo ❌ Migração falhou! Verifique os erros acima.
    pause
    exit /b 1
)

echo.
echo ✅ Banco migrado para o Firestore com sucesso!
echo.
pause
