#!/usr/bin/env bash
set -Eeuo pipefail

DOMAIN="${APK_DOMAIN:-apk.ticarnet.tr}"
APP_ROOT="${APP_ROOT:-/var/www/ticarnet/current}"
APK_SOURCE="${APK_SOURCE:-}"
APK_NAME="${APK_NAME:-ticarnet.apk}"
BRAND_NAME="${BRAND_NAME:-TicarNet Online}"
LOGO_SOURCE="${LOGO_SOURCE:-}"
ENABLE_SSL="${ENABLE_SSL:-0}"
LETSENCRYPT_EMAIL="${LETSENCRYPT_EMAIL:-}"

usage() {
  cat <<'EOF'
Kullanim:
  sudo bash scripts/vps-publish-apk.sh [--domain DOMAIN] [--apk-source PATH] [--apk-name NAME] [--app-root PATH] [--brand-name NAME] [--logo-source PATH] [--enable-ssl --email EMAIL]

Opsiyonlar:
  --domain DOMAIN    APK icin alan adi (varsayilan: apk.ticarnet.tr)
  --apk-source PATH  Yayina alinacak APK dosyasi
  --apk-name NAME    URL'de gorunecek dosya adi (varsayilan: ticarnet.apk)
  --app-root PATH    Uygulama kok dizini (varsayilan: /var/www/ticarnet/current)
  --brand-name NAME  Indirme sayfasinda gosterilecek marka adi (varsayilan: TicarNet Online)
  --logo-source PATH Indirme sayfasinda kullanilacak logo dosyasi (opsiyonel)
  --enable-ssl       Domain icin certbot ile SSL etkinlestir
  --email EMAIL      SSL icin Let's Encrypt e-postasi
  -h, --help         Yardim metni

Ornek:
  sudo bash scripts/vps-publish-apk.sh \
    --domain apk.ticarnet.tr \
    --apk-source /var/www/ticarnet/current/release/ticarnet-demo-debug.apk \
    --apk-name ticarnet.apk \
    --brand-name "TicarNet Online" \
    --enable-ssl --email admin@ticarnet.tr
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
    --brand-name)
      BRAND_NAME="${2:-}"
      shift 2
      ;;
    --logo-source)
      LOGO_SOURCE="${2:-}"
      shift 2
      ;;
    --enable-ssl)
      ENABLE_SSL=1
      shift
      ;;
    --email)
      LETSENCRYPT_EMAIL="${2:-}"
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

if [[ "$ENABLE_SSL" == "1" && -z "$LETSENCRYPT_EMAIL" ]]; then
  echo "[apk-publish] --enable-ssl kullanildiginda --email zorunludur." >&2
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

guess_logo_source() {
  local app_root="${1:-}"
  local candidate

  for candidate in \
    "${app_root}/dist/splash/logo.webp" \
    "${app_root}/dist/splash/logo.png" \
    "${app_root}/public/splash/logo.webp" \
    "${app_root}/public/splash/logo.png"; do
    if [[ -f "$candidate" ]]; then
      printf '%s' "$candidate"
      return 0
    fi
  done

  printf '%s' ""
}

if [[ -z "$LOGO_SOURCE" ]]; then
  LOGO_SOURCE="$(guess_logo_source "$APP_ROOT")"
fi

DOWNLOAD_DIR="${APP_ROOT}/dist/download"
TARGET_APK="${DOWNLOAD_DIR}/${APK_NAME}"
NGINX_CONF="/etc/nginx/sites-available/${DOMAIN}.conf"
NGINX_LINK="/etc/nginx/sites-enabled/${DOMAIN}.conf"
LANDING_HTML="${DOWNLOAD_DIR}/index.html"
TARGET_LOGO=""

mkdir -p "$DOWNLOAD_DIR"
cp -f "$APK_SOURCE" "$TARGET_APK"

if [[ -n "$LOGO_SOURCE" && -f "$LOGO_SOURCE" ]]; then
  logo_ext="${LOGO_SOURCE##*.}"
  logo_ext="${logo_ext,,}"
  if [[ "$logo_ext" == "png" || "$logo_ext" == "webp" || "$logo_ext" == "jpg" || "$logo_ext" == "jpeg" || "$logo_ext" == "svg" ]]; then
    TARGET_LOGO="${DOWNLOAD_DIR}/logo.${logo_ext}"
    cp -f "$LOGO_SOURCE" "$TARGET_LOGO"
  fi
