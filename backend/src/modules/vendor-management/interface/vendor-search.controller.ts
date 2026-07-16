// Controller — Directorio autenticado (US-045 / BE-005). Delgado, delega en el use case.
import type { Request, Response } from 'express';
import { success } from '../../../shared/response/index.js';
import { UnauthorizedError } from '../../../shared/domain/errors/unauthorized.error.js';
import type { SearchVendorsUseCase } from '../application/search-vendors.use-case.js';
import type { SearchVendorsQuery } from './dto/search-vendors.query.js';
import {
  toVendorCardResponse,
  type VendorSearchResponse,
} from './dto/search-vendors.response.js';

const ALLOWED_ROLES = new Set(['organizer', 'vendor', 'admin']);

export class VendorSearchController {
  constructor(private readonly useCase: SearchVendorsUseCase) {}

  search = async (req: Request, res: Response): Promise<void> => {
    const user = req.user;
    if (user === undefined || !ALLOWED_ROLES.has(user.role)) {
      throw new UnauthorizedError();
    }
    const query = req.validated?.query as SearchVendorsQuery;

    const result = await this.useCase.execute({
      currentUser: { id: user.id, role: user.role },
      query,
    });

    const body: VendorSearchResponse = {
      items: result.items.map(toVendorCardResponse),
      page: result.page,
    };
    res.status(200).json(success(body, req.correlationId ?? ''));
  };
}
