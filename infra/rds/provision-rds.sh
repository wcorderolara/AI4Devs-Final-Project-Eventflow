#!/usr/bin/env bash
# Provisiona Amazon RDS for PostgreSQL para EventFlow (US-137 / PB-P2-023 - Doc 21 §11, ADR-DB-001).
#
# Crea (idempotente): security group restringido, instancia RDS Single-AZ db.t4g.micro gp3 20GB
# con backups automaticos (7 dias), y guarda DATABASE_URL de cada ambiente en SSM Parameter Store
# (SecureString). NO imprime la contrasena ni la DATABASE_URL (SEC-03).
#
# Postura de red (decision usuario 2026-07-24): publicly-accessible con SG restringido a ADMIN_CIDR
# (IP del operador) para migraciones + (opcional) BACKEND_SG para App Runner. Endurecimiento futuro:
# RDS privada + VPC connector (SEC-04 estricto).
#
# Prerrequisitos (fail-fast): aws CLI + credenciales, AWS_REGION.
# Variables (override por env):
#   DB_INSTANCE_ID   (default: eventflow-db)
#   DB_CLASS         (default: db.t4g.micro)
#   DB_STORAGE_GB    (default: 20)
#   PG_VERSION       (default: 16)
#   MASTER_USER      (default: eventflow_admin)
#   DB_PASSWORD      (REQUERIDO; no se imprime. Generar con: openssl rand -hex 24)
#   ADMIN_CIDR       (default: <IP publica detectada>/32) - fuente permitida en el SG
#   BACKEND_SG       (opcional) - SG del backend (App Runner) a permitir tambien
#   DEMO_DB          (default: eventflow_demo)
#   QA_DB            (default: eventflow_qa)
#
# Uso:
#   AWS_REGION=us-east-1 DB_PASSWORD="$(openssl rand -hex 24)" bash infra/rds/provision-rds.sh
#   (guarda la password solo en SSM; para recuperarla: aws ssm get-parameter --with-decryption ...)

set -euo pipefail

DB_INSTANCE_ID="${DB_INSTANCE_ID:-eventflow-db}"
DB_CLASS="${DB_CLASS:-db.t4g.micro}"
DB_STORAGE_GB="${DB_STORAGE_GB:-20}"
PG_VERSION="${PG_VERSION:-16}"
MASTER_USER="${MASTER_USER:-eventflow_admin}"
DEMO_DB="${DEMO_DB:-eventflow_demo}"
QA_DB="${QA_DB:-eventflow_qa}"
# Retención de backups (dias). Objetivo AC-02 = 7; algunas cuentas Free Tier limitan el maximo,
# en cuyo caso se usa un valor menor (>=1 mantiene backups habilitados) como deviacion documentada.
BACKUP_RETENTION="${BACKUP_RETENTION:-7}"
SG_NAME="eventflow-rds-sg"

fail() { echo "[provision-rds] ERROR: $1" >&2; exit 1; }

command -v aws >/dev/null 2>&1 || fail "aws CLI no instalado."
[ -n "${AWS_REGION:-}" ] || fail "AWS_REGION no exportada."
[ -n "${DB_PASSWORD:-}" ] || fail "DB_PASSWORD requerido (openssl rand -hex 24). No se imprimira."
aws sts get-caller-identity >/dev/null 2>&1 || fail "Credenciales AWS invalidas."

ADMIN_CIDR="${ADMIN_CIDR:-$(curl -s --max-time 8 https://checkip.amazonaws.com)/32}"
VPC_ID="$(aws ec2 describe-vpcs --filters Name=isDefault,Values=true --region "$AWS_REGION" \
  --query 'Vpcs[0].VpcId' --output text)"
echo "[provision-rds] VPC=$VPC_ID  ADMIN_CIDR=$ADMIN_CIDR  instancia=$DB_INSTANCE_ID clase=$DB_CLASS"

# --- 1. Security group restringido (AC-01/VR-01/SEC-04) ---------------------
SG_ID="$(aws ec2 describe-security-groups --region "$AWS_REGION" \
  --filters Name=group-name,Values="$SG_NAME" Name=vpc-id,Values="$VPC_ID" \
  --query 'SecurityGroups[0].GroupId' --output text 2>/dev/null || true)"
if [ -z "$SG_ID" ] || [ "$SG_ID" = "None" ]; then
  echo "[provision-rds] Creando SG $SG_NAME..."
  SG_ID="$(aws ec2 create-security-group --region "$AWS_REGION" \
    --group-name "$SG_NAME" --description "EventFlow RDS - acceso restringido (US-137)" \
    --vpc-id "$VPC_ID" --query 'GroupId' --output text)"
