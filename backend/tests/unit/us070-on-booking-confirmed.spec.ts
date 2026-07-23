// US-070 (PB-P2-007 / QA-001 + SEC-001 + QA-003) — Unit tests del
// `OnBookingConfirmedHandler` + regresión del `BatchNotificationLinkResolver`.
//
// Cubre con fakes en memoria:
//   * UT-01 guards globales (status != 'confirmed_intent' / event.ownerId nulo) → skip global.
//   * UT-02 idempotencia por recipient (uno ya existe, otro no).
//   * UT-03 resolución de idioma × recipient (preferredLanguage / event.language / fallback en).
//   * UT-04 payload correcto (5 campos + title/body + recipientRole por recipient).
//   * UT-05 shape del log `email_simulated` con set exacto de claves permitidas (SEC-T-01).
//   * UT-06 dedup self-notification (event.ownerId == vendor.userId → 1 par rol organizer).
//   * UT-07 skip parcial por recipient deactivated/suspended (otro sigue).
//   * SEC-T-02 aislamiento — `Notification.userId ∈ {organizer, vendor}` (nunca otro).
//   * BatchNotificationLinkResolver: nueva estrategia `booking_confirmed` con dispatch por rol
//     (organizer → /organizer/events/.../bookings/... ; vendor → /vendor/bookings/...).
//   * QA-003 regresión: los tipos existentes (`task_due_soon`, `quote_request_received`,
//     `quote_received`) siguen generando el mismo link tras extender el reader.
import { describe, expect, it } from 'vitest';
import type { Prisma } from '@prisma/client';
import {
  OnBookingConfirmedHandler,
  type OnBookingConfirmedInput,
  type OnBookingConfirmedLogger,
  type RecipientLanguagePreferenceReader,
} from '../../src/modules/notifications/application/on-booking-confirmed.handler.js';
import { BatchNotificationLinkResolver } from '../../src/modules/notifications/application/notification-link-resolver.service.js';
import type { NotificationLinkEventReader } from '../../src/modules/notifications/ports/notification-link-event-reader.js';
import type { NotificationLinkQuoteRequestReader } from '../../src/modules/notifications/ports/notification-link-quote-request-reader.js';
import type { NotificationLinkBookingIntentReader } from '../../src/modules/notifications/ports/notification-link-booking-intent-reader.js';
import type { NotificationRow } from '../../src/modules/notifications/ports/list-notifications.repository.js';
import type {
  BookingConfirmedRepositoryOptions,
  CreateBookingConfirmedNotificationInput,
  NotificationBookingConfirmedRepository,
} from '../../src/modules/notifications/ports/notification-booking-confirmed.repository.js';
import type {
  SimulatedBookingConfirmedEmailInput,
  SimulatedBookingConfirmedEmailPort,
} from '../../src/modules/notifications/ports/simulated-booking-confirmed-email.port.js';
import { BOOKING_CONFIRMED_EMAIL_LOG_ALLOWED_KEYS } from '../../src/modules/notifications/infrastructure/logging-simulated-booking-confirmed-email.adapter.js';
import { renderBookingConfirmedTemplate } from '../../src/modules/notifications/i18n/booking-confirmed-templates.js';
import type { SupportedLanguage } from '../../src/shared/constants/languages.js';

class FakeBookingConfirmedRepo implements NotificationBookingConfirmedRepository {
  existsMap = new Map<string, boolean>();
  created: CreateBookingConfirmedNotificationInput[] = [];

  seedExists(userId: string, bookingIntentId: string): void {
    this.existsMap.set(`${userId}::${bookingIntentId}`, true);
  }

  existsBookingConfirmedForRecipient(
    recipientUserId: string,
    bookingIntentId: string,
    _opts?: BookingConfirmedRepositoryOptions,
  ): Promise<boolean> {
    return Promise.resolve(this.existsMap.get(`${recipientUserId}::${bookingIntentId}`) ?? false);
  }

