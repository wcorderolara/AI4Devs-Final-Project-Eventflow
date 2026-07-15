// Tipos DTO (contrato con `/api/v1/vendors/me` — US-040 / AC-04). Se mantienen alineados con el
// shape canónico documentado en `docs/16 §M07`. Los enums de idioma son espejo del backend.

export type VendorProfileStatus = 'pending' | 'approved' | 'rejected' | 'hidden';

export type SupportedLanguage = 'es-LATAM' | 'es-ES' | 'pt' | 'en';

export interface VendorProfileCategoryDTO {
  id: string;
  name: string;
}

export interface VendorProfileDTO {
  id: string;
  vendor_user_id: string;
  business_name: string;
  bio: string;
  location_id: string;
  languages_supported: SupportedLanguage[];
  categories: VendorProfileCategoryDTO[];
  slug: string;
  status: VendorProfileStatus;
  created_at: string;
  // US-042 (opcionales, presentes en GET /vendors/me y en la respuesta del POST /categories).
  category_change_count?: number;
  requires_admin_review?: boolean;
  last_category_change_at?: string | null;
}

export interface VendorProfileEnvelopeDTO {
  data: VendorProfileDTO;
  meta: { correlationId: string; timestamp?: string };
}

export interface CreateVendorProfileRequestDTO {
  business_name: string;
  bio: string;
  location_id: string;
  languages_supported: SupportedLanguage[];
  categories: string[];
}

export interface ServiceCategoryOption {
  id: string;
  code: string;
  label: string;
}

export interface ServiceCategoriesEnvelopeDTO {
  data: ServiceCategoryOption[];
  meta: { correlationId: string; timestamp?: string };
}

// ── US-041 ─────────────────────────────────────────────────────────────────
export interface UpdateVendorProfileRequestDTO {
  business_name?: string;
  bio?: string;
  location_id?: string;
  languages_supported?: SupportedLanguage[];
}

export interface UpdateVendorProfileResultDTO {
  profile: VendorProfileDTO;
  repending: boolean;
}

export interface UpdateVendorProfileEnvelopeDTO {
  data: UpdateVendorProfileResultDTO;
  meta: { correlationId: string; timestamp?: string };
}

// ── US-042 ─────────────────────────────────────────────────────────────────
export interface ChangeVendorCategoriesRequestDTO {
  service_category_ids: string[];
}

export interface ChangeVendorCategoriesResultDTO {
  profile: VendorProfileDTO;
  repending: boolean;
  noop: boolean;
  category_change_count: number;
  requires_admin_review: boolean;
  status: VendorProfileStatus;
  last_category_change_at: string | null;
}

export interface ChangeVendorCategoriesEnvelopeDTO {
  data: ChangeVendorCategoriesResultDTO;
  meta: { correlationId: string; timestamp?: string };
}
