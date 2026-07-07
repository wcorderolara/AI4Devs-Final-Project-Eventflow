# Technical Specification — PB-P2-022 / US-136: Deploy backend en servicio gestionado AWS

## 1. Metadata

| Field                                | Value                                                                             |
| ------------------------------------ | --------------------------------------------------------------------------------- |
| User Story ID                        | US-136                                                                             |
| Source User Story                    | `management/user-stories/US-136-deploy-backend-managed-service.md`                 |
| Decision Resolution Artifact         | N/A — no existe `management/user-stories/decision-resolutions/US-136-decision-resolution.md` |
| Priority                             | P2 (Must Have)                                                                     |
| Backlog ID                           | PB-P2-022                                                                          |
| Backlog Title                        | Deploy backend en servicio gestionado AWS (App Runner)                              |
| Backlog Execution Order              | 22 (vigésimo segundo ítem de P2)                                                   |
| User Story Position in Backlog Item  | 1 de 1                                                                             |
| Related User Stories in Backlog Item | US-136                                                                             |
| Epic                                 | EPIC-OPS-001                                                                       |
| Backlog Item Dependencies            | PB-P0-016 (Dockerfile backend), PB-P0-017 (pipeline CI)                            |
| Feature                              | App Runner — deploy del backend dockerizado                                         |
| Module / Domain                      | DevOps                                                                             |
| User Story Status                    | Approved with Minor Notes                                                          |
| Backlog Alignment Status             | Found                                                                              |
| Technical Spec Status                | Ready for Task Breakdown                                                           |
| Created Date                         | 2026-07-07                                                                         |
| Last Updated                         | 2026-07-07                                                                         |

---

## 2. Source Validation

| Source                       | Found | Used | Notes                                    |
| ---------------------------- | ----- | ---- | ---------------------------------------- |
| User Story                   | Yes   | Yes  | `Approved with Minor Notes`.              |
| Technical Specification      | N/A   | N/A  | Este documento.                          |
| Decision Resolution Artifact | No    | No   | No existe para US-136.                    |
| Product Backlog Prioritized  | Yes   | Yes  | PB-P2-022 (P2).                           |
| ADRs                         | Yes   | Yes  | ADR-DEVOPS-001 (AWS/App Runner).          |

---

## 3. Backlog Execution Context

### Product Backlog Item

**PB-P2-022 — Deploy backend en servicio gestionado AWS** (EPIC-OPS-001, P2, Must Have). Despliegue del backend dockerizado en App Runner o Elastic Beanstalk con escalamiento mínimo, variables de entorno y healthcheck. Acceptance: servicio gestionado configurado; deploy automatizado; `/healthz` accesible. Dependencias: PB-P0-016, PB-P0-017. Trazabilidad: Doc 21.

### Execution Order Rationale

Vigésimo segundo ítem de P2. Depende del Dockerfile del backend (PB-P0-016) y del pipeline CI (PB-P0-017). Provee la **URL del backend** que consume el frontend Amplify (US-135) vía `NEXT_PUBLIC_API_BASE_URL`. Precede/coordina con RDS (PB-P2-023) y Secrets Manager (PB-P2-024).

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item                          | Suggested Order |
| ---------- | --------------------------------------------- | --------------- |
| US-136     | Única historia del ítem (deploy backend)      | 1               |

---

## 3.1 Executive Technical Summary

Se debe desplegar el backend **Node.js + Express** empaquetado como **imagen Docker multi-stage** (PB-P0-016) en **AWS App Runner** (Doc 21 §10, ADR-DEVOPS-001), que corre el contenedor detrás de HTTPS sin Kubernetes. La imagen se publica en **Amazon ECR** y el **deploy es automatizado** vía GitHub Actions (build & push → App Runner deploy). App Runner inyecta las **variables de entorno** de runtime y referencia los **secretos** desde **Secrets Manager/SSM** (la imagen no contiene credenciales). Un **healthcheck** (`/healthz`, provisto por US-116) determina la disponibilidad. Se configuran **CORS** (`CORS_ALLOWED_ORIGINS` = dominio Amplify) y **cookies** (`HttpOnly; Secure; SameSite=None`), **escalamiento mínimo** (min 1, max 2–3) y **logs** en CloudWatch.

