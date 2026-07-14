// US-027 (PB-P1-018) — MSW handler para `GET /api/v1/events/:eventId/tasks`.
// Fixture mínimo: 2 tareas (una manual, una IA) + envelope de paginación canónico.
import { http, HttpResponse } from 'msw';

const meta = { correlationId: 'req_msw_tasks', timestamp: '2026-07-13T00:00:00.000Z' };

// US-032 (PB-P1-019): DTO extendido con `overdue` e `is_t_minus_7` (booleanos NO opcionales).
const fixture = [
  {
    id: '00000000-0000-4000-8000-000000000101',
    title: 'Reservar salón',
    due_date: '2026-09-01T00:00:00.000Z',
    status: 'pending',
    category_code: 'catering',
    ai_generated: false,
    ai_recommendation_id: null,
    confirmed_at: null,
    created_at: '2026-06-01T10:00:00.000Z',
    updated_at: '2026-06-01T10:00:00.000Z',
    overdue: false,
    is_t_minus_7: false,
  },
  {
    id: '00000000-0000-4000-8000-000000000102',
    title: 'Enviar invitaciones',
    due_date: '2026-08-15T00:00:00.000Z',
    status: 'in_progress',
    category_code: null,
    ai_generated: true,
    ai_recommendation_id: '00000000-0000-4000-8000-0000000000ff',
    confirmed_at: '2026-06-10T09:00:00.000Z',
    created_at: '2026-06-02T10:00:00.000Z',
    updated_at: '2026-06-10T09:00:00.000Z',
    overdue: false,
    is_t_minus_7: false,
  },
];

export const tasksHandlers = [
  http.get('*/api/v1/events/:eventId/tasks', ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? 1);
    const pageSize = Number(url.searchParams.get('pageSize') ?? 20);
    // US-033 (PB-P1-019 / BE-004): agregado `progress` siempre presente en respuestas 200.
    // Fixture con `total_countable = 2` (una en `pending`, una en `in_progress`, ninguna
    // `done`, ninguna `skipped` → percentage = 0). Sirve como default en tests de listado.
    return HttpResponse.json({
      data: fixture,
      pagination: {
        page,
        pageSize,
        total: fixture.length,
        totalPages: Math.ceil(fixture.length / pageSize),
      },
      progress: {
        percentage: 0,
        done: 0,
        total_countable: fixture.length,
        skipped: 0,
      },
      meta,
    });
  }),
];
