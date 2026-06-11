# 🧾 User Story: Inicializar proyecto Node + Express + TypeScript

## 🆔 Metadata

| Field              | Value                                    |
| ------------------ | ---------------------------------------- |
| ID                 | US-089                                   |
| Epic               | EPIC-BE-001 — Backend Modular Monolith   |
| Feature            | Bootstrap del backend                    |
| Module / Domain    | Platform/BE                              |
| User Role          | System                                   |
| Priority           | Must Have (P0)                           |
| Status             | Approved                                 |
| Owner              | Product Owner / Business Analyst         |
| Sprint / Milestone | MVP                                      |
| Created Date       | 2026-06-09                               |
| Last Updated       | 2026-06-11                               |

---

## 🎯 User Story

**As the** sistema backend  
**I want** inicializar el proyecto Node.js + Express + TypeScript con `strict: true`, archivo `server.ts` de bootstrap, carga de configuración validada con Zod y endpoint `GET /health`  
**So that** el servidor arranque de forma reproducible y segura, y los módulos de dominio se desarrollen sobre una base técnica estable

---

## 🧠 Business Context

### Context Summary
Foundation técnica del monolito modular MVP. Sin este bootstrap no existe punto de entrada funcional, no hay servidor Express levantable ni endpoint de salud para CI/CD ni revisión académica. US-090 (estructura feature-first de módulos) y US-091 (pipeline de middlewares) dependen de este bootstrap base.

### Related Domain Concepts
* Modular Monolith (ADR-ARCH-001)
* Clean/Hexagonal Architecture dentro de módulos (ADR-ARCH-002)
* Configuración validada con Zod al arranque (Doc 14 §27)

### Assumptions
* Node.js LTS disponible en el entorno de CI/CD.
* Todas las variables de entorno requeridas están documentadas en `.env.example` sin valores reales.
* El health check `GET /health` no requiere autenticación ni rate limit estricto (Doc 14 §8.3, Doc 16 §180).

### Dependencies
* Sin dependencias de otras US del MVP (es la base del backend).
* US-090 y US-091 dependen del servidor inicializado por esta US.

### PO/BA Decisions Applied

| Decisión | Resolución |
| -------- | ---------- |
| Nombre del health endpoint | `GET /health` (no `/healthz`). Fuente de verdad: Doc 14 §8.3 y Doc 16 §180/192. El alias `/healthz` en PB-P0-002 y PB-P0-015 es una inconsistencia de documentación que se alineará como trabajo de Documentation Alignment; no requiere nuevo ADR. |
| NFR IDs aplicables | `NFR-PERF-001`, `NFR-OBS-006`, `NFR-SEC-008`, `NFR-DEPLOY-002`. `NFR-PERF-API-001` no existe en Doc 10; `NFR-OBS-001` aplica solo a AdminAction logging y no a bootstrap. |
| Scope de Prisma en esta US | Prisma client se instala y `$connect()` stub se invoca en `server.ts`. Las migraciones y schema Prisma pertenecen a una US separada de infraestructura de base de datos. |
| Scope de middlewares en esta US | El pipeline completo de middlewares (correlación, logging, auth, role, ownership, validation, rate limit, captcha, upload, errorHandler) es responsabilidad de US-091. Esta US solo inicializa `app.ts` con middlewares stub vacíos. |
| Respuesta shape de `GET /health` | `{ "status": "ok", "version": string, "uptimeMs": number }` per Doc 16 §192. |

---

## 🔗 Traceability

| Source                 | Reference                                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------- |
| FRD Requirement(s)     | Transversal — no implementa directamente un FR; habilita la plataforma backend completa           |
| Use Case(s)            | Transversal — no implementa directamente un UC; habilita capacidades futuras                      |
| Business Rule(s)       | —                                                                                                 |
| Permission Rule(s)     | `GET /health` público (sin autenticación, sin rate limit estricto)                                |
| Data Entity / Entities | —                                                                                                 |
| API Endpoint(s)        | GET /health                                                                                       |
| NFR Reference(s)       | NFR-PERF-001, NFR-OBS-006, NFR-SEC-008, NFR-DEPLOY-002                                           |
| Related ADR(s)         | ADR-ARCH-001, ADR-ARCH-002, ADR-BE-001, ADR-SEC-006                                              |
| Related Document(s)    | /docs/12, /docs/13, /docs/14, /docs/16, /docs/19, /docs/20, /docs/21                             |

---

## 🧭 Scope Guardrails

