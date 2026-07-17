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

// ─────────────────────────────────────────────────────────────────────────────
// US-056 · cancel quote request (organizer)
// ─────────────────────────────────────────────────────────────────────────────

export interface CancelQrInput {
  quoteRequestId: string;
  reason?: string;
}

/**
 * Sub-set del `QuoteRequestResponse` (backend) que el organizer necesita tras cancelar:
 * status, timestamps de cancelación, actor (`cancelledBy`) y motivo (`cancellationReason`).
 */
export interface CancelQrDTO {
  id: string;
  status: 'cancelled';
  cancelledAt: string;
  cancelledBy: string;
  cancellationReason: string | null;
}

export interface CancelQrEnvelope {
  data: CancelQrDTO;
  correlationId: string;
}

export interface CancelQrView {
  id: string;
  status: 'cancelled';
  cancelledAt: string;
  cancelledBy: string;
  cancellationReason: string | null;
}

export function toCancelQrView(dto: CancelQrDTO): CancelQrView {
  return {
    id: dto.id,
    status: dto.status,
    cancelledAt: dto.cancelledAt,
    cancelledBy: dto.cancelledBy,
    cancellationReason: dto.cancellationReason,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// US-057 · compare quotes side-by-side (organizer)
// ─────────────────────────────────────────────────────────────────────────────

export type ComparableQuoteStatus = 'sent' | 'accepted' | 'rejected' | 'expired';

export interface CompareQuotesInput {
  eventId: string;
  categoryCode: string;
}

export interface CompareQuoteVendorDTO {
  profile_id: string;
  business_name: string;
  slug: string | null;
  rating_avg: number | null;
  reviews_count: number;
}

export interface CompareQuoteBreakdownItemDTO {
  label: string;
  amount: string;
}

export interface CompareQuoteItemDTO {
  quote_id: string;
  vendor: CompareQuoteVendorDTO;
  status: ComparableQuoteStatus;
  total_price: string;
  breakdown: CompareQuoteBreakdownItemDTO[] | null;
  valid_until: string | null;
  conditions: string | null;
  is_preferred: boolean;
  created_at: string;
}

export interface CompareQuotesDTO {
  category: { code: string; name: string };
  currency_code: string;
  items: CompareQuoteItemDTO[];
}

export interface CompareQuotesEnvelope {
  data: CompareQuotesDTO;
  correlationId: string;
}

export interface CompareQuoteVendorView {
  profileId: string;
  businessName: string;
  slug: string | null;
  ratingAvg: number | null;
  reviewsCount: number;
}

export interface CompareQuoteBreakdownItemView {
  label: string;
  amount: string;
}

export interface CompareQuoteItemView {
  quoteId: string;
  vendor: CompareQuoteVendorView;
  status: ComparableQuoteStatus;
  totalPrice: string;
  breakdown: CompareQuoteBreakdownItemView[] | null;
  validUntil: string | null;
  conditions: string | null;
  isPreferred: boolean;
  createdAt: string;
}

export interface CompareQuotesView {
  category: { code: string; name: string };
  currencyCode: string;
  items: CompareQuoteItemView[];
}

export function toCompareQuotesView(dto: CompareQuotesDTO): CompareQuotesView {
  return {
    category: { code: dto.category.code, name: dto.category.name },
    currencyCode: dto.currency_code,
    items: dto.items.map((it) => ({
      quoteId: it.quote_id,
      vendor: {
        profileId: it.vendor.profile_id,
        businessName: it.vendor.business_name,
        slug: it.vendor.slug,
        ratingAvg: it.vendor.rating_avg,
        reviewsCount: it.vendor.reviews_count,
      },
      status: it.status,
      totalPrice: it.total_price,
      breakdown: it.breakdown,
      validUntil: it.valid_until,
      conditions: it.conditions,
      isPreferred: it.is_preferred,
      createdAt: it.created_at,
    })),
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
