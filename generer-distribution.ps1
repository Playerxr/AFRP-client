# ============================================================
# Générateur distribution.json pour AFRP (sans Node.js)
# Scanne le dossier du cache et produit distribution.json au
# format attendu par le client RN (validation par taille).
# ============================================================

# ---- Réglages (modifie si besoin) ----
$CacheDir = "C:\afrp-cache"
$OutFile  = "$env:USERPROFILE\afrp-distribution.json"
$Base     = "https://pub-966b7e566edc48fa911560ca57a5b415.r2.dev"
# --------------------------------------

if (-not (Test-Path $CacheDir)) {
  Write-Error "Dossier introuvable : $CacheDir"
  exit 1
}

$ignore = @('samp_log.txt', 'crash_log.log', 'gtasatelem.set')
$root = (Resolve-Path $CacheDir).Path.TrimEnd('\')

$entries = New-Object System.Collections.Generic.List[string]
$id = 1
$total = 0

Get-ChildItem -LiteralPath $root -Recurse -File | ForEach-Object {
  if ($ignore -contains $_.Name) { return }

  $rel = $_.FullName.Substring($root.Length).TrimStart('\')
  $dir = [System.IO.Path]::GetDirectoryName($rel)
  $pathFwd = if ($dir) { $dir -replace '\\', '/' } else { '' }

  $nameJson = ($_.Name | ConvertTo-Json -Compress)
  $pathJson = ($pathFwd | ConvertTo-Json -Compress)
  $size = $_.Length
  $total += $size

  # Marquage GPU : chaque telephone ne telecharge que sa variante de textures.
  # A = Adreno/Qualcomm (dxt), M = Mali (etc), PT = PowerVR (pvr), '' = universel
  $n = $_.Name.ToLower()
  $gpu = ''
  if     ($n -match '\.dxt\.') { $gpu = 'A' }
  elseif ($n -match '\.etc\.') { $gpu = 'M' }
  elseif ($n -match '\.pvr\.') { $gpu = 'PT' }

  $entries.Add("    { ""id"": $id, ""name"": $nameJson, ""path"": $pathJson, ""bytes"": [$size], ""gpu"": ""$gpu"" }")
  $id++
}

$versionHash = -join ((48..57) + (97..122) | Get-Random -Count 6 | ForEach-Object { [char]$_ })
$cacheJson = $entries -join ",`r`n"

$json = @"
{
  "cache": [
$cacheJson
  ],
  "cacheMode": [],
  "projectName": "AFRP",
  "packageName": "com.touch.mobile.dark",
  "versionHash": "$versionHash",
  "rss": "$Base/api/launcher/news",
  "cdnCache": "$Base/mobile/cache",
  "cdnLauncher": "$Base/mobile/launcher",
  "filesContinue": ["settings.ini", "gta_sa.set", "svconfig.ini"],
  "launcher": { "appVersion": "0.0.0", "name": "", "hash": "", "bytes": 0 },
  "servers": [
    {
      "id": 1,
      "show": true,
      "version": "1.0",
      "icon": "$Base/mobile/image/afrp_icon.png",
      "events": [ { "title": "Bienvenue", "style": "blue" } ],
      "slot": 100,
      "bonus": true,
      "name": "AFRP - Afrique RP",
      "description": "SA-MP Mobile",
      "address": "51.38.205.167:24328",
      "sampVersion": "0.3.7"
    }
  ]
}
"@

# UTF-8 SANS BOM (sinon JSON.parse côté client peut échouer)
[System.IO.File]::WriteAllText($OutFile, $json, (New-Object System.Text.UTF8Encoding($false)))

$mb = [math]::Round($total / 1MB, 1)
Write-Host "OK -> $OutFile"
Write-Host "$($entries.Count) fichiers, $mb Mo au total."
