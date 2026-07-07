# Technical Specification — PB-P2-016 / US-128: Suite E2E Playwright sobre seed

## 1. Metadata

| Field                                | Value                                                                             |
| ------------------------------------ | --------------------------------------------------------------------------------- |
| User Story ID                        | US-128                                                                             |
| Source User Story                    | `management/user-stories/US-128-e2e-playwright-on-seed.md`                         |
| Decision Resolution Artifact         | N/A — no existe `management/user-stories/decision-resolutions/US-128-decision-resolution.md` |
| Priority                             | P2 (Must Have)                                                                     |
| Backlog ID                           | PB-P2-016                                                                          |
| Backlog Title                        | Suite E2E Playwright sobre seed (flujo demo principal)                              |
| Backlog Execution Order              | 16 (decimosexto ítem de P2)                                                        |
| User Story Position in Backlog Item  | 1 de 1                                                                             |
| Related User Stories in Backlog Item | US-128                                                                             |
| Epic                                 | EPIC-QA-001                                                                        |
| Backlog Item Dependencies            | PB-P0-014 (seed idempotente + datos demo), PB-P0-015 (base de CI)                  |
| Feature                              | E2E principal — Playwright sobre seed reproducible                                  |
| Module / Domain                      | QA / Demo                                                                          |
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
| Decision Resolution Artifact | No    | No   | No existe para US-128.                    |
| Product Backlog Prioritized  | Yes   | Yes  | PB-P2-016.                                |
| ADRs                         | Yes   | Yes  | ADR-TEST-001 (E2E con Playwright, Doc 20 §21). |

---

## 3. Backlog Execution Context

### Product Backlog Item

**PB-P2-016 — Suite E2E Playwright sobre seed** (EPIC-QA-001, P2, Must Have). Suite Playwright que ejecuta sobre seed reproducible el camino demo: auth → event → AI plan → tasks → budget → vendors → QR → quote → compare → booking → review. Acceptance: flujo end-to-end pasa en CI; screenshots en fallo; runs sobre seed reset. Dependencias: PB-P0-014, PB-P0-015. Nota: demo readiness depende de esta suite.

### Execution Order Rationale

Decimosexto ítem de P2. Depende de PB-P0-014 (seed idempotente con datos demo) y PB-P0-015 (CI). Es la cúspide de la pirámide de pruebas (Doc 20 §5): se apoya en la base unit+integration (US-126) y en el contrato (US-127), y precede a la consolidación de quality gates (PB-P2-020). Su valor es demo readiness.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item                          | Suggested Order |
| ---------- | --------------------------------------------- | --------------- |
| US-128     | Única historia del ítem (E2E demo)            | 1               |

---

## 3.1 Executive Technical Summary

Se debe construir una suite **E2E con Playwright** que ejercite el **camino demo del organizador** end-to-end sobre un **seed reproducible** (PB-P0-014): auth → crear evento → plan IA (Mock) → checklist/tasks → presupuesto → vendors → quote request → comparación de quotes → booking intent → review. Los pasos de IA usan **`MockAIProvider`** para garantizar determinismo (Doc 20 §25.4, PT-04). La suite corre sobre **seed reset** antes de cada corrida, captura **screenshots y trace** ante fallos, y se integra como **compuerta de CI** (smoke E2E en PR; suite completa pre-demo/merge protegido, Doc 20 §21–§22).

No modifica backend, base de datos ni seed; los consume. La única adición de producto posible es incorporar `data-testid`/roles estables en el frontend donde el E2E lo requiera.

---

## 4. Scope Boundary

### In Scope

* Configuración de **Playwright** (browsers, proyectos, reporter, retries, trace/screenshot on failure).
* Setup de entorno E2E con **seed reset** idempotente previo a la corrida.
* Specs E2E del **camino demo del organizador** (Doc 20 §25.1) usando datos del seed.
* Uso de **`MockAIProvider`** en los pasos de IA del flujo.
* Evidencia ante fallos: **screenshot + trace** adjuntos al reporte.
* Integración como **compuerta de CI**: smoke E2E en PR, suite completa pre-demo.
* Adición mínima de **selectores estables** (`data-testid`/roles) en el frontend si faltan.

