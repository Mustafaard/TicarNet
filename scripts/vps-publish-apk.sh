#!/usr/bin/env bash
set -Eeuo pipefail

DOMAIN="${APK_DOMAIN:-apk.ticarnet.online}"
APP_ROOT="${APP_ROOT:-/var/www/ticarnet/current}"
APK_SOURCE="${APK_SOURCE:-}"
APK_NAME="${APK_NAME:-ticarnet.apk}"

usage() {
  cat <<'EOF'
Kullanim:
  sudo bash scripts/vps-publish-apk.sh [--domain DOMAIN] [--apk-source PATH] [--apk-name NAME] [--app-root PATH]

Opsiyonlar:
  --domain DOMAIN    APK icin alan adi (varsayilan: apk.ticarnet.online)
  --apk-source PATH  Yayina alinacak APK dosyasi
  --apk-name NAME    URL'de gorunecek dosya adi (varsayilan: ticarnet.apk)
  --app-root PATH    Uygulama kok dizini (varsayilan: /var/www/ticarnet/current)
  -h, --help         Yardim metni

Ornek:
  sudo bash scripts/vps-publish-apk.sh \
    --domain apk.ticarnet.online \
    --apk-source /var/www/ticarnet/current/release/ticarnet-demo-debug.apk \
    --apk-name ticarnet.apk
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain)
      DOMAIN="${2:-}"
      shift 2
      ;;
    --apk-source)
      APK_SOURCE="${2:-}"
      shift 2
      ;;
    --apk-name)
      APK_NAME="${2:-}"
      shift 2
      ;;
    --app-root)
      APP_ROOT="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "[apk-publish] Bilinmeyen arguman: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ "$EUID" -ne 0 ]]; then
  echo "[apk-publish] Bu script root ile calismali. sudo kullan." >&2
  exit 1
fi

if ! command -v nginx >/dev/null 2>&1; then
  echo "[apk-publish] nginx bulunamadi." >&2
  exit 1
fi

if [[ ! "$DOMAIN" =~ ^[a-zA-Z0-9.-]+$ ]]; then
  echo "[apk-publish] Gecersiz domain: $DOMAIN" >&2
  exit 1
fi

if [[ ! "$APK_NAME" =~ ^[a-zA-Z0-9._-]+$ ]]; then
  echo "[apk-publish] Gecersiz apk dosya adi: $APK_NAME" >&2
  exit 1
fi

guess_apk_source() {
  local app_root="${1:-}"
  local candidate

  for candidate in \
    "${app_root}/release/ticarnet-demo-debug.apk" \
    "${app_root}/android/app/build/outputs/apk/debug/app-debug.apk"; do
    if [[ -f "$candidate" ]]; then
      printf '%s' "$candidate"
      return 0
    fi
  done

  find "$app_root" -type f -name '*.apk' 2>/dev/null | head -n 1 || true
}

if [[ -z "$APK_SOURCE" ]]; then
  APK_SOURCE="$(guess_apk_source "$APP_ROOT")"
fi

if [[ -z "$APK_SOURCE" || ! -f "$APK_SOURCE" ]]; then
  echo "[apk-publish] APK bulunamadi. --apk-source ile dosya yolunu ver." >&2
  exit 1
fi

DOWNLOAD_DIR="${APP_ROOT}/dist/download"
TARGET_APK="${DOWNLOAD_DIR}/${APK_NAME}"
NGINX_CONF="/etc/nginx/sites-available/${DOMAIN}.conf"
NGINX_LINK="/etc/nginx/sites-enabled/${DOMAIN}.conf"

mkdir -p "$DOWNLOAD_DIR"
cp -f "$APK_SOURCE" "$TARGET_APK"

cat > "$NGINX_CONF" <<EOF
server {
    listen 80;
    server_name ${DOMAIN};

    location = / {
        return 302 /${APK_NAME};
    }

    location = /${APK_NAME} {
        alias ${TARGET_APK};
        default_type application/vnd.android.package-archive;
        add_header Content-Disposition 'attachment; filename="${APK_NAME}"';
    }
}
EOF

ln -sfn "$NGINX_CONF" "$NGINX_LINK"
nginx -t
systemctl reload nginx

echo "[apk-publish] Tamamlandi."
echo "[apk-publish] Kaynak APK: $APK_SOURCE"
echo "[apk-publish] Hedef APK: $TARGET_APK"
echo "[apk-publish] Link: http://${DOMAIN}/${APK_NAME}"
echo "[apk-publish] Not: DNS A kaydi ${DOMAIN} -> sunucu IP olmalidir."
