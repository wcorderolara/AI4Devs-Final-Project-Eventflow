#!/usr/bin/env bash
# Despliega el backend EventFlow en EC2 Free Tier con Docker + Caddy TLS (US-136 / ADR-DEVOPS-008).
#
# Crea (idempotente): instance role + profile (ECR read + SSM read), security group, Elastic IP, e
# instancia t2.micro (Amazon Linux 2023) cuyo user-data instala Docker, hace pull de la imagen del
# backend desde ECR, la corre con env/secretos leidos de SSM (nunca en user-data), y levanta Caddy
# como reverse proxy con HTTPS automatico (Let's Encrypt) para <elastic-ip>.sslip.io.
#
# Prerrequisitos: aws CLI + credenciales, AWS_REGION. La imagen ya debe estar en ECR (US-136 fase 1)
# y RDS + secretos en SSM (US-137).
#
# Variables (override por env):
#   INSTANCE_NAME (default eventflow-backend), INSTANCE_TYPE (default t2.micro)
#   ECR_IMAGE (default <acct>.dkr.ecr.<region>.amazonaws.com/eventflow-backend:ce93de8)
#   ADMIN_CIDR (default <IP detectada>/32) para SSH; RDS_SG (default sg de eventflow-rds-sg)
#   SSM_ENV (default demo) - ambiente cuyos secretos SSM se inyectan

set -euo pipefail
REGION="${AWS_REGION:?AWS_REGION requerido}"
INSTANCE_NAME="${INSTANCE_NAME:-eventflow-backend}"
INSTANCE_TYPE="${INSTANCE_TYPE:-t2.micro}"
SSM_ENV="${SSM_ENV:-demo}"
ROLE=EventflowEc2Role; PROFILE=EventflowEc2Profile; SG_NAME=eventflow-ec2-sg
fail(){ echo "[ec2] ERROR: $1" >&2; exit 1; }
command -v aws >/dev/null || fail "aws no instalado"
ACCOUNT="$(aws sts get-caller-identity --query Account --output text)"
ECR_IMAGE="${ECR_IMAGE:-$ACCOUNT.dkr.ecr.$REGION.amazonaws.com/eventflow-backend:ce93de8}"
ADMIN_CIDR="${ADMIN_CIDR:-$(curl -s --max-time 8 https://checkip.amazonaws.com)/32}"
VPC="$(aws ec2 describe-vpcs --filters Name=isDefault,Values=true --region $REGION --query 'Vpcs[0].VpcId' --output text)"
SCRATCH="$(mktemp -d)"

echo "[ec2] cuenta=$ACCOUNT region=$REGION imagen=$ECR_IMAGE vpc=$VPC"

# --- 1. Instance role + profile -------------------------------------------
if ! aws iam get-role --role-name $ROLE >/dev/null 2>&1; then
  printf '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"ec2.amazonaws.com"},"Action":"sts:AssumeRole"}]}' > $SCRATCH/trust.json
  aws iam create-role --role-name $ROLE --assume-role-policy-document file://$SCRATCH/trust.json >/dev/null
  echo "[ec2] rol $ROLE creado"
fi
aws iam attach-role-policy --role-name $ROLE --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly 2>/dev/null || true
aws iam attach-role-policy --role-name $ROLE --policy-arn arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore 2>/dev/null || true
printf '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":["ssm:GetParameter","ssm:GetParameters"],"Resource":"arn:aws:ssm:%s:%s:parameter/eventflow/*"},{"Effect":"Allow","Action":["kms:Decrypt"],"Resource":"*","Condition":{"StringEquals":{"kms:ViaService":"ssm.%s.amazonaws.com"}}}]}' "$REGION" "$ACCOUNT" "$REGION" > $SCRATCH/ssm.json
aws iam put-role-policy --role-name $ROLE --policy-name ssm-read-eventflow --policy-document file://$SCRATCH/ssm.json
if ! aws iam get-instance-profile --instance-profile-name $PROFILE >/dev/null 2>&1; then
  aws iam create-instance-profile --instance-profile-name $PROFILE >/dev/null
  aws iam add-role-to-instance-profile --instance-profile-name $PROFILE --role-name $ROLE
  echo "[ec2] instance profile $PROFILE creado"; sleep 10
fi

# --- 2. Security group ----------------------------------------------------
SG="$(aws ec2 describe-security-groups --region $REGION --filters Name=group-name,Values=$SG_NAME Name=vpc-id,Values=$VPC --query 'SecurityGroups[0].GroupId' --output text 2>/dev/null)"
if [ "$SG" = "None" ] || [ -z "$SG" ]; then
  SG="$(aws ec2 create-security-group --region $REGION --group-name $SG_NAME --description "EventFlow backend EC2 (ADR-DEVOPS-008)" --vpc-id $VPC --query 'GroupId' --output text)"
  aws ec2 authorize-security-group-ingress --region $REGION --group-id $SG --protocol tcp --port 80 --cidr 0.0.0.0/0 >/dev/null
  aws ec2 authorize-security-group-ingress --region $REGION --group-id $SG --protocol tcp --port 443 --cidr 0.0.0.0/0 >/dev/null
  aws ec2 authorize-security-group-ingress --region $REGION --group-id $SG --protocol tcp --port 22 --cidr "$ADMIN_CIDR" >/dev/null
  echo "[ec2] SG $SG creado (80/443 publico, 22 desde $ADMIN_CIDR)"
