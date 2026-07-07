# PO/BA Decision Resolution — US-034

## Source User Story File
management/user-stories/US-034-inapp-notification-t-minus-7.md

## Source Refinement Review File
management/user-stories/refinement-reviews/US-034-refinement-review.md

## Decision Date
2026-06-29

## 1. Resumen Ejecutivo

| Campo                                        | Valor                                                                                                                                                  |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| User Story ID                                | US-034                                                                                                                                                 |
| User Story file path                         | `management/user-stories/US-034-inapp-notification-t-minus-7.md`                                                                                       |
| Refinement review artifact path              | `management/user-stories/refinement-reviews/US-034-refinement-review.md`                                                                               |
| Existing decision resolution found           | No                                                                                                                                                     |
| Backlog Item                                 | PB-P2-004 — Notificación T-7 (tareas) (P2) · `Job EmitT7NotificationsJob + surface in-app`                                                              |
| Epic                                         | EPIC-NOT-001 / EPIC-TASK-001                                                                                                                           |
| Estado antes de decisiones                   | Needs Refinement                                                                                                                                       |
| Cantidad de preguntas revisadas              | 5 (Q1–Q5) + 1 documentation alignment (BR-NOTIF-007)                                                                                                  |
| Decisiones PO/BA tomadas                     | 5 (D1 timezone+schedule, D2 idempotencia [Tech Recommendation], D3 estados de evento, D4 definición operativa T-7, D5 granularidad email simulado)     |
| Decisiones técnicas recomendadas             | 1 (D2 — requiere validación Tech Lead durante la fase de Technical Specification)                                                                       |
| ¿Desbloquea aprobación?                      | Sí                                                                                                                                                     |
| User Story file updated                      | Yes                                                                                                                                                    |
| Decision Resolution artifact created/updated | Yes                                                                                                                                                    |
| Decision Resolution path                     | `management/user-stories/decision-resolutions/US-034-decision-resolution.md`                                                                           |
| Próximo paso recomendado                     | Run `eventflow-user-story-refinement` para revalidación, luego `eventflow-user-story-approval`.                                                        |

---

## 2. Decisiones Respondidas

## Decisión 1 — Mecánica del scheduler y timezone (Q1)

### Pregunta original

> ¿De dónde se obtiene la "hora local del evento" para disparar el job a las 08:00? ¿Cron único o cron por timezone?

### Respuesta PO/BA

En MVP no existe `Event.timezone` ni `Location.timezone` documentados en `docs/6 §Event / §Location` ni en `docs/18 §18.1`. El Backlog Prioritized §4.2 declara explícitamente "EmitT7NotificationsJob | **08:00 hora local del evento** | US-034 | Fallback `America/Guatemala`". El `docs/3 §MVP Scope Definition` y el `docs/1 §Mercado piloto` formalizan a Guatemala como mercado piloto único de MVP. Por lo tanto, en MVP la "hora local del evento" coincide con el fallback documentado, y la implementación canónica es un único `node-cron` configurado en `TZ=America/Guatemala`.

### Decisión formal

```text
EmitT7NotificationsJob corre como un único cron (`node-cron`) diario con expresión `0 8 * * *` en zona `America/Guatemala` (mercado piloto MVP). No se introducen campos `timezone` en Event o Location en MVP. Cuando MVP se extienda a otros mercados (Future), se evaluará vía ADR si conviene agregar `Event.timezone` o `Location.timezone` y diferenciar el schedule por timezone.
```

### Rationale

* PB §4.2 ya formaliza schedule + fallback.
* `docs/14 §23.1` recomienda `node-cron` y declara explícitamente sin Redis/BullMQ/Kafka en MVP.
* `docs/14 §23.2` define un único proceso backend que aloja todos los jobs MVP; añadir varios cron por timezone violaría MVP-first.
* No introducir `timezone` evita una migración Prisma y elimina la pregunta abierta sobre fuente (Event vs Location).
* La decisión es totalmente reversible: si en v1.1 se incorporan eventos fuera de `America/Guatemala`, basta con agregar el campo y reemplazar el cron único por uno por timezone vía ADR.

