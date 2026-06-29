# 🧾 User Story: Ver progreso (% done) en el dashboard

## 🆔 Metadata

| Field              | Value                                |
| ------------------ | ------------------------------------ |
| ID                 | US-033                               |
| Epic               | EPIC-TASK-001                        |
| Backlog Item       | PB-P1-019                            |
| Feature            | Indicador de progreso                |
| Module / Domain    | Tasks / Dashboard                    |
| User Role          | Organizer                            |
| Priority           | Must Have                            |
| Status             | Approved with Minor Notes            |
| Owner              | Product Owner / Business Analyst     |
| Approved By        | PO/BA Review                         |
| Approval Date      | 2026-06-27                           |
| Ready for Development Tasks | Yes                          |
| Sprint / Milestone | MVP                                  |
| Created Date       | 2026-06-09                           |
| Last Updated       | 2026-06-27                           |

---

## 🎯 User Story

**As an** organizador
**I want** ver un porcentaje de progreso de mi checklist en el dashboard
**So that** tenga un indicador rápido de mi avance global

---

## 🧠 Business Context

### Context Summary

El progreso del evento se expone como un agregado server-side `progress = round(done / total_countable * 100)`, con redondeo half-up. `total_countable` cuenta las tareas "contables" (`ai_generated = false ∨ (ai_generated = true ∧ confirmed = true)` y `deleted_at IS NULL`) cuyo `status` ∈ `{pending, in_progress, done}` (excluye `skipped`). Cuando `total_countable = 0`, `progress = 0`. El agregado se incluye como campo embebido en el response del endpoint canónico `GET /api/v1/events/:eventId/tasks` (extensión del endpoint ya extendido por US-032 con `range`). No se introduce nuevo endpoint.

### Related Domain Concepts

* Agregación server-side (`COUNT(*) FILTER (...)`) en una sola query SQL.
* HITL: tareas IA (`ai_generated = true`) solo entran al cálculo tras confirmación (FR-TASK-005, BR-TASK-003).
* Soft-delete (`deleted_at`) excluye tareas del cálculo.
* Cache invalidation TanStack tras cambios de estado (US-030), CRUD manual (US-029) y confirmación HITL (US-031).

### Assumptions

* `skipped` se excluye del denominador y del numerador (se expone como componente del agregado para auditoría).
* Tareas IA no confirmadas (`ai_generated = true ∧ confirmed = false`) no afectan el % oficial.
* Tareas soft-deleted (`deleted_at IS NOT NULL`) no afectan el % oficial.
* El cálculo es server-side y único; el frontend NO recalcula localmente para evitar drift.

### Dependencies

* US-027 — endpoint base `GET /api/v1/events/:eventId/tasks` (P0 listing).
* US-032 — extensión del mismo endpoint con `range`; US-033 sigue el mismo patrón de extensión sin endpoints nuevos.
* US-031 — confirmación HITL de tareas IA (FR-TASK-005); define cuándo una tarea IA pasa a ser contable.
* US-030 — cambio de estado de tareas; dispara invalidación de cache.
* US-029 — edición/borrado manual; dispara invalidación de cache.
* US-014 — dashboard del evento; consumidor primario del agregado.

### PO/BA Decisions Applied

| ID | Decisión | Resolución |
| -- | -------- | ---------- |
| D1 | Endpoint del agregado | El `% done` se expone como campo agregado `progress` embebido en el response de `GET /api/v1/events/:eventId/tasks` (extensión del endpoint canónico de US-027 ya extendido por US-032). No se crea endpoint nuevo. El agregado se calcula sobre el universo completo de tareas del evento (no sobre la página devuelta). |
| D2 | Fórmula canónica | `progress = ROUND_HALF_UP(done / total_countable * 100)` cuando `total_countable > 0`; `0` cuando `total_countable = 0`. `total_countable` = tareas contables con `status ∈ {pending, in_progress, done}`. Tarea contable = `deleted_at IS NULL ∧ (ai_generated = false ∨ (ai_generated = true ∧ confirmed = true))`. |
| D3 | Eventos `cancelled` / `completed` | El cálculo no depende de `event.status`. Endpoint devuelve 200 con el cálculo real en todos los estados. La UI muestra banners read-only para `cancelled` y "Evento completado" para `completed` (heredados de US-014 y US-015). |
| D4 | Contrato API | `progress: { percentage: integer (0..100), done: integer ≥ 0, total_countable: integer ≥ 0, skipped: integer ≥ 0 }`. La UI formatea según locale (es-LATAM default, es-ES, pt, en) con `Intl.NumberFormat` style `percent` o cadena CLDR equivalente. |

