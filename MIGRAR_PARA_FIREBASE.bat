@echo off
echo ================================================
echo  MIGRAÇÃO DOS DADOS: SQLite → Firebase Firestore
echo ================================================
echo.
echo Este script vai copiar TODOS os seus dados do banco
echo local (database.sqlite) para o Firebase Firestore.
echo.
echo Certifique-se que o arquivo firebase-credentials.json
echo está na pasta do projeto antes de continuar.
echo.
pause

echo.
echo Iniciando migração...
node scripts/migrate_to_firestore.js

echo.
if %ERRORLEVEL% == 0 (
    echo ✅ Migração concluída com sucesso!
    echo.
    echo Próximos passos:
    echo 1. Verifique os dados no Firebase Console:
    echo    https://console.firebase.google.com/project/lm-passo/firestore
    echo 2. Execute o DEPLOY_RENDER.bat para publicar no servidor.
) else (
    echo ❌ Erro na migração. Verifique a mensagem acima.
)
echo.
pause
