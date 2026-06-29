# Technical Specification — US-027: Ver mi checklist del evento

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-027 |
| Source User Story | `management/user-stories/US-027-view-event-checklist.md` |
| Decision Resolution Artifact | No aplica (no requerido) |
| Priority | P1 |
| Backlog ID | PB-P1-018 |
| Backlog Title | CRUD de tareas manuales y máquina de estados |
| Backlog Execution Order | 36 (P0: 18 + posición 18 en P1) |
| User Story Position in Backlog Item | 1 de 4 |
| Related User Stories in Backlog Item | US-027, US-028, US-029, US-030 |
| Epic | EPIC-TASK-001 — Checklist & Task Management |
| Backlog Item Dependencies | PB-P0-001, PB-P1-006 |
| Feature | Visualización paginada del checklist del evento |
| Module / Domain | Tasks |
| User Story Status | Approved |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-06-26 |
| Last Updated | 2026-06-26 |

---

## 2. Backlog Execution Context

### Product Backlog Item

`PB-P1-018 — CRUD de tareas manuales y máquina de estados`. Agrupa la gestión manual del checklist del evento: ver (US-027), crear (US-028), editar (US-029) y eliminar (US-030). US-027 entrega la **vista de lectura paginada** que sirve de superficie común para todas las operaciones del backlog item y para los flujos IA upstream (`PB-P1-012`/US-018, `PB-P1-016`/US-025, `PB-P1-017`/US-031).

### Execution Order Rationale

US-027 abre la cadena del backlog item porque:
1. Establece el contrato del DTO `TaskListItemDto` que las US restantes (US-028..US-030) deben mantener compatible.
2. Define las invariantes de ownership, soft delete y modo read-only por `event.status` que las mutaciones reutilizan.
3. Es la única superficie consumidora de las salidas de US-018/US-025/US-031 (`ai_generated`, `ai_recommendation_id`, `confirmed_at`).

Por estructura, se implementa antes que US-028..US-030 dentro del mismo backlog item.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item | Suggested Order |
|---|---|---|
| US-027 | Vista de lectura paginada (contrato DTO + invariantes) | 1 |
| US-028 | Crear tarea manual | 2 |
| US-029 | Editar tarea manual + transiciones de estado | 3 |
| US-030 | Eliminar (soft delete) tarea manual | 4 |

---

## 3. Executive Technical Summary

US-027 implementa un endpoint REST de lectura `GET /api/v1/events/:eventId/tasks` que devuelve el listado paginado de `EventTask` del evento del actor. La paginación es page-based canónica (`page=1`/`pageSize=20`, máx `100`), alineada con `/docs/16` §28 y la implementación aprobada en US-013. Los filtros (`status`, `aiGenerated`, `categoryCode`) son **tolerantes a valores inválidos**: Zod aplica `.catch()` y descarta silenciosamente los inválidos con un log estructurado `filters.dropped` (patrón EC-01 de US-013) sin devolver `400`. El listado excluye siempre filas con `deleted_at IS NOT NULL` (`BR-TASK-009`). El ordenamiento por defecto es `due_date ASC NULLS LAST, created_at DESC`. La autorización es backend-only: ownership sobre `Event`, vendor → `403`, admin → `403` (usa endpoint admin de US-016), evento ajeno o soft-deleted → `404` (no-revelación). El DTO `TaskListItemDto` expone trazabilidad IA mínima (`ai_generated`, `ai_recommendation_id?`, `confirmed_at?`) sin payloads del LLM. La UI Next.js aplica modo read-only cuando `event.status='completed'` y bloqueado cuando `'cancelled'`; el backend siempre responde. No se introducen migraciones nuevas; reusa el índice canónico `idx_event_tasks_event_status_due` definido en `/docs/18`. No se invoca al `LLMProvider`. Telemetría: log estructurado `tasks.list.requested` y métricas `tasks_list_latency_ms`, `tasks_list_total`. Performance budget: P95 ≤ 1.5 s (`NFR-PERF-001`).

---

## 4. Scope Boundary

### In Scope

* Endpoint `GET /api/v1/events/:eventId/tasks` con filtros tolerantes + paginación page-based.
* `ListEventTasksUseCase` con orquestación de ownership, validación tolerante, paginación y traducción.
* `EventTaskListRepository.findByEventPaginated(filters, pagination)` con `WHERE deleted_at IS NULL` enforced.
* Zod schemas `listEventTasksParamsSchema` (path) y `listEventTasksQuerySchema` (query) con `.catch()` por filtro.
* DTO `TaskListItemDto` con campos canónicos.
* `EventOwnershipPolicy` (reuso o nueva) + `OrganizerRoleGuard` + `adminExclusionGuard`.
* Mapper `EventTask → TaskListItemDto` con redacción de campos sensibles.
* Telemetría: log `tasks.list.requested` + métricas `tasks_list_latency_ms`, `tasks_list_total`.
* Frontend: `EventChecklistPage`, `TaskList`, `TaskListItem`, `TaskFilters`, `EmptyChecklistState`, `useEventTasks` hook.
* i18n para 4 locales (`es-LATAM`, `es-ES`, `pt`, `en`) en labels de status y mensajes traducibles.
* Tests funcionales, negativos, autorización, accesibilidad y de performance con dataset de 200 tareas.

