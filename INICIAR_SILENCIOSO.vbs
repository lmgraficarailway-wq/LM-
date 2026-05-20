Set WshShell = CreateObject("WScript.Shell")
appDir = Left(WScript.ScriptFullName, InStrRev(WScript.ScriptFullName, "\"))

' 1. Iniciar servidor Node.js minimizado
WshShell.Run "cmd /k ""title LM Passo - Servidor & cd /d """ & appDir & """ & node server.js""", 2, False

' 2. Aguardar servidor subir
WScript.Sleep 2500

' 3. Iniciar tunel ngrok minimizado (link fixo de internet)
WshShell.Run "cmd /k ""title LM Passo - Tunel Internet & cd /d """ & appDir & """ & ngrok.exe http --domain=supercivilly-unterminating-winnifred.ngrok-free.dev 3000""", 2, False

' 4. Aguardar ngrok conectar e abrir navegador no link publico
WScript.Sleep 3000
WshShell.Run "https://supercivilly-unterminating-winnifred.ngrok-free.dev"
