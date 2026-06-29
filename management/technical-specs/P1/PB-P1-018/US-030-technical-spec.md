# Technical Specification — US-030: Cambiar el estado de mi tarea con un toque rápido (Organizer)

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-030 |
| Source User Story | `management/user-stories/US-030-change-task-status.md` |
| Decision Resolution Artifact | No aplica (decisiones formalizadas en `PO/BA Decisions Applied` y en US-029) |
| Priority | P1 |
| Backlog ID | PB-P1-018 |
| Backlog Title | CRUD de tareas manuales y máquina de estados |
| Backlog Execution Order | 36 (P0 = 18 items + posición 18 dentro de P1) |
| User Story Position in Backlog Item | 4 de 4 (US-027 → US-028 → US-029 → **US-030**) |
| Related User Stories in Backlog Item | US-027 (lista), US-028 (crear), US-029 (editar / transición / soft delete), US-030 (UX quick-action) |
| Epic | EPIC-TASK-001 — Checklist & Task Management |
| Backlog Item Dependencies | PB-P0-001 (auth + sesión), PB-P1-006 (creación de eventos) |
| Feature | Quick-action UX para transición de estado de `EventTask` |
| Module / Domain | Tasks (Frontend UX layer) |
| User Story Status | Approved with Minor Notes |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-06-26 |
| Last Updated | 2026-06-26 |

---

## 2. Backlog Execution Context

### Product Backlog Item

`PB-P1-018 — CRUD de tareas manuales y máquina de estados` agrupa las cuatro historias del módulo de checklist manual: lista (US-027), creación (US-028), edición + transición de estado + soft delete (US-029) y la capa UX de transición rápida (US-030).

Acceptance Summary del item:

* Validación de estados (no transiciones inválidas).
* Read-only en `event.status='completed'`; bloqueado en `cancelled`.
* Soft delete enforced.

Traceability del item: `FR-TASK-001..005 · UC-TASK-001..004 · BR-TASK-001..010`.

### Execution Order Rationale

US-030 es la **última posición** del item (4 de 4) porque consume directamente:

* El endpoint canónico `PATCH /api/v1/events/:eventId/tasks/:taskId/status` y el hook `useUpdateEventTaskStatus` que entrega **US-029**.
* La fila `TaskListItem`, el `TaskListItemDto` y la query TanStack `['tasks', eventId]` que entrega **US-027**.

No tiene sentido implementarla antes de US-029. La posición 4 también respeta el principio "MVP-first / foundation before product": los CRUD básicos preceden a los refinamientos de UX.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item | Suggested Order |
|---|---|---|
| US-027 | Vista paginada del checklist; provee `TaskListItem`, `TaskListItemDto`, query TanStack | 1 |
| US-028 | Creación manual de tareas; provee fundación `EventTaskRepository`, ownership policy, role guards | 2 |
| US-029 | Edición de contenido, transición de estado y soft delete; provee endpoint canónico de status, state machine y `useUpdateEventTaskStatus` | 3 |
| US-030 | Capa UX-only de transición rápida (este spec) | 4 |

---

## 3. Executive Technical Summary

US-030 entrega un componente frontend reusable, `TaskStatusQuickToggle`, embebido en `TaskListItem` (US-027) que ofrece dos acciones de un solo toque:

1. **Checkbox principal "Marcar como hecho"** — alterna `pending|in_progress → done` y `done → in_progress`.
2. **Botón secundario "Saltar" / "Reanudar"** — alterna `pending|in_progress → skipped` y `skipped → in_progress`.

El componente **no introduce backend, base de datos, endpoints, use cases ni schemas**. Reutiliza íntegramente el endpoint y el hook `useUpdateEventTaskStatus` que US-029 ya entrega, y agrega:

* **Optimistic update con rollback verificable** vía `onMutate` / `onError` / `onSuccess` / `onSettled` y snapshot deep-equal de la cache `['tasks', eventId]`.
* **Mapeo de errores backend → mensajes i18n** localizados en los 4 locales canónicos (`es-MX`, `es-AR`, `en-US`, `pt-BR`).
* **Cuatro eventos de telemetría UX** (`task.status.quick_action.{requested|succeeded|failed|rolled_back}`) que miden la calidad de la experiencia sin duplicar los logs operativos de backend.
* **Accesibilidad WCAG AA** (`aria-checked`, `aria-pressed`, `aria-disabled`, `aria-live`, navegación por teclado, contraste).

