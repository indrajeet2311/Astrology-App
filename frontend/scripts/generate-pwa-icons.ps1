Add-Type -AssemblyName System.Drawing
$output = Join-Path $PSScriptRoot '../public/icons'
[System.IO.Directory]::CreateDirectory($output) | Out-Null
foreach ($entry in @(@{ Name = 'icon-192.png'; Size = 192 }, @{ Name = 'icon-512.png'; Size = 512 }, @{ Name = 'maskable-512.png'; Size = 512 }, @{ Name = 'apple-touch-icon.png'; Size = 180 })) {
    $size = $entry.Size
    $bitmap = New-Object System.Drawing.Bitmap($size, $size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#0b0d1f'))
    $gold = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#e2b857'))
    $pen = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml('#e2b857'), ($size * 0.018))
    $graphics.DrawEllipse($pen, ($size * 0.23), ($size * 0.23), ($size * 0.54), ($size * 0.54))
    $points = New-Object 'System.Drawing.PointF[]' 8
    $points[0] = New-Object System.Drawing.PointF(($size * 0.5), ($size * 0.29))
    $points[1] = New-Object System.Drawing.PointF(($size * 0.55), ($size * 0.45))
    $points[2] = New-Object System.Drawing.PointF(($size * 0.71), ($size * 0.5))
    $points[3] = New-Object System.Drawing.PointF(($size * 0.55), ($size * 0.55))
    $points[4] = New-Object System.Drawing.PointF(($size * 0.5), ($size * 0.71))
    $points[5] = New-Object System.Drawing.PointF(($size * 0.45), ($size * 0.55))
    $points[6] = New-Object System.Drawing.PointF(($size * 0.29), ($size * 0.5))
    $points[7] = New-Object System.Drawing.PointF(($size * 0.45), ($size * 0.45))
    $graphics.FillPolygon($gold, $points)
    $graphics.FillEllipse($gold, ($size * 0.68), ($size * 0.25), ($size * 0.08), ($size * 0.08))
    $bitmap.Save((Join-Path $output $entry.Name), [System.Drawing.Imaging.ImageFormat]::Png)
    $pen.Dispose()
    $gold.Dispose()
    $graphics.Dispose()
    $bitmap.Dispose()
}