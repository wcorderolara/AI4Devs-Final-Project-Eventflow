# 🧾 User Story: Crear tarea manual del checklist (Organizer)

## 🆔 Metadata

| Field              | Value                                                                |
| ------------------ | -------------------------------------------------------------------- |
| ID                 | US-028                                                               |
| Epic               | EPIC-TASK-001 — Checklist & Task Management                          |
| Backlog Item       | PB-P1-018 — CRUD de tareas manuales y máquina de estados              |
| UI Surface         | Página "Mi checklist" del evento, diálogo "Crear tarea"               |
| Feature            | Creación manual de `EventTask` (origen no IA)                        |
| Module / Domain    | Tasks                                                                 |
| User Role          | Organizer                                                             |
| Priority           | Must Have                                                             |
| Status             | Approved                                                              |
| Owner              | Product Owner / Business Analyst                                      |
| Approved By        | PO/BA Review                                                           |
| Approval Date      | 2026-06-26                                                            |
| Ready for Development Tasks | Yes                                                           |
| Sprint / Milestone | MVP                                                                   |
| Created Date       | 2026-06-09                                                            |
| Last Updated       | 2026-06-26                                                            |

---

## 🎯 User Story

**As an** organizador autenticado dueño de un evento mutable
**I want** crear una `EventTask` manual con título, descripción opcional, `due_date` opcional y categoría opcional
**So that** complemente las sugerencias de IA con acciones propias y mantenga el checklist centralizado para mi planificación operativa diaria

---

## 🧠 Business Context

### Context Summary

US-028 permite al organizador agregar tareas que no provienen del flujo IA (US-018 + US-025 strategy `checklist`). El endpoint crea una `EventTask` con `ai_generated=false`, `ai_recommendation_id=null` y `status='pending'` — la misma puerta de entrada canónica que utilizan las tareas IA materializadas por US-025, de modo que ambas viven la misma state machine `pending → in_progress → done | skipped` definida en `FR-TASK-004` y `C-027` (`/docs/6`).

La operación es individual y atómica a una sola fila de `event_tasks`. No abre transiciones de estado posteriores: la transición pertenece a US-029 (editar tarea / cambiar estado). El bulk confirm de US-031 no aplica porque sólo opera sobre tareas IA (`ai_generated=true`).

El endpoint se integra al patrón canónico de mutación de EventFlow: validación con Zod, ownership backend-only, idioma propagado desde el evento, soft delete enforced, audit + correlation ID y respuesta `201 Created` con el mismo `TaskListItemDto` que devuelve US-027 para que la UI pueda hacer cache invalidation sin un GET adicional.

### Related Domain Concepts

* `EventTask` (entidad principal; creación).
* `EventTask.status ∈ {pending, in_progress, done, skipped}` (`/docs/18`); inicial `pending` (`C-027`, `FR-TASK-004`).
* `EventTask.ai_generated: boolean` (`BR-AI-008`); siempre `false` en este endpoint.
* `EventTask.ai_recommendation_id?` siempre `null` en este endpoint (ninguna trazabilidad IA).
* `EventTask.due_date?` (timestamptz; nullable; futura respecto a `now()` cuando se envía).
* `EventTask.category_code?` (FK a `ServiceCategory.code` con `is_active=true`).
* `Event.status` y `Event.deleted_at` (gatillan `409` o `404` antes de tocar `event_tasks`).
* `ServiceCategory` (read; valida `category_code`).
* `LLMProvider` (no se invoca en este flujo).

### Assumptions

* El organizador autenticado es dueño del evento (`event.owner_user_id`); el frontend ya sólo presenta el botón "Crear tarea" en eventos propios.
* El cliente envía siempre `Content-Type: application/json` con body validado por Zod.
* La categoría sugerida por IA-004 (US-020) puede pre-rellenarse desde la UI; el backend valida la categoría como cualquier otra (no distingue origen).
* El `due_date` se interpreta en UTC; el frontend convierte desde el huso horario local del usuario antes de enviar.
* El idioma del evento (`event.language_code`) se persiste en la `EventTask` para mantener consistencia con tareas IA (`BR-AI-011`); no se permite override en este endpoint.

### Dependencies

* PB-P1-018 / US-027 (lectura paginada del checklist; consumidor del resultado de US-028).
* PB-P1-018 / US-029, US-030 (edición y eliminación; comparten Backlog Item y schema).
* PB-P1-006 (creación de eventos; provee `event_id`, `owner_user_id`, `language_code`, `status`).
* PB-P1-019 / US-020 (recomendación de categorías; UX puede prefill `category_code`).
* PB-P0-001 (foundation auth + roles).
* PB-P0-014 (observabilidad; correlation IDs y logs estructurados).

---

## 🔗 Traceability

