# Technical Specification — US-015: El sistema cierra automáticamente mi evento 2 días después de la fecha

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-015 |
| Source User Story | management/user-stories/US-015-auto-complete-event-job.md |
| Decision Resolution Artifact | management/user-stories/decision-resolutions/US-015-decision-resolution.md (no existe — no fue necesario) |
| Priority | P1 |
| Backlog ID | PB-P1-009 |
| Backlog Title | Job AutoComplete del evento (T+2) |
| Backlog Execution Order | 27 (de 18 P0 + 9 P1) |
| User Story Position in Backlog Item | 1 de 1 |
| Related User Stories in Backlog Item | US-015 |
| Epic | EPIC-EVT-001 — Organizer Event Management |
| Backlog Item Dependencies | PB-P1-007 |
| Feature | Auto-completion job |
| Module / Domain | Events |
| User Story Status | Approved (with Minor Notes) |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-06-25 |
| Last Updated | 2026-06-25 |

---

## 2. Backlog Execution Context

### Product Backlog Item

PB-P1-009 contiene únicamente US-015. Sus dependencias declaradas son PB-P1-007 (ciclo de vida del evento, ya entregado: provee la transición a `completed` y los campos `auto_completed`, `completed_at`). La nota del backlog explicita que "las reseñas dependen de `completed`" — esta US habilita el prerequisito de PB-P1-038 (US-065 — crear reseña verificada), cuya ventana de 30 días sólo opera con `status='completed'`.

### Execution Order Rationale

US-015 es la única pieza de PB-P1-009 y se ejecuta en posición 27 de la cadena de prioridades. Es un job intra-proceso sin endpoints HTTP que reutiliza el repositorio y el índice parcial ya documentados; su única dependencia funcional satisfecha es PB-P1-007. No bloquea otras tareas P1 y debe completarse antes de iniciar tareas que dependan de `Event.status='completed'` (notablemente PB-P1-038).

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item | Suggested Order |
|---|---|---|
| US-015 | Job AutoComplete intra-proceso del evento T+2 | 1 |

---

## 3. Executive Technical Summary

Implementar `AutoCompletePastEventsJob` en el módulo `src/jobs/` con scheduler intra-proceso (`node-cron` o equivalente; ADR-BE-004), invocando `AutoCompletePastEventsUseCase` que utiliza `EventRepository.findExpiredActive(now)` para obtener los eventos `active` cuya `event_date + 2 días ≤ clock.today()` y aplica la transición a `completed` con `auto_completed=true` y `completed_at=clock.now()` por evento, en transacción corta. El `Clock` se inyecta desde `shared-kernel`. La idempotencia es estructural por el filtro SQL. La coordinación multi-instancia se garantiza con `JOBS_ENABLED=true` en exactamente una réplica. La cadencia por defecto es `00:30 UTC` diario, configurable vía variable de entorno. Sin endpoints HTTP, sin migraciones, sin IA, sin notificaciones, sin AdminAction. La observabilidad se cubre con logs estructurados (`job.autoComplete.start`/`end`/`error`) y un `correlationId=job-<runId>` único por ejecución. El surface UI se limita al badge "Completed" en el dashboard de US-014 con i18n para 4 locales.

---

## 4. Scope Boundary

### In Scope

* Módulo `src/jobs/AutoCompletePastEventsJob` (scheduler + handler).
* `AutoCompletePastEventsUseCase` en la capa de aplicación de `modules/events`.
* `EventRepository.findExpiredActive(now)` (si no existe en código).
* Transición persistente atómica por evento.
* `Clock` injectable consumido desde `shared-kernel`.
* Variables de entorno `JOBS_ENABLED` y `JOBS_AUTOCOMPLETE_CRON` (con default `30 0 * * *`).
* Logs estructurados `start`/`end`/`error` con `correlationId=job-<runId>`.
* Reuso del badge `EventStatusBadge` (variante `completed`) con i18n para 4 locales.
* Tests unit, integration y E2E smoke del badge.