Referencia completa: `management/user-stories/decision-resolutions/US-033-decision-resolution.md`.

---

## 🔗 Traceability

| Source                 | Reference                                                                                                                                                                                                                              |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FRD Requirement(s)     | FR-TASK-007 (cálculo de % completitud) · FR-EVENT-008 (surface en dashboard) · FR-TASK-005 (confirmación HITL como precondición de "contable")                                                                                          |
| Use Case(s)            | UC-TASK-001 (ver checklist) · UC-EVENT-004 (ver dashboard del evento)                                                                                                                                                                  |
| Business Rule(s)       | BR-TASK-009 (contribución al progreso) · BR-EVENT-009 (dashboard) · BR-TASK-003 (HITL para `ai_generated=true`)                                                                                                                          |
| Permission Rule(s)     | Ownership (`Event.owner_id = currentUser.id`) · `OrganizerRoleGuard` · `adminExclusionGuard`                                                                                                                                            |
| Data Entity / Entities | `EventTask` (cuenta filtrada por evento) · `Event` (validación de ownership)                                                                                                                                                            |
| API Endpoint(s)        | `GET /api/v1/events/:eventId/tasks` (extensión del endpoint canónico de US-027/US-032; agrega campo `progress` en el response)                                                                                                          |
| NFR Reference(s)       | NFR-PERF-001 (P95 < 1.5 s endpoints no-IA)                                                                                                                                                                                              |
| Related ADR(s)         | —                                                                                                                                                                                                                                      |
| Related Document(s)    | `/docs/4 §BR-TASK-009 §BR-TASK-003 §BR-EVENT-009` · `/docs/8 §UC-TASK-001 §UC-EVENT-004` · `/docs/9 §FR-TASK-007 §FR-EVENT-008 §FR-TASK-005` · `/docs/10 §NFR-PERF-001` · `/docs/16 §M05` · `management/technical-specs/P1/PB-P1-019/US-032-technical-spec.md` · `management/technical-specs/P1/PB-P1-008/US-014-technical-spec.md` |

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: In Scope
* MVP Relevance: Must Have

### Explicitly Out of Scope

* Endpoint dedicado `GET /api/v1/events/:eventId/tasks/progress` (descartado en D1).
* Endpoint agregado `GET /api/v1/events/:eventId/dashboard` (Future, decisión de US-014 tech spec).
* Gráficos avanzados (líneas de tendencia, comparativos por sprint, etc.).
* Breakdown del progreso por categoría o por responsable.
* Notificaciones push o in-app derivadas del % (cubiertas por FR-NOTIF-* en otras historias).

### Scope Notes

* El agregado vive embebido en el response del endpoint canónico de listado de tareas.
* Solo se expone el `%` global del evento; cualquier desglose pertenece a una historia futura.
* El cálculo SQL reusa `idx_event_tasks_event_status_due` definido por US-032; no requiere migraciones nuevas.

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Cálculo canónico del progreso

**Given** un evento con un conjunto de `EventTask` donde:
- `D` = tareas contables en `status = 'done'`,
- `T` = total de tareas contables con `status ∈ {pending, in_progress, done}`,
- "Tarea contable" = `deleted_at IS NULL ∧ (ai_generated = false ∨ (ai_generated = true ∧ confirmed = true))`,

