# Technical Specification — US-036: Crear, editar y eliminar BudgetItem por categoría

## 1. Metadata

| Field                                | Value                                                                                                          |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| User Story ID                        | US-036                                                                                                         |
| Source User Story                    | `management/user-stories/US-036-crud-budget-items.md`                                                          |
| Decision Resolution Artifact         | `management/user-stories/decision-resolutions/US-036-decision-resolution.md`                                   |
| Priority                             | P1                                                                                                             |
| Backlog ID                           | PB-P1-020                                                                                                      |
| Backlog Title                        | Gestión de presupuesto + BudgetItems                                                                          |
| Backlog Execution Order              | 38 (P0: 18 items + P1: 20 items)                                                                               |
| User Story Position in Backlog Item  | 2 de 2 (US-035 → US-036)                                                                                       |
| Related User Stories in Backlog Item | US-035 (vista del presupuesto), US-036 (CRUD de BudgetItem)                                                    |
| Epic                                 | EPIC-BUD-001 — Budget Management & Currency                                                                    |
| Backlog Item Dependencies            | PB-P0-001 (schema base con `deleted_at`, `deleted_by`), PB-P1-006 (creación de evento con `currency_code`)     |
| Feature                              | CRUD de BudgetItems                                                                                            |
| Module / Domain                      | Budget                                                                                                         |
| User Story Status                    | Approved with Minor Notes                                                                                     |
| Backlog Alignment Status             | Found                                                                                                          |
| Technical Spec Status                | Ready for Task Breakdown (Revision R1 — 2026-07-14 alignment)                                                  |
| Created Date                         | 2026-06-27                                                                                                     |
| Last Updated                         | 2026-07-14                                                                                                     |
| Revision R1                          | 2026-07-14 — Alineación con schema real (Opción A, paridad con US-035 R1). Ver §22.                             |

---

## 2. Backlog Execution Context

### Product Backlog Item

`PB-P1-020 — Gestión de presupuesto + BudgetItems` agrupa la vista (US-035) y el CRUD (US-036). US-036 cierra el item entregando las tres mutaciones `POST/PATCH/DELETE /api/v1/events/:eventId/budget/items[/:itemId]` ya catalogadas en `docs/16 §M06`. Todas las mutaciones invalidan la query key TanStack `['event', eventId, 'budget']` consumida por US-035.

### Execution Order Rationale

US-036 se trabaja después de US-035 porque:
1. US-035 ya entregó el módulo `modules/budget` con DTOs Zod (`BudgetItemDto`, `BudgetSummaryDto`), repository read-only y la lectura del presupuesto. US-036 extiende el módulo con writes.
2. US-035 estableció la query key TanStack canónica que US-036 invalida.
3. La UI de US-036 vive en la misma página/tabla entregada por US-035 (`BudgetItemsTable`), con extensión inline edit + modales.

PB-P1-020 ocupa la posición 38 en el Product Backlog Prioritized.

### Related User Stories in Same Backlog Item

| User Story                                   | Role in Backlog Item                                                                       | Suggested Order |
| -------------------------------------------- | ------------------------------------------------------------------------------------------ | --------------- |
| US-035 — Vista del presupuesto                | `GET /budget` con `summary` server-side y tabla por categoría                                | 1               |
| US-036 — CRUD de BudgetItem                  | `POST/PATCH/DELETE /budget/items[/:itemId]`; invalida cache de US-035                       | 2               |

---

## 3. Executive Technical Summary

US-036 extiende el módulo `modules/budget` (entregado por US-035) con tres use cases de mutación (`CreateBudgetItemUseCase`, `UpdateBudgetItemUseCase`, `DeleteBudgetItemUseCase`), un `BudgetItemWriteRepository` y tres rutas controller `POST/PATCH/DELETE`. Las mutaciones aplican validación Zod estricta (D1 rechaza `committed` con 400 `INVALID_FIELD`), bloqueos por estado del evento (D3, 409 `EVENT_NOT_EDITABLE` para `cancelled`/`completed`), y reglas de eliminación con cross-module check sobre `booking_intents` para detectar `BookingIntent.pending` por `(event_id, service_category_id)` (D2, 409 `ITEM_HAS_PENDING_INTENT`). El soft delete usa `deleted_at = NOW()` + `deleted_by` y los items soft-deleted se filtran automáticamente del listado y de los agregados de US-035 (ya implementado por el repositorio read de US-035, que solo debe añadir el predicado `deleted_at IS NULL`). El cambio de `service_category_id` es editable solo cuando `committed = 0` (D5, 409 `ITEM_HAS_COMMITMENT_CATEGORY_LOCKED`). Frontend: tres componentes nuevos (`AddBudgetItemModal`, `EditBudgetItemRow`, `DeleteBudgetItemDialog`) integrados en `BudgetItemsTable` de US-035 con RHF + Zod, tres hooks de mutación con invalidación automática del cache `['event', eventId, 'budget']`, y warnings advisory client-side para `paid > committed`/`paid > planned` (D4 elimina la cross-constraint backend). Sin migraciones: el schema entregado por PB-P0-001 ya incluye `deleted_at`, `deleted_by`. Cross-module query `bookingIntentRepository.findPendingByEventAndCategory(eventId, serviceCategoryId)` se introduce dentro de `DeleteBudgetItemUseCase` siguiendo el patrón de servicios de dominio en arquitectura hexagonal.

---

## 4. Scope Boundary

### In Scope

* Tres use cases (`CreateBudgetItemUseCase`, `UpdateBudgetItemUseCase`, `DeleteBudgetItemUseCase`) con validación Zod, reglas D1-D5 y errores tipados.
* Repository `BudgetItemWriteRepository` con `create`, `update`, `softDelete`.
* Tres rutas en el controller existente o controller nuevo `BudgetItemsMutationController`.
* Cross-module check en `DeleteBudgetItemUseCase`: lookup de `BookingIntent.pending` por `(event_id, service_category_id)`.
* Ajuste mínimo en `BudgetReadRepository` (US-035) para añadir filtro `WHERE deleted_at IS NULL` en items y agregados (si no estaba ya).
* Frontend: `AddBudgetItemModal`, `EditBudgetItemRow`, `DeleteBudgetItemDialog`; hooks `useCreateBudgetItem`, `useUpdateBudgetItem`, `useDeleteBudgetItem`; warnings advisory client-side.
* i18n: claves `budget.item.*` y mensajes de error 409 en 4 locales.
* Logs estructurados `budget.item.created`, `budget.item.updated`, `budget.item.deleted`.
* Tests unit/integration/E2E/perf/a11y/contract.

### Out of Scope

* Bulk / batch endpoints (Future).
* Edición de `committed` (system-managed por BR-BUDGET-005 / US-038-US-039).
* Hard delete.
* Captura de pago, contratos firmados, comisiones.
* Multi-moneda y conversión FX.
* Locking optimista para concurrencia (last-write-wins en MVP; documentado en EC-08 de la US).
* Mutaciones de `Budget` (entidad padre); fuera del alcance del MVP.

