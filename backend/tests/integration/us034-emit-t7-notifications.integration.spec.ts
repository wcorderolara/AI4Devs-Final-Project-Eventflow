// US-034 (PB-P2-004 / QA-002 + QA-003 + QA-004) — Integration tests contra Postgres real.
//
// Cubre:
//   * IT-01 emisión correcta T-7 (par in_app + email_simulated con payload correcto).
//   * IT-02 idempotencia (rerun no duplica; `@security`).
//   * IT-03 exclusión por `event.status` (draft, completed, cancelled).
//   * IT-04 exclusión por `event_task.status` (done, skipped).
//   * IT-05 rango exacto T-7 (T-6/T-8 excluidos).
//   * IT-06 aislamiento BR-NOTIF-005 (`user_id === event.owner_id`; `@security`).
//   * IT-07 sin `due_date`.
//   * IT-08 timezone (`due_date` que representa T-7 en Guatemala pero T-6 en UTC).
//   * NT-01..NT-05 (negatives: done/skipped, T-6/T-8, cancelled, sin due_date, segunda corrida).
//
// Patrón `describe.skipIf(!dbUp)` — mismo que `us015-auto-complete-past-events.integration.spec.ts`.
// Sin BD la suite se salta limpiamente (dev local sin Postgres → 0 fallos). En CI con Postgres
// arriba corre completa.
import { PrismaClient, Prisma } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { EmitT7NotificationsUseCase } from '../../src/modules/notifications/application/emit-t7-notifications.use-case.js';
import { PrismaEventTaskT7Repository } from '../../src/modules/task-management/infrastructure/prisma-event-task-t7.repository.js';
import { PrismaNotificationT7Repository } from '../../src/modules/notifications/infrastructure/prisma-notification-t7.repository.js';
import { LoggingSimulatedT7EmailAdapter } from '../../src/modules/notifications/infrastructure/logging-simulated-t7-email.adapter.js';
import { PrismaOrganizerLanguageLookup } from '../../src/modules/event-planning/infrastructure/prisma-organizer-language.lookup.js';
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
  constructor(private readonly t: Date) {}
  now(): Date {
    return new Date(this.t.getTime());
  }
}

interface CapturedLog {
  level: 'info' | 'error';
  payload: Record<string, unknown>;
}

function makeLogger(): { logger: { info: (p: Record<string, unknown>) => void; error: (p: Record<string, unknown>) => void }; captured: CapturedLog[] } {
  const captured: CapturedLog[] = [];
  return {
    logger: {
      info: (p) => captured.push({ level: 'info', payload: p }),
      error: (p) => captured.push({ level: 'error', payload: p }),
    },
    captured,
  };
}

async function pickCatalogRefs(): Promise<{ eventTypeId: string; locationId: string } | null> {
  const [eventType, location] = await Promise.all([
    prisma.eventType.findFirst({ where: { isActive: true, deletedAt: null } }),
    prisma.location.findFirst({ where: { deletedAt: null } }),
  ]);
  if (!eventType || !location) return null;
  return { eventTypeId: eventType.id, locationId: location.id };
}

/** ISO-8601 midnight UTC del día `daysFromNow` relativos a `base`. */
function calendarDay(base: Date, daysFromNow: number): Date {
  const d = new Date(base.getTime());
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + daysFromNow);
  return d;
}

/**
 * `calculateT7TargetDate(clockNow)` retorna T+7 desde el día calendario Guatemala.
 * Al usar un `clockNow` con `T00:00:00.000Z` UTC (18:00 Guatemala del día anterior),
 * el `targetDate` calculado será `(clockDay - 1 día) + 7 días = clockDay + 6 días`
 * — no lo que queremos. Para tests deterministas usamos `T14:00:00Z` (08:00 hora
 * Guatemala del MISMO día UTC), lo que garantiza `targetDate = clockDayUTC + 7 días`.
 */
function clockAt08GuatemalaOn(baseUtcDay: Date): Date {
  const d = new Date(baseUtcDay.getTime());
  d.setUTCHours(14, 0, 0, 0);
  return d;
}

interface OrganizerFixture {
  userId: string;
  eventId: string;
  taskIds: string[];
}

