// CreateEventUseCase (US-095 / BE-004). AC-01; EC-04. Valida catálogos (EventType activo por code,
// Location activa), resuelve FKs y persiste un evento `draft` con `autoCompleted=false` e
// `currencyCode` inmutable. El role/ownership los aplican los guards antes del use case.
import type {
  EventRepository,
  EventTypeRepository,
  LocationRepository,
} from '../ports/event.repository.js';
import type { EventAuditLogger } from '../ports/event-audit-logger.js';
import type { EventView } from '../domain/event.js';
import type { CreateEventRequest } from '../dto/index.js';
import { NotFoundError } from '../../../shared/domain/errors/not-found.error.js';
import type { EventUseCaseContext } from './context.js';

export class CreateEventUseCase {
  constructor(
    private readonly events: EventRepository,
    private readonly eventTypes: EventTypeRepository,
    private readonly locations: LocationRepository,
    private readonly audit: EventAuditLogger,
  ) {}

  async execute(
    ownerId: string,
    input: CreateEventRequest,
    ctx: EventUseCaseContext = {},
  ): Promise<EventView> {
    const eventTypeId = await this.eventTypes.findActiveIdByCode(input.eventTypeCode);
    if (!eventTypeId) {
      throw new NotFoundError('Event type not found');
    }
    const locationExists = await this.locations.existsActive(input.locationId);
    if (!locationExists) {
      throw new NotFoundError('Location not found');
    }

    const view = await this.events.create({
      ownerId,
      eventTypeId,
      name: input.name?.trim() || `Evento ${input.eventTypeCode}`,
      eventDate: input.eventDate,
      guestsCount: input.guestsCount,
      locationId: input.locationId,
      estimatedBudget: input.estimatedBudget,
      currency: input.currencyCode,
      language: input.languageCode,
      notes: input.notes ?? null,
    });

    this.audit.emit('event.created', {
      correlationId: ctx.correlationId,
      actorId: ownerId,
      eventId: view.id,
    });
    return view;
  }
}
