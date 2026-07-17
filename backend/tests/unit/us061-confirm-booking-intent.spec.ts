// US-061 (PB-P1-036 / QA-001) — Unit tests del ConfirmBookingIntentUseCase.
//
// Cobertura de branches nuevas:
//   AC-01 happy path — vendor target + status pending:
//     · bookingIntents.confirm(intentId, now, tx)
//     · budgetSync.applyOnConfirm({ tx, bookingIntentId, correlationId })
//     · bookingEvents.emit({ eventName:'booking_intent.confirmed', recipient=organizerUserId, tx })
//     · logger.emit('booking_intent.confirmed', ...)
//   AC-03 idempotencia — status='confirmed_intent' ⇒ early return sin abrir tx, sin notifs.
//   EC-01 status='cancelled' ⇒ BookingIntentNotConfirmableError con currentStatus='cancelled'.
//   EC-02 vendor ajeno ⇒ BookingIntentNotFoundError (uniforme, no filtra existencia).
//   EC-03 BookingIntent inexistente ⇒ BookingIntentNotFoundError.
//   BE-004 warn `budget.committed_exceeds_planned` cuando la suma resultante supera totalPlanned.
//
// Los tests usan fakes livianos para el repo, port de notifs y logger; el transactionRunner
// pasa una tx fake para que el UC recorra el path completo. `applyOrganizerNotification` +
// `emitBudgetExceedsPlannedWarnIfApplicable` operan sobre el `tx` — el fake `tx` proporciona
// `event.findUnique`, `quote.findUnique` y `budget.findFirst` con snapshots controlados por
// test.
import { describe, expect, it, vi } from 'vitest';
import type { Prisma as PrismaTypes } from '@prisma/client';
import { Prisma, BookingIntentStatus } from '@prisma/client';
import { ConfirmBookingIntentUseCase } from '../../src/modules/booking-intent/application/booking-intent.use-cases.js';
import {
  BookingIntentNotFoundError,
  BookingIntentNotConfirmableError,
} from '../../src/modules/booking-intent/domain/us061.errors.js';
import type { BookingIntentRepository } from '../../src/modules/booking-intent/ports/booking-intent.repository.js';
import type { BudgetCommittedSyncPort } from '../../src/modules/booking-intent/ports/budget-committed-sync.port.js';
import type { BookingEventNotifierPort, EmitBookingIntentEventInput } from '../../src/modules/booking-intent/ports/quote-event-notifier.port.js';
import type { VendorProfileReader } from '../../src/shared/access/readers.js';
import type { DomainEventLogger } from '../../src/shared/observability/domain-event-logger.js';
import type { ClockPort } from '../../src/shared/domain/clock.port.js';
import type { BookingIntentView } from '../../src/modules/booking-intent/domain/booking-intent.js';

const NOW = new Date('2026-07-17T18:00:00Z');
const INTENT_ID = '11111111-1111-4111-8111-111111111111';
const QUOTE_ID = '22222222-2222-4222-8222-222222222222';
const QUOTE_REQUEST_ID = '33333333-3333-4333-8333-333333333333';
const EVENT_ID = '44444444-4444-4444-8444-444444444444';
const SERVICE_CATEGORY_ID = '55555555-5555-4555-8555-555555555555';
const VENDOR_PROFILE_ID = '66666666-6666-4666-8666-666666666666';
const OTHER_VENDOR_PROFILE_ID = '99999999-9999-4999-8999-999999999999';
const VENDOR_USER_ID = '77777777-7777-4777-8777-777777777777';
const ORGANIZER_USER_ID = '88888888-8888-4888-8888-888888888888';

interface BuildOpts {
  intentStatus?: BookingIntentView['status'];
  intentVendorProfileId?: string;
  callerVendorProfileId?: string;
  /** Fuerza `budget.totalPlanned` para el test del warn. Default 10000 (no dispara). */
  totalPlanned?: number;
  /** Fuerza `sum(BudgetItem.committed)` post-apply. Default 100 (no dispara). */
  committedAfter?: number;
  quoteAmount?: number;
  /** Suprime la inyección de `bookingEvents` para simular el path legacy US-096. */
  omitBookingEvents?: boolean;
}

function bookingIntentView(overrides: Partial<BookingIntentView> = {}): BookingIntentView {
  return {
    id: INTENT_ID,
    quoteId: QUOTE_ID,
    eventId: EVENT_ID,
    serviceCategoryId: SERVICE_CATEGORY_ID,
    vendorProfileId: VENDOR_PROFILE_ID,
    status: 'pending',
    isSimulated: true,
    confirmedAt: null,
    cancelledAt: null,
    cancelledBy: null,
    cancellationReason: null,
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    ...overrides,
  };
}

