# Technical Specification — US-028: Crear tarea manual del checklist (Organizer)

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-028 |
| Source User Story | `management/user-stories/US-028-create-manual-task.md` |
| Decision Resolution Artifact | No aplica (no requerido) |
| Priority | P1 |
| Backlog ID | PB-P1-018 |
| Backlog Title | CRUD de tareas manuales y máquina de estados |
| Backlog Execution Order | 37 (P0: 18 + posición 19 en P1) |
| User Story Position in Backlog Item | 2 de 4 |
| Related User Stories in Backlog Item | US-027, US-028, US-029, US-030 |
| Epic | EPIC-TASK-001 — Checklist & Task Management |
| Backlog Item Dependencies | PB-P0-001, PB-P1-006, PB-P1-019 (opcional para prefill de categoría) |
| Feature | Creación manual de `EventTask` (origen no IA) |
| Module / Domain | Tasks |
| User Story Status | Approved |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-06-26 |
| Last Updated | 2026-06-26 |

---

## 2. Backlog Execution Context

### Product Backlog Item

`PB-P1-018 — CRUD de tareas manuales y máquina de estados`. Agrupa la gestión manual del checklist: ver (US-027), crear (US-028), editar (US-029) y eliminar (US-030). US-028 es la **mutación de entrada** del checklist manual: introduce nuevas `EventTask` con `ai_generated=false` y reusa el contrato `TaskListItemDto` establecido por US-027 para que la UI invalide la query sin un GET adicional.

### Execution Order Rationale

US-028 se implementa después de US-027 porque:

1. Reusa el contrato `TaskListItemDto` y el `EventTaskListRepository` (extensión con método `create`) ya introducidos en US-027.
2. Reusa la `EventOwnershipPolicy`, `OrganizerRoleGuard` y `adminExclusionGuard` ya cableados.
3. La UI del modal `CreateTaskDialog` se activa desde el `EmptyChecklistState` y la barra de acciones de US-027.

Por estructura, se implementa entre US-027 y US-029 dentro del mismo Backlog Item.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item | Suggested Order |
|---|---|---|
| US-027 | Vista de lectura paginada (contrato DTO + invariantes) | 1 |
| US-028 | Crear `EventTask` manual | 2 |
| US-029 | Editar tarea manual + transiciones de estado | 3 |
| US-030 | Eliminar (soft delete) tarea manual | 4 |

---

## 3. Executive Technical Summary

US-028 implementa un endpoint REST de mutación `POST /api/v1/events/:eventId/tasks` que crea una `EventTask` con origen manual (`ai_generated=false`, `ai_recommendation_id=null`) y estado inicial canónico `pending` (`C-027`, `FR-TASK-004`). El body Zod (`title 2..200`, `description? ≤2000`, `due_date? ISO-8601 future con ±60 s skew`, `category_code? slug activo`) es tolerante a campos extras y a campos server-controlled (`ai_generated`, `status`, `id`, `created_by_user_id`, `language_code`, etc.) que se descartan silenciosamente con log `body.ignoredFields`. La autorización es backend-only: ownership sobre `Event`, vendor → `403`, admin → `403` (`FR-ADMIN-010`), evento ajeno/soft-deleted → `404` (no-revelación). Eventos `cancelled`/`completed` → `409 EVENT_NOT_MUTABLE` antes de tocar `event_tasks`. La verificación de mutabilidad es atómica con la inserción (`prismaService.$transaction` con `SELECT FOR UPDATE` corto sobre `events` o lock advisory por `event_id`) para evitar tareas huérfanas en eventos transitando a `cancelled`. La validación de `category_code` consulta `ServiceCategory.code` con `is_active=true` (reuso de la fundación catalog de US-019/US-020). Response `201 Created` con el mismo `TaskListItemDto` que US-027 para cache invalidation sin GET. Telemetría: log estructurado `tasks.created` sin `title`/`description` (potencial PII) y métricas `tasks_created_total{ai_generated="false"}`, `tasks_created_latency_ms`. Sin migraciones nuevas: reusa el esquema de `event_tasks` y `service_categories` consolidado por US-027 y la fundación catálogo.

---

## 4. Scope Boundary

### In Scope

* Endpoint `POST /api/v1/events/:eventId/tasks` con body Zod tolerante.
* `CreateEventTaskUseCase` con orquestación atómica (ownership + mutabilidad + validación de categoría + inserción + auditoría).
* Extensión de `EventTaskRepository` con `create(payload)` (reuso del módulo creado por US-027).
* `ServiceCategoryReadPort.findActiveByCode(category_code)` (reuso o creación si no existe).
* Zod schemas `createEventTaskParamsSchema` (path) y `createEventTaskBodySchema` (body con `.strip()` + log `body.ignoredFields`).
* `EventOwnershipPolicy` + `OrganizerRoleGuard` + `adminExclusionGuard` (reuso de US-027).
* Mapper `EventTask → TaskListItemDto` (reuso de US-027).
* Telemetría: log `tasks.created` + métricas `tasks_created_total{ai_generated="false"}` y `tasks_created_latency_ms`.
* Frontend: `CreateTaskDialog` invocado desde la lista (US-027) y desde el empty state, con form RHF + Zod, mutation TanStack `useCreateEventTask`, cache invalidation de `['tasks', eventId, ...]`.
* i18n para 4 locales (`es-LATAM` default, `es-ES`, `pt`, `en`) en labels, placeholders y mensajes de error.
* Tests funcionales, negativos, autorización, concurrencia y accesibilidad.

### Out of Scope

