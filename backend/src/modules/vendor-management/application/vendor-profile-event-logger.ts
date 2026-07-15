// Logger de eventos del módulo vendor-management (US-040 / BE-006, US-041 / BE-006, SEC-04).
// Solo campos canónicos (sin PII): vendorProfileId, vendor_user_id opaco, business_name (nombre
// comercial, no personal), slug, status, categorías (ids), location_id, languages_supported,
// correlationId. NUNCA email, bio libre (puede contener PII incidental), tokens.

import type { VendorProfileView, VendorProfileStatus } from '../domain/vendor-profile.js';

export const VENDOR_PROFILE_CREATED_EVENT = 'vendor.profile.created';
export const VENDOR_PROFILE_UPDATED_EVENT = 'vendor.profile.updated';
export const VENDOR_PROFILE_REPENDING_EVENT = 'vendor.profile.repending';
export const VENDOR_PROFILE_SOFT_DELETED_EVENT = 'vendor.profile.soft_deleted';
export const VENDOR_CATEGORY_CHANGED_EVENT = 'vendor.category.changed';
export const VENDOR_CATEGORY_NOOP_EVENT = 'vendor.category.noop';
export const VENDOR_CATEGORY_LIMIT_REACHED_EVENT = 'vendor.category.limit_reached';

export interface VendorProfileUpdatedContext {
  correlationId?: string;
  durationMs?: number;
  fieldsUpdated: readonly string[];
  repending: boolean;
}

export interface VendorProfileRependingContext {
  correlationId?: string;
  previousStatus: VendorProfileStatus;
}

export interface VendorProfileSoftDeletedContext {
  correlationId?: string;
  deletedBy: string;
  previousStatus: VendorProfileStatus;
}

export interface VendorCategoryChangedContext {
  correlationId?: string;
  vendorProfileId: string;
  vendorUserId: string;
  before: readonly string[];
  after: readonly string[];
  categoryChangeCountAfter: number;
  repending: boolean;
  previousStatus: VendorProfileStatus;
  newStatus: VendorProfileStatus;
  durationMs?: number;
}

export interface VendorCategoryNoopContext {
  correlationId?: string;
  vendorProfileId: string;
  vendorUserId: string;
  categoryIds: readonly string[];
}

export interface VendorCategoryLimitReachedContext {
  correlationId?: string;
  vendorProfileId: string;
  vendorUserId: string;
  categoryChangeCount: number;
}