else echo "[ec2] SG $SG ya existe"; fi

# RDS SG: permitir 5432 desde el SG de la EC2
RDS_SG="${RDS_SG:-$(aws ec2 describe-security-groups --region $REGION --filters Name=group-name,Values=eventflow-rds-sg --query 'SecurityGroups[0].GroupId' --output text)}"
aws ec2 authorize-security-group-ingress --region $REGION --group-id "$RDS_SG" --protocol tcp --port 5432 --source-group $SG 2>/dev/null && echo "[ec2] RDS SG permite EC2 SG" || echo "[ec2] RDS ingress EC2 ya existia"

# --- 3. Elastic IP --------------------------------------------------------
EIP_ALLOC="$(aws ec2 describe-addresses --region $REGION --filters Name=tag:Name,Values=eventflow-backend --query 'Addresses[0].AllocationId' --output text 2>/dev/null)"
if [ "$EIP_ALLOC" = "None" ] || [ -z "$EIP_ALLOC" ]; then
  EIP_ALLOC="$(aws ec2 allocate-address --domain vpc --region $REGION --tag-specifications 'ResourceType=elastic-ip,Tags=[{Key=Name,Value=eventflow-backend}]' --query 'AllocationId' --output text)"
fi
EIP="$(aws ec2 describe-addresses --region $REGION --allocation-ids $EIP_ALLOC --query 'Addresses[0].PublicIp' --output text)"
HOSTNAME="${EIP//./-}.sslip.io"
echo "[ec2] EIP=$EIP  hostname=$HOSTNAME"

# --- 4. user-data (secretos leidos de SSM en boot, no aqui) ---------------
cat > $SCRATCH/user-data.sh <<UD
#!/bin/bash
set -euxo pipefail
REGION=$REGION; IMAGE="$ECR_IMAGE"; HOST="$HOSTNAME"; ENVN="$SSM_ENV"
dnf install -y docker
systemctl enable --now docker
for i in 1 2 3 4 5; do aws ecr get-login-password --region \$REGION | docker login --username AWS --password-stdin ${ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com && break || sleep 10; done
docker pull "\$IMAGE"
DB=\$(aws ssm get-parameter --name /eventflow/\$ENVN/DATABASE_URL --with-decryption --query Parameter.Value --output text --region \$REGION)
JWT=\$(aws ssm get-parameter --name /eventflow/\$ENVN/JWT_SECRET --with-decryption --query Parameter.Value --output text --region \$REGION)
SES=\$(aws ssm get-parameter --name /eventflow/\$ENVN/SESSION_SECRET --with-decryption --query Parameter.Value --output text --region \$REGION)
docker network create eventflow || true
docker rm -f backend caddy || true
docker run -d --name backend --restart always --network eventflow \
  -e NODE_ENV=development -e PORT=3000 \
  -e DATABASE_URL="\$DB" -e JWT_SECRET="\$JWT" -e SESSION_SECRET="\$SES" \
  -e CORS_ORIGINS="https://main.d2jh1ql4whmeue.amplifyapp.com,https://staging.d2jh1ql4whmeue.amplifyapp.com" \
  -e CORS_CREDENTIALS=true -e SESSION_COOKIE_SAMESITE=none -e SESSION_COOKIE_SECURE=true \
  -e LLM_PROVIDER=mock -e CAPTCHA_PROVIDER=mock \
  "\$IMAGE"
mkdir -p /etc/caddy
printf '%s {\n  reverse_proxy backend:3000\n}\n' "\$HOST" > /etc/caddy/Caddyfile
docker run -d --name caddy --restart always --network eventflow -p 80:80 -p 443:443 \
  -v /etc/caddy/Caddyfile:/etc/caddy/Caddyfile -v caddy_data:/data -v caddy_config:/config caddy:2
UD

# --- 5. Lanzar instancia (idempotente por tag) ----------------------------
IID="$(aws ec2 describe-instances --region $REGION --filters Name=tag:Name,Values=$INSTANCE_NAME "Name=instance-state-name,Values=pending,running" --query 'Reservations[0].Instances[0].InstanceId' --output text 2>/dev/null)"
if [ "$IID" = "None" ] || [ -z "$IID" ]; then
  AMI="$(aws ssm get-parameter --name /aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64 --region $REGION --query Parameter.Value --output text)"
  IID="$(aws ec2 run-instances --region $REGION --image-id "$AMI" --instance-type "$INSTANCE_TYPE" \
    --iam-instance-profile Name=$PROFILE --security-group-ids $SG \
    --user-data file://$SCRATCH/user-data.sh \
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$INSTANCE_NAME}]" \
    --query 'Instances[0].InstanceId' --output text)"
  echo "[ec2] instancia $IID lanzada"
else echo "[ec2] instancia $IID ya existe"; fi

aws ec2 wait instance-running --instance-ids $IID --region $REGION
aws ec2 associate-address --region $REGION --instance-id $IID --allocation-id $EIP_ALLOC >/dev/null
echo "[ec2] EIP asociada. Backend (tras ~2-4 min de boot + cert TLS):"
echo "  https://$HOSTNAME/health"
echo "  API base para Amplify: https://$HOSTNAME/api/v1"
