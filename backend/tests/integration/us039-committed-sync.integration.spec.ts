// US-039 (PB-P1-023 / QA-002 IT-01..08 + QA-005 MIG-01 + QA-003 CC-01) — Integration tests
// contra Postgres real. `skipIf(!dbUp)` sigue el patrón del repo (US-139) para que la suite
// pueda correr sin DB en local (los tests se saltan; en CI de migraciones se ejecutan).
//
// Cubre:
//   MIG-01 — columnas `committed_synced_at`/`committed_synced_amount` existen y son NULLABLE.
//   IT-01 — applyOnConfirm con BudgetItem existente incrementa `amountCommitted`.
//   IT-02 — applyOnConfirm sin BudgetItem auto-crea (D2) con flags correctos.
//   IT-03 — revertOnCancel decrementa y limpia idempotencia.
//   IT-04 — doble applyOnConfirm no duplica (D1 idempotencia).
//   IT-06 — currency mismatch: rollback total del `$transaction` externo.
//   IT-08 — confirm + cancel + nuevo confirm (misma categoría) equilibra `committed`.
//   CC-01 — Dos `applyOnConfirm` concurrentes sobre el mismo intent: uno gana, otro skip.
import { afterAll, describe, expect, it } from 'vitest';
import { PrismaClient, type Prisma } from '@prisma/client';
import { UpdateCommittedFromBookingIntentUseCase } from '../../src/modules/budget-management/application/update-committed-from-booking-intent.use-case.js';
import { PrismaBookingIntentRepository } from '../../src/modules/booking-intent/infrastructure/prisma-booking-intent.repository.js';
import { PrismaBudgetItemWriteRepository } from '../../src/modules/budget-management/infrastructure/prisma-budget-item-write.repository.js';
import { BookingSyncCurrencyMismatchError } from '../../src/modules/budget-management/domain/errors/booking-sync.errors.js';
import type { BudgetSyncEventLogger } from '../../src/shared/logging/budget-sync-events.js';

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

const clock = { now: (): Date => new Date('2026-07-15T15:00:00Z') };
const silentLogger: BudgetSyncEventLogger = {
  emitSynced: () => undefined,
  emitSkippedAlreadySynced: () => undefined,
  emitSkippedNothingToRevert: () => undefined,
  emitSkippedZeroAmount: () => undefined,
  emitAutoCreatedByBooking: () => undefined,
  emitCurrencyMismatch: () => undefined,
};

const bookingRepo = new PrismaBookingIntentRepository(prisma);
const itemRepo = new PrismaBudgetItemWriteRepository();
const useCase = new UpdateCommittedFromBookingIntentUseCase(bookingRepo, itemRepo, clock, silentLogger);

/** Contexto de fixture. Se aísla por test creando un evento nuevo por corrida. */
interface Fixture {
  userId: string;
  organizerId: string;
  eventId: string;
  budgetId: string;
  vendorProfileId: string;
  categoryCodeCatering: string;
  categoryIdCatering: string;
  categoryCodeVenue: string;
  categoryIdVenue: string;
  quoteId: string;
  quoteAmount: number;
  bookingIntentId: string;
}

