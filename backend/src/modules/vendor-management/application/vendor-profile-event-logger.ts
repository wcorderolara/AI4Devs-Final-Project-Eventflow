// Logger de eventos del módulo vendor-management (US-040 / BE-006, SEC-04).
// Solo campos canónicos (sin PII): vendorProfileId, vendor_user_id opaco, business_name (nombre
// comercial, no personal), slug, status, categorías (ids), location_id, languages_supported,
// correlationId. NUNCA email, bio libre (puede contener PII incidental), tokens.

import type { VendorProfileView } from '../domain/vendor-profile.js';

export const VENDOR_PROFILE_CREATED_EVENT = 'vendor.profile.created';

export interface VendorProfileEventLogger {
  emitProfileCreated(view: VendorProfileView, ctx: { correlationId?: string; durationMs?: number }): void;
}

export interface VendorProfileCreatedPayload {
  event: typeof VENDOR_PROFILE_CREATED_EVENT;
  correlationId?: string;
  vendorProfileId: string;
  vendorUserId: string;
  businessName: string;
  slug: string;
  status: string;
  categoriesCount: number;
  categoryIds: string[];
  locationId: string;
  languagesSupported: string[];
  durationMs?: number;
}

export function buildVendorProfileCreatedPayload(
  view: VendorProfileView,
  ctx: { correlationId?: string; durationMs?: number } = {},
): VendorProfileCreatedPayload {
  return {
    event: VENDOR_PROFILE_CREATED_EVENT,
    correlationId: ctx.correlationId,
    vendorProfileId: view.id,
    vendorUserId: view.vendorUserId,
    businessName: view.businessName,
    slug: view.slug,
    status: view.status,
    categoriesCount: view.categories.length,
    categoryIds: view.categories.map((c) => c.id),
    locationId: view.locationId,
    languagesSupported: view.languagesSupported,
    durationMs: ctx.durationMs,
  };
}
