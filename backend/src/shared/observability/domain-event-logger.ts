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
    },
  ): void;
}
