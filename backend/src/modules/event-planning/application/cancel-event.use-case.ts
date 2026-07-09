// CancelEventUseCase (US-095 / BE-004). AC-07; EC-05. Cancela eventos no terminales (draft/active);
// ownership masked 404; evento ya completed/cancelled → 422 BUSINESS_RULE_VIOLATION (sin cambios).
import type { EventRepository } from '../ports/event.repository.js';
import type { EventAuditLogger } from '../ports/event-audit-logger.js';
import type { EventView } from '../domain/event.js';
import { canCancel } from '../domain/event-lifecycle.js';
import { NotFoundError } from '../../../shared/domain/errors/not-found.error.js';
import { BusinessRuleViolationError } from '../../../shared/domain/errors/business-rule-violation.error.js';
import { ErrorCodes } from '../../../shared/domain/errors/error-codes.js';
import type { EventUseCaseContext } from './context.js';

export class CancelEventUseCase {
  constructor(
    private readonly events: EventRepository,
    private readonly audit: EventAuditLogger,
  ) {}

  async execute(ownerId: string, eventId: string, ctx: EventUseCaseContext = {}): Promise<EventView> {
    const existing = await this.events.findByIdForOwner(eventId, ownerId);
    if (!existing) throw new NotFoundError('Event not found');

    if (!canCancel(existing.status)) {
      this.audit.emit('event.lifecycle_transition_rejected', {
        correlationId: ctx.correlationId,
        actorId: ownerId,
        eventId,
        reason: `cancel from ${existing.status}`,
      });
      throw new BusinessRuleViolationError(
        ErrorCodes.BUSINESS_RULE_VIOLATION,
        'Event cannot be cancelled from a terminal state',
        [{ field: 'status', message: `Event is ${existing.status}` }],
      );
    }

    const view = await this.events.transitionStatus(eventId, 'cancelled');
    this.audit.emit('event.cancelled', { correlationId: ctx.correlationId, actorId: ownerId, eventId });
    return view;
  }
}
