# 🧾 User Story: Job diario `ExpireQuoteRequestsJob` (30 días sin respuesta)

## 🆔 Metadata

| Field              | Value                                                                       |
| ------------------ | --------------------------------------------------------------------------- |
| ID                 | US-055                                                                      |
| Backlog Item       | PB-P1-033 — Jobs de expiración QR / Quote                                   |
| Epic               | EPIC-QR-001                                                                 |
| Feature            | `ExpireQuoteRequestsJob` con `ClockPort` injectable + reconciliación de horario con US-053 |
| Module / Domain    | Quotes                                                                      |
| User Role          | Sistema                                                                     |
| Priority           | Must Have                                                                   |
| Status             | Approved                                                                    |
| Owner              | Product Owner / Business Analyst                                            |
| Sprint / Milestone | MVP                                                                         |
| Created Date       | 2026-06-09                                                                  |
| Last Updated       | 2026-06-28                                                                  |
| Approved By        | PO/BA Review                                                                |
| Approval Date      | 2026-06-28                                                                  |
| Ready for Development Tasks | Yes                                                                 |

---

## 🎯 User Story

**As the** sistema EventFlow
**I want** un `ExpireQuoteRequestsJob` diario a las 01:00 UTC que marque como `expired` las QuoteRequests con `status IN ('sent','viewed')` cuyo `sent_at` esté a más de 30 días, y reconciliar el horario del `ExpireQuotesJob` (US-053) al mismo cron
**So that** el ciclo de vida de las QRs se cierre automáticamente sin estados zombies

---

## 🧠 Business Context

### Context Summary

US-055 cubre exclusivamente la expiración automática de `QuoteRequest`. El caso `Quote` ya fue entregado por US-053 (`ExpireQuotesJob` + refactor en US-054 para usar `QuoteNotificationService`). Esta US:

1. **Introduce** `ExpireQuoteRequestsJob` + `ExpireQuoteRequestsUseCase` con batching idempotente (paridad US-053 D5).
2. **Reconcilia el horario**: ambos jobs ahora corren a las **01:00 UTC con jitter ±5min** (refactor del cron de US-053 de `5 0 * * *` a `0 1 * * *`).
3. **Introduce `ClockPort`** (`LocalClockAdapter` prod + `FrozenClockAdapter` tests) para determinismo en tests y reuso en futuros jobs.
4. **Sin notificación** por QR expirada en MVP (BR-NOTIF-002 no lo exige).

### PO/BA Decisions Applied

| #  | Decisión                                                                                                                                                                                                                                       |
| -- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1 | Scope: sólo `ExpireQuoteRequestsJob` nuevo. `ExpireQuotesJob` se reusa de US-053 (sólo se actualiza el cron).                                                                                                                                  |
| D2 | Horario unificado: ambos jobs a **01:00 UTC** con jitter ±5min. Refactor del cron de US-053 (`5 0 * * *` → `0 1 * * *`).                                                                                                                       |
| D3 | `QR_EXPIRATION_DAYS = 30` días desde `sent_at`. Configurable via env `QR_EXPIRATION_DAYS=30` con default en código.                                                                                                                            |
| D4 | Transición sólo desde `status IN ('sent','viewed')` a `'expired'`. Otros estados no se tocan.                                                                                                                                                  |
| D5 | Sin notificación por QR expirada en MVP. BR-NOTIF-002 no la exige.                                                                                                                                                                            |
| D6 | `ClockPort` con `LocalClockAdapter` (prod) y `FrozenClockAdapter` (tests). Inyectado vía DI.                                                                                                                                                  |
| D7 | Filtro SQL: `WHERE status IN ('sent','viewed') AND sent_at < $clock_now::date - INTERVAL '30 days'`. Paridad de batching + `FOR UPDATE SKIP LOCKED` con US-053.                                                                              |

### Related Domain Concepts

* `quote_requests.status='expired'`, `quote_requests.sent_at`, `expires_at`.
* `ClockPort` (nuevo).
* Scheduler unificado (cron 01:00 UTC).

### Assumptions

* `sent_at` se asigna al crear la QR (US-049).
* PostgreSQL maneja TZ del job en UTC.

### Dependencies

* US-049 (creación de QR con `sent_at`).
* US-053 (job patrón + scheduler bootstrap).
* PB-P0-001 (schema + índices).

---

## 🔗 Traceability

| Source                 | Reference                                                                |
| ---------------------- | ------------------------------------------------------------------------ |
| FRD Requirement(s)     | FR-QUOTE-006, FR-QUOTE-009                                              |
| Use Case(s)            | UC-QUOTE-010                                                              |
| Business Rule(s)       | BR-QUOTE-005, BR-QUOTE-009, BR-QUOTE-016                                 |
| Permission Rule(s)     | Sistema (sin user context)                                                |
| Data Entity / Entities | QuoteRequest, Quote                                                       |
| API Endpoint(s)        | Sin endpoint público (jobs internos)                                       |
| NFR Reference(s)       | NFR-OBS-005, NFR-PERF-001                                                |
| Related ADR(s)         | —                                                                         |
| Related Document(s)    | /docs/4 §BR-QUOTE-005/009/016, /docs/8 §UC-QUOTE-010, /docs/9 §FR-QUOTE-006/009, /docs/14 §Jobs, /docs/21 §Cron, C-015 |

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: In Scope
* MVP Relevance: Must Have

