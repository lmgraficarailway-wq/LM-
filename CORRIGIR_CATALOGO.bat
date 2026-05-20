@echo off
color 0E
mode con: cols=80 lines=40
echo =====================================================
echo   CORRIGIR CATALOGO - LM PASSO
echo =====================================================
echo.
echo  O que este script faz:
echo  - Remove entradas cujas imagens nao existem mais
echo  - Importa automaticamente os arquivos atuais
echo    da pasta uploads para o catalogo
echo.
pause

echo.
echo Corrigindo...
echo.

node "%~dp0fix_catalogue.js"

echo.
echo Pronto! Recarregue o catalogo no aplicativo.
echo.
pause
