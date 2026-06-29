# 🧾 User Story: Cambiar el estado de mi tarea con un toque rápido (Organizer)

## 🆔 Metadata

| Field              | Value                                                                |
| ------------------ | -------------------------------------------------------------------- |
| ID                 | US-030                                                               |
| Epic               | EPIC-TASK-001 — Checklist & Task Management                          |
| Backlog Item       | PB-P1-018 — CRUD de tareas manuales y máquina de estados              |
| UI Surface         | Página "Mi checklist" del evento, fila de tarea (`TaskListItem`)     |
| Feature            | Quick-action UX para transición de estado de `EventTask`             |
| Module / Domain    | Tasks (Frontend UX layer)                                            |
| User Role          | Organizer                                                            |
| Priority           | Must Have                                                            |
| Status             | Approved                                                             |
| Owner              | Product Owner / Business Analyst                                     |
| Approved By        | PO/BA Review                                                          |
| Approval Date      | 2026-06-26                                                           |
| Ready for Development Tasks | Yes                                                          |
| Sprint / Milestone | MVP                                                                  |
| Created Date       | 2026-06-09                                                           |
| Last Updated       | 2026-06-26                                                           |

---

## 🎯 User Story

**As an** organizador autenticado dueño de un evento mutable
**I want** marcar mis tareas como `done` o `skipped` con un solo toque (checkbox o botón rápido) y ver el cambio reflejado inmediatamente con rollback si falla
**So that** mi progreso se mantenga actualizado sin abrir un menú o un diálogo y sin esperar el round-trip al backend

---

## 🧠 Business Context

### Context Summary

Esta historia define la **capa de UX de transición rápida** sobre el endpoint canónico de estado que US-029 ya formaliza (`PATCH /api/v1/events/:eventId/tasks/:taskId/status`). El componente `TaskStatusMenu` general — que muestra todas las transiciones permitidas — pertenece a US-029. Esta historia agrega un **toggle de un solo toque** (componente `TaskStatusQuickToggle`) directamente en la fila de la lista (`TaskListItem`) con dos acciones canónicas:

* **Checkbox principal "Marcar como hecho"** — alterna entre `pending|in_progress → done` y `done → in_progress` (cuando la state machine lo permite).
* **Botón secundario "Saltar"** — transición a `skipped` con confirmación liviana.

El backend, la state machine, los códigos de error (`409 INVALID_TRANSITION`, `409 EVENT_NOT_MUTABLE`, `404 NOT_FOUND`), el ownership y la auditoría son **íntegramente responsabilidad de US-029**. US-030 se enfoca en:

1. Componente reusable y accesible para la fila de tarea.
2. Optimistic update con rollback verificable.
3. Telemetría de UX (`task.status.quick_action.*`) que **no duplica** los logs de backend.
4. Mensajería localizada coherente con los códigos de error que US-029 ya define.

### Related Domain Concepts

* `EventTask.status ∈ {pending, in_progress, done, skipped}` (`/docs/18`).
* State machine canónica definida por US-029 (`FR-TASK-004`, `BR-TASK-004`): `pending → in_progress | done | skipped`; `in_progress → done | skipped`; `done` y `skipped` terminales.
* `TaskListItem` (componente reusable; consumidor del listado de US-027).
* `TaskListItemDto` (DTO de respuesta canónico; consumido por la query `['tasks', eventId]` de US-027).
* `useUpdateEventTaskStatus` (hook TanStack definido en US-029).

### Assumptions

* US-029 está implementada o se implementa antes (el backend, schemas Zod, state machine, telemetría backend y testing del endpoint son su entregable).
* El listado de tareas (US-027) ya invalida o reescribe la query `['tasks', eventId]` tras una mutación exitosa de estado.
* La fila `TaskListItem` ya está renderizada con el estado actual (`task.status`) recibido desde el listado.
* El idioma de la UI viene del `locale` de la aplicación; los mensajes de error backend respetan `event.language_code`.

### Dependencies

