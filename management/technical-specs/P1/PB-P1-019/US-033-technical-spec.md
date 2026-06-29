# Technical Specification — US-033: Ver progreso (% done) en el dashboard

## 1. Metadata

| Field                                | Value                                                                                                          |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| User Story ID                        | US-033                                                                                                         |
| Source User Story                    | `management/user-stories/US-033-view-progress-dashboard.md`                                                    |
| Decision Resolution Artifact         | `management/user-stories/decision-resolutions/US-033-decision-resolution.md`                                   |
| Priority                             | P1                                                                                                             |
| Backlog ID                           | PB-P1-019                                                                                                      |
| Backlog Title                        | Filtros y progreso del checklist                                                                               |
| Backlog Execution Order              | 37 (P0: 18 items + P1: 19 items)                                                                               |
| User Story Position in Backlog Item  | 2 de 2 (US-032, US-033)                                                                                        |
| Related User Stories in Backlog Item | US-032 (filtros temporales por `range`), US-033 (% de progreso server-side)                                    |
| Epic                                 | EPIC-TASK-001 — Checklist y tareas                                                                             |
| Backlog Item Dependencies            | PB-P1-018 (US-027 lista canónica, US-029 edición, US-030 cambio de estado, US-031 confirmación HITL)            |
| Feature                              | Indicador de progreso                                                                                          |
| Module / Domain                      | Tasks / Dashboard                                                                                              |
| User Story Status                    | Approved with Minor Notes                                                                                      |
| Backlog Alignment Status             | Found                                                                                                          |
| Technical Spec Status                | Ready for Task Breakdown                                                                                       |
| Created Date                         | 2026-06-27                                                                                                     |
| Last Updated                         | 2026-06-27                                                                                                     |

---

## 2. Backlog Execution Context

### Product Backlog Item

`PB-P1-019 — Filtros y progreso del checklist` agrupa dos historias complementarias sobre el listado canónico de tareas: **US-032** (filtros temporales `range ∈ {overdue, 7d, 30d, all}`) y **US-033** (cálculo server-side de `% done` como agregado embebido). Ambas **extienden** el endpoint canónico `GET /api/v1/events/:eventId/tasks` entregado por `PB-P1-018 / US-027` sin introducir nuevos verbos HTTP. El item depende de la base de tareas: repositorio paginado, DTO `TaskListItemDto`, policies (`EventOwnershipPolicy`, `OrganizerRoleGuard`, `adminExclusionGuard`), logger `tasks.list.requested`, y métricas Prometheus existentes (`http_request_duration_seconds`).

### Execution Order Rationale

US-033 debe trabajarse después de US-032 dentro de PB-P1-019 porque:

1. US-032 ya extendió el `listEventTasksQuerySchema` (Zod) con `range` y el DTO con `overdue` e `is_t_minus_7`; US-033 añade el agregado `progress` al mismo response sin reabrir el contrato.
2. US-032 ya documentó el plan de ejecución SQL con `COUNT(*) FILTER (...)` y validó cobertura del índice canónico `idx_event_tasks_event_status_due`; US-033 reusa esa estrategia para los filters de "tarea contable".
3. US-033 cierra el handoff a `PB-P1-008 / US-014` (dashboard), que ya está aprobado y consume el listado de tareas.

Dentro del Product Backlog Prioritized, PB-P1-019 ocupa la posición 37 (después de PB-P1-018, antes de PB-P1-020). US-033 cierra el item.

### Related User Stories in Same Backlog Item

| User Story                                              | Role in Backlog Item                                                                              | Suggested Order |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | --------------- |
| US-032 — Filtros por timerange                          | Extiende el endpoint con `range` y enriquece el DTO con flags server-side                          | 1               |
| US-033 — `% done` agregado sobre tareas contables       | Añade el agregado `progress` al response del mismo endpoint; consumidor: US-014 (dashboard)         | 2               |

---

## 3. Executive Technical Summary

US-033 expone el porcentaje de progreso del checklist como un **agregado server-side embebido** en el response de `GET /api/v1/events/:eventId/tasks` (extensión del endpoint canónico de US-027 ya extendido por US-032). El cálculo se hace en una **única query SQL** con `COUNT(*) FILTER (...)` sobre `event_tasks` filtrados por `event_id`, reusando `idx_event_tasks_event_status_due`. La fórmula formalizada por D2 es `progress.percentage = ROUND_HALF_UP(done / total_countable * 100)` con `progress.percentage = 0` cuando `total_countable = 0`. "Tarea contable" se define como `deleted_at IS NULL ∧ (ai_generated = false ∨ (ai_generated = true ∧ confirmed = true))` y `total_countable` excluye `skipped`. El estado del evento (`draft`, `active`, `cancelled`, `completed`) **no afecta** el cálculo (D3); la UI muestra banners read-only heredados de US-014 y US-015. El contrato API expone `{ percentage: int 0..100, done, total_countable, skipped }` (D4) con i18n CLDR en `es-LATAM` (default), `es-ES`, `pt`, `en`. No hay nuevo endpoint, ni nuevo verbo HTTP, ni migraciones nuevas. Reuso íntegro de `EventOwnershipPolicy`, `OrganizerRoleGuard`, `adminExclusionGuard`, controller, use case y repositorio paginado de US-027.

---

## 4. Scope Boundary

### In Scope

