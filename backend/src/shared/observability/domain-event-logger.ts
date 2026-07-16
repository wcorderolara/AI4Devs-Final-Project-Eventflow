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
    },
  ): void;
}