### Impacto en la User Story

| Sección                 | Cambio requerido                                                                                                                                                                                                                                                                            |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PO/BA Decisions Applied | Agregar entrada D1 con la decisión.                                                                                                                                                                                                                                                         |
| Acceptance Criteria     | Reescribir AC-01 con schedule `0 8 * * *` en `America/Guatemala`.                                                                                                                                                                                                                           |
| Technical Notes         | Backend: declarar `EmitT7NotificationsJob` con cron `0 8 * * *` en `America/Guatemala`; agregar nota "MVP single-process". Database: no requiere migración.                                                                                                                                |
| Notes                   | Reemplazar "Confirmar horario del job (sugerido 08:00 hora local del evento o UTC)" por la decisión formalizada.                                                                                                                                                                            |

### ¿Bloqueaba aprobación?

Sí.

### Validación adicional requerida

Requiere ADR si en Future se promueve a multi-timezone. Para MVP, no requiere validación adicional.

---

## Decisión 2 — Mecanismo de idempotencia (Q2)

### Pregunta original

> ¿Cómo se garantiza la idempotencia? Opciones: (a) índice único parcial, (b) chequeo SELECT/INSERT en transacción, (c) columna `task_id` añadida a `notifications`.

### Respuesta PO/BA

`docs/18 §18.1` declara explícitamente que `notifications` no modela `notification_delivery_log` y que la trazabilidad mínima vive en `notifications` + logs estructurados. Cambiar el schema (opciones a y c) introduce migración y Documentation Alignment Required. `docs/14 §23.1` indica que MVP corre `node-cron` en un único proceso backend (sin orquestación distribuida ni Redis), lo que descarta el riesgo de race conditions entre múltiples instancias del scheduler. Por lo tanto, la opción (b) — chequeo SELECT/INSERT dentro de transacción por chunk — es funcionalmente suficiente para el MVP y se alinea con los patrones idempotentes ya documentados en `docs/14 §23.2` para `AutoCompletePastEventsJob` y `ExpireQuotesJob` (filtros SQL reentrantes).

### Decisión formal

```text
La idempotencia de EmitT7NotificationsJob se garantiza mediante chequeo SELECT antes de INSERT dentro de una transacción por chunk, filtrando por `(user_id, type='task_due_soon', payload->>'task_id'=t.id)`. No se agrega unique constraint a `notifications` ni se modela `notification_delivery_log` en MVP. Si en Future se requiere ejecución multi-proceso del scheduler, se agregará índice único parcial vía ADR + Documentation Alignment con docs/18 §18.1.
```

### Rationale

* `docs/18 §18.1` rechaza explícitamente `notification_delivery_log` en MVP; respetar esa decisión es preservar coherencia documental.
* `docs/14 §23.1` formaliza single-process MVP, lo que vuelve seguro el chequeo SELECT/INSERT en transacción.
* Patrón ya validado por `AutoCompletePastEventsJob` (`docs/14 §23.2`): "Recorre solo `active` con `event_date + 2d ≤ now`; reentrante seguro" — mismo enfoque.
* Evita migración Prisma adicional, alineado con MVP-first.

### Impacto en la User Story

| Sección                 | Cambio requerido                                                                                                                                                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PO/BA Decisions Applied | Agregar entrada D2 con la decisión y el marcador `Tech Recommendation`.                                                                                                                                                  |
| Acceptance Criteria     | Agregar AC-02 (idempotencia con re-ejecución sin duplicados).                                                                                                                                                            |
| Edge Cases              | Agregar EC para "re-ejecución del job en la misma ventana T-7".                                                                                                                                                          |
| Technical Notes         | Backend: declarar "idempotencia por chequeo SELECT antes de INSERT dentro de transacción"; Database: confirmar reuso de `idx_notifications_user_status_sent`; no requiere migración nueva.                              |
| Notes                   | Mencionar que ADR a Future cubre el caso multi-proceso.                                                                                                                                                                   |

