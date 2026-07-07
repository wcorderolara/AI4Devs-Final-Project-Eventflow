# 🧾 User Story: Recibir notificación in-app de T-7

## 🆔 Metadata

| Field              | Value                                                                            |
| ------------------ | -------------------------------------------------------------------------------- |
| ID                 | US-034                                                                           |
| Epic               | EPIC-NOT-001 / EPIC-TASK-001                                                     |
| Backlog Item       | PB-P2-004 — Notificación T-7 (tareas) (P2)                                       |
| Feature            | Notificación T-7                                                                 |
| Module / Domain    | Notifications / Tasks                                                            |
| User Role          | Organizer (destinatario) / System (emisor)                                       |
| Priority           | Should Have                                                                      |
| Status             | Approved with Minor Notes                                                        |
| Owner              | Product Owner / Business Analyst                                                 |
| Approved By        | PO/BA Review                                                                     |
| Approval Date      | 2026-06-29                                                                       |
| Ready for Development Tasks | Yes (notas no bloqueantes; ver §Notes Documentation Alignment Required) |
| Sprint / Milestone | MVP                                                                              |
| Created Date       | 2026-06-09                                                                       |
| Last Updated       | 2026-06-29                                                                       |

---

## 🎯 User Story

**As an** organizador
**I want** que el sistema emita automáticamente notificaciones in-app y email simulado por cada tarea con vencimiento a 7 días calendario
**So that** no pierda de vista las tareas próximas a vencer sin tener que revisarlas manualmente

---

## 🧠 Business Context

### Context Summary

Un job programado (`EmitT7NotificationsJob`) corre diariamente a las 08:00 hora local de Guatemala y, por cada `EventTask` activa de un evento `active` cuya `due_date` coincide exactamente con el día calendario T-7 (hoy + 7 días en `America/Guatemala`), crea un par de registros `Notification` (canal `in_app` y `email_simulated`) dirigidos al `event.owner_id` y registra una entrada de log estructurado simulando el envío de email. El surface in-app (campanita, lista, badge, marcar como leída) está cubierto por US-071 y US-072.

### Related Domain Concepts

* `Notification` (`type='task_due_soon'`, canales `in_app` y `email_simulated`).
* `EventTask` con `due_date` calendario.
* Job programado vía `node-cron` (single-process MVP).
* Log estructurado `[EMAIL] to=… subject=…` (NFR-OBS-004).

### Assumptions

* MVP corre en single backend process; `node-cron` es suficiente sin Redis/BullMQ/Kafka (`docs/14 §23.1`).
* No existe `Event.timezone` ni `Location.timezone` en MVP; mercado piloto es `America/Guatemala` (`docs/1 §Mercado piloto`).
* El email se simula como log estructurado (`SimulatedEmailAdapter`) sin tabla `notification_delivery_log` (`docs/18 §18.1`).
* `EventTask.due_date` es `date` (calendario), por lo que la comparación T-7 es aritmética de fechas sin ambigüedad horaria (`docs/6 §EventTask`).

### Dependencies

* PB-P1-018 — CRUD de tareas (US-018..US-030): provee `EventTask` con `due_date` y estados.
* PB-P2-009 — Logger estructurado JSON (US-113).
* US-071 — Surface organizer de notificaciones T-7 (consume los `Notification` creados por este job).
* US-072 — Marcar notificación como leída (`POST /api/v1/notifications/:id/read`).

### PO/BA Decisions Applied

Decisiones formalizadas en `management/user-stories/decision-resolutions/US-034-decision-resolution.md`:

| ID | Decisión                                                                                                                                                                                            |
| -- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1 | `EmitT7NotificationsJob` corre como cron único `0 8 * * *` en `TZ=America/Guatemala`. No se introducen campos `timezone` en `Event` o `Location` en MVP.                                            |
| D2 | Idempotencia por chequeo SELECT antes de INSERT dentro de transacción por chunk (`Tech Recommendation — Requires Tech Lead Validation` en la Technical Specification). Sin unique constraint nuevo. |
| D3 | El job procesa exclusivamente `event.status='active'` y `event_task.status ∈ {pending, in_progress}`. Excluye `draft`, `completed`, `cancelled`.                                                    |
| D4 | T-7 = `event_task.due_date::date == (current_date_in_America_Guatemala + INTERVAL '7 days')::date`. Igualdad exacta, sin tolerancia, día calendario.                                                |
| D5 | Por cada tarea: 1 `Notification(channel='in_app')` + 1 `Notification(channel='email_simulated')` + 1 log `[EMAIL] to=… subject=…`. Al finalizar el run: log resumen `job.t7Notifications.affected=N`. |
| D6 | `Notification.language_code` resuelto desde `User.language_preference`, con fallback a `event.language_code` si la preferencia está vacía.                                                          |

