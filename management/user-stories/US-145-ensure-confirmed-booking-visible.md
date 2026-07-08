# 🧾 User Story: Garantía verificada de `BookingIntent.confirmed_intent` + reseña visible del vendor demo principal

## 🆔 Metadata

| Field              | Value                                                       |
| ------------------ | ----------------------------------------------------------- |
| ID                 | US-145                                                      |
| Epic               | EPIC-DEMO-001 / EPIC-SEED-001                               |
| Backlog Item       | PB-P3-006 — Seed visible con BookingIntent + reseña demo    |
| Feature            | Demo readiness guard — seed verification                    |
| Module / Domain    | `seed-demo` / QA (verificación automatizada post-seed)      |
| User Role          | System (demo readiness guard)                               |
| Priority           | Must Have (P3)                                              |
| Status             | Approved with Minor Notes                                   |
| Owner              | Product Owner / Business Analyst                            |
| Approved By        | PO/BA Review                                                |
| Approval Date      | 2026-07-08                                                 |
| Ready for Development Tasks | Yes                                               |
| Sprint / Milestone | MVP — Demo Readiness P3                                     |
| Created Date       | 2026-06-09                                                  |
| Last Updated       | 2026-07-08                                                  |

---

## 🎯 User Story

**As the** sistema de EventFlow (guardia de demo readiness)
**I want** una verificación automatizada que, tras ejecutar el seed demo (PB-P0-014 / US-088), garantice que el **vendor demo principal** tiene al menos un `BookingIntent.confirmed_intent` visible y al menos una reseña verificada (`published`, ligada a ese `confirmed_intent`)
**So that** el guion de demo (US-142 / PB-P3-003) pueda evidenciar el cierre del flujo con reseñas verificadas sin riesgo de un "falso verde" cuando el seed esté ausente o incompleto.

---

## 🧠 Business Context

### Context Summary

Esta historia **no crea** los fixtures de `BookingIntent` ni de `Review`: esos los entrega **US-088 (PB-P0-014)**, ya aprobado, en `apps/api/src/modules/seed-demo/fixtures/booking-intents.fixture.ts` y `reviews.fixture.ts` (matriz Doc 11 §21/§22).

El aporte de US-145 es una **garantía verificable** enfocada en la demo: mientras US-088 asegura la *distribución general* (≥3 `confirmed_intent`, 20–40 reseñas, etc.), US-145 asegura que **específicamente el vendor demo principal** (persona de SEED-USER-003) esté ligado a ≥1 `confirmed_intent` visible en la demo y a ≥1 reseña verificada, y que exista un **test/aserción automatizado** que **falle (rojo)** si esa invariante crítica de demo no se cumple. Esto convierte "demo readiness" de una suposición manual en un quality gate ejecutable (BR-SEED-006, BR-SEED-007, NFR-DEMO-006).

Complementariamente, US-145 **mapea** esos registros garantizados al guion de demo (US-142) mediante referencias estables a SEED-BOOKING-001 / SEED-REVIEW-001 y al vendor demo (SEED-USER-003).

### Related Domain Concepts

* Entidades: `BookingIntent`, `Review`, `VendorProfile`, `User` (vendor demo principal), `Event` (SEED-EVENT-001).
* Estado clave: `BookingIntent.status = 'confirmed_intent'` (BR-BOOKING-003).
* Estado clave: `Review.status = 'published'` con `Review.booking_intent_id` → un `confirmed_intent` (BR-REVIEW-001).
* Banderas: `BookingIntent.is_seed=true`, `is_simulated=true`; `Review.is_seed=true`.
* "Reseña verificada" en EventFlow = `Review` `published` ligada a un `BookingIntent.confirmed_intent` (BR-REVIEW-001), con `rating ∈ {1..5}` (BR-REVIEW-003).

### PO/BA Decisions Applied