| Source                 | Reference                                                                                                |
| ---------------------- | -------------------------------------------------------------------------------------------------------- |
| Backlog Item           | PB-P1-018                                                                                                |
| FRD Requirement(s)     | FR-TASK-002 (crear tareas manualmente con `ai_generated=false`), FR-TASK-004 (state machine canónica), FR-TASK-011 (bloqueo en eventos `cancelled`/`completed`), FR-TASK-012 (origen `ai_generated` distinguido) |
| Use Case(s)            | UC-TASK-001 (Gestión del checklist del evento)                                                            |
| Business Rule(s)       | BR-TASK-001 (ownership), BR-TASK-002 (estados válidos y entrada `pending`), BR-TASK-006 (manejo de fechas), BR-TASK-008 (categoría opcional), BR-TASK-009 (soft delete enforced), BR-TASK-010 (eventos `cancelled`/`completed` bloqueados), BR-AI-008 (flag `ai_generated`) |
| Permission Rule(s)     | Ownership: `actor.id === event.owner_user_id`; vendor → `403`; admin → `403` (no participa en mutación operativa, `FR-ADMIN-010`) |
| Data Entity / Entities | `EventTask`, `Event`, `ServiceCategory` (read)                                                            |
| API Endpoint(s)        | `POST /api/v1/events/:eventId/tasks`                                                                      |
| NFR Reference(s)       | NFR-PERF-001 (P95 ≤ 1.5 s endpoints no-IA), NFR-OBS-001 (correlation ID), NFR-OBS-002 (logs estructurados), NFR-SEC-005 (auditoría de mutaciones), NFR-I18N-001 (mensajes traducidos por `Accept-Language`) |
| Related ADR(s)         | ADR-API-001 (versionado /api/v1), ADR-API-004 (correlation ID), ADR-DB-001 (Prisma + Postgres)            |
| PO Decision(s)         | Decisión PO PB-P1-018 (Acceptance Summary): origen `ai_generated=false` distinguido; estado inicial `pending`; eventos `cancelled`/`completed` no aceptan creación. |
| Related Document(s)    | `/docs/4` BR-TASK-001/002/006/008/009/010, BR-AI-008, `/docs/6` `EventTask` + `C-027` state machine, `/docs/8` UC-TASK-001, `/docs/9` FR-TASK-002/004/011/012, `/docs/10` NFR-PERF-001, NFR-OBS-001/002, NFR-SEC-005, `/docs/16` patrón POST recursos por evento, `/docs/18` `event_tasks` columnas y enum `event_task_status`, `/docs/19` ownership + audit, `management/artifacts/4-Product-Backlog-Prioritized.md` PB-P1-018 línea 145 |

---

## 🧩 PO/BA Decisions Applied

1. **Endpoint canónico** — `POST /api/v1/events/:eventId/tasks` con body JSON. No se introduce un endpoint distinto para tareas manuales; el flag `ai_generated=false` lo determina el servidor, no el cliente.
2. **Estado inicial canónico `pending` (`C-027`, `FR-TASK-004`, `BR-TASK-002`)** — Toda nueva `EventTask` —manual o IA— entra a la state machine en `pending`. La transición a `in_progress`/`done`/`skipped` pertenece a US-029 (`PATCH /events/:eventId/tasks/:taskId`). Esta decisión sobrescribe ambigüedades del draft sobre "directly active vs pending".
3. **`ai_generated=false` y `ai_recommendation_id=null` son server-controlled** — El cliente no puede setearlos. Si los envía, se descartan silenciosamente con log `body.ignoredFields` (no `400`). Esto preserva la integridad de la trazabilidad IA (`BR-AI-008`, `BR-AI-010`).
4. **Body schema mínimo (`/docs/16` patrón POST)** — `{ title: string(2..200), description?: string(0..2000)|null, due_date?: ISO-8601|null, category_code?: string(slug)|null }`. Campos no listados se descartan con log; sin `400` por keys extras.
5. **Validación de fechas (`BR-TASK-006`)** — `due_date` opcional. Cuando se envía, debe ser ISO-8601 con offset y representar un instante ≥ `event.created_at` (no permite vencimientos anteriores a la creación del evento). Fechas en el pasado respecto a `now()` devuelven `400 DUE_DATE_IN_PAST`. `null` y campo ausente son válidos.
6. **Validación de categoría (`BR-TASK-008`, `BR-SERVICE-001`)** — `category_code` opcional. Cuando se envía, debe coincidir con `ServiceCategory.code` y la categoría debe tener `is_active=true`. Categoría inexistente o inactiva → `400 CATEGORY_NOT_AVAILABLE` (no se filtra existencia para evitar enumeración de slugs). `null` y ausente son válidos y persisten como `NULL`.
7. **Evento mutable (`FR-TASK-011`, `BR-TASK-010`)** — Si `event.status ∈ {cancelled, completed, deleted}` o `event.deleted_at IS NOT NULL`, el endpoint devuelve `409 EVENT_NOT_MUTABLE` antes de tocar `event_tasks`. Esta verificación es atómica con la inserción (lock advisory por `event_id` o `SELECT FOR UPDATE` corto sobre la fila del evento, según la implementación Prisma del módulo).
8. **Ownership backend-only y no-revelación** — `actor.id === event.owner_user_id`. Vendor → `403 FORBIDDEN`. Admin → `403 FORBIDDEN` (`FR-ADMIN-010`). Evento ajeno, inexistente o soft-deleted → `404 NOT_FOUND` global (no distingue entre los tres casos).
9. **Idioma persistido desde el evento (`BR-AI-011` simétrico)** — Se persiste `event_tasks.language_code = event.language_code` automáticamente para mantener consistencia con tareas IA. El cliente no puede override en este endpoint.
10. **Auditoría y correlación** — Se persiste `created_by_user_id = actor.id`, `created_at = now()`, `correlation_id` heredado del request. `updated_at` se inicializa al mismo `created_at`. `deleted_at` permanece `NULL`. `confirmed_at` permanece `NULL` (la confirmación es un concepto exclusivo del flujo IA via US-031).
11. **Response canónico `201 Created` con `TaskListItemDto`** — Mismo DTO que US-027 para que la UI invalide la query `['tasks', eventId, ...]` con el resultado de la mutación sin un GET adicional. No expone `description` truncada en el envelope (la lista de US-027 también la omite); el cliente conserva la `description` enviada en su estado local.
12. **i18n del response** — Mensajes de error y descripciones legibles se devuelven en el idioma de `Accept-Language` (default `es-LATAM`; soporta `es-ES`, `pt`, `en`). Códigos de error (`DUE_DATE_IN_PAST`, `CATEGORY_NOT_AVAILABLE`, `EVENT_NOT_MUTABLE`, etc.) permanecen en inglés para parsing automatizado.
13. **Telemetría sin PII (`NFR-OBS-002`, `NFR-SEC-005`)** — Log estructurado `tasks.created` con `event_id`, `actor_id`, `task_id`, `ai_generated=false`, `has_due_date: boolean`, `has_category: boolean`, `language_code`, `correlation_id`, `latency_ms`. **No** se logean `title` ni `description` (potencial PII). Métrica `tasks_created_total` por `ai_generated` y `tasks_created_latency_ms` (histograma).
14. **Sin invocación a LLM** — El endpoint no consume cuota `SEC-POL-AI-007` ni crea `AIRecommendation`. Es una mutación operativa pura.
15. **Idempotencia best-effort por correlation ID** — Por simplicidad MVP no se aplica `Idempotency-Key`. Una doble llamada con mismos datos crea dos tareas distintas (comportamiento esperado en mutaciones POST). La UI mitiga deshabilitando el botón "Crear" durante la mutación TanStack.

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: In Scope
* MVP Relevance: Must Have

