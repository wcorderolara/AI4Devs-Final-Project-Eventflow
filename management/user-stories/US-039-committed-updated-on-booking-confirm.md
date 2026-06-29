# 🧾 User Story: Sincronizar `BudgetItem.committed` al confirmar/cancelar BookingIntent

## 🆔 Metadata

| Field              | Value                                              |
| ------------------ | -------------------------------------------------- |
| ID                 | US-039                                             |
| Epic               | EPIC-BUD-001 — Budget Management & Currency        |
| Backlog Item       | PB-P1-023                                          |
| Feature            | Update automático de `committed` por BookingIntent  |
| Module / Domain    | Budget × Booking                                   |
| User Role          | Organizer (consumidor) / System (handler)          |
| Priority           | Must Have                                          |
| Status             | Approved with Minor Notes                          |
| Owner              | Product Owner / Business Analyst                   |
| Approved By        | PO/BA Review                                       |
| Approval Date      | 2026-06-27                                         |
| Ready for Development Tasks | Yes                                       |
| Sprint / Milestone | MVP                                                |
| Created Date       | 2026-06-09                                         |
| Last Updated       | 2026-06-27                                         |

---

## 🎯 User Story

**As an** organizador
**I want** que `BudgetItem.committed` se actualice automáticamente al confirmarse o cancelarse un `BookingIntent`
**So that** mi presupuesto refleje los compromisos sin entradas manuales y siga siendo confiable para la vista (US-035), el CRUD (US-036) y el warning enriquecido (US-038)

---

## 🧠 Business Context

### Context Summary

US-039 implementa el **handler system-driven** `UpdateCommittedFromBookingIntent` que materializa `FR-BUDGET-006`/`FR-BOOKING-008`. El handler se invoca desde dos use cases del módulo Booking:
* `ConfirmBookingIntentUseCase` (`UC-BOOKING-002`) → `applyOnConfirm({ bookingIntentId })`.
* `CancelBookingIntentUseCase` (`UC-BOOKING-003`) → `revertOnCancel({ bookingIntentId, cancellation })`.

Ambas operaciones ocurren **dentro de la `prisma.$transaction`** del invocador (atomicidad transaccional con el cambio de estado del `BookingIntent`). La idempotencia se garantiza persistiendo `committed_synced_at` y `committed_synced_amount` en `BookingIntent` (D1), evitando double-counting ante reintentos.

### Related Domain Concepts

* `BookingIntent.status ∈ { pending, confirmed_intent, cancelled }` (`FR-BOOKING-002`).
* `BR-BOOKING-007`: máximo 1 confirmado por `(eventId, categoryId)`.
* `BR-BOOKING-008`: sincronización automática.
* `BR-BOOKING-009`: cancelación permitida en cualquier estado, incluso `confirmed_intent`.
* `BR-BUDGET-005`: `committed` se actualiza solo vía sync de BookingIntent (no editable por US-036, D1 de US-036).

### Assumptions

* Una sola categoría por BookingIntent (`BR-BOOKING-007`).
* `BookingIntent.total` está en la moneda del evento (`BR-BUDGET-007` sin FX); el handler verifica defensa profunda.
* El invocador upstream (`ConfirmBookingIntentUseCase`) ya verifica `event.status ∈ {'draft','active'}` antes de invocar `applyOnConfirm` (D4). `revertOnCancel` se ejecuta en cualquier estado del evento (`BR-BOOKING-009`).
* El ciclo de vida del `BookingIntent` es `pending → confirmed_intent | cancelled` sin retorno (`FR-BOOKING-002`); reaperturas se modelan como un nuevo `BookingIntent.id`.

### Dependencies

* US-035 — consumidor del cache invalidado.
* US-036 — D2 mantiene la coherencia: con `committed > 0` el item no puede soft-deletarse.
* US-038 — warning derivado: el cambio de `committed` puede activar/desactivar `over_committed`.
* PB-P1-023 — backlog item padre.
* PB-P1-020 — provee `BudgetItem` y `Budget`.

### PO/BA Decisions Applied