### MVP Scope
* Scope Classification: In Scope
* MVP Relevance: Must Have (P0)

### Explicitly Out of Scope
* Microservicios, Kubernetes, brokers en MVP.
* Swagger UI / OpenAPI docs en esta US (opcional, mencionado en Doc 14 §8.3 como `GET /docs` si `OPENAPI_ENABLED=true`).
* Módulos de dominio funcionales (US-090 y siguientes).
* Pipeline de middlewares completo (US-091).
* Migraciones de base de datos y Prisma schema (US separada de infraestructura de DB).
* CI/CD pipeline completo (PB-P0-001).
* Funciones futuras no listadas en Epic Map.

### Scope Notes
* Respetar guardrails MVP (sin pagos reales, sin chat, sin push, sin moderación IA, sin RAG).
* La estructura de capas `Interface/Application/Domain/Ports/Infrastructure` se inicializa como esqueleto con módulo placeholder para validar la convención; los módulos funcionales son responsabilidad de US-090.
* La conexión real a Prisma en `server.ts` se establece con `prisma.$connect()` stub; las migraciones pertenecen a una US de infraestructura DB.

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Proyecto TypeScript compilable con strict mode
**Given** el proyecto tiene `tsconfig.json` con `strict: true`, `noUncheckedIndexedAccess: true` e `noImplicitOverride: true`  
**When** se ejecuta `tsc --noEmit`  
**Then** la compilación termina sin errores de tipo

### AC-02: Servidor arranca y el health endpoint responde correctamente
**Given** todas las variables de entorno requeridas están definidas  
**When** se inicia el servidor (`node dist/server.js` o `ts-node src/server.ts`)  
**Then** el proceso escucha en el `PORT` configurado, y `GET /health` responde `200 OK` con `{ "status": "ok", "version": string, "uptimeMs": number }` sin autenticación requerida

### AC-03: Configuración cargada y validada con Zod al arranque
**Given** todas las variables de entorno requeridas están definidas  
**When** se inicializa `config/env.ts`  
**Then** las variables son parseadas y validadas por un schema Zod, y el objeto de configuración queda disponible con tipos estáticos en el resto del código

### AC-04: `.env.example` presente con todas las variables requeridas
**Given** el repositorio está inicializado  
**When** se inspecciona el repositorio  
**Then** existe `.env.example` con los nombres y formatos de todas las variables requeridas (categorías APP, DATABASE, AUTH, AI, SECURITY, STORAGE, LOGGING, SEED definidas en Doc 14 §27) sin valores reales ni secretos

### AC-05: Scripts de desarrollo configurados y funcionales
**Given** proyecto inicializado con ESLint, TypeScript y Vitest configurados  
**When** se ejecutan los scripts `typecheck`, `lint` y `test`  
**Then** los tres pasan sin errores en entorno limpio

---

## ⚠️ Edge Cases

### EC-01: Variable de entorno requerida no definida al arranque
**Given** una variable de entorno requerida (e.g., `DATABASE_URL`, `JWT_SECRET`) no está definida  
**When** se inicia el servidor  
**Then** el proceso falla inmediatamente (fail-fast) con mensaje claro indicando la variable faltante y sale con exit code ≠ 0

#### Handling
* Validación Zod lanzada en `config/env.ts` durante bootstrap, antes de montar rutas ni conectar Prisma.

### EC-02: `LLM_PROVIDER` con valor inválido o ausente
**Given** `LLM_PROVIDER` tiene un valor no admitido (distinto de `openai`, `mock`, `anthropic`)  
**When** se inicia el servidor  
**Then** fallo controlado con mensaje indicando los valores admitidos y exit code ≠ 0

#### Handling
* Validación Zod con `.enum(['openai', 'mock', 'anthropic'])` en `config/env.ts`.

---

## 🚫 Validation Rules

| ID    | Rule                                                             | Message / Behavior                              |
| ----- | ---------------------------------------------------------------- | ----------------------------------------------- |
| VR-01 | Todas las variables requeridas presentes en `config/env.ts`      | Fail-fast: mensaje descriptivo + exit code ≠ 0  |
| VR-02 | `LLM_PROVIDER` ∈ { openai, mock, anthropic }                     | Fail-fast: mensaje con valores admitidos        |
| VR-03 | `PORT` es número entero positivo válido                          | Fail-fast si inválido                           |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                            |
| ------ | ------------------------------------------------------------------------------- |
| SEC-01 | `GET /health` es público — sin autenticación requerida, sin rate limit estricto. |
| SEC-02 | Secrets solo vía variables de entorno / Secrets Manager; `.env.example` sin valores reales (ADR-SEC-005, NFR-SEC-008). |
| SEC-03 | Logs de bootstrap no contienen PII ni secretos (NFR-OBS-006).                  |
| SEC-04 | `HELMET_ENABLED=true` por defecto en `app.ts`; security headers activos desde el primer arranque (ADR-SEC-006). |

