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
      // US-061 (BE-004): `budget.committed_exceeds_planned` warn cuando la suma agregada de
      // `BudgetItem.committed` supera `Budget.totalPlanned` tras el confirm del BookingIntent
      // (BR-BUDGET-004 — no bloqueante). Montos como string para preservar precisión decimal.
      budgetId?: string;
      totalCommitted?: string;
      totalPlanned?: string;
      // US-062 (BE-003/BE-006): `budget.committed_underflow_corrected` warn cuando el revert
      // observaría un `committed_before < synced_amount` (situación imposible con integridad
      // presupuestaria normal, pero defensa profunda ante estados corruptos). El `MAX(0, ...)`
      // se aplica sin bloquear. `previousCommitted`/`attemptedSubtraction` como string.
      budgetItemId?: string;
      previousCommitted?: string;
      attemptedSubtraction?: string;
      // US-063 (BE-002/BE-004): `disclaimer.accepted` con `userId` (semánticamente igual a
      // `actorId`, se preserva por compatibilidad con auditores externos que buscan el campo
      // literal del contrato §Observability), `action` = 'create' | 'confirm',
      // `agreementCopyVersion` = versión del copy legal aceptado (BOOKING_DISCLAIMER_COPY_VERSION),
      // y `acceptedAt` en ISO 8601 UTC. Persiste el audit trail legal exigido por FR-BOOKING-006.
      userId?: string;
      action?: string;
      agreementCopyVersion?: string;
      acceptedAt?: string;
      // US-065 (BE-005): `review.published` con `reviewId`, `vendorProfileId`, `eventId`,
      // `organizerUserId`, `rating`. `eventId` ya existía (US-050); se agregan los específicos
      // del dominio Reviews. `organizerUserId` es semánticamente `actorId` — se preserva por
      // paridad con auditores externos que buscan el nombre literal (Tech Spec §14).
      reviewId?: string;
      vendorProfileId?: string;
      organizerUserId?: string;
      rating?: number;
      // US-067 (BE-005): `review.moderated` con `reviewId`, `adminUserId`, `action`
      // (`hide`|`remove`), `fromStatus`, `toStatus`, `adminActionId`. Cumple Tech Spec §14 (5
      // campos requeridos + adminActionId como trazabilidad BR-ADMIN-011). NO se logea el
      // `moderation_reason` — puede contener PII/datos sensibles del contenido reportado (SEC-09).
      adminUserId?: string;
      fromStatus?: string;
      toStatus?: string;
      adminActionId?: string;
      // US-047 (BE-005): `vendor.moderated` con `vendorProfileId`, `adminUserId`, `action`
      // (`approve`|`reject`|`hide`|`unhide`), `fromStatus`, `toStatus`, `fromIsHidden`,
      // `toIsHidden`, `adminActionId`. Cumple Tech Spec §14 (7 campos requeridos + adminActionId
      // como trazabilidad BR-ADMIN-011). NO se logea el `moderation_reason` — puede referirse
      // a contenido reportado sensible (SEC-09; misma técnica que review.moderated).
      fromIsHidden?: boolean;
      toIsHidden?: boolean;
      // US-075 (BE-004..006): `service_category.created` / `updated` / `reactivated` /
      // `soft_deleted`. `code` es el slug de la categoría; `parentId` distingue root
      // vs subcategoría al leer logs sin JOIN. `adminUserId`/`adminActionId` ya
      // existen (chain audit BR-ADMIN-011). NO se logea `name_i18n` ni `reason` —
      // pueden contener texto largo/no sanitizado (SEC-09; paridad review.moderated).
      code?: string;
      parentId?: string | null;
      // US-076 (BE-004..006): `event_type.created` / `updated` / `reactivated` /
      // `soft_deleted`. `eventTypeId` distingue del `serviceCategoryId` en logs cruzados.
      // NO se logea `name_i18n` ni `reason` (SEC-09; paridad US-075).
      eventTypeId?: string;
    },
  ): void;
}
