#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

BRANCH="${DEPLOY_BRANCH:-main}"
SKIP_PULL="${DEPLOY_SKIP_PULL:-0}"
RUN_LINT="${DEPLOY_RUN_LINT:-0}"
ENV_FILE="${ENV_FILE:-${PROJECT_ROOT}/server/.env}"
PM2_APP_NAME="${PM2_APP_NAME:-ticarnet-api}"
DB_BACKUP_DIR="${DB_BACKUP_DIR:-/var/backups/ticarnet}"

usage() {
  cat <<'EOF'
Kullanim:
  bash scripts/vps-deploy.sh [--branch BRANCH] [--skip-pull] [--run-lint]

Opsiyonlar:
  --branch BRANCH   Deploy branch'i (varsayilan: main)
  --skip-pull       Git pull adimini atla
  --run-lint        Build oncesi npm run lint calistir
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

ensure_parent_dir() {
  local file_path="${1:-}"
  if [[ -z "$file_path" ]]; then
    return 0
  fi
  mkdir -p "$(dirname "$file_path")"
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

if [[ ! -f "$ENV_FILE" ]]; then
  echo "[deploy] Uyari: $ENV_FILE bulunamadi. server/.env olmadan production baslatilamaz." >&2
fi

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

backup_db_if_exists "$DB_FILE_PATH"

if [[ "$SKIP_PULL" != "1" ]]; then
  echo "[deploy] Git guncellemesi aliniyor (branch: $BRANCH)"
  git fetch --all --prune
  current_branch="$(git rev-parse --abbrev-ref HEAD)"
  if [[ "$current_branch" != "$BRANCH" ]]; then
    git checkout "$BRANCH"
  fi
  git pull --ff-only origin "$BRANCH"
fi

echo "[deploy] NPM bagimliliklari yukleniyor"
npm ci

if [[ "$RUN_LINT" == "1" ]]; then
  echo "[deploy] Lint kontrolu"
  npm run lint
fi

echo "[deploy] Web build"
npm run build

echo "[deploy] PM2 reload"
pm2 startOrReload "$PROJECT_ROOT/ecosystem.config.cjs" --update-env
pm2 save

echo "[deploy] PM2 durum"
pm2 status "$PM2_APP_NAME" || pm2 status

echo "[deploy] Tamamlandi."
