# Runbook — Deploy del backend en AWS App Runner (US-136 / PB-P2-022)

> Cómo empaquetar (ECR), desplegar (App Runner), configurar (env/secretos, CORS/cookies,
> escalamiento, CloudWatch), verificar (smoke) y revertir (rollback) el backend Node.js + Express.
> Fuente de verdad de diseño: `docs/21-Deployment-and-DevOps-Design.md` §10 · ADR-DEVOPS-001.
> Artefactos versionados: [`infra/apprunner/provision-apprunner.sh`](../../infra/apprunner/provision-apprunner.sh),
> [`.github/workflows/deploy-backend.yml`](../../.github/workflows/deploy-backend.yml), `backend/Dockerfile`.

## Estado actual del despliegue (2026-07-24)

| Dato | Valor |
| --- | --- |
| Imagen ECR | `eventflow-backend` (región `us-east-1`, cuenta `357919579117`) — **build & push OK** (tag `ce93de8`) |
| Servicio App Runner | **DIFERIDO** — bloqueado por RDS (PB-P2-023). El backend crashea al boot sin `DATABASE_URL` accesible (BLK-001) |
| CORS_ORIGINS | dominios Amplify de US-135: `https://main.d2jh1ql4whmeue.amplifyapp.com`, `https://staging.d2jh1ql4whmeue.amplifyapp.com` |

> **Secuencia para completar el deploy vivo:** (1) provisionar RDS (PB-P2-023) → obtener
> `DATABASE_URL`; (2) provisionar/`referenciar` secretos (PB-P2-024); (3) re-ejecutar
> `provision-apprunner.sh` con `DATABASE_URL`/`JWT_SECRET`/`SESSION_SECRET`/`ACCESS_ROLE_ARN`
> (fase 2 crea el servicio); (4) smoke `/health`; (5) actualizar `NEXT_PUBLIC_API_BASE_URL` en
> Amplify (US-135) con `https://<apprunner-url>/api/v1` + redeploy del frontend.

---

## 0. Decisiones de naming (alineación a la implementación real)

| US/Tech Spec dice | Implementación real (backend) | Decisión |
| --- | --- | --- |
| `/healthz` | `/health` (liveness, sin I/O) y `/health/ready` (readiness con Postgres) | App Runner usa **`/health`** (no requiere BD para el probe) |
| `CORS_ALLOWED_ORIGINS` | `CORS_ORIGINS` (+ `CORS_CREDENTIALS`) | Se usa **`CORS_ORIGINS`** (nombre real, `backend/src/config/env.ts`) |

Doc 21 §10.4 menciona `/health`; la US/backlog decían `/healthz`. Se adopta `/health` (lo que el
backend sirve). Sin cambios al backend (fuera de scope US-136).

---

## 1. ECR + imagen del backend (OPS-001 · AC-01)

Fase 1 de [`provision-apprunner.sh`](../../infra/apprunner/provision-apprunner.sh) (idempotente):
crea el repo ECR privado (scan on push), hace `docker login`, `docker build --platform linux/amd64`
del `backend/Dockerfile` (multi-stage, no-root, sin secretos) y `docker push`.

```bash
AWS_REGION=us-east-1 bash infra/apprunner/provision-apprunner.sh
```

**DoD:** repo ECR creado; imagen publicada sin secretos.

---

## 2. Servicio App Runner (OPS-002 · AC-01) — tras RDS (PB-P2-023)

Fase 2 del script (guardada): sólo corre si `DATABASE_URL` está seteada. Crea/actualiza el servicio
App Runner desde la imagen ECR, con puerto `3000`, health check `/health`, escalamiento modesto y
env/secretos. App Runner termina HTTPS y expone una URL pública.

```bash
AWS_REGION=us-east-1 \
DATABASE_URL='postgres://user:pass@<rds-endpoint>:5432/eventflow' \
JWT_SECRET='<>=32 chars>' SESSION_SECRET='<>=32 chars>' \
ACCESS_ROLE_ARN='arn:aws:iam::357919579117:role/AppRunnerECRAccessRole' \
bash infra/apprunner/provision-apprunner.sh
```