### Explicit Non-Goals

* No introducir nuevos verbos HTTP fuera del catálogo M06.
* No exponer `committed` ni `ai_generated` como editables.
* No exponer hard delete.
* No reglar cross-constraints `paid ≤ committed` server-side (D4).
* No tocar el sync de `committed` por BookingIntent (US-038/US-039).

---

## 5. Architecture Alignment

### Backend Architecture

* **Stack**: Node.js + Express + TypeScript + Prisma + PostgreSQL.
* **Patrón**: Clean / Hexagonal (controller → use case → repository).
* **Reuso del módulo `modules/budget`** entregado por US-035: scaffolding, DTOs `BudgetItemDto`/`BudgetSummaryDto`, repositorio read (extendido con `deleted_at IS NULL`), `EventOwnershipPolicy`, `OrganizerRoleGuard`, `adminExclusionGuard`.
* **Nuevo**: tres use cases write, `BudgetItemWriteRepository`, controller con tres rutas, schemas Zod de body.
* **Cross-module**: `DeleteBudgetItemUseCase` invoca `BookingIntentReadPort.findPendingByEventAndCategory(eventId, serviceCategoryId)`; el port se define en `modules/budget` y la implementación delega a `modules/booking` (puerto/adaptador hexagonal).

### Frontend Architecture

* **Stack**: Next.js App Router + TypeScript + TanStack Query + RHF + Zod + Tailwind + next-intl.
* **Reuso de US-035**: ruta `/[locale]/organizer/events/[eventId]/budget`, `BudgetView`, `BudgetItemsTable`, query key canónica `['event', eventId, 'budget']`, hook `useEventBudget`.
* **Nuevo**: 3 componentes (`AddBudgetItemModal`, `EditBudgetItemRow`, `DeleteBudgetItemDialog`), 3 hooks de mutación (`useCreateBudgetItem`, `useUpdateBudgetItem`, `useDeleteBudgetItem`), warnings advisory en filas (`paid > committed`/`paid > planned`).
* **Invalidación**: cada mutación exitosa ejecuta `queryClient.invalidateQueries({ queryKey: ['event', eventId, 'budget'] })`.

### Database Architecture

* **Modelos**: `BudgetItem` (existente con `deleted_at` nullable y `deleted_by` nullable), `Budget`, `ServiceCategory`, `BookingIntent` (solo lectura desde este módulo).
* **Sin migraciones**.
* **Índices**: reuso de `budget_items.budget_id` y `booking_intents` por `(event_id, service_category_id, status)` si existe; si no, sin nuevo índice — el dataset MVP es pequeño y NFR-PERF-001 se cumple sin él.

### API Architecture

* **Endpoints** (ya catalogados en `docs/16 §M06`):
  * `POST /api/v1/events/:eventId/budget/items`
  * `PATCH /api/v1/events/:eventId/budget/items/:itemId`
  * `DELETE /api/v1/events/:eventId/budget/items/:itemId`
* **Catálogo de errores extendido** (Documentation Alignment Required): `INVALID_FIELD`, `INVALID_VALUE`, `INVALID_PARAMS`, `ITEM_NOT_FOUND`, `ITEM_HAS_COMMITMENT`, `ITEM_HAS_PENDING_INTENT`, `ITEM_HAS_PAID_AMOUNT`, `ITEM_HAS_COMMITMENT_CATEGORY_LOCKED`, `EVENT_NOT_EDITABLE`.

### AI / PromptOps Architecture

No aplica. `ai_generated` se preserva en backend; el cliente no puede modificarlo.

### Security Architecture

* HTTP-only cookies; backend como source of truth.
* RBAC: `OrganizerRoleGuard`. Ownership: `EventOwnershipPolicy`. Exclusión admin: `adminExclusionGuard`.
* Anti-IDOR: `itemId` cross-event check (`item.budget.event_id === path.eventId`).
* No-revelación 404.

### Testing Architecture

* Vitest (unit + integration), Supertest (API), Playwright (E2E), MSW (mocks frontend), jest-axe (A11Y), snapshot contractual contra OpenAPI.

---

## 6. Functional Interpretation

| Acceptance Criterion                                | Technical Interpretation                                                                                                                                                                                                                          | Impacted Layer(s)                |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| AC-01 Crear item                                     | `CreateBudgetItemUseCase` valida body, asegura `event.status ∈ {'draft','active'}` y `service_category_id` activa, persiste con `committed=0`, `ai_generated=false`, normaliza `paid` (null→0 en response). Controller responde 201.                  | BE, API                          |
| AC-02 Editar item                                    | `UpdateBudgetItemUseCase` rechaza `committed` (Zod no lo declara → 400 `INVALID_FIELD`), valida D5 antes de mutar `service_category_id`, preserva `ai_generated`. Responde 200.                                                                       | BE, API                          |
| AC-03 Soft delete                                    | `DeleteBudgetItemUseCase` aplica `deleted_at = NOW()`, `deleted_by = currentUser.id`. Responde 204. El filtro `deleted_at IS NULL` en `BudgetReadRepository` lo excluye del listado y agregados de US-035.                                            | BE, DB                           |
| AC-04 Bloqueo `committed > 0` en DELETE             | `DeleteBudgetItemUseCase` retorna 409 `ITEM_HAS_COMMITMENT`.                                                                                                                                                                                       | BE                                |
| AC-05 Bloqueo `pending intent` / `paid > 0`         | `DeleteBudgetItemUseCase` invoca `BookingIntentReadPort.findPendingByEventAndCategory` y verifica `paid > 0`; retorna 409 con `error_code` específico.                                                                                              | BE (cross-module)                |
| AC-06 Bloqueo en `cancelled`/`completed`            | Use cases verifican `event.status` antes de mutar; retornan 409 `EVENT_NOT_EDITABLE`.                                                                                                                                                              | BE                                |
| AC-07 PATCH categoría + warnings advisory            | Backend valida `committed = 0` antes de mutar categoría. Frontend muestra warnings advisory por fila (`paid > committed`/`paid > planned`) sin enviar al backend.                                                                                    | BE, FE                            |
| AC-08 Invalidación cache TanStack                    | Cada hook de mutación llama `queryClient.invalidateQueries` con la query key canónica.                                                                                                                                                              | FE                                |
| AC-09 A11Y inline edit                               | Componentes con `aria-live`, foco preservado, `aria-invalid` en errores.                                                                                                                                                                          | FE                                |
| AC-10 Performance                                    | Cada mutación ejecuta 1-3 queries SQL. Tests PERF-01 contra dataset de 30 items. P95 < 1.5 s.                                                                                                                                                       | BE, DB, QA                        |
| EC-01..09                                            | Cubiertos por validaciones del use case y mensajes de error tipados.                                                                                                                                                                              | BE, FE                            |
| VR-01..10                                           | Implementadas en Zod schemas + use case checks.                                                                                                                                                                                                    | BE                                |
| SEC-01..06                                          | Reuso de policies/guards + cross-event check explícito.                                                                                                                                                                                            | BE, SEC                           |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