El subconjunto rápido respeta la state machine canónica de US-029. Las transiciones intermedias `pending ↔ in_progress` siguen en `TaskStatusMenu` (US-029).

---

## 4. Scope Boundary

### In Scope

* Componente `TaskStatusQuickToggle` (frontend).
* Wrapper de `useUpdateEventTaskStatus` (US-029) con `onMutate` / `onError` / `onSuccess` / `onSettled` y snapshot/rollback.
* Telemetría UX: 4 eventos estructurados.
* Mapeo de códigos de error backend → claves i18n.
* Catálogos i18n para 4 locales (`tasks.status.quick_action.*` y `tasks.status.error.*`).
* Tests de componente (Vitest + RTL + MSW), tests de accesibilidad (axe-core + smoke manual NVDA/VoiceOver) y un E2E (Playwright) que cubre el flujo completo lista → click → backend real.
* Anuncio `aria-live` localizado del nuevo estado.
* Animación de check (≤ 200 ms).

### Out of Scope

* Cualquier endpoint, controller, use case, Zod schema, repositorio, error de dominio o migración (responsabilidad de US-029).
* `TaskStatusMenu` (dropdown completo de transiciones) — responsabilidad de US-029.
* Confirmación masiva o bulk transitions — responsabilidad de US-031.
* Estados personalizados o workflow configurable.
* Auto-completion al cumplirse `due_date` (Future).
* Notificaciones push / email tras transición (Future).

### Explicit Non-Goals

* No re-implementar la state machine canónica del backend (el cliente sólo decide **qué affordances mostrar**, no la legitimidad de la transición).
* No introducir un cliente HTTP nuevo. Se reusa el `tasksApi.updateStatus(eventId, taskId, status)` que entrega US-029.
* No exponer un endpoint de telemetría nuevo. Se asume el provisto por PB-P0-014; si en MVP no existe, los eventos quedan como `console.debug` con flag `EVENTFLOW_TELEMETRY_DEBUG=true`.

---

## 5. Architecture Alignment

### Backend Architecture

No aplica. Esta historia no toca el backend.

### Frontend Architecture

* Next.js 14 + App Router; este componente es Client Component (estado interactivo + TanStack mutation).
* TanStack Query como cache canónica (`['tasks', eventId]`), patrón ya establecido por US-027/US-029.
* Tailwind CSS / design tokens para el toggle y los iconos.
* `next-intl` para i18n con namespace `tasks.status.quick_action.*` y `tasks.status.error.*`.
* React Hook Form: **no aplica** (el componente no es un form; es un toggle).
* MSW para tests de integración con backend mockeado.

### Database Architecture

No aplica.

### API Architecture

Reutiliza el endpoint canónico de US-029. Sin nuevos endpoints, sin nuevos verbos, sin nuevos schemas.

### AI / PromptOps Architecture

No aplica. Esta historia no invoca al `LLMProvider` ni persiste `AIRecommendation`.

### Security Architecture

* Toda autorización es backend-only y queda íntegramente en US-029.
* La UX nunca decide la legitimidad de la transición; sólo decide **qué affordances mostrar** según el `status` actual y `event.status` que el listado de US-027 ya provee.
* Errores `403`/`404` se presentan con mensaje genérico (no-revelación).
* Telemetría UX excluye `title` y `description` (sin PII).

### Testing Architecture

* Vitest + React Testing Library para tests de componente.
* MSW para mockear respuestas backend (`200 OK`, `200 no_op`, `409 INVALID_TRANSITION`, `409 EVENT_NOT_MUTABLE`, `404 NOT_FOUND`, `403 FORBIDDEN`, `5xx`).
* axe-core para tests automatizados de accesibilidad; smoke manual con NVDA y VoiceOver.
* Playwright para 1 E2E que cubre el flujo lista → click → backend real.

---

## 6. Functional Interpretation

