# Technical Specification — US-035: Ver mi presupuesto

## 1. Metadata

| Field                                | Value                                                                                                          |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| User Story ID                        | US-035                                                                                                         |
| Source User Story                    | `management/user-stories/US-035-view-edit-budget.md`                                                          |
| Decision Resolution Artifact         | `management/user-stories/decision-resolutions/US-035-decision-resolution.md`                                   |
| Priority                             | P1                                                                                                             |
| Backlog ID                           | PB-P1-020                                                                                                      |
| Backlog Title                        | Gestión de presupuesto + BudgetItems                                                                          |
| Backlog Execution Order              | 38 (P0: 18 items + P1: 20 items)                                                                               |
| User Story Position in Backlog Item  | 1 de 2 (US-035 → US-036)                                                                                       |
| Related User Stories in Backlog Item | US-035 (vista del presupuesto), US-036 (CRUD de BudgetItem)                                                    |
| Epic                                 | EPIC-BUD-001 — Budget Management & Currency                                                                    |
| Backlog Item Dependencies            | PB-P0-001 (schema base de `budget`/`budget_items`), PB-P1-006 (creación de evento y currency_code)             |
| Feature                              | Vista del presupuesto del evento                                                                                |
| Module / Domain                      | Budget                                                                                                         |
| User Story Status                    | Approved with Minor Notes                                                                                     |
| Backlog Alignment Status             | Found                                                                                                          |
| Technical Spec Status                | Ready for Task Breakdown                                                                                       |
| Created Date                         | 2026-06-27                                                                                                     |
| Last Updated                         | 2026-06-27                                                                                                     |

---

## 2. Backlog Execution Context

### Product Backlog Item

`PB-P1-020 — Gestión de presupuesto + BudgetItems` cubre la vista 1:1 del presupuesto por evento (US-035) y el CRUD de `BudgetItem` (US-036). Depende de `PB-P0-001` (schema `budget`/`budget_items`) y `PB-P1-006` (creación de evento con `currency_code`). Los `BudgetItem` iniciales pueden ser sembrados desde IA en `PB-P1-013` con HITL en `PB-P1-016`; ambos consumidores upstream alimentan los items que US-035 visualiza.

### Execution Order Rationale

US-035 va primero en el item porque US-036 (CRUD) consumirá el mismo cache TanStack `['event', eventId, 'budget']` y necesita invalidarlo tras cada mutación. Entregar primero la vista habilita verificación visual end-to-end del flujo: sembrar items → ver vista → mutar (US-036) → ver vista actualizada. Además, esta US es exclusivamente lectura y no introduce migraciones; US-036 sí requiere CRUD endpoints completos, por lo que va después.

### Related User Stories in Same Backlog Item

| User Story                                   | Role in Backlog Item                                                                       | Suggested Order |
| -------------------------------------------- | ------------------------------------------------------------------------------------------ | --------------- |
| US-035 — Vista del presupuesto                | `GET /api/v1/events/:eventId/budget` con `summary` server-side + tabla por categoría        | 1               |
| US-036 — CRUD de BudgetItem                  | `POST/PATCH/DELETE /api/v1/events/:eventId/budget/items`; invalida cache de US-035          | 2               |

---

## 3. Executive Technical Summary

US-035 entrega una vista server-driven del presupuesto del evento exponiendo una **única ruta** `GET /api/v1/events/:eventId/budget` (D1, ya catalogada en `docs/16 §M06`). El response se extiende con un bloque `summary` calculado en backend (`total_planned`, `total_committed`, `paid_total`, `over_committed`, `currency_code`) y un arreglo `items[]` con normalización `paid null → 0` (D3). El flag `over_committed` se calcula server-side (D4) y la UI lo lee sin recalcular. No se introducen migraciones, endpoints nuevos ni mutaciones; todas las mutaciones viven en US-036. La UI implementa los componentes `BudgetView`, `BudgetSummary`, `BudgetItemsTable`, `OvercommitWarning` y `EmptyBudgetState`, consume el hook `useEventBudget` con la query key canónica `['event', eventId, 'budget']`, y formatea montos con `Intl.NumberFormat({ style: 'currency', currency: summary.currency_code })` en 4 locales. El Empty State expone deeplinks a US-036 (CRUD) y, condicionalmente vía feature flag `ai.budget-suggestion.enabled`, a US-037 (sugerencia IA).

---

## 4. Scope Boundary

### In Scope

* Implementación del endpoint canónico `GET /api/v1/events/:eventId/budget` con `GetBudgetUseCase`, repositorio y serialización extendida.
* Cálculo server-side de `summary.over_committed`, `summary.paid_total`, `summary.total_planned`, `summary.total_committed`.
* Normalización `paid null → 0` en serialización.
* Componentes UI `BudgetView`, `BudgetSummary`, `BudgetItemsTable`, `OvercommitWarning`, `EmptyBudgetState`.
* Hook `useEventBudget(eventId)` con TanStack key `['event', eventId, 'budget']`.
* Banner read-only para eventos `cancelled`/`completed` (heredando UX de US-014/US-015).
* Deeplinks a US-036 (CRUD) y US-037 (IA, condicional).
* i18n en `es-LATAM`, `es-ES`, `pt`, `en` con currency CLDR.
* Log estructurado `budget.viewed` sin PII.
* Tests unit/integration/E2E/perf/a11y/contract.

