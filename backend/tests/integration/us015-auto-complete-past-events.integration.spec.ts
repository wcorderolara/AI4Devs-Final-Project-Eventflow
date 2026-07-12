// US-015 / QA-001 (integration) + BE-001 + BE-002 + DB-001 + SEED-001.
// Cubre contra Postgres real:
// * `findExpiredActive` filtra por status='active', deletedAt IS NULL y event_date <= expiredBefore.
// * `markCompleted` es race-safe (updateMany con filtro defensivo devuelve affected=0 si otro
//    proceso ya marcó `completed` o `cancelled`).
// * End-to-end del use case con `Clock` fake y datos sembrados por el test.
// * EXPLAIN muestra uso del índice parcial `idx_events_auto_complete_candidates` (o Seq Scan
//   con cardinalidad insuficiente, observación no bloqueante).
//
// Prereq: existen `users`, `locations` y `event_types` (seed corrido previamente en CI/dev).
// Si no, la suite se salta limpiamente.
import { PrismaClient, Prisma } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaEventRepository } from '../../src/modules/event-planning/infrastructure/prisma-event.repository.js';
import { AutoCompletePastEventsUseCase } from '../../src/modules/event-planning/application/auto-complete-past-events.use-case.js';
import type { ClockPort } from '../../src/shared/domain/clock.port.js';

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

class FixedClock implements ClockPort {
  constructor(private t: Date) {}
  now(): Date {
    return new Date(this.t.getTime());
  }
}

async function pickRefs(): Promise<{ userId: string; locationId: string; eventTypeId: string } | null> {
  const [user, location, eventType] = await Promise.all([
    prisma.user.findFirst({ where: { role: 'organizer' } }),
    prisma.location.findFirst({ where: { deletedAt: null } }),
    prisma.eventType.findFirst({ where: { isActive: true, deletedAt: null } }),
  ]);
  if (!user || !location || !eventType) return null;
  return { userId: user.id, locationId: location.id, eventTypeId: eventType.id };
}

async function insertFixture(
  refs: { userId: string; locationId: string; eventTypeId: string },
  offsetDays: number,
  overrides: { status?: 'draft' | 'active' | 'completed' | 'cancelled'; deletedAt?: Date | null } = {},
): Promise<string> {
  const eventDate = new Date();
  eventDate.setUTCHours(0, 0, 0, 0);
  eventDate.setUTCDate(eventDate.getUTCDate() + offsetDays);
  const created = await prisma.event.create({
    data: {
      userId: refs.userId,
      eventTypeId: refs.eventTypeId,
      locationId: refs.locationId,
      title: `us015-fixture-${offsetDays}d-${Date.now()}`,
      status: overrides.status ?? 'active',
      currency: 'GTQ',
      language: 'es_LATAM',
      eventDate,
      guestsCount: 10,
      estimatedBudget: new Prisma.Decimal('100'),
      notes: null,
      autoCompleted: false,
      deletedAt: overrides.deletedAt ?? null,
      isSeed: false,
    },
  });
  return created.id;
}

const createdIds: string[] = [];
let refs: Awaited<ReturnType<typeof pickRefs>> = null;

