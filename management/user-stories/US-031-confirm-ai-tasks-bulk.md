# 🧾 User Story: Confirmar tareas IA en bloque

## 🆔 Metadata

| Field              | Value                                                                |
| ------------------ | -------------------------------------------------------------------- |
| ID                 | US-031                                                               |
| Epic               | EPIC-TASK-001                                                        |
| Backlog Item       | PB-P1-017 — Confirmar hasta 50 tareas IA en una sola operación        |
| UI Surface         | Lista de tareas del evento, sección "Sugeridas por IA — pendientes" |
| Feature            | HITL bulk para tareas IA (AI-002 / checklist)                         |
| Module / Domain    | Tasks / AI                                                            |
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

**As an** organizador con un conjunto de `EventTask` generadas por IA en estado `pending` (creadas por `apply` sobre una `AIRecommendation type='checklist'` vía US-025)
**I want** confirmar hasta 50 tareas IA en un solo request, con reporte detallado por tarea
**So that** activo el checklist completo sin un clic por tarea y conozco con precisión qué tareas fallaron y por qué

---

## 🧠 Business Context

### Context Summary

US-018 (AI-002) genera una `AIRecommendation type='checklist'` con `status='pending'`. Cuando el organizador aplica esa recomendación vía US-025 (`POST /api/v1/ai-recommendations/:id/apply`, strategy `checklist`), se materializan los `EventTask` correspondientes con `ai_generated=true`, `ai_recommendation_id` poblado y `status='pending'` (`BR-TASK-003`, `BR-AI-008`, US-025 §9). Esas tareas IA permanecen `pending` hasta que el organizador las confirme individualmente o **en bloque**.

US-031 cubre el flujo en bloque: un endpoint dedicado que recibe una lista de hasta 50 `taskIds`, dedupa, valida ownership + invariantes IA + estado, y transiciona cada `EventTask` de `pending → active`. La operación **no es all-or-nothing**: cada ítem se procesa de forma independiente dentro de su propia micro-transacción y el response incluye un arreglo `{ taskId, accepted, error? }` con el resultado por ID (Decisión PO en backlog PB-P1-017).

US-031 **no modifica `AIRecommendation`** ni invoca al `LLMProvider`: la `AIRecommendation` padre ya fue `accepted` durante el `apply` de US-025.

### Related Domain Concepts

* `EventTask` (entidad principal; transición `status: pending → active`).
* `EventTask.ai_generated: boolean` (`BR-AI-008`).
* `EventTask.ai_recommendation_id` (FK a la `AIRecommendation` origen; nunca se modifica en este flujo).
* `AIRecommendation` (no se modifica; la trazabilidad se preserva).
* `Event` (ownership y estado del evento).
* `LLMProvider` (no se invoca en este flujo).

### Assumptions

* La selección de IDs ocurre en la UI (multi-select sobre la lista de tareas IA pendientes).
* Las `EventTask` ya fueron materializadas previamente por US-025 strategy `checklist` (la `AIRecommendation` parent ya está `accepted`).
* Las tareas IA confirmadas pasan a contar para el progreso del checklist; las pendientes no (`BR-TASK-003`).
* El idioma del evento (`event.language_code`) ya está reflejado en `EventTask` y no se altera en este endpoint.

### Dependencies

* PB-P1-012 / US-018 — Generación del checklist IA (`AIRecommendation type='checklist'`).
* PB-P1-016 / US-025 — HITL transversal y strategy `checklist` que materializa los `EventTask` pending consumidos por este endpoint.
* PB-P0-009..011 — Fundación IA (`AIRecommendation`, prompt registry, logging).
* PB-P0-014 — Observabilidad IA (correlation IDs, logs estructurados).
* PB-P1-006 — Evento con estado válido para mutaciones.

---

## 🔗 Traceability

