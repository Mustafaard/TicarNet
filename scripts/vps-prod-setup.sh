#!/usr/bin/env bash
set -Eeuo pipefail

APP_NAME="${APP_NAME:-ticarnet}"
APP_USER="${APP_USER:-deploy}"
APP_GROUP="${APP_GROUP:-${APP_USER}}"
APP_BASE_DIR="${APP_BASE_DIR:-/var/www/ticarnet}"
APP_DIR="${APP_BASE_DIR}/current"
DATA_DIR="${DATA_DIR:-/var/lib/ticarnet}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/ticarnet}"
ENV_FILE="${APP_DIR}/server/.env"
PM2_APP_NAME="${PM2_APP_NAME:-ticarnet-api}"
DOMAIN="${DOMAIN:-}"
LETSENCRYPT_EMAIL="${LETSENCRYPT_EMAIL:-}"
REPO_URL="${REPO_URL:-}"
BRANCH="${BRANCH:-main}"
API_PORT="${API_PORT:-8787}"
NODE_MAJOR="${NODE_MAJOR:-20}"
ENABLE_SSL="${ENABLE_SSL:-1}"
ENABLE_FIREWALL="${ENABLE_FIREWALL:-1}"
ENABLE_PM2_STARTUP="${ENABLE_PM2_STARTUP:-1}"
ENABLE_FAIL2BAN="${ENABLE_FAIL2BAN:-1}"
ENABLE_SYSCTL_TUNING="${ENABLE_SYSCTL_TUNING:-1}"
ENABLE_SWAP="${ENABLE_SWAP:-1}"
SWAP_SIZE_MB="${SWAP_SIZE_MB:-1024}"
NGINX_LIMIT_REQ_RATE="${NGINX_LIMIT_REQ_RATE:-30r/s}"
NGINX_LIMIT_REQ_BURST="${NGINX_LIMIT_REQ_BURST:-90}"
NGINX_LIMIT_CONN_PER_IP="${NGINX_LIMIT_CONN_PER_IP:-40}"
BACKUP_CRON_SCHEDULE="${BACKUP_CRON_SCHEDULE:-17 */6 * * *}"
MAX_ACCOUNTS_PER_SCOPE="${MAX_ACCOUNTS_PER_SCOPE:-2}"
ENFORCE_REGISTER_IP_ON_LOGIN_VALUE="${ENFORCE_REGISTER_IP_ON_LOGIN_VALUE:-false}"
ENFORCE_REGISTER_SUBNET_ON_LOGIN_VALUE="${ENFORCE_REGISTER_SUBNET_ON_LOGIN_VALUE:-false}"
SMTP_USER="${SMTP_USER:-}"
SMTP_APP_PASSWORD="${SMTP_APP_PASSWORD:-}"
MAIL_FROM_VALUE="${MAIL_FROM_VALUE:-}"
SUPPORT_INBOX_EMAIL="${SUPPORT_INBOX_EMAIL:-}"