* PB-P1-018 / **US-029** (backend canónico `PATCH /api/v1/events/:eventId/tasks/:taskId/status` y `TaskStatusMenu`).
* PB-P1-018 / US-027 (lista de tareas paginada y query TanStack a invalidar).
* PB-P0-001 (autenticación + sesión).
* PB-P0-014 (observabilidad / correlation IDs).

---

## 🔗 Traceability

| Source                 | Reference                                                                                                |
| ---------------------- | -------------------------------------------------------------------------------------------------------- |
| Backlog Item           | PB-P1-018                                                                                                |
| FRD Requirement(s)     | FR-TASK-004 (state machine canónica; consumida en UX), FR-TASK-011 (eventos bloqueados; consumida en UX) |
| Use Case(s)            | UC-TASK-004 (Cambiar estado de tarea — capa UX); transversal a UC-TASK-001                               |
| Business Rule(s)       | BR-TASK-004 (transiciones permitidas; consumidas en UX para mostrar affordances correctas), BR-TASK-010 (admin no participa) |
| Permission Rule(s)     | Ownership backend-only (delegado a US-029); vendor/admin → `403`                                          |
| Data Entity / Entities | `EventTask` (lectura del `status` actual; mutación delegada a US-029)                                     |
| API Endpoint(s)        | **Reusa** `PATCH /api/v1/events/:eventId/tasks/:taskId/status` de US-029. **No define** endpoints nuevos. |
| NFR Reference(s)       | NFR-PERF-001 (P95 ≤ 1.5 s del backend que reusa), NFR-OBS-001 (correlation ID propagado), NFR-A11Y-001 (WCAG AA + `aria-checked`) |
| Related ADR(s)         | ADR-FE-002 (TanStack Query como cache canónica; optimistic updates)                                       |
| PO Decision(s)         | Decisión PO PB-P1-018: la transición rápida es UX dedicada, no un endpoint nuevo. La state machine es la canónica de US-029. |
| Related Document(s)    | `/docs/4` BR-TASK-004/010, `/docs/8` UC-TASK-004 transversal, `/docs/9` FR-TASK-004/011, `/docs/10` NFR-PERF-001, NFR-OBS-001, `/docs/15` patrones optimistic update + accesibilidad, `/docs/16` §25.2 endpoint reusado, `/docs/18` `event_task_status` enum |

---

## 🧩 PO/BA Decisions Applied

1. **Sin backend propio** — Esta historia **no** introduce endpoints, use cases, controllers, repositorios, Zod schemas, errores de dominio ni migraciones. Reusa íntegramente el endpoint `PATCH /api/v1/events/:eventId/tasks/:taskId/status` y el hook `useUpdateEventTaskStatus` definidos por US-029.
2. **Componente nuevo `TaskStatusQuickToggle`** — Acción rápida embebida en `TaskListItem`. Estructura:
   * Checkbox visual + `aria-checked` con label "Marcar como hecho".
   * Botón secundario "Saltar" (icono + label) con `aria-pressed`.
   * Estado deshabilitado cuando `task.status ∈ {done, skipped}` y la transición pretendida no está permitida por la state machine canónica.
   * No se invoca cuando `event.status ∈ {cancelled, completed}`; en su lugar, la fila completa entra en modo read-only (`disabled` + tooltip "Evento bloqueado").
3. **Transiciones rápidas habilitadas** — Mapeo desde el `status` actual:

   | Acción rápida    | Visible si                          | Transición canónica            |
   | ---------------- | ----------------------------------- | ------------------------------ |
   | Marcar como hecho | `status ∈ {pending, in_progress}`    | `→ done`                        |
   | Desmarcar hecho   | `status === 'done'`                  | `→ in_progress`                 |
   | Saltar            | `status ∈ {pending, in_progress}`    | `→ skipped`                     |
   | Reanudar          | `status === 'skipped'`               | `→ in_progress`                 |

   Estas transiciones son **el subconjunto rápido** de la state machine canónica de US-029. Cambios entre `pending` ↔ `in_progress` se cubren con `TaskStatusMenu` general de US-029.