### Out of Scope

* Crear, editar, eliminar o transicionar tareas (US-028 / US-029 / US-030).
* Confirmación bulk de tareas IA (US-031).
* Filtros temporales (próximos 7/30 días, vencidas) → US-032 / PB-P1-019.
* Cálculo de % de progreso → US-033 / PB-P1-019.
* Búsqueda full-text en `title`/`description` (Future).
* Asignación a múltiples usuarios; subtareas anidadas.
* Recordatorios push o email basados en `due_date` (Future).
* Export CSV / PDF del checklist (Future).
* Endpoint admin global `/admin/events/:id/tasks` (cubierto por US-016).
* Vistas guardadas o filtros personalizados persistidos.
* Migraciones nuevas en `event_tasks` o índices adicionales.

### Explicit Non-Goals

* Devolver `400` por filtros inválidos en query string: el endpoint los descarta silenciosamente con log (decisión PO 8.1, AC EC-01).
* Distinguir entre evento ajeno, inexistente o soft-deleted en la respuesta: todos resuelven a `404 NOT_FOUND` (no-revelación, `SEC-06`).
* Exponer payloads del LLM o metadata sensible de `AIRecommendation` en el DTO (`BR-AI-010`).

---

## 5. Architecture Alignment

### Backend Architecture

Modular Monolith bajo `src/modules/tasks/`. Submódulo nuevo `list/` con arquitectura hexagonal estándar:

* `application/use-cases/list-event-tasks.use-case.ts`
* `application/dtos/task-list-item.dto.ts`
* `application/dtos/list-event-tasks-response.dto.ts`
* `domain/errors/list-event-tasks.errors.ts`
* `infrastructure/repositories/event-task-list.repository.ts`
* `infrastructure/mappers/task-list-item.mapper.ts`
* `interface/http/controllers/list-event-tasks.controller.ts`
* `interface/http/schemas/list-event-tasks.schema.ts`

El controller delega al use case; el use case orquesta ownership, validación tolerante (ya pre-resuelta por Zod `.catch()`), llamada al repositorio paginado y mapping. El repositorio expone `findByEventPaginated(eventId, filters, pagination)` que retorna `{ items, totalItems }` con `WHERE deleted_at IS NULL` enforced y ordenamiento canónico `due_date ASC NULLS LAST, created_at DESC`.

### Frontend Architecture

Next.js App Router. Vista `app/[locale]/organizer/events/[id]/tasks/page.tsx`. Se agregan:

* `features/tasks/components/EventChecklistPage.tsx` (Server Component que SSR-renderiza la primera página).
* `features/tasks/components/TaskList.tsx` (Client Component con lista semántica).
* `features/tasks/components/TaskListItem.tsx` (Client Component con badges IA / estado / categoría).
* `features/tasks/components/TaskFilters.tsx` (Client Component con `<fieldset>` colapsable en mobile).
* `features/tasks/components/EmptyChecklistState.tsx` (Client Component con dual CTAs).
* `features/tasks/hooks/useEventTasks.ts` (TanStack `useQuery` con cache key `['tasks', eventId, filters, page, pageSize]`).
* `features/tasks/api/tasksApi.ts` extiende `list({ eventId, status?, aiGenerated?, categoryCode?, page?, pageSize? })`.

Reusa `AIBadge` de US-017. Integra `BulkConfirmBar` de US-031 cuando hay selección (opcional). Modo read-only por `event.status` aplicado en el contenedor; el listado siempre se renderiza.

### Database Architecture

PostgreSQL + Prisma. Reusa el esquema sembrado por la fundación de tareas (`PB-P1-018`) y la fundación AI-001 (US-017):

* Tabla `event_tasks` con columnas: `id`, `event_id`, `title`, `description`, `due_date`, `status`, `category_code`, `ai_generated`, `ai_recommendation_id`, `confirmed_at`, `created_at`, `updated_at`, `deleted_at`.
* Índice canónico `idx_event_tasks_event_status_due (event_id, status, due_date)` definido en `/docs/18`.
* Índice secundario opcional `idx_event_tasks_event_ai (event_id, ai_generated)` (no bloquea; declarable en `/docs/18` futuro).

Sin migraciones nuevas en US-027.

### API Architecture

REST JSON bajo `/api/v1`. Patrón page-based canónico (`/docs/16` §28) con envelope `{ items, pagination: { page, pageSize, totalItems, totalPages } }`. Filtros por query string tolerantes a inválidos (descartados con log). Sin caching en MVP (datos privados por usuario).

