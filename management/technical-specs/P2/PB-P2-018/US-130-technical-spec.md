# Technical Specification — PB-P2-018 / US-130: Suite RBAC negativa extendida

## 1. Metadata

| Field                                | Value                                                                             |
| ------------------------------------ | --------------------------------------------------------------------------------- |
| User Story ID                        | US-130                                                                             |
| Source User Story                    | `management/user-stories/US-130-rbac-negative-suite.md`                            |
| Decision Resolution Artifact         | N/A — no existe `management/user-stories/decision-resolutions/US-130-decision-resolution.md` |
| Priority                             | P2 (Must Have)                                                                     |
| Backlog ID                           | PB-P2-018                                                                          |
| Backlog Title                        | Suite RBAC negativa extendida (RBAC + ownership + assignment por dominio)           |
| Backlog Execution Order              | 18 (decimoctavo ítem de P2)                                                        |
| User Story Position in Backlog Item  | 1 de 1                                                                             |
| Related User Stories in Backlog Item | US-130                                                                             |
| Epic                                 | EPIC-QA-001                                                                        |
| Backlog Item Dependencies            | PB-P0-008 (suite base de tests negativos RBAC + ownership)                         |
| Feature                              | Tests negativos RBAC/ownership/assignment                                          |
| Module / Domain                      | QA / Security                                                                      |
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
| Decision Resolution Artifact | No    | No   | No existe para US-130.                    |
| Product Backlog Prioritized  | Yes   | Yes  | PB-P2-018.                                |
| ADRs                         | Yes   | Yes  | ADR-SEC-001 (autorización), ADR-TEST-001 (Supertest). |

---

## 3. Backlog Execution Context

### Product Backlog Item

**PB-P2-018 — Suite RBAC negativa extendida** (EPIC-QA-001, P2, Must Have). Extiende PB-P0-008 con casos negativos por dominio: organizer/vendor/admin invadiendo recursos ajenos, escalamiento de privilegios, assignment incorrecto en QR/Quote. Acceptance: cobertura por dominio; fallos hacen fallar el merge. Dependencia: PB-P0-008. Trazabilidad: Doc 19, Doc 20.

### Execution Order Rationale

Decimoctavo ítem de P2. Depende de PB-P0-008 (base de tests negativos RBAC + ownership) y la extiende con cobertura por dominio. Es parte de la base de calidad de seguridad; complementa a US-126 (que solo cubre middleware auth/policy a nivel de integración mínima) con una suite API negativa exhaustiva por dominio.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item                          | Suggested Order |
| ---------- | --------------------------------------------- | --------------- |
| US-130     | Única historia del ítem (RBAC negativa extendida) | 1               |

---

## 3.1 Executive Technical Summary

Se debe construir una **suite negativa de autorización a nivel de API** (Vitest + Supertest) que **extienda PB-P0-008** con cobertura **por dominio** (organizer/vendor/admin). Valida que cada **endpoint sensible** devuelve **401** (anónimo), **403** (rol/privilegio incorrecto) o **404** (recurso ajeno, según convención de Doc 19) ante: `organizer` accediendo a recursos ajenos (BR-AUTH-006), `vendor` con **assignment inválido** en `QuoteRequest`/`Quote` o accediendo al evento más allá del brief (BR-AUTH-007), **escalamiento de privilegios** entre roles, acceso **no-admin** al panel admin (BR-AUTH-010) y **aislamiento de datos** entre cuentas (BR-AUTH-009). Las respuestas 403/404 deben usar el **envelope de error estándar** (`{ error }`) **sin fuga de datos**. El **backend es la única fuente de verdad** (tests golpean la API, no la UI). Corre como **compuerta de CI** que bloquea el merge.

No modifica la autorización productiva; la ejercita negativamente. Requiere fixtures de recursos protegidos con múltiples cuentas por rol.

---

## 4. Scope Boundary

### In Scope

