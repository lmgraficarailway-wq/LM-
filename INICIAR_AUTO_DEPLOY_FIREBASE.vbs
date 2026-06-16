Set objShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")

Dim scriptDir
scriptDir = objFSO.GetParentFolderName(WScript.ScriptFullName)

' Fecha instancia anterior se existir
objShell.Run "taskkill /f /fi ""WINDOWTITLE eq 🔥 LM PASSO - Auto Deploy Firebase (Ativo)*""", 0, False

WScript.Sleep 1000

' Inicia o watcher em background (janela minimizada)
objShell.Run "cmd /c """ & scriptDir & "\AUTO_DEPLOY_FIREBASE.bat""", 1, False
