// US-079 (PB-P1-045) / FE-003 — Tipos del dashboard admin de métricas operativas.
// Mirror exacto del DTO backend `AdminMetricsResponse` (Tech Spec §7 + Response §Response 200).
// SEC-02 / AC-05: NUNCA agregar campos comerciales (revenue/gmv/arpu/conversion_rate_*/monetary).

export interface AdminMetricsUsers {
  total: number;
  by_role: Record<string, number>;
}

export interface AdminMetricsVendors {
  total: number;
  by_status: Record<string, number>;
  hidden_count: number;
}

export interface AdminMetricsEvents {
  total: number;
  by_status: Record<string, number>;
}

export interface AdminMetricsQuotes {
  quote_requests_created: number;
  quotes_responded: number;
  quotes_accepted: number;
  quotes_rejected: number;
  quotes_expired: number;
}

export interface AdminMetricsBookings {
  booking_intents_created: number;
  booking_intents_confirmed: number;
  booking_intents_cancelled: number;
}

export interface AdminMetricsReviews {
  total: number;
  by_status: Record<string, number>;
}

export interface AdminMetricsAIByTypeEntry {
  total_count: number;
  success_count: number;
}

export interface AdminMetricsAI {
  total_recommendations: number;
  by_type: Record<string, AdminMetricsAIByTypeEntry>;
}

export interface AdminMetricsDTO {
  users: AdminMetricsUsers;
  vendors: AdminMetricsVendors;
  events: AdminMetricsEvents;
  quotes: AdminMetricsQuotes;
  bookings: AdminMetricsBookings;
  reviews: AdminMetricsReviews;
  ai: AdminMetricsAI;
  generated_at: string;
}

export interface AdminMetricsEnvelope {
  data: AdminMetricsDTO;
  correlationId: string;
}