| Acceptance Criterion | Technical Interpretation | Impacted Layer(s) |
|---|---|---|
| AC-01: Marcar como hecho desde `pending` con optimistic update | `TaskStatusQuickToggle` invoca `useUpdateEventTaskStatus.mutate({status:'done'})`. `onMutate` aplica `setQueryData(['tasks', eventId], rewriteTaskStatus(taskId, 'done'))` y guarda el snapshot. `onSuccess` sustituye con el `TaskListItemDto` devuelto. Emite `requested` y `succeeded`. | Frontend |
| AC-02: Saltar tarea desde `in_progress` | Botón secundario "Saltar" → `mutate({status:'skipped'})` con mismo patrón optimistic. | Frontend |
| AC-03: Desmarcar hecho (`done → in_progress`) | Click sobre el checkbox cuando `status='done'` → `mutate({status:'in_progress'})`. | Frontend |
| AC-04: Reanudar desde `skipped` | Botón secundario "Reanudar" → `mutate({status:'in_progress'})`. | Frontend |
| AC-05: Idempotencia same-state percibida como no_op | Si el backend responde `200 OK` con `idempotent: true` o el DTO igual al snapshot, la cache no cambia. Se emite `succeeded` con `idempotent: true`. No se muestra toast. | Frontend |
| EC-01..05: errores backend | `onError(error)` revierte al snapshot, mapea `error.code`/`http.status` → clave i18n, dispara `Toast`, emite `failed` + `rolled_back`. | Frontend |
| EC-06: Doble click rápido | `mutation.isPending` deshabilita el toggle hasta `onSettled`. | Frontend |
| EC-07: Evento bloqueado al cargar | Componente recibe `event.status` desde el padre (`TaskListItem`); si `cancelled|completed`, se renderiza `disabled` con `aria-disabled='true'` y tooltip. | Frontend |
| EC-08: Tarea soft-deleted transitoriamente | Tratado como EC-03 (`404`); el siguiente re-fetch elimina la fila. | Frontend |

---

## 7. Backend Technical Design

**No aplica.** Esta historia no introduce código de backend. El endpoint, el use case, el repositorio, los Zod schemas, los errores de dominio, la state machine, la observabilidad backend y la auditoría se entregan íntegramente por **US-029**.

Como referencia (no acción), el endpoint reusado es:

```
PATCH /api/v1/events/:eventId/tasks/:taskId/status
Body: { "status": "pending" | "in_progress" | "done" | "skipped" }
Response: 200 OK con TaskListItemDto
Errores: 400, 401, 403, 404, 409 INVALID_TRANSITION, 409 EVENT_NOT_MUTABLE, 5xx
```

---

## 8. Frontend Technical Design

### Routes / Pages

* `/[locale]/organizer/events/:eventId/tasks` — vista del checklist provista por US-027.

### Components

#### `TaskStatusQuickToggle` (nuevo, **único componente nuevo de esta historia**)

```ts
type TaskStatusQuickToggleProps = {
  eventId: string;
  task: TaskListItemDto;                 // provisto por TaskListItem (US-027)
  eventStatus: 'draft' | 'published' | 'completed' | 'cancelled';
  allowedQuickTransitions: QuickActionMatrixRow[]; // computado vía helper puro
};
```

* **Estructura visual**:
  * Checkbox principal (`role="checkbox"`, `aria-checked`) — etiqueta dinámica según `task.status`.
  * Botón secundario "Saltar" / "Reanudar" (`role="button"`, `aria-pressed`).
* **Estado interno mínimo** (todo lo demás vive en TanStack):
  * `isPendingSnapshotRef` (ref a snapshot previo para rollback).
  * `mutation` (vía `useUpdateEventTaskStatus` reusado).
* **Composición con `TaskListItem` (US-027)**: el componente recibe `task` y `eventStatus` por props desde el padre; no consume directamente la query. La invalidación / re-escritura de cache ocurre dentro del wrapper de mutation.

#### Helper puro: `computeQuickActions(taskStatus, eventStatus): QuickActionMatrixRow[]`

```ts
type QuickAction = 'check_done' | 'uncheck_done' | 'skip' | 'resume';

type QuickActionMatrixRow = {
  action: QuickAction;
  toStatus: 'pending' | 'in_progress' | 'done' | 'skipped';
  visible: boolean;
  enabled: boolean;
  ariaLabelKey: string;
  iconKey: 'check' | 'uncheck' | 'skip' | 'resume';
};
```

Matriz canónica:

| `taskStatus` actual | Acción rápida visible | `toStatus`     | Condición de `enabled` |
| ------------------- | --------------------- | -------------- | ---------------------- |
| `pending`           | `check_done`           | `done`         | `eventStatus ∉ {cancelled, completed}` |
| `pending`           | `skip`                 | `skipped`      | `eventStatus ∉ {cancelled, completed}` |
| `in_progress`       | `check_done`           | `done`         | `eventStatus ∉ {cancelled, completed}` |
| `in_progress`       | `skip`                 | `skipped`      | `eventStatus ∉ {cancelled, completed}` |
| `done`              | `uncheck_done`         | `in_progress` | `eventStatus ∉ {cancelled, completed}` |
| `skipped`           | `resume`               | `in_progress` | `eventStatus ∉ {cancelled, completed}` |