* Editar una tarea ya creada (US-029).
* Transicionar estado (`pending → in_progress → done | skipped`) — US-029.
* Eliminar / cancelar la tarea (US-030; soft delete).
* Confirmar tareas IA en bloque (US-031; sólo aplica a `ai_generated=true`).
* Asignar la tarea a otros usuarios (Future).
* Subtareas anidadas, recurrencia.
* Recordatorios push o email basados en `due_date` (Future).
* Crear tarea por voz, adjuntos o `Idempotency-Key` (Future).
* Bulk create (`POST` con array) — Future.
* Override de `language_code` en la tarea (siempre heredado de `event.language_code`).
* Selección automática de categoría por LLM (la sugerencia es prefill UX desde US-020; el backend no invoca IA).
* Migraciones nuevas en `event_tasks` o `service_categories`.

### Explicit Non-Goals

* Devolver `400` por keys extras en el body: se descartan silenciosamente con log (decisión PO US-028 §3).
* Aceptar `ai_generated`, `status`, `id`, `created_by_user_id`, `language_code`, `confirmed_at`, `created_at`, `updated_at`, `deleted_at`, `ai_recommendation_id` desde el cliente: nunca; se descartan y logean en `body.ignoredFields` (`SEC-08`).
* Distinguir entre evento ajeno, inexistente o soft-deleted en la respuesta: todos resuelven a `404 NOT_FOUND` (no-revelación, `SEC-04`).
* Recalcular el progreso del evento (`FR-TASK-007`) en este endpoint: lo calculan US-033 / US-014.
* Idempotencia por `Idempotency-Key`: la UI mitiga vía TanStack disabling.

---

## 5. Architecture Alignment

### Backend Architecture

Modular Monolith bajo `src/modules/tasks/`. Submódulo nuevo `create/` paralelo a `list/` (US-027):

* `application/use-cases/create-event-task.use-case.ts`
* `application/dtos/create-event-task-request.dto.ts`
* `domain/errors/create-event-task.errors.ts` (`EventNotFoundError` reusado, `EventNotMutableError`, `CategoryNotAvailableError`, `RoleNotAllowedError` reusado)
* `infrastructure/repositories/event-task-create.repository.ts` (o método `create` agregado al `EventTaskListRepository` renombrado a `EventTaskRepository`)
* `infrastructure/ports/service-category-read.port.ts` + adapter Prisma
* `interface/http/controllers/create-event-task.controller.ts`
* `interface/http/schemas/create-event-task.schema.ts`

El controller delega al use case. El use case orquesta:

1. `OrganizerRoleGuard` + `adminExclusionGuard` (middleware o middleware-equivalente del controller).
2. `EventOwnershipPolicy.assertOwnership(actorId, eventId)` con `404` no-revelación.
3. Dentro de `prismaService.$transaction(['serializable'])` corto:
   * `SELECT FOR UPDATE` o `pg_advisory_xact_lock(hashtext(event_id::text))` sobre `events` para asegurar atomicidad con cambios de `status`/`deleted_at`.
   * Verificación de `event.status ∈ {draft, active}` y `event.deleted_at IS NULL`. Caso contrario → `EventNotMutableError` (409) o `EventNotFoundError` (404) según corresponda.
   * Si `category_code` no `null`: `ServiceCategoryReadPort.findActiveByCode(category_code)` → si no existe o `is_active=false` → `CategoryNotAvailableError` (400).
   * `EventTaskRepository.create({...})` con valores canónicos server-controlled (`status='pending'`, `ai_generated=false`, `ai_recommendation_id=null`, `language_code=event.language_code`, `created_by_user_id=actor.id`, `confirmed_at=null`, `deleted_at=null`, `created_at=now()`, `updated_at=created_at`).
4. `TaskListItemMapper.toDto(row, acceptLanguage)` (reuso de US-027).
5. Emit log `tasks.created` con `body.ignoredFields` si aplica.

### Frontend Architecture

Next.js App Router. Reusa la vista de US-027 `app/[locale]/organizer/events/[id]/tasks/page.tsx`. Se agregan:

* `features/tasks/components/CreateTaskDialog.tsx` (Client Component, `role="dialog"` con `aria-modal="true"`).
* `features/tasks/components/TaskTitleField.tsx`, `TaskDescriptionField.tsx`, `TaskDueDateField.tsx`, `TaskCategoryCombobox.tsx`.
* `features/tasks/hooks/useCreateEventTask.ts` (TanStack `useMutation` con `onSuccess` que llama `queryClient.setQueryData` para inyectar la nueva fila y/o `invalidateQueries(['tasks', eventId])`).
* `features/tasks/api/tasksApi.ts` extiende `create({ eventId, payload })`.
* `features/tasks/forms/createEventTaskFormSchema.ts` (Zod mirror del schema backend con tolerancia local para input date/datetime).

Reusa `Pagination` y `EmptyChecklistState` (de US-027) para el flujo de "crear tarea desde el empty state".

### Database Architecture

PostgreSQL + Prisma. Reusa todo el esquema y los enums sembrados por la fundación `PB-P1-018` y la fundación AI-001 (US-017):

* `event_tasks`: columnas `id`, `event_id`, `title`, `description`, `due_date`, `status` (default `'pending'`), `category_code`, `ai_generated` (default `false`), `ai_recommendation_id`, `confirmed_at`, `language_code`, `created_by_user_id`, `created_at`, `updated_at`, `deleted_at`.
* `events`: read con lock para mutabilidad.
* `service_categories`: read para validar `code` con `is_active=true`.

Sin migraciones nuevas en US-028.

### API Architecture

REST JSON bajo `/api/v1`. Patrón POST canónico (`/docs/16`) con body Zod, respuesta `201 Created` con el recurso creado, header `Location` apuntando al `taskId`. Sin caching. Sin idempotency en MVP.

### AI / PromptOps Architecture