### Out of Scope

* Notificación al organizador.
* Reactivación de eventos tras auto-complete.
* Conversión de evento a otro tipo.
* Migraciones DB nuevas, índices nuevos.
* Cron externo (Cloud Scheduler / Kubernetes CronJob).
* Colas (BullMQ, SQS, RabbitMQ).
* `AdminAction` por evento auto-completado.
* Cambios en el endpoint admin de eventos (US-016).
* Notificaciones / push / WhatsApp.

### Explicit Non-Goals

* No reabrir el modelo de `Event`.
* No introducir endpoints HTTP nuevos.
* No documentar un nuevo ADR (ADR-BE-004 es el aplicable).
* No registrar `AdminAction` para esta operación de sistema.

---

## 5. Architecture Alignment

### Backend Architecture

* Stack: Node.js + TypeScript + Prisma + PostgreSQL (`docs/14`, ADR-BE-001/002).
* Patrón: Modular Monolith con Clean Architecture (`docs/14`).
* Job: scheduler intra-proceso (ADR-BE-004); módulo `src/jobs/`.
* Use case: `AutoCompletePastEventsUseCase` en `modules/events/application/`.
* `Clock` inyectado desde `shared-kernel` (`docs/14` línea 449).

### Frontend Architecture

* Reuso de `EventStatusBadge` (Next.js + App Router, ADR-FE-001/002).
* i18n con next-intl para los 4 locales soportados.

### Database Architecture

* `events` table; sin cambios de esquema.
* Reuso del índice parcial `idx_events_auto_complete_candidates (event_date) WHERE status='active'` (`docs/18`).
* Campos `auto_completed`, `completed_at` ya existentes (`docs/18`).

### API Architecture

No aplica — esta US no introduce endpoints HTTP.

### AI / PromptOps Architecture

No aplica.

### Security Architecture

* Job ejecutado por el sistema; sin sesión, sin endpoint HTTP, sin RBAC.
* `JOBS_ENABLED=true` controla qué instancia programa el job en entornos multi-réplica (ADR-BE-004).
* Sin secretos nuevos en repositorio.

### Testing Architecture

* Vitest (unit + integration con DB de test).
* Playwright para E2E smoke del badge.
* `Clock` fake para determinismo.
* axe sobre el badge (cobertura mínima).

---

## 6. Functional Interpretation

| Acceptance Criterion | Technical Interpretation | Impacted Layer(s) |
|---|---|---|
| AC-01 Cierre automático | `findExpiredActive(now)` + `update` por evento; `affectedCount` reportado en log `end`. | Backend, DB, Observability |
| AC-02 Idempotencia | Filtro `status='active' AND event_date <= today - 2 days AND deleted_at IS NULL` por construcción excluye `completed`. | Backend |
| AC-03 Eventos excluidos | Filtro SQL VR-01..VR-03. | Backend, DB |
| AC-04 Clock injectable | `AutoCompletePastEventsUseCase(clock: Clock)`; el job inyecta `clock` real, los tests inyectan fake. | Backend, Testing |
| AC-05 Log start/end | `logger.info` en pre/post-procesamiento con campos canónicos. | Observability |
| AC-06 Badge surface | Frontend lee `event.status === 'completed'` y renderiza badge i18n. | Frontend, i18n |
| EC-01 Estados excluidos | Filtro SQL. | Backend |
| EC-02 Clock fake | Cobertura en tests unit + integration. | Testing |
| EC-03 Multi-instancia | Scheduler gated by `JOBS_ENABLED` env flag al arranque del proceso. | Backend, DevOps |
| EC-04 Falla parcial | `try/catch` por evento; `logger.error` con `eventId`; no aborta el job. | Backend, Observability |
| EC-05 Sin elegibles | Filtro devuelve set vacío; `affectedCount=0` en log `end`. | Backend, Observability |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