* Alcance mapeado a **PB-P3-006** (P3, Must Have, Epic EPIC-DEMO-001 / EPIC-SEED-001). Backlog: "Verificación automatizada del seed · Vendor demo principal con reseña · Mapeado al guion".
* US-145 es una historia de **verificación / garantía**, no de creación de fixtures. Los fixtures pertenecen a US-088 (BR-SEED-006/007, Doc 11 §21/§22) y no se reimplementan aquí.
* El "vendor demo principal" es una de las personas `approved` de SEED-USER-003. Si la matriz general de US-088 no fija explícitamente un `confirmed_intent` + reseña `published` a ese vendor específico, US-145 documenta la garantía y coordina el **pinning mínimo** con US-088 (nota de coordinación, sin duplicar sus fixtures).
* La verificación se ejecuta **después** del seed (`npm run seed` de US-085 o reset de US-086) y forma parte del quality gate de demo readiness.

### Assumptions

* US-088 ya provee los fixtures de `BookingIntent` (≥3 `confirmed_intent`) y `Review` (`published`/`hidden`/`removed`) con las invariantes de Doc 11 §21/§22.
* US-087 provee el evento demo (SEED-EVENT-001) y US-085 provee el vendor demo (SEED-USER-003 / `VendorProfile`).
* El stack de pruebas es Vitest + Supertest (ADR-TEST-001), consistente con la estrategia de testing (Doc 20).
* La verificación consulta el estado real de la base tras el seed (integración), no reimplementa la lógica de siembra.

### Dependencies

* **PB-P0-014 / US-088**: fixtures de `BookingIntent` + `Review` que esta historia verifica (dependencia dura; boundary).
* **PB-P0-014 / US-085 / US-086**: runner CLI y endpoint reset que producen el estado a verificar.
* **PB-P0-014 / US-087**: fixture de `Event` (SEED-EVENT-001).
* **US-142 / PB-P3-003**: guion de demo al que se mapean los registros garantizados.

---

## 🔗 Traceability

| Source                 | Reference                                                                                                                   |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| FRD Requirement(s)     | FR-SEED-004 (flujo de demo con datos seed)                                                                                   |
| Use Case(s)            | UC-DEMO-001                                                                                                                  |
| Business Rule(s)       | BR-SEED-006 (booking confirmado en seed), BR-SEED-007 (reseñas ligadas a `confirmed_intent`), BR-REVIEW-001 (reseña verificada), BR-REVIEW-003 (rating 1–5) |
| Permission Rule(s)     | No aplica — verificación automatizada del sistema; no introduce endpoints ni runtime authorization.                          |
| Data Entity / Entities | `BookingIntent`, `Review`, `VendorProfile` (solo lectura; sin cambios de schema)                                            |
| API Endpoint(s)        | No aplica — no crea ni consume endpoints nuevos (verificación de estado post-seed).                                          |
| NFR Reference(s)       | NFR-DEMO-006 (demo 10–15 min), NFR-TEST-004 (test E2E de flujos principales), NFR-TEST-002 (tests de reglas críticas)         |
| Related ADR(s)         | ADR-TEST-001 (Vitest + Supertest)                                                                                            |
| Data Seed Strategy     | Doc 11 §21 SEED-BOOKING-001, §22 SEED-REVIEW-001, SEED-USER-003 (vendor demo), SEED-EVENT-001 (evento demo)                  |
| Related Document(s)    | `/docs/11-Data-Seed-Strategy.md` §21/§22; `/docs/20-Testing-Strategy.md`; `/docs/8-Use-Cases-Specification.md` (UC-DEMO-001); `/docs/6-Domain-Data-Model.md` (BookingIntent, Review); `management/technical-specs/P0/PB-P0-014/US-088-technical-spec.md`; `management/artifacts/4-Product-Backlog-Prioritized.md` PB-P3-006 |

