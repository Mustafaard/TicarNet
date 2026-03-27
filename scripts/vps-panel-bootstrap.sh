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
NON_INTERACTIVE="0"

DOMAIN_ARG=""
LE_EMAIL_ARG=""
REPO_URL_ARG=""
BRANCH_ARG=""
SMTP_USER_ARG=""
SUPPORT_INBOX_ARG=""
MAIL_FROM_ARG=""
SMTP_APP_PASSWORD_ARG=""

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

usage() {
  cat <<'EOF'
Kullanim:
  bash scripts/vps-panel-bootstrap.sh [opsiyonlar]

Opsiyonlar:
  --domain DOMAIN
  --email EMAIL
  --repo-url URL
  --branch BRANCH
  --smtp-user EMAIL
  --support-inbox-email EMAIL
  --mail-from VALUE
  --smtp-app-password PASS
  --non-interactive
  -h, --help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain)
      DOMAIN_ARG="${2:-}"
      shift 2
      ;;
    --email)
      LE_EMAIL_ARG="${2:-}"
      shift 2
      ;;
    --repo-url)
      REPO_URL_ARG="${2:-}"
      shift 2
      ;;
    --branch)
      BRANCH_ARG="${2:-}"
      shift 2
      ;;
    --smtp-user)
      SMTP_USER_ARG="${2:-}"
      shift 2
      ;;
    --support-inbox-email)
      SUPPORT_INBOX_ARG="${2:-}"
      shift 2
      ;;
    --mail-from)
      MAIL_FROM_ARG="${2:-}"
      shift 2
      ;;
    --smtp-app-password)
      SMTP_APP_PASSWORD_ARG="${2:-}"
      shift 2
      ;;
    --non-interactive)
      NON_INTERACTIVE="1"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "[panel-bootstrap] Bilinmeyen arguman: $1" >&2
      usage
      exit 1
      ;;
  esac
done

resolve_value() {
  local explicit_value="$1"
  local prompt="$2"
  local default_value="$3"

  if [[ -n "$explicit_value" ]]; then
    printf '%s' "$explicit_value"
    return
  fi

  if [[ "$NON_INTERACTIVE" == "1" ]]; then
    printf '%s' "$default_value"
    return
  fi

  ask "$prompt" "$default_value"
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

DOMAIN="$(resolve_value "$DOMAIN_ARG" "Domain" "${DEFAULT_DOMAIN}")"
LE_EMAIL="$(resolve_value "$LE_EMAIL_ARG" "Let's Encrypt e-posta" "${DEFAULT_EMAIL}")"
REPO_URL="$(resolve_value "$REPO_URL_ARG" "Repo URL" "${DEFAULT_REPO}")"
BRANCH="$(resolve_value "$BRANCH_ARG" "Branch" "${DEFAULT_BRANCH}")"
SMTP_USER="$(resolve_value "$SMTP_USER_ARG" "SMTP user" "${DEFAULT_SMTP_USER}")"
SUPPORT_INBOX="$(resolve_value "$SUPPORT_INBOX_ARG" "Support inbox e-mail" "${DEFAULT_SUPPORT_INBOX}")"
MAIL_FROM="$(resolve_value "$MAIL_FROM_ARG" "MAIL_FROM" "${DEFAULT_MAIL_FROM}")"

if [[ -z "${SMTP_APP_PASSWORD:-}" && -n "${SMTP_APP_PASSWORD_ARG:-}" ]]; then
  SMTP_APP_PASSWORD="${SMTP_APP_PASSWORD_ARG}"
fi

if [[ -z "${SMTP_APP_PASSWORD:-}" && "$NON_INTERACTIVE" == "0" ]]; then
  echo
  echo "SMTP App Password gir (yazarken ekranda gorunmez):"
  read -r -s SMTP_APP_PASSWORD
  echo
fi

if [[ -z "${SMTP_APP_PASSWORD:-}" ]]; then
  echo "[panel-bootstrap] SMTP app password bos olamaz." >&2
  echo "[panel-bootstrap] Alternatif: SMTP_APP_PASSWORD='xxxxx' bash scripts/vps-panel-bootstrap.sh --non-interactive" >&2
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
