// ListActiveEventTypesUseCase (US-009 / BE-001). AC-02. Catálogo de tipos de evento activos para
// el asistente de creación. Solo lectura, sin ownership (referencia compartida).
import type { EventTypeOptionView, EventTypeRepository } from '../ports/event.repository.js';

export class ListActiveEventTypesUseCase {
  constructor(private readonly eventTypes: EventTypeRepository) {}

  execute(): Promise<EventTypeOptionView[]> {
    return this.eventTypes.findActive();
  }
}