| ID | Decisión                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Resolución |
| -- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| D1 | Idempotencia                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Persistir `committed_synced_at: datetime?` y `committed_synced_amount: decimal?` en `BookingIntent`. `applyOnConfirm`: skip si `committed_synced_at IS NOT NULL`. `revertOnCancel`: skip si `committed_synced_at IS NULL`; restaurar a `NULL` tras decrement. Migración menor en US-039 si los campos no existen ya. |
| D2 | Auto-create BudgetItem                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Si no existe `BudgetItem` activo para `(budget.id, service_category_id)`: crear nuevo con `planned=0`, `committed=0` (luego se incrementa), `paid=0`, `ai_generated=false`, `ai_recommendation_id=NULL`, `deleted_at=NULL`. No reusar soft-deleted. Log warning `budget.item.auto_created_by_booking`.                                          |
| D3 | `BookingIntent.total = 0`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Skip silencioso + log info `budget.committed.skipped_zero_amount`. Validación upstream recomendada en `ConfirmBookingIntentUseCase`.                                                                                                                                                                                                          |
| D4 | `event.status` verification                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | US-039 NO verifica `event.status`. `applyOnConfirm` precondición: upstream verificó `event.status ∈ {'draft','active'}`. `revertOnCancel`: permitido en cualquier `event.status` (`BR-BOOKING-009`).                                                                                                                                              |

Referencia completa: `management/user-stories/decision-resolutions/US-039-decision-resolution.md`.

---

## 🔗 Traceability

| Source                 | Reference                                                                                                                                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| FRD Requirement(s)     | FR-BUDGET-006 (sync committed) · FR-BOOKING-008 (sync bidireccional) · FR-BOOKING-005 (auditoría cancelación) · FR-BOOKING-009 (max 1 confirmado por categoría)                                          |
| Use Case(s)            | UC-BOOKING-002 (Confirmar BookingIntent) · UC-BOOKING-003 (Cancelar BookingIntent)                                                                                                                      |
| Business Rule(s)       | BR-BUDGET-005 (sync por BookingIntent) · BR-BOOKING-007 (1 confirmado por categoría) · BR-BOOKING-008 (actualización presupuesto) · BR-BOOKING-009 (cancelación sin penalización)                          |
| Permission Rule(s)     | System (handler interno; ownership y autorización son responsabilidad del upstream)                                                                                                                    |
| Data Entity / Entities | `BookingIntent`, `BudgetItem`, `Budget`, `Event`                                                                                                                                                       |
| API Endpoint(s)        | N/A (handler interno; sin endpoint público)                                                                                                                                                            |
| NFR Reference(s)       | NFR-PERF-001 (sobre el endpoint upstream que invoca el handler)                                                                                                                                        |
| Related ADR(s)         | —                                                                                                                                                                                                      |
| Related Document(s)    | `/docs/4 §BR-BUDGET-005 §BR-BOOKING-007/008/009` · `/docs/6 §BookingIntent §BudgetItem` · `/docs/8 §UC-BOOKING-002/003` · `/docs/9 §FR-BUDGET-006 §FR-BOOKING-005/008/009` · `/docs/10 §NFR-PERF-001` · US-035 · US-036 · US-038 |

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: In Scope
* MVP Relevance: Must Have

### Explicitly Out of Scope

* Penalización financiera en cancelación (`BR-BOOKING-004/009`).
* Conversión FX o multi-moneda (`BR-BUDGET-007`).
* Multi-categoría por BookingIntent (`BR-BOOKING-007`).
* Endpoint público (handler system-driven).
* Verificación de `event.status` dentro del handler (D4; responsabilidad upstream).
* Resucitar items soft-deleted (D2).

### Scope Notes

* Atómico dentro de la transacción del invocador (`prisma.$transaction`).
* Idempotente per `bookingIntentId`.
* Cache TanStack `['event', eventId, 'budget']` se invalida en frontend tras receive del estado actualizado (responsabilidad del flujo del módulo Booking; US-035/US-038 re-fetchean).

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Confirmación incrementa `committed` atómicamente