### ¿Bloqueaba aprobación?

Sí.

### Validación adicional requerida

Requiere validación Tech Lead durante la generación de la Technical Specification (`Recommended Decision — Requires Tech Lead Validation`).

---

## Decisión 3 — Tratamiento de tareas en eventos `cancelled` y `completed` (Q3)

### Pregunta original

> ¿Se notifica T-7 para tareas cuyo evento esté en estado `cancelled` o `completed`?

### Respuesta PO/BA

`FR-TASK-011` (`docs/9`) pone las tareas de eventos `cancelled`/`completed` en lectura: se prohíben cambios de estado. `BR-EVENT-006` declara que solo eventos `active` cotizan, por extensión solo `active` opera el flujo de tareas vivas. `BR-EVENT-013` declara que eventos pasan a `completed` automáticamente 2 días después de `event_date`, lo cual ya volvió el T-7 conceptualmente obsoleto para esos eventos (la fecha del evento ya pasó). Notificar tareas de eventos `cancelled` produciría ruido y violaría el principio demo-first.

### Decisión formal

```text
El job EmitT7NotificationsJob procesa exclusivamente eventos en `event.status='active'`. Eventos en `draft`, `completed` o `cancelled` se omiten. Adicionalmente, dentro de eventos `active`, sólo se procesan tareas con `task.status ∈ {pending, in_progress}` (alineado con PB-P2-004 Acceptance Summary).
```

### Rationale

* Alineado con BR-EVENT-005/006, FR-TASK-011, BR-EVENT-013.
* PB-P2-004 ya formaliza "solo tareas `pending/in_progress`"; esta decisión lo extiende al estado del evento.
* Reduce ruido en demo (eventos `draft` aún no están listos; `completed`/`cancelled` ya no son accionables).
* No introduce scope creep.

### Impacto en la User Story

| Sección                 | Cambio requerido                                                                                                                                                                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| PO/BA Decisions Applied | Agregar entrada D3.                                                                                                                                                                                                                                    |
| Acceptance Criteria     | Reflejar `event.status='active' AND task.status ∈ {pending, in_progress}` en AC-01.                                                                                                                                                                    |
| Edge Cases              | Agregar EC-02 (evento `cancelled` → omitida), EC-03 (evento `completed` → omitida), EC-04 (evento `draft` → omitida).                                                                                                                                  |
| Validation Rules        | VR-01 actualizar a "Tarea activa (`pending/in_progress`) en evento `active` con expresión T-7 satisfecha".                                                                                                                                              |
| Technical Notes         | Backend: filtro SQL `WHERE event.status='active' AND event_task.status IN ('pending','in_progress')`.                                                                                                                                                   |
| Test Scenarios          | TS-05 exclusión por estado de evento (cubre `draft`, `completed`, `cancelled`).                                                                                                                                                                          |

### ¿Bloqueaba aprobación?

Sí.

### Validación adicional requerida

No requiere validación adicional.

---

## Decisión 4 — Definición operativa exacta de "T-7" (Q4)

### Pregunta original

> ¿Día calendario exacto, inclusive/exclusive, manejo de DST?

### Respuesta PO/BA

`EventTask.due_date` está tipado como `date` y `Event.event_date` está tipado como `date` (`docs/6 §EventTask`, `docs/6 §Event`). Al ser fechas calendario (no `timestamp`), no hay ambigüedad horaria ni DST a nivel del valor. La operación T-7 se reduce a aritmética de fechas calendario en la timezone fijada por D1 (`America/Guatemala`). El BR-TASK-006 documenta que `due_date` se calcula como `event_date + relative_offset_days`, lo cual confirma la lógica calendario.

### Decisión formal

```text
Se considera que una tarea cae en la ventana T-7 cuando `event_task.due_date::date == (current_date_in_America_Guatemala + INTERVAL '7 days')::date`. La comparación es por igualdad exacta, sin tolerancia, evaluada el día de ejecución del cron. El "día actual" se calcula como `now() AT TIME ZONE 'America/Guatemala'` truncado a día. Tareas con `due_date` en T-6, T-8, T-0, vencidas o sin `due_date` no participan.
```

