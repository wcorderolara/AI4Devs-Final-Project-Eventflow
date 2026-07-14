# 🧾 User Story: Crear, editar y eliminar BudgetItem por categoría

## 🆔 Metadata

| Field              | Value                                              |
| ------------------ | -------------------------------------------------- |
| ID                 | US-036                                             |
| Epic               | EPIC-BUD-001 — Budget Management & Currency        |
| Backlog Item       | PB-P1-020                                          |
| Feature            | CRUD de BudgetItems                                |
| Module / Domain    | Budget                                             |
| User Role          | Organizer                                          |
| Priority           | Must Have                                          |
| Status             | Approved with Minor Notes                          |
| Owner              | Product Owner / Business Analyst                   |
| Approved By        | PO/BA Review                                       |
| Approval Date      | 2026-06-27                                         |
| Ready for Development Tasks | Yes                                       |
| Sprint / Milestone | MVP                                                |
| Created Date       | 2026-06-09                                         |
| Last Updated       | 2026-07-14                                         |
| Revision R1        | 2026-07-14 — Alineación con schema real (Opción A). Ver §Notes. |

---

## 🎯 User Story

**As an** organizador
**I want** crear, editar y eliminar items de mi presupuesto por categoría
**So that** mantenga el detalle de mi presupuesto vivo y controlado

---

## 🧠 Business Context

### Context Summary

US-036 entrega el surface de mutaciones del módulo Budget (UC-BUDGET-002). Cubre `POST/PATCH/DELETE /api/v1/events/:eventId/budget/items[/:itemId]` ya catalogados en `docs/16 §M06`. CRUD libre del usuario sobre `planned`, `paid`, `service_category_id` opcional y `label` opcional (`BR-BUDGET-009`). El campo `committed` es system-managed: se actualiza automáticamente al confirmar/cancelar `BookingIntent` (`BR-BUDGET-005`, `BR-BOOKING-008`); el endpoint PATCH lo rechaza con 400 si llega en el body. La eliminación es **soft delete**, con bloqueos por `committed > 0`, `BookingIntent.pending` y `paid > 0`. Los items soft-deleted se filtran del listado y de los agregados expuestos por US-035. Las mutaciones se bloquean en eventos `cancelled` y `completed`. Cada mutación invalida la query key TanStack `['event', eventId, 'budget']` consumida por US-035.

### Related Domain Concepts

* `BudgetItem` (entidad principal).
* `Budget` (relación N:1).
* `ServiceCategory` (relación N:1; sin unicidad por `(budget, category)`).
* `BookingIntent` (cross-module: pending → bloquea DELETE; confirmed → ancla categoría y `committed`).
* `ai_generated` (preservado; no editable manualmente).

### Assumptions

* `paid` permanece nullable en BD (BR-BUDGET-002); US-035 normaliza `null → 0` en serialización (D3 de US-035).
* `ai_generated = false` en creación manual (POST); preservado en PATCH/DELETE.
* Múltiples `BudgetItem` por categoría permitidos (alineado con domain model 1:N y `BR-BUDGET-009`).
* El estado del evento es source-of-truth para edición; mutaciones solo en `draft`/`active`.

### Dependencies

* US-035 — vista del presupuesto (consumidora de la query key invalidable).
* PB-P1-020 — backlog item padre.
* US-038/US-039 — sync de `committed` por confirmación/cancelación de `BookingIntent`.
* PB-P0-001 — schema base (`budget_items` con `deleted_at`, `deleted_by`).

### PO/BA Decisions Applied

