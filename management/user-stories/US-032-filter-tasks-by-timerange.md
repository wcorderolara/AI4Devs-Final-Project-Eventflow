# 🧾 User Story: Filtrar tareas por rango temporal (próximos 7/30 días + vencidas)

## 🆔 Metadata

| Field              | Value                                                                |
| ------------------ | -------------------------------------------------------------------- |
| ID                 | US-032                                                               |
| Epic               | EPIC-TASK-001 — Checklist & Task Management                          |
| Backlog Item       | PB-P1-019 — Filtros y progreso del checklist                          |
| UI Surface         | Página "Mi checklist" del evento, control segmentado por rango temporal |
| Feature            | Filtros temporales server-side sobre el listado de `EventTask`        |
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
**I want** filtrar mi checklist por rango temporal (Vencidas, Próximos 7 días, Próximos 30 días, Todas)
**So that** pueda enfocar mi gestión operativa en lo urgente sin que se mezcle con tareas lejanas o ya completadas en su ventana

---

## 🧠 Business Context

### Context Summary

US-032 extiende el endpoint canónico `GET /api/v1/events/:eventId/tasks` definido en US-027 con un **único parámetro adicional**: `range`, que selecciona uno de cuatro rangos temporales mutuamente excluyentes: `overdue`, `7d`, `30d`, `all` (default). El cálculo del rango se hace **server-side** contra `due_date` y `current_date` para garantizar consistencia entre clientes en zonas horarias distintas y evitar discrepancias por DST. El DTO `TaskListItemDto` se extiende con dos campos derivados: `overdue: boolean` y `is_t_minus_7: boolean`, que la UI usa para renderizar los indicadores visuales canónicos (`FR-TASK-010`, `BR-TASK-008`).

US-032 **no introduce un nuevo endpoint** ni modifica ownership, paginación, soft delete o cualquier otra invariante definida en US-027. Tampoco calcula `% de progreso` — esa es responsabilidad de US-033 dentro del mismo backlog item.

### Related Domain Concepts

* `EventTask.due_date: date` (sin timezone; `/docs/6` líneas 473, 2131).
* `EventTask.status ∈ {pending, in_progress, done, skipped}`.
* `EventTask.deleted_at?` (soft delete enforced).
* `current_date()` server-side (Postgres `CURRENT_DATE`).
* `TaskListItemDto` (`overdue`, `is_t_minus_7` agregados).
* `Event` (ownership + modo read-only por `event.status`).

### Assumptions

* `due_date` es un `date` puro sin componente de hora ni timezone (decisión `/docs/6` C-028; el cálculo de "today" usa `CURRENT_DATE` del servidor).
* Las tareas sin `due_date` (`due_date IS NULL`) quedan excluidas de los rangos `overdue`, `7d` y `30d`; aparecen solo en `range=all` (default).
* "Vencidas" = `due_date < CURRENT_DATE AND status NOT IN ('done', 'skipped')` — una tarea ya completada o explícitamente saltada no se cuenta como vencida (`BR-TASK-008` operativo).
* Los rangos son mutuamente excluyentes: el control segmentado UI solo permite un toggle activo a la vez.
* La paginación page-based, el ordenamiento canónico (`due_date ASC NULLS LAST, created_at DESC`) y todos los demás filtros de US-027 (`status`, `aiGenerated`, `categoryCode`) se combinan con `range` sin cambios.

### Dependencies

* PB-P1-018 / US-027 (lista paginada canónica + DTO + filtros tolerantes — esta historia los extiende).
* PB-P1-018 / US-028, US-029, US-030 (mutaciones que actualizan `due_date` y `status`, insumos para el filtro).
* PB-P1-012 / US-018 (genera `EventTask` IA con `due_date` calculada por `FR-TASK-008`).
* PB-P1-019 / US-033 (% de progreso; comparte el mismo Backlog Item).
* PB-P0-014 (observabilidad; correlation IDs).

---

## 🔗 Traceability