* `modules/budget` (extensión del módulo entregado por US-035).
* `modules/booking` (consumido vía puerto desde `modules/budget` para el cross-module check).

### Use Cases / Application Services

* `CreateBudgetItemUseCase` (R1):
  1. Recibe `{ eventId, currentUser, body }`.
  2. `EventOwnershipPolicy.assertOwner(eventId, currentUser.id)` (masked 404, patrón US-027).
  3. Lee `event` (al menos `status`); si `status ∉ {'draft','active'}` → 409 `EVENT_NOT_EDITABLE`.
  4. Valida `body` con `createBudgetItemBodySchema` (Zod estricto R1).
  5. Si `body.category_code` presente y no `null`: valida contra whitelist `ServiceCategoryReadPort.getActiveCodes()` (patrón US-019). Si no está → 400 `INVALID_VALUE`.
  6. **En `prisma.$transaction`:**
     * Crea item con `amountCommitted = body.amount_committed ?? 0`.
     * Recomputa `Budget.totalPlanned` y `Budget.totalCommitted` con `SUM(items.amount*)` y actualiza el registro `Budget` (BLK-E, compromiso R1 US-035).
  7. Emite log `budget.item.created`.
  8. Retorna 201 con `BudgetItemDto` (shape R1: `id`, `label`, `category_code`, `amount_planned`, `amount_committed`).

* `UpdateBudgetItemUseCase` (R1):
  1. Recibe `{ eventId, itemId, currentUser, body }`.
  2. Ownership guard.
  3. Verifica `event.status`. Si bloqueado → 409 `EVENT_NOT_EDITABLE`.
  4. Lee `item` con `include: { budget: true }`. Si `item.budget.eventId !== eventId` → 404 `ITEM_NOT_FOUND` (anti-IDOR, SEC-04).
  5. Valida `body` con `updateBudgetItemBodySchema` (Zod `.strict()` rechaza `amount_committed`/`paid`/`ai_generated`/`service_category_id` → 400 `INVALID_FIELD`).
  6. Si `body.category_code` presente y difiere del actual:
     - Valida contra whitelist activa. Si no → 400 `INVALID_VALUE`.
     - Regla D5: verifica `item.amountCommitted === 0`. Si no → 409 `ITEM_HAS_COMMITMENT_CATEGORY_LOCKED`.
  7. **En `prisma.$transaction`:**
     * Update del item preservando `amountCommitted` (system-managed).
     * Recompute `Budget.totalPlanned` si `amount_planned` cambió (BLK-E).
  8. Emite log `budget.item.updated` con `fields_changed`.
  9. Retorna 200 con `BudgetItemDto`.

* `DeleteBudgetItemUseCase` (R1 — **hard delete**):
  1. Recibe `{ eventId, itemId, currentUser }`.
  2. Ownership guard.
  3. Verifica `event.status`. Si bloqueado → 409 `EVENT_NOT_EDITABLE`.
  4. Lee `item` con `include: { budget: true }`. Cross-event check → 404 si falla.
  5. Verifica `item.amountCommitted > 0` → 409 `ITEM_HAS_COMMITMENT`.
  6. Si `item.categoryCode` no es `null`: resuelve `ServiceCategory.findByCode(item.categoryCode) → serviceCategoryId`. Si existe, invoca `BookingIntentReadPort.findPendingByEventAndCategory(eventId, serviceCategoryId)`. Si retorna ≥ 1 → 409 `ITEM_HAS_PENDING_INTENT`. Si `categoryCode = null` o code no matchea, se omite el check (no hay `BookingIntent` posible sin FK válida).
  7. **En `prisma.$transaction`:**
     * `prisma.budgetItem.delete({ where: { id } })` (hard delete; el schema no tiene `deleted_at`).
     * Recompute totales del `Budget` padre (BLK-E).
  8. Emite log `budget.item.deleted` con snapshot pre-delete (`label`, `category_code`, `amount_planned`, `amount_committed`) para trazabilidad de auditoría.
  9. Retorna 204.

> **R1 — Auditoría de DELETE:** el log estructurado `budget.item.deleted` captura los campos completos del item eliminado. Combinado con PostgreSQL WAL/point-in-time recovery, sustituye funcionalmente al soft delete en el MVP. `ITEM_HAS_PAID_AMOUNT` (AC-05 antiguo) queda **N/A**: la columna `paid` no existe.

### Controllers / Routes

* Opción A (recomendada): controller dedicado `BudgetItemsMutationController` con tres handlers.
* Opción B: extender el `BudgetController` de US-035 si así está estructurado.
* Path params validados con Zod (`eventId`, `itemId` UUID).
* Middleware chain: `authRequired` → `OrganizerRoleGuard` → `adminExclusionGuard` → handler.

### DTOs / Schemas (R1)

> **R1 (2026-07-14):** shape alineado con schema real. `paid`, `ai_generated`, `service_category_id` (FK) **eliminados del contrato MVP** (diferidos a US paralela P2). `category_code` es string libre validado contra whitelist `ServiceCategory.code WHERE is_active = true AND deleted_at IS NULL`.

```ts
// backend/src/modules/budget-management/dto/create-budget-item.body.ts
export const createBudgetItemBodySchema = z.object({
  label: z.string().min(1).max(120),
  category_code: z.string().min(1).max(64).nullable().optional(),
  amount_planned: z.number().nonnegative(),
  amount_committed: z.number().nonnegative().optional(), // default 0 en use case
}).strict(); // rechaza campos extras (incluido `committed`, `paid`, `ai_generated`, `service_category_id`)

// backend/src/modules/budget-management/dto/update-budget-item.body.ts
export const updateBudgetItemBodySchema = z.object({
  label: z.string().min(1).max(120).optional(),
  category_code: z.string().min(1).max(64).nullable().optional(),
  amount_planned: z.number().nonnegative().optional(),
}).strict(); // rechaza `amount_committed`, `paid`, `ai_generated`, `service_category_id`
```

Reuso de `BudgetItemDto` (US-035 R1) en responses.

### Repository / Persistence (R1)

* `BudgetItemWriteRepository` (opera **dentro** de una `prisma.$transaction` provista por el use case; recibe un `TransactionClient`):
  * `create(tx, { budgetId, label, categoryCode, amountPlanned, amountCommitted }): Promise<BudgetItem>`.
  * `update(tx, itemId, partial): Promise<BudgetItem>`.
  * `hardDelete(tx, itemId): Promise<void>` (R1: hard delete; el schema no declara `deletedAt` en `BudgetItem`).
  * `recomputeBudgetTotals(tx, budgetId): Promise<void>` (SUM sobre items + UPDATE en `Budget` — BLK-E).

* `BudgetItemReadRepository` (extensión de US-035):
  * **R1:** no requiere filtro `deleted_at IS NULL` (columna no existe). La invalidación es implícita: los items eliminados desaparecen de la BD.

