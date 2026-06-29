# Technical Specification — US-029: Editar, transicionar estado o eliminar mi tarea (Organizer)

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-029 |
| Source User Story | `management/user-stories/US-029-edit-delete-task.md` |
| Decision Resolution Artifact | No aplica — decisiones formalizadas en US, `/docs/16` §25.2/§25.4, PO Decision PB-P1-018. |
| Priority | P1 |
| Backlog ID | PB-P1-018 |
| Backlog Title | Gestión manual de tareas (CRUD + estados) |
| Backlog Execution Order | 36 (P0: 18 + posición 18 en P1) |
| User Story Position in Backlog Item | 3 de 4 (US-027 → US-028 → **US-029** → US-030) |
| Related User Stories in Backlog Item | US-027 (listar), US-028 (crear), US-029 (editar/transicionar/eliminar), US-030 (auditoría admin / soft delete avanzado) |
| Epic | EPIC-TASK-001 — Checklist & Task Management |
| Backlog Item Dependencies | PB-P0-001 (schema), PB-P1-006 (evento creado), PB-P1-012/016/017 (US-018 + US-025 + US-031 para origen IA), PB-P0-014 (observabilidad) |
| Feature | Edición de contenido, transición de estado y soft delete de `EventTask` |
| Module / Domain | Tasks |
| User Story Status | Approved |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-06-26 |
| Last Updated | 2026-06-26 |

---

## 2. Backlog Execution Context

### Product Backlog Item

`PB-P1-018 — Gestión manual de tareas (CRUD + estados)` agrupa la operación CRUD del checklist con state machine `pending → in_progress → done | skipped`, soft delete enforced y read-only sobre eventos `completed`. Cuatro historias derivan el contrato implementable: US-027 (lectura paginada), US-028 (crear), US-029 (editar/transicionar/eliminar), US-030 (auditoría admin de soft-deleted). US-029 entrega las **tres mutaciones canónicas** definidas por `/docs/16` §25.2.

### Execution Order Rationale

US-029 se ejecuta inmediatamente después de US-028 porque:

* Reutiliza `EventTaskRepository`, `TaskListItemDto`, `TaskListItemMapper`, `EventOwnershipPolicy`, `OrganizerRoleGuard`, `adminExclusionGuard` ya entregados por US-027 (vía Tech Spec) y `ServiceCategoryReadPort` formalizado por US-028.
* La auditoría admin de tareas eliminadas (US-030) requiere que esta historia ya implemente `deleted_at` y `deleted_by_user_id` correctamente poblados.
* Los filtros temporales y % progreso (PB-P1-019 / US-032..033) consumen el state machine definitivo entregado aquí.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item | Suggested Order |
|---|---|---|
| US-027 | Listar tareas paginadas con filtros tolerantes | 1 |
| US-028 | Crear tarea manual | 2 |
| US-029 | Editar contenido + transicionar estado + soft delete | 3 |
| US-030 | Auditoría admin de tareas eliminadas (lectura) | 4 |

---

## 3. Executive Technical Summary

Implementar tres endpoints REST atómicos sobre `EventTask` siguiendo `/docs/16` §25.2: `PATCH /api/v1/events/:eventId/tasks/:taskId` (contenido), `PATCH /api/v1/events/:eventId/tasks/:taskId/status` (transición), `DELETE /api/v1/events/:eventId/tasks/:taskId` (soft delete). Las tres operaciones comparten infraestructura: `prismaService.$transaction` con `pg_advisory_xact_lock(hashtext(eventId))` para garantizar mutabilidad atómica del evento; `EventTaskMutateRepository` extendiendo el repositorio de US-027/028; reuso de `EventOwnershipPolicy`, `adminExclusionGuard` y `ServiceCategoryReadPort.findActiveByCode`. Un nuevo servicio puro `EventTaskStateMachineService` codifica las transiciones canónicas. `ai_generated`, `ai_recommendation_id` y `confirmed_at` son inmutables vía Zod `.strip()` + log `body.ignoredFields`. Las responses devuelven `TaskListItemDto` para invalidar la cache del listado de US-027 sin un GET adicional. Sin migraciones nuevas: el schema ya está sembrado por la fundación PB-P1-018 (US-027/028).

---

## 4. Scope Boundary

### In Scope

* `PATCH /api/v1/events/:eventId/tasks/:taskId` con body parcial `{ title?, description?, due_date?, category_code? }` y respuesta `200 OK` + `TaskListItemDto`.
* `PATCH /api/v1/events/:eventId/tasks/:taskId/status` con body `{ status }` validado contra state machine canónica.
* `DELETE /api/v1/events/:eventId/tasks/:taskId` (soft delete) → `204 No Content`.
* State machine `pending → {in_progress, done, skipped}`, `in_progress → {done, skipped}`. Transición a sí mismo idempotente.
* Mutabilidad atómica del evento con `pg_advisory_xact_lock` por `eventId`.
* Reuso de `EventOwnershipPolicy`, `OrganizerRoleGuard`, `adminExclusionGuard`, `EventTaskRepository`, `TaskListItemMapper` (US-027), `ServiceCategoryReadPort` (US-028).
* `EventTaskStateMachineService` nuevo (puro, sin I/O).
* Validación `category_code` activa (`is_active=true`).
* `due_date` futura solo para `status='pending'` con tolerancia ±60 s.
* Server-controlled fields descartados silenciosamente vía `.strip()` + log `body.ignoredFields` consistente con US-028.
* Auditoría: `updated_by_user_id`, `updated_at`, `correlation_id`; en DELETE también `deleted_at`, `deleted_by_user_id`.
* Telemetría: 5 logs estructurados + 4 métricas Prometheus (incluye `tasks_transition_rejected_total{reason}`).
* Frontend inline edit, `TaskStatusMenu`, `DeleteTaskDialog`; hooks TanStack con invalidación del listado de US-027; i18n 4 locales; accesibilidad WCAG AA.
* QA por AC/EC/VR/AUTH/CONC + tests de accesibilidad + budget `NFR-PERF-001`.

