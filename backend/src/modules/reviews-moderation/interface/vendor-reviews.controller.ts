// Controlador — Listar reviews de vendor (US-066 / BE-003). Tech Spec §7.
// Delgado, sin lógica de negocio (US-090 layering). Delega al `GetVendorReviewsUseCase`.
//
// Autorización: la ruta usa `optionalSessionAuthMiddleware` (US-066 EMERGENT-001), así que
// `req.user` puede ser `undefined` (anónimo) o el usuario autenticado. El use case decide el
// comportamiento condicional por rol (admin sees-all vs público).
import type { Request, Response } from 'express';
import { success } from '../../../shared/response/index.js';
import type { GetVendorReviewsUseCase } from '../application/get-vendor-reviews.use-case.js';
import type { VendorIdParam, ListVendorReviewsQuery } from './list-vendor-reviews.dto.js';

export class VendorReviewsController {
  constructor(private readonly useCase: GetVendorReviewsUseCase) {}

  list = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.validated?.params as VendorIdParam;
    const { cursor, pageSize } = req.validated?.query as ListVendorReviewsQuery;

    const currentUser = req.user ? { id: req.user.id, role: req.user.role } : null;

    const result = await this.useCase.execute({
      currentUser,
      vendorId: id,
      cursor,
      pageSize,
    });

    res.status(200).json(success(result, req.correlationId ?? ''));
  };
}
