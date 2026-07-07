# 🧾 User Story: Deploy backend en servicio gestionado AWS

## 🆔 Metadata

| Field              | Value                                |
| ------------------ | ------------------------------------ |
| ID                 | US-136                               |
| Epic               | EPIC-OPS-001                         |
| Feature            | App Runner (managed backend)         |
| Backlog Item       | PB-P2-022                            |
| Module / Domain    | DevOps                              |
| User Role          | System                               |
| Priority           | Must Have (P2)                       |
| Status             | Approved                             |
| Owner              | Product Owner / Business Analyst     |
| Approved By        | PO/BA Review                         |
| Approval Date      | 2026-07-07                           |
| Ready for Development Tasks | Yes                         |
| Sprint / Milestone | MVP                                  |
| Created Date       | 2026-06-09                           |
| Last Updated       | 2026-07-07                           |

---

## 🎯 User Story

**As the** equipo DevOps
**I want** desplegar el backend Node.js + Express dockerizado en un servicio gestionado de AWS (App Runner, por ADR-DEVOPS-001) con escalamiento mínimo, variables de entorno, secretos desde Secrets Manager/SSM y healthcheck
**So that** no operemos infraestructura manualmente y el backend quede accesible desde el frontend (Amplify) para QA/Demo.

---

## 🧠 Business Context

### Context Summary
El backend se empaqueta como **imagen Docker** (multi-stage, PB-P0-016) y se despliega en **AWS App Runner** (Doc 21 §10), que corre el contenedor detrás de HTTPS sin operar Kubernetes. El deploy es **automatizado** vía GitHub Actions (build & push de la imagen a ECR, deploy en App Runner). App Runner inyecta las **variables de entorno** en runtime y referencia los valores sensibles desde **Secrets Manager/SSM** (la imagen no contiene secretos). Un **healthcheck** (`/healthz`) permite a App Runner verificar disponibilidad. El **escalamiento** es mínimo (min 1, max 2–3). Los logs se centralizan en CloudWatch.

### Related Domain Concepts
* Imagen Docker multi-stage del backend (PB-P0-016) en Amazon ECR.
* App Runner como runtime gestionado del contenedor.
* Healthcheck `/healthz` (provisto por US-116) usado por App Runner.
* Secretos vía Secrets Manager/SSM; CORS/cookies para el cruce Amplify ↔ App Runner.

### Assumptions
* La estrategia de despliegue del backend está definida en `/docs/21-Deployment-and-DevOps-Design.md` §10 (ADR-DEVOPS-001).
* El Dockerfile multi-stage (PB-P0-016) y el pipeline CI (PB-P0-017) existen.
* El endpoint de healthcheck existe (US-116).
* RDS (PB-P2-023) y Secrets Manager (PB-P2-024) se abordan en sus historias; esta consume su configuración.

### Dependencies
* PB-P0-016 — Dockerfile multi-stage del backend.
* PB-P0-017 — Pipeline CI (quality gates antes de desplegar).

---

## 🔗 Traceability

| Source                 | Reference                                                        |
| ---------------------- | --------------------------------------------------------------- |
| FRD Requirement(s)     | Transversal — no implementa un UC; habilita la URL pública del backend. |
| Use Case(s)            | Transversal.                                                    |
| Business Rule(s)       | Transversal.                                                    |
| Permission Rule(s)     | No aplica runtime — configuración de infraestructura.           |
| Data Entity / Entities | No aplica (la conexión a RDS se configura vía env/secretos).    |
| API Endpoint(s)        | `GET /healthz` (US-116) usado por App Runner para disponibilidad. |
| NFR Reference(s)       | NFR-PERF-API-001, NFR-OBS-001, NFR-TEST-*                       |
| Related ADR(s)         | ADR-DEVOPS-001 (AWS/App Runner), ADR-TEST-001                   |
| Related Document(s)    | /docs/21-Deployment-and-DevOps-Design.md (§8, §10, §16), /docs/14-Backend-Technical-Design.md |
| Backlog Item           | PB-P2-022                                                        |