else
  echo "[provision-rds] SG $SG_NAME ya existe ($SG_ID)."
fi
# Ingress 5432 desde ADMIN_CIDR (idempotente: ignora duplicado).
aws ec2 authorize-security-group-ingress --region "$AWS_REGION" --group-id "$SG_ID" \
  --protocol tcp --port 5432 --cidr "$ADMIN_CIDR" 2>/dev/null \
  && echo "[provision-rds] Ingress 5432 desde $ADMIN_CIDR agregado." \
  || echo "[provision-rds] Ingress desde $ADMIN_CIDR ya existia."
# Ingress desde el SG del backend (App Runner) si se provee.
if [ -n "${BACKEND_SG:-}" ]; then
  aws ec2 authorize-security-group-ingress --region "$AWS_REGION" --group-id "$SG_ID" \
    --protocol tcp --port 5432 --source-group "$BACKEND_SG" 2>/dev/null \
    && echo "[provision-rds] Ingress 5432 desde backend SG $BACKEND_SG agregado." \
    || echo "[provision-rds] Ingress desde backend SG ya existia."
fi

# --- 2. Instancia RDS (AC-01/AC-02) -----------------------------------------
if aws rds describe-db-instances --db-instance-identifier "$DB_INSTANCE_ID" --region "$AWS_REGION" >/dev/null 2>&1; then
  echo "[provision-rds] Instancia $DB_INSTANCE_ID ya existe (reutilizando)."
else
  echo "[provision-rds] Creando instancia RDS $DB_INSTANCE_ID (Single-AZ, backups 7d)..."
  aws rds create-db-instance --region "$AWS_REGION" \
    --db-instance-identifier "$DB_INSTANCE_ID" \
    --db-instance-class "$DB_CLASS" \
    --engine postgres --engine-version "$PG_VERSION" \
    --allocated-storage "$DB_STORAGE_GB" --storage-type gp3 \
    --master-username "$MASTER_USER" --master-user-password "$DB_PASSWORD" \
    --db-name "$DEMO_DB" \
    --vpc-security-group-ids "$SG_ID" \
    --backup-retention-period "$BACKUP_RETENTION" \
    --no-multi-az --publicly-accessible \
    --copy-tags-to-snapshot \
    --tags Key=project,Value=eventflow Key=story,Value=US-137 >/dev/null
fi

echo "[provision-rds] Esperando a que la instancia quede disponible (puede tardar ~10 min)..."
aws rds wait db-instance-available --db-instance-identifier "$DB_INSTANCE_ID" --region "$AWS_REGION"

ENDPOINT="$(aws rds describe-db-instances --db-instance-identifier "$DB_INSTANCE_ID" --region "$AWS_REGION" \
  --query 'DBInstances[0].Endpoint.Address' --output text)"
echo "[provision-rds] Instancia disponible. Endpoint=$ENDPOINT"

# --- 3. DATABASE_URL en SSM Parameter Store (SecureString) (AC-03/SEC-02) ----
# Nunca se imprime el valor. Un parametro por ambiente (misma instancia, DBs distintas).
put_ssm() {
  local env_name="$1" db_name="$2"
  local url="postgresql://${MASTER_USER}:${DB_PASSWORD}@${ENDPOINT}:5432/${db_name}?schema=public&connection_limit=5"
  aws ssm put-parameter --region "$AWS_REGION" \
    --name "/eventflow/${env_name}/DATABASE_URL" --type SecureString \
    --value "$url" --overwrite >/dev/null
  echo "[provision-rds] SSM /eventflow/${env_name}/DATABASE_URL guardado (SecureString, valor oculto)."
}
put_ssm demo "$DEMO_DB"
put_ssm qa "$QA_DB"

echo "[provision-rds] OK. Proximos pasos (fuera de este script):"
echo "  1. Crear la 2a base: psql \$DEMO_URL -c 'CREATE DATABASE ${QA_DB}'  (via docker postgres:16)"
echo "  2. Migraciones: DATABASE_URL=<ssm> npx prisma migrate deploy  (por cada ambiente)"
echo "  3. Recuperar URL sin imprimir: aws ssm get-parameter --name /eventflow/demo/DATABASE_URL --with-decryption"
echo "  4. Actualizar NEXT_PUBLIC_API_BASE_URL / desbloquear US-136 (App Runner fase 2 con BACKEND_SG)."