No aplica. US-028 no invoca al `LLMProvider`, no genera ni modifica `AIRecommendation`. El campo `ai_generated=false` y `ai_recommendation_id=null` son server-controlled. La sugerencia UX de `category_code` desde US-020 (IA-004) se materializa en el frontend leyendo el response de US-020 y poblando el combobox; el backend de US-028 sólo valida la categoría enviada contra el catálogo.

### Security Architecture

* Autenticación: cookie HTTP-only con sesión vigente. Sin sesión → `401`.
* Autorización: `OrganizerRoleGuard` (rol `organizer` requerido); `EventOwnershipPolicy` sobre `event_id` del path; `adminExclusionGuard` (`FR-ADMIN-010`).
* No-revelación: evento ajeno, inexistente o soft-deleted → `404 NOT_FOUND`.
* Eventos `cancelled`/`completed` → `409 EVENT_NOT_MUTABLE`.
* Server-controlled fields del cliente se descartan silenciosamente (`SEC-08`); nunca se aceptan como input para evitar bypass de `ai_generated` o `status`.
* Logs sin PII (`SEC-06`): no se loguean `title` ni `description`.
* Backend como source of truth para autorización; el frontend no consulta DB directamente.

### Testing Architecture

* Vitest para unit tests del use case, mapper, validadores Zod y `ServiceCategoryReadPort` adapter.
* Supertest para integration tests del endpoint (happy, server-controlled fields, validaciones, autorización, mutabilidad).
* Playwright para E2E del flujo "abrir modal → completar → submit → ver en lista" y "doble click sin doble creación".
* axe-core + tests de navegación por teclado para accesibilidad del modal.
* Test de concurrencia: creación + cambio de evento a `cancelled` simultáneos → o `201` o `409`, nunca tarea huérfana.

---

## 6. Functional Interpretation

| Acceptance Criterion | Technical Interpretation | Impacted Layer(s) |
|---|---|---|
| AC-01 Crear con título solamente | Body Zod acepta `{ title }`; defaults canónicos del repo y la DB; `201` + `TaskListItemDto` + log `tasks.created` | Backend, DB |
| AC-02 Crear con todos los campos | Body Zod valida `description`, `due_date` futura, `category_code` activo; persiste tal cual | Backend, DB |
| AC-03 Server-controlled fields no modificables | Zod `.strip()` + post-parse diff registra `body.ignoredFields`; los valores enviados son ignorados y se usan los canónicos | Backend |
| AC-04 Categoría `null` explícita | Zod permite `category_code: null`; persiste como NULL; response refleja `null` | Backend, DB |
| AC-05 i18n del response y errores | Middleware i18n con `Accept-Language` resuelve mensajes; códigos de error permanecen en inglés | Backend |
| EC-04 `due_date` en el pasado | Zod refine con `now() - 60s` tolerancia; `400 DUE_DATE_IN_PAST` | Backend |
| EC-07 Evento no mutable | `EventNotMutableError → 409`; `EventNotFoundError → 404` para soft-deleted | Backend |
| EC-08 Carrera contra cambio de estado | `prismaService.$transaction` con `SELECT FOR UPDATE` corto sobre `events` | Backend, DB |
| EC-11 Body con keys extras | Zod `.strip()` + log `body.ignoredFields`; `201` | Backend |
| EC-12 Content-Type inválido | Middleware Express acepta solo `application/json`; `415` o `400 INVALID_JSON` | Backend |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

* `src/modules/tasks/create/` (nuevo submódulo de mutación).
* Reuso de `src/modules/tasks/list/` (de US-027): `EventTaskRepository` (extender con `create`), `TaskListItemMapper`, `TaskListItemDto`.
* Reuso de `src/modules/events/policies/event-ownership.policy.ts`.
* Reuso de `src/modules/auth/guards/organizer-role.guard.ts` y `admin-exclusion.guard.ts`.
* Nuevo o reuso: `src/modules/catalog/service-category-read.port.ts` (adapter Prisma sobre `service_categories`).

### Use Cases / Application Services

```text
CreateEventTaskUseCase.execute(input: {
  actorId: string;
  eventId: string;
  body: CreateEventTaskRequestDto;
  ignoredFields: string[];
  acceptLanguage: SupportedLocale;
  correlationId: string;
}): Promise<TaskListItemDto>
```

Orquesta:

1. `EventOwnershipPolicy.assertOwnership(actorId, eventId)` → `EventNotFoundError` si no aplica.
2. `prismaService.$transaction(async (tx) => { ... })` con:
   * `tx.event.findUnique({ where: { id: eventId }, select: { status, deleted_at, language_code } })` precedido de `pg_advisory_xact_lock(hashtext(eventId))` o `SELECT FOR UPDATE`.
   * Si `deleted_at IS NOT NULL` → `EventNotFoundError` (404 no-revelación).
   * Si `status ∈ {cancelled, completed, deleted}` → `EventNotMutableError(status)` (409).
   * Si `body.category_code` !== `null` && !== `undefined`: `serviceCategoryReadPort.findActiveByCode(body.category_code, tx)` → si no existe o inactiva → `CategoryNotAvailableError`.
   * `tx.eventTask.create({ data: { ...canonical }, select: { ... } })`.
3. `TaskListItemMapper.toDto(row, acceptLanguage)`.
4. Emit log `tasks.created` con `correlation_id`, `actor_id`, `event_id`, `task_id`, `ai_generated=false`, `has_due_date`, `has_category`, `language_code`, `latency_ms`, `body.ignoredFields?`.

### Controllers / Routes

```text
POST /api/v1/events/:eventId/tasks
  → CreateEventTaskController.handle(req, res)
    → assert Content-Type === application/json (else 415)
    → validate path with createEventTaskParamsSchema
    → validate body with createEventTaskBodySchema (.strip + diff → ignoredFields)
    → assert role organizer + non-admin (guards)
    → invoke CreateEventTaskUseCase
    → return 201 Created + Location header + TaskListItemDto body
```

