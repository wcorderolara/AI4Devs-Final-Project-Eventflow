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
      // US-054 (BE-006) + US-056 (BE-002): `quote.notification.emitted` acarrea el nombre del evento
      // notificado (`quote.rejected` | `quote.expired` | `quote_request.cancelled`) y el
      // `vendorUserId` destinatario para trazar la fan-out del `QuoteEventNotificationService`
      // sin exponer el payload (SEC-09).
      eventName?: string;
      vendorUserId?: string;
      // US-058 (BE-005): `quote.preferred.toggled` trae el toggle antes/después y el id de la
      // Quote desmarcada (si la hubo). `unmarkedQuoteId` es opcional — sólo se emite cuando el
      // organizer cambia de Quote preferred en el mismo (event, category).
      previousValue?: boolean;
      newValue?: boolean;
      unmarkedQuoteId?: string;
    },
  ): void;
}
