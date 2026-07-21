// US-079 (PB-P1-045) / BE-002 — DTO del response `GET /api/v1/admin/metrics`.
// Contrato: 7 secciones (users, vendors, events, quotes, bookings, reviews, ai) + `generated_at`.
// SEC-02 / AC-05 / QA-005: prohibición explícita de campos comerciales (revenue, gmv, arpu,
// conversion_rate_*, monetary). La shape que se declara aquí es la ÚNICA fuente de verdad — si un
// campo no aparece en este tipo, no puede aparecer en el response. La suite QA-005 assertea
// activamente que ninguno de esos campos exista en el JSON serializado.

export interface AdminUsersMetric {
  total: number;
  by_role: Record<string, number>;
}

export interface AdminVendorsMetric {
  total: number;
  by_status: Record<string, number>;
  hidden_count: number;
}

export interface AdminEventsMetric {
  total: number;
  by_status: Record<string, number>;
}

export interface AdminQuotesMetric {
  quote_requests_created: number;
  quotes_responded: number;
  quotes_accepted: number;
  quotes_rejected: number;
  quotes_expired: number;
}

export interface AdminBookingsMetric {
  booking_intents_created: number;
  booking_intents_confirmed: number;
  booking_intents_cancelled: number;
}

export interface AdminReviewsMetric {
  total: number;
  by_status: Record<string, number>;
}

export interface AdminAIByTypeEntry {
  total_count: number;
  success_count: number;
}

export interface AdminAIMetric {
  total_recommendations: number;
  by_type: Record<string, AdminAIByTypeEntry>;
}

export interface AdminMetricsResponse {
  users: AdminUsersMetric;
  vendors: AdminVendorsMetric;
  events: AdminEventsMetric;
  quotes: AdminQuotesMetric;
  bookings: AdminBookingsMetric;
  reviews: AdminReviewsMetric;
  ai: AdminAIMetric;
  generated_at: string;
}