* Suite API negativa (Supertest) por **dominio** y por **endpoint sensible**.
* Casos de **RBAC** (rol incorrecto → 403; anónimo → 401).
* Casos de **ownership** (organizer → recurso ajeno → 403/404).
* Casos de **assignment** (vendor → QR/Quote no asignada → 403/404; vendor → evento más allá del brief).
* Casos de **escalamiento de privilegios** entre roles.
* Casos de **aislamiento de datos** entre cuentas del mismo rol.
* Casos de **panel admin** restringido (no-admin → 403).
* Verificación de **envelope de error estándar** sin fuga de datos.
* **Gate de cobertura** de endpoints sensibles + integración como compuerta de CI.

### Out of Scope

* Casos positivos de autorización (suites funcionales de dominio + US-126).
* Duplicar la base PB-P0-008 (se **extiende**).
* Anti-bot/captcha (BR-AUTH-011), rate limit (429), validación de uploads (415/413) — historias de auth/upload propias.
* Guardas de ruta del frontend.
* E2E (US-128), contract (US-127), IA (US-129), A11Y (PB-P2-019).

### Explicit Non-Goals

* No modificar middlewares/policies productivos (solo probarlos).
* No probar caminos felices de autorización.
* No introducir nuevos endpoints.

---

## 5. Architecture Alignment

### Backend Architecture

Ejercita los middlewares de policy (RBAC + ownership + assignment) y controllers protegidos existentes (Express `/api/v1`), a nivel de API con Supertest sobre BD efímera. Sin cambios productivos.

### Frontend Architecture

No aplica — backend como source of truth; los tests no pasan por la UI.

### Database Architecture

BD efímera con fixtures de recursos protegidos y múltiples cuentas por rol (organizer A/B, vendor asignado/no asignado, admin/no-admin). Reutilizar helper `test-db` de US-126 si existe.

### API Architecture

Núcleo de la historia: validación negativa por endpoint sensible (401/403/404) con envelope estándar `{ error }`.

### AI / PromptOps Architecture

No aplica.

### Security Architecture

Alineado a Doc 19 (ADR-SEC-001): RBAC + ownership + assignment, backend source of truth, 403/404 sin fuga, convención 403 vs 404 por tipo de recurso. Extiende PB-P0-008.

### Testing Architecture

Vitest + Supertest (Doc 20 §6.3, §25.5). Matriz por rol/endpoint/dominio; gate de cobertura de endpoints sensibles; compuerta de CI.

---

## 6. Functional Interpretation

| Acceptance Criterion | Technical Interpretation | Impacted Layer(s) |
|---|---|---|
| AC-01 (cobertura por endpoint) | ≥1 caso negativo (401/403/404) por endpoint sensible; gate de cobertura. | API tests, CI |
| AC-02 (por dominio) | Casos organizer/vendor/admin: ownership, assignment, escalamiento, aislamiento, panel admin. | API tests, Security |
| AC-03 (envelope sin fuga) | Aserción de envelope `{ error }` estándar y ausencia de datos filtrados. | API tests |
| AC-04 (backend SoT) | Tests API directos (Supertest), sin UI. | API tests |
| AC-05 (gate CI) | Suite negativa bloquea merge ante fallo. | CI/DevOps |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts
Transversal a los dominios con recursos protegidos: events, vendors, quotes (QR/Quote), reviews, admin.

### Use Cases / Application Services
No se crean; se ejercitan negativamente los controllers/policies existentes.

### Controllers / Routes
Endpoints sensibles del MVP (inventario a confirmar con Tech Lead — nota no bloqueante).

### DTOs / Schemas
Se valida el envelope de error estándar `{ error }`.

### Repository / Persistence
Fixtures de recursos protegidos en BD efímera (múltiples cuentas por rol).

### Validation Rules
* VR-01: cada endpoint sensible con ≥1 caso negativo → gate falla si falta.
* VR-02: 403/404 con envelope estándar sin fuga → test falla si filtra.
* VR-03: anónimo → 401.
* VR-04: rol/ownership/assignment inválido → 403/404.

