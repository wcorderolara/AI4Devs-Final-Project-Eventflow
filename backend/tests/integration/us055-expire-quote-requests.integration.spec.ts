// US-055 (PB-P1-033 / QA-002 + QA-003 + QA-004) — Integration tests contra Postgres real.
// Cubre:
//   QA-002 IT-01 (AC-01) — Job marca QRs con `status IN ('sent','viewed')` y `created_at`
//     antiguo como `expired`, sin tocar QRs recientes ni estados terminales (AC-05, EC-03).
//   QA-002 IT-02 (AC-03) — Segunda corrida el mismo día es idempotente (0 candidatos).
//   QA-002 IT-03 (AC-04) — `FrozenClock` fijo determina el corte independientemente del wall
//     clock: `advance(days)` mueve la ventana.
//   QA-002 IT-04 (EC-01) — 0 candidatos ⇒ `totalExpired=0`, `run.end` con count=0.
//   QA-002 IT-05 (Regresión US-053 / BE-005) — `ExpireQuotesUs053UseCase` sigue marcando
//     `Quote.status='sent' AND valid_until < clock_now::date` a `expired` tras el refactor
//     que reemplaza `CURRENT_DATE` por `clockNow` en la query.
//   QA-002 IT-06 (Índice) — El índice parcial `idx_quote_requests_active_created_at` existe
//     y el planner puede considerarlo (no bloqueante — validación de shape en pg_indexes).
//   QA-003 IT-07 (EC-04) — 2 workers concurrentes sobre 200 QRs vencidas: cada fila se procesa
//     UNA sola vez (`FOR UPDATE SKIP LOCKED`).
//   QA-004 IT-08 (NFR-PERF-001) — 10.000 QRs vencidas se procesan en `< 60s` (smoke).
//
// El bloque `skipIf(!dbUp)` es el patrón del repo (US-139) — la suite hace skip limpio si
// no hay Postgres alcanzable (local sin `docker compose up` o CI con DB dummy).
import { afterAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { ExpireQuoteRequestsUs055UseCase } from '../../src/modules/quote-flow/application/expire-quote-requests.us055.use-case.js';
import { ExpireQuotesUs053UseCase } from '../../src/modules/quote-flow/application/expire-quotes.us053.use-case.js';
import { QuoteNotificationService } from '../../src/modules/quote-flow/services/quote-notification.service.js';
import { FrozenClock } from '../../src/infrastructure/time/frozen-clock.js';
import type { DomainEventLogger } from '../../src/shared/observability/domain-event-logger.js';
import type { QuoteNotificationSenderPort } from '../../src/shared/application/quote-notification-sender.port.js';

const prisma = new PrismaClient();
let dbUp = false;
try {
  await Promise.race([
    prisma.$queryRawUnsafe('SELECT 1'),
    new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 4000)),
  ]);
  dbUp = true;
} catch {
  dbUp = false;
}

const silentLogger: DomainEventLogger = { emit: () => undefined };

function rand(): string {
  return Math.random().toString(36).slice(2, 10);
}

interface Refs {
  organizerId: string;
  eventTypeId: string;
  categoryId: string;
  vendorProfileId: string;
  eventId: string;
}

/** Crea usuarios + evento + vendor de test. `serviceCategory` y `eventType` upserted por code. */
async function makeRefs(): Promise<Refs> {
  const suffix = rand();
  const orgEmail = `us055-org-${suffix}@test.local`;
  const vendorEmail = `us055-vendor-${suffix}@test.local`;

  const eventType = await prisma.eventType.upsert({
    where: { code: 'wedding' },
    create: { code: 'wedding', label: 'Wedding' },
    update: {},
  });
  const category = await prisma.serviceCategory.upsert({
    where: { code: 'catering' },
    create: { code: 'catering', label: 'Catering' },
    update: {},
  });
  const organizer = await prisma.user.create({
    data: {
      email: orgEmail,
      passwordHash: 'x'.repeat(60),
      role: 'organizer',
      fullName: 'US-055 Organizer',
    },
  });
  const vendorUser = await prisma.user.create({
    data: {
      email: vendorEmail,
      passwordHash: 'x'.repeat(60),
      role: 'vendor',
      fullName: 'US-055 Vendor',
    },
  });
  const vendorProfile = await prisma.vendorProfile.create({
    data: {
      userId: vendorUser.id,
      businessName: `US-055 Vendor ${suffix}`,
      languagesSupported: ['es-LATAM'],
    },
  });
  const event = await prisma.event.create({
    data: {
      userId: organizer.id,
      eventTypeId: eventType.id,
      title: `US-055 Event ${suffix}`,
      status: 'active',
      currency: 'GTQ',
    },
  });

  return {
    organizerId: organizer.id,
    eventTypeId: eventType.id,
    categoryId: category.id,
    vendorProfileId: vendorProfile.id,
    eventId: event.id,
  };
}