Thin controller; sin lógica de negocio.

### DTOs / Schemas

`CreateEventTaskRequestDto` (interno, post-parse):

```typescript
{
  title: string;                          // 2..200
  description: string | null;             // 0..2000 | null
  due_date: string | null;                // ISO-8601 con offset | null
  category_code: string | null;           // slug | null
}
```

`TaskListItemDto` (response — reuso de US-027 sin cambios).

Zod schemas:

```typescript
createEventTaskParamsSchema = z.object({
  eventId: z.string().uuid(),
});

const ServerControlledKeys = z.enum([
  'ai_generated', 'ai_recommendation_id', 'status', 'id',
  'created_by_user_id', 'created_at', 'updated_at',
  'deleted_at', 'confirmed_at', 'language_code',
]);

createEventTaskBodySchema = z
  .object({
    title: z.string().trim().min(2).max(200),
    description: z.string().max(2000).nullable().optional().transform(v => v ?? null),
    due_date: z
      .string()
      .datetime({ offset: true })
      .nullable()
      .optional()
      .transform(v => v ?? null)
      .refine(
        v => v === null || new Date(v).getTime() >= Date.now() - 60_000,
        { message: 'DUE_DATE_IN_PAST', path: ['due_date'] },
      ),
    category_code: z.string().min(1).max(64).nullable().optional().transform(v => v ?? null),
  })
  .strip(); // descartar campos extras silenciosamente

// Diff entre keys del body raw y keys del schema → ignoredFields (incluyendo server-controlled).
```

El controller calcula `ignoredFields` comparando las keys del JSON crudo contra las del schema, y las loguea sin alterar el use case.

### Repository / Persistence

Extender `EventTaskRepository` (de US-027) con:

```typescript
async create(input: {
  eventId: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  categoryCode: string | null;
  status: 'pending';
  aiGenerated: false;
  aiRecommendationId: null;
  languageCode: SupportedLocale;
  createdByUserId: string;
}, tx: Prisma.TransactionClient): Promise<EventTaskRow>
```

Implementación Prisma con `tx.eventTask.create({ data, select })`. El `select` debe coincidir con el shape requerido por `TaskListItemMapper`.

### Validation Rules

| VR | Implementación |
|---|---|
| VR-01 `eventId` UUID v4 | Zod `.uuid()` en path → `400 VALIDATION` |
| VR-02 evento existe + ownership | `EventOwnershipPolicy` → `EventNotFoundError → 404` |
| VR-03 evento mutable | Verificación dentro de la transacción → `EventNotMutableError → 409` o `EventNotFoundError → 404` (soft-deleted) |
| VR-04 `title` 2..200 sin solo whitespace | Zod `.trim().min(2).max(200)` |
| VR-05 `description` 0..2000 nullable | Zod `.max(2000).nullable().optional()` |
| VR-06 `due_date` ISO-8601 con offset, nullable | Zod `.datetime({ offset: true }).nullable().optional()` |
| VR-07 `due_date` futura con skew 60 s | Zod `.refine()` con `Date.now() - 60_000` |
| VR-08 `category_code` activa | Lookup en `ServiceCategoryReadPort` → `CategoryNotAvailableError → 400` |
| VR-09 server-controlled fields descartados | Zod `.strip()` + diff externo |
| VR-10 Content-Type JSON | Middleware Express `express.json()` con verificación previa de `Content-Type` |

### Error Handling

| Error | HTTP | Code | `details` |
|---|---|---|---|
| `eventId` UUID inválido | 400 | `VALIDATION` | `{ field: 'eventId' }` |
| Body Zod inválido (title, description, due_date format) | 400 | `VALIDATION` | `{ field, reason: 'min_length' | 'max_length' | 'invalid_format' | 'required' }` |
| `due_date` en el pasado | 400 | `DUE_DATE_IN_PAST` | `{ field: 'due_date' }` |
| Categoría inexistente o inactiva | 400 | `CATEGORY_NOT_AVAILABLE` | `{ field: 'category_code' }` |
| Evento ajeno / inexistente / soft-deleted | 404 | `NOT_FOUND` | — |
| Evento `cancelled` / `completed` | 409 | `EVENT_NOT_MUTABLE` | `{ event_status }` |
| Sin sesión | 401 | `UNAUTHORIZED` | — |
| Rol vendor | 403 | `FORBIDDEN` | — |
| Rol admin | 403 | `FORBIDDEN` | `{ use_endpoint: '/api/v1/admin/...' }` (hint sin filtrar IDs) |
| Content-Type no JSON | 415 | `UNSUPPORTED_MEDIA_TYPE` | — |
| Body no parseable | 400 | `INVALID_JSON` | — |
| Error inesperado | 500 | `INTERNAL_ERROR` | — |

### Transactions

Sí. Una transacción corta `prismaService.$transaction` que envuelve:

1. Lock/SELECT FOR UPDATE sobre `events`.
2. Lookup opcional de `service_categories`.
3. `INSERT` en `event_tasks`.

Aislamiento: `'read committed'` con lock; alternativamente `pg_advisory_xact_lock(hashtext(eventId))` para evitar contención global. La transacción permite rollback automático si cualquier paso falla.

### Observability

* Log estructurado `tasks.created` con: `correlation_id`, `actor_id`, `event_id`, `task_id`, `ai_generated=false`, `has_due_date: boolean`, `has_category: boolean`, `language_code`, `latency_ms`, `status_code`, `body.ignoredFields?: string[]`.
* Métricas Prometheus:
  - `tasks_created_total{ai_generated="false", status_code}` (counter).
  - `tasks_created_latency_ms` (histograma con buckets 50, 100, 250, 500, 1000, 1500, 3000).
