// US-054 (PB-P1-032 / QA-001) — Unit tests.
// Cobertura:
//   - DTO `rejectQuoteBodySchema`: body vacío/omitido, `reason` opcional string, `.strict()`.
//   - `QuoteEventNotificationService` (US-056 refactor de US-054 QuoteNotificationService): emite
//     exactamente 2 Notifications (in_app + email_simulated) con mismo `event` y `payload`;
//     propaga `tx` y `correlationId`.
//   - `RejectQuoteUs054UseCase`: happy path (con y sin reason), EC-01 estado inválido,
//     EC-02 Quote inexistente, EC-05 idempotencia (re-rechazo), EC-03 reason > 500,
//     404 uniforme cuando organizer ajeno, transacción rollback en fallo del service.
import { QuoteStatus } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { rejectQuoteBodySchema } from '../../src/modules/quote-flow/dto/reject-quote.us054.request.js';
import { QuoteEventNotificationService } from '../../src/modules/quote-flow/services/quote-event-notification.service.js';
import { RejectQuoteUs054UseCase } from '../../src/modules/quote-flow/application/reject-quote.us054.use-case.js';
import {
  QuoteNotFoundError,
  QuoteNotRejectableError,
  InvalidRejectionReasonError,
} from '../../src/modules/quote-flow/domain/us054.errors.js';
import type {
  NotifyInput,
  QuoteNotificationSenderPort,
} from '../../src/shared/application/quote-notification-sender.port.js';
import type { DomainEventLogger } from '../../src/shared/observability/domain-event-logger.js';
import type { ClockPort } from '../../src/shared/domain/clock.port.js';

const ORGANIZER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const OTHER_ORGANIZER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaab';
const QUOTE_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const QR_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const VP_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
const VENDOR_USER_ID = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
const EVENT_ID = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