---

## 🔗 Traceability

| Source                 | Reference                                                                                                                  |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Backlog Item           | PB-P2-004                                                                                                                  |
| FRD Requirement(s)     | FR-TASK-010, FR-NOTIF-001, FR-NOTIF-003                                                                                    |
| Use Case(s)            | UC-NOTIF-001 (transversal — job sin UC dedicado)                                                                            |
| Business Rule(s)       | BR-TASK-008, BR-NOTIF-001, BR-NOTIF-002, BR-NOTIF-003, BR-NOTIF-005, BR-NOTIF-007                                          |
| Permission Rule(s)     | Sistema → `event.owner_id`                                                                                                  |
| Data Entity / Entities | EventTask, Event, Notification, User                                                                                       |
| API Endpoint(s)        | No aplica (job programado). Surface en US-071 (`GET /api/v1/notifications`) y US-072 (`POST /api/v1/notifications/:id/read`) |
| NFR Reference(s)       | NFR-OBS-004 (email log), NFR-OBS-005 (cambios críticos en logs)                                                             |
| Related ADR(s)         | — (Future: ADR sólo si se promueve multi-timezone)                                                                          |
| Related Document(s)    | /docs/4 §BR-NOTIF-001/002/003/005/007, §BR-TASK-008; /docs/6 §Notification, §EventTask, §Event; /docs/8 §UC-NOTIF-001; /docs/9 §FR-TASK-010 / §FR-NOTIF-001 / §FR-NOTIF-003; /docs/10 §NFR-OBS-004 / §NFR-OBS-005; /docs/14 §23.1, §23.2; /docs/18 §18.1 |

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: In Scope
* MVP Relevance: Should Have

### Explicitly Out of Scope

* Push, SMS, WhatsApp (BR-NOTIF-006).
* Surface in-app (campanita, lista, badge, contador no leídas) — alcance de **US-071**.
* Marcar notificación como leída — alcance de **US-072**.
* Tabla `notification_delivery_log` — Future (`docs/18 §18.1`).
* Multi-timezone (cron por timezone, campo `Event.timezone`) — Future (requiere ADR).

### Scope Notes

* Sólo job + persistencia de `Notification(in_app)` + `Notification(email_simulated)` + log estructurado.
* Sin componentes frontend dentro de US-034.

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Emisión correcta de notificaciones T-7

**Given** un evento `e` con `e.status='active'` y una tarea `t` con `t.event_id=e.id`, `t.status ∈ {pending, in_progress}` y `t.due_date::date == (current_date_in_America_Guatemala + INTERVAL '7 days')::date`
**When** `EmitT7NotificationsJob` corre a las 08:00 hora `America/Guatemala`
**Then** el sistema crea exactamente:

1. 1 registro `Notification(user_id=e.owner_id, type='task_due_soon', channel='in_app', payload={taskId:t.id, eventId:e.id, dueDate:t.due_date}, language_code=<resolved per D6>)`,
2. 1 registro `Notification(user_id=e.owner_id, type='task_due_soon', channel='email_simulated', payload=<mismo payload>, language_code=<mismo>)`,
3. 1 entrada de log estructurado `[EMAIL] to=<userId> subject="<localized>" body=<localized>` con `correlationId=job-emit-t7-<timestamp>` (NFR-OBS-004).

### AC-02: Idempotencia por re-ejecución

**Given** que el job ya emitió la notificación T-7 para la tarea `t` (registros `Notification` ya existen con `payload->>'task_id'=t.id`, `type='task_due_soon'`, `user_id=e.owner_id`)
**When** el job se re-ejecuta en la misma ventana T-7
**Then** no se crean registros `Notification` adicionales para `t` y no se emite una segunda entrada `[EMAIL]` para esa tarea.

### AC-03: Aislamiento por destinatario

**Given** una tarea `t` perteneciente al evento `e` con `e.owner_id=u1`
**When** el job emite la notificación T-7
**Then** el único `user_id` que recibe `Notification(type='task_due_soon')` es `u1`; ningún otro usuario (`u2`, admin, vendor) recibe esta notificación (BR-NOTIF-005).

### AC-04: Idioma del Notification