4. **Optimistic update con rollback verificable** — Al hacer click:
   * Se actualiza la entrada de cache `['tasks', eventId]` y la fila renderiza el nuevo estado inmediatamente.
   * Se invoca `useUpdateEventTaskStatus.mutateAsync(...)`.
   * Si responde `200 OK`: se sustituye la entrada cache con el `TaskListItemDto` recibido y se emite `task.status.quick_action.succeeded`.
   * Si responde con error (`409 INVALID_TRANSITION`, `409 EVENT_NOT_MUTABLE`, `404 NOT_FOUND`, `403 FORBIDDEN`, `5xx`): se revierte la cache al snapshot previo, se muestra `Toast` con mensaje localizado y se emite `task.status.quick_action.failed` o `task.status.quick_action.rolled_back`.
5. **Telemetría dedicada de UX, no duplicación de backend** — Cuatro eventos estructurados en el cliente, propagados al backend de observabilidad (vía el endpoint de telemetría web ya provisto por PB-P0-014):

   * `task.status.quick_action.requested` — al click, incluye `event_id`, `task_id`, `from_status`, `to_status`, `action ∈ {check_done, uncheck_done, skip, resume}`, `correlation_id` (generado en cliente o propagado del request).
   * `task.status.quick_action.succeeded` — al `200 OK`, agrega `latency_ms`.
   * `task.status.quick_action.failed` — al error, agrega `error_code`, `http_status`.
   * `task.status.quick_action.rolled_back` — explicita el rollback de cache + UI.

   El backend ya emite `tasks.updated` para la transición en sí (US-029); estos eventos miden **la calidad de la UX**, no la operación.
6. **Mensajería localizada por código de error** — Mapeo cliente → mensaje i18n:

   | Código backend             | Mensaje UX (clave i18n)             |
   | -------------------------- | ----------------------------------- |
   | `409 INVALID_TRANSITION`   | `task.status.error.invalid_transition` |
   | `409 EVENT_NOT_MUTABLE`    | `task.status.error.event_not_mutable`  |
   | `404 NOT_FOUND`            | `task.status.error.not_found_or_forbidden` (no-revelación, mensaje genérico) |
   | `403 FORBIDDEN`            | `task.status.error.not_found_or_forbidden` |
   | `5xx`                      | `task.status.error.transient`        |
7. **Accesibilidad WCAG AA** — El toggle expone `aria-checked`/`aria-pressed`, soporta navegación por teclado (`Space`/`Enter`), tiene foco visible y anuncia el cambio vía `aria-live="polite"` con el nuevo estado localizado. El botón "Saltar" pide confirmación inline solamente si la transición es desde `pending` (por bajo costo cognitivo); desde `in_progress` confirma sin diálogo.
8. **Sin acción admin** — Esta historia es exclusiva del rol Organizer dueño del evento. Admin y vendor no la ven y, si intentaran el request, el backend (US-029) responde `403`.
9. **i18n en 4 locales** — `es-MX` (fallback `es-LATAM`), `es-AR`, `en-US`, `pt-BR`. Las claves siguen el namespace `tasks.status.quick_action.*` y `tasks.status.error.*`. Sin contenido dinámico literal (siempre keys + interpolación).

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: In Scope
* MVP Relevance: Must Have

### Explicitly Out of Scope

* Cualquier endpoint, controller, use case, Zod schema o migración de DB (responsabilidad de US-029).
* Menú completo de transiciones (`TaskStatusMenu` con todas las transiciones permitidas) — responsabilidad de US-029.
* Bulk transitions / confirmación masiva — responsabilidad de US-031.
* Workflow customizable o estados personalizados.
* Auto-completion al cumplirse `due_date` (Future).
* Notificaciones push o por correo al completar — Future.
* Recordatorios programados.

### Scope Notes