* Extensión del DTO de response de `GET /api/v1/events/:eventId/tasks` con campo agregado `progress: { percentage, done, total_countable, skipped }`.
* Extensión del use case `ListEventTasksUseCase` con cálculo del agregado en la misma ejecución (reuso del repositorio).
* Extensión del SQL del repositorio para emitir `COUNT(*) FILTER (...)` en una única ida.
* Extensión del componente `ProgressBar` en el dashboard del evento, consumo desde `useEventTasks` (selector `useTaskProgress(eventId)`).
* Extensión del log estructurado `tasks.list.requested` con los campos del agregado.
* i18n en 4 locales (`es-LATAM` default, `es-ES`, `pt`, `en`) con `Intl.NumberFormat({style:'percent'})` o cadena CLDR equivalente.
* Tests: unit (fórmula y predicados), integration (autorización, status del evento, soft-delete), perf (P95 < 1.5 s con 200 tareas), a11y (atributos ARIA), contract (snapshot OpenAPI).

### Out of Scope

* Nuevo endpoint `GET /api/v1/events/:eventId/tasks/progress` (descartado en D1).
* Endpoint agregado `GET /api/v1/events/:eventId/dashboard` (Future, decisión de US-014 tech spec).
* Breakdown del progreso por categoría, asignado o intervalo temporal.
* Gráficos avanzados (tendencias, comparativos).
* Notificaciones push o in-app derivadas del % (cubiertas en otras historias / Future).
* Cálculo client-side del `percentage` (D2: server-side único).
* Migraciones nuevas o índices nuevos (reuso de `idx_event_tasks_event_status_due` declarado en US-032 tech spec).

### Explicit Non-Goals

* No se introduce nuevo verbo HTTP ni nuevo path en `/api/v1`.
* No se modifica el contrato del listado paginado (items, pagination) de US-027.
* No se modifica el filtro `range` de US-032; el agregado `progress` se calcula sobre el universo completo de tareas del evento, no sobre la página o el filtro aplicado al listado.
* No se implementa cache server-side (Redis/memo). El cálculo se hace por request; TanStack Query gestiona la cache client-side.
* No se modifica la query key TanStack canónica de US-027/US-032: `['event', eventId, 'tasks', { range, page, pageSize }]`.

---

## 5. Architecture Alignment

### Backend Architecture

* **Stack**: Node.js + Express + TypeScript + Prisma + PostgreSQL.
* **Patrón**: Clean / Hexagonal (controller → use case → repository).
* **Reuso**: `ListEventTasksController`, `ListEventTasksUseCase`, `EventTaskListRepository`, `EventOwnershipPolicy`, `OrganizerRoleGuard`, `adminExclusionGuard` entregados por US-027 y extendidos por US-032.
* **Extensión**: el use case añade un step `calculateProgress(eventId)` que delega al repositorio; el repositorio emite **una sola query SQL** con `COUNT(*) FILTER (...)` independiente del listado paginado. El controller serializa el agregado dentro del response existente.
* **DTO**: `EventTaskProgressDto = { percentage: number, done: number, total_countable: number, skipped: number }`, validado por Zod en serialización (alineado con `docs/14 §DTO contracts`).

### Frontend Architecture

* **Stack**: Next.js App Router + TypeScript + TanStack Query + Tailwind + next-intl.
* **Reuso**: `useEventTasks({ eventId, page, pageSize, range })` de US-027/US-032; query key canónica `['event', eventId, 'tasks', { range, page, pageSize }]`.
* **Extensión**: el hook ahora devuelve `progress` en su `data`; un selector liviano `useTaskProgress(eventId)` consume el mismo query y retorna `progress` para la card del dashboard sin segundo fetch.
* **Componente**: `ProgressBar` (apps/web/components/events/dashboard/ProgressBar.tsx) con design tokens y atributos ARIA.
* **Invalidación**: tras mutaciones de US-029/US-030/US-031, `queryClient.invalidateQueries({ queryKey: ['event', eventId, 'tasks'] })` (heredado de US-027); US-033 no introduce invalidadores adicionales.

### Database Architecture

* **Modelo**: `event_tasks` (sin cambios estructurales).
* **Índice**: reuso de `idx_event_tasks_event_status_due` (definido en US-032 tech spec; cubre `(event_id, status, due_date)` con predicado `deleted_at IS NULL`).
* **Sin migraciones**.

### API Architecture

* **Endpoint**: `GET /api/v1/events/:eventId/tasks` (reusa el de US-027; ya extendido por US-032 con `range`).
* **Response shape extendido** (extracto):

  ```json
  {
    "items": [ /* TaskListItemDto[] de US-027/US-032 */ ],
    "pagination": { /* heredado de US-027 */ },
    "progress": {
      "percentage": 75,
      "done": 6,
      "total_countable": 8,
      "skipped": 2
    }
  }
  ```
* **Sin nuevos verbos HTTP, sin nuevos paths, sin breaking changes**.

### AI / PromptOps Architecture

No aplica — esta historia no invoca IA directamente. La fórmula respeta HITL: tareas `ai_generated = true ∧ confirmed = false` no son contables (D2, consistente con FR-TASK-005 / BR-TASK-003 / US-031).

### Security Architecture

* **Autenticación**: HTTP-only cookies (heredado de US-027).
* **Autorización**: backend como source of truth. `EventOwnershipPolicy` valida `Event.owner_id == currentUser.id` antes de calcular; `OrganizerRoleGuard` exige rol Organizer; `adminExclusionGuard` retorna 403 a admin (los admins consumen el surface auditado de US-016).
* **No-revelación 404**: ante recurso ajeno se devuelve 404 (consistente con US-027 §SEC).
* **Independencia de `event.status`**: D3 establece que el estado del evento no altera el contrato de autorización ni el cálculo; 401/403/404 son los únicos códigos de error de autorización.

### Testing Architecture

* **Stack**: Vitest (unit), Supertest (API), Playwright (E2E), MSW (mocks), Axe / @testing-library a11y.
* **Reuso**: harness existente de US-027/US-032.
* **Nuevos**: tests dedicados a la fórmula, predicados de "tarea contable", soft-delete, rounding half-up, perf con 200 tareas, contract test contra OpenAPI snapshot.

