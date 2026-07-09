// GetEventByIdUseCase (US-095 / BE-004). AC-03; EC-03. Ownership-scoped: si el evento no existe
// o pertenece a otro organizer → masked 404 (NotFoundError), sin revelar existencia (SEC-07).
import type { EventRepository } from '../ports/event.repository.js';
import type { EventView } from '../domain/event.js';
import { NotFoundError } from '../../../shared/domain/errors/not-found.error.js';

export class GetEventByIdUseCase {
  constructor(private readonly events: EventRepository) {}

  async execute(ownerId: string, eventId: string): Promise<EventView> {
    const view = await this.events.findByIdForOwner(eventId, ownerId);
    if (!view) throw new NotFoundError('Event not found');
    return view;
  }
}
