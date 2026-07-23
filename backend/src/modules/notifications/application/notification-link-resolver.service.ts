// US-071 (PB-P2-004 / BE-003). `NotificationLinkResolver` — genera el campo `link`
// server-side por tipo de notificación (D3).
//
// US-068 (PB-P2-005 / BE-002) extendido con la estrategia `quote_request_received`
// → `/vendor/quote-requests/{quoteRequestId}` con batch-lookup contra `quote_requests`.
// US-069 (PB-P2-006 / BE-002) extendido con la estrategia `quote_received`
// → `/organizer/quote-requests/{quoteRequestId}/comparator` con batch-lookup
// reutilizando el mismo `NotificationLinkQuoteRequestReader` (el `quoteRequestId`
// viaja en `payload` para ambos types).
// US-070 (PB-P2-007 / BE-002) extendido con la estrategia `booking_confirmed` con
// dispatch por rol (D3): organizer → `/organizer/events/{eventId}/bookings/{bookingIntentId}`;
// vendor → `/vendor/bookings/{bookingIntentId}`. El `recipientRole` viaja en
// `payload` (persistido por el handler al INSERT) — la firma de `resolveMany`
// permanece retrocompatible con US-068/US-069/US-071 (los callers pasan `rows`
// sin contexto adicional). Batch-lookup contra `booking_intents` via
// `NotificationLinkBookingIntentReader` dedicado (paridad con QR reader de US-068).
//
// US-073 (PB-P2-009 / BE-001) extendido con las estrategias `quote_rejected` y
// `quote_expired` (D2): ambas apuntan a `/vendor/quotes/{payload.quoteId}` y
// retornan `null` si `payload.quoteId` es inválido o ausente. Sin batch-lookup
// contra `quotes` (tech spec §7: `TODO: opcionalmente verificar existencia` —
// mantenido opcional; el detalle de `/vendor/quotes/{id}` maneja 404 downstream).
// El parámetro `recipientRole` del payload (US-070 D3) se ignora — el receptor
// es siempre vendor.
//
// Contract:
//   * Nunca lanza — errores/payload malformado → `null`.
//   * Estrategias registradas en `LINK_STRATEGY_BY_TYPE`.
//   * `resolveMany(rows)` colecta candidatos por tipo, hace batch-lookup por tipo y
//     resuelve URLs sin N+1.
import type { NotificationLinkEventReader } from '../ports/notification-link-event-reader.js';
import type { NotificationLinkQuoteRequestReader } from '../ports/notification-link-quote-request-reader.js';
import type { NotificationLinkBookingIntentReader } from '../ports/notification-link-booking-intent-reader.js';
import type { NotificationRow } from '../ports/list-notifications.repository.js';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Tipos con estrategia registrada. Otros → `null`. */
export type ResolvableNotificationType =
  | 'task_due_soon'
  | 'quote_request_received'
  | 'quote_received'
  | 'booking_confirmed'
  | 'quote_rejected'
  | 'quote_expired';

const LINK_STRATEGY_BY_TYPE: Record<ResolvableNotificationType, true> = {
  task_due_soon: true,
  quote_request_received: true,
  quote_received: true,
  booking_confirmed: true,
  quote_rejected: true,
  quote_expired: true,
};

function extractUuidField(payload: Record<string, unknown>, key: string): string | null {
  const raw = payload?.[key];
  if (typeof raw !== 'string' || !UUID_REGEX.test(raw)) return null;
  return raw;
}

function extractRecipientRole(
  payload: Record<string, unknown>,
): 'organizer' | 'vendor' | null {
  const raw = payload?.['recipientRole'];
  return raw === 'organizer' || raw === 'vendor' ? raw : null;
}

export interface NotificationLinkResolver {
  resolveMany(rows: NotificationRow[]): Promise<Map<string, string | null>>;
}

export interface BatchNotificationLinkResolverDeps {
  eventReader: NotificationLinkEventReader;
  quoteRequestReader: NotificationLinkQuoteRequestReader;
  bookingIntentReader: NotificationLinkBookingIntentReader;
}

interface BookingConfirmedRowState {
  bookingIntentId: string | null;
  eventId: string | null;
  role: 'organizer' | 'vendor' | null;
}

export class BatchNotificationLinkResolver implements NotificationLinkResolver {
  constructor(private readonly deps: BatchNotificationLinkResolverDeps) {}