### Explicitly Out of Scope

* Editar una tarea ya creada (US-029).
* Transicionar estado (`pending → in_progress → done | skipped`) — US-029.
* Eliminar / cancelar la tarea (US-030; soft delete).
* Confirmar tareas IA en bloque (US-031; sólo aplica a `ai_generated=true`).
* Asignar la tarea a otros usuarios (Future; MVP usa siempre `created_by_user_id` como dueño).
* Subtareas anidadas y recurrencia.
* Recordatorios push o email basados en `due_date` (Future).
* Crear tarea por voz o adjuntos (Future).
* Bulk create (`POST` con array) — Future; este endpoint procesa exactamente una tarea por request.
* `Idempotency-Key` para mutaciones (Future; se evalúa cuando se agreguen workflows que reintenten).
* Personalizar `language_code` por tarea distinto del idioma del evento.
* Selección automática de categoría por LLM (la sugerencia llega como prefill UX desde US-020; el backend no consulta IA en este endpoint).

### Scope Notes

* Sin migraciones nuevas: reusa todas las columnas existentes de `event_tasks` y el enum `event_task_status` ya sembrados por la fundación de tasks.
* La fila se inserta dentro de una transacción corta que también verifica la mutabilidad del evento, evitando una carrera con `PATCH /events/:id` que pase el evento a `cancelled`.
* El endpoint no recalcula el progreso del evento; la métrica `progress` (FR-TASK-007) la calculan US-033 o el dashboard de US-014 al leer.

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Crear tarea con título solamente

**Given** un organizador autenticado dueño de un evento `event.status ∈ {draft, active}` y `event.deleted_at IS NULL`
**When** invoca `POST /api/v1/events/:eventId/tasks` con body `{ "title": "Reservar el salón" }`
**Then** el backend persiste una nueva fila en `event_tasks` con `id` generado (UUID v4), `event_id` del path, `title="Reservar el salón"`, `description=NULL`, `due_date=NULL`, `category_code=NULL`, `status='pending'`, `ai_generated=false`, `ai_recommendation_id=NULL`, `confirmed_at=NULL`, `deleted_at=NULL`, `language_code=event.language_code`, `created_by_user_id=actor.id`, `created_at=now()`, `updated_at=created_at`
**And** responde `201 Created` con `TaskListItemDto` y `Location: /api/v1/events/:eventId/tasks/:taskId`
**And** persiste log estructurado `tasks.created` con `event_id`, `task_id`, `actor_id`, `ai_generated=false`, `has_due_date=false`, `has_category=false`, `language_code`, `latency_ms`, `correlation_id`.

### AC-02: Crear tarea con todos los campos

**Given** un organizador autenticado con un evento mutable, una categoría `catering` activa y una fecha futura
**When** envía `{ "title": "Confirmar menú con proveedor", "description": "Llamar el lunes 09:00", "due_date": "2026-08-15T17:00:00Z", "category_code": "catering" }`
**Then** se crea la `EventTask` con todos los campos persistidos exactamente como se enviaron
**And** la respuesta `201 Created` refleja `due_date` y `category_code` en el `TaskListItemDto`
**And** el log incluye `has_due_date=true`, `has_category=true` (sin loguear `title` ni `description`).

### AC-03: Server-controlled fields no son modificables por el cliente