**Given** un `BookingIntent { id, status='pending', total=N>0, service_category_id=C, event_id=E }` y `event.budget.id=B`, con `committed_synced_at IS NULL`
**When** el invocador upstream confirma el intent y dentro de su `prisma.$transaction` invoca `applyOnConfirm({ bookingIntentId })`
**Then** el handler:
1. Lee el `BookingIntent` con `SELECT FOR UPDATE`.
2. Verifica `committed_synced_at IS NULL` (idempotencia).
3. Verifica `bookingIntent.event.currency_code === event.currency_code` (defensa profunda; si difiere, lanza error tipado `CURRENCY_MISMATCH`).
4. Localiza o auto-crea el `BudgetItem` para `(budget_id=B, service_category_id=C)` (D2).
5. Actualiza `BudgetItem.committed += N` con `SELECT FOR UPDATE` sobre el item.
6. Set `bookingIntent.committed_synced_at = NOW()`, `committed_synced_amount = N`.
7. Emite log `budget.committed.synced` con `action='apply'`, `bookingIntentId`, `budgetItemId`, `event_id`, `service_category_id`, `amount=N`, `correlationId`.

### AC-02: Cancelación revierte `committed` atómicamente con auditoría

**Given** un `BookingIntent { id, status='confirmed_intent', committed_synced_at=T1, committed_synced_amount=N }`
**When** el invocador upstream cancela y dentro de su transacción invoca `revertOnCancel({ bookingIntentId, cancellation: { at, by, reason } })`
**Then** el handler:
1. Lee con `SELECT FOR UPDATE`.
2. Verifica `committed_synced_at IS NOT NULL` (si NULL, skip silencioso + log info).
3. Localiza el `BudgetItem` correspondiente.
4. Actualiza `BudgetItem.committed -= committed_synced_amount`.
5. Set `bookingIntent.committed_synced_at = NULL`, `committed_synced_amount = NULL`.
6. Persiste auditoría `cancelled_at = at`, `cancelled_by = by`, `cancellation_reason = reason` (FR-BOOKING-005). (Nota: el upstream también podría persistir estos campos; US-039 los acepta como input).
7. Emite log `budget.committed.synced` con `action='revert'`, `bookingIntentId`, `budgetItemId`, `amount=N`, `correlationId`.

### AC-03: Idempotencia per `bookingIntentId`

**Given** un `BookingIntent` ya sincronizado (`committed_synced_at IS NOT NULL`)
**When** se invoca `applyOnConfirm({ bookingIntentId })` por segunda vez (reintento, error de red, cron)
**Then** el handler hace skip silencioso, NO modifica `committed` y emite log info `budget.committed.skipped_already_synced`. La transacción del invocador continúa sin error.

### AC-04: Auto-create `BudgetItem` cuando no existe (D2)

**Given** un `Budget` que no tiene `BudgetItem` activo para la categoría del intent
**When** se invoca `applyOnConfirm`
**Then** el handler crea un nuevo `BudgetItem` con `planned=0`, `committed=0` (luego incrementa a `N`), `paid=0`, `ai_generated=false`. Emite log warning `budget.item.auto_created_by_booking`. NO reusa items soft-deleted.

### AC-05: Currency mismatch — defensa profunda

**Given** un `BookingIntent` cuyo `currency_code` difiere de `event.currency_code` (caso anómalo)
**When** se invoca `applyOnConfirm`
**Then** el handler lanza error tipado `CURRENCY_MISMATCH` con detalles; la transacción del invocador hace rollback total; ningún cambio se persiste.

### AC-06: `BookingIntent.total = 0` — skip silencioso (D3)

**Given** un `BookingIntent.total = 0`
**When** se invoca `applyOnConfirm`
**Then** el handler hace skip silencioso (sin update) + log info `budget.committed.skipped_zero_amount`. La transacción del invocador continúa sin error.

### AC-07: Cache TanStack invalidación

**Given** una confirm/cancel exitosa
**When** el frontend recibe la respuesta del endpoint upstream
**Then** el hook correspondiente invalida `['event', eventId, 'budget']` (responsabilidad del módulo Booking). US-035 y US-038 refetchean automáticamente y reflejan el nuevo `committed`, `over_committed` y deltas.

### AC-08: Performance heredada

**Given** una confirm/cancel con dataset razonable
**When** se mide el endpoint upstream que invoca este handler
**Then** P95 < 1.5 s (`NFR-PERF-001`).

---

## ⚠️ Edge Cases

### EC-01: No existe `BudgetItem` para la categoría (D2)
Auto-create + log warning.

### EC-02: Race condition / concurrencia
`SELECT FOR UPDATE` sobre `BookingIntent` Y `BudgetItem` dentro de la transacción del invocador. PostgreSQL serializa el incremento; no hay double-count.