**Given** un destinatario `u1` con `User.language_preference='pt'`
**When** el job emite la notificación T-7 para una tarea de un evento `e` con `e.language_code='en'`
**Then** los registros `Notification` se persisten con `language_code='pt'` y el body del log `[EMAIL]` se localiza en `pt`. Si `u1.language_preference` está vacío, se aplica `e.language_code` como fallback.

### AC-05: Observabilidad del run

**Given** el job procesa N tareas que satisfacen la condición T-7
**When** el run termina
**Then** se emite un único log estructurado `job.t7Notifications.affected=N` con `correlationId=job-emit-t7-<timestamp>` (NFR-OBS-005). El log no contiene `email`, `displayName` ni título de la tarea.

---

## ⚠️ Edge Cases

### EC-01: Tarea en estado `done` o `skipped`

**Given** una tarea con `t.status ∈ {done, skipped}` aunque su `due_date` coincida con T-7
**When** el job evalúa
**Then** se omite (sin `Notification` ni log).

#### Handling

* Filtro SQL `WHERE event_task.status IN ('pending','in_progress')`.

### EC-02: Evento en estado `cancelled`

**Given** un evento con `e.status='cancelled'`
**When** el job evalúa cualquiera de sus tareas
**Then** se omite (sin `Notification` ni log).

#### Handling

* Filtro SQL `WHERE event.status='active'`.

### EC-03: Evento en estado `completed`

**Given** un evento con `e.status='completed'`
**When** el job evalúa cualquiera de sus tareas
**Then** se omite.

#### Handling

* Mismo filtro SQL.

### EC-04: Evento en estado `draft`

**Given** un evento con `e.status='draft'`
**When** el job evalúa cualquiera de sus tareas
**Then** se omite (el flujo de tareas vivas requiere `active`, BR-EVENT-006).

#### Handling

* Mismo filtro SQL.

### EC-05: Tarea con `due_date` en T-6 o T-8

**Given** una tarea con `t.due_date == today + 6 días` o `t.due_date == today + 8 días`
**When** el job evalúa
**Then** se omite (la condición exige igualdad exacta).

#### Handling

* Comparación SQL por igualdad estricta de `date`.

### EC-06: Re-ejecución del job en la misma ventana T-7

**Given** el job ya emitió las notificaciones del día
**When** el job vuelve a correr el mismo día (por reinicio del proceso o por overlap manual)
**Then** no se crean duplicados (idempotencia por SELECT antes de INSERT).

#### Handling

* Use case ejecuta `SELECT 1 FROM notifications WHERE user_id=? AND type='task_due_soon' AND payload->>'task_id'=? LIMIT 1` antes de cada INSERT, dentro de transacción por chunk.

### EC-07: Tarea sin `due_date`

**Given** una tarea con `t.due_date IS NULL`
**When** el job evalúa
**Then** se omite (no participa en la condición T-7).

#### Handling

* Filtro SQL `WHERE event_task.due_date IS NOT NULL`.

---

## 🚫 Validation Rules

| ID    | Rule                                                                                                                                                          | Message / Behavior                                                  |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| VR-01 | Una tarea participa del job si y sólo si `event.status='active' AND event_task.status IN ('pending','in_progress') AND event_task.due_date IS NOT NULL AND event_task.due_date = (CURRENT_DATE AT TIME ZONE 'America/Guatemala') + INTERVAL '7 days'` | Selección                                                            |
| VR-02 | `Notification.user_id` debe igualar `event.owner_id` para el evento que origina la tarea                                                                       | INSERT rechazado por validación interna si difiere (BR-NOTIF-005)     |
| VR-03 | El job no crea `Notification` si ya existe una `Notification(type='task_due_soon')` con `payload->>'task_id'` igual al ID de la tarea evaluada                | Skip silencioso (idempotencia, D2)                                   |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                                                                                                          |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SEC-01 | Job ejecutado por sistema (no requiere sesión de usuario). Las notificaciones se asignan exclusivamente al `event.owner_id`.                                  |
| SEC-02 | El log estructurado `[EMAIL]` y el log resumen `job.t7Notifications.affected=N` deben contener sólo `userId`, `taskId`, `eventId`, `dueDate`, `correlationId`. Quedan excluidos: `email`, `displayName`, título y descripción de la tarea, notas del evento. |
| SEC-03 | El payload de `Notification.payload` permitido es `{taskId, eventId, dueDate}`. No se incluyen otros campos sensibles ni datos de terceros.                    |
| SEC-04 | Aislamiento BR-NOTIF-005: el `Notification.user_id` resultante debe ser `event.owner_id` y no puede coincidir con ningún otro usuario.                          |

