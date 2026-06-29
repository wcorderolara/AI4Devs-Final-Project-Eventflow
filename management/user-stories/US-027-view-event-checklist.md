# 🧾 User Story: Ver mi checklist del evento

## 🆔 Metadata

| Field              | Value                                                                |
| ------------------ | -------------------------------------------------------------------- |
| ID                 | US-027                                                               |
| Epic               | EPIC-TASK-001 — Checklist & Task Management                          |
| Backlog Item       | PB-P1-018 — CRUD de tareas manuales y máquina de estados              |
| UI Surface         | Página "Mi checklist" del evento, vista listado paginada              |
| Feature            | Visualización paginada del checklist del evento                       |
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

**As an** organizador autenticado dueño de un evento
**I want** ver el checklist consolidado de mi evento con estados, fechas, categorías opcionales y origen IA o manual
**So that** sepa qué tareas tengo pendientes, cuáles ya completé y pueda priorizar mi planificación operativa diaria

---

## 🧠 Business Context

### Context Summary

El checklist del evento es la vista operativa central del rol Organizer. Combina tareas creadas manualmente (US-028) y tareas generadas por IA (US-018 → materializadas por `apply` de US-025 strategy `checklist`). Esta historia cubre la **vista de lectura paginada** con filtros básicos por estado, origen IA y categoría. El endpoint:

* Retorna sólo tareas pertenecientes al evento del actor (ownership).
* Excluye filas con `deleted_at IS NOT NULL` (soft delete enforced por `BR-TASK-009`).
* Devuelve metadatos consistentes con el patrón page-based canónico de EventFlow (`/docs/16` §28 listado).
* Indica el origen IA por tarea (`ai_generated`, `ai_recommendation_id`) sin exponer payloads del LLM.
* Marca cuándo se confirmó la transición a `active`/`in_progress` (`confirmed_at`) para tareas IA aceptadas vía US-031.

Las operaciones de mutación (crear, editar, eliminar, transicionar estado) y los filtros temporales (próximos 7/30 días, vencidas, % de progreso) están fuera de scope: cubiertas por US-028 (crear), US-029 (editar), US-030 (eliminar), US-031 (bulk confirm) y US-032/US-033 / PB-P1-019 (filtros temporales y progreso).

### Related Domain Concepts

* `EventTask` (entidad principal; lectura).
* `EventTask.status ∈ {pending, in_progress, done, skipped}` (`/docs/18`).
* `EventTask.ai_generated: boolean` y `EventTask.ai_recommendation_id?` (trazabilidad IA).
* `EventTask.due_date?`, `EventTask.category_code?`, `EventTask.confirmed_at?`.
* `EventTask.deleted_at?` (soft delete).
* `Event.status` (modula el modo read-only de la UI; el GET siempre responde si el evento existe y pertenece al actor).
* `ServiceCategory` (read; `category_code` referencia el catálogo activo).

### Assumptions

* Las `EventTask` ya están materializadas por el flujo correspondiente (manual en US-028 o IA en US-018 + US-025).
* El idioma del evento (`event.language_code`) se respeta en mensajes traducidos del response.
* La paginación page-based default sigue el patrón canónico de EventFlow (`page=1`, `pageSize=20`, máx `pageSize=100`), alineada con `/docs/16` y la implementación aprobada en US-013.
* La consulta no agrega métricas (% progreso, vencidas) en este endpoint; esos cálculos pertenecen a US-032/US-033.

### Dependencies

* PB-P1-018 / US-028, US-029, US-030 (CRUD manual de `EventTask`; comparten Backlog Item).
* PB-P1-012 / US-018 (generación checklist IA; produce `EventTask.ai_generated=true`).
* PB-P1-016 / US-025 (HITL `apply` strategy `checklist` que materializa tareas pending).
* PB-P1-017 / US-031 (bulk confirm; transiciona pending → in_progress y persiste `confirmed_at`).
* PB-P1-006 (creación de eventos; provee `event_id` y `owner_user_id`).
* PB-P0-001 (foundation auth + roles).
* PB-P0-014 (observabilidad; correlation IDs).

---

## 🔗 Traceability