| ID | Decisión                                                                                                                                                                                                                                                                                                                                                                                                       | Resolución |
| -- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| D1 | `committed` no editable en PATCH                                                                                                                                                                                                                                                                                                                                                                              | El Zod schema de PATCH NO acepta `committed`. Si llega en el body, se rechaza con 400 `INVALID_FIELD`. `committed` solo se actualiza por sync con BookingIntent (BR-BUDGET-005, BR-BOOKING-008).        |
| D2 | Política de DELETE                                                                                                                                                                                                                                                                                                                                                                                            | Soft delete (`deleted_at = NOW()`, `deleted_by`); 204 No Content. Bloqueos: `committed > 0` ⇒ 409 `ITEM_HAS_COMMITMENT`; `BookingIntent.pending` por `(event_id, service_category_id)` ⇒ 409 `ITEM_HAS_PENDING_INTENT`; `paid > 0` ⇒ 409 `ITEM_HAS_PAID_AMOUNT`. Items soft-deleted filtrados del listado y agregados de US-035. |
| D3 | Bloqueo de mutaciones en `cancelled` y `completed`                                                                                                                                                                                                                                                                                                                                                            | POST/PATCH/DELETE solo permitidos cuando `event.status ∈ {'draft','active'}`. Otros estados ⇒ 409 `EVENT_NOT_EDITABLE`. Consistencia con US-014 (cancelled read-only) y US-015 (completed read-only). |
| D4 | Regla `paid ≤ committed` eliminada                                                                                                                                                                                                                                                                                                                                                                            | Solo `paid ≥ 0`. UI muestra warnings advisory client-side cuando `paid > committed` o `paid > planned`; no bloquea backend.                                                                            |
| D5 | `service_category_id` editable + multi-items                                                                                                                                                                                                                                                                                                                                                                  | Editable solo cuando `committed = 0` ⇒ 409 `ITEM_HAS_COMMITMENT_CATEGORY_LOCKED` si `committed > 0`. Múltiples items por categoría permitidos; uso opcional de `label` para distinguir.                |

Referencia completa: `management/user-stories/decision-resolutions/US-036-decision-resolution.md`.

---

## 🔗 Traceability

| Source                 | Reference                                                                                                                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| FRD Requirement(s)     | FR-BUDGET-001 (1:1) · FR-BUDGET-003 (CRUD) · FR-BUDGET-007 (sin FX) · FR-BUDGET-008 (edición tras IA) · FR-BUDGET-006 (sync committed por BookingIntent)                              |
| Use Case(s)            | UC-BUDGET-002 (Gestionar ítems de presupuesto — CRUD)                                                                                                                                |
| Business Rule(s)       | BR-BUDGET-002 · BR-BUDGET-005 · BR-BUDGET-007 · BR-BUDGET-009 · BR-AI-008 · BR-BOOKING-007 (categoría unique en confirmed) · BR-BOOKING-008                                            |
| Permission Rule(s)     | Ownership (`Event.owner_id = currentUser.id`) · `OrganizerRoleGuard` · `adminExclusionGuard`                                                                                          |
| Data Entity / Entities | `BudgetItem` · `Budget` · `ServiceCategory` · `BookingIntent` (cross-module check)                                                                                                    |
| API Endpoint(s)        | `POST /api/v1/events/:eventId/budget/items` · `PATCH /api/v1/events/:eventId/budget/items/:itemId` · `DELETE /api/v1/events/:eventId/budget/items/:itemId` (consistente con docs/16 §M06) |
| NFR Reference(s)       | NFR-PERF-001 (P95 < 1.5 s endpoints no-IA)                                                                                                                                            |
| Related ADR(s)         | —                                                                                                                                                                                    |
| Related Document(s)    | `/docs/4 §BR-BUDGET-* §BR-BOOKING-007` · `/docs/6 §BudgetItem` · `/docs/8 §UC-BUDGET-002` · `/docs/9 §FR-BUDGET-*` · `/docs/10 §NFR-PERF-001` · `/docs/16 §M06` · `management/user-stories/US-035-view-edit-budget.md` |

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: In Scope
* MVP Relevance: Must Have

### Explicitly Out of Scope

* Bulk / batch updates de varios items (Future).
* Edición de `committed` (system-managed por BR-BUDGET-005).
* Hard delete de items (soft delete únicamente; mantenimiento técnico futuro consistente con BR-PRIVACY-011).
* Captura de tarjeta o pago real (BR-BOOKING-004).
* Workflow de aprobación interna multi-rol.
* Múltiples monedas / conversión FX (BR-BUDGET-007).
* Mutaciones desde US-035 (vista) — US-035 solo expone deeplinks a este surface.

### Scope Notes

* Una sola surface de mutación bajo `/budget/items/*`.
* Cada mutación invalida `['event', eventId, 'budget']` (handoff con US-035).
* Cross-module check de `BookingIntent.pending` por `(event_id, service_category_id)`.

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Crear item (R1)

