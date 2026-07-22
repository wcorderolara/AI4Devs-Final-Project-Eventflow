// US-071 (PB-P2-004 / QA-001) — Unit tests del surface organizer de notificaciones.
//
// Cubre (sin BD, con fakes en memoria):
//   * UT-01 sin notifs → items=[], total=0, unreadCount=0
//   * UT-02 3 unread + 2 read → orden (unread first, sent_at DESC, id ASC)
//   * UT-03 status=unread filtra
//   * UT-04 channel=in_app filtra (herencia US-034: `payload.channel`)
//   * UT-05 NotificationLinkResolver genera `/organizer/events/{eventId}/tasks?range=7d`
//   * UT-06 NotificationLinkResolver retorna `null` si eventId inexistente
//   * UT-07 unreadCount con channel=in_app
//   * Zod schema tests: defaults + rechazo de valores inválidos
import { describe, expect, it } from 'vitest';
import { listNotificationsQuerySchema } from '../../src/modules/notifications/interface/http/list-notifications.query.schema.js';
import { ListMyNotificationsUseCase } from '../../src/modules/notifications/application/list-my-notifications.use-case.js';
import { BatchNotificationLinkResolver } from '../../src/modules/notifications/application/notification-link-resolver.service.js';
import type {
  ListNotificationsRepository,
  NotificationRow,
  FindByUserInput,
  CountUnreadByUserInput,
} from '../../src/modules/notifications/ports/list-notifications.repository.js';
import type { NotificationLinkEventReader } from '../../src/modules/notifications/ports/notification-link-event-reader.js';
import type { NotificationLinkQuoteRequestReader } from '../../src/modules/notifications/ports/notification-link-quote-request-reader.js';

class FakeRepo implements ListNotificationsRepository {
  rows: NotificationRow[] = [];
  lastFindInput?: FindByUserInput;
  lastCountInput?: CountUnreadByUserInput;

  findByUser(input: FindByUserInput): Promise<{ items: NotificationRow[]; total: number }> {
    this.lastFindInput = input;
    // Reproduce el orden SQL: (status='unread') DESC, createdAt DESC, id ASC.
    const filtered = this.rows.filter((r) => {
      if (r.userId !== input.userId) return false;
      if (input.channel !== 'all') {
        const ch = (r.payload as { channel?: string }).channel ?? 'in_app';
        if (ch !== input.channel) return false;
      }
      if (input.status !== 'all' && r.status !== input.status) return false;
      return true;
    });
    filtered.sort((a, b) => {
      const aUnread = a.status === 'unread' ? 1 : 0;
      const bUnread = b.status === 'unread' ? 1 : 0;
      if (aUnread !== bUnread) return bUnread - aUnread;
      const t = b.createdAt.getTime() - a.createdAt.getTime();
      if (t !== 0) return t;
      return a.id.localeCompare(b.id);
    });
    const start = (input.page - 1) * input.pageSize;
    return Promise.resolve({
      items: filtered.slice(start, start + input.pageSize),
      total: filtered.length,
    });
  }

  countUnreadByUser(input: CountUnreadByUserInput): Promise<number> {
    this.lastCountInput = input;
    const count = this.rows.filter((r) => {
      if (r.userId !== input.userId) return false;
      if (r.status !== 'unread') return false;
      if (input.channel !== 'all') {
        const ch = (r.payload as { channel?: string }).channel ?? 'in_app';
        if (ch !== input.channel) return false;
      }
      return true;
    }).length;
    return Promise.resolve(count);
  }
}

class FakeEventReader implements NotificationLinkEventReader {
  existing = new Set<string>();
  filterExistingEventIds(ids: string[]): Promise<Set<string>> {
    return Promise.resolve(new Set(ids.filter((id) => this.existing.has(id))));
  }
}

class FakeQuoteRequestReader implements NotificationLinkQuoteRequestReader {
  existing = new Set<string>();
  filterExistingQuoteRequestIds(ids: string[]): Promise<Set<string>> {
    return Promise.resolve(new Set(ids.filter((id) => this.existing.has(id))));
  }
}

const UUID_EVENT_1 = '11111111-1111-1111-1111-111111111111';
const UUID_EVENT_2 = '22222222-2222-2222-2222-222222222222';

function row(overrides: Partial<NotificationRow>): NotificationRow {
  return {
    id: overrides.id ?? 'n1',
    userId: overrides.userId ?? 'u1',
    type: overrides.type ?? 'task_due_soon',
    payload:
      overrides.payload ??
      ({ channel: 'in_app', languageCode: 'es-LATAM', eventId: UUID_EVENT_1, taskId: 't1' } as Record<
        string,
        unknown
      >),
    status: overrides.status ?? 'unread',
    readAt: overrides.readAt ?? null,
    createdAt: overrides.createdAt ?? new Date('2026-07-22T14:00:00Z'),
  };
}