### EC-03: Retry post-fallo
Idempotente vía `committed_synced_at` (AC-03).

### EC-04: Currency mismatch (anómalo)
Error tipado + rollback total (AC-05).

### EC-05: `BookingIntent.total = 0`
Skip silencioso + log info (AC-06).

### EC-06: Doble `applyOnConfirm` sobre el mismo `bookingIntentId`
Idempotente (AC-03): el segundo apply no hace nada.

### EC-07: Doble `revertOnCancel` sobre el mismo `bookingIntentId`
Idempotente: si `committed_synced_at IS NULL` ⇒ skip + log info `budget.committed.skipped_nothing_to_revert`.

### EC-08: Confirm + cancel + nuevo confirm (mismo categoría, distinto intent)
Cada `BookingIntent.id` es independiente. El segundo intent (nuevo `id`) puede aplicar/revertir sin colisión con el primero. `FR-BOOKING-009` garantiza max 1 `confirmed_intent` activo por `(eventId, categoryId)` (responsabilidad del upstream).

---

## 🚫 Validation Rules

| ID    | Rule                                                                                            | Message / Behavior                                                                  |
| ----- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| VR-01 | `bookingIntent.total > 0`                                                                       | Si `= 0` ⇒ skip silencioso + log info (D3)                                          |
| VR-02 | `BudgetItem` existe o se auto-crea (D2)                                                          | Auto-create con flags definidos en D2                                                |
| VR-03 | Idempotencia per `bookingIntentId` (D1)                                                          | `committed_synced_at` controla apply/revert                                          |
| VR-04 | `bookingIntent.currency_code === event.currency_code`                                            | Si difiere ⇒ error `CURRENCY_MISMATCH` + rollback                                    |
| VR-05 | Estado válido para sync                                                                          | `applyOnConfirm` solo si `bookingIntent.status` transiciona a `confirmed_intent`; `revertOnCancel` solo si transiciona a `cancelled` |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                                                                                  |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| SEC-01 | Handler interno; no expone endpoint público. Ownership y rol verificados por el invocador upstream.                                    |
| SEC-02 | Atomicidad transaccional: el handler participa en la `prisma.$transaction` del invocador.                                              |
| SEC-03 | Logging sin PII: `bookingIntentId`, `budgetItemId`, `event_id`, `service_category_id`, `amount`, `action`, `correlationId`.            |
| SEC-04 | `event.status` verification es responsabilidad del invocador (D4).                                                                    |
| SEC-05 | Defensa profunda currency: si mismatch, falla atómica.                                                                                |

### Negative Authorization Scenarios

* No aplica directamente (handler interno). Las negativas viven en los endpoints upstream que lo invocan.

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

| Area                | Notes                                                                                                              |
| ------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Screen / Route      | Vista budget de US-035 (consumidor). No hay UI propia de US-039.                                                    |
| Main UI Pattern     | Refresh automático tras evento de confirm/cancel (responsabilidad del módulo Booking).                              |
| Primary Action      | No aplica.                                                                                                          |
| Secondary Actions   | No aplica.                                                                                                          |
| Empty State         | No aplica.                                                                                                          |
| Loading State       | Skeleton parcial heredado de US-035.                                                                               |
| Error State         | Banner reusable de US-035 si la confirm/cancel falla.                                                              |
| Success State       | `committed` actualizado; delta y badge de US-038 reflejan el cambio.                                                |
| Accessibility Notes | `aria-live="polite"` para anunciar la actualización (responsabilidad del flujo upstream que renderiza el cambio).   |
| Responsive Notes    | Mobile-first heredado.                                                                                              |
| i18n Notes          | Locales: `es-LATAM` (default), `es-ES`, `pt`, `en`. Strings de errores/logs en logs estructurados (sin localizar).   |
| Currency Notes      | Moneda del evento; sin conversión FX.                                                                              |

---

## 🛠 Technical Notes

### Frontend

* Route / Page:
  * Vista budget de US-035.
* Components:
  * Sin componentes nuevos. El módulo Booking gestiona el flow de confirm/cancel.
* State Management:
  * TanStack: el hook del flow Booking (US futura) invoca `queryClient.invalidateQueries({ queryKey: ['event', eventId, 'budget'] })` en `onSuccess`.
* Forms:
  * No aplica.
* API Client:
  * Reuso (módulo Booking).

### Backend

