// Puerto de auditoría/observabilidad de Event API (US-095 / OBS-001). El adapter DEBE incluir
// solo metadatos seguros (correlationId, actorId, eventId); NUNCA `notes` completas ni payloads
// privados (SEC-08). Nombres de evento estables per Tech Spec §7 Observability.
export type EventAuditName =
  | 'event.created'
  | 'event.updated'
  | 'event.activated'
  | 'event.cancelled'
  | 'event.access_denied'
  | 'event.validation_failed'
  | 'event.currency_immutable_violation'
  | 'event.lifecycle_transition_rejected';

export interface EventAuditLogger {
  emit(
    event: EventAuditName,
    data: { correlationId?: string; actorId?: string; eventId?: string; reason?: string },
  ): void;
}