### Negative Authorization Scenarios
* N/A directamente — esta historia no introduce runtime authorization basada en roles.

---

## 🤖 AI Behavior

No aplica — esta historia no invoca IA directamente.

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

| Area                | Notes                                    |
| ------------------- | ---------------------------------------- |
| Screen / Route      | No aplica (capacidad técnica)            |
| Main UI Pattern     | N/A                                      |
| Primary Action      | N/A                                      |
| Secondary Actions   | N/A                                      |
| Empty State         | N/A                                      |
| Loading State       | N/A                                      |
| Error State         | N/A                                      |
| Success State       | N/A                                      |
| Accessibility Notes | N/A                                      |
| Responsive Notes    | N/A                                      |
| i18n Notes          | N/A                                      |
| Currency Notes      | No aplica                                |

---

## 🛠 Technical Notes

### Frontend
* Route / Page: N/A
* Components: N/A
* State Management: N/A
* Forms: N/A
* API Client: N/A

### Backend
* **`src/server.ts`**: punto de entrada; carga `config/env.ts`, invoca Prisma `$connect()` stub, registra jobs (vacíos en esta US), llama `app.listen(PORT)`.
* **`src/app.ts`**: factory de la aplicación Express; registra middlewares globales stub y monta rutas `/api/v1` (vacías en esta US); exporta `app` para Supertest.
* **`src/config/env.ts`**: carga y valida todas las variables de entorno con Zod en bootstrap; lanza excepción con mensaje descriptivo si falta una variable requerida.
* **`tsconfig.json`**: `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitOverride: true` (ADR-BE-001).
* **`GET /health`**: ruta pública no versionada (Doc 14 §8.3; Doc 16 §180); responde `{ status: "ok", version, uptimeMs }`.
* Use Case / Service: N/A (capacidad técnica habilitadora)
* Controller / Route: `GET /health`
* Authorization Policy: Público
* Validation: Zod en `config/env.ts` al arranque
* Transaction Required: No

### Database
* Main Tables: — (no se crean tablas en esta US)
* Constraints: N/A
* Index Considerations: N/A

### API

| Method | Endpoint | Purpose                                              |
| ------ | -------- | ---------------------------------------------------- |
| GET    | /health  | Health check; retorna `{ status, version, uptimeMs }` |

### Observability / Audit
* Correlation ID Required: Yes — `correlationIdMiddleware` se establece en bootstrap (implementado en US-091; stub en esta US)
* Log Event Required: Yes — logs de arranque: port listening, Prisma connected, errores de configuración (NFR-OBS-006)
* AdminAction Required: No
* AIRecommendation Required: No

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                              | Type           | Tool               |
| ----- | --------------------------------------------------------------------- | -------------- | ------------------ |
| TS-01 | `tsc --noEmit` sin errores con strict mode activo                     | Build / Static | tsc                |
| TS-02 | `GET /health` responde `200 OK` con `{ status, version, uptimeMs }`   | API Integration | Supertest + Vitest |
| TS-03 | Config Zod acepta `.env` completo válido                              | Unit           | Vitest             |

### Negative Tests

| ID    | Scenario                                                              | Expected Result                           | Tool   |
| ----- | --------------------------------------------------------------------- | ----------------------------------------- | ------ |
| NT-01 | Variable requerida (`DATABASE_URL`) ausente al boot                   | Proceso falla con mensaje y exit code ≠ 0 | Vitest |
| NT-02 | `LLM_PROVIDER` con valor inválido al boot                             | Fallo controlado con valores admitidos    | Vitest |

### AI Tests
Not applicable for this story.

### Authorization Tests

| ID         | Scenario                                      | Expected Result   |
| ---------- | --------------------------------------------- | ----------------- |
| AUTH-TS-01 | `GET /health` sin cabecera de autorización    | 200 OK (público)  |

### Accessibility Tests
* N/A — no tiene UI.

---

## 📊 Business Impact