| Source                 | Reference                                                                                                |
| ---------------------- | -------------------------------------------------------------------------------------------------------- |
| Backlog Item           | PB-P1-018                                                                                                |
| FRD Requirement(s)     | FR-TASK-001 (listar tareas del evento), FR-TASK-002 (estados visibles), FR-AI-019 (badge IA en listados consumidores) |
| Use Case(s)            | UC-TASK-001 (Listar tareas del evento), UC-TASK-002 (Filtrar por estado / origen IA)                     |
| Business Rule(s)       | BR-TASK-001 (visibilidad por ownership), BR-TASK-002 (estados válidos), BR-TASK-008 (categoría opcional), BR-TASK-009 (soft delete enforced), BR-AI-008 (flag `ai_generated`), BR-AI-010 (trazabilidad de recomendación) |
| Permission Rule(s)     | Ownership: `actor.id === event.owner_user_id`; vendor → `403`; admin → `403` (usa `/admin/events/:id/tasks`, otra US) |
| Data Entity / Entities | `EventTask`, `Event`, `ServiceCategory` (read), `AIRecommendation` (solo trazabilidad)                    |
| API Endpoint(s)        | `GET /api/v1/events/:eventId/tasks`                                                                       |
| NFR Reference(s)       | NFR-PERF-001 (P95 ≤ 1.5 s para endpoints no-IA), NFR-PERF-005 (paginación page-based), NFR-OBS-001 (correlation ID), NFR-OBS-002 (logs estructurados), NFR-SEC-005 (auditoría de accesos) |
| Related ADR(s)         | ADR-API-001 (versionado /api/v1), ADR-API-004 (correlation id)                                            |
| PO Decision(s)         | Decisión PO PB-P1-018 (Acceptance Summary): read-only en `event.status='completed'`, bloqueado en `cancelled`, soft delete enforced. |
| Related Document(s)    | `/docs/4` BR-TASK-001/002/008/009, BR-AI-008/010, `/docs/6` `EventTask`, `/docs/8` UC-TASK-001/002, `/docs/9` FR-TASK-001/002, FR-AI-019, `/docs/10` NFR-PERF-001/005, NFR-OBS-001/002, `/docs/16` §28 listado page-based + envelope `pagination`, `/docs/18` `event_tasks` + estados + índices, `/docs/19` ownership + audit, `management/artifacts/4-Product-Backlog-Prioritized.md` PB-P1-018 |

---

## 🧩 PO/BA Decisions Applied

1. **Endpoint canónico** — `GET /api/v1/events/:eventId/tasks` con filtros por query string (`status`, `aiGenerated`, `categoryCode`) y paginación page-based (`page`, `pageSize`). No se introduce versión PATCH/POST en este endpoint.
2. **Paginación canónica (`/docs/16` §28, US-013)** — `page` default `1`, `pageSize` default `20`, máximo `100`. Sobrescribe la nota original del draft que sugería `10` por defecto. Mantener consistencia con el patrón aprobado en US-013 para `GET /events`.
3. **Filtros server-side validados con Zod** — Los valores inválidos (status fuera del enum, categoría inexistente, booleanos no parseables, page/pageSize fuera de rango) se ignoran silenciosamente con log estructurado `filters.dropped` (patrón US-013 EC-01); no devuelven `400`.
4. **Ordenamiento por defecto** — `due_date` ascendente (próximas primero) con desempate por `created_at` descendente. Tareas sin `due_date` se ordenan al final. Sin parámetro `sort` configurable en MVP.
5. **Soft delete enforced (`BR-TASK-009`)** — El listado excluye filas con `deleted_at IS NOT NULL` siempre. Sin parámetro para incluir eliminadas en MVP.
6. **Ownership backend-only** — `actor.id === event.owner_user_id`. Vendor → `403 FORBIDDEN`. Admin → `403 FORBIDDEN` (debe usar el endpoint admin de US-016). Evento ajeno o inexistente → `404 NOT_FOUND` global (no-revelación).
7. **Modo read-only de UI según `event.status`** — El GET responde normalmente en cualquier `event.status`. La UI bloquea acciones de mutación cuando `event.status='completed'` (sólo visualización) y muestra estado bloqueado en `event.status='cancelled'`. Esta historia no aplica reglas de mutación; sólo expone los datos necesarios para que la UI las aplique.
8. **Trazabilidad IA expuesta sin contenido sensible** — El response incluye `ai_generated: boolean`, `ai_recommendation_id?: string` y `confirmed_at?: ISO-8601`. No expone `prompt_version_id`, `llm_provider`, `language_code` ni payloads originales del LLM. Esos atributos están disponibles vía endpoint dedicado de `AIRecommendation` cuando se requiera auditoría.
9. **Categoría opcional (`BR-TASK-008`)** — `category_code` puede ser `null`. El filtro por `categoryCode` aplica únicamente cuando el cliente lo envía; admite `categoryCode=null-string` (valor literal "null") para listar tareas sin categoría.
10. **Estado vacío con CTAs duales** — Cuando el listado retorna `items=[]`, la UI muestra dos CTAs: "Crear tarea" → enlace al flujo manual (US-028) y "Generar checklist IA" → enlace al flujo IA (US-018). Esta decisión es UX; el endpoint no expone CTAs.
11. **i18n del response** — Labels de estado (`status`) y nombres de categoría se localizan según `Accept-Language` del request (`es-LATAM` default, `es-ES`, `pt`, `en`); valores enum (`pending`, `in_progress`, `done`, `skipped`, `category_code`) permanecen en inglés y se traducen en frontend.
12. **Performance budget (`NFR-PERF-001`)** — P95 ≤ 1.5 s para el endpoint completo (incluye cuenta total para paginación). El KPI de UX "carga < 800 ms" del draft original se mantiene como objetivo aspiracional de frontend (TTFB + render), no como NFR contractual del backend.
13. **Sin telemetría de mutación** — Endpoint de lectura; no requiere `AdminAction` ni `AIRecommendation` updates. Sólo correlation ID + log estructurado `tasks.list.requested` con métrica `tasks_list_latency_ms`.

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: In Scope
* MVP Relevance: Must Have