**When** el organizador dueño consulta `GET /api/v1/events/:eventId/tasks`
**Then** la respuesta incluye `progress.percentage = ROUND_HALF_UP(D / T * 100)` cuando `T > 0`, y `progress.percentage = 0` cuando `T = 0`. El cálculo es server-side y único.

### AC-02: Refresco por invalidación de cache TanStack

**Given** un organizador dueño viendo el dashboard del evento
**When** ocurre una mutación relevante: cambio de estado (US-030), edición/borrado (US-029) o confirmación HITL (US-031)
**Then** el frontend invalida la query key `['event', eventId, 'tasks']` (y sus variantes paginadas/filtradas), refetchea automáticamente y la barra de progreso refleja el nuevo `progress.percentage` dentro del siguiente render.

### AC-03: Shape canónico del agregado

**Given** una respuesta exitosa de `GET /api/v1/events/:eventId/tasks`
**When** el cliente lee el payload
**Then** encuentra el agregado `progress` con la forma:

```json
{
  "progress": {
    "percentage": 75,
    "done": 6,
    "total_countable": 8,
    "skipped": 2
  }
}
```

donde `percentage` es entero en `[0, 100]`, y `done`, `total_countable`, `skipped` son enteros ≥ 0. El agregado siempre está presente, incluso cuando no hay tareas.

### AC-04: i18n del valor formateado

**Given** un cliente que envía `Accept-Language` ∈ `{es-LATAM, es-ES, pt, en}` (default `es-LATAM`)
**When** la UI renderiza la barra de progreso
**Then** el porcentaje se formatea con `Intl.NumberFormat` con `style: 'percent'` o cadena CLDR equivalente para el locale solicitado (p. ej., `"75 %"` en es-LATAM/es-ES/pt/fr, `"75%"` en en). El valor backend siempre es el mismo entero `0..100`; el formateo es exclusivamente de UI.

### AC-05: Independencia del cálculo respecto a `event.status`

**Given** un evento en estado `draft`, `active`, `cancelled` o `completed`
**When** el organizador dueño consulta el endpoint
**Then** el cálculo del `progress.percentage` aplica la fórmula canónica D2 sin alteración por el estado del evento. La autorización 200/401/403/404 no depende del estado.

### AC-06: Performance

**Given** un evento con 200 `EventTask` mixtos (`pending`, `in_progress`, `done`, `skipped`, `ai_generated` confirmadas y no confirmadas, soft-deleted)
**When** se mide el endpoint bajo condiciones normales de demo
**Then** el P95 del response (incluyendo el cálculo del agregado) se mantiene < 1.5 s (NFR-PERF-001).

---

## ⚠️ Edge Cases

### EC-01: Sin tareas

**Given** el evento no tiene ninguna `EventTask`
**When** se consulta
**Then** `progress = { percentage: 0, done: 0, total_countable: 0, skipped: 0 }`.

#### Handling
* No NaN, no Infinity, no 404. El response es 200.

### EC-02: Todas las tareas en `skipped`

**Given** el evento tiene N tareas contables y todas están en `status = 'skipped'`
**When** se consulta
**Then** `progress = { percentage: 0, done: 0, total_countable: 0, skipped: N }`.

#### Handling
* `total_countable = 0` por exclusión de `skipped` del denominador; `percentage = 0` por convención D2.

### EC-03: Solo tareas IA no confirmadas

**Given** el evento tiene M tareas con `ai_generated = true ∧ confirmed = false` y ninguna otra
**When** se consulta
**Then** `progress = { percentage: 0, done: 0, total_countable: 0, skipped: 0 }`.

#### Handling
* Las IA no confirmadas no son contables (D2); no entran al numerador, denominador ni a `skipped`.

### EC-04: Tareas soft-deleted

**Given** un evento con K tareas activas (`deleted_at IS NULL`) y L tareas soft-deleted (`deleted_at IS NOT NULL`)
**When** se consulta
**Then** el cálculo ignora las L soft-deleted; el agregado refleja solo las K activas.

### EC-05: Evento `cancelled`

