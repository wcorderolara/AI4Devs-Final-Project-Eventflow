// US-056 (PB-P1-034 / QA-001) — Unit tests.
// Cobertura:
//   - DTO `cancelQuoteRequestBodySchema`: body vacío/omitido, `reason` opcional string, `.strict()`.
//   - `QuoteEventNotificationService` (refactor US-056): emite exactamente 2 Notifications
//     (in_app + email_simulated) para `quote_request.cancelled` con mismo `event` y `payload`;
//     propaga `tx` y `correlationId`. Covers TASK-PB-P1-034-US-056-BE-002 UT (los 3 eventos).
//   - `CancelQuoteRequestUs056UseCase`: happy path (con y sin reason), EC-01 confirmed_intent,
//     EC-02 estado inválido, EC-03 QR inexistente / ownership ajeno, EC-04 reason > 500,
//     EC-06 idempotencia (re-cancelación), fallo del NotificationSender (rollback D8), QR sin
//     vendor asignado (no emite notif, log OK). Los guards son AUTH-TS-01..05 desde el UC.
import { QuoteRequestStatus } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { cancelQuoteRequestBodySchema } from '../../src/modules/quote-flow/dto/cancel-quote-request.us056.request.js';
import { QuoteEventNotificationService } from '../../src/modules/quote-flow/services/quote-event-notification.service.js';
import { CancelQuoteRequestUs056UseCase } from '../../src/modules/quote-flow/application/cancel-quote-request.us056.use-case.js';
import {
  QrNotFoundError,
  QrNotCancellableError,
  QrHasConfirmedBookingError,
  InvalidCancellationReasonError,
} from '../../src/modules/quote-flow/domain/us056.errors.js';
import type {
  NotifyInput,
  QuoteNotificationSenderPort,
} from '../../src/shared/application/quote-notification-sender.port.js';
import type { DomainEventLogger } from '../../src/shared/observability/domain-event-logger.js';
import type { ClockPort } from '../../src/shared/domain/clock.port.js';

const ORGANIZER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const OTHER_ORGANIZER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaab';
const QR_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const EVENT_ID = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
const VP_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
const VENDOR_USER_ID = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
const SC_ID = '99999999-9999-9999-9999-999999999999';
const CONFIRMED_BI_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