### Out of Scope

* Suite unit + integration del backend (US-126 / PB-P2-014).
* Suite contract con MSW (US-127 / PB-P2-015).
* Suite IA ampliada (PB-P2-017) y escenarios de error/fallback de IA.
* Suite RBAC/seguridad negativa (PB-P2-018, Doc 20 §25.5).
* Suite A11Y (PB-P2-019).
* Creación/modificación del seed (PB-P0-014) y del backend/DB.
* Llamadas reales a proveedores de IA externos.

### Explicit Non-Goals

* No perseguir exhaustividad E2E; solo el journey demo/crítico (PT-01).
* No cubrir flujos de admin/vendor completos más allá de lo que el camino demo del organizador requiere del seed.
* No validar contenido literal de IA; el flujo verifica la interacción (aceptar/editar/rechazar).

---

## 5. Architecture Alignment

### Backend Architecture

No se modifica. Se ejercita la app real (Express `/api/v1`) a través de la UI. El backend debe correr con `MockAIProvider` en el entorno E2E (sin `OPENAI_API_KEY`).

### Frontend Architecture

Next.js real ejercido por Playwright. Posible adición de `data-testid`/roles estables (Doc 15) para selectores robustos.

### Database Architecture

PostgreSQL del entorno E2E poblado por el seed idempotente (PB-P0-014); seed reset antes de la corrida. No se altera el esquema.

### API Architecture

Ejercida end-to-end vía la aplicación; sin invocación directa de endpoints.

### AI / PromptOps Architecture

`MockAIProvider` en los pasos de IA (plan, checklist, presupuesto, comparación). Determinismo garantizado; sin proveedor real.

### Security Architecture

Ejercita el flujo de autenticación real (login). Escenarios negativos de seguridad fuera de alcance (PB-P2-018). Sin secretos en logs/traces/screenshots (SEC-03).

### Testing Architecture

E2E con Playwright sobre entorno con seed (Doc 20 §6.6, §21). Smoke E2E en PR (<5 min objetivo), suite completa pre-demo (<20 min objetivo). Retries acotados en CI; selectores estables; trace/screenshot on failure.

---

## 6. Functional Interpretation

| Acceptance Criterion | Technical Interpretation | Impacted Layer(s) |
|---|---|---|
| AC-01 (camino demo end-to-end) | Specs Playwright que recorren auth→event→IA→tasks→budget→vendors→QR→quote→compare→booking→review sobre seed. | E2E, Frontend, Backend (app real) |
| AC-02 (reproducibilidad) | Seed reset idempotente en el setup; corridas repetibles. | E2E setup, Seed, DB |
| AC-03 (evidencia) | Configurar `screenshot: 'only-on-failure'` y `trace: 'retain-on-failure'`. | Playwright config |
| AC-04 (IA determinística) | Entorno E2E con `MockAIProvider`; sin IA real. | AI mock, Backend env |
| AC-05 (gate CI) | Smoke E2E en PR; suite completa pre-demo bloqueante. | CI/DevOps |

---

## 7. Backend Technical Design

No aplica como modificación. Requisito de entorno: el backend debe iniciar con `MockAIProvider` y sin `OPENAI_API_KEY` en el entorno E2E. El seed reset se ejecuta con el comando existente (`npm run seed`, PB-P0-014).

---

## 8. Frontend Technical Design

### Routes / Pages
Rutas del camino demo del organizador (ejercidas, no creadas).

### Components
No se crean; posible adición de `data-testid`/roles estables donde el E2E lo requiera.

### Forms
Login, crear evento, quote request, review — ejercidos vía interacción real.

### State Management
Ejercido end-to-end (TanStack Query contra backend real).

### Data Fetching
Contra el backend real; sin mocks (a diferencia de la suite contract).

### Loading / Empty / Error / Success States
Ejercidos como parte del flujo; el E2E espera estados de éxito del camino demo.

