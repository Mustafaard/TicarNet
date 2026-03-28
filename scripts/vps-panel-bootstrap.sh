#!/usr/bin/env bash
set -Eeuo pipefail

DEFAULT_DOMAIN="${DEFAULT_DOMAIN:-ticarnet.tr}"
DEFAULT_EMAIL="${DEFAULT_EMAIL:-mustafaard76@gmail.com}"
DEFAULT_REPO="${DEFAULT_REPO:-https://github.com/Mustafaard/TicarNet.git}"
DEFAULT_BRANCH="${DEFAULT_BRANCH:-main}"
DEFAULT_SMTP_USER="${DEFAULT_SMTP_USER:-mustafaard76@gmail.com}"
DEFAULT_SUPPORT_INBOX="${DEFAULT_SUPPORT_INBOX:-mustafaard76@gmail.com}"
DEFAULT_MAIL_FROM="${DEFAULT_MAIL_FROM:-TicarNet Online <mustafaard76@gmail.com>}"
DEFAULT_FIREBASE_AUTH_ENABLED="${DEFAULT_FIREBASE_AUTH_ENABLED:-true}"

APP_BASE_DIR="/var/www/ticarnet"
APP_DIR="${APP_BASE_DIR}/current"
NON_INTERACTIVE="${NON_INTERACTIVE:-0}"
ENABLE_SSL="${ENABLE_SSL:-1}"

DOMAIN_ARG="${DOMAIN_ARG:-${DOMAIN:-}}"
LE_EMAIL_ARG="${LE_EMAIL_ARG:-${LETSENCRYPT_EMAIL:-}}"
REPO_URL_ARG="${REPO_URL_ARG:-${REPO_URL:-}}"
BRANCH_ARG="${BRANCH_ARG:-${BRANCH:-}}"
SMTP_USER_ARG="${SMTP_USER_ARG:-${SMTP_USER:-}}"
SUPPORT_INBOX_ARG="${SUPPORT_INBOX_ARG:-${SUPPORT_INBOX_EMAIL:-}}"
MAIL_FROM_ARG="${MAIL_FROM_ARG:-${MAIL_FROM:-}}"
SMTP_APP_PASSWORD_ARG="${SMTP_APP_PASSWORD_ARG:-${SMTP_APP_PASSWORD:-}}"
FIREBASE_AUTH_ENABLED_ARG="${FIREBASE_AUTH_ENABLED_ARG:-${FIREBASE_AUTH_ENABLED:-}}"
FIREBASE_WEB_API_KEY_ARG="${FIREBASE_WEB_API_KEY_ARG:-${FIREBASE_WEB_API_KEY:-}}"
PUBLIC_BASE_URL_ARG="${PUBLIC_BASE_URL_ARG:-${PUBLIC_BASE_URL:-}}"

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
  --firebase-auth-enabled true|false
  --firebase-web-api-key KEY
  --public-base-url URL
  --skip-ssl
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
    --firebase-auth-enabled)
      FIREBASE_AUTH_ENABLED_ARG="${2:-}"
      shift 2
      ;;
    --firebase-web-api-key)
      FIREBASE_WEB_API_KEY_ARG="${2:-}"
      shift 2
      ;;
    --public-base-url)
      PUBLIC_BASE_URL_ARG="${2:-}"
      shift 2
      ;;
    --skip-ssl)
      ENABLE_SSL="0"
      shift
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
echo "[panel-bootstrap] Paneldeki RDP/administrator bilgileri Ubuntu icin SSH/root sifresi yerine gecmez."

