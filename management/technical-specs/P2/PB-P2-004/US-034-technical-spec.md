# Technical Specification — US-034: Recibir notificación in-app de T-7

## 1. Metadata

| Field                                | Value                                                                                              |
| ------------------------------------ | -------------------------------------------------------------------------------------------------- |
| User Story ID                        | US-034                                                                                              |
| Source User Story                    | `management/user-stories/US-034-inapp-notification-t-minus-7.md`                                    |
| Decision Resolution Artifact         | `management/user-stories/decision-resolutions/US-034-decision-resolution.md`                        |
| Priority                             | P2                                                                                                  |
| Backlog ID                           | PB-P2-004                                                                                           |
| Backlog Title                        | Notificación T-7 (tareas) · `Job EmitT7NotificationsJob + surface in-app`                            |
| Backlog Execution Order              | 4 (cuarto ítem dentro de P2)                                                                        |
| User Story Position in Backlog Item  | 1 de 2 (US-034 = job + persistencia; US-071 = surface organizer)                                    |
| Related User Stories in Backlog Item | US-034 (job), US-071 (surface T-7 organizer). US-072 (mark as read) en PB-P2-008.                   |
| Epic                                 | EPIC-NOT-001 / EPIC-TASK-001                                                                        |
| Backlog Item Dependencies            | PB-P1-018 (CRUD de tareas), PB-P2-009 (vendor surface — sólo informativo; este job no involucra vendor) |
| Feature                              | Notificación T-7                                                                                    |
| Module / Domain                      | Notifications / Tasks                                                                               |
| User Story Status                    | Approved with Minor Notes                                                                           |
| Backlog Alignment Status             | Found                                                                                               |
| Technical Spec Status                | Ready for Task Breakdown                                                                            |
| Created Date                         | 2026-06-29                                                                                          |
| Last Updated                         | 2026-06-29                                                                                          |

---

## 2. Backlog Execution Context

### Product Backlog Item

**PB-P2-004 — Notificación T-7 (tareas)** entrega el job programado `EmitT7NotificationsJob` que emite, por cada `EventTask` cuya `due_date` cae exactamente en T-7 (hoy + 7 días calendario en `America/Guatemala`), un par de registros `Notification` (canal `in_app` + `email_simulated`) y una entrada de log estructurado simulando email. PB-P2-004 está priorizado como `Should Have` y sus dependencias declaradas son PB-P1-018 (CRUD de tareas, ya entregada) y PB-P2-009 (vendor surface — no aplica funcionalmente porque T-7 es 100% organizer-side).

### Execution Order Rationale

US-034 es la pieza-emisora del par "job + surface" de PB-P2-004. Debe entregarse **antes** que US-071 porque US-071 (surface organizer) consume los `Notification(type='task_due_soon')` creados por este job (declarado explícitamente en `management/user-stories/US-071-inapp-notification-t-minus-7-recipe.md` y en la matriz de cobertura `management/artifacts/2-User-Stories-Coverage-Matrix.md`). Sin US-034 entregada, US-071 muestra lista vacía. La marca de leída se cubre en US-072 (PB-P2-008), independientemente del job.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item                                                                                | Suggested Order |
| ---------- | --------------------------------------------------------------------------------------------------- | --------------- |
| US-034     | Job + persistencia (`Notification` in_app + email_simulated + log estructurado)                     | 1               |
| US-071     | Surface organizer (lista + badge; consume los `Notification(type='task_due_soon')` emitidos por US-034) | 2               |

---

## 3. Executive Technical Summary

Implementar el use case `EmitT7NotificationsUseCase` en el módulo `notifications` y registrarlo como job programado `EmitT7NotificationsJob` mediante `node-cron` con expresión `0 8 * * *` y zona `America/Guatemala` dentro del proceso único backend MVP (alineado con `docs/14 §23.1 / §23.2`).

Por cada evento `e` con `e.status='active'` y cada `EventTask` `t` con `t.event_id = e.id`, `t.status ∈ {pending, in_progress}` y `t.due_date = (CURRENT_DATE AT TIME ZONE 'America/Guatemala') + INTERVAL '7 days'`:

1. Verificar idempotencia mediante `SELECT 1 FROM notifications WHERE user_id = e.owner_id AND type='task_due_soon' AND payload->>'task_id' = t.id LIMIT 1`.
2. Si no existe registro previo:
   - INSERT `Notification(user_id=e.owner_id, type='task_due_soon', channel='in_app', payload={taskId, eventId, dueDate}, language_code=<resolved>)`.
   - INSERT `Notification(user_id=e.owner_id, type='task_due_soon', channel='email_simulated', payload=<mismo>, language_code=<mismo>)`.
   - Invocar `SimulatedEmailAdapter.logEmail({ to: e.owner_id, subject: <localized>, body: <localized>, correlationId })`.