* `modules/events/application/AutoCompletePastEventsUseCase.ts` (nuevo).
* `modules/events/infrastructure/EventRepository.ts` (extender con `findExpiredActive` si no existe).
* `jobs/AutoCompletePastEventsJob.ts` (nuevo).
* `jobs/index.ts` (registrador único de jobs gated por `JOBS_ENABLED`).
* `shared-kernel/Clock.ts` (existente; consumir).

### Use Cases / Application Services

* `AutoCompletePastEventsUseCase`:
  * Dependencias: `EventRepository`, `Clock`, `Logger`.
  * Entrada: `runId: string` (generado por el job).
  * Salida: `{ affectedCount: number, errors: Array<{ eventId, message }> }`.
  * Lógica:
    1. Obtener `events = repo.findExpiredActive(clock.now())`.
    2. Para cada `event` en `events`: dentro de una transacción Prisma corta, `repo.markCompleted(event.id, { autoCompleted: true, completedAt: clock.now() })`; capturar errores por evento; loguear `error` con `runId`, `eventId`, `errorMessage`.
    3. Devolver el resumen.
  * Idempotente: las repeticiones no afectan eventos ya `completed`.

### Controllers / Routes

* `AutoCompletePastEventsJob`:
  * Construye `runId = 'job-' + uuid()`.
  * Loguea `job.autoComplete.start { runId, cadence: process.env.JOBS_AUTOCOMPLETE_CRON ?? '30 0 * * *', scheduledAt, clockNow: clock.now() }`.
  * Invoca el use case.
  * Loguea `job.autoComplete.end { runId, durationMs, affectedCount }`.
  * No relanza errores; los errores por evento van por el log `error` del use case.

### DTOs / Schemas

* No requiere DTO HTTP (no hay endpoint).
* Tipos internos: `ExpiredEventRow`, `AutoCompleteResult`.

### Repository / Persistence

* `EventRepository.findExpiredActive(now: Date): Promise<ExpiredEventRow[]>`:
  * Query Prisma: `where: { status: 'active', deletedAt: null, eventDate: { lte: subDays(now, 2) } }`.
  * Proyecta `{ id, eventDate }` para eficiencia (no requerimos resto del evento).
  * Hint para usar el índice parcial existente (Prisma lo selecciona automáticamente; verificar en TASK de validación).
* `EventRepository.markCompleted(eventId, { autoCompleted, completedAt })`:
  * `prisma.event.updateMany({ where: { id: eventId, status: 'active', deletedAt: null }, data: { status: 'completed', autoCompleted, completedAt } })`.
  * El `updateMany` con filtro defensivo evita race conditions en caso de transición concurrente.

### Validation Rules

* VR-01..VR-05 implementadas en SQL/use case (no en HTTP).

### Error Handling

* Por evento: capturar y loguear; continuar con el siguiente.
* Falla catastrófica (conexión a DB caída): loguear `error` a nivel job y permitir que el scheduler re-intente en la siguiente cadencia.

### Transactions

* Transacción corta por evento (`$transaction` con el `updateMany` + cualquier log de auditoría futuro).
* Sin batch update para preservar la atomicidad por evento.

### Observability

* `logger.info({ event: 'job.autoComplete.start', runId, cadence, scheduledAt, clockNow })`.
* `logger.info({ event: 'job.autoComplete.end', runId, durationMs, affectedCount })`.
* `logger.error({ event: 'job.autoComplete.error', runId, eventId, errorMessage })`.

---

## 8. Frontend Technical Design

### Routes / Pages

No aplica.

### Components

* `EventStatusBadge` con variante `completed` (i18n en `organizer.events.status.completed`).

### Forms

No aplica.

### State Management

* El badge se actualiza por el refresh natural del dashboard de US-014 (TanStack Query).

### Data Fetching

* Reuso del detalle del evento ya consumido en US-014.

### Loading / Empty / Error / Success States