### Negative Authorization Scenarios

* No aplica desde el punto de vista del job (no expone endpoint público). Los endpoints de surface se cubren en US-071/US-072 y heredan los policies de notificaciones (`MarkNotificationAsReadUseCase` ya valida ownership por `user_id`).

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

* Not applicable for this story.

### AI Error / Fallback Behavior

* Not applicable for this story.

---

## 🎨 UX / UI Notes

| Area                | Notes                                                                                                |
| ------------------- | ---------------------------------------------------------------------------------------------------- |
| Screen / Route      | No aplica — el surface (campanita, lista, badge, contador no leídas) lo entrega **US-071**.            |
| Main UI Pattern     | No aplica — ver US-071.                                                                              |
| Primary Action      | No aplica — la acción "Marcar leída" pertenece a **US-072**.                                          |
| Secondary Actions   | No aplica — ver US-071/US-072.                                                                       |
| Empty State         | No aplica.                                                                                            |
| Loading State       | No aplica.                                                                                            |
| Error State         | No aplica.                                                                                            |
| Success State       | No aplica.                                                                                            |
| Accessibility Notes | No aplica directamente; los `Notification` quedan disponibles para ser leídos por el surface de US-071. |
| Responsive Notes    | No aplica.                                                                                            |
| i18n Notes          | El `language_code` del `Notification` se resuelve según D6 (`User.language_preference` con fallback a `event.language_code`). Locales soportados: `es-LATAM`, `es-ES`, `pt`, `en` (alineado con US-007). |
| Currency Notes      | No aplica.                                                                                            |

---

## 🛠 Technical Notes

### Frontend

* No aplica — US-034 no entrega componentes ni rutas frontend. Surface en US-071 (lista + badge) y US-072 (marcar como leída).

### Backend

* Use Case / Service:

  * `EmitT7NotificationsUseCase` (módulo `notifications`).
* Job:

  * `EmitT7NotificationsJob` registrado en `src/jobs/` (alineado con `docs/14 §23.2`).
* Scheduler:

  * `node-cron` con expresión `0 8 * * *` y `timezone: 'America/Guatemala'` (D1). Single-process MVP (`docs/14 §23.1`).
* Authorization Policy:

  * System (job sin sesión).
* Validation:

  * Filtros SQL: `event.status='active'`, `event_task.status IN ('pending','in_progress')`, `event_task.due_date IS NOT NULL`, `event_task.due_date = (CURRENT_DATE AT TIME ZONE 'America/Guatemala') + INTERVAL '7 days'`.
* Idempotencia (D2 — `Recommended Decision — Requires Tech Lead Validation`):

  * `SELECT 1 FROM notifications WHERE user_id=? AND type='task_due_soon' AND payload->>'task_id'=? LIMIT 1` antes de cada INSERT.
  * Operación dentro de transacción por chunk (`chunk_size` configurable, default 100, alineado con patrón documentado en `docs/14 §23.2`).
* Repositorios reutilizados:

  * `EventTaskRepository.findT7CandidatesForJob(now: Date)`.
  * `NotificationRepository.existsTaskDueSoonForTask(userId, taskId)`.
  * `NotificationRepository.create(Notification)`.
  * `SimulatedEmailAdapter.logEmail({to, subject, body, correlationId})`.
* Manejo de error:

  * Captura por chunk; log y continúa, alineado con `docs/14 §23.2`.

### Database

* Main Tables:

  * `notifications`, `event_tasks`, `events`, `users`.
* Constraints:

  * Sin migraciones nuevas. FKs existentes: `notifications.user_id → users.id`; `event_tasks.event_id → events.id`.
* Index Considerations:

  * Reuso de `idx_notifications_user_status_sent (user_id, status, sent_at DESC)` para lectura desde el surface.
  * Reuso de `idx_notifications_user_unread (user_id) WHERE status='unread'` para badge UI.
  * Para el SELECT de idempotencia se aprovecha `GIN/BTree` index existente sobre `notifications.user_id` + filtro `type` + extracción `payload->>'task_id'` (sin índice nuevo en MVP; si surge presión de performance, evaluar `idx_notifications_task_due_soon_payload` en Future).

### API