* Esta historia es **UX-only**: agrega un componente, un wrapper de hook, telemetría de cliente, i18n y QA frontend.
* La cache TanStack `['tasks', eventId]` ya existe (US-027) y ya se invalida desde US-029 al éxito; aquí solo extendemos el patrón con snapshot/rollback.

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Marcar como hecho desde `pending` con optimistic update

**Given** un organizador autenticado en `/[locale]/organizer/events/:eventId/tasks` viendo una tarea con `status='pending'`
**When** hace click en el checkbox "Marcar como hecho"
**Then** la fila renderiza inmediatamente `status='done'` (optimistic update sobre la cache `['tasks', eventId]`)
**And** se invoca `PATCH /api/v1/events/:eventId/tasks/:taskId/status` con `{ "status": "done" }`
**And** al recibir `200 OK` con `TaskListItemDto`, la cache se sustituye con el DTO devuelto
**And** se emiten los eventos `task.status.quick_action.requested` y `task.status.quick_action.succeeded` con `from_status='pending'`, `to_status='done'`, `action='check_done'`.

### AC-02: Saltar tarea desde `in_progress`

**Given** una tarea con `status='in_progress'`
**When** hace click en "Saltar"
**Then** la fila renderiza `status='skipped'` optimísticamente
**And** se invoca el endpoint con `{ "status": "skipped" }`
**And** al `200 OK` la cache se confirma
**And** los eventos `task.status.quick_action.requested|succeeded` reportan `action='skip'`.

### AC-03: Desmarcar hecho (`done → in_progress`)

**Given** una tarea con `status='done'`
**When** hace click en el checkbox para desmarcar
**Then** la fila renderiza `status='in_progress'` optimísticamente
**And** se invoca el endpoint con `{ "status": "in_progress" }`
**And** la cache se confirma al `200 OK`
**And** los eventos reportan `action='uncheck_done'`.

### AC-04: Reanudar desde `skipped`

**Given** una tarea con `status='skipped'`
**When** hace click en el botón "Reanudar"
**Then** la fila renderiza `status='in_progress'` optimísticamente
**And** se invoca el endpoint con `{ "status": "in_progress" }`
**And** los eventos reportan `action='resume'`.

### AC-05: Idempotencia same-state percibida como no_op

**Given** una transición que el backend considera idempotente (`200 OK no_op` según US-029)
**When** se confirma el `200 OK`
**Then** la cache no cambia respecto del snapshot (idéntico)
**And** se emite `task.status.quick_action.succeeded` con `idempotent: true` (campo opcional) y `latency_ms`.

---

## ⚠️ Edge Cases

### EC-01: `409 INVALID_TRANSITION` — rollback y mensaje localizado

**Given** la cache local muestra `status='done'` pero el backend, por concurrencia, considera que el estado actual ya es `skipped` (terminal)
**When** el cliente intenta `done → in_progress` y el backend responde `409 INVALID_TRANSITION` con `details.current_status='skipped'`
**Then** la cache se revierte al snapshot previo (`done`)
**And** se muestra `Toast` con la clave i18n `task.status.error.invalid_transition` interpolando `currentStatus` y `requestedStatus`
**And** se emiten `task.status.quick_action.failed` y `task.status.quick_action.rolled_back` con `error_code='INVALID_TRANSITION'`, `http_status=409`.

### EC-02: `409 EVENT_NOT_MUTABLE` — fila se actualiza a read-only

**Given** durante la sesión, otra pestaña/admin marcó el evento como `completed`
**When** el cliente intenta una transición y recibe `409 EVENT_NOT_MUTABLE`
**Then** la cache se revierte
**And** se muestra `Toast` con `task.status.error.event_not_mutable`
**And** la fila entrante refleja el modo read-only en el siguiente re-fetch (US-027 ya lo cubre)
**And** se emiten `failed` y `rolled_back` con `error_code='EVENT_NOT_MUTABLE'`.

### EC-03: `404 NOT_FOUND` — tarea soft-deleted o ajena

