// Puertos de persistencia de quote-flow (US-096 / BE-003). Module-local.
import type { CreateQuoteRequestData, QuoteRequestView, QuoteRequestStatusValue } from '../domain/quote-request.js';
import type { CreateQuoteData, QuoteView, UpdateQuoteData } from '../domain/quote.js';
import type { PaginationInput } from '../../../shared/validation/pagination.js';

export interface QuoteRequestRepository {
  /**
   * Crea un QuoteRequest aplicando en UNA transacción el límite de activos por event/category
   * (máx `maxActive`) y el chequeo de duplicado activo por event/vendor. Lanza los errores de
   * dominio correspondientes (MaxQuoteRequestsExceeded / DuplicateQuoteRequestActive).
   */
  createWithChecks(data: CreateQuoteRequestData, maxActive: number): Promise<QuoteRequestView>;
  findById(id: string): Promise<QuoteRequestView | null>;
  /**
   * US-051 (BE-002): busca un QuoteRequest visible para el vendor autenticado. Filtra por
   * `vendorProfileId` (asignación real) y devuelve `null` si el QR no existe o no pertenece
   * al vendor. Habilita el `404 QR_NOT_FOUND` uniforme sin filtrar por estado.
   */
  findByIdAndVendorProfile(
    qrId: string,
    vendorProfileId: string,
  ): Promise<QuoteRequestView | null>;
  listByEvent(
    eventId: string,
    filters: { status?: QuoteRequestStatusValue },
    pagination: PaginationInput,
  ): Promise<{ items: QuoteRequestView[]; total: number }>;
  listByVendor(
    vendorProfileId: string,
    filters: { status?: QuoteRequestStatusValue },
    pagination: PaginationInput,
  ): Promise<{ items: QuoteRequestView[]; total: number }>;
  markViewed(id: string, now: Date): Promise<QuoteRequestView>;
  cancel(id: string, now: Date): Promise<QuoteRequestView>;
}

export interface QuoteRepository {
  /** Crea un Quote draft. Conflicto con `uq_quotes_request_active` → ConflictError. */
  createDraft(data: CreateQuoteData): Promise<QuoteView>;
  findById(id: string): Promise<QuoteView | null>;
  findCurrentByQuoteRequest(quoteRequestId: string): Promise<QuoteView | null>;
  update(id: string, patch: UpdateQuoteData): Promise<QuoteView>;
  send(id: string, sentAt: Date, validUntil: Date): Promise<QuoteView>;
  accept(id: string, now: Date): Promise<QuoteView>;
  reject(id: string, now: Date): Promise<QuoteView>;
  /**
   * US-057 (PB-P1-035 / BE-002): Quotes comparables para `(event_id, service_category_id)` con
   * datos del vendor whitelisted (business_name, slug, rating_avg, reviews_count). Excluye `draft`
   * (no entregadas). Orden estable requerido por AC-01:
   *   `is_preferred DESC, activos primero (sent, accepted), total_price ASC`.
   */
  findComparableByEventAndCategory(input: {
    eventId: string;
    serviceCategoryId: string;
  }): Promise<ComparableQuoteRow[]>;
}

export interface ComparableQuoteRow {
  quoteId: string;
  vendor: {
    profileId: string;
    businessName: string;
    slug: string | null;
    ratingAvg: number | null;
    reviewsCount: number;
  };
  status: 'sent' | 'accepted' | 'rejected' | 'expired';
  totalPrice: string;
  breakdown: Array<{ label: string; amount: string }> | null;
  validUntil: string | null;
  conditions: string | null;
  isPreferred: boolean;
  createdAt: string;
}