function build() {
  const repo = new FakeRepo();
  const eventReader = new FakeEventReader();
  const quoteRequestReader = new FakeQuoteRequestReader();
  const linkResolver = new BatchNotificationLinkResolver({
    eventReader,
    quoteRequestReader,
  });
  const useCase = new ListMyNotificationsUseCase({ repo, linkResolver });
  return { repo, eventReader, quoteRequestReader, useCase };
}

describe('US-071 — Zod schema (BE-001)', () => {
  it('aplica defaults page=1, pageSize=10, status=all, channel=in_app', () => {
    const parsed = listNotificationsQuerySchema.parse({});
    expect(parsed).toEqual({ page: 1, pageSize: 10, status: 'all', channel: 'in_app' });
  });

  it('coerce numérico y respeta límites (page ≥ 1, pageSize 1..50)', () => {
    expect(listNotificationsQuerySchema.parse({ page: '3', pageSize: '25' })).toMatchObject({
      page: 3,
      pageSize: 25,
    });
    expect(() => listNotificationsQuerySchema.parse({ pageSize: 51 })).toThrow();
    expect(() => listNotificationsQuerySchema.parse({ page: 0 })).toThrow();
  });

  it('rechaza status/channel fuera del enum', () => {
    expect(() => listNotificationsQuerySchema.parse({ status: 'archived' })).toThrow();
    expect(() => listNotificationsQuerySchema.parse({ channel: 'sms' })).toThrow();
  });

  it('rechaza query params no declarados (.strict())', () => {
    expect(() => listNotificationsQuerySchema.parse({ foo: 'bar' })).toThrow();
  });
});