**Given** un organizador
**When** envía `{ "title": "X", "ai_generated": true, "ai_recommendation_id": "<uuid>", "status": "done", "id": "<uuid>", "created_by_user_id": "<otro-user>" }`
**Then** el backend ignora silenciosamente los campos server-controlled (`ai_generated`, `ai_recommendation_id`, `status`, `id`, `created_by_user_id`, `created_at`, `updated_at`, `deleted_at`, `language_code`, `confirmed_at`), persiste con valores canónicos (`ai_generated=false`, `status='pending'`, etc.) y registra `body.ignoredFields=[...]` en el log
**And** responde `201 Created` con valores canónicos.

### AC-04: Categoría opcional `null` explícita

**Given** un organizador
**When** envía `{ "title": "Tarea X", "category_code": null }`
**Then** la tarea se crea con `category_code=NULL` y la respuesta refleja `category_code: null`.

### AC-05: i18n del response y de errores

**Given** un organizador autenticado
**When** envía `Accept-Language: pt` y un body inválido (e.g., `title` con 1 carácter)
**Then** la respuesta `400 VALIDATION` incluye `message` traducido al portugués y `code='VALIDATION'` con `details.field='title'`.

---

## ⚠️ Edge Cases

### EC-01: Body sin `title`

**Given** un organizador
**When** envía `{}` o `{ "title": "" }` o `{ "title": "X" }` (longitud < 2)
**Then** responde `400 VALIDATION` con `details.field='title'` y `details.reason ∈ {required, min_length}`.

#### Handling

* La UI deshabilita el botón "Crear" hasta tener título ≥ 2 chars.

---

### EC-02: `title` excede 200 caracteres

**Given** un organizador
**When** envía `title` con 201 caracteres
**Then** responde `400 VALIDATION` con `details.field='title'` y `details.reason='max_length'`.

---

### EC-03: `description` excede 2000 caracteres

**Given** un organizador
**When** envía `description` con 2001 caracteres
**Then** responde `400 VALIDATION` con `details.field='description'` y `details.reason='max_length'`.

---

### EC-04: `due_date` en el pasado

**Given** un organizador autenticado
**When** envía `due_date` ISO-8601 anterior a `now()` del servidor (tolerancia de skew de 60 s para evitar falsos negativos)
**Then** responde `400 DUE_DATE_IN_PAST` con `details.field='due_date'`.

#### Handling

* La UI valida en cliente con el reloj del usuario y bloquea el envío.
* El servidor mantiene la verdad para evitar bypass.

---

### EC-05: `due_date` con formato inválido

**Given** un organizador
**When** envía `due_date="mañana"` o `due_date="2026/08/15"` (no ISO-8601 con offset)
**Then** responde `400 VALIDATION` con `details.field='due_date'` y `details.reason='invalid_format'`.

---

### EC-06: `category_code` inexistente o inactiva

**Given** un organizador
**When** envía `category_code="categoria-inventada"` o un código de categoría con `is_active=false`
**Then** responde `400 CATEGORY_NOT_AVAILABLE` con `details.field='category_code'` (sin distinguir entre inexistente e inactiva, para evitar enumeración).

---

### EC-07: Evento `cancelled` / `completed` / soft-deleted

**Given** un organizador autenticado dueño de un evento en `cancelled` o `completed`
**When** invoca el endpoint
**Then** responde `409 EVENT_NOT_MUTABLE` con `details.event_status` reflejando el estado real y **no** crea la tarea.

#### Handling

* Para evento soft-deleted (`event.deleted_at IS NOT NULL`) responde `404 NOT_FOUND` (consistente con la no-revelación de US-027 EC-06).

---

### EC-08: Carrera contra cambio de estado del evento

**Given** un organizador envía el request mientras otro proceso transiciona el evento a `cancelled` simultáneamente
**When** ambos llegan al backend
**Then** la verificación de mutabilidad atómica gana: o la tarea se crea antes del cambio (`201`) o la creación se rechaza (`409 EVENT_NOT_MUTABLE`). Nunca queda una tarea huérfana en evento `cancelled`.

#### Handling

* Implementación con `SELECT ... FOR UPDATE` corto sobre `events` o lock advisory por `event_id`.

---

### EC-09: Evento ajeno

**Given** un actor autenticado con `eventId` que no pertenece a su `owner_user_id`
**When** invoca el endpoint
**Then** responde `404 NOT_FOUND` global (no-revelación, idéntico a US-027 SEC-06).

---

### EC-10: Vendor o Admin invocan

**Given** un usuario con rol `vendor` o `admin` autenticado
**When** invoca el endpoint
**Then** responde `403 FORBIDDEN` (admin recibe hint en `details.use_endpoint` apuntando al endpoint admin si existe, sin filtrar IDs ajenos).

---

### EC-11: Body con keys extras

**Given** un organizador
**When** envía `{ "title": "X", "priority": "high", "tags": ["a","b"] }` (campos no soportados en MVP)
**Then** los descarta silenciosamente, registra `body.ignoredFields=["priority","tags"]` en el log y crea la tarea con los campos canónicos. Respuesta `201`.

---

### EC-12: Content-Type inválido

**Given** un organizador
**When** envía `Content-Type: text/plain` o body no parseable como JSON
**Then** responde `415 UNSUPPORTED_MEDIA_TYPE` (cuando el Content-Type es no JSON) o `400 INVALID_JSON` (cuando el body no parsea).

---

## 🚫 Validation Rules