### Explicitly Out of Scope

* Crear, editar, eliminar o transicionar tareas (US-028 / US-029 / US-030).
* Confirmación bulk de tareas IA (US-031).
* Filtros temporales por rango (próximos 7 / 30 días, vencidas) — pertenecen a US-032 / PB-P1-019.
* Cálculo de % de progreso del checklist — pertenece a US-033 / PB-P1-019.
* Búsqueda full-text en `title` o `description` (Future).
* Asignación de tareas a múltiples usuarios.
* Subtareas anidadas.
* Recordatorios push o email basados en `due_date` (Future).
* Export CSV / PDF del checklist (Future).
* Endpoint admin global (`/admin/events/:id/tasks` cubierto por la US admin read-only).
* Vistas guardadas o filtros personalizados persistidos.

### Scope Notes

* Sin migraciones nuevas: reusa columnas existentes (`id`, `event_id`, `title`, `due_date`, `status`, `category_code`, `ai_generated`, `ai_recommendation_id`, `confirmed_at`, `created_at`, `updated_at`, `deleted_at`) y el índice canónico `idx_event_tasks_event_status_due (event_id, status, due_date)` definido en `/docs/18`.
* El filtro por `aiGenerated` se beneficia del índice parcial `idx_event_tasks_event_ai (event_id, ai_generated)` cuando exista; si no, se evalúa al final del plan.
* El endpoint no invoca al `LLMProvider` ni consume cuota IA.

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Listado por defecto del checklist propio

**Given** un organizador autenticado dueño de un evento con tareas no eliminadas
**When** invoca `GET /api/v1/events/:eventId/tasks` sin filtros
**Then** recibe `200 OK` con la primera página (`page=1`, `pageSize=20`), sólo tareas del evento (`event_id` coincide con el path), excluyendo `deleted_at IS NOT NULL`, ordenadas por `due_date` ascendente con nulls al final y desempate por `created_at` desc
**And** el envelope incluye `{ items: TaskListItemDto[], pagination: { page, pageSize, totalItems, totalPages } }`.

### AC-02: Filtro por estado

**Given** un organizador con tareas en distintos `status`
**When** invoca `?status=pending`
**Then** la respuesta sólo incluye tareas con `status='pending'`, manteniendo el orden y la paginación de AC-01.

### AC-03: Filtro por origen IA

**Given** un organizador con tareas IA y tareas manuales
**When** invoca `?aiGenerated=true`
**Then** la respuesta sólo incluye tareas con `ai_generated=true` y expone `ai_recommendation_id` por ítem cuando exista.

### AC-04: Filtro por categoría opcional