3. Al terminar el run, emitir un único log `job.t7Notifications.affected=N` con `correlationId=job-emit-t7-<timestamp>`.

Todas las operaciones por chunk corren en una sola transacción Prisma (`prisma.$transaction`). Sin migraciones nuevas. La resolución del `language_code` toma `User.language_preference` con fallback a `event.language_code` (D6).

---

## 4. Scope Boundary

### In Scope

* Backend: `EmitT7NotificationsUseCase`, `EmitT7NotificationsJob`, `SimulatedEmailAdapter` (si no existe), filtros SQL T-7, idempotencia por SELECT/INSERT en transacción, log estructurado.
* Database: lectura sobre `event_tasks`, `events`, `users`; inserción sobre `notifications`. Sin migraciones.
* Observability: `correlationId` artificial, logs `[EMAIL]` por tarea, log resumen `affected=N`.
* Testing: unit (resolución de idioma, formateo de subject/body), integration (clock injectable, idempotencia, exclusiones por estado), regression de no-PII en logs.
* DevOps: registro del job en `src/server.ts`, `TZ=America/Guatemala`, runbook de demo (alineado con US-144).

### Out of Scope

* Surface in-app de notificaciones (lista, badge, contador no leídas) → US-071.
* Marcar notificación como leída → US-072.
* Endpoints `GET /api/v1/notifications` y `POST /api/v1/notifications/:id/read` → US-071 / US-072.
* Push, SMS, WhatsApp (BR-NOTIF-006).
* Tabla `notification_delivery_log` (Future, `docs/18 §18.1`).
* Multi-timezone (cron por timezone, campos `Event.timezone` / `Location.timezone`) → Future, requiere ADR.
* Integración real con SMTP (Future).
* Retry diferido si el proceso está caído al horario del cron (Future).

### Explicit Non-Goals

* No se persiste un registro `AdminAction` por la ejecución del job (NFR-OBS-001 es para acciones administrativas; este job es de sistema).
* No se introduce `Notification.task_id` como columna física en MVP (la relación con la tarea vive en `payload.taskId` como JSONB).
* No se introduce unique constraint en `notifications` en MVP.
* No se altera `BR-NOTIF-007` ni `docs/4`; sólo se aplica la lectura "destinatario = propio organizador" → `User.language_preference`.

---

## 5. Architecture Alignment

### Backend Architecture

* Stack: Node.js + Express + TypeScript + Prisma + PostgreSQL (`docs/14 §estructura propuesta`).
* Patrón: Clean / Hexagonal con módulo `notifications` y módulo `task-management` (`docs/14 §433 / §443`).
* Job runner: `node-cron` registrado en `src/jobs/` con bootstrap en `src/server.ts` (`docs/14 §23.1 / §24.1`).
* Use case: `EmitT7NotificationsUseCase` en `src/modules/notifications/application/use-cases/` (siguiendo el patrón de `CreateNotificationUseCase` en `docs/14 §730`).
* Repositorios: `EventTaskRepository` (módulo `task-management`), `NotificationRepository` (módulo `notifications`), `UserRepository` (lectura de `language_preference`).
* Adapter: `SimulatedEmailAdapter` (interfaz declarada en `docs/14 §443 — notifications`).

### Frontend Architecture

`No aplica` — la US no entrega componentes frontend. Surface en US-071/US-072.

### Database Architecture

* PostgreSQL con Prisma (`docs/18 §18.1`).
* Lectura: `events`, `event_tasks`, `users`.
* Escritura: `notifications` (sin migración).
* Reuso de índices: `idx_notifications_user_status_sent`, `idx_notifications_user_unread`.
* Sin tabla `notification_delivery_log` (decisión explícita `docs/18 §18.1`).
* Sin nueva enum value: `task_due_soon` ya existe en `notification_type` (`docs/18 §998`).

### API Architecture

`No aplica` — el job no expone endpoint HTTP. Los endpoints existentes `GET /api/v1/notifications` y `POST /api/v1/notifications/:id/read` (catalogados en `docs/14 §989 NotificationsController` y `docs/16 §M Notifications`) los consumen US-071 y US-072.

### AI / PromptOps Architecture

`No aplica` — US-034 no invoca IA.

### Security Architecture

* Backend como source of truth de ownership (`docs/19 §Authorization model`).
* Aislamiento BR-NOTIF-005: `Notification.user_id = event.owner_id`, validado en el use case.
* Sin PII en logs (SEC-02), alineado con `docs/19 §PII en logs` y `docs/10 §NFR-OBS-004`.
* Job sin sesión (sistema), alineado con `docs/14 §705` (patrón `AutoCompletePastEventsUseCase`).

### Testing Architecture

* Vitest + Supertest para integration tests (`docs/20 §unit/integration backend`).
* Clock injectable mediante puerto `Clock` con default `SystemClock` y override `TestClock` en tests (patrón estándar `docs/14 §23.x` para jobs).
* MSW no aplica (job server-side).
* Playwright no aplica directamente; cobertura E2E vive en US-071.

