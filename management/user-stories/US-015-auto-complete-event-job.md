# 🧾 User Story: El sistema cierra automáticamente mi evento 2 días después de la fecha

## 🆔 Metadata

| Field              | Value                                |
| ------------------ | ------------------------------------ |
| ID                 | US-015                               |
| Epic               | EPIC-EVT-001 — Organizer Event Management |
| Backlog Item       | PB-P1-009 — Job AutoComplete del evento (T+2) |
| Feature            | Auto-completion job                  |
| Module / Domain    | Events                               |
| User Role          | System                               |
| Priority           | Must Have                            |
| Status             | Approved                             |
| Owner              | Product Owner / Business Analyst     |
| Approved By        | PO/BA Review                         |
| Approval Date      | 2026-06-25                           |
| Ready for Development Tasks | Yes                         |
| Sprint / Milestone | MVP                                  |
| Created Date       | 2026-06-09                           |
| Last Updated       | 2026-06-25                           |

---

## 🎯 User Story

**As the** sistema EventFlow
**I want** cerrar automáticamente eventos `active` 2 días calendario después de su `event_date`
**So that** los eventos pasen a estado `completed` con `auto_completed=true` y `completed_at` registrado, habilitando reseñas verificadas (PB-P1-038 / US-065) y métricas operativas precisas

---

## 🧠 Business Context

### Context Summary

