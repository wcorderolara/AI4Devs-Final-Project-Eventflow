# 🧾 User Story: Deploy frontend en Amplify

## 🆔 Metadata

| Field              | Value                                |
| ------------------ | ------------------------------------ |
| ID                 | US-135                               |
| Epic               | EPIC-OPS-001                         |
| Feature            | Amplify Hosting                      |
| Backlog Item       | PB-P2-021                            |
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
**I want** desplegar el frontend Next.js en AWS Amplify Hosting con integración a GitHub, builds automatizados por branch, variables de entorno por ambiente y dominios QA/Demo
**So that** la demo y el staging estén disponibles públicamente en una URL.

---

## 🧠 Business Context

### Context Summary
El frontend Next.js (App Router) se despliega en **AWS Amplify Hosting** con integración directa al repositorio GitHub (Doc 21 §9). Los builds se disparan por push a las ramas mapeadas (`main` → Demo, `staging`/`qa` → QA), ejecutan el comando de build (`npm ci`, `lint`, `typecheck`, `test`, `build`) y publican una URL pública. Las variables de entorno públicas (`NEXT_PUBLIC_*`) se configuran por ambiente; las sensibles no se exponen al cliente. Amplify conserva builds anteriores para permitir rollback.

### Related Domain Concepts
* Amplify Hosting + integración GitHub + branch mappings.
* Variables de entorno públicas del frontend (`NEXT_PUBLIC_*`).
* `NEXT_PUBLIC_API_BASE_URL` apuntando al backend en App Runner por ambiente.

### Assumptions
* La estrategia de despliegue está definida en `/docs/21-Deployment-and-DevOps-Design.md` §9 (ADR-DEVOPS-001).
* El frontend base existe (PB-P0-012) y el pipeline CI (PB-P0-017) valida antes del build.
* El backend (App Runner) y sus URLs por ambiente se abordan en PB-P2-022 (esta historia consume su URL).

### Dependencies
* PB-P0-012 — Frontend Next.js Bootstrap & i18n.
* PB-P0-017 — Pipeline CI (quality gates antes de desplegar).

---

## 🔗 Traceability

| Source                 | Reference                                                        |
| ---------------------- | --------------------------------------------------------------- |
| FRD Requirement(s)     | Transversal — no implementa un UC; habilita la URL pública del frontend. |
| Use Case(s)            | Transversal.                                                    |
| Business Rule(s)       | Transversal.                                                    |
| Permission Rule(s)     | No aplica runtime — configuración de hosting.                   |
| Data Entity / Entities | No aplica.                                                      |
| API Endpoint(s)        | No aplica (consume `NEXT_PUBLIC_API_BASE_URL` del backend).      |
| NFR Reference(s)       | NFR-OBS-001, NFR-PERF-API-001, NFR-TEST-*                       |
| Related ADR(s)         | ADR-DEVOPS-001 (AWS/Amplify), ADR-TEST-001                      |
| Related Document(s)    | /docs/21-Deployment-and-DevOps-Design.md (§9, §16), /docs/15-Frontend-Architecture-Design.md |
| Backlog Item           | PB-P2-021                                                        |

---

## 🧭 Scope Guardrails

### MVP Scope
* Scope Classification: In Scope
* MVP Relevance: Must Have (P2)

### In Scope
* Configuración de **Amplify Hosting** conectado al repo GitHub.
* **Branch mappings**: `main` → Demo, `staging`/`qa` → QA (build automatizado por push).
* **Build command** Amplify (`npm ci`, `lint`, `typecheck`, `test`, `build`).
* **Variables de entorno públicas** (`NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_APP_ENV`, `NEXT_PUBLIC_CAPTCHA_SITE_KEY`) por ambiente.
* Configuración de **`NEXT_PUBLIC_API_BASE_URL`** apuntando al backend (App Runner) por ambiente.
* Documentar la asunción de **cookies/CORS** (`SameSite=None; Secure`, `credentials: true`) para Amplify ↔ App Runner.
* **Rollback** a un build anterior de Amplify.
* **URL pública** operativa para Demo/QA.

### Explicitly Out of Scope
* Deploy del backend en App Runner (PB-P2-022).
* RDS PostgreSQL gestionado (PB-P2-023).
* Secrets Manager (PB-P2-024).
* Custom domain / Route 53 (opcional/futuro — las URLs de Amplify alcanzan para evaluar).
* El workflow de quality gates de CI (US-132 / PB-P0-017).
* Funciones futuras no listadas en el Epic Map.