> Nota de trazabilidad: US-145 es una historia **transversal de verificación/demo readiness**. No implementa directamente un flujo funcional nuevo; garantiza y evidencia invariantes de seed ya definidas (BR-SEED-006/007) para el guion de demo.

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: In Scope
* MVP Relevance: Must Have (P3)

### In Scope

* Una **verificación automatizada** (test/aserción de integración, estilo Vitest, ejecutada tras el seed demo) que garantiza, para el **vendor demo principal** (SEED-USER-003):
  * ≥1 `BookingIntent.confirmed_intent` con `is_seed=true` e `is_simulated=true`, visible en el flujo de demo.
  * ≥1 reseña verificada: `Review.status='published'`, `Review.booking_intent_id` → un `confirmed_intent` del vendor demo, `rating ∈ {1..5}`, `is_seed=true`.
* La verificación **falla con mensaje claro** si falta cualquiera de las dos condiciones (guardia contra "falso verde").
* **Mapeo al guion de demo** (US-142): documentar la referencia estable de estos registros a SEED-BOOKING-001 / SEED-REVIEW-001 y al vendor demo (SEED-USER-003).
* **Coordinación (no duplicación)** con US-088 si la matriz general no fija explícitamente el `confirmed_intent` + reseña `published` al vendor demo principal: nota de coordinación para el pinning mínimo, sin reimplementar sus fixtures.

### Explicitly Out of Scope

* **No reimplementa** los fixtures de US-088 (`booking-intents.fixture.ts`, `reviews.fixture.ts`) ni su matriz Doc 11 §21/§22.
* **No implementa** `ConfirmBookingIntentUseCase`, `CancelBookingIntentUseCase`, `CreateReviewUseCase` ni `HideReviewUseCase` (módulos `event-planning` / `reviews-moderation`).
* **No crea UI**, endpoints HTTP, ni cambios de schema de base de datos.
* **No** genera datos manuales ni ejecuta flujos de negocio para producir el `confirmed_intent`/reseña (deben provenir del seed).
* Cualquier item P4/Future.

### Scope Notes

* "Reseña verificada del vendor demo" = `Review` `published` ligada a un `confirmed_intent` para ese vendor (BR-REVIEW-001). No requiere nuevo concepto de verificación.
* La verificación consulta el estado real post-seed; no valida la lógica interna del fixture (responsabilidad de US-088), sino el **resultado demo-crítico**.

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Verificación automatizada de `confirmed_intent` visible para el vendor demo principal
**Given** un entorno con el seed demo aplicado (PB-P0-014 / US-088 vía `npm run seed` o reset admin)
**When** se ejecuta la verificación automatizada post-seed
**Then** existe al menos un `BookingIntent` con `status='confirmed_intent'`, `is_seed=true` e `is_simulated=true` asociado al **vendor demo principal** (SEED-USER-003)
**And** dicho `confirmed_intent` es visible en el flujo de demo (perfil del vendor demo).

### AC-02: Verificación automatizada de reseña verificada del vendor demo principal
**Given** el seed demo aplicado
**When** se ejecuta la verificación automatizada post-seed
**Then** existe al menos una `Review` con `status='published'`, `is_seed=true`, `rating ∈ {1,2,3,4,5}` y `booking_intent_id` que referencia un `BookingIntent.confirmed_intent` del vendor demo principal (BR-REVIEW-001, BR-REVIEW-003, BR-SEED-007).

### AC-03: La verificación falla (rojo) ante ausencia — guardia de demo readiness
**Given** un entorno donde falta el `confirmed_intent` del vendor demo principal **o** falta su reseña verificada
**When** se ejecuta la verificación automatizada
**Then** la verificación **falla** (assertion en rojo / exit code distinto de 0) con un mensaje claro que identifica qué condición no se cumple
**And** no reporta "verde" falso (no se aprueba demo readiness con seed incompleto).