### Rationale

* `due_date` es `date`, por lo que la comparación es naturalmente calendario.
* La igualdad exacta (no rango) hace el job determinístico y trivialmente testeable con clock injectable.
* Evita re-notificaciones (combinado con D2): cada tarea recibe la notificación exactamente en el día T-7 y no antes ni después.
* Si por reinicio del proceso el job no corre en el día T-7 exacto, la notificación se pierde para esa tarea. Esto es aceptable en MVP (consistente con la naturaleza "best-effort" de notificaciones in-app + log) y queda anotado en Notes como riesgo.

### Impacto en la User Story

| Sección                 | Cambio requerido                                                                                                                                                                                                                            |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| PO/BA Decisions Applied | Agregar entrada D4.                                                                                                                                                                                                                         |
| Acceptance Criteria     | AC-01 con la fórmula exacta y mención al clock injectable.                                                                                                                                                                                  |
| Edge Cases              | EC-05 (T-6 / T-8 → ignoradas).                                                                                                                                                                                                              |
| Validation Rules        | VR-01 reformular con la fórmula exacta.                                                                                                                                                                                                     |
| Technical Notes         | Backend: declarar comparación por `date` en SQL `event_task.due_date = (CURRENT_DATE AT TIME ZONE 'America/Guatemala') + INTERVAL '7 days'`. QA: clock injectable obligatorio.                                                              |
| Test Scenarios          | TS-01 cubre clock injectable; añadir negative tests para T-6/T-8 (NT-02 ya existe como "fuera de rango", reescrito con valores concretos).                                                                                                  |
| Notes                   | Documentar el riesgo aceptado: si el job no corre en el día T-7 exacto (caída del proceso), esa tarea no se notifica.                                                                                                                       |

### ¿Bloqueaba aprobación?

Sí.

### Validación adicional requerida

No requiere validación adicional.

---

## Decisión 5 — Granularidad del email simulado (Q5)

### Pregunta original

> ¿Una entrada de log por tarea o agrupada por organizador?

### Respuesta PO/BA

PB-P2-004 declara textualmente: "Job programado a las 08:00 hora local del evento ... que emite notificación in-app + email simulado **por cada tarea** con `due_date` exactamente T-7". `docs/18 §18.1` declara que el email simulado se materializa como un registro `notifications(channel='email_simulated')` adicional, sin tabla `notification_delivery_log`. NFR-OBS-004 exige el log `[EMAIL] to=… subject=…`.

### Decisión formal

```text
Por cada `EventTask` que satisface la condición T-7, el job crea exactamente:
1) un registro `notifications(user_id=event.owner_id, type='task_due_soon', channel='in_app', payload={taskId, eventId, dueDate})`, y
2) un registro `notifications(user_id=event.owner_id, type='task_due_soon', channel='email_simulated', payload={taskId, eventId, dueDate})`, y
3) una entrada de log estructurado `[EMAIL] to=<userId> subject="Tarea próxima a vencer" body=<localizado>` (NFR-OBS-004) con `correlationId=job-emit-t7-<timestamp>`.
Al final del run, el job emite un único log resumen `job.t7Notifications.affected=N` con el mismo `correlationId` (NFR-OBS-005).
```

### Rationale

* PB-P2-004 fija "por cada tarea": no hay margen para agrupación a nivel de organizador.
* `docs/18 §18.1` ya formaliza el patrón "una fila por canal".
* El log resumen `affected=N` permite auditoría rápida sin agregación adicional.
* El idioma del `body` se cubre por BR-NOTIF-007 (ver §5 Documentation Alignment, decisión D6).

### Impacto en la User Story