> **Por qué está bloqueado sin BD (BLK-001):** `backend/src/config/env.ts` exige `DATABASE_URL`
> (Zod fail-fast) y `backend/src/server.ts` hace `await prisma.$connect()` al boot; sin una
> PostgreSQL accesible el proceso sale con exit 1 → App Runner no logra un deploy sano.

**DoD:** App Runner corre la imagen; URL pública operativa.

---

## 3. Variables de runtime, secretos, escalamiento, CloudWatch (OPS-003 · AC-04/AC-05)

> Solo el backend consume secretos; nunca en la imagen ni en logs (SEC-02/SEC-03). En producción
> real, los sensibles van por **RuntimeEnvironmentSecrets** (Secrets Manager, PB-P2-024), no como
> env plano.

Matriz de env por ambiente (Demo/QA):

| Variable | Tipo | Demo | QA | Notas |
| --- | --- | --- | --- | --- |
| `NODE_ENV` | env | `production` | `production` | Fuerza `Secure` en cookies. |
| `PORT` | env | `3000` | `3000` | Puerto del contenedor (Dockerfile). |
| `DATABASE_URL` | **secreto** | RDS Demo | RDS QA | PB-P2-023. Fail-fast si falta (VR-03). |
| `JWT_SECRET` | **secreto** | ≥32 chars | ≥32 chars | PB-P2-024. |
| `SESSION_SECRET` | **secreto** | ≥32 chars | ≥32 chars | PB-P2-024. |
| `OPENAI_API_KEY` | **secreto** | real | real/mock | Único consumidor OpenAI; opcional. |
| `CORS_ORIGINS` | env | `https://main.d2jh1ql4whmeue.amplifyapp.com` | `https://staging.d2jh1ql4whmeue.amplifyapp.com` | Allowlist sin wildcard (VR-04). |
| `CORS_CREDENTIALS` | env | `true` | `true` | Requerido con SameSite=None. |
| `SESSION_COOKIE_SAMESITE` | env | `none` | `none` | Cross-domain Amplify↔App Runner. |
| `SESSION_COOKIE_SECURE` | env | `true` | `true` | Requerido en producción y con SameSite=None. |

- **Escalamiento:** min 1 / max 3; CPU 1 vCPU / 2 GB (modesto).
- **CloudWatch:** App Runner envía logs de aplicación y de servicio a CloudWatch por defecto
  (retención configurable 14–30 días); sin secretos en logs (SEC-03).
- **Fail-fast** ante variable/secreto requerido ausente (VR-03 / EC-02).

**DoD:** vars/secretos en runtime; imagen sin secretos; escalamiento min1/max3; logs en CloudWatch.

---

## 4. Health check `/health` (OPS-004 · AC-03)

App Runner usa `Protocol=HTTP, Path=/health` (liveness sin I/O). Una instancia no sana **no recibe
tráfico** y App Runner mantiene la versión anterior (EC-01 / VR-02 / NT-01). `/health/ready`
(readiness con Postgres) queda disponible para diagnóstico pero **no** se usa como probe de App
Runner (dependería de la BD).

**DoD:** `/health` configurado como health check; instancia no sana no recibe tráfico.

---

## 5. CORS, cookies e imagen sin secretos (SEC-001 · AC-04/AC-05)

- **CORS:** `CORS_ORIGINS` = dominios exactos de Amplify (sin `*`); `CORS_CREDENTIALS=true`
  (Doc 21 §10.6, VR-04 / NT-04).
- **Cookies:** el backend emite la cookie de sesión `HttpOnly; Secure; SameSite=None`
  (`SESSION_COOKIE_SAMESITE=none` + `SESSION_COOKIE_SECURE=true`). `env.ts` valida que SameSite=None
  exige Secure + CORS_CREDENTIALS=true + allowlist explícita.
