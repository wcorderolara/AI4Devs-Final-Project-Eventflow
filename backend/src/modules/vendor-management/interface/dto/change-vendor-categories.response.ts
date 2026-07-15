// Response DTO — Cambiar categorías del vendor (US-042 / BE-004, AC-01..04, EC-01).
// Shape canónico documentado en `docs/16 §M07`.
import type { VendorProfileView } from '../../domain/vendor-profile.js';
import { toVendorProfileResponse, type VendorProfileDto } from './vendor-profile.response.js';

export interface ChangeVendorCategoriesResponse {
  profile: VendorProfileDto;
  repending: boolean;
  noop: boolean;
  category_change_count: number;
  requires_admin_review: boolean;
  status: VendorProfileDto['status'];
  last_category_change_at: string | null;
}

export function toChangeVendorCategoriesResponse(args: {
  profile: VendorProfileView;
  repending: boolean;
  noop: boolean;
  categoryChangeCount: number;
  requiresAdminReview: boolean;
  lastCategoryChangeAt: Date | null;
}): ChangeVendorCategoriesResponse {
  return {
    profile: toVendorProfileResponse(args.profile),
    repending: args.repending,
    noop: args.noop,
    category_change_count: args.categoryChangeCount,
    requires_admin_review: args.requiresAdminReview,
    status: args.profile.status,
    last_category_change_at: args.lastCategoryChangeAt
      ? args.lastCategoryChangeAt.toISOString()
      : null,
  };
}
