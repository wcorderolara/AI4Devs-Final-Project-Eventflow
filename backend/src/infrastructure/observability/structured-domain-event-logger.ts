// Adapter — DomainEventLogger estructurado (US-096 / OBS-001). Solo metadatos seguros (SEC-09).
import type { DomainEventLogger } from '../../shared/observability/domain-event-logger.js';
import { logger } from '../../shared/infrastructure/logger/index.js';

export class StructuredDomainEventLogger implements DomainEventLogger {
  emit(
    event: string,
    data: {
      correlationId?: string;
      actorId?: string;
      quoteRequestId?: string;
      quoteId?: string;
      bookingIntentId?: string;
      reason?: string;
    },
  ): void {
    logger.info({ event, ...data });
  }
}