---

## 6. Functional Interpretation

| Acceptance Criterion                       | Technical Interpretation                                                                                                                                                                                                                                                                                                          | Impacted Layer(s)                            |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| AC-01 — Emisión correcta T-7               | Query SQL con filtros `event.status='active' AND event_task.status IN ('pending','in_progress') AND event_task.due_date IS NOT NULL AND event_task.due_date = (CURRENT_DATE AT TIME ZONE 'America/Guatemala') + INTERVAL '7 days'`. Por cada fila: 1 INSERT `in_app`, 1 INSERT `email_simulated`, 1 entrada `[EMAIL]` en logger. | Backend, Database, Observability             |
| AC-02 — Idempotencia                       | Antes de cada INSERT, `SELECT 1 FROM notifications WHERE user_id=? AND type='task_due_soon' AND payload->>'task_id'=? LIMIT 1`. Si existe, skip silencioso.                                                                                                                                                                       | Backend, Database                            |
| AC-03 — Aislamiento BR-NOTIF-005           | El INSERT usa exclusivamente `event.owner_id` como `user_id`. Validación en el use case antes de invocar `NotificationRepository.create`.                                                                                                                                                                                          | Backend, Security                            |
| AC-04 — Idioma del Notification            | Lookup `User.language_preference` por `event.owner_id`. Fallback a `event.language_code` si está vacío. Persistir el código resuelto en `Notification.language_code`.                                                                                                                                                              | Backend, Database                            |
| AC-05 — Observabilidad del run             | `correlationId` artificial generado al inicio (`job-emit-t7-<ISO-timestamp>`). Por cada tarea, log estructurado `[EMAIL]` sin PII. Al finalizar, log resumen `job.t7Notifications.affected=N`.                                                                                                                                    | Observability, Security (no-PII)             |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

* Módulo principal: `notifications` (`docs/14 §443`). Aloja `EmitT7NotificationsUseCase`, `SimulatedEmailAdapter` y el job `EmitT7NotificationsJob`.
* Módulo lector: `task-management` para `EventTaskRepository` (alineado con `docs/14 §modules`).
* Módulo lector: `identity-access` para `UserRepository.findLanguagePreference(userId)`.
* `shared-kernel`: tipos `Notification`, `EventTask`, `Clock` (puerto).

### Use Cases / Application Services

* `EmitT7NotificationsUseCase`:

  * Input: `RunCommand { now: Date, correlationId: string }`.
  * Output: `RunReport { affected: number }`.
  * Pasos:

    1. Calcular `targetDate = now_in_America_Guatemala + 7 días (calendario)`.
    2. `EventTaskRepository.findT7Candidates(targetDate, batchSize=100)` → iterador.
    3. Por chunk dentro de `prisma.$transaction`:

       * Para cada `(task, event)`:

         * `if NotificationRepository.existsTaskDueSoonForTask(event.owner_id, task.id) { continue }`.
         * `lang = UserRepository.resolveLanguageCode(event.owner_id, event.language_code)`.
         * `payload = { taskId: task.id, eventId: event.id, dueDate: task.due_date }`.
         * `NotificationRepository.create({ user_id: event.owner_id, type: 'task_due_soon', channel: 'in_app', payload, language_code: lang })`.
         * `NotificationRepository.create({ user_id: event.owner_id, type: 'task_due_soon', channel: 'email_simulated', payload, language_code: lang })`.
         * `SimulatedEmailAdapter.logEmail({ to: event.owner_id, subject: T(lang, 'notif.t7.subject'), body: T(lang, 'notif.t7.body', { taskId, dueDate }), correlationId })`.
         * `affected += 1`.
    4. Emitir log resumen `job.t7Notifications.affected=N` con `correlationId`.

### Controllers / Routes

`No aplica` — el job no expone ruta HTTP.

### DTOs / Schemas

* `Notification.payload` (jsonb) schema validable con Zod:

  ```ts
  z.object({ taskId: z.string().uuid(), eventId: z.string().uuid(), dueDate: z.string().date() })
  ```
* `RunReport` interno (no expuesto): `{ affected: number, correlationId: string }`.

### Repository / Persistence

* `EventTaskRepository.findT7Candidates(targetDate: Date, batchSize: number): AsyncIterable<{task, event}>`

  ```sql
  SELECT t.*, e.id AS event_id, e.owner_id, e.language_code, e.status AS event_status
  FROM event_tasks t
  INNER JOIN events e ON e.id = t.event_id
  WHERE e.status = 'active'
    AND t.status IN ('pending','in_progress')
    AND t.due_date IS NOT NULL
    AND t.due_date = $1
  ORDER BY e.id, t.id
  LIMIT $2 OFFSET $3
  ```