| Field               | Value                                                                        |
| ------------------- | ---------------------------------------------------------------------------- |
| KPI Affected        | Salud técnica, time-to-deploy                                                |
| Expected Impact     | Habilita el desarrollo de todos los módulos de dominio y features del MVP    |
| Success Criteria    | Servidor arranca, `GET /health` responde 200, `tsc --noEmit` sin errores, CI verde |
| Academic Demo Value | Foundation técnica demostrable y evaluable                                   |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks
* N/A.

### Potential Backend Tasks
* Inicializar repo Node.js con `package.json`, TypeScript y dependencias base (`express`, `zod`, `prisma`, `vitest`, `supertest`, `eslint`, `ts-node`).
* Configurar `tsconfig.json` con strict settings (ADR-BE-001).
* Crear `src/config/env.ts` con schema Zod de variables de entorno.
* Crear `src/app.ts` (Express factory, middlewares stub, ruta `GET /health`).
* Crear `src/server.ts` (bootstrap: cargar config, conectar Prisma stub, escuchar en PORT).
* Crear `.env.example` con todas las variables documentadas (Doc 14 §27).
* Configurar ESLint y scripts `build`, `start`, `dev`, `typecheck`, `lint`, `test` en `package.json`.

### Potential Database Tasks
* Prisma client instalado; `prisma.$connect()` stub en `server.ts`; sin migraciones en esta US.

### Potential AI / PromptOps Tasks
* Not applicable for this story.

### Potential QA Tasks
* Vitest + Supertest: tests de health endpoint (AC-02) y config validation (AC-03, NT-01, NT-02).
* Smoke test local de arranque.

### Potential DevOps / Config Tasks
* `.env.example` completo sin valores reales (NFR-DEPLOY-002).
* Scripts `build`, `start`, `dev`, `typecheck`, `lint`, `test` en `package.json`.

---

## ✅ Definition of Ready

* [x] Rol claro (System).
* [x] Goal técnico claro (bootstrap compilable + `GET /health` operativo + config Zod validada).
* [x] Referencias a Docs de Arquitectura (/docs/12, /docs/13, /docs/14, /docs/16, /docs/19, /docs/20, /docs/21).
* [x] ADRs relevantes referenciados (ADR-ARCH-001, ADR-ARCH-002, ADR-BE-001, ADR-SEC-006).
* [x] NFRs correctos referenciados (NFR-PERF-001, NFR-OBS-006, NFR-SEC-008, NFR-DEPLOY-002).
* [x] Permisos / Seguridad definidos (`GET /health` público; secrets solo en env vars).
* [x] Entidades: N/A explícito.
* [x] AC en GWT específicos y testeables.
* [x] Edge cases documentados (fail-fast en config, LLM_PROVIDER inválido).
* [x] Validación clara (Zod al boot, VR-01..VR-03).
* [x] Out of Scope explícito.
* [x] Dependencias conocidas (US-090, US-091 dependen de esta US).
* [x] UX: N/A explícito.
* [x] API definida (GET /health con response shape).
* [x] Tests definidos con herramientas (Vitest + Supertest + tsc).
* [ ] Tech Lead validó.

---

## 🏁 Definition of Done

* [ ] Servidor arranca localmente con todas las variables del `.env.example`.
* [ ] `GET /health` responde `200 OK` con `{ status: "ok", version, uptimeMs }`.
* [ ] `tsc --noEmit` sin errores de tipo.
* [ ] Tests Vitest verdes: config validation, health endpoint con Supertest.
* [ ] `.env.example` completo y sin secretos reales.
* [ ] ESLint sin errores.
* [ ] Tech Lead valida la estructura `app.ts` + `server.ts` y el schema Zod de `config/env.ts`.

---

## 📝 Notes

* La ruta de health check es `GET /health` conforme a Doc 14 §8.3 y Doc 16 §180/192. El alias `/healthz` aparece en algunos artefactos del Product Backlog (PB-P0-002, PB-P0-015, R0 Foundation) como referencia operacional de infraestructura; se recomienda alinear esos artefactos en un próximo ciclo de refinement (ver Documentation Alignment en el refinement review artifact).
* `GET /health` no está bajo el prefijo `/api/v1` (Doc 16 §180: "El health check no se versiona").
* El pipeline completo de middlewares (correlación, logging, auth, role, ownership, validation, rate limit, captcha, upload, errorHandler) es responsabilidad de US-091; en esta US los middlewares se registran como stubs o vacíos.
* La conexión real a base de datos y las migraciones Prisma pertenecen a una US separada de infraestructura de DB.