  create(
    input: CreateBookingConfirmedNotificationInput,
    _opts?: BookingConfirmedRepositoryOptions,
  ): Promise<void> {
    this.created.push(input);
    this.existsMap.set(`${input.recipientUserId}::${input.bookingIntentId}`, true);
    return Promise.resolve();
  }
}

class FakeLanguageLookup implements RecipientLanguagePreferenceReader {
  map = new Map<string, SupportedLanguage | null>();
  set(userId: string, lang: SupportedLanguage | null): void {
    this.map.set(userId, lang);
  }
  findPreferredLanguage(userId: string): Promise<SupportedLanguage | null> {
    return Promise.resolve(this.map.get(userId) ?? null);
  }
}

class FakeEmailAdapter implements SimulatedBookingConfirmedEmailPort {
  calls: SimulatedBookingConfirmedEmailInput[] = [];
  logEmail(input: SimulatedBookingConfirmedEmailInput): void {
    this.calls.push(input);
  }
}

interface CapturedLog {
  level: 'info' | 'warn';
  payload: Record<string, unknown>;
}

function makeLogger(): { logger: OnBookingConfirmedLogger; captured: CapturedLog[] } {
  const captured: CapturedLog[] = [];
  return {
    logger: {
      info: (p) => captured.push({ level: 'info', payload: p }),
      warn: (p) => captured.push({ level: 'warn', payload: p }),
    },
    captured,
  };
}

function build() {
  const repo = new FakeBookingConfirmedRepo();
  const lookup = new FakeLanguageLookup();
  const email = new FakeEmailAdapter();
  const { logger, captured } = makeLogger();
  const handler = new OnBookingConfirmedHandler({
    notificationRepo: repo,
    languageLookup: lookup,
    emailAdapter: email,
    logger,
  });
  return { repo, lookup, email, logger, captured, handler };
}

const UUID_INTENT = '11111111-1111-4111-8111-111111111111';
const UUID_QUOTE = '22222222-2222-4222-8222-222222222222';
const UUID_QR = '33333333-3333-4333-8333-333333333333';
const UUID_EVENT = '44444444-4444-4444-8444-444444444444';
const UUID_VENDOR_PROFILE = '55555555-5555-4555-8555-555555555555';
const UUID_ORGANIZER = '66666666-6666-4666-8666-666666666666';
const UUID_VENDOR_USER = '77777777-7777-4777-8777-777777777777';

function baseInput(overrides: Partial<OnBookingConfirmedInput> = {}): OnBookingConfirmedInput {
  const defaults: OnBookingConfirmedInput = {
    bookingIntent: { id: UUID_INTENT, status: 'confirmed_intent' },
    quote: { id: UUID_QUOTE },
    quoteRequest: { id: UUID_QR },
    event: { id: UUID_EVENT, ownerId: UUID_ORGANIZER, language: 'es_LATAM' },
    vendorProfile: { id: UUID_VENDOR_PROFILE, userId: UUID_VENDOR_USER },
    organizerUserStatus: 'active',
    vendorUserStatus: 'active',
    correlationId: 'cid-ut',
    tx: {} as unknown as Prisma.TransactionClient,
  };
  return { ...defaults, ...overrides };
}