| Source                 | Reference                                                                                                |
| ---------------------- | -------------------------------------------------------------------------------------------------------- |
| Backlog Item           | PB-P1-017                                                                                                |
| FRD Requirement(s)     | FR-TASK-005 (confirmar tareas IA individual o en bloque), FR-AI-019 (HITL canónico antes de persistir como oficial), FR-AI-001..002 (AI-002 / checklist) |
| Use Case(s)            | UC-TASK-001 (Aceptar tareas IA individual o en bloque), UC-AI-002 (HITL del checklist, ancla transversal) |
| Business Rule(s)       | BR-TASK-003 (confirmación de tareas IA), BR-TASK-005 (edición/aprobación individual o en bloque), BR-AI-001 (HITL obligatorio), BR-AI-002 (editabilidad pre-confirmación), BR-AI-004 (IA no decide), BR-AI-008 (flag `ai_generated`), BR-AI-010 (trazabilidad de recomendación) |
| Permission Rule(s)     | Ownership: `actor.id === event.owner_user_id`; admin **no** participa (`FR-ADMIN-010`)                    |
| Data Entity / Entities | `EventTask`, `Event`, `AIRecommendation` (solo lectura para trazabilidad)                                 |
| API Endpoint(s)        | `POST /api/v1/events/:eventId/tasks/confirm-bulk`                                                          |
| NFR Reference(s)       | NFR-PERF-001 (P95 ≤ 1.5 s endpoints no-IA), NFR-OBS-001/002/003 (correlation ID + logs estructurados + redacción PII), NFR-SEC-005 (auditoría) |
| Related ADR(s)         | ADR-AI-001 (LLMProvider; tangencial: este endpoint no invoca al LLM)                                       |
| PO Decision(s)         | Decisión PO US-031 (PB-P1-017): máx 50 IDs por request, reporte por ID `{ taskId, accepted, error? }`, semántica de éxito parcial controlado (no all-or-nothing) |
| Related Document(s)    | `/docs/4` BR-TASK-003/005, BR-AI-008/010, `/docs/6` `EventTask`, `/docs/7` AI-002, `/docs/8` UC-TASK-001 + UC-AI-002, `/docs/9` FR-TASK-005, FR-AI-019, `/docs/10` NFR-PERF-001, NFR-OBS-001..003, `/docs/16` patrones REST + P-API-08 HITL, `/docs/18` `event_tasks` + estados, `/docs/19` ownership + audit, `/docs/22` ADR-AI-001, `management/artifacts/4-Product-Backlog-Prioritized.md` PB-P1-017 |

---

## 🧩 PO/BA Decisions Applied

1. **Endpoint canónico (Decisión PO PB-P1-017)** — `POST /api/v1/events/:eventId/tasks/confirm-bulk` con body `{ taskIds: string[] }`. No se introduce un nuevo verbo HTTP ni un namespace adicional bajo `/ai-recommendations`; el bulk opera sobre `EventTask`, no sobre `AIRecommendation`.
2. **Límite explícito de 50 IDs por request (Decisión PO US-031)** — Validado por Zod antes de cualquier acceso a base. Body con `taskIds.length > 50` devuelve `400 BULK_LIMIT_EXCEEDED`. Body con `taskIds.length === 0` devuelve `400 VALIDATION`.
3. **Semántica de éxito parcial controlado (Decisión PO PB-P1-017)** — La operación **no** es all-or-nothing global. Cada `taskId` se procesa de forma independiente dentro de su propia micro-transacción `UPDATE ... WHERE id = $id AND event_id = $eventId AND ai_generated = TRUE AND status = 'pending'`. El response devuelve `200 OK` con `{ results: Array<{ taskId, accepted: boolean, error?: { code, message } }> }`. Esta decisión sobrescribe la nota original del draft que pedía rollback transaccional.
4. **Deduplicación silenciosa de IDs** — IDs repetidos en el body se deduplican en backend (set) antes del conteo de límite y antes del procesamiento. La respuesta contiene una entrada única por `taskId` distinto.
5. **US-031 no modifica `AIRecommendation`** — La `AIRecommendation` padre ya fue marcada `accepted` por el `apply` de US-025 al materializar las tareas (US-025 §9 strategy `checklist`). El bulk confirma solo `EventTask`. Esto preserva idempotencia y simplicidad del flujo HITL.
6. **Transición canónica** — `EventTask.status: pending → active` por cada confirmación exitosa. Se persisten `confirmed_by_user_id = actor.id`, `confirmed_at = now()`, `correlation_id` heredado del request.
7. **Ownership backend-only** — Authorization Policy verifica `actor.id === event.owner_user_id` antes de tocar tareas. Cualquier `taskId` cuyo `event_id` no coincida con el `:eventId` del path se rechaza por ítem con `error.code = TASK_NOT_IN_EVENT`. El `event_id` se valida una sola vez al inicio.
8. **Admin excluido (`FR-ADMIN-010`)** — Admin autenticado → `403 FORBIDDEN`. No participa en HITL.
9. **No-revelación de IDs ajenos** — Si el evento no pertenece al actor, `404 NOT_FOUND` global. Si un `taskId` del body no existe, no es de este evento, o no es IA, se reporta `error.code` por ítem sin filtrar existencia (`TASK_NOT_FOUND`, `TASK_NOT_IN_EVENT`, `TASK_NOT_AI`, `TASK_NOT_PENDING`).
10. **Estado del evento** — Si `event.status ∈ {cancelled, completed, deleted}`, el endpoint devuelve `409 EVENT_NOT_MUTABLE` global antes de procesar ítems. Esto evita activar tareas en eventos no mutables.
11. **Sin invocación a LLM** — El endpoint es post-IA. No invoca al `LLMProvider`. No consume cuota de `SEC-POL-AI-007`. No persiste nuevas `AIRecommendation`.
12. **Telemetría granular** — Logs estructurados `tasks.bulk_confirm.requested|succeeded|partial_failed|rejected|conflict`. Métricas `tasks_bulk_confirm_total`, `tasks_bulk_confirm_accepted_total`, `tasks_bulk_confirm_rejected_total`, `tasks_bulk_confirm_batch_size`, `tasks_bulk_confirm_latency_ms`. Cada log incluye `correlation_id`, `event_id`, `actor_id`, `requested_count`, `deduped_count`, `accepted_count`, `rejected_count`.
13. **No bulk discard** — El descarte en bloque queda fuera del alcance MVP (Future). Las tareas IA no deseadas se descartan individualmente vía US-025 sobre la `AIRecommendation` padre (que no las materializa) o eliminándolas individualmente con `DELETE /events/:eventId/tasks/:taskId` cuando ya existen.

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: In Scope
* MVP Relevance: Must Have

