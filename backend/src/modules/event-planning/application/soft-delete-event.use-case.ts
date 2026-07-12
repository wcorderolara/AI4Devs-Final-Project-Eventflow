// SoftDeleteEventUseCase (US-012 / BE). AC-01; VR-01. Soft delete restringido a `draft` y al
// owner de la sesión. Ownership opaque: evento ajeno o ya eliminado → 404 (findByIdForOwner ya
// filtra `deleted_at IS NULL`). Estado != draft → 409 CONFLICT. Nunca hard delete (BR-EVENT-010).
import type { EventRepository } from '../ports/event.repository.js';
import type { EventAuditLogger } from '../ports/event-audit-logger.js';
import { isDeletable } from '../domain/event-lifecycle.js';
import { NotFoundError } from '../../../shared/domain/errors/not-found.error.js';
import { ConflictError } from '../../../shared/domain/errors/conflict.error.js';
import type { EventUseCaseContext } from './context.js';

export class SoftDeleteEventUseCase {
  constructor(
    private readonly events: EventRepository,
    private readonly audit: EventAuditLogger,
  ) {}

  async execute(ownerId: string, eventId: string, ctx: EventUseCaseContext = {}): Promise<void> {
    const existing = await this.events.findByIdForOwner(eventId, ownerId);
    if (!existing) throw new NotFoundError('Event not found');

    if (!isDeletable(existing.status)) {
      this.audit.emit('event.delete_rejected', {
        correlationId: ctx.correlationId,
        actorId: ownerId,
        eventId,
        reason: `delete from ${existing.status}`,
      });
      throw new ConflictError('Only draft events can be deleted');
    }

    await this.events.softDelete(eventId, ownerId);
    this.audit.emit('event.deleted', { correlationId: ctx.correlationId, actorId: ownerId, eventId });
  }
}
