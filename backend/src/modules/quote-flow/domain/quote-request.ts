// Tipos de dominio de QuoteRequest (US-096 / BE-002). Vista pública en shape del contrato API.
export const QUOTE_REQUEST_STATUSES = ['sent', 'viewed', 'responded', 'expired', 'cancelled'] as const;
export type QuoteRequestStatusValue = (typeof QUOTE_REQUEST_STATUSES)[number];

/** Estados "activos" (ocupan cupo/duplicado) — alineado a los índices únicos parciales de US-102. */
export const ACTIVE_QUOTE_REQUEST_STATUSES: readonly QuoteRequestStatusValue[] = [
  'sent',
  'viewed',
  'responded',
];

export interface QuoteRequestBrief {
  summary: string;
  requirements: string[];
  questions: string[];
  constraints?: string[];
}

export interface QuoteRequestView {
  id: string;
  eventId: string;
  serviceCategoryId: string;
  vendorProfileId: string | null;
  status: QuoteRequestStatusValue;
  brief: QuoteRequestBrief | null;
  aiRecommendationId: string | null;
  viewedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateQuoteRequestData {
  eventId: string;
  serviceCategoryId: string;
  vendorProfileId: string;
  brief: QuoteRequestBrief;
  aiRecommendationId: string | null;
}