* `ServiceCategoryReadPort` (nuevo, en `modules/budget-management`):
  * `getActiveCodes(): Promise<Set<string>>` — retorna set de `code` con `is_active = true` y `deleted_at IS NULL`. Cacheable en el composition root si el volumen justifica.
  * `findIdByCode(code: string): Promise<string | null>` — usado por `DeleteBudgetItemUseCase` para resolver el cross-module.

* `BookingIntentReadPort` (nuevo, en `modules/budget-management`):
  * `findPendingByEventAndCategory({ eventId, serviceCategoryId }): Promise<{ id: string }[]>`.
  * Adapter en `modules/booking-intent` que consulta `prisma.bookingIntent.findMany({ where: { eventId, serviceCategoryId, status: 'pending' }, select: { id: true }, take: 1 })`.
  * Índices existentes en `booking_intents`: `@@index([eventId])`, `@@index([serviceCategoryId])` (schema:616-617).

### Validation Rules

| ID    | Implementación                                                                                       |
| ----- | ---------------------------------------------------------------------------------------------------- |
| VR-01 | Zod `planned: z.number().nonnegative()` → 400 `INVALID_VALUE`.                                       |
| VR-02 | Zod `paid: z.number().nonnegative()` → 400.                                                          |
| VR-03 | Use case verifica `service_category.is_active = true`; si no → 400 `INVALID_VALUE`.                  |
| VR-04 | Zod `.strict()` rechaza `committed` → 400 `INVALID_FIELD`.                                            |
| VR-05 | Use case verifica `committed === 0` antes de mutar `service_category_id` → 409.                       |
| VR-06 | Zod path params UUID → 400 `INVALID_PARAMS`.                                                          |
| VR-07 | Use case verifica `item.budget.event_id === path.eventId` → 404 (no-revelación).                     |
| VR-08 | Middleware `authRequired` → 401.                                                                     |
| VR-09 | Use case excluye `deleted_at IS NOT NULL` → 404.                                                      |
| VR-10 | Use case verifica `event.status ∈ {'draft','active'}` → 409 `EVENT_NOT_EDITABLE`.                     |

### Error Handling

* Errores tipados desde el use case (subclase `DomainError` con `code`, `httpStatus`, `details`).
* Middleware de error transforma a `{ error_code, message, details? }` consistente con `docs/16 §error format`.
* Logs estructurados de errores capturan `error_code`, `correlationId`, sin PII.

### Transactions

* No requeridas para POST/PATCH/DELETE en MVP (single-row updates).
* Si el módulo `Budget` materializa totales (decisión a discreción del implementador), las mutaciones de items se envuelven en `prisma.$transaction([itemUpdate, budgetTotalsUpdate])`. Para US-036 en MVP, recomendado mantener el cálculo live en US-035 sin materialización para evitar drift.

### Observability

* Logs estructurados:
  * `budget.item.created` con `eventId`, `userId`, `itemId`, `service_category_id`, `planned`, `paid`, `ai_generated`, `correlationId`, `duration_ms`.
  * `budget.item.updated` con campos editados (`fields_changed: string[]`), valores anteriores/nuevos para `planned`/`paid` (montos auditables, sin PII), `correlationId`, `duration_ms`.
  * `budget.item.deleted` con `itemId`, `service_category_id`, `block_reason: null | error_code` (cuando falla), `correlationId`, `duration_ms`.
* Métricas: reuso del histogram `http_request_duration_seconds{route="/events/:eventId/budget/items"}` (rutas separadas por método).

---

## 8. Frontend Technical Design

### Routes / Pages

* Reuso de `/[locale]/organizer/events/[eventId]/budget` entregada por US-035.

### Components

* `AddBudgetItemModal` (nuevo): modal con RHF + Zod (`createBudgetItemBodySchema` espejo cliente), select de `service_category_id`, inputs `planned`, `paid?`, `label?`. CTA "Agregar". Manejo de errores 4xx.
* `EditBudgetItemRow` (nuevo): edición inline en la fila; misma validación Zod. Cambio de `service_category_id` solo habilitado si `committed === 0` (UX: select disabled con tooltip cuando bloqueado).
* `DeleteBudgetItemDialog` (nuevo): modal con `role="dialog"`, `aria-labelledby`, `aria-describedby`. Mensajes localizados por `error_code` (`ITEM_HAS_COMMITMENT`, `ITEM_HAS_PENDING_INTENT`, `ITEM_HAS_PAID_AMOUNT`).
* `BudgetItemsTable` (extensión de US-035): añadir botones "Editar"/"Eliminar" por fila, badge advisory cuando `paid > committed` o `paid > planned`.

### Forms

* RHF + Zod en cliente, espejando los schemas backend.
* Mensajes de error localizados; map de `error_code` → copy i18n.

### State Management

* Hooks de mutación con TanStack:
  * `useCreateBudgetItem(eventId)`.
  * `useUpdateBudgetItem(eventId)`.
  * `useDeleteBudgetItem(eventId)`.
* Cada hook ejecuta `mutationFn` que llama a `budgetApi.items.*`, y en `onSuccess` invoca:
  ```ts
  queryClient.invalidateQueries({ queryKey: ['event', eventId, 'budget'] });
  ```
* Manejo opcional de optimistic updates (decisión menor del implementador; el invalidate es suficiente para MVP).

### Data Fetching

* Extensión de `apps/web/lib/api/budgetApi.ts`:
  * `items.create(eventId, body)`.
  * `items.update(eventId, itemId, body)`.
  * `items.delete(eventId, itemId)`.

### Loading / Empty / Error / Success States

* **Loading**: spinner en botón "Guardar"; `aria-busy="true"`.
* **Empty**: cubierto por `EmptyBudgetState` de US-035.
* **Error**: toast + mensaje inline cerca del campo con `aria-live="polite"`. Modal de DELETE muestra copy específico cuando 409.
* **Success**: toast de éxito, tabla actualizada vía invalidación.

### Accessibility

* `role="dialog"` + `aria-labelledby`/`aria-describedby` en modales.
* `aria-invalid` en inputs con error.
* `aria-live="polite"` para anuncios de error y éxito.
* Foco preservado tras error (AC-09).
* Contraste AA en botones y badges.

### i18n

* Claves nuevas en `messages/<locale>.json`:
  * `budget.item.add_cta`, `budget.item.edit_cta`, `budget.item.delete_cta`.
  * `budget.item.field.{category,label,planned,paid}`.
  * `budget.item.error.{INVALID_FIELD,INVALID_VALUE,ITEM_NOT_FOUND,ITEM_HAS_COMMITMENT,ITEM_HAS_PENDING_INTENT,ITEM_HAS_PAID_AMOUNT,ITEM_HAS_COMMITMENT_CATEGORY_LOCKED,EVENT_NOT_EDITABLE,UNAUTHORIZED,FORBIDDEN}`.
  * `budget.item.advisory.{paid_gt_committed,paid_gt_planned}`.

---

## 9. API Contract Design

