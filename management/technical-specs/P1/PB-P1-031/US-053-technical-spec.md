# Technical Specification — US-053: ValidUntilPicker + ExpireQuotesJob

## 1. Metadata

| Field                                | Value                                                                                                          |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| User Story ID                        | US-053                                                                                                         |
| Source User Story                    | `management/user-stories/US-053-quote-validity-15-days.md`                                                     |
| Decision Resolution Artifact         | `management/user-stories/decision-resolutions/US-053-decision-resolution.md`                                   |
| Priority                             | P1                                                                                                             |
| Backlog ID                           | PB-P1-031                                                                                                      |
| Backlog Title                        | Vendor visualiza y responde Quote                                                                              |
| Backlog Execution Order              | 53                                                                                                              |
| User Story Position in Backlog Item  | 3 de 3 (US-051 → US-052 → US-053)                                                                              |
| Related User Stories in Backlog Item | US-051, US-052, US-053                                                                                         |
| Epic                                 | EPIC-QR-001                                                                                                    |
| Backlog Item Dependencies            | US-052 (form + envío con valid_until), PB-P0-001, `NotificationSenderPort` (US-049), PB-P1-009 (scheduler patrón) |
| Feature                              | `ValidUntilPicker` accesible + `ExpireQuotesJob` cron diario idempotente                                        |
| Module / Domain                      | Quotes                                                                                                         |
| User Story Status                    | Approved with Minor Notes                                                                                     |
| Backlog Alignment Status             | Found                                                                                                          |
| Technical Spec Status                | Ready for Task Breakdown                                                                                       |
| Created Date                         | 2026-06-27                                                                                                     |
| Last Updated                         | 2026-06-27                                                                                                     |

---

## 2. Backlog Execution Context

US-053 cierra PB-P1-031. Execution order 53. Depende de US-052 (form base) y del scheduler de PB-P1-009 (reuso o introducción paralela).

---

## 3. Executive Technical Summary

US-053 entrega dos componentes:

**Frontend**:
- `ValidUntilPicker` (Client Component) accesible con `react-day-picker` o equivalente. Default `today + 15d`, rango `[today+1, today+90]`, feedback inline con `aria-invalid` + `aria-describedby`. Integrado en `QuoteResponseForm` (US-052) con RHF.

**Backend**:
- `ExpireQuotesUseCase`: query `WHERE status='sent' AND valid_until < CURRENT_DATE` con `LIMIT 100 FOR UPDATE SKIP LOCKED`. Por cada batch, UPDATE `status='expired'` + INSERT 2 Notifications. Repite hasta agotar.
- `ExpireQuotesJob`: handler de cron diario `0 5 0 * * *` UTC con jitter ±5min implementado con `setTimeout(jitterMs)` antes de invocar el use case.
- Scheduler bootstrap (`src/jobs/scheduler.ts` con `node-cron` o reuso del de PB-P1-009).
- Logger estructurado + métricas (`quotes.expired.total`, `quotes.expired.duration_ms`).

Sin migraciones. Reuso del índice `idx_quotes_valid_until_active`.

---

## 4. Scope Boundary

### In Scope
- `ValidUntilPicker` accesible + integración en form de US-052.
- `ExpireQuotesUseCase` idempotente.
- `ExpireQuotesJob` handler.
- Scheduler bootstrap.
- Reuso `NotificationSenderPort`.
- Logger + métricas.
- Tests.
- Documentación.

### Out of Scope
- Endpoint público para forzar el job (puede ser CLI command para tests).
- Notif al organizer (sólo vendor en MVP).
- Ejecuciones intra-day.
- Email real.

### Explicit Non-Goals
- No introducir tablas nuevas.

---

## 5. Architecture Alignment

### Backend
Nuevo `src/jobs/` con scheduler + handlers. UseCase en `modules/quotes/use-cases/`.

### Frontend
Client Component con `react-day-picker` integrado en form de US-052.

### Database
Reuso del índice parcial existente.

### API
Sin endpoint público.

### AI / PromptOps
No aplica.

### Security
Sistema sin user context. Sin RBAC.

### Testing
Vitest + Supertest + RTL + axe + smoke de performance.

---

## 6. Functional Interpretation

| Acceptance Criterion       | Technical Interpretation                                                                          | Impacted Layer(s) |
| -------------------------- | ------------------------------------------------------------------------------------------------- | ----------------- |
| AC-01 picker default        | Componente con default `today + 15d` y rango client-side.                                          | FE                |
| AC-02 job marca expiradas    | UseCase con SKIP LOCKED + batches + 2 Notifications.                                               | BE                |
| AC-03 idempotente            | Filtro `status='sent'` excluye ya expiradas.                                                       | BE                |
| AC-04 convención corte       | `valid_until < CURRENT_DATE`.                                                                      | BE                |
| EC-01 rollback batch         | `prisma.$transaction` por batch.                                                                   | BE                |
| EC-02 0 Quotes               | Log `count=0`.                                                                                     | BE                |
| EC-03/04 estados             | Filtro `status='sent'`.                                                                            | BE                |
| A11Y picker                 | `aria-invalid`, `aria-describedby`, keyboard.                                                       | FE                |
| i18n                       | `vendor.qr.respond.valid_until.*`.                                                                | FE                |