describe('US-071 — ListMyNotificationsUseCase (BE-004)', () => {
  it('UT-01: sin notifs → items=[], total=0, unreadCount=0', async () => {
    const { useCase } = build();
    const result = await useCase.execute({
      userId: 'u1',
      page: 1,
      pageSize: 10,
      status: 'all',
      channel: 'in_app',
    });
    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.unreadCount).toBe(0);
  });

  it('UT-02: 3 unread + 2 read → orden unread first, sent_at DESC, id ASC', async () => {
    const { repo, useCase } = build();
    repo.rows = [
      row({ id: 'r1', status: 'read', createdAt: new Date('2026-07-22T15:00:00Z') }),
      row({ id: 'u3', status: 'unread', createdAt: new Date('2026-07-22T13:00:00Z') }),
      row({ id: 'u1', status: 'unread', createdAt: new Date('2026-07-22T14:00:00Z') }),
      row({ id: 'u2', status: 'unread', createdAt: new Date('2026-07-22T14:00:00Z') }),
      row({ id: 'r2', status: 'read', createdAt: new Date('2026-07-22T12:00:00Z') }),
    ];
    const result = await useCase.execute({
      userId: 'u1',
      page: 1,
      pageSize: 10,
      status: 'all',
      channel: 'in_app',
    });
    expect(result.items.map((i) => i.id)).toEqual(['u1', 'u2', 'u3', 'r1', 'r2']);
    expect(result.total).toBe(5);
    expect(result.unreadCount).toBe(3);
  });

  it('UT-03: status=unread filtra correctamente', async () => {
    const { repo, useCase } = build();
    repo.rows = [
      row({ id: 'u1', status: 'unread' }),
      row({ id: 'r1', status: 'read', readAt: new Date('2026-07-22T16:00:00Z') }),
    ];
    const result = await useCase.execute({
      userId: 'u1',
      page: 1,
      pageSize: 10,
      status: 'unread',
      channel: 'in_app',
    });
    expect(result.items.map((i) => i.id)).toEqual(['u1']);
    expect(result.total).toBe(1);
  });

  it('UT-04: channel=in_app dedup — email_simulated excluido', async () => {
    const { repo, useCase } = build();
    repo.rows = [
      row({ id: 'in-app', payload: { channel: 'in_app', eventId: UUID_EVENT_1 } }),
      row({ id: 'email', payload: { channel: 'email_simulated', eventId: UUID_EVENT_1 } }),
    ];
    const result = await useCase.execute({
      userId: 'u1',
      page: 1,
      pageSize: 10,
      status: 'all',
      channel: 'in_app',
    });
    expect(result.items.map((i) => i.id)).toEqual(['in-app']);
  });

  it('UT-05: NotificationLinkResolver genera link para task_due_soon con eventId válido', async () => {
    const { repo, eventReader, useCase } = build();
    repo.rows = [row({ id: 'n1', payload: { channel: 'in_app', eventId: UUID_EVENT_1 } })];
    eventReader.existing.add(UUID_EVENT_1);

    const result = await useCase.execute({
      userId: 'u1',
      page: 1,
      pageSize: 10,
      status: 'all',
      channel: 'in_app',
    });
    expect(result.items[0]?.link).toBe(`/organizer/events/${UUID_EVENT_1}/tasks?range=7d`);
  });

  it('UT-06: NotificationLinkResolver retorna null si eventId inexistente', async () => {
    const { repo, useCase } = build();
    repo.rows = [row({ id: 'n1', payload: { channel: 'in_app', eventId: UUID_EVENT_2 } })];
    // eventReader.existing vacío → filterExistingEventIds retorna set vacío → null.

    const result = await useCase.execute({
      userId: 'u1',
      page: 1,
      pageSize: 10,
      status: 'all',
      channel: 'in_app',
    });
    expect(result.items[0]?.link).toBe(null);
  });

  it('UT-06b: NotificationLinkResolver retorna null si payload.eventId no es UUID', async () => {
    const { repo, useCase } = build();
    repo.rows = [row({ id: 'n1', payload: { channel: 'in_app', eventId: 'not-a-uuid' } })];
    const result = await useCase.execute({
      userId: 'u1',
      page: 1,
      pageSize: 10,
      status: 'all',
      channel: 'in_app',
    });
    expect(result.items[0]?.link).toBe(null);
  });

  it('UT-06c: NotificationLinkResolver retorna null para tipos no cubiertos por US-071', async () => {
    const { repo, eventReader, useCase } = build();
    repo.rows = [row({ id: 'n1', type: 'quote_received', payload: { channel: 'in_app', eventId: UUID_EVENT_1 } })];
    eventReader.existing.add(UUID_EVENT_1);
    const result = await useCase.execute({
      userId: 'u1',
      page: 1,
      pageSize: 10,
      status: 'all',
      channel: 'in_app',
    });
    expect(result.items[0]?.link).toBe(null);
  });

  it('UT-07: unreadCount respeta filtro channel=in_app', async () => {
    const { repo, useCase } = build();
    repo.rows = [
      row({ id: 'u-in-app', status: 'unread', payload: { channel: 'in_app' } }),
      row({ id: 'u-email', status: 'unread', payload: { channel: 'email_simulated' } }),
      row({ id: 'r-in-app', status: 'read', payload: { channel: 'in_app' } }),
    ];
    const result = await useCase.execute({
      userId: 'u1',
      page: 1,
      pageSize: 10,
      status: 'all',
      channel: 'in_app',
    });
    expect(result.unreadCount).toBe(1);
    // total incluye read + unread para el canal in_app.
    expect(result.total).toBe(2);
  });

  it('BR-NOTIF-005: use case pasa userId al repo → sólo notifs del session user', async () => {
    const { repo, useCase } = build();
    repo.rows = [
      row({ id: 'own', userId: 'u1' }),
      row({ id: 'other', userId: 'u2' }),
    ];
    const result = await useCase.execute({
      userId: 'u1',
      page: 1,
      pageSize: 10,
      status: 'all',
      channel: 'in_app',
    });
    expect(result.items.map((i) => i.id)).toEqual(['own']);
    expect(repo.lastFindInput?.userId).toBe('u1');
  });

  it('DTO shape: expone canal, languageCode, sent_at, link, emailSimulated', async () => {
    const { repo, eventReader, useCase } = build();
    eventReader.existing.add(UUID_EVENT_1);
    repo.rows = [
      row({
        id: 'n1',
        payload: {
          channel: 'in_app',
          languageCode: 'pt',
          eventId: UUID_EVENT_1,
          title: 'Título T-7',
          body: 'Cuerpo T-7',
        },
      }),
    ];
    const result = await useCase.execute({
      userId: 'u1',
      page: 1,
      pageSize: 10,
      status: 'all',
      channel: 'in_app',
    });
    const item = result.items[0]!;
    expect(item).toMatchObject({
      id: 'n1',
      type: 'task_due_soon',
      title: 'Título T-7',
      body: 'Cuerpo T-7',
      status: 'unread',
      link: `/organizer/events/${UUID_EVENT_1}/tasks?range=7d`,
      channel: 'in_app',
      languageCode: 'pt',
      emailSimulated: false,
    });
    expect(item.sent_at).toBe('2026-07-22T14:00:00.000Z');
  });
});
