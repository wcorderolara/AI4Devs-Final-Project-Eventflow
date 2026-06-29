# Technical Specification — US-032: Filtrar tareas por rango temporal (próximos 7/30 días + vencidas)

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-032 |
| Source User Story | `management/user-stories/US-032-filter-tasks-by-timerange.md` |
| Decision Resolution Artifact | No (no requerido) |
| Priority | P1 |
| Backlog ID | PB-P1-019 |
| Backlog Title | Filtros y progreso del checklist |
| Backlog Execution Order | 37 (P0: 18 items + P1: 19 items) |
| User Story Position in Backlog Item | 1 de 2 (US-032, US-033) |
| Related User Stories in Backlog Item | US-032 (filtros temporales), US-033 (% de progreso) |
| Epic | EPIC-TASK-001 — Checklist & Task Management |
| Backlog Item Dependencies | PB-P1-018 (CRUD de tareas manuales y máquina de estados) |
| Feature | Filtros temporales server-side sobre el listado de `EventTask` |
| Module / Domain | Tasks (extensión de `src/modules/tasks/list/` de US-027) |
| User Story Status | Approved (PO/BA Review, 2026-06-26) |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-06-26 |
| Last Updated | 2026-06-26 |

---

## 2. Backlog Execution Context

### Product Backlog Item

`PB-P1-019 — Filtros y progreso del checklist` agrupa dos historias complementarias sobre la vista de tareas: **US-032** (filtros temporales `overdue`/`7d`/`30d`/`all`) y **US-033** (cálculo de `% done`). Ambas extienden el endpoint canónico `GET /api/v1/events/:eventId/tasks` de US-027 sin introducir nuevos verbos HTTP. El item depende de `PB-P1-018` (US-027/028/029/030) porque consume el repositorio de tareas, los policies de ownership/role y el DTO `TaskListItemDto` ya entregados.

`Acceptance Summary` PB-P1-019:
- Filtros correctos por rango.
- `% done` excluye `skipped` correctamente.
- Indicador visual T-7 y vencidas.

### Execution Order Rationale

US-032 debe trabajarse después de `PB-P1-018` porque depende del endpoint base, del repositorio paginado, del DTO canónico, del logger `tasks.list.requested` y de los policies (`EventOwnershipPolicy`, `OrganizerRoleGuard`, `adminExclusionGuard`) entregados por US-027. Dentro del Backlog item, US-032 va primero porque US-033 (% done) reusa los `EventTask` filtrados y el DTO extendido por US-032.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item | Suggested Order |
|---|---|---|
| US-032 — Filtros temporales (`overdue`, `7d`, `30d`, `all`) + DTO extendido (`overdue`, `is_t_minus_7`) | Extiende el GET de tareas con filtros temporales server-side y flags derivados | 1 |
| US-033 — `% done` agregado sobre tareas confirmadas | Consume DTO + filtros para calcular el porcentaje agregado; expone surface en dashboard (PB-P1-008) | 2 |

---

## 3. Executive Technical Summary

US-032 extiende el endpoint canónico `GET /api/v1/events/:eventId/tasks` (definido en US-027) con un único query param adicional `range ∈ {overdue, 7d, 30d, all}` (default `all`) y dos flags derivados en el `TaskListItemDto`: `overdue: boolean` e `is_t_minus_7: boolean`. El cálculo de "today" se hace server-side con `CURRENT_DATE` de PostgreSQL para garantizar consistencia entre clientes en zonas horarias distintas.

La implementación **no crea endpoint, controller, use case ni repositorio nuevos**. Extiende los siguientes elementos ya entregados por US-027:

- `listEventTasksQuerySchema` (Zod): agrega `range: z.enum([...]).catch('all')` con tolerancia consistente con el patrón EC-01.
- `EventTaskListRepository.findByEventPaginated`: agrega parámetro `range` y extiende la cláusula `WHERE` según el valor.
- `TaskListItemMapper.fromEntity`: agrega cálculo de `overdue` (`due_date < CURRENT_DATE`) y `is_t_minus_7` (`due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 7d`) por tarea.
- `TaskListItemDto`: agrega `overdue: boolean` e `is_t_minus_7: boolean` (defaults `false` si `due_date IS NULL`).
- Log `tasks.list.requested`: agrega `range_filter` (valor aplicado tras tolerancia) y `range_dropped: boolean`.

El frontend agrega un componente `TaskRangeFilter` (segmented control de 4 toggles accesible WCAG AA con i18n en 4 locales) embebido en `TaskListPage` de US-027; el cache key de TanStack `['tasks', eventId, { ..., range }]` y los badges visuales `Vencido` / `Próximo a vencer` en `TaskListItem`.

No hay migraciones nuevas. El índice canónico `idx_event_tasks_event_status_due (event_id, status, due_date)` cubre los `WHERE` adicionales. Telemetría reutiliza el log y las métricas de US-027 con dos campos adicionales.

---

## 4. Scope Boundary

### In Scope

- Extensión del Zod schema con `range`.
- Extensión del `EventTaskListRepository.findByEventPaginated` con clausulas por rango.
- Extensión del `TaskListItemMapper` con flags derivados.
- Extensión del `TaskListItemDto` con `overdue` e `is_t_minus_7`.
- Componente frontend `TaskRangeFilter` segmented control con 4 toggles.
- Extensión de `TaskListItem` con badges `Vencido` y `Próximo a vencer`.
- URL-driven state y cache key de TanStack extendido.
- Log `tasks.list.requested` extendido con `range_filter` y `range_dropped`.
- i18n en `es-MX`, `es-AR`, `en-US`, `pt-BR`.
- QA: funcionales por rango, combinación con otros filtros, accesibilidad, performance, autorización (reuso US-027).

