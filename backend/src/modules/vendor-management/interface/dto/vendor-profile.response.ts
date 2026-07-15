// Response DTO — VendorProfileDto (US-040 / AC-04). Shape canónico documentado en `docs/16 §M07`.
// US-042 (PB-P1-025): agrega `category_change_count`, `requires_admin_review` y
// `last_category_change_at` como opcionales. `toVendorProfileResponse` mantiene el shape base
// (retro-compat con US-040 create response); `toVendorProfileResponseWithCategoryMeta` los
// incluye para el endpoint `GET /vendors/me` (permite al FE hidratar el contador antes de la
// primera mutación).
import type { VendorProfileView } from '../../domain/vendor-profile.js';

export interface VendorProfileCategoryDto {
  id: string;
  name: string;
}

export interface VendorProfileDto {
  id: string;
  vendor_user_id: string;
  business_name: string;
  bio: string;
  location_id: string;
  languages_supported: string[];
  categories: VendorProfileCategoryDto[];
  slug: string;
  status: 'pending' | 'approved' | 'rejected' | 'hidden';
  created_at: string;
  category_change_count?: number;
  requires_admin_review?: boolean;
  last_category_change_at?: string | null;
}

export function toVendorProfileResponse(view: VendorProfileView): VendorProfileDto {
  return {
    id: view.id,
    vendor_user_id: view.vendorUserId,
    business_name: view.businessName,
    bio: view.bio,
    location_id: view.locationId,
    languages_supported: view.languagesSupported,
    categories: view.categories.map((c) => ({ id: c.id, name: c.name })),
    slug: view.slug,
    status: view.status,
    created_at: view.createdAt.toISOString(),
  };
}

export function toVendorProfileResponseWithCategoryMeta(
  view: VendorProfileView,
  meta: {
    categoryChangeCount: number;
    requiresAdminReview: boolean;
    lastCategoryChangeAt: Date | null;
  },
): VendorProfileDto {
  return {
    ...toVendorProfileResponse(view),
    category_change_count: meta.categoryChangeCount,
    requires_admin_review: meta.requiresAdminReview,
    last_category_change_at: meta.lastCategoryChangeAt
      ? meta.lastCategoryChangeAt.toISOString()
      : null,
  };
}