**Given** un organizador autenticado dueño de un evento con `Budget` y `event.status ∈ {'draft','active'}`
**When** envía `POST /api/v1/events/:eventId/budget/items` con body `{ label: string, category_code?: string | null, amount_planned: number ≥ 0, amount_committed?: number ≥ 0 }`
**Then** el sistema crea el `BudgetItem` con `amount_committed = body.amount_committed ?? 0`. Recomputa `Budget.totalPlanned` y `Budget.totalCommitted` en la misma transacción. Responde `201 Created` con el item creado en shape R1 (`id`, `label`, `category_code`, `amount_planned`, `amount_committed`). La query key TanStack `['event', eventId, 'budget']` queda marcada para refetch.

### AC-02: Editar item (R1)

**Given** un item existente en un evento `draft`/`active`
**When** envía `PATCH /api/v1/events/:eventId/budget/items/:itemId` con body que incluye uno o más de `{ label?, category_code?, amount_planned? }`
**Then** el sistema actualiza los campos permitidos. `amount_committed` **NO** está permitido en el body — si llega (o cualquier campo extra), responde `400 INVALID_FIELD` (Zod `.strict()`). `category_code` solo es editable cuando `amount_committed = 0`; si `amount_committed > 0`, responde `409 ITEM_HAS_COMMITMENT_CATEGORY_LOCKED`. Si `category_code` no coincide con el whitelist activo, responde `400 INVALID_VALUE`. Recomputa totales del `Budget` en la misma transacción si `amount_planned` cambió. Responde `200 OK` e invalida el cache de US-035.

### AC-03: Eliminar item — hard delete (R1)

**Given** un item con `amount_committed = 0` y sin `BookingIntent.pending` para su `category_code`
**When** envía `DELETE /api/v1/events/:eventId/budget/items/:itemId`
**Then** el sistema **elimina el registro** (hard delete; el schema `BudgetItem` no declara `deletedAt`/`deletedBy` — decisión ADR-DB-004). Recomputa totales del `Budget` en la misma transacción. Emite log `budget.item.deleted` con snapshot completo del item (`label`, `category_code`, `amount_planned`, `amount_committed`) para auditoría. Responde `204 No Content`. El item desaparece del listado de US-035 y de `summary.total_planned`/`total_committed`. Cache invalidado.

### AC-04: Bloqueo DELETE por `amount_committed > 0` (R1)

**Given** un item con `amount_committed > 0`
**When** envía `DELETE`
**Then** responde `409 ITEM_HAS_COMMITMENT` con copy localizado sugiriendo cancelar primero el BookingIntent confirmado.

### AC-05: Bloqueo DELETE por `BookingIntent.pending` (R1)

**Given** un item con `amount_committed = 0`, con `category_code` que resuelve a una `ServiceCategory` activa que tiene ≥ 1 `BookingIntent.pending` en `(event_id, service_category_id)`
**When** envía `DELETE`
**Then** responde `409 ITEM_HAS_PENDING_INTENT`.

> **R1:** el bloqueo por `paid > 0` (AC-05 original, segunda cláusula) queda **N/A**. La columna `paid` no existe en el schema real (`BudgetItem`); diferido a US paralela P2.

> **R1 edge:** si `item.category_code = null` o no matchea ninguna `ServiceCategory.code` activa, el cross-module check se omite (no hay `BookingIntent` posible sin FK válida). El DELETE procede si los demás bloqueos no aplican.

### AC-06: Bloqueo en `cancelled` y `completed`

**Given** un evento con `status ∈ {'cancelled','completed'}`
**When** se invoca cualquier POST/PATCH/DELETE sobre `/budget/items/*`
**Then** responde `409 EVENT_NOT_EDITABLE` con detail del estado actual. La autorización ownership/rol sigue ejecutándose antes (401/403/404 mantienen su semántica habitual).

### AC-07: PATCH de `category_code` y warnings advisory (R1)

**Given** un item con `amount_committed = 0`
**When** PATCH cambia `category_code` a un código activo distinto (`ServiceCategory.code WHERE is_active = true AND deleted_at IS NULL`)
**Then** se actualiza correctamente.

**Given** un item con `amount_committed > amount_planned`
**When** se renderiza la tabla de US-035
**Then** la UI puede mostrar un badge advisory client-side (no bloqueante); el backend NO rechaza la mutación.

> **R1:** los warnings advisory sobre `paid > committed` / `paid > planned` (D4 original) quedan **N/A** — la columna `paid` no existe en el schema real.