---

## 6. Functional Interpretation

| Acceptance Criterion                                           | Technical Interpretation                                                                                                                                                                                                            | Impacted Layer(s)                |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| AC-01 Cálculo canónico (D2)                                    | Repositorio emite `COUNT(*) FILTER (WHERE ... AND status = 'done')`, `... AND status IN ('pending','in_progress','done')` y `... AND status = 'skipped'`; use case aplica `Math.round` half-up; controller serializa `percentage`.    | DB, BE, API                      |
| AC-02 Refresco por invalidación TanStack                       | El hook `useEventTasks` ya invalida `['event', eventId, 'tasks']` tras mutaciones; el selector `useTaskProgress` lee del mismo cache. No se introduce invalidador nuevo.                                                              | FE                               |
| AC-03 Shape canónico del agregado                              | DTO `EventTaskProgressDto` con validación Zod en serialización; contract test contra OpenAPI snapshot.                                                                                                                              | BE, API, QA                      |
| AC-04 i18n del valor formateado                                | `next-intl` + `Intl.NumberFormat({style:'percent'})` en `ProgressBar`; cadenas `progress.label` y `progress.skipped_note` en 4 locales.                                                                                              | FE, i18n                          |
| AC-05 Independencia respecto a `event.status` (D3)             | El use case NO consulta `event.status` antes de calcular; el repositorio filtra solo por `event_id` + predicados de "contable" + status de las tareas. La autorización se ejecuta antes y depende solo de ownership y rol.            | BE, SEC                          |
| AC-06 Performance (NFR-PERF-001)                                | Una sola query SQL `COUNT(*) FILTER (...)` aprovechando `idx_event_tasks_event_status_due`. Tests PERF-01 contra dataset de 200 tareas. P95 < 1.5 s.                                                                                  | DB, BE, QA                        |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

* `modules/tasks` (existente; entregado por US-027).
  * No se crean nuevos módulos. Se extiende el use case existente.

### Use Cases / Application Services

* `ListEventTasksUseCase` (existente; extendido por US-032 con `range`).
  * **Cambio en US-033**: tras autorizar y paginar items, invoca `taskListRepository.calculateProgress({ eventId })` y compone el response final con `{ items, pagination, progress }`.
* `EventTaskProgressCalculator` (helper privado dentro del use case o función pura del repositorio).
  * Aplica la fórmula `ROUND_HALF_UP(done / total_countable * 100)`; manejo de `total_countable = 0 ⇒ 0`.

### Controllers / Routes

* `ListEventTasksController` (existente).
  * Sin cambios de routing. El controller serializa el response extendido con `progress` añadido al objeto raíz.

### DTOs / Schemas

* `TaskListItemDto` (de US-027/US-032): sin cambios.
* `PaginationDto` (de US-027): sin cambios.
* **Nuevo**: `EventTaskProgressDto`:

  ```ts
  // apps/api/src/modules/tasks/dto/event-task-progress.dto.ts
  export const eventTaskProgressDto = z.object({
    percentage: z.number().int().min(0).max(100),
    done: z.number().int().min(0),
    total_countable: z.number().int().min(0),
    skipped: z.number().int().min(0),
  });
  export type EventTaskProgressDto = z.infer<typeof eventTaskProgressDto>;
  ```
* `ListEventTasksResponseDto` (extensión):

  ```ts
  export const listEventTasksResponseDto = z.object({
    items: z.array(taskListItemDto),
    pagination: paginationDto,
    progress: eventTaskProgressDto,
  });
  ```

### Repository / Persistence

* `EventTaskListRepository` (existente; entregado por US-027 y extendido por US-032).
  * **Nuevo método**: `calculateProgress({ eventId }): Promise<EventTaskProgressDto>`.
  * Implementación con `prisma.$queryRaw` para usar `COUNT(*) FILTER (...)` en una sola query SQL (Prisma no expone `FILTER` en el query builder declarativo).
  * Predicado de "tarea contable": `deleted_at IS NULL AND (ai_generated = false OR (ai_generated = true AND confirmed = true))`.
  * Query SQL canónica:

    ```sql
    SELECT
      COUNT(*) FILTER (
        WHERE deleted_at IS NULL
          AND (ai_generated = false OR (ai_generated = true AND confirmed = true))
          AND status = 'done'
      )::int AS done,
      COUNT(*) FILTER (
        WHERE deleted_at IS NULL
          AND (ai_generated = false OR (ai_generated = true AND confirmed = true))
          AND status IN ('pending', 'in_progress', 'done')
      )::int AS total_countable,
      COUNT(*) FILTER (
        WHERE deleted_at IS NULL
          AND (ai_generated = false OR (ai_generated = true AND confirmed = true))
          AND status = 'skipped'
      )::int AS skipped
    FROM event_tasks
    WHERE event_id = $1;
    ```

### Validation Rules

* `eventId` path param: UUID v4 (Zod, reuso de US-027).
* `currentUser` debe estar autenticado (heredado de middleware de US-027).
* `total_countable >= done` y `skipped >= 0` se garantizan por construcción del SQL; un test unitario valida la invariante.

### Error Handling

* `401 Unauthorized` si no hay sesión válida (middleware existente).
* `403 Forbidden` si el rol no es Organizer (`OrganizerRoleGuard`) o si es admin (`adminExclusionGuard`).
* `404 Not Found` si el evento no existe o no pertenece al usuario (`EventOwnershipPolicy` con no-revelación, igual que US-027).
* `400 Bad Request` si `eventId` no es UUID.
* `500 Internal Server Error` si la query SQL falla (con logger estructurado del error).