### Out of Scope

* Restauración self-service de tareas eliminadas (admin only en US-030 o Future).
* Hard delete por API.
* Bulk PATCH/DELETE (el bulk confirm IA lo cubre US-031).
* Edición de `ai_generated`, `ai_recommendation_id`, `confirmed_at`, `language_code`, `created_by_user_id`.
* Undo en el toast tras eliminar (Future).
* Asignación a múltiples usuarios o reasignación.
* Notificaciones push o email tras la mutación (Future).
* Endpoint admin paralelo de mutación (cubierto por flujo admin separado, US-030 solo lectura).
* Edición masiva vía CSV/import.

### Explicit Non-Goals

* No tocar `confirmed_at` aunque la transición sea hacia `in_progress` o `done` (lo gestionan US-025/US-031 exclusivamente).
* No exponer payloads del LLM ni modificar `AIRecommendation`.
* No introducir `If-Match`/`ETag` ni control optimista por revisión: el lock cooperativo más el state machine cubren la concurrencia esperada.

---

## 5. Architecture Alignment

### Backend Architecture

* Node.js 22, TypeScript estricto, Express.js bajo `/api/v1`.
* Modular Monolith + Clean/Hexagonal Architecture.
* Nuevo módulo `src/modules/tasks/mutate/` agrupando las tres mutaciones para preservar cohesión (alternativa: tres subcarpetas `update-content/`, `update-status/`, `delete/` bajo `tasks/`). Decisión técnica: una sola carpeta `mutate/` con tres use cases independientes, dado que comparten lock + ownership + repositorio.
* Reuso de `EventTaskRepository` (US-027) extendido a `EventTaskMutateRepository` con métodos `findByIdsOwnedByActor`, `updateContent`, `updateStatus`, `softDelete`.
* Servicio puro `EventTaskStateMachineService` (sin I/O, testeable con tests unitarios) que expone `assertCanTransition(from, to)` y `allowedTransitionsFrom(status)`.
* Controllers delgados que delegan en use cases; los use cases orquestan `prismaService.$transaction` con lock.

### Frontend Architecture

* Next.js 15 App Router, Client Components dentro del segmento autenticado del organizer.
* TanStack Query con tres mutations (`useUpdateEventTaskContent`, `useUpdateEventTaskStatus`, `useDeleteEventTask`).
* React Hook Form + Zod para inline edit; sin form para el status menu.
* `TaskItem` se transforma en componente con sub-componentes: `TaskItemInlineEdit`, `TaskStatusMenu`, `DeleteTaskDialog`.
* Invalidación de cache `['tasks', eventId, ...]` tras éxito; opcionalmente optimistic update con rollback en error.
* Tailwind + tokens; `next-intl` para 4 locales (`es`, `en`, `pt`, `fr`); `aria-*` y focus trap por `DeleteTaskDialog` y modales.

### Database Architecture

* Reuso de tabla `event_tasks` ya sembrada por PB-P1-018.
* Reuso del índice parcial `idx_event_tasks_event_active (event_id, status, due_date) WHERE deleted_at IS NULL` (US-027).
* Verificación: existencia de columnas `updated_at`, `updated_by_user_id`, `deleted_at`, `deleted_by_user_id`, FK a `users` con `ON DELETE RESTRICT`.
* Sin migraciones nuevas.

### API Architecture

* REST/JSON bajo `/api/v1` con envelope canónico `{ data | error: { code, message, details? } }`.
* `Content-Type: application/json` obligatorio en PATCH (`415` en otro caso).
* Códigos HTTP canónicos: 200, 204, 400, 401, 403, 404, 409, 415, 500.
* OpenAPI snapshot se regenera vía US-098 (coordinación documental).

### AI / PromptOps Architecture

No aplica — esta historia no invoca al LLM. Solo preserva el enlace `ai_recommendation_id` (inmutable) y el flag `ai_generated` (inmutable). El campo `confirmed_at` queda intacto y reservado para US-025/US-031.

### Security Architecture

* Backend como única fuente de autorización.
* Cookie HTTP-only; ningún token en `localStorage`.
* Ownership backend-only: `actor.id === event.owner_user_id`.
* `RoleGuard` rechaza `vendor` y `admin` con `403` antes de tocar la base.
* No-revelación: `404` cubre evento ajeno, tarea de otro evento y tarea soft-deleted.
* Auditoría obligatoria (`NFR-SEC-005`).
* Logs estructurados sin PII (`SEC-05`).

### Testing Architecture

* Vitest para unit tests del state machine y mappers.
* Supertest + Vitest para integration tests por endpoint.
* Playwright para E2E del flujo inline edit + transición + delete.
* MSW para tests del frontend.
* Tests de accesibilidad con `@testing-library` + `axe`.
* Concurrencia: tests con `Promise.all` y locks reales en base de pruebas.

---

## 6. Functional Interpretation