| Sección                 | Cambio requerido                                                                                                                                                                                                       |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PO/BA Decisions Applied | Agregar entrada D5 con el patrón 1+1+log+resumen.                                                                                                                                                                       |
| Acceptance Criteria     | AC-01 con el patrón 1+1; AC-05 con el log resumen.                                                                                                                                                                      |
| Technical Notes         | Backend: declarar uso de `SimulatedEmailAdapter` para la entrada `[EMAIL]`; payload del Notification documentado.                                                                                                       |
| Observability / Audit   | Confirmar `correlationId=job-emit-t7-<timestamp>` artificial alineado con `docs/14 §23.2`.                                                                                                                              |
| Test Scenarios          | TS-06 verifica `[EMAIL]` por tarea + `affected=N` por corrida; aserción de no-PII (SEC-02).                                                                                                                             |

### ¿Bloqueaba aprobación?

Sí.

### Validación adicional requerida

No requiere validación adicional.

---

## Decisión 6 (alineación adicional) — Idioma de la notificación T-7 (BR-NOTIF-007)

### Pregunta original

> BR-NOTIF-007 dice "idioma preferido del destinatario o del evento, según corresponda". ¿Cuál aplica para T-7?

### Respuesta PO/BA

El destinatario único de la notificación T-7 es el organizador (`event.owner_id`), que tiene `User.language_preference` (`docs/6 §User`). El idioma del evento (`event.language_code`) es un parámetro IA (BR-EVENT-008) usado para checklist/sugerencias, no para comunicaciones personales. El criterio "según corresponda" se interpreta así: para notificaciones dirigidas al propio organizador, prevalece su preferencia personal; el idioma del evento sirve sólo de fallback si la preferencia es nula (caso improbable porque `User.language_preference` está bound al onboarding US-007).

### Decisión formal

```text
El contenido del Notification y de la entrada de log [EMAIL] se localiza usando `User.language_preference` del destinatario. Si por alguna razón el valor está vacío, se usa `event.language_code` como fallback. El campo `Notification.language_code` se persiste con el código resuelto.
```

### Rationale

* Alineado con BR-NOTIF-007 ("destinatario o del evento, según corresponda").
* El destinatario es el organizador → "según corresponda" = preferencia del destinatario.
* No introduce dependencia con `event.language_code` salvo fallback defensivo.

### Impacto en la User Story

| Sección                 | Cambio requerido                                                                                                                  |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| PO/BA Decisions Applied | Agregar entrada D6.                                                                                                               |
| Acceptance Criteria     | AC-04 (idioma resuelto y persistido).                                                                                             |
| Technical Notes         | Backend: declarar lookup de `language_preference` y resolución del fallback.                                                       |
| Test Scenarios          | TS añadido en el set de aserciones de TS-06 (verifica `language_code` correctamente persistido en `Notification`).                |

### ¿Bloqueaba aprobación?

Parcialmente (Documentation Alignment Required, no bloqueante en sentido estricto).

### Validación adicional requerida

No requiere validación adicional.

---

## 3. Consolidated Decision Table

|  # | Tema                                                | Decisión                                                                                                                          | Tipo                | ¿Bloqueaba aprobación? | Validación adicional                              |
| -: | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------- | ---------------------- | ------------------------------------------------- |
|  1 | Scheduler & timezone                                | `node-cron` único `0 8 * * *` en `America/Guatemala`. Sin campo `timezone` en Event/Location en MVP.                              | PO                  | Sí                     | ADR sólo si Future promueve multi-timezone        |
|  2 | Idempotencia                                        | Chequeo SELECT/INSERT en transacción por chunk; sin unique constraint nuevo; sin `notification_delivery_log`.                     | Tech Recommendation | Sí                     | Requiere validación Tech Lead en Technical Spec   |
|  3 | Estados de evento procesados                        | Solo `event.status='active'`; tareas `pending/in_progress`. Excluye `draft`, `completed`, `cancelled`.                            | PO                  | Sí                     | No requiere                                       |
|  4 | Definición operativa T-7                            | `due_date = (current_date_in_America_Guatemala + 7 días)::date`, igualdad exacta. Sin tolerancia.                                 | PO                  | Sí                     | No requiere                                       |
|  5 | Granularidad email simulado                         | Por cada tarea: 1 `Notification(in_app)` + 1 `Notification(email_simulated)` + 1 log `[EMAIL]` + 1 log resumen `affected=N`.       | PO                  | Sí                     | No requiere                                       |
|  6 | Idioma del Notification                             | `User.language_preference` con fallback a `event.language_code`. `Notification.language_code` persiste el código resuelto.        | PO                  | Parcial                | No requiere                                       |