* Errores `5xx` enviados a Sentry con `correlation_id`, `event_id`.

---

## 8. Frontend Technical Design

### Routes / Pages

* `app/[locale]/organizer/events/[id]/tasks/page.tsx` (heredado de US-027); el modal `CreateTaskDialog` se invoca desde `EmptyChecklistState` (US-027) y desde una barra de acciones añadida al `EventChecklistPage`.

### Components

* `CreateTaskDialog` (Client Component, `role="dialog"`, `aria-modal="true"`, focus trap, cierre por `Esc`).
* `TaskTitleField` (input texto con `aria-describedby` y contador 2..200).
* `TaskDescriptionField` (textarea con contador 0..2000).
* `TaskDueDateField` (date-time picker con TZ del usuario; serializa a ISO-8601 UTC).
* `TaskCategoryCombobox` (reusa el endpoint de categorías; opción "Sugerida por IA" cuando hay prefill desde US-020).
* `FormErrorBanner` (banner global para `409`, `404`, `403`).
* `TaskCreatedToast` (mensaje "Tarea creada").

### Forms

* React Hook Form + Zod (`createEventTaskFormSchema`).
* Validación local: `title.trim().length ∈ [2..200]`, `description.length ≤ 2000`, `due_date >= now()`, `category_code` opcional.
* Submit deshabilitado mientras `isDirty=false` o `isSubmitting=true`.

### State Management

* TanStack `useMutation` con cache key `['tasks', 'create', eventId]`.
* `onSuccess(newTask)`:
  - `queryClient.setQueryData(['tasks', eventId, currentFilters, 1, pageSize], updater)` para inyectar la nueva fila al inicio de la primera página (o invalidar si los filtros no la incluyen).
  - `queryClient.invalidateQueries({ queryKey: ['tasks', eventId] })` para refrescar conteos y otras páginas.
* `onError(error)`:
  - Mapear `details.field` a mensajes inline por campo.
  - Banner global para `409`, `404`, `403`.

### Data Fetching

* `tasksApi.create({ eventId, payload })` (POST JSON).
* SSR: no aplica (mutación).

### Loading / Empty / Error / Success States

| Estado | Implementación |
|---|---|
| Loading | Botón "Crear tarea" en `loading` con spinner y `disabled` |
| Empty | No aplica al modal; el empty state pertenece a US-027 |
| Error inline | Mensaje por campo con `aria-live="assertive"` |
| Error global | `FormErrorBanner` con código traducido + opción "Reintentar" o "Cerrar" |
| Success | Cierre del modal + toast "Tarea creada" + invalidación de query |

### Accessibility

* Modal con `role="dialog"`, `aria-modal="true"`, `aria-labelledby` sobre el título.
* Focus trap en el modal; `Esc` cierra; focus retorna al disparador al cerrar.
* Cada campo con `<label>` asociado y `aria-describedby` apuntando al mensaje de error si existe.
* Mensajes de error con `aria-live="assertive"`.
* Tap target ≥ 44 px en mobile.
* Contraste WCAG AA en inputs y botones.

### i18n

* 4 locales: `es-LATAM` (default), `es-ES`, `pt`, `en`.
* Labels, placeholders, mensajes de error.
* Códigos de error permanecen en inglés en el response del backend; el frontend los mapea a copy traducido (`next-intl`).

---

## 9. API Contract Design

| Method | Endpoint | Purpose | Auth Required | Request | Response | Error Cases |
|---|---|---|---|---|---|---|
| POST | `/api/v1/events/:eventId/tasks` | Crear `EventTask` manual | Yes (organizer) | Path: `eventId` (UUID v4). Body: `{ title: string(2..200), description?: string(0..2000) \| null, due_date?: ISO-8601 \| null, category_code?: string \| null }`. Header: `Accept-Language?`, `Content-Type: application/json` | `201 Created` `TaskListItemDto` + `Location: /api/v1/events/:eventId/tasks/:taskId` | `400 VALIDATION` (path/body); `400 DUE_DATE_IN_PAST`; `400 CATEGORY_NOT_AVAILABLE`; `400 INVALID_JSON`; `401`; `403` (vendor/admin); `404` (ajeno/inexistente/soft-deleted); `409 EVENT_NOT_MUTABLE`; `415 UNSUPPORTED_MEDIA_TYPE` |

Documentación OpenAPI debe regenerarse vía US-098 (DOC-001).

---

## 10. Database / Prisma Design

### Models Impacted

* `EventTask` (insert).
* `Event` (read with row-level lock para mutabilidad).
* `ServiceCategory` (read para validar `category_code`).

### Fields / Columns

`event_tasks` (existente, sin cambios):

* Server-defaulted: `id`, `status='pending'`, `ai_generated=false`, `ai_recommendation_id=NULL`, `confirmed_at=NULL`, `deleted_at=NULL`, `created_at=now()`, `updated_at=created_at`.
* Heredados del evento: `language_code = event.language_code`, `created_by_user_id = actor.id`.
* Del body: `title`, `description`, `due_date`, `category_code`.
* `event_id`: del path.

### Relations

* `EventTask.event_id → Event.id`
* `EventTask.category_code → ServiceCategory.code` (opcional)
* `EventTask.created_by_user_id → User.id`

### Indexes

* Reusa `idx_event_tasks_event_status_due (event_id, status, due_date)` para inserción + cobertura del listado de US-027.
* Sin índices nuevos.

### Constraints

* FK `event_id` con `ON DELETE RESTRICT`.
* FK `category_code` (cuando no NULL) con `ON DELETE RESTRICT`.
* Check `language_code ∈ {es, en, pt, fr}` (reusa el del evento).
* Enum `task_status` con valor por defecto `'pending'`.

