// US-073 (PB-P2-009 / QA-001) — Unit tests de la extensión del
// `NotificationLinkResolver` para los types vendor `quote_rejected` y
// `quote_expired` (BE-001 / D2).
//
// Cubre:
//   * UT-01 `quote_rejected` con `payload.quoteId` UUID válido → `/vendor/quotes/{id}`.
//   * UT-02 `quote_expired` con `payload.quoteId` UUID válido → `/vendor/quotes/{id}`.
//   * UT-03 fallback null si `payload.quoteId` ausente o no-UUID.
//   * REG-01 callers existentes (`task_due_soon`, `quote_request_received`,
//     `quote_received`, `booking_confirmed`) intactos al mezclar en un batch.
import { describe, expect, it } from 'vitest';
import { BatchNotificationLinkResolver } from '../../src/modules/notifications/application/notification-link-resolver.service.js';
import type { NotificationLinkEventReader } from '../../src/modules/notifications/ports/notification-link-event-reader.js';
import type { NotificationLinkQuoteRequestReader } from '../../src/modules/notifications/ports/notification-link-quote-request-reader.js';
import type { NotificationLinkBookingIntentReader } from '../../src/modules/notifications/ports/notification-link-booking-intent-reader.js';
import type { NotificationRow } from '../../src/modules/notifications/ports/list-notifications.repository.js';

class FakeEventReader implements NotificationLinkEventReader {
  existing = new Set<string>();
  filterExistingEventIds(ids: string[]): Promise<Set<string>> {
    return Promise.resolve(new Set(ids.filter((id) => this.existing.has(id))));
  }
}

class FakeQuoteRequestReader implements NotificationLinkQuoteRequestReader {
  existing = new Set<string>();
  filterExistingQuoteRequestIds(ids: string[]): Promise<Set<string>> {
    return Promise.resolve(new Set(ids.filter((id) => this.existing.has(id))));
  }
}

class FakeBookingIntentReader implements NotificationLinkBookingIntentReader {
  existing = new Set<string>();
  filterExistingBookingIntentIds(ids: string[]): Promise<Set<string>> {
    return Promise.resolve(new Set(ids.filter((id) => this.existing.has(id))));
  }
}

const QUOTE_A = '11111111-1111-4111-8111-111111111111';
const QUOTE_B = '22222222-2222-4222-8222-222222222222';
const EVENT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const QR_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const BOOKING_INTENT_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

function row(overrides: Partial<NotificationRow>): NotificationRow {
  return {
    id: overrides.id ?? 'n1',
    userId: overrides.userId ?? 'u1',
    type: overrides.type ?? 'quote_rejected',
    payload: overrides.payload ?? { quoteId: QUOTE_A },
    status: overrides.status ?? 'unread',
    readAt: overrides.readAt ?? null,
    createdAt: overrides.createdAt ?? new Date('2026-07-22T14:00:00Z'),
  };
}

function buildResolver() {
  const eventReader = new FakeEventReader();
  const quoteRequestReader = new FakeQuoteRequestReader();
  const bookingIntentReader = new FakeBookingIntentReader();
  const resolver = new BatchNotificationLinkResolver({
    eventReader,
    quoteRequestReader,
    bookingIntentReader,
  });
  return { resolver, eventReader, quoteRequestReader, bookingIntentReader };
}

