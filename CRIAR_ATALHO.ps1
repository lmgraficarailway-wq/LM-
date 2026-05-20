# Cria atalho LM Passo na Área de Trabalho com ícone correto
$appDir    = Split-Path -Parent $MyInvocation.MyCommand.Path
$desktop   = [Environment]::GetFolderPath("Desktop")
$shortcut  = "$desktop\LM Passo.lnk"
$target    = "$appDir\INICIAR_SILENCIOSO.vbs"
$icon      = "$appDir\public\logo.ico"

$wsh = New-Object -ComObject WScript.Shell
$lnk = $wsh.CreateShortcut($shortcut)
$lnk.TargetPath      = "wscript.exe"
$lnk.Arguments       = "`"$target`""
$lnk.WorkingDirectory = $appDir
$lnk.IconLocation    = "$icon, 0"
$lnk.Description     = "LM Passo - Gestao de Pedidos"
$lnk.Save()

Write-Host "Atalho criado com sucesso em: $shortcut" -ForegroundColor Green
Start-Sleep -Seconds 2