**Given** un organizador con tareas categorizadas y sin categoría
**When** invoca `?categoryCode=catering` o `?categoryCode=null`
**Then** la respuesta filtra correctamente por código de categoría (con valor literal `"null"` para tareas sin categoría).

### AC-05: Paginación explícita

**Given** un organizador con más de 20 tareas
**When** invoca `?page=2&pageSize=20`
**Then** recibe la segunda página y los metadatos `pagination` reflejan correctamente `page=2`, `totalItems` y `totalPages`.

### AC-06: Estado vacío

**Given** un organizador autenticado dueño de un evento sin tareas (o todas eliminadas)
**When** invoca el endpoint
**Then** recibe `200 OK` con `items=[]` y `pagination.totalItems=0`
**And** la UI muestra el estado vacío con dos CTAs: "Crear tarea" (US-028) y "Generar checklist IA" (US-018).

### AC-07: Trazabilidad IA expuesta sin payloads del LLM

**Given** una tarea IA confirmada vía US-031
**When** se inspecciona el ítem en el response
**Then** el DTO incluye `ai_generated=true`, `ai_recommendation_id`, `confirmed_at`
**And** **no** expone `prompt_version_id`, `llm_provider`, ni el contenido original del LLM (`BR-AI-010`).

### AC-08: i18n del response

**Given** un organizador autenticado
**When** envía `Accept-Language ∈ {es-LATAM, es-ES, pt, en}`
**Then** los labels traducibles (mensajes de error, nombres de categoría) se devuelven en el idioma soportado o en fallback `es-LATAM`. Los valores enum (`status`, `category_code`) permanecen en inglés.

---

## ⚠️ Edge Cases

### EC-01: Filtros inválidos en query string

**Given** el organizador envía `?status=foo` o `?categoryCode=desconocido` o `?aiGenerated=yes`
**When** se procesa el request
**Then** el backend ignora silenciosamente los filtros inválidos, responde `200 OK` y registra `filters.dropped = [{ key, value, reason }]` en el log con `correlationId`.

#### Handling

* No se devuelve `400` por filtros inválidos.
* `aiGenerated` admite `'true' | 'false'` (string); cualquier otro valor se descarta.

---

### EC-02: `pageSize` fuera de rango

**Given** el organizador envía `pageSize=0`, `pageSize=500` o `pageSize=abc`
**When** se procesa el request
**Then** el backend aplica `pageSize=20` cuando es inválido y `pageSize=100` cuando excede el máximo, respondiendo `200 OK`.

---

### EC-03: `page` fuera de rango

**Given** el organizador solicita una página posterior a `totalPages`
**When** se procesa el request
**Then** el backend responde `200 OK` con `items=[]`, `page` igual al valor solicitado y `pagination.totalItems`/`totalPages` correctos.

---

### EC-04: Evento `completed`

**Given** el evento tiene `status='completed'`
**When** el organizador invoca el endpoint
**Then** la respuesta es `200 OK` con los datos completos
**And** la UI muestra modo read-only y bloquea acciones de edición/creación (el backend no aplica reglas adicionales en este endpoint; pertenece a US-028/029/030).

---

### EC-05: Evento `cancelled`

**Given** el evento tiene `status='cancelled'`
**When** el organizador invoca el endpoint
**Then** la respuesta es `200 OK` con los datos completos
**And** la UI muestra estado bloqueado y notifica la cancelación.

---

### EC-06: Evento soft-deleted (`deleted_at IS NOT NULL`)

**Given** el evento padre tiene `deleted_at IS NOT NULL`
**When** el organizador invoca el endpoint
**Then** el backend devuelve `404 NOT_FOUND` (consistente con la no-revelación de recursos eliminados).

---

### EC-07: Tareas con `due_date IS NULL`

**Given** tareas sin `due_date`
**When** se listan
**Then** se ubican al final del orden ascendente por `due_date` y se ordenan internamente por `created_at` descendente.

---

### EC-08: Filtros combinados

**Given** el organizador envía `?status=pending&aiGenerated=true&categoryCode=catering&page=2&pageSize=50`
**When** se procesa el request
**Then** los filtros se aplican con `AND` lógico y la paginación respeta el subconjunto resultante.

---

## 🚫 Validation Rules

