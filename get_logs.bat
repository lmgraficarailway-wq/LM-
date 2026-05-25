@echo off
chcp 65001 >nul
set CLOUDSDK_PYTHON=%LOCALAPPDATA%\python-embed\python.exe
C:\Users\T.i\AppData\Local\gcloud-sdk\google-cloud-sdk\bin\gcloud.cmd logging read "resource.type=cloud_run_revision AND resource.labels.service_name=lm-passo-api" --limit 50 --format=json > logs.json