---

## 4. Cambios Aplicados a la User Story

### Metadata
- `Epic` actualizado a `EPIC-NOT-001 / EPIC-TASK-001`.
- `Backlog Item` agregado: `PB-P2-004 — Notificación T-7 (tareas) (P2)`.
- `Status` mantenido en `Draft` (la skill de refinement debe pasar a `Ready for Approval` en su revalidación). Sin embargo, dado que esta resolución cierra los 5 bloqueantes, marca `Ready for Approval` está habilitada y se aplica.
- `Last Updated` actualizado a `2026-06-29`.

### Business Context
- `Assumptions`: reformulado para reflejar el simulado por log estructurado vía `SimulatedEmailAdapter` y la inexistencia de `notification_delivery_log` (MVP).
- `Dependencies`: añadido `US-071` (surface organizer) y `US-072` (mark as read) como dependencias del cierre end-to-end; PB-P1-018, PB-P2-009 mantenidos.

### PO/BA Decisions Applied
Sección nueva con las 6 decisiones (D1–D6) y referencia a este artefacto.

### Traceability
- `FRD Requirement(s)` → `FR-TASK-010, FR-NOTIF-001, FR-NOTIF-003`.
- `Use Case(s)` → `UC-NOTIF-001` (transversal — job sin UC dedicado).
- `Business Rule(s)` → `BR-TASK-008, BR-NOTIF-001, BR-NOTIF-002, BR-NOTIF-003, BR-NOTIF-005, BR-NOTIF-007`.
- `Permission Rule(s)` → `Sistema → event.owner_id`.
- `Data Entity / Entities` → `EventTask, Event, Notification, User`.
- `API Endpoint(s)` → "No aplica (job programado). Surface en US-071/US-072".
- `NFR Reference(s)` → `NFR-OBS-004, NFR-OBS-005`.
- `Related ADR(s)` → "—" (sólo Future si se promueve multi-timezone).
- `Related Document(s)` → `/docs/4 §BR-NOTIF-001/002/003/005/007, §BR-TASK-008`, `/docs/6 §Notification`, `/docs/8 §UC-NOTIF-001`, `/docs/9 §FR-TASK-010 / §FR-NOTIF-001 / §FR-NOTIF-003`, `/docs/10 §NFR-OBS-004 / §NFR-OBS-005`, `/docs/14 §23.2`, `/docs/18 §18.1`.

### Scope Guardrails
- `Explicitly Out of Scope`: agregado "Surface in-app (campanita, lista, badge) — alcance de US-071", "Marcar notificación como leída — alcance de US-072", "`notification_delivery_log` (Future, docs/18 §18.1)". Mantenidos push, SMS, WhatsApp.
- `Scope Notes`: reformulado como "Sólo job + persistencia de `Notification(in_app)` + `Notification(email_simulated)` + log estructurado. Sin componentes frontend".

### Acceptance Criteria
- AC-01 reescrito con D1, D3, D4, D5.
- AC-02 anterior (visualización in-app) reemplazado por AC-02 idempotencia (D2).
- AC-03 nuevo (aislamiento BR-NOTIF-005).
- AC-04 nuevo (idioma D6).
- AC-05 nuevo (observabilidad NFR-OBS-004/005).

### Edge Cases
- EC-01 mantenido y ampliado (`done` o `skipped`).
- EC-02 nuevo (evento `cancelled`).
- EC-03 nuevo (evento `completed`).
- EC-04 nuevo (evento `draft`).
- EC-05 nuevo (T-6 / T-8 ignoradas).
- EC-06 nuevo (re-ejecución del job).

