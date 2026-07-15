// Adapter estructurado del logger de eventos VendorProfile (US-040 / US-041 / BE-006).
import { logger } from '../../../shared/infrastructure/logger/index.js';
import type { VendorProfileView } from '../domain/vendor-profile.js';
import {
  buildVendorProfileCreatedPayload,
  buildVendorProfileRependingPayload,
  buildVendorProfileSoftDeletedPayload,
  buildVendorProfileUpdatedPayload,
  type VendorProfileEventLogger,
  type VendorProfileRependingContext,
  type VendorProfileSoftDeletedContext,
  type VendorProfileUpdatedContext,
} from '../application/vendor-profile-event-logger.js';

export class StructuredVendorProfileEventLogger implements VendorProfileEventLogger {
  emitProfileCreated(
    view: VendorProfileView,
    ctx: { correlationId?: string; durationMs?: number } = {},
  ): void {
    logger.info(buildVendorProfileCreatedPayload(view, ctx));
  }

  emitProfileUpdated(view: VendorProfileView, ctx: VendorProfileUpdatedContext): void {
    logger.info(buildVendorProfileUpdatedPayload(view, ctx));
  }

  emitProfileRepending(view: VendorProfileView, ctx: VendorProfileRependingContext): void {
    logger.info(buildVendorProfileRependingPayload(view, ctx));
  }

  emitProfileSoftDeleted(
    ids: { vendorProfileId: string; vendorUserId: string },
    ctx: VendorProfileSoftDeletedContext,
  ): void {
    logger.info(buildVendorProfileSoftDeletedPayload(ids, ctx));
  }
}