### Out of Scope

* `PATCH/POST/DELETE` sobre `/budget` o `/budget/items` (US-036).
* Generación IA (US-037).
* Conversión FX o multi-moneda (`BR-BUDGET-007`).
* Cambio de moneda post-creación (`BR-BUDGET-006`).
* Edición del campo `paid` (Future).
* Gráficos avanzados, breakdown por responsable o por sprint.
* Migraciones o índices nuevos (reuso del schema entregado por PB-P0-001).
* Endpoint admin (US-016 lo maneja).

### Explicit Non-Goals

* No introducir nuevos verbos HTTP ni nuevos paths bajo `/budget`.
* No materializar `total_planned`/`total_committed` en la BD si la consulta en vivo cumple `NFR-PERF-001` (decisión del Tech Spec).
* No introducir feature flags nuevos más allá del ya previsto `ai.budget-suggestion.enabled`.
* No invocar al LLMProvider desde US-035.

---

## 5. Architecture Alignment

### Backend Architecture

* **Stack**: Node.js + Express + TypeScript + Prisma + PostgreSQL.
* **Patrón**: Clean / Hexagonal (controller → use case → repository).
* **Reuso**: módulo `modules/budget` con scaffolding de PB-P0-001 (entidades Prisma `Budget`, `BudgetItem`, `ServiceCategory`). `EventOwnershipPolicy`, `OrganizerRoleGuard`, `adminExclusionGuard` reusados de `modules/events`/`modules/tasks`.
* **Nuevo**: controller `GetBudgetController`, use case `GetBudgetUseCase`, repository `BudgetReadRepository.getByEventId(eventId)`.

### Frontend Architecture

* **Stack**: Next.js App Router + TypeScript + TanStack Query + Tailwind + next-intl.
* **Nuevo**: ruta `/[locale]/organizer/events/[eventId]/budget`; componentes `BudgetView`, `BudgetSummary`, `BudgetItemsTable`, `OvercommitWarning`, `EmptyBudgetState`; hook `useEventBudget`.
* **Reuso**: layout del organizador, `next-intl` provider, design tokens, banners de error de US-014, banner read-only de US-014 EC-01 (cancelled) y US-015 (completed).

### Database Architecture

* **Modelos**: `Budget` (1:1 con `Event`), `BudgetItem` (N:1 con `Budget`), `ServiceCategory` (referenciada para `category_name`). Sin cambios estructurales.
* **Índices**: reuso de los entregados en PB-P0-001 (`budget.event_id` unique, `budget_items.budget_id`).
* **Sin migraciones**.
* **Estrategia de totales**: lectura en vivo con `SUM` agregado en una sola query SQL (alternativa: materializar en BD; ambas son compatibles con D1; ver §17 risks).

### API Architecture

* **Endpoint único**: `GET /api/v1/events/:eventId/budget` (ya catalogado en `docs/16 §M06`).
* **Response extendido** respecto del bosquejo histórico de M06: agrega bloque `summary` con `over_committed`, `paid_total`, `currency_code` (Documentation Alignment Required, no bloqueante).

### AI / PromptOps Architecture

No aplica — esta historia no invoca IA directamente. El CTA del Empty State es un deeplink a US-037 con feature flag.

### Security Architecture

* HTTP-only cookies (heredado de US-027).
* Backend como source of truth para autorización y para el flag `over_committed`.
* RBAC: `OrganizerRoleGuard`. Ownership: `EventOwnershipPolicy`. Exclusión admin: `adminExclusionGuard`.
* No-revelación 404 ante recurso ajeno.

### Testing Architecture

* Vitest (unit + integration), Supertest (API), Playwright (E2E), MSW (mocks), jest-axe (A11Y), snapshot contractual contra OpenAPI.

---

## 6. Functional Interpretation

