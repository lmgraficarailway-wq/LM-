@echo off
:: Cria a tarefa agendada "Backup LM PASSO" — dias úteis às 09:00
:: Execute este arquivo como ADMINISTRADOR (botão direito → Executar como administrador)

SET SCRIPT=C:\Users\T.i\.gemini\antigravity\scratch\lm-passo\scripts\backup_local.ps1

schtasks /create ^
  /tn "Backup LM PASSO" ^
  /tr "powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File \"%SCRIPT%\"" ^
  /sc WEEKLY ^
  /d MON,TUE,WED,THU,FRI ^
  /st 09:00 ^
  /f ^
  /rl HIGHEST

IF %ERRORLEVEL%==0 (
    echo.
    echo [OK] Tarefa criada! Backup sera feito automaticamente de segunda a sexta as 09:00.
) ELSE (
    echo.
    echo [ERRO] Nao foi possivel criar a tarefa. Execute este arquivo como ADMINISTRADOR.
)

pause
