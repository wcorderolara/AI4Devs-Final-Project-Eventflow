# Technical Specification — US-055: ExpireQuoteRequestsJob + ClockPort + reconciliación de cron

## 1. Metadata

| Field                                | Value                                                                                                          |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| User Story ID                        | US-055                                                                                                         |
| Source User Story                    | `management/user-stories/US-055-auto-expire-quotes-job.md`                                                     |
| Decision Resolution Artifact         | `management/user-stories/decision-resolutions/US-055-decision-resolution.md`                                   |
| Priority                             | P1                                                                                                             |
| Backlog ID                           | PB-P1-033                                                                                                      |
| Backlog Title                        | Jobs de expiración QR / Quote                                                                                   |
| Backlog Execution Order              | 55                                                                                                              |
| User Story Position in Backlog Item  | 1 de 1                                                                                                          |
| Related User Stories in Backlog Item | US-055                                                                                                         |
| Epic                                 | EPIC-QR-001                                                                                                    |
| Backlog Item Dependencies            | US-049 (sent_at), US-053 (scheduler + ExpireQuotesJob), PB-P0-001                                              |
| Feature                              | `ExpireQuoteRequestsJob` nuevo + `ClockPort` + refactor cron US-053                                             |
| Module / Domain                      | Quotes                                                                                                         |
| User Story Status                    | Approved with Minor Notes                                                                                     |
| Backlog Alignment Status             | Found                                                                                                          |
| Technical Spec Status                | Ready for Task Breakdown                                                                                       |
| Created Date                         | 2026-06-28                                                                                                     |
| Last Updated                         | 2026-06-28                                                                                                     |

---

## 2. Backlog Execution Context

PB-P1-033 single-story. Execution order 55. Depende del scheduler patrón de US-053.

---

## 3. Executive Technical Summary

US-055 entrega:

**Backend**:
- `ClockPort` con `LocalClockAdapter` (`new Date()`) y `FrozenClockAdapter` (configurable, con `advance(days)` para tests).
- `ExpireQuoteRequestsUseCase` con loop de batches `LIMIT 100 FOR UPDATE SKIP LOCKED`, filtro `WHERE status IN ('sent','viewed') AND sent_at < $clock_now::date - INTERVAL '${QR_EXPIRATION_DAYS} days'`, UPDATE `status='expired'` por batch. Sin Notifications (D5).
- `ExpireQuoteRequestsJob` handler de cron `0 1 * * *` UTC con jitter ±5min.
- Refactor del cron de `ExpireQuotesJob` (US-053) de `5 0 * * *` a `0 1 * * *` (sin cambio funcional).
- Logger estructurado + métricas.

**Frontend**:
- N/A (reuso de `StatusBadge` de US-051).

Sin migraciones obligatorias (verificar índice parcial `(status, sent_at) WHERE status IN ('sent','viewed')`).

---

## 4. Scope Boundary

### In Scope
- `ClockPort` + adapters.
- `ExpireQuoteRequestsUseCase` idempotente.
- `ExpireQuoteRequestsJob` handler.
- Refactor cron de US-053.
- Logger + métricas.
- Tests.
- Documentación.

### Out of Scope
- Notif al vendor/organizer por QR expirada (D5).
- Recordatorios pre-vencimiento.
- `QuoteStatusBadge` (reuso US-051).
- Reintento manual desde admin.

### Explicit Non-Goals
- No introducir nuevas tablas.

---

## 5. Architecture Alignment

### Backend
Extensión de `modules/quotes` + nuevo `src/shared/clock/`. Reuso del scheduler de US-053.

### Frontend
N/A.

### Database
Reuso. Posible índice parcial nuevo.

### API
Sin endpoint público.

### AI / PromptOps
No aplica.

### Security
Sistema sin user context.

### Testing
Vitest + Supertest + smoke de performance.

---

## 6. Functional Interpretation

| Acceptance Criterion       | Technical Interpretation                                                                          | Impacted Layer(s) |
| -------------------------- | ------------------------------------------------------------------------------------------------- | ----------------- |
| AC-01 marca QRs             | UseCase con loop + batching + filtro.                                                              | BE                |
| AC-02 horario unificado     | Cron `0 1 * * *` ambos jobs + jitter.                                                              | BE                |
| AC-03 idempotente            | Filtro `status IN ('sent','viewed')`.                                                              | BE                |
| AC-04 clock injectable       | `ClockPort` inyectado.                                                                            | BE                |
| AC-05 estados excluidos      | Filtro SQL.                                                                                       | BE                |
| EC-01 0 QRs                  | Log `count=0`.                                                                                    | BE                |
| EC-02 fallo batch            | Transacción rollback.                                                                              | BE                |
| EC-04 concurrencia           | SKIP LOCKED.                                                                                      | BE                |

---

## 7. Backend Technical Design

### ClockPort

