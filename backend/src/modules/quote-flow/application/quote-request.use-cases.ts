// Use cases de QuoteRequest (US-096 / BE-004). AC-01..AC-06. Ownership/assignment + reglas de
// límite/duplicado/lifecycle. Controllers delegan aquí; el rol se valida en la ruta.
import type { QuoteRequestRepository } from '../ports/quote-flow.repositories.js';
import type {
  EventAccessReader,
  VendorProfileReader,
  ServiceCategoryReader,
} from '../../../shared/access/readers.js';
import type { DomainEventLogger } from '../../../shared/observability/domain-event-logger.js';
import type { ClockPort } from '../../../shared/domain/clock.port.js';
import type { QuoteRequestView, QuoteRequestStatusValue } from '../domain/quote-request.js';
import { canCancelQuoteRequest, canMarkViewed } from '../domain/quote-policies.js';
import type { CreateQuoteRequestRequest } from '../dto/index.js';
import type { PaginationInput } from '../../../shared/validation/pagination.js';
import { NotFoundError } from '../../../shared/domain/errors/not-found.error.js';
import { BusinessRuleViolationError } from '../../../shared/domain/errors/business-rule-violation.error.js';
import { ErrorCodes } from '../../../shared/domain/errors/error-codes.js';
import { requireEventOwner, requireVendorProfileId } from './authz.js';
import type { QuoteUseCaseContext } from './context.js';

export const MAX_ACTIVE_QUOTE_REQUESTS = 5;

export interface ListResult {
  items: QuoteRequestView[];
  page: number;
  pageSize: number;
  total: number;
}

export class CreateQuoteRequestUseCase {
  constructor(
    private readonly quoteRequests: QuoteRequestRepository,
    private readonly events: EventAccessReader,
    private readonly vendors: VendorProfileReader,
    private readonly categories: ServiceCategoryReader,
    private readonly logger: DomainEventLogger,
  ) {}

  async execute(
    userId: string,
    eventId: string,
    dto: CreateQuoteRequestRequest,
    ctx: QuoteUseCaseContext = {},
  ): Promise<QuoteRequestView> {
    const event = await this.events.findOwnedEvent(eventId, userId);
    if (!event) throw new NotFoundError('Event not found');
    if (event.status !== 'active') {
      throw new BusinessRuleViolationError(
        ErrorCodes.BUSINESS_RULE_VIOLATION,
        'Quote requests can only be created for active events',
        [{ field: 'status', message: `Event is ${event.status}` }],
      );
    }
    if (!(await this.vendors.existsActive(dto.vendorProfileId))) throw new NotFoundError('Vendor not found');
    if (!(await this.categories.existsActive(dto.serviceCategoryId))) throw new NotFoundError('Service category not found');

    const view = await this.quoteRequests.createWithChecks(
      {
        eventId,
        serviceCategoryId: dto.serviceCategoryId,
        vendorProfileId: dto.vendorProfileId,
        brief: dto.brief,
        aiRecommendationId: dto.aiRecommendationId ?? null,
      },
      MAX_ACTIVE_QUOTE_REQUESTS,
    );
    this.logger.emit('quote_request.created', { correlationId: ctx.correlationId, actorId: userId, quoteRequestId: view.id });
    return view;
  }
}

export class ListEventQuoteRequestsUseCase {
  constructor(
    private readonly quoteRequests: QuoteRequestRepository,
    private readonly events: EventAccessReader,
  ) {}

  async execute(
    userId: string,
    eventId: string,
    query: PaginationInput & { status?: QuoteRequestStatusValue },
  ): Promise<ListResult> {
    await requireEventOwner(this.events, eventId, userId);
    const { items, total } = await this.quoteRequests.listByEvent(
      eventId,
      { status: query.status },
      { page: query.page, pageSize: query.pageSize },
    );
    return { items, page: query.page, pageSize: query.pageSize, total };
  }
}

export class ListVendorQuoteRequestsUseCase {
  constructor(
    private readonly quoteRequests: QuoteRequestRepository,
    private readonly vendors: VendorProfileReader,
  ) {}