### Explicitly Out of Scope

* Confirmación automática IA tras N segundos sin acción.
* Bulk discard / bulk reject de tareas IA (Future).
* Edición masiva del contenido de las tareas (este endpoint solo confirma; la edición usa `PATCH /events/:eventId/tasks/:taskId`).
* Bulk transversal sobre otros tipos de `AIRecommendation` (presupuesto, comparador, brief, etc.); cada tipo decide su propio bulk si aplica.
* `If-Match` / `ETag` para concurrencia (la transición es idempotente por la cláusula `WHERE status='pending'`).
* `AdminAction` y endpoints admin (admin no participa en HITL).
* Reordenamiento masivo de tareas.
* Notificación push o email tras la confirmación (Future).

### Scope Notes

* La selección se realiza en la UI; el backend solo recibe `taskIds`.
* Sin migraciones nuevas: reusa columnas existentes en `event_tasks` ya sembradas por la fundación (status enum, `ai_generated`, `ai_recommendation_id`, `confirmed_by_user_id`, `confirmed_at`).
* La cadena de fallback IA no aplica (no se invoca al LLM).

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Confirmación bulk completa (todas las tareas aceptadas)

**Given** un organizador autenticado dueño de un evento mutable y un conjunto de `EventTask` con `ai_generated=true`, `status='pending'`, todas pertenecientes al evento
**When** invoca `POST /api/v1/events/:eventId/tasks/confirm-bulk` con `{ taskIds: [...] }` (1 ≤ N ≤ 50, sin duplicados)
**Then** el backend dedupa, valida invariantes globales (ownership del evento, `event.status` mutable), y por cada `taskId` ejecuta `UPDATE event_tasks SET status='active', confirmed_by_user_id=$actor, confirmed_at=now() WHERE id=$id AND event_id=$eventId AND ai_generated=TRUE AND status='pending'` dentro de una micro-transacción
**And** devuelve `200 OK` con `{ results: [{ taskId, accepted: true }, ...], summary: { requested, deduped, accepted, rejected } }`
**And** persiste log `tasks.bulk_confirm.succeeded` con `correlation_id`, `event_id`, `actor_id`, `accepted_count`, `latency_ms`.

### AC-02: Éxito parcial controlado (algunos ítems rechazados)

**Given** un body con N `taskIds` donde algunos fallan validaciones por ítem (no existe, no IA, no pending, no pertenece al evento)
**When** se procesa el bulk
**Then** los ítems válidos se confirman exitosamente, los inválidos se reportan con `error.code` específico, y la respuesta es `200 OK` con `{ results: [{ taskId, accepted: true | false, error?: { code, message } }, ...] }` reflejando el resultado individual
**And** **no** se hace rollback global; el éxito de un ítem no depende del éxito de otro
**And** persiste log `tasks.bulk_confirm.partial_failed` con `accepted_count`, `rejected_count` y un resumen agregado por `error.code`.

### AC-03: Deduplicación silenciosa de IDs repetidos

**Given** un body con `taskIds = [t1, t1, t2, t2, t3]`
**When** el backend procesa el request
**Then** dedupa a `{t1, t2, t3}` antes de aplicar el límite de 50 y antes de procesar
**And** la respuesta tiene exactamente 3 entradas (una por `taskId` único)
**And** el `summary.deduped` refleja el conteo de duplicados removidos.

### AC-04: Trazabilidad preservada por tarea

**Given** un `apply` exitoso del bulk
**When** se inspecciona cada `EventTask` confirmada
**Then** mantiene su `ai_recommendation_id` original (no se modifica), `ai_generated=true`, y adquiere `status='active'`, `confirmed_by_user_id`, `confirmed_at`
**And** la `AIRecommendation` padre **no** cambia (sigue con `status='accepted'` heredado del `apply` de US-025).