---

## 7. Backend Technical Design

### Use Case

```ts
class ExpireQuotesUseCase {
  async execute({ correlationId, batchSize = 100 }) {
    const startedAt = Date.now();
    let totalExpired = 0;
    let batchCount = 0;

    while (true) {
      const expired = await prisma.$transaction(async (tx) => {
        const candidates = await tx.$queryRaw<Array<{ id: string; vendor_profile_id: string; quote_request_id: string; valid_until: Date }>>`
          SELECT id, vendor_profile_id, quote_request_id, valid_until
          FROM quotes
          WHERE status = 'sent' AND valid_until < CURRENT_DATE
          ORDER BY valid_until ASC, id ASC
          LIMIT ${batchSize}
          FOR UPDATE SKIP LOCKED
        `;
        if (candidates.length === 0) return 0;

        const ids = candidates.map(c => c.id);
        await tx.quotes.updateMany({ where: { id: { in: ids } }, data: { status: 'expired' } });

        for (const quote of candidates) {
          const vendor = await tx.vendor_profiles.findUnique({ where: { id: quote.vendor_profile_id }, select: { user_id: true } });
          await notificationSenderPort.notify({ channel: 'in_app', recipientUserId: vendor.user_id, event: 'quote.expired', deliveryStatus: 'delivered', payload: { quote_id: quote.id, quote_request_id: quote.quote_request_id, valid_until: quote.valid_until }, tx });
          await notificationSenderPort.notify({ channel: 'email_simulated', recipientUserId: vendor.user_id, event: 'quote.expired', deliveryStatus: 'simulated', payload: { quote_id: quote.id, quote_request_id: quote.quote_request_id, valid_until: quote.valid_until }, tx });
        }

        return candidates.length;
      });

      if (expired === 0) break;

      totalExpired += expired;
      batchCount += 1;
      logger.info('quote.expired.batch', { correlationId, batchCount, count: expired });
    }

    const duration = Date.now() - startedAt;
    logger.info('quote.expired.run.end', { correlationId, totalExpired, batchCount, durationMs: duration });
    metrics.counter('quotes.expired.total').inc(totalExpired);
    metrics.histogram('quotes.expired.duration_ms').observe(duration);

    return { totalExpired, batchCount, durationMs: duration };
  }
}
```

### Job Handler

```ts
// src/jobs/expire-quotes.job.ts
import cron from 'node-cron';

export function startExpireQuotesJob(useCase: ExpireQuotesUseCase) {
  // '5 0 * * *' = 00:05 UTC daily
  cron.schedule('5 0 * * *', async () => {
    const jitterMs = Math.floor(Math.random() * 10 * 60 * 1000); // 0-10 min jitter
    await new Promise(resolve => setTimeout(resolve, jitterMs));
    const correlationId = uuidv4();
    logger.info('quote.expired.run.start', { correlationId, jitterMs });
    try {
      await useCase.execute({ correlationId });
    } catch (err) {
      logger.error('quote.expired.run.failed', { correlationId, error: err.message });
    }
  }, { timezone: 'UTC' });
}
```

### Scheduler Bootstrap

```ts
// src/jobs/scheduler.ts (nuevo o extender el existente)
export function bootstrapJobs(deps) {
  startExpireQuotesJob(deps.expireQuotesUseCase);
  // ... otros jobs (US-009, US-076, etc.)
}
```

Invocado desde `src/server.ts` o desde un worker dedicado `npm run worker`.

### CLI Command (opcional para tests)

```ts
// src/jobs/cli/expire-quotes.cli.ts
// Permite forzar la ejecución manual: `npm run job:expire-quotes`
```

### Validation Rules

Sin validación HTTP (job interno).

### Error Handling

- Errores de DB: rollback del batch, reintento en next run.
- Errores de Notification: rollback (parte de la misma transacción).
- Errores de scheduler: log y restart.

### Transactions

Por batch (`prisma.$transaction`).

### Observability

- Logs: `quote.expired.run.start`, `quote.expired.batch`, `quote.expired.run.end`, `quote.expired.run.failed`.
- Métricas: `quotes.expired.total`, `quotes.expired.duration_ms`.

---

## 8. Frontend Technical Design

### Routes / Pages

Reuso de `app/[locale]/vendor/quote-requests/[id]/respond/page.tsx` (US-052).

### Components

- `ValidUntilPicker` (Client Component).
- Integrado en `QuoteResponseForm` (US-052) reemplazando el input de fecha simple.

### Forms

RHF + Zod espejo. Validación cliente del rango.

### State Management

Heredado de US-052.

### Data Fetching

Heredado de US-052.

### Loading / Empty / Error / Success States

- Loading: spinner.
- Error: feedback inline `aria-invalid`.
- Success: heredado.

### Accessibility

`aria-invalid`, `aria-describedby`, keyboard-accessible. Etiquetas semánticas.

### i18n

`vendor.qr.respond.valid_until.*` en 4 locales.

---

## 9. API Contract Design

Sin endpoint público. Job ejecuta automáticamente.