### Out of Scope

- Nuevos endpoints o verbos HTTP.
- Nuevos use cases, controllers o módulos backend.
- Nuevas migraciones o índices (verificación operativa del índice existente sí; creación no).
- Cálculo de `% de progreso` (responsabilidad de US-033 / PB-P1-019).
- Rangos personalizados `due_before` / `due_after` libres (Future).
- Notificaciones in-app de tareas vencidas o próximas a vencer (UC-NOTIF-001 fuera de este Backlog item).
- Búsqueda full-text en `title` / `description` (Future).
- Vistas guardadas o filtros persistidos en perfil (Future).
- Filtros sobre tareas soft-deleted (enforced excluidas).
- Endpoint admin global para filtros temporales (US-016 si aplicara).
- Cambios al ordenamiento canónico (`due_date ASC NULLS LAST, created_at DESC`).

### Explicit Non-Goals

- US-032 no modifica ownership, paginación, soft delete, ordenamiento ni cualquier invariante de US-027.
- US-032 no introduce un selector de timezone por evento; el cálculo de `today` se hace con `CURRENT_DATE` del servidor.
- US-032 no calcula métricas agregadas (% done, conteos por bucket); esos cálculos pertenecen a US-033.

---

## 5. Architecture Alignment

### Backend Architecture

- Node.js + Express + TypeScript + Prisma + PostgreSQL.
- Modular Monolith. Extensión del módulo `src/modules/tasks/list/` (introducido por US-027).
- Clean / Hexagonal: el filtro `range` se mantiene en la capa de schema (Zod) y de repositorio (Prisma raw o query builder); los policies y guards no se tocan.
- REST JSON API bajo `/api/v1`. Solo se extiende el contrato GET existente.
- Zod tolerante con `.catch('all')` para preservar el patrón EC-01 de US-027.

### Frontend Architecture

- Next.js App Router + TypeScript.
- Reutilización de la página `/[locale]/organizer/events/:id/tasks` de US-027.
- TanStack Query con cache key extendido `['tasks', eventId, { status, aiGenerated, categoryCode, range, page, pageSize }]`.
- next-intl para 4 locales.
- Tailwind CSS / design tokens para badges (`bg-red-100`/`text-red-800` para vencidas, `bg-amber-100`/`text-amber-800` para T-7) con contraste WCAG AA.
- URL-driven state mediante `useSearchParams` y `router.replace` (sin scroll).

### Database Architecture

- PostgreSQL. Sin migraciones nuevas.
- Reuso del índice canónico `idx_event_tasks_event_status_due (event_id, status, due_date)` (`/docs/18`).
- `CURRENT_DATE` calculado server-side en cada query; sin uso de parámetros enviados por el cliente.

### API Architecture

- Extensión del contrato `GET /api/v1/events/:eventId/tasks` con query param `range` opcional.
- Sin cambios en path, headers, response envelope, status codes o autenticación.
- El DTO de respuesta gana dos campos opcionales documentados.

### AI / PromptOps Architecture

`No aplica` — US-032 es una historia de lectura y filtros; no invoca al `LLMProvider` ni persiste `AIRecommendation`.

### Security Architecture

- Reuso íntegro de `EventOwnershipPolicy`, `OrganizerRoleGuard`, `adminExclusionGuard` de US-027.
- HTTP-only cookies, backend como source of truth.
- No-revelación: `404 NOT_FOUND` para eventos ajenos, inexistentes o soft-deleted.
- Cálculo server-side de `CURRENT_DATE` evita manipulación por el cliente.
- Sin nuevos campos sensibles en logs.

### Testing Architecture

- Vitest + Supertest para integración backend.
- Vitest para tests unitarios del mapper (cálculo de flags).
- Playwright para E2E del segmented control.
- @testing-library/react + axe-core para accesibilidad (NVDA/VoiceOver smoke vía CI).
- k6 o herramienta interna para tests de performance contra `NFR-PERF-001`.

---

## 6. Functional Interpretation

| Acceptance Criterion | Technical Interpretation | Impacted Layer(s) |
|---|---|---|
| AC-01 — Filtro `range=7d` | Zod normaliza `range`; repositorio aplica `WHERE due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days' AND due_date IS NOT NULL`; mapper deriva `is_t_minus_7=true`, `overdue=false`; log emite `range_filter='7d'`, `range_dropped=false`. | Zod + Repository + Mapper + Logger |
| AC-02 — Filtro `range=30d` | `WHERE due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' AND due_date IS NOT NULL`; mapper deriva `is_t_minus_7` para sub-ventana T-7. | Repository + Mapper |
| AC-03 — Filtro `range=overdue` | `WHERE due_date < CURRENT_DATE AND status NOT IN ('done','skipped') AND due_date IS NOT NULL`; mapper deriva `overdue=true`. | Repository + Mapper |
| AC-04 — Filtro `range=all` (default) | Sin `WHERE` temporal; mapper deriva flags por tarea según `due_date`; tareas con `due_date IS NULL` exponen ambos flags `false`. | Repository + Mapper |
| AC-05 — Combinación `range` + `status` + `aiGenerated` | AND lógico de cláusulas tolerantes; `range=overdue` ya implica `status NOT IN ('done','skipped')`, idempotente con `status='pending'`. | Repository (compose WHERE) |
| AC-06 — Combinación `range` + `categoryCode` | AND lógico; cálculo de flags independiente del filtro de categoría. | Repository + Mapper |
| AC-07 — UI segmented control activo | `TaskRangeFilter` actualiza URL via `router.replace`; `useEventTasks` reabre query con `range` en cache key; `aria-pressed` refleja toggle activo. | Frontend (component + hook) |
| AC-08 — UI badge "Vencido" | `TaskListItem` renderiza badge cuando `overdue=true`; `aria-label="Tarea vencida"`. | Frontend (component + i18n) |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