| Source                 | Reference                                                                                                |
| ---------------------- | -------------------------------------------------------------------------------------------------------- |
| Backlog Item           | PB-P1-019 — Filtros y progreso del checklist                                                              |
| FRD Requirement(s)     | FR-TASK-009 (filtros por estado y rango temporal), FR-TASK-010 (destacar T-7 y vencidas), FR-TASK-007 (% progreso — handoff a US-033) |
| Use Case(s)            | UC-TASK-006 (Filtrar tareas por estado y rango temporal), UC-TASK-001 (transversal: listar)              |
| Business Rule(s)       | BR-TASK-007 (filtros por estado y rango), BR-TASK-008 (indicador vencidas + T-7), BR-TASK-009 (soft delete enforced — reuso US-027), BR-TASK-010 (read-only en `completed` / bloqueado en `cancelled` — reuso US-027) |
| Permission Rule(s)     | Ownership: `actor.id === event.owner_user_id` (reuso US-027); vendor → `403`; admin → `403`              |
| Data Entity / Entities | `EventTask` (read), `Event` (read)                                                                       |
| API Endpoint(s)        | `GET /api/v1/events/:eventId/tasks?range=overdue|7d|30d|all` (extensión del endpoint de US-027)         |
| NFR Reference(s)       | NFR-PERF-001 (P95 ≤ 1.5 s endpoints no-IA), NFR-PERF-005 (paginación page-based), NFR-OBS-001 (correlation ID), NFR-OBS-002 (logs estructurados) |
| Related ADR(s)         | ADR-API-001 (versionado /api/v1) — sin nueva ADR para este filtro                                         |
| PO Decision(s)         | Decisión PO PB-P1-019 (Acceptance Summary): "Filtros correctos por rango", "Indicador visual T-7 y vencidas". Decisión refinamiento US-032: enum único `range` (4 valores) en lugar de `within` + `overdue` independientes para preservar exclusividad mutua y simplicidad UX. |
| Related Document(s)    | `/docs/4` BR-TASK-007/008/009/010, `/docs/6` `EventTask.due_date` (date puro), `/docs/8` UC-TASK-006, `/docs/9` FR-TASK-009/010, `/docs/10` NFR-PERF-001, NFR-OBS-001/002, `/docs/16` §28 listado canónico + filtros tolerantes, `/docs/18` `event_tasks` + `idx_event_tasks_event_status_due`, `/docs/19` ownership + audit, `management/artifacts/4-Product-Backlog-Prioritized.md` PB-P1-019 |

---

## 🧩 PO/BA Decisions Applied

1. **No se introduce nuevo endpoint** — US-032 extiende `GET /api/v1/events/:eventId/tasks` ya canónico en US-027 (`/docs/16` línea 953 y §28). El `range` es un nuevo query param dentro del mismo controller, use case y repository ya implementados.
2. **Enum único `range` (mutuamente excluyente)** — En lugar de `within=7d|30d` + `overdue=true` independientes, el filtro temporal es un enum `range ∈ {overdue, 7d, 30d, all}` con default `all`. Esta decisión preserva la semántica del control segmentado UI (un solo toggle activo) y elimina ambigüedad cuando el cliente envía combinaciones contradictorias.
3. **Filtro tolerante consistente con US-027** — Cualquier valor de `range` fuera del enum se descarta silenciosamente con log `filters.dropped` y se resuelve a `range=all`, sin devolver `400` (patrón EC-01 de US-013/US-027).
4. **Definición canónica de "Vencidas" (`overdue`)** — `due_date < CURRENT_DATE AND status NOT IN ('done', 'skipped')`. Tareas con `due_date IS NULL` no son consideradas vencidas; tareas ya `done` o `skipped` no se cuentan aunque su `due_date` haya pasado.
5. **Tareas sin `due_date` se excluyen de los rangos temporales** — `range ∈ {overdue, 7d, 30d}` aplica `due_date IS NOT NULL` implícito. Solo aparecen en `range=all` (default).
6. **Cálculo server-side de "today"** — Se usa `CURRENT_DATE` de PostgreSQL. `due_date` es un `date` puro sin timezone (`/docs/6` C-028), por lo que la fecha del servidor es la referencia canónica. La discrepancia eventual de 1 día entre cliente y servidor en zonas horarias extremas es aceptable para un filtro operativo y se documenta en la nota UX.
7. **DTO extendido con dos flags derivados** — `TaskListItemDto` agrega `overdue: boolean` y `is_t_minus_7: boolean` calculados server-side por tarea. Esto evita que cada cliente reimplemente la lógica de fechas y garantiza la consistencia visual (`BR-TASK-008`, `FR-TASK-010`). `is_t_minus_7 = (due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days')`.
8. **El filtro `range` es combinable** — Con `status`, `aiGenerated`, `categoryCode`, `page`, `pageSize`. Por ejemplo, `range=overdue&status=pending` devuelve solo las pendientes vencidas. La combinación se aplica en `WHERE` con AND.
9. **Read-only en `event.status='completed'`, bloqueado en `cancelled` (`BR-TASK-010`)** — Reuso íntegro de US-027: el GET responde siempre que el evento exista y pertenezca al actor. La UI aplica modo read-only sobre los CTAs de mutación; los filtros temporales siguen disponibles para revisión histórica.
10. **Ordenamiento canónico inalterado** — `due_date ASC NULLS LAST, created_at DESC` (reuso US-027). Las tareas vencidas aparecen primero en `range=overdue` por orden cronológico ascendente; en `range=7d`/`30d` aparece primero la más próxima a vencer.
11. **Soft delete enforced (`BR-TASK-009`)** — Tareas con `deleted_at IS NOT NULL` se excluyen siempre, incluso en `range=all`. Reuso US-027.
12. **Sin migraciones nuevas** — El índice `idx_event_tasks_event_status_due (event_id, status, due_date)` (`/docs/18`) cubre `WHERE event_id AND status AND due_date BETWEEN`. La verificación operativa con dataset de 200 tareas queda como parte de la suite de performance de US-027 + US-032 (NFR-PERF-001).
13. **Telemetría dedicada** — El log `tasks.list.requested` (definido en US-027) se extiende con dos campos: `range_filter` (valor aplicado tras tolerancia) y `range_dropped: boolean` (true si el valor recibido era inválido y fue desestimado).
14. **i18n 4 locales** — Labels del control segmentado (Vencidas / Próx. 7 días / Próx. 30 días / Todas), badges (`Vencido`, `Próximo a vencer`) y empty state ("No hay tareas en el rango seleccionado") traducidos en `es-MX`, `es-AR`, `en-US`, `pt-BR`.
15. **Sin rangos personalizados** — No se introducen `due_before` / `due_after` libres en MVP. La nota del draft original sobre "rangos custom" queda formalmente fuera de scope.

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: In Scope
* MVP Relevance: Must Have (alineado con PB-P1-019; FR-TASK-009/010 son `Should Have` en `/docs/9` pero el Backlog item los promueve a `Must Have` MVP).

