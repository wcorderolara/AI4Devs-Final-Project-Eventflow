// US-062 (PB-P1-036 / QA-001) — Unit tests del CancelBookingIntentUseCase.
//
// Cobertura:
//   AC-01 happy path organizer sobre confirmed_intent: cancel + revert + emit vendor + log.
//   AC-01 happy path vendor sobre confirmed_intent: cancel + revert + emit organizer + log.
//   AC-02 cancel sobre pending: cancel + SIN revert + emit contraparte.
//   AC-03 cancel sin `reason`: persiste cancellation_reason=null en el payload.
//   EC-01 status='cancelled' ⇒ BookingIntentNotCancellableError (contract NON idempotente).
//   EC-02 vendor ajeno ⇒ BookingIntentNotFoundError (uniforme).
//   EC-03 intent inexistente ⇒ BookingIntentNotFoundError.
//   BE-006/EC-06 underflow warn cuando amountCommitted < syncedAmount.
//   DTO branches: reason opcional, trim, max 500, .strict().
import { describe, expect, it, vi } from 'vitest';
import type { Prisma as PrismaTypes } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { CancelBookingIntentUseCase } from '../../src/modules/booking-intent/application/booking-intent.use-cases.js';
import { CancelBookingIntentUs062RequestSchema } from '../../src/modules/booking-intent/dto/cancel-booking-intent.request.js';
import { BookingIntentNotCancellableError } from '../../src/modules/booking-intent/domain/us062.errors.js';
import { BookingIntentNotFoundError } from '../../src/modules/booking-intent/domain/us061.errors.js';
import type { BookingIntentRepository } from '../../src/modules/booking-intent/ports/booking-intent.repository.js';
import type { BudgetCommittedSyncPort } from '../../src/modules/booking-intent/ports/budget-committed-sync.port.js';
import type { BookingEventNotifierPort, EmitBookingIntentEventInput } from '../../src/modules/booking-intent/ports/quote-event-notifier.port.js';
import type { EventAccessReader, VendorProfileReader } from '../../src/shared/access/readers.js';
import type { DomainEventLogger } from '../../src/shared/observability/domain-event-logger.js';
import type { ClockPort } from '../../src/shared/domain/clock.port.js';
import type { BookingIntentView, BookingIntentStatusValue } from '../../src/modules/booking-intent/domain/booking-intent.js';

const NOW = new Date('2026-07-17T19:00:00Z');
const INTENT_ID = '11111111-1111-4111-8111-111111111111';
const QUOTE_ID = '22222222-2222-4222-8222-222222222222';
const QUOTE_REQUEST_ID = '33333333-3333-4333-8333-333333333333';
const EVENT_ID = '44444444-4444-4444-8444-444444444444';
const SERVICE_CATEGORY_ID = '55555555-5555-4555-8555-555555555555';
const VENDOR_PROFILE_ID = '66666666-6666-4666-8666-666666666666';
const OTHER_VENDOR_PROFILE_ID = '99999999-9999-4999-8999-999999999999';
const VENDOR_USER_ID = '77777777-7777-4777-8777-777777777777';
const ORGANIZER_USER_ID = '88888888-8888-4888-8888-888888888888';
const OTHER_ORGANIZER_USER_ID = 'aaaaaaaa-1111-4111-8111-111111111111';

interface BuildOpts {
  intentStatus?: BookingIntentStatusValue;
  intentVendorProfileId?: string;
  callerVendorProfileId?: string;
  eventOwnerId?: string;
  /** Fuerza `amountCommitted` del BudgetItem para el underflow test. */
  amountCommitted?: number;
  /** `committed_synced_amount` guardado por US-039 apply (default = quote.amount). */
  syncedAmount?: number | null;
  quoteAmount?: number;
  omitBookingEvents?: boolean;
  /** Simula el segundo POST concurrente: el SELECT FOR UPDATE devuelve cancelled_at != null. */
  alreadyCancelled?: boolean;
}