- **Extensión de `src/modules/tasks/list/`** (de US-027). No se crea un nuevo módulo.
- Sub-archivos impactados (orientativo, ajustar al layout real de US-027):
  - `src/modules/tasks/list/schemas/list-event-tasks.schema.ts`
  - `src/modules/tasks/list/repositories/event-task-list.repository.ts`
  - `src/modules/tasks/list/mappers/task-list-item.mapper.ts`
  - `src/modules/tasks/list/dto/task-list-item.dto.ts`
  - `src/modules/tasks/list/use-cases/list-event-tasks.use-case.ts`
  - `src/modules/tasks/list/observability/list-event-tasks.logger.ts`

### Use Cases / Application Services

- **`ListEventTasksUseCase` (extensión)**: recibe `range` desde el query schema y lo propaga al repositorio. No cambia la firma pública del controller; el cambio es interno y aditivo.

### Controllers / Routes

- **Sin nuevo controller**. Reuso del controller `GET /api/v1/events/:eventId/tasks` de US-027. El controller continúa delegando al use case con el objeto de query validado.

### DTOs / Schemas

#### `listEventTasksQuerySchema` (extensión Zod)

```ts
// Pseudocódigo Zod — orientativo
const RangeEnum = z.enum(['overdue', '7d', '30d', 'all']).catch('all')

const listEventTasksQuerySchema = listEventTasksQuerySchema_US027.extend({
  range: RangeEnum.optional(),
})
```

- `range` es opcional; ausencia o valor inválido normaliza a `'all'`.
- Tolerancia consistente con el patrón EC-01 de US-027 (`.catch()` + log `filters.dropped`).

#### `TaskListItemDto` (extensión)

```ts
// Pseudocódigo — orientativo
type TaskListItemDto_US032 = TaskListItemDto_US027 & {
  overdue: boolean
  is_t_minus_7: boolean
}
```

- Ambos flags son booleanos no opcionales en el contrato; cuando `due_date IS NULL`, valen `false`.
- Se calculan server-side y forman parte del response envelope canónico.

### Repository / Persistence

#### `EventTaskListRepository.findByEventPaginated` (extensión)

Pseudocódigo de extensión:

```sql
-- WHERE base (US-027) + extensión por range:
WHERE event_id = $1
  AND deleted_at IS NULL
  AND (CASE WHEN $status_filter IS NOT NULL THEN status = $status_filter ELSE TRUE END)
  AND (CASE WHEN $ai_generated_filter IS NOT NULL THEN ai_generated = $ai_generated_filter ELSE TRUE END)
  AND (CASE WHEN $category_code_filter IS NOT NULL THEN category_code = $category_code_filter ELSE TRUE END)
  -- Extensión US-032:
  AND (
    CASE $range
      WHEN 'overdue' THEN due_date < CURRENT_DATE AND status NOT IN ('done', 'skipped') AND due_date IS NOT NULL
      WHEN '7d'      THEN due_date >= CURRENT_DATE AND due_date <= CURRENT_DATE + INTERVAL '7 days' AND due_date IS NOT NULL
      WHEN '30d'     THEN due_date >= CURRENT_DATE AND due_date <= CURRENT_DATE + INTERVAL '30 days' AND due_date IS NOT NULL
      WHEN 'all'     THEN TRUE
    END
  )
ORDER BY due_date ASC NULLS LAST, created_at DESC
LIMIT $page_size OFFSET ($page - 1) * $page_size
```

- Equivalente vía Prisma `findMany` + `count`: traducir el `CASE` a una composición condicional del `where` clause con `gte`/`lte`/`lt`/`notIn`/`not: null`.
- `CURRENT_DATE` se evalúa por la base; nunca se acepta `today` desde el cliente.

### Validation Rules

| Regla | Comportamiento |
|---|---|
| `range` ∈ `{overdue, 7d, 30d, all}` (case-sensitive) | Inválido → `'all'` con log `filters.dropped` (no devuelve `400`) |
| `range ∈ {overdue, 7d, 30d}` excluye `due_date IS NULL` | Implícito en `WHERE` |
| `range=overdue` excluye `status ∈ {done, skipped}` | Implícito en `WHERE` |
| `range` combinable con `status`, `aiGenerated`, `categoryCode`, `page`, `pageSize` | AND lógico |
| `CURRENT_DATE` calculado por PostgreSQL | No parametrizable desde el cliente |

### Error Handling

- Tolerante: `range` inválido nunca devuelve `400`; se normaliza a `'all'`.
- Errores de ownership/no-revelación: `404` (reuso US-027 SEC-06).
- Errores de role: `403` (vendor/admin) y `401` (anónimo).
- Errores Prisma (timeout, connection): caen al middleware central de US-027 sin cambios.

### Transactions

No aplica (read-only).

### Observability

- **Log `tasks.list.requested` (extensión)** — agrega:
  - `range_filter`: valor aplicado tras `.catch()` (siempre uno de los 4 enums).
  - `range_dropped: boolean` — `true` cuando el cliente envió un valor inválido que fue descartado por la tolerancia Zod.