### AC-05: Idempotencia por ítem

**Given** un segundo request con los mismos `taskIds` que ya fueron confirmados en un request anterior
**When** se procesa el bulk
**Then** cada ítem ya confirmado devuelve `accepted: false` con `error.code = TASK_NOT_PENDING` (el `WHERE status='pending'` no matchea)
**And** ningún `EventTask` se modifica
**And** el response es `200 OK` con todos los ítems rechazados; el batch es seguro de reintentar.

---

## ⚠️ Edge Cases

### EC-01: IDs duplicados en el body

**Given** `taskIds` con duplicados
**When** se procesa
**Then** se deduplican silenciosamente; `summary.deduped` reporta cuántos se removieron.

#### Handling

* `new Set(taskIds)` antes del conteo de límite.

---

### EC-02: Sugerencia ajena (evento no del actor)

**Given** un `:eventId` que no pertenece al actor
**When** se invoca el endpoint
**Then** `404 NOT_FOUND` global; no se procesan ítems.

#### Handling

* Ownership policy basada en `event.owner_user_id`; política de no-revelación.

---

### EC-03: Tarea no IA

**Given** un `taskId` cuya `EventTask.ai_generated=false`
**When** se procesa el ítem
**Then** `accepted=false`, `error.code = TASK_NOT_AI`; no se modifica.

---

### EC-04: Tarea ya activa o en estado terminal

**Given** un `taskId` con `status ∈ {active, in_progress, done, skipped, deleted}`
**When** se procesa el ítem
**Then** `accepted=false`, `error.code = TASK_NOT_PENDING`; el `UPDATE ... WHERE status='pending'` no matchea.

---

### EC-05: Tarea de otro evento

**Given** un `taskId` cuyo `event_id` ≠ `:eventId` del path
**When** se procesa el ítem
**Then** `accepted=false`, `error.code = TASK_NOT_IN_EVENT` (no `403`/`404`; se reporta por ítem para no filtrar existencia ajena).

---

### EC-06: `taskId` inexistente

**Given** un `taskId` que no existe en `event_tasks`
**When** se procesa el ítem
**Then** `accepted=false`, `error.code = TASK_NOT_FOUND`.

---

### EC-07: Body con más de 50 IDs tras dedup

**Given** un body cuyo `taskIds` deduplicado tiene N > 50
**When** se valida con Zod
**Then** `400 BULK_LIMIT_EXCEEDED` con `{ limit: 50, received: N }`; ningún ítem se procesa.

---

### EC-08: Body vacío

**Given** un body con `taskIds: []`
**When** se valida
**Then** `400 VALIDATION` con `taskIds.length >= 1`; ningún ítem se procesa.

---

### EC-09: Evento no mutable

**Given** un evento con `status ∈ {cancelled, completed, deleted}`
**When** se invoca el endpoint
**Then** `409 EVENT_NOT_MUTABLE` global; ningún ítem se procesa; sin efectos colaterales.

---

### EC-10: Concurrencia (dos bulks que solapan IDs)

**Given** dos requests bulk casi simultáneos del mismo organizador con IDs solapados
**When** llegan al backend
**Then** el primero gana por ítem (el `UPDATE ... WHERE status='pending'` matchea una sola vez)
**And** el segundo reporta `accepted=false`, `error.code = TASK_NOT_PENDING` para los IDs solapados ya transicionados.

---

## 🚫 Validation Rules

