# Technical Specification — PB-P2-015 / US-127: Suite contract con MSW alineado a API

## 1. Metadata

| Field                                | Value                                                                             |
| ------------------------------------ | --------------------------------------------------------------------------------- |
| User Story ID                        | US-127                                                                             |
| Source User Story                    | `management/user-stories/US-127-contract-tests-with-msw.md`                        |
| Decision Resolution Artifact         | N/A — no existe `management/user-stories/decision-resolutions/US-127-decision-resolution.md` |
| Priority                             | P2 (Must Have)                                                                     |
| Backlog ID                           | PB-P2-015                                                                          |
| Backlog Title                        | Suite contract con MSW (tests de contrato frontend ↔ backend)                       |
| Backlog Execution Order              | 15 (decimoquinto ítem de P2)                                                       |
| User Story Position in Backlog Item  | 1 de 1                                                                             |
| Related User Stories in Backlog Item | US-127                                                                             |
| Epic                                 | EPIC-QA-001                                                                        |
| Backlog Item Dependencies            | PB-P0-005 (OpenAPI snapshot, best-effort), PB-P0-015 (base de CI)                  |
| Feature                              | Contract tests — MSW alineado al contrato real de la API                           |
| Module / Domain                      | QA / Testing (frontend contract)                                                  |
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
| Decision Resolution Artifact | No    | No   | No existe para US-127.                    |
| Product Backlog Prioritized  | Yes   | Yes  | PB-P2-015.                                |
| ADRs                         | Yes   | Yes  | ADR-TEST-001 (Vitest + Supertest).        |

---

## 3. Backlog Execution Context

### Product Backlog Item

**PB-P2-015 — Suite contract con MSW** (EPIC-QA-001, P2, Must Have). MSW del frontend alineado a respuestas reales del backend; tests detectan drift; generado desde OpenAPI cuando posible. Trazabilidad: Doc 20. Dependencias: PB-P0-005, PB-P0-015. Acceptance Summary: handlers MSW para endpoints clave; tests fallan si el DTO cambia.

### Execution Order Rationale

Decimoquinto ítem de P2. Depende de PB-P0-015 (CI) y, de forma best-effort, de PB-P0-005 (snapshot OpenAPI desde Zod). Se ubica junto al resto de ítems de calidad P2; complementa a US-126 (unit+integration backend) protegiendo el contrato consumido por el frontend, antes de E2E (PB-P2-016) y de la consolidación de quality gates (PB-P2-020).

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item                          | Suggested Order |
| ---------- | --------------------------------------------- | --------------- |
| US-127     | Única historia del ítem (contract + MSW)      | 1               |

---

## 3.1 Executive Technical Summary

Se debe construir una suite de **tests de contrato** en el frontend que valide que los **handlers de MSW** reflejan el **contrato real** de la API del backend (Doc 20 §6.4). La validación de forma se realiza con **esquemas Zod compartidos**; cuando exista el **snapshot OpenAPI** (PB-P0-005), los handlers y/o la validación se derivan de él (best-effort). Los tests deben **fallar ante drift** (cambio de DTO no sincronizado) y ser **determinísticos** (MSW en memoria, sin red externa), corriendo como **compuerta de CI** que bloquea el merge ante fallos de contrato.

No modifica el backend ni la base de datos; consume el contrato existente. No implementa componentes/páginas de frontend (fuera de alcance).

---

## 4. Scope Boundary

### In Scope

* Configuración de **MSW** para tests de contrato en el frontend (server MSW en memoria).
* **Esquemas Zod compartidos** de contrato (request/response) para validar forma.
* **Handlers MSW** para los endpoints clave del contrato (Doc 16), alineados a las respuestas reales.
* **Detección de drift**: test falla si el DTO del backend cambia sin sincronizar el schema/handler.
* **Derivación desde OpenAPI** cuando el snapshot exista (best-effort); fallback a Zod compartido documentado.
* Representación de contratos de **error** (401/403/4xx) en MSW para que el frontend los maneje.
* Integración como **compuerta de CI** determinística.

### Out of Scope

* Suite unit + integration del backend (US-126 / PB-P2-014).
* Generación del snapshot OpenAPI (PB-P0-005 / US-098).
* Suite E2E Playwright (PB-P2-016).
* Suite completa de componentes/páginas del frontend (Doc 20 §6.5) como ítem propio.
* Llamadas de red reales al backend.
* Cambios de backend, esquema o seed.

### Explicit Non-Goals

* No validar contenido literal de respuestas de IA; solo forma/schema.
* No usar MSW como fuente de autorización (el backend sigue siendo source of truth).
* No perseguir cobertura de todos los endpoints; enfocarse en los **clave**.

---

## 5. Architecture Alignment

### Backend Architecture

No se modifica. La suite consume el contrato REST JSON (`/api/v1`, envelope `{ data | error }`, validación Zod) definido en Doc 16.

### Frontend Architecture

Alineado a Doc 15 y Doc 20 §6.4/§6.5: Next.js + TypeScript, TanStack Query, Zod, **MSW** para mocking de API. La suite de contrato vive en el frontend (`frontend/tests/**`), usando esquemas Zod compartidos.