usage() {
  cat <<'EOF'
Kullanim:
  sudo bash scripts/vps-prod-setup.sh \
    --domain play.ticarnet.com \
    --email admin@domain.com \
    --repo-url https://github.com/<org>/<repo>.git

Opsiyonlar:
  --domain DOMAIN             Domain (zorunlu)
  --email EMAIL              Let's Encrypt e-posta (SSL aciksa zorunlu)
  --repo-url URL             Git repo URL (opsiyonel, ilk clone icin)
  --branch BRANCH            Deploy branch (varsayilan: main)
  --app-user USER            Linux kullanicisi (varsayilan: deploy)
  --app-group GROUP          Linux grubu (varsayilan: app-user)
  --app-base-dir DIR         Kod kok dizini (varsayilan: /var/www/ticarnet)
  --data-dir DIR             Kalici veri dizini (varsayilan: /var/lib/ticarnet)
  --backup-dir DIR           DB backup dizini (varsayilan: /var/backups/ticarnet)
  --api-port PORT            API portu (varsayilan: 8787)
  --swap-size-mb MB          Swap boyutu MB (varsayilan: 1024)
  --nginx-limit-req-rate R   Nginx API rate (varsayilan: 30r/s)
  --nginx-limit-req-burst N  Nginx API burst (varsayilan: 90)
  --nginx-limit-conn-per-ip N IP basina max eszamanli baglanti (varsayilan: 40)
  --max-accounts-per-scope N Ayni public IP icin hesap limiti (varsayilan: 2)
  --enforce-register-ip-on-login true|false
                            Ilk kayit IP'si disinda giris engeli (varsayilan: false)
  --enforce-register-subnet-on-login true|false
                            Ilk kayit subnet disinda giris engeli (varsayilan: false)
  --smtp-user EMAIL         SMTP kullanici e-postasi (or: gmail adresin)
  --smtp-app-password PASS  SMTP App Password (Gmail uygulama sifresi)
  --smtp-pass PASS          --smtp-app-password ile ayni
  --mail-from VALUE         Gonderen basligi (or: "TicarNet Online <mail@alanadiniz.com>")
  --support-inbox-email     Destek taleplerinin gidecegi e-posta
  --skip-ssl                 SSL kurulumunu atla
  --skip-firewall            UFW kurulumunu atla
  --skip-pm2-startup         PM2 systemd startup kurulumunu atla
  --skip-fail2ban            Fail2ban kurulumunu atla
  --skip-sysctl-tuning       Kernel/sysctl tuning adimini atla
  --skip-swap                Swap olusturma adimini atla
  -h, --help                 Yardim

Not:
  DNS A kaydi sunucu IP'sine yonlendirilmeden SSL adimi basarisiz olur.
  --repo-url vermezsen script APP_DIR altinda mevcut projeyi kullanir.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain)
      DOMAIN="${2:-}"
      shift 2
      ;;
    --email)
      LETSENCRYPT_EMAIL="${2:-}"
      shift 2
      ;;
    --repo-url)
      REPO_URL="${2:-}"
      shift 2
      ;;
    --branch)
      BRANCH="${2:-}"
      shift 2
      ;;
    --app-user)
      APP_USER="${2:-}"
      shift 2
      ;;
    --app-group)
      APP_GROUP="${2:-}"
      shift 2
      ;;
    --app-base-dir)
      APP_BASE_DIR="${2:-}"
      shift 2
      ;;
    --data-dir)
      DATA_DIR="${2:-}"
      shift 2
      ;;
    --backup-dir)
      BACKUP_DIR="${2:-}"
      shift 2
      ;;
    --api-port)
      API_PORT="${2:-8787}"
      shift 2
      ;;
    --swap-size-mb)
      SWAP_SIZE_MB="${2:-1024}"
      shift 2
      ;;
    --nginx-limit-req-rate)
      NGINX_LIMIT_REQ_RATE="${2:-30r/s}"
      shift 2
      ;;
    --nginx-limit-req-burst)
      NGINX_LIMIT_REQ_BURST="${2:-90}"
      shift 2
      ;;
    --nginx-limit-conn-per-ip)
      NGINX_LIMIT_CONN_PER_IP="${2:-40}"
      shift 2
      ;;
    --max-accounts-per-scope)
      MAX_ACCOUNTS_PER_SCOPE="${2:-2}"
      shift 2
      ;;
    --enforce-register-ip-on-login)
      ENFORCE_REGISTER_IP_ON_LOGIN_VALUE="${2:-false}"
      shift 2
      ;;
    --enforce-register-subnet-on-login)
      ENFORCE_REGISTER_SUBNET_ON_LOGIN_VALUE="${2:-false}"
      shift 2
      ;;
    --smtp-user)
      SMTP_USER="${2:-}"
      shift 2
      ;;
    --smtp-app-password|--smtp-pass)
      SMTP_APP_PASSWORD="${2:-}"
      shift 2
      ;;
    --mail-from)
      MAIL_FROM_VALUE="${2:-}"
      shift 2
      ;;
    --support-inbox-email)
      SUPPORT_INBOX_EMAIL="${2:-}"
      shift 2
      ;;
    --skip-ssl)
      ENABLE_SSL=0
      shift
      ;;
    --skip-firewall)
      ENABLE_FIREWALL=0
      shift
      ;;
    --skip-pm2-startup)
      ENABLE_PM2_STARTUP=0
      shift
      ;;
    --skip-fail2ban)
      ENABLE_FAIL2BAN=0
      shift
      ;;
    --skip-sysctl-tuning)
      ENABLE_SYSCTL_TUNING=0
      shift
      ;;
    --skip-swap)
      ENABLE_SWAP=0
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "[vps-setup] Bilinmeyen arguman: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ $EUID -ne 0 ]]; then
  echo "[vps-setup] Bu script root olarak calismalidir. sudo kullan." >&2
  exit 1