| ID    | Rule                                                                                                  | Message / Behavior                          |
| ----- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| VR-01 | `:eventId` debe ser UUID v4                                                                            | `400 VALIDATION`                            |
| VR-02 | Body debe contener `{ taskIds: string[] }` con cada elemento UUID v4                                   | `400 VALIDATION`                            |
| VR-03 | `taskIds.length` (post-dedup) entre 1 y 50                                                              | `400 VALIDATION` (vacío) / `400 BULK_LIMIT_EXCEEDED` (>50) |
| VR-04 | El evento debe existir y pertenecer al actor                                                            | `404 NOT_FOUND`                             |
| VR-05 | `event.status` debe ser mutable (no `cancelled`/`completed`/`deleted`)                                  | `409 EVENT_NOT_MUTABLE`                     |
| VR-06 | Cada `EventTask` debe existir                                                                          | Por ítem: `error.code = TASK_NOT_FOUND`     |
| VR-07 | Cada `EventTask.event_id` debe coincidir con `:eventId`                                                | Por ítem: `error.code = TASK_NOT_IN_EVENT`  |
| VR-08 | Cada `EventTask.ai_generated` debe ser `true`                                                          | Por ítem: `error.code = TASK_NOT_AI`        |
| VR-09 | Cada `EventTask.status` actual debe ser `pending`                                                      | Por ítem: `error.code = TASK_NOT_PENDING`   |
| VR-10 | El actor no puede ser admin                                                                            | `403 FORBIDDEN`                             |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                                                  |
| ------ | ----------------------------------------------------------------------------------------------------- |
| SEC-01 | Ownership obligatoria del evento: `actor.id === event.owner_user_id`.                                  |
| SEC-02 | Admin **no** participa en HITL (`FR-ADMIN-010`): rol `admin` ⇒ `403 FORBIDDEN`.                         |
| SEC-03 | Requiere autenticación (cookie de sesión / token vigente); anónimo ⇒ `401 UNAUTHORIZED`.                |
| SEC-04 | No-revelación de eventos ajenos: `404` cuando el evento existe pero no pertenece al actor.              |
| SEC-05 | No-revelación por ítem: el response usa `error.code` neutral; no expone existencia de IDs ajenos como `403` o `404` distintos. |
| SEC-06 | Logs estructurados sin PII; `task.title` y `task.description` se trazan por hash si la política de auditoría lo requiere. |
| SEC-07 | Auditoría: cada confirmación persiste `confirmed_by_user_id`, `confirmed_at`, `correlation_id` en `event_tasks`. |
| SEC-08 | Cada `UPDATE` por ítem es atómico a nivel de fila (Postgres row-level lock); rollback parcial no aplica. |
| SEC-09 | `OPENAI_API_KEY` y otros secretos no se tocan en este flujo.                                           |

### Negative Authorization Scenarios

* Organizer no dueño del evento → `404 NOT_FOUND`.
* Vendor autenticado → `404 NOT_FOUND` (no se filtra el evento).
* Admin autenticado → `403 FORBIDDEN`.
* Anónimo / sesión inválida → `401 UNAUTHORIZED`.

---

## 🤖 AI Behavior

### AI Involvement

* AI Feature: HITL bulk para AI-002 (checklist).
* Provider Layer: **Not applicable** (este endpoint no invoca al `LLMProvider`).
* Human Validation Required: Yes (esta historia ES el HITL en bloque).
* Persist `AIRecommendation`: No (la `AIRecommendation` padre ya quedó `accepted` durante el `apply` de US-025).
* Fallback Required: No (no hay invocación IA que pueda fallar).

### AI Input

* `eventId` (path), `taskIds: string[]` (body, máx 50 post-dedup).

### AI Output

* `{ results: Array<{ taskId: string, accepted: boolean, error?: { code: string, message: string } }>, summary: { requested: number, deduped: number, accepted: number, rejected: number } }`.

### Human-in-the-loop Rules

* Esta historia ES el HITL en bloque para tareas IA.
* La aceptación no usa al LLM; solo transiciona `EventTask.status`.
* No hay regeneración en este endpoint (la regeneración del checklist es responsabilidad de US-018).

### AI Error / Fallback Behavior

* No aplica (sin invocación IA).

---

## 🎨 UX / UI Notes

| Area                | Notes                                                                                            |
| ------------------- | ------------------------------------------------------------------------------------------------ |
| Screen / Route      | `/[locale]/organizer/events/:id/tasks` (sección "Sugeridas por IA — pendientes")                |
| Main UI Pattern     | Multi-select con checkboxes + barra de acciones `BulkConfirmBar` sticky bottom                  |
| Primary Action      | "Confirmar seleccionadas (N)"                                                                    |
| Secondary Actions   | "Seleccionar todas las visibles", "Limpiar selección"                                            |
| Empty State         | "No hay tareas IA por confirmar. Genera un checklist con IA o crea tareas manuales."             |
| Loading State       | Spinner sobre la barra de acciones + bloqueo del botón "Confirmar"                                |
| Error State         | Toast con `error.code` traducido; banner inline con resumen por ítem cuando hay éxito parcial    |
| Success State       | Toast "N tareas confirmadas" + refetch del listado; tareas confirmadas se mueven a "Activas"     |
| Partial Success     | Banner inline con detalle por ítem rechazado (badge con `error.code` traducido)                  |
| Accessibility Notes | Checkboxes con `aria-label` que incluye el título de la tarea; resumen post-confirmación con `aria-live="polite"` indicando aceptadas/rechazadas; navegación por teclado |
| Responsive Notes    | Mobile-first; barra de acciones fija en bottom en mobile                                          |
| i18n Notes          | Copy y `error.code` traducidos en los 4 locales (`es`, `en`, `pt`, `fr`)                          |
| Currency Notes      | No aplica                                                                                         |

---

## 🛠 Technical Notes

### Frontend