### Database Architecture

No aplica.

### API Architecture

Consume el contrato de API (Doc 16). Los handlers MSW reproducen la forma de las respuestas por endpoint clave. Cuando exista OpenAPI (PB-P0-005), se deriva de él.

### AI / PromptOps Architecture

No aplica como feature. Si un endpoint de IA está en el contrato, su handler valida forma/schema (no contenido).

### Security Architecture

Sin runtime authorization. Los handlers deben poder representar contratos de error 401/403/4xx (SEC-04). Sin secretos en handlers/fixtures/logs (SEC-02, SEC-03).

### Testing Architecture

Contract tests (Doc 20 §6.4): validación de forma con Zod compartido, MSW alineado, validador OpenAPI opcional. Runner Vitest; MSW en memoria; determinismo garantizado (sin red externa).

---

## 6. Functional Interpretation

| Acceptance Criterion | Technical Interpretation | Impacted Layer(s) |
|---|---|---|
| AC-01 (handlers alineados) | Crear handlers MSW por endpoint clave que devuelvan el envelope y forma del contrato real. | Frontend testing (MSW) |
| AC-02 (validación Zod) | Validar cada respuesta mock contra el esquema Zod compartido; test pasa solo si cumple. | Frontend testing, Schemas |
| AC-03 (drift) | Test falla explícitamente cuando el DTO cambia y el schema/handler no se sincroniza. | Frontend testing, Contract |
| AC-04 (OpenAPI best-effort) | Si existe snapshot OpenAPI, derivar handlers/validación; si no, usar Zod compartido y documentar. | Frontend testing, OpenAPI |
| AC-05 (determinismo + CI gate) | MSW en memoria, sin red; suite como gate de CI bloqueante. | Frontend testing, CI |

---

## 7. Backend Technical Design

No aplica — la historia no modifica el backend; consume su contrato. Los esquemas Zod de contrato pueden reutilizar/compartir los del backend cuando sea posible (paquete/carpeta compartida).

---

## 8. Frontend Technical Design

### Routes / Pages
No aplica — no se prueban páginas específicas.

### Components
No aplica.

### Forms
No aplica.

### State Management
Indirecto: el contrato consumido por TanStack Query/API client se valida vía MSW + Zod.

### Data Fetching
Se interceptan las llamadas del API client con **MSW** en memoria; ninguna red real.

### Loading / Empty / Error / Success States
No aplica como UI; se representan contratos de éxito y de error en handlers.

### Accessibility
No aplica — sin UI nueva.

### i18n
No aplica.

---

## 9. API Contract Design

| Method | Endpoint | Purpose | Auth Required | Request | Response | Error Cases |
|---|---|---|---|---|---|---|
| (varios) | Endpoints clave (Doc 16) | Handlers MSW alineados al contrato real | Según endpoint | DTO Zod compartido | Envelope `{ data }` conforme a schema | `{ error }` 400/401/403/404/409/422 representables en MSW |

La lista exacta de "endpoints clave" se confirma con Tech Lead (nota no bloqueante). Cuando exista OpenAPI (PB-P0-005), la lista y las formas se derivan del snapshot.

---

## 10. Database / Prisma Design

No aplica — sin cambios de esquema, migraciones ni seed.

---

## 11. AI / PromptOps Design

No aplica como feature productiva. Si el contrato incluye endpoints de IA, sus handlers MSW validan forma/schema, no contenido literal.

---

## 12. Security & Authorization Design

### Authentication
No runtime auth en la suite; se representan estados autenticado/anónimo a nivel de contrato de respuesta.

### Authorization
Los handlers pueden representar 401/403 para que el frontend maneje el contrato de error; MSW no es fuente de autorización.

### Ownership Rules
No aplica.

### Role Rules
No aplica (solo contrato de error representable).

### Negative Authorization Scenarios
Contratos de error 401/403/4xx representables en MSW (AUTH-TS-01).

### Audit Requirements
No aplica.

### Sensitive Data Handling
Sin secretos en handlers/fixtures/logs (SEC-02, SEC-03).

---

## 13. Testing Strategy

### Unit Tests
No aplica como categoría central (esta es la suite de contrato).

### Integration Tests
No aplica (backend integration = US-126).

### API Tests
No aplica (Supertest = suite API separada).

### E2E Tests
No aplica (PB-P2-016).

### Security Tests
Representación de contratos de error 401/403 en MSW.

### Accessibility Tests
No aplica.

### AI Tests
Handlers de contrato para endpoints de IA validan forma/schema si aplica.

### Seed / Demo Tests
No aplica.

### CI Checks
Suite de contrato como gate bloqueante: falla ante drift, respuesta no conforme, handler faltante o red real detectada. Determinismo (MSW en memoria).

### Contract Tests (principal)
* Handlers MSW por endpoint clave alineados al contrato.
* Validación de forma con esquemas Zod compartidos.
* Detección de drift (DTO cambia → test falla).
* Derivación/validación desde OpenAPI cuando disponible.

---

## 14. Observability & Audit

### Logs
Sin secretos en payloads/logs de prueba.

