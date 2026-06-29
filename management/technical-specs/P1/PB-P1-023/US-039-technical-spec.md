# Technical Specification — US-039: Sync atómico de `BudgetItem.committed` por BookingIntent

## 1. Metadata

| Field                                | Value                                                                                                          |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| User Story ID                        | US-039                                                                                                         |
| Source User Story                    | `management/user-stories/US-039-committed-updated-on-booking-confirm.md`                                       |
| Decision Resolution Artifact         | `management/user-stories/decision-resolutions/US-039-decision-resolution.md`                                   |
| Priority                             | P1                                                                                                             |
| Backlog ID                           | PB-P1-023                                                                                                      |
| Backlog Title                        | Sync atómico del committed por BookingIntent                                                                  |
| Backlog Execution Order              | 41 (P0: 18 + P1: 23 items)                                                                                     |
| User Story Position in Backlog Item  | 1 de 1                                                                                                          |
| Related User Stories in Backlog Item | US-039                                                                                                          |
| Epic                                 | EPIC-BUD-001 — Budget Management & Currency                                                                    |
| Backlog Item Dependencies            | PB-P1-020 (US-035 vista, US-036 D2/CRUD), PB-P1-022 (US-038 warning derivado), US futura de Booking confirm/cancel |
| Feature                              | Sync committed por BookingIntent                                                                                |
| Module / Domain                      | Budget × Booking                                                                                                |
| User Story Status                    | Approved with Minor Notes                                                                                     |
| Backlog Alignment Status             | Found                                                                                                          |
| Technical Spec Status                | Ready for Task Breakdown                                                                                       |
| Created Date                         | 2026-06-27                                                                                                     |
| Last Updated                         | 2026-06-27                                                                                                     |

---

## 2. Backlog Execution Context

`PB-P1-023` materializa `FR-BUDGET-006`/`FR-BOOKING-008`: handler system-driven que sincroniza `BudgetItem.committed` al confirmar/cancelar `BookingIntent`. Es prerequisito funcional para US-038 (warning de overcommit) y consumido por US-035 (vista). Sin endpoint público; opera dentro de la `prisma.$transaction` del invocador (`ConfirmBookingIntentUseCase` y `CancelBookingIntentUseCase` del módulo Booking, US futura).

Execution order: 41. Posterior a US-035/US-036/US-037/US-038 del módulo Budget; los use cases del módulo Booking (US futuras) consumirán este handler.

---

## 3. Executive Technical Summary

US-039 introduce el use case `UpdateCommittedFromBookingIntent` en `modules/budget` con dos métodos: `applyOnConfirm({ bookingIntentId })` y `revertOnCancel({ bookingIntentId, cancellation })`. Ambos métodos se invocan vía un `BudgetCommittedSyncPort` (definido en `modules/booking` y adapterizado por `modules/budget`) **dentro de la transacción del invocador**; el handler NO abre transacción propia. La idempotencia se garantiza con dos campos nuevos en `booking_intents`: `committed_synced_at` (timestamp nullable) y `committed_synced_amount` (decimal nullable); `applyOnConfirm` hace skip si `committed_synced_at IS NOT NULL`, y `revertOnCancel` hace skip si `IS NULL`. La concurrencia se controla con `SELECT FOR UPDATE` sobre el `BookingIntent` y sobre el `BudgetItem` afectado. Defensa profunda: si `bookingIntent.currency_code ≠ event.currency_code`, lanza error tipado `CURRENCY_MISMATCH` que provoca rollback. Auto-create transparente cuando no existe BudgetItem activo para la categoría (D2): nuevo item con `ai_generated=false`, `planned=0`, `committed=0` (luego incrementa), `paid=0`; sin reusar soft-deleted. Migración menor en US-039 añade los dos campos a `booking_intents` si PB-P0-001 no los entrega. Logger estructurado emite `budget.committed.synced` (con `action`), más eventos `skipped_*`, `auto_created_by_booking` y `currency_mismatch`. Frontend NO requiere cambios: el módulo Booking invalidará `['event', eventId, 'budget']` tras confirm/cancel exitoso; US-035 y US-038 reflejarán el cambio automáticamente.

---

## 4. Scope Boundary

### In Scope