- Métricas: reuso de `tasks_list_latency_ms` y `tasks_list_total` de US-027; sin métricas nuevas.
- Correlation ID propagado por el middleware de US-027.

---

## 8. Frontend Technical Design

### Routes / Pages

- `/[locale]/organizer/events/:id/tasks` — reuso íntegro de la página `TaskListPage` de US-027. El nuevo componente `TaskRangeFilter` se monta sobre la misma vista, encima de la lista.

### Components

| Componente | Rol | Origen |
|---|---|---|
| `TaskRangeFilter` (nuevo) | Segmented control con 4 toggles ("Vencidas", "Próx. 7 días", "Próx. 30 días", "Todas"). URL-driven. | Nuevo en US-032 |
| `TaskListPage` | Página contenedora. Monta `TaskRangeFilter` + `TaskList` + `Pagination`. | Reuso US-027 (extensión mínima) |
| `TaskListItem` | Renderiza badge `Vencido` (`overdue=true`) y badge `Próximo a vencer` (`is_t_minus_7=true`). | Extensión US-027 |
| `TaskListItemBadge` (opcional) | Sub-componente de badge accesible con `aria-label`. | Nuevo en US-032 |
| `EmptyChecklistState` | Soporta nuevo copy "No hay tareas en el rango seleccionado" + sugerencia. | Extensión US-027 |

#### `TaskRangeFilter` — contrato

- Props: ninguno (lee/escribe URL via `useSearchParams` + `useRouter().replace`).
- Estado interno: derivado de URL; valor canónico tras `.catch()` ('all' por default).
- Render:
  - `<div role="group" aria-label="Filtro temporal">`
  - 4 `<button role="button" aria-pressed={isActive}>` con icono + label + tooltip.
  - Mobile: etiquetas cortas (V / 7d / 30d / Todas) con tooltip.
- Eventos:
  - `onClick(rangeValue)` → `router.replace({ pathname, query: { ...currentQuery, range: rangeValue, page: 1 } }, { scroll: false })`.

#### `TaskListItem` — extensión badges

- Si `task.overdue === true`: render badge rojo "Vencido" con `aria-label="Tarea vencida"`.
- Si `task.is_t_minus_7 === true` y `task.overdue === false`: render badge ámbar "Próximo a vencer" con `aria-label="Tarea próxima a vencer en 7 días"`.
- Ambos badges se pueden mostrar simultáneamente solo si se decidiera explícitamente; el comportamiento canónico es excluyente (overdue tiene prioridad visual).

### Forms

No aplica. El estado del filtro vive en URL params.

### State Management

- TanStack Query: `useEventTasks(eventId, queryParams)` (extensión US-027).
- Cache key: `['tasks', eventId, { status, aiGenerated, categoryCode, range, page, pageSize }]`.
- Invalidación automática al cambiar `range` (cache key distinto).
- Sin invalidación cross-día explícita en MVP; aceptable como cache stale corta (documentado).

### Data Fetching

- `tasksApi.listEventTasks(eventId, { range, status?, aiGenerated?, categoryCode?, page?, pageSize? })`.
- SSR de la primera página opcional (reuso del patrón de US-027); el componente `TaskRangeFilter` es Client Component para acceder a `useSearchParams`.

### Loading / Empty / Error / Success States

| Estado | Comportamiento |
|---|---|
| Loading | Skeleton (reuso US-027) con shimmer sobre el segmented control. |
| Empty | "No hay tareas en el rango seleccionado" + CTA "Probá con 'Todas' o creá una nueva tarea" (deep-link a US-028). |
| Error | Banner con `error.code` traducido (reuso US-027). |
| Success | Lista renderizada con badges canónicos. |

### Accessibility

- `TaskRangeFilter`:
  - `role="group"` + `aria-label="Filtro temporal"`.
  - Cada toggle: `<button aria-pressed={isActive}>`.
  - Navegación por teclado: `ArrowLeft`/`ArrowRight` mueven foco entre toggles; `Space`/`Enter` activan.
  - Focus visible con outline de design tokens.
- Badges:
  - `aria-label` semántico.
  - Iconos decorativos con `aria-hidden="true"`.
  - Contraste WCAG AA (≥ 4.5:1).
- Soporte `prefers-reduced-motion` para transiciones suaves del toggle activo.

### i18n

- next-intl con catálogos para `es-MX`, `es-AR`, `en-US`, `pt-BR`.
- Claves canónicas:
  - `tasks.filter.range.label` → "Filtro temporal" / etc.
  - `tasks.filter.range.overdue` → "Vencidas" / "Overdue" / "Vencidas" / "Atrasadas"
  - `tasks.filter.range.7d` → "Próx. 7 días" / "Next 7 days" / etc.
  - `tasks.filter.range.30d`
  - `tasks.filter.range.all` → "Todas"
  - `tasks.badge.overdue` → "Vencido"
  - `tasks.badge.t_minus_7` → "Próximo a vencer"
  - `tasks.empty.range_filtered` → "No hay tareas en el rango seleccionado"
- Linter build-time que verifica paridad de claves entre los 4 locales (reuso del linter de US-027/US-030 si existe; caso contrario, agregar checklist QA).

---

## 9. API Contract Design