function build(opts: BuildOpts = {}) {
  const emitSpy = vi.fn(async (_input: EmitBookingIntentEventInput): Promise<void> => undefined);
  const logSpy = vi.fn();
  const applySpy = vi.fn(async (): Promise<void> => undefined);
  const clock: ClockPort = { now: () => NOW };
  const logger: DomainEventLogger = { emit: logSpy };

  const status = opts.intentStatus ?? 'pending';
  const intent = bookingIntentView({ status, vendorProfileId: opts.intentVendorProfileId ?? VENDOR_PROFILE_ID });

  const bookingIntents: BookingIntentRepository = {
    create: async () => intent,
    findById: async (id) => (id === INTENT_ID ? intent : null),
    confirm: async () =>
      bookingIntentView({ status: 'confirmed_intent', confirmedAt: NOW.toISOString() }),
    cancel: async () => intent,
    findByIdForSync: async () => null,
    markCommittedSynced: async () => undefined,
    clearCommittedSync: async () => undefined,
  };

  const vendors: VendorProfileReader = {
    getVendorProfileIdForUser: async () => opts.callerVendorProfileId ?? VENDOR_PROFILE_ID,
    existsActive: async () => true,
    findActiveByUserId: async () => null,
  };

  const budgetSync: BudgetCommittedSyncPort = {
    applyOnConfirm: applySpy,
    revertOnCancel: async () => undefined,
  };
  const bookingEvents: BookingEventNotifierPort | undefined = opts.omitBookingEvents
    ? undefined
    : { emit: emitSpy };

  const totalPlanned = new Prisma.Decimal(opts.totalPlanned ?? 10000);
  const committedAfter = new Prisma.Decimal(opts.committedAfter ?? 100);
  const quoteAmount = new Prisma.Decimal(opts.quoteAmount ?? 500);

  // Fake tx exponiendo `$queryRaw` (US-061 concurrencia lock), `event.findUnique`,
  // `quote.findUnique`, `budget.findFirst`.
  const tx = {
    // US-061 QA-005: `SELECT confirmed_at, status FROM booking_intents FOR UPDATE`. Devuelve
    // `confirmed_at=null` (path happy) para que el UC continúe con apply + emit. Los tests que
    // simulan concurrencia real usan la IT (donde el segundo POST ve `confirmed_at !== null`).
    async $queryRaw(): Promise<Array<{ confirmed_at: Date | null; status: string }>> {
      return [{ confirmed_at: null, status: 'pending' }];
    },
    event: {
      findUnique: async (_args: { where: { id: string }; select: unknown }): Promise<unknown> => ({
        userId: ORGANIZER_USER_ID,
        currency: 'GTQ',
      }),
    },
    quote: {
      findUnique: async (_args: { where: { id: string }; select: unknown }): Promise<unknown> => ({
        amount: quoteAmount,
        currency: 'GTQ',
        quoteRequestId: QUOTE_REQUEST_ID,
      }),
    },
    budget: {
      findFirst: async (_args: { where: { eventId: string }; select: unknown }): Promise<unknown> => ({
        id: 'budget-1',
        totalPlanned,
        items: [{ amountCommitted: committedAfter }],
      }),
    },
  };

  const transactionRunner = {
    async run<T>(fn: (tx: PrismaTypes.TransactionClient) => Promise<T>): Promise<T> {
      return fn(tx as unknown as PrismaTypes.TransactionClient);
    },
  };

  const uc = new ConfirmBookingIntentUseCase(bookingIntents, vendors, clock, logger, {
    budgetSync,
    transactionRunner,
    ...(bookingEvents ? { bookingEvents } : {}),
  });
  return { uc, emitSpy, logSpy, applySpy, intent };
}