* Sólo aplica el estado "Completed" en el badge.

### Accessibility

* Contraste suficiente y `aria-label` localizado para el badge.

### i18n

* 4 locales: `es-LATAM` (default), `es-ES`, `pt`, `en`.
* Verificar que las cadenas existen en cada catálogo.

---

## 9. API Contract Design

No aplica — US-015 no introduce endpoints HTTP.

---

## 10. Database / Prisma Design

### Models Impacted

* `Event` (lectura + actualización).

### Fields / Columns

* `Event.status` (lectura/escritura).
* `Event.event_date` (lectura).
* `Event.deleted_at` (lectura).
* `Event.auto_completed` (escritura).
* `Event.completed_at` (escritura).

### Relations

No se tocan relaciones.

### Indexes

* Reuso de `idx_events_auto_complete_candidates (event_date) WHERE status='active'` (`docs/18`).
* Sin índices nuevos.

### Constraints

* Enum `event_status` ya incluye `completed`.

### Migrations Impact

* Ninguna.

### Seed Impact

* Opcional: sembrar 1 evento `active` con `event_date = today - 3 días` para demo idempotente del job (no es bloqueante; puede verificarse en cobertura del seed).

---

## 11. AI / PromptOps Design

No aplica.

---

## 12. Security & Authorization Design

### Authentication

No aplica (sistema).

### Authorization

* `JOBS_ENABLED=true` gobierna el registro del scheduler; en `false` el job no se programa.

### Ownership Rules

No aplica.

### Role Rules

No aplica.

### Negative Authorization Scenarios

No aplica.

### Audit Requirements

* Logs estructurados cumplen NFR-OBS-005/006. Sin `AdminAction`.

### Sensitive Data Handling

* Sin datos sensibles. Sólo `id`, `eventDate` y campos de estado.

---

## 13. Testing Strategy

### Unit Tests

* `AutoCompletePastEventsUseCase`:
  * Procesa N eventos elegibles → `affectedCount=N`.
  * Idempotencia: segunda corrida con set vacío → `affectedCount=0`.
  * Falla por evento → captura, log `error`, sigue procesando.
  * `Clock` fake: distintos `clock.today()` producen distintos sets.
* `AutoCompletePastEventsJob`:
  * Emite logs `start`/`end` con campos canónicos.
  * `JOBS_ENABLED=false` → el job no se registra (test de bootstrap).

### Integration Tests

* `EventRepository.findExpiredActive` contra DB de test: filtra por `status`, `event_date`, `deleted_at`.
* `EventRepository.markCompleted`: aplica los tres campos atómicamente y respeta el filtro defensivo (race condition).
* End-to-end del use case con DB sembrada y `Clock` fake; verificar uso del índice (`EXPLAIN`) en al menos un test.

### API Tests

No aplica.

### E2E Tests

* Smoke: dado un evento auto-completado por el job, el dashboard de US-014 muestra el badge "Completed" en los 4 locales.

### Security Tests

* Verificar que no existe endpoint HTTP que dispare el job (sólo scheduler).
* Verificar que con `JOBS_ENABLED=false` no se programa.

### Accessibility Tests

* axe sobre la página con badge `Completed`.

### AI Tests

No aplica.

### Seed / Demo Tests

* Verificación de que el seed cuenta con escenarios necesarios para los tests (o se generan en setup).

### CI Checks

* Pipeline existente: lint, typecheck, unit, integration. Sin pipeline nuevo.

---

## 14. Observability & Audit

### Logs

* `job.autoComplete.start`: `{ runId, cadence, scheduledAt, clockNow }`.
* `job.autoComplete.end`: `{ runId, durationMs, affectedCount }`.
* `job.autoComplete.error`: `{ runId, eventId, errorMessage }`.

### Correlation ID

* `runId` único por ejecución (`correlationId=job-<runId>`). Propagado a los logs por evento.

### AdminAction

