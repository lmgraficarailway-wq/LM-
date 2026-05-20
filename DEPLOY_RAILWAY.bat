@echo off
title Railway Deploy Automático
color 0B
echo.
echo =======================================================
echo          LM PASSO - DEPLOY PARA O RAILWAY
echo =======================================================
echo.
echo 1. O seu navegador vai abrir na pagina do Railway.
echo 2. Clique em "Authorize" no navegador.
echo 3. Volte para esta janela preta e aguarde o envio!
echo.
echo =======================================================
echo.
echo Pressione qualquer tecla para abrir o navegador...
pause >nul
echo.
echo Abrindo navegador para login...
call npx @railway/cli login
echo.
echo Iniciando o deploy para o servidor...
call npx @railway/cli up --detach
echo.
echo =======================================================
echo DEPLOY ENVIADO COM SUCESSO!
echo O site ficara online em cerca de 2 a 3 minutos.
echo =======================================================
echo.
pause
