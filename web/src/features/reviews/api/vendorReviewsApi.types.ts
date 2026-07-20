// Tipos DTO — vendor reviews public listing (US-066 / PB-P1-039 / FE-003).
//
// Espejo del contrato §9 API. Backend responde `{ vendor, items, pagination }` en camelCase
// dentro del envelope `{ data, correlationId }`. Cada item obedece anonimato (D2): NO expone
// `authorId`, `bookingIntentId`, `vendorProfileId`, ni PII del organizer — sólo `id, rating,
// comment, eventTitle, createdAt` y (para admin) `status`.

export type VendorReviewStatus = 'published' | 'hidden' | 'removed';

export interface AnonymizedReviewDTO {
  id: string;
  rating: number;
  comment: string | null;
  eventTitle: string;
  createdAt: string;
  /** Sólo presente cuando el requester es admin (D3). */
  status?: VendorReviewStatus;
}

export interface VendorSummaryDTO {
  id: string;
  businessName: string;
  slug: string;
  status: string;
  ratingAvg: number | null;
  reviewsCount: number;
}

export interface PaginationDTO {
  nextCursor: string | null;
  pageSize: number;
}

export interface ListVendorReviewsDTO {
  vendor: VendorSummaryDTO;
  items: AnonymizedReviewDTO[];
  pagination: PaginationDTO;
}

export interface ListVendorReviewsEnvelope {
  data: ListVendorReviewsDTO;
  correlationId: string;
}

export interface ListVendorReviewsQuery {
  cursor?: string;
  pageSize?: number;
}

/**
 * Proyección para la UI. Idéntica al DTO por ahora (el mapper existe por consistencia con el
 * resto del feature — organizerReviewsApi.types — y para poder evolucionar la vista sin
 * romper el contrato de red).
 */
export type ListVendorReviewsView = ListVendorReviewsDTO;

export function toListVendorReviewsView(dto: ListVendorReviewsDTO): ListVendorReviewsView {
  return dto;
}

/** Códigos de error consumidos por la UI del listado paginado. */
export type ListVendorReviewsErrorCode =
  | 'VALIDATION_ERROR'
  | 'INVALID_CURSOR'
  | 'VENDOR_NOT_FOUND'
  | 'RATE_LIMIT_EXCEEDED'
  | 'UNEXPECTED';