Las transiciones `pending ↔ in_progress` **no** son quick-action: se delegan al `TaskStatusMenu` de US-029.

#### Wrapper de hook: `useQuickActionStatusMutation(eventId, task)`

* Internamente compone `useUpdateEventTaskStatus({ eventId, taskId: task.id })` (US-029).
* Implementa:
  * `onMutate(variables)`:
    * `await queryClient.cancelQueries({ queryKey: ['tasks', eventId] })` — evita races con re-fetch.
    * Captura `snapshot = queryClient.getQueryData(['tasks', eventId])` (deep clone para verificación).
    * Aplica `setQueryData(['tasks', eventId], rewriteTaskStatus(taskId, variables.status))`.
    * Genera `correlation_id` cliente si no hay uno propagado.
    * Emite `task.status.quick_action.requested` con payload completo.
    * Retorna `{ snapshot, requestedAt }`.
  * `onSuccess(data, variables, context)`:
    * Sustituye la entrada de la tarea en la cache con el `TaskListItemDto` devuelto.
    * Emite `task.status.quick_action.succeeded` con `latency_ms = now - context.requestedAt` y `idempotent` si aplica.
  * `onError(error, variables, context)`:
    * `setQueryData(['tasks', eventId], context.snapshot)` — rollback.
    * Mapea `error.code` / `error.httpStatus` → clave i18n.
    * Dispara `Toast` con la clave y el `error.code` para QA.
    * Emite `task.status.quick_action.failed` y `task.status.quick_action.rolled_back`.
  * `onSettled()`:
    * `queryClient.invalidateQueries({ queryKey: ['tasks', eventId] })` — garantiza consistencia con el backend.

### Forms

No aplica.

### State Management

* TanStack Query como cache canónica.
* No se introduce store global (Zustand/Redux) para esta historia.
* Snapshot del rollback vive en el `context` de la mutación, no en estado React.

### Data Fetching

* No hay fetch nuevo. Se consume la query existente `['tasks', eventId]` de US-027 a través del padre.

### Loading / Empty / Error / Success States

| Estado | Comportamiento |
|---|---|
| Default | Checkbox + botón secundario activos según matriz. |
| `mutation.isPending` | Toggle `disabled` + spinner inline ≤ 16 px. Doble click ignorado. |
| Error transitorio (`5xx`) | Toast con clave `tasks.status.error.transient` + botón "Reintentar". |
| Error de validación (`409`, `404`, `403`) | Toast genérico (no-revelación para 403/404; mensaje explícito para 409). |
| Success | Animación de check (≤ 200 ms) + `aria-live='polite'` con el nuevo estado localizado. |
| Read-only (`event.status ∈ {cancelled, completed}`) | `aria-disabled='true'`, tooltip `tasks.status.disabled.event_locked`, sin click handler. |

### Accessibility

| Atributo / Comportamiento | Especificación |
|---|---|
| `role` | `checkbox` (checkbox principal), `button` (botón secundario). |
| `aria-checked` | `true` cuando `task.status === 'done'`, `false` en otros casos. |
| `aria-pressed` | `true` cuando `task.status === 'skipped'` y el botón está en modo "Reanudar". |
| `aria-disabled` | `true` cuando bloqueado por `event.status` o `mutation.isPending`. |
| `aria-live` | Región `polite` contigua al toggle que anuncia el nuevo estado al éxito. |
| Foco visible | Outline ≥ 2 px, contraste WCAG AA. |
| Navegación por teclado | `Tab` para foco; `Space` o `Enter` para activar. |
| Target táctil | ≥ 44 × 44 px (WCAG 2.5.5). |
| Contraste | Icono y check ≥ 4.5:1 contra el fondo de la fila (modos light/dark). |

### i18n

Catálogos en `apps/web/locales/{es-MX,es-AR,en-US,pt-BR}/tasks.json`. Claves nuevas:

```text
tasks.status.quick_action.label.check_done
tasks.status.quick_action.label.uncheck_done
tasks.status.quick_action.label.skip
tasks.status.quick_action.label.resume
tasks.status.quick_action.aria.check_done
tasks.status.quick_action.aria.uncheck_done
tasks.status.quick_action.aria.skip
tasks.status.quick_action.aria.resume
tasks.status.quick_action.announce.done
tasks.status.quick_action.announce.in_progress
tasks.status.quick_action.announce.skipped

tasks.status.error.invalid_transition         // interpola {currentStatus}, {requestedStatus}
tasks.status.error.event_not_mutable
tasks.status.error.not_found_or_forbidden     // mensaje genérico no-revelación
tasks.status.error.transient

tasks.status.disabled.event_locked
tasks.status.disabled.mutation_pending
```

