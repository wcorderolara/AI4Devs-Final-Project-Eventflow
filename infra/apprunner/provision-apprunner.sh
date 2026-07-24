#!/usr/bin/env bash
# Aprovisiona el backend EventFlow en AWS App Runner (US-136 / PB-P2-022 - Doc 21 §10).
#
# Fase 1 (siempre ejecutable): repo ECR + build & push de la imagen Docker multi-stage
#   (backend/Dockerfile, PB-P0-016). La imagen NO contiene secretos (VR-01/SEC-02).
# Fase 2 (guardada): crea/actualiza el servicio App Runner desde la imagen ECR, con health check
#   /health, escalamiento minimo y env/secretos. SOLO corre si DATABASE_URL esta seteada, porque
#   el backend hace fail-fast + prisma.connect() al boot y sin una PostgreSQL accesible (RDS,
#   PB-P2-023) el contenedor crashea (BLK-001). Sin DATABASE_URL, la fase 2 se omite con aviso.
#
# La fuente de verdad del build de la imagen es backend/Dockerfile (no se define aqui).
# Solo variables NEXT_PUBLIC no aplican aqui (esto es backend). Secretos via Secrets Manager/SSM.
#
# Prerrequisitos (fail-fast):
#   - aws CLI v2 + credenciales validas; docker; AWS_REGION.
# Variables de entrada (override por env):
#   ECR_REPO        (default: eventflow-backend)
#   IMAGE_TAG       (default: latest)
#   SERVICE_NAME    (default: eventflow-backend)
#   CORS_ORIGINS    (default: dominios Amplify de US-135)
#   DATABASE_URL    (secreto; si falta -> fase 2 omitida. RDS = PB-P2-023)
#   JWT_SECRET, SESSION_SECRET (secretos; requeridos por el backend en fase 2)
#   ACCESS_ROLE_ARN   (rol IAM que permite a App Runner leer de ECR; requerido en fase 2)
#   INSTANCE_ROLE_ARN (rol IAM de instancia para leer Secrets Manager; opcional)
#
# Uso (fase 1 - ECR + imagen, ahora):
#   AWS_REGION=us-east-1 bash infra/apprunner/provision-apprunner.sh
# Uso (fase 1 + 2 - cuando exista RDS PB-P2-023):
#   AWS_REGION=us-east-1 DATABASE_URL=postgres://... JWT_SECRET=... SESSION_SECRET=... \
#     ACCESS_ROLE_ARN=arn:aws:iam::<acct>:role/AppRunnerECRAccessRole \
#     bash infra/apprunner/provision-apprunner.sh

set -euo pipefail

ECR_REPO="${ECR_REPO:-eventflow-backend}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
SERVICE_NAME="${SERVICE_NAME:-eventflow-backend}"
# Dominios Amplify del frontend (US-135) -> allowlist CORS (VR-04). Sin wildcard.
CORS_ORIGINS="${CORS_ORIGINS:-https://main.d2jh1ql4whmeue.amplifyapp.com,https://staging.d2jh1ql4whmeue.amplifyapp.com}"

fail() { echo "[provision-apprunner] ERROR: $1" >&2; exit 1; }

command -v aws >/dev/null 2>&1 || fail "aws CLI no instalado."
command -v docker >/dev/null 2>&1 || fail "docker no instalado."
[ -n "${AWS_REGION:-}" ] || fail "AWS_REGION no exportada."
aws sts get-caller-identity >/dev/null 2>&1 || fail "Credenciales AWS invalidas."

ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
ECR_URI="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}"
IMAGE="${ECR_URI}:${IMAGE_TAG}"
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

echo "[provision-apprunner] Cuenta=$ACCOUNT_ID Region=$AWS_REGION Imagen=$IMAGE"

# ==========================================================================
# FASE 1 - ECR repo + build & push (ejecutable ahora)
# ==========================================================================

# 1.a Repo ECR (idempotente) con scan on push.
if ! aws ecr describe-repositories --repository-names "$ECR_REPO" --region "$AWS_REGION" >/dev/null 2>&1; then
  echo "[provision-apprunner] Creando repo ECR $ECR_REPO..."
  aws ecr create-repository --repository-name "$ECR_REPO" --region "$AWS_REGION" \
    --image-scanning-configuration scanOnPush=true \
    --image-tag-mutability MUTABLE >/dev/null
else
  echo "[provision-apprunner] Repo ECR $ECR_REPO ya existe (reutilizando)."
fi

# 1.b Login de docker a ECR.
echo "[provision-apprunner] docker login a ECR..."
aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin "${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

# 1.c Build (contexto backend/, plataforma linux/amd64 para App Runner) + push.
echo "[provision-apprunner] docker build (linux/amd64)..."
docker build --platform linux/amd64 -t "$IMAGE" "$REPO_ROOT/backend"
echo "[provision-apprunner] docker push $IMAGE..."
docker push "$IMAGE"
echo "[provision-apprunner] OK - imagen publicada en ECR: $IMAGE"

# ==========================================================================
# FASE 2 - Servicio App Runner (guardada tras RDS PB-P2-023 - BLK-001)
# ==========================================================================

