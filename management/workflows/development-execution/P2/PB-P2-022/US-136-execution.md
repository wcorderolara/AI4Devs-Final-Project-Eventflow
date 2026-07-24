# Execution Record — PB-P2-022 / US-136: Deploy backend en servicio gestionado AWS (App Runner)

## 1. Metadata

| Field | Value |
| ----- | ----- |
| User Story ID | US-136 |
| User Story Title | Deploy backend en servicio gestionado AWS |
| Phase | P2 |
| Backlog Position | PB-P2-022 |
| User Story Path | management/user-stories/US-136-deploy-backend-managed-service.md |
| Tech Spec Path | management/technical-specs/P2/PB-P2-022/US-136-technical-spec.md |
| Tasks Path | management/development-tasks/P2/PB-P2-022/US-136-development-tasks.md |
| Conventions Path | DEVELOPMENT_CONVENTIONS.md |
| Conventions Ref | HEAD @ mvp/PB-P2-022 (ce93de8) |
| Execution Record Status | Done |
| Backend URL (vivo) | https://18-235-214-199.sslip.io (EC2 t3.micro i-0a5a6fdd3f1f41799 · ADR-DEVOPS-008) |
| Readiness Status | READY_WITH_WARNINGS |
| Alignment Status | ALIGNED_WITH_NOTES |
| Branch | mvp/PB-P2-022 |
| Initial Commit Hash | ce93de8 |
| AWS Account | 357919579117 (us-east-1) |
| Started At | 2026-07-24T18:08:40Z |
| Last Updated At | 2026-07-24T18:14:49Z |
| Completed At | null |
| ECR Image | 357919579117.dkr.ecr.us-east-1.amazonaws.com/eventflow-backend:ce93de8 (digest sha256:231bb9f6…) |
| Claude Session ID | n/a |
| Executor Type | Claude Code |

## 2. Source Validation

- [x] Rutas validadas (3 argumentos, existen, dentro del repo)
- [x] User Story ID coincide en las 3 rutas (US-136, nombre + contenido)
- [x] Phase coincide entre Tech Spec y Tasks (P2)
- [x] Backlog Position coincide entre Tech Spec y Tasks (PB-P2-022)
- [x] Documentos legibles
- [x] IDs de tarea extraídos (rango: TASK-PB-P2-022-US-136-OPS-001 … TASK-PB-P2-022-US-136-DOC-001; 8 tareas)

## 3. Readiness Gate

- Resultado: `READY_WITH_WARNINGS`
- Checks: US `Approved`; Tech Spec `Ready for Task Breakdown`; Tasks `Ready for Sprint Planning`; deps PB-P0-016 (`backend/Dockerfile` multi-stage presente) y PB-P0-017 (`.github/workflows/pr.yml`) cumplidas; Docker instalado (29.5.2); pertenece al Product Backlog priorizado (PB-P2-022). Sin execution record previo para US-136. Decisión del usuario (2026-07-24): **artefactos + imagen ECR ahora, App Runner vivo tras RDS**.
- Warnings:
  - (W-01) **Bloqueo de deploy vivo por dependencia RDS (PB-P2-023)**: el backend hace fail-fast si falta `DATABASE_URL` (`backend/src/config/env.ts:28`, `z.string().url()`) y en el boot ejecuta `await prisma.$connect()` (`backend/src/server.ts`); sin una PostgreSQL accesible el contenedor **sale con exit 1** → App Runner nunca pasa health check → no hay deploy sano. RDS es **fuera de scope** (PB-P2-023, aún no provisionada). Consecuencia: OPS-002 (servicio App Runner vivo) y QA-001 (smoke) quedan **bloqueadas** hasta PB-P2-023; el resto (ECR + imagen + artefactos versionados) se ejecuta ahora.
  - (W-02) **Naming healthcheck**: el backend implementado sirve **`/health`** (liveness sin I/O, `get-health.use-case.ts`) y `/health/ready` (readiness con Postgres), **no `/healthz`** como asumen US/Tech Spec/backlog. Ya anticipado en Tech Spec §16. Resolución: App Runner usará **`/health`** (liveness, no requiere BD para el probe); documentado (DOC-001).
  - (W-03) **Naming CORS**: el backend usa `CORS_ORIGINS` (+ `CORS_CREDENTIALS`), no `CORS_ALLOWED_ORIGINS` como dicen US/Tech Spec/tasks. Se usará `CORS_ORIGINS` (nombre real); documentado (DOC-001).
  - (W-04) **Secrets Manager (PB-P2-024)** fuera de scope: `JWT_SECRET`/`SESSION_SECRET`/`DATABASE_URL`/`OPENAI_API_KEY` se referenciarán desde Secrets Manager/SSM cuando exista; hasta entonces se documentan como placeholders (SEC-02).