Validación build-time: lint que falla si una clave existe en `es-MX` pero falta en cualquiera de los otros 3 locales.

---

## 9. API Contract Design

Esta historia **no define** endpoints nuevos. Como referencia, reusa:

| Method | Endpoint | Purpose | Auth Required | Request | Response | Error Cases |
|---|---|---|---|---|---|---|
| PATCH | `/api/v1/events/:eventId/tasks/:taskId/status` (reusado de US-029) | Transición de estado canónica | Sí (cookie de sesión, rol Organizer dueño) | `{ "status": "pending" \| "in_progress" \| "done" \| "skipped" }` | `200 OK` con `TaskListItemDto` (incluye `idempotent: true` cuando aplica) | `400`, `401`, `403`, `404`, `409 INVALID_TRANSITION`, `409 EVENT_NOT_MUTABLE`, `5xx` |

---

## 10. Database / Prisma Design

No aplica. Sin tablas, columnas, índices, constraints, migraciones ni seeds nuevos.

---

## 11. AI / PromptOps Design

No aplica.

---

## 12. Security & Authorization Design

### Authentication

Cookie HTTP-only de sesión, gestionada por la fundación de auth (PB-P0-001). El cliente nunca manipula el token.

### Authorization

Backend-only en US-029. El cliente nunca decide la legitimidad. Para `event.status` y `task.status`, la UI sólo decide **affordances visuales**.

### Ownership Rules

No aplica al cliente. El backend valida `actor.id === event.owner_user_id`.

### Role Rules

* Sólo Organizer dueño ve y opera este componente.
* Vendor / Admin nunca llegan a esta vista por enrutamiento; si lo hicieran, el backend responde `403`.

### Negative Authorization Scenarios

Mostrar mensaje genérico de no-revelación para `403`/`404`. No exponer códigos internos en el toast (sí en telemetría para QA).

### Audit Requirements

La auditoría operativa la gestiona US-029 vía logs `tasks.updated*` + columnas `updated_by_user_id` / `updated_at`. Esta historia agrega telemetría UX, **no** AdminAction.

### Sensitive Data Handling

* Sin PII en eventos de telemetría (`title`, `description` quedan fuera).
* Sin tokens en `localStorage` ni en URL.
* Sin secretos en el repositorio.

---

## 13. Testing Strategy

### Unit Tests (Vitest)

* `computeQuickActions(taskStatus, eventStatus)` — matriz canónica completa (8 filas) + bordes (`event.status ∈ {cancelled, completed}`).
* `rewriteTaskStatus(taskId, status)` (helper de cache) — idempotencia, no muta input.
* Mapeo de errores backend → claves i18n (tabla completa).

### Integration Tests (Vitest + RTL + MSW)

| ID    | Scenario                                                                                | Type        |
| ----- | --------------------------------------------------------------------------------------- | ----------- |
| TS-01 | AC-01 happy path con MSW `200 OK` y `TaskListItemDto` actualizado                       | Component   |
| TS-02 | AC-02 "Saltar" desde `in_progress`                                                       | Component   |
| TS-03 | AC-03 desmarcar `done → in_progress`                                                     | Component   |
| TS-04 | AC-04 reanudar desde `skipped`                                                           | Component   |
| TS-05 | AC-05 idempotent same-state — cache idéntica al snapshot                                 | Component   |
| TS-06 | Optimistic + rollback verifica snapshot deep equal                                       | Component   |
| TS-07 | Doble click rápido (EC-06) emite solo una mutación                                       | Component   |
| NT-01 | Backend responde `409 INVALID_TRANSITION` (EC-01) → rollback + Toast + telemetría        | Component   |
| NT-02 | Backend responde `409 EVENT_NOT_MUTABLE` (EC-02) → rollback + Toast + telemetría         | Component   |
| NT-03 | Backend responde `404 NOT_FOUND` (EC-03) → rollback + Toast genérico                     | Component   |
| NT-04 | Backend responde `403 FORBIDDEN` (EC-04) → rollback + Toast genérico                     | Component   |
| NT-05 | Backend responde `5xx` (EC-05) → rollback + Toast transient + botón "Reintentar"         | Component   |
| NT-06 | `event.status='completed'` recibido (EC-07) → toggle `disabled` + `aria-disabled='true'` | Component   |
| CONC-01 | Dos clicks rápidos antes de que la mutación resuelva → segundo ignorado                   | Component   |
| CONC-02 | Click mientras `['tasks', eventId]` está re-fetcheando → `onSettled` reconcilia          | Component   |