### AC-08: Invalidación de cache TanStack

**Given** una mutación exitosa (POST/PATCH/DELETE) desde la UI
**When** TanStack Query procesa la respuesta
**Then** se ejecuta `queryClient.invalidateQueries({ queryKey: ['event', eventId, 'budget'] })`. El próximo render de US-035 refleja el estado actualizado.

### AC-09: A11Y del inline edit

**Given** una tabla `BudgetItemsTable` (US-035) con edición inline activa
**When** ocurre un error de validación (400/409)
**Then** el mensaje se anuncia vía `aria-live="polite"` cerca del campo afectado; el foco se mantiene en el campo origen del error.

### AC-10: Performance

**Given** un dataset de 30 items mixtos
**When** se mide cualquier mutación
**Then** P95 < 1.5 s (`NFR-PERF-001`).

---

## ⚠️ Edge Cases

### EC-01: DELETE con `committed > 0`
**Then** 409 `ITEM_HAS_COMMITMENT` (AC-04).

### EC-02: DELETE con `BookingIntent.pending`
**Then** 409 `ITEM_HAS_PENDING_INTENT` (AC-05).

### EC-03 (eliminada por R1)
> **N/A** en R1: la columna `paid` no existe en `BudgetItem`. Diferido a US paralela P2.

### EC-04 (eliminada por R1)
> **N/A** en R1: sin soft delete, el hard delete de US-036 elimina el registro y desaparece automáticamente del `GET /budget` (US-035). No requiere filtro adicional.

### EC-05: Evento `cancelled`
**Then** 409 `EVENT_NOT_EDITABLE` (AC-06).

### EC-06: Evento `completed`
**Then** 409 `EVENT_NOT_EDITABLE` (AC-06).

### EC-07: PATCH cambia `category_code` con `amount_committed > 0` (R1)
**Then** 409 `ITEM_HAS_COMMITMENT_CATEGORY_LOCKED` (AC-02).

### EC-08: Concurrencia (dos pestañas editando el mismo item)
**Given** dos clientes editan simultáneamente
**When** ambos envían PATCH
**Then** se aplica "last write wins"; ambas mutaciones reciben 200. El cache de US-035 se invalida en ambas. (Locking optimista queda Out of Scope para MVP).

### EC-09 (eliminada por R1)
> **N/A** en R1: sin soft delete. Un item hard-deleted retorna 404 `ITEM_NOT_FOUND` por su ausencia natural en la BD (no-revelación se preserva).

---

## 🚫 Validation Rules

| ID    | Rule                                                                              | Message / Behavior                                                          |
| ----- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| VR-01 | `amount_planned ≥ 0` (R1)                                                          | 400 `INVALID_VALUE` con detail "amount_planned must be ≥ 0"                  |
| VR-02 (N/A R1) | ~~`paid ≥ 0`~~                                                            | Columna no existe en R1. Diferido a US paralela P2.                          |
| VR-03 | `category_code` (si presente) existe en whitelist activa (R1)                       | 400 `INVALID_VALUE` con detail "category_code not found or inactive"        |
| VR-04 | `amount_committed`, `paid`, `ai_generated`, `service_category_id` NO editables (R1) | 400 `INVALID_FIELD` (Zod `.strict()`)                                        |
| VR-05 | `category_code` editable solo si `amount_committed = 0` (R1)                        | 409 `ITEM_HAS_COMMITMENT_CATEGORY_LOCKED`                                   |
| VR-06 | `eventId` y `itemId` UUID válidos                                                  | 400 `INVALID_PARAMS`                                                        |
| VR-07 | `itemId` pertenece al `budget` del `eventId` (anti-IDOR)                            | 404 `ITEM_NOT_FOUND` (no-revelación)                                        |
| VR-08 | Sin sesión válida                                                                  | 401 `UNAUTHORIZED`                                                          |
| VR-09 (N/A R1) | ~~Operaciones sobre items soft-deleted~~                                  | Sin soft delete en R1. Un item hard-deleted → 404 natural.                   |
| VR-10 | `event.status ∈ {'draft','active'}` para POST/PATCH/DELETE                          | 409 `EVENT_NOT_EDITABLE`                                                    |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                                                                                                  |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| SEC-01 | `EventOwnershipPolicy` + `OrganizerRoleGuard`. Solo el `owner` muta.                                                                                  |
| SEC-02 | `adminExclusionGuard`: admin → 403. Admin no muta presupuestos.                                                                                       |
| SEC-03 | No-revelación 404 ante recurso ajeno o inexistente.                                                                                                   |
| SEC-04 | `itemId` cross-event check (`item.budget.event_id = path.eventId`) para evitar IDOR cruzado.                                                          |
| SEC-05 | Logging estructurado sin PII; montos como atributos auditables (`docs/19 §logging policy`).                                                            |
| SEC-06 | Estado del evento (`event.status`) verificado en use case, NO en guard. Autorización 401/403/404 mantiene su semántica.                                |