| Acceptance Criterion | Technical Interpretation | Impacted Layer(s) |
|---|---|---|
| AC-01 Editar contenido válido | Zod `updateEventTaskBodySchema` → `UpdateEventTaskContentUseCase` → repo `updateContent` dentro de `$transaction` + `pg_advisory_xact_lock` → mapper → `200 + TaskListItemDto`. Logs `tasks.updated`. | BE / API / DB / FE |
| AC-02 Transicionar estado | Zod `updateEventTaskStatusBodySchema` → `EventTaskStateMachineService.assertCanTransition` → `UpdateEventTaskStatusUseCase.updateStatus` (UPDATE condicional `WHERE id AND event_id AND status=$current AND deleted_at IS NULL`) → mapper → `200`. Logs `tasks.updated` con `previous_status`/`new_status`. | BE / API / DB / FE |
| AC-03 Soft delete | `SoftDeleteEventTaskUseCase.delete` → repo `softDelete` (UPDATE `deleted_at = now(), deleted_by_user_id = actor.id WHERE deleted_at IS NULL`) → `204`. Logs `tasks.deleted`. | BE / API / DB / FE |
| AC-04 Edición de tarea IA preserva trazabilidad | `EventTaskMutateRepository.updateContent` proyecta solo columnas editables; `ai_generated`, `ai_recommendation_id`, `confirmed_at` ausentes del UPDATE. Mapper devuelve flags intactos. | BE / DB |
| AC-05 `category_code=null` vacía | Zod permite `null`; repo aplica `category_code = NULL`. | BE / DB |
| AC-06 PATCH content y status independientes | Dos endpoints distintos con dos use cases; tests verifican que un PATCH no influye al otro y que ambos pueden encadenarse. | BE / API |
| EC-01 Evento bloqueado | Lock + lectura `event.status`; cualquiera de las tres operaciones → `409 EVENT_NOT_MUTABLE`. | BE |
| EC-02 Transición inválida | `EventTaskStateMachineService` lanza `InvalidTransitionError`; mapper a `409 INVALID_TRANSITION` con detalles. | BE |
| EC-03 Transición a sí mismo | State machine detecta `from === to`; use case no aplica UPDATE; mapea task actual a `TaskListItemDto`; log `tasks.updated.no_op`. | BE |
| EC-04 / EC-05 / EC-16 Tarea soft-deleted o inexistente | UPDATE/SELECT `WHERE deleted_at IS NULL`; affected=0 → `404`. | BE / DB |
| EC-06 PATCH content vacío | Zod `.refine(at-least-one)` → `400 EMPTY_PATCH`. | BE / API |
| EC-07 Server-controlled fields | Zod `.strip()` + diff `body.ignoredFields` con log. | BE / API |
| EC-08 / EC-09 due_date en pending vs activas | Validación condicional en use case según `currentStatus`; `400 DUE_DATE_IN_PAST` solo si `currentStatus === 'pending'`. | BE |
| EC-10 Category inválida | `ServiceCategoryReadPort.findActiveByCode` → `400 CATEGORY_NOT_AVAILABLE`. | BE |
| EC-11 Description null | Zod permite `null`; UPDATE setea NULL. | BE / DB |
| EC-12 Vendor/admin | `OrganizerRoleGuard` + `adminExclusionGuard` → `403` antes de DB. | BE |
| EC-13 Cancelación concurrente | Lock cooperativo + lectura `event.status` post-lock. | BE / DB |
| EC-14 Content-Type | Middleware estándar Express → `415`. | API |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

```
src/modules/tasks/
├── shared/                          # Existente (US-027/028)
│   ├── domain/EventTask.ts
│   ├── repositories/EventTaskRepository.ts
│   ├── mappers/TaskListItemMapper.ts
│   ├── policies/EventOwnershipPolicy.ts
│   ├── policies/OrganizerRoleGuard.ts
│   └── policies/adminExclusionGuard.ts
├── list/                            # Existente (US-027)
├── create/                          # Existente (US-028)
└── mutate/                          # NUEVO (US-029)
    ├── application/
    │   ├── UpdateEventTaskContentUseCase.ts
    │   ├── UpdateEventTaskStatusUseCase.ts
    │   └── SoftDeleteEventTaskUseCase.ts
    ├── domain/
    │   ├── EventTaskStateMachineService.ts
    │   └── errors/
    │       ├── InvalidTransitionError.ts
    │       ├── EventNotMutableError.ts
    │       ├── EmptyPatchError.ts
    │       ├── DueDateInPastError.ts
    │       └── CategoryNotAvailableError.ts
    ├── infrastructure/
    │   └── PrismaEventTaskMutateRepository.ts
    └── interface/
        ├── controllers/EventTaskMutateController.ts
        ├── schemas/updateEventTaskBodySchema.ts
        ├── schemas/updateEventTaskStatusBodySchema.ts
        └── schemas/taskMutationParamsSchema.ts
```

### Use Cases / Application Services

* **`UpdateEventTaskContentUseCase`** (`PATCH content`):
  1. Pre-checks (`OrganizerRoleGuard`, `adminExclusionGuard`).
  2. `$transaction` con `pg_advisory_xact_lock(hashtext(eventId))`.
  3. Lectura del evento + `EventOwnershipPolicy` (404 / 409 según corresponda).
  4. Lectura de la tarea `findOneOwnedByActor(eventId, taskId)` (404 si soft-deleted o no existe).
  5. Validación `due_date` solo cuando `currentStatus === 'pending'`.
  6. Validación `category_code` (cuando se envía y no es `null`) vía `ServiceCategoryReadPort.findActiveByCode`.
  7. `repository.updateContent({ taskId, eventId, fields, actorId, correlationId })` (proyecta solo columnas editables; `updated_at`, `updated_by_user_id` se setean en el repo).
  8. `TaskListItemMapper.toDto(updatedTask)`.
  9. Log `tasks.updated` con `fields_changed`.

* **`UpdateEventTaskStatusUseCase`** (`PATCH status`):
  1. Pre-checks (guard + admin exclusion).
  2. `$transaction` + lock.
  3. Lectura evento (`409 EVENT_NOT_MUTABLE` / `404`).
  4. Lectura tarea (404 si soft-deleted).
  5. `EventTaskStateMachineService.assertCanTransition(current, requested)`. Si `current === requested` → no UPDATE; log `tasks.updated.no_op`; retornar DTO actual.
  6. UPDATE condicional `event_tasks SET status=$new, updated_at=now(), updated_by_user_id=$actor, correlation_id=$cid WHERE id=$task AND event_id=$event AND status=$current AND deleted_at IS NULL`. Si `affected=0` (carrera) → `404` o `409` según diagnóstico (ver "Concurrencia").
  7. Mapper → DTO.
  8. Log `tasks.updated` con `previous_status`/`new_status`.