| ID    | Rule                                                                | Message / Behavior                                |
| ----- | ------------------------------------------------------------------- | ------------------------------------------------- |
| VR-01 | `eventId` (path) debe ser UUID v4                                   | `400 VALIDATION` (`details.field='eventId'`)      |
| VR-02 | El evento debe existir, pertenecer al actor y no estar soft-deleted | `404 NOT_FOUND` (no-revelación)                   |
| VR-03 | `event.status ∉ {cancelled, completed, deleted}`                    | `409 EVENT_NOT_MUTABLE` antes de tocar `event_tasks` |
| VR-04 | `title` requerido, `string`, longitud `[2..200]`, sin solo whitespace | `400 VALIDATION` (`details.field='title'`)        |
| VR-05 | `description` opcional, `string\|null`, longitud `[0..2000]`        | `400 VALIDATION` (`details.field='description'`)  |
| VR-06 | `due_date` opcional, ISO-8601 con offset, `null` admitido           | `400 VALIDATION` si formato inválido              |
| VR-07 | `due_date` (si se envía y no es `null`) ≥ `now()` con tolerancia 60 s | `400 DUE_DATE_IN_PAST`                            |
| VR-08 | `category_code` opcional, `string\|null`; si se envía debe existir en `ServiceCategory` con `is_active=true` | `400 CATEGORY_NOT_AVAILABLE`                      |
| VR-09 | Campos server-controlled (`ai_generated`, `ai_recommendation_id`, `status`, `id`, `created_by_user_id`, `created_at`, `updated_at`, `deleted_at`, `confirmed_at`, `language_code`) se ignoran silenciosamente | log `body.ignoredFields=[...]`; sin `400`         |
| VR-10 | Body debe ser objeto JSON válido (`application/json`)                | `415` o `400 INVALID_JSON` según el caso          |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                                                          |
| ------ | ------------------------------------------------------------------------------------------------------------- |
| SEC-01 | Ownership obligatoria: `actor.id === event.owner_user_id` (`BR-TASK-001`).                                     |
| SEC-02 | Endpoint exige autenticación; sin sesión devuelve `401 UNAUTHORIZED`.                                          |
| SEC-03 | Sólo el rol `organizer` invoca este endpoint; `vendor` recibe `403 FORBIDDEN`; `admin` recibe `403 FORBIDDEN` (`FR-ADMIN-010`). |
| SEC-04 | No-revelación: evento inexistente, ajeno o soft-deleted → `404 NOT_FOUND` (sin distinguir entre los tres casos). |
| SEC-05 | Eventos `cancelled`/`completed` → `409 EVENT_NOT_MUTABLE` antes de tocar `event_tasks` (`FR-TASK-011`, `BR-TASK-010`). |
| SEC-06 | Logs estructurados sin PII; **no** se logean `title` ni `description` (potencial PII). Sólo metadata (`event_id`, `task_id`, `actor_id`, `has_due_date`, `has_category`, `language_code`, `correlation_id`, `latency_ms`). |
| SEC-07 | Inserción atómica con verificación de mutabilidad (`SELECT FOR UPDATE` corto o lock advisory) para evitar tareas huérfanas en eventos transitando a `cancelled`. |
| SEC-08 | Campos server-controlled del cliente se descartan silenciosamente; nunca se aceptan como input para evitar bypass de `ai_generated` o `status`. |
| SEC-09 | Auditoría: `created_by_user_id`, `created_at`, `correlation_id` persistidos. `updated_at` = `created_at` al insertar. |

### Negative Authorization Scenarios

* Organizer no dueño → `404 NOT_FOUND`.
* Vendor autenticado → `403 FORBIDDEN`.
* Admin autenticado → `403 FORBIDDEN`.
* Anónimo / sesión inválida → `401 UNAUTHORIZED`.
* Evento `cancelled`/`completed` (dueño) → `409 EVENT_NOT_MUTABLE`.
* Evento soft-deleted (dueño) → `404 NOT_FOUND`.

---

## 🤖 AI Behavior

This story does not invoke AI directly.

### AI Involvement

* AI Feature: None (creación manual; `ai_generated=false` server-controlled).
* Provider Layer: Not applicable.
* Human Validation Required: Not applicable (no hay `AIRecommendation`).
* Persist `AIRecommendation`: No.
* Fallback Required: Not applicable.

### AI Input

* Not applicable for this story.

### AI Output

* Not applicable for this story.

### Human-in-the-loop Rules

* Not applicable for this story. El HITL pertenece a las tareas IA generadas por US-018 y materializadas por US-025/US-031.

### AI Error / Fallback Behavior

* Not applicable for this story.

---

## 🎨 UX / UI Notes