fi

if [[ -z "$DOMAIN" ]]; then
  echo "[vps-setup] --domain zorunlu." >&2
  exit 1
fi

if [[ "$ENABLE_SSL" == "1" && -z "$LETSENCRYPT_EMAIL" ]]; then
  echo "[vps-setup] SSL acik oldugu icin --email zorunlu." >&2
  exit 1
fi

if ! [[ "$API_PORT" =~ ^[0-9]+$ ]]; then
  echo "[vps-setup] Gecersiz --api-port: $API_PORT" >&2
  exit 1
fi

if ! [[ "$SWAP_SIZE_MB" =~ ^[0-9]+$ ]]; then
  echo "[vps-setup] Gecersiz --swap-size-mb: $SWAP_SIZE_MB" >&2
  exit 1
fi

if ! [[ "$NGINX_LIMIT_REQ_BURST" =~ ^[0-9]+$ ]]; then
  echo "[vps-setup] Gecersiz --nginx-limit-req-burst: $NGINX_LIMIT_REQ_BURST" >&2
  exit 1
fi

if ! [[ "$NGINX_LIMIT_CONN_PER_IP" =~ ^[0-9]+$ ]]; then
  echo "[vps-setup] Gecersiz --nginx-limit-conn-per-ip: $NGINX_LIMIT_CONN_PER_IP" >&2
  exit 1
fi

if ! [[ "$MAX_ACCOUNTS_PER_SCOPE" =~ ^[0-9]+$ ]]; then
  echo "[vps-setup] Gecersiz --max-accounts-per-scope: $MAX_ACCOUNTS_PER_SCOPE" >&2
  exit 1
fi

if [[ "$ENFORCE_REGISTER_IP_ON_LOGIN_VALUE" != "true" && "$ENFORCE_REGISTER_IP_ON_LOGIN_VALUE" != "false" ]]; then
  echo "[vps-setup] Gecersiz --enforce-register-ip-on-login: $ENFORCE_REGISTER_IP_ON_LOGIN_VALUE (true|false olmali)." >&2
  exit 1
fi

if [[ "$ENFORCE_REGISTER_SUBNET_ON_LOGIN_VALUE" != "true" && "$ENFORCE_REGISTER_SUBNET_ON_LOGIN_VALUE" != "false" ]]; then
  echo "[vps-setup] Gecersiz --enforce-register-subnet-on-login: $ENFORCE_REGISTER_SUBNET_ON_LOGIN_VALUE (true|false olmali)." >&2
  exit 1
fi

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "[vps-setup] Komut bulunamadi: $1" >&2
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
  local file_path="${2:-$ENV_FILE}"
  if [[ -z "$key" || ! -f "$file_path" ]]; then
    return 1
  fi
  local line
  line="$(grep -E "^${key}=" "$file_path" | tail -n 1 || true)"
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
  local file_path="${3:-$ENV_FILE}"
  local escaped
  escaped="$(escape_sed_replacement "$value")"
  if grep -qE "^${key}=" "$file_path"; then
    sed -i "s#^${key}=.*#${key}=${escaped}#g" "$file_path"
  else
    printf '%s=%s\n' "$key" "$value" >> "$file_path"
  fi
}

is_placeholder_value() {
  local value
  value="$(printf '%s' "${1:-}" | tr '[:upper:]' '[:lower:]')"
  [[ -z "$value" ]] && return 0
  [[ "$value" == "change_me" ]] && return 0
  [[ "$value" == *"buraya_"* ]] && return 0
  [[ "$value" == *"uzun_"* ]] && return 0
  [[ "$value" == *"your_"* ]] && return 0
  [[ "$value" == *"example"* ]] && return 0
  return 1
}

set_secret_if_missing() {
  local key="$1"
  local current
  current="$(read_env_value "$key" "$ENV_FILE" || true)"
  if is_placeholder_value "$current"; then
    upsert_env "$key" "$(openssl rand -hex 48)" "$ENV_FILE"
  fi
}