* **`SoftDeleteEventTaskUseCase`** (`DELETE`):
  1. Pre-checks.
  2. `$transaction` + lock.
  3. Lectura evento (`409 EVENT_NOT_MUTABLE`).
  4. UPDATE condicional `event_tasks SET deleted_at=now(), deleted_by_user_id=$actor, updated_at=now(), correlation_id=$cid WHERE id=$task AND event_id=$event AND deleted_at IS NULL`. `affected=0` → `404`.
  5. `204 No Content`. Log `tasks.deleted`.

### Controllers / Routes

`EventTaskMutateController` con tres handlers:

* `patchContent` → `PATCH /api/v1/events/:eventId/tasks/:taskId`.
* `patchStatus` → `PATCH /api/v1/events/:eventId/tasks/:taskId/status`.
* `delete` → `DELETE /api/v1/events/:eventId/tasks/:taskId`.

Cada handler:

1. Valida `Content-Type` (`415` si no es `application/json` en PATCH; DELETE no chequea).
2. Valida path con `taskMutationParamsSchema`.
3. Valida body con el schema correspondiente (DELETE no requiere body; cualquier body se ignora).
4. Inyecta `actor`, `correlationId` desde middleware.
5. Llama al use case correspondiente.
6. Mapea errores de dominio a envelope HTTP via `errorMapper` central.

### DTOs / Schemas

```ts
// taskMutationParamsSchema
z.object({
  eventId: z.string().uuid(),
  taskId: z.string().uuid(),
});

// updateEventTaskBodySchema (content)
z.object({
  title: z.string().trim().min(2).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  due_date: z.string().datetime({ offset: true }).nullable().optional(),
  category_code: z.string().min(1).max(64).nullable().optional(),
})
.strip()
.refine(hasAtLeastOneEditableField, { message: 'EMPTY_PATCH' });

// updateEventTaskStatusBodySchema
z.object({
  status: z.enum(['pending', 'in_progress', 'done', 'skipped']),
})
.strip();
```

`body.ignoredFields` se calcula comparando las claves recibidas contra el set permitido antes de aplicar `.strip()`. La lista se loguea cuando es no vacía y no se devuelve al cliente.

`TaskListItemDto` (reuso de US-027):

```jsonc
{
  "id": "uuid",
  "event_id": "uuid",
  "title": "string",
  "description": "string | null",
  "due_date": "ISO-8601 | null",
  "status": "pending | in_progress | done | skipped",
  "category_code": "string | null",
  "ai_generated": true,
  "ai_recommendation_id": "uuid | null",
  "confirmed_at": "ISO-8601 | null",
  "created_at": "ISO-8601",
  "updated_at": "ISO-8601"
}
```

### Repository / Persistence

`EventTaskMutateRepository` (interfaz) + `PrismaEventTaskMutateRepository` (adapter):

```ts
interface EventTaskMutateRepository {
  acquireEventLock(tx, eventId): Promise<void>;                      // pg_advisory_xact_lock(hashtext($eventId))
  findEventForMutation(tx, eventId): Promise<EventForMutation | null>;
  findTaskOwnedByEvent(tx, eventId, taskId): Promise<EventTaskRow | null>; // WHERE deleted_at IS NULL
  updateContent(tx, eventId, taskId, fields, actorId, correlationId): Promise<EventTaskRow>;
  updateStatusConditional(tx, eventId, taskId, currentStatus, newStatus, actorId, correlationId): Promise<EventTaskRow | null>; // null si affected=0
  softDeleteConditional(tx, eventId, taskId, actorId, correlationId): Promise<boolean>;     // false si affected=0
}
```

### Validation Rules

* `VR-01..VR-14` (US-029 §Validation Rules) implementadas por Zod + use case según corresponda (Zod cubre VR-01/02/06/07/10/14; use case cubre VR-03/04/05/08/09/11/12/13).
* `due_date` futura con tolerancia `±60s`: `dueDate.getTime() >= Date.now() - 60_000` cuando `currentStatus === 'pending'`.

### Error Handling

| Error de dominio | HTTP | `code` |
|---|---|---|
| `EmptyPatchError` | 400 | `EMPTY_PATCH` |
| `ZodError` (body) | 400 | `VALIDATION` |
| `DueDateInPastError` | 400 | `DUE_DATE_IN_PAST` |
| `CategoryNotAvailableError` | 400 | `CATEGORY_NOT_AVAILABLE` |
| `Unauthorized` (no sesión) | 401 | `UNAUTHORIZED` |
| `RoleNotAllowedError` (vendor/admin) | 403 | `FORBIDDEN` |
| `EventNotFoundError` / `TaskNotFoundError` / `OwnershipMismatch` | 404 | `NOT_FOUND` |
| `EventNotMutableError` | 409 | `EVENT_NOT_MUTABLE` |
| `InvalidTransitionError` | 409 | `INVALID_TRANSITION` |
| `Content-Type` no JSON | 415 | `UNSUPPORTED_MEDIA_TYPE` |
| Falla repo / DB inesperada | 500 | `INTERNAL_ERROR` |

### Transactions

* Las tres operaciones corren dentro de `prismaService.$transaction(async (tx) => { ... }, { isolationLevel: ReadCommitted })`.
* Primer comando: `await tx.$executeRaw\`SELECT pg_advisory_xact_lock(hashtext(${eventId}::text))\``.
* Para `updateStatus`: UPDATE condicional con `affected` proveniente de `tx.$executeRaw`. Si `affected === 0` se ejecuta un `SELECT` diagnóstico para distinguir `404` (deleted/no existe) vs `409 INVALID_TRANSITION` (alguien transicionó entre el lock y el UPDATE; raro porque el lock serializa por evento, pero defensivo).
* Para `softDelete`: UPDATE condicional `WHERE deleted_at IS NULL`. `affected === 0` ⇒ `404`.