**Given** un evento `cancelled` con tareas
**When** el dueño consulta el endpoint
**Then** la respuesta es 200 con el cálculo real; la UI muestra el banner read-only de cancelación heredado de US-014 EC-01.

### EC-06: Evento `completed`

**Given** un evento `completed` (US-015 auto-complete o transición manual)
**When** el dueño consulta el endpoint
**Then** la respuesta es 200 con el cálculo real (típicamente `percentage = 100` porque US-015 requiere todas las tareas en `done` o `skipped`); la UI muestra el banner "Evento completado".

---

## 🚫 Validation Rules

| ID    | Rule                                                              | Message / Behavior                                                  |
| ----- | ----------------------------------------------------------------- | ------------------------------------------------------------------- |
| VR-01 | `eventId` debe pertenecer al organizador autenticado              | 403/404 vía `EventOwnershipPolicy` con no-revelación (consistente US-027) |
| VR-02 | `eventId` debe ser UUID válido                                    | 400 con esquema Zod del path param (reusa el de US-027)             |
| VR-03 | Solicitud sin sesión válida                                       | 401                                                                 |
| VR-04 | El cálculo es exclusivamente server-side                          | El frontend NO recalcula el `percentage`; usa el valor del response |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                                                                                |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| SEC-01 | Reuso de `EventOwnershipPolicy` y `OrganizerRoleGuard` de US-027. Solo el `owner` accede al endpoint.                              |
| SEC-02 | `adminExclusionGuard` reusado de US-027/US-032: admin → 403. Admin consume el surface auditado de US-016, no este endpoint.        |
| SEC-03 | No-revelación 404 ante recurso ajeno (consistente con US-027 §SEC).                                                                |
| SEC-04 | El estado del evento (`draft`/`active`/`cancelled`/`completed`) NO altera el contrato de autorización (D3).                        |
| SEC-05 | Logging estructurado del agregado (`progress.percentage`, `progress.done`, `progress.total_countable`, `progress.skipped`) sin PII. |

### Negative Authorization Scenarios

* Usuario sin sesión → 401.
* Organizer A consultando evento de Organizer B → 404 (no-revelación).
* Admin sobre endpoint de organizer → 403 (`adminExclusionGuard`).
* Vendor → 403 (no es Organizer).

---

## 🤖 AI Behavior

This story does not invoke AI directly.

### AI Involvement

* AI Feature: None
* Provider Layer: Not applicable
* Human Validation Required: Not applicable
* Persist AIRecommendation: No
* Fallback Required: Not applicable

### AI Input

* Not applicable for this story.

### AI Output

* Not applicable for this story.

### Human-in-the-loop Rules

* Aunque US-033 no invoca IA, su fórmula respeta HITL: tareas con `ai_generated = true` solo entran al cálculo cuando `confirmed = true` (FR-TASK-005, BR-TASK-003). Esta es una dependencia funcional sobre US-031, no una interacción con AI Provider.

### AI Error / Fallback Behavior

* Not applicable for this story.

---

## 🎨 UX / UI Notes

| Area                | Notes                                                                                                              |
| ------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Screen / Route      | Dashboard del evento (`/[locale]/organizer/events/:eventId`), card "Progreso" (heredada de US-014).               |
| Main UI Pattern     | Barra de progreso (`role="progressbar"`) con valor numérico formateado al lado.                                    |
| Primary Action      | No aplica (visualización).                                                                                         |
| Secondary Actions   | CTA "Ir al checklist" enlaza a `/[locale]/organizer/events/:eventId/tasks`.                                        |
| Empty State         | `percentage = 0` con tareas no contables: copy "Confirma o crea tus primeras tareas" + CTA al checklist.           |
| Loading State       | Skeleton con `aria-busy="true"`; mínimo 300 ms de visibilidad para evitar parpadeo.                                |
| Error State         | Banner reutilizable de US-014 (sección con error, otras cards renderizan).                                          |
| Success State       | Barra con `percentage`, tooltip opcional mostrando `done / total_countable` y nota "{skipped} omitidas".            |
| Accessibility Notes | `role="progressbar"`, `aria-valuenow={percentage}`, `aria-valuemin=0`, `aria-valuemax=100`, `aria-label` localizado. |
| Responsive Notes    | Mobile-first; la card encoge el valor numérico pero conserva la barra y el aria.                                    |
| i18n Notes          | Locales: `es-LATAM` (default), `es-ES`, `pt`, `en`. Formateo CLDR con `Intl.NumberFormat({style:'percent'})`.       |
| Currency Notes      | No aplica.                                                                                                          |

