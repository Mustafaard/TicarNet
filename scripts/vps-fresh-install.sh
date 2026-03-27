#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

DOMAIN="${DOMAIN:-178.210.161.210}"
EMAIL="${EMAIL:-}"
ENABLE_SSL="${ENABLE_SSL:-0}"
REPO_URL="${REPO_URL:-https://github.com/Mustafaard/TicarNet.git}"
BRANCH="${BRANCH:-main}"
API_PORT="${API_PORT:-8787}"
APP_USER="${APP_USER:-deploy}"
APP_BASE_DIR="${APP_BASE_DIR:-/var/www/ticarnet}"
DATA_DIR="${DATA_DIR:-/var/lib/ticarnet}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/ticarnet}"
MAX_ACCOUNTS_PER_SCOPE="${MAX_ACCOUNTS_PER_SCOPE:-2}"

usage() {
  cat <<'EOF'
Kullanim:
  sudo bash scripts/vps-fresh-install.sh [opsiyonlar]

Opsiyonlar:
  --domain DOMAIN             Domain veya sunucu IP (varsayilan: 178.210.161.210)
  --repo-url URL              Git repo (varsayilan: https://github.com/Mustafaard/TicarNet.git)
  --branch BRANCH             Branch (varsayilan: main)
  --api-port PORT             API portu (varsayilan: 8787)
  --app-user USER             Linux kullanicisi (varsayilan: deploy)
  --app-base-dir DIR          Kod dizini (varsayilan: /var/www/ticarnet)
  --data-dir DIR              Kalici veri (varsayilan: /var/lib/ticarnet)
  --backup-dir DIR            Yedek dizini (varsayilan: /var/backups/ticarnet)
  --max-accounts-per-scope N  Ayni public IP hesap limiti (varsayilan: 2)
  --enable-ssl                Certbot SSL ac
  --email EMAIL               SSL icin e-posta (enable-ssl ile zorunlu)
  -h, --help                  Yardim

Ornek (SSL kapali - IP ile):
  sudo bash scripts/vps-fresh-install.sh --domain 178.210.161.210

Ornek (domain + SSL):
  sudo bash scripts/vps-fresh-install.sh --domain ticarnet.online --enable-ssl --email admin@ticarnet.online
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain)
      DOMAIN="${2:-}"
      shift 2
      ;;
    --repo-url)
      REPO_URL="${2:-}"
      shift 2
      ;;
    --branch)
      BRANCH="${2:-}"
      shift 2
      ;;
    --api-port)
      API_PORT="${2:-8787}"
      shift 2
      ;;
    --app-user)
      APP_USER="${2:-deploy}"
      shift 2
      ;;
    --app-base-dir)
      APP_BASE_DIR="${2:-/var/www/ticarnet}"
      shift 2
      ;;
    --data-dir)
      DATA_DIR="${2:-/var/lib/ticarnet}"
      shift 2
      ;;
    --backup-dir)
      BACKUP_DIR="${2:-/var/backups/ticarnet}"
      shift 2
      ;;
    --max-accounts-per-scope)
      MAX_ACCOUNTS_PER_SCOPE="${2:-2}"
      shift 2
      ;;
    --enable-ssl)
      ENABLE_SSL=1
      shift
      ;;
    --email)
      EMAIL="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "[fresh-install] Bilinmeyen arguman: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ $EUID -ne 0 ]]; then
  echo "[fresh-install] Root ile calistir (sudo)." >&2
  exit 1
fi

if [[ "$ENABLE_SSL" == "1" && -z "$EMAIL" ]]; then
  echo "[fresh-install] --enable-ssl icin --email zorunlu." >&2
  exit 1
fi

if ! [[ "$API_PORT" =~ ^[0-9]+$ ]]; then
  echo "[fresh-install] Gecersiz --api-port: $API_PORT" >&2
  exit 1
fi

if ! [[ "$MAX_ACCOUNTS_PER_SCOPE" =~ ^[0-9]+$ ]]; then
  echo "[fresh-install] Gecersiz --max-accounts-per-scope: $MAX_ACCOUNTS_PER_SCOPE" >&2
  exit 1
fi

echo "[fresh-install] Basliyor..."
echo "[fresh-install] Domain/IP: $DOMAIN"
echo "[fresh-install] Repo: $REPO_URL (branch: $BRANCH)"

SSL_FLAG="--skip-ssl"
EMAIL_FLAG=""
if [[ "$ENABLE_SSL" == "1" ]]; then
  SSL_FLAG=""
  EMAIL_FLAG="--email ${EMAIL}"
fi

# shellcheck disable=SC2086
bash "${SCRIPT_DIR}/vps-prod-setup.sh" \
  --domain "$DOMAIN" \
  --repo-url "$REPO_URL" \
  --branch "$BRANCH" \
  --api-port "$API_PORT" \
  --app-user "$APP_USER" \
  --app-group "$APP_USER" \
  --app-base-dir "$APP_BASE_DIR" \
  --data-dir "$DATA_DIR" \
  --backup-dir "$BACKUP_DIR" \
  --max-accounts-per-scope "$MAX_ACCOUNTS_PER_SCOPE" \
  --enforce-register-ip-on-login false \
  --enforce-register-subnet-on-login false \
  $SSL_FLAG \
  $EMAIL_FLAG

echo "[fresh-install] Kurulum bitti."
echo "[fresh-install] Site: http://${DOMAIN}"
echo "[fresh-install] API:  http://${DOMAIN}/api/health"
echo "[fresh-install] APK:  http://${DOMAIN}/download/ticarnet.apk"
echo "[fresh-install] Sonraki deploy: cd ${APP_BASE_DIR}/current && bash scripts/vps-deploy.sh --branch ${BRANCH} --force-clean"