No provisiona RDS (PB-P2-023) ni Secrets Manager (PB-P2-024); los consume/referencia. No modifica la lógica del backend.

---

## 4. Scope Boundary

### In Scope

* **App Runner** consumiendo la imagen del backend desde **ECR** (PB-P0-016).
* **Deploy automatizado** vía GitHub Actions (build & push a ECR; deploy/redeploy en App Runner).
* **Variables de runtime** + **secretos** desde Secrets Manager/SSM (no en la imagen).
* **Healthcheck** `/healthz` configurado en App Runner.
* **CORS** (`CORS_ALLOWED_ORIGINS` = Amplify) y **cookies** (`HttpOnly; Secure; SameSite=None`).
* **Escalamiento mínimo** (min 1, max 2–3; CPU/memoria modestas).
* **CloudWatch** logs; **URL pública** del backend.

### Out of Scope

* Provisión de RDS (PB-P2-023) — se consume vía env/secretos.
* Provisión de Secrets Manager (PB-P2-024) — se referencia.
* Custom domain / Route 53, WAF, SES (opcional/futuro).
* El Dockerfile (PB-P0-016) y el workflow de quality gates (US-132/PB-P0-017).
* Kubernetes/clusters (P-09).

### Explicit Non-Goals

* No incluir secretos en la imagen.
* No operar infraestructura manualmente (servicio gestionado).
* No modificar la lógica del backend.

---

## 5. Architecture Alignment

### Backend Architecture

Node.js + Express (monolito modular) como contenedor en App Runner (Doc 21 §10, Doc 14). Un único servicio desplegable (P-02).

### Frontend Architecture

No aplica — el frontend (US-135) consume la URL del backend.

### Database Architecture

Conexión a RDS PostgreSQL vía variable/secreto (`DATABASE_URL`); RDS se provisiona en PB-P2-023. Migraciones Prisma se coordinan según Doc 21 (fuera del núcleo de esta historia salvo la ejecución en deploy si se decide).

### API Architecture

Backend expone el API REST (`/api/v1`) y `GET /healthz`; App Runner termina HTTPS.

### AI / PromptOps Architecture

El backend es el único consumidor de OpenAI (configurado vía secreto); esta historia no ejecuta IA.

### Security Architecture

Secretos vía Secrets Manager/SSM (no en imagen/repo); OIDC hacia AWS recomendado; CORS restringido a Amplify; cookies `HttpOnly; Secure; SameSite=None`; sin secretos en logs (Doc 21 §10.5/§10.6).

### Testing Architecture

Smoke de la URL pública y de `/healthz` tras el deploy; el build/quality gates preceden al deploy (PB-P0-017).

---

## 6. Functional Interpretation

| Acceptance Criterion | Technical Interpretation | Impacted Layer(s) |
|---|---|---|
| AC-01 (App Runner configurado) | Servicio App Runner consumiendo imagen ECR; URL pública HTTPS. | DevOps/App Runner |
| AC-02 (deploy automatizado) | GitHub Actions build & push → App Runner deploy/redeploy. | DevOps/CI |
| AC-03 (healthcheck) | Configurar `/healthz` como health check de App Runner. | DevOps, Backend (US-116) |
| AC-04 (vars/secretos) | Vars de runtime + secretos desde Secrets Manager/SSM; imagen sin secretos. | DevOps, Security |
| AC-05 (CORS/cookies/escalado) | `CORS_ALLOWED_ORIGINS`=Amplify; cookies SameSite=None; min 1/max 2–3; CloudWatch. | DevOps, Security |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts
No se modifican; se despliega el backend existente.

### Use Cases / Application Services
No se crean; se ejecuta el servicio existente.

### Controllers / Routes
`GET /healthz` (US-116) usado por App Runner; el resto del API se sirve tal cual.

### DTOs / Schemas
No aplica.

### Repository / Persistence
Conexión a RDS vía `DATABASE_URL` (secreto); RDS en PB-P2-023.

### Validation Rules
* VR-01: imagen sin secretos.
* VR-02: `/healthz` 200 antes de enrutar.
* VR-03: variable/secreto requerido ausente → fail-fast.
* VR-04: `CORS_ALLOWED_ORIGINS` incluye dominio Amplify.