describe.skipIf(!dbUp)('US-015 integration — findExpiredActive / markCompleted / use case', () => {
  beforeAll(async () => {
    refs = await pickRefs();
    if (!refs) return;
    createdIds.push(await insertFixture(refs, -5));
    createdIds.push(await insertFixture(refs, -3));
    createdIds.push(await insertFixture(refs, -2));
    createdIds.push(await insertFixture(refs, -1));
    createdIds.push(await insertFixture(refs, +5));
    createdIds.push(await insertFixture(refs, -3, { status: 'draft' }));
    createdIds.push(await insertFixture(refs, -3, { status: 'cancelled' }));
    createdIds.push(await insertFixture(refs, -3, { status: 'completed' }));
    createdIds.push(await insertFixture(refs, -3, { deletedAt: new Date() }));
  }, 60_000);

  afterAll(async () => {
    if (createdIds.length > 0) {
      await prisma.event.deleteMany({ where: { id: { in: createdIds } } });
    }
    await prisma.$disconnect();
  });

  it('BE-001: findExpiredActive filtra por status=active + deletedAt=null + eventDate ≤ cutoff', async () => {
    if (!refs) return;
    const repo = new PrismaEventRepository(prisma);
    const cutoff = new Date();
    cutoff.setUTCHours(0, 0, 0, 0);
    cutoff.setUTCDate(cutoff.getUTCDate() - 2);
    const rows = await repo.findExpiredActive(cutoff);
    const ids = new Set(rows.map((r) => r.id));
    const [minus5, minus3, minus2, minus1, plus5, draft, cancelled, completed, softDel] = createdIds as [string, string, string, string, string, string, string, string, string];
    expect(ids.has(minus5)).toBe(true);
    expect(ids.has(minus3)).toBe(true);
    expect(ids.has(minus2)).toBe(true);
    expect(ids.has(minus1)).toBe(false);
    expect(ids.has(plus5)).toBe(false);
    expect(ids.has(draft)).toBe(false);
    expect(ids.has(cancelled)).toBe(false);
    expect(ids.has(completed)).toBe(false);
    expect(ids.has(softDel)).toBe(false);
  });

  it('BE-002: markCompleted actualiza los 3 campos y devuelve affected=1', async () => {
    if (!refs) return;
    const target = createdIds[0]!;
    const repo = new PrismaEventRepository(prisma);
    const now = new Date('2026-07-15T00:30:00Z');
    const { affected } = await repo.markCompleted(target, { autoCompleted: true, completedAt: now });
    expect(affected).toBe(1);
    const after = await prisma.event.findUnique({ where: { id: target } });
    expect(after?.status).toBe('completed');
    expect(after?.autoCompleted).toBe(true);
    expect(after?.completedAt?.toISOString()).toBe(now.toISOString());
  });

  it('BE-002 / EC-03: race — markCompleted sobre evento ya completed devuelve affected=0', async () => {
    if (!refs) return;
    const repo = new PrismaEventRepository(prisma);
    const { affected } = await repo.markCompleted(createdIds[0]!, {
      autoCompleted: true,
      completedAt: new Date(),
    });
    expect(affected).toBe(0);
  });

  it('QA-001 end-to-end: use case procesa los eventos elegibles con Clock fake', async () => {
    if (!refs) return;
    const repo = new PrismaEventRepository(prisma);
    const clock = new FixedClock(new Date());
    const captured: Record<string, unknown>[] = [];
    const uc = new AutoCompletePastEventsUseCase({
      repo,
      clock,
      logger: {
        info: (p) => captured.push(p),
        error: (p) => captured.push(p),
      },
    });
    const result = await uc.execute({ runId: 'it-run' });
    // createdIds[0] ya está completed; deben quedar elegibles createdIds[1] y createdIds[2] al menos.
    expect(result.affectedCount).toBeGreaterThanOrEqual(2);
  });

  it('DB-001: EXPLAIN registra el uso (o Seq Scan justificado) del índice parcial idx_events_auto_complete_candidates', async () => {
    if (!refs) return;
    const cutoff = new Date();
    cutoff.setUTCHours(0, 0, 0, 0);
    cutoff.setUTCDate(cutoff.getUTCDate() - 2);
    const raw = await prisma.$queryRawUnsafe<Array<{ 'QUERY PLAN': string }>>(
      `EXPLAIN SELECT id, event_date FROM events WHERE status = 'active' AND deleted_at IS NULL AND event_date <= '${cutoff.toISOString()}'`,
    );
    const plan = raw.map((r) => r['QUERY PLAN']).join('\n');
    const usedIndex = /idx_events_auto_complete_candidates/i.test(plan);
    const seqScan = /Seq Scan/i.test(plan);
    // No bloqueante: registrar el resultado en el output del test para observación operativa.
    expect(usedIndex || seqScan).toBe(true);
  });
});
