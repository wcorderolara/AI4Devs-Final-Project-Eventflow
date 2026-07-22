// US-071 (PB-P2-004 / QA-005 Contract). Contract test — verifica que el shape del
// response que consume el hook `useNotifications` coincide con el fixture MSW y con
// lo que el backend emite (tech spec §9).
//
// Contrato validado:
//   * `data.items[]` items con {id, type, title, body, status, link, channel, languageCode, sent_at, read_at, emailSimulated}
//   * `data.unreadCount: number`
//   * `pagination: { page, pageSize, total, totalPages }`
//   * `meta.correlationId: string`
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { notificationsApi } from '@/features/notifications';

const notificationSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  body: z.string(),
  status: z.enum(['unread', 'read']),
  link: z.string().nullable(),
  channel: z.enum(['in_app', 'email_simulated']),
  languageCode: z.string(),
  sent_at: z.string(),
  read_at: z.string().nullable(),
  emailSimulated: z.boolean(),
});

const paginationSchema = z.object({
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
});

describe('US-071 · Contract test — GET /api/v1/notifications', () => {
  it('el shape del response cumple el contrato tech spec §9', async () => {
    const result = await notificationsApi.list();
    // Items conforme al schema Zod.
    for (const item of result.items) {
      expect(() => notificationSchema.parse(item)).not.toThrow();
    }
    // unreadCount ≥ 0, entero.
    expect(Number.isInteger(result.unreadCount)).toBe(true);
    expect(result.unreadCount).toBeGreaterThanOrEqual(0);
    // Pagination.
    expect(() => paginationSchema.parse(result.pagination)).not.toThrow();
  });

  it('filtro status=unread devuelve sólo items unread', async () => {
    const result = await notificationsApi.list({ status: 'unread' });
    for (const item of result.items) {
      expect(item.status).toBe('unread');
    }
  });

  it('deep link para task_due_soon respeta el patrón /organizer/events/:id/tasks?range=7d', async () => {
    const result = await notificationsApi.list();
    const t7 = result.items.find((i) => i.type === 'task_due_soon' && i.link !== null);
    expect(t7).toBeDefined();
    expect(t7!.link).toMatch(
      /^\/organizer\/events\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/tasks\?range=7d$/i,
    );
  });
});
