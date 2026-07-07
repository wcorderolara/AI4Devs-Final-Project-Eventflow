# 🧾 User Story: Configurar Secrets Manager

## 🆔 Metadata

| Field              | Value                                |
| ------------------ | ------------------------------------ |
| ID                 | US-138                               |
| Epic               | EPIC-OPS-001                         |
| Feature            | Secrets (AWS Secrets Manager)        |
| Backlog Item       | PB-P2-024                            |
| Module / Domain    | DevOps / Security                   |
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

**As the** equipo DevOps / Security
**I want** almacenar los secretos del backend (`DATABASE_URL`, `SESSION_SECRET`, `COOKIE_SECRET`, `CAPTCHA_SECRET_KEY`, `OPENAI_API_KEY`) en AWS Secrets Manager con IAM de mínimo alcance y una rotación documentada en runbook
**So that** ningún secreto viva en el repositorio ni en variables de entorno planas.

---

## 🧠 Business Context

### Context Summary
Los valores sensibles se almacenan en **AWS Secrets Manager** (Doc 21 §14, ADR-SEC-001) y se referencian en runtime desde App Runner (US-136). La imagen y el repositorio no contienen credenciales; existe un `.env.example` con los **nombres** de todas las variables y **sin** valores reales (Doc 21 §14.6). El acceso se otorga con **IAM de mínimo alcance** (el rol de App Runner lee solo los secretos que necesita). La **rotación es manual en el MVP** y queda documentada en un runbook.

### Related Domain Concepts
* Secretos del backend: `DATABASE_URL`, `SESSION_SECRET`, `COOKIE_SECRET`, `CAPTCHA_SECRET_KEY`, `OPENAI_API_KEY`.
* Variables de configuración (no secretas) que viven en App Runner env (no en Secrets Manager).
* IAM least-privilege; OIDC hacia AWS recomendado para CI.

### Assumptions
* La estrategia de secretos está definida en `/docs/21-Deployment-and-DevOps-Design.md` §14 y `/docs/19-Security-and-Authorization-Design.md` (ADR-SEC-001).
* El backend está desplegado (PB-P2-022) y consume los secretos en runtime.
* La rotación automática no es requisito del MVP (manual + runbook).

### Dependencies
* PB-P2-022 — Backend desplegado en App Runner (consumidor de los secretos).

---

## 🔗 Traceability

| Source                 | Reference                                                        |
| ---------------------- | --------------------------------------------------------------- |
| FRD Requirement(s)     | Transversal — no implementa un UC; habilita la gestión segura de secretos. |
| Use Case(s)            | Transversal.                                                    |
| Business Rule(s)       | Transversal — política de secretos fuera del repo.              |
| Permission Rule(s)     | IAM de mínimo alcance (rol de App Runner).                      |
| Data Entity / Entities | No aplica.                                                      |
| API Endpoint(s)        | No aplica.                                                      |
| NFR Reference(s)       | NFR-OBS-001, NFR-TEST-*, NFR-PERF-API-001                       |
| Related ADR(s)         | ADR-SEC-001 (prevención de exposición de tokens), ADR-DEVOPS-001, ADR-TEST-001 |
| Related Document(s)    | /docs/21-Deployment-and-DevOps-Design.md (§14), /docs/19-Security-and-Authorization-Design.md |
| Backlog Item           | PB-P2-024                                                        |

---

## 🧭 Scope Guardrails

### MVP Scope
* Scope Classification: In Scope
* MVP Relevance: Must Have (P2)

### In Scope
* Almacenar los **secretos del backend** en AWS Secrets Manager por entorno (QA/Demo): `DATABASE_URL`, `SESSION_SECRET`, `COOKIE_SECRET`, `CAPTCHA_SECRET_KEY`, `OPENAI_API_KEY`.
* Referenciar los secretos desde **App Runner** en runtime (no en imagen/repo).
* **IAM de mínimo alcance**: el rol de App Runner lee solo los secretos de su entorno.
* **`.env.example`** con los nombres de todas las variables y sin valores reales.
* **Sin secretos en logs** ni artefactos.
* **Runbook de rotación** (manual en MVP).

### Explicitly Out of Scope
* Rotación automática de secretos (manual en MVP; runbook).
* Variables de configuración **no secretas** (viven en App Runner env, no en Secrets Manager).
* Provisión de App Runner (PB-P2-022) y RDS (PB-P2-023) en sí (se referencian).
* Configuración de OIDC/GitHub Actions en detalle (referenciada; el deploy es US-136/US-132).
* Funciones futuras no listadas en el Epic Map.