---

## 🧭 Scope Guardrails

### MVP Scope
* Scope Classification: In Scope
* MVP Relevance: Must Have (P2)

### In Scope
* Configuración del servicio **App Runner** consumiendo la imagen del backend desde **ECR** (PB-P0-016).
* **Deploy automatizado** vía GitHub Actions (build & push de imagen; deploy/redeploy en App Runner).
* **Variables de entorno** de runtime inyectadas por App Runner; **secretos** referenciados desde Secrets Manager/SSM (no en la imagen).
* **Healthcheck** (`/healthz`) configurado en App Runner para verificar disponibilidad.
* **CORS** (`CORS_ALLOWED_ORIGINS` = dominio Amplify) y **cookies** (`HttpOnly; Secure; SameSite=None`).
* **Escalamiento mínimo** (min 1, max 2–3; CPU/memoria modestas).
* **Logs** centralizados en CloudWatch.
* **URL pública** del backend operativa para QA/Demo.

### Explicitly Out of Scope
* Provisión de RDS PostgreSQL (PB-P2-023) — se consume vía env/secretos.
* Provisión de Secrets Manager en sí (PB-P2-024) — se referencia.
* Custom domain / Route 53, WAF, SES (opcional/futuro).
* El Dockerfile (PB-P0-016) y el workflow de quality gates (US-132 / PB-P0-017).
* Kubernetes/clusters (fuera del MVP por principio P-09).
* Funciones futuras no listadas en el Epic Map.

### Scope Notes
* Sin Kubernetes; App Runner basta (Doc 21 P-09).
* Secretos fuera del repo/imagen (P-04); el backend es el único consumidor de OpenAI/S3.
* Preferir redeploy de imagen previa a parches en caliente (P-12, rollback).

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Servicio App Runner configurado
**Given** la imagen Docker del backend en ECR (PB-P0-016)
**When** se configura App Runner
**Then** el servicio gestionado corre el contenedor detrás de HTTPS y expone una URL pública del backend.

### AC-02: Deploy automatizado
**Given** una nueva imagen del backend
**When** GitHub Actions hace build & push a ECR
**Then** App Runner despliega/redespliega automáticamente la nueva imagen.

### AC-03: Healthcheck accesible
**Given** el servicio en App Runner
**When** App Runner verifica disponibilidad
**Then** `GET /healthz` responde 200 y App Runner lo usa para enrutar tráfico solo cuando el servicio está sano.

### AC-04: Variables y secretos en runtime
**Given** la configuración del servicio
**When** el contenedor arranca
**Then** las variables de entorno están inyectadas y los valores sensibles se referencian desde Secrets Manager/SSM; la imagen no contiene secretos y no hay secretos en logs.

### AC-05: CORS, cookies y escalamiento
**Given** el cruce Amplify ↔ App Runner
**When** el backend responde
**Then** `CORS_ALLOWED_ORIGINS` incluye el dominio Amplify, las cookies se emiten `HttpOnly; Secure; SameSite=None`, el escalamiento es mínimo (min 1, max 2–3) y los logs van a CloudWatch.

---

## ⚠️ Edge Cases

### EC-01: Healthcheck falla
**Given** el contenedor no responde `/healthz`
**When** App Runner verifica disponibilidad
**Then** App Runner no enruta tráfico a la instancia no sana y mantiene la versión anterior (rollback), con el fallo visible.

#### Handling
* App Runner no promueve un deploy no sano; redeploy de imagen previa disponible.

### EC-02: Secreto o variable requerida ausente
**Given** una variable/secreto requerido no configurado
**When** el contenedor arranca
**Then** el arranque falla de forma controlada (fail-fast) con un mensaje claro.

#### Handling
* Validar presencia de variables/secretos requeridos al arrancar.

---

## 🚫 Validation Rules

