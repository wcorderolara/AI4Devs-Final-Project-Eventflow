# Technical Specification — US-088: Seed fixture incluye `BookingIntent.confirmed_intent` y reseñas verificadas

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-088 |
| Source User Story | `management/user-stories/US-088-seed-confirmed-booking-intent.md` |
| Decision Resolution Artifact | `management/user-stories/decision-resolutions/US-088-decision-resolution.md` (no existe; no requerido) |
| Priority | P0 |
| Backlog ID | PB-P0-014 |
| Backlog Title | Seed Script Idempotente + Datos Demo |
| Backlog Execution Order | P0 #14 (foundation MVP) |
| User Story Position in Backlog Item | 4 de 4 (US-085 → US-086 → US-087 → **US-088**) |
| Related User Stories in Backlog Item | US-085, US-086, US-087, US-088 |
| Epic | EPIC-SEED-001 — Seed Data & Demo Scenarios |
| Backlog Item Dependencies | PB-P0-001, PB-P0-002 |
| Feature | BookingIntent confirmado + reseñas verificadas en seed (content fixture) |
| Module / Domain | `seed-demo` (Backend, content fixture transversal) |
| User Story Status | Approved (2026-06-22) |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-06-22 |
| Last Updated | 2026-06-22 |

---

## 2. Backlog Execution Context

### Product Backlog Item

PB-P0-014. Compuesto por US-085 (runner CLI), US-086 (endpoint HTTP reset), US-087 (fixture de eventos) y **US-088** (fixture de BookingIntent + reseñas). Dependencias: PB-P0-001, PB-P0-002.

### Execution Order Rationale

US-088 es la última historia del backlog item porque depende de:
* US-085 — runner + use case + fixtures previos (`User`, `VendorProfile`, `Quote`, `QuoteRequest`, `Budget`/`BudgetItem`, `AdminAction`).
* US-086 — endpoint reset que reusa la misma siembra.
* US-087 — eventos `completed` que sirven de ancla para los `confirmed_intent` y las reseñas históricas.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item | Suggested Order |
|---|---|---|
| US-085 | Runner CLI `npm run seed` (`SeedDemoDataUseCase`) | 1 |
| US-086 | Endpoint HTTP admin reset (`ResetDemoUseCase`) | 2 |
| US-087 | Fixture de eventos cubriendo estados | 3 |
| **US-088** | Fixture de BookingIntent + reseñas verificadas | 4 |

---

## 3. Executive Technical Summary

Implementar dos fixtures consumidos por `SeedDemoDataUseCase` (US-085):

* `booking-intents.fixture.ts` con la matriz de Doc 11 §21 (total 5–8, ≥3 `confirmed_intent`, 1–2 `pending`, 1 cancelado desde `pending`, 1 cancelado desde `confirmed_intent`).
* `reviews.fixture.ts` con la matriz de Doc 11 §22 (total 20–40, ~70 % `published`, ~20 % `hidden`, ~10 % `removed`).

Los fixtures se insertan vía `prisma.bookingIntent.upsert` y `prisma.review.upsert` con UUIDs deterministas (namespace `seed:booking:*` y `seed:review:*`). Las invariantes obligatorias se aplican en construcción del registro:

* `BookingIntent.is_simulated=true`, `is_seed=true` (BR-BOOKING-004, BR-SEED-005).
* `BookingIntent.quote_id` referencia un `Quote` con `status='accepted'` y no expirado (BR-BOOKING-001).
* Único `confirmed_intent` por `(event_id, service_category_id)` (BR-BOOKING-007).
* Cancelación desde `confirmed_intent` con `cancelled_at > confirmed_at`, `cancelled_by` y `cancellation_reason` (BR-BOOKING-009, Doc 8.1 §2 #5).
* `Review.booking_intent_id` referencia un `confirmed_intent` (BR-REVIEW-001, BR-SEED-007).
* `Review.rating ∈ {1..5}` (BR-REVIEW-003).
* `Review.moderated_*` + fila en `AdminAction` con `action ∈ {HIDE_REVIEW, REMOVE_REVIEW}` para `hidden`/`removed` (BR-REVIEW-005, NFR-DATA-007, NFR-OBS-001).
* `BudgetItem.committed` actualizado idempotentemente con `Quote.total_amount` por cada `confirmed_intent` (BR-BUDGET-005/006).

US-088 no entrega runner, endpoint, UI ni job. La auditoría operativa (`AdminAction`) se persiste como parte del fixture, no como acción admin en runtime.

---

## 4. Scope Boundary

### In Scope

* `booking-intents.fixture.ts` siguiendo Doc 11 §21.
* `reviews.fixture.ts` siguiendo Doc 11 §22.
* Helpers: cálculo de fechas relativas (`confirmed_at`, `cancelled_at`), generador de UUIDs deterministas, helper `computeCommitted(quote)`.
* Upserts idempotentes por UUID determinista (Booking, Review) y por `(event_id, service_category_id)` (BudgetItem).
* Persistencia de `AdminAction` por cada reseña `hidden`/`removed`.
* Tests de integración cubriendo AC y EC.

### Out of Scope

* Runner CLI → US-085.
* Endpoint HTTP reset → US-086.
* Fixture `Event`/`EventType` → US-087.
* Fixture `User`, `VendorProfile`, `Quote`, `QuoteRequest`, `Budget`/`BudgetItem`, `AdminAction` base → US-085 (esta historia inserta filas adicionales en `AdminAction` y actualiza `BudgetItem.committed`).
* Implementación de `ConfirmBookingIntentUseCase`, `CancelBookingIntentUseCase`, `CreateReviewUseCase`, `HideReviewUseCase` (módulo `event-planning` / `reviews-moderation`).
* UI admin / panel demo.
* Notificaciones reales (las `Notification` derivadas las siembra US-085 si aplica).
* Pagos reales / contratos firmados.

### Explicit Non-Goals

* No agrega columnas al schema (dependencia con US-100).
* No introduce migraciones Prisma.
* No genera datos `is_seed=false`.
* No invoca use cases del módulo `event-planning` en runtime.

---

## 5. Architecture Alignment

### Backend Architecture

* Stack: Node.js, Express.js, TypeScript, Prisma, PostgreSQL.
* Modular Monolith, módulo `seed-demo` (Doc 14 §10.16).
* Fixtures invocados desde `SeedDemoDataUseCase` (US-085); no introduce nuevos use cases ni controllers.

### Frontend Architecture

No aplica.

### Database Architecture

* Modelos `BookingIntent`, `Review`, `BudgetItem` (write); `Quote`, `QuoteRequest`, `Event`, `VendorProfile`, `User` (read FK); `AdminAction` (write).
* Columnas requeridas: ver §10.
* Índices recomendados: `is_seed` (US-101), `(event_id, service_category_id)` ya existente para BR-BOOKING-007.

### API Architecture

No aplica.

### AI / PromptOps Architecture

No aplica.

### Security Architecture

* Sin endpoints nuevos.
* Sin PII real (BR-SEED-010, BR-PRIVACY-010, NFR-PRIV-004).

### Testing Architecture

* Vitest + Supertest para integration sobre DB efímera.
* Pruebas de invariantes (distribución, banderas, FKs, fechas, moderación, presupuesto, idempotencia).
* MSW no aplica.

---

## 6. Functional Interpretation

| Acceptance Criterion | Technical Interpretation | Impacted Layer(s) |
|---|---|---|
| AC-01 — Distribución `BookingIntent` | Fixture define explícitamente N registros por estado y por origen de cancelación; upsert por UUID determinista. | Backend (fixture), DB |
| AC-02 — Invariantes `BookingIntent` | Construcción del registro fuerza `is_simulated=true`, `is_seed=true`, FK validada, unicidad `(event, category)`. | Backend (fixture) |
| AC-03 — Distribución `Review` + asociación a `confirmed_intent` + rating 1–5 | Fixture distribuye 20–40 reseñas con proporciones y cada registro referencia un `confirmed_intent` real. | Backend (fixture) |
| AC-04 — Trazabilidad moderación | Fixture rellena `moderated_*` y inserta `AdminAction` correspondiente. | Backend (fixture), Audit |
| AC-05 — Coherencia presupuestal | Helper `computeCommitted(quote)` actualiza `BudgetItem.committed` por cada `confirmed_intent`. | Backend (fixture), DB |
| AC-06 — Idempotencia | UUID determinista + upsert + actualización idempotente de `BudgetItem.committed`. | Backend (fixture), QA |
| EC-01 — Migraciones faltantes | Runner falla rápido si columnas requeridas no existen. | Backend (runner) |
| EC-02 — Quote inválido | Validación previa rechaza FK no válida. | Backend (fixture) |
| EC-03 — Fechas coherentes en cancelación | Helper computa `cancelled_at = confirmed_at + Δ` con Δ > 0. | Backend (fixture) |
| EC-04 — Reseña sin `confirmed_intent` | Validación previa rechaza FK no válida. | Backend (fixture) |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

* Módulo principal: `seed-demo` (Doc 14 §10.16).
* Puntos de extensión:
  * `apps/api/src/modules/seed-demo/fixtures/booking-intents.fixture.ts`.
  * `apps/api/src/modules/seed-demo/fixtures/reviews.fixture.ts`.
  * Helpers compartidos: `apps/api/src/modules/seed-demo/fixtures/_helpers/relativeDate.ts`, `_helpers/seedUuid.ts`, `_helpers/computeCommitted.ts`.

### Use Cases / Application Services

* `SeedDemoDataUseCase` (US-085) — consume los fixtures.

### Controllers / Routes

No aplica.

### DTOs / Schemas

```ts
type BookingIntentSeedRecord = {
  id: string;                // UUID determinista
  quoteId: string;
  eventId: string;
  vendorProfileId: string;
  serviceCategoryId: string;
  status: 'pending' | 'confirmed_intent' | 'cancelled';
  isSimulated: true;
  isSeed: true;
  confirmedAt?: Date | (() => Date);
  cancelledAt?: Date | (() => Date);
  cancelledBy?: 'organizer' | 'vendor' | 'system';
  cancellationReason?: string;
  origin?: 'pending' | 'confirmed_intent'; // para semantics de cancelación
};

type ReviewSeedRecord = {
  id: string;                // UUID determinista
  bookingIntentId: string;   // debe ser confirmed_intent
  authorUserId: string;      // organizador
  vendorProfileId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment: string;
  status: 'published' | 'hidden' | 'removed';
  moderatedByUserId?: string;
  moderatedAt?: Date | (() => Date);
  moderationReason?: string;
  isSeed: true;
};
```

### Repository / Persistence

* `prisma.bookingIntent.upsert({ where: { id }, create, update })`.
* `prisma.review.upsert({ where: { id }, create, update })`.
* `prisma.budgetItem.update({ where: { id }, data: { committed } })` para cada `confirmed_intent` (idempotente por valor).
* `AdminActionRepository.save({ admin_id, action, target_type: 'review', target_id, reason, correlation_id, created_at })` por cada reseña `hidden`/`removed`.

### Validation Rules

| Validación | Resultado |
|---|---|
| `is_simulated=true` y `is_seed=true` en cada `BookingIntent` | Falla del runner (VR-01) |
| `status` ∈ enum BR-BOOKING-003 | Falla del runner (VR-02) |
| FK `quoteId` → `Quote.status='accepted'`, `valid_until > now()` | Falla del runner (EC-02 / VR-03) |
| Unicidad `(event_id, service_category_id)` para `confirmed_intent` | Falla del runner (VR-04) |
| `cancelled_at > confirmed_at` cuando aplica | Falla del runner (EC-03 / VR-05) |
| Review FK a `confirmed_intent` | Falla del runner (EC-04 / VR-06) |
| Review rating ∈ {1..5} | Falla del runner (VR-07) |
| Review status ∈ {`published`,`hidden`,`removed`} | Falla del runner (VR-08) |
| Review `moderated_*` + `AdminAction` cuando aplica | Falla del runner (VR-09) |
| `BudgetItem.committed` coherente | Falla QA (VR-10) |

### Error Handling

* Errores de schema → `migration_required` (EC-01) reusando el manejo de US-085.
* Errores de FK → mensaje explícito de validación del fixture, no se inserta nada del lote.

### Transactions

* La transacción la maneja `SeedDemoDataUseCase` por lote (US-085).
* Esta historia se asegura de upserts atómicos y validaciones previas.

### Observability

* Conteos por estado de `BookingIntent` y por status de `Review` en `SeedReport` / `ResetReport`.
* Logs estructurados `seed.bookings.completed`, `seed.reviews.completed`.

---

## 8. Frontend Technical Design

No aplica.

---

## 9. API Contract Design

No aplica.

---

## 10. Database / Prisma Design

### Models Impacted

* `BookingIntent` (writes filtrados por `is_seed=true`).
* `Review` (writes filtrados por `is_seed=true`).
* `BudgetItem` (updates de `committed`).
* `AdminAction` (writes para moderación seed).
* Dependencias relacionales de lectura: `User`, `VendorProfile`, `Quote`, `QuoteRequest`, `Event`.

### Fields / Columns

* `BookingIntent`: `id`, `quote_id`, `event_id`, `vendor_profile_id`, `service_category_id`, `status`, `is_simulated`, `cancelled_by`, `cancellation_reason`, `confirmed_at`, `cancelled_at`, `is_seed`.
* `Review`: `id`, `booking_intent_id`, `author_user_id`, `vendor_profile_id`, `rating`, `comment`, `status`, `moderated_by`, `moderated_at`, `moderation_reason`, `is_seed`.
* `BudgetItem`: `id`, `committed`.
* `AdminAction`: `admin_id`, `action`, `target_type`, `target_id`, `reason`, `correlation_id`, `created_at`.

### Relations

Sin cambios. El fixture respeta el grafo FK.

### Indexes

* `is_seed` (US-101) para acelerar deletes/queries del reset.
* `(event_id, service_category_id)` para enforcement de BR-BOOKING-007.
* `(target_type, target_id)` en `AdminAction` (existente).

### Constraints

* `BookingIntent.status` ∈ {`pending`,`confirmed_intent`,`cancelled`}.
* `Review.status` ∈ {`published`,`hidden`,`removed`}.
* `Review.rating` BETWEEN 1 AND 5.

### Migrations Impact

Ninguna nueva. Dependencia con US-100 para columnas requeridas.

### Seed Impact

Esta historia ES el fixture de bookings y reseñas seed.

---

## 11. AI / PromptOps Design

No aplica.

---

## 12. Security & Authorization Design

* Sin endpoints nuevos.
* Sin PII real (BR-SEED-010, BR-PRIVACY-010, NFR-PRIV-004).
* Sin captura de pagos ni contratos (BR-BOOKING-004/005).
* `AdminAction` por moderación seed garantiza auditoría (NFR-OBS-001).

---

## 13. Testing Strategy

### Unit Tests (Vitest)

* Validación de helpers (`relativeDate`, `seedUuid`, `computeCommitted`).
* Validación de la forma de los fixtures (todos los registros pasan VRs).

### Integration Tests (Vitest + Supertest / DB efímera)

* TS-01..07 según US-088.

### API Tests

No aplica.

### E2E Tests

No aplica directamente; harness QA E2E (PB-P2-016) consume.

### Security Tests

No aplica.

### Accessibility Tests

No aplica.

### AI Tests

No aplica.

### Seed / Demo Tests

* SD-T-01..04 según US-088.

### CI Checks

* `npm test` (Vitest unit + integration).

---

## 14. Observability & Audit

* Conteos en `SeedReport` (US-085) / `ResetReport` (US-086).
* `AdminAction` insertada por cada reseña `hidden`/`removed`.

---

## 15. Seed / Demo Data Impact

### Seed Data Required

El fixture de bookings + reseñas definido aquí, anclado a eventos seed (US-087) y Quotes seed (US-085).

### Demo Scenario Supported

* Demo guiada muestra cierre de ciclo y reseña verificada.
* Demo muestra cancelación desde `confirmed_intent` (BR-BOOKING-009).
* Demo muestra panel admin moderación (BR-REVIEW-005).
* `BudgetItem.committed` coherente con `confirmed_intent` para mostrar BR-BUDGET-005/006.

### Reset / Isolation Notes

* Reset surgical (US-086) reaplica el fixture sin duplicados.

---

## 16. Documentation Alignment Required

No documentation alignment issues detected.

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Drift de fixture vs Doc 11 §21/§22 | Demo pierde cobertura | Tests QA validan la matriz |
| Cálculo de `committed` incorrecto | Demo presupuestal inconsistente | Helper centralizado + test |
| `cancelled_at <= confirmed_at` | Inconsistencia temporal | Helper relativo con Δ > 0 + test |
| FK a Quote expirado o no aceptado | Runner falla | Validación previa en el fixture |
| Cambio de schema sin migrar | Runner falla | Dependencia explícita con US-100 |
| Conteos accidentalmente fuera de rango | QA falla | Tests verifican rango total y proporciones |

---

## 18. Implementation Guidance for Coding Agents

### Files / folders likely impacted

* `apps/api/src/modules/seed-demo/fixtures/booking-intents.fixture.ts` (nuevo).
* `apps/api/src/modules/seed-demo/fixtures/reviews.fixture.ts` (nuevo).
* `apps/api/src/modules/seed-demo/fixtures/_helpers/relativeDate.ts` (compartido con US-087, reusar).
* `apps/api/src/modules/seed-demo/fixtures/_helpers/seedUuid.ts` (compartido con US-087, reusar).
* `apps/api/src/modules/seed-demo/fixtures/_helpers/computeCommitted.ts` (nuevo).
* `apps/api/src/modules/seed-demo/application/use-cases/seed-demo-data.use-case.ts` (extender invocación a los nuevos fixtures — coordinar con responsable de US-085).
* `apps/api/src/modules/admin-governance/infrastructure/persistence/admin-action.repository.ts` (reusar).
* Tests: `__tests__/booking-intents.fixture.test.ts`, `__tests__/reviews.fixture.test.ts`, `__tests__/seed-booking-review.integration.test.ts`.

### Recommended order of implementation

1. Definir `BookingIntentSeedRecord` y `ReviewSeedRecord`.
2. Implementar helpers (`computeCommitted`).
3. Crear `booking-intents.fixture.ts` con la matriz de Doc 11 §21.
4. Crear `reviews.fixture.ts` con la matriz de Doc 11 §22.
5. Integrar en `SeedDemoDataUseCase`.
6. Insertar `AdminAction` por cada reseña `hidden`/`removed`.
7. Actualizar `BudgetItem.committed` idempotentemente.
8. Tests unitarios y de integración.

### Decisions that must not be reopened

* `is_simulated=true` siempre (BR-BOOKING-004).
* Único `confirmed_intent` por `(event, category)` (BR-BOOKING-007).
* `cancelled_at > confirmed_at` (BR-BOOKING-009).
* Reseñas solo asociadas a `confirmed_intent` (BR-REVIEW-001).
* Moderación con `AdminAction` (BR-REVIEW-005).
* `BudgetItem.committed` actualizado por confirmación (BR-BUDGET-005/006).

### What must not be implemented

* Use cases del módulo `event-planning`/`reviews-moderation` en runtime.
* UI admin.
* Pagos / contratos.
* Notificaciones reales.

### Assumptions to preserve

* `SeedDemoDataUseCase` operativo (US-085).
* Schema con columnas requeridas disponible (US-099/100).
* Eventos `completed` provistos (US-087).
* `Quote` con `status='accepted'` disponibles (US-085).
* `AdminActionRepository` operativo (Doc 14 §13).

---

## 19. Task Generation Notes

### Suggested task groups

* **BE**: tipos, helpers, fixture bookings, fixture reseñas, integración con US-085, AdminAction.
* **DB**: verificar columnas requeridas.
* **QA**: tests unit + integration por cada AC y EC.
* **OBS**: validación de `AdminAction` en moderación seed.
* **DOC**: runbook con cobertura de bookings + reseñas.

### Required QA tasks

* Tests por cada AC.
* Tests negativos para cada VR.
* Tests seed/demo para cancelación desde confirmado y moderación.

### Required security tasks

No aplica directamente; el fixture no agrega endpoints.

### Required seed/demo tasks

* La historia ES el fixture seed; tests cubren la cobertura.

### Required documentation tasks

* Runbook con la lista de bookings/reseñas disponibles, ejemplos de razones de cancelación y de moderación.

### Dependencies between tasks

* BE-01 (tipos/helpers) → BE-02 (bookings) → BE-03 (reseñas) → BE-04 (integración).
* QA tasks bloquean a documentación.

---

## 20. Technical Spec Readiness

| Check | Status |
|---|---|
| User Story approved or explicitly allowed for draft spec | Pass |
| Product Backlog mapping found | Pass |
| Decision Resolution reviewed if present | N/A |
| Scope clear | Pass |
| Architecture alignment clear | Pass |
| API impact clear | N/A |
| DB impact clear | Pass |
| AI impact clear | N/A |
| Security impact clear | N/A |
| Testing strategy clear | Pass |
| Ready for Development Task Breakdown | Yes |

---

## 21. Final Recommendation

**Ready for Task Breakdown.**

US-088 cuenta con dos fixtures técnicos definidos, trazables contra Doc 11 §21/§22 y BR-BOOKING/BR-REVIEW/BR-BUDGET/BR-SEED. El alcance está acotado al contenido seed. Siguiente paso: ejecutar `eventflow-user-story-to-development-tasks`.