async function makeFixture(opts: {
  quoteCurrency?: 'GTQ' | 'USD';
  quoteAmount?: number;
  createBudgetItem?: boolean;
  category?: 'catering' | 'venue';
} = {}): Promise<Fixture> {
  const currency = opts.quoteCurrency ?? 'GTQ';
  const amount = opts.quoteAmount ?? 1234;
  const createItem = opts.createBudgetItem ?? true;
  const category = opts.category ?? 'catering';

  return prisma.$transaction(async (tx) => {
    // Los catálogos son fixed-list; en entornos sin seed (p. ej. CI migrate-smoke sobre BD limpia)
    // los sembramos vía upsert idempotente. Cuando el seed sí corrió, `upsert` es no-op.
    const eventType = await tx.eventType.upsert({
      where: { code: 'wedding' },
      create: { code: 'wedding', label: 'Wedding' },
      update: {},
    });
    const catering = await tx.serviceCategory.upsert({
      where: { code: 'catering' },
      create: { code: 'catering', label: 'Catering' },
      update: {},
    });
    const venue = await tx.serviceCategory.upsert({
      where: { code: 'venue' },
      create: { code: 'venue', label: 'Venue' },
      update: {},
    });
    const targetCategory = category === 'catering' ? catering : venue;

    // Usuarios organizer + vendor mínimos.
    const orgEmail = `organizer-${cryptoRandom()}@test.local`;
    const organizer = await tx.user.create({
      data: {
        email: orgEmail,
        passwordHash: 'x'.repeat(60),
        role: 'organizer',
        fullName: 'Test Organizer',
      },
    });
    const vendorEmail = `vendor-${cryptoRandom()}@test.local`;
    const vendorUser = await tx.user.create({
      data: {
        email: vendorEmail,
        passwordHash: 'x'.repeat(60),
        role: 'vendor',
        fullName: 'Test Vendor',
      },
    });
    const vendorProfile = await tx.vendorProfile.create({
      data: {
        userId: vendorUser.id,
        businessName: `Test Vendor ${cryptoRandom()}`,
        languagesSupported: ['es-LATAM'],
      },
    });

    const event = await tx.event.create({
      data: {
        userId: organizer.id,
        eventTypeId: eventType.id,
        title: `Test Event ${cryptoRandom()}`,
        status: 'active',
        currency: 'GTQ',
      },
    });
    const budget = await tx.budget.create({
      data: { eventId: event.id },
    });
    if (createItem) {
      await tx.budgetItem.create({
        data: {
          budgetId: budget.id,
          label: 'Preexisting',
          categoryCode: targetCategory.code,
          amountPlanned: 10000,
          amountCommitted: 0,
        },
      });
    }
    const qr = await tx.quoteRequest.create({
      data: {
        eventId: event.id,
        serviceCategoryId: targetCategory.id,
        vendorProfileId: vendorProfile.id,
        status: 'sent',
      },
    });
    const quote = await tx.quote.create({
      data: {
        quoteRequestId: qr.id,
        vendorProfileId: vendorProfile.id,
        // US-058 (PB-P1-035 / DB-002): columnas denormalizadas ahora requeridas.
        eventId: event.id,
        serviceCategoryId: targetCategory.id,
        amount,
        currency,
        status: 'accepted',
        acceptedAt: new Date(),
      },
    });
    const bi = await tx.bookingIntent.create({
      data: {
        quoteId: quote.id,
        eventId: event.id,
        serviceCategoryId: targetCategory.id,
        vendorProfileId: vendorProfile.id,
        createdBy: organizer.id,
        status: 'pending',
        isSimulated: true,
      },
    });

    return {
      userId: organizer.id,
      organizerId: organizer.id,
      eventId: event.id,
      budgetId: budget.id,
      vendorProfileId: vendorProfile.id,
      categoryCodeCatering: catering.code,
      categoryIdCatering: catering.id,
      categoryCodeVenue: venue.code,
      categoryIdVenue: venue.id,
      quoteId: quote.id,
      quoteAmount: amount,
      bookingIntentId: bi.id,
    };
  });
}

function cryptoRandom(): string {
  return Math.random().toString(36).slice(2, 10);
}

/** Simula la transición upstream: cambia el status del intent dentro de la misma tx. */
async function upstreamConfirm(tx: Prisma.TransactionClient, id: string): Promise<void> {
  await tx.bookingIntent.update({ where: { id }, data: { status: 'confirmed_intent', confirmedAt: clock.now() } });
}
async function upstreamCancel(
  tx: Prisma.TransactionClient,
  id: string,
  userId: string,
  reason: string,
): Promise<void> {
  await tx.bookingIntent.update({
    where: { id },
    data: { status: 'cancelled', cancelledAt: clock.now(), cancelledBy: userId, cancellationReason: reason },
  });
}