| ID    | Rule                                                        | Message / Behavior                          |
| ----- | ---------------------------------------------------------- | ------------------------------------------- |
| VR-01 | La imagen no contiene secretos                             | Bloquear deploy si se detectan secretos     |
| VR-02 | `/healthz` responde 200 antes de enrutar tráfico           | App Runner no enruta si no está sano        |
| VR-03 | Variable/secreto requerido ausente                         | Fail-fast al arrancar                       |
| VR-04 | `CORS_ALLOWED_ORIGINS` incluye el dominio Amplify          | Sesión/CORS falla si no está configurado    |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                |
| ------ | ------------------------------------------------------------------- |
| SEC-01 | Aplicar políticas de seguridad del Doc 19/Doc 21.                    |
| SEC-02 | Secretos vía Secrets Manager/SSM; nunca en la imagen ni en el repo (OIDC hacia AWS recomendado). |
| SEC-03 | Sin secretos en logs de CloudWatch.                                 |
| SEC-04 | Cookies `HttpOnly; Secure; SameSite=None`; CORS restringido al dominio Amplify. |

### Negative Authorization Scenarios
* Imagen con secretos → bloqueo del deploy.
* Configuración insegura (CORS abierto, secretos en env plano) → bloqueo.

---

## 🤖 AI Behavior

This story does not invoke AI directly.

### AI Involvement
* AI Feature: None (el backend es el único consumidor de OpenAI, configurado vía secretos; esta historia no ejecuta IA).
* Provider Layer: Not applicable
* Human Validation Required: Not applicable
* Persist AIRecommendation: No
* Fallback Required: Not applicable

### AI Input
* Not applicable for this story.

### AI Output
* Not applicable for this story.

### Human-in-the-loop Rules
* Not applicable for this story.

### AI Error / Fallback Behavior
* Not applicable for this story.

---

## 🎨 UX / UI Notes

| Area                | Notes |
| ------------------- | ----- |
| Screen / Route      | N/A   |
| Main UI Pattern     | N/A   |
| Primary Action      | N/A   |
| Secondary Actions   | N/A   |
| Empty State         | N/A   |
| Loading State       | N/A   |
| Error State         | N/A   |
| Success State       | N/A   |
| Accessibility Notes | N/A — historia de infraestructura/DevOps. |
| Responsive Notes    | N/A   |
| i18n Notes          | N/A   |
| Currency Notes      | No aplica. |

---

## 🛠 Technical Notes

### Frontend
* Route / Page: N/A (el frontend consume la URL del backend vía `NEXT_PUBLIC_API_BASE_URL`, US-135).
* Components: N/A
* State Management: N/A
* Forms: N/A
* API Client: N/A

### Backend
* Use Case / Service: N/A (esta historia despliega el backend existente; no modifica su lógica).
* Controller / Route: `GET /healthz` (US-116) usado por App Runner.
* Authorization Policy: N/A (runtime authorization ya existente).
* Validation: Presencia de variables/secretos requeridos al arrancar.
* Transaction Required: N/A
* Herramientas: AWS App Runner, Amazon ECR, CloudWatch, Secrets Manager/SSM.

### Database
* Main Tables: N/A (conexión a RDS vía env/secretos; RDS en PB-P2-023).
* Constraints: N/A
* Index Considerations: N/A

### DevOps / Config
* Runtime: App Runner (min 1, max 2–3; CPU/memoria modestas).
* Registry: Amazon ECR (privado).
* Deploy: GitHub Actions build & push imagen → App Runner deploy.
* Env/secretos: variables en App Runner; sensibles en Secrets Manager/SSM.
* CORS/cookies: `CORS_ALLOWED_ORIGINS` = Amplify; `HttpOnly; Secure; SameSite=None`.
* Healthcheck: `/healthz`.

### Observability / Audit
* Correlation ID Required: Sí (el backend lo propaga; se centraliza en CloudWatch).
* Log Event Required: Sí; sin secretos en logs.
* AdminAction Required: No
* AIRecommendation Required: No

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                    | Type   |
| ----- | ---------------------------------------------------------- | ------ |
| TS-01 | App Runner corre la imagen y expone URL pública            | Deploy |
| TS-02 | Build & push a ECR dispara redeploy                        | Deploy |
| TS-03 | `GET /healthz` responde 200 y App Runner lo usa            | Deploy |
| TS-04 | Variables/secretos en runtime desde Secrets Manager/SSM     | Config |

