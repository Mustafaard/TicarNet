#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

BRANCH="${DEPLOY_BRANCH:-main}"
SKIP_PULL="${DEPLOY_SKIP_PULL:-0}"
RUN_LINT="${DEPLOY_RUN_LINT:-0}"
FORCE_CLEAN="${DEPLOY_FORCE_CLEAN:-0}"
ENV_FILE="${ENV_FILE:-${PROJECT_ROOT}/server/.env}"
PM2_APP_NAME="${PM2_APP_NAME:-ticarnet-api}"
DB_BACKUP_DIR="${DB_BACKUP_DIR:-/var/backups/ticarnet}"
DEFAULT_DATA_ROOT_CANDIDATE="${DEFAULT_DATA_ROOT_CANDIDATE:-/var/lib/ticarnet}"
PUBLIC_BASE_URL="${PUBLIC_BASE_URL:-https://tr-159ae5.hosting.net.tr}"

usage() {
  cat <<'EOF'
Kullanim:
  bash scripts/vps-deploy.sh [--branch BRANCH] [--skip-pull] [--run-lint] [--force-clean]

Opsiyonlar:
  --branch BRANCH   Deploy branch'i (varsayilan: main)
  --skip-pull       Git pull adimini atla
  --run-lint        Build oncesi npm run lint calistir
  --force-clean     Sunucudaki lokal kod degisikliklerini silip origin/BRANCH'e birebir resetle
  -h, --help        Yardim metnini goster

Ornek:
  DEPLOY_BRANCH=main bash scripts/vps-deploy.sh --run-lint
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --branch)
      BRANCH="${2:-}"
      shift 2
      ;;
    --skip-pull)
      SKIP_PULL=1
      shift
      ;;
    --run-lint)
      RUN_LINT=1
      shift
      ;;
    --force-clean)
      FORCE_CLEAN=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "[deploy] Bilinmeyen arguman: $1" >&2
      usage
      exit 1
      ;;
  esac
done

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "[deploy] Komut bulunamadi: $1" >&2
    exit 1
  fi
}

escape_sed_replacement() {
  printf '%s' "$1" | sed -e 's/[\/&#]/\\&/g'
}

trim_quotes() {
  local value="${1:-}"
  value="${value%\"}"
  value="${value#\"}"
  value="${value%\'}"
  value="${value#\'}"
  printf '%s' "$value"
}

read_env_value() {
  local key="${1:-}"
  if [[ -z "$key" || ! -f "$ENV_FILE" ]]; then
    return 1
  fi

  local line
  line="$(grep -E "^${key}=" "$ENV_FILE" | tail -n 1 || true)"
  if [[ -z "$line" ]]; then
    return 1
  fi

  local value="${line#*=}"
  value="$(trim_quotes "$value")"
  printf '%s' "$value"
}

upsert_env() {
  local key="$1"
  local value="$2"
  local file="${3:-$ENV_FILE}"
  local escaped
  escaped="$(escape_sed_replacement "$value")"

  if grep -qE "^${key}=" "$file"; then
    sed -i "s#^${key}=.*#${key}=${escaped}#g" "$file"
  else
    printf '%s=%s\n' "$key" "$value" >> "$file"
  fi
}

is_placeholder_value() {
  local value
  value="$(printf '%s' "${1:-}" | tr '[:upper:]' '[:lower:]')"
  [[ -z "$value" ]] && return 0
  [[ "$value" == "change_me" ]] && return 0
  [[ "$value" == "changeme" ]] && return 0
  [[ "$value" == "replace_me" ]] && return 0
  [[ "$value" == *"change_me"* ]] && return 0
  [[ "$value" == *"buraya_"* ]] && return 0
  [[ "$value" == *"uzun_"* ]] && return 0
  [[ "$value" == *"your_"* ]] && return 0
  [[ "$value" == *"example"* ]] && return 0
  return 1
}