* Route / Page: `/[locale]/organizer/events/:id/tasks`.
* Components: `AITasksPendingSection`, `BulkConfirmBar`, `BulkResultBanner` (resumen post-confirmación).
* State Management: TanStack mutation `useConfirmAITasksBulk` con invalidación de `['events', eventId, 'tasks']` y `['events', eventId, 'tasks', 'ai-pending']` al éxito.
* Forms: Selección con checkboxes controlada por `useState` local (set de IDs seleccionados); validación con Zod `confirmBulkBodySchema` antes del envío.
* API Client: `tasksApi.confirmBulk(eventId, { taskIds })`.

### Backend

* Use Case / Service: `ConfirmAITasksBulkUseCase` (orquesta dedup, validación global, micro-transacciones por ítem, agregación de resultados).
* Controller / Route: `POST /api/v1/events/:eventId/tasks/confirm-bulk`.
* Authorization Policy: `EventOwnershipPolicy` (reusa la fundación) + guardia explícita anti-admin.
* Validation: Zod `confirmBulkParamsSchema` (path) + `confirmBulkBodySchema` (body con `taskIds: z.array(z.string().uuid()).min(1).max(50)`).
* Transaction Required: Per-item (no global). Cada `UPDATE` corre dentro de su propia `prismaService.$transaction` o como statement atómico simple.
* Concurrency: la cláusula `WHERE status='pending'` garantiza idempotencia natural y resolución de carreras.

### Database

* Main Tables:
  * `event_tasks` (read + per-item update; columnas usadas: `id`, `event_id`, `ai_generated`, `ai_recommendation_id`, `status`, `confirmed_by_user_id`, `confirmed_at`).
  * `events` (read; validar ownership + `status` mutable).
  * `ai_recommendations` (read opcional para trazabilidad en respuesta extendida; no se modifica).
* Constraints: reusa el enum `event_task_status` ya sembrado por la fundación; reusa FKs y check constraints existentes.
* Index Considerations: reutiliza `event_tasks(event_id, ai_generated, status)` para el filtrado del listado IA-pendiente. No se crean índices nuevos.
* Migrations: **Ninguna** (todo el esquema requerido ya existe).

### API

| Method | Endpoint                                                | Purpose                                  |
| ------ | ------------------------------------------------------- | ---------------------------------------- |
| POST   | `/api/v1/events/:eventId/tasks/confirm-bulk`            | Confirmar hasta 50 tareas IA en bloque   |

#### Request body

```jsonc
{
  "taskIds": ["uuid-1", "uuid-2", "uuid-3"]
}
```

#### Response (`200 OK`)

```jsonc
{
  "results": [
    { "taskId": "uuid-1", "accepted": true },
    { "taskId": "uuid-2", "accepted": false, "error": { "code": "TASK_NOT_PENDING", "message": "..." } }
  ],
  "summary": { "requested": 3, "deduped": 0, "accepted": 1, "rejected": 2 }
}
```

#### Códigos de error

* `400 VALIDATION` — body inválido o `taskIds` vacío.
* `400 BULK_LIMIT_EXCEEDED` — `taskIds` (post-dedup) > 50.
* `401 UNAUTHORIZED` — sin sesión.
* `403 FORBIDDEN` — admin invoca el endpoint.
* `404 NOT_FOUND` — evento ajeno o inexistente.
* `409 EVENT_NOT_MUTABLE` — evento `cancelled` / `completed` / `deleted`.

Códigos por ítem (`results[i].error.code`): `TASK_NOT_FOUND`, `TASK_NOT_IN_EVENT`, `TASK_NOT_AI`, `TASK_NOT_PENDING`.

### Observability / Audit

* Correlation ID Required: Yes (propagado desde el request).
* Log Event Required: Yes (`tasks.bulk_confirm.requested|succeeded|partial_failed|rejected|conflict`).
* AdminAction Required: No.
* AIRecommendation Required: No (no se persisten nuevas; las existentes no se modifican).
* Métricas: `tasks_bulk_confirm_total`, `tasks_bulk_confirm_accepted_total`, `tasks_bulk_confirm_rejected_total`, `tasks_bulk_confirm_batch_size` (histograma), `tasks_bulk_confirm_latency_ms` (histograma).

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                                                  | Type        |
| ----- | ----------------------------------------------------------------------------------------- | ----------- |
| TS-01 | Confirmar 5 tareas IA pending; todas aceptadas; `EventTask.status='active'` y auditoría OK | Integration |
| TS-02 | Body con 3 tareas válidas + 2 inválidas; éxito parcial controlado con `results` y `summary` | Integration |
| TS-03 | Body con 60 IDs únicos; rechazo `400 BULK_LIMIT_EXCEEDED` sin tocar tareas                 | Integration |
| TS-04 | Body con duplicados (10 entradas → 5 únicos); dedup silencioso, `summary.deduped=5`        | Integration |
| TS-05 | Idempotencia: segundo request idéntico tras el primero; todos los ítems `TASK_NOT_PENDING` | Integration |
| TS-06 | Selección desde UI, confirmación, refetch, tareas reaparecen en "Activas"                  | E2E         |