* `NotificationRepository.existsTaskDueSoonForTask(userId, taskId): Promise<boolean>`

  ```sql
  SELECT 1 FROM notifications
  WHERE user_id = $1 AND type = 'task_due_soon' AND payload->>'task_id' = $2
  LIMIT 1
  ```
* `NotificationRepository.create(input: CreateNotificationInput): Promise<Notification>`: INSERT estándar.
* `UserRepository.resolveLanguageCode(userId, fallback)`:

  ```sql
  SELECT language_preference FROM users WHERE id = $1
  ```

  Devuelve `language_preference` si no nulo; fallback al `event.language_code`.

### Validation Rules

* Zod schema del `payload` antes del INSERT.
* Guard interno: `if (notification.user_id !== event.owner_id) throw new InvariantViolation('BR-NOTIF-005')`.
* Guard interno: `if (event.status !== 'active') skip` (defensa en profundidad sobre el filtro SQL).

### Error Handling

* Captura por chunk (alineado con `docs/14 §23.2 AutoCompletePastEventsJob`): si un chunk falla, log de error con `correlationId` + `chunkIndex` + `firstTaskId/lastTaskId`, continuar con el siguiente chunk.
* Errores fatales (DB no disponible, scheduler corrupto) propagan al supervisor del proceso y se loggean con `level='fatal'`.
* Sin reintentos automáticos en MVP (riesgo aceptado documentado).

### Transactions

* Una transacción Prisma por chunk de tamaño `batchSize=100`.
* Aislamiento default Postgres (`READ COMMITTED`); suficiente porque el `existsTaskDueSoonForTask` + INSERT ocurren bajo la misma conexión y el job corre en single-process MVP (`docs/14 §23.1`).

### Observability

* `correlationId = "job-emit-t7-${ISO8601(now)}"` calculado al inicio del run.
* Logs por tarea: `logger.info({ event: 'email.simulated.t7', correlationId, userId, taskId, eventId, dueDate, language: lang, subject, body })`. NB: `subject` y `body` están localizados y no contienen email ni displayName.
* Log resumen: `logger.info({ event: 'job.t7Notifications.completed', correlationId, affected, scannedChunks })`.
* Log de error por chunk: `logger.error({ event: 'job.t7Notifications.chunkFailed', correlationId, chunkIndex, error })`.

---

## 8. Frontend Technical Design

`No aplica` — US-034 no entrega componentes ni rutas frontend. Las pantallas relacionadas (campanita, lista, marcar leída) son alcance de US-071 y US-072.

---

## 9. API Contract Design

`No aplica` — el job no expone endpoint HTTP. Los endpoints existentes catalogados en `docs/14 §989 NotificationsController` y `docs/16 §M Notifications` (`GET /api/v1/notifications`, `POST /api/v1/notifications/:id/read`, `POST /api/v1/notifications/read-all`) son consumidos por US-071 y US-072 y no se modifican en US-034.

---

## 10. Database / Prisma Design

### Models Impacted

| Model        | Operación | Detalle                                                                                                                                                          |
| ------------ | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Notification | INSERT    | 2 filas por tarea (canal `in_app` + canal `email_simulated`).                                                                                                    |
| EventTask    | SELECT    | Lectura con JOIN a `events`.                                                                                                                                     |
| Event        | SELECT    | Lectura para `owner_id`, `language_code`, `status`.                                                                                                              |
| User         | SELECT    | Lectura de `language_preference` por `owner_id`.                                                                                                                 |

### Fields / Columns

Sin cambios. Se usan los campos existentes de `notifications` (`user_id`, `type`, `payload`, `channel`, `language_code`, `status`, `sent_at`) ya documentados en `docs/18 §18.1`.

### Relations

Sin cambios. La relación `Notification ↔ EventTask` queda implícita por `payload->>'task_id'`, alineado con la decisión de `docs/18 §18.1` de no introducir FK directa en MVP.

### Indexes

* Reuso de `idx_notifications_user_status_sent (user_id, status, sent_at DESC)` para queries del surface (US-071).
* Reuso de `idx_notifications_user_unread (user_id) WHERE status='unread'` para badge UI (US-071).
* **Para la query de idempotencia** (`payload->>'task_id'`), Postgres no aprovecha índice físico por default. En MVP se acepta scan parcial filtrado por `user_id` + `type`. Si Tech Lead observa presión de performance en QA, evaluar índice GIN sobre `payload jsonb_path_ops` o índice expresivo `(user_id, type, (payload->>'task_id'))` en Future (Documentation Alignment con `docs/18 §18.1`).

### Constraints

Sin nuevos. No se introduce unique constraint en `notifications` (decisión D2). La idempotencia se garantiza por código.

### Migrations Impact

**Cero migraciones en US-034.**

### Seed Impact