El cierre automático (Decisión PO 8.1 #6) garantiza que los eventos pasados se marquen como `completed`, habilitando reseñas verificadas (la ventana de 30 días para reseñar exige `status='completed'`) y métricas correctas. Es un job intra-proceso (ADR-BE-004) con `Clock` injectable para pruebas, idempotente y observable mediante logs estructurados.

### Related Domain Concepts

* Job programado intra-proceso (sin colas externas en MVP, ADR-BE-004).
* `Clock` injectable del `shared-kernel`.
* Transición de estado `active → completed` con `auto_completed=true` y `completed_at` (BR-EVENT-013).
* Pre-requisito para PB-P1-038 (US-065 — crear reseña verificada).

### Assumptions

* `event_date` se almacena como `date` (no `timestamptz`); la regla son 2 días calendario completos.
* La hora del job es operacional; el horario default es `00:30 UTC` (declarado en PB-P1-009 Acceptance Summary) y debe ser configurable por variable de entorno para permitir cadencias intra-día durante incidentes o para alinearse con la frecuencia documentada en `docs/14` (`0 * * * *` configurable). La cadencia exacta es un parámetro operativo, no un cambio funcional.
* El flag `JOBS_ENABLED=true` (ADR-BE-004) asegura una sola instancia ejecutora cuando hay réplicas.

### Dependencies

* PB-P1-007 (ciclo de vida del evento — provee transición a `completed`, según el backlog item PB-P1-009).
* US-009 (creación de eventos).
* Habilita PB-P1-038 (US-065 — reseñas verificadas).

---

## 🔗 Traceability

| Source                 | Reference                                                                                |
| ---------------------- | ---------------------------------------------------------------------------------------- |
| FRD Requirement(s)     | FR-EVENT-009                                                                             |
| Use Case(s)            | UC-EVENT-005 — Cambiar estado del evento (transición auto-complete)                      |
| Business Rule(s)       | BR-EVENT-013                                                                             |
| Permission Rule(s)     | Sistema (ejecución del job; sin sesión de usuario)                                        |
| Data Entity / Entities | Event                                                                                    |
| API Endpoint(s)        | No aplica (job interno intra-proceso)                                                    |
| NFR Reference(s)       | NFR-REL-005 (existencia del job), NFR-DATA-002 (integridad T+2), NFR-OBS-005 (registro de cambios de estado críticos), NFR-OBS-006 (logging estructurado a stdout) |
| Related ADR(s)         | ADR-BE-001 (Node + Express + TS), ADR-BE-002 (Prisma), ADR-BE-004 (Simple Scheduled Jobs sin colas), ADR-API-004 (correlation id) |
| Related Document(s)    | `docs/8.1-Product-Owner-Decisions-Use-Cases-Addendum.md` (#6), `docs/14-Backend-Technical-Design.md` (módulo `jobs/`, `Clock`, `EventRepository.findExpiredActive`), `docs/18-Database-Physical-Design.md` (índice parcial existente) |
| Backlog Item           | PB-P1-009                                                                                |

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: In Scope
* MVP Relevance: Must Have

### Explicitly Out of Scope

* Notificación al organizador del cierre automático (cubierto por EPIC-NOT-001 si aplica en otra US).
* Reactivación de eventos tras auto-complete.
* Conversión de evento a otro tipo.
* Migración nueva en base de datos (los campos `auto_completed`, `completed_at` y el índice parcial `idx_events_auto_complete_candidates` ya existen).
* Cron externo (Cloud Scheduler / Kubernetes CronJob): ADR-BE-004 establece scheduler intra-proceso.
* Adopción de colas (BullMQ, SQS, RabbitMQ).
* `AdminAction` adicional: el cambio se registra vía logs estructurados (NFR-OBS-005/006); no se introduce auditoría administrativa por usuario.

### Scope Notes

* Una sola transición de estado: `active → completed` con `auto_completed=true` y `completed_at = clock.now()`.
* Idempotente por construcción del filtro `WHERE status='active' AND event_date <= now()::date - INTERVAL '2 days'`.
* Coordinación multi-instancia mediante `JOBS_ENABLED=true` en una sola réplica (ADR-BE-004).

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Cierre automático

**Given** uno o más eventos en `status='active'` con `event_date <= (clock.today() - INTERVAL 2 DAY)` y `deleted_at IS NULL`
**When** corre `AutoCompletePastEventsJob`
**Then** cada evento pasa a `status='completed'`, `auto_completed=true`, `completed_at = clock.now()`, y se emite un log estructurado por ejecución con `event: job.autoComplete.end`, `affectedCount`, `correlationId=job-<runId>`.

### AC-02: Idempotencia

**Given** el job corre dos veces el mismo día (o varias veces dentro de la cadencia configurada)
**When** se vuelven a evaluar eventos ya `completed`
**Then** ninguno cambia de estado, `affectedCount=0` en la segunda corrida y no se duplican logs por evento.

### AC-03: Eventos excluidos

**Given** eventos en `status` ∈ `{draft, cancelled, completed}` o con `deleted_at IS NOT NULL`
**When** corre el job
**Then** quedan fuera del set procesado (ver EC-01).

### AC-04: Clock injectable

**Given** un test que inyecta un `Clock` controlado con una fecha simulada
**When** ejecuta `AutoCompletePastEventsUseCase` con esa fecha
**Then** el comportamiento es determinista y no depende del reloj del sistema.

### AC-05: Log de inicio y fin

**Given** una ejecución del job
**When** comienza y termina
**Then** se emiten exactamente dos logs estructurados: `job.autoComplete.start` y `job.autoComplete.end` con `correlationId`, `runId`, `cadence`, `durationMs` y `affectedCount`.

### AC-06: Surface del badge en frontend

**Given** un evento que pasó a `completed` con `auto_completed=true`
**When** el dueño abre el dashboard del evento (US-014)
**Then** ve el badge "Completed" con `i18n` en los 4 locales (`es-LATAM`, `es-ES`, `pt`, `en`).

---

## ⚠️ Edge Cases

### EC-01: Evento `cancelled`, `draft` o `completed`

**Given** un evento en cualquiera de esos estados
**When** corre el job
**Then** es ignorado por el filtro `WHERE status='active'`.

#### Handling

* Filtro SQL `status='active'` y `deleted_at IS NULL`.

### EC-02: Clock injectable en tests

**Given** un test con `Clock` controlado
**When** corre `AutoCompletePastEventsUseCase`
**Then** completa exactamente los eventos cuya `event_date + 2 días ≤ clock.today()`.

#### Handling

* Inyectar `Clock` del `shared-kernel` (`docs/14` línea 449).

### EC-03: Múltiples réplicas backend

**Given** N réplicas del backend
**When** el scheduler intra-proceso podría dispararse en varias
**Then** sólo la instancia con `JOBS_ENABLED=true` ejecuta el job; las demás no programan ni ejecutan `AutoCompletePastEventsJob`.

#### Handling

* Variable de entorno `JOBS_ENABLED` (ADR-BE-004). Documentación operativa explícita en DevOps.

### EC-04: Falla parcial durante el batch

**Given** una falla transitoria al actualizar un evento dentro del batch
**When** ocurre el error
**Then** se registra `event: job.autoComplete.error` con `eventId` y `correlationId`; el evento problemático se omite (sigue `active` para la próxima corrida) y los demás se completan. El job NO aborta y `affectedCount` refleja sólo los procesados con éxito.

#### Handling

* Procesar evento por evento dentro de una transacción corta; capturar y loguear errores por evento.

### EC-05: Sin eventos elegibles

**Given** no hay eventos elegibles
**When** corre el job
**Then** se emite `start`/`end` con `affectedCount=0` y duración baja; no se emite error.

---

## 🚫 Validation Rules

| ID    | Rule                                                                          | Message / Behavior                            |
| ----- | ----------------------------------------------------------------------------- | --------------------------------------------- |
| VR-01 | `event_date <= (clock.today() - INTERVAL 2 DAY)`                              | Selecciona evento                             |
| VR-02 | `status = 'active'`                                                           | Sólo eventos `active`                         |
| VR-03 | `deleted_at IS NULL`                                                          | Excluye eventos soft-deleted                  |
| VR-04 | Actualización setea `status='completed'`, `auto_completed=true`, `completed_at=clock.now()` | Transición atómica por evento     |
| VR-05 | `JOBS_ENABLED=true` requerido para registrar el scheduler                     | Si `false`, el job no se programa             |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                                  |
| ------ | ------------------------------------------------------------------------------------- |
| SEC-01 | Job ejecutado por el sistema, sin sesión de usuario ni cookie.                        |
| SEC-02 | Log estructurado con `correlationId=job-<runId>` por ejecución (NFR-OBS-005/006).      |
| SEC-03 | El job no expone ningún endpoint HTTP. No se requiere RBAC.                            |
| SEC-04 | Variables de entorno (`JOBS_ENABLED`, cadencia) gestionadas por DevOps; no se introducen secretos. |

### Negative Authorization Scenarios

* No aplica (sin usuario y sin endpoint expuesto).

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

| Area                | Notes                                                          |
| ------------------- | -------------------------------------------------------------- |
| Screen / Route      | No aplica (job interno)                                        |
| Main UI Pattern     | Surface: badge "Completed" en el dashboard del evento (US-014). |
| Primary Action      | No aplica                                                      |
| Secondary Actions   | No aplica                                                      |
| Empty State         | No aplica                                                      |
| Loading State       | No aplica                                                      |
| Error State         | No aplica                                                      |
| Success State       | Badge "Completed" visible cuando `event.status='completed'`.    |
| Accessibility Notes | El badge usa contraste suficiente y `aria-label` localizado.    |
| Responsive Notes    | No aplica                                                      |
| i18n Notes          | Etiqueta del badge traducida en los 4 locales soportados.       |
| Currency Notes      | No aplica                                                      |

---

## 🛠 Technical Notes

### Frontend

* Route / Page:
  * No aplica.
* Components:
  * `EventStatusBadge` — variante "completed" (reusable; ya existe o se ajusta).
* State Management:
  * El badge se actualiza por el refresh natural del dashboard (TanStack Query, ver US-014).
* Forms: No aplica.
* API Client: No aplica.

### Backend

* Use Case / Service:
  * `AutoCompletePastEventsUseCase` (nombre canónico de `docs/14`).
  * Job: `AutoCompletePastEventsJob` registrado en módulo `src/jobs/`.
* Controller / Route:
  * Scheduler intra-proceso (`node-cron` o equivalente; ADR-BE-004 + `docs/14`).
* Authorization Policy:
  * System.
* Validation:
  * Filtros SQL VR-01..VR-03; transacción corta por evento o por batch (VR-04).
* Transaction Required:
  * Sí (por evento o por batch, garantizando atomicidad de los tres campos).
* Repository:
  * Reusar `EventRepository.findExpiredActive(now)` ya documentado en `docs/14`.

### Database

* Main Tables:
  * `events`.
* Constraints:
  * Enum `event_status` incluye `completed` (existente).
  * Campos `auto_completed` (boolean default false), `completed_at` (timestamptz nullable) ya existentes (`docs/18`).
* Index Considerations:
  * Reusar índice parcial existente `idx_events_auto_complete_candidates (event_date) WHERE status='active'`. No se requiere migración.

### API

| Method | Endpoint                          | Purpose            |
| ------ | --------------------------------- | ------------------ |
| —      | Job intra-proceso                 | Auto completion    |

### Observability / Audit

* Correlation ID Required: Yes (`correlationId=job-<runId>`; ADR-API-004 análogo para identificar ejecuciones del job).
* Log Event Required: Yes:
  * `job.autoComplete.start`: `{ runId, cadence, scheduledAt, clockNow }`.
  * `job.autoComplete.end`: `{ runId, durationMs, affectedCount }`.
  * `job.autoComplete.error`: `{ runId, eventId, errorMessage }` para fallas por evento.
* AdminAction Required: No (NFR-OBS-005 satisfecho con logs estructurados).
* AIRecommendation Required: No.

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                              | Type        |
| ----- | ----------------------------------------------------- | ----------- |
| TS-01 | Job completa eventos atrasados con `Clock` simulado    | Integration |
| TS-02 | Idempotencia: segunda corrida no afecta eventos ya `completed` | Integration |
| TS-03 | `Clock` injectable: dado `clock.today()` ficticio, sólo se procesan los elegibles | Unit |
| TS-04 | Multi-instancia: réplica con `JOBS_ENABLED=false` no programa el job | Unit (config) |
| TS-05 | Log estructurado `start` + `end` con `affectedCount` correcto | Integration |
| TS-06 | Cobertura del badge "Completed" en dashboard (i18n 4 locales) | E2E (smoke) |

### Negative Tests

| ID    | Scenario                              | Expected Result          |
| ----- | ------------------------------------- | ------------------------ |
| NT-01 | Evento `cancelled`                    | Ignorado                 |
| NT-02 | Evento `draft`                        | Ignorado                 |
| NT-03 | Evento `completed`                    | Ignorado                 |
| NT-04 | Evento futuro                         | Ignorado                 |
| NT-05 | Evento soft-deleted (`deleted_at IS NOT NULL`) | Ignorado          |
| NT-06 | Falla transitoria al actualizar 1 evento | El job continúa; loguea `error` con `eventId`; los demás se completan |

### AI Tests

Not applicable for this story.

### Authorization Tests

| ID         | Scenario           | Expected Result |
| ---------- | ------------------ | --------------- |
| AUTH-TS-01 | Sistema ejecuta job (instancia con `JOBS_ENABLED=true`) | Success |

### Accessibility Tests

* `EventStatusBadge` "Completed" con contraste y `aria-label` localizado.

---

## 📊 Business Impact

| Field               | Value                                                |
| ------------------- | ---------------------------------------------------- |
| KPI Affected        | Reseñas verificadas habilitadas (PB-P1-038); métricas operativas precisas |
| Expected Impact     | Cierre limpio sin intervención manual                |
| Success Criteria    | 100% de eventos elegibles se cierran dentro de la siguiente ejecución del job (≤ 24h con cadencia diaria; ≤ 1h con cadencia horaria) |
| Academic Demo Value | Demuestra automatización con `Clock` injectable y logs estructurados |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks

* Asegurar variante "completed" en `EventStatusBadge` con i18n para 4 locales.

### Potential Backend Tasks

* `AutoCompletePastEventsUseCase` (transición y persistencia).
* Registro de `AutoCompletePastEventsJob` en módulo `src/jobs/` con scheduler y `Clock` inyectado.
* `EventRepository.findExpiredActive(now)` (si no existe aún, crear; `docs/14` lo documenta como disponible).
* Logging estructurado `start`/`end`/`error`.

### Potential Database Tasks

* Verificación del uso del índice parcial existente; sin migración.

### Potential AI / PromptOps Tasks

* Not applicable for this story.

### Potential QA Tasks

* Tests integration con DB de test + `Clock` injectado.
* Tests unit para `Clock` y para idempotencia.
* E2E smoke del badge "Completed" en dashboard.

### Potential DevOps / Config Tasks

* Asegurar `JOBS_ENABLED=true` en exactamente una réplica.
* Variable de entorno para la cadencia (default `00:30 UTC` diario; configurable a `0 * * * *` si DevOps lo decide).

---

## ✅ Definition of Ready

* [x] Rol claro (System).
* [x] Goal/valor claros.
* [x] FRD/UC/BR enlazados (corregidos).
* [x] Permisos identificados (sistema; sin endpoint expuesto).
* [x] Entidades listadas.
* [x] AC en GWT.
* [x] Edge cases documentados (incluye multi-instancia, falla parcial, sin elegibles).
* [x] Validación clara.
* [x] Out of Scope explícito.
* [x] Dependencias conocidas.
* [x] UX states identificados (badge surface).
* [x] API definida (no aplica; documentado).
* [x] Tests definidos.
* [ ] PO/BA validó.

---

## 🏁 Definition of Done

* [ ] `AutoCompletePastEventsJob` operativo con `Clock` injectado.
* [ ] Cadencia configurable; default `00:30 UTC` diario.
* [ ] `JOBS_ENABLED=true` aplicado a una sola réplica.
* [ ] Logs estructurados `start`/`end`/`error`.
* [ ] Tests unit + integration con `Clock` controlado + idempotencia + multi-instancia.
* [ ] Badge "Completed" visible en dashboard con i18n.
* [ ] PO valida.

---

## 📝 Notes

* Documentation Alignment Required (no bloqueante): `docs/14-Backend-Technical-Design.md` (línea 1404) documenta cadencia `0 * * * *` (cada 1 h) configurable, mientras que PB-P1-009 (Acceptance Summary) y esta US declaran default `00:30 UTC` diario. Ambas son válidas y no entran en conflicto con la decisión PO 8.1 #6; se debe documentar en operación que la cadencia es un parámetro y registrar el valor real en el log `start`.
* Documentation Alignment Required (no bloqueante): la traceability declarada en PB-P1-009 (`FR-EVENT-012 · UC-EVENT-007`) no coincide con los IDs reales (`FR-EVENT-009 · UC-EVENT-005`). Recomendada una tarea de housekeeping del backlog.
