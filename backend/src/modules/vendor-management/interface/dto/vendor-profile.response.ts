// Response DTO — VendorProfileDto (US-040 / AC-04). Shape canónico documentado en `docs/16 §M07`.
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
