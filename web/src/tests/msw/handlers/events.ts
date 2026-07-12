import { http, HttpResponse } from 'msw';

/** Fixtures y handlers MSW de la feature events (US-009..US-014). */
export const eventFixture = {
  id: 'e1111111-1111-4111-8111-111111111111',
  ownerId: '3f2c1a4e-9b7d-4e2a-8c5f-1d0e6a7b8c9d',
  eventTypeCode: 'wedding',
  name: 'Boda de Ana',
  eventDate: '2026-12-01',
  guestsCount: 120,
  locationId: 'a0000000-0000-4000-8000-000000000001',
  estimatedBudget: '50000.00',
  currencyCode: 'GTQ',
  languageCode: 'es-LATAM',
  status: 'draft',
  notes: null,
  autoCompleted: false,
  completedAt: null,
  createdAt: '2026-07-10T00:00:00.000Z',
  updatedAt: '2026-07-10T00:00:00.000Z',
} as const;

const meta = { correlationId: 'req_msw_events', timestamp: '2026-07-10T00:00:00.000Z' };

export const eventTypesFixture = [
  { code: 'wedding', label: 'Boda' },
  { code: 'xv', label: 'XV años' },
  { code: 'baptism', label: 'Bautizo' },
  { code: 'baby_shower', label: 'Baby shower' },
  { code: 'birthday', label: 'Cumpleaños' },
  { code: 'corporate', label: 'Corporativo' },
] as const;

export const locationsFixture = [
  { id: 'a0000000-0000-4000-8000-000000000001', country: 'GT', region: 'Guatemala', city: 'Ciudad de Guatemala' },
  { id: 'a0000000-0000-4000-8000-000000000002', country: 'MX', region: 'CDMX', city: 'Ciudad de México' },
] as const;

export const eventsHandlers = [
  http.get('*/api/v1/event-types', () => HttpResponse.json({ data: eventTypesFixture, meta }, { status: 200 })),
  http.get('*/api/v1/locations', () => HttpResponse.json({ data: locationsFixture, meta }, { status: 200 })),

  http.get('*/api/v1/events', () =>
    HttpResponse.json(
      { data: [eventFixture], pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 }, meta },
      { status: 200 },
    ),
  ),
  http.get('*/api/v1/events/:id', ({ params }) =>
    HttpResponse.json({ data: { ...eventFixture, id: String(params.id) }, meta }, { status: 200 }),
  ),
  http.post('*/api/v1/events', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    return HttpResponse.json({ data: { ...eventFixture, ...body }, meta }, { status: 201 });
  }),
  http.patch('*/api/v1/events/:id', async ({ params, request }) => {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    return HttpResponse.json({ data: { ...eventFixture, id: String(params.id), ...body }, meta }, { status: 200 });
  }),
  http.post('*/api/v1/events/:id/cancel', ({ params }) =>
    HttpResponse.json({ data: { ...eventFixture, id: String(params.id), status: 'cancelled' }, meta }, { status: 200 }),
  ),
  http.delete('*/api/v1/events/:id', () => new HttpResponse(null, { status: 204 })),
];
