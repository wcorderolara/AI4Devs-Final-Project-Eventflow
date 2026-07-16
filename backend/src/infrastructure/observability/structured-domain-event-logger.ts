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
      // US-050 (BE-005): metadatos del evento `quote_request.limit_reached`.
      eventId?: string;
      serviceCategoryId?: string;
      activeCount?: number;
      limit?: number;
      reason?: string;
    },
  ): void {
    // Warnings de dominio (p. ej. `quote_request.limit_reached`) van al canal `warn` para
    // que aparezcan en el flujo operativo apropiado; el resto sigue en `info`.
    if (event.endsWith('.limit_reached')) {
      logger.warn({ event, ...data });
      return;
    }
    logger.info({ event, ...data });
  }
}