write_nginx_config() {
  cat > /etc/nginx/sites-available/ticarnet.conf <<EOF
map \$http_upgrade \$connection_upgrade {
  default upgrade;
  '' close;
}

limit_req_zone \$binary_remote_addr zone=ticarnet_api_rate:20m rate=${NGINX_LIMIT_REQ_RATE};
limit_req_zone \$binary_remote_addr zone=ticarnet_auth_rate:10m rate=20r/m;
limit_conn_zone \$binary_remote_addr zone=ticarnet_conn_limit:20m;

server {
  listen 80;
  server_name ${DOMAIN};

  add_header X-Content-Type-Options "nosniff" always;
  add_header X-Frame-Options "DENY" always;
  add_header Referrer-Policy "no-referrer" always;
  add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;

  client_max_body_size 2m;
  client_body_timeout 15s;
  client_header_timeout 15s;
  send_timeout 20s;
  keepalive_timeout 20s;
  limit_req_status 429;
  limit_conn_status 429;

  location /.well-known/acme-challenge/ {
    root /var/www/html;
  }

  root ${APP_DIR}/dist;
  index index.html;

  location ~ /\.(?!well-known) {
    deny all;
  }

  location ~* \.(env|ini|log|sh|sql|bak)$ {
    deny all;
  }

  location /assets/ {
    expires 30d;
    add_header Cache-Control "public, max-age=2592000, immutable";
    try_files \$uri =404;
  }

  location = /download/ticarnet.apk {
    default_type application/vnd.android.package-archive;
    add_header Content-Disposition 'attachment; filename="ticarnet.apk"' always;
    add_header Cache-Control "no-store";
    try_files \$uri =404;
  }

  location /download/ {
    try_files \$uri \$uri/ =404;
  }

  location ~ ^/api/auth/(login|register|request-password-reset|validate-reset-token|reset-password)$ {
    limit_req zone=ticarnet_auth_rate burst=20 nodelay;
    limit_conn ticarnet_conn_limit ${NGINX_LIMIT_CONN_PER_IP};
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection \$connection_upgrade;
    proxy_read_timeout 120s;
    proxy_send_timeout 60s;
    proxy_pass http://127.0.0.1:${API_PORT};
  }

  location /api/ {
    limit_req zone=ticarnet_api_rate burst=${NGINX_LIMIT_REQ_BURST} nodelay;
    limit_conn ticarnet_conn_limit ${NGINX_LIMIT_CONN_PER_IP};
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection \$connection_upgrade;
    proxy_buffering off;
    proxy_read_timeout 300s;
    proxy_send_timeout 60s;
    proxy_pass http://127.0.0.1:${API_PORT};
  }

  location / {
    try_files \$uri \$uri/ /index.html;
  }
}
EOF
}

install_base_packages() {
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -y
  apt-get install -y ca-certificates curl gnupg git jq nginx ufw openssl fail2ban apache2-utils
}

install_node() {
  local current_major=0
  if command -v node >/dev/null 2>&1; then
    current_major="$(node -v | sed -E 's/^v([0-9]+).*/\1/' || echo 0)"
  fi

  if [[ "${current_major:-0}" -lt "$NODE_MAJOR" ]]; then
    curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
    apt-get install -y nodejs
  fi
  npm install -g pm2
}

ensure_user_and_dirs() {
  if ! id -u "$APP_USER" >/dev/null 2>&1; then
    useradd --create-home --shell /bin/bash "$APP_USER"
  fi
  if ! getent group "$APP_GROUP" >/dev/null 2>&1; then
    groupadd "$APP_GROUP"
  fi
  usermod -a -G "$APP_GROUP" "$APP_USER" || true

  mkdir -p "$APP_BASE_DIR" "$DATA_DIR/uploads/avatars" "$BACKUP_DIR"
  chown -R "$APP_USER":"$APP_GROUP" "$APP_BASE_DIR" "$DATA_DIR"
  chmod 750 "$DATA_DIR" || true
  chmod 750 "$BACKUP_DIR" || true
}

