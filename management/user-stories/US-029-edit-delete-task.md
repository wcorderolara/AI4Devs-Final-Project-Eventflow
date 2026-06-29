# 🧾 User Story: Editar, transicionar estado o eliminar mi tarea (Organizer)

## 🆔 Metadata

| Field              | Value                                                                |
| ------------------ | -------------------------------------------------------------------- |
| ID                 | US-029                                                               |
| Epic               | EPIC-TASK-001 — Checklist & Task Management                          |
| Backlog Item       | PB-P1-018 — CRUD de tareas manuales y máquina de estados              |
| UI Surface         | Página "Mi checklist" del evento, inline edit + diálogo de eliminación |
| Feature            | Edición de contenido, transición de estado y soft delete de `EventTask` |
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
**I want** editar el contenido de mis tareas, transicionar su estado siguiendo el flujo `pending → in_progress → done | skipped`, o eliminarlas con soft delete
**So that** mantenga mi planificación actualizada, refleje mi progreso real y limpie tareas que ya no aplican, sin perder trazabilidad ni romper el origen IA o manual

---

## 🧠 Business Context

### Context Summary

US-029 cubre las **tres mutaciones** definidas por `/docs/16` §25.2 sobre una `EventTask` existente:

* `PATCH /api/v1/events/:eventId/tasks/:taskId` — actualiza contenido editable (`title`, `description`, `due_date`, `category_code`) sin alterar el `status` ni el origen (`ai_generated`, `ai_recommendation_id`).
* `PATCH /api/v1/events/:eventId/tasks/:taskId/status` — transiciona el estado siguiendo la máquina canónica `pending → in_progress → done | skipped` (`FR-TASK-004`, `BR-TASK-004`, `C-027`).
* `DELETE /api/v1/events/:eventId/tasks/:taskId` — soft delete (`deleted_at`, `deleted_by_user_id`); no se permite hard delete en MVP.

Las tres operaciones aplican por igual a tareas manuales (US-028) y tareas IA materializadas (US-018 + US-025 strategy `checklist`); el flag `ai_generated`, la columna `ai_recommendation_id` y la columna `confirmed_at` permanecen inmutables (`FR-TASK-012`). El `updated_at`, `updated_by_user_id` y `correlation_id` se actualizan en cada mutación con auditoría completa. La response reutiliza el `TaskListItemDto` ya definido por US-027 / US-028 para mantener cache invalidation sin un GET adicional.

### Related Domain Concepts

* `EventTask` (entidad principal; mutaciones de contenido, estado y soft delete).
* `EventTask.status ∈ {pending, in_progress, done, skipped}` (`/docs/18`).
* `EventTask.ai_generated: boolean` (inmutable; preserva el origen IA/manual, `BR-TASK-002`, `FR-TASK-012`).
* `EventTask.ai_recommendation_id?` (inmutable; trazabilidad IA, `BR-AI-008/010`).
* `EventTask.confirmed_at?` (inmutable por estos endpoints; lo gestionan US-025/US-031).
* `EventTask.deleted_at?`, `EventTask.deleted_by_user_id?` (soft delete enforced).
* `Event.status` (modula mutabilidad; `cancelled` y `completed` bloquean mutaciones).
* `ServiceCategory` (read; valida `category_code`).

### Assumptions

* La `EventTask` ya existe (manual por US-028, IA por US-018 + US-025).
* El idioma del evento (`event.language_code`) no cambia con la edición.
* El catálogo `ServiceCategory` está cargado y vigente.
* La UI usa inline edit para campos textuales y un diálogo de confirmación para `DELETE` y para transicionar a `done` o `skipped` (estados terminales).

### Dependencies

* PB-P1-018 / US-027 (lista, infraestructura compartida: `EventTaskRepository`, `TaskListItemDto`, `EventOwnershipPolicy`, `OrganizerRoleGuard`, `adminExclusionGuard`).
* PB-P1-018 / US-028 (crear; comparte `EventTaskRepository`, validación de `category_code` con `ServiceCategoryReadPort.findActiveByCode`).
* PB-P1-018 / US-030 (visibilidad de tareas eliminadas / auditoría admin; tangencial).
* PB-P1-012 / US-018 + PB-P1-016 / US-025 (origen IA de la tarea; no se altera).
* PB-P1-017 / US-031 (bulk confirm; usa otro endpoint).
* PB-P1-006 (evento con estado mutable).
* PB-P0-014 (observabilidad; correlation IDs).

---

## 🔗 Traceability

| Source                 | Reference                                                                                                |
| ---------------------- | -------------------------------------------------------------------------------------------------------- |
| Backlog Item           | PB-P1-018                                                                                                |
| FRD Requirement(s)     | FR-TASK-003 (editar contenido), FR-TASK-004 (state machine `pending → in_progress → done|skipped`), FR-TASK-005 (soft delete enforced post-confirmación), FR-TASK-011 (bloqueos por `event.status`), FR-TASK-012 (`ai_generated` inmutable) |
| Use Case(s)            | UC-TASK-003 (editar tarea), UC-TASK-001 (gestión transversal del checklist)                              |
| Business Rule(s)       | BR-TASK-002 (`ai_generated` registrado e inmutable), BR-TASK-004 (transiciones de estado válidas), BR-TASK-005 (edición individual), BR-TASK-006 (categoría opcional, FK activa), BR-TASK-010 (bloqueo en `cancelled`/`completed`), BR-AI-008/010 (preservar trazabilidad IA) |
| Permission Rule(s)     | Ownership: `actor.id === event.owner_user_id`; admin **no** participa (`FR-ADMIN-010`); vendor → `403`    |
| Data Entity / Entities | `EventTask`, `Event`, `ServiceCategory` (read), `AIRecommendation` (solo lectura para trazabilidad inmutable) |
| API Endpoint(s)        | `PATCH /api/v1/events/:eventId/tasks/:taskId`, `PATCH /api/v1/events/:eventId/tasks/:taskId/status`, `DELETE /api/v1/events/:eventId/tasks/:taskId` |
| NFR Reference(s)       | NFR-PERF-001 (P95 ≤ 1.5 s endpoints no-IA), NFR-OBS-001 (correlation ID), NFR-OBS-002 (logs estructurados sin PII), NFR-SEC-005 (auditoría de mutaciones) |
| Related ADR(s)         | ADR-API-001 (versionado `/api/v1`), ADR-API-004 (correlation ID)                                          |
| PO Decision(s)         | Decisión PO PB-P1-018 (Acceptance Summary): validación de estados, read-only en `event.completed`, bloqueado en `cancelled`, soft delete enforced. |
| Related Document(s)    | `/docs/4` BR-TASK-002/004/005/006/010, BR-AI-008/010, `/docs/6` `EventTask`, `/docs/8` UC-TASK-003, `/docs/9` FR-TASK-003/004/005/011/012, `/docs/10` NFR-PERF-001, NFR-OBS-001/002, `/docs/16` §25.2 endpoints + §25.3 DTOs + §25.4 reglas enforced, `/docs/18` `event_tasks` + estados + `deleted_at`, `/docs/19` ownership + audit, `management/artifacts/4-Product-Backlog-Prioritized.md` PB-P1-018 |