### Explicitly Out of Scope

* Rangos personalizados (`due_before` / `due_after` libres) — Future.
* Cálculo de `% de progreso` — US-033 / PB-P1-019.
* Notificaciones in-app de tareas vencidas o próximas a vencer (`FR-TASK-010` parte notificación) — cubierto por US notificaciones (UC-NOTIF-001) fuera de este Backlog item.
* Búsqueda full-text en `title` / `description` — Future.
* Vistas guardadas o filtros persistidos en el perfil del usuario — Future.
* Filtros sobre tareas eliminadas (soft-deleted) — `BR-TASK-009` enforced.
* Modificación del ordenamiento por rango — el orden canónico definido en US-027 se mantiene.
* Endpoint admin global para filtros temporales — fuera de scope (US-016 si aplicara).

### Scope Notes

* US-032 extiende US-027; no duplica.
* El cálculo de "today" usa `CURRENT_DATE` del servidor para preservar consistencia entre clientes; la discrepancia eventual de 1 día en zonas horarias extremas es aceptable para un filtro operativo (no comercial).
* Sin migraciones nuevas: reusa el índice canónico ya sembrado por US-027 / PB-P1-018 / `/docs/18`.
* El control segmentado UI complementa los filtros existentes (`status`, `aiGenerated`, `categoryCode`); puede combinarse con ellos sin restricción.

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Filtro `range=7d`

**Given** un organizador autenticado dueño de un evento mutable con tareas distribuidas en distintos rangos de `due_date`
**When** invoca `GET /api/v1/events/:eventId/tasks?range=7d`
**Then** el backend aplica `WHERE due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days' AND due_date IS NOT NULL` además de los demás filtros y ownership
**And** la respuesta `200 OK` contiene `items: TaskListItemDto[]` ordenadas por `due_date ASC NULLS LAST, created_at DESC`
**And** cada `TaskListItemDto` incluye `overdue: false` (las próximas a vencer no son vencidas) y `is_t_minus_7: true`
**And** la respuesta sigue el envelope canónico `{ items, pagination }`
**And** se persiste log `tasks.list.requested` con `range_filter='7d'` y `range_dropped=false`.

### AC-02: Filtro `range=30d`

**Given** las mismas condiciones que AC-01
**When** invoca `GET /api/v1/events/:eventId/tasks?range=30d`
**Then** el backend aplica `WHERE due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' AND due_date IS NOT NULL`
**And** los `TaskListItemDto` cuyo `due_date` cae dentro de la subventana `[today, today + 7d]` exponen `is_t_minus_7: true`; el resto `false`
**And** ninguno expone `overdue: true`.

### AC-03: Filtro `range=overdue`

**Given** tareas con `due_date < CURRENT_DATE` en estados `pending`, `in_progress`, `done` y `skipped`
**When** invoca `GET /api/v1/events/:eventId/tasks?range=overdue`
**Then** el backend aplica `WHERE due_date < CURRENT_DATE AND status NOT IN ('done', 'skipped') AND due_date IS NOT NULL`
**And** la respuesta incluye solo tareas `pending` / `in_progress` con fecha pasada
**And** cada ítem expone `overdue: true` y `is_t_minus_7: false`
**And** las tareas `done` o `skipped` con fecha pasada **no** aparecen.

### AC-04: Filtro `range=all` (default)