### Explicitly Out of Scope

* Recordatorios pre-vencimiento (T-7, T-1).
* Notificación al vendor/organizer por QR expirada (BR-NOTIF-002 no lo exige).
* Reintento manual desde admin.
* Ejecuciones intra-day.
* `QuoteStatusBadge` (reuso del `StatusBadge` de US-051).

### Scope Notes

* Job diario único.
* Convención: 30 días estrictos desde `sent_at`.

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Expira QR vencidas

**Given** ejecución diaria del job `ExpireQuoteRequestsJob` en día `D`
**When** existen N QRs con `status IN ('sent','viewed')` AND `sent_at < D - 30 days`
**Then** el job:
- selecciona en batches de 100 con `FOR UPDATE SKIP LOCKED`,
- UPDATE `status='expired'` para cada QR,
- NO emite Notifications (D5),
- emite log `quote_request.expired.batch` con `correlation_id`, `count`, `duration_ms`,
- incrementa métrica `quote_requests.expired.total`.

### AC-02: Horario unificado 01:00 UTC

**Given** ambos jobs (`ExpireQuoteRequestsJob` + `ExpireQuotesJob` US-053 refactorizado)
**When** se inicia el scheduler
**Then** ambos quedan registrados con cron `0 1 * * *` (01:00 UTC) + jitter ±5min. El cron previo `5 0 * * *` de US-053 se reemplaza.

### AC-03: Idempotencia

**Given** el job ya marcó N QRs como `expired` hoy
**When** se vuelve a ejecutar el mismo día
**Then** no se tocan esas QRs (filtro `status IN ('sent','viewed')` las excluye).

### AC-04: Clock injectable

**Given** test con `FrozenClockAdapter` configurado a `2026-07-28 01:00 UTC`
**When** el job ejecuta
**Then** considera vencidas todas las QRs con `sent_at <= 2026-06-28` independientemente del reloj real.

### AC-05: Estados no permitidos

**Given** QR `status IN ('responded','preferred','cancelled','rejected','expired')` con `sent_at` viejo
**When** el job ejecuta
**Then** no se tocan.

---

## ⚠️ Edge Cases

### EC-01: 0 QRs para expirar

**Given** ejecución sin QRs vencidas
**When** el job consulta
**Then** termina exitosamente con `count=0`; log `quote_request.expired.batch count=0`.

### EC-02: Fallo de un batch

**Given** error en UPDATE de un batch
**When** la transacción falla
**Then** rollback del batch; log de error; reintento en next-run.

### EC-03: QR con `responded` y `sent_at` antiguo

**Given** QR ya respondida hace más de 30 días
**When** job ejecuta
**Then** no se toca (filtro `status` la excluye).

### EC-04: Job concurrente

**Given** 2 instancias del worker corren simultáneamente
**When** consultan la misma fila
**Then** SKIP LOCKED evita doble procesamiento.

---

## 🚫 Validation Rules

| ID    | Rule                                                                                                                    | Message / Behavior                              |
| ----- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| VR-01 | (Job) Filtro `status IN ('sent','viewed') AND sent_at < $clock_now::date - INTERVAL '$QR_EXPIRATION_DAYS days'`           | Query                                           |
| VR-02 | (Job) `LIMIT 100 FOR UPDATE SKIP LOCKED`                                                                                   | Batching                                        |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                                          |
| ------ | --------------------------------------------------------------------------------------------- |
| SEC-01 | Sistema sin user context.                                                                     |
| SEC-02 | `ClockPort` validado: en tests no usar `LocalClockAdapter`.                                   |
| SEC-03 | Log estructurado incluye `correlation_id` por ejecución.                                      |

### Negative Authorization Scenarios

* N/A (sin endpoint público).

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

| Area                | Notes                                                                                          |
| ------------------- | ---------------------------------------------------------------------------------------------- |
| Screen / Route      | N/A (job server-side). Listados consumen el nuevo estado vía US futura.                       |
| Main UI Pattern     | `StatusBadge` de US-051 reusable para `expired`.                                                |
| Primary Action      | No aplica.                                                                                     |
| Secondary Actions   | No aplica.                                                                                     |
| Empty State         | No aplica.                                                                                     |
| Loading State       | No aplica.                                                                                     |
| Error State         | No aplica.                                                                                     |
| Success State       | Badge "Expired" visible en listados de US futura.                                              |
| Accessibility Notes | Heredado de US-051 `StatusBadge`.                                                              |
| Responsive Notes    | N/A.                                                                                           |
| i18n Notes          | Clave `status.expired` ya existente.                                                           |
| Currency Notes      | No aplica.                                                                                     |