### Accessibility
Fuera de alcance (PB-P2-019).

### i18n
El E2E puede validar strings desde el catálogo si aplica al camino demo.

---

## 9. API Contract Design

No aplica — la API se ejercita end-to-end vía la aplicación, no por contrato directo.

---

## 10. Database / Prisma Design

### Models Impacted
Ninguno se modifica. Se consumen entidades del seed (organizers, vendors, events, quotes, bookings, reviews).

### Fields / Columns
Sin cambios.

### Relations / Indexes / Constraints
Sin cambios; se ejercitan vía la app.

### Migrations Impact
Ninguna migración nueva. Migraciones vigentes + seed aprovisionan el entorno E2E.

### Seed Impact
Consume el seed idempotente (PB-P0-014); requiere seed reset antes de la corrida. No modifica el seed.

---

## 11. AI / PromptOps Design

### AI Feature
No productiva; los pasos de IA del flujo usan `MockAIProvider`.

### Provider
`MockAIProvider` en el entorno E2E. Sin `OpenAIProvider` real.

### Prompt Version
N/A a nivel de test (el producto define promptVersion; el E2E no lo valida literalmente).

### Input / Output Schema
Fixtures mock conformes a schema para los pasos de IA.

### Human-in-the-loop
El E2E cubre aceptar/editar/rechazar la sugerencia IA (Doc 20 §25.1).

### Fallback
Fuera de alcance (PB-P2-017 / §25.4).

### Persistence
Según producto; el E2E verifica el flujo, no cambia la persistencia.

### Safety Rules
Sin `OPENAI_API_KEY`; sin llamadas externas.

---

## 12. Security & Authorization Design

### Authentication
Ejercita login real del organizador (AUTH-TS-01).

### Authorization
Ejercida implícitamente por el flujo; escenarios negativos fuera de alcance.

### Ownership / Role Rules
Fuera de alcance (PB-P2-018).

### Negative Authorization Scenarios
Cubiertos en PB-P2-018 (Doc 20 §25.5), no aquí.

### Audit Requirements
No aplica (camino del organizador).

### Sensitive Data Handling
Sin secretos en logs/traces/screenshots (SEC-03); seed sin PII real (Doc 20 §26).

---

## 13. Testing Strategy

### Unit / Integration / API Tests
No aplica (otras suites).

### E2E Tests (principal)
* Camino demo del organizador end-to-end sobre seed (Doc 20 §25.1).
* Pasos de IA con `MockAIProvider`.
* Evidencia: screenshot + trace on failure.
* Reproducibilidad: seed reset previo.

### Security Tests
Login real; negativos fuera de alcance.

### Accessibility Tests
Fuera de alcance (PB-P2-019).

### AI Tests
Pasos de IA con `MockAIProvider` (determinismo).

### Seed / Demo Tests
Seed reset previo verificado; consumo de datos demo.

### CI Checks
Smoke E2E en PR; suite completa pre-demo; bloquea merge/demo ante fallo del camino crítico (Doc 20 §22).

---

## 14. Observability & Audit

### Logs
Sin secretos en logs/traces/screenshots.

### Correlation ID
N/A a nivel de test.

### AdminAction
No aplica.

### Error Tracking
Evidencia de fallo (screenshot/trace) como artefactos de CI.

### Metrics
Duración de la suite como referencia (objetivos §21).

---

## 15. Seed / Demo Data Impact

### Seed Data Required
Requiere el seed idempotente (PB-P0-014) con volúmenes mínimos (vendors aprobados, quotes, ≥1 confirmed_intent, reseñas).

### Demo Scenario Supported
El camino demo principal completo.

### Reset / Isolation Notes
Seed reset antes de la corrida; aislamiento por corrida (no por test, dado el flujo lineal).

---

## 16. Documentation Alignment Required