### UI States por Event Status

* `draft` / `active`: barra normal.
* `cancelled`: banner read-only de US-014 EC-01; barra visible con el cálculo real.
* `completed`: banner "Evento completado"; barra visible con el cálculo real (típicamente 100%).

---

## 🛠 Technical Notes

### Frontend

* Route / Page:
  * Dashboard del evento (`apps/web/app/[locale]/organizer/events/[eventId]/page.tsx`).
* Components:
  * `ProgressBar` (apps/web/components/events/dashboard/ProgressBar.tsx) con tokens del design system y atributos ARIA.
* State Management:
  * `useEventTasks({ eventId, page, pageSize, range })` ya devuelve `progress`; `useTaskProgress(eventId)` es un selector liviano sobre el mismo query key.
  * Query key canónica: `['event', eventId, 'tasks', { range, page, pageSize }]` (heredada de US-027/US-032).
  * Invalidación tras mutaciones de US-029/US-030/US-031: `queryClient.invalidateQueries({ queryKey: ['event', eventId, 'tasks'] })`.
* Forms:
  * No aplica.
* API Client:
  * Reusa `tasksApi.listByEvent(eventId, query)` de US-027.

### Backend

* Use Case / Service:
  * Extensión de `ListEventTasksUseCase` con `EventTaskProgressCalculator` inline. Sin nuevo controller, sin nuevo use case dedicado.
* Controller / Route:
  * Reusa `GET /api/v1/events/:eventId/tasks` de US-027 (ya extendido por US-032 con `range`).
* Authorization Policy:
  * `EventOwnershipPolicy` + `OrganizerRoleGuard` + `adminExclusionGuard` (reuso íntegro de US-027/US-032).
* Validation:
  * UUID de `eventId` (Zod path param de US-027).
* Transaction Required:
  * No. Lectura única; el cálculo se hace en la misma query SQL.

### Database

* Main Tables:
  * `event_tasks`.
* Constraints:
  * Filtrado por `event_id`; predicado de "contable" y exclusión de `skipped` en el denominador.
* Index Considerations:
  * Reusa `idx_event_tasks_event_status_due` (declarado por US-032 tech spec). No requiere migraciones.
* SQL de referencia (no normativo):
  ```sql
  SELECT
    COUNT(*) FILTER (
      WHERE deleted_at IS NULL
        AND (ai_generated = false OR (ai_generated = true AND confirmed = true))
        AND status = 'done'
    ) AS done,
    COUNT(*) FILTER (
      WHERE deleted_at IS NULL
        AND (ai_generated = false OR (ai_generated = true AND confirmed = true))
        AND status IN ('pending', 'in_progress', 'done')
    ) AS total_countable,
    COUNT(*) FILTER (
      WHERE deleted_at IS NULL
        AND (ai_generated = false OR (ai_generated = true AND confirmed = true))
        AND status = 'skipped'
    ) AS skipped
  FROM event_tasks
  WHERE event_id = $1;
  ```

### API

| Method | Endpoint                                  | Purpose                                                                                                 |
| ------ | ----------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| GET    | `/api/v1/events/:eventId/tasks`           | Listar tareas (US-027) con `range` (US-032) y campo agregado `progress` (US-033). Sin nuevos verbos HTTP. |

#### Response shape (extracto relevante para US-033)

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

### Observability / Audit