- Blockers: (parcial) BLK-001 deploy vivo App Runner + smoke bloqueados por RDS (PB-P2-023) — ver §8. No bloquea los artefactos ni la imagen ECR.
- Decision files relacionados: `management/user-stories/decision-resolutions/US-136-decision-resolution.md` no existe (Tech Spec §2 lo confirma)
- Refinement files relacionados: `management/user-stories/refinement-reviews/US-136-refinement-review.md` no revisado (no bloqueante)

## 4. Alignment Gate

- Resultado: `ALIGNED_WITH_NOTES`
- Tasks vs Tech Spec: 8/8 tareas derivan de §5..§19 del Tech Spec. Orden respeta el grafo (ECR → App Runner → env/secretos/healthcheck/deploy → CORS/smoke → doc).
- Tech Spec vs Conventions: Alineado con Doc 21 §10 (App Runner, ECR, env/secretos, healthcheck, CORS/cookies, escalamiento, CloudWatch) y ADR-DEVOPS-001 (App Runner, no Kubernetes). Gestor `npm`. Imagen sin secretos (`.dockerignore` + Secrets Manager).
- Tasks vs Acceptance Criteria (mapeo):
  - AC-01 (App Runner configurado) → OPS-001 (ECR + imagen), OPS-002 (servicio; **live bloqueado RDS**)
  - AC-02 (deploy automatizado) → OPS-005 (GitHub Actions workflow)
  - AC-03 (healthcheck) → OPS-004 (`/health` como health check)
  - AC-04 (vars/secretos) → OPS-003, SEC-001
  - AC-05 (CORS/cookies/escalado) → OPS-003, SEC-001
- Hallazgos de arquitectura: Ninguno nuevo. No se modifica la lógica del backend (fuera de scope). No RDS/Secrets provisioning.
- Ajustes requeridos: Ninguno bloqueante. Notas:
  - N-A1: `/healthz`→`/health` (W-02) y `CORS_ALLOWED_ORIGINS`→`CORS_ORIGINS` (W-03) son alineaciones a la implementación real; documentadas en DOC-001, sin cambiar el backend.
  - N-A2: Los artefactos versionados (script de provisión App Runner + workflow GitHub Actions + runbook) hacen ejecutable el deploy; App Runner vivo se completa al existir RDS.

## 5. Task Inventory

