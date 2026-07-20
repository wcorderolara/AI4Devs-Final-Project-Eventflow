// US-088 QA-002..006 + SEED-001/002 — Integration: BookingIntent confirmado + reseñas verificadas.
// AC-01 distribución bookings, AC-02 invariantes, AC-03 distribución reseñas, AC-04 moderación
// (AdminAction), AC-05 BudgetItem.committed, AC-06 idempotencia, EC-03 fechas cancelación, EC-04
// reseña ↔ confirmed_intent.
import { PrismaClient } from '@prisma/client';
import { beforeAll, describe, expect, it } from 'vitest';
import { MockAIProvider } from '../../src/modules/ai-assistance/infrastructure/providers/mock/mock-ai-provider.js';
import { SeedDemoDataUseCase } from '../../src/modules/seed-demo/application/seed-demo-data.use-case.js';

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

const TABLES = [
  'ai_recommendations', 'ai_prompt_versions', 'reviews', 'booking_intents', 'quotes',
  'quote_requests', 'budget_items', 'budgets', 'event_tasks', 'events', 'vendor_services',
  'vendor_profiles', 'attachments', 'locations', 'service_categories', 'event_types',
  'notifications', 'admin_actions', 'sessions', 'password_reset_tokens', 'users',
].join(', ');

function runSeed() {
  return new SeedDemoDataUseCase({ prisma, ai: new MockAIProvider() }).execute();
}

