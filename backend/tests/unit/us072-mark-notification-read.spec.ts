// US-072 (PB-P2-008 / QA-001 + SEC-001) — Unit tests de las mutations mark-as-read.
//
// Cubre con fakes en memoria:
//   * UT-01 mark single happy path → repo.markAsRead invocado con {id, actorUserId}.
//   * UT-02 mark single sobre notif inexistente → NotFoundError (AC-05).
//   * UT-03 mark single sobre notif ajena → NotFoundError (AC-04 no-revelación).
//   * UT-04 mark single sobre notif ya leída → idempotente `affected=0` (AC-06).
//   * UT-05 mark-all default channel `in_app` → repo.markAllAsReadForUser(in_app).
//   * UT-06 mark-all con `channel=all` → repo invocado con `all`.
//   * UT-07 mark-all con 0 filas afectadas → 204 sin error (EC-02).
//   * Zod schemas (BE-001) — path uuid + query channel.
//   * SEC-T-01 aislamiento — el use case NUNCA revela userId/existencia por response.
import { describe, expect, it } from 'vitest';
import { MarkNotificationAsReadUseCase } from '../../src/modules/notifications/application/mark-notification-as-read.use-case.js';
import { MarkAllNotificationsAsReadUseCase } from '../../src/modules/notifications/application/mark-all-notifications-as-read.use-case.js';
import type {
  MarkNotificationsRepository,
  OwnedNotificationSnapshot,
} from '../../src/modules/notifications/ports/mark-notifications.repository.js';
import type { ListNotificationsChannel } from '../../src/modules/notifications/interface/http/list-notifications.query.schema.js';
import { NotFoundError } from '../../src/shared/domain/errors/not-found.error.js';
import {
  markAllReadQuerySchema,
  notificationIdParamSchema,
} from '../../src/modules/notifications/interface/http/mark-notifications.schemas.js';

const UUID_NOTIF = '11111111-1111-4111-8111-111111111111';
const UUID_OWNER = '22222222-2222-4222-8222-222222222222';
const UUID_OTHER = '33333333-3333-4333-8333-333333333333';

class FakeMarkRepo implements MarkNotificationsRepository {
  ownership = new Map<string, OwnedNotificationSnapshot>();
  markCalls: Array<{ notificationId: string; userId: string }> = [];
  markAllCalls: Array<{ userId: string; channel: ListNotificationsChannel }> = [];
  markAsReadAffected = 1;
  markAllAffected = 0;

  seedOwnership(snapshot: OwnedNotificationSnapshot): void {
    this.ownership.set(snapshot.id, snapshot);
  }

  findOwnedById(id: string): Promise<OwnedNotificationSnapshot | null> {
    return Promise.resolve(this.ownership.get(id) ?? null);
  }

  markAsRead(id: string, userId: string): Promise<{ affected: number }> {
    this.markCalls.push({ notificationId: id, userId });
    return Promise.resolve({ affected: this.markAsReadAffected });
  }

  markAllAsReadForUser(
    userId: string,
    channel: ListNotificationsChannel,
  ): Promise<{ affected: number }> {
    this.markAllCalls.push({ userId, channel });
    return Promise.resolve({ affected: this.markAllAffected });
  }
}

