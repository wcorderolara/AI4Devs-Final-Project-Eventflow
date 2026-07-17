// Use cases de BookingIntent — get/confirm/cancel (US-096 / BE-007). Flujo simulado.
// US-039 (PB-P1-023): Confirm/Cancel envuelven la escritura + el sync `BudgetItem.committed` en
// una `prisma.$transaction` compartida cuando se inyecta `budgetSync` y `transactionRunner`.
// US-060 (PB-P1-036 / BE-003): la creación del BookingIntent se movió a
// `CreateBookingIntentUs060UseCase` — endpoint atómico que fusiona aceptación de Quote +
// creación del intent + fan-out de notificaciones dentro de una única `prisma.$transaction`
// (D1..D5). El use case original (US-096) queda retirado del wiring — DEV-03 del execution record.
import type { Prisma } from '@prisma/client';
import type { BookingIntentRepository } from '../ports/booking-intent.repository.js';
import type {
  BudgetCommittedSyncPort,
} from '../ports/budget-committed-sync.port.js';
import { NoopBudgetCommittedSync } from '../ports/budget-committed-sync.port.js';
import type { EventAccessReader, VendorProfileReader } from '../../../shared/access/readers.js';
import type { DomainEventLogger } from '../../../shared/observability/domain-event-logger.js';
import type { ClockPort } from '../../../shared/domain/clock.port.js';
import type { BookingIntentView } from '../domain/booking-intent.js';
import { canCancelBooking, canConfirmBooking } from '../domain/booking-policies.js';
import { requireEventOwner, requireVendorProfileId } from '../../../shared/access/authz.js';
import { NotFoundError } from '../../../shared/domain/errors/not-found.error.js';
import { BusinessRuleViolationError } from '../../../shared/domain/errors/business-rule-violation.error.js';
import { ErrorCodes } from '../../../shared/domain/errors/error-codes.js';

export interface BookingUseCaseContext {
  correlationId?: string;
}

function invalidBookingState(message: string, status: string): BusinessRuleViolationError {
  return new BusinessRuleViolationError(ErrorCodes.BUSINESS_RULE_VIOLATION, message, [
    { field: 'status', message: `Booking intent is ${status}` },
  ]);
}

/** Autoriza acceso a un BookingIntent: organizer owner O vendor asignado; si no, 404. */
async function authorizeBookingAccess(
  bi: BookingIntentView,
  userId: string,
  role: string,
  events: EventAccessReader,
  vendors: VendorProfileReader,
): Promise<void> {
  if (role === 'organizer') {
    await requireEventOwner(events, bi.eventId, userId);
    return;
  }
  if (role === 'vendor') {
    const vpId = await requireVendorProfileId(vendors, userId);
    if (bi.vendorProfileId !== vpId) throw new NotFoundError('Not found');
    return;
  }
  throw new NotFoundError('Not found');
}

export class GetBookingIntentUseCase {
  constructor(
    private readonly bookingIntents: BookingIntentRepository,
    private readonly events: EventAccessReader,
    private readonly vendors: VendorProfileReader,
  ) {}

  async execute(userId: string, role: string, bookingIntentId: string): Promise<BookingIntentView> {
    const bi = await this.bookingIntents.findById(bookingIntentId);
    if (!bi) throw new NotFoundError('Booking intent not found');
    await authorizeBookingAccess(bi, userId, role, this.events, this.vendors);
    return bi;
  }
}

/** US-039: runner mínimo para envolver el confirm/cancel + sync en una sola transacción. */
export interface TransactionRunner {
  run<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
}

export class ConfirmBookingIntentUseCase {
  private readonly budgetSync: BudgetCommittedSyncPort;
  private readonly tx: TransactionRunner | null;

  constructor(
    private readonly bookingIntents: BookingIntentRepository,
    private readonly vendors: VendorProfileReader,
    private readonly clock: ClockPort,
    private readonly logger: DomainEventLogger,
    options: { budgetSync?: BudgetCommittedSyncPort; transactionRunner?: TransactionRunner } = {},
  ) {
    this.budgetSync = options.budgetSync ?? NoopBudgetCommittedSync;
    this.tx = options.transactionRunner ?? null;
  }

  async execute(userId: string, bookingIntentId: string, ctx: BookingUseCaseContext = {}): Promise<BookingIntentView> {
    const bi = await this.bookingIntents.findById(bookingIntentId);
    if (!bi) throw new NotFoundError('Booking intent not found');
    const vpId = await requireVendorProfileId(this.vendors, userId);
    if (bi.vendorProfileId !== vpId) throw new NotFoundError('Not found');
    if (!canConfirmBooking(bi.status)) throw invalidBookingState('Only pending booking intents can be confirmed', bi.status);

    const view = this.tx
      ? await this.tx.run(async (tx) => {
          const v = await this.bookingIntents.confirm(bookingIntentId, this.clock.now(), tx);
          await this.budgetSync.applyOnConfirm({ bookingIntentId, tx, correlationId: ctx.correlationId });
          return v;
        })
      : await this.bookingIntents.confirm(bookingIntentId, this.clock.now());
    this.logger.emit('booking_intent.confirmed', { correlationId: ctx.correlationId, actorId: userId, bookingIntentId });
    return view;
  }
}

export class CancelBookingIntentUseCase {
  private readonly budgetSync: BudgetCommittedSyncPort;
  private readonly tx: TransactionRunner | null;

  constructor(
    private readonly bookingIntents: BookingIntentRepository,
    private readonly events: EventAccessReader,
    private readonly vendors: VendorProfileReader,
    private readonly clock: ClockPort,
    private readonly logger: DomainEventLogger,
    options: { budgetSync?: BudgetCommittedSyncPort; transactionRunner?: TransactionRunner } = {},
  ) {
    this.budgetSync = options.budgetSync ?? NoopBudgetCommittedSync;
    this.tx = options.transactionRunner ?? null;
  }

  async execute(
    userId: string,
    role: string,
    bookingIntentId: string,
    reason: string,
    ctx: BookingUseCaseContext = {},
  ): Promise<BookingIntentView> {
    const bi = await this.bookingIntents.findById(bookingIntentId);
    if (!bi) throw new NotFoundError('Booking intent not found');
    await authorizeBookingAccess(bi, userId, role, this.events, this.vendors);
    if (!canCancelBooking(bi.status)) throw invalidBookingState('Booking intent cannot be cancelled in its current state', bi.status);

    const now = this.clock.now();
    const view = this.tx
      ? await this.tx.run(async (tx) => {
          const v = await this.bookingIntents.cancel(
            { id: bookingIntentId, now, cancelledBy: userId, reason },
            tx,
          );
          await this.budgetSync.revertOnCancel({
            bookingIntentId,
            tx,
            cancellation: { at: now, by: userId, reason },
            correlationId: ctx.correlationId,
          });
          return v;
        })
      : await this.bookingIntents.cancel({ id: bookingIntentId, now, cancelledBy: userId, reason });
    this.logger.emit('booking_intent.cancelled', { correlationId: ctx.correlationId, actorId: userId, bookingIntentId });
    return view;
  }
}
