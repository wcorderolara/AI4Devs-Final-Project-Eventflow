// US-087 QA-002/003 + SEED-001 — Integration: mix de estados de evento en el seed.
// AC-01 distribución, AC-02 auto_completed + cercano a auto-completar, AC-03 multi-currency/locale,
// AC-04 organizador ancla + referencias válidas, AC-05 idempotencia, EC-02 coexistencia is_seed=false.
import { PrismaClient } from '@prisma/client';
import { beforeAll, describe, expect, it } from 'vitest';
import { MockAIProvider } from '../../src/modules/ai-assistance/infrastructure/providers/mock/mock-ai-provider.js';
import { SeedDemoDataUseCase, relativeSeedDate } from '../../src/modules/seed-demo/application/seed-demo-data.use-case.js';

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

describe.skipIf(!dbUp)('US-087 — Mix de estados de evento en el seed', () => {
  beforeAll(async () => {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${TABLES} RESTART IDENTITY CASCADE`);
    await runSeed();
  }, 60_000);

  it('AC-01: distribución mínima por estado (draft≥2, active≥4, completed≥2, cancelled≥1) y total 10–15', async () => {
    const seed = { isSeed: true };
    const [draft, active, completed, cancelled, total] = await Promise.all([
      prisma.event.count({ where: { ...seed, status: 'draft' } }),
      prisma.event.count({ where: { ...seed, status: 'active' } }),
      prisma.event.count({ where: { ...seed, status: 'completed' } }),
      prisma.event.count({ where: { ...seed, status: 'cancelled' } }),
      prisma.event.count({ where: seed }),
    ]);
    expect(draft).toBeGreaterThanOrEqual(2);
    expect(active).toBeGreaterThanOrEqual(4);
    expect(completed).toBeGreaterThanOrEqual(2);
    expect(cancelled).toBeGreaterThanOrEqual(1);
    expect(total).toBeGreaterThanOrEqual(10);
    expect(total).toBeLessThanOrEqual(15);
  });

  it('AC-01/VR-06: el evento cancelado preserva la traza en notes (sustituto de cancelled_reason)', async () => {
    const cancelled = await prisma.event.findFirst({ where: { isSeed: true, status: 'cancelled' } });
    expect(cancelled).not.toBeNull();
    expect(cancelled!.notes).toBeTruthy();
  });

  it('AC-02: existe un evento auto_completed=true, completed, con completed_at no nulo', async () => {
    const autoCompleted = await prisma.event.findFirst({ where: { isSeed: true, autoCompleted: true } });
    expect(autoCompleted).not.toBeNull();
    expect(autoCompleted!.status).toBe('completed');
    expect(autoCompleted!.completedAt).not.toBeNull();
  });

  it('AC-02/EC-03: existe un evento active con event_date = hoy − 2 días (dinámico)', async () => {
    const target = relativeSeedDate(-2);
    const near = await prisma.event.findFirst({ where: { isSeed: true, status: 'active', eventDate: target } });
    expect(near).not.toBeNull();
  });

  it('AC-03: multi-currency (GTQ y USD) y multi-locale (es_LATAM y en)', async () => {
    const [gtq, usd, esLatam, en] = await Promise.all([
      prisma.event.count({ where: { isSeed: true, currency: 'GTQ' } }),
      prisma.event.count({ where: { isSeed: true, currency: 'USD' } }),
      prisma.event.count({ where: { isSeed: true, language: 'es_LATAM' } }),
      prisma.event.count({ where: { isSeed: true, language: 'en' } }),
    ]);
    expect(gtq).toBeGreaterThan(0);
    expect(usd).toBeGreaterThan(0);
    expect(esLatam).toBeGreaterThan(0);
    expect(en).toBeGreaterThan(0);
  });

  it('AC-03: la matriz cubre al menos 4 tipos de evento distintos', async () => {
    const events = await prisma.event.findMany({ where: { isSeed: true }, select: { eventTypeId: true } });
    const distinct = new Set(events.map((e) => e.eventTypeId));
    expect(distinct.size).toBeGreaterThanOrEqual(4);
  });

  it('AC-04: cada evento seed referencia un organizador is_seed con rol organizer', async () => {
    const events = await prisma.event.findMany({ where: { isSeed: true }, select: { user: { select: { role: true, isSeed: true } } } });
    expect(events.length).toBeGreaterThan(0);
    expect(events.every((e) => e.user.role === 'organizer' && e.user.isSeed)).toBe(true);
  });

  it('AC-04: al menos un organizador tiene un evento en cada estado draft/active/completed/cancelled', async () => {
    const events = await prisma.event.findMany({ where: { isSeed: true }, select: { userId: true, status: true } });
    const byOrganizer = new Map<string, Set<string>>();
    for (const e of events) {
      const set = byOrganizer.get(e.userId) ?? new Set<string>();
      set.add(e.status);
      byOrganizer.set(e.userId, set);
    }
    const hasAllStates = [...byOrganizer.values()].some(
      (states) => states.has('draft') && states.has('active') && states.has('completed') && states.has('cancelled'),
    );
    expect(hasAllStates).toBe(true);
  });

  it('AC-05: idempotencia — re-ejecutar el seed no cambia los conteos por estado', async () => {
    const before = await prisma.event.groupBy({ by: ['status'], where: { isSeed: true }, _count: true });
    await runSeed();
    const after = await prisma.event.groupBy({ by: ['status'], where: { isSeed: true }, _count: true });
    expect(after).toEqual(before);
  }, 60_000);

  it('EC-02 / SEED-001: coexistencia — un evento is_seed=false sobrevive al re-seed', async () => {
    const org = await prisma.user.findFirst({ where: { role: 'organizer', isSeed: true } });
    const et = await prisma.eventType.findFirst({ where: { isSeed: true } });
    const operational = await prisma.event.create({
      data: { userId: org!.id, eventTypeId: et!.id, title: 'Evento Operativo Real (no-seed)', status: 'active', isSeed: false },
    });
    await runSeed();
    const stillThere = await prisma.event.findUnique({ where: { id: operational.id } });
    expect(stillThere).not.toBeNull();
    expect(stillThere!.isSeed).toBe(false);
  }, 60_000);
});