### Negative Tests

| ID    | Scenario                                                              | Expected Result               |
| ----- | --------------------------------------------------------------------- | ----------------------------- |
| NT-01 | `eventId` con formato inválido                                          | `400 VALIDATION`              |
| NT-02 | `taskIds` vacío                                                        | `400 VALIDATION`              |
| NT-03 | `taskIds` (post-dedup) > 50                                            | `400 BULK_LIMIT_EXCEEDED`     |
| NT-04 | Evento ajeno                                                           | `404 NOT_FOUND`               |
| NT-05 | Evento `cancelled`/`completed`/`deleted`                                | `409 EVENT_NOT_MUTABLE`       |
| NT-06 | `taskId` inexistente                                                   | Por ítem: `TASK_NOT_FOUND`    |
| NT-07 | `taskId` de otro evento                                                | Por ítem: `TASK_NOT_IN_EVENT` |
| NT-08 | `taskId` con `ai_generated=false`                                       | Por ítem: `TASK_NOT_AI`       |
| NT-09 | `taskId` con `status ∈ {active, done, skipped}`                          | Por ítem: `TASK_NOT_PENDING`  |
| NT-10 | Anónimo                                                                | `401 UNAUTHORIZED`            |
| NT-11 | Admin invoca                                                            | `403 FORBIDDEN`               |
| NT-12 | Vendor invoca                                                          | `404 NOT_FOUND`               |

### AI Tests

| ID       | Scenario                                                                                  | Expected Result                                              |
| -------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| AI-TS-01 | Tareas confirmadas mantienen `ai_recommendation_id` y `ai_generated=true`                 | Trazabilidad preservada; `AIRecommendation` padre intacta    |
| AI-TS-02 | Mix de tareas IA y manuales en el mismo body                                              | Solo IA se procesan; manuales reportan `TASK_NOT_AI`         |
| AI-TS-03 | Tareas de dos `AIRecommendation` distintas (mismo evento) confirmadas en el mismo request | Ambas se aceptan; cada una preserva su `ai_recommendation_id` |

### Authorization Tests

| ID         | Scenario                  | Expected Result    |
| ---------- | ------------------------- | ------------------ |
| AUTH-TS-01 | Organizer dueño            | `200 OK`           |
| AUTH-TS-02 | Organizer no dueño         | `404 NOT_FOUND`    |
| AUTH-TS-03 | Vendor autenticado         | `404 NOT_FOUND`    |
| AUTH-TS-04 | Admin autenticado          | `403 FORBIDDEN`    |
| AUTH-TS-05 | Anónimo                    | `401 UNAUTHORIZED` |

### Performance Tests

| ID      | Scenario                                                  | Expected Result                |
| ------- | --------------------------------------------------------- | ------------------------------ |
| PERF-01 | 50 tareas válidas confirmadas en un request                | P95 ≤ 1.5 s (`NFR-PERF-001`)   |
| PERF-02 | 50 tareas con 30 inválidas (mix)                          | P95 ≤ 1.5 s; no degradación    |

### Accessibility Tests

* Checkboxes con `aria-label` que mencionan el título de la tarea.
* Resumen post-confirmación con `aria-live="polite"` indicando aceptadas y rechazadas.
* Navegación completa por teclado: seleccionar, confirmar, focus return.
* Contraste y foco visibles en la `BulkConfirmBar` sticky.

---

## 📊 Business Impact

| Field               | Value                                                                |
| ------------------- | -------------------------------------------------------------------- |
| KPI Affected        | Tasa de adopción del checklist IA; tiempo medio hasta activación      |
| Expected Impact     | Reduce fricción HITL del checklist; cierre rápido del onboarding IA   |
| Success Criteria    | ≥ 70% de las tareas IA generadas por evento confirmadas en bulk       |
| Academic Demo Value | Demuestra HITL eficiente y semántica de éxito parcial controlado     |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks

* `AITasksPendingSection` con multi-select.
* `BulkConfirmBar` sticky con conteo dinámico.
* `BulkResultBanner` con desglose por ítem (`error.code` traducido).
* Hook `useConfirmAITasksBulk` + cliente `tasksApi.confirmBulk`.
* i18n de copy y `error.code` en 4 locales.
* Telemetría UI `tasks.bulk_confirm.ui.{submitted|partial_displayed}`.

### Potential Backend Tasks