set_secret_if_missing() {
  local key="$1"
  local min_length="${2:-1}"
  local current
  current="$(read_env_value "$key" || true)"
  if is_placeholder_value "$current" || [[ ${#current} -lt "$min_length" ]]; then
    upsert_env "$key" "$(openssl rand -hex 48)"
  fi
}

set_env_if_missing() {
  local key="$1"
  local value="$2"
  local current
  current="$(read_env_value "$key" || true)"
  if is_placeholder_value "$current"; then
    upsert_env "$key" "$value"
  fi
}

ensure_env_file() {
  if [[ -f "$ENV_FILE" ]]; then
    return 0
  fi

  mkdir -p "$(dirname "$ENV_FILE")"
  if [[ -f "$PROJECT_ROOT/server/.env.example" ]]; then
    cp "$PROJECT_ROOT/server/.env.example" "$ENV_FILE"
    echo "[deploy] $ENV_FILE yoktu, .env.example'dan olusturuldu."
  else
    : > "$ENV_FILE"
    echo "[deploy] $ENV_FILE bos olarak olusturuldu."
  fi
}

choose_data_root() {
  local candidate=""

  for candidate in "$DEFAULT_DATA_ROOT_CANDIDATE" "$PROJECT_ROOT/server/data"; do
    if mkdir -p "$candidate" >/dev/null 2>&1; then
      printf '%s' "$candidate"
      return 0
    fi
  done

  printf '%s' "$PROJECT_ROOT/server/data"
}

ensure_env_defaults() {
  local data_root="$1"

  set_env_if_missing "NODE_ENV" "production"
  set_env_if_missing "API_HOST" "127.0.0.1"
  set_env_if_missing "API_PORT" "8787"
  set_env_if_missing "CLIENT_URL" "$PUBLIC_BASE_URL"
  set_env_if_missing "RESET_LINK_BASE_URL" "$PUBLIC_BASE_URL"
  set_env_if_missing "CORS_ALLOWED_ORIGINS" "$PUBLIC_BASE_URL"
  set_env_if_missing "CORS_ALLOW_NO_ORIGIN" "true"
  set_env_if_missing "MAX_ACCOUNTS_PER_SCOPE" "2"
  set_env_if_missing "ENFORCE_REGISTER_IP_ON_LOGIN" "false"
  set_env_if_missing "ENFORCE_REGISTER_SUBNET_ON_LOGIN" "false"
  set_env_if_missing "SUPPORT_INBOX_EMAIL" "mustafaard76@gmail.com"
  set_env_if_missing "SMTP_CONNECTION_TIMEOUT_MS" "10000"
  set_env_if_missing "SMTP_GREETING_TIMEOUT_MS" "10000"
  set_env_if_missing "SMTP_SOCKET_TIMEOUT_MS" "15000"
  set_env_if_missing "DB_FILE_PATH" "${data_root}/db.json"
  set_env_if_missing "UPLOAD_ROOT_DIR" "${data_root}/uploads"
  set_env_if_missing "AVATAR_UPLOAD_DIR" "${data_root}/uploads/avatars"
  set_env_if_missing "DB_ROLLING_BACKUP_FILE_PATH" "${data_root}/backups/db-rolling.json"
  set_env_if_missing "DB_BACKUP_RETENTION_DAYS" "0"

  set_secret_if_missing "JWT_SECRET" "32"
  set_secret_if_missing "HEALTHCHECK_TOKEN" "16"
}

ensure_parent_dir() {
  local file_path="${1:-}"
  if [[ -z "$file_path" ]]; then
    return 0
  fi
  mkdir -p "$(dirname "$file_path")"
}

ensure_apk_public_artifacts() {
  local public_download_dir="$PROJECT_ROOT/public/download"
  local dist_download_dir="$PROJECT_ROOT/dist/download"
  local apk_path="$public_download_dir/ticarnet.apk"

  if [[ ! -f "$apk_path" ]]; then
    echo "[deploy] Uyari: $apk_path bulunamadi. /download/ticarnet.apk 404 donebilir." >&2
    return 0
  fi

  mkdir -p "$dist_download_dir"
  cp -f "$apk_path" "$dist_download_dir/ticarnet.apk"

  for extra in "ticarnet.apk.sha256" "latest.json" "index.html"; do
    if [[ -f "$public_download_dir/$extra" ]]; then
      cp -f "$public_download_dir/$extra" "$dist_download_dir/$extra"
    fi
  done

  if [[ -f "$public_download_dir/releases.json" ]]; then
    cp -f "$public_download_dir/releases.json" "$dist_download_dir/releases.json"
  else
    rm -f "$dist_download_dir/releases.json"
  fi

  if [[ -d "$public_download_dir/versions" ]]; then
    mkdir -p "$dist_download_dir/versions"
    cp -f "$public_download_dir/versions/"*.apk "$dist_download_dir/versions/" 2>/dev/null || true
    cp -f "$public_download_dir/versions/"*.sha256 "$dist_download_dir/versions/" 2>/dev/null || true
  else
    rm -rf "$dist_download_dir/versions"
  fi

  echo "[deploy] APK public dosyalari senkronlandi: $dist_download_dir"
}

ensure_nginx_html_no_cache() {
  local conf=""
  for candidate in \
    "/etc/nginx/sites-available/ticarnet.conf" \
    "/etc/nginx/sites-enabled/ticarnet.conf"; do
    if [[ -f "$candidate" ]]; then
      conf="$candidate"
      break
    fi
  done

  if [[ -z "$conf" ]]; then
    echo "[deploy] Nginx config bulunamadi, html no-cache adimi atlandi."
    return 0
  fi

  if grep -q "location = /index.html" "$conf"; then
    echo "[deploy] Nginx html no-cache kurali zaten mevcut."
  else
    local backup_path="${conf}.bak.$(date +%Y%m%d_%H%M%S)"
    cp "$conf" "$backup_path"
    echo "[deploy] Nginx config yedeklendi: $backup_path"

    perl -0777 -i -pe '
      unless (/location = \/index\.html/s) {
        s@\n  location / \{\n@
  location = /index.html {\n
    add_header Cache-Control "no-store, no-cache, must-revalidate" always;\n
    add_header Pragma "no-cache" always;\n
    add_header Expires "0" always;\n
    try_files \$uri =404;\n
  }\n
\n
  location ~* \\.html\$ {\n
    add_header Cache-Control "no-store, no-cache, must-revalidate" always;\n
    add_header Pragma "no-cache" always;\n
    add_header Expires "0" always;\n
    try_files \$uri =404;\n
  }\n
\n
  location / {\n
    add_header Cache-Control "no-store, no-cache, must-revalidate" always;\n
    add_header Pragma "no-cache" always;\n
    add_header Expires "0" always;\n
@s;
      }
    ' "$conf"
  fi

  if command -v nginx >/dev/null 2>&1; then
    if nginx -t; then
      if command -v systemctl >/dev/null 2>&1; then
        systemctl reload nginx || echo "[deploy] Uyari: nginx reload basarisiz."
      fi
    else
      echo "[deploy] Uyari: Nginx test basarisiz. Config geri kontrol et."
    fi
  fi
}

backup_db_if_exists() {
  local db_file="${1:-}"
  if [[ -z "$db_file" || ! -f "$db_file" ]]; then
    return 0
  fi

  mkdir -p "$DB_BACKUP_DIR"
  local ts
  ts="$(date +%Y%m%d_%H%M%S)"
  local backup_path="${DB_BACKUP_DIR}/db-${ts}.json"
  cp "$db_file" "$backup_path"
  echo "[deploy] DB yedegi alindi: $backup_path"
}

echo "[deploy] Proje dizini: $PROJECT_ROOT"
cd "$PROJECT_ROOT"

require_cmd node
require_cmd npm
require_cmd pm2

if [[ "$SKIP_PULL" != "1" ]]; then
  require_cmd git
fi

if [[ "$SKIP_PULL" != "1" && "$(id -u)" -eq 0 ]]; then
  # Root ile deploy senaryosunda Git "dubious ownership" hatasini engelle.
  git config --global --add safe.directory "$PROJECT_ROOT" >/dev/null 2>&1 || true
fi

require_cmd openssl
ensure_env_file

DATA_ROOT="$(choose_data_root)"
ensure_env_defaults "$DATA_ROOT"

DB_FILE_PATH="$(read_env_value DB_FILE_PATH || true)"
UPLOAD_ROOT_DIR="$(read_env_value UPLOAD_ROOT_DIR || true)"
AVATAR_UPLOAD_DIR="$(read_env_value AVATAR_UPLOAD_DIR || true)"

if [[ -n "$DB_FILE_PATH" ]]; then
  ensure_parent_dir "$DB_FILE_PATH"
else
  echo "[deploy] Uyari: DB_FILE_PATH bos. Hesap verisi icin proje disi kalici yol kullanman onerilir." >&2
fi

if [[ -n "$UPLOAD_ROOT_DIR" ]]; then
  mkdir -p "$UPLOAD_ROOT_DIR"
fi
if [[ -n "$AVATAR_UPLOAD_DIR" ]]; then
  mkdir -p "$AVATAR_UPLOAD_DIR"
fi

mkdir -p "$DB_BACKUP_DIR"

backup_db_if_exists "$DB_FILE_PATH"

if [[ "$SKIP_PULL" != "1" ]]; then
  echo "[deploy] Git guncellemesi aliniyor (branch: $BRANCH)"
  git fetch --all --prune
  if [[ "$FORCE_CLEAN" == "1" ]]; then
    echo "[deploy] Force clean aktif: sunucu kodu origin/$BRANCH ile birebir esleniyor"
    git checkout -B "$BRANCH" "origin/$BRANCH"
    git reset --hard "origin/$BRANCH"
    git clean -fd
  else
    current_branch="$(git rev-parse --abbrev-ref HEAD)"
    if [[ "$current_branch" != "$BRANCH" ]]; then
      git checkout "$BRANCH"
    fi
    git pull --ff-only origin "$BRANCH"
  fi
fi

echo "[deploy] NPM bagimliliklari yukleniyor"
npm ci

if [[ "$RUN_LINT" == "1" ]]; then
  echo "[deploy] Lint kontrolu"
  npm run lint
fi

echo "[deploy] Production env self-check"
npm run check:production-env

echo "[deploy] Web build"
npm run build
ensure_apk_public_artifacts
ensure_nginx_html_no_cache

echo "[deploy] PM2 reload"
pm2 startOrReload "$PROJECT_ROOT/ecosystem.config.cjs" --update-env
pm2 save

echo "[deploy] PM2 durum"
pm2 status "$PM2_APP_NAME" || pm2 status

echo "[deploy] Tamamlandi."