**Given** tareas en cualquier rango temporal, incluyendo `due_date IS NULL`
**When** invoca `GET /api/v1/events/:eventId/tasks` sin parámetro `range` (o con `range=all`)
**Then** el backend no aplica ningún filtro temporal
**And** los `TaskListItemDto` exponen los flags `overdue` e `is_t_minus_7` derivados correctamente según su `due_date` (las tareas sin `due_date` exponen `overdue: false`, `is_t_minus_7: false`)
**And** el log `tasks.list.requested` registra `range_filter='all'`.

### AC-05: Combinación de `range` con otros filtros

**Given** tareas mixtas
**When** invoca `GET /api/v1/events/:eventId/tasks?range=overdue&status=pending&aiGenerated=true`
**Then** el backend aplica los tres filtros con AND (`WHERE due_date < CURRENT_DATE AND status='pending' AND ai_generated=TRUE AND status NOT IN ('done','skipped')`, simplificado a `status='pending'` por idempotencia lógica)
**And** la respuesta solo incluye pendientes IA vencidas
**And** la paginación y el ordenamiento canónico se aplican igual que en US-027.

### AC-06: Combinación de `range` con `categoryCode`

**Given** tareas con distintas categorías
**When** invoca `GET /api/v1/events/:eventId/tasks?range=7d&categoryCode=catering`
**Then** la respuesta contiene solo tareas próximas a vencer dentro de 7 días con categoría `catering`
**And** los flags derivados se calculan independientemente del filtro de categoría.

### AC-07: UI — control segmentado activo

**Given** el organizador en la página "Mi checklist"
**When** selecciona el toggle "Próximos 7 días"
**Then** el componente `TaskRangeFilter` actualiza el query param `range=7d` en la URL
**And** dispara `useEventTasks` (de US-027) con el nuevo filtro
**And** el toggle activo expone `aria-pressed=true`; los demás `aria-pressed=false`
**And** el badge "Próximo a vencer" (T-7) se muestra en cada `TaskListItem` cuyo `is_t_minus_7=true`.

### AC-08: UI — indicador "Vencido"

**Given** tareas devueltas con `overdue: true` (en `range=overdue` o `range=all`)
**When** se renderizan en la lista
**Then** cada `TaskListItem` expone el badge "Vencido" con icono y contraste WCAG AA
**And** el badge tiene `aria-label="Tarea vencida"` para lectores de pantalla.

---

## ⚠️ Edge Cases

### EC-01: `range` inválido — descarte silencioso

**Given** un cliente envía `?range=foo`
**When** el backend procesa la query
**Then** Zod aplica `.catch('all')` y normaliza a `range='all'`
**And** persiste log `filters.dropped` con `{ field: 'range', received: 'foo', applied: 'all' }`
**And** **no** devuelve `400`; la respuesta es `200 OK` con el comportamiento de `range=all`.

#### Handling

* Tolerancia consistente con el patrón de US-027 EC-01.

---

### EC-02: Tareas sin `due_date`

**Given** tareas con `due_date IS NULL`
**When** se aplica `range=7d`, `range=30d` o `range=overdue`
**Then** estas tareas **no** aparecen en la respuesta (el filtro es excluyente)
**And** en `range=all` sí aparecen, ordenadas al final (`NULLS LAST`).

#### Handling

* Coherente con el ordenamiento canónico de US-027.

---

### EC-03: Tarea con `due_date = CURRENT_DATE`

**Given** una tarea con `due_date = today`
**When** se aplica `range=7d`
**Then** la tarea aparece (rango inclusivo `[today, today + 7d]`) con `is_t_minus_7=true` y `overdue=false`.
**When** se aplica `range=overdue`
**Then** la tarea **no** aparece (`due_date < today` es estricto).

---

### EC-04: Tarea `done` con `due_date` pasada

**Given** una tarea `status='done', due_date='2026-06-01'` (en el pasado)
**When** se aplica `range=overdue`
**Then** la tarea **no** aparece (status excluido del overdue canónico).
**When** se aplica `range=all`
**Then** sí aparece con `overdue: false` (las completadas no se marcan como vencidas) e `is_t_minus_7: false`.

---

### EC-05: Tarea `skipped` con `due_date` pasada

**Given** una tarea `status='skipped'` con fecha pasada
**When** se aplica `range=overdue`
**Then** **no** aparece (mismo criterio que `done`).
**When** se aplica `range=all`
**Then** aparece con `overdue: false`.

---

### EC-06: Combinación `range=overdue` con `status=done`

**Given** `?range=overdue&status=done`
**When** el backend procesa
**Then** la respuesta es vacía (la intersección de "no done/skipped" con "done" es vacía)
**And** el empty state UI renderiza "No hay tareas en el rango seleccionado".

---

### EC-07: Evento `completed` o `cancelled`

