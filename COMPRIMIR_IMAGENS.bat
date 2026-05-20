@echo off
color 0B
mode con: cols=80 lines=40
echo =====================================================
echo   COMPRIMIR IMAGENS DO CATALOGO - LM PASSO
echo =====================================================
echo.
echo  O que este script faz:
echo  - Reduz todas as imagens para no maximo 1200px
echo  - Comprime a qualidade para 80%%
echo  - Converte para JPEG (formato mais leve)
echo  - Mantem a aparencia visual boa
echo.
echo  RESULTADO ESPERADO: reducao de 60%% a 90%% do tamanho
echo.
echo =====================================================
echo.
pause

echo.
echo Comprimindo imagens... aguarde.
echo.

powershell -ExecutionPolicy Bypass -File "%~dp0COMPRIMIR_IMAGENS.ps1"

echo.
pause