describe('US-073 · NotificationLinkResolver — quote_rejected / quote_expired (BE-001, D2)', () => {
  it('UT-01: quote_rejected con payload.quoteId válido → /vendor/quotes/{id}', async () => {
    const { resolver } = buildResolver();
    const links = await resolver.resolveMany([
      row({ id: 'n1', type: 'quote_rejected', payload: { quoteId: QUOTE_A } }),
    ]);
    expect(links.get('n1')).toBe(`/vendor/quotes/${QUOTE_A}`);
  });

  it('UT-02: quote_expired con payload.quoteId válido → /vendor/quotes/{id}', async () => {
    const { resolver } = buildResolver();
    const links = await resolver.resolveMany([
      row({ id: 'n1', type: 'quote_expired', payload: { quoteId: QUOTE_B } }),
    ]);
    expect(links.get('n1')).toBe(`/vendor/quotes/${QUOTE_B}`);
  });

  it('UT-03a: quote_rejected sin payload.quoteId → null (link=null en el DTO)', async () => {
    const { resolver } = buildResolver();
    const links = await resolver.resolveMany([
      row({ id: 'n1', type: 'quote_rejected', payload: {} }),
    ]);
    expect(links.get('n1')).toBe(null);
  });

  it('UT-03b: quote_expired con payload.quoteId no-UUID → null', async () => {
    const { resolver } = buildResolver();
    const links = await resolver.resolveMany([
      row({ id: 'n1', type: 'quote_expired', payload: { quoteId: 'not-a-uuid' } }),
    ]);
    expect(links.get('n1')).toBe(null);
  });

  it('UT-03c: recipientRole opcional (US-070 D3) se ignora — el link no depende del rol', async () => {
    const { resolver } = buildResolver();
    const links = await resolver.resolveMany([
      row({
        id: 'n1',
        type: 'quote_rejected',
        payload: { quoteId: QUOTE_A, recipientRole: 'organizer' },
      }),
    ]);
    // Aunque el payload traiga recipientRole=organizer (imposible en la práctica
    // por BR-NOTIF-005), el link se construye para vendor porque el emisor es
    // US-054 y sólo apunta al vendor.
    expect(links.get('n1')).toBe(`/vendor/quotes/${QUOTE_A}`);
  });

  it('UT-04: batch mixto con dos types nuevos + null intercalado', async () => {
    const { resolver } = buildResolver();
    const links = await resolver.resolveMany([
      row({ id: 'a', type: 'quote_rejected', payload: { quoteId: QUOTE_A } }),
      row({ id: 'b', type: 'quote_expired', payload: {} }),
      row({ id: 'c', type: 'quote_expired', payload: { quoteId: QUOTE_B } }),
    ]);
    expect(links.get('a')).toBe(`/vendor/quotes/${QUOTE_A}`);
    expect(links.get('b')).toBe(null);
    expect(links.get('c')).toBe(`/vendor/quotes/${QUOTE_B}`);
  });
});

