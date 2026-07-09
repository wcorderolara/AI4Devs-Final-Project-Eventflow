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
  setPreferred(id: string): Promise<QuoteView>;
}