describe.skipIf(!dbUp)('US-088 — BookingIntent confirmado + reseñas verificadas', () => {
  beforeAll(async () => {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${TABLES} RESTART IDENTITY CASCADE`);
    await runSeed();
  }, 60_000);

  it('AC-01: distribución de BookingIntent (confirmed≥3, pending 1-2, cancelado total ≥2, total 5-8)', async () => {
    const [confirmed, pending, cancelled, total] = await Promise.all([
      prisma.bookingIntent.count({ where: { isSeed: true, status: 'confirmed_intent' } }),
      prisma.bookingIntent.count({ where: { isSeed: true, status: 'pending' } }),
      prisma.bookingIntent.count({ where: { isSeed: true, status: 'cancelled' } }),
      prisma.bookingIntent.count({ where: { isSeed: true } }),
    ]);
    expect(confirmed).toBeGreaterThanOrEqual(3);
    expect(pending).toBeGreaterThanOrEqual(1);
    expect(pending).toBeLessThanOrEqual(2);
    expect(cancelled).toBeGreaterThanOrEqual(2);
    expect(total).toBeGreaterThanOrEqual(5);
    expect(total).toBeLessThanOrEqual(8);
  });

  it('AC-02: invariantes — todos is_simulated + is_seed y quote accepted', async () => {
    const bookings = await prisma.bookingIntent.findMany({
      where: { isSeed: true },
      select: { isSimulated: true, isSeed: true, quote: { select: { status: true } } },
    });
    expect(bookings.every((b) => b.isSimulated && b.isSeed && b.quote.status === 'accepted')).toBe(true);
  });

  it('AC-01 / EC-03 / SEED-001: cancelación desde confirmed_intent con cancelled_at > confirmed_at y razón', async () => {
    const cancelledFromConfirmed = await prisma.bookingIntent.findFirst({
      where: { isSeed: true, status: 'cancelled', confirmedAt: { not: null } },
    });
    expect(cancelledFromConfirmed).not.toBeNull();
    expect(cancelledFromConfirmed!.cancelledAt).not.toBeNull();
    expect(cancelledFromConfirmed!.cancellationReason).toBeTruthy();
    expect(cancelledFromConfirmed!.cancelledAt!.getTime()).toBeGreaterThan(cancelledFromConfirmed!.confirmedAt!.getTime());
  });

  it('AC-01: cancelación desde pending (confirmed_at nulo, cancelled_at y razón presentes)', async () => {
    const cancelledFromPending = await prisma.bookingIntent.findFirst({
      where: { isSeed: true, status: 'cancelled', confirmedAt: null },
    });
    expect(cancelledFromPending).not.toBeNull();
    expect(cancelledFromPending!.cancelledAt).not.toBeNull();
    expect(cancelledFromPending!.cancellationReason).toBeTruthy();
  });

  it('AC-03: distribución de reseñas (total 20-40; published ~70%, hidden ~20%, removed ~10%)', async () => {
    const [total, published, hidden, removed] = await Promise.all([
      prisma.review.count({ where: { isSeed: true } }),
      prisma.review.count({ where: { isSeed: true, status: 'published' } }),
      prisma.review.count({ where: { isSeed: true, status: 'hidden' } }),
      prisma.review.count({ where: { isSeed: true, status: 'removed' } }),
    ]);
    expect(total).toBeGreaterThanOrEqual(20);
    expect(total).toBeLessThanOrEqual(40);
    expect(published).toBeGreaterThan(hidden);
    expect(hidden).toBeGreaterThanOrEqual(removed);
    expect(removed).toBeGreaterThanOrEqual(1);
  });

  it('AC-03: rating ∈ 1..5 y cobertura multi-locale (≥2 textos distintos)', async () => {
    const reviews = await prisma.review.findMany({ where: { isSeed: true }, select: { rating: true, comment: true } });
    expect(reviews.every((r) => r.rating >= 1 && r.rating <= 5)).toBe(true);
    const distinctComments = new Set(reviews.map((r) => r.comment));
    expect(distinctComments.size).toBeGreaterThanOrEqual(2);
  });

  it('EC-04: toda reseña seed está asociada a un BookingIntent confirmed_intent', async () => {
    const reviews = await prisma.review.findMany({ where: { isSeed: true }, select: { bookingIntent: { select: { status: true } } } });
    expect(reviews.length).toBeGreaterThan(0);
    expect(reviews.every((r) => r.bookingIntent.status === 'confirmed_intent')).toBe(true);
  });

  it('AC-04: cada reseña hidden/removed tiene su AdminAction de moderación', async () => {
    // US-067 (BE-006 / DEV-08): los literales `action` se alinearon a los canónicos que produce
    // `ModerateReviewUseCase` en runtime — `hide`/`remove` en vez de `HIDE_REVIEW`/`REMOVE_REVIEW`.
    // Se preserva la semántica AC-04 (1 AdminAction por review moderada) con los nuevos valores.
    const [hidden, removed, hideActions, removeActions] = await Promise.all([
      prisma.review.count({ where: { isSeed: true, status: 'hidden' } }),
      prisma.review.count({ where: { isSeed: true, status: 'removed' } }),
      prisma.adminAction.count({ where: { isSeed: true, action: 'hide', targetEntity: 'review' } }),
      prisma.adminAction.count({ where: { isSeed: true, action: 'remove', targetEntity: 'review' } }),
    ]);
    expect(hideActions).toBe(hidden);
    expect(removeActions).toBe(removed);
  });

  it('US-067 BE-006: reviews hidden/removed del seed también persisten las 4 columnas audit + chain admin_action_id', async () => {
    const moderated = await prisma.review.findMany({
      where: { isSeed: true, status: { in: ['hidden', 'removed'] } },
      select: {
        id: true,
        status: true,
        moderatedBy: true,
        moderatedAt: true,
        moderationReason: true,
        adminActionId: true,
      },
    });
    expect(moderated.length).toBeGreaterThan(0);
    for (const r of moderated) {
      expect(r.moderatedBy).not.toBeNull();
      expect(r.moderatedAt).not.toBeNull();
      expect(r.moderationReason).not.toBeNull();
      expect(r.adminActionId).not.toBeNull();
      const action = await prisma.adminAction.findUnique({ where: { id: r.adminActionId! } });
      expect(action?.targetEntity).toBe('review');
      expect(action?.targetId).toBe(r.id);
      expect(action?.action).toBe(r.status === 'hidden' ? 'hide' : 'remove');
    }
  });

  it('AC-05: BudgetItem.committed refleja el monto del quote por cada confirmed_intent', async () => {
    const confirmed = await prisma.bookingIntent.findMany({
      where: { isSeed: true, status: 'confirmed_intent' },
      select: { eventId: true, quote: { select: { amount: true } } },
    });
    for (const b of confirmed) {
      const budget = await prisma.budget.findUnique({ where: { eventId: b.eventId }, select: { id: true } });
      const items = await prisma.budgetItem.findMany({ where: { budgetId: budget!.id }, select: { amountCommitted: true } });
      const expected = Number(b.quote.amount);
      expect(items.some((it) => Number(it.amountCommitted) === expected)).toBe(true);
    }
  });

  it('SEED-002: existe ≥1 reseña published ligada a un confirmed_intent (reseña verificada visible)', async () => {
    const verified = await prisma.review.count({
      where: { isSeed: true, status: 'published', bookingIntent: { status: 'confirmed_intent' } },
    });
    expect(verified).toBeGreaterThanOrEqual(1);
  });

  it('AC-06: idempotencia — re-ejecutar el seed no cambia los conteos', async () => {
    const before = await Promise.all([
      prisma.bookingIntent.count({ where: { isSeed: true } }),
      prisma.review.count({ where: { isSeed: true } }),
      prisma.adminAction.count({ where: { isSeed: true } }),
    ]);
    await runSeed();
    const after = await Promise.all([
      prisma.bookingIntent.count({ where: { isSeed: true } }),
      prisma.review.count({ where: { isSeed: true } }),
      prisma.adminAction.count({ where: { isSeed: true } }),
    ]);
    expect(after).toEqual(before);
  }, 60_000);
});
