# 🧾 User Story: Suite E2E Playwright sobre seed

## 🆔 Metadata

| Field              | Value                                |
| ------------------ | ------------------------------------ |
| ID                 | US-128                               |
| Epic               | EPIC-QA-001                          |
| Feature            | E2E principal                        |
| Backlog Item       | PB-P2-016                            |
| Module / Domain    | QA / Demo                            |
| User Role          | System                               |
| Priority           | Must Have                            |
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

**As the** equipo QA
**I want** una suite E2E con Playwright que ejercite el camino crítico de la demo (auth → event → plan IA → tasks → budget → vendors → quote request → quote → compare → booking → review) sobre un seed reproducible
**So that** el demo readiness quede garantizado y exista una red de seguridad automatizada antes de cada demo/merge.

---

## 🧠 Business Context

### Context Summary
La suite E2E es la cúspide reducida de la pirámide de pruebas (Doc 20 §5, §6.6). Ejecuta el flujo demo principal sobre el seed reproducible (PB-P0-014) y actúa como red de seguridad pre-demo: valida que el camino crítico de negocio funciona end-to-end en la aplicación real. Corre sobre un seed reset (idempotente) para garantizar reproducibilidad, captura screenshots/trace ante fallos como evidencia, y se ejecuta como compuerta de CI. El demo readiness depende directamente de esta suite (Nota del backlog PB-P2-016).

### Related Domain Concepts
* Camino demo del organizador: registro/login, creación de evento, plan IA (Mock), checklist/tasks, distribución de presupuesto, búsqueda de vendors, quote request, comparación de quotes, booking intent, review.
* Seed reproducible con `is_seed=true` (organizadores, vendors aprobados, eventos, quotes, booking, reseñas).
* `MockAIProvider` como dependencia determinística en los pasos de IA.

### Assumptions
* La estrategia E2E está definida en `/docs/20-Testing-Strategy.md` §6.6 y §25.1.
* El stack E2E es **Playwright** sobre entorno con seed (Doc 20 §21).
* El seed idempotente (PB-P0-014) existe y puede resetearse antes de la corrida.

### Dependencies
* PB-P0-014 — Seed script idempotente + datos demo (bloqueante para reproducibilidad).
* PB-P0-015 — Base de CI/pipeline que ejecuta las compuertas de calidad.
* Aplicación frontend + backend desplegables en un entorno de prueba con seed.

---

## 🔗 Traceability

| Source                 | Reference                                                        |
| ---------------------- | --------------------------------------------------------------- |
| FRD Requirement(s)     | Transversal — valida end-to-end los FR del camino demo principal. |
| Use Case(s)            | Camino demo del organizador (Doc 20 §25.1): crear evento, plan IA, checklist, presupuesto, vendors, quote request, comparación, booking, review. |
| Business Rule(s)       | Transversal — ejercita reglas BR-* a través de la UI real.      |
| Permission Rule(s)     | Ejercita el flujo de autenticación real (login). Escenarios de autorización negativa se cubren en su suite propia (PB-P2-018). |
| Data Entity / Entities | Transversal — consume entidades del seed (organizers, vendors, events, quotes, bookings, reviews). |
| API Endpoint(s)        | Transversal — a través de la aplicación real, no por invocación directa. |
| NFR Reference(s)       | NFR-TEST-*, NFR-PERF-API-001, NFR-OBS-001                       |
| Related ADR(s)         | ADR-TEST-001 (Vitest + Supertest; E2E con Playwright, Doc 20 §21), ADR-DEVOPS-001 |
| Related Document(s)    | /docs/20-Testing-Strategy.md (§6.6, §25.1), /docs/11-Data-Seed-Strategy.md, /docs/21-Deployment-and-DevOps-Design.md |
| Backlog Item           | PB-P2-016                                                        |

---

## 🧭 Scope Guardrails

### MVP Scope
* Scope Classification: In Scope
* MVP Relevance: Must Have