* No aplica.

### Error Tracking

* Reuso del sink existente.

### Metrics

* No requiere métricas dedicadas en MVP; los logs estructurados permiten contar ejecuciones y `affectedCount` aggregados.

---

## 15. Seed / Demo Data Impact

### Seed Data Required

* Opcional: 1 evento `active` con `event_date = today - 3 días` para validar el job en demo.

### Demo Scenario Supported

* Al correr el job en el entorno de demo, el evento pasa a `completed` y el dashboard de US-014 muestra el badge.

### Reset / Isolation Notes

* Sin notas adicionales.

---

## 16. Documentation Alignment Required

| Document / Source | Conflict | Current Decision | Recommended Action | Blocks Implementation? |
|---|---|---|---|---|
| `management/artifacts/4-Product-Backlog-Prioritized.md` (PB-P1-009) | Traceability declarada `FR-EVENT-012 · UC-EVENT-007` incorrecta. | US-015 usa `FR-EVENT-009 · UC-EVENT-005`. | Housekeeping del backlog (puede extenderse al PR de US-013/US-014). | No |
| `docs/14-Backend-Technical-Design.md` línea 1404 (`0 * * * *`) vs PB-P1-009/US-015 (`00:30 UTC` diario). | Cadencia diferente entre fuentes. | Cadencia configurable; default `30 0 * * *`. | Aclarar en `docs/14` que la cadencia es parámetro operativo. | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Multi-instancia ejecuta el job dos veces | Idempotencia + waste de recursos | `JOBS_ENABLED=true` en una sola réplica (ADR-BE-004); idempotencia estructural por filtro SQL |
| `event_date` y zona horaria del servidor difieren del default del PO | Eventos elegibles erróneos | `event_date` es `date`; `clock.today()` se calcula en UTC; documentar en operación |
| Falla en un evento aborta el batch | Eventos no procesados | Procesamiento por evento con try/catch; siguen los demás |
| Índice no es utilizado por el planner | Performance pobre con datasets grandes | `EXPLAIN` en test de integración; el índice parcial es muy específico, el optimizador lo elige |
| `EventRepository.findExpiredActive` no existe aún en código | Bloqueo de la spec | Crear como parte de las tareas BE de US-015; `docs/14` lo documenta como esperado |

---

## 18. Implementation Guidance for Coding Agents

### Files or folders likely impacted

* Backend:
  * `apps/api/src/jobs/AutoCompletePastEventsJob.ts` (nuevo).
  * `apps/api/src/jobs/index.ts` (registrador gated por `JOBS_ENABLED`).
  * `apps/api/src/modules/events/application/AutoCompletePastEventsUseCase.ts` (nuevo).
  * `apps/api/src/modules/events/infrastructure/EventRepository.ts` (`findExpiredActive`, `markCompleted`).
  * `apps/api/src/shared-kernel/Clock.ts` (verificar; ya documentado).
  * `apps/api/src/config/env.ts` (añadir `JOBS_ENABLED`, `JOBS_AUTOCOMPLETE_CRON`).
* Frontend:
  * `apps/web/components/events/EventStatusBadge.tsx` (verificar variante `completed`).
  * `apps/web/messages/{es-LATAM,es-ES,pt,en}/organizer.json` (clave `events.status.completed`).
* Tests:
  * `apps/api/tests/jobs/auto-complete-past-events.job.spec.ts`.
  * `apps/api/tests/modules/events/auto-complete-past-events.use-case.spec.ts`.
  * `apps/api/tests/modules/events/event-repository.find-expired-active.spec.ts`.
  * `apps/web/tests/e2e/event-status-completed-badge.spec.ts`.
* Documentación:
  * Actualizar `docs/14` (cadencia configurable) y backlog (housekeeping).

> Las rutas reflejan la convención EventFlow. Si la estructura difiere, mantener los mismos roles semánticos.

### Recommended order of implementation

