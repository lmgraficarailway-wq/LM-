$gcloudPath = "$env:LOCALAPPDATA\gcloud-sdk\google-cloud-sdk\bin"
$currentPath = [Environment]::GetEnvironmentVariable('PATH', 'User')
if ($currentPath -notlike "*gcloud*") {
    [Environment]::SetEnvironmentVariable('PATH', $currentPath + ';' + $gcloudPath, 'User')
    Write-Host "PATH_ATUALIZADO: $gcloudPath"
} else {
    Write-Host "GCLOUD_JA_NO_PATH"
}
Write-Host "Caminho gcloud: $gcloudPath"
