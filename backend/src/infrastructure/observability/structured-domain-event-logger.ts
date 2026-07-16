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
      // US-053 (BE-005): metadatos del ExpireQuotesJob.
      runId?: string;
      totalExpired?: number;
      batchCount?: number;
      batchIndex?: number;
      count?: number;
      durationMs?: number;
      errorCount?: number;
      jitterMs?: number;
      // US-054 (BE-006): metadatos de `quote.notification.emitted`.
      eventName?: string;
      vendorUserId?: string;
    },
  ): void {
    // Warnings de dominio (p. ej. `quote_request.limit_reached`) van al canal `warn` para
    // que aparezcan en el flujo operativo apropiado. Errores del job (p. ej. batch/run failed)
    // van a `error`. El resto sigue en `info`.
    if (event.endsWith('.limit_reached')) {
      logger.warn({ event, ...data });
      return;
    }
    if (event.endsWith('.failed')) {
      logger.error({ event, ...data });
      return;
    }
    logger.info({ event, ...data });
  }
}