### In Scope
* Configuración de **Playwright** para E2E sobre un entorno con seed.
* Suite E2E que ejercita el **camino demo principal** del organizador end-to-end sobre datos del seed.
* Uso de **`MockAIProvider`** en los pasos de IA (plan, checklist, presupuesto, comparación).
* Ejecución sobre **seed reset** (idempotente) antes de cada corrida para reproducibilidad.
* Captura de **screenshots y trace** ante fallos como evidencia.
* Integración como **compuerta de CI** (smoke E2E en PR; suite completa antes de demo/merge protegido).

### Explicitly Out of Scope
* Suite unit + integration del backend (US-126 / PB-P2-014).
* Suite contract con MSW (US-127 / PB-P2-015).
* Suite IA ampliada con MockAIProvider como ítem propio (PB-P2-017).
* Suite RBAC negativa extendida / escenarios de seguridad negativa (PB-P2-018, Doc 20 §25.5).
* Suite A11Y (PB-P2-019).
* Creación o modificación del seed (PB-P0-014).
* Llamadas reales a proveedores de IA externos.
* Funciones futuras no listadas en el Epic Map.

### Scope Notes
* Respetar la pirámide de pruebas: E2E reservado a journeys demo/críticos, no a exhaustividad (Doc 20 §5, PT-01).
* Aprovechar datos preexistentes del seed (vendors aprobados, quotes) en lugar de crear estado ad-hoc innecesario.

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Camino demo principal end-to-end
**Given** la aplicación desplegada sobre el seed reproducible
**When** se ejecuta la suite E2E de Playwright
**Then** el camino demo del organizador (auth → event → plan IA → tasks → budget → vendors → quote request → quote → compare → booking → review) se ejecuta end-to-end y pasa.

### AC-02: Reproducibilidad sobre seed reset
**Given** el seed idempotente (PB-P0-014)
**When** se aplica un seed reset antes de la corrida y se ejecuta varias veces
**Then** el resultado es consistente y reproducible (mismos datos base, sin dependencia de estado previo).

### AC-03: Evidencia ante fallos
**Given** un paso E2E que falla
**When** ocurre el fallo
**Then** Playwright captura screenshot y trace del fallo como evidencia adjunta al reporte.

### AC-04: Pasos de IA determinísticos con MockAIProvider
**Given** los pasos del flujo que involucran IA (plan, checklist, presupuesto, comparación)
**When** se ejecuta la suite E2E
**Then** dichos pasos usan `MockAIProvider` (sin proveedor de IA real), garantizando determinismo.

### AC-05: Compuerta de CI
**Given** un Pull Request o una corrida pre-demo
**When** se ejecuta la compuerta de calidad de CI
**Then** el smoke E2E corre en cada PR y la suite E2E bloquea el merge/demo ante fallo del camino crítico (Doc 20 §22).

---

## ⚠️ Edge Cases

### EC-01: Seed no disponible o reset fallido
**Given** el seed no puede aplicarse o resetearse
**When** se ejecuta la suite E2E
**Then** la corrida falla de forma controlada (fail-fast) con un mensaje claro, sin marcar el flujo como verde.

#### Handling
* Fail-fast en el setup de la suite si el seed reset no completa.

### EC-02: Inestabilidad de selectores / timing (flakiness)
**Given** condiciones de red/timing variables
**When** se ejecuta la suite
**Then** se usan selectores estables (roles/test-ids) y las esperas/retries configuradas en Playwright para minimizar flakiness, sin ocultar fallos reales.

#### Handling
* Selectores por `data-testid`/roles; auto-waiting de Playwright; retries acotados en CI.

---

## 🚫 Validation Rules