| Acceptance Criterion                                            | Technical Interpretation                                                                                                                                                                                                                          | Impacted Layer(s)                |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| AC-01 Vista canónica                                             | `GetBudgetUseCase` ensambla `summary` (cálculo SUM agregado) + `items[]` con `category_name` resuelto vía join. Serialización aplica normalización `paid null → 0`.                                                                                  | BE, API                          |
| AC-03 Warning visible                                            | UseCase calcula `over_committed = total_committed > total_planned`; UI renderiza `OvercommitWarning` con `role="alert"` cuando `summary.over_committed = true`.                                                                                     | BE, FE                           |
| AC-04 Shape canónico                                             | DTO Zod `GetBudgetResponseDto` valida shape; contract test contra snapshot OpenAPI (CONTRACT-01).                                                                                                                                                  | BE, API, QA                      |
| AC-05 i18n + currency CLDR                                       | `Intl.NumberFormat(locale, { style: 'currency', currency: summary.currency_code })`. Catálogo i18n en 4 locales.                                                                                                                                   | FE                               |
| AC-06 Independencia respecto a `event.status`                    | UseCase NO consulta `event.status` para alterar el cálculo. Autorización en el guard previo; cálculo idempotente por `event_id`.                                                                                                                   | BE, SEC                          |
| AC-07 Performance                                                 | Una sola query SQL agregada por evento. Reuso de índices `budget.event_id` y `budget_items.budget_id`. Tests PERF-01 contra dataset de 30 items.                                                                                                    | DB, BE, QA                        |
| AC-08 A11Y                                                       | `<table role="table">`, `<caption>`, `<th scope="col">`, contraste AA del banner, `aria-busy` en skeleton.                                                                                                                                          | FE, QA                            |
| EC-01..06                                                       | Empty state, soft-deleted no aplica (no se filtran items eliminados en MVP), cancelled/completed con banner, currency inmutable visible.                                                                                                            | BE, FE                            |
| VR-01..05                                                       | UUID Zod path param, ownership 403/404, no se aceptan PATCHs (404 implícito por ruta inexistente), UI no recalcula.                                                                                                                                | BE, FE, SEC                       |
| SEC-01..05                                                      | Reuso de policies y guards; estado del evento no altera contrato de autorización; logging sin PII.                                                                                                                                                  | BE, SEC, OBS                      |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

* `modules/budget` (nuevo en MVP; el scaffolding de Prisma viene de PB-P0-001).
  * No depende de `modules/quotes` ni `modules/booking` para esta US (esos consumidores actualizan `committed` via US-038/US-039).

### Use Cases / Application Services

* `GetBudgetUseCase`:
  1. Recibe `{ eventId, currentUser }`.
  2. Invoca `EventOwnershipPolicy.assertOwner(eventId, currentUser.id)`. Si falla → propaga 404 (no-revelación).
  3. Invoca `BudgetReadRepository.getByEventId(eventId)` → retorna `{ budget, items, sums: { total_planned, total_committed, paid_total } }`.
  4. Si `budget` es null (caso borde: evento sin presupuesto), retorna 404 (`BR-BUDGET-001` exige 1:1; en MVP, el wizard crea `Budget` siempre).
  5. Calcula `over_committed = sums.total_committed > sums.total_planned`.
  6. Compone `summary` y serializa `items[]` con `paid: item.paid ?? 0`.
  7. Emite log `budget.viewed` con campos sin PII.

### Controllers / Routes

* `GetBudgetController`:
  * Ruta: `GET /api/v1/events/:eventId/budget`.
  * Middlewares: `authRequired` (cookie), `OrganizerRoleGuard`, `adminExclusionGuard`.
  * Path param validado con Zod (`eventId: z.string().uuid()`).
  * Llama al use case y serializa el response.

### DTOs / Schemas

```ts
// apps/api/src/modules/budget/dto/budget-summary.dto.ts
export const budgetSummaryDto = z.object({
  total_planned: z.number().nonnegative(),
  total_committed: z.number().nonnegative(),
  paid_total: z.number().nonnegative(),
  over_committed: z.boolean(),
  currency_code: z.enum(['GTQ', 'EUR', 'MXN', 'COP', 'USD']), // BR-BUDGET-006
});

export const budgetItemDto = z.object({
  id: z.string().uuid(),
  service_category_id: z.string().uuid(),
  category_name: z.string().min(1),
  planned: z.number().nonnegative(),
  committed: z.number().nonnegative(),
  paid: z.number().nonnegative(), // normalizado: null → 0
  ai_generated: z.boolean(),
});

export const getBudgetResponseDto = z.object({
  summary: budgetSummaryDto,
  items: z.array(budgetItemDto),
});
export type GetBudgetResponseDto = z.infer<typeof getBudgetResponseDto>;
```

### Repository / Persistence

* `BudgetReadRepository.getByEventId(eventId): Promise<{ budget, items, sums }>`:
  * Query 1: localizar `budget.id` por `event_id`.
  * Query 2 (combinable con `JOIN`): listar `budget_items` con `service_categories.name` proyectado.
  * Query 3 (agregado SUM): `SELECT SUM(planned), SUM(committed), SUM(COALESCE(paid, 0)) FROM budget_items WHERE budget_id = $1`.
  * Implementación recomendada: una sola transacción de lectura con `Prisma.$transaction` o `prisma.$queryRaw` para evitar round-trips innecesarios. La elección final queda a discreción de implementación siempre que cumpla `NFR-PERF-001`.
  * Alternativa: materializar `total_planned`/`total_committed` en `budget` y actualizar en US-036. Ambas son compatibles con D1 y BR-BUDGET-003.

### Validation Rules

* `eventId`: UUID v4 (Zod). 400 si inválido.
* Sin body. 405 (Method Not Allowed) si llega un verbo distinto a GET (manejado por el router de Express).

### Error Handling

| Caso                                | Status |
| ----------------------------------- | ------ |
| Sin sesión                          | 401    |
| Rol distinto a Organizer            | 403    |
| Admin                               | 403    |
| Recurso ajeno o evento inexistente   | 404 (no-revelación) |
| `eventId` no UUID                   | 400    |
| Evento sin `Budget` asociado         | 404 (debería no ocurrir si el wizard cumple `BR-BUDGET-001`) |
| Error SQL                           | 500 con log estructurado |