### Correlation ID
No aplica (tests en memoria).

### AdminAction
No aplica.

### Error Tracking
No aplica como capacidad nueva.

### Metrics
No aplica.

---

## 15. Seed / Demo Data Impact

### Seed Data Required
No requiere cambios de seed. Los handlers usan fixtures/payloads propios conformes al contrato.

### Demo Scenario Supported
Indirecto: reduce el riesgo de incompatibilidades frontend↔backend en la demo.

### Reset / Isolation Notes
MSW server reset entre tests (`resetHandlers`) para aislamiento.

---

## 16. Documentation Alignment Required

| Document / Source | Conflict | Current Decision | Recommended Action | Blocks Implementation? |
|---|---|---|---|---|
| PB-P0-005 (OpenAPI snapshot) vs disponibilidad | El backlog dice "generado desde OpenAPI cuando posible"; el snapshot puede no existir al implementar | Derivar de OpenAPI si existe; si no, usar esquemas Zod compartidos y documentar modo best-effort | Confirmar estado de PB-P0-005; documentar la fuente de contrato usada | No |
| Doc 16 (endpoints clave) | La lista de "endpoints clave" no está enumerada en la US | Confirmar lista con Tech Lead | Enumerar endpoints clave en la documentación de la suite | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| MSW desalineado del backend real | Tests que "mienten" vs producción | Derivar de OpenAPI cuando exista; validar forma con Zod compartido |
| Snapshot OpenAPI ausente | Menor automatización | Fallback a Zod compartido; documentar best-effort |
| Drift no detectado | Incompatibilidad entre capas | Validación estricta de forma; test falla ante DTO no conforme |
| Llamadas de red reales accidentales | No determinismo | MSW en memoria; `onUnhandledRequest: 'error'` |
| Ambigüedad en "endpoints clave" | Cobertura incompleta | Confirmar lista con Tech Lead; documentarla |

---

## 18. Implementation Guidance for Coding Agents

* **Archivos/carpetas probablemente impactados:** `frontend/tests/contract/**`, `frontend/tests/msw/{server,handlers}.ts`, esquemas Zod compartidos de contrato (carpeta compartida o import del backend), config Vitest del frontend, config de CI (job de contract).
* **Orden recomendado:** (1) config MSW + server + `onUnhandledRequest: 'error'`; (2) esquemas Zod compartidos de contrato; (3) handlers por endpoint clave; (4) tests de contrato (forma + drift); (5) derivación desde OpenAPI cuando exista; (6) gate de CI.
* **Decisiones que no deben reabrirse:** MSW como mock de contrato (Doc 20 §6.4); Zod como validación de forma; OpenAPI best-effort; backend como source of truth de autorización.
* **Qué no implementar:** backend, esquema/seed, generación de OpenAPI, E2E, suite de componentes.
* **Suposiciones a preservar:** el contrato de API (Doc 16) y los esquemas Zod existen; PB-P0-015 provee la base de CI.

---

## 19. Task Generation Notes

* **Grupos de tareas sugeridos:** (FE/OPS) config MSW + Vitest; (FE) esquemas Zod compartidos de contrato; (FE) handlers por endpoint clave; (QA) tests de contrato positivos; (QA) tests de drift; (QA) integración OpenAPI best-effort; (SEC) contratos de error 401/403; (OPS) gate de CI; (DOC) documentación de endpoints clave y modo best-effort.
* **Tareas QA requeridas:** contract positivos, drift, determinismo.
* **Tareas de seguridad requeridas:** representación de contratos de error 401/403; sin secretos en handlers/logs.
* **Tareas de seed/demo requeridas:** ninguna.
* **Tareas de documentación requeridas:** lista de endpoints clave + fuente de contrato (OpenAPI vs Zod).
* **Dependencias entre tareas:** config antes de esquemas; esquemas antes de handlers; handlers antes de tests; tests antes del gate.
* **Consolidación:** PB-P2-015 puede consolidar sus tareas en un `tasks.md` propio.

---

## 20. Technical Spec Readiness

| Check | Status |
|---|---|
| User Story approved or explicitly allowed for draft spec | Pass (Approved with Minor Notes) |
| Product Backlog mapping found | Pass (PB-P2-015) |
| Decision Resolution reviewed if present | N/A (no existe) |
| Scope clear | Pass |
| Architecture alignment clear | Pass |
| API impact clear | Pass (consume contrato; sin cambios de backend) |
| DB impact clear | N/A |
| AI impact clear | N/A (solo forma/schema si aplica) |
| Security impact clear | Pass (contratos de error; sin secretos) |
| Testing strategy clear | Pass |
| Ready for Development Task Breakdown | Yes |

---

## 21. Final Recommendation

`Ready for Task Breakdown`

La historia está aprobada, mapeada a PB-P2-015, con alcance claro (contract tests con MSW + Zod compartido, drift detection, OpenAPI best-effort), sin cambios de backend/DB. Las dos alertas de Documentation Alignment (disponibilidad de OpenAPI y lista de endpoints clave) son **no bloqueantes**. Testing, seguridad de contrato y CI están suficientemente definidos para generar Development Tasks.
