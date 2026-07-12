// Controlador de catálogos de event-planning (US-009). Expone tipos de evento y ubicaciones
// activos como referencia para el asistente de creación. Controlador delgado: delega y serializa
// el envelope estándar. Solo lectura; requiere sesión válida.
import type { Request, Response } from 'express';
import { success } from '../../../shared/response/index.js';
import type { ListActiveEventTypesUseCase } from '../application/list-event-types.use-case.js';
import type { ListActiveLocationsUseCase } from '../application/list-locations.use-case.js';

export interface CatalogUseCases {
  listEventTypes: ListActiveEventTypesUseCase;
  listLocations: ListActiveLocationsUseCase;
}

export class CatalogController {
  constructor(private readonly useCases: CatalogUseCases) {}

  listEventTypes = async (req: Request, res: Response): Promise<void> => {
    const items = await this.useCases.listEventTypes.execute();
    res.status(200).json(success(items, req.correlationId ?? ''));
  };

  listLocations = async (req: Request, res: Response): Promise<void> => {
    const items = await this.useCases.listLocations.execute();
    res.status(200).json(success(items, req.correlationId ?? ''));
  };
}