1. Backend: `EventRepository.findExpiredActive` + `markCompleted` + tests integration.
2. Backend: `AutoCompletePastEventsUseCase` + tests unit con `Clock` fake.
3. Backend: `AutoCompletePastEventsJob` + registrador gated por `JOBS_ENABLED` + tests bootstrap.
4. Backend: logs estructurados.
5. Frontend: i18n del badge `completed`.
6. E2E + accesibilidad mínima.
7. Documentación operativa y housekeeping del backlog.

### Decisions that must not be reopened

* Scheduler intra-proceso (no colas; ADR-BE-004).
* Sin endpoints HTTP para disparar el job.
* Idempotencia por filtro SQL (no por lock distribuido).
* Multi-instancia gated por `JOBS_ENABLED`.
* Logs estructurados como observabilidad oficial (no `AdminAction`).

### What must not be implemented

* Notificación al organizador.
* Cron externo (Cloud Scheduler / Kubernetes CronJob).
* Colas (BullMQ, SQS).
* `AdminAction` por evento auto-completado.

### Assumptions to preserve

* `event_date` es `date`; la regla son 2 días calendario.
* Cadencia configurable; default `30 0 * * *` (00:30 UTC diario).
* `Clock` injectable en use case y job para tests deterministas.

---

## 19. Task Generation Notes

### Suggested task groups

* DB: validación de uso del índice parcial existente (sin migración).
* BE: `findExpiredActive`, `markCompleted`, `AutoCompletePastEventsUseCase`, `AutoCompletePastEventsJob`, env config, logs.
* SEC: tests de no-endpoint y de `JOBS_ENABLED`.
* FE: i18n badge `completed`.
* OBS: logs `start`/`end`/`error` con correlationId por runId.
* QA: unit, integration, E2E smoke, accesibilidad mínima del badge.
* SEED: verificación/sembrar evento elegible para demo.
* OPS: variables de entorno y operatoria `JOBS_ENABLED` en exactamente una réplica.
* DOC: actualizar `docs/14` (cadencia configurable) y extender housekeeping de traceability del backlog (PB-P1-009) compartido con US-013/US-014.

### Required QA tasks

* TS-01..TS-06, NT-01..NT-06, AUTH-TS-01, accesibilidad básica del badge.

### Required security tasks

* Verificar ausencia de endpoint y comportamiento con `JOBS_ENABLED=false`.

### Required seed/demo tasks

* Verificación; sembrar opcionalmente un evento elegible.

### Required documentation tasks

* `docs/14` (cadencia configurable), `management/artifacts/4-Product-Backlog-Prioritized.md` (traceability PB-P1-009).

### Dependencies between tasks

* DB → BE repository → BE use case → BE job → OBS → QA.
* FE i18n + E2E pueden paralelizarse después de QA integration.

### Consolidated `tasks.md` for the parent backlog item

No requerido (PB-P1-009 contiene una sola US).

---

## 20. Technical Spec Readiness

| Check | Status |
|---|---|
| User Story approved or explicitly allowed for draft spec | Pass |
| Product Backlog mapping found | Pass |
| Decision Resolution reviewed if present | N/A |
| Scope clear | Pass |
| Architecture alignment clear | Pass |
| API impact clear | N/A |
| DB impact clear | Pass |
| AI impact clear | N/A |
| Security impact clear | Pass |
| Testing strategy clear | Pass |
| Ready for Development Task Breakdown | Yes |

---

## 21. Final Recommendation

`Ready for Task Breakdown`.

La spec resuelve el alcance técnico completo dentro de ADR-BE-004 y `docs/14`, sin introducir endpoints, migraciones, colas, IA ni `AdminAction`. La idempotencia es estructural por filtro SQL, el `Clock` injectable habilita pruebas deterministas y `JOBS_ENABLED` gobierna multi-instancia. Las observaciones de alineación documental son no bloqueantes y se cubren con tareas DOC.