* `UpdateCommittedFromBookingIntent` use case (`applyOnConfirm`, `revertOnCancel`).
* Port `BudgetCommittedSyncPort` (en `modules/booking`) + adapter en `modules/budget`.
* Extensión `BudgetItemWriteRepository` (US-036) con `incrementCommittedBy({ itemId, amount, tx })` y `decrementCommittedBy({ itemId, amount, tx })` usando `SELECT FOR UPDATE`.
* Extensión `BookingIntentRepository` con `findByIdForUpdate({ id, tx })`, `markCommittedSynced({ id, amount, tx })`, `clearCommittedSync({ id, tx })`.
* Auto-create `BudgetItem` (D2) dentro de la misma transacción.
* Verificación currency mismatch (defensa profunda).
* Logs estructurados (`budget.committed.synced`, `skipped_*`, `auto_created_by_booking`, `currency_mismatch`).
* Migración menor: `ADD COLUMN committed_synced_at`, `ADD COLUMN committed_synced_amount` en `booking_intents`.
* Tests unit/integration/concurrencia/idempotencia/perf.
* Documentación.

### Out of Scope

* Endpoint público (handler interno).
* Implementación de `ConfirmBookingIntentUseCase` y `CancelBookingIntentUseCase` (US futuras del módulo Booking).
* Verificación de `event.status` (D4).
* Frontend (sin cambios; invalidación cache vive en módulo Booking).
* Penalización financiera (`BR-BOOKING-004/009`).
* Conversión FX.
* Multi-categoría por intent.

### Explicit Non-Goals

* No abrir transacción propia (participa en la del invocador).
* No exponer endpoint REST.
* No tocar la lógica de transición de `BookingIntent.status` (responsabilidad del módulo Booking).
* No emitir eventos de dominio externos (event bus, etc.) — sin pubsub en MVP.

---

## 5. Architecture Alignment

### Backend Architecture

* **Stack**: Node.js + Express + TypeScript + Prisma + PostgreSQL.
* **Patrón**: Clean / Hexagonal con port `BudgetCommittedSyncPort`.
* **Reuso**: `BudgetItemWriteRepository` (US-036), `BookingIntentRepository` (US-019/US-025/US-037 extendido), `EventRepository` (lectura).
* **Nuevo**: `UpdateCommittedFromBookingIntentUseCase`, port + adapter, auto-create helper.

### Frontend Architecture

* Sin cambios. El módulo Booking (futura) se encarga del re-fetch del cache después de invocar confirm/cancel.

### Database Architecture

* `booking_intents` — añadir `committed_synced_at: timestamp NULL` y `committed_synced_amount: decimal(18,2) NULL` (migración menor en US-039 si no existen).
* `budget_items` — sin cambios estructurales; `committed` decimal existente.
* Sin nuevas tablas.

### API Architecture

* N/A (handler interno).

### AI / PromptOps Architecture

No aplica.

### Security Architecture

* Handler interno; sin endpoint público. Ownership y autorización son responsabilidad del invocador upstream.
* Logging sin PII.

### Testing Architecture

* Vitest + Prisma test database para integration, concurrency tests, idempotency tests, currency mismatch.

---

## 6. Functional Interpretation

| AC                                       | Technical Interpretation                                                                                                                                                                                                                  | Impacted Layer(s) |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| AC-01 Apply increment                     | UseCase ejecuta SELECT FOR UPDATE sobre `BookingIntent`, verifica `committed_synced_at IS NULL`, verifica currency, localiza/auto-crea BudgetItem, increment con SELECT FOR UPDATE, set `committed_synced_at = NOW()`, `committed_synced_amount = total`. | BE, DB             |
| AC-02 Revert decrement                    | UseCase ejecuta SELECT FOR UPDATE, verifica `committed_synced_at IS NOT NULL`, decrement, RESET `committed_synced_at = NULL`, `committed_synced_amount = NULL`. Persiste auditoría heredada del invocador.                                  | BE, DB             |
| AC-03 Idempotencia                       | `committed_synced_at` controla; segunda invocación skip + log info.                                                                                                                                                                       | BE                 |
| AC-04 Auto-create                        | Si query `findActiveBy({ budgetId, serviceCategoryId })` retorna null ⇒ `BudgetItemWriteRepository.create({...})` con flags D2.                                                                                                              | BE                 |
| AC-05 Currency mismatch                  | Si difiere ⇒ throw `CurrencyMismatchError` → la `$transaction` del invocador hace rollback total.                                                                                                                                          | BE                 |
| AC-06 Monto 0                             | Si `bookingIntent.total === 0` ⇒ skip + log info. La transacción del invocador continúa.                                                                                                                                                  | BE                 |
| AC-07 Cache invalidation                 | Frontend: el flujo del módulo Booking invoca `queryClient.invalidateQueries({ queryKey: ['event', eventId, 'budget'] })` en `onSuccess`. US-039 NO añade frontend.                                                                          | FE (regresión)      |
| AC-08 Performance                        | El handler es O(1) lookup + 2-3 row updates dentro de la transacción. PERF-01 mide el endpoint upstream.                                                                                                                                  | BE, DB, QA         |
| EC-01..08                               | Cubiertos por lógica del use case + logs.                                                                                                                                                                                                 | BE                 |
| VR-01..05                               | Implementadas en el use case.                                                                                                                                                                                                              | BE                 |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