**Given** un evento con `event.status='completed'`
**When** el organizador aplica filtros temporales
**Then** el backend responde con normalidad (los filtros siguen funcionando para revisión histórica)
**And** la UI aplica modo read-only sobre los CTAs de mutación (reuso `BR-TASK-010`, US-027).
**And** la misma lógica aplica para `event.status='cancelled'`, con UI bloqueada.

---

### EC-08: Paginación con filtros temporales

**Given** un evento con > 20 tareas próximas a vencer
**When** invoca `?range=7d&page=2&pageSize=20`
**Then** el backend devuelve la página 2 del subconjunto filtrado
**And** `pagination.total` refleja el conteo después de aplicar `range` (no el total del evento).

---

### EC-09: Cambio de día a medianoche del servidor

**Given** una tarea con `due_date = today` justo antes de medianoche del servidor
**When** pasa la medianoche y se vuelve a invocar `range=overdue`
**Then** la tarea aparece en `range=overdue` (su `due_date` ahora es `< CURRENT_DATE`).
**And** la UI debe invalidar el query cache de TanStack al recargar o cambiar el toggle para reflejar el nuevo estado.

#### Handling

* La cache de TanStack para `['tasks', eventId, range]` no se mantiene cross-día sin invalidación explícita; se documenta como nota.

---

### EC-10: Filtros temporales sobre evento ajeno

**Given** `?range=overdue` sobre un `:eventId` que no pertenece al actor
**When** se procesa
**Then** `404 NOT_FOUND` (no-revelación, reuso `SEC-06` de US-027)
**And** **no** se ejecuta el filtro temporal.

---

## 🚫 Validation Rules

| ID    | Rule                                                                                    | Message / Behavior                  |
| ----- | --------------------------------------------------------------------------------------- | ----------------------------------- |
| VR-01 | `eventId` debe ser UUID v4                                                              | `400 VALIDATION` (reuso US-027 VR-01) |
| VR-02 | `range` debe ser uno de `{overdue, 7d, 30d, all}` (case-sensitive)                        | Valor inválido → `range='all'` con log `filters.dropped` (tolerancia) |
| VR-03 | `range=overdue` excluye `status ∈ {done, skipped}` server-side (no validación de input)   | Comportamiento implícito en el WHERE |
| VR-04 | `range ∈ {overdue, 7d, 30d}` requiere `due_date IS NOT NULL` server-side                  | Comportamiento implícito en el WHERE |
| VR-05 | Combinación `range=overdue` + `status=done`/`skipped` produce intersección vacía          | `200 OK` con `items: []`             |
| VR-06 | Soft delete enforced: `deleted_at IS NULL` siempre                                       | Reuso US-027 BR-TASK-009            |
| VR-07 | `range` se combina con `status`, `aiGenerated`, `categoryCode`, `page`, `pageSize` con AND | Reuso patrón US-027                  |
| VR-08 | `current_date` se calcula con `CURRENT_DATE` de PostgreSQL                                | Server-side, no parametrizable      |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                                                                                          |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| SEC-01 | Ownership obligatoria: `actor.id === event.owner_user_id` (reuso `EventOwnershipPolicy` de US-027).                                            |
| SEC-02 | Vendor autenticado → `403 FORBIDDEN` (reuso `OrganizerRoleGuard` de US-027).                                                                    |
| SEC-03 | Admin autenticado → `403 FORBIDDEN` para este endpoint operativo (reuso `adminExclusionGuard` de US-027; admin usa `/admin/events/:id/tasks` de US-016). |
| SEC-04 | Anónimo / sesión inválida → `401 UNAUTHORIZED`.                                                                                                |
| SEC-05 | No-revelación: evento ajeno, inexistente o soft-deleted → `404 NOT_FOUND` (reuso `SEC-06` de US-027).                                            |
| SEC-06 | Logs estructurados sin PII; `range_filter` y `range_dropped` no son sensibles.                                                                   |
| SEC-07 | El cálculo server-side de `current_date` evita inyección o manipulación por el cliente.                                                          |
| SEC-08 | El endpoint reusa la auditoría de US-027 (sin `AdminAction`); no introduce nuevos campos de auditoría.                                          |

### Negative Authorization Scenarios

* Vendor autenticado → `403`.
* Admin autenticado → `403`.
* Organizer no dueño del evento → `404` (no-revelación).
* Anónimo → `401`.

---

## 🤖 AI Behavior

This story does not invoke AI directly.

### AI Involvement

* AI Feature: None — US-032 es una extensión del endpoint de lectura.
* Provider Layer: Not applicable.
* Human Validation Required: Not applicable.
* Persist `AIRecommendation`: No.
* Fallback Required: Not applicable.

### AI Input

* Not applicable for this story.

### AI Output

* Not applicable for this story.

### Human-in-the-loop Rules

* Not applicable for this story.