* Confirmar que `prisma/seed/*` incluye al menos una tarea con `due_date = event_date - 7 días` para el evento demo principal (alineado con US-145).
* Si el seed no lo incluye hoy, agregar como Documentation Alignment con el seed strategy (`docs/11`). No bloqueante: el dataset demo puede ajustarse en el sprint de demo.

---

## 11. AI / PromptOps Design

`No aplica` — US-034 no invoca IA.

---

## 12. Security & Authorization Design

### Authentication

`No aplica` — job corre como sistema, sin sesión de usuario.

### Authorization

* Patrón sistema (`docs/19 §System actors`): no requiere middleware HTTP.
* Validación interna BR-NOTIF-005: la creación del `Notification` ejerce explícitamente `notification.user_id = event.owner_id`.

### Ownership Rules

* `event.owner_id` es la única fuente del `Notification.user_id` para `type='task_due_soon'`.
* Cualquier divergencia activa `InvariantViolation` y abort del chunk.

### Role Rules

`No aplica` directamente. El consumo del `Notification` por US-071 está limitado al destinatario.

### Negative Authorization Scenarios

* Auth: N/A en el job. Verificado a nivel surface (US-071/US-072).
* `user_id ≠ event.owner_id`: rechazado por el guard interno (test obligatorio).

### Audit Requirements

* No requiere `AdminAction` (no es acción administrativa).
* Auditoría por logs estructurados con `correlationId` (NFR-OBS-005).

### Sensitive Data Handling

* Logs deben contener exclusivamente: `correlationId`, `userId`, `taskId`, `eventId`, `dueDate`, `language`, `subject` localizado, `body` localizado (los strings localizados son plantillas no parametrizadas con datos sensibles del usuario; sólo incluyen el `dueDate`).
* Logs prohíben: `email`, `displayName`, `taskTitle`, `taskDescription`, `eventNotes`.
* Test de regresión obligatorio para verificar el formato del log.

---

## 13. Testing Strategy

### Unit Tests

* `EmitT7NotificationsUseCase` con `Clock` y repositorios mockeados:

  * UT-01: cuando hay 0 candidatas → `affected = 0`, sin INSERTs.
  * UT-02: cuando hay 3 candidatas → 3 chequeos de idempotencia + 6 INSERTs (3 in_app + 3 email_simulated) + 3 entradas log + 1 log resumen.
  * UT-03: cuando 2 candidatas ya tienen Notification previa → 1 chequeo positivo + 0 INSERTs para esas dos.
  * UT-04: resolución de `language_code`: usuario con `language_preference='pt'` → `Notification.language_code='pt'` y `lang=pt` para subject/body.
  * UT-05: usuario con `language_preference=null` → fallback a `event.language_code`.
  * UT-06: guard BR-NOTIF-005: si por bug `notification.user_id ≠ event.owner_id`, lanzar `InvariantViolation`.

### Integration Tests

* IT-01 (clock injectable): seed con 1 evento `active` + 1 tarea `pending` con `due_date = '2026-07-06'`; inyectar reloj a `now = 2026-06-29 08:00 America/Guatemala`; correr `EmitT7NotificationsUseCase`; assert 2 filas en `notifications` (`in_app` + `email_simulated`).
* IT-02 (idempotencia): correr el use case 2 veces; assert 2 filas (no 4).
* IT-03 (exclusión por estado de evento): seed con evento `draft`, `completed`, `cancelled` + tareas T-7; assert 0 filas creadas.
* IT-04 (exclusión por estado de tarea): seed con tareas `done` y `skipped` T-7; assert 0 filas.
* IT-05 (rango exacto T-7): seed con `due_date` en T-6 y T-8; assert 0 filas.
* IT-06 (aislamiento BR-NOTIF-005): seed con 2 organizers, ambos con eventos T-7; assert que cada `Notification.user_id` corresponde a su propio `event.owner_id`.
* IT-07 (sin `due_date`): seed con tarea sin `due_date`; assert 0 filas.
* IT-08 (timezone): seed con evento cuyo `due_date` representa T-7 en `America/Guatemala` pero T-6 en UTC; assert que el filtro SQL acepta la tarea cuando se inyecta `now` en `America/Guatemala`.

### API Tests

`No aplica` directamente (no hay endpoint nuevo). Las API tests del listado (`GET /api/v1/notifications`) se cubren en US-071.

### E2E Tests

* E2E-01 (referenciada en US-071): después de correr `EmitT7NotificationsJob` con clock injectable, el organizer ve el badge y la entrada en la lista. (Owner: US-071; se documenta aquí como handoff.)

### Security Tests

* SEC-T-01: el log `[EMAIL]` no contiene los strings `@`, `displayName`, ni el `taskTitle` original. Test de regresión que parsea el log y verifica el set de claves permitidas.
* SEC-T-02: BR-NOTIF-005 verificado por IT-06.

### Accessibility Tests