### AC-04: Mapeo al guion de demo
**Given** los registros garantizados (confirmed_intent + reseña verificada del vendor demo)
**When** se revisa la documentación de demo readiness
**Then** existe una referencia estable que mapea esos registros a SEED-BOOKING-001 / SEED-REVIEW-001, al vendor demo (SEED-USER-003) y al guion de demo (US-142 / PB-P3-003).

---

## ⚠️ Edge Cases

### EC-01: Seed no cargado o incompleto
**Given** el seed no se ha ejecutado, se ejecutó parcialmente, o el vendor demo principal no quedó ligado a un `confirmed_intent`/reseña `published`
**When** se ejecuta la verificación automatizada
**Then** la verificación **falla con mensaje claro** (por ejemplo `demo_readiness_missing_confirmed_intent` o `demo_readiness_missing_verified_review`) indicando la condición ausente
**And** nunca produce un falso verde.

#### Handling
* Fail-fast con mensaje accionable que apunte a re-ejecutar el seed (US-085) o revisar el pinning del vendor demo con US-088.

### EC-02: Reseña presente pero no verificada (no `published` o no ligada a `confirmed_intent`)
**Given** existe una reseña del vendor demo en estado `hidden`/`removed`, o `published` pero sin `booking_intent_id` que apunte a un `confirmed_intent`
**When** se ejecuta la verificación
**Then** esa reseña **no** satisface el criterio de "reseña verificada" y la verificación falla si no hay otra reseña que sí lo cumpla (BR-REVIEW-001).

#### Handling
* El criterio exige `published` + `booking_intent_id` → `confirmed_intent` del vendor demo. Coordinar pinning con US-088 si aplica.

---

## 🚫 Validation Rules

| ID    | Rule                                                                                                             | Message / Behavior                              |
| ----- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| VR-01 | Debe existir ≥1 `BookingIntent.confirmed_intent` (`is_seed=true`) del vendor demo principal.                     | Verificación falla si el conteo es 0 (AC-01/EC-01). |
| VR-02 | Debe existir ≥1 `Review` `published` (`is_seed=true`, `rating 1..5`) ligada a un `confirmed_intent` del vendor demo. | Verificación falla si el conteo es 0 (AC-02/EC-02). |
| VR-03 | La verificación no debe reportar verde si cualquiera de VR-01/VR-02 no se cumple.                                | Fail-fast con mensaje claro (AC-03).            |

---

## 🔐 Authorization & Security Rules

No aplica — esta historia no introduce endpoints ni runtime authorization; es una verificación automatizada del sistema sobre datos seed (ficticios, sin PII real).

| ID     | Rule                                                                                        |
| ------ | ------------------------------------------------------------------------------------------- |
| SEC-01 | La verificación opera sobre datos seed ficticios (`is_seed=true`); no expone ni maneja PII real. |
| SEC-02 | La verificación es de solo lectura sobre `BookingIntent`/`Review`/`VendorProfile`; no muta estado. |

### Negative Authorization Scenarios

* No aplica — sin flujo HTTP protegido. Los flujos consumidores (`/reviews/*`, `/booking-intents/*`) gestionan su autorización en sus propias User Stories.

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

No aplica — esta historia entrega una verificación automatizada y su mapeo al guion, no UI. La visibilidad en demo se apoya en las vistas ya cubiertas por sus propias User Stories (perfil de vendor, reseñas públicas).

| Area                | Notes     |
| ------------------- | --------- |
| Screen / Route      | No aplica |
| Main UI Pattern     | No aplica |
| Primary Action      | No aplica |
| Secondary Actions   | No aplica |
| Empty State         | No aplica |
| Loading State       | No aplica |
| Error State         | No aplica |
| Success State       | No aplica |
| Accessibility Notes | No aplica |
| Responsive Notes    | No aplica |
| i18n Notes          | No aplica |
| Currency Notes      | No aplica |

---

## 🛠 Technical Notes

### Frontend

No aplica.

### Backend

