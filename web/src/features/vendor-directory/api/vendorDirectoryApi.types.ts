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
  // `vendor_profiles.slug` es nullable (perfiles legacy previos a US-040).
  slug: string | null;
  businessName: string;
  locationCode: string | null;
  /** Aditivo (backend): "Ciudad, Región, País" legible. Opcional mientras convive con backends previos. */
  locationDisplay?: string | null;
  categories: string[];
  /** Aditivo (backend): categorías con su nombre de catálogo, en el orden de `categories`. */
  categoryLabels?: Array<{ code: string; name: string }>;
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

export interface VendorSearchQuery {
  categoryCode?: string;
  locationCode?: string;
  priceMin?: string;
  priceMax?: string;
  currency?: VendorCurrencyCode;
  cursor?: string;
  limit?: number;
}

/**
 * Tamaño de página de los directorios (público y del organizador). Múltiplo de 2 y 3 para que las
 * filas de la cuadrícula (2 columnas en tablet, 3 en escritorio) queden completas, y lo bastante
 * chico para que el infinite scroll se note con catálogos pequeños.
 */
export const DIRECTORY_PAGE_SIZE = 12;