`No aplica` — la US no entrega UI. Accesibilidad cubierta en US-071.

### AI Tests

`No aplica`.

### Seed / Demo Tests

* SEED-T-01: tras seed + run del job con clock = `event_date - 7 días`, el organizer demo (`u_demo_organizer_1`) tiene al menos 1 `Notification(type='task_due_soon', channel='in_app')` (alineado con US-145).

### CI Checks

* Lint, type-check, tests (Vitest) deben pasar.
* Coverage objetivo: el módulo `notifications` cumple ≥50% (PB-P2-014 / US-118).

---

## 14. Observability & Audit

### Logs

* Por tarea procesada: log estructurado `[EMAIL]` (NFR-OBS-004).
* Por chunk fallido: log `error`.
* Al terminar el run: log resumen `affected=N` (NFR-OBS-005).

### Correlation ID

* `correlationId = job-emit-t7-${ISO8601(now)}` artificial al inicio del run, propagado a todos los logs del run (`docs/14 §23.2`).

### AdminAction

`No aplica` — el job no realiza acciones administrativas. (NFR-OBS-001 está fuera de scope.)

### Error Tracking

* Logs `error` estructurados se exportan vía el logger estándar (`docs/14 §logger setup`).
* Sin integración Sentry/APM en MVP (NFR-OBS-006).

### Metrics

* Sin Prometheus/OTel en MVP (alineado con `docs/10 §NFR-OBS-006` y decisión PB §4.4 US-115). El conteo `affected=N` por run sirve como métrica auditable vía log grep.

---

## 15. Seed / Demo Data Impact

### Seed Data Required

* Recomendado (no bloqueante): al menos 1 `EventTask` con `due_date = event_date - 7 días` para el evento demo principal del organizer `u_demo_organizer_1`. Esto permite que el demo en US-071 muestre una notificación T-7 visible.
* Si el seed actual no lo cumple, agregar Documentation Alignment con `docs/11 §Data Seed Strategy` y handoff a US-145 (`Seed/demo`).

### Demo Scenario Supported

* Demo del job: `pnpm run job:emit-t7 -- --clock 2026-07-06T08:00:00-06:00` (script de demo opcional) o inyección del `Clock` desde un endpoint admin gated por `SEED_DEMO_ENABLED` (Future).
* Para MVP: ejecutar el job real al horario natural usando un evento demo con `event_date = today + 14 días` (para que T-7 caiga en una fecha demo coherente).

### Reset / Isolation Notes

* `Notification.is_seed=true` opcionalmente para distinguir notificaciones generadas por demo vs. usuarios reales (alineado con `docs/18 §18.1` que ya incluye `is_seed`).
* `SeedResetJob` (`docs/14 §23.2`) puede limpiar `notifications WHERE is_seed=true` si así se decide; no se cambia su contrato en US-034.

---

## 16. Documentation Alignment Required

| Document / Source                                                  | Conflict                                                                                                                          | Current Decision                                                                                                                                                            | Recommended Action                                                                                                                                                                | Blocks Implementation? |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| `management/artifacts/4-Product-Backlog-Prioritized.md` (PB-P2-004) | `Traceability` declara `FR-NOTIF-004, FR-TASK-011`; los canónicos son `FR-TASK-010, FR-NOTIF-001, FR-NOTIF-003`.                  | US-034 corregida.                                                                                                                                                            | Actualizar Traceability del backlog item a IDs canónicos.                                                                                                                          | No                     |
| `docs/14 §23.2`                                                    | `EmitT7NotificationsJob` no listado.                                                                                              | Job formalizado con cron `0 8 * * *` `America/Guatemala` (D1).                                                                                                              | Agregar fila al inventario de jobs MVP con propósito, schedule, entidades, idempotencia y observabilidad.                                                                          | No                     |
| `docs/4 §BR-NOTIF-007`                                             | "Según corresponda" parcialmente abierto.                                                                                         | Para T-7 prevalece `User.language_preference` con fallback a `event.language_code` (D6).                                                                                    | Agregar nota clarificadora a BR-NOTIF-007.                                                                                                                                         | No                     |
| `docs/10 §NFR-OBS-004`                                             | Referencia errónea a `FR-NOTIF-002`.                                                                                              | `FR-NOTIF-003` es el FR canónico del email simulado.                                                                                                                        | Corregir cross-reference.                                                                                                                                                          | No                     |
| `docs/18 §18.1`                                                    | Sin conflicto. La idempotencia por código respeta la decisión vigente.                                                            | Sin cambio en MVP. Si Future requiere multi-proceso, agregar índice único parcial vía ADR.                                                                                  | Ninguna acción.                                                                                                                                                                    | No                     |

---

## 17. Technical Risks & Mitigations