export interface VendorProfileEventLogger {
  emitProfileCreated(view: VendorProfileView, ctx: { correlationId?: string; durationMs?: number }): void;
  emitProfileUpdated(view: VendorProfileView, ctx: VendorProfileUpdatedContext): void;
  emitProfileRepending(view: VendorProfileView, ctx: VendorProfileRependingContext): void;
  emitProfileSoftDeleted(
    ids: { vendorProfileId: string; vendorUserId: string },
    ctx: VendorProfileSoftDeletedContext,
  ): void;
  emitCategoryChanged(ctx: VendorCategoryChangedContext): void;
  emitCategoryNoop(ctx: VendorCategoryNoopContext): void;
  emitCategoryLimitReached(ctx: VendorCategoryLimitReachedContext): void;
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

export interface VendorProfileUpdatedPayload {
  event: typeof VENDOR_PROFILE_UPDATED_EVENT;
  correlationId?: string;
  vendorProfileId: string;
  vendorUserId: string;
  status: string;
  slug: string;
  fieldsUpdated: readonly string[];
  repending: boolean;
  durationMs?: number;
}

export function buildVendorProfileUpdatedPayload(
  view: VendorProfileView,
  ctx: VendorProfileUpdatedContext,
): VendorProfileUpdatedPayload {
  return {
    event: VENDOR_PROFILE_UPDATED_EVENT,
    correlationId: ctx.correlationId,
    vendorProfileId: view.id,
    vendorUserId: view.vendorUserId,
    status: view.status,
    slug: view.slug,
    fieldsUpdated: ctx.fieldsUpdated,
    repending: ctx.repending,
    durationMs: ctx.durationMs,
  };
}

export interface VendorProfileRependingPayload {
  event: typeof VENDOR_PROFILE_REPENDING_EVENT;
  correlationId?: string;
  vendorProfileId: string;
  vendorUserId: string;
  previousStatus: VendorProfileStatus;
  newStatus: 'pending';
}

export function buildVendorProfileRependingPayload(
  view: VendorProfileView,
  ctx: VendorProfileRependingContext,
): VendorProfileRependingPayload {
  return {
    event: VENDOR_PROFILE_REPENDING_EVENT,
    correlationId: ctx.correlationId,
    vendorProfileId: view.id,
    vendorUserId: view.vendorUserId,
    previousStatus: ctx.previousStatus,
    newStatus: 'pending',
  };
}

export interface VendorProfileSoftDeletedPayload {
  event: typeof VENDOR_PROFILE_SOFT_DELETED_EVENT;
  correlationId?: string;
  vendorProfileId: string;
  vendorUserId: string;
  deletedBy: string;
  previousStatus: VendorProfileStatus;
}

export function buildVendorProfileSoftDeletedPayload(
  ids: { vendorProfileId: string; vendorUserId: string },
  ctx: VendorProfileSoftDeletedContext,
): VendorProfileSoftDeletedPayload {
  return {
    event: VENDOR_PROFILE_SOFT_DELETED_EVENT,
    correlationId: ctx.correlationId,
    vendorProfileId: ids.vendorProfileId,
    vendorUserId: ids.vendorUserId,
    deletedBy: ctx.deletedBy,
    previousStatus: ctx.previousStatus,
  };
}

export interface VendorCategoryChangedPayload {
  event: typeof VENDOR_CATEGORY_CHANGED_EVENT;
  correlationId?: string;
  vendorProfileId: string;
  vendorUserId: string;
  before: readonly string[];
  after: readonly string[];
  categoryChangeCountAfter: number;
  repending: boolean;
  previousStatus: VendorProfileStatus;
  newStatus: VendorProfileStatus;
  durationMs?: number;
}

export function buildVendorCategoryChangedPayload(
  ctx: VendorCategoryChangedContext,
): VendorCategoryChangedPayload {
  return {
    event: VENDOR_CATEGORY_CHANGED_EVENT,
    correlationId: ctx.correlationId,
    vendorProfileId: ctx.vendorProfileId,
    vendorUserId: ctx.vendorUserId,
    before: ctx.before,
    after: ctx.after,
    categoryChangeCountAfter: ctx.categoryChangeCountAfter,
    repending: ctx.repending,
    previousStatus: ctx.previousStatus,
    newStatus: ctx.newStatus,
    durationMs: ctx.durationMs,
  };
}

export interface VendorCategoryNoopPayload {
  event: typeof VENDOR_CATEGORY_NOOP_EVENT;
  correlationId?: string;
  vendorProfileId: string;
  vendorUserId: string;
  categoryIds: readonly string[];
}

export function buildVendorCategoryNoopPayload(
  ctx: VendorCategoryNoopContext,
): VendorCategoryNoopPayload {
  return {
    event: VENDOR_CATEGORY_NOOP_EVENT,
    correlationId: ctx.correlationId,
    vendorProfileId: ctx.vendorProfileId,
    vendorUserId: ctx.vendorUserId,
    categoryIds: ctx.categoryIds,
  };
}

export interface VendorCategoryLimitReachedPayload {
  event: typeof VENDOR_CATEGORY_LIMIT_REACHED_EVENT;
  correlationId?: string;
  vendorProfileId: string;
  vendorUserId: string;
  categoryChangeCount: number;
}

export function buildVendorCategoryLimitReachedPayload(
  ctx: VendorCategoryLimitReachedContext,
): VendorCategoryLimitReachedPayload {
  return {
    event: VENDOR_CATEGORY_LIMIT_REACHED_EVENT,
    correlationId: ctx.correlationId,
    vendorProfileId: ctx.vendorProfileId,
    vendorUserId: ctx.vendorUserId,
    categoryChangeCount: ctx.categoryChangeCount,
  };
}
