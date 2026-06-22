# 🧾 User Story: Seed fixture incluye `BookingIntent.confirmed_intent` y reseñas verificadas

## 🆔 Metadata

| Field                       | Value                                                            |
| --------------------------- | ---------------------------------------------------------------- |
| ID                          | US-088                                                           |
| Epic                        | EPIC-SEED-001 — Seed Data & Demo Scenarios                       |
| Backlog Item                | PB-P0-014 — Seed Script Idempotente + Datos Demo                 |
| Feature                     | BookingIntent confirmado + reseñas verificadas en seed (content fixture) |
| Module / Domain             | `seed-demo` (Backend, content fixture transversal)               |
| User Role                   | System (seed fixture invariant)                                  |
| Priority                    | Must Have                                                        |
| Status                      | Approved                                                         |
| Owner                       | Product Owner / Business Analyst                                 |
| Approved By                 | PO/BA Review                                                     |
| Approval Date               | 2026-06-22                                                       |
| Ready for Development Tasks | Yes                                                              |
| Sprint / Milestone          | MVP — Foundation P0                                              |
| Created Date                | 2026-06-09                                                       |
| Last Updated                | 2026-06-22                                                       |

---

## 🎯 User Story

**As the** sistema seed de EventFlow (operando vía `SeedDemoDataUseCase` provisto por US-085)
**I want** sembrar al menos un `BookingIntent.confirmed_intent` y al menos una reseña verificada asociada a ese booking, junto con el resto de la matriz de booking/reseñas definida en Doc 11 §21/§22
**So that** la demo guiada (UC-DEMO-001) pueda evidenciar el cierre del ciclo (Event → QuoteRequest → Quote → BookingIntent → Review verificada) y QA E2E pueda validar BR-REVIEW-001 (`solo reseñas verificadas`), BR-BOOKING-002/009 (`confirmación bilateral` y `cancelación desde confirmado`) y BR-BUDGET-005/006 (`BudgetItem.committed`).

---

## 🧠 Business Context

### Context Summary

US-088 garantiza el contenido (fixture) de `BookingIntent` y `Review` insertado por `SeedDemoDataUseCase` (US-085) y reusado por `ResetDemoUseCase` (US-086). Sin esta fixture, la demo no puede mostrar reseñas verificadas (BR-REVIEW-001 requiere `BookingIntent.confirmed_intent`), no puede evidenciar el cierre del flujo (Doc 9 §2 "QuoteRequest → Quote → BookingIntent confirmado"), y la suite QA E2E no puede validar BR-BOOKING-002 (confirmación bilateral) ni BR-BOOKING-009 (cancelación desde `confirmed_intent`).

La matriz exacta vive en Doc 11 §21 (BookingIntent) y §22 (Reviews):

