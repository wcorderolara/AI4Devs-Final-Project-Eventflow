// Use cases de Quote (US-096 / BE-005). AC-07/08/09. Vendor crea/edita/envía; organizer decide.
import type { QuoteRepository, QuoteRequestRepository } from '../ports/quote-flow.repositories.js';
import type { EventAccessReader, VendorProfileReader } from '../../../shared/access/readers.js';
import type { DomainEventLogger } from '../../../shared/observability/domain-event-logger.js';
import type { ClockPort } from '../../../shared/domain/clock.port.js';
import type { QuoteView } from '../domain/quote.js';
import {
  canDecideQuote,
  canEditQuote,
  canSendQuote,
  defaultValidUntil,
  isQuoteExpired,
} from '../domain/quote-policies.js';
import type { CreateQuoteRequestBody, UpdateQuoteRequestBody } from '../dto/index.js';
import { NotFoundError } from '../../../shared/domain/errors/not-found.error.js';
import { BusinessRuleViolationError } from '../../../shared/domain/errors/business-rule-violation.error.js';
import { QuoteExpiredError } from '../../../shared/domain/errors/quote-flow.errors.js';
import { ErrorCodes } from '../../../shared/domain/errors/error-codes.js';
import { requireEventOwner, requireVendorProfileId } from './authz.js';
import type { QuoteUseCaseContext } from './context.js';

function invalidState(message: string, status: string): BusinessRuleViolationError {
  return new BusinessRuleViolationError(ErrorCodes.BUSINESS_RULE_VIOLATION, message, [
    { field: 'status', message: `Quote is ${status}` },
  ]);
}

export class CreateQuoteUseCase {
  constructor(
    private readonly quotes: QuoteRepository,
    private readonly quoteRequests: QuoteRequestRepository,
    private readonly events: EventAccessReader,
    private readonly vendors: VendorProfileReader,
    private readonly logger: DomainEventLogger,
  ) {}

  async execute(
    userId: string,
    quoteRequestId: string,
    dto: CreateQuoteRequestBody,
    ctx: QuoteUseCaseContext = {},
  ): Promise<QuoteView> {
    const qr = await this.quoteRequests.findById(quoteRequestId);
    if (!qr) throw new NotFoundError('Quote request not found');
    const vpId = await requireVendorProfileId(this.vendors, userId);
    if (qr.vendorProfileId !== vpId) throw new NotFoundError('Not found');

    const eventCurrency = await this.events.getCurrency(qr.eventId);
    if (eventCurrency && dto.currencyCode !== eventCurrency) {
      throw invalidState('Quote currency must match the event currency', 'currency_mismatch');
    }

    const view = await this.quotes.createDraft({
      quoteRequestId,
      vendorProfileId: vpId,
      totalPrice: dto.totalPrice,
      currencyCode: dto.currencyCode,
      breakdown: dto.breakdown,
      conditions: dto.conditions,
      validUntil: dto.validUntil ?? null,
    });
    this.logger.emit('quote.created', { correlationId: ctx.correlationId, actorId: userId, quoteId: view.id });
    return view;
  }
}

export class GetQuoteForQuoteRequestUseCase {
  constructor(
    private readonly quotes: QuoteRepository,
    private readonly quoteRequests: QuoteRequestRepository,
    private readonly events: EventAccessReader,
    private readonly vendors: VendorProfileReader,
  ) {}

  async execute(userId: string, role: string, quoteRequestId: string): Promise<QuoteView> {
    const qr = await this.quoteRequests.findById(quoteRequestId);
    if (!qr) throw new NotFoundError('Quote request not found');
    if (role === 'organizer') {
      await requireEventOwner(this.events, qr.eventId, userId);
    } else {
      const vpId = await requireVendorProfileId(this.vendors, userId);
      if (qr.vendorProfileId !== vpId) throw new NotFoundError('Not found');
    }
    const quote = await this.quotes.findCurrentByQuoteRequest(quoteRequestId);
    if (!quote) throw new NotFoundError('Quote not found');
    return quote;
  }
}

/** Carga un quote y verifica que pertenece al vendor del usuario; si no, 404. */
async function loadOwnedByVendor(
  quotes: QuoteRepository,
  vendors: VendorProfileReader,
  userId: string,
  quoteId: string,
): Promise<QuoteView> {
  const quote = await quotes.findById(quoteId);
  if (!quote) throw new NotFoundError('Quote not found');
  const vpId = await requireVendorProfileId(vendors, userId);
  if (quote.vendorProfileId !== vpId) throw new NotFoundError('Not found');
  return quote;
}

/** Carga un quote y verifica que el organizer es owner del evento; si no, 404. */
async function loadOwnedByOrganizer(
  quotes: QuoteRepository,
  quoteRequests: QuoteRequestRepository,
  events: EventAccessReader,
  userId: string,
  quoteId: string,
): Promise<QuoteView> {
  const quote = await quotes.findById(quoteId);
  if (!quote) throw new NotFoundError('Quote not found');
  const qr = await quoteRequests.findById(quote.quoteRequestId);
  if (!qr) throw new NotFoundError('Not found');
  await requireEventOwner(events, qr.eventId, userId);
  return quote;
}