### Negative Tests

| ID    | Scenario                                   | Expected Result                     |
| ----- | ------------------------------------------ | ----------------------------------- |
| NT-01 | Healthcheck falla                          | App Runner no enruta; versión anterior activa |
| NT-02 | Secreto/variable requerido ausente         | Fail-fast al arrancar               |
| NT-03 | Imagen con secretos                        | Deploy bloqueado                    |
| NT-04 | CORS sin dominio Amplify                    | Sesión/CORS falla                   |

### AI Tests
Not applicable for this story.

### Authorization Tests

| ID         | Scenario                          | Expected Result |
| ---------- | --------------------------------- | --------------- |
| AUTH-TS-01 | Servicio App Runner configurado   | URL pública operativa |

### Accessibility Tests
* No aplica — historia de infraestructura.

---

## 📊 Business Impact

| Field               | Value                                                |
| ------------------- | ---------------------------------------------------- |
| KPI Affected        | Demo readiness, time-to-deploy, confiabilidad         |
| Expected Impact     | Backend accesible desde Amplify para QA/Demo, sin ops manual |
| Success Criteria    | Servicio gestionado configurado; deploy automatizado; `/healthz` accesible |
| Academic Demo Value | Alto — backend demostrable en URL pública gestionada  |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks
* No aplica.

### Potential Backend Tasks
* No aplica (se despliega el backend existente).

### Potential Database Tasks
* Configurar la conexión a RDS vía env/secretos (RDS en PB-P2-023).

### Potential AI / PromptOps Tasks
* No aplica (OpenAI se configura vía secretos).

### Potential QA Tasks
* Smoke de la URL del backend y de `/healthz` tras el deploy.

### Potential DevOps / Config Tasks
* Configurar ECR + App Runner; deploy automatizado; env/secretos; healthcheck; CORS/cookies; escalamiento; CloudWatch.

---

## ✅ Definition of Ready

* [x] Rol claro (System / equipo DevOps).
* [x] Goal técnico claro.
* [x] Referencias a Docs (Doc 21 §10, ADR-DEVOPS-001).
* [x] Permisos / Seguridad (secretos fuera de la imagen; CORS/cookies).
* [x] Entidades listadas (N/A; conexión a RDS vía env).
* [x] AC en GWT.
* [x] Edge cases documentados.
* [x] Validación clara.
* [x] Out of Scope explícito (RDS/Secrets/domain fuera).
* [x] Dependencias conocidas (PB-P0-016, PB-P0-017).
* [x] UX states identificados (N/A — infra).
* [x] API definida (`/healthz`).
* [x] Tests definidos.
* [ ] Tech Lead validó.

---

## 🏁 Definition of Done

* [ ] App Runner configurado consumiendo la imagen de ECR.
* [ ] Deploy automatizado por GitHub Actions.
* [ ] `/healthz` accesible y usado por App Runner.
* [ ] Variables/secretos en runtime desde Secrets Manager/SSM; imagen sin secretos.
* [ ] CORS/cookies configurados; escalamiento mínimo; logs en CloudWatch.
* [ ] Tech Lead valida.

---

## 📝 Notes
* Documentation Alignment: la metadata original marcaba "Priority: Must Have (P0)", pero el Product Backlog ubica esta historia en **PB-P2-022 (P2)**. Se alinea a **P2** (fuente autoritativa: Product Backlog Prioritized).
* Documentation Alignment: el backlog PB-P2-022 y US-116 usan `/healthz`; Doc 21 §10.4 menciona `/health`. Se adopta **`/healthz`** (consistente con US-116/backlog); confirmar con Tech Lead.
* No incluye provisión de RDS (PB-P2-023) ni de Secrets Manager (PB-P2-024); se consumen/referencian.