| Method | Endpoint                                       | Purpose                                                                              |
| ------ | ---------------------------------------------- | ------------------------------------------------------------------------------------ |
| —      | Job programado (no expone endpoint)            | Emitir `Notification` + log `[EMAIL]` por cada tarea T-7                              |
| GET    | `/api/v1/notifications`                        | Consumido por US-071 (no implementado en US-034)                                     |
| POST   | `/api/v1/notifications/:id/read`               | Consumido por US-072 (no implementado en US-034)                                     |

### Observability / Audit

* Correlation ID Required: Yes (`correlationId=job-emit-t7-<timestamp>` artificial, alineado con `docs/14 §23.2`).
* Log Event Required: Yes — por cada tarea: `[EMAIL] to=<userId> subject=<localized> body=<localized>` (NFR-OBS-004). Al finalizar el run: `job.t7Notifications.affected=N` (NFR-OBS-005).
* AdminAction Required: No.
* AIRecommendation Required: No.
* PII en logs: prohibida (SEC-02).

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                                                                                 | Type        |
| ----- | ------------------------------------------------------------------------------------------------------------------------ | ----------- |
| TS-01 | Job emite 1 in-app + 1 email simulado por cada tarea T-7 de un evento `active`. Clock injectable (timezone Guatemala).      | Integration |
| TS-03 | Idempotencia: re-ejecutar el job en el mismo día no produce duplicados en `notifications` ni segunda entrada `[EMAIL]`.   | Integration |
| TS-04 | Timezone: evento con `event_date` próximo y `due_date` que es T-7 en `America/Guatemala` (verifica conversión de zona).    | Integration |
| TS-05 | Exclusión por estado de evento: eventos `draft`, `completed`, `cancelled` no producen notificaciones aunque haya tareas T-7. | Integration |
| TS-06 | Observabilidad: el run emite log `job.t7Notifications.affected=N`, y cada `[EMAIL]` tiene los campos permitidos (sin PII). Aserción de `language_code` resuelto correctamente. | Integration |

### Negative Tests

| ID    | Scenario                                                                                                                     | Expected Result                |
| ----- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| NT-01 | Tarea en `done` o `skipped` con `due_date == today+7`.                                                                       | Ignorada (sin Notification).    |
| NT-02 | Tarea con `due_date == today+6` o `due_date == today+8`.                                                                      | Ignorada (igualdad exacta).     |
| NT-03 | Evento `cancelled` con tareas T-7.                                                                                            | Ignoradas.                      |
| NT-04 | Tarea sin `due_date`.                                                                                                          | Ignorada.                       |
| NT-05 | Segundo run del job en el mismo día.                                                                                          | 0 nuevos `Notification` creados.|

### AI Tests

Not applicable for this story.

### Authorization Tests

| ID         | Scenario                                                                       | Expected Result                                                |
| ---------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| AUTH-TS-01 | Sistema (job) crea `Notification` para `event.owner_id`.                       | Success.                                                       |
| AUTH-TS-02 | Aislamiento (BR-NOTIF-005): ningún otro `user_id` recibe la `Notification`.    | El registro creado tiene exclusivamente `user_id = event.owner_id`. |

### Accessibility Tests

* No aplica directamente al job. La accesibilidad de la lista de notificaciones (`aria-live polite`, etc.) es responsabilidad de US-071.

---

## 📊 Business Impact

| Field               | Value                                                                              |
| ------------------- | ---------------------------------------------------------------------------------- |
| KPI Affected        | Engagement, retención semanal del organizador                                       |
| Expected Impact     | Recordatorio oportuno sin acción manual; reducción de tareas olvidadas              |
| Success Criteria    | 100% de tareas que satisfacen VR-01 se notifican en el run del día T-7 (verificable vía `affected=N` y aserciones de integración). |
| Academic Demo Value | Demuestra automatización útil y patrón `node-cron` + simulación de email             |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks

* No aplica — surface en US-071/US-072.

### Potential Backend Tasks

* Implementar `EmitT7NotificationsUseCase` con filtros SQL y chequeo de idempotencia.
* Registrar `EmitT7NotificationsJob` en `src/jobs/` con `node-cron` (`0 8 * * *`, `TZ=America/Guatemala`).
* Implementar `SimulatedEmailAdapter` (si no existe) y resolución de localización para body.
* Resolver `Notification.language_code` desde `User.language_preference` con fallback.

### Potential Database Tasks

* Sin migraciones nuevas. Validar que `idx_notifications_user_status_sent` cubre las queries del use case.
* Si el Tech Lead promueve la opción (a) de D2 (índice único parcial), agregar migración correspondiente en Technical Specification (no esperado en MVP).

