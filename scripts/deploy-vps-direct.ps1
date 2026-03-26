param(
  [string]$VpsHost = "178.210.161.210",
  [string]$User = "root",
  [int]$Port = 22,
  [string]$KeyPath = "$env:USERPROFILE\.ssh\ticarnet_actions"
)

$ErrorActionPreference = "Stop"

function Require-Command {
  param([string]$Name)
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "[deploy-direct] Komut bulunamadi: $Name"
  }
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
upsert_env "NODE_ENV" "production" "$ENV_FILE"
upsert_env "API_HOST" "127.0.0.1" "$ENV_FILE"
upsert_env "API_PORT" "8787" "$ENV_FILE"
upsert_env "CORS_ALLOW_NO_ORIGIN" "true" "$ENV_FILE"
upsert_env "MAX_ACCOUNTS_PER_SCOPE" "2" "$ENV_FILE"
upsert_env "ENFORCE_REGISTER_IP_ON_LOGIN" "false" "$ENV_FILE"
upsert_env "ENFORCE_REGISTER_SUBNET_ON_LOGIN" "false" "$ENV_FILE"

cd /var/www/ticarnet/current
bash scripts/vps-deploy.sh --skip-pull

echo "[deploy-direct] Server commit: $(git rev-parse --short HEAD 2>/dev/null || echo no-git)"
curl -fsS http://127.0.0.1:8787/api/health
'@

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