### Error Handling
403/404 sin filtrar existencia/datos del recurso; seguir convención de Doc 19.

### Transactions
Aislamiento por test (BD efímera).

### Observability
Verificar que 403/404 no filtren datos en el body ni en logs.

---

## 8. Frontend Technical Design

No aplica — backend como source of truth.

---

## 9. API Contract Design

| Method | Endpoint | Purpose | Auth Required | Request | Response | Error Cases |
|---|---|---|---|---|---|---|
| (varios) | Endpoints sensibles (Doc 16/Doc 19) | Validación negativa de autorización | Sí | — | — | 401 anónimo; 403 rol/privilegio; 404 recurso ajeno (según convención); envelope `{ error }` sin fuga |

Inventario exacto de endpoints sensibles a confirmar con Tech Lead (nota no bloqueante).

---

## 10. Database / Prisma Design

### Models Impacted
Ninguno se modifica. Fixtures de Event, VendorProfile, QuoteRequest, Quote, Review con múltiples cuentas por rol.

### Fields / Columns / Relations / Indexes / Constraints
Sin cambios; se consumen tal cual.

### Migrations Impact
Ninguna.

### Seed Impact
No requiere cambios de seed productivo; fixtures propios de prueba.

---

## 11. AI / PromptOps Design

No aplica — esta historia no involucra IA.

---

## 12. Security & Authorization Design

### Authentication
Casos de acceso anónimo → 401.

### Authorization
Núcleo: RBAC (rol incorrecto → 403), ownership (organizer → recurso ajeno → 403/404), assignment (vendor → QR/Quote no asignada → 403/404).

### Ownership Rules
BR-AUTH-006 (organizer solo sus eventos); aislamiento entre cuentas (BR-AUTH-009).

### Role Rules
BR-AUTH-007 (vendor), BR-AUTH-008/010 (admin/panel restringido); escalamiento de privilegios → 403.

### Negative Authorization Scenarios
NT-01..NT-08 (ver User Story): anónimo, evento ajeno, QR/Quote no asignada, evento más allá del brief, panel admin, escalamiento, aislamiento, fuga de datos.

### Audit Requirements
Verificar que las respuestas no filtren datos; sin secretos en logs.

### Sensitive Data Handling
403/404 sin fuga; sin PII real en fixtures.

---

## 13. Testing Strategy

### Unit Tests
Opcional para policies puras; el núcleo es API.

### Integration / API Tests (principal)
Supertest sobre BD efímera: matriz negativa por rol/endpoint/dominio; ownership, assignment, escalamiento, aislamiento, panel admin.

### E2E Tests
No aplica (US-128).

### Security Tests
Núcleo de la historia — cobertura negativa exhaustiva (Doc 20 §25.5).

### Accessibility / AI / Seed Tests
No aplica.

### CI Checks
Gate de cobertura de endpoints sensibles (≥1 negativo c/u) + suite negativa bloqueante.

---

## 14. Observability & Audit

### Logs
Sin secretos; verificar que 403/404 no filtren datos.

### Correlation ID / AdminAction / Error Tracking / Metrics
N/A a nivel de test, salvo la métrica de cobertura de endpoints sensibles.

---

## 15. Seed / Demo Data Impact

### Seed Data Required
No requiere cambios de seed productivo; fixtures de prueba con múltiples cuentas por rol.

### Demo Scenario Supported
Indirecto: refuerza la seguridad demostrable de la plataforma.

### Reset / Isolation Notes
BD efímera con reset por test.

---

## 16. Documentation Alignment Required

