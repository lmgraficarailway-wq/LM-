@echo off
cd /d C:\Users\T.i\Desktop\aplicativo
echo.
echo  Abrindo login do Railway no navegador...
echo  Clique em AUTHORIZE quando aparecer no navegador!
echo.
npx @railway/cli login
echo.
echo  Fazendo deploy...
npx @railway/cli up --detach
echo.
echo  Pronto!
pause
