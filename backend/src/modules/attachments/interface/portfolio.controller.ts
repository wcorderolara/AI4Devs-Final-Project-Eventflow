// Controller — Portfolio (US-043 / PB-P1-026 / BE-007). Delgado; delega al use case.
import type { Request, Response } from 'express';
import { success } from '../../../shared/response/index.js';
import { UnauthorizedError } from '../../../shared/domain/errors/unauthorized.error.js';
import { BadRequestError } from '../../../shared/domain/errors/bad-request.error.js';
import { WORK_LABEL_REGEX } from '../domain/constants.js';
import { InvalidWorkLabelError } from '../domain/attachment.errors.js';
import type { UploadPortfolioImageUseCase } from '../application/upload-portfolio-image.use-case.js';
import type { SoftDeletePortfolioImageUseCase } from '../application/soft-delete-portfolio-image.use-case.js';
import { toUploadPortfolioImageResponse } from './dto/upload-portfolio-image.response.js';
import type { SoftDeletePortfolioImageBody } from './dto/soft-delete-portfolio-image.request.js';

function requireUserId(req: Request): string {
  const id = req.user?.id;
  if (typeof id !== 'string' || id.length === 0) throw new UnauthorizedError();
  return id;
}

export interface PortfolioUseCases {
  upload: UploadPortfolioImageUseCase;
  softDelete: SoftDeletePortfolioImageUseCase;
}

export class PortfolioController {
  private readonly uploadUseCase: UploadPortfolioImageUseCase;
  private readonly softDeleteUseCase: SoftDeletePortfolioImageUseCase;

  constructor(useCases: PortfolioUseCases) {
    this.uploadUseCase = useCases.upload;
    this.softDeleteUseCase = useCases.softDelete;
  }

  uploadPortfolioImage = async (req: Request, res: Response): Promise<void> => {
    // El `:workLabel` viaja URL-encoded (permite espacios). Express lo decodifica antes de exponerlo
    // en `req.params`. Se valida directo (no Zod middleware) para mantener el path param con
    // regex canónico y devolver el código específico `INVALID_WORK_LABEL` en lugar de
    // `VALIDATION_ERROR` genérico.
    const rawLabel = typeof req.params.workLabel === 'string' ? req.params.workLabel : '';
    if (!WORK_LABEL_REGEX.test(rawLabel)) {
      throw new InvalidWorkLabelError();
    }

    if (!req.file || !Buffer.isBuffer(req.file.buffer) || req.file.buffer.length === 0) {
      throw new BadRequestError('Missing multipart file field "file"');
    }

    const view = await this.uploadUseCase.execute(
      {
        vendorUserId: requireUserId(req),
        workLabel: rawLabel,
        fileBuffer: req.file.buffer,
        headerMime: req.file.mimetype,
      },
      { correlationId: req.correlationId },
    );

    res.status(201).json(success(toUploadPortfolioImageResponse(view), req.correlationId ?? ''));
  };

  deletePortfolioImage = async (req: Request, res: Response): Promise<void> => {
    // El path param ya fue validado por `validateRequestMiddleware` (imageId UUID). Body
    // opcional; cuando `deletion_reason` está ausente, se persiste `null`.
    const validated = req.validated as
      | { params?: { imageId?: string }; body?: SoftDeletePortfolioImageBody }
      | undefined;
    // `validateRequestMiddleware` garantiza que llegamos aquí sólo con un imageId UUID
    // válido — el fallback a `req.params.imageId` sólo cubre el path type-narrowing.
    const imageId =
      validated?.params?.imageId ?? (typeof req.params.imageId === 'string' ? req.params.imageId : '');
    const deletionReason = validated?.body?.deletion_reason ?? null;

    await this.softDeleteUseCase.execute(
      {
        vendorUserId: requireUserId(req),
        imageId,
        deletionReason,
      },
      { correlationId: req.correlationId },
    );

    res.status(204).end();
  };
}