* `modules/budget` (extensión): use case + helpers + adapter.
* `modules/booking` (consumidor futuro): define el port `BudgetCommittedSyncPort` que `ConfirmBookingIntentUseCase` y `CancelBookingIntentUseCase` invocan.

### Ports / Adapters

* **Port** (en `modules/booking/ports/budget-committed-sync.port.ts`):
  ```ts
  export interface BudgetCommittedSyncPort {
    applyOnConfirm(input: { bookingIntentId: string; tx: PrismaTx }): Promise<void>;
    revertOnCancel(input: { bookingIntentId: string; tx: PrismaTx; cancellation: { at: Date; by: string; reason: string } }): Promise<void>;
  }
  ```
* **Adapter** (en `modules/budget/adapters/budget-committed-sync.adapter.ts`):
  * Implementa el port delegando al use case.
  * El `tx` se inyecta para participar en la transacción del invocador.

### Use Cases

* `UpdateCommittedFromBookingIntentUseCase` con métodos:
  * `applyOnConfirm({ bookingIntentId, tx })`:
    1. `bookingIntent = repo.findByIdForUpdate({ id: bookingIntentId, tx })`. Si null ⇒ throw `BookingIntentNotFoundError`.
    2. Si `bookingIntent.committed_synced_at !== null` ⇒ log info `skipped_already_synced` + return.
    3. Si `bookingIntent.total === 0` ⇒ log info `skipped_zero_amount` + return.
    4. `event = eventRepo.findById({ id: bookingIntent.event_id, tx })`. Si `event.currency_code !== bookingIntent.currency_code` ⇒ throw `CurrencyMismatchError`.
    5. `budgetItem = budgetItemRepo.findActiveBy({ budgetId: event.budget.id, serviceCategoryId: bookingIntent.service_category_id, tx })`.
       - Si null ⇒ `budgetItem = budgetItemRepo.create({ budget_id: event.budget.id, service_category_id: bookingIntent.service_category_id, planned: 0, committed: 0, paid: 0, ai_generated: false, label: 'Auto-created by booking', tx })`. Log warning `budget.item.auto_created_by_booking`.
    6. `budgetItemRepo.incrementCommittedBy({ itemId: budgetItem.id, amount: bookingIntent.total, tx })` con `SELECT FOR UPDATE`.
    7. `bookingIntentRepo.markCommittedSynced({ id: bookingIntent.id, amount: bookingIntent.total, tx })` → set `committed_synced_at = NOW()`, `committed_synced_amount = total`.
    8. Log `budget.committed.synced` con `action='apply'`.

  * `revertOnCancel({ bookingIntentId, tx, cancellation })`:
    1. `bookingIntent = repo.findByIdForUpdate(...)`. Si null ⇒ throw `BookingIntentNotFoundError`.
    2. Si `bookingIntent.committed_synced_at === null` ⇒ log info `skipped_nothing_to_revert` + return.
    3. `event = eventRepo.findById(...)` (defensa: verificar currency).
    4. `budgetItem = budgetItemRepo.findActiveBy(...)`. Defensa: si null ⇒ throw error (estado inconsistente).
    5. `budgetItemRepo.decrementCommittedBy({ itemId: budgetItem.id, amount: bookingIntent.committed_synced_amount, tx })`.
    6. `bookingIntentRepo.clearCommittedSync({ id: bookingIntent.id, tx })` → `committed_synced_at = NULL`, `committed_synced_amount = NULL`.
    7. Log `budget.committed.synced` con `action='revert'`.

### Repositories

