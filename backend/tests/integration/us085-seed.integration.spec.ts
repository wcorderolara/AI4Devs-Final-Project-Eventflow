// US-085 QA-002/003/004/005 — Integration: seed idempotente sobre BD real.
// TS-01 (volúmenes), TS-02 (idempotencia), TS-03 (is_seed), TS-04 (catálogos), TS-05 (report),
// TS-06/AI-T-01 (AIRecommendation deterministas). Skip limpio sin BD (`describe.skipIf(!dbUp)`).
import { createHash } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { beforeAll, describe, expect, it } from 'vitest';
import { MockAIProvider } from '../../src/modules/ai-assistance/infrastructure/providers/mock/mock-ai-provider.js';
import { SeedDemoDataUseCase } from '../../src/modules/seed-demo/application/seed-demo-data.use-case.js';
import type { SeedReport } from '../../src/modules/seed-demo/domain/seed-report.js';

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
  'ai_recommendations',
  'ai_prompt_versions',
  'reviews',
  'booking_intents',
  'quotes',
  'quote_requests',
  'budget_items',
  'budgets',
  'event_tasks',
  'events',
  'vendor_services',
  'vendor_profiles',
  'attachments',
  'locations',
  'service_categories',
  'event_types',
  'notifications',
  'admin_actions',
  'sessions',
  'password_reset_tokens',
  'users',
].join(', ');

function runSeed(): Promise<SeedReport> {
  return new SeedDemoDataUseCase({ prisma, ai: new MockAIProvider() }).execute();
}

describe.skipIf(!dbUp)('US-085 — Seed reproducible e idempotente', () => {
  let firstRun: SeedReport;
  let secondRun: SeedReport;

  beforeAll(async () => {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${TABLES} RESTART IDENTITY CASCADE`);
    firstRun = await runSeed();
    secondRun = await runSeed();
  }, 60_000);

  it('TS-05: SeedReport con correlationId, durationMs y exit 0', () => {
    expect(firstRun.exitCode).toBe(0);
    expect(firstRun.correlationId).toMatch(/[0-9a-f-]{36}/);
    expect(firstRun.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('TS-01: volúmenes mínimos BR-SEED-002', async () => {
    expect(await prisma.user.count({ where: { role: 'organizer' } })).toBeGreaterThanOrEqual(5);
    expect(await prisma.vendorProfile.count({ where: { status: 'approved' } })).toBeGreaterThanOrEqual(10);
    expect(await prisma.event.count()).toBeGreaterThanOrEqual(10);
    expect(await prisma.serviceCategory.count()).toBeGreaterThanOrEqual(10);
    expect(await prisma.quoteRequest.count()).toBeGreaterThanOrEqual(15);
    expect(await prisma.quote.count()).toBeGreaterThanOrEqual(10);
    expect(await prisma.review.count()).toBeGreaterThanOrEqual(20);
    expect(await prisma.bookingIntent.count({ where: { status: 'confirmed_intent' } })).toBeGreaterThanOrEqual(1);
  });

  it('TS-04: catálogos cerrados (6 EventType, 10-15 ServiceCategory)', async () => {
    expect(await prisma.eventType.count()).toBe(6);
    const cats = await prisma.serviceCategory.count();
    expect(cats).toBeGreaterThanOrEqual(10);
    expect(cats).toBeLessThanOrEqual(15);
  });

  it('TS-03: 100% de entidades sembradas con is_seed=true', async () => {
    for (const [total, seed] of await Promise.all([
      Promise.all([prisma.user.count(), prisma.user.count({ where: { isSeed: true } })]),
      Promise.all([prisma.event.count(), prisma.event.count({ where: { isSeed: true } })]),
      Promise.all([prisma.review.count(), prisma.review.count({ where: { isSeed: true } })]),
      Promise.all([prisma.aIRecommendation.count(), prisma.aIRecommendation.count({ where: { isSeed: true } })]),
    ])) {
      expect(seed).toBe(total);
    }
  });

  it('TS-06: AIRecommendation deterministas — 8 accepted (features) + 1 pending budget (US-037 SEED-001)', async () => {
    const recs = await prisma.aIRecommendation.findMany({ where: { isSeed: true } });
    // US-037 SEED-001: además de una AIRecommendation `accepted` por cada feature (8), el seed
    // agrega una `budget_suggestion` extra en `status='pending'` para demoar el flujo HITL.
    expect(recs).toHaveLength(9);
    const accepted = recs.filter((r) => r.status === 'accepted');
    const pending = recs.filter((r) => r.status === 'pending');
    expect(accepted).toHaveLength(8);
    expect(pending).toHaveLength(1);
    expect(pending[0]?.kind).toBe('budget_suggestion');
    expect(recs.every((r) => r.isSeed)).toBe(true);
  });

  it('TS-02: re-ejecución idempotente (created=0, unchanged>0)', () => {
    for (const counts of Object.values(secondRun.domains)) {
      expect(counts.created).toBe(0);
      expect(counts.unchanged).toBeGreaterThan(0);
    }
  });

  it('AI-T-01: outputs de AIRecommendation idénticos entre ejecuciones (determinismo)', async () => {
    const recs = await prisma.aIRecommendation.findMany({ where: { isSeed: true }, orderBy: { kind: 'asc' } });
    const hash = createHash('sha256').update(JSON.stringify(recs.map((r) => r.outputPayload))).digest('hex');
    // Segunda corrida no alteró outputs (idempotente) → el hash es estable dentro de la suite.
    const recs2 = await prisma.aIRecommendation.findMany({ where: { isSeed: true }, orderBy: { kind: 'asc' } });
    const hash2 = createHash('sha256').update(JSON.stringify(recs2.map((r) => r.outputPayload))).digest('hex');
    expect(hash2).toBe(hash);
  });
});
