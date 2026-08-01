# gen-installer-art.ps1 — Artes do instalador NSIS, FIÉIS ao protótipo Dott.
# Princípios do DESIGN.md: dark-first, calm defaults, UM único accent (laranja).
# Fundo = app shell #0d0d10 com os MESMOS radiais azuis sutis do protótipo
# (radial 22%/35% rgba(18,24,70,.55) + 80%/72% rgba(10,18,50,.38)).
# Saída: sidebar.bmp (164x314) e header.bmp (150x57), 24-bit BMP.

Add-Type -AssemblyName System.Drawing

$here = Split-Path -Parent $MyInvocation.MyCommand.Path

function ColorFrom([int]$r,[int]$g,[int]$b) { return [System.Drawing.Color]::FromArgb(255,$r,$g,$b) }

$shell   = ColorFrom 5 5 7         # #050507  black (sem azul, por decisão do CEO)
$glowA   = ColorFrom 16 16 20      # quase-preto, glow só de profundidade
$glowB   = ColorFrom 12 12 15      # quase-preto mais fraco
$accent  = ColorFrom 224 90 56     # #e05a38
$accent2 = ColorFrom 217 68 40     # #d94428
$accentHi= ColorFrom 240 120 86    # brilho do orb
$fg      = ColorFrom 232 232 236   # #e8e8ec
$fg2     = ColorFrom 152 152 170   # #9898aa
$fg3     = ColorFrom 85 85 106     # #55556a

function New-Bmp([int]$w,[int]$h,[string]$path,[scriptblock]$draw) {
  $bmp = New-Object System.Drawing.Bitmap($w,$h,[System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
  & $draw $g $w $h
  $g.Dispose()
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Bmp)
  $bmp.Dispose()
  Write-Host "wrote $path"
}

# Glow radial sutil (centerColor -> shell), respeitando a posição do protótipo.
function Draw-Glow($g, $cx, $cy, $radius, $center) {
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $path.AddEllipse(($cx-$radius), ($cy-$radius), ($radius*2), ($radius*2))
  $pgb = New-Object System.Drawing.Drawing2D.PathGradientBrush($path)
  $pgb.CenterColor = $center
  $pgb.SurroundColors = @($shell)
  $pgb.CenterPoint = New-Object System.Drawing.PointF($cx, $cy)
  $g.FillPath($pgb, $path)
  $pgb.Dispose(); $path.Dispose()
}

# Orb accent contido, com halo discreto (o ÚNICO destaque).
function Draw-Orb($g, $cx, $cy, $r) {
  Draw-Glow $g $cx $cy ($r*2.0) (ColorFrom 60 28 24)   # halo quente bem sutil
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $path.AddEllipse(($cx-$r), ($cy-$r), ($r*2), ($r*2))
  $pgb = New-Object System.Drawing.Drawing2D.PathGradientBrush($path)
  $pgb.CenterColor = $accentHi
  $pgb.SurroundColors = @($accent2)
  $pgb.CenterPoint = New-Object System.Drawing.PointF(($cx - $r*0.3), ($cy - $r*0.35))
  $g.FillPath($pgb, $path)
  $pgb.Dispose(); $path.Dispose()
}

# Fonte do sistema (a mesma família do protótipo: Segoe UI no Windows).
function Font([single]$size,[System.Drawing.FontStyle]$style) {
  return New-Object System.Drawing.Font('Segoe UI', $size, $style, [System.Drawing.GraphicsUnit]::Pixel)
}

# ---------- SIDEBAR 164x314 ----------
New-Bmp 164 314 (Join-Path $here 'sidebar.bmp') {
  param($g,$w,$h)
  $g.Clear($shell)
  # radiais azuis nas posições do protótipo (22%/35% e 80%/72%), sutis
  Draw-Glow $g ($w*0.22) ($h*0.35) 120 $glowA
  Draw-Glow $g ($w*0.80) ($h*0.72) 95  $glowB
  # orb accent contido (r=14)
  Draw-Orb $g ($w/2) 92 14
  # wordmark "Dott" — peso 700, branco --fg
  $fLogo = Font 28 ([System.Drawing.FontStyle]::Bold)
  $brFg  = New-Object System.Drawing.SolidBrush($fg)
  $sf = New-Object System.Drawing.StringFormat
  $sf.Alignment = [System.Drawing.StringAlignment]::Center
  $g.DrawString('Dott', $fLogo, $brFg, ($w/2), 132, $sf)
  # tagline --fg2
  $fTag = Font 11.5 ([System.Drawing.FontStyle]::Regular)
  $brFg2 = New-Object System.Drawing.SolidBrush($fg2)
  $g.DrawString('Sua mente, organizada.', $fTag, $brFg2, ($w/2), 176, $sf)
  # rodapé --fg3 (uppercase com leve tracking, como labels do protótipo)
  $fFoot = Font 9.5 ([System.Drawing.FontStyle]::Regular)
  $brFg3 = New-Object System.Drawing.SolidBrush($fg3)
  $g.DrawString('P A R A   W O R K S P A C E', $fFoot, $brFg3, ($w/2), 292, $sf)
  $fLogo.Dispose(); $fTag.Dispose(); $fFoot.Dispose()
  $brFg.Dispose(); $brFg2.Dispose(); $brFg3.Dispose(); $sf.Dispose()
}

# ---------- HEADER 150x57 ----------
New-Bmp 150 57 (Join-Path $here 'header.bmp') {
  param($g,$w,$h)
  $g.Clear($shell)
  Draw-Glow $g ($w*0.85) ($h*0.5) 70 $glowA
  # dot accent pequeno (como .tb-dot do protótipo, 9px) com halo discreto
  Draw-Orb $g 20 ($h/2) 7
  # "Dott" peso 700
  $fLogo = Font 17 ([System.Drawing.FontStyle]::Bold)
  $brFg = New-Object System.Drawing.SolidBrush($fg)
  $sf = New-Object System.Drawing.StringFormat
  $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
  $g.DrawString('Dott', $fLogo, $brFg, 34, ($h/2), $sf)
  $fLogo.Dispose(); $brFg.Dispose(); $sf.Dispose()
}

Write-Host "Installer art (faithful to prototype) generated."