| Method | Endpoint | Purpose | Auth Required | Request | Response | Error Cases |
|---|---|---|---|---|---|---|
| GET | `/api/v1/events/:eventId/tasks` (extensión) | Lista paginada de tareas con filtro temporal opcional | Yes (cookie sesión) | Query params: `range?=overdue|7d|30d|all` (default `all`); `status?`, `aiGenerated?`, `categoryCode?`, `page?` (default 1), `pageSize?` (default 20, max 100) — reuso US-027 | `200 OK` `{ items: TaskListItemDto[], pagination: { page, pageSize, total, totalPages } }`. `TaskListItemDto` ahora incluye `overdue: boolean` e `is_t_minus_7: boolean`. | `400 VALIDATION` (eventId inválido — reuso US-027). `401 UNAUTHORIZED`. `403 FORBIDDEN` (vendor/admin). `404 NOT_FOUND` (no-revelación). `range` inválido → `200 OK` con `range='all'` aplicado y log `filters.dropped`. |

### Ejemplo de response (snippet)

```jsonc
{
  "items": [
    {
      "id": "uuid",
      "title": "Reservar catering",
      "due_date": "2026-06-30",
      "status": "pending",
      "category_code": "catering",
      "ai_generated": false,
      "ai_recommendation_id": null,
      "confirmed_at": null,
      "overdue": false,
      "is_t_minus_7": true,
      "created_at": "2026-06-15T10:00:00Z",
      "updated_at": "2026-06-15T10:00:00Z"
    }
  ],
  "pagination": { "page": 1, "pageSize": 20, "total": 5, "totalPages": 1 }
}
```

---

## 10. Database / Prisma Design

### Models Impacted

- `EventTask` (read-only en esta historia).

### Fields / Columns

Sin cambios. Se leen los siguientes campos canónicos:
- `id`, `event_id`, `title`, `description`, `due_date` (date nullable), `status`, `category_code`, `ai_generated`, `ai_recommendation_id`, `confirmed_at`, `deleted_at`, `created_at`, `updated_at`.

### Relations

Sin cambios.

### Indexes

- Reuso de `idx_event_tasks_event_status_due (event_id, status, due_date)` (`/docs/18`).
- Cubrimiento:
  - `range=overdue` → cobertura parcial (status como segunda columna ayuda; `NOT IN` puede degenerar a scan filtrado, pero el conjunto `event_id` ya está acotado).
  - `range=7d` / `range=30d` → cobertura completa (`event_id` + `due_date BETWEEN`).
  - `range=all` → ordenamiento por `due_date` cubierto por el índice.
- **Verificación operativa**: incluir test de performance con 200 tareas mixtas por evento (`PERF-01..03`) contra `NFR-PERF-001` (P95 ≤ 1.5 s). Si `range=overdue` no cumple, evaluar índice parcial `(event_id, due_date) WHERE status IN ('pending','in_progress') AND deleted_at IS NULL` en una iteración posterior (Future).

### Constraints

Sin cambios.

### Migrations Impact

**Ninguna**. La extensión es 100% query-only.

### Seed Impact

Sin cambios al seed canónico. Para QA y demo:
- El seed actual de US-027 / PB-P1-018 debe incluir tareas con distribución temporal variada (vencidas, T-7, T-15, T-45, sin `due_date`). Verificar en QA-SEED.

---

## 11. AI / PromptOps Design

`No aplica` — US-032 no invoca al `LLMProvider` ni persiste `AIRecommendation`. Los flags `ai_generated` y `ai_recommendation_id` se exponen tal cual los entrega el repositorio (BR-AI-008/010 ya cubiertos por US-027).

---

## 12. Security & Authorization Design

### Authentication

- Cookie de sesión HTTP-only (reuso US-027). Anónimo → `401`.

### Authorization

- `EventOwnershipPolicy.assertOwnsEvent(actor, eventId)` — reuso US-027.
- `OrganizerRoleGuard` y `adminExclusionGuard` (FR-ADMIN-010 enforcement) — reuso US-027.

### Ownership Rules

- `actor.id === event.owner_user_id` o `404 NOT_FOUND` (no-revelación).
- Soft-deleted events → `404`.

### Role Rules

- Organizer dueño → `200`.
- Vendor → `403`.
- Admin → `403` (debe usar `/admin/events/:id/tasks` de US-016).

### Negative Authorization Scenarios

- Vendor autenticado con `range=overdue` → `403`.
- Admin autenticado → `403`.
- Organizer no dueño → `404`.
- Anónimo → `401`.

### Audit Requirements

- Sin `AdminAction` (reuso US-027).
- Log `tasks.list.requested` se extiende con `range_filter` y `range_dropped`; no contiene PII.

### Sensitive Data Handling

- `range_filter` y `range_dropped` no son sensibles.
- `CURRENT_DATE` se calcula por la base; no se acepta input temporal del cliente, lo que elimina vectores de inyección por fecha.

---

## 13. Testing Strategy

### Unit Tests

- `TaskListItemMapper.fromEntity`:
  - Tarea con `due_date < CURRENT_DATE` y status `pending` → `overdue=true`, `is_t_minus_7=false`.
  - Tarea con `due_date < CURRENT_DATE` y status `done` → `overdue=false` (definición canónica BR-TASK-008 operativo).
  - Tarea con `due_date = CURRENT_DATE` → `overdue=false`, `is_t_minus_7=true`.
  - Tarea con `due_date = CURRENT_DATE + 7d` → `overdue=false`, `is_t_minus_7=true`.
  - Tarea con `due_date = CURRENT_DATE + 8d` → `overdue=false`, `is_t_minus_7=false`.
  - Tarea con `due_date IS NULL` → `overdue=false`, `is_t_minus_7=false`.
- Zod schema `listEventTasksQuerySchema`:
  - `range='7d'` → válido.
  - `range='foo'` → normaliza a `'all'`.
  - `range='7D'` / `'OVERDUE'` → normaliza a `'all'` (case-sensitive).
  - Ausencia de `range` → `'all'` por default.