fi

cat > "$LANDING_HTML" <<EOF
<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${BRAND_NAME} APK İndir</title>
  <style>
    :root { color-scheme: dark; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: 'Segoe UI', Tahoma, sans-serif;
      display: grid;
      place-items: center;
      background:
        radial-gradient(circle at 20% 20%, #1e3a8a 0%, transparent 42%),
        radial-gradient(circle at 80% 0%, #0f172a 0%, transparent 45%),
        linear-gradient(160deg, #020617, #0b2447 60%, #102c57);
      color: #e2e8f0;
      padding: 24px;
    }
    .card {
      width: min(460px, 100%);
      border: 1px solid rgba(148, 163, 184, 0.25);
      background: rgba(2, 6, 23, 0.78);
      border-radius: 18px;
      padding: 28px 24px;
      text-align: center;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.38);
      backdrop-filter: blur(6px);
    }
    .logo {
      width: 88px;
      height: 88px;
      margin: 0 auto 14px;
      border-radius: 18px;
      object-fit: contain;
      border: 1px solid rgba(250, 204, 21, 0.5);
      background: rgba(15, 23, 42, 0.75);
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);
    }
    h1 {
      margin: 0 0 8px;
      font-size: clamp(26px, 5.8vw, 34px);
      font-weight: 800;
      letter-spacing: 0.01em;
      color: #f8fafc;
    }
    p {
      margin: 0 0 18px;
      color: #cbd5e1;
      font-size: 15px;
      line-height: 1.45;
    }
    .btn {
      display: inline-block;
      border-radius: 12px;
      padding: 12px 22px;
      font-weight: 700;
      font-size: 16px;
      text-decoration: none;
      color: #111827;
      background: linear-gradient(180deg, #facc15, #f59e0b);
      box-shadow: 0 12px 24px rgba(245, 158, 11, 0.35);
    }
    .meta {
      margin-top: 14px;
      font-size: 13px;
      color: #94a3b8;
      word-break: break-word;
    }
  </style>
</head>
<body>
  <section class="card">
EOF

if [[ -n "$TARGET_LOGO" ]]; then
cat >> "$LANDING_HTML" <<EOF
    <img class="logo" src="/$(basename "$TARGET_LOGO")" alt="${BRAND_NAME} logosu" />
EOF
fi

cat >> "$LANDING_HTML" <<EOF
    <h1>${BRAND_NAME}</h1>
    <p>Android sürümünü indirmek için aşağıdaki butonu kullanın.</p>
    <a class="btn" href="/${APK_NAME}">APK İndir</a>
    <div class="meta">Dosya: ${APK_NAME}</div>
  </section>
</body>
</html>
EOF

cat > "$NGINX_CONF" <<EOF
server {
    listen 80;
    server_name ${DOMAIN};

    root ${DOWNLOAD_DIR};
    index index.html;

    location = /${APK_NAME} {
        default_type application/vnd.android.package-archive;
        add_header Content-Disposition 'attachment; filename="${APK_NAME}"' always;
        add_header Cache-Control 'no-store';
        try_files /${APK_NAME} =404;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF

ln -sfn "$NGINX_CONF" "$NGINX_LINK"
nginx -t
systemctl reload nginx

if [[ "$ENABLE_SSL" == "1" ]]; then
  apt-get update -y
  apt-get install -y certbot python3-certbot-nginx
  certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$LETSENCRYPT_EMAIL" --redirect
  nginx -t
  systemctl reload nginx
fi

echo "[apk-publish] Tamamlandi."
echo "[apk-publish] Kaynak APK: $APK_SOURCE"
echo "[apk-publish] Hedef APK: $TARGET_APK"
if [[ -n "$TARGET_LOGO" ]]; then
  echo "[apk-publish] Logo: $TARGET_LOGO"
fi
if [[ "$ENABLE_SSL" == "1" ]]; then
  echo "[apk-publish] Indirme sayfasi: https://${DOMAIN}/"
  echo "[apk-publish] Direkt APK: https://${DOMAIN}/${APK_NAME}"
else
  echo "[apk-publish] Indirme sayfasi: http://${DOMAIN}/"
  echo "[apk-publish] Direkt APK: http://${DOMAIN}/${APK_NAME}"
fi
echo "[apk-publish] Not: DNS A kaydi ${DOMAIN} -> sunucu IP olmalidir."