### Transactions

* No requeridas. El cálculo es read-only; PostgreSQL garantiza snapshot consistency dentro de la sesión.

### Observability

* **Logger estructurado** extendido (`tasks.list.requested`) en el use case:

  ```json
  {
    "event": "tasks.list.requested",
    "eventId": "<uuid>",
    "userId": "<uuid>",
    "range": "all",
    "page": 1,
    "pageSize": 20,
    "items_count": 18,
    "progress": { "percentage": 75, "done": 6, "total_countable": 8, "skipped": 2 },
    "correlationId": "<id>",
    "duration_ms": 42
  }
  ```
  Sin PII; `userId` solo como identificador opaco.
* **Métricas Prometheus**: reuso del histogram `http_request_duration_seconds{route="/events/:eventId/tasks"}` existente. No se crean nuevas métricas.

---

## 8. Frontend Technical Design

### Routes / Pages

* `apps/web/app/[locale]/organizer/events/[eventId]/page.tsx` (dashboard del evento, entregado por US-014).

### Components

* `apps/web/components/events/dashboard/ProgressBar.tsx` (nuevo):
  * Props: `{ percentage: number, done: number, totalCountable: number, skipped: number, loading?: boolean, eventStatus?: 'draft' | 'active' | 'cancelled' | 'completed' }`.
  * Render: `<div role="progressbar" aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100} aria-busy={loading} aria-label={t('progress.label')}>`.
  * Tooltip opcional con `done / totalCountable` y nota "{skipped} omitidas".
  * Banner condicional para `eventStatus = 'cancelled'` (read-only) y `'completed'` (banner "Evento completado"), reusando los patrones de US-014 EC-01 y US-015.
* `apps/web/components/events/dashboard/ProgressCard.tsx` (extensión de US-014):
  * Envoltorio con título localizado y el `ProgressBar`.

### Forms

No aplica — solo lectura.

### State Management

* **Hook existente extendido**: `apps/web/hooks/useEventTasks.ts` ahora expone `progress` en su `data`.
* **Nuevo selector**: `apps/web/hooks/useTaskProgress.ts`:

  ```ts
  export function useTaskProgress(eventId: string) {
    return useEventTasks({ eventId, page: 1, pageSize: 1, range: 'all' }, {
      select: (data) => data.progress,
    });
  }
  ```
  Reusa el mismo query key canónico; no hace fetch adicional.
* **Query key canónica**: `['event', eventId, 'tasks', { range, page, pageSize }]` (heredada de US-027/US-032).
* **Invalidación**: heredada de US-029/US-030/US-031. US-033 NO introduce invalidadores adicionales.

### Data Fetching

* `apps/web/lib/api/tasksApi.ts` `listByEvent` reusa la firma de US-027/US-032; el response incluye `progress`.

### Loading / Empty / Error / Success States

* **Loading**: skeleton con `aria-busy="true"`; visibilidad mínima 300 ms para evitar parpadeo.
* **Empty**: `percentage = 0` con tareas no contables ⇒ copy "Confirma o crea tus primeras tareas" + CTA al checklist.
* **Error**: banner reusable de US-014; la card no rompe el resto del dashboard.
* **Success**: barra con `percentage` formateado por locale; tooltip opcional.

### Accessibility

* `role="progressbar"`, `aria-valuenow`, `aria-valuemin=0`, `aria-valuemax=100`.
* `aria-label` localizado (`progress.label`).
* `aria-busy="true"` durante loading.
* Test con @testing-library + jest-axe.

### i18n

* Locales soportados: `es-LATAM` (default), `es-ES`, `pt`, `en`.
* Claves nuevas en `apps/web/messages/<locale>.json`:
  * `progress.label`: "Progreso del checklist".
  * `progress.skipped_note`: "{count} omitidas".
  * `progress.empty_cta`: "Confirma o crea tus primeras tareas".
* Formateo con `Intl.NumberFormat(locale, { style: 'percent' })` aplicado a `percentage / 100`.

---

## 9. API Contract Design

| Method | Endpoint                                  | Purpose                                                                                              | Auth Required        | Request                                                | Response                                                                                            | Error Cases             |
| ------ | ----------------------------------------- | ---------------------------------------------------------------------------------------------------- | -------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------- | ----------------------- |
| GET    | `/api/v1/events/:eventId/tasks`           | Listar tareas (US-027) con filtro `range` (US-032) y agregado `progress` (US-033). Endpoint canónico. | Sí (cookie sesión)   | Path: `eventId` UUID. Query: `?range?`, `?page?`, `?pageSize?` (existentes de US-027/US-032). | `200 { items: TaskListItemDto[], pagination, progress: { percentage, done, total_countable, skipped } }` | 400, 401, 403, 404, 500 |

### Notas del contrato

* El agregado `progress` siempre está presente en todas las respuestas exitosas, independientemente de `range`, `page` o `pageSize`. Se calcula sobre el universo completo del evento, no sobre la página.
* El agregado **NO** depende de los filtros aplicados al listado: un cliente que pagine la página 3 con `range=overdue` recibe el `progress` global del evento.
* `progress.percentage` siempre es entero `0..100` con redondeo half-up.
* Documentation Alignment Required: actualizar `docs/16 §M05 Event Tasks` para reflejar el agregado en el response. Snapshot OpenAPI por US-098 (Future).

---

## 10. Database / Prisma Design

### Models Impacted

* `EventTask` (sin cambios estructurales).

### Fields / Columns

Sin nuevas columnas. Reuso de:

* `event_id` (FK al evento).
* `status` (enum: `pending`, `in_progress`, `done`, `skipped`).
* `ai_generated` (boolean).
* `confirmed` (boolean).
* `deleted_at` (timestamp nullable, soft-delete).

