# Runbook — Secretos del backend (AWS SSM Parameter Store) — US-138 / PB-P2-024

> Gestión de los **secretos del backend** de EventFlow: dónde viven, cómo se leen en runtime, el
> IAM de mínimo alcance que los protege y el **procedimiento de rotación manual** (MVP).
> Trazabilidad: US-138 (PB-P2-024), Doc 21 §14, Doc 19 · ADR-SEC-001, ADR-DEVOPS-008.

## Estado actual (2026-07-24)

| Dato | Valor |
| --- | --- |
| Store de secretos | **AWS SSM Parameter Store** — SecureString cifrado con KMS (`alias/aws/ssm`) |
| Cuenta / región | `357919579117` · `us-east-1` |
| Prefijo | `/eventflow/<env>/<NOMBRE>` (`env` ∈ `demo`, `qa`) |
| Consumidor | Backend en **EC2** (ADR-DEVOPS-008) — instance role `EventflowEc2Role` |
| Artefacto de provisión | [`infra/ec2/provision-ec2.sh`](../../infra/ec2/provision-ec2.sh), [`infra/rds/provision-rds.sh`](../../infra/rds/provision-rds.sh) |

## 1. Decisión de store — Secrets Manager vs SSM (AC-01)

Doc 21 §5.4 y §14 definen el set aprobado como **"AWS Secrets Manager / SSM Parameter Store"**. Para
el MVP Free Tier (ADR-DEVOPS-008, que supersede App Runner por EC2) se usa **SSM Parameter Store**
`SecureString`: cubre el mismo intent (secreto gestionado fuera del repo, cifrado con KMS, leído en
runtime con IAM de mínimo alcance) sin costo adicional. Migrar a Secrets Manager es reversible y no
requiere cambios de código (misma imagen; sólo cambia la fuente de lectura en `user-data`).

**Ningún secreto vive en el repositorio, la imagen Docker ni en `user-data`** (P-04, SEC-02): la
instancia los lee de SSM en el arranque vía el instance role.

## 2. Inventario de secretos y reconciliación de naming (AC-01)

La US-138 nombra los secretos de forma abstracta (Doc 21 §14.2). El **contrato real** del backend
(`backend/src/config/env.ts`, validado con Zod) es la fuente de verdad operativa. Reconciliación:

| Nombre canónico (US-138 / Doc 21 §14.2) | Var real en backend (`env.ts`) | En SSM (`/eventflow/<env>/…`) | Requerido en runtime | Notas |
| --- | --- | --- | --- | --- |
| `DATABASE_URL` | `DATABASE_URL` | `DATABASE_URL` | **Sí** | RDS (US-137). SecureString. |
| `SESSION_SECRET` | `SESSION_SECRET` (min 32) | `SESSION_SECRET` | **Sí** | Firma la cookie de sesión HTTP-only (ADR-SEC-002). |
| `COOKIE_SECRET` | *(no existe var separada)* | — | — | La firma de la cookie usa `SESSION_SECRET`; no hay `COOKIE_SECRET` independiente. |
| — | `JWT_SECRET` (min 32) | `JWT_SECRET` | **Sí** | Secreto real adicional no listado en la US; requerido al arrancar. |
| `CAPTCHA_SECRET_KEY` | `RECAPTCHA_SECRET_KEY` / `HCAPTCHA_SECRET_KEY` | *(no en QA/Demo)* | Condicional | Requerido sólo si `CAPTCHA_PROVIDER=recaptcha\|hcaptcha`. En QA/Demo `CAPTCHA_PROVIDER=mock`. |
| `OPENAI_API_KEY` | `OPENAI_API_KEY` | *(no en QA/Demo)* | Condicional | Requerido sólo si `LLM_PROVIDER=openai`. En QA/Demo `LLM_PROVIDER=mock`. |

> Los secretos **condicionales** no se aprovisionan en SSM para QA/Demo porque el entorno usa
> proveedores `mock` (Doc 21 §14.4). Si un entorno activa un proveedor real, se añade su secreto a
> SSM con el mismo procedimiento (§4) antes de cambiar el `CAPTCHA_PROVIDER` / `LLM_PROVIDER`.

Variables **no secretas** (config) viven en el env del contenedor / Amplify, **no** en SSM:
`NODE_ENV`, `PORT`, `CORS_ORIGINS`, `LOG_LEVEL`, `LLM_PROVIDER`, `CAPTCHA_PROVIDER`, etc.

## 3. IAM de mínimo alcance (AC-02)

El instance role `EventflowEc2Role` ([`infra/ec2/provision-ec2.sh`](../../infra/ec2/provision-ec2.sh),
policy inline `ssm-read-eventflow`) concede **sólo**:

```json
{
  "Effect": "Allow",
  "Action": ["ssm:GetParameter", "ssm:GetParameters"],
  "Resource": "arn:aws:ssm:us-east-1:357919579117:parameter/eventflow/*"
}
```

más `kms:Decrypt` **condicionado** a `kms:ViaService = ssm.us-east-1.amazonaws.com`. No hay
`ssm:PutParameter`, `DeleteParameter` ni acceso a parámetros fuera de `/eventflow/*`. El rol **no**
puede leer secretos de otras aplicaciones ni escribir. La rotación (escritura) la ejecuta el
**operador** con sus credenciales, no la instancia.