### Scope Notes
* Solo variables **públicas** en el frontend; las sensibles nunca se exponen al cliente (Doc 21 §9.3).
* El frontend nunca accede directamente a OpenAI, RDS, S3 ni Secrets Manager (Doc 21 §9.8).

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Amplify conectado al repo con branch mappings
**Given** el repositorio GitHub del frontend
**When** se configura Amplify Hosting
**Then** Amplify está conectado al repo con branch mappings (`main` → Demo, `staging`/`qa` → QA) y un push a una rama mapeada dispara un build.

### AC-02: Build verde y URL pública operativa
**Given** un push a una rama mapeada
**When** Amplify ejecuta el build (`npm ci`, `lint`, `typecheck`, `test`, `build`)
**Then** el build es verde y la URL pública del ambiente correspondiente sirve el frontend Next.js.

### AC-03: Variables de entorno por ambiente
**Given** los ambientes Demo y QA
**When** se configura Amplify
**Then** las variables públicas (`NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_APP_ENV`, `NEXT_PUBLIC_CAPTCHA_SITE_KEY`) están definidas por ambiente y ninguna variable sensible se expone al cliente.

### AC-04: API base y cookies/CORS documentados
**Given** el backend en App Runner por ambiente
**When** se configura `NEXT_PUBLIC_API_BASE_URL`
**Then** apunta a la URL correcta del backend por ambiente y se documenta la asunción de cookies/CORS (`SameSite=None; Secure`, `credentials: true`) para el cruce Amplify ↔ App Runner.

### AC-05: Rollback
**Given** un build problemático
**When** se requiere revertir
**Then** es posible volver a un build anterior de Amplify (o revertir el commit y disparar un nuevo build).

---

## ⚠️ Edge Cases

### EC-01: Build falla
**Given** un push que rompe el build (lint/typecheck/test/build)
**When** Amplify ejecuta el pipeline
**Then** el deploy no se publica y el build anterior permanece activo, con el fallo visible.

#### Handling
* Amplify no promueve un build fallido; el anterior sigue sirviendo.

### EC-02: Variable de entorno requerida ausente
**Given** una variable pública requerida no configurada
**When** corre el build o el runtime
**Then** el fallo es controlado (fail-fast / build falla) con un mensaje claro.

#### Handling
* Validar presencia de variables públicas requeridas por ambiente.

---

## 🚫 Validation Rules

| ID    | Rule                                                        | Message / Behavior                          |
| ----- | ---------------------------------------------------------- | ------------------------------------------- |
| VR-01 | Solo variables públicas (`NEXT_PUBLIC_*`) en el frontend    | Bloquear si se intenta exponer una sensible |
| VR-02 | Build ejecuta lint/typecheck/test/build                     | Deploy solo si el build es verde            |
| VR-03 | Variable pública requerida ausente                          | Fail-fast / build falla                     |
| VR-04 | `NEXT_PUBLIC_API_BASE_URL` válido por ambiente              | Fail-fast si falta/incorrecto               |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                |
| ------ | ------------------------------------------------------------------- |
| SEC-01 | Aplicar políticas de seguridad del Doc 19/Doc 21 en la config.      |
| SEC-02 | Variables sensibles vía Secrets Manager (no en el frontend); OIDC hacia AWS recomendado. |
| SEC-03 | Sin secretos en logs de build ni expuestos al cliente.              |
| SEC-04 | El frontend no accede directamente a OpenAI/RDS/S3/Secrets Manager (Doc 21 §9.8). |

### Negative Authorization Scenarios
* Intento de exponer una variable sensible al cliente → bloqueo.
* Configuración insegura → fail-fast.

---

## 🤖 AI Behavior

This story does not invoke AI directly.

### AI Involvement
* AI Feature: None
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
| Screen / Route      | N/A (se sirve la app existente). |
| Main UI Pattern     | N/A   |
| Primary Action      | N/A   |
| Secondary Actions   | N/A   |
| Empty State         | N/A   |
| Loading State       | N/A   |
| Error State         | N/A   |
| Success State       | N/A   |
| Accessibility Notes | N/A — historia de hosting/DevOps. |
| Responsive Notes    | N/A   |
| i18n Notes          | Las páginas públicas SEO-friendly se sirven correctamente (Doc 21 §9.6). |
| Currency Notes      | No aplica. |

---

## 🛠 Technical Notes

### Frontend
* Route / Page: N/A (se despliega la app existente; páginas públicas SEO-friendly).
* Components: N/A
* State Management: N/A
* Forms: N/A
* API Client: Consume `NEXT_PUBLIC_API_BASE_URL` (backend App Runner).
* Herramientas: AWS Amplify Hosting, Next.js App Router.

### Backend
* Use Case / Service: N/A (esta historia no modifica el backend; consume su URL).
* Controller / Route: N/A
* Authorization Policy: N/A
* Validation: N/A
* Transaction Required: N/A