// ─────────────────────────────────────────────────────────────────────────────
// DTO
// ─────────────────────────────────────────────────────────────────────────────
describe('US-056 · cancelQuoteRequestBodySchema', () => {
  it('acepta body vacío `{}`', () => {
    const parsed = cancelQuoteRequestBodySchema.safeParse({});
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.reason).toBeUndefined();
  });

  it('acepta body con `reason` como string', () => {
    const parsed = cancelQuoteRequestBodySchema.safeParse({ reason: 'Cambio de planes' });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.reason).toBe('Cambio de planes');
  });

  it('acepta `reason` con string vacío (se normaliza a null en el UC)', () => {
    const parsed = cancelQuoteRequestBodySchema.safeParse({ reason: '' });
    expect(parsed.success).toBe(true);
  });

  it('rechaza keys ajenas (.strict())', () => {
    const parsed = cancelQuoteRequestBodySchema.safeParse({ reason: 'ok', extra: 'nope' });
    expect(parsed.success).toBe(false);
  });

  it('rechaza `reason` no-string', () => {
    const parsed = cancelQuoteRequestBodySchema.safeParse({ reason: 123 });
    expect(parsed.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// QuoteEventNotificationService (refactor US-056 — verifica el 3er evento nuevo)
// ─────────────────────────────────────────────────────────────────────────────
describe('US-056 · QuoteEventNotificationService', () => {
  function makeService() {
    const notify = vi.fn<(input: NotifyInput) => Promise<void>>(async () => {});
    const notifications: QuoteNotificationSenderPort = { notify };
    const emit = vi.fn();
    const logger: DomainEventLogger = { emit };
    return {
      service: new QuoteEventNotificationService(notifications, logger),
      notify,
      emit,
    };
  }

  it('emite 2 Notifications con event=quote_request.cancelled + log agregado', async () => {
    const { service, notify, emit } = makeService();
    const payload = { quote_request_id: QR_ID, event_id: EVENT_ID, cancellation_reason: 'x' };
    await service.emit({
      recipientUserId: VENDOR_USER_ID,
      eventName: 'quote_request.cancelled',
      payload,
      correlationId: 'corr-56',
    });
    expect(notify).toHaveBeenCalledTimes(2);
    const channels = notify.mock.calls.map((c) => c[0]!.channel).sort();
    expect(channels).toEqual(['email_simulated', 'in_app']);
    for (const c of notify.mock.calls) {
      const input = c[0]!;
      expect(input.recipientUserId).toBe(VENDOR_USER_ID);
      expect(input.event).toBe('quote_request.cancelled');
      expect(input.payload).toEqual(payload);
    }
    // delivery_status distinto por canal (BR-NOTIF-003).
    const inApp = notify.mock.calls.map((c) => c[0]!).find((c) => c.channel === 'in_app')!;
    const email = notify.mock.calls.map((c) => c[0]!).find((c) => c.channel === 'email_simulated')!;
    expect(inApp.deliveryStatus).toBe('delivered');
    expect(email.deliveryStatus).toBe('simulated');
    expect(emit).toHaveBeenCalledWith(
      'quote.notification.emitted',
      expect.objectContaining({
        correlationId: 'corr-56',
        eventName: 'quote_request.cancelled',
        vendorUserId: VENDOR_USER_ID,
      }),
    );
  });

  it('soporta también quote.rejected y quote.expired (compatibilidad US-053/054)', async () => {
    const { service, notify } = makeService();
    for (const eventName of ['quote.rejected', 'quote.expired'] as const) {
      await service.emit({
        recipientUserId: VENDOR_USER_ID,
        eventName,
        payload: {},
      });
    }
    expect(notify).toHaveBeenCalledTimes(4);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CancelQuoteRequestUs056UseCase
// ─────────────────────────────────────────────────────────────────────────────
interface Overrides {
  qrRow?: { status: QuoteRequestStatus; vendor_profile_id?: string | null } | null;
  organizerUserId?: string;
  confirmedIntentId?: string;
  vendorMissing?: boolean;
  notifyThrows?: boolean;
  updatedCount?: number;
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

  const qrStatus = overrides.qrRow?.status ?? QuoteRequestStatus.viewed;
  const vendorProfileId =
    overrides.qrRow?.vendor_profile_id !== undefined
      ? overrides.qrRow.vendor_profile_id
      : VP_ID;
  const organizerUserId = overrides.organizerUserId ?? ORGANIZER_ID;

  const updateManyMock = vi.fn(
    async (_args: { where: unknown; data: Record<string, unknown> }) => ({
      count: overrides.updatedCount ?? 1,
    }),
  );
  const findUniqueOrThrowMock = vi.fn(async () => ({
    id: QR_ID,
    eventId: EVENT_ID,
    serviceCategoryId: SC_ID,
    vendorProfileId,
    status: QuoteRequestStatus.cancelled,
    aiBriefMeta: null,
    brief: { summary: 's', requirements: ['r'], questions: ['q'] },
    viewedAt: null,
    viewedBy: null,
    cancelledAt: now,
    cancelledBy: organizerUserId,
    cancellationReason: null,
    expiresAt: null,
    aiRecommendationId: null,
    createdAt: now,
    updatedAt: now,
    isSeed: false,
  }));

  const tx = {
    async $queryRaw<T>(_sql: unknown): Promise<T> {
      const strings = (_sql as { strings?: readonly string[] }).strings ?? [];
      const src = strings.join('|');
      if (src.includes('FROM quote_requests')) {
        if (overrides.qrRow === null) return [] as unknown as T;
        return [
          {
            id: QR_ID,
            event_id: EVENT_ID,
            vendor_profile_id: vendorProfileId,
            status: qrStatus,
          },
        ] as unknown as T;
      }
      if (src.includes('FROM events')) {
        return [{ organizer_user_id: organizerUserId }] as unknown as T;
      }
      if (src.includes('FROM booking_intents')) {
        return overrides.confirmedIntentId
          ? ([{ id: overrides.confirmedIntentId }] as unknown as T)
          : ([] as unknown as T);
      }
      if (src.includes('FROM vendor_profiles')) {
        return overrides.vendorMissing
          ? ([] as unknown as T)
          : ([{ user_id: VENDOR_USER_ID }] as unknown as T);
      }
      return [] as unknown as T;
    },
    quoteRequest: {
      updateMany: updateManyMock,
      findUniqueOrThrow: findUniqueOrThrowMock,
    },
  };

  const prismaStub = {
    async $transaction<T>(cb: (tx: unknown) => Promise<T>): Promise<T> {
      return cb(tx);
    },
  } as unknown as import('@prisma/client').PrismaClient;

  const uc = new CancelQuoteRequestUs056UseCase(service, clock, logger, prismaStub);
  return { uc, notify, emit, updateManyMock, findUniqueOrThrowMock };
}

describe('US-056 · CancelQuoteRequestUs056UseCase', () => {
  it('AC-01 happy path con reason: UPDATE + 2 notifs + log quote_request.cancelled', async () => {
    const { uc, notify, emit, updateManyMock } = makeUc();
    const view = await uc.execute(
      ORGANIZER_ID,
      QR_ID,
      { reason: 'Cambio de planes' },
      { correlationId: 'corr-56' },
    );
    expect(view.status).toBe('cancelled');
    expect(updateManyMock).toHaveBeenCalledTimes(1);
    expect(updateManyMock.mock.calls[0]![0].data).toMatchObject({
      status: 'cancelled',
      cancelledBy: ORGANIZER_ID,
      cancellationReason: 'Cambio de planes',
    });
    expect(notify).toHaveBeenCalledTimes(2);
    // Payload correcto en ambas notifs.
    for (const call of notify.mock.calls) {
      expect(call[0]!.event).toBe('quote_request.cancelled');
      expect(call[0]!.payload).toMatchObject({
        quote_request_id: QR_ID,
        event_id: EVENT_ID,
        cancellation_reason: 'Cambio de planes',
      });
    }
    // Log del UC.
    expect(emit).toHaveBeenCalledWith(
      'quote_request.cancelled',
      expect.objectContaining({
        correlationId: 'corr-56',
        actorId: ORGANIZER_ID,
        quoteRequestId: QR_ID,
      }),
    );
  });

  it('AC-02 sin body ⇒ cancellationReason=null en persistencia y payload', async () => {
    const { uc, notify, updateManyMock } = makeUc();
    await uc.execute(ORGANIZER_ID, QR_ID, {});
    expect(updateManyMock.mock.calls[0]![0].data.cancellationReason).toBeNull();
    for (const call of notify.mock.calls) {
      expect(call[0]!.payload).toMatchObject({ cancellation_reason: null });
    }
  });

  it('AC-02 reason string vacío ⇒ null persistido', async () => {
    const { uc, updateManyMock } = makeUc();
    await uc.execute(ORGANIZER_ID, QR_ID, { reason: '' });
    expect(updateManyMock.mock.calls[0]![0].data.cancellationReason).toBeNull();
  });

  it('EC-04 reason > 500 chars ⇒ InvalidCancellationReasonError sin abrir tx', async () => {
    const { uc, updateManyMock } = makeUc();
    await expect(
      uc.execute(ORGANIZER_ID, QR_ID, { reason: 'x'.repeat(501) }),
    ).rejects.toBeInstanceOf(InvalidCancellationReasonError);
    expect(updateManyMock).not.toHaveBeenCalled();
  });

  it('acepta reason exactamente en el límite (500 chars)', async () => {
    const { uc, updateManyMock } = makeUc();
    await uc.execute(ORGANIZER_ID, QR_ID, { reason: 'x'.repeat(500) });
    const persisted = updateManyMock.mock.calls[0]![0].data.cancellationReason;
    expect(typeof persisted === 'string' ? persisted.length : 0).toBe(500);
  });

  it('EC-03 QR inexistente ⇒ QrNotFoundError (404 uniforme)', async () => {
    const { uc } = makeUc({ qrRow: null });
    await expect(uc.execute(ORGANIZER_ID, QR_ID, {})).rejects.toBeInstanceOf(QrNotFoundError);
  });

  it('AUTH-TS-02 organizer ajeno ⇒ QrNotFoundError (404 uniforme, no filtra ownership)', async () => {
    const { uc } = makeUc({ organizerUserId: OTHER_ORGANIZER_ID });
    await expect(uc.execute(ORGANIZER_ID, QR_ID, {})).rejects.toBeInstanceOf(QrNotFoundError);
  });

  it('EC-02 QR en `expired` ⇒ QrNotCancellableError con current_status', async () => {
    const { uc } = makeUc({ qrRow: { status: QuoteRequestStatus.expired } });
    const err = await uc.execute(ORGANIZER_ID, QR_ID, {}).catch((e) => e);
    expect(err).toBeInstanceOf(QrNotCancellableError);
    expect((err as QrNotCancellableError).currentStatus).toBe('expired');
  });

  it('EC-06 idempotencia: re-cancel (status=cancelled) ⇒ QrNotCancellableError sin notifs', async () => {
    const { uc, notify, updateManyMock } = makeUc({
      qrRow: { status: QuoteRequestStatus.cancelled },
    });
    await expect(uc.execute(ORGANIZER_ID, QR_ID, {})).rejects.toBeInstanceOf(
      QrNotCancellableError,
    );
    expect(notify).not.toHaveBeenCalled();
    expect(updateManyMock).not.toHaveBeenCalled();
  });

  it('EC-01 BookingIntent confirmed_intent asociado ⇒ QrHasConfirmedBookingError con id', async () => {
    const { uc, notify, updateManyMock } = makeUc({ confirmedIntentId: CONFIRMED_BI_ID });
    const err = await uc.execute(ORGANIZER_ID, QR_ID, {}).catch((e) => e);
    expect(err).toBeInstanceOf(QrHasConfirmedBookingError);
    expect((err as QrHasConfirmedBookingError).bookingIntentId).toBe(CONFIRMED_BI_ID);
    // Ninguna mutación: check EXISTS ejecutado ANTES del UPDATE.
    expect(updateManyMock).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });

  it('carrera con guard defensivo (updatedCount=0) ⇒ QrNotCancellableError', async () => {
    // Simula que entre el SELECT FOR UPDATE y el UPDATE otro tx aisló el status.
    const { uc } = makeUc({ updatedCount: 0 });
    await expect(uc.execute(ORGANIZER_ID, QR_ID, {})).rejects.toBeInstanceOf(
      QrNotCancellableError,
    );
  });

  it('QR sin vendor asignado (vendor_profile_id=null) ⇒ NO emite notif, log OK', async () => {
    const { uc, notify, emit, updateManyMock } = makeUc({
      qrRow: { status: QuoteRequestStatus.viewed, vendor_profile_id: null },
    });
    await uc.execute(ORGANIZER_ID, QR_ID, {});
    expect(updateManyMock).toHaveBeenCalledTimes(1);
    expect(notify).not.toHaveBeenCalled();
    expect(emit).toHaveBeenCalledWith(
      'quote_request.cancelled',
      expect.objectContaining({ actorId: ORGANIZER_ID, quoteRequestId: QR_ID }),
    );
  });

  it('vendor asignado pero vendor_profile faltante (integridad rota) ⇒ update ok, sin notif', async () => {
    // El UC no colapsa a 404 en este caso (a diferencia de US-054): el cancel ya persistió, y sin
    // destinatario resoluble se omite el fan-out y se conserva el log operativo.
    const { uc, notify, updateManyMock } = makeUc({ vendorMissing: true });
    await uc.execute(ORGANIZER_ID, QR_ID, {});
    expect(updateManyMock).toHaveBeenCalledTimes(1);
    expect(notify).not.toHaveBeenCalled();
  });

  it('D8 rollback: fallo del NotificationSender propaga (tx revierte)', async () => {
    const { uc } = makeUc({ notifyThrows: true });
    await expect(uc.execute(ORGANIZER_ID, QR_ID, { reason: 'x' })).rejects.toThrow('notify-boom');
  });

  it('acepta los 3 estados origen (sent, viewed, responded) — DEV-01 (no preferred)', async () => {
    for (const status of [
      QuoteRequestStatus.sent,
      QuoteRequestStatus.viewed,
      QuoteRequestStatus.responded,
    ]) {
      const { uc } = makeUc({ qrRow: { status } });
      const view = await uc.execute(ORGANIZER_ID, QR_ID, {});
      expect(view.status).toBe('cancelled');
    }
  });
});