### Validation Rules
- VR-01 reformulado con la fórmula exacta T-7 (D4) y los filtros de estado (D3).
- VR-02 nuevo (`Notification.user_id = event.owner_id`).

### Authorization & Security Rules
- SEC-01 mantenido y precisado.
- SEC-02 precisado: campos permitidos en log = `userId, taskId, eventId, dueDate, correlationId`; excluye `email`, `displayName`, título.
- SEC-03 nuevo (aislamiento por `event.owner_id`, alineado con BR-NOTIF-005).

### Technical Notes
- Frontend: eliminado (handoff a US-071/US-072).
- Backend: `EmitT7NotificationsUseCase` + `EmitT7NotificationsJob`; cron `0 8 * * *` en `America/Guatemala`; idempotencia por SELECT/INSERT en transacción por chunk; reutiliza `EventTaskRepository`, `NotificationRepository`, `SimulatedEmailAdapter`.
- Database: sin migración; reuso de `idx_notifications_user_status_sent` y `idx_notifications_user_unread`.
- API: tabla actualizada para clarificar que el job no expone endpoint y el surface es US-071/US-072.
- Observability: `correlationId=job-emit-t7-<timestamp>`, log resumen `affected=N`, log por tarea `[EMAIL]`.

### UX / UI Notes
- Reemplazado por "No aplica — surface en US-071 (lista + badge) y US-072 (marcar como leída)".

### Test Scenarios
- TS-01 mantenido (clock injectable explícito).
- TS-02 anterior (E2E surface) eliminado/reasignado a US-071.
- TS-03 nuevo (idempotencia).
- TS-04 nuevo (timezone `America/Guatemala`).
- TS-05 nuevo (exclusión por estado de evento).
- TS-06 nuevo (log estructurado + aislamiento + idioma).
- NT-01/NT-02 reformulados con valores T-6/T-8 explícitos.
- AUTH tests actualizados: AUTH-TS-01 Sistema crea notif (System), AUTH-TS-02 aislamiento (BR-NOTIF-005).

### Definition of Ready
- Marca `[x] PO/BA validó` para reflejar el cierre de Q1–Q5.

### Definition of Done
- Añadido: clock injectable validado; idempotencia comprobada; log estructurado verificado; sin PII en logs.

### Notes
- Reemplazada la duda original por la decisión D1.
- Añadido handoff explícito a US-071/US-072.
- Documentado el riesgo aceptado de pérdida de notificación si el job no corre el día T-7 exacto.

---

## 5. Documentation Alignment Required