async function insertOrganizerWithTasks(
  refs: { eventTypeId: string; locationId: string },
  tag: string,
  opts: {
    eventStatus?: 'draft' | 'active' | 'completed' | 'cancelled';
    eventLanguage?: 'es_LATAM' | 'es_ES' | 'pt' | 'en';
    preferredLanguage?: 'es_LATAM' | 'es_ES' | 'pt' | 'en' | null;
    tasks: Array<{
      title: string;
      status?: 'pending' | 'active' | 'in_progress' | 'done' | 'skipped';
      dueDate?: Date | null;
    }>;
  },
): Promise<OrganizerFixture> {
  const now = Date.now();
  const user = await prisma.user.create({
    data: {
      email: `us034-${tag}-${now}@test.local`,
      passwordHash: 'x',
      fullName: `US-034 Fixture ${tag}`,
      role: 'organizer',
      status: 'active',
      preferredLanguage: opts.preferredLanguage ?? 'es_LATAM',
    },
  });
  const event = await prisma.event.create({
    data: {
      userId: user.id,
      eventTypeId: refs.eventTypeId,
      locationId: refs.locationId,
      title: `us034-${tag}-event-${now}`,
      status: opts.eventStatus ?? 'active',
      currency: 'GTQ',
      language: opts.eventLanguage ?? 'es_LATAM',
      eventDate: new Date('2030-01-01T00:00:00Z'),
      guestsCount: 10,
      estimatedBudget: new Prisma.Decimal('100'),
      isSeed: false,
    },
  });
  const taskIds: string[] = [];
  for (const t of opts.tasks) {
    const task = await prisma.eventTask.create({
      data: {
        eventId: event.id,
        title: t.title,
        status: t.status ?? 'pending',
        origin: 'manual',
        dueDate: t.dueDate ?? null,
      },
    });
    taskIds.push(task.id);
  }
  return { userId: user.id, eventId: event.id, taskIds };
}

async function cleanupFixture(fx: OrganizerFixture): Promise<void> {
  await prisma.notification.deleteMany({ where: { userId: fx.userId } });
  await prisma.eventTask.deleteMany({ where: { id: { in: fx.taskIds } } });
  await prisma.event.deleteMany({ where: { id: fx.eventId } });
  await prisma.user.deleteMany({ where: { id: fx.userId } });
}

function buildUseCase(clock: ClockPort, logger: ReturnType<typeof makeLogger>['logger']) {
  return new EmitT7NotificationsUseCase({
    clock,
    taskRepo: new PrismaEventTaskT7Repository(prisma),
    notificationRepo: new PrismaNotificationT7Repository(prisma),
    languageLookup: new PrismaOrganizerLanguageLookup(prisma),
    emailAdapter: new LoggingSimulatedT7EmailAdapter(logger),
    logger,
    batchSize: 100,
  });
}