* No introduce use cases de negocio nuevos. La verificación se implementa como test/aserción de integración (Vitest, ADR-TEST-001) que consulta el estado real tras el seed.
* Consultas de solo lectura (vía `PrismaClient` o repositorios existentes):
  * `BookingIntent` `confirmed_intent` con `is_seed=true` filtrado por el `vendor_profile_id` del vendor demo principal (SEED-USER-003).
  * `Review` `published` con `is_seed=true`, `rating 1..5`, `booking_intent_id` → ese `confirmed_intent`.
* Ubicación sugerida: suite de verificación de seed/demo readiness dentro de `apps/api` (p. ej. `src/modules/seed-demo/**/*.demo-readiness.test.ts` o equivalente ya establecido por US-088/US-085), sin duplicar los fixtures.

### Database

* Tablas (solo lectura): `BookingIntent`, `Review`, `VendorProfile`. Sin cambios de schema, sin migraciones.

### API

No aplica — sin endpoints nuevos.

### Observability / Audit

* Correlation ID Required: No (verificación de test, no request HTTP).
* Log Event Required: Yes — mensaje de fallo claro que identifique la condición ausente (AC-03/EC-01).
* AdminAction Required: No.
* AIRecommendation Required: No.

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                                                                        | Type        |
| ----- | --------------------------------------------------------------------------------------------------------------- | ----------- |
| TS-01 | Tras seed, existe ≥1 `confirmed_intent` (`is_seed=true`) del vendor demo principal (AC-01).                      | Integration |
| TS-02 | Tras seed, existe ≥1 reseña `published` (`rating 1..5`) ligada a un `confirmed_intent` del vendor demo (AC-02).  | Integration |
| TS-03 | El mapeo al guion (SEED-BOOKING-001 / SEED-REVIEW-001 / SEED-USER-003 / US-142) está documentado y es coherente (AC-04). | Documentation / Review |

### Negative Tests

| ID    | Scenario                                                                                     | Expected Result                          |
| ----- | -------------------------------------------------------------------------------------------- | ---------------------------------------- |
| NT-01 | Seed sin `confirmed_intent` del vendor demo principal.                                        | Verificación falla con mensaje claro (VR-01 / EC-01). |
| NT-02 | Seed sin reseña `published` ligada a un `confirmed_intent` del vendor demo.                    | Verificación falla con mensaje claro (VR-02 / EC-01). |
| NT-03 | Reseña del vendor demo `hidden`/`removed` o `published` sin `booking_intent_id` a un `confirmed_intent`. | No satisface "verificada"; falla si no hay otra que sí (EC-02). |

### AI Tests

Not applicable for this story.

### Authorization Tests

No aplica — sin endpoints HTTP nuevos.

### Accessibility Tests

No aplica.

### Seed / Demo Tests

| ID      | Scenario                                                                                                   | Expected Result                        |
| ------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| SD-T-01 | Guardia de demo readiness: tras `npm run seed`, el vendor demo principal tiene `confirmed_intent` + reseña verificada. | Verde solo si ambas condiciones se cumplen. |
| SD-T-02 | Con seed incompleto, la guardia falla en rojo con mensaje accionable (no falso verde).                      | Fallo controlado (EC-01).              |

---

## 📊 Business Impact

| Field               | Value                                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------------- |
| KPI Affected        | Demo readiness; reproducibilidad QA; evidencia académica.                                          |
| Expected Impact     | La demo evidencia el cierre del flujo (confirmed_intent + reseña verificada) con garantía ejecutable. |
| Success Criteria    | La verificación automatizada pasa solo cuando el vendor demo principal cumple ambas condiciones.   |
| Academic Demo Value | Convierte demo readiness en un quality gate verificable (BR-SEED-006/007, NFR-DEMO-006).            |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks

No aplica.

### Potential Backend Tasks

* No aplica (sin use cases nuevos).

### Potential Database Tasks

* No aplica (solo lectura; sin migraciones).

### Potential AI / PromptOps Tasks