/** Crea una QR con `created_at` deliberadamente fijado a `daysAgo` días atrás relativo a `now`.
 *  Usa `vendor_profile_id = NULL` para saltar la constraint parcial
 *  `uq_quote_requests_event_vendor_active` sobre `(event_id, vendor_profile_id) WHERE status IN
 *  ('sent','viewed','responded')` — Postgres trata NULLs como distintos, así que N QRs con
 *  vendor NULL pueden coexistir sobre el mismo evento. La expiración no depende del vendor. */
async function insertQr(
  refs: Refs,
  now: Date,
  daysAgo: number,
  status: 'sent' | 'viewed' | 'responded' | 'expired' | 'cancelled',
): Promise<string> {
  const createdAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  const row = await prisma.$queryRaw<Array<{ id: string }>>`
    INSERT INTO quote_requests (id, event_id, service_category_id, vendor_profile_id, status, created_at, updated_at, is_seed)
    VALUES (gen_random_uuid(), ${refs.eventId}::uuid, ${refs.categoryId}::uuid, NULL,
            ${status}::"QuoteRequestStatus", ${createdAt}, ${createdAt}, false)
    RETURNING id
  `;
  return row[0]!.id;
}

/** Cleanup por evento (cascada natural via FKs restrict — borra QRs primero). */
async function cleanup(refs: Refs): Promise<void> {
  await prisma.quote.deleteMany({ where: { quoteRequest: { eventId: refs.eventId } } });
  await prisma.quoteRequest.deleteMany({ where: { eventId: refs.eventId } });
  await prisma.event.deleteMany({ where: { id: refs.eventId } });
  await prisma.vendorProfile.deleteMany({ where: { id: refs.vendorProfileId } });
  await prisma.user.deleteMany({ where: { id: refs.organizerId } });
  // El vendorUser se identificaba por vendorProfile.userId — ya limpiado por FK.
}

