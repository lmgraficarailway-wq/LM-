@echo off
color 0B
mode con: cols=80 lines=35
echo =====================================================
echo   ADICIONAR FOTOS AO CATALOGO - LM PASSO
echo =====================================================
echo.
echo  COMO FUNCIONA:
echo  1. Vamos abrir a pasta de imagens do sistema
echo  2. Cole ou copie as fotos desejadas para dentro dela
echo  3. Volte aqui e pressione ENTER
echo  4. As fotos serao importadas automaticamente
echo.
echo =====================================================
echo.
echo Abrindo pasta de imagens...
echo.

:: Verifica se a pasta existe
IF NOT EXIST "%~dp0public\uploads\" (
    mkdir "%~dp0public\uploads\"
)

:: Abre a pasta no Explorer
explorer "%~dp0public\uploads\"

echo A pasta foi aberta no Windows Explorer.
echo.
echo *** COLE SUAS FOTOS LA DENTRO AGORA ***
echo.
echo Formatos aceitos: JPG, JPEG, PNG, GIF, WEBP, BMP, AVIF, PDF, CDR
echo.
echo =====================================================
echo.
pause

echo.
echo Importando fotos para o Catalogo...
echo.

:: Chama a API de importacao via PowerShell
powershell -Command ^
    "try { $r = Invoke-RestMethod -Uri 'http://localhost:3000/api/catalogue/import-from-disk' -Method POST; Write-Host ' RESULTADO:' $r.message -ForegroundColor Green; if ($r.imported -gt 0) { Write-Host ' Fotos importadas:' $r.imported -ForegroundColor Cyan } else { Write-Host ' Nenhuma foto nova encontrada.' -ForegroundColor Yellow } } catch { Write-Host ' ERRO: Servidor nao esta rodando! Abra o INICIAR_LM_PASSO.bat primeiro.' -ForegroundColor Red }"

echo.
echo =====================================================
echo  Pronto! Agora abra o Catalogo no sistema e:
echo  - As fotos ja aparecem com o nome do arquivo
echo  - Clique em Editar (lapiszinho) para adicionar
echo    titulo e descricao de cada item
echo =====================================================
echo.
pause