```ts
// src/shared/clock/clock.port.ts
export interface ClockPort {
  now(): Date;
}

// src/shared/clock/local-clock.adapter.ts
export class LocalClockAdapter implements ClockPort {
  now(): Date { return new Date(); }
}

// src/shared/clock/frozen-clock.adapter.ts (sólo para tests)
export class FrozenClockAdapter implements ClockPort {
  constructor(private current: Date) {}
  now(): Date { return new Date(this.current); }
  advance(days: number): void { this.current.setDate(this.current.getDate() + days); }
}
```

### Use Case

```ts
class ExpireQuoteRequestsUseCase {
  constructor(private clock: ClockPort, private config: { qrExpirationDays: number; batchSize: number }) {}

  async execute({ correlationId }) {
    const startedAt = Date.now();
    let totalExpired = 0;
    let batchCount = 0;
    const clockNow = this.clock.now();

    while (true) {
      const expired = await prisma.$transaction(async (tx) => {
        const candidates = await tx.$queryRaw<Array<{ id: string }>>`
          SELECT id
          FROM quote_requests
          WHERE status IN ('sent', 'viewed')
            AND sent_at < ${clockNow}::date - INTERVAL '${this.config.qrExpirationDays} days'
          ORDER BY sent_at ASC, id ASC
          LIMIT ${this.config.batchSize}
          FOR UPDATE SKIP LOCKED
        `;
        if (candidates.length === 0) return 0;

        const ids = candidates.map(c => c.id);
        await tx.quote_requests.updateMany({ where: { id: { in: ids } }, data: { status: 'expired' } });
        return candidates.length;
      });

      if (expired === 0) break;

      totalExpired += expired;
      batchCount += 1;
      logger.info('quote_request.expired.batch', { correlationId, batchCount, count: expired });
    }

    const duration = Date.now() - startedAt;
    logger.info('quote_request.expired.run.end', { correlationId, totalExpired, batchCount, durationMs: duration });
    metrics.counter('quote_requests.expired.total').inc(totalExpired);
    metrics.histogram('quote_requests.expired.duration_ms').observe(duration);

    return { totalExpired, batchCount, durationMs: duration };
  }
}
```

### Job Handler

```ts
// src/jobs/expire-quote-requests.job.ts
import cron from 'node-cron';

export function startExpireQuoteRequestsJob(useCase: ExpireQuoteRequestsUseCase) {
  cron.schedule('0 1 * * *', async () => {
    const jitterMs = Math.floor(Math.random() * 10 * 60 * 1000);
    await new Promise(resolve => setTimeout(resolve, jitterMs));
    const correlationId = uuidv4();
    logger.info('quote_request.expired.run.start', { correlationId, jitterMs });
    try {
      await useCase.execute({ correlationId });
    } catch (err) {
      logger.error('quote_request.expired.run.failed', { correlationId, error: err.message });
    }
  }, { timezone: 'UTC' });
}
```

### Refactor de US-053

`src/jobs/expire-quotes.job.ts` (US-053): cambiar `cron.schedule('5 0 * * *', ...)` a `cron.schedule('0 1 * * *', ...)`. Sin más cambios.

### Scheduler Bootstrap

Reuso del `bootstrapJobs(deps)` de US-053 + añadir `startExpireQuoteRequestsJob(deps.expireQuoteRequestsUseCase)`.

### CLI

`npm run job:expire-quote-requests` (opcional para tests).

### Validation Rules

Sin validación HTTP.

### Error Handling

- Rollback del batch.
- Reintento next-run.

### Transactions

Por batch.

### Observability

- Logs: `quote_request.expired.run.start`, `quote_request.expired.batch`, `quote_request.expired.run.end`, `quote_request.expired.run.failed`.
- Métricas: `quote_requests.expired.total`, `quote_requests.expired.duration_ms`.

---

## 8. Frontend Technical Design

N/A. Reuso de `StatusBadge` de US-051.

---

## 9. API Contract Design

Sin endpoint público.

---

## 10. Database / Prisma Design

### Models Impacted

`QuoteRequest` (update).

### Fields / Columns

Sin nuevos.

### Indexes

Considerar (DB-001):
- `idx_quote_requests_active_sent_at (status, sent_at) WHERE status IN ('sent','viewed')` para query del job.

### Migrations Impact

Posible 1 migración menor.

### Seed Impact

Añadir QR con `sent_at = '2026-05-28'` (31 días antes de la fecha demo) para demo del job.

---

## 11. AI / PromptOps Design

No aplica.

---

## 12. Security & Authorization Design

Sistema. Sin RBAC.

---

## 13. Testing Strategy

### Unit Tests

- `LocalClockAdapter` retorna `Date` reciente.
- `FrozenClockAdapter` retorna fecha fija + `advance(days)`.
- UseCase con `FrozenClockAdapter` y batching mock.
- Idempotencia.

### Integration Tests

- TS-01..TS-06.
- Regresión: US-053 sigue marcando Quotes (`< 1s p95`).
- Concurrencia: 2 workers + SKIP LOCKED.

