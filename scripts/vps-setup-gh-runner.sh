#!/usr/bin/env bash
set -Eeuo pipefail

REPO_SLUG=""
RUNNER_TOKEN=""
RUNNER_NAME="${RUNNER_NAME:-ticarnet-vps}"
RUNNER_LABELS="${RUNNER_LABELS:-ticarnet-vps}"
RUNNER_VERSION="${RUNNER_VERSION:-2.327.1}"
RUNNER_USER="${RUNNER_USER:-deploy}"
RUNNER_DIR="${RUNNER_DIR:-/home/${RUNNER_USER}/actions-runner}"

usage() {
  cat <<'EOF'
Kullanim:
  sudo bash scripts/vps-setup-gh-runner.sh --repo owner/repo --token RUNNER_TOKEN

Opsiyonlar:
  --repo owner/repo      Zorunlu. Ornek: Mustafaard/TicarNet
  --token TOKEN          Zorunlu. GitHub'dan 1 saatlik runner token
  --name NAME            Runner adi (varsayilan: ticarnet-vps)
  --labels LABELS        Extra label listesi (varsayilan: ticarnet-vps)
  --version VERSION      Runner surumu (varsayilan: 2.327.1)
  --user USER            Runner linux kullanicisi (varsayilan: deploy)
  --dir PATH             Kurulum dizini (varsayilan: /home/deploy/actions-runner)
  -h, --help             Yardim
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo)
      REPO_SLUG="${2:-}"
      shift 2
      ;;
    --token)
      RUNNER_TOKEN="${2:-}"
      shift 2
      ;;
    --name)
      RUNNER_NAME="${2:-}"
      shift 2
      ;;
    --labels)
      RUNNER_LABELS="${2:-}"
      shift 2
      ;;
    --version)
      RUNNER_VERSION="${2:-}"
      shift 2
      ;;
    --user)
      RUNNER_USER="${2:-}"
      shift 2
      ;;
    --dir)
      RUNNER_DIR="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "[runner-setup] Bilinmeyen arguman: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ $EUID -ne 0 ]]; then
  echo "[runner-setup] Root ile calistir. sudo kullan." >&2
  exit 1
fi

if [[ -z "$REPO_SLUG" || -z "$RUNNER_TOKEN" ]]; then
  echo "[runner-setup] --repo ve --token zorunlu." >&2
  usage
  exit 1
fi

if ! id -u "$RUNNER_USER" >/dev/null 2>&1; then
  useradd --create-home --shell /bin/bash "$RUNNER_USER"
fi

apt-get update -y
apt-get install -y curl tar jq

RUNNER_TGZ="actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz"
RUNNER_URL="https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/${RUNNER_TGZ}"

mkdir -p "$RUNNER_DIR"
chown -R "$RUNNER_USER":"$RUNNER_USER" "$RUNNER_DIR"

sudo -u "$RUNNER_USER" -H bash -lc "
  set -Eeuo pipefail
  cd '$RUNNER_DIR'
  if [ ! -f ./config.sh ]; then
    curl -fsSL '$RUNNER_URL' -o '$RUNNER_TGZ'
    tar xzf '$RUNNER_TGZ'
    rm -f '$RUNNER_TGZ'
  fi
"

if [[ -f "${RUNNER_DIR}/.runner" ]]; then
  sudo -u "$RUNNER_USER" -H bash -lc "cd '$RUNNER_DIR' && ./config.sh remove --token '$RUNNER_TOKEN' || true"
fi

sudo -u "$RUNNER_USER" -H bash -lc "
  set -Eeuo pipefail
  cd '$RUNNER_DIR'
  ./config.sh \
    --url 'https://github.com/${REPO_SLUG}' \
    --token '${RUNNER_TOKEN}' \
    --name '${RUNNER_NAME}' \
    --labels '${RUNNER_LABELS}' \
    --unattended \
    --replace
"

cd "$RUNNER_DIR"
./svc.sh install "$RUNNER_USER"
./svc.sh start

echo "[runner-setup] Tamamlandi."
echo "[runner-setup] Repo: ${REPO_SLUG}"
echo "[runner-setup] Runner name: ${RUNNER_NAME}"
echo "[runner-setup] Labels: ${RUNNER_LABELS}"
echo "[runner-setup] Dizin: ${RUNNER_DIR}"
