@echo off
chcp 65001 >nul
title Configurar Auto Deploy Firebase
cd /d "%~dp0"

set VBS_PATH=%~dp0INICIAR_AUTO_DEPLOY_FIREBASE.vbs
set STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
set STARTUP_LNK=%STARTUP_DIR%\LM_AutoDeploy_Firebase.lnk

echo Criando atalho na inicializacao do Windows...

powershell -NoProfile -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%STARTUP_LNK%'); $s.TargetPath = 'wscript.exe'; $s.Arguments = '\"%VBS_PATH%\"'; $s.WorkingDirectory = '%~dp0'; $s.Description = 'LM Passo - Auto Deploy Firebase'; $s.Save()"

if exist "%STARTUP_LNK%" (
    echo SUCESSO! Auto-deploy Firebase configurado na inicializacao.
    echo Iniciando agora...
    wscript "%VBS_PATH%"
) else (
    echo ERRO: Nao foi possivel criar o atalho.
)
pause