* Use Case / Service:
  * `UpdateCommittedFromBookingIntent` en `modules/budget` (o `modules/budget-sync`) con métodos `applyOnConfirm` y `revertOnCancel`.
  * Invocado desde `ConfirmBookingIntentUseCase` (US futura, `modules/booking`) y `CancelBookingIntentUseCase` (US futura, `modules/booking`).
* Controller / Route:
  * Sin endpoint público; handler interno.
* Authorization Policy:
  * System; ownership upstream.
* Validation:
  * VR-01..05 implementadas en el handler.
* Transaction Required:
  * Sí. El handler participa en la `prisma.$transaction` del invocador. NO abre transacción propia.

### Database

* Main Tables:
  * `booking_intents` — añadir columnas `committed_synced_at: timestamp NULL`, `committed_synced_amount: decimal NULL` (D1).
  * `budget_items` — sin cambios estructurales; soporta increment/decrement.
* Constraints:
  * Atomicidad por transacción del invocador.
* Index Considerations:
  * Reuso. Considerar índice parcial sobre `booking_intents (event_id, service_category_id, status) WHERE status = 'confirmed_intent'` para futuras consultas; postergable.
* Migrations Impact:
  * Migración menor: ADD COLUMN `committed_synced_at`, `committed_synced_amount` (ambas nullable, sin default no-NULL, sin backfill).
  * Si PB-P0-001 ya incluye los campos (verificar en DOC-task), sin migración nueva.

### API

| Method | Endpoint           | Purpose                                                                                                                |
| ------ | ------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| —      | N/A (system)        | Handler interno invocado desde `ConfirmBookingIntentUseCase` y `CancelBookingIntentUseCase` del módulo Booking.            |

### Observability / Audit

* Correlation ID Required: Yes (heredado del invocador).
* Log Event Required:
  * `budget.committed.synced` con `action ∈ {'apply','revert'}`, `bookingIntentId`, `budgetItemId`, `event_id`, `service_category_id`, `amount`, `correlationId`, `duration_ms`.
  * `budget.committed.skipped_already_synced` (info; AC-03).
  * `budget.committed.skipped_nothing_to_revert` (info; EC-07).
  * `budget.committed.skipped_zero_amount` (info; AC-06).
  * `budget.item.auto_created_by_booking` (warning; D2).
  * `budget.committed.currency_mismatch` (error; AC-05).
* AdminAction Required: No.
* AIRecommendation Required: No.

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                                                                                | Type        |
| ----- | ----------------------------------------------------------------------------------------------------------------------- | ----------- |
| TS-01 | `applyOnConfirm` con BudgetItem existente ⇒ committed incrementa y `committed_synced_at` set                              | Integration |
| TS-02 | `revertOnCancel` con `committed_synced_at` ⇒ committed decrementa y `committed_synced_at` reset                          | Integration |
| TS-03 | `applyOnConfirm` sin BudgetItem ⇒ auto-create con flags D2 + log warning                                                  | Integration |
| TS-04 | Idempotencia: doble `applyOnConfirm` no duplica increment                                                                  | Integration |
| TS-05 | Idempotencia: doble `revertOnCancel` no duplica decrement                                                                  | Integration |
| TS-06 | Currency mismatch ⇒ error tipado + rollback total                                                                          | Integration |
| TS-07 | `total = 0` ⇒ skip silencioso + log info                                                                                   | Integration |
| TS-08 | Confirm + cancel + nuevo confirm (mismo categoría, distinto intent) ⇒ ambos balances correctos                              | Integration |
| TS-09 | Auto-created BudgetItem NO se elimina en `revertOnCancel`                                                                  | Integration |

### Negative Tests

| ID    | Scenario                                                                                  | Expected Result          |
| ----- | ----------------------------------------------------------------------------------------- | ------------------------ |
| NT-01 | Race condition / confirmaciones concurrentes                                              | Sin double-count (SELECT FOR UPDATE) |
| NT-02 | Currency mismatch                                                                          | `CURRENCY_MISMATCH` + rollback |
| NT-03 | BookingIntent en estado inesperado (no transicionando)                                     | El handler rechaza (defensa profunda) |
| NT-04 | Soft-deleted BudgetItem no se resucita                                                     | Auto-create nuevo        |

### AI Tests

Not applicable for this story.

### Authorization Tests