function bookingIntentView(overrides: Partial<BookingIntentView> = {}): BookingIntentView {
  return {
    id: INTENT_ID,
    quoteId: QUOTE_ID,
    eventId: EVENT_ID,
    serviceCategoryId: SERVICE_CATEGORY_ID,
    vendorProfileId: VENDOR_PROFILE_ID,
    status: 'confirmed_intent',
    isSimulated: true,
    confirmedAt: NOW.toISOString(),
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
  const revertSpy = vi.fn(async (): Promise<void> => undefined);
  const clock: ClockPort = { now: () => NOW };
  const logger: DomainEventLogger = { emit: logSpy };

  const status = opts.intentStatus ?? 'confirmed_intent';
  const intent = bookingIntentView({ status, vendorProfileId: opts.intentVendorProfileId ?? VENDOR_PROFILE_ID });
  const cancelledIntent = bookingIntentView({
    status: 'cancelled',
    cancelledAt: NOW.toISOString(),
    cancelledBy: opts.eventOwnerId ?? ORGANIZER_USER_ID,
    cancellationReason: null,
  });

  const bookingIntents: BookingIntentRepository = {
    create: async () => intent,
    findById: async (id) => (id === INTENT_ID ? intent : null),
    confirm: async () => intent,
    cancel: async () => cancelledIntent,
    findByIdForSync: async () => null,
    markCommittedSynced: async () => undefined,
    clearCommittedSync: async () => undefined,
  };
  const configuredOwnerId = opts.eventOwnerId ?? ORGANIZER_USER_ID;
  const events: EventAccessReader = {
    async getOwnerId(eventId) {
      return eventId === EVENT_ID ? configuredOwnerId : null;
    },
    async getCurrency() {
      return 'GTQ';
    },
    async findOwnedEvent(eventId, ownerId) {
      if (eventId !== EVENT_ID || ownerId !== configuredOwnerId) return null;
      return { id: EVENT_ID, currency: 'GTQ', status: 'active' };
    },
  };
  const vendors: VendorProfileReader = {
    getVendorProfileIdForUser: async () => opts.callerVendorProfileId ?? VENDOR_PROFILE_ID,
    existsActive: async () => true,
    findActiveByUserId: async () => null,
  };
  const budgetSync: BudgetCommittedSyncPort = {
    applyOnConfirm: async () => undefined,
    revertOnCancel: revertSpy,
  };
  const bookingEvents: BookingEventNotifierPort | undefined = opts.omitBookingEvents
    ? undefined
    : { emit: emitSpy };

  const syncedAmount = new Prisma.Decimal(opts.syncedAmount ?? opts.quoteAmount ?? 500);
  const amountCommitted = new Prisma.Decimal(opts.amountCommitted ?? 1000);

  const tx = {
    async $queryRaw(): Promise<Array<{ cancelled_at: Date | null; status: string }>> {
      return opts.alreadyCancelled
        ? [{ cancelled_at: NOW, status: 'cancelled' }]
        : [{ cancelled_at: null, status }];
    },
    bookingIntent: {
      findUnique: async (): Promise<unknown> => ({
        committedSyncedAmount: syncedAmount,
        eventId: EVENT_ID,
        serviceCategoryId: SERVICE_CATEGORY_ID,
        quote: { amount: syncedAmount },
        event: {
          budget: {
            id: 'budget-1',
            items: [{ id: 'item-1', categoryCode: 'catering', amountCommitted }],
          },
        },
        serviceCategory: { code: 'catering' },
      }),
    },
    event: {
      findUnique: async (): Promise<unknown> => ({
        userId: opts.eventOwnerId ?? ORGANIZER_USER_ID,
      }),
    },
    quote: {
      findUnique: async (): Promise<unknown> => ({
        quoteRequestId: QUOTE_REQUEST_ID,
        vendorProfileId: VENDOR_PROFILE_ID,
        vendorProfile: { userId: VENDOR_USER_ID },
      }),
    },
  };

  const transactionRunner = {
    async run<T>(fn: (tx: PrismaTypes.TransactionClient) => Promise<T>): Promise<T> {
      return fn(tx as unknown as PrismaTypes.TransactionClient);
    },
  };

  const uc = new CancelBookingIntentUseCase(bookingIntents, events, vendors, clock, logger, {
    budgetSync,
    transactionRunner,
    ...(bookingEvents ? { bookingEvents } : {}),
  });
  return { uc, emitSpy, logSpy, revertSpy };
}

describe('US-062 · CancelBookingIntentUs062RequestSchema', () => {
  it('AC-03 acepta body vacío (cancel sin reason)', () => {
    expect(CancelBookingIntentUs062RequestSchema.safeParse({}).success).toBe(true);
  });
  it('acepta `reason` string dentro del rango 0..500', () => {
    expect(CancelBookingIntentUs062RequestSchema.safeParse({ reason: 'cambio de planes' }).success).toBe(true);
    expect(CancelBookingIntentUs062RequestSchema.safeParse({ reason: '' }).success).toBe(true);
    expect(CancelBookingIntentUs062RequestSchema.safeParse({ reason: 'x'.repeat(500) }).success).toBe(true);
  });
  it('rechaza `reason` > 500 chars', () => {
    expect(CancelBookingIntentUs062RequestSchema.safeParse({ reason: 'x'.repeat(501) }).success).toBe(false);
  });
  it('rechaza campos ajenos (.strict())', () => {
    expect(CancelBookingIntentUs062RequestSchema.safeParse({ reason: 'ok', extra: 1 }).success).toBe(false);
  });
});

describe('US-062 · CancelBookingIntentUseCase.execute', () => {
  it('AC-01 organizer sobre confirmed_intent: cancel + revert + emit vendor + log', async () => {
    const { uc, emitSpy, logSpy, revertSpy } = build();
    const view = await uc.execute(ORGANIZER_USER_ID, 'organizer', INTENT_ID, 'sin disponibilidad', { correlationId: 'cid-1' });
    expect(view.status).toBe('cancelled');
    expect(revertSpy).toHaveBeenCalledTimes(1);
    expect(emitSpy).toHaveBeenCalledTimes(1);
    const call = emitSpy.mock.calls[0]?.[0];
    expect(call?.eventName).toBe('booking_intent.cancelled');
    expect(call?.recipientUserId).toBe(VENDOR_USER_ID);
    expect(call?.payload).toMatchObject({
      booking_intent_id: INTENT_ID,
      quote_id: QUOTE_ID,
      quote_request_id: QUOTE_REQUEST_ID,
      event_id: EVENT_ID,
      cancelled_by_role: 'organizer',
      cancellation_reason: 'sin disponibilidad',
      committed_reverted: true,
    });
    expect(logSpy).toHaveBeenCalledWith(
      'booking_intent.cancelled',
      expect.objectContaining({ actorId: ORGANIZER_USER_ID, bookingIntentId: INTENT_ID }),
    );
  });

  it('AC-01 vendor sobre confirmed_intent: cancel + revert + emit organizer', async () => {
    const { uc, emitSpy, revertSpy } = build();
    const view = await uc.execute(VENDOR_USER_ID, 'vendor', INTENT_ID, null);
    expect(view.status).toBe('cancelled');
    expect(revertSpy).toHaveBeenCalledTimes(1);
    const call = emitSpy.mock.calls[0]?.[0];
    expect(call?.recipientUserId).toBe(ORGANIZER_USER_ID);
    expect(call?.payload).toMatchObject({
      cancelled_by_role: 'vendor',
      cancellation_reason: null,
      committed_reverted: true,
    });
  });

  it('AC-02 cancel sobre pending: cancel + SIN revert + emit contraparte', async () => {
    const { uc, emitSpy, revertSpy } = build({ intentStatus: 'pending' });
    await uc.execute(ORGANIZER_USER_ID, 'organizer', INTENT_ID, 'cambio de planes');
    expect(revertSpy).not.toHaveBeenCalled();
    const call = emitSpy.mock.calls[0]?.[0];
    expect(call?.payload).toMatchObject({
      cancelled_by_role: 'organizer',
      committed_reverted: false,
    });
  });

  it('AC-03 cancel sin reason (cadena vacía tras trim): persiste null en payload', async () => {
    const { uc, emitSpy } = build();
    await uc.execute(ORGANIZER_USER_ID, 'organizer', INTENT_ID, '   ');
    const call = emitSpy.mock.calls[0]?.[0];
    expect(call?.payload).toMatchObject({ cancellation_reason: null });
  });

  it('EC-01 status=cancelled ⇒ BookingIntentNotCancellableError con currentStatus=cancelled', async () => {
    const { uc, emitSpy, revertSpy } = build({ intentStatus: 'cancelled' });
    const err = await uc.execute(ORGANIZER_USER_ID, 'organizer', INTENT_ID, null).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(BookingIntentNotCancellableError);
    expect((err as BookingIntentNotCancellableError).currentStatus).toBe('cancelled');
    expect(revertSpy).not.toHaveBeenCalled();
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('EC-02 organizer ajeno ⇒ BookingIntentNotFoundError (uniforme)', async () => {
    const { uc, emitSpy } = build({ eventOwnerId: OTHER_ORGANIZER_USER_ID });
    await expect(uc.execute(ORGANIZER_USER_ID, 'organizer', INTENT_ID, null)).rejects.toBeInstanceOf(BookingIntentNotFoundError);
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('EC-02 vendor ajeno ⇒ BookingIntentNotFoundError (uniforme)', async () => {
    const { uc, emitSpy } = build({ callerVendorProfileId: OTHER_VENDOR_PROFILE_ID });
    await expect(uc.execute(VENDOR_USER_ID, 'vendor', INTENT_ID, null)).rejects.toBeInstanceOf(BookingIntentNotFoundError);
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('EC-03 intent inexistente ⇒ BookingIntentNotFoundError', async () => {
    const { uc } = build();
    await expect(uc.execute(ORGANIZER_USER_ID, 'organizer', '99999999-9999-4999-8999-999999999999', null)).rejects.toBeInstanceOf(
      BookingIntentNotFoundError,
    );
  });

  it('DEV-05 concurrencia: segundo cancel ve cancelled_at != null ⇒ 409 con current_status=cancelled', async () => {
    const { uc, emitSpy, revertSpy } = build({ alreadyCancelled: true });
    const err = await uc.execute(ORGANIZER_USER_ID, 'organizer', INTENT_ID, null).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(BookingIntentNotCancellableError);
    expect(revertSpy).not.toHaveBeenCalled();
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('BE-006/EC-06 underflow: amountCommitted < syncedAmount ⇒ warn budget.committed_underflow_corrected', async () => {
    const { uc, logSpy } = build({ amountCommitted: 100, syncedAmount: 500 });
    await uc.execute(ORGANIZER_USER_ID, 'organizer', INTENT_ID, null);
    const warnCall = logSpy.mock.calls.find(
      (args) => args[0] === 'budget.committed_underflow_corrected',
    );
    expect(warnCall).toBeDefined();
    expect(warnCall?.[1]).toMatchObject({
      budgetId: 'budget-1',
      budgetItemId: 'item-1',
      bookingIntentId: INTENT_ID,
      previousCommitted: '100',
      attemptedSubtraction: '500',
    });
  });

  it('BE-006 sin underflow: amountCommitted >= syncedAmount ⇒ NO emite warn', async () => {
    const { uc, logSpy } = build({ amountCommitted: 1000, syncedAmount: 500 });
    await uc.execute(ORGANIZER_USER_ID, 'organizer', INTENT_ID, null);
    const warnCall = logSpy.mock.calls.find(
      (args) => args[0] === 'budget.committed_underflow_corrected',
    );
    expect(warnCall).toBeUndefined();
  });

  it('path legacy US-096 (sin bookingEvents adapter): no emite notifs — preserva compat', async () => {
    const { uc, emitSpy, revertSpy } = build({ omitBookingEvents: true });
    await uc.execute(ORGANIZER_USER_ID, 'organizer', INTENT_ID, null);
    expect(revertSpy).toHaveBeenCalledTimes(1);
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('QuoteEventName type: incluye booking_intent.cancelled (8 eventos)', () => {
    const names: Array<EmitBookingIntentEventInput['eventName']> = ['booking_intent.created', 'booking_intent.confirmed', 'booking_intent.cancelled'];
    expect(names).toContain('booking_intent.cancelled');
  });
});
