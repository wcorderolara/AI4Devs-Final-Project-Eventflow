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
