param(
  [string]$Message = "",
  [string]$Branch = "main",
  [switch]$AllowEmpty
)

$ErrorActionPreference = "Stop"

function Run-Git {
  param([string[]]$GitArgs)
  & git @GitArgs
  if ($LASTEXITCODE -ne 0) {
    throw "[ship] Git komutu basarisiz: git $($GitArgs -join ' ')"
  }
}

function Get-ActionsUrl {
  $origin = (& git remote get-url origin 2>$null)
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($origin)) {
    return ""
  }

  $normalized = $origin.Trim()
  $normalized = $normalized -replace '^git@github\.com:', 'https://github.com/'
  $normalized = $normalized -replace '\.git$', ''
  if ($normalized -match '^https://github\.com/[^/]+/[^/]+$') {
    return "$normalized/actions"
  }
  return ""
}

if ([string]::IsNullOrWhiteSpace($Message)) {
  $Message = "guncelleme $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
}

Run-Git @('rev-parse', '--is-inside-work-tree')
Run-Git @('add', '-A')

$pending = (& git status --porcelain)
if ($LASTEXITCODE -ne 0) {
  throw "[ship] Git status okunamadi."
}

$hasChanges = $false
if ($pending) {
  if (($pending | Out-String).Trim().Length -gt 0) {
    $hasChanges = $true
  }
}

if ($hasChanges) {
  Run-Git @('commit', '-m', $Message)
} elseif ($AllowEmpty) {
  Run-Git @('commit', '--allow-empty', '-m', $Message)
} else {
  Write-Host "[ship] Degisiklik yok. Empty trigger icin: npm run ship:empty"
  exit 0
}

Run-Git @('push', 'origin', $Branch)
Write-Host "[ship] Push tamam. Branch: $Branch"

$actionsUrl = Get-ActionsUrl
if (-not [string]::IsNullOrWhiteSpace($actionsUrl)) {
  Write-Host "[ship] Deploy durumunu buradan kontrol et: $actionsUrl"
}