### Relations

Sin cambios. `EventTask.event_id → Event.id` (existente).

### Indexes

* Reuso de `idx_event_tasks_event_status_due` declarado por US-032 tech spec §426. Cubre `(event_id, status, due_date)` con predicado parcial `deleted_at IS NULL`.
* US-033 valida la cobertura del índice contra dataset de 200 tareas vía test `PERF-01`.

### Constraints

Sin nuevos constraints. Reuso de los entregados por US-027 y enforcement del enum `status` por `docs/6 §C-027`.

### Migrations Impact

**Ninguna**. US-033 no requiere migraciones nuevas. La query `COUNT(*) FILTER (...)` opera sobre la estructura existente.

### Seed Impact

* El seed actual de tareas (entregado en US-027 y enriquecido por US-031) cubre los tres escenarios canónicos de demo: 0%, parcial (~50%), 100%.
* No se requieren cambios al seed.

---

## 11. AI / PromptOps Design

No aplica — esta historia no invoca IA directamente.

La fórmula respeta HITL: las tareas `ai_generated = true ∧ confirmed = false` quedan fuera de "tarea contable" (D2). Este criterio honra FR-TASK-005, BR-TASK-003 y la US-031 sin interactuar con `LLMProvider`.

---

## 12. Security & Authorization Design

### Authentication

* Cookie HTTP-only `session` (heredada del middleware global de US-027).
* Sin sesión ⇒ `401 Unauthorized`.

### Authorization

* `OrganizerRoleGuard` (reuso de US-027): rol distinto de Organizer ⇒ `403 Forbidden`.
* `EventOwnershipPolicy` (reuso de US-027): el caller debe ser `Event.owner_id`. Si no, no-revelación ⇒ `404 Not Found`.
* `adminExclusionGuard` (reuso de US-027/US-032): admin ⇒ `403 Forbidden`. Admins consumen el surface auditado de US-016, no este endpoint.

### Ownership Rules

* Backend como source of truth. La verificación ocurre antes de la ejecución del use case; el repositorio nunca se invoca con un `eventId` no autorizado.

### Role Rules

* Solo `Organizer` accede al endpoint.
* Vendor ⇒ `403` (no tiene rol Organizer).
* Admin ⇒ `403` (`adminExclusionGuard`).

### Negative Authorization Scenarios

| Escenario                                          | Resultado esperado |
| -------------------------------------------------- | ------------------ |
| Sin sesión                                         | 401                |
| Organizer A consulta evento de Organizer B         | 404                |
| Vendor consulta el endpoint                        | 403                |
| Admin consulta el endpoint                         | 403                |
| `eventId` no UUID                                  | 400                |
| Evento `cancelled` o `completed` (D3)              | 200 con cálculo real (estado NO altera autorización) |

### Audit Requirements

* US-033 no requiere `AdminAction` (no es acción admin).
* Logger estructurado del agregado (sin PII).

### Sensitive Data Handling

* No expone PII en el agregado (solo conteos enteros).
* El log estructurado registra `userId` como identificador opaco (heredado de US-027).

---

## 13. Testing Strategy

### Unit Tests

| ID            | Scenario                                                                  | Tipo  | Layer       |
| ------------- | ------------------------------------------------------------------------- | ----- | ----------- |
| UT-01         | `ROUND_HALF_UP(50.5) = 51`, `ROUND_HALF_UP(50.4) = 50`                    | Vitest | BE          |
| UT-02         | `total_countable = 0 ⇒ percentage = 0`                                    | Vitest | BE          |
| UT-03         | Predicado "tarea contable" excluye `ai_generated=true ∧ confirmed=false`   | Vitest | BE          |
| UT-04         | Predicado "tarea contable" excluye `deleted_at IS NOT NULL`                | Vitest | BE          |
| UT-05         | `total_countable` excluye `skipped`                                       | Vitest | BE          |
| UT-06         | `done <= total_countable` invariante                                       | Vitest | BE          |
| UT-07         | DTO Zod `EventTaskProgressDto` rechaza `percentage = 101` y `percentage = -1` | Vitest | BE          |
| UT-08-FE      | `ProgressBar` renderiza `aria-valuenow` con `percentage` recibido          | Vitest + RTL | FE     |
| UT-09-FE      | `useTaskProgress(eventId)` retorna `progress` desde el mismo cache que `useEventTasks` | Vitest | FE |

### Integration Tests

| ID           | Scenario                                                                                                     | Tipo      | Layer       |
| ------------ | ------------------------------------------------------------------------------------------------------------ | --------- | ----------- |
| IT-01        | Mix de estados (`pending`, `in_progress`, `done`, `skipped`) ⇒ `progress.percentage` correcto                   | Supertest | BE + DB     |
| IT-02        | `ai_generated=true ∧ confirmed=true` cuenta; `confirmed=false` no                                              | Supertest | BE + DB     |
| IT-03        | Tareas soft-deleted son ignoradas                                                                            | Supertest | BE + DB     |
| IT-04        | Evento `cancelled` ⇒ 200 con cálculo real (D3)                                                                | Supertest | BE          |
| IT-05        | Evento `completed` ⇒ 200 con cálculo real (típicamente `percentage = 100`)                                     | Supertest | BE          |
| IT-06        | Solo IA no confirmadas ⇒ `progress = { 0, 0, 0, 0 }`                                                          | Supertest | BE + DB     |
| IT-07        | Todas `skipped` ⇒ `progress = { 0, 0, 0, N }`                                                                | Supertest | BE + DB     |
| IT-08        | Sin tareas ⇒ `progress = { 0, 0, 0, 0 }`                                                                     | Supertest | BE + DB     |
| IT-09        | Filtro `range=overdue` NO altera el cálculo del agregado                                                       | Supertest | BE          |
| IT-10        | Paginación NO altera el cálculo del agregado                                                                   | Supertest | BE          |