| Risk                                                                                                  | Impact                                                                                       | Mitigation                                                                                                                                                                            |
| ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El proceso backend está caído al horario del cron del día T-7                                          | Notificaciones del día se pierden (no hay retry diferido)                                    | Riesgo aceptado (consistente con MVP best-effort). Documentado en `Notes` de la US. Future: cron de retry o backfill.                                                                |
| Performance del filtro `payload->>'task_id'` sin índice físico                                         | El chequeo de idempotencia escanea por `user_id + type` y luego filtra en memoria por payload | Filtrar primero por `user_id` y `type` (cubierto por `idx_notifications_user_status_sent`), luego evaluar payload. Si en QA aparece presión, agregar índice expresivo vía ADR/Future. |
| Race condition por overlap manual del scheduler                                                       | Inserciones duplicadas                                                                       | Single-process MVP (`docs/14 §23.1`) lo previene. Transacción por chunk + chequeo SELECT/INSERT en la misma conexión.                                                                |
| `language_preference` faltante o inválido                                                              | Notification con `language_code` ilegible                                                    | Fallback explícito a `event.language_code` (D6). Test UT-05.                                                                                                                          |
| Evento sin `event_date` o sin `owner_id`                                                              | Imposible calcular T-7 o destinatario                                                        | Filtro SQL ya exige `due_date IS NOT NULL`; `events.owner_id` y `events.event_date` son NOT NULL en schema. Ningún riesgo real.                                                       |
| Localización `subject`/`body` faltante para uno de los 4 locales                                       | Subject/body en idioma fallback                                                              | Reuso del catálogo `next-intl` / catálogo backend (alineado con US-007). Cobertura de los 4 locales en test UT-04.                                                                    |

---

## 18. Implementation Guidance for Coding Agents

### Archivos / carpetas impactados

```
backend/
  src/
    server.ts                                          # registrar el job al bootstrap
    jobs/
      emit-t7-notifications.job.ts                      # nuevo
    modules/
      notifications/
        application/
          use-cases/
            emit-t7-notifications.use-case.ts          # nuevo
            emit-t7-notifications.use-case.spec.ts     # nuevo
          adapters/
            simulated-email.adapter.ts                  # nuevo o existente; agregar logEmail si no existe
        infrastructure/
          repositories/
            notification.repository.ts                  # extender con existsTaskDueSoonForTask + create
        i18n/
          notifications.t7.<locale>.json                # 4 locales (en, es-LATAM, es-ES, pt)
      task-management/
        infrastructure/
          repositories/
            event-task.repository.ts                    # agregar findT7Candidates
      identity-access/
        infrastructure/
          repositories/
            user.repository.ts                          # agregar resolveLanguageCode si no existe
    shared/
      clock.ts                                          # SystemClock + interface Clock
prisma/
  seed/
    seed.ts                                             # (opcional) asegurar al menos 1 tarea T-7 demo
```

### Orden de implementación recomendado

1. `shared/clock.ts` + tests del `SystemClock`.
2. `NotificationRepository.existsTaskDueSoonForTask` + UT con DB ephemeral (testcontainers o Vitest + Prisma test client).
3. `EventTaskRepository.findT7Candidates` + UT.
4. `UserRepository.resolveLanguageCode` + UT.
5. `SimulatedEmailAdapter.logEmail` + UT (verificar formato del log, no-PII).
6. `EmitT7NotificationsUseCase` + UT-01..UT-06.
7. `EmitT7NotificationsJob` + IT-01..IT-08 (clock injectable).
8. Registro en `server.ts` (cron `0 8 * * *` con `timezone: 'America/Guatemala'`).
9. (Opcional) seed.

### Decisiones que no deben reabrirse

* Cron único en `America/Guatemala` (D1).
* No introducir `Event.timezone` ni `Location.timezone` (D1).
* No agregar unique constraint a `notifications` (D2).
* Igualdad exacta T-7 (D4).
* 1 in_app + 1 email_simulated + 1 log por tarea (D5).
* `User.language_preference` con fallback `event.language_code` (D6).
* Surface en US-071/US-072 (recorte de alcance formalizado en aprobación).

### Lo que no se debe implementar

* Endpoints `GET /api/v1/notifications` o `POST /api/v1/notifications/:id/read` (alcance US-071/US-072).
* Campanita, lista, badge, contador no leídas (alcance US-071).
* Tabla `notification_delivery_log` (Future).
* Retry diferido o cola persistente (Future).
* Multi-timezone (Future, requiere ADR).
* Integración SMTP real (Future).

### Asunciones a preservar

* Single backend process MVP.
* `EventTask.due_date` es `date` calendario.
* `event.status` controla la elegibilidad del evento (no `event.completed_at`).
* `notifications.payload` permanece JSONB sin schema rígido en DB (validación en código).

---

## 19. Task Generation Notes

### Suggested task groups