| ID    | Rule                                                        | Message / Behavior                          |
| ----- | ---------------------------------------------------------- | ------------------------------------------- |
| VR-01 | Seed reset completado antes de la corrida                  | Fail-fast si no completa                    |
| VR-02 | Pasos de IA usan `MockAIProvider` (sin IA real)            | Bloquear/fallar si se intenta IA real       |
| VR-03 | Camino crítico completo debe pasar                         | Compuerta de CI falla si algún paso falla   |
| VR-04 | Evidencia (screenshot/trace) generada ante fallo           | Reporte incluye artefactos de fallo         |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                |
| ------ | ------------------------------------------------------------------- |
| SEC-01 | Aplicar políticas de seguridad del Doc 19 en los datos de prueba.   |
| SEC-02 | Secrets vía Secrets Manager; sin secretos reales de IA en CI.       |
| SEC-03 | Sin secretos en logs, screenshots ni traces.                        |
| SEC-04 | La suite ejercita el flujo de autenticación real (login); el backend sigue siendo source of truth. |

### Negative Authorization Scenarios
* Los escenarios de autorización negativa (401/403/429/415/413) se cubren en su suite propia (PB-P2-018, Doc 20 §25.5), fuera del alcance de esta historia.
* Configuración insegura del entorno de pruebas → bloqueo (fail-fast).

---

## 🤖 AI Behavior

This story does not invoke productive AI; the AI steps of the demo path run against `MockAIProvider`.

### AI Involvement
* AI Feature: None productiva (los pasos de IA del flujo demo usan `MockAIProvider`).
* Provider Layer: `MockAIProvider` en el entorno E2E.
* Human Validation Required: El flujo E2E ejercita aceptar/editar/rechazar la sugerencia IA (human-in-the-loop del producto).
* Persist AIRecommendation: Según el producto (el E2E verifica el flujo, no cambia la persistencia).
* Fallback Required: No como capacidad nueva.

### AI Input
* Fixtures de `MockAIProvider` para los pasos de IA del camino demo.

### AI Output
* Salida mock conforme a schema, validada por el flujo (no contenido literal).

### Human-in-the-loop Rules
* El E2E cubre aceptar/editar/rechazar la sugerencia IA en el camino demo (Doc 20 §25.1).

### AI Error / Fallback Behavior
* No es objetivo de esta historia (los errores/fallback de IA se cubren en la suite IA, PB-P2-017 / Doc 20 §25.4).

---

## 🎨 UX / UI Notes

| Area                | Notes |
| ------------------- | ----- |
| Screen / Route      | Rutas del camino demo del organizador (ejercidas, no modificadas). |
| Main UI Pattern     | N/A (no se crea UI nueva). |
| Primary Action      | N/A   |
| Secondary Actions   | N/A   |
| Empty State         | N/A   |
| Loading State       | N/A   |
| Error State         | N/A   |
| Success State       | N/A   |
| Accessibility Notes | A11Y se cubre en su suite propia (PB-P2-019). |
| Responsive Notes    | N/A   |
| i18n Notes          | El E2E puede validar strings desde el catálogo si aplica al camino demo. |
| Currency Notes      | El E2E ejercita la moneda del evento tal como la define el producto. |

---

## 🛠 Technical Notes

### Frontend
* Route / Page: Rutas del camino demo del organizador.
* Components: N/A (ejercidos vía UI real).
* State Management: N/A
* Forms: Ejercidos vía interacción real (login, crear evento, etc.).
* API Client: Ejercido end-to-end contra el backend real.
* Herramientas: Playwright sobre entorno con seed.

### Backend
* Use Case / Service: N/A (ejercido vía la app; no se modifica).
* Controller / Route: N/A
* Authorization Policy: Ejercida vía login real.
* Validation: N/A
* Transaction Required: N/A

### Database
* Main Tables: Consumidas desde el seed (organizers, vendors, events, quotes, bookings, reviews).
* Constraints: N/A (no se modifican).
* Index Considerations: N/A

### API

| Method | Endpoint | Purpose                                   |
| ------ | -------- | ----------------------------------------- |
| —      | —        | Ejercido end-to-end vía la aplicación real. |