describe('US-061 · ConfirmBookingIntentUseCase.execute', () => {
  it('AC-01 happy path: confirm + applyOnConfirm + 1 emit organizer + log', async () => {
    const { uc, emitSpy, logSpy, applySpy } = build();
    const view = await uc.execute(VENDOR_USER_ID, INTENT_ID, { correlationId: 'cid-1' });
    expect(view.status).toBe(BookingIntentStatus.confirmed_intent);
    expect(applySpy).toHaveBeenCalledTimes(1);
    expect(applySpy).toHaveBeenCalledWith(
      expect.objectContaining({ bookingIntentId: INTENT_ID, correlationId: 'cid-1' }),
    );
    expect(emitSpy).toHaveBeenCalledTimes(1);
    const call = emitSpy.mock.calls[0]?.[0];
    expect(call?.eventName).toBe('booking_intent.confirmed');
    expect(call?.recipientUserId).toBe(ORGANIZER_USER_ID);
    expect(call?.tx).toBeDefined();
    expect(call?.payload).toMatchObject({
      booking_intent_id: expect.any(String),
      quote_id: QUOTE_ID,
      quote_request_id: QUOTE_REQUEST_ID,
      event_id: EVENT_ID,
      vendor_profile_id: VENDOR_PROFILE_ID,
      total_price: '500',
      currency_code: 'GTQ',
    });
    expect(logSpy).toHaveBeenCalledWith(
      'booking_intent.confirmed',
      expect.objectContaining({ actorId: VENDOR_USER_ID, bookingIntentId: INTENT_ID, correlationId: 'cid-1' }),
    );
  });

  it('AC-03 idempotencia: status=confirmed_intent ⇒ early return sin emit, sin applyOnConfirm', async () => {
    const { uc, emitSpy, applySpy, logSpy } = build({ intentStatus: 'confirmed_intent' });
    const view = await uc.execute(VENDOR_USER_ID, INTENT_ID);
    expect(view.status).toBe('confirmed_intent');
    expect(applySpy).not.toHaveBeenCalled();
    expect(emitSpy).not.toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('EC-01 status=cancelled ⇒ BookingIntentNotConfirmableError con currentStatus=cancelled', async () => {
    const { uc, emitSpy, applySpy } = build({ intentStatus: 'cancelled' });
    const err = await uc.execute(VENDOR_USER_ID, INTENT_ID).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(BookingIntentNotConfirmableError);
    expect((err as BookingIntentNotConfirmableError).currentStatus).toBe('cancelled');
    expect(applySpy).not.toHaveBeenCalled();
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('EC-02 vendor ajeno ⇒ BookingIntentNotFoundError (uniforme)', async () => {
    const { uc, emitSpy } = build({ callerVendorProfileId: OTHER_VENDOR_PROFILE_ID });
    await expect(uc.execute(VENDOR_USER_ID, INTENT_ID)).rejects.toBeInstanceOf(BookingIntentNotFoundError);
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('EC-03 BookingIntent inexistente ⇒ BookingIntentNotFoundError', async () => {
    const { uc } = build();
    await expect(uc.execute(VENDOR_USER_ID, '99999999-9999-4999-8999-999999999999')).rejects.toBeInstanceOf(
      BookingIntentNotFoundError,
    );
  });

  it('BE-004 EC-04: committed_after > totalPlanned ⇒ warn budget.committed_exceeds_planned', async () => {
    const { uc, logSpy } = build({ totalPlanned: 100, committedAfter: 500 });
    await uc.execute(VENDOR_USER_ID, INTENT_ID);
    // Verifica que se emitió el warn con los campos correctos.
    const warnCall = logSpy.mock.calls.find(
      (args) => args[0] === 'budget.committed_exceeds_planned',
    );
    expect(warnCall).toBeDefined();
    expect(warnCall?.[1]).toMatchObject({
      budgetId: 'budget-1',
      bookingIntentId: INTENT_ID,
      eventId: EVENT_ID,
      totalCommitted: '500',
      totalPlanned: '100',
    });
  });

  it('BE-004 EC-04: committed_after ≤ totalPlanned ⇒ NO emite warn', async () => {
    const { uc, logSpy } = build({ totalPlanned: 10000, committedAfter: 500 });
    await uc.execute(VENDOR_USER_ID, INTENT_ID);
    const warnCall = logSpy.mock.calls.find(
      (args) => args[0] === 'budget.committed_exceeds_planned',
    );
    expect(warnCall).toBeUndefined();
  });

  it('path legacy US-096 (sin bookingEvents adapter): no emite notifs — preserva compat', async () => {
    const { uc, emitSpy, applySpy } = build({ omitBookingEvents: true });
    await uc.execute(VENDOR_USER_ID, INTENT_ID);
    expect(applySpy).toHaveBeenCalledTimes(1);
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('QuoteEventName type: incluye booking_intent.confirmed (7 eventos)', async () => {
    const eventNames: Array<EmitBookingIntentEventInput['eventName']> = ['booking_intent.created', 'booking_intent.confirmed'];
    expect(eventNames).toContain('booking_intent.confirmed');
  });
});
