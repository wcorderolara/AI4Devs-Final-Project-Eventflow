// US-071 (PB-P2-004 / BE-003). `NotificationLinkResolver` — genera el campo `link`
// server-side por tipo de notificación (D3).
//
// Contract:
//   * Nunca lanza — errores/payload malformado → `null`.
//   * Estrategias registradas en un único lugar (`LINK_STRATEGY_BY_TYPE`).
//   * `resolveMany(notifications)` hace batch-lookup a través del `NotificationLinkEventReader`
//     para el tipo `task_due_soon` (único cubierto por US-071), evitando N+1.
//   * Otros tipos: retornan `null` en US-071 (se implementarán en sus US propias).
//
// Formato del link `task_due_soon` (D3):
//   `/organizer/events/{eventId}/tasks?range=7d`
import type { NotificationLinkEventReader } from '../ports/notification-link-event-reader.js';
import type { NotificationRow } from '../ports/list-notifications.repository.js';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Set canónico de tipos con estrategia registrada. Otros → `null` en US-071. */
export type ResolvableNotificationType = 'task_due_soon';

const LINK_STRATEGY_BY_TYPE: Record<ResolvableNotificationType, true> = {
  task_due_soon: true,
};

/**
 * Extrae el `eventId` del payload de una notificación `task_due_soon` si es un UUID.
 * Retorna `null` si el shape del payload es inesperado (defensa en profundidad).
 */
function extractEventIdForTaskDueSoon(payload: Record<string, unknown>): string | null {
  const raw = payload?.['eventId'];
  if (typeof raw !== 'string' || !UUID_REGEX.test(raw)) return null;
  return raw;
}

export interface NotificationLinkResolver {
  /** Resuelve el `link` para una lista de notificaciones (batch). Nunca lanza. */
  resolveMany(rows: NotificationRow[]): Promise<Map<string, string | null>>;
}

export class BatchNotificationLinkResolver implements NotificationLinkResolver {
  constructor(private readonly eventReader: NotificationLinkEventReader) {}

  async resolveMany(rows: NotificationRow[]): Promise<Map<string, string | null>> {
    // Recolectar candidatos por tipo. Sólo `task_due_soon` cubierto en US-071.
    const eventIdsToCheck: string[] = [];
    const perRowEventId = new Map<string, string | null>();

    for (const row of rows) {
      if (row.type === 'task_due_soon' && LINK_STRATEGY_BY_TYPE.task_due_soon) {
        const eventId = extractEventIdForTaskDueSoon(row.payload);
        perRowEventId.set(row.id, eventId);
        if (eventId) eventIdsToCheck.push(eventId);
      } else {
        perRowEventId.set(row.id, null);
      }
    }

    let existing = new Set<string>();
    if (eventIdsToCheck.length > 0) {
      // Dedup para reducir el argumento del `IN (…)`.
      const uniqueIds = Array.from(new Set(eventIdsToCheck));
      existing = await this.eventReader.filterExistingEventIds(uniqueIds);
    }

    const result = new Map<string, string | null>();
    for (const row of rows) {
      const eventId = perRowEventId.get(row.id) ?? null;
      if (row.type === 'task_due_soon' && eventId && existing.has(eventId)) {
        result.set(row.id, `/organizer/events/${eventId}/tasks?range=7d`);
      } else {
        result.set(row.id, null);
      }
    }
    return result;
  }
}