### API Tests

No aplica (sin endpoint propio).

### E2E Tests (Playwright)

| ID    | Scenario                                                                                | Type        |
| ----- | --------------------------------------------------------------------------------------- | ----------- |
| TS-08 | Desde lista de US-027 hasta backend real (sin mock) marcando como hecho                  | E2E         |

### Security Tests

* Verificación de no-revelación: el toast para `403`/`404` es idéntico (no se filtran códigos internos al DOM visible).
* Verificación de payload de telemetría: ausencia de `title`/`description` (snapshot del payload emitido).

### Accessibility Tests

| ID         | Scenario                                                              | Expected Result                                  |
| ---------- | --------------------------------------------------------------------- | ------------------------------------------------ |
| A11Y-01    | Navegación con teclado (`Tab`, `Space`, `Enter`)                       | Toggle activable; foco visible                    |
| A11Y-02    | axe-core sin violaciones; smoke manual NVDA / VoiceOver               | Anuncia `aria-checked` + cambio vía `aria-live`   |
| A11Y-03    | Estado `disabled` cuando `event.status='completed'`                   | `aria-disabled='true'` + tooltip leído            |
| A11Y-04    | Contraste de color del check y los iconos                            | WCAG AA ≥ 4.5:1                                  |

### AI Tests

No aplica.

### Seed / Demo Tests

* Smoke manual con un evento sembrado en `event.status='published'` que contenga tareas IA y manuales en cada uno de los 4 estados.

### CI Checks

* Vitest + RTL + MSW (component tests) en pipeline frontend.
* axe-core en pipeline frontend.
* Playwright (1 E2E) en pipeline de integración.
* Linter de claves i18n (build-time check) en los 4 locales.

---

## 14. Observability & Audit

### Logs

Cuatro eventos UX emitidos vía `useTelemetryClient().track(...)` (cliente provisto por PB-P0-014):

| Evento                                       | Payload                                                                                                    |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `task.status.quick_action.requested`         | `{ event_id, task_id, from_status, to_status, action, correlation_id, ui_origin: 'quick_action' }`         |
| `task.status.quick_action.succeeded`         | `requested.payload + { latency_ms, idempotent?: boolean }`                                                  |
| `task.status.quick_action.failed`            | `requested.payload + { error_code, http_status }`                                                            |
| `task.status.quick_action.rolled_back`       | `requested.payload + { reason: 'mutation_error', error_code }`                                              |

### Correlation ID

* Si el backend o el middleware ya propagaron `X-Correlation-Id`, se reutiliza.
* En caso contrario, el cliente genera uno (UUID v4) y lo pone en el header.

### AdminAction

No aplica.

### Error Tracking

Errores no atrapados dentro del wrapper se propagan al sink global (Sentry o equivalente) que configura PB-P0-014. Sin captura silenciosa.

### Metrics

Las métricas operativas (`tasks_updated_total`, `tasks_transition_rejected_total{reason}`, `tasks_mutate_latency_ms`) las emite el backend en US-029. Esta historia no agrega métricas backend.

Métricas derivables del stream UX (panel de analítica del frontend; **fuera del scope de implementación**, sólo se documenta el contrato):

* `quick_action_total{action}`
* `quick_action_rollback_total{error_code}`
* `quick_action_latency_p50_ms`

---

## 15. Seed / Demo Data Impact

### Seed Data Required

Ninguno nuevo. Se aprovecha el seed de tareas IA + manuales que entregan US-018 / US-028.

### Demo Scenario Supported

* Demo "Live progress": marcar 3 tareas como hechas en sucesión rápida (≤ 2 s entre clicks) y mostrar la actualización inmediata + el rollback ante un `409` simulado.
* Demo accesibilidad: navegar el checklist con teclado y mostrar el anuncio `aria-live` con NVDA.

### Reset / Isolation Notes

Reset de demo se cubre por el reset general de eventos sembrados (PB-P0-016). Sin acción adicional.

---

## 16. Documentation Alignment Required

