// Response DTO — Directorio de vendors (US-045 / BE-006, §9 US Response Shape).
// Superficie HTTP en camelCase para alinear con el contrato de la US (D1); no reutiliza el
// snake_case histórico de otros vendor endpoints para no distorsionar el shape declarado.
// `thumbnailUrl` es siempre `null` en MVP: la relación con el portafolio del vendor todavía no
// tiene un query de "imagen destacada" y se cubrirá en la US pública US-046.
import type { VendorSearchRow } from '../../ports/vendor-search.repository.js';

export interface VendorPriceRange {
  min: string;
  max: string;
  currency: string;
}

export interface VendorCardResponse {
  id: string;
  slug: string;
  businessName: string;
  locationCode: string | null;
  categories: string[];
  ratingAvg: number | null;
  reviewsCount: number;
  priceRange: VendorPriceRange | null;
  thumbnailUrl: string | null;
}

export interface VendorSearchPageResponse {
  cursor: string | null;
  limit: number;
  hasNext: boolean;
}

export interface VendorSearchResponse {
  items: VendorCardResponse[];
  page: VendorSearchPageResponse;
}

export function toVendorCardResponse(row: VendorSearchRow): VendorCardResponse {
  const priceRange: VendorPriceRange | null =
    row.priceMin !== null && row.priceMax !== null && row.priceCurrency !== null
      ? { min: row.priceMin, max: row.priceMax, currency: row.priceCurrency }
      : null;
  return {
    id: row.id,
    slug: row.slug,
    businessName: row.businessName,
    locationCode: row.locationCode,
    categories: row.categoryCodes,
    ratingAvg: row.ratingAvg,
    reviewsCount: row.reviewsCount,
    priceRange,
    thumbnailUrl: null,
  };
}