### Negative Authorization Scenarios

* Sin sesión → 401.
* Organizer A muta evento de Organizer B → 404.
* Vendor → 403.
* Admin → 403.

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

* `ai_generated` se preserva en PATCH/DELETE; nunca lo edita el cliente. Cuando US-037 acepta una sugerencia IA, los items resultantes tienen `ai_generated = true`; en US-036 esa bandera no se invierte.

### AI Error / Fallback Behavior

* Not applicable for this story.

---

## 🎨 UX / UI Notes

| Area                | Notes                                                                                                              |
| ------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Screen / Route      | Pantalla budget (vista entregada por US-035, `/[locale]/organizer/events/:eventId/budget`).                         |
| Main UI Pattern     | Tabla `BudgetItemsTable` (US-035) con edición inline + modal "Agregar item" + modal de confirmación para DELETE.    |
| Primary Action      | "Agregar item" (botón sobre la tabla).                                                                              |
| Secondary Actions   | "Editar" inline por fila, "Eliminar" por fila (modal confirmación con copy localizado).                            |
| Empty State         | Cubierto por `EmptyBudgetState` de US-035 (CTAs a este surface).                                                    |
| Loading State       | Skeleton inline + `aria-busy="true"`.                                                                              |
| Error State         | Toast + mensaje inline cerca del campo afectado (`aria-live="polite"`).                                              |
| Success State       | Tabla actualizada vía invalidación TanStack; toast de éxito.                                                       |
| Accessibility Notes | Inputs etiquetados, `aria-invalid` en errores, foco preservado, contraste AA, modal con `role="dialog"`.            |
| Responsive Notes    | Mobile colapsa columnas: prioridad Categoría > Planned > Committed; Paid y label en expansor.                      |
| i18n Notes          | Locales: `es-LATAM` (default), `es-ES`, `pt`, `en`. Currency CLDR heredado de US-035.                              |
| Currency Notes      | Moneda heredada del evento (inmutable, BR-BUDGET-006). Sin conversión FX (BR-BUDGET-007).                          |

### Warnings advisory (D4)

* Cuando `paid > committed` o `paid > planned`, la fila muestra un badge advisory localizado (no bloquea ninguna acción).
* El warning advisory es solo client-side; el backend no expone flags adicionales.

---

## 🛠 Technical Notes

### Frontend

* Route / Page:
  * Pantalla budget (`apps/web/app/[locale]/organizer/events/[eventId]/budget/page.tsx`, entregada por US-035).
* Components:
  * `BudgetItemsTable` (US-035) — extender con edición inline.
  * `AddBudgetItemModal` — nuevo (RHF + Zod).
  * `EditBudgetItemRow` — nuevo (inline edit).
  * `DeleteBudgetItemDialog` — nuevo (modal de confirmación con manejo de 409).
* State Management:
  * `useEventBudget(eventId)` (US-035) se invalida tras cada mutación.
  * Hooks de mutación: `useCreateBudgetItem`, `useUpdateBudgetItem`, `useDeleteBudgetItem` con `mutationFn` que invoca `budgetApi.items.*`.
* Forms:
  * RHF + Zod (alineado con el schema backend para evitar drift).
* API Client:
  * `apps/web/lib/api/budgetApi.ts`:
    * `items.create(eventId, body)`
    * `items.update(eventId, itemId, body)`
    * `items.delete(eventId, itemId)`

### Backend

* Use Case / Service:
  * `CreateBudgetItemUseCase` — crea con `ai_generated = false`, `committed = 0`.
  * `UpdateBudgetItemUseCase` — actualiza `planned`, `paid`, `service_category_id?`, `label?`. Rechaza `committed`. Valida D5.
  * `DeleteBudgetItemUseCase` — soft delete con verificación de D2 (committed, pending intent, paid).