### API Tests

Cubiertas por los Integration Tests anteriores (Supertest sobre el controller real).

### E2E Tests

| ID    | Scenario                                                                                                  | Tipo       |
| ----- | --------------------------------------------------------------------------------------------------------- | ---------- |
| E2E-01 | Organizer entra al dashboard, cambia una tarea a `done` (US-030) y observa que el % se actualiza tras refetch | Playwright |
| E2E-02 | Organizer confirma una tarea IA (US-031) y observa cambio en el `total_countable` y `percentage`           | Playwright |
| E2E-03 | Organizer ve banner "Evento completado" sobre la barra cuando `event.completed`                            | Playwright |

### Security Tests

| ID         | Scenario                                | Expected |
| ---------- | --------------------------------------- | -------- |
| SEC-T-01   | Sin sesión                              | 401      |
| SEC-T-02   | Organizer A vs evento de Organizer B    | 404      |
| SEC-T-03   | Vendor sobre el endpoint                | 403      |
| SEC-T-04   | Admin sobre el endpoint                 | 403      |
| SEC-T-05   | `eventId` no UUID                       | 400      |

### Accessibility Tests

| ID       | Scenario                                                                  | Tipo                 |
| -------- | ------------------------------------------------------------------------- | -------------------- |
| A11Y-01  | `ProgressBar` expone `role="progressbar"` + `aria-valuenow/min/max`         | @testing-library + jest-axe |
| A11Y-02  | `aria-busy="true"` durante loading                                         | @testing-library     |
| A11Y-03  | `aria-label` localizado en `es-LATAM`, `es-ES`, `pt`, `en`                  | @testing-library     |

### AI Tests

No aplica.

### Seed / Demo Tests

| ID         | Scenario                                                                                                | Tipo    |
| ---------- | ------------------------------------------------------------------------------------------------------- | ------- |
| SEED-T-01  | Seed por defecto contiene al menos un evento con `progress.percentage` mostrable para demo (0, parcial, 100) | Vitest  |

### Performance Tests

| ID      | Scenario                                                                                  | Expected             |
| ------- | ----------------------------------------------------------------------------------------- | -------------------- |
| PERF-01 | Endpoint con dataset de 200 tareas mixtas + cálculo del agregado, medición de P95          | P95 < 1.5 s (NFR-PERF-001) |

### Contract Tests

| ID           | Scenario                                                                       | Expected                          |
| ------------ | ------------------------------------------------------------------------------ | --------------------------------- |
| CONTRACT-01  | Shape del response (con `progress`) vs OpenAPI snapshot                         | Match exacto (handoff a US-098)   |

### CI Checks

* Vitest (unit + integration) verde.
* Playwright (E2E) verde sobre seed de demo.
* Cobertura ≥ 50% en módulo `tasks` (consistente con MVP §12.4).
* Lint, typecheck y build sin errores.

---

## 14. Observability & Audit

### Logs

* Extensión del log estructurado existente `tasks.list.requested` con `progress.{percentage,done,total_countable,skipped}`.
* Nivel `info`. Sin PII.

### Correlation ID

* Heredado del middleware `correlationId` de US-027.

### AdminAction

No aplica — no es acción admin.

### Error Tracking

* Errores SQL se capturan en el repositorio y se loguean con `error.code`, `error.message` truncado (sin PII). Se reportan a la sink existente (consistente con `docs/14 §error handling`).

### Metrics

* Reuso del histogram `http_request_duration_seconds{route="/events/:eventId/tasks"}` (no se crean nuevas métricas).

---

## 15. Seed / Demo Data Impact

### Seed Data Required

Ninguno nuevo. Reuso de:

* Eventos demo: `event-demo-active`, `event-demo-draft`, `event-demo-cancelled`, `event-demo-completed`.
* Tareas demo: mix de `pending`, `in_progress`, `done`, `skipped`, `ai_generated` confirmadas y no confirmadas.

### Demo Scenario Supported

* "Crear tarea → confirmar HITL → cambiar a done → ver % actualizándose" (ciclo end-to-end demoable).
* Eventos `cancelled` y `completed` muestran el cálculo real con banners apropiados.

### Reset / Isolation Notes

Sin notas adicionales. Reuso del workflow de reset existente.

---

## 16. Documentation Alignment Required

| Document / Source                                    | Conflict                                                                                                                                          | Current Decision                                                                                                                          | Recommended Action                                                                                                                              | Blocks Implementation? |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| `docs/4-Business-Rules-Document.md` BR-TASK-009       | "`done / total confirmado`" no explicita exclusión de `skipped` ni manejo de IA no confirmadas.                                                    | D2 (decision resolution US-033) formaliza `done / total_countable` con `total_countable = pending+in_progress+done` sobre tareas contables. | Añadir nota interpretativa a BR-TASK-009 referenciando D2 de US-033; o crear ADR si se prefiere. No bloquea implementación.                     | No                     |
| `docs/10-Non-Functional-Requirements.md`              | Algunas US referencian `NFR-PERF-API-001` (ID inexistente); el canónico es `NFR-PERF-001`.                                                          | US-033 ya usa `NFR-PERF-001`. Misma alineación registrada en US-032.                                                                       | Limpieza housekeeping en backlog y otras US que referencien el ID erróneo. No bloquea implementación.                                            | No                     |
| `docs/16-API-Design-Specification.md` §M05            | El response del listado se extiende con `progress` (no documentado en M05).                                                                       | D1 (decision resolution US-033) confirma extensión del endpoint canónico.                                                                  | Actualizar `docs/16 §M05` para reflejar `progress` en el response. Snapshot OpenAPI por US-098 (Future). No bloquea implementación.              | No                     |

