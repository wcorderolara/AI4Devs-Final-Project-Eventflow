// Tipos DTO — Directorio autenticado de vendors (US-045 / FE-003).
// Alineados con el response shape §9 del backend (camelCase en la superficie HTTP).

export type VendorCurrencyCode = 'GTQ' | 'EUR' | 'MXN' | 'COP' | 'USD';

export const VENDOR_CURRENCY_CODES: readonly VendorCurrencyCode[] = [
  'GTQ',
  'EUR',
  'MXN',
  'COP',
  'USD',
];

export interface VendorPriceRangeDTO {
  min: string;
  max: string;
  currency: string;
}

export interface VendorCardDTO {
  id: string;
  slug: string;
  businessName: string;
  locationCode: string | null;
  categories: string[];
  ratingAvg: number | null;
  reviewsCount: number;
  priceRange: VendorPriceRangeDTO | null;
  thumbnailUrl: string | null;
}

export interface VendorSearchPageDTO {
  cursor: string | null;
  limit: number;
  hasNext: boolean;
}

export interface VendorSearchDataDTO {
  items: VendorCardDTO[];
  page: VendorSearchPageDTO;
}

export interface VendorSearchEnvelope {
  data: VendorSearchDataDTO;
  correlationId?: string;
}

export interface VendorSearchQuery {
  categoryCode?: string;
  locationCode?: string;
  priceMin?: string;
  priceMax?: string;
  currency?: VendorCurrencyCode;
  cursor?: string;
  limit?: number;
}