### Potential AI / PromptOps Tasks

* Not applicable for this story.

### Potential QA Tasks

* Tests con clock injectable (sustituir `Date.now()` por reloj inyectable controlado por el harness de tests).
* Asegurar cobertura de TS-01..TS-06 y NT-01..NT-05.
* Aserciones de no-PII sobre el log estructurado.

### Potential DevOps / Config Tasks

* Confirmar que `node-cron` se inicializa con `TZ=America/Guatemala` en `src/server.ts` (alineado con `docs/14 §24.1`).
* Documentar el cron en el runbook de demo (alineado con US-144).
* Documentar `EmitT7NotificationsJob` en `docs/14 §23.2` (Documentation Alignment Required, no bloquea US-034).

---

## ✅ Definition of Ready

* [x] Rol claro (`Organizer` destinatario, `System` emisor).
* [x] Goal/valor claros.
* [x] FRD/UC/BR enlazados (`FR-TASK-010`, `FR-NOTIF-001`, `FR-NOTIF-003`, `UC-NOTIF-001`, `BR-NOTIF-001/002/003/005/007`, `BR-TASK-008`).
* [x] Permisos identificados (Sistema → `event.owner_id`).
* [x] Entidades listadas (`EventTask`, `Event`, `Notification`, `User`).
* [x] AC en GWT.
* [x] Edge cases documentados.
* [x] Validación clara.
* [x] Out of Scope explícito (handoff a US-071/US-072).
* [x] Dependencias conocidas (`PB-P1-018`, `PB-P2-009`, `US-071`, `US-072`).
* [x] UX states identificados (No aplica directamente; surface en US-071).
* [x] API definida (No expone endpoint; surface en US-071/US-072).
* [x] Tests definidos (TS-01, TS-03..TS-06, NT-01..NT-05, AUTH-TS-01..02).
* [x] PO/BA validó (Q1–Q5 cerradas en `decision-resolutions/US-034-decision-resolution.md`).

---

## 🏁 Definition of Done

* [ ] `EmitT7NotificationsUseCase` y `EmitT7NotificationsJob` implementados y registrados en `src/jobs/`.
* [ ] Cron `0 8 * * *` con `TZ=America/Guatemala` activo en single-process MVP.
* [ ] `Notification` (in_app + email_simulated) creados por cada tarea T-7 según AC-01.
* [ ] Log `[EMAIL]` por tarea sin PII (SEC-02) y log resumen `job.t7Notifications.affected=N` (NFR-OBS-005).
* [ ] Idempotencia comprobada (un solo par de `Notification` por `(user_id, task_id)`).
* [ ] `language_code` resuelto y persistido según D6.
* [ ] Aislamiento BR-NOTIF-005 verificado.
* [ ] Tests TS-01..TS-06 y NT-01..NT-05 verdes con clock injectable.
* [ ] CI quality gates pasan (lint, types, tests).
* [ ] PO valida en demo: tarea seed con `due_date=event_date - 7 días` produce notificación visible vía surface de US-071.

---

## 📝 Notes

* La decisión D1 (cron único `America/Guatemala`) es totalmente reversible: si en Future se incorporan eventos fuera de la zona piloto, se promueve a multi-timezone vía ADR con introducción de `Event.timezone` o `Location.timezone`.
* Riesgo aceptado en MVP: si el proceso backend está caído el día T-7 exacto al horario del cron, las notificaciones de ese día se pierden (no hay retry diferido en MVP). Es consistente con la naturaleza best-effort de notificaciones in-app + log simulado y con la decisión single-process de `docs/14 §23.1`.
* Handoff explícito:

  * US-071 consume los `Notification(channel='in_app', type='task_due_soon')` creados por este job.
  * US-072 marca como leído.
* Documentation Alignment Required (no bloqueante; tracked en `decision-resolutions/US-034-decision-resolution.md §5`):

  * Actualizar `Traceability` de PB-P2-004 a `FR-TASK-010, FR-NOTIF-001, FR-NOTIF-003`.
  * Agregar `EmitT7NotificationsJob` a `docs/14 §23.2`.
  * Nota a `docs/4 §BR-NOTIF-007` clarificando el caso "notificación al propio organizador".
  * Corrección menor de cross-reference en `docs/10 §NFR-OBS-004` (`FR-NOTIF-002` → `FR-NOTIF-003`).