if [ -z "${DATABASE_URL:-}" ]; then
  cat >&2 <<EOF
[provision-apprunner] Fase 2 (App Runner) OMITIDA.
  Razon: DATABASE_URL no seteada. El backend hace fail-fast + prisma.connect() al boot; sin una
  PostgreSQL accesible (RDS = PB-P2-023) el contenedor crashea y App Runner no logra un deploy sano.
  Cuando exista RDS, re-ejecuta con DATABASE_URL / JWT_SECRET / SESSION_SECRET / ACCESS_ROLE_ARN.
  Imagen ya disponible en ECR: $IMAGE
EOF
  exit 0
fi

[ -n "${JWT_SECRET:-}" ]     || fail "JWT_SECRET requerido para la fase 2 (min 32 chars)."
[ -n "${SESSION_SECRET:-}" ] || fail "SESSION_SECRET requerido para la fase 2 (min 32 chars)."
[ -n "${ACCESS_ROLE_ARN:-}" ] || fail "ACCESS_ROLE_ARN requerido (rol IAM de acceso de App Runner a ECR)."

# Env de runtime (no secretos). Cookies cross-domain Amplify <-> App Runner (Doc 21 §10.6):
# SameSite=None + Secure + CORS_CREDENTIALS=true + CORS_ORIGINS allowlist (validado por env.ts).
RUNTIME_ENV=$(cat <<JSON
{
  "NODE_ENV": "production",
  "PORT": "3000",
  "CORS_ORIGINS": "${CORS_ORIGINS}",
  "CORS_CREDENTIALS": "true",
  "SESSION_COOKIE_SAMESITE": "none",
  "SESSION_COOKIE_SECURE": "true",
  "DATABASE_URL": "${DATABASE_URL}",
  "JWT_SECRET": "${JWT_SECRET}",
  "SESSION_SECRET": "${SESSION_SECRET}"
}
JSON
)
# Nota: en produccion real, DATABASE_URL/JWT_SECRET/SESSION_SECRET deben ir por RuntimeEnvironmentSecrets
# (Secrets Manager, PB-P2-024) en vez de RuntimeEnvironmentVariables. Aqui se pasan como env para el
# arranque inicial; migrar a secretos cuando PB-P2-024 este disponible (SEC-02).

SOURCE_CONFIG=$(cat <<JSON
{
  "ImageRepository": {
    "ImageIdentifier": "${IMAGE}",
    "ImageRepositoryType": "ECR",
    "ImageConfiguration": {
      "Port": "3000",
      "RuntimeEnvironmentVariables": ${RUNTIME_ENV}
    }
  },
  "AutoDeploymentsEnabled": true,
  "AuthenticationConfiguration": { "AccessRoleArn": "${ACCESS_ROLE_ARN}" }
}
JSON
)

# Health check: /health (liveness sin BD). App Runner no enruta si falla (EC-01/VR-02).
HEALTH_CONFIG='{"Protocol":"HTTP","Path":"/health","Interval":10,"Timeout":5,"HealthyThreshold":1,"UnhealthyThreshold":5}'
# Escalamiento modesto (min 1 / max 3) + CPU/memoria modestas.
INSTANCE_CONFIG="{\"Cpu\":\"1024\",\"Memory\":\"2048\"$([ -n "${INSTANCE_ROLE_ARN:-}" ] && echo ",\"InstanceRoleArn\":\"${INSTANCE_ROLE_ARN}\"")}"

SERVICE_ARN="$(aws apprunner list-services --region "$AWS_REGION" \
  --query "ServiceSummaryList[?ServiceName=='${SERVICE_NAME}'].ServiceArn | [0]" --output text 2>/dev/null || true)"

if [ -z "$SERVICE_ARN" ] || [ "$SERVICE_ARN" = "None" ]; then
  echo "[provision-apprunner] Creando servicio App Runner $SERVICE_NAME..."
  aws apprunner create-service --region "$AWS_REGION" \
    --service-name "$SERVICE_NAME" \
    --source-configuration "$SOURCE_CONFIG" \
    --health-check-configuration "$HEALTH_CONFIG" \
    --instance-configuration "$INSTANCE_CONFIG" >/dev/null
else
  echo "[provision-apprunner] Actualizando servicio App Runner existente ($SERVICE_ARN)..."
  aws apprunner update-service --region "$AWS_REGION" --service-arn "$SERVICE_ARN" \
    --source-configuration "$SOURCE_CONFIG" \
    --health-check-configuration "$HEALTH_CONFIG" \
    --instance-configuration "$INSTANCE_CONFIG" >/dev/null
fi

echo "[provision-apprunner] OK - servicio App Runner solicitado. URL (cuando quede RUNNING):"
aws apprunner list-services --region "$AWS_REGION" \
  --query "ServiceSummaryList[?ServiceName=='${SERVICE_NAME}'].ServiceUrl | [0]" --output text
echo "[provision-apprunner] Recuerda: actualiza NEXT_PUBLIC_API_BASE_URL en Amplify (US-135) con esta URL + /api/v1."
