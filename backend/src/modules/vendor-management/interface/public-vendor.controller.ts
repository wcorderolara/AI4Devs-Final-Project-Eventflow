// Controller — perfil público SEO del vendor (US-046 / BE-005, §7 Tech Spec).
// Delegación pura al use case. Emite el envelope canónico `success()` en 200 y `failure()`
// con `VENDOR_NOT_FOUND` en 404 (D6, uniforme). El header `Cache-Control` se establece
// SOLO en el happy path — la respuesta 404 no debe cachearse en CDN para evitar propagar
// desapariciones temporales de vendors por ISR.
import type { Request, Response } from 'express';
import { success } from '../../../shared/response/success.js';
import { failure } from '../../../shared/response/failure.js';
import { ErrorCodes } from '../../../shared/domain/errors/error-codes.js';
import type { GetPublicVendorBySlugUseCase } from '../application/get-public-vendor-by-slug.use-case.js';
import type { PublicVendorSlugParam } from './dto/public-vendor-slug.param.js';

const CACHE_CONTROL_HEADER = 'public, max-age=60, stale-while-revalidate=300';

export class PublicVendorController {
  constructor(private readonly useCase: GetPublicVendorBySlugUseCase) {}

  getBySlug = async (req: Request, res: Response): Promise<void> => {
    const { slug } = req.validated?.params as PublicVendorSlugParam;
    const correlationId = req.correlationId ?? '';

    const dto = await this.useCase.execute({ slug });

    if (dto === null) {
      res.status(404).json(
        failure(
          ErrorCodes.VENDOR_NOT_FOUND,
          'Vendor not found',
          undefined,
          correlationId,
        ),
      );
      return;
    }

    res.setHeader('Cache-Control', CACHE_CONTROL_HEADER);
    res.status(200).json(success(dto, correlationId));
  };
}
