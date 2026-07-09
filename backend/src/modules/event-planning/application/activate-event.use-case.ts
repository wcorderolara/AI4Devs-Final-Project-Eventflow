// ActivateEventUseCase (US-095 / BE-004). AC-06; EC-05. Solo `draft → active`; ownership masked
// 404; transición inválida → 422 BUSINESS_RULE_VIOLATION (estado sin cambios).
import type { EventRepository } from '../ports/event.repository.js';
import type { EventAuditLogger } from '../ports/event-audit-logger.js';
import type { EventView } from '../domain/event.js';
import { canActivate } from '../domain/event-lifecycle.js';
import { NotFoundError } from '../../../shared/domain/errors/not-found.error.js';
import { BusinessRuleViolationError } from '../../../shared/domain/errors/business-rule-violation.error.js';
import { ErrorCodes } from '../../../shared/domain/errors/error-codes.js';
import type { EventUseCaseContext } from './context.js';

export class ActivateEventUseCase {
  constructor(
    private readonly events: EventRepository,
    private readonly audit: EventAuditLogger,
  ) {}

  async execute(ownerId: string, eventId: string, ctx: EventUseCaseContext = {}): Promise<EventView> {
    const existing = await this.events.findByIdForOwner(eventId, ownerId);
    if (!existing) throw new NotFoundError('Event not found');

    if (!canActivate(existing.status)) {
      this.audit.emit('event.lifecycle_transition_rejected', {
        correlationId: ctx.correlationId,
        actorId: ownerId,
        eventId,
        reason: `activate from ${existing.status}`,
      });
      throw new BusinessRuleViolationError(
        ErrorCodes.BUSINESS_RULE_VIOLATION,
        'Only draft events can be activated',
        [{ field: 'status', message: `Event is ${existing.status}` }],
      );
    }

    const view = await this.events.transitionStatus(eventId, 'active');
    this.audit.emit('event.activated', { correlationId: ctx.correlationId, actorId: ownerId, eventId });
    return view;
  }
}