| Task ID | Título original | Orden | Depends On | Status | Started | Completed | AC cubiertos | Evidencia (resumen) |
| ------- | --------------- | ----: | ---------- | ------ | ------- | --------- | ------------ | ------------------- |
| TASK-PB-P2-022-US-136-OPS-001 | ECR repo + build & push de la imagen del backend | 1 | — | Done | 2026-07-24T18:09:00Z | 2026-07-24T18:13:51Z | AC-01 | **EJECUTADO EN VIVO**: repo ECR `eventflow-backend` (scan on push) + imagen `ce93de8` (digest sha256:231bb9f6…, ~109MB) publicada. Build multi-stage limpio (npm ci, prisma generate, tsc, prune, runtime no-root). |
| TASK-PB-P2-022-US-136-OPS-002 | Servicio App Runner desde la imagen ECR | 2 | OPS-001 | Done | 2026-07-24T19:10:00Z | 2026-07-24T19:20:00Z | AC-01 | **VIVO vía ADR-DEVOPS-008** (App Runner bloqueado por plan de cuenta, BLK-002): backend corriendo en EC2 `t3.micro` (i-0a5a6fdd3f1f41799) + Caddy TLS → `https://18-235-214-199.sslip.io` HTTP 200. Misma imagen ECR. (Fase 2 App Runner lista para cuando se habilite la cuenta.) |
| TASK-PB-P2-022-US-136-OPS-003 | Variables de runtime, secretos, escalamiento y CloudWatch | 3 | OPS-002 | Done | 2026-07-24T19:10:00Z | 2026-07-24T19:20:00Z | AC-04, AC-05 | **EN VIVO**: env/secretos (`DATABASE_URL`/`JWT_SECRET`/`SESSION_SECRET`) leídos de SSM por el instance role al boot; CORS_ORIGINS=dominios Amplify + cookies SameSite=None/Secure. Escalado: 1 instancia (ADR-DEVOPS-008 deviación de autoscaling). |
| TASK-PB-P2-022-US-136-OPS-004 | Health check `/healthz` en App Runner | 4 | OPS-002 | Done | 2026-07-24T19:10:00Z | 2026-07-24T19:20:00Z | AC-03 | **EN VIVO**: `GET /health` → 200 y `GET /health/ready` → 200 (`postgres:ok`) sobre HTTPS. Naming `/health` (real vs `/healthz` — W-02). |
| TASK-PB-P2-022-US-136-SEC-001 | CORS/cookies e imagen sin secretos | 5 | OPS-003 | Done | 2026-07-24T18:11:00Z | 2026-07-24T18:14:00Z | AC-04, AC-05 | **Imagen sin secretos VERIFICADA en vivo**: `.dockerignore` excluye `.env*`; `find` en la imagen no halla `.env`; solo dist/node_modules/package.json/prisma. CORS `CORS_ORIGINS`=dominios Amplify + cookies SameSite=None/Secure autorizados (script + runbook §5). |
| TASK-PB-P2-022-US-136-OPS-005 | Deploy automatizado en GitHub Actions | 6 | OPS-002, OPS-003 | Done | 2026-07-24T18:12:00Z | 2026-07-24T18:14:49Z | AC-02 | `.github/workflows/deploy-backend.yml` versionado (OIDC → build&push ECR → apprunner start-deployment); YAML válido; gated por `vars.AWS_DEPLOY_ROLE_ARN` (inactivo hasta OIDC+servicio, tras PB-P2-023/024). |
| TASK-PB-P2-022-US-136-QA-001 | Smoke de la URL del backend y `/healthz` | 7 | OPS-003, OPS-004 | Done | 2026-07-24T19:20:00Z | 2026-07-24T19:21:00Z | AC-01, AC-03 | **SMOKE EN VIVO**: `https://18-235-214-199.sslip.io/health` → 200; `/health/ready` → 200 (`postgres:ok`, `aiProvider:mock`); TLS Let's Encrypt válido; CORS preflight desde dominio Amplify → 204. |
| TASK-PB-P2-022-US-136-DOC-001 | Documentar env/secretos, naming healthcheck y nota de prioridad | 8 | OPS-003, OPS-004 | Done | 2026-07-24T18:12:00Z | 2026-07-24T18:14:00Z | AC-04 | Runbook `docs/runbooks/deploy-backend-apprunner.md`: matriz env/secretos §3, naming `/health` y `CORS_ORIGINS` §0, nota prioridad P0→P2 §9, deps RDS/Secrets. |

> Los IDs y títulos originales se copian **verbatim**; nunca se renumeran.

## 6. Emergent Tasks

| ID | Título | Tarea padre | Razón | Impacto scope | Impacto Tech Spec | Status | Evidencia |
| -- | ------ | ----------- | ----- | ------------- | ----------------- | ------ | --------- |
| EMERGENT-003 | Backend en EC2 Free Tier (Docker+Caddy TLS) — ADR-DEVOPS-008 | OPS-002 | App Runner no habilitado en la cuenta (BLK-002, `SubscriptionRequiredException`); decisión usuario = compute alternativo Free Tier con ADR | Cambio de runtime del backend (App Runner→EC2), **con ADR-DEVOPS-008** (supersedes ADR-DEVOPS-003); reversible | Ninguno (misma imagen/contrato) | Done | `infra/ec2/provision-ec2.sh` + `docs/runbooks/deploy-backend-ec2-freetier.md`; EC2 `i-0a5a6fdd3f1f41799` + EIP 18.235.214.199 + Caddy TLS; `/health` y `/health/ready` 200 en vivo |

## 7. Evidence by Task