### Scope Notes
* Ningún secreto vive en el repositorio (Doc 21 §14.6, principio P-04).
* Solo variables secretas van a Secrets Manager; las de config van a App Runner env.

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Secretos almacenados fuera del repo
**Given** los secretos del backend por entorno
**When** se configuran
**Then** `DATABASE_URL`, `SESSION_SECRET`, `COOKIE_SECRET`, `CAPTCHA_SECRET_KEY` y `OPENAI_API_KEY` están en AWS Secrets Manager y ninguno vive en el repositorio ni en variables de entorno planas.

### AC-02: IAM de mínimo alcance
**Given** el rol de App Runner
**When** el backend lee los secretos en runtime
**Then** el rol tiene permisos de mínimo alcance para leer únicamente los secretos de su entorno, sin acceso a otros.

### AC-03: `.env.example` con nombres sin valores
**Given** el repositorio
**When** se revisa
**Then** existe `.env.example` con los nombres de todas las variables (secretas y de config) y sin valores reales.

### AC-04: Sin secretos en logs
**Given** la ejecución del backend/CI
**When** se generan logs y artefactos
**Then** ningún secreto ni cadena de conexión aparece en logs ni en artefactos.

### AC-05: Rotación documentada
**Given** la necesidad de rotar un secreto
**When** se ejecuta el procedimiento
**Then** existe un runbook que documenta la rotación manual (actualizar el secreto en Secrets Manager y refrescar/redeploy del servicio).

---

## ⚠️ Edge Cases

### EC-01: Secreto requerido ausente en runtime
**Given** un secreto requerido no configurado
**When** el backend arranca
**Then** el arranque falla de forma controlada (fail-fast) con un mensaje claro que no expone el valor.

#### Handling
* Validar presencia de secretos requeridos al arrancar.

### EC-02: IAM demasiado amplio
**Given** un rol con permisos excesivos
**When** se revisa la configuración
**Then** se señala/bloquea el exceso (principio de mínimo privilegio).

#### Handling
* Revisión de la política IAM; ajustar al mínimo alcance.

---

## 🚫 Validation Rules

| ID    | Rule                                                        | Message / Behavior                          |
| ----- | ---------------------------------------------------------- | ------------------------------------------- |
| VR-01 | Ningún secreto en el repositorio                           | Bloquear si se detecta un secreto en repo   |
| VR-02 | Secretos referenciados desde Secrets Manager en runtime     | Fail-fast si un secreto requerido falta     |
| VR-03 | IAM de mínimo alcance                                       | Señalar/bloquear permisos excesivos         |
| VR-04 | `.env.example` presente con nombres y sin valores           | Config inválida si falta                    |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                |
| ------ | ------------------------------------------------------------------- |
| SEC-01 | Aplicar las políticas de seguridad del Doc 19 (ADR-SEC-001).        |
| SEC-02 | Todos los secretos vía Secrets Manager; nunca en repo/imagen/env plano. |
| SEC-03 | Sin secretos en logs ni artefactos.                                 |
| SEC-04 | IAM de mínimo alcance para el rol de App Runner; OIDC hacia AWS recomendado para CI. |

### Negative Authorization Scenarios
* Secreto en el repositorio → bloqueo.
* IAM excesivo → señalado/bloqueado.

---

## 🤖 AI Behavior

This story does not invoke AI directly.

### AI Involvement
* AI Feature: None (gestiona `OPENAI_API_KEY` como secreto; no ejecuta IA).
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
* Not applicable for this story. (`OPENAI_API_KEY` solo se usa cuando `LLM_PROVIDER=openai`; en CI se usa Mock.)

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
| Accessibility Notes | N/A — historia de infraestructura/seguridad. |
| Responsive Notes    | N/A   |
| i18n Notes          | N/A   |
| Currency Notes      | No aplica. |

---

## 🛠 Technical Notes

### Frontend
* Route / Page: N/A (el frontend solo usa variables públicas `NEXT_PUBLIC_*`, no secretos).
* Components: N/A
* State Management: N/A
* Forms: N/A
* API Client: N/A

### Backend
* Use Case / Service: N/A (consume los secretos en runtime; no modifica lógica).
* Controller / Route: N/A
* Authorization Policy: IAM de mínimo alcance para leer secretos.
* Validation: Presencia de secretos requeridos al arrancar.
* Transaction Required: N/A
* Herramientas: AWS Secrets Manager, IAM, App Runner (referencia de secretos).

### Database
* Main Tables: N/A
* Constraints: N/A
* Index Considerations: N/A