* BookingIntents totales: 5–8 (Doc 11 §21).
* `confirmed_intent`: ≥ 3 (requeridos para habilitar reseñas verificadas).
* `pending`: 1–2.
* `cancelled` desde `pending`: 1.
* `cancelled` desde `confirmed_intent`: 1 (BR-BOOKING-009, decisión PO 8.1 §2 #5).
* `is_simulated=true` siempre.
* Reviews totales: 20–40, distribución 70 % `published`, 20 % `hidden`, 10 % `removed` (BR-SEED-007, BR-REVIEW-005).
* Cada Review seed se asocia a un `BookingIntent.confirmed_intent` (BR-SEED-007, BR-REVIEW-001).

US-088 no entrega runner, endpoint, UI ni job. Solo define el contenido del fixture y las invariantes verificables por QA tras `npm run seed` (US-085) y tras `POST /api/v1/admin/seed/reset` (US-086).

### Related Domain Concepts

* Entidades: `BookingIntent`, `Review`, `Quote`, `QuoteRequest`, `Event`, `User` (organizadores/proveedores seed), `VendorProfile`, `BudgetItem`, `Notification`, `AdminAction`.
* Estados `BookingIntent`: `pending`, `confirmed_intent`, `cancelled` (BR-BOOKING-003).
* Estados `Review`: `published`, `hidden`, `removed` (BR-REVIEW-005).
* Banderas/columnas relevantes: `BookingIntent.is_simulated`, `BookingIntent.is_seed`, `BookingIntent.cancelled_by`, `BookingIntent.cancellation_reason`, `BookingIntent.confirmed_at`, `BookingIntent.cancelled_at`; `Review.is_seed`, `Review.status`, `Review.moderated_by`, `Review.moderated_at`, `Review.moderation_reason`; `BudgetItem.committed`.
* Use cases consumidores: `SeedDemoDataUseCase` (US-085) inserta el fixture; `ResetDemoUseCase` (US-086) lo repuebla tras el reset.

### PO/BA Decisions Applied

* La distribución mínima sigue Doc 11 §21 (BookingIntent) y §22 (Reviews). No se altera por esta historia.
* `BookingIntent.is_simulated=true` siempre (BR-BOOKING-004/005, Doc 11 §21).
* Cada `BookingIntent` se origina de una `Quote` con `status='accepted'` y no expirada (BR-BOOKING-001).
* Un único `BookingIntent.confirmed_intent` por `(event, service_category)` (BR-BOOKING-007 / FR-BOOKING-009).
* Las reseñas seed solo se asocian a `BookingIntent.confirmed_intent` (BR-REVIEW-001, BR-SEED-007).
* La cancelación desde `confirmed_intent` se registra con `cancelled_by`, `cancellation_reason` y `cancelled_at > confirmed_at` (BR-BOOKING-009, Doc 11 §21).
* Las reseñas en `hidden`/`removed` registran `moderated_by`, `moderated_at`, `moderation_reason` y la `AdminAction` correspondiente (BR-REVIEW-005, NFR-DATA-007).
* Esta historia no entrega endpoint HTTP, UI ni job. El runner es US-085, el endpoint admin es US-086, el panel admin futuro es PB-P3-001 / US-140.

### Assumptions

* US-085 ya provee el runner CLI `npm run seed` y `SeedDemoDataUseCase`.
* US-086 ya provee el endpoint HTTP `POST /api/v1/admin/seed/reset` que reusa la misma siembra.
* US-087 ya provee eventos seed con suficiente cobertura de `completed` y `active` para enlazar `BookingIntent`.
* US-085 / US-099 / US-100 garantizan modelo Prisma con columnas `BookingIntent.is_simulated`, `cancelled_by`, `cancellation_reason`, `confirmed_at`, `cancelled_at`, `is_seed`; `Review.is_seed`, `Review.status`, `Review.moderated_by`, `Review.moderated_at`, `Review.moderation_reason`.
* Los fixtures de `QuoteRequest` y `Quote` (entregados por US-085 y referenciados por Doc 11 §19/§20) están operativos y proveen Quotes `accepted` no expiradas.
* `BudgetItem.committed` se actualiza por el path normal del use case `ConfirmBookingIntentUseCase`; el fixture puede sembrar el valor de `committed` consistente sin invocar el use case (consistente con la convención de seed `is_seed=true`).

### Dependencies

* **PB-P0-001 / US-099 / US-100**: schema Prisma con columnas requeridas en `BookingIntent` y `Review`.
* **PB-P0-002 / US-089**: backend modular monolith con módulo `seed-demo` (Doc 14 §10.16).
* **PB-P0-014 / US-085**: runner CLI y `SeedDemoDataUseCase` (consumidor del fixture). Provee también fixtures de `User`, `VendorProfile`, `Quote`, `QuoteRequest`, `Budget`/`BudgetItem`, `AdminAction`.
* **PB-P0-014 / US-086**: endpoint HTTP reset (re-aplica el fixture).
* **PB-P0-014 / US-087**: fixture de `Event` con eventos `completed` y `active` para enlazar booking + reseña.
* **US-140 / PB-P3-001**: UI futura del panel admin (boundary — fuera de US-088).

---

## 🔗 Traceability

| Source                 | Reference                                                                                                                                |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| FRD Requirement(s)     | FR-SEED-005, FR-BOOKING-001, FR-BOOKING-002, FR-BOOKING-003, FR-BOOKING-004, FR-REVIEW-001, FR-REVIEW-002, FR-REVIEW-004, FR-BUDGET-006, FR-DEMO-001 |
| Use Case(s)            | UC-DEMO-001, UC-BOOKING-001, UC-BOOKING-002, UC-BOOKING-003, UC-REVIEW-001, UC-REVIEW-003                                                  |
| Business Rule(s)       | BR-SEED-001, BR-SEED-002, BR-SEED-005, BR-SEED-006, BR-SEED-007, BR-SEED-010, BR-BOOKING-001, BR-BOOKING-002, BR-BOOKING-003, BR-BOOKING-004, BR-BOOKING-005, BR-BOOKING-006, BR-BOOKING-007, BR-BOOKING-008, BR-BOOKING-009, BR-BOOKING-010, BR-REVIEW-001, BR-REVIEW-003, BR-REVIEW-005, BR-BUDGET-005, BR-PRIVACY-010 |
| Permission Rule(s)     | Sistema seed (no rol de aplicación). El acceso operativo a las entidades sigue las reglas estándar (Doc 19 §10).                          |
| Data Entity / Entities | `BookingIntent`, `Review`, `Quote`, `QuoteRequest`, `Event`, `User`, `VendorProfile`, `BudgetItem`, `Notification`, `AdminAction`         |
| API Endpoint(s)        | No aplica — esta historia entrega contenido (fixture). El consumo se realiza vía `SeedDemoDataUseCase` (US-085) y `ResetDemoUseCase` (US-086). |
| NFR Reference(s)       | NFR-DEMO-001, NFR-DEMO-002, NFR-DATA-007, NFR-OBS-001, NFR-PRIV-004, NFR-I18N-006                                                          |
| Related ADR(s)         | ADR-DEVOPS-003 (App Runner), ADR-DEVOPS-004 (RDS)                                                                                         |
| Related Document(s)    | `/docs/3-MVP-Scope-Definition.md` §7.16, §14.4; `/docs/4-Business-Rules-Document.md` §BR-BOOKING / §BR-REVIEW / §BR-SEED; `/docs/8.1-Product-Owner-Decisions-Use-Cases-Addendum.md` §2 #1 / #5 / #11; `/docs/9-Functional-Requirements-Document.md` §FR-SEED-005 / §FR-BOOKING / §FR-REVIEW; `/docs/11-Data-Seed-Strategy.md` §21 / §22; `/management/artifacts/4-Product-Backlog-Prioritized.md` PB-P0-014 |

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: In Scope
* MVP Relevance: Must Have

### In Scope

* Definir el fixture de `BookingIntent` insertado por `SeedDemoDataUseCase` cubriendo la matriz de Doc 11 §21:
  * Total: 5–8.
  * `confirmed_intent`: ≥ 3.
  * `pending`: 1–2.
  * `cancelled` desde `pending`: 1.
  * `cancelled` desde `confirmed_intent`: 1 (BR-BOOKING-009, Doc 8.1 §2 #5).
* Definir el fixture de `Review` insertado por `SeedDemoDataUseCase` cubriendo la matriz de Doc 11 §22:
  * Total: 20–40.
  * `published`: ~70 %.
  * `hidden`: ~20 %.
  * `removed`: ~10 %.
  * Cada review asociada a un `BookingIntent.confirmed_intent` y a un `VendorProfile` consistente.
* Garantizar `BookingIntent.is_simulated=true` y `is_seed=true` en todos los registros (BR-SEED-005, BR-BOOKING-004).
* Asegurar único `confirmed_intent` por `(event, service_category)` (BR-BOOKING-007 / FR-BOOKING-009).
* Asegurar `cancelled_at > confirmed_at` en el booking cancelado desde `confirmed_intent` (Doc 11 §21).
* Asegurar `Review.moderated_by`, `moderated_at`, `moderation_reason` en estados `hidden`/`removed` y `AdminAction` correspondiente (BR-REVIEW-005, NFR-DATA-007).
* Reflejar `BudgetItem.committed` consistente con cada `confirmed_intent` (BR-BUDGET-005/006).
* Garantizar idempotencia: ejecutar `npm run seed` o `POST /admin/seed/reset` N veces deja los mismos conteos sin duplicados.
* Garantizar cobertura cultural LATAM (BR-SEED-004) en textos de reseñas y razones de cancelación.

### Explicitly Out of Scope

* Runner CLI → US-085.
* Endpoint HTTP `POST /api/v1/admin/seed/reset` → US-086.
* Fixture de `Event` y `EventType` → US-087.
* Fixture de `User`, `VendorProfile`, `Quote`, `QuoteRequest`, `Budget`/`BudgetItem`, `AdminAction` → US-085.
* Implementación de use cases del módulo `event-planning` (`ConfirmBookingIntentUseCase`, `CancelBookingIntentUseCase`, `CreateReviewUseCase`, `HideReviewUseCase`).
* UI admin / panel demo → PB-P3-001 / US-140.
* Generación de notificaciones reales (las `Notification` asociadas se siembran por US-085 si aplica; no requiere SMTP).
* Pagos reales o captura de medios de pago (BR-OOS-001, BR-BOOKING-004).
* Contratos digitales con firma electrónica (BR-OOS-003, BR-BOOKING-005).
* Cualquier item P4/Future (BR-OOS-001..017).

### Scope Notes

* La matriz exacta vive en Doc 11 §21 / §22 y debe respetarse. Esta historia consume esa matriz; no la redefine.
* El `cancelled_at` del booking cancelado desde `confirmed_intent` debe ser estrictamente posterior a `confirmed_at` (Doc 11 §21).
* Los `confirmed_intent` se asocian preferentemente a eventos `completed` (Doc 11 §"Eventos") para habilitar las reseñas históricas.
* El `cancelled_at` se computa relativo en runtime cuando aplica (consistente con la convención de fechas relativas de US-087).

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Distribución de `BookingIntent` por estado tras seed
**Given** un entorno con migraciones aplicadas y `SEED_DEMO_ENABLED=true`
**When** se ejecuta `npm run seed` (US-085) o `POST /api/v1/admin/seed/reset` (US-086)
**Then** la tabla `BookingIntent` filtrada por `is_seed=true` contiene:
  - al menos 3 registros con `status='confirmed_intent'`,
  - al menos 1 registro con `status='pending'`,
  - al menos 1 registro con `status='cancelled'` y `cancelled_by='vendor'` proveniente de `pending`,
  - al menos 1 registro con `status='cancelled'` proveniente de `confirmed_intent` (con `confirmed_at` no nulo y `cancelled_at > confirmed_at`),
**And** el total de bookings seed está entre 5 y 8 (Doc 11 §21).

### AC-02: Invariantes obligatorias en `BookingIntent`
**Given** seed ejecutado exitosamente
**When** se consulta `BookingIntent` filtrado por `is_seed=true`
**Then** el 100 % de los registros tienen `is_simulated=true` (BR-BOOKING-004) y `is_seed=true` (BR-SEED-005)
**And** cada registro referencia un `Quote` con `status='accepted'` y `valid_until > now() en el momento de la siembra` (BR-BOOKING-001)
**And** no existen dos `confirmed_intent` para la misma combinación `(event_id, service_category_id)` (BR-BOOKING-007).

### AC-03: Cobertura de reseñas verificadas asociadas a `confirmed_intent`
**Given** seed ejecutado exitosamente
**When** se consulta `Review` filtrado por `is_seed=true`
**Then** existen entre 20 y 40 reseñas seed (Doc 11 §22)
**And** la distribución por estado es ~70 % `published`, ~20 % `hidden`, ~10 % `removed`
**And** cada reseña seed referencia un `BookingIntent.confirmed_intent` real con `is_seed=true` (BR-SEED-007, BR-REVIEW-001)
**And** cada reseña tiene `rating` ∈ {1, 2, 3, 4, 5} (BR-REVIEW-003 / FR-REVIEW-002).

### AC-04: Trazabilidad de moderación en reseñas `hidden`/`removed`
**Given** seed ejecutado exitosamente
**When** se consulta `Review` filtrado por `is_seed=true` y `status IN ('hidden', 'removed')`
**Then** todas las filas tienen `moderated_by` no nulo y referencia a un admin seed
**And** todas las filas tienen `moderated_at` no nulo y `moderation_reason` no nulo (BR-REVIEW-005, NFR-DATA-007)
**And** existe una fila correspondiente en `AdminAction` con `action='HIDE_REVIEW'` o `action='REMOVE_REVIEW'` y `correlation_id` consistente (BR-ADMIN-004/011, NFR-OBS-001).

### AC-05: Coherencia presupuestal con `BudgetItem.committed`
**Given** seed ejecutado exitosamente
**When** se consulta `BudgetItem` asociado al `event_id` y `service_category_id` de cada `BookingIntent.confirmed_intent`
**Then** `BudgetItem.committed` refleja un valor consistente con el `Quote.total_amount` aceptado (BR-BUDGET-005, BR-BOOKING-008).

### AC-06: Idempotencia del fixture
**Given** seed ejecutado exitosamente al menos una vez
**When** se ejecuta el runner nuevamente sin reset previo
**Then** los conteos por estado de `BookingIntent` y por `status` de `Review` permanecen iguales
**And** no se generan duplicados (verificación por clave natural / UUID determinista).

---

## ⚠️ Edge Cases

### EC-01: Columnas requeridas ausentes en el schema
**Given** el schema Prisma no incluye `BookingIntent.is_simulated`, `cancelled_by`, `cancellation_reason`, `confirmed_at` o `cancelled_at`, o no incluye `Review.moderated_by`, `moderated_at`, `moderation_reason`
**When** se ejecuta el seed
**Then** el runner falla con `migration_required` y exit code distinto de 0
**And** no se insertan registros parciales.

#### Handling
* Dependencia con US-100 (migraciones). El seed no aplica migraciones.

### EC-02: Quote expirada o no aceptada referenciada
**Given** el fixture pretende crear un `BookingIntent` referenciando un `Quote` con `status != 'accepted'` o `valid_until < now()`
**When** el runner valida la integridad
**Then** falla con `quote_invalid_for_booking` y no inserta el `BookingIntent` (BR-BOOKING-001).

#### Handling
* La fixture debe seleccionar Quotes seed correctos (responsabilidad del fixture; US-085 provee `valid_until` lo suficientemente largo o relativo).

### EC-03: Cancelación desde `confirmed_intent` sin `confirmed_at`/`cancelled_at` coherentes
**Given** un registro de `BookingIntent` cancelado desde `confirmed_intent`
**When** se valida el fixture
**Then** `confirmed_at` debe estar presente y `cancelled_at > confirmed_at` (Doc 11 §21)
**And** debe registrarse `cancelled_by`, `cancellation_reason`.

#### Handling
* El fixture computa ambas marcas con offsets relativos consistentes.

### EC-04: Reseña asociada a booking no confirmado
**Given** el fixture pretende crear una `Review` referenciando un `BookingIntent` con `status != 'confirmed_intent'`
**When** el runner valida la integridad
**Then** falla con `review_requires_confirmed_intent` (BR-REVIEW-001, BR-BOOKING-010).

#### Handling
* La fixture asocia reseñas solo a confirmados.

---

## 🚫 Validation Rules

| ID    | Rule                                                                                                                | Message / Behavior                              |
| ----- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| VR-01 | Todos los `BookingIntent` seed tienen `is_simulated=true` y `is_seed=true`.                                          | Falla del runner si algún registro queda con `false`. |
| VR-02 | `BookingIntent.status` ∈ {`pending`, `confirmed_intent`, `cancelled`} (BR-BOOKING-003).                              | Falla del runner ante valor inválido.           |
| VR-03 | `BookingIntent` referencia un `Quote` con `status='accepted'` y no expirado (BR-BOOKING-001).                        | Falla del runner ante FK inválida (EC-02).      |
| VR-04 | Único `confirmed_intent` por `(event_id, service_category_id)` (BR-BOOKING-007).                                     | Falla del runner ante violación.                |
| VR-05 | `cancelled_at > confirmed_at` cuando el booking se cancela desde `confirmed_intent` (Doc 11 §21).                    | Falla del runner ante inconsistencia (EC-03).   |
| VR-06 | `Review` referencia un `BookingIntent.confirmed_intent` (BR-REVIEW-001).                                             | Falla del runner ante FK inválida (EC-04).      |
| VR-07 | `Review.rating` ∈ {1, 2, 3, 4, 5} (BR-REVIEW-003).                                                                   | Falla del runner ante valor fuera de rango.     |
| VR-08 | `Review.status` ∈ {`published`, `hidden`, `removed`} (BR-REVIEW-005).                                                | Falla del runner ante valor inválido.           |
| VR-09 | `Review.moderated_by/at/reason` no nulos cuando `status ∈ {hidden, removed}` y `AdminAction` correspondiente existe. | Falla del runner ante omisión (AC-04).          |
| VR-10 | `BudgetItem.committed` refleja `Quote.total_amount` aceptado por cada `confirmed_intent` (BR-BUDGET-005).            | Falla del runner ante inconsistencia (AC-05).   |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                                                                                       |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| SEC-01 | Esta historia no introduce endpoints HTTP. La autorización aplica al runner (US-085) y al endpoint admin (US-086), no al fixture.            |
| SEC-02 | Todos los `BookingIntent` y `Review` seed deben usar datos ficticios sin PII real (BR-SEED-010, BR-PRIVACY-010, NFR-PRIV-004).               |
| SEC-03 | Las reseñas seed deben respetar BR-REVIEW-001 (solo asociadas a `confirmed_intent`) y BR-REVIEW-005 (moderación con `AdminAction`).          |
| SEC-04 | Sin captura de medios de pago, sin contrato firmado y sin moderación automática IA (BR-OOS-001, BR-BOOKING-004/005, BR-OOS-008).             |

### Negative Authorization Scenarios

* No aplica directamente — el fixture es contenido, no flujo HTTP. Los flujos protegidos consumidores (`/booking-intents/*`, `/reviews/*`, `/admin/reviews/*`) ya gestionan sus propios escenarios negativos en sus User Stories.

---

## 🤖 AI Behavior

This story does not invoke AI directly.

### AI Involvement
* AI Feature: None
* Provider Layer: Not applicable
* Human Validation Required: Not applicable
* Persist AIRecommendation: No (las `AIRecommendation` se siembran en US-085 con `MockAIProvider` determinista)
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

No aplica — esta historia entrega un fixture de contenido seed, no UI. Los flujos que muestran bookings, reseñas y moderación (panel admin, perfil vendor, post-evento) se cubren en sus User Stories propias.

| Area                | Notes        |
| ------------------- | ------------ |
| Screen / Route      | No aplica    |
| Main UI Pattern     | No aplica    |
| Primary Action      | No aplica    |
| Secondary Actions   | No aplica    |
| Empty State         | No aplica    |
| Loading State       | No aplica    |
| Error State         | No aplica    |
| Success State       | No aplica    |
| Accessibility Notes | No aplica    |
| Responsive Notes    | No aplica    |
| i18n Notes          | Reseñas seed cubren al menos 2 locales (`es-LATAM`, `en`) alineadas con NFR-I18N-006 |
| Currency Notes      | `BudgetItem.committed` respeta la moneda del evento (BR-EVENT-007)                   |

---

## 🛠 Technical Notes

### Frontend

No aplica.

### Backend

* Module: `seed-demo` (Doc 14 §10.16).
* Punto de extensión: dataset/factory dentro de `apps/api/src/modules/seed-demo/fixtures/booking-intents.fixture.ts` y `apps/api/src/modules/seed-demo/fixtures/reviews.fixture.ts` (o equivalentes), invocados por `SeedDemoDataUseCase` (US-085).
* Datos relacionales requeridos: `Event` (US-087), `User` (organizadores + proveedores seed, US-085), `VendorProfile` (US-085), `Quote`/`QuoteRequest` (US-085), `BudgetItem` (US-085).
* Inserción vía `prisma.bookingIntent.upsert` y `prisma.review.upsert` con UUID determinista (namespace `seed:booking:*` y `seed:review:*`).
* Generación de `AdminAction` para cada review `hidden`/`removed` (reuso de `AdminActionRepository`).
* Actualización idempotente de `BudgetItem.committed` para cada `confirmed_intent` (cálculo derivado de `Quote.total_amount`).
* Cálculo de fechas: `confirmed_at` y `cancelled_at` con offsets relativos al `Event.event_date` cuando aplica.

### Database

* Tablas: `BookingIntent`, `Review`, `BudgetItem` (write), `AdminAction` (write), `Quote`/`QuoteRequest`/`Event`/`VendorProfile`/`User` (read FK).
* Columnas requeridas: las listadas en §Related Domain Concepts; verificar disponibilidad en US-099/100.
* Index Considerations: índice por `is_seed` (US-101), `(event_id, service_category_id)` ya existente para BR-BOOKING-007.

### API

No aplica — sin endpoint nuevo. El acceso a estas entidades pasa por `SeedDemoDataUseCase` (US-085) y `ResetDemoUseCase` (US-086).

### Observability / Audit

* Correlation ID Required: Yes (heredado del runner / endpoint que invoca el fixture).
* Log Event Required: Yes — el `SeedReport` (US-085) y el `ResetReport` (US-086) deben reportar conteos por entidad incluyendo `BookingIntent` por estado y `Review` por status.
* AdminAction Required: Yes — una fila por cada `Review` seed con `status ∈ {hidden, removed}` (BR-ADMIN-004/011, NFR-OBS-001).
* AIRecommendation Required: No.

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                                                                                                       | Type        |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| TS-01 | Distribución de `BookingIntent`: `confirmed_intent≥3`, `pending≥1`, `cancelled` desde `pending`≥1, `cancelled` desde `confirmed_intent`≥1, total 5–8 (AC-01). | Integration |
| TS-02 | Invariantes `BookingIntent`: `is_simulated=true`, `is_seed=true`, Quote `accepted` no expirado, unicidad `(event, category)` (AC-02).        | Integration |
| TS-03 | Distribución de `Review`: total 20–40 y proporciones por status (AC-03).                                                                       | Integration |
| TS-04 | Cada `Review` referencia un `BookingIntent.confirmed_intent` y `rating ∈ {1..5}` (AC-03).                                                       | Integration |
| TS-05 | Reseñas `hidden`/`removed` tienen `moderated_*` no nulos y `AdminAction` correspondiente (AC-04).                                                | Integration |
| TS-06 | `BudgetItem.committed` coherente con `Quote.total_amount` por cada `confirmed_intent` (AC-05).                                                  | Integration |
| TS-07 | Idempotencia: doble seed deja los mismos conteos por estado/status (AC-06).                                                                    | Integration |

### Negative Tests

| ID    | Scenario                                                                                                              | Expected Result                       |
| ----- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| NT-01 | Algún `BookingIntent` con `is_simulated=false` o `is_seed=false`                                                       | Falla del runner (VR-01)              |
| NT-02 | `BookingIntent.status` fuera de la máquina de estados                                                                  | Falla del runner (VR-02)              |
| NT-03 | `BookingIntent` referencia un `Quote` expirado o no aceptado                                                            | Falla del runner (EC-02 / VR-03)      |
| NT-04 | Dos `confirmed_intent` para la misma combinación `(event, category)`                                                   | Falla del runner (VR-04)              |
| NT-05 | `cancelled_at <= confirmed_at` para un booking cancelado desde `confirmed_intent`                                       | Falla del runner (EC-03 / VR-05)      |
| NT-06 | `Review` referencia un booking que no está en `confirmed_intent`                                                       | Falla del runner (EC-04 / VR-06)      |
| NT-07 | `Review.rating` fuera del rango 1–5                                                                                    | Falla del runner (VR-07)              |
| NT-08 | `Review.status` fuera de {`published`, `hidden`, `removed`}                                                            | Falla del runner (VR-08)              |
| NT-09 | `Review` `hidden`/`removed` sin `moderated_*` o sin `AdminAction` asociada                                              | Falla del runner (VR-09)              |
| NT-10 | Schema sin columnas requeridas en `BookingIntent`/`Review`                                                              | Runner falla con `migration_required` (EC-01) |

### AI Tests

Not applicable for this story.

### Authorization Tests

No aplica — sin endpoints HTTP nuevos.

### Accessibility Tests

No aplica.

### Seed / Demo Tests

| ID      | Scenario                                                                                                            | Expected Result                            |
| ------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| SD-T-01 | Tras seed, la demo puede mostrar al menos un `confirmed_intent` y una reseña verificada en el perfil del vendor demo. | Flujo verificable en demo guiada.          |
| SD-T-02 | Tras seed, la demo puede mostrar un booking cancelado desde `confirmed_intent` con razón documentada (BR-BOOKING-009). | Caso visible en panel.                      |
| SD-T-03 | Reset surgical (US-086) reaplica los conteos del fixture sin duplicados (AC-06).                                     | Conteos iguales tras N resets.             |
| SD-T-04 | Cada reseña `hidden`/`removed` permite QA del panel admin moderación (BR-REVIEW-005, NFR-DATA-007).                  | Reseñas y `AdminAction` consistentes.       |

---

## 📊 Business Impact

| Field               | Value                                                                                                       |
| ------------------- | ----------------------------------------------------------------------------------------------------------- |
| KPI Affected        | Demo readiness; QA E2E reproducibility; evaluación académica                                                  |
| Expected Impact     | La demo guiada evidencia el cierre del flujo (QuoteRequest → Quote → BookingIntent → Review verificada) sin operaciones manuales. |
| Success Criteria    | Conteos mínimos por estado siempre cumplidos; integridad referencial; idempotencia; auditoría completa.       |
| Academic Demo Value | Evidencia BR-REVIEW-001 (reseñas verificadas), BR-BOOKING-002/009 y BR-BUDGET-005/006 sin requerir flujos manuales. |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks

No aplica.

### Potential Backend Tasks

* Definir tipos `BookingIntentSeedRecord` y `ReviewSeedRecord` con UUIDs deterministas.
* Implementar `booking-intents.fixture.ts` y `reviews.fixture.ts`.
* Cálculo dinámico de `confirmed_at`/`cancelled_at`.
* Inserción idempotente con upsert por clave natural.
* Actualización idempotente de `BudgetItem.committed`.
* Registro de `AdminAction` por reseña `hidden`/`removed`.
* Integración con `SeedDemoDataUseCase` (US-085).

### Potential Database Tasks

* Verificar columnas requeridas en `BookingIntent` y `Review` (US-099/100).

### Potential AI / PromptOps Tasks

* Not applicable for this story.

### Potential QA Tasks

* Tests de integración por cada AC (TS-01..07).
* Tests negativos (NT-01..10).
* Tests seed/demo (SD-T-01..04).

### Potential DevOps / Config Tasks

* No aplica directamente (config de flag vive en US-085 / US-086).

---

## ✅ Definition of Ready

* [x] Rol claro (System / seed fixture).
* [x] Goal/valor claros (cierre de ciclo y reseñas verificadas en demo).
* [x] FRD/UC/BR enlazados con IDs verificados.
* [x] Permisos identificados (no aplica HTTP — fixture content).
* [x] Entidades listadas (`BookingIntent`, `Review`, `BudgetItem`, `AdminAction` + FKs).
* [x] AC en GWT específicos y testeables (AC-01..06).
* [x] Edge cases documentados (EC-01..04).
* [x] Validación clara (VR-01..10).
* [x] Out of Scope explícito.
* [x] Dependencias conocidas (US-085, US-086, US-087, US-099, US-100, US-101).
* [x] UX states identificados (No aplica — fixture content).
* [x] API definida (No aplica — fixture content).
* [x] Tests definidos (TS, NT, SD-T).
* [ ] PO/BA validó (queda para el Approval Gate).

---

## 🏁 Definition of Done

* [ ] Fixture de `BookingIntent` cumple distribución Doc 11 §21 (AC-01..02).
* [ ] Fixture de `Review` cumple distribución Doc 11 §22 (AC-03..04).
* [ ] `BudgetItem.committed` coherente con cada `confirmed_intent` (AC-05).
* [ ] Idempotencia verificada (AC-06).
* [ ] `AdminAction` registrado para cada reseña `hidden`/`removed`.
* [ ] Cancelación desde `confirmed_intent` con `cancelled_at > confirmed_at` y razón documentada.
* [ ] Tests de integración verdes en CI.
* [ ] Documentado en el runbook de demo qué bookings/reseñas están disponibles.
* [ ] PO valida.

---

## 📝 Notes

* Boundary explícito:
  * **US-085** entrega el runner CLI y el use case `SeedDemoDataUseCase`. Provee `User`, `VendorProfile`, `Quote`, `QuoteRequest`, `Budget`/`BudgetItem`, `AIRecommendation`, `AdminAction`.
  * **US-086** entrega el endpoint HTTP `POST /api/v1/admin/seed/reset` y `ResetDemoUseCase`.
  * **US-087** entrega el fixture de `Event` (incluye eventos `completed` necesarios para las reseñas).
  * **US-088** (esta historia) entrega el fixture de `BookingIntent` + `Review` y la coherencia con `BudgetItem.committed`/`AdminAction`.
* La matriz exacta vive en Doc 11 §21 / §22 y BR-BOOKING / BR-REVIEW; esta historia consume y respeta esa matriz.
* La cancelación desde `confirmed_intent` (Doc 8.1 §2 #5, BR-BOOKING-009) requiere `cancelled_at > confirmed_at` y razón documentada para preservar trazabilidad.
* Los fixtures de reseñas `hidden`/`removed` habilitan QA del flujo de moderación admin sin ejecutar el use case manualmente.