| Document / Source | Conflict | Current Decision | Recommended Action | Blocks Implementation? |
|---|---|---|---|---|
| `/docs/10` | Referenciaba `NFR-PERF-API-001` (stale) | Canónico `NFR-PERF-001` | Cleanup editorial en `/docs/10` | No |
| `/docs/8` | `UC-TASK-004` aislado vs. anclaje a `UC-TASK-001` transversal | Canónico: `UC-TASK-004` con anclaje transversal a `UC-TASK-001` (consistente con US-027/028/029) | Aclaración liviana en `/docs/8` | No |
| `/docs/15` | Patrón snapshot/rollback no documentado explícitamente como recomendación canónica | Esta historia formaliza el patrón `onMutate`/`onError`/`onSuccess`/`onSettled` con snapshot deep-equal | Agregar el patrón como referencia oficial en `/docs/15` | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Rollback incompleto deja la cache en estado inconsistente con backend | Usuario ve un estado erróneo y reporta bug | Snapshot deep-clone + invalidación obligatoria en `onSettled`. Test `TS-06` valida deep-equal. |
| Telemetría dispara antes de que la mutation realmente se envíe (race con `onMutate`) | Métricas de UX inexactas | `requested` se emite **después** del `setQueryData` y del snapshot, dentro del mismo `onMutate`. Test ordenado. |
| Doble click crea dos mutaciones que entran en race | Posible flicker o inconsistencia | `mutation.isPending` deshabilita el toggle; test `TS-07` cubre el caso. |
| Concurrencia con re-fetch automático de TanStack | Snapshot apunta a datos viejos | `await queryClient.cancelQueries(...)` antes de capturar snapshot; test `CONC-02`. |
| Mensajes i18n inconsistentes entre locales | Demo pierde claridad | Linter build-time + tests de mapeo de errores en al menos 2 locales. |
| `useTelemetryClient` aún no provisto por PB-P0-014 al momento de implementar | Bloquea el wiring | Fallback `console.debug` con flag `EVENTFLOW_TELEMETRY_DEBUG=true`; documentado. |
| Animación de check rompe a11y (auto-play sin `prefers-reduced-motion`) | Falla WCAG | Respetar `@media (prefers-reduced-motion: reduce)` deshabilitando la animación. |

---

## 18. Implementation Guidance for Coding Agents

### Files / folders likely impacted

```
apps/web/src/features/tasks/quick-action/
  TaskStatusQuickToggle.tsx                 (nuevo)
  TaskStatusQuickToggle.test.tsx            (nuevo)
  use-quick-action-status-mutation.ts       (nuevo wrapper)
  use-quick-action-status-mutation.test.ts  (nuevo)
  compute-quick-actions.ts                  (helper puro)
  compute-quick-actions.test.ts             (nuevo)
  quick-action-error-map.ts                 (mapeo error → i18n key)
  quick-action-error-map.test.ts            (nuevo)
  index.ts                                  (barrel export)

apps/web/src/features/tasks/list/
  TaskListItem.tsx                          (MODIFICAR: composición del Toggle)
  TaskListItem.test.tsx                     (actualizar smoke)

apps/web/locales/es-MX/tasks.json           (MODIFICAR: agregar claves)
apps/web/locales/es-AR/tasks.json           (MODIFICAR)
apps/web/locales/en-US/tasks.json           (MODIFICAR)
apps/web/locales/pt-BR/tasks.json           (MODIFICAR)

apps/web/e2e/tasks/quick-action.spec.ts     (nuevo Playwright)
```

### Recommended order of implementation

1. `compute-quick-actions.ts` + test (puro, sin dependencias).
2. `quick-action-error-map.ts` + test.
3. Catálogos i18n en los 4 locales.
4. `use-quick-action-status-mutation.ts` (wrapper) + test con MSW.
5. `TaskStatusQuickToggle.tsx` + test (componente).
6. Integración en `TaskListItem` con feature flag opcional para A/B si aplica.
7. E2E Playwright.
8. Smoke manual de accesibilidad (NVDA / VoiceOver).

### Decisions that must not be reopened

* No introducir endpoints nuevos.
* No reimplementar la state machine en cliente; el helper `computeQuickActions` decide affordances, no legitimidad.
* No mostrar códigos backend en toasts genéricos (no-revelación para 403/404).
* La cache canónica sigue siendo `['tasks', eventId]` (US-027); no se introduce una clave nueva.
* Optimistic update **siempre** acompañado de snapshot + rollback verificable + `cancelQueries`.

### What must not be implemented

