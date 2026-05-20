@echo off
title Auto Deploy LM PASSO (Watcher)
cd /d "C:\Users\T.i\.gemini\antigravity\scratch\lm-passo"

echo ====================================================
echo    OBSERVADOR DE REDE - LM PASSO INICIADO
echo ====================================================
echo.
echo O sistema verificara mudancas a cada 60 segundos.
echo Sinta-se livre para minimizar esta janela.
echo.

:loop
git status --porcelain > "%temp%\git_status.txt"
for /F "usebackq" %%A in ("%temp%\git_status.txt") do (
    goto :has_changes
)
goto :wait

:has_changes
echo [%time%] Mudancas detectadas! Subindo para a rede...
git add .
git commit -m "⚙️ Auto-Deploy (Watcher): Atualizacoes Automaticas"
git push origin main
echo [%time%] Deploy realizado com sucesso!
echo.

:wait
timeout /t 60 /nobreak >nul
goto loop