### Integration Tests

- `range=7d` devuelve solo tareas con `due_date BETWEEN today AND today+7` (TS-01).
- `range=30d` (TS-02).
- `range=overdue` excluye `done`/`skipped` (TS-03).
- `range=all` incluye `due_date IS NULL` (TS-04).
- `range=7d` + `status=pending` (TS-05).
- `range=overdue` + `aiGenerated=true` (TS-06).
- Combinación `range` + `categoryCode` (AC-06).
- Paginación funciona sobre subconjuntos filtrados (TS-08, EC-08).
- Ordenamiento canónico (TS-09).
- Empty state para `range=overdue&status=done` (EC-06).

### API Tests

- Tolerancia `range=foo` → `200 OK` con log `filters.dropped` (NT-01).
- Tolerancia `range='Overdue'` / `'OVERDUE'` (NT-07, NT-08).
- `eventId` mal formado → `400 VALIDATION` (NT-09).
- Verificación del envelope `{ items, pagination }`.

### E2E Tests (Playwright)

- Organizador entra a `/organizer/events/:id/tasks`, ve toggle activo en "Todas" por default.
- Hace click en "Próx. 7 días" → URL actualiza, lista refresca, badges "Próximo a vencer" aparecen.
- Hace click en "Vencidas" → solo aparecen tareas con badge "Vencido".
- Empty state visible cuando no hay tareas en el rango (TS-10).

### Security Tests

- Vendor autenticado con `range=overdue` → `403` (AUTH-TS-03).
- Admin autenticado → `403` (AUTH-TS-04).
- Anónimo → `401` (AUTH-TS-05).
- Organizer no dueño → `404` (AUTH-TS-02, EC-10).

### Accessibility Tests

- Navegación por teclado entre toggles (A11Y-01).
- NVDA/VoiceOver anuncian `aria-pressed` correctamente (A11Y-02).
- Badges `Vencido` / `Próximo a vencer` con `aria-label` semántico (A11Y-03).
- Contraste WCAG AA en badges y toggles activos (A11Y-04).
- `prefers-reduced-motion` respetado.

### AI Tests

`No aplica`.

### Seed / Demo Tests

- Validar que el seed canónico de US-027 incluya tareas vencidas, en T-7, en T-30, y sin `due_date` para alimentar el demo de US-032.
- Si el seed no las incluye, agregar fixtures adicionales en QA-SEED.

### CI Checks

- Lint, typecheck, unit, integration, E2E smoke, accessibility smoke.
- Performance budget gate: `PERF-01..03` contra `NFR-PERF-001`.
- i18n linter: paridad de claves en 4 locales.

---

## 14. Observability & Audit

### Logs

- **`tasks.list.requested` (extensión)**:
  - Campos existentes (US-027): `correlation_id`, `event_id`, `actor_id`, `page`, `page_size`, `total`, `filters_applied`, `filters_dropped`, `latency_ms`.
  - Campos nuevos: `range_filter` (`overdue`/`7d`/`30d`/`all`), `range_dropped: boolean`.
- Cuando `range_dropped=true`, se incluye en `filters_dropped` el campo `{ field: 'range', received: <raw>, applied: 'all' }` (consistente con el patrón de US-027).

### Correlation ID

- Reuso del middleware de US-027.

### AdminAction

No aplica.

### Error Tracking

- Reuso del middleware central de US-027 (timeouts, errores Prisma, errores no manejados).

### Metrics

- Reuso de:
  - `tasks_list_latency_ms` (histogram, ya etiquetado por endpoint y status en US-027).
  - `tasks_list_total` (counter por endpoint y status).
- **No se introducen métricas nuevas**. Si en el futuro se quiere monitorear adopción de filtros, se puede agregar `tasks_list_range_total{range="overdue|7d|30d|all"}` como métrica derivada (Future).

---

## 15. Seed / Demo Data Impact

### Seed Data Required

- El seed canónico de PB-P1-018 (vía US-027 SEED-001 si existe) debe incluir, por cada evento demo:
  - ≥ 2 tareas con `due_date < today` (vencidas).
  - ≥ 2 tareas con `due_date BETWEEN today AND today+7` (T-7).
  - ≥ 2 tareas con `due_date BETWEEN today+8 AND today+30` (T-30 fuera de T-7).
  - ≥ 1 tarea con `due_date > today+30`.
  - ≥ 1 tarea con `due_date IS NULL`.
- Si el seed actual no las cubre, agregar fixtures en QA-SEED.

### Demo Scenario Supported

- Demo del filtro segmented control: el organizador cambia entre toggles y la lista se actualiza con badges visuales.
- Demo de combinación `range=overdue&status=pending` muestra el foco operativo inmediato.

### Reset / Isolation Notes

- Como `CURRENT_DATE` es server-side, los fixtures deben usar fechas relativas (`now() + INTERVAL '...'`) en el seed runtime para que sigan siendo válidas independiente del día de la demo.

---

## 16. Documentation Alignment Required