**Given** la tarea fue soft-deleted por otra sesión (US-029) o no pertenece al actor
**When** se intenta la transición y el backend responde `404`
**Then** la cache se revierte
**And** se muestra `Toast` con `task.status.error.not_found_or_forbidden` (mensaje genérico, sin revelar la causa)
**And** se emiten `failed` y `rolled_back` con `error_code='NOT_FOUND'`.

### EC-04: `403 FORBIDDEN` — usuario vendor/admin con sesión cruzada

**Given** la sesión cambió de rol o el actor perdió ownership
**When** se intenta la transición y el backend responde `403`
**Then** la cache se revierte
**And** se muestra el mismo mensaje genérico de no-revelación
**And** se emiten `failed` y `rolled_back` con `error_code='FORBIDDEN'`.

### EC-05: `5xx` o error de red — retry manual

**Given** la red falla o el backend responde `5xx`
**When** el cliente captura el error
**Then** la cache se revierte
**And** se muestra `Toast` con `task.status.error.transient` y una acción "Reintentar"
**And** click en "Reintentar" repite la mutación (sin generar un nuevo `requested` si el último `from_status`/`to_status` es idéntico — opcional UX, registrar como `retry: true`).

### EC-06: Doble click rápido en el checkbox

**Given** el usuario hace doble click rápido sobre el checkbox
**When** el segundo click ocurre con la mutación pendiente
**Then** el segundo click se ignora (el componente queda `disabled` mientras `mutation.isPending`)
**And** sólo se emite un par `requested|succeeded|failed`.

### EC-07: Evento bloqueado al cargar la página (lista trae `event.status='completed'`)

**Given** la lista de US-027 marca el evento como `completed`
**When** el componente `TaskStatusQuickToggle` renderiza
**Then** el toggle está `disabled` con `aria-disabled='true'` y tooltip "Evento bloqueado"
**And** ningún click dispara una mutación.

### EC-08: Tarea soft-deleted aparece transitoriamente

**Given** entre el render y el click, la tarea fue soft-deleted en otra pestaña
**When** se hace click y el backend responde `404`
**Then** se aplica EC-03 y, además, el siguiente re-fetch de la lista (US-027) elimina la fila.

---

## 🚫 Validation Rules (UX layer)

| ID    | Rule                                                                                                                                          | Message / Behavior                                                  |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| VR-01 | El checkbox/botón solo se renderiza si la transición está en la tabla "Transiciones rápidas habilitadas" para el `status` actual de la tarea. | Caso contrario: affordance no se muestra (usar `TaskStatusMenu` de US-029). |
| VR-02 | Mientras `mutation.isPending`, el componente está `disabled`.                                                                                  | UI no acciona; pointer-events: none.                                |
| VR-03 | Cuando `event.status ∈ {cancelled, completed}` (recibido en el listado), el componente está `disabled` con tooltip read-only.                  | UI no acciona.                                                       |
| VR-04 | El rollback debe restaurar exactamente el snapshot previo al optimistic update.                                                                | El test debe verificar `deep equal` del snapshot vs. post-rollback. |
| VR-05 | El payload enviado al backend nunca incluye campos distintos a `status`.                                                                       | Garantizado por el hook reusado de US-029.                           |
| VR-06 | Las claves i18n usadas existen en los 4 locales soportados.                                                                                    | Build-time check del archivo de locales.                             |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                                                                                          |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| SEC-01 | La autorización (ownership) y la state machine se enforce exclusivamente en backend (US-029). El cliente nunca decide la legitimidad.         |
| SEC-02 | No se loguea contenido literal de la tarea (`title`, `description`); la telemetría UX solo incluye IDs, status enums, códigos de error.       |
| SEC-03 | El `correlation_id` se propaga desde el header `X-Correlation-Id` cuando lo provee el backend; el cliente puede generar uno si la sesión lo permite. |
| SEC-04 | Errores `403`/`404` se presentan con mensaje genérico (no-revelación) y nunca leakean estructura interna del backend.                          |
| SEC-05 | El cliente nunca intenta retry automático silencioso ante `403`/`404`; solo ante `5xx` con confirmación del usuario.                            |

