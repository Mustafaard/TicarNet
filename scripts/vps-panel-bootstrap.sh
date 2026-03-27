#!/usr/bin/env bash
set -Eeuo pipefail

DEFAULT_DOMAIN="tr-159ae5.hosting.net.tr"
DEFAULT_EMAIL="mustafaard76@gmail.com"
DEFAULT_REPO="https://github.com/Mustafaard/TicarNet.git"
DEFAULT_BRANCH="main"
DEFAULT_SMTP_USER="mustafaard76@gmail.com"
DEFAULT_SUPPORT_INBOX="mustafaard76@gmail.com"
DEFAULT_MAIL_FROM="TicarNet Online <mustafaard76@gmail.com>"

APP_BASE_DIR="/var/www/ticarnet"
APP_DIR="${APP_BASE_DIR}/current"

ask() {
  local prompt="$1"
  local default_value="$2"
  local result=""
  read -r -p "${prompt} [${default_value}]: " result || true
  if [[ -z "${result}" ]]; then
    result="${default_value}"
  fi
  printf '%s' "${result}"
}

require_root() {
  if [[ "${EUID}" -ne 0 ]]; then
    echo "[panel-bootstrap] Root ile calistirman gerekiyor." >&2
    exit 1
  fi
}

require_root

echo "[panel-bootstrap] TicarNet Online panel kurulum basliyor."
echo "[panel-bootstrap] Bu script Ubuntu 20.04 VPS panel terminali icin tasarlandi."

DOMAIN="$(ask "Domain" "${DEFAULT_DOMAIN}")"
LE_EMAIL="$(ask "Let's Encrypt e-posta" "${DEFAULT_EMAIL}")"
REPO_URL="$(ask "Repo URL" "${DEFAULT_REPO}")"
BRANCH="$(ask "Branch" "${DEFAULT_BRANCH}")"
SMTP_USER="$(ask "SMTP user" "${DEFAULT_SMTP_USER}")"
SUPPORT_INBOX="$(ask "Support inbox e-mail" "${DEFAULT_SUPPORT_INBOX}")"
MAIL_FROM="$(ask "MAIL_FROM" "${DEFAULT_MAIL_FROM}")"

if [[ -z "${SMTP_APP_PASSWORD:-}" ]]; then
  echo
  echo "SMTP App Password gir (yazarken ekranda gorunmez):"
  read -r -s SMTP_APP_PASSWORD
  echo
fi

if [[ -z "${SMTP_APP_PASSWORD:-}" ]]; then
  echo "[panel-bootstrap] SMTP app password bos olamaz." >&2
  echo "[panel-bootstrap] Alternatif: SMTP_APP_PASSWORD='xxxxx' bash scripts/vps-panel-bootstrap.sh" >&2
  exit 1
fi

apt-get update -y
apt-get install -y git curl ca-certificates

mkdir -p "${APP_BASE_DIR}"

if [[ -d "${APP_DIR}/.git" ]]; then
  git -C "${APP_DIR}" fetch --all --prune
  git -C "${APP_DIR}" checkout "${BRANCH}"
  git -C "${APP_DIR}" pull --ff-only origin "${BRANCH}"
else
  rm -rf "${APP_DIR}"
  git clone --branch "${BRANCH}" "${REPO_URL}" "${APP_DIR}"
fi

cd "${APP_DIR}"

bash scripts/vps-prod-setup.sh \
  --domain "${DOMAIN}" \
  --email "${LE_EMAIL}" \
  --repo-url "${REPO_URL}" \
  --branch "${BRANCH}" \
  --public-base-url "https://${DOMAIN}" \
  --smtp-user "${SMTP_USER}" \
  --smtp-app-password "${SMTP_APP_PASSWORD}" \
  --mail-from "${MAIL_FROM}" \
  --support-inbox-email "${SUPPORT_INBOX}"

echo "[panel-bootstrap] Tamamlandi."
echo "[panel-bootstrap] Kontrol: curl -fsS http://127.0.0.1:8787/api/health"
echo "[panel-bootstrap] APK: https://${DOMAIN}/download/ticarnet.apk"