### Migrations Impact

**Ninguna nueva.** Reusa el esquema sembrado por la fundación `PB-P1-018` y AI-001 (US-017). Se incluye en `13.` un test de verificación de schema.

### Seed Impact

No aplica. El seed específico de tareas manuales puede agregarse en fixtures de tests (E2E) si es útil para la demo, pero no es bloqueante.

---

## 11. AI / PromptOps Design

No aplica.

US-028 no invoca al `LLMProvider`, no genera ni modifica `AIRecommendation`. El campo `ai_generated=false` y `ai_recommendation_id=null` son server-controlled. La sugerencia UX de `category_code` desde US-020 (IA-004) se materializa en el frontend leyendo el response de US-020 y poblando el `TaskCategoryCombobox`; el backend de US-028 sólo valida la categoría enviada contra el catálogo.

---

## 12. Security & Authorization Design

### Authentication

* Cookie HTTP-only con sesión vigente.
* Sin sesión → `401 UNAUTHORIZED`.

### Authorization

* `OrganizerRoleGuard`: el actor debe tener rol `organizer`. Vendor → `403`. Admin → `403` (`FR-ADMIN-010`).
* `EventOwnershipPolicy.assertOwnership(actorId, eventId)`: `event.owner_user_id === actorId` AND `event.deleted_at IS NULL`. Mismatch → `404` no-revelación.

### Ownership Rules

* Backend-only verificación de ownership.
* `EventTask.event_id` siempre igual al `event_id` del path (enforced por el repo).
* `EventTask.created_by_user_id = actor.id` (server-controlled).

### Role Rules

| Rol | Resultado |
|---|---|
| Organizer dueño | `201 Created` (si body válido y evento mutable) |
| Organizer no dueño | `404 NOT_FOUND` |
| Vendor | `403 FORBIDDEN` |
| Admin | `403 FORBIDDEN` (con hint `details.use_endpoint`) |
| Anónimo | `401 UNAUTHORIZED` |

### Negative Authorization Scenarios

Cubiertos en AUTH-TS-01..05 (story §Authorization Tests) y NT-14..16.

### Audit Requirements

* No `AdminAction` (no es flujo admin).
* `EventTask.created_by_user_id` persistido (auditoría intrínseca).
* Log estructurado `tasks.created` con `correlation_id`, `actor_id`, `event_id`, `task_id`.

### Sensitive Data Handling

* Logs sin PII: no se loguean `title` ni `description`.
* Server-controlled fields del cliente se descartan (`SEC-08`); nunca se aceptan como input.

---

## 13. Testing Strategy

### Unit Tests

* `createEventTaskBodySchema` — Zod con casos: `title` válido, `title` < 2, `title` > 200, `title` solo whitespace, `description` 0/2000/2001, `due_date` futuro/pasado/null/inválido, `category_code` válido/null.
* Diff `ignoredFields` — verifica que server-controlled keys aparecen en el resultado.
* `TaskListItemMapper.toDto` — reuso de tests de US-027 (sin cambios).
* `CreateEventTaskUseCase` — orquestación con mocks de `EventOwnershipPolicy`, transaction, `serviceCategoryReadPort`, repo. Cubre happy + cada error path.
* `ServiceCategoryReadPort` adapter Prisma — `is_active=true` filtra correctamente.

### Integration Tests

* TS-01 Crear con sólo `title`.
* TS-02 Crear con todos los campos.
* TS-03 `category_code=null` explícito.
* TS-04 `description=null` explícito.
* TS-05 Server-controlled fields enviados se descartan (verifica DB + log).
* TS-06 Body con keys extras (`priority`, `tags`) loguea `body.ignoredFields`.
* TS-07 i18n con `Accept-Language=pt`.

### API Tests

* Supertest contra el controller registrado.
* NT-01..NT-19 (story §Negative Tests): UUID inválido, sin título, whitespace, min/max length, fecha pasada, fecha formato inválido, categoría inexistente/inactiva, evento cancelled/completed/soft-deleted, ajeno, vendor, admin, anónimo, Content-Type, JSON inválido.

### E2E Tests

* TS-08 Playwright: abrir modal desde empty state de US-027, completar form, submit, ver tarea en lista.
* TS-09 Playwright: doble click rápido en "Crear" no genera dos tareas (UI mitiga via TanStack).

### Security Tests

* AUTH-TS-01..05 (Supertest con cookies de cada rol).
* No-revelación: ajeno/inexistente/soft-deleted retornan `404` con la misma forma.
* Server-controlled fields nunca se persisten desde el cliente (test específico TS-05).

### Accessibility Tests

* axe-core sobre `CreateTaskDialog` con focus trap activo.
* Navegación completa por teclado (Tab/Shift+Tab/Enter/Esc).
* Mensajes de error con `aria-live="assertive"`.
* Contraste WCAG AA en inputs y botones.

### AI Tests

No aplica.

### Concurrency Tests

* CONC-01 Creación + cambio de evento a `cancelled` casi simultáneos → o `201` o `409`; nunca tarea huérfana. Implementado con dos sesiones supertest concurrentes.
* CONC-02 Doble creación con mismo body sin `Idempotency-Key` → dos tareas con `id` distintos (comportamiento esperado).

### Seed / Demo Tests

No aplica.

### CI Checks

* Lint + typecheck + tests unitarios + integration + E2E críticos en pipeline.
* Performance budget (`NFR-PERF-001`): P95 ≤ 1.5 s con inserción + lock + lookup de categoría.

---

## 14. Observability & Audit

### Logs

* `tasks.created` con: `correlation_id`, `actor_id`, `event_id`, `task_id`, `ai_generated=false`, `has_due_date: boolean`, `has_category: boolean`, `language_code`, `latency_ms`, `status_code`, `body.ignoredFields?: string[]`.

