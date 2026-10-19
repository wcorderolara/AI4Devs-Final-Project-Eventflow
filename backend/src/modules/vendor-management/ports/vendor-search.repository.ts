// Port — VendorSearchRepository (US-045 / BE-003).
// Consulta de sólo lectura del directorio autenticado. Aisla al use case de la construcción
// del SQL con keyset predicate y del cálculo del `priceRange` por vendor.
import type { SupportedCurrency } from '../../../shared/constants/currencies.js';

export interface VendorSearchFilters {
  categoryId: string | null;
  locationId: string | null;
  priceMin: string | null;
  priceMax: string | null;
  currency: SupportedCurrency | null;
}

export interface VendorSearchCursorInput {
  ratingAvg: number | null;
  createdAt: Date;
  id: string;
}

export interface VendorSearchQueryInput {
  filters: VendorSearchFilters;
  cursor: VendorSearchCursorInput | null;
  limit: number;
  excludeUserId: string | null;
}

export interface VendorSearchRow {
  id: string;
  slug: string | null;
  businessName: string;
  locationCode: string | null;
  /** "Ciudad, Región, País" legible; `null` sin ubicación. */
  locationDisplay: string | null;
  categoryCodes: string[];
  /** Mismo orden que `categoryCodes`, con la etiqueta del catálogo. */
  categoryLabels: Array<{ code: string; label: string }>;
  /** Primera imagen activa del portafolio (portada de la tarjeta); `null` sin portafolio. */
  coverAttachmentId: string | null;
  ratingAvg: number | null;
  reviewsCount: number;
  priceMin: string | null;
  priceMax: string | null;
  priceCurrency: SupportedCurrency | null;
  createdAt: Date;
}

export interface VendorSearchRepository {
  searchApprovedVendors(input: VendorSearchQueryInput): Promise<VendorSearchRow[]>;
}