| ID    | Rule                                                                | Message / Behavior                          |
| ----- | ------------------------------------------------------------------- | ------------------------------------------- |
| VR-01 | `eventId` debe ser UUID v4                                          | `400 VALIDATION`                            |
| VR-02 | El evento debe existir y pertenecer al actor                        | `404 NOT_FOUND` (no-revelación)             |
| VR-03 | `status ∈ {pending, in_progress, done, skipped}` si se envía         | Ignorar silenciosamente si inválido + log   |
| VR-04 | `aiGenerated ∈ {"true", "false"}` (string) si se envía                | Ignorar silenciosamente si inválido + log   |
| VR-05 | `categoryCode` debe coincidir con `ServiceCategory.code` o el literal `"null"` | Ignorar silenciosamente si inválido + log |
| VR-06 | `page` entero ≥ 1                                                    | Default `1` si inválido                     |
| VR-07 | `pageSize` entero, `1 ≤ pageSize ≤ 100`                              | Default `20` si inválido; clamp `100` si excede |
| VR-08 | Accept-Language ∈ `{es-LATAM, es-ES, pt, en}` o se aplica fallback   | Sin error; fallback a `es-LATAM`            |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                                                          |
| ------ | ------------------------------------------------------------------------------------------------------------- |
| SEC-01 | Ownership obligatoria: `actor.id === event.owner_user_id` (`BR-TASK-001`).                                     |
| SEC-02 | El listado excluye `deleted_at IS NOT NULL` siempre (`BR-TASK-009`).                                           |
| SEC-03 | Endpoint exige autenticación; sin sesión devuelve `401 UNAUTHORIZED`.                                          |
| SEC-04 | Sólo el rol `organizer` invoca este endpoint; `vendor` recibe `403 FORBIDDEN`.                                 |
| SEC-05 | Rol `admin` no usa este endpoint (`FR-ADMIN-010`); debe usar el endpoint admin read-only (US-016).             |
| SEC-06 | No-revelación: evento inexistente, ajeno o soft-deleted → `404 NOT_FOUND` (sin distinguir entre los casos).    |
| SEC-07 | Logs estructurados sin PII; no se logean títulos ni descripciones de tareas; sólo `event_id`, `actor_id`, `correlation_id`, `filters.applied`, `filters.dropped`, `items_count`, `latency_ms`. |
| SEC-08 | El response no expone payloads originales del LLM ni metadata sensible de `AIRecommendation` (`BR-AI-010`).    |

### Negative Authorization Scenarios

* Organizer no dueño → `404 NOT_FOUND`.
* Vendor autenticado → `403 FORBIDDEN`.
* Admin autenticado → `403 FORBIDDEN` (debe usar endpoint admin).
* Anónimo / sesión inválida → `401 UNAUTHORIZED`.

---

## 🤖 AI Behavior

This story does not invoke AI directly.

### AI Involvement

* AI Feature: None (lectura; expone trazabilidad IA pero no genera ni modifica `AIRecommendation`).
* Provider Layer: Not applicable.
* Human Validation Required: Not applicable.
* Persist `AIRecommendation`: No (solo se referencia para trazabilidad).
* Fallback Required: Not applicable.

### AI Input

* Not applicable for this story.

### AI Output

* Not applicable for this story (el flag `ai_generated` y `ai_recommendation_id` se exponen como metadata del DTO, no como salida IA).

### Human-in-the-loop Rules

* Not applicable for this story. El HITL ocurre en US-025 (apply/discard) y en US-031 (bulk confirm).

### AI Error / Fallback Behavior

* Not applicable for this story.

---

## 🎨 UX / UI Notes

| Area                | Notes                                                                                          |
| ------------------- | ---------------------------------------------------------------------------------------------- |
| Screen / Route      | `/[locale]/organizer/events/:eventId/tasks`                                                    |
| Main UI Pattern     | Lista paginada con barra de filtros + badges por origen IA / estado / categoría                 |
| Primary Action      | "Crear tarea" (delega a US-028)                                                                 |
| Secondary Actions   | "Filtrar por estado", "Filtrar por origen IA", "Filtrar por categoría", "Confirmar IA en bloque" (US-031) |
| Empty State         | Dos CTAs: "Crear tarea" (US-028) y "Generar checklist IA" (US-018)                              |
| Loading State       | Skeleton de filas + barra de filtros                                                            |
| Error State         | Banner por código de error + acción "Reintentar"                                                |
| Success State       | Lista visible con badges                                                                        |
| Accessibility Notes | Lista semántica (`<ul role="list">`), filtros como `<fieldset>` con `<legend>`, badges con `aria-label` que combina estado + origen IA; navegación por teclado entre filas y filtros; anuncio `aria-live="polite"` al cambiar de página |
| Responsive Notes    | Mobile-first; filtros colapsables en pantallas pequeñas; lista condensada con tap-target ≥ 44 px |
| i18n Notes          | Labels de status y category traducidos en frontend; mensajes del backend según `Accept-Language` |
| Currency Notes      | No aplica (el checklist no expone montos)                                                       |

