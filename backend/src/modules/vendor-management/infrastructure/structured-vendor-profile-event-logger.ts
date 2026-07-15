// Adapter estructurado del logger de eventos VendorProfile (US-040 / BE-006).
import { logger } from '../../../shared/infrastructure/logger/index.js';
import type { VendorProfileView } from '../domain/vendor-profile.js';
import {
  buildVendorProfileCreatedPayload,
  type VendorProfileEventLogger,
} from '../application/vendor-profile-event-logger.js';

export class StructuredVendorProfileEventLogger implements VendorProfileEventLogger {
  emitProfileCreated(
    view: VendorProfileView,
    ctx: { correlationId?: string; durationMs?: number } = {},
  ): void {
    logger.info(buildVendorProfileCreatedPayload(view, ctx));
  }
}