### Observability / Audit
* Correlation ID Required: N/A a nivel de test (la app puede propagarlo internamente).
* Log Event Required: Sin secretos en logs/traces/screenshots.
* AdminAction Required: No (el camino demo es del organizador).
* AIRecommendation Required: Según producto en los pasos de IA.

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                        | Type |
| ----- | -------------------------------------------------------------- | ---- |
| TS-01 | Auth (register/login) del organizador                          | E2E  |
| TS-02 | Crear evento con moneda inicial                                | E2E  |
| TS-03 | Generar plan IA (Mock) y aceptar/editar/rechazar               | E2E  |
| TS-04 | Checklist/tasks y distribución de presupuesto (Mock)           | E2E  |
| TS-05 | Buscar vendors aprobados y enviar quote request                | E2E  |
| TS-06 | Comparar quotes (resumen IA Mock) y crear booking intent       | E2E  |
| TS-07 | Dejar review tras confirmación                                 | E2E  |

### Negative Tests

| ID    | Scenario                                    | Expected Result                     |
| ----- | ------------------------------------------- | ----------------------------------- |
| NT-01 | Seed reset no completa                      | Fail-fast con mensaje claro         |
| NT-02 | Paso crítico del camino demo falla          | Compuerta de CI falla + evidencia   |

### AI Tests
* Los pasos de IA del camino demo usan `MockAIProvider` (determinístico). Los escenarios de error/fallback de IA se cubren en PB-P2-017.

### Authorization Tests

| ID         | Scenario                                     | Expected Result |
| ---------- | -------------------------------------------- | --------------- |
| AUTH-TS-01 | Login del organizador válido                 | Acceso concedido al flujo demo |

### Accessibility Tests
* Fuera de alcance — cubierto en PB-P2-019.

---

## 📊 Business Impact

| Field               | Value                                                |
| ------------------- | ---------------------------------------------------- |
| KPI Affected        | Demo readiness, calidad, confianza pre-demo          |
| Expected Impact     | Red de seguridad automatizada del camino demo         |
| Success Criteria    | Camino demo end-to-end verde en CI sobre seed reset, con evidencia en fallo |
| Academic Demo Value | Alto — garantiza que la demo principal funciona end-to-end |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks
* Añadir `data-testid`/roles estables donde el E2E lo requiera (si falta).

### Potential Backend Tasks
* No aplica (no se modifica el backend).

### Potential Database Tasks
* No aplica (consume el seed; no lo modifica).

### Potential AI / PromptOps Tasks
* Asegurar `MockAIProvider` en el entorno E2E para los pasos de IA.

### Potential QA Tasks
* Configurar Playwright + entorno con seed.
* Escribir los specs del camino demo.
* Configurar evidencia (screenshot/trace) y retries.

### Potential DevOps / Config Tasks
* Job de CI: seed reset + smoke E2E en PR y suite completa pre-demo.
* Variables de entorno del entorno E2E (sin secretos de IA reales).

---

## ✅ Definition of Ready

* [x] Rol claro (System / equipo QA).
* [x] Goal técnico claro.
* [x] Referencias a Docs (Doc 20 §6.6/§25.1, Doc 11, ADR-TEST-001).
* [x] Permisos / Seguridad (login real; negativos fuera de alcance).
* [x] Entidades listadas (consumidas del seed).
* [x] AC en GWT.
* [x] Edge cases documentados.
* [x] Validación clara.
* [x] Out of Scope explícito.
* [x] Dependencias conocidas (PB-P0-014, PB-P0-015).
* [x] UX states identificados (ejercidos, sin UI nueva).
* [x] API definida (end-to-end vía app).
* [x] Tests definidos.
* [ ] Tech Lead validó.

---

## 🏁 Definition of Done

* [ ] Suite E2E del camino demo implementada y verde en CI.
* [ ] Corre sobre seed reset reproducible.
* [ ] Evidencia (screenshot/trace) generada ante fallos.
* [ ] Pasos de IA usan `MockAIProvider`.
* [ ] Smoke E2E como compuerta de CI; suite completa pre-demo bloqueante.
* [ ] Tech Lead valida.

---

## 📝 Notes
* Demo readiness es **dependiente** de esta suite (Nota del backlog PB-P2-016).
* Confirmar con Tech Lead el entorno de ejecución E2E (local con seed vs entorno desplegado) y la política de retries en CI.