---

## 🛠 Technical Notes

### Frontend

* Route / Page: `/[locale]/organizer/events/:eventId/tasks`.
* Components: `EventChecklistPage`, `TaskList`, `TaskListItem`, `TaskFilters`, `AIBadge` (reusado de US-017), `EmptyChecklistState`, `BulkConfirmBar` (de US-031, opcional sobre selección).
* State Management: TanStack `useEventTasks(eventId, filters, page, pageSize)` con cache key `['tasks', eventId, filters, page, pageSize]`; invalidación al volver de US-028/029/030/031.
* Forms: No aplica.
* API Client: `tasksApi.list({ eventId, status?, aiGenerated?, categoryCode?, page?, pageSize? })`.

### Backend

* Use Case / Service: `ListEventTasksUseCase` (orquesta ownership, validación tolerante de filtros, query Prisma con paginación page-based, traducción de labels).
* Controller / Route: `GET /api/v1/events/:eventId/tasks`.
* Authorization Policy: `EventOwnershipPolicy` (reuso) + `OrganizerRoleGuard` + `adminExclusionGuard`.
* Validation: Zod `listEventTasksParamsSchema` (path), `listEventTasksQuerySchema` (query, tolerante a inválidos con descarte logueado).
* Transaction Required: No (lectura).

### Database

* Main Tables:
  * `event_tasks` (read; índice canónico `idx_event_tasks_event_status_due (event_id, status, due_date)` definido en `/docs/18`).
  * `events` (read; ownership y `status`).
  * `service_categories` (read opcional para validar `categoryCode`).
  * `ai_recommendations` (no se consulta en este endpoint; sólo se expone el FK `ai_recommendation_id`).
* Constraints: pertenencia al evento, soft delete enforced.
* Index Considerations: índice compuesto canónico ya existente; el filtro por `ai_generated` puede beneficiarse de un índice parcial (out of scope de esta historia; declarable en `/docs/18` futuro).

### API

| Method | Endpoint                                            | Purpose                              |
| ------ | --------------------------------------------------- | ------------------------------------ |
| GET    | `/api/v1/events/:eventId/tasks`                     | Listar tareas del evento (paginado) |

### Observability / Audit

* Correlation ID Required: Yes (`NFR-OBS-001`).
* Log Event Required: Yes — `tasks.list.requested` con `correlation_id`, `actor_id`, `event_id`, `filters.applied`, `filters.dropped`, `items_count`, `page`, `pageSize`, `latency_ms`.
* AdminAction Required: No.
* AIRecommendation Required: No (sólo se expone FK ya existente).
* Métrica: `tasks_list_latency_ms` (histograma), `tasks_list_total` (counter por status code).

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                         | Type        |
| ----- | ---------------------------------------------------------------- | ----------- |
| TS-01 | Listado por defecto con tareas mixtas (manuales + IA)             | Integration |
| TS-02 | Filtro por `status=pending`                                       | Integration |
| TS-03 | Filtro por `aiGenerated=true` expone `ai_recommendation_id`        | Integration |
| TS-04 | Filtro por `categoryCode` y por `categoryCode="null"`              | Integration |
| TS-05 | Paginación explícita con `page=2&pageSize=20`                      | Integration |
| TS-06 | Ordenamiento por `due_date` asc con nulls al final                 | Integration |
| TS-07 | Estado vacío con `items=[]` y `totalItems=0`                       | E2E         |
| TS-08 | i18n: `Accept-Language=pt` retorna labels traducidos               | Integration |

### Negative Tests