### Transactions

No requeridas para lectura; PostgreSQL garantiza snapshot consistency. Si se opta por materialización, las mutaciones de US-036 viven dentro de transacciones (alcance de US-036).

### Observability

* Logger estructurado `budget.viewed`:

  ```json
  {
    "event": "budget.viewed",
    "eventId": "<uuid>",
    "userId": "<uuid>",
    "currency_code": "USD",
    "total_planned": 12500,
    "total_committed": 9800,
    "paid_total": 4200,
    "over_committed": false,
    "items_count": 7,
    "correlationId": "<id>",
    "duration_ms": 35
  }
  ```
* Métricas: reuso del histogram `http_request_duration_seconds{route="/events/:eventId/budget"}` (Prometheus). Sin métricas nuevas.

---

## 8. Frontend Technical Design

### Routes / Pages

* `apps/web/app/[locale]/organizer/events/[eventId]/budget/page.tsx` (nueva ruta).

### Components

* `BudgetView` (orquestador de la página).
* `BudgetSummary` (resumen con `total_planned`, `total_committed`, `paid_total`, `currency_code`).
* `BudgetItemsTable` (tabla accesible).
* `OvercommitWarning` (banner `role="alert"` cuando `summary.over_committed = true`).
* `EmptyBudgetState` (cuando `items: []`).
* Reuso del banner read-only de US-014 para `cancelled`, y del banner "Evento completado" de US-015.

### Forms

No aplica. Las mutaciones se delegan a US-036 vía deeplinks.

### State Management

* `useEventBudget(eventId)` → TanStack Query con key `['event', eventId, 'budget']` y `queryFn = () => budgetApi.get(eventId)`.
* `staleTime` corto (5 s) y `gcTime` 60 s; refetch automático en focus.
* US-036 invalida `['event', eventId, 'budget']` tras cada mutación.

### Data Fetching

* `apps/web/lib/api/budgetApi.ts` `get(eventId): Promise<GetBudgetResponseDto>`.

### Loading / Empty / Error / Success States

* **Loading**: skeleton con `aria-busy="true"`; visibilidad mínima 300 ms.
* **Empty**: `items: []` ⇒ Empty State con CTAs.
* **Error**: banner reusable de US-014.
* **Success**: summary + tabla + warning condicional.

### Accessibility

* `<table role="table">` con `<caption>` localizado.
* `<th scope="col">` para cada columna.
* Contraste AA del `OvercommitWarning`.
* `role="alert"` o `aria-live="polite"` en el warning.
* `aria-busy="true"` durante loading.
* Test con jest-axe.

### i18n

* Locales: `es-LATAM` (default), `es-ES`, `pt`, `en`.
* Claves nuevas en `apps/web/messages/<locale>.json`:
  * `budget.label`
  * `budget.column.category`
  * `budget.column.planned`
  * `budget.column.committed`
  * `budget.column.paid`
  * `budget.overcommit_warning`
  * `budget.empty_title`
  * `budget.empty_cta_create`
  * `budget.empty_cta_ai`
  * `budget.event_cancelled_banner`
  * `budget.event_completed_banner`
* Formato CLDR con `Intl.NumberFormat(locale, { style: 'currency', currency: summary.currency_code })`.

---

## 9. API Contract Design

| Method | Endpoint                                | Purpose                                                                                                            | Auth Required        | Request                                                                  | Response                                                                                                                                                  | Error Cases             |
| ------ | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | -------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| GET    | `/api/v1/events/:eventId/budget`         | Vista del presupuesto: summary derivado + items por categoría + flag `over_committed` server-side.                  | Sí (cookie sesión)   | Path: `eventId` UUID. Sin body. Sin query params.                       | `200 { summary: BudgetSummaryDto, items: BudgetItemDto[] }`                                                                                                | 400, 401, 403, 404, 500 |

### Notas del contrato

* No se admiten `PATCH/POST/DELETE` en `/budget`; estos viven en `/budget/items/*` (US-036).
* La normalización `paid null → 0` es invariante del contrato; el cliente nunca recibe `null` en `paid`.
* Documentation Alignment Required: actualizar `docs/16 §M06 Budget` con el shape `summary`. Snapshot OpenAPI por US-098 (Future).

---

## 10. Database / Prisma Design

### Models Impacted

* `Budget` (existente, PB-P0-001): `id`, `event_id` (unique), `currency_code`, `total_planned?`, `total_committed?` (opcional materializado), `created_at`, `updated_at`.
* `BudgetItem` (existente, PB-P0-001): `id`, `budget_id`, `service_category_id`, `planned`, `committed`, `paid` (nullable), `ai_generated`, `created_at`, `updated_at`.
* `ServiceCategory` (existente): `id`, `name`, `code`, `is_active`.

### Fields / Columns

Sin nuevas columnas. Si se opta por materialización (`total_planned`, `total_committed` en `budget`), reuso de los campos existentes definidos en `docs/6 §Budget`.

