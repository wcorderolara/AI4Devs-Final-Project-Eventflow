// Use cases de BookingIntent (US-096 / BE-007). AC-10/11/12. Flujo simulado (sin pagos/contratos).
import type { BookingIntentRepository, QuoteContextReader } from '../ports/booking-intent.repository.js';
import type { EventAccessReader, VendorProfileReader } from '../../../shared/access/readers.js';
import type { DomainEventLogger } from '../../../shared/observability/domain-event-logger.js';
import type { ClockPort } from '../../../shared/domain/clock.port.js';
import type { BookingIntentView } from '../domain/booking-intent.js';
import { canCancelBooking, canConfirmBooking } from '../domain/booking-policies.js';
import { requireEventOwner, requireVendorProfileId } from '../../../shared/access/authz.js';
import { NotFoundError } from '../../../shared/domain/errors/not-found.error.js';
import { BusinessRuleViolationError } from '../../../shared/domain/errors/business-rule-violation.error.js';
import { QuoteExpiredError } from '../../../shared/domain/errors/quote-flow.errors.js';
import { ErrorCodes } from '../../../shared/domain/errors/error-codes.js';

export interface BookingUseCaseContext {
  correlationId?: string;
}

function invalidBookingState(message: string, status: string): BusinessRuleViolationError {
  return new BusinessRuleViolationError(ErrorCodes.BUSINESS_RULE_VIOLATION, message, [
    { field: 'status', message: `Booking intent is ${status}` },
  ]);
}

export class CreateBookingIntentUseCase {
  constructor(
    private readonly bookingIntents: BookingIntentRepository,
    private readonly quotes: QuoteContextReader,
    private readonly events: EventAccessReader,
    private readonly clock: ClockPort,
    private readonly logger: DomainEventLogger,
  ) {}

  async execute(userId: string, quoteId: string, ctx: BookingUseCaseContext = {}): Promise<BookingIntentView> {
    const q = await this.quotes.findQuoteContext(quoteId);
    if (!q) throw new NotFoundError('Quote not found');
    await requireEventOwner(this.events, q.eventId, userId);

    if (q.status !== 'accepted') {
      throw new BusinessRuleViolationError(
        ErrorCodes.BUSINESS_RULE_VIOLATION,
        'Booking intents can only be created from an accepted quote',
        [{ field: 'status', message: `Quote is ${q.status}` }],
      );
    }
    if (q.validUntil && q.validUntil.getTime() < this.clock.now().getTime()) {
      throw new QuoteExpiredError();
    }

    const view = await this.bookingIntents.create({
      quoteId: q.quoteId,
      eventId: q.eventId,
      serviceCategoryId: q.serviceCategoryId,
      vendorProfileId: q.vendorProfileId,
    });
    this.logger.emit('booking_intent.created', { correlationId: ctx.correlationId, actorId: userId, bookingIntentId: view.id });
    return view;
  }
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

export class ConfirmBookingIntentUseCase {
  constructor(
    private readonly bookingIntents: BookingIntentRepository,
    private readonly vendors: VendorProfileReader,
    private readonly clock: ClockPort,
    private readonly logger: DomainEventLogger,
  ) {}

  async execute(userId: string, bookingIntentId: string, ctx: BookingUseCaseContext = {}): Promise<BookingIntentView> {
    const bi = await this.bookingIntents.findById(bookingIntentId);
    if (!bi) throw new NotFoundError('Booking intent not found');
    const vpId = await requireVendorProfileId(this.vendors, userId);
    if (bi.vendorProfileId !== vpId) throw new NotFoundError('Not found');
    if (!canConfirmBooking(bi.status)) throw invalidBookingState('Only pending booking intents can be confirmed', bi.status);
    const view = await this.bookingIntents.confirm(bookingIntentId, this.clock.now());
    this.logger.emit('booking_intent.confirmed', { correlationId: ctx.correlationId, actorId: userId, bookingIntentId });
    return view;
  }
}

export class CancelBookingIntentUseCase {
  constructor(
    private readonly bookingIntents: BookingIntentRepository,
    private readonly events: EventAccessReader,
    private readonly vendors: VendorProfileReader,
    private readonly clock: ClockPort,
    private readonly logger: DomainEventLogger,
  ) {}

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
    const view = await this.bookingIntents.cancel({ id: bookingIntentId, now: this.clock.now(), cancelledBy: userId, reason });
    this.logger.emit('booking_intent.cancelled', { correlationId: ctx.correlationId, actorId: userId, bookingIntentId });
    return view;
  }
}