describe('US-072 · MarkNotificationAsReadUseCase (single)', () => {
  it('UT-01 · happy path: notif propia unread → markAsRead invocado con {id, actorUserId}', async () => {
    const repo = new FakeMarkRepo();
    repo.seedOwnership({ id: UUID_NOTIF, userId: UUID_OWNER, alreadyRead: false });
    const uc = new MarkNotificationAsReadUseCase(repo);
    const result = await uc.execute({ notificationId: UUID_NOTIF, actorUserId: UUID_OWNER });
    expect(result.affected).toBe(1);
    expect(repo.markCalls).toEqual([{ notificationId: UUID_NOTIF, userId: UUID_OWNER }]);
  });

  it('UT-02 · notif inexistente → NotFoundError (AC-05)', async () => {
    const repo = new FakeMarkRepo();
    const uc = new MarkNotificationAsReadUseCase(repo);
    await expect(
      uc.execute({ notificationId: UUID_NOTIF, actorUserId: UUID_OWNER }),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(repo.markCalls).toEqual([]);
  });

  it('UT-03 · notif ajena → NotFoundError (AC-04 no-revelación; nunca 403)', async () => {
    const repo = new FakeMarkRepo();
    repo.seedOwnership({ id: UUID_NOTIF, userId: UUID_OTHER, alreadyRead: false });
    const uc = new MarkNotificationAsReadUseCase(repo);
    // Rechaza con el MISMO error que "no existe" — política de no-revelación docs/19.
    await expect(
      uc.execute({ notificationId: UUID_NOTIF, actorUserId: UUID_OWNER }),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(repo.markCalls).toEqual([]);
  });

  it('UT-04 · notif ya leída → idempotente `affected=0` sin invocar markAsRead (AC-06)', async () => {
    const repo = new FakeMarkRepo();
    repo.seedOwnership({ id: UUID_NOTIF, userId: UUID_OWNER, alreadyRead: true });
    const uc = new MarkNotificationAsReadUseCase(repo);
    const result = await uc.execute({ notificationId: UUID_NOTIF, actorUserId: UUID_OWNER });
    expect(result.affected).toBe(0);
    // El use case corta antes del UPDATE — no invoca `markAsRead` para evitar toque innecesario.
    expect(repo.markCalls).toEqual([]);
  });
});

describe('US-072 · MarkAllNotificationsAsReadUseCase (bulk)', () => {
  it('UT-05 · default channel=in_app → repo invocado con in_app (D4)', async () => {
    const repo = new FakeMarkRepo();
    repo.markAllAffected = 3;
    const uc = new MarkAllNotificationsAsReadUseCase({ repo });
    const result = await uc.execute({ actorUserId: UUID_OWNER, channel: 'in_app' });
    expect(result.affected).toBe(3);
    expect(repo.markAllCalls).toEqual([{ userId: UUID_OWNER, channel: 'in_app' }]);
  });

  it('UT-06 · channel=all → repo invocado con all', async () => {
    const repo = new FakeMarkRepo();
    repo.markAllAffected = 5;
    const uc = new MarkAllNotificationsAsReadUseCase({ repo });
    await uc.execute({ actorUserId: UUID_OWNER, channel: 'all' });
    expect(repo.markAllCalls).toEqual([{ userId: UUID_OWNER, channel: 'all' }]);
  });

  it('UT-07 · 0 filas afectadas → 204 sin error (EC-02)', async () => {
    const repo = new FakeMarkRepo();
    repo.markAllAffected = 0;
    const uc = new MarkAllNotificationsAsReadUseCase({ repo });
    const result = await uc.execute({ actorUserId: UUID_OWNER, channel: 'in_app' });
    expect(result.affected).toBe(0);
  });

  it('logger opcional: emite `notif.markAllAsRead` con userId+channel+affected+correlationId sin PII', async () => {
    const repo = new FakeMarkRepo();
    repo.markAllAffected = 2;
    const logged: Array<Record<string, unknown>> = [];
    const uc = new MarkAllNotificationsAsReadUseCase({
      repo,
      logger: { info: (p) => logged.push(p) },
    });
    await uc.execute({
      actorUserId: UUID_OWNER,
      channel: 'in_app',
      correlationId: 'cid-42',
    });
    expect(logged).toHaveLength(1);
    expect(logged[0]).toMatchObject({
      event: 'notif.markAllAsRead',
      userId: UUID_OWNER,
      channel: 'in_app',
      affected: 2,
      correlationId: 'cid-42',
    });
    // SEC-02: sin campos PII en el log — el set exacto es {event, correlationId,
    // userId, channel, affected}.
    expect(Object.keys(logged[0]!).sort()).toEqual(
      ['event', 'correlationId', 'userId', 'channel', 'affected'].sort(),
    );
  });
});

describe('US-072 · Zod schemas (BE-001)', () => {
  it('notificationIdParamSchema acepta UUID válido', () => {
    const parsed = notificationIdParamSchema.safeParse({ notificationId: UUID_NOTIF });
    expect(parsed.success).toBe(true);
  });

  it('notificationIdParamSchema rechaza non-UUID (VR-02)', () => {
    const parsed = notificationIdParamSchema.safeParse({ notificationId: 'not-a-uuid' });
    expect(parsed.success).toBe(false);
  });

  it('notificationIdParamSchema rechaza claves extra (.strict)', () => {
    const parsed = notificationIdParamSchema.safeParse({
      notificationId: UUID_NOTIF,
      extra: 'x',
    });
    expect(parsed.success).toBe(false);
  });

  it('markAllReadQuerySchema aplica default channel=in_app (D4)', () => {
    const parsed = markAllReadQuerySchema.parse({});
    expect(parsed.channel).toBe('in_app');
  });

  it('markAllReadQuerySchema acepta channel=email_simulated', () => {
    const parsed = markAllReadQuerySchema.parse({ channel: 'email_simulated' });
    expect(parsed.channel).toBe('email_simulated');
  });

  it('markAllReadQuerySchema acepta channel=all', () => {
    const parsed = markAllReadQuerySchema.parse({ channel: 'all' });
    expect(parsed.channel).toBe('all');
  });

  it('markAllReadQuerySchema rechaza channel inválido (VR-03)', () => {
    const parsed = markAllReadQuerySchema.safeParse({ channel: 'slack' });
    expect(parsed.success).toBe(false);
  });
});

describe('US-072 · SEC-T-01 — aislamiento (BR-NOTIF-005)', () => {
  it('el use case single NUNCA propaga snapshot.userId al caller (no-revelación)', async () => {
    const repo = new FakeMarkRepo();
    repo.seedOwnership({ id: UUID_NOTIF, userId: UUID_OTHER, alreadyRead: false });
    const uc = new MarkNotificationAsReadUseCase(repo);
    const err = await uc
      .execute({ notificationId: UUID_NOTIF, actorUserId: UUID_OWNER })
      .catch((e: unknown) => e);
    // El error tipado NO expone el userId del owner real — el mensaje es genérico.
    expect(err).toBeInstanceOf(NotFoundError);
    expect((err as Error).message).not.toContain(UUID_OTHER);
  });

  it('el use case bulk NUNCA acepta userId distinto al actor — el port fuerza WHERE user_id=$1', async () => {
    // Contrato tipado: el `execute` acepta sólo `actorUserId` (no `userId` arbitrario).
    // El repo recibe el actorUserId inalterado.
    const repo = new FakeMarkRepo();
    const uc = new MarkAllNotificationsAsReadUseCase({ repo });
    await uc.execute({ actorUserId: UUID_OWNER, channel: 'in_app' });
    expect(repo.markAllCalls[0]?.userId).toBe(UUID_OWNER);
  });
});