sync_code() {
  if [[ -d "$APP_DIR/.git" ]]; then
    sudo -u "$APP_USER" -H bash -lc "
      cd '$APP_DIR' && \
      git fetch --all --prune && \
      git checkout '$BRANCH' && \
      git pull --ff-only origin '$BRANCH'
    "
  elif [[ -n "$REPO_URL" ]]; then
    sudo -u "$APP_USER" -H bash -lc "
      mkdir -p '$APP_BASE_DIR' && \
      git clone --branch '$BRANCH' '$REPO_URL' '$APP_DIR'
    "
  else
    if [[ ! -f "$APP_DIR/package.json" ]]; then
      echo "[vps-setup] --repo-url verilmedi ve $APP_DIR icinde proje bulunamadi." >&2
      echo "[vps-setup] Cozum: ya --repo-url ver, ya da projeyi once VS Code/SSH ile bu dizine kopyala." >&2
      exit 1
    fi
    echo "[vps-setup] Git adimi atlandi (mevcut proje klasoru kullaniliyor)."
  fi
}

configure_env() {
  local public_scheme="http"
  if [[ "$ENABLE_SSL" == "1" ]]; then
    public_scheme="https"
  fi
  local public_base_url="${public_scheme}://${DOMAIN}"

  if [[ ! -f "$ENV_FILE" ]]; then
    cp "${APP_DIR}/server/.env.example" "$ENV_FILE"
    chown "$APP_USER":"$APP_GROUP" "$ENV_FILE"
    chmod 640 "$ENV_FILE" || true
  fi

  upsert_env "NODE_ENV" "production" "$ENV_FILE"
  upsert_env "API_HOST" "127.0.0.1" "$ENV_FILE"
  upsert_env "API_PORT" "$API_PORT" "$ENV_FILE"
  upsert_env "CLIENT_URL" "$public_base_url" "$ENV_FILE"
  upsert_env "RESET_LINK_BASE_URL" "$public_base_url" "$ENV_FILE"
  upsert_env "CORS_ALLOWED_ORIGINS" "$public_base_url" "$ENV_FILE"
  upsert_env "CORS_ALLOW_NO_ORIGIN" "true" "$ENV_FILE"
  upsert_env "WS_ALLOW_QUERY_TOKEN" "false" "$ENV_FILE"
  upsert_env "MAX_ACCOUNTS_PER_SCOPE" "$MAX_ACCOUNTS_PER_SCOPE" "$ENV_FILE"
  upsert_env "ENFORCE_REGISTER_IP_ON_LOGIN" "$ENFORCE_REGISTER_IP_ON_LOGIN_VALUE" "$ENV_FILE"
  upsert_env "ENFORCE_REGISTER_SUBNET_ON_LOGIN" "$ENFORCE_REGISTER_SUBNET_ON_LOGIN_VALUE" "$ENV_FILE"
  upsert_env "ACCOUNT_DELETION_ENABLED" "false" "$ENV_FILE"
  upsert_env "SINGLE_SESSION_ENFORCED" "true" "$ENV_FILE"
  upsert_env "DB_FILE_PATH" "${DATA_DIR}/db.json" "$ENV_FILE"
  upsert_env "UPLOAD_ROOT_DIR" "${DATA_DIR}/uploads" "$ENV_FILE"
  upsert_env "AVATAR_UPLOAD_DIR" "${DATA_DIR}/uploads/avatars" "$ENV_FILE"
  upsert_env "DB_ROLLING_BACKUP_FILE_PATH" "${DATA_DIR}/backups/db-rolling.json" "$ENV_FILE"
  upsert_env "DB_BACKUP_RETENTION_DAYS" "0" "$ENV_FILE"

  if [[ -n "$SMTP_USER" ]]; then
    upsert_env "SMTP_USER" "$SMTP_USER" "$ENV_FILE"
  fi
  if [[ -n "$SMTP_APP_PASSWORD" ]]; then
    upsert_env "SMTP_APP_PASSWORD" "$SMTP_APP_PASSWORD" "$ENV_FILE"
  fi
  if [[ -n "$MAIL_FROM_VALUE" ]]; then
    upsert_env "MAIL_FROM" "$MAIL_FROM_VALUE" "$ENV_FILE"
  elif [[ -n "$SMTP_USER" ]]; then
    local existing_mail_from
    existing_mail_from="$(read_env_value "MAIL_FROM" "$ENV_FILE" || true)"
    if is_placeholder_value "$existing_mail_from"; then
      upsert_env "MAIL_FROM" "\"TicarNet Online <${SMTP_USER}>\"" "$ENV_FILE"
    fi
  fi
  if [[ -n "$SUPPORT_INBOX_EMAIL" ]]; then
    upsert_env "SUPPORT_INBOX_EMAIL" "$SUPPORT_INBOX_EMAIL" "$ENV_FILE"
  fi

  set_secret_if_missing "JWT_SECRET"
  set_secret_if_missing "HEALTHCHECK_TOKEN"

  chown "$APP_USER":"$APP_GROUP" "$ENV_FILE"
}