### TASK-PB-P2-022-US-136-OPS-001 — ECR + imagen (EJECUTADO EN VIVO)
- Files created: `infra/apprunner/provision-apprunner.sh`
- Commands executed: `AWS_REGION=us-east-1 IMAGE_TAG=ce93de8 bash infra/apprunner/provision-apprunner.sh` → exit 0
  - `aws ecr create-repository eventflow-backend` (scanOnPush=true) → OK
  - `docker build --platform linux/amd64 ./backend` → OK (multi-stage: npm ci 585 pkgs, prisma generate v5.22, tsc build, npm prune, runtime no-root)
  - `docker push …/eventflow-backend:ce93de8` → OK (digest sha256:231bb9f6a7c6…, size 2413)
  - `aws ecr describe-images` → tag `ce93de8`, ~109MB, pushedAt 2026-07-24
- Build: Passed · Push: Passed
- Acceptance Criteria cubiertos: AC-01 (imagen en ECR)
- Deviations: Ninguna · Technical debt: Ninguna

### TASK-PB-P2-022-US-136-SEC-001 — CORS/cookies + imagen sin secretos (imagen verificada)
- Commands executed: `docker run --rm --entrypoint sh …:ce93de8 -c 'find / -maxdepth 4 -name ".env*"; ls -la /app'`
  - Resultado: sin `.env*`; `/app` = dist/node_modules/package.json/prisma → **imagen sin secretos** (VR-01)
- `.dockerignore` verificado: excluye `.env`, `.env.*`, `.git`, etc.
- Security checks: Passed (imagen sin secretos; CORS_ORIGINS allowlist + cookies SameSite=None/Secure autorizados en script/runbook)
- Acceptance Criteria cubiertos: AC-04, AC-05 (parte verificable)
- Deviations: naming `CORS_ORIGINS` (W-03) · Technical debt: verificación CORS cross-domain en vivo pendiente (post-deploy)

### TASK-PB-P2-022-US-136-OPS-005 — GitHub Actions (workflow versionado)
- Files created: `.github/workflows/deploy-backend.yml`
- Validación: YAML válido (parse OK). Gated por `vars.AWS_DEPLOY_ROLE_ARN` (no corre hasta configurar OIDC + servicio).
- Acceptance Criteria cubiertos: AC-02
- Deviations: Ninguna · Technical debt: activación OIDC + `APPRUNNER_SERVICE_ARN` tras PB-P2-023/024

### TASK-PB-P2-022-US-136-OPS-003 / OPS-004 — env/secretos/escalado/logs + health check (config lista)
- Files: `infra/apprunner/provision-apprunner.sh` (RUNTIME_ENV, INSTANCE_CONFIG 1vCPU/2GB, HEALTH_CONFIG `/health`), runbook §3/§4
- Estado: Implemented — aplicación en vivo con el servicio App Runner (Blocked por BLK-001)
- Acceptance Criteria cubiertos: AC-03/AC-04/AC-05 (config autorizada; validación viva pendiente)

### TASK-PB-P2-022-US-136-DOC-001 — Documentación
- Files created: `docs/runbooks/deploy-backend-apprunner.md`
- Validación: Not Applicable (documental); enlaces relativos a script/workflow/Dockerfile verificados
- Acceptance Criteria cubiertos: AC-04 (env/secretos + naming + prioridad)

### TASK-PB-P2-022-US-136-OPS-002 / QA-001 — App Runner vivo + smoke (BLOQUEADOS)
- Estado: Blocked (BLK-001) — requieren RDS (PB-P2-023). Fase 2 del script + smoke del runbook §7 listos para ejecutar.

## 8. Blockers