### Observability

Detallado en sección 14. Logs sin PII (no se loguea `title`/`description`/`category_code` literal).

---

## 8. Frontend Technical Design

### Routes / Pages

* Reuso del segmento `/[locale]/organizer/events/:id/tasks` de US-027.
* Modal de confirmación `DeleteTaskDialog` accesible vía `Dialog` primitivo del design system; status menu `TaskStatusMenu` accesible vía `DropdownMenu`.

### Components

* `TaskItemInlineEdit` (reemplaza la vista por hover/click del `TaskItem` de US-027):
  * Campos editables inline: `title` (single-line), `description` (textarea), `due_date` (date picker), `category_code` (combobox alimentado por catálogo activo).
  * Botones "Guardar" y "Cancelar".
* `TaskStatusMenu`:
  * Renderiza solo las transiciones permitidas según `currentStatus` (consulta a `EventTaskStateMachineService.allowedTransitionsFrom` espejado en cliente, o array constante derivado del schema). Esto reduce errores 409 visibles al usuario.
  * Confirm dialog cuando la transición es a estado terminal (`done`/`skipped`).
* `DeleteTaskDialog`:
  * `aria-modal='true'`, focus trap, foco inicial en "Cancelar".
  * Mensaje localizado por idioma; botón "Eliminar" con `data-testid` claro.

### Forms

* RHF + Zod en `TaskItemInlineEdit` (`zodResolver`).
* Schema cliente espejado del backend (mismas reglas, sin `category_code` lookup; ese se valida server-side).
* En vez de un solo botón Guardar global, cada campo tiene su mini-form independiente para no enviar todos los campos en cada edición y aprovechar `body.ignoredFields` sin sorpresas.

### State Management

* TanStack `useMutation`:
  * `useUpdateEventTaskContent(eventId, taskId)`.
  * `useUpdateEventTaskStatus(eventId, taskId)`.
  * `useDeleteEventTask(eventId, taskId)`.
* `onSuccess`: `queryClient.invalidateQueries(['tasks', eventId])` y opcionalmente `setQueryData(['tasks', eventId, ...], updater)` con el `TaskListItemDto` recibido.
* `onError`: rollback de optimistic update si se aplicó; toast con i18n key derivada de `error.code`.

### Data Fetching

* Mutations directas; no se hace prefetch tras la mutación. La invalidación + refetch es suficiente.

### Loading / Empty / Error / Success States

* **Loading**: spinner por fila (16 px) en el campo editado o en el botón de status; cursor `wait`.
* **Empty**: no aplica.
* **Error**: banner inline (`role='alert'`) por código:
  * `EMPTY_PATCH` → "Edita al menos un campo".
  * `DUE_DATE_IN_PAST` → "La fecha debe ser futura para tareas pendientes".
  * `CATEGORY_NOT_AVAILABLE` → "Esta categoría no está disponible".
  * `EVENT_NOT_MUTABLE` → banner persistente "Este evento está bloqueado".
  * `INVALID_TRANSITION` → "Transición no permitida desde {currentStatus}".
  * `NOT_FOUND` → toast "Esta tarea ya no existe" + invalidate.
* **Success**: toast "Tarea actualizada" / "Tarea eliminada"; la fila se actualiza in place.

### Accessibility

* Inline edit operable por teclado: `Enter` guarda, `Esc` cancela; `Tab` avanza entre acciones.
* `aria-describedby` para errores; `aria-live='polite'` para anuncios de éxito/error.
* `TaskStatusMenu` con `aria-haspopup='menu'`, navegación con flechas y `Enter` para seleccionar.
* `DeleteTaskDialog` con `aria-modal='true'`, focus trap y `aria-labelledby`.
* Contraste AA verificado en banners y badges.

### i18n

* `next-intl` namespace `tasks.mutate.*` con claves para labels, mensajes de error, confirmaciones, toasts.
* 4 locales: `es` (default LATAM neutral), `en`, `pt`, `fr`.
* Mensajes interpolan `{currentStatus}` traducido por separado.

---

## 9. API Contract Design

| Method | Endpoint | Purpose | Auth Required | Request | Response | Error Cases |
|---|---|---|---|---|---|---|
| PATCH | `/api/v1/events/:eventId/tasks/:taskId` | Editar contenido | Sí (cookie sesión, rol Organizer dueño) | `Content-Type: application/json`; body parcial `{ title?, description?, due_date?, category_code? }` (≥1 campo). | `200 OK` + `TaskListItemDto`. | `400 VALIDATION`, `400 EMPTY_PATCH`, `400 DUE_DATE_IN_PAST`, `400 CATEGORY_NOT_AVAILABLE`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`, `409 EVENT_NOT_MUTABLE`, `415 UNSUPPORTED_MEDIA_TYPE`, `500 INTERNAL_ERROR`. |
| PATCH | `/api/v1/events/:eventId/tasks/:taskId/status` | Transicionar estado | Sí | `Content-Type: application/json`; body `{ status }`. | `200 OK` + `TaskListItemDto`. | `400 VALIDATION`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`, `409 EVENT_NOT_MUTABLE`, `409 INVALID_TRANSITION`, `415 UNSUPPORTED_MEDIA_TYPE`, `500 INTERNAL_ERROR`. |
| DELETE | `/api/v1/events/:eventId/tasks/:taskId` | Soft delete | Sí | Sin body; cualquier body se ignora. | `204 No Content` (sin body). | `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`, `409 EVENT_NOT_MUTABLE`, `500 INTERNAL_ERROR`. |

Envelope de error canónico:

```jsonc
{
  "error": {
    "code": "INVALID_TRANSITION",
    "message": "Transition not allowed from 'done' to 'pending'.",
    "details": { "current_status": "done", "requested_status": "pending", "allowed_transitions": [] }
  }
}
```

---

## 10. Database / Prisma Design

### Models Impacted