### Negative Authorization Scenarios

* Vendor o admin con sesión que llega a la vista del Organizer (improbable; el routing lo bloquea) → backend `403`; UX muestra mensaje genérico y revierte cache.

---

## 🤖 AI Behavior

This story does not invoke AI directly.

### AI Involvement

* AI Feature: None.
* Provider Layer: Not applicable.
* Human Validation Required: Not applicable.
* Persist `AIRecommendation`: No.
* Fallback Required: Not applicable.

### Human-in-the-loop Rules

* Not applicable. El cambio de estado lo dispara el usuario explícitamente.

---

## 🎨 UX / UI Notes

| Area                | Notes                                                                                |
| ------------------- | ------------------------------------------------------------------------------------ |
| Screen / Route      | `/[locale]/organizer/events/:eventId/tasks` (fila de `TaskListItem`)                |
| Main UI Pattern     | Checkbox principal + botón "Saltar" en cada fila; ambos integrados en el row layout |
| Primary Action      | "Marcar como hecho" (checkbox)                                                       |
| Secondary Actions   | "Saltar", "Desmarcar hecho", "Reanudar" (según `status` actual)                       |
| Empty State         | No aplica (el empty state del listado lo cubre US-027)                                |
| Loading State       | `mutation.isPending`: checkbox/botón `disabled` + spinner inline                     |
| Error State         | `Toast` con clave i18n + botón "Reintentar" (sólo en `5xx`)                          |
| Success State       | Animación de check (≤ 200 ms) + `aria-live='polite'` anunciando el nuevo estado     |
| Accessibility Notes | `aria-checked` para checkbox, `aria-pressed` para botón secundario, foco visible, navegación por teclado (`Space`/`Enter`), `aria-disabled` cuando bloqueado, `aria-live` para el cambio |
| Responsive Notes    | Mobile-first; toggle táctil ≥ 44 × 44 px (WCAG)                                       |
| i18n Notes          | 4 locales (`es-MX`, `es-AR`, `en-US`, `pt-BR`). Claves bajo `tasks.status.quick_action.*` y `tasks.status.error.*`. |
| Currency Notes      | No aplica.                                                                            |

---

## 🛠 Technical Notes

### Frontend

* Route / Page: `/[locale]/organizer/events/:eventId/tasks` (fila de `TaskListItem`).
* Components: `TaskStatusQuickToggle` (nuevo), embebido en `TaskListItem` de US-027.
* State Management: TanStack `useUpdateEventTaskStatus` (hook reusado de US-029) con `onMutate`/`onError`/`onSuccess`/`onSettled` para snapshot + rollback + invalidación.
* Forms: No aplica (no es un form).
* API Client: **Reusa** el cliente y endpoint definidos por US-029. No expone nuevo client.
* Telemetry: `useTelemetryClient().track('task.status.quick_action.requested|succeeded|failed|rolled_back', { ... })` (cliente de telemetría ya provisto por PB-P0-014).
* i18n: Catálogos en `apps/web/locales/{es-MX,es-AR,en-US,pt-BR}/tasks.json` con nuevas claves `quick_action.*` y `error.*`.

### Backend

* **No aplica.** Esta historia no introduce código de backend. Reusa íntegramente lo entregado por US-029.

### Database

* **No aplica.** Sin tablas, columnas, índices ni migraciones.

### API

| Method | Endpoint                                                    | Purpose                                            |
| ------ | ----------------------------------------------------------- | -------------------------------------------------- |
| PATCH  | `/api/v1/events/:eventId/tasks/:taskId/status` (reusado)    | Transición de estado (handled by US-029)            |

### Observability / Audit

* Correlation ID Required: Yes (propagado, no generado por esta historia).
* Log Event Required: Yes (4 eventos de UX listados en PO/BA Decisions Applied §5).
* AdminAction Required: No.
* `AIRecommendation` Required: No.

