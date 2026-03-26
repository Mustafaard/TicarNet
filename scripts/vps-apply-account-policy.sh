#!/usr/bin/env bash
set -Eeuo pipefail

ENV_FILE="${ENV_FILE:-/var/www/ticarnet/current/server/.env}"
PM2_USER="${PM2_USER:-deploy}"
PM2_APP_NAME="${PM2_APP_NAME:-ticarnet-api}"
MAX_ACCOUNTS_PER_SCOPE="${MAX_ACCOUNTS_PER_SCOPE:-2}"
ENFORCE_REGISTER_IP_ON_LOGIN="${ENFORCE_REGISTER_IP_ON_LOGIN:-false}"
ENFORCE_REGISTER_SUBNET_ON_LOGIN="${ENFORCE_REGISTER_SUBNET_ON_LOGIN:-false}"

usage() {
  cat <<'EOF'
Kullanim:
  sudo bash scripts/vps-apply-account-policy.sh

Opsiyonlar:
  --env-file PATH                           (varsayilan: /var/www/ticarnet/current/server/.env)
  --pm2-user USER                           (varsayilan: deploy)
  --pm2-app NAME                            (varsayilan: ticarnet-api)
  --max-accounts-per-scope N                (varsayilan: 2)
  --enforce-register-ip-on-login true|false (varsayilan: false)
  --enforce-register-subnet-on-login true|false (varsayilan: false)
  -h, --help

Ornek:
  sudo bash scripts/vps-apply-account-policy.sh \
    --max-accounts-per-scope 2 \
    --enforce-register-ip-on-login false \
    --enforce-register-subnet-on-login false
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env-file)
      ENV_FILE="${2:-}"
      shift 2
      ;;
    --pm2-user)
      PM2_USER="${2:-}"
      shift 2
      ;;
    --pm2-app)
      PM2_APP_NAME="${2:-}"
      shift 2
      ;;
    --max-accounts-per-scope)
      MAX_ACCOUNTS_PER_SCOPE="${2:-2}"
      shift 2
      ;;
    --enforce-register-ip-on-login)
      ENFORCE_REGISTER_IP_ON_LOGIN="${2:-false}"
      shift 2
      ;;
    --enforce-register-subnet-on-login)
      ENFORCE_REGISTER_SUBNET_ON_LOGIN="${2:-false}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "[account-policy] Bilinmeyen arguman: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if ! [[ "$MAX_ACCOUNTS_PER_SCOPE" =~ ^[0-9]+$ ]]; then
  echo "[account-policy] Gecersiz --max-accounts-per-scope: $MAX_ACCOUNTS_PER_SCOPE" >&2
  exit 1
fi

if [[ "$ENFORCE_REGISTER_IP_ON_LOGIN" != "true" && "$ENFORCE_REGISTER_IP_ON_LOGIN" != "false" ]]; then
  echo "[account-policy] --enforce-register-ip-on-login true|false olmali." >&2
  exit 1
fi

if [[ "$ENFORCE_REGISTER_SUBNET_ON_LOGIN" != "true" && "$ENFORCE_REGISTER_SUBNET_ON_LOGIN" != "false" ]]; then
  echo "[account-policy] --enforce-register-subnet-on-login true|false olmali." >&2
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "[account-policy] Env dosyasi bulunamadi: $ENV_FILE" >&2
  exit 1
fi

escape_sed_replacement() {
  printf '%s' "$1" | sed -e 's/[\/&#]/\\&/g'
}

upsert_env() {
  local key="$1"
  local value="$2"
  local escaped
  escaped="$(escape_sed_replacement "$value")"
  if grep -qE "^${key}=" "$ENV_FILE"; then
    sed -i "s#^${key}=.*#${key}=${escaped}#g" "$ENV_FILE"
  else
    printf '%s=%s\n' "$key" "$value" >> "$ENV_FILE"
  fi
}

upsert_env "MAX_ACCOUNTS_PER_SCOPE" "$MAX_ACCOUNTS_PER_SCOPE"
upsert_env "ENFORCE_REGISTER_IP_ON_LOGIN" "$ENFORCE_REGISTER_IP_ON_LOGIN"
upsert_env "ENFORCE_REGISTER_SUBNET_ON_LOGIN" "$ENFORCE_REGISTER_SUBNET_ON_LOGIN"

echo "[account-policy] Ayarlar guncellendi:"
echo "  - MAX_ACCOUNTS_PER_SCOPE=$MAX_ACCOUNTS_PER_SCOPE"
echo "  - ENFORCE_REGISTER_IP_ON_LOGIN=$ENFORCE_REGISTER_IP_ON_LOGIN"
echo "  - ENFORCE_REGISTER_SUBNET_ON_LOGIN=$ENFORCE_REGISTER_SUBNET_ON_LOGIN"

if command -v pm2 >/dev/null 2>&1; then
  if id -u "$PM2_USER" >/dev/null 2>&1; then
    sudo -u "$PM2_USER" -H pm2 restart "$PM2_APP_NAME" --update-env
    echo "[account-policy] PM2 restart tamamlandi: $PM2_APP_NAME"
  else
    echo "[account-policy] PM2 restart atlandi: kullanici bulunamadi ($PM2_USER)"
  fi
else
  echo "[account-policy] PM2 restart atlandi: pm2 kurulu degil."
fi

echo "[account-policy] Tamam."