describe('US-073 · NotificationLinkResolver — REG-01 callers existentes intactos', () => {
  it('REG-01a: task_due_soon (US-071) sigue apuntando a organizer con batch-lookup', async () => {
    const { resolver, eventReader } = buildResolver();
    eventReader.existing.add(EVENT_ID);
    const links = await resolver.resolveMany([
      row({ id: 'n1', type: 'task_due_soon', payload: { eventId: EVENT_ID, taskId: 't1' } }),
    ]);
    expect(links.get('n1')).toBe(`/organizer/events/${EVENT_ID}/tasks?range=7d`);
  });

  it('REG-01b: quote_request_received (US-068) sigue apuntando a /vendor/quote-requests/{id}', async () => {
    const { resolver, quoteRequestReader } = buildResolver();
    quoteRequestReader.existing.add(QR_ID);
    const links = await resolver.resolveMany([
      row({
        id: 'n1',
        type: 'quote_request_received',
        payload: { quoteRequestId: QR_ID },
      }),
    ]);
    expect(links.get('n1')).toBe(`/vendor/quote-requests/${QR_ID}`);
  });

  it('REG-01c: quote_received (US-069) sigue apuntando a /organizer/quote-requests/{id}/comparator', async () => {
    const { resolver, quoteRequestReader } = buildResolver();
    quoteRequestReader.existing.add(QR_ID);
    const links = await resolver.resolveMany([
      row({
        id: 'n1',
        type: 'quote_received',
        payload: { quoteRequestId: QR_ID },
      }),
    ]);
    expect(links.get('n1')).toBe(`/organizer/quote-requests/${QR_ID}/comparator`);
  });

  it('REG-01d: booking_confirmed (US-070) con recipientRole=vendor sigue apuntando a /vendor/bookings/{id}', async () => {
    const { resolver, bookingIntentReader } = buildResolver();
    bookingIntentReader.existing.add(BOOKING_INTENT_ID);
    const links = await resolver.resolveMany([
      row({
        id: 'n1',
        type: 'booking_confirmed',
        payload: {
          bookingIntentId: BOOKING_INTENT_ID,
          eventId: EVENT_ID,
          recipientRole: 'vendor',
        },
      }),
    ]);
    expect(links.get('n1')).toBe(`/vendor/bookings/${BOOKING_INTENT_ID}`);
  });

  it('REG-01e: booking_confirmed con recipientRole=organizer sigue apuntando a /organizer/events/{event}/bookings/{intent}', async () => {
    const { resolver, bookingIntentReader } = buildResolver();
    bookingIntentReader.existing.add(BOOKING_INTENT_ID);
    const links = await resolver.resolveMany([
      row({
        id: 'n1',
        type: 'booking_confirmed',
        payload: {
          bookingIntentId: BOOKING_INTENT_ID,
          eventId: EVENT_ID,
          recipientRole: 'organizer',
        },
      }),
    ]);
    expect(links.get('n1')).toBe(
      `/organizer/events/${EVENT_ID}/bookings/${BOOKING_INTENT_ID}`,
    );
  });

  it('REG-01f: batch mixto con TODOS los types (US-071 + US-068 + US-069 + US-070 + US-073) resuelve cada uno correctamente', async () => {
    const { resolver, eventReader, quoteRequestReader, bookingIntentReader } = buildResolver();
    eventReader.existing.add(EVENT_ID);
    quoteRequestReader.existing.add(QR_ID);
    bookingIntentReader.existing.add(BOOKING_INTENT_ID);
    const links = await resolver.resolveMany([
      row({ id: 't7', type: 'task_due_soon', payload: { eventId: EVENT_ID, taskId: 't1' } }),
      row({ id: 'qr', type: 'quote_request_received', payload: { quoteRequestId: QR_ID } }),
      row({ id: 'qs', type: 'quote_received', payload: { quoteRequestId: QR_ID } }),
      row({
        id: 'bc-v',
        type: 'booking_confirmed',
        payload: {
          bookingIntentId: BOOKING_INTENT_ID,
          eventId: EVENT_ID,
          recipientRole: 'vendor',
        },
      }),
      row({
        id: 'bc-o',
        type: 'booking_confirmed',
        payload: {
          bookingIntentId: BOOKING_INTENT_ID,
          eventId: EVENT_ID,
          recipientRole: 'organizer',
        },
      }),
      row({ id: 'qrej', type: 'quote_rejected', payload: { quoteId: QUOTE_A } }),
      row({ id: 'qexp', type: 'quote_expired', payload: { quoteId: QUOTE_B } }),
    ]);
    expect(links.get('t7')).toBe(`/organizer/events/${EVENT_ID}/tasks?range=7d`);
    expect(links.get('qr')).toBe(`/vendor/quote-requests/${QR_ID}`);
    expect(links.get('qs')).toBe(`/organizer/quote-requests/${QR_ID}/comparator`);
    expect(links.get('bc-v')).toBe(`/vendor/bookings/${BOOKING_INTENT_ID}`);
    expect(links.get('bc-o')).toBe(
      `/organizer/events/${EVENT_ID}/bookings/${BOOKING_INTENT_ID}`,
    );
    expect(links.get('qrej')).toBe(`/vendor/quotes/${QUOTE_A}`);
    expect(links.get('qexp')).toBe(`/vendor/quotes/${QUOTE_B}`);
  });
});
