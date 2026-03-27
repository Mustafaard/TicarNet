#!/usr/bin/env bash
set -Eeuo pipefail

TARGET_URL="${TARGET_URL:-http://127.0.0.1:8787/api/health}"
CONNECTIONS="${CONNECTIONS:-30}"
DURATION_SECONDS="${DURATION_SECONDS:-20}"

usage() {
  cat <<'EOF'
Kullanim:
  bash scripts/vps-load-smoke.sh [--url URL] [--connections N] [--duration SEC]

Opsiyonlar:
  --url URL          Test edilecek endpoint (varsayilan: http://127.0.0.1:8787/api/health)
  --connections N    Eszamanli baglanti sayisi (varsayilan: 30)
  --duration SEC     Test suresi saniye (varsayilan: 20)
  -h, --help         Yardim

Ornek:
  bash scripts/vps-load-smoke.sh --url https://tr-159ae5.hosting.net.tr/api/health --connections 80 --duration 30
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --url)
      TARGET_URL="${2:-$TARGET_URL}"
      shift 2
      ;;
    --connections)
      CONNECTIONS="${2:-$CONNECTIONS}"
      shift 2
      ;;
    --duration)
      DURATION_SECONDS="${2:-$DURATION_SECONDS}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "[load-smoke] Bilinmeyen arguman: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if ! [[ "$CONNECTIONS" =~ ^[0-9]+$ ]] || [[ "$CONNECTIONS" -lt 1 ]]; then
  echo "[load-smoke] --connections pozitif sayi olmali." >&2
  exit 1
fi

if ! [[ "$DURATION_SECONDS" =~ ^[0-9]+$ ]] || [[ "$DURATION_SECONDS" -lt 5 ]]; then
  echo "[load-smoke] --duration en az 5 saniye olmali." >&2
  exit 1
fi

echo "[load-smoke] Hedef: $TARGET_URL"
echo "[load-smoke] Baglanti: $CONNECTIONS, sure: ${DURATION_SECONDS}s"

if command -v autocannon >/dev/null 2>&1; then
  autocannon \
    --connections "$CONNECTIONS" \
    --duration "$DURATION_SECONDS" \
    --pipelining 1 \
    --renderStatusCodes \
    "$TARGET_URL"
  exit 0
fi

if command -v npx >/dev/null 2>&1; then
  npx --yes autocannon \
    --connections "$CONNECTIONS" \
    --duration "$DURATION_SECONDS" \
    --pipelining 1 \
    --renderStatusCodes \
    "$TARGET_URL"
  exit 0
fi

if command -v ab >/dev/null 2>&1; then
  REQUEST_COUNT=$(( CONNECTIONS * DURATION_SECONDS * 25 ))
  if [[ "$REQUEST_COUNT" -lt "$CONNECTIONS" ]]; then
    REQUEST_COUNT="$CONNECTIONS"
  fi
  ab -k -n "$REQUEST_COUNT" -c "$CONNECTIONS" "$TARGET_URL"
  exit 0
fi

echo "[load-smoke] autocannon/npx/ab bulunamadi. Sunucuda nodejs veya apache2-utils kur." >&2
exit 1