* `BudgetItemWriteRepository` (extensión de US-036):
  * `findActiveBy({ budgetId, serviceCategoryId, tx })`: encuentra primer item activo (no soft-deleted) por categoría.
  * `incrementCommittedBy({ itemId, amount, tx })`: `UPDATE budget_items SET committed = committed + $1, updated_at = NOW() WHERE id = $2` con `SELECT FOR UPDATE` previo o `UPDATE ... RETURNING`.
  * `decrementCommittedBy({ itemId, amount, tx })`: simétrico.
  * `create({ ..., tx })`: alineado con D2.

* `BookingIntentRepository` (extensión):
  * `findByIdForUpdate({ id, tx })`: `SELECT ... FOR UPDATE`.
  * `markCommittedSynced({ id, amount, tx })`.
  * `clearCommittedSync({ id, tx })`.

### Migrations

* `add_committed_synced_to_booking_intents.sql`:
  ```sql
  ALTER TABLE booking_intents
    ADD COLUMN committed_synced_at TIMESTAMP NULL,
    ADD COLUMN committed_synced_amount DECIMAL(18,2) NULL;
  ```
* Sin backfill: nulls iniciales son semánticamente correctos (intents no sincronizados).
* Si PB-P0-001 ya entrega los campos (verificar en DOC-task), no aplica migración.

### Error Handling

* `BookingIntentNotFoundError` → 404 en el invocador.
* `CurrencyMismatchError` → 500 con log error; rollback total. Debe ser caso anómalo (data corruption).
* Errores SQL inesperados → bubble up; rollback.

### Transactions

* Sí. Participa en la `prisma.$transaction` del invocador. NUNCA abre transacción propia.

### Observability

Logs estructurados (sin PII):
* `budget.committed.synced` (info) con `action ∈ {'apply','revert'}`, `bookingIntentId`, `budgetItemId`, `event_id`, `service_category_id`, `amount`, `correlationId`, `duration_ms`.
* `budget.committed.skipped_already_synced` (info).
* `budget.committed.skipped_nothing_to_revert` (info).
* `budget.committed.skipped_zero_amount` (info).
* `budget.item.auto_created_by_booking` (warn) con `bookingIntentId`, `new_budget_item_id`, `event_id`, `service_category_id`, `correlationId`.
* `budget.committed.currency_mismatch` (error) con `bookingIntentId`, `intent_currency`, `event_currency`.

---

## 8. Frontend Technical Design

No aplica. El módulo Booking (US futuras) será responsable de invalidar `['event', eventId, 'budget']` tras confirm/cancel exitoso. US-035, US-038 reaccionan automáticamente.

---

## 9. API Contract Design

N/A — handler interno sin endpoint público.

---

## 10. Database / Prisma Design

### Models Impacted

* `BookingIntent`: añadir `committed_synced_at`, `committed_synced_amount`.
* `BudgetItem`: sin cambios estructurales.

### Migrations Impact

Migración menor (§7).

### Seed Impact

* `BR-SEED-006`: seed debe incluir al menos un `BookingIntent.confirmed_intent` con su `committed_synced_at` y `committed_synced_amount` coherentes (post-sync simulado).

---

## 11. AI / PromptOps Design

No aplica.

---

## 12. Security & Authorization Design

* Handler interno (sin endpoint público).
* Ownership/role/event.status verificados por upstream.
* `event.status` NO verificado (D4); `BR-BOOKING-009` permite cancelar siempre.
* Logging sin PII; montos numéricos auditables.

---

## 13. Testing Strategy

### Unit Tests

| ID    | Scenario                                                                                                | Layer |
| ----- | ------------------------------------------------------------------------------------------------------- | ----- |
| UT-01 | `applyOnConfirm` con BudgetItem existente: increment + set `committed_synced_at`                          | BE    |
| UT-02 | `applyOnConfirm` sin BudgetItem: auto-create + increment + log warning                                    | BE    |
| UT-03 | `applyOnConfirm` con `committed_synced_at !== null`: skip + log info                                       | BE    |
| UT-04 | `applyOnConfirm` con `bookingIntent.total === 0`: skip + log info                                          | BE    |
| UT-05 | `applyOnConfirm` con currency mismatch: throw `CurrencyMismatchError`                                      | BE    |
| UT-06 | `revertOnCancel` con `committed_synced_at !== null`: decrement + reset                                    | BE    |
| UT-07 | `revertOnCancel` con `committed_synced_at === null`: skip + log info                                       | BE    |