| Document / Source | Conflict | Current Decision | Recommended Action | Blocks Implementation? |
|---|---|---|---|---|
| `/docs/9-Functional-Requirements-Document.md` | `FR-TASK-009/010` clasificados como `Should Have` | PB-P1-019 los promueve a `Must Have` MVP | Formalizar la promoción en `/docs/9` o nota de Backlog Acceptance Summary | No |
| `/docs/10-Non-Functional-Requirements.md` | Draft original referenciaba `NFR-PERF-API-001` (stale) | El canónico es `NFR-PERF-001` (+ `NFR-PERF-005` para paginación) | Cleanup editorial en `/docs/10` | No |
| `/docs/16-API-Design-Specification.md` | El parámetro `range` debe sumarse al snapshot OpenAPI | Coordinación con US-098 | Regenerar snapshot OpenAPI tras la implementación | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Performance de `range=overdue` con `WHERE status NOT IN ('done','skipped')` puede degenerar a scan filtrado sobre datasets grandes | Medio (latencia > NFR-PERF-001 en eventos con > 500 tareas) | Tests PERF-01..03 contra dataset de 200 tareas. Si falla, índice parcial `(event_id, due_date) WHERE status IN ('pending','in_progress') AND deleted_at IS NULL` en iteración Future. |
| Discrepancia de 1 día entre cliente (TZ local) y servidor (`CURRENT_DATE`) en zonas extremas (Pacífico, Asia) | Bajo (filtro operativo, no comercial) | Documentado en `Scope Notes`. Aceptable para MVP. Si se vuelve crítico, usar `event.timezone` (Future). |
| Cache stale cross-día en TanStack: tarea cae en `overdue` al pasar medianoche y la UI no lo refleja sin refetch | Bajo | Documentado en EC-09. El próximo refetch (cambio de toggle, navegación, paginación) actualiza. Sin invalidación cross-día explícita en MVP. |
| Inconsistencia accidental si otro filtro futuro reusa `.catch()` con default distinto | Medio (preserva tolerancia, pero puede confundir) | Convención: todos los filtros tolerantes usan `.catch()` con el valor "neutro" del enum (en este caso `'all'`). Patrón documentado en US-027 EC-01. |
| Snapshot OpenAPI desactualizado en CI | Bajo | Coordinación con US-098 (DOC task). |
| Linter de paridad i18n no detecta claves nuevas | Bajo | Tarea QA específica para validar 4 locales. |

---

## 18. Implementation Guidance for Coding Agents

### Files / folders likely impacted (orientativo)

Backend:
- `src/modules/tasks/list/schemas/list-event-tasks.schema.ts` — extender con `range`.
- `src/modules/tasks/list/dto/task-list-item.dto.ts` — agregar `overdue`, `is_t_minus_7`.
- `src/modules/tasks/list/mappers/task-list-item.mapper.ts` — calcular flags.
- `src/modules/tasks/list/repositories/event-task-list.repository.ts` — extender `WHERE` por `range`.
- `src/modules/tasks/list/use-cases/list-event-tasks.use-case.ts` — propagar `range`.
- `src/modules/tasks/list/observability/list-event-tasks.logger.ts` — incluir `range_filter`, `range_dropped`.

Frontend:
- `apps/web/src/app/[locale]/organizer/events/[id]/tasks/_components/task-range-filter.tsx` — nuevo segmented control.
- `apps/web/src/app/[locale]/organizer/events/[id]/tasks/_components/task-list-item.tsx` — extender con badges.
- `apps/web/src/app/[locale]/organizer/events/[id]/tasks/_hooks/use-event-tasks.ts` — extender cache key con `range`.
- `apps/web/src/lib/api/tasks.ts` — extender `listEventTasks` con `range`.
- `apps/web/src/messages/{es-MX,es-AR,en-US,pt-BR}/tasks.json` — agregar claves de filtros y badges.

QA:
- `tests/integration/tasks/list-with-range.spec.ts` — todos los TS, NT, EC.
- `tests/e2e/tasks/range-filter.spec.ts` — TS-10, A11Y.
- `tests/unit/tasks/mapper.spec.ts` — derivación de flags.
- `tests/perf/tasks-list-range.k6.js` — PERF-01..03.

### Recommended order of implementation

1. Backend: extender `TaskListItemDto`, `TaskListItemMapper` (con tests unitarios), `listEventTasksQuerySchema`.
2. Backend: extender `EventTaskListRepository.findByEventPaginated` con la cláusula por `range`.
3. Backend: extender `ListEventTasksUseCase` para propagar `range` y `listEventTasksLogger` con `range_filter` / `range_dropped`.
4. Tests integración backend completos (TS, NT, EC).
5. Frontend: extender API client y hook con `range`.
6. Frontend: componente `TaskRangeFilter` con URL-driven state, i18n y accesibilidad.
7. Frontend: extender `TaskListItem` con badges visuales canónicos.
8. Frontend: extender `EmptyChecklistState` con el copy del rango filtrado.
9. Tests E2E (Playwright) + accesibilidad smoke (axe-core).
10. Tests de performance (k6) contra dataset de seed.
11. Tareas DOC: snapshot OpenAPI (DOC-001) + alignment notes (DOC-002).

### Decisions that must not be reopened

- Enum único `range` (mutuamente excluyente) — NO usar `within` + `overdue` separados.
- Cálculo server-side de `CURRENT_DATE` — NO aceptar `today` como parámetro.
- Tareas con `due_date IS NULL` excluidas de `overdue`/`7d`/`30d`.
- `range=overdue` excluye `status ∈ {done, skipped}`.
- Tolerancia Zod `.catch('all')` — NO devolver `400` por `range` inválido.
- DTO extendido con `overdue` e `is_t_minus_7` (ambos no opcionales).
- Ordenamiento canónico (`due_date ASC NULLS LAST, created_at DESC`) inalterado.
- Reuso íntegro de ownership/role guards de US-027.

### What must not be implemented