---

## 🛠 Technical Notes

### Frontend

* N/A. Reuso de `StatusBadge` de US-051.

### Backend

* Use Case / Service:
  * `ExpireQuoteRequestsUseCase` con batching + `ClockPort`.
* Job:
  * `ExpireQuoteRequestsJob` (handler de cron `0 1 * * *` UTC con jitter).
* Scheduler:
  * Reuso del scheduler bootstrap de US-053. Refactor del cron de `ExpireQuotesJob` de `5 0 * * *` a `0 1 * * *`.
* `ClockPort`:
  * Nuevo `src/shared/clock/clock.port.ts` con `LocalClockAdapter` y `FrozenClockAdapter`.
* Authorization Policy: Sistema.
* Validation: N/A.
* Transaction Required: Sí, por batch.

### Database

* Main Tables: `quote_requests`.
* Indexes: considerar `(status, sent_at)` parcial `WHERE status IN ('sent','viewed')`. Verificar en DB-001.

### API

| Method | Endpoint | Purpose                              |
| ------ | -------- | ------------------------------------ |
| —      | —        | Sin endpoint público (job interno).  |

### Observability / Audit

* Correlation ID Required: Yes (por ejecución).
* Log Event Required: Yes (`quote_request.expired.run.start`, `quote_request.expired.batch`, `quote_request.expired.run.end`).
* AdminAction Required: No
* AIRecommendation Required: No
* Métricas: `quote_requests.expired.total`, `quote_requests.expired.duration_ms`.

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                                          | Type        |
| ----- | --------------------------------------------------------------------------------- | ----------- |
| TS-01 | Job marca QR vencida con `FrozenClockAdapter`.                                     | Integration |
| TS-02 | Idempotencia: re-ejecutar el job no toca QRs ya `expired`.                        | Integration |
| TS-03 | Batching: procesar 250 QRs con batches de 100 = 3 iter.                            | Integration |
| TS-04 | Estados no permitidos: `responded/preferred/cancelled/rejected` no se tocan.      | Integration |
| TS-05 | Concurrencia con 2 workers + SKIP LOCKED.                                          | Integration |
| TS-06 | US-053 refactor: cron actualizado a 01:00 UTC y job sigue funcional (regresión). | Integration |

### Negative Tests

| ID    | Scenario                                              | Expected Result                  |
| ----- | ----------------------------------------------------- | -------------------------------- |
| NT-01 | QR ya `expired` con `sent_at` viejo                    | Ignorado (filtro `status`)        |
| NT-02 | Fallo en un batch                                       | Rollback del batch; reintento next-run |

### AI Tests

Not applicable for this story.

### Authorization Tests

| ID         | Scenario           | Expected Result          |
| ---------- | ------------------ | ------------------------ |
| AUTH-TS-01 | Job ejecuta sin user| Success                 |

### Accessibility Tests

* Heredado de US-051 (`StatusBadge`).

### Performance

* Job debe procesar 10,000 QRs vencidas en `< 60s` (smoke).

---

## 📊 Business Impact

| Field               | Value                                                |
| ------------------- | ---------------------------------------------------- |
| KPI Affected        | Higiene de datos + lifecycle correcto.               |
| Expected Impact     | Estado refleja realidad; sin QRs zombies.            |
| Success Criteria    | 100% expiración dentro de 24h post-vencimiento.      |
| Academic Demo Value | Automatización + `ClockPort` testeable + scheduler unificado. |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks

* N/A (reuso `StatusBadge` US-051).

### Potential Backend Tasks

* `ClockPort` + adapters.
* `ExpireQuoteRequestsUseCase`.
* `ExpireQuoteRequestsJob` handler.
* Refactor cron US-053.
* Logger + métricas.

### Potential Database Tasks

* Verificación + posible índice parcial.

### Potential AI / PromptOps Tasks

* Not applicable for this story.

### Potential QA Tasks

* TS con `FrozenClockAdapter` + concurrencia + performance + regresión US-053.

### Potential DevOps / Config Tasks

* Env var `QR_EXPIRATION_DAYS=30`.

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
* [x] API definida (sin endpoint público).
* [x] Tests definidos.
* [x] PO/BA validó.

---

## 🏁 Definition of Done

* [ ] `ExpireQuoteRequestsJob` operativo a 01:00 UTC con jitter.
* [ ] `ClockPort` + adapters integrados.
* [ ] `ExpireQuotesJob` de US-053 reconciliado al mismo cron.
* [ ] Idempotencia + batching + SKIP LOCKED verificados.
* [ ] Logs estructurados + métricas.
* [ ] Tests verdes con `FrozenClockAdapter`.
* [ ] Performance smoke 10k QRs `< 60s`.
* [ ] PO valida demo (QR de hace 31 días pasa a `expired`).

---

## 📝 Notes

* Sin notificaciones por QR expirada (D5).
* Documentation Alignment Required (no bloqueantes) en `management/user-stories/decision-resolutions/US-055-decision-resolution.md`.
