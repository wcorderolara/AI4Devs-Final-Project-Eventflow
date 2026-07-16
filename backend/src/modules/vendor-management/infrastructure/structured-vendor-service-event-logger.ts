// Adapter estructurado del logger — US-044 / BE-008. Reutiliza `shared/logger`.
import { logger } from '../../../shared/infrastructure/logger/index.js';
import {
  buildVendorServiceCreatedPayload,
  buildVendorServiceDeactivatedPayload,
  buildVendorServiceUpdatedPayload,
  type VendorServiceCreatedContext,
  type VendorServiceDeactivatedContext,
  type VendorServiceEventLogger,
  type VendorServiceUpdatedContext,
} from '../application/vendor-service-event-logger.js';

export class StructuredVendorServiceEventLogger implements VendorServiceEventLogger {
  emitCreated(ctx: VendorServiceCreatedContext): void {
    logger.info(buildVendorServiceCreatedPayload(ctx));
  }

  emitUpdated(ctx: VendorServiceUpdatedContext): void {
    logger.info(buildVendorServiceUpdatedPayload(ctx));
  }

  emitDeactivated(ctx: VendorServiceDeactivatedContext): void {
    logger.info(buildVendorServiceDeactivatedPayload(ctx));
  }
}