### Error Handling
Arranque fail-fast si falta una variable/secreto requerido; App Runner no enruta si el healthcheck falla.

### Transactions
No aplica.

### Observability
Logs a CloudWatch; propagación de Correlation ID (backend existente); sin secretos en logs.

---

## 8. Frontend Technical Design

No aplica — el frontend consume la URL del backend (US-135).

---

## 9. API Contract Design

| Method | Endpoint | Purpose | Auth Required | Request | Response | Error Cases |
|---|---|---|---|---|---|---|
| GET | `/healthz` | Healthcheck de App Runner | No | — | `200 OK` | Servicio no sano → App Runner no enruta |

El resto del contrato (Doc 16) se sirve por el backend existente; esta historia no lo define.

---

## 10. Database / Prisma Design

### Models Impacted
Ninguno se modifica.

### Connection
`DATABASE_URL` como secreto/variable (RDS en PB-P2-023).

### Migrations Impact
Estrategia de migraciones Prisma según Doc 21; su ejecución en deploy se coordina (fuera del núcleo salvo decisión de Tech Lead).

### Seed Impact
No aplica (seed gestionado en su historia).

---

## 11. AI / PromptOps Design

No aplica — el backend consume OpenAI vía secreto; esta historia no ejecuta IA.

---

## 12. Security & Authorization Design

### Authentication / Authorization
No aplica runtime; configuración de infraestructura.

### Secrets
Secrets Manager/SSM; imagen/repo sin credenciales; OIDC hacia AWS recomendado.

### CORS / Cookies
`CORS_ALLOWED_ORIGINS`=Amplify; cookies `HttpOnly; Secure; SameSite=None` (Doc 21 §10.6).

### Negative Authorization Scenarios
Imagen con secretos → bloqueo; CORS abierto → bloqueo.

### Audit Requirements
Sin secretos en CloudWatch; estado de deploy visible.

### Sensitive Data Handling
El backend es el único consumidor de OpenAI/S3; sin secretos en imagen/logs.

---

## 13. Testing Strategy

### Deploy / Smoke Tests
Smoke de la URL pública del backend y de `/healthz` (200) tras el deploy.

### Security Tests
Verificar imagen sin secretos; CORS restringido; sin secretos en logs.

### Negative Tests
Healthcheck falla → no enruta; secreto ausente → fail-fast; imagen con secretos → deploy bloqueado.

### CI Checks
Quality gates (PB-P0-017) preceden al deploy; build & push de imagen en GitHub Actions.

---

## 14. Observability & Audit

### Logs
CloudWatch Logs (retención 14–30 días); sin secretos.

### Correlation ID
El backend propaga Correlation ID; se centraliza en CloudWatch.

### AdminAction / Error Tracking
N/A a nivel de infraestructura; errores de deploy visibles en App Runner.

### Metrics
Estado del servicio y healthcheck como referencia.

---

## 15. Seed / Demo Data Impact

### Seed Data Required
No aplica en esta historia.

### Demo Scenario Supported
URL pública del backend para demo/QA (consumida por Amplify).

### Reset / Isolation Notes
No aplica.

---

## 16. Documentation Alignment Required

| Document / Source | Conflict | Current Decision | Recommended Action | Blocks Implementation? |
|---|---|---|---|---|
| Metadata US (Priority "(P0)") vs Backlog (P2) | La US marcaba P0; el backlog ubica PB-P2-022 en P2 | Se alinea a P2 (backlog autoritativo) | Corregido en la US | No |
| Naming healthcheck `/healthz` vs `/health` | Backlog PB-P2-022 y US-116 usan `/healthz`; Doc 21 §10.4 dice `/health` | Se adopta `/healthz` (consistente con US-116/backlog) | Confirmar con Tech Lead y unificar Doc 21 | No |
| App Runner vs Elastic Beanstalk | El backlog menciona ambos; ADR-DEVOPS-001 y Doc 21 fijan App Runner | Se adopta App Runner | Mantener App Runner (Beanstalk como alternativa no elegida) | No |
| RDS/Secrets provisioning | Dependen de PB-P2-023/024 | Consumir/referenciar; configurar cuando existan | Coordinar con PB-P2-023/024 | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Secretos en la imagen | Riesgo de seguridad | `.dockerignore` + Secrets Manager/SSM; verificación en deploy |
| Cookies cross-domain no funcionan | Sesión rota en demo | `SameSite=None; Secure` + CORS a Amplify (Doc 21 §10.6) |
| Healthcheck mal configurado | Tráfico a instancias no sanas | `/healthz` como health check; App Runner no enruta si falla |
| RDS/Secrets no disponibles aún | Deploy incompleto | Coordinar con PB-P2-023/024; documentar placeholders |
| Límites de App Runner (concurrencia/memoria) | Degradación bajo carga | Escalamiento modesto (min 1/max 2–3); respetar límites |

