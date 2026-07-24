#!/usr/bin/env bash
# Aprovisiona AWS Amplify Hosting para el frontend Next.js (US-135 / PB-P2-021 · Doc 21 §9).
#
# Ejecuta vía AWS CLI, de forma idempotente, los pasos NO versionables que en la consola serían
# manuales: crear la app (monorepo appRoot=web, plataforma WEB_COMPUTE para SSR del App Router),
# conectar el repo GitHub, crear las ramas mapeadas (main->Demo, staging->QA) con sus variables
# públicas por ambiente, y disparar el primer build.
#
# La fuente de verdad del BUILD es `amplify.yml` en la raíz del repo (no se define aquí).
# Sólo variables NEXT_PUBLIC_* (Doc 21 §9.3/§9.8). Ninguna variable sensible se setea aquí.
#
# Prerrequisitos (fail-fast más abajo):
#   - aws CLI v2 instalado y credenciales válidas (AWS_PROFILE o AWS_ACCESS_KEY_*).
#   - AWS_REGION exportada (p. ej. us-east-1).
#   - GITHUB_ACCESS_TOKEN: PAT de GitHub con scope `repo` para que Amplify conecte el repositorio.
#   - REPO_URL: URL https del repo (https://github.com/<org>/<repo>).
#
# Variables de entrada (override por env):
#   APP_NAME               (default: eventflow-frontend)
#   REPO_URL               (requerido)
#   GITHUB_ACCESS_TOKEN    (requerido)
#   AWS_REGION             (requerido)
#   API_BASE_URL_DEMO      URL App Runner Demo  -> NEXT_PUBLIC_API_BASE_URL (PB-P2-022; placeholder si falta)
#   API_BASE_URL_QA        URL App Runner QA    -> NEXT_PUBLIC_API_BASE_URL (PB-P2-022; placeholder si falta)
#   CAPTCHA_SITE_KEY_DEMO  site key real de captcha en Demo (opcional; provider mock si vacío)
#
# Uso:
#   AWS_REGION=us-east-1 REPO_URL=https://github.com/<org>/<repo> GITHUB_ACCESS_TOKEN=ghp_xxx \
#     bash infra/amplify/provision-amplify.sh
#
# Rollback: ver docs/runbooks/deploy-frontend-amplify.md §7 (redeploy build previo o git revert).

set -euo pipefail

APP_NAME="${APP_NAME:-eventflow-frontend}"
MONOREPO_APP_ROOT="web"
PLATFORM="WEB_COMPUTE" # Next.js App Router con SSR/Middleware (Doc 21 §9.6)

# --- Prerrequisitos ---------------------------------------------------------
fail() { echo "[provision-amplify] ❌ $1" >&2; exit 1; }

command -v aws >/dev/null 2>&1 || fail "aws CLI no instalado. Instala AWS CLI v2."
[ -n "${AWS_REGION:-}" ] || fail "AWS_REGION no exportada (p. ej. export AWS_REGION=us-east-1)."
[ -n "${REPO_URL:-}" ] || fail "REPO_URL requerido (https://github.com/<org>/<repo>)."
[ -n "${GITHUB_ACCESS_TOKEN:-}" ] || fail "GITHUB_ACCESS_TOKEN requerido (PAT con scope repo)."
aws sts get-caller-identity >/dev/null 2>&1 || fail "Credenciales AWS inválidas o ausentes."

# Placeholders si las URLs del backend (PB-P2-022) aún no existen (VR-04: forma válida).
API_BASE_URL_DEMO="${API_BASE_URL_DEMO:-https://backend-demo.PLACEHOLDER.example.com/api/v1}"
API_BASE_URL_QA="${API_BASE_URL_QA:-https://backend-qa.PLACEHOLDER.example.com/api/v1}"
CAPTCHA_SITE_KEY_DEMO="${CAPTCHA_SITE_KEY_DEMO:-}"

echo "[provision-amplify] Región=$AWS_REGION App=$APP_NAME appRoot=$MONOREPO_APP_ROOT plataforma=$PLATFORM"

# --- 1. Crear o reutilizar la app (idempotente por nombre) ------------------
APP_ID="$(aws amplify list-apps --region "$AWS_REGION" \
  --query "apps[?name=='${APP_NAME}'].appId | [0]" --output text 2>/dev/null || true)"

if [ -z "$APP_ID" ] || [ "$APP_ID" = "None" ]; then
  echo "[provision-amplify] Creando app $APP_NAME..."
  APP_ID="$(aws amplify create-app \
    --name "$APP_NAME" \
    --region "$AWS_REGION" \
    --repository "$REPO_URL" \
    --access-token "$GITHUB_ACCESS_TOKEN" \
    --platform "$PLATFORM" \
    --environment-variables "AMPLIFY_MONOREPO_APP_ROOT=${MONOREPO_APP_ROOT}" \
    --query 'app.appId' --output text)"
else
  echo "[provision-amplify] App ya existe: $APP_ID (reutilizando)."
fi
echo "[provision-amplify] APP_ID=$APP_ID"

# --- 2. Crear/actualizar ramas mapeadas con env vars públicas ---------------
# main -> Demo ; staging -> QA (rama de QA = `staging`, decisión Tech Lead).
upsert_branch() {
  local branch="$1" app_env="$2" api_base="$3" captcha_key="$4"
  local envvars="NEXT_PUBLIC_APP_ENV=${app_env},NEXT_PUBLIC_API_BASE_URL=${api_base}"
  if [ -n "$captcha_key" ]; then
    envvars="${envvars},NEXT_PUBLIC_CAPTCHA_PROVIDER=recaptcha,NEXT_PUBLIC_CAPTCHA_SITE_KEY=${captcha_key}"
  else
    envvars="${envvars},NEXT_PUBLIC_CAPTCHA_PROVIDER=mock"
  fi
  if aws amplify get-branch --app-id "$APP_ID" --branch-name "$branch" --region "$AWS_REGION" >/dev/null 2>&1; then
    echo "[provision-amplify] Actualizando rama $branch ($app_env)..."
    aws amplify update-branch --app-id "$APP_ID" --branch-name "$branch" --region "$AWS_REGION" \
      --enable-auto-build --environment-variables "$envvars" >/dev/null
  else
    echo "[provision-amplify] Creando rama $branch ($app_env)..."
    aws amplify create-branch --app-id "$APP_ID" --branch-name "$branch" --region "$AWS_REGION" \
      --enable-auto-build --environment-variables "$envvars" >/dev/null
  fi
}

upsert_branch "main"    "demo" "$API_BASE_URL_DEMO" "$CAPTCHA_SITE_KEY_DEMO"
upsert_branch "staging" "qa"   "$API_BASE_URL_QA"   ""

# --- 3. Disparar el primer build por rama -----------------------------------
for branch in main staging; do
  echo "[provision-amplify] Disparando build de $branch..."
  aws amplify start-job --app-id "$APP_ID" --branch-name "$branch" \
    --job-type RELEASE --region "$AWS_REGION" >/dev/null || \
    echo "[provision-amplify] ⚠ No se pudo disparar build de $branch (¿rama sin commits en remoto?)."
done

echo "[provision-amplify] ✓ Listo. URLs:"
echo "  Demo (main):    https://main.${APP_ID}.amplifyapp.com"
echo "  QA   (staging): https://staging.${APP_ID}.amplifyapp.com"
echo "[provision-amplify] Recuerda: actualiza NEXT_PUBLIC_API_BASE_URL con las URLs reales de App Runner (PB-P2-022)."
