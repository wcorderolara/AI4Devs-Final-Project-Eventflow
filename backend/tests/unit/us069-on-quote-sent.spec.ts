// US-069 (PB-P2-006 / QA-001 + SEC-001) — Unit tests del `OnQuoteSentHandler`.
//
// Cubre con fakes en memoria:
//   * UT-01 guards (quote no-`sent` / owner_id null / owner deactivated) → skip + warn.
//   * UT-02 idempotencia → skip silencioso.
//   * UT-03 resolución de idioma (User.preferredLanguage / event.language / fallback `en`).
//   * UT-04 payload y templating correctos.
//   * UT-05 shape del log `email_simulated` con set exacto de claves permitidas (SEC-T-01).
//   * SEC-T-02 aislamiento — `Notification.userId === event.ownerId` (nunca otro).
//   * BatchNotificationLinkResolver: nueva estrategia `quote_received` genera
//     `/organizer/quote-requests/{quoteRequestId}/comparator` con lookup contra
//     QuoteRequestReader.
import { describe, expect, it } from 'vitest';
import type { Prisma } from '@prisma/client';
import {
  OnQuoteSentHandler,
  type OnQuoteSentInput,
  type OnQuoteSentLogger,
  type OrganizerLanguagePreferenceReader,
} from '../../src/modules/notifications/application/on-quote-sent.handler.js';
import { BatchNotificationLinkResolver } from '../../src/modules/notifications/application/notification-link-resolver.service.js';
import type { NotificationLinkEventReader } from '../../src/modules/notifications/ports/notification-link-event-reader.js';
import type { NotificationLinkQuoteRequestReader } from '../../src/modules/notifications/ports/notification-link-quote-request-reader.js';
import type { NotificationRow } from '../../src/modules/notifications/ports/list-notifications.repository.js';
import type {
  CreateQuoteReceivedNotificationInput,
  NotificationQuoteReceivedRepository,
  QuoteReceivedRepositoryOptions,
} from '../../src/modules/notifications/ports/notification-quote-received.repository.js';
import type {
  SimulatedQuoteReceivedEmailInput,
  SimulatedQuoteReceivedEmailPort,
} from '../../src/modules/notifications/ports/simulated-quote-received-email.port.js';
import { QUOTE_RECEIVED_EMAIL_LOG_ALLOWED_KEYS } from '../../src/modules/notifications/infrastructure/logging-simulated-quote-received-email.adapter.js';
import { renderQuoteReceivedTemplate } from '../../src/modules/notifications/i18n/quote-received-templates.js';
import type { SupportedLanguage } from '../../src/shared/constants/languages.js';

class FakeQuoteRepo implements NotificationQuoteReceivedRepository {
  existsMap = new Map<string, boolean>();
  created: CreateQuoteReceivedNotificationInput[] = [];

  seedExists(organizerUserId: string, quoteId: string): void {
    this.existsMap.set(`${organizerUserId}::${quoteId}`, true);
  }

  existsQuoteReceivedForQuote(
    organizerUserId: string,
    quoteId: string,
    _opts?: QuoteReceivedRepositoryOptions,
  ): Promise<boolean> {
    return Promise.resolve(this.existsMap.get(`${organizerUserId}::${quoteId}`) ?? false);
  }

  create(
    input: CreateQuoteReceivedNotificationInput,
    _opts?: QuoteReceivedRepositoryOptions,
  ): Promise<void> {
    this.created.push(input);
    this.existsMap.set(`${input.organizerUserId}::${input.quoteId}`, true);
    return Promise.resolve();
  }
}

class FakeLanguageLookup implements OrganizerLanguagePreferenceReader {
  map = new Map<string, SupportedLanguage | null>();
  set(userId: string, lang: SupportedLanguage | null): void {
    this.map.set(userId, lang);
  }
  findPreferredLanguage(userId: string): Promise<SupportedLanguage | null> {
    return Promise.resolve(this.map.get(userId) ?? null);
  }
}

class FakeEmailAdapter implements SimulatedQuoteReceivedEmailPort {
  calls: SimulatedQuoteReceivedEmailInput[] = [];
  logEmail(input: SimulatedQuoteReceivedEmailInput): void {
    this.calls.push(input);
  }
}

interface CapturedLog {
  level: 'info' | 'warn';
  payload: Record<string, unknown>;
}

function makeLogger(): { logger: OnQuoteSentLogger; captured: CapturedLog[] } {
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
  const repo = new FakeQuoteRepo();
  const lookup = new FakeLanguageLookup();
  const email = new FakeEmailAdapter();
  const { logger, captured } = makeLogger();
  const handler = new OnQuoteSentHandler({
    notificationRepo: repo,
    languageLookup: lookup,
    emailAdapter: email,
    logger,
  });
  return { repo, lookup, email, logger, captured, handler };
}

const UUID_QUOTE = '11111111-1111-4111-8111-111111111111';
const UUID_QR = '22222222-2222-4222-8222-222222222222';
const UUID_EVENT = '33333333-3333-4333-8333-333333333333';
const UUID_ORGANIZER = '44444444-4444-4444-8444-444444444444';
const UUID_VENDOR_PROFILE = '55555555-5555-4555-8555-555555555555';