// ─────────────────────────────────────────────────────────────────────────────
// DTO
// ─────────────────────────────────────────────────────────────────────────────
describe('US-054 · rejectQuoteBodySchema', () => {
  it('acepta body vacío `{}`', () => {
    const parsed = rejectQuoteBodySchema.safeParse({});
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.reason).toBeUndefined();
  });

  it('acepta body con `reason` como string', () => {
    const parsed = rejectQuoteBodySchema.safeParse({ reason: 'Precio fuera de presupuesto' });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.reason).toBe('Precio fuera de presupuesto');
  });

  it('acepta `reason` con string vacío (se normaliza a null en el UC)', () => {
    const parsed = rejectQuoteBodySchema.safeParse({ reason: '' });
    expect(parsed.success).toBe(true);
  });

  it('rechaza keys ajenas (.strict())', () => {
    const parsed = rejectQuoteBodySchema.safeParse({ reason: 'ok', extra: 'nope' });
    expect(parsed.success).toBe(false);
  });

  it('rechaza `reason` no-string', () => {
    const parsed = rejectQuoteBodySchema.safeParse({ reason: 123 });
    expect(parsed.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// QuoteEventNotificationService (refactor US-056)
// ─────────────────────────────────────────────────────────────────────────────
describe('US-054/056 · QuoteEventNotificationService', () => {
  function makeService() {
    const notify = vi.fn<(input: NotifyInput) => Promise<void>>(async () => {});
    const notifications: QuoteNotificationSenderPort = { notify };
    const emit = vi.fn();
    const logger: DomainEventLogger = { emit };
    return { service: new QuoteEventNotificationService(notifications, logger), notify, emit };
  }

  it('emite exactamente 2 Notifications con mismo event/payload y canales in_app + email_simulated', async () => {
    const { service, notify, emit } = makeService();
    const payload = { quote_id: QUOTE_ID, foo: 'bar' };
    await service.emit({
      quoteId: QUOTE_ID,
      recipientUserId: VENDOR_USER_ID,
      eventName: 'quote.rejected',
      payload,
      correlationId: 'corr-54',
    });
    expect(notify).toHaveBeenCalledTimes(2);
    const calls = notify.mock.calls.map((c) => c[0]!);
    const channels = calls.map((c) => c.channel).sort();
    expect(channels).toEqual(['email_simulated', 'in_app']);
    for (const c of calls) {
      expect(c.recipientUserId).toBe(VENDOR_USER_ID);
      expect(c.event).toBe('quote.rejected');
      expect(c.payload).toEqual(payload);
    }
    // delivery_status distinto por canal (BR-NOTIF-003).
    const inApp = calls.find((c) => c.channel === 'in_app')!;
    const email = calls.find((c) => c.channel === 'email_simulated')!;
    expect(inApp.deliveryStatus).toBe('delivered');
    expect(email.deliveryStatus).toBe('simulated');
    // Log agregado — la clave del log preserva `vendorUserId` (contrato DomainEventLogger).
    expect(emit).toHaveBeenCalledWith(
      'quote.notification.emitted',
      expect.objectContaining({
        correlationId: 'corr-54',
        quoteId: QUOTE_ID,
        eventName: 'quote.rejected',
        vendorUserId: VENDOR_USER_ID,
      }),
    );
  });

  it('propaga `tx` a ambas llamadas del port (atomicidad D7)', async () => {
    const { service, notify } = makeService();
    const fakeTx = { __marker: 'tx' } as unknown as Parameters<typeof service.emit>[0]['tx'];
    await service.emit({
      quoteId: QUOTE_ID,
      recipientUserId: VENDOR_USER_ID,
      eventName: 'quote.expired',
      payload: {},
      tx: fakeTx,
    });
    for (const call of notify.mock.calls) {
      expect(call[0]!.tx).toBe(fakeTx);
    }
  });

  it('un fallo del port propaga y no emite el log agregado', async () => {
    const notify = vi.fn<(input: NotifyInput) => Promise<void>>(async () => {
      throw new Error('boom');
    });
    const notifications: QuoteNotificationSenderPort = { notify };
    const emit = vi.fn();
    const logger: DomainEventLogger = { emit };
    const service = new QuoteEventNotificationService(notifications, logger);
    await expect(
      service.emit({
        quoteId: QUOTE_ID,
        recipientUserId: VENDOR_USER_ID,
        eventName: 'quote.rejected',
        payload: {},
      }),
    ).rejects.toThrow('boom');
    expect(emit).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// RejectQuoteUs054UseCase
// ─────────────────────────────────────────────────────────────────────────────
interface Overrides {
  quoteRow?: { status: QuoteStatus; rejection_reason?: string | null } | null;
  organizerUserId?: string;
  qrExists?: boolean;
  vendorMissing?: boolean;
  notifyThrows?: boolean;
}

function makeUc(overrides: Overrides = {}) {
  const notify = vi.fn<(input: NotifyInput) => Promise<void>>(async () => {
    if (overrides.notifyThrows) throw new Error('notify-boom');
  });
  const emit = vi.fn();
  const logger: DomainEventLogger = { emit };
  const notifications: QuoteNotificationSenderPort = { notify };
  const service = new QuoteEventNotificationService(notifications, logger);
  const now = new Date(Date.UTC(2026, 6, 16, 12, 0, 0));
  const clock: ClockPort = { now: () => now };

  const quoteStatus = overrides.quoteRow?.status ?? QuoteStatus.sent;
  const organizerUserId = overrides.organizerUserId ?? ORGANIZER_ID;

  const updateMock = vi.fn(async ({ data }: { data: { rejectionReason?: string | null } }) => ({
    id: QUOTE_ID,
    quoteRequestId: QR_ID,
    vendorProfileId: VP_ID,
    amount: { toString: () => '1000.00' } as unknown as import('@prisma/client').Prisma.Decimal,
    currency: 'GTQ',
    breakdown: null,
    conditions: null,
    validUntil: null,
    status: QuoteStatus.rejected,
    isPreferred: false,
    sentAt: null,
    acceptedAt: null,
    rejectedAt: now,
    rejectionReason: data.rejectionReason ?? null,
    createdAt: now,
    updatedAt: now,
  }));

  const tx = {
    async $queryRaw<T>(_sql: unknown): Promise<T> {
      const strings = (_sql as { strings?: readonly string[] }).strings ?? [];
      const src = strings.join('|');
      if (src.includes('FROM quotes')) {
        if (overrides.quoteRow === null) return [] as unknown as T;
        return [
          {
            id: QUOTE_ID,
            quote_request_id: QR_ID,
            vendor_profile_id: VP_ID,
            status: quoteStatus,
          },
        ] as unknown as T;
      }
      if (src.includes('FROM events')) {
        return [{ organizer_user_id: organizerUserId }] as unknown as T;
      }
      if (src.includes('FROM vendor_profiles')) {
        return overrides.vendorMissing ? ([] as unknown as T) : ([{ user_id: VENDOR_USER_ID }] as unknown as T);
      }
      return [] as unknown as T;
    },
    quoteRequest: {
      findUnique: vi.fn(async () =>
        overrides.qrExists === false ? null : { eventId: EVENT_ID },
      ),
    },
    quote: { update: updateMock },
    notification: { create: vi.fn(async () => ({})) },
  };

  const prismaStub = {
    async $transaction<T>(cb: (tx: unknown) => Promise<T>): Promise<T> {
      return cb(tx);
    },
  } as unknown as import('@prisma/client').PrismaClient;

  const uc = new RejectQuoteUs054UseCase(service, clock, logger, prismaStub);
  return { uc, notify, emit, updateMock };
}

describe('US-054 · RejectQuoteUs054UseCase', () => {
  it('AC-01 happy path con reason: UPDATE + 2 notifications + log quote.rejected', async () => {
    const { uc, notify, emit, updateMock } = makeUc();
    const view = await uc.execute(ORGANIZER_ID, QUOTE_ID, { reason: 'Precio alto' }, { correlationId: 'corr-54' });
    expect(view.status).toBe('rejected');
    expect(view.rejectionReason).toBe('Precio alto');
    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(updateMock.mock.calls[0]![0].data).toMatchObject({
      status: 'rejected',
      rejectionReason: 'Precio alto',
    });
    expect(notify).toHaveBeenCalledTimes(2);
    expect(emit).toHaveBeenCalledWith(
      'quote.rejected',
      expect.objectContaining({ correlationId: 'corr-54', actorId: ORGANIZER_ID, quoteId: QUOTE_ID }),
    );
    // Payload de las notifications lleva `rejection_reason`.
    for (const call of notify.mock.calls) {
      expect(call[0]!.payload).toMatchObject({
        quote_id: QUOTE_ID,
        quote_request_id: QR_ID,
        rejection_reason: 'Precio alto',
      });
    }
  });

  it('AC-03 sin body ⇒ rejection_reason=null en persistencia y payload', async () => {
    const { uc, notify, updateMock } = makeUc();
    const view = await uc.execute(ORGANIZER_ID, QUOTE_ID, {});
    expect(view.rejectionReason).toBeNull();
    expect(updateMock.mock.calls[0]![0].data.rejectionReason).toBeNull();
    for (const call of notify.mock.calls) {
      expect(call[0]!.payload).toMatchObject({ rejection_reason: null });
    }
  });

  it('AC-03 reason string vacío ⇒ null persistido', async () => {
    const { uc, updateMock } = makeUc();
    await uc.execute(ORGANIZER_ID, QUOTE_ID, { reason: '' });
    expect(updateMock.mock.calls[0]![0].data.rejectionReason).toBeNull();
  });

  it('EC-03 reason > 500 chars ⇒ InvalidRejectionReasonError sin abrir tx', async () => {
    const { uc, updateMock } = makeUc();
    await expect(
      uc.execute(ORGANIZER_ID, QUOTE_ID, { reason: 'x'.repeat(501) }, {}),
    ).rejects.toBeInstanceOf(InvalidRejectionReasonError);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('acepta reason exactamente en el límite (500 chars)', async () => {
    const { uc } = makeUc();
    const view = await uc.execute(ORGANIZER_ID, QUOTE_ID, { reason: 'x'.repeat(500) });
    expect(view.rejectionReason?.length).toBe(500);
  });

  it('EC-02 Quote inexistente ⇒ QuoteNotFoundError (404 uniforme)', async () => {
    const { uc } = makeUc({ quoteRow: null });
    await expect(uc.execute(ORGANIZER_ID, QUOTE_ID, {})).rejects.toBeInstanceOf(QuoteNotFoundError);
  });

  it('EC-02 QuoteRequest referenciado no existe ⇒ QuoteNotFoundError', async () => {
    const { uc } = makeUc({ qrExists: false });
    await expect(uc.execute(ORGANIZER_ID, QUOTE_ID, {})).rejects.toBeInstanceOf(QuoteNotFoundError);
  });

  it('AUTH-TS-02 organizer ajeno ⇒ QuoteNotFoundError (404 uniforme, no filtra ownership)', async () => {
    const { uc } = makeUc({ organizerUserId: OTHER_ORGANIZER_ID });
    await expect(uc.execute(ORGANIZER_ID, QUOTE_ID, {})).rejects.toBeInstanceOf(QuoteNotFoundError);
  });

  it('EC-01 Quote en `draft` ⇒ QuoteNotRejectableError con current_status', async () => {
    const { uc } = makeUc({ quoteRow: { status: QuoteStatus.draft } });
    await expect(uc.execute(ORGANIZER_ID, QUOTE_ID, {})).rejects.toThrow(QuoteNotRejectableError);
  });

  it('EC-05 idempotencia: re-rechazo (status=rejected) ⇒ QuoteNotRejectableError sin notifs', async () => {
    const { uc, notify, updateMock } = makeUc({ quoteRow: { status: QuoteStatus.rejected } });
    await expect(uc.execute(ORGANIZER_ID, QUOTE_ID, {})).rejects.toBeInstanceOf(
      QuoteNotRejectableError,
    );
    expect(notify).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('vendor faltante (integridad rota) ⇒ QuoteNotFoundError uniforme', async () => {
    const { uc } = makeUc({ vendorMissing: true });
    await expect(uc.execute(ORGANIZER_ID, QUOTE_ID, {})).rejects.toBeInstanceOf(QuoteNotFoundError);
  });

  it('fallo del NotificationSender propaga (rollback lógico de tx — D7)', async () => {
    const { uc } = makeUc({ notifyThrows: true });
    await expect(uc.execute(ORGANIZER_ID, QUOTE_ID, { reason: 'r' })).rejects.toThrow('notify-boom');
  });
});