### DevOps / Config
* Secretos: `DATABASE_URL`, `SESSION_SECRET`, `COOKIE_SECRET`, `CAPTCHA_SECRET_KEY`, `OPENAI_API_KEY` en Secrets Manager por entorno.
* Config (no secreto) en App Runner env: `NODE_ENV`, `APP_ENV`, `PORT`, `CORS_ALLOWED_ORIGINS`, `LOG_LEVEL`, `S3_*`, `LLM_PROVIDER`, etc.
* IAM least-privilege; OIDC hacia AWS para CI.
* `.env.example` con nombres, sin valores.
* Runbook de rotación manual.

### Observability / Audit
* Correlation ID Required: N/A a nivel de secretos.
* Log Event Required: Sin secretos en logs.
* AdminAction Required: No
* AIRecommendation Required: No

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                    | Type   |
| ----- | ---------------------------------------------------------- | ------ |
| TS-01 | Backend lee los secretos desde Secrets Manager en runtime   | Config |
| TS-02 | `.env.example` con nombres y sin valores                    | Config |
| TS-03 | IAM de mínimo alcance para el rol de App Runner             | Config |
| TS-04 | Runbook de rotación documentado                            | Docs   |

### Negative Tests

| ID    | Scenario                                   | Expected Result                     |
| ----- | ------------------------------------------ | ----------------------------------- |
| NT-01 | Secreto requerido ausente en runtime       | Fail-fast controlado                |
| NT-02 | Secreto en el repositorio                  | Bloqueado                           |
| NT-03 | IAM excesivo                               | Señalado/bloqueado                  |
| NT-04 | Secreto aparece en logs                    | Test/revisión falla                 |

### AI Tests
Not applicable for this story.

### Authorization Tests

| ID         | Scenario                          | Expected Result |
| ---------- | --------------------------------- | --------------- |
| AUTH-TS-01 | Rol lee solo secretos de su entorno | Success (least-privilege) |

### Accessibility Tests
* No aplica — historia de infraestructura/seguridad.

---

## 📊 Business Impact

| Field               | Value                                                |
| ------------------- | ---------------------------------------------------- |
| KPI Affected        | Seguridad, compliance mínimo, confianza               |
| Expected Impact     | Secretos fuera del repo; acceso de mínimo privilegio  |
| Success Criteria    | Secretos en Secrets Manager; IAM scope mínimo; rotación documentada |
| Academic Demo Value | Alto — evidencia de gestión segura de secretos        |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks
* No aplica.

### Potential Backend Tasks
* Validación de presencia de secretos al arrancar (fail-fast).

### Potential Database Tasks
* No aplica (`DATABASE_URL` se referencia; RDS en PB-P2-023).

### Potential AI / PromptOps Tasks
* Gestionar `OPENAI_API_KEY` como secreto (solo `LLM_PROVIDER=openai`).

### Potential QA Tasks
* Verificar lectura de secretos, IAM mínimo y ausencia de secretos en logs.

### Potential DevOps / Config Tasks
* Crear secretos en Secrets Manager por entorno; políticas IAM; `.env.example`; runbook de rotación.

---

## ✅ Definition of Ready

* [x] Rol claro (System / equipo DevOps-Security).
* [x] Goal técnico claro.
* [x] Referencias a Docs (Doc 21 §14, Doc 19, ADR-SEC-001).
* [x] Permisos / Seguridad (núcleo de la historia).
* [x] Entidades listadas (N/A).
* [x] AC en GWT.
* [x] Edge cases documentados.
* [x] Validación clara.
* [x] Out of Scope explícito (rotación automática fuera).
* [x] Dependencias conocidas (PB-P2-022).
* [x] UX states identificados (N/A — infra).
* [x] API definida (N/A).
* [x] Tests definidos.
* [ ] Tech Lead validó.

---

## 🏁 Definition of Done

* [ ] Secretos del backend en Secrets Manager por entorno; ninguno en repo/env plano.
* [ ] Referenciados desde App Runner en runtime.
* [ ] IAM de mínimo alcance para el rol de App Runner.
* [ ] `.env.example` con nombres y sin valores.
* [ ] Sin secretos en logs/artefactos.
* [ ] Runbook de rotación manual documentado.
* [ ] Tech Lead valida.

---

## 📝 Notes
* Documentation Alignment: la metadata original marcaba "Priority: Must Have (P0)", pero el Product Backlog ubica esta historia en **PB-P2-024 (P2)**. Se alinea a **P2** (fuente autoritativa: Product Backlog Prioritized).
* Documentation Alignment: el backlog nombra `CAPTCHA_SECRET` y `COOKIE_SIGNING_KEY`; Doc 21 §14.2 usa `CAPTCHA_SECRET_KEY`, `COOKIE_SECRET` y `SESSION_SECRET`. Se adoptan los **nombres canónicos de Doc 21 §14.2**; confirmar con Tech Lead.
* La rotación automática y las variables de config (no secretas) quedan fuera de alcance.