* Not applicable for this story.

### Potential QA Tasks

* Implementar la verificación automatizada post-seed (Vitest) para `confirmed_intent` + reseña verificada del vendor demo principal (TS-01/TS-02).
* Tests negativos de la guardia (NT-01..03, SD-T-02).

### Potential DevOps / Config Tasks

* Integrar la verificación en el pipeline post-seed de CI (quality gate de demo readiness).

### Potential Documentation Tasks

* Mapear los registros garantizados al guion de demo (US-142) y a SEED-BOOKING-001 / SEED-REVIEW-001 / SEED-USER-003.
* Nota de coordinación con US-088 para el pinning mínimo del vendor demo principal (si su matriz general no lo fija explícitamente).

---

## ✅ Definition of Ready

* [x] Rol claro (System / demo readiness guard).
* [x] Goal/valor claros (garantía verificable de demo readiness).
* [x] FRD/UC/BR/NFR enlazados con IDs verificados.
* [x] Permisos identificados (No aplica — verificación sin endpoints).
* [x] Entidades listadas (`BookingIntent`, `Review`, `VendorProfile` — solo lectura).
* [x] AC en GWT específicos y testeables (AC-01..04).
* [x] Edge cases documentados (EC-01..02).
* [x] Validación clara (VR-01..03).
* [x] Out of Scope explícito (no reimplementa fixtures de US-088; no use cases; no UI).
* [x] Dependencias conocidas (US-088, US-085, US-086, US-087, US-142).
* [x] UX states identificados (No aplica).
* [x] API definida (No aplica).
* [x] Tests definidos (TS, NT, SD-T).
* [ ] PO/BA validó (queda para el Approval Gate).

---

## 🏁 Definition of Done

* [ ] Existe verificación automatizada post-seed que asegura ≥1 `confirmed_intent` del vendor demo principal (AC-01).
* [ ] La verificación asegura ≥1 reseña verificada (`published`, ligada a `confirmed_intent`, `rating 1..5`) del vendor demo principal (AC-02).
* [ ] La verificación falla en rojo con mensaje claro ante seed ausente/incompleto (AC-03 / EC-01).
* [ ] Los registros garantizados están mapeados al guion de demo (US-142) y a SEED-BOOKING-001 / SEED-REVIEW-001 / SEED-USER-003 (AC-04).
* [ ] Coordinación con US-088 documentada (pinning mínimo del vendor demo principal, si aplica) sin duplicar fixtures.
* [ ] Verificación integrada y verde en CI.
* [ ] PO valida.

---

## 📝 Notes

* **Boundary explícito con US-088 (PB-P0-014):** US-088 crea y distribuye los fixtures de `BookingIntent` y `Review` (Doc 11 §21/§22). US-145 **no** los reimplementa; **verifica y garantiza** el subconjunto demo-crítico (vendor demo principal) y lo mapea al guion.
* "Reseña verificada" = `Review` `published` ligada a un `BookingIntent.confirmed_intent` (BR-REVIEW-001); no introduce un nuevo concepto de verificación.
* Nota de coordinación (no bloqueante): si la matriz general de US-088 no fija explícitamente un `confirmed_intent` + reseña `published` al vendor demo principal (SEED-USER-003), US-145 lo documenta y coordina el pinning mínimo con US-088; no lo resuelve duplicando fixtures.
* IDs de trazabilidad corregidos respecto del stub: se eliminó `NFR-PERF-API-001` (inexistente) y `NFR-OBS-001` (no relevante a una guardia de visibilidad); se resolvió `NFR-TEST-*` a `NFR-TEST-004`/`NFR-TEST-002`; se conservan `FR-SEED-004`, `UC-DEMO-001`, `BR-SEED-006`, `BR-SEED-007`, `BR-REVIEW-001`, `BR-REVIEW-003`, `NFR-DEMO-006`, `ADR-TEST-001` (todos verificados en docs).
