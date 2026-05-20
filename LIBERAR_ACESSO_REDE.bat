@echo off
setlocal ENABLEDELAYEDEXPANSION

title Liberar Acesso na Rede LM Passo
echo ============================================================
echo   ASSISTENTE DE DESBLOQUEIO DE REDE - LM PASSO
echo ============================================================
echo.

echo [1/2] Verificando se voce e Administrador do sistema...
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo.
    echo ===================== ATENCAO =========================
    echo [X] ACESSO NEGADO! O firewall impediu a acao.
    echo.
    echo Para que eu possa liberar o acesso a rede, faca o seguinte:
    echo 1. Feche esta janela preta.
    echo 2. Clique com o botao DIREITO em "LIBERAR_ACESSO_REDE.bat".
    echo 3. Escolha a opcao "Executar como Administrador".
    echo 4. Clique em "Sim" se o Windows perguntar.
    echo =========================================================
    echo.
    pause
    exit /b
)
echo --- Permissao OK!

echo.
echo [2/2] Destravando a porta 3000 no Firewall do Windows Defender...
netsh advfirewall firewall add rule name="LM Passo Server" dir=in action=allow protocol=TCP localport=3000 >nul 2>&1
echo --- Porta 3000 aberta com sucesso no Firewall!

echo.
echo ============================================================
echo CONCLUIDO! O SEU COMPUTADOR AGORA PERMITE ACESSOS EXTERNOS.
echo ============================================================
echo.
echo Agora abra o navegador (Google Chrome) nos OUTROS COMPUTADORES
echo e digite EXATAMENTE o link abaixo:
echo.

for /f "tokens=2 delims=:" %%a in ('ipconfig ^| find "IPv4"') do (
    set MY_IP=%%a
    set MY_IP=!MY_IP: =!
    echo    ==============================
    echo         http://!MY_IP!:3000
    echo    ==============================
)

echo.
echo DICA: Se algo der errado, verifique se ambos os computadores estao
echo conectados na mesma rede de Wi-Fi ou Cabo.
echo.
pause
