// Response DTO — perfil público SEO del vendor (US-046 / BE-003 mapper, §7 Response Shape).
// Whitelist explícita según D1 (decisión resuelta): sólo estos campos salen al público. La
// pura ausencia de propiedades PII en la interfaz (más `.strict()` en el schema Zod usado por
// tests contractuales) previene fugas incluso si el repository agrega nuevos campos.
export interface PublicVendorLocationDto {
  display: string;
  code: string | null;
}

export interface PublicVendorCategoryDto {
  code: string;
  name: string;
}

export interface PublicVendorPackageDto {
  packageName: string;
  basePrice: string;
  currencyCode: string;
  description: string;
  serviceCategoryCode: string;
}

export interface PublicVendorPortfolioGroupDto {
  workLabel: string;
  thumbnails: string[];
}

export interface PublicVendorReviewDto {
  rating: number;
  comment: string | null;
  createdAt: string;
  reviewerDisplayName: string;
}

export interface PublicVendorDto {
  // US-066 (PB-P1-039): `id` extendido para habilitar el listado paginado del cliente
  // (`GET /vendors/:id/reviews`). Ampliación backward-compatible del contrato de US-046.
  id: string;
  slug: string;
  businessName: string;
  bio: string;
  location: PublicVendorLocationDto;
  categories: PublicVendorCategoryDto[];
  ratingAvg: number | null;
  reviewsCount: number;
  reviewsTotalPublished: number;
  packages: PublicVendorPackageDto[];
  portfolio: PublicVendorPortfolioGroupDto[];
  reviews: PublicVendorReviewDto[];
}