### Correlation ID

* Header `X-Correlation-Id` propagado por el middleware (`NFR-OBS-001`); generado si no viene del cliente. Persistido en `event_tasks.correlation_id` (o en el log si la columna no existe).

### AdminAction

No aplica.

### Error Tracking

* Errores `5xx` enviados a Sentry con `correlation_id`, `event_id`.
* Errores `409`/`404`/`403`/`401`/`400` registrados como `level=warn` sin alertas.

### Metrics

* `tasks_created_total{ai_generated="false", status_code}` (counter).
* `tasks_created_latency_ms` (histograma).

---

## 15. Seed / Demo Data Impact

### Seed Data Required

No aplica directamente. Fixtures de tests E2E pueden necesitar al menos una `ServiceCategory` activa (ya cubierta por la fundación catálogo de US-019/US-020).

### Demo Scenario Supported

* Organizer abre `/organizer/events/:id/tasks` con el checklist vacío de un evento de demo.
* Hace click en "Crear tarea" desde el empty state.
* Completa título, fecha futura y categoría.
* Submit → la tarea aparece en la lista con badge "Manual" (sin badge IA).

### Reset / Isolation Notes

* Las tareas manuales creadas en demo se eliminan al reset.

---

## 16. Documentation Alignment Required

| Document / Source | Conflict | Current Decision | Recommended Action | Blocks Implementation? |
|---|---|---|---|---|
| `/docs/10` | `NFR-PERF-API-001` (stale); canónico `NFR-PERF-001`. | Se usa `NFR-PERF-001` en US-028 y este tech spec. | Cleanup editorial en `/docs/10`. | No |
| `/docs/8` | El draft referenciaba `UC-TASK-002`; el canónico de `/docs/9` mapea `FR-TASK-002 → UC-TASK-001`. | Se adopta `UC-TASK-001`. | Cleanup editorial en `/docs/8`. | No |
| `/docs/16` snapshot OpenAPI | El endpoint `POST /events/:eventId/tasks` debe reflejar el body Zod canónico. | Pendiente regeneración. | Coordinar vía US-098. | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Race condition: creación + cambio de evento a `cancelled` simultáneos | Tarea huérfana en evento `cancelled` | `prismaService.$transaction` con `SELECT FOR UPDATE` corto sobre `events` o `pg_advisory_xact_lock(hashtext(eventId))`; test CONC-01 verifica. |
| Cliente envía `ai_generated=true` para inflar métricas IA | Trazabilidad IA corrupta | Zod `.strip()` + diff `ignoredFields`; valor canónico `ai_generated=false` siempre; test TS-05 verifica. |
| Lookup de categoría agrega latencia | `NFR-PERF-001` P95 > 1.5 s | Cache corto (in-memory por instancia con TTL 60 s) en `ServiceCategoryReadPort` adapter; aceptable porque el catálogo cambia lentamente. |
| Skew de reloj cliente/servidor causa falsos `400 DUE_DATE_IN_PAST` | UX confusa | Tolerancia `±60 s` en el `.refine()`; UI valida también con reloj local antes de submit. |
| Lock advisory sobre `events` causa contención global | Latencia | `pg_advisory_xact_lock(hashtext(eventId))` aísla por evento; no es global. Alternativa: `SELECT FOR UPDATE` corto. |
| Frontend duplica request por doble click | Dos tareas creadas | TanStack `useMutation` deshabilita el botón durante `isLoading`; E2E TS-09 verifica. Sin idempotency en MVP. |

---

## 18. Implementation Guidance for Coding Agents

### Files / Folders Impacted

Backend:

* `src/modules/tasks/create/application/use-cases/create-event-task.use-case.ts` (nuevo)
* `src/modules/tasks/create/application/dtos/create-event-task-request.dto.ts` (nuevo)
* `src/modules/tasks/create/domain/errors/create-event-task.errors.ts` (nuevo: `EventNotMutableError`, `CategoryNotAvailableError`; reuso `EventNotFoundError`, `RoleNotAllowedError`)
* `src/modules/tasks/list/infrastructure/repositories/event-task-list.repository.ts` (modificar para agregar `create()`; renombrar a `EventTaskRepository` si se considera oportuno)
* `src/modules/catalog/infrastructure/ports/service-category-read.port.ts` (nuevo o reuso)
* `src/modules/catalog/infrastructure/adapters/prisma-service-category-read.adapter.ts` (nuevo o reuso)
* `src/modules/tasks/create/interface/http/controllers/create-event-task.controller.ts` (nuevo)
* `src/modules/tasks/create/interface/http/schemas/create-event-task.schema.ts` (nuevo)
* `src/modules/tasks/tasks.module.ts` (modificar para registrar el controller, use case y port)
* `src/modules/events/policies/event-ownership.policy.ts` (reuso)

Frontend:

* `apps/web/features/tasks/components/CreateTaskDialog.tsx` (nuevo)
* `apps/web/features/tasks/components/TaskTitleField.tsx`, `TaskDescriptionField.tsx`, `TaskDueDateField.tsx`, `TaskCategoryCombobox.tsx` (nuevos)
* `apps/web/features/tasks/forms/createEventTaskFormSchema.ts` (nuevo)
* `apps/web/features/tasks/hooks/useCreateEventTask.ts` (nuevo)
* `apps/web/features/tasks/api/tasksApi.ts` (extender con `create`)
* `apps/web/features/tasks/components/EmptyChecklistState.tsx` (modificar para cablear CTA "Crear tarea" al modal)
* `apps/web/features/tasks/components/EventChecklistPage.tsx` (modificar para añadir botón "Crear tarea" en la barra de acciones)
* `apps/web/messages/{es-LATAM,es-ES,pt,en}.json` (agregar claves del modal)

