// US-071 (PB-P2-004 / QA-005 contract). MSW handlers para el surface organizer.
// Fixture determinista con 1 T-7 unread + 1 read + 1 unread sin link (EC-03).
import { http, HttpResponse } from 'msw';

const meta = { correlationId: 'req_msw_notifications', timestamp: '2026-07-22T14:00:00.000Z' };

const EVENT_ID_T7 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

export const notificationsFixture = {
  t7Unread: {
    id: 'n1',
    type: 'task_due_soon',
    title: 'Recordatorio: tienes una tarea que vence en 7 días',
    body: 'La tarea t-1 vence el 2026-07-29. Revisa tu checklist.',
    status: 'unread' as const,
    link: `/organizer/events/${EVENT_ID_T7}/tasks?range=7d`,
    channel: 'in_app' as const,
    languageCode: 'es-LATAM',
    sent_at: '2026-07-22T14:00:00.000Z',
    read_at: null,
    emailSimulated: false,
  },
  otherRead: {
    id: 'n2',
    type: 'quote_received',
    title: 'Cotización recibida',
    body: 'Un proveedor te envió una cotización.',
    status: 'read' as const,
    link: null,
    channel: 'in_app' as const,
    languageCode: 'es-LATAM',
    sent_at: '2026-07-22T13:00:00.000Z',
    read_at: '2026-07-22T13:05:00.000Z',
    emailSimulated: false,
  },
  t7Unlinked: {
    id: 'n3',
    type: 'task_due_soon',
    title: 'Recordatorio: tienes una tarea que vence en 7 días',
    body: 'La tarea t-2 vence el 2026-07-29.',
    status: 'unread' as const,
    link: null,
    channel: 'in_app' as const,
    languageCode: 'es-LATAM',
    sent_at: '2026-07-22T12:00:00.000Z',
    read_at: null,
    emailSimulated: false,
  },
};

const defaultItems = [
  notificationsFixture.t7Unread,
  notificationsFixture.t7Unlinked,
  notificationsFixture.otherRead,
];

export const notificationsHandlers = [
  http.get('*/api/v1/notifications', ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get('status') ?? 'all';
    const items =
      status === 'unread' ? defaultItems.filter((n) => n.status === 'unread') : defaultItems;
    return HttpResponse.json(
      {
        data: {
          items,
          unreadCount: defaultItems.filter((n) => n.status === 'unread').length,
        },
        meta,
        pagination: { page: 1, pageSize: 10, total: items.length, totalPages: 1 },
      },
      { status: 200 },
    );
  }),
];