---

## 🧩 PO/BA Decisions Applied

1. **Tres endpoints canónicos (`/docs/16` §25.2)** — `PATCH /tasks/:taskId` para contenido, `PATCH /tasks/:taskId/status` para estado, `DELETE /tasks/:taskId` para soft delete. No se unifican en un solo endpoint para preservar la separación de responsabilidades del state machine.
2. **Body PATCH content (`/api/v1/events/:eventId/tasks/:taskId`)** — Zod parcial `{ title?: string(2..200), description?: string(0..2000)|null, due_date?: ISO-8601|null, category_code?: string(slug)|null }`. Todos los campos opcionales. El body debe contener al menos un campo: `400 EMPTY_PATCH` si todos son `undefined`. `null` vacía explícitamente el campo (para `description`, `due_date`, `category_code`); `title` no admite `null`.
3. **Body PATCH status (`/api/v1/events/:eventId/tasks/:taskId/status`)** — Zod `{ status: 'pending' | 'in_progress' | 'done' | 'skipped' }`. Cualquier otro valor → `400 VALIDATION`.
4. **State machine canónica (`FR-TASK-004`, `BR-TASK-004`, `C-027`)** — Transiciones válidas: `pending → in_progress`, `pending → done`, `pending → skipped`, `in_progress → done`, `in_progress → skipped`. No se permite regresar desde `done` ni `skipped` (estados terminales). Transición a sí mismo → `204 No Op` documentada como idempotente (no error). Cualquier otra transición → `409 INVALID_TRANSITION` con `details.current_status` y `details.requested_status`.
5. **`ai_generated`, `ai_recommendation_id`, `confirmed_at` inmutables (`FR-TASK-012`, `BR-AI-008/010`)** — Estas columnas no se pueden modificar por estos endpoints. Si llegan en el body PATCH content, se descartan silenciosamente con log `body.ignoredFields` (patrón consistente con US-028 PO/BA #5). Otros campos server-controlled (`id`, `event_id`, `status`, `created_by_user_id`, `created_at`, `updated_at`, `language_code`, `deleted_at`, `deleted_by_user_id`) reciben el mismo tratamiento.
6. **`confirmed_at` no se altera aquí** — La columna `confirmed_at` la gestionan exclusivamente el flujo HITL de US-025 (apply) y el bulk confirm de US-031. La transición de estado por US-029 actualiza `status` y `updated_at`, pero **no** toca `confirmed_at` aunque la tarea pase a `in_progress` o `done`.
7. **Validación de `category_code` (`BR-TASK-006`, `BR-SERVICE-001`)** — Reusa `ServiceCategoryReadPort.findActiveByCode` de US-019/US-020/US-028. Cuando se envía un slug, debe coincidir con `ServiceCategory.code` y `is_active=true`. Inválida → `400 CATEGORY_NOT_AVAILABLE` (sin distinguir inexistente vs. inactiva, evita enumeración). `null` y ausente son válidos.
8. **Validación de `due_date` (`BR-TASK-006`)** — Solo se rechaza fecha en el pasado para tareas con `status='pending'` (la edición de tareas activas o terminales puede mantener fechas pasadas para reflejar historia). Tolerancia `±60 s` skew para `pending`. `null` permitido. `400 DUE_DATE_IN_PAST` cuando aplique.
9. **Mutabilidad atómica del evento (`FR-TASK-011`, `BR-TASK-010`)** — Cualquiera de los tres endpoints obtiene un lock cooperativo del evento (`pg_advisory_xact_lock(hashtext(eventId))` o `SELECT event FOR UPDATE`) al inicio de la transacción. Si `event.status ∈ {cancelled, completed}` → `409 EVENT_NOT_MUTABLE` con `details.event_status`. Si `event.deleted_at IS NOT NULL` → `404 NOT_FOUND` (no-revelación).
10. **`event.status='completed'` permite lectura pero no mutación** — Los GET de US-027 siguen funcionando; las tres mutaciones de US-029 devuelven `409 EVENT_NOT_MUTABLE`. Mensaje localizado para que la UI muestre el banner read-only.
11. **DELETE soft, no hard (`BR-TASK-009` declarado como PO Decision PB-P1-018)** — `DELETE` actualiza `deleted_at = now()`, `deleted_by_user_id = actor.id`, `updated_at = now()`, `correlation_id`. La fila permanece en `event_tasks`. Las listas (US-027) la excluyen siempre (`WHERE deleted_at IS NULL`).
12. **Idempotencia del DELETE** — Doble `DELETE` sobre la misma tarea → `404 NOT_FOUND`. No se distingue entre "no existía" y "ya eliminada" (no-revelación). El primer `DELETE` exitoso devuelve `204 No Content`.
13. **PATCH content/status sobre tarea soft-deleted** — Cualquier PATCH sobre `deleted_at IS NOT NULL` → `404 NOT_FOUND` (no-revelación). El recurso ya no existe para el actor; restauración self-service queda fuera de scope.
14. **Ownership backend-only** — `actor.id === event.owner_user_id`. Cualquier mismatch → `404 NOT_FOUND` para el evento o `404 NOT_FOUND` para la `taskId` si no pertenece al evento (no se distingue entre "no existe" y "no es tuyo"). Vendor → `403 FORBIDDEN`. Admin → `403 FORBIDDEN` (no participa; `FR-ADMIN-010`).
15. **Response canónico `200 OK` con `TaskListItemDto`** — Tanto PATCH content como PATCH status devuelven el DTO actualizado para invalidación de cache en US-027. `DELETE` devuelve `204 No Content` sin body (estándar REST).
16. **Auditoría obligatoria** — Toda mutación persiste `updated_at = now()`, `updated_by_user_id = actor.id`, `correlation_id` (heredado del request). Para `DELETE` adicional: `deleted_at`, `deleted_by_user_id`. Las columnas IA y `confirmed_at` no se tocan.
17. **Telemetría sin PII** — Logs `tasks.updated` y `tasks.deleted` con `event_id`, `actor_id`, `task_id`, `ai_generated` (propagado), `fields_changed` (solo nombres, sin valores), `previous_status`/`new_status` para transiciones, `correlation_id`. Nunca se logean `title`, `description`, `category_code` literal.

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: In Scope
* MVP Relevance: Must Have

### Explicitly Out of Scope

* Restauración self-service de tareas eliminadas (admin only en US-030 o Future).
* Hard delete; sólo soft delete.
* Bulk PATCH/DELETE (cada operación es por ID; el bulk confirm `pending → confirmed` lo cubre US-031).
* Edición de `ai_generated`, `ai_recommendation_id`, `confirmed_at`, `language_code`, `created_by_user_id` (server-controlled).
* Undo en el toast tras eliminar (Future; requiere endpoint de restauración).
* Asignación a múltiples usuarios o reasignación (Future).
* Notificaciones push o email al cambiar estado (Future).
* Recordatorios externos.
* Endpoint admin paralelo (cubierto por flujo admin separado).
* Edición masiva de campos vía CSV o import.

### Scope Notes

* Las tres operaciones comparten `EventTaskRepository` con US-027/028.
* La validación de mutabilidad y ownership se realiza al inicio de la transacción para evitar inconsistencias.
* La UI muestra modo read-only basándose en `event.status` recibido del listado; las mutaciones siguen siendo posibles desde la API si la UI estuviera desincronizada, pero el backend bloquea con `409`.

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Editar contenido válido de tarea propia

**Given** un organizador autenticado dueño de un evento mutable y una `EventTask` propia con `status='pending'`, `deleted_at IS NULL`
**When** invoca `PATCH /api/v1/events/:eventId/tasks/:taskId` con `{ "title": "Confirmar menú", "due_date": "2026-09-15T18:00:00Z" }`
**Then** el backend valida ownership (404 silencioso si no aplica), mutabilidad atómica (`pg_advisory_xact_lock`), `due_date` futura, ausencia de `category_code` (no se toca), y persiste los cambios con `updated_at = now()`, `updated_by_user_id = actor.id`, `correlation_id`
**And** **no** modifica `ai_generated`, `ai_recommendation_id`, `confirmed_at`, `status`, `language_code`, `created_by_user_id`
**And** devuelve `200 OK` con `TaskListItemDto` reflejando los nuevos valores
**And** persiste log `tasks.updated` con `task_id`, `event_id`, `actor_id`, `ai_generated`, `fields_changed: ["title", "due_date"]`, `correlation_id`.

### AC-02: Transicionar estado siguiendo el state machine

**Given** una tarea propia con `status='pending'`
**When** invoca `PATCH /api/v1/events/:eventId/tasks/:taskId/status` con `{ "status": "in_progress" }`
**Then** el backend valida la transición (`pending → in_progress` permitida por `FR-TASK-004`), persiste `status='in_progress'`, `updated_at = now()`, `updated_by_user_id = actor.id`
**And** **no** modifica `confirmed_at` (delegado a US-025/US-031), `ai_generated`, `ai_recommendation_id`
**And** devuelve `200 OK` con `TaskListItemDto` reflejando `status='in_progress'`
**And** persiste log `tasks.updated` con `fields_changed: ["status"]`, `previous_status: "pending"`, `new_status: "in_progress"`.

### AC-03: Soft delete de tarea propia

**Given** una tarea propia con `deleted_at IS NULL`
**When** invoca `DELETE /api/v1/events/:eventId/tasks/:taskId`
**Then** el backend persiste `deleted_at = now()`, `deleted_by_user_id = actor.id`, `updated_at = now()`, `correlation_id`
**And** **no** modifica `ai_generated`, `ai_recommendation_id`, `confirmed_at`, `status`
**And** devuelve `204 No Content` sin body
**And** persiste log `tasks.deleted` con `task_id`, `event_id`, `actor_id`, `ai_generated`, `correlation_id`
**And** la tarea no aparece en listados de US-027 (filtrada por `deleted_at IS NULL`).

### AC-04: Edición de tarea generada por IA preserva trazabilidad

**Given** una `EventTask` con `ai_generated=true`, `ai_recommendation_id=R1`, `status='pending'`
**When** se invoca `PATCH /tasks/:taskId` con `{ "title": "Texto editado por el organizador" }`
**Then** la tarea persiste el nuevo `title` y mantiene `ai_generated=true`, `ai_recommendation_id=R1` sin cambios
**And** la respuesta `TaskListItemDto` expone `ai_generated=true` y `ai_recommendation_id=R1` para que la UI conserve el badge "Sugerido por IA".

### AC-05: PATCH con `category_code=null` vacía explícitamente la categoría

**Given** una tarea con `category_code='catering'`
**When** se invoca `PATCH /tasks/:taskId` con `{ "category_code": null }`
**Then** la tarea persiste `category_code=NULL` y la respuesta refleja `category_code: null`.

### AC-06: PATCH content y PATCH status son operaciones independientes

**Given** una tarea con `status='in_progress'`, `title='Original'`
**When** se invoca `PATCH /tasks/:taskId` con `{ "title": "Modificado" }`
**Then** la tarea conserva `status='in_progress'` y persiste `title='Modificado'`
**And** un `PATCH /tasks/:taskId/status` posterior con `{ "status": "done" }` transiciona el estado sin tocar `title`.

---

## ⚠️ Edge Cases

### EC-01: Evento `cancelled` o `completed`

**Given** `event.status ∈ {cancelled, completed}`
**When** se invoca cualquiera de los tres endpoints (PATCH content, PATCH status, DELETE)
**Then** el backend devuelve `409 EVENT_NOT_MUTABLE` con `details.event_status` antes de aplicar cambios
**And** **no** persiste ninguna mutación
**And** persiste log `tasks.updated.blocked` o `tasks.deleted.blocked` con `reason: "event_not_mutable"`.

#### Handling

* La UI debe mostrar el banner read-only basándose en `event.status` recibido del listado.

---

### EC-02: Transición inválida (e.g., `done → pending`)

**Given** una tarea con `status='done'`
**When** se invoca `PATCH /tasks/:taskId/status` con `{ "status": "pending" }`
**Then** el backend devuelve `409 INVALID_TRANSITION` con `details.current_status='done'`, `details.requested_status='pending'`, `details.allowed_transitions=[]`
**And** no altera el estado.

#### Handling

* Estados `done` y `skipped` son terminales en MVP.

---

### EC-03: Transición a sí mismo (idempotencia)

**Given** una tarea con `status='in_progress'`
**When** se invoca `PATCH /tasks/:taskId/status` con `{ "status": "in_progress" }`
**Then** el backend documenta esto como `200 OK` con `TaskListItemDto` sin cambios materiales y log `tasks.updated.no_op` para auditoría
**And** **no** persiste un nuevo `updated_at`.

---

### EC-04: Tarea soft-deleted o inexistente

**Given** una tarea con `deleted_at IS NOT NULL` o que no existe
**When** se invoca cualquiera de los tres endpoints
**Then** el backend devuelve `404 NOT_FOUND` sin distinguir entre "no existe", "no es tuya" o "ya eliminada".

#### Handling

* No-revelación: el cliente debe asumir que la operación no fue posible.

---

### EC-05: Doble DELETE

**Given** un primer `DELETE` exitoso (`204`)
**When** se invoca `DELETE` nuevamente sobre el mismo `taskId`
**Then** el backend devuelve `404 NOT_FOUND` (la tarea ya está soft-deleted y excluida).

---

### EC-06: PATCH content vacío

**Given** un body sin ningún campo editable definido (`{}`)
**When** se invoca `PATCH /tasks/:taskId`
**Then** el backend devuelve `400 EMPTY_PATCH` con `details.message="At least one field must be provided."`.

---

### EC-07: PATCH content con server-controlled fields

**Given** un body con `{ "title": "OK", "ai_generated": false, "id": "X", "status": "done", "confirmed_at": "..." }`
**When** se invoca `PATCH /tasks/:taskId`
**Then** el backend descarta silenciosamente `ai_generated`, `id`, `status`, `confirmed_at` (Zod `.strip()` + `body.ignoredFields` log), persiste solo `title`
**And** la respuesta refleja los valores reales server-side.

---

### EC-08: PATCH content con `due_date` pasada en tarea `pending`

**Given** una tarea `pending` con `due_date='2026-08-01'`
**When** se invoca `PATCH /tasks/:taskId` con `{ "due_date": "2024-01-01T00:00:00Z" }`
**Then** el backend devuelve `400 DUE_DATE_IN_PAST` con tolerancia `±60s` skew.

---

### EC-09: PATCH content con `due_date` pasada en tarea `in_progress` o `done`

**Given** una tarea con `status ∈ {in_progress, done, skipped}` (e.g., refleja una fecha histórica)
**When** se invoca `PATCH /tasks/:taskId` con `{ "due_date": "2024-01-01T00:00:00Z" }`
**Then** el backend acepta la fecha pasada (no aplica la validación de futura) para permitir corregir historia.

---

### EC-10: PATCH content con `category_code` inválida o inactiva

**Given** un `category_code` que no existe o tiene `is_active=false`
**When** se invoca `PATCH /tasks/:taskId`
**Then** el backend devuelve `400 CATEGORY_NOT_AVAILABLE` con `details.field='category_code'`.

---

### EC-11: PATCH content que reduce `description` a `null`

**Given** una tarea con `description='Texto'`
**When** se invoca `PATCH /tasks/:taskId` con `{ "description": null }`
**Then** el backend persiste `description=NULL`.

---

### EC-12: Vendor o admin invocan los endpoints

**Given** un actor con rol `vendor` o `admin`
**When** invoca cualquiera de los tres endpoints
**Then** el backend devuelve `403 FORBIDDEN` antes de tocar la base.

---

### EC-13: Eventos concurrentes (cancellation en flight + PATCH)

**Given** un evento que está siendo cancelado por otra request al mismo tiempo
**When** se invoca `PATCH /tasks/:taskId/status`
**Then** el lock cooperativo del evento (`pg_advisory_xact_lock`) garantiza que la mutación de tarea ve un estado de evento consistente: o se aplica antes (200) o falla con `409 EVENT_NOT_MUTABLE` si la cancelación ganó.

---

### EC-14: Body con Content-Type incorrecto

**Given** un body con `Content-Type: text/plain`
**When** se invoca PATCH
**Then** el backend devuelve `415 UNSUPPORTED_MEDIA_TYPE`.

---

## 🚫 Validation Rules

| ID    | Rule                                                                              | Message / Behavior          |
| ----- | --------------------------------------------------------------------------------- | --------------------------- |
| VR-01 | `eventId` debe ser UUID v4                                                        | `400 VALIDATION`            |
| VR-02 | `taskId` debe ser UUID v4                                                         | `400 VALIDATION`            |
| VR-03 | Evento y tarea deben existir, pertenecer al actor y no estar soft-deleted          | `404 NOT_FOUND`             |
| VR-04 | `event.status ∉ {cancelled, completed}` para mutaciones                            | `409 EVENT_NOT_MUTABLE`     |
| VR-05 | PATCH content: al menos un campo editable definido                                 | `400 EMPTY_PATCH`           |
| VR-06 | `title` (cuando se envía) ∈ `[2, 200]` caracteres tras trim                        | `400 VALIDATION`            |
| VR-07 | `description` (cuando se envía) ∈ `[0, 2000]` caracteres o `null`                  | `400 VALIDATION`            |
| VR-08 | `due_date` (cuando se envía) ∈ ISO-8601 válido o `null`; futura para `pending` con `±60s` skew | `400 DUE_DATE_IN_PAST` / `400 VALIDATION` |
| VR-09 | `category_code` (cuando se envía) debe existir en `ServiceCategory` con `is_active=true` o `null` | `400 CATEGORY_NOT_AVAILABLE` |
| VR-10 | PATCH status: `status ∈ {pending, in_progress, done, skipped}`                     | `400 VALIDATION`            |
| VR-11 | Transición debe ser válida: `pending → in_progress|done|skipped`, `in_progress → done|skipped` | `409 INVALID_TRANSITION` |
| VR-12 | Server-controlled fields (`id`, `event_id`, `ai_generated`, `ai_recommendation_id`, `confirmed_at`, `status` en PATCH content, `language_code`, `created_by_user_id`, `created_at`, `updated_at`, `deleted_at`, `deleted_by_user_id`) se descartan silenciosamente con log `body.ignoredFields` | sin error |
| VR-13 | DELETE: sin body                                                                  | body ignorado               |
| VR-14 | `Content-Type` debe ser `application/json` en PATCH                                | `415 UNSUPPORTED_MEDIA_TYPE` |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                                                                                  |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| SEC-01 | Ownership obligatoria: `actor.id === event.owner_user_id` enforced en backend; vendor → `403`; admin → `403` (`FR-ADMIN-010`).         |
| SEC-02 | `taskId` debe pertenecer al `eventId` del path; mismatch → `404 NOT_FOUND` (no-revelación cruzada).                                     |
| SEC-03 | No-revelación: `404` también cuando la tarea existe pero no es del actor, o cuando está soft-deleted.                                   |
| SEC-04 | `ai_generated`, `ai_recommendation_id`, `confirmed_at` inmutables vía PATCH; intentos descartados y logueados.                          |
| SEC-05 | Logs estructurados sin PII: no logear `title`, `description`, `category_code` valores; solo nombres en `fields_changed`.                |
| SEC-06 | Auditoría: `updated_by_user_id`, `updated_at`, `correlation_id` en cada mutación; `deleted_by_user_id`, `deleted_at` adicionales en DELETE. |
| SEC-07 | Mutabilidad atómica del evento vía `pg_advisory_xact_lock(hashtext(eventId))` o `SELECT FOR UPDATE` corto.                              |
| SEC-08 | Soft delete enforced; no se ofrece hard delete por API.                                                                                |
| SEC-09 | `Content-Type` validado; `415` para tipos no soportados.                                                                                |

### Negative Authorization Scenarios

* Vendor → `403 FORBIDDEN`.
* Admin → `403 FORBIDDEN` (no participa en HITL/CRUD operativo).
* Organizer no dueño del evento → `404 NOT_FOUND`.
* Organizer dueño pero la tarea pertenece a otro evento → `404 NOT_FOUND`.
* Anónimo / sesión inválida → `401 UNAUTHORIZED`.

---

## 🤖 AI Behavior

This story does not invoke AI directly.

### AI Involvement

* AI Feature: None (mutaciones sobre `EventTask`; no consume `LLMProvider`).
* Provider Layer: Not applicable.
* Human Validation Required: Not applicable.
* Persist `AIRecommendation`: No (no se modifica; solo se lee `ai_recommendation_id` para preservar trazabilidad).
* Fallback Required: Not applicable.

### AI Input

* Not applicable for this story.

### AI Output

* Not applicable for this story.

### Human-in-the-loop Rules

* Not applicable for this story (HITL ya cerró en US-025/US-031).

### AI Error / Fallback Behavior

* Not applicable for this story.

---

## 🎨 UX / UI Notes

| Area                | Notes                                                                                |
| ------------------- | ------------------------------------------------------------------------------------ |
| Screen / Route      | `/[locale]/organizer/events/:id/tasks` (lista de US-027)                              |
| Main UI Pattern     | Inline edit por campo (click sobre el título o due_date abre input + save/cancel); botón `⋯` que abre menú con "Editar todo", "Marcar como en progreso", "Marcar como completada", "Omitir", "Eliminar" |
| Primary Action      | "Guardar" en cada inline edit                                                        |
| Secondary Actions   | "Cancelar" en inline edit; "Eliminar" con diálogo de confirmación; transiciones con confirm |
| Empty State         | No aplica (siempre hay tareas si se llega a esta UI)                                  |
| Loading State       | Spinner por fila durante el save; skeleton si se recarga el listado                   |
| Error State         | Banner / toast por `error.code`: `409 EVENT_NOT_MUTABLE` ("Este evento está bloqueado"), `409 INVALID_TRANSITION` ("Transición no permitida desde X"), `404` ("Esta tarea ya no existe"), `400` ("Revisa los datos: ...") |
| Success State       | Toast "Tarea actualizada" / "Tarea eliminada" + actualización en línea de la lista    |
| Accessibility Notes | Botones con `aria-label`; inline edit con `role='textbox'` + `aria-describedby`; diálogo de confirmación con focus trap y `aria-modal='true'`; mensajes de error con `aria-live='polite'` |
| Responsive Notes    | Mobile-first; menú `⋯` colapsa secundarias                                            |
| i18n Notes          | 4 locales (es, en, pt, fr); etiquetas de estados (`pending`/`in_progress`/`done`/`skipped`) localizadas |
| Currency Notes      | No aplica                                                                            |

---

## 🛠 Technical Notes

### Frontend

* Route / Page: lista `/[locale]/organizer/events/:id/tasks` (US-027).
* Components:
  * `TaskItem` con inline edit (`TaskItemInlineEdit`).
  * `TaskStatusMenu` con transiciones permitidas según `status` actual.
  * `DeleteTaskDialog` con confirm.
* State Management: TanStack `useUpdateEventTask` (mutation PATCH content), `useUpdateEventTaskStatus` (PATCH status), `useDeleteEventTask` (DELETE). Invalidación de la query `['tasks', eventId, ...]` de US-027.
* Forms: React Hook Form + Zod para inline edit; sin form para status menu.
* API Client: `tasksApi.update(eventId, taskId, payload)`, `tasksApi.updateStatus(eventId, taskId, status)`, `tasksApi.delete(eventId, taskId)`.

### Backend

* Use Cases / Services:
  * `UpdateEventTaskUseCase` (PATCH content).
  * `UpdateEventTaskStatusUseCase` (PATCH status).
  * `SoftDeleteEventTaskUseCase` (DELETE).
* Controllers / Routes:
  * `PATCH /api/v1/events/:eventId/tasks/:taskId`.
  * `PATCH /api/v1/events/:eventId/tasks/:taskId/status`.
  * `DELETE /api/v1/events/:eventId/tasks/:taskId`.
* Module: `src/modules/tasks/mutate/` agrupa los tres use cases compartiendo `EventTaskMutateRepository` (extensión de `EventTaskRepository` de US-027/028) con `findByIdsOwnedByActor`, `updateContent`, `updateStatus`, `softDelete`.
* Authorization Policy: reusa `EventOwnershipPolicy` + `OrganizerRoleGuard` + `adminExclusionGuard` de US-027.
* Validation: Zod schemas — `updateEventTaskBodySchema`, `updateEventTaskStatusBodySchema`, `taskMutationParamsSchema` (path `eventId`, `taskId` UUID v4).
* Transaction Required: Sí, `prismaService.$transaction` con `pg_advisory_xact_lock(hashtext(eventId))` para los tres endpoints. Asegura mutabilidad atómica respecto a cancelaciones concurrentes del evento.
* Categoría: reusa `ServiceCategoryReadPort.findActiveByCode` de US-019/US-020/US-028.

### Database

* Main Tables:
  * `event_tasks` (update: PATCH columnas editables; PATCH `status`; DELETE soft via `deleted_at`).
  * `events` (read + lock cooperativo).
  * `service_categories` (read para `category_code`).
  * `ai_recommendations` (no se toca; solo lectura conceptual via `ai_recommendation_id`).
* Constraints: FK `event_id`, FK `category_code` (cuando no NULL) con `ON DELETE RESTRICT`; check en enum `event_task_status`; columnas `updated_by_user_id`, `deleted_by_user_id` FK a `users` (verificar existencia en schema sembrado por PB-P1-018 / US-027).
* Index Considerations: índice parcial `idx_event_tasks_event_active (event_id, status, due_date) WHERE deleted_at IS NULL` (compartido con US-027). Sin migraciones nuevas.

### API

| Method | Endpoint                                                  | Purpose                          | Success | Errores principales         |
| ------ | --------------------------------------------------------- | -------------------------------- | ------- | --------------------------- |
| PATCH  | `/api/v1/events/:eventId/tasks/:taskId`                   | Editar contenido                 | 200     | 400, 401, 403, 404, 409, 415 |
| PATCH  | `/api/v1/events/:eventId/tasks/:taskId/status`            | Transicionar estado              | 200     | 400, 401, 403, 404, 409, 415 |
| DELETE | `/api/v1/events/:eventId/tasks/:taskId`                   | Soft delete                      | 204     | 401, 403, 404, 409          |

**Request body PATCH content (todos los campos opcionales; al menos uno requerido):**

```jsonc
{
  "title": "string (2..200) | omit",
  "description": "string (0..2000) | null | omit",
  "due_date": "ISO-8601 string | null | omit",
  "category_code": "string slug | null | omit"
}
```

**Request body PATCH status:**

```jsonc
{
  "status": "pending | in_progress | done | skipped"
}
```

**Response body (PATCH content / PATCH status) — `TaskListItemDto` consistente con US-027:**

```jsonc
{
  "id": "uuid",
  "event_id": "uuid",
  "title": "string",
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

### Observability / Audit

* Correlation ID Required: Yes (heredado del request).
* Log Event Required: Yes — `tasks.updated` (PATCH content y status), `tasks.deleted` (DELETE), `tasks.updated.blocked` / `tasks.deleted.blocked` (409), `tasks.updated.no_op` (idempotent self-transition), `body.ignoredFields` cuando aplique.
* AdminAction Required: No (admin no participa).
* AIRecommendation Required: No (no se invoca IA; solo se preserva el enlace existente).
* Métricas Prometheus: `tasks_updated_total{operation="content|status"}`, `tasks_deleted_total`, `tasks_mutate_latency_ms{operation="..."}`, `tasks_transition_rejected_total{reason="invalid_transition|event_not_mutable"}`.

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                       | Type        |
| ----- | -------------------------------------------------------------- | ----------- |
| TS-01 | Editar `title` válido                                          | Integration |
| TS-02 | Editar múltiples campos (`title`, `due_date`, `category_code`) | Integration |
| TS-03 | `category_code=null` vacía la categoría                        | Integration |
| TS-04 | `description=null` vacía la descripción                        | Integration |
| TS-05 | Transición `pending → in_progress`                              | Integration |
| TS-06 | Transición `in_progress → done`                                 | Integration |
| TS-07 | Transición `pending → skipped`                                  | Integration |
| TS-08 | Soft delete devuelve `204` y excluye la tarea de listados        | Integration |
| TS-09 | Editar tarea IA preserva `ai_generated` y `ai_recommendation_id` | Integration |
| TS-10 | PATCH content + PATCH status separados son independientes        | Integration |
| TS-11 | `due_date` pasada permitida en `status ∈ {in_progress, done, skipped}` | Integration |
| TS-12 | E2E inline edit + transición + soft delete                       | E2E         |

### Negative Tests

| ID    | Scenario                                                       | Expected Result            |
| ----- | -------------------------------------------------------------- | -------------------------- |
| NT-01 | PATCH content vacío                                            | `400 EMPTY_PATCH`           |
| NT-02 | `title` 1 char                                                 | `400 VALIDATION`            |
| NT-03 | `title` 201 chars                                              | `400 VALIDATION`            |
| NT-04 | `description` 2001 chars                                       | `400 VALIDATION`            |
| NT-05 | `due_date` pasada en `pending`                                 | `400 DUE_DATE_IN_PAST`      |
| NT-06 | `due_date` formato inválido                                    | `400 VALIDATION`            |
| NT-07 | `category_code` inexistente                                    | `400 CATEGORY_NOT_AVAILABLE` |
| NT-08 | `category_code` inactiva                                       | `400 CATEGORY_NOT_AVAILABLE` |
| NT-09 | PATCH status con valor desconocido (`"foo"`)                    | `400 VALIDATION`            |
| NT-10 | Transición inválida `done → pending`                            | `409 INVALID_TRANSITION`    |
| NT-11 | Transición inválida `skipped → in_progress`                     | `409 INVALID_TRANSITION`    |
| NT-12 | Evento `cancelled`                                             | `409 EVENT_NOT_MUTABLE`     |
| NT-13 | Evento `completed`                                             | `409 EVENT_NOT_MUTABLE`     |
| NT-14 | Tarea soft-deleted                                             | `404 NOT_FOUND`             |
| NT-15 | Tarea inexistente                                              | `404 NOT_FOUND`             |
| NT-16 | Tarea pertenece a otro evento                                  | `404 NOT_FOUND`             |
| NT-17 | Evento ajeno                                                   | `404 NOT_FOUND`             |
| NT-18 | Vendor invoca                                                  | `403 FORBIDDEN`             |
| NT-19 | Admin invoca                                                   | `403 FORBIDDEN`             |
| NT-20 | Anónimo                                                        | `401 UNAUTHORIZED`           |
| NT-21 | `Content-Type: text/plain`                                     | `415 UNSUPPORTED_MEDIA_TYPE` |
| NT-22 | `eventId` no UUID                                              | `400 VALIDATION`            |
| NT-23 | `taskId` no UUID                                               | `400 VALIDATION`            |
| NT-24 | Doble DELETE                                                   | `404 NOT_FOUND`             |

### AI Tests

Not applicable for this story (no invoca al LLM; el flag `ai_generated` se preserva por VR-12).

### Authorization Tests

| ID         | Scenario                | Expected Result      |
| ---------- | ----------------------- | -------------------- |
| AUTH-TS-01 | Organizer dueño         | `200` / `204`        |
| AUTH-TS-02 | Organizer no dueño      | `404 NOT_FOUND`      |
| AUTH-TS-03 | Vendor                  | `403 FORBIDDEN`      |
| AUTH-TS-04 | Admin                   | `403 FORBIDDEN`      |
| AUTH-TS-05 | Anónimo                 | `401 UNAUTHORIZED`   |

### Concurrency Tests

| ID      | Scenario                                                                 | Expected Result                     |
| ------- | ------------------------------------------------------------------------ | ----------------------------------- |
| CONC-01 | Cancelación del evento + PATCH status concurrentes                       | El que gana el lock se aplica; el otro `409 EVENT_NOT_MUTABLE` |
| CONC-02 | Dos PATCH content concurrentes sobre la misma tarea (diferentes campos)   | Ambos pueden aplicarse; `updated_at` refleja el último |
| CONC-03 | DELETE + PATCH concurrentes sobre la misma tarea                          | DELETE gana ⇒ PATCH posterior `404` |

### Accessibility Tests

* Inline edit accesible por teclado (Tab para enfocar, Enter para guardar, Esc para cancelar).
* `TaskStatusMenu` con navegación por flechas y `aria-haspopup='menu'`.
* `DeleteTaskDialog` con focus trap, `aria-modal='true'`, foco inicial en "Cancelar", confirmación con `Enter` solo desde el botón "Eliminar".
* Mensajes de error con `aria-live='polite'`.

---

## 📊 Business Impact

| Field               | Value                                                |
| ------------------- | ---------------------------------------------------- |
| KPI Affected        | Limpieza de checklist; precisión del % de progreso; engagement |
| Expected Impact     | Mantener tareas vigentes y reflejar progreso real     |
| Success Criteria    | < 1% de errores 5xx; P95 < 1.5 s (`NFR-PERF-001`); 0 mutaciones de `ai_generated` |
| Academic Demo Value | CRUD completo de tareas con state machine, soft delete y preservación de trazabilidad IA |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks

* `TaskItemInlineEdit` para `title`, `description`, `due_date`, `category_code`.
* `TaskStatusMenu` con transiciones válidas según `status` actual.
* `DeleteTaskDialog` con confirm + i18n.
* Hooks TanStack `useUpdateEventTask`, `useUpdateEventTaskStatus`, `useDeleteEventTask` con invalidación de US-027.
* Telemetría UI (`task.edit.start`, `task.status.changed`, `task.deleted`).

### Potential Backend Tasks

* `UpdateEventTaskUseCase`, `UpdateEventTaskStatusUseCase`, `SoftDeleteEventTaskUseCase`.
* `EventTaskMutateRepository` (extiende `EventTaskRepository` de US-027/028).
* `EventTaskStateMachineService` (transiciones válidas).
* Zod schemas + controllers para los tres endpoints.
* Validación de `category_code` reutilizando `ServiceCategoryReadPort`.
* Lock cooperativo `pg_advisory_xact_lock(hashtext(eventId))`.
* Logging estructurado + métricas Prometheus.

### Potential Database Tasks

* Verificación: columnas `updated_by_user_id`, `deleted_by_user_id` existen en `event_tasks`; índice parcial `WHERE deleted_at IS NULL` está creado. Sin migraciones nuevas.

### Potential AI / PromptOps Tasks

* Not applicable for this story.

### Potential QA Tasks

* Tests por AC y EC (incluye 14 NT y 3 concurrencia).
* Tests de transiciones válidas/inválidas.
* Tests de soft delete + idempotencia.
* Tests de accesibilidad para inline edit, status menu y dialog.
* Tests de perf budget `NFR-PERF-001`.

### Potential DevOps / Config Tasks

* Not applicable for this story.

---

## ✅ Definition of Ready

* [x] Rol claro (Organizer dueño del evento).
* [x] Goal/valor claros.
* [x] FRD/UC/BR enlazados (`FR-TASK-003/004/005/011/012`, `UC-TASK-003`, `BR-TASK-002/004/005/006/010`, `BR-AI-008/010`).
* [x] Permisos identificados (ownership; vendor/admin 403).
* [x] Entidades listadas (`EventTask`, `Event`, `ServiceCategory`, `AIRecommendation` read).
* [x] AC en GWT (edición, transición, soft delete, IA preservada, category null, separación).
* [x] Edge cases documentados (cancelled/completed, transiciones inválidas, idempotencia, soft-deleted, doble DELETE, body vacío, server-controlled fields, due_date pasada, content-type, concurrencia).
* [x] Validación clara (VR-01..VR-14).
* [x] Out of Scope explícito.
* [x] Dependencias conocidas (PB-P1-018 hermanas, PB-P1-012/016/017, PB-P1-006, PB-P0-014).
* [x] UX states identificados (inline edit, menu, dialog, banners, toasts, a11y).
* [x] API definida (tres endpoints canónicos `/docs/16` §25.2).
* [x] Tests definidos (TS-01..12, NT-01..24, CONC-01..03, AUTH-TS-01..05, a11y).
* [x] PO/BA validó.

---

## 🏁 Definition of Done

* [ ] Tres endpoints operativos con ownership backend-only y mutabilidad atómica.
* [ ] State machine `pending → in_progress → done|skipped` enforcido; transiciones inválidas devuelven `409 INVALID_TRANSITION`.
* [ ] Soft delete enforced (`deleted_at`, `deleted_by_user_id`); no se ofrece hard delete por API.
* [ ] `ai_generated`, `ai_recommendation_id`, `confirmed_at` inmutables.
* [ ] Response `200 OK` con `TaskListItemDto` consistente con US-027 para invalidación de cache.
* [ ] Logs `tasks.updated`, `tasks.deleted` sin PII; métricas Prometheus operativas.
* [ ] Tests funcionales, negativos, autorización, concurrencia y accesibilidad verdes en CI.
* [ ] `NFR-PERF-001` validado (P95 ≤ 1.5 s).
* [ ] PO valida en demo (editar tarea IA preserva badge; transición rechazada muestra banner; soft delete oculta la tarea).

---

## 📝 Notes

* Documentation Alignment Required: `/docs/10-Non-Functional-Requirements.md` referenciaba `NFR-PERF-API-001` en el draft (stale). El canónico es `NFR-PERF-001`. Cleanup editorial; no bloquea.
* Documentation Alignment Required: `/docs/9-Functional-Requirements-Document.md` mapea `FR-TASK-003` a `UC-TASK-002` (línea 391) y `FR-TASK-005` a `UC-TASK-004`, pero `/docs/8-Use-Cases-Specification.md` define `UC-TASK-003 — Editar tarea` (línea 642). Se sigue la autoridad del UCS (`UC-TASK-003`); pendiente cleanup en `/docs/9`. No bloquea.
* Documentation Alignment Required: `/docs/16-API-Design-Specification.md` §25.3 documenta `categoryHint: string` y `EventTaskResponseDto.isSeed`; la línea de implementación canónica adoptada (consistente con US-028) usa `category_code` con FK a `ServiceCategory.code`. Regenerar snapshot OpenAPI vía US-098 para reflejar el contrato final. No bloquea.
* `BR-TASK-009` en `/docs/4` describe contribución al progreso; el "soft delete enforced" PO Decision proviene del Acceptance Summary de PB-P1-018 (`management/artifacts/4-Product-Backlog-Prioritized.md`). Esta historia formaliza el enforcement de soft delete vía Decisión PO PB-P1-018, no via una BR específica.
* La transición a `done` no actualiza `confirmed_at`. La auditoría de "confirmación de tareas IA" sigue residente en US-025/US-031.
* La UI debe deshabilitar el menú de transiciones rechazadas para reducir errores; el backend sigue siendo la fuente de verdad y devuelve `409 INVALID_TRANSITION` si llega.
* `tasks_transition_rejected_total{reason}` permite monitorear divergencias UI/backend en producción.