* Controller / Route:
  * `POST /api/v1/events/:eventId/budget/items`
  * `PATCH /api/v1/events/:eventId/budget/items/:itemId`
  * `DELETE /api/v1/events/:eventId/budget/items/:itemId`
* Authorization Policy:
  * `EventOwnershipPolicy` + `OrganizerRoleGuard` + `adminExclusionGuard`.
* Validation:
  * Zod schemas para body y path params; rechazo explícito de campos no permitidos.
* Transaction Required:
  * No para POST/PATCH (single update).
  * No para DELETE (single update).
  * Si se opta por materializar `total_planned`/`total_committed` en `Budget`, la actualización del agregado se hace en la misma transacción (decisión del Tech Spec).

### Database

* Main Tables:
  * `budget_items` (schema entregado por PB-P0-001 con `deleted_at`, `deleted_by`).
  * Cross-table check: `booking_intents` por `(event_id, service_category_id)` con `status = 'pending'`.
* Constraints:
  * `deleted_at` nullable (default null).
  * `BudgetItem.budget_id → Budget.id` (FK).
  * `BudgetItem.service_category_id → ServiceCategory.id` (FK).
  * Sin unique constraint `(budget_id, service_category_id)` — múltiples items por categoría permitidos (D5).
* Index Considerations:
  * Reuso de los índices entregados por PB-P0-001 (`budget_items.budget_id`).
  * Índice parcial recomendado para soft delete: `WHERE deleted_at IS NULL` (opcional; el Tech Spec decide tras `EXPLAIN ANALYZE`).

### API

| Method | Endpoint                                                | Purpose                                                       |
| ------ | ------------------------------------------------------- | ------------------------------------------------------------- |
| POST   | `/api/v1/events/:eventId/budget/items`                   | Crear item (`ai_generated=false`, `committed=0`).             |
| PATCH  | `/api/v1/events/:eventId/budget/items/:itemId`           | Editar `planned`/`paid`/`service_category_id?`/`label?`.        |
| DELETE | `/api/v1/events/:eventId/budget/items/:itemId`           | Soft delete con bloqueos (D2).                                |

#### Catálogo de errores (handoff Documentation Alignment)

* `400 INVALID_FIELD` — campo no editable (`committed`).
* `400 INVALID_VALUE` — `planned`/`paid` negativos.
* `400 INVALID_PARAMS` — UUIDs inválidos.
* `400 INVALID_VALUE` — `service_category_id` inexistente o inactiva.
* `401 UNAUTHORIZED`.
* `403 FORBIDDEN` — vendor o admin.
* `404 ITEM_NOT_FOUND` — recurso ajeno, soft-deleted o cross-event check fallido.
* `409 ITEM_HAS_COMMITMENT` — DELETE bloqueado por `committed > 0`.
* `409 ITEM_HAS_PENDING_INTENT` — DELETE bloqueado por BookingIntent.pending.
* `409 ITEM_HAS_PAID_AMOUNT` — DELETE bloqueado por `paid > 0`.
* `409 ITEM_HAS_COMMITMENT_CATEGORY_LOCKED` — PATCH cambia `service_category_id` con `committed > 0`.
* `409 EVENT_NOT_EDITABLE` — `event.status ∈ {'cancelled','completed'}`.

### Observability / Audit

* Correlation ID Required: Yes.
* Log Event Required: Sí — logs estructurados `budget.item.created`, `budget.item.updated`, `budget.item.deleted` con `eventId`, `userId`, `itemId`, `service_category_id`, `event_code` cuando aplica (en errores 409), `correlationId`, `duration_ms`. Sin PII.
* AdminAction Required: No.
* AIRecommendation Required: No.

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                                                  | Type        |
| ----- | ----------------------------------------------------------------------------------------- | ----------- |
| TS-01 | CRUD básico (POST → PATCH → DELETE) con happy path                                          | Integration |
| TS-02 | DELETE bloqueado por `committed > 0`                                                       | Integration |
| TS-03 | DELETE bloqueado por `BookingIntent.pending`                                               | Integration |
| TS-04 | DELETE bloqueado por `paid > 0`                                                            | Integration |
| TS-05 | Cache TanStack invalidado tras cada mutación                                               | E2E         |
| TS-06 | `ai_generated` preservado en PATCH/DELETE                                                  | Integration |
| TS-07 | Múltiples items por categoría permitidos                                                    | Integration |
| TS-08 | `paid > committed` aceptado por backend; UI muestra warning advisory                        | E2E         |
| TS-09 | Soft-deleted item filtrado de US-035 (vista y summary)                                      | Integration |
| TS-10 | PATCH cambia `service_category_id` cuando `committed = 0`                                   | Integration |

