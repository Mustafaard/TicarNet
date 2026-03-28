#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${ENV_FILE:-${PROJECT_ROOT}/server/.env}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"
DEPLOY_RUN_LINT="${DEPLOY_RUN_LINT:-1}"
DEPLOY_FORCE_CLEAN="${DEPLOY_FORCE_CLEAN:-1}"

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

  trim_quotes "${line#*=}"
}

if [[ -z "${PUBLIC_BASE_URL:-}" ]]; then
  PUBLIC_BASE_URL="$(read_env_value CLIENT_URL || true)"
  export PUBLIC_BASE_URL
fi

ARGS=(--branch "$DEPLOY_BRANCH")

if [[ "$DEPLOY_RUN_LINT" == "1" ]]; then
  ARGS+=(--run-lint)
fi

if [[ "$DEPLOY_FORCE_CLEAN" == "1" ]]; then
  ARGS+=(--force-clean)
fi

ARGS+=("$@")

cd "$PROJECT_ROOT"
exec bash "${SCRIPT_DIR}/vps-deploy.sh" "${ARGS[@]}"