  async resolveMany(rows: NotificationRow[]): Promise<Map<string, string | null>> {
    const eventIdsPerRow = new Map<string, string | null>();
    const quoteRequestIdsPerRow = new Map<string, string | null>();
    const bookingConfirmedState = new Map<string, BookingConfirmedRowState>();
    // US-073 (BE-001): estados `quote_rejected` / `quote_expired` sin batch-lookup.
    // Ambos comparten el mismo path `/vendor/quotes/{quoteId}` — se resuelven
    // localmente por fila.
    const vendorQuoteIdsPerRow = new Map<string, string | null>();
    const eventIdsToCheck: string[] = [];
    const quoteRequestIdsToCheck: string[] = [];
    const bookingIntentIdsToCheck: string[] = [];

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
      } else if (
        row.type === 'quote_received' &&
        LINK_STRATEGY_BY_TYPE.quote_received
      ) {
        // US-069 (BE-002): mismo `payload.quoteRequestId` que `quote_request_received`
        // — se reutiliza el mismo batch-lookup contra `quote_requests`.
        const id = extractUuidField(row.payload, 'quoteRequestId');
        quoteRequestIdsPerRow.set(row.id, id);
        if (id) quoteRequestIdsToCheck.push(id);
      } else if (
        row.type === 'booking_confirmed' &&
        LINK_STRATEGY_BY_TYPE.booking_confirmed
      ) {
        // US-070 (BE-002): dispatch por rol vía `payload.recipientRole` (persistido
        // al INSERT por el handler). Batch-lookup contra `booking_intents`.
        const state: BookingConfirmedRowState = {
          bookingIntentId: extractUuidField(row.payload, 'bookingIntentId'),
          eventId: extractUuidField(row.payload, 'eventId'),
          role: extractRecipientRole(row.payload),
        };
        bookingConfirmedState.set(row.id, state);
        if (state.bookingIntentId) bookingIntentIdsToCheck.push(state.bookingIntentId);
      } else if (
        (row.type === 'quote_rejected' && LINK_STRATEGY_BY_TYPE.quote_rejected) ||
        (row.type === 'quote_expired' && LINK_STRATEGY_BY_TYPE.quote_expired)
      ) {
        // US-073 (BE-001): `/vendor/quotes/{payload.quoteId}` (D2). Sin
        // batch-lookup contra `quotes` (tech spec §7 — `TODO` opcional).
        vendorQuoteIdsPerRow.set(row.id, extractUuidField(row.payload, 'quoteId'));
      }
    }

    const [existingEvents, existingQrs, existingBookingIntents] = await Promise.all([
      eventIdsToCheck.length > 0
        ? this.deps.eventReader.filterExistingEventIds(Array.from(new Set(eventIdsToCheck)))
        : Promise.resolve(new Set<string>()),
      quoteRequestIdsToCheck.length > 0
        ? this.deps.quoteRequestReader.filterExistingQuoteRequestIds(
            Array.from(new Set(quoteRequestIdsToCheck)),
          )
        : Promise.resolve(new Set<string>()),
      bookingIntentIdsToCheck.length > 0
        ? this.deps.bookingIntentReader.filterExistingBookingIntentIds(
            Array.from(new Set(bookingIntentIdsToCheck)),
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
      } else if (row.type === 'quote_received') {
        const qrId = quoteRequestIdsPerRow.get(row.id) ?? null;
        result.set(
          row.id,
          qrId && existingQrs.has(qrId)
            ? `/organizer/quote-requests/${qrId}/comparator`
            : null,
        );
      } else if (row.type === 'quote_rejected' || row.type === 'quote_expired') {
        // US-073 (BE-001): `/vendor/quotes/{quoteId}` (D2). `null` si `quoteId`
        // ausente o no UUID. El `recipientRole` opcional (US-070 D3) se ignora.
        const quoteId = vendorQuoteIdsPerRow.get(row.id) ?? null;
        result.set(row.id, quoteId ? `/vendor/quotes/${quoteId}` : null);
      } else if (row.type === 'booking_confirmed') {
        const state = bookingConfirmedState.get(row.id);
        if (
          !state ||
          !state.bookingIntentId ||
          !state.role ||
          !existingBookingIntents.has(state.bookingIntentId)
        ) {
          result.set(row.id, null);
          continue;
        }
        if (state.role === 'organizer') {
          // Requiere también `eventId` para el path del organizer.
          if (!state.eventId) {
            result.set(row.id, null);
            continue;
          }
          result.set(
            row.id,
            `/organizer/events/${state.eventId}/bookings/${state.bookingIntentId}`,
          );
        } else {
          result.set(row.id, `/vendor/bookings/${state.bookingIntentId}`);
        }
      } else {
        result.set(row.id, null);
      }
    }
    return result;
  }
}