| ID    | Scenario                                                | Expected Result                        |
| ----- | ------------------------------------------------------- | -------------------------------------- |
| NT-01 | `eventId` con formato inválido                          | `400 VALIDATION`                       |
| NT-02 | Evento ajeno                                            | `404 NOT_FOUND`                        |
| NT-03 | Evento soft-deleted                                     | `404 NOT_FOUND`                        |
| NT-04 | Vendor invoca                                           | `403 FORBIDDEN`                        |
| NT-05 | Admin invoca                                            | `403 FORBIDDEN`                        |
| NT-06 | Anónimo                                                 | `401 UNAUTHORIZED`                     |
| NT-07 | `status=foo`                                            | `200 OK` con filtro descartado + log   |
| NT-08 | `aiGenerated=yes`                                       | `200 OK` con filtro descartado + log   |
| NT-09 | `pageSize=500`                                          | `200 OK` con `pageSize=100` (clamp)    |
| NT-10 | `pageSize=0`                                            | `200 OK` con `pageSize=20` (default)   |
| NT-11 | `page=9999` (más allá de `totalPages`)                  | `200 OK` con `items=[]`                |

### AI Tests

Not applicable for this story (no se invoca al `LLMProvider`; sólo se expone trazabilidad existente).

### Authorization Tests

| ID         | Scenario                  | Expected Result    |
| ---------- | ------------------------- | ------------------ |
| AUTH-TS-01 | Organizer dueño            | `200 OK`           |
| AUTH-TS-02 | Organizer no dueño         | `404 NOT_FOUND`    |
| AUTH-TS-03 | Vendor autenticado         | `403 FORBIDDEN`    |
| AUTH-TS-04 | Admin autenticado          | `403 FORBIDDEN`    |
| AUTH-TS-05 | Anónimo                    | `401 UNAUTHORIZED` |

### Accessibility Tests

* Lista semántica con `<ul role="list">` y `<li>` por tarea.
* Cada `TaskListItem` con `aria-label` que combina título + estado + origen ("Tarea: Reservar salón, estado: pendiente, generada por IA").
* `TaskFilters` como `<fieldset>` con `<legend>` y controles `<select>`/`<input>` etiquetados.
* Navegación por teclado completa (Tab, Shift+Tab, Enter para abrir detalle).
* Anuncio `aria-live="polite"` al cambiar de página o aplicar filtro ("12 tareas encontradas").
* Contraste de badges IA / estado ≥ WCAG AA.

---

## 📊 Business Impact

| Field               | Value                                                                                |
| ------------------- | ------------------------------------------------------------------------------------ |
| KPI Affected        | Engagement del rol Organizer; tiempo de carga de la vista checklist                  |
| Expected Impact     | Vista operativa diaria que centraliza tareas manuales e IA con trazabilidad explícita |
| Success Criteria    | TTFB backend < 800 ms en P50; P95 ≤ 1.5 s (NFR-PERF-001); UX render < 800 ms        |
| Academic Demo Value | Vista central del rol Organizer que conecta checklist IA con HITL y bulk confirm     |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks

* Página `EventChecklistPage` con layout responsive.
* Componentes `TaskList`, `TaskListItem`, `TaskFilters`, `EmptyChecklistState`.
* Hook `useEventTasks` con TanStack + cache invalidation.
* Integración de `AIBadge` (reusado) y enlace a `BulkConfirmBar` (US-031).
* i18n para labels de status, category y mensajes de empty/error en 4 locales.
* Tests E2E del happy path y estado vacío.

### Potential Backend Tasks

* `ListEventTasksUseCase` con orquestación de ownership + paginación + traducción.
* Zod schemas tolerantes (`listEventTasksParamsSchema`, `listEventTasksQuerySchema`).
* Repository `EventTaskRepository.findByEventPaginated(filters, pagination)` con Prisma.
* Controller `GET /events/:eventId/tasks` + cableado en módulo de tasks.
* `adminExclusionGuard` (reuso si ya existe; si no, crear).
* Mapper `EventTask → TaskListItemDto` con redacción de campos sensibles.

### Potential Database Tasks

* Verificación de que el índice canónico `idx_event_tasks_event_status_due (event_id, status, due_date)` existe en `/docs/18`. Sin migración nueva en MVP.

### Potential AI / PromptOps Tasks

* Not applicable for this story.

### Potential QA Tasks

* Tests integration por AC (TS-01..08).
* Tests negativos por NT-01..11.
* Tests de autorización por AUTH-TS-01..05.
* Tests accesibilidad (axe + navegación por teclado).
* Test de performance con dataset de 200 tareas (P95 ≤ 1.5 s).