function baseInput(overrides: Partial<OnQuoteSentInput> = {}): OnQuoteSentInput {
  return {
    quote: overrides.quote ?? { id: UUID_QUOTE, status: 'sent' },
    quoteRequest: overrides.quoteRequest ?? { id: UUID_QR },
    vendorProfile: overrides.vendorProfile ?? { id: UUID_VENDOR_PROFILE },
    event: overrides.event ?? {
      id: UUID_EVENT,
      ownerId: UUID_ORGANIZER,
      language: 'es_LATAM',
    },
    organizerUser: overrides.organizerUser ?? { id: UUID_ORGANIZER, status: 'active' },
    correlationId: overrides.correlationId ?? 'cid-ut',
    tx: {} as unknown as Prisma.TransactionClient,
  };
}

describe('US-069 · OnQuoteSentHandler', () => {
  describe('UT-01 · guards defensivos (skip + warn sin abortar)', () => {
    it('quote.status != "sent" → skip con reason=quote_not_sent', async () => {
      const { handler, repo, captured, email } = build();
      await handler.handle(baseInput({ quote: { id: UUID_QUOTE, status: 'draft' } }));
      expect(repo.created).toHaveLength(0);
      expect(email.calls).toHaveLength(0);
      const warn = captured.find((c) => c.level === 'warn');
      expect(warn?.payload.reason).toBe('quote_not_sent');
      expect(warn?.payload.quoteStatus).toBe('draft');
    });

    it('event.ownerId vacío → skip con reason=owner_id_null', async () => {
      const { handler, repo, captured } = build();
      await handler.handle(
        baseInput({ event: { id: UUID_EVENT, ownerId: '', language: 'es_LATAM' } }),
      );
      expect(repo.created).toHaveLength(0);
      const warn = captured.find((c) => c.level === 'warn');
      expect(warn?.payload.reason).toBe('owner_id_null');
    });

    it('organizerUser.status=suspended → skip con reason=user_deactivated', async () => {
      const { handler, repo, captured } = build();
      await handler.handle(
        baseInput({ organizerUser: { id: UUID_ORGANIZER, status: 'suspended' } }),
      );
      expect(repo.created).toHaveLength(0);
      const warn = captured.find((c) => c.level === 'warn');
      expect(warn?.payload.reason).toBe('user_deactivated');
    });

    it('organizerUser.status=deactivated → skip con reason=user_deactivated', async () => {
      const { handler, repo, captured } = build();
      await handler.handle(
        baseInput({ organizerUser: { id: UUID_ORGANIZER, status: 'deactivated' } }),
      );
      expect(repo.created).toHaveLength(0);
      const warn = captured.find((c) => c.level === 'warn');
      expect(warn?.payload.reason).toBe('user_deactivated');
    });
  });

  describe('UT-02 · idempotencia', () => {
    it('si ya existe una fila para (organizerUserId, quoteId) → skip silencioso (info log)', async () => {
      const { handler, repo, captured, email } = build();
      repo.seedExists(UUID_ORGANIZER, UUID_QUOTE);
      await handler.handle(baseInput());
      expect(repo.created).toHaveLength(0);
      expect(email.calls).toHaveLength(0);
      expect(
        captured.find((c) => c.payload.event === 'notif.quoteReceived.idempotent_skip'),
      ).toBeDefined();
    });
  });

  describe('UT-03 · resolución de idioma (fallback ladder D5)', () => {
    it('preferredLanguage=pt → notif.languageCode=pt', async () => {
      const { handler, repo, lookup } = build();
      lookup.set(UUID_ORGANIZER, 'pt');
      await handler.handle(baseInput());
      expect(repo.created.every((n) => n.languageCode === 'pt')).toBe(true);
    });

    it('preferredLanguage=null + event.language=es_LATAM → fallback es-LATAM', async () => {
      const { handler, repo, lookup } = build();
      lookup.set(UUID_ORGANIZER, null);
      await handler.handle(
        baseInput({
          event: { id: UUID_EVENT, ownerId: UUID_ORGANIZER, language: 'es_LATAM' },
        }),
      );
      expect(repo.created.every((n) => n.languageCode === 'es-LATAM')).toBe(true);
    });

    it('preferredLanguage=null + event.language desconocido → fallback final en', async () => {
      const { handler, repo, lookup } = build();
      lookup.set(UUID_ORGANIZER, null);
      await handler.handle(
        baseInput({
          event: { id: UUID_EVENT, ownerId: UUID_ORGANIZER, language: 'zz_UNSUPPORTED' },
        }),
      );
      expect(repo.created.every((n) => n.languageCode === 'en')).toBe(true);
    });
  });

  describe('UT-04 · payload correcto (4 campos + title/body + channel)', () => {
    it('emite 2 filas (in_app + email_simulated) con payload rico e idénticos entre canales', async () => {
      const { handler, repo, lookup } = build();
      lookup.set(UUID_ORGANIZER, 'es-LATAM');
      await handler.handle(baseInput());
      expect(repo.created).toHaveLength(2);
      expect(repo.created.map((n) => n.channel).sort()).toEqual([
        'email_simulated',
        'in_app',
      ]);
      const expected = renderQuoteReceivedTemplate('es-LATAM');
      for (const n of repo.created) {
        expect(n).toMatchObject({
          organizerUserId: UUID_ORGANIZER,
          languageCode: 'es-LATAM',
          quoteId: UUID_QUOTE,
          quoteRequestId: UUID_QR,
          eventId: UUID_EVENT,
          vendorProfileId: UUID_VENDOR_PROFILE,
          title: expected.subject,
          body: expected.body,
        });
      }
    });
  });

  describe('UT-05 / SEC-T-01 · log estructurado sin PII', () => {
    it('emite EXACTAMENTE las claves permitidas — sin email/displayName/brief/vendor name/quote total', async () => {
      const { handler, email, lookup } = build();
      lookup.set(UUID_ORGANIZER, 'en');
      await handler.handle(baseInput());
      expect(email.calls).toHaveLength(1);
      const call = email.calls[0]!;
      const inputKeys = Object.keys(call).sort();
      expect(inputKeys).toEqual(
        [
          'toUserId',
          'quoteId',
          'quoteRequestId',
          'eventId',
          'vendorProfileId',
          'language',
          'correlationId',
        ].sort(),
      );
      expect(QUOTE_RECEIVED_EMAIL_LOG_ALLOWED_KEYS).toContain('subject');
      expect(QUOTE_RECEIVED_EMAIL_LOG_ALLOWED_KEYS).toContain('body');
      // Claves prohibidas expresamente por SEC-02:
      for (const forbidden of [
        'email',
        'displayName',
        'briefBody',
        'vendorName',
        'eventNotes',
        'totalPrice',
        'breakdown',
      ]) {
        expect(QUOTE_RECEIVED_EMAIL_LOG_ALLOWED_KEYS).not.toContain(forbidden);
      }
    });
  });

  describe('SEC-T-02 · aislamiento BR-NOTIF-005', () => {
    it('la Notification.userId es SIEMPRE el event.ownerId (nunca otro)', async () => {
      const { handler, repo } = build();
      await handler.handle(baseInput());
      for (const n of repo.created) {
        expect(n.organizerUserId).toBe(UUID_ORGANIZER);
      }
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BatchNotificationLinkResolver — extensión US-069 (BE-002)
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

describe('US-069 · BatchNotificationLinkResolver (extensión)', () => {
  it('resolveMany: type=quote_received con QR existente → /organizer/quote-requests/{qrId}/comparator', async () => {
    const eventReader = new FakeEventReader();
    const qrReader = new FakeQrReader();
    qrReader.existing.add(UUID_QR);
    const resolver = new BatchNotificationLinkResolver({
      eventReader,
      quoteRequestReader: qrReader,
      bookingIntentReader: { filterExistingBookingIntentIds: async () => new Set<string>() },
    });
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
      createdAt: new Date('2026-07-22T14:00:00Z'),
    };
    const result = await resolver.resolveMany([row]);
    expect(result.get('n1')).toBe(
      `/organizer/quote-requests/${UUID_QR}/comparator`,
    );
  });

  it('resolveMany: type=quote_received con QR inexistente → link=null', async () => {
    const eventReader = new FakeEventReader();
    const qrReader = new FakeQrReader();
    const resolver = new BatchNotificationLinkResolver({
      eventReader,
      quoteRequestReader: qrReader,
      bookingIntentReader: { filterExistingBookingIntentIds: async () => new Set<string>() },
    });
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
      createdAt: new Date('2026-07-22T14:00:00Z'),
    };
    const result = await resolver.resolveMany([row]);
    expect(result.get('n1')).toBe(null);
  });

  it('resolveMany: mezcla quote_request_received + quote_received usa el mismo batch-lookup de QR', async () => {
    const eventReader = new FakeEventReader();
    const qrReader = new FakeQrReader();
    qrReader.existing.add(UUID_QR);
    const resolver = new BatchNotificationLinkResolver({
      eventReader,
      quoteRequestReader: qrReader,
      bookingIntentReader: { filterExistingBookingIntentIds: async () => new Set<string>() },
    });
    const rows: NotificationRow[] = [
      {
        id: 'n-qrr',
        userId: UUID_ORGANIZER,
        type: 'quote_request_received',
        payload: { channel: 'in_app', quoteRequestId: UUID_QR, eventId: UUID_EVENT },
        status: 'unread',
        readAt: null,
        createdAt: new Date(),
      },
      {
        id: 'n-qr',
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
    ];
    const result = await resolver.resolveMany(rows);
    expect(result.get('n-qrr')).toBe(`/vendor/quote-requests/${UUID_QR}`);
    expect(result.get('n-qr')).toBe(
      `/organizer/quote-requests/${UUID_QR}/comparator`,
    );
  });
});