* Correlation ID Required: Yes (heredado de US-027).
* Log Event Required: Sí — extender log estructurado existente `tasks.list.requested` con `progress.percentage`, `progress.done`, `progress.total_countable`, `progress.skipped`. Sin PII.
* AdminAction Required: No.
* AIRecommendation Required: No.
* Métrica Prometheus: reuso del histogram de US-027 (`http_request_duration_seconds{route="/events/:eventId/tasks"}`); no requiere nuevo metric.

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                                              | Type        |
| ----- | ------------------------------------------------------------------------------------- | ----------- |
| TS-01 | Cálculo correcto con mix de estados y `ai_generated` confirmadas/no confirmadas       | Unit        |
| TS-02 | Refetch tras cambio de estado (US-030) actualiza `progress.percentage`                 | E2E         |
| TS-06 | `cancelled` y `completed` ⇒ 200 con cálculo real (D3)                                  | Integration |
| TS-08 | Redondeo half-up boundary (`50.5 ⇒ 51`, `50.4 ⇒ 50`)                                   | Unit        |
| TS-09 | Tareas soft-deleted son ignoradas                                                      | Integration |

### Negative Tests

| ID    | Scenario                                                                              | Expected Result                  |
| ----- | ------------------------------------------------------------------------------------- | -------------------------------- |
| NT-01 | Sin tareas (EC-01)                                                                    | `progress.percentage = 0`        |
| NT-02 | Todas en `skipped` (EC-02)                                                            | `progress.percentage = 0`        |
| NT-03 | Solo IA no confirmadas (EC-03)                                                        | `progress.percentage = 0`        |
| NT-04 | Recurso ajeno                                                                         | 404 (no-revelación)              |
| NT-05 | Sin sesión                                                                            | 401                              |
| NT-06 | Admin sobre endpoint de organizer                                                     | 403                              |
| NT-07 | `eventId` no UUID                                                                     | 400                              |

### AI Tests

Not applicable for this story.

### Authorization Tests

| ID         | Scenario                                  | Expected Result |
| ---------- | ----------------------------------------- | --------------- |
| AUTH-TS-01 | Owner consulta su evento                  | 200 + payload   |
| AUTH-TS-02 | Otro organizer consulta evento ajeno      | 404             |
| AUTH-TS-03 | Vendor consulta el endpoint               | 403             |
| AUTH-TS-04 | Admin consulta el endpoint                | 403             |
| AUTH-TS-05 | Solicitud sin sesión                      | 401             |

### Performance Tests

| ID      | Scenario                                                                                 | Expected Result        |
| ------- | ---------------------------------------------------------------------------------------- | ---------------------- |
| PERF-01 | 200 tareas mixtas + agregado en la misma query                                            | P95 < 1.5 s (NFR-PERF-001) |

### Accessibility Tests

| ID       | Scenario                                                                                  | Expected Result                                  |
| -------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------ |
| A11Y-01  | Barra de progreso con `role="progressbar"`                                                | Atributos `aria-valuenow`, `aria-valuemin=0`, `aria-valuemax=100` presentes |
| A11Y-02  | Estado loading                                                                            | `aria-busy="true"` durante el fetch              |
| A11Y-03  | `aria-label` localizado por locale                                                        | Lectura correcta por screen reader               |

### Contract Tests

| ID           | Scenario                                                                                 | Expected Result                                |
| ------------ | ---------------------------------------------------------------------------------------- | ---------------------------------------------- |
| CONTRACT-01  | Shape del agregado `progress` vs OpenAPI snapshot                                         | Match exacto (handoff a US-098)                |

---

## 📊 Business Impact

| Field               | Value                                                                       |
| ------------------- | --------------------------------------------------------------------------- |
| KPI Affected        | Sensación de avance del organizador; tiempo a primera acción significativa.  |
| Expected Impact     | Engagement positivo en el dashboard; reducción de fricción para retomar el evento. |
| Success Criteria    | Endpoint cumple P95 < 1.5 s (NFR-PERF-001); cobertura ≥ 50% en TS/NT/PERF/A11Y; demo muestra el `%` actualizándose tras cambios de estado.  |
| Academic Demo Value | Indicador visible en demo; refleja el ciclo end-to-end (crear tarea → confirmar HITL → marcar done → ver % actualizado). |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks

* `ProgressBar` con tokens del design system y atributos ARIA.
* Extensión de `useEventTasks` (consumir `progress`); selector `useTaskProgress(eventId)`.
* Invalidación de cache en hooks de US-029/US-030/US-031 ya entregados.
* i18n: cadenas `progress.label`, `progress.skipped_note` en 4 locales.
* Estados visuales para `cancelled` y `completed`.

### Potential Backend Tasks

* Extensión de `ListEventTasksUseCase` con `EventTaskProgressCalculator`.
* Extensión del DTO de response con `progress: { percentage, done, total_countable, skipped }`.
* Extensión del log estructurado `tasks.list.requested` con los campos del agregado.
* Tests de redondeo half-up, predicado de tarea contable, soft-delete, mix de estados.

### Potential Database Tasks

* Validar plan de ejecución del `COUNT(*) FILTER (...)` contra dataset de 200 tareas (PERF-01).
* Confirmar reuso de `idx_event_tasks_event_status_due` (sin nuevas migraciones).

### Potential AI / PromptOps Tasks

* Not applicable for this story.

### Potential QA Tasks

* Tests unitarios de la fórmula canónica (D2) y edge cases EC-01..EC-06.
* Tests de autorización AUTH-TS-01..05.
* Tests de rounding boundary (TS-08).
* Test de performance PERF-01 con dataset de 200 tareas.
* Tests A11Y A11Y-01..03.
* Contract test CONTRACT-01 contra OpenAPI snapshot (handoff a US-098).

### Potential DevOps / Config Tasks

* Not applicable for this story (reuso íntegro de pipeline de US-027/US-032).

---

## ✅ Definition of Ready

* [x] Rol claro.
* [x] Goal/valor claros.
* [x] FRD/UC/BR enlazados.
* [x] Permisos identificados.
* [x] Entidades listadas.
* [x] AC en GWT.
* [x] Edge cases documentados.
* [x] Validación clara.
* [x] Out of Scope explícito.
* [x] Dependencias conocidas.
* [x] UX states identificados.
* [x] API definida.
* [x] Tests definidos.
* [x] PO/BA validó.

---

## 🏁 Definition of Done

* [ ] Funcional: agregado `progress` presente y correcto en todas las respuestas del endpoint.
* [ ] Tests verdes: unit, integration, E2E, perf, a11y y contract.
* [ ] Cálculo SQL única-query con `COUNT(*) FILTER (...)` cumple PERF-01.
* [ ] Log estructurado `tasks.list.requested` extendido con campos del agregado, sin PII.
* [ ] i18n verificado en `es-LATAM`, `es-ES`, `pt`, `en`.
* [ ] Accesibilidad verificada (`role="progressbar"`, atributos ARIA).
* [ ] Query key TanStack documentada y reuso del invalidador de US-029/US-030/US-031.
* [ ] OpenAPI snapshot actualizado por US-098 (handoff).
* [ ] PO valida la demo end-to-end (crear tarea → confirmar HITL → marcar done → ver % actualizado).

---

## 📝 Notes

* Las políticas para `skipped`, tareas IA no confirmadas, soft-deleted, y para eventos `cancelled`/`completed` están formalizadas en D2/D3 (ver `management/user-stories/decision-resolutions/US-033-decision-resolution.md`).
* Documentation Alignment Required (no bloqueantes) registradas: nota interpretativa sobre BR-TASK-009, corrección `NFR-PERF-API-001 → NFR-PERF-001`, actualización de `docs/16 §M05` con el agregado `progress`.
* Handoff a US-014: el dashboard ya está aprobado y consume el listado de tareas; al integrar US-033, US-014 puede omitir el cálculo client-side y leer `progress.percentage` directamente del response (alineado con su tech spec §255).