### Potential DevOps / Config Tasks

* Not applicable for this story.

---

## ✅ Definition of Ready

* [x] Rol claro (Organizer dueño del evento).
* [x] Goal/valor claros.
* [x] FRD/UC/BR enlazados (`FR-TASK-001/002`, `FR-AI-019`, `UC-TASK-001/002`, `BR-TASK-001/002/008/009`, `BR-AI-008/010`).
* [x] Permisos identificados (ownership; vendor/admin excluidos; no-revelación).
* [x] Entidades listadas (`EventTask`, `Event`, `ServiceCategory`, `AIRecommendation` solo trazabilidad).
* [x] AC en GWT (listado, filtros por status/aiGenerated/categoryCode, paginación, vacío, i18n, trazabilidad IA).
* [x] Edge cases documentados (filtros inválidos, pageSize/page fuera de rango, evento completed/cancelled/soft-deleted, due_date null, filtros combinados).
* [x] Validación clara (Zod tolerante; descartes logueados).
* [x] Out of Scope explícito (CRUD, bulk confirm, filtros temporales, % progreso, search, push, export).
* [x] Dependencias conocidas (PB-P1-018, PB-P1-012, PB-P1-016, PB-P1-017, PB-P1-006, PB-P0-001/014).
* [x] UX states identificados (loading, empty con dual CTAs, error, success, read-only por event.status).
* [x] API definida (`GET /api/v1/events/:eventId/tasks` con filtros + paginación page-based).
* [x] Tests definidos (8 functional, 11 negative, 5 authorization, accesibilidad).
* [x] PO/BA validó.

---

## 🏁 Definition of Done

* [ ] Endpoint `GET /events/:eventId/tasks` operativo con filtros tolerantes y paginación page-based.
* [ ] Ownership enforced backend-only; vendor/admin reciben `403`; ajeno/soft-deleted → `404`.
* [ ] Soft delete enforced (`deleted_at IS NULL`).
* [ ] DTO `TaskListItemDto` expone `ai_generated`, `ai_recommendation_id?`, `confirmed_at?` sin payloads del LLM.
* [ ] i18n verificada en `es-LATAM` (default), `es-ES`, `pt`, `en`.
* [ ] Performance verificada con dataset 200 tareas: P95 ≤ 1.5 s.
* [ ] Tests funcionales, negativos, de autorización y accesibilidad verdes en CI.
* [ ] PO valida vista en demo: organizer abre el checklist, aplica filtros, navega paginación, ve estado vacío con CTAs duales.

---

## 📝 Notes

* Documentation Alignment Required: `/docs/16` documenta el patrón page-based canónico (`page=1`, `pageSize=20`, máx `100`). El draft original sugería `10` por defecto; se adopta `20` para mantener consistencia con US-013 y el patrón canónico. La aclaración en `/docs/16` es no bloqueante.
* Documentation Alignment Required: `/docs/10` actualizó `NFR-PERF-API-001` a `NFR-PERF-001`; el draft original usaba el ID stale. Se adopta `NFR-PERF-001` y se sugiere cleanup editorial.
* Documentation Alignment Required: `/docs/16` debe regenerar el snapshot OpenAPI vía US-098 para reflejar el endpoint con filtros `status`, `aiGenerated`, `categoryCode`. No bloquea US-027.
* Los filtros temporales (próximos 7 / 30 días, vencidas) y el cálculo de % progreso pertenecen a US-032 / US-033 / PB-P1-019. Este endpoint expone los datos necesarios para que la UI o esos endpoints futuros calculen progreso, sin agregarlos aquí.
* La performance budget (P95 ≤ 1.5 s) cubre paginación con cuenta total; se recomienda evaluar `COUNT(*) FILTER (WHERE deleted_at IS NULL)` por evento dado el tamaño esperado (decenas de tareas por evento en MVP); no requiere materialización ni cache en MVP.
* El endpoint no expone `description` completa en el listado para optimizar payload; sólo `title`, `due_date`, `status`, `category_code`, `ai_generated`, `ai_recommendation_id?`, `confirmed_at?`, `created_at`, `updated_at`. El detalle completo se obtiene vía `GET /events/:eventId/tasks/:taskId` (US-029 lectura individual).
