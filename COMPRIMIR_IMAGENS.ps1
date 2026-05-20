# COMPRIMIR_IMAGENS.ps1
# Comprime todas as imagens da pasta uploads sem instalar nada extra
# Usa System.Drawing nativo do Windows

param(
    [int]$MaxWidth = 1200,
    [int]$Quality = 80
)

Add-Type -AssemblyName System.Drawing

$uploadsPath = Join-Path $PSScriptRoot "public\uploads"
$exts = @('.jpg', '.jpeg', '.jfif', '.jpe', '.png', '.bmp')

if (-not (Test-Path $uploadsPath)) {
    Write-Host "ERRO: Pasta uploads nao encontrada: $uploadsPath" -ForegroundColor Red
    exit 1
}

$files = Get-ChildItem -Path $uploadsPath -File | Where-Object { $exts -contains $_.Extension.ToLower() }

if ($files.Count -eq 0) {
    Write-Host "Nenhuma imagem encontrada na pasta uploads." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  COMPRIMINDO IMAGENS DO CATALOGO - LM PASSO" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Pasta: $uploadsPath"
Write-Host "  Imagens encontradas: $($files.Count)"
Write-Host "  Largura maxima: ${MaxWidth}px | Qualidade JPEG: ${Quality}%"
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

$totalAntes = 0
$totalDepois = 0
$processadas = 0
$erros = 0

# Encoder JPEG com qualidade configuravel
$jpegEncoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
$encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]$Quality)

foreach ($file in $files) {
    try {
        $sizeBefore = $file.Length
        $totalAntes += $sizeBefore

        $img = [System.Drawing.Image]::FromFile($file.FullName)
        $origW = $img.Width
        $origH = $img.Height

        # Calcular novo tamanho mantendo proporcao
        if ($origW -le $MaxWidth) {
            $newW = $origW
            $newH = $origH
        } else {
            $newW = $MaxWidth
            $newH = [int]($origH * $MaxWidth / $origW)
        }

        # Criar bitmap redimensionado com alta qualidade
        $bmp = New-Object System.Drawing.Bitmap($newW, $newH)
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $g.DrawImage($img, 0, 0, $newW, $newH)
        $g.Dispose()
        $img.Dispose()

        # Salvar sempre como JPEG (mais leve)
        $outputPath = [System.IO.Path]::ChangeExtension($file.FullName, '.jpg')
        $bmp.Save($outputPath, $jpegEncoder, $encoderParams)
        $bmp.Dispose()

        # Se o arquivo original tinha extensao diferente de .jpg, remover o original
        if ($file.FullName -ne $outputPath) {
            Remove-Item $file.FullName -Force
        }

        $sizeAfter = (Get-Item $outputPath).Length
        $totalDepois += $sizeAfter
        $reducao = [math]::Round((1 - $sizeAfter / $sizeBefore) * 100)
        $antesKB = [math]::Round($sizeBefore / 1KB)
        $depoisKB = [math]::Round($sizeAfter / 1KB)

        Write-Host "  OK  $($file.Name)" -ForegroundColor Green -NoNewline
        Write-Host "  ${antesKB}KB -> ${depoisKB}KB  (-${reducao}%)" -ForegroundColor DarkGray

        $processadas++
    } catch {
        Write-Host "  ERRO $($file.Name): $_" -ForegroundColor Red
        $erros++
    }
}

$totalAntesKB = [math]::Round($totalAntes / 1KB)
$totalDepoisKB = [math]::Round($totalDepois / 1KB)
$totalReducao = if ($totalAntes -gt 0) { [math]::Round((1 - $totalDepois / $totalAntes) * 100) } else { 0 }

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  RESULTADO FINAL" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Processadas: $processadas imagens" -ForegroundColor Green
if ($erros -gt 0) { Write-Host "  Erros: $erros" -ForegroundColor Red }
Write-Host "  Tamanho antes: ${totalAntesKB} KB"
Write-Host "  Tamanho depois: ${totalDepoisKB} KB"
Write-Host "  Reducao total: ${totalReducao}%" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Pronto! Recarregue o catalogo no aplicativo." -ForegroundColor Green