- Nuevo endpoint (US-032 extiende el existente).
- Nuevo controller, use case o módulo.
- Rangos personalizados (`due_before`/`due_after`).
- Notificaciones in-app.
- Cálculo de `% done` (US-033).
- Filtros sobre soft-deleted.
- Selector de timezone por evento.
- Métricas Prometheus nuevas (reuso de US-027).
- Vistas guardadas o filtros persistidos en perfil.

### Assumptions to preserve

- `due_date` es `date` puro sin TZ.
- `CURRENT_DATE` es la referencia canónica.
- `BR-TASK-008` operativo: vencidas excluyen `done` y `skipped`.
- `BR-TASK-009`: soft delete enforced.
- `BR-TASK-010`: read-only en `completed`, bloqueado en `cancelled` (UI aplica; backend responde).

---

## 19. Task Generation Notes

### Suggested task groups

- **DB(0–1)**: verificación de cobertura del índice `idx_event_tasks_event_status_due` con dataset de seed (opcional, sin migraciones).
- **BE(4–5)**:
  - Extensión Zod `listEventTasksQuerySchema`.
  - Extensión `TaskListItemDto`.
  - Extensión `TaskListItemMapper.fromEntity` (flags derivados).
  - Extensión `EventTaskListRepository.findByEventPaginated` (WHERE por `range`).
  - Extensión `ListEventTasksUseCase` para propagar `range` (puede ir junto con repository task).
  - Extensión del logger `tasks.list.requested` con `range_filter` y `range_dropped`.
- **API(0)**: sin tarea nueva (controller reusado).
- **SEC(0)**: sin tarea nueva (policies reusadas; declarar reuso en notas si el formato lo requiere).
- **OBS(0–1)**: la extensión del logger puede consolidarse con BE.
- **FE(4–5)**:
  - Componente `TaskRangeFilter` (segmented control accesible WCAG AA, URL-driven).
  - Extensión `useEventTasks` (cache key con `range`).
  - Extensión `TaskListItem` con badges canónicos.
  - Extensión `EmptyChecklistState` con copy del rango filtrado.
  - Catálogos i18n 4 locales + linter de paridad (puede ir con QA).
- **QA(6–7)**:
  - Unit tests del mapper (flags derivados con 6+ casos).
  - Integration tests por cada `range` (TS-01..04).
  - Integration tests de combinación (TS-05..06, AC-05/06).
  - Integration tests de paginación + ordering (TS-08, TS-09).
  - Integration tests de tolerancia (NT-01, NT-07, NT-08).
  - Integration tests de autorización (NT-03..06, AUTH-TS-01..05).
  - E2E test del segmented control (TS-10) + accesibilidad (A11Y-01..04).
  - Performance test contra `NFR-PERF-001` (PERF-01..03).
- **SEED(0–1)**: verificar/extender el seed para incluir distribución temporal canónica.
- **DOC(2)**:
  - DOC-001: coordinación de snapshot OpenAPI vía US-098.
  - DOC-002: alignment notes para `/docs/9` (promoción Should→Must), `/docs/10` (renumeración NFR), `/docs/16` (parámetro `range`).

### Required QA tasks

- Cobertura completa de AC-01..08, EC-01..10, VR-01..08, SEC-01..08, AUTH-TS-01..05, CONC-01..03, A11Y-01..04, PERF-01..03.

### Required security tasks

- Reuso de policies de US-027. Declarar reuso explícito en task notes; no duplicar código.

### Required seed/demo tasks

- Validar distribución temporal en seed canónico; agregar fixtures si falta.

### Required documentation tasks

- DOC-001 (snapshot OpenAPI vía US-098).
- DOC-002 (alignment notes `/docs/9`, `/docs/10`, `/docs/16`).

### Dependencies between tasks

- BE Mapper → BE Repository (mapper se usa para tests del repository) → BE UseCase → BE Logger.
- FE hook depende de BE schema; FE component `TaskRangeFilter` depende del hook; `TaskListItem` extensión depende del DTO extendido.
- QA integration depende de toda la cadena BE; E2E depende de FE.

### Whether the parent backlog item should later generate a consolidated `tasks.md`

Sí. PB-P1-019 agrupa US-032 + US-033. Al cerrar US-033 se sugiere consolidar un `tasks.md` por item que liste el flujo end-to-end (filtros + % progreso) y los handoffs a PB-P1-008 (dashboard).

---

## 20. Technical Spec Readiness

| Check | Status |
|---|---|
| User Story approved or explicitly allowed for draft spec | Pass |
| Product Backlog mapping found | Pass |
| Decision Resolution reviewed if present | N/A |
| Scope clear | Pass |
| Architecture alignment clear | Pass |
| API impact clear | Pass |
| DB impact clear | Pass |
| AI impact clear | N/A |
| Security impact clear | Pass |
| Testing strategy clear | Pass |
| Ready for Development Task Breakdown | Yes |

---

## 21. Final Recommendation

`Ready for Task Breakdown`.

US-032 es una extensión limpia y bien delimitada del endpoint canónico de US-027. Las decisiones PO/BA están todas formalizadas (15 decisiones aplicadas en la User Story refinada), la trazabilidad es completa (FR-TASK-009/010, UC-TASK-006, BR-TASK-007/008/009/010, NFR-PERF-001/005, NFR-OBS-001/002, PB-P1-019), no introduce migraciones ni endpoints nuevos, y los riesgos técnicos están acotados con mitigaciones claras. Las 3 Documentation Alignment son no bloqueantes y se cubren con tareas DOC.

Próximo paso: ejecutar `eventflow-user-story-to-development-tasks` con esta Tech Spec como input.