---

## 17. Technical Risks & Mitigations

| Risk                                                                                                              | Impact                                                                                       | Mitigation                                                                                                                                                                |
| ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cómputo del agregado puede acoplarse al listado paginado y costar 2× tiempo si se ejecuta en una segunda query.    | P95 supera `NFR-PERF-001` (1.5 s) en datasets grandes.                                        | Implementar en **una sola query SQL** con `COUNT(*) FILTER (...)`. PERF-01 valida contra dataset de 200 tareas; alerta si el plan SQL deja de usar el índice.              |
| Drift entre frontend y backend si el frontend recalcula el `percentage` localmente.                                | Demo inconsistente; AC-01 falla.                                                              | D2/VR-04: el frontend NO recalcula. Test unitario UT-08-FE valida que `ProgressBar` renderiza el `percentage` recibido sin transformaciones aritméticas.                  |
| Rounding boundary: `Math.round` de JavaScript usa banker's rounding parcial.                                        | `50.5 ⇒ 50` en lugar de `51` (D4 exige half-up).                                              | Implementar `ROUND_HALF_UP` server-side (PostgreSQL `ROUND` es half-up). El backend retorna el entero ya redondeado; el frontend solo formatea. UT-01 valida boundary.    |
| Tareas IA no confirmadas pueden aparecer en el listado pero no en el agregado, generando confusión visual.         | Mensaje confuso en la UI: el listado muestra tareas pero el % es 0.                          | Copy en `progress.empty_cta` y tooltip "{skipped} omitidas". US-031 ya consume el mismo cache; el flujo de confirmación actualiza el `percentage` tras invalidación.        |
| Documentation Alignment Required no se ejecuta como housekeeping y queda residual.                                  | Documentación divergente con la implementación.                                              | Crear tarea DOC en US-098 (Future) o como housekeeping en sprint. No bloquea US-033.                                                                                      |

---

## 18. Implementation Guidance for Coding Agents

### Archivos / Carpetas probablemente impactadas

**Backend** (`apps/api`):

* `src/modules/tasks/dto/event-task-progress.dto.ts` — **nuevo**.
* `src/modules/tasks/dto/list-event-tasks-response.dto.ts` — **extender** con `progress`.
* `src/modules/tasks/repositories/event-task-list.repository.ts` — **extender** con método `calculateProgress({ eventId })` (`prisma.$queryRaw`).
* `src/modules/tasks/use-cases/list-event-tasks.use-case.ts` — **extender** para invocar `calculateProgress` y componer el response.
* `src/modules/tasks/controllers/list-event-tasks.controller.ts` — **sin cambios** (el response extendido fluye por serialización del DTO).
* `src/shared/logging/task-events.ts` — **extender** el contrato del evento `tasks.list.requested` con el campo `progress`.
* `tests/modules/tasks/use-cases/list-event-tasks.use-case.test.ts` — **extender**.
* `tests/modules/tasks/repositories/event-task-list.repository.test.ts` — **extender** con tests SQL.
* `tests/modules/tasks/controllers/list-event-tasks.controller.test.ts` — **extender** con contract tests del nuevo shape.

**Frontend** (`apps/web`):

* `components/events/dashboard/ProgressBar.tsx` — **nuevo**.
* `components/events/dashboard/ProgressCard.tsx` — **nuevo** o **extender** la card del dashboard.
* `hooks/useEventTasks.ts` — **extender** el tipo de retorno con `progress`.
* `hooks/useTaskProgress.ts` — **nuevo** (selector sobre `useEventTasks`).
* `lib/api/tasksApi.ts` — **extender** el tipo de retorno de `listByEvent`.
* `messages/{es-LATAM,es-ES,pt,en}.json` — **añadir** claves `progress.*`.
* `tests/components/events/dashboard/ProgressBar.test.tsx` — **nuevo**.
* `tests/hooks/useTaskProgress.test.ts` — **nuevo**.
* `e2e/dashboard-progress.spec.ts` — **nuevo**.

**Documentación**:

* `docs/4-Business-Rules-Document.md` §BR-TASK-009 — añadir nota interpretativa (DOC, no bloqueante).
* `docs/16-API-Design-Specification.md` §M05 — añadir `progress` al response shape (DOC, no bloqueante).

### Orden recomendado de implementación

1. **DB sanity** (`PERF-01` preflight): verificar plan SQL `EXPLAIN ANALYZE` con dataset seed; confirmar uso de `idx_event_tasks_event_status_due`.
2. **Backend repository**: implementar `calculateProgress` con `$queryRaw`. Tests UT-01..UT-07 + IT-01..IT-10.
3. **Backend use case**: extender para invocar el repositorio y componer el response. Tests del use case verdes.
4. **Backend DTO + controller**: extender `ListEventTasksResponseDto` y serialización. Contract test CONTRACT-01.
5. **Backend logger**: extender `tasks.list.requested`. Test de logger snapshot.
6. **Frontend hook + selector**: extender `useEventTasks`; implementar `useTaskProgress`. Tests UT-09-FE.
7. **Frontend componente**: implementar `ProgressBar` con atributos ARIA. Tests UT-08-FE + A11Y-01..03.
8. **i18n**: añadir claves en 4 locales.
9. **E2E**: implementar E2E-01..E2E-03 contra seed.
10. **PERF**: ejecutar `PERF-01` y validar P95.

### Decisiones que no deben reabrirse