### Relations

Sin cambios. `Budget.event_id → Event.id` (unique), `BudgetItem.budget_id → Budget.id`, `BudgetItem.service_category_id → ServiceCategory.id`.

### Indexes

* `budget.event_id` unique (PB-P0-001).
* `budget_items.budget_id` (PB-P0-001).
* Sin índices nuevos.

### Constraints

* `Budget.event_id` unique (1:1, BR-BUDGET-001).
* `BudgetItem.planned >= 0`, `committed >= 0`, `paid >= 0 OR NULL` (PB-P0-001).
* Enforcement de enums `currency_code` (PB-P0-001).

### Migrations Impact

**Ninguna**. US-035 no requiere migraciones nuevas.

### Seed Impact

* Reuso del seed entregado en PB-P0-001 + PB-P1-006 (eventos demo con `Budget` precreado) y PB-P1-013/PB-P1-016 (items IA confirmados).
* Validación que el seed cubre tres escenarios canónicos: empty, dentro de presupuesto, exceso. Si falta el escenario "exceso", se añade dentro de la tarea SEED de US-036 o como housekeeping (no bloqueante para US-035).

---

## 11. AI / PromptOps Design

No aplica — esta historia no invoca IA directamente.

El CTA "Sugerir IA" del Empty State es un `<Link>` condicionado por `feature flag` (`ai.budget-suggestion.enabled`). La generación AI-003 y su HITL viven en US-037; US-035 solo enlaza.

---

## 12. Security & Authorization Design

### Authentication

* Cookie HTTP-only `session` (middleware global de US-027 / PB-P0-005).
* Sin sesión ⇒ `401 Unauthorized`.

### Authorization

* `OrganizerRoleGuard` (reuso): rol distinto a Organizer ⇒ `403 Forbidden`.
* `EventOwnershipPolicy` (reuso): caller debe ser `Event.owner_id`. Si no, no-revelación ⇒ `404 Not Found`.
* `adminExclusionGuard` (reuso): admin ⇒ `403 Forbidden`.

### Ownership Rules

* Backend como source of truth. La verificación ocurre antes del use case.

### Role Rules

* Organizer (200), Vendor (403), Admin (403), sin sesión (401).

### Negative Authorization Scenarios

| Escenario                                          | Resultado esperado |
| -------------------------------------------------- | ------------------ |
| Sin sesión                                         | 401                |
| Organizer A consulta evento de Organizer B         | 404                |
| Vendor sobre el endpoint                           | 403                |
| Admin sobre el endpoint                            | 403                |
| `eventId` no UUID                                  | 400                |
| Evento `cancelled` o `completed`                   | 200 (D3/SEC-04)    |

### Audit Requirements

* No es acción admin; no requiere `AdminAction`.
* Log estructurado `budget.viewed` para auditoría de visualizaciones.

### Sensitive Data Handling

* No expone PII.
* `userId` se loguea como identificador opaco.
* Montos: numéricos; tratados como atributos sensibles a auditoría (`docs/19 §logging policy`).

---

## 13. Testing Strategy

### Unit Tests

| ID    | Scenario                                                                                       | Layer       |
| ----- | ---------------------------------------------------------------------------------------------- | ----------- |
| UT-01 | `over_committed = true` cuando `total_committed > total_planned`                                | BE          |
| UT-02 | Normalización `paid null → 0` en serialización                                                  | BE          |
| UT-03 | `summary.paid_total = SUM(items.paid)` con mix de null/no null                                  | BE          |
| UT-04 | DTO Zod rechaza `total_planned` negativo                                                       | BE          |
| UT-05 | DTO Zod rechaza `currency_code` fuera del enum                                                 | BE          |
| UT-06-FE | `BudgetItemsTable` renderiza `currency_code` recibido en cada celda                            | FE          |
| UT-07-FE | `OvercommitWarning` se renderiza solo si `summary.over_committed = true`                      | FE          |
| UT-08-FE | `useEventBudget` invalida correctamente al recibir `invalidate` desde otra mutación (US-036)   | FE          |

### Integration Tests

| ID    | Scenario                                                                            | Layer       |
| ----- | ----------------------------------------------------------------------------------- | ----------- |
| IT-01 | Vista completa con summary + items                                                  | BE + DB     |
| IT-02 | Empty state cuando `items = []`                                                     | BE + DB     |
| IT-03 | Warning cuando `total_committed > total_planned`                                    | BE + DB     |
| IT-04 | `paid` nulos en todos los items ⇒ tabla con `0` y `paid_total = 0`                 | BE + DB     |
| IT-05 | Evento `cancelled` ⇒ 200 + cálculo real                                            | BE          |
| IT-06 | Evento `completed` ⇒ 200 + cálculo real                                            | BE          |
| IT-07 | Estado del evento NO altera autorización (D3)                                       | BE          |

### API Tests

Cubiertas por Integration Tests (Supertest sobre el controller real).

### E2E Tests

