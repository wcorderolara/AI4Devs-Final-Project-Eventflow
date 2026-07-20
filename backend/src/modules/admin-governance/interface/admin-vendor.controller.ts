// Controlador Admin de VendorProfile — delega en `ModerateVendorUseCase` (US-047 / BE-004) y
// en `ListVendorsForAdminUseCase` (US-074 / BE-003). Delgado, sin lógica de negocio.
// `currentUserId` viene del `req.user` hidratado por `sessionAuth` — el guard admin ya filtró
// a rol `admin` en el router (paridad EXACTA con `AdminReviewController` de US-067/US-077).
import type { Request, Response } from 'express';
import { success } from '../../../shared/response/index.js';
import { UnauthorizedError } from '../../../shared/domain/errors/unauthorized.error.js';
import type { ModerateVendorUseCase } from '../application/moderate-vendor.use-case.js';
import type { ListVendorsForAdminUseCase } from '../application/list-vendors-for-admin.use-case.js';
import type {
  ModerateVendorBody,
  ModerateVendorParams,
} from './moderate-vendor.dto.js';
import type { AdminVendorsQuery } from './admin-vendors-query.dto.js';

function actorId(req: Request): string {
  const u = req.user;
  if (!u?.id) throw new UnauthorizedError();
  return u.id;
}

export class AdminVendorController {
  constructor(
    private readonly moderateVendor: ModerateVendorUseCase,
    private readonly listVendors: ListVendorsForAdminUseCase,
  ) {}

  moderate = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.validated?.params as ModerateVendorParams;
    const body = req.validated?.body as ModerateVendorBody;

    const view = await this.moderateVendor.execute(actorId(req), id, body, {
      correlationId: req.correlationId,
    });

    res.status(200).json(success(view, req.correlationId ?? ''));
  };

  list = async (req: Request, res: Response): Promise<void> => {
    // Query validada por Zod strict + refines cross-field antes de entrar aquí.
    const query = req.validated?.query as AdminVendorsQuery;
    const result = await this.listVendors.execute(query);
    res.status(200).json(success(result, req.correlationId ?? ''));
  };
}