* D1: extensión del endpoint canónico, sin endpoint nuevo.
* D2: fórmula `ROUND_HALF_UP(done / total_countable * 100)` con `total_countable = pending+in_progress+done` sobre tareas contables (`ai_generated=false ∨ (ai_generated=true ∧ confirmed=true)` y `deleted_at IS NULL`); `0` si denominador `0`.
* D3: cálculo independiente de `event.status`; 200 OK siempre; UI muestra banners read-only.
* D4: `progress: { percentage: int 0..100 half-up, done, total_countable, skipped }`.

### Qué NO debe implementarse

* No crear un nuevo endpoint `/tasks/progress`.
* No introducir cache server-side (Redis/memo).
* No exponer el agregado en formato decimal o ratio.
* No recalcular el `percentage` en frontend.
* No alterar el contrato del listado paginado (`items`, `pagination`) de US-027 ni el filtro `range` de US-032.
* No modificar `event_tasks` ni introducir migraciones.

### Asunciones a preservar

* `idx_event_tasks_event_status_due` cubre los predicados del `COUNT(*) FILTER (...)`. Si en producción el plan SQL deja de usarlo, abrir un follow-up (Future) para añadir índice parcial; no es bloqueante de US-033.
* El seed actual de tareas es suficiente para demo (ya cubre 0%, parcial, 100%).
* US-014, US-015, US-029, US-030 y US-031 ya están aprobadas y operativas; US-033 consume su comportamiento sin modificarlo.

---

## 19. Task Generation Notes

### Suggested Task Groups

| Grupo                  | Cantidad estimada | Notas                                                                                                                                                       |
| ---------------------- | :---------------: | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DB                     | 1                 | Verificación del plan SQL `EXPLAIN ANALYZE` contra dataset de 200 tareas; sin migraciones.                                                                  |
| BE                     | 4                 | Repository `calculateProgress`; extensión `ListEventTasksUseCase`; extensión `ListEventTasksResponseDto` con `EventTaskProgressDto`; extensión del controller. |
| API                    | 0                 | Sin cambios de routing.                                                                                                                                     |
| SEC                    | 0                 | Reuso íntegro de policies/guards.                                                                                                                          |
| OBS                    | 1                 | Extensión del log estructurado `tasks.list.requested`.                                                                                                      |
| FE                     | 4                 | `ProgressBar`; `ProgressCard`; extensión `useEventTasks` + `useTaskProgress`; integración con dashboard (US-014).                                            |
| SEED                   | 0                 | No requiere cambios.                                                                                                                                        |
| QA                     | 7                 | UT (1 backend, 1 frontend); IT (2 BE+DB); SEC-T (1); A11Y (1); PERF (1); CONTRACT (1); E2E (1).                                                              |
| AI                     | 0                 | No aplica.                                                                                                                                                  |
| OPS                    | 0                 | Reuso íntegro del pipeline existente.                                                                                                                       |
| DOC                    | 2                 | Documentation Alignment: nota interpretativa BR-TASK-009; actualización `docs/16 §M05`.                                                                     |

**Total estimado**: ~19 tareas.

### Required QA Tasks

* Tests unitarios de fórmula, predicados, soft-delete, rounding.
* Tests integration de autorización, `event.status`, filtros y paginación.
* Test PERF contra `NFR-PERF-001`.
* Tests A11Y con jest-axe.
* Contract test contra OpenAPI snapshot.
* E2E del ciclo end-to-end demoable.

### Required Security Tasks

Sin nuevas tareas dedicadas: el reuso de `EventOwnershipPolicy`, `OrganizerRoleGuard`, `adminExclusionGuard` y la no-revelación 404 ya cubren el surface. Los tests SEC-T-01..05 se reportan dentro del grupo QA.

### Required Seed / Demo Tasks

No requiere nuevas tareas de seed (reuso del seed de US-027/US-031).

### Required Documentation Tasks

* DOC-01: nota interpretativa en BR-TASK-009 referenciando D2.
* DOC-02: actualización de `docs/16 §M05 Event Tasks` con el campo `progress`.

### Dependencies Between Tasks

```
DB-01 (verificación plan SQL)
  └── BE-01 (Repository calculateProgress)
        └── BE-02 (UseCase extension)
              └── BE-03 (DTO + serialización)
                    ├── BE-04 (Controller — no-op verification)
                    ├── OBS-01 (logger extension)
                    └── FE-03 (hook extension)
                          ├── FE-01 (ProgressBar)
                          │     └── FE-02 (ProgressCard)
                          │           └── FE-04 (dashboard integration con US-014)
                          └── QA-01..QA-07
DOC-01 y DOC-02 (paralelos, no bloquean implementación)
```

### Consolidated `tasks.md` para el Backlog Item

Sí. Al cerrar US-033 se recomienda generar un `management/development-tasks/P1/PB-P1-019/tasks.md` consolidado que liste el flujo end-to-end del item PB-P1-019 (filtros `range` + agregado `progress`) y el handoff a PB-P1-008 / US-014.

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

US-033 tiene una Technical Specification implementation-ready: extensión del endpoint canónico `GET /api/v1/events/:eventId/tasks` con campo agregado `progress`, sin nuevos verbos HTTP, sin migraciones, con reuso íntegro de la base entregada por US-027 (controller, use case, repository, policies, logger, métricas) y por US-032 (índice y patrón de extensión del query schema). Las 4 decisiones bloqueantes (D1–D4) están formalizadas y se citan explícitamente en las tareas. Las 3 Documentation Alignment Required son housekeeping no bloqueante. La fórmula canónica es testeable en unit/integration/PERF/contract, y el componente UI cumple A11Y y i18n. Próximo paso: `eventflow-user-story-to-development-tasks` consumiendo este archivo.