### AI / PromptOps Architecture

No aplica. Este endpoint no invoca al `LLMProvider`, no genera ni modifica `AIRecommendation`. Solo expone trazabilidad IA mínima (`ai_generated`, `ai_recommendation_id?`, `confirmed_at?`) como metadata del DTO.

### Security Architecture

* Autenticación: cookie HTTP-only (sesión vigente). Sin sesión → `401`.
* Autorización: `OrganizerRoleGuard` (rol `organizer` requerido); `EventOwnershipPolicy` sobre `event_id` del path; `adminExclusionGuard` (`FR-ADMIN-010`).
* No-revelación: evento ajeno, inexistente o soft-deleted → `404 NOT_FOUND` (`SEC-06`).
* Logs sin PII: solo `event_id`, `actor_id`, `correlation_id`, `filters.applied`, `filters.dropped`, `items_count`, `page`, `pageSize`, `latency_ms`.
* Backend como source of truth para autorización; el frontend no consulta directamente DB.

### Testing Architecture

* Vitest para unit tests del use case, mapper y validadores Zod.
* Supertest para integration tests del endpoint (happy, filtros, paginación, negativos).
* Playwright para E2E del happy path, estado vacío y modo read-only por `event.status`.
* axe-core + tests de navegación por teclado para accesibilidad.
* Test de performance con dataset de 200 tareas: P95 ≤ 1.5 s.

---

## 6. Functional Interpretation

| Acceptance Criterion | Technical Interpretation | Impacted Layer(s) |
|---|---|---|
| AC-01 Listado por defecto | `findByEventPaginated(eventId, {}, {page:1, pageSize:20})` con `WHERE deleted_at IS NULL` y orden canónico | Backend, DB |
| AC-02 Filtro por estado | Cuando `status` válido, agregar `AND status = $1` al query | Backend |
| AC-03 Filtro por origen IA | Cuando `aiGenerated ∈ {true,false}`, agregar `AND ai_generated = $1`; expone `ai_recommendation_id` por ítem | Backend, DTO |
| AC-04 Filtro por categoría | Cuando `categoryCode` válido, agregar `AND category_code = $1` o `AND category_code IS NULL` si valor literal `"null"` | Backend |
| AC-05 Paginación explícita | Aplicar `LIMIT $pageSize OFFSET $((page-1)*pageSize)` + `COUNT(*)` para `totalItems` | Backend, DB |
| AC-06 Estado vacío | `items=[]` y `totalItems=0` → UI renderiza `EmptyChecklistState` con dual CTAs | Frontend |
| AC-07 Trazabilidad IA mínima | Mapper omite `prompt_version_id`, `llm_provider`, payloads; expone solo `ai_generated`, `ai_recommendation_id?`, `confirmed_at?` | Backend, DTO |
| AC-08 i18n del response | Resolver `Accept-Language` con fallback `es-LATAM`; valores enum permanecen en inglés y se traducen en frontend | Backend, Frontend |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

* `src/modules/tasks/list/` (nuevo submódulo de lectura).
* Reuso de `src/modules/events/policies/event-ownership.policy.ts` (si existe, reusar; si no, crear en este submódulo o en `events`).
* Reuso de `src/modules/auth/guards/organizer-role.guard.ts` y `admin-exclusion.guard.ts`.

### Use Cases / Application Services

```text
ListEventTasksUseCase.execute(input: {
  actorId: string;
  eventId: string;
  filters: { status?: TaskStatus; aiGenerated?: boolean; categoryCode?: string | 'null' };
  pagination: { page: number; pageSize: number };
  acceptLanguage: SupportedLocale;
  filtersDropped: Array<{ key: string; value: unknown; reason: string }>;
}): Promise<ListEventTasksResponseDto>
```

Orquesta:
1. `EventOwnershipPolicy.assertOwnership(actorId, eventId)` → puede lanzar `EventNotFoundError` (404 no-revelación).
2. `EventTaskListRepository.findByEventPaginated(eventId, filters, pagination)` → `{ items: EventTaskRow[], totalItems: number }`.
3. `TaskListItemMapper.toDtoList(items, acceptLanguage)` → `TaskListItemDto[]`.
4. Build response envelope con `pagination.totalPages = ceil(totalItems / pageSize)`.
5. Emitir log `tasks.list.requested` con `filtersDropped`.

### Controllers / Routes

```text
GET /api/v1/events/:eventId/tasks
  → ListEventTasksController.handle(req, res)
    → validate path with listEventTasksParamsSchema
    → validate query with listEventTasksQuerySchema (.catch tolerante)
    → assert role organizer + non-admin
    → invoke ListEventTasksUseCase
    → return 200 + envelope
```

Thin controller; sin lógica de negocio.

### DTOs / Schemas

`TaskListItemDto`:

```typescript
{
  id: string;
  title: string;
  due_date: string | null;            // ISO-8601 date
  status: 'pending' | 'in_progress' | 'done' | 'skipped';
  category_code: string | null;
  ai_generated: boolean;
  ai_recommendation_id: string | null;
  confirmed_at: string | null;        // ISO-8601 datetime
  created_at: string;                 // ISO-8601 datetime
  updated_at: string;                 // ISO-8601 datetime
}
```

`ListEventTasksResponseDto`:

```typescript
{
  items: TaskListItemDto[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}
```

Zod schemas:

* `listEventTasksParamsSchema = z.object({ eventId: z.string().uuid() })`
* `listEventTasksQuerySchema = z.object({ status, aiGenerated, categoryCode, page, pageSize }).catchall(...)` con `.catch()` por campo y un acumulador externo `filtersDropped` que recoge los descartados.

Estrategia tolerante por campo (pseudocódigo):

```text
status:        z.enum([...]).optional().catch(undefined) + push to filtersDropped
aiGenerated:   z.preprocess(parseBool).pipe(z.boolean().optional()).catch(undefined) + push
categoryCode:  z.string().optional().catch(undefined) + later validated vs ServiceCategory.code or literal "null"
page:          z.coerce.number().int().min(1).catch(1)
pageSize:      z.coerce.number().int().min(1).max(100).catch(20)
```

### Repository / Persistence

`EventTaskListRepository.findByEventPaginated(eventId, filters, pagination)`:

```sql
SELECT id, title, due_date, status, category_code, ai_generated, ai_recommendation_id,
       confirmed_at, created_at, updated_at
FROM event_tasks
WHERE event_id = $eventId
  AND deleted_at IS NULL
  AND ($status::task_status IS NULL OR status = $status)
  AND ($aiGenerated::bool IS NULL OR ai_generated = $aiGenerated)
  AND ($categoryCode::text IS NULL
       OR ($categoryCode = 'null' AND category_code IS NULL)
       OR category_code = $categoryCode)
ORDER BY due_date ASC NULLS LAST, created_at DESC
LIMIT $pageSize OFFSET (($page - 1) * $pageSize);
```

Más `COUNT(*) FILTER (WHERE ...)` para `totalItems`. Implementación Prisma equivalente con `findMany` + `count` en una sola transacción de lectura (opcional `$transaction`).

### Validation Rules

| VR | Implementación |
|---|---|
| VR-01 `eventId` UUID v4 | Zod `.uuid()` en path → `400 VALIDATION` |
| VR-02 evento existe + ownership | `EventOwnershipPolicy` → `EventNotFoundError → 404` |
| VR-03 status enum | Zod `.catch(undefined)` + push filtersDropped |
| VR-04 aiGenerated string-bool | Zod `.catch(undefined)` + push filtersDropped |
| VR-05 categoryCode válido | Validación en use case contra catálogo (opcional, ya tolerante); descarta + log si no existe |
| VR-06 page ≥ 1 | Zod `.catch(1)` |
| VR-07 pageSize 1..100 | Zod `.catch(20)` + `.max(100)` con `.catch(100)` para clamp |
| VR-08 Accept-Language soportado | Middleware i18n con fallback a `es-LATAM` |

### Error Handling

| Error | HTTP | Code |
|---|---|---|
| `eventId` inválido | 400 | `VALIDATION` |
| Evento ajeno / inexistente / soft-deleted | 404 | `NOT_FOUND` |
| Sin sesión | 401 | `UNAUTHORIZED` |
| Rol vendor | 403 | `FORBIDDEN` |
| Rol admin | 403 | `FORBIDDEN` |
| Error inesperado | 500 | `INTERNAL_ERROR` |

Filtros inválidos NO devuelven error; se descartan silenciosamente con log.

### Transactions

No requeridas. Endpoint de lectura. Se permite envolver `findMany` + `count` en `$transaction(['readOnly'])` para consistencia de la cuenta total, pero no es bloqueante.

### Observability

* Log estructurado `tasks.list.requested` con campos: `correlation_id`, `actor_id`, `event_id`, `filters.applied`, `filters.dropped`, `items_count`, `page`, `pageSize`, `latency_ms`, `status_code`.
* Métricas Prometheus:
  - `tasks_list_latency_ms` (histograma con buckets 50, 100, 250, 500, 1000, 1500, 3000).
  - `tasks_list_total` (counter por `status_code`).
  - `tasks_list_items_returned` (histograma con buckets 0, 1, 5, 10, 20, 50, 100).

---

## 8. Frontend Technical Design

### Routes / Pages

* `app/[locale]/organizer/events/[id]/tasks/page.tsx` (Server Component que prefetch la primera página).

### Components

* `EventChecklistPage` (Server Component contenedor con read-only mode por `event.status`).
* `TaskList` (Client Component con lista `<ul role="list">`).
* `TaskListItem` (Client Component con badges + `aria-label` combinado).
* `TaskFilters` (Client Component con `<fieldset>` + `<legend>`; colapsable en mobile).
* `EmptyChecklistState` (Client Component con dual CTAs).
* `Pagination` (Client Component con `<nav aria-label="Paginación">`).
* `AIBadge` (reusado de US-017).

