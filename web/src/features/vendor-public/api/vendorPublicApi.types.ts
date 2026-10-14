// Tipos DTO — Perfil público SEO del vendor (US-046 / FE-004).
// Alineados con la respuesta del backend (§7/§9 del Tech Spec). Whitelist explícita: sólo
// los campos declarados por D1 llegan a la capa de UI.

export interface PublicVendorLocationDTO {
  display: string;
  code: string | null;
}

export interface PublicVendorCategoryDTO {
  code: string;
  name: string;
}

export interface PublicVendorPackageDTO {
  packageName: string;
  basePrice: string;
  currencyCode: string;
  description: string;
  serviceCategoryCode: string;
}

/** Crédito de una foto de licencia libre (autor, licencia y fuente). */
export interface PublicVendorImageCreditDTO {
  title: string | null;
  author: string | null;
  license: string;
  licenseUrl: string | null;
  source: string | null;
}

export interface PublicVendorPortfolioImageDTO {
  url: string;
  credit: PublicVendorImageCreditDTO | null;
}

export interface PublicVendorPortfolioGroupDTO {
  workLabel: string;
  thumbnails: string[];
  /** Aditivo (backend): cada imagen con su crédito. Opcional mientras convive con backends previos. */
  images?: PublicVendorPortfolioImageDTO[];
}

export interface PublicVendorReviewDTO {
  rating: number;
  comment: string | null;
  /** ISO 8601 con zona UTC. */
  createdAt: string;
  reviewerDisplayName: string;
}

export interface PublicVendorDTO {
  // US-066 (PB-P1-039): el backend expone `id` para habilitar el listado paginado por UUID
  // (`GET /vendors/:id/reviews`) sin roundtrip adicional slug→id.
  id: string;
  slug: string;
  businessName: string;
  bio: string;
  location: PublicVendorLocationDTO;
  categories: PublicVendorCategoryDTO[];
  ratingAvg: number | null;
  reviewsCount: number;
  reviewsTotalPublished: number;
  packages: PublicVendorPackageDTO[];
  portfolio: PublicVendorPortfolioGroupDTO[];
  reviews: PublicVendorReviewDTO[];
}

export interface PublicVendorErrorEnvelope {
  error: { code: string; message: string; correlationId?: string };
}
