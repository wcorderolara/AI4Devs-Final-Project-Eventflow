// Adapter — EventAuditLogger estructurado (US-095 / OBS-001). Emite eventos de Event API con
// correlationId/actorId/eventId. No incluye `notes` ni payloads privados (SEC-08).
import type {
  EventAuditLogger,
  EventAuditName,
  EventLanguageSource,
} from '../ports/event-audit-logger.js';
import { logger } from '../../../shared/infrastructure/logger/index.js';

export class StructuredEventAuditLogger implements EventAuditLogger {
  emit(
    event: EventAuditName,
    data: {
      correlationId?: string;
      actorId?: string;
      eventId?: string;
      reason?: string;
      languageSource?: EventLanguageSource;
      fromLanguage?: string;
      toLanguage?: string;
      currentStatus?: string;
    },
  ): void {
    logger.info({
      event,
      correlationId: data.correlationId,
      actorId: data.actorId,
      eventId: data.eventId,
      reason: data.reason,
      languageSource: data.languageSource,
      fromLanguage: data.fromLanguage,
      toLanguage: data.toLanguage,
      currentStatus: data.currentStatus,
    });
  }
}