### Forms

No aplica (vista de lectura; filtros como controles GET, no forma).

### State Management

* TanStack `useQuery` con `queryKey: ['tasks', eventId, filters, page, pageSize]`, `staleTime: 30s`, `placeholderData: keepPreviousData`.
* Hook `useEventTasks({ eventId, filters, page, pageSize })`.
* Filtros en URL (`useSearchParams` + `useRouter.push`) para shareability y back-button.
* Sin Zustand ni Redux (estado URL-driven).

### Data Fetching

* SSR: el Server Component fetcha la primera página con `tasksApi.list({ eventId })` y la pasa como `initialData` a `useEventTasks`.
* Client: cambios de filtros y paginación disparan `useEventTasks` re-fetch con prefetch de la siguiente página.

### Loading / Empty / Error / Success States

| Estado | Implementación |
|---|---|
| Loading | Skeleton de filas (`TaskListItemSkeleton × 5`) + barra de filtros |
| Empty (`totalItems=0`) | `EmptyChecklistState` con CTAs "Crear tarea" (→ US-028) y "Generar checklist IA" (→ US-018) |
| Error | Banner con código de error traducido + botón "Reintentar" |
| Success | `TaskList` con badges; `Pagination` si `totalPages > 1` |
| Read-only (`event.status='completed'`) | UI deshabilita acciones de mutación; lista visible normalmente |
| Bloqueado (`event.status='cancelled'`) | Banner de estado bloqueado; lista visible normalmente |

### Accessibility

* Lista semántica `<ul role="list">` con `<li>` por tarea.
* Badges con `aria-label` combinado: "Tarea: <título>, estado: <estado>, generada por IA".
* `TaskFilters` como `<fieldset>` con `<legend>` y controles `<select>`/`<input>` etiquetados.
* Navegación por teclado (Tab/Shift+Tab/Enter).
* `aria-live="polite"` para anunciar cambios de página o filtro ("X tareas encontradas").
* Contraste WCAG AA en badges.
* Tap target ≥ 44 px en mobile.

### i18n

* 4 locales: `es-LATAM` (default), `es-ES`, `pt`, `en`.
* Labels traducidos: status (`Pendiente`, `En progreso`, `Hecho`, `Omitido`), categorías (`Catering`, etc.), CTAs, mensajes de empty/error.
* Valores enum permanecen en inglés en el response; la traducción ocurre en frontend con `next-intl`.

---

## 9. API Contract Design

| Method | Endpoint | Purpose | Auth Required | Request | Response | Error Cases |
|---|---|---|---|---|---|---|
| GET | `/api/v1/events/:eventId/tasks` | Listar tareas del evento (paginado, filtrable, tolerante) | Yes (organizer) | Path: `eventId` (UUID v4). Query: `status?`, `aiGenerated?`, `categoryCode?`, `page?`, `pageSize?`. Header: `Accept-Language?` | `200 OK` `{ items: TaskListItemDto[], pagination: { page, pageSize, totalItems, totalPages } }` | `400` UUID inválido; `401` sin sesión; `403` vendor/admin; `404` ajeno/inexistente/soft-deleted |

Documentación OpenAPI debe regenerarse vía US-098.

---

## 10. Database / Prisma Design

### Models Impacted

* `EventTask` (read).
* `Event` (read; ownership + `status`).
* `ServiceCategory` (read opcional para validar `categoryCode`).

### Fields / Columns

`event_tasks` (existente):