| ID    | Scenario                                                                                        | Tipo       |
| ----- | ----------------------------------------------------------------------------------------------- | ---------- |
| E2E-01 | Organizer entra a la vista, ve summary + tabla, banner condicional                              | Playwright |
| E2E-02 | Empty state con CTA "Crear primera categoría" deeplink → US-036                                 | Playwright |
| E2E-03 | Empty state con CTA "Sugerir IA" deeplink → US-037 (con feature flag activado)                  | Playwright |
| E2E-04 | Tras mutación en US-036, cache se invalida y la vista refleja el cambio                          | Playwright |

### Security Tests

| ID         | Scenario                              | Expected |
| ---------- | ------------------------------------- | -------- |
| SEC-T-01   | Sin sesión                            | 401      |
| SEC-T-02   | Organizer A vs evento de Organizer B  | 404      |
| SEC-T-03   | Vendor                                | 403      |
| SEC-T-04   | Admin                                 | 403      |
| SEC-T-05   | `eventId` no UUID                     | 400      |

### Accessibility Tests

| ID       | Scenario                                                                                  | Tipo                        |
| -------- | ----------------------------------------------------------------------------------------- | --------------------------- |
| A11Y-01  | Tabla con `role="table"`, `<caption>`, `<th scope="col">`                                  | @testing-library + jest-axe |
| A11Y-02  | Banner de warning con `role="alert"` o `aria-live="polite"`                                | jest-axe                    |
| A11Y-03  | Skeleton con `aria-busy="true"` durante loading                                            | jest-axe                    |
| A11Y-04  | `aria-label` localizado por locale                                                         | @testing-library            |

### AI Tests

No aplica.

### Seed / Demo Tests

| ID         | Scenario                                                                                                | Tipo    |
| ---------- | ------------------------------------------------------------------------------------------------------- | ------- |
| SEED-T-01  | Seed por defecto contiene al menos un evento con `over_committed = true` para mostrar el warning en demo | Vitest  |

### Performance Tests

| ID      | Scenario                                                                                  | Expected             |
| ------- | ----------------------------------------------------------------------------------------- | -------------------- |
| PERF-01 | 30 BudgetItems + cálculo de `summary` en una sola transacción de lectura                   | P95 < 1.5 s (NFR-PERF-001) |

### Contract Tests

| ID           | Scenario                                                                | Expected                          |
| ------------ | ----------------------------------------------------------------------- | --------------------------------- |
| CONTRACT-01  | Shape `{ summary, items[] }` vs OpenAPI snapshot                         | Match exacto (handoff a US-098)   |

### CI Checks

* Vitest (unit + integration) verde.
* Playwright (E2E) verde sobre seed.
* Cobertura ≥ 50% en módulo `budget` (consistente con MVP §12.4).
* Lint, typecheck y build sin errores.

---

## 14. Observability & Audit

### Logs

* `budget.viewed` con campos: `eventId`, `userId`, `currency_code`, `total_planned`, `total_committed`, `paid_total`, `over_committed`, `items_count`, `correlationId`, `duration_ms`.
* Nivel `info`. Sin PII.

### Correlation ID

* Heredado del middleware global.

### AdminAction

No aplica.

### Error Tracking

* Errores SQL y de mapeo se capturan en el repositorio/use case con logger estructurado (`error.code`, `error.message` truncado).

### Metrics

* Reuso del histogram `http_request_duration_seconds{route="/events/:eventId/budget"}`. Sin métricas nuevas.

---

## 15. Seed / Demo Data Impact

### Seed Data Required

* Reuso del seed de PB-P0-001 + PB-P1-006 + PB-P1-013/16.
* Recomendado: garantizar que al menos un evento demo tenga `total_committed > total_planned` para mostrar `OvercommitWarning` en demo (cubierto por SEED-T-01).

### Demo Scenario Supported

* Vista completa con items, summary y warning.
* Empty state con CTAs (US-036 y US-037).
* Banner read-only para `cancelled`/`completed`.

### Reset / Isolation Notes

Sin notas adicionales.

---

## 16. Documentation Alignment Required

| Document / Source                                            | Conflict                                                                                                            | Current Decision                                                                                | Recommended Action                                                                                                                  | Blocks Implementation? |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| `docs/16-API-Design-Specification.md §M06 Budget`             | El response del endpoint no documenta `summary { total_planned, total_committed, paid_total, over_committed, currency_code }`. | D1, D3, D4 (decision resolution US-035) confirman el shape extendido.                            | Actualizar `docs/16 §M06` con el shape extendido. Snapshot OpenAPI por US-098 (Future). No bloquea.                                  | No                     |
| `docs/4 §BR-BUDGET-002`                                       | "`paid` opcional en MVP" no precisa el tratamiento en UI/API.                                                       | D3 (decision resolution US-035) normaliza `null → 0` en serialización.                            | Añadir nota interpretativa en BR-BUDGET-002 referenciando D3. No bloquea.                                                            | No                     |
| `docs/10-Non-Functional-Requirements.md`                      | Algunas US referencian `NFR-PERF-API-001` (ID inexistente); el canónico es `NFR-PERF-001`.                            | US-035 ya usa `NFR-PERF-001`. Alineación ya registrada en US-032/US-033.                          | Housekeeping en backlog y otras US. No bloquea.                                                                                     | No                     |