| Documento / Fuente                                                  | Conflicto detectado                                                                                                                                                                | Decisión vigente                                                                                                                                                                  | Acción recomendada                                                                                                                                                                                       | ¿Bloquea aprobación? |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| `management/artifacts/4-Product-Backlog-Prioritized.md` (PB-P2-004) | `Traceability` declara `FR-NOTIF-004, FR-TASK-011`; los canónicos para T-7 son `FR-TASK-010, FR-NOTIF-001, FR-NOTIF-003`.                                                          | El FRD (`docs/9`) y el BRD (`docs/4`) son fuente única.                                                                                                                            | Actualizar `Traceability` del backlog item PB-P2-004 a `FR-TASK-010, FR-NOTIF-001, FR-NOTIF-003 · Decisión PO US-034`. No bloquea aprobación de US-034 al estar la US ya corregida.                       | No                   |
| `docs/14-Backend-Technical-Design.md §23.2`                         | La tabla de jobs MVP no lista `EmitT7NotificationsJob`. PB §4.2 ya formalizó su schedule.                                                                                          | Job formalizado en PB §4.2 y aplicado en esta resolución (D1).                                                                                                                    | Agregar fila en `docs/14 §23.2` con: `Job=EmitT7NotificationsJob`, `Propósito=Emitir Notification + log [EMAIL] para tareas con due_date == today+7`, `Implementación=node-cron`, `Schedule=0 8 * * * America/Guatemala`, `Entidades=EventTask, Notification`, `Idempotencia=SELECT antes de INSERT en transacción por chunk`, `Observabilidad=correlationId=job-emit-t7-<timestamp>, log resumen affected=N`. | No                   |
| `docs/18-Database-Physical-Design.md §18.1`                         | Sin conflicto: la decisión D2 respeta explícitamente que no se modela `notification_delivery_log` en MVP.                                                                          | Sin cambio requerido.                                                                                                                                                              | Ninguna acción.                                                                                                                                                                                          | No                   |
| `docs/4-Business-Rules-Document.md §BR-NOTIF-007`                   | "Idioma preferido del destinatario o del evento, según corresponda" deja la regla parcialmente abierta.                                                                            | Para T-7 prevalece `User.language_preference`, con fallback a `event.language_code` (D6).                                                                                          | Agregar nota a BR-NOTIF-007: "Para notificaciones dirigidas al propio organizador (e.g. T-7), prevalece `User.language_preference`; para notificaciones dirigidas a un tercero (e.g. vendor), prevalece el idioma de la entidad disparadora". | No                   |
| `docs/10-Non-Functional-Requirements.md §NFR-OBS-004`               | `NFR-OBS-004` referencia `FR-NOTIF-002` como FR origen; el FR canónico del email simulado es `FR-NOTIF-003`.                                                                       | Es un error de cross-reference en el NFR; fuera del alcance de US-034.                                                                                                            | Corrección menor en `docs/10`: reemplazar `FR-NOTIF-002` por `FR-NOTIF-003` en la fila `NFR-OBS-004`.                                                                                                    | No                   |

---

## 6. File Update Result

| Campo                                        | Valor                                                                                                                                                |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| User Story file updated                      | Yes                                                                                                                                                  |
| User Story file path                         | `management/user-stories/US-034-inapp-notification-t-minus-7.md`                                                                                     |
| Decision Resolution artifact created/updated | Yes                                                                                                                                                  |
| Decision Resolution path                     | `management/user-stories/decision-resolutions/US-034-decision-resolution.md`                                                                         |
| New User Story status                        | Ready for Approval                                                                                                                                   |
| Remaining blockers                           | No                                                                                                                                                   |
| Reason                                       | Las 5 preguntas bloqueantes Q1–Q5 quedaron resueltas con respaldo documental (PB §4.2, PB-P2-004, docs/9, docs/14 §23.1/23.2, docs/18 §18.1, docs/4 §BR-NOTIF-*, docs/6). D2 queda etiquetada como `Tech Recommendation` para validación durante la Technical Specification, sin bloquear el formal approval gate. |

---

## 7. Estado recomendado después de aplicar decisiones

`Ready for Approval`

Las 5 decisiones bloqueantes están cerradas con respaldo documental, la User Story fue reescrita en sitio (alcance recortado al job, traceability corregida, AC y EC ampliados con las nuevas reglas), y la única dependencia futura (validación Tech Lead de D2) se ejerce durante la Technical Specification, no antes del approval gate.

---

## 8. Próximo Paso Recomendado

```text
1. (Opcional) Run `eventflow-user-story-refinement` para revalidación de segundo paso (recomendado por el orquestador y por el patrón observado en US-033).
2. Run `eventflow-user-story-approval` sobre `management/user-stories/US-034-inapp-notification-t-minus-7.md`.
3. Run `eventflow-user-story-technical-spec` (D2 se valida formalmente como Tech Recommendation en esta etapa).
4. Run `eventflow-user-story-to-development-tasks` sobre la Technical Specification generada.
```

User Story file updated: Yes
Path: management/user-stories/US-034-inapp-notification-t-minus-7.md
Status: Ready for Approval
Decision Resolution artifact: management/user-stories/decision-resolutions/US-034-decision-resolution.md
Next step: Run `eventflow-user-story-refinement` (revalidación) o `eventflow-user-story-approval` directamente.
