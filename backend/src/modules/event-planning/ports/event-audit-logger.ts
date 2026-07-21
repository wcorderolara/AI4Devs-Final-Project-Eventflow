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
  | 'event.lifecycle_transition_rejected'
  | 'event.deleted'
  | 'event.delete_rejected'
  // US-082 (PB-P1-047): idioma del evento resuelto en creación y cambios en update.
  | 'event.language.set'
  | 'event.language.changed'
  | 'event.language.not_editable_violation';

/** Origen del `languageCode` al crear un evento (US-082 D3). */
export type EventLanguageSource = 'body' | 'inherited' | 'default';

export interface EventAuditLogger {
  emit(
    event: EventAuditName,
    data: {
      correlationId?: string;
      actorId?: string;
      eventId?: string;
      reason?: string;
      /** US-082: origen de resolución del `languageCode` al crear el evento. */
      languageSource?: EventLanguageSource;
      /** US-082: valor previo (update) o resuelto (create) del `languageCode`. */
      fromLanguage?: string;
      /** US-082: valor nuevo (update) o resuelto (create) del `languageCode`. */
      toLanguage?: string;
      /** US-082: estado del evento al detectar la violación de inmutabilidad. */
      currentStatus?: string;
    },
  ): void;
}