### Integration Tests

| ID    | Scenario                                                                                | Layer   |
| ----- | --------------------------------------------------------------------------------------- | ------- |
| IT-01 | Happy path apply (con BudgetItem existente)                                              | BE + DB |
| IT-02 | Happy path apply (auto-create)                                                          | BE + DB |
| IT-03 | Happy path revert                                                                       | BE + DB |
| IT-04 | Idempotencia: doble apply sobre mismo bookingIntentId no duplica                          | BE + DB |
| IT-05 | Idempotencia: doble revert no duplica decrement                                          | BE + DB |
| IT-06 | Currency mismatch: rollback total                                                       | BE + DB |
| IT-07 | Auto-create con soft-deleted existente: crea nuevo (no resucita)                          | BE + DB |
| IT-08 | Confirm + cancel + nuevo intent (mismo categoría) ⇒ balance final correcto                | BE + DB |

### Concurrency Tests

| ID    | Scenario                                                                                  | Layer   |
| ----- | ----------------------------------------------------------------------------------------- | ------- |
| CC-01 | Dos `applyOnConfirm` sobre mismo bookingIntentId en paralelo ⇒ uno gana, otro skip          | BE + DB |
| CC-02 | Dos `applyOnConfirm` sobre BookingIntents distintos en la misma categoría ⇒ ambos aplican  | BE + DB |
| CC-03 | `applyOnConfirm` + `revertOnCancel` simultáneos sobre mismo intent ⇒ serializado por lock   | BE + DB |

### Performance Tests

| ID      | Scenario                                                                          | Expected               |
| ------- | --------------------------------------------------------------------------------- | ---------------------- |
| PERF-01 | Latencia del handler (UT-01 path)                                                  | < 50 ms en local       |
| PERF-02 | Endpoint upstream que invoca el handler (con seed)                                 | P95 < 1.5 s (NFR-PERF-001) |

### Contract Tests

N/A (sin endpoint público). Los contract tests viven en US futuras del módulo Booking.

### Migration Test

* `MIG-01`: aplicar migración sobre BD limpia y BD con datos pre-existentes; verificar que ningún registro existente se rompe (NULL inicial).

---

## 14. Observability & Audit

Logs estructurados (definidos en §7). Sin nuevas métricas Prometheus.

---

## 15. Seed / Demo Data Impact

* Seed debe incluir un `BookingIntent.confirmed_intent` con `committed_synced_at` set y un `BudgetItem.committed` que refleje la sincronización.
* Recomendado: un seed con auto-created BudgetItem para demoar D2.

---

## 16. Documentation Alignment Required

| Document                                | Conflict                                                                                                          | Action                                                                                                                          | Blocks |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `docs/6 §BookingIntent` + PB-P0-001       | `committed_synced_at`, `committed_synced_amount` no documentados/no en schema.                                      | Tras D1, actualizar `docs/6` y aplicar migración en US-039.                                                                       | No     |
| `docs/16 §M07 Booking`                    | Logs del handler sin documentar.                                                                                  | Actualizar catálogo de eventos de log.                                                                                          | No     |
| `docs/4 §BR-BOOKING-008`                  | Idempotencia y auto-create no detallados.                                                                          | Nota interpretativa.                                                                                                            | No     |
| `docs/10`                                | `NFR-PERF-API-001` no existe.                                                                                       | Housekeeping `NFR-PERF-001`.                                                                                                    | No     |

---

## 17. Technical Risks & Mitigations

| Risk                                                                                                              | Impact                                          | Mitigation                                                                                                                                  |
| ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Acoplamiento entre `modules/budget` y `modules/booking`.                                                            | Dependencias cruzadas.                          | Port definido en `modules/booking`; adapter en `modules/budget`; sin imports directos.                                                       |
| Migración menor podría fallar en entornos con datos pre-existentes.                                                  | Despliegue bloqueado.                            | Columnas NULL sin backfill; idempotente con `IF NOT EXISTS` si aplica.                                                                       |
| Race condition no manejado correctamente.                                                                            | Double-counting.                                | `SELECT FOR UPDATE` sobre BookingIntent + BudgetItem; CC-01..03 validan.                                                                     |
| `BookingIntent.total` cambia post-sync (no debería pero defensa profunda).                                          | Reversa incorrecta.                              | Persistir `committed_synced_amount` para reversa exacta independiente de `total` actual.                                                     |
| Documentation Alignment Required no se ejecuta.                                                                       | Documentación divergente.                       | Tareas DOC explícitas.                                                                                                                      |