* `EventTask` (UPDATE de columnas editables, `status`, `deleted_at`, `deleted_by_user_id`, `updated_at`, `updated_by_user_id`, `correlation_id`).
* `Event` (SELECT + lock cooperativo).
* `ServiceCategory` (SELECT para `category_code`).
* `AIRecommendation` (no se toca; solo se preserva el enlace lógico).

### Fields / Columns

Columnas `event_tasks` impactadas:

| Columna | Operación |
|---|---|
| `title` | UPDATE (PATCH content). |
| `description` | UPDATE / SET NULL. |
| `due_date` | UPDATE / SET NULL. |
| `category_code` | UPDATE / SET NULL. |
| `status` | UPDATE (PATCH status). |
| `deleted_at` | UPDATE (DELETE soft). |
| `deleted_by_user_id` | UPDATE (DELETE soft). |
| `updated_at` | UPDATE en cada mutación que persiste. |
| `updated_by_user_id` | UPDATE en cada mutación que persiste. |
| `correlation_id` | UPDATE en cada mutación que persiste. |
| `ai_generated`, `ai_recommendation_id`, `confirmed_at`, `language_code`, `created_by_user_id`, `created_at`, `event_id`, `id` | **Inmutables** vía estos endpoints. |

### Relations

* `event_tasks.event_id → events.id` (FK; usado por lock).
* `event_tasks.category_code → service_categories.code` (FK con `ON DELETE RESTRICT`).
* `event_tasks.updated_by_user_id → users.id` (FK).
* `event_tasks.deleted_by_user_id → users.id` (FK; nullable).

### Indexes

* Reuso del índice parcial `idx_event_tasks_event_active (event_id, status, due_date) WHERE deleted_at IS NULL` creado por US-027/028. Suficiente para `findTaskOwnedByEvent` y filtros del listado tras mutar.
* Sin índices nuevos.

### Constraints

* Check enum `event_task_status` (`pending`, `in_progress`, `done`, `skipped`).
* NOT NULL en `event_id`, `title`, `status`, `created_at`.
* `updated_at >= created_at` (asegurado por aplicación; no se introduce check DB).

### Migrations Impact

Sin migraciones nuevas. Tarea de verificación previa al desarrollo:

1. Confirmar columnas `updated_by_user_id`, `deleted_by_user_id` existen y son FK a `users`.
2. Confirmar `correlation_id` existe (sembrado por PB-P0-014 / US-027 verification).
3. Confirmar enum `event_task_status` está al día con la state machine canónica.

Si alguna columna faltase, se levanta un blocker antes del task breakdown.

### Seed Impact

* No requiere seed nuevo.
* Las tareas IA generadas por seed de demo (US-018 + US-025) deben ser editables/transicionables por esta historia sin cambios al seed.

---

## 11. AI / PromptOps Design

No aplica — esta historia no invoca al `LLMProvider`, no genera ni modifica `AIRecommendation`. Solo preserva los enlaces inmutables `ai_generated` y `ai_recommendation_id`, y deja `confirmed_at` intacto (responsabilidad de US-025/US-031).

---

## 12. Security & Authorization Design

### Authentication

* Cookie HTTP-only `eventflow.sid`.
* Middleware estándar inyecta `actor` con `id` y `role`.
* `401 UNAUTHORIZED` si no hay sesión válida.

### Authorization

* `OrganizerRoleGuard` rechaza `vendor`/`admin` con `403`.
* `EventOwnershipPolicy.assertOwnsEvent(actor, event)` lanza `OwnershipMismatch → 404`.
* `taskId` debe pertenecer al `eventId` del path; mismatch → `404`.

### Ownership Rules

* `actor.id === event.owner_user_id` (verificado dentro de la transacción tras adquirir lock).
* No se permite "admin actuando como organizer".

### Role Rules

* Vendor → `403` (no participa en checklist).
* Admin → `403` (`FR-ADMIN-010`).
* Anónimo → `401`.

### Negative Authorization Scenarios

| Escenario | Resultado |
|---|---|
| Vendor invoca cualquiera | `403 FORBIDDEN` |
| Admin invoca cualquiera | `403 FORBIDDEN` |
| Organizer no dueño | `404 NOT_FOUND` |
| Organizer dueño + task de otro evento | `404 NOT_FOUND` |
| Sin sesión | `401 UNAUTHORIZED` |

### Audit Requirements

* Toda mutación persiste `updated_by_user_id`, `updated_at`, `correlation_id`.
* DELETE adicional: `deleted_by_user_id`, `deleted_at`.
* No se requiere `AdminAction` (no es flujo admin).
* Métricas Prometheus visibles para SRE; logs estructurados aptos para análisis.

### Sensitive Data Handling

* `title`, `description`, `category_code` literales **no** se loguean.
* `correlation_id` se propaga a la métrica para trazabilidad cross-service.
* Errores de validación devuelven nombres de campos pero no valores.

---

## 13. Testing Strategy

### Unit Tests

* `EventTaskStateMachineService`: matriz completa de transiciones (válidas + inválidas + idempotentes).
* `updateEventTaskBodySchema`: límites de `title`, `description`, `due_date` formato, `category_code` slug, `EMPTY_PATCH`, server-controlled fields stripping.
* `updateEventTaskStatusBodySchema`: enum válido / inválido.
* `TaskListItemMapper.toDto`: preserva `ai_generated`, `ai_recommendation_id`, `confirmed_at`.

### Integration Tests

* `UpdateEventTaskContentUseCase`: AC-01, AC-04, AC-05, EC-06..EC-11.
* `UpdateEventTaskStatusUseCase`: AC-02, EC-02, EC-03 (no_op), EC-04 (soft-deleted).
* `SoftDeleteEventTaskUseCase`: AC-03, EC-04, EC-05 (doble DELETE → 404).
* Concurrencia (`CONC-01..03`) con base de pruebas real y `Promise.all`.

### API Tests

