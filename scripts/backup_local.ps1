# ============================================================
#  Backup automático do banco de dados LM PASSO
#  Execute com: powershell -ExecutionPolicy Bypass -File backup_local.ps1
# ============================================================

# ► CONFIGURE AQUI ◄
$SERVER_URL = "https://lm-passo.up.railway.app"   # URL do servidor Railway
$USERNAME   = "admin"                                # Usuário master
$PASSWORD   = "123456"                               # Senha do master
$BACKUP_DIR = "$HOME\Desktop\Backups_LMPasso"       # Pasta onde salvar

# ------------------------------------------------------------
# Cria a pasta de backups se não existir
if (-not (Test-Path $BACKUP_DIR)) {
    New-Item -ItemType Directory -Path $BACKUP_DIR | Out-Null
    Write-Host "📁 Pasta criada: $BACKUP_DIR"
}

# Faz login para obter o token
Write-Host "🔐 Fazendo login em $SERVER_URL..."
try {
    $loginBody = @{ username = $USERNAME; password = $PASSWORD } | ConvertTo-Json
    $loginRes  = Invoke-RestMethod -Uri "$SERVER_URL/api/auth/login" `
                                   -Method POST `
                                   -ContentType "application/json" `
                                   -Body $loginBody
    $token = $loginRes.token
    if (-not $token) { throw "Token não retornado" }
    Write-Host "✅ Login OK"
} catch {
    Write-Host "❌ Erro no login: $_"
    exit 1
}

# Monta o nome do arquivo com data e hora
$stamp    = Get-Date -Format "yyyyMMdd_HHmm"
$filename = "backup_lmpasso_$stamp.sqlite"
$destPath = Join-Path $BACKUP_DIR $filename

# Faz o download do banco
Write-Host "⬇️  Baixando backup..."
try {
    Invoke-WebRequest -Uri "$SERVER_URL/api/backup/db?token=$token" `
                      -OutFile $destPath
    $sizeMB = [math]::Round((Get-Item $destPath).Length / 1MB, 2)
    Write-Host "✅ Backup salvo em: $destPath ($sizeMB MB)"
} catch {
    Write-Host "❌ Erro ao baixar backup: $_"
    exit 1
}

# Remove backups com mais de 30 dias
Write-Host "🗑️  Removendo backups antigos (>30 dias)..."
Get-ChildItem -Path $BACKUP_DIR -Filter "backup_lmpasso_*.sqlite" |
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } |
    Remove-Item -Force

Write-Host ""
Write-Host "🎉 Backup concluído! Arquivo: $filename"
