// Controlador público de `ServiceCategory` (US-075 / BE-007). Un solo endpoint:
// GET /api/v1/service-categories — devuelve `{tree, flat}` filtrado a `is_active=true`
// (Decisión PO D2 + AC-06). Requiere sesión válida (cualquier rol autenticado) — el
// guard lo aplica la route.
import type { Request, Response } from 'express';
import { success } from '../../../shared/response/index.js';
import type { ListServiceCategoriesUseCase } from '../application/list-service-categories.use-case.js';

export class PublicServiceCategoryController {
  constructor(private readonly listUC: ListServiceCategoriesUseCase) {}

  list = async (req: Request, res: Response): Promise<void> => {
    const result = await this.listUC.execute({ includeInactive: false });
    res.status(200).json(success(result, req.correlationId ?? ''));
  };
}
