#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${PROJECT_ROOT:-$(cd "${SCRIPT_DIR}/.." && pwd)}"
ENV_FILE="${ENV_FILE:-${PROJECT_ROOT}/server/.env}"
BACKUP_DIR="${DB_BACKUP_DIR:-/var/backups/ticarnet}"
RETENTION_DAYS="${DB_BACKUP_RETENTION_DAYS:-0}"
LOCK_FILE="${DB_BACKUP_LOCK_FILE:-/tmp/ticarnet-db-backup.lock}"
TIMESTAMP="$(date -u +%Y%m%d_%H%M%S)"

usage() {
  cat <<'EOF'
Kullanim:
  bash scripts/db-backup.sh

Ortam degiskenleri:
  PROJECT_ROOT               Varsayilan: scriptin proje koku
  ENV_FILE                   Varsayilan: <PROJECT_ROOT>/server/.env
  DB_BACKUP_DIR              Varsayilan: /var/backups/ticarnet
  DB_BACKUP_RETENTION_DAYS   Varsayilan: 0 (silme yok)
  DB_BACKUP_LOCK_FILE        Varsayilan: /tmp/ticarnet-db-backup.lock
EOF
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "[db-backup] Komut bulunamadi: $1" >&2
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

resolve_path() {
  local raw_path="${1:-}"
  if [[ -z "$raw_path" ]]; then
    return 1
  fi
  if [[ "$raw_path" = /* ]]; then
    printf '%s' "$raw_path"
    return 0
  fi
  printf '%s' "${PROJECT_ROOT}/${raw_path}"
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

require_cmd cp
require_cmd date
require_cmd find
require_cmd flock
require_cmd grep
require_cmd mkdir
require_cmd sha256sum

if [[ ! -f "$ENV_FILE" ]]; then
  echo "[db-backup] ENV dosyasi bulunamadi: $ENV_FILE" >&2
  exit 1
fi

db_file_raw="$(read_env_value DB_FILE_PATH || true)"
if [[ -z "$db_file_raw" ]]; then
  db_file_raw="${PROJECT_ROOT}/server/data/db.json"
fi

DB_FILE_PATH="$(resolve_path "$db_file_raw")"
if [[ ! -f "$DB_FILE_PATH" ]]; then
  echo "[db-backup] DB dosyasi bulunamadi: $DB_FILE_PATH" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
chmod 750 "$BACKUP_DIR" || true

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "[db-backup] Baska bir backup islemi calisiyor. Atlandi."
  exit 0
fi

BACKUP_PATH="${BACKUP_DIR}/db-${TIMESTAMP}.json"
CHECKSUM_PATH="${BACKUP_PATH}.sha256"

cp "$DB_FILE_PATH" "$BACKUP_PATH"
sha256sum "$BACKUP_PATH" > "$CHECKSUM_PATH"
chmod 640 "$BACKUP_PATH" "$CHECKSUM_PATH" || true

if command -v jq >/dev/null 2>&1; then
  if ! jq empty "$BACKUP_PATH" >/dev/null 2>&1; then
    echo "[db-backup] Uyari: Yedek JSON parse edilemedi: $BACKUP_PATH" >&2
  fi
fi

if [[ "$RETENTION_DAYS" =~ ^[0-9]+$ && "$RETENTION_DAYS" -gt 0 ]]; then
  find "$BACKUP_DIR" -maxdepth 1 -type f -name 'db-*.json' -mtime +"$RETENTION_DAYS" -delete
  find "$BACKUP_DIR" -maxdepth 1 -type f -name 'db-*.json.sha256' -mtime +"$RETENTION_DAYS" -delete
fi

echo "[db-backup] Tamamlandi: $BACKUP_PATH"