| Area                | Notes                                                                                          |
| ------------------- | ---------------------------------------------------------------------------------------------- |
| Screen / Route      | Modal/dialog `CreateTaskDialog` invocado desde `EventChecklistPage` (`/[locale]/organizer/events/:eventId/tasks`) y desde el empty state (CTA "Crear tarea" en US-027 AC-06). |
| Main UI Pattern     | Form modal con campos `title` (requerido), `description` (textarea opcional), `due_date` (date-time picker con timezone del usuario), `category_code` (combobox poblado por endpoint de categorías). |
| Primary Action      | "Crear tarea".                                                                                 |
| Secondary Actions   | "Cancelar" (cierra modal sin mutación).                                                         |
| Empty State         | No aplica al modal; el empty state pertenece a US-027.                                          |
| Loading State       | Botón "Crear tarea" en estado `loading` con spinner y disabled durante la mutación TanStack.    |
| Error State         | Mensaje inline por campo (`title`, `description`, `due_date`, `category_code`) según `details.field` de la respuesta; banner global para `409 EVENT_NOT_MUTABLE`, `404`, `403`. |
| Success State       | Cierre del modal + toast "Tarea creada" + cache invalidation de `['tasks', eventId, ...]` para refrescar US-027. |
| Accessibility Notes | Labels y `aria-describedby` por campo; `role="dialog"` con `aria-modal="true"`; focus trap; mensaje de error con `aria-live="assertive"`; cierre por `Esc`; tap-target ≥ 44 px en mobile. |
| Responsive Notes    | Mobile-first; modal full-screen en `< sm`, centrado en `≥ md`.                                  |
| i18n Notes          | Labels y mensajes de error en `es-LATAM` (default), `es-ES`, `pt`, `en`. Códigos de error permanecen en inglés para QA. |
| Currency Notes      | No aplica (la tarea no expone montos).                                                          |

---

## 🛠 Technical Notes

### Frontend

* Route / Page: `EventChecklistPage` (`/[locale]/organizer/events/:eventId/tasks`) con modal `CreateTaskDialog`.
* Components: `CreateTaskDialog`, `TaskTitleField`, `TaskDescriptionField`, `TaskDueDateField` (con timezone del usuario), `TaskCategoryCombobox` (reusa el endpoint de categorías), `FormErrorBanner`.
* State Management: TanStack `useCreateEventTask({ eventId })` (mutation) con `onSuccess` que invalida `['tasks', eventId]` y cierra el modal; `onError` mapea `details.field` a mensajes inline.
* Forms: React Hook Form + Zod (`createEventTaskFormSchema` mirror del schema backend con tolerancia de UI para fechas locales).
* API Client: `tasksApi.create(eventId, body)` que serializa `due_date` en ISO-8601 UTC.

### Backend

* Use Case / Service: `CreateEventTaskUseCase` (orquesta ownership + mutabilidad + validación de categoría + inserción + auditoría).
* Controller / Route: `POST /api/v1/events/:eventId/tasks` cableado en el módulo `tasks`.
* Authorization Policy: `EventOwnershipPolicy` (reuso de US-027) + `OrganizerRoleGuard` + `adminExclusionGuard`.
* Validation: Zod `createEventTaskParamsSchema` (path con UUID v4), `createEventTaskBodySchema` (body), `serviceCategoryActiveValidator` (DB lookup con cache corto).
* Transaction Required: Sí — `prismaService.$transaction` corto: (a) `SELECT FOR UPDATE` o lock advisory sobre `events` para verificar `status` y `deleted_at`; (b) opcional lookup `service_categories` (puede ir fuera de la tx si se cachea); (c) `INSERT` en `event_tasks`.

### Database

* Main Tables:
  * `event_tasks` (insert; reusa enum `event_task_status` con default `pending`).
  * `events` (read with row-level lock para mutabilidad).
  * `service_categories` (read para validar `category_code` activa).
* Constraints: FK `event_id`, FK `category_code` (cuando no NULL) con `ON DELETE RESTRICT`; check `language_code ∈ {es, en, pt, fr}` (reusa el del evento).
* Index Considerations: reusa índice canónico `idx_event_tasks_event_status_due (event_id, status, due_date)`; sin índices nuevos.

### API

| Method | Endpoint                                            | Purpose                              |
| ------ | --------------------------------------------------- | ------------------------------------ |
| POST   | `/api/v1/events/:eventId/tasks`                     | Crear `EventTask` manual              |

* Request body (validado con Zod):
  ```jsonc
  {
    "title": "string (2..200)",
    "description": "string (0..2000) | null  // opcional",
    "due_date": "ISO-8601 con offset | null  // opcional",
    "category_code": "string slug | null     // opcional"
  }
  ```
* Response `201 Created`:
  ```jsonc
  {
    "id": "uuid",
    "event_id": "uuid",
    "title": "...",
    "due_date": null,
    "status": "pending",
    "category_code": null,
    "ai_generated": false,
    "ai_recommendation_id": null,
    "confirmed_at": null,
    "created_at": "ISO-8601",
    "updated_at": "ISO-8601"
  }
  ```
* Headers: `Location: /api/v1/events/:eventId/tasks/:taskId`.

### Observability / Audit

* Correlation ID Required: Yes (`NFR-OBS-001`).
* Log Event Required: Yes — `tasks.created` con `correlation_id`, `actor_id`, `event_id`, `task_id`, `ai_generated=false`, `has_due_date: boolean`, `has_category: boolean`, `language_code`, `latency_ms`, `body.ignoredFields?`.
* AdminAction Required: No (no es flujo admin).
* AIRecommendation Required: No.
* Métrica: `tasks_created_total{ai_generated="false"}` (counter), `tasks_created_latency_ms` (histograma).

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                                | Type        |
| ----- | ----------------------------------------------------------------------- | ----------- |
| TS-01 | Crear con sólo `title`; defaults canónicos persistidos                   | Integration |
| TS-02 | Crear con todos los campos incluyendo `due_date` futura y `category_code` | Integration |
| TS-03 | `category_code=null` explícito persiste como NULL                        | Integration |
| TS-04 | `description=null` explícito persiste como NULL                          | Integration |
| TS-05 | Server-controlled fields enviados por el cliente se descartan silenciosamente | Integration |
| TS-06 | Body con keys extras se descarta con `body.ignoredFields` logueado       | Integration |
| TS-07 | i18n: `Accept-Language=pt` retorna mensajes traducidos                   | Integration |
| TS-08 | E2E: organizer abre modal, completa form, submit, ve la tarea en la lista (US-027) | E2E         |
| TS-09 | E2E: doble click en "Crear" no genera dos tareas (UI mitiga via TanStack) | E2E         |

