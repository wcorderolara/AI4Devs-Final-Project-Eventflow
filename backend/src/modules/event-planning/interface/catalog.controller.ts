// Controlador de catálogos de event-planning. Expone ubicaciones activas como
// referencia para el asistente de creación. Controlador delgado: delega y serializa
// el envelope estándar. Solo lectura; requiere sesión válida.
//
// El handler `listEventTypes` fue removido en US-076 (PB-P1-043) — el catálogo de
// EventType vive ahora en `event-catalog/interface/public-event-type.controller.ts`
// con shape superset spec-compliant (`EventTypeView[]`).
import type { Request, Response } from 'express';
import { success } from '../../../shared/response/index.js';
import type { ListActiveLocationsUseCase } from '../application/list-locations.use-case.js';

export interface CatalogUseCases {
  listLocations: ListActiveLocationsUseCase;
}

export class CatalogController {
  constructor(private readonly useCases: CatalogUseCases) {}

  listLocations = async (req: Request, res: Response): Promise<void> => {
    const items = await this.useCases.listLocations.execute();
    res.status(200).json(success(items, req.correlationId ?? ''));
  };
}