* `id UUID PRIMARY KEY`
* `event_id UUID NOT NULL REFERENCES events(id)`
* `title TEXT NOT NULL`
* `description TEXT`
* `due_date DATE`
* `status task_status NOT NULL DEFAULT 'pending'`
* `category_code TEXT REFERENCES service_categories(code)`
* `ai_generated BOOLEAN NOT NULL DEFAULT FALSE`
* `ai_recommendation_id UUID REFERENCES ai_recommendations(id)`
* `confirmed_at TIMESTAMPTZ`
* `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
* `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`
* `deleted_at TIMESTAMPTZ`

### Relations

* `EventTask.event_id → Event.id`
* `EventTask.category_code → ServiceCategory.code` (opcional)
* `EventTask.ai_recommendation_id → AIRecommendation.id` (opcional)

### Indexes

* `idx_event_tasks_event_status_due (event_id, status, due_date)` — canónico (`/docs/18`); cubre listado por defecto y filtro por status.
* Recomendado opcional: `idx_event_tasks_event_ai (event_id, ai_generated) WHERE deleted_at IS NULL` (parcial) para optimizar el filtro por origen IA. No bloquea US-027; declarable en `/docs/18` futuro como cleanup.

### Constraints

* `deleted_at IS NULL` enforced en el WHERE de todas las queries de US-027.
* Estados válidos del enum `task_status`.

### Migrations Impact

**Ninguna nueva.** Reusa el esquema sembrado por la fundación `PB-P1-018` y AI-001 (US-017).

### Seed Impact

No aplica. El seed de tareas se cubre en `PB-P1-018` (US-028..030) y en US-018 (IA).

---

## 11. AI / PromptOps Design

No aplica.

US-027 no invoca al `LLMProvider`, no genera ni modifica `AIRecommendation`. Solo expone metadata mínima de trazabilidad IA (`ai_generated`, `ai_recommendation_id?`, `confirmed_at?`) en el DTO de respuesta, sin exponer `prompt_version_id`, `llm_provider`, `language_code` ni payloads del LLM (`BR-AI-010`).

---

## 12. Security & Authorization Design

### Authentication

* Cookie HTTP-only con sesión vigente.
* Sin sesión → `401 UNAUTHORIZED`.

### Authorization

* `OrganizerRoleGuard`: el actor debe tener rol `organizer`. Vendor → `403`. Admin → `403` (debe usar endpoint admin de US-016).
* `EventOwnershipPolicy.assertOwnership(actorId, eventId)`: `event.owner_user_id === actorId` AND `event.deleted_at IS NULL`. Cualquier mismatch → `404` (no-revelación).

### Ownership Rules

* Backend-only verificación de ownership.
* `EventTask.event_id` siempre igual al `event_id` del path (enforced por el repo con `WHERE event_id = $eventId`).

### Role Rules

| Rol | Resultado |
|---|---|
| Organizer dueño | `200 OK` |
| Organizer no dueño | `404 NOT_FOUND` |
| Vendor | `403 FORBIDDEN` |
| Admin | `403 FORBIDDEN` (usa `/admin/events/:id/tasks` de US-016) |
| Anónimo | `401 UNAUTHORIZED` |

### Negative Authorization Scenarios

* Cubiertos en AUTH-TS-01..05 (story §Test Scenarios).

### Audit Requirements

* No `AdminAction` (no es flujo admin).
* Log estructurado `tasks.list.requested` con `correlation_id`, `actor_id`, `event_id`.

### Sensitive Data Handling

* Logs sin PII: no se loguean `title` ni `description`.
* Response sin payloads del LLM ni metadata sensible (`BR-AI-010`).

---

## 13. Testing Strategy

### Unit Tests

* `listEventTasksQuerySchema` — Zod tolerante: cada filtro inválido se descarta y se acumula en `filtersDropped`.
* `TaskListItemMapper` — Mapping de fila DB → DTO con redacción de campos sensibles.
* `ListEventTasksUseCase` — Orquestación con mocks de policy + repo.
* `EventOwnershipPolicy.assertOwnership` — happy + ajeno + soft-deleted → `EventNotFoundError`.

### Integration Tests

* TS-01 Listado por defecto con tareas mixtas (manuales + IA).
* TS-02 Filtro por `status=pending`.
* TS-03 Filtro por `aiGenerated=true` expone `ai_recommendation_id`.
* TS-04 Filtro por `categoryCode='catering'` y por `categoryCode='null'`.
* TS-05 Paginación explícita `?page=2&pageSize=20` con cuenta total correcta.
* TS-06 Ordenamiento `due_date ASC NULLS LAST, created_at DESC`.
* TS-08 i18n con `Accept-Language=pt`.

### API Tests

* Supertest contra el controller registrado.
* NT-01..NT-11 (story §Test Scenarios → Negative Tests).

### E2E Tests

* TS-07 Estado vacío con dual CTAs (Playwright).
* Modo read-only por `event.status='completed'` (Playwright).
* Estado bloqueado por `event.status='cancelled'` (Playwright).

### Security Tests

* AUTH-TS-01..05 (Supertest con cookies de cada rol).
* No-revelación: ajeno y soft-deleted ambos retornan `404` con la misma forma.

### Accessibility Tests

* axe-core sobre `TaskList` + `TaskFilters` + `EmptyChecklistState`.
* Test de navegación por teclado completa (Tab/Shift+Tab/Enter).
* Anuncio `aria-live` al cambiar de página.
* Contraste WCAG AA en badges.

### AI Tests

No aplica.

### Seed / Demo Tests

* Verificación de que la demo data sembrada (de US-018 + US-025) aparece correctamente filtrable.

### CI Checks

* Test de performance con dataset de 200 tareas: P95 ≤ 1.5 s.
* Lint + typecheck + tests unitarios + integration + E2E críticos en pipeline.

---

## 14. Observability & Audit

### Logs

* `tasks.list.requested` con: `correlation_id`, `actor_id`, `event_id`, `filters.applied`, `filters.dropped`, `items_count`, `page`, `pageSize`, `latency_ms`, `status_code`.

### Correlation ID

* Header `X-Correlation-Id` propagado por el middleware (`NFR-OBS-001`); generado si no viene del cliente.

### AdminAction

No aplica.

### Error Tracking

* Errores `5xx` enviados a Sentry con `correlation_id` y `event_id`.
* Errores `404`/`403`/`401` registrados como `level=warn` sin alertas.

### Metrics

* `tasks_list_latency_ms` (histograma).
* `tasks_list_total` (counter por status code).
* `tasks_list_items_returned` (histograma).

---

## 15. Seed / Demo Data Impact

### Seed Data Required

No aplica. El seed de tareas (manuales e IA) se cubre en `PB-P1-018` (US-028..030) y en US-018.

### Demo Scenario Supported

* Organizer abre `/organizer/events/:id/tasks`.
* Lista paginada con badges IA / estado.
* Aplica filtros y navega paginación.
* Estado vacío en evento sin tareas con dual CTAs.

### Reset / Isolation Notes

* La vista respeta el reset de demo data (US-025/US-031 producen tareas IA confirmadas; US-028 produce manuales).

---

## 16. Documentation Alignment Required

| Document / Source | Conflict | Current Decision | Recommended Action | Blocks Implementation? |
|---|---|---|---|---|
| `/docs/16` §28 | Documenta paginación canónica (`page=1`, `pageSize=20`, máx `100`). El draft original sugería `10` por defecto. | Se adopta `20` por defecto, alineado con US-013 y `/docs/16`. | Cleanup editorial en `/docs/16` si falta consistencia. | No |
| `/docs/10` | `NFR-PERF-API-001` (stale) → canónico `NFR-PERF-001` + `NFR-PERF-005` (paginación). | Se usa `NFR-PERF-001/005` en US-027 y este tech spec. | Cleanup editorial en `/docs/10`. | No |
| `/docs/16` snapshot OpenAPI | El endpoint `GET /events/:eventId/tasks` con filtros tolerantes debe reflejarse en el snapshot. | Pendiente regeneración. | Coordinar vía US-098. | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Paginación lenta para eventos con miles de tareas | Latencia P95 > 1.5 s | Índice compuesto canónico cubre los casos comunes; MVP asume ≤ 200 tareas por evento. Test de performance en CI con dataset 200. |
| Filtros inválidos silenciosos confunden al cliente | UX poco descubrible | Log estructurado `filters.dropped` con `reason` para debugging; frontend NO recibe error pero puede inspeccionar `filters.applied` vs request. Documentación OpenAPI explícita. |
| Conflicto de schema con US-028..030 al introducir mutaciones | Inconsistencia DTO | Contrato `TaskListItemDto` se establece en US-027; US-028..030 deben mantener compatibilidad backward. |
| `COUNT(*)` en eventos grandes degrada latencia | Performance | MVP: aceptable (≤ 200 tareas). Future: `COUNT` estimado o materialización si crece. |
| Trazabilidad IA expuesta accidentalmente con payloads | Filtrado de información sensible | Mapper explícito; tests verifican que el DTO NO incluye `prompt_version_id`, `llm_provider`, payloads. |

---

## 18. Implementation Guidance for Coding Agents

### Files / Folders Impacted

Backend:

* `src/modules/tasks/list/application/use-cases/list-event-tasks.use-case.ts` (nuevo)
* `src/modules/tasks/list/application/dtos/task-list-item.dto.ts` (nuevo)
* `src/modules/tasks/list/application/dtos/list-event-tasks-response.dto.ts` (nuevo)
* `src/modules/tasks/list/domain/errors/list-event-tasks.errors.ts` (nuevo)
* `src/modules/tasks/list/infrastructure/repositories/event-task-list.repository.ts` (nuevo)
* `src/modules/tasks/list/infrastructure/mappers/task-list-item.mapper.ts` (nuevo)
* `src/modules/tasks/list/interface/http/controllers/list-event-tasks.controller.ts` (nuevo)
* `src/modules/tasks/list/interface/http/schemas/list-event-tasks.schema.ts` (nuevo)
* `src/modules/tasks/tasks.module.ts` (modificar para registrar el controller y use case)
* `src/modules/events/policies/event-ownership.policy.ts` (reuso o nuevo si no existe)

Frontend:

* `apps/web/app/[locale]/organizer/events/[id]/tasks/page.tsx` (nuevo)
* `apps/web/features/tasks/components/EventChecklistPage.tsx` (nuevo)
* `apps/web/features/tasks/components/TaskList.tsx` (nuevo)
* `apps/web/features/tasks/components/TaskListItem.tsx` (nuevo)
* `apps/web/features/tasks/components/TaskFilters.tsx` (nuevo)
* `apps/web/features/tasks/components/EmptyChecklistState.tsx` (nuevo)
* `apps/web/features/tasks/components/Pagination.tsx` (nuevo o reusado de US-013)
* `apps/web/features/tasks/hooks/useEventTasks.ts` (nuevo)
* `apps/web/features/tasks/api/tasksApi.ts` (extender con `list`)
* `apps/web/messages/{es-LATAM,es-ES,pt,en}.json` (agregar claves)

### Recommended Order of Implementation

1. DB: verificar índice `idx_event_tasks_event_status_due` en `/docs/18`.
2. Backend Zod schemas con `.catch()` tolerante.
3. Backend repository `findByEventPaginated`.
4. Backend mapper `EventTask → TaskListItemDto`.
5. Backend use case `ListEventTasksUseCase`.
6. Backend controller + cableado del módulo + ownership policy + guards.
7. Backend tests unit + integration.
8. Frontend hook `useEventTasks` con TanStack.
9. Frontend `tasksApi.list`.
10. Frontend componentes `TaskList`, `TaskListItem`, `TaskFilters`, `EmptyChecklistState`.
11. Frontend page Server Component con SSR de la primera página.
12. Frontend i18n keys en 4 locales.
13. Frontend tests E2E.
14. QA: tests de performance (200 tareas) y accesibilidad (axe + teclado).
15. DOC: coordinar snapshot OpenAPI vía US-098.

### Decisions That Must Not Be Reopened

* Paginación page-based `pageSize=20` default / `100` máx (decisión PO 8.1, US-013, `/docs/16` §28).
* Filtros inválidos descartados silenciosamente con log (decisión PO 8.1).
* Ordenamiento por `due_date ASC NULLS LAST, created_at DESC`.
* Soft delete enforced en TODOS los queries.
* Admin → `403` (debe usar endpoint admin de US-016).
* No-revelación: ajeno/inexistente/soft-deleted → `404`.
* DTO NO expone payloads del LLM ni metadata sensible.

### What Must Not Be Implemented

* Endpoint admin global (`/admin/events/:id/tasks`).
* Mutaciones (US-028..030 / US-031).
* Filtros temporales (US-032).
* Cálculo de % progreso (US-033).
* Búsqueda full-text.
* Caching del listado en MVP.

### Assumptions to Preserve

* `EventTask.confirmed_at` se persiste por US-031 al pasar de `pending` a `in_progress`.
* `EventTask.ai_generated` se setea por US-018 + US-025 strategy `checklist`.
* `Event.owner_user_id` se persiste por US-009 al crear el evento.

---

## 19. Task Generation Notes

### Suggested Task Groups

* DB: verificación de índice (sin migración).
* BE: schemas, repository, mapper, use case, controller, ownership policy, admin guard.
* API: cableado del controller en el módulo y la ruta.
* SEC: `OrganizerRoleGuard` (reuso) + `adminExclusionGuard` (reuso o nuevo).
* OBS: log `tasks.list.requested` + métricas Prometheus.
* FE: page Server Component, componentes Client, hook, API client, i18n.
* QA: integration tests por AC, negativos por NT, autorización por AUTH-TS, accesibilidad, performance.
* DOC: coordinación OpenAPI snapshot (US-098) + cleanup `/docs/10` y `/docs/16`.

### Required QA Tasks

* TS-01..08 (8 functional/integration).
* NT-01..11 (11 negative).
* AUTH-TS-01..05 (5 authorization).
* Accessibility (axe + teclado + aria-live).
* Performance con dataset 200 tareas: P95 ≤ 1.5 s.

### Required Security Tasks

* `OrganizerRoleGuard` aplicado al endpoint.
* `adminExclusionGuard` aplicado al endpoint.
* `EventOwnershipPolicy.assertOwnership` invocado en el use case.
* Logs sin PII (verificación en tests).

### Required Seed/Demo Tasks

No aplica (seed propio de tareas se cubre en US-028..030 y US-018).

### Required Documentation Tasks

* DOC-001: coordinar regeneración del snapshot OpenAPI vía US-098.
* DOC-002: cleanup editorial en `/docs/10` (NFR ID stale) y `/docs/16` (paginación canónica).

### Dependencies Between Tasks

* QA tests dependen de BE controller + FE componentes.
* FE depende de BE + Zod schemas + DTO contract.
* DOC depende de BE controller estable.

### Consolidated `tasks.md` for Backlog Item

Sí, recomendado a nivel `PB-P1-018` al finalizar US-027..US-030 para consolidar la vista del backlog item completo.

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

`Ready for Task Breakdown`

US-027 está totalmente alineada con la decisión PO formalizada (`/docs/16` §28, US-013, PB-P1-018 Acceptance Summary), no introduce migraciones nuevas, reusa la fundación de `event_tasks` y los guards/policies estándar. Las 3 alineaciones documentales son no bloqueantes (cleanup editorial + snapshot OpenAPI). El endpoint es de lectura puro, sin invocación al `LLMProvider`, sin transacciones de mutación y con telemetría liviana. La cobertura QA es completa: 8 functional, 11 negative, 5 authorization, accesibilidad y performance.