### Negative Tests

| ID    | Scenario                                                | Expected Result                            |
| ----- | ------------------------------------------------------- | ------------------------------------------ |
| NT-01 | `eventId` con formato inválido                          | `400 VALIDATION` (`details.field='eventId'`) |
| NT-02 | Body sin `title`                                        | `400 VALIDATION` (`details.field='title'`)   |
| NT-03 | `title` con sólo whitespace                             | `400 VALIDATION` (`details.field='title'`)   |
| NT-04 | `title` con 1 carácter                                  | `400 VALIDATION` (`details.reason='min_length'`) |
| NT-05 | `title` con 201 caracteres                              | `400 VALIDATION` (`details.reason='max_length'`) |
| NT-06 | `description` con 2001 caracteres                       | `400 VALIDATION` (`details.field='description'`) |
| NT-07 | `due_date` en el pasado                                 | `400 DUE_DATE_IN_PAST`                     |
| NT-08 | `due_date` con formato no ISO-8601                      | `400 VALIDATION` (`details.field='due_date'`) |
| NT-09 | `category_code` inexistente                             | `400 CATEGORY_NOT_AVAILABLE`               |
| NT-10 | `category_code` existente pero `is_active=false`        | `400 CATEGORY_NOT_AVAILABLE`               |
| NT-11 | Evento `cancelled` (dueño)                              | `409 EVENT_NOT_MUTABLE`                    |
| NT-12 | Evento `completed` (dueño)                              | `409 EVENT_NOT_MUTABLE`                    |
| NT-13 | Evento soft-deleted (dueño)                             | `404 NOT_FOUND`                            |
| NT-14 | Evento ajeno                                            | `404 NOT_FOUND`                            |
| NT-15 | Vendor invoca                                           | `403 FORBIDDEN`                            |
| NT-16 | Admin invoca                                            | `403 FORBIDDEN`                            |
| NT-17 | Anónimo                                                 | `401 UNAUTHORIZED`                         |
| NT-18 | `Content-Type: text/plain`                              | `415 UNSUPPORTED_MEDIA_TYPE`               |
| NT-19 | Body con JSON no parseable                              | `400 INVALID_JSON`                         |

### AI Tests

Not applicable for this story (el endpoint no invoca al `LLMProvider` ni crea `AIRecommendation`).

### Authorization Tests

| ID         | Scenario                  | Expected Result    |
| ---------- | ------------------------- | ------------------ |
| AUTH-TS-01 | Organizer dueño            | `201 Created`      |
| AUTH-TS-02 | Organizer no dueño         | `404 NOT_FOUND`    |
| AUTH-TS-03 | Vendor autenticado         | `403 FORBIDDEN`    |
| AUTH-TS-04 | Admin autenticado          | `403 FORBIDDEN`    |
| AUTH-TS-05 | Anónimo                    | `401 UNAUTHORIZED` |

### Concurrency Tests

| ID      | Scenario                                                                 | Expected Result                  |
| ------- | ------------------------------------------------------------------------ | -------------------------------- |
| CONC-01 | Creación + cambio de evento a `cancelled` casi simultáneos                | O `201` o `409`; nunca tarea huérfana en `cancelled` |
| CONC-02 | Doble creación con mismo body (sin `Idempotency-Key`)                    | Dos tareas con `id` distintos     |

### Accessibility Tests

* Modal con `role="dialog"`, `aria-modal="true"`, focus trap, cierre por `Esc`.
* Cada campo con `<label>` asociado y `aria-describedby` apuntando a mensaje de error si existe.
* Mensajes de error con `aria-live="assertive"`.
* Navegación completa por teclado (Tab, Shift+Tab).
* Contraste de inputs y botones ≥ WCAG AA.

---

## 📊 Business Impact

| Field               | Value                                                                                |
| ------------------- | ------------------------------------------------------------------------------------ |
| KPI Affected        | Engagement del rol Organizer; tasa de creación exitosa de tareas manuales            |
| Expected Impact     | Permite complementar el checklist IA con acciones específicas y reduce la fricción del CTA empty state de US-027 |
| Success Criteria    | Tasa de creación exitosa > 99% (sin 5xx por minuto en P95); P95 backend ≤ 1.5 s; abandono del modal < 30% |
| Academic Demo Value | Demuestra integración manual con IA: organizer puede crear una tarea propia y ver la lista mixta con badge AI vs manual |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks

* `CreateTaskDialog` con form RHF + Zod.
* `TaskTitleField`, `TaskDescriptionField`, `TaskDueDateField` (con timezone), `TaskCategoryCombobox`.
* Hook `useCreateEventTask` con TanStack + cache invalidation de `['tasks', eventId]`.
* Integración con el empty state de US-027 (CTA "Crear tarea").
* i18n para labels y mensajes de error en 4 locales.
* Tests E2E (TS-08, TS-09).