- **Imagen sin secretos:** `backend/.dockerignore` + multi-stage; los secretos entran por runtime
  (Secrets Manager). El Dockerfile no recibe secretos por `ARG` (verificado en PB-P0-016).
- **Sin secretos en logs:** el boot sólo loguea nombres de campos Zod, nunca valores (SEC-03).

**DoD:** CORS a Amplify + cookies SameSite=None/Secure; imagen y logs sin secretos.

---

## 6. Deploy automatizado (OPS-005 · AC-02)

[`.github/workflows/deploy-backend.yml`](../../.github/workflows/deploy-backend.yml): en push a
`main`/`staging` (paths `backend/**`) o `workflow_dispatch`, autentica por **OIDC**, hace build &
push a ECR (tag `sha` + tag de ambiente) y dispara `apprunner start-deployment` (P-12: redeploy de
imagen, no parches en caliente). **Gated**: sólo corre si el repo declaró `vars.AWS_DEPLOY_ROLE_ARN`
(inactivo hasta configurar OIDC + servicio App Runner, tras PB-P2-023/024).

Configuración requerida (repo → Settings → Variables): `AWS_REGION`, `AWS_DEPLOY_ROLE_ARN`,
`ECR_REPO`, `APPRUNNER_SERVICE_ARN`.

**DoD:** build & push a ECR automatizado; App Runner redepliega la nueva imagen.

---

## 7. Smoke (QA-001 · AC-01/AC-03) — tras deploy vivo

```bash
BASE=https://<apprunner-url>
curl -fsS -o /dev/null -w "%{http_code}\n" "$BASE/health"        # espera 200
curl -fsS "$BASE/health" | jq .                                   # {status:"ok",version,uptimeMs,...}
```

**DoD:** URL del backend responde; `/health` responde 200.

---

## 8. Rollback

- **App Runner:** re-ejecutar `apprunner start-deployment` apuntando a un tag de imagen previo, o
  redeploy de la imagen anterior en ECR (P-12). App Runner mantiene la versión previa si el nuevo
  deploy no queda sano (EC-01).
- **Vía commit:** `git revert` en `main`/`staging` → el workflow reconstruye y redepliega.

---

## 9. Documentation Alignment (DOC-001)

- **Prioridad P0 → P2:** la metadata original marcaba P0; el backlog ubica PB-P2-022 en **P2**
  (fuente autoritativa). Reconciliado en la US.
- **Healthcheck:** `/health` (implementación real), no `/healthz` (§0).
- **CORS:** `CORS_ORIGINS`, no `CORS_ALLOWED_ORIGINS` (§0).
- **Dependencias:** RDS (PB-P2-023) provee `DATABASE_URL`; Secrets Manager (PB-P2-024) provee los
  sensibles. Ambas fuera de scope de US-136; el deploy vivo se completa cuando existan.

---

## 10. Checklist de deploy (operador)

- [x] Repo ECR creado; imagen publicada sin secretos.
- [ ] RDS provisionada (PB-P2-023) → `DATABASE_URL` disponible.
- [ ] Secretos en Secrets Manager (PB-P2-024) → `JWT_SECRET`/`SESSION_SECRET`/`OPENAI_API_KEY`.
- [ ] Rol IAM `AppRunnerECRAccessRole` (acceso a ECR) creado.
- [ ] Servicio App Runner creado (fase 2 del script); URL pública operativa.
- [ ] `/health` responde 200; instancia no sana no recibe tráfico.
- [ ] CORS a Amplify + cookies SameSite=None/Secure.
- [ ] Escalamiento min1/max3; logs en CloudWatch sin secretos.
- [ ] `NEXT_PUBLIC_API_BASE_URL` (Amplify, US-135) actualizado con la URL del backend + redeploy.
- [ ] Deploy automatizado (GitHub Actions) activado con OIDC.