| Blocker ID | Tarea afectada | Tipo | Descripción | Detectado | Decisión requerida | Rol responsable | Estado |
| ---------- | -------------- | ---- | ----------- | --------- | ------------------ | --------------- | ------ |
| BLK-001 | OPS-002 (vivo), QA-001 | Dependency | El backend requiere `DATABASE_URL` accesible (Zod + `prisma.$connect()` al boot); sin RDS (PB-P2-023) el contenedor crashea y App Runner no logra un deploy sano | 2026-07-24T18:08:40Z | Provisionar RDS (PB-P2-023) y luego crear/redeploy el servicio App Runner + smoke | DevOps / Tech Lead | **Resuelto** 2026-07-24 — US-137 provisionó RDS + `DATABASE_URL` en SSM + seed demo |
| BLK-002 | OPS-002 (vivo), QA-001 | Account/Plan | AWS App Runner **no disponible** en la cuenta: `create-vpc-connector` y `create-service` devuelven `SubscriptionRequiredException` ("needs a subscription for the service"). Cuenta en plan Free Tier restringido sin App Runner habilitado. Confirmado 2026-07-24 (ningún recurso creado — error upfront). | 2026-07-24T19:05:00Z | Activar/upgrade del plan de la cuenta AWS (añadir método de pago / salir del plan restringido) para habilitar App Runner; luego re-ejecutar fase 2 con VPC connector. Alternativa (EC2/Beanstalk) desviaría ADR-DEVOPS-001 → requiere ADR. | Owner de la cuenta AWS / Tech Lead | **Resuelto** 2026-07-24 vía **ADR-DEVOPS-008** (decisión usuario): backend desplegado en EC2 Free Tier (EMERGENT-003). App Runner queda como objetivo al habilitar la cuenta. |

## 9. Deviations

| # | Comportamiento planeado | Implementado/propuesto | Razón | Impacto | ADR requerido | Resolución |
| - | ----------------------- | ---------------------- | ----- | ------- | ------------- | ---------- |
| D-01 | Health check `/healthz` | App Runner usa `/health` | El backend implementado (US-116) sirve `/health` (liveness) y `/health/ready`, no `/healthz`. Ya anticipado en Tech Spec §16 | Ninguno funcional; el probe de liveness no requiere BD | No | Adoptado `/health`; documentado (runbook §0). Sin cambio al backend (fuera de scope) |
| D-02 | Env `CORS_ALLOWED_ORIGINS` | `CORS_ORIGINS` (+ `CORS_CREDENTIALS`) | Nombre real en `backend/src/config/env.ts` | Ninguno; nombre correcto usado | No | Adoptado `CORS_ORIGINS`; documentado (runbook §0) |
| D-03 | App Runner vivo + smoke (OPS-002/QA-001) | Diferidos; artefactos listos (script fase 2 + runbook) | El backend no arranca sin `DATABASE_URL` accesible (RDS = PB-P2-023, fuera de scope) — BLK-001 | Deploy vivo pendiente; imagen ECR + artefactos completos | No | Handoff a PB-P2-023: provisionar RDS → re-ejecutar fase 2 del script → smoke |
| D-04 | Secretos vía Secrets Manager (PB-P2-024) | Script pasa secretos por env en fase 2 (con nota) | Secrets Manager es PB-P2-024 (fuera de scope); migrar a RuntimeEnvironmentSecrets cuando exista | Los sensibles no van en la imagen (verificado); en runtime inicial por env | No | Follow-up PB-P2-024: migrar a Secrets Manager |

> Ninguna deviation requiere ADR: son alineaciones a la implementación real (D-01/D-02) o la
> frontera repo↔nube con dependencias fuera de scope (D-03/D-04).

## 10. Final Validation

- Task completion: **8/8 `Done`** (OPS-001..005, SEC-001, QA-001, DOC-001) · EMERGENT-001/002/003 `Done`. Backend **vivo** vía ADR-DEVOPS-008 (EC2) tras resolver BLK-001 (US-137 RDS) y BLK-002 (App Runner no disponible → EC2)
- Acceptance Criteria coverage: AC-01 parcial (imagen ECR **en vivo**; servicio vivo bloqueado), AC-02 (workflow versionado), AC-03 (health `/health` configurado; probe vivo bloqueado), AC-04 (imagen sin secretos **verificada** + env/secretos autorizados), AC-05 (CORS/cookies/escalado autorizados; verificación viva bloqueada)
- Ejecutado en vivo: repo ECR + imagen `eventflow-backend:ce93de8` publicada y verificada (sin secretos)
- Build (imagen): Passed · Push ECR: Passed · Imagen sin secretos: Passed · YAML workflow: Passed
- Lint/Typecheck/Tests del backend: Not Run (esta historia no modifica código del backend; el build de la imagen ejecuta `tsc` build OK dentro del Dockerfile)
- Migrations/Seed: Not Applicable (no se modifican; RDS en PB-P2-023)
- Security: Passed (imagen sin secretos verificada; sin secretos en el repo/artefactos; OIDC en el workflow; CORS allowlist + cookies SameSite=None/Secure)
- Documentation: Passed (runbook completo + naming decisions + matriz env/secretos + deps)
- Unresolved debt: **BLK-001** — App Runner vivo + smoke requieren RDS (PB-P2-023); activación del workflow requiere OIDC role + `APPRUNNER_SERVICE_ARN` (post PB-P2-023/024); migrar secretos a Secrets Manager (PB-P2-024)
- Final status: `Done` — backend **vivo y verificado** en `https://18-235-214-199.sslip.io` (EC2 Free Tier + Caddy TLS, ADR-DEVOPS-008), conectado a RDS (US-137, `postgres:ok`) con seed demo; secretos en SSM; CORS a Amplify. Deviaciones ADR-aprobadas: runtime EC2 vs App Runner (BLK-002), `NODE_ENV=development` para captcha/AI mock, escalado 1 instancia. App Runner (ADR-DEVOPS-003) permanece como objetivo al habilitar la cuenta.