| Document / Source | Conflict | Current Decision | Recommended Action | Blocks Implementation? |
|---|---|---|---|---|
| Entorno de ejecución E2E | La US no fija si el E2E corre local con seed o sobre entorno desplegado | Se decide con Tech Lead; ambos son compatibles con seed reset | Documentar el entorno E2E elegido y la política de retries en CI | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Flakiness E2E | CI inestable, falsos fallos | Selectores estables (`data-testid`/roles), auto-waiting, retries acotados |
| Seed reset fallido | Corrida no reproducible | Fail-fast en setup; verificar seed idempotente antes |
| Dependencia de IA real | No determinismo | `MockAIProvider` obligatorio; sin `OPENAI_API_KEY` |
| Suite E2E lenta | CI/demo lento | Smoke en PR (subset), suite completa pre-demo; paralelización de Playwright |
| Datos demo insuficientes | Pasos del flujo fallan | Depender de volúmenes mínimos de PB-P0-014 |

---

## 18. Implementation Guidance for Coding Agents

* **Archivos/carpetas probablemente impactados:** `frontend/tests/e2e/**` (o `e2e/`), `playwright.config.*`, scripts de setup (seed reset), config de CI (job E2E), y `data-testid`/roles en componentes del camino demo si faltan.
* **Orden recomendado:** (1) Playwright config (trace/screenshot on failure, retries, reporter); (2) setup de entorno + seed reset; (3) `MockAIProvider` en el entorno E2E; (4) selectores estables donde falten; (5) specs del camino demo; (6) smoke subset; (7) gate de CI.
* **Decisiones que no deben reabrirse:** Playwright como runner E2E (Doc 20 §21); `MockAIProvider` en pasos de IA; seed reset previo; E2E solo para journeys demo/críticos.
* **Qué no implementar:** backend/DB/seed nuevos, suites unit/integration/contract/A11Y/seguridad negativa, generación de OpenAPI.
* **Suposiciones a preservar:** el seed idempotente (PB-P0-014) y la CI (PB-P0-015) existen; la app es desplegable en un entorno de prueba con seed.

---

## 19. Task Generation Notes

* **Grupos de tareas sugeridos:** (OPS) Playwright config + CI; (OPS/QA) setup de entorno + seed reset; (AI) MockAIProvider en entorno E2E; (FE) selectores estables; (QA) specs del camino demo; (QA) smoke subset + evidencia; (DOC) documentar entorno y retries.
* **Tareas QA requeridas:** specs del camino demo, smoke subset, verificación de reproducibilidad y evidencia.
* **Tareas de seguridad requeridas:** solo login real como parte del flujo; sin secretos en artefactos.
* **Tareas de seed/demo requeridas:** seed reset previo a la corrida (consumo, no creación del seed).
* **Tareas de documentación requeridas:** entorno E2E elegido + política de retries.
* **Dependencias entre tareas:** config antes de setup; setup+MockAI antes de specs; specs antes de smoke y gate.
* **Consolidación:** PB-P2-016 puede consolidar sus tareas en un `tasks.md` propio.

---

## 20. Technical Spec Readiness

| Check | Status |
|---|---|
| User Story approved or explicitly allowed for draft spec | Pass (Approved with Minor Notes) |
| Product Backlog mapping found | Pass (PB-P2-016) |
| Decision Resolution reviewed if present | N/A (no existe) |
| Scope clear | Pass |
| Architecture alignment clear | Pass |
| API impact clear | N/A (end-to-end vía app) |
| DB impact clear | Pass (consume seed; sin cambios) |
| AI impact clear | Pass (MockAIProvider) |
| Security impact clear | Pass (login real; negativos fuera de alcance) |
| Testing strategy clear | Pass |
| Ready for Development Task Breakdown | Yes |

---

## 21. Final Recommendation

`Ready for Task Breakdown`

La historia está aprobada, mapeada a PB-P2-016, con alcance claro (E2E Playwright del camino demo sobre seed, IA con MockAIProvider, evidencia en fallo, gate de CI), sin cambios de backend/DB/seed. La única alerta de Documentation Alignment (entorno de ejecución E2E y retries) es **no bloqueante**. Testing, dependencia de seed y CI están suficientemente definidos para generar Development Tasks.
