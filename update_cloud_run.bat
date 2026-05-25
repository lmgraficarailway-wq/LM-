@echo off
call "%LOCALAPPDATA%\Google\Cloud SDK\cloud_env.bat"
gcloud run services update lm-passo-api --update-env-vars=USE_SQLITE=false --region southamerica-east1
