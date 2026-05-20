Set ws = CreateObject("WScript.Shell")
Dim desktop
desktop = ws.SpecialFolders("Desktop")
Set s = ws.CreateShortcut(desktop & "\Arte Generator.lnk")
s.TargetPath = "c:\Users\T.i\Desktop\aplicativo\arte-generator\index.html"
s.WorkingDirectory = "c:\Users\T.i\Desktop\aplicativo\arte-generator"
s.Description = "Arte Generator"
s.IconLocation = "shell32.dll, 13"
s.Save
WScript.Echo "Atalho criado na area de trabalho!"
