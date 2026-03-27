param(
  [string]$VpsHost = "178.210.161.210",
  [string]$PublicBaseUrl = "https://tr-159ae5.hosting.net.tr",
  [string]$User = "root",
  [int]$Port = 22,
  [string]$KeyPath = "$env:USERPROFILE\.ssh\ticarnet_actions",
  [string]$SmtpUser = "mustafaard76@gmail.com",
  [string]$SmtpAppPassword = "",
  [string]$MailFrom = "TicarNet Online <mustafaard76@gmail.com>",
  [string]$SupportInboxEmail = "mustafaard76@gmail.com",
  [bool]$FirebaseAuthEnabled = $true,
  [string]$FirebaseWebApiKey = "",
  [switch]$ResetGameData
)

$ErrorActionPreference = "Stop"

function Require-Command {
  param([string]$Name)
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "[deploy-direct] Komut bulunamadi: $Name"
  }
}

function Escape-BashDoubleQuoted {
  param([string]$Value)
  if ($null -eq $Value) {
    return ""
  }
  return $Value.Replace('\', '\\').Replace('"', '\"').Replace('$', '\$').Replace('`', '\`')
}

Require-Command "tar"
Require-Command "scp"
Require-Command "ssh"
Require-Command "curl.exe"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Resolve-Path (Join-Path $ScriptDir "..")
$ArchivePath = Join-Path $env:TEMP "ticarnet-deploy.tgz"

Write-Host "[deploy-direct] Proje: $ProjectRoot"
Write-Host "[deploy-direct] Arsiv olusturuluyor..."

if (Test-Path $ArchivePath) {
  Remove-Item $ArchivePath -Force
}

$TarExcludes = @(
  "--exclude=node_modules",
  "--exclude=.git",
  "--exclude=dist",
  "--exclude=backups",
  "--exclude=.tools",
  "--exclude=release",
  "--exclude=android/.gradle*",
  "--exclude=android/.idea*",
  "--exclude=ticarnet-deploy.tgz",
  "--exclude=ticarnet-part-*"
)

& tar -czf $ArchivePath @TarExcludes -C $ProjectRoot .
if ($LASTEXITCODE -ne 0) {
  throw "[deploy-direct] Arsiv olusturma basarisiz."
}

Write-Host "[deploy-direct] Sunucu erisimi test ediliyor..."
$PortCheck = Test-NetConnection -ComputerName $VpsHost -Port $Port -WarningAction SilentlyContinue
if (-not $PortCheck.TcpTestSucceeded) {
  throw "[deploy-direct] ${VpsHost}:$Port erisilemedi. Hosting firewall/SSH portunu kontrol et."
}

$ScpArgs = @("-P", "$Port")
if (Test-Path $KeyPath) {
  $ScpArgs += @("-i", $KeyPath)
}
$ScpArgs += @($ArchivePath, "${User}@${VpsHost}:/tmp/ticarnet-deploy.tgz")

Write-Host "[deploy-direct] Arsiv sunucuya yukleniyor..."
& scp @ScpArgs
if ($LASTEXITCODE -ne 0) {
  throw "[deploy-direct] SCP yukleme basarisiz."
}

$RemoteScript = @'
set -Eeuo pipefail

if ! command -v node >/dev/null 2>&1; then
  apt-get update -y
  apt-get install -y ca-certificates curl gnupg openssl
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

if ! command -v pm2 >/dev/null 2>&1; then
  npm install -g pm2
fi

if ! command -v nginx >/dev/null 2>&1; then
  apt-get update -y
  apt-get install -y nginx
fi

mkdir -p /var/www/ticarnet

if [ -f /var/www/ticarnet/current/server/.env ]; then
  cp /var/www/ticarnet/current/server/.env /tmp/ticarnet-server.env
fi

rm -rf /var/www/ticarnet/current
mkdir -p /var/www/ticarnet/current
tar -xzf /tmp/ticarnet-deploy.tgz -C /var/www/ticarnet/current

if [ -f /tmp/ticarnet-server.env ]; then
  mkdir -p /var/www/ticarnet/current/server
  cp /tmp/ticarnet-server.env /var/www/ticarnet/current/server/.env
fi

ENV_FILE=/var/www/ticarnet/current/server/.env
if [ ! -f "$ENV_FILE" ]; then
  cp /var/www/ticarnet/current/server/.env.example "$ENV_FILE"
fi

upsert_env() {
  key="$1"
  value="$2"
  file="$3"
  if grep -q "^${key}=" "$file"; then
    sed -i "s#^${key}=.*#${key}=${value}#g" "$file"
  else
    printf "%s=%s\n" "$key" "$value" >> "$file"
  fi
}

if ! grep -q '^JWT_SECRET=' "$ENV_FILE"; then
  printf "JWT_SECRET=%s\n" "$(openssl rand -hex 48)" >> "$ENV_FILE"
fi
if ! grep -q '^HEALTHCHECK_TOKEN=' "$ENV_FILE"; then
  printf "HEALTHCHECK_TOKEN=%s\n" "$(openssl rand -hex 32)" >> "$ENV_FILE"
fi
upsert_env "NODE_ENV" "production" "$ENV_FILE"
upsert_env "API_HOST" "127.0.0.1" "$ENV_FILE"
upsert_env "API_PORT" "8787" "$ENV_FILE"
upsert_env "CLIENT_URL" "__PUBLIC_BASE_URL__" "$ENV_FILE"
upsert_env "RESET_LINK_BASE_URL" "__PUBLIC_BASE_URL__" "$ENV_FILE"
upsert_env "CORS_ALLOWED_ORIGINS" "__PUBLIC_BASE_URL__" "$ENV_FILE"
upsert_env "FIREBASE_AUTH_ENABLED" "__FIREBASE_AUTH_ENABLED__" "$ENV_FILE"
upsert_env "SUPPORT_INBOX_EMAIL" "__SUPPORT_INBOX_EMAIL__" "$ENV_FILE"
upsert_env "SMTP_CONNECTION_TIMEOUT_MS" "10000" "$ENV_FILE"
upsert_env "SMTP_GREETING_TIMEOUT_MS" "10000" "$ENV_FILE"
upsert_env "SMTP_SOCKET_TIMEOUT_MS" "15000" "$ENV_FILE"
upsert_env "CORS_ALLOW_NO_ORIGIN" "true" "$ENV_FILE"
upsert_env "MAX_ACCOUNTS_PER_SCOPE" "2" "$ENV_FILE"
upsert_env "ENFORCE_REGISTER_IP_ON_LOGIN" "false" "$ENV_FILE"
upsert_env "ENFORCE_REGISTER_SUBNET_ON_LOGIN" "false" "$ENV_FILE"

if [ -n "__SMTP_USER__" ]; then
  upsert_env "SMTP_USER" "__SMTP_USER__" "$ENV_FILE"
fi
if [ -n "__SMTP_APP_PASSWORD__" ]; then
  upsert_env "SMTP_APP_PASSWORD" "__SMTP_APP_PASSWORD__" "$ENV_FILE"
  upsert_env "SMTP_PASS" "__SMTP_APP_PASSWORD__" "$ENV_FILE"
fi
if [ -n "__MAIL_FROM__" ]; then
  upsert_env "MAIL_FROM" "__MAIL_FROM__" "$ENV_FILE"
fi
if [ -n "__FIREBASE_WEB_API_KEY__" ]; then
  upsert_env "FIREBASE_WEB_API_KEY" "__FIREBASE_WEB_API_KEY__" "$ENV_FILE"
fi

if [ "__RESET_GAME_DATA__" = "1" ]; then
  db_file="$(grep -E '^DB_FILE_PATH=' "$ENV_FILE" | tail -n 1 | cut -d= -f2- || true)"
  db_file="${db_file%\"}"
  db_file="${db_file#\"}"
  db_file="${db_file%\'}"
  db_file="${db_file#\'}"
  if [ -z "$db_file" ]; then
    db_file="/var/lib/ticarnet/db.json"
    upsert_env "DB_FILE_PATH" "$db_file" "$ENV_FILE"
  fi
  db_dir="$(dirname "$db_file")"
  rm -f "$db_file"
  rm -f "$db_dir/backups/db-rolling.json" || true
  rm -rf "$db_dir/uploads" || true
  echo "[deploy-direct] Hesap verileri sifirlandi: $db_file"
fi

cd /var/www/ticarnet/current
PUBLIC_BASE_URL="__PUBLIC_BASE_URL__" bash scripts/vps-deploy.sh --skip-pull

echo "[deploy-direct] Server commit: $(git rev-parse --short HEAD 2>/dev/null || echo no-git)"
curl -fsS http://127.0.0.1:8787/api/health
'@

$RemoteScript = $RemoteScript.Replace("__PUBLIC_BASE_URL__", (Escape-BashDoubleQuoted $PublicBaseUrl))
$RemoteScript = $RemoteScript.Replace("__SMTP_USER__", (Escape-BashDoubleQuoted $SmtpUser))
$RemoteScript = $RemoteScript.Replace("__SMTP_APP_PASSWORD__", (Escape-BashDoubleQuoted $SmtpAppPassword))
$RemoteScript = $RemoteScript.Replace("__MAIL_FROM__", (Escape-BashDoubleQuoted $MailFrom))
$RemoteScript = $RemoteScript.Replace("__SUPPORT_INBOX_EMAIL__", (Escape-BashDoubleQuoted $SupportInboxEmail))
$RemoteScript = $RemoteScript.Replace("__FIREBASE_AUTH_ENABLED__", (if ($FirebaseAuthEnabled) { "true" } else { "false" }))
$RemoteScript = $RemoteScript.Replace("__FIREBASE_WEB_API_KEY__", (Escape-BashDoubleQuoted $FirebaseWebApiKey))
$RemoteScript = $RemoteScript.Replace("__RESET_GAME_DATA__", $(if ($ResetGameData.IsPresent) { "1" } else { "0" }))

$SshArgs = @("-p", "$Port")
if (Test-Path $KeyPath) {
  $SshArgs += @("-i", $KeyPath)
}
$SshArgs += @("${User}@${VpsHost}", "bash -s")

Write-Host "[deploy-direct] Sunucuda deploy baslatiliyor..."
$RemoteScript | & ssh @SshArgs
if ($LASTEXITCODE -ne 0) {
  throw "[deploy-direct] Sunucu deploy adimi basarisiz."
}

Write-Host "[deploy-direct] Tamamlandi."