* Supertest por endpoint:
  * Códigos 200, 204, 400 (todos los `code`), 401, 403, 404, 409 (`EVENT_NOT_MUTABLE`, `INVALID_TRANSITION`), 415.
  * Verificación de headers (`Content-Type`, `Location` no aplica aquí).
  * Verificación de envelope de error.

### E2E Tests

* Playwright: TS-12 (inline edit + transición + delete) con seed de demo y rol Organizer.
* Verificación visual de banner read-only en evento `completed`.

### Security Tests

* AUTH-TS-01..05 cubiertos por integration tests.
* Negative paths para vendor/admin con tokens válidos.
* Verificación de no-revelación de IDs cruzados.

### Accessibility Tests

* `@testing-library` + `axe`:
  * `TaskItemInlineEdit` operable por teclado.
  * `TaskStatusMenu` con `role='menu'` y navegación con flechas.
  * `DeleteTaskDialog` con focus trap y `aria-modal`.
  * Mensajes con `aria-live='polite'`.

### AI Tests

No aplica.

### Seed / Demo Tests

* Verificar que las tareas IA del seed se editan correctamente sin perder badge IA.
* Verificar que `confirmed_at` no se altera al transicionar a `done`.

### CI Checks

* Lint + typecheck + unit + integration + API + e2e (canary) verdes.
* Budget P95 < 1.5 s validado en stage con dataset realista (≥ 1k tasks por evento).
* Snapshot OpenAPI regenerado vía US-098 (no bloquea, coordinación documental).

---

## 14. Observability & Audit

### Logs

| Evento | Trigger | Campos |
|---|---|---|
| `tasks.updated` | PATCH content o status que persiste | `task_id`, `event_id`, `actor_id`, `ai_generated`, `fields_changed[]`, `previous_status?`, `new_status?`, `correlation_id`, `latency_ms` |
| `tasks.updated.no_op` | PATCH status `from === to` | `task_id`, `event_id`, `actor_id`, `status`, `correlation_id` |
| `tasks.updated.blocked` | PATCH content/status rechazado por 409 EVENT_NOT_MUTABLE | `task_id`, `event_id`, `actor_id`, `event_status`, `correlation_id` |
| `tasks.deleted` | DELETE exitoso | `task_id`, `event_id`, `actor_id`, `ai_generated`, `correlation_id`, `latency_ms` |
| `tasks.deleted.blocked` | DELETE rechazado por 409 EVENT_NOT_MUTABLE | `task_id`, `event_id`, `actor_id`, `event_status`, `correlation_id` |
| `body.ignoredFields` (atributo embebido) | Cualquier mutación con campos server-controlled descartados | Set de claves descartadas. |

### Correlation ID

Heredado del request (`X-Correlation-Id`) o generado por middleware estándar. Propagado a logs y a la columna `event_tasks.correlation_id`.

### AdminAction

No aplica — admin no participa en este flujo.

### Error Tracking

* `5xx` ⇒ Sentry/equivalente con `correlation_id`, `actor_id`, endpoint, código.
* Errores de dominio (`4xx`) no se reportan a Sentry, solo a logs.

### Metrics

| Métrica | Tipo | Labels |
|---|---|---|
| `tasks_updated_total` | Counter | `operation="content\|status"`, `ai_generated="true\|false"` |
| `tasks_deleted_total` | Counter | `ai_generated="true\|false"` |
| `tasks_mutate_latency_ms` | Histogram | `operation="content\|status\|delete"` |
| `tasks_transition_rejected_total` | Counter | `reason="invalid_transition\|event_not_mutable"` |

---

## 15. Seed / Demo Data Impact

### Seed Data Required

No requiere data nueva.

### Demo Scenario Supported

* Editar título de una tarea IA (preserva badge "Sugerido por IA").
* Transicionar `pending → in_progress → done`.
* Intentar transición inválida (`done → pending`) y mostrar banner `409 INVALID_TRANSITION`.
* Soft delete oculta la tarea de la lista; auditoría visible en US-030.

### Reset / Isolation Notes

* El seed actual es idempotente (PB-P0-014). Los tests integration reusan el dataset y revierten cambios vía rollback de transacción de tests.

---

## 16. Documentation Alignment Required

| Document / Source | Conflict | Current Decision | Recommended Action | Blocks Implementation? |
|---|---|---|---|---|
| `/docs/10-Non-Functional-Requirements.md` | Draft original referenciaba `NFR-PERF-API-001` (stale) | Canónico `NFR-PERF-001` | Cleanup editorial en `/docs/10` | No |
| `/docs/9-Functional-Requirements-Document.md` | Mapea `FR-TASK-003` a `UC-TASK-002` y `FR-TASK-005` a `UC-TASK-004` | Canónico: `UC-TASK-003 — Editar tarea` según `/docs/8` | Aclaración liviana en `/docs/9` (autoridad UCS) | No |
| `/docs/16-API-Design-Specification.md` | §25.3 documenta `categoryHint: string` y `EventTaskResponseDto.isSeed` | Decisión canónica: `category_code` FK a `ServiceCategory.code` (consistente con US-028) y `TaskListItemDto` sin `isSeed` | Regenerar snapshot OpenAPI vía US-098 | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Carrera entre `apply` HITL (US-025) y PATCH status sobre la misma tarea | UPDATE pisa decisiones HITL, alterando `confirmed_at` indirectamente | `confirmed_at` no se toca aquí; UPDATE proyecta solo `status`, `updated_*`, `correlation_id`. Test de concurrencia explícito. |
| Lock cooperativo agresivo bloquea otros endpoints | Latencia P95 incrementada | Lock scope `xact` (libera al final de la transacción); transacciones cortas; lock por `eventId` aísla impacto a un único evento. |
| Drift entre state machine cliente y servidor | UI ofrece transición que backend rechaza | Cliente consume schema único derivado del backend (constante compartida); test E2E valida coherencia. |
| Pérdida de trazabilidad IA por bug en mapper | Badge IA desaparece tras edición | Unit test del mapper + integration AC-04 para tareas IA. |
| Migración futura cambia state machine | Breaking change | `EventTaskStateMachineService` aísla la lógica; futuro cambio requiere ADR. |
| Cliente envía body grande en DELETE | Pérdida de banda | Express estándar limita body; el use case ignora cualquier body en DELETE. |

