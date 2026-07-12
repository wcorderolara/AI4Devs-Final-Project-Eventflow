// ListActiveLocationsUseCase (US-009). Catálogo de ubicaciones disponibles para el asistente de
// creación de evento. Solo lectura, sin ownership (referencia compartida).
import type { LocationOptionView, LocationRepository } from '../ports/event.repository.js';

export class ListActiveLocationsUseCase {
  constructor(private readonly locations: LocationRepository) {}

  execute(): Promise<LocationOptionView[]> {
    return this.locations.listActive();
  }
}