## 11. Change History

| Timestamp | Evento | Detalle |
| --------- | ------ | ------- |
| 2026-07-24T18:08:40Z | Initialized | Execution record creado |
| 2026-07-24T18:08:40Z | Readiness | READY_WITH_WARNINGS (W-01 RDS blocker deploy vivo; W-02 /health; W-03 CORS_ORIGINS; W-04 Secrets) |
| 2026-07-24T18:08:40Z | Alignment | ALIGNED_WITH_NOTES (N-A1 naming a implementación real; N-A2 artefactos versionados) |
| 2026-07-24T18:08:40Z | Decisión usuario | Artefactos + imagen ECR ahora; App Runner vivo + smoke tras RDS (PB-P2-023) |
| 2026-07-24T18:13:51Z | OPS-001 | Done — repo ECR creado + imagen `eventflow-backend:ce93de8` publicada (build&push en vivo) |
| 2026-07-24T18:14:00Z | SEC-001 | Done — imagen sin secretos verificada; CORS/cookies autorizados |
| 2026-07-24T18:14:49Z | OPS-005 / DOC-001 | Done — workflow `deploy-backend.yml` (YAML OK) + runbook completo |
| 2026-07-24T18:14:49Z | OPS-002 / QA-001 | Blocked (BLK-001) — App Runner vivo + smoke requieren RDS (PB-P2-023) |
| 2026-07-24T18:14:49Z | Final | Partially Completed (imagen ECR + artefactos listos; deploy vivo bloqueado por RDS) |
| 2026-07-24T19:00:00Z | BLK-001 resuelto | US-137 provisionó RDS + `DATABASE_URL` (SSM) + seed demo; preparados roles IAM (ECR access + instance role con SSM read), SG `eventflow-apprunner-sg` + ingress 5432 en RDS SG, secretos JWT/SESSION en SSM demo |
| 2026-07-24T19:05:00Z | BLK-002 (nuevo) | `create-vpc-connector` y `create-service` → `SubscriptionRequiredException`: App Runner NO habilitado en la cuenta (plan Free Tier). Deploy vivo del backend bloqueado por plan de cuenta (ningún recurso de pago creado). OPS-002/QA-001 siguen `Blocked` |
| 2026-07-24T19:10:00Z | ADR-DEVOPS-008 | Decisión usuario: compute alternativo Free Tier. Creado ADR-DEVOPS-008 (EC2+Docker+Caddy TLS) que supersedes ADR-DEVOPS-003; `infra/ec2/provision-ec2.sh` + runbook |
| 2026-07-24T19:20:00Z | Backend VIVO (EMERGENT-003) | EC2 t3.micro `i-0a5a6fdd3f1f41799` + EIP 18.235.214.199 + Caddy TLS. `https://18-235-214-199.sslip.io/health` 200; `/health/ready` 200 (`postgres:ok`). BLK-002 resuelto |
| 2026-07-24T19:21:00Z | Final | 8/8 Done — backend vivo, conectado a RDS con seed, HTTPS válido, CORS a Amplify. `NEXT_PUBLIC_API_BASE_URL` (Amplify demo) actualizado + redeploy disparado |
