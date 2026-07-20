// Controlador público de `EventType` (US-076 / BE-007). Un solo endpoint:
// GET /api/v1/event-types — devuelve `EventTypeView[]` filtrado a `is_active=true`
// (Decisión PO D2 + AC-05). Requiere sesión válida (cualquier rol autenticado) — el
// guard lo aplica la route.
import type { Request, Response } from 'express';
import { success } from '../../../shared/response/index.js';
import type { ListEventTypesUseCase } from '../application/list-event-types.use-case.js';

export class PublicEventTypeController {
  constructor(private readonly listUC: ListEventTypesUseCase) {}

  list = async (req: Request, res: Response): Promise<void> => {
    const items = await this.listUC.execute({ includeInactive: false });
    res.status(200).json(success(items, req.correlationId ?? ''));
  };
}