### AI Error / Fallback Behavior

* Not applicable for this story.

---

## 🎨 UX / UI Notes

| Area                | Notes                                                                                |
| ------------------- | ------------------------------------------------------------------------------------ |
| Screen / Route      | `/[locale]/organizer/events/:id/tasks` (reuso US-027)                                |
| Main UI Pattern     | Segmented control `TaskRangeFilter` con 4 toggles: "Vencidas", "Próx. 7 días", "Próx. 30 días", "Todas". Solo uno activo a la vez. |
| Primary Action      | Aplicar filtro (cambio inmediato vía URL state)                                       |
| Secondary Actions   | "Todas" (limpia el filtro temporal)                                                   |
| Empty State         | "No hay tareas en el rango seleccionado" + sugerencia "Probá con 'Todas' o creá una nueva tarea". |
| Loading State       | Skeleton reusa el de US-027                                                            |
| Error State         | Banner por `error.code` traducido (reuso patrón US-027)                              |
| Success State       | Lista filtrada con badges canónicos: "Vencido" (rojo, `overdue=true`) y "Próximo a vencer" (amarillo, `is_t_minus_7=true`) con contraste WCAG AA |
| Accessibility Notes | `aria-pressed` en cada toggle del segmented control; `aria-label="Filtro temporal"` en el contenedor; navegación por teclado (flechas izq/der entre toggles, Space/Enter para activar); badges con `aria-label` semántico |
| Responsive Notes    | Mobile-first; en pantallas estrechas, el segmented control se compacta a etiquetas cortas (V / 7d / 30d / Todas) con tooltip |
| i18n Notes          | 4 locales (`es-MX`, `es-AR`, `en-US`, `pt-BR`); labels canónicos: `Vencidas`, `Próx. 7 días`, `Próx. 30 días`, `Todas` (más variantes inglés/portugués) |
| Currency Notes      | No aplica                                                                            |

---

## 🛠 Technical Notes

### Frontend

* Route / Page: `/[locale]/organizer/events/:id/tasks` (reuso US-027).
* Components:
  * `TaskRangeFilter` (nuevo): segmented control con 4 toggles + estado URL-driven.
  * `TaskListItem` (extensión US-027): renderiza badges `Vencido` e `Próximo a vencer` según `overdue` / `is_t_minus_7` del DTO.
* State Management: TanStack `useEventTasks` de US-027 con cache key extendido `['tasks', eventId, { status, aiGenerated, categoryCode, range, page, pageSize }]`.
* Forms: Sin formularios; URL params controlan el estado.
* API Client: `tasksApi.listEventTasks(eventId, { range, ...otherFilters, page, pageSize })` (extensión US-027).

### Backend

* Use Case / Service: `ListEventTasksUseCase` (extensión de US-027) — acepta `range` como filtro adicional y delega al repository.
* Controller / Route: `GET /api/v1/events/:eventId/tasks` (reuso US-027, sin nuevo controller).
* Authorization Policy: `EventOwnershipPolicy` + `OrganizerRoleGuard` + `adminExclusionGuard` (reuso US-027).
* Validation: Zod `listEventTasksQuerySchema` (extensión US-027) con campo `range: z.enum(['overdue', '7d', '30d', 'all']).catch('all')`.
* Transaction Required: No (read-only).

### Database

* Main Tables: `event_tasks` (read).
* Constraints: reuso `idx_event_tasks_event_status_due (event_id, status, due_date)` de `/docs/18`; cubre `WHERE event_id AND status AND due_date BETWEEN`.
* Index Considerations: Sin índices nuevos para MVP. Si la performance de `range=overdue` con `WHERE status NOT IN (...)` no cumple `NFR-PERF-001`, se evalúa índice parcial `(event_id, due_date) WHERE status IN ('pending', 'in_progress') AND deleted_at IS NULL` en Future.
* `CURRENT_DATE` se calcula al nivel de PostgreSQL para todas las queries.

### API

| Method | Endpoint                                            | Purpose                            |
| ------ | --------------------------------------------------- | ---------------------------------- |
| GET    | `/api/v1/events/:eventId/tasks?range=overdue|7d|30d|all` | Lista paginada de tareas con filtro temporal |

### Observability / Audit

