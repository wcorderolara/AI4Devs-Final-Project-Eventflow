// Port — PublicVendorRepository (US-046 / BE-002, §7 Tech Spec).
// Interfaz que abstrae el acceso a datos del perfil público. Devuelve una vista rica
// (`PublicVendorRecord`) con joins ya resueltos (categories, packages activos, portfolio
// activo, top-N reviews published) más el count total de reviews published. El mapper (BE-003)
// aplica la whitelist explícita hacia el DTO externo.

export interface PublicVendorLocationRecord {
  code: string | null;
  country: string;
  region: string | null;
  city: string | null;
}

export interface PublicVendorCategoryRecord {
  code: string;
  label: string;
}

export interface PublicVendorPackageRecord {
  packageName: string;
  basePrice: string;
  currencyCode: string;
  description: string;
  serviceCategoryCode: string;
}

export interface PublicVendorPortfolioAttachmentRecord {
  workLabel: string;
  url: string;
}

export interface PublicVendorReviewRecord {
  rating: number;
  comment: string | null;
  createdAt: Date;
  reviewerDisplayName: string;
}

export interface PublicVendorRecord {
  // US-066 (PB-P1-039): `id` requerido en el DTO público para permitir al cliente invocar el
  // listado paginado `GET /vendors/:id/reviews` sin roundtrip adicional slug→id. No es PII y
  // ya se emite en endpoints admin/organizer del mismo vendor.
  id: string;
  slug: string;
  businessName: string;
  bio: string | null;
  ratingAvg: number | null;
  reviewsCount: number;
  reviewsTotalPublished: number;
  location: PublicVendorLocationRecord | null;
  categories: PublicVendorCategoryRecord[];
  packages: PublicVendorPackageRecord[];
  portfolio: PublicVendorPortfolioAttachmentRecord[];
  reviews: PublicVendorReviewRecord[];
}

export interface PublicVendorRepository {
  /**
   * Devuelve la vista pública del vendor si y solo si `status='approved' AND deleted_at IS NULL`.
   * Cualquier otro estado o slug inexistente ⇒ `null` (el controller mapea a 404 uniforme,
   * D6 — sin distinción para evitar information leakage).
   */
  findPublicApprovedBySlug(slug: string): Promise<PublicVendorRecord | null>;
}