> El prefijo `/eventflow/*` cubre `demo` y `qa`. Para aislamiento estricto por entorno (un rol por
> entorno con `Resource: .../eventflow/demo/*`) ver §6 (mejora futura, fuera de MVP).

## 4. Procedimiento de rotación manual (AC-05)

Rotación **manual** (el MVP no usa rotación automática). Para rotar un secreto `NOMBRE` en `env`:

1. **Generar el nuevo valor** (fuera de banda; no imprimir en logs ni en el historial de shell):
   ```bash
   # ejemplo para un secreto de firma (32+ bytes)
   NEW_SECRET="$(openssl rand -base64 48)"
   ```
2. **Actualizar el parámetro en SSM** (sobrescribe, mantiene el tipo cifrado):
   ```bash
   aws ssm put-parameter \
     --name "/eventflow/demo/SESSION_SECRET" \
     --value "$NEW_SECRET" --type SecureString --overwrite \
     --region us-east-1
   unset NEW_SECRET
   ```
   Para `DATABASE_URL`: rotar primero la master password en RDS y luego reconstruir la URL antes del
   `put-parameter` (ver [`rds-postgresql.md`](rds-postgresql.md) §rotación).
3. **Refrescar el servicio** para que relea el secreto (el backend lee SSM sólo en el arranque):
   ```bash
   # vía SSM Run Command (sin SSH), reinicia el contenedor que relee SSM en boot:
   aws ssm send-command \
     --region us-east-1 \
     --targets Key=tag:Name,Values=eventflow-backend \
     --document-name AWS-RunShellScript \
     --parameters 'commands=["systemctl restart docker"]'
   ```
   Alternativa: re-ejecutar el `user-data` / `docker restart backend` por SSH desde el operador.
4. **Verificar** salud tras el reinicio (≈1-2 min):
   ```bash
   curl -sf https://18-235-214-199.sslip.io/health/ready   # espera 200 (postgres:ok)
   ```

**Impacto por secreto:** rotar `SESSION_SECRET` invalida las sesiones activas (los usuarios deben
volver a iniciar sesión) — comportamiento esperado. Rotar `JWT_SECRET` invalida los JWT emitidos.
Rotar `DATABASE_URL` requiere que la nueva password ya esté activa en RDS antes del redeploy.

## 5. Fail-fast y ausencia de secretos en logs (AC-04, EC-01)

- **Fail-fast (EC-01):** `backend/src/config/env.ts` valida con Zod al importar el módulo; si falta o
  es inválido un secreto requerido (`DATABASE_URL` URL, `JWT_SECRET`/`SESSION_SECRET` ≥32 chars), el
  proceso **no arranca** y emite un `ZodError` con el nombre de la var **sin exponer el valor**.
  Verificado por `backend/tests/unit/config-env.spec.ts`.
- **Sin secretos en logs (SEC-03):** el logger Pino redacta campos sensibles (US-108/US-113) y el
  sanitizador de payloads (US-122) elimina secretos/PII. `user-data` lee los secretos en variables de
  shell locales, nunca en `echo`. Verificado por `us108-log-redaction.spec.ts` y
  `us122-payload-sanitizer.spec.ts`.
- **`.env.example` (AC-03):** [`backend/.env.example`](../../backend/.env.example) lista **todas** las
  variables (secretas + config) con placeholders y **sin valores reales**. Verificado por
  `env-example.spec.ts` (todas las claves del schema presentes; sin `sk-…` ni valores reales).

## 6. Mejoras futuras (fuera de MVP)

- Rotación automática (AWS Secrets Manager con rotación programada) si se migra de SSM.
- Un instance role por entorno con `Resource` restringido a `/eventflow/<env>/*` para aislamiento
  estricto (hoy el rol único cubre `demo`+`qa` bajo `/eventflow/*`).
- OIDC GitHub Actions → AWS para que CI no use credenciales de larga vida (referenciado; US-132/US-136).

## 7. Nota de reconciliación de prioridad

La metadata original de US-138 marcaba **P0**; el Product Backlog Prioritized ubica el ítem en
**PB-P2-024 (P2)**. Se adopta **P2** (fuente autoritativa: `4-Product-Backlog-Prioritized.md`). Ya
reconciliado en la User Story y en la Tech Spec.

## 8. Checklist de Definition of Done (US-138)

- [x] Secretos del backend en un store gestionado por entorno (SSM SecureString); ninguno en repo/env plano.
- [x] Referenciados desde el runtime del backend (EC2 instance role, `user-data` lee SSM en boot).
- [x] IAM de mínimo alcance (`ssm-read-eventflow`: `GetParameter(s)` sobre `/eventflow/*` + `kms:Decrypt` vía SSM).
- [x] `.env.example` con nombres y sin valores.
- [x] Sin secretos en logs/artefactos (redacción Pino + sanitizador + `user-data` sin `echo`).
- [x] Runbook de rotación manual documentado (este documento).
- [ ] Tech Lead valida.