| Document / Source | Conflict | Current Decision | Recommended Action | Blocks Implementation? |
|---|---|---|---|---|
| Inventario de endpoints sensibles | La US no enumera los endpoints exactos | Confirmar inventario con Tech Lead (Doc 16/Doc 19) | Documentar la matriz endpoint×rol y la convención 403 vs 404 | No |
| Convención 403 vs 404 | Ambigüedad por tipo de recurso | Seguir Doc 19 (404 cuando revelar existencia filtra info) | Documentar la convención por recurso | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Cobertura incompleta de endpoints sensibles | Seguridad aparente | Gate de cobertura que falla si falta un negativo |
| Fuga de datos en 403/404 | Riesgo de seguridad | Aserción de envelope estándar sin datos del recurso |
| Ambigüedad 403 vs 404 | Inconsistencia | Convención documentada de Doc 19 por recurso |
| Duplicación con PB-P0-008 | Esfuerzo redundante | Extender, no reimplementar; reutilizar helpers/fixtures |
| Fixtures multi-cuenta complejos | Setup frágil | Helper `test-db` + fixtures por rol reutilizables |

---

## 18. Implementation Guidance for Coding Agents

* **Archivos/carpetas probablemente impactados:** `backend/tests/api/**` (auth/events/quotes/vendors/admin), `backend/tests/fixtures/**` (cuentas por rol), helper `test-db`, config de CI (gate de cobertura de seguridad).
* **Orden recomendado:** (1) fixtures multi-cuenta por rol; (2) helper de autenticación de prueba por rol; (3) casos por dominio (organizer/vendor/admin) — ownership, assignment, escalamiento, aislamiento, panel admin; (4) aserción de envelope sin fuga; (5) gate de cobertura de endpoints sensibles; (6) gate de CI.
* **Decisiones que no deben reabrirse:** backend como source of truth; extender PB-P0-008; envelope `{ error }` sin fuga; convención 403/404 de Doc 19.
* **Qué no implementar:** casos positivos, guardas de frontend, captcha/rate-limit/upload, nuevos endpoints.
* **Suposiciones a preservar:** PB-P0-008 y las policies de autorización existen.

---

## 19. Task Generation Notes

* **Grupos de tareas sugeridos:** (QA/SEC) fixtures multi-cuenta + helper auth; (SEC) casos organizer (ownership); (SEC) casos vendor (assignment/brief); (SEC) casos admin/escalamiento/aislamiento; (QA) aserción de envelope sin fuga; (OPS) gate de cobertura + CI; (DOC) matriz endpoint×rol + convención 403/404.
* **Tareas QA requeridas:** matriz negativa por dominio; verificación de no-fuga.
* **Tareas de seguridad requeridas:** ownership, assignment, escalamiento, aislamiento, panel admin (núcleo de la historia).
* **Tareas de seed/demo requeridas:** ninguna sobre seed productivo; fixtures de prueba.
* **Tareas de documentación requeridas:** inventario de endpoints sensibles + convención 403/404.
* **Dependencias entre tareas:** fixtures/helper antes de los casos; casos antes del gate de cobertura; gate antes de CI.
* **Consolidación:** PB-P2-018 puede consolidar sus tareas en un `tasks.md` propio.

---

## 20. Technical Spec Readiness

| Check | Status |
|---|---|
| User Story approved or explicitly allowed for draft spec | Pass (Approved with Minor Notes) |
| Product Backlog mapping found | Pass (PB-P2-018) |
| Decision Resolution reviewed if present | N/A (no existe) |
| Scope clear | Pass |
| Architecture alignment clear | Pass |
| API impact clear | Pass (validación negativa; sin nuevos endpoints) |
| DB impact clear | Pass (fixtures en BD efímera; sin cambios) |
| AI impact clear | N/A |
| Security impact clear | Pass (núcleo de la historia) |
| Testing strategy clear | Pass |
| Ready for Development Task Breakdown | Yes |

---

## 21. Final Recommendation

`Ready for Task Breakdown`

La historia está aprobada, mapeada a PB-P2-018, con alcance claro (suite negativa API de RBAC + ownership + assignment por dominio, envelope sin fuga, backend source of truth, gate de CI), sin cambios de autorización productiva. Las dos alertas de Documentation Alignment (inventario de endpoints sensibles y convención 403 vs 404) son **no bloqueantes**. Seguridad, testing y CI están suficientemente definidos para generar Development Tasks.