---

## 17. Technical Risks & Mitigations

| Risk                                                                                                              | Impact                                                                          | Mitigation                                                                                                                                                                  |
| ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cálculo en vivo del `summary` con 3 queries separadas puede degradar P95.                                          | P95 > 1.5 s en datasets grandes.                                                | Ejecutar en una sola transacción de lectura o `$queryRaw` con SUM agregado. PERF-01 valida; si falla, considerar materialización en US-036.                                  |
| Si se opta por materialización de `total_planned`/`total_committed` en `budget`, hay riesgo de drift cuando los items mutan.  | UI muestra summary obsoleto tras mutación.                                       | Si se materializa, las mutaciones de US-036 deben actualizar los totales dentro de la misma transacción. Mientras tanto, US-035 puede calcular en vivo (recomendado).         |
| Frontend recalcula `over_committed` localmente y genera drift.                                                      | UI inconsistente con backend.                                                   | D4 + VR-05 explícitos. UT-07-FE valida que el componente lee del prop sin recalcular.                                                                                       |
| Feature flag `ai.budget-suggestion.enabled` no existe en el sistema.                                                | CTA "Sugerir IA" no se puede ocultar.                                            | Antes de implementar el Empty State, verificar el sistema de feature flags; si no existe, abrir follow-up DevOps o usar variable de entorno como fallback. No bloquea US-035. |
| Documentation Alignment Required no se ejecuta y queda residual.                                                   | Documentación divergente.                                                       | Tareas DOC explícitas en el task breakdown (Should, no bloqueantes).                                                                                                          |

---

## 18. Implementation Guidance for Coding Agents

### Archivos / Carpetas probablemente impactadas

**Backend** (`apps/api`):

* `src/modules/budget/dto/budget-summary.dto.ts` — **nuevo**.
* `src/modules/budget/dto/budget-item.dto.ts` — **nuevo**.
* `src/modules/budget/dto/get-budget-response.dto.ts` — **nuevo**.
* `src/modules/budget/repositories/budget-read.repository.ts` — **nuevo**.
* `src/modules/budget/use-cases/get-budget.use-case.ts` — **nuevo**.
* `src/modules/budget/controllers/get-budget.controller.ts` — **nuevo**.
* `src/modules/budget/budget.module.ts` — **nuevo**.
* `src/app.routes.ts` (o equivalente) — **registrar** `/api/v1/events/:eventId/budget`.
* `src/shared/logging/budget-events.ts` — **nuevo** (esquema `budget.viewed`).
* `tests/modules/budget/**` — **nuevo** (unit + integration).

**Frontend** (`apps/web`):

* `app/[locale]/organizer/events/[eventId]/budget/page.tsx` — **nuevo**.
* `components/events/budget/BudgetView.tsx` — **nuevo**.
* `components/events/budget/BudgetSummary.tsx` — **nuevo**.
* `components/events/budget/BudgetItemsTable.tsx` — **nuevo**.
* `components/events/budget/OvercommitWarning.tsx` — **nuevo**.
* `components/events/budget/EmptyBudgetState.tsx` — **nuevo**.
* `hooks/useEventBudget.ts` — **nuevo**.
* `lib/api/budgetApi.ts` — **nuevo**.
* `messages/{es-LATAM,es-ES,pt,en}.json` — **añadir** claves `budget.*`.
* `tests/components/events/budget/**` — **nuevo**.
* `e2e/budget-view.spec.ts` — **nuevo**.

**Documentación**:

* `docs/16-API-Design-Specification.md §M06` — añadir shape `summary` (DOC, no bloqueante).
* `docs/4-Business-Rules-Document.md §BR-BUDGET-002` — nota interpretativa D3 (DOC, no bloqueante).

### Orden recomendado de implementación

1. **DB sanity** (`PERF-01` preflight): verificar plan SQL `EXPLAIN ANALYZE` con dataset seed; confirmar uso de índices canónicos.
2. **Backend DTOs** (BE-001): definir `BudgetSummaryDto`, `BudgetItemDto`, `GetBudgetResponseDto`.
3. **Backend repository** (BE-002): `BudgetReadRepository.getByEventId`. UT + IT.
4. **Backend use case** (BE-003): `GetBudgetUseCase` con cálculo de `over_committed` y normalización `paid`.
5. **Backend controller + ruta** (BE-004): `GetBudgetController`, registro en el router.
6. **Backend logger** (OBS-001): extender catálogo de eventos con `budget.viewed`.
7. **Frontend hook + API client** (FE-001): `budgetApi.get`, `useEventBudget`.
8. **Frontend componentes** (FE-002..005): `BudgetSummary`, `BudgetItemsTable`, `OvercommitWarning`, `EmptyBudgetState`.
9. **Frontend page** (FE-006): `BudgetView` + integración en `/budget`.
10. **i18n** (FE-007): claves `budget.*` en 4 locales.
11. **E2E** (QA-006): implementar Playwright.
12. **PERF** (QA-003): ejecutar y validar P95.

### Decisiones que no deben reabrirse