### Negative Tests

| ID    | Scenario                                                                                  | Expected Result                          |
| ----- | ----------------------------------------------------------------------------------------- | ---------------------------------------- |
| NT-01 | `planned` negativo                                                                        | 400 `INVALID_VALUE`                       |
| NT-02 | `service_category_id` inexistente                                                          | 400 `INVALID_VALUE`                       |
| NT-03 | Recurso ajeno                                                                              | 404 `ITEM_NOT_FOUND`                      |
| NT-04 | Sin sesión                                                                                 | 401                                       |
| NT-05 | Admin                                                                                      | 403                                       |
| NT-06 | `committed` en body PATCH                                                                  | 400 `INVALID_FIELD`                       |
| NT-07 | Mutación en evento `cancelled`                                                             | 409 `EVENT_NOT_EDITABLE`                  |
| NT-08 | Mutación en evento `completed`                                                             | 409 `EVENT_NOT_EDITABLE`                  |
| NT-09 | PATCH `service_category_id` con `committed > 0`                                            | 409 `ITEM_HAS_COMMITMENT_CATEGORY_LOCKED` |
| NT-10 | Acceso a item soft-deleted vía PATCH/DELETE                                                | 404 `ITEM_NOT_FOUND`                      |

### AI Tests

Not applicable for this story.

### Authorization Tests

| ID         | Scenario                              | Expected Result |
| ---------- | ------------------------------------- | --------------- |
| AUTH-TS-01 | Owner muta su evento                  | 200/201/204     |
| AUTH-TS-02 | Otro organizer muta evento ajeno      | 404             |
| AUTH-TS-03 | Vendor                                | 403             |
| AUTH-TS-04 | Admin                                 | 403             |
| AUTH-TS-05 | Sin sesión                            | 401             |

### Performance Tests

| ID      | Scenario                                                                                  | Expected               |
| ------- | ----------------------------------------------------------------------------------------- | ---------------------- |
| PERF-01 | POST/PATCH/DELETE con dataset de 30 items                                                  | P95 < 1.5 s (NFR-PERF-001) |

### Accessibility Tests

| ID       | Scenario                                                                                  | Expected                                  |
| -------- | ----------------------------------------------------------------------------------------- | ----------------------------------------- |
| A11Y-01  | Inline edit con anuncios de error vía `aria-live`                                          | jest-axe sin violaciones                  |
| A11Y-02  | Modal de confirmación con `role="dialog"`, `aria-labelledby`, `aria-describedby`            | jest-axe sin violaciones                  |
| A11Y-03  | Foco preservado tras error de validación                                                   | Focus permanece en el campo origen        |

### Contract Tests

| ID           | Scenario                                                                | Expected                                |
| ------------ | ----------------------------------------------------------------------- | --------------------------------------- |
| CONTRACT-01  | Request/response shapes y catálogo de errores vs OpenAPI snapshot        | Match exacto (handoff a US-098)         |

---

## 📊 Business Impact

| Field               | Value                                                                       |
| ------------------- | --------------------------------------------------------------------------- |
| KPI Affected        | Control fino del presupuesto; tasa de rectificación de items.                |
| Expected Impact     | Mejor gestión financiera del evento; auditoría preservada.                  |
| Success Criteria    | Cobertura ≥ 50% en TS/NT/PERF/A11Y; demo end-to-end CRUD funcional.          |
| Academic Demo Value | Demuestra CRUD financiero con bloqueos por integridad y soft delete.         |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks

* `AddBudgetItemModal`, `EditBudgetItemRow`, `DeleteBudgetItemDialog`.
* Hooks de mutación: `useCreateBudgetItem`, `useUpdateBudgetItem`, `useDeleteBudgetItem`.
* Extensión de `budgetApi.items.*`.
* Toast + mensajes inline con `aria-live`.
* Warnings advisory en filas con `paid > committed` / `paid > planned`.
* i18n: claves `budget.item.*` y mensajes de error 409 en 4 locales.