warn_if_smtp_incomplete() {
  local smtp_user_current
  local smtp_pass_current
  local mail_from_current

  smtp_user_current="$(read_env_value "SMTP_USER" "$ENV_FILE" || true)"
  smtp_pass_current="$(read_env_value "SMTP_APP_PASSWORD" "$ENV_FILE" || true)"
  mail_from_current="$(read_env_value "MAIL_FROM" "$ENV_FILE" || true)"

  if is_placeholder_value "$smtp_user_current" || is_placeholder_value "$smtp_pass_current" || is_placeholder_value "$mail_from_current"; then
    cat <<'EOF'
[vps-setup] UYARI: SMTP ayarlari tam degil. Sifre yenileme e-postasi gonderimi basarisiz olabilir.
[vps-setup] Duzenle:
  server/.env icinde SMTP_USER, SMTP_APP_PASSWORD, MAIL_FROM
EOF
  fi
}

install_app_dependencies_and_build() {
  sudo -u "$APP_USER" -H bash -lc "
    cd '$APP_DIR' && \
    npm ci && \
    npm run build
  "
}

configure_pm2() {
  local app_home
  app_home="$(getent passwd "$APP_USER" | cut -d: -f6)"
  sudo -u "$APP_USER" -H bash -lc "
    cd '$APP_DIR' && \
    PM2_APP_NAME='$PM2_APP_NAME' TICARNET_ROOT='$APP_DIR' pm2 startOrReload ecosystem.config.cjs --update-env && \
    pm2 save
  "

  if [[ "$ENABLE_PM2_STARTUP" == "1" ]]; then
    env PATH="$PATH:/usr/bin" pm2 startup systemd -u "$APP_USER" --hp "$app_home" >/dev/null || true
    systemctl enable "pm2-${APP_USER}" >/dev/null 2>&1 || true
    systemctl restart "pm2-${APP_USER}" >/dev/null 2>&1 || true
  fi
}

configure_nginx_and_ssl() {
  write_nginx_config
  ln -sfn /etc/nginx/sites-available/ticarnet.conf /etc/nginx/sites-enabled/ticarnet.conf
  rm -f /etc/nginx/sites-enabled/default
  nginx -t
  systemctl enable nginx >/dev/null 2>&1 || true
  systemctl reload nginx

  if [[ "$ENABLE_SSL" == "1" ]]; then
    apt-get install -y certbot python3-certbot-nginx
    certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$LETSENCRYPT_EMAIL" --redirect
    nginx -t
    systemctl reload nginx
  fi
}

configure_swap() {
  if [[ "$ENABLE_SWAP" != "1" ]]; then
    return
  fi

  if swapon --show 2>/dev/null | grep -q '^/swapfile'; then
    return
  fi

  if [[ "$SWAP_SIZE_MB" -lt 256 ]]; then
    echo "[vps-setup] Swap atlandi: --swap-size-mb en az 256 olmali." >&2
    return
  fi

  if [[ ! -f /swapfile ]]; then
    if ! fallocate -l "${SWAP_SIZE_MB}M" /swapfile 2>/dev/null; then
      dd if=/dev/zero of=/swapfile bs=1M count="$SWAP_SIZE_MB" status=none
    fi
    chmod 600 /swapfile
    mkswap /swapfile >/dev/null
  fi

  swapon /swapfile || true
  if ! grep -qE '^[^#]*[[:space:]]+/swapfile[[:space:]]+none[[:space:]]+swap' /etc/fstab; then
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
  fi

  cat > /etc/sysctl.d/99-ticarnet-memory.conf <<'EOF'
vm.swappiness=10
vm.vfs_cache_pressure=50
EOF
  sysctl --system >/dev/null 2>&1 || true
}