* D1: única ruta `GET /api/v1/events/:eventId/budget`. Sin PATCH/POST/DELETE. CRUD vive en US-036.
* D2: CTA "Sugerir IA" = deeplink condicional a US-037.
* D3: columna `paid` siempre visible; backend normaliza `null → 0`.
* D4: `summary.over_committed` server-side; UI no recalcula.

### Qué NO debe implementarse

* No crear `PATCH /api/v1/events/:eventId/budget`.
* No invocar al LLMProvider desde US-035.
* No introducir cache server-side adicional (Redis/memo).
* No recalcular `over_committed` ni totales en el frontend.
* No modificar `event_tasks` ni introducir migraciones.

### Asunciones a preservar

* `Budget` se crea siempre con el evento (BR-BUDGET-001); en MVP no debería ocurrir un evento sin presupuesto.
* `paid` permanece nullable en BD; la normalización es a nivel de serialización.
* El plan SQL aprovecha los índices canónicos entregados por PB-P0-001.

---

## 19. Task Generation Notes

### Suggested Task Groups

| Grupo | Cantidad estimada | Notas                                                                                                                                                    |
| ----- | :---------------: | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DB    | 1                 | Verificación de plan SQL `EXPLAIN ANALYZE`; sin migraciones.                                                                                              |
| BE    | 4                 | DTOs, repository, use case, controller + ruta.                                                                                                            |
| API   | 0                 | Cubierto por BE-004.                                                                                                                                      |
| SEC   | 0                 | Reuso íntegro; pruebas SEC en QA.                                                                                                                         |
| OBS   | 1                 | Logger `budget.viewed`.                                                                                                                                   |
| FE    | 7                 | API client + hook; 4 componentes + Empty State; page + integración; i18n (4 locales).                                                                     |
| SEED  | 1                 | Verificación de seed para escenario `over_committed = true` (opcional, puede vivir en US-036).                                                            |
| QA    | 7                 | UT, IT, PERF, A11Y, CONTRACT, E2E, SEC-T.                                                                                                                  |
| AI    | 0                 | No aplica.                                                                                                                                                |
| OPS   | 1                 | Verificación del feature flag `ai.budget-suggestion.enabled`.                                                                                              |
| DOC   | 2                 | `docs/16 §M06` (shape extendido), `BR-BUDGET-002` (nota interpretativa).                                                                                  |

**Total estimado**: ~24 tareas.

### Required QA Tasks

* UT de fórmula, normalización, DTOs, componentes UI.
* IT de cálculo, estados del evento, soft-delete (no aplica para MVP).
* SEC-T-01..05 (cubiertos en IT o en una tarea SEC dedicada).
* PERF-01 contra dataset de 30 items.
* A11Y-01..04 con jest-axe.
* CONTRACT-01 contra OpenAPI snapshot.
* E2E del flujo completo incluyendo deeplinks.

### Required Security Tasks

Sin tareas dedicadas: reuso íntegro de policies y guards. Las pruebas viven en QA.

### Required Seed / Demo Tasks

* SEED-01 (opcional): verificar/garantizar que el seed cubre `over_committed = true`.

### Required Documentation Tasks

* DOC-01: actualización de `docs/16 §M06` con shape extendido `summary`.
* DOC-02: nota interpretativa en `docs/4 §BR-BUDGET-002` referenciando D3.

### Dependencies Between Tasks

```
DB-01 (preflight SQL)
  └── BE-002 (Repository)
        └── BE-003 (UseCase)
              └── BE-004 (Controller + ruta)
                    ├── OBS-001 (Logger)
                    └── FE-001 (API client + hook)
                          ├── FE-002..005 (Componentes)
                          │     └── FE-006 (Page integration)
                          │           ├── FE-007 (i18n)
                          │           └── QA-006 (E2E)
                          └── QA-005 (Contract)
BE-001 (DTOs)  ── compartido por BE-002/003/004
QA-001..QA-004, QA-007 corren tras BE/FE relevantes
OPS-001 (feature flag) paralelo a FE-005 (EmptyBudgetState)
DOC-01, DOC-02 paralelos, no bloquean
```

### Consolidated `tasks.md` para el Backlog Item

Sí. Al cerrar US-035 + US-036 se recomienda generar `management/development-tasks/P1/PB-P1-020/tasks.md` con flujo end-to-end del item PB-P1-020 (vista + CRUD).

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

`Ready for Task Breakdown`

US-035 tiene una Technical Specification implementation-ready: introduce el módulo `modules/budget` con un solo controller, un solo use case y un solo repository read-only, alineado con `docs/16 §M06` (única ruta `GET /api/v1/events/:eventId/budget`) y con `BR-BUDGET-003`/`FR-BUDGET-004`/`FR-BUDGET-005`. Las 4 decisiones (D1–D4) están formalizadas y se citan explícitamente. Las 3 Documentation Alignment Required son housekeeping no bloqueante. La fórmula de `over_committed` es testeable en unit/integration/PERF/contract, y la UI cumple A11Y AA e i18n en 4 locales con currency CLDR. Próximo paso: `eventflow-user-story-to-development-tasks` consumiendo este archivo.