describe.skipIf(!dbUp)('US-055 integration — Postgres real', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  // ── IT-06: índice parcial existe ──
  it('IT-06 · idx_quote_requests_active_created_at existe como partial index', async () => {
    const rows = await prisma.$queryRaw<Array<{ indexname: string; indexdef: string }>>`
      SELECT indexname, indexdef FROM pg_indexes
      WHERE indexname = 'idx_quote_requests_active_created_at'
    `;
    expect(rows).toHaveLength(1);
    const def = rows[0]!.indexdef.toLowerCase();
    expect(def).toContain('status');
    expect(def).toContain('created_at');
    // Partial WHERE: 'sent' y 'viewed' aparecen en la cláusula.
    expect(def).toContain("'sent'");
    expect(def).toContain("'viewed'");
  });

  // ── IT-01: happy path ──
  it('IT-01 AC-01/AC-05 · Marca QRs vencidas y respeta estados excluidos', async () => {
    const refs = await makeRefs();
    try {
      const now = new Date('2026-07-28T01:00:00Z');
      const clock = new FrozenClock(now);
      // Vencidas (`sent_at` = 31d atrás, > 30d): 2 sent + 1 viewed = 3 candidatos.
      const idExpiredSent1 = await insertQr(refs, now, 31, 'sent');
      const idExpiredSent2 = await insertQr(refs, now, 45, 'sent');
      const idExpiredViewed = await insertQr(refs, now, 31, 'viewed');
      // Recientes (< 30d): no se tocan.
      const idFreshSent = await insertQr(refs, now, 15, 'sent');
      // Estados terminales con `sent_at` viejo: no se tocan.
      const idOldResponded = await insertQr(refs, now, 60, 'responded');
      const idOldCancelled = await insertQr(refs, now, 60, 'cancelled');
      const idAlreadyExpired = await insertQr(refs, now, 60, 'expired');

      const uc = new ExpireQuoteRequestsUs055UseCase(clock, silentLogger, {
        qrExpirationDays: 30,
        batchSize: 100,
      });
      const result = await uc.execute({ correlationId: 'it-01', runId: 'it-01-run' });

      expect(result.totalExpired).toBe(3);
      expect(result.batchCount).toBe(1);
      expect(result.errors).toEqual([]);

      const [q1, q2, q3, q4, q5, q6, q7] = await Promise.all(
        [idExpiredSent1, idExpiredSent2, idExpiredViewed, idFreshSent, idOldResponded, idOldCancelled, idAlreadyExpired].map(
          (id) => prisma.quoteRequest.findUnique({ where: { id }, select: { status: true } }),
        ),
      );
      expect(q1?.status).toBe('expired');
      expect(q2?.status).toBe('expired');
      expect(q3?.status).toBe('expired');
      expect(q4?.status).toBe('sent');
      expect(q5?.status).toBe('responded');
      expect(q6?.status).toBe('cancelled');
      expect(q7?.status).toBe('expired');
    } finally {
      await cleanup(refs);
    }
  });

  // ── IT-02: idempotencia ──
  it('IT-02 AC-03 · Segunda corrida el mismo día no toca nada (0 candidatos)', async () => {
    const refs = await makeRefs();
    try {
      const now = new Date('2026-07-28T01:00:00Z');
      const clock = new FrozenClock(now);
      await insertQr(refs, now, 31, 'sent');
      await insertQr(refs, now, 45, 'viewed');

      const uc = new ExpireQuoteRequestsUs055UseCase(clock, silentLogger, {
        qrExpirationDays: 30,
        batchSize: 100,
      });
      const first = await uc.execute({});
      expect(first.totalExpired).toBe(2);

      const second = await uc.execute({});
      expect(second.totalExpired).toBe(0);
      expect(second.batchCount).toBe(0);
    } finally {
      await cleanup(refs);
    }
  });

  // ── IT-03: FrozenClock advance ──
  it('IT-03 AC-04 · advance(days) mueve la ventana de expiración', async () => {
    const refs = await makeRefs();
    try {
      const t0 = new Date('2026-07-28T01:00:00Z');
      const clock = new FrozenClock(t0);
      // QR creada hace 25d relativo a t0 — NO vencida.
      await insertQr(refs, t0, 25, 'sent');

      const uc = new ExpireQuoteRequestsUs055UseCase(clock, silentLogger, {
        qrExpirationDays: 30,
        batchSize: 100,
      });
      const r1 = await uc.execute({});
      expect(r1.totalExpired).toBe(0);

      // Avanza 6 días → ahora la QR tiene 31d de antigüedad relativa al reloj.
      clock.advance(6);
      const r2 = await uc.execute({});
      expect(r2.totalExpired).toBe(1);
    } finally {
      await cleanup(refs);
    }
  });

  // ── IT-04: 0 candidatos ──
  it('IT-04 EC-01 · Sin QRs vencidas ⇒ totalExpired=0, batchCount=0', async () => {
    const refs = await makeRefs();
    try {
      const now = new Date('2026-07-28T01:00:00Z');
      const clock = new FrozenClock(now);
      await insertQr(refs, now, 5, 'sent');
      await insertQr(refs, now, 10, 'viewed');

      const uc = new ExpireQuoteRequestsUs055UseCase(clock, silentLogger, {
        qrExpirationDays: 30,
        batchSize: 100,
      });
      const r = await uc.execute({});
      expect(r.totalExpired).toBe(0);
      expect(r.batchCount).toBe(0);
    } finally {
      await cleanup(refs);
    }
  });

  // ── IT-05: Regresión US-053 (BE-005 refactor cron + BE-003 clockNow en query) ──
  it('IT-05 · Regresión US-053: ExpireQuotesUs053UseCase sigue expirando Quotes con clockNow', async () => {
    const refs = await makeRefs();
    try {
      const now = new Date('2026-07-28T01:00:00Z');
      const clock = new FrozenClock(now);
      // QR y Quote con valid_until = ayer (respecto a clock).
      const qrId = await insertQr(refs, now, 5, 'responded');
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const quote = await prisma.quote.create({
        data: {
          quoteRequestId: qrId,
          vendorProfileId: refs.vendorProfileId,
          amount: '1000.00',
          currency: 'GTQ',
          status: 'sent',
          sentAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
          validUntil: yesterday,
        },
      });

      // Fake notifications sender que sólo cuenta invocaciones.
      const notifyCalls: string[] = [];
      const notifSender: QuoteNotificationSenderPort = {
        notify: async (input) => {
          notifyCalls.push(input.channel);
        },
      };
      const service = new QuoteNotificationService(notifSender, silentLogger);
      const uc = new ExpireQuotesUs053UseCase(service, clock, silentLogger);
      const r = await uc.execute({ correlationId: 'it-05', runId: 'it-05-run' });
      expect(r.totalExpired).toBe(1);
      expect(r.errors).toEqual([]);
      const after = await prisma.quote.findUnique({ where: { id: quote.id } });
      expect(after?.status).toBe('expired');
      expect(after?.expiredAt).not.toBeNull();
      // Fan-out esperado por US-054: `in_app` + `email_simulated`.
      expect(notifyCalls.sort()).toEqual(['email_simulated', 'in_app']);
    } finally {
      await cleanup(refs);
    }
  });

  // ── IT-07: Concurrencia SKIP LOCKED ──
  it('IT-07 EC-04 · Dos workers concurrentes procesan cada QR una sola vez', async () => {
    const refs = await makeRefs();
    try {
      const now = new Date('2026-07-28T01:00:00Z');
      const clock = new FrozenClock(now);
      const N = 200;
      // Inserción masiva optimizada — una sola query.
      const values: string[] = [];
      const params: unknown[] = [];
      for (let i = 0; i < N; i++) {
        const createdAt = new Date(now.getTime() - (31 + i) * 24 * 60 * 60 * 1000);
        values.push(
          `(gen_random_uuid(), $${params.length + 1}::uuid, $${params.length + 2}::uuid, NULL, 'sent'::"QuoteRequestStatus", $${params.length + 3}, $${params.length + 3}, false)`,
        );
        params.push(refs.eventId, refs.categoryId, createdAt);
      }
      await prisma.$executeRawUnsafe(
        `INSERT INTO quote_requests (id, event_id, service_category_id, vendor_profile_id, status, created_at, updated_at, is_seed) VALUES ${values.join(',')}`,
        ...params,
      );

      const uc1 = new ExpireQuoteRequestsUs055UseCase(clock, silentLogger, {
        qrExpirationDays: 30,
        batchSize: 25,
      });
      const uc2 = new ExpireQuoteRequestsUs055UseCase(clock, silentLogger, {
        qrExpirationDays: 30,
        batchSize: 25,
      });

      const [r1, r2] = await Promise.all([
        uc1.execute({ correlationId: 'wk-1' }),
        uc2.execute({ correlationId: 'wk-2' }),
      ]);
      // La suma total debe ser exactamente N (nada duplicado, nada perdido).
      expect(r1.totalExpired + r2.totalExpired).toBe(N);
      // Sanity: la BD refleja el resultado.
      const remaining = await prisma.quoteRequest.count({
        where: { eventId: refs.eventId, status: { in: ['sent', 'viewed'] } },
      });
      expect(remaining).toBe(0);
      const expired = await prisma.quoteRequest.count({
        where: { eventId: refs.eventId, status: 'expired' },
      });
      expect(expired).toBe(N);
    } finally {
      await cleanup(refs);
    }
  });

  // ── IT-08: Performance smoke ──
  it(
    'IT-08 NFR-PERF-001 · 10k QRs vencidas se procesan en < 60s',
    async () => {
      const refs = await makeRefs();
      try {
        const now = new Date('2026-07-28T01:00:00Z');
        const clock = new FrozenClock(now);
        const TARGET = 10_000;
        const CHUNK = 500;
        for (let start = 0; start < TARGET; start += CHUNK) {
          const values: string[] = [];
          const params: unknown[] = [];
          for (let i = 0; i < CHUNK; i++) {
            // Todas las QRs a >30 días: usa 45d ± spread para simular carga real.
            const createdAt = new Date(now.getTime() - (45 + ((start + i) % 300)) * 24 * 60 * 60 * 1000);
            values.push(
              `(gen_random_uuid(), $${params.length + 1}::uuid, $${params.length + 2}::uuid, NULL, 'sent'::"QuoteRequestStatus", $${params.length + 3}, $${params.length + 3}, false)`,
            );
            params.push(refs.eventId, refs.categoryId, createdAt);
          }
          await prisma.$executeRawUnsafe(
            `INSERT INTO quote_requests (id, event_id, service_category_id, vendor_profile_id, status, created_at, updated_at, is_seed) VALUES ${values.join(',')}`,
            ...params,
          );
        }

        const uc = new ExpireQuoteRequestsUs055UseCase(clock, silentLogger, {
          qrExpirationDays: 30,
          batchSize: 500,
        });
        const t0 = Date.now();
        const r = await uc.execute({ correlationId: 'perf' });
        const elapsedMs = Date.now() - t0;

        expect(r.totalExpired).toBe(TARGET);
        expect(r.errors).toEqual([]);
        // NFR-PERF-001: 10k QRs < 60s.
        expect(elapsedMs).toBeLessThan(60_000);
      } finally {
        await cleanup(refs);
      }
    },
    120_000,
  );
});
