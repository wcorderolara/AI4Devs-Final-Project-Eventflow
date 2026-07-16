// API client — vendor QR detail + mark-viewed (US-051 / PB-P1-031 / FE-003).
// Wrapper mínimo sobre `httpGet`/`httpPost` que desanida el envelope `{ data, correlationId }`
// y adapta el DTO a camelCase para consumo en la UI (StatusBadge, EventBriefSnapshot).
import { httpGet, httpPost } from '@/shared/api-client';

export type VendorQuoteRequestStatus =
  | 'sent'
  | 'viewed'
  | 'responded'
  | 'expired'
  | 'cancelled';

export interface VendorQuoteRequestBrief {
  budget?: string;
  currency_code?: string;
  message?: string;
  source?: string;
  event_snapshot?: {
    event_type_id?: string;
    event_date?: string | null;
    location_id?: string | null;
    guests_count?: number | null;
  };
  // El brief puede tener otras shapes (US-096 legacy o AI). Mantener campos opcionales para no
  // acoplar la UI a una única versión del brief.
  summary?: string;
  requirements?: string[];
  questions?: string[];
  constraints?: string[];
}

export interface VendorQuoteRequestDTO {
  id: string;
  eventId: string;
  serviceCategoryId: string;
  vendorProfileId: string | null;
  status: VendorQuoteRequestStatus;
  brief: VendorQuoteRequestBrief | null;
  aiRecommendationId: string | null;
  viewedAt: string | null;
  viewedBy: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Envelope<T> {
  data: T;
  correlationId: string;
}

/** Request body del endpoint respond (US-052). `currency_code` es aceptado pero el backend
 * lo ignora y usa la moneda del evento (DEV-04 / SEC-04). */
export interface RespondVendorQrInput {
  total_price: string;
  breakdown: { label: string; amount: string }[];
  conditions?: string;
  valid_until?: string;
}

/** Response del endpoint respond (US-052). Shape distinto al detalle (es un `Quote`). */
export interface VendorQuoteResponseDTO {
  id: string;
  quoteRequestId: string;
  vendorProfileId: string;
  status: 'sent';
  totalPrice: string;
  currencyCode: string;
  breakdown: { label: string; amount: string }[];
  conditions: string | null;
  validUntil: string;
  sentAt: string;
  createdAt: string;
  updatedAt: string;
}

export const vendorQrApi = {
  async detail(id: string): Promise<VendorQuoteRequestDTO> {
    const envelope = await httpGet<Envelope<VendorQuoteRequestDTO>>(
      `/vendor/quote-requests/${encodeURIComponent(id)}`,
    );
    return envelope.data;
  },

  async markViewed(id: string): Promise<VendorQuoteRequestDTO> {
    const envelope = await httpPost<Envelope<VendorQuoteRequestDTO>, undefined>(
      `/vendor/quote-requests/${encodeURIComponent(id)}/mark-viewed`,
      { body: undefined },
    );
    return envelope.data;
  },

  async respond(id: string, input: RespondVendorQrInput): Promise<VendorQuoteResponseDTO> {
    const envelope = await httpPost<Envelope<VendorQuoteResponseDTO>, RespondVendorQrInput>(
      `/vendor/quote-requests/${encodeURIComponent(id)}/respond`,
      { body: input },
    );
    return envelope.data;
  },
};
