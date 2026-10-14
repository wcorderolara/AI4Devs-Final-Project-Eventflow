// Response DTO — Directorio de vendors (US-045 / BE-006, §9 US Response Shape).
// Superficie HTTP en camelCase para alinear con el contrato de la US (D1); no reutiliza el
// snake_case histórico de otros vendor endpoints para no distorsionar el shape declarado.
// `thumbnailUrl` es la primera imagen activa del portafolio, servida por la ruta pública
// `/api/v1/public/portfolio/:id`; `null` si el proveedor no tiene portafolio.
import { publicPortfolioImagePath } from '../../../../shared/http/public-portfolio-path.js';
import type { VendorSearchRow } from '../../ports/vendor-search.repository.js';

export interface VendorPriceRange {
  min: string;
  max: string;
  currency: string;
}

export interface VendorCardResponse {
  id: string;
  slug: string | null;
  businessName: string;
  locationCode: string | null;
  /** Aditivo: ubicación legible para la UI ("Antigua Guatemala, Sacatepéquez, Guatemala"). */
  locationDisplay: string | null;
  categories: string[];
  /** Aditivo: categorías con su nombre de catálogo, en el mismo orden que `categories`. */
  categoryLabels: Array<{ code: string; name: string }>;
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
    locationDisplay: row.locationDisplay,
    categories: row.categoryCodes,
    categoryLabels: row.categoryLabels.map((c) => ({ code: c.code, name: c.label })),
    ratingAvg: row.ratingAvg,
    reviewsCount: row.reviewsCount,
    priceRange,
    thumbnailUrl: row.coverAttachmentId ? publicPortfolioImagePath(row.coverAttachmentId) : null,
  };
}
