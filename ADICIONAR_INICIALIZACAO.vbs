Set oWS = WScript.CreateObject("WScript.Shell")
sStartup = oWS.SpecialFolders("Startup")
sLinkFile = sStartup & "\LMPasso.lnk"
sTarget = "C:\Users\T.i\.gemini\antigravity\scratch\lm-passo\INICIAR_REDE.bat"
sWorkDir = "C:\Users\T.i\.gemini\antigravity\scratch\lm-passo"

Set oLink = oWS.CreateShortcut(sLinkFile)
oLink.TargetPath = sTarget
oLink.WorkingDirectory = sWorkDir
oLink.Description = "LM Passo - Servidor Automatico"
oLink.Save

MsgBox "LM Passo configurado para iniciar automaticamente com o Windows!" & vbCrLf & vbCrLf & "Atalho criado em:" & vbCrLf & sLinkFile, 64, "LM Passo"