### Potential Backend Tasks

* `CreateBudgetItemUseCase`, `UpdateBudgetItemUseCase`, `DeleteBudgetItemUseCase`.
* Zod schemas para body POST/PATCH (rechazo de `committed`).
* `BudgetItemRepository` con métodos CRUD + soft delete + cross-event check.
* Cross-module query para BookingIntent.pending.
* Logs estructurados `budget.item.{created,updated,deleted}`.
* Verificación `event.status` en use cases.

### Potential Database Tasks

* Verificación de índices (PB-P0-001 ya entregó schema).
* Confirmar que `budget_items.deleted_at` está cubierto por índice o filtro parcial.

### Potential AI / PromptOps Tasks

* Not applicable for this story.

### Potential QA Tasks

* TS-01..10, NT-01..10, AUTH, PERF, A11Y, CONTRACT.

### Potential DevOps / Config Tasks

* Reuso del pipeline existente.

---

## ✅ Definition of Ready

* [x] Rol claro.
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
* [x] API definida.
* [x] Tests definidos.
* [x] PO/BA validó.

---

## 🏁 Definition of Done

* [ ] Funcional: POST/PATCH/DELETE responden los códigos definidos (200/201/204/400/401/403/404/409).
* [ ] Tests verdes: unit, integration, E2E, perf, a11y y contract.
* [ ] Cache TanStack `['event', eventId, 'budget']` invalidado tras cada mutación.
* [ ] Logs estructurados `budget.item.{created,updated,deleted}` emitidos sin PII.
* [ ] Bloqueos de DELETE (committed/pending/paid) y bloqueo por `event.status` verificados.
* [ ] i18n verificado en `es-LATAM`, `es-ES`, `pt`, `en`.
* [ ] Accesibilidad verificada (`aria-live`, modal `role="dialog"`, foco preservado).
* [ ] OpenAPI snapshot actualizado por US-098 (handoff).
* [ ] PO valida demo end-to-end (crear → editar → eliminar → bloqueo por commitment).

---

## 📝 Notes

### Revision R1 — 2026-07-14 (Schema alignment, Opción A)

* **Motivo:** el schema Prisma real (`BudgetItem`, `backend/prisma/schema.prisma:492-512`) no declara `deletedAt`/`deletedBy`/`paid`/`aiGenerated` ni FK `serviceCategoryId`. La decisión ADR-DB-004 excluye a `BudgetItem` de los 7 modelos con soft delete.
* **Cambios normativos aplicados:**
  - AC-01/02/03/04/05/07 reescritos con el shape R1 (`label`, `category_code`, `amount_planned`, `amount_committed`).
  - EC-03, EC-04, EC-09 marcados N/A.
  - VR-02, VR-09 marcados N/A.
  - D2 reformulado a **hard delete** con dos bloqueos (`amount_committed > 0` y `BookingIntent.pending`); auditoría vía log estructurado `budget.item.deleted` con snapshot pre-delete.
  - D4 marcado N/A (sin `paid`, no aplica cross-constraint).
  - Cross-module check para `BookingIntent.pending`: `categoryCode → ServiceCategory.id → BookingIntent.findMany`.
  - Transacción obligatoria para recomputar `Budget.totalPlanned/Committed` (compromiso R1 US-035).
* **Diferido a US paralela P2** (misma prevista por R1 de US-035): `paid`, `ai_generated`, FK `service_category_id`, soft delete.
* **Aprobación pendiente:** PO/BA debe reconfirmar formalmente antes de merge (paquete combinado con R1 US-035).

### Notas originales

* Bulk update de varios items queda Out of Scope (Future).
* La invalidación de cache hacia US-035 cierra el handoff de PB-P1-020.
* Documentation Alignment Required (no bloqueantes): extender `UC-BUDGET-002 §E2` con `completed`; actualizar `docs/16 §M06` y `§error format` con nuevos `error_code`; housekeeping de `NFR-PERF-001` en backlog.
* El cross-module check de `BookingIntent.pending` está documentado en el Tech Spec §7 R1 para mantener acoplamiento controlado entre `budget-management` y `booking-intent`.