---

## 🧪 Test Scenarios

### Functional Tests (Frontend)

| ID    | Scenario                                                                                | Type        |
| ----- | --------------------------------------------------------------------------------------- | ----------- |
| TS-01 | AC-01 happy path con MSW respondiendo `200 OK` y `TaskListItemDto` actualizado          | Component   |
| TS-02 | AC-02 happy path "Saltar" desde `in_progress`                                            | Component   |
| TS-03 | AC-03 desmarcar `done → in_progress`                                                     | Component   |
| TS-04 | AC-04 reanudar desde `skipped`                                                           | Component   |
| TS-05 | AC-05 idempotent same-state cache equal                                                   | Component   |
| TS-06 | Optimistic + rollback verifica snapshot deep equal                                        | Component   |
| TS-07 | Doble click rápido (EC-06) emite solo una mutación                                        | Component   |
| TS-08 | E2E desde la lista de US-027 hasta backend real (sin mock) marcando como hecho           | E2E         |

### Negative Tests (Frontend con MSW)

| ID    | Scenario                                                       | Expected Result                                    |
| ----- | -------------------------------------------------------------- | -------------------------------------------------- |
| NT-01 | Backend responde `409 INVALID_TRANSITION` (EC-01)              | Rollback + Toast `invalid_transition` + telemetría |
| NT-02 | Backend responde `409 EVENT_NOT_MUTABLE` (EC-02)               | Rollback + Toast `event_not_mutable` + telemetría  |
| NT-03 | Backend responde `404 NOT_FOUND` (EC-03)                       | Rollback + Toast genérico no-revelación            |
| NT-04 | Backend responde `403 FORBIDDEN` (EC-04)                       | Rollback + Toast genérico no-revelación            |
| NT-05 | Backend responde `5xx` (EC-05)                                  | Rollback + Toast transient + botón "Reintentar"    |
| NT-06 | `event.status='completed'` recibido en el listado (EC-07)      | Toggle `disabled` + `aria-disabled='true'`         |

### Authorization Tests

| ID         | Scenario                                              | Expected Result                       |
| ---------- | ----------------------------------------------------- | ------------------------------------- |
| AUTH-TS-01 | Organizer dueño                                       | Toggle activo, mutación exitosa        |
| AUTH-TS-02 | Vendor con sesión cruzada (improbable)                | Backend `403`; rollback + Toast        |
| AUTH-TS-03 | Sesión expirada                                       | Backend `401`; rollback + redirect a login |

### Accessibility Tests

| ID         | Scenario                                                              | Expected Result                                  |
| ---------- | --------------------------------------------------------------------- | ------------------------------------------------ |
| A11Y-01    | Navegación con teclado (`Tab`, `Space`, `Enter`)                       | Toggle activable; foco visible                    |
| A11Y-02    | Lector de pantalla (axe-core + manual NVDA o VoiceOver smoke)         | Anuncia `aria-checked` + cambio de estado vía `aria-live` |
| A11Y-03    | Estado `disabled` cuando `event.status='completed'`                   | `aria-disabled='true'` + tooltip leído            |
| A11Y-04    | Contraste de color del check y los iconos                            | WCAG AA ≥ 4.5:1                                  |

### Concurrency / UX Tests