* Correlation ID Required: Yes (reuso US-027).
* Log Event Required: Yes — el log `tasks.list.requested` de US-027 se extiende con `range_filter` y `range_dropped`.
* AdminAction Required: No.
* AIRecommendation Required: No.

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                                | Type        |
| ----- | ----------------------------------------------------------------------- | ----------- |
| TS-01 | `range=7d` devuelve solo tareas con `due_date BETWEEN today AND today+7` | Integration |
| TS-02 | `range=30d` devuelve solo tareas con `due_date BETWEEN today AND today+30` | Integration |
| TS-03 | `range=overdue` devuelve solo `pending`/`in_progress` con `due_date < today` | Integration |
| TS-04 | `range=all` (default) devuelve todas las tareas incluyendo `due_date IS NULL` | Integration |
| TS-05 | `range=7d` combinado con `status=pending` devuelve intersección correcta  | Integration |
| TS-06 | `range=overdue` combinado con `aiGenerated=true` devuelve solo IA vencidas | Integration |
| TS-07 | Los flags `overdue` e `is_t_minus_7` se derivan correctamente en cada DTO  | Unit        |
| TS-08 | Paginación funciona sobre subconjuntos filtrados                        | Integration |
| TS-09 | Ordenamiento canónico `due_date ASC NULLS LAST` se respeta              | Integration |
| TS-10 | E2E desde UI: organizador cambia toggles y URL/cache se actualizan       | E2E         |

### Negative Tests

| ID    | Scenario                                                       | Expected Result                  |
| ----- | -------------------------------------------------------------- | -------------------------------- |
| NT-01 | `range=foo` → descarte silencioso → comportamiento `all`        | `200 OK` con log `filters.dropped` |
| NT-02 | `range=overdue&status=done` → intersección vacía                | `200 OK` con `items: []`         |
| NT-03 | `range=7d` sobre evento ajeno                                  | `404 NOT_FOUND` (no-revelación)  |
| NT-04 | Vendor invoca con `range=overdue`                              | `403 FORBIDDEN`                  |
| NT-05 | Admin invoca                                                   | `403 FORBIDDEN`                  |
| NT-06 | Anónimo                                                        | `401 UNAUTHORIZED`               |
| NT-07 | `range` con casing distinto (`Overdue`, `OVERDUE`)             | Descarte silencioso → `all`      |
| NT-08 | `range=7D` (mayúscula) → descarte                               | `range='all'` aplicado            |
| NT-09 | `eventId` con formato inválido                                  | `400 VALIDATION` (reuso US-027)  |

### Authorization Tests

| ID         | Scenario           | Expected Result    |
| ---------- | ------------------ | ------------------ |
| AUTH-TS-01 | Organizer dueño    | `200`              |
| AUTH-TS-02 | Organizer no dueño | `404`              |
| AUTH-TS-03 | Vendor             | `403`              |
| AUTH-TS-04 | Admin              | `403`              |
| AUTH-TS-05 | Anónimo            | `401`              |

### Concurrency / Boundary Tests

| ID      | Scenario                                                                | Expected Result                          |
| ------- | ----------------------------------------------------------------------- | ---------------------------------------- |
| CONC-01 | Cambio de día a medianoche del servidor mientras hay queries en vuelo    | `due_date='today'` deja de ser overdue (o lo es, según el caso); cache invalidada al refetch |
| CONC-02 | Tarea editada (cambio de `due_date`) durante la query                    | Snapshot consistente; el siguiente refetch refleja el cambio |
| CONC-03 | Filtros temporales combinados con paginación al límite (página final)    | `pagination.total` y `total_pages` consistentes |

### Accessibility Tests

| ID      | Scenario                                                                | Expected Result                          |
| ------- | ----------------------------------------------------------------------- | ---------------------------------------- |
| A11Y-01 | Navegación por teclado entre toggles del segmented control               | Flechas izq/der mueven foco; Space/Enter activa |
| A11Y-02 | Lectores de pantalla anuncian `aria-pressed` correctamente al cambiar toggle | NVDA/VoiceOver verbalizan estado         |
| A11Y-03 | Badges "Vencido" / "Próximo a vencer" tienen `aria-label` semántico       | Lectores anuncian estado de la tarea     |
| A11Y-04 | Contraste WCAG AA en badges y toggles activos                            | Ratio ≥ 4.5:1                            |

### Performance Tests

| ID      | Scenario                                                                | Expected Result                          |
| ------- | ----------------------------------------------------------------------- | ---------------------------------------- |
| PERF-01 | `range=overdue` sobre 200 tareas mixtas                                  | P95 ≤ 1.5 s (`NFR-PERF-001`)             |
| PERF-02 | `range=7d` con paginación 20/100                                         | P95 ≤ 1.5 s                              |
| PERF-03 | Combinación `range=overdue&status=pending&aiGenerated=true`              | P95 ≤ 1.5 s                              |

---

## 📊 Business Impact

| Field               | Value                                                |
| ------------------- | ---------------------------------------------------- |
| KPI Affected        | Foco operativo semanal; tasa de completitud de tareas en ventana de 7 días |
| Expected Impact     | Reduce ruido visual y permite priorización inmediata |
| Success Criteria    | Carga del subconjunto filtrado < 600 ms percibido (NFR-PERF-001 ≤ 1.5 s P95); ≥ 60% de organizadores usan el filtro 7d/Vencidas semanalmente |
| Academic Demo Value | UX simple efectiva: muestra que filtros operativos pueden derivarse server-side con consistencia entre clientes |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks

* Componente `TaskRangeFilter` (segmented control, 4 toggles, accesible, i18n).
* Extender `useEventTasks` (US-027) con `range` en el cache key y URL state.
* Extender `TaskListItem` (US-027) con badges `Vencido` / `Próximo a vencer` derivados de `overdue` / `is_t_minus_7`.
* Empty state localizado "No hay tareas en el rango seleccionado".
* Telemetría client-side opcional para tracking de uso de cada filtro.

### Potential Backend Tasks

* Extender `listEventTasksQuerySchema` con `range: z.enum(...).catch('all')`.
* Extender `EventTaskListRepository.findByEventPaginated` con la cláusula `WHERE` por rango.
* Extender `TaskListItemMapper` con cálculo de `overdue` e `is_t_minus_7`.
* Extender el log `tasks.list.requested` con `range_filter` y `range_dropped`.

### Potential Database Tasks

* Verificación de cobertura del índice `idx_event_tasks_event_status_due` con dataset de 200 tareas.
* Sin migraciones nuevas.

### Potential AI / PromptOps Tasks

* Not applicable for this story.

### Potential QA Tasks

* Tests funcionales por cada `range`.
* Tests de combinación con otros filtros.
* Tests de boundary (medianoche, `due_date IS NULL`).
* Tests de accesibilidad (NVDA / VoiceOver / teclado).
* Tests de performance contra `NFR-PERF-001`.

### Potential DevOps / Config Tasks

* Not applicable for this story.

---

## ✅ Definition of Ready

* [x] Rol claro (Organizer dueño).
* [x] Goal/valor claros (foco operativo).
* [x] FRD/UC/BR enlazados (`FR-TASK-009/010`, `UC-TASK-006`, `BR-TASK-007/008/009/010`).
* [x] Permisos identificados (reuso ownership US-027).
* [x] Entidades listadas (`EventTask`, `Event`).
* [x] AC en GWT (8 AC).
* [x] Edge cases documentados (10 EC).
* [x] Validación clara (8 VR).
* [x] Out of Scope explícito (rangos custom, % progreso, notifs, etc.).
* [x] Dependencias conocidas (US-027, US-028..030, US-018, US-033).
* [x] UX states identificados.
* [x] API definida (extensión `GET /events/:eventId/tasks?range=...`).
* [x] Tests definidos.
* [x] PO/BA validó.

---

## 🏁 Definition of Done

* [ ] Query param `range` enforced server-side con tolerancia Zod `.catch('all')`.
* [ ] DTO extendido con `overdue` e `is_t_minus_7` derivados.
* [ ] Filtros 4 rangos canónicos funcionales y combinables.
* [ ] UI con segmented control accesible (WCAG AA) y i18n 4 locales.
* [ ] Badges visuales canónicos para `Vencido` y `Próximo a vencer`.
* [ ] Tests funcionales, negativos, autorización, accesibilidad y performance verdes en CI.
* [ ] Log `tasks.list.requested` extendido con `range_filter` y `range_dropped`.
* [ ] PO valida en demo (cambio de toggles y badges visibles).

---

## 📝 Notes

* Documentation Alignment Required (no bloqueantes):
  * `/docs/9` (FRD) clasifica `FR-TASK-009/010` como `Should Have`; PB-P1-019 los promueve a `Must Have` MVP — formalizar la promoción en `/docs/9` o nota de Backlog Acceptance Summary.
  * `/docs/10` (NFR) usa `NFR-PERF-001` (canónico); el draft original referenciaba `NFR-PERF-API-001` (stale) — cleanup editorial.
  * `/docs/16` (API) ya documenta `GET /events/:eventId/tasks`; el parámetro `range` debe sumarse al snapshot OpenAPI vía US-098 (no bloquea).
* La extensión del DTO con `overdue` / `is_t_minus_7` se aplica también cuando `range=all` (default) para que el cliente reciba siempre flags consistentes, sin necesidad de reimplementar la lógica de fechas en cuatro locales distintos.
* La discrepancia eventual de 1 día entre el cliente (zona horaria local) y el servidor (`CURRENT_DATE` UTC del DB) es aceptable para un filtro operativo. Si la métrica de "Vencidas" se vuelve crítica para algún flujo comercial (Future), se evaluará usar `event.timezone` como referencia.
* La cache de TanStack `['tasks', eventId, { range, ... }]` invalida automáticamente al cambiar el toggle; la invalidación cross-día (medianoche) se documenta como caso aceptable de cache stale corta.
* US-033 (% de progreso) reusa la misma estructura del Backlog Item y consume los mismos `EventTask` filtrados; se coordinará el cálculo agregado allí.