| ID         | Scenario                              | Expected Result |
| ---------- | ------------------------------------- | --------------- |
| AUTH-TS-01 | Sistema dispara handler                | Success         |
| AUTH-TS-02 | Handler invocado sin pasar por upstream | Tests internos de los use cases upstream cubren ownership |

### Performance Tests

| ID      | Scenario                                                                          | Expected               |
| ------- | --------------------------------------------------------------------------------- | ---------------------- |
| PERF-01 | Endpoint upstream que invoca el handler                                            | P95 < 1.5 s (NFR-PERF-001) |

### Accessibility Tests

* `aria-live="polite"` en la vista que reflejará el cambio (heredado de US-035/US-038).

---

## 📊 Business Impact

| Field               | Value                                                                       |
| ------------------- | --------------------------------------------------------------------------- |
| KPI Affected        | Precisión financiera; integridad cross-module.                              |
| Expected Impact     | Datos en vivo confiables sin entradas manuales.                              |
| Success Criteria    | 100% atomicidad; idempotencia verificada con retry test; demo end-to-end de confirm/cancel reflejando committed actualizado. |
| Academic Demo Value | Demuestra integración hexagonal de bounded contexts (Budget × Booking) con port/adapter. |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks

* Sin tareas FE nuevas. La invalidación del cache se hace en el módulo Booking.

### Potential Backend Tasks

* `UpdateCommittedFromBookingIntent` use case con `applyOnConfirm` y `revertOnCancel`.
* `BudgetItemWriteRepository` extensión (`incrementCommittedBy` / `decrementCommittedBy` con SELECT FOR UPDATE).
* `BookingIntentSyncStatePort` (en `modules/budget`) y adapter en `modules/booking` para set/reset de `committed_synced_at/amount`.
* Auto-create BudgetItem (D2) con log warning.
* Logger estructurado.
* Migración menor `committed_synced_at`/`committed_synced_amount` si no existen.

### Potential Database Tasks

* Migración menor (D1).
* Verificación de índices.

### Potential AI / PromptOps Tasks

* No aplica.

### Potential QA Tasks

* Tests de concurrencia, idempotencia, currency mismatch, auto-create, reversa con auditoría.

### Potential DevOps / Config Tasks

* No aplica.

---

## ✅ Definition of Ready

* [x] Rol claro (handler system; consumidor organizador).
* [x] Goal/valor claros.
* [x] FRD/UC/BR enlazados.
* [x] Permisos identificados.
* [x] Entidades listadas.
* [x] AC en GWT.
* [x] Edge cases documentados.
* [x] Validación clara.
* [x] Out of Scope explícito.
* [x] Dependencias conocidas.
* [x] UX states identificados.
* [x] API definida (handler interno).
* [x] Tests definidos.
* [x] PO/BA validó.

---

## 🏁 Definition of Done

* [ ] Handler implementado con `applyOnConfirm` y `revertOnCancel` dentro de `prisma.$transaction` del invocador.
* [ ] Tests verdes: integration (incluida atomicidad/concurrencia/idempotencia), performance.
* [ ] Idempotencia verificada con retry test.
* [ ] Auto-create verificado + log warning emitido.
* [ ] Defensa profunda currency verificada.
* [ ] Migración menor aplicada (si los campos no existían).
* [ ] Logs estructurados emitidos sin PII.
* [ ] OpenAPI snapshot del endpoint upstream actualizado por US-098 cuando US futuras del módulo Booking entreguen los endpoints.
* [ ] PO valida demo end-to-end (confirm intent ⇒ committed sube; cancel ⇒ committed baja; warning de US-038 se activa/desactiva correctamente).

---

## 📝 Notes

* US-039 es un **handler system-driven**; sin endpoint público. La superficie pública vive en US futuras del módulo Booking (Confirm/Cancel BookingIntent).
* Documentation Alignment Required (no bloqueantes): `docs/6 §BookingIntent` con campos nuevos, `docs/16 §M07` con catálogo de logs, `docs/4 §BR-BOOKING-008` nota interpretativa D1/D2, housekeeping `NFR-PERF-001`.
* Handoff transversal: US-039 (sync committed) → US-038 (warning enriquecido se activa/desactiva), US-035 (vista refleja change tras invalidación), US-036 (D2 ya protege contra soft delete cuando `committed > 0`).