DOMAIN="$(resolve_value "$DOMAIN_ARG" "Domain" "${DEFAULT_DOMAIN}")"
LE_EMAIL="$(resolve_value "$LE_EMAIL_ARG" "Let's Encrypt e-posta" "${DEFAULT_EMAIL}")"
REPO_URL="$(resolve_value "$REPO_URL_ARG" "Repo URL" "${DEFAULT_REPO}")"
BRANCH="$(resolve_value "$BRANCH_ARG" "Branch" "${DEFAULT_BRANCH}")"
SMTP_USER="$(resolve_value "$SMTP_USER_ARG" "SMTP user" "${DEFAULT_SMTP_USER}")"
SUPPORT_INBOX="$(resolve_value "$SUPPORT_INBOX_ARG" "Support inbox e-mail" "${DEFAULT_SUPPORT_INBOX}")"
MAIL_FROM="$(resolve_value "$MAIL_FROM_ARG" "MAIL_FROM" "${DEFAULT_MAIL_FROM}")"
FIREBASE_AUTH_ENABLED="$(resolve_value "$FIREBASE_AUTH_ENABLED_ARG" "Firebase Auth enabled (true/false)" "${DEFAULT_FIREBASE_AUTH_ENABLED}")"

if [[ "$FIREBASE_AUTH_ENABLED" != "true" && "$FIREBASE_AUTH_ENABLED" != "false" ]]; then
  echo "[panel-bootstrap] --firebase-auth-enabled true veya false olmali." >&2
  exit 1
fi

if [[ -z "${SMTP_APP_PASSWORD:-}" && -n "${SMTP_APP_PASSWORD_ARG:-}" ]]; then
  SMTP_APP_PASSWORD="${SMTP_APP_PASSWORD_ARG}"
fi
if [[ -z "${FIREBASE_WEB_API_KEY:-}" && -n "${FIREBASE_WEB_API_KEY_ARG:-}" ]]; then
  FIREBASE_WEB_API_KEY="${FIREBASE_WEB_API_KEY_ARG}"
fi

if [[ "$FIREBASE_AUTH_ENABLED" == "true" && -z "${FIREBASE_WEB_API_KEY:-}" && "$NON_INTERACTIVE" == "0" ]]; then
  echo
  read -r -p "Firebase Web API Key: " FIREBASE_WEB_API_KEY
fi

if [[ -z "${SMTP_APP_PASSWORD:-}" && "$NON_INTERACTIVE" == "0" ]]; then
  echo
  echo "SMTP App Password (opsiyonel, sadece destek e-postasi icin). Bos gecmek icin Enter:"
  read -r -s SMTP_APP_PASSWORD
  echo
fi

if [[ "$FIREBASE_AUTH_ENABLED" == "true" && -z "${FIREBASE_WEB_API_KEY:-}" ]]; then
  echo "[panel-bootstrap] Firebase Auth acik ama FIREBASE_WEB_API_KEY bos." >&2
  echo "[panel-bootstrap] Alternatif: --firebase-web-api-key 'AIza...'" >&2
  exit 1
fi

PUBLIC_BASE_URL="${PUBLIC_BASE_URL_ARG:-}"
if [[ -z "$PUBLIC_BASE_URL" ]]; then
  if [[ "$ENABLE_SSL" == "1" ]]; then
    PUBLIC_BASE_URL="https://${DOMAIN}"
  else
    PUBLIC_BASE_URL="http://${DOMAIN}"
  fi
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

SETUP_ARGS=(
  --domain "${DOMAIN}"
  --repo-url "${REPO_URL}"
  --branch "${BRANCH}"
  --public-base-url "${PUBLIC_BASE_URL}"
  --firebase-auth-enabled "${FIREBASE_AUTH_ENABLED}"
  --firebase-web-api-key "${FIREBASE_WEB_API_KEY:-}"
  --smtp-user "${SMTP_USER}"
  --smtp-app-password "${SMTP_APP_PASSWORD:-}"
  --mail-from "${MAIL_FROM}"
  --support-inbox-email "${SUPPORT_INBOX}"
)

if [[ "$ENABLE_SSL" == "1" ]]; then
  SETUP_ARGS+=(--email "${LE_EMAIL}")
else
  SETUP_ARGS+=(--skip-ssl)
fi

bash scripts/vps-prod-setup.sh \
  "${SETUP_ARGS[@]}"

echo "[panel-bootstrap] Tamamlandi."
echo "[panel-bootstrap] Kontrol: curl -fsS http://127.0.0.1:8787/api/health"
echo "[panel-bootstrap] APK: https://${DOMAIN}/download/ticarnet.apk"
echo "[panel-bootstrap] Sonraki guncelleme: cd ${APP_DIR} && bash scripts/vps-update.sh"
