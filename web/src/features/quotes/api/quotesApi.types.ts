// Tipos DTO — quotes (US-049 / PB-P1-030 / FE-003). Espejo del contrato §9 API del Tech Spec.
// El envelope backend (US-093) es `{ data, correlationId }` — el cliente lo desanida.

export type QuoteRequestSource = 'manual' | 'ai_generated';

export interface CreateQuoteRequestInput {
  event_id: string;
  vendor_profile_id: string;
  service_category_id: string;
  brief: {
    budget: string;
    message: string;
  };
  source?: QuoteRequestSource;
}

export interface CreateQuoteRequestDTO {
  id: string;
  status: 'sent';
  sent_at: string;
  event_id: string;
  vendor_profile_id: string;
  service_category_id: string;
  ai_generated_brief: boolean;
  brief: {
    budget: string;
    currency_code: string;
    message: string;
  };
  event_snapshot: {
    event_type_id: string;
    event_date: string | null;
    location_id: string | null;
    guests_count: number | null;
  };
}

export interface CreateQuoteRequestEnvelope {
  data: CreateQuoteRequestDTO;
  correlationId: string;
}

export interface CreateQuoteRequestView {
  id: string;
  status: 'sent';
  sentAt: string;
  eventId: string;
  vendorProfileId: string;
  serviceCategoryId: string;
  aiGeneratedBrief: boolean;
  brief: {
    budget: string;
    currencyCode: string;
    message: string;
  };
  eventSnapshot: {
    eventTypeId: string;
    eventDate: string | null;
    locationId: string | null;
    guestsCount: number | null;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// US-050 · active-count
// ─────────────────────────────────────────────────────────────────────────────

export interface ActiveQrCountInput {
  eventId: string;
  serviceCategoryId: string;
}

export interface ActiveQrCountDTO {
  active_count: number;
  limit: number;
  available_slots: number;
  statuses_counted: string[];
}

export interface ActiveQrCountEnvelope {
  data: ActiveQrCountDTO;
  correlationId: string;
}

export interface ActiveQrCountView {
  activeCount: number;
  limit: number;
  availableSlots: number;
  statusesCounted: string[];
}

export function toActiveQrCountView(dto: ActiveQrCountDTO): ActiveQrCountView {
  return {
    activeCount: dto.active_count,
    limit: dto.limit,
    availableSlots: dto.available_slots,
    statusesCounted: dto.statuses_counted,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// US-054 · reject quote (organizer)
// ─────────────────────────────────────────────────────────────────────────────

export interface RejectQuoteInput {
  quoteId: string;
  reason?: string;
}

/**
 * Sub-set del `QuoteResponse` (backend) que el organizer necesita tras un rechazo:
 * status, timestamps de rechazo y el motivo persistido (null cuando no se envía).
 * El backend serializa camelCase en el envelope; los mapeos residuales quedan en el toView.
 */
export interface RejectQuoteDTO {
  id: string;
  status: 'rejected';
  rejectedAt: string;
  rejectionReason: string | null;
}

export interface RejectQuoteEnvelope {
  data: RejectQuoteDTO;
  correlationId: string;
}

export interface RejectQuoteView {
  id: string;
  status: 'rejected';
  rejectedAt: string;
  rejectionReason: string | null;
}

export function toRejectQuoteView(dto: RejectQuoteDTO): RejectQuoteView {
  return {
    id: dto.id,
    status: dto.status,
    rejectedAt: dto.rejectedAt,
    rejectionReason: dto.rejectionReason,
  };
}

export function toCreateQuoteRequestView(dto: CreateQuoteRequestDTO): CreateQuoteRequestView {
  return {
    id: dto.id,
    status: dto.status,
    sentAt: dto.sent_at,
    eventId: dto.event_id,
    vendorProfileId: dto.vendor_profile_id,
    serviceCategoryId: dto.service_category_id,
    aiGeneratedBrief: dto.ai_generated_brief,
    brief: {
      budget: dto.brief.budget,
      currencyCode: dto.brief.currency_code,
      message: dto.brief.message,
    },
    eventSnapshot: {
      eventTypeId: dto.event_snapshot.event_type_id,
      eventDate: dto.event_snapshot.event_date,
      locationId: dto.event_snapshot.location_id,
      guestsCount: dto.event_snapshot.guests_count,
    },
  };
}
