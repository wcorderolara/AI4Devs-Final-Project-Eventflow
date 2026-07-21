// US-079 (PB-P1-045) / FE-003 — MSW handlers para el dashboard admin de métricas.
// Cobertura:
//   - GET /api/v1/admin/metrics → 200 con AdminMetricsDTO estable (fixtures deterministas)
//
// SEC-02 / AC-05: el fixture NO expone campos comerciales (revenue/gmv/arpu/conversion_rate_*/
// monetary). El test `admin-metrics-no-commercials.test.ts` asserta explícitamente la ausencia
// sobre este mismo fixture (garantiza que el mock y el contrato server permanezcan sincronizados).
import { http, HttpResponse } from 'msw';

const CORRELATION = '00000000-0000-0000-0000-msw000000079';
const GENERATED_AT = '2026-07-20T00:00:00.000Z';

export const adminMetricsFixture = {
  users: {
    total: 1500,
    by_role: { organizer: 800, vendor: 695, admin: 5 },
  },
  vendors: {
    total: 600,
    by_status: { pending: 50, approved: 530, rejected: 20 },
    hidden_count: 10,
  },
  events: {
    total: 1200,
    by_status: { draft: 100, active: 750, completed: 320, cancelled: 30 },
  },
  quotes: {
    quote_requests_created: 5000,
    quotes_responded: 4200,
    quotes_accepted: 800,
    quotes_rejected: 200,
    quotes_expired: 300,
  },
  bookings: {
    booking_intents_created: 750,
    booking_intents_confirmed: 600,
    booking_intents_cancelled: 50,
  },
  reviews: {
    total: 500,
    by_status: { published: 480, hidden: 15, removed: 5 },
  },
  ai: {
    total_recommendations: 3000,
    by_type: {
      event_plan: { total_count: 800, success_count: 750 },
      checklist: { total_count: 700, success_count: 680 },
      budget_distribution: { total_count: 600, success_count: 590 },
      recommended_categories: { total_count: 500, success_count: 490 },
      quote_brief_autocompletion: { total_count: 400, success_count: 380 },
    },
  },
  generated_at: GENERATED_AT,
} as const;

export const adminMetricsHandlers = [
  http.get('*/api/v1/admin/metrics', () => {
    return HttpResponse.json(
      { data: adminMetricsFixture, correlationId: CORRELATION },
      {
        status: 200,
        headers: { 'Cache-Control': 'private, max-age=60' },
      },
    );
  }),
];
