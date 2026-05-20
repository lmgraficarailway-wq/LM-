@echo off
color 0B
mode con: cols=80 lines=35
echo Buscando os seus enderecos de rede...
echo.

node -e "const os=require('os'); const n=os.networkInterfaces(); let ip='localhost'; for(const f of Object.values(n)) for(const a of f) if(a.family==='IPv4'&&!a.internal){ip=a.address;break;}; const host=os.hostname().toLowerCase(); console.log('\n=====================================================\n LINKS PARA ACESSAR O APLICATIVO DE OUTROS PCS \n=====================================================\n\n OPCAO 1 - Por nome do computador (recomendado):\n http://' + host + '.local:3000 \n\n OPCAO 2 - Por numero de IP:\n http://' + ip + ':3000\n\n===================================================\n');"

echo.
echo =====================================================
echo   LINK DE INTERNET (qualquer lugar do mundo)
echo =====================================================
echo.
echo   https://supercivilly-unterminating-winnifred.ngrok-free.dev
echo.
echo   ATENCAO: O ABRIR_TUNEL_INTERNET.bat deve estar aberto!
echo =====================================================
echo.
echo INSTRUCOES REDE LOCAL:
echo 1. Va no outro computador (no mesmo Wi-Fi/Rede).
echo 2. Abra o Chrome ou Edge.
echo 3. Tente primeiro a OPCAO 1 (nome). Se nao abrir, use a OPCAO 2 (IP).
echo 4. Salve nos favoritos do navegador!
echo.
pause