* Cualquier código de backend.
* Migraciones, índices, columnas.
* Bulk transitions (US-031).
* Menú completo de transiciones (`TaskStatusMenu` de US-029).

### Assumptions to preserve

* US-029 está disponible cuando US-030 comienza (entrega endpoint + hook).
* US-027 expone `event.status` en cada `TaskListItem`.
* `useTelemetryClient` existe o tiene fallback `console.debug`.
* `next-intl` ya está configurado con los 4 locales canónicos.

---

## 19. Task Generation Notes

### Suggested task groups

* **FE** (4–5 tareas):
  * Helper puro `computeQuickActions` + matriz canónica.
  * Wrapper `useQuickActionStatusMutation` con snapshot/rollback/`cancelQueries`/`invalidateQueries`.
  * Componente `TaskStatusQuickToggle` con a11y y animación respetando `prefers-reduced-motion`.
  * Integración en `TaskListItem` (US-027).
* **OBS** (1 tarea): wiring de los 4 eventos de telemetría con payload canónico + fallback `console.debug` con flag.
* **I18N** (1 tarea): claves en los 4 locales + linter build-time.
* **QA** (5–6 tareas):
  * Component tests (TS-01..07, NT-01..06, CONC-01..02).
  * Test del helper `computeQuickActions`.
  * Test del mapping de errores.
  * Accessibility tests (A11Y-01..04).
  * E2E Playwright (TS-08).
* **DOC** (2 tareas):
  * Documentation Alignment: cleanup editorial en `/docs/10`, `/docs/8`, `/docs/15` + coordinación con US-098 para snapshot OpenAPI (no aplica a este endpoint porque ya lo cubre US-029, pero documentar la decisión).

### Required QA tasks

* TS-01..08, NT-01..06, AUTH-TS-01..03, A11Y-01..04, CONC-01..02.
* Snapshot del payload de telemetría (sin PII).
* Test cross-locale de mensajes de error en al menos 2 locales.

### Required security tasks

* Verificación de no-revelación en toast 403/404.
* Verificación de ausencia de PII en payloads de telemetría.

### Required seed/demo tasks

* Ninguno nuevo. Documentar el escenario demo en el handoff.

### Required documentation tasks

* DOC-001: Cleanup editorial en `/docs/10` (`NFR-PERF-API-001 → NFR-PERF-001`).
* DOC-002: Aclaración en `/docs/8` (UC-TASK-004 + anclaje a UC-TASK-001) y formalización del patrón snapshot/rollback en `/docs/15`.

### Dependencies between tasks

* `compute-quick-actions` debe completarse antes de `TaskStatusQuickToggle`.
* `use-quick-action-status-mutation` debe completarse antes de la integración en `TaskListItem`.
* Catálogos i18n deben completarse antes del componente (caso contrario los tests fallan por claves faltantes).
* OBS y FE pueden avanzar en paralelo una vez que el contrato del payload está aceptado.

### Consolidated `tasks.md`?

El item `PB-P1-018` ya acumuló 4 US (US-027/028/029/030); recomendado generar **al cierre** un `PB-P1-018-tasks-consolidated.md` que liste el orden global de ejecución para Sprint Planning. No bloquea esta historia.

---

## 20. Technical Spec Readiness

| Check | Status |
|---|---|
| User Story approved or explicitly allowed for draft spec | Pass |
| Product Backlog mapping found | Pass |
| Decision Resolution reviewed if present | N/A |
| Scope clear | Pass |
| Architecture alignment clear | Pass |
| API impact clear | Pass (reuso US-029) |
| DB impact clear | N/A (sin DB) |
| AI impact clear | N/A |
| Security impact clear | Pass |
| Testing strategy clear | Pass |
| Ready for Development Task Breakdown | Yes |

---

## 21. Final Recommendation

**Ready for Task Breakdown.**

US-030 es una historia bien acotada de UX-only que:

1. No introduce backend, base de datos, endpoints, schemas ni migraciones.
2. Reutiliza íntegramente el endpoint canónico y el hook de US-029.
3. Aporta valor demostrable: optimistic update con rollback verificable, telemetría UX dedicada, accesibilidad WCAG AA y consistencia en 4 locales.
4. Tiene una matriz canónica explícita de affordances, mapeo de errores → i18n y un patrón snapshot/rollback formalizado.
5. Los 3 Documentation Alignment son cleanup editorial **no bloqueante**.

La historia queda lista para que `eventflow-user-story-to-development-tasks` genere el desglose final.
