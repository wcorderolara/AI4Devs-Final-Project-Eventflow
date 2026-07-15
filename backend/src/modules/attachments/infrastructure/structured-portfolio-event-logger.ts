// Adapter estructurado del PortfolioEventLogger (US-043 / PB-P1-026 / BE-008).
import { logger } from '../../../shared/infrastructure/logger/index.js';
import {
  buildPortfolioDeletedPayload,
  buildPortfolioUploadFailedPayload,
  buildPortfolioUploadedPayload,
  type PortfolioDeletedContext,
  type PortfolioEventLogger,
  type PortfolioUploadFailedContext,
  type PortfolioUploadedContext,
} from '../application/portfolio-event-logger.js';

export class StructuredPortfolioEventLogger implements PortfolioEventLogger {
  emitUploaded(ctx: PortfolioUploadedContext): void {
    logger.info(buildPortfolioUploadedPayload(ctx));
  }

  emitUploadFailed(ctx: PortfolioUploadFailedContext): void {
    logger.warn(buildPortfolioUploadFailedPayload(ctx));
  }

  emitDeleted(ctx: PortfolioDeletedContext): void {
    logger.info(buildPortfolioDeletedPayload(ctx));
  }
}
