// US-068 (PB-P2-005 / QA-001 + SEC-001) — Unit tests del `OnQuoteRequestCreatedHandler`.
//
// Cubre con fakes en memoria:
//   * UT-01 guards (vendor no-approved / user_id null / user suspended) → skip + warn.
//   * UT-02 idempotencia → skip silencioso.
//   * UT-03 resolución de idioma (User.preferredLanguage / event.language / fallback `en`).
//   * UT-04 payload y templating correctos.
//   * UT-05 shape del log `email_simulated` con set exacto de claves permitidas (SEC-T-01).
//   * SEC-T-02 aislamiento — `Notification.userId === vendorProfile.userId` (nunca otro).
//   * BatchNotificationLinkResolver: nueva estrategia `quote_request_received` genera
//     `/vendor/quote-requests/{id}` con lookup contra QuoteRequestReader.
import { describe, expect, it } from 'vitest';
import type { Prisma } from '@prisma/client';
import {
  OnQuoteRequestCreatedHandler,
  type OnQrCreatedInput,
  type OnQrCreatedLogger,
  type VendorLanguagePreferenceReader,
} from '../../src/modules/notifications/application/on-quote-request-created.handler.js';
import { BatchNotificationLinkResolver } from '../../src/modules/notifications/application/notification-link-resolver.service.js';
import type { NotificationLinkEventReader } from '../../src/modules/notifications/ports/notification-link-event-reader.js';
import type { NotificationLinkQuoteRequestReader } from '../../src/modules/notifications/ports/notification-link-quote-request-reader.js';
import type { NotificationRow } from '../../src/modules/notifications/ports/list-notifications.repository.js';
import type {
  CreateQrReceivedNotificationInput,
  NotificationQrReceivedRepository,
  QrReceivedRepositoryOptions,
} from '../../src/modules/notifications/ports/notification-qr-received.repository.js';
import type {
  SimulatedQrReceivedEmailInput,
  SimulatedQrReceivedEmailPort,
} from '../../src/modules/notifications/ports/simulated-qr-received-email.port.js';
import { QR_RECEIVED_EMAIL_LOG_ALLOWED_KEYS } from '../../src/modules/notifications/infrastructure/logging-simulated-qr-received-email.adapter.js';
import { renderQrReceivedTemplate } from '../../src/modules/notifications/i18n/qr-received-templates.js';
import type { SupportedLanguage } from '../../src/shared/constants/languages.js';

class FakeQrRepo implements NotificationQrReceivedRepository {
  existsMap = new Map<string, boolean>();
  created: CreateQrReceivedNotificationInput[] = [];
  seedExists(vendorUserId: string, qrId: string): void {
    this.existsMap.set(`${vendorUserId}::${qrId}`, true);
  }
  existsQuoteRequestReceivedForQR(
    vendorUserId: string,
    quoteRequestId: string,
    _opts?: QrReceivedRepositoryOptions,
  ): Promise<boolean> {
    return Promise.resolve(this.existsMap.get(`${vendorUserId}::${quoteRequestId}`) ?? false);
  }
  create(
    input: CreateQrReceivedNotificationInput,
    _opts?: QrReceivedRepositoryOptions,
  ): Promise<void> {
    this.created.push(input);
    this.existsMap.set(`${input.vendorUserId}::${input.quoteRequestId}`, true);
    return Promise.resolve();
  }
}

class FakeLanguageLookup implements VendorLanguagePreferenceReader {
  map = new Map<string, SupportedLanguage | null>();
  set(userId: string, lang: SupportedLanguage | null): void {
    this.map.set(userId, lang);
  }
  findPreferredLanguage(userId: string): Promise<SupportedLanguage | null> {
    return Promise.resolve(this.map.get(userId) ?? null);
  }
}

class FakeEmailAdapter implements SimulatedQrReceivedEmailPort {
  calls: SimulatedQrReceivedEmailInput[] = [];
  logEmail(input: SimulatedQrReceivedEmailInput): void {
    this.calls.push(input);
  }
}

interface CapturedLog {
  level: 'info' | 'warn';
  payload: Record<string, unknown>;
}

function makeLogger(): { logger: OnQrCreatedLogger; captured: CapturedLog[] } {
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
  const repo = new FakeQrRepo();
  const lookup = new FakeLanguageLookup();
  const email = new FakeEmailAdapter();
  const { logger, captured } = makeLogger();
  const handler = new OnQuoteRequestCreatedHandler({
    notificationRepo: repo,
    languageLookup: lookup,
    emailAdapter: email,
    logger,
  });
  return { repo, lookup, email, logger, captured, handler };
}

const UUID_QR = '11111111-1111-4111-8111-111111111111';
const UUID_EVENT = '22222222-2222-4222-8222-222222222222';
const UUID_ORG = '33333333-3333-4333-8333-333333333333';
const UUID_VENDOR_PROFILE = '44444444-4444-4444-8444-444444444444';
const UUID_VENDOR_USER = '55555555-5555-4555-8555-555555555555';