configure_sysctl_tuning() {
  if [[ "$ENABLE_SYSCTL_TUNING" != "1" ]]; then
    return
  fi

  cat > /etc/sysctl.d/99-ticarnet-network.conf <<'EOF'
net.core.somaxconn=4096
net.core.netdev_max_backlog=4096
net.ipv4.tcp_max_syn_backlog=4096
net.ipv4.tcp_syncookies=1
net.ipv4.ip_local_port_range=10240 65535
net.ipv4.tcp_fin_timeout=15
net.ipv4.tcp_keepalive_time=300
net.ipv4.conf.all.rp_filter=1
net.ipv4.conf.default.rp_filter=1
EOF
  sysctl --system >/dev/null 2>&1 || true
}

configure_firewall() {
  if [[ "$ENABLE_FIREWALL" != "1" ]]; then
    return
  fi
  ufw allow OpenSSH >/dev/null 2>&1 || true
  ufw allow 'Nginx Full' >/dev/null 2>&1 || true
  ufw --force enable >/dev/null 2>&1 || true
}

configure_fail2ban() {
  if [[ "$ENABLE_FAIL2BAN" != "1" ]]; then
    return
  fi

  mkdir -p /etc/fail2ban/filter.d /etc/fail2ban/jail.d
  cat > /etc/fail2ban/filter.d/ticarnet-auth-abuse.conf <<'EOF'
[Definition]
failregex = ^<HOST> - .*"(GET|POST|PUT|DELETE|PATCH|OPTIONS|HEAD) /api/auth/.* HTTP/.*" (401|403|429) .*
ignoreregex =
EOF

  local ban_action
  ban_action="%(action_)s"
  if [[ "$ENABLE_FIREWALL" == "1" ]]; then
    ban_action="ufw"
  fi

  cat > /etc/fail2ban/jail.d/ticarnet.local <<EOF
[DEFAULT]
bantime = 1h
findtime = 10m
maxretry = 30
backend = auto

[sshd]
enabled = true
mode = aggressive

[ticarnet-auth-abuse]
enabled = true
port = http,https
filter = ticarnet-auth-abuse
logpath = /var/log/nginx/access.log
findtime = 10m
maxretry = 35
bantime = 2h
action = ${ban_action}
EOF

  systemctl enable fail2ban >/dev/null 2>&1 || true
  systemctl restart fail2ban >/dev/null 2>&1 || true
}

configure_db_backup_cron() {
  local backup_script="${APP_DIR}/scripts/db-backup.sh"
  local log_file="/var/log/ticarnet-db-backup.log"
  chmod +x "$backup_script"
  touch "$log_file"
  chown root:adm "$log_file" || true
  chmod 640 "$log_file" || true

  local cron_cmd
  cron_cmd="/usr/bin/flock -n /tmp/ticarnet-db-backup.lock /bin/bash ${backup_script} >> ${log_file} 2>&1"
  (
    crontab -l 2>/dev/null | grep -v -F "$backup_script" || true
    echo "${BACKUP_CRON_SCHEDULE} ${cron_cmd}"
  ) | crontab -

  /bin/bash "$backup_script"
}

post_checks() {
  require_cmd curl
  require_cmd pm2
  echo "[vps-setup] PM2 durum:"
  sudo -u "$APP_USER" -H pm2 status || true
  echo "[vps-setup] API health:"
  curl -fsS "http://127.0.0.1:${API_PORT}/api/health" || true
  if [[ "$ENABLE_FAIL2BAN" == "1" ]]; then
    echo "[vps-setup] Fail2ban durum:"
    fail2ban-client status || true
  fi
}

echo "[vps-setup] Basliyor..."
install_base_packages
configure_swap
configure_sysctl_tuning
install_node
ensure_user_and_dirs
sync_code
configure_env
install_app_dependencies_and_build
configure_pm2
configure_nginx_and_ssl
configure_firewall
configure_fail2ban
configure_db_backup_cron
post_checks
warn_if_smtp_incomplete
echo "[vps-setup] Tamamlandi."
echo "[vps-setup] App dizini: ${APP_DIR}"
echo "[vps-setup] Env dosyasi: ${ENV_FILE}"
echo "[vps-setup] Backup dizini: ${BACKUP_DIR}"