describe.skipIf(!dbUp)('US-034 integration — EmitT7NotificationsUseCase contra Postgres real', () => {
  let refs: Awaited<ReturnType<typeof pickCatalogRefs>> = null;
  const fixtures: OrganizerFixture[] = [];

  beforeAll(async () => {
    refs = await pickCatalogRefs();
  }, 60_000);

  afterAll(async () => {
    for (const fx of fixtures) {
      await cleanupFixture(fx);
    }
    await prisma.$disconnect();
  });

  it('IT-01 (AC-01): 1 evento active + 1 tarea pending con due_date=T+7 → 2 filas (in_app + email_simulated)', async () => {
    if (!refs) return;
    const clockNow = clockAt08GuatemalaOn(calendarDay(new Date(), 0));
    const target = calendarDay(clockNow, 7);
    const fx = await insertOrganizerWithTasks(refs, 'it01', {
      tasks: [{ title: 'T-7 candidata', dueDate: target }],
    });
    fixtures.push(fx);

    const { logger } = makeLogger();
    const useCase = buildUseCase(new FixedClock(clockNow), logger);
    const result = await useCase.execute({ correlationId: 'cid-it-01' });

    expect(result.affected).toBe(1);
    const rows = await prisma.notification.findMany({
      where: { userId: fx.userId, type: 'task_due_soon' },
    });
    expect(rows).toHaveLength(2);
    const channels = rows.map((r) => (r.payload as { channel: string }).channel).sort();
    expect(channels).toEqual(['email_simulated', 'in_app']);
    // Todas las filas apuntan a la tarea correcta y llevan `languageCode` resuelto.
    for (const r of rows) {
      const p = r.payload as { taskId: string; languageCode: string };
      expect(p.taskId).toBe(fx.taskIds[0]);
      expect(p.languageCode).toBe('es-LATAM');
    }
  }, 60_000);

  it('IT-02 / NT-05 (AC-02, @security): rerun idempotente — 2 filas totales, no 4', async () => {
    if (!refs) return;
    const clockNow = clockAt08GuatemalaOn(calendarDay(new Date(), 0));
    const target = calendarDay(clockNow, 7);
    const fx = await insertOrganizerWithTasks(refs, 'it02', {
      tasks: [{ title: 'idempotencia', dueDate: target }],
    });
    fixtures.push(fx);

    const { logger } = makeLogger();
    const useCase = buildUseCase(new FixedClock(clockNow), logger);
    await useCase.execute({ correlationId: 'cid-it-02a' });
    await useCase.execute({ correlationId: 'cid-it-02b' });

    const rows = await prisma.notification.findMany({
      where: { userId: fx.userId, type: 'task_due_soon' },
    });
    expect(rows).toHaveLength(2);
  }, 60_000);

  it('IT-03 / NT-03 (EC-01): eventos draft, completed, cancelled → 0 filas creadas', async () => {
    if (!refs) return;
    const clockNow = clockAt08GuatemalaOn(calendarDay(new Date(), 0));
    const target = calendarDay(clockNow, 7);
    for (const status of ['draft', 'completed', 'cancelled'] as const) {
      const fx = await insertOrganizerWithTasks(refs, `it03-${status}`, {
        eventStatus: status,
        tasks: [{ title: `evento ${status}`, dueDate: target }],
      });
      fixtures.push(fx);
    }

    const { logger } = makeLogger();
    const useCase = buildUseCase(new FixedClock(clockNow), logger);
    await useCase.execute({ correlationId: 'cid-it-03' });

    const userIds = fixtures.slice(-3).map((f) => f.userId);
    const created = await prisma.notification.count({
      where: { userId: { in: userIds }, type: 'task_due_soon' },
    });
    expect(created).toBe(0);
  }, 60_000);

  it('IT-04 / NT-01 (EC-02): tareas done y skipped → 0 filas creadas', async () => {
    if (!refs) return;
    const clockNow = clockAt08GuatemalaOn(calendarDay(new Date(), 0));
    const target = calendarDay(clockNow, 7);
    const fx = await insertOrganizerWithTasks(refs, 'it04', {
      tasks: [
        { title: 'done', status: 'done', dueDate: target },
        { title: 'skipped', status: 'skipped', dueDate: target },
      ],
    });
    fixtures.push(fx);

    const { logger } = makeLogger();
    const useCase = buildUseCase(new FixedClock(clockNow), logger);
    await useCase.execute({ correlationId: 'cid-it-04' });

    const count = await prisma.notification.count({
      where: { userId: fx.userId, type: 'task_due_soon' },
    });
    expect(count).toBe(0);
  }, 60_000);

  it('IT-05 / NT-02 (AC-01, rango exacto): due_date=T-6 y T-8 → 0 filas creadas; sólo T-7 emite', async () => {
    if (!refs) return;
    const clockNow = clockAt08GuatemalaOn(calendarDay(new Date(), 0));
    const t7 = calendarDay(clockNow, 7);
    const t6 = calendarDay(clockNow, 6);
    const t8 = calendarDay(clockNow, 8);
    const fx = await insertOrganizerWithTasks(refs, 'it05', {
      tasks: [
        { title: 't-8 (fuera)', dueDate: t8 },
        { title: 't-7 (dentro)', dueDate: t7 },
        { title: 't-6 (fuera)', dueDate: t6 },
      ],
    });
    fixtures.push(fx);

    const { logger } = makeLogger();
    const useCase = buildUseCase(new FixedClock(clockNow), logger);
    const result = await useCase.execute({ correlationId: 'cid-it-05' });

    expect(result.affected).toBe(1);
    const rows = await prisma.notification.findMany({
      where: { userId: fx.userId, type: 'task_due_soon' },
    });
    expect(rows).toHaveLength(2);
    const payloads = rows.map((r) => (r.payload as { taskId: string }).taskId);
    // Ambas filas apuntan a la tarea T-7 (índice 1).
    expect(new Set(payloads)).toEqual(new Set([fx.taskIds[1]]));
  }, 60_000);

  it('IT-06 (AC-03, BR-NOTIF-005, @security): 2 organizers → cada Notification.user_id = event.owner_id de su propio evento', async () => {
    if (!refs) return;
    const clockNow = clockAt08GuatemalaOn(calendarDay(new Date(), 0));
    const target = calendarDay(clockNow, 7);
    const org1 = await insertOrganizerWithTasks(refs, 'it06-org1', {
      tasks: [{ title: 'tarea org1', dueDate: target }],
    });
    const org2 = await insertOrganizerWithTasks(refs, 'it06-org2', {
      tasks: [{ title: 'tarea org2', dueDate: target }],
    });
    fixtures.push(org1, org2);

    const { logger } = makeLogger();
    const useCase = buildUseCase(new FixedClock(clockNow), logger);
    await useCase.execute({ correlationId: 'cid-it-06' });

    const rows1 = await prisma.notification.findMany({ where: { userId: org1.userId, type: 'task_due_soon' } });
    const rows2 = await prisma.notification.findMany({ where: { userId: org2.userId, type: 'task_due_soon' } });
    expect(rows1).toHaveLength(2);
    expect(rows2).toHaveLength(2);
    // Aislamiento: los payloads de org1 sólo contienen taskIds de org1, y viceversa.
    for (const r of rows1) {
      expect((r.payload as { taskId: string }).taskId).toBe(org1.taskIds[0]);
    }
    for (const r of rows2) {
      expect((r.payload as { taskId: string }).taskId).toBe(org2.taskIds[0]);
    }
  }, 60_000);

  it('IT-07 / NT-04 (EC-03): tareas sin due_date → 0 filas creadas', async () => {
    if (!refs) return;
    const clockNow = clockAt08GuatemalaOn(calendarDay(new Date(), 0));
    const fx = await insertOrganizerWithTasks(refs, 'it07', {
      tasks: [{ title: 'sin dueDate', dueDate: null }],
    });
    fixtures.push(fx);

    const { logger } = makeLogger();
    const useCase = buildUseCase(new FixedClock(clockNow), logger);
    await useCase.execute({ correlationId: 'cid-it-07' });

    const count = await prisma.notification.count({
      where: { userId: fx.userId, type: 'task_due_soon' },
    });
    expect(count).toBe(0);
  }, 60_000);

  it('IT-08 (D4 timezone): clockNow=02:00 UTC (20:00 día anterior en Guatemala) → targetDate se ajusta al día previo', async () => {
    if (!refs) return;
    // 02:00 UTC del día actual = 20:00 del día anterior en Guatemala.
    // targetDate = (día calendario Guatemala) + 7 días = ayer_UTC + 7 días = hoy_UTC + 6 días.
    const todayUtc = calendarDay(new Date(), 0);
    const clockNow = new Date(todayUtc.getTime() + 2 * 3_600_000); // 02:00 UTC
    const yesterdayUtc = calendarDay(todayUtc, -1);
    const targetInGuatemalaCalendar = calendarDay(yesterdayUtc, 7); // = todayUtc + 6 días
    const fx = await insertOrganizerWithTasks(refs, 'it08', {
      tasks: [{ title: 'tarea t-7 según hora local GT', dueDate: targetInGuatemalaCalendar }],
    });
    fixtures.push(fx);

    const { logger } = makeLogger();
    const useCase = buildUseCase(new FixedClock(clockNow), logger);
    const result = await useCase.execute({ correlationId: 'cid-it-08' });

    expect(result.affected).toBe(1);
  }, 60_000);

  it('EC-04 (language): preferredLanguage=pt en User → Notification.languageCode=pt', async () => {
    if (!refs) return;
    const clockNow = clockAt08GuatemalaOn(calendarDay(new Date(), 0));
    const target = calendarDay(clockNow, 7);
    const fx = await insertOrganizerWithTasks(refs, 'ec-04-pt', {
      preferredLanguage: 'pt',
      tasks: [{ title: 'tarea pt', dueDate: target }],
    });
    fixtures.push(fx);

    const { logger } = makeLogger();
    const useCase = buildUseCase(new FixedClock(clockNow), logger);
    await useCase.execute({ correlationId: 'cid-ec-04-pt' });

    const rows = await prisma.notification.findMany({
      where: { userId: fx.userId, type: 'task_due_soon' },
    });
    expect(rows).toHaveLength(2);
    for (const r of rows) {
      expect((r.payload as { languageCode: string }).languageCode).toBe('pt');
    }
  }, 60_000);
});