### Recommended Order of Implementation

1. DB: verificar columnas + enum + índice en `event_tasks` y `service_categories` (sin migración).
2. Backend Zod schemas (path + body) con `.strip()` + diff externo `ignoredFields`.
3. Backend `ServiceCategoryReadPort` y adapter Prisma.
4. Backend extensión del repository con `create()`.
5. Backend domain errors (`EventNotMutableError`, `CategoryNotAvailableError`).
6. Backend `CreateEventTaskUseCase` con transacción + lock + verificaciones.
7. Backend controller + cableado del módulo + guards.
8. Backend tests unit + integration (incluyendo TS-05, TS-06, CONC-01).
9. Frontend `tasksApi.create`.
10. Frontend `useCreateEventTask` hook.
11. Frontend `CreateTaskDialog` + campos + `FormErrorBanner`.
12. Frontend integración con `EmptyChecklistState` y barra de acciones.
13. Frontend i18n keys en 4 locales.
14. Frontend tests E2E (TS-08, TS-09).
15. QA: tests de concurrencia, accesibilidad (axe + teclado).
16. DOC: coordinar snapshot OpenAPI vía US-098.

### Decisions That Must Not Be Reopened

* Estado inicial canónico `pending` (`C-027`, `FR-TASK-004`).
* `ai_generated=false`, `ai_recommendation_id=null`, `language_code=event.language_code` son server-controlled.
* Body con keys extras o server-controlled se descarta silenciosamente con log (sin `400`).
* Eventos `cancelled`/`completed` → `409 EVENT_NOT_MUTABLE` antes de tocar `event_tasks`.
* Evento soft-deleted, ajeno o inexistente → `404 NOT_FOUND` (no-revelación).
* Admin → `403` con hint.
* Response `201 Created` con `TaskListItemDto` reutilizado de US-027.
* Sin `Idempotency-Key` en MVP.

### What Must Not Be Implemented

* Edición de la tarea (US-029).
* Transición de estado (`pending → in_progress → done | skipped`) — US-029.
* Eliminación (US-030).
* Bulk create.
* Asignación a múltiples usuarios.
* Recordatorios push/email basados en `due_date`.
* Selección automática de categoría por LLM (la sugerencia es prefill UX).
* `Idempotency-Key`.

### Assumptions to Preserve

* `Event.language_code` se persiste por US-009.
* `Event.status` y `Event.deleted_at` reflejan la state machine canónica de eventos.
* `ServiceCategory.is_active` ya está sembrado por la fundación catálogo (US-019/US-020).
* `EventTaskListRepository`/`TaskListItemMapper`/`TaskListItemDto` están disponibles desde US-027.

---

## 19. Task Generation Notes

### Suggested Task Groups

* DB: verificación de columnas, enum y índice (sin migración).
* BE: Zod schemas, `ServiceCategoryReadPort` + adapter, `EventTaskRepository.create`, domain errors, `CreateEventTaskUseCase`, controller, cableado del módulo.
* API: cableado del controller en el módulo y la ruta.
* SEC: aplicar `OrganizerRoleGuard`, `adminExclusionGuard` y `EventOwnershipPolicy` (reuso); test de no-revelación 404.
* OBS: log `tasks.created` + métricas Prometheus.
* FE: `CreateTaskDialog`, campos, form Zod, `tasksApi.create`, `useCreateEventTask` hook, integración con empty state y barra de acciones, i18n.
* QA: integration tests por AC, negativos por NT, autorización por AUTH-TS, concurrencia por CONC, accesibilidad por axe + teclado.
* DOC: coordinación OpenAPI snapshot (US-098) + cleanup `/docs/10` y `/docs/8`.

### Required QA Tasks

* TS-01..09 (9 functional/integration/E2E).
* NT-01..19 (19 negative).
* AUTH-TS-01..05 (5 authorization).
* CONC-01..02 (2 concurrency).
* Accessibility (axe + teclado + aria-live + focus trap).

### Required Security Tasks

* `OrganizerRoleGuard` aplicado al endpoint.
* `adminExclusionGuard` aplicado al endpoint.
* `EventOwnershipPolicy.assertOwnership` invocado en el use case.
* `Zod .strip()` + diff externo `ignoredFields` para descartar server-controlled fields.
* Logs sin PII (verificación en tests).

### Required Seed/Demo Tasks

No aplica (seed propio se cubre en fixtures de tests).

### Required Documentation Tasks

* DOC-001: coordinar regeneración del snapshot OpenAPI vía US-098.
* DOC-002: cleanup editorial en `/docs/10` (NFR ID stale) y `/docs/8` (`UC-TASK-002 → UC-TASK-001`).

### Dependencies Between Tasks

* QA depende de BE controller + FE componentes.
* FE depende de BE + Zod schemas + DTO contract.
* DOC depende de BE controller estable.
* `EventTaskRepository.create` depende de la versión de US-027 (reuso).
* `ServiceCategoryReadPort` puede compartirse con US-020/US-019 si ya existe.

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

US-028 está totalmente alineada con las decisiones PO formalizadas (`FR-TASK-002/004/011/012`, `UC-TASK-001`, `BR-TASK-001/002/006/008/009/010`, `BR-AI-008`, PB-P1-018 Acceptance Summary), no introduce migraciones nuevas, reusa la fundación de `event_tasks` y los guards/policies estándar de US-027. Las 3 alineaciones documentales son no bloqueantes (cleanup editorial + snapshot OpenAPI). El endpoint es una mutación pura sin invocación al `LLMProvider`. La cobertura QA es completa: 9 functional/E2E, 19 negative, 5 authorization, 2 concurrency, accesibilidad.