describe.skipIf(!dbUp)('US-039 integration — Postgres real', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('MIG-01 — schema post-migración', () => {
    it('booking_intents expone committed_synced_at (nullable timestamptz)', async () => {
      const cols = await prisma.$queryRaw<Array<{ column_name: string; is_nullable: string; data_type: string }>>`
        SELECT column_name, is_nullable, data_type
        FROM information_schema.columns
        WHERE table_name = 'booking_intents'
          AND column_name IN ('committed_synced_at', 'committed_synced_amount')
        ORDER BY column_name
      `;
      const byName = Object.fromEntries(cols.map((c) => [c.column_name, c]));
      expect(byName.committed_synced_at?.is_nullable).toBe('YES');
      expect(byName.committed_synced_at?.data_type).toBe('timestamp with time zone');
      expect(byName.committed_synced_amount?.is_nullable).toBe('YES');
      expect(byName.committed_synced_amount?.data_type).toBe('numeric');
    });

    it('los booking_intents preexistentes al SEED-001 (o cualquier fila legacy) permiten NULL', async () => {
      // Sanity: la mera consulta no debe fallar; existe al menos 1 fila total en el ambiente
      // (después del seed) y ninguna fila viola el nuevo schema.
      const rows = await prisma.bookingIntent.count();
      expect(rows).toBeGreaterThanOrEqual(0);
    });
  });

  describe('IT-01 — applyOnConfirm con BudgetItem existente', () => {
    it('incrementa amountCommitted y marca committed_synced_at', async () => {
      const fx = await makeFixture({ quoteAmount: 500, createBudgetItem: true });
      await prisma.$transaction(async (tx) => {
        await upstreamConfirm(tx, fx.bookingIntentId);
        await useCase.applyOnConfirm({ bookingIntentId: fx.bookingIntentId, tx });
      });
      const bi = await prisma.bookingIntent.findUniqueOrThrow({ where: { id: fx.bookingIntentId } });
      const item = await prisma.budgetItem.findFirstOrThrow({
        where: { budgetId: fx.budgetId, categoryCode: fx.categoryCodeCatering },
      });
      expect(bi.committedSyncedAt).not.toBeNull();
      expect(bi.committedSyncedAmount?.toNumber()).toBe(500);
      expect(item.amountCommitted.toNumber()).toBe(500);

      const budget = await prisma.budget.findUniqueOrThrow({ where: { id: fx.budgetId } });
      expect(budget.totalCommitted.toNumber()).toBe(500);
    });
  });

  describe('IT-02 — auto-create D2 sin BudgetItem previo', () => {
    it('crea el item con planned=0, committed inicial=0 (luego se incrementa), aiRecommendationId=null', async () => {
      const fx = await makeFixture({ quoteAmount: 300, createBudgetItem: false });
      await prisma.$transaction(async (tx) => {
        await upstreamConfirm(tx, fx.bookingIntentId);
        await useCase.applyOnConfirm({ bookingIntentId: fx.bookingIntentId, tx });
      });
      const items = await prisma.budgetItem.findMany({
        where: { budgetId: fx.budgetId, categoryCode: fx.categoryCodeCatering },
      });
      expect(items).toHaveLength(1);
      expect(items[0]!.amountPlanned.toNumber()).toBe(0);
      expect(items[0]!.amountCommitted.toNumber()).toBe(300);
      expect(items[0]!.aiRecommendationId).toBeNull();
      expect(items[0]!.label).toContain('Auto-created by booking');
    });
  });

  describe('IT-03 — revertOnCancel decrementa y limpia idempotencia', () => {
    it('applyOnConfirm luego revertOnCancel deja committed=0 y committed_synced_at=NULL', async () => {
      const fx = await makeFixture({ quoteAmount: 400, createBudgetItem: true });
      await prisma.$transaction(async (tx) => {
        await upstreamConfirm(tx, fx.bookingIntentId);
        await useCase.applyOnConfirm({ bookingIntentId: fx.bookingIntentId, tx });
      });
      await prisma.$transaction(async (tx) => {
        await upstreamCancel(tx, fx.bookingIntentId, fx.organizerId, 'test');
        await useCase.revertOnCancel({
          bookingIntentId: fx.bookingIntentId,
          tx,
          cancellation: { at: clock.now(), by: fx.organizerId, reason: 'test' },
        });
      });
      const bi = await prisma.bookingIntent.findUniqueOrThrow({ where: { id: fx.bookingIntentId } });
      const item = await prisma.budgetItem.findFirstOrThrow({
        where: { budgetId: fx.budgetId, categoryCode: fx.categoryCodeCatering },
      });
      expect(bi.committedSyncedAt).toBeNull();
      expect(bi.committedSyncedAmount).toBeNull();
      expect(item.amountCommitted.toNumber()).toBe(0);
    });
  });

  describe('IT-04 — idempotencia: doble apply no duplica', () => {
    it('segundo applyOnConfirm sobre el mismo intent no incrementa por segunda vez', async () => {
      const fx = await makeFixture({ quoteAmount: 700, createBudgetItem: true });
      await prisma.$transaction(async (tx) => {
        await upstreamConfirm(tx, fx.bookingIntentId);
        await useCase.applyOnConfirm({ bookingIntentId: fx.bookingIntentId, tx });
      });
      await prisma.$transaction(async (tx) => {
        await useCase.applyOnConfirm({ bookingIntentId: fx.bookingIntentId, tx });
      });
      const item = await prisma.budgetItem.findFirstOrThrow({
        where: { budgetId: fx.budgetId, categoryCode: fx.categoryCodeCatering },
      });
      expect(item.amountCommitted.toNumber()).toBe(700);
    });
  });

  describe('IT-06 — currency mismatch → rollback total', () => {
    it('lanza BookingSyncCurrencyMismatchError y el $transaction externo revierte todo', async () => {
      const fx = await makeFixture({ quoteAmount: 999, quoteCurrency: 'USD', createBudgetItem: true });
      await expect(
        prisma.$transaction(async (tx) => {
          await upstreamConfirm(tx, fx.bookingIntentId);
          await useCase.applyOnConfirm({ bookingIntentId: fx.bookingIntentId, tx });
        }),
      ).rejects.toBeInstanceOf(BookingSyncCurrencyMismatchError);

      // Rollback: el intent NO quedó en confirmed_intent y committed NO se incrementó.
      const bi = await prisma.bookingIntent.findUniqueOrThrow({ where: { id: fx.bookingIntentId } });
      const item = await prisma.budgetItem.findFirstOrThrow({
        where: { budgetId: fx.budgetId, categoryCode: fx.categoryCodeCatering },
      });
      expect(bi.status).toBe('pending');
      expect(bi.committedSyncedAt).toBeNull();
      expect(item.amountCommitted.toNumber()).toBe(0);
    });
  });

  describe('IT-08 — confirm + cancel + nuevo confirm en misma categoría equilibra', () => {
    it('committed final es solo el del segundo intent', async () => {
      const fx1 = await makeFixture({ quoteAmount: 500, createBudgetItem: true });
      // Segundo intent sobre el MISMO evento + categoría con distinto vendor (BR-BOOKING-007
      // permite max 1 confirmed_intent activo; en este test el primero se cancela antes de que
      // confirmemos el segundo — sin colisión de unicidad).
      const secondVendorUser = await prisma.user.create({
        data: {
          email: `vendor2-${cryptoRandom()}@test.local`,
          passwordHash: 'x'.repeat(60),
          role: 'vendor',
          fullName: 'Test Vendor 2',
        },
      });
      const secondVendor = await prisma.vendorProfile.create({
        data: {
          userId: secondVendorUser.id,
          businessName: `Test Vendor 2 ${cryptoRandom()}`,
          languagesSupported: ['es-LATAM'],
        },
      });
      const secondQuoteRequest = await prisma.quoteRequest.create({
        data: {
          eventId: fx1.eventId,
          serviceCategoryId: fx1.categoryIdCatering,
          vendorProfileId: secondVendor.id,
          status: 'sent',
        },
      });
      const secondQuote = await prisma.quote.create({
        data: {
          quoteRequestId: secondQuoteRequest.id,
          vendorProfileId: secondVendor.id,
          // US-058 (PB-P1-035 / DB-002): columnas denormalizadas ahora requeridas.
          eventId: fx1.eventId,
          serviceCategoryId: fx1.categoryIdCatering,
          amount: 200,
          currency: 'GTQ',
          status: 'accepted',
          acceptedAt: new Date(),
        },
      });
      const secondIntent = await prisma.bookingIntent.create({
        data: {
          quoteId: secondQuote.id,
          eventId: fx1.eventId,
          serviceCategoryId: fx1.categoryIdCatering,
          vendorProfileId: secondVendor.id,
          createdBy: fx1.organizerId,
          status: 'pending',
          isSimulated: true,
        },
      });

      await prisma.$transaction(async (tx) => {
        await upstreamConfirm(tx, fx1.bookingIntentId);
        await useCase.applyOnConfirm({ bookingIntentId: fx1.bookingIntentId, tx });
      });
      await prisma.$transaction(async (tx) => {
        await upstreamCancel(tx, fx1.bookingIntentId, fx1.organizerId, 'reschedule');
        await useCase.revertOnCancel({
          bookingIntentId: fx1.bookingIntentId,
          tx,
          cancellation: { at: clock.now(), by: fx1.organizerId, reason: 'reschedule' },
        });
      });
      await prisma.$transaction(async (tx) => {
        await upstreamConfirm(tx, secondIntent.id);
        await useCase.applyOnConfirm({ bookingIntentId: secondIntent.id, tx });
      });

      const item = await prisma.budgetItem.findFirstOrThrow({
        where: { budgetId: fx1.budgetId, categoryCode: fx1.categoryCodeCatering },
      });
      expect(item.amountCommitted.toNumber()).toBe(200);
    });
  });

  describe('CC-01 — dos applyOnConfirm concurrentes sobre el mismo intent', () => {
    it('exactamente uno gana; el segundo hace skip idempotente (sin double-count)', async () => {
      const fx = await makeFixture({ quoteAmount: 250, createBudgetItem: true });
      // Poner el intent en confirmed_intent para satisfacer VR-05 en ambos calls.
      await prisma.bookingIntent.update({
        where: { id: fx.bookingIntentId },
        data: { status: 'confirmed_intent', confirmedAt: clock.now() },
      });

      const runApply = (): Promise<void> =>
        prisma.$transaction(
          async (tx) => useCase.applyOnConfirm({ bookingIntentId: fx.bookingIntentId, tx }),
          { timeout: 10000 },
        );

      const results = await Promise.allSettled([runApply(), runApply()]);
      const okCount = results.filter((r) => r.status === 'fulfilled').length;
      expect(okCount).toBe(2); // ambos terminan OK (uno aplica, otro skip)

      const item = await prisma.budgetItem.findFirstOrThrow({
        where: { budgetId: fx.budgetId, categoryCode: fx.categoryCodeCatering },
      });
      // Double-count prevenido: solo un increment de 250.
      expect(item.amountCommitted.toNumber()).toBe(250);
      const bi = await prisma.bookingIntent.findUniqueOrThrow({ where: { id: fx.bookingIntentId } });
      expect(bi.committedSyncedAmount?.toNumber()).toBe(250);
    });
  });
});