### Potential Backend Tasks

* `CreateEventTaskUseCase` con orquestación atómica (ownership + mutabilidad + inserción).
* Zod schemas (`createEventTaskParamsSchema`, `createEventTaskBodySchema`).
* `EventTaskRepository.create(...)` con Prisma; agregar al repositorio existente compartido con US-027.
* `serviceCategoryActiveValidator` (con cache corto o lookup directo).
* Controller `POST /events/:eventId/tasks` cableado.
* Reuso de `EventOwnershipPolicy` + `OrganizerRoleGuard` + `adminExclusionGuard`.
* Mapper `EventTask → TaskListItemDto` (reuso de US-027).

### Potential Database Tasks

* Verificación de que las columnas y el enum existen en `event_tasks` y que `service_categories` expone `is_active`. Sin migración nueva.

### Potential AI / PromptOps Tasks

* Not applicable for this story.

### Potential QA Tasks

* Tests integration por AC (TS-01..09).
* Tests negativos por NT-01..19.
* Tests autorización por AUTH-TS-01..05.
* Tests concurrencia por CONC-01..02.
* Tests accesibilidad (axe + navegación por teclado).

### Potential DevOps / Config Tasks

* Not applicable for this story.

---

## ✅ Definition of Ready

* [x] Rol claro (Organizer dueño del evento).
* [x] Goal/valor claros.
* [x] FRD/UC/BR enlazados (`FR-TASK-002/004/011/012`, `UC-TASK-001`, `BR-TASK-001/002/006/008/009/010`, `BR-AI-008`).
* [x] Permisos identificados (ownership; vendor/admin excluidos; no-revelación 404).
* [x] Entidades listadas (`EventTask`, `Event`, `ServiceCategory`).
* [x] AC en GWT (creación con/sin opcionales, server-controlled fields, i18n).
* [x] Edge cases documentados (12 EC: title, description, due_date, category, event status, race condition, ownership, Content-Type, extras).
* [x] Validación clara (Zod tolerante a campos extras, estricta en requeridos).
* [x] Out of Scope explícito (edición, transición, eliminación, bulk, subtareas, recurrencia, idempotency, push).
* [x] Dependencias conocidas (PB-P1-018 hermanas, PB-P1-006, PB-P0-001/014, PB-P1-019).
* [x] UX states identificados (modal, loading, error inline, success toast).
* [x] API definida (`POST /api/v1/events/:eventId/tasks` con body Zod).
* [x] Tests definidos (9 functional, 19 negative, 5 authorization, 2 concurrency, accesibilidad).
* [x] PO/BA validó.

---

## 🏁 Definition of Done

* [ ] Endpoint `POST /events/:eventId/tasks` operativo con validación Zod + ownership + mutabilidad atómica.
* [ ] Inserción atómica enforced (`SELECT FOR UPDATE` o lock advisory) sin tareas huérfanas en `cancelled`.
* [ ] Server-controlled fields nunca aceptados desde el cliente (`ai_generated=false`, `status='pending'`, `ai_recommendation_id=null`, `language_code` heredado).
* [ ] Response `201 Created` retorna `TaskListItemDto` consistente con US-027.
* [ ] i18n verificada en `es-LATAM` (default), `es-ES`, `pt`, `en`.
* [ ] Logs estructurados sin PII (`title`/`description` no logueados).
* [ ] Tests funcionales, negativos, autorización, concurrencia y accesibilidad verdes en CI.
* [ ] Métricas `tasks_created_total{ai_generated="false"}` y `tasks_created_latency_ms` expuestas.
* [ ] PO valida en demo: organizer crea una tarea manual desde el empty state de US-027, la ve aparecer en el listado con badge "manual" sin badge IA.

---

## 📝 Notes

* Documentation Alignment Required: el draft original referenciaba `NFR-PERF-API-001`; el canónico es `NFR-PERF-001` (`/docs/10`). Se adopta `NFR-PERF-001` y se sugiere cleanup editorial. No bloqueante.
* Documentation Alignment Required: `/docs/16` debe regenerar el snapshot OpenAPI vía US-098 para reflejar el body schema con `description`, `due_date`, `category_code`. No bloquea US-028.
* Documentation Alignment Required: el draft mencionaba `FR-TASK-002` y `UC-TASK-002`; el canónico de `/docs/9` mapea `FR-TASK-002 → UC-TASK-001`. Se adopta `UC-TASK-001` y se sugiere cleanup. No bloqueante.
* La sugerencia del draft de "prefill de categoría desde IA-004 (US-020)" se materializa en frontend leyendo el response de US-020 y poblando el combobox; el backend de US-028 no realiza esa consulta — sólo valida la categoría enviada.
* El timezone del evento se asume UTC para `due_date` (ISO-8601 con offset). Si en el futuro EventFlow introduce `event.timezone`, esta US heredará el cambio sin modificación de schema (sólo de validación).
* La performance budget (`NFR-PERF-001`, P95 ≤ 1.5 s) cubre lookup de categoría + lock corto + inserción; en MVP no se observa contención porque sólo un organizer escribe sobre sus propias tareas.
* El campo `language_code` se persiste en `event_tasks` para mantener consistencia con tareas IA (`BR-AI-011`) y permitir future i18n por tarea; en MVP sólo refleja `event.language_code`.