---

## 18. Implementation Guidance for Coding Agents

### Files / Folders impactados

* Nuevo: `src/modules/tasks/mutate/` (use cases, state machine, schemas, controller, errores, repo).
* Modificado: `src/modules/tasks/shared/repositories/EventTaskRepository.ts` (composición / extensión).
* Modificado: `src/router/v1.ts` (registro de las tres rutas).
* Nuevo Frontend: `apps/web/src/features/tasks/mutate/` con componentes y hooks descritos.
* Modificado Frontend: `apps/web/src/features/tasks/list/TaskItem.tsx` para integrar inline edit y status menu.

### Recommended order of implementation

1. Verificación DB (columnas + enum + índice).
2. `EventTaskStateMachineService` + unit tests.
3. Schemas Zod + helper `extractIgnoredFields`.
4. `EventTaskMutateRepository` (interfaz + adapter Prisma).
5. `UpdateEventTaskContentUseCase`.
6. `UpdateEventTaskStatusUseCase`.
7. `SoftDeleteEventTaskUseCase`.
8. Controller + rutas + error mapper.
9. Logs + métricas + correlation propagation.
10. Frontend hooks + componentes + i18n + accesibilidad.
11. Suite de tests (unit → integration → API → E2E → a11y).

### Decisiones que NO deben reabrirse

* `ai_generated`, `ai_recommendation_id`, `confirmed_at` **inmutables** (FR-TASK-012, BR-AI-008/010).
* State machine canónica `pending → {in_progress, done, skipped}`, `in_progress → {done, skipped}`. `done` y `skipped` son **terminales**.
* Soft delete enforced; sin hard delete por API.
* Ownership backend-only; admin excluido; vendor excluido.
* Response `TaskListItemDto` consistente con US-027.
* Lock cooperativo por evento con `pg_advisory_xact_lock`.

### What must not be implemented

* Hard delete.
* `If-Match` / `ETag` para concurrencia.
* Bulk PATCH/DELETE transversal.
* Endpoint admin paralelo de mutación.
* Notificaciones push o email.
* Restauración self-service de tareas eliminadas.
* Cualquier mutación de `confirmed_at`.

### Assumptions to preserve

* `EventTaskRepository` y `TaskListItemMapper` existen y se mantienen estables.
* `ServiceCategoryReadPort` existe y devuelve el catálogo activo.
* Middleware de auth + correlation ID está disponible globalmente.
* El listado de US-027 invalidará su cache tras una mutación exitosa.

---

## 19. Task Generation Notes

### Suggested task groups

* **DB (1)**: Verificación de schema + enum + índice (sin migración).
* **BE (6)**:
  1. `EventTaskStateMachineService` + tests.
  2. Schemas Zod + helper `extractIgnoredFields`.
  3. `EventTaskMutateRepository` (interfaz + Prisma adapter).
  4. `UpdateEventTaskContentUseCase`.
  5. `UpdateEventTaskStatusUseCase`.
  6. `SoftDeleteEventTaskUseCase`.
* **API (1)**: Controller + tres rutas + error mapper actualizado.
* **SEC (2)**: Reuso documentado de `EventOwnershipPolicy` + `OrganizerRoleGuard` + `adminExclusionGuard`; tests de no-revelación cruzada.
* **OBS (1)**: 5 logs + 4 métricas + propagación `correlation_id`.
* **FE (5)**: `TaskItemInlineEdit`, `TaskStatusMenu`, `DeleteTaskDialog`, hooks TanStack, i18n + a11y.
* **QA (7)**: Unit (state machine, mappers, schemas), Integration (3 use cases), API (Supertest), Concurrency (3 tests), E2E (TS-12), Accessibility (3 componentes), Perf budget.
* **DOC (2)**: DOC-001 coordina OpenAPI con US-098; DOC-002 cleanup `/docs/9`, `/docs/10`, `/docs/16`.

### Required QA tasks

* Suite unit + integration completa con cobertura ≥ 90 % en `mutate/`.
* Concurrencia con DB real.
* E2E completo del flujo.
* a11y con `axe`.

### Required security tasks

* Tests de vendor, admin y no-dueño con sesión válida.
* Verificación de no-revelación cruzada `eventId/taskId`.

### Required seed/demo tasks

* No requeridas.

### Required documentation tasks

* DOC-001 (snapshot OpenAPI vía US-098).
* DOC-002 (cleanup `/docs/9`, `/docs/10`, `/docs/16`).

### Dependencies between tasks

* DB-001 → BE-*.
* BE-State machine → BE-Use cases.
* BE-Repository → BE-Use cases.
* BE-Schemas → BE-Controller.
* BE-* → API → OBS.
* API + OBS → QA Integration/API.
* BE + API → FE.
* FE → QA E2E + QA a11y.

### Consolidated `tasks.md`

PB-P1-018 ya consolidará un `tasks.md` cuando US-030 cierre el backlog item.

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

US-029 queda lista para descomposición. La historia tiene 6 AC + 14 EC + 14 VR + 9 SEC + 12 TS + 24 NT + 3 CONC, todas accionables. Las decisiones canónicas (tres endpoints, state machine, inmutabilidad IA, soft delete enforced, ownership backend-only, response `TaskListItemDto`, lock cooperativo) están formalizadas en la US y en la documentación EventFlow. Las 3 alineaciones documentales (`/docs/9`, `/docs/10`, `/docs/16`) son cleanup editorial no bloqueante cubierto por DOC-001/DOC-002.