### API Tests

N/A.

### E2E Tests

N/A.

### Security Tests

N/A.

### Accessibility Tests

N/A.

### AI Tests

No aplica.

### Performance

- Smoke: 10,000 QRs vencidas → `< 60s`.

---

## 14. Observability & Audit

Ver §7.

---

## 15. Seed / Demo Data Impact

Añadir QR con `sent_at` viejo (31 días) para demo.

---

## 16. Documentation Alignment Required

| Document / Source            | Conflict                                                              | Current Decision                              | Recommended Action                                          | Blocks Implementation? |
| ---------------------------- | --------------------------------------------------------------------- | --------------------------------------------- | ----------------------------------------------------------- | ---------------------- |
| `docs/14 §Jobs`              | Falta documentar `ExpireQuoteRequestsJob`.                             | Documentar.                                    | Actualizar `docs/14`.                                       | No                     |
| `docs/21 §Cron`              | Actualizar cron de ambos jobs a 01:00 UTC.                              | Documentar.                                    | Actualizar `docs/21`.                                       | No                     |
| US-053 cron string             | Cambio de `5 0 * * *` a `0 1 * * *`.                                  | Refactor.                                      | Aplicar.                                                     | No                     |

---

## 17. Technical Risks & Mitigations

| Risk                                                            | Impact                | Mitigation                                              |
| --------------------------------------------------------------- | --------------------- | ------------------------------------------------------- |
| Refactor de cron US-053 introduce regresión.                     | Quote no expira.      | Test de regresión integral (TS-06).                      |
| `ClockPort` mal inyectado.                                       | Tests no deterministas. | DI estricto, no `new Date()` directo en use cases.    |
| Concurrencia con 2 workers.                                       | Doble procesamiento.  | `FOR UPDATE SKIP LOCKED`.                                |
| Índice ausente.                                                   | Latencia.             | DB-001 evalúa.                                          |

---

## 18. Implementation Guidance for Coding Agents

### Archivos impactados

**Backend**:
- `src/shared/clock/clock.port.ts` (nuevo)
- `src/shared/clock/local-clock.adapter.ts` (nuevo)
- `src/shared/clock/frozen-clock.adapter.ts` (nuevo)
- `src/modules/quotes/use-cases/expire-quote-requests.use-case.ts` (nuevo)
- `src/modules/quotes/use-cases/expire-quotes.use-case.ts` (US-053) — inyectar `ClockPort`
- `src/jobs/expire-quote-requests.job.ts` (nuevo)
- `src/jobs/expire-quotes.job.ts` (US-053) — cambiar cron a `0 1 * * *`
- `src/jobs/scheduler.ts` — añadir `startExpireQuoteRequestsJob`
- `src/shared/logging/quote-events.ts` (extender)
- `src/shared/metrics/quote-metrics.ts` (extender)

**Config**:
- `.env.example`: `QR_EXPIRATION_DAYS=30`, `EXPIRE_QUOTE_REQUESTS_CRON='0 1 * * *'`, `EXPIRE_QUOTES_CRON='0 1 * * *'`.

### Orden sugerido

1. DB-001.
2. `ClockPort` + adapters + UT.
3. `ExpireQuoteRequestsUseCase` + UT.
4. Inyectar `ClockPort` en `ExpireQuotesUseCase` de US-053 (refactor).
5. Job handler nuevo + refactor cron US-053.
6. Scheduler bootstrap.
7. Logger + métricas.
8. Tests IT + regresión US-053 + performance.
9. Documentación.

### Decisiones que no deben reabrirse

D1–D7.

### Qué no implementar

- Notif por QR expirada.
- Recordatorios pre-vencimiento.
- Endpoint público.

---

## 19. Task Generation Notes

| Grupo | Tasks |
| ----- | ----: |
| DB    | 1 |
| BE    | 6 |
| OPS   | 1 |
| QA    | 4 |
| DOC   | 1 |

**Total estimado ~13 tareas.**

---

## 20. Technical Spec Readiness

| Check                                                       | Status |
| ----------------------------------------------------------- | ------ |
| User Story approved or explicitly allowed for draft spec    | Pass   |
| Product Backlog mapping found                                | Pass   |
| Decision Resolution reviewed if present                      | Pass   |
| Scope clear                                                  | Pass   |
| Architecture alignment clear                                 | Pass   |
| API impact clear                                             | N/A    |
| DB impact clear                                              | Pass   |
| AI impact clear                                              | N/A    |
| Security impact clear                                        | Pass   |
| Testing strategy clear                                       | Pass   |
| Ready for Development Task Breakdown                         | Yes    |

---

## 21. Final Recommendation

`Ready for Task Breakdown`.

US-055 introduce `ExpireQuoteRequestsJob` + `ClockPort` reusable + reconciliación del cron de US-053. Sin migraciones obligatorias. 3 acciones documentales no bloqueantes (incluyendo refactor del cron string).