Opcional CLI command para tests manuales: `npm run job:expire-quotes`.

---

## 10. Database / Prisma Design

### Models Impacted

`Quote` (update), `Notification` (write), `VendorProfile` (read).

### Fields / Columns

Sin nuevos.

### Indexes

Reuso de `idx_quotes_valid_until_active (valid_until) WHERE status = 'sent'`.

### Migrations Impact

Ninguna.

### Seed Impact

Añadir 1-2 Quotes con `valid_until` pasado para demo.

---

## 11. AI / PromptOps Design

No aplica.

---

## 12. Security & Authorization Design

Sistema. Sin RBAC.

---

## 13. Testing Strategy

### Unit Tests

- UseCase con mocks de Prisma.
- Idempotencia (re-ejecutar y verificar 0 efectos).
- Batching (procesar 250 con batches de 100 = 3 iteraciones).
- Convención del corte (boundary day).

### Integration Tests

- TS-02..TS-06.
- Concurrencia: 2 workers simultáneos con SKIP LOCKED.
- Rollback en fallo de Notification.

### API Tests

N/A.

### E2E Tests

- Playwright para `ValidUntilPicker` (default, edición, fuera de rango).

### Security Tests

N/A (job interno).

### Accessibility Tests

- `ValidUntilPicker` keyboard + screen reader.

### AI Tests

No aplica.

### Performance

- Smoke: 10,000 Quotes vencidas → `< 60s`.

---

## 14. Observability & Audit

Ver §7.

---

## 15. Seed / Demo Data Impact

Añadir 1-2 Quotes con `valid_until = '2026-06-26'` (pasado) y `status='sent'` para demo del job al día siguiente.

---

## 16. Documentation Alignment Required

| Document / Source            | Conflict                                                              | Current Decision                              | Recommended Action                                          | Blocks Implementation? |
| ---------------------------- | --------------------------------------------------------------------- | --------------------------------------------- | ----------------------------------------------------------- | ---------------------- |
| `docs/14 §Jobs`              | Falta documentar `ExpireQuotesJob`.                                    | Documentar.                                    | Actualizar `docs/14`.                                       | No                     |
| `docs/21 §Cron`              | Falta especificar cron schedule.                                       | Documentar.                                    | Actualizar `docs/21`.                                       | No                     |

---

## 17. Technical Risks & Mitigations

| Risk                                                            | Impact                | Mitigation                                              |
| --------------------------------------------------------------- | --------------------- | ------------------------------------------------------- |
| 2 instancias del worker ejecutan simultáneamente.                | Duplicate processing. | `SELECT FOR UPDATE SKIP LOCKED`.                         |
| Fallo del scheduler.                                             | Quotes no expiran.    | Healthcheck del worker + reinicio automático.            |
| Batch enorme (50k Quotes).                                        | Latencia elevada.     | Batching + log de progreso.                              |
| Notification falla muchas veces.                                 | Backlog acumulado.    | Reintento next run; alerta si N > 1000.                  |
| Timezone confusion.                                              | Convención incorrecta.| Job ejecuta en UTC; `CURRENT_DATE` en PostgreSQL es UTC. |

---

## 18. Implementation Guidance for Coding Agents

### Archivos impactados

**Backend**:
- `src/modules/quotes/use-cases/expire-quotes.use-case.ts`
- `src/jobs/expire-quotes.job.ts`
- `src/jobs/scheduler.ts` (nuevo o extender)
- `src/jobs/cli/expire-quotes.cli.ts` (opcional)
- `src/shared/logging/quote-events.ts` (extender)
- `src/shared/metrics/quote-metrics.ts` (nuevo o extender)

**Frontend**:
- `components/vendor/qr/ValidUntilPicker.tsx`
- `components/vendor/qr/QuoteResponseForm.tsx` (extender de US-052)
- `messages/{es-LATAM,es-ES,pt,en}.json` (extender)

**Config**:
- `.env.example`: `WORKER_ENABLED=true`, `EXPIRE_QUOTES_CRON='5 0 * * *'`.
- `package.json`: `npm run worker`, `npm run job:expire-quotes`.

### Orden sugerido

1. DB-001 (verificar índice).
2. UseCase + UT.
3. Job handler + scheduler bootstrap.
4. CLI command (opcional).
5. Logger + métricas.
6. Frontend `ValidUntilPicker` accesible.
7. Integración en form de US-052.
8. i18n.
9. Tests IT + concurrencia + performance smoke.
10. Documentación.

### Decisiones que no deben reabrirse

D1–D5.

### Qué no implementar

- Notif al organizer.
- Ejecuciones intra-day.
- Email real.

---

## 19. Task Generation Notes

| Grupo | Tasks |
| ----- | ----: |
| DB    | 1 |
| BE    | 5 |
| FE    | 3 |
| OPS   | 1 |
| QA    | 5 |
| DOC   | 1 |

**Total estimado ~16 tareas.**

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

US-053 cierra PB-P1-031 con `ValidUntilPicker` accesible + `ExpireQuotesJob` idempotente con SKIP LOCKED y 2 Notifications atómicas por Quote. Sin migraciones obligatorias.