### Database
* Main Tables: N/A
* Constraints: N/A
* Index Considerations: N/A

### DevOps / Config
* Hosting: AWS Amplify Hosting conectado a GitHub.
* Branch mappings: `main` → Demo, `staging`/`qa` → QA.
* Build: `npm ci` → `lint` → `typecheck` → `test` → `build`.
* Env vars públicas: `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_APP_ENV`, `NEXT_PUBLIC_CAPTCHA_SITE_KEY` por ambiente.
* Cookies/CORS: `SameSite=None; Secure`, `credentials: true` (Amplify ↔ App Runner).
* Rollback: builds anteriores de Amplify.

### Observability / Audit
* Correlation ID Required: N/A a nivel de hosting.
* Log Event Required: Sin secretos en logs de build.
* AdminAction Required: No
* AIRecommendation Required: No

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                    | Type    |
| ----- | ---------------------------------------------------------- | ------- |
| TS-01 | Push a rama mapeada dispara build y publica URL             | Deploy  |
| TS-02 | Build verde (`ci/lint/typecheck/test/build`)                | Deploy  |
| TS-03 | Variables públicas por ambiente configuradas                | Config  |
| TS-04 | `NEXT_PUBLIC_API_BASE_URL` apunta al backend correcto       | Config  |

### Negative Tests

| ID    | Scenario                                   | Expected Result                     |
| ----- | ------------------------------------------ | ----------------------------------- |
| NT-01 | Build falla                                | Deploy no publicado; build anterior activo |
| NT-02 | Variable pública requerida ausente         | Fail-fast / build falla             |
| NT-03 | Intento de exponer variable sensible       | Bloqueado                           |

### AI Tests
Not applicable for this story.

### Authorization Tests

| ID         | Scenario                          | Expected Result |
| ---------- | --------------------------------- | --------------- |
| AUTH-TS-01 | Config de Amplify completada      | URL pública operativa |

### Accessibility Tests
* No aplica — historia de hosting (la A11Y se cubre en US-131).

---

## 📊 Business Impact

| Field               | Value                                                |
| ------------------- | ---------------------------------------------------- |
| KPI Affected        | Demo readiness, time-to-deploy                       |
| Expected Impact     | URL pública del frontend para demo y QA               |
| Success Criteria    | URL Amplify operativa; build verde por push; env vars por ambiente |
| Academic Demo Value | Alto — frontend demostrable en URL pública            |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks
* Ajustes de configuración de build si Amplify lo requiere.

### Potential Backend Tasks
* No aplica (consume la URL del backend).

### Potential Database Tasks
* No aplica.

### Potential AI / PromptOps Tasks
* No aplica.

### Potential QA Tasks
* Smoke de la URL pública tras el deploy.

### Potential DevOps / Config Tasks
* Conectar Amplify al repo; branch mappings; build settings; env vars por ambiente; verificar rollback.

---

## ✅ Definition of Ready

* [x] Rol claro (System / equipo DevOps).
* [x] Goal técnico claro.
* [x] Referencias a Docs (Doc 21 §9, ADR-DEVOPS-001).
* [x] Permisos / Seguridad (solo vars públicas; sin secretos al cliente).
* [x] Entidades listadas (N/A).
* [x] AC en GWT.
* [x] Edge cases documentados.
* [x] Validación clara.
* [x] Out of Scope explícito (backend/RDS/Secrets/domain fuera).
* [x] Dependencias conocidas (PB-P0-012, PB-P0-017).
* [x] UX states identificados (N/A — hosting).
* [x] API definida (consume API base).
* [x] Tests definidos.
* [ ] Tech Lead validó.

---

## 🏁 Definition of Done

* [ ] Amplify conectado al repo con branch mappings.
* [ ] Build verde por push; URL pública operativa.
* [ ] Variables públicas por ambiente; sin sensibles expuestas.
* [ ] `NEXT_PUBLIC_API_BASE_URL` correcto por ambiente; cookies/CORS documentado.
* [ ] Rollback verificado.
* [ ] Tech Lead valida.

---

## 📝 Notes
* Documentation Alignment: la metadata original marcaba "Priority: Must Have (P0)", pero el Product Backlog ubica esta historia en **PB-P2-021 (P2)**. Se alinea a **P2** (fuente autoritativa: Product Backlog Prioritized).
* No incluye deploy del backend (PB-P2-022), RDS (PB-P2-023) ni Secrets Manager (PB-P2-024).
* Confirmar con Tech Lead los nombres de rama por ambiente (`staging` vs `qa`) y los valores de `NEXT_PUBLIC_API_BASE_URL` por ambiente.
