// Controller — VendorProfile (US-040 / BE-005). Delgado; delega al use case y serializa.
import type { Request, Response } from 'express';
import { success } from '../../../shared/response/index.js';
import { UnauthorizedError } from '../../../shared/domain/errors/unauthorized.error.js';
import type { CreateVendorProfileUseCase } from '../application/create-vendor-profile.use-case.js';
import type { CreateVendorProfileRequest } from './dto/create-vendor-profile.request.js';
import { toVendorProfileResponse } from './dto/vendor-profile.response.js';

function requireUserId(req: Request): string {
  const id = req.user?.id;
  if (typeof id !== 'string' || id.length === 0) throw new UnauthorizedError();
  return id;
}

export class VendorProfileController {
  constructor(private readonly createUseCase: CreateVendorProfileUseCase) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const body = req.validated?.body as CreateVendorProfileRequest;
    const view = await this.createUseCase.execute(
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
}
