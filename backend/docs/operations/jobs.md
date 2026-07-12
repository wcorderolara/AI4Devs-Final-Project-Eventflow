# Backend Operations — Scheduled Jobs

> Runbook operativo para los jobs intra-proceso del backend EventFlow (ADR-BE-004).
> Fuente autoritativa de comandos: `docs/14-Backend-Technical-Design.md` §23 + `.env.example`.

---

## 1. Modelo operativo

* Scheduler **intra-proceso** (`node-cron`) dentro del propio proceso del backend. Sin colas
  externas ni Cloud Scheduler en MVP (ADR-BE-004).
* El registro de jobs es **fail-fast**: si la expresión cron es inválida, el proceso no arranca
  (validado por `NodeCronScheduler` en `backend/src/jobs/node-cron-scheduler.ts`).
* Coordinación multi-instancia por **variable de entorno** `JOBS_ENABLED`: se pone en `true` en
  **exactamente una réplica** para evitar disparos duplicados. En dev/test/QA y en las réplicas
  secundarias queda en `false` (default).

## 2. Variables de entorno

| Variable | Default | Ámbito | Descripción |
| -------- | ------- | ------ | ----------- |
| `JOBS_ENABLED` | `false` | Producción / Demo (réplica primaria) | Habilita el registro de schedulers intra-proceso. Con `false` `registerJobs` no programa nada. |
| `JOBS_AUTOCOMPLETE_CRON` | `30 0 * * *` | Producción / Demo | Cadencia del `AutoCompletePastEventsJob`. Parámetro operativo (no funcional). Ejemplo horario: `0 * * * *`. |

## 3. Jobs registrados

### 3.1 `AutoCompletePastEventsJob` (US-015 / PB-P1-009)

* **Propósito:** transicionar eventos `active` cuyo `event_date + 2 días ≤ clock.now()` a
  `status='completed'` con `auto_completed=true` y `completed_at=clock.now()`.
* **Idempotencia:** estructural por filtro SQL y por `updateMany` defensivo (no requiere lock).
* **Multi-instancia:** ejecutar en exactamente una réplica (`JOBS_ENABLED=true`).
* **Fallo por evento:** try/catch por iteración; se emite `job.autoComplete.error` y el resto
  continúa. Una falla catastrófica del use case queda registrada en el log `end` con
  `affectedCount=0` y se retomará en la siguiente cadencia.
* **Observabilidad:**
  * `job.autoComplete.start`: `{ correlationId, runId, cadence, scheduledAt, clockNow }`.
  * `job.autoComplete.end`: `{ correlationId, runId, durationMs, affectedCount }`.
  * `job.autoComplete.error`: `{ correlationId, runId, eventId, errorMessage }`.
* **Endpoint HTTP:** **ninguno**. El job no se puede disparar por API (SEC-01..04); sólo por
  scheduler. Este contrato está bajo test (`us015-jobs-registry.spec.ts` §SEC-001).

## 4. Procedimiento operativo por entorno

### 4.1 Dev / Test / CI

* `JOBS_ENABLED=false` (default). Los tests que necesiten ejercitar el job inyectan un fake
  scheduler o llaman al use case directamente (`us015-auto-complete-past-events.spec.ts`).

### 4.2 Demo académico

* Activar `JOBS_ENABLED=true` sólo en la réplica principal del backend demo.
* Cadencia recomendada: `JOBS_AUTOCOMPLETE_CRON=0 * * * *` (horaria) para acelerar la demo.
* Verificar por log de arranque:
  * `{ event: 'jobs.registry.enabled', jobs: ['auto-complete-past-events'], cadence: ... }`.
* Confirmar en logs siguientes la aparición de `job.autoComplete.start`/`end`.

### 4.3 Producción (referencia)

* Cadencia por defecto: `JOBS_AUTOCOMPLETE_CRON=30 0 * * *` (00:30 UTC diario, decisión PO 8.1
  #6). Ajustable operativamente.
* `JOBS_ENABLED=true` **exclusivamente** en la réplica designada. Documentar la designación en
  el runbook interno de despliegue y auditar por logs de `jobs.registry.enabled`/`.disabled`.

## 5. Diagnóstico y triage

| Síntoma | Causa probable | Verificación | Acción |
| ------- | -------------- | ------------ | ------ |
| Eventos no se cierran a T+2 | El job no corre en ninguna réplica | Filtrar logs por `job.autoComplete.start`/`end` en la última cadencia | Verificar `JOBS_ENABLED=true` en la réplica designada; revisar la expresión cron |
| Duplicación de logs `job.autoComplete.*` | Más de una réplica ejecuta el job | Contar `correlationId` únicos por hora vs #réplicas con flag | Dejar `JOBS_ENABLED=true` en una sola réplica y desplegar |
| `job.autoComplete.error` recurrente por el mismo `eventId` | Estado inconsistente en la fila | Consultar el evento por id | Investigar transición manual; el job re-intentará en la siguiente cadencia (idempotente) |
| `affectedCount` siempre 0 con eventos elegibles esperados | Filtro no matchea o índice no usado | Correr `EXPLAIN` de la query en QA (test `DB-001`) | Verificar cardinalidad; el índice parcial `idx_events_auto_complete_candidates` es válido |

## 6. Rollback

* Para deshabilitar temporalmente el job: `JOBS_ENABLED=false` en la réplica designada y
  reiniciar el pod. La ausencia de `AdminAction` mantiene el rollback totalmente reversible
  (no queda huella persistente en el dominio, sólo en logs).

## 7. Referencias

* `management/user-stories/US-015-auto-complete-event-job.md`
* `management/technical-specs/P1/PB-P1-009/US-015-technical-spec.md`
* `management/development-tasks/P1/PB-P1-009/US-015-development-tasks.md`
* `docs/14-Backend-Technical-Design.md` §23.
* `docs/22-Architecture-Decision-Records.md` — ADR-BE-004.