| ID      | Scenario                                                                                 | Expected Result                                   |
| ------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------- |
| CONC-01 | Dos clicks rápidos antes de que la mutación resuelva                                     | Segundo click ignorado; sólo un par requested/* |
| CONC-02 | Click mientras la query `['tasks', eventId]` está re-fetcheando                          | Optimistic update aplicado; al `onSettled` la query se invalida y vuelve consistente |

---

## 📊 Business Impact

| Field               | Value                                                                              |
| ------------------- | ---------------------------------------------------------------------------------- |
| KPI Affected        | Velocidad percibida de actualización del checklist; satisfacción y engagement       |
| Expected Impact     | Reducir el tiempo de marcado de tareas; sensación de respuesta inmediata           |
| Success Criteria    | Percibido < 100 ms entre click y render del nuevo estado (optimistic); ≥ 99 % de éxito sin rollback en redes estables |
| Academic Demo Value | Demo visible de optimistic UI sobre el backend canónico; muestra la separación clara entre capa UX y backend |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks

* Componente `TaskStatusQuickToggle` con checkbox + botón "Saltar"/"Reanudar" según `status`.
* Wrapper de `useUpdateEventTaskStatus` con `onMutate`/`onError`/`onSuccess`/`onSettled` (snapshot + rollback + invalidación).
* Mapeo de códigos de error backend → claves i18n.
* Telemetría de 4 eventos UX.
* Catálogos i18n para 4 locales.
* Animación de check y `aria-live`.
* Estado `disabled` con tooltip cuando `event.status` bloquea.

### Potential Backend Tasks

* **No aplica.** Reusa US-029 íntegramente.

### Potential Database Tasks

* **No aplica.**

### Potential AI / PromptOps Tasks

* **No aplica.**

### Potential QA Tasks

* TS-01..08 + NT-01..06 + AUTH-TS-01..03 + A11Y-01..04 + CONC-01..02.
* Snapshot/rollback assertion robusta.
* Tests cross-locale para mensajes de error.

### Potential DevOps / Config Tasks

* **No aplica.**

---

## ✅ Definition of Ready

* [x] Rol claro (Organizer dueño del evento).
* [x] Goal/valor claros (optimistic + rollback en quick action).
* [x] FRD/UC/BR enlazados (FR-TASK-004/011, UC-TASK-004, BR-TASK-004/010).
* [x] Permisos identificados (delegados a US-029).
* [x] Entidades listadas (`EventTask`, sólo lectura en cliente).
* [x] AC en GWT (5 AC + 8 EC).
* [x] Edge cases documentados (8).
* [x] Validación clara (VR-01..06, UX layer).
* [x] Out of Scope explícito (sin backend, sin menú completo, sin bulk).
* [x] Dependencias conocidas (US-029, US-027, PB-P0-001/014).
* [x] UX states identificados.
* [x] API definida (reusada de US-029).
* [x] Tests definidos (TS, NT, AUTH-TS, A11Y, CONC).
* [x] PO/BA validó.

---

## 🏁 Definition of Done

* [ ] Componente `TaskStatusQuickToggle` operativo, integrado en `TaskListItem` de US-027.
* [ ] Optimistic update con rollback verificable y test cubierto.
* [ ] 4 eventos de telemetría UX emitidos con payload correcto.
* [ ] Mensajería i18n completa en `es-MX`, `es-AR`, `en-US`, `pt-BR`.
* [ ] Accesibilidad WCAG AA validada (axe-core + smoke manual).
* [ ] No se modifican endpoints, controllers, schemas, repositorios ni migraciones.
* [ ] Tests verdes en CI.
* [ ] PO valida la demo en lista IA + manual con flujo completo (US-027 → US-030 → backend US-029).

---

## 📝 Notes

* La sutil diferencia con `TaskStatusMenu` (US-029): aquél es un dropdown que muestra todas las transiciones permitidas y aplica una; éste es un toggle de un solo toque para el subconjunto frecuente. Co-existen sin solapamiento en la fila.
* La idempotencia same-state del backend (`200 OK no_op` en US-029) es transparente al usuario; la cache no cambia y el toast no aparece (solo si la mutación retorna error real).
* El cliente de telemetría asume que existe un endpoint `/api/v1/telemetry/events` o equivalente entregado por PB-P0-014; si no, los eventos quedan como `console.debug` con flag `EVENTFLOW_TELEMETRY_DEBUG=true` en MVP.
* Si en el futuro la lista cambia de TanStack a otra solución, este componente se actualiza pero la decisión de optimistic update + rollback queda formalizada acá.
