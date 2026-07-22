// US-071 (PB-P2-004 / BE-003). `NotificationLinkResolver` — genera el campo `link`
// server-side por tipo de notificación (D3).
//
// US-068 (PB-P2-005 / BE-002) extendido con la estrategia `quote_request_received`
// → `/vendor/quote-requests/{quoteRequestId}` con batch-lookup contra `quote_requests`.
//
// Contract:
//   * Nunca lanza — errores/payload malformado → `null`.
//   * Estrategias registradas en `LINK_STRATEGY_BY_TYPE`.
//   * `resolveMany(rows)` colecta candidatos por tipo, hace batch-lookup por tipo y
//     resuelve URLs sin N+1.
import type { NotificationLinkEventReader } from '../ports/notification-link-event-reader.js';
import type { NotificationLinkQuoteRequestReader } from '../ports/notification-link-quote-request-reader.js';
import type { NotificationRow } from '../ports/list-notifications.repository.js';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Tipos con estrategia registrada. Otros → `null`. */
export type ResolvableNotificationType = 'task_due_soon' | 'quote_request_received';

const LINK_STRATEGY_BY_TYPE: Record<ResolvableNotificationType, true> = {
  task_due_soon: true,
  quote_request_received: true,
};

function extractUuidField(payload: Record<string, unknown>, key: string): string | null {
  const raw = payload?.[key];
  if (typeof raw !== 'string' || !UUID_REGEX.test(raw)) return null;
  return raw;
}

export interface NotificationLinkResolver {
  resolveMany(rows: NotificationRow[]): Promise<Map<string, string | null>>;
}

export interface BatchNotificationLinkResolverDeps {
  eventReader: NotificationLinkEventReader;
  quoteRequestReader: NotificationLinkQuoteRequestReader;
}

export class BatchNotificationLinkResolver implements NotificationLinkResolver {
  constructor(private readonly deps: BatchNotificationLinkResolverDeps) {}

  async resolveMany(rows: NotificationRow[]): Promise<Map<string, string | null>> {
    const eventIdsPerRow = new Map<string, string | null>();
    const quoteRequestIdsPerRow = new Map<string, string | null>();
    const eventIdsToCheck: string[] = [];
    const quoteRequestIdsToCheck: string[] = [];

    for (const row of rows) {
      if (row.type === 'task_due_soon' && LINK_STRATEGY_BY_TYPE.task_due_soon) {
        const id = extractUuidField(row.payload, 'eventId');
        eventIdsPerRow.set(row.id, id);
        if (id) eventIdsToCheck.push(id);
      } else if (
        row.type === 'quote_request_received' &&
        LINK_STRATEGY_BY_TYPE.quote_request_received
      ) {
        const id = extractUuidField(row.payload, 'quoteRequestId');
        quoteRequestIdsPerRow.set(row.id, id);
        if (id) quoteRequestIdsToCheck.push(id);
      }
    }

    const [existingEvents, existingQrs] = await Promise.all([
      eventIdsToCheck.length > 0
        ? this.deps.eventReader.filterExistingEventIds(Array.from(new Set(eventIdsToCheck)))
        : Promise.resolve(new Set<string>()),
      quoteRequestIdsToCheck.length > 0
        ? this.deps.quoteRequestReader.filterExistingQuoteRequestIds(
            Array.from(new Set(quoteRequestIdsToCheck)),
          )
        : Promise.resolve(new Set<string>()),
    ]);

    const result = new Map<string, string | null>();
    for (const row of rows) {
      if (row.type === 'task_due_soon') {
        const eventId = eventIdsPerRow.get(row.id) ?? null;
        result.set(
          row.id,
          eventId && existingEvents.has(eventId)
            ? `/organizer/events/${eventId}/tasks?range=7d`
            : null,
        );
      } else if (row.type === 'quote_request_received') {
        const qrId = quoteRequestIdsPerRow.get(row.id) ?? null;
        result.set(
          row.id,
          qrId && existingQrs.has(qrId) ? `/vendor/quote-requests/${qrId}` : null,
        );
      } else {
        result.set(row.id, null);
      }
    }
    return result;
  }
}