export class UpdateQuoteUseCase {
  constructor(
    private readonly quotes: QuoteRepository,
    private readonly quoteRequests: QuoteRequestRepository,
    private readonly events: EventAccessReader,
    private readonly vendors: VendorProfileReader,
    private readonly logger: DomainEventLogger,
  ) {}

  async execute(
    userId: string,
    quoteId: string,
    dto: UpdateQuoteRequestBody,
    ctx: QuoteUseCaseContext = {},
  ): Promise<QuoteView> {
    const quote = await loadOwnedByVendor(this.quotes, this.vendors, userId, quoteId);
    if (!canEditQuote(quote.status)) throw invalidState('Only draft quotes can be edited', quote.status);
    if (dto.currencyCode !== undefined) {
      const qr = await this.quoteRequests.findById(quote.quoteRequestId);
      const eventCurrency = qr ? await this.events.getCurrency(qr.eventId) : null;
      if (eventCurrency && dto.currencyCode !== eventCurrency) {
        throw invalidState('Quote currency must match the event currency', 'currency_mismatch');
      }
    }
    const view = await this.quotes.update(quoteId, {
      totalPrice: dto.totalPrice,
      currencyCode: dto.currencyCode,
      breakdown: dto.breakdown,
      conditions: dto.conditions,
      validUntil: dto.validUntil,
    });
    this.logger.emit('quote.updated', { correlationId: ctx.correlationId, actorId: userId, quoteId });
    return view;
  }
}

export class SendQuoteUseCase {
  constructor(
    private readonly quotes: QuoteRepository,
    private readonly vendors: VendorProfileReader,
    private readonly clock: ClockPort,
    private readonly logger: DomainEventLogger,
  ) {}

  async execute(userId: string, quoteId: string, ctx: QuoteUseCaseContext = {}): Promise<QuoteView> {
    const quote = await loadOwnedByVendor(this.quotes, this.vendors, userId, quoteId);
    if (!canSendQuote(quote.status)) throw invalidState('Only draft quotes can be sent', quote.status);
    const now = this.clock.now();
    const validUntil = quote.validUntil ? new Date(quote.validUntil) : defaultValidUntil(new Date(quote.createdAt));
    const view = await this.quotes.send(quoteId, now, validUntil);
    this.logger.emit('quote.sent', { correlationId: ctx.correlationId, actorId: userId, quoteId });
    return view;
  }
}

export class AcceptQuoteUseCase {
  constructor(
    private readonly quotes: QuoteRepository,
    private readonly quoteRequests: QuoteRequestRepository,
    private readonly events: EventAccessReader,
    private readonly clock: ClockPort,
    private readonly logger: DomainEventLogger,
  ) {}

  async execute(userId: string, quoteId: string, ctx: QuoteUseCaseContext = {}): Promise<QuoteView> {
    const quote = await loadOwnedByOrganizer(this.quotes, this.quoteRequests, this.events, userId, quoteId);
    if (!canDecideQuote(quote.status)) throw invalidState('Only sent quotes can be accepted', quote.status);
    const now = this.clock.now();
    if (isQuoteExpired(quote.status, quote.validUntil ? new Date(quote.validUntil) : null, now)) {
      throw new QuoteExpiredError();
    }
    const view = await this.quotes.accept(quoteId, now);
    this.logger.emit('quote.accepted', { correlationId: ctx.correlationId, actorId: userId, quoteId });
    return view;
  }
}

export class RejectQuoteUseCase {
  constructor(
    private readonly quotes: QuoteRepository,
    private readonly quoteRequests: QuoteRequestRepository,
    private readonly events: EventAccessReader,
    private readonly clock: ClockPort,
    private readonly logger: DomainEventLogger,
  ) {}

  async execute(userId: string, quoteId: string, ctx: QuoteUseCaseContext = {}): Promise<QuoteView> {
    const quote = await loadOwnedByOrganizer(this.quotes, this.quoteRequests, this.events, userId, quoteId);
    if (!canDecideQuote(quote.status)) throw invalidState('Only sent quotes can be rejected', quote.status);
    const view = await this.quotes.reject(quoteId, this.clock.now());
    this.logger.emit('quote.rejected', { correlationId: ctx.correlationId, actorId: userId, quoteId });
    return view;
  }
}

export class PreferQuoteUseCase {
  constructor(
    private readonly quotes: QuoteRepository,
    private readonly quoteRequests: QuoteRequestRepository,
    private readonly events: EventAccessReader,
    private readonly logger: DomainEventLogger,
  ) {}

  async execute(userId: string, quoteId: string, ctx: QuoteUseCaseContext = {}): Promise<QuoteView> {
    const quote = await loadOwnedByOrganizer(this.quotes, this.quoteRequests, this.events, userId, quoteId);
    if (!canDecideQuote(quote.status)) throw invalidState('Only sent quotes can be preferred', quote.status);
    const view = await this.quotes.setPreferred(quoteId);
    this.logger.emit('quote.preferred', { correlationId: ctx.correlationId, actorId: userId, quoteId });
    return view;
  }
}