function baseInput(overrides: Partial<OnQrCreatedInput> = {}): OnQrCreatedInput {
  return {
    quoteRequest: { id: UUID_QR },
    vendorProfile: overrides.vendorProfile ?? {
      id: UUID_VENDOR_PROFILE,
      status: 'approved',
      userId: UUID_VENDOR_USER,
      deletedAt: null,
    },
    vendorUser: overrides.vendorUser ?? { id: UUID_VENDOR_USER, status: 'active' },
    event: overrides.event ?? { id: UUID_EVENT, ownerId: UUID_ORG, language: 'es_LATAM' },
    serviceCategoryCode: overrides.serviceCategoryCode ?? 'catering',
    correlationId: overrides.correlationId ?? 'cid-ut',
    tx: {} as unknown as Prisma.TransactionClient,
  };
}

describe('US-068 · OnQuoteRequestCreatedHandler', () => {
  describe('UT-01 · guards defensivos (skip + warn sin abortar)', () => {
    it('vendor.status != approved → skip con reason=vendor_not_approved', async () => {
      const { handler, repo, captured, email } = build();
      await handler.handle(baseInput({
        vendorProfile: {
          id: UUID_VENDOR_PROFILE,
          status: 'pending',
          userId: UUID_VENDOR_USER,
          deletedAt: null,
        },
      }));
      expect(repo.created).toHaveLength(0);
      expect(email.calls).toHaveLength(0);
      const warn = captured.find((c) => c.level === 'warn');
      expect(warn?.payload.reason).toBe('vendor_not_approved');
    });

    it('vendor.userId=null → skip con reason=user_id_null', async () => {
      const { handler, repo, captured } = build();
      await handler.handle(baseInput({
        vendorProfile: { id: UUID_VENDOR_PROFILE, status: 'approved', userId: null, deletedAt: null },
      }));
      expect(repo.created).toHaveLength(0);
      const warn = captured.find((c) => c.level === 'warn');
      expect(warn?.payload.reason).toBe('user_id_null');
    });

    it('vendorUser.status=suspended → skip con reason=user_deactivated', async () => {
      const { handler, repo, captured } = build();
      await handler.handle(baseInput({
        vendorUser: { id: UUID_VENDOR_USER, status: 'suspended' },
      }));
      expect(repo.created).toHaveLength(0);
      const warn = captured.find((c) => c.level === 'warn');
      expect(warn?.payload.reason).toBe('user_deactivated');
    });
  });

  describe('UT-02 · idempotencia', () => {
    it('si ya existe una fila para (vendorUserId, quoteRequestId) → skip silencioso (info log)', async () => {
      const { handler, repo, captured, email } = build();
      repo.seedExists(UUID_VENDOR_USER, UUID_QR);
      await handler.handle(baseInput());
      expect(repo.created).toHaveLength(0);
      expect(email.calls).toHaveLength(0);
      expect(captured.find((c) => c.payload.event === 'notif.qrReceived.idempotent_skip')).toBeDefined();
    });
  });

  describe('UT-03 · resolución de idioma (fallback ladder D5)', () => {
    it('preferredLanguage=pt → notif.languageCode=pt', async () => {
      const { handler, repo, lookup } = build();
      lookup.set(UUID_VENDOR_USER, 'pt');
      await handler.handle(baseInput());
      expect(repo.created.every((n) => n.languageCode === 'pt')).toBe(true);
    });

    it('preferredLanguage=null + event.language=es_LATAM → fallback es-LATAM', async () => {
      const { handler, repo, lookup } = build();
      lookup.set(UUID_VENDOR_USER, null);
      await handler.handle(baseInput({ event: { id: UUID_EVENT, ownerId: UUID_ORG, language: 'es_LATAM' } }));
      expect(repo.created.every((n) => n.languageCode === 'es-LATAM')).toBe(true);
    });

    it('preferredLanguage=null + event.language desconocido → fallback final en', async () => {
      const { handler, repo, lookup } = build();
      lookup.set(UUID_VENDOR_USER, null);
      await handler.handle(baseInput({ event: { id: UUID_EVENT, ownerId: UUID_ORG, language: 'zz_UNSUPPORTED' } }));
      expect(repo.created.every((n) => n.languageCode === 'en')).toBe(true);
    });
  });

  describe('UT-04 · payload correcto (4 campos + title/body + channel)', () => {
    it('emite 2 filas (in_app + email_simulated) con payload rico e idénticos entre canales', async () => {
      const { handler, repo, lookup } = build();
      lookup.set(UUID_VENDOR_USER, 'es-LATAM');
      await handler.handle(baseInput({ serviceCategoryCode: 'photography' }));
      expect(repo.created).toHaveLength(2);
      expect(repo.created.map((n) => n.channel).sort()).toEqual(['email_simulated', 'in_app']);
      const expectedTemplate = renderQrReceivedTemplate('es-LATAM', { categoryCode: 'photography' });
      for (const n of repo.created) {
        expect(n).toMatchObject({
          vendorUserId: UUID_VENDOR_USER,
          languageCode: 'es-LATAM',
          quoteRequestId: UUID_QR,
          eventId: UUID_EVENT,
          organizerId: UUID_ORG,
          categoryCode: 'photography',
          title: expectedTemplate.subject,
          body: expectedTemplate.body,
        });
      }
    });
  });

  describe('UT-05 / SEC-T-01 · log estructurado sin PII', () => {
    it('emite EXACTAMENTE las claves permitidas — sin email/displayName/brief/vendor name', async () => {
      const { handler, email, lookup } = build();
      lookup.set(UUID_VENDOR_USER, 'en');
      await handler.handle(baseInput());
      expect(email.calls).toHaveLength(1);
      // El adapter emite un log estructurado; verificamos que el subset de datos que llega
      // corresponde EXACTAMENTE al set canónico.
      const call = email.calls[0]!;
      const inputKeys = Object.keys(call).sort();
      expect(inputKeys).toEqual(
        ['toUserId', 'quoteRequestId', 'eventId', 'organizerId', 'categoryCode', 'language', 'correlationId'].sort(),
      );
      expect(QR_RECEIVED_EMAIL_LOG_ALLOWED_KEYS).toContain('subject');
      expect(QR_RECEIVED_EMAIL_LOG_ALLOWED_KEYS).toContain('body');
      // Claves prohibidas expresamente por SEC-02:
      for (const forbidden of ['email', 'displayName', 'briefBody', 'vendorName', 'eventNotes']) {
        expect(QR_RECEIVED_EMAIL_LOG_ALLOWED_KEYS).not.toContain(forbidden);
      }
    });
  });

  describe('SEC-T-02 · aislamiento BR-NOTIF-005', () => {
    it('la Notification.userId es SIEMPRE el vendorProfile.userId (nunca otro)', async () => {
      const { handler, repo } = build();
      await handler.handle(baseInput());
      for (const n of repo.created) {
        expect(n.vendorUserId).toBe(UUID_VENDOR_USER);
      }
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BatchNotificationLinkResolver — extensión US-068 (BE-002)
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

describe('US-068 · BatchNotificationLinkResolver (extensión)', () => {
  it('resolveMany: type=quote_request_received con QR existente → /vendor/quote-requests/{id}', async () => {
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
      userId: UUID_VENDOR_USER,
      type: 'quote_request_received',
      payload: { channel: 'in_app', quoteRequestId: UUID_QR, eventId: UUID_EVENT },
      status: 'unread',
      readAt: null,
      createdAt: new Date('2026-07-22T14:00:00Z'),
    };
    const result = await resolver.resolveMany([row]);
    expect(result.get('n1')).toBe(`/vendor/quote-requests/${UUID_QR}`);
  });

  it('resolveMany: type=quote_request_received con QR inexistente → link=null', async () => {
    const eventReader = new FakeEventReader();
    const qrReader = new FakeQrReader();
    const resolver = new BatchNotificationLinkResolver({
      eventReader,
      quoteRequestReader: qrReader,
      bookingIntentReader: { filterExistingBookingIntentIds: async () => new Set<string>() },
    });
    const row: NotificationRow = {
      id: 'n1',
      userId: UUID_VENDOR_USER,
      type: 'quote_request_received',
      payload: { channel: 'in_app', quoteRequestId: UUID_QR, eventId: UUID_EVENT },
      status: 'unread',
      readAt: null,
      createdAt: new Date('2026-07-22T14:00:00Z'),
    };
    const result = await resolver.resolveMany([row]);
    expect(result.get('n1')).toBe(null);
  });

  it('resolveMany: mezcla task_due_soon + quote_request_received con batch-lookup independiente', async () => {
    const eventReader = new FakeEventReader();
    eventReader.existing.add(UUID_EVENT);
    const qrReader = new FakeQrReader();
    qrReader.existing.add(UUID_QR);
    const resolver = new BatchNotificationLinkResolver({
      eventReader,
      quoteRequestReader: qrReader,
      bookingIntentReader: { filterExistingBookingIntentIds: async () => new Set<string>() },
    });
    const rows: NotificationRow[] = [
      {
        id: 'nt7',
        userId: UUID_ORG,
        type: 'task_due_soon',
        payload: { channel: 'in_app', eventId: UUID_EVENT, taskId: '00000000-0000-0000-0000-000000000000' },
        status: 'unread',
        readAt: null,
        createdAt: new Date(),
      },
      {
        id: 'nqr',
        userId: UUID_VENDOR_USER,
        type: 'quote_request_received',
        payload: { channel: 'in_app', quoteRequestId: UUID_QR, eventId: UUID_EVENT },
        status: 'unread',
        readAt: null,
        createdAt: new Date(),
      },
    ];
    const result = await resolver.resolveMany(rows);
    expect(result.get('nt7')).toBe(`/organizer/events/${UUID_EVENT}/tasks?range=7d`);
    expect(result.get('nqr')).toBe(`/vendor/quote-requests/${UUID_QR}`);
  });
});