1. **Foundations** (Backend):

   * Crear puerto `Clock` y `SystemClock`.
   * Extender `NotificationRepository` (existsTaskDueSoonForTask, create con language_code).
   * Extender `EventTaskRepository` (findT7Candidates).
   * Extender `UserRepository` (resolveLanguageCode).
   * Implementar `SimulatedEmailAdapter.logEmail`.

2. **Use case** (Backend):

   * Implementar `EmitT7NotificationsUseCase` con la lógica de resolución, idempotencia, INSERTs y log.

3. **Job runner** (Backend + DevOps):

   * Implementar `EmitT7NotificationsJob` con `node-cron` y registrar en `src/server.ts` con `TZ=America/Guatemala`.

4. **i18n** (Backend):

   * Agregar catálogos `notifications.t7.<locale>.json` para `en`, `es-LATAM`, `es-ES`, `pt`.

5. **Testing**:

   * UT-01..UT-06 (use case con mocks).
   * IT-01..IT-08 (integration con clock injectable).
   * SEC-T-01..SEC-T-02 (no-PII y aislamiento).
   * SEED-T-01 (demo).

6. **Observability**:

   * Asegurar logger estructurado con `correlationId` propagado.
   * Verificar formato del log resumen `affected=N`.

7. **Documentation Alignment** (opcional, no bloqueante):

   * Actualizar `Traceability` de PB-P2-004.
   * Agregar `EmitT7NotificationsJob` a `docs/14 §23.2`.
   * Clarificar `BR-NOTIF-007` en `docs/4`.
   * Corregir cross-reference en `docs/10 §NFR-OBS-004`.

### Required QA tasks

* IT-01..IT-08 + UT-01..UT-06 + SEC-T-01..SEC-T-02 son obligatorias y deben correr en CI.

### Required security tasks

* Test de regresión que parsea el log estructurado y verifica que el set de claves permitidas coincide con la lista (sin `email`, `displayName`, `taskTitle`).

### Required seed/demo tasks

* Validar que el seed actual incluye o se ajusta para incluir 1 tarea T-7 demo. Si requiere cambio, abrir tarea menor de seed (handoff a US-145 si conviene).

### Required documentation tasks

* Documentation Alignment listada en §16 (opcional, no bloqueante).

### Dependencies between tasks

```
Clock → NotificationRepository.exists / create
Clock → EmitT7NotificationsUseCase
NotificationRepository.exists/create → EmitT7NotificationsUseCase
EventTaskRepository.findT7Candidates → EmitT7NotificationsUseCase
UserRepository.resolveLanguageCode → EmitT7NotificationsUseCase
SimulatedEmailAdapter.logEmail → EmitT7NotificationsUseCase
EmitT7NotificationsUseCase → EmitT7NotificationsJob
i18n catalogs → SimulatedEmailAdapter.logEmail (resolución de subject/body)
EmitT7NotificationsJob → tests IT-01..IT-08
```

### Consolidated tasks.md guidance

Sí: cuando ambas US del backlog item (US-034 + US-071) completen sus Development Tasks, generar un `tasks.md` consolidado a nivel `PB-P2-004` para facilitar la planificación de sprint, con prefijos `[US-034]` y `[US-071]` por tarea.

---

## 20. Technical Spec Readiness

| Check                                                    | Status |
| -------------------------------------------------------- | ------ |
| User Story approved or explicitly allowed for draft spec | Pass   |
| Product Backlog mapping found                            | Pass   |
| Decision Resolution reviewed if present                  | Pass   |
| Scope clear                                              | Pass   |
| Architecture alignment clear                             | Pass   |
| API impact clear                                         | N/A    |
| DB impact clear                                          | Pass   |
| AI impact clear                                          | N/A    |
| Security impact clear                                    | Pass   |
| Testing strategy clear                                   | Pass   |
| Ready for Development Task Breakdown                     | Yes    |

---

## 21. Final Recommendation

`Ready for Task Breakdown`

La Technical Specification incorpora las 6 decisiones formalizadas (D1–D6), define el contrato exacto del use case y del job, el contrato SQL para los repositorios, el catálogo i18n, la estrategia de testing con clock injectable, el detalle de no-PII en logs y el plan de implementación ordenado. No hay migraciones, no se reabren decisiones, no se introduce scope creep. Las 4 alineaciones documentales son no bloqueantes.

---

Technical Specification created: Yes
Path: `management/technical-specs/P2/PB-P2-004/US-034-technical-spec.md`
Status: Ready for Task Breakdown
Backlog ID: PB-P2-004
Execution Order: 4 (cuarto ítem de P2)
Next step: Run `eventflow-user-story-to-development-tasks`.

Product Backlog mapping: Found (PB-P2-004, P2, posición 1 de 2 — US-034 antes que US-071).
Decision Resolution artifact used: Yes (`management/user-stories/decision-resolutions/US-034-decision-resolution.md`).
Documentation alignment warnings: 4 ítems no bloqueantes (ver §16).