---

## 18. Implementation Guidance for Coding Agents

* **Archivos/carpetas probablemente impactados:** configuración de App Runner (consola/IaC si se versiona), workflow de GitHub Actions para build & push a ECR y deploy, `.dockerignore` (PB-P0-016), documentación de env/secretos y CORS.
* **Orden recomendado:** (1) ECR repo + build & push de imagen; (2) servicio App Runner desde la imagen; (3) variables de runtime + referencias a Secrets Manager/SSM; (4) health check `/healthz`; (5) CORS/cookies; (6) escalamiento min/max; (7) CloudWatch logs; (8) deploy automatizado en GitHub Actions; (9) smoke de URL + `/healthz`.
* **Decisiones que no deben reabrirse:** App Runner (ADR-DEVOPS-001); sin Kubernetes; secretos fuera de la imagen; `/healthz` como health check.
* **Qué no implementar:** RDS/Secrets provisioning, custom domain, WAF, SES; cambios de lógica del backend.
* **Suposiciones a preservar:** PB-P0-016 (Dockerfile) y PB-P0-017 (CI) existen; `/healthz` provisto por US-116; RDS/Secrets se coordinan con PB-P2-023/024.

---

## 19. Task Generation Notes

* **Grupos de tareas sugeridos:** (OPS) ECR + build & push; (OPS) servicio App Runner; (OPS) env vars + secretos + escalamiento + CloudWatch; (OPS) health check `/healthz`; (SEC) CORS/cookies + imagen sin secretos; (OPS) deploy automatizado en GitHub Actions; (QA) smoke de URL + `/healthz`; (DOC) env/secretos + naming healthcheck + nota de prioridad.
* **Tareas QA requeridas:** smoke de la URL del backend y `/healthz`.
* **Tareas de seguridad requeridas:** secretos vía Secrets Manager/SSM; imagen sin secretos; CORS/cookies.
* **Tareas de seed/demo requeridas:** ninguna.
* **Tareas de documentación requeridas:** env/secretos, naming healthcheck, nota de prioridad.
* **Dependencias entre tareas:** ECR/imagen antes de App Runner; env/secretos antes del deploy funcional; health check antes de enrutar; smoke tras el deploy.
* **Consolidación:** PB-P2-022 puede consolidar sus tareas en un `tasks.md` propio.

---

## 20. Technical Spec Readiness

| Check | Status |
|---|---|
| User Story approved or explicitly allowed for draft spec | Pass (Approved with Minor Notes) |
| Product Backlog mapping found | Pass (PB-P2-022) |
| Decision Resolution reviewed if present | N/A (no existe) |
| Scope clear | Pass |
| Architecture alignment clear | Pass |
| API impact clear | Pass (`/healthz`; contrato existente) |
| DB impact clear | Pass (conexión vía secreto; RDS en PB-P2-023) |
| AI impact clear | N/A |
| Security impact clear | Pass (secretos, CORS/cookies) |
| Testing strategy clear | Pass (smoke + gates) |
| Ready for Development Task Breakdown | Yes |

---

## 21. Final Recommendation

`Ready for Task Breakdown`

La historia está aprobada, mapeada a PB-P2-022, con alcance claro (App Runner + ECR + deploy automatizado + env/secretos + healthcheck + CORS/cookies + escalamiento mínimo + CloudWatch), sin provisionar RDS/Secrets. Las alertas de Documentation Alignment (prioridad P0→P2 reconciliada; naming `/healthz`; App Runner elegido; RDS/Secrets dependientes) son **no bloqueantes**. Infraestructura, seguridad de secretos y smoke están suficientemente definidos para generar Development Tasks.