* `ConfirmAITasksBulkUseCase` + dedup + agregación.
* Repositorio con micro-transacciones por ítem (`event_tasks` row-level update condicional).
* Zod schemas (`confirmBulkParamsSchema`, `confirmBulkBodySchema`).
* `EventOwnershipPolicy` + guardia anti-admin específica.
* Mapper de `error.code` y agregación de `summary`.
* Logs estructurados + métricas Prometheus.

### Potential Database Tasks

* Verificación de columnas y enums existentes en `event_tasks` (no migración nueva).
* Plan de explain sobre `event_tasks(event_id, ai_generated, status)` para el listado IA-pendiente.

### Potential AI / PromptOps Tasks

* Not applicable for this story.

### Potential QA Tasks

* Tests determinísticos de cada `error.code`.
* Tests de carrera con dos bulks solapados.
* Tests de límite 50 y dedup.
* Tests E2E del flujo UI → API → DB.
* Tests de accesibilidad para `BulkConfirmBar` y `BulkResultBanner`.
* Test de auditoría (`confirmed_by_user_id`, `confirmed_at`, `correlation_id`).

### Potential DevOps / Config Tasks

* Verificación de límites de body en el reverse proxy (cabe 50 UUIDs cómodamente bajo el default).

---

## ✅ Definition of Ready

* [x] Rol claro (Organizer dueño del evento).
* [x] Goal/valor claros.
* [x] FRD/UC/BR enlazados (`FR-TASK-005`, `FR-AI-019`, `UC-TASK-001`, `UC-AI-002`, `BR-TASK-003/005`, `BR-AI-001/002/004/008/010`).
* [x] Permisos identificados (ownership + admin excluido).
* [x] Entidades listadas (`EventTask`, `Event`, `AIRecommendation` solo lectura).
* [x] AC en GWT (5 AC incluyendo éxito parcial e idempotencia).
* [x] Edge cases documentados (10 EC: dedup, ajeno, no IA, no pending, otro evento, inexistente, >50, vacío, evento no mutable, concurrencia).
* [x] Validación clara (VR-01..10 con códigos por ítem específicos).
* [x] Out of Scope explícito (bulk discard, edición masiva, otros tipos de recomendación).
* [x] Dependencias conocidas (PB-P1-012, PB-P1-016, PB-P0-009..011/014, PB-P1-006).
* [x] UX states identificados (loading, error, partial success, success).
* [x] API definida (`POST /events/:eventId/tasks/confirm-bulk` con request/response schemas).
* [x] Tests definidos (6 functional + 12 negative + 3 AI + 5 auth + 2 perf + accesibilidad).
* [x] PO/BA validó.

---

## 🏁 Definition of Done

* [ ] Endpoint operativo con dedup + límite 50 + ownership + admin excluido.
* [ ] Semántica de éxito parcial controlado con response `{ results, summary }` documentada.
* [ ] Per-item micro-transacción con `WHERE status='pending'` enforced.
* [ ] UI `BulkConfirmBar` + `BulkResultBanner` accesible en 4 locales.
* [ ] Métricas y logs estructurados emitidos y verificados.
* [ ] Tests funcionales, negativos, AI, autorización, performance y accesibilidad verdes en CI.
* [ ] PO valida el flujo end-to-end en demo (generar checklist → apply HITL US-025 → bulk confirm US-031).

---

## 📝 Notes

* Documentation Alignment Required: el draft original referenciaba `FR-TASK-006`, `UC-TASK-005`, `BR-TASK-005` y `BR-AI-013` como ancla. El canónico es `FR-TASK-005`, `UC-TASK-001`, `BR-TASK-003` (+ `BR-TASK-005`), `BR-AI-001..010`. La alineación se aplica siguiendo `/docs/9` y `/docs/8` como fuente de verdad.
* Documentation Alignment Required: el draft original pedía "rollback transaccional; ninguna queda confirmada". El backlog formal `PB-P1-017` (Decisión PO) establece "falla parcial controlada con reporte por ID `{id, accepted, error?}`". Se sigue la decisión PO formalizada.
* Documentation Alignment Required: el draft referenciaba `NFR-PERF-API-001`; el canónico es `NFR-PERF-001` (P95 ≤ 1.5 s endpoints no-IA).
* Documentation Alignment Required: el draft original decía "se marca AIRecommendation accepted" en AC-01. En el modelo canónico US-018 → US-025 → US-031, la `AIRecommendation` padre ya fue `accepted` durante el `apply` de US-025; este endpoint solo transiciona `EventTask`. Se aclara explícitamente para evitar doble lifecycle.
* Documentation Alignment Required: el snapshot OpenAPI de `/docs/16` debe regenerarse para incluir el endpoint nuevo; se coordina vía US-098.
* `MockAIProvider` no participa en este flujo; el endpoint es post-IA.
* El límite 50 está formalizado en la sección 102 del backlog ("Máx IDs por bulk task confirmation: 50").
