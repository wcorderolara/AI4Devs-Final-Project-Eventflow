// Puerto de logging de eventos de dominio (US-096 / OBS-001). El adapter DEBE incluir solo
// metadatos seguros (correlationId, actorId, ids); NUNCA brief/conditions/cancellationReason
// completos ni PII (SEC-09).
export interface DomainEventLogger {
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
      // US-053 (BE-005): metadatos del `ExpireQuotesJob`. `runId` correla batches con el run
      // padre; `totalExpired`/`batchCount`/`durationMs` son las métricas agregadas del run;
      // `batchIndex`/`count` son las métricas por batch.
      runId?: string;
      totalExpired?: number;
      batchCount?: number;
      batchIndex?: number;
      count?: number;
      durationMs?: number;
      errorCount?: number;
      jitterMs?: number;
      // US-054 (BE-006): `quote.notification.emitted` acarrea el nombre del evento notificado
      // (`quote.rejected` | `quote.expired`) y el `vendorUserId` destinatario para trazar
      // la fan-out del `QuoteNotificationService` sin exponer el payload (SEC-09).
      eventName?: string;
      vendorUserId?: string;
    },
  ): void;
}