  async execute(
    userId: string,
    query: PaginationInput & { status?: QuoteRequestStatusValue },
  ): Promise<ListResult> {
    const vendorProfileId = await requireVendorProfileId(this.vendors, userId);
    const { items, total } = await this.quoteRequests.listByVendor(
      vendorProfileId,
      { status: query.status },
      { page: query.page, pageSize: query.pageSize },
    );
    return { items, page: query.page, pageSize: query.pageSize, total };
  }
}

/** Autoriza acceso a un QuoteRequest: organizer owner del evento O vendor asignado; si no, 404. */
async function authorizeQuoteRequestAccess(
  qr: QuoteRequestView,
  userId: string,
  role: string,
  events: EventAccessReader,
  vendors: VendorProfileReader,
): Promise<void> {
  if (role === 'organizer') {
    await requireEventOwner(events, qr.eventId, userId);
    return;
  }
  if (role === 'vendor') {
    const vpId = await requireVendorProfileId(vendors, userId);
    if (qr.vendorProfileId !== vpId) throw new NotFoundError('Not found');
    return;
  }
  throw new NotFoundError('Not found');
}

export class GetQuoteRequestUseCase {
  constructor(
    private readonly quoteRequests: QuoteRequestRepository,
    private readonly events: EventAccessReader,
    private readonly vendors: VendorProfileReader,
  ) {}

  async execute(userId: string, role: string, quoteRequestId: string): Promise<QuoteRequestView> {
    const qr = await this.quoteRequests.findById(quoteRequestId);
    if (!qr) throw new NotFoundError('Quote request not found');
    await authorizeQuoteRequestAccess(qr, userId, role, this.events, this.vendors);
    return qr;
  }
}

export class CancelQuoteRequestUseCase {
  constructor(
    private readonly quoteRequests: QuoteRequestRepository,
    private readonly events: EventAccessReader,
    private readonly clock: ClockPort,
    private readonly logger: DomainEventLogger,
  ) {}

  async execute(userId: string, quoteRequestId: string, ctx: QuoteUseCaseContext = {}): Promise<QuoteRequestView> {
    const qr = await this.quoteRequests.findById(quoteRequestId);
    if (!qr) throw new NotFoundError('Quote request not found');
    await requireEventOwner(this.events, qr.eventId, userId);
    if (!canCancelQuoteRequest(qr.status)) {
      throw new BusinessRuleViolationError(
        ErrorCodes.BUSINESS_RULE_VIOLATION,
        'Quote request cannot be cancelled in its current state',
        [{ field: 'status', message: `Quote request is ${qr.status}` }],
      );
    }
    const view = await this.quoteRequests.cancel(quoteRequestId, this.clock.now());
    this.logger.emit('quote_request.cancelled', { correlationId: ctx.correlationId, actorId: userId, quoteRequestId });
    return view;
  }
}

export class MarkQuoteRequestViewedUseCase {
  constructor(
    private readonly quoteRequests: QuoteRequestRepository,
    private readonly vendors: VendorProfileReader,
    private readonly clock: ClockPort,
    private readonly logger: DomainEventLogger,
  ) {}

  async execute(userId: string, quoteRequestId: string, ctx: QuoteUseCaseContext = {}): Promise<void> {
    const qr = await this.quoteRequests.findById(quoteRequestId);
    if (!qr) throw new NotFoundError('Quote request not found');
    const vpId = await requireVendorProfileId(this.vendors, userId);
    if (qr.vendorProfileId !== vpId) throw new NotFoundError('Not found');

    if (canMarkViewed(qr.status)) {
      await this.quoteRequests.markViewed(quoteRequestId, this.clock.now());
      this.logger.emit('quote_request.viewed', { correlationId: ctx.correlationId, actorId: userId, quoteRequestId });
      return;
    }
    if (qr.status === 'viewed') return; // idempotente
    throw new BusinessRuleViolationError(
      ErrorCodes.BUSINESS_RULE_VIOLATION,
      'Quote request cannot be marked viewed in its current state',
      [{ field: 'status', message: `Quote request is ${qr.status}` }],
    );
  }
}