---

## 18. Implementation Guidance for Coding Agents

### Archivos / Carpetas probablemente impactadas

**Backend** (`apps/api`):

* `src/modules/booking/ports/budget-committed-sync.port.ts` — **nuevo**.
* `src/modules/budget/adapters/budget-committed-sync.adapter.ts` — **nuevo**.
* `src/modules/budget/use-cases/update-committed-from-booking-intent.use-case.ts` — **nuevo**.
* `src/modules/budget/repositories/budget-item-write.repository.ts` — **extender** con métodos `findActiveBy`, `incrementCommittedBy`, `decrementCommittedBy`, `create` (overload con `tx`).
* `src/modules/booking/repositories/booking-intent.repository.ts` — **extender** con `findByIdForUpdate`, `markCommittedSynced`, `clearCommittedSync`.
* `prisma/migrations/<timestamp>_add_committed_synced_to_booking_intents/migration.sql` — **nuevo** (si los campos no existen).
* `prisma/schema.prisma` — **extender** modelo `BookingIntent`.
* `src/shared/logging/budget-sync-events.ts` — **nuevo**.

**Documentación**:

* `docs/6 §BookingIntent` — DOC.
* `docs/16 §M07` — DOC.
* `docs/4 §BR-BOOKING-008` — DOC.

### Orden recomendado

1. Migración + actualización schema Prisma.
2. Extensión de repositorios.
3. Port + adapter.
4. Use case (`applyOnConfirm`, `revertOnCancel`).
5. Logger estructurado.
6. Tests por capa.
7. Documentación.

### Decisiones que no deben reabrirse

* D1: idempotencia vía `committed_synced_at`/`committed_synced_amount`.
* D2: auto-create sin reusar soft-deleted.
* D3: skip silencioso para `total = 0`.
* D4: no verificar `event.status`.

### Qué NO debe implementarse

* Endpoint público.
* Transacción propia.
* Reuso de soft-deleted.
* Validación de `event.status`.
* Penalización financiera.

---

## 19. Task Generation Notes

| Grupo | Cantidad estimada | Notas                                                                                  |
| ----- | :---------------: | -------------------------------------------------------------------------------------- |
| DB    | 1                 | Migración menor.                                                                        |
| BE    | 6                 | Port, adapter, use case, repository extensions (×2), logger.                            |
| API   | 0                 | N/A.                                                                                    |
| SEC   | 0                 | Heredado.                                                                                |
| OBS   | 0                 | Cubierto en BE.                                                                          |
| FE    | 0                 | Sin cambios.                                                                            |
| SEED  | 1                 | Seed con confirmed intent sincronizado + auto-created BudgetItem.                       |
| QA    | 5                 | UT, IT, CC, PERF, MIG.                                                                  |
| AI    | 0                 | No aplica.                                                                              |
| OPS   | 0                 | Sin cambios.                                                                            |
| DOC   | 3                 | `docs/6`, `docs/16 §M07`, `docs/4 §BR-BOOKING-008`.                                       |

**Total estimado**: ~16 tareas.

---

## 20. Technical Spec Readiness

| Check                                                       | Status |
| ----------------------------------------------------------- | ------ |
| User Story approved                                         | Pass   |
| Product Backlog mapping found                               | Pass   |
| Decision Resolution reviewed                                | Pass   |
| Scope clear                                                 | Pass   |
| Architecture alignment clear                                | Pass   |
| API impact clear                                            | N/A (no endpoint) |
| DB impact clear                                             | Pass (migración menor) |
| AI impact clear                                             | N/A    |
| Security impact clear                                       | Pass   |
| Testing strategy clear                                      | Pass   |
| Ready for Development Task Breakdown                        | Yes    |

---

## 21. Final Recommendation

`Ready for Task Breakdown`

US-039 entrega un handler hexagonal implementación-ready con port en `modules/booking` y adapter en `modules/budget`, participando en la transacción del invocador. Idempotencia vía dos columnas en `booking_intents`. Auto-create alineado con US-036 D2. Defensa profunda currency. Migración menor planificada. Sin frontend. Próximo paso: Development Tasks.
