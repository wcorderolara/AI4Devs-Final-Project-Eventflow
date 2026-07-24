# Runbook — Backend en EC2 Free Tier (Docker + Caddy TLS) — ADR-DEVOPS-008

> Despliegue **temporal** del backend en EC2 mientras la cuenta AWS no tenga App Runner habilitado
> (plan Free Tier — ver ADR-DEVOPS-008, supersedes ADR-DEVOPS-003). Misma imagen de ECR (US-136).
> Artefacto versionado: [`infra/ec2/provision-ec2.sh`](../../infra/ec2/provision-ec2.sh).

## Estado actual (2026-07-24)

| Dato | Valor |
| --- | --- |
| Instancia | `i-0a5a6fdd3f1f41799` — EC2 `t3.micro` (Free Tier), Amazon Linux 2023, us-east-1 |
| Elastic IP | `18.235.214.199` (estable) |
| URL backend | **https://18-235-214-199.sslip.io** (TLS Let's Encrypt válido) |
| API base | `https://18-235-214-199.sslip.io/api/v1` (configurada en Amplify main→demo) |
| Health | `/health` 200 · `/health/ready` 200 (`postgres:ok`, `aiProvider:mock`) |
| DB | RDS `eventflow_demo` (US-137) con seed cargado |

## Arquitectura

```
Navegador (HTTPS) ──► Amplify (frontend) ──► https://<eip>.sslip.io (Caddy TLS)
                                                   │ reverse_proxy
                                                   ▼
                                          Docker: backend:3000 (ECR image)
                                                   │ 5432 (SG restringido)
                                                   ▼
                                          RDS PostgreSQL (US-137)
```

- **Caddy** obtiene certificado Let's Encrypt automático para `<eip>.sslip.io` (sslip.io resuelve el
  hostname a la IP; no requiere dominio propio). HTTPS válido → cookies `SameSite=None; Secure` OK.
- **Secretos** (`DATABASE_URL`, `JWT_SECRET`, `SESSION_SECRET`) se leen de **SSM** en el arranque vía
  el **instance role** `EventflowEc2Role`; nunca en el user-data ni en la imagen (SEC-02/SEC-03).
- **Security groups:** EC2 SG `sg-0bb160c6581409e12` (80/443 público, 22 solo operador); RDS SG
  permite 5432 solo desde el EC2 SG.

## Provisión

```bash
AWS_REGION=us-east-1 INSTANCE_TYPE=t3.micro bash infra/ec2/provision-ec2.sh
```
Idempotente: reutiliza rol, SG, EIP e instancia existentes. Free Tier: usar `t3.micro` (x86, la
imagen es `linux/amd64`); `t2.micro` no es elegible en esta cuenta.

## Deviaciones (ADR-DEVOPS-008)

- **`NODE_ENV=development`** en el contenedor: en `production` el backend prohíbe `CAPTCHA_PROVIDER=mock`
  y AI mock (`config/env.ts`), y no hay llaves reales de captcha/OpenAI. Para la demo (login/registro
  con captcha mock + IA mock) se corre en `development` con cookies `Secure`/`SameSite=None` explícitas.
  Al tener llaves reales, cambiar a `production`.
- **Sin autoscaling/self-healing** (una instancia): App Runner los daba nativos. `--restart always`
  reinicia los contenedores; caída de la instancia = restart manual / migrar a App Runner al upgrade.
- **HTTPS vía sslip.io** (DNS de terceros): aceptable para demo; con dominio propio usar Route 53 + ACM.

## Redeploy (nueva imagen)

Tras `docker build`+push a ECR (misma etiqueta o nueva):
```bash
# vía SSM Run Command (la instancia tiene AmazonSSMManagedInstanceCore):
aws ssm send-command --region us-east-1 --instance-ids i-0a5a6fdd3f1f41799 \
  --document-name AWS-RunShellScript \
  --parameters 'commands=["aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 357919579117.dkr.ecr.us-east-1.amazonaws.com","docker pull 357919579117.dkr.ecr.us-east-1.amazonaws.com/eventflow-backend:ce93de8","docker rm -f backend","<re-run docker run ...>"]'
```
O `git revert` + re-ejecutar el pipeline (`.github/workflows/deploy-backend.yml`, adaptar el paso de
deploy a SSM Run Command en lugar de App Runner cuando se consolide).

## Smoke

```bash
HOST=18-235-214-199.sslip.io
curl -fsS https://$HOST/health | jq .
curl -fsS https://$HOST/health/ready | jq .   # postgres:ok
```

## Rollback / teardown

- **Rollback de imagen:** re-pull de una etiqueta previa + restart (SSM Run Command).
- **Teardown:** `docker rm -f backend caddy` en la instancia; `aws ec2 terminate-instances`; liberar EIP
  (`aws ec2 release-address`) para no incurrir cargos por EIP no asociada.

## Migración de vuelta a App Runner (futuro)

Al habilitar App Runner (upgrade del plan de cuenta): re-ejecutar
[`infra/apprunner/provision-apprunner.sh`](../../infra/apprunner/provision-apprunner.sh) fase 2 (usa
la misma imagen ECR + secretos SSM + VPC connector con el SG del backend), actualizar
`NEXT_PUBLIC_API_BASE_URL` a la URL de App Runner, y retirar la instancia EC2. ADR-DEVOPS-003 vuelve
a `Accepted`.