describe('US-070 · OnBookingConfirmedHandler', () => {
  describe('UT-01 · guards globales (skip global sin abortar)', () => {
    it('bookingIntent.status != "confirmed_intent" → skip con reason=booking_intent_not_confirmed', async () => {
      const { handler, repo, captured, email } = build();
      await handler.handle(baseInput({ bookingIntent: { id: UUID_INTENT, status: 'pending' } }));
      expect(repo.created).toHaveLength(0);
      expect(email.calls).toHaveLength(0);
      const warn = captured.find((c) => c.level === 'warn');
      expect(warn?.payload.reason).toBe('booking_intent_not_confirmed');
      expect(warn?.payload.bookingIntentStatus).toBe('pending');
    });

    it('event.ownerId vacío → skip global con reason=recipient_id_null', async () => {
      const { handler, repo, captured } = build();
      await handler.handle(
        baseInput({ event: { id: UUID_EVENT, ownerId: '', language: 'es_LATAM' } }),
      );
      expect(repo.created).toHaveLength(0);
      const warn = captured.find((c) => c.level === 'warn');
      expect(warn?.payload.reason).toBe('recipient_id_null');
    });

    it('vendorProfile.userId vacío → skip global con reason=recipient_id_null', async () => {
      const { handler, repo, captured } = build();
      await handler.handle(
        baseInput({ vendorProfile: { id: UUID_VENDOR_PROFILE, userId: '' } }),
      );
      expect(repo.created).toHaveLength(0);
      const warn = captured.find((c) => c.level === 'warn');
      expect(warn?.payload.reason).toBe('recipient_id_null');
    });
  });

  describe('UT-02 · idempotencia por recipient', () => {
    it('organizer ya emitido + vendor pendiente → sólo emite al vendor', async () => {
      const { handler, repo, email, captured } = build();
      repo.seedExists(UUID_ORGANIZER, UUID_INTENT);
      await handler.handle(baseInput());
      // Sólo el vendor recibe (2 filas: in_app + email_simulated).
      expect(repo.created).toHaveLength(2);
      expect(repo.created.every((n) => n.recipientUserId === UUID_VENDOR_USER)).toBe(true);
      expect(email.calls).toHaveLength(1);
      expect(email.calls[0]?.toUserId).toBe(UUID_VENDOR_USER);
      // Log info del skip del organizer.
      expect(
        captured.find(
          (c) =>
            c.payload.event === 'notif.bookingConfirmed.idempotent_skip' &&
            c.payload.recipientUserId === UUID_ORGANIZER,
        ),
      ).toBeDefined();
    });

    it('ambos ya emitidos → skip completo (0 filas nuevas)', async () => {
      const { handler, repo, email } = build();
      repo.seedExists(UUID_ORGANIZER, UUID_INTENT);
      repo.seedExists(UUID_VENDOR_USER, UUID_INTENT);
      await handler.handle(baseInput());
      expect(repo.created).toHaveLength(0);
      expect(email.calls).toHaveLength(0);
    });
  });

  describe('UT-03 · resolución de idioma × recipient (fallback ladder D5)', () => {
    it('preferredLanguage: organizer=pt, vendor=en → languageCode por recipient', async () => {
      const { handler, repo, lookup } = build();
      lookup.set(UUID_ORGANIZER, 'pt');
      lookup.set(UUID_VENDOR_USER, 'en');
      await handler.handle(baseInput());
      const organizerRows = repo.created.filter((n) => n.recipientUserId === UUID_ORGANIZER);
      const vendorRows = repo.created.filter((n) => n.recipientUserId === UUID_VENDOR_USER);
      expect(organizerRows.every((n) => n.languageCode === 'pt')).toBe(true);
      expect(vendorRows.every((n) => n.languageCode === 'en')).toBe(true);
    });

    it('preferredLanguage=null + event.language=es_LATAM → fallback es-LATAM (ambos)', async () => {
      const { handler, repo } = build();
      await handler.handle(baseInput());
      expect(repo.created.every((n) => n.languageCode === 'es-LATAM')).toBe(true);
    });

    it('preferredLanguage=null + event.language desconocido → fallback final en', async () => {
      const { handler, repo } = build();
      await handler.handle(
        baseInput({ event: { id: UUID_EVENT, ownerId: UUID_ORGANIZER, language: 'zz_UNSUPPORTED' } }),
      );
      expect(repo.created.every((n) => n.languageCode === 'en')).toBe(true);
    });
  });

  describe('UT-04 · payload correcto por recipient', () => {
    it('emite 4 filas (2 organizer + 2 vendor) con payload rico y recipientRole por recipient', async () => {
      const { handler, repo } = build();
      await handler.handle(baseInput());
      expect(repo.created).toHaveLength(4);

      const organizerRows = repo.created.filter((n) => n.recipientUserId === UUID_ORGANIZER);
      const vendorRows = repo.created.filter((n) => n.recipientUserId === UUID_VENDOR_USER);
      expect(organizerRows).toHaveLength(2);
      expect(vendorRows).toHaveLength(2);

      const organizerExpected = renderBookingConfirmedTemplate('organizer', 'es-LATAM');
      for (const n of organizerRows) {
        expect(n).toMatchObject({
          recipientRole: 'organizer',
          languageCode: 'es-LATAM',
          bookingIntentId: UUID_INTENT,
          quoteId: UUID_QUOTE,
          quoteRequestId: UUID_QR,
          eventId: UUID_EVENT,
          vendorProfileId: UUID_VENDOR_PROFILE,
          title: organizerExpected.subject,
          body: organizerExpected.body,
        });
      }
      const vendorExpected = renderBookingConfirmedTemplate('vendor', 'es-LATAM');
      for (const n of vendorRows) {
        expect(n).toMatchObject({
          recipientRole: 'vendor',
          title: vendorExpected.subject,
          body: vendorExpected.body,
        });
      }
      expect(
        repo.created.map((n) => `${n.recipientUserId}:${n.channel}`).sort(),
      ).toEqual(
        [
          `${UUID_ORGANIZER}:in_app`,
          `${UUID_ORGANIZER}:email_simulated`,
          `${UUID_VENDOR_USER}:in_app`,
          `${UUID_VENDOR_USER}:email_simulated`,
        ].sort(),
      );
    });
  });

  describe('UT-05 / SEC-T-01 · log estructurado sin PII', () => {
    it('emite EXACTAMENTE las claves permitidas por recipient — sin email/displayName/quote total/breakdown', async () => {
      const { handler, email } = build();
      await handler.handle(baseInput());
      expect(email.calls).toHaveLength(2);
      const call = email.calls[0]!;
      const inputKeys = Object.keys(call).sort();
      expect(inputKeys).toEqual(
        [
          'toUserId',
          'recipientRole',
          'bookingIntentId',
          'quoteId',
          'quoteRequestId',
          'eventId',
          'vendorProfileId',
          'language',
          'correlationId',
        ].sort(),
      );
      expect(BOOKING_CONFIRMED_EMAIL_LOG_ALLOWED_KEYS).toContain('subject');
      expect(BOOKING_CONFIRMED_EMAIL_LOG_ALLOWED_KEYS).toContain('body');
      // Claves prohibidas expresamente por SEC-02:
      for (const forbidden of [
        'email',
        'displayName',
        'quoteTotal',
        'totalPrice',
        'breakdown',
        'brief',
        'vendorName',
        'eventNotes',
      ]) {
        expect(BOOKING_CONFIRMED_EMAIL_LOG_ALLOWED_KEYS).not.toContain(forbidden);
      }
    });
  });

  describe('UT-06 · dedup self-notification (D7)', () => {
    it('event.ownerId == vendor.userId → 1 par de Notification con rol organizer + 1 [EMAIL]', async () => {
      const { handler, repo, email, captured } = build();
      const SAME_USER = UUID_ORGANIZER;
      await handler.handle(
        baseInput({
          event: { id: UUID_EVENT, ownerId: SAME_USER, language: 'es_LATAM' },
          vendorProfile: { id: UUID_VENDOR_PROFILE, userId: SAME_USER },
        }),
      );
      expect(repo.created).toHaveLength(2);
      expect(repo.created.every((n) => n.recipientUserId === SAME_USER)).toBe(true);
      expect(repo.created.every((n) => n.recipientRole === 'organizer')).toBe(true);
      expect(email.calls).toHaveLength(1);
      expect(
        captured.find((c) => c.payload.event === 'notif.bookingConfirmed.self_notification'),
      ).toBeDefined();
    });
  });

  describe('UT-07 · skip parcial por recipient deactivated (AC-07 EC-04)', () => {
    it('organizer deactivated + vendor active → sólo vendor recibe', async () => {
      const { handler, repo, email, captured } = build();
      await handler.handle(
        baseInput({ organizerUserStatus: 'deactivated', vendorUserStatus: 'active' }),
      );
      expect(repo.created).toHaveLength(2);
      expect(repo.created.every((n) => n.recipientUserId === UUID_VENDOR_USER)).toBe(true);
      expect(email.calls).toHaveLength(1);
      const warn = captured.find(
        (c) =>
          c.payload.event === 'notif.bookingConfirmed.skipped' &&
          c.payload.recipientRole === 'organizer',
      );
      expect(warn?.payload.reason).toBe('recipient_deactivated');
    });

    it('organizer active + vendor suspended → sólo organizer recibe', async () => {
      const { handler, repo, email } = build();
      await handler.handle(
        baseInput({ organizerUserStatus: 'active', vendorUserStatus: 'suspended' }),
      );
      expect(repo.created).toHaveLength(2);
      expect(repo.created.every((n) => n.recipientUserId === UUID_ORGANIZER)).toBe(true);
      expect(email.calls).toHaveLength(1);
    });

    it('organizer null (user inexistente) → skip parcial organizer; vendor sigue', async () => {
      const { handler, repo, captured } = build();
      await handler.handle(
        baseInput({ organizerUserStatus: null, vendorUserStatus: 'active' }),
      );
      expect(repo.created).toHaveLength(2);
      expect(repo.created.every((n) => n.recipientUserId === UUID_VENDOR_USER)).toBe(true);
      expect(
        captured.find(
          (c) =>
            c.payload.event === 'notif.bookingConfirmed.skipped' &&
            c.payload.reason === 'recipient_deactivated' &&
            c.payload.recipientRole === 'organizer',
        ),
      ).toBeDefined();
    });
  });

  describe('SEC-T-02 · aislamiento BR-NOTIF-005', () => {
    it('Notification.userId siempre ∈ {event.ownerId, vendor.userId} — nunca otro', async () => {
      const { handler, repo } = build();
      await handler.handle(baseInput());
      for (const n of repo.created) {
        expect([UUID_ORGANIZER, UUID_VENDOR_USER]).toContain(n.recipientUserId);
      }
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BatchNotificationLinkResolver — extensión US-070 (BE-002) + QA-003 regresión
// ─────────────────────────────────────────────────────────────────────────────

class FakeEventReader implements NotificationLinkEventReader {
  existing = new Set<string>();
  filterExistingEventIds(ids: string[]): Promise<Set<string>> {
    return Promise.resolve(new Set(ids.filter((id) => this.existing.has(id))));
  }
}

class FakeQrReader implements NotificationLinkQuoteRequestReader {
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

describe('US-070 · BatchNotificationLinkResolver (extensión + regresión)', () => {
  function makeResolver(): {
    resolver: BatchNotificationLinkResolver;
    eventReader: FakeEventReader;
    qrReader: FakeQrReader;
    biReader: FakeBookingIntentReader;
  } {
    const eventReader = new FakeEventReader();
    const qrReader = new FakeQrReader();
    const biReader = new FakeBookingIntentReader();
    const resolver = new BatchNotificationLinkResolver({
      eventReader,
      quoteRequestReader: qrReader,
      bookingIntentReader: biReader,
    });
    return { resolver, eventReader, qrReader, biReader };
  }

  it('resolveMany: booking_confirmed + role=organizer + BI existente → /organizer/events/{eventId}/bookings/{intentId}', async () => {
    const { resolver, biReader } = makeResolver();
    biReader.existing.add(UUID_INTENT);
    const row: NotificationRow = {
      id: 'n1',
      userId: UUID_ORGANIZER,
      type: 'booking_confirmed',
      payload: {
        channel: 'in_app',
        recipientRole: 'organizer',
        bookingIntentId: UUID_INTENT,
        eventId: UUID_EVENT,
      },
      status: 'unread',
      readAt: null,
      createdAt: new Date(),
    };
    const result = await resolver.resolveMany([row]);
    expect(result.get('n1')).toBe(
      `/organizer/events/${UUID_EVENT}/bookings/${UUID_INTENT}`,
    );
  });

  it('resolveMany: booking_confirmed + role=vendor + BI existente → /vendor/bookings/{intentId}', async () => {
    const { resolver, biReader } = makeResolver();
    biReader.existing.add(UUID_INTENT);
    const row: NotificationRow = {
      id: 'n1',
      userId: UUID_VENDOR_USER,
      type: 'booking_confirmed',
      payload: {
        channel: 'in_app',
        recipientRole: 'vendor',
        bookingIntentId: UUID_INTENT,
        eventId: UUID_EVENT,
      },
      status: 'unread',
      readAt: null,
      createdAt: new Date(),
    };
    const result = await resolver.resolveMany([row]);
    expect(result.get('n1')).toBe(`/vendor/bookings/${UUID_INTENT}`);
  });

  it('resolveMany: booking_confirmed con BI inexistente → link=null (fallback EC-03)', async () => {
    const { resolver } = makeResolver();
    const row: NotificationRow = {
      id: 'n1',
      userId: UUID_ORGANIZER,
      type: 'booking_confirmed',
      payload: {
        channel: 'in_app',
        recipientRole: 'organizer',
        bookingIntentId: UUID_INTENT,
        eventId: UUID_EVENT,
      },
      status: 'unread',
      readAt: null,
      createdAt: new Date(),
    };
    const result = await resolver.resolveMany([row]);
    expect(result.get('n1')).toBe(null);
  });

  it('resolveMany: booking_confirmed sin recipientRole en payload → link=null (defensa)', async () => {
    const { resolver, biReader } = makeResolver();
    biReader.existing.add(UUID_INTENT);
    const row: NotificationRow = {
      id: 'n1',
      userId: UUID_ORGANIZER,
      type: 'booking_confirmed',
      payload: {
        channel: 'in_app',
        bookingIntentId: UUID_INTENT,
        eventId: UUID_EVENT,
      },
      status: 'unread',
      readAt: null,
      createdAt: new Date(),
    };
    const result = await resolver.resolveMany([row]);
    expect(result.get('n1')).toBe(null);
  });

  it('resolveMany: booking_confirmed organizer sin eventId en payload → link=null (defensa)', async () => {
    const { resolver, biReader } = makeResolver();
    biReader.existing.add(UUID_INTENT);
    const row: NotificationRow = {
      id: 'n1',
      userId: UUID_ORGANIZER,
      type: 'booking_confirmed',
      payload: {
        channel: 'in_app',
        recipientRole: 'organizer',
        bookingIntentId: UUID_INTENT,
      },
      status: 'unread',
      readAt: null,
      createdAt: new Date(),
    };
    const result = await resolver.resolveMany([row]);
    expect(result.get('n1')).toBe(null);
  });

  // QA-003: regresión — la nueva firma con `bookingIntentReader` no altera los links
  // existentes de US-068/US-069/US-071.
  it('QA-003 regresión: task_due_soon sigue generando /organizer/events/{id}/tasks?range=7d', async () => {
    const { resolver, eventReader } = makeResolver();
    eventReader.existing.add(UUID_EVENT);
    const row: NotificationRow = {
      id: 'n1',
      userId: UUID_ORGANIZER,
      type: 'task_due_soon',
      payload: {
        channel: 'in_app',
        eventId: UUID_EVENT,
        taskId: '00000000-0000-0000-0000-000000000000',
      },
      status: 'unread',
      readAt: null,
      createdAt: new Date(),
    };
    const result = await resolver.resolveMany([row]);
    expect(result.get('n1')).toBe(`/organizer/events/${UUID_EVENT}/tasks?range=7d`);
  });

  it('QA-003 regresión: quote_request_received sigue generando /vendor/quote-requests/{id}', async () => {
    const { resolver, qrReader } = makeResolver();
    qrReader.existing.add(UUID_QR);
    const row: NotificationRow = {
      id: 'n1',
      userId: UUID_VENDOR_USER,
      type: 'quote_request_received',
      payload: { channel: 'in_app', quoteRequestId: UUID_QR, eventId: UUID_EVENT },
      status: 'unread',
      readAt: null,
      createdAt: new Date(),
    };
    const result = await resolver.resolveMany([row]);
    expect(result.get('n1')).toBe(`/vendor/quote-requests/${UUID_QR}`);
  });

  it('QA-003 regresión: quote_received sigue generando /organizer/quote-requests/{id}/comparator', async () => {
    const { resolver, qrReader } = makeResolver();
    qrReader.existing.add(UUID_QR);
    const row: NotificationRow = {
      id: 'n1',
      userId: UUID_ORGANIZER,
      type: 'quote_received',
      payload: {
        channel: 'in_app',
        quoteId: UUID_QUOTE,
        quoteRequestId: UUID_QR,
        eventId: UUID_EVENT,
      },
      status: 'unread',
      readAt: null,
      createdAt: new Date(),
    };
    const result = await resolver.resolveMany([row]);
    expect(result.get('n1')).toBe(`/organizer/quote-requests/${UUID_QR}/comparator`);
  });

  it('QA-003 regresión: mezcla de los 4 types resuelve independientemente en el mismo batch', async () => {
    const { resolver, eventReader, qrReader, biReader } = makeResolver();
    eventReader.existing.add(UUID_EVENT);
    qrReader.existing.add(UUID_QR);
    biReader.existing.add(UUID_INTENT);
    const rows: NotificationRow[] = [
      {
        id: 't7',
        userId: UUID_ORGANIZER,
        type: 'task_due_soon',
        payload: { channel: 'in_app', eventId: UUID_EVENT, taskId: '00000000-0000-0000-0000-000000000000' },
        status: 'unread',
        readAt: null,
        createdAt: new Date(),
      },
      {
        id: 'qrr',
        userId: UUID_VENDOR_USER,
        type: 'quote_request_received',
        payload: { channel: 'in_app', quoteRequestId: UUID_QR, eventId: UUID_EVENT },
        status: 'unread',
        readAt: null,
        createdAt: new Date(),
      },
      {
        id: 'qr',
        userId: UUID_ORGANIZER,
        type: 'quote_received',
        payload: {
          channel: 'in_app',
          quoteId: UUID_QUOTE,
          quoteRequestId: UUID_QR,
          eventId: UUID_EVENT,
        },
        status: 'unread',
        readAt: null,
        createdAt: new Date(),
      },
      {
        id: 'bc-o',
        userId: UUID_ORGANIZER,
        type: 'booking_confirmed',
        payload: {
          channel: 'in_app',
          recipientRole: 'organizer',
          bookingIntentId: UUID_INTENT,
          eventId: UUID_EVENT,
        },
        status: 'unread',
        readAt: null,
        createdAt: new Date(),
      },
      {
        id: 'bc-v',
        userId: UUID_VENDOR_USER,
        type: 'booking_confirmed',
        payload: {
          channel: 'in_app',
          recipientRole: 'vendor',
          bookingIntentId: UUID_INTENT,
          eventId: UUID_EVENT,
        },
        status: 'unread',
        readAt: null,
        createdAt: new Date(),
      },
    ];
    const result = await resolver.resolveMany(rows);
    expect(result.get('t7')).toBe(`/organizer/events/${UUID_EVENT}/tasks?range=7d`);
    expect(result.get('qrr')).toBe(`/vendor/quote-requests/${UUID_QR}`);
    expect(result.get('qr')).toBe(`/organizer/quote-requests/${UUID_QR}/comparator`);
    expect(result.get('bc-o')).toBe(
      `/organizer/events/${UUID_EVENT}/bookings/${UUID_INTENT}`,
    );
    expect(result.get('bc-v')).toBe(`/vendor/bookings/${UUID_INTENT}`);
  });
});