| Method | Endpoint                                                | Purpose                                                | Auth Required | Request                                                                  | Response                                                                                       | Error Cases                                                                                                                                  |
| ------ | ------------------------------------------------------- | ------------------------------------------------------ | ------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/api/v1/events/:eventId/budget/items`                   | Crear item                                              | Sí (cookie)   | Body: `{ service_category_id, label?, planned, paid? }` (Zod estricto)    | `201 { BudgetItemDto }`                                                                        | 400 `INVALID_FIELD`/`INVALID_VALUE`/`INVALID_PARAMS`; 401; 403; 404; 409 `EVENT_NOT_EDITABLE`                                                |
| PATCH  | `/api/v1/events/:eventId/budget/items/:itemId`           | Editar item                                             | Sí            | Body: `{ planned?, paid?, service_category_id?, label? }` (Zod estricto)   | `200 { BudgetItemDto }`                                                                        | 400 (`INVALID_FIELD` para `committed`); 401; 403; 404 `ITEM_NOT_FOUND`; 409 `EVENT_NOT_EDITABLE` / `ITEM_HAS_COMMITMENT_CATEGORY_LOCKED`     |
| DELETE | `/api/v1/events/:eventId/budget/items/:itemId`           | Soft delete                                             | Sí            | Sin body                                                                  | `204`                                                                                          | 401; 403; 404 `ITEM_NOT_FOUND`; 409 `EVENT_NOT_EDITABLE` / `ITEM_HAS_COMMITMENT` / `ITEM_HAS_PENDING_INTENT` / `ITEM_HAS_PAID_AMOUNT`        |

### Documentation Alignment Required

Actualizar `docs/16 §M06 Budget` con:
* Request bodies (`createBudgetItemBodySchema`, `updateBudgetItemBodySchema`).
* Response shape (`BudgetItemDto`).
* Catálogo de errores extendido con los códigos nuevos.

Snapshot OpenAPI por US-098 (Future).

---

## 10. Database / Prisma Design

### Models Impacted (R1 — schema real, `backend/prisma/schema.prisma:492-512`)

* `BudgetItem` (existente): `id`, `budgetId`, `label`, `categoryCode: String?` (string libre, sin FK), `amountPlanned` (`Decimal @default(0)`), `amountCommitted` (`Decimal @default(0)`), `isSeed`, `createdAt`, `updatedAt`. **No** hay `deletedAt`/`deletedBy`/`paid`/`aiGenerated`/`serviceCategoryId` (FK).
* `Budget` (existente): `totalPlanned`/`totalCommitted` materializados; se recalculan en la misma transacción de cada mutación (BLK-E).
* `BookingIntent` (solo lectura): `serviceCategoryId` (FK a `ServiceCategory`), `status: BookingIntentStatus @default(pending)`. Cross-module viable.
* `ServiceCategory` (solo lectura): `code @unique`, `isActive`, `deletedAt`. Whitelist para `category_code`.

### Fields / Columns

Sin nuevos campos. R1 diferido a US paralela P2: `deletedAt`, `deletedBy`, `paid`, `aiGenerated`, `serviceCategoryId` (FK).

### Relations

Sin cambios. `BudgetItem.budgetId → Budget.id` (Cascade). Sin FK entre `BudgetItem` y `ServiceCategory` — la validación se hace por whitelist de `code`.

### Indexes

Reuso íntegro. `booking_intents.serviceCategoryId` y `booking_intents.eventId` ya indexados (schema:616-617). `service_categories.code` unique (schema:246). Sin nuevos índices.

### Constraints

Sin cambios. Múltiples items por categoría permitidos (D5) — sigue siendo cierto trivialmente porque `categoryCode` es `String?` sin unique constraint.

### Migrations Impact

**Ninguna** (R1).

### Seed Impact

* Reuso del seed entregado por US-035 + PB-P1-013/16.
* Recomendado: garantizar que el seed cubre al menos un item con `committed > 0`, uno con `BookingIntent.pending`, y uno con `paid > 0` para demoar los bloqueos. Si faltan, ajuste en SEED-task de este desglose.

---

## 11. AI / PromptOps Design

No aplica — esta historia no invoca IA directamente.

`ai_generated` se preserva server-side en PATCH/DELETE; el cliente no puede modificarlo (Zod estricto).

---

## 12. Security & Authorization Design

### Authentication

* HTTP-only cookies (middleware `authRequired`).

### Authorization

* `OrganizerRoleGuard`, `EventOwnershipPolicy`, `adminExclusionGuard` (reuso íntegro).

### Ownership Rules

* `EventOwnershipPolicy.assertOwner(eventId, currentUser.id)` se ejecuta antes de leer cualquier dato sensible.

### Role Rules

* Vendor → 403.
* Admin → 403.
* Sin sesión → 401.

### Negative Authorization Scenarios

| Escenario                                          | Resultado                              |
| -------------------------------------------------- | -------------------------------------- |
| Sin sesión                                         | 401                                    |
| Owner del evento                                   | 200/201/204                            |
| Otro organizer                                     | 404 (no-revelación)                    |
| Vendor                                             | 403                                    |
| Admin                                              | 403                                    |
| `eventId`/`itemId` no UUID                         | 400 `INVALID_PARAMS`                   |
| Item soft-deleted                                  | 404 `ITEM_NOT_FOUND`                   |
| Item de otro evento                                | 404 `ITEM_NOT_FOUND` (anti-IDOR)       |
| `event.status` no editable                         | 409 `EVENT_NOT_EDITABLE`               |

### Audit Requirements

* No es acción admin; no requiere `AdminAction`.
* Logs estructurados `budget.item.{created,updated,deleted}` con código de error cuando aplica.

### Sensitive Data Handling

* No expone PII.
* `userId` opaco.
* Montos numéricos en logs (atributos auditables).

---

## 13. Testing Strategy

### Unit Tests

| ID    | Scenario                                                                                       | Layer    |
| ----- | ---------------------------------------------------------------------------------------------- | -------- |
| UT-01 | `createBudgetItemBodySchema` rechaza body con `committed`                                        | BE       |
| UT-02 | `updateBudgetItemBodySchema` rechaza body con `committed`                                        | BE       |
| UT-03 | `CreateBudgetItemUseCase` setea `committed=0`, `ai_generated=false`                              | BE       |
| UT-04 | `UpdateBudgetItemUseCase` preserva `ai_generated`                                                | BE       |
| UT-05 | `DeleteBudgetItemUseCase` bloquea con `committed > 0`                                            | BE       |
| UT-06 | `DeleteBudgetItemUseCase` bloquea con `paid > 0`                                                 | BE       |
| UT-07 | `DeleteBudgetItemUseCase` bloquea con BookingIntent.pending (mock del port)                      | BE       |
| UT-08 | `UpdateBudgetItemUseCase` bloquea cambio de categoría cuando `committed > 0`                     | BE       |
| UT-09 | Use cases bloquean en `event.status ∈ {'cancelled','completed'}`                                 | BE       |
| UT-10-FE | `useCreateBudgetItem` invalida `['event', eventId, 'budget']` tras éxito                       | FE       |
| UT-11-FE | `BudgetItemsTable` muestra badge advisory cuando `paid > committed`                            | FE       |

### Integration Tests

| ID    | Scenario                                                                                       | Layer       |
| ----- | ---------------------------------------------------------------------------------------------- | ----------- |
| IT-01 | POST happy path → 201 + item creado                                                              | BE + DB     |
| IT-02 | PATCH happy path → 200 + campos actualizados                                                     | BE + DB     |
| IT-03 | DELETE happy path → 204 + soft delete persistido                                                 | BE + DB     |
| IT-04 | PATCH con `committed` → 400 `INVALID_FIELD`                                                       | BE + API    |
| IT-05 | DELETE con `committed > 0` → 409 `ITEM_HAS_COMMITMENT`                                            | BE + DB     |
| IT-06 | DELETE con `paid > 0` → 409 `ITEM_HAS_PAID_AMOUNT`                                                | BE + DB     |
| IT-07 | DELETE con BookingIntent.pending → 409 `ITEM_HAS_PENDING_INTENT`                                  | BE + DB (cross-module) |
| IT-08 | PATCH cambia categoría con `committed > 0` → 409                                                  | BE + DB     |
| IT-09 | POST en evento `cancelled` → 409 `EVENT_NOT_EDITABLE`                                             | BE + DB     |
| IT-10 | POST en evento `completed` → 409                                                                  | BE + DB     |
| IT-11 | Soft-deleted item NO aparece en `GET /budget` (US-035)                                            | BE + DB (regresión) |
| IT-12 | Item de otro evento → 404                                                                         | BE + DB     |
| IT-13 | Múltiples items por categoría permitidos                                                          | BE + DB     |

### API Tests

Cubiertos por Integration Tests (Supertest).

### E2E Tests

| ID    | Scenario                                                                                       | Tipo       |
| ----- | ---------------------------------------------------------------------------------------------- | ---------- |
| E2E-01 | Organizer crea item → tabla US-035 refresca                                                    | Playwright |
| E2E-02 | Organizer edita planned/paid inline → cache invalidado                                          | Playwright |
| E2E-03 | Organizer intenta DELETE con commitment → ve copy localizado del 409                            | Playwright |
| E2E-04 | Warnings advisory aparecen cuando `paid > committed`                                            | Playwright |

### Security Tests

| ID         | Scenario                                  | Expected             |
| ---------- | ----------------------------------------- | -------------------- |
| SEC-T-01   | Sin sesión                                | 401                  |
| SEC-T-02   | Organizer A vs evento de B                | 404                  |
| SEC-T-03   | Vendor                                    | 403                  |
| SEC-T-04   | Admin                                     | 403                  |
| SEC-T-05   | `eventId`/`itemId` no UUID                | 400 `INVALID_PARAMS` |
| SEC-T-06   | Item de otro evento (anti-IDOR cruzado)   | 404                  |

### Accessibility Tests

| ID       | Scenario                                                                                  | Tipo                        |
| -------- | ----------------------------------------------------------------------------------------- | --------------------------- |
| A11Y-01  | Modal `Add` con `role="dialog"`, focus trap, ESC para cerrar                               | @testing-library + jest-axe |
| A11Y-02  | Inline edit anuncia errores con `aria-live`                                                | jest-axe                    |
| A11Y-03  | Modal `Delete` con copy localizado y `aria-describedby`                                    | jest-axe                    |

### AI Tests

No aplica.

### Seed / Demo Tests

| ID         | Scenario                                                                                  | Tipo    |
| ---------- | ----------------------------------------------------------------------------------------- | ------- |
| SEED-T-01  | Seed cubre escenarios de bloqueo (committed > 0, paid > 0, pending intent) para demo       | Vitest  |

### Performance Tests

| ID      | Scenario                                                                                  | Expected             |
| ------- | ----------------------------------------------------------------------------------------- | -------------------- |
| PERF-01 | POST/PATCH/DELETE con dataset de 30 items                                                  | P95 < 1.5 s          |

### Contract Tests

| ID           | Scenario                                                                | Expected                                |
| ------------ | ----------------------------------------------------------------------- | --------------------------------------- |
| CONTRACT-01  | Request/response shapes y catálogo de errores vs OpenAPI snapshot        | Match exacto (handoff a US-098)         |

### CI Checks

* Vitest (unit + integration) verde.
* Playwright (E2E) verde sobre seed de demo.
* Cobertura ≥ 50% en módulo `budget` (consistente con MVP §12.4).
* Lint, typecheck y build sin errores.

---

## 14. Observability & Audit

### Logs

* `budget.item.created`, `budget.item.updated`, `budget.item.deleted` (definidos en §7).
* Sin PII; montos como atributos numéricos auditables.

### Correlation ID

* Heredado del middleware global.

### AdminAction

No aplica.

### Error Tracking

* Errores de dominio se logguean con `error_code` y `correlationId`. Errores 5xx capturan stack truncado.

### Metrics

* Reuso del histogram existente. Sin métricas nuevas.

---

## 15. Seed / Demo Data Impact

### Seed Data Required

* Recomendado garantizar al menos:
  * 1 item con `committed > 0` (para demoar 409 `ITEM_HAS_COMMITMENT`).
  * 1 item con `BookingIntent.pending` (puede vivir en seed de US-039 si no está aún disponible; si no, mockear en E2E).
  * 1 item con `paid > 0` (para demoar 409 `ITEM_HAS_PAID_AMOUNT`).

### Demo Scenario Supported

* CRUD completo end-to-end con UI.
* Bloqueos visibles con copy localizado.
* Warnings advisory cuando `paid > committed`.

### Reset / Isolation Notes

Sin notas adicionales.

---

## 16. Documentation Alignment Required

| Document / Source                                            | Conflict                                                                                                          | Current Decision                                                                                            | Recommended Action                                                                                                                              | Blocks Implementation? |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| `docs/8 §UC-BUDGET-002 §E2`                                   | Solo bloquea `cancelled`; D3 extiende a `completed`.                                                              | D3 (decision resolution US-036).                                                                            | Añadir nota interpretativa a `UC-BUDGET-002 §E2` o crear ADR. No bloquea.                                                                       | No                     |
| `docs/16-API-Design-Specification.md §M06` / `§error format` | Faltan request/response shapes y nuevos `error_code` (`INVALID_FIELD`, `ITEM_HAS_PENDING_INTENT`, etc.).            | D1, D2, D3, D5.                                                                                              | Actualizar `docs/16 §M06` y `§error format`. Snapshot OpenAPI por US-098. No bloquea.                                                            | No                     |
| `docs/10-Non-Functional-Requirements.md`                      | Algunas US usan `NFR-PERF-API-001` (ID inexistente).                                                              | `NFR-PERF-001`.                                                                                              | Housekeeping en backlog. Ya alineado en US-032/033/035.                                                                                          | No                     |

---

## 17. Technical Risks & Mitigations

| Risk                                                                                                          | Impact                                          | Mitigation                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Acoplamiento de `modules/budget` con `modules/booking` para el cross-module check rompe la hexagonalidad.       | Mantenimiento complejo, dependencias circulares. | Definir `BookingIntentReadPort` en `modules/budget` (interface) y adaptador en `modules/booking`. Sin imports cruzados directos.            |
| Si en el futuro se materializan `total_planned`/`total_committed` en `Budget`, las mutaciones de items pueden derivar drift. | Summary de US-035 inconsistente.                 | Mantener cálculo live en MVP (US-035 ya lo hace). Si se materializa, envolver mutaciones en `prisma.$transaction`.                          |
| Last-write-wins en concurrencia puede sobrescribir cambios entre pestañas.                                       | UX confuso.                                     | Documentado en EC-08 de la US. Locking optimista queda Out of Scope (Future). UI puede refetch antes de submit para mitigar (no obligatorio). |
| Cross-module query agrega latencia al DELETE.                                                                  | P95 puede aumentar.                              | El dataset de `booking_intents` es pequeño en MVP; índice opcional `(event_id, service_category_id, status)` si PERF-01 falla.              |
| Internacionalización de error_codes puede quedar desactualizada respecto al catálogo backend.                    | UX confuso.                                     | Tests E2E con cada `error_code` y mapeo i18n explícito en `messages/<locale>.json`.                                                          |

---

## 18. Implementation Guidance for Coding Agents

### Archivos / Carpetas probablemente impactadas

**Backend** (`backend/`) — R1 paths reconciliados:

* `src/modules/budget-management/dto/create-budget-item.body.ts` — **nuevo**.
* `src/modules/budget-management/dto/update-budget-item.body.ts` — **nuevo**.
* `src/modules/budget-management/infrastructure/prisma-budget-item-write.repository.ts` — **nuevo**.
* `src/modules/budget-management/ports/booking-intent-read.port.ts` — **nuevo** (interface).
* `src/modules/budget-management/ports/service-category-read.port.ts` — **nuevo** (interface).
* `src/modules/booking-intent/infrastructure/prisma-booking-intent-read.adapter.ts` — **nuevo** (adapter).
* `src/modules/service-catalog/infrastructure/prisma-service-category-read.adapter.ts` — **nuevo** (adapter).
* `src/modules/budget-management/application/create-budget-item.use-case.ts` — **nuevo**.
* `src/modules/budget-management/application/update-budget-item.use-case.ts` — **nuevo**.
* `src/modules/budget-management/application/delete-budget-item.use-case.ts` — **nuevo**.
* `src/modules/budget-management/application/budget-item-telemetry.ts` — **nuevo**.
* `src/modules/budget-management/interface/http/create-budget-item.controller.ts` — **nuevo**.
* `src/modules/budget-management/interface/http/update-budget-item.controller.ts` — **nuevo**.
* `src/modules/budget-management/interface/http/delete-budget-item.controller.ts` — **nuevo**.
* `src/modules/budget-management/interface/http/budget-item-mutation.routes.ts` — **nuevo**.
* `src/shared/domain/errors/*` — reuso; nuevos errores tipados en el módulo (`item-has-commitment.error.ts`, `item-has-pending-intent.error.ts`, `item-has-commitment-category-locked.error.ts`, `event-not-editable.error.ts`).
* `src/app.ts` — **registrar** el router bajo `/api/v1`.
* `tests/unit/us036-*.spec.ts` — **nuevo**.
* `tests/api/us036-*.spec.ts` — **nuevo**.

**Frontend** (`web/`) — R1 paths reconciliados:

* `src/features/events/components/budget/AddBudgetItemModal.tsx` — **nuevo**.
* `src/features/events/components/budget/EditBudgetItemRow.tsx` — **nuevo**.
* `src/features/events/components/budget/DeleteBudgetItemDialog.tsx` — **nuevo**.
* `src/features/events/components/budget/BudgetItemsTable.tsx` — **extender**.
* `src/features/events/hooks/useCreateBudgetItem.ts` — **nuevo**.
* `src/features/events/hooks/useUpdateBudgetItem.ts` — **nuevo**.
* `src/features/events/hooks/useDeleteBudgetItem.ts` — **nuevo**.
* `src/features/events/api/budgetApi.ts` — **extender** con `items.{create,update,delete}`.
* `src/shared/i18n/messages/{es-LATAM,es-ES,pt,en}.json` — **añadir** claves `budget.item.*`.

**Documentación**:

* `docs/8-Use-Cases-Specification.md §UC-BUDGET-002 §E2` — nota interpretativa (DOC, no bloqueante).
* `docs/16-API-Design-Specification.md §M06` y `§error format` — request/response + nuevos códigos (DOC, no bloqueante).

### Orden recomendado de implementación

1. Backend foundations: DTOs Zod (createBudgetItemBodySchema, updateBudgetItemBodySchema) → port `BookingIntentReadPort` → adapter en `modules/booking`.
2. Backend repository: `BudgetItemWriteRepository` + extensión del `BudgetReadRepository` (filtro soft delete).
3. Use cases en orden: Create → Update → Delete (Delete depende del port).
4. Controller + rutas.
5. Logger estructurado.
6. Frontend: API client → hooks → componentes → integración con `BudgetItemsTable` → i18n.
7. Tests por capa: UT → IT (incluye SEC-T) → A11Y → E2E → PERF → CONTRACT.
8. Documentación (housekeeping al final).

### Decisiones que no deben reabrirse

* D1: `committed` no editable (Zod estricto).
* D2: soft delete con tres bloqueos.
* D3: bloqueo en `cancelled` y `completed`.
* D4: sin cross-constraint `paid ≤ committed` server-side.
* D5: `service_category_id` editable solo si `committed = 0`.

### Qué NO debe implementarse

* Endpoints batch.
* Mutación de `committed` o `ai_generated`.
* Hard delete.
* Locking optimista (Future).
* Materialización de totales (postergable; mantener cálculo live).

### Asunciones a preservar

* Schema de PB-P0-001 incluye `deleted_at`, `deleted_by` en `budget_items`.
* `BudgetReadRepository` de US-035 puede extenderse con filtro soft delete sin breaking changes.
* `modules/booking` puede exponer un adaptador de lectura sin acoplar `modules/budget` a su implementación interna.

---

## 19. Task Generation Notes

### Suggested Task Groups

| Grupo | Cantidad estimada | Notas                                                                                                                                                   |
| ----- | :---------------: | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DB    | 0                 | Sin migraciones; no requiere verificación SQL adicional sobre US-035.                                                                                    |
| BE    | 7                 | DTOs (2), port (1), repository write (1), 3 use cases (3), controller + rutas (1). El número final puede compactar 2 DTOs en 1 tarea.                  |
| API   | 0                 | Cubierto por BE-controller.                                                                                                                              |
| SEC   | 0                 | Reuso íntegro; pruebas SEC en QA.                                                                                                                       |
| OBS   | 1                 | Logger estructurado.                                                                                                                                    |
| FE    | 7                 | API client, 3 hooks, 3 componentes, integración con BudgetItemsTable, i18n.                                                                              |
| SEED  | 1                 | Verificación de seed (committed > 0, paid > 0, pending intent).                                                                                          |
| QA    | 7                 | UT, IT (incluye SEC-T y regresión soft delete), A11Y, E2E, PERF, CONTRACT, SEED test.                                                                   |
| AI    | 0                 | No aplica.                                                                                                                                              |
| OPS   | 0                 | Sin cambios de pipeline.                                                                                                                                |
| DOC   | 2                 | `docs/8 §UC-BUDGET-002`, `docs/16 §M06` + `§error format`.                                                                                                |

**Total estimado**: ~25 tareas (ajustable según granularidad de DTO + use cases).

### Required QA Tasks

* Unit tests de schemas Zod + use cases (incluyendo bloqueos).
* Integration con BD para CRUD + soft delete + cross-module check.
* SEC-T para auth/autorización + anti-IDOR.
* PERF-01.
* A11Y para modales e inline edit.
* E2E del ciclo CRUD + bloqueos visibles.
* Contract test contra OpenAPI snapshot.
* Seed test.

### Required Security Tasks

Sin tareas dedicadas: reuso íntegro. Las pruebas viven en QA-IT/SEC-T.

### Required Seed / Demo Tasks

* Verificar/garantizar seed con escenarios de bloqueo.

### Required Documentation Tasks

* DOC-01: `docs/8 §UC-BUDGET-002 §E2` extender con `completed`.
* DOC-02: `docs/16 §M06` y `§error format` con shapes y nuevos códigos.

### Dependencies Between Tasks

```
DTOs (BE-001) → Repository write (BE-002) ──┐
Port + Adapter (BE-003) ───────────────────┤
                                            ├─→ UseCase Create (BE-004)
                                            ├─→ UseCase Update (BE-005)
                                            └─→ UseCase Delete (BE-006)
                                                  └─→ Controller + Routes (BE-007)
                                                        ├─→ Logger (OBS-001)
                                                        ├─→ FE API client (FE-001)
                                                        │     ├─→ Hooks (FE-002..004)
                                                        │     │     └─→ Componentes (FE-005..007)
                                                        │     │           └─→ Integración BudgetItemsTable (FE-008)
                                                        │     └─→ i18n (FE-009)
                                                        └─→ QA-01..07
SEED-01 (paralelo)
DOC-01, DOC-02 (paralelos, no bloquean)
```

### Consolidated `tasks.md` para el Backlog Item

Sí, al cerrar US-036 conviene generar `management/development-tasks/P1/PB-P1-020/tasks.md` que liste US-035 + US-036 end-to-end.

---

## 20. Technical Spec Readiness

| Check                                                       | Status |
| ----------------------------------------------------------- | ------ |
| User Story approved or explicitly allowed for draft spec    | Pass   |
| Product Backlog mapping found                               | Pass   |
| Decision Resolution reviewed if present                     | Pass   |
| Scope clear                                                 | Pass   |
| Architecture alignment clear                                | Pass   |
| API impact clear                                            | Pass   |
| DB impact clear                                             | Pass   |
| AI impact clear                                             | N/A    |
| Security impact clear                                       | Pass   |
| Testing strategy clear                                      | Pass   |
| Ready for Development Task Breakdown                        | Yes    |

---

## 21. Final Recommendation

`Ready for Task Breakdown` (Revision R1)

US-036 extiende el módulo `modules/budget-management` (R1) entregado por US-035 con tres use cases write, un repositorio write, dos ports (`BookingIntentReadPort`, `ServiceCategoryReadPort`), y tres controllers para `POST/PATCH/DELETE`. R1 aplica hard delete (schema real no tiene `deleted_at` en `BudgetItem`) con bloqueos por `amount_committed > 0` y `BookingIntent.pending`. Todas las mutaciones se envuelven en `prisma.$transaction` para mantener consistentes los totales denormalizados de `Budget` (BLK-E, compromiso R1 US-035). Sin migraciones, sin endpoints nuevos fuera del catálogo M06, sin LLMProvider.

---

## 22. Revision R1 — 2026-07-14 (Schema alignment)

Durante la ejecución (execution record `management/workflows/development-execution/P1/PB-P1-020/US-036-execution.md`) se detectaron 6 hallazgos materiales entre la Tech Spec original y el schema Prisma real. Se aplica **Opción A** (paridad con R1 de US-035, sin migraciones):

### Cambios normativos

1. **Contrato de body reducido** — R1 elimina del contrato MVP: `paid`, `ai_generated`, `service_category_id` (FK). Nuevo shape en §7 DTOs. `paid_total` y warnings advisory `paid > *` (D4) quedan N/A.
2. **`category_code`** — string libre (no FK) validado contra whitelist `ServiceCategory.code WHERE is_active = true AND deleted_at IS NULL` (patrón `us019-*`).
3. **DELETE es hard delete** — el schema `BudgetItem` (`schema.prisma:492-512`) **no** declara `deletedAt`/`deletedBy`. Es una decisión intencional del ADR-DB-004 (`BudgetItem` no está en los 7 modelos con soft delete). Auditoría de DELETE se preserva vía log estructurado `budget.item.deleted` con snapshot completo del item eliminado + PostgreSQL WAL/point-in-time recovery. Bloqueos activos: `amount_committed > 0` y `BookingIntent.pending`. Bloqueo `paid > 0` (AC-05 segunda cláusula) queda N/A.
4. **Transacción obligatoria de totales** — BLK-E: todas las mutaciones se envuelven en `prisma.$transaction` para recomputar `Budget.totalPlanned`/`totalCommitted` en la misma operación. Compromiso R1 US-035.
5. **Módulo real** — paths reconciliados a `backend/src/modules/budget-management/**` y `web/src/features/events/**`.
6. **Cross-module** — `DeleteBudgetItemUseCase` resuelve `categoryCode → ServiceCategory.id → BookingIntent.findMany({...pending})`. Si `categoryCode = null` o no matchea whitelist, el check se omite (no hay `BookingIntent` posible sin FK válida). Documented edge case.

### Impacto en User Story y Tasks File

* `AC-01`, `AC-02`, `AC-03` reescritos con el nuevo shape.
* `AC-05` reducido a un solo bloqueo (`BookingIntent.pending`).
* `AC-07` warnings advisory `paid > *` marcados N/A.
* `EC-03` (DELETE con `paid > 0`), `EC-04` (soft-deleted filtrado en US-035), `EC-09` (item soft-deleted → 404) marcados N/A.
* `VR-02` (paid ≥ 0), `VR-09` (soft-deleted → 404) marcados N/A.
* `D2` reformulado: soft delete → hard delete; 2 bloqueos en vez de 3.
* `D4` marcado N/A (sin `paid`).
* `UT-06` (paid > 0), `IT-06` (paid > 0), `IT-11` (regresión soft delete en US-035) marcados N/A.
* Deuda registrada: adición futura de `paid`, `ai_generated`, FK `service_category_id`, soft delete queda como **misma US paralela P2** ya prevista en R1 de US-035.

### Aprobación

Autorizado por el usuario en la sesión del 2026-07-14 tras diagnóstico del execution record y análisis de las 3 opciones. PO/BA debe reconfirmar formalmente antes de merge (paquete combinado con R1 US-035).
