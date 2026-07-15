// Controller — VendorProfile (US-040 / US-041 / BE-005..006). Delgado; delega a use cases.
import type { Request, Response } from 'express';
import { success } from '../../../shared/response/index.js';
import { UnauthorizedError } from '../../../shared/domain/errors/unauthorized.error.js';
import type { CreateVendorProfileUseCase } from '../application/create-vendor-profile.use-case.js';
import type { UpdateVendorProfileUseCase } from '../application/update-vendor-profile.use-case.js';
import type { SoftDeleteVendorProfileUseCase } from '../application/soft-delete-vendor-profile.use-case.js';
import type { ChangeVendorCategoriesUseCase } from '../application/change-vendor-categories.use-case.js';
import type { CreateVendorProfileRequest } from './dto/create-vendor-profile.request.js';
import type { UpdateVendorProfileRequest } from './dto/update-vendor-profile.request.js';
import type { ChangeVendorCategoriesRequest } from './dto/change-vendor-categories.request.js';
import {
  toVendorProfileResponse,
  toVendorProfileResponseWithCategoryMeta,
} from './dto/vendor-profile.response.js';
import { toChangeVendorCategoriesResponse } from './dto/change-vendor-categories.response.js';
import type { VendorProfileRepository } from '../ports/vendor-profile.repository.js';
import { VendorProfileNotFoundError } from '../domain/vendor-profile.errors.js';

function requireUserId(req: Request): string {
  const id = req.user?.id;
  if (typeof id !== 'string' || id.length === 0) throw new UnauthorizedError();
  return id;
}

export interface VendorProfileUseCases {
  create: CreateVendorProfileUseCase;
  update: UpdateVendorProfileUseCase;
  softDelete: SoftDeleteVendorProfileUseCase;
  changeCategories: ChangeVendorCategoriesUseCase;
}

export class VendorProfileController {
  constructor(
    private readonly uc: VendorProfileUseCases,
    private readonly repository: VendorProfileRepository,
  ) {}

  /**
   * EMERGENT US-041 (FE-002): el editor necesita cargar el perfil activo del vendor autenticado.
   * `GET /api/v1/vendors/me`. Reusa el repository ya inyectado (sin nuevo use case: es lectura pura
   * sin reglas de negocio) — se descarta pipeline más elaborado por costo/beneficio dado que la
   * vista ya se hidrata con `findByIdWithCategories` + `findEditableByVendorUserId`.
   */
  getMine = async (req: Request, res: Response): Promise<void> => {
    // US-042 (FE-001): hidratamos también `category_change_count`, `requires_admin_review`
    // y `last_category_change_at` para que el editor de categorías muestre el contador antes
    // de la primera mutación. Los campos son opcionales en el DTO (retro-compat US-040/041).
    const snapshot = await this.repository.findActiveWithCategoriesByVendorUserId(
      requireUserId(req),
    );
    if (!snapshot) throw new VendorProfileNotFoundError();
    const view = await this.repository.findByIdWithCategories(snapshot.id);
    if (!view) throw new VendorProfileNotFoundError();
    res.status(200).json(
      success(
        toVendorProfileResponseWithCategoryMeta(view, {
          categoryChangeCount: snapshot.categoryChangeCount,
          requiresAdminReview: snapshot.requiresAdminReview,
          lastCategoryChangeAt: snapshot.lastCategoryChangeAt,
        }),
        req.correlationId ?? '',
      ),
    );
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const body = req.validated?.body as CreateVendorProfileRequest;
    const view = await this.uc.create.execute(
      {
        vendorUserId: requireUserId(req),
        businessName: body.business_name.trim(),
        bio: body.bio.trim(),
        locationId: body.location_id,
        languagesSupported: body.languages_supported,
        categoryIds: body.categories,
      },
      { correlationId: req.correlationId },
    );

    res.status(201).json(success(toVendorProfileResponse(view), req.correlationId ?? ''));
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const body = req.validated?.body as UpdateVendorProfileRequest;
    const result = await this.uc.update.execute(
      { vendorUserId: requireUserId(req), body },
      { correlationId: req.correlationId },
    );
    res
      .status(200)
      .json(
        success(
          { profile: toVendorProfileResponse(result.profile), repending: result.repending },
          req.correlationId ?? '',
        ),
      );
  };

  softDelete = async (req: Request, res: Response): Promise<void> => {
    await this.uc.softDelete.execute(
      { vendorUserId: requireUserId(req) },
      { correlationId: req.correlationId },
    );
    res.status(204).end();
  };

  changeCategories = async (req: Request, res: Response): Promise<void> => {
    const body = req.validated?.body as ChangeVendorCategoriesRequest;
    const result = await this.uc.changeCategories.execute(
      {
        vendorUserId: requireUserId(req),
        serviceCategoryIds: body.service_category_ids,
      },
      { correlationId: req.correlationId },
    );
    res.status(200).json(
      success(
        toChangeVendorCategoriesResponse({
          profile: result.profile,
          repending: result.repending,
          noop: result.noop,
          categoryChangeCount: result.categoryChangeCount,
          requiresAdminReview: result.requiresAdminReview,
          lastCategoryChangeAt: result.lastCategoryChangeAt,
        }),
        req.correlationId ?? '',
      ),
    );
  };
}
